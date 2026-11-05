// The phase vote must distinguish broad tempo attacks from the drum parts actually confirmed.
// No audio/model stub here: exercise the engine's phase correction, relabeling, resume and reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../renderer/engine.js';

globalThis.window = { NC_DEBUG: false };
const fake = size => ({ fftSize: size, frequencyBinCount: size / 2 });
function engine(t0 = 0.25) {
  const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
  Object.assign(e.tempo, { bpm: 120, P: 0.5, t0, n0: 0, locked: true, lockedAt: -20, tapped: true });
  return e;
}
const phase = e => ((e.tempo.t0 % 0.5) + 0.5) % 0.5;
function feed(e, until, { confirmed = true, sparse = false, correct = false } = {}) {
  // Bass-like attacks on the incumbent eighth can dominate the tempo list without being
  // confirmed kicks. The real quarter-note kicks below belong on the other eighth.
  for (let i = 0; i <= until * 2; i++) {
    e.onsets.push({ t: i * 0.5 + 0.25, id: 'bd', s: 1 });
    e.onsets.push({ t: i * 0.5 + 0.25, id: 'sd', s: 1 });
    e.onsets.push({ t: i * 0.5, id: 'bd', s: 1 });
    if (confirmed && (!sparse || i < 2)) e.phaseHits.push({ t: i * 0.5 + (correct ? 0.25 : 0), id: 'bd' });
  }
}

test('persistent confirmed kicks correct an incumbent supported by bass-like timing attacks', () => {
  const e = engine(); feed(e, 12);
  for (let t = 10; t <= 11.5; t += 0.5) e.updatePhase(t);
  assert.ok(Math.abs(phase(e)) < 1e-8 || Math.abs(phase(e) - 0.5) < 1e-8);
  assert.equal(e.tempo.bpm, 120, 'the tapped beat period stays fixed');
  assert.ok(e.events.some(x => x.includes('beat moved')));
});

test('confirmed parts protect a correct phase from a stronger syncopated timing count', () => {
  const e = engine(0); feed(e, 20);
  for (let t = 10; t <= 18; t += 0.5) e.updatePhase(t);
  assert.ok(Math.abs(phase(e)) < 1e-8 || Math.abs(phase(e) - 0.5) < 1e-8);
  assert.equal(e.events.some(x => x.includes('beat moved')), false);
});

test('early lock exploration still follows timing onsets despite contrary confirmed kicks', () => {
  const e = engine(0);
  e.tempo.lockedAt = 0;
  for (let i = 0; i < 16; i++) {
    e.onsets.push({ t: i * 0.5 + 0.25, id: 'bd', s: 1 });
    e.phaseHits.push({ t: i * 0.5, id: 'bd' });
    if (i >= 12) e.updatePhase(i * 0.5 + 0.25);
  }
  assert.ok(Math.abs(phase(e) - 0.25) < 1e-8, 'the initial phase search keeps its original four-vote correction');
});

test('sparse or divided confirmed parts do not create an accelerated phase correction', () => {
  for (const divided of [false, true]) {
    const e = engine();
    // The broad list is tied and supplies no challenger of its own.
    for (let i = 0; i < 20; i++) {
      e.onsets.push({ t: i * 0.5, id: 'bd', s: 1 }, { t: i * 0.5 + 0.25, id: 'bd', s: 1 });
      if (divided) e.phaseHits.push({ t: i * 0.5, id: 'bd' }, { t: i * 0.5 + 0.25, id: 'sd' });
    }
    if (!divided) e.phaseHits.push({ t: 8, id: 'bd' }, { t: 9, id: 'bd' });
    for (let t = 10; t <= 13; t += 0.5) e.updatePhase(t);
    assert.ok(Math.abs(phase(e) - 0.25) < 1e-8, divided ? 'a split vote is not clear' : 'two kicks are insufficient');
  }
});

test('only actual drum parts feed the phase record; recording them does not alter tempo onsets', () => {
  const e = engine(); e.tempo.locked = false;
  e.hit('bd', 1, 1); e.hit('sd', 1.5, 1); e.hit('hhc', 1.75, 1);
  assert.deepEqual(e.phaseHits, [{ t: 1, id: 'bd' }, { t: 1.5, id: 'sd' }]);
  assert.equal(e.onsets.length, 0, 'the new evidence is not fed into tempo finding');
  for (let t = 2; t <= 40; t++) e.hit('bd', t, 1);
  assert.ok(e.phaseHits.every(o => o.t >= 20), 'the record stays bounded in time');
});

test('pause/resume moves the phase evidence with its beat and reset discards it', () => {
  const e = engine(); feed(e, 12);
  const before = e.phaseHits.map(o => o.t); e.resume(25);
  assert.deepEqual(e.phaseHits.map(o => o.t), before.map(t => t + 25));
  for (let t = 35; t <= 36.5; t += 0.5) e.updatePhase(t);
  assert.ok(Math.abs(phase(e)) < 1e-8 || Math.abs(phase(e) - 0.5) < 1e-8);
  e.reset(); assert.deepEqual(e.phaseHits, []);
});


test('confirmed parts leave the original sixteenth correction and its hold time alone', () => {
  const e = engine(0);
  for (let i = 0; i < 40; i++) {
    e.onsets.push({ t: i * 0.5 + 0.375, id: 'bd', s: 1 });
    e.phaseHits.push({ t: i * 0.5, id: 'bd' });
  }
  for (let i = 0; i < 11; i++) {
    if (i) e.onsets.push({ t: 19.875 + i * 0.5, id: 'bd', s: 1 });
    e.updatePhase(20 + i * 0.5);
  }
  assert.ok(Math.abs(phase(e)) < 1e-8, 'the original twelve votes are required');
  e.onsets.push({ t: 25.375, id: 'bd', s: 1 });
  e.updatePhase(25.5);
  assert.ok(Math.abs(phase(e) - 0.375) < 1e-8, 'the original one-sixteenth correction still happens');
});

test('a sparse one-in-four kick pattern is not a dense pulse vote on its own', () => {
  const e = engine();
  for (let i = 0; i < 40; i++) {
    e.onsets.push({ t: i * 0.5, id: 'bd', s: 1 }, { t: i * 0.5 + 0.25, id: 'bd', s: 1 });
    if (i % 4 === 0) e.phaseHits.push({ t: i * 0.5, id: 'bd' });
  }
  for (let i = 0; i < 4; i++) e.updatePhase(20 + i * 0.5);
  assert.ok(Math.abs(phase(e) - 0.25) < 1e-8, 'confidence needs coverage, not just a concentrated sparse pattern');
});
