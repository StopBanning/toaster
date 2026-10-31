// The names and the length inside an audio file (renderer/audio-tags.js): an MP3's ID3v2.2, 2.3 and 2.4 text frames in each
// encoding (and the sizes, unsynchronisation and flags they come with), the length from a Xing, Info or VBRI header or the bit rate,
// an M4A's ilst items and movie header, and what a file with none, a file that is something else, and a damaged one give.
// The files are built here (tools/tag-fixtures.mjs, tools/cover-fixtures.mjs), as a Blob, the way the page hands the reader a File.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_EXTENSIONS, isAudioName, readTags } from '../renderer/audio-tags.js';
import { embeddedCover } from '../renderer/embedded-cover.js';
import { apicBody, fakeJpeg, id3Tag, join } from './cover-fixtures.mjs';
import { id3v22, m4a, mp3, textFrame } from './tag-fixtures.mjs';

const tags = (bytes) => readTags(new Blob([bytes]));
const near = (got, want, by = 0.001) => assert.ok(Math.abs(got - want) <= by, `${got} is not ${want}`);
const frames = (n) => (n * 1152) / 44100;
// a file that counts what is read from it
const counting = (bytes) => {
  const b = new Blob([bytes]), reads = [];
  return { size: b.size, reads, slice(start, end) { reads.push([start, Math.min(end, b.size)]); return b.slice(start, end); },
    get bytes() { return reads.reduce((n, [s, e]) => n + Math.max(0, e - s), 0); } };
};

test('ID3v2.3: the names in each of its encodings (Latin-1, UTF-16 with a mark, UTF-16BE), accents and kana as written', async () => {
  for (const encoding of [0, 1, 2]) {
    const got = await tags(id3Tag({ version: 3, frames: [
      textFrame('TIT2', 'Hjálp!', { encoding }), textFrame('TPE1', 'Björk', { encoding }), textFrame('TPE2', 'Sigur Rós', { encoding }), textFrame('TALB', 'Café del Mar', { encoding }) ] }));
    assert.deepEqual(got, { title: 'Hjálp!', artist: 'Björk', albumArtist: 'Sigur Rós', album: 'Café del Mar' }, `encoding ${encoding}`);
  }
  // (UTF-16 holds what Latin-1 can't)
  for (const encoding of [1, 2]) assert.equal((await tags(id3Tag({ version: 3, frames: [textFrame('TIT2', 'トースター', { encoding })] }))).title, 'トースター');
  // (and a tag in UTF-8 that is not allowed in 2.3 is read all the same)
  assert.equal((await tags(id3Tag({ version: 3, frames: [textFrame('TIT2', 'トースター', { encoding: 3 })] }))).title, 'トースター');
});

test('track and disc numbers, as "3", "03", "3/12"; a compilation flag of 1; a number that is not one is left out', async () => {
  const got = (trck, tpos, tcmp) => tags(id3Tag({ version: 3, frames: [textFrame('TRCK', trck), ...(tpos ? [textFrame('TPOS', tpos)] : []), ...(tcmp ? [textFrame('TCMP', tcmp)] : [])] }));
  assert.deepEqual(await got('3/12', '1/2', '1'), { track: 3, trackTotal: 12, disc: 1, discTotal: 2, compilation: true });
  assert.deepEqual(await got('07'), { track: 7 });
  assert.deepEqual(await got('3'), { track: 3 });
  assert.deepEqual(await got('A1'), {});
  assert.deepEqual(await got('0/9'), { trackTotal: 9 });
  assert.deepEqual(await got('5', '2', '0'), { track: 5, disc: 2 });
});

test('ID3v2.4: synchsafe sizes, UTF-8, several values in one frame, and the plain sizes iTunes once wrote', async () => {
  const set = [textFrame('TIT2', 'Kerosene'), textFrame('TPE1', ['Crystal Castles', 'Robert Smith']), textFrame('TALB', '(III)'), textFrame('TRCK', '2/12')];
  const want = { title: 'Kerosene', artist: 'Crystal Castles, Robert Smith', album: '(III)', track: 2, trackTotal: 12 };
  assert.deepEqual(await tags(id3Tag({ version: 4, frames: set })), want);
  assert.deepEqual(await tags(id3Tag({ version: 4, plainSizes: true, frames: set })), want);
  // plain sizes that look synchsafe (a text of 200 and 300 bytes), padding after them
  const long = 'x'.repeat(300);
  assert.equal((await tags(id3Tag({ version: 4, plainSizes: true, padding: 100, frames: [textFrame('TIT2', long), textFrame('TALB', 'y'.repeat(130))] }))).title, long);
  assert.equal((await tags(id3Tag({ version: 4, plainSizes: true, frames: [textFrame('TALB', 'y'.repeat(130)), textFrame('TIT2', long)] }))).title, long);
  // UTF-16 in 2.4 (values ended by a double null)
  assert.deepEqual(await tags(id3Tag({ version: 4, frames: [textFrame('TPE1', ['a', 'b'], { encoding: 1 })] })), { artist: 'a, b' });
});

test('ID3v2.2: its three-character ids and its sizes of three bytes', async () => {
  const f = (id, s) => ({ id, body: [0, ...[...s].map((c) => c.charCodeAt(0))] });
  assert.deepEqual(await tags(id3v22([f('TT2', 'Old Song'), f('TP1', 'Old Band'), f('TP2', 'Old Label'), f('TAL', 'Old Album'), f('TRK', '4/10'), f('TPA', '1/1'), f('TCP', '1')], { padding: 64 })),
    { title: 'Old Song', artist: 'Old Band', albumArtist: 'Old Label', album: 'Old Album', track: 4, trackTotal: 10, disc: 1, discTotal: 1, compilation: true });
});

test('a picture bigger than the tag\'s first window is stepped over: the names after it are found, and not a byte of it is read', async () => {
  const picture = apicBody(fakeJpeg(300000));
  for (const version of [3, 4]) {
    const file = counting(mp3({ tag: id3Tag({ version, frames: [{ id: 'APIC', body: picture, flags: [0, 0] }, textFrame('TIT2', 'After the Picture'), textFrame('TALB', 'Album')] }), frames: 20 }));
    assert.deepEqual(await readTags(file).then(({ title, album }) => ({ title, album })), { title: 'After the Picture', album: 'Album' }, `2.${version}`);
    assert.ok(file.bytes < 80 * 1024, `2.${version}: ${file.bytes} bytes read of ${file.size}`);
    assert.ok(file.reads.length <= 8, `2.${version}: ${file.reads.length} reads`);
  }
});

test('frames in the order a tagger wrote them, with padding after, and ones that are not wanted, empty, compressed or encrypted left alone', async () => {
  const skip = (id, flags) => ({ id, body: join([0], [...'secret'].map((c) => c.charCodeAt(0))), flags });
  const set = [textFrame('TYER', '1999'), textFrame('TIT2', ''), textFrame('TPE1', 'Artist'), skip('TALB', [0, 0x80]), textFrame('TIT2', 'Real Title'), skip('TPE2', [0, 0x40]), textFrame('TCON', 'Pop')];
  assert.deepEqual(await tags(id3Tag({ version: 3, padding: 400, frames: set })), { artist: 'Artist', title: 'Real Title' });
  // 2.4's compressed and encrypted bits are other bits
  const four = [skip('TALB', [0, 0x08]), skip('TPE2', [0, 0x04]), textFrame('TIT2', 'T')];
  assert.deepEqual(await tags(id3Tag({ version: 4, frames: four })), { title: 'T' });
});

test('unsynchronisation: 2.3 over the whole tag, 2.4 by the tag\'s flag or a frame\'s own; an extended header first', async () => {
  // (Latin-1 can hold ÿ, and its 0xFF is what unsynchronisation has to escape: a 0xFF before a byte of 0xE0 or more, or 0x00)
  const latin = [textFrame('TIT2', 'aÿàb', { encoding: 0 }), textFrame('TALB', 'xÿ', { encoding: 0 }), textFrame('TPE1', 'A', { encoding: 0 })];
  const latinWant = { title: 'aÿàb', album: 'xÿ', artist: 'A' };
  assert.deepEqual(await tags(id3Tag({ version: 3, unsync: true, frames: latin })), latinWant, '2.3, the whole tag');
  assert.deepEqual(await tags(id3Tag({ version: 4, unsync: true, frames: latin })), latinWant, '2.4, the tag\'s flag');
  assert.deepEqual(await tags(id3Tag({ version: 4, frames: latin.map((f) => ({ ...f, flags: [0, 0x02] })) })), latinWant, '2.4, each frame\'s');
  for (const version of [3, 4]) assert.deepEqual(await tags(id3Tag({ version, extended: true, padding: 20, frames: latin })), latinWant, `2.${version}, an extended header`);
});

test('the length of an MP3 from the header of its first frame: Xing, Info and VBRI count the frames; with none, the bit rate does', async () => {
  for (const header of ['Xing', 'Info', 'vbri']) near((await tags(mp3({ frames: 200, header }))).duration, frames(200), 0.002);
  // a constant bit rate file (417-byte frames at 128 kbit/s): its bytes at that rate, 0.2% off the exact 26.12 ms a frame
  near((await tags(mp3({ frames: 400, header: false }))).duration, frames(400), 0.05);
  // after a tag, with padding after it; with an ID3v1 tag at the end, which is not audio
  const tag = id3Tag({ version: 3, padding: 700, frames: [textFrame('TIT2', 'Song')] });
  const got = await tags(mp3({ tag, frames: 300, header: 'Xing' }));
  assert.equal(got.title, 'Song');
  near(got.duration, frames(300), 0.002);
  const v1 = new Uint8Array(128); v1.set([0x54, 0x41, 0x47]);
  near((await tags(mp3({ tag, frames: 400, header: false, trailer: v1 }))).duration, frames(400), 0.05);
  // an MP3 with no tag at all (it starts with a frame) has its length and no names
  const bare = await tags(mp3({ frames: 100, header: 'Xing' }));
  assert.deepEqual(Object.keys(bare), ['duration']);
  near(bare.duration, frames(100), 0.002);
  // MPEG-2 (22.05 kHz, 80 kbit/s: frames of 261 bytes, 576 samples), its Xing header at the other offset
  const mpeg2 = (name) => { const f = new Uint8Array(261); f.set([0xff, 0xf3, 0x90, 0x00]); if (name) f.set([...name].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 1, 0, 0, 0x03, 0xe8]), 21); return f; };
  near((await tags(join(mpeg2('Xing'), ...Array.from({ length: 5 }, () => mpeg2())))).duration, (1000 * 576) / 22050, 0.001);
});

test('M4A: the ilst items, the track and disc numbers, the compilation flag, and the length from the movie header, wherever moov and meta are', async () => {
  const set = { title: 'Kerosene', artist: 'Crystal Castles', albumArtist: 'Crystal Castles', album: '(III)', track: [2, 12], disc: [1, 2], compilation: true };
  const want = { title: 'Kerosene', artist: 'Crystal Castles', albumArtist: 'Crystal Castles', album: '(III)', track: 2, trackTotal: 12, disc: 1, discTotal: 2, compilation: true };
  for (const moovFirst of [true, false]) for (const quicktimeMeta of [false, true]) for (const version of [0, 1]) {
    const got = await tags(m4a({ tags: set, seconds: 192.5, moovFirst, quicktimeMeta, version }));
    near(got.duration, 192.5, 0.001);
    delete got.duration;
    assert.deepEqual(got, want, JSON.stringify({ moovFirst, quicktimeMeta, version }));
  }
  // a time scale that is not 44100, a picture beside the text (stepped over), UTF-16 text, and items we do not read
  const got = await tags(m4a({ tags: { title: 'Titel', albumKind: 2, album: 'Äpfel' }, seconds: 61, timescale: 1000, pictures: [[fakeJpeg(40000), 13]] }));
  assert.deepEqual(got, { title: 'Titel', album: 'Äpfel', duration: 61 });
  assert.deepEqual(await tags(m4a({ seconds: 5 })), { duration: 5 });
  assert.deepEqual(await tags(m4a({ tags: { track: [3] } , seconds: 1 })), { track: 3, duration: 1 });
});

test('a big M4A costs a few small reads: the atoms\' headers, the movie header, the text items', async () => {
  const file = counting(m4a({ tags: { title: 'T', artist: 'A', album: 'B', track: [1, 9] }, pictures: [[fakeJpeg(900000), 13]], moovFirst: false }));
  const got = await readTags(file);
  assert.equal(got.title, 'T');
  assert.equal(got.trackTotal, 9);
  assert.ok(file.bytes < 4096, `${file.bytes} bytes read`);
  assert.ok(file.reads.length < 40, `${file.reads.length} reads`);
});

test('a file with no names, a file that is something else, and nothing at all: an empty object, never an error', async () => {
  assert.deepEqual(await tags(new Uint8Array(0)), {});
  assert.deepEqual(await tags(new Uint8Array(5)), {});
  assert.deepEqual(await tags(Uint8Array.from({ length: 5000 }, (_, i) => (i * 7919) & 255)), {});
  const header = (s) => join([...s].map((c) => c.charCodeAt(0)), new Uint8Array(3000));
  for (const s of ['RIFF\u0000\u0000\u0000\u0000WAVE', 'fLaC', 'OggS', '\u001aEß£']) assert.deepEqual(await tags(header(s)), {}, s);
  // an ID3 tag with nothing we read in it
  assert.deepEqual(await tags(id3Tag({ version: 3, frames: [textFrame('TCON', 'Pop')] })), {});
  assert.deepEqual(await tags(id3Tag({ version: 4, frames: [] })), {});
});

test('damaged files: a tag longer than the file, a frame longer than its tag, garbage for a size, a text with nothing in it', async () => {
  const good = id3Tag({ version: 3, frames: [textFrame('TIT2', 'Kept'), textFrame('TALB', 'Lost Album')] });
  const audio = mp3({ frames: 10 });
  // cut off in the middle of a frame: what came before it is kept
  const cut = good.slice(0, good.length - 6);
  assert.deepEqual(await tags(cut), { title: 'Kept' });
  // a tag size that runs past the file's end
  const long = Uint8Array.from(good); long.set([0, 0, 0x7f, 0x7f], 6);
  assert.equal((await tags(join(long, audio))).title, 'Kept');
  // a tag size bigger than anything we read, and a size of nothing
  const huge = Uint8Array.from(good); huge.set([0x7f, 0x7f, 0x7f, 0x7f], 6);
  assert.deepEqual(await tags(huge), {});
  const none = Uint8Array.from(good); none.set([0, 0, 0, 0], 6);
  assert.deepEqual(await tags(none), {});
  // a size with a byte whose top bit is set in the tag's header
  const bit = Uint8Array.from(good); bit[7] |= 0x80;
  assert.deepEqual(await tags(bit), {});
  // a frame that says it is far longer than the tag: it and what follows are left, what came before it is kept
  const garbage = Uint8Array.from(id3Tag({ version: 3, frames: [textFrame('TIT2', 'First'), textFrame('TPE1', 'Second')] }));
  garbage.set([0x7f, 0xff, 0xff, 0xff], 10 + 10 + 6 + 4); // (TPE1's size, after TIT2's 10 + 6 bytes)
  assert.deepEqual(await tags(garbage), { title: 'First' });
  // a text frame with its encoding byte alone, one with an encoding that does not exist, and odd-length UTF-16
  assert.deepEqual(await tags(id3Tag({ version: 3, frames: [{ id: 'TIT2', body: [0], flags: [0, 0] }, { id: 'TALB', body: [9, 0x41, 0x42], flags: [0, 0] }, { id: 'TPE1', body: [2, 0, 0x41, 0], flags: [0, 0] }] })), { album: 'AB', artist: 'A' });
  // ids that are not letters
  assert.deepEqual(await tags(id3Tag({ version: 3, frames: [{ id: '\u0001\u0002\u0003\u0004', body: [0, 65], flags: [0, 0] }, textFrame('TIT2', 'Fine')] })), { title: 'Fine' });
  // an MP4 cut off in the middle of its atoms, and one whose moov claims more than the file has
  const whole = m4a({ tags: { title: 'T' }, seconds: 3 });
  for (const n of [4, 9, 40, 100, 200, whole.length - 5000]) { const got = await tags(whole.slice(0, n)); assert.ok(typeof got === 'object' && got); }
  const moov = Uint8Array.from(whole); moov.set([0x7f, 0xff, 0xff, 0xff], 28);
  assert.ok(typeof (await tags(moov)) === 'object');
});

test('the same tags the cover reader finds beside: the tricky sizes of its own fixtures are read here too', async () => {
  const picture = fakeJpeg(30000);
  for (const [version, plainSizes] of [[3, false], [4, false], [4, true]]) {
    const bytes = id3Tag({ version, plainSizes, padding: 300, frames: [textFrame('TIT2', 'Both'), { id: 'APIC', body: apicBody(picture), flags: [0, 0] }, textFrame('TALB', 'Readers')] });
    const [text, cover] = await Promise.all([tags(bytes), embeddedCover(new Blob([bytes]))]);
    assert.deepEqual([text.title, text.album], ['Both', 'Readers'], `2.${version} ${plainSizes ? 'plain' : 'synchsafe'}`);
    assert.equal(cover.bytes.length, picture.length);
  }
});

test('the files the library lists, by their extensions in any case; names without one, or hidden ones that are only an extension, are not audio', () => {
  assert.deepEqual(AUDIO_EXTENSIONS, ['mp3', 'm4a', 'mp4', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'webm']);
  for (const name of ['a.mp3', 'A.MP3', 'x/y/01 Song.M4a', 'song.flac', 'a.b.opus', 'mix.WebM']) assert.ok(isAudioName(name), name);
  for (const name of ['a.txt', 'mp3', 'a.mp3.part', 'cover.jpg', '', 'song.mp3 ', 'song.mp', 'folder.mp3/readme']) assert.ok(!isAudioName(name), name);
});
