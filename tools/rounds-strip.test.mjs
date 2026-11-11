// The rounds' strip (app.js ROUNDS, #strip): each key that goes round a list shows its whole list. Read from the source,
// as the page's own code can't be loaded outside a window; tools in the hidden copy walk every round (see the commit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../renderer/${f}`, import.meta.url), 'utf8');
const app = read('app.js'), css = read('style.css'), html = read('index.html');
const rounds = app.slice(app.indexOf('const ROUNDS = {'), app.indexOf('const strip = '));

test('every key that goes round a list has a round, and each is one of the actions', () => {
  const ids = [...rounds.matchAll(/^  (\w+): /gm)].map((m) => m[1]);
  assert.deepEqual(ids, ['visual', 'strength', 'blocks', 'theme', 'dropfx', 'camfx', 'look', 'cam', 'orb', 'card', 'code']);
  for (const id of ids) assert.match(app, new RegExp(`\\{ id: '${id}', key: '`), id);
});

test("the drop effects' strip starts at off, without moving the saved places in the list", () => {
  assert.match(rounds, /dropfx: \(\) => \(\{[^\n]*names: DROPS, at: state\.drop, from: DROPS\.indexOf\('off'\)/);
  assert.match(app, /const DROPS = \['xp takeover', 'y2k bug', 'blue screen', 'not responding', 'off'\];/);
});

test('a press still goes on as it did, and then shows the list; Shift goes back; the arrows only while it shows', () => {
  assert.match(app, /const ran = act\.run\(\);\r?\n  if \(ROUNDS\[act\.id\]\) Promise\.resolve\(ran\)\.then\(\(\) => showRound\(act\.id\)/);
  assert.match(app, /if \(e\.shiftKey && \/\^\[a-z0-9\]\$\/\.test\(k\) && ROUNDS\[act\.id\] && stepRound\(act\.id, -1\)\) return;/);
  assert.match(app, /\(k === 'arrowleft' \|\| k === 'arrowright'\) && stripShowing\(\)/);
});

test('the strip is out of a recording, the clean look and the handheld on its own, and under the CRT', () => {
  assert.match(css, /#strip\[hidden\], body\.clean #strip, body\.recording #strip, body\.widget #strip \{ display: none; \}/);
  const z = (sel) => +css.match(new RegExp(`${sel} \\{[^}]*z-index: (\\d+)`))[1];
  assert.ok(z('#strip') < z('#tube'));
  assert.match(html, /<div id="strip" role="toolbar"[^>]* hidden><\/div>/);
});

test('the strip goes by itself, even with the mouse left resting on it', () => {
  assert.doesNotMatch(app, /strip\.onpointerenter/);
  assert.match(app, /strip\.onpointermove = \(\) => \{ clearTimeout\(stripT\); stripT = setTimeout\(hideRound, 6000\); \};/);
});

test('its names are set as text, never as markup (looks can come from outside)', () => {
  const show = app.slice(app.indexOf('function showRound('), app.indexOf('function stepRound('));
  assert.doesNotMatch(show, /innerHTML/);
});

test("the camera's way is picked by toggleCam's own first and last steps, never through the ways between", () => {
  const pick = app.slice(app.indexOf('async function pickCam('), app.indexOf('// Punchcard blocks') > app.indexOf('async function pickCam(') ? app.indexOf('// Punchcard blocks') : app.indexOf('async function toggleLayout('));
  assert.match(pick, /if \(i === 0\) \{ state\.eyes = false; state\.ascii = true; return toggleCam\(\); \}/);
  assert.match(pick, /if \(!cam\.on\) return toggleCam\(\);/);
  assert.equal((pick.match(/toggleCam\(\)/g) || []).length, 2);
});

// ---- the help's pages (helpTab, #help[data-tab]) ----
test("the help has four pages, opens on the keys, and every piece of it belongs to one", () => {
  const help = html.slice(html.indexOf('<dialog id="help">'), html.indexOf('</dialog>', html.indexOf('<dialog id="help">')));
  assert.deepEqual([...help.matchAll(/role="tab" data-tab="(\w+)"/g)].map((m) => m[1]), ['keys', 'settings', 'new', 'how']);
  assert.match(app, /\nhelpTab\('keys'\);/);
  // nothing moved (other tests read the order): the paragraphs and the settings are tagged where they stand
  assert.equal((help.match(/class="t-how"/g) || []).length, 3);
  assert.match(help, /<tr class="t-set"><td><\/td><td><label><input type="checkbox" id="staged-typos"/);
  for (const tab of ['keys', 'settings', 'new', 'how']) assert.match(css, new RegExp(`#help\\[data-tab="${tab}"\\] :is\\(`), tab);
  // every direct child of the help is shown by some page's rule or by none hiding it (the tools, the tabs, the close)
  const kids = [...help.matchAll(/\n  <(\w+)(?: class="([\w -]+)")?/g)].map((m) => m[2] || m[1]);
  for (const k of kids) assert.ok(['help-tools', 'help-tabs', 't-how', 'calm', 'rounds-note', 'table', 'keys-note', 'form'].includes(k), k);
});

test("'Show in help' on the what's-new box opens the help on that page", () => {
  assert.match(app, /\$\('help'\)\.showModal\(\); helpTab\('new'\); \}\);/);
});

test("R goes round what floats over the picture: none, the orb, the glass blob, both, its place read from the two", () => {
  assert.match(app, /const OVER = \['none', 'the orb', 'the glass blob', 'both'\];/);
  assert.match(app, /const overAt = \(\) => \(state\.orb \? 1 : 0\) \+ \(state\.glass \? 2 : 0\);/);
  assert.match(app, /\{ id: 'orb', key: 'r', run: \(\) => pickOver\(\(overAt\(\) \+ 1\) % OVER\.length\) \}/);
  assert.match(rounds, /orb: \(\) => \(\{ word: 'over the picture', names: OVER, at: overAt\(\), pick: pickOver \}\)/);
  // the same sums as pickOver's: bit 1 the orb, bit 2 the glass
  const at = (orb, glass) => (orb ? 1 : 0) + (glass ? 2 : 0);
  assert.deepEqual([at(0, 0), at(1, 0), at(0, 1), at(1, 1)], [0, 1, 2, 3]);
  // a recording's perfect copy follows the glass as it does the orb
  assert.match(app, /const TAKE_EXTRAS = \['orb', 'glass', /);
  assert.match(app, /glass: \(on\) => setGlass\(on\)/);
});
