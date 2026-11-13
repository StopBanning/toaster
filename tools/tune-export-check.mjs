// X with its tune, in the app, on a hidden, muted test copy with a settings folder of its own (its songs go to
// <folder>/profile/Music/Toaster, never yours): it plays a file (muted), lets it run, presses X, and reports what the export did:
// how long X took, the statuses shown while it listened, the page's line about the tune, the notice, the files written and the
// notes on each of their MIDI tracks. Prints one line of JSON.
//   node tools/tune-export-check.mjs <folder> <audio file> [seconds to play] [port]
// TOASTER_APP=<a packed copy's app.asar>: this Electron runs the packed archive instead of the checkout (still hidden, with
// its own settings folder: a packaged app itself ignores --hidden). Is everything X needs inside the archive, and does the
// model load from there?
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dir, audio, playS = '75', portS = '9371'] = process.argv.slice(2), port = +portS;
const electron = createRequire(import.meta.url)('electron');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listing = async (what = 'json') => { try { return await (await fetch(`http://127.0.0.1:${port}/${what}`)).json(); } catch { return null; } };

// the notes on each track of a MIDI file (name -> count of note-ons with a velocity)
function midiNotes(bytes) {
  const out = {};
  let p = 14;
  while (p + 8 <= bytes.length) {
    const len = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7];
    let q = p + 8, end = q + len, status = 0, name = `track ${Object.keys(out).length}`, notes = 0;
    const vlq = () => { let v = 0, b; do { b = bytes[q++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
    while (q < end) {
      vlq();
      let b = bytes[q];
      if (b === 0xff) { const type = bytes[q + 1]; q += 2; const l = vlq(); if (type === 3) name = Buffer.from(bytes.subarray(q, q + l)).toString(); q += l; continue; }
      if (b === 0xf0 || b === 0xf7) { q++; q += vlq(); continue; }
      if (b & 0x80) { status = b; q++; }
      const kind = status & 0xf0, two = kind !== 0xc0 && kind !== 0xd0;
      if (kind === 0x90 && bytes[q + 1] > 0) notes++;
      q += two ? 2 : 1;
    }
    out[name] = notes;
    p = end;
  }
  return out;
}

const result = {};
let child = null, ws = null;
try {
  if (await listing()) throw new Error(`port ${port} is taken`);
  fs.mkdirSync(dir, { recursive: true });
  child = spawn(electron, [process.env.TOASTER_APP || root, `--user-data-dir=${path.join(dir, 'profile')}`, '--hidden', '--mute-audio', `--remote-debugging-port=${port}`], { stdio: 'ignore' });
  let page = null;
  for (let i = 0; i < 100 && !page; i++) { await sleep(300); page = (await listing())?.find((p) => p.type === 'page' && p.url.includes('index.html') && !p.url.includes('widget')); }
  if (!page) throw new Error('the test copy did not come up');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(), said = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled') said.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (expression) => {
    const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (m.error || m.result?.exceptionDetails) throw new Error(m.error?.message || m.result.exceptionDetails.exception?.description || 'failed');
    return m.result.result.value;
  };
  await send('Runtime.enable');
  for (let i = 0; i < 60; i++) { if (await ev('!!window.__nc?.useFile')) break; await sleep(250); }
  await ev(`(async () => { const b = await (await fetch(${JSON.stringify('file://' + path.resolve(audio))})).blob(); await __nc.useFile(new File([b], ${JSON.stringify(path.basename(audio))}, { type: b.type || 'audio/webm' })); return true; })()`);
  await sleep(+playS * 1000);
  result.song = await ev('(() => { const s = __nc.eng.tape.song(__nc.eng.tempo.down); return s && { bars: s.bars.length, bpm: s.bpm, origin: s.origin, now: __nc.clock.now(), leadNotes: s.bars.reduce((n, b) => n + b.events.filter((e) => e.part === "lead").length, 0) }; })()');
  const statuses = new Set();
  const started = Date.now();
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'x', code: 'KeyX', windowsVirtualKeyCode: 88, text: type === 'keyDown' ? 'x' : undefined });
  const songs = path.join(dir, 'profile', 'Music', 'Toaster');
  let files = [];
  for (let i = 0; i < 1200; i++) {
    statuses.add(await ev("document.getElementById('status')?.textContent || ''"));
    files = fs.existsSync(songs) ? fs.readdirSync(songs) : [];
    if (files.some((f) => f.endsWith('.strudel.js')) && files.some((f) => f.endsWith('.mid'))) break;
    await sleep(100);
  }
  // (the song rebuilt from its own sounds comes after the pair: wait for the notice that ends the export)
  for (let i = 0; i < 1200; i++) {
    statuses.add(await ev("document.getElementById('status')?.textContent || ''"));
    if (/^saved /.test(await ev("document.getElementById('notice')?.textContent || ''"))) break;
    await sleep(100);
  }
  result.ms = Date.now() - started;
  result.statuses = [...statuses].filter((s) => /listening|exporting|pulling|rebuilding/.test(s)).filter((s, i, a) => i < 3 || i > a.length - 3);
  result.said = said.filter((s) => /export's tune|rebuilt|rebuild/.test(s));
  files = fs.existsSync(songs) ? fs.readdirSync(songs) : [];
  const rebuiltDir = files.find((f) => f.endsWith(' rebuilt'));
  if (rebuiltDir) {
    const all = fs.readdirSync(path.join(songs, rebuiltDir), { recursive: true });
    result.rebuilt = { folder: rebuiltDir, sounds: all.filter((f) => f.endsWith('.wav')).length, codeBytes: fs.statSync(path.join(songs, rebuiltDir, 'song.strudel.js')).size,
      head: fs.readFileSync(path.join(songs, rebuiltDir, 'song.strudel.js'), 'utf8').split('\n').slice(0, 12).map((l) => l.slice(0, 140)) };
    // (and its sounds, from where its code says they are, while the copy is still open)
    const base = /\}, '(http:\/\/localhost:\d+\/[^']+)'\)/.exec(fs.readFileSync(path.join(songs, rebuiltDir, 'song.strudel.js'), 'utf8'))?.[1];
    result.rebuilt.base = base || null;
    if (base) { try { const r = await fetch(base + 'bass.wav'); result.rebuilt.served = { status: r.status, bytes: (await r.arrayBuffer()).byteLength, cors: r.headers.get('access-control-allow-origin') }; } catch (err) { result.rebuilt.served = String(err); } }
  }
  await sleep(300);
  result.notice = await ev("document.getElementById('notice')?.textContent || ''");
  result.files = files;
  const mid = files.find((f) => f.endsWith('.mid'));
  if (mid) result.midi = midiNotes(fs.readFileSync(path.join(songs, mid)));
  const code = files.find((f) => f.endsWith('.strudel.js'));
  if (code) result.codeBytes = fs.statSync(path.join(songs, code)).size;
} catch (e) { result.error = e?.message || String(e); }
finally {
  // (quit over the debugging port, as the app's own quit; killed only if it doesn't go)
  try { const v = await listing('json/version'); if (v?.webSocketDebuggerUrl) { const b = new WebSocket(v.webSocketDebuggerUrl); await new Promise((r) => { b.onopen = r; b.onerror = r; }); b.send(JSON.stringify({ id: 1, method: 'Browser.close' })); } } catch { /* gone */ }
  for (let i = 0; i < 20 && child && child.exitCode === null; i++) await sleep(250);
  try { if (child?.exitCode === null) child.kill(); } catch { /* gone */ }
}
console.log(JSON.stringify(result));
process.exit(0);
