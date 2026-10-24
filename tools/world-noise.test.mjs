import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blueNoise } from '../renderer/worldlooks.js';
import { WORLD_NOISE } from '../renderer/world-noise.js';

test('the shipped worlds thresholds are exactly the seeded generator output', () => {
  assert.equal(WORLD_NOISE.length, 4096);
  assert.deepEqual(WORLD_NOISE, blueNoise(64, 5));
});
