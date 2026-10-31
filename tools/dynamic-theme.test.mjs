// The dynamic theme as the app has it (renderer/app.js, index.html, style.css, news.js): the sixth theme after whitescreen, that the theme
// list, what's saved, the help and Ctrl+K agree, that an older profile loads as it did, that the fixed themes still have the stylesheet's
// colours alone, where a cover comes from (the system's, the radio's, a file's own), and the one news line. The colours themselves are in
// cover-palette.test.mjs and the reader in embedded-cover.test.mjs; the real window is tools/dynamic-theme-check.mjs.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_VARS } from '../renderer/cover-palette.js';

// (read with LF line endings, as a Windows checkout's CRLF would otherwise hide the function ends body() looks for)
const read = (f) => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('app.js'), html = read('index.html'), css = read('style.css'), news = read('news.js'), card = read('card.js');
const THEMES = JSON.parse(app.match(/const THEMES = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);

test('the themes: the five it had, in their order, and dynamic after whitescreen', () => {
  assert.deepEqual(THEMES, ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen', 'dynamic']);
});

test('the help\'s T row lists the themes, all of them, in order; Ctrl+K has each as "theme: name"', () => {
  const row = html.match(/<tr data-act="theme"><td>T<\/td><td>([^<]*)<\/td><\/tr>/)[1];
  const named = row.replace(/^theme: /, '').replace(/\s*\(.*$/, '').split(', ');
  assert.deepEqual(named, THEMES);
  assert.match(row, /dynamic \(the colours of the song's cover/);
  // (every theme through the list, so a new one has its entry without anyone adding it)
  assert.match(app, /\.\.\.THEMES\.map\(\(name, i\) => \(\{\s*id: 'theme:' \+ name, name: 'theme: ' \+ name,\s*run: \(\) => \{ state\.theme = i; applyTheme\(\); saveSettings\(\); flashStatus\('theme: ' \+ name\); \},/);
  assert.match(app, /theme: \(name\) => \{ state\.theme = THEMES\.indexOf\(name\); applyTheme\(\); saveSettings\(\); \}/, 'and a preset can name it');
  // T goes round the whole list, and back to the first
  assert.match(body('nextTheme'), /state\.theme = \(state\.theme \+ 1\) % THEMES\.length;\s*applyTheme\(\);/);
});

test('it is saved with the others, by its place in the list; an older profile (0 to 4) loads as it did, and an unknown one as bluescreen', () => {
  const saved = app.match(/const SAVED = \[([^\]]*)\]/)[1].split(', ').map((s) => s.replace(/'/g, ''));
  assert.ok(saved.includes('theme'));
  assert.equal(saved.filter((k) => k === 'theme').length, 1);
  assert.match(app, /if \(!\(state\.theme in THEMES\)\) state\.theme = 0;/);
  for (let saved = 0; saved <= 4; saved++) assert.ok(saved in THEMES && THEMES[saved] === ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen'][saved], `profile with theme ${saved}`);
  assert.ok(5 in THEMES);
  for (const junk of [6, -1, 1.5, 'x', null, undefined]) assert.ok(!(junk in THEMES), `${junk} is no theme: bluescreen`);
  // nothing else about the dynamic theme is saved: its colours are the cover's, and the cover isn't kept
  assert.doesNotMatch(app.match(/const SAVED = \[[^\]]*\]/)[0], /dynamic|cover|palette/);
});

test('the fixed themes keep the stylesheet\'s colours alone: it names no dynamic theme, and each theme has the whole set', () => {
  assert.doesNotMatch(css, /data-theme="dynamic"/);
  const rules = { bluescreen: css.match(/:root \{([^}]*)\}/)[1] };
  for (const name of THEMES.slice(1, -1)) rules[name] = css.match(new RegExp(`:root\\[data-theme="${name}"\\] \\{([^}]*)\\}`))[1];
  for (const [name, text] of Object.entries(rules)) for (const v of THEME_VARS) assert.match(text, new RegExp(`${v}:`), `${name} sets ${v}`);
  // applyTheme: the page's own variables for the dynamic theme, cleared for every other, then the same read of them as before
  const apply = body('applyTheme');
  assert.match(apply, /if \(state\.theme === 0\) delete root\.dataset\.theme;\s*else root\.dataset\.theme = THEMES\[state\.theme\];/);
  assert.match(apply, /for \(const name of THEME_VARS\) \{ if \(vars\) root\.style\.setProperty\(name, vars\[name\]\); else root\.style\.removeProperty\(name\); \}/);
  assert.match(apply, /const vars = dynamic \? themeVars\(coverTheme\.palette\(now\)\) : null;/);
  assert.match(apply, /col = \{ bg: rgbOf\(get\('--bg'\)\), fg: rgbOf\(get\('--fg'\)\), ink: rgbOf\(get\('--ink'\)\) \};/);
  // Windows' title bar: every fixed theme and every resting colour, but while the ease runs at most every 0.15 s
  assert.match(apply, /if \(!onMac\(\) && \(!dynamic \|\| !coverTheme\.easing\(now\) \|\| now - titleBarAt >= 0\.15\)\) \{\s*titleBarAt = now;\s*window\.nc\?\.setTitleBar\(get\('--bg'\), get\('--fg'\)\);\s*\}/);
  // switched to, it takes the cover's colours at once (no ease from the last theme's), and a step of the ease is the same call again
  assert.match(apply, /if \(dynamic && !dynamicShown\) \{ const art = songArt\(\); coverTheme\.jump\(\(art && paletteOf\(art\)\) \|\| BLUESCREEN\); \}\s*dynamicShown = dynamic;/);
});

test('each frame: the ease steps while the theme is dynamic, applying its colours as they move, and the frame rate stays full while it eases', () => {
  assert.match(app, /showLayers\(\);\s*if \(THEMES\[state\.theme\] === 'dynamic'\) stepTheme\(t\);/);
  assert.match(body('stepTheme'), /const art = songArt\(\);\s*if \(coverTheme\.update\(art \? paletteOf\(art\) : null, t\)\) applyTheme\(t\);/);
  assert.match(body('frameGap'), /if \(rec\.mr \|\| cam\.on \|\| takeover\.active \|\| storm\.active \|\| coverTheme\.easing\(t\)\) return 1000 \/ 61;/);
  assert.match(app, /const coverTheme = createDynamicTheme\(\);/);
  assert.match(app, /import \{ BLUESCREEN, THEME_VARS, coverPalette, createDynamicTheme, heatStops, themeVars \} from '\.\/cover-palette\.js';/);
  // the palette is worked out once a cover, from 48 x 48 pixels
  assert.match(body('paletteOf'), /if \(!coverPalettes\.has\(im\)\)[\s\S]*swatch\.drawImage\(im, 0, 0, 48, 48\);[\s\S]*coverPalette\(swatch\.getImageData\(0, 0, 48, 48\)\.data\)[\s\S]*coverPalettes\.set\(im, palette\);/);
  assert.match(app, /const coverPalettes = new WeakMap\(\);/);
});

test('where the cover comes from: the system\'s, the radio\'s and a file\'s own, the last whatever the song is called; let go of with the source', () => {
  assert.match(body('songArt'), /if \(state\.source === 'file'\) return fileArt;\s*return state\.manual \? null : state\.source === 'system' \? artImg : state\.source === 'radio' \? radioArt : null;/);
  const use = body('useFile');
  assert.match(use, /const cover = fileCover\(file\)\.catch\(\(\) => null\);/);
  assert.match(use, /await playElement\('file', file\.name, \(el\) => \{ mine = el; el\.src = URL\.createObjectURL\(file\); el\.loop = true; \}\);/);
  assert.match(use, /if \(art && mine && state\.el === mine\) fileArt = art;/);
  assert.match(body('fileCover'), /const found = await embeddedCover\(file\);[\s\S]*await im\.decode\(\)/);
  assert.match(app, /import \{ embeddedCover \} from '\.\/embedded-cover\.js';/);
  assert.match(body('detach'), /state\.radioSong = radioArt = fileArt = null;/);
  // the system's reaches the page through a function the tests can call, as it did through the callback
  assert.match(app, /function nowPlaying\(info\) \{[\s\S]*\n\}\nwindow\.nc\?\.onNowPlaying\(nowPlaying\);/);
  // the ID card dithers the cover again whenever the theme's colours change (its key is the two colours), so each step of the ease does
  assert.match(card, /const key = `\$\{col\.fg\}\/\$\{col\.bg\}`;\s*if \(artFor !== im \|\| artKey !== key\) \{\s*fromArt\(im\);/);
});

test('the two new modules are plain functions: no page, no imports, so the web build copies them as they are', () => {
  for (const f of ['cover-palette.js', 'embedded-cover.js']) {
    const src = read(f).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\b(document|window|navigator|localStorage|import|require|fetch)\b/, f);
  }
  // and the spectrogram takes the dynamic theme's five colours, since no map names them
  assert.match(read('spectro.js'), /draw\(t, eng, \{ theme, themed = false, offset = 0, stops = null \} = \{\}\)/);
  assert.match(read('spectro.js'), /const map = \(stops \|\| MAPS\[theme\] \|\| MAPS\.bluescreen\)\.map\(hex\)/);
  assert.match(app, /spectro\.draw\(t, eng, \{ theme: THEMES\[state\.theme\], themed: state\.spectroTheme, offset: syncOffset\(\), stops: THEMES\[state\.theme\] === 'dynamic' \? heatStops\(col\.fg\) : null \}\);/);
});

test('the news: one line for 0.4.28, at the top, lowercase, under T', () => {
  const head = news.slice(news.indexOf('export const NEWS = ['), news.indexOf("version: '0.4.27'"));
  assert.match(head, /version: '0\.4\.28'/);
  const lines = [...head.matchAll(/\{ act: '(\w+)', text: "([^"]+)" \}/g)];
  assert.equal(lines.length, 1);
  assert.equal(lines[0][1], 'theme');
  assert.match(lines[0][2], /^[a-z]/);
  assert.match(lines[0][2], /dynamic/);
});
