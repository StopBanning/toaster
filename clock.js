// One clock for everything that moves.
//
// Every picture Toaster draws is a function of a time, and that time comes from here: clock.now(), in seconds. Nothing
// that animates reads performance.now(), Date.now() or a requestAnimationFrame timestamp for it any more, and nothing
// rolls Math.random() at draw time (see random.js and clock.rng below). The point is that a frame is then a function
// of a time and of what the engine heard (its hits, with their times): the same time gives the same picture, whatever
// the frame rate, and whether the page is playing live or being drawn again from a take, one frame at a time, as fast
// as it can (the perfect-copy export, stream B).
//
//   clock.now()            seconds. Live: on the audio clock while a song plays, on the performance clock otherwise,
//                          one smooth line either way (see "live" below). Render: the time clock.set() last gave.
//   clock.mode             'live' or 'render'.
//   clock.set(t, frame?)   the render driver's: go to time t (and say which frame it is, else it is worked out from
//                          the fps). The first set() puts the clock in render mode.
//   clock.frame            render: the frame index (set()'s, else round((t - t0) * fps)). Live: clock.tick.
//   clock.tick             floor(now * 60): "the frame" for dice and for anything that changes in steps. It is
//                          counted on a 60 Hz line whatever the frame rate, so the same time is the same tick at 30
//                          fps, at 60 and at 144, and a glitch seeded by it is the same glitch.
//   clock.render({ fps, t0, seed })   enter render mode explicitly (set() does it by itself if you don't).
//   clock.live()           back to live. The live line carries on where it was, as if the render took no time at all
//                          to the page's own clock: nothing live is left half-way.
//   clock.attach(ctx), clock.detach()   the audio clock: an AudioContext (anything with currentTime and state).
//   clock.playing = bool   a song plays (a source is attached): the live clock follows the audio clock now.
//   clock.audioTime(t), clock.fromAudio(a), clock.audioOffset
//                          the live clock is the audio clock plus a constant: audioTime(t) is where t falls on the
//                          AudioContext's own line (what ctx.currentTime reads, to within a callback's length, a
//                          few ms), fromAudio() the other way, and audioOffset is the constant (t - audioTime(t)).
//                          For the take: log clock times, and map them onto the PCM captured from the same context.
//   clock.seed             a 32-bit number for this song. A new song gets a new one (clock.newSong(); not in a render,
//                          where the seed is the take's: clock.render({ seed }) sets it), so the dice roll the same.
//   simulate(hz, step)     (exported) a state that moves is run in fixed steps on the clock's own grid, not once a frame:
//                          advance(t) calls step(stepTime, 1 / hz) for each step of the grid up to t that has not been
//                          run yet. The state after advance(t) is then a function of t alone: a picture drawn at 60 fps
//                          and one at 30 fps have run the same steps, in the same order, on the same inputs.
//   clock.after(sec, fn)   setTimeout on the clock, for a picture's own timers (a class that comes off 60 ms after a kick):
//                          live, a setTimeout; in a render, fn runs when set() takes the clock past its time, in the
//                          order of their times, with now() the timer's own time while it runs. Returns a function that
//                          cancels it. (live() lets the ones still waiting carry on in real time for what is left.)
//   clock.rng(salt, key?)  a seeded generator (mulberry32) for this seed, this kind of dice (salt: a string or an
//                          integer) and this moment (key: default the tick; give your own, a hit's time in ms or an
//                          object's number, for dice that belong to a thing rather than to a frame). The same
//                          (seed, salt, key) is always the same sequence; ask for it again in the same frame and you
//                          get the same numbers, so give two uses of dice in one frame two salts.
//
// Live: smooth and continuous. The performance clock is smooth but only keeps its own time; the audio clock is the
// time of the sound but it moves in steps, one per audio callback (3 to 21 ms), which would make an animation
// stutter. So the live clock is the performance clock, steered slowly by the audio clock's drift (a delay-locked loop:
// the offset between the two is averaged over about a second, and a gap of a quarter second is not drift but a
// restart, taken as it is). Taking hold of the audio clock or letting go of it never moves the time: the offset
// is set so that what now() says carries straight on. And it never goes back.
//
// A render, step by step (tools/clock-harness-page.js is the working example):
//   clock.render({ fps, t0, seed });                       // the take's seed
//   for each tick ti of the engine up to the frame's time t:
//     clock.set(ti); eng.frame(ti, ti) (on the take's sound); __nc.codeTick(ti);   // codeTick: the code typed and lit, the
//                                                                                  // footer's words, the CSS animations' ages
//   clock.set(t, k); await __nc.prepareFrame(t); __nc.drawFrame(t);                // then capture, and on to the next frame
//   clock.live();
// The pictures that move step on what the engine heard at the time of each step (it keeps its last 256 ticks: eng.dbAt, midAt,
// timeAt, levelAt, chromaAt, silentAt, bpmAt, renumberAt and stepAt(t, asOf)) and take a hit in at the step after the engine
// filed it (hit.known, the time of the tick that filed it), so a render has to run the engine's ticks in order, as the page does
// live, with the frames in between: it cannot put in just the state at each frame's time.
//
// A module that should work with or without this file can read it from the global: clock?.now() ?? performance.now() / 1000.

import { hash32, mulberry32 } from './random.js';

export const TICK_HZ = 60;
const SYNC_EVERY = 0.004; // s, the audio clock is read at most this often
const TAU = 1; // s, how slowly the offset to the audio clock is followed
const JUMP = 0.25; // s, an offset this far from the average is a restart, not drift
const STALL = 0.25; // s, an audio clock that has not moved for this long is not followed

const defaultPerf = () => performance.now() / 1000;
const defaultEntropy = () => {
  try { return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return (Date.now() ^ (performance.now() * 1000)) >>> 0; }
};
const hashSalt = (salt) => (typeof salt === 'string' ? salt : String(salt | 0));

export function createClock({ perf = defaultPerf, entropy = defaultEntropy, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (h) => clearTimeout(h) } = {}) {
  let mode = 'live', seed = entropy() >>> 0;
  // render
  let renderT = 0, renderFrame = 0, t0 = 0, fps = TICK_HZ;
  // timers on the clock (clock.after) waiting for their time, in a render
  let waiting = [], madeTimers = 0, timerHook = null;
  const byTime = (a, b) => a.at - b.at || a.n - b.n;
  function fire(upTo) {
    for (;;) {
      let next = null;
      for (const timer of waiting) if (timer.at <= upTo && (!next || byTime(timer, next) < 0)) next = timer;
      if (!next) return;
      waiting.splice(waiting.indexOf(next), 1);
      renderT = next.at; // (inside it, it is its own time: what it makes goes on from there)
      next.done = true;
      try { next.fn(); timerHook?.(next.at); } catch (err) { console.error(err); }
    }
  }
  // live: now = perf + shift. While locked on the audio clock, shift = A - off, where off is the averaged
  // (performance time - audio time) and A the constant that kept the time where it was when the lock began.
  let shift = 0, lastLive = -Infinity;
  let audio = null, playing = false, locked = false, off = null, A = NaN, lastRead = -Infinity, lastA = NaN, lastMoved = 0;

  function follow(p) {
    if (p - lastRead < SYNC_EVERY) return;
    const a = audio.currentTime;
    if (!(a >= 0)) return;
    if (a !== lastA) { lastA = a; lastMoved = p; } else if (p - lastMoved > STALL) return; // (a clock that stopped: the performance clock carries on)
    const dt = Math.min(1, p - lastRead);
    lastRead = p;
    const obs = p - a;
    if (off === null) { off = obs; A = shift + obs; return; } // (taking hold: the time stays exactly where it is)
    if (Math.abs(obs - off) > JUMP) { A += obs - off; off = obs; } // (a restart: the time stays, the offset is new)
    else off += (obs - off) * (1 - Math.exp(-dt / TAU));
    shift = A - off;
  }

  function live() {
    const p = perf();
    const on = !!audio && playing && (audio.state === undefined || audio.state === 'running');
    if (on !== locked) { locked = on; if (on) lastRead = -Infinity; } // (letting go keeps the offset and taking hold again goes on from it)
    if (locked) follow(p);
    const c = p + shift;
    if (c > lastLive) lastLive = c;
    return lastLive;
  }

  const clock = {
    now() { return mode === 'render' ? renderT : live(); },
    get mode() { return mode; },
    get fps() { return fps; },
    get t0() { return t0; },
    get tick() { return Math.floor(clock.now() * TICK_HZ + 1e-6); },
    get frame() { return mode === 'render' ? renderFrame : clock.tick; },

    render({ fps: rate = TICK_HZ, t0: start = 0, seed: s } = {}) {
      if (!(rate > 0) || !Number.isFinite(rate)) throw new TypeError('clock.render: fps must be a positive number');
      if (!Number.isFinite(start)) throw new TypeError('clock.render: t0 must be a time in seconds');
      mode = 'render'; fps = rate; t0 = start; renderT = start; renderFrame = 0; waiting = [];
      if (s !== undefined) seed = s >>> 0;
      return clock;
    },
    set(t, frame) {
      if (!Number.isFinite(t)) throw new TypeError('clock.set: a time in seconds');
      if (mode !== 'render') clock.render({ t0: t });
      fire(t);
      renderT = t;
      renderFrame = Number.isFinite(frame) ? frame : Math.round((t - t0) * fps);
      return clock;
    },
    live() {
      if (mode === 'render') {
        mode = 'live';
        // (the timers still waiting for their time carry on in real time, for the time that was left)
        for (const timer of waiting.sort(byTime)) timer.handle = setTimer(() => { timer.done = true; timer.fn(); }, Math.max(0, (timer.at - renderT) * 1000));
        waiting = [];
      }
      return clock;
    },
    // (called with a timer's time after it has run, in a render: the page puts the CSS animations a timer started on the clock
    // from that time, not from whenever the next frame is)
    get timerHook() { return timerHook; },
    set timerHook(fn) { timerHook = fn; },
    after(sec, fn) {
      const ms = Number.isFinite(sec) && sec > 0 ? sec * 1000 : 0;
      const timer = { at: renderT + ms / 1000, n: madeTimers++, fn, handle: null, done: false };
      if (mode === 'render') waiting.push(timer);
      else timer.handle = setTimer(() => { timer.done = true; fn(); }, ms);
      return function cancel() {
        if (timer.done) return;
        timer.done = true;
        if (timer.handle !== null) clearTimer(timer.handle);
        const i = waiting.indexOf(timer);
        if (i >= 0) waiting.splice(i, 1);
      };
    },

    attach(ctx) { audio = ctx || null; locked = false; off = null; A = NaN; return clock; },
    detach() { audio = null; playing = false; locked = false; off = null; A = NaN; return clock; },
    get playing() { return playing; },
    set playing(on) { playing = !!on; },
    get locked() { return locked; },
    get audioOffset() { return A; },
    audioTime(t = clock.now()) { return audio ? t - A : NaN; },
    fromAudio(a) { return audio ? a + A : NaN; },

    get seed() { return seed; },
    set seed(s) { seed = s >>> 0; },
    // A new song: a seed of its own (random, unless one is given). In a render the seed is the take's: a new song starting
    // in the page's own code (freshStart) leaves it be, unless one is given.
    newSong(s) { if (s !== undefined) seed = s >>> 0; else if (mode !== 'render') seed = entropy() >>> 0; return seed; },
    rng(salt = '', key = clock.tick) { return mulberry32(hash32(seed, hashSalt(salt), key)); },
  };
  return clock;
}

export const clock = createClock();
globalThis.clock = clock;

// A simulation in fixed steps on an absolute grid (step n is at n / hz seconds, on every machine, at every frame
// rate). Drawing calls advance(t): every step up to t that has not been run is run now, in order, with its own time,
// so the state a picture is drawn from does not depend on how often it was drawn. step(time, h) reads what moves it at
// `time` (the hits' timestamps, the engine's history: eng.dbAt(time), eng.levelAt(time)), never "now". The first call
// only starts the grid (no steps: the state is as it was made); a gap of more than `max` seconds (a stalled page, a
// background that was off) runs only the last `max` of it; a clock that has gone back (a render started again) starts
// the grid again here, and calls rewound() first if it was given, so what depended on the past can let go of it.
export function simulate(hz, step, { max = 0.25, rewound } = {}) {
  let n = null;
  const grid = (t) => Math.floor(t * hz + 1e-6);
  return {
    hz,
    advance(t) {
      if (!Number.isFinite(t)) return 0;
      const target = grid(t);
      if (n === null) { n = target; return 0; }
      if (target < n) { n = target; rewound?.(); return 0; }
      if (target - n > max * hz) n = target - Math.round(max * hz);
      let steps = 0;
      while (n < target) { n++; step(n / hz, 1 / hz); steps++; }
      return steps;
    },
    // the step the grid is at, as a time (the last one run), or null before the first call
    get at() { return n === null ? null : n / hz; },
    reset() { n = null; },
  };
}
