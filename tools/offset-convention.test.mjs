// One convention for the speakers' lead (syncOffset): every layer draws the grid where the sound is heard, at t + offset. Lanes,
// the looks (post.js) and the Earth drew at t - offset, two offsets behind the blocks, the orb and the scenery: ~100 ms on
// system audio, ~160 ms on a mic (the review of Nov 1, D2 2). A picture file that looks back by the offset is named here.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const dir = new URL('../renderer/', import.meta.url);

test('no picture draws at t - offset: the grid is where the sound is heard, t + offset, in every layer', () => {
  const back = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const code = fs.readFileSync(new URL(f, dir), 'utf8').replace(/\r\n/g, '\n').replace(/\/\/.*$/gm, '');
    if (/\bt - offset\b/.test(code)) back.push(f);
  }
  assert.deepEqual(back, []);
  const lanes = fs.readFileSync(new URL('lanes.js', dir), 'utf8'), post = fs.readFileSync(new URL('post.js', dir), 'utf8');
  assert.match(lanes, /const at = t \+ offset;/);
  assert.match(post, /const at = t \+ offset, v = eng\.v/);
});
