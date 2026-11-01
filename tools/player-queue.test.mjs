// What the library adds to the player bar (renderer/player.js): previous goes to the track before where the app has a queue (and says so),
// restarts the file where it has not; next shows only while there is one (the app gives it as a getter); and Golden's line of what's near
// ("01 Plague" , ▶ "02 Kerosene" , "03 Wrath of God") sits beside the song, filled in as the queue moves and gone with it. The bar is
// built on a stand-in page, as tools/player-bar.test.mjs does it; the rest of the bar is that file's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerBar } from '../renderer/player.js';
import { queueLine, queueOf } from '../renderer/library.js';

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = {}; this.className = ''; this.hidden = false; this._text = ''; this.on = new Set(); this.innerHTML = ''; this.title = ''; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v; }
  append(...kids) { this.children.push(...kids); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  get classList() { const el = this; return { toggle: (c, f) => (f ? el.on.add(c) : el.on.delete(c)), contains: (c) => el.on.has(c) }; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, preventDefault() {}, ...ev }); }
  getBoundingClientRect() { return { left: 0, width: 0, top: 0 }; }
  blur() {}
  find(cls, out = []) { if (this.className.split(' ').includes(cls)) out.push(this); for (const k of this.children) k.find(cls, out); return out; }
}
const audio = () => ({ paused: false, currentTime: 42, duration: 195, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } });
const snap = (o = {}) => ({ t: 0, active: true, source: 'file', stopped: null, label: 'x.mp3', song: { title: 'Kerosene', artist: 'Crystal Castles' }, app: '', session: false, systemPlaying: false, el: audio(), tempo: { locked: false, shown: 0 }, key: '', at: null, ...o });
function page(act) {
  const root = new El('div'), doc = { createElement: (t) => new El(t), body: new El('body') };
  const win = { innerHeight: 700, getComputedStyle: () => ({ getPropertyValue: () => ' 38px' }) };
  const bar = createPlayerBar({ document: doc, root, nc: null, platform: 'web', act, window: win });
  const part = (cls) => root.find(cls)[0];
  const near = () => ({ hidden: part('pl-near').hidden, text: part('pl-near').children.map((c) => c.textContent).join(''), now: part('pl-near').children.filter((c) => c.on.has('now')).map((c) => c.textContent) });
  return { bar, part, near, buttons: () => ['prev', 'play', 'next'].filter((k) => !part(`pl-${k}`).hidden) };
}
const SONGS = ['Plague', 'Kerosene', 'Wrath of God', 'Affection', 'Pale Flesh', 'Sad Eyes'].map((title, i) => ({ id: `${i}`, path: `${i}`, title }));
const line = (index) => queueLine(queueOf({ id: 'a', tracks: SONGS }, index));

test('previous goes to the track before where the app has a queue, and says "previous"; with none it restarts the file, and says "restart"', () => {
  const calls = [];
  const queued = page({ restart: () => calls.push('restart'), next: () => calls.push('next'), previous: () => calls.push('previous') });
  queued.bar.update(snap());
  assert.deepEqual(queued.buttons(), ['prev', 'play', 'next']);
  assert.equal(queued.part('pl-prev').attrs['aria-label'], 'previous');
  queued.part('pl-prev').fire('click');
  queued.part('pl-next').fire('click');
  assert.deepEqual(calls, ['previous', 'next']);
  const calls2 = [];
  const alone = page({ restart: () => calls2.push('restart') });
  alone.bar.update(snap());
  assert.deepEqual(alone.buttons(), ['prev', 'play']);
  assert.equal(alone.part('pl-prev').attrs['aria-label'], 'restart');
  alone.part('pl-prev').fire('click');
  assert.deepEqual(calls2, ['restart']);
});

test('the queue\'s buttons come and go with a getter, as the app gives them: next shows only while there is a queue', () => {
  let live = true;
  const calls = [];
  const act = { restart: () => calls.push('restart'), get next() { return live ? () => calls.push('next') : undefined; }, get previous() { return live ? () => calls.push('previous') : undefined; } };
  const p = page(act);
  p.bar.update(snap());
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next']);
  live = false; // (another source took over, or the file is the one picked on its own)
  p.bar.update(snap());
  assert.deepEqual(p.buttons(), ['prev', 'play']);
  assert.equal(p.part('pl-prev').attrs['aria-label'], 'restart');
  p.part('pl-prev').fire('click');
  p.part('pl-next').fire('click');
  assert.deepEqual(calls, ['restart'], 'the hidden next does nothing');
});

test('the line of what is near: the track before, this one marked, the next two, beside the song; gone with the queue, and for anything but a file', () => {
  const p = page({ next: () => {}, previous: () => {} });
  p.bar.update(snap({ near: line(1) }));
  assert.deepEqual(p.near(), { hidden: false, text: '"01 Plague" , ▶ "02 Kerosene" , "03 Wrath of God" , "04 Affection"', now: ['"02 Kerosene"'] });
  p.bar.update(snap({ near: line(0) }));
  assert.deepEqual(p.near(), { hidden: false, text: '▶ "01 Plague" , "02 Kerosene" , "03 Wrath of God"', now: ['"01 Plague"'] }, 'nothing before the first, and no stray separator');
  p.bar.update(snap({ near: line(5) }));
  assert.deepEqual(p.near(), { hidden: false, text: '"05 Pale Flesh" , ▶ "06 Sad Eyes"', now: ['"06 Sad Eyes"'] }, 'nor after the last');
  p.bar.update(snap({ near: null }));
  assert.deepEqual(p.near(), { hidden: true, text: '', now: [] });
  p.bar.update(snap({ near: line(2), source: 'radio', el: null }));
  assert.equal(p.near().hidden, true, 'the radio has no tracks');
  p.bar.update(snap({ near: line(2) }));
  assert.equal(p.near().hidden, false);
  p.bar.update(snap({ near: line(2), source: null, song: null, el: null }));
  assert.equal(p.near().hidden, true, 'and nothing playing has none');
  p.bar.update(snap());
  assert.equal(p.near().hidden, true, 'a snapshot with no line of its own: none');
  // the song is where it was, whatever the line
  p.bar.update(snap({ near: line(1) }));
  assert.equal(p.part('pl-title').textContent, 'Kerosene');
});
