import { test } from 'node:test';
import assert from 'node:assert/strict';
import { match, onsets, notes, tempo, intervals, macro, confusion } from './event-score.mjs';
test('one-to-one assignment needs augmenting paths, duplicate predictions cannot inflate recall', () => {
  assert.equal(match([0, 1], [0, 1], (r, p) => r === 0 || p === 0).length, 2);
  assert.equal(onsets([{ start: 1 }], [{ start: 1 }, { start: 1.01 }]).precision, .5);
  assert.equal(onsets([{ start: 1 }], [{ start: 1.04 }], .025).f1, 0);
  assert.equal(onsets([{ start: 1 }], [{ start: 1.04 }], .05).f1, 1);
  assert.equal(onsets([], []).f1, null);
});
test('matching cardinality agrees with exhaustive enumeration on every 3x3 graph', () => {
  for (let mask = 0; mask < 512; mask++) {
    const accept = (i, j) => !!(mask & (1 << (3 * i + j)));
    const brute = (i, used) => i === 3 ? 0 : Math.max(brute(i + 1, used),
      ...[0, 1, 2].filter((j) => !(used & (1 << j)) && accept(i, j)).map((j) => 1 + brute(i + 1, used | (1 << j))));
    assert.equal(match([0, 1, 2], [0, 1, 2], accept).length, brute(0, 0));
  }
});
test('confusion preserves simultaneous correct classes before cross-class residual matching', () => {
  const s = confusion({ bd: [{ start: 1 }], sd: [{ start: 1 }, { start: 2 }] },
    { bd: [{ start: 1 }], sd: [{ start: 1 }], hhc: [{ start: 2 }] });
  assert.deepEqual(s.cells, { 'bd -> bd': 1, 'sd -> sd': 1, 'sd -> hhc': 1 });
  assert.equal(s.missed, 0); assert.equal(s.extra, 0);
});
test('octave, offset and pitch class errors score separately', () => {
  const s = notes([{ start: 0, end: 1, midi: 36 }], [{ start: 0, end: .2, midi: 48 }]);
  assert.equal(s.onset.f1, 1); assert.equal(s.exact.f1, 0); assert.equal(s.pitchClass.f1, 1);
  assert.equal(notes([{ start: 0, end: 1, midi: 36 }], [{ start: 0, end: .2, midi: 36 }]).offset.f1, 0);
  assert.equal(notes([{ start: 0 }], [{ start: 0 }]).exact.f1, 0);
});
test('absolute downbeats do not get best rotation; half/double lock and first lock independent', () => {
  assert.equal(onsets([0, 2, 4].map((start) => ({ start })), [1, 3, 5].map((start) => ({ start }))).f1, 0);
  const t = tempo([{ start: 0, bpm: 120 }], [{ start: 1, bpm: 60, locked: true },
    { start: 2, bpm: 240, locked: true }, { start: 3, bpm: 120, locked: true }], 4);
  assert.equal(t.exact, .25); assert.equal(t.half, .25); assert.equal(t.double, .25); assert.equal(t.firstLock, 1);
});
test('interval weighting includes explicit no-chord and penalizes unknown instead of calling it rest', () => {
  const ref = [{ start: 0, end: 1, label: 'C' }, { start: 1, end: 4, label: null }];
  const pred = [{ start: 0, end: 2, label: null }, { start: 2, end: 4, label: 'unknown' }];
  const s = intervals(ref, pred, 4);
  assert.equal(s.accuracy, .25); assert.equal(s.noChordPrecision, .5);
  assert.deepEqual(macro([null, .2, .4]), { value: .30000000000000004, n: 2 });
});
