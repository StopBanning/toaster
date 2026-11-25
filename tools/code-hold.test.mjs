// The code on screen through a pause (samir, Nov 23: "once I pause it, the script disappears"). While the sound is gone the view keeps the lines it showed when
// the sound stopped, as they were, until sound comes back (renderer/codehold.js, wired in renderer/app.js); the engine hears as before. A quiet part of a song
// is not silence and still mutes as it should. The lines here are the code writer's own (codegen.js buildLines) on an engine that is as the page has one at a
// pause: its beat locked, its parts written, the sound going and then not.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLines, resetCodegen, strudelProgram, strudelLink, LINE_IDS } from '../renderer/codegen.js';
import { createCodeHold, pauseKnown, KEEP_S, WORD_AFTER_S } from '../renderer/codehold.js';
import { openedSaid } from '../renderer/tune.js';

const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8');
const text = (lines) => Object.fromEntries(LINE_IDS.map((id) => [id, lines[id].map((p) => p.text).join('')]));
const four = Array.from({ length: 16 }, (_, s) => s % 4 === 0);

// an engine as codegen reads it: the kick, clap and hat written, `present` the engine's answer for whether a part plays now
function engine() {
  resetCodegen();
  const e = {
    tempo: { locked: true, bpm: 130, shown: 130 }, bar: 0, silent: false, key: null, lastDrop: -100, lastKick: 0, lastSound: 0, knobs: { bassLpf: 800, chordLpf: 2000, hhGain: 0.5 }, slots: [], bassBeats: null,
    v: Object.fromEntries(['bd', 'sd', 'hhc', 'hho', 'bass', 'vox'].map((id) => [id, { shown: four.slice(), tok: ['0'] }])), playing: () => true,
    heard: { bd: true, sd: true, hhc: true, hho: true },
  };
  e.present = (id) => e.heard[id] !== false && !e.silent;
  return e;
}
const song = { title: 'Satisfaction', artist: 'Benny Benassi' };
const write = (e, t) => buildLines(e, { song, source: 'file' }, t);

// a pause, as the engine goes through it: sound until 10 s, silent from 11.2 s (1.2 s on), lines written on every refresh (every 40 ms)
function pause({ locked = true, seconds = 30, fade = true } = {}) {
  const e = engine(), hold = createCodeHold(), shown = [];
  e.tempo.locked = locked;
  let n = 0;
  for (let t = 0; t <= 10 + seconds; t += 0.04, n++) {
    e.silent = t > 11.2; if (!e.silent) e.lastSound = Math.min(t, 10);
    if (fade && t > 10 && t <= 11.2) e.knobs.hhGain = 0.5 - (t - 10) * 0.3; // (the numbers drift as the level falls)
    const lines = write(e, t);
    shown.push({ t, written: text(lines), got: hold.feed(t, lines, { silent: e.silent, lastSound: e.lastSound, locked: e.tempo.locked }) });
  }
  return { e, hold, shown };
}

test('the lines the engine writes at a pause are muted, drift and are wiped by the engine: that is what the view would show without the hold', () => {
  const { shown } = pause();
  const before = shown.find((s) => s.t >= 9.99).written, after = shown.find((s) => s.t >= 12).written;
  assert.match(before.bd, /^kick: s\(/);
  assert.match(after.bd, /^_kick: s\(/, 'muted once the sound has been gone 1.2 s');
});

test('while the sound is gone the view keeps the lines as they were when it stopped: not muted, not drifted, for as long as it is gone', () => {
  const { shown, hold } = pause({ seconds: 60 });
  const atStop = shown.find((s) => s.t >= 9.99).written;
  for (const s of shown.filter((x) => x.t > 11.3)) {
    assert.equal(s.got.paused, true, `held at ${s.t.toFixed(2)}`);
    assert.deepEqual(text(s.got.lines), atStop, `the lines of the moment the sound stopped, at ${s.t.toFixed(2)}`);
  }
  assert.equal(hold.holding, true);
  assert.match(atStop.bd, /^kick: s\("/);
  assert.match(atStop.hhc, /gain\(\.5\)/); // (a number he can copy, not the one the fade left)
  assert.match(shown.find((s) => s.t >= 12).written.hhc, /gain\(\.\d\d?\d*\)/);
  assert.notEqual(shown.find((s) => s.t >= 12).written.hhc.replace(/^_/, ''), atStop.hhc, 'the engine\'s own lines had drifted');
});

test('before the silence is noticed (the first 1.2 s of it) nothing is held yet, and the lines pass through', () => {
  const { shown } = pause();
  for (const s of shown.filter((x) => x.t <= 11.2)) assert.equal(s.got.paused, false);
});

test('the engine starting over (its silence reset, the code writer then writing only comments) does not wipe what is held', () => {
  const e = engine(), hold = createCodeHold();
  let held;
  for (let t = 0; t <= 10; t += 0.04) hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true });
  const live = text(write(e, 10));
  // the reset: unlocked, nothing learned, a new song's blank code
  e.silent = true; e.tempo.locked = false; e.lastSound = 14 - 4.1;
  resetCodegen();
  for (const id of ['bd', 'sd', 'hhc', 'hho']) e.v[id].shown = null;
  for (let t = 11.3; t <= 40; t += 0.04) held = hold.feed(t, write(e, t), { silent: true, lastSound: e.lastSound, locked: false });
  assert.equal(held.paused, true);
  assert.deepEqual(text(held.lines), live);
});

test('the engine\'s own reset can come before the view has noticed the silence: begin() takes the lines from when the sound stopped', () => {
  const e = engine(), hold = createCodeHold();
  for (let t = 0; t <= 10; t += 0.04) { e.lastSound = t; hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true }); }
  const live = text(write(e, 10));
  assert.equal(hold.begin(10.1), true);
  assert.equal(hold.holding, true);
  e.silent = true;
  const got = hold.feed(15, write(e, 15), { silent: true, lastSound: 10.1, locked: true });
  assert.deepEqual(text(got.lines), live);
});

test('sound coming back lets the live lines through again at once, and a second pause holds the lines of its own moment', () => {
  const e = engine(), hold = createCodeHold();
  const run = (from, to, silent, locked = true) => { let g; for (let t = from; t < to; t += 0.04) { e.silent = silent; if (!silent) e.lastSound = t; g = hold.feed(t, write(e, t), { silent, lastSound: e.lastSound, locked }); } return g; };
  run(0, 10, false);
  assert.equal(run(10, 20, true).paused, true);
  e.v.bd.shown = Array.from({ length: 16 }, (_, s) => s % 8 === 0); // (the song went on: the kick's line is different now)
  const back = run(20, 20.2, false);
  assert.equal(back.paused, false);
  assert.match(text(back.lines).bd, /\*|~/, 'the kick\'s live line');
  assert.notEqual(text(back.lines).bd, text(write(engine(), 0)).bd, 'not the held four on the floor');
  run(20.2, 30, false);
  const live2 = text(write(e, 29.99));
  const again = run(30, 40, true);
  assert.equal(again.paused, true);
  assert.deepEqual(text(again.lines), live2, 'the second pause holds the lines as they were at its own start');
});

test('nothing worth keeping (the beat was never found: the view says "waiting for sound") is not held: the lines pass through as before', () => {
  const { shown, hold } = pause({ locked: false });
  for (const s of shown) assert.equal(s.got.paused, false);
  assert.equal(hold.holding, false);
});

test('a gap inside a song (silence of a second and a half, then the song goes on) is held while it lasts and let go when the sound is back', () => {
  const e = engine(), hold = createCodeHold();
  const seen = [];
  for (let t = 0; t <= 20; t += 0.04) {
    e.silent = t > 11.5 && t < 13.5; if (!e.silent && !(t > 10 && t <= 11.5)) e.lastSound = t; else if (t <= 10) e.lastSound = t;
    seen.push([t, hold.feed(t, write(e, t), { silent: e.silent, lastSound: e.lastSound, locked: true }).paused]);
  }
  assert.ok(seen.filter(([t]) => t > 11.6 && t < 13.4).every(([, p]) => p));
  assert.ok(seen.filter(([t]) => t >= 13.5).every(([, p]) => !p));
});

test('a breakdown or a quiet bar (sound above the floor, so never silent) mutes as it should and the hold stays out of it', () => {
  const e = engine(), hold = createCodeHold();
  let kickMuted = false, anyPaused = false;
  for (let t = 0; t <= 40; t += 0.04) {
    e.lastSound = t; e.silent = false; // (a quiet part: sound the whole time)
    if (t > 20) e.heard.bd = false;    // (a breakdown: the engine hears no kick: present('bd') is false)
    const lines = write(e, t), got = hold.feed(t, lines, { silent: false, lastSound: t, locked: true });
    anyPaused ||= got.paused;
    if (t > 22) kickMuted ||= text(got.lines).bd.startsWith('_kick');
    assert.equal(got.lines, lines, 'the lines are the engine\'s own, passed through');
  }
  assert.equal(anyPaused, false);
  assert.equal(kickMuted, true, 'the kick muted in the breakdown, as before');
});

test('a new source or song starts clean: what was kept is not shown for the next one', () => {
  const e = engine(), hold = createCodeHold();
  for (let t = 0; t <= 10; t += 0.04) { e.lastSound = t; hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true }); }
  hold.letGo();
  assert.equal(hold.holding, false);
  // a new, silent source: its lastSound is its own start (12 s), the old song's lines are not its
  e.silent = true; e.lastSound = 12; e.tempo.locked = false;
  const got = hold.feed(13.5, write(e, 13.5), { silent: true, lastSound: 12, locked: false });
  assert.equal(got.paused, false);
});

test('a clock that steps back (a render starting over) forgets the lines it kept', () => {
  const e = engine(), hold = createCodeHold();
  for (let t = 5; t <= 10; t += 0.04) { e.lastSound = t; hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true }); }
  hold.feed(0, write(e, 0), { silent: false, lastSound: 0, locked: false });
  e.silent = true; e.tempo.locked = false;
  assert.equal(hold.feed(2, write(e, 2), { silent: true, lastSound: 0.05, locked: false }).paused, false, 'only the unlocked lines of the new run are in the past: nothing to keep');
});

test('the history stays short: no more than KEEP_S seconds of lines are remembered', () => {
  const e = engine(), hold = createCodeHold();
  let n = 0;
  for (let t = 0; t <= 600; t += 0.04) { hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true }); n++; }
  e.silent = true;
  // 590 s of silence from a sound that ended at 600: held the lines at 600 (the history reached it)
  assert.equal(hold.feed(601.3, write(e, 601.3), { silent: true, lastSound: 600, locked: true }).paused, true);
  assert.ok(KEEP_S >= 3 && KEEP_S <= 6);
});

test('in the page: the engine\'s newSong keeps the view when it comes from silence, the code refresh goes through the hold, a new source lets it go, and a render or a recording is left alone', () => {
  assert.match(app, /import \{ createCodeHold, pauseKnown \} from '\.\/codehold\.js'/);
  assert.match(app, /const holdOff = \(\) => clock\.mode === 'render' \|\| !!rec\.mr \|\| !!clips\.on;/, 'a render, and the app recording (rec.mr, clips.on), have no hold');
  const newSong = app.slice(app.indexOf('eng.on.newSong = () =>'), app.indexOf('// A known song keeps its beat'));
  assert.match(newSong, /const kept = !holdOff\(\) && eng\.silent && codeHold\.begin\(eng\.lastSound, nowSec\(\)\)/);
  assert.match(newSong, /if \(!kept\) \{ view\.clear\(\); glitch\(\); \}/, 'cleared only when not kept');
  const tick = app.slice(app.indexOf('function codeTick(t) {'), app.indexOf('view.step(t);'));
  assert.match(tick, /if \(holdOff\(\)\) codeHold\.letGo\(\);\n\s+else shown = codeHold\.feed\(t, written, \{ silent: eng\.silent, lastSound: eng\.lastSound, locked: eng\.tempo\.locked, extra: /);
  assert.match(tick, /view\.update\(shown\.lines, t,/);
  assert.match(tick, /codeHold\.wordShown\(t, pauseKnown\(\{ source: state\.source, el: state\.el, winSong: state\.winSong, winPlaying: state\.winPlaying, stopped: state\.stopped \}\)\)/);
  assert.match(tick, /classList\.toggle\('code-paused', codePaused\)/);
  const fresh = app.slice(app.indexOf('function freshStart('), app.indexOf('eng.reset({ top });'));
  assert.match(fresh, /codeHold\.letGo\(\)/);
  assert.match(css, /body\.code-paused #code::after \{ content: 'paused'/);
});

// the word "paused" (Big Brother's read, Nov 23: it showed in every silence over 1.2 s, and most are not pauses: a gap inside a song, a file's end)
function silence(hold, e, { from = 10, to = 40, known = false } = {}) {
  const seen = [];
  for (let t = 0; t <= to; t += 0.04) {
    e.silent = t > from + 1.2; if (!e.silent) e.lastSound = Math.min(t, from);
    const got = hold.feed(t, write(e, t), { silent: e.silent, lastSound: e.lastSound, locked: true });
    seen.push({ t, paused: got.paused, word: hold.wordShown(t, known) });
  }
  return seen;
}

test('a gap inside a song: the lines are held and the word is not said', () => {
  const e = engine(), hold = createCodeHold(), seen = [];
  for (let t = 0; t <= 20; t += 0.04) {
    e.silent = t > 11.2 && t < 13; if (!e.silent && !(t > 10 && t <= 11.2)) e.lastSound = t; else if (t <= 10) e.lastSound = t;
    const got = hold.feed(t, write(e, t), { silent: e.silent, lastSound: e.lastSound, locked: true });
    seen.push({ t, paused: got.paused, word: hold.wordShown(t, false) });
  }
  assert.ok(seen.filter((s) => s.t > 11.3 && s.t < 12.9).every((s) => s.paused), 'held through the gap');
  assert.ok(seen.every((s) => !s.word), 'and no word');
});

test('a silence nobody can name (the end of a file, a tab gone quiet): held, the word comes after WORD_AFTER_S of the hold and goes when the sound returns', () => {
  const e = engine(), hold = createCodeHold();
  const seen = silence(hold, e, { to: 20 });
  const heldAt = seen.find((s) => s.paused).t;
  assert.ok(seen.filter((s) => s.paused && s.t < heldAt + WORD_AFTER_S - 0.05).every((s) => !s.word));
  assert.ok(seen.filter((s) => s.paused && s.t >= heldAt + WORD_AFTER_S + 0.05).every((s) => s.word));
  e.silent = false; e.lastSound = 21;
  hold.feed(21, write(e, 21), { silent: false, lastSound: 21, locked: true });
  assert.equal(hold.wordShown(21, true), false, 'sound is back: no word, known or not');
});

test('a file pause gives the word at once: the page knows (el.paused), the player says not playing, the radio or the demo stopped', () => {
  const e = engine(), hold = createCodeHold();
  const seen = silence(hold, e, { known: true, to: 14 });
  const heldAt = seen.find((s) => s.paused).t;
  assert.ok(heldAt < 11.5);
  assert.ok(seen.filter((s) => s.paused).every((s) => s.word), 'the word with the hold, from its first refresh');
  assert.equal(pauseKnown({ source: 'file', el: { paused: true } }), true);
  assert.equal(pauseKnown({ source: 'file', el: { paused: false } }), false, 'a file playing: silence is the song\'s');
  assert.equal(pauseKnown({ source: 'system', winSong: { title: 'x' }, winPlaying: false }), true, 'Spotify or Music says it is paused');
  assert.equal(pauseKnown({ source: 'system', winSong: { title: 'x' }, winPlaying: true }), false);
  assert.equal(pauseKnown({ source: 'system', winSong: null, winPlaying: false }), false, 'no player named: it cannot tell');
  assert.equal(pauseKnown({ source: null, stopped: 'demo' }), true, 'the demo stopped from the bar');
  assert.equal(pauseKnown({ source: 'input', el: null }), false);
  assert.equal(pauseKnown(), false);
});

// O after the engine has started over (samir's flow: pause, then copy): the bass rhythm and the bar's phase come with the held lines
test('the bass rhythm and the bar\'s phase are kept with the lines: O writes the bass line\'s .struct from them after the engine has lost its own', () => {
  const e = engine(), hold = createCodeHold();
  const rhythm = Array.from({ length: 16 }, (_, s) => s % 4 === 0 || s === 10);
  let t = 0;
  for (; t <= 10; t += 0.04) { e.lastSound = t; hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true, extra: { bass: rhythm.slice(), phase: 2 } }); }
  // the engine's reset: no bass rhythm, no bar
  e.silent = true; e.tempo.locked = false;
  for (t = 11.3; t <= 30; t += 0.04) hold.feed(t, write(e, t), { silent: true, lastSound: 10, locked: false, extra: { bass: null, phase: 0 } });
  assert.equal(hold.holding, true);
  assert.deepEqual(hold.extra, { bass: rhythm, phase: 2 });
  const texts = { bassline: 'bassline: note("<c2 d2>").s("sawtooth")', bd: 'kick: s("bd*4")' };
  const without = strudelProgram(texts, song, 0, null), withHeld = strudelProgram(texts, song, hold.extra.phase, hold.extra.bass);
  assert.doesNotMatch(without, /\.struct\(/, 'the engine\'s own, gone: no rhythm');
  assert.match(withHeld, /\.struct\("/, 'the held one: the rhythm');
  assert.match(withHeld, /early\(2\)|_punchcard/, 'the held phase');
  assert.equal(hold.extra.phase, 2);
  // and once sound is back the extra is gone with the hold
  hold.feed(31, write(e, 31), { silent: false, lastSound: 31, locked: true, extra: { bass: null, phase: 0 } });
  assert.equal(hold.extra, null);
  // O reads them while the hold is on
  const o = app.slice(app.indexOf('function openInStrudel() {'), app.indexOf('function cameraTrouble'));
  assert.match(o, /const held = codeHold\.holding \? codeHold\.extra : null;/);
  assert.match(o, /const phase = held \? held\.phase : /);
  assert.match(o, /held \? held\.bass : eng\.v\?\.bass\?\.shown/);
});

test('while the app records the code is not held: the hold lets go and the engine\'s own lines go through (the video has its own case)', () => {
  const tick = app.slice(app.indexOf('function codeTick(t) {'), app.indexOf('view.step(t);'));
  assert.match(tick, /if \(holdOff\(\)\) codeHold\.letGo\(\);/);
  const off = app.slice(app.indexOf('const holdOff = '), app.indexOf('\n', app.indexOf('const holdOff = ')));
  assert.match(off, /!!rec\.mr/);
  assert.match(off, /!!clips\.on/);
  const newSong = app.slice(app.indexOf('eng.on.newSong = () =>'), app.indexOf('// A known song keeps its beat'));
  assert.match(newSong, /!holdOff\(\)/, 'the engine\'s reset wipes as before while recording');
  // a hold that began before the recording is not shown by it: letGo clears it
  const e = engine(), hold = createCodeHold();
  for (let t = 0; t <= 10; t += 0.04) { e.lastSound = t; hold.feed(t, write(e, t), { silent: false, lastSound: t, locked: true }); }
  hold.begin(10.1, 14);
  assert.equal(hold.holding, true);
  hold.letGo();
  assert.equal(hold.holding, false);
  assert.equal(hold.wordShown(15, true), false);
});

test('the real O handler, run with the hold on: it writes the held bass rhythm and phase, and the engine\'s own (gone, bar null) are not used', () => {
  const handler = app.slice(app.indexOf('function openInStrudel() {'), app.indexOf('// What went wrong starting the camera'));
  const rhythm = Array.from({ length: 16 }, (_, s) => s % 4 === 0 || s === 10);
  const texts = { bassline: 'bassline: note("<c2 d2>").s("sawtooth")', bd: 'kick: s("bd*4")' };
  const run = (codeHold, eng) => {
    let url;
    vm.runInNewContext(handler + '\nopenInStrudel();', { eng, codeHold, lineTexts: () => texts, currentSong: () => song, strudelProgram, strudelLink, openedSaid, liveWhy: () => '', lastRebuilt: null, showNotice() {}, window: { nc: { openStrudel: (u) => { url = u; } } }, flashStatus() {} });
    return Buffer.from(decodeURIComponent(url.split('#')[1]), 'base64').toString('utf8');
  };
  const gone = { bar: null, v: { bass: { shown: null } } }; // (after the engine has started over)
  const live = run({ holding: false, extra: null }, gone);
  const held = run({ holding: true, extra: { bass: rhythm, phase: 2 } }, gone);
  assert.doesNotMatch(live, /\.struct\(/, 'without the hold: no rhythm, as the review found');
  assert.match(held, /\.struct\("/, 'with the hold: the bass line\'s rhythm');
  assert.match(held, /early\(2\)/, 'and the bar\'s phase');
});
