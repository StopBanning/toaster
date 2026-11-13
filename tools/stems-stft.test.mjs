// The spectrograms the voice splitter's model takes and gives (renderer/stems-stft.js): our own transform, the model's framing
// (4096 points every 1024, a periodic Hann window, normalised, the padding and the bins and frames it leaves out), and the way
// back. Checked here on sounds whose answer is known; against the model itself in tools/stems-check.cjs (not in the suite: the
// model is not in the repo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fft4096, ifft4096, modelInput, partWave, SEG, NFFT, HOP, BINS, FRAMES } from '../renderer/stems-stft.js';

const SR = 44100, tone = (bin, amp = 0.5, n = SEG) => Float32Array.from({ length: n }, (_, i) => amp * Math.cos(2 * Math.PI * bin * i / NFFT));
const size = BINS * FRAMES, at = (ch, bin, frame) => ch * size + bin * FRAMES + frame;

test('the transform: a tone on bin 100 is all in bin 100 (and its mirror), and there and back is the frame again', () => {
  const frame = Float64Array.from({ length: NFFT }, (_, i) => Math.cos(2 * Math.PI * 100 * i / NFFT) + 0.25 * Math.sin(2 * Math.PI * 7 * i / NFFT));
  const { re, im } = fft4096(frame);
  assert.ok(Math.abs(re[100] - NFFT / 2) < 1e-6 && Math.abs(im[100]) < 1e-6 && Math.abs(re[NFFT - 100] - NFFT / 2) < 1e-6);
  assert.ok(Math.abs(im[7] + 0.25 * NFFT / 2) < 1e-6, 'a sine is in the imaginary part, negative');
  let stray = 0; for (let k = 0; k < NFFT; k++) if (![7, 100, NFFT - 7, NFFT - 100].includes(k)) stray = Math.max(stray, Math.hypot(re[k], im[k]));
  assert.ok(stray < 1e-6, 'nothing anywhere else: ' + stray);
  const back = ifft4096(re, im);
  let worst = 0; for (let i = 0; i < NFFT; i++) worst = Math.max(worst, Math.abs(back.re[i] - frame[i]), Math.abs(back.im[i]));
  assert.ok(worst < 1e-9);
});

test('the model\'s input: 2 channels of waveform, 4 planes of 2048 bins by 336 frames; a tone sits in its bin at the size the normalised Hann window gives it', () => {
  assert.deepEqual([SEG, NFFT, HOP, BINS, FRAMES], [343980, 4096, 1024, 2048, 336]);
  const L = tone(100, 0.5), R = tone(300, 0.25);
  const { waveform, magSpec } = modelInput(L, R);
  assert.equal(waveform.length, 2 * SEG); assert.equal(magSpec.length, 4 * size);
  assert.equal(waveform[5], L[5]); assert.equal(waveform[SEG + 5], R[5]);
  // amplitude A on a bin: A * N/4 after the window, over sqrt(N): 0.5 * 4096 / 4 / 64 = 8, and 4 for the right's 0.25
  for (const f of [1, 100, 300]) {   // (not the last frames: there the window runs into the padding, the tone folded back on itself)
    assert.ok(Math.abs(Math.hypot(magSpec[at(0, 100, f)], magSpec[at(1, 100, f)]) - 8) < 0.02, `left, frame ${f}`);
    assert.ok(Math.abs(Math.hypot(magSpec[at(2, 300, f)], magSpec[at(3, 300, f)]) - 4) < 0.02, `right, frame ${f}`);
    assert.ok(Math.hypot(magSpec[at(0, 300, f)], magSpec[at(1, 300, f)]) < 0.01, 'and the left has nothing of the right\'s tone');
  }
});

test('where a sound falls in time: a click 100 hops in is loudest in frame 100 (the frames are centred, and the first two are left out with the padding)', () => {
  // (frame f is centred on sample (f + 2) * 1024 - 1536 of the segment: f * 1024 + 512)
  const y = new Float32Array(SEG); y[100 * HOP + 512] = 1;
  const { magSpec } = modelInput(y);
  const energy = (f) => { let e = 0; for (let b = 0; b < BINS; b += 16) e += magSpec[at(0, b, f)] ** 2 + magSpec[at(1, b, f)] ** 2; return e; };
  const best = Array.from({ length: FRAMES }, (_, f) => energy(f)).reduce((m, e, f, all) => (e > all[m] ? f : m), 0);
  assert.equal(best, 100);
  assert.ok(energy(90) < 1e-9 && energy(110) < 1e-9, 'and it is in no frame whose window does not reach it');
});

test('one channel given for both: the right\'s planes are the left\'s', () => {
  const { magSpec } = modelInput(tone(50, 0.3));
  for (const i of [0, 12345, size - 1, size, size + 999, 2 * size - 1]) assert.equal(magSpec[2 * size + i], magSpec[i]);
});

test('there and back: a sound\'s own spectrogram, turned back as a part, is the sound (mono: the mean of its two channels), but for its first and last 2,000 samples', () => {
  const L = Float32Array.from({ length: SEG }, (_, i) => 0.4 * Math.sin(2 * Math.PI * 220 * i / SR) + 0.2 * Math.sin(2 * Math.PI * 3520 * i / SR + 1));
  const R = Float32Array.from({ length: SEG }, (_, i) => 0.3 * Math.sin(2 * Math.PI * 330 * i / SR));
  const answer = new Float32Array(16 * size);
  answer.set(modelInput(L, R).magSpec, 3 * 4 * size);        // (as the model's fourth part, the vocals)
  const back = partWave(answer, 3);
  assert.equal(back.length, SEG);
  // (the ends lean on the two frames the model leaves out at each side, so they come back short: the model's waveform half
  // covers them, and the worker cross-fades segments over far more than this)
  let worst = 0; for (let i = 2000; i < SEG - 2000; i++) worst = Math.max(worst, Math.abs(back[i] - (L[i] + R[i]) / 2));
  assert.ok(worst < 1e-4, 'worst sample off by ' + worst);
  let edge = 0; for (let i = 0; i < 2000; i++) edge = Math.max(edge, Math.abs(back[i] - (L[i] + R[i]) / 2));
  assert.ok(edge > 0.01 && edge < 1, 'and the very start is not exact: ' + edge);
  assert.ok(partWave(answer, 0).every((v) => v === 0), 'a part the answer has nothing for is silence');
  const short = partWave(answer, 3, 1000);
  assert.equal(short.length, 1000); assert.ok(Math.abs(short[999] - back[999]) < 1e-9, 'a shorter length is the same sound, cut');
});

test('a part whose two channels cancel is silence: the mean is taken before the way back', () => {
  const x = tone(64, 0.5), minus = x.map((v) => -v), answer = new Float32Array(16 * size);
  answer.set(modelInput(x, minus).magSpec, 0);
  assert.ok(partWave(answer, 0).every((v) => Math.abs(v) < 1e-6));
});
