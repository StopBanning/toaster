// The tune read from the voice alone (renderer/voice.js): YIN's pitch, the notes cut from it, the octave slip folded back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yin, voicePitch, voiceNotes, foldOctaves, voiceLine } from '../renderer/voice.js';

const SR = 22050, hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// a sung-like tone: a fundamental and two overtones, with a little vibrato
function sing(parts) {   // parts: [[seconds, midi or null]]
  const out = [];
  let phase = 0, t = 0;
  for (const [secs, midi] of parts) {
    for (let i = 0; i < Math.round(secs * SR); i++, t += 1 / SR) {
      if (midi == null) { out.push(0); continue; }
      phase += 2 * Math.PI * hz(midi + 0.15 * Math.sin(2 * Math.PI * 5.5 * t)) / SR;
      out.push(0.5 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase));
    }
  }
  return Float32Array.from(out);
}

test('YIN reads a steady tone to within a few cents, and nothing in silence or noise', () => {
  const W = 1024;
  for (const midi of [45, 57, 64, 76]) {
    const x = sing([[0.2, midi]]), got = yin(x, 1000, W, SR);
    assert.ok(Math.abs(12 * Math.log2(got / hz(midi))) < 0.3, `midi ${midi}: ${got} Hz`);
  }
  assert.equal(yin(new Float32Array(4000), 1000, W, SR), null);
  let seed = 7; const noise = Float32Array.from({ length: 4000 }, () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 1073741824) - 1);
  assert.equal(yin(noise, 1000, W, SR), null);
});

test('a sung line comes out as its notes, with the rests left as rests', () => {
  const x = sing([[0.3, null], [0.5, 65], [0.25, null], [0.4, 64], [0.4, 65], [0.5, null], [0.6, 60]]);
  const line = voiceLine(x, SR);
  assert.deepEqual(line.map((n) => n[2]), [65, 64, 65, 60]);
  const starts = [0.3, 1.05, 1.45, 2.35], lengths = [0.5, 0.4, 0.4, 0.6];
  line.forEach(([t, d], i) => { assert.ok(Math.abs(t - starts[i]) < 0.06, `start ${i}: ${t}`); assert.ok(Math.abs(d - lengths[i]) < 0.09, `length ${i}: ${d}`); });
  const { f0, hop } = voicePitch(x, SR);
  const at = (s) => f0[Math.round(s / hop)];
  assert.equal(at(0.1), null); assert.equal(at(0.95), null); assert.equal(at(2.0), null);   // (the rests)
});

test('a blip shorter than 60 ms is no note, and a quiet leftover under the gate is silence', () => {
  assert.deepEqual(voiceNotes({ hop: 0.01, f0: [60, 60, 60, 60, null, null, 62, 62, 62, 62, 62, 62, 62, null] }), [[0.06, 0.07, 62]]);
  const loud = sing([[0.5, 67]]), quiet = sing([[0.5, 60]]).map((v) => v * 0.05);
  const x = new Float32Array(loud.length + quiet.length); x.set(loud); x.set(quiet, loud.length);
  assert.deepEqual(voiceLine(x, SR).map((n) => n[2]), [67]);
});

test('a short note an octave off the notes around it is folded back; a long one and a real leap are left', () => {
  const line = [[0, 0.3, 65], [0.4, 0.3, 64], [0.8, 0.12, 77], [1.0, 0.3, 65], [1.4, 0.3, 62]];
  assert.deepEqual(foldOctaves(line).map((n) => n[2]), [65, 64, 65, 65, 62]);
  const held = line.map((n) => [...n]); held[2][1] = 0.6;                        // (held that long, it is a sung octave)
  assert.deepEqual(foldOctaves(held).map((n) => n[2]), [65, 64, 77, 65, 62]);
  const leap = [[0, 0.3, 60], [0.4, 0.3, 60], [0.8, 0.12, 67], [1.0, 0.3, 60], [1.4, 0.3, 60]];   // (a fifth up is a tune)
  assert.deepEqual(foldOctaves(leap).map((n) => n[2]), [60, 60, 67, 60, 60]);
});

test('the same reading at 44.1 kHz gives the same notes', () => {
  const up = (x) => { const y = new Float32Array(x.length * 2); for (let i = 0; i < x.length; i++) { y[2 * i] = x[i]; y[2 * i + 1] = (x[i] + (x[i + 1] ?? x[i])) / 2; } return y; };
  const x = sing([[0.2, null], [0.5, 62], [0.2, null], [0.5, 69]]);
  assert.deepEqual(voiceLine(up(x), 44100).map((n) => n[2]), voiceLine(x, SR).map((n) => n[2]));
});

test('stray notes go: a short note with nothing within 2 s of it is not singing; a phrase, and a long note alone, stay', async () => {
  const { dropStrays } = await import('../renderer/voice.js');
  // a stretch nobody sings in, as the splitter leaves it (Time Back's 30 s): four blips, seconds apart
  assert.deepEqual(dropStrays([[10.317, 0.06, 45], [15.475, 0.07, 45], [18.897, 0.11, 45], [27.218, 0.08, 44]]), []);
  // a phrase: each note has a neighbour; then a blip 3 s later goes, and a held note by itself stays
  const phrase = [[1, 0.2, 60], [1.4, 0.2, 62], [1.8, 0.25, 64]];
  assert.deepEqual(dropStrays([...phrase, [5.1, 0.1, 70], [9, 0.5, 67]]), [...phrase, [9, 0.5, 67]]);
  // two short notes within 2 s of each other keep each other
  assert.equal(dropStrays([[1, 0.1, 60], [2.9, 0.1, 62]]).length, 2);
  assert.equal(dropStrays([[1, 0.1, 60], [3.3, 0.1, 62]]).length, 0);
  assert.deepEqual(dropStrays([]), []);
});
