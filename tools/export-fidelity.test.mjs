import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writer, hasStrudel, strudelRuntime, events } from './strudel-test-runtime.mjs';
import { tape, grid, bar, chord, musicalBar, midiNotes } from './export-fidelity-fixtures.mjs';
const { songStrudel, songSections, songMidi, createTape } = tape;
const integration = { skip: hasStrudel ? false : 'Set STRUDEL_TEST_MODULES to the test-only Strudel packages' };

test('short, changing, unique and harmony-only sections retain accepted pitched notes', integration, async () => {
  const runtime = await strudelRuntime();
  const fixtures = [
    Array.from({ length: 4 }, musicalBar),
    Array.from({ length: 12 }, (_, i) => i < 4 || i >= 8 ? musicalBar() : bar({ parts: { sd: grid(4, 12) } })),
    Array.from({ length: 12 }, (_, i) => bar({ chord, parts: { vox: { on: grid(i), tok: Array(16).fill(String(i)) } } })),
    Array.from({ length: 5 }, () => bar({ chord, parts: {} })),
    [bar({ parts: {} }), bar({ chord, parts: { vox: { on: grid(15), tok: Array(16).fill('7') } } }), ...Array.from({ length: 6 }, () => bar({ parts: {} }))],
  ];
  for (const bars of fixtures) {
    const song = { bpm: 120, bars };
    const es = events(await runtime.evaluate(songStrudel(song, 'pitched fixture')), 0, bars.length);
    assert.equal(es.filter((e) => e.value.s === 'supersaw').length, bars.filter((b) => b.chord).length * 3);
    assert.equal(es.filter((e) => e.value.s === 'triangle').length, bars.reduce((n, b) => n + (b.parts.vox?.on.filter(Boolean).length || 0), 0));
    assert.equal(midiNotes(songMidi(song, 'fixture'), 4).length, es.filter((e) => e.value.s === 'triangle').length);
  }
});

test('exact compression retains 65 fill kicks and 144 changing-rhythm kicks', integration, async () => {
  const runtime = await strudelRuntime();
  const fill = { bpm: 120, bars: Array.from({ length: 16 }, () => bar()) };
  fill.bars[15].parts.bd[15] = true;
  const change = { bpm: 120, bars: Array.from({ length: 32 }, (_, i) => bar({ parts: { bd: i < 16 ? grid(0, 4, 8, 12) : grid(0, 2, 4, 8, 12) } })) };
  for (const [song, count] of [[fill, 65], [change, 144]]) {
    const es = events(await runtime.evaluate(songStrudel(song, 'rhythm fixture')), 0, song.bars.length);
    assert.equal(es.length, count);
    assert.deepEqual(es.map((e) => e.begin), song.bars.flatMap((b, i) => b.parts.bd.flatMap((on, s) => on ? [i + s / 16] : [])));
    assert.equal(songSections(song).parts.length, 2);
  }
  assert.equal(songSections({ bpm: 120, bars: Array.from({ length: 64 }, musicalBar) }).parts.length, 1);
});

test('X retains precise tempo and identifies every captured stretch and the selected coverage', () => {
  const t = createTape(); t.lock(120.4, 0);
  for (let i = 0; i < 6; i++) t.pattern(i * 4, { bd: grid(0) });
  t.lock(90, 0);
  for (let i = 0; i < 4; i++) t.pattern(i * 4, { sd: grid(4, 12) });
  const song = t.song(0), code = songStrudel(song, 'coverage');
  assert.equal(song.bars.length, 6);
  assert.match(code, /setcpm\(120\.4\/4\)/);
  assert.match(code, /stretch 1\/2; 6\/10 recorded bars/);
  const c = JSON.parse(code.split('\n').find((line) => line.startsWith('// Capture coverage: ')).slice(21));
  assert.equal(c.selectedStretch, 1);
  assert.deepEqual(c.stretches.map((st) => [st.stretch, st.bpm, st.bars]), [[1, 120.4, 6], [2, 90, 4]]);
  assert.equal(c.recordedBars, 10);
  assert.equal(c.recordedSeconds, 6 * 240 / 120.4 + 4 * 240 / 90);
  // A short new song still exports the previous song's coverage with its own title.
  t.reset(0); t.lock(100, 0); t.pattern(0, { bd: grid(0) });
  assert.deepEqual(t.song(0).coverage, c);
});

const midiPitch = (name) => {
  const m = /^([a-g])([#b]?)(-?\d+)$/.exec(name);
  return (Number(m[3]) + 1) * 12 + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const byNote = (a, b) => a.begin - b.begin || a.note - b.note;
async function assertParity(song) {
  const runtime = await strudelRuntime();
  const code = songStrudel(song, 'parity');
  const es = code ? events(await runtime.evaluate(code), 0, song.bars.length) : [];
  const bytes = songMidi(song, 'parity');
  for (const [sound, track] of [['sawtooth', 2], ['supersaw', 3], ['triangle', 4]]) {
    assert.deepEqual(es.filter((e) => e.value.s === sound).map((e) => ({ note: midiPitch(e.value.note), begin: e.begin, end: e.end, velocity: Math.round(e.value.velocity * 127) })).sort(byNote), midiNotes(bytes, track), sound);
  }
  const pitch = { bd: 36, cp: 39, hh: 42, oh: 46 };
  assert.deepEqual(es.filter((e) => e.value.s in pitch).map((e) => ({ note: pitch[e.value.s], begin: e.begin, end: e.end, velocity: Math.round(e.value.velocity * 127) })).sort(byNote), midiNotes(bytes, 1), 'drums');
  return es;
}

test('O, X and MIDI use C4 lead; X and MIDI share bass, chord and drum note events', integration, async () => {
  const runtime = await strudelRuntime();
  const o = events(await runtime.evaluate(writer.strudelProgram({ vox: 'vox: s("vox").slice(16, "0").clip(1)' }, null)), 0);
  assert.equal(o[0].value.note, 'c4');
  const song = { bpm: 120, bars: Array.from({ length: 8 }, musicalBar) };
  song.bars[0].parts.bass = grid(0, 6, 8);
  song.bars[1].parts.bass = grid(0); // still a beat, not a whole-bar note
  song.bars[2].beats = [36, 38, 40, 41];
  song.bars[2].parts.bass = grid(0, 6, 8, 15);
  song.bars[3].beats = [36, 36, 31, 31]; delete song.bars[3].parts.bass;
  song.bars[4].bass = null; song.bars[4].beats = null; delete song.bars[4].parts.bass;
  song.bars[5].parts.vox.tok[2] = '11';
  song.bars[6].parts = { hhc: grid(0, 2, 5, 7, 12, 15), hho: grid(3, 8), sd: grid(4, 12) };
  song.bars[7] = bar({ parts: {}, bass: 36 });
  const es = await assertParity(song);
  assert.equal(es.find((e) => e.value.s === 'triangle').value.note, o[0].value.note);
  assert.deepEqual(es.filter((e) => e.value.s === 'sawtooth' && e.begin < 1).map((e) => e.end - e.begin), [.25, .125, .25]);
  assert.equal(es.find((e) => e.value.s === 'sawtooth' && e.begin === 1).end, 1.25);
});

const noteList = (song) => song.bars.flatMap((b, i) => tape.barEvents(b).map((e) => ({ ...e, onset: i + e.onset + (song.timeline?.originBeat || 0) / 4 }))).sort((a, b) => a.onset - b.onset || a.pitch - b.pitch || a.part.localeCompare(b.part));

test('phase shifts carry unique notes across bars with pitch, duration and velocity intact', integration, async () => {
  const bars = Array.from({ length: 8 }, (_, i) => bar({
    chord: { root: i, third: i % 2 ? 3 : 4, name: ['C', 'Dbm', 'D', 'Ebm', 'E', 'Fm', 'F#', 'Gm'][i] },
    bass: 36 + i, beats: [36 + i, 36 + i, 43 + i, 43 + i],
    parts: { bd: grid(i, 15), sd: grid(1, 14 - i), bass: grid(0, 6, 15), vox: { on: grid(0, i + 1, 15), tok: Array(16).fill(String(i)) } },
  }));
  for (const [shifts, down] of [[[.25], 0], [[-.25], 0], [[.5, -.25, .5], 0], [[-.25, .25], 0], [[.25], 1], [[-.25], 3]]) {
    const t = createTape(); t.lock(120, 0);
    bars.forEach((b, i) => { t.pattern(i * 4, b.parts); t.harmony(i * 4, b.chord, b.bass, 0, b.beats); });
    shifts.forEach((n) => t.shift(n));
    const result = t.song(down), offset = shifts.reduce((n, x) => n + x, 0) / 4 + down / 4;
    const expected = noteList({ bars }).map((e) => ({ ...e, onset: e.onset - offset }));
    assert.deepEqual(noteList(result), expected);
    assert.equal(result.timeline.pickupPolicy, 'keep');
    await assertParity(result);
    // Exporting twice does not apply the correction twice or mutate the recorded arrays.
    assert.deepEqual(t.song(down), result);
  }
});

test('phase changes between recorded bars use each snapshot absolute position and common origin', integration, async () => {
  const t = createTape(); t.lock(120, 0);
  const expected = [];
  let moved = 0;
  for (let i = 0; i < 6; i++) {
    if (i === 2) { t.shift(.25); moved += .25; }
    if (i === 4) { t.shift(-.5); moved -= .5; }
    const b = musicalBar(); b.parts.vox.tok[2] = String(i);
    t.pattern(i * 4, b.parts); t.harmony(i * 4, b.chord, b.bass, 0, b.beats);
    expected.push(...tape.barEvents(b).map((e) => ({ ...e, onset: i + moved / 4 + e.onset })));
  }
  const result = t.song(0);
  const normalize = (es) => es.map((e) => ({ ...e, onset: e.onset - moved / 4 })).sort((a, b) => a.onset - b.onset || a.pitch - b.pitch || a.part.localeCompare(b.part));
  assert.deepEqual(noteList(result), normalize(expected));
  await assertParity(result);
});

test('a correction between pattern and harmony keeps the bass attacks and separate chord origin', integration, async () => {
  const t = createTape(); t.lock(120, 0);
  for (let i = 0; i < 4; i++) {
    const b = musicalBar(); b.parts.bass = grid(0, 6, 8);
    t.pattern(i * 4, b.parts);
    if (i === 1) t.shift(.25);
    t.harmony(i * 4, b.chord, b.bass);
  }
  const song = t.song(0), es = noteList(song);
  assert.equal(es.filter((e) => e.part === 'bass').length, 12);
  assert.deepEqual(es.filter((e) => e.part === 'bass').map((e) => e.duration).slice(0, 3), [.25, .125, .25]);
  assert.deepEqual(es.filter((e) => e.part === 'chords' && e.pitch === 48).map((e) => e.onset), [-1/16, 1, 2, 3]);
  await assertParity(song);
});

test('phrase boundaries, silent bars and incomplete final phrases round-trip every event', integration, async () => {
  for (const length of [1, 2, 3, 5, 6, 7, 11, 17, 31]) {
    const bars = Array.from({ length }, (_, i) => i % 5 === 0 ? bar({ parts: {} }) : bar({
      chord: i % 3 === 0 ? chord : null, bass: i % 4 === 0 ? 36 + i % 12 : null,
      parts: { bd: grid(i % 16, (i + 5) % 16), bass: grid(0, 6, 8), vox: { on: grid((i + 7) % 16), tok: Array(16).fill(String(i % 12)) } },
    }));
    await assertParity({ bpm: 120.4, bars });
  }
});

test('O bass export uses the shared durations while the displayed code stays intact', integration, async () => {
  const runtime = await strudelRuntime();
  for (const rhythm of [grid(0, 6, 8), grid(0), grid(3, 7, 10, 15)]) {
    const texts = { bassline: 'bassline: note("c2").struct("x*4").s("sawtooth").lpf(800)' };
    const before = JSON.stringify(texts);
    const o = events(await runtime.evaluate(writer.strudelProgram(texts, null, 0, rhythm)), 0).filter((e) => e.value.s === 'sawtooth');
    const bytes = songMidi({ bpm: 120, bars: [bar({ bass: 36, parts: { bass: rhythm } })] }, 'O durations');
    assert.deepEqual(o.map((e) => ({ note: midiPitch(e.value.note), begin: e.begin, end: e.end })), midiNotes(bytes, 2).map(({ velocity, ...e }) => e));
    assert.equal(JSON.stringify(texts), before);
    const plain = { bassline: 'bassline: note("c2").s("sawtooth")' };
    const plainO = events(await runtime.evaluate(writer.strudelProgram(plain, null, 0, rhythm)), 0);
    assert.deepEqual(plainO.map((e) => [e.begin, e.end]), o.map((e) => [e.begin, e.end]));
  }
});

test('O moving bass uses the pitch at each shared onset, including a note crossing a beat', integration, async () => {
  const runtime = await strudelRuntime();
  const rhythm = grid(3, 7, 10, 15);
  const texts = { bassline: 'bassline: note("[c2 d2 e2 f2]").s("sawtooth")' };
  const es = events(await runtime.evaluate(writer.strudelProgram(texts, null, 0, rhythm)), 0);
  const expected = midiNotes(songMidi({ bpm: 120, bars: [bar({ bass: 36, beats: [36, 38, 40, 41], parts: { bass: rhythm } })] }, 'moving O'), 2).map(({ velocity, ...e }) => e);
  assert.deepEqual(es.map((e) => ({ note: midiPitch(e.value.note), begin: e.begin, end: e.end })), expected);
});
