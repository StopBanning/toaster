// The perfect take's render mode (stream B): the app page, opened in the render's hidden window
// (helpers/take-render.cjs), listens again to a take's own sound and draws it one exact frame at a time.
//
// The take (helpers/take-store.cjs) is the sound from a run-up before M to the stop, what the page was like at M (its
// settings and storage, restored by the preload before the app starts, so it boots as it was), and the settings that changed
// during the take, with their times. Here:
// - the engine's analysers answer from the take's sound (an FFT of our own, as an AnalyserNode does with no smoothing: a
//   Blackman window, the magnitude over the window's length, in dB), at the clock's time, the clock in render mode;
// - the engine runs tick by tick, as live, from the start of the run-up, and the code is typed on the same ticks;
// - through the run-up the frames are drawn but not kept, so what builds up over time (the walk, the water) has built up;
// - then each frame the render asks for is drawn at its time, after the ticks up to it, and answered once the look it shows is
//   ready (a shader still compiling, a picture still loading: waited for, the same moment drawn again, so the wait changes nothing).
// It is NOT a copy of the pixels that were on screen: Toaster listens again, frame-exact and in sync, and the same take
// always comes out the same. (Live isn't repeatable: the same song played twice already differs a little.)

export const TICK = 0.015; // the engine's timer, the app's 15 ms
const RUNUP_FPS = 8; // frames drawn a second in the run-up (enough for the pictures' fixed steps, which catch up 0.25 s at most)

// ---------------------------------------------------------------- an FFT of our own
const plans = new Map();
function plan(n) {
  if (plans.has(n)) return plans.get(n);
  const bits = Math.log2(n), rev = new Uint32Array(n), cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), win = new Float64Array(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n); }
  for (let i = 0; i < n; i++) win[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / n) + 0.08 * Math.cos((4 * Math.PI * i) / n); // (Blackman, a = 0.16)
  const p = { rev, cos, sin, win, re: new Float64Array(n), im: new Float64Array(n) };
  plans.set(n, p);
  return p;
}
// the n samples of x before sample `end`, windowed, transformed (silence outside the take)
function transform(x, n, end) {
  const p = plan(n), { re, im, rev, cos, sin, win } = p;
  for (let i = 0; i < n; i++) { const s = end - n + i; re[rev[i]] = s >= 0 && s < x.length ? x[s] * win[i] : 0; im[rev[i]] = 0; }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half, tr = re[b] * cos[k] - im[b] * sin[k], ti = re[b] * sin[k] + im[b] * cos[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  return p;
}

// The analysers' two reads, answered from a mono sound x at sample rate sr, as of the sound's sample at(): replaces the
// methods on these analysers only (the page's other analysers, if any, are left be).
export function answerFrom(analysers, x, at) {
  for (const a of analysers) {
    a.getFloatFrequencyData = (out) => {
      const n = a.fftSize, p = transform(x, n, at());
      for (let k = 0; k < n / 2 && k < out.length; k++) {
        const m = Math.hypot(p.re[k], p.im[k]) / n;
        out[k] = m > 1e-10 ? 20 * Math.log10(m) : -200;
      }
    };
    a.getFloatTimeDomainData = (out) => {
      const n = a.fftSize, end = at();
      for (let i = 0; i < out.length; i++) { const s = end - n + i; out[i] = s >= 0 && s < x.length ? x[s] : 0; }
    };
  }
}

// Two channels to one, as an AnalyserNode hears them: half of each.
export function mono(planes) {
  if (planes.length === 1) return planes[0];
  const out = new Float32Array(planes[0].length);
  for (let i = 0; i < out.length; i++) { let s = 0; for (const p of planes) s += p[i]; out[i] = s / planes.length; }
  return out;
}

// Which of the settings that changed during the take are due by time t (each { t, set: { key: value } }), in order.
export function due(changes, from, t) {
  let i = from;
  while (i < changes.length && changes[i].t <= t) i++;
  return i;
}

// The render: n is the page's __nc, take is { meta, sound: Float32Array (mono), changes }, api is window.takeRender.
// meta.t0 is the take's first frame on the clock, meta.soundAt the clock time of the sound's first sample, meta.runup
// the seconds of sound before t0 (so soundAt = t0 - runup), meta.fps, meta.seed.
export async function replay(n, take, api, { apply = () => {}, waitReady = async () => {} } = {}) {
  const { meta, sound, changes = [] } = take, { clock, eng } = n, sr = meta.sampleRate;
  let tickN = Math.ceil((meta.soundAt + 1e-9) / TICK) - 1, nextChange = 0;
  const audioAt = { t: meta.soundAt };
  answerFrom([n.analysers.fast, n.analysers.mid, n.analysers.slow], sound, () => Math.floor((audioAt.t - meta.soundAt) * sr));
  clock.render({ fps: meta.fps, t0: meta.soundAt, seed: meta.seed });
  n.attach(n.ac.createGain(), meta.source || 'file', meta.label || 'perfect copy'); // (a silent source: the app listens as to a file)
  Object.assign(eng, { tick: 0, audioOff: undefined, lastAudioT: undefined }); // (counters a reset keeps: the take's first tick is the first of its kind)
  clock.seed = meta.seed; // (attach started a new song with a seed of its own: the take's is the one it had)
  // (and moved scenes-on-auto to the next scene, as a new source does: the take's counter, and when it last moved, are the live ones)
  if (Number.isInteger(meta.autoScene)) n.setAutoScene?.(meta.autoScene, meta.autoSceneAt);
  if (meta.debugKicks) { const kick = eng.on.kick; eng.on.kick = (s) => { console.log(`take-kick ${clock.now().toFixed(4)} ${s.toFixed(2)}`); kick(s); }; }
  clock.set(meta.soundAt);
  n.view.clear();
  apply(meta.settings || {});
  await waitReady(meta.soundAt); // (its shaders and pictures loaded: drawn at one moment of the clock, so the wait changes nothing)
  // the engine's ticks and the code's, every 15 ms up to t, with the settings that changed on their way and the taps (tap
  // tempo: each at its own time, so the tempo and the bar it sets are the live ones)
  const advance = (t) => {
    for (;;) {
      const tk = (tickN + 1) * TICK;
      if (tk > t + 1e-9) break;
      tickN++;
      const upTo = due(changes, nextChange, tk);
      for (; nextChange < upTo; nextChange++) {
        const c = changes[nextChange];
        if (c.tap) eng.tap(c.t);
        else if (c.drop) { eng.lastDrop = c.t; eng.on.drop(true); } // (D, as the app's key does it)
        else if (c.resume) eng.resume(c.resume); // (a file played on after a pause: its grid moves on, as app.js's followPauses does)
        else apply(c.set);
      }
      audioAt.t = tk;
      clock.set(tk);
      eng.frame(tk, tk);
      n.codeTick(tk);
    }
  };
  // the run-up: heard and drawn, not kept
  for (let t = meta.soundAt; t < meta.t0 - 1e-9; t = Math.min(meta.t0, t + 1 / RUNUP_FPS)) {
    advance(t);
    clock.set(t);
    await n.prepareFrame(t);
    n.drawFrame(t);
    await new Promise((r) => setTimeout(r, 0));
  }
  // (a look the run-up began, or one that begins during the take, is waited for as the first was: its shaders compiled and its
  // pictures loaded, the frame drawn again at the same moment of the clock till they are. Else the frame it first shows on, with
  // the glyph field till then, would be this machine's compile speed, and two copies of one take would differ)
  if (n.lookWaiting?.()) await waitReady(meta.t0);
  api.onDraw(async (k, t) => {
    try {
      advance(t);
      clock.set(t, k);
      await n.prepareFrame(t);
      n.drawFrame(t);
      if (n.lookWaiting?.()) await waitReady(t);
      api.drawn(k);
    } catch (err) { api.failed(err?.message || String(err)); }
  });
  api.ready();
}
