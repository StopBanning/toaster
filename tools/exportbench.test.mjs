import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchF1, correlateEnvelopes, drumThreeWays } from './exportbench.mjs';

test('export drums match within 35 ms, once per reference onset', () => {
  assert.equal(matchF1([1.034], [1]), 1);
  assert.equal(matchF1([1.036], [1]), 0);
  assert.equal(matchF1([1, 1.01], [1]), 2 / 3);
  assert.equal(matchF1([], [1]), 0);
  assert.equal(matchF1([], []), null);
});

test('export envelope finds a single shift up to half a bar', () => {
  // An irregular envelope avoids a periodic pulse making the wrong lag look right.
  const source = Float32Array.from({length: 1000}, (_, i) => i % 47 === 0 ? 1 : i % 31 === 0 ? 0.3 : 0);
  const shifted = new Float32Array(1200);
  shifted.set(source, 140); // origin 2 seconds plus 0.8 seconds; half a bar at 120 BPM is 1 second.
  assert.ok(correlateEnvelopes(source, shifted, 2, 120) > 0.999);
  assert.ok(correlateEnvelopes(source, shifted, 2, 240) < 0.9);
});

test('an empty or constant envelope has no correlation score', () => {
  assert.equal(correlateEnvelopes([], [], 0, 120), null);
  assert.equal(correlateEnvelopes(new Float32Array(200), new Float32Array(200), 0, 120), null);
});

// The kick and the clap three ways (B2): as exported, on the best single tempo, with each bar slid into place.
// A made-up song: 80 bars of four-on-the-floor at exactly 120 (a bar every 2 s), heard from 0 to 160 s.
const four = (bars) => Array.from({ length: bars * 4 }, (_, i) => i / 4);
const real = four(80).map((c) => c * 2);
const heard = { bars: 80, from: 0, to: 160 };

test('a right pattern on a tempo 0.05% off: poor as exported, right on the best tempo', () => {
  const barSec = 2 * 1.0005, r = drumThreeWays(four(80), real, { ...heard, origin: 160 - 80 * barSec, barSec });
  assert.ok(r.a < 0.75, 'as exported ' + r.a); // (the grid is right at the end and 80 ms early at the start)
  assert.ok(r.fit > 0.99, 'best tempo ' + r.fit);
  assert.ok(r.pat > 0.99, 'pattern ' + r.pat);
  assert.ok(Math.abs(r.bpmFit - 120) < Math.abs(240 / barSec - 120) / 2, 'the tempo it found ' + r.bpmFit); // (nearer the real one)
});

test('a wrong pattern on the right tempo: low all three ways', () => {
  const sixteenths = Array.from({ length: 80 * 16 }, (_, i) => i / 16); // (a hit on every 16th where the song has four)
  const r = drumThreeWays(sixteenths, real, { ...heard, origin: 0, barSec: 2 });
  for (const way of ['a', 'fit', 'pat']) assert.ok(Math.abs(r[way] - 0.4) < 0.01, way + ' ' + r[way]); // (4 right of 16 + 4)
});

test('a right pattern whose bars wander by up to 110 ms: only the per-bar slide scores it right', () => {
  const off = [0, 0.055, 0.11]; // (bar by bar: on time, late, later: no one grid is within 35 ms of all three)
  const wander = four(80).map((c) => c + off[Math.floor(c) % 3] / 2);
  const r = drumThreeWays(wander, real, { ...heard, origin: 0, barSec: 2 });
  assert.ok(r.fit > 0.6 && r.fit < 0.72, 'best tempo ' + r.fit);
  assert.ok(r.pat > 0.99, 'pattern ' + r.pat);
});

test('no real hits to score against: no score; no exported hits: zero', () => {
  assert.deepEqual(drumThreeWays([0], [], { ...heard, origin: 0, barSec: 2 }), { a: null, fit: null, pat: null });
  assert.deepEqual(drumThreeWays([], real, { ...heard, origin: 0, barSec: 2 }), { a: 0, fit: 0, pat: 0 });
});
