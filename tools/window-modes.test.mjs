// The window modes (renderer/app.js changeWindowMode): 9:16, the mini player, and back. The polish walk, Nov 16: in the 9:16 window, W (the mini) and W again gave the
// wide window, not 9:16: entering the mini leaves the vertical mode and leaving the mini did not return to it. Run on stand-ins for the rest of the page.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const a = text.indexOf('let windowChanging = false;'), b = text.indexOf('\n}\n', text.indexOf('async function changeWindowMode(')) + 3;
assert.ok(a >= 0 && b > a, 'found changeWindowMode');

function page() {
  const calls = [], classes = new Set(), state = { mini: false, vertical: false };
  const nc = { setMini: async (on, shape) => { calls.push(['mini', on, shape]); return on; }, setVertical: async (on) => { calls.push(['vertical', on]); return on; } };
  const context = { state, calls, window: { nc }, document: { body: { classList: { contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } },
    $: () => ({ textContent: '' }), applyCard() {}, gameShowing: () => false, rec: { mr: null }, clips: { on: false }, flashStatus() {}, K: (x) => x, showError(e) { throw e; } };
  vm.runInNewContext(text.slice(a, b) + ';globalThis.change = changeWindowMode;', context);
  return { change: (m) => context.change(m), state, calls, mode: () => (state.mini ? 'mini' : state.vertical ? '9:16' : 'wide') };
}

test('9:16, then the mini, then the mini again: back in 9:16', async () => {
  const p = page();
  await p.change('vertical'); assert.equal(p.mode(), '9:16');
  await p.change('mini'); assert.equal(p.mode(), 'mini');
  await p.change('mini'); assert.equal(p.mode(), '9:16', 'the window the mini left');
  assert.deepEqual(p.calls, [['vertical', true], ['vertical', false], ['mini', true, 'wide'], ['mini', false, 'wide'], ['vertical', true]]);
  await p.change('mini'); await p.change('mini');
  assert.equal(p.mode(), '9:16', 'and again');
});

test('the wide window still comes back wide', async () => {
  const p = page();
  await p.change('mini'); assert.equal(p.mode(), 'mini');
  await p.change('mini'); assert.equal(p.mode(), 'wide');
  assert.deepEqual(p.calls, [['mini', true, 'wide'], ['mini', false, 'wide']]);
});

test('9:16 left by its own button, then the mini from the wide window, comes back wide', async () => {
  const p = page();
  await p.change('vertical'); await p.change('vertical'); assert.equal(p.mode(), 'wide');
  await p.change('mini'); await p.change('mini');
  assert.equal(p.mode(), 'wide', 'it was not left for the mini');
});

test('in the mini, choosing 9:16 is a choice: it is 9:16, and the next mini from the wide window forgets it', async () => {
  const p = page();
  await p.change('vertical'); await p.change('mini');
  await p.change('vertical'); assert.equal(p.mode(), '9:16');   // (the 9:16 button in the mini: out of it, into 9:16, no second jump)
  assert.deepEqual(p.calls.slice(-2), [['mini', false, 'wide'], ['vertical', true]]);
  await p.change('vertical'); await p.change('mini'); await p.change('mini');
  assert.equal(p.mode(), 'wide');
});
