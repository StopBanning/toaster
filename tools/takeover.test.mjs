// The XP takeover, the drop effect (renderer/fx.js, createTakeover): the screen becomes an XP desktop and windows pop open on every kick,
// each with its button on the taskbar, at most MAX_WINDOWS of them. Run here on a stand-in for the few parts of the page it touches (the
// elements it makes and moves, no more). A second drop while it is up starts it again (the review of Nov 1, D2 7).
import { test } from 'node:test';
import assert from 'node:assert/strict';

class El {
  constructor() { this.children = []; this.parent = null; this.style = {}; this.className = ''; this.added = new Set(); this.hidden = false; this.textContent = ''; this.offsetWidth = 240; this.offsetHeight = 150; this.kids = new Map(); this.html = ''; }
  get classList() {
    const el = this;
    return { add: (c) => el.added.add(c), remove: (c) => { el.added.delete(c); el.className = el.className.split(' ').filter((x) => x !== c).join(' '); }, contains: (c) => el.added.has(c) || el.className.split(' ').includes(c) };
  }
  set innerHTML(v) { this.html = v; if (v === '') this.children.length = 0; }
  get innerHTML() { return this.html; }
  append(...nodes) { for (const n of nodes) { n.remove(); n.parent = this; this.children.push(n); } }
  prepend(n) { n.parent = this; this.children.unshift(n); }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  querySelector(sel) { if (!this.kids.has(sel)) this.kids.set(sel, new El()); return this.kids.get(sel); }
}
globalThis.document = { createElement: () => new El() };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
const { createTakeover } = await import('../renderer/fx.js');

function rig() {
  const back = new El(), front = new El(), takeover = createTakeover({ back, front, sources: { cam: () => false } });
  const wins = front.querySelector('.wins'), tasks = front.querySelector('.tasks');
  return { takeover, wins, tasks, open: () => wins.children.length, buttons: () => tasks.children.length };
}
// every window that has a button has its own, and every button is a window's
const matched = (r) => r.wins.children.filter((w) => w.task).every((w) => r.tasks.children.includes(w.task)) && r.tasks.children.every((b) => r.wins.children.some((w) => w.task === b));

test('a drop while the takeover is up starts it over: the windows of the last one are closed, not left with no buttons and in the way (D2 7)', () => {
  const r = rig();
  r.takeover.start(0, 'Plague', 2);
  for (let i = 0; i < 5; i++) r.takeover.kick();
  assert.equal(r.open(), 6, 'six windows up');
  assert.ok(matched(r), 'each with its button');
  r.takeover.start(1, 'Kerosene', 2); // (the second drop)
  assert.equal(r.open(), 1, 'the new first window only');
  assert.equal(r.buttons(), r.wins.children.filter((w) => w.classList.contains('xp')).length, 'a button for each XP window and no others');
  assert.ok(matched(r));
  for (let i = 0; i < 20; i++) r.takeover.kick();
  assert.equal(r.open(), 8, 'the most there are, as for a first drop: the old ones do not use the places up');
  assert.ok(matched(r), 'every window has a button');
});

test('a drop at the limit (every place taken) still opens a window, and the takeover\'s own stop closes them all', () => {
  const r = rig();
  r.takeover.start(0, 'Plague', 2);
  for (let i = 0; i < 20; i++) r.takeover.kick();
  assert.equal(r.open(), 8);
  r.takeover.start(1, 'Kerosene', 2);
  assert.equal(r.open(), 1, 'a window of the new one, though the last was full');
  r.takeover.stop();
  assert.equal(r.open(), 0);
  assert.equal(r.buttons(), 0);
  assert.equal(r.takeover.active, false);
});
