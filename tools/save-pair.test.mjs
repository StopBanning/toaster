// The song export's pair (helpers/save-pair.cjs): the MIDI file and the Strudel code side by side, or neither of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { savePair } = createRequire(import.meta.url)('../helpers/save-pair.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'save-pair-'));
const midi = Buffer.from([0x4d, 0x54, 0x68, 0x64]);
// the real file system, except that writing the code file fails with the given code
const failing = (code) => ({ ...fs, writeFileSync: (file, ...rest) => {
  if (file.endsWith('.strudel.js')) throw Object.assign(new Error(code), { code });
  return fs.writeFileSync(file, ...rest);
} });

test('both files are written, side by side, and the MIDI file is named back', () => {
  const dir = tmp(), base = path.join(dir, 'song 1');
  assert.equal(savePair(base, midi, 'setcpm(120/4)'), base + '.mid');
  assert.deepEqual(fs.readFileSync(base + '.mid'), midi);
  assert.equal(fs.readFileSync(base + '.strudel.js', 'utf8'), 'setcpm(120/4)');
});

test('with no code, only the MIDI file is written', () => {
  const dir = tmp(), base = path.join(dir, 'song 2');
  savePair(base, midi, '');
  assert.deepEqual(fs.readdirSync(dir), ['song 2.mid']);
});

test('the code file failing (a full disk) takes the MIDI file back out and passes the error on', () => {
  const dir = tmp(), base = path.join(dir, 'song 3');
  assert.throws(() => savePair(base, midi, 'setcpm(120/4)', failing('ENOSPC')), { code: 'ENOSPC' });
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('a code file already there (EEXIST) is left alone; only the new MIDI file goes', () => {
  const dir = tmp(), base = path.join(dir, 'song 4');
  fs.writeFileSync(base + '.strudel.js', 'someone else\'s');
  assert.throws(() => savePair(base, midi, 'setcpm(120/4)', failing('EEXIST')), { code: 'EEXIST' });
  assert.deepEqual(fs.readdirSync(dir), ['song 4.strudel.js']);
  assert.equal(fs.readFileSync(base + '.strudel.js', 'utf8'), 'someone else\'s');
});
