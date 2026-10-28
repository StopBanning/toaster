// Deterministic export fidelity checks. No app, capture devices or user profile.
// STRUDEL_TEST_MODULES points to test-only @strudel/* 1.2.6 packages.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { writer, hasStrudel, strudelRuntime, events } from './strudel-test-runtime.mjs';
import { tape as api, grid, bar, musicalBar, midiNotes } from './export-fidelity-fixtures.mjs';
const { createTape, songSections, songStrudel, songMidi } = api;
const engineURL = 'data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8'));
const { createEngine } = await import(engineURL);
globalThis.window = { NC_DEBUG: false };
const out = { date: '2026-10-28', hasStrudel, cases: [] };
function record(id, evidence) { out.cases.push({ id, ...evidence }); }

const four = { bpm: 120, bars: Array.from({ length: 4 }, musicalBar) };
assert.equal(songSections(four).parts[0].raw[0].chord.root, 0);
assert.equal(songSections(four).parts[0].raw[0].parts.vox.on[2], true);
record('four-bar-harmony-kept', { code: songStrudel(four, 'four bars') });
const midi4 = songMidi(four, 'four');
assert.equal(midiNotes(midi4, 3).length, 12); assert.equal(midiNotes(midi4, 4).length, 4);
record('four-bar-midi-control', { chordNotes: midiNotes(midi4, 3).length, leadNotes: midiNotes(midi4, 4).length });
const eight = { bpm: 120.4, bars: Array.from({ length: 8 }, musicalBar) };
assert.match(songStrudel(eight, 'eight'), /setcpm\(120\.4\/4\)/);
record('eight-bar-control', { code: songStrudel(eight, 'eight bars') });

const fill = { bpm: 120, bars: Array.from({ length: 16 }, () => bar()) };
fill.bars[15].parts.bd[15] = true;
assert.equal(songSections(fill).parts.length, 2);
record('one-bar-fill-kept', { inputKickHits: 65, uniqueParts: songSections(fill).parts.length });
const change = { bpm: 120, bars: Array.from({ length: 32 }, (_, i) => bar({ parts: { bd: i < 16 ? grid(0, 4, 8, 12) : grid(0, 2, 4, 8, 12) } })) };
assert.equal(songSections(change).parts.length, 2);
record('systematic-rhythm-change-kept', { inputKickHits: 144, uniqueParts: songSections(change).parts.length, sections: songSections(change).sections });
const tape = createTape(); tape.lock(120, 0);
for (let i = 0; i < 6; i++) tape.pattern(i * 4, { bd: grid(0) });
tape.lock(90, 0);
for (let i = 0; i < 4; i++) tape.pattern(i * 4, { sd: grid(4, 12) });
const selected = tape.song(0);
assert.equal(selected.bars.length, 6);
assert.deepEqual(selected.coverage.stretches.map((s) => s.bpm), [120, 90]);
assert.match(songStrudel(selected, 'coverage'), /6\/10 recorded bars/);
record('tempo-stretches-identified', { ...selected.coverage, code: songStrudel(selected, 'coverage') });
const shifted = createTape(); shifted.lock(120, 0);
for (let i = 0; i < 4; i++) shifted.pattern(i * 4, { bd: grid(0) });
shifted.shift(.25);
const shiftedSong = shifted.song(0);
const actualSteps = shiftedSong.bars.flatMap((b, i) => api.barEvents(b).filter((e) => e.part === 'bd').map((e) => (i + e.onset) * 16 + shiftedSong.timeline.originBeat * 4));
assert.deepEqual(actualSteps, [-1, 15, 31, 47]);
record('phase-shift-carries-across-bars', { inputAbsoluteSteps: [0, 16, 32, 48], shiftInSteps: -1, actualAbsoluteSteps: actualSteps, timeline: shiftedSong.timeline });

const filled = writer.beatRuns([null, 36, null, null]);
assert.deepEqual(filled, [{ m: 36, beats: [0, 1, 2, 3] }]);
record('bass-rests-filled', { inputBeats: [null, 36, null, null], outputRuns: filled });

const fake = (size) => ({ fftSize: size, frequencyBinCount: size / 2 });
const eng = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
Object.assign(eng.tempo, { locked: true, bpm: 120, P: .5, t0: 0, n0: 0, down: 0 });
const swingTime = .125 * 1.33;
eng.place('hhc', swingTime, 1);
assert.equal(eng.v.hhc.grid[1], 1);
record('swing-quantized-to-straight', { inputTimeSeconds: swingTime, outputStep: 1, outputTimeSecondsAt120: .125, lateFeelLostMs: (swingTime - .125) * 1000 });
const taps = [];
for (const requestedBpm of [60, 200]) {
  const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
  for (let i = 0; i < 4; i++) e.tap(i * 60 / requestedBpm);
  taps.push({ requestedBpm, lockedBpm: e.tempo.bpm });
}
assert.deepEqual(taps, [{ requestedBpm: 60, lockedBpm: 120 }, { requestedBpm: 200, lockedBpm: 100 }]);
record('tap-tempo-folds-octave', { taps });

if (hasStrudel) {
  delete globalThis.window;
  const runtime = await strudelRuntime();
  const e4 = events(await runtime.evaluate(songStrudel(four, 'four bars')), 0, 4);
  const e8 = events(await runtime.evaluate(songStrudel(eight, 'eight bars')), 0, 8);
  assert.equal(e4.filter((e) => e.value.s === 'supersaw').length, 12);
  assert.equal(e4.filter((e) => e.value.s === 'triangle').length, 4);
  assert.equal(e8.filter((e) => e.value.s === 'triangle').length, 8);
  const o = await runtime.evaluate(writer.strudelProgram({ tempo: 'setcpm(120/4)', vox: 'vox: s("vox").slice(16, "0").clip(1)' }, null));
  const oNote = events(o, 0).find((e) => e.value.s === 'triangle').value.note;
  const xNote = e8.find((e) => e.value.s === 'triangle').value.note;
  assert.equal(oNote, 'c4'); assert.equal(xNote, 'c4');
  assert.equal(midiNotes(songMidi(eight, 'eight'), 4)[0].note, 60);
  const syncBass = { bpm: 120, bars: Array.from({ length: 8 }, () => bar({ bass: 36, parts: { bass: grid(0, 6, 8) } })) };
  const bass = events(await runtime.evaluate(songStrudel(syncBass, 'syncopated bass')), 0).filter((e) => e.value.s === 'sawtooth');
  const oBass = events(await runtime.evaluate(writer.strudelProgram({ bassline: 'bassline: note("c2").s("sawtooth")' }, null, 0, grid(0, 6, 8))), 0);
  const durations = bass.map((e) => e.end - e.begin);
  const midiBassDurations = midiNotes(songMidi(syncBass, 'syncBass'), 2).slice(0, 3).map((e) => e.end - e.begin);
  assert.deepEqual(durations, [.25, .125, .25]);
  assert.deepEqual(durations, midiBassDurations);
  assert.deepEqual(oBass.map((e) => e.end - e.begin), durations);
  record('strudel-runtime', { fourBarChordEvents: 12, fourBarLeadEvents: 4, eightBarLeadEvents: 8, oLeadNote: oNote, xLeadNote: xNote, midiLeadPitch: 60, xSyncopatedBassEventDurationsInBars: durations, oBassDurationsInBars: oBass.map((e) => e.end - e.begin), decodedMidiBassDurationsInBars: midiBassDurations });
  const fillEvents = events(await runtime.evaluate(songStrudel(fill, 'fill')), 0, 16);
  const changeEvents = events(await runtime.evaluate(songStrudel(change, 'change')), 0, 32);
  assert.equal(fillEvents.length, 65); assert.equal(changeEvents.length, 144);
  record('strudel-event-counts', { fillOutput: fillEvents.length, changedRhythmOutput: changeEvents.length });
}
out.midiBytes = { four: songMidi(four, 'four').length, eight: songMidi(eight, 'eight').length };
const dir = new URL('../_checks/audio-review/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL('probe.json', dir), JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(new URL('after-four-bars.strudel', dir), songStrudel(four, 'four bars'));
fs.writeFileSync(new URL('after-coverage.strudel', dir), songStrudel(selected, 'coverage'));
console.log(JSON.stringify(out, null, 2));
