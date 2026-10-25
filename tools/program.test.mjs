import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { compileProgram } = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('../renderer/program.js', import.meta.url), 'utf8')));
function fixture(parallel = true, linked = true) {
  const queries = []; let complete = false;
  const gl = { VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, LINK_STATUS: 3,
    getExtension: () => parallel ? { COMPLETION_STATUS_KHR: 4 } : null,
    createShader: () => ({}), shaderSource() {}, compileShader() {}, createProgram: () => ({}), attachShader() {}, bindAttribLocation() {}, linkProgram() {},
    isContextLost: () => false, getProgramParameter(_p, name) { queries.push(name); return name === 4 ? complete : linked; },
    getProgramInfoLog: () => 'bad shader', detachShader() {}, deleteShader() {}, deleteProgram() {} };
  return { gl, queries, complete() { complete = true; } };
}
test('pending compilation never queries link or compile status', () => {
  const f = fixture(), job = compileProgram(f.gl, 'vertex', 'fragment');
  assert.deepEqual(f.queries, []); assert.equal(job.ready(), false);
  assert.deepEqual(f.queries, [4]);
  f.complete(); assert.equal(job.ready(), true); assert.deepEqual(f.queries, [4, 4, 3]);
  assert.equal(job.ready(), true); assert.deepEqual(f.queries, [4, 4, 3]);
});
test('finished link failures report their error', () => {
  const f = fixture(true, false), job = compileProgram(f.gl, '', '');
  assert.equal(job.ready(), false); f.complete(); assert.throws(() => job.ready(), /bad shader/);
  assert.throws(() => job.ready(), /bad shader/);
});
test('missing extension uses synchronous link validation', () => {
  const f = fixture(false); const job = compileProgram(f.gl, '', '');
  assert.deepEqual(f.queries, [3]); assert.equal(job.ready(), true);
  assert.throws(() => compileProgram(fixture(false, false).gl, '', ''), /bad shader/);
});
