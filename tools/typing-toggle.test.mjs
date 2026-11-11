import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// A part's mute or unmute goes in while another line is being typed, and an unmute skips the 0.7 s a changed line waits
// (a drop's kick came in a beat or two late behind the bass line's retyping: Garrix "Animals", Nov 6).
const code = fs.readFileSync(new URL('../renderer/codeview.js', import.meta.url), 'utf8');
function view() {
  const element = () => ({ innerHTML: '', hidden: true, style: { setProperty() {} }, offsetWidth: 100, offsetHeight: 20, textContent: '',
    classList: { toggle() {}, remove() {}, add() {}, contains: () => false }, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, right: 900, top: 20, bottom: 40 }) });
  const elements = Object.fromEntries(['ln-bd', 'ln-bassline', 'code', 'err'].map(id => [id, element()]));
  const context = vm.createContext({ clock: { rng: () => () => 0.5, now: () => 1000, after() {} },
    document: { getElementById: id => elements[id], createElement: () => ({ getContext: () => ({}) }) },
    ResizeObserver: class { observe() {} }, innerHeight: 800 });
  vm.runInContext(code.replace("import { clock } from './clock.js';", '').replaceAll('export ', '') + '\nglobalThis.make = createCodeView;', context);
  return context.make(['bd', 'bassline']);
}
const MUTED = '_kick: s("bd*4")', ON = 'kick: s("bd*4")';
const LONG = 'bassline: note("<g2 f#2!2 [f2 f#2@2 eb2]>").struct("x*4").s("sawtooth").lpf(950)';
function setUp() {
  const v = view();
  let t = 0;
  v.update({ bd: [{ text: MUTED }], bassline: [{ text: 'bassline: note("g2")' }] }, t, true);
  for (; t < 5; t += 0.01) v.step(t);
  assert.equal(v.lines.bd.shown, MUTED);
  // a long change to the bass line starts typing
  v.update({ bd: [{ text: MUTED }], bassline: [{ text: LONG }] }, t, true);
  for (const end = t + 0.3; t < end; t += 0.01) v.step(t);
  assert.notEqual(v.lines.bassline.shown, LONG, 'still typing the bass line');
  return { v, t };
}

test('an unmute goes in at once while another line is typed, and that line finishes after it', () => {
  let { v, t } = setUp();
  v.update({ bd: [{ text: ON }], bassline: [{ text: LONG }] }, t); // (not "now": the usual path, held lines and all)
  const asked = t;
  while (v.lines.bd.shown !== ON && t < asked + 3) { v.step(t); t += 0.01; }
  assert.equal(v.lines.bd.shown, ON);
  assert.ok(t - asked < 0.2, `unmuted ${(t - asked).toFixed(2)} s after it was asked`);
  assert.notEqual(v.lines.bassline.shown, LONG, 'the bass line was still being typed');
  for (const end = t + 10; t < end; t += 0.01) v.step(t);
  assert.equal(v.lines.bassline.shown, LONG);
  assert.equal(v.lines.bd.shown, ON);
});

test('a kick mute commits without debounce', () => {
  const v = view();
  let t = 0;
  v.update({ bd: [{ text: ON }], bassline: [{ text: 'bassline: note("g2")' }] }, t, true);
  for (; t < 5; t += 0.01) v.step(t);
  v.update({ bd: [{ text: MUTED }], bassline: [{ text: 'bassline: note("g2")' }] }, t);
  for (const end = t + 0.5; t < end; t += 0.01) { v.update({ bd: [{ text: MUTED }], bassline: [{ text: 'bassline: note("g2")' }] }, t); v.step(t); }
  assert.equal(v.lines.bd.shown, MUTED, 'muted without debounce');
  for (const end = t + 1; t < end; t += 0.01) { v.update({ bd: [{ text: MUTED }], bassline: [{ text: 'bassline: note("g2")' }] }, t); v.step(t); }
  assert.equal(v.lines.bd.shown, MUTED);
});

test('an unmute with a new pattern commits without debounce', () => {
  let { v, t } = setUp();
  const CHANGED = 'kick: s("bd ~ bd ~")';
  v.update({ bd: [{ text: CHANGED }], bassline: [{ text: LONG }] }, t);
  const asked = t;
  for (const end = t + 0.4; t < end; t += 0.01) { v.update({ bd: [{ text: CHANGED }], bassline: [{ text: LONG }] }, t); v.step(t); }
  assert.equal(v.lines.bd.shown, CHANGED, 'new pattern committed');
});

test('a kick returns with a complete new pattern before the paused line finishes', () => {
  let { v, t } = setUp();
  const NEW = 'kick: s("bd ~ bd ~")';
  v.update({ bd: [{ text: NEW }], bassline: [{ text: LONG }] }, t);
  for (const end = t + 0.75; t < end; t += 0.01) { v.update({ bd: [{ text: NEW }], bassline: [{ text: LONG }] }, t); v.step(t); }
  const asked = t;
  while (v.lines.bd.shown !== NEW && t < asked + 5) { v.update({ bd: [{ text: NEW }], bassline: [{ text: LONG }] }, t); v.step(t); t += 0.01; }
  assert.equal(v.lines.bd.shown, NEW);
  assert.notEqual(v.lines.bassline.shown, LONG, 'the bass line waited for the kick line');
  for (const end = t + 10; t < end; t += 0.01) v.step(t);
  assert.equal(v.lines.bassline.shown, LONG);
});
