// The repeat-song start (renderer/song-memory.js and the engine's `prior`): what is kept of a song, how it is kept, and that the engine takes it only as provisional.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSongMemory, keyOf } from '../renderer/song-memory.js';

const store = () => { const m = new Map(); return { m, s: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }; };
const line = (...on) => Array.from({ length: 16 }, (_, i) => on.includes(i));

test('a song is named by artist and title, lower case; a remaster is the same song, a live version or a remix is not', () => {
  assert.equal(keyOf({ artist: 'Daft Punk', title: 'Around the World - 2011 Remaster' }), 'daft punk|around the world');
  assert.equal(keyOf({ artist: 'A', title: 'B (Remastered 2009)' }), 'a|b');
  assert.notEqual(keyOf({ artist: 'A', title: 'B (Live)' }), keyOf({ artist: 'A', title: 'B' }));
  assert.notEqual(keyOf({ artist: 'A', title: 'B - Remix' }), keyOf({ artist: 'A', title: 'B' }));
  assert.equal(keyOf(null), '');
  assert.equal(keyOf({ artist: 'A' }), '');
});

test('the pattern a line showed most often is the one kept, not the last one seen; the tempo is averaged', () => {
  const { s } = store(), mem = createSongMemory(s);
  for (const k of [line(0, 4, 8, 12), line(0, 4, 8, 12), line(0, 4, 8, 12, 15), line(0, 4, 8, 12)]) mem.put('a|b', { bpm: 120, parts: { bd: k } });
  const p = mem.prior('a|b');
  assert.deepEqual(p.parts.bd, line(0, 4, 8, 12));
  assert.equal(p.bpm, 120);
  assert.equal(mem.prior('a|nothing'), null);
  mem.put('a|b', { bpm: 121, parts: { bd: line(0, 4, 8, 12) } });
  assert.ok(mem.prior('a|b').bpm > 120 && mem.prior('a|b').bpm < 121);
  mem.put('a|b', { bpm: 90, parts: { bd: line(0, 8) } }); // (a tempo far from what was kept: another version; start the song's memory again)
  assert.deepEqual(mem.prior('a|b').parts.bd, line(0, 8));
});

test('at most the cap, the least recently heard first; forget() clears it, and a full or blocked store loses nothing but the keeping', () => {
  const { s, m } = store();
  let t = 0;
  const mem = createSongMemory(s, { cap: 3, now: () => ++t });
  for (const k of ['a|1', 'b|2', 'c|3', 'd|4']) mem.put(k, { bpm: 100, parts: { bd: line(0) } });
  assert.equal(mem.size(), 3);
  assert.equal(mem.prior('a|1'), null);
  assert.ok(mem.prior('d|4'));
  mem.forget();
  assert.equal(mem.size(), 0);
  assert.equal(m.size, 0);
  const broken = createSongMemory({ getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('no'); } });
  broken.put('x|y', { bpm: 100, parts: { bd: line(0) } });
  assert.ok(broken.prior('x|y'));
  broken.forget();
});

test('what is kept is small and local: a tempo, a few 16-character lines, and when', () => {
  const { s, m } = store(), mem = createSongMemory(s);
  mem.put('a|b', { bpm: 120, parts: { bd: line(0, 4, 8, 12), sd: line(4, 12), hhc: line(0, 2, 4, 6, 8, 10, 12, 14) } });
  const kept = m.get('toaster-song-memory-v1');
  assert.ok(kept.length < 400, kept);
  assert.deepEqual(Object.keys(JSON.parse(kept)['a|b']).sort(), ['bpm', 'c', 'n', 'seen']);
});

test('the engine takes it as provisional: a close tempo reading locks at once; a line comes in on its second hit on its steps and goes when a bar disagrees; a far tempo or other drums leave it alone', () => {
  const src = fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8');
  assert.match(src, /const seed = !T\.locked && !!this\.prior\?\.bpm && Math\.abs\(bpm - this\.prior\.bpm\) \/ this\.prior\.bpm < 0\.02/);
  assert.match(src, /if \(seed && T\.candN >= 1\)/);
  assert.match(src, /this\.tempo\.locked && Math\.abs\(this\.tempo\.bpm - this\.prior\.bpm\) \/ this\.prior\.bpm < 0\.03/); // (lines only where the tempo agrees)
  assert.match(src, /u\.on >= 2 && u\.off \* 3 <= u\.on/);
  assert.match(src, /if \(off > on \|\| \(hits >= 3 && on === 0\)\)/); // (the bar's check)
  assert.match(src, /t - T\.lockedAt < 25/); // (kept only once the tempo has held)
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  assert.match(app, /songMemory = TAKE \|\| WIDGET \? null : createSongMemory\(\)/); // (not in a take or a widget)
});

// The sweep, Nov 16 (finding 2): with a library over the cap the read-ahead pushed out its own first songs, picked them again, and pushed out the songs played.
test('a read-ahead song is only added where there is room, never pushes out a song, and one that is then played is a played song', () => {
  let t = 0;
  const mem = createSongMemory(store().s, { cap: 3, now: () => ++t });
  const snap = { bpm: 120, parts: { bd: line(0, 4, 8, 12) } };
  assert.equal(mem.room(), true);
  mem.put('x|played', snap);
  assert.equal(mem.put('x|a', snap, { ahead: true }), true);
  assert.equal(mem.put('x|b', snap, { ahead: true }), true);
  assert.equal(mem.room(), false, 'full');
  assert.equal(mem.put('x|c', snap, { ahead: true }), false, 'no room: not added, nothing pushed out');
  assert.deepEqual([mem.size(), !!mem.prior('x|played'), !!mem.prior('x|a'), !!mem.prior('x|b'), !!mem.prior('x|c')], [3, true, true, true, false]);
  assert.equal(mem.put('x|played', snap, { ahead: true }), false, 'a song that was heard is left as it is');
  // a song then heard goes in: the oldest read-ahead song makes way, not a played one
  mem.put('x|new', snap);
  assert.deepEqual([mem.size(), !!mem.prior('x|played'), !!mem.prior('x|a'), !!mem.prior('x|b'), !!mem.prior('x|new')], [3, true, false, true, true]);
  // and one read ahead that is then played is a played one: the next heard song pushes out the other read-ahead one first
  mem.put('x|b', snap);
  mem.put('x|newer', snap);
  assert.deepEqual([!!mem.prior('x|played'), !!mem.prior('x|b'), !!mem.prior('x|new'), !!mem.prior('x|newer')].filter(Boolean).length, 3);
  assert.equal(mem.size(), 3);
});

// (the first version refused every snapshot after a song's first: a read-ahead song kept its first ~10 s reading, not the tally over 100 s)
test('a song read ahead keeps the tally of all its snapshots; a read-ahead put never touches a song that was heard', () => {
  const mem = createSongMemory(store().s, { cap: 3 });
  const a = { bpm: 120, parts: { bd: line(0, 4, 8, 12) } }, b = { bpm: 120, parts: { bd: line(0, 2, 4, 6, 8, 10, 12, 14) } };
  // ten snapshots of a song: seven of one pattern, three of another, coming one after the other
  for (const s of [a, b, a, a, b, a, a, b, a, a]) mem.put('x|ahead', s, { ahead: true });
  assert.equal(mem.prior('x|ahead').n, 10, 'every look counted');
  assert.deepEqual(mem.prior('x|ahead').parts.bd, line(0, 4, 8, 12), 'the pattern seen most wins, not the first or the last');
  // a heard song's entry is the heard one's: a read-ahead put leaves it untouched
  mem.put('x|heard', a);
  const before = JSON.stringify(mem.prior('x|heard'));
  assert.equal(mem.put('x|heard', b, { ahead: true }), false);
  assert.equal(JSON.stringify(mem.prior('x|heard')), before);
  // and the song read ahead, once heard, is a heard one: a read-ahead put no longer adds to it
  mem.put('x|ahead', b);
  assert.equal(mem.put('x|ahead', a, { ahead: true }), false);
});
