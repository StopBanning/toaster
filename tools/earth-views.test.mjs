// The Earth's views (renderer/app.js, index.html): a view picked by name stays put, and "all views" is the tour, a new view
// every 8 bars on the downbeat. A steps through the views and then "all"; the background picker and Ctrl+K have an
// "all views" entry beside them; the footer says which. Sources are read with LF line endings.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_CLIPS, EARTH_GROUPS, EARTH_TOUR } from '../renderer/earth.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), html = read('renderer/index.html'), main = read('main.js');
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);

test('a view picked by name turns the tour off and stays; "all" turns it on', () => {
  const set = body('setEarthView');
  assert.match(set, /if \(view === 'all'\) state\.earthTour = true;/);
  assert.match(set, /else \{ state\.earthTour = false; state\.earthClip = view; earth\.setClip\(view\); \}/);
  assert.match(set, /earthTour\.at = nowSec\(\);/, 'a pick starts the count over');
  assert.match(set, /saveSettings\(\);/);
});

test('A steps through the views and then "all", round again', () => {
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

test('the picker has the Earth on its own shelves: "all views" first, then night, day and the station, each view with its picture', () => {
  assert.match(app, /tile\('earth', 'all', 'all views: a new one every 8 bars', now === 'earth' && state\.earthTour !== false\)/);
  assert.match(app, /const earthTile = \(c\) => tile\('earth', c\.replace\(\/ \/g, '-'\), c, now === 'earth' && state\.earthTour === false && state\.earthClip === c\);/, 'a view lit only while it is held');
  assert.match(app, /EARTH_GROUPS\.map\(\(\[shelf, views\]\) => `<div class="pick-sub">\$\{shelf\}<\/div><div class="pick-grid">\$\{views\.map\(earthTile\)\.join\(''\)\}<\/div>`\)/);
  assert.match(app, /\} else if \(b\.dataset\.kind === 'earth'\) \{\n\s*setEarthView\(b\.dataset\.name\.replace\(\/-\/g, ' '\), false\);/);
  for (const name of ['all', ...EARTH_CLIPS.map((c) => c.replace(/ /g, '-'))]) assert.ok(fs.existsSync(new URL(`../renderer/thumbs/earth-${name}.webp`, import.meta.url)), name);
});

test('every view is on one shelf, in the tour once, and has its poster and its checksum', () => {
  const shelved = EARTH_GROUPS.flatMap(([, views]) => views);
  assert.deepEqual([...shelved].sort(), [...EARTH_CLIPS].sort(), 'the shelves hold every view once');
  assert.deepEqual([...EARTH_TOUR].sort(), [...EARTH_CLIPS].sort(), 'the tour visits every view once');
  assert.deepEqual(EARTH_CLIPS.slice(0, 5), ['aurora', 'northern lights', 'city lights', 'dawn', 'day'], "the first five keep their places (0.5.0's saved views)");
  assert.equal(new Set(EARTH_CLIPS).size, EARTH_CLIPS.length);
  for (const c of EARTH_CLIPS) {
    const file = 'earth-' + c.replace(/ /g, '-');
    assert.ok(fs.existsSync(new URL(`../renderer/earth/${file}.jpg`, import.meta.url)), file + ' poster');
    assert.match(main, new RegExp(`'${file}': '[0-9a-f]{64}',`), file + ' checksum');
    assert.doesNotMatch(c, /-/, 'a name has spaces, its file has dashes: a dash in a name would not come back from the picker');
  }
  // no two views of one shelf meet in the tour (each change is a change of light), the round's end included
  const shelfOf = (c) => EARTH_GROUPS.find(([, views]) => views.includes(c))[0];
  EARTH_TOUR.forEach((c, i) => assert.notEqual(shelfOf(c), shelfOf(EARTH_TOUR[(i + 1) % EARTH_TOUR.length]), `${c} then ${EARTH_TOUR[(i + 1) % EARTH_TOUR.length]}`));
});

test("the tour goes round in its own order; the kept clips in memory are capped", () => {
  assert.match(body('nextEarthClip'), /state\.earthClip = EARTH_TOUR\[\(EARTH_TOUR\.indexOf\(state\.earthClip\) \+ 1\) % EARTH_TOUR\.length\];/);
  const earthJs = read('renderer/earth.js');
  assert.match(earthJs, /if \(urls\.size <= KEEP_URLS\) break;\n\s*if \(k !== n && k !== name && k !== wanted\) \{ URL\.revokeObjectURL\(url\); urls\.delete\(k\); \}/);
});

test('fewer flashes: the day side only breathes and a drop only opens the exposure', () => {
  const earthJs = read('renderer/earth.js');
  assert.match(earthJs, /0\.18 \* uKick \* \(1\.0 - uCalm\)/);
  assert.match(earthJs, /c \*= 1\.0 \+ 0\.18 \* uDrop \+ 0\.4 \* uHit \* \(1\.0 - uCalm\);/);
  assert.match(earthJs, /\(1\.0 - 0\.035 \* uHit \* \(1\.0 - uCalm\)\)/);
  assert.match(app, /earth\.draw\(t, eng, \{ offset: syncOffset\(\), calm: state\.calm \}\);/);
});

test('Ctrl+K has each view (it stays) and "all views"; the footer and the help say which', () => {
  assert.match(app, /id: 'earth:' \+ c, name: `earth \(\$\{c\}\)`,/);
  assert.match(app, /run: \(\) => \{ setEarthView\(c, false\); setVisual\(VISUALS\.indexOf\('earth'\)\); flashStatus\(earthLabel\(\)\); \},/);
  assert.match(app, /\{ id: 'earth:all', name: 'earth \(all\): a new view every 8 bars', aliases: \[[^\]]*'earth tour'[^\]]*\],\n\s*run: \(\) => \{ setEarthView\('all', false\);/);
  assert.match(app, /const earthLabel = \(\) => \(state\.earthTour !== false \? 'earth \(all\): a new view every 8 bars' : `earth \(\$\{state\.earthClip\}\)`\);/);
  assert.match(app, /v === 'earth' \? \(state\.earthTour !== false \? 'all' : state\.earthClip\) :/);
  assert.match(html, /the Earth's view \(twenty of them, each one staying put, then all views: a new one every 8 bars, on the downbeat, night, day and the station's sights in turn\)/);
});

test('an older profile (no earthTour saved) gets "all views", as 0.5.0 behaved', () => {
  assert.match(app, /state\.earthTour = state\.earthTour !== false;/);
});
