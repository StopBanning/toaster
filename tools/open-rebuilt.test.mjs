// O after X (renderer/app.js openRebuilt): the song X rebuilt opens instead of the live code, but only for the song it was made of. The sweep, Nov 16 (finding 5): a song
// Toaster cannot name (music in a browser on a Mac; a paused player) is called by its source, "system audio", the same for every such song, so X on one and O on the next
// opened the first one's rebuild until the app restarted. Run on stand-ins for the rest of the page, as tools/song-change.test.mjs runs nowPlaying.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return text.slice(a, b); };

function page() {
  const opened = [], said = [];
  const state = { label: 'system audio' };
  const context = { state, song: null, opened, said, strudelLink: (c) => 'link:' + c, flashStatus: (s) => said.push(s), window: { nc: { openStrudel: (u) => opened.push(u) } }, currentSong: () => context.song };
  vm.runInNewContext(slice('function songNames(s) {', '\n}\n') + '\n}\n' + slice('let lastRebuilt = null;', '// O: the code as it is now') + ';globalThis.openRebuilt = openRebuilt; globalThis.setRebuilt = (r) => { lastRebuilt = r; };', context);
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
