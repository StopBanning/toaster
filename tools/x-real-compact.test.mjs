import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tape, bar, musicalBar, grid, midiNotes } from './export-fidelity-fixtures.mjs';
import { strudelRuntime, events, hasStrudel } from './strudel-test-runtime.mjs';
const integration = { skip: hasStrudel ? false : 'Native Strudel packages required' };
const canonical = (es) => es.map((e) => JSON.stringify(e)).sort();

test('compact instrument variations retain native events, tails, silence, wobble and repeated motifs', integration, async () => {
  const runtime = await strudelRuntime();
  for (const length of [1, 3, 7, 17, 71]) {
    const song = { bpm: 120.4, bars: Array.from({ length }, (_, i) => {
      if (i % 7 === 0) return bar({ parts: {} });
      const b = musicalBar();
      b.wob = i % 3 === 0 ? 2 : 0;
      b.beats = i % 2 ? [36, 36, 36, 36] : [36, 38, 40, 41];
      b.parts.bass = i % 2 ? grid(0, 2, 4, 6, 8, 11, 14) : grid(0, 6, 15);
      b.parts.vox.tok[2] = String(i % 12);
      return b;
    }) };
    // Keep tails spanning bar boundaries and simultaneous/overlapping voices.
    if (length > 1) song.bars[1] = { parts: {}, events: [
      { part: 'chords', pitch: 60, onset: .75, duration: 1, velocity: 70 },
      { part: 'chords', pitch: 64, onset: .75, duration: 1, velocity: 70 },
      { part: 'lead', pitch: 62, onset: .75, duration: .5, velocity: 90 },
      { part: 'lead', pitch: 63, onset: .875, duration: .5, velocity: 90 },
    ] };
    const before = JSON.stringify(song);
    const exactCode = tape.songStrudel(song, 'test');
    const code = tape.songStrudelCompact(song, 'test');
    if (!exactCode) { assert.equal(code, null); continue; }
    const exact = events(await runtime.evaluate(exactCode), 0, length);
    const compact = events(await runtime.evaluate(code), 0, length);
    assert.deepEqual(canonical(compact), canonical(exact));
    assert.equal(JSON.stringify(song), before);
    assert.match(code, /No events simplified/);
  }
});

test('compact exports from a corrected tape agree with MIDI and the default writer', integration, async () => {
  const runtime = await strudelRuntime();
  for (const shift of [-.25, .5, 1.25]) {
    const t = tape.createTape(); t.lock(120.4, 0);
    for (let i = 0; i < 13; i++) {
      const b = musicalBar(); b.parts.vox.tok[2] = String(i % 12);
      t.pattern(i * 4, b.parts); t.harmony(i * 4, b.chord, b.bass, i % 2 ? 2 : 0);
    }
    t.shift(shift);
    const song = t.song(1), code = tape.songStrudelCompact(song, 'shift');
    const result = events(await runtime.evaluate(code), 0, song.bars.length);
    const exact = events(await runtime.evaluate(tape.songStrudel(song, 'shift')), 0, song.bars.length);
    assert.deepEqual(canonical(result), canonical(exact));
    assert.equal(result.length, [1, 2, 3, 4].reduce((n, track) => n + midiNotes(tape.songMidi(song, 'shift'), track).length, 0));
  }
});
