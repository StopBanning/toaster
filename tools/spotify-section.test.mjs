// The library's spotify section: what main gives it (helpers/spotify.cjs: a pasted link read and played, a cover fetched, a fetch that gives
// up; helpers/player.cjs: the Spotify app told to play), what the page asks main for (preload.js and main.js: seven narrow calls, no token),
// and what the section shows (renderer/library.js: its rows, keys and requests, run here on a made-up library through the real Web API
// reader). Nothing here reaches Spotify, Google or any player: the fake Spotify is a server on 127.0.0.1 (tools/spotify-fake.mjs), the
// player's commands go to a runner that sends nothing, and the page itself, on a real copy of the app, is tools/library-check.mjs's.
// Sources are read with LF line endings (a Windows checkout's CRLF would otherwise turn every \n these patterns look for into two characters).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../renderer/library.js';
import { ALBUMS, LIKED, PLAYLISTS, coverUrl, idOf, startFakeSpotify } from './spotify-fake.mjs';

const require = createRequire(import.meta.url);
const S = require('../helpers/spotify.cjs');
const P = require('../helpers/player.cjs');
const { fakeSpotify } = require('../helpers/spotify-fake.cjs');
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const ID = { track: '4cOdK2wGLETKBW3PvgPWqT', album: '4aawyAB9vmqN3uQ7FjRGTy', playlist: '37i9dQZF1DXcBWIGoYBM5M' };
const OSASCRIPT = '/usr/bin/osascript';

// ---------------------------------------------------------------- a pasted link

const GOOD = [
  [`https://open.spotify.com/track/${ID.track}`, 'track', ID.track],
  [`https://open.spotify.com/album/${ID.album}?si=0a1b2c3d4e5f6a7b`, 'album', ID.album],
  [`open.spotify.com/playlist/${ID.playlist}`, 'playlist', ID.playlist],
  [`http://open.spotify.com/track/${ID.track}`, 'track', ID.track],
  [`https://open.spotify.com/intl-de/track/${ID.track}?si=x#y`, 'track', ID.track],
  [`https://open.spotify.com/intl-pt-br/album/${ID.album}/`, 'album', ID.album],
  [`  https://open.spotify.com/album/${ID.album}\n`, 'album', ID.album],
  [`https://OPEN.Spotify.com/playlist/${ID.playlist}`, 'playlist', ID.playlist],
  [`spotify:track:${ID.track}`, 'track', ID.track],
  [`spotify:album:${ID.album}`, 'album', ID.album],
  [`spotify:playlist:${ID.playlist}`, 'playlist', ID.playlist],
];
const BAD = [
  `https://open.spotify.com/artist/${ID.track}`, `https://open.spotify.com/show/${ID.track}`, `https://open.spotify.com/episode/${ID.track}`, `https://open.spotify.com/user/colin`,
  `https://open.spotify.com/embed/track/${ID.track}`, `https://open.spotify.com/track/${ID.track.slice(1)}`, `https://open.spotify.com/track/${ID.track}x`,
  `https://open.spotify.com/track/${ID.track.slice(1)}-`, `https://open.spotify.com/track/${ID.track.slice(1)}_`, 'https://open.spotify.com/track/', 'https://open.spotify.com/', 'https://open.spotify.com',
  `https://open.spotify.com.evil.com/track/${ID.track}`, `https://evil.com/open.spotify.com/track/${ID.track}`, `https://open.spotify.com@evil.com/track/${ID.track}`,
  `https://user:pw@open.spotify.com/track/${ID.track}`, `https://open.spotify.com:8443/track/${ID.track}`, `https://open.spotify.com./track/${ID.track}`, `https://www.open.spotify.com/track/${ID.track}`,
  `https://spotify.com/track/${ID.track}`, `https://spotify.link/${ID.track}`, `ftp://open.spotify.com/track/${ID.track}`, `javascript:alert('open.spotify.com/track/${ID.track}')`,
  `file:///open.spotify.com/track/${ID.track}`, `data:text/html,open.spotify.com/track/${ID.track}`, `spotify:artist:${ID.track}`, `spotify:user:colin:playlist:${ID.playlist}`,
  `spotify:track:${ID.track}:play`, `SPOTIFY:track:${ID.track}`, `spotify:track:${ID.track.slice(1)}`, `spotify:track:${ID.track}x`, `spotify:track:${ID.track} spotify:album:${ID.album}`,
  `https://open.spotify.com/track/${ID.track} https://open.spotify.com/album/${ID.album}`, `open.spotify.com/track/${ID.track}"; do shell script "x`, 'play something', '', '   ',
  `https://open.spotify.com/${'a'.repeat(700)}`, null, undefined, 42, {}, [], [`spotify:track:${ID.track}`], true,
];

test('a pasted link is a track, an album or a playlist, as open.spotify.com or as a spotify: address, and the address that goes on is built from its kind and id', () => {
  for (const [text, kind, id] of GOOD) {
    const want = { kind, id, uri: `spotify:${kind}:${id}` };
    assert.deepEqual(S.parseLink(text), want, text);
    assert.deepEqual(L.parseLink(text), want, `the page reads ${JSON.stringify(text)} as main does`);
  }
});

test('anything else is refused in words: other kinds, other hosts (with the tricks), another place for the id, another scheme', () => {
  for (const text of BAD) {
    assert.throws(() => S.parseLink(text), /That isn't a Spotify link to a song, an album or a playlist/, JSON.stringify(text));
    assert.equal(L.parseLink(text), null, `the page too: ${JSON.stringify(text)}`);
  }
  assert.equal(S.NOT_A_LINK, L.SPOTIFY_NOT_A_LINK, 'the words are the same where the page says them (a browser has no main)');
});

test('openLink reads before it sends, sends the canonical address once, and says in words why the Spotify app could not play it', async () => {
  const sent = [];
  const play = async (uri) => { sent.push(uri); return { ok: true }; };
  assert.deepEqual(await S.openLink(`https://open.spotify.com/album/${ID.album}?si=zzz`, play), { kind: 'album', id: ID.album, uri: `spotify:album:${ID.album}` });
  assert.deepEqual(sent, [`spotify:album:${ID.album}`], 'the address, not the text that was pasted');
  for (const bad of BAD) await assert.rejects(S.openLink(bad, play), /isn't a Spotify link/);
  assert.equal(sent.length, 1, 'none of the bad ones went to the player');
  const uri = `spotify:track:${ID.track}`;
  for (const [why, words] of [['denied', /Automation \(under Spotify\)/], ['failed', /Is the Spotify app on this computer/], ['unsupported', /no way to open Spotify/], ['something else', /Is the Spotify app on this computer/]]) {
    await assert.rejects(S.openLink(uri, async () => ({ ok: false, why })), words, why);
  }
  await assert.rejects(S.openLink(uri, async () => undefined), /Is the Spotify app on this computer/, 'a player that says nothing did not play it');
});

// ---------------------------------------------------------------- the Spotify app told to play

test('on a Mac a pasted link is one AppleScript line telling Spotify to play that address; anywhere else the system\'s link opener gets it', async () => {
  const sent = [], opened = [];
  const run = async (file, args) => { sent.push([file, ...args]); return ''; };
  const mac = P.createPlayerControl({ platform: 'darwin', run, open: async (u) => { opened.push(u); } });
  for (const kind of ['track', 'album', 'playlist']) assert.deepEqual(await mac.playLink(`spotify:${kind}:${ID[kind]}`), { ok: true });
  assert.deepEqual(sent, ['track', 'album', 'playlist'].map((kind) => [OSASCRIPT, '-e', `tell application "Spotify" to play track "spotify:${kind}:${ID[kind]}"`]));
  assert.deepEqual(opened, [], 'a Mac does not use the opener');
  for (const platform of ['win32', 'linux']) {
    const o = [], p = P.createPlayerControl({ platform, run, open: async (u) => { o.push(u); } });
    assert.deepEqual(await p.playLink(`spotify:track:${ID.track}`), { ok: true });
    assert.deepEqual(o, [`spotify:track:${ID.track}`], platform);
  }
  assert.equal(sent.length, 3, 'osascript is asked only on a Mac');
  assert.deepEqual(await P.createPlayerControl({ platform: 'win32', run }).playLink(`spotify:track:${ID.track}`), { ok: false, why: 'unsupported' }, 'no opener, no link');
});

test('only a spotify: address of a track, album or playlist reaches the script or the opener, whoever asks', async () => {
  const sent = [], opened = [];
  const run = async (file, args) => { sent.push([file, ...args]); return ''; };
  const open = async (u) => { opened.push(u); };
  const mac = P.createPlayerControl({ platform: 'darwin', run, open }), win = P.createPlayerControl({ platform: 'win32', run, open });
  for (const bad of [`https://open.spotify.com/track/${ID.track}`, `spotify:artist:${ID.track}`, `spotify:track:${ID.track.slice(1)}`, `spotify:track:${ID.track}" & (do shell script "touch /tmp/x") & "`,
    `spotify:track:${ID.track}\n`, ` spotify:track:${ID.track}`, `spotify:track:${ID.track}"`, 'spotify:track:', '', null, undefined, 7, {}, [`spotify:track:${ID.track}`]]) {
    assert.deepEqual(await mac.playLink(bad), { ok: false, why: 'unsupported' }, JSON.stringify(bad));
    assert.deepEqual(await win.playLink(bad), { ok: false, why: 'unsupported' }, JSON.stringify(bad));
  }
  assert.deepEqual([sent, opened], [[], []], 'nothing went anywhere');
  assert.throws(() => P.macPlayLink(`spotify:track:${ID.track}"`), /not a Spotify address/);
  assert.match(P.macPlayLink(`spotify:album:${ID.album}`), /^tell application "Spotify" to play track "spotify:album:[A-Za-z0-9]{22}"$/);
});

test('macOS saying no is "denied", anything else "failed"; neither throws, on a Mac or off it', async () => {
  const uri = `spotify:playlist:${ID.playlist}`;
  const no = () => { const e = new Error('Command failed: osascript'); e.stderr = 'execution error: Not authorized to send Apple events to Spotify. (-1743)'; throw e; };
  assert.deepEqual(await P.createPlayerControl({ platform: 'darwin', run: async () => no() }).playLink(uri), { ok: false, why: 'denied' });
  assert.deepEqual(await P.createPlayerControl({ platform: 'darwin', run: async () => { throw new Error('spawn /usr/bin/osascript ENOENT'); } }).playLink(uri), { ok: false, why: 'failed' });
  assert.deepEqual(await P.createPlayerControl({ platform: 'darwin', run: () => { throw new Error('now'); } }).playLink(uri), { ok: false, why: 'failed' }, 'a runner that throws at once');
  assert.deepEqual(await P.createPlayerControl({ platform: 'win32', open: async () => { throw new Error('no handler for spotify:'); } }).playLink(uri), { ok: false, why: 'failed' });
});

test('a copy run with --player-dry-run keeps the link it would have played: the script on a Mac, ["open", address] elsewhere; the buttons\' scripts still only answer a player that is running', async () => {
  const uri = `spotify:album:${ID.album}`;
  const dry = P.dryRunner();
  assert.deepEqual(await P.createPlayerControl({ platform: 'darwin', run: dry.run, open: dry.open }).playLink(uri), { ok: true });
  assert.deepEqual(await P.createPlayerControl({ platform: 'win32', run: dry.run, open: dry.open }).playLink(uri), { ok: true });
  assert.deepEqual(dry.sent, [[OSASCRIPT, '-e', `tell application "Spotify" to play track "${uri}"`], ['open', uri]]);
  // playing a link the listener pasted is the one place Toaster starts the app; every script of the player bar still asks first
  for (const action of P.ACTIONS) assert.match(P.macCommand('spotify', action), /^if application "Spotify" is running then tell application "Spotify" to /);
});

// ---------------------------------------------------------------- covers

test('a cover comes only from Spotify\'s picture hosts over https (i.scdn.co, and the mosaic and uploaded playlist covers): the address is checked before anything is asked', async () => {
  for (const url of [coverUrl('(III)'), coverUrl('Lonerism', 640), 'https://i.scdn.co/image/ab67616d00001e02aabbcc', 'https://I.SCDN.CO/image/abc', 'https://mosaic.scdn.co/640/ab67616d00001e02aaaa', 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84bbbb', 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84cccc']) assert.equal(S.isCoverUrl(url), true, url);
  const BADURLS = ['http://i.scdn.co/image/abc', 'https://i.scdn.co.evil.com/image/abc', 'https://evil.com/image/abc', 'https://evil.com/?https://i.scdn.co/image/abc', 'https://i.scdn.co@evil.com/image/abc',
    'https://user:pw@i.scdn.co/image/abc', 'https://i.scdn.co:8443/image/abc', 'https://i.scdn.co./image/abc', 'https://scdn.co/image/abc', 'https://mosaic.scdn.co', 'https://mosaic.scdn.co/640/a?b', 'https://mosaic.scdn.co.evil.com/640/abc',
    'https://image-cdn-xx.spotifycdn.com/image/abc', 'https://i.scdn.co/other/abc', 'https://i.scdn.co', 'file:///etc/passwd', 'data:image/png;base64,AAAA', 'javascript:alert(1)',
    '//i.scdn.co/image/abc', 'i.scdn.co/image/abc', '', 'x'.repeat(500), null, undefined, 5, {}, ['https://i.scdn.co/image/abc']];
  let asked = 0;
  const fetch = async () => { asked++; return new Response(Buffer.from([0xff, 0xd8, 0xff, 0xe0])); };
  for (const url of BADURLS) {
    assert.equal(S.isCoverUrl(url), false, JSON.stringify(url));
    await assert.rejects(S.fetchCover(url, { fetch }), /only from Spotify's own picture server/, JSON.stringify(url));
  }
  assert.equal(asked, 0, 'not one of them was asked for');
  assert.deepEqual(S.COVER_HOSTS, ['i.scdn.co', 'mosaic.scdn.co', 'image-cdn-ak.spotifycdn.com', 'image-cdn-fa.spotifycdn.com'], "Spotify's picture hosts, and only those");
});

test('a cover comes back as a data: address of the picture as served, whatever the server says it is; a redirect is not followed', async () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF'), Buffer.alloc(600, 7)]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(50)]);
  const calls = [];
  const serve = (bytes, type = 'image/jpeg') => async (url, init) => { calls.push([url, init]); return new Response(bytes, { status: 200, headers: { 'content-type': type } }); };
  assert.equal(await S.fetchCover(coverUrl('(III)'), { fetch: serve(jpeg) }), `data:image/jpeg;base64,${jpeg.toString('base64')}`);
  assert.equal(await S.fetchCover(coverUrl('(III)'), { fetch: serve(png, 'application/octet-stream') }), `data:image/png;base64,${png.toString('base64')}`, 'by its bytes, not its header');
  assert.equal(await S.fetchCover(coverUrl('(III)'), { fetch: serve(webp, 'text/plain') }), `data:image/webp;base64,${webp.toString('base64')}`);
  assert.equal(calls[0][0], coverUrl('(III)'));
  assert.equal(calls[0][1].redirect, 'error', 'a cover that moves is not followed');
  assert.ok(calls[0][1].signal instanceof AbortSignal, 'and it can be cut off');
  for (const html of [Buffer.from('<html><script>alert(1)</script></html>'), Buffer.from('GIF89a....'), Buffer.alloc(0), Buffer.from([0xff, 0xd8])]) {
    await assert.rejects(S.fetchCover(coverUrl('x'), { fetch: serve(html, 'image/jpeg') }), /wasn't a picture/, 'a page that says it is a JPEG');
  }
});

test('a cover that is too big, too slow or refused is no cover: the size is capped by its header and by what arrives, the wait by a timer', async () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(500, 9)]);
  await assert.rejects(S.fetchCover(coverUrl('a'), { max: 100, fetch: async () => new Response(jpeg) }), /too big/, 'by what arrives');
  let answer;
  const lying = async () => (answer = new Response(new ReadableStream({ pull(c) { c.enqueue(jpeg); c.close(); } }), { headers: { 'content-length': '999999' } }));
  await assert.rejects(S.fetchCover(coverUrl('a'), { max: 1000, fetch: lying }), /too big/, 'by its header, before it is read');
  assert.equal(answer.bodyUsed, false, 'unread');
  const endless = async () => new Response(new ReadableStream({ pull(c) { c.enqueue(Buffer.alloc(4096, 1)); } }));
  await assert.rejects(S.fetchCover(coverUrl('a'), { max: 20000, fetch: endless }), /too big/, 'a server that never stops is cut off');
  await assert.rejects(S.fetchCover(coverUrl('a'), { fetch: async () => new Response('', { status: 404 }) }), /picture server said 404/);
  const never = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const t0 = Date.now();
  await assert.rejects(S.fetchCover(coverUrl('a'), { wait: 40, fetch: never }), /did not answer in time/);
  assert.ok(Date.now() - t0 < 2000);
});

test('patient gives up on a request that never comes back, and says what went wrong in words; a caller\'s own stop is its own', async () => {
  const hang = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  await assert.rejects(S.patient(hang, 40)('http://x/', {}), /Spotify did not answer in 0 seconds\. Check the connection and try again\./);
  const refused = async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); };
  await assert.rejects(S.patient(refused)('http://x/'), /Toaster could not reach Spotify \(ECONNREFUSED\)\. Check the connection and try again\./);
  await assert.rejects(S.patient(async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED'); })('http://x/'), /could not reach Spotify \(net::ERR_INTERNET_DISCONNECTED\)/);
  const ok = new Response('{}');
  let got;
  assert.equal(await S.patient(async (url, init) => { got = init; return ok; })('http://x/', { method: 'GET' }), ok);
  assert.equal(got.method, 'GET');
  assert.ok(got.signal instanceof AbortSignal);
  const mine = new AbortController();
  const stopped = S.patient(hang)('http://x/', { signal: mine.signal });
  mine.abort(new Error('stopped by the caller'));
  await assert.rejects(stopped, /stopped by the caller/);
});

// ---------------------------------------------------------------- the fake Spotify, and the Web API through it

async function withFake(fn) {
  const fake = await startFakeSpotify();
  try { return await fn(fake, S.createWebApi({ accessToken: async () => `fake-access-${fake.state.tokens}`, api: fake.base })); } finally { await fake.close(); }
}
// what the section holds after its first three asks, shaped as the real reader shapes them
async function library(web) {
  const lists = {};
  for (const name of ['playlists', 'albums', 'liked']) lists[name] = L.addPage(null, await web.list({ list: name }), 0);
  return lists;
}

test('the fake answers as Spotify does, through the same reader: playlists, saved albums and liked songs as rows, with the cover at least 300 wide', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    assert.deepEqual(lists.playlists.items.map((p) => [p.name, p.by, p.count]), PLAYLISTS.map((p) => [p.name, 'colin', p.tracks.length]));
    assert.deepEqual(lists.albums.items.map((a) => [a.name, a.by, a.count]), ALBUMS.map((a) => [a.name, a.artist, a.tracks.length]));
    assert.equal(lists.albums.items[0].cover, coverUrl('(III)', 300));
    assert.ok(S.isCoverUrl(lists.albums.items[0].cover) && lists.playlists.items.every((p) => S.isCoverUrl(p.cover)), 'every cover is one main would fetch');
    assert.equal(lists.liked.total, LIKED.length);
    assert.equal(lists.liked.items[0].name, 'Kerosene');
    assert.equal(lists.liked.items[0].by, 'Crystal Castles');
    const open = await web.list({ list: 'album', id: ALBUMS[0].id });
    assert.deepEqual(open.items.map((t) => t.name).slice(0, 3), ['Plague', 'Kerosene', 'Wrath of God']);
    assert.equal(open.items[1].ms, (3 * 60 + 12) * 1000);
    const pl = await web.list({ list: 'playlist', id: PLAYLISTS[0].id });
    assert.equal(pl.total, PLAYLISTS[0].tracks.length);
    assert.ok(fake.seen.every((r) => r.auth === 'Bearer fake-access-0'), 'every call carried the token');
  });
});

test('play can start a collection at a song by its address, which holds where a playlist\'s gaps would have moved a place', async () => {
  await withFake(async (fake, web) => {
    const album = ALBUMS[0], context = `spotify:album:${album.id}`, track = `spotify:track:${album.tracks[3].id}`;
    assert.deepEqual(await web.play({ context, track }), { device: 'Colin\'s MacBook' });
    const puts = () => fake.seen.filter((r) => r.method === 'PUT');
    assert.deepEqual(puts()[0].body, { context_uri: context, offset: { uri: track } });
    assert.deepEqual(puts()[0].query, { device_id: 'fake-device-1' });
    await web.play({ context });
    assert.deepEqual(puts()[1].body, { context_uri: context, offset: { position: 0 } }, 'and from its start');
    await web.play({ context, index: 2 });
    assert.deepEqual(puts()[2].body, { context_uri: context, offset: { position: 2 } }, 'a place still works');
    const before = fake.seen.length;
    for (const bad of [`spotify:album:${album.id}`, `spotify:artist:${album.id}`, 'spotify:track:short', '', 7, null, {}]) await assert.rejects(web.play({ context, track: bad }), /isn't a Spotify song/, JSON.stringify(bad));
    assert.equal(fake.seen.length, before, 'refused before any request');
  });
});

test('the failures a listener meets come back in words: no Premium, no open player, a slow-down, an expired token (one fresh try) and a connection that is no longer', async () => {
  await withFake(async (fake, web) => {
    const context = `spotify:album:${ALBUMS[0].id}`;
    fake.state.playFails = { status: 403, reason: 'PREMIUM_REQUIRED', message: 'Player command failed: Premium required' };
    await assert.rejects(web.play({ context }), /needs Premium/);
    fake.state.playFails = null;
    fake.state.devices = [];
    await assert.rejects(web.play({ context }), /Open Spotify on this computer and play anything once/);
    fake.state.devices = [{ id: 'd', name: 'phone', is_active: false, is_restricted: false }];
    await assert.rejects(web.play({ context }), /Open Spotify on this computer/, 'a device that is not the active one is not the one to play on');
    fake.state.limit = 1;
    await assert.rejects(web.list({ list: 'playlists' }), /slow down: try again in 7 s/);
  });
  // a token that lapsed early: the 401 gets one new token and the same request again
  const fake = await startFakeSpotify();
  try {
    let tokens = 0;
    const web = S.createWebApi({ api: fake.base, accessToken: async ({ force } = {}) => { if (force) tokens++; return `fake-access-${fake.state.tokens + tokens}`; } });
    fake.state.tokens = 1;
    fake.state.expire401 = 1;
    // (the fake gives out its own numbers: the forced one is fake-access-2, which it takes after a refresh)
    const refreshing = async () => { fake.state.tokens = 2; };
    const web2 = S.createWebApi({ api: fake.base, accessToken: async ({ force } = {}) => { if (force) await refreshing(); return `fake-access-${fake.state.tokens}`; } });
    assert.equal((await web2.list({ list: 'playlists' })).items.length, PLAYLISTS.length);
    assert.equal(fake.seen.filter((r) => r.path === '/v1/me/playlists').length, 2, 'asked twice: refused, then answered');
    void web;
  } finally { await fake.close(); }
});

test('signing in against the fake runs the real PKCE flow through the same wiring main uses: the tokens are kept scrambled, the status has none, and disconnecting forgets them', async () => {
  const fake = await startFakeSpotify();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotify-section-'));
  try {
    const stand = fakeSpotify(fake.base);
    const file = path.join(dir, 'spotify.bin');
    const sp = S.createSpotify({ file, safeStorage: stand.safeStorage, openExternal: stand.openExternal, fetch: S.patient(stand.fetch), accounts: stand.base, port: 0 });
    assert.deepEqual(sp.status(), { connected: false });
    const CLIENT = '0123456789abcdef0123456789abcdef';
    const status = await sp.connect(CLIENT);
    assert.equal(status.connected, true);
    assert.equal(status.clientId, CLIENT);
    assert.doesNotMatch(JSON.stringify(status), /fake-access|fake-refresh/, 'the status has no token');
    const authorize = fake.seen.find((r) => r.path === '/authorize'), token = fake.seen.find((r) => r.path === '/api/token');
    assert.equal(authorize.query.client_id, CLIENT);
    assert.equal(token.form.grant_type, 'authorization_code');
    assert.ok(token.form.code_verifier && !token.form.client_secret, 'a verifier and no secret');
    const kept = fs.readFileSync(file);
    assert.doesNotMatch(kept.toString('latin1'), /fake-access|fake-refresh|access/, 'not in the clear');
    assert.equal(stand.safeStorage.decryptString(kept).includes('fake-access-1'), true, 'but it is what was kept');
    assert.equal(await sp.accessToken(), 'fake-access-1');
    const web = S.createWebApi({ accessToken: sp.accessToken, fetch: S.patient(stand.fetch), api: stand.base });
    assert.equal((await web.list({ list: 'playlists' })).items.length, PLAYLISTS.length);
    assert.equal(sp.disconnect().connected, false);
    assert.equal(fs.existsSync(file), false, 'forgotten');
    // and the fake keeps to this machine: Spotify's own addresses are refused before they are asked
    for (const url of ['https://accounts.spotify.com/authorize?x=1', 'https://api.spotify.com/v1/me', 'http://127.0.0.2:1/x', 'https://example.com/']) assert.throws(() => stand.fetch(url), /does not go to/, url);
  } finally { await fake.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the fake-Spotify switch takes only a loopback address, maps Spotify\'s picture server onto it, and its stand-in for safeStorage scrambles', async () => {
  for (const bad of ['https://127.0.0.1:9351', 'http://localhost:9351', 'http://127.0.0.1', 'http://example.com:9351', 'http://192.168.1.5:9351', 'ftp://127.0.0.1:9351', 'nope', '', undefined]) assert.throws(() => fakeSpotify(bad), /--spotify-fake takes an address like/, String(bad));
  const fake = await startFakeSpotify({ images: { '(III)': { type: 'image/png', bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]) } } });
  try {
    const stand = fakeSpotify(fake.base);
    const data = await S.fetchCover(coverUrl('(III)', 300), { fetch: stand.fetch });
    assert.match(data, /^data:image\/png;base64,/);
    assert.deepEqual(fake.seen.at(-1).path.startsWith('/image/'), true, 'the fake served it');
    await assert.rejects(S.fetchCover(coverUrl('nothing', 300), { fetch: stand.fetch }), /picture server said 404/);
    const secret = Buffer.from('{"access":"abc"}');
    assert.notDeepEqual(stand.safeStorage.encryptString(secret.toString()), secret);
    assert.equal(stand.safeStorage.decryptString(stand.safeStorage.encryptString('{"access":"abc"}')), '{"access":"abc"}');
    assert.equal(stand.safeStorage.isEncryptionAvailable(), true);
  } finally { await fake.close(); }
});

// ---------------------------------------------------------------- what the page asks main for

test('the page has seven Spotify calls and nothing else, none of them a token, and main has a handler for each and no more', () => {
  const preload = read('preload.js'), main = read('main.js');
  const calls = [...preload.matchAll(/^ {2}(spotify\w+): \(([^)]*)\) => ipcRenderer\.invoke\('(spotify:[a-z]+)'((?:, \w+)*)\),$/gm)].map((m) => [m[1], m[2], m[3], m[4]]);
  assert.deepEqual(calls, [
    ['spotifyStatus', '', 'spotify:status', ''], ['spotifyConnect', 'clientId', 'spotify:connect', ', clientId'], ['spotifyDisconnect', '', 'spotify:disconnect', ''],
    ['spotifyList', 'request', 'spotify:list', ', request'], ['spotifyPlay', 'request', 'spotify:play', ', request'], ['spotifyOpen', 'text', 'spotify:open', ', text'], ['spotifyCover', 'url', 'spotify:cover', ', url'],
  ]);
  const code = preload.replace(/\/\/[^\n]*/g, '');
  assert.equal([...code.matchAll(/'spotify:[a-z]+'/g)].length, 7, 'no eighth channel');
  assert.doesNotMatch(code, /ipcRenderer\.on\('spotify/, 'nothing pushed to the page');
  assert.doesNotMatch(code.split('\n').filter((l) => /spotify/i.test(l)).join('\n'), /token|safeStorage|secret/i, 'and no word of a token in what it has');
  const handlers = Object.fromEntries([...main.matchAll(/ipcMain\.handle\('(spotify:\w+)', \(([^)]*)\) =>/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(handlers, { 'spotify:status': '', 'spotify:connect': '_e, clientId', 'spotify:disconnect': '', 'spotify:list': '_e, request', 'spotify:play': '_e, request', 'spotify:open': '_e, text', 'spotify:cover': '_e, url' });
  const block = main.slice(main.indexOf("ipcMain.handle('spotify:status'"), main.indexOf('\n}\n', main.indexOf("ipcMain.handle('spotify:cover'")));
  assert.doesNotMatch(block, /accessToken|access_token|refresh|safeStorage|\.bin/, 'no handler hands a token or the store over');
  assert.match(block, /spotify\(\)\.web\.list\(plainObject\(request\)\)/);
  assert.match(block, /spotify\(\)\.web\.play\(plainObject\(request\)\)/);
  assert.match(block, /require\('\.\/helpers\/spotify\.cjs'\)\.openLink\(text, \(uri\) => player\(\)\.playLink\(uri\)\)/, 'a pasted link goes through the player\'s runner, so a dry-run copy sends nothing');
  assert.match(block, /require\('\.\/helpers\/spotify\.cjs'\)\.fetchCover\(url, \{ fetch: spotify\(\)\.fetch \}\)/);
});

test('main keeps the tokens: safeStorage in the settings folder, the helper loaded when first needed, the fake only in a copy run from source', () => {
  const main = read('main.js');
  const fn = main.slice(main.indexOf('function spotify() {'), main.indexOf('const plainObject'));
  assert.ok(fn.length > 400, 'found it');
  assert.match(fn, /require\('\.\/helpers\/spotify\.cjs'\)/);
  assert.match(fn, /file: path\.join\(app\.getPath\('userData'\), 'spotify\.bin'\)/);
  assert.match(fn, /safeStorage: fake \? fake\.safeStorage : safeStorage,/);
  assert.match(fn, /const fakeAt = app\.isPackaged \? '' : switchValue\('spotify-fake'\) \|\| '';/, 'the installed app never reads the switch');
  assert.match(fn, /require\('\.\/helpers\/spotify-fake\.cjs'\)\.fakeSpotify\(fakeAt\)/);
  assert.match(fn, /const fetch = patient\(fake \? fake\.fetch : \(url, init\) => net\.fetch\(String\(url\), init\)\);/, 'Chromium\'s network stack, with a time limit and words for what fails');
  assert.match(fn, /accessToken: connection\.accessToken/, 'the token is main\'s own, handed to the Web API reader and to nothing else');
  assert.equal(main.split('\n').filter((l) => /accessToken/.test(l)).length, 1, 'and it is named on one line of main.js');
  assert.doesNotMatch(main.slice(0, main.indexOf('function spotify() {')), /require\('\.\/helpers\/spotify(-fake)?\.cjs'\)/, 'not at the top: a copy without helpers/ still starts');
  assert.equal(main.split('\n').filter((l) => /spotify-fake/.test(l) && !l.trim().startsWith('//')).length, 2, 'two lines of code mention it, and both are in this function');
});

test('the Spotify words and numbers in the page are the helper\'s: the redirect and its port, the lists\' page, the logo\'s path', () => {
  const helper = read('helpers/spotify.cjs');
  assert.equal(L.SPOTIFY_REDIRECT, `http://127.0.0.1:${S.PORT}/callback`, 'the redirect the steps say is the one the sign-in listens on');
  assert.equal(S.PORT, 43821);
  assert.equal(L.SPOTIFY_PAGE, Number(helper.match(/^const PAGE = (\d+);/m)[1]), 'the next page starts where the helper\'s page ends');
  assert.equal(L.SPOTIFY_STEPS.length, 5, 'the five steps');
  assert.ok(L.SPOTIFY_STEPS.some((t) => t.includes(L.SPOTIFY_REDIRECT)) && L.SPOTIFY_STEPS.some((t) => /Client ID/.test(t)) && L.SPOTIFY_STEPS.some((t) => /developer\.spotify\.com/.test(t)) && L.SPOTIFY_STEPS.some((t) => /Web API/.test(t)));
  assert.match(L.SPOTIFY_INTRO, /Premium/);
  // the scopes ask for nothing that changes the listener's library (the step above the section says so too)
  assert.ok(!S.SCOPES.some((s) => /modify-private|modify-public|library-modify/.test(s)));
  assert.equal(L.SPOTIFY_ICON.length > 400 && L.SPOTIFY_ICON.startsWith('M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z'), true, 'a circle, with the three arcs');
});

// ---------------------------------------------------------------- what the section shows

const KINDS = (rows) => rows.map((r) => r.kind);
const model = (lists, extra = {}) => ({ links: [], app: true, connected: true, lists, open: null, tracks: {}, ...extra });
const saved = (uri, at, extra = {}) => ({ uri, at, ...extra });

test('the rows: the field for a link and the links pasted; then the Client ID field, or the playlists, the albums, the liked songs and the way to disconnect; a browser stops after the links', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    const links = [saved(`spotify:album:${ID.album}`, 5), saved(`spotify:track:${ID.track}`, 4)];
    // a browser: no sign-in at all
    assert.deepEqual(KINDS(L.spotifyRows({ links, app: false })), ['link', 'saved', 'saved']);
    assert.deepEqual(KINDS(L.spotifyRows({ links: [], app: false })), ['link']);
    // the app, not connected: the field for a Client ID, after the links
    const off = L.spotifyRows({ links, app: true, connected: false });
    assert.deepEqual(KINDS(off), ['link', 'saved', 'saved', 'client']);
    assert.deepEqual(off.map((r) => r.group), ['link', 'links', 'links', 'connect']);
    assert.deepEqual(off.filter((r) => r.kind === 'saved').map((r) => r.n), [0, 1], 'numbered in the order they are shown');
    // connected: each list, then the liked songs, then the one row that goes the other way
    const rows = L.spotifyRows(model(lists, { links }));
    assert.deepEqual(KINDS(rows), ['link', 'saved', 'saved', ...Array(PLAYLISTS.length + ALBUMS.length + 1).fill('coll'), 'disconnect']);
    assert.deepEqual([...new Set(rows.map((r) => r.group))], ['link', 'links', 'playlists', 'albums', 'liked', 'account']);
    assert.deepEqual(rows.filter((r) => r.group === 'playlists').map((r) => r.coll.name), PLAYLISTS.map((p) => p.name));
    assert.deepEqual(rows.filter((r) => r.group === 'albums').map((r) => `${r.coll.name} · ${r.coll.by}`), ALBUMS.map((a) => `${a.name} · ${a.artist}`));
    const liked = rows.find((r) => r.group === 'liked');
    assert.deepEqual([liked.coll.kind, liked.coll.name, liked.coll.count, liked.coll.uri], ['liked', 'liked songs', LIKED.length, '']);
    // nothing liked: no row for it; not yet known: a row with no count
    assert.ok(!L.spotifyRows(model({ ...lists, liked: { items: [], total: 0, more: false } })).some((r) => r.group === 'liked'));
    assert.equal(L.spotifyRows(model({ playlists: lists.playlists })).find((r) => r.group === 'liked').coll.count, 0);
    // every row's key is its own (the cursor is kept by it)
    const keys = rows.map(L.spotifyKey);
    assert.equal(new Set(keys).size, keys.length);
  });
});

test('an open collection\'s songs lead the list, as an open album\'s do in your music (its own row is the head, not in the list again); a list that goes on has a "more" row', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    const album = lists.albums.items[0], playlist = lists.playlists.items[1];
    const tracks = { [L.collKey(album)]: L.addPage(null, await web.list({ list: 'album', id: album.id }), 0), [L.collKey(playlist)]: L.addPage(null, await web.list({ list: 'playlist', id: playlist.id }), 0) };
    const closed = L.spotifyRows(model(lists));
    let rows = L.spotifyRows(model(lists, { open: L.collKey(album), tracks }));
    assert.deepEqual(rows.slice(0, ALBUMS[0].tracks.length).map((r) => [r.kind, r.group, r.index, r.track.name]), ALBUMS[0].tracks.map((t, i) => ['strack', 'songs', i, t.title]), 'the songs first');
    assert.deepEqual(KINDS(rows.slice(ALBUMS[0].tracks.length, ALBUMS[0].tracks.length + 2)), ['link', 'coll'], 'then the field for a link, as ever, and the others');
    assert.equal(rows.length, closed.length + ALBUMS[0].tracks.length - 1, 'the album\'s own row is not there twice: its songs came, it went');
    assert.ok(!rows.some((r) => r.kind === 'coll' && r.coll.id === album.id), 'the head is the album');
    assert.equal(rows.filter((r) => r.kind === 'strack').length, ALBUMS[0].tracks.length, 'only the open one\'s songs');
    rows = L.spotifyRows(model(lists, { open: L.collKey(playlist), tracks }));
    assert.deepEqual(rows.filter((r) => r.kind === 'strack').map((r) => r.track.name), PLAYLISTS[1].tracks.map((t) => t.title));
    assert.ok(rows.some((r) => r.kind === 'coll' && r.coll.id === album.id), 'the albums are still folded below');
    rows = L.spotifyRows(model(lists, { open: 'liked:liked' }));
    assert.deepEqual(rows.filter((r) => r.kind === 'strack').map((r) => r.track.name), LIKED.map((t) => t.title));
    assert.ok(!rows.some((r) => r.group === 'liked'), 'the liked songs\' own row is the head while they are open');
    // not in yet: the open collection has no songs above the field, and no "more"; an open one that is not (any longer) in the lists is no collection
    assert.equal(L.spotifyRows(model(lists, { open: L.collKey(album) })).filter((r) => r.kind === 'strack' || r.kind === 'more').length, 0);
    assert.deepEqual(L.spotifyRows(model(lists, { open: 'album:gone' })).map(L.spotifyKey), closed.map(L.spotifyKey));
    // a browser, or a copy that is not connected, has no collections to open
    assert.deepEqual(KINDS(L.spotifyRows({ links: [], app: false, connected: true, lists, open: L.collKey(album), tracks })), ['link']);
    assert.deepEqual(KINDS(L.spotifyRows({ links: [], app: true, connected: false, lists, open: L.collKey(album), tracks })), ['link', 'client']);
    // a list that has more (120 playlists, 50 in): the row for the next page, after the last of them; the same for an open collection's songs
    const big = { items: lists.playlists.items, total: 120, more: true, next: 50 };
    rows = L.spotifyRows(model({ ...lists, playlists: big }));
    assert.deepEqual(rows.filter((r) => r.kind === 'more').map((r) => [r.list, r.group]), [['playlists', 'playlists']]);
    assert.equal(rows[rows.findIndex((r) => r.kind === 'more') - 1].group, 'playlists');
    const longAlbum = { ...tracks[L.collKey(album)], total: 80, more: true, next: 50 };
    rows = L.spotifyRows(model(lists, { open: L.collKey(album), tracks: { [L.collKey(album)]: longAlbum } }));
    const more = rows.find((r) => r.kind === 'more');
    assert.deepEqual([more.list, more.coll.id, more.group], ['tracks', album.id, 'songs']);
    assert.equal(rows[rows.indexOf(more) - 1].kind, 'strack', 'after the last of the songs that are in');
    assert.equal(new Set(rows.map(L.spotifyKey)).size, rows.length, 'keys stay their own');
    // the same song twice in a playlist still has two keys
    const twice = { items: [tracks[L.collKey(playlist)].items[0], tracks[L.collKey(playlist)].items[0]], total: 2, more: false, next: 50 };
    const dup = L.spotifyRows(model(lists, { open: L.collKey(playlist), tracks: { [L.collKey(playlist)]: twice } })).filter((r) => r.kind === 'strack').map(L.spotifyKey);
    assert.equal(new Set(dup).size, 2);
  });
});

test('the cursor stays on its row when the lists change under it, and goes as near as it can when its row is gone', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    const closed = L.spotifyRows(model(lists));
    const album = lists.albums.items[1];
    const row = closed.findIndex((r) => r.kind === 'coll' && r.coll.id === album.id);
    const key = L.spotifyKey(closed[row]);
    // a link pasted: one more row above it
    const moreLinks = L.spotifyRows(model(lists, { links: [saved(`spotify:track:${ID.track}`, 1)] }));
    assert.equal(L.spotifyAt(moreLinks, key, row), row + 1);
    // the album opened above it: its songs push it down
    const opened = L.spotifyRows(model(lists, { open: L.collKey(lists.albums.items[0]), tracks: { [L.collKey(lists.albums.items[0])]: L.addPage(null, await web.list({ list: 'album', id: lists.albums.items[0].id }), 0) } }));
    assert.equal(L.spotifyAt(opened, key, row), opened.findIndex((r) => L.spotifyKey(r) === key));
    assert.ok(L.spotifyAt(opened, key, row) > row);
    // its row gone: where the cursor was, kept inside the list; no key at all: the same
    assert.equal(L.spotifyAt(closed.slice(0, 3), key, row), 2);
    assert.equal(L.spotifyAt(closed, '', 4), 4);
    assert.equal(L.spotifyAt([], key, 4), 0);
  });
});

test('→ opens a collection (its songs come to the top, the cursor on the first); ← on one of its songs folds it, the cursor on its row among the others', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    const album = lists.albums.items[0], key = L.collKey(album);
    const tracks = { [key]: L.addPage(null, await web.list({ list: 'album', id: album.id }), 0) };
    const closed = L.spotifyRows(model(lists)), open = L.spotifyRows(model(lists, { open: key, tracks }));
    const albumRow = closed.findIndex((r) => r.kind === 'coll' && r.coll.id === album.id);
    assert.deepEqual(L.spotifyUnfold(closed, albumRow), { open: key });
    assert.equal(L.spotifyUnfold(closed, 0), null, 'the field for a link opens nothing');
    assert.equal(L.spotifyUnfold(closed, closed.length - 1), null, 'nor does the disconnect row');
    assert.equal(L.spotifyUnfold(open, 0), null, 'nor does a song');
    assert.deepEqual(L.spotifyFold(open, 0), { open: null, at: `coll:${key}` }, '← on a song folds its album, the cursor on the album');
    assert.deepEqual(L.spotifyFold(open, 11), { open: null, at: `coll:${key}` });
    assert.equal(L.spotifyFold(closed, albumRow), null, 'on a folded one it does nothing');
    assert.equal(L.spotifyFold(open, open.findIndex((r) => r.kind === 'link')), null, 'nor on the field below the songs');
    // the key it names is a row of the folded list: the album is back among the others, and the cursor goes there
    assert.equal(L.spotifyAt(closed, L.spotifyFold(open, 0).at, 0), albumRow);
    // the "more" row of an open collection's songs folds it as a song does
    const longer = L.spotifyRows(model(lists, { open: key, tracks: { [key]: { ...tracks[key], more: true, next: 50 } } }));
    assert.deepEqual(L.spotifyFold(longer, longer.findIndex((r) => r.kind === 'more')), { open: null, at: `coll:${key}` });
    // a "more" row of a list (not of songs) is not one of an album's songs
    assert.equal(L.spotifyFold(L.spotifyRows(model({ ...lists, playlists: { ...lists.playlists, more: true, next: 50 } })), L.spotifyRows(model({ ...lists, playlists: { ...lists.playlists, more: true, next: 50 } })).findIndex((r) => r.kind === 'more')), null);
  });
});

test('what Enter asks main to play: a collection from its start, a song from that song by its address, the liked songs as a list from there; and what it asks is what the helper then sends', async () => {
  await withFake(async (fake, web) => {
    const lists = await library(web);
    const album = lists.albums.items[2], playlist = lists.playlists.items[0], aKey = L.collKey(album), pKey = L.collKey(playlist);
    const tracks = { [aKey]: L.addPage(null, await web.list({ list: 'album', id: album.id }), 0), [pKey]: L.addPage(null, await web.list({ list: 'playlist', id: playlist.id }), 0) };
    const rows = L.spotifyRows(model(lists, { open: aKey, tracks })), folded = L.spotifyRows(model(lists));
    const collOf = (id) => folded.find((r) => r.kind === 'coll' && r.coll.id === id);
    assert.deepEqual(L.spotifyPlay(collOf(album.id), lists.liked), { context: `spotify:album:${album.id}` });
    assert.deepEqual(L.spotifyPlay(collOf(playlist.id), lists.liked), { context: `spotify:playlist:${playlist.id}` });
    const third = rows.filter((r) => r.kind === 'strack')[2];
    assert.deepEqual(L.spotifyPlay(third, lists.liked), { context: `spotify:album:${album.id}`, track: `spotify:track:${ALBUMS[2].tracks[2].id}` });
    const pRows = L.spotifyRows(model(lists, { open: pKey, tracks }));
    assert.deepEqual(L.spotifyPlay(pRows.filter((r) => r.kind === 'strack')[4], lists.liked), { context: `spotify:playlist:${playlist.id}`, track: `spotify:track:${PLAYLISTS[0].tracks[4].id}` });
    const likedRows = L.spotifyRows(model(lists, { open: 'liked:liked' }));
    const likedColl = folded.find((r) => r.group === 'liked' && r.kind === 'coll');
    assert.deepEqual(L.spotifyPlay(likedColl, lists.liked), { tracks: LIKED.map((t) => `spotify:track:${t.id}`), index: 0 });
    assert.deepEqual(L.spotifyPlay(likedRows.filter((r) => r.kind === 'strack')[5], lists.liked), { tracks: LIKED.slice(5).map((t) => `spotify:track:${t.id}`), index: 0 }, 'from that one on');
    assert.equal(L.spotifyPlay(likedColl, undefined), null, 'not in yet: nothing to play');
    for (const kind of ['link', 'saved', 'client', 'more', 'disconnect']) assert.equal(L.spotifyPlay({ kind }, lists.liked), null, kind);
    const hundred = { items: Array.from({ length: 130 }, (_, i) => ({ uri: `spotify:track:${idOf(`t${i}`)}` })), total: 130 };
    assert.equal(L.spotifyPlay({ kind: 'strack', coll: L.SPOTIFY_LIKED, index: 10, track: {} }, hundred).tracks.length, 100, 'a hundred songs at most');
    // the helper takes every one of those requests, and sends what the page meant
    for (const request of [L.spotifyPlay(collOf(album.id)), L.spotifyPlay(third), L.spotifyPlay(pRows.filter((r) => r.kind === 'strack')[4]), L.spotifyPlay(likedRows.filter((r) => r.kind === 'strack')[5], lists.liked)]) await web.play(request);
    const bodies = fake.seen.filter((r) => r.method === 'PUT').map((r) => r.body);
    assert.deepEqual(bodies[0], { context_uri: `spotify:album:${album.id}`, offset: { position: 0 } });
    assert.deepEqual(bodies[1], { context_uri: `spotify:album:${album.id}`, offset: { uri: `spotify:track:${ALBUMS[2].tracks[2].id}` } });
    assert.deepEqual(bodies[2], { context_uri: `spotify:playlist:${playlist.id}`, offset: { uri: `spotify:track:${PLAYLISTS[0].tracks[4].id}` } });
    assert.deepEqual(bodies[3], { uris: LIKED.slice(5).map((t) => `spotify:track:${t.id}`), offset: { position: 0 } });
  });
});

test('pages of a list add on: the first replaces, a later one adds, a collection that comes twice is kept once, and the next page starts 50 on', () => {
  const item = (n) => ({ kind: 'playlist', id: `id${n}`, uri: `spotify:playlist:id${n}` });
  const first = L.addPage({ items: [item(0)], total: 1, more: false }, { items: [item(1), item(2)], total: 120, more: true }, 0);
  assert.deepEqual(first, { items: [item(1), item(2)], total: 120, more: true, next: 50 });
  const second = L.addPage(first, { items: [item(2), item(3)], total: 120, more: true }, 50);
  assert.deepEqual(second.items.map((i) => i.id), ['id1', 'id2', 'id3'], 'id2 came twice');
  assert.equal(second.next, 100);
  assert.deepEqual(L.addPage(second, { items: [], total: 0, more: false }, 0), { items: [], total: 0, more: false, next: 50 });
  const song = { id: 's', name: 'x', uri: 'spotify:track:s' };
  assert.equal(L.addPage({ items: [song], total: 2 }, { items: [song], total: 2, more: false }, 50).items.length, 2, 'the same song twice in a playlist stays twice');
  assert.deepEqual(L.addPage(null, { items: [], total: undefined, more: undefined }, 0), { items: [], total: 0, more: false, next: 50 });
});

test('the links pasted are kept as the radio\'s stations are: the latest first, once each, only Spotify\'s three kinds, named once the player has shown the song', () => {
  const a = `spotify:album:${ID.album}`, t = `spotify:track:${ID.track}`, p = `spotify:playlist:${ID.playlist}`;
  assert.deepEqual(L.readLinks([saved(t, 1), saved(a, 3), saved(p, 2)]).map((l) => l.uri), [a, p, t], 'the latest first');
  assert.deepEqual(L.readLinks([saved(a, 1), saved(a, 9)]).map((l) => l.at), [1], 'once each');
  for (const junk of [null, undefined, 'x', 5, {}, [null], [{}], [{ uri: 5 }], [{ uri: `spotify:artist:${ID.album}` }], [{ uri: 'https://open.spotify.com/track/' + ID.track }], [{ uri: `spotify:track:${ID.track}x` }]]) assert.deepEqual(L.readLinks(junk), [], JSON.stringify(junk));
  assert.deepEqual(L.readLinks([{ uri: a }]), [{ uri: a, at: 0 }], 'one with no time is from before');
  assert.deepEqual(L.readLinks([{ uri: a, at: 1, title: '  Kerosene ', artist: 'Crystal   Castles' }]), [{ uri: a, at: 1, title: 'Kerosene', artist: 'Crystal Castles' }]);
  assert.deepEqual(L.readLinks([{ uri: a, at: 1, title: '', artist: 'x' }]), [{ uri: a, at: 1 }], 'an artist without a title is no name');
  assert.equal(L.readLinks(Array.from({ length: 50 }, (_, i) => saved(`spotify:track:${idOf(i)}`, i))).length, 30, 'thirty at most');
  // played now: first, with the name it had
  const named = [{ uri: a, at: 1, title: 'Plague', artist: 'Crystal Castles' }, saved(t, 2)];
  assert.deepEqual(L.noteLink(named, a, 9).map((l) => [l.uri, l.at, l.title]), [[a, 9, 'Plague'], [t, 2, undefined]]);
  assert.deepEqual(L.noteLink([], p, 5), [{ uri: p, at: 5 }]);
  assert.equal(L.noteLink(Array.from({ length: 30 }, (_, i) => saved(`spotify:track:${idOf(i)}`, i)), p, 99).length, 30);
  // named by the song the player showed (an artist it did not give is no artist)
  assert.deepEqual(L.nameLink([saved(a, 1), saved(t, 2)], a, { title: 'Plague', artist: 'Crystal Castles' }), [{ uri: a, at: 1, title: 'Plague', artist: 'Crystal Castles' }, saved(t, 2)]);
  assert.deepEqual(L.nameLink([{ uri: a, at: 1, title: 'Old', artist: 'Someone' }], a, { title: 'New', artist: '' }), [{ uri: a, at: 1, title: 'New' }]);
  assert.deepEqual(L.nameLink([saved(a, 1)], a, null), [saved(a, 1)]);
  assert.deepEqual(L.nameLink([saved(a, 1)], t, { title: 'x' }), [saved(a, 1)], 'another link is none of its business');
  // and a link's row: its name and who by once it has them, else what kind it is and its id; when it was played
  const now = 10 * 60000;
  assert.deepEqual(L.linkParts({ uri: a, at: now - 5 * 60000, title: 'Plague', artist: 'Crystal Castles' }, now), { kind: 'album', name: 'Plague', by: 'Crystal Castles', named: true, note: 'album · 5 min ago' });
  assert.deepEqual(L.linkParts({ uri: t, at: now - 120000 }, now), { kind: 'track', name: 'track', by: ID.track, named: false, note: '2 min ago' });
  assert.equal(L.linkParts({ uri: p, at: 0 }, now).note, '');
});

test('the words: a collection\'s line, the Spotify errors as main said them, the logo\'s colour by the background', () => {
  assert.equal(L.collLine({ kind: 'album', by: 'Crystal Castles', count: 12 }), 'Crystal Castles · 12 tracks');
  assert.equal(L.collLine({ kind: 'playlist', by: '', count: 1 }), '1 track');
  assert.equal(L.collLine({ kind: 'liked', by: '', count: 1234 }), '1,234 songs');
  assert.equal(L.collLine({ kind: 'liked', by: '', count: 1 }), '1 song');
  assert.equal(L.plainError(new Error("Error invoking remote method 'spotify:play': Error: Spotify says starting songs from Toaster needs Premium.")), 'Spotify says starting songs from Toaster needs Premium.');
  assert.equal(L.plainError(new Error('Spotify wants you to connect again.')), 'Spotify wants you to connect again.');
  assert.equal(L.plainError('plain'), 'plain');
  assert.equal(L.plainError(null), 'null');
  // Spotify's logo is white or black, never the theme's colour: black where the background is light
  for (const [bg, tone] of [['#051db5', 'dark'], ['#000', 'dark'], ['#010a03', 'dark'], ['#16000d', 'dark'], ['#fff', 'light'], ['#ffffff', 'light'], ['#d8d8d8', 'light'], ['rgb(255, 255, 255)', 'light'],
    ['rgb(5, 29, 181)', 'dark'], ['rgba(250,250,250,.9)', 'light'], ['#e8d9a0', 'light'], ['#6b1d1d', 'dark'], ['', 'dark'], ['var(--bg)', 'dark'], [undefined, 'dark']]) assert.equal(L.logoTone(bg), tone, String(bg));
});

// ---------------------------------------------------------------- how the section is wired

const panel = read('renderer/library-panel.js'), app = read('renderer/app.js'), css = read('renderer/style.css');
const spotifyPart = panel.slice(panel.indexOf('// ---------------------------------------------------------------- spotify'), panel.indexOf("// find's rows:"));
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);

test('the spotify tab comes after your music, and the section is in every place the others are: rows, head, meta, list, keys, Tab, click and Enter', () => {
  assert.deepEqual(L.SECTIONS.map((s) => s[0]), ['music', 'spotify', 'radio', 'scenes']);
  assert.match(panel, /if \(S\.section === 'spotify'\) return spRows\(\);/);
  assert.match(panel, /\} else if \(S\.section === 'spotify'\) \{\s*html = spHead\(\);/);
  assert.match(panel, /if \(S\.section === 'spotify'\) \{ parts\.meta\.innerHTML = spMeta\(\); return; \}/);
  assert.match(panel, /else if \(S\.section === 'spotify'\) parts\.list\.innerHTML = spList\(r, now\);/);
  assert.match(panel, /if \(S\.section === 'spotify'\) \{ spSide\(dir\); return; \}/);
  assert.match(panel, /if \(id === 'spotify'\) spEnter\(\);/);
  assert.match(panel, /if \(S\.section === 'spotify'\) spEnter\(\);\s*\}/, 'and when the library opens on it');
  for (const kind of ['link', 'client']) assert.ok(panel.includes(`row.kind === '${kind}'`), kind);
  assert.match(panel, /else if \(row\.kind === 'saved'\) spOpenLink\(row\.link\.uri\);/);
  assert.match(panel, /else if \(row\.kind === 'coll' \|\| row\.kind === 'strack'\) spPlayRow\(row\);/);
  assert.match(panel, /else if \(row\.kind === 'more'\) spMore\(row\);/);
  assert.match(panel, /else if \(row\.kind === 'disconnect'\) spDisconnect\(\);/);
  assert.match(panel, /else if \(row\?\.kind === 'coll'\) spToggle\(row\);/, 'a click opens a collection, as it opens an album');
  // the keys the others have, said as they go: the arrows open, and the queue's two modes are not offered
  assert.match(panel, /S\.section === 'spotify' \? '←→ open' : ''/);
  assert.match(panel, /\.\.\.\(S\.section === 'spotify' \? \[\] : \['shift\+R repeat', 'shift\+S shuffle'\]\)/);
  // the onKey is as it was: nothing of the spotify section takes a key of its own that the others don't
  const onKey = panel.slice(panel.indexOf('function onKey(e) {'), panel.indexOf("win.addEventListener('keydown', onKey, true);"));
  assert.doesNotMatch(onKey, /spotify|sp[A-Z]/);
});

test('what main says is shown as it is said, over the list; nothing is repainted while a field is typed in; two fields, the right one is the one finished', () => {
  assert.doesNotMatch(spotifyPart, /host\.fail/, 'errors are shown in the section, not as the page\'s box that takes the keys');
  assert.match(spotifyPart, /X\.error = plainError\(err\);/);
  // in its own place under the line, not at the top of the list, where a list scrolled down to the song that was refused would hide it
  assert.match(panel, /<div class="lib-meta"><\/div>\s*<div class="lib-note lib-line lib-err" role="alert" hidden><\/div>\s*<div class="lib-find"/);
  assert.match(panel, /parts\.err\.textContent = S\.section === 'spotify' \? X\.error : '';\s*parts\.err\.hidden = !parts\.err\.textContent;/, 'as text (main\'s words, never markup), and only on this tab');
  assert.match(spotifyPart, /let group = null, html = '';/, 'and not in the list');
  // it stands till the next thing asked, which takes it away: a list's page and a collection's songs as a play does
  assert.match(spotifyPart, /async function spLoad\(name, offset = 0\) \{\s*const gen = X\.gen, old = X\.lists\[name\];\s*X\.error = '';/);
  assert.match(spotifyPart, /const gen = X\.gen, key = collKey\(coll\), old = X\.tracks\[key\];\s*X\.error = '';/);
  // a collection opened whose songs could not be had folds again onto its row, so that → can ask again (open, it has no row and no songs to fold from)
  assert.match(spotifyPart, /function spUnopen\(coll\) \{\s*if \(X\.open !== collKey\(coll\) \|\| spSongsIn\(coll\)\) return false;\s*X\.open = null;\s*X\.cursorKey = `coll:\$\{collKey\(coll\)\}`;\s*return true;\s*\}/);
  assert.match(spotifyPart, /const folded = spUnopen\(coll\);\s*spFail\(err\);\s*if \(folded\) spShowCursor\(\);/, 'and the row it folds back onto is brought into view');
  assert.match(spotifyPart, /await spLoad\('liked', offset\);\s*if \(X\.error && !spSongsIn\(coll\)\) \{ if \(spUnopen\(coll\)\) \{ spRepaint\(\); spShowCursor\(\); \} return; \}/);
  assert.doesNotMatch(spotifyPart, /lib-err/);
  assert.match(spotifyPart, /if \(S\.typing\) \{ X\.dirty = true; return; \}/);
  assert.match(panel, /if \(X\.dirty\) \{ X\.dirty = false; spRepaint\(\); \}/);
  assert.match(panel, /const here = from \|\| doc\.activeElement;/);
  assert.match(panel, /finishInput\(e\.target\.matches\('\.lib-address'\) \? false : true, e\.target\)/);
  assert.match(panel, /input\?\.dataset\.field === 'link'\) \{\s*if \(commit && value\.trim\(\)\) spOpenLink\(value\); else X\.draft\.link = value;/);
  assert.match(panel, /input\?\.dataset\.field === 'client'\) \{\s*if \(commit && value\.trim\(\)\) spConnect\(value\.trim\(\)\); else X\.draft\.client = value;/);
  // an error that says the sign-in is gone puts the Client ID field back
  assert.match(spotifyPart, /if \(\/connect again\/i\.test\(X\.error\)\) spClear\(\);/);
  // nothing happens by itself: a link is played on Enter (the field's, or on a saved link), and nothing is pasted-and-run
  assert.doesNotMatch(spotifyPart, /addEventListener\('(paste|input|change)'/);
});

test('a cover is shown as Spotify gives it, only resized: a data: address from main, never an address the page fetched, never filtered, faded, masked or drawn in characters', () => {
  assert.match(spotifyPart, /const spCover = \(url, cls = ''\) => `<i class="lib-cover real \$\{cls\}"\$\{url \? ` data-sp="\$\{esc\(url\)\}"` : ''\}><\/i>`;/, 'the address is an attribute to ask main with, not a source');
  const sources = [...spotifyPart.matchAll(/\.src = ([^;]+);/g)].map((m) => m[1]);
  assert.deepEqual(sources, ['data', 'data'], 'the only picture source, in the two places a cover is shown (a row\'s or the head\'s, and the big one), is the data: address main gave');
  assert.match(spotifyPart, /\.then\(\(data\) => \{\s*if \(gen !== X\.gen \|\| typeof data !== 'string'\) return;/);
  assert.doesNotMatch(spotifyPart, /glyphMask|glyphRows|imageOf|canvas|getImageData|new Image/, 'no covers in characters for Spotify');
  assert.match(panel, /if \(el\.dataset\.sp !== undefined\) \{ spCoverOn\(el\); return; \}/, 'a real cover never goes the way of a glyph cover');
  const rules = css.slice(css.indexOf('/* spotify: its covers as Spotify gives them'), css.indexOf('/* a wide window: the panel down the left'));
  assert.ok(rules.length > 800, 'found the block');
  const real = [...rules.matchAll(/#library [^{]*\.lib-cover\.real[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join(' ');
  assert.match(real, /border-radius: 4px/, 'rounded corners');
  assert.doesNotMatch(real, /filter|opacity|mask|blend|transform|backdrop|clip-path|mix-blend/, 'nothing that alters the picture');
  assert.doesNotMatch(rules.replace(/\/\*[\s\S]*?\*\//g, ''), /\.lib-cover\.real[^{]*\s*\{[^}]*(filter|opacity)/);
  // the big one, at the right of a wide window: the same picture, in a box, with nothing done to it; no glyph art of another cover behind this tab
  const wide = css.slice(css.indexOf('@media (min-width: 900px) and (min-aspect-ratio: 5/4) {'));
  const big = [...wide.matchAll(/#library \.lib-bigcover[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join(' ');
  assert.match(big, /display: block/);
  assert.match(wide, /#library \.lib-bigcover img \{[^}]*width: min\(100%, 640px\);[^}]*border-radius: 8px;[^}]*\}/, 'never larger than the 640 pixels Spotify gives, with the 8 px corners its guidelines give large artwork');
  // Spotify's biggest picture of the open collection (main names it big), asked for once it is open; the row's till it comes
  assert.match(spotifyPart, /want = coll\?\.big \|\| coll\?\.cover;/);
  assert.match(spotifyPart, /const data = \(want && X\.covers\.get\(want\)\) \|\| \(coll\?\.cover && X\.covers\.get\(coll\.cover\)\);/);
  assert.doesNotMatch(wide.match(/#library \.lib-bigcover img \{[^}]*\}/)[0], /filter|opacity|mask|blend|transform|backdrop|clip-path/);
  assert.match(css, /#library \.lib-bigcover \{ display: none; \}/, 'and nowhere else');
  assert.match(panel, /const id = S\.section === 'spotify' \? null : openAlbum\(\)\?\.cover \|\| null, token = \+\+S\.artToken;/, 'no covers in characters on this tab, nor another album\'s behind it');
  assert.match(panel, /paintTabs\(\); paintHead\(\); paintMeta\(\); paintList\(\); paintKeys\(\); paintArt\(\); paintBig\(\);\s*S\.listSig = listSig\(\);/, 'the art follows the section');
  // kept in memory only, and a hundred and fifty at most
  assert.doesNotMatch(spotifyPart, /localStorage|sessionStorage|indexedDB|caches\.|writeFile/, 'nothing of Spotify\'s is kept past the app\'s life');
  assert.match(spotifyPart, /while \(X\.covers\.size > 150\) X\.covers\.delete\(X\.covers\.keys\(\)\.next\(\)\.value\);/);
});

test('whose it is: Spotify\'s logo (its icon, in the head, white or black by the background) and "on Spotify", which plays an open collection in the Spotify app', () => {
  assert.match(spotifyPart, /const logo = \(\) => `<svg class="lib-logo" viewBox="0 0 24 24" role="img" aria-label="Spotify"><path d="\$\{SPOTIFY_ICON\}"\/><\/svg>`;/);
  assert.ok((spotifyPart.match(/on Spotify/g) || []).length >= 4, 'said in the head, over an open collection and in what is said after a play');
  assert.match(spotifyPart, /data-do="onspotify" title="play this in the Spotify app">\$\{logo\(\)\}<span class="lib-line">play on Spotify<\/span><\/button>/, 'in one of the three wordings its guidelines give a link back to the app');
  assert.match(spotifyPart, /const sub = !sp\.app \? 'web player' : X\.status\?\.connected \? 'connected' : 'not connected';/, 'the head under the logo says how it stands');
  assert.match(panel, /const mark = e\.target\.closest\('\[data-do="onspotify"\]'\), coll = mark && spOpenColl\(\);/);
  assert.match(panel, /sp\.open\(coll\.uri, parseLink\(coll\.uri\)\)/, 'the same way a pasted link goes');
  assert.match(panel, /root\.dataset\.tone = logoTone\(win\.getComputedStyle\(doc\.documentElement\)\.getPropertyValue\('--bg'\)\);/);
  const rules = css.slice(css.indexOf('/* spotify: its covers as Spotify gives them'), css.indexOf('/* a wide window: the panel down the left'));
  assert.match(rules, /#library \.lib-onspot \.lib-logo \{ flex: none; width: max\(21px, 1\.9em\); height: max\(21px, 1\.9em\); \}/, 'never under the 21 pixels its guidelines ask for');
});

test('the steps to connect are drawn from library.js\'s five, with the redirect marked and a button to copy it; the Client ID field is the one thing to fill', () => {
  assert.match(spotifyPart, /SPOTIFY_STEPS\.map\(\(t, k\) => /);
  assert.match(spotifyPart, /esc\(t\)\.replace\(rd, `<b>\$\{rd\}<\/b>`\)/);
  assert.match(spotifyPart, /t\.includes\(SPOTIFY_REDIRECT\) \? `<button type="button" class="lib-copy" data-do="copy" data-text="\$\{rd\}"/);
  assert.match(spotifyPart, /field\('client', 'paste your Client ID, then enter', 'your Spotify Client ID', X\.draft\.client\)/);
  assert.match(spotifyPart, /field\('link', 'paste a Spotify link, then enter', 'a Spotify link', X\.draft\.link\)/);
  assert.match(spotifyPart, /win\.navigator\.clipboard\.writeText\(text\)/);
});

test('Ctrl+K opens the library on spotify, as it opens it on find: "library: spotify", in the full window only', () => {
  assert.match(app, /\{ id: 'library:spotify', name: 'library: spotify', aliases: \['spotify', 'playlists', 'paste a spotify link', 'connect spotify'\], run: \(\) => \{ if \(WIDGET \|\| state\.mini\) \{ toggleLibrary\(\); return; \} closeMenu\(\); return libraryPanel\.open\('spotify'\); \} \},/);
});

test('the page keeps the links with the other settings, names one from the song Spotify\'s player shows next, and takes the system\'s sound for what Spotify plays', () => {
  const saved = app.match(/const SAVED = \[([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.ok(saved.includes('spotifyLinks'));
  assert.match(app, /^  spotifyLinks: \[\],/m);
  assert.match(app, /state\.spotifyLinks = readLinks\(state\.spotifyLinks\);/);
  assert.match(app, /import \{ lazyLibrary, queueLine, queueNext, queueOf, queuePrevious, readScenes, readStations, noteStation, sceneIsOn, setupOf, readLinks, noteLink, nameLink,/, 'from library-core.js, which the page has from the start');
  // naming: before the early return for a title it has had, so a song that is the same title as before is still looked at; only from Spotify, only for a minute and a half
  assert.match(app, /const key = song \? song\.title\.trim\(\)\.toLowerCase\(\) : '';\s*nameTheLink\(song, key\);\s*if \(!key \|\| key === state\.winKey\) return;/);
  const name = app.slice(app.indexOf('function nameTheLink('), app.indexOf('\n}\n', app.indexOf('function nameTheLink(')) + 3);
  assert.match(name, /if \(!song \|\| !\/spotify\/i\.test\(song\.app \|\| ''\) \|\| key === linkNaming\.was\) return;/);
  assert.match(app, /linkNaming = \{ uri: played\.uri, was: state\.winKey, until: Date\.now\(\) \+ 90000 \};/);
  assert.ok(app.indexOf('let linkNaming = null;') < app.indexOf('function nowPlaying(info) {'), 'declared before nowPlaying, which can be called while the page is still loading');
  // the host the panel is given: the app's bridge when it has the calls, a browser's tab when it hasn't
  const host = app.slice(app.indexOf('      spotify: {'), app.indexOf('      stations: () => state.radioStations,'));
  for (const member of ['get app()', 'links: () => state.spotifyLinks', 'open: spotifyOpen', 'status:', 'connect:', 'disconnect:', 'list:', 'play: spotifyPlay', 'cover:']) assert.ok(host.includes(member), member);
  assert.match(app, /const spotifyBridge = \(\) => \(desktopApp\(\) && typeof window\.nc\.spotifyList === 'function' \? window\.nc : null\);/);
  assert.match(app, /const hearSystem = \(\) => \{ if \(state\.source !== 'system'\) useSystem\(\)\.catch\(showError\); \};/);
  assert.match(body('spotifyOpen').replace(/^async /, ''), /const played = nc \? await nc\.spotifyOpen\(text\) : link;/);
  assert.match(app, /window\.open\(`https:\/\/open\.spotify\.com\/\$\{played\.kind\}\/\$\{played\.id\}`, '_blank', 'noopener'\);/, 'a browser opens the web player, in a new tab it keeps no hold of');
  assert.match(app, /const said = await spotifyBridge\(\)\.spotifyPlay\(request\);\s*hearSystem\(\);/);
  // the page's security policy is as it was: a cover is a data: image, so none from another server is allowed
  const csp = read('renderer/index.html').match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
  assert.match(csp, /img-src 'self' data: blob:;/);
  assert.doesNotMatch(csp, /scdn|spotify/);
});
