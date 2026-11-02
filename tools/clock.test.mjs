// The one clock (renderer/clock.js): live and render modes, set() and frame, the audio clock while a song plays,
// and the seeded dice (renderer/random.js). Every clock here is made with fake time sources, so nothing waits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { clock as theClock, createClock, TICK_HZ } from '../renderer/clock.js';
import { hash32, mulberry32 } from '../renderer/random.js';

// A clock on a fake performance clock the test moves by hand, and a fake AudioContext it moves too.
function rig({ drift = 1, step = 0, seed = 1 } = {}) {
  let p = 100;
  const ctx = { currentTime: 0, state: 'running' };
  const clock = createClock({ perf: () => p, entropy: () => seed });
  let audio = 0; // the true audio time; ctx.currentTime shows it in steps of `step` seconds (0: exactly)
  const advance = (dt) => {
    p += dt;
    audio += dt * drift;
    ctx.currentTime = step ? Math.floor(audio / step) * step : audio;
  };
  return { clock, ctx, advance, perf: () => p, audio: () => audio };
}

test('the page has one clock, on the global too, and it is live and counts seconds', () => {
  assert.equal(globalThis.clock, theClock);
  assert.equal(theClock.mode, 'live');
  const a = theClock.now();
  assert.ok(Number.isFinite(a) && a >= 0);
  assert.ok(theClock.now() >= a, 'never goes back');
});

test('live, with no audio, it is the performance clock in seconds, and never goes back', () => {
  const { clock, advance, perf } = rig();
  assert.equal(clock.now(), 100);
  advance(0.25);
  assert.equal(clock.now(), perf());
  advance(1 / 60);
  assert.ok(Math.abs(clock.now() - perf()) < 1e-12);
  assert.equal(clock.mode, 'live');
  assert.equal(clock.locked, false);
  assert.ok(Number.isNaN(clock.audioTime(5)), 'no audio clock, no audio time');
});

test('render mode: set() puts the clock at the time it is given, exactly, and the frame follows the fps', () => {
  const { clock, advance } = rig();
  clock.render({ fps: 30, t0: 10 });
  assert.equal(clock.mode, 'render');
  assert.equal(clock.now(), 10);
  assert.equal(clock.frame, 0);
  clock.set(10 + 7 / 30);
  assert.equal(clock.now(), 10 + 7 / 30);
  assert.equal(clock.frame, 7);
  advance(5); // (the performance clock goes on: the render clock does not)
  assert.equal(clock.now(), 10 + 7 / 30);
  clock.set(10 + 8 / 30, 99); // a driver that numbers its own frames
  assert.equal(clock.frame, 99);
  clock.set(3); // and a time before the start is just a time
  assert.equal(clock.now(), 3);
  assert.equal(clock.fps, 30);
});

test('the first set() is a render, at 60 fps from that time, and live() lets go of it', () => {
  const { clock, advance, perf } = rig();
  advance(2);
  const before = clock.now();
  clock.set(50);
  assert.equal(clock.mode, 'render');
  assert.equal(clock.now(), 50);
  assert.equal(clock.fps, TICK_HZ);
  assert.equal(clock.frame, 0);
  clock.set(50 + 6 / 60);
  assert.equal(clock.frame, 6);
  advance(3);
  clock.live();
  assert.equal(clock.mode, 'live');
  assert.equal(clock.now(), perf(), 'the live line carries on as if the render had taken no time at all to it');
  assert.ok(clock.now() > before);
  assert.throws(() => clock.set(NaN), TypeError);
  assert.throws(() => clock.render({ fps: 0 }), TypeError);
});

test('while a song plays the live clock keeps the audio clock\'s time, not the performance clock\'s', () => {
  // the audio hardware runs 0.02% fast against the performance clock (a real drift, 200 ppm)
  const { clock, ctx, advance } = rig({ drift: 1.0002 });
  clock.attach(ctx);
  clock.playing = true;
  for (let i = 0; i < 100; i++) advance(0.016);
  clock.now();
  assert.equal(clock.locked, true);
  const offset0 = clock.audioOffset;
  assert.ok(Number.isFinite(offset0));
  for (let i = 0; i < 60 * 600; i++) { advance(1 / 60); clock.now(); } // ten minutes, the clock read every frame
  const now = clock.now();
  // 10 minutes of drift is 120 ms: the clock has followed it, so what it says is still the audio time plus the constant
  assert.ok(Math.abs(now - ctx.currentTime - clock.audioOffset) < 0.002, `audio time ${clock.audioTime(now)} against ${ctx.currentTime}`);
  assert.ok(Math.abs(clock.audioOffset - offset0) < 1e-12, 'the constant is constant');
  assert.ok(Math.abs(clock.fromAudio(clock.audioTime(now)) - now) < 1e-9);
  assert.ok(Math.abs(clock.audioTime(now) - ctx.currentTime) < 0.002);
});

test('taking hold of the audio clock, and letting go of it, never move the time', () => {
  const { clock, ctx, advance, perf } = rig({ drift: 1.0003 });
  clock.attach(ctx);
  for (let i = 0; i < 50; i++) advance(0.016);
  const a = clock.now();
  assert.equal(a, perf());
  clock.playing = true;
  const b = clock.now();
  assert.ok(Math.abs(b - a) < 1e-9, 'hold taken: the time is where it was');
  for (let i = 0; i < 200; i++) { advance(0.016); clock.now(); }
  const c = clock.now();
  clock.playing = false;
  const d = clock.now();
  assert.ok(Math.abs(d - c) < 1e-9, 'let go: the time is where it was');
  advance(0.5);
  assert.ok(Math.abs(clock.now() - d - 0.5) < 1e-9, 'unlocked it runs on the performance clock again');
  clock.playing = true;
  advance(0.016);
  clock.now();
  assert.ok(Number.isFinite(clock.audioOffset));
});

test('the audio clock moves in steps, the clock does not: no stutter between audio callbacks', () => {
  // an audio clock that updates every 10 ms (a real one: every callback), read every millisecond
  const { clock, ctx, advance } = rig({ step: 0.01 });
  clock.attach(ctx);
  clock.playing = true;
  for (let i = 0; i < 3000; i++) { advance(0.001); clock.now(); } // let the average settle
  let last = clock.now(), worst = 0, smallest = Infinity;
  for (let i = 0; i < 2000; i++) {
    advance(0.001);
    const t = clock.now();
    worst = Math.max(worst, t - last);
    smallest = Math.min(smallest, t - last);
    last = t;
  }
  assert.ok(smallest > 0.0008, `time stood still or went back (${smallest})`);
  assert.ok(worst < 0.0013, `time jumped (${worst} for a millisecond)`);
  // and it is on the audio clock, to within a callback
  assert.ok(Math.abs(clock.audioTime(last) - ctx.currentTime) < 0.01);
});

test('an audio clock that stops is not followed, one that restarts moves the offset and not the time', () => {
  const { clock, ctx, advance, perf } = rig();
  clock.attach(ctx);
  clock.playing = true;
  for (let i = 0; i < 100; i++) { advance(0.016); clock.now(); }
  const offset = clock.audioOffset;
  // the device stalls: currentTime stops for two seconds, the state still says running
  const frozen = ctx.currentTime;
  const t0 = clock.now();
  for (let i = 0; i < 125; i++) { advance(0.016); ctx.currentTime = frozen; clock.now(); }
  const t1 = clock.now();
  assert.ok(Math.abs(t1 - t0 - 2) < 0.3, `the clock went on (${t1 - t0} s in 2)`);
  assert.ok(t1 > t0);
  // it comes back, restarted from zero (a new device)
  ctx.currentTime = 0;
  const before = clock.now();
  advance(0.016);
  const after = clock.now();
  assert.ok(after > before && after - before < 0.05, `the time went on smoothly (${after - before})`);
  for (let i = 0; i < 100; i++) { advance(0.016); ctx.currentTime += 0.016; clock.now(); }
  assert.notEqual(clock.audioOffset, offset, 'the offset is the new one');
  assert.ok(Math.abs(clock.audioTime(clock.now()) - ctx.currentTime) < 0.01);
  assert.ok(clock.now() <= perf() + 3, 'and the clock did not run away');
});

test('a context that is not running is not followed', () => {
  const { clock, ctx, advance, perf } = rig({ drift: 1.01 });
  clock.attach(ctx);
  clock.playing = true;
  ctx.state = 'suspended';
  for (let i = 0; i < 100; i++) advance(0.016);
  assert.equal(clock.now(), perf());
  assert.equal(clock.locked, false);
  ctx.state = 'running';
  clock.now();
  assert.equal(clock.locked, true);
});

test('detach lets go of the audio clock for good', () => {
  const { clock, ctx, advance } = rig();
  clock.attach(ctx);
  clock.playing = true;
  advance(0.1);
  clock.now();
  assert.equal(clock.locked, true);
  clock.detach();
  advance(0.1);
  clock.now();
  assert.equal(clock.locked, false);
  assert.equal(clock.playing, false);
  assert.ok(Number.isNaN(clock.audioTime(1)));
});

test('tick counts a 60 Hz line whatever the frame rate: the same time is the same tick at 30, 60 and 144 fps', () => {
  const { clock } = rig();
  clock.render({ fps: 60 });
  const at = (t) => { clock.set(t); return clock.tick; };
  for (let k = 0; k < 600; k++) assert.equal(at(k / 60), k, `frame ${k} at 60 fps`);
  for (let k = 0; k < 300; k++) assert.equal(at(k / 30), 2 * k, `frame ${k} at 30 fps`);
  clock.render({ fps: 144 });
  for (let k = 0; k < 144 * 3; k++) assert.equal(at(k / 144), Math.floor((k / 144) * 60 + 1e-6));
  assert.equal(at(1), 60);
  assert.equal(at(12.345), Math.floor(12.345 * 60));
});

test('frame is the tick while live', () => {
  const { clock, advance } = rig();
  advance(1.2345);
  assert.equal(clock.frame, clock.tick);
  assert.equal(clock.tick, Math.floor(clock.now() * 60 + 1e-6));
});

test('clock.rng: the same seed, salt and moment are the same dice, and anything else is other dice', () => {
  const { clock } = rig({ seed: 7 });
  clock.render({ t0: 2 });
  const first = Array.from({ length: 8 }, ((r) => () => r())(clock.rng('glitch')));
  const again = Array.from({ length: 8 }, ((r) => () => r())(clock.rng('glitch')));
  assert.deepEqual(first, again, 'asked twice in a frame: the same numbers');
  for (const x of first) assert.ok(x >= 0 && x < 1);
  const stream = (salt, key) => { const r = key === undefined ? clock.rng(salt) : clock.rng(salt, key); return [r(), r(), r(), r()]; };
  assert.notDeepEqual(stream('glitch'), stream('sparkle'), 'another salt');
  assert.notDeepEqual(stream('glitch', 1), stream('glitch', 2), 'another moment');
  assert.deepEqual(stream('glitch', 5), stream('glitch', 5));
  assert.deepEqual(stream(3, 5), stream(3, 5));
  assert.notDeepEqual(stream(3, 5), stream(4, 5));
  const before = stream('glitch');
  clock.set(2 + 1 / 60);
  assert.notDeepEqual(stream('glitch'), before, 'the next tick');
  clock.set(2);
  assert.deepEqual(stream('glitch'), before, 'and the first again, drawn a second time');
  clock.seed = 8;
  assert.notDeepEqual(stream('glitch'), before, 'another song');
  assert.equal(clock.newSong(99), 99);
  assert.equal(clock.seed, 99);
  clock.render({ t0: 0 });
  clock.render({ seed: 7 });
  assert.equal(clock.newSong(), 7, 'in a render a new song with no seed given keeps the take\'s');
  assert.equal(clock.newSong(8), 8);
  clock.live();
  assert.notEqual(clock.newSong(), 8, 'live, a new song with none given gets a new one');
  clock.render({ t0: 2 });
  clock.seed = 99;
  // two clocks with one seed roll one set of dice
  const other = createClock({ perf: () => 5 });
  other.seed = 99; other.render({ t0: 2 });
  clock.seed = 99;
  assert.deepEqual([...Array(5)].map(((r) => () => r())(other.rng('x'))), [...Array(5)].map(((r) => () => r())(clock.rng('x'))));
  // a render takes the seed of its take
  clock.render({ seed: 1234 });
  assert.equal(clock.seed, 1234);
});

test('a new song gets a seed of its own', () => {
  const { clock } = rig({ seed: 5 });
  assert.equal(clock.seed, 5);
  let n = 1000;
  const c = createClock({ entropy: () => (n += 17) });
  const seeds = new Set([c.seed, c.newSong(), c.newSong(), c.newSong()]);
  assert.equal(seeds.size, 4);
});

// ---------------------------------------------------------------- random.js

// the published algorithm, written out the plain way, to check ours against
function reference(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('mulberry32 is the published generator, in [0, 1), and the same every time', () => {
  for (const seed of [0, 1, 42, 0xdeadbeef, 2 ** 32 - 1, -5]) {
    const ours = mulberry32(seed), theirs = reference(seed);
    for (let i = 0; i < 2000; i++) assert.equal(ours(), theirs());
  }
  const r = mulberry32(2024);
  const xs = Array.from({ length: 20000 }, r);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.01, `mean ${mean}`);
  const buckets = new Array(10).fill(0);
  for (const x of xs) buckets[Math.floor(x * 10)]++;
  for (const b of buckets) assert.ok(b > 1800 && b < 2200, `a bucket of ${b}`);
  assert.deepEqual(Array.from({ length: 3 }, mulberry32(1)), Array.from({ length: 3 }, mulberry32(1)));
  assert.notDeepEqual(Array.from({ length: 3 }, mulberry32(1)), Array.from({ length: 3 }, mulberry32(2)));
});

test('hash32 folds numbers and strings into a seed: order, type and every bit count', () => {
  assert.equal(hash32('a', 1), hash32('a', 1));
  assert.notEqual(hash32('a', 1), hash32(1, 'a'));
  assert.notEqual(hash32('1'), hash32(1));
  assert.notEqual(hash32(1, 2), hash32(2, 1));
  assert.notEqual(hash32('ab', 'c'), hash32('a', 'bc'));
  assert.equal(hash32(0.5), hash32(0.5));
  assert.notEqual(hash32(0.5), hash32(0.500001));
  assert.notEqual(hash32(2 ** 33), hash32(0));
  assert.ok(hash32('x', -1) >= 0 && hash32('x', -1) < 2 ** 32);
  // neighbouring moments are unrelated seeds: about half of the 32 bits differ
  let bits = 0;
  const n = 2000;
  for (let k = 0; k < n; k++) {
    let x = hash32(12345, 'glitch', k) ^ hash32(12345, 'glitch', k + 1), c = 0;
    while (x) { c += x & 1; x >>>= 1; }
    bits += c;
  }
  const mean = bits / n;
  assert.ok(mean > 14 && mean < 18, `${mean} bits differ on average`);
});

// ---------------------------------------------------------------- simulate and pulses

import { simulate } from '../renderer/clock.js';
import { createPulses } from '../renderer/pulse.js';

test('simulate: the state at a time is the same however often it was drawn, 60 fps or 30 or 7', () => {
  const run = (fps, until) => {
    // a thing that eases toward a target that jumps, kicked at fixed times (events with times), stepped on the grid
    const hits = [0.31, 0.77, 1.4, 1.43];
    let x = 0, v = 0;
    const sim = simulate(240, (st, h) => {
      const kicked = hits.filter((t) => t > st - h && t <= st).length;
      v += kicked * 3;
      v *= Math.exp(-h * 4);
      x += (v - x) * (1 - Math.exp(-h * 10));
    });
    for (let k = 0; k <= Math.round(until * fps); k++) sim.advance(k / fps);
    return x;
  };
  const a = run(60, 2), b = run(30, 2), c = run(120, 2), d = run(8, 2);
  assert.equal(a, b);
  assert.equal(a, c);
  assert.equal(a, d);
  assert.ok(Math.abs(a) > 1e-9, 'it moved');
});

test('simulate: the first call only starts the grid, a long gap runs only the last `max`, and a clock that goes back starts again', () => {
  const steps = [];
  let rewound = 0;
  const sim = simulate(100, (st) => steps.push(st), { max: 0.5, rewound: () => rewound++ });
  assert.equal(sim.at, null);
  assert.equal(sim.advance(10), 0);
  assert.equal(sim.at, 10);
  assert.equal(sim.advance(10.05), 5);
  assert.deepEqual(steps.slice(0, 2), [10.01, 10.02]);
  steps.length = 0;
  assert.equal(sim.advance(60), 50, 'a gap of 50 s: the last half second');
  assert.ok(Math.abs(steps[0] - 59.51) < 1e-9 && Math.abs(steps.at(-1) - 60) < 1e-9);
  assert.equal(sim.advance(60), 0, 'no time passed: no steps');
  assert.equal(sim.advance(5), 0);
  assert.equal(rewound, 1);
  assert.equal(sim.at, 5);
  assert.equal(sim.advance(5.02), 2);
  sim.reset();
  assert.equal(sim.at, null);
});

test('pulses: a hit\'s glow worked out from its time is what the per-frame decay computes with frames of no length', () => {
  const tau = 0.15, hits = [[0.2, 0.6], [0.25, 1], [1.0, 0.8]];
  const p = createPulses(tau);
  for (const [t, level] of hits) p.hit(level, t);
  // the old way, at 1 ms a frame: a number that jumped to its level and was multiplied by a fraction each frame
  let old = 0;
  const dt = 0.0005;
  for (let t = 0; t <= 2.0001; t += dt) {
    for (const [ht, level] of hits) if (t > ht - dt / 2 && t <= ht + dt / 2) old = Math.max(old, level);
    // (compared 20 times a second, but not within a frame of a hit: a hit at the very time is on one side of it or the other)
    if (Math.abs(Math.round(t * 20) / 20 - t) < dt / 2 && hits.every(([ht]) => Math.abs(t - ht) > 3 * dt)) assert.ok(Math.abs(p.at(t) - old) < 0.01, `${t}: ${p.at(t)} against ${old}`);
    old *= Math.exp(-dt / tau);
  }
  assert.equal(p.at(0.1), 0, 'before the first hit: nothing');
  assert.equal(p.at(0.2), 0.6);
  assert.ok(p.at(0.25) > 0.99 && p.at(0.25) <= 1);
  assert.equal(p.last.level, 0.8);
  p.clear();
  assert.equal(p.at(1), 0);
});

test('pulses: the same at any frame rate, and old hits are forgotten without changing what the new ones do', () => {
  const p = createPulses(0.2);
  for (let k = 0; k < 400; k++) p.hit(0.5 + (k % 3) / 6, k * 0.1);
  const t = 39.97;
  const at = p.at(t);
  assert.equal(p.at(t), at);
  const q = createPulses(0.2);
  for (let k = 390; k < 400; k++) q.hit(0.5 + (k % 3) / 6, k * 0.1);
  assert.equal(q.at(t), at, 'the hits long gone do not matter');
});

// ---------------------------------------------------------------- dom-time.js

import { createAnimationDriver } from '../renderer/dom-time.js';

test('dom-time: in a render each CSS animation takes its age from the clock, paused, from the time it was first met', () => {
  const made = (currentTime = 0) => ({ currentTime, playState: 'running', pauses: 0, pause() { this.playState = 'paused'; this.pauses++; } });
  const flash = made(), caret = made(40); // (one just made; one already 40 ms old when first met)
  const animations = [flash];
  const doc = { getAnimations: () => animations };
  const drive = createAnimationDriver(doc);
  assert.equal(drive(10), 1);
  assert.equal(flash.playState, 'paused');
  assert.equal(flash.currentTime, 0);
  animations.push(caret);
  assert.equal(drive(10.2), 2);
  assert.ok(Math.abs(flash.currentTime - 200) < 1e-9, 'the flash is 200 ms old at 10.2');
  assert.ok(Math.abs(caret.currentTime - 40) < 1e-9, 'the caret was 40 ms old when met, and no time has gone');
  drive(10.5);
  assert.ok(Math.abs(flash.currentTime - 500) < 1e-9);
  assert.ok(Math.abs(caret.currentTime - 340) < 1e-9);
  drive(10.5);
  assert.ok(Math.abs(flash.currentTime - 500) < 1e-9, 'drawn again at the same time: the same age');
  assert.equal(flash.pauses, 1, 'paused once');
  // going back in time (a render starting again): ages never negative
  drive(9);
  assert.equal(flash.currentTime, 0);
  // one that cannot be set does not stop the others
  const bad = { get currentTime() { return 0; }, set currentTime(v) { throw new Error('gone with its element'); }, playState: 'finished', pause() {} };
  animations.push(bad);
  drive(11);
  assert.ok(Math.abs(flash.currentTime - 1000) < 1e-9, 'a second after it was met at 10');
  assert.equal(createAnimationDriver({})(1), 0, 'a document with no animations api: nothing to do');
});

test('dom-time: what ran before the first drive (the CRT\'s roll, started at boot in real time) is met as new there, whatever its real age (B8 a)', () => {
  const made = (currentTime) => ({ currentTime, playState: 'running', pause() { this.playState = 'paused'; } });
  for (const bootMs of [30, 2400, 9100]) { // (a page that took 30 ms, 2.4 s, 9 s from showing the tube to the first drive)
    const roll = made(bootMs), flick = made(bootMs + 7), animations = [roll, flick];
    const drive = createAnimationDriver({ getAnimations: () => animations });
    drive(12.5);
    assert.deepEqual([roll.currentTime, flick.currentTime], [0, 0], `after ${bootMs} ms of real time: both begin at 12.5`);
    drive(13);
    assert.deepEqual([roll.currentTime, flick.currentTime].map(Math.round), [500, 500], 'and are the same half second on');
    const later = made(40); // one made after the first drive keeps its age when met, as before
    animations.push(later);
    drive(13.2);
    assert.equal(Math.round(later.currentTime), 40);
    assert.equal(Math.round(roll.currentTime), 700);
  }
  // the first drive is the page's start only: one met at a later drive began in the render, and keeps the age it had
  const animations = [], drive = createAnimationDriver({ getAnimations: () => animations });
  drive(1);
  const roll = made(120);
  animations.push(roll);
  drive(2);
  assert.equal(Math.round(roll.currentTime), 120);
});

test('dom-time: an element made at a time of its own (data-born) starts its animations then, whenever the driver meets it', () => {
  // (fx.js's closing alert, made on a 60 Hz step while a frame is drawn: met at the next tick, which comes at a different
  // time at 60 frames a second than at 30; and the balloon, shown at the second bar by whichever frame sees it)
  const el = (born) => ({ closest: (sel) => (sel === '[data-born]' && born !== undefined ? { dataset: { born: String(born) } } : null) });
  const made = (target, currentTime = 12) => ({ currentTime, playState: 'running', effect: { target }, pause() { this.playState = 'paused'; } });
  const alert = made(el(9.95)), early = made(el(10.5)), plain = made(el());
  const animations = [], drive = createAnimationDriver({ getAnimations: () => animations });
  drive(9); // (the page's first drive is its start, see B8 a's test above: these three come after it)
  animations.push(alert, early, plain);
  drive(10);
  assert.ok(Math.abs(alert.currentTime - 50) < 1e-9, 'born at 9.95, met at 10: 50 ms old, whatever age the browser gave it');
  assert.ok(Math.abs(early.currentTime - 12) < 1e-9, 'a birth time after now is not taken: as with no birth time');
  assert.ok(Math.abs(plain.currentTime - 12) < 1e-9, 'no birth time: the age it had when met, as before');
  drive(10.2);
  assert.ok(Math.abs(alert.currentTime - 250) < 1e-9);
});

// ---------------------------------------------------------------- clock.after

// a clock whose timers are the test's own: setTimer(fn, ms) is kept, clearTimer drops it, and run() fires what is due
function timed() {
  const kept = [];
  let id = 0, p = 100;
  const clock = createClock({
    perf: () => p, entropy: () => 1,
    setTimer: (fn, ms) => { const h = ++id; kept.push({ h, fn, ms }); return h; },
    clearTimer: (h) => { const i = kept.findIndex((k) => k.h === h); if (i >= 0) kept.splice(i, 1); },
  });
  return { clock, kept, run: () => kept.splice(0).forEach((k) => k.fn()) };
}

test('clock.after, live, is a setTimeout in milliseconds, and what it returns cancels it', () => {
  const { clock, kept, run } = timed();
  const log = [];
  clock.after(0.06, () => log.push('a'));
  const cancel = clock.after(2.2, () => log.push('b'));
  assert.deepEqual(kept.map((k) => k.ms), [60, 2200]);
  cancel();
  assert.equal(kept.length, 1, 'cancelled before it ran: gone');
  run();
  assert.deepEqual(log, ['a']);
  cancel(); // (cancelling one that has run, or twice, is nothing)
  clock.after(-5, () => log.push('now')); // (a negative or missing time is 0, like setTimeout's)
  clock.after(undefined, () => log.push('now2'));
  assert.deepEqual(kept.map((k) => k.ms), [0, 0]);
});

test('clock.after, in a render, runs when set() takes the clock past its time: in order of time, with the time its own', () => {
  const { clock, kept } = timed();
  clock.render({ fps: 30, t0: 10 });
  const log = [];
  const at = (label) => () => log.push([label, clock.now()]);
  clock.after(0.5, at('half'));
  clock.after(0.1, at('tenth'));
  clock.after(0.1, at('tenth, made second'));
  clock.after(1, at('second'));
  assert.equal(kept.length, 0, 'a render sets no real timers');
  clock.set(10.05);
  assert.deepEqual(log, []);
  clock.set(10.1); // (a timer at 10.1 is due at 10.1)
  assert.deepEqual(log, [['tenth', 10.1], ['tenth, made second', 10.1]]);
  clock.set(11.5); // one frame carrying the clock past two: both run, the earlier first, each at its own time
  assert.deepEqual(log.slice(2), [['half', 10.5], ['second', 11]]);
  assert.equal(clock.now(), 11.5, 'and the clock is where it was set');
  clock.set(12);
  assert.equal(log.length, 4, 'each runs once');
});

test('clock.after in a render: one timer can make another, which runs in the same set() if its time has come; cancel works; a bad one does not stop the rest', () => {
  const { clock } = timed();
  clock.render({ t0: 0 });
  const log = [];
  clock.after(1, () => { log.push(['one', clock.now()]); clock.after(0.5, () => log.push(['one+0.5', clock.now()])); clock.after(5, () => log.push('far')); });
  const never = clock.after(2, () => log.push('never'));
  clock.after(1.2, () => { throw new Error('a timer that fails'); });
  clock.after(1.9, () => log.push(['last', clock.now()]));
  never();
  const errors = [];
  const was = console.error; console.error = (e) => errors.push(e.message);
  try { clock.set(3); } finally { console.error = was; }
  assert.deepEqual(log, [['one', 1], ['one+0.5', 1.5], ['last', 1.9]], 'the one made inside fires at its own time (1 + 0.5), the cancelled one never');
  assert.deepEqual(errors, ['a timer that fails']);
  clock.set(10);
  assert.ok(log.includes('far'), 'the far one runs when its time comes (1 + 5 = 6)');
});

test('clock.after: live() lets the ones waiting go on in real time for what was left, and render() starts a take without the old ones', () => {
  const { clock, kept, run } = timed();
  clock.render({ t0: 50 });
  const log = [];
  const cancel = clock.after(0.7, () => log.push('left'));
  clock.after(0.2, () => log.push('soon'));
  clock.set(50.1);
  clock.live();
  assert.deepEqual(kept.map((k) => Math.round(k.ms)).sort((a, b) => a - b), [100, 600], 'the time that was left of each, in ms');
  run();
  assert.deepEqual(log.sort(), ['left', 'soon']);
  // a cancel from the render's time still works after the hand-over
  clock.render({ t0: 0 });
  const c2 = clock.after(1, () => log.push('x'));
  clock.live();
  assert.equal(kept.length, 1);
  c2();
  assert.equal(kept.length, 0);
  // a new render drops what the last one left waiting
  clock.render({ t0: 0 });
  clock.after(1, () => log.push('stale'));
  clock.render({ t0: 0 });
  clock.set(5);
  assert.ok(!log.includes('stale'));
  cancel(); // (and a cancel of one that already ran is nothing)
});

test('clock.timerHook is told the time of each timer after it has run, in a render, in order', () => {
  const { clock } = timed();
  const told = [];
  clock.timerHook = (at) => told.push(at);
  clock.render({ t0: 0 });
  clock.after(0.3, () => told.push('ran 0.3'));
  clock.after(0.1, () => told.push('ran 0.1'));
  clock.set(1);
  assert.deepEqual(told, ['ran 0.1', 0.1, 'ran 0.3', 0.3]);
  assert.equal(typeof clock.timerHook, 'function');
});
