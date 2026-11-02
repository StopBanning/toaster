// Spotify, connected with the listener's own Client ID (the library's spotify section, its second tier): the sign-in and
// the tokens, all in main, so the page never sees a token. Plain functions, so the tests can run them against a fake
// accounts server.
//
// The sign-in is Spotify's authorization code flow with PKCE, which needs no client secret (a desktop app can't keep one):
// a random verifier, its SHA-256 as the challenge, and a random state. The system browser opens Spotify's authorize page;
// Spotify sends the browser back to http://127.0.0.1:43821/callback with a code (the redirect each listener registers on
// their own developer app, so the port is fixed); a server on that port, up only for the five minutes it waits, checks the
// state, and the code is swapped for tokens with the verifier. The tokens are kept encrypted with Electron's safeStorage in
// the settings folder, refreshed when they lapse; disconnect forgets them.
//
// Below the sign-in and the Web API are the rest of what the library's spotify section asks main for: a pasted link read and played in
// the Spotify app (the first tier, which needs no sign-in at all: parseLink, openLink), a cover fetched for the page (its security policy
// keeps out pictures from other servers: isCoverUrl, fetchCover), and a fetch that gives up, and says so in words (patient).

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ACCOUNTS = 'https://accounts.spotify.com';
const PORT = 43821;
const WAIT = 5 * 60 * 1000;
// What the library asks for: your playlists and saved albums and songs (to list them), and what's playing and the player
// (to start a track on the device Spotify has open). Nothing that changes your library.
const SCOPES = ['playlist-read-private', 'user-library-read', 'user-read-playback-state', 'user-modify-playback-state'];
// A Client ID, from the app's page on developer.spotify.com: 32 hexadecimal digits.
const CLIENT_ID = /^[0-9a-f]{32}$/i;

const b64url = (bytes) => bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const challengeOf = (verifier) => b64url(crypto.createHash('sha256').update(verifier).digest());

// A verifier (64 characters of the URL-safe alphabet, inside the 43 to 128 PKCE allows), its challenge, and a state.
function pkce(random = crypto.randomBytes) {
  const verifier = b64url(random(48));
  return { verifier, challenge: challengeOf(verifier), state: b64url(random(16)) };
}

const redirectFor = (port) => `http://127.0.0.1:${port}/callback`;

function authorizeUrl({ clientId, challenge, state, port = PORT, scopes = SCOPES, accounts = ACCOUNTS }) {
  const url = new URL('/authorize', accounts);
  url.search = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: redirectFor(port),
    code_challenge_method: 'S256', code_challenge: challenge, state, scope: scopes.join(' '),
  }).toString();
  return url.toString();
}

// The page the browser shows after Spotify sends it back: it says what happened, and that the tab can go.
function page(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close', 'Cache-Control': 'no-store' });
  return `<!doctype html><meta charset="utf-8"><title>Toaster</title><body style="font:16px/1.5 ui-monospace,monospace;background:#0b0b0d;color:#e8e6e3;padding:3em">${text}</body>`;
}

// Waits on 127.0.0.1 (never any other address) for Spotify's redirect: { ready, code, close }. ready resolves with the
// port once it listens (a busy port rejects it); code resolves with the code once a request to /callback carries this
// sign-in's state. A request with another state (a stray tab, or a page trying its luck) gets a 400 and the wait goes on;
// Spotify's error (the listener said no) ends it. After five minutes, or close(), it ends, and the server is closed.
function listenForCode({ state, port = PORT, wait = WAIT }) {
  let settle, timer;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method !== 'GET' || url.pathname !== '/callback') { res.writeHead(404, { Connection: 'close' }).end(); return; }
    const got = url.searchParams;
    if (got.get('state') !== state) { res.end(page(res, 400, 'This link is not from the sign-in Toaster started. Go back to Toaster and connect again.')); return; }
    if (got.get('error')) {
      const said = got.get('error').replace(/[^a-z_]/gi, ''); // (OAuth's error codes are words with underscores; nothing else reaches the page)
      const why = said === 'access_denied' ? 'you said no on Spotify\'s page' : `Spotify said ${said || 'no'}`;
      res.end(page(res, 200, 'Toaster is not connected: ' + why + '. You can close this tab.'), () => settle(new Error(`Not connected: ${why}.`)));
      return;
    }
    const code = got.get('code');
    if (!code) { res.end(page(res, 400, 'Spotify sent no code. Go back to Toaster and connect again.')); return; }
    res.end(page(res, 200, 'Toaster is connected to Spotify. You can close this tab.'), () => settle(null, code));
  });
  const code = new Promise((resolve, reject) => {
    settle = (err, value) => {
      settle = () => {};
      clearTimeout(timer);
      server.close();
      server.closeAllConnections();
      if (err) reject(err); else resolve(value);
    };
  });
  code.catch(() => {}); // (whoever awaits it sees the error; an unawaited one isn't an unhandled rejection)
  const ready = new Promise((resolve, reject) => {
    server.once('error', (err) => {
      const e = err.code === 'EADDRINUSE' ? new Error(`Port ${port} is busy, so Spotify can't send the sign-in back. Close whatever uses it (another Toaster?) and connect again.`) : err;
      reject(e); settle(e);
    });
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
  timer = setTimeout(() => settle(new Error('Not connected: the sign-in waited five minutes. Connect again when you\'re ready.')), wait);
  return { ready, code, close: () => settle(new Error('Not connected: the sign-in was stopped.')) };
}

// One request to the accounts service's token endpoint (a form, as OAuth asks): the tokens, or Spotify's reason in words.
async function tokenRequest(params, { fetch = globalThis.fetch, accounts = ACCOUNTS } = {}) {
  const res = await fetch(new URL('/api/token', accounts), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    const err = new Error(`Spotify said no: ${body.error_description || body.error || `HTTP ${res.status}`}.`);
    err.oauth = body.error || '';
    throw err;
  }
  return body;
}

const exchange = ({ clientId, code, verifier, port = PORT }, opts) => tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectFor(port), client_id: clientId, code_verifier: verifier }, opts);
const refresh = ({ clientId, refreshToken }, opts) => tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }, opts);

// What's kept: the access token and when it lapses, the refresh token (Spotify may send a new one with each refresh; if
// not, the old one goes on), and the scopes granted.
function tokensFrom(body, now, previous) {
  return {
    access: body.access_token,
    refresh: body.refresh_token || previous?.refresh || '',
    expires: now + (Number(body.expires_in) || 3600) * 1000,
    scope: body.scope || previous?.scope || '',
  };
}

// The tokens on disk, encrypted with Electron's safeStorage (the Keychain on a Mac, DPAPI on Windows). Where it can't
// encrypt (some Linux desktops), nothing is kept: a token never goes to disk in the clear.
function tokenStore(file, safeStorage) {
  return {
    load() {
      try { return JSON.parse(safeStorage.decryptString(fs.readFileSync(file))); } catch { return null; }
    },
    save(tokens) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('This system can\'t keep the Spotify sign-in encrypted, so Toaster doesn\'t keep it.');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, safeStorage.encryptString(JSON.stringify(tokens)), { mode: 0o600 });
    },
    forget() { fs.rmSync(file, { force: true }); },
  };
}

// The connection main keeps: connect(clientId) runs the sign-in (resolving once the tokens are kept), status() says
// whether there is one (never a token), accessToken() hands main a token that's good for a minute at least (refreshing
// once for any number of callers at a time), disconnect() forgets it.
function createSpotify({ file, safeStorage, openExternal, fetch = globalThis.fetch, now = Date.now, accounts = ACCOUNTS, port = PORT, wait = WAIT }) {
  const store = tokenStore(file, safeStorage);
  let waiting = null, refreshing = null;
  const status = () => {
    const t = store.load();
    return t ? { connected: true, clientId: t.clientId, scope: t.scope } : { connected: false };
  };
  async function connect(clientId) {
    clientId = String(clientId || '').trim();
    if (!CLIENT_ID.test(clientId)) throw new Error('That isn\'t a Client ID: it\'s 32 letters and digits, on your app\'s page at developer.spotify.com.');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('This system can\'t keep the Spotify sign-in encrypted, so Toaster doesn\'t keep it.');
    waiting?.close();
    const { verifier, challenge, state } = pkce();
    const listener = listenForCode({ state, port, wait });
    waiting = listener;
    try {
      const at = await listener.ready;
      await openExternal(authorizeUrl({ clientId, challenge, state, port: at, accounts }));
      const code = await listener.code;
      const body = await exchange({ clientId, code, verifier, port: at }, { fetch, accounts });
      store.save({ clientId, ...tokensFrom(body, now()) });
      return status();
    } finally {
      if (waiting === listener) waiting = null;
      listener.close();
    }
  }
  // (force: refresh even though the token looks good, for when Spotify has just turned it down with a 401)
  async function accessToken({ force = false } = {}) {
    const t = store.load();
    if (!t) throw new Error('Spotify isn\'t connected.');
    if (!force && t.expires - now() > 60 * 1000) return t.access;
    refreshing ||= (async () => {
      try {
        const body = await refresh({ clientId: t.clientId, refreshToken: t.refresh }, { fetch, accounts });
        const next = { clientId: t.clientId, ...tokensFrom(body, now(), t) };
        store.save(next);
        return next.access;
      } catch (err) {
        // (a refresh token Spotify no longer takes, say after the listener removed the app's access: the kept sign-in is
        // no use, so it goes, and the next step is connecting again)
        if (err.oauth === 'invalid_grant') { store.forget(); throw new Error('Spotify wants you to connect again.'); }
        throw err;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  function disconnect() {
    waiting?.close();
    store.forget();
    return status();
  }
  return { connect, status, accessToken, disconnect };
}

// ---------------------------------------------------------------- the Web API: what the page may ask for

const API = 'https://api.spotify.com';
const ID = /^[A-Za-z0-9]{22}$/; // (Spotify's ids: 22 characters of base 62)
const TRACK_URI = /^spotify:track:[A-Za-z0-9]{22}$/;
const PAGE = 50; // (the most each of these endpoints gives at once)

// The lists, each the Web API's own path. A request names one, with an id where the list needs one; nothing the page sends
// reaches a URL unchecked, and there's nothing here that changes the listener's library.
const LISTS = {
  playlists: { path: () => '/v1/me/playlists', shape: (item) => collection('playlist', item, item.owner?.display_name, item.tracks?.total ?? item.items?.total) },
  albums: { path: () => '/v1/me/albums', shape: (item) => collection('album', item.album, artists(item.album), item.album?.total_tracks) },
  playlist: { id: true, path: (id) => `/v1/playlists/${id}/tracks`, shape: (item) => track(item.track) },
  album: { id: true, path: (id) => `/v1/albums/${id}/tracks`, shape: (item) => track(item) },
  liked: { path: () => '/v1/me/tracks', shape: (item) => track(item.track) },
};
const artists = (thing) => (thing?.artists || []).map((a) => a.name).join(', ');
// The cover as Spotify gives it (the guidelines allow resizing, nothing else): the smallest at least 300 pixels wide, or else
// the biggest there is; and the biggest (Spotify's 640), for the one place a cover is shown large: the open collection's, at
// the right of a wide window.
const bySize = (images) => [...(images || [])].filter((i) => i && i.url).sort((a, b) => (a.width || 0) - (b.width || 0));
function cover(images) {
  const sorted = bySize(images);
  return (sorted.find((i) => (i.width || 0) >= 300) || sorted[sorted.length - 1])?.url || '';
}
const biggest = (images) => bySize(images).at(-1)?.url || '';
function collection(kind, thing, by, count) {
  if (!thing || !ID.test(thing.id || '')) return null;
  return { kind, id: thing.id, name: thing.name || '', by: by || '', count: count || 0, cover: cover(thing.images), big: biggest(thing.images), uri: `spotify:${kind}:${thing.id}` };
}
// A track the player can start (songs only: a podcast episode in a playlist, a local file or a gap is left out).
function track(thing) {
  if (!thing || thing.type === 'episode' || thing.is_local || !TRACK_URI.test(thing.uri || '')) return null;
  return { id: thing.id, name: thing.name || '', by: artists(thing), ms: thing.duration_ms || 0, uri: thing.uri, cover: cover(thing.album?.images) };
}

// Spotify's answer in words: what to do next, never a bare status code.
async function failure(res) {
  const body = await res.json().catch(() => ({}));
  const reason = body.error?.reason || '', said = body.error?.message || '';
  if (res.status === 401) return new Error('Spotify wants you to connect again.');
  if (res.status === 403 && reason === 'PREMIUM_REQUIRED') return new Error('Spotify says starting songs from Toaster needs Premium.');
  if (res.status === 404 && reason === 'NO_ACTIVE_DEVICE') return new Error('Open Spotify on this computer and play anything once, then try again.');
  if (res.status === 429) return new Error(`Spotify asks Toaster to slow down: try again in ${Number(res.headers.get('retry-after')) || 30} s.`);
  return new Error(`Spotify said no (${res.status}${said ? ': ' + said : ''}).`);
}

// What main hands the page: list(request) and play(request), each checked before anything is sent. accessToken comes from
// createSpotify; a 401 gets one fresh token and one more try, in case the old one lapsed early.
function createWebApi({ accessToken, fetch = globalThis.fetch, api = API }) {
  async function call(method, path, { query, body } = {}) {
    const url = new URL(path, api);
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, String(v));
    const send = async (force) => fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken({ force })}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let res = await send(false);
    if (res.status === 401) res = await send(true);
    if (!res.ok) throw await failure(res);
    return res.status === 204 || res.status === 202 ? null : res.json();
  }
  async function list(request = {}) {
    const kind = LISTS[request.list];
    if (!kind || !Object.hasOwn(LISTS, request.list)) throw new Error('Toaster asks Spotify for your playlists, saved albums and liked songs, and their tracks, nothing else.');
    if (kind.id && !ID.test(request.id || '')) throw new Error('That isn\'t a Spotify id.');
    const offset = request.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new Error('That isn\'t a place in the list.');
    const page = await call('GET', kind.path(request.id), { query: { limit: PAGE, offset } });
    const items = (page.items || []).map(kind.shape).filter(Boolean);
    return { items, total: page.total || 0, more: offset + PAGE < (page.total || 0) };
  }
  // play({ context: 'spotify:album:…' | 'spotify:playlist:…', index }) starts that album or playlist at that place in it, and
  // play({ context, track: 'spotify:track:…' }) at that song (by its address, which stays right where the list the page was
  // shown left gaps out: a place counted in it would not be the place in the playlist); play({ tracks: [track uris], index })
  // starts a list of songs (the liked songs have no context to start), on the device Spotify says is active.
  async function play(request = {}) {
    const index = request.index ?? 0;
    if (!Number.isInteger(index) || index < 0 || index > 10000) throw new Error('That isn\'t a place in the list.');
    let body;
    if (request.context !== undefined) {
      const m = /^spotify:(album|playlist):([A-Za-z0-9]{22})$/.exec(request.context || '');
      if (!m) throw new Error('That isn\'t a Spotify album or playlist.');
      if (request.track !== undefined && !TRACK_URI.test(request.track || '')) throw new Error('That isn\'t a Spotify song.');
      body = { context_uri: request.context, offset: request.track !== undefined ? { uri: request.track } : { position: index } };
    } else {
      const tracks = request.tracks;
      if (!Array.isArray(tracks) || !tracks.length || tracks.length > 100 || !tracks.every((t) => TRACK_URI.test(t))) throw new Error('Those aren\'t Spotify songs.');
      if (index >= tracks.length) throw new Error('That isn\'t a place in the list.');
      body = { uris: tracks, offset: { position: index } };
    }
    const { devices = [] } = await call('GET', '/v1/me/player/devices');
    const device = devices.find((d) => d.is_active && !d.is_restricted);
    if (!device) throw new Error('Open Spotify on this computer and play anything once, then try again.');
    await call('PUT', '/v1/me/player/play', { query: { device_id: device.id }, body });
    return { device: device.name || '' };
  }
  return { list, play };
}

// ---------------------------------------------------------------- the first tier: a pasted link (no sign-in, no Web API)

const NOT_A_LINK = 'That isn\'t a Spotify link to a song, an album or a playlist. In Spotify choose Share, then Copy link (or Copy Spotify URI), and paste that.';

// What a listener pasted, as { kind, id, uri }: an open.spotify.com link to a track, an album or a playlist (with or without https://, a
// locale's /intl-de/ before the kind, a slash after the id, and a ?si=... or #... after that), or the same as a spotify: address. The uri
// is built here from the kind and the id's 22 characters, never taken from what was pasted, so what reaches the Spotify app or the system's
// link opener is spotify:<kind>:<id> and nothing else. Anything else throws, in words (the page shows them as they are).
function parseLink(text) {
  const s = typeof text === 'string' ? text.trim() : '';
  let kind = null, id = null;
  const address = /^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/.exec(s);
  if (address) [, kind, id] = address;
  else if (s && s.length < 600) {
    let url = null;
    try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`); } catch { /* not a link */ }
    if (url && (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname === 'open.spotify.com' && !url.username && !url.password && !url.port) {
      const m = /^\/(?:intl-[a-z]{2}(?:-[a-z]{2,4})?\/)?(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
      if (m) [, kind, id] = m;
    }
  }
  if (!kind) throw new Error(NOT_A_LINK);
  return { kind, id, uri: `spotify:${kind}:${id}` };
}

// Why the Spotify app could not be told to play it, in words (player.cjs's playLink says which: denied, failed or unsupported).
const OPEN_WHY = {
  denied: 'macOS has not let Toaster control Spotify. Turn Toaster on in System Settings, Privacy & Security, Automation (under Spotify), then try again.',
  failed: 'Toaster could not tell Spotify to play that. Is the Spotify app on this computer? If it was only just starting, try again in a moment.',
  unsupported: 'Toaster has no way to open Spotify on this computer.',
};

// A pasted link played in the Spotify app: read first, then handed to playLink (player.cjs: an AppleScript on a Mac, the system's own link
// opener elsewhere), whose { ok, why } becomes an error in words if it wasn't. Gives back the link as parseLink read it.
async function openLink(text, playLink) {
  const link = parseLink(text);
  const said = await playLink(link.uri);
  if (!said || !said.ok) throw new Error(OPEN_WHY[said?.why] || OPEN_WHY.failed);
  return link;
}

// ---------------------------------------------------------------- covers for the page

// The one server a cover may come from. The page's security policy keeps out pictures from any other, so main fetches the one the page is
// showing and hands it over as a data: address; Spotify's artwork is served from here, and a cover on another host is not fetched at all.
const COVER_HOSTS = ['i.scdn.co'];
const COVER_MAX = 1536 * 1024; // (a 640-pixel cover is about 100 KB: more than this is not one)
const COVER_WAIT = 10 * 1000;

function isCoverUrl(value) {
  if (typeof value !== 'string' || value.length > 400) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  return url.protocol === 'https:' && COVER_HOSTS.includes(url.hostname) && !url.username && !url.password && !url.port && url.pathname.startsWith('/image/');
}

// What a picture's first bytes say it is, or null: a JPEG, a PNG or a WebP is a cover; a page, a script or anything else is not.
function pictureType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a) return 'image/png';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// The cover at that address, as a data: address for the page (the picture as Spotify serves it: nothing is changed). Refused before any
// request unless the address is on COVER_HOSTS; a redirect is not followed, the answer is cut off at `max` bytes and `wait` milliseconds, and
// what comes back has to be a picture by its first bytes, whatever the server says it is.
async function fetchCover(value, { fetch = globalThis.fetch, wait = COVER_WAIT, max = COVER_MAX } = {}) {
  if (!isCoverUrl(value)) throw new Error('Toaster fetches covers only from Spotify\'s own picture server.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), wait);
  try {
    const res = await fetch(value, { signal: ctl.signal, redirect: 'error' });
    if (!res.ok) throw new Error(`Spotify's picture server said ${res.status}.`);
    if (Number(res.headers.get('content-length')) > max) throw new Error('That cover is too big to be one.');
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > max) { ctl.abort(); throw new Error('That cover is too big to be one.'); }
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks), type = pictureType(bytes);
    if (!type) throw new Error('That wasn\'t a picture.');
    return `data:${type};base64,${bytes.toString('base64')}`;
  } catch (err) {
    if (ctl.signal.aborted && err?.name === 'AbortError') throw new Error('Spotify\'s picture server did not answer in time.');
    throw err;
  } finally { clearTimeout(timer); }
}

// ---------------------------------------------------------------- a fetch that gives up

// A fetch that gives up after `ms` (a request that never came back would leave the page waiting for good), and whose failures are in
// Toaster's own words: Node's "fetch failed" and Electron's net::ERR_... mean nothing to a listener.
function patient(fetch = globalThis.fetch, ms = 20 * 1000) {
  return async (url, init = {}) => {
    const timeout = AbortSignal.timeout(ms);
    try {
      return await fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
    } catch (err) {
      if (init.signal?.aborted) throw err;
      if (timeout.aborted) throw new Error(`Spotify did not answer in ${Math.round(ms / 1000)} seconds. Check the connection and try again.`);
      throw new Error(`Toaster could not reach Spotify (${String(err?.cause?.code || err?.message || err).slice(0, 100)}). Check the connection and try again.`);
    }
  };
}

module.exports = {
  ACCOUNTS, PORT, SCOPES, CLIENT_ID, COVER_HOSTS, NOT_A_LINK, OPEN_WHY,
  pkce, challengeOf, authorizeUrl, listenForCode, exchange, refresh, tokensFrom, tokenStore, createSpotify, createWebApi, cover, biggest,
  parseLink, openLink, isCoverUrl, pictureType, fetchCover, patient,
};
