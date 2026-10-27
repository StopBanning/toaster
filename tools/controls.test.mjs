// The controls panel (renderer/controls.js): every action has a button, a tap runs it, the panel stays
// open for the next tap, and a device with hover (a mouse) gets nothing at all. Run on a stand-in for the
// page's DOM, with the real action list read out of renderer/app.js. renderer/ in a real browser: see the report.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControls, CONTROLS, GROUPS, dockFor } from '../renderer/controls.js';

const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8');
const actionIds = [...app.slice(app.indexOf('const ACTIONS = ['), app.indexOf('// the footer\'s list of keys')).matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]);

// ---- a page, just enough of one
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.parent = null; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.hidden = false; this.className = ''; this.textContent = ''; this.id = ''; this.on = new Set(); }
  get classList() { const el = this; return { add: (c) => el.on.add(c), remove: (c) => el.on.delete(c), toggle: (c, f) => (f ? el.on.add(c) : el.on.delete(c)), contains: (c) => el.on.has(c) || el.className.split(' ').includes(c) }; }
  append(...kids) { for (const k of kids) { k.parent = this; this.children.push(k); } }
  before(k) { const i = this.parent.children.indexOf(this); k.parent = this.parent; this.parent.children.splice(i, 0, k); }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, target: this, ...ev }); }
  closest(sel) { for (let e = this; e; e = e.parent) if (sel.split(',').some((s) => s.trim() === '#' + e.id && e.id)) return e; return null; }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const k of this.children) k.find(pred, out); return out; }
  get shown() { for (let e = this; e; e = e.parent) if (e.hidden) return false; return true; }
}
function page({ hover = false, can = {}, now = {}, width = 834, height = 1194 } = {}) {
  const body = new El('body'), bar = new El('header'), help = new El('button');
  bar.id = 'bar'; help.id = 'b-help'; bar.append(help); body.append(bar);
  const all = (pred) => body.find(pred);
  const doc = { body, listeners: {}, createElement: (t) => new El(t), getElementById: (id) => all((e) => e.id === id)[0] || null,
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }, removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); },
    fire(t, ev) { for (const fn of this.listeners[t] || []) fn(ev); } };
  doc.body.classList; // (body's class list is its own set)
  const ran = {};
  const actions = actionIds.map((id) => ({ id, run: () => { ran[id] = (ran[id] || 0) + 1; } }));
  const mq = { matches: !hover, handlers: [], addEventListener(t, fn) { this.handlers.push(fn); }, set(v) { this.matches = v; this.handlers.forEach((f) => f()); } };
  const win = { innerWidth: width, innerHeight: height, addEventListener() {}, removeEventListener() {} };
  const c = createControls({ document: doc, window: win, query: mq, actions, K: (id) => id.slice(0, 1).toUpperCase(), now, can });
  const tile = (id) => all((e) => e.dataset.act === id)[0];
  return { body, bar, doc, c, ran, mq, actions, tile, all, panel: () => doc.getElementById('controls') };
}

test('the panel knows every action in the app, and no other', () => {
  assert.ok(actionIds.length >= 28, `read ${actionIds.length} actions out of app.js`);
  assert.deepEqual([...CONTROLS.map((c) => c[0])].sort(), [...actionIds].sort());
  assert.equal(new Set(CONTROLS.map((c) => c[0])).size, CONTROLS.length);
  for (const [, group, name] of CONTROLS) { assert.ok(GROUPS.includes(group)); assert.ok(name); }
  // (the groups are the help's: each action's row sits in the same section there)
  const sections = {};
  let sec = '';
  for (const line of html.split('\n')) {
    const h = line.match(/<tr class="sec"><th colspan="2">([^<]+)</);
    if (h) sec = h[1].replace('&amp;', '&');
    for (const id of (line.match(/<tr data-act="([^"]+)"/)?.[1] || '').split(',').filter(Boolean)) sections[id] = sec;
  }
  for (const [id, group] of CONTROLS) assert.equal(group, sections[id], `${id}: the help has it under "${sections[id]}"`);
});

test('every action has a button, and a tap runs that action', () => {
  const p = page();
  assert.ok(p.c.mounted);
  p.c.open();
  assert.deepEqual([...p.c.buttons].sort(), [...actionIds].sort());
  for (const id of actionIds) {
    const b = p.tile(id);
    assert.ok(b && b.shown, `${id} has a visible button`);
    if (id === 'tap') b.fire('pointerdown'); else b.fire('click');
    assert.equal(p.ran[id], 1, `${id} ran once`);
  }
  assert.equal(Object.keys(p.ran).length, actionIds.length);
});

test('the tap pad takes the touch, and a lift after it is not a second tap; a keyboard press is one', () => {
  const p = page();
  p.c.open();
  const pad = p.tile('tap');
  pad.fire('pointerdown'); pad.fire('click');
  assert.equal(p.ran.tap, 1);
  pad.fire('pointerdown'); pad.fire('click'); pad.fire('pointerdown'); pad.fire('click'); pad.fire('pointerdown'); pad.fire('click');
  assert.equal(p.ran.tap, 4);
  pad.fire('click'); // (Enter on the focused pad: no touch before it)
  assert.equal(p.ran.tap, 5);
});

test('the panel stays open for the next tap, and closes with its button, Esc or a tap outside', () => {
  const p = page();
  assert.equal(p.panel().hidden, true);
  p.bar.children.find((b) => b.id === 'b-controls').fire('click');
  assert.equal(p.panel().hidden, false);
  assert.ok(p.body.classList.contains('controls-open'));
  p.tile('visual').fire('click'); p.tile('visual').fire('click');
  assert.equal(p.ran.visual, 2);
  p.doc.fire('pointerdown', { target: p.tile('visual') });
  assert.equal(p.panel().hidden, false, 'a touch inside the panel leaves it open');
  p.doc.fire('pointerdown', { target: p.bar });
  assert.equal(p.panel().hidden, true, 'a touch outside closes it');
  p.c.open();
  p.doc.fire('keydown', { key: 'Escape' });
  assert.equal(p.panel().hidden, true);
  p.c.open();
  p.all((e) => e.className === 'ctl-close')[0].fire('click');
  assert.equal(p.panel().hidden, true);
  assert.ok(!p.body.classList.contains('controls-open'));
});

test('a device with hover (a mouse) gets nothing: no button, no panel, no listener', () => {
  const p = page({ hover: true });
  assert.equal(p.c.mounted, false);
  assert.equal(p.panel(), null);
  assert.equal(p.doc.getElementById('b-controls'), null);
  assert.equal(p.doc.getElementById('ctl-fab'), null);
  assert.deepEqual(p.body.children, [p.bar]);
  assert.deepEqual(p.bar.children.map((b) => b.id), ['b-help']);
  assert.equal(Object.values(p.doc.listeners).flat().length, 0);
  p.c.open(); // (nothing to open)
  assert.equal(p.c.isOpen, false);
});

test('it follows the pointer: a mouse plugged in takes it away, a mouse unplugged brings it back', () => {
  const p = page();
  assert.ok(p.doc.getElementById('b-controls'));
  p.c.open();
  p.mq.set(false);
  assert.equal(p.c.mounted, false);
  assert.equal(p.doc.getElementById('controls'), null);
  assert.deepEqual(p.body.children, [p.bar]);
  assert.deepEqual(p.bar.children.map((b) => b.id), ['b-help']);
  p.mq.set(true);
  assert.equal(p.c.mounted, true);
  assert.equal(p.bar.children[0].id, 'b-controls', 'the header button sits before the ? button');
});

test('what this device can\'t do is left out, and a section left empty goes with it', () => {
  const p = page({ can: { layout: () => false, mini: () => false, rec: () => false, clips: () => false, export: () => false, strudel: () => false, cam: () => false, full: () => false } });
  p.c.open();
  for (const id of ['layout', 'mini', 'rec', 'clips', 'export', 'strudel', 'cam', 'full']) assert.equal(p.tile(id).hidden, true, id);
  for (const id of actionIds.filter((x) => !['layout', 'mini', 'rec', 'clips', 'export', 'strudel', 'cam', 'full'].includes(x))) assert.equal(p.tile(id).hidden, false, id);
  const heads = p.all((e) => e.tag === 'h3');
  assert.equal(heads.find((h) => h.textContent === 'save & share').hidden, true, 'nothing left in save & share');
  assert.equal(heads.find((h) => h.textContent === 'camera').hidden, false, 'camera effect is still there');
  assert.equal(heads.find((h) => h.textContent === 'window').hidden, false);
});

test('a button says what the app is set to, and follows it', () => {
  let theme = 'pink', blocks = { text: 'dominoes', on: true };
  const p = page({ now: { theme: () => theme, blocks: () => blocks, orb: () => ({ text: 'off', on: false }) } });
  p.c.open();
  const text = (id) => p.tile(id).children.map((k) => k.textContent).join('|');
  assert.match(text('theme'), /pink/);
  assert.match(text('blocks'), /dominoes/);
  assert.ok(p.tile('blocks').on.has('on'));
  assert.ok(!p.tile('orb').on.has('on'));
  assert.match(text('source'), /system, demo, file, input/, 'with no state, the help\'s words');
  theme = 'terminal'; blocks = { text: 'off', on: false };
  p.c.refresh();
  assert.match(text('theme'), /terminal/);
  assert.ok(!p.tile('blocks').on.has('on'));
  assert.equal(p.tile('theme').attrs['aria-label'], 'theme: terminal');
});

test('an action that fails is reported, not lost; a rejected promise too', async () => {
  const seen = [];
  const body = new El('body');
  const doc = { body, createElement: (t) => new El(t), getElementById: () => null, addEventListener() {}, removeEventListener() {} };
  const c = createControls({ document: doc, window: { innerWidth: 400, innerHeight: 800 }, query: { matches: true }, K: () => 'X', fail: (e) => seen.push(e.message),
    actions: [{ id: 'visual', run: () => { throw new Error('sync'); } }, { id: 'theme', run: async () => { throw new Error('async'); } }] });
  c.open();
  const tiles = body.find((e) => e.dataset.act);
  tiles[0].fire('click'); tiles[1].fire('click');
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(seen.sort(), ['async', 'sync']);
  c.close();
});

test('where the panel sits: the side on a wide landscape screen, the bottom on a portrait one or a phone', () => {
  assert.equal(dockFor(1194, 834), 'side');
  assert.equal(dockFor(834, 1194), 'bottom');
  assert.equal(dockFor(390, 844), 'bottom');
  assert.equal(dockFor(844, 390), 'side');
  assert.equal(dockFor(1194, 834, 'bottom'), 'bottom');
  assert.equal(dockFor(834, 1194, 'side'), 'side');
  // (the handheld game on: the left side in landscape, so the handheld stays in view; portrait unchanged)
  assert.equal(dockFor(1194, 834, 'auto', true), 'left');
  assert.equal(dockFor(834, 1194, 'auto', true), 'bottom');
  assert.equal(dockFor(1194, 834, 'side', true), 'side');
  const p = page({ width: 1194, height: 834 });
  p.c.open();
  assert.equal(p.panel().dataset.dock, 'side');
});

test('app.js wires it to the real actions, and describes only actions that exist', () => {
  assert.match(app, /createControls\(\{[^]*?actions: ACTIONS,/);
  const block = app.slice(app.indexOf('const controls = createControls({'));
  for (const part of [block.slice(block.indexOf('now: {'), block.indexOf('  can: {')), block.slice(block.indexOf('  can: {'), block.indexOf('\n});'))]) {
    const ids = [...part.matchAll(/^ {4}(\w+): /gm)].map((m) => m[1]);
    assert.ok(ids.length >= 5);
    for (const id of ids) assert.ok(actionIds.includes(id), `${id} is an action`);
  }
});

test('the touch targets are at least 44 px, and the page itself has no panel in it', () => {
  const min = (sel) => Number(css.match(new RegExp(sel.replace(/[.#]/g, '\\$&') + ' \\{[^}]*?min-height: (\\d+)px'))?.[1]);
  for (const sel of ['.ctl', '.ctl-close', '#ctl-fab']) assert.ok(min(sel) >= 44, `${sel} is ${min(sel)} px`);
  assert.ok(min('.ctl-pad') >= 44);
  assert.doesNotMatch(html, /controls|ctl-/, 'the panel is built by script, only where there is no hover');
});
