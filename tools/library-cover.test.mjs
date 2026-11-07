// The library's two cover looks (Colin, Nov 2: "a toggle either full ascii or half ascii like that", after golden's screens): full, the
// cover all in characters (the kept look, the default), and half, the cover itself in a thin frame with the characters faint around it and
// the album and its tracks written as code. Shift+C in your music or Spotify, the button beside find, and Ctrl+K's "library: cover" switch them; the
// choice is kept with the other settings. The page itself, on a real copy of the app, is tools/library-check.mjs's.
// Sources are read with LF line endings (a Windows checkout's CRLF would otherwise turn every \n these patterns look for into two characters).
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, ident } from '../renderer/codegen.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), panel = read('renderer/library-panel.js'), css = read('renderer/style.css');

test('the look is a setting: full (characters) by default, half only when chosen, kept with the others', () => {
  assert.match(app, /libCover: 'chars', \/\/ the library's cover/);
  assert.match(app, /const SAVED = \[[^\]]*'libCover'/);
  assert.match(app, /if \(state\.libCover !== 'photo'\) state\.libCover = 'chars';/, 'anything else read back is the full look');
  assert.match(app, /coverLook: \(\) => state\.libCover, setCoverLook: setLibCover, fullCover: albumCover,/);
  assert.match(app, /id: 'library:cover', name: 'library: cover, full or half ascii'/);
});

test('Shift+C, in your music and Spotify, and the button beside find switch it; the keys line says so', () => {
  assert.match(panel, /else if \(e\.shiftKey && k\.toLowerCase\(\) === 'c' && coverSection\(\) && !\(S\.section === 'spotify' && X\.artist\)\) take\(toggleCover\);/);
  assert.match(panel, /<button type="button" class="lib-coverbtn"/);
  assert.match(panel, /else if \(b\.classList\.contains\('lib-coverbtn'\)\) \{ toggleCover\(\); b\.blur\(\); \}/);
  assert.match(panel, /b\.hidden = !coverSection\(\) \|\| \(S\.section === 'spotify' && !!S\.sp\.artist\);/);
  assert.match(panel, /\['shift\+C cover'\]/);
  assert.match(panel, /const coverSection = \(\) => S\.section === 'music' \|\| S\.section === 'spotify';/);
  assert.match(panel, /const half = \(\) => !\(S\.section === 'spotify' && S\.sp\.artist\) && coverSection\(\) && host\.coverLook\?\.\(\) === 'photo';/);
});

test('the half look writes the album and its tracks as code: x = x.Artist("Album"), "01 Title", // m:ss', () => {
  assert.equal(`x = x.${ident('Crystal Castles')}("${cleanTitle('(III)')}")`, 'x = x.CrystalCastles("(III)")');
  assert.match(panel, /x = x\.\$\{esc\(ident\(a\.artist\)\)\}\(<s>"<\/s>\$\{esc\(cleanTitle\(a\.album\)\)\}<s>"<\/s>\)/);
  assert.match(panel, /<div class="lib-sub lib-line">\/\/ \$\{esc\(albumLine\(a\)\)\}<\/div>/);
  assert.match(panel, /`<u>"\$\{two\(row\.index \+ 1\)\} \$\{esc\(t\.title\)\}",<\/u>`/, 'the playing track underlined');
  assert.match(css, /#library\.lib-half \.lib-row\.track \.d::before \{ content: "\/\/ "; \}/);
});

test('the half look\'s cover is the album\'s own at full size (the scan keeps 160 px ones), the small one till it comes', () => {
  assert.match(app, /async function albumCover\(album\) \{\n  for \(const t of album\?\.tracks\?\.slice\(0, 3\) \|\| \[\]\) \{/);
  assert.match(app, /const found = await embeddedCover\(await librarySrc\.file\(t\)\);/);
  assert.match(panel, /return typeof full === 'string' \? full : S\.covers\[id\] \? `data:image\/jpeg;base64,\$\{S\.covers\[id\]\}` : '';/);
  assert.match(panel, /while \(fullCovers\.size > 12\)/, 'a dozen kept at a time, the rest let go');
  assert.match(panel, /if \(S\.section === 'music' && half\(\)\) \{ paintBigMusic\(\); return; \}/);
});

test('its colours are the theme\'s: the frame, the gap and the faint ring are tokens, the characters around only fainter', () => {
  const rules = [...css.matchAll(/#library\.lib-half[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join(' ');
  assert.ok(rules.length > 300, 'found the rules');
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no colour of its own');
  assert.match(rules, /outline: 1px solid var\(--fg\)/);
  assert.match(css, /#library\.lib-half \.lib-glyphs\.in \{ opacity: \.2; \}/);
});
