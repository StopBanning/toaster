// Headless canvas evidence; never launches Toaster. Node 22+ and a standalone Chrome/Chromium are required.
// HANDHELD_CHROME=/path/to/chrome node tools/handheld-language-check.mjs [--lang=es] [--base=cf28592]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { resolve, join, extname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] || fallback;
const lang = arg('lang', 'es'), base = arg('base', 'cf28592');
const out = resolve(root, arg('out', '_checks/handheld-languages'));
await mkdir(out, { recursive: true });
const chrome = process.env.HANDHELD_CHROME || [
  join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
assert.ok(chrome, 'Set HANDHELD_CHROME to a standalone Chrome/Chromium executable');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const baseline = new Map();
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let body;
    if (path.startsWith('/base/') && extname(path) === '.js') {
      const name = 'renderer/' + path.slice(6);
      if (!baseline.has(name)) baseline.set(name, execFileSync('git', ['show', `${base}:${name}`], { cwd: root, maxBuffer: 8e6 }));
      body = baseline.get(name);
    } else {
      const relative = path.replace(/^\/(?:base|r)\//, 'renderer/').replace(/^\//, '');
      const full = resolve(root, relative);
      assert.ok(full.startsWith(root), 'Path outside checkout');
      body = await readFile(full);
    }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(body);
  } catch (e) { res.writeHead(404); res.end(String(e)); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'handheld-language-chrome-'));
const child = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--hide-scrollbars', '--disable-gpu', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket, debug;
const errors = [], hashes = [];
try {
  debug = await new Promise((yes, no) => {
    let log = '';
    const timeout = setTimeout(() => no(new Error('Chrome did not expose DevTools: ' + log)), 20000);
    child.once('error', no);
    child.stderr.on('data', (chunk) => { log += chunk; const m = log.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(timeout); yes(m[1]); } });
  });
  const endpoint = 'http://' + new URL(debug).host;
  const tab = await (await fetch(endpoint + '/json/new?about:blank', { method: 'PUT' })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => socket.addEventListener('open', r, { once: true }));
  let serial = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ': ' + m.params.exceptionDetails.exception?.description);
  };
  const send = (method, params = {}) => new Promise((yes, no) => {
    const id = ++serial;
    const timeout = setTimeout(() => { pending.delete(id); no(new Error('CDP timeout: ' + method)); }, 60000);
    pending.set(id, (m) => { clearTimeout(timeout); m.error ? no(new Error(JSON.stringify(m.error))) : yes(m.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const load = async (path, locale = 'en-US') => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'language', {value: ${JSON.stringify(locale)}});` });
    try {
      const url = origin + path;
      const navigation = await send('Page.navigate', { url });
      assert.ok(!navigation.errorText, navigation.errorText);
      for (let n = 0; n < 160; n++) {
        const done = await evaluate(`location.href === ${JSON.stringify(url)} && (window.__done || null)`);
        if (done) return done;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('No completed frame: ' + path);
    } finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier }); }
  };
  // These fixed-frame fixtures are copies of the supplied fixedframe.html / jpfixed.html, with no app or audio.
  // Warm the image/font caches before hashing. The supplied fixture's fixed 1.9s load wait can race a cold disk.
  for (const renderer of ['base', 'r']) for (const fixture of ['fixed', 'jp']) {
    await load(`/tools/handheld-language-${fixture}.html?r=/${renderer}&shell=${fixture === 'jp' ? 'stanceJp' : 'stance'}&T=0.01`);
  }
  for (const locale of arg('locales', 'en,ja').split(',')) for (const skin of arg('skins', 'os,lcd,neon,vfd,dance,highway').split(',')) {
    for (const [state, T] of [['boot', 1.5], ['game', 3.8]]) {
      if (arg('only', '') && arg('only', '') !== `${locale}-${skin}-${state}`) continue;
      const fixture = locale === 'ja' ? 'jp' : 'fixed';
      const query = `skin=${skin}&shell=${locale === 'ja' ? 'stanceJp' : 'stance'}&T=${T}${state === 'boot' ? '&boot' : ''}`;
      const before = await load(`/tools/handheld-language-${fixture}.html?r=/base&${query}`);
      const beforeShot = await send('Page.captureScreenshot', { format: 'png' });
      const after = await load(`/tools/handheld-language-${fixture}.html?r=/r&${query}`);
      if (before !== after) {
        await writeFile(join(out, `diff-${locale}-${skin}-${state}-before.png`), Buffer.from(beforeShot.data, 'base64'));
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(out, `diff-${locale}-${skin}-${state}-after.png`), Buffer.from(shot.data, 'base64'));
      }
      hashes.push({ locale, skin, state, before, after, equal: before === after });
      console.log(`${locale} ${skin} ${state}: ${before} ${after} ${before === after ? 'IDENTICAL' : 'CHANGED'}`);
    }
  }
  for (const skin of process.argv.includes('--hash-only') ? [] : ['os', 'lcd', 'neon']) for (const state of ['boot', 'game', 'standby']) {
    await load(`/tools/handheld-language-preview.html?skin=${skin}&state=${state}`, lang);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(out, `${lang}-${skin}-${state}.png`), Buffer.from(shot.data, 'base64'));
  }
  await load('/tools/handheld-language-preview.html?sheet');
  const sheet = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1080, height: 880, scale: 1 } });
  await writeFile(join(out, 'glyphs.png'), Buffer.from(sheet.data, 'base64'));
  await load(`/tools/handheld-language-preview.html?check`, lang);
  const fit = await evaluate('window.__fit');
  await writeFile(join(out, 'results.json'), JSON.stringify({ base, lang, hashes, fit, errors }, null, 2) + '\n');
  assert.deepEqual(errors, [], 'Browser errors');
  assert.ok(hashes.every((h) => h.equal), 'English/Japanese pixel identities changed (see results.json)');
  assert.deepEqual(fit.failures, [], 'Small-screen text overflow (see results.json)');
  console.log(`PASS: ${hashes.length} pixel identities, ${fit.count} canvas fit checks; evidence in ${out}`);
} finally {
  socket?.close();
  if (debug) {
    try {
      const ws = new WebSocket(debug); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
      ws.send(JSON.stringify({ id: 1, method: 'Browser.close' })); ws.close();
    } catch {}
  }
  if (child.exitCode === null) await Promise.race([new Promise((r) => child.once('exit', r)), new Promise((r) => setTimeout(r, 5000))]);
  if (child.exitCode === null) child.kill();
  server.closeAllConnections(); server.close();
  assert.ok(profile.startsWith(resolve(tmpdir(), 'handheld-language-chrome-')), 'Unexpected temporary profile path');
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
