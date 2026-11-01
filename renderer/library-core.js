// What the page has of the library before its panel is opened. The panel (library-panel.js, with library.js's albums, rows and cursor and
// library-source.js's tracks) is about 50 KB that are fetched the first time anything asks for it (G, its place in the footer, the help,
// Ctrl+K or the touch panel), not with the page: a visit that never opens it doesn't pay for it. This file is what has to be there from
// the start, so it is small: the queue that the player bar's next and previous and its line of what is near go by, the scenes you saved
// and the stations you played (kept with the settings; Ctrl+K and the radio use them with no panel), and the handle that fetches the
// panel when it is first wanted. library.js has all of these too (it re-exports this file), so tools/library.test.mjs runs them from
// there. No page in it.
import { PRESETS } from './presets.js';

// ---------------------------------------------------------------- the queue

// The album from a track on, which plays through and then repeats: { id, tracks, index } (index: the track playing, by its place in the
// album). Shuffled, it has `order` too: the album's tracks in the order they play, the picked one first and the rest at random (`random`
// is Math.random's shape, so a test can give its own).
export function queueOf(album, index = 0, { shuffle = false, random = Math.random } = {}) {
  const q = { id: album.id, tracks: album.tracks, index: Math.max(0, Math.min(album.tracks.length - 1, index)) };
  return shuffle ? { ...q, order: shuffled(q.tracks.length, q.index, random) } : q;
}
// 0 to n - 1 in a random order, `first` first
export function shuffled(n, first, random = Math.random) {
  const rest = [...Array(n).keys()].filter((k) => k !== first);
  for (let k = rest.length - 1; k > 0; k--) { const j = Math.floor(random() * (k + 1)); [rest[k], rest[j]] = [rest[j], rest[k]]; }
  return [first, ...rest];
}
// shuffle turned on or off while a queue plays: on, this track and then the rest at random; off, the album's order on from this track
export const withShuffle = (q, on, random = Math.random) => (on ? { ...q, order: shuffled(q.tracks.length, q.index, random) } : { id: q.id, tracks: q.tracks, index: q.index });
const placeOf = (q) => (q.order ? q.order.indexOf(q.index) : q.index), trackAt = (q, place) => (q.order ? q.order[place] : place);

// What happens when the album has played through: it plays again (album), the next album in the library plays (all), or a track that ends
// plays again (one; next still goes on). Kept with the settings.
export const REPEATS = ['album', 'all', 'one'];
export const nextRepeat = (mode) => REPEATS[(REPEATS.indexOf(mode) + 1) % REPEATS.length];
export const readRepeat = (mode) => (REPEATS.includes(mode) ? mode : 'album');
// The albums played lately, the latest first, six at most (by id: an album's id is its artist and name, or its folder, so it holds over
// a scan); as saved, only ids, once each
export const noteRecent = (ids, id, max = 6) => [id, ...ids.filter((x) => x !== id)].slice(0, max);
export const readRecent = (ids) => (Array.isArray(ids) ? [...new Set(ids.filter((x) => typeof x === 'string' && x))].slice(0, 6) : []);
// where the queue was, as saved: { path, at } (a track's path in the folder, seconds into it), or nothing
export const readResume = (r) => (r && typeof r.path === 'string' && r.path && Number.isFinite(r.at) && r.at >= 0 ? { path: r.path, at: r.at } : null);

// Next, in the order the queue plays. With repeat one a track that ended plays again; after the album's last, repeat all goes on to the
// album nextAlbum(id) gives (shuffled, from a random track, if this one is), and otherwise the album plays again.
export function queueNext(q, { repeat = 'album', ended = false, nextAlbum = null, random = Math.random } = {}) {
  if (ended && repeat === 'one') return { ...q };
  const place = placeOf(q) + 1;
  if (place < q.tracks.length) return { ...q, index: trackAt(q, place) };
  const next = repeat === 'all' && nextAlbum ? nextAlbum(q.id) : null;
  if (next?.tracks?.length) return queueOf(next, q.order ? Math.floor(random() * next.tracks.length) : 0, { shuffle: !!q.order, random });
  return { ...q, index: trackAt(q, 0) };
}
// Previous: the start of this track once it's past its first seconds (or there's none before it), else the one before.
export function queuePrevious(q, seconds = 0, restartAfter = 3) {
  const place = placeOf(q);
  return seconds > restartAfter || place === 0 ? { restart: true, queue: q } : { restart: false, queue: { ...q, index: trackAt(q, place - 1) } };
}
const two = (n) => String(n).padStart(2, '0');
export const trackLabel = (q, i) => `${two(i + 1)} ${q.tracks[i].title}`;
// Golden's line of what's near: the track before, this one and the next two, in the order the queue plays ("01 Plague" , ▶ "02 Kerosene" ,
// "03 Wrath of God"), as { text, now } parts; fewer at either end
export function queueLine(q, before = 1, after = 2) {
  const place = placeOf(q), from = Math.max(0, place - before), to = Math.min(q.tracks.length, place + after + 1);
  return Array.from({ length: to - from }, (_, k) => ({ text: `"${trackLabel(q, trackAt(q, from + k))}"`, now: from + k === place }));
}
export const queueText = (line) => line.map((p) => (p.now ? `▶ ${p.text}` : p.text)).join(' , ');

// ---------------------------------------------------------------- scenes

// The settings a scene holds are the ones presets use (renderer/presets.js), no more
export const SETUP_KEYS = [...new Set(PRESETS.flatMap((p) => Object.keys(p.settings)))];

// The setup as it is now, in the shape of a preset's settings: `current` is what choosePreset builds in app.js (the settings by name)
export const setupOf = (current) => Object.fromEntries(SETUP_KEYS.map((k) => [k, current[k]]));

// A scene's settings as saved, kept only where they're ones the app knows: domains gives each setting's values (an array; `true`
// for a yes or no; the code's setting is also 'beat'). A scene with nothing left is dropped, and an older profile has none.
export function readScenes(saved, domains = {}) {
  if (!Array.isArray(saved)) return [];
  const ok = (key, v) => (key === 'codeHidden' ? typeof v === 'boolean' || v === 'beat' : domains[key] === true ? typeof v === 'boolean' : Array.isArray(domains[key]) && domains[key].includes(v));
  const seen = new Set(), out = [];
  for (const s of saved) {
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id || seen.has(s.id) || typeof s.name !== 'string' || !s.settings || typeof s.settings !== 'object') continue;
    const settings = Object.fromEntries(SETUP_KEYS.filter((k) => k in s.settings && ok(k, s.settings[k])).map((k) => [k, s.settings[k]]));
    const name = s.name.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!name || !Object.keys(settings).length) continue;
    seen.add(s.id);
    out.push({ id: s.id, name, settings });
    if (out.length >= 60) break;
  }
  return out;
}

const cleanName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
// "my scene 1", the first number not taken
export function defaultSceneName(scenes) {
  const taken = new Set(scenes.map((s) => s.name));
  for (let n = 1; ; n++) if (!taken.has(`my scene ${n}`)) return `my scene ${n}`;
}
// The scenes with this setup added (named, or "my scene N"); the new scene is the last
export function saveScene(scenes, settings, name = '', now = Date.now()) {
  let id = `s${now.toString(36)}`;
  for (let n = 2; scenes.some((s) => s.id === id); n++) id = `s${now.toString(36)}${n}`;
  return [...scenes, { id, name: cleanName(name) || defaultSceneName(scenes), settings: { ...settings } }];
}
// Renamed (an empty name is no rename); deleted; and what is left in each case
export const renameScene = (scenes, id, name) => (cleanName(name) ? scenes.map((s) => (s.id === id ? { ...s, name: cleanName(name) } : s)) : scenes);
export const deleteScene = (scenes, id) => scenes.filter((s) => s.id !== id);
// whether a scene is what's showing now
export const sceneIsOn = (scene, current) => Object.entries(scene.settings).every(([k, v]) => current[k] === v);

// ---------------------------------------------------------------- the radio

const MAX_STATIONS = 30;
// The stations as saved, most recently played first; one that isn't a stream's address is dropped. An older profile only
// has the last one played (state.radio): that is the one station, played at a time nobody knows (0).
export function readStations(saved, last = '') {
  const web = (u) => { try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; } };
  const seen = new Set(), list = [];
  for (const s of Array.isArray(saved) ? saved : []) {
    if (!s || typeof s.url !== 'string' || !web(s.url) || seen.has(s.url)) continue;
    seen.add(s.url);
    list.push({ url: s.url, at: Number.isFinite(s.at) ? s.at : 0 });
  }
  if (!list.length && typeof last === 'string' && web(last)) list.push({ url: last, at: 0 });
  return list.sort((a, b) => b.at - a.at).slice(0, MAX_STATIONS);
}
// played now: first in the list
export const noteStation = (stations, url, at = Date.now()) => [{ url, at }, ...stations.filter((s) => s.url !== url)].slice(0, MAX_STATIONS);

// ---------------------------------------------------------------- the panel, fetched when it is first wanted

// The library panel as app.js holds it: a handle that is there from the start and stands for the panel until it has been fetched (`load`
// fetches the modules and makes the panel: a promise of it). Till then it is not open and has nothing to update; open, toggle, scan,
// choose and find fetch it first (once, however many ask while it comes: they then do what they were asked, in the order they were asked) and
// then act as the panel does. If it can't be fetched, fail(err) hears of it once for each try (however many asked during it), nothing
// else happens, and the next ask tries again. (A page remembers a module that failed to load for as long as it lives, so a try after an
// import() failed fails the same way at once, and says so again: only a new page gets the module.) ready() is the panel itself, for
// what has to wait for it and to know if it can't come.
export function lazyLibrary({ load, fail = () => {} }) {
  let panel = null, loading = null, told = null;
  const ready = () => {
    if (panel) return Promise.resolve(panel);
    loading ||= load().then((made) => (panel = made), (err) => { loading = null; throw err; });
    return loading;
  };
  // (once it is there an ask runs at once, in the turn it was made in, as it did when the panel was made with the page)
  const ask = (act) => {
    if (panel) return Promise.resolve(act(panel));
    const attempt = ready();
    return attempt.then(act, (err) => { if (told !== attempt) { told = attempt; fail(err); } });
  };
  return {
    ready,
    get panel() { return panel; },
    get isOpen() { return !!panel && panel.isOpen; },
    get state() { return panel ? panel.state : null; },
    update: () => panel?.update(),
    open: (section) => ask((p) => p.open(section)),
    toggle: (section) => ask((p) => p.toggle(section)),
    scan: () => ask((p) => p.scan()),
    choose: () => ask((p) => p.choose()),
    find: () => ask((p) => p.find()),
  };
}
