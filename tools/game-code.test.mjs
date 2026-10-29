import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSkins, pageBottom, pixelCovers } from '../renderer/gameskins.js';

const parts = ['bd', 'sd', 'hhc', 'hho', 'bassline', 'chords', 'vox'];
const lines = ['title', 'tempo', 'key', ...parts].map((id, i) => ({ id, text: i < 3 ? id : 's("bd*4").gain(0.8)', caret: -1, lit: [], landed: 9 }));
const model = { code: lines, col: { fg: [255, 255, 255], bg: [0, 0, 0] }, title: 'TEST', keyName: 'C MINOR', bpm: 120, t: 0 };
function context() {
  const ops = [], c = { ops, measureText: (s) => ({ width: s.length * 6 }), createPattern: () => 'pattern' };
  for (const name of ['fillRect', 'fillText', 'save', 'restore', 'beginPath', 'rect', 'clip', 'translate', 'arc', 'fill']) c[name] = (...args) => ops.push({ name, args, color: c.fillStyle });
  c.drawImage = (canvas) => ops.push({ name: 'image', ops: [...canvas.c.ops] });
  return c;
}
const flatOps = (ops) => ops.flatMap((o) => o.name === 'image' ? flatOps(o.ops) : [o]);

test('every codePage skin has a callable code painter and paints through its bottom entry point', () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => { const canvas = { c: context(), getContext() { return this.c; } }; return canvas; } };
  try {
    const enabled = Object.entries(createSkins()).filter(([, skin]) => skin.codePage).map(([name]) => name).sort();
    assert.deepEqual(enabled, ['lcd', 'neon', 'os', 'vfd']);
    for (const name of enabled) for (const size of [[320, 240], [80, 60]]) {
      const skin = createSkins()[name], c = context(), r = { x: 0, y: 0, w: size[0], h: size[1] };
      assert.equal(typeof skin.code, 'function', name);
      skin.code(c, r, model);
      assert.ok(flatOps(c.ops).some((op) => op.name === 'fillRect'), name + ' code');
      const bottom = context();
      skin.bottom(bottom, r, { ...model, page: { now: 'code', from: 'pads', k: 1 } });
      assert.ok(flatOps(bottom.ops).length > 7, name + ' bottom code');
    }
  } finally { globalThis.document = oldDocument; }
});

test('code rows keep the seven heads, type a whole line, invert a lit token and truncate with an ellipsis', () => {
  const c = context(), code = lines.map((L) => ({ ...L, lit: [] }));
  code[3] = { ...code[3], text: 's("bd*4").gain(0.8)', lit: [[3, 5], [12, 16]] };
  code[4] = { ...code[4], text: 's("sd").gain(0.6)', caret: 13 };
  code[5] = { ...code[5], text: 's("a very long pattern of hats that exceeds the screen")' };
  const skin = createSkins().neon;
  skin.code(c, { x: 0, y: 0, w: 160, h: 120 }, { ...model, code });
  const text = c.ops.filter((o) => o.name === 'fillText');
  assert.equal(text.filter((o) => o.args[0] === 's("bd*4")').length, 5);
  assert.ok(text.some((o) => o.args[0] === code[4].text), 'typing keeps settings');
  assert.ok(text.some((o) => o.args[0] === 'bd' && o.color === 'rgba(7,10,18,1)'), 'token inverted');
  assert.ok(!text.some((o) => o.args[0] === code[3].text.slice(12, 16)), 'settings token outside head omitted');
  assert.ok(text.some((o) => o.args[0] === '…'), 'overflow marked');
  assert.ok(!text.some((o) => ['title', 'tempo', 'key'].includes(o.args[0])), 'metadata excluded');
});

test('all code pages share the settled pages and downward wipe', () => {
  const c = context(), r = { x: 10, y: 20, w: 160, h: 120 }, painted = [];
  const pads = () => painted.push('pads'), code = () => painted.push('code');
  pageBottom(c, r, {}, pads, code, 'edge');
  assert.deepEqual(painted.splice(0), ['pads']);
  pageBottom(c, r, { page: { from: 'pads', now: 'code', k: 0.5 } }, pads, code, 'edge');
  assert.deepEqual(painted.splice(0), ['pads', 'code']);
  assert.ok(c.ops.some((o) => o.name === 'rect' && o.args.join() === '10,20,160,60'));
  assert.ok(c.ops.some((o) => o.name === 'fillRect' && o.color === 'edge'));
  pageBottom(c, r, { page: { from: 'code', now: 'pads', k: 1 } }, pads, code, 'edge');
  assert.deepEqual(painted, ['pads']);
});

test('the pixel screens can draw code punctuation, including a real ellipsis', () => {
  assert.ok(pixelCovers('s("bd*4 ~ [sd,hc]").gain(0.8) <c3 e3 g3> {1 2}%4 #_|=…'));
});
