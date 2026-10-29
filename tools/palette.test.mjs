import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCommands, actionCommands } from '../renderer/palette.js';

const entries = [
  { name: 'whale sharks' },
  { name: 'sharks' },
  { name: 'record', aliases: ['rec', 'recording'] },
  { name: 'handheld screens: the Japan edition', aliases: ['jp', 'japan'] },
];

test('a name that starts with it beats a word that starts with it, which beats anywhere', () => {
  assert.equal(matchCommands(entries, 'SHA')[0].name, 'sharks');
  assert.equal(matchCommands(entries, 'shar')[1].name, 'whale sharks');
});

test('aliases: rec for recording, jp for the Japan edition', () => {
  assert.equal(matchCommands(entries, 'rec')[0].name, 'record');
  assert.match(matchCommands(entries, 'jp')[0].name, /Japan/);
});

test('keys are looked up from the current bindings', () => {
  let key = 'M';
  const actions = [{ id: 'rec', run() {} }];
  assert.equal(actionCommands(actions, () => key)[0].key, 'M');
  key = 'R';
  assert.equal(actionCommands(actions, () => key)[0].key, 'R');
});

test('an empty search, ties in list order, the cap and no matches', () => {
  assert.equal(matchCommands(entries, '', 2).length, 2);
  assert.deepEqual(matchCommands(entries, 'missing'), []);
  assert.equal(matchCommands(entries, '   ')[0], entries[0]);
});
