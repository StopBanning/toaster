import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { startFakeSpotify, idOf } from './spotify-fake.mjs';
import { createLibraryPanel } from '../renderer/library-panel.js';
import { createSpotifyVideo, spotifyEmbedUrl } from '../renderer/spotify-video.js';
const { createWebApi } = createRequire(import.meta.url)('../helpers/spotify.cjs');

class El {
  constructor(tag = '') { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attrs = {}; this.handlers = {}; this.classes = new Set(); this.hidden = false; this.isConnected = true; this.scrollTop = 0; }
  get classList() { return { add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c), contains: (c) => this.classes.has(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) }; }
  get style() { return { setProperty() {} }; }
  set innerHTML(s) { this.html = s; this.children = []; }
  get innerHTML() { return this.html || ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  append(...els) { for (const el of els) { el.parent = this; this.children.push(el); } }
  replaceChildren(...els) { this.children = []; this.append(...els); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((e) => e !== this); this.isConnected = false; }
  querySelectorAll(sel) { const all = this.children.flatMap((e) => [e, ...e.querySelectorAll(sel)]); return all.filter((e) => sel === 'iframe' ? e.tagName === 'IFRAME' : sel.includes('button') ? (e.tagName === 'BUTTON' && !e.hidden) || e.tagName === 'IFRAME' : false); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  addEventListener(k, fn) { this.handlers[k] = fn; }
  focus() { if (this.doc) this.doc.activeElement = this; }
  blur() {} select() {} scrollIntoView() {}
}
function documentOf() { const doc = { body: new El(), activeElement: null, createElement: (tag) => Object.assign(new El(tag), { doc }) }; return doc; }
const settle = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 2)); };
const event = (key) => ({ key, target: {}, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });

test('Development Mode artist reads use filtered search, four explicit release groups and no removed fields or top-tracks', async () => {
  const fake = await startFakeSpotify();
  const web = createWebApi({ api: fake.base, accessToken: async () => 'fake-access-0' });
  try {
    const id = idOf('artist:Daft Punk'), artist = await web.list({ list: 'artist', id });
    assert.equal(artist.name, 'Daft Punk'); assert.ok(artist.songs.length > 0);
    assert.ok(artist.songs.every((t) => t.artistRefs.some((a) => a.id === id)));
    assert.deepEqual(artist.genres, ['electronic']);
    for (const group of ['album', 'single', 'appears_on', 'compilation']) {
      const page = await web.list({ list: 'artist-releases', id, group });
      assert.equal(page.next, 10);
      assert.ok(page.items.every((a) => a.kind === 'album' && a.year === '2012'));
    }
    assert.equal(fake.seen.find((r) => r.path === '/v1/search').query.q, 'artist:"Daft Punk"');
    assert.ok(fake.seen.every((r) => !r.path.includes('top-tracks')));
    const n = fake.seen.length;
    for (const request of [{ list: 'artist', id: '../bad' }, { list: 'artist-releases', id, group: 'bad' }, { list: 'artist-releases', id, group: 'album', offset: -1 }]) await assert.rejects(web.list(request));
    assert.equal(fake.seen.length, n, 'invalid requests never leave main');
  } finally { await fake.close(); }
});

test('artist panel opens from search, unfolds an album, plays in its context, opens video with V and returns to the search cursor', async () => {
  const fake = await startFakeSpotify(), web = createWebApi({ api: fake.base, accessToken: async () => 'fake-access-0' });
  const doc = documentOf(), root = new El(), parts = {}, events = {}, opened = [], plays = [];
  root.querySelector = (s) => parts[s] ||= new El(); root.querySelectorAll = () => [];
  const win = { navigator: {}, addEventListener: (k, fn) => events[k] = fn, matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  const host = { repeat: () => 'album', shuffle: () => false, key: () => 'G', live: () => false, blocked: () => false, playing: () => ({}), say() {}, fail: assert.fail, scenes: () => ({ presets: [], user: [] }), stations: () => [],
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }), list: (r) => web.list(r), play: async (r) => { plays.push(r); return {}; }, open: async (u) => opened.push(u), cover: async () => { throw new Error('no fixture image needed'); } } };
  const panel = createLibraryPanel({ document: doc, root, window: win, host, source: { kind: 'web', supported: true, cached: async () => null } });
  try {
    panel.open('spotify'); await settle();
    parts['.lib-sp-query'].value = 'Daft Punk'; parts['.lib-sp-search'].handlers.submit({ preventDefault() {} }); await settle();
    const before = panel.rows().map((r) => r.track?.id || r.artist?.id || r.kind);
    assert.equal(panel.rows()[0].kind, 'artist');
    parts['.lib-list'].scrollTop = 72;
    events.keydown(event('ArrowRight')); await settle();
    assert.equal(panel.state.sp.artist.name, 'Daft Punk'); assert.ok(root.classes.has('lib-artist'));
    assert.doesNotMatch(parts['.lib-head'].innerHTML, /original/, "the artist's picture is drawn the library's way, like every cover");
    assert.match(parts['.lib-head'].innerHTML, /lib-cover/);
    panel.state.cursor.spotify = panel.rows().findIndex((r) => r.kind === 'coll');
    events.keydown(event('ArrowRight')); await settle();
    assert.ok(panel.state.sp.open.startsWith('album:'));
    assert.equal(panel.rows()[panel.state.cursor.spotify].kind, 'strack');
    events.keydown(event('Enter')); await settle();
    assert.match(plays[0].context, /^spotify:album:/); assert.match(plays[0].track, /^spotify:track:/);
    events.keydown(event('v'));
    assert.equal(root.children.at(-1).attrs['aria-label'], 'Spotify player');
    events.keydown(event('Escape')); // Close video first.
    assert.ok(panel.state.sp.artist);
    events.keydown(event('Escape')); // Then return to search.
    assert.equal(panel.state.sp.artist, null); assert.equal(panel.state.cursor.spotify, 0);
    assert.equal(parts['.lib-list'].scrollTop, 72);
    assert.deepEqual(panel.rows().map((r) => r.track?.id || r.artist?.id || r.kind), before);
    events.keydown(event('ArrowRight')); events.keydown(event('Escape')); await settle();
    assert.equal(panel.state.sp.artist, null, 'a late artist response cannot reopen a page after Back');
  } finally { panel.close(); await fake.close(); }
});

test('the half look follows the shared setting on an artist page and its albums: the button and Shift+C are there too (Colin, Nov 11)', async () => {
  const fake = await startFakeSpotify(), web = createWebApi({ api: fake.base, accessToken: async () => 'fake-access-0' });
  const doc = documentOf(), root = new El(), parts = {}, events = {}, button = new El('button');
  root.querySelector = (s) => parts[s] ||= new El(); root.querySelectorAll = () => [];
  const win = { navigator: {}, addEventListener: (k, fn) => events[k] = fn, matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  let look = 'photo';
  const host = { repeat: () => 'album', shuffle: () => false, key: () => 'G', live: () => false, blocked: () => false, playing: () => ({}), say() {}, fail: assert.fail, scenes: () => ({ presets: [], user: [] }), stations: () => [],
    coverLook: () => look, setCoverLook: (v) => { look = v; },
    spotify: { app: true, links: () => [], status: async () => ({ connected: true }), list: (r) => web.list(r), play: async () => ({}), open: async () => {}, cover: async () => { throw new Error('no fixture image needed'); } } };
  const panel = createLibraryPanel({ document: doc, root, window: win, host, source: { kind: 'web', supported: true, cached: async () => null } });
  parts['.lib-tabs'].querySelector = (s) => s === '.lib-coverbtn' ? button : null;
  const shiftC = { ...event('C'), shiftKey: true };
  try {
    panel.open('spotify'); await settle();
    parts['.lib-sp-query'].value = 'Daft Punk'; parts['.lib-sp-search'].handlers.submit({ preventDefault() {} }); await settle();
    events.keydown(event('ArrowRight')); await settle();
    assert.equal(panel.state.sp.artist.name, 'Daft Punk');
    assert.ok(root.classes.has('lib-half'), 'the artist page wears the half look when it is the setting');
    assert.equal(button.hidden, false); assert.equal(button.textContent, 'half ascii');
    assert.match(parts['.lib-keys span'].innerHTML, /shift\+C cover/);
    assert.match(parts['.lib-list'].innerHTML, /"01 [^"]+",/, 'its songs are written as code');
    events.keydown(shiftC); await settle();
    assert.equal(look, 'chars', 'Shift+C switches it on the artist page');
    assert.equal(root.classes.has('lib-half'), false); assert.equal(button.textContent, 'full ascii');
    events.keydown(shiftC); await settle();
    assert.equal(look, 'photo');
    panel.state.cursor.spotify = panel.rows().findIndex((r) => r.kind === 'coll');
    events.keydown(event('ArrowRight')); await settle();
    assert.ok(panel.state.sp.open.startsWith('album:') && panel.state.sp.artist);
    assert.ok(root.classes.has('lib-half'), 'and so does an album opened from it');
    assert.match(parts['.lib-head'].innerHTML, /lib-code.*x = x\.DaftPunk/);
    assert.equal(button.hidden, false);
  } finally { panel.close(); await fake.close(); }
});

test('the player loads Spotify\'s embed at once, confined, with the song and artist on top; open in Spotify and close destroy it; late loads are dropped', async () => {
  const doc = documentOf(), root = new El(), calls = [], track = { uri: `spotify:track:${idOf('video')}`, name: '<unsafe title>', by: 'Daft Punk' };
  let prepare = () => {};
  const video = createSpotifyVideo({ document: doc, root, beforeLoad: () => prepare(), openSpotify: (u) => calls.push(u) });
  assert.throws(() => spotifyEmbedUrl('https://bad/track/x')); assert.throws(() => spotifyEmbedUrl('spotify:track:' + idOf('video') + '?x'));
  await video.open(track);
  const frame = root.querySelector('iframe');
  assert.equal(frame.src, spotifyEmbedUrl(track.uri), 'choosing preview is the ask: no second step');
  assert.equal(frame.attrs.sandbox, 'allow-scripts allow-same-origin allow-presentation');
  assert.equal(frame.attrs.allow, 'encrypted-media; fullscreen; picture-in-picture');
  assert.equal(frame.attrs.referrerpolicy, 'no-referrer');
  const words = root.children[0].children[0].children[0];
  assert.equal(words.children[0].textContent, '<unsafe title>', 'the title as text, never markup');
  assert.equal(words.children[1].textContent, 'Daft Punk');
  const buttons = root.querySelectorAll('button').filter((b) => b.tagName === 'BUTTON');
  assert.deepEqual(buttons.map((b) => b.textContent), ['open in Spotify', 'close · esc']);
  assert.equal(doc.activeElement, buttons[1], 'focus starts on close');
  buttons[0].handlers.click(); assert.deepEqual(calls, [track.uri]);
  assert.equal(root.children.length, 0, 'opening the app destroys the embedded player');
  await video.open(track); video.close(); assert.equal(root.children.length, 0);
  let release; prepare = () => new Promise((r) => release = r);
  const late = video.open(track); video.close(); release(); await late;
  assert.equal(root.children.length, 0, 'closing while it prepares never brings the player back');
  prepare = () => Promise.reject(new Error('no'));
  await video.open(track);
  assert.equal(root.querySelectorAll('iframe').length, 0);
  assert.match(root.children[0].children[2].textContent, /open it in Spotify/, 'a player that cannot start says what to do');
  video.close();
  const csp = fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8');
  assert.match(csp, /frame-src https:\/\/open.spotify.com\/embed\/track\/;/);
});
