// The backrooms (V, renderer/backrooms.js): the song works the lights. A drop blows the tubes out (a white flash, then dark for
// half a beat), a kick brightens the rooms with a bloom that fades, the drop's bars sit dimmer so the kicks show, and in a quiet
// stretch the tubes stutter now and then (the same each run). The view is in V's round, the picker and Ctrl+K, and its walk comes
// down like the Earth's views (a checked file, kept), with its poster and picture in the app.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// (the module imports the clock, which wants a window; lightsAt itself is pure)
globalThis.window ??= globalThis;
const { lightsAt } = await import('../renderer/backrooms.js');
const beat = 0.5;

test('a drop blows the tubes out, then dark, then a kick relights them', () => {
  assert.equal(lightsAt(10.02, { drop: 10, kick: 10, beat }).white, 1);
  const dark = lightsAt(10.15, { drop: 10, kick: 10, beat });
  assert.equal(dark.white, 0);
  assert.ok(dark.light < 0.15);
  const relit = lightsAt(10.6, { drop: 10, kick: 10.5, beat });
  assert.ok(relit.light > 0.95 && relit.bloom > 0.7, JSON.stringify(relit));
});

test('a kick rises over three frames and fades back; through the drop the rooms sit dimmer than in a calm part', () => {
  const at = (dt, drop) => lightsAt(20 + dt, { kick: 20, drop, beat });
  assert.ok(at(0.1, 15).light > at(0.4, 15).light && at(0.1, 15).light > at(0.03, 15).light);
  assert.ok(at(1.5, 15).light < at(1.5, -99).light); // (in the drop's bars, the floor between kicks is lower)
  // a kick known only 0.09 s after it sounded still rises over 0.1 s from then, not in one frame
  const late = (dt) => lightsAt(20 + dt, { kick: 20, seen: 20.09, drop: 15, beat }).light;
  assert.ok(late(0.09) < late(0.13) && late(0.13) < late(0.19));
});

test('in a quiet stretch the tubes stutter now and then, the same every run', () => {
  const run = () => Array.from({ length: 2000 }, (_, i) => lightsAt(100 + i / 60, { kick: 50, drop: -99, beat }).light);
  const a = run(), b = run();
  assert.deepEqual(a, b);
  const dips = a.filter((l) => l < 0.85).length; // (gentle: never below ~0.7, and rare)
  assert.ok(dips > 3 && dips < 120 && Math.min(...a) > 0.65, `dips ${dips}, min ${Math.min(...a)}`);
});

test('it is in V, the picker and Ctrl+K, and its walk is fetched and checked like the Earth\'s views', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  assert.match(app, /const VISUALS = \[[^\]]*'backrooms'\]/);
  assert.match(app, /const V_ROUND = \[[^\]]*'backrooms'/);
  assert.match(app, /id: 'vis:backrooms'/);
  assert.match(app, /prepareFrame = \(t\) => Promise\.all\(\[[^\]]*backrooms\.prepare\(t\)\]\)/);
  const main = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /'backrooms-walk': '[0-9a-f]{64}'/);
  for (const f of ['../renderer/backrooms/backrooms-walk.jpg', '../renderer/thumbs/bg-backrooms.webp']) assert.ok(fs.existsSync(new URL(f, import.meta.url)), f);
  assert.match(fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8'), /<canvas id="backrooms"/);
});
