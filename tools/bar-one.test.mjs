import fs from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const {createEngine,timingHypotheses}=await import('data:text/javascript,'+encodeURIComponent(fs.readFileSync(new URL('../renderer/engine.js',import.meta.url),'utf8')));
const mod=(x,n)=>((x%n)+n)%n;
function music({join=0,pickup=false,half=false,drop=false}={}) {
  const onsets=[],tonal=[],P=.5,origin=.12;
  for(let b=-8;b<40;b++) {
    const t=origin+b*P,d=mod(b,4),quiet=drop&&b>=8&&b<16;
    if(t>=join&&!quiet) {
      onsets.push({t,id:'bd',s:d===0?1.5:.65});
      if(half ? d===2 : d%2===1)onsets.push({t,id:'sd',s:1.2});
    }
  }
  if(pickup) for(const t of [join+.05,join+.175,join+.3])onsets.push({t,id:'sd',s:.3});
  for(let t=join;t<19.5;t+=.045) {
    const b=Math.floor((t-origin)/P),n=mod(Math.floor(b/4),3),c=Array(12).fill(0); c[n]=1;
    const quiet=drop&&b>=8&&b<16;
    tonal.push({t,c,b:c,e:quiet?.001:.1});
  }
  return {onsets,tonal,origin,P};
}
for(const join of [.7,1.7])test('joining mid-bar keeps the absolute one at join '+join,()=>{
  const x=music({join}),h=timingHypotheses(x.onsets,x.tonal,19,[120])[0];
  assert.ok(Math.abs(mod((h.anchor+h.down*x.P-x.origin)/x.P+2,4)-2)<.08,JSON.stringify(h));
});
test('a pickup does not become the bar origin',()=>{
  const x=music({join:.7,pickup:true}),h=timingHypotheses(x.onsets,x.tonal,19,[120])[0];
  assert.ok(Math.abs(mod((h.anchor+h.down*x.P-x.origin)/x.P+2,4)-2)<.08);
});
test('half-time section preserves the pulse and harmonic bar one',()=>{
  const x=music({half:true}),h=timingHypotheses(x.onsets,x.tonal,19,[120])[0];
  assert.equal(h.bpm,120);
  assert.ok(Math.abs(mod((h.anchor+h.down*x.P-x.origin)/x.P+2,4)-2)<.08,JSON.stringify(h));
});
test('a drop following a breakdown supplies section evidence after a full bar',()=>{
  const x=music({drop:true}),h=timingHypotheses(x.onsets,x.tonal,12,[120])[0];
  assert.ok(h.evidence.section>0);
  assert.ok(Math.abs(mod((h.anchor+h.down*x.P-x.origin)/x.P+2,4)-2)<.08);
  const early=timingHypotheses(x.onsets,x.tonal,8.2,[120]);
  // Passing future observations must not let them vote before they are heard.
  assert.deepEqual(early,timingHypotheses(x.onsets.filter(o=>o.t<=8.2),x.tonal.filter(o=>o.t<=8.2),8.2,[120]));
});
test('provisional pulse stays separate from lock, silence and reset clear it',()=>{
  globalThis.window={NC_DEBUG:false}; const fake=n=>({fftSize:n,frequencyBinCount:n/2});
  const e=createEngine({fast:fake(1024),mid:fake(4096),slow:fake(16384),sampleRate:48000});
  e.dense=()=>true;e.repeats=()=>.7;e.repeatsThere=()=>true;
  e.tempoUpdate(2,120,.9,false,1,.8);e.tempoUpdate(2.5,120,.9,false,1,.8);
  assert.equal(e.tempo.locked,false);assert.equal(e.tempo.provisional.bpm,120);
  e.reset();assert.equal(e.tempo.provisional,undefined);assert.equal(e.hypotheses.length,0);
});

test('first lock uses heard mid-bar evidence and retains raw event sample times',()=>{
  globalThis.window={NC_DEBUG:false};const fake=n=>({fftSize:n,frequencyBinCount:n/2});
  const e=createEngine({fast:fake(1024),mid:fake(4096),slow:fake(16384),sampleRate:48000});
  const x=music({join:.7,pickup:true});e.onsets=x.onsets.filter(o=>o.t<=12);e.tonalTiming=x.tonal.filter(o=>o.t<=12);
  e.tempoFix=null;e.place('bd',.72,.8);
  const raw=e.ledger.snapshot().chunks.flat().filter(r=>r.record==='event');
  e.lockTo(12,120,'tempo lock 120');
  const T=e.tempo;
  assert.equal(T.locked,true);assert.ok(Math.abs(mod((T.t0+T.down*T.P-x.origin)/T.P+2,4)-2)<.08);
  e.relabel(4);assert.deepEqual(e.ledger.snapshot().chunks.flat().filter(r=>r.record==='event'),raw);
});

test('ambiguous bar evidence has zero confidence and cannot defeat continuity',()=>{
  globalThis.window={NC_DEBUG:false};const fake=n=>({fftSize:n,frequencyBinCount:n/2});
  const e=createEngine({fast:fake(1024),mid:fake(4096),slow:fake(16384),sampleRate:48000});
  Object.assign(e.tempo,{locked:true,bpm:120,P:.5,down:2});
  e.kickB.fill(1);
  e.hypotheses=[{bpm:120,tempoSupport:.5,jointSupport:.4}];
  for(let b=1;b<=12;b++)e.newBeat(b);
  assert.equal(e.tempo.down,2);assert.equal(e.tempo.barConfidence,0);assert.equal(e.tempo.pulseConfidence,.4);
  e.changeB[0]=20;
  for(let b=13;b<=19;b++)e.newBeat(b);
  assert.equal(e.tempo.down,2);
  e.newBeat(20);assert.equal(e.tempo.down,0);
});

test('the app code line shows a provisional comment and emits setcpm only after firm lock',async()=>{
  const engineURL='data:text/javascript,'+encodeURIComponent(fs.readFileSync(new URL('../renderer/engine.js',import.meta.url),'utf8'));
  const {buildLines}=await import('data:text/javascript,'+encodeURIComponent(fs.readFileSync(new URL('../renderer/codegen.js',import.meta.url),'utf8').replace("'./engine.js'",JSON.stringify(engineURL))));
  globalThis.window={NC_DEBUG:false};const fake=n=>({fftSize:n,frequencyBinCount:n/2});
  const e=createEngine({fast:fake(1024),mid:fake(4096),slow:fake(16384),sampleRate:48000});
  e.silent=false;e.tempo.provisional={bpm:119.8};
  const line=()=>buildLines(e,{song:null},10).tempo.map(p=>p.text).join('');
  assert.equal(line(),'// pulse ~120 bpm; finding bar one...');
  e.silent=true;assert.equal(line(),'// waiting for sound...');
  Object.assign(e.tempo,{locked:true,bpm:120,shown:120});e.silent=false;e.lastDrop=-100;e.lastKick=10;
  assert.equal(line(),'setcpm(120/4)');
});
