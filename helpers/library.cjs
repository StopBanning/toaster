// The library's side of the main process (main.js; G in the page, renderer/library-panel.js): the folder your music is in, the
// scan of it, and the only way a file in it is read. The page gets four narrow things through preload.js and nothing else: the
// folder (as main has it), choosing another (the system's dialog), the scan's result, and the bytes of one audio file. It never
// names a path of its own except the one it wants read, and every read is checked here: resolved (links followed) it must be
// inside the folder that was chosen, and an audio file. Anything else is refused.
//
// The scan runs in a worker thread (library-worker.cjs) so main's own loop is free: it walks the folder, reads each new or
// changed file's names, length and cover (renderer/audio-tags.js and embedded-cover.js, the page's own readers) and sends them
// back in batches; main makes one small picture of each album's cover (nativeImage, which only main has) and keeps the lot in
// userData as JSON (path, size, mtime, names, length, cover picture), so a scan again reads only what changed.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');

// The files the library lists (renderer/audio-tags.js has the same list for the page: a test keeps the two alike).
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'mp4', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'webm'];
const isAudioName = (name) => AUDIO_EXTENSIONS.includes(/\.([^./\\]+)$/.exec(String(name))?.[1].toLowerCase());

const MAX_READ = 512 * 1024 * 1024; // a file bigger than this isn't read into the page (a two-hour mix is about 300 MB)
const MAX_FILES = 200000, MAX_DEPTH = 16; // what one scan will list, and how deep it goes
const CACHE_VERSION = 1; // bumped when what the cache holds, or how the files are read into it, changes
const THUMB = 160; // a cover's picture in the cache: this many pixels on its long side

const refuse = (why) => Object.assign(new Error(`refused: ${why}`), { code: 'REFUSED' });

// ---------------------------------------------------------------- a path inside the folder

// target is root itself or something inside it (neither is a link: both are as realpath gave them)
function inside(root, target) {
  const rel = path.relative(root, target);
  return !!rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

// The real file a path the page named stands for, or a refusal: the path is relative (as the scan listed it, with / between
// its parts), has an audio extension, and what it resolves to, links followed, is a file inside the folder and also has one.
async function resolveInside(root, rel, maxBytes = MAX_READ) {
  if (typeof rel !== 'string' || !rel || rel.length > 4096 || rel.includes('\0')) throw refuse('not a path');
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || /^[\\/]/.test(rel)) throw refuse('not inside the folder');
  if (!isAudioName(rel)) throw refuse('not an audio file');
  let base, real;
  try { base = await fs.promises.realpath(root); } catch { throw refuse('the folder is not there'); }
  try { real = await fs.promises.realpath(path.resolve(base, ...rel.split('/'))); } catch { throw refuse('not there'); }
  if (!inside(base, real)) throw refuse('not inside the folder');
  if (!isAudioName(real)) throw refuse('not an audio file');
  const stat = await fs.promises.stat(real);
  if (!stat.isFile()) throw refuse('not a file');
  if (stat.size > maxBytes) throw refuse('too big');
  return { file: real, size: stat.size };
}

// One audio file's name and bytes, if resolveInside lets it be read.
async function readAudio(root, rel, maxBytes = MAX_READ) {
  const { file } = await resolveInside(root, rel, maxBytes);
  const buf = await fs.promises.readFile(file);
  // (the bytes alone, not the pool a small Buffer may share: what goes over to the page is the whole of its memory)
  return { name: path.basename(file), bytes: buf.byteOffset === 0 && buf.buffer.byteLength === buf.length ? new Uint8Array(buf.buffer) : Uint8Array.from(buf) };
}

// ---------------------------------------------------------------- the walk

// fn over items, n at a time
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) await fn(items[next++]); }));
}

// The audio files under root, as { rel, size, mtimeMs } (rel with / between its parts), in order of their paths. Hidden
// files and folders (a dot first: .DS_Store, ._song.mp3 on a card) and links of any kind are left out, so the walk can't be led
// out of the folder or round in circles; a folder it can't read is skipped.
async function walk(root, { onProgress, signal, limit = MAX_FILES } = {}) {
  const files = [], dirs = [{ dir: root, rel: '', depth: 0 }];
  while (dirs.length && files.length < limit) {
    if (signal?.aborted) throw new Error('stopped');
    const { dir, rel, depth } = dirs.pop();
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { continue; }
    const audio = [];
    for (const e of entries) {
      if (e.name.startsWith('.') || e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (depth < MAX_DEPTH) dirs.push({ dir: path.join(dir, e.name), rel: rel ? `${rel}/${e.name}` : e.name, depth: depth + 1 }); }
      else if (e.isFile() && isAudioName(e.name)) audio.push(e.name);
    }
    await pool(audio, 16, async (name) => {
      try {
        const st = await fs.promises.stat(path.join(dir, name));
        files.push({ rel: rel ? `${rel}/${name}` : name, size: st.size, mtimeMs: st.mtimeMs });
      } catch { /* gone since it was listed */ }
    });
    onProgress?.(files.length);
  }
  return files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}

// A file as the page's readers want one (a size and slice(start, end).arrayBuffer()), read from an open handle: the file is
// opened once, each read is a few bytes at an offset, and close() lets it go.
async function fileBlob(file) {
  const handle = await fs.promises.open(file, 'r');
  const { size } = await handle.stat();
  return {
    size,
    slice: (start, end) => ({
      arrayBuffer: async () => {
        const s = Math.max(0, Math.min(size, start)), n = Math.max(0, Math.min(size, end) - s), buf = Buffer.alloc(n);
        const { bytesRead } = n ? await handle.read(buf, 0, n, s) : { bytesRead: 0 };
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead);
      },
    }),
    close: () => handle.close().catch(() => {}),
  };
}

// ---------------------------------------------------------------- the scan

const coverId = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16);

// Walks root and reads what is new or changed since `known` (rel -> { size, mtimeMs }), telling post what it finds:
//   { type: 'progress', seen }                          while it lists the files
//   { type: 'plan', files, read, removed }              once it has: how many files, how many it will read
//   { type: 'records', list, read }                     the files it has read, in batches: { rel, size, mtimeMs, tags, cover }
//   { type: 'cover', id, bytes }                        each cover picture not in knownCovers, once (an album's tracks share one)
//   { type: 'done', files, read, removed }              and the paths that were known and are gone
// readTags(file) gives the names and length ({} for what it can't read), readCover(file) { bytes } or null; both take the
// path and a blob of it; the file is opened once for both, and closed.
async function scanFolder({ root, known = {}, knownCovers = [], readTags, readCover, post, signal, batch = 200 }) {
  const base = await fs.promises.realpath(root);
  const listing = await walk(base, { signal, onProgress: (seen) => post({ type: 'progress', seen }) });
  const present = new Set(listing.map((f) => f.rel));
  const removed = Object.keys(known).filter((rel) => !present.has(rel));
  const todo = listing.filter((f) => { const k = known[f.rel]; return !(k && k.size === f.size && k.mtimeMs === f.mtimeMs); });
  post({ type: 'plan', files: listing.length, read: todo.length, removed: removed.length });
  const sent = new Set(knownCovers), albumCover = new Map();
  let list = [], read = 0;
  const flush = () => { if (list.length) { post({ type: 'records', list, read }); list = []; } };
  await pool(todo, 8, async (f) => {
    if (signal?.aborted) throw new Error('stopped');
    let tags = {}, cover = null;
    const file = path.join(base, ...f.rel.split('/'));
    let blob = null;
    try {
      blob = await fileBlob(file);
      tags = (await readTags(blob)) || {};
      // an album's cover is read once: from the first of its tracks that has one (the rest are in the same folder, mostly)
      const album = `${tags.albumArtist || tags.artist || ''}\u0000${tags.album || f.rel.slice(0, f.rel.lastIndexOf('/'))}`;
      cover = albumCover.get(album) || null;
      if (!cover) {
        const found = await readCover(blob);
        if (found?.bytes?.length) {
          cover = coverId(found.bytes);
          albumCover.set(album, cover);
          if (!sent.has(cover)) { sent.add(cover); post({ type: 'cover', id: cover, bytes: found.bytes.slice() }); }
        }
      }
    } catch { /* a file that can't be read is listed by its name */ } finally { await blob?.close(); }
    list.push({ rel: f.rel, size: f.size, mtimeMs: f.mtimeMs, tags, cover });
    read++;
    if (list.length >= batch) flush();
  });
  flush();
  post({ type: 'done', files: listing.length, read, removed });
}

// ---------------------------------------------------------------- the cache

// What a track is to the page: its path, its names (as the file has them, nothing made up), its length in ms, and its cover.
function trackOf(rel, entry, usable) {
  const t = entry.tags || {};
  const out = { path: rel };
  for (const k of ['title', 'artist', 'albumArtist', 'album', 'track', 'disc']) if (t[k] !== undefined) out[k] = t[k];
  if (t.compilation) out.compilation = true;
  if (t.duration) out.ms = Math.round(t.duration * 1000);
  if (entry.cover && usable(entry.cover)) out.cover = entry.cover;
  return out;
}

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file); // (whole or not at all: a scan cut short never leaves half a cache)
}

// The cache as it was kept for this folder, or an empty one (another folder, another version, or damaged: start over).
function loadCache(file, root) {
  const c = readJson(file);
  const ok = c && c.version === CACHE_VERSION && c.root === root && c.files && typeof c.files === 'object' && c.covers && typeof c.covers === 'object';
  return ok ? c : { version: CACHE_VERSION, root, files: {}, covers: {} };
}

// What the page gets: every track, and the picture of each cover that is in use.
function resultOf(cache) {
  const usable = (id) => typeof cache.covers[id] === 'string';
  const tracks = Object.entries(cache.files).map(([rel, entry]) => trackOf(rel, entry, usable)).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const covers = {};
  for (const t of tracks) if (t.cover) covers[t.cover] = cache.covers[t.cover];
  return { tracks, covers };
}

// ---------------------------------------------------------------- what main builds on

// dir: userData (the folder you chose and the cache live there); music: the folder it starts with (the Music folder); testCopy: a
// copy run from source with a settings folder of its own, which never starts with one; forced: a folder a copy run from source
// was told to take as the one you chose (--library-folder), so the dialog is never needed; hidden: a copy with no window, where a
// dialog could not be answered; dialog.pick(from) asks you and gives a path or null; thumbnail(bytes) gives a Buffer, or null for
// a picture it can't read; rendererDir and workerFile are where the worker and the readers it loads are.
function createLibrary({ dir, music = null, testCopy = false, forced = '', hidden = false, dialog = null, thumbnail = () => null, rendererDir = '', workerFile = path.join(__dirname, 'library-worker.cjs'), home = '' } = {}) {
  const chosenFile = path.join(dir, 'library.json'), cacheFile = path.join(dir, 'library-cache.json');
  let running = null, worker = null;
  const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
  const label = (p) => (home && (p === home || p.startsWith(home + path.sep)) ? `~${p.slice(home.length).split(path.sep).join('/')}` : p);

  // The folder in force: the one chosen, else (on a copy not run from source with its own settings) the Music folder.
  function folder() {
    const chosen = forced && isDir(forced) ? forced : readJson(chosenFile)?.folder;
    if (typeof chosen === 'string' && isDir(chosen)) return { path: chosen, label: label(chosen), chosen: true };
    if (music && !testCopy && isDir(music)) return { path: music, label: label(music), chosen: false };
    return null;
  }

  async function choose() {
    let picked = forced || null;
    if (!picked) {
      if (hidden || !dialog) return null;
      picked = await dialog.pick(folder()?.path || music || undefined);
    }
    if (!picked || !isDir(picked)) return null;
    const real = await fs.promises.realpath(picked);
    stop();
    fs.mkdirSync(dir, { recursive: true });
    writeJson(chosenFile, { folder: real });
    return { path: real, label: label(real), chosen: true };
  }

  const state = () => { const f = folder(); return f && { f, cache: loadCache(cacheFile, f.path) }; };

  // what was kept of the last scan, at once
  function cached() {
    const s = state();
    return s ? { folder: s.f.label, ...resultOf(s.cache) } : null;
  }

  function stop() {
    worker?.terminate();
    worker = null;
    running = null;
  }

  // Scans the folder in a worker, reading only what changed, and gives { folder, tracks, covers } (progress({ seen, files, read })
  // as it goes). A scan asked for while one runs is that one.
  function scan(progress = () => {}) {
    if (running) return running;
    const s = state();
    if (!s) return Promise.reject(new Error('no folder to scan'));
    const { f, cache } = s;
    const known = Object.fromEntries(Object.entries(cache.files).map(([rel, e]) => [rel, { size: e.size, mtimeMs: e.mtimeMs }]));
    const t0 = Date.now();
    const done = new Promise((resolve, reject) => {
      const w = worker = new Worker(workerFile.replace('app.asar', 'app.asar.unpacked'), { workerData: { root: f.path, known, knownCovers: Object.keys(cache.covers), rendererDir } });
      let plan = { files: 0, read: 0 }, got = 0, last = 0, finished = false;
      const fail = (err) => { if (finished) return; finished = true; if (worker === w) worker = null; w.terminate(); reject(err); };
      w.on('error', fail);
      w.on('exit', (code) => { if (!finished) fail(new Error(code ? `the scan stopped (${code})` : 'the scan stopped')); });
      w.on('message', (m) => {
        try {
          if (m.type === 'progress' || m.type === 'plan' || m.type === 'records') {
            if (m.type === 'plan') plan = m;
            if (m.type === 'records') got = m.read;
            const now = Date.now();
            if (m.type !== 'progress' || now - last > 150) { last = now; progress({ seen: m.seen ?? plan.files, files: plan.files, read: got, reading: plan.read }); }
          }
          if (m.type === 'records') for (const r of m.list) cache.files[r.rel] = { size: r.size, mtimeMs: r.mtimeMs, tags: r.tags, cover: r.cover };
          else if (m.type === 'cover') {
            const jpeg = thumbnail(m.bytes);
            cache.covers[m.id] = jpeg ? Buffer.from(jpeg).toString('base64') : null;
          } else if (m.type === 'done') {
            finished = true;
            for (const rel of m.removed) delete cache.files[rel];
            const used = new Set(Object.values(cache.files).map((e) => e.cover));
            for (const id of Object.keys(cache.covers)) if (!used.has(id)) delete cache.covers[id];
            writeJson(cacheFile, cache);
            if (worker === w) worker = null;
            w.terminate();
            resolve({ folder: f.label, ...resultOf(cache), stats: { files: m.files, read: m.read, removed: m.removed.length, ms: Date.now() - t0 } });
          } else if (m.type === 'error') fail(new Error(m.message));
        } catch (err) { fail(err); }
      });
    });
    running = done;
    const clear = () => { if (running === done) running = null; };
    done.then(clear, clear);
    return done;
  }

  // one audio file of the folder in force: { name, bytes }
  async function read(rel) {
    const f = folder();
    if (!f) throw refuse('no folder');
    return readAudio(f.path, rel);
  }

  return { folder, choose, cached, scan, read, stop };
}

module.exports = { AUDIO_EXTENSIONS, isAudioName, MAX_READ, THUMB, inside, resolveInside, readAudio, walk, fileBlob, scanFolder, coverId, loadCache, resultOf, createLibrary };
