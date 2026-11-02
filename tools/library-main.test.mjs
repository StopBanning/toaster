// The library in the main process (helpers/library.cjs, library-worker.cjs, and how main.js and preload.js give it to the page): the
// only read of a file there is, and everything it refuses; the walk; the scan that reads only what changed, in a worker, with its
// cache; the folder you chose and the one it starts with. Run on folders built here under scratch, with files that carry tags and
// covers (tools/tag-fixtures.mjs, cover-fixtures.mjs). Nobody's music, and never a folder of anyone's.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { AUDIO_EXTENSIONS as PAGE_EXTENSIONS, readTags } from '../renderer/audio-tags.js';
import { embeddedCover } from '../renderer/embedded-cover.js';
import { apicBody, fakeJpeg, id3Tag, join } from './cover-fixtures.mjs';
import { scratch } from './paths.mjs';
import { m4a, mp3, textFrame } from './tag-fixtures.mjs';

const lib = createRequire(import.meta.url)('../helpers/library.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererDir = path.join(root, 'renderer');
const made = [];
// (under scratch, as throwaway output goes; where there is none to be made, the temporary folder)
const parent = (() => { try { fs.mkdirSync(scratch(), { recursive: true }); return scratch(); } catch { return os.tmpdir(); } })();
const folder = (name) => { const dir = fs.mkdtempSync(path.join(parent, `library-${name}-`)); made.push(dir); return fs.realpathSync(dir); };
// links (a Windows account that may not make them has none: what is tested through them is skipped there)
const linking = (() => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-link-')); try { fs.symlinkSync(dir, path.join(dir, 'l')); return true; } catch { return false; } finally { fs.rmSync(dir, { recursive: true, force: true }); } })();
const link = (target, file) => { if (linking) fs.symlinkSync(target, file); };
after(() => { for (const dir of made) { try { fs.chmodSync(path.join(dir, 'music', 'locked'), 0o755); } catch { /* none */ } fs.rmSync(dir, { recursive: true, force: true }); } });
const put = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); return file; };

const COVER_A = fakeJpeg(900), COVER_B = fakeJpeg(1200);
const tagged = (title, album, track, { artist = 'Crystal Castles', cover, frames = 12 } = {}) => mp3({ frames, tag: id3Tag({ version: 3, frames: [
  textFrame('TIT2', title), textFrame('TPE1', artist), textFrame('TALB', album), textFrame('TRCK', `${track}/3`), ...(cover ? [{ id: 'APIC', body: apicBody(cover), flags: [0, 0] }] : [])] }) });

// a folder with music in it (and what is not music, hidden, linked and outside)
function build(name = 'tree') {
  const base = folder(name), music = path.join(base, 'music'), outside = path.join(base, 'outside');
  put(path.join(music, 'Crystal Castles', '(III)', '01 Plague.mp3'), tagged('Plague', '(III)', 1, { cover: COVER_A }));
  put(path.join(music, 'Crystal Castles', '(III)', '02 Kerosene.mp3'), tagged('Kerosene', '(III)', 2, { cover: COVER_A }));
  put(path.join(music, 'Crystal Castles', '(III)', '03 Wrath of God.mp3'), tagged('Wrath of God', '(III)', 3));
  put(path.join(music, 'Tame Impala', 'Lonerism', '01 Be Above It.m4a'), m4a({ tags: { title: 'Be Above It', artist: 'Tame Impala', album: 'Lonerism', track: [1, 12] }, seconds: 213, pictures: [[COVER_B, 13]] }));
  put(path.join(music, 'Mixes', 'Untagged', 'some song.flac'), Uint8Array.from({ length: 3000 }, (_, i) => (i * 31) & 255));
  put(path.join(music, 'loose.WAV'), new Uint8Array(500));
  put(path.join(music, '.hidden', 'secret.mp3'), tagged('Hidden', 'x', 1));
  put(path.join(music, 'Crystal Castles', '(III)', '._01 Plague.mp3'), new Uint8Array(100));
  put(path.join(music, '.DS_Store'), new Uint8Array(10));
  put(path.join(music, 'notes.txt'), 'not music');
  put(path.join(music, 'Crystal Castles', '(III)', 'cover.jpg'), COVER_A);
  put(path.join(outside, 'secret.mp3'), tagged('Secret', 'Outside', 1));
  put(path.join(outside, 'notes.txt'), 'secret notes');
  put(path.join(base, 'music-evil', 'x.mp3'), tagged('Evil', 'Evil', 1));
  link(path.join(outside, 'secret.mp3'), path.join(music, 'link-out.mp3'));
  link(outside, path.join(music, 'link-dir'));
  link(path.join(music, 'notes.txt'), path.join(music, 'disguised.mp3'));
  fs.mkdirSync(path.join(music, 'empty'));
  fs.mkdirSync(path.join(music, 'a folder.mp3'));
  return { base, music, outside };
}
const LISTED = ['Crystal Castles/(III)/01 Plague.mp3', 'Crystal Castles/(III)/02 Kerosene.mp3', 'Crystal Castles/(III)/03 Wrath of God.mp3', 'Mixes/Untagged/some song.flac', 'Tame Impala/Lonerism/01 Be Above It.m4a', 'loose.WAV'];

// ---------------------------------------------------------------- the one read

test('a file inside the folder is read: its name, and its bytes whole', async () => {
  const { music } = build('read');
  const got = await lib.readAudio(music, 'Crystal Castles/(III)/01 Plague.mp3');
  assert.equal(got.name, '01 Plague.mp3');
  assert.deepEqual(Buffer.from(got.bytes), fs.readFileSync(path.join(music, 'Crystal Castles', '(III)', '01 Plague.mp3')));
  assert.ok(got.bytes instanceof Uint8Array && got.bytes.buffer.byteLength === got.bytes.length, 'just its own memory goes over to the page');
  assert.equal((await lib.readAudio(music, 'loose.WAV')).name, 'loose.WAV'); // (any case of the extension)
  // and through a folder that is itself a link to the real one
  if (linking) {
    const via = path.join(path.dirname(music), 'link-to-music');
    fs.symlinkSync(music, via);
    assert.equal((await lib.readAudio(via, 'loose.WAV')).name, 'loose.WAV');
  }
});

test('everything else is refused: steps out of the folder, absolute paths, odd values, files that are not audio', async () => {
  const { music, outside, base } = build('refuse');
  const refused = async (rel, why) => { await assert.rejects(lib.readAudio(music, rel), (e) => e.code === 'REFUSED', `${JSON.stringify(rel)}${why ? ' (' + why + ')' : ''} was read`); };
  for (const rel of ['../outside/secret.mp3', 'Crystal Castles/../../outside/secret.mp3', '../music-evil/x.mp3', '..\\outside\\secret.mp3', 'a/b/../../../outside/secret.mp3']) await refused(rel, 'a step out');
  for (const rel of [path.join(outside, 'secret.mp3'), '/etc/hosts', '/etc/hosts.mp3', 'C:\\Windows\\x.mp3', '\\\\server\\share\\x.mp3', '/' + 'loose.WAV', path.join(music, 'loose.WAV')]) await refused(rel, 'absolute');
  for (const rel of [undefined, null, 0, 7, {}, [], ['loose.WAV'], true, '', 'loose.WAV\0.txt', 'loose.WAV\0', 'x'.repeat(5000) + '.mp3']) await refused(rel, 'not a path');
  for (const rel of ['notes.txt', 'Crystal Castles/(III)/cover.jpg', '.DS_Store', 'loose.WAV.txt', 'noextension', 'loose.', 'loose.wav.part']) await refused(rel, 'not audio');
  await refused('missing.mp3', 'not there');
  await refused('a folder.mp3', 'a folder with an audio name');
  await refused('Crystal Castles', 'a folder');
  if (linking) {
    await refused('link-out.mp3', 'a link to a file outside');
    await refused('link-dir/secret.mp3', 'through a link to a folder outside');
    await refused('disguised.mp3', 'a link inside to a file that is not audio');
  }
  // the real folder it was meant to stay in is not the same as one whose name starts alike
  await assert.rejects(lib.readAudio(path.join(base, 'music'), '../music-evil/x.mp3'), (e) => e.code === 'REFUSED');
  // a folder that is not there
  await assert.rejects(lib.readAudio(path.join(base, 'nothing'), 'loose.WAV'), (e) => e.code === 'REFUSED');
  // and a file past the size it will read, as a limit it is given
  await assert.rejects(lib.readAudio(music, 'loose.WAV', 100), (e) => e.code === 'REFUSED' && /too big/.test(e.message));
  assert.ok(lib.MAX_READ >= 256 * 1024 * 1024 && lib.MAX_READ <= 1024 * 1024 * 1024);
});

test('inside(): the folder itself and what is outside are not inside it; names that only start with dots, and spaces, are', () => {
  const r = path.resolve('/music');
  assert.equal(lib.inside(r, path.resolve('/music/a/b.mp3')), true);
  assert.equal(lib.inside(r, path.resolve('/music/..hidden/b.mp3')), true);
  assert.equal(lib.inside(r, path.resolve('/music/a b/c d.mp3')), true);
  for (const out of ['/music', '/', '/music-evil/x.mp3', '/etc/passwd', '/musi', '/music/../x']) assert.equal(lib.inside(r, path.resolve(out)), false, out);
});

test('the extensions the page lists and the ones main reads are the same, in any case', () => {
  assert.deepEqual(lib.AUDIO_EXTENSIONS, PAGE_EXTENSIONS);
  assert.ok(lib.isAudioName('A.MP3') && lib.isAudioName('x/y/z.opus') && !lib.isAudioName('x.txt') && !lib.isAudioName('mp3'));
});

// ---------------------------------------------------------------- the walk

test('the walk lists the audio files, in order of path, with their sizes: not hidden files, links, other files or empty folders', async () => {
  const { music } = build('walk');
  const files = await lib.walk(music);
  assert.deepEqual(files.map((f) => f.rel), LISTED);
  for (const f of files) {
    const st = fs.statSync(path.join(music, ...f.rel.split('/')));
    assert.equal(f.size, st.size, f.rel);
    assert.equal(f.mtimeMs, st.mtimeMs, f.rel);
  }
});

test('the walk skips a folder it cannot read, stops at its depth and at its limit, and says how far it has got', { skip: process.platform === 'win32' }, async () => {
  const { music } = build('walk2');
  fs.mkdirSync(path.join(music, 'locked'));
  put(path.join(music, 'locked', 'x.mp3'), tagged('X', 'X', 1));
  fs.chmodSync(path.join(music, 'locked'), 0);
  const seen = [];
  const files = await lib.walk(music, { onProgress: (n) => seen.push(n) });
  fs.chmodSync(path.join(music, 'locked'), 0o755);
  assert.deepEqual(files.map((f) => f.rel), LISTED);
  assert.ok(seen.length >= 3 && seen.at(-1) === LISTED.length && seen.every((n, i) => !i || n >= seen[i - 1]), JSON.stringify(seen));
  assert.equal((await lib.walk(music, { limit: 2 })).length >= 2, true);
  assert.ok((await lib.walk(music, { limit: 2 })).length < LISTED.length);
  // the depth: a file 20 folders down is not reached
  let deep = path.join(music, 'deep');
  for (let i = 0; i < 20; i++) deep = path.join(deep, `d${i}`);
  put(path.join(deep, 'far.mp3'), tagged('Far', 'Far', 1));
  assert.ok(!(await lib.walk(music)).some((f) => f.rel.endsWith('far.mp3')));
  await assert.rejects(lib.walk(music, { signal: { aborted: true } }), /stopped/);
});

test('a file opened for the readers answers as a Blob does, and lets go of the handle', async () => {
  const { music } = build('blob');
  const file = path.join(music, 'Crystal Castles', '(III)', '01 Plague.mp3');
  const blob = await lib.fileBlob(file), whole = new Blob([fs.readFileSync(file)]);
  assert.equal(blob.size, whole.size);
  assert.deepEqual(await readTags(blob), await readTags(whole));
  assert.deepEqual(await embeddedCover(blob), await embeddedCover(whole));
  assert.equal(new Uint8Array(await blob.slice(5, 12).arrayBuffer()).length, 7);
  assert.equal((await blob.slice(blob.size - 3, blob.size + 100).arrayBuffer()).byteLength, 3);
  assert.equal((await blob.slice(blob.size + 5, blob.size + 9).arrayBuffer()).byteLength, 0);
  await blob.close();
});

// ---------------------------------------------------------------- the scan, in process

// a scan with the real readers, collecting what it posts
async function scanned(dir, { known = {}, knownCovers = [], signal } = {}) {
  const posts = [];
  await lib.scanFolder({ root: dir, known, knownCovers, readTags, readCover: embeddedCover, post: (m) => posts.push(m), signal, batch: 2 });
  const records = posts.filter((m) => m.type === 'records').flatMap((m) => m.list);
  return { posts, records, plan: posts.find((m) => m.type === 'plan'), done: posts.find((m) => m.type === 'done'), covers: posts.filter((m) => m.type === 'cover') };
}

test('a first scan reads every file: its names and length, and one cover for an album whose tracks share it', async () => {
  const { music } = build('scan');
  const s = await scanned(music);
  assert.deepEqual(s.plan, { type: 'plan', files: 6, read: 6, removed: 0 });
  assert.deepEqual(s.records.map((r) => r.rel).sort(), LISTED);
  const by = Object.fromEntries(s.records.map((r) => [r.rel, r]));
  assert.deepEqual(by['Crystal Castles/(III)/02 Kerosene.mp3'].tags.title, 'Kerosene');
  assert.equal(by['Crystal Castles/(III)/02 Kerosene.mp3'].tags.album, '(III)');
  assert.equal(by['Crystal Castles/(III)/02 Kerosene.mp3'].tags.trackTotal, 3);
  assert.ok(by['Crystal Castles/(III)/02 Kerosene.mp3'].tags.duration > 0.2);
  assert.equal(by['Tame Impala/Lonerism/01 Be Above It.m4a'].tags.duration, 213);
  assert.deepEqual(by['Mixes/Untagged/some song.flac'].tags, {}, 'listed, with no names');
  assert.deepEqual(by['loose.WAV'].tags, {});
  // the album's three tracks, two of them with the cover: one picture sent, and the third track has it too
  assert.equal(s.covers.length, 2, 'one for each album that has one');
  const coverOf = (rel) => by[rel].cover;
  assert.equal(coverOf('Crystal Castles/(III)/01 Plague.mp3'), coverOf('Crystal Castles/(III)/02 Kerosene.mp3'));
  assert.notEqual(coverOf('Tame Impala/Lonerism/01 Be Above It.m4a'), coverOf('Crystal Castles/(III)/01 Plague.mp3'));
  assert.deepEqual(s.covers.map((c) => c.id).sort(), [coverOf('Crystal Castles/(III)/01 Plague.mp3'), coverOf('Tame Impala/Lonerism/01 Be Above It.m4a')].sort());
  assert.deepEqual([...s.covers.find((c) => c.id === coverOf('Crystal Castles/(III)/01 Plague.mp3')).bytes], [...COVER_A]);
  assert.equal(s.done.read, 6);
  assert.equal(s.posts.at(-1).type, 'done');
});

test('a scan again reads only what changed: a changed file, a new one; and says which are gone, and sends no cover it already has', async () => {
  const { music } = build('again');
  const first = await scanned(music);
  const known = Object.fromEntries(first.records.map((r) => [r.rel, { size: r.size, mtimeMs: r.mtimeMs }]));
  const knownCovers = first.covers.map((c) => c.id);
  const same = await scanned(music, { known, knownCovers });
  assert.deepEqual(same.plan, { type: 'plan', files: 6, read: 0, removed: 0 });
  assert.equal(same.records.length, 0);
  // a track is changed (its size, and another with only its time), one is new, one is gone
  const kero = path.join(music, 'Crystal Castles', '(III)', '02 Kerosene.mp3');
  put(kero, tagged('Kerosene (edit)', '(III)', 2, { cover: COVER_A, frames: 30 }));
  const t = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(music, 'loose.WAV'), t, t);
  put(path.join(music, 'Crystal Castles', '(III)', '04 Affection.mp3'), tagged('Affection', '(III)', 4, { cover: COVER_A }));
  fs.rmSync(path.join(music, 'Tame Impala'), { recursive: true });
  const next = await scanned(music, { known, knownCovers });
  assert.deepEqual(next.plan, { type: 'plan', files: 6, read: 3, removed: 1 });
  assert.deepEqual(next.records.map((r) => r.rel).sort(), ['Crystal Castles/(III)/02 Kerosene.mp3', 'Crystal Castles/(III)/04 Affection.mp3', 'loose.WAV']);
  assert.deepEqual(next.done.removed, ['Tame Impala/Lonerism/01 Be Above It.m4a']);
  assert.equal(next.records.find((r) => r.rel.includes('Kerosene')).tags.title, 'Kerosene (edit)');
  assert.equal(next.covers.length, 0, 'the cover it knows is not sent again');
  assert.ok(next.records.find((r) => r.rel.includes('Affection')).cover, 'but the new track has it');
});

test('a file that cannot be read is listed with no names; a scan that is told to stop does', async () => {
  const { music } = build('odd');
  put(path.join(music, 'garbage.mp3'), Uint8Array.from({ length: 4000 }, (_, i) => (i * 13 + 7) & 255));
  put(path.join(music, 'empty.mp3'), new Uint8Array(0));
  put(path.join(music, 'cut.mp3'), tagged('Cut', 'Cut', 1).slice(0, 30));
  const s = await scanned(music);
  for (const rel of ['garbage.mp3', 'empty.mp3', 'cut.mp3']) assert.ok(s.records.some((r) => r.rel === rel), rel);
  await assert.rejects(scanned(music, { signal: { aborted: true } }), /stopped/);
});

test('a reader that throws loses that file\'s names, and nothing else', async () => {
  const { music } = build('throws');
  const posts = [];
  await lib.scanFolder({ root: music, readTags: async (b) => { if (b.size === 500) throw new Error('boom'); return readTags(b); }, readCover: embeddedCover, post: (m) => posts.push(m) });
  const records = posts.filter((m) => m.type === 'records').flatMap((m) => m.list);
  assert.equal(records.length, 6);
  assert.deepEqual(records.find((r) => r.rel === 'loose.WAV').tags, {});
  assert.equal(records.find((r) => r.rel.includes('Plague')).tags.title, 'Plague');
});

// ---------------------------------------------------------------- the cache

test('the cache is for one folder and one version of itself, and anything else starts over', () => {
  const dir = folder('cache'), file = path.join(dir, 'cache.json');
  const empty = (root) => ({ version: lib.loadCache(file, root).version, root, files: {}, covers: {} });
  assert.deepEqual(lib.loadCache(file, '/a'), empty('/a'), 'none yet');
  const good = { version: 1, root: '/a', files: { 'x.mp3': { size: 1, mtimeMs: 2, tags: { title: 'X' }, cover: null } }, covers: {} };
  fs.writeFileSync(file, JSON.stringify(good));
  assert.deepEqual(lib.loadCache(file, '/a'), good);
  assert.deepEqual(lib.loadCache(file, '/b'), empty('/b'), 'another folder');
  for (const bad of [{ ...good, version: 99 }, { ...good, files: null }, { ...good, covers: 7 }, [], 'x', null]) { fs.writeFileSync(file, JSON.stringify(bad)); assert.deepEqual(lib.loadCache(file, '/a'), empty('/a'), JSON.stringify(bad)); }
  fs.writeFileSync(file, '{ not json');
  assert.deepEqual(lib.loadCache(file, '/a'), empty('/a'), 'damaged');
});

test('what the page gets: tracks in order of path with the names the file has and its length in ms, and a cover only where it has a picture', () => {
  const cache = { version: 1, root: '/r', covers: { c1: 'AAAA', c2: null, c3: 'unused' }, files: {
    'b/two.mp3': { size: 1, mtimeMs: 1, cover: 'c1', tags: { title: 'Two', artist: 'A', albumArtist: 'AA', album: 'Al', track: 2, trackTotal: 9, disc: 1, duration: 61.2345, compilation: true } },
    'a/one.m4a': { size: 1, mtimeMs: 1, cover: 'c2', tags: {} },
    'c/three.flac': { size: 1, mtimeMs: 1, cover: null, tags: { duration: 0 } },
  } };
  const got = lib.resultOf(cache);
  assert.deepEqual(got.tracks, [
    { path: 'a/one.m4a' },
    { path: 'b/two.mp3', title: 'Two', artist: 'A', albumArtist: 'AA', album: 'Al', track: 2, disc: 1, compilation: true, ms: 61235, cover: 'c1' },
    { path: 'c/three.flac' },
  ]);
  assert.deepEqual(got.covers, { c1: 'AAAA' }, 'a cover with no picture, and one nobody uses, are not sent');
});

// ---------------------------------------------------------------- the library main builds

const thumb = (bytes) => (bytes.length === COVER_B.length ? null : Buffer.from(bytes.subarray(0, 12))); // (a picture it can't read, and a small one)
function make(dir, over = {}) {
  return lib.createLibrary({ dir: path.join(dir, 'profile'), rendererDir, thumbnail: thumb, home: dir, ...over });
}

test('the folder: the one chosen, else the music folder, and a copy run from source with a settings folder of its own never starts with one', async () => {
  const { base, music } = build('folder');
  const profile = path.join(base, 'profile');
  const noneYet = make(base, { music: path.join(base, 'Songs') });
  fs.mkdirSync(path.join(base, 'Songs'));
  assert.deepEqual((await noneYet.folder()), { path: path.join(base, 'Songs'), label: '~/Songs', chosen: false }, 'the music folder, till one is chosen');
  assert.equal((await make(base, { music: path.join(base, 'Songs'), testCopy: true }).folder()), null, 'a test copy has none');
  assert.equal((await make(base, { music: path.join(base, 'not there') }).folder()), null, 'a Music folder that is not there');
  // chosen through the dialog it gives: kept (so a restart has it), and it is the real path
  let asked;
  const dialog = { pick: async (from) => { asked = from; return path.join(base, 'music-link'); } };
  if (linking) fs.symlinkSync(music, path.join(base, 'music-link')); else fs.cpSync(music, path.join(base, 'music-link'), { recursive: true });
  const l = make(base, { music: path.join(base, 'Songs'), dialog });
  const real = linking ? music : fs.realpathSync(path.join(base, 'music-link')); // (a link's real folder: its target; where there are no links, the copy it stood for)
  const picked = await l.choose();
  assert.deepEqual(picked, { path: real, label: `~/${linking ? 'music' : 'music-link'}`, chosen: true });
  assert.equal(asked, path.join(base, 'Songs'), 'the dialog starts in the folder it has');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(profile, 'library.json'), 'utf8')), { folder: real });
  assert.deepEqual((await make(base, { music: path.join(base, 'Songs'), testCopy: true }).folder()), { path: real, label: picked.label, chosen: true }, 'a restart');
  // the dialog cancelled, a pick that is not a folder, no dialog to ask (a window nobody sees): nothing changes
  assert.equal(await make(base, { dialog: { pick: async () => null } }).choose(), null);
  assert.equal(await make(base, { dialog: { pick: async () => path.join(music, 'notes.txt') } }).choose(), null);
  assert.equal(await make(base, { hidden: true, dialog }).choose(), null);
  assert.equal(await make(base).choose(), null);
  // a chosen folder that has gone (a drive unplugged, a network folder down) is still the one, missing, not the music folder (whose
  // scan would take the place of the list kept for it); a test copy the same. The one chosen is real: where there are no links, the
  // copy, so taking away music would leave it there
  fs.rmSync(real, { recursive: true });
  const gone = { path: real, label: picked.label, chosen: true, missing: true };
  assert.deepEqual((await make(base, { music: path.join(base, 'Songs') }).folder()), gone);
  assert.deepEqual((await make(base, { music: path.join(base, 'Songs'), testCopy: true }).folder()), gone);
});

test('a chosen folder that is not there: its kept list still shows; its scan and its files say it is not there, and keep that list; it is back when it is', async () => {
  const { base, music } = build('lgone');
  const l = make(base, { forced: music, testCopy: true });
  await l.choose(); // (kept as the one chosen, as any is)
  const first = await l.scan();
  assert.equal(first.tracks.length, 6);
  const away = path.join(base, 'music-away');
  fs.renameSync(music, away); // (the drive unplugged)
  const off = make(base, { music: path.join(base, 'Songs'), testCopy: true }); // (a restart, without --library-folder: the one chosen)
  assert.deepEqual((await off.cached()).tracks, first.tracks, 'the list kept for it');
  await assert.rejects(off.scan(), /~\/music isn't there right now \(is its drive connected\?\)/);
  await assert.rejects(off.read('loose.WAV'), (e) => e.code === 'REFUSED' && /isn't there right now/.test(e.message));
  assert.deepEqual((await off.cached()).tracks, first.tracks, 'and kept still');
  fs.renameSync(away, music); // (plugged back in)
  assert.equal((await off.scan()).stats.read, 0, 'its list was kept: nothing to read again');
  assert.equal((await off.read('loose.WAV')).name, 'loose.WAV');
});

test('a cover is decoded in main only if its picture says a size a cover has', () => {
  const png = (w, h) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const jpeg = (w, h) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...Array(14).fill(0), 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, ...Array(9).fill(0)]);
  assert.deepEqual(lib.coverSize(png(600, 400)), { width: 600, height: 400 });
  assert.deepEqual(lib.coverSize(jpeg(1400, 1400)), { width: 1400, height: 1400 });
  assert.equal(lib.coverFits(jpeg(3000, 3000)), true);
  assert.equal(lib.coverFits(png(20000, 20000)), false, 'hundreds of MB once decoded');
  assert.equal(lib.coverFits(jpeg(6001, 10)), false);
  assert.equal(lib.coverFits(Buffer.from('not a picture at all, just bytes')), false, 'no size it says: not decoded');
});

test('a folder a copy run from source is told to take is the one chosen, with no dialog; and it is kept like any other', async () => {
  const { base, music } = build('forced');
  const l = make(base, { forced: music, hidden: true, testCopy: true, dialog: { pick: async () => { throw new Error('a dialog'); } } });
  assert.deepEqual((await l.folder()), { path: music, label: '~/music', chosen: true });
  assert.deepEqual(await l.choose(), { path: music, label: '~/music', chosen: true });
  assert.equal((await make(base, { testCopy: true }).folder()).path, music, 'and a restart without it has it');
  assert.equal((await make(base, { forced: path.join(base, 'nope'), testCopy: true }).folder()).path, music, 'one that is not there is no folder');
});

test('read: only through the folder in force, with the refusals of readAudio', async () => {
  const { base, music } = build('lread');
  const l = make(base, { forced: music, testCopy: true });
  assert.equal((await l.read('loose.WAV')).name, 'loose.WAV');
  await assert.rejects(l.read('../outside/secret.mp3'), (e) => e.code === 'REFUSED');
  await assert.rejects(l.read('link-out.mp3'), (e) => e.code === 'REFUSED');
  await assert.rejects(make(base, { testCopy: true }).read('loose.WAV'), (e) => e.code === 'REFUSED', 'no folder, no read');
});

test('scan, in a worker: every track with its names, the covers as small pictures, kept so that the next scan reads nothing, and a change reads that file', async () => {
  const { base, music } = build('lscan');
  const l = make(base, { forced: music, testCopy: true });
  assert.equal((await l.cached()).tracks.length, 0, 'nothing kept yet');
  const progress = [];
  const first = await l.scan((p) => progress.push(p));
  assert.equal(first.folder, '~/music');
  assert.deepEqual(first.tracks.map((t) => t.path), LISTED);
  assert.deepEqual(first.stats.files, 6);
  assert.equal(first.stats.read, 6);
  const plague = first.tracks.find((t) => t.title === 'Plague');
  assert.deepEqual({ ...plague, cover: !!plague.cover, ms: plague.ms > 200 }, { path: 'Crystal Castles/(III)/01 Plague.mp3', title: 'Plague', artist: 'Crystal Castles', album: '(III)', track: 1, cover: true, ms: true });
  assert.equal(first.tracks.find((t) => t.title === 'Be Above It').ms, 213000);
  // the Tame Impala cover is the one the stand-in could not read: no cover for it; the other is its small picture
  assert.equal(first.tracks.find((t) => t.title === 'Be Above It').cover, undefined);
  assert.deepEqual(Object.keys(first.covers), [plague.cover]);
  assert.equal(Buffer.from(first.covers[plague.cover], 'base64').length, 12);
  assert.ok(progress.length >= 1 && progress.at(-1).files === 6, JSON.stringify(progress.at(-1)));
  // kept: the next is nothing to read, and what was kept is what it gave
  assert.deepEqual((await l.cached()), { folder: '~/music', tracks: first.tracks, covers: first.covers });
  const second = await l.scan();
  assert.equal(second.stats.read, 0);
  assert.deepEqual(second.tracks, first.tracks);
  // a track changed, one removed
  put(path.join(music, 'Crystal Castles', '(III)', '02 Kerosene.mp3'), tagged('Kerosene (edit)', '(III)', 2, { cover: COVER_A, frames: 50 }));
  fs.rmSync(path.join(music, 'loose.WAV'));
  const third = await l.scan();
  assert.deepEqual(third.stats, { files: 5, read: 1, removed: 1, ms: third.stats.ms });
  assert.equal(third.tracks.find((t) => t.path.includes('Kerosene')).title, 'Kerosene (edit)');
  assert.equal(third.tracks.length, 5);
  // no temporary file left by the cache's write
  assert.deepEqual(fs.readdirSync(path.join(base, 'profile')).filter((f) => f.endsWith('.tmp')), []);
});

test('a scan asked for while one is running is that one; another folder is another cache; a scan can be stopped', async () => {
  const { base, music } = build('lstop');
  const l = make(base, { forced: music, testCopy: true });
  const a = l.scan(), b = l.scan();
  assert.equal(a, b);
  await a;
  const c = l.scan();
  l.stop();
  await assert.rejects(c, /stopped/);
  assert.ok((await l.scan()).tracks.length === 6, 'and it can scan again');
  // a folder with nothing to scan
  await assert.rejects(make(base, { testCopy: true }).scan(), /no folder/);
  const other = path.join(base, 'other');
  put(path.join(other, 'one.mp3'), tagged('Only', 'Only', 1));
  const l2 = make(base, { forced: other, testCopy: true });
  assert.deepEqual((await l2.scan()).tracks.map((t) => t.path), ['one.mp3']);
  assert.equal((await l.cached()).tracks.length, 0, 'the cache is the one folder\'s: the first folder\'s was replaced by this one\'s');
});

test('a scan whose list cannot be kept still ends: it gives what it found, leaves no temporary file, and the next scan runs', async () => {
  const { base, music } = build('lwrite');
  const profile = path.join(base, 'profile'), cache = path.join(profile, 'library-cache.json');
  const l = make(base, { forced: music, testCopy: true });
  const tmps = () => fs.readdirSync(profile).filter((f) => f.endsWith('.tmp'));
  // (a scan that never ends is a failure here, not a test that never finishes)
  const ends = (scan) => { let timer; return Promise.race([scan, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('the scan did not end')), 15000); })]).finally(() => clearTimeout(timer)); };
  // the move into place is refused (a folder where the list goes, as Windows refuses it, EPERM, while something holds the file)
  fs.mkdirSync(cache, { recursive: true });
  const first = l.scan();
  assert.deepEqual((await ends(first)).tracks.map((t) => t.path), LISTED, 'what it found is still the page\'s');
  assert.deepEqual(tmps(), [], 'the list written to be moved into place is not left');
  assert.equal((await l.cached()).tracks.length, 0, 'and nothing was kept');
  // it is over: a scan asked for now is a new one, and it ends the same way
  const second = l.scan();
  assert.notEqual(second, first);
  assert.equal((await ends(second)).stats.read, 6, 'it has nothing to go on');
  fs.rmSync(cache, { recursive: true });
  // the write stops halfway (a full disk, ENOSPC), with part of the list on the disk
  const write = fs.writeFileSync;
  fs.writeFileSync = (file, data, ...rest) => {
    if (!String(file).endsWith('.tmp')) return write(file, data, ...rest);
    write(file, String(data).slice(0, 20), ...rest);
    throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });
  };
  try {
    assert.deepEqual((await ends(l.scan())).tracks.map((t) => t.path), LISTED);
    assert.deepEqual(tmps(), [], 'the part of it is not left');
  } finally { fs.writeFileSync = write; }
  // and once it can be kept it is: this scan reads it all, the next reads nothing
  assert.equal((await ends(l.scan())).stats.read, 6);
  assert.equal((await l.cached()).tracks.length, 6);
  assert.equal((await ends(l.scan())).stats.read, 0);
});

// ---------------------------------------------------------------- main.js and preload.js

// (read with LF line endings, as a Windows checkout's CRLF would turn the ends of lines into two characters)
const source = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');

test('main gives the page four narrow calls and the one read; the read takes nothing but the path the page wants, and goes through the folder in force', () => {
  const main = source('main.js'), preload = source('preload.js');
  for (const call of ["libraryFolder: () => ipcRenderer.invoke('library:folder')", "libraryChoose: () => ipcRenderer.invoke('library:choose')", "libraryCached: () => ipcRenderer.invoke('library:cached')",
    "libraryScan: () => ipcRenderer.invoke('library:scan')", "libraryRead: (rel) => ipcRenderer.invoke('library:read', rel)"]) assert.ok(preload.includes(call), call);
  assert.equal([...preload.matchAll(/'library:[a-z]+'/g)].length, 6, 'the five calls and the progress');
  assert.match(main, /ipcMain\.handle\('library:read', \(_e, rel\) => library\(\)\.read\(rel\)\);/);
  assert.match(main, /ipcMain\.handle\('library:choose', \(\) => library\(\)\.choose\(\)\);/);
  assert.match(main, /ipcMain\.handle\('library:folder', \(\) => library\(\)\.folder\(\)\);/);
  // the folder is the one main keeps: no handler takes one from the page (the scan takes the event, to say how far it has got)
  const handlers = Object.fromEntries([...main.matchAll(/ipcMain\.handle\('(library:\w+)', \(([^)]*)\)/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(handlers, { 'library:folder': '', 'library:choose': '', 'library:cached': '', 'library:scan': 'e', 'library:read': '_e, rel' });
  // loaded when first needed, like the other helpers (a test copy without helpers/ still starts)
  assert.doesNotMatch(main.slice(0, main.indexOf('function library()')), /require\('\.\/helpers\/library\.cjs'\)/);
});

test('the window keeps contextIsolation, with no node integration, no unsafe web security and no sandbox turned off', () => {
  const main = source('main.js');
  assert.equal([...main.matchAll(/contextIsolation: true/g)].length, 2, 'both windows');
  assert.doesNotMatch(main, /nodeIntegration|webSecurity|contextIsolation: false|sandbox: false|allowRunningInsecureContent|enableRemoteModule|nodeIntegrationInWorker/);
  assert.doesNotMatch(source('preload.js'), /require\('(node:)?(fs|path|child_process)'\)/, 'no file access in the preload');
  // and the page never gets a path to read except through that call: nothing else of main's reads a file the page names
  assert.doesNotMatch(source('preload.js'), /readFile|openAsBlob|showOpenDialog/);
});
