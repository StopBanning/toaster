import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageTurner } from '../renderer/game.js';

const typing = [{ caret: 3 }], quiet = [{ caret: -1 }];
const clock = () => {
  const turn = createPageTurner();
  return (bar, lines = quiet, held) => turn(bar * 2, bar * 16, lines, held);
};
const enter = (at) => { at(0); return at(8, typing); };

test('initial pads last eight bars even when code is typing from the first frame', () => {
  const at = clock();
  for (let bar = 0; bar < 8; bar += 0.25) assert.equal(at(bar, typing).now, 'pads');
  assert.equal(at(8, typing).now, 'code');
});

test('the initial pads clock starts at the first shown bar, including midway through a song', () => {
  const at = clock();
  assert.equal(at(50, typing).now, 'pads');
  assert.equal(at(57, typing).now, 'pads');
  assert.equal(at(58, typing).now, 'code');
});

test('eligible typing waits for a bar boundary and the wipe lasts 0.22 seconds', () => {
  const at = clock(); at(0); at(8);
  assert.equal(at(8.5, typing).now, 'pads');
  assert.deepEqual(at(9), { now: 'code', from: 'pads', k: 0 });
  assert.ok(Math.abs(at(9.055).k - 0.5) < 1e-10);
  assert.equal(at(9.12).k, 1);
});

test('pads stay visible without typing or a code snapshot', () => {
  const at = clock();
  for (const bar of [0, 8, 16, 40]) assert.equal(at(bar, bar === 16 ? null : quiet).now, 'pads');
});

test('code remains for four bars, then returns to pads after typing has stopped for a bar', () => {
  const at = clock(); enter(at);
  for (const bar of [9, 10, 11, 11.9]) assert.equal(at(bar).now, 'code');
  assert.equal(at(12).now, 'pads');
  for (const bar of [13, 16, 19]) assert.equal(at(bar, typing).now, 'pads');
  assert.equal(at(20, typing).now, 'code');
});

test('recent typing postpones returning past four bars, until the next quiet bar', () => {
  const at = clock(); enter(at);
  for (let bar = 9; bar <= 13; bar++) assert.equal(at(bar, typing).now, 'code');
  assert.equal(at(13.5).now, 'code');
  assert.equal(at(14).now, 'pads');
});

test('continuous typing cannot keep the code page up longer than eight bars', () => {
  const at = clock(); enter(at);
  for (let bar = 9; bar < 16; bar++) assert.equal(at(bar, typing).now, 'code');
  assert.equal(at(16, typing).now, 'pads');
});

test('recording overrides take effect immediately; other override values are ignored', () => {
  const at = clock(); at(0);
  assert.equal(at(0.25, quiet, 'code').now, 'code');
  assert.equal(at(0.5, typing, 'pads').now, 'pads');
  assert.equal(at(1, typing, 'invalid').now, 'pads');
});
