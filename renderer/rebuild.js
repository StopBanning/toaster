// The song rebuilt from its own sounds, for X (Colin's pick, Nov 12: "the new way"). From the four parts the splitter pulls out
// (stems.js: drums, bass, other, vocals), this cuts the song's own sounds and writes where they play, and the Strudel program that
// plays them is written from that same list, so the audio and the code cannot disagree.
//
//   drums: every hit, grouped by how it sounds (a breakbeat chopped into its one-shots), ONE cut of the song per group, on the
//          16th grid, each group keeping its own feel against it (.early/.late). Never snap the record to an exact grid: Colin,
//          blind, on the first try (Nov 13): "the beat or something in the back feels off"; with the feel kept: "fixed".
//          The feel is kept by the 16th's place in the beat as well: records push the "e" and the "a" of a beat early (Eyes Without
//          a Face's hats 21 ms, Somebody That I Used to Know's 30 ms) while the beat itself sits on time; one feel per sound played
//          those hits 10 to 16 ms late (Colin, Nov 13: "maybe the drums are a little bit off"; backlog/engineering/drum-check.mjs).
//   bass:  real notes (YIN on the bass part, a note held while its pitch holds), all played from ONE cut of the song's bass.
//   voice: the singer's phrases, each a sample at its true start.
//   keys:  the rest in half-bar slices; a slice that looks like an earlier one is played from that one.
//
// The recipe and its numbers are the offline proof's (backlog/engineering/rebuild-v2.py, measured on two songs against the record
// with a sound-match number: 0.85 and 0.78). Nothing here is a model; the only model is the splitter before it.

const hz2midi = (f) => 69 + 12 * Math.log2(f / 440);
const NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
export const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const median = (a) => { if (!a.length) return NaN; const s = Float64Array.from(a).sort(), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const percentile = (a, p) => { const s = Float64Array.from(a).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : 0; };

// ---------------------------------------------------------------- an FFT (radix 2, in place) and magnitude frames
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));   // (symmetric, as the proof's numpy)

// Frames of |spectrum|: { S: [Float32Array(bins)], hop (samples), n (fft size), sr }. Sizes follow the rate so that the frames last
// the same 23 ms and step the same 5.8 ms at 22.05 or 44.1 kHz.
export function spectra(x, sr) {
  const n = sr >= 44100 ? 1024 : 512, hop = n >> 2, w = hann(n), S = [];
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let at = 0; at + n <= x.length; at += hop) {
    for (let i = 0; i < n; i++) { re[i] = x[at + i] * w[i]; im[i] = 0; }
    fft(re, im);
    const m = new Float32Array(n / 2 + 1);
    for (let k = 0; k <= n / 2; k++) m[k] = Math.hypot(re[k], im[k]);
    S.push(m);
  }
  return { S, hop, n, sr, fps: sr / hop, bin: sr / n };
}
const bandOf = (sp, lo, hi) => [Math.max(0, Math.ceil(lo / sp.bin)), Math.min(sp.n / 2, Math.ceil(hi / sp.bin) - 1)];
// spectral flux in a band: the rise of log energy (log: so a quiet hat counts) or of plain energy (plain: so bass bleed doesn't
// count as kicks; the log one read 437 "kicks" in a minute)
export function flux(sp, lo, hi, { log = true } = {}) {
  const [a, b] = bandOf(sp, lo, hi), out = new Float64Array(sp.S.length);
  if (log) {
    for (let i = 1; i < sp.S.length; i++) {
      let s = 0;
      for (let k = a; k <= b; k++) { const d = Math.log1p(100 * sp.S[i][k]) - Math.log1p(100 * sp.S[i - 1][k]); if (d > 0) s += d; }
      out[i] = s;
    }
  } else {
    let prev = 0;
    for (let i = 0; i < sp.S.length; i++) {
      let e = 0;
      for (let k = a; k <= b; k++) e += sp.S[i][k] * sp.S[i][k];
      e = Math.sqrt(e); if (i) out[i] = Math.max(0, e - prev); prev = e;
    }
  }
  return out;
}
const runningMean = (a, w) => {
  const out = new Float64Array(a.length), h = w >> 1;
  let s = 0;
  for (let i = 0; i < Math.min(a.length, h); i++) s += a[i];
  for (let i = 0; i < a.length; i++) {
    if (i + h < a.length) s += a[i + h];
    if (i - h - 1 >= 0) s -= a[i - h - 1];
    out[i] = s / w;
  }
  return out;
};
// local peaks above k times their neighbourhood and above rel of the loud ones; two closer than `gap` s keep the louder
export function peaks(fl, fps, rel, { gap = 0.07, k = 1.4 } = {}) {
  const med = runningMean(fl, 43), floor = rel * percentile(fl, 0.99), out = [];
  for (let i = 1; i < fl.length - 1; i++) {
    if (fl[i] > Math.max(k * med[i], floor) && fl[i] >= fl[i - 1] && fl[i] > fl[i + 1]) {
      if (out.length && (i - out[out.length - 1]) / fps < gap) { if (fl[i] > fl[out[out.length - 1]]) out[out.length - 1] = i; }
      else out.push(i);
    }
  }
  return out;
}
// the waveform's own start near a detected hit: where it first reaches a third of its local peak
export function attack(x, sr, t) {
  const a = Math.max(0, Math.floor((t - 0.03) * sr)), b = Math.min(x.length, Math.floor((t + 0.03) * sr)), w = Math.max(1, Math.round(32 * sr / 44100));
  if (b <= a) return t;
  const e = new Float64Array(b - a);
  for (let i = a; i < b; i++) e[i - a] = Math.abs(x[i]);
  const sm = runningMean(e, w);
  let max = 0;
  for (const v of sm) max = Math.max(max, v);
  if (!(max > 0)) return t;
  for (let i = 0; i < sm.length; i++) if (sm[i] > max / 3) return (a + i) / sr;
  return t;
}

// ---------------------------------------------------------------- the grid: tempo and the 16th's phase from the drums
// bpm and origin (where a bar starts, s into the stretch): the app's own, when X has them, so the program's bar 1 is the bar the rest
// of X's code calls bar 1; found from the drums otherwise.
export function findGrid(drums, sr, { bpm = null, origin: given = null } = {}) {
  const sp = spectra(drums, sr), tf = (i) => (i * sp.hop + sp.n / 2) / sr;
  let env = flux(sp, 30, 16000);
  const mean = runningMean(env, 87); env = env.map((v, i) => Math.max(0, v - mean[i]));
  const at = (j) => { const i = Math.floor(j), f = j - i; return i + 1 < env.length ? env[i] * (1 - f) + env[i + 1] * f : 0; };
  const comb = (b) => {
    const beat = 60 / b * sp.fps; let best = [-1, 0];
    for (let ph = 0; ph < beat; ph += 0.5) {
      let s = 0, n = 0;
      for (let j = ph; j < env.length - 1; j += beat) { s += at(j); n++; }
      if (n && s / n > best[0]) best = [s / n, ph];
    }
    return best;
  };
  if (!bpm) {
    let cand = 0, top = -1;
    for (let b = 76; b < 160; b += 0.25) { const v = comb(b)[0]; if (v > top) { top = v; cand = b; } }
    top = -1;
    for (let b = cand - 0.3; b < cand + 0.3; b += 0.01) { const v = comb(b)[0]; if (v > top) { top = v; bpm = b; } }
  }
  const beat = 60 / bpm, step = beat / 4, bar = beat * 4, klo = flux(sp, 30, 120, { log: false });
  if (Number.isFinite(given)) return { bpm, beat, step, bar, origin: ((given % bar) + bar) % bar, sp, klo };
  let origin = tf(comb(bpm)[1]);
  const kAt = (t) => { const j = t * sp.fps, i = Math.floor(j), f = j - i; return i + 1 < klo.length ? klo[i] * (1 - f) + klo[i + 1] * f : 0; };
  // the beat or the half-beat between: on a steady 8th-note hat the two look alike to the comb; the kicks say which is the beat
  const onBeats = (o) => { let s = 0; for (let t = o; t < drums.length / sr - beat; t += beat) s += kAt(t); return s; };
  if (onBeats(origin + beat / 2) > 1.5 * onBeats(origin)) origin += beat / 2;
  let q0 = 0, best = -1;
  for (let q = 0; q < 4; q++) {
    let s = 0;
    for (let t = origin + q * beat; t < drums.length / sr - bar; t += bar) s += kAt(t);
    if (s > best) { best = s; q0 = q; }
  }
  origin = ((origin + q0 * beat) % bar + bar) % bar;   // the first bar start inside the stretch
  return { bpm, beat, step, bar, origin, sp, klo };
}

// ---------------------------------------------------------------- drums: every hit, grouped by sound
function kmeans(X, k, it = 60) {
  const d2 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const v = a[i] - b[i]; s += v * v; } return s; };
  const mean = X[0].map((_, j) => X.reduce((s, x) => s + x[j], 0) / X.length);
  let far = 0; X.forEach((x, i) => { if (d2(x, mean) > d2(X[far], mean)) far = i; });
  let C = [X[far].slice()];
  while (C.length < Math.min(k, X.length)) {
    let pick = 0, top = -1;
    X.forEach((x, i) => { const d = Math.min(...C.map((c) => d2(x, c))); if (d > top) { top = d; pick = i; } });
    C.push(X[pick].slice());
  }
  let L = new Array(X.length).fill(0);
  for (let r = 0; r < it; r++) {
    L = X.map((x) => { let j = 0; C.forEach((c, i) => { if (d2(x, c) < d2(x, C[j])) j = i; }); return j; });
    C = C.map((c, j) => { const m = X.filter((_, i) => L[i] === j); return m.length ? c.map((_, q) => m.reduce((s, x) => s + x[q], 0) / m.length) : c; });
  }
  return { L, C, d2 };
}
export function readDrums(drums, sr, grid, { groups = 5 } = {}) {
  const { sp, step, origin } = grid, tf = (i) => (i * sp.hop + sp.n / 2) / sr;
  const stepOf = (t) => Math.round((t - origin) / step), tOf = (s) => origin + s * step;
  const pk = peaks(flux(sp, 30, 16000), sp.fps, 0.12, { gap: 0.05, k: 1.25 });
  const times = pk.map((i) => attack(drums, sr, tf(i)));
  if (!times.length) return { sounds: {}, steps: {}, feel: {}, place: {} };
  // ~80 ms after each hit: 12 log bands (the first from 43 Hz, where a kick lives), the early and late halves
  const edges = [1, ...Array.from({ length: 12 }, (_, i) => Math.floor(3 * (380 / 3) ** (i / 11)))].map((b) => Math.max(1, Math.round(b * 43.066 / sp.bin)));
  const feat = (t) => {
    const i = Math.floor(t * sp.fps), seg = sp.S.slice(i, i + 14), half = (rows) => edges.slice(0, -1).map((a, e) => {
      const b = Math.max(a, edges[e + 1]); let s = 0;
      for (const r of rows) { let v = 0; for (let q = a; q <= b && q < r.length; q++) v += r[q]; s += Math.log1p(v); }
      return rows.length ? s / rows.length : 0;
    });
    return [...half(seg.slice(0, 7)), ...half(seg.slice(7))];
  };
  const X = times.map(feat), k = Math.min(groups, X.length);
  let { L, C, d2 } = kmeans(X, k);
  const order = C.map((_, j) => j).sort((a, b) => L.filter((l) => l === b).length - L.filter((l) => l === a).length || a - b);
  const remap = new Map(order.map((o, r) => [o, r])); L = L.map((l) => remap.get(l)); C = order.map((o) => C[o]);
  const names = [];
  for (const c of C) {   // a readable name from the group's sound: its lowest band against its top
    const lo = c[0], top = (c[9] + c[10] + c[11]) / 3, n = lo >= 1.25 * top ? 'kick' : top >= 3 * lo ? 'hat' : 'snare';
    names.push(names.includes(n) ? n + (names.filter((m) => m.startsWith(n)).length + 1) : n);
  }
  const sounds = {}, steps = {}, feel = {}, place = {};
  const next = times.map((t, i) => (i + 1 < times.length ? times[i + 1] - t : 1));
  C.forEach((c, j) => {
    const idx = times.map((_, i) => i).filter((i) => L[i] === j);
    if (!idx.length) return;
    const ok = idx.filter((i) => next[i] > 0.12), pool = ok.length ? ok : idx;
    const i = pool.reduce((b, q) => (d2(X[q], c) < d2(X[b], c) ? q : b), pool[0]);
    const len = Math.min(0.35, Math.max(0.08, next[i] - 0.005));
    sounds[names[j]] = cut(drums, sr, times[i] - 64 / 44100, len + 64 / 44100, { fadeIn: 64 / 44100, fadeOut: 0.015 });
    steps[names[j]] = [...new Set(idx.map((q) => stepOf(times[q])))].sort((a, b) => a - b);
    const off = (q) => times[q] - tOf(stepOf(times[q]));
    feel[names[j]] = median(idx.map(off));
    // by place in the beat (0 = on it): its own feel where it has three hits or more and differs from the sound's by over 4 ms
    place[names[j]] = [0, 1, 2, 3].map((p) => {
      const at = idx.filter((q) => ((stepOf(times[q]) % 4) + 4) % 4 === p), m = at.length >= 3 ? median(at.map(off)) : NaN;
      return Number.isFinite(m) && Math.abs(m - feel[names[j]]) > 0.004 ? m : feel[names[j]];
    });
  });
  return { sounds, steps, feel, place, hits: times.length };
}
// a piece of a part, with short fades so it never clicks
export function cut(x, sr, t, len, { fadeIn = 0.0015, fadeOut = 0.015 } = {}) {
  const a = Math.max(0, Math.round(t * sr)), b = Math.min(x.length, Math.round((t + len) * sr)), y = x.slice(a, Math.max(a, b));
  const fi = Math.min(y.length, Math.round(fadeIn * sr)), fo = Math.min(y.length, Math.round(fadeOut * sr));
  for (let i = 0; i < fi; i++) y[i] *= i / fi;
  for (let i = 0; i < fo; i++) y[y.length - 1 - i] *= i / fo;
  return y;
}

// ---------------------------------------------------------------- bass: notes from its pitch, one cut note plays them all
// YIN by FFT (a bass needs lags to 30 Hz; done directly that is too slow for a whole song), every 10 ms, at a quarter of 44.1 kHz.
export function bassPitch(bass, sr, { fmin = 30, fmax = 320, th = 0.15 } = {}) {
  const f = Math.max(1, Math.round(sr / 11025)), r = sr / f, x = new Float64Array(Math.floor(bass.length / f));
  for (let i = 0; i < x.length; i++) { let s = 0; for (let q = 0; q < f; q++) s += bass[i * f + q]; x[i] = s / f; }   // (a box filter: the bass is far below what it dulls)
  const W = Math.round(1024 * r / 11025), tmax = Math.floor(r / fmin), tmin = Math.floor(r / fmax), hop = Math.round(0.01 * r);
  let nf = 1; while (nf < 2 * (W + tmax)) nf <<= 1;
  const frames = Math.max(0, Math.floor((x.length - W - tmax) / hop)), out = new Float64Array(frames).fill(NaN), rms = new Float64Array(frames);
  for (let i = 0; i < frames; i++) { let s = 0; for (let q = 0; q < W; q++) s += x[i * hop + q] ** 2; rms[i] = Math.sqrt(s / W); }
  let loud = 0; for (const v of rms) loud = Math.max(loud, v);
  const ar = new Float64Array(nf), ai = new Float64Array(nf), br = new Float64Array(nf), bi = new Float64Array(nf), cm = new Float64Array(tmax + 1);
  for (let i = 0; i < frames; i++) {
    if (rms[i] < 0.08 * loud) continue;
    const at = i * hop, len = W + tmax;
    ar.fill(0); ai.fill(0); br.fill(0); bi.fill(0);
    for (let q = 0; q < len; q++) ar[q] = x[at + q];
    for (let q = 0; q < W; q++) br[q] = x[at + q];
    fft(ar, ai); fft(br, bi);
    for (let q = 0; q < nf; q++) { const pr = ar[q] * br[q] + ai[q] * bi[q], pi = ai[q] * br[q] - ar[q] * bi[q]; ar[q] = pr; ai[q] = -pi; }   // conj for the inverse
    fft(ar, ai);                                                               // r(t) = sum f[j+t] x0[j], scaled by nf
    let e0 = 0; for (let q = 0; q < W; q++) e0 += x[at + q] ** 2;
    let et = e0, sum = 0; cm[0] = 1;
    for (let t = 1; t <= tmax; t++) {
      et += x[at + W - 1 + t] ** 2 - x[at + t - 1] ** 2;
      const d = e0 + et - 2 * ar[t] / nf; sum += d; cm[t] = d * t / Math.max(1e-12, sum);
    }
    let t = -1;
    for (let q = tmin; q <= tmax; q++) if (cm[q] < th) { t = q; break; }
    if (t < 0) continue;
    while (t + 1 <= tmax && cm[t + 1] < cm[t]) t++;
    let tt = t;
    if (t > 0 && t < tmax) { const a = cm[t - 1], b = cm[t], c = cm[t + 1], k = a - 2 * b + c; tt = t + (k ? 0.5 * (a - c) / k : 0); }
    out[i] = hz2midi(r / tt);
  }
  return { midi: out, dt: hop / r };
}
export function readBass(bass, sr, grid, { maxSample = 1.6 } = {}) {
  const { step, origin } = grid, stepOf = (t) => Math.round((t - origin) / step), tOf = (s) => origin + s * step;
  const { midi, dt } = bassPitch(bass, sr), sp = spectra(bass, sr), tf = (i) => (i * sp.hop + sp.n / 2) / sr;
  const onsets = new Set(peaks(flux(sp, 30, 400), sp.fps, 0.3, { gap: 0.09 }).map((i) => Math.round(tf(i) / dt)));
  const notes = [];
  for (let i = 0; i < midi.length;) {
    if (Number.isNaN(midi[i])) { i++; continue; }
    let j = i + 1;
    while (j < midi.length && !Number.isNaN(midi[j]) && Math.abs(midi[j] - median(Array.from(midi.subarray(i, j)))) < 0.7 && !onsets.has(j)) j++;
    if ((j - i) * dt >= 0.07) notes.push([i * dt, j * dt, Math.round(median(Array.from(midi.subarray(i, j))))]);
    i = j;
  }
  const at = new Map();   // step -> [midi, length in steps]; a later note never overlaps an earlier one
  for (const [a, b, m] of notes) { const s = stepOf(attack(bass, sr, a)), e = Math.max(s + 1, stepOf(b)); if (!at.has(s)) at.set(s, [m, e - s]); }
  const held = (s, m) => {
    const fr = Array.from(midi.subarray(Math.floor(tOf(s) / dt), Math.floor(tOf(s + 1) / dt))).filter((v) => !Number.isNaN(v));
    return fr.length > 0.5 * step / dt && Math.abs(median(fr) - m) < 0.7;
  };
  const ss = [...at.keys()].sort((a, b) => a - b);
  ss.forEach((x, i) => {   // a note lasts while its pitch holds, up to the next note (the first cut wrote them a 16th long)
    const y = i + 1 < ss.length ? ss[i + 1] : x + 16, v = at.get(x);
    let L = v[1];
    while (x + L < y && held(x + L, v[0])) L++;
    v[1] = Math.min(L, y - x);
  });
  if (!at.size) return { notes: new Map(), root: null, sample: null };
  // the one sampled note: the root that keeps every note nearest (a sampler's single zone), cut from its longest held instance
  const count = new Map(); for (const [m] of at.values()) count.set(m, (count.get(m) || 0) + 1);
  const cand = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 10).map(([m]) => m);
  const cost = (r) => [Math.max(...[...count.keys()].map((m) => Math.abs(m - r))), [...count.entries()].reduce((s, [m, c]) => s + c * Math.abs(m - r), 0)];
  const root = cand.reduce((b, r) => { const [p, q] = cost(r), [u, v] = cost(b); return p < u || (p === u && q < v) ? r : b; }, cand[0]);
  const s0 = ss.filter((s) => at.get(s)[0] === root).reduce((b, s) => ((at.get(s)[1] <= 16 ? at.get(s)[1] : 0) > (at.get(b)[1] <= 16 ? at.get(b)[1] : 0) ? s : b));
  const sample = cut(bass, sr, tOf(s0), Math.min(maxSample, at.get(s0)[1] * step + 0.05), { fadeIn: 64 / 44100, fadeOut: 0.04 });
  return { notes: at, root, sample };
}

// ---------------------------------------------------------------- voice: phrases at their true starts
export function readVoice(vocals, sr, grid, { from = 0 } = {}) {
  const { step, origin } = grid, stepOf = (t) => Math.round((t - origin) / step), tOf = (s) => origin + s * step;
  const w = Math.round(0.02 * sr), env = new Float64Array(vocals.length);
  { let s = 0; for (let i = 0; i < vocals.length; i++) { s += vocals[i] ** 2; if (i >= w) s -= vocals[i - w] ** 2; env[Math.max(0, i - (w >> 1))] = Math.sqrt(Math.max(0, s) / w); } }
  let max = 0; for (const v of env) max = Math.max(max, v);
  const gate = 0.04 * max, q = Math.round(0.22 * sr), stride = Math.max(1, Math.round(0.005 * sr));
  let phrases = [];
  const loudAhead = (i) => { for (let j = i; j < Math.min(env.length, i + q); j += 16) if (env[j] > gate) return true; return false; };
  for (let i = 0; i < env.length;) {
    if (env[i] > gate) {
      let j = i; while (j < env.length && loudAhead(j)) j += 16;
      if ((j - i) / sr > 0.12) phrases.push([i / sr, j / sr]);
      i = j;
    } else i += stride;
  }
  const T0 = tOf(from);   // a phrase over the program's first bar line is cut there, not lost
  phrases = phrases.flatMap(([a, b]) => (a < T0 - 0.02 && T0 - 0.02 < b - 0.1 ? [[a, T0], [T0, b]] : [[a, b]]));
  const sounds = [], at = new Map();
  for (const [a, b] of phrases) {
    const a0 = a === T0 ? a : Math.max(0, a - 0.02), s = stepOf(a);
    let off = a0 - tOf(s); off = Math.abs(off) < 0.004 ? 0 : Math.round(off / 0.005) * 0.005;   // (the code says it in 5 ms steps; so does the audio)
    if (!at.has(s)) { at.set(s, [sounds.length, off]); sounds.push(cut(vocals, sr, a0, b - a0 + 0.05, { fadeIn: 0.03, fadeOut: 0.03 })); }
  }
  return { phrases: at, sounds };
}

// ---------------------------------------------------------------- keys: half-bar slices, repeats played from the first
export function readKeys(other, sr, grid, { alike = 0.93 } = {}) {
  const { step, origin } = grid, tOf = (s) => origin + s * step, H = step * 8;
  const n = sr >= 44100 ? 2048 : 1024, w = hann(n), re = new Float64Array(n), im = new Float64Array(n);
  const e = Array.from({ length: 41 }, (_, i) => Math.floor(4 * (900 / 4) ** (i / 40) * (n / 2048)));
  const feat = (y) => {
    const rows = [];
    for (let at = 0; at + n <= y.length; at += n >> 1) {
      for (let i = 0; i < n; i++) { re[i] = y[at + i] * w[i]; im[i] = 0; }
      fft(re, im);
      rows.push(e.slice(0, -1).map((a, b) => { let s = 0; for (let k = a; k <= Math.max(a, e[b + 1]); k++) s += Math.hypot(re[k], im[k]); return Math.log1p(s * 10); }));
    }
    if (!rows.length) return null;
    const v = []; for (let m = 0; m < 8; m++) v.push(...rows[Math.floor(m * (rows.length - 1) / 7)]);
    const mu = v.reduce((s, x) => s + x, 0) / v.length; return v.map((x) => x - mu);
  };
  const sounds = [], feats = [], at = new Map();
  let h = 0; while (tOf(h * 8) < 0) h++;
  for (; tOf(h * 8) + H <= other.length / sr; h++) {
    const y = cut(other, sr, tOf(h * 8), H + 64 / 44100, { fadeIn: 32 / 44100, fadeOut: 64 / 44100 }), v = feat(y);
    let hit = -1;
    if (v) for (let i = 0; i < feats.length; i++) {
      const u = feats[i]; let uv = 0, uu = 0, vv = 0;
      for (let q = 0; q < u.length; q++) { uv += u[q] * v[q]; uu += u[q] * u[q]; vv += v[q] * v[q]; }
      if (uv / Math.sqrt(uu * vv + 1e-12) > alike) { hit = i; break; }
    }
    if (hit < 0) { hit = sounds.length; sounds.push(y); feats.push(v || []); }
    at.set(h * 8, hit);
  }
  return { slices: at, sounds, half: H };
}

// ---------------------------------------------------------------- all of it, then the events, the audio and the program
// parts: { drums, bass, other, vocals } (Float32Array, mono, sr). bars: [first, count] of the program, from the stretch's own grid.
export function rebuild(parts, sr, { bpm = null, origin = null, from = 0, bars = null } = {}) {
  let grid = findGrid(parts.drums, sr, { bpm, origin });
  if (bpm) {   // the app's tempo read double or half (it happens: 171.1 for an 85.6 song, Nov 13): the drums' own grid instead
    const own = findGrid(parts.drums, sr), q = bpm / own.bpm;
    if (Math.abs(q - 2) < 0.03 || Math.abs(q - 0.5) < 0.008) grid = own;
  }
  const total = Math.floor((Math.min(...Object.values(parts).map((p) => p.length)) / sr - grid.origin) / grid.bar);
  const first = Math.max(0, Math.floor((from - grid.origin) / grid.bar)), count = Math.max(1, Math.min(bars ?? total, total - first));
  const S0 = first * 16, S1 = S0 + count * 16;
  const drums = readDrums(parts.drums, sr, grid), bass = readBass(parts.bass, sr, grid);
  const voice = readVoice(parts.vocals, sr, grid, { from: S0 }), keys = readKeys(parts.other, sr, grid);
  const inWin = (s) => s >= S0 && s < S1, events = [];
  for (const [k, ss] of Object.entries(drums.steps)) for (const s of ss) if (inWin(s)) events.push({ part: 'drums', sound: k, step: s, shift: drums.place[k]?.[((s % 4) + 4) % 4] ?? drums.feel[k] });
  for (const [s, [m, L]] of bass.notes) if (inWin(s)) events.push({ part: 'bass', sound: 'bass', step: s, midi: m, steps: L, rate: 2 ** ((m - bass.root) / 12), shift: 0 });
  for (const [s, [i, off]] of voice.phrases) if (inWin(s)) events.push({ part: 'voice', sound: i, step: s, shift: off });
  for (const [s, i] of keys.slices) if (inWin(s)) events.push({ part: 'keys', sound: i, step: s, steps: 8, shift: 0 });
  return { grid, first: S0, count, drums, bass, voice, keys, events };
}

// The audio the program plays, part by part (Float32Array each), from the events alone; and one level per part so each sits
// where it sat in the record (that level is written into the code as .gain).
export function render(r, parts, sr) {
  const { grid, first } = r, T0 = grid.origin + first * grid.step, N = Math.round(r.count * grid.bar * sr), out = {};
  for (const p of ['drums', 'bass', 'voice', 'keys']) out[p] = new Float32Array(N);
  const sound = (e) => (e.part === 'drums' ? r.drums.sounds[e.sound] : e.part === 'bass' ? r.bass.sample : e.part === 'voice' ? r.voice.sounds[e.sound] : r.keys.sounds[e.sound]);
  for (const e of r.events) {
    let x = sound(e); if (!x) continue;
    const rate = e.rate || 1, max = e.part === 'bass' ? e.steps * grid.step : e.part === 'keys' ? r.keys.half : Infinity;
    const L = Math.min(Math.floor(x.length / rate), Math.round(max * sr)), fade = e.part === 'bass' || e.part === 'keys' ? Math.min(L, Math.round(0.015 * sr)) : 0;
    let a = Math.round((grid.origin + e.step * grid.step + e.shift - T0) * sr);
    for (let i = 0; i < L; i++) {
      const at = a + i; if (at < 0 || at >= N) continue;
      const j = i * rate, q = Math.floor(j), f = j - q, v = (x[q] || 0) * (1 - f) + (x[q + 1] || 0) * f;
      out[e.part][at] += v * (fade && i >= L - fade ? (L - i) / fade : 1);
    }
  }
  const orig = { drums: parts.drums, bass: parts.bass, voice: parts.vocals, keys: parts.other }, a0 = Math.round(T0 * sr), gain = {};
  const rms = (y, o = 0) => { let s = 0; for (let i = 0; i < N; i++) s += (y[o + i] || 0) ** 2; return Math.sqrt(s / N + 1e-24); };
  for (const p of Object.keys(out)) { const g = rms(out[p]); gain[p] = g > 1e-6 ? Math.round(rms(orig[p], a0) / g * 100) / 100 : 0; }
  return { parts: out, gain, start: T0, length: N };
}

// The Strudel program: the samples, the tempo, a line per sound, each bar a 16-weight sequence (`<...>` one bar after another).
// Only documented Strudel: samples, setcpm, stack, s, n, note, struct, clip, gain, early, late (Strudel documents no `nudge`).
export function program(r, gain, { base = '', title = '' } = {}) {
  const { grid, first, count } = r, S0 = first, S1 = first + count * 16;
  const seq = (cells) => {
    const out = []; let s = 0;
    for (const st of [...cells.keys()].sort((a, b) => a - b)) {
      if (st < s) continue;
      if (st > s) out.push(st - s > 1 ? `~@${st - s}` : '~');
      const [tok, len] = cells.get(st), L = Math.max(1, Math.min(len, 16 - st));
      out.push(L > 1 ? `${tok}@${L}` : tok); s = st + L;
    }
    if (s < 16) out.push(16 - s > 1 ? `~@${16 - s}` : '~');
    return `[${out.join(' ')}]`;
  };
  const bars = (evs, tok, len = () => 1) => {
    const out = [];
    for (let b = S0; b < S1; b += 16) out.push(seq(new Map(evs.filter((e) => e.step >= b && e.step < b + 16).map((e) => [e.step - b, [tok(e), len(e)]]))));
    const runs = [];   // a run of the same bar written once with ! (mini-notation's replicate: [x]!3 is three bars of [x])
    for (const bar of out) { const last = runs[runs.length - 1]; if (last && last[0] === bar) last[1]++; else runs.push([bar, 1]); }
    return `<${runs.map(([bar, n]) => (n > 1 ? `${bar}!${n}` : bar)).join(' ')}>`;
  };
  const shift = (x) => (Math.abs(x) <= 0.002 ? '' : x > 0 ? `.late(${(x / grid.bar).toFixed(4)})` : `.early(${(-x / grid.bar).toFixed(4)})`);
  const ev = (p) => r.events.filter((e) => e.part === p);
  const vUsed = [...new Set(ev('voice').map((e) => e.sound))].sort((a, b) => a - b), kUsed = [...new Set(ev('keys').map((e) => e.sound))].sort((a, b) => a - b);
  const vn = new Map(vUsed.map((o, i) => [o, i])), kn = new Map(kUsed.map((o, i) => [o, i]));
  const drumNames = Object.keys(r.drums.sounds), lines = [];
  lines.push(`// ${title ? `${title}: ` : ''}rebuilt from its own sounds by Toaster. ${count} bars; every sound below was cut from the song itself.`);
  lines.push(`samples({`);
  lines.push(`  ${drumNames.map((k) => `thisSong_${k}: '${k}.wav'`).join(', ')},`);
  if (r.bass.root != null) lines.push(`  thisSong_bass: { ${noteName(r.bass.root)}: 'bass.wav' },`);
  lines.push(`  thisSong_voice: [${vUsed.map((_, i) => `'voice/${i}.wav'`).join(', ')}],`);
  lines.push(`  thisSong_keys: [${kUsed.map((_, i) => `'keys/${i}.wav'`).join(', ')}],`);
  lines.push(`}${base ? `, '${base}'` : ''})`);
  lines.push(`setcpm(${(60 / grid.beat / 4).toFixed(3)})`, `stack(`);
  for (const k of drumNames) {
    // a line per feel: the sound's hits that sit at one place in the beat with their own push get their own line
    const byFeel = new Map(); for (const e of ev('drums').filter((x) => x.sound === k)) { const f = e.shift.toFixed(4); byFeel.set(f, [...(byFeel.get(f) || []), e]); }
    for (const [f, e] of [...byFeel.entries()].sort((a, b) => b[1].length - a[1].length)) lines.push(`  s("thisSong_${k}").struct("${bars(e, () => 'x')}")${shift(+f)}.gain(${gain.drums}),`);
  }
  if (ev('bass').length) lines.push(`  note("${bars(ev('bass'), (e) => noteName(e.midi), (e) => e.steps)}").s("thisSong_bass").clip(1).gain(${gain.bass}),`);
  const byShift = new Map(); for (const e of ev('voice')) { const k = e.shift.toFixed(3); byShift.set(k, [...(byShift.get(k) || []), e]); }
  for (const [k, e] of [...byShift.entries()].sort((a, b) => a[0] - b[0])) lines.push(`  s("thisSong_voice").n("${bars(e, (x) => String(vn.get(x.sound)))}")${shift(+k)}.gain(${gain.voice}),`);
  if (ev('keys').length) lines.push(`  s("thisSong_keys").n("${bars(ev('keys'), (x) => String(kn.get(x.sound)))}").clip(1).gain(${gain.keys}),`);
  lines.push(`)`);
  // the files the program names, by the names it uses
  const files = {};
  for (const k of drumNames) files[`${k}.wav`] = r.drums.sounds[k];
  if (r.bass.sample) files['bass.wav'] = r.bass.sample;
  vUsed.forEach((o, i) => { files[`voice/${i}.wav`] = r.voice.sounds[o]; });
  kUsed.forEach((o, i) => { files[`keys/${i}.wav`] = r.keys.sounds[o]; });
  return { code: lines.join('\n') + '\n', files };
}

// A sample as a WAV file's bytes (16-bit, mono): what strudel.cc and any player read.
export function wavBytes(x, sr) {
  const n = x.length, b = new ArrayBuffer(44 + 2 * n), v = new DataView(b), str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + 2 * n, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, 2 * sr, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, 2 * n, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + 2 * i, Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), true);
  return new Uint8Array(b);
}
