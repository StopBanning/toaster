export { SPOTIFY_ICON, logoTone } from './spotify-brand.js';
// The library's logic, as plain functions (renderer/library-panel.js draws it, app.js plays it): the tracks the scan found,
// grouped into albums (by album artist, else artist, and album; then disc and track number), the queue an album from a track on
// is, the scenes you save (a setup in the shape of PRESETS) and the stations you've played, the cover as characters (the ramp
// golden draws its covers with), and where the cursor goes on the keys. No page in it, so tools/library.test.mjs runs it all.
// This file is fetched with the panel, when the library is first opened; what the page has to have from its start (the queue, the
// scenes, the stations, the pasted Spotify links) is library-core.js, which this file re-exports, so all of it is here to read and to test.
export {
  REPEATS, SETUP_KEYS, defaultSceneName, deleteScene, nameLink, nextRepeat, noteLink, noteRadioCover, noteRecent, noteStation, queueLine, queueNext,
  queueOf, queuePrevious, queueSkip, queueText, readLinks, readRecent, readRepeat, readResume, readScenes, readStations, renameScene, saveScene,
  sceneForLoad, sceneIsOn, setupOf, shuffled, trackLabel, withShuffle,
} from './library-core.js';

// ---------------------------------------------------------------- names

const folded = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
// (one collator for every compare: localeCompare with options makes one each time, 1.1 s against 0.18 s to sort 10,000 albums)
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const natural = (a, b) => collator.compare(String(a), String(b));

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

// The folder as the meta line has room for it: all of it if it is short, else its last folders (…/golden-library-test/library).
// Main names a folder in your home ~/Music, with /, and any other one the system's way (D:\Music\Albums on Windows), so it is
// cut at its own separator.
export function folderLabel(label, max = 30) {
  const text = String(label || '');
  if (text.length <= max) return text;
  const sep = text.includes('/') || !text.includes('\\') ? '/' : '\\', parts = text.split(sep);
  let out = parts.pop();
  while (parts.length && `…${sep}${parts[parts.length - 1]}${sep}${out}`.length <= max) out = `${parts.pop()}${sep}${out}`;
  return `…${sep}${out}`;
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
// (Date.now(): "3 days ago", wall time)
export function agoText(at, now = Date.now()) {
  if (!at) return '';
  const m = Math.max(0, Math.round((now - at) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

// ---------------------------------------------------------------- spotify

// The spotify section's logic, as plain functions (library-panel.js draws it and asks for what it shows; helpers/spotify.cjs, in main, is
// what answers): the pasted link, its row, the rows of the listener's own library (playlists, saved albums, liked songs, the open one's
// songs), the request Enter on a row sends, where the cursor stays when the lists change under it, and the words for connecting. No page
// and no network in it, so tools/spotify-section.test.mjs runs it all on made-up lists.

export const SPOTIFY_NOT_A_LINK = 'That isn\'t a Spotify link to a song, an artist, an album or a playlist. In Spotify choose Share, then Copy link (or Copy Spotify URI), and paste that.';
const SPOTIFY_LINK = /^spotify:(track|album|playlist|artist):([A-Za-z0-9]{22})$/;

// What was pasted as { kind, id, uri }, or null: an open.spotify.com link to a track, an album or a playlist (with or without https://, a
// locale's /intl-de/ before the kind, a slash after the id, a ?si=... or #... after that) or the same as a spotify: address. The same rules
// as helpers/spotify.cjs's parseLink, which main applies again to whatever the page sends: this is for the browser, which has no main, and for
// the row's names.
export function parseLink(text) {
  const s = typeof text === 'string' ? text.trim() : '';
  let m = SPOTIFY_LINK.exec(s);
  if (!m && s && s.length < 600) {
    let url = null;
    try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`); } catch { /* not a link */ }
    if (url && (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname === 'open.spotify.com' && !url.username && !url.password && !url.port) {
      m = /^\/(?:intl-[a-z]{2}(?:-[a-z]{2,4})?\/)?(track|album|playlist|artist)\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
    }
  }
  return m ? { kind: m[1], id: m[2], uri: `spotify:${m[1]}:${m[2]}` } : null;
}

// A pasted link as its row has it: what the player named it once it started (the song it began on: a track's own name, an album's or a
// playlist's first), else its kind and id; and the kind and how long ago, as the radio's rows have theirs.
export function linkParts(link, now = Date.now()) {
  const m = SPOTIFY_LINK.exec(link.uri) || [], kind = m[1] || 'link', ago = agoText(link.at, now);
  return link.title ? { kind, name: link.title, by: link.artist || '', named: true, note: [kind, ago].filter(Boolean).join(' · ') } : { kind, name: kind, by: m[2] || '', named: false, note: ago };
}

// The lists come 50 at a time (the Web API's page: helpers/spotify.cjs has the same number), so the next page starts 50 on.
export const SPOTIFY_PAGE = 50;
// A page of a list added to what the page has of it: offset 0 starts it again, a later one adds on (a collection that comes twice, as a
// list shifting between two calls can make it, is kept once). { items, total, more, next } (next: where the next page starts)
export function addPage(list, page, offset = 0) {
  const have = offset ? list?.items || [] : [], seen = new Set(have.filter((i) => i.kind).map((i) => i.uri));
  const items = [...have, ...page.items.filter((i) => !(i.kind && seen.has(i.uri)))];
  return { items, total: page.total || 0, more: !!page.more, next: offset + SPOTIFY_PAGE };
}

// The liked songs, which have no playlist behind them: a collection of their own, with a place in the list like the others
export const SPOTIFY_LIKED = { kind: 'liked', id: 'liked', name: 'liked songs', by: '', count: 0, cover: '', uri: '' };
export const collKey = (c) => `${c.kind}:${c.id}`;

// What the section lists, top to bottom: the open collection's songs (as an open album's are first in your music: the head is the collection,
// its row is not in the list again), the field for a link and the links pasted (latest first); then, in the app, either the field for a Client ID
// (not connected) or the playlists, the saved albums and the liked songs, folded, a "more" row where a list goes on, and last the row that
// disconnects. A browser has no sign-in, so it stops after the links. `group` says which part of the section a row is in (the panel puts a line
// of words before the first row of each part).
//   m: { links, linksAll (the pasted links unfolded), app (the page can sign in), connected, lists: { playlists, albums, liked }, open (a collection's key), tracks: { key: list } }
export const LINKS_SHOWN = 4; // (the pasted links listed before the rest fold under a "more" row)
export function spotifyRows(m) {
  const rows = [], lists = m.lists || {}, liked = lists.liked;
  const likedColl = { ...SPOTIFY_LIKED, count: liked?.total || 0 };
  const shown = m.app && m.connected;
  const open = shown && m.open ? [...(lists.playlists?.items || []), ...(lists.albums?.items || []), likedColl].find((c) => collKey(c) === m.open) : null;
  if (open) {
    const list = open.kind === 'liked' ? liked : m.tracks?.[collKey(open)];
    rows.push(...(list?.items || []).map((track, index) => ({ kind: 'strack', group: 'songs', coll: open, track, index })));
    if (list?.more) rows.push({ kind: 'more', group: 'songs', list: 'tracks', coll: open });
  }
  rows.push({ kind: 'link', group: 'link' });
  // (the links pasted fold after the latest few, so the playlists and albums below stay in sight; a "more" row opens the rest. One
  // past the fold is listed rather than folded: a row that says "1 more" is no shorter than the link itself. Colin, Nov 7)
  const links = m.links || [], folded = !m.linksAll && links.length > LINKS_SHOWN + 1;
  (folded ? links.slice(0, LINKS_SHOWN) : links).forEach((link, n) => rows.push({ kind: 'saved', group: 'links', link, n }));
  if (folded) rows.push({ kind: 'more', group: 'links', list: 'links', shown: LINKS_SHOWN, total: links.length });
  if (!m.app) return rows;
  if (!m.connected) return [...rows, { kind: 'client', group: 'connect' }];
  for (const name of ['playlists', 'albums']) {
    const list = lists[name];
    for (const coll of list?.items || []) if (coll !== open) rows.push({ kind: 'coll', group: name, coll });
    if (list?.more) rows.push({ kind: 'more', group: name, list: name });
  }
  if ((!liked || liked.total > 0) && open?.kind !== 'liked') rows.push({ kind: 'coll', group: 'liked', coll: likedColl });
  rows.push({ kind: 'disconnect', group: 'account' });
  return rows;
}

// A row as the cursor knows it across a change in the lists: the same row stays under it wherever it has moved to
export function spotifyKey(row) {
  if (!row) return '';
  if (row.kind === 'saved') return `saved:${row.link.uri}`;
  if (row.kind === 'coll') return `coll:${collKey(row.coll)}`;
  if (row.kind === 'strack') return `strack:${collKey(row.coll)}:${row.index}:${row.track.id}`;
  if (row.kind === 'more') return `more:${row.list}:${row.coll ? collKey(row.coll) : ''}`;
  return row.kind;
}
// where the cursor is once the rows have changed: on the row it was on if that is still there, else as near as it gets
export function spotifyAt(rows, key, cursor) {
  const i = key ? rows.findIndex((r) => spotifyKey(r) === key) : -1;
  return i >= 0 ? i : moveCursor(rows.length, cursor, 0);
}

// → on a collection opens it (the one that was open folds, and the cursor goes to the first of its songs, at the top); ← on one of its songs
// folds it, the cursor on its row among the others. Each says which collection is open after it (null: none) and, for ←, the row the
// cursor goes to; null where the key means nothing.
export function spotifyUnfold(rows, cursor) {
  const row = rows[cursor];
  return row?.kind === 'coll' ? { open: collKey(row.coll) } : null;
}
export function spotifyFold(rows, cursor) {
  const row = rows[cursor];
  return row?.kind === 'strack' || (row?.kind === 'more' && row.coll) ? { open: null, at: `coll:${collKey(row.coll)}` } : null;
}

// What Enter on a row asks spotify:play for, or null where there is nothing to play (the liked songs not in yet): a playlist or an album
// from its start; one of its songs from that song, by its address, in its playlist or album; the liked songs, which have no playlist
// behind them, as a list of up to a hundred songs from that one on. `liked` is the list the page has of them.
export function spotifyPlay(row, liked) {
  const from = (n) => (liked?.items || []).slice(n, n + 100).map((t) => t.uri);
  if (row?.kind === 'coll') {
    if (row.coll.kind === 'liked') return from(0).length ? { tracks: from(0), index: 0 } : null;
    return { context: row.coll.uri };
  }
  if (row?.kind === 'strack') return row.coll.kind === 'liked' ? { tracks: from(row.index), index: 0 } : { context: row.coll.uri, track: row.track.uri };
  return null;
}

// "by · 12 tracks" for the head over an open collection (the liked songs: "1,234 songs")
export function collLine(coll) {
  const n = Number(coll.count || 0).toLocaleString('en-US');
  return coll.kind === 'liked' ? `${n} ${coll.count === 1 ? 'song' : 'songs'}` : [coll.by, `${n} ${coll.count === 1 ? 'track' : 'tracks'}`].filter(Boolean).join(' · ');
}

// The words for connecting, in the order they are done. The redirect has to be exactly this (helpers/spotify.cjs listens on that port).
export const SPOTIFY_REDIRECT = 'http://127.0.0.1:43821/callback';
export const SPOTIFY_INTRO = 'your playlists, saved albums and liked songs, with covers. It takes a free developer app of your own (five minutes, once) and Spotify Premium.';
export const SPOTIFY_STEPS = [
  'go to developer.spotify.com/dashboard and create an app (any name will do)',
  'tick Web API when it asks what the app will use',
  `add the redirect address ${SPOTIFY_REDIRECT}`,
  'save, open the app\'s settings and copy its Client ID',
  'paste it below and press enter: Spotify\'s page opens to ask you to agree',
];

// Spotify's logo as the one path of its icon (a circle with the three arcs cut out of it), in a 24 by 24 box.

// Spotify's guidelines have its logo white or black (or its green), never another colour, so the logo is whichever of white and black reads
// against the page's background, as the CSS gives it (#rrggbb, #rgb or rgb(r, g, b)): 'light' for a light background (the black logo), else 'dark'.


// What went wrong as main said it (an error from the bridge starts with where it came from, which a listener has no use for)
export const plainError = (err) => String(err?.message || err).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');

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

// The cover in characters, read better (Colin, Nov 6: "improve the full ascii for the album art"). The picture comes in at twice the grid
// (2cols x 2rows pixels): each cell's light is the mean of its four, stretched to the cover's own range (its darkest and lightest 1.5% cut,
// so a dim or washed-out cover still uses the whole ramp; a flat one is left alone), and its detail lifted against a blur of itself. On a big
// grid the strongest edges are drawn as their direction, | / _ \, the way a hand-drawn ASCII picture outlines a face or a logo (a small one
// keeps the ramp only: at thirty columns the outlines are noise).
export function coverGlyphs(rgba2, cols, rows, { edges = rows >= 48, gamma = 0.9, lift = 0.6 } = {}) {
  if (!cols || !rows) return [];
  const W2 = cols * 2, H2 = rows * 2, n2 = W2 * H2;
  const L2 = new Float32Array(n2);
  for (let i = 0; i < n2; i++) L2[i] = ((0.2126 * rgba2[i * 4] + 0.7152 * rgba2[i * 4 + 1] + 0.0722 * rgba2[i * 4 + 2]) / 255) * (rgba2[i * 4 + 3] / 255);
  const sorted = Float32Array.from(L2).sort();
  const lo = sorted[Math.floor(0.015 * (n2 - 1))], hi = sorted[Math.ceil(0.985 * (n2 - 1))];
  if (hi - lo > 0.08) for (let i = 0; i < n2; i++) L2[i] = Math.min(1, Math.max(0, (L2[i] - lo) / (hi - lo)));
  const n = cols * rows, L = new Float32Array(n);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = 2 * y * W2 + 2 * x;
    L[y * cols + x] = (L2[a] + L2[a + 1] + L2[a + W2] + L2[a + W2 + 1]) / 4;
  }
  if (lift) {
    const B = boxBlur(boxBlur(L, cols, rows, 2), cols, rows, 2); // (two box blurs: about a gaussian two cells wide)
    for (let i = 0; i < n; i++) L[i] = Math.min(1, Math.max(0, L[i] + lift * (L[i] - B[i])));
  }
  const cells = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
    GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(L[y * cols + x] ** gamma * GLYPHS.length))]));
  if (edges) {
    // Sobel on the twice-size light, summed into each cell; a cell is 0.6 as wide as it is tall, so a step across counts 0.6 as far
    const gx = new Float32Array(n), gy = new Float32Array(n);
    const at = (x, y) => L2[Math.min(H2 - 1, Math.max(0, y)) * W2 + Math.min(W2 - 1, Math.max(0, x))];
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const sx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const sy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const c = (y >> 1) * cols + (x >> 1);
      gx[c] += sx / 4; gy[c] += sy / 4;
    }
    const mag = new Float32Array(n);
    for (let i = 0; i < n; i++) mag[i] = Math.hypot(gx[i], gy[i]);
    const ms = Float32Array.from(mag).sort(), threshold = Math.max(0.35, ms[Math.floor(0.9 * (n - 1))]); // (the strongest tenth, and only real edges)
    for (let i = 0; i < n; i++) {
      if (mag[i] < threshold) continue;
      const a = (Math.atan2(gy[i] * 0.6, gx[i]) * 180 / Math.PI + 180) % 180; // the light's direction; the edge runs across it
      cells[Math.floor(i / cols)][i % cols] = a < 22.5 || a >= 157.5 ? '|' : a < 67.5 ? '/' : a < 112.5 ? '_' : '\\';
    }
  }
  return cells.map((r) => r.join(''));
}
// a box blur of a cols x rows grid, r cells each way (the edges held), across then down
function boxBlur(src, cols, rows, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 2 * r + 1;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let s = 0;
    for (let d = -r; d <= r; d++) s += src[y * cols + Math.min(cols - 1, Math.max(0, x + d))];
    tmp[y * cols + x] = s / k;
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let s = 0;
    for (let d = -r; d <= r; d++) s += tmp[Math.min(rows - 1, Math.max(0, y + d)) * cols + x];
    out[y * cols + x] = s / k;
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
const hayOf = new WeakMap(), titleOf = new WeakMap();
const hay = (key, ...fields) => { let h = hayOf.get(key); if (h === undefined) { h = findForm(fields.join('\n')).text; hayOf.set(key, h); } return h; };
const titleHay = (track) => { let h = titleOf.get(track); if (h === undefined) { h = findForm(track.title).text; titleOf.set(track, h); } return h; }; // (its title alone)
export function findRows(albums, query, max = 300) {
  const words = findWords(query);
  if (!words.length) return { rows: [], total: 0 };
  const every = (h) => words.every((w) => h.includes(w)), found = [], titled = [], rest = [];
  for (const album of albums) {
    if (every(hay(album, album.album, album.artist))) found.push({ kind: 'album', album, found: true });
    album.tracks.forEach((track, index) => {
      if (!every(hay(track, track.title, track.artist, album.album, album.artist))) return;
      (every(titleHay(track)) ? titled : rest).push({ kind: 'track', album, track, index, found: true });
    });
  }
  const all = [...found, ...titled, ...rest];
  return { rows: all.slice(0, max), total: all.length };
}

// ---------------------------------------------------------------- the cursor

export const SECTIONS = [['music', 'your music'], ['spotify', 'spotify'], ['radio', 'radio'], ['scenes', 'scenes']];
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
