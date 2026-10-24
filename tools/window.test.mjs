import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
// main.js's 9:16 switch, on a window that only remembers its bounds
function fixture() {
  const src = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const part = src.slice(src.indexOf('  // Vertical mode:'), src.indexOf('  // The mini player:'));
  const handlers = {};
  let bounds = { x: 100, y: 100, width: 1280, height: 800 };
  const ctx = { ipcMain: { handle: (key, fn) => { handlers[key] = fn; } },
    screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }) },
    win: { getBounds: () => ({ ...bounds }), setBounds: (b) => { bounds = { ...b }; } } };
  vm.runInNewContext('let normalBounds = null; const unbig = async () => null, rebig = () => {};\n' + part, ctx);
  return { set: (on) => handlers['win:vertical']({}, on), get bounds() { return bounds; } };
}
const wide = { x: 100, y: 100, width: 1280, height: 800 };
test('9:16 asked for twice still goes back to the window it came from', async () => {
  const f = fixture();
  await f.set(true);
  const tall = f.bounds;
  assert.ok(tall.height > tall.width);
  await f.set(true);
  assert.deepEqual(f.bounds, tall);
  await f.set(false);
  assert.deepEqual(f.bounds, wide);
});
test('wide asked for twice leaves the window alone, and 9:16 still works after', async () => {
  const f = fixture();
  await f.set(true);
  await f.set(false);
  f.bounds.width = 1000; // (moved and resized by hand since)
  const moved = f.bounds;
  await f.set(false);
  assert.deepEqual(f.bounds, moved);
  await f.set(true);
  assert.ok(f.bounds.height > f.bounds.width);
  await f.set(false);
  assert.deepEqual(f.bounds, moved);
});
