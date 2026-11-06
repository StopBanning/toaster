import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import http from 'node:http';

const { createWebApi, cover, biggest } = createRequire(import.meta.url)('../helpers/spotify.cjs');

const id = (c) => c.repeat(22).slice(0, 22); // a well-formed 22-character Spotify id
const ALBUM = id('A'), PLAYLIST = id('P'), TRACK = (n) => `spotify:track:${String(n).padStart(22, 'T')}`;

// A fake Web API: answers by method and path, and records each request (its path, query, token and body).
async function fakeApi(routes) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      seen.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
      const route = routes[`${req.method} ${url.pathname}`];
      const [status, json, headers = {}] = route ? route(seen[seen.length - 1], seen.length) : [404, { error: { status: 404, message: 'no route' } }];
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(status === 204 ? undefined : JSON.stringify(json));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { api: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}
const tokens = () => { let n = 0; const calls = []; return { calls, accessToken: async ({ force = false } = {}) => { calls.push(force); if (force) n++; return `tok${n}`; } }; };

test('a cover is the smallest Spotify image at least 300 wide, or else the biggest; the big one, for the open collection on a wide window, is the biggest', () => {
  assert.equal(cover([{ url: 'big', width: 640 }, { url: 'mid', width: 300 }, { url: 'small', width: 64 }]), 'mid');
  assert.equal(cover([{ url: 'a', width: 64 }, { url: 'b', width: 120 }]), 'b');
  assert.equal(cover([]), '');
  assert.equal(biggest([{ url: 'mid', width: 300 }, { url: 'big', width: 640 }, { url: 'small', width: 64 }]), 'big');
  assert.equal(biggest([{ url: 'mosaic', width: null, height: null }]), 'mosaic', 'a playlist\'s one picture, which Spotify gives no size');
  assert.equal(biggest([{ width: 640 }]), '', 'one with no address is none');
  assert.equal(biggest(undefined), '');
});

test('your playlists, as rows: name, owner, track count, cover and uri, with the token and a page of 50', async () => {
  const f = await fakeApi({ 'GET /v1/me/playlists': () => [200, { total: 51, items: [
    { id: PLAYLIST, name: 'gym', owner: { display_name: 'colin' }, tracks: { total: 12 }, images: [{ url: 'https://i.scdn.co/p640', width: 640 }, { url: 'https://i.scdn.co/p300', width: 300 }] },
    { id: 'short', name: 'broken' }, // (not a Spotify id: left out)
  ] }] });
  try {
    const t = tokens();
    const page = await createWebApi({ accessToken: t.accessToken, api: f.api }).list({ list: 'playlists' });
    assert.deepEqual(page, { items: [{ kind: 'playlist', id: PLAYLIST, name: 'gym', by: 'colin', count: 12, cover: 'https://i.scdn.co/p300', big: 'https://i.scdn.co/p640', uri: `spotify:playlist:${PLAYLIST}` }], total: 51, more: true });
    assert.deepEqual(f.seen[0], { method: 'GET', path: '/v1/me/playlists', query: { limit: '50', offset: '0' }, auth: 'Bearer tok0', body: null });
  } finally { await f.close(); }
});

test('saved albums and an album\'s tracks; a playlist\'s songs from /items (Spotify\'s 2026 address); its gaps, local files and podcast episodes are left out', async () => {
  const song = (n, extra = {}) => ({ id: String(n).padStart(22, 'T'), name: `song ${n}`, artists: [{ name: 'a' }, { name: 'b' }], duration_ms: 1000 * n, uri: TRACK(n), type: 'track', ...extra });
  const f = await fakeApi({
    'GET /v1/me/albums': () => [200, { total: 1, items: [{ album: { id: ALBUM, name: '(III)', artists: [{ name: 'Crystal Castles' }], total_tracks: 12, images: [{ url: 'u', width: 300 }] } }] }],
    [`GET /v1/albums/${ALBUM}/tracks`]: () => [200, { total: 2, items: [song(1), song(2)] }],
    [`GET /v1/playlists/${PLAYLIST}/items`]: () => [200, { total: 5, items: [{ item: song(3) }, { item: null }, { item: song(4, { is_local: true, uri: 'spotify:local:x' }) }, { item: { ...song(5), type: 'episode' } }, { track: song(6) }] }], // (2026's /items: the song under .item; .track still read)
  });
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    assert.deepEqual((await web.list({ list: 'albums' })).items, [{ kind: 'album', id: ALBUM, name: '(III)', by: 'Crystal Castles', count: 12, cover: 'u', big: 'u', uri: `spotify:album:${ALBUM}` }]);
    const tracks = await web.list({ list: 'album', id: ALBUM, offset: 50 });
    assert.deepEqual(tracks.items[0], { id: '1'.padStart(22, 'T'), name: 'song 1', by: 'a, b', ms: 1000, uri: TRACK(1), cover: '', big: '' });
    assert.equal(f.seen[1].query.offset, '50');
    assert.deepEqual((await web.list({ list: 'playlist', id: PLAYLIST })).items.map((t) => t.name), ['song 3', 'song 6']);
  } finally { await f.close(); }
});

test('nothing outside the list reaches Spotify: other lists, bad ids and bad offsets are refused before any request', async () => {
  const f = await fakeApi({});
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    for (const bad of [{ list: 'me' }, { list: 'constructor' }, { list: '__proto__' }, { list: '../v1/me/player' }]) await assert.rejects(web.list(bad), /nothing else/);
    for (const bad of [{ list: 'album' }, { list: 'album', id: '../../me/player/play' }, { list: 'playlist', id: id('x') + '/x' }]) await assert.rejects(web.list(bad), /isn't a Spotify id/);
    for (const offset of [-1, 1.5, '0', 1e9]) await assert.rejects(web.list({ list: 'liked', offset }), /place in the list/);
    await assert.rejects(web.play({ context: 'spotify:artist:' + id('a') }), /album or playlist/);
    await assert.rejects(web.play({ tracks: ['spotify:episode:' + id('e')] }), /aren't Spotify songs/);
    await assert.rejects(web.play({ tracks: [TRACK(1)], index: 1 }), /place in the list/);
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('play starts the album at that track on the device Spotify says is active', async () => {
  const f = await fakeApi({
    'GET /v1/me/player/devices': () => [200, { devices: [{ id: 'phone', name: 'iPhone', is_active: false }, { id: 'mac', name: 'MacBook', is_active: true, is_restricted: false }] }],
    'PUT /v1/me/player/play': () => [204, null],
  });
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    assert.deepEqual(await web.play({ context: `spotify:album:${ALBUM}`, index: 3 }), { device: 'MacBook' });
    assert.deepEqual(f.seen[1], { method: 'PUT', path: '/v1/me/player/play', query: { device_id: 'mac' }, auth: 'Bearer tok0', body: { context_uri: `spotify:album:${ALBUM}`, offset: { position: 3 } } });
    await web.play({ tracks: [TRACK(1), TRACK(2)], index: 1 });
    assert.deepEqual(f.seen[3].body, { uris: [TRACK(1), TRACK(2)], offset: { position: 1 } });
  } finally { await f.close(); }
});

test('Spotify\'s refusals come back as what to do next', async () => {
  let devices = [], answer = [403, { error: { status: 403, message: 'Player command failed: Premium required', reason: 'PREMIUM_REQUIRED' } }];
  const f = await fakeApi({
    'GET /v1/me/player/devices': () => [200, { devices }],
    'PUT /v1/me/player/play': () => answer,
    'GET /v1/me/tracks': () => [429, { error: { status: 429 } }, { 'Retry-After': '7' }],
  });
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    await assert.rejects(web.play({ context: `spotify:playlist:${PLAYLIST}` }), /Open Spotify on this computer/);
    devices = [{ id: 'mac', name: 'MacBook', is_active: true }];
    await assert.rejects(web.play({ context: `spotify:playlist:${PLAYLIST}` }), /needs Premium/);
    answer = [404, { error: { status: 404, message: 'Player command failed: No active device found', reason: 'NO_ACTIVE_DEVICE' } }]; // (the device went to sleep between the two calls)
    await assert.rejects(web.play({ context: `spotify:playlist:${PLAYLIST}` }), /Open Spotify on this computer/);
    await assert.rejects(web.list({ list: 'liked' }), /slow down: try again in 7 s/);
  } finally { await f.close(); }
});

test('a 401 gets one fresh token and one more try; a second 401 says connect again', async () => {
  const f = await fakeApi({
    'GET /v1/me/albums': (req) => req.auth === 'Bearer tok1' ? [200, { total: 0, items: [] }] : [401, { error: { status: 401, message: 'The access token expired' } }],
    'GET /v1/me/tracks': () => [401, { error: { status: 401 } }],
  });
  try {
    const t = tokens();
    const web = createWebApi({ accessToken: t.accessToken, api: f.api });
    assert.deepEqual(await web.list({ list: 'albums' }), { items: [], total: 0, more: false });
    assert.deepEqual(t.calls, [false, true]);
    await assert.rejects(web.list({ list: 'liked' }), /connect again/);
  } finally { await f.close(); }
});

test('catalog search encodes the query, uses ten results and preserves the raw page offset across filtered tracks', async () => {
  const f = await fakeApi({ 'GET /v1/search': () => [200, { tracks: { total: 21, next: 'next page', items: [
    { id: ALBUM, uri: `spotify:track:${ALBUM}`, name: 'Song', artists: [{ name: 'Artist' }], duration_ms: 9000 },
    { uri: 'spotify:local:unavailable', is_local: true },
  ] } }] });
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    const page = await web.list({ list: 'search', q: ' artist:Air & Moon ', offset: 10 });
    assert.deepEqual(f.seen[0].query, { q: 'artist:Air & Moon', type: 'track', limit: '10', offset: '10' });
    assert.equal(page.items.length, 1); assert.equal(page.next, 20); assert.equal(page.more, true);
    for (const request of [{ q: '' }, { q: {} }, { q: 'a'.repeat(257) }, { q: 'air', offset: -1 }, { q: 'air', offset: 1001 }, { q: 'air', offset: 0.5 }]) {
      await assert.rejects(web.list({ list: 'search', ...request }));
    }
    assert.equal(f.seen.length, 1, 'invalid input never reaches Spotify');
  } finally { await f.close(); }
});

test('the first search page also asks for albums and artists, and each song keeps its popularity and artists', async () => {
  const f = await fakeApi({ 'GET /v1/search': () => [200, {
    tracks: { total: 1, next: null, items: [{ id: ALBUM, uri: `spotify:track:${ALBUM}`, name: 'Song', artists: [{ id: ALBUM, name: 'Artist' }, { id: 'nope', name: 'Other' }], duration_ms: 9000, popularity: 77 }] },
    albums: { items: [{ id: ALBUM, name: 'Album', artists: [{ name: 'Artist' }], images: [], total_tracks: 9 }, { id: 'not an id', name: 'Broken' }] },
    artists: { items: [{ id: ALBUM, name: 'Artist' }] },
  }] });
  try {
    const web = createWebApi({ accessToken: tokens().accessToken, api: f.api });
    const page = await web.list({ list: 'search', q: 'artist', offset: 0 });
    assert.deepEqual(f.seen[0].query, { q: 'artist', type: 'track,album,artist', limit: '10', offset: '0' });
    assert.equal(page.items[0].pop, 77);
    assert.deepEqual(page.items[0].artistIds, [ALBUM], 'only real Spotify ids are kept');
    assert.deepEqual(page.albums.map((a) => [a.kind, a.name, a.by, a.count, a.uri]), [['album', 'Album', 'Artist', 9, `spotify:album:${ALBUM}`]]);
    assert.deepEqual(page.artist, { id: ALBUM, name: 'Artist' });
  } finally { await f.close(); }
});

test('zero-setup search opens only a fixed, encoded Spotify search URL and reports opener failures', async () => {
  const { searchUrl, openSearch } = createRequire(import.meta.url)('../helpers/spotify.cjs');
  const opened = [];
  const query = ' Air & Moon / #? café ';
  const url = 'https://open.spotify.com/search/Air%20%26%20Moon%20%2F%20%23%3F%20caf%C3%A9';
  assert.equal(searchUrl(query), url);
  assert.deepEqual(await openSearch(query, async (address) => opened.push(address)), { url });
  assert.deepEqual(opened, [url]);
  for (const bad of [null, {}, [], 42, '', '  ', 'a'.repeat(257)]) {
    await assert.rejects(openSearch(bad, async () => assert.fail('invalid search opened')));
  }
  assert.equal(new URL(searchUrl('https://evil.test/path')).hostname, 'open.spotify.com');
  await assert.rejects(openSearch('Air', async () => { throw new Error('OS failure'); }), /could not open Spotify search/);
});
