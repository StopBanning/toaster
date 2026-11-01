// The richer dynamic palette (0.4.29): the scenes' paint pass takes the cover's ground, lights and accent in the theme's
// colours (scenery.js), the fixed themes keep their two tones exactly, and the highlights take the accent (style.css).
// The colours themselves are in cover-palette.test.mjs. Sources are read with LF line endings.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (f) => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const scenery = read('scenery.js'), css = read('style.css'), news = read('news.js');

test('the paint pass has the palette: three colours and a switch, and with the switch off its two tones exactly as before', () => {
  assert.match(scenery, /uniform vec3 ground, lights, accent;[^\n]*\nuniform float pal;/);
  assert.match(scenery, /vec3 themed\(vec3 c\) \{\n  float l = dot\(c, vec3\(0\.3, 0\.55, 0\.15\)\);\n  if \(pal < 0\.5\) return mix\(bg, fg, l\);/);
  assert.match(scenery, /vec3 inkOf\(vec3 c\) \{ return pal < 0\.5 \? fg : family\(c\); \}/);
  // every two-tone colour goes through themed() now: none is left mixing the two by hand
  assert.doesNotMatch(scenery, /mix\(bg, fg, dot\(/);
  assert.equal((scenery.match(/(?<!vec3 )themed\([^)]/g) || []).length, 6, 'its six calls');
  // the glyphs' ink and the wash under them: the text colour and the text colour's tint, unless the palette is on
  assert.match(scenery, /vec3 wash = pal > 0\.5 \? ground : fg, under = rim \? mix\(bg, wash, 0\.05 \* gridK\) : mix\(bg, wash, 0\.22 \* tl\.a \* min\(1\.0, k\)\);\n    col = mix\(under, inkOf\(cc\), cov \*/);
});

test('a colour\'s family in the palette: vivid warm ones the accent, vivid cool ones the ground, grey and pale ones the lights', () => {
  const fam = scenery.slice(scenery.indexOf('vec3 family(vec3 c) {'), scenery.indexOf('\n}\n', scenery.indexOf('vec3 family(vec3 c) {')));
  assert.match(fam, /warm = clamp\(\(c\.r - c\.b\) \/ max\(mx - mn, 1e-3\), -1\.0, 1\.0\)/);
  assert.match(fam, /return mix\(lights, mix\(ground, accent, smoothstep\(-0\.2, 0\.5, warm\)\), smoothstep\(0\.15, 0\.5, s\)\);/);
});

test('the scenery is handed the palette only in the theme\'s colours, and sets the switch from it', () => {
  assert.match(scenery, /draw\(t, eng, \{ col, offset = 0, colours = 'own', palette = null, strength = 1\.5, scene = 'lake', open = false \} = \{\}\)/);
  assert.match(scenery, /const pal = colours === 'theme' && palette, v3 = /);
  assert.match(scenery, /gl\.uniform1f\(p\('pal'\), pal \? 1 : 0\);/);
  assert.match(scenery, /v3\('ground', pal \? palette\.ground : col\.fg\); v3\('lights', pal \? palette\.lights : col\.fg\); v3\('accent', pal \? palette\.accent : col\.fg\);/);
});

test('the highlights take the accent: marks and large text the accent, text and what text sits on the accent as text', () => {
  const rule = (sel) => { const i = css.indexOf('\n' + sel + ' {'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };
  assert.match(rule('.tok.on'), /outline: 2px solid var\(--accent\)/);
  assert.match(rule('.panel .cur, .panel .lab.on'), /background: var\(--accent\)/);
  assert.match(rule('#card .c-id'), /color: var\(--accent\)/);
  assert.match(rule('#card .c-title'), /color: var\(--accent-text\)/);
  assert.match(rule('#player .pl-play'), /background: var\(--accent\)/);
  assert.match(rule('#player .pl-fill'), /background: var\(--accent\)/);
  assert.match(rule('#library .lib-row.on'), /background: var\(--accent-text\)/);
});

test('the news: one line for the richer palette in the 0.4.29 block, under T', () => {
  const head = news.slice(news.indexOf('export const NEWS = ['), news.indexOf("version: '0.4.28'"));
  const lines = [...head.matchAll(/\{ key: 'T', text: "([^"]+)" \}/g)];
  assert.equal(lines.length, 1);
  assert.match(lines[0][1], /^[a-z]/);
  for (const word of ['dynamic', 'accent', 'scenes', 'spectrogram']) assert.ok(lines[0][1].includes(word), word);
});
