// The export's tune, the page's side (renderer/tune.js): which songs get one, the stretch of sound asked for, the notes put back
// on the engine's clock, the worker let go whatever happens (and at once when it says it's on the processor, which would take
// minutes a song), and the export going on without a tune when there's none, saying why. The worker here is a stand-in; the real
// one is run in tune-real.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tuneFor, withTune } from '../renderer/tune.js';

const song = (o = {}) => ({ bpm: 120, origin: 100, bars: Array.from({ length: 4 }, () => ({ parts: {}, events: [] })), ...o });
// an ear that hands back `seconds` of sound starting at engine time t0, and notes what it was asked for
const ear = (seconds = 10, t0 = 99) => ({ asked: null, async hear(a, b) { this.asked = [a, b]; return { audio: new Float32Array(Math.round(seconds * 22050)), t0 }; } });

// a stand-in for the worker: answers a posted sound with `script` (a list of messages), noting whether it was let go
function fakeWorker(script) {
  const made = [];
  globalThis.Worker = class {
    constructor(url, opts) { this.url = String(url); this.opts = opts; this.terminated = false; made.push(this); }
    postMessage(msg) { this.got = msg; queueMicrotask(() => { for (const m of script) { if (this.terminated) break; this.onmessage?.({ data: m }); } }); }
    terminate() { this.terminated = true; }
  };
  return made;
}

test('a song with no tempo line, or nothing kept to hear, gets no tune and says why', async () => {
  assert.match((await tuneFor(song({ origin: undefined }), ear())).why, /tempo line/);
  assert.match((await tuneFor(null, ear())).why, /tempo line/);
  assert.match((await tuneFor(song(), null)).why, /nothing was kept/);
  assert.match((await tuneFor(song(), { hear: async () => null })).why, /nothing was kept/);
  assert.match((await tuneFor(song(), { hear: async () => { throw Error('the ear broke'); } })).why, /the ear broke/);
});

test('the stretch asked for is the song with a second either side; the notes come back on the engine clock; the worker is let go', async () => {
  const made = fakeWorker([{ type: 'ready', backend: 'webgl' }, { type: 'progress', done: 0.5 }, { type: 'notes', notes: [[1.5, 0.25, 64, 0.6]], backend: 'webgl', ms: 12 }]);
  const e = ear(10, 99), seen = [];
  const got = await tuneFor(song(), e, (d) => seen.push(d));
  assert.deepEqual(e.asked, [99, 100 + 4 * 2 + 1], 'from a second before bar 0 to a second after the last bar');
  assert.deepEqual(got.notes, [[100.5, 0.25, 64, 0.6]], 'a note 1.5 s into the sound is at engine time 99 + 1.5');
  assert.deepEqual(seen, [0.5]);
  assert.equal(got.backend, 'webgl');
  assert.ok(made[0].terminated, 'the worker let go');
  assert.equal(made[0].opts.type, 'module');
  assert.ok(made[0].got.audio instanceof Float32Array);
});

test('on the processor the worker is let go at once and the export goes on without a tune', async () => {
  const made = fakeWorker([{ type: 'ready', backend: 'cpu' }, { type: 'notes', notes: [[0, 1, 60, 1]] }]);
  const got = await tuneFor(song(), ear());
  assert.equal(got.notes, null);
  assert.match(got.why, /graphics card/);
  assert.ok(made[0].terminated);
});

test('an error in the worker comes back as the reason, and the worker is let go', async () => {
  const made = fakeWorker([{ type: 'ready', backend: 'webgl' }, { type: 'error', error: 'out of memory' }]);
  const got = await tuneFor(song(), ear());
  assert.equal(got.notes, null);
  assert.equal(got.why, 'out of memory');
  assert.ok(made[0].terminated);
});

test('less than a second kept: no tune', async () => {
  fakeWorker([]);
  assert.match((await tuneFor(song(), ear(0.5))).why, /nothing was kept/);
});

test('withTune writes the line as the lead; no notes, the song as it was', () => {
  const s = song({ bars: [{ parts: {}, events: [{ part: 'lead', pitch: 50, onset: 0, duration: 0.25, velocity: 90 }] }] });
  assert.equal(withTune(s, null), s);
  assert.equal(withTune(s, []), s);
  const out = withTune(s, [[100.5, 0.25, 67, 0.6]]); // (bar 0 starts at 100; 0.5 s in is a quarter of the bar)
  assert.deepEqual(out.bars[0].events.filter((e) => e.part === 'lead').map((e) => [e.pitch, e.onset]), [[67, 0.25]]);
});

test('the tune (the path through the frames) comes back on the engine clock and is what withTune writes; the notes still fill the bass', async () => {
  fakeWorker([{ type: 'ready', backend: 'webgl' }, { type: 'notes', notes: [[1.5, 0.25, 64, 0.6], [2.0, 0.5, 40, 0.6]], line: [[2.0, 0.25, 71]], backend: 'webgl', ms: 1 }]);
  const s = song(), got = await tuneFor(s, ear(10, 99));
  assert.deepEqual(got.line, [[101, 0.25, 71]]);
  const out = withTune(s, got.notes, got.line);
  assert.deepEqual(out.bars[0].events.filter((x) => x.part === 'lead').map((x) => [x.pitch, x.onset]), [[71, 0.5]], 'the line, not the notes\' top line');
  assert.deepEqual(out.bars[0].events.filter((x) => x.part === 'bass').map((x) => [x.pitch, x.onset]), [[40, 0.5]], 'the low note in the bass\'s rest');
  assert.deepEqual(withTune(s, got.notes, []).bars[0].events.filter((x) => x.part === 'lead').map((x) => x.pitch), [64], 'an empty line: the notes\' top line, as before');
});

test('with no fitted tempo line, the last tempo\'s line (originLast) places the tune', async () => {
  fakeWorker([{ type: 'ready', backend: 'webgl' }, { type: 'notes', notes: [[1.5, 0.25, 64, 0.6]], backend: 'webgl', ms: 1 }]);
  const s = song({ origin: undefined, originLast: 100 }), e = ear(10, 99);
  const got = await tuneFor(s, e);
  assert.deepEqual(e.asked, [99, 109]);
  assert.deepEqual(withTune(s, got.notes).bars[0].events.map((x) => [x.pitch, x.onset]), [[64, 0.25]]);
});

test('the ear is made only where X can save a song: not in a browser, the handheld\'s window or a take', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  const line = app.split('\n').find((l) => l.includes('createEar(ac, clock)'));
  assert.ok(line, 'the ear is made in app.js');
  for (const guard of ['!TAKE', '!WIDGET', 'window.nc?.saveSong']) assert.ok(line.includes(guard), `guarded by ${guard}`);
});

// ---------------------------------------------------------------- the tune from the voice alone (stems.js, voice.js; Nov 12)
// a "singer": sine notes with rests between them, at 22050 Hz, starting `lead` seconds in
function sung(notes, lead = 0.5, total = 6) {
  const x = new Float32Array(Math.round(total * 22050));
  let t = lead;
  for (const [midi, len, rest] of notes) {
    const hz = 440 * 2 ** ((midi - 69) / 12), a = Math.round(t * 22050), n = Math.round(len * 22050);
    for (let i = 0; i < n && a + i < x.length; i++) x[a + i] = 0.5 * Math.sin(2 * Math.PI * hz * i / 22050) * Math.min(1, i / 200, (n - i) / 200);
    t += len + rest;
  }
  return x;
}
const VOICE = [[69, 0.5, 0.3], [72, 0.5, 0.3], [76, 0.5, 0.3], [72, 0.5, 0.3], [69, 0.8, 0.3]];
const mixAnswer = [{ type: 'ready', backend: 'webgl' }, { type: 'notes', notes: [[1.5, 0.25, 40, 0.6]], line: [[2, 0.5, 60]], backend: 'webgl', ms: 12 }];

test('with the voice splitter there, the tune is the voice\'s own notes, on the engine clock; the mix\'s notes still come back for the bass', async () => {
  fakeWorker(mixAnswer);
  const seen = [], handed = [];
  const split = async (audio, { rate, onProgress }) => { handed.push([audio.length, rate]); onProgress(1); return { vocals: sung(VOICE, 1.5), backend: 'webgpu', ms: 900 }; };
  const got = await tuneFor(song(), ear(10, 99), () => {}, { split, onVoice: (d) => seen.push(d) });
  assert.equal(got.from, 'voice');
  assert.deepEqual(got.line.map(([, , m]) => m), [69, 72, 76, 72, 69], 'one note for each sung note, nothing in her rests');
  assert.ok(Math.abs(got.line[0][0] - 100.5) < 0.05 && Math.abs(got.line[0][1] - 0.5) < 0.08, 'her first note, 1.5 s into the sound, is at engine time 99 + 1.5: ' + got.line[0]);
  assert.deepEqual(got.notes, [[100.5, 0.25, 40, 0.6]], 'the notes from the mix are still there (the bass\'s rests are filled from them)');
  assert.deepEqual(handed, [[220500, 22050]], 'the splitter is handed the whole stretch, at the ear\'s rate');
  assert.deepEqual(seen, [1]);
  assert.equal(got.voice.backend, 'webgpu');
  const out = withTune(song(), got.notes, got.line);
  assert.deepEqual(out.bars.flatMap((b) => b.events.filter((e) => e.part === 'lead').map((e) => e.pitch)).slice(0, 5), [69, 72, 76, 72, 69], 'and it is what withTune writes as the lead');
});

test('no voice splitter (not installed, or it failed): the tune read from the mix stands, and the reason is kept', async () => {
  for (const answer of [{ vocals: null, absent: true, why: 'the voice splitter is not installed' }, { vocals: null, why: 'the graphics card gave up' }, null]) {
    fakeWorker(mixAnswer);
    const got = await tuneFor(song(), ear(10, 99), () => {}, { split: async () => answer });
    assert.equal(got.from, 'mix');
    assert.deepEqual(got.line, [[101, 0.5, 60]]);
    assert.ok(got.voice.why);
  }
  fakeWorker(mixAnswer);
  const thrown = await tuneFor(song(), ear(10, 99), () => {}, { split: async () => { throw Error('boom'); } });
  assert.equal(thrown.from, 'mix');
  assert.match(thrown.voice.why, /boom/);
});

test('a stretch with hardly any singing in it (an instrumental) keeps the mix\'s tune', async () => {
  fakeWorker(mixAnswer);
  const got = await tuneFor(song(), ear(10, 99), () => {}, { split: async () => ({ vocals: sung(VOICE.slice(0, 2)), backend: 'webgpu', ms: 5 }) });
  assert.equal(got.from, 'mix');
  assert.match(got.voice.why, /hardly any singing/);
});

test('the voice alone gives a tune even when the notes\' worker has none (the graphics card not there for it)', async () => {
  fakeWorker([{ type: 'ready', backend: 'cpu' }]);
  const got = await tuneFor(song(), ear(10, 99), () => {}, { split: async () => ({ vocals: sung(VOICE), backend: 'wasm', ms: 5 }) });
  assert.equal(got.from, 'voice');
  assert.equal(got.line.length, 5);
  assert.deepEqual(got.notes, []);
});

test('the splitter\'s worker (stems.js): the voice comes back with what ran it, absent and errors come back in words, and the worker is let go each time', async () => {
  const { splitVoice } = await import('../renderer/stems.js');
  const voice = new Float32Array(100).fill(0.25);
  let made = fakeWorker([{ type: 'ready', backend: 'webgpu', threads: 8 }, { type: 'progress', done: 0.5 }, { type: 'vocals', audio: voice, backend: 'webgpu', threads: 8, ms: 40, loadMs: 10, segments: 1 }]);
  const seen = [];
  const got = await splitVoice(new Float32Array(100), { onProgress: (d) => seen.push(d) });
  assert.equal(got.vocals, voice);
  assert.equal(got.backend, 'webgpu');
  assert.deepEqual(seen, [0.5]);
  assert.match(made[0].url, /stems-worker\.js$/);
  assert.equal(made[0].opts.type, 'module');
  assert.equal(made[0].got.rate, 22050);
  assert.ok(made[0].terminated);
  made = fakeWorker([{ type: 'absent', why: 'the voice splitter is not installed' }]);
  const none = await splitVoice(new Float32Array(100));
  assert.deepEqual([none.vocals, none.absent, none.why], [null, true, 'the voice splitter is not installed']);
  assert.ok(made[0].terminated);
  made = fakeWorker([{ type: 'error', error: 'out of memory' }]);
  assert.match((await splitVoice(new Float32Array(100))).why, /out of memory/);
  assert.ok(made[0].terminated);
});

test('the splitter\'s arithmetic (stems.js): the rate doubled and halved keeps the sound, the segments cover the whole stretch with no idle last one, the cross-fade never reaches 0', async () => {
  const { up2, down2, segmentStarts, fadeWeight } = await import('../renderer/stems.js');
  const x = Float32Array.from({ length: 2205 }, (_, i) => Math.sin(2 * Math.PI * 220 * i / 22050));
  const y = up2(x), back = down2(y);
  assert.equal(y.length, 4410); assert.equal(back.length, 2205);
  assert.deepEqual([y[0], y[2], y[4]], [x[0], x[1], x[2]], 'every other sample is the recording\'s own');
  assert.ok(Math.abs(y[1] - (x[0] + x[1]) / 2) < 1e-7);
  let worst = 0; for (let i = 0; i < 2204; i++) worst = Math.max(worst, Math.abs(back[i] - x[i]));
  assert.ok(worst < 0.02, 'a 220 Hz tone comes back within 2%: ' + worst);
  const SEG = 343980, stride = Math.floor(SEG * 0.75), lap = SEG - stride;
  assert.deepEqual(segmentStarts(1000, SEG), [0], 'a stretch shorter than a segment is one segment');
  const total = 30 * 44100, starts = segmentStarts(total, SEG);
  assert.deepEqual(starts, [0, stride, 2 * stride, 3 * stride, 4 * stride], '30 s is five segments (the wrapper\'s own loop ran a sixth over the last 0.75 s, already covered)');
  assert.ok(starts.at(-1) + SEG >= total, 'the last one reaches the end');
  for (const n of [SEG, SEG + 1, SEG + lap, SEG + lap + 1, 10 * stride + 17]) {
    const st = segmentStarts(n, SEG);
    assert.ok(st.at(-1) + SEG >= n && (st.length === 1 || st.at(-1) + lap < n), `covered, and no idle last segment, at ${n}`);
    for (let k = 1; k < st.length; k++) assert.equal(st[k] - st[k - 1], stride);
  }
  assert.ok(fadeWeight(0, SEG, stride) > 0 && fadeWeight(SEG - 1, SEG, stride) > 0);
  assert.equal(fadeWeight(SEG / 2, SEG, stride), 1);
  assert.ok(Math.abs(fadeWeight(stride / 4, SEG, stride) - 0.5) < 1e-3, 'half way up the fade in');
});

test('with a side from the ear, the splitter is given left and right again (the middle plus and minus the side); without one, the one channel', async () => {
  const { voiceTune } = await import('../renderer/tune.js');
  const mid = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10)), side = Float32Array.from({ length: 1000 }, (_, i) => 0.1 * Math.cos(i / 7));
  const seen = [];
  const split = async (audio, opts) => { seen.push({ audio, right: opts.right, rate: opts.rate }); return { vocals: sung(VOICE), backend: 'webgpu', ms: 1 }; };
  const got = await voiceTune(mid, () => {}, split, side);
  assert.equal(got.line.length, 5);
  assert.ok(Math.abs(seen[0].audio[123] - (mid[123] + side[123])) < 1e-7 && Math.abs(seen[0].right[123] - (mid[123] - side[123])) < 1e-7);
  assert.equal(seen[0].rate, 22050);
  await voiceTune(mid, () => {}, split);
  assert.equal(seen[1].audio, mid); assert.equal(seen[1].right, null);
  await voiceTune(mid, () => {}, split, new Float32Array(10));
  assert.equal(seen[2].right, null, 'a side of another length is not used');
  fakeWorker(mixAnswer);
  const e = { async hear() { return { audio: new Float32Array(220500), side: new Float32Array(220500).fill(0.01), t0: 99 }; } };
  const whole = await tuneFor(song(), e, () => {}, { split });
  assert.equal(whole.from, 'voice');
  assert.ok(seen.at(-1).right && Math.abs(seen.at(-1).audio[5] - 0.01) < 1e-7 && Math.abs(seen.at(-1).right[5] + 0.01) < 1e-7, 'and tuneFor hands the ear\'s side on');
});
