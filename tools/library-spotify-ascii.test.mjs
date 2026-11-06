// Exercise both Spotify looks through the panel with an in-memory cover and a small DOM/canvas stand-in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryPanel } from '../renderer/library-panel.js';

class El {
  constructor(tag = '') { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.isConnected = true; this.attrs = {}; this.styles = {}; this.classes = new Set(); this.handlers = {}; this.hidden = false; this.scrollTop = 0; }
  get classList() { return { add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c), contains: (c) => this.classes.has(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) }; }
  get style() { return { setProperty: (k, v) => { this.styles[k] = v; } }; }
  set innerHTML(value) {
    this.html = value; this.children = [];
    for (const m of value.matchAll(/<i class="lib-cover [^"]*" data-sp="([^"]+)"><b><\/b><\/i>/g)) {
      const el = new El('i'); el.dataset.sp = m[1]; el.append(new El('b')); this.append(el);
    }
  }
  get innerHTML() { return this.html || ''; }
  get firstElementChild() { return this.children[0] || null; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return k === 'src' ? this.src : this.attrs[k]; }
  append(el) { el.parent = this; this.children.push(el); }
  replaceChildren(...els) { this.children = els; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    return this.children.filter((el) => sel === 'img' ? el.tagName === 'IMG' : sel.includes('lib-cover') || sel === '[data-sp]' ? !!el.dataset.sp : sel === '.lib-glyphs.in' ? el.classes.has('in') : false);
  }
  addEventListener(k, fn) { (this.handlers[k] ||= []).push(fn); }
  getBoundingClientRect() { return { width: 600, height: 600 }; }
  focus() {} blur() {} scrollIntoView() {}
}
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };

test('Spotify masks cached data URLs, switches both looks by button and Shift+C, and keeps the code names safe', async () => {
  const original = globalThis.Image, decoded = [];
  globalThis.Image = class { constructor() { this.naturalWidth = this.naturalHeight = 128; } async decode() { decoded.push(this.src); } };
  const parts = {}, events = {}, button = new El('button'), root = new El();
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = (sel) => Object.values(parts).flatMap((el) => el.querySelectorAll(sel));
  const canvas = () => Object.assign(new El('canvas'), {
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(30 * 18 * 4).fill(255) }), fillText() {} }),
    toBlob: (fn) => fn(new Blob(['mask'], { type: 'image/png' })),
  });
  const win = { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: true }), requestAnimationFrame: (fn) => fn(), getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  let look = 'chars';
  const source = { kind: 'web', supported: true, start: async () => false, cached: async () => null };
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => ({}), repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    coverLook: () => look, setCoverLook: (v) => { look = v; },
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }), cover: async () => { throw new Error('cached covers need no fetch'); } },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: (tag) => tag === 'canvas' ? canvas() : new El(tag) }, window: win, root, source, host });
  parts['.lib-tabs'].querySelector = () => button;
  const coll = { kind: 'playlist', id: 'one', uri: 'spotify:playlist:one', name: 'Night "<mix>"', by: '12 Colin / Test', count: 1, cover: 'https://i.scdn.co/one' };
  const data = 'data:image/png;base64,c3R1Yg==', x = panel.state.sp;
  x.status = { connected: true }; x.at = Date.now(); x.open = 'playlist:one';
  x.lists = { playlists: { items: [coll] }, albums: { items: [] }, liked: { items: [], total: 2 } };
  x.tracks[x.open] = { items: [{ id: 'song', name: 'A song', by: 'Artist', ms: 1000 }] };
  x.covers.set(coll.cover, data);
  try {
    panel.open('spotify'); await settle();
    assert.equal(button.hidden, false); assert.equal(button.textContent, 'full ascii');
    assert.match(parts['.lib-head'].children[0].firstElementChild.styles['--mask'], /^url\("blob:/);
    assert.equal(decoded.filter((src) => src === data).length, 1, 'the same URL is decoded once for head and background');
    assert.ok(parts['.lib-art'].children.some((el) => el.styles['--mask']), 'large art is also masked');
    assert.equal(parts['.lib-bigcover'].children.length, 0, 'full ASCII has no large photo');
    const key = { key: 'C', shiftKey: true, target: {}, preventDefault() {}, stopImmediatePropagation() {} };
    events.keydown(key); await settle();
    assert.equal(look, 'photo'); assert.ok(root.classes.has('lib-half'));
    assert.match(parts['.lib-head'].innerHTML, /lib-code.*x = x\._12ColinTest/);
    assert.doesNotMatch(parts['.lib-head'].innerHTML, /<mix>/);
    assert.match(parts['.lib-head'].innerHTML, /\/\/ 12 Colin \/ Test · 1 track/);
    assert.match(parts['.lib-list'].innerHTML, /"01 A song",/);
    assert.equal(parts['.lib-bigcover'].firstElementChild.src, data);
    assert.match(parts['.lib-list'].innerHTML, /lib-cover real small liked/);
    assert.match(parts['.lib-head'].innerHTML, /play on Spotify/);
    // The same button event as a click in the browser, then the shared setting on your music.
    button.classes.add('lib-coverbtn');
    parts['.lib-tabs'].handlers.click[0]({ target: { closest: () => button } });
    assert.equal(look, 'chars');
    panel.open('music'); assert.equal(button.textContent, 'full ascii');
    events.keydown(key); assert.equal(look, 'photo');
    panel.open('spotify'); await settle(); assert.ok(root.classes.has('lib-half'));
    look = 'chars'; panel.update(); assert.equal(button.textContent, 'full ascii');
    assert.equal(root.classes.has('lib-half'), false, 'a scene or command changes the visible look through update');
    look = 'photo'; panel.update(); assert.ok(root.classes.has('lib-half'));
    coll.by = ''; panel.paintAll(); assert.match(parts['.lib-head'].innerHTML, /x = x.Spotify/);
  } finally { panel.close(); globalThis.Image = original; }
});

test('the big cover follows whichever changed last: a new song playing shows its own cover, the cursor moving shows its row\'s', async () => {
  const original = globalThis.Image;
  globalThis.Image = class { constructor() { this.naturalWidth = this.naturalHeight = 128; } async decode() {} };
  const parts = {}, events = {}, root = new El();
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = (sel) => Object.values(parts).flatMap((el) => el.querySelectorAll(sel));
  const canvas = () => Object.assign(new El('canvas'), {
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(30 * 18 * 4).fill(255) }), fillText() {} }),
    toBlob: (fn) => fn(new Blob(['mask'], { type: 'image/png' })),
  });
  const win = { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: true }), requestAnimationFrame: (fn) => fn(), getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  let now = { id: 'system|First|Someone|', title: 'First', artist: 'Someone', art: 'data:image/png;base64,Zmlyc3Q=' };
  const source = { kind: 'web', supported: true, start: async () => false, cached: async () => null };
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => now, repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    coverLook: () => 'photo', setCoverLook() {},
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }), cover: async () => { throw new Error('cached covers need no fetch'); } },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: (tag) => tag === 'canvas' ? canvas() : new El(tag) }, window: win, root, source, host });
  const coll = { kind: 'playlist', id: 'one', uri: 'spotify:playlist:one', name: 'Jazz', by: 'Colin', count: 2, cover: 'https://i.scdn.co/mosaic' };
  const mosaic = 'data:image/png;base64,bW9zYWlj', songCover = 'data:image/png;base64,c29uZw==', x = panel.state.sp;
  x.status = { connected: true }; x.at = Date.now(); x.open = 'playlist:one';
  x.lists = { playlists: { items: [coll] }, albums: { items: [] }, liked: { items: [], total: 0 } };
  x.tracks[x.open] = { items: [{ id: 'a', name: 'Scenery', by: 'Ryo Fukui', ms: 1000, cover: 'https://i.scdn.co/a' }, { id: 'b', name: 'Sonora', by: 'Ryo Fukui', ms: 1000, cover: 'https://i.scdn.co/b' }] };
  x.covers.set(coll.cover, mosaic); x.covers.set('https://i.scdn.co/a', songCover); x.covers.set('https://i.scdn.co/b', songCover);
  const big = () => parts['.lib-bigcover'].firstElementChild?.src;
  try {
    panel.open('spotify'); await settle(); panel.update();
    assert.equal(big(), songCover, 'opened on its first song, as before: the song already playing does not take the cover');
    now = { id: 'system|winter 4ever|Baby Jane|', title: 'winter 4ever', artist: 'Baby Jane', art: 'data:image/png;base64,d2ludGVy' };
    panel.update(); await settle();
    assert.equal(big(), now.art, 'a new song: its own cover');
    panel.update(); await settle();
    assert.equal(big(), now.art, 'and it stays through the repaints');
    events.keydown({ key: 'ArrowDown', target: {}, preventDefault() {}, stopImmediatePropagation() {} }); await settle();
    assert.equal(big(), songCover, 'the cursor moved: the row\'s cover');
    now = { id: 'system|next|Baby Jane|', title: 'next', artist: 'Baby Jane', art: '' };
    panel.update(); await settle();
    assert.equal(big(), songCover, 'a song with no cover (yet) leaves the cursor\'s');
    now = { ...now, art: 'data:image/png;base64,bmV4dA==' };
    panel.update(); await settle();
    assert.equal(big(), now.art, 'its cover comes in a moment later: then it shows');
  } finally { panel.close(); globalThis.Image = original; }
});

test('Spotify search submits, pages, plays a result, clears, and ignores an obsolete response', async () => {
  const parts = {}, events = {}, root = new El(), requests = [], plays = [], handoffs = [], opens = [];
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = () => [];
  let resolveLate;
  const song = { id: 'A'.repeat(22), uri: `spotify:track:${'A'.repeat(22)}`, name: '<Song>', by: 'Artist', ms: 9000 };
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => ({}), repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }),
      list: async (request) => { requests.push(request); if (request.q === 'empty') return { items: [], total: 0, more: false, next: 10 }; if (request.q === 'error') throw new Error('Spotify asks Toaster to slow down'); if (request.q === 'late') return new Promise((r) => { resolveLate = r; }); return { items: [song], total: 11, more: !request.offset, next: 10 }; },
      play: async (request) => { plays.push(request); }, open: async (text, link) => { opens.push([text, link?.uri]); },
      search: async (query) => { handoffs.push(query); if (query === 'cannot open') throw new Error('Could not open Spotify'); },
    },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: () => new El() },
    window: { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '' }) },
    root, source: { kind: 'web', supported: true, start: async () => false, cached: async () => null }, host });
  const x = panel.state.sp;
  x.status = { connected: true }; x.at = Date.now(); x.lists = { playlists: { items: [] }, albums: { items: [] }, liked: { items: [] } };
  const submit = async (value) => { parts['.lib-sp-query'].value = value; parts['.lib-sp-search'].handlers.submit[0]({ preventDefault() {} }); await settle(); };
  const enter = () => events.keydown({ key: 'Enter', target: {}, preventDefault() {}, stopImmediatePropagation() {} });
  try {
    panel.open('spotify'); await settle();
    assert.equal(parts['.lib-sp-search'].hidden, false);
    await submit('Artist');
    assert.deepEqual(requests[0], { list: 'search', q: 'Artist', offset: 0 });
    assert.match(parts['.lib-list'].innerHTML, /&lt;Song&gt;/);
    enter(); await settle(); assert.deepEqual(opens[0], [song.uri, song.uri], 'in the app, a searched song is handed to the Spotify app'); assert.equal(plays.length, 0);
    events.keydown({ key: 'ArrowDown', target: {}, preventDefault() {}, stopImmediatePropagation() {} });
    enter(); await settle(); assert.equal(requests[1].offset, 10);
    assert.equal(panel.rows().length, 1, 'the second page brought the same song again: listed once (and no more row)');
    assert.match(parts['.lib-sp-status'].textContent, /^1 of 11 results$/);
    await submit('empty'); assert.match(parts['.lib-list'].innerHTML, /No songs found/);
    await submit('error'); assert.match(parts['.lib-list'].innerHTML, /Search failed/);
    assert.match(panel.state.sp.error, /slow down/);
    await submit('late');
    parts['.lib-sp-clear'].handlers.click[0]();
    resolveLate({ items: [song], total: 1, more: false, next: 10 }); await settle();
    assert.ok(panel.rows().every((row) => row.kind !== 'strack'));
    x.status = { connected: false }; panel.paintAll();
    assert.equal(parts['.lib-sp-submit'].textContent, 'search in Spotify ↗');
    const before = requests.length;
    await submit('Air & Moon');
    assert.deepEqual(handoffs, ['Air & Moon']);
    assert.equal(requests.length, before, 'no API request when disconnected');
    assert.match(parts['.lib-sp-status'].textContent, /Choose a song there/);
    await submit('cannot open'); assert.match(x.error, /Could not open/);
    await submit('  '); assert.equal(handoffs.length, 2, 'empty queries do not open anything');
    panel.open('music'); assert.equal(parts['.lib-sp-search'].hidden, true);
  } finally { panel.close(); }
});

test('Spotify search lists a song once (its best-known copy), puts the named artist\'s songs first and opens its albums', async () => {
  const parts = {}, events = {}, root = new El(), requests = [];
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = () => [];
  const id = (c) => c.repeat(22), BJ = id('J');
  const song = (c, name, by, pop, artistIds = []) => ({ id: id(c), uri: `spotify:track:${id(c)}`, name, by, ms: 9000, pop, artistIds });
  // (Colin's search, Nov 5: "baby jane" listed Starry Eyed - Sped Up twice and Rod Stewart's Baby Jane twice)
  const page = { items: [
    song('a', 'Rival', 'Someone Else', 50),
    song('b', 'Starry Eyed - Sped Up', 'Baby Jane', 40, [BJ]),
    song('c', 'Colorway', 'Baby Jane', 70, [BJ]),
    song('d', 'Starry Eyed - Sped Up', 'Baby Jane', 65, [BJ]),
    song('e', 'Baby Jane - 2008 Remaster', 'Rod Stewart', 60),
    song('f', 'baby jane - 2008 remaster', 'Rod Stewart', 30),
  ], albums: [{ kind: 'album', id: id('A'), name: 'Field Notes', by: 'Baby Jane', count: 2, cover: '', big: '', uri: `spotify:album:${id('A')}` }],
  artist: { id: BJ, name: 'Baby Jane' }, total: 30, more: false, next: 10 };
  const albumSongs = { items: [song('g', 'One', 'Baby Jane', 0), song('h', 'Two', 'Baby Jane', 0)], total: 2, more: false };
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => ({}), repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }),
      list: async (request) => { requests.push(request); return request.list === 'album' ? albumSongs : request.q === 'steve lacy the feeling' ? { ...page, artist: { id: BJ, name: 'Baby Jane' } } : page; },
      play: async () => {}, open: async () => {}, search: async () => assert.fail('no handoff while connected') },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: () => new El() },
    window: { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '' }) },
    root, source: { kind: 'web', supported: true, start: async () => false, cached: async () => null }, host });
  const x = panel.state.sp;
  x.status = { connected: true }; x.at = Date.now(); x.lists = { playlists: { items: [] }, albums: { items: [] }, liked: { items: [] } };
  const submit = async (value) => { parts['.lib-sp-query'].value = value; parts['.lib-sp-search'].handlers.submit[0]({ preventDefault() {} }); await settle(); };
  const key = async (k) => { events.keydown({ key: k, target: {}, preventDefault() {}, stopImmediatePropagation() {} }); await settle(); };
  const songs = () => panel.rows().filter((r) => r.kind === 'strack' && r.coll.kind === 'search').map((r) => `${r.track.name}|${r.track.pop}`);
  try {
    panel.open('spotify'); await settle();
    await submit('baby jane');
    assert.deepEqual(songs(), ['Colorway|70', 'Starry Eyed - Sped Up|65', 'Rival|50', 'Baby Jane - 2008 Remaster|60'],
      'each song once, the better-known copy kept; her songs first, best-known first; the rest in Spotify\'s order');
    assert.match(parts['.lib-list'].innerHTML, /lib-label">songs</);
    assert.match(parts['.lib-list'].innerHTML, /lib-label">albums</);
    await submit('steve lacy the feeling');
    assert.equal(songs()[0], 'Rival|50', 'a query that isn\'t just the artist\'s name keeps Spotify\'s order');
    await submit('baby jane');
    const at = panel.rows().findIndex((r) => r.kind === 'coll' && r.group === 'searchalbums');
    assert.ok(at > 0, 'the album is listed after the songs');
    panel.state.cursor.spotify = at;
    await key('ArrowRight');
    assert.deepEqual(requests.at(-1), { list: 'album', id: id('A'), offset: 0 });
    const opened = panel.rows().slice(at + 1).map((r) => [r.kind, r.track?.name]);
    assert.deepEqual(opened, [['strack', 'One'], ['strack', 'Two']], 'its songs under its row');
    await key('ArrowLeft');
    assert.equal(x.open, null);
    await key('ArrowRight');
    parts['.lib-sp-clear'].handlers.click[0](); await settle();
    assert.equal(x.open, null, 'clearing the search folds an album opened from it');
    assert.ok(panel.rows().every((r) => r.group !== 'searchalbums'));
  } finally { panel.close(); }
});

test('a search typed while the section is still asking whether Spotify is connected waits for the answer, not the browser', async () => {
  const parts = {}, events = {}, root = new El(), requests = [], handoffs = [];
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = () => [];
  let answer;
  const asked = new Promise((r) => { answer = r; });
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => ({}), repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    spotify: { app: true, links: () => [], status: () => asked,
      list: async (request) => { requests.push(request); return { items: [], total: 0, more: false, next: 10 }; },
      play: async () => {}, open: async () => {}, search: async (query) => { handoffs.push(query); } },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: () => new El() },
    window: { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '' }) },
    root, source: { kind: 'web', supported: true, start: async () => false, cached: async () => null }, host });
  try {
    panel.open('spotify'); await settle();
    assert.equal(panel.state.sp.checking, true, 'still asking');
    parts['.lib-sp-query'].value = 'steve lacy the feeling';
    parts['.lib-sp-search'].handlers.submit[0]({ preventDefault() {} }); await settle();
    assert.deepEqual(handoffs, [], 'nothing handed to the browser while the answer is out');
    answer({ connected: true }); await settle();
    assert.deepEqual(handoffs, [], 'connected: never the browser');
    assert.ok(requests.some((r) => r.list === 'search' && r.q === 'steve lacy the feeling'), 'searched inside Toaster');
  } finally { panel.close(); }
});

// (from the review of the search change, Nov 5: a searched album's songs come after the search's own songs)
function searchFixture({ asked = null } = {}) {
  const parts = {}, events = {}, root = new El(), requests = [], plays = [], handoffs = [];
  root.querySelector = (sel) => (parts[sel] ||= new El());
  root.querySelectorAll = () => [];
  const song = (id, name) => ({ id, uri: `spotify:track:${id}`, name, by: 'Artist', ms: 9000 });
  const album = { kind: 'album', id: 'album', uri: 'spotify:album:album', name: 'Album', by: 'Artist' };
  const host = {
    key: () => 'G', blocked: () => false, live: () => false, playing: () => ({}), repeat: () => 'album', shuffle: () => false,
    scenes: () => ({ presets: [], user: [] }), stations: () => [], say() {}, fail: assert.fail,
    spotify: { app: true, links: () => [], status: () => asked || Promise.resolve({ connected: true }),
      list: async (request) => {
        requests.push(request);
        return request.list === 'album' ? { items: [song('album-song', 'Album song')], total: 1, more: false }
          : { items: [song('result', 'Result')], albums: [album], total: 1, more: false };
      },
      play: async (request) => { plays.push(request); }, open: async () => {}, search: async (query) => { handoffs.push(query); } },
  };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: () => new El() },
    window: { navigator: {}, addEventListener: (k, fn) => { events[k] = fn; }, matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '' }) },
    root, source: { kind: 'web', supported: true, start: async () => false, cached: async () => null }, host });
  const submit = async (query) => { parts['.lib-sp-query'].value = query; parts['.lib-sp-search'].handlers.submit[0]({ preventDefault() {} }); await settle(); };
  const key = async (k) => { events.keydown({ key: k, target: {}, preventDefault() {}, stopImmediatePropagation() {} }); await settle(); };
  const click = async (i) => { const el = { dataset: { i: String(i) } }; parts['.lib-list'].handlers.click[0]({ target: { closest: (s) => (s === '[data-i]' ? el : null) } }); await settle(); };
  return { panel, parts, requests, plays, handoffs, submit, key, click };
}

test('a searched album opened with → puts the cursor on its own first song, and Enter plays that song in the album', async () => {
  const f = searchFixture();
  try {
    f.panel.open('spotify'); await settle();
    await f.submit('Artist');
    f.panel.state.cursor.spotify = f.panel.rows().findIndex((r) => r.kind === 'coll');
    await f.key('ArrowRight');
    assert.equal(f.panel.rows()[f.panel.state.cursor.spotify].track.id, 'album-song', 'the album\'s song, not the search\'s first');
    await f.key('Enter');
    assert.deepEqual(f.plays[0], { context: 'spotify:album:album', track: 'spotify:track:album-song' });
  } finally { f.panel.close(); }
});

test('a click on the open searched album folds it, the cursor staying on its row', async () => {
  const f = searchFixture();
  try {
    f.panel.open('spotify'); await settle();
    await f.submit('Artist');
    const i = f.panel.rows().findIndex((r) => r.kind === 'coll');
    await f.click(i);
    assert.equal(f.panel.state.sp.open, 'album:album');
    await f.click(i);
    assert.equal(f.panel.state.sp.open, null, 'folded');
    assert.equal(f.panel.rows()[f.panel.state.cursor.spotify].kind, 'coll');
  } finally { f.panel.close(); }
});

test('a search cleared while it waits for the connection answer is never sent, connected or not', async () => {
  for (const status of [{ connected: true }, { connected: false }]) {
    let answer;
    const f = searchFixture({ asked: new Promise((r) => { answer = r; }) });
    try {
      f.panel.open('spotify'); await settle();
      await f.submit('old query');
      f.parts['.lib-sp-clear'].handlers.click[0]();
      answer(status); await settle();
      assert.equal(f.requests.filter((r) => r.list === 'search').length, 0, 'no search inside Toaster');
      assert.deepEqual(f.handoffs, [], 'and none in the browser');
    } finally { f.panel.close(); }
  }
});
