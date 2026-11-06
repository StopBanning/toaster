// The Earth's views (renderer/app.js, index.html): a view picked by name stays put, and "all views" is the tour, a new view
// every 8 bars on the downbeat. A steps through the five views and then "all"; the background picker and Ctrl+K have an
// "all views" entry beside the five; the footer says which. Sources are read with LF line endings.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_CLIPS } from '../renderer/earth.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), html = read('renderer/index.html');
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);

test('a view picked by name turns the tour off and stays; "all" turns it on', () => {
  const set = body('setEarthView');
  assert.match(set, /if \(view === 'all'\) state\.earthTour = true;/);
  assert.match(set, /else \{ state\.earthTour = false; state\.earthClip = view; earth\.setClip\(view\); \}/);
  assert.match(set, /earthTour\.at = nowSec\(\);/, 'a pick starts the count over');
  assert.match(set, /saveSettings\(\);/);
});

test('A steps through the five views and then "all", round again', () => {
  const next = body('nextEarthView');
  assert.match(next, /const order = \[\.\.\.EARTH_CLIPS, 'all'\], now = state\.earthTour !== false \? 'all' : state\.earthClip;/);
  assert.match(next, /setEarthView\(order\[\(order\.indexOf\(now\) \+ 1\) % order\.length\]\);/);
  assert.match(app, /VISUALS\[state\.visual\] === 'earth' \? nextEarthView\(\) :/, "A on the Earth is nextEarthView");
  // the order a press gives: from "all" to the first view, from the last view to "all"
  const order = [...EARTH_CLIPS, 'all'], step = (now) => order[(order.indexOf(now) + 1) % order.length];
  assert.equal(step('all'), EARTH_CLIPS[0]);
  assert.equal(step(EARTH_CLIPS.at(-1)), 'all');
  assert.deepEqual(EARTH_CLIPS.map(step).slice(0, -1), EARTH_CLIPS.slice(1));
});

test('the tour moves on only with "all" picked, and only the tour calls nextEarthClip', () => {
  assert.match(body('tourEarth'), /state\.earthTour === false/);
  const calls = [...app.matchAll(/nextEarthClip\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(calls, ['quiet = false', 'true'], 'its definition and the tour, nothing else');
});

test('the picker has an "all views" tile first, a view lit only while it is held, and its picture exists', () => {
  assert.match(app, /v === 'earth' \? \[tile\('earth', 'all', 'earth \(all\)', now === v && state\.earthTour !== false\), \.\.\.EARTH_CLIPS\.map\(\(c\) => tile\('earth', c\.replace\(\/ \/g, '-'\), `earth \(\$\{c\}\)`, now === v && state\.earthTour === false && state\.earthClip === c\)\)\]/);
  assert.match(app, /\} else if \(b\.dataset\.kind === 'earth'\) \{\n\s*setEarthView\(b\.dataset\.name\.replace\(\/-\/g, ' '\), false\);/);
  for (const name of ['all', ...EARTH_CLIPS.map((c) => c.replace(/ /g, '-'))]) assert.ok(fs.existsSync(new URL(`../renderer/thumbs/earth-${name}.webp`, import.meta.url)), name);
});

test('Ctrl+K has each view (it stays) and "all views"; the footer and the help say which', () => {
  assert.match(app, /id: 'earth:' \+ c, name: `earth \(\$\{c\}\)`,/);
  assert.match(app, /run: \(\) => \{ setEarthView\(c, false\); setVisual\(VISUALS\.indexOf\('earth'\)\); flashStatus\(earthLabel\(\)\); \},/);
  assert.match(app, /\{ id: 'earth:all', name: 'earth \(all\): a new view every 8 bars', aliases: \[[^\]]*'earth tour'[^\]]*\],\n\s*run: \(\) => \{ setEarthView\('all', false\);/);
  assert.match(app, /const earthLabel = \(\) => \(state\.earthTour !== false \? 'earth \(all\): a new view every 8 bars' : `earth \(\$\{state\.earthClip\}\)`\);/);
  assert.match(app, /v === 'earth' \? \(state\.earthTour !== false \? 'all' : state\.earthClip\) :/);
  assert.match(html, /the Earth's view \(the aurora, the northern lights, city lights, dawn, the day side, each one staying put, then all views: a new one every 8 bars, on the downbeat\)/);
});

test('an older profile (no earthTour saved) gets "all views", as 0.5.0 behaved', () => {
  assert.match(app, /state\.earthTour = state\.earthTour !== false;/);
});
