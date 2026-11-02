// When the page starts the engine over for a new song, and when it doesn't (renderer/app.js): nowPlaying, the system's titles,
// playElement, a file or the radio starting to play, and followPauses, a file paused and played on.
// - The first title the system gives is the song that was already playing when Toaster started, not a new one: on Windows
//   the now-playing helper's first reading can come after the beat was found, and it threw the beat away and started over.
// - A stream can take seconds to start. The engine, started over at attach, heard only that silence, and music after a
//   silence it takes for a song from its start, whose first chord is home (listenOpening): wrong for a station joined
//   halfway through a song. It's started over again when the sound begins.
// - A file paused and played on keeps its beat, the grid moved on by the time it stood still (followPauses), and its song is
//   the file's through the pause (eng.song), so the engine doesn't start over in it.
// They are run here on stand-ins for the rest of the page, as tools/queue-skip.test.mjs runs the queue's; the engine's part (the
// opening armed by a silence) on the real engine with stand-in analysers.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// (read with LF line endings: a Windows checkout's CRLF would turn the \n these slices look for into two characters)
const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return text.slice(a, b); };

// ---------------------------------------------------------------- the system's titles

function system({ source = 'system', locked = true, manual = null } = {}) {
  const resets = [], notes = [];
  const state = { source, manual, winSong: null, winPlaying: false, winKey: '' };
  const eng = { tempo: { locked }, note: (s) => notes.push(s) };
  const context = { state, eng, freshStart: (top) => resets.push(top), window: {}, Image: class {}, document: {} };
  vm.runInNewContext(slice("let artSrc = '', artImg = null;", 'window.nc?.onNowPlaying(nowPlaying);') + ';globalThis.nowPlaying = nowPlaying;', context);
  const say = (title, artist = 'Someone') => context.nowPlaying(title === null ? null : { title, artist, app: 'Spotify.exe', playing: true, art: '' });
  return { say, state, eng, resets, notes };
}

test('the first title is the song that was playing when Toaster started: the beat already found is kept', () => {
  const s = system({ locked: true }); // (the Windows helper's first reading, a few seconds in: the beat is found)
  s.say('Nanana');
  assert.deepEqual(s.resets, [], 'not started over');
  assert.equal(s.state.winSong.title, 'Nanana', 'and the song is named');
  assert.match(s.notes[0], /^now playing: Nanana \| Someone/);
  assert.doesNotMatch(s.notes[0], /reset/);
});

test('a new title after that starts the song over, from its top, as before', () => {
  const s = system({ locked: true });
  s.say('Nanana');
  s.say('Starships');
  assert.deepEqual(s.resets, [true]);
  assert.match(s.notes[1], /-> reset$/);
  // the same song again, a reading without a title, or an artist that fills in late: the same song
  s.say('Starships', 'Nicki Minaj'); s.say(null); s.say('  starships ');
  assert.deepEqual(s.resets, [true]);
  s.say('One More Time');
  assert.deepEqual(s.resets, [true, true]);
});

test('as before, a new title does not start over before the beat is found, on another source, or for a song you named', () => {
  for (const [what, opts] of [['not locked', { locked: false }], ['a file playing', { source: 'file' }], ['named', { manual: { title: 'mine', artist: 'me' } }]]) {
    const s = system(opts);
    s.say('Nanana'); s.say('Starships');
    assert.deepEqual(s.resets, [], what);
    assert.equal(s.state.winKey, 'starships', `${what}: the title is still taken`);
  }
  // a title that changed while a file played still counts once the system's sound is back: it's no longer the first
  const s = system({ source: 'file' });
  s.say('Nanana');
  s.state.source = 'system';
  s.say('Starships');
  assert.deepEqual(s.resets, [true]);
});

// ---------------------------------------------------------------- a file or the radio starting

function player() {
  const log = { resets: [], attached: [], detached: 0 };
  const state = { source: null, label: '', el: null, node: null };
  const eng = { silent: false, tempo: { locked: false, t0: 0 }, reset: (o) => log.resets.push({ ...o }), resume(gap) { if (this.tempo.locked) this.tempo.t0 += gap; log.clocks = (log.clocks || 0) + 1; } }; // (copied: an object made in the page's context is not deepEqual to one made here)
  let started = null;
  // (an element: play() waits till the test says it plays; pause() and a resumed play fire their events, as a browser's do)
  class Audio {
    constructor() { this.paused = true; this.ended = false; this.heard = {}; }
    addEventListener(type, fn) { (this.heard[type] ||= []).push(fn); }
    fire(type) { this.paused = type === 'pause'; for (const fn of this.heard[type] || []) fn(); }
    play() { return new Promise((resolve, reject) => { started = { resolve, reject }; }); }
    pause() { this.fire('pause'); }
  }
  const node = { connect() {} };
  const el = () => ({ classList: { add() {}, remove() {} }, textContent: '' });
  const clock = { t: 100 };
  const takeRec = { id: null, changes: [] };
  const context = {
    state, eng, Audio, picking: 0, detach: () => { log.detached++; }, showMenu() {}, restingStatus: () => '',
    ac: { resume: async () => {}, createMediaElementSource: () => node, destination: {} },
    attach: (n, source, label) => { log.attached.push(source); state.node = n; state.source = source; state.label = label; },
    $: el, document: { body: el() }, nowSec: () => clock.t, takeRec, TAKE_RUNUP: 30,
  };
  vm.runInNewContext('const outdated = (ticket) => ticket !== picking;\n' + slice('async function playElement(', '\nasync function useFile(') + ';globalThis.playElement = playElement;', context);
  return { context, state, eng, log, clock, takeRec, play: (source) => context.playElement(source, source, () => {}), start: () => started.resolve(), refuse: (e) => started.reject(e) };
}
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };

test('a stream that took long enough to start that the engine went silent is started over as it begins: the radio not from its top', async () => {
  const p = player();
  const done = p.play('radio');
  await settle();
  assert.deepEqual(p.log.attached, ['radio'], 'attached (and started over) before it plays');
  p.eng.silent = true; // (more than 1.2 s of nothing while it buffered)
  p.start(); await done;
  assert.deepEqual(p.log.resets, [{ top: false }]);
});

test('one that starts at once is left be; a file that was slow to start starts over from its top', async () => {
  const p = player();
  const quick = p.play('radio'); await settle();
  p.start(); await quick;
  assert.deepEqual(p.log.resets, [], 'no silence heard: nothing to undo');
  p.eng.silent = true;
  const file = p.play('file'); await settle();
  p.start(); await file;
  assert.deepEqual(p.log.resets, [{ top: true }]);
});

test('a pick overtaken while it buffered, or refused, does not touch the engine', async () => {
  const p = player();
  const slow = p.play('radio'); await settle();
  p.context.picking++; // (another source picked meanwhile)
  p.eng.silent = true;
  p.start(); await slow;
  assert.deepEqual(p.log.resets, []);
  const refused = p.play('radio'); await settle();
  p.refuse(new Error('no')); await assert.rejects(refused, /no/);
  assert.deepEqual(p.log.resets, []);
});

// ---------------------------------------------------------------- a file paused and played on

test('a file paused and played on keeps its beat, the grid moved on by the time it stood still', async () => {
  const p = player();
  const go = p.play('file'); await settle(); p.start(); await go;
  const el = p.state.el;
  p.eng.tempo = { locked: true, t0: 50 };
  p.clock.t = 120; el.pause();
  p.clock.t = 128.5; el.fire('playing'); // (eight and a half seconds later)
  assert.equal(p.eng.tempo.t0, 58.5);
  assert.equal(p.log.clocks, 1, 'and the beat and bar counts start afresh, not stalled till they catch up');
  // a 'playing' without a pause before it (the first, or after moving in the file while it played) moves nothing
  el.fire('playing');
  assert.equal(p.eng.tempo.t0, 58.5);
  assert.equal(p.log.clocks, 1);
  // and the take's run-up keeps the move, for a take begun after it
  assert.deepEqual(Array.from(p.takeRec.resumes, (x) => [x.t, x.gap]), [[128.5, 8.5]]);
  assert.deepEqual(p.takeRec.changes, [], 'no take going: nothing noted in one');
});

test('a pause the beat did not survive, a file moved in or let go meanwhile, or the end of a file, moves nothing', async () => {
  const p = player();
  const go = p.play('file'); await settle(); p.start(); await go;
  const el = p.state.el;
  p.eng.tempo = { locked: false, t0: 50 }; // (the engine started over in the pause, or was moved in: no beat to move on)
  el.pause(); p.clock.t += 30; el.fire('playing');
  assert.equal(p.eng.tempo.t0, 50);
  p.eng.tempo = { locked: true, t0: 50 };
  el.pause(); p.state.el = {}; p.clock.t += 3; el.fire('playing'); // (another file took over)
  assert.equal(p.eng.tempo.t0, 50);
  p.state.el = el; el.ended = true; el.pause(); el.ended = false; p.clock.t += 3; el.fire('playing'); // (its end: the queue goes on)
  assert.equal(p.eng.tempo.t0, 50);
  // the radio isn't followed (it has no pause: it stops)
  const r = player();
  const radio = r.play('radio'); await settle(); r.start(); await radio;
  r.eng.tempo = { locked: true, t0: 50 };
  r.state.el.pause(); r.clock.t += 3; r.state.el.fire('playing');
  assert.equal(r.eng.tempo.t0, 50);
});

test('a take notes the move, and the copy makes it at the same time; the run-up\'s moves go in with the take', async () => {
  const p = player();
  const go = p.play('file'); await settle(); p.start(); await go;
  p.eng.tempo = { locked: true, t0: 10 };
  p.takeRec.id = 'take-1';
  p.clock.t = 200; p.state.el.pause(); p.clock.t = 204; p.state.el.fire('playing');
  assert.deepEqual(Array.from(p.takeRec.changes, (c) => ({ ...c })), [{ t: 204, resume: 4 }]);
  const replay = fs.readFileSync(new URL('../renderer/take-replay.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(replay, /else if \(c\.resume\) eng\.resume\(c\.resume\);/, 'the copy moves its grid on, at the move\'s own time, as the engine does it');
  assert.match(text, /\.\.\.\(takeRec\.resumes \|\| \[\]\)\.filter\(\(x\) => x\.t >= soundAt\)\.map\(\(x\) => \(\{ t: x\.t, resume: x\.gap \}\)\)/, 'and the run-up\'s');
});

test('a file\'s song plays on through a silence and a pause (the engine keeps its beat), till it ends; the radio\'s does not', () => {
  const line = slice('eng.song = () => (', '\n');
  const playing = (state) => { const c = { state, eng: {}, currentSong: () => ({ title: 'x' }) }; vm.runInNewContext(line, c); return c.eng.song().playing; };
  assert.equal(playing({ source: 'file', el: { ended: false } }), true);
  assert.equal(playing({ source: 'file', el: { ended: true } }), false);
  assert.equal(playing({ source: 'file', el: null }), true, 'a perfect copy of a file\'s take: no element, the same song');
  assert.equal(playing({ source: 'radio', el: { ended: false } }), false);
  assert.equal(playing({ source: 'system', winSong: { title: 'x' }, winPlaying: true }), true);
  assert.equal(playing({ source: 'system', winSong: { title: 'x' }, winPlaying: false }), false);
});

// ---------------------------------------------------------------- the engine's side

test('the engine played on after a pause moves its grid and the hits it was found from on together, and counts its beats afresh', async () => {
  globalThis.window = { NC_DEBUG: false };
  const saved = globalThis.clock;
  globalThis.clock = { now: () => 100 };
  try {
    const { createEngine } = await import('../renderer/engine.js');
    const fake = (size) => ({ fftSize: size, frequencyBinCount: size / 2, getFloatFrequencyData(out) { out.fill(-200); }, getFloatTimeDomainData(out) { out.fill(0); } });
    const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
    e.onsets.push({ t: 90, id: 'bd', s: 1 }, { t: 90.5, id: 'sd', s: 1 });
    e.tempo.locked = false; e.resume(8);
    assert.equal(e.tempo.t0, 0, 'no beat held: nothing to move on');
    assert.deepEqual(e.onsets.map((o) => o.t), [90, 90.5]);
    Object.assign(e.tempo, { locked: true, t0: 88, P: 0.5 }); e.beat = e.bar = e.step = 7;
    e.resume(8);
    assert.equal(e.tempo.t0, 96);
    assert.deepEqual(e.onsets.map((o) => o.t), [98, 98.5], 'the hits from before the pause sit on the grid as it is now');
    assert.equal(e.beat, null, 'the beats are counted afresh');
  } finally { globalThis.clock = saved; }
});

test('the engine takes music after the silence of a stream starting for a song from its top, unless started over when it begins', async () => {
  globalThis.window = { NC_DEBUG: false };
  let now = 0, loud = false;
  const saved = globalThis.clock;
  globalThis.clock = { now: () => now };
  try {
    const { createEngine } = await import('../renderer/engine.js');
    const fake = (size) => ({ fftSize: size, frequencyBinCount: size / 2,
      getFloatFrequencyData(out) { out.fill(loud ? -30 : -200); },
      getFloatTimeDomainData(out) { for (let i = 0; i < out.length; i++) out[i] = loud ? 0.1 * Math.sin(i * 0.05) : 0; } });
    const e = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
    for (const restart of [false, true]) {
      now += 10; loud = false;
      e.reset({ top: false }); // (attach: the radio may be halfway through a song)
      const from = now;
      for (; now < from + 2; now += 0.015) e.frame(now, now); // two seconds of buffering
      assert.equal(e.silent, true);
      if (restart && e.silent) e.reset({ top: false }); // (what playElement now does when play() comes back)
      loud = true;
      for (let i = 0; i < 20; i++, now += 0.015) e.frame(now, now);
      assert.equal(e.opening.armed, !restart, restart ? 'started over: the first chord heard is not taken for home' : 'the silence armed it');
    }
  } finally { globalThis.clock = saved; }
});
