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
      ?? (value === 'sawtooth' ? 'bass' : value === 'triangle' ? 'lead' : 'chords');
    return { onset: n.begin, duration: n.end - n.begin, midi: noteNumber(n.value.note), part };
  });
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
      kickF1: 0, clapF1: 0, hatF1: 0,
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
  const fields = ['hasExport', 'cover', 'kickF1', 'clapF1', 'hatF1', 'bassPc', 'bassExact', 'bassCover', 'chord', 'chordRoot', 'chordInKey', 'envCorr', 'envScore'];
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
}
