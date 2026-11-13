// The export's melody from what Basic Pitch hears (renderer/melody.js): the path through its frames, the top line of its notes,
// and their place on the export's bars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topLine, pathLine, placeLead, placeBass } from '../renderer/melody.js';

test('the top line keeps the highest note where notes stack, drops quiet ones and ones out of the voice\'s range, and never overlaps', () => {
  const notes = [
    [0.0, 1.0, 60, 0.8], // C4 under...
    [0.0, 1.0, 67, 0.8], // ...G4: the top note wins
    [1.0, 0.5, 64, 0.1], // too quiet
    [1.0, 0.5, 40, 0.9], // a bass note: out of range
    [1.2, 0.6, 69, 0.7], // A4
    [1.5, 0.5, 71, 0.7], // B4 starts before A4 ends: A4 is cut where B4 begins
  ];
  assert.deepEqual(topLine(notes).map(([t, d, m]) => [t, +d.toFixed(2), m]), [[0, 1, 67], [1.2, 0.3, 69], [1.5, 0.5, 71]]);
});

test('an overtone heard as a note of its own (an octave, an octave and a fifth, two octaves up) is left out of the line', () => {
  const notes = [
    [0.0, 0.5, 64, 0.6], [0.0, 0.4, 76, 0.4], [0.05, 0.3, 88, 0.35], // E4, its octave and two octaves: E4 is the tune
    [1.0, 0.5, 60, 0.6], [1.0, 0.5, 79, 0.5], // C4 and the G an octave and a fifth up: C4
    [2.0, 0.5, 62, 0.4], [2.0, 0.5, 74, 0.8], // D5 twice as loud as the D4 an octave under it: a sung note, not an overtone
    [3.0, 0.5, 48, 0.9], [3.0, 0.5, 60, 0.5], // a C3 out of the line's range under C4: the line has nothing else there, C4 stays
  ];
  assert.deepEqual(topLine(notes).map(([t, , m]) => [t, m]), [[0, 64], [1, 60], [2, 74], [3, 60]]);
});

test('placed on the bars: on the export\'s 16ths, two notes as long as each other on one step keep the first, none crosses its bar, the song\'s own lead replaced only where the line is', () => {
  const bar = () => ({ parts: {}, events: [{ part: 'lead', pitch: 50, onset: 0, duration: 1 / 16, velocity: 90 }, { part: 'bd', pitch: 36, onset: 0, duration: 1 / 16, velocity: 110 }] });
  const song = { bpm: 120, bars: [bar(), bar(), bar(), bar()] }; // (a bar is 2 s)
  const origin = 10;
  const line = [[12.0, 0.25, 60], [12.001, 0.25, 62], [12.5, 2.0, 64]]; // bar 1: C4 at 0, D4 on the same step (dropped), E4 at 1/4 held past the bar
  const out = placeLead(song, line, origin);
  const lead = (i) => out.bars[i].events.filter((e) => e.part === 'lead').map((e) => [e.pitch, e.onset, e.duration]);
  assert.deepEqual(lead(1), [[60, 0, 8 / 64], [64, 16 / 64, 48 / 64]]);
  assert.deepEqual(lead(0), [[50, 0, 1 / 16]], 'a bar before the line keeps its own lead');
  assert.deepEqual(lead(2), [[50, 0, 1 / 16]], 'and after');
  assert.ok(out.bars[1].events.some((e) => e.part === 'bd'), 'the drums stay');
  assert.equal(song.bars[1].events.filter((e) => e.part === 'lead').length, 1, 'the song given is not changed');
});

test('nothing to place, or no tempo or origin: the song as it was', () => {
  const song = { bpm: 120, bars: [{ parts: {}, events: [] }] };
  assert.equal(placeLead(song, [], 0), song);
  assert.equal(placeLead({ ...song, bpm: 0 }, [[0, 1, 60]], 0).bpm, 0);
  assert.equal(placeLead(song, [[0, 1, 60]], NaN), song);
});

test('two notes on one step: the longer is written (a slide into a note does not take the note\'s place); equally long, the first', () => {
  const song = { bpm: 120, bars: [{ events: [] }] }; // (a bar is 2 s, a 16th 0.125 s)
  const out = placeLead(song, [[10.0, 0.05, 62], [10.05, 0.4, 64], [11.0, 0.2, 67], [11.01, 0.2, 69]], 10);
  assert.deepEqual(out.bars[0].events.map((e) => [e.pitch, e.onset * 16, e.duration * 16]), [[64, 0, 3], [67, 8, 2]]);
});

test('the tune lands on 16ths, like every other part: a note a 64th late is on its 16th, a short note is one step long', () => {
  const song = { bpm: 120, bars: [{ events: [] }] }; // (a bar is 2 s, a 16th 0.125 s)
  const out = placeLead(song, [[10 + 0.25 + 2 / 64, 0.04, 67], [10 + 1.0, 0.5, 69]], 10);
  assert.deepEqual(out.bars[0].events.map((e) => [e.pitch, e.onset * 16, e.duration * 16]), [[67, 2, 1], [69, 8, 4]]);
});

// (120 bpm: a bar is 2 s, a 16th 0.125 s; bar 0 starts at 10)
const bassOf = (song, i) => song.bars[i].events.filter((e) => e.part === 'bass').map((e) => [e.pitch, e.onset * 16, e.duration * 16]);
const bassSong = () => ({ bpm: 120, bars: [
  { events: [{ part: 'bass', pitch: 33, onset: 0, duration: 4 / 16, velocity: 80 }, { part: 'bd', onset: 0 }] },
  { events: [{ part: 'bass', pitch: 36, onset: 8 / 16, duration: 2 / 16, velocity: 80 }] },
] });

test('the bass: Basic Pitch\'s low notes fill the rests only; the engine\'s own notes, other parts and untouched bars stay as they were', () => {
  const song = bassSong();
  const notes = [
    [10 + 0.125, 0.25, 40, 0.6], // over the engine's own A1 (steps 1-2): not written
    [10 + 1.0, 0.25, 38, 0.6], // steps 8-9 of bar 0, a rest: written
    [10 + 1.5, 0.25, 60, 0.9], // middle C: not a bass note
    [10 + 1.75, 0.25, 41, 0.1], // too quiet
  ];
  const out = placeBass(song, notes, 10);
  assert.deepEqual(bassOf(out, 0), [[33, 0, 4], [38, 8, 2]]);
  assert.deepEqual(out.bars[0].events.find((e) => e.part === 'bass' && e.pitch === 33).velocity, 80, 'the engine\'s note keeps its loudness');
  assert.ok(out.bars[0].events.some((e) => e.part === 'bd'), 'the drums are still there');
  assert.equal(out.bars[1], song.bars[1], 'a bar no note reaches is the same bar');
  assert.equal(placeBass(song, [], 10), song);
  assert.equal(placeBass(song, notes, NaN), song);
});

test('the bass: the same note an octave apart where the two meet is one note going on; a note struck again by Basic Pitch alone is held', () => {
  const song = bassSong();
  // A2 (45) right after the engine's A1 (33) ends at step 4, not struck there (it began under the engine's note): A1 goes on
  const joined = placeBass(song, [[10 + 0.25, 0.5, 45, 0.6]], 10);
  assert.deepEqual(bassOf(joined, 0), [[33, 0, 6]]);
  // two D2s back to back in a rest, the engine's bass starting nothing near: one held note
  const held = placeBass(song, [[10 + 1.0, 0.25, 38, 0.6], [10 + 1.25, 0.25, 38, 0.6]], 10);
  assert.deepEqual(bassOf(held, 0), [[33, 0, 4], [38, 8, 4]]);
  // a different note is a new note
  const moved = placeBass(song, [[10 + 1.0, 0.25, 38, 0.6], [10 + 1.25, 0.25, 40, 0.6]], 10);
  assert.deepEqual(bassOf(moved, 0), [[33, 0, 4], [38, 8, 2], [40, 10, 2]]);
});

// Basic Pitch's frames, made by hand: rows of 88 (A0 = 21), `on(rows, midi, from, to, strength)` sounds a note over frames
const blank = (n) => Array.from({ length: n }, () => new Float32Array(88));
const on = (rows, midi, from, to, strength) => { for (let f = from; f < to; f++) rows[f][midi - 21] = strength; return rows; };
const shape = (line) => line.map(([f, n, m]) => [f, n, m]);

test('the path holds the note that sounds, rests under the floor, and leaves out a blip', () => {
  const rows = blank(100);
  on(rows, 64, 10, 60, 0.6);  // E4 for 50 frames
  on(rows, 60, 0, 100, 0.1);  // a murmur under the floor all through: never a note
  on(rows, 72, 70, 73, 0.5);  // three frames of C5: a blip
  const line = pathLine(rows);
  assert.deepEqual(shape(line), [[10, 50, 64]]);
  assert.ok(Math.abs(line[0][3] - 0.6) < 1e-6, 'with the note\'s mean strength');
  assert.deepEqual(pathLine([]), []);
});

test('the path stays on its note through a flicker of another, and moves when the tune does', () => {
  const rows = blank(120);
  on(rows, 64, 0, 60, 0.6);
  for (let f = 5; f < 60; f += 5) on(rows, 67, f, f + 1, 0.7); // G4 a touch stronger for one frame in five: not the tune moving
  on(rows, 66, 60, 120, 0.6); // then F#4
  assert.deepEqual(shape(pathLine(rows)), [[0, 60, 64], [60, 60, 66]]);
});

test('an overtone an octave over a louder note is not the tune; a sung note louder than the one under it is', () => {
  const rows = blank(80);
  on(rows, 60, 0, 40, 0.6); on(rows, 72, 0, 40, 0.5);   // C4 and its octave: C4
  on(rows, 62, 40, 80, 0.4); on(rows, 74, 40, 80, 0.8); // D5 twice as strong as the D4 under it: D5
  const got = shape(pathLine(rows)); // (a leap of more than an octave goes through a frame of rest: it is the dearest move since Nov 12)
  assert.deepEqual(got.map(([, , m]) => m), [60, 74]);
  assert.ok(got[0][0] === 0 && got[0][1] >= 39 && got[1][0] <= 42 && got[1][0] + got[1][1] === 80, JSON.stringify(got));
});

test('a held pitch is struck again where Basic Pitch starts a note of its own on it: not at once after another, not at the very end, not for another pitch', () => {
  const rows = on(blank(60), 66, 0, 60, 0.6);
  on(rows, 66, 18, 20, 0.25); // the voice's strength falls for two frames before the new syllable
  const strikes = [[20, 66], [22, 66], [58, 66], [30, 70], [2, 66]];
  assert.deepEqual(shape(pathLine(rows, { strikes })), [[0, 20, 66], [20, 40, 66]]);
  assert.deepEqual(shape(pathLine(rows)), [[0, 60, 66]], 'with no strikes, one note');
  // and since Nov 12: a start Basic Pitch hears on a note that never falters is the same note going on (it gave six strikes on one held F#4)
  assert.deepEqual(shape(pathLine(on(blank(60), 66, 0, 60, 0.6), { strikes })), [[0, 60, 66]], 'no dip, no new strike');
});

test('an octave and back inside a phrase is not sung: the path keeps its octave through a blink of rest', () => {
  const rows = blank(90);
  on(rows, 66, 0, 30, 0.6);            // F#4
  on(rows, 78, 31, 39, 0.75);          // eight frames of F#5 a little stronger, one frame of nothing before it
  on(rows, 66, 31, 39, 0.5);           // while F#4 goes on under it
  on(rows, 66, 40, 90, 0.6);           // and F#4 again
  assert.ok(pathLine(rows).every(([, , m]) => m === 66), JSON.stringify(shape(pathLine(rows))));
  assert.ok(pathLine(rows, { octave: 1, forget: 0, enter: 0, jump: 0.3, floor: 0.2, shortest: 6, dip: 0, bridge: 0 }).some(([, , m]) => m === 78), 'the old path took the hop');
});
