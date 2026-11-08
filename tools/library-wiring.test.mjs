// The library as the page has it (renderer/app.js, library-panel.js, index.html, style.css, news.js, controls.js, palette.js): G, its place in
// the footer, the help, the touch panel and Ctrl+K; what is saved with the other settings and how an older profile loads; the queue's hooks
// in the player bar; a scene applied as a preset is; the page's security policy left as it was; the CSS using the theme's colours alone; the
// one news line. What the panel does on a real page is tools/library-check.mjs. Sources are read with LF line endings (a Windows
// checkout's CRLF would otherwise turn every \n these patterns look for into two characters).
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '../renderer/presets.js';
import { SETUP_KEYS, readScenes, readStations } from '../renderer/library.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), html = read('renderer/index.html'), css = read('renderer/style.css'), news = read('renderer/news.js');
const panel = read('renderer/library-panel.js'), controls = read('renderer/controls.js'), palette = read('renderer/palette.js'), player = read('renderer/player.js');
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);
const libraryCss = css.slice(css.indexOf('/* ---------- the library (G; library-panel.js)'));

test('G is the library\'s key: an action nothing else has the key of, in the footer after the source, and it is refused in the mini player and the handheld', () => {
  assert.match(app, /\{ id: 'library', key: 'g', run: \(\) => toggleLibrary\(\) \},/);
  const keys = [...app.slice(app.indexOf('const ACTIONS = ['), app.indexOf("// the footer's list of keys")).matchAll(/\{ id: '(\w+)', key: '([^']*)'/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(keys.filter(([, k]) => k === 'g'), [['library', 'g']], 'G is the library\'s alone');
  assert.equal(new Set(keys.map(([, k]) => k)).size, keys.length, 'no key twice');
  assert.match(app, /const FOOTER = \[\['source', 'source'\], \['library', 'library'\], \['visual', 'background'\],/);
  assert.match(body('toggleLibrary'), /if \(WIDGET \|\| \(state\.mini && !libraryPanel\.isOpen\)\) \{ flashStatus\(`the library needs the full window[^\n]*`\); return; \}\s*if \(!libraryPanel\.isOpen\) closeMenu\(\);[^\n]*\n\s*libraryPanel\.toggle\(\);/);
});

test('the help lists G among the setup keys, the touch panel has a button for it, and Ctrl+K calls it "library"', () => {
  const sections = [...html.matchAll(/<tr class="sec"><th colspan="2">([^<]+)<\/th><\/tr>|<tr data-act="([^"]+)"><td>([^<]*)<\/td><td>([^]*?)<\/td><\/tr>/g)];
  let section = '', row = null;
  for (const m of sections) { if (m[1]) section = m[1]; else if (m[2] === 'library') row = { section, key: m[3], text: m[4] }; }
  assert.ok(row, 'a row for the library');
  assert.equal(row.section, 'setup');
  assert.equal(row.key, 'G');
  for (const word of ['the library', 'your music', 'radio', 'scenes', 'Enter plays', 'fold and unfold', 'Tab', 'Esc closes']) assert.ok(row.text.includes(word), word);
  assert.match(controls, /\['library', 'setup', 'library', '[^']*'\],/);
  assert.match(palette, /ACTION_NAMES = \{[^}]*\blibrary: 'library'/);
  assert.match(app, /library: \(\) => onoff\(libraryPanel\.isOpen\),/);
});

test('Ctrl+K has "library: choose a folder", "library: scan again" and "scene: save this setup", and each scene you saved by name', () => {
  for (const [id, name] of [['library:choose', 'library: choose a folder'], ['library:scan', 'library: scan again'], ['scene:save', 'scene: save this setup']]) assert.ok(app.includes(`{ id: '${id}', name: '${name}',`), name);
  assert.match(app, /\.\.\.state\.userScenes\.map\(\(s\) => \(\{ id: 'user-scene:' \+ s\.id, name: 'scene: ' \+ s\.name\.toLowerCase\(\), aliases: \['setup'\], run: \(\) => runPreset\(s, 'scene'\) \}\)\),/);
  assert.match(app, /run: \(\) => \{ libraryPanel\.open\('music'\); return libraryPanel\.choose\(\); \}/);
  assert.match(app, /run: \(\) => scanLibraryAgain\(\)/, 'scan again runs in the background');
});

test('the folder is main\'s, the scenes and the stations are saved with the other settings; an older profile has none, and the last station it played', () => {
  const saved = app.match(/const SAVED = \[([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.ok(saved.includes('userScenes') && saved.includes('radioStations'));
  assert.ok(!saved.some((k) => /library|folder/i.test(k)), 'the folder is not a page setting: the page could name any, and main\'s is the one it reads');
  assert.match(app, /^  radioStations: \[\],/m);
  assert.match(app, /^  userScenes: \[\],/m);
  assert.match(app, /state\.userScenes = readScenes\(state\.userScenes, sceneDomains\(\)\);/);
  assert.match(app, /state\.radioStations = readStations\(state\.radioStations, state\.radio\);/);
  // and the queue's two modes, read back as they were or as the album in order (an older profile has neither)
  assert.ok(saved.includes('queueRepeat') && saved.includes('queueShuffle'));
  assert.match(app, /state\.queueRepeat = readRepeat\(state\.queueRepeat\);/);
  assert.match(app, /state\.queueShuffle = state\.queueShuffle === true;/);
  // where the queue was, for G after a restart: kept every few seconds while it plays and when the window goes; Enter carries on from it
  assert.ok(saved.includes('queueResume'));
  assert.match(app, /state\.queueResume = readResume\(state\.queueResume\);/);
  assert.match(app, /addEventListener\('pagehide', \(\) => noteResume\(0, true\)\);/);
  assert.match(app, /if \(at > 0 && at < \(el\.duration \|\| Infinity\) - 1\) \{ el\.currentTime = at; freshStart\(false\); \}/);
  assert.match(app, /resume: \(\) => state\.queueResume,/);
  // the albums played lately, for the shelf: an album goes first when its queue starts
  assert.ok(saved.includes('recentAlbums'));
  assert.match(app, /state\.recentAlbums = readRecent\(state\.recentAlbums\);/);
  assert.match(app, /if \(state\.recentAlbums\[0\] !== q\.id\) \{ state\.recentAlbums = noteRecent\(state\.recentAlbums, q\.id\); saveSettings\(\); \}/);
  // a station played is noted, the latest first, before it is saved
  assert.match(body('useRadio'), /state\.radio = url\.href;[^\n]*\n\s*state\.radioStations = noteStation\(state\.radioStations, url\.href\);[^\n]*\n\s*saveSettings\(\);/);
  // an older profile: none of either
  const load = (profile) => { const state = { userScenes: [], radioStations: [], radio: '' }; for (const k of saved) if (k in profile) state[k] = profile[k]; return [readScenes(state.userScenes, {}), readStations(state.radioStations, state.radio)]; };
  assert.deepEqual(load({ theme: 2, mirror: false }), [[], []]);
  assert.deepEqual(load({ radio: 'https://stream.example/aac' }), [[], [{ url: 'https://stream.example/aac', at: 0 }]]);
  assert.deepEqual(load({ userScenes: 'junk', radioStations: { a: 1 } }), [[], []]);
});

test('a scene is applied as a preset is, through the same setters, and also holds the shared cover look', () => {
  assert.match(app, /function choosePreset\(id\) \{\s*const preset = PRESETS\.find\(\(p\) => p\.id === id\);\s*if \(!preset\) return Promise\.reject\(new Error\('Unknown preset'\)\);\s*return runPreset\(preset, 'preset'\);\s*\}/);
  assert.match(body('runPreset'), /await applyPreset\(load, current, presetSetters\)/);
  assert.match(body('runPreset'), /sceneForLoad\(preset, sceneDomains\(\)/);
  assert.match(app, /applyScene: \(scene\) => runPreset\(scene, 'scene'\)\.catch\(showError\),/);
  // the setters for each setting a preset has, and the code's one takes "just the beat hidden" as well as a yes or no
  const setters = app.slice(app.indexOf('const presetSetters = {'), app.indexOf('};', app.indexOf('const presetSetters = {')));
  for (const key of SETUP_KEYS) assert.ok(new RegExp(`\\n  ${key}:`).test(setters), `a setter for ${key}`);
  assert.match(setters, /libCover: setLibCover,/);
  assert.match(setters, /codeHidden: \(v\) => \(v === 'beat' \? setCodeHidden\(false, true\) : setCodeHidden\(v\)\),/);
  assert.deepEqual([...SETUP_KEYS].sort(), [...new Set([...PRESETS.flatMap((p) => Object.keys(p.settings)), 'libCover', 'look', 'drop', 'camFx', 'earthClip', 'earthTour', 'glass'])].sort());
  // the setup it saves is the one choosePreset compares with (the beat as 'beat')
  assert.match(app, /const currentSetup = \(\) => setupOf\(\{ \.\.\.state, drop: DROPS\[state\.drop\], camFx: CAM_FX\[state\.camFx\], visual: VISUALS\[state\.visual\], theme: THEMES\[state\.theme\], codeHidden: state\.beatHidden \? 'beat' : state\.codeHidden \}\);/);
});

test('the queue: the track\'s attach takes it, so the buttons and the names hold across each change; the bar\'s next and previous exist only while it does', () => {
  assert.match(app, /const liveQueue = \(\) => \(queue && state\.source === 'file' && state\.el && state\.el === queue\.el \? queue : null\);/);
  const play = body('playQueue');
  assert.ok(play.indexOf('const mine = pendingQueue = { name: file.name, q }') > 0 && play.indexOf('pendingQueue = {') < play.indexOf('await useFile(file)'), 'set before the file starts');
  assert.match(play, /try \{ el = await useFile\(file\); \} finally \{ if \(pendingQueue === mine\) pendingQueue = null; \}[^\n]*\n\s*\} catch \(err\) \{\s*if \(ticket === queuing\) skipTrack\(q, err, failed \+ 1\);[^\n]*\n\s*return;\s*\}\s*if \(ticket !== queuing \|\| !el \|\| state\.el !== el\) return;\s*if \(liveQueue\(\)\?\.el !== el\) \{ queue = \{ \.\.\.q, el \}; el\.loop = false; \}/);
  // a track that can't be read or played is skipped (tools/queue-skip.test.mjs runs it), also one that breaks part-way through
  assert.match(play, /el\.onerror = \(\) => \{ if \(liveQueue\(\)\?\.el === el\) skipTrack\(queue, el\.error, 1\); \};/);
  // a track that ends goes on as repeat says (one: that track again); next, pressed, goes on whatever repeat says; all needs the library's albums
  assert.match(play, /el\.onended = \(\) => \{ if \(liveQueue\(\)\?\.el === el\) playQueue\(queueNext\(queue, queueSteps\(true\)\)\)\.catch\(showError\); \};/);
  assert.match(app, /const queueSteps = \(ended\) => \(\{ repeat: state\.queueRepeat, ended, nextAlbum: albumAfter \}\);/);
  assert.match(app, /const nextTrack = \(\) => \{ const q = liveQueue\(\); if \(q\) playQueue\(queueNext\(q, queueSteps\(false\)\)\)\.catch\(showError\); \};/);
  assert.match(app, /const albumAfter = \(id\) => \{ const albums = libraryPanel\.state\?\.albums \|\| \[\]/);
  assert.match(body('attach'), /if \(source === 'file' && pendingQueue\?\.name === label\) \{ queue = \{ \.\.\.pendingQueue\.q, el: state\.el \}; state\.el\.loop = false; pendingQueue = null; \}/);
  const block = app.slice(app.indexOf('const playerBar = createPlayerBar({'), app.indexOf('// on screen just now'));
  assert.match(block, /get next\(\) \{ return liveQueue\(\) \? nextTrack : undefined; \},\s*get previous\(\) \{ return liveQueue\(\) \? previousTrack : undefined; \},/);
  assert.match(body('updatePlayer'), /near: liveQueue\(\) \? queueLine\(liveQueue\(\)\) : null,/);
  // a track is named by the library's names while it is in the queue, else by its own tags
  assert.match(body('currentSong'), /const q = liveQueue\(\);\s*if \(q\) \{ const t = q\.tracks\[q\.index\]; return \{ title: t\.title, artist: t\.artist \|\| 'File' \}; \}[^\n]*\n\s*if \(state\.source === 'file'\) return songOfFile\(fileTags, state\.label\);/);
  // previous: this track again past its first seconds, else the one before
  assert.match(body('previousTrack'), /const step = queuePrevious\(q, state\.el\.currentTime\);\s*if \(step\.restart\) \{ state\.el\.currentTime = 0; freshStart\(true\); \} else playQueue\(step\.queue\)\.catch\(showError\);/);
  assert.match(player, /else if \(kind === 'prev'\) \(act\.previous \|\| act\.restart\)\?\.\(\);/);
  // the stop square lets a file go as the bar's stop lets the radio go
  assert.match(body('stopPlayback'), /if \(state\.source === 'radio' \|\| state\.source === 'demo'\) \{ stopSource\(\); return; \}\s*if \(state\.source !== 'file'\) return;\s*picking\+\+;[^\n]*\n\s*queue = null;\s*queuing\+\+;\s*detach\(\);/);
});

test('the page keeps its security policy, and the library has its place in it: over the alerts, under the notices, a click in it is not a click on the koi\'s water', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; frame-src https://open.spotify.com/embed/track/; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream: http: https:", 'only Spotify track embeds are added; image and script origins stay local');
  assert.ok(html.indexOf('<div id="library" hidden></div>') > html.indexOf('<canvas id="storm"') && html.indexOf('<div id="library" hidden></div>') < html.indexOf('<div id="alerts"></div>'));
  assert.match(app, /#player, #alerts, #notice, #err, #card, #library'\)/);
  assert.match(libraryCss, /#library \{\s*position: fixed; inset: 0; z-index: 4;/);
  assert.match(app, /\|\| !\$\('notice'\)\.hidden \|\| libraryPanel\.isOpen;/, 'the first visit\'s hints keep away while it is up');
});

test('the CSS uses the theme\'s colours and no others, and its wide window is the panel\'s', () => {
  assert.ok(libraryCss.length > 5000, 'its own block');
  const rules = libraryCss.replace(/\/\*[\s\S]*?\*\//g, '');
  // (one exception, and it is Spotify's: its guidelines have its logo white or black, never the theme's colour, so two rules say which, by the
  // background, and nothing else in the block has a colour that isn't the theme's)
  const logoRule = /#library(?:\[data-tone="light"\])? \.lib-logo \{[^}]*\}/g;
  assert.deepEqual(rules.match(logoRule), ['#library .lib-logo { display: block; width: 100%; height: 100%; fill: #fff; }', '#library[data-tone="light"] .lib-logo { fill: #000; }'], 'Spotify\'s logo: white, and black on a light background');
  const themed = rules.replace(logoRule, '');
  assert.doesNotMatch(themed, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'no colour of its own');
  assert.doesNotMatch(themed, /\brgba?\(|\bhsla?\(|(?<![-\w])(white|black|red|green|blue|gray|grey)(?![-\w])/);
  for (const color of themed.match(/color-mix\([^)]*\)/g) || []) assert.match(color, /var\(--(bg|fg)\)/, color);
  assert.match(rules, /--lib-line: color-mix\(in srgb, var\(--bg\) 62%, transparent\);/, 'the theme\'s line background');
  assert.match(rules, /#library \.lib-glyphs \{[^}]*background: var\(--fg\);/);
  assert.match(rules, /#library \.lib-cover b \{[^}]*background: var\(--fg\);/);
  assert.match(rules, /#library \.lib-row\.on \{ background: var\(--accent-text\); color: var\(--bg\);/, 'the playing row inverted, in the accent (7:1: words sit on it)');
  // the wide window of the panel's own code (its covers' size) and of the CSS (where it puts the cover) are the same
  const wide = panel.match(/const WIDE = '([^']*)'/)[1];
  assert.equal(wide, '(min-width: 900px) and (min-aspect-ratio: 5/4)');
  assert.ok(rules.includes(`@media ${wide} {`));
  // the header goes while it is up, but not in the mini player, which has nothing else to drag it by
  assert.match(rules, /body\.library-open:not\(\.mini\) header, body\.library-open:not\(\.mini\) #first-run-hint \{ visibility: hidden; \}/);
  // masks are drawn from the script, with nothing in the stylesheet that would show a solid block before they arrive
  assert.match(rules, /#library \.lib-glyphs \{[^}]*opacity: 0;/);
  assert.match(rules, /#library \.lib-cover b \{[^}]*opacity: 0;/);
  assert.match(rules, /#library \.lib-cover b\[style\*="--mask"\] \{ opacity: 1; \}/);
});

test('the panel takes the keys it lists and leaves the rest to the page; typing in its fields is not the page\'s keys', () => {
  const onKey = panel.slice(panel.indexOf('function onKey(e) {'), panel.indexOf("win.addEventListener('keydown', onKey, true);"));
  // the one key with a modifier it takes is Ctrl+F or ⌘F, find; any other is the page's (Ctrl+K and the rest)
  assert.match(onKey, /if \(!S\.open \|\| host\.blocked\(\)\) return;\s*if \(video\.isOpen\) \{ video\.key\(e\); e\.stopImmediatePropagation\(\); return; \}\s*if \(e\.target\?\.closest\?\.\('\.lib-sp-search'\)\) return;\s*\/\/[^\n]*\n\s*if \(\(e\.ctrlKey \|\| e\.metaKey\) && !e\.altKey && !e\.shiftKey && e\.key\.toLowerCase\(\) === 'f'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); openFind\(\); return; \}\s*if \(e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey\) return;/);
  // find's line: its own keys first, and what is typed in it is not the page's keys
  assert.match(onKey, /if \(e\.target\?\.closest\?\.\('\.lib-find'\)\) \{ findKey\(e\); return; \}/);
  const findKey = panel.slice(panel.indexOf('function findKey(e) {'), panel.indexOf('// an input in the list'));
  for (const k of ["'Escape'", "'ArrowDown'", "'ArrowUp'", "'PageDown'", "'PageUp'", "'Enter'", "'Tab'"]) assert.ok(findKey.includes(k), `find's ${k}`);
  assert.match(findKey, /else e\.stopPropagation\(\);\s*\}/);
  assert.match(onKey, /if \(k === 'Escape'\) take\(S\.section === 'spotify' && X\.artist \? artistBack : S\.find \? \(\) => closeFind\(\) : close\);/, 'with find open, Esc ends find before it closes the library');
  for (const k of ["'Escape'", "'ArrowDown'", "'ArrowUp'", "'ArrowRight'", "'ArrowLeft'", "'Home'", "'End'", "'PageDown'", "'PageUp'", "'Enter'", "'Tab'", "'Delete'", "'Backspace'", "'F2'"]) assert.ok(onKey.includes(k), k);
  assert.match(onKey, /else e\.stopPropagation\(\); \/\/ \(typed into the field: not the page's keys\)/);
  assert.match(onKey, /anything else is the page's own/);
  assert.ok(panel.includes("win.addEventListener('keydown', onKey, true);"), 'ahead of the page\'s own keys');
  // delete asks twice, and rename and the save card put the cursor in the name
  assert.match(panel, /if \(S\.armed !== id\) \{ S\.armed = id;/);
  assert.match(panel, /else if \(row\.kind === 'save'\) \{\s*const scene = host\.saveScene\(\);\s*S\.renaming = scene\.id;/);
});

test('the news: one line for the library in the 0.4.29 block, lowercase, with its key; 0.4.28 shipped without it', () => {
  const head = news.slice(news.indexOf("version: '0.4.29'"), news.indexOf("version: '0.4.28'")); // (its own block: newer versions come above it)
  assert.match(head, /version: '0\.4\.29'/);
  const lines = [...head.matchAll(/\{ key: 'G', text: "([^"]+)" \}/g)];
  assert.equal(lines.length, 1);
  assert.match(lines[0][1], /^[a-z]/);
  for (const word of ['library', 'folder', 'radio', 'scenes']) assert.ok(lines[0][1].includes(word), word);
  assert.ok(!/golden|itsgolden|jon soini/i.test(lines[0][1]), 'the credit goes in the release notes and the README, at release');
  const shipped = news.slice(news.indexOf("version: '0.4.28'"), news.indexOf("version: '0.4.27'"));
  assert.equal([...shipped.matchAll(/\{ act: '(\w+)', text: "([^"]+)" \}/g)].length, 1, 'the dynamic theme\'s line is still the one act: line');
  assert.match(shipped, /key: 'player bar'/);
  assert.match(shipped, /key: 'files'/);
  assert.ok(!shipped.includes("key: 'G'"), 'the library is not in what 0.4.28 shipped');
});

test("the panel's empty row escapes main's error message, which can carry a folder's path (and a folder's name can hold < and >)", () => {
  const empty = panel.slice(panel.indexOf('function emptyRow('), panel.indexOf('\n  }\n', panel.indexOf('function emptyRow(')));
  assert.match(empty, /S\.error \? esc\(S\.error\)/);
  assert.ok(!/S\.error \? S\.error/.test(panel));
});

test('the radio\'s covers: each song\'s is put last in line as its title comes, so the cache holds the last fifty songs\' and not the session\'s', () => {
  assert.match(app, /import \{[^}]*\bnoteRadioCover\b[^}]*\} from '\.\/library-core\.js';/);
  assert.match(body('radioTitle'), /noteRadioCover\(radioCovers, key, radioCovers\.get\(key\)\);\s*\/\/[^\n]*\n\s*radioCovers\.get\(key\)\.then\(/, 'noted before it is read, for a song asked for now and for one heard before');
});
