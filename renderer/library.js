// The library's logic, as plain functions (renderer/library-panel.js draws it, app.js plays it): the tracks the scan found,
// grouped into albums (by album artist, else artist, and album; then disc and track number), the queue an album from a track on
// is, the scenes you save (a setup in the shape of PRESETS) and the stations you've played, the cover as characters (the ramp
// golden draws its covers with), and where the cursor goes on the keys. No page in it, so tools/library.test.mjs runs it all.
// This file is fetched with the panel, when the library is first opened; what the page has to have from its start (the queue, the
// scenes, the stations) is library-core.js, which this file re-exports, so all of it is here to read and to test.
export {
  REPEATS, SETUP_KEYS, deleteScene, defaultSceneName, nextRepeat, noteRecent, noteStation, queueLine, queueNext, queueOf, queuePrevious, queueText, readRecent, readRepeat, readResume, readScenes,
  readStations, renameScene, saveScene, sceneIsOn, setupOf, shuffled, trackLabel, withShuffle,
} from './library-core.js';

// ---------------------------------------------------------------- names

const folded = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

// A file with no tags is named by its file: "01 - Plague.mp3" is track 1, Plague (a number, then a space, dot, dash or
// underscore, then the name)
export function nameParts(file) {
  const stem = String(file).replace(/\.[^./\\]+$/, '');
  const m = /^(\d{1,3})\s*[-._ ]+\s*((?=.*[\p{L}\p{N}]).+)$/u.exec(stem);
  return m ? { title: m[2].trim(), track: +m[1] } : { title: stem.trim(), track: 0 };
}

// One track as the page has it: the scan's record (path, and the names the file has) with what is missing filled in from where it
// is: the title from its file's name, the album from its folder's, the artist from the folder above that (artist/album/file).
export function makeTrack(record) {
  const parts = String(record.path).split('/'), file = parts.pop(), named = nameParts(file);
  return {
    id: record.path, path: record.path, folder: parts.join('/'),
    title: record.title || named.title || file,
    artist: record.artist || (parts.length >= 2 ? parts[parts.length - 2] : ''),
    albumArtist: record.albumArtist || (record.compilation ? 'Various Artists' : ''),
    album: record.album || (parts.length ? parts[parts.length - 1] : ''),
    n: record.track || named.track || 0, disc: record.disc || 0, ms: record.ms || 0, cover: record.cover || null,
  };
}

// 3:12, or 1:14:12 from an hour; '' where the length isn't known
export function fmtDuration(ms) {
  if (!(ms > 0)) return '';
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), two = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

// ---------------------------------------------------------------- albums

// Albums from tracks (as makeTrack made them). An album with an album artist is that artist's wherever its files are (a folder to a
// disc); one without is told from another of the same name by its folder (two artists' "Greatest Hits"). Its tracks go by disc, then
// track number (a file with none, by its name, after the numbered ones). Its artist is the album artist, else the one artist all
// its tracks have, else Various Artists. Each album's cover is the first its tracks have. Alphabetical by artist (without a leading
// "the", and those with none last), then album.
export function groupAlbums(tracks) {
  const groups = new Map();
  for (const t of tracks) {
    const key = t.albumArtist ? `a\u0000${folded(t.albumArtist)}\u0000${folded(t.album)}` : `f\u0000${t.folder}\u0000${folded(t.album)}`;
    if (!groups.has(key)) groups.set(key, { id: key, album: t.album || 'unknown album', albumArtist: t.albumArtist, tracks: [] });
    groups.get(key).tracks.push(t);
  }
  const albums = [...groups.values()].map((g) => {
    g.tracks.sort((a, b) => (a.disc || 1) - (b.disc || 1) || (a.n || Infinity) - (b.n || Infinity) || natural(a.title, b.title) || natural(a.path, b.path));
    const artists = [...new Set(g.tracks.map((t) => folded(t.artist)).filter(Boolean))];
    const artist = g.albumArtist || (artists.length === 1 ? g.tracks.find((t) => t.artist).artist : artists.length ? 'Various Artists' : '');
    const known = g.tracks.filter((t) => t.ms);
    return { id: g.id, album: g.album, artist, tracks: g.tracks, ms: known.reduce((n, t) => n + t.ms, 0), cover: g.tracks.find((t) => t.cover)?.cover || null };
  });
  const sortKey = (a) => (a.artist ? folded(a.artist).replace(/^the /, '') : '\uffff'); // (an unknown artist's albums go last)
  return albums.sort((a, b) => natural(sortKey(a), sortKey(b)) || natural(folded(a.album), folded(b.album)));
}

// "crystal castles · 12 tracks · 39:36" (the length where it is known; a track's, for an album of one)
export function albumLine(album) {
  const n = album.tracks.length, total = fmtDuration(album.ms);
  return [album.artist, `${n} ${n === 1 ? 'track' : 'tracks'}`, total].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- scenes

// A scene's picture, from what it shows: the scene itself on the scenes (renderer/thumbs, as the picker has them), a background's own,
// none for the classics that have no picture
const BG_PICTURES = ['chrome', 'cuts', 'fire', 'off', 'rain', 'spectrogram', 'worlds'];
export function scenePicture(settings) {
  if (settings.visual === 'scenery') return `thumbs/scene-${settings.sceneryScene || 'auto'}.webp`;
  if (settings.visual === 'spaghetti') return 'thumbs/spaghetti-snakes.webp';
  return BG_PICTURES.includes(settings.visual) ? `thumbs/bg-${settings.visual}.webp` : null;
}

// ---------------------------------------------------------------- the radio

// "stream.radioparadise.com" and "/aac-128", as the radio's label has them (host and path)
export function stationParts(url) {
  try { const u = new URL(url); return { host: u.host.replace(/^www\./, ''), path: u.pathname.replace(/\/$/, '') + (u.search || '') }; } catch { return { host: String(url), path: '' }; }
}
// "5 min ago", "3 h ago", "2 d ago"; '' where it isn't known
export function agoText(at, now = Date.now()) {
  if (!at) return '';
  const m = Math.max(0, Math.round((now - at) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

// ---------------------------------------------------------------- the cover, in characters

// golden's ramp, from nothing to the densest glyph
export const GLYPHS = ' .:-=+*#%@';
// The picture's RGBA pixels (cols x rows of them) as rows of those characters: each cell's light picks its glyph, gently lifted (the
// power of 0.9, as the prototype drew it), and what is see-through counts as dark.
export function glyphRows(rgba, cols, rows, gamma = 0.9) {
  const out = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4, light = ((0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255) * (rgba[i + 3] / 255);
      line += GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(Math.max(0, Math.min(1, light)) ** gamma * GLYPHS.length))];
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------- find

// Text as find compares it, lower case and without accents (é as e, ß as ss, ﬁ as fi), so "beyonce" finds Beyoncé: `text`, and for each of its
// characters the index in the original of the character it came from (`at`), to mark what was found in the original
export function findForm(s) {
  const src = String(s ?? '');
  let text = '';
  const at = [];
  for (let i = 0; i < src.length;) {
    const ch = String.fromCodePoint(src.codePointAt(i));
    const f = ch.normalize('NFKD').toUpperCase().toLowerCase().normalize('NFKD').replace(/\p{M}/gu, ''); // (by way of upper case: ß is SS, then ss)
    text += f;
    for (let k = 0; k < f.length; k++) at.push(i);
    i += ch.length;
  }
  return { text, at };
}
// the words of what is typed, as find compares them
export const findWords = (query) => findForm(query).text.split(/\s+/).filter(Boolean);

// Where the words are in a piece of text: the first place each is, as [start, end) in the original, sorted, the ones that touch joined
export function findMarks(text, words) {
  const { text: f, at } = findForm(text), src = String(text ?? ''), out = [];
  for (const w of words) {
    const i = f.indexOf(w);
    if (i < 0) continue;
    const last = at[i + w.length - 1];
    let k = i + w.length;
    while (k < at.length && at[k] === last) k++;
    out.push([at[i], k < at.length ? at[k] : src.length]);
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const m of out) { const top = merged[merged.length - 1]; if (top && m[0] <= top[1]) top[1] = Math.max(top[1], m[1]); else merged.push([...m]); }
  return merged;
}

// What find lists for what is typed: the albums whose name or artist has every word (as the list has them, folded), then the tracks whose
// title, artist or album has every word, the ones with every word in their title first, each in its album (a play from it needs that). At
// most `max` rows, and how many there are in all. Each track's words are kept, so typing on through thousands of them is quick.
const hayOf = new WeakMap();
const hay = (key, ...fields) => { let h = hayOf.get(key); if (h === undefined) { h = findForm(fields.join('\n')).text; hayOf.set(key, h); } return h; };
export function findRows(albums, query, max = 300) {
  const words = findWords(query);
  if (!words.length) return { rows: [], total: 0 };
  const every = (h) => words.every((w) => h.includes(w)), found = [], titled = [], rest = [];
  for (const album of albums) {
    if (every(hay(album, album.album, album.artist))) found.push({ kind: 'album', album, found: true });
    album.tracks.forEach((track, index) => {
      if (!every(hay(track, track.title, track.artist, album.album, album.artist))) return;
      (every(findForm(track.title).text) ? titled : rest).push({ kind: 'track', album, track, index, found: true });
    });
  }
  const all = [...found, ...titled, ...rest];
  return { rows: all.slice(0, max), total: all.length };
}

// ---------------------------------------------------------------- the cursor

export const SECTIONS = [['music', 'your music'], ['radio', 'radio'], ['scenes', 'scenes']];
export const nextSection = (id, step = 1) => SECTIONS[(SECTIONS.findIndex((s) => s[0] === id) + step + SECTIONS.length) % SECTIONS.length][0];

// What the your music section lists, top to bottom: the open album's tracks, then every other album, folded
export function musicRows(albums, openId) {
  const open = albums.find((a) => a.id === openId);
  return [
    ...(open ? open.tracks.map((track, index) => ({ kind: 'track', album: open, track, index })) : []),
    ...albums.filter((a) => a !== open).map((album) => ({ kind: 'album', album })),
  ];
}
export const moveCursor = (count, cursor, delta) => (count ? Math.max(0, Math.min(count - 1, cursor + delta)) : 0);
// → on a folded album opens it (the one that was open folds), the cursor on its first track
export function unfold(albums, rows, cursor) {
  const row = rows[cursor];
  return row?.kind === 'album' ? { openId: row.album.id, cursor: 0 } : null;
}
// ← on a track folds its album, the cursor on the album's row among the others
export function fold(albums, rows, cursor) {
  const row = rows[cursor];
  if (row?.kind !== 'track') return null;
  return { openId: null, cursor: Math.max(0, musicRows(albums, null).findIndex((r) => r.album === row.album)) };
}
// where the cursor is after the albums have changed (a scan): on the same row if there is one, else as near as it gets
export function keepCursor(oldRow, rows, cursor) {
  if (oldRow) {
    const i = rows.findIndex((r) => r.kind === oldRow.kind && r.album.id === oldRow.album.id && (r.kind === 'album' || r.track.id === oldRow.track.id));
    if (i >= 0) return i;
  }
  return moveCursor(rows.length, cursor, 0);
}
