// Scores what X exports at the end of each song: takes the songStrudel program X copies, evaluates it with Strudel into
// timed events at the exported BPM, and compares it against the song's references and original audio onset envelope.
//   node tools/exportbench.mjs <results.json> [--vs=<baseline.json>] [--songs] [--set=full]
//   node tools/exportbench.mjs --root=<checkout> --out=<results.json> [--offsets=0,5,10] [--only=a,b] [--vs=<baseline.json>] [--songs]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REFS, songs } from './detbench/run.mjs';
import { songStrudel } from '../renderer/tape.js';
import { strudelRuntime, events as queryEvents } from './strudel-test-runtime.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const KEYDOCS = path.join(here, '../docs/key-stability/references');
const KEYHELD = process.env.DETBENCH_KEYHELD || path.join(here, '../docs/key-stability/heldout');
const ENV_CACHE_DIR = path.join(os.tmpdir(), 'toaster-exportbench-env-v1');

const parseKey = (s) => { const m = /^([A-G][#b]?)(m?)$/.exec(s || ''); return m ? { root: PC[m[1]], minor: !!m[2] } : null; };
const sameKey = (a, b) => a && b && a.root === b.root && a.minor === b.minor;

const truthCache = new Map();
function getTruth(key) {
  if (!truthCache.has(key)) {
    const f = path.join(REFS, 'gt/truth', key + '.json');
    truthCache.set(key, fs.existsSync(f) ? read(f) : null);
  }
  return truthCache.get(key);
}

const keyRefCache = new Map();
function getKeyRef(key) {
  if (!keyRefCache.has(key)) {
    const base = key.replace(/#\d+$/, '');
    const file = [path.join(KEYDOCS, base + '.json'), path.join(KEYHELD, base + '.json')].find((f) => fs.existsSync(f));
    const d = file ? read(file) : null;
    let ref = null;
    if (base === 'betteroffalone-alicedeejay') ref = { key: 'Abm', agreed: true, chords: [] };
    else if (d) {
      const k = d.reference || d.chordKey?.[0];
      ref = {
        key: k ? NOTES[k.root] + (k.mode === 'minor' ? 'm' : '') : null,
        agreed: !!d.reference,
        chords: (d.chords || []).filter((c) => c.label !== 'N').map((c) => {
          const [r, q] = c.label.split(':');
          return [c.start, c.end, NOTES[PC[r]] + (q === 'min' ? 'm' : '')];
        }),
      };
    }
    keyRefCache.set(key, ref);
  }
  return keyRefCache.get(key);
}

let songAudioMap;
const songAudio = (key) => {
  songAudioMap ||= new Map(songs().map((s) => [s.key, s.audio]));
  return songAudioMap.get(key);
};

// 50 Hz (20 ms hop) audio onset envelope, smoothed with sigma = 40 ms (2 frames), cached on disk per song.
const HOP_HZ = 50;
function smoothEnv(raw) {
  const n = raw.length, out = new Float32Array(n);
  const w = [0.054, 0.244, 0.404, 0.244, 0.054]; // Gaussian sigma ~ 1.0 frame (20 ms), width +-40 ms
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) {
      const j = i + k;
      if (j >= 0 && j < n) s += raw[j] * w[k + 2];
    }
    out[i] = s;
  }
  return out;
}

const audioEnvCache = new Map();
export function getAudioEnvelope(key, maxSec = 160) {
  if (audioEnvCache.has(key)) return audioEnvCache.get(key);
  fs.mkdirSync(ENV_CACHE_DIR, { recursive: true });
  const cacheFile = path.join(ENV_CACHE_DIR, `${key}.json`);
  if (fs.existsSync(cacheFile)) {
    const arr = Float32Array.from(read(cacheFile));
    audioEnvCache.set(key, arr);
    return arr;
  }
  const audioPath = songAudio(key);
  if (!audioPath || !fs.existsSync(audioPath)) return null;
  const sr = 8000, hop = sr / HOP_HZ; // 160 samples per 20ms frame
  const pcmBuf = execFileSync('ffmpeg', [
    '-v', 'error', '-i', audioPath, '-t', String(maxSec), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-',
  ], { maxBuffer: 64 * 1024 * 1024 });
  const pcm = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, Math.floor(pcmBuf.byteLength / 4));
  const frames = Math.floor(pcm.length / hop);
  const raw = new Float32Array(frames);
  // 1-pole low-pass at ~160 Hz for bass/kick onset energy + broadband energy
  const alpha = 1 - Math.exp(-2 * Math.PI * 160 / sr);
  let lp = 0, prevBroadDb = -80, prevLowDb = -80;
  for (let f = 0; f < frames; f++) {
    let sumBroad = 0, sumLow = 0, sumHi = 0;
    const base = f * hop;
    for (let i = 0; i < hop; i++) {
      const x = pcm[base + i];
      lp += alpha * (x - lp);
      const hi = x - lp;
      sumBroad += x * x;
      sumLow += lp * lp;
      sumHi += hi * hi;
    }
    const broadDb = 10 * Math.log10(sumBroad / hop + 1e-10);
    const lowDb = 10 * Math.log10(sumLow / hop + 1e-10);
    const dBroad = Math.max(0, broadDb - prevBroadDb);
    const dLow = Math.max(0, lowDb - prevLowDb);
    prevBroadDb = broadDb;
    prevLowDb = lowDb;
    raw[f] = 0.6 * dLow + 0.4 * dBroad;
  }
  const env = smoothEnv(raw);
  fs.writeFileSync(cacheFile, JSON.stringify(Array.from(env, (x) => +x.toFixed(4))));
  audioEnvCache.set(key, env);
  return env;
}

// Build rendered export's onset envelope on the same 50 Hz grid over [origin, endSec].
const PART_WEIGHT = { bd: 1.0, sd: 0.75, hhc: 0.3, hho: 0.4, bass: 0.55, chords: 0.25, lead: 0.25 };
export function buildExportEnvelope(events, bpm, barsCount) {
  const barSec = 240 / bpm, totalSec = barsCount * barSec;
  const frames = Math.max(1, Math.ceil(totalSec * HOP_HZ));
  const raw = new Float32Array(frames);
  for (const ev of events) {
    const t = ev.onset * barSec;
    const idx = Math.round(t * HOP_HZ);
    if (idx >= 0 && idx < frames) {
      const w = PART_WEIGHT[ev.part] ?? 0.25;
      raw[idx] = Math.max(raw[idx], w);
    }
  }
  return smoothEnv(raw);
}

// Pearson onset-envelope correlation at one best shift within half a bar. A single
// shift tolerates the capture origin without hiding cumulative tempo drift.
export function correlateEnvelopes(exportEnv, audioEnv, originSec, bpm) {
  if (!exportEnv?.length || !audioEnv?.length || !(bpm > 0)) return null;
  const startFrame = Math.round(originSec * HOP_HZ);
  const halfBar = Math.round(120 / bpm * HOP_HZ);
  let best = null;
  for (let lag = -halfBar; lag <= halfBar; lag++) {
    let sa = 0, sb = 0, sab = 0, sa2 = 0, sb2 = 0, n = 0;
    for (let i = 0; i < exportEnv.length; i++) {
      const j = startFrame + i + lag;
      if (j < 0 || j >= audioEnv.length) continue;
      const a = exportEnv[i], b = audioEnv[j];
      sa += a; sb += b; sab += a * b; sa2 += a * a; sb2 += b * b; n++;
    }
    if (n <= HOP_HZ * 2) continue;
    const den = Math.sqrt(Math.max(0, sa2 - sa * sa / n) * Math.max(0, sb2 - sb * sb / n));
    if (den > 1e-9) best = Math.max(best ?? 0, (sab - sa * sb / n) / den);
  }
  return best;
}

export const DRUM_TOLERANCE = 0.035;
export function matchF1(pred, truth, tol = DRUM_TOLERANCE) {
  const used = new Set();
  let tp = 0;
  for (const p of pred) {
    let bi = -1, bd = tol;
    for (let i = 0; i < truth.length; i++) {
      if (used.has(i)) continue;
      const d = Math.abs(p - truth[i]);
      if (d <= bd) { bd = d; bi = i; }
    }
    if (bi >= 0) { used.add(bi); tp++; }
  }
  return pred.length + truth.length ? (2 * tp) / (pred.length + truth.length) : null;
}

// A drum line scored three ways, so "the grid is off" and "the pattern is wrong" can't hide each other:
//   a    as exported: one tempo and one start, the whole song
//   fit  one tempo and one start again, but the best pair there is: the tempo within 0.4% of the exported one, the grid
//        slid up to 100 ms, pivoting on the export's end (where the app's grid was anchored); the pair that puts the most
//        exported hits within 35 ms of a real one. What a perfect tempo would score.
//   pat  on that grid, every bar also slid by up to a 32nd to where it fits best. What the pattern alone is worth.
// cycles: the exported hits, in bars from the export's start; ref: the real hits, in seconds; span: { origin, barSec, bars,
// from, to } (the export's start and bar length in seconds, how many bars, and the stretch of the song that was heard).
export function drumThreeWays(cycles, ref, { origin, barSec, bars, from = 0, to = Infinity }) {
  const none = { a: null, fit: null, pat: null };
  if (!ref?.length || !(barSec > 0) || !(bars > 0)) return none;
  const hits = [...cycles].sort((x, y) => x - y), real = [...ref].sort((x, y) => x - y);
  const avg = (xs) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null);
  // A bar's score: its own exported hits against the real hits in its window (25 ms early, as the bars above), slid by
  // up to `most` seconds to where they fit best. (kickF1 above hands a bar the next bar's first hit as well, so a perfect
  // four-on-the-floor tops out there at 0.89; here a perfect line scores 1.)
  const perBar = (start, bar, most) => {
    const f1s = [];
    for (let i = 0; i < bars; i++) {
      const a = start + i * bar, b = a + bar;
      if (a < from || b > to) continue;
      const own = hits.filter((c) => c >= i - 1e-6 && c < i + 1 - 1e-6).map((c) => start + c * bar);
      let best = -1, at = 0;
      for (let k = -Math.floor(most / 0.004); k * 0.004 <= most + 1e-9; k++) {
        const sh = k * 0.004, tBar = real.filter((t) => t >= a + sh - 0.025 && t < b + sh - 0.025);
        if (!tBar.length) continue;
        const f = matchF1(own.map((t) => t + sh), tBar);
        if (f > best + 1e-9 || (Math.abs(f - best) < 1e-9 && Math.abs(sh) < Math.abs(at))) { best = f; at = sh; }
      }
      if (best >= 0) f1s.push(best);
    }
    return avg(f1s);
  };
  const a = perBar(origin, barSec, 0);
  if (!hits.length) return { a, fit: a, pat: a };
  const end = origin + bars * barSec;
  const gap = (t) => { // (to the nearest real hit)
    let lo = 0, hi = real.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (real[m] < t) lo = m + 1; else hi = m; }
    return Math.min(Math.abs(real[lo] - t), lo ? Math.abs(real[lo - 1] - t) : Infinity);
  };
  const heard = hits.filter((c) => { const t = origin + c * barSec; return t >= from && t <= to; });
  let most = -1, cost = Infinity, start = origin, bar = barSec;
  for (let k = -80; k <= 80; k++) {
    const b = barSec * (1 + k * 0.00005);
    for (let j = -20; j <= 20; j++) {
      const sh = j * 0.005, s0 = end + sh - bars * b;
      let n = 0;
      for (const c of heard) if (gap(s0 + c * b) <= DRUM_TOLERANCE) n++;
      const c = Math.abs(k) * 0.001 + Math.abs(sh); // (of two that fit as well, the one nearer the export's own)
      if (n > most || (n === most && c < cost)) { most = n; cost = c; start = s0; bar = b; }
    }
  }
  return { a, fit: perBar(start, bar, 0), pat: perBar(start, bar, bar / 32), bpmFit: 240 / bar, start, barSec: bar }; // (start, barSec: the fitted grid, for a closer look)
}

function mostOver(spans, a, b) {
  const cover = new Map();
  for (const [s, e, v] of spans) {
    if (e <= a || s >= b) continue;
    cover.set(v, (cover.get(v) || 0) + Math.min(e, b) - Math.max(s, a));
  }
  let best = null, bc = 0;
  for (const [v, c] of cover) if (c > bc) { bc = c; best = v; }
  return { v: best, share: bc / (b - a) };
}

const noteNumber = (value) => {
  if (typeof value === 'number') return value;
  const match = /^([a-g])([#b]?)(-?\d+)$/i.exec(String(value));
  return match ? 12 * (+match[3] + 1) + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[match[1].toLowerCase()]
    + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) : null;
};

async function evaluateSongStrudel(code, barsCount) {
  if (!code) return [];
  const rt = await strudelRuntime();
  const pattern = await rt.evaluate(code);
  return queryEvents(pattern, 0, barsCount).map((n) => {
    const s = n.value.s, value = String(s ?? '');
    const part = ({ bd: 'bd', cp: 'sd', hh: 'hhc', oh: 'hho' })[value]
      ?? (value === 'sawtooth' ? 'bass' : value === 'triangle' || value === 'square' ? 'lead' : 'chords');
    return { onset: n.begin, duration: n.end - n.begin, midi: noteNumber(n.value.note), part };
  });
}

// The clap's second answer key: the reference's claps with the kick's own click taken out. In four-on-the-floor songs the stem
// reference counts the kick's click (it reaches into the clap's band) as a clap: Thriller's beats 1 and 3 held 146 "claps", every
// one with a kick within 30 ms and none confirmed by the drum-reading model, so a right "clap on 2 and 4" was marked half wrong.
// The rule: in a song where the model confirmed `asked` claps or more, a clap it did not confirm with a kick within `near`
// seconds is the kick's click, not a clap (measured Nov 10, backlog/engineering/clapwrong.mjs --clean: Thriller's bars exactly
// right 15% -> 43%, Funkytown 24% -> 42%, One More Time 9% -> 49%). Where the model confirmed fewer, it isn't asked: the key
// stays as it was.
// But a real clap falls on a kick too wherever the kick is on every beat, and the model misses some of those (Thriller's beat
// 4: 35 of 73 confirmed, 26 more taken out by the rule above). Claps come round: with the reference's own beats (`beats`, their
// times), a clap on a kick stays if the model confirmed a clap two or four beats before or after it (within `tol`): it is on a
// beat where this song's claps fall. The kick's click on beats 1 and 3 has no such neighbour.
// clap, kick: the reference's onsets ({ time, strength, confirmed_by_neural }) -> the claps' times, in order.
export function cleanClaps(clap = [], kick = [], { asked = 20, near = 0.03, beats = [], tol = 0.06 } = {}) {
  const strong = (o) => o.confirmed_by_neural || o.strength >= 0.8;
  const sorted = (xs) => xs.slice().sort((a, b) => a - b);
  // (the index of the first of `xs` at or after t)
  const at = (xs, t) => { let lo = 0, hi = xs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < t) lo = m + 1; else hi = m; } return lo; };
  const within = (xs, t, d) => { const i = at(xs, t); return (i < xs.length && xs[i] - t < d) || (i > 0 && t - xs[i - 1] < d); };
  const kicks = sorted(kick.map((o) => o.time)), sure = sorted(clap.filter((o) => o.confirmed_by_neural).map((o) => o.time));
  const bt = sorted(beats.map((b) => (Array.isArray(b) ? b[0] : b)).filter(Number.isFinite));
  // (a beat's length around t: across the eight beats about it, so one beat a frame early or late doesn't matter)
  const beat = (t) => {
    if (bt.length < 9) return null;
    const i = Math.min(bt.length - 1, at(bt, t)), a = Math.max(0, i - 4), b = Math.min(bt.length - 1, a + 8);
    return (bt[b] - bt[Math.max(0, b - 8)]) / (b - Math.max(0, b - 8));
  };
  const comesRound = (t) => { const P = beat(t); return !!P && [2, 4].some((k) => within(sure, t - k * P, tol) || within(sure, t + k * P, tol)); };
  const ask = sure.length >= asked;
  return sorted(clap.filter(strong).filter((o) => !ask || o.confirmed_by_neural || !within(kicks, o.time, near) || comesRound(o.time)).map((o) => o.time));
}

export async function scoreExportRun(name, r, targetSet = 'full') {
  const [set, run] = name.split(':');
  if (targetSet && set !== targetSet) return null;
  const key = run.split('@')[0].replace(/#\d+$/, '');
  if (r.error) return null;
  const truth = getTruth(key);
  const kref = getKeyRef(key);
  if (!r.song || !r.song.bars?.length || !(r.song.bpm > 0)) {
    return {
      set, key, run, hasExport: 0, cover: 0, bars: 0,
      kickF1: 0, clapF1: 0, hatF1: 0, kickAs: 0, kickFit: 0, kickPat: 0, clapAs: 0, clapFit: 0, clapPat: 0, clapAs2: 0, clapFit2: 0, clapPat2: 0,
      bassPc: 0, bassExact: 0, bassCover: 0,
      chord: 0, chordRoot: 0, chordInKey: kref?.key ? 0 : null,
      envCorr: 0, envScore: 0,
    };
  }
  const code = songStrudel(r.song, key);
  const barsCount = r.song.bars.length;
  const events = await evaluateSongStrudel(code, barsCount);
  const barSec = 240 / r.song.bpm;
  const origin = r.origin ?? r.from ?? 0;
  const exportSec = barsCount * barSec;
  // Coverage of the run's audible span (after first 8s lock-in)
  const targetSpan = Math.max(1, (r.seconds || 150) - 8);
  const cover = Math.min(1, exportSec / targetSpan);

  // Map rendered events to song seconds
  const byPart = { bd: [], sd: [], hat: [], bass: [], chords: [] };
  for (const ev of events) {
    const start = origin + ev.onset * barSec;
    const end = start + ev.duration * barSec;
    if (ev.part === 'bd') byPart.bd.push(start);
    else if (ev.part === 'sd') byPart.sd.push(start);
    else if (ev.part === 'hhc' || ev.part === 'hho') byPart.hat.push(start);
    else if (ev.part === 'bass' && Number.isFinite(ev.midi)) byPart.bass.push([start, end, ev.midi]);
    else if (ev.part === 'chords' && Number.isFinite(ev.midi)) byPart.chords.push([start, end, ev.midi]);
  }
  // Deduplicate simultaneous hat times (if hhc and hho overlap)
  byPart.hat.sort((a, b) => a - b);

  // 1. Drums F1 per exported bar against strong stem references
  const strong = (o) => o.confirmed_by_neural || o.strength >= 0.8;
  const refKick = (truth?.drums?.kick?.onsets || []).filter(strong).map((o) => o.time);
  const refClap = (truth?.drums?.clap?.onsets || []).filter(strong).map((o) => o.time);
  const refHat = (truth?.drums?.hat?.onsets || []).filter(strong).map((o) => o.time);

  const scoreDrumBars = (pred, ref) => {
    if (!ref.length) return null;
    const f1s = [];
    for (let i = 0; i < barsCount; i++) {
      const a = origin + i * barSec, b = a + barSec;
      if (a < (r.from || 0) || b > (r.from || 0) + (r.seconds || 150)) continue;
      const tBar = ref.filter((t) => t >= a - 0.025 && t < b - 0.025);
      if (!tBar.length) continue;
      const pBar = pred.filter((t) => t >= a - 0.05 && t < b + 0.05);
      f1s.push(matchF1(pBar, tBar));
    }
    return f1s.length ? f1s.reduce((x, y) => x + y, 0) / f1s.length : null;
  };

  const kickF1 = scoreDrumBars(byPart.bd, refKick);
  const clapF1 = scoreDrumBars(byPart.sd, refClap);
  const hatF1 = scoreDrumBars(byPart.hat, refHat);
  // (the kick and the clap again, on the best single tempo and with each bar slid into place: see drumThreeWays)
  const span = { origin, barSec, bars: barsCount, from: r.from || 0, to: (r.from || 0) + (r.seconds || 150) };
  const cyclesOf = (part) => events.filter((ev) => ev.part === part).map((ev) => ev.onset);
  const kick3 = drumThreeWays(cyclesOf('bd'), refKick, span), clap3 = drumThreeWays(cyclesOf('sd'), refClap, span);
  // (and the clap against its second key, the kick's click taken out: cleanClaps. The first key's columns stay as they were)
  const clap32 = drumThreeWays(cyclesOf('sd'), cleanClaps(truth?.drums?.clap?.onsets, truth?.drums?.kick?.onsets, { beats: truth?.beat?.beats }), span);

  // 2. Bass per beat against YIN bass truth
  const refBass = (truth?.bass?.notes || []).map((n) => [n.start, n.end, n.midi]);
  let bb = 0, bPc = 0, bExact = 0, bAny = 0;
  if (refBass.length) {
    for (let i = 0; i < barsCount; i++) {
      const barStart = origin + i * barSec;
      if (barStart < (r.from || 0) + 15 || barStart + barSec > (r.from || 0) + (r.seconds || 150)) continue;
      for (let k = 0; k < 4; k++) {
        const a = barStart + (k * barSec) / 4, b = barStart + ((k + 1) * barSec) / 4;
        const m = mostOver(refBass, a, b);
        if (!(m.v > 0) || m.share < 1 / 3) continue;
        bb++;
        const p = mostOver(byPart.bass, a, b);
        if (p.v === null || p.share <= 0) continue;
        bAny++;
        if (((p.v - m.v) % 12 + 12) % 12 === 0) bPc++;
        if (Math.abs(p.v - m.v) <= 1) bExact++;
      }
    }
  }
  const bassPc = bb ? bPc / bb : null;
  const bassExact = bb ? bExact / bb : null;
  const bassCover = bb ? bAny / bb : null;

  // 3. Chords per bar against reference chords + key match
  let cb = 0, cRight = 0, cRoot = 0;
  if (kref?.chords?.length) {
    for (let i = 0; i < barsCount; i++) {
      const a = origin + i * barSec, b = a + barSec;
      if (a < (r.from || 0) + 15 || b > (r.from || 0) + (r.seconds || 150)) continue;
      const m = mostOver(kref.chords, a, b);
      if (!m.v || m.share <= 0.5) continue;
      cb++;
      const T = parseKey(m.v);
      // Reconstruct exported chord in [a, b) from its two dyad notes (root and third)
      const notesInBar = byPart.chords
        .filter(([s, e]) => Math.min(e, b) - Math.max(s, a) > barSec * 0.25)
        .map(([, , midi]) => midi)
        .sort((x, y) => x - y);
      if (notesInBar.length >= 2 && T) {
        const rootPc = ((notesInBar[0] % 12) + 12) % 12;
        const thirdInterval = ((notesInBar[1] - notesInBar[0]) % 12 + 12) % 12;
        const isMinor = thirdInterval === 3;
        if (rootPc === T.root) {
          cRoot++;
          if (isMinor === T.minor) cRight++;
        }
      }
    }
  }
  const chord = cb ? cRight / cb : null;
  const chordRoot = cb ? cRoot / cb : null;
  const refKeyParsed = parseKey(kref?.key);
  const SCALE = { major: new Set([0, 2, 4, 5, 7, 9, 11]), minor: new Set([0, 2, 3, 5, 7, 8, 10]) };
  let kb = 0, kIn = 0;
  if (refKeyParsed) {
    const sc = SCALE[refKeyParsed.minor ? 'minor' : 'major'];
    for (let i = 0; i < barsCount; i++) {
      const a = origin + i * barSec, b = a + barSec;
      if (a < (r.from || 0) + 15 || b > (r.from || 0) + (r.seconds || 150)) continue;
      const notesInBar = byPart.chords
        .filter(([s, e]) => Math.min(e, b) - Math.max(s, a) > barSec * 0.25)
        .map(([, , midi]) => ((midi - refKeyParsed.root) % 12 + 12) % 12);
      if (notesInBar.length >= 2) {
        kb++;
        if (notesInBar.every((pc) => sc.has(pc))) kIn++;
      }
    }
  }
  const chordInKey = kb ? kIn / kb : null;

  // 4. Overall onset envelope correlation against original audio
  const audioEnv = getAudioEnvelope(key);
  const exportEnv = buildExportEnvelope(events, r.song.bpm, barsCount);
  const envCorr = audioEnv ? correlateEnvelopes(exportEnv, audioEnv, Math.max(0, origin), r.song.bpm) : null;
  const envScore = envCorr !== null ? envCorr * cover : null;

  return {
    set, key, run, hasExport: 1, cover, bars: barsCount,
    kickF1, clapF1, hatF1,
    kickAs: kick3.a, kickFit: kick3.fit, kickPat: kick3.pat, clapAs: clap3.a, clapFit: clap3.fit, clapPat: clap3.pat,
    clapAs2: clap32.a, clapFit2: clap32.fit, clapPat2: clap32.pat,
    bassPc, bassExact, bassCover,
    chord, chordRoot, chordInKey,
    envCorr, envScore,
  };
}

const mean = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export function collapseExport(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = r.set + ':' + r.key;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return [...groups.values()].map((g) => {
    const out = { ...g[0], runs: g.length };
    delete out.run;
    for (const f of Object.keys(g[0])) {
      if (g.some((r) => typeof r[f] === 'number')) out[f] = mean(g.map((r) => r[f]));
    }
    return out;
  });
}

export function summarizeExport(rows0) {
  const rows = collapseExport(rows0);
  // Also compute per-offset means to report offset spread
  const byOffset = new Map();
  for (const r of rows0) {
    const off = r.run.includes('@') ? r.run.split('@')[1] : '0';
    if (!byOffset.has(off)) byOffset.set(off, []);
    byOffset.get(off).push(r);
  }
  const fields = ['hasExport', 'cover', 'kickF1', 'clapF1', 'hatF1', 'kickAs', 'kickFit', 'kickPat', 'clapAs', 'clapFit', 'clapPat', 'clapAs2', 'clapFit2', 'clapPat2', 'bassPc', 'bassExact', 'bassCover', 'chord', 'chordRoot', 'chordInKey', 'envCorr', 'envScore'];
  const summary = { n: rows.length };
  for (const f of fields) summary[f] = mean(rows.map((r) => r[f]));
  if (byOffset.size > 1) {
    summary.spread = {};
    for (const f of fields) {
      const offMeans = [...byOffset.values()].map((rs) => mean(rs.map((r) => r[f]))).filter((x) => x !== null);
      if (offMeans.length > 1) summary.spread[f] = Math.max(...offMeans) - Math.min(...offMeans);
    }
  }
  return summary;
}

export async function exportRows(file, targetSet = 'full') {
  const res = read(file).results;
  const out = [];
  for (const [k, r] of Object.entries(res)) {
    const row = await scoreExportRun(k, r, targetSet);
    if (row) out.push(row);
  }
  return out;
}

const f2 = (x) => (x === null || x === undefined ? '  -  ' : (Math.round(x * 100) / 100).toFixed(2).padStart(5));
const f3 = (x) => (x === null || x === undefined ? '   -  ' : (Math.round(x * 1000) / 1000).toFixed(3).padStart(6));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const root = arg('root');
  if (!file && root) {
    file = arg('out', path.join(os.tmpdir(), `exportbench-${Date.now()}.json`));
    const runArgs = [
      path.join(here, 'detbench/run.mjs'),
      `--root=${root}`,
      `--out=${file}`,
      `--sets=${arg('sets', 'full')}`,
      `--offsets=${arg('offsets', '0,5,10')}`,
      ...(arg('only') ? [`--only=${arg('only')}`] : []),
      ...(arg('par') ? [`--par=${arg('par')}`] : []),
    ];
    const r = spawnSync(process.execPath, runArgs, { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
  if (!file) {
    console.error('Usage: node tools/exportbench.mjs <results.json> [--vs=<base.json>] [--songs]');
    process.exit(1);
  }
  const targetSet = arg('set', 'full');
  const runs = await exportRows(file, targetSet);
  const vs = arg('vs');
  const baseRuns = vs ? await exportRows(vs, targetSet) : null;
  const rows = collapseExport(runs);
  const baseRows = baseRuns ? collapseExport(baseRuns) : null;
  const bmap = new Map((baseRows || []).map((r) => [r.set + ':' + r.key, r]));
  const cols = ['cover', 'kickF1', 'clapF1', 'hatF1', 'bassPc', 'bassExact', 'chord', 'chordRoot', 'chordInKey', 'envCorr', 'envScore'];

  if (process.argv.includes('--songs')) {
    console.log('song'.padEnd(36), cols.map((c) => c.padStart(6)).join(' '));
    for (const r of rows) {
      const b = bmap.get(r.set + ':' + r.key);
      const diff = b && cols.some((c) => Math.abs((r[c] ?? -1) - (b[c] ?? -1)) > 1e-3);
      if (b && !diff && !process.argv.includes('--all')) continue;
      console.log(
        `${r.set}:${r.key}`.padEnd(36),
        cols.map((c) => f2(r[c]).padStart(6)).join(' '),
        b ? ' vs ' + cols.map((c) => f2(b[c]).padStart(6)).join(' ') : ''
      );
    }
  }
  const cur = summarizeExport(runs);
  const base = baseRuns ? summarizeExport(baseRuns) : null;
  console.log(`\nEXPORT (${targetSet}, n=${cur.n}):`);
  console.log('  mean  ', cols.map((c) => `${c} ${f3(cur[c])}`).join('  '));
  if (cur.spread) {
    console.log('  spread', cols.map((c) => `${c} ${f3(cur.spread[c])}`).join('  '));
  }
  if (base) {
    console.log('  base  ', cols.map((c) => `${c} ${f3(base[c])}`).join('  '));
    console.log('  delta ', cols.map((c) => {
      const d = (cur[c] ?? 0) - (base[c] ?? 0);
      return `${c} ${(d >= 0 ? '+' : '') + d.toFixed(3)}`;
    }).join('  '));
  }
  // The kick and the clap three ways (see drumThreeWays): as exported, on the best single tempo, and with each bar slid
  // into place. as exported far under best tempo: the grid is off. best tempo near pattern alone and both low: the pattern is.
  // The clap twice: against the reference as it is, and against it with the kick's click taken out (cleanClaps): the fair key.
  const three = [['kick', 'kickAs', 'kickFit', 'kickPat'], ['clap', 'clapAs', 'clapFit', 'clapPat'], ['clap, no kick clicks', 'clapAs2', 'clapFit2', 'clapPat2']];
  console.log('\n  drums, three ways      as exported   best single tempo   pattern alone (each bar slid to fit)');
  for (const [name, a, fit, pat] of three) {
    console.log(`  ${name.padEnd(20)} ${f3(cur[a])}         ${f3(cur[fit])}              ${f3(cur[pat])}`
      + (base ? `      was ${f3(base[a])} ${f3(base[fit])} ${f3(base[pat])}` : ''));
  }
}
