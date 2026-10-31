// Files that carry names, built in code for the library's tests (audio-tags.test.mjs, library-main.test.mjs) and for the library
// the live check scans (library-fixture.mjs): ID3 text frames in each encoding, an MP3 with a Xing header, an M4A's ilst items
// and mvhd. They sit beside cover-fixtures.mjs (the picture frames, the tags and atoms of the covers), and use its builders.
// Nothing here is a real person's tags.
import { id3Tag, join, silentMp3 } from './cover-fixtures.mjs';

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n) => [(n >> 8) & 255, n & 255];

// ---------------------------------------------------------------- ID3v2

// The bytes of some text in a frame's encodings: 0 Latin-1, 1 UTF-16 with a byte order mark (little endian), 2 UTF-16BE, 3 UTF-8.
export function encode(s, encoding = 3) {
  if (encoding === 0) return [...s].map((c) => c.charCodeAt(0) & 255);
  if (encoding === 1) return [0xff, 0xfe, ...[...s].flatMap((c) => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8])];
  if (encoding === 2) return [...s].flatMap((c) => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255]);
  return [...new TextEncoder().encode(s)];
}
// A text frame: its id, its text (several values for 2.4's, each ended by a null), its encoding, and the frame flags.
export function textFrame(id, value, { encoding = 3, flags = [0, 0], nulls = false } = {}) {
  const values = [].concat(value);
  const sep = encoding === 1 || encoding === 2 ? [0, 0] : [0];
  const parts = values.flatMap((v, i) => (i ? [...sep, ...encode(v, encoding)] : encode(v, encoding)));
  return { id, body: join([encoding], parts, nulls ? sep : []), flags };
}
// An ID3v2.2 tag: three-character ids and sizes of three bytes, with no flags.
export function id3v22(frames, { padding = 0 } = {}) {
  const body = join(...frames.map((f) => join(ascii(f.id), [(f.body.length >> 16) & 255, (f.body.length >> 8) & 255, f.body.length & 255], f.body)), new Uint8Array(padding));
  return join(ascii('ID3'), [2, 0, 0], [(body.length >> 21) & 127, (body.length >> 14) & 127, (body.length >> 7) & 127, body.length & 127], body);
}

// ---------------------------------------------------------------- MP3

// An MPEG-1 layer III frame (44.1 kHz, 128 kbit/s, stereo: 417 bytes, 1152 samples) that holds a Xing (or Info) header, which says
// how many frames the file has: what a variable bit rate file carries in its first frame.
export function xingFrame(frames, name = 'Xing') {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  frame.set([...ascii(name), ...u32(1), ...u32(frames)], 36);
  return frame;
}
// A VBRI header (Fraunhofer's) in the same place: its frame count 14 bytes in.
export function vbriFrame(frames) {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  frame.set([...ascii('VBRI'), 0, 1, 0, 0, 0, 0, ...u32(0), ...u32(frames)], 36);
  return frame;
}
// A tagged MP3 that plays, `frames` frames of silence long (26.12 ms each): with a header in front that counts them ('Xing', 'Info'
// or 'vbri'), or none (a constant bit rate one), after a tag (the bytes of id3Tag) if given. Its length, in seconds, is
// frames * 1152 / 44100.
export function mp3({ tag = [], frames = 40, header = 'Xing', trailer = [] } = {}) {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  const first = header === 'vbri' ? vbriFrame(frames) : header ? xingFrame(frames, header) : [];
  return join(tag, first, ...Array.from({ length: frames }, () => frame), trailer);
}
export { silentMp3 };

// ---------------------------------------------------------------- MP4

const atom = (name, ...contents) => { const body = join(...contents); return join(u32(8 + body.length), ascii(name), body); };
const named = (name) => (name.startsWith('(c)') ? [0xa9, ...ascii(name.slice(3))] : ascii(name));
const item = (name, ...contents) => { const body = join(...contents); return join(u32(8 + body.length), named(name), body); };
const textItem = (name, s, kind = 1) => item(name, atom('data', u32(kind), u32(0), kind === 2 ? [...s].flatMap((c) => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255]) : [...new TextEncoder().encode(s)]));

// An M4A with its names in iTunes' ilst items: tags is { title, artist, albumArtist, album, track: [n, total], disc: [n, total],
// compilation }; the movie header says how long it is (version 1: 64-bit times); moov before the audio or after it; a meta atom
// with its version bytes or QuickTime's without; pictures [[bytes, kind]] in a covr item after the text.
export function m4a({ tags = {}, seconds = 12.5, timescale = 44100, version = 0, moovFirst = true, quicktimeMeta = false, pictures = [], extra = [] } = {}) {
  const items = [
    tags.title !== undefined ? textItem('(c)nam', tags.title) : [], tags.artist !== undefined ? textItem('(c)ART', tags.artist) : [],
    tags.albumArtist !== undefined ? textItem('aART', tags.albumArtist) : [], tags.album !== undefined ? textItem('(c)alb', tags.album, tags.albumKind) : [],
    tags.track ? item('trkn', atom('data', u32(0), u32(0), [0, 0, ...u16(tags.track[0]), ...u16(tags.track[1] || 0), 0, 0])) : [],
    tags.disc ? item('disk', atom('data', u32(0), u32(0), [0, 0, ...u16(tags.disc[0]), ...u16(tags.disc[1] || 0)])) : [],
    tags.compilation ? item('cpil', atom('data', u32(21), u32(0), [1])) : [],
    pictures.length ? item('covr', ...pictures.map(([image, kind]) => atom('data', u32(kind), u32(0), image))) : [],
    ...extra,
  ];
  const duration = Math.round(seconds * timescale);
  const mvhd = atom('mvhd', version === 1 ? join([1, 0, 0, 0], u32(0), u32(0), u32(0), u32(0), u32(timescale), u32(0), u32(duration), new Uint8Array(80))
    : join([0, 0, 0, 0], u32(0), u32(0), u32(timescale), u32(duration), new Uint8Array(80)));
  const meta = atom('meta', quicktimeMeta ? [] : u32(0), atom('hdlr', new Uint8Array(24)), atom('ilst', ...items));
  const moov = atom('moov', mvhd, atom('trak', new Uint8Array(300)), atom('udta', meta));
  const mdat = atom('mdat', new Uint8Array(5000));
  return join(atom('ftyp', ascii('M4A '), u32(0), ascii('M4A mp42isom')), ...(moovFirst ? [moov, mdat] : [mdat, moov]));
}
