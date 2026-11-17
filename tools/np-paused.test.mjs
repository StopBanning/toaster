// A song the system names but says is paused, while other sound is coming in, is not the song heard (renderer/app.js: currentSong,
// songArt, nowPlaying). Nov 16, Colin: Spotify open and paused on one song, a YouTube song playing in Safari, and Toaster named and
// wrote code for the paused Spotify song. On a Mac the system's own list answers nothing (macOS 15.4), so only Spotify and Music are asked,
// by AppleScript (helpers/player.cjs parseNowPlaying: "a paused player counts, so the card keeps the song"), and a paused one still answers.
// Run on stand-ins for the rest of the page, as tools/song-change.test.mjs runs nowPlaying.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return text.slice(a, b); };

function page({ source = 'system', manual = null } = {}) {
  const clock = { t: 100 };
  const state = { source, manual, winSong: null, winPlaying: false, winKey: '', winPausedAt: null, radioSong: null };
  const eng = { tempo: { locked: false }, note() {}, silent: false, lastSound: 100 };
  const context = { state, eng, clock, nowSec: () => clock.t, TAKE: null, freshStart() {}, window: {}, Image: class {}, document: {}, liveQueue: () => null };
  vm.runInNewContext(slice("let artSrc = '', artImg = null;", 'window.nc?.onNowPlaying(nowPlaying);') + '\n' + slice('function currentSong() {', '\n}\n') + '\n}\nglobalThis.nowPlaying = nowPlaying; globalThis.currentSong = currentSong;', context);
  const say = (title, playing, artist = 'KYLE') => context.nowPlaying(title === null ? null : { title, artist, app: 'Spotify', playing, art: '' });
  // (seconds pass; sound keeps coming in, or stops)
  const pass = (s, sound) => { clock.t += s; if (sound) eng.lastSound = clock.t; eng.silent = !sound && clock.t - eng.lastSound > 1.2; };
  return { say, pass, state, eng, song: () => context.currentSong() };
}

test('a paused Spotify song with other sound playing is not named (not the paused song)', () => {
  const p = page();
  p.say('iSpy (feat. Lil Yachty)', false);
  p.pass(10, true); // (a song playing in a browser, which the Mac does not tell us about)
  assert.equal(p.song(), null);
});

test('the paused song is still named for the first seconds (the sound dies away after a pause) and while nothing else sounds', () => {
  const p = page();
  p.say('iSpy (feat. Lil Yachty)', true);
  p.pass(30, true);
  assert.equal(p.song().title, 'iSpy (feat. Lil Yachty)', 'playing');
  p.say('iSpy (feat. Lil Yachty)', false);
  p.pass(1.5, true); // (the last of it ringing out)
  assert.equal(p.song().title, 'iSpy (feat. Lil Yachty)', 'just paused');
  p.pass(20, false);
  assert.equal(p.song().title, 'iSpy (feat. Lil Yachty)', 'paused and silent: the card keeps the song, as before');
});

test('the name comes back when the sound stops, and when Spotify plays again', () => {
  const p = page();
  p.say('iSpy (feat. Lil Yachty)', false);
  p.pass(10, true);
  assert.equal(p.song(), null);
  p.pass(5, false); // (the other song ends)
  assert.equal(p.song().title, 'iSpy (feat. Lil Yachty)');
  p.pass(1, true); p.say('iSpy (feat. Lil Yachty)', true);
  assert.equal(p.song().title, 'iSpy (feat. Lil Yachty)', 'playing it is the song heard');
  assert.equal(p.state.winPausedAt, null);
});

test('a song that plays is always named, and a song you named, and another source, are left be', () => {
  const p = page();
  p.say('Nanana', true); p.pass(60, true);
  assert.equal(p.song().title, 'Nanana');
  const m = page({ manual: { title: 'mine', artist: 'me' } });
  m.say('iSpy', false); m.pass(10, true);
  assert.equal(m.song().title, 'mine');
  const r = page({ source: 'radio' });
  r.state.radioSong = { title: 'Station song', artist: 'x' };
  r.say('iSpy', false); r.pass(10, true);
  assert.equal(r.song().title, 'Station song');
});

test('a title that starts a new song while paused still counts as a change (the engine start-over is not touched)', () => {
  const p = page();
  p.say('One', true); p.say('Two', false); p.pass(10, true);
  assert.equal(p.state.winKey, 'two');
  assert.equal(p.song(), null);
});
