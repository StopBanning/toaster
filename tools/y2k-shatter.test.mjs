// The y2k bug's shatter (y2k.js): on the blue screen's last beat the glass cracks and falls away in shards. The pieces are seeded
// by the drop's time, so a render breaks it the same as the live page; they tile the whole screen (no hole where the blue screen
// shows through still standing); the ones nearest the hit fly hardest; and the blue screen gives way to them a 16th after the crack.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shardsOf } from '../renderer/y2k.js';

const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0)) / 2;

test('the same seed breaks the glass the same way; another seed another way', () => {
  assert.deepEqual(shardsOf(1080, 1920, 42), shardsOf(1080, 1920, 42));
  assert.notDeepEqual(shardsOf(1080, 1920, 42).hit, shardsOf(1080, 1920, 43).hit);
});

test('the shards cover the screen and the hit is on it, away from the edges', () => {
  for (const [w, h, seed] of [[1080, 1920, 1], [1920, 1080, 2], [1280, 800, 3]]) {
    const { hit, shards, lines } = shardsOf(w, h, seed);
    assert.equal(shards.length, 44);
    assert.ok(lines.length > 0);
    assert.ok(hit[0] > w * 0.3 && hit[0] < w * 0.7 && hit[1] > h * 0.3 && hit[1] < h * 0.65);
    // a grid of points on the screen: every one is inside some shard
    const inside = (x, y, pts) => pts.reduce((c, [ax, ay], i) => { const [bx, by] = pts[(i + 1) % pts.length]; return (ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay) ? !c : c; }, false);
    for (let gx = 0.02; gx < 1; gx += 0.07) for (let gy = 0.02; gy < 1; gy += 0.07)
      assert.ok(shards.some((s) => inside(gx * w, gy * h, s.pts)), `(${gx.toFixed(2)}, ${gy.toFixed(2)}) left uncovered`);
    assert.ok(shards.every((s) => area(s.pts) > 0));
  }
});

test('the shards by the hit fly harder than the far ones', () => {
  const { hit, shards } = shardsOf(1080, 1920, 7);
  const by = [...shards].sort((a, b) => Math.hypot(a.cx - hit[0], a.cy - hit[1]) - Math.hypot(b.cx - hit[0], b.cy - hit[1]));
  const speed = (s) => Math.hypot(s.vx, s.vy);
  assert.ok(speed(by[0]) > speed(by.at(-1)));
});

test('the blue screen cracks on its last beat and gives way to the shards a 16th later, the desktop under them', () => {
  const src = fs.readFileSync(new URL('../renderer/y2k.js', import.meta.url), 'utf8');
  assert.match(src, /crackAt = began \+ \(BSOD \+ 0\.75\) \* barLen, fallAt = crackAt \+ barLen \/ 16/);
  assert.match(src, /const onBlue = bar === BSOD && t < fallAt/);
  assert.match(src, /if \(t >= fallAt && !home\) \{ home = true; clearAll\(true\); setClock\(EVE\); \}/);
  assert.match(src, /clearShatter\(\);\r?\n\s+tasks\.innerHTML = '';/); // (a stop takes the pieces too)
});
