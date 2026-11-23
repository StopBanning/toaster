// O after X (renderer/app.js openRebuilt): the song X rebuilt opens instead of the live code, but only for the song it was made of. The sweep, Nov 16 (finding 5): a song
// Toaster cannot name (music in a browser on a Mac; a paused player) is called by its source, "system audio", the same for every such song, so X on one and O on the next
// opened the first one's rebuild until the app restarted. Run on stand-ins for the rest of the page, as tools/song-change.test.mjs runs nowPlaying.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songTitle } from '../renderer/rebuild.js';   // (app.js imports these two; the page's other imports are stand-ins here)
import { realArtist, strudelProgram } from '../renderer/codegen.js';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return text.slice(a, b); };

function page() {
  const opened = [], said = [];
  const state = { label: 'system audio' };
  const context = { state, song: null, opened, said, songTitle, realArtist, strudelLink: (c) => 'link:' + c, flashStatus: (s) => said.push(s), window: { nc: { openStrudel: (u) => opened.push(u) } }, currentSong: () => context.song };
  vm.runInNewContext(slice('function songNames(s) {', '\n}\n') + '\n}\n' + slice('let lastRebuilt = null;', '// O: the code as it is now') + ';globalThis.openRebuilt = openRebuilt; globalThis.songNames = songNames; globalThis.setRebuilt = (r) => { lastRebuilt = r; };', context);
  return { context, opened, said, state, play: (s) => { context.song = s; } };
}

test('O opens the rebuilt song while the song it was made of is the one playing', () => {
  const p = page();
  p.play({ title: "Don't Stop Me Now", artist: 'Queen' });
  p.context.setRebuilt({ name: "Queen - Don't Stop Me Now", code: 'stack()', titled: true });
  assert.equal(p.context.openRebuilt(), true);
  assert.deepEqual(p.opened, ['link:stack()']);
  p.play({ title: 'Starships', artist: 'Nicki Minaj' });
  assert.equal(p.context.openRebuilt(), false, 'another song: the live code');
  assert.equal(p.opened.length, 1);
});

test('after X on a song with no name, O does not open that rebuild for the next song with no name', () => {
  const p = page();
  p.play(null);   // (a song in a browser: not named, called by its source)
  p.context.setRebuilt({ name: 'system audio', code: 'stack()', titled: false });
  assert.equal(p.context.openRebuilt(), false, 'still the unnamed one: the live code, not a stale rebuild');
  p.play({ title: 'system audio', artist: 'X' });   // (even a song titled like the source)
  assert.equal(p.context.openRebuilt(), false);
  assert.deepEqual(p.opened, []);
});

test('a rebuilt song of a named song is not opened once the song playing has no name', () => {
  const p = page();
  p.context.setRebuilt({ name: 'Queen - Don\'t Stop Me Now', code: 'stack()', titled: true });
  p.play(null);
  assert.equal(p.context.openRebuilt(), false);
  p.context.setRebuilt(null);
  p.play({ title: 'a', artist: 'b' });
  assert.equal(p.context.openRebuilt(), false, 'nothing rebuilt');
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
