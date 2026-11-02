// The radio's titles in the main process (main.js, radio:titles): each page that plays a station asks for its titles, which are read from
// the stream beside the sound and sent to that page. There are two pages that can play one, the main window and the desktop handheld (the
// page again, ?widget), and the handheld's start (and its every stop) asks for none: that must stop only its own read (the review of Nov 1,
// A7). The handler's own code, sliced out of main.js and run on stand-ins for the pages and for the stream.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const main = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const head = main.slice(main.indexOf('const radioTitles = '), main.indexOf('async function readTitles('));
const handler = main.slice(main.indexOf("  ipcMain.handle('radio:titles'"), main.indexOf("  // The radio's song's cover"));

// the handler and its state, with readTitles replaced by a stand-in that notes each read it is asked to start
function fixture() {
  const handlers = {}, reads = [];
  const context = { ipcMain: { handle: (name, fn) => { handlers[name] = fn; } }, AbortController, WeakSet, Map, Promise, reads };
  vm.runInNewContext(`${head}\nasync function readTitles(url, ctl, send) { reads.push({ url, ctl, send }); }\n${handler};globalThis.api = { radioTitles };`, context);
  // a page: its webContents. 'destroyed' is told once, by destroy(); listeners counts what was hooked on it
  const page = (name) => {
    const hooks = [], sent = [];
    return { name, sent, hooks, destroyed: false, isDestroyed() { return this.destroyed; }, send: (...a) => sent.push(a), once: (event, fn) => { assert.equal(event, 'destroyed'); hooks.push(fn); }, destroy() { this.destroyed = true; hooks.splice(0).forEach((fn) => fn()); } };
  };
  return { reads, state: context.api, page, ask: (p, url) => handlers['radio:titles']({ sender: p }, url) };
}
const live = (f) => f.reads.filter((r) => !r.ctl.signal.aborted).map((r) => r.url);

test('the handheld asking for none (its start, every stop) does not stop the main window\'s titles; each page reads its own (A7)', () => {
  const f = fixture(), main = f.page('main'), widget = f.page('widget');
  f.ask(main, 'https://radio.example/one');
  assert.deepEqual(live(f), ['https://radio.example/one']);
  f.ask(widget, null); // (the handheld opens, and stops what it has: nothing)
  assert.deepEqual(live(f), ['https://radio.example/one'], 'the main window still has its titles');
  f.ask(widget, 'https://radio.example/two');
  assert.deepEqual(live(f), ['https://radio.example/one', 'https://radio.example/two'], 'one each');
  f.reads[0].send({ title: 'Plague', artist: 'Crystal Castles' });
  f.reads[1].send({ title: 'Kerosene', artist: 'Crystal Castles' });
  assert.deepEqual(main.sent, [['radio:title', { title: 'Plague', artist: 'Crystal Castles' }]], 'each title goes to the page that asked');
  assert.deepEqual(widget.sent, [['radio:title', { title: 'Kerosene', artist: 'Crystal Castles' }]]);
  f.ask(main, 'https://radio.example/three'); // (another station: that page's first is let go, the other's is not)
  assert.deepEqual(live(f), ['https://radio.example/two', 'https://radio.example/three']);
  f.ask(widget, null);
  assert.deepEqual(live(f), ['https://radio.example/three'], 'the handheld stops its own');
  f.ask(main, 'not an address');
  assert.deepEqual(live(f), [], 'and an address that is not one stops that page\'s, as null does');
});

test('a page that goes lets go of its read, once however many stations it played; the others\' go on (A7)', () => {
  const f = fixture(), main = f.page('main'), widget = f.page('widget');
  f.ask(main, 'https://radio.example/one');
  for (let i = 0; i < 14; i++) f.ask(widget, `https://radio.example/w${i}`);
  assert.equal(widget.hooks.length, 1, 'one hook on the page, not one for each station (a listener a station would be a leak)');
  assert.equal(live(f).length, 2);
  widget.destroy();
  assert.deepEqual(live(f), ['https://radio.example/one'], 'the handheld closed: its read is let go, the main window\'s is not');
  assert.equal(f.state.radioTitles.size, 1, 'and forgotten');
  f.ask(widget, 'https://radio.example/after'); // (a page that is gone asks no more; if one did, it is hooked already: once)
  assert.equal(widget.hooks.length, 0, 'a page already hooked is not hooked twice');
});

test('quitting lets go of every read', () => {
  assert.match(main, /window-all-closed[\s\S]{0,400}for \(const page of \[\.\.\.radioTitles\.keys\(\)\]\) stopTitles\(page\);/);
});
