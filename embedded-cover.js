// The picture inside an audio file: the cover in an MP3's ID3v2 tag (its APIC frame) or in an M4A's (the covr atom, in
// moov/udta/meta/ilst). It reads only as much of the file as it takes: the tag at the start, or the atoms' headers
// down to the picture, so a big file costs a few small reads. The file is anything with a size and slice() (a File
// from the page, a Blob in the tests). What isn't there, or isn't what it should be, gives null, never an error.
// ID3v2.2 (its picture frame is PIC), FLAC and Ogg keep theirs differently and aren't read.

const MAX_TAG = 16 * 1024 * 1024; // a tag or picture bigger than this is left alone

const read = async (blob, start, end) => new Uint8Array(await blob.slice(start, Math.min(end, blob.size)).arrayBuffer());
const be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const synchsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3]; // 7 bits a byte, so no byte looks like the start of audio
const text = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));
// What a picture is by its first bytes (a tag's own word for it is wrong often enough).
function imageType(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && text(b, 1, 3) === 'PNG') return 'image/png';
  if (text(b, 0, 4) === 'GIF8') return 'image/gif';
  if (text(b, 0, 4) === 'RIFF' && text(b, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}
const picture = (b) => (b.length > 0 && b.length <= MAX_TAG && imageType(b) ? { type: imageType(b), bytes: b } : null);

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

// An APIC frame: its text encoding, the MIME type (a null-ended string), the picture's kind (3: the front cover), a
// description (null-ended in the encoding, which for 16-bit text means two nulls on a 16-bit boundary), the picture.
function apic(b) {
  let i = b.indexOf(0, 1);
  if (i < 0 || i + 2 > b.length) return null;
  const kind = b[i + 1], wide = b[0] === 1 || b[0] === 2;
  i += 2;
  if (wide) { while (i + 1 < b.length && (b[i] || b[i + 1])) i += 2; i += 2; }
  else { while (i < b.length && b[i]) i++; i++; }
  const found = picture(b.subarray(i));
  return found && { ...found, kind };
}

async function id3(blob, head) {
  const version = head[3], flags = head[5];
  if ((version !== 3 && version !== 4) || (head[6] | head[7] | head[8] | head[9]) & 0x80) return null;
  const size = synchsafe(head, 6);
  if (!size || size > MAX_TAG) return null;
  let tag = await read(blob, 10, 10 + size);
  // (2.3 unsynchronises the whole tag; 2.4 each frame, with its own flag, or all of them by the tag's)
  if (version === 3 && flags & 0x80) tag = unsync(tag);
  // an extended header comes first: 2.3 sizes it without its own four bytes, 2.4 with them
  let at = flags & 0x40 ? (version === 3 ? 4 + be32(tag, 0) : synchsafe(tag, 0)) : 0;
  let best = null;
  while (at + 10 <= tag.length && tag[at]) {
    // a size is believable if the frame ends where the tag does (or only padding is left), or another frame starts there
    const believable = (n) => at + 10 + n <= tag.length && (!tag.subarray(at + 10 + n).some(Boolean) || /^[A-Z0-9]{4}$/.test(text(tag, at + 10 + n, 4)));
    // (2.4 sizes are synchsafe, but iTunes once wrote plain numbers: a size that can't be synchsafe, or that isn't
    // believable as one when the plain number is, is read as a plain number)
    const plain = be32(tag, at + 4), safe = synchsafe(tag, at + 4), mode = tag[at + 9];
    const length = version === 4 && !tag.subarray(at + 4, at + 8).some((v) => v & 0x80) && (believable(safe) || !believable(plain)) ? safe : plain;
    const end = at + 10 + length;
    if (end > tag.length) break;
    let body = tag.subarray(at + 10, end);
    const id = text(tag, at, 4);
    at = end;
    if (id !== 'APIC' || mode & (version === 3 ? 0xc0 : 0x0c)) continue; // (a compressed or encrypted frame is left alone)
    if (mode & (version === 3 ? 0x20 : 0x40)) body = body.subarray(1); // a group byte
    if (version === 4 && mode & 0x01) body = body.subarray(4); // the length it had before unsynchronisation
    if (version === 4 && (mode & 0x02 || flags & 0x80)) body = unsync(body);
    const found = apic(body);
    if (found && (!best || (found.kind === 3 && best.kind !== 3))) best = found;
  }
  return best && { type: best.type, bytes: best.bytes };
}

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
async function mp4(blob) {
  let atom = { start: 0, end: blob.size };
  for (const name of ['moov', 'udta', 'meta', 'ilst', 'covr', 'data']) {
    // (meta holds four bytes of version and flags before its atoms, except in an old QuickTime file's)
    atom = await child(blob, atom.start + (name === 'ilst' ? 4 : 0), atom.end, name) || (name === 'ilst' && await child(blob, atom.start, atom.end, name));
    if (!atom) return null;
  }
  // (a data atom: a byte of version, three of flags, four of locale, then the picture; one cut short has half of it)
  return atom.whole && atom.end - atom.start > 8 && atom.end - atom.start <= MAX_TAG ? picture(await read(blob, atom.start + 8, atom.end)) : null;
}

// The file's cover as { type: 'image/jpeg', bytes }, or null.
export async function embeddedCover(blob) {
  try {
    const head = await read(blob, 0, 16);
    if (text(head, 0, 3) === 'ID3') return await id3(blob, head);
    if (text(head, 4, 4) === 'ftyp') return await mp4(blob);
  } catch { /* not what it says it is: no cover */ }
  return null;
}
