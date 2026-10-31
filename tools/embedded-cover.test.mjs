// The cover inside an audio file (renderer/embedded-cover.js): an MP3's ID3v2.3 and 2.4 tags (the sizes, unsynchronisation, the
// extended header, a frame's flags, the front cover over any other) and an M4A's atoms, and nothing for a file without one.
// The files are built here (tools/cover-fixtures.mjs), as a Blob, the way the page hands the reader a File.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embeddedCover } from '../renderer/embedded-cover.js';
import { apicBody, fakeJpeg, id3Tag, join, m4a, png, pixels, silentMp3, unsynchronise, COVERS } from './cover-fixtures.mjs';

const JPEG = fakeJpeg(600), PNG = png(pixels(COVERS.sunset)), OTHER = fakeJpeg(300);
const find = (bytes) => embeddedCover(new Blob([bytes]));
const frame = (body, flags = [0, 0], id = 'APIC') => ({ id, body, flags });
const text = (id, s) => frame(join([0], [...s].map((c) => c.charCodeAt(0))), [0, 0], id);
const same = (got, bytes, type) => { assert.ok(got, 'found a cover'); assert.equal(got.type, type); assert.deepEqual([...got.bytes], [...bytes]); };

test('ID3v2.3: the picture of an APIC frame, whole, with its type from its bytes (not the tag\'s word for it)', async () => {
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(PNG, { mime: 'image/png' }))] })), PNG, 'image/png');
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(PNG, { mime: 'image/jpeg' }))] })), PNG, 'image/png'); // (a PNG a tag calls a JPEG)
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(JPEG, { mime: 'JPG' }))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(JPEG, { mime: '' }))] })), JPEG, 'image/jpeg');
});

test('ID3v2.4: frame sizes are synchsafe, and a size that cannot be is read as a plain number (iTunes wrote those)', async () => {
  same(await find(id3Tag({ version: 4, frames: [frame(apicBody(JPEG)), text('TIT2', 'a title')] })), JPEG, 'image/jpeg');
  // plain sizes: some have a byte with its top bit set, which a synchsafe number never has (40,000 and 200 bytes); some
  // look synchsafe (30,000), and are told by not ending where a frame does
  for (const n of [200, 30000, 40000]) {
    const picture = fakeJpeg(n);
    same(await find(id3Tag({ version: 4, plainSizes: true, frames: [frame(apicBody(picture))] })), picture, 'image/jpeg');
    same(await find(id3Tag({ version: 4, plainSizes: true, frames: [frame(apicBody(picture)), text('TIT2', 'a title')] })), picture, 'image/jpeg');
    same(await find(id3Tag({ version: 4, plainSizes: true, padding: 300, frames: [text('TIT2', 'a title'), frame(apicBody(picture))] })), picture, 'image/jpeg');
    same(await find(id3Tag({ version: 4, frames: [frame(apicBody(picture))] })), picture, 'image/jpeg'); // (and synchsafe sizes of the same pictures)
  }
});

test('the frames before it, the padding after it and a long description do not matter', async () => {
  const frames = [text('TIT2', 'Song'), text('TPE1', 'Artist'), text('TALB', 'Album'), frame(apicBody(JPEG, { description: 'front cover, as scanned from the sleeve' })), text('TYER', '1999')];
  for (const version of [3, 4]) same(await find(id3Tag({ version, frames, padding: 2048 })), JPEG, 'image/jpeg');
});

test('descriptions in every encoding: Latin-1, UTF-16 with a BOM, UTF-16BE, UTF-8', async () => {
  for (const encoding of [0, 1, 2, 3]) {
    for (const description of ['', 'cover', 'a sleeve']) {
      for (const version of [3, 4]) same(await find(id3Tag({ version, frames: [frame(apicBody(JPEG, { encoding, description }))] })), JPEG, 'image/jpeg');
    }
  }
});

test('unsynchronisation: 2.3 over the whole tag, 2.4 by the tag\'s flag or a frame\'s own; the picture comes back byte for byte', async () => {
  assert.ok(unsynchronise(JPEG).length > JPEG.length, 'the fixture has the sequences that need escaping');
  same(await find(id3Tag({ version: 3, unsync: true, frames: [text('TIT2', 'Song'), frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 4, unsync: true, frames: [text('TIT2', 'Song'), frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 4, frames: [text('TIT2', 'Song'), frame(apicBody(JPEG), [0, 0x02])] })), JPEG, 'image/jpeg');
  // a tag that wasn't unsynchronised is left as it is (a JPEG has plenty of 0xFF 0x00 that must stay)
  same(await find(id3Tag({ version: 3, frames: [frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 4, frames: [frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
});

test('an extended header is stepped over: 2.3 sizes it without its own four bytes, 2.4 with them', async () => {
  for (const version of [3, 4]) {
    same(await find(id3Tag({ version, extended: true, frames: [frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
    same(await find(id3Tag({ version, extended: true, unsync: true, frames: [text('TIT2', 'x'), frame(apicBody(JPEG))] })), JPEG, 'image/jpeg');
  }
});

test('2.4 frame flags: a group byte and a data length indicator come before the picture, and are not part of it', async () => {
  const body = apicBody(JPEG), length = [(body.length >> 21) & 127, (body.length >> 14) & 127, (body.length >> 7) & 127, body.length & 127];
  same(await find(id3Tag({ version: 4, frames: [frame(join([7], body), [0, 0x40])] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 4, frames: [frame(join(length, body), [0, 0x01])] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 4, frames: [frame(join([7], length, body), [0, 0x41])] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ version: 3, frames: [frame(join([7], body), [0, 0x20])] })), JPEG, 'image/jpeg'); // (2.3's group flag)
});

test('compressed and encrypted frames are left alone, and the next one is found', async () => {
  for (const [version, flag] of [[3, 0x80], [3, 0x40], [4, 0x08], [4, 0x04]]) {
    same(await find(id3Tag({ version, frames: [frame(apicBody(OTHER), [0, flag]), frame(apicBody(JPEG, { kind: 4 }))] })), JPEG, 'image/jpeg');
    assert.equal(await find(id3Tag({ version, frames: [frame(apicBody(OTHER), [0, flag])] })), null);
  }
});

test('the front cover wins over any other picture, wherever it is; else the first one', async () => {
  same(await find(id3Tag({ frames: [frame(apicBody(OTHER, { kind: 4 })), frame(apicBody(JPEG, { kind: 3 })), frame(apicBody(PNG, { kind: 0 }))] })), JPEG, 'image/jpeg');
  same(await find(id3Tag({ frames: [frame(apicBody(OTHER, { kind: 0 })), frame(apicBody(PNG, { kind: 8 }))] })), OTHER, 'image/jpeg');
  same(await find(id3Tag({ version: 4, frames: [frame(apicBody(PNG, { kind: 4 })), frame(apicBody(JPEG, { kind: 3 }))] })), JPEG, 'image/jpeg');
});

test('after the tag comes the audio, and a big file costs only its tag', async () => {
  const mp3 = silentMp3(3, id3Tag({ frames: [frame(apicBody(PNG, { mime: 'image/png' }))] }));
  same(await find(mp3), PNG, 'image/png');
  // the reader asks the file for ranges: a header, then the tag, and no more
  const asked = [], blob = new Blob([mp3]);
  const spy = { size: blob.size, slice: (a, b) => { asked.push([a, b]); return blob.slice(a, b); } };
  same(await embeddedCover(spy), PNG, 'image/png');
  assert.ok(asked.length <= 2 && Math.max(...asked.map(([, b]) => b)) <= 10 + PNG.length + 100, `read ${JSON.stringify(asked)}`);
});

test('no cover: a tag without a picture, no tag, a link ("-->") instead of a picture, and a picture that is not one', async () => {
  assert.equal(await find(id3Tag({ frames: [text('TIT2', 'Song')] })), null);
  assert.equal(await find(id3Tag({ version: 4, frames: [text('TIT2', 'Song')] })), null);
  assert.equal(await find(silentMp3(1)), null);
  assert.equal(await find(id3Tag({ frames: [frame(join([0], [...'-->'].map((c) => c.charCodeAt(0)), [0, 3, 0], [...'http://x/y.jpg'].map((c) => c.charCodeAt(0))))] })), null);
  assert.equal(await find(id3Tag({ frames: [frame(apicBody(new Uint8Array(500).fill(7)))] })), null);
  assert.equal(await find(id3Tag({ frames: [frame(apicBody(new Uint8Array(0)))] })), null);
  assert.equal(await find(new Uint8Array(0)), null);
  assert.equal(await find(new Uint8Array(5000).fill(0x41)), null);
});

test('ID3v2.2 and tags that are cut short or lie about their size give nothing, and no error', async () => {
  const tag = id3Tag({ frames: [frame(apicBody(JPEG))] });
  assert.equal(await find(Uint8Array.from(tag, (v, i) => (i === 3 ? 2 : v))), null); // (2.2's picture frame is not read)
  assert.equal(await find(Uint8Array.from(tag, (v, i) => (i === 3 ? 5 : v))), null);
  for (const n of [0, 3, 9, 10, 11, 25, 100, 400, tag.length - 1]) assert.equal(await find(tag.subarray(0, n)), null, `cut at ${n}`);
  assert.equal(await find(Uint8Array.from(tag, (v, i) => (i >= 6 && i < 10 ? 0xff : v))), null); // (a tag size that cannot be synchsafe)
  // a frame that says it is longer than the tag
  assert.equal(await find(id3Tag({ frames: [{ id: 'APIC', body: apicBody(JPEG), flags: [0, 0] }] }).map((v, i) => (i === 14 ? 0x7f : v))), null);
  // a huge size in the header, over what the file has: nothing, and nothing read to the end of the earth
  assert.equal(await find(Uint8Array.from(tag, (v, i) => (i >= 6 && i < 10 ? 0x7f : v))), null);
});

// ---------------------------------------------------------------- MP4

test('MP4: moov/udta/meta/ilst/covr/data, a JPEG and a PNG, with moov before the audio or after it', async () => {
  for (const moovFirst of [true, false]) {
    same(await find(m4a({ pictures: [[JPEG, 13]], moovFirst })), JPEG, 'image/jpeg');
    same(await find(m4a({ pictures: [[PNG, 14]], moovFirst })), PNG, 'image/png');
  }
});

test('MP4: the first of several pictures; a 64-bit atom size on the audio; meta without its version and flags (an old QuickTime file)', async () => {
  same(await find(m4a({ pictures: [[PNG, 14], [JPEG, 13]] })), PNG, 'image/png');
  same(await find(m4a({ pictures: [[JPEG, 13]], bigMdat: true, moovFirst: false })), JPEG, 'image/jpeg');
  same(await find(m4a({ pictures: [[JPEG, 13]], quicktimeMeta: true })), JPEG, 'image/jpeg');
});

test('MP4: a big file costs only the atoms\' headers and the picture', async () => {
  const bytes = m4a({ pictures: [[JPEG, 13]], moovFirst: false }), asked = [], blob = new Blob([bytes]);
  const spy = { size: blob.size, slice: (a, b) => { asked.push([a, b]); return blob.slice(a, b); } };
  same(await embeddedCover(spy), JPEG, 'image/jpeg');
  assert.ok(asked.every(([a, b]) => b - a <= 16 || b - a <= JPEG.length), 'headers and the picture only');
  assert.ok(asked.length < 20, `${asked.length} reads`);
});

test('MP4 without a cover: no covr, no ilst, no udta, and files cut short give nothing, and no error', async () => {
  assert.equal(await find(m4a({ pictures: [] })), null);
  assert.equal(await find(m4a({ pictures: [[JPEG, 13]], ilst: false })), null);
  assert.equal(await find(m4a({ pictures: [[JPEG, 13]], udta: false })), null);
  const whole = m4a({ pictures: [[JPEG, 13]], moovFirst: false });
  for (const n of [0, 4, 8, 12, 20, 100, 5030, whole.length - 700, whole.length - 1]) assert.equal(await find(whole.subarray(0, n)), null, `cut at ${n}`);
  assert.equal(await find(m4a({ pictures: [[new Uint8Array(500).fill(9), 13]] })), null); // (a picture that is not one)
});

test('MP4 atoms that lie: a size under their header, over the file, or zero, never loop and never throw', async () => {
  const good = m4a({ pictures: [[JPEG, 13]] });
  for (const size of [0, 1, 4, 7, 8, 0xffffffff]) {
    const bad = Uint8Array.from(good);
    bad.set([(size >>> 24) & 255, (size >>> 16) & 255, (size >>> 8) & 255, size & 255], good[3] + (good[2] << 8) + (good[1] << 16) + (good[0] << 24)); // (the first atom after ftyp)
    const got = await find(bad);
    assert.ok(got === null || got.type === 'image/jpeg');
  }
  // a file that starts like MP4 but is not
  assert.equal(await find(join([0, 0, 0, 20], [...'ftyp'].map((c) => c.charCodeAt(0)), new Uint8Array(200).fill(0xff))), null);
});
