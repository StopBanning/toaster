// Shuffle and repeat on the player bar (renderer/player.js modesFor; Colin, Nov 10: "anyway that we could add like shuffle and smart
// shuffle"): Spotify's own, set through the Web API while the bar shows Spotify's song from it; or the library queue's (Shift+S and
// Shift+R in the library) while an album of it plays; and not there at all otherwise. A stand-in page, as tools/player-bar.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { modesFor, createPlayerBar } from '../renderer/player.js';

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = {}; this.className = ''; this.hidden = false; this._text = ''; this.cls = new Set(); this.innerHTML = ''; this.title = ''; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v; }
  append(...kids) { this.children.push(...kids); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  get classList() { const el = this; return { toggle: (c, f) => (f ? el.cls.add(c) : el.cls.delete(c)), contains: (c) => el.cls.has(c) }; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, preventDefault() {}, ...ev }); }
  getBoundingClientRect() { return { top: 0, left: 0, width: 0 }; }
  blur() {}
  find(cls, out = []) { if (this.className.split(' ').includes(cls)) out.push(this); for (const k of this.children) k.find(cls, out); return out; }
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const SONG = { title: 'Kerosene', artist: 'Big Black' };
const URI = 'spotify:track:' + 'T'.repeat(22);

function page({ spotify = null, queue = null } = {}) {
  const root = new El('div'), doc = { createElement: (t) => new El(t), body: new El('body') };
  const sent = [], calls = [];
  let refusal = '';
  const now = spotify && { track: { name: SONG.title, by: SONG.artist, uri: URI, cover: '' }, device: 'dev-1', playing: true, position: 10, duration: 200,
    allowed: { pause: true, resume: true, next: true, previous: true, shuffle: true, repeat: true }, shuffle: false, smart: false, repeat: 'off', ...spotify };
  const nc = { platform: 'darwin', playerCommand: async () => ({ ok: true }), playerPosition: async () => ({ ok: false }),
    spotifyPlayback: async () => now, spotifyControl: async (r) => { if (refusal) throw new Error(refusal); sent.push(r); if (r.action === 'shuffle') { now.shuffle = r.state; if (!r.state) now.smart = false; } if (r.action === 'repeat') now.repeat = r.state; return { ok: true }; } };
  const act = { fail: (e) => calls.push(['fail', e.message]), note: (t) => calls.push(['note', t]) };
  if (queue) Object.assign(act, { next: () => {}, previous: () => {}, shuffle: () => queue.shuffle, repeat: () => queue.repeat, setShuffle: (on) => { queue.shuffle = on; calls.push(['shuffle', on]); }, setRepeat: (m) => { queue.repeat = m; calls.push(['repeat', m]); } });
  const bar = createPlayerBar({ document: doc, root, nc, platform: 'darwin', act, window: { innerHeight: 700, getComputedStyle: () => ({ getPropertyValue: () => '' }) } });
  const part = (cls) => root.find(cls)[0];
  return { bar, sent, calls, now, part, root, refuse: (why) => { refusal = why; } };
}
const spotifySnap = (t) => ({ t, active: true, source: 'system', app: 'Spotify', song: SONG, stopped: null, label: '', tempo: { locked: false, shown: 0 }, key: '', at: null });
const fileSnap = (t) => ({ t, active: true, source: 'file', song: { title: 'a', artist: 'b' }, el: { paused: false, currentTime: 1, duration: 100 }, stopped: null, label: '', tempo: { locked: false, shown: 0 }, key: '', at: null });

test('what shows: Spotify\'s modes as Spotify allows them, the queue\'s while an album plays, nothing otherwise', () => {
  const sp = { shuffle: true, smart: false, repeat: 'context', allowed: { shuffle: true, repeat: true } };
  assert.deepEqual(modesFor({ player: 'spotify-api', spotify: sp }), { shuffle: 'on', repeat: 'all' });
  assert.deepEqual(modesFor({ player: 'spotify-api', spotify: { ...sp, smart: true, repeat: 'track' } }), { shuffle: 'smart', repeat: 'one' });
  assert.deepEqual(modesFor({ player: 'spotify-api', spotify: { ...sp, allowed: { shuffle: false, repeat: true } } }), { shuffle: null, repeat: 'all' });
  assert.deepEqual(modesFor({ source: 'file', queue: { shuffle: false, repeat: 'album' } }), { shuffle: 'off', repeat: 'off' });
  assert.deepEqual(modesFor({ source: 'file', queue: { shuffle: true, repeat: 'one' } }), { shuffle: 'on', repeat: 'one' });
  assert.deepEqual(modesFor({ source: 'file' }), { shuffle: null, repeat: null }, 'a file on its own');
  assert.deepEqual(modesFor({ source: 'system', player: 'music' }), { shuffle: null, repeat: null }, 'Music on a Mac: no way to them');
  assert.deepEqual(modesFor({ source: 'mic' }), { shuffle: null, repeat: null });
});

test('Spotify: shuffle on and off, and repeat round off, all, this song, through the Web API; the press shows at once', async () => {
  const p = page({ spotify: {} });
  p.bar.update(spotifySnap(10)); await flush(); p.bar.update(spotifySnap(10.5));
  const sh = p.part('pl-shuffle'), rp = p.part('pl-repeat');
  assert.equal(sh.hidden, false); assert.equal(rp.hidden, false);
  assert.equal(sh.dataset.state, 'off'); assert.equal(sh.cls.has('on'), false); assert.equal(sh.attrs['aria-pressed'], 'false');
  sh.fire('click'); assert.equal(sh.dataset.state, 'on', 'shown before Spotify answers'); await flush();
  assert.deepEqual(p.sent.at(-1), { action: 'shuffle', state: true, device: 'dev-1', uri: URI });
  for (const [state, shown] of [['context', 'all'], ['track', 'one'], ['off', 'off']]) {
    rp.fire('click'); await flush();
    assert.equal(p.sent.at(-1).state, state); assert.equal(rp.dataset.state, shown);
  }
  assert.ok(rp.innerHTML.includes('svg'));
  sh.fire('click'); await flush(); assert.deepEqual(p.sent.at(-1).state, false);
});

test("Spotify's smart shuffle shows with its spark, and a press turns it off (only Spotify turns it on)", async () => {
  const p = page({ spotify: { shuffle: true, smart: true } });
  p.bar.update(spotifySnap(10)); await flush(); p.bar.update(spotifySnap(10.5));
  const sh = p.part('pl-shuffle');
  assert.equal(sh.dataset.state, 'smart'); assert.match(sh.title, /smart shuffle/);
  sh.fire('click'); await flush();
  assert.deepEqual(p.sent.at(-1).state, false);
  p.bar.update(spotifySnap(14)); await flush(); p.bar.update(spotifySnap(14.5));
  assert.equal(sh.dataset.state, 'off');
});

test('a mode Spotify will not change is not shown, and a refusal says so and puts the button back', async () => {
  const p = page({ spotify: { allowed: { pause: true, resume: true, next: true, previous: true, shuffle: false, repeat: true } } });
  p.bar.update(spotifySnap(10)); await flush(); p.bar.update(spotifySnap(10.5));
  assert.equal(p.part('pl-shuffle').hidden, true); assert.equal(p.part('pl-repeat').hidden, false);
  const q = page({ spotify: {} });
  q.bar.update(spotifySnap(10)); await flush(); q.bar.update(spotifySnap(10.5));
  q.refuse('Spotify does not allow that button right now.');
  q.part('pl-repeat').fire('click'); await flush();
  assert.deepEqual(q.calls.at(-1), ['note', 'Spotify does not allow that button right now.']);
  assert.equal(q.part('pl-repeat').dataset.state, 'off', 'back as Spotify has it');
});

test("the library's queue: its own shuffle and repeat (album, all, one), and none for a file on its own", () => {
  const queue = { shuffle: false, repeat: 'album' };
  const p = page({ queue });
  p.bar.update(fileSnap(1));
  const sh = p.part('pl-shuffle'), rp = p.part('pl-repeat');
  assert.equal(sh.hidden, false); assert.equal(rp.dataset.state, 'off');
  sh.fire('click'); assert.deepEqual(p.calls.at(-1), ['shuffle', true]); assert.equal(sh.dataset.state, 'on');
  rp.fire('click'); assert.deepEqual(p.calls.at(-1), ['repeat', 'all']);
  rp.fire('click'); assert.deepEqual(p.calls.at(-1), ['repeat', 'one']); assert.equal(rp.dataset.state, 'one');
  rp.fire('click'); assert.deepEqual(p.calls.at(-1), ['repeat', 'album']);
  const alone = page();
  alone.bar.update(fileSnap(1));
  assert.equal(alone.part('pl-shuffle').hidden, true); assert.equal(alone.part('pl-repeat').hidden, true);
});

test('app.js hands the bar the queue\'s shuffle and repeat only while a queue plays; the CSS marks a mode that is on', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8');
  assert.match(app, /get shuffle\(\) \{ return liveQueue\(\) \? \(\) => state\.queueShuffle : undefined; \}/);
  assert.match(app, /get repeat\(\) \{ return liveQueue\(\) \? \(\) => state\.queueRepeat : undefined; \}/);
  assert.match(css, /#player \.pl-mode\.on \{ color: var\(--accent\); border-color: var\(--accent\); \}/);
});
