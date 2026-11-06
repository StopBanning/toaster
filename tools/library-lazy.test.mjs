// The library is fetched when it is first opened, not with the page (renderer/app.js, renderer/library-core.js): app.js and everything it
// imports from the start never reach the panel's three modules (library.js, library-panel.js, library-source.js), which it asks for with
// import() the first time anything wants them (G, its place in the footer, the help, Ctrl+K and the touch panel all come to the same two
// functions); library-core.js's handle holds what is asked while they come and says so if they can't. What the panel does once it is
// there is tools/library-check.mjs's, on a real page, which also checks that a page that hasn't opened it has fetched none of them.
// Sources are read with LF line endings (a Windows checkout's CRLF would otherwise turn every \n these patterns look for into two characters).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lazyLibrary } from '../renderer/library-core.js';

const renderer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer');
const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8').replace(/\r\n/g, '\n');
const LAZY = ['library.js', 'library-panel.js', 'library-source.js'];
const app = read('app.js');

// Every module a file brings in from the start, all the way down: its imports and re-exports, found the way tools/web.mjs finds them for its
// preload hints (a line that starts with import or export, which an import() in the middle of a line is not)
function fromTheStart(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const m of read(file).matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]\.\/([^'"]+)['"]|^\s*import\s*['"]\.\/([^'"]+)['"]/gm)) fromTheStart(m[1] || m[2], seen);
  return seen;
}

test('the page starts without the library: nothing app.js imports from the start, all the way down, is one of the panel\'s three modules', () => {
  const start = fromTheStart('app.js');
  for (const file of LAZY) {
    assert.ok(fs.existsSync(path.join(renderer, file)), `${file} is there`);
    assert.ok(!start.has(file), `${file} is not imported from the start`);
  }
  assert.ok(!/^\s*import\s[^\n]*\bfrom\s*['"]\.\/library(-panel|-source)?\.js['"]/m.test(app), 'app.js has no static import of them');
  assert.ok(start.has('library-core.js'), 'what the page needs of the library from its start is library-core.js');
  // (and library-core.js, which is not fetched with the panel, takes nothing from the three)
  assert.ok(!/library(-panel|-source)?\.js/.test(read('library-core.js').replace(/\/\/[^\n]*/g, '')), 'library-core.js imports none of them');
});

test('app.js asks for the three modules with import(), together, in the one function that makes the panel', () => {
  for (const file of LAZY) assert.equal(app.split(`import('./${file}')`).length - 1, 1, `${file} is import()ed once`);
  const make = app.slice(app.indexOf('async function makeLibrary() {'), app.indexOf('\n}\n', app.indexOf('async function makeLibrary() {')) + 3);
  assert.ok(make.length > 200, 'found it');
  assert.match(make, /await Promise\.all\(\[import\('\.\/library-panel\.js'\), import\('\.\/library-source\.js'\), import\('\.\/library\.js'\)\]\)/, 'all three asked for at once (the panel would find library.js only when it had arrived)');
  assert.match(make, /return createLibraryPanel\(\{/);
  assert.match(app, /const libraryPanel = lazyLibrary\(\{\s*load: makeLibrary,/);
  // the handle is what the rest of the page asks: G (toggleLibrary), Ctrl+K, the touch panel's row and the frame loop never reach for the panel itself
  assert.ok(!/createLibraryPanel\(/.test(app.replace(make, '')), 'the panel is made nowhere else');
  assert.match(app, /get library\(\) \{ return libraryPanel\.panel; \}, get librarySrc\(\) \{ return librarySrc; \}, loadLibrary: \(\) => libraryPanel\.ready\(\)/, 'the test hook is null till it is made, and loadLibrary makes it');
  // a page that can't fetch them says so at each ask, and says what to do (a failed import() is kept by the page: it takes a new page)
  assert.match(app, /fail: \(err\) => showError\(new Error\(`The library could not be loaded \(\$\{err\?\.message \|\| err\}\)\. \$\{desktopApp\(\) \? 'Restart Toaster' : 'Reload the page'\} and press \$\{K\('library'\)\} again\.`\)\),/);
  // a scan again from Ctrl+K reads nothing of a panel that did not come
  assert.match(app, /await libraryPanel\.scan\(\);\s*const l = libraryPanel\.state;\s*if \(!l\) return;/);
});

test('what the page needs before the panel exists is in library-core.js: the profile\'s scenes and stations, the radio\'s note, the queue the bar goes by', () => {
  const core = read('library-core.js');
  for (const name of ['readScenes', 'readStations', 'noteStation', 'setupOf', 'saveScene', 'renameScene', 'deleteScene', 'sceneIsOn', 'queueOf', 'queueNext', 'queuePrevious', 'queueLine', 'lazyLibrary']) {
    assert.match(core, new RegExp(`export (const|function) ${name}\\b`), name);
  }
  assert.match(app, /import \{ lazyLibrary, queueLine, queueNext, queueOf, queuePrevious, readScenes, sceneForLoad, readStations, noteStation, sceneIsOn, setupOf, [^}]*\} from '\.\/library-core\.js';/);
});

test('library.js still has every name it had (it re-exports the core), so what reads them there keeps working', async () => {
  const L = await import('../renderer/library.js'), C = await import('../renderer/library-core.js');
  for (const name of Object.keys(C).filter((k) => k !== 'lazyLibrary')) assert.equal(L[name], C[name], name);
});

// ---------------------------------------------------------------- the handle

// a stand-in panel that records what is asked of it, and a load whose arrival (or refusal) the test decides
function fixture() {
  const calls = [];
  let open = false, loads = 0, arrive, refuse;
  const real = {
    state: { albums: [] },
    get isOpen() { return open; },
    open(section) { open = true; calls.push(['open', section]); },
    toggle(section) { open = !open; calls.push(['toggle', section]); },
    update() { calls.push(['update']); },
    async scan() { calls.push(['scan']); return 'scanned'; },
    async choose() { calls.push(['choose']); return 'chose'; },
    find() { open = true; calls.push(['find']); },
  };
  const load = () => { loads++; return new Promise((resolve, reject) => { arrive = () => resolve(real); refuse = reject; }); };
  return { calls, load, real, get loads() { return loads; }, arrive: () => arrive(), refuse: (err) => refuse(err) };
}

test('before the panel is fetched it is not open, has no state and nothing to update; nothing is fetched until something asks', () => {
  const f = fixture();
  const lib = lazyLibrary({ load: f.load });
  assert.equal(lib.isOpen, false);
  assert.equal(lib.state, null);
  assert.equal(lib.panel, null);
  assert.equal(lib.update(), undefined);
  assert.equal(f.loads, 0, 'asking if it is open or to update it does not fetch it');
  assert.deepEqual(f.calls, []);
});

test('asks made while the panel comes wait for it, are carried out in the order they were made, and fetch it once', async () => {
  const f = fixture();
  const lib = lazyLibrary({ load: f.load });
  const done = [lib.open('music'), lib.choose(), lib.toggle(), lib.toggle(), lib.scan(), lib.find()];
  assert.equal(f.loads, 1, 'one fetch for all six');
  assert.equal(lib.isOpen, false, 'not there yet');
  assert.deepEqual(f.calls, []);
  f.arrive();
  await Promise.all(done);
  assert.deepEqual(f.calls, [['open', 'music'], ['choose'], ['toggle', undefined], ['toggle', undefined], ['scan'], ['find']]);
  assert.equal(lib.panel, f.real);
  assert.equal(lib.state, f.real.state);
  assert.equal(f.loads, 1);
});

test('once it is there an ask is carried out at once, in the turn it was made in, as it was when the panel was made with the page', async () => {
  const f = fixture();
  const lib = lazyLibrary({ load: f.load });
  const first = lib.toggle();
  f.arrive();
  await first;
  assert.equal(lib.isOpen, true);
  lib.toggle();
  assert.equal(lib.isOpen, false, 'closed by the time toggle() returned');
  lib.open('radio');
  assert.deepEqual(f.calls.slice(-1), [['open', 'radio']], 'opened before any await');
  assert.equal(lib.isOpen, true);
  lib.update();
  assert.deepEqual(f.calls.slice(-1), [['update']]);
  assert.equal(await lib.scan(), 'scanned');
  assert.equal(await lib.choose(), 'chose');
  assert.equal(f.loads, 1, 'never fetched again');
});

test('G twice before the panel has come is open and closed again, as it is with the panel there already', async () => {
  const f = fixture();
  const lib = lazyLibrary({ load: f.load });
  const both = [lib.toggle(), lib.toggle()];
  f.arrive();
  await Promise.all(both);
  assert.equal(lib.isOpen, false);
  assert.deepEqual(f.calls, [['toggle', undefined], ['toggle', undefined]]);
});

test('a panel that can not be fetched is said so once for each try, however many asked; nothing else happens; and the next ask tries again', async () => {
  const f = fixture(), told = [];
  const lib = lazyLibrary({ load: f.load, fail: (err) => told.push(err.message) });
  const failed = [lib.toggle(), lib.scan(), lib.choose()];
  f.refuse(new Error('Failed to fetch dynamically imported module'));
  await Promise.all(failed);
  assert.deepEqual(told, ['Failed to fetch dynamically imported module'], 'told once');
  assert.deepEqual(f.calls, [], 'none of the three was carried out');
  assert.equal(lib.isOpen, false);
  assert.equal(lib.panel, null);
  // back online: the next press fetches it again, and it opens
  const again = lib.toggle();
  assert.equal(f.loads, 2);
  f.arrive();
  await again;
  assert.equal(lib.isOpen, true);
  assert.deepEqual(told.length, 1);
  // another try that fails is told again, even with the very error the first gave: a page keeps a module that failed to load, so every try
  // after an import() failed fails with that same error, and none of them may pass in silence
  const g = fixture(), more = [], kept = new Error('Failed to fetch dynamically imported module');
  const lib2 = lazyLibrary({ load: g.load, fail: (err) => more.push(err.message) });
  const one = [lib2.open(), lib2.toggle()];
  g.refuse(kept);
  await Promise.all(one);
  const two = [lib2.open(), lib2.choose()];
  g.refuse(kept);
  await Promise.all(two);
  assert.deepEqual(more, [kept.message, kept.message], 'once for each try');
  assert.equal(g.loads, 2);
});

test('ready() is the panel (fetched if it has to be, once) for what waits on it, and it is refused, not hushed, when the panel can not come', async () => {
  const f = fixture();
  const lib = lazyLibrary({ load: f.load, fail: () => assert.fail('ready() is the caller\'s to handle') });
  const a = lib.ready(), b = lib.ready();
  assert.equal(f.loads, 1);
  f.arrive();
  assert.equal(await a, f.real);
  assert.equal(await b, f.real);
  assert.equal(await lib.ready(), f.real);
  const g = fixture();
  const lib2 = lazyLibrary({ load: g.load });
  const asked = lib2.ready();
  g.refuse(new Error('offline'));
  await assert.rejects(asked, /offline/);
  const retry = lib2.ready();
  assert.equal(g.loads, 2, 'a refused fetch is not kept');
  g.arrive();
  assert.equal(await retry, g.real);
});
