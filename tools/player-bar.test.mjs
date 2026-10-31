// The player bar (renderer/player.js, #player in the page, its settings in the help and Ctrl+K): which buttons each source
// shows and that none of them is ever dead, the progress bar and seeking, the status line, what the settings default to and
// how an older profile loads, and that app.js, the page, the CSS, main.js and preload.js are wired as the bar needs. The bar
// runs here on a stand-in page with a fake audio element, a fake bridge to the main process and a fake clock: nothing in this
// file reaches a player, a key or a screen. (The commands themselves: tools/player-control.test.mjs.)
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHIPS, chipOf, readPlayerBar, readPlayerRec, macPlayerOf, controlsFor, fmtTime, songLine, placeOf, statusText, seekTime, createPlayerBar } from '../renderer/player.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const app = read('renderer/app.js'), html = read('renderer/index.html'), css = read('renderer/style.css'), news = read('renderer/news.js');
const main = read('main.js'), preload = read('preload.js'), plist = read('build/Info.plist');

// ---------------------------------------------------------------- what each source gets

test('the chip says system, file, mic, tab, demo or radio, and idle with no source', () => {
  assert.deepEqual(CHIPS, { system: 'system', file: 'file', input: 'mic', tab: 'tab', demo: 'demo', radio: 'radio' });
  assert.equal(chipOf('input'), 'mic');
  for (const none of [null, undefined, '', 'nonsense']) assert.equal(chipOf(none), 'idle');
});

test('the Mac\'s players are Music and Spotify by the name the helper gives; nothing else is one', () => {
  assert.equal(macPlayerOf('Music'), 'music');
  assert.equal(macPlayerOf(' music '), 'music');
  assert.equal(macPlayerOf('Spotify'), 'spotify');
  assert.equal(macPlayerOf('SPOTIFY'), 'spotify');
  for (const other of ['Google Chrome', 'Safari', 'Apple Music', 'Musik', 'VLC', '', null, undefined]) assert.equal(macPlayerOf(other), null, String(other));
});

const ALL = ['prev', 'play', 'next'];
const NONE = { buttons: [], player: null, progress: null, seek: false };
const sys = (over) => ({ source: 'system', platform: 'darwin', bridge: true, session: true, ...over });

test('which buttons each source shows, and whether it has a progress bar that seeks', () => {
  const rows = [
    // no source
    [{ source: null }, NONE],
    [{ source: null, stopped: 'radio' }, { ...NONE, buttons: ['play'] }],
    [{ source: null, stopped: 'demo' }, { ...NONE, buttons: ['play'] }],
    [{ source: null, stopped: 'file' }, NONE],
    [{ source: null, stopped: 'system' }, NONE],
    // the file: restart, play and pause, seek; no next without a queue
    [{ source: 'file' }, { buttons: ['prev', 'play'], player: null, progress: 'file', seek: true }],
    [{ source: 'file', queue: true }, { buttons: ALL, player: null, progress: 'file', seek: true }],
    // the radio and the demo: play and stop
    [{ source: 'radio' }, { ...NONE, buttons: ['play'] }],
    [{ source: 'radio', queue: true }, { ...NONE, buttons: ['play'] }],
    [{ source: 'demo' }, { ...NONE, buttons: ['play'] }],
    // a mic and a tab: none
    [{ source: 'input' }, NONE],
    [{ source: 'tab' }, NONE],
    [{ source: 'input', platform: 'darwin', bridge: true, app: 'Music' }, NONE],
    // the system on a Mac: Music and Spotify, with where they are; any other player, none
    [sys({ app: 'Music' }), { buttons: ALL, player: 'music', progress: 'player', seek: false }],
    [sys({ app: 'Spotify' }), { buttons: ALL, player: 'spotify', progress: 'player', seek: false }],
    [sys({ app: 'Google Chrome' }), NONE],
    [sys({ app: 'Safari' }), NONE],
    [sys({ app: '' }), NONE],
    [sys({ app: 'Music', session: false }), { buttons: ALL, player: 'music', progress: 'player', seek: false }],
    [sys({ app: 'Music', bridge: false }), NONE],
    [sys({ app: 'Music', denied: true }), NONE],
    // the system on Windows: the media keys when a song is reported, and no progress bar (the helper gives no position)
    [sys({ platform: 'win32', app: 'Spotify' }), { buttons: ALL, player: 'keys', progress: null, seek: false }],
    [sys({ platform: 'win32', app: 'Chrome' }), { buttons: ALL, player: 'keys', progress: null, seek: false }],
    [sys({ platform: 'win32', app: 'Music' }), { buttons: ALL, player: 'keys', progress: null, seek: false }],
    [sys({ platform: 'win32', session: false }), NONE],
    [sys({ platform: 'win32', bridge: false }), NONE],
    [sys({ platform: 'win32', denied: true }), NONE],
    // the web, and anything else: no way to reach a player
    [sys({ platform: 'web', app: 'Music', bridge: false }), NONE],
    [sys({ platform: 'web', app: 'Music' }), NONE],
    [sys({ platform: 'linux', app: 'Spotify' }), NONE],
  ];
  for (const [input, want] of rows) assert.deepEqual(controlsFor(input), want, JSON.stringify(input));
});

test('a time reads 3:05, or 1:02:03 from an hour, and -:-- where it is not known', () => {
  for (const [s, text] of [[0, '0:00'], [5, '0:05'], [65.9, '1:05'], [599, '9:59'], [600, '10:00'], [3599.9, '59:59'], [3600, '1:00:00'], [3725, '1:02:05'], [36000, '10:00:00']]) assert.equal(fmtTime(s), text, String(s));
  for (const unknown of [NaN, Infinity, -1, undefined, null, 'x']) assert.equal(fmtTime(unknown), '-:--', String(unknown));
});

test('the song on the left: title and artist, no "File" for a file, and what is said with no song', () => {
  assert.deepEqual(songLine({ title: 'Nanana', artist: 'Peggy Gou' }, 'system', 'system audio'), { title: 'Nanana', artist: 'Peggy Gou', idle: '' });
  assert.deepEqual(songLine({ title: 'my take', artist: 'File' }, 'file', 'my take.wav'), { title: 'my take', artist: '', idle: '' });
  assert.equal(songLine({ title: 'x', artist: 'Someone' }, 'file', 'x.mp3').artist, 'Someone', 'a name you gave it stays');
  assert.deepEqual(songLine({ title: 'demo_beat', artist: 'Toaster' }, 'demo', 'demo beat'), { title: 'demo_beat', artist: 'Toaster', idle: '' });
  assert.deepEqual(songLine({ title: 'Only a title', artist: '' }, 'radio', 'x'), { title: 'Only a title', artist: '', idle: '' });
  assert.equal(songLine(null, 'system', 'system audio').idle, 'listening');
  assert.equal(songLine(null, 'input', 'MacBook Pro Microphone').idle, 'MacBook Pro Microphone');
  assert.equal(songLine(null, 'radio', 'ice1.example.org/groove').idle, 'ice1.example.org/groove');
  assert.equal(songLine(null, null, '', 'radio').idle, 'stopped');
  assert.equal(songLine(null, null, '').idle, '');
});

test('the bar and beat: 1-based, counted as the beat comes round, and none until the beat is known', () => {
  assert.deepEqual(placeOf({ bar: 12, step: 5, off: 0 }), { bar: 13, beat: 2 }, 'bar 013.2');
  assert.deepEqual(placeOf({ bar: 0, step: 0, off: 0 }), { bar: 1, beat: 1 });
  assert.deepEqual(placeOf({ bar: 0, step: 15, off: 0 }), { bar: 1, beat: 4 });
  assert.deepEqual(placeOf({ bar: 4, step: 3 }), { bar: 5, beat: 1 }, 'no off: a step on the grid');
  // placeAt rounds to the nearest 16th: 3.6 steps in is "step 4, a bit early", but the second beat hasn't come (it's at 4)
  assert.deepEqual(placeOf({ bar: 0, step: 4, off: -0.4 }), { bar: 1, beat: 1 });
  assert.deepEqual(placeOf({ bar: 0, step: 4, off: 0 }), { bar: 1, beat: 2 });
  assert.deepEqual(placeOf({ bar: 1, step: 15, off: 0.45 }), { bar: 2, beat: 4 }, 'nearly the next bar, not in it');
  assert.deepEqual(placeOf({ bar: 1, step: 0, off: -0.1 }), { bar: 1, beat: 4 }, 'just before the bar line: still the bar before');
  assert.equal(placeOf({ bar: -1, step: 3, off: 0 }), null, 'before the first bar');
  for (const none of [null, undefined, {}, { bar: NaN, step: 0 }, { bar: 1, step: undefined }]) assert.equal(placeOf(none), null);
});

test('the status line reads bpm · key · bar.beat · source, and dashes until the tempo has locked', () => {
  const at = { bar: 12, step: 5, off: 0 };
  assert.equal(statusText({ locked: true, bpm: 124, key: 'F# minor', at, source: 'system' }), '124 bpm · F# minor · bar 013.2 · system');
  assert.equal(statusText({ locked: false, bpm: 124, key: 'F# minor', at, source: 'system' }), '--- bpm · --- · bar ---.- · system', 'the engine can know a key before it locks; the bar waits for the lock');
  assert.equal(statusText({ source: 'no source' }), '--- bpm · --- · bar ---.- · no source');
  assert.equal(statusText({ locked: true, bpm: 98, key: '', at: { bar: 0, step: 0 }, source: 'mic' }), '98 bpm · --- · bar 001.1 · mic');
  assert.equal(statusText({ locked: true, bpm: 98, key: 'C major', at: null, source: 'file' }), '98 bpm · C major · bar ---.- · file');
  assert.equal(statusText({ locked: true, bpm: 0, key: 'C major', at, source: 'file' }), '--- bpm · C major · bar 013.2 · file');
  assert.equal(statusText({ locked: true, bpm: 140, key: 'Eb minor', at: { bar: 999, step: 12 }, source: 'demo' }), '140 bpm · Eb minor · bar 1000.4 · demo');
});

test('a click or a drag lands on the track in proportion, and never off its ends', () => {
  const rect = { left: 100, width: 200 };
  assert.equal(seekTime(100, rect, 240), 0);
  assert.equal(seekTime(200, rect, 240), 120);
  assert.equal(seekTime(300, rect, 240), 240);
  assert.equal(seekTime(40, rect, 240), 0);
  assert.equal(seekTime(900, rect, 240), 240);
  assert.equal(seekTime(150, { left: 100, width: 0 }, 240), 240, 'a track with no width: the end, not NaN');
});

// ---------------------------------------------------------------- the settings

test('the bar is on and out of recordings unless saved otherwise; an older profile, which saved neither, loads that way', () => {
  assert.equal(readPlayerBar(undefined), true, 'an older profile has none');
  assert.equal(readPlayerBar(true), true);
  assert.equal(readPlayerBar(false), false);
  for (const junk of [null, 0, 1, '', 'false', 'no', {}, []]) assert.equal(readPlayerBar(junk), true, `${JSON.stringify(junk)} is not a no`);
  assert.equal(readPlayerRec(undefined), false, 'an older profile has none');
  assert.equal(readPlayerRec(false), false);
  assert.equal(readPlayerRec(true), true);
  for (const junk of [null, 0, 1, '', 'true', 'yes', {}, []]) assert.equal(readPlayerRec(junk), false, `${JSON.stringify(junk)} is not a yes`);
  // the defaults in app.js, saved with the other settings and read back through those two: an older profile and junk
  assert.match(app, /^  playerBar: true,/m);
  assert.match(app, /^  playerRec: false,/m);
  const saved = app.match(/const SAVED = \[([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.ok(saved.includes('playerBar') && saved.includes('playerRec'));
  assert.ok(!saved.includes('stopped'), 'which source was stopped is not kept between launches');
  const load = (profile) => {
    const state = { playerBar: true, playerRec: false };
    for (const k of saved) if (k in profile) state[k] = profile[k];
    state.playerBar = readPlayerBar(state.playerBar);
    state.playerRec = readPlayerRec(state.playerRec);
    return [state.playerBar, state.playerRec];
  };
  assert.deepEqual(load({}), [true, false], 'an older profile');
  assert.deepEqual(load({ theme: 2, mirror: false, calm: true }), [true, false], 'an older profile with other settings');
  assert.deepEqual(load({ playerBar: false, playerRec: true }), [false, true], 'as saved');
  assert.deepEqual(load({ playerBar: 'off', playerRec: 'on' }), [true, false], 'junk');
  assert.match(app, /state\.playerBar = readPlayerBar\(state\.playerBar\);/);
  assert.match(app, /state\.playerRec = readPlayerRec\(state\.playerRec\);/);
  assert.match(app, /import \{ createPlayerBar, readPlayerBar, readPlayerRec \} from '\.\/player\.js';/);
  assert.match(app, /setMirror\(state\.mirror\);\r?\nsetPlayerBar\(state\.playerBar\);\r?\nsetPlayerRec\(state\.playerRec\);/);
  assert.match(app, /function setPlayerBar\(on\) \{\s*state\.playerBar = on;\s*document\.body\.classList\.toggle\('player-bar', on\);\s*\$\('playerbar'\)\.checked = on;\s*saveSettings\(\);\s*\}/);
  assert.match(app, /function setPlayerRec\(on\) \{\s*state\.playerRec = on;\s*document\.body\.classList\.toggle\('player-rec', on\);\s*\$\('playerrec'\)\.checked = on;\s*saveSettings\(\);\s*\}/);
});

test('the help has both checkboxes next to Calm, Updates and the mirror, and Ctrl+K sets each both ways', () => {
  const mirror = html.indexOf('id="mirror"'), bar = html.indexOf('id="playerbar"'), rec = html.indexOf('id="playerrec"');
  assert.ok(mirror > 0 && bar > mirror && rec > bar, 'in the help\'s settings, after the camera mirror');
  assert.ok(rec - mirror < 1500, 'right beside them');
  assert.match(html, /<label class="calm"><input type="checkbox" id="playerbar" \/><span><b>Player bar<\/b>: [^<]*<kbd data-k="hide">H<\/kbd>[^<]*<kbd data-k="code">Z<\/kbd>[^<]*<\/span><\/label>/);
  assert.match(html, /<label class="calm"><input type="checkbox" id="playerrec" \/><span><b>Player bar in recordings<\/b>: [^<]*<\/span><\/label>/);
  assert.match(app, /\$\('playerbar'\)\.addEventListener\('change', \(e\) => setPlayerBar\(e\.target\.checked\)\);/);
  assert.match(app, /\$\('playerrec'\)\.addEventListener\('change', \(e\) => setPlayerRec\(e\.target\.checked\)\);/);
  // Ctrl+K: "player bar: shown" and "hidden", "in recordings" and "not in recordings", each running its setter
  assert.match(app, /\[\['shown', true, \[[^\]]*\]\], \['hidden', false, \[[^\]]*\]\]\]\.map\(\(\[name, on, aliases\]\) => \(\{\s*id: 'player:' \+ name, name: 'player bar: ' \+ name, aliases,\s*run: \(\) => \{ setPlayerBar\(on\); flashStatus\('player bar: ' \+ name\); \},/);
  assert.match(app, /\[\['in recordings', true, \[[^\]]*\]\], \['not in recordings', false, \[[^\]]*\]\]\]\.map\(\(\[name, on, aliases\]\) => \(\{\s*id: 'player-rec:' \+ name, name: 'player bar: ' \+ name, aliases,\s*run: \(\) => \{ setPlayerRec\(on\); flashStatus\('player bar: ' \+ name\); \},/);
});

test('the next version\'s news says so, in one line', () => {
  const head = news.slice(news.indexOf('export const NEWS = ['), news.indexOf("version: '0.4.27'"));
  assert.match(head, /version: '0\.4\.28'/);
  assert.match(head, /key: 'player bar', text: "[^"]*player|key: 'player bar', text: "a slim bar along the bottom/);
  assert.equal([...head.matchAll(/slim bar along the bottom/g)].length, 1, 'one line'); // (other features can share the version)
});

// ---------------------------------------------------------------- the bar, on a stand-in page

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = {}; this.className = ''; this.hidden = false; this.writes = 0; this._text = ''; this.on = new Set(); this.innerHTML = ''; this.title = ''; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v; this.writes++; }
  append(...kids) { this.children.push(...kids); }
  setAttribute(k, v) { this.attrs[k] = v; this.attrWrites = (this.attrWrites || 0) + 1; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  get classList() { const el = this; return { toggle: (c, f) => (f ? el.on.add(c) : el.on.delete(c)), contains: (c) => el.on.has(c) }; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, preventDefault() { this.prevented = true; }, ...ev }); }
  getBoundingClientRect() { return this.rect || { left: 0, width: 0 }; }
  setPointerCapture(id) { this.captured = id; }
  blur() { this.blurs = (this.blurs || 0) + 1; }
  find(cls, out = []) { if (this.className.split(' ').includes(cls)) out.push(this); for (const k of this.children) k.find(cls, out); return out; }
}
const flush = () => new Promise((r) => setTimeout(r, 0));

// a bar on a page: its parts by class, a fake audio element, what the app was asked to do, and what the bridge was asked
function page({ platform = 'darwin', bridge = true, next = false, reply = {} } = {}) {
  const root = new El('div'), doc = { createElement: (t) => new El(t), body: new El('body') };
  const calls = [], asked = [];
  const nc = bridge ? {
    platform,
    playerCommand: async (who, action) => { asked.push(['command', who, action]); return reply.command ?? { ok: true }; },
    playerPosition: async (who) => { asked.push(['position', who]); return typeof reply.position === 'function' ? reply.position(who) : reply.position ?? { ok: true, position: 61, duration: 215, playing: true }; },
  } : null;
  const act = { restart: () => calls.push('restart'), seek: (to) => calls.push(['seek', to]), stop: () => calls.push('stop'), start: (kind) => calls.push(['start', kind]), fail: (e) => calls.push(['fail', e.message]), note: (t) => calls.push(['note', t]) };
  if (next) act.next = () => calls.push('next');
  const win = { innerHeight: 700, getComputedStyle: () => ({ getPropertyValue: () => ' 38px' }) };
  root.rect = { top: 630, left: 0, width: 1000 }; // (the bar's top: the window's 700, less the footer's 32 and the bar's own 38)
  const bar = createPlayerBar({ document: doc, root, nc, platform: nc ? platform : 'web', act, window: win });
  const part = (cls) => root.find(cls)[0];
  const buttons = () => ['prev', 'play', 'next'].filter((k) => !part(`pl-${k}`).hidden);
  return { root, bar, calls, asked, part, buttons, nc, text: (cls) => part(cls).textContent };
}
const audio = (over = {}) => ({ paused: false, currentTime: 42, duration: 195, plays: 0, pauses: 0, play() { this.paused = false; this.plays++; return Promise.resolve(); }, pause() { this.paused = true; this.pauses++; }, ...over });
const snap = (o = {}) => ({ t: 0, active: true, source: null, stopped: null, label: '', song: null, app: '', session: false, systemPlaying: false, el: null, tempo: { locked: false, shown: 0 }, key: '', at: null, ...o });

test('a file: restart, play and pause, a progress bar with times that seeks, and no next without a queue', () => {
  const p = page();
  const el = audio();
  p.bar.update(snap({ source: 'file', label: 'my take.wav', song: { title: 'my take', artist: 'File' }, el, t: 5 }));
  assert.equal(p.text('pl-chip'), 'file');
  assert.equal(p.text('pl-title'), 'my take');
  assert.equal(p.text('pl-artist'), '', 'no "· File"');
  assert.deepEqual(p.buttons(), ['prev', 'play']);
  assert.equal(p.part('pl-play').dataset.state, 'pause', 'it is playing, so the button pauses it');
  assert.equal(p.part('pl-prev').attrs['aria-label'], 'restart');
  assert.equal(p.part('pl-progress').hidden, false);
  assert.equal(p.text('pl-pos'), '0:42');
  assert.equal(p.text('pl-len'), '3:15');
  assert.equal(p.part('pl-fill').style.width, `${((42 / 195) * 100).toFixed(2)}%`);
  assert.equal(p.part('pl-track').on.has('seek'), true);
  assert.equal(p.part('pl-track').attrs['aria-valuetext'], '0:42 of 3:15');
  // play and pause are the element's own
  p.part('pl-play').fire('click');
  assert.equal(el.paused, true);
  p.bar.update(snap({ source: 'file', song: { title: 'my take', artist: 'File' }, el, t: 6 }));
  assert.equal(p.part('pl-play').dataset.state, 'play');
  assert.equal(p.part('pl-play').attrs['aria-label'], 'play');
  p.part('pl-play').fire('click');
  assert.equal(el.paused, false);
  assert.equal(el.plays, 1);
  // prev restarts it, through the app (which starts the page over from the top)
  p.part('pl-prev').fire('click');
  assert.deepEqual(p.calls, ['restart']);
  // next is not there, and a click on it does nothing
  p.part('pl-next').fire('click');
  assert.deepEqual(p.calls, ['restart']);
  assert.deepEqual(p.asked, []);
});

test('a file that cannot play says so through the app, not by throwing', async () => {
  const p = page();
  const el = audio({ paused: true, play() { return Promise.reject(new Error('NotAllowedError')); } });
  p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' } }));
  p.part('pl-play').fire('click');
  await flush();
  assert.deepEqual(p.calls, [['fail', 'NotAllowedError']]);
});

test('a file is seeked by a click or a drag on the track (shown as it goes, done when it is let go), and by the arrow keys', () => {
  const p = page();
  const el = audio({ currentTime: 20, duration: 200 });
  const track = p.part('pl-track');
  track.rect = { left: 100, width: 400 };
  p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' } }));
  // a click: down and up in the same place
  track.fire('pointerdown', { clientX: 300, pointerId: 7 });
  assert.equal(track.captured, 7, 'the drag is kept if the pointer leaves the track');
  assert.equal(p.text('pl-pos'), '1:40');
  assert.equal(p.part('pl-fill').style.width, '50.00%');
  assert.deepEqual(p.calls, [], 'nothing is done till it is let go');
  track.fire('pointerup', { clientX: 300 });
  assert.deepEqual(p.calls, [['seek', 100]]);
  // a drag: the time follows the pointer, and the seek is where it ended
  p.calls.length = 0;
  track.fire('pointerdown', { clientX: 120 });
  track.fire('pointermove', { clientX: 250 });
  assert.equal(p.text('pl-pos'), '1:15');
  track.fire('pointermove', { clientX: 9999 });
  assert.equal(p.text('pl-pos'), '3:20', 'not past the end');
  p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' }, t: 1 }));
  assert.equal(p.text('pl-pos'), '3:20', 'the element\'s own position does not pull it back mid-drag');
  track.fire('pointerup', { clientX: 400 });
  assert.deepEqual(p.calls, [['seek', 150]]);
  p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' }, t: 2 }));
  assert.equal(p.text('pl-pos'), '0:20', 'let go: back to the element\'s own position');
  // a drag that is cancelled seeks nowhere
  p.calls.length = 0;
  track.fire('pointerdown', { clientX: 400 });
  track.fire('pointercancel');
  track.fire('pointerup', { clientX: 400 });
  assert.deepEqual(p.calls, []);
  // the arrow keys, 5 seconds at a time, and not past either end
  track.fire('keydown', { key: 'ArrowRight' });
  assert.deepEqual(p.calls, [['seek', 25]]);
  p.calls.length = 0;
  track.fire('keydown', { key: 'ArrowLeft' });
  assert.deepEqual(p.calls, [['seek', 15]]);
  el.currentTime = 2; p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' }, t: 3 }));
  p.calls.length = 0;
  track.fire('keydown', { key: 'ArrowLeft' });
  assert.deepEqual(p.calls, [['seek', 0]]);
  el.currentTime = 198; p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' }, t: 4 }));
  p.calls.length = 0;
  track.fire('keydown', { key: 'ArrowRight' });
  assert.deepEqual(p.calls, [['seek', 200]]);
  p.calls.length = 0;
  for (const key of ['ArrowUp', 'Enter', ' ', 'a']) track.fire('keydown', { key });
  assert.deepEqual(p.calls, []);
});

test('a file whose length is not known yet has no progress bar, and nothing to seek', () => {
  const p = page();
  const track = p.part('pl-track');
  track.rect = { left: 0, width: 100 };
  for (const duration of [NaN, Infinity, 0]) {
    p.bar.update(snap({ source: 'file', el: audio({ duration }), song: { title: 'x', artist: 'File' } }));
    assert.equal(p.part('pl-progress').hidden, true, String(duration));
    track.fire('pointerdown', { clientX: 50 });
    track.fire('pointerup', { clientX: 50 });
    track.fire('keydown', { key: 'ArrowRight' });
  }
  assert.deepEqual(p.calls, []);
});

test('the radio and the demo: play and stop only, no progress; stopped, the chip stays and play brings it back', () => {
  for (const [source, kind] of [['radio', 'radio'], ['demo', 'demo']]) {
    const p = page();
    p.bar.update(snap({ source, label: 'x', song: source === 'demo' ? { title: 'demo_beat', artist: 'Toaster' } : { title: 'Song', artist: 'Band' } }));
    assert.equal(p.text('pl-chip'), kind);
    assert.deepEqual(p.buttons(), ['play']);
    assert.equal(p.part('pl-play').dataset.state, 'stop');
    assert.equal(p.part('pl-play').attrs['aria-label'], 'stop');
    assert.equal(p.part('pl-progress').hidden, true);
    p.part('pl-play').fire('click');
    assert.deepEqual(p.calls, ['stop']);
    // what the app does next: the source goes, and which it was is kept
    p.calls.length = 0;
    p.bar.update(snap({ source: null, stopped: source, label: '' }));
    assert.equal(p.text('pl-chip'), kind, 'still the same chip');
    assert.equal(p.part('pl-chip').on.has('off'), true, 'but dim');
    assert.equal(p.text('pl-idle'), 'stopped');
    assert.deepEqual(p.buttons(), ['play']);
    assert.equal(p.part('pl-play').dataset.state, 'play');
    assert.equal(p.text('pl-status'), `--- bpm · --- · bar ---.- · stopped`);
    p.part('pl-play').fire('click');
    assert.deepEqual(p.calls, [['start', source]]);
  }
});

test('a mic and a tab have no buttons and no progress bar at all, and ask nothing of anyone', () => {
  for (const source of ['input', 'tab']) {
    const p = page({ platform: 'darwin' });
    p.bar.update(snap({ source, label: 'MacBook Pro Microphone', app: 'Music', session: true }));
    assert.deepEqual(p.buttons(), []);
    assert.equal(p.part('pl-transport').hidden, true);
    assert.equal(p.part('pl-progress').hidden, true);
    assert.equal(p.text('pl-idle'), 'MacBook Pro Microphone');
    for (const k of ['prev', 'play', 'next']) p.part(`pl-${k}`).fire('click');
    assert.deepEqual([p.calls, p.asked], [[], []]);
  }
});

test('the system on a Mac with Music: its buttons go to Music (never anything else), with where it is', async () => {
  const p = page({ platform: 'darwin' });
  const s = (t, over = {}) => snap({ t, source: 'system', label: 'system audio', song: { title: 'Nanana', artist: 'Peggy Gou', app: 'Music' }, app: 'Music', session: true, ...over });
  p.bar.update(s(10));
  assert.deepEqual(p.asked, [['position', 'music']], 'asks where it is, at once');
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next']);
  assert.equal(p.part('pl-progress').hidden, true, 'till it answers');
  await flush();
  p.bar.update(s(10.5));
  assert.equal(p.text('pl-pos'), '1:01');
  assert.equal(p.text('pl-len'), '3:35');
  assert.equal(p.part('pl-track').on.has('seek'), false, 'it is shown, not moved: only a file seeks');
  assert.equal(p.part('pl-play').dataset.state, 'pause');
  // between asks it counts on by itself; asked again two seconds after the last
  p.bar.update(s(11.9));
  assert.equal(p.asked.length, 1);
  assert.equal(p.text('pl-pos'), '1:02', 'a second and nine tenths on from 1:01');
  p.bar.update(s(12));
  assert.equal(p.asked.length, 2, 'asked again at 2 s');
  await flush();
  // the buttons: previous, play and pause, next, each as one command to Music
  p.part('pl-prev').fire('click'); p.part('pl-play').fire('click'); p.part('pl-next').fire('click');
  await flush();
  assert.deepEqual(p.asked.filter((a) => a[0] === 'command'), [['command', 'music', 'previous'], ['command', 'music', 'playpause'], ['command', 'music', 'next']]);
  assert.deepEqual(p.calls, []);
});

test('Spotify is asked as Spotify, and a new song starts its position over', async () => {
  const p = page({ platform: 'darwin', reply: { position: (who) => ({ ok: true, position: who === 'spotify' ? 30 : 0, duration: 200, playing: true }) } });
  const s = (t, title) => snap({ t, source: 'system', song: { title, artist: 'A', app: 'Spotify' }, app: 'Spotify', session: true });
  p.bar.update(s(0, 'One'));
  await flush();
  p.bar.update(s(0.1, 'One'));
  assert.equal(p.text('pl-pos'), '0:30');
  p.part('pl-next').fire('click');
  await flush();
  assert.deepEqual(p.asked.filter((a) => a[1] !== 'music').map((a) => a.join(' ')), ['position spotify', 'command spotify next']);
  p.bar.update(s(1, 'Two'));
  assert.equal(p.part('pl-progress').hidden, true, 'the old song\'s position is not kept for the new one');
  assert.equal(p.asked.at(-1).join(' '), 'position spotify', 'and it is asked for again at once');
  await flush();
  p.bar.update(s(1.1, 'Two'));
  assert.equal(p.part('pl-progress').hidden, false);
});

test('a paused player is not counted on; one that is playing is', async () => {
  const p = page({ platform: 'darwin', reply: { position: { ok: true, position: 100, duration: 300, playing: false } } });
  const s = (t) => snap({ t, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true });
  p.bar.update(s(0));
  await flush();
  p.bar.update(s(1.5));
  assert.equal(p.text('pl-pos'), '1:40', 'paused: still there');
  assert.equal(p.part('pl-play').dataset.state, 'play');
});

test('a play pressed on Music shows at once, and gives way to Music\'s own answer after two seconds', async () => {
  const p = page({ platform: 'darwin', reply: { position: { ok: true, position: 10, duration: 300, playing: true } } });
  const s = (t) => snap({ t, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true });
  p.bar.update(s(0));
  await flush();
  p.bar.update(s(0.5));
  assert.equal(p.part('pl-play').dataset.state, 'pause');
  p.part('pl-play').fire('click');
  await flush();
  p.bar.update(s(0.6));
  assert.equal(p.part('pl-play').dataset.state, 'play', 'pressed: shows paused now');
  p.bar.update(s(2.7));
  await flush();
  p.bar.update(s(2.8));
  assert.equal(p.part('pl-play').dataset.state, 'pause', 'Music still says playing: that wins');
});

test('another player on a Mac (a browser) gets no buttons and no progress bar, and is never asked or spoken to', async () => {
  for (const app of ['Google Chrome', 'Safari', 'Firefox', '']) {
    const p = page({ platform: 'darwin' });
    p.bar.update(snap({ t: 0, source: 'system', song: { title: 'A video', artist: '' }, app, session: true }));
    p.bar.update(snap({ t: 5, source: 'system', song: { title: 'A video', artist: '' }, app, session: true }));
    await flush();
    assert.deepEqual(p.buttons(), [], app);
    assert.equal(p.part('pl-transport').hidden, true);
    assert.equal(p.part('pl-progress').hidden, true);
    assert.equal(p.text('pl-title'), 'A video');
    for (const k of ['prev', 'play', 'next']) p.part(`pl-${k}`).fire('click');
    assert.deepEqual([p.asked, p.calls], [[], []]);
  }
});

test('while the bar is away (H, a recording) Music is not asked where it is; back, it is asked at once', async () => {
  const p = page({ platform: 'darwin' });
  const s = (t, active) => snap({ t, active, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true });
  p.bar.update(s(0, false)); p.bar.update(s(5, false)); p.bar.update(s(30, false));
  assert.deepEqual(p.asked, []);
  p.bar.update(s(31, true));
  assert.deepEqual(p.asked, [['position', 'music']]);
});

test('macOS saying no: the buttons go with a note (once), it is asked again only once a minute, and an answer brings them back', async () => {
  let answer = { ok: false, why: 'denied' };
  const p = page({ platform: 'darwin', reply: { position: () => answer } });
  const s = (t) => snap({ t, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true });
  p.bar.update(s(0));
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next'], 'until it has said so');
  await flush();
  p.bar.update(s(0.2));
  assert.deepEqual(p.buttons(), [], 'no buttons that do nothing');
  assert.equal(p.part('pl-progress').hidden, true);
  assert.equal(p.calls.length, 1);
  assert.match(p.calls[0][1], /Automation/);
  assert.match(p.calls[0][1], /Music/);
  for (const t of [3, 10, 59]) { p.bar.update(s(t)); await flush(); }
  assert.equal(p.asked.length, 1, 'not asked again within the minute');
  p.bar.update(s(60.3)); await flush();
  assert.equal(p.asked.length, 2);
  assert.equal(p.calls.length, 1, 'and not told again');
  // allowed in System Settings since: the next answer brings them back
  answer = { ok: true, position: 5, duration: 100, playing: true };
  p.bar.update(s(121)); await flush();
  p.bar.update(s(121.1));
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next']);
  assert.equal(p.text('pl-pos'), '0:05');
});

test('a button pressed when macOS refuses it says so once; any other trouble says the player did not answer', async () => {
  const p = page({ platform: 'darwin', reply: { command: { ok: false, why: 'denied' } } });
  const s = (t) => snap({ t, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Spotify', session: true });
  p.bar.update(s(0)); await flush();
  p.part('pl-next').fire('click'); await flush();
  assert.equal(p.calls.length, 1);
  assert.match(p.calls[0][1], /Automation/);
  p.bar.update(s(1));
  assert.deepEqual(p.buttons(), []);
  const q = page({ platform: 'darwin', reply: { command: { ok: false, why: 'failed' } } });
  q.bar.update(snap({ t: 0, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true })); await flush();
  q.part('pl-play').fire('click'); await flush();
  assert.deepEqual(q.calls, [['note', 'Music did not answer.']]);
  q.bar.update(snap({ t: 0.1, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true, systemPlaying: true }));
  assert.equal(q.part('pl-play').dataset.state, 'pause', 'a command that failed is not shown as done');
});

test('an answer that comes after the player has changed is not taken for the new one\'s', async () => {
  let release;
  const p = page({ platform: 'darwin', reply: { position: () => new Promise((r) => { release = r; }) } });
  const music = (t) => snap({ t, source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true });
  p.bar.update(music(0));
  p.bar.update(snap({ t: 0.5, source: 'system', song: { title: 'z', artist: 'y' }, app: 'Chrome', session: true }));
  release({ ok: true, position: 50, duration: 100, playing: true });
  await flush();
  p.bar.update(snap({ t: 0.6, source: 'system', song: { title: 'z', artist: 'y' }, app: 'Chrome', session: true }));
  assert.equal(p.part('pl-progress').hidden, true);
});

test('the system on Windows: the media keys when a song is reported, never a position, and nothing when none is', async () => {
  const p = page({ platform: 'win32' });
  const s = (t, over = {}) => snap({ t, source: 'system', song: { title: 'Nanana', artist: 'Peggy Gou', app: 'Spotify' }, app: 'Spotify', session: true, systemPlaying: true, ...over });
  p.bar.update(s(0));
  p.bar.update(s(10));
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next']);
  assert.equal(p.part('pl-progress').hidden, true, 'the helper gives no position');
  assert.equal(p.part('pl-play').dataset.state, 'pause');
  p.part('pl-prev').fire('click'); p.part('pl-play').fire('click'); p.part('pl-next').fire('click');
  await flush();
  assert.deepEqual(p.asked, [['command', 'keys', 'previous'], ['command', 'keys', 'playpause'], ['command', 'keys', 'next']]);
  const none = page({ platform: 'win32' });
  none.bar.update(s(0, { song: null, session: false, app: '' }));
  assert.deepEqual(none.buttons(), []);
  const bad = page({ platform: 'win32', reply: { command: { ok: false, why: 'failed' } } });
  bad.bar.update(s(0)); bad.part('pl-next').fire('click'); await flush();
  assert.deepEqual(bad.calls, [['note', 'Windows did not take the media key.']]);
});

test('on the web there is no way to a player, so the system has no buttons; the file, radio and demo still do', () => {
  const p = page({ bridge: false });
  p.bar.update(snap({ source: 'system', song: { title: 'x', artist: 'y' }, app: 'Music', session: true }));
  assert.deepEqual(p.buttons(), []);
  p.bar.update(snap({ source: 'file', el: audio(), song: { title: 'x', artist: 'File' } }));
  assert.deepEqual(p.buttons(), ['prev', 'play']);
  p.bar.update(snap({ source: 'radio' }));
  assert.deepEqual(p.buttons(), ['play']);
});

test('the next button is there only where the app has a queue to go on to, and only for a file', () => {
  const p = page({ next: true });
  p.bar.update(snap({ source: 'file', el: audio(), song: { title: 'x', artist: 'File' } }));
  assert.deepEqual(p.buttons(), ['prev', 'play', 'next']);
  p.part('pl-next').fire('click');
  assert.deepEqual(p.calls, ['next']);
  p.bar.update(snap({ source: 'radio' }));
  assert.deepEqual(p.buttons(), ['play'], 'a queue does not give the radio a next');
  p.bar.update(snap({ source: 'input' }));
  assert.deepEqual(p.buttons(), []);
});

test('never a dead control: every button that shows does something when pressed, and one that does not show is not there', async () => {
  const sources = [null, 'file', 'radio', 'demo', 'input', 'tab', 'system'];
  const apps = ['', 'Music', 'Spotify', 'Google Chrome'];
  let shown = 0;
  for (const platform of ['darwin', 'win32', 'web', 'linux']) {
    for (const source of sources) for (const stopped of source ? [null] : [null, 'radio', 'demo', 'file']) for (const app of source === 'system' ? apps : ['']) for (const session of [true, false]) for (const next of [true, false]) {
      const p = page({ platform, bridge: platform !== 'web', next });
      const el = audio();
      p.bar.update(snap({ t: 0, source, stopped, app, session, el: source === 'file' ? el : null, song: session ? { title: 'x', artist: 'y' } : null }));
      const here = JSON.stringify({ platform, source, stopped, app, session, next });
      const want = controlsFor({ source, stopped, platform: platform === 'web' ? 'web' : platform, app, session, bridge: platform !== 'web', queue: next }).buttons;
      assert.deepEqual(p.buttons(), want, here);
      assert.equal(p.part('pl-transport').hidden, !want.length, here);
      for (const kind of ['prev', 'play', 'next']) {
        const b = p.part(`pl-${kind}`);
        const before = [JSON.stringify(p.calls), JSON.stringify(p.asked), el.plays + el.pauses].join('|');
        b.fire('click');
        await Promise.resolve();
        const after = [JSON.stringify(p.calls), JSON.stringify(p.asked), el.plays + el.pauses].join('|');
        if (b.hidden) assert.equal(after, before, `${here}: hidden ${kind} did something`);
        else { shown++; assert.notEqual(after, before, `${here}: ${kind} is shown and does nothing`); }
        assert.ok(b.attrs['aria-label'] || b.hidden, `${here}: ${kind} has no label`);
      }
    }
  }
  assert.ok(shown > 100, `${shown} buttons were checked`);
});

test('the status line is written only when it changes: once a beat, not every update', () => {
  const p = page();
  const P = 0.5; // a beat at 120 bpm
  const place = (t) => { const pos = (t / P / 4) * 16, q = Math.round(pos), bar = Math.floor(q / 16); return { bar, step: q - bar * 16, off: pos - q }; };
  const status = p.part('pl-status');
  const base = status.writes;
  const seen = new Set();
  for (let t = 0; t < 4; t += 0.125) { // the footer's rate, eight a second, for eight beats
    p.bar.update(snap({ t, source: 'demo', label: 'demo beat', song: { title: 'demo_beat', artist: 'Toaster' }, tempo: { locked: true, shown: 120 }, key: 'C minor', at: place(t) }));
    seen.add(status.textContent);
  }
  assert.deepEqual([...seen], ['120 bpm · C minor · bar 001.1 · demo', '120 bpm · C minor · bar 001.2 · demo', '120 bpm · C minor · bar 001.3 · demo', '120 bpm · C minor · bar 001.4 · demo', '120 bpm · C minor · bar 002.1 · demo', '120 bpm · C minor · bar 002.2 · demo', '120 bpm · C minor · bar 002.3 · demo', '120 bpm · C minor · bar 002.4 · demo']);
  assert.equal(status.writes - base, 8, 'eight writes in eight beats (32 updates)');
  // and the parts that do not change are not touched either
  assert.equal(p.part('pl-chip').writes, 2, 'the chip: idle at the start, then demo, and not again');
  assert.ok(p.part('pl-title').writes <= 2);
});

test('a bar with nothing new to say touches nothing in the page: no text, attribute or icon is written again', () => {
  const p = page();
  const el = audio({ currentTime: 42, duration: 195 });
  const s = (t) => snap({ t, source: 'file', label: 'x.wav', song: { title: 'x', artist: 'File' }, el, tempo: { locked: true, shown: 120 }, key: 'C minor', at: { bar: 3, step: 2, off: 0 } });
  p.bar.update(s(0));
  const all = [];
  const walk = (e) => { all.push(e); e.children.forEach(walk); };
  walk(p.root);
  const writes = () => JSON.stringify(all.map((e) => [e.writes, e.attrWrites || 0, e.innerHTML, e.hidden, e.title]));
  const before = writes();
  for (let t = 0.125; t < 1; t += 0.125) p.bar.update(s(t));
  assert.equal(writes(), before);
});

test('the status line is dashes before the tempo locks, and again when the source goes', () => {
  const p = page();
  p.bar.update(snap({ source: 'system', label: 'system audio', tempo: { locked: false, shown: 0 }, key: 'C minor', at: null }));
  assert.equal(p.text('pl-status'), '--- bpm · --- · bar ---.- · system');
  p.bar.update(snap({ source: 'system', tempo: { locked: true, shown: 128 }, key: 'F# minor', at: { bar: 12, step: 5, off: 0 } }));
  assert.equal(p.text('pl-status'), '128 bpm · F# minor · bar 013.2 · system');
  // the engine still counts on with the source stopped (nothing is feeding it), so the bar does not follow it
  p.bar.update(snap({ source: null, stopped: 'radio', tempo: { locked: true, shown: 128 }, key: 'F# minor', at: { bar: 40, step: 0, off: 0 } }));
  assert.equal(p.text('pl-status'), '--- bpm · --- · bar ---.- · stopped');
  p.bar.update(snap({ source: null, tempo: { locked: true, shown: 128 }, key: 'F# minor', at: { bar: 40, step: 0, off: 0 } }));
  assert.equal(p.text('pl-status'), '--- bpm · --- · bar ---.- · no source');
});

test('the room it takes is from the window\'s edge up to the bar\'s top (the footer\'s strip too), and none while it is away or where the page cannot say', () => {
  const p = page();
  assert.equal(p.bar.reserved(), 70, 'the footer\'s 32 and the bar\'s 38');
  p.root.rect = { top: 606 }; // (two rows: the bar is 62 high)
  assert.equal(p.bar.reserved(), 94);
  const away = createPlayerBar({ document: { createElement: (t) => new El(t), body: new El('body') }, root: Object.assign(new El('div'), { rect: { top: 630 } }), window: { innerHeight: 700, getComputedStyle: () => ({ getPropertyValue: () => '0px' }) } });
  assert.equal(away.reserved(), 0, 'H, a recording: --player-h is 0, and the roll may use the room');
  const bare = createPlayerBar({ document: { createElement: (t) => new El(t), body: new El('body') }, root: new El('div'), window: {} });
  assert.equal(bare.reserved(), 0);
});

test('a click leaves no focus on the bar, which would keep it up in Z\'s mode; a key press on a button keeps its focus', () => {
  const p = page();
  const el = audio();
  p.bar.update(snap({ source: 'file', el, song: { title: 'x', artist: 'File' } }));
  p.part('pl-play').fire('click', { detail: 1 });
  p.part('pl-prev').fire('click', { detail: 2 });
  assert.equal(p.part('pl-play').blurs, 1);
  assert.equal(p.part('pl-prev').blurs, 1);
  p.part('pl-play').fire('click', { detail: 0 }); // Enter or Space on a focused button
  assert.equal(p.part('pl-play').blurs, 1, 'not blurred: the keyboard stays where it is');
  assert.equal(el.pauses + el.plays, 2, 'and it was pressed all the same');
  // the track too: let go of a click or a drag, and cancelled
  const track = p.part('pl-track');
  track.rect = { left: 0, width: 100 };
  p.bar.update(snap({ source: 'file', el: audio({ duration: 100 }), song: { title: 'x', artist: 'File' } }));
  track.fire('pointerdown', { clientX: 10 }); track.fire('pointerup', { clientX: 10 });
  assert.equal(track.blurs, 1);
  track.fire('pointerdown', { clientX: 10 }); track.fire('pointercancel');
  assert.equal(track.blurs, 2);
  track.fire('keydown', { key: 'ArrowRight' });
  assert.equal(track.blurs, 2, 'an arrow key on a tabbed-to track keeps its focus');
});

// ---------------------------------------------------------------- the page: where it sits and when it shows

test('app.js hands the bar what is playing at the footer\'s pace, and the roll keeps clear of it', () => {
  assert.match(app, /if \(t - footerAt > 0\.125\) \{ footerAt = t; renderFooter\(\); updatePlayer\(t\); \}/);
  assert.match(app, /roll\.classList\.toggle\('cut', r\.height > 0 && r\.bottom > innerHeight - playerBar\.reserved\(\) \+ 1\);/);
  const update = app.slice(app.indexOf('function updatePlayer(t) {'), app.indexOf('function updatePlayer(t) {') + 700);
  assert.match(update, /if \(!state\.playerBar \|\| WIDGET\) return;/);
  assert.match(update, /tempo: eng\.tempo, key: eng\.key \? `\$\{NOTES\[eng\.key\.root\]\} \$\{eng\.key\.mode\}` : '', at: eng\.placeAt\(t\)/);
  assert.match(update, /el: state\.el/);
  assert.match(update, /app: state\.winSong\?\.app \|\| ''/);
  // it is on screen unless H, the mini player or a recording (without the setting) has put it away
  assert.match(app, /const playerShowing = \(\) => !document\.hidden && !document\.body\.classList\.contains\('clean'\) && !state\.mini && !\(rec\.mr && !state\.playerRec\);/);
  // a click on the bar is not a click on the water of the koi pond
  assert.match(app, /closest\('button, a, input, select, dialog, \[role="menu"\], \.panel, #menu, #bar, footer, #player, /);
});

test('the file restarts and seeks by starting the page over from there; the radio and the demo stop and play as they were picked', () => {
  const block = app.slice(app.indexOf('const playerBar = createPlayerBar({'), app.indexOf('// on screen just now'));
  assert.match(block, /restart: \(\) => \{ if \(state\.el\) \{ state\.el\.currentTime = 0; freshStart\(true\); \} \},/);
  assert.match(block, /seek: \(to\) => \{ if \(state\.el\) \{ state\.el\.currentTime = to; freshStart\(to < 1\); \} \},/);
  assert.match(block, /stop: stopSource,/);
  assert.match(block, /start: \(kind\) => \(kind === 'radio' \? useRadio\(state\.radio\) : useDemo\(\)\)\.catch\(showError\),/);
  assert.match(block, /fail: showError,/);
  assert.doesNotMatch(block, /next:/, 'no queue yet: the next button stays hidden');
  const stop = app.slice(app.indexOf('function stopSource() {'), app.indexOf('function stopSource() {') + 700);
  assert.match(stop, /if \(was !== 'radio' && was !== 'demo'\) return;/);
  assert.match(stop, /picking\+\+;/);
  assert.match(stop, /detach\(\);/);
  assert.match(stop, /state\.stopped = was;/);
  assert.match(stop, /classList\.remove\('live'\)/);
  // a new source is no longer a stopped one
  assert.match(app, /state\.label = label;\s*state\.stopped = null;\s*tapRecording\(\);/);
});

test('the bar sits in the page after the footer, and the CSS keeps its colours to the theme\'s', () => {
  assert.ok(html.indexOf('</footer>\n<div id="player" role="region" aria-label="Player"></div>') > 0 || /<\/footer>\r?\n<div id="player" role="region" aria-label="Player"><\/div>/.test(html), 'after the footer, so footer:hover can reach it');
  const block = css.slice(css.indexOf('/* ---------- the player bar (player.js)'), css.indexOf('/* ---------- menu ---------- */'));
  assert.ok(block.length > 3000, 'its own block');
  const rules = block.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(rules, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'no colour of its own: the theme\'s');
  assert.doesNotMatch(rules, /\brgba?\(|\bhsla?\(/);
  for (const color of rules.match(/color-mix\([^)]*\)/g) || []) assert.match(color, /var\(--(bg|fg)\)/, color);
  assert.match(block, /#player \{[^}]*background: color-mix\(in srgb, var\(--bg\) 92%, transparent\)/);
  assert.match(block, /#player \.pl-play \{ background: var\(--fg\); color: var\(--bg\);/);
});

test('H puts it away with the footer; Z\'s visualizer mode shows it only at the bottom edge; a recording leaves it out unless the setting says in', () => {
  const rule = (sel) => (css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')) || [])[1];
  assert.match(rule('body.clean #player'), /opacity: 0 !important;/, 'the way the footer goes');
  assert.match(css, /body\.clean header, body\.clean footer \{ opacity: 0 !important; \}/, 'the footer\'s own rule is the one it follows');
  assert.match(rule('body.clean #player'), /pointer-events: none;/);
  assert.match(rule('body.nocode #player'), /opacity: 0;/);
  assert.match(css, /body\.nocode #player:hover, body\.nocode footer:hover ~ #player \{ opacity: 1; \}/);
  // keyboard focus brings it up too, but a click's focus must not (a button stays focused after one, and the bar would stay up):
  // :has(:focus-visible) on a rule of its own (a browser without :has drops just that), and no :focus-within on it at all
  assert.match(css, /body\.nocode #player:has\(:focus-visible\) \{ opacity: 1; \}/);
  assert.doesNotMatch(css.slice(css.indexOf('/* ---------- the player bar (player.js)'), css.indexOf('/* ---------- menu ---------- */')).replace(/\/\*[\s\S]*?\*\//g, ''), /:focus-within/);
  assert.match(rule('body.recording:not(.player-rec) #player'), /visibility: hidden;/);
  assert.doesNotMatch(css, /body\.player-rec #player \{[^}]*visibility/, 'with the setting on, nothing hides it');
  assert.match(rule('body.mini #player, body.widget #player'), /display: none !important;/);
  // what else sits at the bottom steps over it only while it is there
  assert.match(css, /body\.player-bar\.clean, body\.player-bar\.mini, body\.player-bar\.recording:not\(\.player-rec\), body\.widget \{ --player-h: 0px; \}/);
  assert.match(css, /#notice \{ bottom: calc\(44px \+ var\(--player-h, 0px\)\); \}/);
  assert.match(css, /\nbody #first-run-hint \{ bottom: calc\(52px \+ var\(--player-h, 0px\)\); \}/, 'with body in front: the hint\'s own rule comes later in the sheet, at the same weight, and would win');
  assert.ok(css.indexOf('\n#first-run-hint { position: fixed;') > css.indexOf('\nbody #first-run-hint {'), 'which is why');
  assert.match(css, /body\.vertical #sys \{ bottom: calc\(40px \+ var\(--player-h, 0px\)\); \}/);
  // and the footer's own is where it was: the bar is above it, not in its place
  assert.match(css, /\nfooter \{ bottom: 0; height: 32px;/);
  assert.match(css, /#player \{\s*position: fixed; left: 0; right: 0; bottom: 32px;/);
});

test('narrow windows get two rows, then lose the status line; a touch screen gets targets of 44 px', () => {
  assert.match(css, /@media \(max-width: 899px\) \{\s*body\.player-bar #player \{ display: grid; height: 62px;/);
  assert.match(css, /grid-template-areas: "id id status" "transport progress progress"/);
  assert.match(css, /@media \(max-width: 559px\) \{\s*body\.player-bar #player \{ grid-template-areas: "id id id" "transport progress progress"; \}\s*#player \.pl-status \{ display: none; \}/);
  // the 9:16 layout has no status line, and the song has the first row, whatever the width
  assert.match(css, /body\.vertical\.player-bar #player \{ grid-template-areas: "id id id" "transport progress progress"; \}\s*body\.vertical #player \.pl-status \{ display: none; \}/);
  const touch = css.slice(css.indexOf('/* a touch screen: buttons and track a finger can hit'));
  const px = (sel, prop) => Number(touch.match(new RegExp(sel.replace(/[.#]/g, '\\$&') + ' \\{[^}]*?' + prop + ': (\\d+)px'))?.[1]);
  assert.ok(px('#player .pl-btn', 'width') >= 44, 'buttons');
  assert.ok(px('#player .pl-btn', 'min-height') >= 44);
  assert.ok(px('#player .pl-track', 'min-height') >= 44, 'the track to drag');
  assert.ok(px('body.player-bar #player', 'height') >= 52, 'a bar tall enough for them');
  // the room it says it takes is the room it takes, in each layout
  for (const [media, height] of [['', 38], ['@media (max-width: 899px) { ', 62], ['@media (hover: none) { ', 52], ['@media (hover: none) and (max-width: 899px) { ', 100]]) assert.ok(css.includes(`${media}body.player-bar { --player-h: ${height}px; }`), `${media}${height}`);
});

// ---------------------------------------------------------------- main and preload: one runner, and nothing else sends

test('main asks the helper, loaded when first needed, and only a source copy with --player-dry-run sends nothing', () => {
  assert.match(main, /ipcMain\.handle\('player:command', \(_e, who, action\) => player\(\)\.command\(who, action\)\);/);
  assert.match(main, /ipcMain\.handle\('player:position', \(_e, who\) => player\(\)\.position\(who\)\);/);
  assert.match(main, /ipcMain\.handle\('player:sent', \(\) => \{ player\(\); return playerSent; \}\);/);
  const fn = main.slice(main.indexOf('function player() {'), main.indexOf("const mac = process.platform === 'darwin';"));
  assert.match(fn, /require\('\.\/helpers\/player\.cjs'\)/);
  assert.match(fn, /if \(!app\.isPackaged && process\.argv\.includes\('--player-dry-run'\)\)/);
  assert.match(fn, /createPlayerControl\(\{ run: dry\.run \}\)/);
  assert.doesNotMatch(main.slice(0, main.indexOf('function player() {')), /require\('\.\/helpers\/player\.cjs'\)/, 'not at the top: a copy without helpers/ still starts');
  assert.ok(preload.includes("playerCommand: (who, action) => ipcRenderer.invoke('player:command', who, action),"));
  assert.ok(preload.includes("playerPosition: (who) => ipcRenderer.invoke('player:position', who),"));
  assert.ok(preload.includes("playerSent: () => ipcRenderer.invoke('player:sent'),"));
});

test('osascript is in helpers/player.cjs and the media keys in helpers/mediakeys.ps1, and in no other file', () => {
  const files = ['main.js', 'preload.js', 'update.js', ...fs.readdirSync(new URL('../renderer/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'renderer/' + f), 'helpers/radio.cjs', 'helpers/issue-url.cjs'];
  for (const f of files) assert.doesNotMatch(read(f), /osascript|SendInput|keybd_event|VK_MEDIA|tell application/i, f);
  assert.match(read('helpers/player.cjs'), /osascript/);
  assert.match(read('helpers/mediakeys.ps1'), /SendInput/);
  // and the transport goes only through the page's own bridge, never a command line of its own
  assert.doesNotMatch(read('renderer/player.js'), /child_process|execFile|spawn|exec\(/);
});

test('macOS is told why Toaster asks Music and Spotify, for the one-time Automation prompt', () => {
  assert.match(plist, /<key>NSAppleEventsUsageDescription<\/key>\s*<string>[^<]*Music or Spotify[^<]*<\/string>/);
});
