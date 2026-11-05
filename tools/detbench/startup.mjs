// Startup after every >=4-bar kick-free gap within a stem reference's covered interval.
// Usage: node tools/detbench/startup.mjs results.json [reference-directory]
import fs from 'node:fs';
import path from 'node:path';
const file = process.argv[2];
const refs = process.argv[3] || process.env.KICK_REFS || new URL('../../backlog/research/kickref-nov1', import.meta.url).pathname; // (the kick references: an argument, KICK_REFS, or the repo's backlog)
// Reuse the benchmark's mini-notation parser without running its CLI scoring/reporting.
const source = fs.readFileSync(new URL('./score.mjs', import.meta.url), 'utf8');
const steps = new Function(source.slice(source.indexOf('export function steps'), source.indexOf('\nconst lineAt')).replace('export ', '') + '; return steps;')();
const results = JSON.parse(fs.readFileSync(file)).results;
const rows = [];
for (const [name, r] of Object.entries(results)) {
  if (!name.startsWith('kick:') || r.error) continue;
  const slug = name.slice(5).split('@')[0], ref = JSON.parse(fs.readFileSync(path.join(refs, slug + '.json')));
  const bar = 240 / ref.bpm, hits = ref.kicks.map(([t]) => t), covered = ref.covered || ref.window;
  const times = [covered[0], ...hits.filter(t => t >= covered[0] && t <= covered[1])];
  const downs = r.beats.filter(([, p]) => p === 0).map(([t]) => t);
  const at = t => { let line; for (const [lt, id, text] of r.lines) { if (lt > t) break; if (id === 'bd') line = text; } return steps(line) || new Set(); };
  for (let i = 1; i < times.length; i++) {
    const entry = times[i]; if (entry - times[i - 1] < 4 * bar) continue;
    let first = null, match = null, stray = 0, scored = 0;
    for (let j = 0; j + 1 < downs.length; j++) {
      const a = downs[j], b = downs[j + 1]; if (b <= entry || a > entry + 10 * bar || b > covered[1] || b-a < .8 || b-a > 4) continue;
      const t = Math.max(entry, a + (b-a)/2), got = at(t), want = new Set();
      for (const h of hits) if (h >= a-(b-a)/32 && h < b-(b-a)/32) want.add(Math.max(0, Math.min(15, Math.round(16*(h-a)/(b-a)))));
      if (!want.size) continue;
      const tp = [...got].filter(s => want.has(s)).length;
      if (first === null && got.size) first = t;
      if (match === null && got.size && 2*tp/(want.size+got.size) >= .8) match = t;
      if (first !== null && scored < 4) { stray += [...got].filter(s => !want.has(s)).length; scored++; }
    }
    rows.push({name, entry, startupBars: match === null ? null : Math.max(0,(match-entry)/bar), stray, scored});
  }
}
const vals = rows.map(r => r.startupBars ?? Infinity).sort((a,b)=>a-b);
const median = vals.length%2 ? vals[vals.length>>1] : (vals[vals.length/2-1]+vals[vals.length/2])/2;
console.log(JSON.stringify({file, count:rows.length, median, worst: vals.at(-1), unmatched:rows.filter(r=>r.startupBars===null).length, stray:rows.reduce((n,r)=>n+r.stray,0), rows},null,2));
