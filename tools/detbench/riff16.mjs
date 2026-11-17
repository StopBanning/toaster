// (bench instrumentation) The live bass line by the beat (as it was) against by the 16th (the riff, as the export writes it), per bar,
// against the truth set's bass notes (YIN on the separated bass stem). For every 16th of every bar the engine filed:
//   truth: the note the stem has there (null: none); beat: the bar's note by the beat, filled forward as the old code wrote it; riff:
//   riffNotes' note there (a rest is null), or the by-the-beat note where the bar has no riff (as codegen.js riffBar falls back).
// Scored on the 16ths where the truth has a note: exact (same MIDI note), pitch class right; and on the 16ths where it has none: a note written
// anyway ("false"). And the first bar whose exact share on its truth 16ths reaches 0.6 (the time to a bass line that's right).
//   node tools/detbench/riff16.mjs <results.json> [--root=<checkout>]
import fs from 'node:fs';
import path from 'node:path';
import { REFS } from './run.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const root = arg('root', path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const { riffNotes } = await import(path.join(root, 'renderer/codegen.js'));
const res = JSON.parse(fs.readFileSync(process.argv.find((x) => x.endsWith('.json')), 'utf8')).results;
const rows = [];
for (const [name, r] of Object.entries(res)) {
  if (r.error || !r.bass16?.length || !name.startsWith('full:')) continue;
  const key = name.slice(5).split('@')[0].replace(/#\d+$/, '');
  const tf = path.join(REFS, 'gt/truth', key + '.json');
  if (!fs.existsSync(tf)) continue;
  const truth = (JSON.parse(fs.readFileSync(tf, 'utf8')).bass?.notes || []).map((n) => [n.start, n.end, n.midi]);
  const at = (t) => { let m = null; for (const [a, b, n] of truth) { if (a > t) break; if (t <= b) m = n; } return m; };
  const sc = { beat: { ex: 0, pc: 0, n: 0, fa: 0, nf: 0, first: null }, riff: { ex: 0, pc: 0, n: 0, fa: 0, nf: 0, first: null } };
  let bar = 0;
  for (const [t0, len, steps, beats, one, on, kick] of r.bass16) {
    bar++;
    const filled = beats ? (() => { let cur = beats.find((m) => m !== null); return beats.map((m) => (m !== null ? (cur = m) : cur)); })() : null;
    const byBeat = (s) => (filled ? filled[s >> 2] : null);
    const riff = steps ? riffNotes(steps, on, kick, beats || null) : null;
    const riffAt = Array(16).fill(null);
    if (riff) for (const n of riff) for (let s = Math.round(n.onset * 16); s < Math.round((n.onset + n.duration) * 16); s++) riffAt[s] = n.pitch;
    const written = { beat: (s) => byBeat(s), riff: (s) => (riff ? riffAt[s] : byBeat(s)) };
    for (const k of ['beat', 'riff']) {
      let ex = 0, n = 0;
      for (let s = 0; s < 16; s++) {
        const tr = at(t0 + (len * (s + 0.5)) / 16), w = written[k](s);
        if (tr === null) { sc[k].nf++; if (w !== null && w !== undefined) sc[k].fa++; continue; }
        n++; sc[k].n++;
        if (w === tr) { ex++; sc[k].ex++; }
        if (w !== null && w !== undefined && ((w % 12) + 12) % 12 === ((tr % 12) + 12) % 12) sc[k].pc++;
      }
      if (sc[k].first === null && n >= 4 && ex / n >= 0.6) sc[k].first = +t0.toFixed(1);
    }
  }
  rows.push([key, sc]);
}
const f = (x, y) => (y ? (x / y).toFixed(2) : ' - ');
console.log('song'.padEnd(30), 'step right (note exact, or rest on a rest) beat->riff |  exact beat->riff   pc beat->riff   false beat->riff   first right bar (s) beat->riff');
let T = { beat: { ex: 0, pc: 0, n: 0, fa: 0, nf: 0 }, riff: { ex: 0, pc: 0, n: 0, fa: 0, nf: 0 } };
for (const [key, sc] of rows) {
  const acc = (k) => f(sc[k].ex + sc[k].nf - sc[k].fa, sc[k].n + sc[k].nf);
  console.log(key.padEnd(30), `${acc('beat')} -> ${acc('riff')}  |  ${f(sc.beat.ex, sc.beat.n)} -> ${f(sc.riff.ex, sc.riff.n)}      ${f(sc.beat.pc, sc.beat.n)} -> ${f(sc.riff.pc, sc.riff.n)}      ${f(sc.beat.fa, sc.beat.nf)} -> ${f(sc.riff.fa, sc.riff.nf)}        ${sc.beat.first ?? 'never'} -> ${sc.riff.first ?? 'never'}`);
  for (const k of ['beat', 'riff']) for (const x of ['ex', 'pc', 'n', 'fa', 'nf']) T[k][x] += sc[k][x];
}
const aT = (k) => f(T[k].ex + T[k].nf - T[k].fa, T[k].n + T[k].nf);
console.log('ALL'.padEnd(30), `${aT('beat')} -> ${aT('riff')}  |  ${f(T.beat.ex, T.beat.n)} -> ${f(T.riff.ex, T.riff.n)}      ${f(T.beat.pc, T.beat.n)} -> ${f(T.riff.pc, T.riff.n)}      ${f(T.beat.fa, T.beat.nf)} -> ${f(T.riff.fa, T.riff.nf)}`);
