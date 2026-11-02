// The library panel's choice of a folder (renderer/library-panel.js): a folder chosen while a scan runs stops that scan, waits for it
// to end, and scans the new one; and the ways in that ask for a folder (the folder button, the "looking for music…" row, Ctrl+K's
// "library: choose a folder") are shut while a scan runs. And its fields: the radio's address and a scene's name take the keys while
// you type in them, and stop taking them when you leave them, by Tab as by a click (the review of Nov 1, C9). The panel runs here on
// a stand-in for the page, with the app's own source (library-source.js) over a bridge to main: a fake one, which works as
// helpers/library.cjs does (choosing a folder stops the scan that is running), and main's own library on folders built here under
// scratch. Nothing here reaches a real window, a key, or a folder of anyone's. (What the panel does on a real page is
// tools/library-check.mjs.)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { lazyLibrary } from '../renderer/library-core.js';
import { createLibraryPanel } from '../renderer/library-panel.js';
import { desktopSource } from '../renderer/library-source.js';
import { id3Tag } from './cover-fixtures.mjs';
import { scratch } from './paths.mjs';
import { mp3, textFrame } from './tag-fixtures.mjs';

const lib = createRequire(import.meta.url)('../helpers/library.cjs');
const rendererDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer');

// ---- a page, just enough of one
class El {
  constructor() { this.innerHTML = ''; this.textContent = ''; this.hidden = false; this.scrollTop = 0; this.children = []; this.dataset = {}; this.handlers = {}; this.classes = new Set(); }
  get classList() { return { toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c)), add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c) }; }
  setAttribute() {}
  replaceChildren(...nodes) { this.children = nodes; }
  get firstElementChild() { return this.children[0] || null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  fire(type, event) { for (const fn of this.handlers[type] || []) fn(event); }
  focus() {}
  blur() {}
  select() {}
}
function page(source, hostOver = {}) {
  const parts = {}, said = [], failed = [], onWindow = {};
  const root = Object.assign(new El(), { querySelector: (sel) => (parts[sel] ||= new El()) });
  const host = {
    key: () => 'G', live: () => false, blocked: () => false, titleBar: () => false, recent: () => [], resume: () => null,
    playing: () => ({ id: '', track: null, radio: '', title: '', artist: '', ms: 0, stoppable: false }), play() {}, stop() {},
    repeat: () => 'album', setRepeat: () => '', shuffle: () => false, setShuffle: () => '',
    stations: () => [], playStation() {}, addStation() {}, scenes: () => ({ presets: [], user: [] }), sceneOn: () => false, applyScene() {}, saveScene() {}, renameScene() {}, deleteScene() {},
    say: (text) => said.push(text), fail: (err) => failed.push(err),
    ...hostOver,
  };
  const win = { navigator: { platform: 'MacIntel' }, addEventListener: (type, fn) => (onWindow[type] ||= []).push(fn), getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  const panel = createLibraryPanel({ document: { body: new El(), createElement: () => new El() }, window: win, root, source, host });
  const click = (el, closest) => el.fire('click', { target: { closest: (sel) => closest[sel] || null } });
  // a key as the page gets it (the panel listens on the window, ahead of the page's own keys), and whether the panel took it
  const key = (k) => {
    const ev = { key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, target: {}, taken: false, preventDefault() { this.taken = true; }, stopPropagation() {}, stopImmediatePropagation() {} };
    for (const fn of onWindow.keydown || []) fn(ev);
    return ev.taken;
  };
  return { panel, said, failed, list: root.querySelector('.lib-list'), meta: root.querySelector('.lib-meta'), click, key };
}
const ticks = () => new Promise((resolve) => setTimeout(resolve, 0));
// (by the clock on the wall, not a count of ticks: under the whole suite's load half a second of ticks was not always enough for main's
// real worker to begin, and the wait gave up on a scan that was on its way)
async function until(cond, what, ms = 10000) { const end = Date.now() + ms; while (!cond() && Date.now() < end) await ticks(); assert.ok(cond(), what); }
// Ctrl+K's "library: choose a folder" on a panel that is not open: it opens, and asks (and its load scans the folder it has)
const askedFor = (panel) => { panel.open('music'); return panel.choose(); };

// ---- main, as the page's bridge sees it, made up: a scan that waits for the test to end it, and a folder dialog the test answers
// (answer(label), or answer(null) for one that is cancelled). Choosing stops a scan that is running, which then fails as Electron
// says an ipcMain.handle that threw. They are two messages: the choice's own answer, and the stopped scan's failure, which comes
// after it (stopFirst: before it, to see that the panel does not depend on which)
function bridge({ stopFirst = false } = {}) {
  const scans = [], dialog = { asked: 0, answer: null };
  const nc = {
    onLibraryProgress() {},
    libraryFolder: async () => ({ path: '/Users/x/Old', label: '~/Old', chosen: true }),
    libraryCached: async () => null,
    libraryScan: () => new Promise((resolve, reject) => { scans.push({ over: false, resolve, reject }); }),
    libraryChoose: async () => {
      dialog.asked++;
      const label = await new Promise((resolve) => { dialog.answer = resolve; });
      if (label === null) return null;
      const stop = () => { for (const s of scans) if (!s.over) { s.over = true; s.reject(new Error("Error invoking remote method 'library:scan': Error: the scan stopped (1)")); } };
      if (stopFirst) stop(); else setTimeout(stop, 0);
      return { path: `/Users/x/${label}`, label, chosen: true };
    },
    libraryRead: async () => ({ name: 'x.mp3', bytes: new Uint8Array(4) }),
  };
  const end = (scan, result) => { scan.over = true; scan.resolve(result); };
  return { nc, scans, dialog, end };
}
const tracksIn = (folder, album) => ({ folder, tracks: [{ path: `${album}/01 One.mp3`, title: 'One', artist: 'Band', album, track: 1 }, { path: `${album}/02 Two.mp3`, title: 'Two', artist: 'Band', album, track: 2 }], covers: {} });

for (const stopFirst of [false, true]) test(`a folder chosen while a scan runs: the scan that was running ends (main stops it, ${stopFirst ? 'before' : 'after'} the choice is answered), and then the new folder is scanned`, async () => {
  const { nc, scans, dialog, end } = bridge({ stopFirst });
  const { panel, said, failed } = page(desktopSource(nc));
  try {
    // the dialog is up and nothing scans yet; then the panel's load scans the old folder under it
    const choosing = askedFor(panel);
    await until(() => dialog.asked === 1, 'the dialog is asked for');
    await until(() => scans.length === 1 && panel.state.scanning, 'the old folder is being scanned');
    dialog.answer('Other');
    await until(() => scans.length === 2, 'the new folder is scanned, which it was not while the old scan still held the panel');
    assert.equal(scans[0].over, true, 'the old scan had ended before the new one began');
    assert.equal(panel.state.scanning, true);
    assert.equal(panel.state.folder, 'Other');
    end(scans[1], tracksIn('Other', 'Elsewhere'));
    await choosing;
    assert.deepEqual(failed, []);
    assert.deepEqual(said, []);
    assert.equal(panel.state.error, '', 'a scan that was stopped is not an error');
    assert.equal(panel.state.scanning, false);
    assert.equal(panel.state.folder, 'Other');
    assert.deepEqual(panel.state.albums.map((a) => [a.album, a.tracks.length]), [['Elsewhere', 2]], 'only the new folder\'s tracks');
  } finally { panel.close(); }
});

test('a dialog that is cancelled while a scan runs leaves that scan alone', async () => {
  const { nc, scans, dialog, end } = bridge();
  const { panel, failed } = page(desktopSource(nc));
  try {
    const choosing = askedFor(panel);
    await until(() => dialog.asked === 1 && scans.length === 1, 'the dialog is up and the folder is being scanned');
    dialog.answer(null);
    await choosing;
    await ticks();
    assert.equal(panel.state.scanning, true);
    assert.equal(scans.length, 1);
    end(scans[0], tracksIn('~/Old', 'Home'));
    await until(() => !panel.state.scanning, 'the scan ends');
    assert.deepEqual(failed, []);
    assert.equal(panel.state.folder, '~/Old');
    assert.deepEqual(panel.state.albums.map((a) => a.album), ['Home']);
  } finally { panel.close(); }
});

test('while a scan runs, a click on the "looking for music" row, on the folder button, and Ctrl+K\'s "choose a folder" ask for no folder', async () => {
  const { nc, scans, dialog, end } = bridge();
  const { panel, failed, list, meta, click } = page(desktopSource(nc));
  const ctrlK = lazyLibrary({ load: async () => panel }); // (Ctrl+K reaches the panel through this)
  const running = panel.scan();
  await until(() => scans.length === 1, 'the folder is being scanned');
  panel.paintAll();
  click(list, { '[data-i]': { dataset: { i: '0' } } });
  await ticks();
  assert.equal(dialog.asked, 0, 'the row asked for no folder');
  click(meta, { '.lib-folder': {} });
  await ticks();
  assert.equal(dialog.asked, 0, 'the button asked for none');
  await ctrlK.choose();
  assert.equal(dialog.asked, 0, 'Ctrl+K asked for none');
  assert.equal(scans.length, 1, 'and the scan went on');
  // Ctrl+K opens the panel to ask (app.js: open on your music, then choose): there it says why, for a moment, on the panel's line (the
  // header, where the page says the rest, is under the panel)
  ctrlK.open('music'); // (not waited for, as app.js doesn't: opening waits for the scan that is going)
  await ctrlK.choose();
  assert.equal(dialog.asked, 0, 'still none');
  assert.match(meta.innerHTML, /still reading the folder: choose another once it is read/);
  // the scan ends, with nothing found: now Ctrl+K asks
  end(scans[0], { folder: '~/Old', tracks: [], covers: {} });
  await running;
  const asking = ctrlK.choose();
  await until(() => dialog.asked === 1, 'Ctrl+K asks for a folder');
  dialog.answer(null);
  await asking;
  assert.deepEqual(failed, []);
  panel.close(); // (open, its clock ticks)
});

test('the "looking for music" row says so as the scan begins, and is shut, as the folder button is disabled; both are open when it ends', async () => {
  const { nc, scans, end } = bridge();
  const { panel, list, meta } = page(desktopSource(nc));
  try {
    panel.open('music'); // (it is painted before anything is known: the row asks for a folder; then its load begins a scan)
    await until(() => scans.length === 1, 'the folder is being scanned');
    assert.match(list.innerHTML, /looking for music…/);
    assert.match(list.innerHTML, /class="lib-row choose"[^>]*aria-disabled="true"/);
    assert.match(meta.innerHTML, /class="lib-line lib-folder" disabled/);
    end(scans[0], { folder: '~/Old', tracks: [], covers: {} });
    await until(() => !panel.state.scanning, 'the scan ends');
    assert.match(list.innerHTML, /no music found in ~\/Old: choose another folder/);
    assert.doesNotMatch(list.innerHTML, /aria-disabled/);
    assert.doesNotMatch(meta.innerHTML, /lib-folder" disabled/);
  } finally { panel.close(); }
});

// ---- the fields: the radio's address and a scene's name

// a source with nothing to find (a browser's, with no folder picked: nothing is scanned), and the two fields as a page has them: they
// match what the panel asks of them, and one is the one `list.querySelector` finds
const nothing = { kind: 'web', supported: true, folder: '', start: async () => false, cached: async () => null, scan: async () => ({ folder: '', tracks: [], covers: {} }), choose: async () => null, file: async () => null };
function field(cls, value = '') {
  let focused = false;
  return { value, dataset: {}, get focused() { return focused; }, matches: (sel) => sel.split(',').map((s) => s.trim()).includes(`.${cls}`), classList: { contains: (c) => c === cls }, focus() { focused = true; }, blur() { focused = false; }, select() {} };
}
const focusIn = (list, input) => list.fire('focusin', { target: input });
// leaving a field: by Tab, or a click on another control, focus goes to the next element (relatedTarget); by a click on nothing, to none
const focusOut = (list, input, to = null) => list.fire('focusout', { target: input, relatedTarget: to });
const stations = [{ url: 'https://a.example/s', at: 2 }, { url: 'https://b.example/s', at: 1 }];

test('Tab out of the radio\'s address field ends the typing: the arrow keys and Esc are the library\'s again, as they are for a click on nothing', async () => {
  for (const to of [{ id: 'the next control' }, null]) {
    const { panel, list, key } = page(nothing, { stations: () => stations });
    const address = field('lib-address');
    list.querySelector = (sel) => (/lib-address/.test(sel) ? address : null);
    try {
      panel.open('radio');
      assert.equal(panel.state.section, 'radio');
      focusIn(list, address); // (Enter on its row, or a click in it)
      assert.equal(panel.state.typing, true);
      assert.equal(key('ArrowDown'), false, 'while typing, the arrow keys are the field\'s: the library takes none');
      assert.equal(panel.state.cursor.radio, 0);
      focusOut(list, address, to);
      assert.equal(panel.state.typing, false, 'left the field');
      assert.equal(key('ArrowDown'), true, 'the arrow keys are the library\'s');
      assert.equal(panel.state.cursor.radio, 1, 'and move the cursor');
      assert.equal(key('Escape'), true);
      assert.equal(panel.isOpen, false, 'the first Esc closes it, and is not spent on ending a typing that has ended');
    } finally { panel.close(); }
  }
});

test('Tab out of a scene\'s name field keeps the name, as a click on nothing does, and ends the typing', async () => {
  const renamed = [], mine = { id: 'u1', name: 'my scene 1', settings: { visual: 'worlds' } };
  const { panel, list, key } = page(nothing, { scenes: () => ({ presets: [], user: [mine] }), renameScene: (id, name) => renamed.push([id, name]) });
  const name = field('lib-rename', 'night worlds');
  list.querySelector = (sel) => (/lib-rename/.test(sel) ? name : null);
  try {
    panel.open('scenes');
    assert.equal(panel.state.section, 'scenes');
    key('ArrowDown'); // (the cursor from the save card to the scene)
    assert.equal(key('F2'), true, 'F2 renames the scene');
    assert.equal(panel.state.renaming, 'u1');
    assert.equal(panel.state.typing, true, 'the cursor is in the name');
    focusOut(list, name, { id: 'the next control' });
    assert.equal(panel.state.typing, false);
    assert.equal(panel.state.renaming, null);
    assert.deepEqual(renamed, [['u1', 'night worlds']], 'the name typed is kept');
    assert.equal(key('Escape'), true);
    assert.equal(panel.isOpen, false, 'and Esc closes the library at once');
  } finally { panel.close(); }
});

test('a scan again regroups the albums when only an album artist changed (or a disc, or the compilation flag): all that grouping goes by', async () => {
  let records = [{ path: 'A/x/01 a.mp3', title: 'a', artist: 'One', album: 'X', track: 1 }, { path: 'B/x/01 b.mp3', title: 'b', artist: 'Two', album: 'X', track: 1 }];
  const src = { ...nothing, scan: async () => ({ folder: 'Music', tracks: records.map((r) => ({ ...r })), covers: {} }) };
  const { panel } = page(src);
  try {
    panel.open('music');
    await panel.scan();
    assert.equal(panel.state.albums.length, 2, 'two albums called X, in two folders, with no album artist');
    records = records.map((r) => ({ ...r, albumArtist: 'Various Artists' }));
    await panel.scan();
    assert.equal(panel.state.albums.length, 1, 'one, once both name its album artist');
    records = records.map((r, i) => ({ ...r, disc: i + 1 }));
    await panel.scan();
    assert.deepEqual(panel.state.albums[0].tracks.map((t) => t.disc), [1, 2], 'and the discs it has now');
  } finally { panel.close(); }
});

test('the empty radio links to the station list: in the app a click opens it in the browser, on a page the link opens a tab', () => {
  for (const app of [true, false]) {
    const opened = [];
    const { panel, list } = page(nothing, app ? { openStations: () => opened.push('stations') } : { openStations: null });
    try {
      panel.open('radio');
      assert.match(list.innerHTML, /paste a stream's address below \(<a class="lib-stations" href="https:\/\/github\.com\/StopBanning\/toaster\/blob\/main\/docs\/radio-stations\.md" target="_blank" rel="noopener">a few stations publish theirs<\/a>\)/);
      const ev = { target: { closest: (sel) => (sel === '.lib-stations' ? {} : null) }, taken: false, preventDefault() { this.taken = true; } };
      list.fire('click', ev);
      assert.deepEqual(opened, app ? ['stations'] : []);
      assert.equal(ev.taken, app, app ? 'the app opens it itself (its window never navigates)' : 'a page lets the link open its tab');
      assert.equal(panel.state.cursor.radio, 0, 'and no row is picked');
    } finally { panel.close(); }
  }
});

// ---- main's own library: real folders, and a real worker that is really stopped
const made = [];
const parent = (() => { try { fs.mkdirSync(scratch(), { recursive: true }); return scratch(); } catch { return os.tmpdir(); } })();
after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const tagged = (title, album, n) => mp3({ frames: 12, tag: id3Tag({ version: 3, frames: [textFrame('TIT2', title), textFrame('TPE1', 'Band'), textFrame('TALB', album), textFrame('TRCK', `${n}/40`)] }) });
const put = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };

test('with main\'s own library: a folder chosen while its scan runs stops that scan, and the new folder is scanned', async () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(parent, 'library-panel-')));
  made.push(base);
  const old = path.join(base, 'Old'), other = path.join(base, 'Other');
  for (let i = 1; i <= 40; i++) put(path.join(old, 'Old Band', 'Old Album', `${String(i).padStart(2, '0')} Song.mp3`), tagged(`Song ${i}`, 'Old Album', i));
  put(path.join(other, 'New Band', 'New Album', '01 Fresh.mp3'), tagged('Fresh', 'New Album', 1));
  let pick, scans = 0, progress = () => {};
  const dialog = new Promise((resolve) => { pick = resolve; });
  const main = lib.createLibrary({ dir: path.join(base, 'profile'), music: old, home: base, rendererDir, thumbnail: () => null, dialog: { pick: () => dialog } });
  const nc = {
    onLibraryProgress: (fn) => { progress = fn; },
    libraryFolder: async () => main.folder(), libraryCached: async () => main.cached(), libraryChoose: () => main.choose(), libraryRead: (rel) => main.read(rel),
    libraryScan: () => { scans++; return main.scan((p) => progress(p)); },
  };
  const { panel, said, failed } = page(desktopSource(nc));
  try {
    const choosing = askedFor(panel);
    await until(() => scans === 1 && panel.state.scanning, 'the panel is scanning the old folder under the dialog');
    pick(other); // (the worker is still starting: main stops it)
    await choosing;
    assert.equal(scans, 2, 'the old folder\'s scan, stopped, and the new folder\'s');
    assert.deepEqual(failed, []);
    assert.deepEqual(said, []);
    assert.equal(panel.state.error, '');
    assert.equal(panel.state.scanning, false);
    assert.equal(panel.state.folder, '~/Other');
    assert.deepEqual(panel.state.albums.map((a) => [a.album, a.tracks.length]), [['New Album', 1]]);
  } finally { panel.close(); main.stop(); }
});
