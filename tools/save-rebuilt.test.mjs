// The rebuilt song's folder (helpers/save-rebuilt.cjs): the program and its sounds, plain names only, all or nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { saveRebuilt } = createRequire(import.meta.url)('../helpers/save-rebuilt.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'save-rebuilt-'));
const wav = new Uint8Array([82, 73, 70, 70]);

test('the program and every sound are written into a new folder, voice and keys in their own', () => {
  const dir = path.join(tmp(), 'song rebuilt');
  const file = saveRebuilt(dir, 'stack()', { 'kick.wav': wav, 'bass.wav': wav, 'voice/0.wav': wav, 'keys/0.wav': wav, 'keys/1.wav': wav });
  assert.equal(file, path.join(dir, 'song.strudel.js'));
  assert.equal(fs.readFileSync(file, 'utf8'), 'stack()');
  for (const f of ['kick.wav', 'bass.wav', 'voice/0.wav', 'keys/0.wav', 'keys/1.wav']) assert.deepEqual([...fs.readFileSync(path.join(dir, f))], [...wav]);
});

test('a name that could reach outside the folder is refused before anything is written', () => {
  const parent = tmp();
  for (const bad of ['../x.wav', '/etc/x.wav', 'a/b/c.wav', 'x.js', 'voice\\0.wav', '.wav', 'kick.wav/..']) {
    const dir = path.join(parent, `song ${Math.random()}`);
    assert.throws(() => saveRebuilt(dir, 'stack()', { [bad]: wav }), /plain sample name/, bad);
    assert.equal(fs.existsSync(dir), false, bad);
  }
});

test('an existing folder is not written into, and a failure takes the new folder back out', () => {
  const parent = tmp(), dir = path.join(parent, 'song rebuilt');
  fs.mkdirSync(dir);
  assert.throws(() => saveRebuilt(dir, 'stack()', { 'kick.wav': wav }), /EEXIST/);
  const dir2 = path.join(parent, 'song 2 rebuilt');
  const failing = { ...fs, writeFileSync: (f, ...rest) => { if (String(f).endsWith('bass.wav')) throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); return fs.writeFileSync(f, ...rest); } };
  assert.throws(() => saveRebuilt(dir2, 'stack()', { 'kick.wav': wav, 'bass.wav': wav }, failing), /ENOSPC/);
  assert.equal(fs.existsSync(dir2), false);
  assert.throws(() => saveRebuilt(path.join(parent, 'song 3 rebuilt'), '', { 'kick.wav': wav }), /no program/);
});
