// The share card (renderer/share-card.js, a prototype for 0.4.30): a plain module the web build copies as it is, a
// 1080 x 1350 picture drawn from the page's own parts, a safe file name, and Ctrl+K's entry, which waits for the card's
// ID to settle. What it looks like is seen in a real page (the stills for Colin's keep). Sources are read with LF endings.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareCardName } from '../renderer/share-card.js';

const read = (f) => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const mod = read('share-card.js'), app = read('app.js');

test('a plain module: no imports, no page globals, a 4:5 picture drawn from the theme, the card and the code', () => {
  assert.doesNotMatch(mod.replace(/\/\/.*$/gm, ''), /\b(import|require|window|localStorage|fetch)\b/);
  assert.match(mod, /const W = 1080, H = 1350,/);
  for (const v of ['--bg', '--fg', '--dim', '--faint', '--line-bg', '--accent', '--accent-text']) assert.ok(mod.includes(`v('${v}')`), v);
  for (const sel of ['.c-id', '.c-title', '.c-src', '.c-bpm', '.c-key', '.c-photo', '#code .ln']) assert.ok(mod.includes(sel), sel);
  assert.match(mod, /x\.fillText\('toaster\.locust\.lol', PAD, H - 56\)/);
  assert.match(mod, /const room = Math\.floor\(\(H - 150 - ly\) \/ 50\) \+ 1;/, 'as many code lines as fit above the link');
});

test('its file name is toaster- and the signal\'s ID, safe for any file system', () => {
  const doc = (id) => ({ getElementById: () => ({ querySelector: () => (id === null ? null : { textContent: id }) }) });
  assert.equal(shareCardName(doc(' DAF-121.Am ')), 'toaster-DAF-121.Am.png');
  assert.equal(shareCardName(doc('A/B C:d')), 'toaster-A-B-C-d.png');
  assert.equal(shareCardName(doc(null)), 'toaster-card.png');
});

test('Ctrl+K saves it: the card shown first, its ID left to settle, then a PNG named for it', () => {
  assert.match(app, /import \{ drawShareCard, shareCardName \} from '\.\/share-card\.js';/);
  assert.match(app, /\{ id: 'share-card', name: 'share card: save a picture of this song', aliases: \['share', 'picture', 'post', 'image'\], run: \(\) => saveShareCard\(\) \},/);
  const fn = app.slice(app.indexOf('async function saveShareCard()'), app.indexOf('\n}\n', app.indexOf('async function saveShareCard()')));
  assert.match(fn, /if \(!document\.body\.classList\.contains\('card-on'\)\) toggleCard\(\);/);
  assert.match(fn, /held < 400 && waited < 5000/);
  assert.match(fn, /drawShareCard\(document\)\.toBlob\(r, 'image\/png'\)/);
  assert.match(fn, /download: shareCardName\(document\)/);
});
