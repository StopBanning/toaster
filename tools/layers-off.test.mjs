// Every background layer is taken out of the page while it's off (app.js, LAYER_ON and showLayers). One that isn't stays
// over the layers under it: the backrooms had no line there from the day it came (Nov 3) to 0.5.6, and its canvas, emptied
// but still the size of the window and not see-through, was a black sheet over the worlds, the chrome, the spaghetti and
// the Earth after any visit to it (found Nov 10 in a hidden copy: the chrome drew into its own picture, 100 to 190 of 255 in
// the middle, while the window showed 9; with the backrooms' canvas taken out the window showed it again).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
const layers = /const LAYERS = \[([^\]]+)\]\.map\(\$\);/.exec(app)[1].match(/'([a-z]+)'/g).map((s) => s.slice(1, -1));
const on = app.slice(app.indexOf('const LAYER_ON = {'), app.indexOf('function showLayers()'));

test('the list of layers was found', () => {
  assert.ok(layers.length >= 19, String(layers.length));
  for (const id of ['worlds', 'chrome', 'earth', 'backrooms', 'scenery']) assert.ok(layers.includes(id), id);
});

test('every background layer has its line in LAYER_ON, so it leaves the page while it is off', () => {
  for (const id of layers) assert.match(on, new RegExp(`\\n  ${id}: \\(\\) =>`), `${id} has no line in LAYER_ON: it would stay over the layers under it`);
});

test('the backrooms is in the page only while it is the background', () => {
  assert.match(on, /\n  backrooms: \(\) => VISUALS\[state\.visual\] === 'backrooms',/);
});
