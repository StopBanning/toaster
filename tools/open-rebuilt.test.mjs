// O after X (renderer/app.js openRebuilt): the song X rebuilt opens instead of the live code, but only for the song it was made of. The sweep, Nov 16 (finding 5): a song
// Toaster cannot name (music in a browser on a Mac; a paused player) is called by its source, "system audio", the same for every such song, so X on one and O on the next
// opened the first one's rebuild until the app restarted. Run on stand-ins for the rest of the page, as tools/song-change.test.mjs runs nowPlaying.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songTitle } from '../renderer/rebuild.js';   // (app.js imports these two; the page's other imports are stand-ins here)
import { realArtist, strudelProgram } from '../renderer/codegen.js';
import { openedSaid } from '../renderer/tune.js';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return text.slice(a, b); };

function page() {
  const opened = [], said = [];
  const state = { label: 'system audio' }, eng = { resets: 0 };
  const context = { state, eng, song: null, opened, said, songTitle, realArtist, openedSaid, showNotice() {}, strudelLink: (c) => 'link:' + c, flashStatus: (s) => said.push(s), window: { nc: { openStrudel: (u) => opened.push(u) } }, currentSong: () => context.song };
  vm.runInNewContext(slice('function songNames(s) {', '\n}\n') + '\n}\n' + slice('let lastRebuilt = null;', '// O: the code as it is now') + ';globalThis.rebuiltNow = rebuiltNow; globalThis.songNames = songNames; globalThis.setRebuilt = (r) => { lastRebuilt = r; };', context);
  return { context, opened, said, state, eng, play: (s) => { context.song = s; } };
}
const queenRebuilt = (resets) => ({ name: "Queen - Don't Stop Me Now", code: 'stack()', titled: true, resets });

test('the rebuild is the playing song\'s while the song it was made of is the one playing, or the engine has not started over since', () => {
  const p = page();
  p.play({ title: "Don't Stop Me Now", artist: 'Queen' });
  p.context.setRebuilt(queenRebuilt(0));
  assert.equal(p.context.rebuiltNow().code, 'stack()');
  p.eng.resets = 3;   // (paused long enough that the engine started over: the same title is still the same song)
  assert.equal(p.context.rebuiltNow().code, 'stack()');
  p.play({ title: 'Starships', artist: 'Nicki Minaj' });
  assert.equal(p.context.rebuiltNow(), null, 'another song: its own rebuild');
});

test('after X on a song with no name, the next song with no name does not get that rebuild: nothing tells them apart but the engine starting over', () => {
  const p = page();
  p.play(null);   // (a song in a browser: not named, called by its source)
  p.context.setRebuilt({ name: 'system audio', code: 'stack()', titled: false, resets: 0, at: Date.now() });
  assert.equal(p.context.rebuiltNow().code, 'stack()', 'the same song, the same tape: pressing O twice does not rebuild twice');
  p.eng.resets = 1;   // (a new song, a new source, a long pause: the engine started over)
  assert.equal(p.context.rebuiltNow(), null, 'the next song with no name: not that rebuild');
  p.play({ title: 'system audio', artist: 'X' });   // (even a song titled like the source)
  assert.equal(p.context.rebuiltNow(), null);
  assert.deepEqual(p.opened, []);
});

test('a rebuilt song of a named song is not the one of a song playing with no name once the engine has started over, and nothing rebuilt is nothing to open', () => {
  const p = page();
  p.context.setRebuilt(queenRebuilt(0));
  p.eng.resets = 1; p.play(null);
  assert.equal(p.context.rebuiltNow(), null);
  p.context.setRebuilt(null);
  p.play({ title: 'a', artist: 'b' });
  assert.equal(p.context.rebuiltNow(), null, 'nothing rebuilt');
});

test('a file with no artist tag is saved under its title alone, not "File - ..." (its stand-in artist is no one to be "by")', () => {
  const p = page();
  const untagged = p.context.songNames({ title: 'The Weeknd - Blinding Lights', artist: 'File' });
  assert.equal(untagged.name, 'The Weeknd - Blinding Lights');
  assert.equal(untagged.about, '"The Weeknd - Blinding Lights"');
  assert.equal(untagged.song, 'Blinding Lights');
  const tagged = p.context.songNames({ title: 'Blinding Lights', artist: 'The Weeknd' });
  assert.equal(tagged.name, 'The Weeknd - Blinding Lights');
  assert.equal(tagged.about, '"Blinding Lights" by The Weeknd');
  assert.equal(realArtist('  The   Weeknd '), 'The Weeknd');
  assert.equal(realArtist(undefined), '');
});

test('O\'s code names a file with no artist tag by its title alone ("by File" before)', () => {
  assert.match(strudelProgram({}, { title: 'The Weeknd - Blinding Lights', artist: 'File' }).split('\n')[0], /^\/\/ "The Weeknd - Blinding Lights", written out by toaster$/);
  assert.match(strudelProgram({}, { title: 'Blinding Lights', artist: 'The Weeknd' }).split('\n')[0], /^\/\/ "Blinding Lights" by The Weeknd, written out by toaster$/);
});
