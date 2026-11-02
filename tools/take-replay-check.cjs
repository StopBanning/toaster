// tools/take-replay.test.mjs's Electron half: a take made here (a 126 bpm loop, the clock harness's song: kick, clap, hats,
// bass, chords), stored as M stores one, and rendered by the app page itself in render mode (renderer/take-replay.js)
// through helpers/take-render.cjs: 12 s of run-up, then the frames. Hidden (no window, no Dock icon), muted, its own
// profile and the render's own session in the folder given. Prints one line of JSON and quits.
//   electron take-replay-check.cjs <folder> [seconds] [look] [song]   look: dominoes (default), lake, chrome, off, crt, tunnel, rain, noodles;
//                                                                       song: loop (default) or kicks (bare kicks at 120 bpm)
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs'), path = require('path');
const { createTakeRender } = require('../helpers/take-render.cjs');
const { createTakeStore } = require('../helpers/take-store.cjs');
const args = process.argv.slice(process.argv.findIndex((a) => a.endsWith('take-replay-check.cjs')) + 1);
const dir = args[0], seconds = +(args[1] || 4), look = args[2] || 'dominoes', song = args[3] || 'loop';
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setPath('userData', path.join(dir, 'profile'));
app.dock?.hide();
app.on('window-all-closed', () => {});
if (process.env.TAKE_DEBUG) app.on('web-contents-created', (_e, wc) => wc.on('console-message', (ev) => { if (/^take-/.test(ev.message)) console.log(ev.message); }));

const SR = 48000, RUNUP = 12, FPS = 30;
// the clock harness's song (tools/clock-harness-page.js), the same every time
const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function makeSong(sr, secs, bpm = 126) {
  const N = Math.floor(sr * secs), x = new Float32Array(N), rand = mulberry32(1234567), beat = 60 / bpm, bar = beat * 4, TAU = 2 * Math.PI;
  const add = (at, len, fn) => { const s0 = Math.floor(at * sr), n = Math.floor(len * sr); for (let i = 0; i < n && s0 + i < N; i++) if (s0 + i >= 0) x[s0 + i] += fn(i / sr, i); };
  const hz = (m) => 440 * 2 ** ((m - 69) / 12), chords = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], roots = [33, 29, 36, 31];
  for (let b = 0; b * beat < secs; b++) {
    const at = b * beat, inBar = b % 4, barN = Math.floor(b / 4), chord = chords[barN % 4], root = hz(roots[barN % 4]);
    add(at, 0.32, (t) => { const ph = TAU * (48 * t + (112 / 30) * (1 - Math.exp(-30 * t))); return 0.85 * Math.sin(ph) * Math.exp(-9 * t) * (1 - Math.exp(-900 * t)); });
    if (inBar === 1 || inBar === 3) { let prev = 0, lp = 0; for (const d of [0, 0.011, 0.022]) add(at + d, d === 0.022 ? 0.16 : 0.012, () => { const n = rand() * 2 - 1, hp = n - 0.85 * prev; prev = n; lp += 0.55 * (hp - lp); return 0.42 * lp; }); }
    let prev = 0;
    add(at + beat / 2, inBar === 3 ? 0.4 : 0.07, (t) => { const n = rand() * 2 - 1, hp = n - prev; prev = n; return (inBar === 3 ? 0.14 : 0.2) * hp * 0.5 * Math.exp(-(inBar === 3 ? 12 : 85) * t); });
    for (const [k, on] of [[0, 1], [0.5, 0], [0.75, 1], [0.25, 0]]) if (on) add(at + k * beat, beat * 0.28, (t) => { const ph = TAU * root * t; return 0.3 * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * Math.exp(-7 * t) * (1 - Math.exp(-400 * t)); });
    if (inBar === 0) for (const m of chord) add(at, bar * 0.97, (t) => { const ph = TAU * hz(m) * t, env = Math.min(1, t / 0.05) * Math.min(1, (bar * 0.97 - t) / 0.08); return 0.06 * env * (Math.sin(ph) - Math.sin(3 * ph) / 9 + Math.sin(5 * ph) / 25); });
  }
  for (let i = 0; i < N; i++) x[i] = Math.tanh(x[i] * 1.1);
  return x;
}
// bare kicks, 120 bpm, nothing else: where the engine notices each one says whether it hears the take at the right time
function makeKicks(sr, secs, bpm = 120) {
  const x = new Float32Array(Math.floor(sr * secs)), TAU = 2 * Math.PI;
  for (let at = 0; at < secs; at += 60 / bpm) {
    const s0 = Math.round(at * sr);
    for (let i = 0; i < 0.3 * sr && s0 + i < x.length; i++) { const t = i / sr, ph = TAU * (48 * t + (112 / 30) * (1 - Math.exp(-30 * t))); x[s0 + i] += 0.85 * Math.sin(ph) * Math.exp(-9 * t) * (1 - Math.exp(-900 * t)); }
  }
  return x;
}
const LOOKS = { dominoes: { visualName: 'off', blocks: true, blockLook: 'dominoes' }, lake: { visualName: 'scenery', sceneryScene: 'lake', blocks: false }, chrome: { visualName: 'chrome', chromeCollage: false, blocks: false }, off: { visualName: 'off', blocks: false }, crt: { visualName: 'off', blocks: false, crt: true }, tunnel: { visualName: 'tunnel', blocks: false }, rain: { visualName: 'rain', blocks: false }, noodles: { visualName: 'spaghetti', blocks: false } };

app.whenReady().then(async () => {
  const result = {};
  try {
    const x = (song === 'kicks' ? makeKicks : makeSong)(SR, RUNUP + seconds + 1), store = createTakeStore({ root: path.join(dir, 'takes') });
    const settings = { theme: 0, hintsDone: true, codeHidden: false, beatHidden: false, ...LOOKS[look] };
    const meta = { css: { width: 540, height: 960 }, dpr: 2, fps: FPS, sampleRate: SR, channels: 2, soundAt: 0, runup: RUNUP, t0: RUNUP, seed: 424242, source: 'file', label: 'take check', debugKicks: !!process.env.TAKE_DEBUG, storage: { 'now-coding': JSON.stringify(settings) } };
    const id = store.begin(meta), both = new Float32Array(x.length * 2);
    for (let i = 0; i < x.length; i++) both[2 * i] = both[2 * i + 1] = x[i];
    store.sound(id, both); store.end(id, { duration: seconds });
    const stored = store.read(id), frames = seconds * FPS, from = Math.round(RUNUP * SR);
    const takeSound = { sampleRate: SR, channels: 2, samples: frames / FPS * SR, read: (i, n) => stored.sound.read(from + i, Math.min(n, frames / FPS * SR - i)) };
    const takes = createTakeRender({ BrowserWindow, ipcMain });
    const t0 = Date.now();
    result.render = await takes.render({
      page: { file: path.join(__dirname, '..', 'renderer', 'index.html'), preload: path.join(__dirname, '..', 'helpers', 'take-render-preload.cjs') },
      css: meta.css, dpr: meta.dpr, fps: FPS, frames, t0: RUNUP, out: path.join(dir, `replay-${look}.mp4`), sound: takeSound,
      take: { meta: stored.meta, sound: x, changes: [] }, loadMs: 120000, frameMs: 20000,
    });
    result.ms = Date.now() - t0;
  } catch (e) { result.error = e?.message || String(e); }
  console.log(JSON.stringify({ result }));
  app.quit();
});
setTimeout(() => { console.log(JSON.stringify({ result: { error: 'timed out' } })); app.exit(2); }, 300000);
