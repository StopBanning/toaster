// A render (a perfect copy, a take) plays no sound of its own, so its page's audio context may stop: the "the sound stopped: tap
// anywhere" note must not come up then, or it's drawn into the video (Nov 3: it showed under the y2k bug's taskbar in a take).
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('no "tap anywhere" note in a render', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const i = app.indexOf('function waitForTap() {');
  assert.ok(i > 0);
  assert.match(app.slice(i, i + 200), /if \(tapToRevive \|\| globalThis\.clock\?\.mode === 'render'\) return;/);
});
