// The clock's acceptance check (PLAN.md, stream A): every background, scene, code look and post look drawn at the same
// times at 60 fps and at 30 fps, and the frames compared pixel for pixel. A look that keeps state from frame to frame
// (a decay per frame, a count of frames, dice rolled at draw time) comes out different, and is named here.
//
//   node tools/clock-harness.mjs                       every look, 60 against 30 fps, on a hidden test copy this starts
//   node tools/clock-harness.mjs --list                the looks' names
//   node tools/clock-harness.mjs --looks scene-lake,bg-fire --fps 60,30,24
//   node tools/clock-harness.mjs --port 9341 --no-launch   drive a copy that is already up (started as below; on a machine
//                                                          without macOS's `open`, start it by hand and use this)
//   --seconds 2 --t0 10 --compare 0.5,1,1.5,2   what is drawn: from 10 s into the song, for 2 s, compared at these times
//   --fps 60,60   the same rate twice: a fresh page each time, the frames must come out the same (a run-to-run check:
//                 anything left to real time, a timer, a fetch, shows here)
//   --stats   for a look that differs, run it again and say how many pixels, by how much (and write pictures)
//   --detail  for a look that differs, which lines of the code or the page's words
//
// The test copy is a dev copy of this folder with its own settings folder, hidden (no window, no Dock icon), muted, and
// never the camera: `open -n -j Electron.app --args <this folder> --user-data-dir=<folder> --hidden --mute-audio
// --remote-debugging-port=<port>`. Each run of a look is a fresh page: it is reloaded first, so no look inherits another's
// state. The page half is tools/clock-harness-page.js: a song made in the page and answered to the engine's analysers by
// an FFT of its own, the engine ticked on the clock's time, a frame drawn with the app's own drawFrame at clock.set(t),
// and every visible canvas (and the code's text) fingerprinted. What is compared is, per look, per time, per canvas, the
// fingerprint of the 60 fps run against the 30 fps run. The camera is off throughout (it is excluded).
//
// What is drawn: every background (V), the scenery's scenes, the worlds' looks, the spaghetti's two kinds, the
// spectrogram's two colourings, the chrome without its collage, the three block looks (P), the orb's forms, the glass, the
// code hidden three ways (Z), the CRT, the ID card, and the other themes. The post looks (stream E, F's round) are drawn too
// once the app lists them: __nc.postLooks (their names) and __nc.setPostLook(name), each over the lake and the dominoes.
//
// Output: <out>/results.json, and for a canvas that differs, a picture of each run and of their difference.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const flag = (name) => process.argv.includes(`--${name}`);
const port = +arg('port', 9341);
const profile = path.resolve(arg('profile', path.join(os.homedir(), 'work/scratch/clock/profile')));
const out = path.resolve(arg('out', path.join(os.homedir(), 'work/scratch/clock/out')));
const fpsList = arg('fps', '60,30').split(',').map(Number);
const seconds = +arg('seconds', 2);
const t0 = +arg('t0', 10);
const compare = arg('compare', '0.5,1,1.5,2').split(',').map(Number);
const electronApp = path.join(root, 'node_modules/electron/dist/Electron.app');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- the test copy

const listing = async () => { try { return await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { return null; } };
let launched = false;
async function launch() {
  const have = await listing();
  if (!have && flag('no-launch')) throw new Error(`nothing is listening on port ${port}: start a hidden test copy (see above) or leave out --no-launch`);
  if (have) {
    const page = have.find((p) => p.type === 'page');
    if (!page || !decodeURI(page.url).includes(fs.realpathSync(root).split(path.sep).join('/'))) throw new Error(`port ${port} is somebody else's copy (${page?.url}): pick another with --port`);
    return;
  }
  fs.mkdirSync(profile, { recursive: true });
  // (2D canvases drawn by the CPU, not the graphics card's path renderer: that one draws a stroke it has met before from a
  // cache and one it hasn't by another route, a pixel or two apart, so a run that drew twice the frames drew them
  // a little otherwise. WebGL stays on the card.)
  execFileSync('open', ['-n', '-j', electronApp, '--args', root, `--user-data-dir=${profile}`, '--hidden', '--mute-audio', '--disable-accelerated-2d-canvas', '--disable-gpu-rasterization', `--remote-debugging-port=${port}`]);
  launched = true;
  for (let i = 0; i < 100; i++) { await sleep(300); const l = await listing(); if (l?.some((p) => p.type === 'page')) return; }
  throw new Error('the test copy did not come up');
}
async function quit() {
  if (!launched) return;
  try {
    const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const ws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; ws.onerror = r; });
    ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await sleep(1500);
  } catch { /* already gone */ }
  try { execSync(`pkill -f -- '--user-data-dir=${profile}'`); } catch { /* none left */ }
  // (and wait till it has gone: a run started straight after this one would otherwise find it still on the port, take it for a copy
  // it may drive and not close it, as happened twice on Nov 1)
  for (let i = 0; i < 25 && (await listing()); i++) await sleep(200);
  if (await listing()) { try { execSync(`pkill -9 -f -- '--user-data-dir=${profile}'`); } catch { /* none left */ } }
}

// ---------------------------------------------------------------- CDP

let ws, nextId = 0;
const pending = new Map(), waiters = [];
async function connect() {
  const page = (await listing()).find((p) => p.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method) for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
  };
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const next = (method) => new Promise((resolve) => waiters.push({ method, resolve }));
async function evaluate(expression, timeout = 600000) {
  const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), sleep(timeout).then(() => { throw new Error('page timed out'); })]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

// ---------------------------------------------------------------- looks

const BASE = { theme: 'bluescreen', code: 'all' };
function catalogue(c) {
  const L = [];
  const add = (id, look) => L.push({ id, ...BASE, ...look });
  for (const v of c.visuals) {
    if (v === 'scenery' || v === 'spaghetti' || v === 'worlds' || v === 'spectrogram') continue;
    add(`bg-${v}`, { visual: v });
  }
  for (const s of c.scenes) add(`scene-${s}`, { visual: 'scenery', scene: s });
  for (const w of c.worldLooks) add(`worlds-${w}`, { visual: 'worlds', worldLook: w });
  for (const k of c.spaghettiKinds) add(`spaghetti-${k}`, { visual: 'spaghetti', spaghettiKind: k });
  add('spectrogram', { visual: 'spectrogram' });
  add('spectrogram-themed', { visual: 'spectrogram', spectroTheme: true });
  add('chrome-plain', { visual: 'chrome', chromeCollage: false });
  for (const b of c.blockLooks) add(`blocks-${b}`, { visual: 'off', blocks: b });
  for (const f of c.orbForms) add(`orb-${f}`, { visual: 'off', orb: true, orbForm: f });
  // (known: 33 pixels at most 5 of 255 apart, in one patch of 22 by 12 pixels of the glass's code text at one of the compared
  // times, between 60 and 30 or 24 fps. A line the glass draws from the page's words; which of them is not isolated yet.)
  add('glass', { visual: 'scenery', scene: 'lake', glass: true, known: 'one patch of the glass\'s code text, 22 by 12 pixels, at most 5 of 255 apart, at t=2 only, between 60 and 30 or 24 fps (the cause is not isolated)' });
  add('code-none', { visual: 'scenery', scene: 'lake', code: 'none' });
  add('code-beat', { visual: 'scenery', scene: 'lake', code: 'beat' });
  add('code-all', { visual: 'off' });
  for (const th of ['blackscreen', 'terminal', 'pink', 'whitescreen', 'softclub']) add(`theme-${th}`, { visual: 'scenery', scene: 'lake', theme: th });
  // the post looks (stream E: F cycles them): whatever the app lists in __nc.postLooks, each over the lake and over the dominoes
  for (const p of c.postLooks || []) { add(`post-${p}`, { visual: 'scenery', scene: 'lake', post: p }); add(`post-${p}-dominoes`, { visual: 'off', blocks: 'dominoes', post: p }); }
  add('crt', { visual: 'off', crt: true });
  add('card', { visual: 'off', card: true });
  // the drop effects (each is off unless the user picks it): the engine's drop at 10.2 s, over nothing else but the code
  add('drop-takeover', { visual: 'off', drop: 'xp takeover', dropAt: 10.2 });
  add('drop-takeover-closing', { visual: 'off', drop: 'xp takeover', dropAt: 10.2, dropShort: 'takeover' });
  add('drop-y2k', { visual: 'off', drop: 'y2k bug', dropAt: 10.2 });
  add('drop-y2k-closing', { visual: 'off', drop: 'y2k bug', dropAt: 10.2, dropShort: 'y2k' });
  // (known: the window's copies are snapshots of the screen, one for each 8th, taken on the frame that notices it: up to a frame
  // later at 30 fps than at 60, and so a pixel or two off in where it sits. At any one frame rate it is the same every time.)
  const storm = 'the window\'s copies (a snapshot of the screen on each 8th) are taken on the frame that notices the 8th: where each sits is up to a frame\'s travel off, between 60 and 30 fps';
  add('drop-storm', { visual: 'off', drop: 'not responding', dropAt: 10.2, known: storm });
  add('drop-storm-closing', { visual: 'off', drop: 'not responding', dropAt: 10.2, dropShort: 'storm', known: storm });
  add('drop-bsod', { visual: 'off', drop: 'blue screen', dropAt: 10.2 });
  add('drop-crt', { visual: 'off', crt: true, dropAt: 10.2 });
  return L;
}

// ---------------------------------------------------------------- one run

// The app keeps its settings in the page's storage, and a look is set up by changing them: a run would start from
// whatever the one before it left (the CRT still on, another background). So every load starts from the same ones:
// nothing a first visit shows (its hints, the what's-new box, a look for updates: each on a timer of real time).
let version = '';
async function settle() {
  version ||= await evaluate(`window.nc?.version?.() ?? ''`);
  await evaluate(`localStorage.setItem('now-coding', ${JSON.stringify(JSON.stringify({ hintsDone: true, seenVersion: version, updates: false, calm: false, playerBar: false, visualName: 'off', blocks: false, orb: false, glass: false, crt: false, theme: 0, drop: 3 }))})`);
}
async function reload() {
  await settle();
  const loaded = next('Page.loadEventFired');
  await send('Page.reload', { ignoreCache: false });
  await loaded;
  for (let i = 0; i < 200; i++) { if (await evaluate('!!(window.H && window.H.ready && window.__nc && window.__nc.scenery)')) return; await sleep(100); }
  throw new Error('the page did not start');
}
async function runOne(look, fps) {
  await reload();
  if (flag('detail')) await evaluate('H.detail = true');
  const prep = await evaluate(`H.prepare(${JSON.stringify(look)}, ${JSON.stringify({ t0, fps })})`);
  const digests = await evaluate(`H.run(${JSON.stringify({ fps, t0, seconds, compare })})`);
  return { prep, digests };
}

// What differs between two digests of the same time: which canvases, and whether the code did.
function diff(a, b) {
  const names = new Set([...Object.keys(a.canvases), ...Object.keys(b.canvases)]);
  const canvases = [];
  for (const n of names) {
    const x = a.canvases[n], y = b.canvases[n];
    if (!x || !y) canvases.push({ canvas: n, why: x ? 'only at the first rate' : 'only at the second rate' });
    else if (x.hash !== y.hash || x.w !== y.w || x.h !== y.h) canvases.push({ canvas: n, why: 'pixels' });
  }
  const engine = Object.keys(a.engine).filter((k) => JSON.stringify(a.engine[k]) !== JSON.stringify(b.engine[k]));
  return { canvases, code: a.code !== b.code, text: a.text !== b.text, bodyClass: a.bodyClass !== b.bodyClass, overlays: a.overlays !== b.overlays, windows: a.windows !== b.windows, animations: a.animations !== b.animations, engine };
}

// A PNG of RGBA bytes (no library: a chunk is its length, its name, its bytes and a CRC)
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w, h, rgba) {
  const chunk = (name, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(name, 4); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function pictures(look, fpsA, fpsB, time, canvas) {
  // run both again and take the pixels of one canvas at one time
  const grab = async (fps) => {
    await reload();
    await evaluate(`H.prepare(${JSON.stringify(look)}, ${JSON.stringify({ t0, fps })})`);
    return evaluate(`(async () => { const r = await H.run(${JSON.stringify({ fps, t0, seconds: time, compare: [time], pixelsOf: canvas })}); return r[${JSON.stringify(time)}].pixels; })()`);
  };
  const a = await grab(fpsA), b = await grab(fpsB);
  const A = Buffer.from(a.data, 'base64'), B = Buffer.from(b.data, 'base64');
  let changed = 0, max = 0, x0 = a.w, y0 = a.h, x1 = -1, y1 = -1;
  const D = Buffer.alloc(A.length);
  for (let i = 0; i < A.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A[i + k] - B[i + k]));
    if (d) { changed++; max = Math.max(max, d); const p = i / 4, x = p % a.w, y = (p / a.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    D[i] = d ? 255 : 0; D[i + 1] = d ? Math.min(255, 60 + d) : 0; D[i + 2] = 0; D[i + 3] = 255;
  }
  const base = path.join(out, `${look.id}-${canvas}-${time}`);
  // (the frames are drawn on a canvas that is transparent: put each over a mid grey, so what is drawn can be seen)
  const flat = (X) => { const Y = Buffer.alloc(X.length); for (let i = 0; i < X.length; i += 4) { const a = X[i + 3] / 255; for (let k = 0; k < 3; k++) Y[i + k] = Math.round(X[i + k] + (90 * (1 - a))); Y[i + 3] = 255; } return Y; };
  for (const [name, buf] of [[`${fpsA}`, flat(A)], [`${fpsB}${fpsA === fpsB ? '-again' : ''}`, flat(B)], ['diff', D]]) fs.writeFileSync(`${base}-${name}.png`, png(a.w, a.h, buf));
  return { changedPixels: changed, of: a.w * a.h, maxDelta: max, box: changed ? [x0, y0, x1, y1] : null, size: [a.w, a.h] };
}

// ---------------------------------------------------------------- main

fs.mkdirSync(out, { recursive: true });
try {
  await launch();
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(root, 'tools/clock-harness-page.js'), 'utf8') });
  await reload();
  const consts = await evaluate(`({ visuals: __nc.VISUALS, scenes: __nc.scenery.scenes, worldLooks: __nc.worlds.looks, spaghettiKinds: __nc.SPAGHETTI_KINDS, blockLooks: __nc.BLOCK_LOOKS, orbForms: __nc.orb.forms, postLooks: __nc.postLooks || [] })`);
  const all = catalogue(consts);
  if (flag('list')) { console.log(all.map((l) => l.id).join('\n')); process.exit(0); }
  const wanted = arg('looks', '') ? arg('looks').split(',') : all.map((l) => l.id);
  const results = [];
  for (const id of wanted) {
    const look = all.find((l) => l.id === id);
    if (!look) { console.log(`no look called ${id}`); continue; }
    const row = { id, runs: {}, mismatches: [] };
    try {
      // (the same rate twice, --fps 60,60, is the run-to-run check: a fresh page each time, and the frames must be the same)
      const keys = fpsList.map((f, i) => (fpsList.indexOf(f) === i ? String(f) : `${f}#${i + 1}`));
      for (const [i, fps] of fpsList.entries()) row.runs[keys[i]] = await runOne(look, fps);
      const [ref, ...others] = keys;
      for (const fps of others) {
        for (const c of compare) {
          const d = diff(row.runs[ref].digests[c], row.runs[fps].digests[c]);
          if (d.canvases.length || d.code || d.text || d.bodyClass || d.overlays || d.windows || d.animations || d.engine.length) {
            const m = { vs: fps, at: c, ...d };
            const A = row.runs[ref].digests[c], B = row.runs[fps].digests[c];
            if (d.bodyClass) m.bodyClasses = { [ref]: A.bodyClass, [fps]: B.bodyClass };
            if (d.overlays) m.overlayClasses = { [ref]: A.overlays, [fps]: B.overlays };
            if (A.animationsRaw !== undefined && A.animationsRaw !== B.animationsRaw) {
              const a = A.animationsRaw.split('\n'), b = B.animationsRaw.split('\n');
              m.animationLines = { [`only at ${ref}`]: a.filter((l) => !b.includes(l)).slice(0, 8), [`only at ${fps}`]: b.filter((l) => !a.includes(l)).slice(0, 8) };
            }
            if (A.codeRaw !== undefined && A.codeRaw !== B.codeRaw) {
              const a = A.codeRaw.split('\n'), b = B.codeRaw.split('\n');
              m.codeLines = a.map((l, i) => (l === b[i] ? null : { [ref]: l, [fps]: b[i] })).filter(Boolean);
            }
            if (A.textRaw !== undefined && A.textRaw !== B.textRaw) {
              const a = A.textRaw.split('\n'), b = B.textRaw.split('\n');
              const only = (x, y) => x.filter((l, i) => !y.includes(l) || x.indexOf(l) !== y.indexOf(l)).slice(0, 8);
              m.textLines = { [`only at ${ref}`]: only(a, b), [`only at ${fps}`]: only(b, a) };
            }
            row.mismatches.push(m);
          }
        }
      }
      const locked = row.runs[ref].digests[compare.at(-1)].eng;
      row.engine = locked;
      row.anim = compare.map((c) => row.runs[ref].digests[c].eng?.animations ?? 0);
    } catch (err) { row.error = String(err.message || err); }
    row.ok = !row.error && !row.mismatches.length;
    if (look.known) row.known = look.known;
    if (flag('stats') && row.mismatches.length) {
      const m = row.mismatches.find((x) => x.canvases.some((c) => c.why === 'pixels'));
      if (m) {
        try { row.stats = { canvas: m.canvases.find((c) => c.why === 'pixels').canvas, at: m.at, ...(await pictures(look, fpsList[0], parseFloat(m.vs), m.at, m.canvases.find((c) => c.why === 'pixels').canvas)) }; }
        catch (err) { row.stats = { error: String(err.message || err) }; }
      }
    }
    delete row.runs;
    results.push(row);
    console.log(`${row.ok ? 'MATCH   ' : row.error ? 'ERROR   ' : row.known ? 'KNOWN   ' : 'DIFFERS '}${id}${row.error ? `  ${row.error.split('\n')[0]}` : ''}${row.mismatches.length ? `  ${[...new Set(row.mismatches.flatMap((m) => [...m.canvases.map((c) => c.canvas), ...(m.code ? ['code'] : []), ...(m.text ? ['text'] : []), ...(m.overlays ? ['overlay classes'] : []), ...(m.windows ? ['windows'] : []), ...(m.animations ? ['css animations'] : [])]))].join(',')} at ${row.mismatches.map((m) => m.at).join(',')}` : ''}${row.engine ? `  [${row.engine.locked ? `locked ${Math.round(row.engine.bpm)}` : 'no lock'}${row.anim?.some(Boolean) ? `, css animations in flight: ${row.anim.join('/')}` : ''}]` : ''}${row.stats?.changedPixels !== undefined ? `  ${row.stats.canvas}@${row.stats.at}: ${row.stats.changedPixels} of ${row.stats.of} px, max ${row.stats.maxDelta}` : ''}`);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
  }
  const known = results.filter((r) => !r.ok && !r.error && r.known);
  console.log(`\n${results.filter((r) => r.ok).length} of ${results.length} match${known.length ? `, ${known.length} known to differ` : ''}`);
  if (known.length) console.log('\nknown to differ (and why):\n' + known.map((r) => `  ${r.id}: ${r.known}`).join('\n'));
  const off = results.filter((r) => !r.ok && !(r.known && !r.error));
  if (off.length) console.log('\nstill different:\n' + off.map((r) => `  ${r.id}${r.error ? ' (error: ' + r.error.split('\n')[0] + ')' : r.stats?.changedPixels !== undefined ? `: ${r.stats.canvas} ${r.stats.changedPixels} of ${r.stats.of} px, max delta ${r.stats.maxDelta}` : ''}`).join('\n'));
} finally {
  await quit();
}
process.exit(0);
