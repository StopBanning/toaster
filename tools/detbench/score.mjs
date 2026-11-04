// Scores a detection bench run (run.mjs) against the references, and compares two runs.
//   node tools/detbench/score.mjs <results.json> [--vs=<baseline results.json>] [--songs] [--pairs] [--json=<summary.json>]
// What is measured, per song (references: the downbeat key's bar lines and tempo, the truth set's stem drums, the
// drum-stem kick references):
//   tempo   the share of the time after 15 s the written tempo is right (within 4%), an octave off (x2, x1/2), or wrong
//           (3:2, 4:3, anything else), the time to the first lock and to the first right lock
//   beats   F1 of the engine's counted beats against the reference beats (70 ms), after 15 s
//   bar one the share of the engine's bar lines on a reference bar line, of those that fall on a reference beat (the
//           downbeat key's high and medium confidence songs, outside its uncertain stretches)
//   kick, clap  the written line against the stem's hits put on the engine's own grid, bar by bar: the share of bars
//           exactly right, and the step F1
//   churn   how many times a minute the written kick line changes after it first appears
import fs from 'node:fs';
import path from 'node:path';
import { REFS, KICKREF, KICKEXTRA } from './run.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const cache = new Map();
const ref = (kind, key) => {
  const id = kind + ':' + key;
  if (!cache.has(id)) {
    const file = kind === 'key' ? path.join(REFS, 'downbeat-key/key', key + '.json') : kind === 'truth' ? path.join(REFS, 'gt/truth', key + '.json')
      : [KICKREF, ...(KICKEXTRA || [])].map((d) => path.join(d, key + '.json')).find((f) => fs.existsSync(f)) || path.join(KICKREF, key + '.json');
    cache.set(id, fs.existsSync(file) ? read(file) : null);
  }
  return cache.get(id);
};

// The 16 steps a written drum line plays (stepParts' mini-notation: words, ~, [groups], *n), or null when the line is
// muted (_) or commented out (//).
export function steps(line) {
  if (!line || /^(_|\/\/)/.test(line.trim())) return null;
  const m = line.match(/s\("([^"]*)"\)/);
  if (!m) return null;
  const mn = m[1]; let i = 0;
  const term = () => {
    let node;
    if (mn[i] === '[') { i++; node = { seq: seq() }; i++; } else { let w = ''; while (i < mn.length && !' []*'.includes(mn[i])) w += mn[i++]; node = { atom: w }; }
    if (mn[i] === '*') { i++; let n = ''; while (/[0-9]/.test(mn[i] || '')) n += mn[i++]; node.rep = +n || 1; }
    return node;
  };
  const seq = () => { const ts = []; while (i < mn.length && mn[i] !== ']') { if (mn[i] === ' ') { i++; continue; } ts.push(term()); } return ts; };
  const out = new Set();
  const place = (ts, a, b) => {
    const w = (b - a) / ts.length;
    ts.forEach((t, k) => {
      const reps = t.rep || 1, rw = w / reps;
      for (let r = 0; r < reps; r++) {
        const s = a + k * w + r * rw;
        if (t.seq) place(t.seq, s, s + rw); else if (t.atom && t.atom !== '~') out.add(Math.round(s * 16) % 16);
      }
    });
  };
  place(seq(), 0, 1);
  return out;
}

const lineAt = (lines, id, t) => { let v = null; for (const [lt, lid, text] of lines) { if (lt > t) break; if (lid === id) v = text; } return v; };
const tempoAt = (tempo, t) => { let v = null; for (const row of tempo) { if (row[0] > t) break; v = row; } return v; };
function refBeats(key, truth) {
  // beats from the downbeat key's bar lines (four to a bar), else the truth set's beats
  if (key?.downbeats?.length > 1) {
    const out = [], d = key.downbeats;
    for (let i = 0; i + 1 < d.length; i++) for (let b = 0; b < 4; b++) out.push({ t: d[i] + (d[i + 1] - d[i]) * b / 4, down: b === 0 });
    return out;
  }
  return (truth?.beat?.ensemble_beats || []).map(([t, n]) => ({ t, down: n === 1 }));
}
function localBpm(beats, t) {
  // median beat length over the 8 reference beats nearest t
  if (beats.length < 3) return null;
  let lo = 0, hi = beats.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (beats[mid].t < t) lo = mid; else hi = mid; }
  const a = Math.max(0, lo - 4), b = Math.min(beats.length - 1, lo + 4);
  const d = []; for (let i = a; i < b; i++) d.push(beats[i + 1].t - beats[i].t);
  d.sort((x, y) => x - y);
  return 60 / d[d.length >> 1];
}
function tempoClass(bpm, rb) {
  if (!bpm) return 'unlocked';
  const r = bpm / rb, near = (x) => Math.abs(r / x - 1) <= 0.04;
  if (near(1)) return 'ok';
  if (near(2) || near(0.5)) return 'octave';
  if (near(1.5) || near(2 / 3) || near(0.75) || near(4 / 3) || near(3) || near(1 / 3)) return 'ratio';
  return 'other';
}
function match(a, b, tol) {
  // greedy one-to-one match of two sorted time lists
  let i = 0, j = 0, n = 0;
  while (i < a.length && j < b.length) {
    const d = a[i] - b[j];
    if (Math.abs(d) <= tol) { n++; i++; j++; } else if (d < 0) i++; else j++;
  }
  return n;
}
function engineBars(beats, from, to) {
  const downs = beats.filter(([, p]) => p === 0).map(([t]) => t);
  const bars = [];
  for (let i = 0; i + 1 < downs.length; i++) {
    const a = downs[i], b = downs[i + 1];
    if (a >= from && b <= to && b - a > 0.8 && b - a < 4) bars.push([a, b]);
  }
  return bars;
}
function drumScore(r, id, hits, from, to) {
  // the written line against hits (times) on the engine's grid, bar by bar
  let bars = 0, exact = 0, tp = 0, fp = 0, fn = 0;
  for (const [a, b] of engineBars(r.beats, from, to)) {
    const step = (b - a) / 16, want = new Set();
    for (const t of hits) if (t >= a - step / 2 && t < b - step / 2) want.add(Math.max(0, Math.min(15, Math.round((t - a) / step))));
    const got = steps(lineAt(r.lines, id, a + (b - a) / 2)) || new Set();
    bars++;
    let same = want.size === got.size;
    for (const s of got) { if (want.has(s)) tp++; else { fp++; same = false; } }
    for (const s of want) if (!got.has(s)) fn++;
    if (same) exact++;
  }
  return bars ? { bars, exact: exact / bars, f1: tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : 1 } : null;
}
function churn(r, id, from, to) {
  let first = null, changes = 0, prev = null;
  for (const [t, lid, text] of r.lines) {
    if (lid !== id || t < from || t > to) continue;
    const s = steps(text);
    if (!s) continue;
    const k = [...s].sort((x, y) => x - y).join(',');
    if (first === null) first = t; else if (k !== prev) changes++;
    prev = k;
  }
  return first === null || to - first < 10 ? null : changes / ((to - first) / 60);
}

export function scoreSong(name, r) {
  const [set, rest] = name.split(':'), [key] = rest.split('@');
  if (r.error) return { set, key, error: r.error.split('\n')[0] };
  const from = r.from, end = r.from + r.seconds, row = { set, key };
  if (set === 'full' || set === 'mid') {
    const K = ref('key', key), truth = ref('truth', key), rb = refBeats(K, truth);
    const lockRow = r.tempo.find((x) => x[1]);
    row.lock = lockRow ? +(lockRow[0] - from).toFixed(1) : null;
    const counts = { ok: 0, octave: 0, ratio: 0, other: 0, unlocked: 0 }; let n = 0, firstOk = null;
    for (let t = from + 0.25; t < end; t += 0.25) {
      const tr = tempoAt(r.tempo, t), rbpm = localBpm(rb, t);
      if (!rbpm) continue;
      const c = tempoClass(tr?.[1], rbpm);
      if (c === 'ok' && firstOk === null) firstOk = t - from;
      if (t - from < 15) continue;
      counts[c]++; n++;
    }
    for (const c in counts) row[c] = n ? counts[c] / n : null;
    row.firstOk = firstOk === null ? null : +firstOk.toFixed(1);
    const eb = r.beats.map(([t]) => t).filter((t) => t >= from + 15);
    const covered = rb.filter((b) => b.t >= from + 15 && b.t <= end).map((b) => b.t);
    const m = match(eb, covered, 0.07);
    row.beatF1 = eb.length + covered.length ? 2 * m / (eb.length + covered.length) : null;
    if (K && ['high', 'medium'].includes(K.confidence)) {
      const bad = (t) => (K.uncertain_intervals || []).some(([a, b]) => t >= a && t <= b);
      const refDown = rb.filter((b) => b.down).map((b) => b.t), refAll = rb.map((b) => b.t);
      let onBeat = 0, onDown = 0;
      for (const [t, p] of r.beats) {
        if (p !== 0 || t < from + 15 || bad(t)) continue;
        if (!refAll.some((x) => Math.abs(x - t) <= 0.07)) continue;
        onBeat++; if (refDown.some((x) => Math.abs(x - t) <= 0.07)) onDown++;
      }
      row.barOne = onBeat >= 4 ? onDown / onBeat : null;
      row.conf = K.confidence;
    }
    if (set === 'full' && truth) {
      const strong = (o) => o.confirmed_by_neural || o.strength >= 0.8;
      row.kickT = drumScore(r, 'bd', (truth.drums?.kick?.onsets || []).filter(strong).map((o) => o.time), from + 15, end);
      row.clapT = drumScore(r, 'sd', (truth.drums?.clap?.onsets || []).filter(strong).map((o) => o.time), from + 15, end);
    }
    row.churn = churn(r, 'bd', from, end);
  } else if (set === 'synth') {
    const T = r.truth, bars = T.bars;
    const pulse = bars.length > 1;
    if (!pulse) {
      // (talk, ambient: no beat to find; locking at all is the mistake)
      let n = 0, locked = 0;
      for (let t = 10; t < end; t += 0.25) { n++; if (tempoAt(r.tempo, t)?.[1]) locked++; }
      row.falseLock = n ? locked / n : null;
      return row;
    }
    const bpmAt = (t) => { let v = bars[0][1]; for (const [c, b] of bars) { if (c > t) break; v = b; } return v; };
    let n = 0, ok = 0, oct = 0, firstOk = null;
    for (let t = 0.25; t < end; t += 0.25) {
      const c = tempoClass(tempoAt(r.tempo, t)?.[1], bpmAt(t));
      if (c === 'ok' && firstOk === null) firstOk = t;
      if (t < 10) continue;
      n++; if (c === 'ok') ok++; if (c === 'octave') oct++;
    }
    row.ok = n ? ok / n : null; row.octave = n ? oct / n : null; row.firstOk = firstOk;
    const downs = bars.map(([c]) => c);
    let onDown = 0, all = 0;
    for (const [t, p] of r.beats) { if (p !== 0 || t < 10) continue; all++; if (downs.some((x) => Math.abs(x - t) <= 0.07)) onDown++; }
    row.barOne = all >= 4 ? onDown / all : null;
    for (const id of ['bd', 'sd', 'hhc', 'hho']) if (T.drums[id]?.length) row[id] = drumScore(r, id, T.drums[id], 12, end);
    row.churn = churn(r, 'bd', 0, end);
  } else if (set === 'kick') {
    const K = ref('kick', key);
    if (!K) return { set, key, error: 'no reference' };
    const [a, b] = K.window;
    row.kick = drumScore(r, 'bd', K.kicks.map(([t]) => t), a, b);
    const tr = tempoAt(r.tempo, (a + b) / 2);
    row.tempo = tempoClass(tr?.[1], K.bpm_fit || K.bpm);
    row.churn = churn(r, 'bd', a, b);
  }
  return row;
}

const mean = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
// Runs of one song at several poll offsets (run.mjs --offsets: the written lines are sensitive to where the 15 ms polls
// fall, as live runs differ) averaged into one row, so a song counts once.
export function collapse(rows) {
  const groups = new Map();
  for (const r of rows) { const k = r.set + ':' + r.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  return [...groups.values()].map((g) => {
    const ok = g.filter((r) => !r.error);
    if (!ok.length) return g[0];
    const out = { ...ok[0], runs: ok.length };
    for (const [f, v] of Object.entries(ok[0])) {
      if (typeof v === 'number') out[f] = mean(ok.map((r) => r[f] ?? null));
      else if (v && typeof v === 'object' && 'exact' in v) out[f] = { bars: v.bars, exact: mean(ok.map((r) => r[f]?.exact ?? null)), f1: mean(ok.map((r) => r[f]?.f1 ?? null)) };
      else if (f === 'tempo') out.tempoOk = mean(ok.map((r) => (r.tempo === 'ok' ? 1 : 0)));
    }
    return out;
  });
}
export function summarize(rows0) {
  const rows = collapse(rows0);
  const s = {};
  const by = (set) => rows.filter((r) => r.set === set && !r.error);
  for (const set of ['full', 'mid']) {
    const R = by(set); if (!R.length) continue;
    s[set] = { n: R.length, ok: mean(R.map((r) => r.ok)), octave: mean(R.map((r) => r.octave)), wrong: mean(R.map((r) => (r.ratio ?? 0) + (r.other ?? 0))),
      unlocked: mean(R.map((r) => r.unlocked)), firstOk: mean(R.map((r) => r.firstOk)), lock: mean(R.map((r) => r.lock)),
      beatF1: mean(R.map((r) => r.beatF1)), barOne: mean(R.map((r) => r.barOne)), barOneN: R.filter((r) => r.barOne !== null && r.barOne !== undefined).length,
      kickExact: mean(R.map((r) => r.kickT?.exact ?? null)), kickF1: mean(R.map((r) => r.kickT?.f1 ?? null)),
      clapExact: mean(R.map((r) => r.clapT?.exact ?? null)), clapF1: mean(R.map((r) => r.clapT?.f1 ?? null)), churn: mean(R.map((r) => r.churn)),
      agree: mean(R.map((r) => r.agree ?? null)) };
  }
  const Y = by('synth');
  if (Y.length) {
    const P = Y.filter((r) => r.falseLock === undefined);
    s.synth = { n: Y.length, ok: mean(P.map((r) => r.ok)), octave: mean(P.map((r) => r.octave)), firstOk: mean(P.map((r) => r.firstOk)), barOne: mean(P.map((r) => r.barOne)),
      kickExact: mean(P.map((r) => r.bd?.exact ?? null)), clapExact: mean(P.map((r) => r.sd?.exact ?? null)), hhcExact: mean(P.map((r) => r.hhc?.exact ?? null)),
      hhoExact: mean(P.map((r) => r.hho?.exact ?? null)), falseLock: mean(Y.map((r) => r.falseLock ?? null)) };
  }
  const K = by('kick');
  if (K.length) s.kick = { n: K.length, kickExact: mean(K.map((r) => r.kick?.exact ?? null)), kickF1: mean(K.map((r) => r.kick?.f1 ?? null)),
    tempoOk: mean(K.map((r) => r.tempoOk ?? (r.tempo === 'ok' ? 1 : 0))), churn: mean(K.map((r) => r.churn)), agree: mean(K.map((r) => r.agree ?? null)), pass80: K.filter((r) => (r.kick?.exact ?? 0) >= 0.8).length };
  s.errors = rows.filter((r) => r.error).length;
  return s;
}
export function scoreFile(file) {
  const d = read(file);
  const rows = Object.entries(d.results).map(([k, r]) => scoreSong(k, r));
  // agree: with several poll offsets, the share of moments (every half second, from 20 s in) the written kick line is the
  // same in every run: 1 when the line doesn't depend on where the polls fell
  const groups = new Map();
  for (const [k, r] of Object.entries(d.results)) { if (r.error) continue; const b = k.split('@')[0]; if (!groups.has(b)) groups.set(b, []); groups.get(b).push(r); }
  for (const [b, rs] of groups) {
    if (rs.length < 2) continue;
    let n = 0, same = 0;
    const end = rs[0].from + rs[0].seconds;
    for (let t = rs[0].from + 20; t < end; t += 0.5) {
      const ks = rs.map((r) => { const st = steps(lineAt(r.lines, 'bd', t)); return st ? [...st].sort((x, y) => x - y).join(',') : '-'; });
      n++; if (ks.every((x) => x === ks[0])) same++;
    }
    for (const row of rows) if (row.set + ':' + row.key === b && n) row.agree = same / n;
  }
  return rows;
}

const f2 = (x) => (x === null || x === undefined ? '  -  ' : (Math.round(x * 100) / 100).toFixed(2).padStart(5));
function printSummary(s, b) {
  for (const set of ['full', 'mid', 'kick', 'synth']) {
    if (!s[set]) continue;
    const parts = Object.entries(s[set]).map(([k, v]) => {
      const bv = b?.[set]?.[k];
      const d = typeof v === 'number' && typeof bv === 'number' && k !== 'n' ? ` (${v - bv >= 0 ? '+' : ''}${(Math.round((v - bv) * 100) / 100).toFixed(2)})` : '';
      return `${k} ${typeof v === 'number' ? (Number.isInteger(v) ? v : f2(v).trim()) : v}${d}`;
    });
    console.log(`${set.padEnd(5)} ${parts.join('  ')}`);
  }
  if (s.errors) console.log(`errors: ${s.errors}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const file = process.argv[2], vs = arg('vs');
  const rows = scoreFile(file), base = vs ? scoreFile(vs) : null;
  const s = summarize(rows), bs = base ? summarize(base) : null;
  if (process.argv.includes('--songs')) {
    const bmap = new Map(collapse(base || []).map((r) => [r.set + ':' + r.key, r]));
    for (const r of collapse(rows)) {
      const o = bmap.get(r.set + ':' + r.key);
      if (r.error) { console.log(`${r.set}:${r.key} ERROR ${r.error}`); continue; }
      const cols = r.set === 'synth'
        ? (r.falseLock !== undefined ? [['falseLock', r.falseLock, o?.falseLock]] : [['ok', r.ok, o?.ok], ['oct', r.octave, o?.octave], ['1stOk', r.firstOk, o?.firstOk], ['bar1', r.barOne, o?.barOne],
          ['kick', r.bd?.exact, o?.bd?.exact], ['clap', r.sd?.exact, o?.sd?.exact], ['hhc', r.hhc?.exact, o?.hhc?.exact], ['hho', r.hho?.exact, o?.hho?.exact]])
        : r.set === 'kick'
        ? [['kick', r.kick?.exact, o?.kick?.exact], ['kF1', r.kick?.f1, o?.kick?.f1], ['churn', r.churn, o?.churn]]
        : [['ok', r.ok, o?.ok], ['oct', r.octave, o?.octave], ['wrong', (r.ratio ?? 0) + (r.other ?? 0), o ? (o.ratio ?? 0) + (o.other ?? 0) : null], ['1stOk', r.firstOk, o?.firstOk],
          ['beatF1', r.beatF1, o?.beatF1], ['bar1', r.barOne, o?.barOne], ['kick', r.kickT?.exact, o?.kickT?.exact], ['clap', r.clapT?.exact, o?.clapT?.exact], ['churn', r.churn, o?.churn]];
      const txt = cols.map(([n, v, w]) => `${n} ${f2(v)}${o && v !== w && Number.isFinite(v) && Number.isFinite(w) && Math.abs(v - w) > 0.005 ? (v > w ? '↑' : '↓') : ' '}`).join(' ');
      console.log(`${(r.set + ':' + r.key).slice(0, 34).padEnd(34)} ${txt}${r.tempo ? ' tempo ' + r.tempo : ''}`);
    }
  }
  printSummary(s, bs);
  if (base && process.argv.includes('--pairs')) {
    // per song (averaged over its poll offsets): how many got better or worse by more than 0.1 on each measure
    const A = new Map(collapse(rows).map((r) => [r.set + ':' + r.key, r])), B = new Map(collapse(base).map((r) => [r.set + ':' + r.key, r]));
    const get = { ok: (r) => r.ok, wrong: (r) => (r.ratio ?? 0) + (r.other ?? 0), beatF1: (r) => r.beatF1, barOne: (r) => r.barOne, kick: (r) => r.kickT?.exact ?? r.kick?.exact ?? r.bd?.exact,
      kickF1: (r) => r.kickT?.f1 ?? r.kick?.f1 ?? r.bd?.f1, clap: (r) => r.clapT?.exact ?? r.sd?.exact, hhc: (r) => r.hhc?.exact, agree: (r) => r.agree, falseLock: (r) => r.falseLock };
    const lower = new Set(['wrong', 'falseLock']);
    for (const [m, f] of Object.entries(get)) {
      const up = [], down = [];
      for (const [k, a] of A) {
        const b = B.get(k); if (!b || a.error || b.error) continue;
        const x = f(a), y = f(b); if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const d = lower.has(m) ? y - x : x - y;
        if (d > 0.1) up.push(k); else if (d < -0.1) down.push(`${k} (${y.toFixed(2)}->${x.toFixed(2)})`);
      }
      if (up.length || down.length) console.log(`${m.padEnd(9)} better ${String(up.length).padStart(3)}  worse ${String(down.length).padStart(3)}${down.length ? '  worse: ' + down.slice(0, 12).join(', ') + (down.length > 12 ? ' ...' : '') : ''}`);
    }
  }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ summary: s, rows }, null, 1));
}
