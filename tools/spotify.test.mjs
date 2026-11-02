import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const spotify = createRequire(import.meta.url)('../helpers/spotify.cjs');
const { pkce, challengeOf, authorizeUrl, listenForCode, exchange, refresh, tokenStore, createSpotify, CLIENT_ID, SCOPES } = spotify;

const CLIENT = '0123456789abcdef0123456789abcdef';
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'spotify-test-')), 'spotify.bin');

// A stand-in for Electron's safeStorage that really changes the bytes, so a test can see nothing is kept in the clear.
const fakeSafe = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (s) => Buffer.from('enc:' + Buffer.from(s).toString('base64').split('').reverse().join('')),
  decryptString: (b) => { const s = b.toString(); if (!s.startsWith('enc:')) throw new Error('not ours'); return Buffer.from(s.slice(4).split('').reverse().join(''), 'base64').toString(); },
});

// A fake accounts service: /api/token answers as Spotify's does, and records each form it gets.
async function fakeAccounts(answer) {
  const forms = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const form = Object.fromEntries(new URLSearchParams(body));
      forms.push({ path: req.url, method: req.method, type: req.headers['content-type'], form });
      const [status, json] = answer(form, forms.length);
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(json));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, forms, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => { let body = ''; res.on('data', (c) => { body += c; }); res.on('end', () => resolve({ status: res.statusCode, body })); }).on('error', reject);
});

test('the challenge is the verifier\'s SHA-256 in base64url (RFC 7636\'s own example)', () => {
  assert.equal(challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('each sign-in gets a fresh verifier (43 to 128 URL-safe characters) and state', () => {
  const a = pkce(), b = pkce();
  assert.match(a.verifier, /^[A-Za-z0-9\-._~]{43,128}$/);
  assert.equal(a.challenge, challengeOf(a.verifier));
  assert.notEqual(a.verifier, b.verifier);
  assert.notEqual(a.state, b.state);
});

test('the authorize link asks for a code with the S256 challenge, the state, the loopback redirect and the scopes', () => {
  const url = new URL(authorizeUrl({ clientId: CLIENT, challenge: 'ch', state: 'st' }));
  assert.equal(url.origin + url.pathname, 'https://accounts.spotify.com/authorize');
  const q = Object.fromEntries(url.searchParams);
  assert.deepEqual(q, { client_id: CLIENT, response_type: 'code', redirect_uri: 'http://127.0.0.1:43821/callback', code_challenge_method: 'S256', code_challenge: 'ch', state: 'st', scope: SCOPES.join(' ') });
  assert.ok(!SCOPES.some((s) => /modify-private|modify-public|library-modify/.test(s)), 'nothing that changes the listener\'s library');
});

test('a Client ID is 32 hexadecimal digits', () => {
  assert.ok(CLIENT_ID.test(CLIENT) && CLIENT_ID.test(CLIENT.toUpperCase()));
  for (const bad of ['', 'abc', CLIENT + '0', CLIENT.slice(0, 31) + 'g', 'https://developer.spotify.com']) assert.ok(!CLIENT_ID.test(bad), bad);
});

test('the callback server listens on 127.0.0.1 only, ignores other paths and other states, and takes the code with this state', async () => {
  const l = listenForCode({ state: 'right', port: 0, wait: 5000 });
  const port = await l.ready;
  await assert.rejects(get(`http://[::1]:${port}/callback?code=x&state=right`), /E[A-Z]+/, 'not on the IPv6 loopback, so not on every address');
  assert.equal((await get(`http://127.0.0.1:${port}/elsewhere`)).status, 404);
  const wrong = await get(`http://127.0.0.1:${port}/callback?code=evil&state=wrong`);
  assert.equal(wrong.status, 400);
  assert.match(wrong.body, /not from the sign-in Toaster started/);
  const right = await get(`http://127.0.0.1:${port}/callback?code=good&state=right`);
  assert.equal(right.status, 200);
  assert.match(right.body, /connected to Spotify/);
  assert.equal(await l.code, 'good');
  await assert.rejects(get(`http://127.0.0.1:${port}/callback?code=late&state=right`), /ECONNREFUSED/, 'closed once it has the code');
});

test('the callback server ends on Spotify\'s refusal, on its five minutes (here 150 ms), and on close()', async () => {
  const said = listenForCode({ state: 's', port: 0 });
  const port = await said.ready;
  const page = await get(`http://127.0.0.1:${port}/callback?error=access_denied&state=s`);
  assert.match(page.body, /not connected: you said no/);
  await assert.rejects(said.code, /you said no/);
  const late = listenForCode({ state: 's', port: 0, wait: 150 });
  await late.ready;
  await assert.rejects(late.code, /waited five minutes/);
  const stopped = listenForCode({ state: 's', port: 0 });
  await stopped.ready;
  stopped.close();
  await assert.rejects(stopped.code, /stopped/);
});

test('a busy port is said in words', async () => {
  const first = listenForCode({ state: 'a', port: 0 });
  const port = await first.ready;
  const second = listenForCode({ state: 'b', port });
  await assert.rejects(second.ready, new RegExp(`Port ${port} is busy`));
  first.close();
});

test('the code and the verifier are swapped for tokens as a form, and a refresh sends the refresh token', async () => {
  const accounts = await fakeAccounts((form) => form.grant_type === 'authorization_code'
    ? [200, { access_token: 'A1', refresh_token: 'R1', expires_in: 3600, scope: 'user-library-read', token_type: 'Bearer' }]
    : [200, { access_token: 'A2', expires_in: 3600, token_type: 'Bearer' }]);
  try {
    const first = await exchange({ clientId: CLIENT, code: 'c0de', verifier: 'v3r', port: 43821 }, { accounts: accounts.url });
    assert.equal(first.access_token, 'A1');
    assert.deepEqual(accounts.forms[0], { path: '/api/token', method: 'POST', type: 'application/x-www-form-urlencoded', form: { grant_type: 'authorization_code', code: 'c0de', redirect_uri: 'http://127.0.0.1:43821/callback', client_id: CLIENT, code_verifier: 'v3r' } });
    await refresh({ clientId: CLIENT, refreshToken: 'R1' }, { accounts: accounts.url });
    assert.deepEqual(accounts.forms[1].form, { grant_type: 'refresh_token', refresh_token: 'R1', client_id: CLIENT });
  } finally { await accounts.close(); }
});

test('Spotify\'s refusals come back in words', async () => {
  const accounts = await fakeAccounts(() => [400, { error: 'invalid_grant', error_description: 'Invalid authorization code' }]);
  try {
    await assert.rejects(exchange({ clientId: CLIENT, code: 'x', verifier: 'y' }, { accounts: accounts.url }), (err) => /Spotify said no: Invalid authorization code/.test(err.message) && err.oauth === 'invalid_grant');
  } finally { await accounts.close(); }
});

test('the kept sign-in is encrypted, and where nothing can encrypt it, it isn\'t kept', () => {
  const file = tmpFile();
  const store = tokenStore(file, fakeSafe());
  store.save({ clientId: CLIENT, access: 'SECRET-ACCESS', refresh: 'SECRET-REFRESH', expires: 1, scope: '' });
  const onDisk = fs.readFileSync(file).toString();
  assert.ok(!onDisk.includes('SECRET'), 'no token in the clear');
  assert.equal(store.load().refresh, 'SECRET-REFRESH');
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  store.forget();
  assert.equal(store.load(), null);
  assert.throws(() => tokenStore(tmpFile(), fakeSafe(false)).save({ access: 'x' }), /can't keep the Spotify sign-in encrypted/);
});

test('a whole sign-in: the browser opens the authorize page, comes back with the code, and the tokens are kept, refreshed when they lapse, and forgotten', async () => {
  let issued = 0;
  const accounts = await fakeAccounts((form) => {
    issued++;
    if (form.grant_type === 'authorization_code') return [200, { access_token: 'A1', refresh_token: 'R1', expires_in: 3600, scope: 'playlist-read-private user-library-read' }];
    if (form.refresh_token === 'R1') return [200, { access_token: 'A2', refresh_token: 'R2', expires_in: 3600 }];
    return [400, { error: 'invalid_grant', error_description: 'Refresh token revoked' }];
  });
  let clock = 1_000_000;
  const opened = [];
  // the browser: opens the authorize page, the listener says yes, and Spotify sends it back to the redirect with a code
  const openExternal = async (link) => {
    opened.push(link);
    const q = new URL(link).searchParams;
    setTimeout(() => get(`${q.get('redirect_uri')}?code=the-code&state=${q.get('state')}`), 20);
  };
  const file = tmpFile();
  const s = createSpotify({ file, safeStorage: fakeSafe(), openExternal, accounts: accounts.url, port: 0, now: () => clock });
  try {
    assert.deepEqual(s.status(), { connected: false });
    await assert.rejects(s.connect('not-an-id'), /isn't a Client ID/);
    const st = await s.connect(CLIENT);
    assert.deepEqual(st, { connected: true, clientId: CLIENT, scope: 'playlist-read-private user-library-read' });
    assert.ok(!JSON.stringify(st).includes('A1'), 'status never carries a token');
    assert.equal(opened.length, 1);
    const sent = accounts.forms[0].form;
    assert.equal(sent.code, 'the-code');
    assert.equal(challengeOf(sent.code_verifier), new URL(opened[0]).searchParams.get('code_challenge'), 'the verifier sent is the one behind the challenge');
    assert.equal(await s.accessToken(), 'A1');
    clock += 3600 * 1000 - 30 * 1000; // half a minute left: refresh first, once, however many ask at once
    const tokens = await Promise.all([s.accessToken(), s.accessToken(), s.accessToken()]);
    assert.deepEqual(tokens, ['A2', 'A2', 'A2']);
    assert.equal(issued, 2);
    assert.equal(tokenStore(file, fakeSafe()).load().refresh, 'R2', 'the new refresh token is kept');
    clock += 3600 * 1000;
    await assert.rejects(s.accessToken(), /connect again/);
    assert.deepEqual(s.status(), { connected: false }, 'a refresh token Spotify no longer takes is forgotten');
    await s.connect(CLIENT);
    assert.equal(s.status().connected, true);
    s.disconnect();
    assert.deepEqual(s.status(), { connected: false });
    assert.ok(!fs.existsSync(file));
  } finally { await accounts.close(); }
});

test('connecting again stops a sign-in still waiting', async () => {
  const accounts = await fakeAccounts(() => [200, { access_token: 'A', refresh_token: 'R', expires_in: 3600 }]);
  const links = [];
  const s = createSpotify({ file: tmpFile(), safeStorage: fakeSafe(), openExternal: async (l) => { links.push(l); }, accounts: accounts.url, port: 0 });
  try {
    const first = s.connect(CLIENT);
    while (!links.length) await new Promise((r) => setTimeout(r, 10));
    const second = s.connect(CLIENT);
    await assert.rejects(first, /stopped/);
    while (links.length < 2) await new Promise((r) => setTimeout(r, 10));
    const q = new URL(links[1]).searchParams;
    await get(`${q.get('redirect_uri')}?code=c&state=${q.get('state')}`);
    assert.equal((await second).connected, true);
  } finally { await accounts.close(); }
});
