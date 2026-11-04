import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchF1, correlateEnvelopes } from './exportbench.mjs';

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
