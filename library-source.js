// Where the library's tracks come from, for the panel (library-panel.js): in the desktop app, main (the folder you chose, its scan
// and the read of one file, through window.nc: see helpers/library.cjs); in a browser that has showDirectoryPicker (Chromium), the
// folder you pick, read here with the same readers (audio-tags.js, embedded-cover.js). Both give the panel the same things:
//   cached()        what was kept of the last scan at once (desktop only), as { folder, tracks, covers } or null
//   scan(progress)  { folder, tracks, covers }: a track is { path, title, artist, albumArtist, album, track, disc, compilation, ms, cover }
//                   (only the names the file has), covers are each cover's small picture as base64 JPEG by id; progress({ seen, files, read })
//   choose()        the system's folder dialog or the browser's picker: the folder's label, or null if it was cancelled
//   file(track)     the track as a File, for the file source to play
//   folder          the folder's label ('' before there is one); kind: 'desktop' or 'web'
import { embeddedCover } from './embedded-cover.js';
import { isAudioName, readTags } from './audio-tags.js';

const TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm' };
export const typeOf = (name) => TYPES[/\.([^./\\]+)$/.exec(String(name))?.[1].toLowerCase()] || '';
const THUMB = 160; // a cover's small picture: this many pixels on its long side (main makes the same size)

// ---------------------------------------------------------------- the desktop app

export function desktopSource(nc) {
  let progress = () => {};
  nc.onLibraryProgress?.((p) => progress(p));
  const source = {
    kind: 'desktop', folder: '',
    async start() { const f = await nc.libraryFolder(); source.folder = f?.label || ''; return !!f; },
    async cached() { const r = await nc.libraryCached(); if (r) source.folder = r.folder; return r; },
    async scan(onProgress) { progress = onProgress || (() => {}); const r = await nc.libraryScan(); source.folder = r.folder; return r; },
    async choose() { const f = await nc.libraryChoose(); if (f) source.folder = f.label; return f ? f.label : null; },
    async file(track) { const { name, bytes } = await nc.libraryRead(track.path); return new File([bytes], name, { type: typeOf(name) }); },
  };
  return source;
}

// ---------------------------------------------------------------- a folder in a browser

// A cover picture's small copy as base64 JPEG, through a canvas (null for one the browser can't draw)
async function thumbnailOf(bytes, win) {
  try {
    const bitmap = await win.createImageBitmap(new win.Blob([bytes]));
    const k = Math.min(1, THUMB / Math.max(bitmap.width, bitmap.height)), canvas = win.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * k));
    canvas.height = Math.max(1, Math.round(bitmap.height * k));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
    const out = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000));
    return win.btoa(s);
  } catch { return null; }
}

// the same record main's scan keeps for a file (helpers/library.cjs trackOf), from the names and cover found here
const recordOf = (path, tags, cover) => {
  const out = { path };
  for (const k of ['title', 'artist', 'albumArtist', 'album', 'track', 'disc']) if (tags[k] !== undefined) out[k] = tags[k];
  if (tags.compilation) out.compilation = true;
  if (tags.duration) out.ms = Math.round(tags.duration * 1000);
  if (cover) out.cover = cover;
  return out;
};

// The audio files under a directory handle, read for their names and covers, a few at a time with the page's frames let through
// between (nothing is kept: a browser has no cache to put it in). thumbnail(bytes) is the page's own by default.
export async function scanHandle(root, { progress = () => {}, thumbnail, hash, frame = () => new Promise((r) => setTimeout(r, 0)), limit = 200000 } = {}) {
  const tracks = [], covers = {}, handles = new Map(), albumCover = new Map();
  let seen = 0, lastFrame = Date.now();
  async function walk(dir, prefix, depth) {
    const entries = [];
    for await (const [name, handle] of dir.entries()) entries.push([name, handle]);
    entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    for (const [name, handle] of entries) {
      if (name.startsWith('.') || tracks.length >= limit) continue;
      if (handle.kind === 'directory') { if (depth < 16) await walk(handle, `${prefix}${name}/`, depth + 1); continue; }
      if (handle.kind !== 'file' || !isAudioName(name)) continue;
      const path = prefix + name;
      let tags = {}, cover = null;
      try {
        const file = await handle.getFile();
        tags = await readTags(file);
        const album = `${tags.albumArtist || tags.artist || ''}\u0000${tags.album || prefix}`;
        cover = albumCover.get(album) || null;
        if (!cover) {
          const found = await embeddedCover(file);
          if (found) {
            const id = await hash(found.bytes), small = id in covers ? covers[id] : await thumbnail(found.bytes);
            if (small) { covers[id] = small; cover = id; albumCover.set(album, id); }
          }
        }
      } catch { /* listed by its name */ }
      handles.set(path, handle);
      tracks.push(recordOf(path, tags, cover));
      seen++;
      if (Date.now() - lastFrame > 30) { lastFrame = Date.now(); progress({ seen, files: seen, read: seen }); await frame(); }
    }
  }
  await walk(root, '', 0);
  progress({ seen, files: seen, read: seen });
  return { tracks, covers, handles };
}

export function webSource(win) {
  let handle = null, handles = new Map(), result = null;
  const hash = async (bytes) => [...new Uint8Array(await win.crypto.subtle.digest('SHA-1', bytes))].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const source = {
    kind: 'web', folder: '', get supported() { return typeof win.showDirectoryPicker === 'function'; }, // (asked when it matters: a picker can turn up after the page loads)
    async start() { return !!handle; },
    async cached() { return result; },
    async scan(onProgress) {
      if (!handle) throw new Error('no folder to scan');
      const r = await scanHandle(handle, { progress: onProgress, thumbnail: (b) => thumbnailOf(b, win), hash, frame: () => new Promise((resolve) => win.requestAnimationFrame(() => resolve())) });
      handles = r.handles;
      result = { folder: handle.name, tracks: r.tracks, covers: r.covers };
      return result;
    },
    async choose() {
      const picked = await win.showDirectoryPicker({ id: 'toaster-music', mode: 'read', startIn: 'music' }).catch((err) => { if (err?.name === 'AbortError') return null; throw err; });
      if (!picked) return null;
      handle = picked;
      source.folder = picked.name;
      result = null;
      return picked.name;
    },
    async file(track) {
      const h = handles.get(track.path);
      if (!h) throw new Error('that file is not in the folder any more');
      return h.getFile();
    },
  };
  return source;
}

// The way in this page has: the app's (when main gives the library calls), else a browser's folder picker, else none
export function librarySource(win) {
  if (typeof win.nc?.libraryScan === 'function') return desktopSource(win.nc);
  return webSource(win);
}
