// The spaghetti's simulation (renderer/spaghetti.js): the machine goes a step on 180 times a second on the clock's own grid, whatever the
// frame rate. Run here on a stand-in engine, with the real noodles and the wall clock (performance.now) made to say how long each step
// took: what the endless kind's governor keeps (the review of Nov 1, D1 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';

// what the spaghetti reads of the page as it is made
globalThis.innerWidth = 640; globalThis.innerHeight = 480; globalThis.devicePixelRatio = 1;
const { Pasta, createSpaghetti } = await import('../renderer/spaghetti.js');
const { clock } = await import('../renderer/clock.js');
clock.seed = 7;

// An engine that hears nothing: the machine runs on its own beat.
const eng = { stepAt: () => null, bpmAt: () => 120, periodAt: () => 0.5, learnedAt: () => ({ on: { bd: [], sd: [], hhc: [], hho: [] } }), hitsAt: () => ({}), levelAt: () => 0, silentAt: () => true, lastKick: -10 };

// An endless machine with `alive` links up, stepped 2000 times of `dt` seconds, each measured to take `ms` ms: what it keeps by the end.
function governed({ dt, alive, ms }) {
  const real = performance.now.bind(performance);
  let now = 0, calls = 0;
  performance.now = () => (++calls % 2 ? now : (now += ms)); // (a step asks twice, before and after: the second answer is `ms` on)
  try {
    const p = new Pasta(true);
    p.noodles.alive.fill(true, 0, alive);
    for (let i = 0; i < 2000; i++) p.advance({ t: i * dt, eng, calm: false, offset: 0 }, dt, 0, [0, 16], 1, null);
    assert.equal(p.noodles.alive.filter(Boolean).length, alive, 'the links stayed as they were');
    return p.keep;
  } finally { performance.now = real; }
}

test('the endless links kept are budgeted by the second, not by the step: 3.5 ms a frame at 60 a second, whatever the steps a second (D1 4)', () => {
  const N = Pasta.N, floor = 3 * N, ceiling = Pasta.LINKS - 2 * N;
  // (alive x the step's share of the budget / what a step takes: the links that fit, kept between 3 sheets' worth and all but 2)
  const fit = ({ dt, alive, ms }) => Math.min(ceiling, Math.max(floor, (alive * 0.21 * dt) / (ms / 1000)));
  for (const c of [
    { dt: 1 / 180, alive: 24, ms: 0.2 }, // the machine's own rate: 140 fit, where a budget of 3.5 ms a step would keep them all (192)
    { dt: 1 / 180, alive: 24, ms: 0.5 }, // slower: down to the least (72), where 3.5 ms a step would keep 168
    { dt: 1 / 60, alive: 24, ms: 0.5 }, // a step of a 60th has three times the share of a 180th: 168 fit
  ]) {
    const keep = governed(c), want = fit(c);
    assert.ok(Math.abs(keep - want) < 0.5, `${JSON.stringify(c)}: kept ${keep.toFixed(1)}, ${want.toFixed(1)} fit`);
    assert.ok(want > floor - 1e-9 && want < ceiling + 1e-9);
  }
  assert.ok(fit({ dt: 1 / 180, alive: 24, ms: 0.2 }) > floor && fit({ dt: 1 / 180, alive: 24, ms: 0.2 }) < ceiling, 'the first is neither clamped');
  assert.ok(fit({ dt: 1 / 60, alive: 24, ms: 0.5 }) > floor && fit({ dt: 1 / 60, alive: 24, ms: 0.5 }) < ceiling, 'nor the third');
});

// A graphics context that draws nothing (the kitchen's passes and the noodles' are the GPU's: not what is under test here).
function fakeGL() {
  const made = () => ({});
  const methods = { createProgram: made, createShader: made, createTexture: made, createFramebuffer: made, getProgramParameter: () => true, getUniformLocation: (p, name) => ({ p, name }), getExtension: () => null, isContextLost: () => false };
  return new Proxy({}, { get: (_, name) => (typeof name !== 'string' ? undefined : /^[A-Z][A-Z0-9_]*$/.test(name) ? name : methods[name] || (() => undefined)) });
}
// a cover that decodes at once to a bitmap that is nothing
globalThis.createImageBitmap = async () => ({ close() {} });
const cover = () => ({ width: 64, height: 64, decode: async () => {} });
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

test('a new cover\'s card is dropped in at a step of the machine\'s own grid, not at the frame\'s time, which no step is at (D1 6)', async () => {
  const drops = [], drop = Pasta.prototype.drop;
  let at = 0;
  Pasta.prototype.drop = function (t) { drops.push({ t, frame: at }); return drop.call(this, t); }; // (each call, with the frame it was made in)
  try {
    const gl = fakeGL(), spaghetti = createSpaghetti({ width: 300, height: 150, addEventListener() {}, getContext: () => gl });
    const first = cover(), second = cover(), col = { bg: [5, 29, 181], fg: [255, 255, 255], ink: [0, 0, 0], accent: [255, 255, 255] };
    for (let f = 0; f < 40; f++) { // (50 frames a second: a frame is 3.6 steps of the 180th grid, so most are between two steps)
      at = f / 50;
      spaghetti.draw(at, eng, { col, picture: f < 20 ? first : second, endless: true });
      await settle(); // (the cover decodes between frames)
    }
    assert.ok(drops.length >= 2, `the two covers' arrivals: ${drops.length} calls`);
    assert.ok(drops.some((d) => Math.abs(d.frame * 180 - Math.round(d.frame * 180)) > 0.1), 'and some of them in frames between two steps');
    for (const d of drops) assert.equal(d.t, Math.floor(d.frame * 180 + 1e-6) / 180, `a drop in the frame at ${d.frame}: at the last step run for it`);
  } finally { Pasta.prototype.drop = drop; }
});
