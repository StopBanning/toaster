// Hidden, muted source copy on its own profile. A slow localhost feed exercises the real IPC and dialog.
// Deliberately wrong checksum: the download fails before unpacking or starting a swap script.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '_checks', 'mac-update');
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(path.join(os.tmpdir(), 'toaster-update-ui-'));
const bytes = Buffer.alloc(2e6, 42);
let origin, child, ws;
const server = createServer((req, res) => {
  if (req.url === '/latest') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tag_name: 'v99.0.0', assets: [{ name: `Toaster-99.0.0-mac-${process.arch}.zip`, size: bytes.length, digest: `sha256:${'0'.repeat(64)}`, browser_download_url: `${origin}/zip` }] }));
  } else {
    res.writeHead(200, { 'Content-Length': bytes.length });
    let offset = 0;
    const timer = setInterval(() => {
      const end = Math.min(bytes.length, offset + 100000);
      res.write(bytes.subarray(offset, end)); offset = end;
      if (offset === bytes.length) { clearInterval(timer); res.end(); }
    }, 240);
    res.on('close', () => clearInterval(timer));
  }
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const portProbe = createServer();
  await new Promise((r) => portProbe.listen(0, '127.0.0.1', r));
  const port = portProbe.address().port;
  await new Promise((r) => portProbe.close(r));
  child = spawn(createRequire(import.meta.url)('electron'), [root, '--hidden', '--mute-audio', '--player-dry-run', '--use-mock-keychain', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`], {
    env: { ...process.env, TOASTER_HIDDEN: '1', TOASTER_UPDATE_FEED: `${origin}/latest` }, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let log = '';
  child.stderr.on('data', (b) => { log += b; });
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((p) => p.type === 'page'); } catch {}
    if (!page) await wait(100);
  }
  assert.ok(page, log);
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let serial = 0; const pending = new Map();
  ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { const id = ++serial; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(r.result?.exceptionDetails, undefined, JSON.stringify(r));
    return r.result.result.value;
  };
  const until = async (expression) => { for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`Timed out: ${expression}\n${log}`); };
  await until(`document.querySelector('#alerts button')?.textContent === 'Update now'`);
  await evaluate(`document.querySelector('#alerts button').click()`);
  await until(`document.querySelector('#update-download-bar')?.value > 0.1`);
  const progress = await evaluate(`({text: document.querySelector('#update-download-text').textContent, value: document.querySelector('#update-download-bar').value, width: document.querySelector('#update-download-bar').getBoundingClientRect().width, controls: document.querySelectorAll('#alerts button, #alerts .xp-ctl').length})`);
  assert.match(progress.text, /\d+\.\d \/ 2\.0 MB/);
  assert.ok(progress.width > 100);
  assert.equal(progress.controls, 0);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(out, 'progress.png'), Buffer.from(shot.result.data, 'base64'));
  await until(`document.querySelector('#alerts')?.textContent.includes("didn't match GitHub's checksum")`);
  const failure = await evaluate(`document.querySelector('#alerts').textContent`);
  assert.match(failure, /nothing changed/);
  writeFileSync(path.join(out, 'ui-result.json'), JSON.stringify({ progress, failure }, null, 2));
  console.log(JSON.stringify({ progress, failure }, null, 2));
} finally {
  ws?.close();
  if (child && child.exitCode === null) { const exited = new Promise((r) => child.once('exit', r)); child.kill(); await exited; }
  server.closeAllConnections(); await new Promise((r) => server.close(r));
  rmSync(profile, { recursive: true, force: true });
}
