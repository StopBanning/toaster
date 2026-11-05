import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/orb.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(text.slice(text.indexOf('const N ='), text.indexOf('const ORDER =')) + ';globalThis.forms=DYN;globalThis.outlines=OUTLINES;', context);

test('D1 5: shapes samples its fixed outlines once, with no per-dot array creation during frames', () => {
  let calls = 0;
  for (let i = 0; i < context.outlines.length; i++) {
    const outline = context.outlines[i];
    context.outlines[i] = (f) => { calls++; return outline(f); };
  }
  const shape = context.forms.shapes(), initial = calls;
  for (const bars of [0, 0.9, 1.2, 1.9, 2.9]) shape.step(0, 1 / 60, { bars, yaw: 0.2, pitch: 0.1 });
  assert.equal(calls, initial, 'drawing never calls an allocating outline function');
  assert.ok(shape.pos.every(Number.isFinite));
});
