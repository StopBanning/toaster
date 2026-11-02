// (bench instrumentation) Scores a bench run's harmony: the key line, the chords and the bass notes, against what is known.
//   node tools/detbench/harmony.mjs <results.json> [--vs=<baseline results.json>] [--songs] [--runs] [--json=<rows.json>]
// References (all provisional, none annotated by hand):
//   key     docs/key-stability/references (the key the chord model and the whole mix's profile agree on; where they don't,
//           the chord model's, scored for steadiness only), Better Off Alone (Ab minor) and Toz Pembe (D minor), the key
//           work's held-out songs (docs/key-stability/heldout, round 3's twelve, made the same way), the test songs' own keys
//   chords  the same references' chord sequences (madmom's CNN + CRF, major and minor), the test songs' own chords
//   bass    the truth set's bass notes (YIN on the separated bass stem; blind under 35 Hz), the test songs' own notes
// Per song: key right (the share of the time after 15 s the key line shows the reference; agreed references only),
// relative and parallel (shares showing the reference's relative or parallel key), changes a minute (the key line moving
// from one key to another, after it first shows one), the key it settles on (the most shown in the run's second half);
// chords: of the bars with a reference chord (over half the bar), the share whose chord as written is right (root and
// third), and the share right of those the engine found a chord in; bass: of the beats with a reference note (over a
// third of the beat), the share whose written note is the right pitch class, and the share exactly right.
// A song heard several times (run.mjs --offsets, the key set's poll phases) is one row, its runs averaged (as score.mjs
// does): its settled keys are counted over the runs (Abm 9/15), and the time the line shows the reference for good is the
// runs' median (a run that doesn't end on it: never). --runs prints every run of the key set.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFS } from './run.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const KEYDOCS = path.join(here, '../../docs/key-stability/references');
const KEYHELD = process.env.DETBENCH_KEYHELD || path.join(here, '../../docs/key-stability/heldout');
const SYNTH_KEYS = { house: 'Am', pop: 'C', boombap: 'Dm', trap: 'F#m', dubstep: 'Fm', dnb: 'Em', reggaeton: 'Gm', afrobeats: 'E', rock: 'E', shuffle: 'Cm',
  acoustic: 'G', loud: 'Am', quiet: 'C', intro: 'C', pads: 'Am', pumping: 'Am' };
const keyName = (k) => (k ? NOTES[k.root] + (k.mode === 'minor' ? 'm' : '') : null);
const parseKey = (s) => { const m = /^([A-G][#b]?)(m?)$/.exec(s || ''); return m ? { root: PC[m[1]], minor: !!m[2] } : null; };
const sameKey = (a, b) => a && b && a.root === b.root && a.minor === b.minor;
const relKey = (a, b) => a && b && a.minor !== b.minor && (a.minor ? (b.root + 9) % 12 === a.root : (a.root + 9) % 12 === b.root);
const parKey = (a, b) => a && b && a.root === b.root && a.minor !== b.minor;
const midiOf = (s) => { const m = /^([a-g][#b]?)(-?\d)$/i.exec(s || ''); return m ? PC[m[1][0].toUpperCase() + m[1].slice(1)] + 12 * (+m[2] + 1) : null; };

const cache = new Map();
function keyRef(set, key) {
  const id = set + ':' + key;
  if (cache.has(id)) return cache.get(id);
  let ref = null;
  const base = key.replace(/#\d+$/, '');
  if (set === 'synth') {
    const k = SYNTH_KEYS[base];
    ref = k ? { key: k, agreed: true } : null;
  } else {
    const file = [path.join(KEYDOCS, base + '.json'), path.join(KEYHELD, base + '.json')].find((f) => fs.existsSync(f));
    const d = file ? read(file) : null;
    if (base === 'betteroffalone-alicedeejay') ref = { key: 'Abm', agreed: true };
    else if (d) {
      const k = d.reference || d.chordKey?.[0];
      ref = { key: keyName(k), agreed: !!d.reference, chords: (d.chords || []).filter((c) => c.label !== 'N').map((c) => {
        const [r, q] = c.label.split(':');
        return [c.start, c.end, NOTES[PC[r]] + (q === 'min' ? 'm' : '')];
      }) };
    }
  }
  cache.set(id, ref);
  return ref;
}
const truthCache = new Map();
function bassTruth(key) {
  if (!truthCache.has(key)) {
    const f = path.join(REFS, 'gt/truth', key + '.json');
    truthCache.set(key, fs.existsSync(f) ? (read(f).bass?.notes || []).map((n) => [n.start, n.end, n.midi]) : null);
  }
  return truthCache.get(key);
}
// the most covered value of [start, end, value] spans over [a, b), and its share of b - a
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

export function scoreHarmony(name, r) {
  // (set:song#phase@offset: a key-set phase and a poll offset are another run of one song; a synth take #2 is its own song)
  const [set, run] = name.split(':'), key = set === 'key' ? run.split('@')[0].replace(/#\d+$/, '') : run.split('@')[0];
  if (r.error || !r.harmony) return null;
  const ref = keyRef(set, key);
  const from = r.from, end = r.from + r.seconds, row = { set, key, run, ref: ref?.key ?? null, agreed: !!ref?.agreed };
  // the key line over time
  const keys = [];
  for (const [t, id, text] of r.lines) if (id === 'scale') keys.push([t, (/scale = "([A-G][#b]?):(major|minor)"/.exec(text) || []).slice(1)]);
  const tl = keys.map(([t, m]) => [t, m.length ? m[0] + (m[1] === 'minor' ? 'm' : '') : null]);
  const at = (t) => { let v = null; for (const [lt, k] of tl) { if (lt > t) break; v = k; } return v; };
  const R = parseKey(ref?.key);
  let n = 0, right = 0, rel = 0, par = 0, none = 0;
  const shown = new Map(), half = (from + 15 + end) / 2;
  for (let t = from + 15; t < end; t += 0.25) {
    const k = at(t), K = parseKey(k);
    n++;
    if (!K) none++;
    else if (sameKey(K, R)) right++;
    else if (relKey(K, R)) rel++;
    else if (parKey(K, R)) par++;
    if (t >= half && k) shown.set(k, (shown.get(k) || 0) + 1);
  }
  row.right = R && n ? right / n : null;
  row.rel = R && n ? rel / n : null;
  row.par = R && n ? par / n : null;
  row.none = n ? none / n : null;
  // (relFlips: the changes from a key to its own relative, as A minor to C major, whatever the reference)
  let changes = 0, relFlips = 0, first = null, prev = null;
  for (const [t, k] of tl) {
    if (!k) continue;
    if (first === null) first = t; else if (k !== prev) { changes++; if (relKey(parseKey(k), parseKey(prev))) relFlips++; }
    prev = k;
  }
  row.changes = first !== null && end - first >= 20 ? changes / ((end - first) / 60) : null;
  row.relFlips = first !== null && end - first >= 20 ? relFlips / ((end - first) / 60) : null;
  row.settled = [...shown].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  row.final = at(end - 0.01);
  row.endsRight = R ? (sameKey(parseKey(row.final), R) ? 1 : 0) : null;
  // the time the key line shows the reference for good (null: it doesn't end on it)
  let stable = null;
  if (R) for (let i = tl.length - 1; i >= 0; i--) { if (!sameKey(parseKey(tl[i][1]), R)) break; stable = tl[i][0] - from; }
  row.stable = stable;
  // chords and bass, bar by bar
  const truthChords = set === 'synth' ? (r.truth?.bars || []).map(([c], i, bs) => [c, bs[i + 1]?.[0] ?? c + 240 / bs[i][1], bs[i][2]]) : ref?.chords;
  const bassNotes = set === 'synth' ? (r.truth?.bass || []).map(([s, m, l]) => [s, s + l, m]) : bassTruth(key.replace(/#\d+$/, ''));
  let cb = 0, cRight = 0, cFound = 0, cFoundRight = 0, cRoot = 0;
  let bb = 0, bPc = 0, bExact = 0, bAny = 0;
  for (const [s, len, fresh, written, , wbass] of r.harmony) {
    if (s < from + 15 || s + len > end) continue;
    if (truthChords?.length) {
      const m = mostOver(truthChords, s, s + len);
      if (m.v && m.share > 0.5) {
        cb++;
        const W = parseKey(written), F = parseKey(fresh), T = parseKey(m.v);
        if (sameKey(W, T)) cRight++;
        if (W && W.root === T.root) cRoot++;
        if (F) { cFound++; if (sameKey(F, T)) cFoundRight++; }
      }
    }
    if (bassNotes?.length) {
      const beatsW = Array.isArray(wbass) ? wbass : wbass ? [0, 1, 2, 3].map(() => midiOf(wbass)) : [null, null, null, null];
      for (let k = 0; k < 4; k++) {
        const a = s + (k * len) / 4, b = s + ((k + 1) * len) / 4, m = mostOver(bassNotes, a, b);
        if (!(m.v > 0) || m.share < 1 / 3) continue;
        bb++;
        const w = beatsW[k];
        if (w === null || w === undefined) continue;
        bAny++;
        if ((w - m.v) % 12 === 0) bPc++;
        if (w === m.v) bExact++;
      }
    }
  }
  row.chordBars = cb;
  row.chord = cb ? cRight / cb : null;
  row.chordRoot = cb ? cRoot / cb : null;
  row.chordPrec = cFound ? cFoundRight / cFound : null;
  row.bassBeats = bb;
  row.bassPc = bb ? bPc / bb : null;
  row.bassExact = bb ? bExact / bb : null;
  row.bassCover = bb ? bAny / bb : null;
  return row;
}

const mean = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
// A song's runs (poll offsets, the key set's phases) as one row: the measures averaged, the keys settled on counted (most
// first), the time it shows the reference for good the runs' median (a run that doesn't end on it counts as never: null)
export function collapseHarmony(rows) {
  const groups = new Map();
  for (const r of rows) { const k = r.set + ':' + r.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  return [...groups.values()].map((g) => {
    const out = { ...g[0], runs: g.length };
    delete out.run;
    for (const f of Object.keys(g[0])) if (f !== 'stable' && g.some((r) => typeof r[f] === 'number')) out[f] = mean(g.map((r) => r[f]));
    const count = (f) => { const m = new Map(); for (const r of g) m.set(r[f] ?? '-', (m.get(r[f] ?? '-') || 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
    out.settledAll = count('settled');
    out.settled = out.settledAll[0][0] === '-' ? null : out.settledAll[0][0];
    const st = g.map((r) => (r.stable === null ? Infinity : r.stable)).sort((a, b) => a - b), med = st[(st.length - 1) >> 1];
    out.stable = out.ref && Number.isFinite(med) ? med : null;
    return out;
  });
}
export function summarizeHarmony(rows0) {
  const rows = collapseHarmony(rows0);
  const s = {};
  for (const set of ['full', 'mid', 'key', 'held', 'synth']) {
    const R = rows.filter((r) => r && r.set === set);
    if (!R.length) continue;
    const A = R.filter((r) => r.agreed);
    s[set] = { n: R.length, agreedN: A.length, right: mean(A.map((r) => r.right)), rel: mean(A.map((r) => r.rel)), par: mean(A.map((r) => r.par)),
      rightAll: mean(R.map((r) => r.right)), relAll: mean(R.map((r) => r.rel)), changes: mean(R.map((r) => r.changes)), relFlips: mean(R.map((r) => r.relFlips)),
      none: mean(R.map((r) => r.none)), endsRight: mean(A.map((r) => r.endsRight)),
      chord: mean(R.map((r) => r.chord)), chordRoot: mean(R.map((r) => r.chordRoot)), chordPrec: mean(R.map((r) => r.chordPrec)),
      bassPc: mean(R.map((r) => r.bassPc)), bassExact: mean(R.map((r) => r.bassExact)), bassCover: mean(R.map((r) => r.bassCover)) };
  }
  return s;
}
export const harmonyRows = (file) => Object.entries(read(file).results).map(([k, r]) => scoreHarmony(k, r)).filter(Boolean);

const f2 = (x) => (x === null || x === undefined ? '  -  ' : (Math.round(x * 100) / 100).toFixed(2).padStart(5));
const settledText = (r) => r.settledAll.map(([k, n]) => (r.runs > 1 ? `${k} ${n}/${r.runs}` : k)).join(', ');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runs = harmonyRows(process.argv[2]), vs = arg('vs'), baseRuns = vs ? harmonyRows(vs) : null;
  const rows = collapseHarmony(runs), base = baseRuns ? collapseHarmony(baseRuns) : null;
  const bmap = new Map((base || []).map((r) => [r.set + ':' + r.key, r]));
  const cols = ['right', 'rel', 'par', 'changes', 'relFlips', 'chord', 'chordPrec', 'bassPc', 'bassExact'];
  if (process.argv.includes('--songs')) {
    for (const r of rows) {
      const o = bmap.get(r.set + ':' + r.key);
      const txt = cols.map((c) => `${c} ${f2(r[c])}${o && Number.isFinite(r[c]) && Number.isFinite(o[c]) && Math.abs(r[c] - o[c]) > 0.005 ? (r[c] > o[c] ? '↑' : '↓') : ' '}`).join(' ');
      console.log(`${(r.set + ':' + r.key).slice(0, 34).padEnd(34)} ${(r.ref || '-').padEnd(4)}${r.agreed ? '*' : ' '} ${txt}  settled ${settledText(r)}${o && settledText(o) !== settledText(r) ? ` (was ${settledText(o)})` : ''}`);
    }
  }
  if (process.argv.includes('--runs')) {
    for (const r of runs.filter((x) => x.set === 'key')) {
      const keys = [];
      for (const [t, id, text] of read(process.argv[2]).results['key:' + r.run].lines) if (id === 'scale') keys.push(`${(/"([^"]*)"/.exec(text) || [, '-'])[1]}@${t.toFixed(1)}`);
      console.log(`${('key:' + r.run).padEnd(40)} right ${f2(r.right)} rel ${f2(r.rel)} settled ${r.settled ?? '-'}  ${keys.join(' > ')}`);
    }
  }
  const s = summarizeHarmony(runs), b = baseRuns ? summarizeHarmony(baseRuns) : null;
  for (const set of Object.keys(s)) {
    const parts = Object.entries(s[set]).map(([k, v]) => {
      const bv = b?.[set]?.[k];
      const d = typeof v === 'number' && typeof bv === 'number' && !['n', 'agreedN'].includes(k) && Math.abs(v - bv) > 0.0005 ? ` (${v - bv >= 0 ? '+' : ''}${(Math.round((v - bv) * 1000) / 1000).toFixed(3)})` : '';
      return `${k} ${typeof v === 'number' ? (Number.isInteger(v) ? v : (Math.round(v * 1000) / 1000).toFixed(3)) : v}${d}`;
    });
    console.log(`${set.padEnd(5)} ${parts.join('  ')}`);
  }
  if (base) {
    // per song (its runs averaged), better / same / worse on each measure (a change under 0.01 is the same)
    for (const c of ['right', 'rel', 'changes', 'relFlips', 'chord', 'bassPc']) {
      let better = 0, same = 0, worse = 0; const worseList = [];
      for (const r of rows) {
        const o = bmap.get(r.set + ':' + r.key);
        if (!o || !Number.isFinite(r[c]) || !Number.isFinite(o[c]) || (['right', 'rel'].includes(c) && !r.agreed)) continue;
        const d = ['changes', 'relFlips', 'rel'].includes(c) ? o[c] - r[c] : r[c] - o[c];
        if (Math.abs(d) < 0.01) same++; else if (d > 0) better++; else { worse++; worseList.push(`${r.set}:${r.key} (${o[c].toFixed(2)}->${r[c].toFixed(2)})`); }
      }
      console.log(`${c}: better ${better}, same ${same}, worse ${worse}${worseList.length ? ' (' + worseList.join(', ') + ')' : ''}`);
    }
  }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ summary: s, rows }, null, 1));
}
