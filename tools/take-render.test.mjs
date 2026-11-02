// The perfect take's render (helpers/take-render.cjs, stream B): a page drawn again one frame at a time in a hidden
// window, each frame captured and encoded with the take's sound. Where this machine has Electron, it runs for real
// (take-render-check.cjs on take-render-page.html, whose every frame shows its own number in 16 squares). A whole take
// comes out with every frame the one asked for, the flashes on their frames and each click within 1 ms of its flash (read
// back with ffmpeg, where there is one). A cancel, a crash, a page that stops answering, a page that can't draw, a second
// render while one runs and a size that can't be encoded each end it in words, with no window and no file left. The
// sizes are checked here too, and the sources: what the page and the encoder are told, and in what order.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { outputSize } = require('../helpers/take-render.cjs');
const read = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8').replace(/\r\n/g, '\n');
const driver = read('helpers/take-render.cjs'), renderPreload = read('helpers/take-render-preload.cjs'), encoderPage = read('renderer/take-encoder.js'), encoderHtml = read('renderer/take-encoder.html');

test('the output is the page\'s CSS size times its pixel ratio, an even number of pixels each way', () => {
  assert.deepEqual(outputSize({ width: 540, height: 960 }, 2), { width: 1080, height: 1920 });
  assert.deepEqual(outputSize({ width: 960, height: 540 }, 2), { width: 1920, height: 1080 });
  assert.deepEqual(outputSize({ width: 1080, height: 1920 }, 1), { width: 1080, height: 1920 });
  assert.deepEqual(outputSize({ width: 541, height: 960 }, 1), { width: 540, height: 960 }, 'odd: the even size just below');
  assert.deepEqual(outputSize({ width: 803, height: 1205 }, 1.6), { width: 1284, height: 1928 }, 'a fractional ratio: 1284.8 x 1928, even below');
  assert.throws(() => outputSize({ width: 0, height: 960 }, 2), { message: "a take can't be 0x1920" });
});

test('the protocol: the page answers two animation frames after drawing, and is captured hidden, after the answer', () => {
  assert.match(renderPreload, /drawn: \(k\) => \{ requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => ipcRenderer\.send\('take:drawn', k\)\)\); \}/);
  const draw = driver.indexOf("wc.send('take:draw', k, t0 + k / fps);"), drawn = driver.indexOf('await drawnP;'), capture = driver.indexOf('await wc.capturePage(undefined, { stayHidden: true })');
  assert.ok(driver.indexOf("const drawnP = next(wc, 'take:drawn', (n) => n === k,") < draw, 'the answer is listened for before the frame is asked for');
  assert.ok(draw < drawn && drawn < capture, 'asked, answered, then captured');
  assert.match(driver, /zoomFactor: job\.dpr/, 'zoomed by the pixel ratio');
  assert.match(driver, /show: false/);
  assert.match(driver, /contextIsolation: true, sandbox: true, backgroundThrottling: false/);
  assert.match(encoderHtml, /content="default-src 'none'; script-src 'self'"/, 'the encoder page can load nothing but its own scripts');
  assert.match(encoderPage, /^import \{ createTakeEncoder \} from '\.\/take-encode\.js';$/m);
});

let electron = null;
try { electron = require('electron'); if (!fs.existsSync(electron)) electron = null; } catch { /* no Electron here */ }
const tool = (name) => { const bin = process.env[name.toUpperCase()] || name; return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0 ? bin : null; };
const ffmpeg = tool('ffmpeg'), ffprobe = tool('ffprobe');

test('for real: a whole take, then a cancel, a crash, a stall, a page that fails and a second render, each said in words, and an odd size drawn at the even size below, with nothing left behind', { skip: !electron && 'no Electron here', timeout: 180000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-render-'));
  try {
    const run = spawnSync(electron, [path.join(here, 'take-render-check.cjs'), dir], { encoding: 'utf8', timeout: 170000 });
    const line = (run.stdout || '').split('\n').find((l) => l.startsWith('{"result"'));
    assert.ok(line, `no result from Electron: ${run.stdout}\n${run.stderr}`.slice(0, 2000));
    const { result: r } = JSON.parse(line);
    assert.equal(r.error, undefined, r.error);
    assert.equal(r.full.error, undefined, r.full.error);
    assert.deepEqual({ ...r.full.ok, file: path.basename(r.full.ok.file) }, { file: 'full.mp4', width: 1080, height: 1920, fps: 30, video: 'High', audio: r.full.ok.audio, priming: r.full.ok.priming, frames: 150, audioChunks: r.full.ok.audioChunks });
    assert.equal(r.full.progress, 1);
    assert.ok(r.full.ms < 15000, `150 frames in ${r.full.ms} ms (5 s of video: well inside 3x real time)`);
    assert.deepEqual([r.full.windows, r.full.files], [0, ['full.mp4']]);
    const ended = { cancel: 'cancelled', crash: /^the render page stopped \((killed|crashed)\)$/, stall: "frame 5 wasn't drawn within 1.5 s", pagefail: "the page couldn't draw the take: no song", busy: 'a perfect copy is already being made' };
    for (const [name, words] of Object.entries(ended)) {
      if (words instanceof RegExp) assert.match(r[name].error, words, name); else assert.equal(r[name].error, words, name);
      assert.deepEqual([r[name].windows, r[name].files], [0, []], `${name}: no window and no file left`);
    }
    assert.equal(r.busy.first, 'the user stopped it', 'cancel(why) ends the render that was running, in those words');
    assert.equal(r.odd.error, undefined, r.odd.error);
    assert.deepEqual([r.odd.ok.width, r.odd.ok.height, r.odd.windows], [540, 960, 0], 'an odd size (541 x 960 at 1): drawn at the even size just below, offscreen at its size on any screen');
    if (!ffmpeg || !ffprobe) return; // (the file's insides need ffmpeg to read)
    const file = path.join(dir, 'full.mp4');
    const pts = JSON.parse(spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v', '-show_frames', '-show_entries', 'frame=pts_time', '-of', 'json', file], { encoding: 'utf8' }).stdout).frames.map((f) => +f.pts_time);
    assert.equal(pts.length, 150);
    const marks = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', 'crop=512:32:0:0,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 }).stdout;
    const wrong = [];
    for (let k = 0; k < 150; k++) {
      let n = 0;
      for (let i = 0; i < 16; i++) n = n * 2 + (marks[k * 512 * 32 + 16 * 512 + 32 * i + 16] > 128 ? 1 : 0);
      if (n !== k) wrong.push([k, n]);
    }
    assert.deepEqual(wrong, [], 'every frame in the file is the one asked for');
    const luma = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', 'scale=16:16,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 }).stdout;
    const flashes = [];
    for (let k = 0; k < 150; k++) { let s = 0; for (let i = 0; i < 256; i++) s += luma[k * 256 + i]; if (s / 256 > 200) flashes.push(k); }
    const kicks = Array.from({ length: 9 }, (_, i) => 15 * (i + 1));
    assert.deepEqual(flashes, kicks, 'the flashes on their frames');
    const pcm = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 26 }).stdout;
    const sound = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
    const click = Float32Array.from({ length: 96 }, (_, i) => 0.8 * Math.sin((2 * Math.PI * 3000 * i) / 48000) * Math.sin((Math.PI * i) / 96) ** 2);
    for (const k of kicks) {
      const want = Math.round((k / 30) * 48000);
      let best = 0, at = -1;
      for (let i = want - 2880; i <= want + 2880; i++) { let s = 0; for (let j = 0; j < 96; j++) s += sound[i + j] * click[j]; if (s > best) { best = s; at = i; } }
      assert.ok(Math.abs(((at - want) / 48000) * 1000) < 1, `the click at frame ${k} is ${(((at - want) / 48000) * 1000).toFixed(3)} ms off its flash`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
