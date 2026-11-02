// The spaghetti's kitchen (renderer/spaghetti.js) and the theme's background. The kitchen is raymarched into a cache (two full-canvas
// passes, four textures and two framebuffers made and deleted each time) and has the background in it: the void round the floor is
// exactly it, and the floor, the slab's sides and the chrome take a little. On the dynamic theme the colours ease from one cover's to
// the next one's over 1.2 s and the page hands over new ones almost every frame, so a cache keyed on each frame's colour was drawn
// again and again for the length of the ease (a few frames a second on an integrated GPU). Now the kitchen is drawn for the colours
// as they settle, and while they move the copy takes its void to the colours of the moment (bgShift).
//
// Run here against a stand-in graphics context that draws nothing and counts: the kitchen's passes, the textures and framebuffers
// alive, what the copy is told each frame. (What it makes of them is the GPU's: the old and the new drawn through the same ease and
// compared pixel for pixel is a job for a real window, tools/clock-harness.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// what the spaghetti reads of the page as it draws
globalThis.innerWidth = 640; globalThis.innerHeight = 480; globalThis.devicePixelRatio = 1;
const { createSpaghetti } = await import('../renderer/spaghetti.js');
const { clock } = await import('../renderer/clock.js');
clock.seed = 7;

// The context: a constant is its own name (the file only compares them), a program is told apart by what its shaders say, and
// each draw is kept with the uniforms its program had then.
function fakeGL() {
  const seen = { draws: [], textures: new Set(), framebuffers: new Set(), madeFramebuffers: 0, uniforms: new Map(), copy: [] };
  let used = null;
  const kind = (p) => (p.kind ??= (() => { const src = p.shaders.map((s) => s.src).join('\n'); return /uniform int pass/.test(src) ? 'kitchen' : /uniform sampler2D color/.test(src) ? 'copy' : 'other'; })());
  const draw = () => seen.draws.push({ kind: kind(used), bg: seen.uniforms.get('kitchen:u.bg') });
  const methods = {
    createProgram: () => ({ shaders: [] }),
    createShader: () => ({ src: '' }),
    shaderSource: (s, src) => { s.src = src; },
    attachShader: (p, s) => { p.shaders.push(s); },
    getProgramParameter: () => true,
    getUniformLocation: (p, name) => ({ p, name }),
    useProgram: (p) => { used = p; },
    createTexture: () => { const t = {}; seen.textures.add(t); return t; },
    deleteTexture: (t) => { seen.textures.delete(t); },
    createFramebuffer: () => { const f = {}; seen.framebuffers.add(f); seen.madeFramebuffers++; return f; },
    deleteFramebuffer: (f) => { seen.framebuffers.delete(f); },
    drawArrays: draw,
    drawArraysInstanced: draw,
    uniform3fv: (loc, v) => {
      seen.uniforms.set(`${kind(loc.p)}:${loc.name}`, Array.from(v));
      if (kind(loc.p) === 'copy' && loc.name === 'bgShift') seen.copy.push(Array.from(v));
    },
    getExtension: () => null,
    isContextLost: () => false,
  };
  const gl = new Proxy({}, { get: (_, name) => (typeof name !== 'string' ? undefined : /^[A-Z][A-Z0-9_]*$/.test(name) ? name : methods[name] || (() => undefined)) });
  return { gl, seen };
}

// An engine that hears nothing (the machine runs on its own beat), and a picture that decodes to nothing: the kitchen's what's under test.
const eng = { stepAt: () => null, bpmAt: () => 120, periodAt: () => 0.5, learnedAt: () => ({ on: { bd: [], sd: [], hhc: [], hho: [] } }), hitsAt: () => ({}), levelAt: () => 0, silentAt: () => true, lastKick: -10 };
const picture = {};

// The spaghetti on a canvas of its own. frame(t, bg) draws it at clock time t with the theme's background bg and says what that
// frame drew: how many kitchens, the colour the latest kitchen was drawn for, and the colour the copy took its void by.
function rig() {
  const { gl, seen } = fakeGL(), canvas = { width: 300, height: 150, addEventListener() {}, getContext: () => gl };
  const spaghetti = createSpaghetti(canvas);
  let kitchens = 0;
  return {
    seen, canvas,
    get kitchens() { return kitchens; },
    frame(t, bg) {
      const before = seen.draws.filter((d) => d.kind === 'kitchen').length, copies = seen.copy.length;
      spaghetti.draw(t, eng, { col: { bg, fg: [255, 255, 255], ink: [0, 0, 0], accent: [255, 255, 255] }, picture });
      const passes = seen.draws.filter((d) => d.kind === 'kitchen');
      kitchens = passes.length / 2;
      assert.equal(seen.copy.length, copies + 1, 'the copy is told its shift once a frame');
      return { made: (passes.length - before) / 2, baked: passes.length ? passes[passes.length - 1].bg : null, shift: seen.copy[seen.copy.length - 1] };
    },
  };
}

const smooth = (k) => k * k * (3 - 2 * k);
const eased = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * smooth(Math.min(1, Math.max(0, k)))));
const unit = (bg) => bg.map((v) => v / 255);
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const A = [34, 20, 14], B = [8, 30, 33]; // two covers' backgrounds (26 levels apart)

// A cover's ease, as the page runs it: a second of rest, then 1.2 s of a new colour almost every frame, then rest.
function ease(fps) {
  const r = rig(), rows = [];
  for (let f = 0; f < Math.round(4 * fps); f++) {
    const t = f / fps, bg = t < 1 ? A : eased(A, B, (t - 1) / 1.2);
    rows.push({ t, bg, ...r.frame(t, bg), total: r.kitchens });
  }
  return { r, rows };
}

test('a cover\'s colours easing to the next one\'s draw the kitchen once, for the colours they settle at', () => {
  const { r, rows } = ease(60);
  const steps = new Set(rows.filter((x) => x.t >= 1 && x.t <= 2.2).map((x) => x.bg.join()));
  assert.ok(steps.size > 15, `the colours do change from step to step through the ease (${steps.size} of them)`);
  // the first frame draws the kitchen, and no step of the ease does
  assert.equal(rows[0].made, 1);
  assert.equal(rows.filter((x) => x.t > 1 / 30 && x.t < 2.2).reduce((n, x) => n + x.made, 0), 0, 'no kitchen for a step of the ease');
  // then one, for where they settled
  assert.equal(r.kitchens, 2);
  const last = rows.filter((x) => x.made).pop(), stopped = rows.filter((x, i) => i && x.bg.join() !== rows[i - 1].bg.join()).pop().t;
  assert.ok(last.t - stopped >= 0.5 - 1e-9 && last.t - stopped <= 0.5 + 1 / 60 + 1e-9, `drawn again half a second after they stopped (${(last.t - stopped).toFixed(3)} s)`);
  assert.ok(near(last.baked, unit(B)), 'for the colours the ease ends at: the picture at rest is the one it always was');
  assert.deepEqual(rows[rows.length - 1].shift, [0, 0, 0], 'and at rest the copy adds nothing');
});

test('the void follows the colours of every frame of the ease: what the kitchen was drawn for plus the copy\'s shift is the background now', () => {
  const { rows } = ease(60);
  for (const x of rows) assert.ok(near(x.baked.map((v, i) => v + x.shift[i]), unit(x.bg)), `t ${x.t.toFixed(3)}: ${x.bg}`);
  assert.deepEqual(rows[10].shift, [0, 0, 0], 'at rest before it the copy adds nothing either');
  const mid = rows.find((x) => x.t >= 1.6);
  assert.ok(mid.shift.some((v) => Math.abs(v) > 1 / 255), 'in the middle of the ease the void is off the kitchen\'s own');
});

test('the same ease at 30 frames a second and at 60 draws the same two kitchens, the second one a frame apart at most', () => {
  const a = ease(60), b = ease(30);
  assert.equal(a.r.kitchens, 2);
  assert.equal(b.r.kitchens, 2);
  const when = (e) => e.rows.filter((x) => x.made).pop().t;
  assert.ok(Math.abs(when(a) - when(b)) <= 1 / 30 + 1e-9, `${when(a)} against ${when(b)}`);
  assert.ok(near(b.rows[b.rows.length - 1].baked, unit(B)));
});

test('nothing is left behind: a kitchen drawn again takes the place of the last, whatever number there have been', () => {
  const still = rig();
  for (let f = 0; f < 120; f++) still.frame(f / 60, A);
  const { r } = ease(60);
  assert.equal(still.kitchens, 1);
  assert.equal(r.kitchens, 2);
  // (the beads, the 1 px stand-in, and the cache's colour and depth: the passes' own textures and framebuffers are gone again)
  assert.equal(still.seen.textures.size, 4);
  assert.equal(r.seen.textures.size, 4);
  assert.equal(r.seen.framebuffers.size, 0);
  assert.equal(r.seen.madeFramebuffers, 2 * r.kitchens, 'two framebuffers for each kitchen, and none for the ease\'s steps');
});

test('colours far from the kitchen\'s (a theme picked, or a long ease) draw it in that frame, the void and the kitchen the same colour', () => {
  const r = rig(), BLUE = [5, 29, 181], WHITE = [255, 255, 255];
  for (let f = 0; f < 30; f++) r.frame(f / 60, BLUE);
  assert.equal(r.kitchens, 1);
  const pick = r.frame(0.5, WHITE);
  assert.equal(pick.made, 1, 'the frame the theme was picked');
  assert.ok(near(pick.baked, unit(WHITE)));
  assert.deepEqual(pick.shift, [0, 0, 0]);
  // a long ease (this one 150 levels): drawn again as it goes, a step at a time, not once at the end only (the floor would be a tint off for a second)
  const long = rig(), PLUM = [30, 10, 28];
  for (let f = 0; f < 60; f++) long.frame(f / 60, PLUM);
  for (let f = 0; f < 72; f++) long.frame(1 + f / 60, eased(PLUM, BLUE, f / 72));
  assert.ok(long.kitchens >= 3 && long.kitchens <= 8, `${long.kitchens} kitchens for 72 frames of it`);
  for (let f = 0; f < 60; f++) long.frame(2.2 + f / 60, BLUE);
  const end = long.frame(3.5, BLUE);
  assert.ok(near(end.baked, unit(BLUE)));
});

test('colours a little off the kitchen\'s are drawn for once they have stayed put for half a second of the clock\'s time, not sooner and not never', () => {
  const r = rig(), DARK = [0, 0, 0], PINK = [22, 0, 13];
  for (let f = 0; f < 30; f++) r.frame(f / 60, DARK);
  const at = 0.5; // (the clock's time the colour was picked)
  const rows = [];
  for (let f = 0; f < 90; f++) { const t = at + f / 60; rows.push({ t, ...r.frame(t, PINK) }); }
  const first = rows.find((x) => x.made);
  assert.equal(rows.filter((x) => x.made).length, 1);
  assert.ok(first.t - at >= 0.5 - 1e-9 && first.t - at <= 0.5 + 1 / 60 + 1e-9, `${first.t - at} s on`);
  assert.deepEqual(rows[1].shift, unit(PINK), 'the void has the new colour from the first frame');
  assert.deepEqual(rows[rows.length - 1].shift, [0, 0, 0]);
});

test('a clock that has gone back (a render started again) starts the half second again, not after the old time has come round', () => {
  const r = rig();
  for (let f = 0; f < 30; f++) r.frame(10 + f / 60, A);
  r.frame(10.5, [40, 20, 14]); // (the colours move: a step of an ease, at 10.5 s)
  r.frame(10.52, [40, 20, 14]);
  let drawn = 0;
  for (let f = 0; f < 60; f++) drawn += r.frame(f / 60, [40, 20, 14]).made; // (and the clock is back at 0)
  assert.equal(drawn, 1);
});

test('a new size draws the kitchen in that frame, however the colours are moving', () => {
  const r = rig();
  for (let f = 0; f < 60; f++) r.frame(f / 60, A);
  const w = globalThis.innerWidth;
  try {
    globalThis.innerWidth = w + 160;
    const frame = r.frame(1, eased(A, B, 0.5));
    assert.equal(frame.made, 1);
    assert.equal(r.canvas.width, w + 160);
    assert.deepEqual(frame.shift, [0, 0, 0]);
  } finally { globalThis.innerWidth = w; }
});
