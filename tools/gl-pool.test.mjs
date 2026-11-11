// The pool that makes the WebGL pictures take turns (renderer/gl-pool.js), on stand-ins for a canvas and its context that
// keep the browser's own rule: at most LIMIT alive, one more kills the oldest for good... unless it is taken back by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGlPool, watch, glBudget } from '../renderer/gl-pool.js';

const LIMIT = 16;
function browser() {
  const alive = []; // (oldest first)
  const kill = (gl) => { gl.lost = true; gl.killed++; alive.splice(alive.indexOf(gl), 1); };
  const start = (gl) => { while (alive.length >= LIMIT) kill(alive[0]); gl.lost = false; alive.push(gl); };
  class Canvas {
    constructor(name, inPage = true) { this.name = name; this.isConnected = inPage; this.hidden = false; this.gl = null; }
    getContext(kind) {
      if (kind === '2d') return { kind };
      if (this.gl) return this.gl;
      const gl = this.gl = { lost: false, killed: 0, restored: 0, isContextLost: () => gl.lost,
        getExtension: (n) => (n === 'WEBGL_lose_context' ? { loseContext: () => { gl.lost = true; alive.splice(alive.indexOf(gl), 1); }, restoreContext: () => { if (!gl.lost) throw new Error('INVALID_OPERATION'); start(gl); gl.restored++; } } : null) };
      start(gl);
      return gl;
    }
  }
  return { Canvas, alive };
}
function page(budget) {
  const b = browser(); let t = 0;
  const pool = createGlPool({ budget, now: () => t });
  const unwatch = watch(pool, b.Canvas.prototype);
  const layers = Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['L' + i, new b.Canvas('L' + i)]));
  // a layer is shown: every other one is switched off, a frame goes by
  const show = (...names) => { t += 2; for (const [n, c] of Object.entries(layers)) c.hidden = !names.includes(n); for (const n of names) layers[n].getContext('webgl2'); pool.tend(); };
  return { ...b, pool, layers, show, unwatch, tick: () => { t += 2; pool.tend(); } };
}

test('without the pool, the seventeenth picture kills the first (the bug)', () => {
  const b = browser(), cs = Array.from({ length: 17 }, (_, i) => new b.Canvas('c' + i));
  for (const c of cs) c.getContext('webgl2');
  assert.equal(cs[0].gl.lost, true);
  assert.equal(cs[0].gl.killed, 1);
});

test('with it, twenty backgrounds tried one after another: none is ever killed, and the one showing draws', () => {
  const p = page(12);
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 20; i++) {
      p.show('L' + i);
      assert.equal(p.layers['L' + i].gl.lost, false, `round ${round}: L${i} draws while it shows`);
      assert.ok(p.alive.length <= 12, `at most the budget alive (${p.alive.length})`);
    }
  }
  assert.equal(Object.values(p.layers).reduce((n, c) => n + c.gl.killed, 0), 0, 'the browser never killed one');
  assert.ok(p.pool.parks > 0 && p.pool.returns > 0);
});

test('the layer shown longest ago gives up first, and one that is on is never asked', () => {
  const p = page(3);
  p.show('L0'); p.show('L1'); p.show('L2');
  p.show('L3', 'L2'); // (L2 stays on with the new one)
  assert.equal(p.layers.L0.gl.lost, true, 'L0, shown longest ago, gave up');
  assert.equal(p.layers.L1.gl.lost, false);
  assert.equal(p.layers.L2.gl.lost, false);
  p.show('L0', 'L2', 'L3'); // (three on at once, at the budget: L1 gives up for L0's return)
  assert.deepEqual(['L0', 'L1', 'L2', 'L3'].map((n) => p.layers[n].gl.lost), [false, true, false, false]);
});

test('every layer on at once and over the budget: nothing to give, the page carries on', () => {
  const p = page(3);
  p.show('L0', 'L1', 'L2', 'L3', 'L4');
  assert.equal(p.alive.length, 5);
  assert.equal(p.pool.parks, 0);
});

test('one the browser killed anyway is taken back when its layer shows', () => {
  const p = page(40); // (a budget over the browser's limit: the pool never parks, the browser kills)
  for (let i = 0; i < 17; i++) { p.layers['L' + i].hidden = false; p.layers['L' + i].getContext('webgl2'); }
  assert.equal(p.layers.L0.gl.killed, 1);
  p.pool.budget = 12;
  p.show('L0');
  assert.equal(p.layers.L0.gl.lost, false, 'L0 is back');
  assert.equal(p.layers.L0.gl.restored, 1);
});

test('a canvas outside the page is never asked to give up, and a second ask for the same context changes nothing', () => {
  const p = page(2);
  const loose = new p.Canvas('loose', false);
  loose.getContext('webgl'); loose.getContext('webgl');
  assert.equal(p.pool.known, 1);
  p.show('L0'); p.show('L1'); p.show('L2');
  assert.equal(loose.gl.lost, false);
  assert.equal(loose.getContext('2d').kind, '2d', 'other kinds of context pass straight through');
  p.unwatch();
});

test('a return is asked for once a second at most, and holds its place while the browser answers', () => {
  const b = browser(); let t = 0;
  const pool = createGlPool({ budget: 4, now: () => t });
  const c = new b.Canvas('c'), gl = c.getContext('webgl2');
  const ext = gl.getExtension('WEBGL_lose_context'), slow = { loseContext: ext.loseContext, restoreContext() {} }; // (a browser that hasn't answered yet)
  gl.getExtension = () => slow;
  pool.adopt(c, gl);
  slow.loseContext();
  for (let i = 0; i < 10; i++) { t += 0.1; pool.tend(); }
  assert.equal(pool.returns, 1, 'asked once in that second');
  assert.equal(pool.alive, 1, 'and counted from the ask');
  t += 1; pool.tend();
  assert.equal(pool.returns, 2, 'and again a second on, still unanswered');
});

test('the budgets leave room under each limit', () => {
  assert.ok(glBudget({ app: true }) < 32);
  assert.ok(glBudget({ app: false, touch: false }) < 16);
  assert.ok(glBudget({ app: false, touch: true }) < 8);
});

test('app.js watches every canvas before any layer is made, and tends the pool with the layers', () => {
  const app = readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  const at = app.indexOf('watch(glPool, HTMLCanvasElement.prototype)');
  assert.ok(at > 0, 'the watch is there');
  for (const maker of ['createScenery(', 'createWorlds(', 'createPost(', 'createOrb(', 'createField(']) {
    const m = app.indexOf(maker);
    assert.ok(m < 0 || m > at, maker + ' comes after the watch');
  }
  const show = app.slice(app.indexOf('function showLayers() {'), app.indexOf('function showLayers() {') + 260);
  assert.match(show, /glPool\.tend\(\);\r?\n\}/, 'showLayers tends the pool');
});
