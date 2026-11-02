// tools/take-live.test.mjs's driver: the whole perfect take in the app, as M makes one, on a hidden, muted test copy with a
// settings folder of its own (so its files go to <folder>/Videos/Toaster, never yours). It turns the perfect copy on, plays
// the demo beat (muted), lets the tap gather a run-up, begins a take, ends it 4 s later, begins and ends a second at once,
// and waits for main to write both "toaster <stamp> perfect.mp4" (one after the other). Prints one line of JSON.   node take-live-check.mjs <folder> [port]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dir, portS = '9361'] = process.argv.slice(2), port = +portS;
const electron = createRequire(import.meta.url)('electron');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listing = async () => { try { return await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { return null; } };
const result = {};
let child = null;
try {
  if (await listing()) throw new Error(`port ${port} is taken`);
  child = spawn(electron, [root, `--user-data-dir=${path.join(dir, 'profile')}`, '--hidden', '--mute-audio', `--remote-debugging-port=${port}`], { stdio: 'ignore' });
  let page = null;
  for (let i = 0; i < 100 && !page; i++) { await sleep(300); page = (await listing())?.find((p) => p.type === 'page' && p.url.includes('index.html')); }
  if (!page) throw new Error('the test copy did not come up');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const ev = (expression) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, (m) => (m.error || m.result?.exceptionDetails ? reject(new Error(m.error?.message || m.result.exceptionDetails.exception?.description || 'failed')) : resolve(m.result.result.value))); ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); });
  for (let i = 0; i < 60; i++) { if (await ev('!!window.__nc?.setPerfectCopy')) break; await sleep(250); }
  await ev('__nc.setPerfectCopy(true); __nc.useDemo(); true');
  await sleep(7000);
  result.before = await ev('__nc.takeState()');
  await ev('__nc.takeBegin().then(() => true)');
  result.during = await ev('__nc.takeState()');
  await sleep(4000);
  await ev('(__nc.takeEnd(true), true)');
  // a second take straight after: its copy waits for the first's
  await sleep(2500);
  await ev('__nc.takeBegin().then(() => true)');
  result.second = await ev('__nc.takeState()');
  await sleep(3000);
  await ev('(__nc.takeEnd(true), true)');
  const videos = path.join(dir, 'profile', 'Videos', 'Toaster');
  for (let i = 0; i < 360; i++) {
    const done = fs.existsSync(videos) ? fs.readdirSync(videos).filter((f) => f.endsWith(' perfect.mp4')).sort() : [];
    if (done.length >= 2) { result.file = path.join(videos, done[0]); result.second.file = path.join(videos, done[1]); break; }
    await sleep(500);
  }
  result.files = fs.existsSync(videos) ? fs.readdirSync(videos) : [];
  result.notice = await ev("document.getElementById('notice')?.textContent || ''");
} catch (e) { result.error = e?.message || String(e); }
finally { try { child?.kill(); } catch { /* gone */ } await sleep(800); }
console.log(JSON.stringify({ result }));
process.exit(0);
