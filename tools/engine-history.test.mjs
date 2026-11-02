// The engine's short history (renderer/engine.js: dbAt, midAt, timeAt, levelAt, chromaAt, silentAt, bpmAt, stepAt(t, asOf),
// renumberAt): what each of the last 256 ticks heard, for a picture that moves in steps of its own (clock.js simulate) to
// read at its steps' times, not the engine's present.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../renderer/engine.js';

globalThis.window = { NC_DEBUG: false };
const state = { tick: 0 };
const fake = (size, kind) => ({
  fftSize: size, frequencyBinCount: size / 2,
  // every tick's spectrum and waveform carry the tick's number, so a read can tell which tick it came from
  getFloatFrequencyData(out) { out.fill(-90); out[3] = -50 - state.tick * 0.01; out[kind === 'mid' ? 5 : 2] = -40 - state.tick * 0.01; },
  getFloatTimeDomainData(out) { out.fill(0.01 * ((state.tick % 5) + 1)); },
});
const engine = () => createEngine({ fast: fake(1024, 'fast'), mid: fake(4096, 'mid'), slow: fake(16384, 'slow'), sampleRate: 48000 });

function run(e, from, n, dt = 0.015) {
  const times = [];
  for (let i = 0; i < n; i++) { state.tick = from + i; const t = 100 + (from + i) * dt; e.frame(t, t); times.push(t); }
  return times;
}

test('dbAt, levelAt and timeAt give what the tick at or before the time heard', () => {
  state.tick = 0;
  const e = engine();
  const times = run(e, 0, 40);
  for (const i of [0, 7, 21, 39]) {
    assert.ok(Math.abs(e.dbAt(times[i])[3] - (-50 - i * 0.01)) < 1e-4, `tick ${i}`);
    assert.ok(Math.abs(e.dbAt(times[i] + 0.007)[3] - (-50 - i * 0.01)) < 1e-4, 'between two ticks: the one before');
    assert.ok(Math.abs(e.timeAt(times[i])[0] - 0.01 * ((i % 5) + 1)) < 1e-6);
  }
  assert.ok(e.levelAt(times[39]) > 0.049, 'the level of the last tick');
  assert.ok(e.levelAt(times[5]) < e.levelAt(times[39]) + 1);
  assert.notEqual(e.dbAt(times[3])[3], e.dbAt(times[30])[3]);
  // a window, not a copy: read it now
  assert.equal(e.dbAt(times[30]).length, 512);
  assert.equal(e.midAt(times[30]).length, 2048);
  assert.equal(e.chromaAt(times[30]).length, 12);
  assert.equal(typeof e.silentAt(times[30]), 'boolean');
});

test('before the first tick it is the present, and a time before what is kept gives the oldest kept', () => {
  state.tick = 0;
  const e = engine();
  assert.equal(e.dbAt(5), e.fastDb);
  assert.equal(e.levelAt(5), e.level);
  const times = run(e, 0, 300);
  const oldest = e.dbAt(-1)[3];
  assert.ok(Math.abs(oldest - (-50 - (300 - 256) * 0.01)) < 1e-4, `the oldest kept is tick 44, not ${oldest}`);
  assert.ok(Math.abs(e.dbAt(times[299])[3] - (-50 - 299 * 0.01)) < 1e-4);
});

test('the beat grid and the tempo as the tick at or before a time knew them', () => {
  state.tick = 0;
  const e = engine();
  const t0 = 100;
  for (let i = 0; i < 4; i++) e.tap(t0 + i * 0.5);
  assert.equal(e.tempo.locked, true);
  const times = run(e, 0, 20);
  const asOf = times[10];
  const before = e.stepAt(times[10]);
  assert.equal(e.stepAt(times[10], asOf), before, 'the same grid, the same step');
  assert.ok(Math.abs(e.bpmAt(asOf) - 120) < 1e-9);
  assert.ok(Math.abs(e.bpmAt(times[19]) - 120) < 1e-9);
  // the grid is corrected a little: a time asked as of the tick before the correction still gets the old grid
  e.tempo.t0 += 0.02;
  e.tempo.renumber += 3;
  run(e, 20, 5);
  assert.equal(e.stepAt(times[10], asOf), before, 'as of then: as it was');
  assert.notEqual(e.stepAt(times[10]), before, 'as of now: corrected');
  const later = 100 + 24 * 0.015;
  assert.equal(e.renumberAt(later) - e.renumberAt(asOf), 3, 'the steps\' numbers moved by 3 in between');
  // not locked: no step, no bpm
  const free = engine();
  run(free, 0, 5);
  assert.equal(free.bpmAt(100.05), 0);
  assert.equal(free.stepAt(100.05, 100.05), null);
});

// ---------------------------------------------------------------- what is playing, as of a time

test('lastHitAt counts only the hits the engine had filed by the time asked (a hit is filed after it sounded)', () => {
  state.tick = 0;
  const e = engine();
  run(e, 0, 5);
  let now = 200;
  globalThis.clock = { now: () => now }; // (the engine stamps each hit with the clock's time when it is filed)
  try {
    now = 200.10; e.place('bd', 200.00, 0.9); // sounded at 200.00, filed at 200.10
    now = 200.60; e.place('bd', 200.50, 0.9); // sounded at 200.50, filed at 200.60
    assert.equal(e.lastHitAt('bd', 200.70), 200.50);
    assert.equal(e.lastHitAt('bd', 200.55), 200.00, 'the second is not filed yet at 200.55: the one before it');
    assert.equal(e.lastHitAt('bd', 200.05), -10, 'and at 200.05 neither');
    assert.equal(e.v.bd.last, 200.50, 'the part itself still says the last');
  } finally { delete globalThis.clock; }
});

test('presentAt, playingAt and seenAt give what the tick at or before the time had: a change after it does not reach back', () => {
  state.tick = 0;
  const e = engine();
  e.reset(); // (the parts are made when a song starts)
  for (let i = 0; i < 4; i++) e.tap(100 + i * 0.5); // (a beat: nothing is present or playing without one)
  assert.equal(e.tempo.locked, true);
  const bd = e.v.bd;
  bd.shown = Array.from({ length: 16 }, (_, s) => s % 4 === 0);
  const early = run(e, 0, 30); // (nothing heard yet)
  assert.equal(e.presentAt('bd', early[29]), false);
  assert.equal(e.playingAt('bass', early[29]), false);
  bd.last = bd.prev = early[29]; // (the kick is heard, twice in a short while: it is there)
  e.bassSeen = early[29]; // (and a bass note found)
  const later = run(e, 30, 30);
  assert.equal(e.presentAt('bd', later[29]), true);
  assert.equal(e.playingAt('bass', later[29]), true);
  assert.equal(e.seenAt('bass', later[29]), early[29]);
  // as of the earlier ticks they still were not
  assert.equal(e.presentAt('bd', early[10]), false);
  assert.equal(e.playingAt('bass', early[10]), false);
  assert.equal(e.seenAt('bass', early[10]), -10);
  // no history yet: present() itself
  const fresh = engine();
  fresh.reset();
  assert.equal(fresh.presentAt('bd', 5), fresh.present('bd', 5));
});

test('learnedAt gives the patterns as they stood at a time (a change after it does not reach back), and one entry stands while nothing changes', () => {
  state.tick = 0;
  const e = engine();
  e.reset();
  for (let i = 0; i < 4; i++) e.tap(100 + i * 0.5);
  const A = Array.from({ length: 16 }, (_, s) => s % 4 === 0), B = Array.from({ length: 16 }, (_, s) => s % 4 === 2);
  e.v.bd.shown = A.slice();
  e.slots[1] = { chord: { root: 9, third: 3, name: 'Am' }, bass: 'a1' };
  const early = run(e, 0, 20);
  e.v.bd.shown = B.slice(); // (learned a different pattern)
  e.v.bd.tooBusy = true;
  e.slots[1] = { chord: { root: 7, third: 4, name: 'G' }, bass: 'g1' };
  const later = run(e, 20, 20);
  const was = e.learnedAt(early[10]), now = e.learnedAt(later[19]);
  assert.deepEqual(was.shown.bd, A);
  assert.deepEqual(now.shown.bd, B);
  assert.equal(was.tooBusy.bd, false);
  assert.equal(now.tooBusy.bd, true);
  assert.equal(was.slots[1].chord.name, 'Am');
  assert.equal(now.slots[1].bass, 'g1');
  // as of the tick before the change: still the old
  assert.deepEqual(e.learnedAt(early[19]).shown.bd, A);
  // (a tick that sees nothing changed adds no entry)
  e.logLearned(500);
  const stands = e.learnedAt(500);
  e.logLearned(500.1);
  assert.equal(e.learnedAt(500.1), stands, 'nothing changed: the same entry stands');
  e.slots[2] = { chord: { root: 2, third: 3, name: 'Dm' }, bass: 'd1' };
  e.logLearned(500.2);
  assert.notEqual(e.learnedAt(500.2), stands, 'a bar\'s chord changed: a new entry');
  assert.equal(e.learnedAt(500.15), stands, 'and before it, the old one');
  // what is read is a copy: changing the engine's pattern in place does not change the entry
  e.v.bd.shown[0] = !e.v.bd.shown[0];
  assert.deepEqual(e.learnedAt(later[19]).shown.bd, B);
  // a new song forgets the old song's log
  e.reset();
  assert.equal(e.learnedAt(early[3]).known, -Infinity);
});
