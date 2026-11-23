// The rebuilt song's folder (helpers/save-rebuilt.cjs): the program and its sounds, plain names only, all or nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { saveRebuilt, withBase } = createRequire(import.meta.url)('../helpers/save-rebuilt.cjs');
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

test('strudel.json (the list that names the sounds) is written beside them, and no other json is', () => {
  const dir = path.join(tmp(), 'song rebuilt'), list = new TextEncoder().encode('{\n  "A_kick": "kick.wav"\n}\n');
  saveRebuilt(dir, 'stack()', { 'kick.wav': wav, 'strudel.json': list });
  assert.equal(fs.readFileSync(path.join(dir, 'strudel.json'), 'utf8'), '{\n  "A_kick": "kick.wav"\n}\n');
  for (const bad of ['other.json', 'voice/strudel.json', '../strudel.json', 'strudel.json.wav']) assert.throws(() => saveRebuilt(path.join(tmp(), 'x rebuilt'), 'stack()', { [bad]: list }), /plain sample name/, bad);
});

test('withBase puts the served address into strudel.json\'s _base, and touches nothing else', () => {
  const list = new TextEncoder().encode('{\n  "_base": "{{base}}",\n  "A_kick": "kick.wav"\n}\n'), files = { 'kick.wav': wav, 'strudel.json': list };
  const a = withBase(files, "http://localhost:47283/Don't%20Stop%20rebuilt/"), j = JSON.parse(Buffer.from(a['strudel.json']).toString('utf8'));
  assert.equal(j._base, "http://localhost:47283/Don't%20Stop%20rebuilt/"); assert.equal(j.A_kick, 'kick.wav');
  assert.equal(a['kick.wav'], wav); assert.equal(files['strudel.json'], list, 'the input is not changed');
  assert.equal(JSON.parse(Buffer.from(withBase(files, '')['strudel.json']).toString('utf8'))._base, '', 'no server: an empty base');
  assert.equal(JSON.parse(Buffer.from(withBase(files, 'a$&b')['strudel.json']).toString('utf8'))._base, 'a$&b', '$ in a name is just text');
  assert.deepEqual(withBase({ 'kick.wav': wav }, 'x'), { 'kick.wav': wav });
});
