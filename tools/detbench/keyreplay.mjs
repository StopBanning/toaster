// (bench instrumentation) A bench run's key line, worked out again offline by any checkout's key line (renderer/engine.js:
// keyReset, keyOpening, keyBar) from what it was decided from (page.js's keylog), and written as the run with that key
// line in place of its own, for harmony.mjs to score. Nothing else in the engine reads the key shown, so this is the key
// line the checkout would have shown on the same run, in seconds rather than a bench run.
//   node tools/detbench/keyreplay.mjs <results.json> [--root=<checkout>] [--out=<replayed.json>] [--check]
// --check: how often the replayed key differs from the run's own key line, sampled every 0.25 s (away from the 0.1 s after
// a change, as the lines are rebuilt every 45 ms): 0 when --root is the checkout the run was made with.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// a chord as the engine's chord search gives it (its three notes, as CHORDS has them)
const unit = (v) => { const len = Math.hypot(...v); return v.map((x) => x / len); };
function chordOf(root, q, score = 1) {
  const third = q === 'm' ? 3 : 4, tones = new Array(12).fill(0);
  for (const [note, w] of [[root, 1], [root + third, 0.9], [root + 7, 0.9]]) tones[note % 12] += w;
  return { root, q, name: NOTES[root] + q, third, tones: unit(tones), score };
}

export async function keyLine(root) {
  const { createEngine } = await import(pathToFileURL(path.join(root, 'renderer/engine.js')).href);
  const analyser = (n) => ({ fftSize: n, frequencyBinCount: n / 2 });
  const eng = createEngine({ fast: analyser(1024), mid: analyser(4096), slow: analyser(16384), sampleRate: 48000, ledger: null });
  // the key shown through one run's keylog, as [time, 'C:minor' or null] at each change (the key line's state is its own,
  // on an object that has the engine's methods, which its steps call)
  return (keylog) => {
    const fresh = () => { const s = Object.create(eng); s.opening = { key: null }; s.keyReset(); return s; };
    let st = fresh(), shown;
    const out = [];
    for (const ev of keylog) {
      const [t, kind] = ev;
      if (kind === 'reset') st = fresh();
      else if (kind === 'open') eng.keyOpening.call(st, chordOf(ev[2], ev[3]), ev[4] ?? -1);
      else if (kind === 'bar') { if (ev[5]) st.keyShown = 0; eng.keyBar.call(st, chordOf(ev[2], ev[3], ev[6]), ev[4], ev[7] ?? null); }
      const k = st.key ? `${NOTES[st.key.root]}:${st.key.mode}` : null;
      if (k !== shown) { out.push([t, k]); shown = k; }
    }
    return out;
  };
}
const scaleText = (k) => (k ? `const scale = "${k}"` : '// const scale = "?"');
const keyOfText = (text) => (/scale = "([A-G][#b]?:(?:major|minor))"/.exec(text || '') || [])[1] ?? null;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2], d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const line = await keyLine(path.resolve(arg('root', path.join(here, '../..'))));
  let runs = 0, n = 0, off = 0;
  const worst = [];
  for (const [name, r] of Object.entries(d.results)) {
    if (r.error || !r.keylog) continue;
    const keys = line(r.keylog);
    runs++;
    if (process.argv.includes('--check')) {
      const own = r.lines.filter(([, id]) => id === 'scale').map(([t, , text]) => [t, keyOfText(text)]);
      const at = (tl, t) => { let v = null; for (const [lt, k] of tl) { if (lt > t) break; v = k; } return v; };
      const changes = [...own, ...keys].map(([t]) => t);
      let bad = 0;
      for (let t = r.from; t < r.from + r.seconds; t += 0.25) {
        if (changes.some((c) => t >= c && t - c < 0.1)) continue;
        n++; if (at(own, t) !== at(keys, t)) { off++; bad++; }
      }
      if (bad) worst.push([name, bad]);
    }
    r.lines = [...r.lines.filter(([, id]) => id !== 'scale'), ...keys.map(([t, k]) => [t, 'scale', scaleText(k)])].sort((a, b) => a[0] - b[0]);
  }
  if (process.argv.includes('--check')) {
    console.log(`${runs} runs: the replayed key differs from the run's own at ${off} of ${n} moments`);
    for (const [name, bad] of worst.sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${name}: ${bad}`);
  }
  if (arg('out')) { fs.writeFileSync(arg('out'), JSON.stringify(d)); console.log(`${runs} runs -> ${arg('out')}`); }
}
