// The export's bass riff (renderer/tape.js riffNotes; engine.js records the bass tracker's notes by the 16th for it). Before,
// the export had at most one bass note a beat, so a 16th-note riff came out as its root notes, and the bench's bass score
// (is the right note sounding in this beat?) could not see it. Colin's ears could: "it's not the song, but it's not a bad
// song" (Around the World, Nov 10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { riffNotes, barEvents, createTape } from '../renderer/tape.js';

const show = (notes) => notes.map((n) => `${n.pitch}@${n.onset * 16}+${n.duration * 16}`).join(' ');
const _ = null;

test('a note starts where the note changes, and lasts till the next one or a rest', () => {
  assert.equal(show(riffNotes([40, 40, _, 38, 38, 36, 36, 36, 35, 35, 33, 33, 31, 31, 31, 31])), '40@0+2 38@3+2 36@5+3 35@8+2 33@10+2 31@12+4');
});

test("one step's stray reading between two steps of the same note is that note", () => {
  assert.equal(show(riffNotes([40, 40, 52, 40, 40, 40, 40, 40, _, _, _, _, _, _, _, _])), '40@0+8');
  // (but two steps of another note are a note)
  assert.equal(show(riffNotes([40, 40, 52, 52, 40, 40, _, _, _, _, _, _, _, _, _, _])), '40@0+2 52@2+2 40@4+2');
});

test("the bass's own rhythm starts a note again on the same pitch", () => {
  const on = Array(16).fill(false); on[0] = on[4] = on[8] = on[12] = true;
  assert.equal(show(riffNotes(Array(16).fill(36), on)), '36@0+4 36@4+4 36@8+4 36@12+4');
  assert.equal(show(riffNotes(Array(16).fill(36))), '36@0+16', 'with no rhythm known, one held note');
});

test('under a kick the bass is not heard for a moment: a note that shows up a step after a kick began on the kick', () => {
  const kick = Array.from({ length: 16 }, (_x, s) => s % 4 === 0);
  // (Ra Ma La Ma, as it came out: every on-beat note a 16th late, the one between beats on time)
  assert.equal(show(riffNotes([_, 37, 37, _, _, 38, 38, 36, _, 37, 37, _, _, 32, 32, _], null, kick)), '37@0+3 38@4+3 36@7+1 37@8+3 32@12+3');
  // (Technologic: the kick's own note, a G alone on every beat, is not a bass note)
  assert.equal(show(riffNotes([43, _, _, _, 43, _, 36, 36, 43, _, _, 38, 43, _, 41, 41], null, kick)), '36@6+2 38@11+1 41@14+2');
  // a short note carried across a kick stays one note; with no kick pattern, nothing moves
  assert.equal(show(riffNotes([_, _, 36, 36, 36, _, _, 40, 40, 40, _, _, _, _, _, _], null, kick)), '36@2+3 40@7+3');
  assert.equal(show(riffNotes([_, 37, 37, _, _, 38, 38, 36, _, _, _, _, _, _, _, _])), '37@1+2 38@5+2 36@7+1');
});

test('a note held 4 steps or more through a kick is struck again on the kick', () => {
  const kick = Array.from({ length: 16 }, (_x, s) => s % 4 === 0);
  assert.equal(show(riffNotes([36, 36, 36, 36, 36, 36, 36, 36, 36, 36, _, _, _, _, _, _], null, kick)), '36@0+4 36@4+4 36@8+2');
  assert.equal(show(riffNotes([36, 36, 36, 36, 36, 36, 36, 36, 36, 36, _, _, _, _, _, _])), '36@0+10', 'with no kick known, held');
});

test("a hole the kick leaves in the riff is filled with the beat's note, as a note of its own", () => {
  const kick = Array.from({ length: 16 }, (_x, s) => s % 4 === 0);
  // (the tracker lost the bass on beat 3 and the step after it; beat 1's note showed up a step late, so it began on the kick)
  const steps = [_, 38, 38, 38, 38, 38, _, _, _, _, 41, 41, 41, 41, 41, 41];
  assert.equal(show(riffNotes(steps, null, kick, [38, 38, 43, 41])), '38@0+4 38@4+2 43@8+2 41@10+2 41@12+4');
  // a hole away from the kick is the riff's own rest: kept
  assert.equal(show(riffNotes([36, 36, _, _, 36, 36, _, 38, 38, 38, 38, 38, 38, 38, 38, 38], null, kick, [36, 36, 38, 38])), '36@0+2 36@4+2 38@7+1 38@8+4 38@12+4');
  // no beats: no fill
  assert.equal(show(riffNotes(steps, null, kick)), '38@0+4 38@4+2 41@10+2 41@12+4');
});

test('fewer than four steps with a note: no riff, the bar falls back to its beats or its one note', () => {
  assert.equal(riffNotes([40, _, _, 40, _, _, _, _, _, _, _, _, _, _, _, _]), null);
  assert.equal(riffNotes(null), null);
  const bar = { parts: {}, chord: null, bass: 36, beats: [36, 36, 43, 43], steps: [36, _, _, 43, _, _, _, _, _, _, _, _, _, _, _, _] };
  assert.deepEqual(barEvents(bar).filter((e) => e.part === 'bass').map((e) => [e.pitch, e.onset, e.duration]), [[36, 0, 0.5], [43, 0.5, 0.5]]);
});

test('a bar with a riff exports the riff, not one note a beat', () => {
  const steps = [40, 40, _, 38, 38, 36, 36, 36, 35, 35, 33, 33, 31, 31, 31, 31];
  const bass = barEvents({ parts: {}, chord: null, bass: 40, beats: [40, 36, 35, 31], steps }).filter((e) => e.part === 'bass');
  assert.equal(bass.length, 6);
  assert.deepEqual(bass.map((e) => e.pitch), [40, 38, 36, 35, 33, 31]);
});

test('the tape keeps the steps with the bar, and the song carries the riff out', () => {
  const tape = createTape();
  tape.lock(120, 0);
  const steps = [40, 40, _, 38, 38, 36, 36, 36, 35, 35, 33, 33, 31, 31, 31, 31];
  for (let bar = 0; bar < 6; bar++) {
    tape.pattern(bar * 4, { bd: Array.from({ length: 16 }, (_x, s) => s % 4 === 0) }, bar * 2);
    tape.harmony(bar * 4, null, 40, 0, [40, 36, 35, 31], steps);
  }
  const song = tape.song(0);
  const bass = song.bars[2].events.filter((e) => e.part === 'bass');
  assert.deepEqual(bass.map((e) => [e.pitch, e.onset * 16, e.duration * 16]), [[40, 0, 2], [38, 3, 2], [36, 5, 3], [35, 8, 2], [33, 10, 2], [31, 12, 4]]);
  assert.ok(bass.every((e) => !('riff' in e)), 'the marker stays inside the tape');
  // an old caller, with no steps: as before
  const old = createTape(); old.lock(120, 0);
  for (let bar = 0; bar < 6; bar++) { old.pattern(bar * 4, { bd: Array(16).fill(false) }, bar * 2); old.harmony(bar * 4, null, 40, 0, [40, 36, 35, 31]); }
  assert.equal(old.song(0).bars[2].events.filter((e) => e.part === 'bass').length, 4);
});

test('the engine counts the bass by the 16th beside its count by the beat, and only the tape is handed it', () => {
  const eng = readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8');
  assert.match(eng, /sn: new Uint16Array\(16\), steps: Array\.from\(\{ length: 16 \}, \(\) => new Map\(\)\)/);
  assert.match(eng, /stepOf\(t\) \{/);
  assert.match(eng, /this\.tape\?\.harmony\([^\n]*steps\?\.some\(\(m\) => m !== null\) \? steps : null\);/);
  // nothing the page draws reads the steps: the live code's bass line is as it was (codegen.js reads eng.bassBeats)
  for (const f of ['codegen.js', 'codeview.js', 'app.js', 'visuals.js', 'dominoes.js', 'game.js']) {
    const src = readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8');
    assert.ok(!/riffNotes|\.steps\b[^;\n]*bass|bt\.bars/.test(src), f + ' reads the riff');
  }
});
