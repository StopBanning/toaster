// Covers and the files that carry them, built in code for the tests of the dynamic theme (cover-palette.test.mjs,
// embedded-cover.test.mjs) and for its smoke check (dynamic-theme-check.mjs): pictures as RGBA pixels and as PNGs, the
// tags and atoms an MP3 and an M4A keep a cover in, in the variants the reader has to know, and an MP3 that plays
// silence, to carry one. Nothing here is a real person's cover.
import zlib from 'node:zlib';

export const SIZE = 48; // the size the page hands the palette

// ---------------------------------------------------------------- pictures

// RGBA pixels, size x size: fn(u, v, x, y) gives [r, g, b] or [r, g, b, a], u and v running 0-1 across and down.
export function pixels(fn, size = SIZE) {
  const d = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = fn(x / (size - 1), y / (size - 1), x, y);
      d.set([r, g, b, a], (y * size + x) * 4);
    }
  }
  return d;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
export const join = (...parts) => Uint8Array.from(parts.flatMap((p) => [...p]));

// A PNG of those pixels (RGBA, 8 bits), at size x size.
export function png(rgba, size = SIZE) {
  const rows = [];
  for (let y = 0; y < size; y++) rows.push(0, ...rgba.subarray(y * size * 4, (y + 1) * size * 4));
  const chunk = (name, data) => join(u32(data.length), ascii(name), data, u32(crc32(join(ascii(name), data))));
  return join([0x89, ...ascii('PNG'), 13, 10, 26, 10], chunk('IHDR', join(u32(size), u32(size), [8, 6, 0, 0, 0])), chunk('IDAT', zlib.deflateSync(Uint8Array.from(rows))), chunk('IEND', []));
}

// A picture that only looks like a JPEG to the reader (its first bytes), full of the 0xFF sequences a tag has to escape (0xFF
// then 0x00, 0xE0 up, or 0xFF), for what the reader has to hand back whole, whatever is in it.
export const fakeJpeg = (n = 600) => {
  const out = [0xff, 0xd8, 0xff, 0xe0, 0, 16, ...ascii('JFIF'), 0];
  while (out.length < n) out.push(0xff, [0, 0xe0, 0xff, 0xfb, 0x12][out.length % 5], out.length & 255);
  return Uint8Array.from([...out, 0xff, 0xd9]);
};

// ---------------------------------------------------------------- ID3v2

const synch = (n) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
// Unsynchronisation: a 0x00 after every 0xFF that is followed by a byte that could start audio (0xE0 up), by 0x00, or by nothing.
export const unsynchronise = (b) => Uint8Array.from([...b].flatMap((v, i) => (v === 0xff && (i === b.length - 1 || b[i + 1] >= 0xe0 || b[i + 1] === 0) ? [v, 0] : [v])));

// An APIC frame's contents: encoding (0 Latin-1, 1 UTF-16 with BOM, 2 UTF-16BE, 3 UTF-8), MIME type, kind, description, picture.
export function apicBody(image, { mime = 'image/jpeg', kind = 3, description = '', encoding = 0 } = {}) {
  const wide = encoding === 1 || encoding === 2;
  const desc = encoding === 1 ? [0xff, 0xfe, ...[...description].flatMap((c) => [c.charCodeAt(0), 0])] : encoding === 2 ? [...description].flatMap((c) => [0, c.charCodeAt(0)]) : ascii(description);
  return join([encoding], ascii(mime), [0, kind], desc, wide ? [0, 0] : [0], image);
}

// A tag: frames are { id, body, flags: [status, format] }. version 3 or 4; unsync (the tag's flag, with 2.3's whole-tag
// encoding, or 2.4's every frame); extended (an extended header); padding (zero bytes after the frames).
export function id3Tag({ version = 3, frames = [], unsync = false, extended = false, padding = 0, plainSizes = false }) {
  const size = (n) => (version === 4 && !plainSizes ? synch(n) : u32(n));
  let body = join(...frames.map((f) => {
    const data = version === 4 && (unsync || (f.flags && f.flags[1] & 0x02)) ? unsynchronise(f.body) : f.body;
    return join(ascii(f.id), size(data.length), f.flags || [0, 0], data);
  }));
  // 2.3 ext header: size (without its four bytes), flags, padding size; 2.4: size (with them), the number of flag bytes and the flags
  const ext = extended ? (version === 3 ? join(u32(6), [0, 0], u32(padding)) : join(synch(6), [1, 0])) : [];
  body = join(ext, body, new Uint8Array(padding));
  if (version === 3 && unsync) body = unsynchronise(body);
  return join(ascii('ID3'), [version, 0, (unsync ? 0x80 : 0) | (extended ? 0x40 : 0)], synch(body.length), body);
}

// ---------------------------------------------------------------- MP4

const atom = (name, ...contents) => { const body = join(...contents); return join(u32(8 + body.length), ascii(name), body); };
// An M4A: ftyp, then moov and an mdat in either order, with the iTunes-style tag atoms inside moov (a title, and a cover if given:
// pictures is a list of [bytes, kind]; kind 13 is a JPEG, 14 a PNG).
export function m4a({ pictures = [], moovFirst = true, bigMdat = false, quicktimeMeta = false, ilst = true, udta = true, extraUdta = [] } = {}) {
  const item = (name, ...contents) => atom(name, ...contents);
  const title = item('©nam', atom('data', u32(1), u32(0), ascii('A song')));
  const covr = pictures.length ? item('covr', ...pictures.map(([image, kind]) => atom('data', u32(kind), u32(0), image))) : [];
  const meta = atom('meta', quicktimeMeta ? [] : u32(0), atom('hdlr', new Uint8Array(24)), ilst ? atom('ilst', title, covr) : atom('free', new Uint8Array(40)));
  const moov = atom('moov', atom('mvhd', new Uint8Array(100)), atom('trak', new Uint8Array(300)), udta ? atom('udta', ...extraUdta, meta) : atom('free', new Uint8Array(8)));
  const mdat = bigMdat ? join(u32(1), ascii('mdat'), u32(0), u32(16 + 5000), new Uint8Array(5000)) : atom('mdat', new Uint8Array(5000));
  return join(atom('ftyp', ascii('M4A '), u32(0), ascii('M4A mp42isom')), ...(moovFirst ? [moov, mdat] : [mdat, moov]));
}

// ---------------------------------------------------------------- audio that plays

// An MP3 of silence, `seconds` long (MPEG-1 layer III, 44.1 kHz, 128 kbit/s: frames of 417 bytes, 26 ms each, a header and nothing
// else, which decodes to quiet), with a tag in front of it if given.
export function silentMp3(seconds = 4, tag = []) {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  return join(tag, ...Array.from({ length: Math.ceil(seconds / 0.02612) }, () => frame));
}

// ---------------------------------------------------------------- covers (pixels)

const mulberry = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// a number 0-1 for a pixel (and a seed): grain that is the same every time the cover is drawn
const hash = (x, y, seed) => { let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 2246822519, 3266489917) ^ Math.imul(seed, 2654435761); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
// Smooth random blobs, three channels from their own lattices, with grain: a stand-in for a photo.
function photo(seed, tint, grain = 14, cells = 6) {
  const rand = mulberry(seed), lattice = [0, 1, 2].map(() => Array.from({ length: (cells + 1) ** 2 }, rand));
  const at = (c, u, v) => {
    const x = u * cells, y = v * cells, i = Math.min(cells - 1, Math.floor(x)), j = Math.min(cells - 1, Math.floor(y)), fx = x - i, fy = y - j, s = (t) => t * t * (3 - 2 * t);
    const p = (a, b) => lattice[c][b * (cells + 1) + a];
    return (p(i, j) * (1 - s(fx)) + p(i + 1, j) * s(fx)) * (1 - s(fy)) + (p(i, j + 1) * (1 - s(fx)) + p(i + 1, j + 1) * s(fx)) * s(fy);
  };
  return (u, v, x, y) => tint.map((t, c) => Math.max(0, Math.min(255, Math.round(t * (0.25 + 1.0 * at(c, u, v)) + (hash(x, y, seed + c) - 0.5) * grain * 2))));
}

// Thirty covers: flat, neon, two-colour, with a small mark on a plain ground, gradients, and noisy photo-like ones.
export const COVERS = {
  black: () => [0, 0, 0],
  white: () => [255, 255, 255],
  'mid grey': () => [128, 128, 128],
  'dark grey': () => [40, 40, 40],
  'light grey': () => [210, 210, 210],
  'neon magenta': () => [255, 0, 255],
  'neon green': () => [57, 255, 20],
  'neon cyan': () => [0, 255, 255],
  red: () => [220, 20, 40],
  blue: () => [20, 40, 200],
  yellow: () => [255, 224, 0],
  'red and cyan halves': (u) => (u < 0.5 ? [220, 30, 40] : [30, 210, 220]),
  'black and white stripes': (u, v, x) => (x % 8 < 4 ? [0, 0, 0] : [255, 255, 255]),
  'orange and navy squares': (u, v, x, y) => ((x >> 3) + (y >> 3)) % 2 ? [255, 120, 0] : [10, 20, 80],
  'navy with an orange stripe': (u, v) => (v > 0.7 && v < 0.82 ? [255, 140, 20] : [14, 24, 70]),
  'black with a neon pink mark': (u, v) => (Math.abs(u - 0.5) < 0.14 && Math.abs(v - 0.5) < 0.14 ? [255, 20, 147] : [4, 4, 6]),
  'white with a red disc': (u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.24 ? [188, 0, 45] : [255, 255, 255]),
  'blue to red': (u) => [Math.round(255 * u), 60, Math.round(255 * (1 - u))],
  'black to white': (u, v) => [Math.round(255 * v), Math.round(255 * v), Math.round(255 * v)],
  'purple to orange': (u, v) => mix([90, 20, 160], [255, 140, 20], (u + v) / 2),
  'yellow to dark red': (u, v) => mix([255, 230, 40], [90, 0, 10], Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 1.8)),
  rainbow: (u) => { const h = u * 6, k = h % 1, q = [[1, k, 0], [1 - k, 1, 0], [0, 1, k], [0, 1 - k, 1], [k, 0, 1], [1, 0, 1 - k]][Math.floor(h) % 6]; return q.map((c) => Math.round(255 * c)); },
  sunset: (u, v) => [Math.round(255 * (1 - v * 0.3)), Math.round(100 + 80 * (1 - v)), Math.round(40 + 150 * v)],
  'warm photo': photo(11, [255, 150, 90]),
  'cool photo': photo(23, [70, 140, 255]),
  'loud photo': photo(5, [255, 255, 255], 30, 9),
  'grey photo': (() => { const p = photo(31, [255, 255, 255], 18); return (u, v, x, y) => { const g = p(u, v, x, y)[1]; return [g, g, g]; }; })(),
  'pure noise': (u, v, x, y) => [0, 1, 2].map((c) => Math.floor(hash(x, y, 90 + c) * 256)),
  pastel: (u, v) => mix([250, 200, 215], [200, 230, 250], (u + v) / 2),
  'dark photo': photo(41, [40, 30, 60], 6),
};

export const coverPixels = (name) => pixels(COVERS[name]);
