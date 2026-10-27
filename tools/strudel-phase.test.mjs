import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writer, hasStrudel, strudelRuntime, events } from './strudel-test-runtime.mjs';
const { buildLines, resetCodegen, strudelProgram, strudelLink } = writer;
const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
const handler = app.slice(app.indexOf('function openInStrudel()'), app.indexOf('// What went wrong starting the camera'));
const song = { title: 'Phase test', artist: 'Audit' };
function open(texts, bar, native = true) {
  let url;
  vm.runInNewContext(handler + '\nopenInStrudel();', {
    eng: { bar }, lineTexts: () => texts, currentSong: () => song, strudelProgram, strudelLink,
    window: native ? { nc: { openStrudel: (link) => { url = link; } } } : { open: (link) => { url = link; } },
    flashStatus() {},
  });
  return Buffer.from(decodeURIComponent(url.split('#')[1]), 'base64').toString('utf8');
}
function textsFor(bass, chords, bassBeats = null) {
  resetCodegen();
  const eng = {
    tempo: { locked: true, bpm: 120, shown: 120 }, bar: 0, silent: false, key: null,
    lastDrop: -100, lastKick: 0, knobs: { bassLpf: 800, chordLpf: 2000, hhGain: .5 },
    slots: bass.map((note, i) => ({ bass: note, chord: { name: chords[i] } })), bassBeats,
    v: Object.fromEntries(['bd', 'sd', 'hhc', 'hho', 'bass', 'vox'].map((id) => [id, {
      shown: Array.from({ length: 16 }, (_, step) => step === 0), tok: ['0'],
    }])), present: () => true, playing: () => true,
  };
  return Object.fromEntries(Object.entries(buildLines(eng, { song }, 0)).map(([id, parts]) => [id, parts.map((p) => p.text).join('')]));
}

test('default and zero-phase Strudel output retain the original bytes', () => {
  const texts = { tempo: 'setcpm(120/4)', bassline: 'bassline: note("<c2 d2 e2 f2>").s("sawtooth")' };
  const expected = '// "Phase test" by Audit, written out by toaster\n// ctrl+enter plays it, ctrl+. stops\nsetcpm(120/4)\n\nbassline: note("<c2 d2 e2 f2>").s("sawtooth")\n\n// everything that\'s playing as a punchcard under the code\nall(x => x._punchcard())\n';
  assert.equal(strudelProgram(texts, song), expected);
  assert.equal(strudelProgram(texts, song, 0), expected);
  assert.equal(open(texts, 0), expected);
});

test('the actual O handler normalizes engine bars for native and browser links', () => {
  for (const bar of [null, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 9]) {
    const phase = ((bar % 4) + 4) % 4;
    for (const native of [true, false]) assert.equal(open({}, bar, native), strudelProgram({}, song, phase));
  }
});

const integration = { skip: hasStrudel ? false : 'Install test-only Strudel packages or set STRUDEL_TEST_MODULES (see tools/strudel-test-runtime.mjs)' };
test('O starts cycle zero on slot k bass and chord for k = 0..3 using Strudel', integration, async () => {
  const runtime = await strudelRuntime();
  const bass = ['c2', 'd2', 'e2', 'f2'], chords = ['C', 'Dm', 'Em', 'F'];
  const texts = textsFor(bass, chords);
  for (let k = 0; k < 4; k++) {
    const before = runtime.punchcards;
    const pattern = await runtime.evaluate(open(texts, k));
    assert.equal(runtime.punchcards, before + 1, 'punchcard transform still runs');
    const first = events(pattern, 0);
    assert.deepEqual(first.filter((e) => e.value.s === 'sawtooth').map((e) => e.value.note), [bass[k]]);
    const chord = await runtime.evaluate(`chords: chord("${chords[k]}").voicing().s("supersaw").lpf(slider(2000, 200, 9000))`);
    assert.deepEqual(first.filter((e) => e.value.s === 'supersaw'), events(chord, 0));
  }
});

test('O shifts nested weighted/repeated bass, four-bar drums and lead together, keeping mutes', integration, async () => {
  const runtime = await strudelRuntime();
  const texts = textsFor(['c2', 'c2', 'e2', 'f2'], ['C', 'C', 'Em', 'F'], [
    [36, 36, 36, 31], [36, 36, 36, 31], [40, 40, 43, 43], [41, 41, 41, 41],
  ]);
  assert.match(texts.bassline, /\[c2@3 g1\]!2/);
  assert.match(texts.chords, /C!2/);
  texts.bd = 'kick: s("<bd [bd bd] ~ bd*4>").bank("RolandTR909")';
  texts.sd = '_clap: s("<cp ~ cp cp*2>")';
  texts.hho = '// hho: s("oh")';
  texts.vox = 'vox: s("vox").slice(16, "<0 2!2 5>").clip(1)';
  const original = await runtime.evaluate(strudelProgram(texts, song));
  for (let k = 0; k < 4; k++) {
    const shifted = await runtime.evaluate(open(texts, k));
    assert.deepEqual(events(shifted, 0, 4), events(original, k, 4), 'all events start at slot ' + k);
    assert.ok(!events(shifted, 0, 4).some((e) => ['cp', 'oh'].includes(e.value.s)));
  }
});
