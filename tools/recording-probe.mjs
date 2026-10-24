import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../renderer/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const REC_TYPES ='),source.indexOf('// Drop clips (J; clips.js)'));
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(chunk){
 let session=0;const calls=[],recorders=[];
 const element={textContent:'',hidden:true,classList:{add(){},remove(){}}};
 const track={stop(){}};const video={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const node={connect(){},disconnect(){},delayTime:{value:0}};
 class MR{static isTypeSupported(){return true;}constructor(){recorders.push(this);this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}}
 const ctx={window:{nc:{recSource:()=>1,recStart:async()=>({token:++session}),recChunk:async (token,b)=>{calls.push({session:token,byte:b[0]});return chunk(b,token);},recStop:async()=>null}},navigator:{mediaDevices:{getUserMedia:async()=>video}},
  MediaRecorder:MR,MediaStream:class{},ac:{createMediaStreamDestination:()=>({...node,stream:{getTracks:()=>[],getAudioTracks:()=>[track]}}),createDelay:()=>({...node})},
  state:{node:null,syncTrim:0},heardAfter:()=>12,requestAnimationFrame:fn=>queueMicrotask(fn),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},innerWidth:1280,innerHeight:800,devicePixelRatio:1,
  document:{body:element},$:()=>element,hideNotice(){},showNotice(){},console};
 vm.createContext(ctx);vm.runInContext(code+';globalThis.api={toggleRecording,rec};',ctx);
 return {api:ctx.api,recorders,calls};
}
const output={};
{
 let release;const f=fixture(()=>new Promise(r=>release=r));await f.api.toggleRecording();
 let converted=0,emittedChunks=0;
 for(let i=0;i<120&&f.api.rec.mr;i++){emittedChunks++;f.recorders[0].ondataavailable({data:{size:1048576,arrayBuffer:async()=>{converted++;return new Uint8Array([i]);}}});}
 await flush();output.stalledSink={emittedChunks,logicalPayloadMiB:emittedChunks,converted,forwarded:f.calls.length,recordingStillActive:!!f.api.rec.mr};
 // Deliberately pending mock promises hold no event-loop resources.
}
{
 let releaseOld;let first=true;const f=fixture(()=>{if(first){first=false;return false;}return true;});await f.api.toggleRecording();
 f.recorders[0].ondataavailable({data:{size:1,arrayBuffer:async()=>new Uint8Array([11])}});
 f.recorders[0].ondataavailable({data:{size:1,arrayBuffer:()=>new Promise(r=>releaseOld=()=>r(new Uint8Array([22])))}});
 await flush();await flush();const stoppedAfterFailure=f.api.rec.mr===null;
 await f.api.toggleRecording();releaseOld?.();await flush();await flush();
 output.restartAfterFailure={stoppedAfterFailure,newRecordingActive:!!f.api.rec.mr,writes:f.calls,oldChunkEnteredNewRecording:f.calls.some(x=>x.session===2&&x.byte===22)};
}
console.log(JSON.stringify(output,null,2));


