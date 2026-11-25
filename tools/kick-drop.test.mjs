// The kick on the drop (Nov 23, backlog/big-brother/2026-11-23-kick-drop-day1-read.md): the drop's kicks were filed on time, but the kick had no line to show, so it
// waited for a bar's end. Part 1: once a drop is called and the kick has no line, its first three kicks on the beat, each a beat after the last, write the four on the floor at once,
// provisional (the bar's end throws it out if the bar does not bear it out). A drop call alone never writes a line. Part 2: a set-aside line (v.away, the build-up's, put
// aside in the break) survives one stray kick; it is thrown out only when the kicks off it outnumber the kicks on it.
// These run the engine itself (place(), newBar()) on made-up kicks at the times of the real ones: Animals' drop (154.485 s, 128 bpm), 9 PM's (45.09 s, 130 bpm).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../renderer/engine.js';

globalThis.window = { NC_DEBUG: false };
const fake = (n) => ({ fftSize: n, frequencyBinCount: n / 2, getFloatFrequencyData(o) { o.fill(-90); }, getFloatTimeDomainData(o) { o.fill(0); } });
function engine(bpm, t0) {
  const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
  e.reset(); // (the parts are made when a song starts)
  Object.assign(e.tempo, { bpm, P: 60 / bpm, t0, n0: 0, down: 0, locked: true, lockedAt: t0 - 60, tapped: true });
  return e;
}
const four = (steps = [0, 4, 8, 12]) => Array.from({ length: 16 }, (_, s) => steps.includes(s));
const shownSteps = (v) => (v.shown ? v.shown.map((x, s) => (x ? s : -1)).filter((s) => s >= 0) : null);

// Animals: the build-up's line was `bd ~ ~ ~`, set aside in the break; the drop's kicks come on every beat from 154.485 (strength 0.95+)
const ANIMALS = [154.485, 154.953, 155.403, 155.895, 156.36];
function animals() {
  const e = engine(128, 154.485), v = e.v.bd;
  v.away = four([0]); v.awayN = 0; v.awayOff = 0; v.shown = null;
  e.lastDrop = 154.485; // (the drop is called by the first kick itself, at 154.485)
  return { e, v };
}

test('Animals: the drop\'s kicks write the four on the floor on the third, not at the bar\'s end', () => {
  const { e, v } = animals();
  e.place('bd', ANIMALS[0], 0.95);
  assert.equal(v.shown, null, 'one kick (the drop call\'s own): no line');
  e.place('bd', ANIMALS[1], 0.95);
  assert.equal(v.shown, null, 'two kicks a beat apart: not yet (a break has pairs like that, Kernkraft 400\'s)');
  e.place('bd', ANIMALS[2], 0.95);
  assert.deepEqual(shownSteps(v), [0, 4, 8, 12], 'three kicks on the beat, each a beat after the last: bd*4, two beats after the first');
  assert.equal(v.provisional, true, 'and it is provisional');
  assert.equal(v.away, null, 'the set-aside line is gone');
});

test('Animals as the engine really heard it: the drop is never called (a weaker pickup kick at 154.35 s takes the 3-second gap), but the kick was away 15 s: the same line, on the third kick on the beat', () => {
  const e = engine(128, 154.485), v = e.v.bd;
  v.away = four([0]); v.awayN = 0; v.awayOff = 0; v.shown = null;
  v.last = 139.44; v.prev = 137.61;                        // (the build-up's last kicks, as the dump has them)
  e.place('bd', 154.35, 0.67);                              // (the pickup: a 16th before the bar)
  e.place('bd', 154.485, 1.0);
  assert.equal(v.shown, null, 'the pickup and one kick on the beat: not yet');
  e.place('bd', 154.95, 0.96);
  assert.equal(v.shown, null, 'two on the beat: not yet');
  e.place('bd', 155.403, 0.96);
  assert.deepEqual(shownSteps(v), [0, 4, 8, 12], 'at 155.4 s, two beats after the first kick on the beat, inside 8 beats of 154.35');
  assert.equal(v.provisional, true);
});

test('a kick that was never away (the last one under 3 s ago) is no return: three kicks on the beat write no line at once', () => {
  const e = engine(128, 100), v = e.v.bd;
  v.last = 99.0; v.prev = 98.5;
  for (const t of [100, 100.469, 100.938]) e.place('bd', t, 0.95);
  assert.equal(v.shown, null);
});

test('a drop call alone writes no line: 9 PM\'s drop is called at its big hit, 1.3 s before any kick; two kicks, or kicks that are not a beat apart, write nothing', () => {
  const e = engine(130, 45.093), v = e.v.bd;
  e.lastDrop = 45.093;
  e.place('bd', 45.093, 0.95);                 // (the big hit: the call)
  e.place('bd', 47.37, 0.9);                   // (the first kick that is filed, 2.3 s on: not a beat after the call's)
  assert.equal(v.shown, null, 'a call and one kick later: no line');
  e.place('bd', 47.37 + 60 / 130 + 0.2, 0.9);  // (off the beat after it: a run does not start)
  assert.equal(v.shown, null);
  const f = engine(128, 154.485), w = f.e;
  f.lastDrop = 154.485;                        // (called, and nothing else: no kick filed at all)
  f.newBar(0);
  assert.equal(f.v.bd.shown, null, 'a call with no kicks writes no line');
});

test('Kernkraft 400\'s break (139.8 bpm): a lone hit after quiet, then two a beat apart, writes no line (it did at 56.57 s, 12 s before the drop); a third a beat on does', () => {
  const e = engine(139.8, 56.13), v = e.v.bd, P = 60 / 139.8;
  v.last = 49.71; v.prev = 49.233;                           // (the stray hits before it, as the engine filed them)
  e.place('bd', 53.088, 0.7);                                // (3.4 s after the last: the kick is back, in the engine's eyes)
  e.place('bd', 56.13, 0.7);                                 // (3.04 s on: back again; the grid has this on the beat)
  e.place('bd', 56.565, 0.7);                                // (a beat later)
  assert.equal(v.shown, null, 'two on the beat after quiet: no line');
  assert.equal(v.provisional, false);
  e.place('bd', 56.565 + P, 0.7);                            // (a third, a beat on: this is a run)
  assert.deepEqual(shownSteps(v), [0, 4, 8, 12]);
});

test('three kicks on the beat with no drop called write no line at once (the old way: the bar\'s end learns it)', () => {
  const e = engine(128, 100), v = e.v.bd;
  for (const t of [100, 100.469, 100.938]) e.place('bd', t, 0.95);
  assert.equal(v.shown, null);
});

test('the provisional line goes at the bar\'s end if the bar does not bear it out, and stays (as an ordinary line) if it does', () => {
  // (bears out: the bar's kicks are all on the beats)
  let { e, v } = animals();
  for (const t of ANIMALS.slice(0, 4)) e.place('bd', t, 0.95);
  assert.equal(v.provisional, true);
  e.newBar(0);
  assert.equal(v.provisional, false, 'checked once');
  assert.deepEqual(shownSteps(v), [0, 4, 8, 12], 'and kept');
  // (does not: the next hits fall off the beats)
  ({ e, v } = animals());
  for (const t of ANIMALS.slice(0, 3)) e.place('bd', t, 0.95);
  assert.equal(v.provisional, true);
  for (const step of [2, 6, 10, 14]) e.place('bd', 154.485 + step * (60 / 128 / 4), 0.8); // (steps 2, 6, 10, 14 of the bar: all off the line, and more of them than on it)
  e.newBar(0);
  assert.equal(v.shown, null, 'the bar disagreed: the line goes');
  assert.equal(v.provisional, false);
});

test('a set-aside line survives one stray kick and is back on its second kick on its steps', () => {
  const e = engine(128, 100), v = e.v.bd, P = 60 / 128;
  v.away = four([0, 8]); v.awayN = 0; v.awayOff = 0; v.shown = null;
  e.place('bd', 100, 0.9);                     // step 0: on
  e.place('bd', 100 + P, 0.5);                 // step 4: off (one stray)
  assert.ok(v.away, 'one stray does not throw it out');
  e.place('bd', 100 + 2 * P, 0.9);             // step 8: on again: the line comes back
  assert.deepEqual(shownSteps(v), [0, 8]);
  assert.equal(v.away, null);
});

test('a set-aside line goes when the kicks off it outnumber those on it', () => {
  const e = engine(128, 100), v = e.v.bd, P = 60 / 128;
  v.away = four([0, 8]); v.awayN = 0; v.awayOff = 0; v.shown = null;
  e.place('bd', 100, 0.9);                     // on 1
  e.place('bd', 100 + P, 0.5);                 // off 1
  e.place('bd', 100 + 3 * P, 0.5);             // off 2 (step 12): 2 off against 1 on
  assert.equal(v.away, null);
  assert.equal(v.shown, null);
  // and a first kick off the line is one stray too
  const f = engine(128, 100), w = f.v.bd;
  w.away = four([0, 8]); w.awayN = 0; w.awayOff = 0; w.shown = null;
  f.place('bd', 100 + P, 0.5);                 // off 1, on 0
  assert.ok(w.away, 'survives');
  f.place('bd', 100 + 3 * P, 0.5);             // off 2, on 0
  assert.equal(w.away, null, 'two off and none on: gone');
});
