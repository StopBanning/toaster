// The rebuilt songs' sounds served to strudel.cc (helpers/sound-server.cjs): a .wav at the top of a song's folder in the songs folder
// (marked by song.strudel.js; the older " rebuilt" folders too), with the headers a browser wants, and nothing else.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { start, fileFor, encodeName } = createRequire(import.meta.url)('../helpers/sound-server.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-server-'));
const song = 'Eyes 2026-11-13 09.03.00 rebuilt';
fs.mkdirSync(path.join(root, song, 'voice'), { recursive: true });
fs.writeFileSync(path.join(root, song, 'kick.wav'), 'RIFFkick');
fs.writeFileSync(path.join(root, song, 'voice', '0.wav'), 'RIFFvoice');
fs.writeFileSync(path.join(root, song, 'song.strudel.js'), 'stack()');
fs.writeFileSync(path.join(root, song, 'strudel.json'), '{"A_kick": "kick.wav"}');
fs.writeFileSync(path.join(root, song, 'other.json'), '{}');
fs.writeFileSync(path.join(root, 'secret.wav'), 'no');
fs.mkdirSync(path.join(root, 'other'), { recursive: true }); fs.writeFileSync(path.join(root, 'other', 'kick.wav'), 'no');

test('a sound of a rebuilt song is served, with the headers strudel.cc needs; nothing else is', async () => {
  const s = await start(() => root, 0);
  try {
    const base = s.base(song);
    assert.match(base, /^http:\/\/localhost:\d+\/Eyes%202026-11-13%2009\.03\.00%20rebuilt\/$/);
    let r = await fetch(base + 'kick.wav');
    assert.equal(r.status, 200); assert.equal(await r.text(), 'RIFFkick');
    assert.equal(r.headers.get('access-control-allow-origin'), '*'); assert.equal(r.headers.get('content-type'), 'audio/wav');
    r = await fetch(base + 'voice/0.wav'); assert.equal(await r.text(), 'RIFFvoice');
    // the list that names the sounds, for samples('.../strudel.json'): served as JSON; no other .json is
    r = await fetch(base + 'strudel.json'); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/json'); assert.deepEqual(await r.json(), { A_kick: 'kick.wav' });
    assert.equal(r.headers.get('access-control-allow-origin'), '*'); assert.equal((await fetch(base + 'other.json')).status, 404);
    r = await fetch(base + 'kick.wav', { method: 'OPTIONS' });
    assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-private-network'), 'true');
    const at = `http://localhost:${s.port}`;
    for (const bad of [`${base}song.strudel.js`, `${base}missing.wav`, `${at}/secret.wav`, `${at}/other/kick.wav`, `${base}..%2F..%2Fsecret.wav`,
      `${at}/..%2Fsecret.wav`, `${at}/x%20rebuilt%2F..%2F..%2Fsecret.wav`, `${base}voice/../../secret.wav`]) {
      assert.equal((await fetch(bad)).status, 404, bad);
    }
    assert.equal((await fetch(base + 'kick.wav', { method: 'POST' })).status, 405);
  } finally { await s.close(); }
});

test('the names a request may use', () => {
  assert.equal(fileFor('/songs', `/${encodeURIComponent(song)}/kick.wav`), path.join('/songs', song, 'kick.wav'));
  for (const bad of ['/a rebuilt/../x.wav', '/../x rebuilt/a.wav', '/x rebuilt/a/b/c.wav', '/x rebuilt/a.js', '/x/a.wav', '/%E0%A4%A rebuilt/a.wav', '/.. rebuilt/a.wav']) {
    assert.equal(fileFor('/songs', bad), null, bad);
  }
});

test('a port already taken gives null, not a crash', async () => {
  const a = await start(() => root, 0), b = await start(() => root, a.port);
  try { assert.equal(b, null); } finally { await a.close(); }
});

// The sweep, Nov 16: "Queen - Don't Stop Me Now" gave `}, 'http://localhost:47283/Queen%20-%20Don't...rebuilt/')`, a syntax error: the address goes
// between single quotes in the song's code, and encodeURIComponent leaves ' as it is.
test('a name with an apostrophe (or ( ) ! * & # %) makes an address that can sit between single quotes, and that is still served', async () => {
  const nasty = "Queen - Don't Stop Me Now (live)! & #1 100% 2026-11-16 09.03.00 rebuilt";
  const dir = path.join(root, nasty);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'kick.wav'), 'RIFFnasty');
  const s = await start(() => root, 0);
  try {
    const base = s.base(nasty);
    assert.doesNotMatch(base, /['()!*"` \\]/, base);
    // the code the page writes: samples({ ... }, 'base'): it must be one string
    assert.equal(new Function(`return 'x' + '${base}'`)(), 'x' + base);
    assert.doesNotThrow(() => new Function(`const samples = () => {}; samples({ k: 'kick.wav' }, '${base}')`));
    const r = await fetch(base + 'kick.wav');
    assert.equal(r.status, 200); assert.equal(await r.text(), 'RIFFnasty');
  } finally { await s.close(); }
  // every character a song can have in its name comes back as it went in
  const all = "a'b(c)d!e*f&g#h%i j~k_l-m.n,o;p:q@r=s+t$u";
  assert.equal(decodeURIComponent(encodeName(all)), all);
  assert.doesNotMatch(encodeName(all), /['()!*]/);
});
