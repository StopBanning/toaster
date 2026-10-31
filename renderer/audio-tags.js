// The names and the length of an audio file, for the library: an MP3's ID3v2 tag (title, artist, album artist, album, track
// and disc numbers, the compilation flag; 2.2, 2.3 and 2.4) and its length from its first frame (the Xing or VBRI header of a
// variable bit rate file, else the bit rate of a constant one), and an M4A's ilst atoms and mvhd. Like embedded-cover.js, which
// reads the picture beside these, it reads only as much of the file as it takes (a tag's frames one by one, a picture's bytes
// never), so a big file costs a few small reads. The file is anything with a size and slice() (a File from the page, a Blob
// from fs.openAsBlob in the scan's worker, a Blob in the tests). What isn't there, or isn't what it should be, is left out:
// the answer is always an object, never an error, and { } for a file it can't read (FLAC, Ogg, WAV and WebM are listed from
// their names: see tagsFromPath in library.js).
//
// { title, artist, albumArtist, album, track, trackTotal, disc, discTotal, compilation, duration } (duration in seconds)

// The files the library lists (what Chromium plays), by their extensions. helpers/library.cjs has the same list for the main
// process (a test keeps the two alike).
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'mp4', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'webm'];
export const isAudioName = (name) => AUDIO_EXTENSIONS.includes(/\.([^./\\]+)$/.exec(String(name))?.[1].toLowerCase());

const MAX_TAG = 16 * 1024 * 1024; // a tag bigger than this is left alone
const WINDOW = 16 * 1024; // how much is read at a time, walking a tag's frames

const read = async (blob, start, end) => new Uint8Array(await blob.slice(start, Math.min(end, blob.size)).arrayBuffer());
const be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const synchsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3]; // 7 bits a byte, so no byte looks like the start of audio
const text = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));

// ---------------------------------------------------------------- text

// A tag's text in the encoding its first byte names (0 Latin-1, 1 UTF-16 with a byte order mark, 2 UTF-16BE, 3 UTF-8), as the
// values it holds (a 2.4 frame can hold several, each ended by a null). Latin-1 is read as windows-1252, which is what
// the taggers that wrote it meant.
const DECODERS = {};
const decoder = (name) => (DECODERS[name] ||= new TextDecoder(name));
function decodeText(b, encoding) {
  let out;
  if (encoding === 1) {
    const be = b[0] === 0xfe && b[1] === 0xff;
    out = decoder(be ? 'utf-16be' : 'utf-16le').decode(b[0] === 0xff || b[0] === 0xfe ? b.subarray(2) : b);
  } else if (encoding === 2) out = decoder('utf-16be').decode(b.length % 2 ? b.subarray(0, b.length - 1) : b);
  else out = decoder(encoding === 3 ? 'utf-8' : 'windows-1252').decode(b);
  return out.split('\u0000').map((s) => s.replace(/^﻿/, '').trim()).filter(Boolean);
}
const FIELDS = { TIT2: 'title', TPE1: 'artist', TPE2: 'albumArtist', TALB: 'album', TRCK: 'track', TPOS: 'disc', TCMP: 'compilation',
  TT2: 'title', TP1: 'artist', TP2: 'albumArtist', TAL: 'album', TRK: 'track', TPA: 'disc', TCP: 'compilation' };

// "3/12" is track 3 of 12; a number that isn't one is left out
function ofTotal(value, out, key, totalKey) {
  const m = /^\s*(\d{1,5})\s*(?:\/\s*(\d{1,5}))?/.exec(value || '');
  if (!m) return;
  if (+m[1]) out[key] = +m[1];
  if (m[2] && +m[2]) out[totalKey] = +m[2];
}
// a field's values as the tags give it: the artists of a frame that holds several are joined
function put(out, field, values) {
  const value = field === 'artist' || field === 'albumArtist' ? values.join(', ') : values[0];
  if (!value || out[field] !== undefined) return;
  if (field === 'track') ofTotal(value, out, 'track', 'trackTotal');
  else if (field === 'disc') ofTotal(value, out, 'disc', 'discTotal');
  else if (field === 'compilation') { if (/^\s*1\s*$/.test(value)) out.compilation = true; }
  else out[field] = value;
}

// ---------------------------------------------------------------- ID3v2

// Unsynchronisation: a tag keeps 0xFF from being followed by a byte that could start audio by writing 0xFF 0x00 for
// every 0xFF it would have been before one. Undone by dropping each 0x00 that follows 0xFF.
function unsync(b) {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0) i++;
  }
  return out.subarray(0, n);
}

// Reads from a blob in windows, so that walking a tag's frames (a header of ten bytes, a text of a few more) is a few reads,
// and a picture's bytes between them are stepped over, not read; get(from, n) is n bytes at from (fewer at the end).
function windowed(blob, base) {
  let start = -1, bytes = new Uint8Array(0);
  return async (from, n) => {
    from += base;
    if (start < 0 || from < start || from + n > start + bytes.length) {
      start = from;
      bytes = await read(blob, from, from + Math.max(n, WINDOW));
    }
    return bytes.subarray(from - start, from - start + n);
  };
}

// The text frames of a tag whose body is size bytes long, read by get. A frame's size is a plain number in 2.3 and
// synchsafe in 2.4, except that iTunes once wrote plain ones in 2.4: a size that can't be synchsafe, or that isn't believable
// as one when the plain number is, is read as a plain number (embedded-cover.js reads them the same way).
async function id3Frames(get, size, version, flags) {
  const out = {};
  const head = version === 2 ? 6 : 10;
  let at = 0;
  if (flags & 0x40 && version > 2) at = version === 3 ? 4 + be32(await get(0, 6), 0) : synchsafe(await get(0, 6), 0);
  while (at + head <= size) {
    const h = await get(at, head);
    if (h.length < head || !h[0]) break; // (padding, or the end)
    // a size is believable if the frame ends where the tag does, or padding or another frame starts there
    const believable = async (n) => {
      const end = at + head + n;
      if (end > size) return false;
      if (end === size) return true;
      const next = await get(end, 4);
      return !next.some(Boolean) || /^[A-Z0-9]{4}$/.test(text(next, 0, 4));
    };
    let length, id, mode = 0;
    if (version === 2) { length = (h[3] << 16) | (h[4] << 8) | h[5]; id = text(h, 0, 3); } else {
      const plain = be32(h, 4), safe = synchsafe(h, 4);
      mode = h[9];
      length = version === 4 && !h.subarray(4, 8).some((v) => v & 0x80) && ((await believable(safe)) || !(await believable(plain))) ? safe : plain;
      id = text(h, 0, 4);
    }
    const end = at + head + length;
    if (end > size) break;
    const field = FIELDS[id];
    const body0 = at + head;
    at = end;
    if (!field || !length || length > 65536 || mode & (version === 3 ? 0xc0 : version === 4 ? 0x0c : 0)) continue; // (not one wanted, or compressed or encrypted)
    let body = await get(body0, length);
    if (version > 2 && mode & (version === 3 ? 0x20 : 0x40)) body = body.subarray(1); // a group byte
    if (version === 4 && mode & 0x01) body = body.subarray(4); // the length it had before unsynchronisation
    if (version === 4 && (mode & 0x02 || flags & 0x80)) body = unsync(body);
    if (body.length < 2) continue;
    put(out, field, decodeText(body.subarray(1), body[0] > 3 ? 0 : body[0]));
  }
  return out;
}

async function id3(blob, head) {
  const version = head[3], flags = head[5];
  if (version < 2 || version > 4 || (head[6] | head[7] | head[8] | head[9]) & 0x80) return null;
  const size = synchsafe(head, 6);
  if (!size || size > MAX_TAG) return null;
  // (2.3 unsynchronises the whole tag, frame headers too: that one is read whole, and undone)
  if (version === 3 && flags & 0x80) {
    const tag = unsync(await read(blob, 10, 10 + size));
    return { ...(await id3Frames(async (from, n) => tag.subarray(from, from + n), tag.length, version, flags)), end: 10 + size + (flags & 0x10 ? 10 : 0) };
  }
  return { ...(await id3Frames(windowed(blob, 10), Math.min(size, blob.size - 10), version, flags)), end: 10 + size + (flags & 0x10 ? 10 : 0) };
}

// ---------------------------------------------------------------- MP3: the length

const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };
// A layer III frame header at i: its sample rate, bit rate, the samples it holds and its length in bytes; null if it isn't one.
function frameAt(b, i) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const v = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, bi = b[i + 2] >> 4, ri = (b[i + 2] >> 2) & 3;
  if (v === 1 || layer !== 1 || !bi || bi === 15 || ri === 3) return null;
  const version = v === 3 ? 1 : v === 2 ? 2 : 2.5, rate = RATES[version][ri], bitrate = BITRATES[version === 1 ? 1 : 2][bi] * 1000;
  const samples = version === 1 ? 1152 : 576, length = Math.floor(((version === 1 ? 144 : 72) * bitrate) / rate) + ((b[i + 2] >> 1) & 1);
  return { version, rate, bitrate, samples, length, mono: b[i + 3] >> 6 === 3 };
}
async function mp3Length(blob, from) {
  const b = await read(blob, from, from + WINDOW);
  // the first frame: past any zero padding after the tag, and followed by another where its length says
  for (let i = 0; i + 4 <= b.length && i < 8192; i++) {
    const f = frameAt(b, i);
    if (!f) continue;
    if (i + f.length + 4 <= b.length && !frameAt(b, i + f.length)) continue;
    // a variable bit rate file says how many frames it has, in its first (silent) frame: Xing or Info, VBRI
    const x = i + (f.version === 1 ? (f.mono ? 21 : 36) : f.mono ? 13 : 21), tag = text(b, x, 4);
    if ((tag === 'Xing' || tag === 'Info') && b[x + 7] & 1) {
      const frames = be32(b, x + 8);
      if (frames) return (frames * f.samples) / f.rate;
    }
    if (text(b, i + 36, 4) === 'VBRI') {
      const frames = be32(b, i + 36 + 14);
      if (frames) return (frames * f.samples) / f.rate;
    }
    // a constant bit rate one: its audio's bytes at that rate (less an ID3v1 tag at the end)
    const v1 = blob.size > from + 128 && text(await read(blob, blob.size - 128, blob.size - 125), 0, 3) === 'TAG' ? 128 : 0;
    const bytes = blob.size - (from + i) - v1;
    return bytes > 0 ? (bytes * 8) / f.bitrate : null;
  }
  return null;
}

async function mp3(blob, head) {
  const tags = text(head, 0, 3) === 'ID3' ? (await id3(blob, head)) || {} : {};
  const length = await mp3Length(blob, tags.end || 0).catch(() => null);
  delete tags.end;
  if (length) tags.duration = length;
  return tags;
}

// ---------------------------------------------------------------- MP4

// An MP4's atoms: a size (four bytes; 1 means a 64-bit one follows the name; 0 means to the end), a name, the contents.
async function atomAt(blob, at, limit) {
  const h = await read(blob, at, at + 16);
  if (h.length < 8) return null;
  let size = be32(h, 0), head = 8;
  if (size === 1) { size = be32(h, 8) * 2 ** 32 + be32(h, 12); head = 16; } else if (!size) size = limit - at;
  return size < head || h.length < head ? null : { name: text(h, 4, 4), start: at + head, end: Math.min(limit, at + size), whole: at + size <= limit };
}
async function child(blob, from, limit, name) {
  for (let at = from; at < limit;) {
    const atom = await atomAt(blob, at, limit);
    if (!atom) return null;
    if (atom.name === name) return atom;
    at = atom.end;
  }
  return null;
}

// The ilst items: a name, and in it a data atom (a byte of version, three of flags that say what it holds, four of locale,
// then the value): text (flag 1, UTF-8; 2, UTF-16BE), or numbers (trkn and disk: two bytes, the number, then the total of them)
const ITEMS = { '©nam': 'title', '©ART': 'artist', aART: 'albumArtist', '©alb': 'album', trkn: 'track', disk: 'disc', cpil: 'compilation' };
async function mp4(blob) {
  const moov = await child(blob, 0, blob.size, 'moov');
  if (!moov) return {};
  const out = {};
  // the length: the movie header's duration in its own time scale (a 64-bit one in version 1)
  const mvhd = await child(blob, moov.start, moov.end, 'mvhd');
  if (mvhd) {
    const h = await read(blob, mvhd.start, mvhd.start + 32);
    const [scale, long] = h[0] === 1 ? [be32(h, 20), be32(h, 24) * 2 ** 32 + be32(h, 28)] : [be32(h, 12), be32(h, 16)];
    if (scale && long && long < 2 ** 52) out.duration = long / scale;
  }
  let atom = moov;
  for (const name of ['udta', 'meta']) {
    atom = await child(blob, atom.start, atom.end, name);
    if (!atom) return out;
  }
  // (meta holds four bytes of version and flags before its atoms, except in an old QuickTime file's)
  const ilst = (await child(blob, atom.start + 4, atom.end, 'ilst')) || (await child(blob, atom.start, atom.end, 'ilst'));
  if (!ilst) return out;
  for (let at = ilst.start; at < ilst.end;) {
    const item = await atomAt(blob, at, ilst.end);
    if (!item) break;
    at = item.end;
    const field = ITEMS[item.name];
    if (!field) continue;
    const data = await child(blob, item.start, item.end, 'data');
    if (!data || data.end - data.start < 9 || data.end - data.start > 65536) continue;
    const b = await read(blob, data.start, data.end), kind = b[3], value = b.subarray(8);
    if (field === 'track' || field === 'disc') {
      const n = (value[2] << 8) | value[3], total = (value[4] << 8) | value[5];
      if (value.length >= 4 && n) out[field] = n;
      if (value.length >= 6 && total) out[field + 'Total'] = total;
    } else if (field === 'compilation') { if (value[0] === 1) out.compilation = true; }
    else {
      const s = (kind === 2 ? decoder('utf-16be').decode(value.length % 2 ? value.subarray(0, value.length - 1) : value) : decoder('utf-8').decode(value)).replace(/\u0000/g, '').trim();
      if (s && out[field] === undefined) out[field] = s;
    }
  }
  return out;
}

// The names a played file gives its song, from what readTags found: its own title and artist (the album artist where it has no artist),
// and where a tag is empty its file's name without the extension, and "File" for the artist. What the code's first line
// (x = x.DaftPunk("Around the World")), the ID card, the player bar and an export call it by.
export function songOfFile(tags, fileName) {
  const t = tags || {};
  return { title: t.title || String(fileName || '').replace(/\.[^.]+$/, ''), artist: t.artist || t.albumArtist || 'File' };
}

// The file's names and length (see the top), as an object with only what was found.
export async function readTags(blob) {
  try {
    const head = await read(blob, 0, 16);
    if (text(head, 0, 3) === 'ID3' || frameAt(head, 0)) return await mp3(blob, head);
    if (text(head, 4, 4) === 'ftyp') return await mp4(blob);
  } catch { /* not what it says it is: nothing */ }
  return {};
}
