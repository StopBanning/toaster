import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code = fs.readFileSync(new URL('../renderer/codeview.js', import.meta.url), 'utf8');
function view() {
  const element = () => ({ innerHTML: '', hidden: true, style: { setProperty() {} }, offsetWidth: 100, offsetHeight: 20,
    classList: { toggle() {}, remove() {}, add() {} }, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, right: 900, top: 20, bottom: 40 }) });
  const elements = Object.fromEntries(['ln-bd', 'code', 'err'].map(id => [id, element()]));
  const context = vm.createContext({ clock: { rng: () => () => 0, now: () => 1000, after() {} },
    document: { getElementById: id => elements[id], createElement: () => ({ getContext: () => ({}) }) },
    ResizeObserver: class { observe() {} }, innerHeight: 800 });
  vm.runInContext(code.replace("import { clock } from './clock.js';", '').replaceAll('export ', '') + '\nglobalThis.make = createCodeView;', context);
  return { v: context.make(['bd']), err: elements.err };
}
const target = 's("bd bd bd bd bd bd")';
function type(v, inspect = () => {}) {
  v.update({ bd: [{ text: target }] }, 0, true);
  for (let i = 0; i < 200; i++) { v.step(i); inspect(v.lines.bd.shown); }
  assert.equal(v.lines.bd.shown, target);
}
test('default typing never inserts wrong characters or a staged error even with dice forcing mistakes', () => {
  const { v, err } = view();
  assert.equal(v.slipsOff, true);
  type(v, shown => { assert.ok(target.startsWith(shown), shown); assert.equal(err.hidden, true); });
});
test('opt-in shows wrong keys and a staged error, then fixes them', () => {
  const { v, err } = view(); v.slipsOff = false;
  let wrong = false, error = false;
  type(v, shown => { wrong ||= !target.startsWith(shown); error ||= !err.hidden; });
  assert.ok(wrong); assert.ok(error); assert.equal(err.hidden, true);
});
test('switching off cancels a planned or showing mistake and finishes normal typing', () => {
  for (const waitForError of [false, true]) {
    const { v, err } = view(); v.slipsOff = false;
    v.update({ bd: [{ text: target }] }, 0, true);
    for (let i = 0; i < 100; i++) { v.step(i); if (!waitForError || !err.hidden) break; }
    v.slipsOff = true;
    assert.equal(err.hidden, true);
    for (let i = 100; i < 300; i++) { v.step(i); assert.equal(err.hidden, true); }
    assert.equal(v.lines.bd.shown, target);
  }
});
test('preference is saved, exposed under code in help, and suppressed for every recording path; real errors keep the alert panel', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8');
  assert.match(app, /const SAVED = \[[^\]]*'stagedTypos'/);
  assert.match(app, /state\.stagedTypos = state\.stagedTypos === true/);
  assert.match(app, /view\.slipsOff = !state\.stagedTypos \|\| !!rec\.mr \|\| clips\.on \|\| !!TAKE/);
  assert.match(html, /data-act="code"[^]*?id="staged-typos"/);
  assert.match(app, /function showError\(err\) {[^]*?showMenu\(String\(err\?\.message \|\| err\)\)/);
});
