// A fake Spotify for tools/library-check.mjs and the tests: the sign-in page, the token service, the Web API calls the library makes and the
// pictures, on 127.0.0.1, answering as Spotify's do (the shapes helpers/spotify.cjs reads) over a small library of real albums and the
// playlists of someone who listens to them. Nothing here ever reaches Spotify, and a copy of the app only talks to it when started with
// --spotify-fake=<its address> (main.js, helpers/spotify-fake.cjs). It records every request it gets (`seen`) and has knobs for the failures
// a listener meets (an expired token, no Premium, no open player).
//   const fake = await startFakeSpotify({ port: 9351, images })   // images: { <key>: { type, bytes } } for the covers
//   fake.base, fake.seen, fake.state (the knobs), fake.close()
import crypto from 'node:crypto';
import http from 'node:http';

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// a well-formed Spotify id (22 characters of base 62), the same for the same label
export function idOf(label) {
  const h = crypto.createHash('sha256').update(String(label)).digest();
  let out = '';
  for (let i = 0; i < 22; i++) out += B62[h[i] % 62];
  return out;
}
const hex40 = (label) => crypto.createHash('sha1').update(String(label)).digest('hex');
// the address Spotify gives a cover at (the fake serves the same path): a key says which picture it is
export const coverUrl = (key, size = 300) => `https://i.scdn.co/image/ab67616d0000${{ 640: 'b273', 300: '1e02', 64: '4851' }[size]}${hex40(key).slice(0, 24)}`;
const imagesOf = (key) => [640, 300, 64].map((width) => ({ url: coverUrl(`${key}`, width), width, height: width }));

const m = (min, sec) => (min * 60 + sec) * 1000;
// real albums, their songs and lengths (the pictures are the ones of the same albums in the library fixture, tools/library-fixture.mjs)
export const ALBUMS = [
  { key: '(III)', name: '(III)', artist: 'Crystal Castles', tracks: [['Plague', 4, 56], ['Kerosene', 3, 12], ['Wrath of God', 3, 7], ['Affection', 2, 37], ['Pale Flesh', 2, 59], ['Sad Eyes', 3, 27], ['Insulin', 1, 47], ['Transgender', 3, 5], ['Violent Youth', 4, 22], ['Telepath', 3, 55], ['Mercenary', 2, 38], ['Child I Will Hurt You', 3, 33]] },
  { key: 'Lonerism', name: 'Lonerism', artist: 'Tame Impala', tracks: [['Be Above It', 2, 37], ['Endors Toi', 3, 7], ['Apocalypse Dreams', 5, 58], ['Mind Mischief', 3, 32], ['Music to Walk Home By', 4, 57], ['Why Won\'t They Talk to Me?', 3, 21], ['Feels Like We Only Go Backwards', 3, 12], ['Keep On Lying', 5, 54], ['Elephant', 3, 31], ['She Just Won\'t Believe Me', 2, 21], ['Nothing That Has Happened So Far Has Been Anything We Could Control', 3, 0], ['Sun\'s Coming Up', 3, 40]] },
  { key: 'Homogenic', name: 'Homogenic', artist: 'Björk', tracks: [['Hunter', 4, 12], ['Jóga', 5, 4], ['Unravel', 3, 21], ['Bachelorette', 5, 11], ['All Neon Like', 5, 53], ['5 Years', 4, 3], ['Immature', 3, 8], ['Alarm Call', 4, 19], ['Pluto', 3, 19], ['All Is Full of Love', 4, 34]] },
  { key: 'Homework', name: 'Homework', artist: 'Daft Punk', tracks: [['Daftendirekt', 2, 52], ['WDPK 83.7 FM', 0, 28], ['Revolution 909', 5, 26], ['Da Funk', 5, 28], ['Phoenix', 4, 56], ['Fresh', 4, 4], ['Around the World', 7, 9], ['Rollin\' & Scratchin\'', 7, 27], ['Teachers', 2, 53], ['High Fidelity', 3, 2], ['Rock\'n Roll', 7, 32], ['Oh Yeah', 2, 0], ['Burnin\'', 6, 53], ['Indo Silver Club', 4, 32], ['Alive', 5, 15], ['Funk Ad', 0, 49]] },
  { key: 'TRON: Legacy', name: 'TRON: Legacy (Original Motion Picture Soundtrack)', artist: 'Daft Punk', tracks: [['Overture', 2, 28], ['The Grid', 1, 36], ['The Son of Flynn', 1, 35], ['Recognizer', 2, 36], ['Armory', 2, 2], ['Arena', 1, 33], ['Rinzler', 2, 17], ['The Game Has Changed', 3, 25], ['Outlands', 2, 41], ['Adagio for TRON', 4, 11], ['Nocturne', 1, 42], ['End of Line', 2, 36], ['Derezzed', 1, 44], ['Fall', 2, 51], ['Solar Sailer', 2, 42], ['Rectifier', 2, 14], ['Disc Wars', 4, 8], ['C.L.U.', 4, 6], ['Arrival', 2, 3], ['Flynn Lives', 3, 22], ['TRON Legacy (End Titles)', 3, 11], ['Finale', 1, 38]] },
  { key: 'april mixtape 3', name: 'april mixtape 3', artist: 'Snow Strippers', tracks: [['pulse', 2, 49], ['fade', 3, 17], ['numb', 2, 32], ['glass', 3, 8]] },
].map((a) => ({ ...a, id: idOf(`album:${a.key}`), tracks: a.tracks.map(([title, min, sec], i) => ({ id: idOf(`track:${a.key}:${i}`), title, ms: m(min, sec), album: a.name, artist: a.artist, albumKey: a.key })) }));

const song = (album, title) => ALBUMS.find((a) => a.key === album).tracks.find((t) => t.title === title);
// playlists of someone who listens to those albums: a name, who made it, the songs, the picture (a key like an album's)
export const PLAYLISTS = [
  { key: 'late night drive', name: 'late night drive', owner: 'colin', cover: '(III)', songs: [['(III)', 'Kerosene'], ['Homogenic', 'Hunter'], ['Lonerism', 'Apocalypse Dreams'], ['TRON: Legacy', 'Derezzed'], ['(III)', 'Pale Flesh'], ['Homework', 'Around the World'], ['Homogenic', 'All Is Full of Love']] },
  { key: 'gym', name: 'gym', owner: 'colin', cover: 'TRON: Legacy', songs: [['(III)', 'Plague'], ['TRON: Legacy', 'Derezzed'], ['Homework', 'Da Funk'], ['(III)', 'Wrath of God'], ['Homework', 'Rollin\' & Scratchin\''], ['TRON: Legacy', 'Rectifier']] },
  { key: 'sunday morning', name: 'sunday morning', owner: 'colin', cover: 'Lonerism', songs: [['Lonerism', 'Be Above It'], ['Lonerism', 'Elephant'], ['Homogenic', 'Unravel'], ['Lonerism', 'Sun\'s Coming Up']] },
  { key: 'songs to code to', name: 'songs to code to', owner: 'colin', cover: 'Homework', songs: [['Homework', 'Teachers'], ['TRON: Legacy', 'Adagio for TRON'], ['(III)', 'Telepath'], ['Homogenic', 'Jóga'], ['Homework', 'Burnin\'']] },
].map((p) => ({ ...p, id: idOf(`playlist:${p.key}`), tracks: p.songs.map(([a, t]) => song(a, t)) }));

// the songs liked, newest first
export const LIKED = [['(III)', 'Kerosene'], ['Homogenic', 'Jóga'], ['Lonerism', 'Elephant'], ['Homework', 'Da Funk'], ['TRON: Legacy', 'Derezzed'], ['(III)', 'Plague'], ['Lonerism', 'Endors Toi'], ['Homogenic', 'Hunter'], ['Homework', 'Around the World'], ['(III)', 'Telepath'], ['TRON: Legacy', 'Adagio for TRON'], ['Lonerism', 'Be Above It']].map(([a, t]) => song(a, t));

// ---------------------------------------------------------------- the Web API's shapes
const artistsOf = (name) => name.split(' & ').map((n) => ({ id: idOf(`artist:${n}`), name: n }));
const artistOf = (name) => ({ id: idOf(`artist:${name}`), name, uri: `spotify:artist:${idOf(`artist:${name}`)}`, images: imagesOf(ALBUMS.find((a) => a.artist === name)?.key || name), genres: ['electronic'] });
const albumOf = (a) => ({ id: a.id, name: a.name, uri: `spotify:album:${a.id}`, album_type: 'album', artists: artistsOf(a.artist), total_tracks: a.tracks.length, images: imagesOf(a.key), release_date: '2012-11-12', release_date_precision: 'day' });
const trackOf = (t, cover = true) => ({ id: t.id, name: t.title, uri: `spotify:track:${t.id}`, type: 'track', is_local: false, duration_ms: t.ms, artists: artistsOf(t.artist), ...(cover ? { album: { name: t.album, images: imagesOf(t.albumKey) } } : {}) });
const page = (all, url) => {
  const offset = Number(url.searchParams.get('offset') || 0), limit = Math.min(50, Number(url.searchParams.get('limit') || 50));
  return { total: all.length, offset, limit, items: all.slice(offset, offset + limit) };
};
const SCOPE = 'playlist-read-private user-library-read user-read-playback-state user-modify-playback-state';

// ---------------------------------------------------------------- the server
export async function startFakeSpotify({ port = 0, images = {} } = {}) {
  const state = {
    expire401: 0, // the next n Web API calls are answered 401 (an expired token): the app should ask for a new one and go on
    refreshFails: false, // the token service refuses a refresh (invalid_grant: the listener took the app's access away)
    playFails: null, // { status, reason, message }: the play call is refused (PREMIUM_REQUIRED, say)
    devices: [{ id: 'fake-device-1', name: 'Colin\'s MacBook', is_active: true, is_restricted: false, type: 'Computer' }],
    limit: 0, // when above 0 the next n Web API calls are answered 429, "slow down", with a Retry-After of 7
    extra: 0, // this many more playlists after the real ones (mix 1, mix 2...), for a list that goes on over more than one page
    hold: false, // the sign-in page does not agree at once: it waits (as it does for a listener reading it), and `lastAuthorize` says what was asked
    drop: 0, // the next n Web API calls get no answer at all: the connection is cut (a network that is gone)
    lastAuthorize: null, // { state, redirect } of the last sign-in page asked for
    playbackTrack: LIKED[0], playbackPlaying: true, playbackPosition: 92000, playbackActions: {},
    collectionRefused: false, // a play of the liked songs' own context (spotify:user:<id>:collection) is refused 400, as some accounts' is
    tokens: 0, // access tokens given so far: the one in force is fake-access-<this>
  };
  const seen = [], challenges = new Map();
  const send = (res, status, json, headers = {}) => res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(status === 204 ? undefined : JSON.stringify(json));
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const record = { method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), auth: req.headers.authorization || null, body: null, form: null };
      if (body) { if ((req.headers['content-type'] || '').includes('json')) { try { record.body = JSON.parse(body); } catch { record.body = body; } } else record.form = Object.fromEntries(new URLSearchParams(body)); }
      seen.push(record);

      // ---- accounts: the page that asks the listener to agree (it agrees at once, by redirecting back), and the tokens
      if (url.pathname === '/authorize') {
        const q = record.query;
        if (q.response_type !== 'code' || q.code_challenge_method !== 'S256' || !q.code_challenge || !q.state || !/^http:\/\/127\.0\.0\.1:\d+\/callback$/.test(q.redirect_uri || '')) return send(res, 400, { error: 'invalid_request' });
        challenges.set('fake-code', q.code_challenge);
        state.lastAuthorize = { state: q.state, redirect: q.redirect_uri };
        if (state.hold) return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>Spotify</title>waiting for the listener to agree');
        return res.writeHead(302, { Location: `${q.redirect_uri}?code=fake-code&state=${encodeURIComponent(q.state)}` }).end();
      }
      if (url.pathname === '/api/token' && req.method === 'POST') {
        const f = record.form || {};
        if (f.grant_type === 'authorization_code') {
          const challenge = crypto.createHash('sha256').update(f.code_verifier || '').digest('base64url');
          if (f.code !== 'fake-code' || challenges.get(f.code) !== challenge || !/^[0-9a-f]{32}$/.test(f.client_id || '')) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid authorization code' });
        } else if (f.grant_type === 'refresh_token') {
          if (state.refreshFails || f.refresh_token !== 'fake-refresh') return send(res, 400, { error: 'invalid_grant', error_description: 'Refresh token revoked' });
        } else return send(res, 400, { error: 'unsupported_grant_type' });
        state.tokens++;
        return send(res, 200, { access_token: `fake-access-${state.tokens}`, token_type: 'Bearer', expires_in: 3600, refresh_token: 'fake-refresh', scope: SCOPE });
      }

      // ---- the pictures
      const pic = /^\/image\/(.+)$/.exec(url.pathname);
      if (pic) {
        const key = Object.keys(images).find((k) => coverUrl(k, 300).endsWith(pic[1]) || coverUrl(k, 640).endsWith(pic[1]) || coverUrl(k, 64).endsWith(pic[1]));
        if (!key) return send(res, 404, {});
        return res.writeHead(200, { 'Content-Type': images[key].type, 'Content-Length': images[key].bytes.length }).end(images[key].bytes);
      }

      // ---- the Web API
      if (state.drop > 0 && url.pathname.startsWith('/v1/')) { state.drop--; req.socket.destroy(); return; }
      if (state.expire401 > 0 && url.pathname.startsWith('/v1/')) { state.expire401--; return send(res, 401, { error: { status: 401, message: 'The access token expired' } }); }
      // (not the mini player's playback poll, every 3 s: it would eat the 429 meant for the call being checked)
      if (state.limit > 0 && url.pathname.startsWith('/v1/') && url.pathname !== '/v1/me/player') { state.limit--; return send(res, 429, { error: { status: 429, message: 'API rate limit exceeded' } }, { 'Retry-After': '7' }); }
      if (!url.pathname.startsWith('/v1/')) return send(res, 404, { error: { status: 404, message: 'no such address' } });
      if (record.auth !== `Bearer fake-access-${state.tokens}`) return send(res, 401, { error: { status: 401, message: 'Invalid access token' } });
      const ok = (json) => send(res, 200, json);
      let hit;
      if (req.method === 'GET' && url.pathname === '/v1/me/playlists') {
        const mine = PLAYLISTS.map((p) => ({ id: p.id, name: p.name, owner: { display_name: p.owner }, tracks: { total: p.tracks.length }, images: imagesOf(p.cover) }));
        const more = Array.from({ length: state.extra }, (_, i) => ({ id: idOf(`extra:${i}`), name: `mix ${i + 1}`, owner: { display_name: 'colin' }, tracks: { total: 3 }, images: imagesOf(ALBUMS[i % ALBUMS.length].key) }));
        return ok(page([...mine, ...more], url));
      }
      if (req.method === 'GET' && url.pathname === '/v1/me/albums') return ok(page(ALBUMS.map((a) => ({ added_at: '2024-05-01T00:00:00Z', album: { id: a.id, name: a.name, artists: artistsOf(a.artist), total_tracks: a.tracks.length, images: imagesOf(a.key) } })), url));
      if (req.method === 'GET' && url.pathname === '/v1/me/tracks') return ok(page(LIKED.map((t) => ({ added_at: '2024-05-01T00:00:00Z', track: trackOf(t) })), url));
      // (Spotify's 2026 Web API: a playlist's songs at /items, each under .item; the old /tracks answers 403, as Spotify's does)
      if (req.method === 'GET' && /^\/v1\/playlists\/[A-Za-z0-9]{22}\/tracks$/.test(url.pathname)) return send(res, 403, { error: { status: 403, message: 'Forbidden' } });
      if (req.method === 'GET' && (hit = /^\/v1\/playlists\/([A-Za-z0-9]{22})\/items$/.exec(url.pathname))) {
        const p = PLAYLISTS.find((x) => x.id === hit[1]);
        return p ? ok(page(p.tracks.map((t) => ({ item: trackOf(t) })), url)) : send(res, 404, { error: { status: 404, message: 'Not found.' } });
      }
      if (req.method === 'GET' && (hit = /^\/v1\/albums\/([A-Za-z0-9]{22})\/tracks$/.exec(url.pathname))) {
        const a = ALBUMS.find((x) => x.id === hit[1]);
        return a ? ok(page(a.tracks.map((t) => trackOf(t, false)), url)) : send(res, 404, { error: { status: 404, message: 'Not found.' } });
      }
      if (req.method === 'GET' && url.pathname === '/v1/search') {
        const query = url.searchParams.get('q') || '';
        const filter = /^artist:"(.*)"$/.exec(query);
        const needle = (filter ? filter[1] : query).toLowerCase();
        const names = [...new Set(ALBUMS.map((a) => a.artist))].filter((n) => n.toLowerCase().includes(needle));
        const songs = ALBUMS.flatMap((a) => a.tracks).filter((t) => filter ? t.artist.toLowerCase() === needle : `${t.title} ${t.artist}`.toLowerCase().includes(needle));
        const result = (items) => { const p = page(items, url); return { ...p, next: p.offset + p.limit < p.total ? 'next-page' : null }; };
        return ok({ tracks: result(songs.map((t) => trackOf(t))), artists: result(names.map(artistOf)), albums: result(ALBUMS.filter((a) => `${a.name} ${a.artist}`.toLowerCase().includes(needle)).map(albumOf)) });
      }
      if (req.method === 'GET' && (hit = /^\/v1\/artists\/([A-Za-z0-9]{22})$/.exec(url.pathname))) {
        const name = ALBUMS.map((a) => a.artist).find((n) => idOf(`artist:${n}`) === hit[1]);
        return name ? ok(artistOf(name)) : send(res, 404, { error: { status: 404, message: 'Not found.' } });
      }
      if (req.method === 'GET' && (hit = /^\/v1\/artists\/([A-Za-z0-9]{22})\/albums$/.exec(url.pathname))) {
        const group = url.searchParams.get('include_groups');
        // Fixture membership is explicit: album_group is intentionally absent, as in Development Mode.
        const all = ALBUMS.filter((a) => idOf(`artist:${a.artist}`) === hit[1]);
        const releases = group === 'album' ? all : group === 'single' ? all.slice(0, 1).map((a) => ({ ...a, name: `${a.name} — single` })) : group === 'appears_on' ? all.slice(0, 1) : [];
        const p = page(releases.map(albumOf), url);
        return ok({ ...p, next: p.offset + p.limit < p.total ? 'next-page' : null });
      }
      if (req.method === 'GET' && (hit = /^\/v1\/albums\/([A-Za-z0-9]{22})$/.exec(url.pathname))) {
        const a = ALBUMS.find((a) => a.id === hit[1]);
        return a ? ok({ ...albumOf(a), tracks: page(a.tracks.map((t) => trackOf(t, false)), url) }) : send(res, 404, { error: { status: 404, message: 'Not found.' } });
      }
      if (req.method === 'GET' && url.pathname === '/v1/me/player') {
        if (!state.playbackTrack || !state.devices.some((d) => d.is_active)) return send(res, 204, null);
        return ok({ device: state.devices.find((d) => d.is_active), is_playing: state.playbackPlaying, progress_ms: state.playbackPosition, item: trackOf(state.playbackTrack), actions: state.playbackActions });
      }
      if (req.method === 'PUT' && url.pathname === '/v1/me/player/pause') { state.playbackPlaying = false; return send(res, 204, null); }
      if (req.method === 'POST' && ['/v1/me/player/next', '/v1/me/player/previous'].includes(url.pathname)) {
        const step = url.pathname.endsWith('next') ? 1 : -1, at = LIKED.indexOf(state.playbackTrack);
        state.playbackTrack = LIKED[(at + step + LIKED.length) % LIKED.length]; state.playbackPosition = 0; return send(res, 204, null);
      }
      if (req.method === 'GET' && url.pathname === '/v1/me') return ok({ id: 'colin', display_name: 'colin', uri: 'spotify:user:colin', type: 'user' });
      if (req.method === 'GET' && url.pathname === '/v1/me/player/devices') return ok({ devices: state.devices });
      if (req.method === 'PUT' && url.pathname === '/v1/me/player/play') {
        if (state.playFails) return send(res, state.playFails.status, { error: { status: state.playFails.status, message: state.playFails.message || 'refused', reason: state.playFails.reason } });
        if (state.collectionRefused && /:collection$/.test(record.body?.context_uri || '')) return send(res, 400, { error: { status: 400, message: 'Non supported context uri' } });
        state.playbackPlaying = true;
        return send(res, 204, null);
      }
      return send(res, 404, { error: { status: 404, message: 'no such address' } });
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {
    base: `http://127.0.0.1:${server.address().port}`, state, seen,
    close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }),
  };
}
