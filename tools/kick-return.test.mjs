// The kick line back after a break (Nov 3): a breakdown's two empty bars put a non-four kick line aside (v.away) instead of
// forgetting it, and the kick's second hit back on that line's steps brings it back at once; a hit off it drops it, and the
// pattern is learned as before. (Glue's drop: the line muted 6.2 s -> 2.2 s; the detection bench unchanged, churn 2.02 -> 1.96.)
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('two empty bars put the kick line aside, not away', () => {
  assert.match(src, /v\.away = v\.shown\.slice\(\);\n\s+v\.awayN = 0;\n\s+v\.shown = null;/);
});

test('its second kick back on the line brings it back; one off it drops it', () => {
  const i = src.indexOf("if (id === 'bd' && v.away && !v.shown) {");
  assert.ok(i > 0);
  const body = src.slice(i, i + 700);
  assert.match(body, /if \(!v\.away\[p\.step\]\) v\.away = null;/);
  assert.match(body, /else if \(\+\+v\.awayN >= 2\)/);
  assert.match(body, /v\.shown = v\.away\.slice\(\);/);
});

test('a line learned again the usual way forgets what was put aside', () => {
  assert.match(src, /v\.stale = false;\n\s+v\.away = null;/);
});
