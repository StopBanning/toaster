import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../renderer/engine.js';

globalThis.window = { NC_DEBUG: false };
const fake = size => ({ fftSize: size, frequencyBinCount: size / 2 });
const engine = () => createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
function tap(e, bpm, start = 10) {
  for (let i = 0; i < 4; i++) assert.equal(e.tap(start + i * 60 / bpm), i + 1);
  return start + 3 * 60 / bpm;
}
function held(e, bpm) {
  assert.equal(e.tempo.locked, true);
  assert.equal(e.tempo.tapped, true);
  assert.ok(Math.abs(e.tempo.bpm - bpm) < 1e-9, `${e.tempo.bpm} should stay at ${bpm}`);
  assert.ok(Math.abs(e.tempo.P - 60 / bpm) < 1e-12);
}

for (const bpm of [60, 90, 120, 174, 200]) {
  test(`four taps lock at ${bpm} BPM with their first beat on bar one`, () => {
    const e = engine();
    for (let i = 0; i < 3; i++) { e.tap(10 + i * 60 / bpm); assert.equal(e.tempo.locked, false); }
    e.tap(10 + 3 * 60 / bpm);
    held(e, bpm);
    assert.ok(Math.abs(e.stepAt(10) / 16 - Math.round(e.stepAt(10) / 16)) < 1e-9);
    assert.ok(Math.abs(e.stepAt(10 + 60 / bpm) - e.stepAt(10) - 4) < 1e-9);
  });

  test(`tapped ${bpm} BPM survives 30 seconds of the same song's drum and flux analysis`, () => {
    const e = engine(), end = tap(e, bpm), period = 60 / bpm;
    e.song = () => ({ known: true, playing: true });
    // Slightly faster audio challenges period fitting. The unmodified detector still reads
    // its preferred octave; the manual tempo must win. Feed the real estimators, not stubs.
    const heardPeriod = period * 0.99;
    let hit = end - 12, index = 0;
    for (let tick = 0; tick <= 60; tick++) {
      const t = end + tick / 2;
      while (hit <= t) {
        e.onsets.push({ t: hit, id: index % 2 ? 'sd' : 'bd', s: 1 });
        e.onsets.push({ t: hit, id: 'hh', s: 1 });
        hit += heardPeriod; index++;
      }
      e.onsets = e.onsets.filter(o => o.t >= t - 20);
      e.fluxT = []; e.fluxV = [];
      for (let i = 0; i <= 1100; i++) {
        const at = t - 11 + i / 100;
        e.fluxT.push(at);
        const phase = ((at - end) % heardPeriod + heardPeriod) % heardPeriod;
        e.fluxV.push(Math.exp(-((Math.min(phase, heardPeriod - phase) / 0.025) ** 2)));
      }
      e.clock(t);
      e.estimateTempo(t);
      e.fluxUpdate(t);
      held(e, bpm);
    }
    assert.equal(e.events.filter(x => /tempo /.test(x)).length, 1, 'no automatic relock');
  });
}

test('the tap median keeps a fractional BPM and tolerates one uneven gap', () => {
  const e = engine(), gap = 60 / 123.4;
  for (const t of [10, 10 + gap, 10 + 2 * gap, 10 + 3.1 * gap]) e.tap(t);
  held(e, 123.4);
});

function halfTimeEvidence(e) {
  e.ringN.fill(8);
  e.ringB.set([0, 10, 0, 0]);
  e.holdB.set([0, 3, 0, 0]);
  for (let i = 0; i < 4; i++) e.halfTime();
}

test('half-time evidence and an already queued halve cannot change a tapped fast tempo', () => {
  const e = engine(), t = tap(e, 174);
  halfTimeEvidence(e);
  assert.equal(e.tempo.half, 1, 'half-time rhythm is still recognized');
  assert.equal(e.halveFor, null, 'manual tempo does not queue an octave correction');
  e.halveFor = 1; // a pending correction must be harmless at the clock boundary too
  e.clock(t + 1);
  assert.equal(e.halveFor, null);
  held(e, 174);
  e.halve(t + 2, 1);
  held(e, 174);
});

test('automatic fast-tempo halving still works without taps', () => {
  const e = engine();
  e.lockTo(4, 174, 'tempo lock 174'); // the initial tempo-octave tie waits six seconds
  e.lockTo(10, 174, 'tempo lock 174');
  halfTimeEvidence(e);
  assert.equal(e.halveFor, 1);
  e.clock(11);
  assert.equal(e.tempo.bpm, 87);
  assert.equal(e.tempo.halved, true);
});

test('phase alignment still works while the tapped beat period stays fixed', () => {
  const e = engine(), t = tap(e, 120), before = e.tempo.t0;
  for (let i = 0; i < 16; i++) e.onsets.push({ t: before - 8 + i * 0.495 + 0.06, id: 'bd', s: 1 });
  e.updatePhase(t);
  held(e, 120);
  assert.notEqual(e.tempo.t0, before, 'phase may follow the sound');
});

test('flux relocking and drift cannot override a manual lock even with a flux-origin flag', () => {
  const e = engine(), t = tap(e, 60);
  e.tempo.byFlux = true;
  let reading = 60.5;
  e.fluxTempo = () => ({ bpm: reading, pulse: 1, support: 1, gain: 2, beatAt: t });
  e.repeatsThere = () => true;
  for (let i = 0; i < 16; i++) {
    if (i === 8) reading = 120;
    e.fluxUpdate(t + i / 2);
    held(e, 60);
  }
});

test('a new tap count can replace the locked tempo; one to three taps leave it held', () => {
  const e = engine(); tap(e, 60);
  for (let i = 0; i < 3; i++) { assert.equal(e.tap(20 + i * 0.3), i + 1); held(e, 60); }
  assert.equal(e.tap(20.9), 4);
  held(e, 200);
});

for (const reason of ['source', 'song']) {
  test(`the existing reset for a new ${reason} releases the manual lock`, () => {
    const e = engine(); tap(e, 60);
    e.reset({ top: reason === 'song' });
    assert.equal(e.tempo.locked, false);
    assert.ok(!e.tempo.tapped);
    assert.deepEqual(e.taps, []);
    e.lockTo(24, 128, 'tempo lock 128');
    e.lockTo(30, 128, 'tempo lock 128');
    assert.equal(e.tempo.bpm, 128);
    assert.equal(e.tempo.tapped, false);
  });
}
