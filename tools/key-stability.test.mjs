import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordModeEvidence, preferCurrentKey, tonicOf } from '../renderer/engine.js';

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

// ---------------------------------------------------------------- the relative key: which tonic is heard

// how much each key's tonic has been heard, as keyHome keeps it: [root, minor, how much]
const heard = (xs) => { const h = new Float64Array(24); for (const [root, minor, n] of xs) h[root * 2 + (minor ? 1 : 0)] += n; return h; };

test('of a key and its relative, the tonic heard clearly more is home, in all twelve keys', () => {
  for (let r = 0; r < 12; r++) {
    const minor = { root: r, mode: 'minor' }, major = { root: (r + 3) % 12, mode: 'major' };
    assert.deepEqual(tonicOf(heard([[r, 1, 8], [(r + 3) % 12, 0, 2]]), major), minor, 'asked of either key of the pair');
    assert.deepEqual(tonicOf(heard([[r, 1, 2], [(r + 3) % 12, 0, 8]]), minor), major);
  }
});

test('a loop that plays both tonic chords is neither, whichever came round last; less than a bar ahead is not clear', () => {
  const am = { root: 9, mode: 'minor' };
  assert.equal(tonicOf(heard([[0, 0, 4], [9, 1, 2]]), am), null, 'C a bar ahead of Am after one time round (each a chord and its bass)');
  assert.equal(tonicOf(heard([[0, 0, 6], [9, 1, 4]]), am), null);
  assert.equal(tonicOf(heard([[9, 1, 2.5]]), am), null, 'a bar and a bit, and nothing else');
  assert.deepEqual(tonicOf(heard([[9, 1, 3]]), am), am);
  assert.equal(tonicOf(heard([[9, 1, 3]]), null), null, 'no key yet');
});

// The key line itself (keyReset, keyOpening, keyBar), on a stand-in engine, fed chords as the chord search gives them.
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const unit = (v) => { const len = Math.hypot(...v); return v.map((x) => x / len); };
function chordAt(root, q) {
  const tones = new Array(12).fill(0);
  for (const [note, w] of [[root, 1], [root + (q === 'm' ? 3 : 4), 0.9], [root + 7, 0.9]]) tones[note % 12] += w;
  return { root: root % 12, q, name: NAMES[root % 12] + q, tones: unit(tones), score: 0.9 };
}
async function keyEngine() {
  globalThis.window ??= { NC_DEBUG: false };
  const { createEngine } = await import('../renderer/engine.js');
  const fake = (size) => ({ fftSize: size, frequencyBinCount: size / 2, getFloatFrequencyData(out) { out.fill(-200); }, getFloatTimeDomainData(out) { out.fill(0); } });
  return createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
}
// the key shown after each bar: bars are [chord root, quality, bass note (-1: none), the bass tracker's notes by the beat]
function keyLine(e, first, bars) {
  e.reset({ top: true });
  if (first) e.keyOpening(chordAt(first[0], first[1]), first[2]);
  return bars.map(([root, q, bass, beats]) => { e.keyBar(chordAt(root, q), bass, beats ?? null); return e.key ? NAMES[e.key.root] + (e.key.mode === 'minor' ? 'm' : '') : null; });
}
const times = (n, bars) => Array.from({ length: n }, () => bars).flat();
const key = (root, minor) => NAMES[root % 12] + (minor ? 'm' : '');
const last = (xs) => xs[xs.length - 1];
// from which bar on the line shows k and nothing else (-1: it doesn't end on it)
const settlesAt = (line, k) => { let i = line.length; while (i > 0 && line[i - 1] === k) i--; return i < line.length ? i : -1; };

test('a minor song whose first chord heard is its relative major is minor once its tonic is heard, in all twelve keys', async () => {
  const e = await keyEngine();
  for (let r = 0; r < 12; r++) {
    // (Starboy: C heard first, then Am F G Am, the bass on the roots, and no C again)
    const line = keyLine(e, [r + 3, '', (r + 3) % 12], times(6, [[r, 'm', r], [r + 8, '', (r + 8) % 12], [r + 10, '', (r + 10) % 12], [r, 'm', r]]));
    assert.equal(last(line), key(r, true), key(r, true));
    assert.ok(settlesAt(line, key(r, true)) <= 8, `${key(r, true)} for good within eight bars: ${line.join(' ')}`);
  }
});

test('a major song whose first chord heard is its relative minor is major once its tonic is heard, in all twelve keys', async () => {
  const e = await keyEngine();
  for (let r = 0; r < 12; r++) {
    const line = keyLine(e, [r + 9, 'm', (r + 9) % 12], times(6, [[r, '', r], [r + 7, '', (r + 7) % 12], [r + 5, '', (r + 5) % 12], [r, '', r]]));
    assert.equal(last(line), key(r, false), key(r, false));
    assert.ok(settlesAt(line, key(r, false)) <= 8, `${key(r, false)} for good within eight bars: ${line.join(' ')}`);
  }
});

test('a loop that plays both tonic chords keeps the first chord heard, unchanged after its first time round, in all twelve keys (the test songs)', async () => {
  const e = await keyEngine();
  for (let r = 0; r < 12; r++) {
    // (house: Am F C G, the bars counted from F; pop: C G Am F, from G)
    const minor = keyLine(e, [r, 'm', r], times(8, [[r + 8, '', (r + 8) % 12], [r + 3, '', (r + 3) % 12], [r + 10, '', (r + 10) % 12], [r, 'm', r]]));
    assert.deepEqual([...new Set(minor.slice(4))], [key(r, true)], `minor: ${minor.join(' ')}`);
    const major = keyLine(e, [r, '', r], times(8, [[r + 7, '', (r + 7) % 12], [r + 9, 'm', (r + 9) % 12], [r + 5, '', (r + 5) % 12], [r, '', r]]));
    assert.deepEqual([...new Set(major.slice(4))], [key(r, false)], `major: ${major.join(' ')}`);
  }
});

test('bars read as the relative major from blends (the bass walking two chords to a bar) give way to the minor loop and stay given way, in all twelve keys', async () => {
  const e = await keyEngine();
  for (let r = 0; r < 12; r++) {
    // Better Off Alone's start (Ab minor; round 2's report): its first chord heard E (VI), intro bars the chord search
    // reads as B (III) where the bass tracker hears two of the loop's notes a bar, then the loop, Abm F# E Ebm
    const n = (x) => 36 + ((r + x) % 12), all = (x) => [n(x), n(x), n(x), n(x)];
    const intro = [[r + 8, '', r], [r, 'm', r, [null, n(2), n(0), n(0)]], [r + 3, '', r + 3, [n(2), n(0), n(10), n(10)]],
      [r + 3, '', r + 3, [n(10), n(10), n(2), n(2)]], [r + 3, '', r + 3, [n(8), n(8), n(7), n(2)]], [r, 'm', r, [n(7), n(7), n(0), n(0)]],
      [r + 3, '', r + 10, [null, null, n(10), n(10)]], [r + 8, '', r + 8, all(8)], [r + 3, '', r + 3, [n(2), n(2), n(7), n(7)]], [r, 'm', r, all(0)]];
    const line = keyLine(e, [r + 8, '', (r + 8) % 12], [...intro, ...times(8, [[r, 'm', r, all(0)], [r + 10, '', (r + 10) % 12, all(10)], [r + 8, '', (r + 8) % 12, all(8)], [r + 7, 'm', (r + 7) % 12, all(7)]])]
      .map(([root, q, bass, beats]) => [root % 12, q, bass % 12, beats]));
    const at = settlesAt(line, key(r, true));
    assert.ok(at >= 0 && at <= 16, `${key(r, true)} for good by the loop's second time round: ${line.join(' ')}`);
  }
});
