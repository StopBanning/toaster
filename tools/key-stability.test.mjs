import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordModeEvidence, preferCurrentKey } from '../renderer/engine.js';

// each chord's count, as the engine keeps them: [root, minor, how many]
function history(chords) {
  const h = new Float64Array(24);
  for (const [root, minor, n = 1] of chords) h[root * 2 + (minor ? 1 : 0)] += n;
  return h;
}

test('a minor i, iv, VI and a major dominant say minor, even with the tonic misread as major', () => {
  assert.equal(chordModeEvidence(history([[2, 0, 9], [2, 1, 6], [7, 1, 5], [10, 0, 3], [9, 0, 8]]), 2), 'minor');
});

test('a major I, IV, vi and ii say major', () => {
  assert.equal(chordModeEvidence(history([[0, 0, 6], [5, 0, 4], [9, 1, 3], [2, 1, 2], [7, 0, 8]]), 0), 'major');
});

test('one chord, or only the major dominant both modes share, chooses no mode', () => {
  assert.equal(chordModeEvidence(history([[9, 0, 50]]), 2), null);
  assert.equal(chordModeEvidence(history([[2, 1, 50]]), 2), null);
});

test('the same progressions say the same in all twelve keys', () => {
  for (let r = 0; r < 12; r++) {
    assert.equal(chordModeEvidence(history([[r, 1, 5], [(r + 5) % 12, 1, 4], [(r + 8) % 12, 0, 3]]), r), 'minor');
    assert.equal(chordModeEvidence(history([[r, 0, 5], [(r + 5) % 12, 0, 4], [(r + 9) % 12, 1, 3]]), r), 'major');
  }
});

test('after the opening, a close call on another root keeps the key shown; a clear lead takes over', () => {
  const current = { root: 2, mode: 'minor', score: 0.65 }, near = { root: 7, mode: 'minor', score: 0.7 };
  assert.equal(preferCurrentKey([current, near], near, current, 20), current);
  const clear = { ...near, score: 0.8 };
  assert.equal(preferCurrentKey([current, clear], clear, current, 20), clear);
});

test('the margin leaves the opening and the other mode on the same root alone', () => {
  const current = { root: 2, mode: 'major', score: 0.8 }, next = { root: 2, mode: 'minor', score: 0.7 };
  const root = { root: 7, mode: 'major', score: 0.81 };
  assert.equal(preferCurrentKey([current, next], next, current, 20), next);
  assert.equal(preferCurrentKey([current, root], root, current, 3), root);
});
