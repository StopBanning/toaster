import { readBaseline } from './paths.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {tempo,onsets,macro} from './event-score.mjs';
const dir=process.argv.find(x=>x.startsWith('--dir='))?.slice(6)||'_checks/event-ledger';
const baseline=readBaseline(fs.readFileSync('docs/event-ledger-baseline.json', 'utf8'));
const rows=[];
for(const before of baseline.rows){
  const file=path.join(dir,before.key+'.json');if(!fs.existsSync(file))continue;
  const c=JSON.parse(fs.readFileSync(file));
  const silver=before.population==='silver';
  const ref=silver?JSON.parse(fs.readFileSync(path.join(dir,c.key+'-reference.json'))):null;
  const p=c.ledger.chunks.flat().filter(r=>r.record==='timing').map(r=>({...r,start:r.sampleStart/c.sampleRate}));
  const next={tempo:tempo(silver?[{start:0,bpm:ref.beat.summary.tempo_bpm}]:c.truth.tempo,p,c.duration),
    downbeat:onsets((silver?ref.beat.downbeats.map(start=>({start})):c.truth.downbeats).filter(x=>x.start>=0&&x.start<c.duration),c.downbeats)};
  rows.push({key:c.key,population:before.population,before:{tempo:before.tempo,downbeat:before.downbeat},after:next,
    provisional:p.find(r=>r.provisional)?.start??null,
    everLocked:p.some(r=>r.locked), sourceDuration:c.duration,
    regressions:[...(before.tempo.exact!=null&&next.tempo.exact<before.tempo.exact-1e-9?['tempo']:[]),...(before.downbeat&&next.downbeat.f1<before.downbeat.f1-1e-9?['downbeat']:[]),...(before.tempo.firstLock!=null&&next.tempo.firstLock>before.tempo.firstLock+1e-9?['firstLock']:[])]});
}
const missing=baseline.rows.filter(b=>!rows.some(r=>r.key===b.key)).map(r=>r.key);
const output={complete:missing.length===0,missing,rows,macro:{}};
for(const population of ['generated','silver']) {
 const r=rows.filter(x=>x.population===population);
 output.macro[population]=Object.fromEntries(['before','after'].map(k=>[k,{tempo:macro(r.map(x=>x[k].tempo.exact)),downbeat:macro(r.map(x=>x[k].downbeat?.f1)),firstLock:macro(r.map(x=>x[k].tempo.firstLock))}]));
}
const real=output.macro.silver;
output.acceptance={complete:output.complete,
  generatedRegressions:rows.filter(r=>r.population==='generated'&&r.regressions.length).map(r=>({key:r.key,regressions:r.regressions})),
  realTempoUp:real.after.tempo.value>real.before.tempo.value,
  realDownbeatUp:real.after.downbeat.value>real.before.downbeat.value,
  realFirstLockSooner:real.after.firstLock.value<real.before.firstLock.value,
  negativeControls:rows.filter(r=>['talk','ambient'].includes(r.key)).map(r=>({key:r.key,everLocked:r.everLocked,provisional:r.provisional}))};
if(process.argv.includes('--save'))fs.writeFileSync(path.join(dir,'timing-summary.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output.macro,null,2));
for(const r of rows)console.log(r.key,[r.before.tempo.exact,r.after.tempo.exact,r.before.downbeat?.f1,r.after.downbeat.f1,r.before.tempo.firstLock,r.after.tempo.firstLock].map(x=>x?.toFixed(3)).join(' '),r.regressions.join(','));
