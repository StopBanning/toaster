// The export's tempo, with hindsight (renderer/tape.js fitTempo): X writes ONE tempo for the whole song. The engine's last reading
// is right to a few hundredths of a BPM, which over two and a half minutes slid the first bars 60 ms and more off the record
// (0.5.5 on the bench, Nov 10: exported kicks 0.32 against the stems, 0.52 with the tempo refitted). Now each bar is kept with
// the time of its bar line and a line is fitted through all of them. Nothing the listener sees uses this: only what X writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tape, grid } from './export-fidelity-fixtures.mjs';
const { createTape, fitTempo, songStrudel, songMidi } = tape;

// a tape of n bars, each exactly `barSec` after the last, whose engine last said `lastBpm`
const made = (n, barSec, lastBpm, { time = true, t0 = 3.2 } = {}) => {
  const t = createTape(); t.lock(lastBpm, 0);
  for (let i = 0; i < n; i++) t.pattern(i * 4, { bd: grid(0, 4, 8, 12) }, time ? t0 + i * barSec : undefined);
  return t;
};

test('bars exactly two seconds apart export 120, whatever the last reading said', () => {
  const song = made(40, 2, 120.06).song(0);
  assert.equal(song.bpm, 120);
  assert.equal(song.bpmLast, 120.06);
  assert.ok(Math.abs(song.origin - 3.2) < 1e-6, 'the first beat is where the first bar line was');
  assert.match(songStrudel(song, 'fitted'), /setcpm\(120\/4\)/);
  // (the MIDI file's tempo is the same one: microseconds a beat)
  const midi = Buffer.from(songMidi(song, 'fitted')), at = midi.indexOf(Buffer.from([0xff, 0x51, 0x03]));
  assert.equal(midi.readUIntBE(at + 3, 3), 500000);
});

test('a few bars off the line, and a beat the engine moved, do not pull it', () => {
  const t = createTape(); t.lock(119.95, 0);
  for (let i = 0; i < 48; i++) {
    if (i === 20) t.shift(0.25); // (the engine found it was a 16th out: every bar before is on a beat a 16th off, and the tape knows)
    const wobble = [7, 8, 9].includes(i) ? 0.11 : 0, moved = i >= 20 ? 0.125 : 0; // (a 16th at 120 is 125 ms: its grid from here on)
    t.pattern(i * 4, { bd: grid(0, 4, 8, 12) }, 5 + i * 2 + wobble + moved);
  }
  assert.equal(t.song(0).bpm, 120);
});

test('too little to go on, or a different tempo altogether: the last reading stays', () => {
  const short = made(12, 2, 120.06).song(0);
  assert.equal(short.bpm, 120.06);
  assert.equal(short.origin, undefined);
  assert.equal(made(40, 2, 117.5).song(0).bpm, 117.5, 'a fit 2% from the last reading is a different tempo, not a better one');
  assert.equal(fitTempo([], 120), null);
});

test('the last reading, when it is the one used, is written to a thousandth of a BPM', () => {
  const song = made(12, 2, 121.28912982522772).song(0);
  assert.equal(song.bpm, 121.289);
  assert.match(songStrudel(song, 'rounded'), /setcpm\(121\.289\/4\)/);
});

test('bars kept without a time (older callers, the fixtures) export exactly as before', () => {
  const song = made(40, 2, 120.4, { time: false }).song(0);
  assert.equal(song.bpm, 120.4);
  assert.ok(!('bpmLast' in song) && !('origin' in song));
  assert.match(songStrudel(song, 'as before'), /setcpm\(120\.4\/4\)/);
});

test('a real tempo with jitter on every bar line comes out within a hundredth of a BPM', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  const P = 60 / 122.456, t = createTape(); t.lock(122.354, 0); // (Funkytown on the bench: exported 122.354, fits the record at 122.456)
  for (let i = 0; i < 76; i++) t.pattern(i * 4, { bd: grid(0, 4, 8, 12) }, 1.7 + i * 4 * P + rnd() * 0.02);
  const song = t.song(0);
  assert.ok(Math.abs(song.bpm - 122.456) < 0.01, `fitted ${song.bpm}`);
});

test('the engine hands each bar line its own time on the beat grid, and only the export reads it', () => {
  const engine = fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8');
  assert.match(engine, /this\.tape\.pattern\(bar \* 4 \+ T\.down, parts, T\.t0 \+ \(bar \* 4 \+ T\.down - T\.n0\) \* T\.P\);/);
  // (nothing live: no code line, scene or reaction reads the fitted tempo)
  for (const f of fs.readdirSync(new URL('../renderer/', import.meta.url)).filter((x) => x.endsWith('.js') && x !== 'tape.js')) {
    const src = fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8');
    assert.ok(!/fitTempo|bpmLast/.test(src), f + ' reads the fitted tempo');
  }
});
