import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchF1, correlateEnvelopes, drumThreeWays, cleanClaps } from './exportbench.mjs';

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

// The clap's second answer key (cleanClaps): a four-on-the-floor song at 120 BPM, 12 bars. A kick on every beat; a real clap on
// beats 2 and 4, confirmed by the drum-reading model; and the kick's click heard as a strong "clap" on beats 1 and 3, 10 ms
// after the kick, never confirmed.
const floor = (confirmed = true, beats = 48) => {
  const kick = [], clap = [];
  for (let beat = 0; beat < beats; beat++) {
    const t = beat * 0.5;
    kick.push({ time: t, strength: 1, confirmed_by_neural: true });
    if (beat % 2) clap.push({ time: t + 0.004, strength: 0.9, confirmed_by_neural: confirmed });
    else clap.push({ time: t + 0.01, strength: 0.85, confirmed_by_neural: false });
  }
  return { kick, clap };
};

test('the clap key with the kick\'s click taken out: unconfirmed claps on a kick go, confirmed ones on a kick stay, weak ones were never in', () => {
  const { kick, clap } = floor();
  clap.push({ time: 3.25, strength: 0.9, confirmed_by_neural: false }); // strong, unconfirmed, no kick near: a real off-beat clap, kept
  clap.push({ time: 5.25, strength: 0.3, confirmed_by_neural: false }); // weak: not in either key
  const clean = cleanClaps(clap, kick);
  assert.equal(clean.length, 24 + 1, 'the 24 backbeats and the off-beat one');
  assert.ok(clean.every((t) => Math.abs((t % 1) - 0.504) < 1e-6 || t === 3.25), 'nothing left on beats 1 and 3');
  assert.deepEqual(clean, [...clean].sort((a, b) => a - b), 'in order');
});

test('where the model confirmed fewer than 20 claps it is not asked: the key stays as it was', () => {
  const { kick, clap } = floor(false); // (nothing confirmed)
  assert.equal(cleanClaps(clap, kick).length, 48, 'every strong onset, as the first key has it');
  const few = floor();
  few.clap.splice(38); // (19 confirmed backbeats and 19 clicks left)
  assert.equal(cleanClaps(few.clap, few.kick).length, 38);
  assert.deepEqual(cleanClaps(), []);
});

test('a right "clap on 2 and 4" scores half against the key with the kick\'s click in it, and whole against the cleaned one', () => {
  const { kick, clap } = floor();
  const strong = clap.filter((o) => o.confirmed_by_neural || o.strength >= 0.8).map((o) => o.time);
  const cycles = Array.from({ length: 12 }, (_, i) => [i + 0.25, i + 0.75]).flat(); // (beats 2 and 4 of each bar)
  const span = { origin: 0, barSec: 2, bars: 12, from: 0, to: 24 };
  const first = drumThreeWays(cycles, strong, span), second = drumThreeWays(cycles, cleanClaps(clap, kick), span);
  assert.ok(first.pat < 0.7, `against the first key ${first.pat}`);
  assert.ok(second.pat > 0.99, `against the cleaned key ${second.pat}`);
});

test('a real clap the model missed, on a kick, stays where the song\'s claps come round (two or four beats from a confirmed one); the kick\'s click still goes', () => {
  // as above over 16 bars, but the model confirmed beat 4 in only half the bars: the other half are strong, unconfirmed, on the kick
  const { kick, clap } = floor(true, 64);
  for (const o of clap) if (Math.round(o.time / 0.5) % 8 === 7) o.confirmed_by_neural = false; // (beat 4 of every other bar)
  const beats = Array.from({ length: 64 }, (_, i) => [i * 0.5, i % 4 === 0 ? 1 : 2, 120, 4]);
  assert.equal(cleanClaps(clap, kick).length, 24, 'without the beats: only the confirmed ones (32 backbeats less the 8 the model missed)');
  const clean = cleanClaps(clap, kick, { beats });
  assert.equal(clean.length, 32, 'with them: every backbeat');
  assert.ok(clean.every((t) => Math.abs((t % 1) - 0.504) < 1e-6), 'and nothing on beats 1 and 3');
});
