// The rebuilt songs' sounds served to strudel.cc (helpers/sound-server.cjs): a .wav inside a " rebuilt" folder of the songs folder,
// with the headers a browser wants, and nothing else.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { start, fileFor } = createRequire(import.meta.url)('../helpers/sound-server.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-server-'));
const song = 'Eyes 2026-11-13 09.03.00 rebuilt';
fs.mkdirSync(path.join(root, song, 'voice'), { recursive: true });
fs.writeFileSync(path.join(root, song, 'kick.wav'), 'RIFFkick');
fs.writeFileSync(path.join(root, song, 'voice', '0.wav'), 'RIFFvoice');
fs.writeFileSync(path.join(root, song, 'song.strudel.js'), 'stack()');
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
