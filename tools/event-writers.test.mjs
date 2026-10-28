import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writerScores, decodeMidi } from './event-writers.mjs';
import { hasStrudel } from './strudel-test-runtime.mjs';
const grid = (...steps) => Array.from({ length: 16 }, (_, s) => steps.includes(s));
test('independent MIDI decoder handles running status and zero velocity note-offs', () => {
  const track = [0, 0xff, 0x51, 3, 7, 0xa1, 0x20, 0, 0x90, 60, 100, 0x60, 60, 0, 0, 0xff, 0x2f, 0];
  const buf = Buffer.concat([Buffer.from('MThd'), Buffer.from([0, 0, 0, 6, 0, 0, 0, 1, 0, 96]),
    Buffer.from('MTrk'), Buffer.from([0, 0, 0, track.length]), Buffer.from(track)]);
  const result = decodeMidi(buf);
  assert.equal(result.length, 1); assert.equal(result[0].midi, 60);
  assert.equal(result[0].start, 0); assert.equal(result[0].end, .5);
});
test('writer controls verify native drum labels, exact MIDI pitches, onsets and durations', { skip: !hasStrudel }, async () => {
  const song = { bpm: 120, bars: Array.from({ length: 8 }, () => ({
    parts: { bd: grid(0, 4, 8, 12), sd: grid(4, 12), hhc: grid(2, 6, 10, 14), hho: grid(1),
      bass: grid(0, 8), vox: { on: grid(2), tok: Array(16).fill('0') } },
    bass: 36, chord: { root: 0, third: 4, name: 'C' },
  })) };
  const accepted = { drums: { bd: [], sd: [], hhc: [], hho: [] }, bass: [], lead: [], harmony: [{ start: 0, end: 16, label: 'C' }] };
  for (let bar = 0; bar < 8; bar++) {
    for (const part of Object.keys(accepted.drums)) song.bars[bar].parts[part].forEach((on, step) => {
      if (on) accepted.drums[part].push({ start: 2 * bar + step / 8 });
    });
    for (const step of [0, 8]) accepted.bass.push({ start: 2 * bar + step / 8, end: 2 * bar + step / 8 + .5, midi: 36 });
    accepted.lead.push({ start: 2 * bar + .25, end: 2 * bar + .375, midi: 60 });
  }
  const r = await writerScores({ key: 'writer-control', song, writerOrigin: 0 }, accepted);
  for (const kind of ['midi', 'strudel']) {
    for (const part of Object.keys(accepted.drums)) assert.equal(r[kind].drums[part][.025].f1, 1, kind + ':' + part);
    assert.equal(r[kind].bass.exact.f1, 1); assert.equal(r[kind].lead.exact.f1, 1);
    assert.equal(r[kind].harmonyPitchClasses.accuracy, 1);
  }
  assert.equal(r.midi.bass.offset.f1, 1);
});
test('four-bar writer score retains the unique lead and harmony after export fidelity', { skip: !hasStrudel }, async () => {
  const song = { bpm: 120, bars: Array.from({ length: 4 }, () => ({
    parts: { bd: grid(0), vox: { on: grid(2), tok: Array(16).fill('0') } },
    bass: null, chord: { root: 0, third: 4, name: 'C' },
  })) };
  const r = await writerScores({ key: 'four-bars', song, writerOrigin: 0 }, {
    drums: { bd: [0, 2, 4, 6].map((start) => ({ start })) }, bass: [],
    lead: [0, 2, 4, 6].map((start) => ({ start: start + .25, midi: 60 })), harmony: [{ start: 0, end: 8, label: 'C' }],
  });
  assert.equal(r.midi.lead.exact.f1, 1); assert.equal(r.strudel.lead.exact.f1, 1);
  assert.equal(r.midi.harmonyPitchClasses.accuracy, 1); assert.equal(r.strudel.harmonyPitchClasses.accuracy, 1);
});

test('writer scoring converts native cycles with the exact emitted tempo', { skip: !hasStrudel }, async () => {
  const bpm = 120.49, bars = 100, seconds = 240 / bpm;
  const song = { bpm, bars: Array.from({ length: bars }, () => ({ parts: { bd: grid(0) }, chord: null, bass: null })) };
  const r = await writerScores({ key: 'precise-tempo', song, writerOrigin: 0 }, {
    drums: { bd: Array.from({ length: bars }, (_, i) => ({ start: i * seconds })) }, bass: [], lead: [], harmony: [],
  });
  assert.equal(r.strudel.drums.bd[.025].f1, 1);
});
