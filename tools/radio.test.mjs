import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { icyTitles, pickCover } = createRequire(import.meta.url)('../helpers/radio.cjs');

// A stream as Icecast sends it: metaint bytes of sound, then a block of metadata (its length / 16
// first, zero-padded), and so on.
function stream(metaint, blocks) {
  const parts = [];
  for (const block of blocks) {
    parts.push(Buffer.alloc(metaint, 0xff));
    const body = Buffer.from(block);
    const meta = Buffer.alloc(Math.ceil(body.length / 16) * 16);
    body.copy(meta);
    parts.push(Buffer.from([meta.length / 16]), meta);
  }
  return Buffer.concat(parts);
}

const read = (bytes, size, metaint) => {
  const songs = [], feed = icyTitles(metaint, (s) => songs.push(s));
  for (let i = 0; i < bytes.length; i += size) feed(bytes.subarray(i, i + size));
  return songs;
};

test('titles come out split at the first " - ", however the stream is cut into chunks', () => {
  const bytes = stream(100, [
    "StreamTitle='Daft Punk - One More Time';StreamUrl='';",
    '', // (no block: the length byte is 0)
    "StreamTitle='Daft Punk - One More Time';", // (the same again: nothing new)
    "StreamTitle='Sly & the Family Stone - Thank You - Falettinme Be Mice Elf Agin';",
    "StreamUrl='https://example.com';", // (no title in it: nothing new)
    "StreamTitle='';", // between songs: no title
    "StreamTitle='Radio Paradise';", // no separator: all title
    "StreamTitle='Björk - Jóga';",
  ]);
  const want = [
    { title: 'One More Time', artist: 'Daft Punk' },
    { title: 'Thank You - Falettinme Be Mice Elf Agin', artist: 'Sly & the Family Stone' },
    null,
    { title: 'Radio Paradise', artist: '' },
    { title: 'Jóga', artist: 'Björk' },
  ];
  for (const size of [1, 7, 100, 101, 4096]) assert.deepEqual(read(bytes, size, 100), want, `chunks of ${size}`);
});

test('a Latin-1 title (older servers) reads as Latin-1', () => {
  const bytes = stream(16, [Buffer.from("StreamTitle='Sigur Rós - Hoppípolla';", 'latin1')]);
  assert.deepEqual(read(bytes, 5, 16), [{ title: 'Hoppípolla', artist: 'Sigur Rós' }]);
});

test('the cover: the first result whose artist and title both match, at 600 pixels; else none', () => {
  const r = (artistName, trackName, n) => ({ artistName, trackName, artworkUrl100: `https://is1-ssl.mzstatic.com/image/thumb/${n}/100x100bb.jpg` });
  const results = [r('Daft Punk Tribute Band', 'Something Else', 1), r('Daft Punk', 'One More Time (Radio Edit)', 2), r('Daft Punk', 'One More Time', 3)];
  assert.equal(pickCover(results, 'daft punk', 'One More Time'), 'https://is1-ssl.mzstatic.com/image/thumb/2/600x600bb.jpg');
  assert.equal(pickCover([r('Daft Punk', 'Aerodynamic', 1)], 'Daft Punk', 'One More Time'), null); // (a wrong cover is worse than none)
  assert.equal(pickCover([r('Daft Punk', 'One More Time', 1)], '', 'One More Time'), null);
  assert.equal(pickCover([r('', 'One More Time', 1)], 'Daft Punk', 'One More Time'), null);
  assert.equal(pickCover([{ artistName: 'Daft Punk', trackName: 'One More Time', artworkUrl100: 'file:///etc/passwd' }], 'Daft Punk', 'One More Time'), null);
  assert.equal(pickCover(undefined, 'Daft Punk', 'One More Time'), null);
});
