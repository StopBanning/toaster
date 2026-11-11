// The app's WebGL pictures against Chromium's limit. A page may keep 16 WebGL contexts alive; a 17th kills the oldest for good
// (no webglcontextrestored follows a forced loss, and WEBGL_lose_context cannot be asked for on a lost context). Toaster makes one per
// layer the first time it is shown, so a session that tried most of them went over: on 0.5.5 one round of V, a look, the orb, the
// camera with its eight effects, the library and the handheld lost the looks' layer at about 45 s, and on another walk the worlds,
// the chrome and the spaghetti drew black till a restart (Nov 10; replayed in a hidden copy with a fake camera, both ways).
// (That second walk's black was mostly another bug, found later the same day: the backrooms' canvas left over those three,
// tools/layers-off.test.mjs. The lost looks' layer was this one. In a browser, where the limit can't be raised, the pictures
// take turns instead: renderer/gl-pool.js, tools/gl-pool.test.mjs.)
// main.js raises the limit for the desktop app. This counts the layers in the source, so a new one cannot quietly pass the limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const main = readFileSync(new URL('main.js', root), 'utf8');
const files = readdirSync(new URL('renderer/', root)).filter((f) => f.endsWith('.js'));
// each place a layer asks for a context of its own (a second ask on the same line is the same canvas falling back to WebGL 1)
const makers = files.flatMap((f) => readFileSync(new URL('renderer/' + f, root), 'utf8').split('\n')
  .filter((l) => /getContext\(['"]webgl2?['"],/.test(l)).map(() => f));

test('the desktop app raises Chromium\'s limit of live WebGL contexts', () => {
  const m = /app\.commandLine\.appendSwitch\('max-active-webgl-contexts', '(\d+)'\);/.exec(main);
  assert.ok(m, 'main.js sets max-active-webgl-contexts');
  assert.ok(main.indexOf(m[0]) < main.indexOf('app.whenReady'), 'before the app is ready: a switch set later is not read');
});

test('the limit has room for every layer at once, with a quarter to spare', () => {
  const limit = +/'max-active-webgl-contexts', '(\d+)'/.exec(main)[1];
  assert.ok(makers.length >= 17, `the count found the layers (${makers.length})`);
  assert.ok(limit >= Math.ceil(makers.length * 1.25), `${makers.length} layers (${[...new Set(makers)].join(', ')}) against a limit of ${limit}`);
});
