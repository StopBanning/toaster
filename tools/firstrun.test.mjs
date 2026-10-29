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
