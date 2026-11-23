import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialHints, advanceHints } from '../renderer/firstrun.js';

const advance = (s, now, extra = {}) => advanceHints(s, { now, hasCode: true, ...extra });

test('the clock starts with the code, then V, P and Z at 10, 30 and 50 seconds, 7 seconds each', () => {
  let r = advanceHints(initialHints(), { now: 100 });
  assert.equal(r.state.started, null);
  r = advance(r.state, 100);
  for (const [t, id] of [[109, null], [110, 'visual'], [116.9, 'visual'], [117, null], [130, 'blocks'], [137, null], [150, 'code'], [157, null]]) {
    r = advance(r.state, t);
    assert.equal(r.hint?.id || null, id, `at ${t}`);
  }
  assert.ok(r.complete);
});

test('pressing a key early skips only its own hint', () => {
  let r = advance(initialHints(), 0, { action: 'visual' });
  r = advance(r.state, 10);
  assert.equal(r.hint, null);
  r = advance(r.state, 30);
  assert.equal(r.hint.id, 'blocks');
});

test('recording or the clean view holds a hint back; two minutes late, it is dropped', () => {
  let r = advance(initialHints(), 0);
  r = advance(r.state, 10, { blocked: true });
  assert.equal(r.hint, null);
  r = advance(r.state, 11);
  assert.equal(r.hint.id, 'visual');
  r = advance(initialHints(), 0);
  r = advance(r.state, 131, { blocked: true });
  assert.ok(r.state.done.includes('visual'));
  assert.equal(r.hint, null);
});

test('a click dismisses a hint; a changed key shows in its text', () => {
  let r = advance(initialHints(), 0);
  r = advance(r.state, 10, { keys: { visual: 'R' } });
  assert.match(r.hint.text, /^R changes/);
  r = advance(r.state, 11, { dismiss: true });
  assert.equal(r.hint, null);
  assert.ok(r.state.done.includes('visual'));
});

test('done, touch screens and returning visitors get no hints, and the state passed in is left alone', () => {
  const s = initialHints();
  const r = advance(s, 0, { touch: true });
  assert.ok(r.complete);
  assert.deepEqual(s, initialHints());
  assert.equal(advance(r.state, 1000).hint, null);
  assert.ok(advance(initialHints(), 0, { enabled: false }).complete);
});

// The desktop app's first launch with nothing playing (renderer/app.js): 20 s in, if the system's sound is still silent, the
// demo beat on offer in the corner note, as the site's welcome leads with it. Run on stand-ins for the page.
import fs from 'node:fs';
import vm from 'node:vm';

function firstLaunch({ silent = true, lastSound = -Infinity, source = 'system', noticeUp = false, recording = false } = {}) {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const from = app.indexOf('if (state.firstRun && window.nc) setTimeout(() => {\n  if (state.source');
  assert.ok(from > 0, 'the offer is in app.js');
  const src = app.slice(from, app.indexOf('}, 20000);', from) + '}, 20000);'.length);
  const timers = [], intervals = [], said = [], demo = [];
  const notice = { hidden: !noticeUp, kids: [], append(...xs) { this.kids.push(...xs.filter((x) => typeof x === 'object')); } };
  const ctx = {
    state: { firstRun: true, source }, window: { nc: {} }, eng: { silent, lastSound }, nowSec: () => 100, rec: { mr: recording ? {} : null, noticeTimer: 0 },
    $: (id) => (id === 'notice' ? notice : null),
    document: { createElement: () => ({ isConnected: true, textContent: '', onclick: null }) },
    showNotice: (t) => { said.push(t); notice.hidden = false; notice.kids = []; }, hideNotice: () => { notice.hidden = true; },
    useDemo: () => demo.push(1), clearTimeout() {}, setTimeout: (f, ms) => timers.push([f, ms]), setInterval: (f) => { intervals.push(f); return intervals.length; }, clearInterval() {},
  };
  vm.runInNewContext(src, ctx);
  return { ctx, timers, intervals, said, demo, notice };
}

test('first launch, nothing playing 20 s in: the demo beat on offer, a click plays it', () => {
  const p = firstLaunch();
  assert.equal(p.timers[0][1], 20000);
  p.timers[0][0]();
  assert.equal(p.said.length, 1);
  assert.match(p.said[0], /^Nothing playing yet\?/);
  const b = p.notice.kids[0];
  assert.equal(b.textContent, 'hear the demo beat');
  b.onclick();
  assert.deepEqual(p.demo, [1]);
  assert.equal(p.notice.hidden, true);
});

test('music starting takes the offer away', () => {
  const p = firstLaunch();
  p.timers[0][0]();
  p.ctx.eng.silent = false;
  p.intervals[0]();
  assert.equal(p.notice.hidden, true);
});

test('no offer when something is playing, played lately, another source is on, a note is up, or a recording runs', () => {
  for (const opts of [{ silent: false }, { lastSound: 90 }, { source: 'demo' }, { noticeUp: true }, { recording: true }]) {
    const p = firstLaunch(opts);
    p.timers[0][0]();
    assert.equal(p.said.length, 0, JSON.stringify(opts));
  }
});
