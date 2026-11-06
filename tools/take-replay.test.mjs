// The perfect take's render mode (renderer/take-replay.js, stream B): the app page itself, in the render's hidden window,
// listening again to a take's own sound and drawing it a frame at a time. Where this machine has Electron, for real
// (take-replay-check.cjs): a take of bare kicks (120 bpm) and one of a whole loop (126 bpm: kick, clap, hats, bass, chords),
// each stored as a take with a 12 s run-up and rendered at 540x960 at 2x. The files come out whole. The engine, answered from
// the take's sound at the clock's time, notices every kick on its first tick after the kick sounds (0 to 15 ms: it ticks
// every 15 ms), and nothing else. Two renders hear the same at the same times: the same take always comes out the same.
// The sources: the page boots with the take's settings, only the take's analysers are answered, nothing is saved.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../renderer/clock.js';
import { due, mono, replay, TICK } from '../renderer/take-replay.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), replaySrc = read('renderer/take-replay.js'), preload = read('helpers/take-render-preload.cjs');

test('the pieces: two channels to one as an analyser hears them, the changes due by a time, the engine\'s 15 ms tick', () => {
  assert.deepEqual([...mono([Float32Array.of(1, 0.5), Float32Array.of(-1, 0.5)])], [0, 0.5]);
  const one = Float32Array.of(0.25);
  assert.equal(mono([one]), one);
  const changes = [{ t: 1 }, { t: 2 }, { t: 2 }, { t: 5 }];
  assert.equal(due(changes, 0, 0.5), 0); assert.equal(due(changes, 0, 2), 3); assert.equal(due(changes, 3, 4.9), 3); assert.equal(due(changes, 3, 9), 4);
  assert.equal(TICK, 0.015);
  assert.match(app, /\}, 15\);/, 'the live engine ticks every 15 ms too');
});

test('a copy on scenes-auto shows the take\'s scene: attach moves the counter on, and the replay puts the live one back (B2)', () => {
  assert.match(replaySrc, /n\.attach\([^\n]*\n[\s\S]*?clock\.seed = meta\.seed;[^\n]*\n[^\n]*\n  if \(Number\.isInteger\(meta\.autoScene\)\) n\.setAutoScene\?\.\(meta\.autoScene, meta\.autoSceneAt\);/, 'after attach (which calls freshStart, then nextAutoScene)');
  assert.match(app, /setAutoScene: \(n, at\) => \{ autoScene = n; if \(Number\.isFinite\(at\)\) autoSceneAt = at; \}/);
  assert.match(app, /art: artData\(\), autoScene, autoSceneAt,/, 'the take keeps the counter and when it last moved');
});

test('the page has the take\'s seed from its first lines, before anything that rolls as it starts is made: the rain\'s first drops, the CRT\'s snow, the noodle dancers (B2, D1 1)', () => {
  // the page's own start (up to the analysers), run on a clock of its own as a copy and as the live page
  const boot = app.slice(app.indexOf('const TAKE = window.takeRender'), app.indexOf('const analyser = (size)'));
  const seedAfter = (takeRender) => {
    const clock = createClock({ entropy: () => 111 }), context = { window: { takeRender }, AudioContext: class {}, Image: class {}, clock };
    vm.runInNewContext(boot, context);
    return clock.seed;
  };
  assert.equal(seedAfter({ meta: { seed: 424242, sampleRate: 48000 } }), 424242, 'a copy: the take\'s');
  assert.equal(seedAfter(undefined), 111, 'the live page: its own, as before');
  // and each of the three is made, or rolled, after it
  const at = app.indexOf('if (TAKE) clock.seed = TAKE.seed;');
  assert.ok(at > 0);
  for (const roll of ["createSpaghetti($('spaghetti'))", "createField($('field'))", 'setCrt(state.crt);', "createCodeView(LINE_IDS)"]) {
    assert.ok(app.indexOf(roll) > at, `${roll} comes after the seed`);
  }
});

// The replay on stand-ins for the page and the render: what it does, in what order. A look that is not ready (waiting: its shaders
// still compiling, its pictures loading) is made ready by waitReady, which draws the same moment again till it is.
async function replayed(changes) {
  const events = [], draws = [];
  let waiting = false, answer = null;
  const n = {
    clock: createClock(), eng: { tick: 0, on: { drop() {}, kick() {} }, frame() {}, tap() {} }, analysers: { fast: {}, mid: {}, slow: {} },
    ac: { createGain: () => ({}) }, attach() {}, setAutoScene() {}, view: { clear() {} }, codeTick() {},
    prepareFrame: async () => {}, drawFrame: (t) => { draws.push(t); }, lookWaiting: () => waiting,
  };
  const api = { onDraw: (fn) => { answer = fn; }, ready: () => events.push('ready'), drawn: (k) => events.push(`drawn ${k}`), failed: (why) => events.push(`failed ${why}`) };
  const take = { meta: { sampleRate: 48000, soundAt: 10, t0: 10.2, runup: 0.2, fps: 30, seed: 5, source: 'file', label: 'x', settings: {} }, sound: new Float32Array(48000 * 4), changes };
  const apply = (set) => { if (set.look) waiting = true; };
  const waitReady = async (t) => { events.push(`wait ${t.toFixed(3)}`); waiting = false; };
  await replay(n, take, api, { apply, waitReady });
  for (let k = 0; k < 8; k++) await answer(k, 10.2 + k / 30);
  return events.filter((e) => !(e === 'wait 10.000'));
}

test('a look that begins during the take is waited for before its frame is answered, and no other frame waits: the frame it shows on is the take\'s, not this machine\'s compile speed (B7)', async () => {
  const events = await replayed([{ t: 10.3, set: { look: 'chrome' } }]);
  // (the change falls at 10.3, and is due at the engine's tick after it, 10.305: the frame at 10.2 + 4/30 is the first to see it)
  assert.deepEqual(events, ['ready', 'drawn 0', 'drawn 1', 'drawn 2', 'drawn 3', 'wait 10.333', 'drawn 4', 'drawn 5', 'drawn 6', 'drawn 7']);
});

test('a look that the run-up began, and was still being made when the take starts, is waited for before the page says it is ready, not inside the first frame (B7)', async () => {
  const events = await replayed([{ t: 10.1, set: { look: 'worlds' } }]);
  assert.deepEqual(events.slice(0, 3), ['wait 10.200', 'ready', 'drawn 0'], 'at the take\'s first moment (a wait in a frame is under the frame\'s time limit, this one under the page\'s start\'s)');
  assert.equal(events.filter((e) => e.startsWith('wait')).length, 1, 'once');
});

test('a take whose looks never wait is drawn as before: nothing is waited for, with or without the page saying (B7)', async () => {
  assert.deepEqual((await replayed([])).filter((e) => e.startsWith('wait')), []);
  assert.deepEqual((await replayed([{ t: 10.3, set: { orb: true } }])).filter((e) => e.startsWith('wait')), [], 'a change that makes nothing wait');
});

test('a take keeps D\'s drops and the toggles a scene doesn\'t hold, and the copy does them again (B5)', () => {
  assert.match(replaySrc, /else if \(c\.drop\) \{ eng\.lastDrop = c\.t; eng\.on\.drop\(true\); \}/, 'D, at its own time, as the key does it (pressed)');
  assert.match(app, /    if \(takeRec\.id\) takeRec\.changes\.push\(\{ t, drop: true \}\);/, 'a drop during the take is noted');
  assert.match(app, /\.\.\.\(takeRec\.dropsAt \|\| \[\]\)\.filter\(\(x\) => x >= soundAt\)\.map\(\(x\) => \(\{ t: x, drop: true \}\)\)/, 'and the run-up\'s');
  assert.match(app, /const TAKE_EXTRAS = \['orb', 'card', 'cardV', 'cardBig', 'hushed', 'drop', 'crt', 'look', 'worldLook', 'chromeCollage', 'spaghettiKind', 'spectroTheme'\];/);
  assert.match(app, /return \{ \.\.\.rest, \.\.\.Object\.fromEntries\(TAKE_EXTRAS\.map\(\(k\) => \[k, state\[k\]\]\)\) \};/, 'noted with the scene\'s keys');
  assert.match(app, /presetSetters,\n  orb: \(on\) => setOrb\(on\)/, 'and each has a setter in the copy, so none is missing');
  assert.match(app, /, takeSetters\)\.catch\(\(\) => false\);/);
});

test('a take keeps its taps of tap tempo, in the run-up and during it, and the copy taps again at the same times', () => {
  assert.match(replaySrc, /if \(c\.tap\) eng\.tap\(c\.t\);/, 'replayed at its own time, so the gaps (the tempo) and the first tap (the bar) are the live ones');
  assert.match(app, /const t = nowSec\(\), n = eng\.tap\(t\);\n  if \(takeRec\.id\) takeRec\.changes\.push\(\{ t, tap: true \}\);/, 'a tap during the take is noted at the time the engine had it');
  assert.match(app, /\(eng\.taps \|\| \[\]\)\.filter\(\(x\) => x >= soundAt\)\.map\(\(x\) => \(\{ t: x, tap: true \}\)\)/, 'and the run-up\'s');
});

test('render mode in the page: the take\'s sample rate, no saving, no source menu, the header and footer out, the scene setters', () => {
  assert.match(app, /const TAKE = window\.takeRender\?\.meta \|\| null;\nconst ac = new AudioContext\(TAKE \? \{ sampleRate: TAKE\.sampleRate \} : \{ latencyHint: 'interactive' \}\);/);
  assert.match(app, /function saveSettings\(\) \{\n  if \(WIDGET \|\| TAKE\) return;/);
  assert.match(app, /if \(!window\.nc && !TAKE\) showMenu\(/);
  assert.match(app, /document\.body\.classList\.add\('recording'\);/);
  assert.match(app, /const applySetup = \(settings\) => applyPreset\(\{ name: 'take', settings \}, /, 'what changes during a take goes in as a scene of yours does, with no status line');
  assert.match(app, /analysers: \{ fast, mid, slow \}/);
  assert.match(app, /view\.slipsOff = !state\.stagedTypos \|\| !!rec\.mr \|\| clips\.on \|\| !!TAKE;/, 'no staged slips in a perfect copy, as in M\'s recordings');
  assert.match(app, /for \(const mode of \['vertical', 'mini'\]\) if \(TAKE\[mode\]\) \{ state\[mode\] = true; document\.body\.classList\.add\(mode\); \}/, 'the take\'s layout');
  assert.match(replaySrc, /answerFrom\(\[n\.analysers\.fast, n\.analysers\.mid, n\.analysers\.slow\]/, 'only the engine\'s three analysers are answered from the take');
  assert.doesNotMatch(replaySrc.replace(/\/\/.*$/gm, ''), /AnalyserNode\.prototype|Math\.random|performance\.now|Date\.now/);
  assert.match(preload, /const meta = ipcRenderer\.sendSync\('take:meta'\);\nif \(meta\?\.storage\) \{/, 'the storage goes back before the app starts');
});

test('no first-run hint in a perfect copy: the hints run on a real 200 ms timer, so the pill would show in whatever frames that time fell on (B8 c)', () => {
  assert.match(app, /function updateHints\(event = \{\}\) \{\n(?:  \/\/.*\n)*  const blocked = !!TAKE \|\| /);
  assert.match(app, /if \(result\.hint\) \{/, 'a hint shows only when advanceHints gives one, which a blocked page never gets');
});

let electron = null;
try { electron = createRequire(import.meta.url)('electron'); if (!fs.existsSync(electron)) electron = null; } catch { /* no Electron here */ }
const tool = (name) => { const bin = process.env[name.toUpperCase()] || name; return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0 ? bin : null; };
const ffprobe = tool('ffprobe'), ffmpeg = tool('ffmpeg');

function run(dir, song, look = 'dominoes') {
  const r = spawnSync(electron, [path.join(here, 'take-replay-check.cjs'), dir, '3', look, song], { encoding: 'utf8', timeout: 170000, env: { ...process.env, TAKE_DEBUG: '1' } });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('{"result"'));
  assert.ok(line, `no result from Electron: ${r.stdout}\n${r.stderr}`.slice(0, 2000));
  const kicks = (r.stdout || '').split('\n').filter((l) => l.startsWith('take-kick ')).map((l) => +l.split(' ')[1]);
  return { result: JSON.parse(line).result, kicks };
}

test('for real: a stored take renders whole, the engine hears its kicks on time, and twice is the same', { skip: !electron && 'no Electron here', timeout: 400000 }, () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-replay-')), b = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-replay-'));
  try {
    // (the pair is of the rain look, whose first drops roll when the page starts: two renders of one take must draw the same pictures)
    const one = run(a, 'kicks', 'rain'), two = run(b, 'kicks', 'rain'), loop = run(fs.mkdtempSync(path.join(a, 'loop-')), 'loop');
    assert.equal(one.result.error, undefined, one.result.error);
    assert.equal(loop.result.error, undefined, loop.result.error);
    assert.equal(loop.result.render.frames, 90, 'the whole loop renders too');
    const r = one.result.render;
    assert.deepEqual([r.width, r.height, r.fps, r.frames, r.video], [1080, 1920, 30, 90, r.video]);
    assert.ok(['AAC', 'Opus'].includes(r.audio));
    if (ffprobe) {
      const n = spawnSync(ffprobe, ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', r.file], { encoding: 'utf8' }).stdout.trim();
      assert.equal(n, '90', 'every frame in the file');
    }
    // every kick (one each half second from 0 s; the take from 12 s, its run-up from 0) noticed on the engine's first tick after
    // it sounds, and nothing noticed that isn't a kick
    const heard = one.kicks.filter((t) => t >= 1), late = heard.map((t) => t - Math.floor(t * 2) / 2);
    assert.ok(heard.length >= 28, `${heard.length} kicks noticed from 1 s to 15 s`);
    assert.ok(late.every((d) => d > 0 && d <= 0.0151), `each noticed 0 to 15 ms after its kick: ${late.map((d) => (d * 1000).toFixed(1)).join(', ')} ms`);
    assert.equal(new Set(heard.map((t) => Math.floor(t * 2))).size, heard.length, 'once each');
    assert.deepEqual(two.kicks, one.kicks, 'a second render hears the same kicks at the same times');
    if (ffmpeg) {
      // the pictures too: the first render's frames against the second's (decoded: the files differ in their headers), PSNR 'inf' for
      // the same, about 31 dB when the rain's first drops were rolled from each page's own seed
      const psnr = spawnSync(ffmpeg, ['-v', 'info', '-i', one.result.render.file, '-i', two.result.render.file, '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/PSNR[^\n]*average:(\S+)/);
      assert.ok(psnr, 'ffmpeg compared them');
      assert.ok(psnr[1] === 'inf' || +psnr[1] > 60, `the same take, drawn twice, comes out the same (PSNR ${psnr[1]} dB)`);
    }
  } finally { for (const d of [a, b]) fs.rmSync(d, { recursive: true, force: true }); }
});
