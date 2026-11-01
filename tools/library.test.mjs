// The library's logic (renderer/library.js): the tracks grouped into albums (album artist, compilations, discs, missing tags), the
// queue (next, previous, the line of what's near), the scenes you save (a setup in the shape of PRESETS, renamed, deleted, loaded and
// applied), the stations you've played, the cover in characters and where the cursor goes on the keys.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applyPreset } from '../renderer/presets.js';
import * as L from '../renderer/library.js';

const track = (path, over = {}) => L.makeTrack({ path, ...over });
const albumsOf = (records) => L.groupAlbums(records.map((r) => (typeof r === 'string' ? track(r) : track(r.path, r))));
const titles = (album) => album.tracks.map((t) => t.title);

// ---------------------------------------------------------------- names

test('a file with no tags is named by its file: a number, then its name', () => {
  const names = { '01 Plague.mp3': ['Plague', 1], '01 - Plague.mp3': ['Plague', 1], '01. Plague.mp3': ['Plague', 1], '01_Plague.flac': ['Plague', 1], '12-Child I Will Hurt You.ogg': ['Child I Will Hurt You', 12],
    'Plague.mp3': ['Plague', 0], '1999.mp3': ['1999', 0], '10,000 Days.mp3': ['10,000 Days', 0], '007.mp3': ['007', 0], 'Track 02.mp3': ['Track 02', 0], 'a.b.c.mp3': ['a.b.c', 0], '5 - .mp3': ['5 -', 0] };
  for (const [file, [title, n]] of Object.entries(names)) assert.deepEqual(L.nameParts(file), { title, track: n }, file);
});

test('a track fills in what the file lacks from where it is: the title from its name, the album from its folder, the artist from the folder above', () => {
  assert.deepEqual(track('Crystal Castles/(III)/02 Kerosene.mp3'), { id: 'Crystal Castles/(III)/02 Kerosene.mp3', path: 'Crystal Castles/(III)/02 Kerosene.mp3', folder: 'Crystal Castles/(III)', title: 'Kerosene', artist: 'Crystal Castles', albumArtist: '', album: '(III)', n: 2, disc: 0, ms: 0, cover: null });
  // what the file has wins
  const t = track('x/y/02 Kerosene.mp3', { title: 'Kero', artist: 'CC', albumArtist: 'Castles', album: 'III', track: 7, disc: 2, ms: 192000, cover: 'c1' });
  assert.deepEqual([t.title, t.artist, t.albumArtist, t.album, t.n, t.disc, t.ms, t.cover], ['Kero', 'CC', 'Castles', 'III', 7, 2, 192000, 'c1']);
  // one folder deep: an album and no artist; none deep: neither
  assert.deepEqual([track('Album/01 One.mp3').album, track('Album/01 One.mp3').artist], ['Album', '']);
  assert.deepEqual([track('loose.mp3').album, track('loose.mp3').artist, track('loose.mp3').title], ['', '', 'loose']);
  assert.equal(track('a/b.mp3', { compilation: true }).albumArtist, 'Various Artists');
});

test('times: 3:12, an hour and over as 1:14:12, nothing where it is not known', () => {
  assert.deepEqual([191900, 59999, 60000, 3599000, 3600000, 4452000].map(L.fmtDuration), ['3:12', '1:00', '1:00', '59:59', '1:00:00', '1:14:12']);
  for (const v of [0, undefined, NaN, -5, null]) assert.equal(L.fmtDuration(v), '');
});

// ---------------------------------------------------------------- albums

test('albums are grouped by album artist (else artist) and album, whatever folders the files are in; a disc to a folder is one album, in disc order', () => {
  const a = albumsOf([
    { path: 'Band/Double/CD2/01 c.mp3', title: 'c', artist: 'Band', albumArtist: 'Band', album: 'Double', track: 1, disc: 2 },
    { path: 'Band/Double/CD1/02 b.mp3', title: 'b', artist: 'Band', albumArtist: 'Band', album: 'Double', track: 2, disc: 1 },
    { path: 'Band/Double/CD1/01 a.mp3', title: 'a', artist: 'Band', albumArtist: 'Band', album: 'Double', track: 1, disc: 1 },
    { path: 'Band/Double/CD2/02 d.mp3', title: 'd', artist: 'Band', albumArtist: 'band', album: 'DOUBLE', track: 2, disc: 2 },
  ]);
  assert.equal(a.length, 1);
  assert.deepEqual(titles(a[0]), ['a', 'b', 'c', 'd']);
  assert.deepEqual([a[0].album, a[0].artist], ['Double', 'Band']);
});

test('two albums of one name that have no album artist are two, told by their folders; one folder\'s tracks of several artists are one compilation', () => {
  const a = albumsOf([
    { path: 'Ann/Greatest Hits/01 a.mp3', title: 'a', artist: 'Ann', album: 'Greatest Hits', track: 1 },
    { path: 'Bob/Greatest Hits/01 b.mp3', title: 'b', artist: 'Bob', album: 'Greatest Hits', track: 1 },
    { path: 'Mix/Summer/01 x.mp3', title: 'x', artist: 'X Band', album: 'Summer', track: 1 },
    { path: 'Mix/Summer/02 y.mp3', title: 'y', artist: 'Y Band', album: 'Summer', track: 2 },
  ]);
  assert.deepEqual(a.map((x) => [x.artist, x.album]), [['Ann', 'Greatest Hits'], ['Bob', 'Greatest Hits'], ['Various Artists', 'Summer']]);
});

test('compilations: an album artist of Various Artists, the compilation flag, or an album of several artists, all say Various Artists, and stay one album', () => {
  const tagged = albumsOf([
    { path: 'a.mp3', title: 'a', artist: 'One', albumArtist: 'Various Artists', album: 'Hits', track: 1 },
    { path: 'b.mp3', title: 'b', artist: 'Two', albumArtist: 'Various Artists', album: 'Hits', track: 2 },
    { path: 'c.mp3', title: 'c', artist: 'Three', albumArtist: 'Various Artists', album: 'Hits', track: 3 },
  ]);
  assert.deepEqual([tagged.length, tagged[0].artist, titles(tagged[0])], [1, 'Various Artists', ['a', 'b', 'c']]);
  const flagged = albumsOf([
    { path: 'a/1.mp3', title: 'a', artist: 'One', album: 'Hits', track: 1, compilation: true },
    { path: 'b/2.mp3', title: 'b', artist: 'Two', album: 'Hits', track: 2, compilation: true },
  ]);
  assert.deepEqual([flagged.length, flagged[0].artist], [1, 'Various Artists']);
});

test('files with no tags are albums by their folders and named by their files; loose ones are one "unknown album", last', () => {
  const a = albumsOf(['Ann/First/02 Two.flac', 'Ann/First/01 One.flac', 'Ann/First/10 Ten.flac', 'Bob/Second/b.wav', 'loose one.mp3', 'loose two.mp3']);
  assert.deepEqual(a.map((x) => [x.artist, x.album, titles(x)]), [
    ['Ann', 'First', ['One', 'Two', 'Ten']],
    ['Bob', 'Second', ['b']],
    ['', 'unknown album', ['loose one', 'loose two']],
  ]);
});

test('tracks: by disc, then track number; ones with no number after the numbered, by name as a person counts (2 before 10)', () => {
  const [album] = albumsOf([
    { path: 'a/Track 10.mp3', title: 'Track 10', album: 'A' }, { path: 'a/Track 2.mp3', title: 'Track 2', album: 'A' }, { path: 'a/z.mp3', title: 'Z', album: 'A', track: 1 },
    { path: 'a/y.mp3', title: 'Y', album: 'A', track: 5 }, { path: 'a/Track 1.mp3', title: 'Track 1', album: 'A' },
  ]);
  assert.deepEqual(titles(album), ['Z', 'Y', 'Track 1', 'Track 2', 'Track 10']);
});

test('the albums: alphabetical by artist without a leading "the", then album; the cover of the first track that has one; the length of the ones that have it', () => {
  const a = albumsOf([
    { path: 'z/1.mp3', title: 'z1', artist: 'The Zombies', album: 'Odessey', track: 1, ms: 1000 },
    { path: 'a/1.mp3', title: 'a1', artist: 'Aphex Twin', album: 'Syro', track: 1, ms: 2000, cover: 'c-syro' },
    { path: 'a/2.mp3', title: 'a2', artist: 'Aphex Twin', album: 'Syro', track: 2, ms: 3000 },
    { path: 'a/3.mp3', title: 'a3', artist: 'Aphex Twin', album: 'Drukqs', track: 1 },
    { path: 'a/4.mp3', title: 'a4', artist: 'Aphex Twin', album: 'Drukqs', track: 2, cover: 'c-drukqs' },
    { path: 'm/1.mp3', title: 'm1', artist: 'Massive Attack', album: 'Mezzanine', track: 1 },
  ]);
  assert.deepEqual(a.map((x) => x.album), ['Drukqs', 'Syro', 'Mezzanine', 'Odessey']);
  assert.deepEqual(a.map((x) => x.cover), ['c-drukqs', 'c-syro', null, null]);
  assert.deepEqual(a.map((x) => x.ms), [0, 5000, 0, 1000]);
  assert.deepEqual(a.map(L.albumLine), ['Aphex Twin · 2 tracks', 'Aphex Twin · 2 tracks · 0:05', 'Massive Attack · 1 track', 'The Zombies · 1 track · 0:01']);
  assert.equal(new Set(a.map((x) => x.id)).size, 4, 'each has its own id');
});

// ---------------------------------------------------------------- the queue

const CC = ['Plague', 'Kerosene', 'Wrath of God', 'Affection', 'Pale Flesh', 'Sad Eyes', 'Insulin', 'Transgender', 'Violent Youth', 'Telepath', 'Mercenary', 'Child I Will Hurt You'];
const [album] = albumsOf(CC.map((title, i) => ({ path: `Crystal Castles/(III)/${String(i + 1).padStart(2, '0')} ${title}.mp3`, title, artist: 'Crystal Castles', album: '(III)', track: i + 1, ms: 190000 })));

test('the queue is the album from a track on; next goes on, and at the end the album plays again', () => {
  let q = L.queueOf(album, 10);
  assert.equal(q.index, 10);
  q = L.queueNext(q);
  assert.equal(q.tracks[q.index].title, 'Child I Will Hurt You');
  q = L.queueNext(q);
  assert.equal(q.index, 0, 'plays the album through, then repeats');
  assert.equal(L.queueNext(L.queueOf({ id: 'x', tracks: [album.tracks[0]] }, 0)).index, 0, 'an album of one repeats it');
  assert.equal(L.queueOf(album, 99).index, 11);
  assert.equal(L.queueOf(album, -4).index, 0);
  assert.equal(L.queueOf(album, 3).id, album.id);
});

test('previous: past the first seconds, or on the first track, it starts this track again; else it goes to the one before', () => {
  const q = L.queueOf(album, 4);
  assert.deepEqual(L.queuePrevious(q, 1), { restart: false, queue: { ...q, index: 3 } });
  assert.deepEqual(L.queuePrevious(q, 3), { restart: false, queue: { ...q, index: 3 } }, 'three seconds in is still the first seconds');
  assert.deepEqual(L.queuePrevious(q, 3.01), { restart: true, queue: q });
  assert.deepEqual(L.queuePrevious(q, 60), { restart: true, queue: q });
  const first = L.queueOf(album, 0);
  assert.deepEqual(L.queuePrevious(first, 0), { restart: true, queue: first }, 'nothing before the first');
  assert.equal(L.queuePrevious(q).restart, false, 'no time given: the one before');
});

test('the line of what is near is the one in the kept still: the track before, this one with a mark, the next two', () => {
  assert.equal(L.queueText(L.queueLine(L.queueOf(album, 1))), '"01 Plague" , ▶ "02 Kerosene" , "03 Wrath of God" , "04 Affection"');
  assert.equal(L.queueText(L.queueLine(L.queueOf(album, 0))), '▶ "01 Plague" , "02 Kerosene" , "03 Wrath of God"', 'nothing before the first');
  assert.equal(L.queueText(L.queueLine(L.queueOf(album, 11))), '"11 Mercenary" , ▶ "12 Child I Will Hurt You"', 'nor after the last');
  assert.equal(L.queueText(L.queueLine(L.queueOf(album, 5), 0, 0)), '▶ "06 Sad Eyes"');
  assert.deepEqual(L.queueLine(L.queueOf(album, 1)).map((p) => p.now), [false, true, false, false]);
  assert.equal(L.trackLabel(L.queueOf(album, 0), 8), '09 Violent Youth');
});

// a random that is the same every run: the fractions given, round and round
const seeded = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('shuffled, the queue plays the album in a random order, the picked track first and every track once; next, previous and the line go by it', () => {
  const q = L.queueOf(album, 4, { shuffle: true, random: seeded(0.5, 0.1, 0.9, 0.3) });
  assert.equal(q.index, 4);
  assert.equal(q.order[0], 4, 'the picked one first');
  assert.deepEqual([...q.order].sort((a, b) => a - b), [...album.tracks.keys()], 'every track once');
  assert.notDeepEqual(q.order, [4, ...[...album.tracks.keys()].filter((k) => k !== 4)], 'not the album\'s order');
  const n1 = L.queueNext(q);
  assert.equal(n1.index, q.order[1]);
  assert.equal(L.queuePrevious(n1, 0).queue.index, 4, 'previous goes back by the order');
  let x = q;
  for (let k = 0; k < 11; k++) x = L.queueNext(x);
  assert.equal(x.index, q.order[11], 'the last of the order');
  assert.equal(L.queueNext(x).index, 4, 'then the order again');
  assert.equal(L.queueText(L.queueLine(n1)), [4, q.order[1], q.order[2], q.order[3]].map((i, k) => `${k === 1 ? '▶ ' : ''}"${L.trackLabel(q, i)}"`).join(' , '), 'the line of what is near is the order\'s');
  assert.deepEqual(L.withShuffle(n1, false), { id: n1.id, tracks: n1.tracks, index: n1.index }, 'shuffle off: the album\'s order on from this track');
  const on = L.withShuffle(L.queueOf(album, 7), true, seeded(0.2));
  assert.equal(on.order[0], 7, 'shuffle on: this track, then the rest at random');
  assert.equal(on.index, 7);
});

test('repeat: the album (the default) plays again; all goes on to the next album; one plays a track that ended again, and next still goes on', () => {
  const albums = albumsOf(['A/One/01 a.mp3', 'A/One/02 b.mp3', 'B/Two/01 c.mp3', 'B/Two/02 d.mp3']);
  const nextAlbum = (id) => albums[(albums.findIndex((a) => a.id === id) + 1) % albums.length];
  const q = L.queueOf(albums[0], 1);
  assert.equal(L.queueNext(q).index, 0, 'album: again from its first track');
  const on = L.queueNext(q, { repeat: 'all', nextAlbum });
  assert.deepEqual([on.id, on.index], [albums[1].id, 0], 'all: the next album, from its first track');
  assert.equal(L.queueNext(L.queueOf(albums[1], 1), { repeat: 'all', nextAlbum }).id, albums[0].id, 'after the last album, the first');
  assert.equal(L.queueNext(q, { repeat: 'all', nextAlbum: () => null }).index, 0, 'no album to go on to: this one again');
  assert.equal(L.queueNext(L.queueOf(albums[0], 0), { repeat: 'one', ended: true }).index, 0, 'one: the track that ended plays again');
  assert.equal(L.queueNext(L.queueOf(albums[0], 0), { repeat: 'one' }).index, 1, 'one: next, pressed, still goes on');
  let s = L.queueOf(albums[0], 1, { shuffle: true, random: seeded(0) });
  s = L.queueNext(s, { repeat: 'all', nextAlbum });
  s = L.queueNext(s, { repeat: 'all', nextAlbum, random: seeded(0.99) });
  assert.equal(s.id, albums[1].id);
  assert.ok(s.order && s.order.length === 2, 'shuffled, the next album is shuffled too');
  assert.deepEqual(L.REPEATS, ['album', 'all', 'one']);
  assert.deepEqual(['album', 'all', 'one', 'junk'].map(L.nextRepeat), ['all', 'one', 'album', 'album']);
  assert.deepEqual(['all', 'one', 'album', 'junk', undefined, 3].map(L.readRepeat), ['all', 'one', 'album', 'album', 'album', 'album'], 'as saved: one of the three, else the album');
});

test('the albums played lately: the latest first, once each, six at most; as saved, only ids', () => {
  let ids = [];
  for (const id of ['a', 'b', 'c', 'b', 'd', 'e', 'f', 'g']) ids = L.noteRecent(ids, id);
  assert.deepEqual(ids, ['g', 'f', 'e', 'd', 'b', 'c'], 'b played again goes first once; the seventh pushes the oldest off');
  assert.deepEqual(L.noteRecent(['a', 'b'], 'a'), ['a', 'b']);
  assert.deepEqual(L.readRecent(['x', 'y', 'x', 3, '', null, 'z']), ['x', 'y', 'z']);
  assert.deepEqual(L.readRecent(['1', '2', '3', '4', '5', '6', '7']).length, 6);
  for (const junk of [undefined, null, 'x', {}, 7]) assert.deepEqual(L.readRecent(junk), [], JSON.stringify(junk));
});

test('where the queue was, as saved: a track\'s path and the seconds into it, else nothing (an older profile has none)', () => {
  assert.deepEqual(L.readResume({ path: 'Crystal Castles/(III)/02 Kerosene.mp3', at: 81.4 }), { path: 'Crystal Castles/(III)/02 Kerosene.mp3', at: 81.4 });
  for (const junk of [null, undefined, {}, { path: '', at: 3 }, { path: 'a.mp3' }, { path: 'a.mp3', at: -1 }, { path: 'a.mp3', at: NaN }, { path: 7, at: 3 }, 'a.mp3']) assert.equal(L.readResume(junk), null, JSON.stringify(junk));
  assert.deepEqual(L.readResume({ path: 'a.mp3', at: 0, extra: 1 }), { path: 'a.mp3', at: 0 }, 'only what it holds');
});

// ---------------------------------------------------------------- scenes

const DOMAINS = { visual: ['scenery', 'worlds', 'chrome', 'spaghetti', 'off', 'warp'], theme: ['bluescreen', 'whitescreen', 'dynamic'], blockLook: ['dominoes', 'game', 'blocks'], gameScreens: ['os', 'neon'], sceneryScene: ['auto', 'koi', 'lake'], blocks: true, vertical: true };
const SETUP = { visual: 'worlds', sceneryScene: 'auto', blocks: true, blockLook: 'game', gameScreens: 'neon', theme: 'dynamic', codeHidden: false, vertical: false };

test('a scene is a setup in the shape of the presets: the settings they use and no others', () => {
  assert.deepEqual([...L.SETUP_KEYS].sort(), ['blockLook', 'blocks', 'codeHidden', 'gameScreens', 'sceneryScene', 'theme', 'vertical', 'visual']);
  for (const p of PRESETS) for (const k of Object.keys(p.settings)) assert.ok(L.SETUP_KEYS.includes(k), `${p.id}: ${k}`);
  // from the app's current state, which holds much more
  assert.deepEqual(L.setupOf({ ...SETUP, source: 'file', camera: true, recording: true, volume: 3, syncTrim: 20 }), SETUP);
  assert.deepEqual(Object.keys(L.setupOf({})).sort(), [...L.SETUP_KEYS].sort());
});

test('save a scene: named "my scene N" (the first number free) or as asked, a copy of the setup, last in the list, each with its own id', () => {
  let scenes = [];
  scenes = L.saveScene(scenes, SETUP, '', 1000);
  scenes = L.saveScene(scenes, { ...SETUP, theme: 'bluescreen' }, '', 1000);
  scenes = L.saveScene(scenes, SETUP, '  Evening   set  ', 2000);
  assert.deepEqual(scenes.map((s) => s.name), ['my scene 1', 'my scene 2', 'Evening set']);
  assert.equal(new Set(scenes.map((s) => s.id)).size, 3, 'two saved in the same millisecond still have their own ids');
  assert.deepEqual(scenes[0].settings, SETUP);
  assert.notEqual(scenes[0].settings, SETUP, 'a copy, so what is saved does not change with the page');
  assert.equal(L.defaultSceneName(L.deleteScene(scenes, scenes[0].id)), 'my scene 1', 'a number that is free again');
  assert.equal(L.saveScene([], SETUP, 'x'.repeat(80))[0].name.length, 40);
});

test('rename keeps the scene and changes its name (an empty name changes nothing); delete takes it away; neither touches the others', () => {
  const scenes = L.saveScene(L.saveScene([], SETUP, 'one', 1), SETUP, 'two', 2);
  const [a, b] = scenes;
  assert.deepEqual(L.renameScene(scenes, a.id, '  First  ').map((s) => s.name), ['First', 'two']);
  assert.deepEqual(L.renameScene(scenes, a.id, '   '), scenes);
  assert.deepEqual(L.renameScene(scenes, 'nope', 'x'), scenes);
  assert.deepEqual(L.renameScene(scenes, b.id, 'Second')[1].settings, b.settings);
  assert.deepEqual(L.deleteScene(scenes, a.id), [b]);
  assert.deepEqual(L.deleteScene(scenes, 'nope'), scenes);
  assert.deepEqual(L.deleteScene(L.deleteScene(scenes, a.id), b.id), []);
});

test('scenes are saved with the other settings and come back as they were; an older profile has none; junk is left out', () => {
  const scenes = L.saveScene(L.saveScene([], SETUP, 'one', 1), { ...SETUP, codeHidden: 'beat', visual: 'scenery', sceneryScene: 'koi' }, 'two', 2);
  assert.deepEqual(L.readScenes(JSON.parse(JSON.stringify(scenes)), DOMAINS), scenes);
  for (const none of [undefined, null, 0, 'x', {}, [], {}]) assert.deepEqual(L.readScenes(none, DOMAINS), [], JSON.stringify(none));
  const junk = [
    scenes[0], scenes[0], // (the same id twice)
    { id: 's9', name: 'ok', settings: { visual: 'nope', theme: 'dynamic', extra: 1, blocks: 'yes', codeHidden: 'beat' } }, // (only what is known is kept)
    { id: 's8', name: 'nothing', settings: { visual: 'nope' } }, { id: 's7', name: '   ', settings: SETUP }, { id: '', name: 'x', settings: SETUP }, { name: 'x', settings: SETUP },
    { id: 's6', name: 'x', settings: null }, null, 7, 'x', [], { id: 's5', name: 'y', settings: { theme: 'terminal' } },
  ];
  const read = L.readScenes(junk, DOMAINS);
  assert.deepEqual(read.map((s) => s.id), [scenes[0].id, 's9']);
  assert.deepEqual(read[1].settings, { theme: 'dynamic', codeHidden: 'beat' });
  assert.equal(L.readScenes(Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, name: `n${i}`, settings: SETUP })), DOMAINS).length, 60, 'at most sixty');
  assert.equal(L.readScenes([{ id: 'a', name: 'x'.repeat(100), settings: SETUP }], DOMAINS)[0].name.length, 40);
});

test('a saved scene applies as a preset does: through the setters, for the settings that differ, the layout first', async () => {
  const [scene] = L.saveScene([], { ...SETUP, vertical: true }, 'one', 1);
  const current = { ...SETUP, theme: 'bluescreen', blocks: true, vertical: false, other: 'stays' }, calls = [];
  const setters = Object.fromEntries(L.SETUP_KEYS.map((k) => [k, (v) => { calls.push(k); current[k] = v; }]));
  assert.equal(await applyPreset(scene, current, setters), true);
  assert.deepEqual(calls, ['vertical', 'theme']);
  assert.equal(current.other, 'stays');
  assert.equal(L.sceneIsOn(scene, current), true);
  assert.equal(L.sceneIsOn(scene, { ...current, theme: 'pink' }), false);
  assert.equal(await applyPreset(scene, current, setters), false, 'again, nothing to change');
});

test('a scene\'s picture is the scene it shows, or the background\'s own, and the picture is there', () => {
  const has = (p) => fs.existsSync(new URL('../renderer/' + p, import.meta.url));
  assert.equal(L.scenePicture({ visual: 'scenery', sceneryScene: 'koi' }), 'thumbs/scene-koi.webp');
  assert.equal(L.scenePicture({ visual: 'scenery' }), 'thumbs/scene-auto.webp');
  assert.equal(L.scenePicture({ visual: 'worlds' }), 'thumbs/bg-worlds.webp');
  assert.equal(L.scenePicture({ visual: 'spaghetti' }), 'thumbs/spaghetti-snakes.webp');
  assert.equal(L.scenePicture({ visual: 'warp' }), null);
  assert.equal(L.scenePicture({}), null);
  for (const scene of ['auto', 'lake', 'sea', 'fire', 'snow', 'city', 'garden', 'falls', 'halloween', 'sharks', 'festival', 'koi', 'space', 'eye']) assert.ok(has(L.scenePicture({ visual: 'scenery', sceneryScene: scene })), scene);
  for (const visual of ['chrome', 'cuts', 'fire', 'off', 'rain', 'spectrogram', 'worlds', 'spaghetti']) assert.ok(has(L.scenePicture({ visual })), visual);
  for (const p of PRESETS) assert.ok(has(p.picture), p.id);
});

// ---------------------------------------------------------------- the radio

test('stations, as saved: the most recent first, only addresses of streams, no repeats; an older profile has the last one played', () => {
  const saved = [{ url: 'https://a.example/s', at: 5 }, { url: 'http://b.example:8000/live', at: 20 }, { url: 'https://a.example/s', at: 99 }, { url: 'ftp://c.example/x', at: 30 },
    { url: 'not a url', at: 1 }, { url: 7, at: 1 }, null, { url: 'https://d.example/', at: 'x' }];
  assert.deepEqual(L.readStations(saved), [{ url: 'http://b.example:8000/live', at: 20 }, { url: 'https://a.example/s', at: 5 }, { url: 'https://d.example/', at: 0 }]);
  assert.deepEqual(L.readStations(undefined, 'https://stream.example/aac'), [{ url: 'https://stream.example/aac', at: 0 }]);
  assert.deepEqual(L.readStations([], ''), []);
  assert.deepEqual(L.readStations([], 'javascript:alert(1)'), []);
  assert.deepEqual(L.readStations(saved, 'https://last.example/'), L.readStations(saved), 'the last one is only the one station when there are none');
  assert.equal(L.readStations(Array.from({ length: 50 }, (_, i) => ({ url: `https://s${i}.example/`, at: i }))).length, 30);
});

test('a station played now goes first, once; the list holds thirty', () => {
  let list = [];
  list = L.noteStation(list, 'https://a/', 1);
  list = L.noteStation(list, 'https://b/', 2);
  list = L.noteStation(list, 'https://a/', 3);
  assert.deepEqual(list, [{ url: 'https://a/', at: 3 }, { url: 'https://b/', at: 2 }]);
  for (let i = 0; i < 40; i++) list = L.noteStation(list, `https://s${i}/`, 10 + i);
  assert.equal(list.length, 30);
  assert.equal(list[0].url, 'https://s39/');
});

test('a station by its host and path, and when it was played', () => {
  assert.deepEqual(L.stationParts('https://stream.radioparadise.com/aac-128'), { host: 'stream.radioparadise.com', path: '/aac-128' });
  assert.deepEqual(L.stationParts('http://www.wfmu.org:8000/'), { host: 'wfmu.org:8000', path: '' });
  assert.deepEqual(L.stationParts('https://x.example/live?mount=1'), { host: 'x.example', path: '/live?mount=1' });
  assert.deepEqual(L.stationParts('junk'), { host: 'junk', path: '' });
  const now = 10 * 24 * 3600 * 1000;
  assert.deepEqual([now - 20000, now - 5 * 60000, now - 3 * 3600000, now - 2 * 86400000, 0].map((at) => L.agoText(at, now)), ['just now', '5 min ago', '3 h ago', '2 d ago', '']);
});

// ---------------------------------------------------------------- the cover in characters

test('the cover as characters: black is empty, white is the densest, light picks the glyph, see-through is dark', () => {
  const px = (v, a = 255) => [v, v, v, a];
  const rgba = Uint8ClampedArray.from([...px(0), ...px(255), ...px(128), ...px(255, 0), ...px(30), ...px(220), ...[255, 0, 0, 255], ...[0, 255, 0, 255]]);
  const rows = L.glyphRows(rgba, 4, 2);
  assert.equal(L.GLYPHS, ' .:-=+*#%@');
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.length === 4));
  assert.equal(rows[0][0], ' ');
  assert.equal(rows[0][1], '@');
  assert.equal(rows[0][2], '+', 'mid grey: 0.5 to the 0.9 of ten glyphs');
  assert.equal(rows[0][3], ' ', 'see-through counts as dark');
  assert.ok(L.GLYPHS.indexOf(rows[1][0]) < L.GLYPHS.indexOf(rows[1][1]), 'dark before light');
  assert.ok(L.GLYPHS.indexOf(rows[1][2]) < L.GLYPHS.indexOf(rows[1][3]), 'a red is darker than a green');
  // a ramp from dark to light is a ramp from empty to dense, never back
  const ramp = Uint8ClampedArray.from(Array.from({ length: 64 }, (_, i) => px(Math.round((i / 63) * 255))).flat());
  const row = L.glyphRows(ramp, 64, 1)[0];
  const levels = [...row].map((c) => L.GLYPHS.indexOf(c));
  assert.ok(levels.every((v, i) => !i || v >= levels[i - 1]));
  assert.deepEqual([levels[0], levels.at(-1)], [0, 9]);
  assert.deepEqual(L.glyphRows(new Uint8ClampedArray(0), 0, 0), []);
});

// ---------------------------------------------------------------- find

test('find compares text in lower case without accents, and knows where each character came from', () => {
  assert.equal(L.findForm('Beyoncé').text, 'beyonce');
  assert.equal(L.findForm('Straße').text, 'strasse');
  assert.equal(L.findForm('ﬁve').text, 'five');
  assert.deepEqual(L.findForm('aßb').at, [0, 1, 1, 2], 'ß is two characters, both from the one');
  assert.deepEqual(L.findWords('  Crystal   CASTLES '), ['crystal', 'castles']);
  assert.deepEqual(L.findWords(''), []);
});

test('find marks the first place each word is, in the original, the ones that touch joined', () => {
  assert.deepEqual(L.findMarks('Crystal Castles', ['cast']), [[8, 12]]);
  assert.deepEqual(L.findMarks('Beyoncé', ['beyonce']), [[0, 7]], 'the é is marked');
  assert.deepEqual(L.findMarks('Straße', ['strasse']), [[0, 6]]);
  assert.deepEqual(L.findMarks('Kerosene', ['ker', 'ros']), [[0, 5]], 'two words that overlap are one mark');
  assert.deepEqual(L.findMarks('Plague', ['x']), []);
  assert.deepEqual(L.findMarks('Not in Love', ['love', 'not']), [[0, 3], [7, 11]], 'in order of where they are');
});

test('find lists the albums that have every word, then the tracks: the ones with every word in their title first', () => {
  const albums = albumsOf([
    'Crystal Castles/(III)/01 Plague.mp3', 'Crystal Castles/(III)/02 Kerosene.mp3', 'Crystal Castles/(III)/03 Wrath of God.mp3',
    'Crystal Castles/Crystal Castles/01 Untrust Us.mp3', 'Crystal Castles/Crystal Castles/02 Courtship Dating.mp3',
    'Kerosene Kids/Burn/01 Intro.mp3',
  ]);
  const kinds = (r) => r.rows.map((x) => (x.kind === 'album' ? `A:${x.album.album}` : `T:${x.track.title}`));
  assert.deepEqual(kinds(L.findRows(albums, 'kerosene')), ['A:Burn', 'T:Kerosene', 'T:Intro'], 'the album by its artist, then the title, then a track by its artist');
  assert.deepEqual(kinds(L.findRows(albums, 'castles plague')), ['T:Plague'], 'every word, from any of title, artist and album');
  assert.deepEqual(kinds(L.findRows(albums, 'CRYSTAL dating')), ['T:Courtship Dating']);
  assert.deepEqual(kinds(L.findRows(albums, 'nothing like it')), []);
  assert.deepEqual(L.findRows(albums, '   '), { rows: [], total: 0 });
  const t = L.findRows(albums, 'wrath').rows[0];
  assert.equal(t.album.album, '(III)');
  assert.equal(t.album.tracks[t.index].title, 'Wrath of God', 'a track row is the track in its album, for a play from it');
  const few = L.findRows(albums, 'crystal', 3);
  assert.equal(few.rows.length, 3);
  assert.equal(few.total, 7, 'two albums and five tracks in all');
});

// ---------------------------------------------------------------- the cursor

const many = albumsOf(['a', 'b', 'c', 'd'].flatMap((x) => [1, 2, 3].map((n) => ({ path: `${x}/${n}.mp3`, title: `${x}${n}`, artist: x.toUpperCase(), album: `Album ${x}`, track: n }))));

test('your music lists the open album\'s tracks, then every other album folded; with none open, only albums', () => {
  const rows = L.musicRows(many, many[1].id);
  assert.deepEqual(rows.map((r) => (r.kind === 'track' ? r.track.title : r.album.album)), ['b1', 'b2', 'b3', 'Album a', 'Album c', 'Album d']);
  assert.deepEqual(rows.map((r) => r.kind), ['track', 'track', 'track', 'album', 'album', 'album']);
  assert.deepEqual(L.musicRows(many, null).map((r) => r.kind), ['album', 'album', 'album', 'album']);
  assert.deepEqual(L.musicRows(many, 'gone').map((r) => r.kind), ['album', 'album', 'album', 'album']);
  assert.deepEqual(L.musicRows([], null), []);
});

test('the cursor moves a row at a time and stops at the ends', () => {
  assert.deepEqual([0, 1, 5].map((c) => L.moveCursor(6, c, 1)), [1, 2, 5]);
  assert.deepEqual([0, 1, 5].map((c) => L.moveCursor(6, c, -1)), [0, 0, 4]);
  assert.equal(L.moveCursor(6, 2, 100), 5);
  assert.equal(L.moveCursor(6, 2, -100), 0);
  assert.equal(L.moveCursor(0, 0, 1), 0, 'nothing to move over');
});

test('right on a folded album opens it and the one open folds, the cursor on its first track; left on a track folds its album, the cursor on it', () => {
  const rows = L.musicRows(many, many[1].id);
  assert.equal(L.unfold(many, rows, 0), null, 'a track is already open');
  assert.deepEqual(L.unfold(many, rows, 4), { openId: many[2].id, cursor: 0 });
  assert.deepEqual(L.musicRows(many, L.unfold(many, rows, 4).openId).slice(0, 3).map((r) => r.track.title), ['c1', 'c2', 'c3']);
  assert.equal(L.fold(many, rows, 3), null, 'a folded album is already folded');
  const folded = L.fold(many, rows, 2);
  assert.equal(folded.openId, null);
  assert.equal(L.musicRows(many, null)[folded.cursor].album, many[1], 'the cursor is on the album it folded');
  assert.equal(L.fold(many, [], 0), null);
});

test('after a scan the cursor stays on its row if that is still there, and is kept inside the list if not', () => {
  const rows = L.musicRows(many, many[1].id);
  assert.equal(L.keepCursor(rows[4], L.musicRows(many.slice(1), many[1].id), 4), 3, 'the album it was on, a row up now that the first is gone');
  assert.equal(L.keepCursor(rows[1], L.musicRows(many, many[1].id), 1), 1);
  assert.equal(L.keepCursor(rows[5], L.musicRows(many.slice(0, 2), many[1].id), 5), 3, 'its album is gone: the last row');
  assert.equal(L.keepCursor(undefined, rows, 2), 2);
  assert.equal(L.keepCursor(rows[2], [], 2), 0);
});

test('the sections go round: your music, radio, scenes, and back', () => {
  assert.deepEqual(L.SECTIONS, [['music', 'your music'], ['radio', 'radio'], ['scenes', 'scenes']]);
  assert.deepEqual(['music', 'radio', 'scenes', 'music'].map((s) => L.nextSection(s)), ['radio', 'scenes', 'music', 'radio']);
  assert.deepEqual(['music', 'radio', 'scenes'].map((s) => L.nextSection(s, -1)), ['scenes', 'music', 'radio']);
});
