import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { createEventLedger, createEngine } = await import('data:text/javascript,' + encodeURIComponent(
  fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8')));
test('JSON round-trip and corrected grids preserve identity, samples, chronology and pickups', () => {
  const ledger = createEventLedger({ sampleRate: 48000, startTime: 10 });
  for (const t of [10, 12, 10.16625, 11.98]) ledger.event(t, { parts: [{ part: 'hhc' }], status: 'observed' });
  ledger.timing(12, { bpm: 120, anchorSample: 0, anchorBeat: 0, meter: [4, 4] });
  const copy = createEventLedger({ sampleRate: 48000 }); copy.restore(JSON.parse(JSON.stringify(ledger.snapshot())));
  assert.deepEqual(copy.snapshot(), ledger.snapshot());
  const first = copy.project({ bpm: 120, anchorSample: 0 });
  const later = copy.project({ bpm: 120, anchorSample: 6000 });
  assert.deepEqual(first.map(({ id, sampleStart }) => [id, sampleStart]), later.map(({ id, sampleStart }) => [id, sampleStart]));
  assert.deepEqual(later.map((e) => e.sampleStart), [0, 7980, 95040, 96000]);
  assert.equal(later[0].beat, -.25);
  assert.equal(later.at(-1).beat, 3.75);
  assert.equal(copy.project({ bpm: 90, anchorSample: 6000 })[1].sampleStart, 7980);
  later[0].parts.push({ part: 'external mutation' });
  assert.equal(copy.snapshot().chunks[0][0].parts.length, 1);
});
test('one simulated hour stays bounded by records and measured serialized payload', () => {
  const ledger = createEventLedger({ sampleRate: 48000, maxBytes: 262144, maxRecords: 1024, chunkSize: 64 });
  let peakBytes = 0, peakRecords = 0;
  for (let i = 0; i < 3600 * 67; i++) {
    ledger.cover(i / 67, i / 67);
    ledger.event(i / 67, { kind: 'pitch', parts: [{ part: 'bass', confidence: null }], midi: 36,
      cents: 1.5, state: 'voiced', acousticConfidence: null, timingConfidence: null, status: 'observed' });
    const s = ledger.stats(); peakBytes = Math.max(peakBytes, s.payloadBytes); peakRecords = Math.max(peakRecords, s.records);
    assert.ok(s.payloadBytes <= 262144); assert.ok(s.records <= 1024);
  }
  const doc = ledger.snapshot(), measured = doc.chunks.flat().reduce((n, r) => n + JSON.stringify(r).length * 2, 0);
  assert.equal(measured, ledger.stats().payloadBytes);
  assert.ok(doc.capture.coverage.droppedRecords > 200000);
  assert.ok(doc.capture.coverage.droppedThroughSample > 0);
  console.log('hour-limit', JSON.stringify({ peakBytes, peakRecords, final: ledger.stats() }));
});
test('unknown pitch and confidence stay distinct from a rest; reset and input guards', () => {
  const l = createEventLedger({ sampleRate: 44100 });
  l.event(0, { state: 'unknown', midi: null, acousticConfidence: null });
  l.event(.1, { state: 'rest', midi: null, status: 'observed' });
  l.cover(.2, 1); l.cover(.4, 1);
  assert.equal(l.snapshot().capture.coverage.duplicateAudioReads, 1);
  assert.deepEqual(l.snapshot().chunks[0].map((r) => r.state), ['unknown', 'rest']);
  assert.throws(() => l.restore({ version: 99 }));
  assert.throws(() => l.event(NaN, {}));
  assert.throws(() => l.event(1, { text: 'x'.repeat(10000) }));
  l.startCapture({ source: 'file', sourceId: 'new', startTime: 20 });
  assert.equal(l.sample(20.1), 4410); assert.equal(l.stats().records, 0);
});
test('onset is retained before lock and outside grid acceptance', () => {
  globalThis.window = { NC_DEBUG: false };
  const fake = (fftSize) => ({ fftSize, frequencyBinCount: fftSize / 2 });
  const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
  e.ledger.startCapture({ startTime: 0 });
  e.place('bd', .123, .8);
  assert.equal(e.ledger.snapshot().chunks[0][0].sampleStart, 5904);
  assert.equal(e.v.bd.grid.reduce((a, b) => a + b), 0);
});
