// The keys you changed (renderer/app.js, ACTIONS and readKeys): saved as action -> key, only those that differ from the defaults. A profile
// from before an action had its key may have set that key for another action (U's look and G's library came in after some profiles had
// put their own keys there), and then two actions had one key, and the one later in the list took it (the review of Nov 1, D2 8). The
// code is the page's own, sliced out of app.js and run on the real list of actions (their ids and keys read from the source).
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const actionsBlock = text.slice(text.indexOf('const ACTIONS = ['), text.indexOf('\n];', text.indexOf('const ACTIONS = [')));
const ACTIONS = [...actionsBlock.matchAll(/^ {2}\{ id: '([\w:-]+)', key: '(.)'/gm)].map(([, id, key]) => ({ id, key }));
const start = text.indexOf('function readKeys(');
const inPage = vm.runInNewContext(`${text.slice(start, text.indexOf('\n}\n', start) + 2)}; readKeys`, { ACTIONS, Object, Set, Array });
const readKeys = (saved) => ({ ...inPage(saved) }); // (an object of this realm, to compare)
const effective = (keys) => ACTIONS.map((a) => keys[a.id] ?? a.key);

test('the actions and their keys read from the source are the page\'s: the look on U and the library on G are among them, every key its own', () => {
  assert.ok(ACTIONS.length >= 28, `${ACTIONS.length} actions`);
  assert.equal(ACTIONS.find((a) => a.id === 'look').key, 'u');
  assert.equal(ACTIONS.find((a) => a.id === 'library').key, 'g');
  assert.equal(new Set(ACTIONS.map((a) => a.key)).size, ACTIONS.length, 'no two share a default');
});

test('a key saved for an action that is now another\'s own (U, G) goes back to that one\'s: the new action keeps its key, the old setting is let go (D2 8)', () => {
  assert.deepEqual(readKeys({ name: 'u' }), {}, 'e was moved to U: U is the look\'s now');
  assert.deepEqual(readKeys({ hide: 'g' }), {}, 'h was moved to G: G is the library\'s');
  assert.deepEqual(readKeys({ name: 'u', hide: 'g', clips: '1' }), { clips: '1' }, 'the others stay');
  // one that goes back to its own key may find that taken too, by a key saved for another: that one goes back as well
  assert.deepEqual(readKeys({ name: 'u', hide: 'e' }), {}, 'name goes back to E, which hide had taken');
  assert.deepEqual(readKeys({ name: 'u', hide: 'e', rec: 'h' }), {}, 'and hide, back on H, takes it from rec, which goes back too');
  assert.deepEqual(readKeys({ name: 'u', hide: 'e', rec: '2' }), { rec: '2' }, 'one that has nothing to do with them stays');
});

test('what was fine is kept: free keys, two actions swapped, a key saved as the action\'s own, the first of two saved on one key (D2 8)', () => {
  assert.deepEqual(readKeys({ name: '1' }), { name: '1' }, 'every letter is some action\'s own: a free key is a digit or a mark');
  assert.deepEqual(readKeys({ name: 'g', library: 'e' }), { name: 'g', library: 'e' }, 'E and G traded: each has the other\'s, nobody collides');
  assert.deepEqual(readKeys({ look: 'u' }), { look: 'u' }, 'as its own');
  assert.deepEqual(readKeys({ name: '1', hide: '1' }), { name: '1' }, 'the first of two on one key');
  assert.deepEqual(readKeys({}), {});
});

test('anything else saved is let go: not an object, not single keys, nothing in them (as before)', () => {
  for (const saved of [null, undefined, 'abc', 7, true]) assert.deepEqual(readKeys(saved), {}, String(saved));
  assert.deepEqual(readKeys({ name: 5, hide: '', rec: null, clips: ['1'], export: '2' }), { export: '2' });
});

test('whatever is saved, no two actions end up on one key, and what did not collide is not touched (D2 8)', () => {
  let seed = 12345;
  const dice = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const pool = [...new Set([...ACTIONS.map((a) => a.key), '1', '2', '3', ';'])];
  for (let n = 0; n < 3000; n++) {
    const saved = {};
    for (const a of ACTIONS) if (dice() < 0.25) saved[a.id] = pool[Math.floor(dice() * pool.length)];
    const keys = readKeys(saved), all = effective(keys);
    assert.equal(new Set(all).size, ACTIONS.length, `one key each: ${JSON.stringify(saved)} gave ${JSON.stringify(keys)}`);
    for (const id of Object.keys(keys)) assert.equal(keys[id], saved[id], 'only ever let go, never changed');
    // a profile that had no collisions at all comes back whole
    const clean = effective(saved);
    if (new Set(clean).size === ACTIONS.length) assert.deepEqual(keys, saved, `kept whole: ${JSON.stringify(saved)}`);
  }
});

test('the page reads its saved keys through it', () => {
  assert.match(text, /\n  state\.keys = readKeys\(state\.keys\);/);
});
