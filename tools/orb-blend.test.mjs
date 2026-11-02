// The glitch ball's step and the orb's dots (renderer/orb.js, renderer/glitchorb.js). A step of the ball's surface draws with blending
// off, and only the ball's own draw turns it on again; a frame that stepped the ball as it faded out drew no ball, so the dots after
// it were drawn unblended, until the glitch form came round again (the review of Nov 1, D1 3).
//
// Run here against a stand-in graphics context that draws nothing and keeps the blend switch as a real one does (off until it is
// turned on), noting what it was at every draw: the ball's step, the ball, the dots. (What unblended dots look like is the GPU's.)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// what the orb reads of the page as it draws
globalThis.innerWidth = 640; globalThis.innerHeight = 480; globalThis.devicePixelRatio = 1;
const { createOrb } = await import('../renderer/orb.js');
const { clock } = await import('../renderer/clock.js');
clock.seed = 7;

// The context: a constant is its own name, the blend switch is kept, and every draw is kept with what the switch was and what it
// drew: points are the dots, and the ball's two programs are told apart by the texture each reads.
function fakeGL() {
  const seen = { blend: false, draws: [] };
  let used = null;
  const source = (p) => p.shaders.map((s) => s.src).join('\n');
  const methods = {
    createProgram: () => ({ shaders: [] }),
    createShader: () => ({ src: '' }),
    shaderSource: (s, src) => { s.src = src; },
    attachShader: (p, s) => { p.shaders.push(s); },
    useProgram: (p) => { used = p; },
    getProgramParameter: () => true,
    checkFramebufferStatus: () => 'FRAMEBUFFER_COMPLETE',
    getExtension: () => null,
    isContextLost: () => false,
    enable: (cap) => { if (cap === 'BLEND') seen.blend = true; },
    disable: (cap) => { if (cap === 'BLEND') seen.blend = false; },
    drawArrays: (mode) => seen.draws.push({ kind: mode === 'POINTS' ? 'dots' : /uniform sampler2D prev/.test(source(used)) ? 'step' : 'ball', blend: seen.blend }),
  };
  const gl = new Proxy({}, { get: (_, name) => (typeof name !== 'string' ? undefined : /^[A-Z][A-Z0-9_]*$/.test(name) ? name : methods[name] || (() => undefined)) });
  return { gl, seen };
}

// An engine that hears nothing (the orb runs on its own beat), and a theme with a dark ground (the dots get a glow under them)
const eng = { bpmAt: () => 0, stepAt: () => null, learnedAt: () => ({ shown: {} }), presentAt: () => false, v: { bd: { lastHit: { t: -99 } }, sd: { lastHit: { t: -99 } } }, hhHit: { t: -99 }, lastBassHit: null };
const col = { bg: [0, 0, 0], fg: [255, 255, 255], ink: [0, 0, 0], accent: [255, 255, 255] };

// The orb at `fps` frames a second from `start`: the glitch form comes (the dots flow into the sphere and the ball comes in over them),
// holds for 2.5 s, and the next form comes (the ball goes in under half a second). Each frame says what it drew, and with blending on or off.
function run(fps, start) {
  const { gl, seen } = fakeGL(), canvas = { width: 300, height: 150, addEventListener() {}, getContext: () => gl };
  const orb = createOrb(canvas);
  const frames = [];
  let t = start;
  const frame = () => {
    clock.set(t);
    const before = seen.draws.length;
    orb.draw(t, eng, col, 0, () => {});
    const drew = seen.draws.slice(before), of = (kind) => drew.filter((d) => d.kind === kind);
    frames.push({ t, steps: of('step').length, ball: of('ball').length, dots: of('dots').map((d) => d.blend) });
    t += 1 / fps;
  };
  frame(); // (built, and the first form)
  orb.show('glitch');
  for (let f = 0; f < 2.5 * fps; f++) frame();
  orb.show('sphere');
  for (let f = 0; f < 1.5 * fps; f++) frame();
  return frames;
}

test('the dots are drawn blended in every frame, the ones that stepped the ball as it faded out and drew none included', () => {
  let stepOnly = 0;
  for (const fps of [60, 30, 144]) for (const start of [100, 100.0013, 100.002, 100.0031]) {
    const frames = run(fps, start), label = `${fps} fps from ${start}`;
    assert.ok(frames.some((f) => f.ball > 0 && f.steps > 0), `${label}: the ball was stepped and drawn`);
    assert.ok(frames.every((f) => f.dots.length === 2), `${label}: the glow and the dots, in every frame`);
    assert.deepEqual(frames.filter((f) => f.dots.some((blend) => !blend)).map((f) => f.t), [], `${label}: frames whose dots were drawn unblended`);
    stepOnly += frames.filter((f) => f.steps > 0 && f.ball === 0).length;
  }
  assert.ok(stepOnly > 0, 'the case the fix is for does come up: a frame that stepped the ball and drew none');
});
