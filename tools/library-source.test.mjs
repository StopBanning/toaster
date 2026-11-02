// Where the library's tracks come from (renderer/library-source.js): the app's, through the bridge main gives the page (a File made of
// the bytes main read; the folder's label; what was kept of the last scan), and a browser's, a folder picked with showDirectoryPicker and
// read here with the page's own readers: its tags and covers, albums' covers read once, hidden files left out, the page's frames let
// through, a file that can't be read still listed. Run on stand-in directory handles over real tagged files (tools/tag-fixtures.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desktopSource, librarySource, scanHandle, typeOf, webSource } from '../renderer/library-source.js';
import { apicBody, fakeJpeg, id3Tag } from './cover-fixtures.mjs';
import { m4a, mp3, textFrame } from './tag-fixtures.mjs';

// a directory handle of what is given: { name: bytes | { ...more } }, in the order of the object (a real one has no order)
const dir = (name, tree) => ({
  kind: 'directory', name,
  async *entries() { for (const [n, v] of Object.entries(tree)) yield [n, v instanceof Uint8Array ? file(n, v) : dir(n, v)]; },
});
const file = (name, bytes) => ({ kind: 'file', name, getFile: async () => new File([bytes], name) });
const track = (title, album, n, cover) => mp3({ frames: 8, tag: id3Tag({ version: 3, frames: [textFrame('TIT2', title), textFrame('TPE1', 'Band'), textFrame('TALB', album), textFrame('TRCK', `${n}/3`), ...(cover ? [{ id: 'APIC', body: apicBody(cover), flags: [0, 0] }] : [])] }) });
const COVER = fakeJpeg(900), OTHER = fakeJpeg(700);
// what a page would do with a cover: a small copy of it by what it is (the stand-ins: its length), its id the same
const thumbnail = async (bytes) => `thumb${bytes.length}`;
const hash = async (bytes) => `id${bytes.length}`;

test('a typed name for the file the page plays: by extension, in any case', () => {
  assert.deepEqual(['a.mp3', 'a.M4A', 'a.mp4', 'a.aac', 'a.flac', 'a.ogg', 'a.oga', 'a.opus', 'a.wav', 'a.webm', 'a.txt', 'a'].map(typeOf),
    ['audio/mpeg', 'audio/mp4', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/ogg', 'audio/ogg', 'audio/wav', 'audio/webm', '', '']);
});

test('a folder is read in a browser: the audio files by their path, their names and length from their tags, an album\'s cover once', async () => {
  const frames = [];
  const root = dir('Music', {
    '.hidden': { 'secret.mp3': track('Secret', 'Hidden', 1) }, '.DS_Store': new Uint8Array(10), 'notes.txt': new Uint8Array(5),
    Band: { First: { '01 One.mp3': track('One', 'First', 1, COVER), '02 Two.mp3': track('Two', 'First', 2), '03 Three.mp3': track('Three', 'First', 3, COVER) }, Second: { '01 Solo.mp3': track('Solo', 'Second', 1, OTHER) } },
    'Tame.m4a': m4a({ tags: { title: 'Be Above It', artist: 'Tame Impala', album: 'Lonerism', track: [1, 13] }, seconds: 213, pictures: [[COVER, 13]] }),
    'loose.flac': new Uint8Array(900),
  });
  const seen = [];
  const got = await scanHandle(root, { thumbnail, hash, progress: (p) => seen.push(p), frame: async () => { frames.push(1); } });
  assert.deepEqual(got.tracks.map((t) => t.path), ['Band/First/01 One.mp3', 'Band/First/02 Two.mp3', 'Band/First/03 Three.mp3', 'Band/Second/01 Solo.mp3', 'Tame.m4a', 'loose.flac'], 'in order of their names; no hidden file, no text file');
  const by = Object.fromEntries(got.tracks.map((t) => [t.path, t]));
  assert.deepEqual({ ...by['Band/First/02 Two.mp3'], ms: by['Band/First/02 Two.mp3'].ms > 150 }, { path: 'Band/First/02 Two.mp3', title: 'Two', artist: 'Band', album: 'First', track: 2, ms: true, cover: `id${COVER.length}` }, 'the album\'s cover, though this track has none: it is the album\'s');
  assert.equal(by['Tame.m4a'].ms, 213000);
  assert.equal(by['Tame.m4a'].cover, `id${COVER.length}`, 'a cover of the same picture is the same cover');
  assert.equal(by['Band/Second/01 Solo.mp3'].cover, `id${OTHER.length}`);
  assert.deepEqual(by['loose.flac'], { path: 'loose.flac' }, 'a file read from its name: nothing of its own');
  assert.deepEqual(got.covers, { [`id${COVER.length}`]: `thumb${COVER.length}`, [`id${OTHER.length}`]: `thumb${OTHER.length}` });
  assert.deepEqual([...got.handles.keys()].sort(), got.tracks.map((t) => t.path).sort());
  assert.ok(seen.length >= 1 && seen.at(-1).seen === 6 && seen.at(-1).read === 6, JSON.stringify(seen.at(-1)));
  void frames;
});

test('the page\'s frames are let through while it reads: a pause every so often, and not for a small folder in a moment', async () => {
  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`${String(i).padStart(2, '0')} t.mp3`, track(`T${i}`, 'Many', i + 1)]));
  let pauses = 0, now = 0;
  const realNow = Date.now;
  Date.now = () => (now += 12); // (every file takes 12 ms)
  try { await scanHandle(dir('Many', many), { thumbnail, hash, frame: async () => { pauses++; } }); } finally { Date.now = realNow; }
  assert.ok(pauses >= 10 && pauses <= 40, `${pauses} pauses for 40 files`);
});

test('a file that cannot be read is listed by its name; the depth and the limit hold; a folder with nothing is nothing', async () => {
  const bad = { kind: 'file', name: 'broken.mp3', getFile: async () => { throw new Error('gone'); } };
  const root = { kind: 'directory', name: 'x', async *entries() { yield ['broken.mp3', bad]; yield ['ok.mp3', file('ok.mp3', track('Fine', 'Alb', 1))]; } };
  const got = await scanHandle(root, { thumbnail, hash, frame: async () => {} });
  assert.deepEqual(got.tracks.map((t) => [t.path, t.title]), [['broken.mp3', undefined], ['ok.mp3', 'Fine']]);
  let deep = { 'far.mp3': track('Far', 'Far', 1) };
  for (let i = 0; i < 20; i++) deep = { [`d${i}`]: deep };
  assert.deepEqual((await scanHandle(dir('x', deep), { thumbnail, hash, frame: async () => {} })).tracks, [], 'too deep to reach');
  const five = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`${i}.mp3`, track(`T${i}`, 'A', i + 1)]));
  assert.equal((await scanHandle(dir('x', five), { thumbnail, hash, frame: async () => {}, limit: 3 })).tracks.length, 3);
  assert.deepEqual((await scanHandle(dir('empty', {}), { thumbnail, hash, frame: async () => {} })).tracks, []);
});

test('a folder in it that cannot be read is left out and the rest is read; the folder picked has to be read', async () => {
  const locked = { kind: 'directory', name: 'Locked', async *entries() { throw new DOMException('denied', 'NotAllowedError'); } };
  const root = { kind: 'directory', name: 'x', async *entries() { yield ['Locked', locked]; yield ['ok.mp3', file('ok.mp3', track('Fine', 'Alb', 1))]; } };
  assert.deepEqual((await scanHandle(root, { thumbnail, hash, frame: async () => {} })).tracks.map((t) => t.path), ['ok.mp3']);
  await assert.rejects(scanHandle(locked, { thumbnail, hash, frame: async () => {} }), /could not read the folder/);
});

test('a scan that is told to stop stops at the next file and gives nothing: told before it begins, in the middle, or at the last file', async () => {
  const signal = { aborted: false };
  let reads = 0, stopAt = 0;
  // four tracks whose reads are counted, the stop given as the stopAt-th is read
  const four = { kind: 'directory', name: 'x', async *entries() {
    for (const n of ['a.mp3', 'b.mp3', 'c.mp3', 'd.mp3']) yield [n, { kind: 'file', name: n, getFile: async () => { if (++reads === stopAt) signal.aborted = true; return new File([track(n, 'A', 1)], n); } }];
  } };
  const scan = () => scanHandle(four, { thumbnail, hash, frame: async () => {}, signal });
  stopAt = 2;
  await assert.rejects(scan(), /stopped/);
  assert.equal(reads, 2, 'no file is read after the one it was told in');
  signal.aborted = true;
  reads = 0;
  await assert.rejects(scan(), /stopped/);
  assert.equal(reads, 0, 'told before it begins, it reads nothing');
  signal.aborted = false;
  reads = 0;
  stopAt = 4;
  await assert.rejects(scan(), /stopped/, 'told while the last file is read: there is no next file to stop at, and still nothing is given');
  signal.aborted = false;
  reads = 0;
  stopAt = 0;
  assert.equal((await scan()).tracks.length, 4, 'not told, it reads them all');
});

test('a cover the page cannot draw is no cover: the album has none, and the scan goes on', async () => {
  const root = dir('x', { 'a.mp3': track('A', 'Alb', 1, COVER), 'b.mp3': track('B', 'Alb', 2, COVER) });
  const got = await scanHandle(root, { thumbnail: async () => null, hash, frame: async () => {} });
  assert.deepEqual(got.covers, {});
  assert.deepEqual(got.tracks.map((t) => t.cover), [undefined, undefined]);
});

test('a browser\'s source: the picker\'s folder, scanned, its files handed back to play; cancelling picks nothing; none is none', async () => {
  const folder = dir('My Music', { Band: { 'one.mp3': track('One', 'Alb', 1, COVER) } });
  let asked;
  const win = { showDirectoryPicker: async (o) => { asked = o; return folder; }, crypto: { subtle: { digest: async () => new Uint8Array(20) } }, requestAnimationFrame: (f) => setTimeout(f, 0) };
  const src = webSource(win);
  assert.equal(src.kind, 'web');
  assert.equal(src.supported, true);
  assert.equal(await src.start(), false, 'no folder yet');
  assert.equal(await src.cached(), null);
  await assert.rejects(src.scan(), /no folder/);
  assert.equal(await src.choose(), 'My Music');
  assert.deepEqual(asked, { id: 'toaster-music', mode: 'read', startIn: 'music' });
  assert.equal(src.folder, 'My Music');
  assert.equal(await src.start(), true);
  // (the page's own canvas makes a cover's copy; here there is none, so it has none)
  const got = await src.scan(() => {});
  assert.equal(got.folder, 'My Music');
  assert.deepEqual(got.tracks.map((t) => [t.path, t.title]), [['Band/one.mp3', 'One']]);
  const f = await src.file(got.tracks[0]);
  assert.ok(f instanceof File && f.name === 'one.mp3' && f.size > 100);
  await assert.rejects(src.file({ path: 'gone.mp3' }), /not in the folder/);
  assert.deepEqual(await src.cached(), got);
  // cancelled: the picker's AbortError is a null, not an error; any other error is one
  const cancel = webSource({ ...win, showDirectoryPicker: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } });
  assert.equal(await cancel.choose(), null);
  await assert.rejects(webSource({ ...win, showDirectoryPicker: async () => { throw Object.assign(new Error('blocked'), { name: 'SecurityError' }); } }).choose(), /blocked/);
  assert.equal(webSource({}).supported, false, 'a browser with no picker');
});

// a browser's folder whose files wait on the test: `inside` comes once the first read is in it, and release() lets the reads go on
function held(name, names) {
  let release, reached;
  const wait = new Promise((resolve) => { release = resolve; }), inside = new Promise((resolve) => { reached = resolve; });
  const handle = { kind: 'directory', name, async *entries() {
    for (const n of names) yield [n, { kind: 'file', name: n, getFile: async () => { reached(); await wait; return new File([track(n, name, 1)], n); } }];
  } };
  return { handle, release, inside };
}
const aBrowser = (picker) => ({ showDirectoryPicker: picker, crypto: { subtle: { digest: async () => new Uint8Array(20) } }, requestAnimationFrame: (f) => setTimeout(f, 0) });

test('a folder picked while another is being read stops that read, which gives nothing under any name; the new folder is read as itself', async () => {
  const first = held('First', ['a.mp3', 'b.mp3']), second = dir('Second', { 'c.mp3': track('C', 'Two', 1) });
  const picks = [first.handle, second];
  const src = webSource(aBrowser(async () => picks.shift()));
  assert.equal(await src.choose(), 'First');
  const reading = src.scan(() => {});
  const stopped = assert.rejects(reading, /stopped/);
  await first.inside;
  assert.equal(await src.choose(), 'Second'); // (picked in the middle of the first's read)
  first.release();
  await stopped;
  assert.equal(await src.cached(), null, 'the first folder\'s tracks are not kept as the second\'s');
  assert.equal(src.folder, 'Second');
  const got = await src.scan(() => {});
  assert.deepEqual([got.folder, got.tracks.map((t) => t.path)], ['Second', ['c.mp3']]);
  assert.deepEqual(await src.cached(), got);
});

test('a picker that is cancelled while a folder is being read changes nothing: the read goes on to the end, under its own name', async () => {
  const first = held('First', ['a.mp3']);
  let answer = async () => first.handle;
  const src = webSource(aBrowser(() => answer()));
  assert.equal(await src.choose(), 'First');
  const reading = src.scan(() => {});
  await first.inside;
  answer = async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); };
  assert.equal(await src.choose(), null);
  first.release();
  const got = await reading;
  assert.deepEqual([got.folder, got.tracks.map((t) => t.path)], ['First', ['a.mp3']]);
  assert.deepEqual(await src.cached(), got);
});

test('the app\'s source: what main keeps, a scan with its progress, the bytes as a File of the right type', async () => {
  let progress;
  const scanned = { folder: '~/Music', tracks: [{ path: 'a/b.mp3', title: 'B' }], covers: {} };
  const nc = {
    libraryFolder: async () => ({ path: '/Users/x/Music', label: '~/Music', chosen: false }), libraryCached: async () => scanned,
    libraryScan: async () => { progress({ seen: 3, files: 3, read: 1, reading: 3 }); return scanned; }, libraryChoose: async () => ({ path: '/Users/x/Other', label: '~/Other', chosen: true }),
    libraryRead: async (rel) => ({ name: rel.split('/').pop(), bytes: new Uint8Array([1, 2, 3, 4]) }), onLibraryProgress: (fn) => { progress = fn; },
  };
  const src = desktopSource(nc);
  assert.equal(src.kind, 'desktop');
  assert.equal(await src.start(), true);
  assert.equal(src.folder, '~/Music');
  assert.deepEqual(await src.cached(), scanned);
  const seen = [];
  assert.deepEqual(await src.scan((p) => seen.push(p)), scanned);
  assert.deepEqual(seen, [{ seen: 3, files: 3, read: 1, reading: 3 }]);
  assert.equal(await src.choose(), '~/Other');
  assert.equal(src.folder, '~/Other');
  const f = await src.file({ path: 'Band/Album/01 Song.flac' });
  assert.deepEqual([f.name, f.type, f.size], ['01 Song.flac', 'audio/flac', 4]);
  // main with none to give (a copy with no folder): nothing is cached, and start says so
  const none = desktopSource({ ...nc, libraryFolder: async () => null, libraryCached: async () => null, libraryChoose: async () => null });
  assert.equal(await none.start(), false);
  assert.equal(await none.cached(), null);
  assert.equal(await none.choose(), null);
});

test('the page takes the app\'s way where main gives the calls, and a browser\'s where it does not', () => {
  assert.equal(librarySource({ nc: { libraryScan() {}, onLibraryProgress() {} } }).kind, 'desktop');
  assert.equal(librarySource({ nc: { platform: 'web' } }).kind, 'web');
  assert.equal(librarySource({}).kind, 'web');
});
