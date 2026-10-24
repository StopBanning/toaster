import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../renderer/clips.js',import.meta.url),'utf8').replace('export function createClips','function createClips');
let clock=0,interval,stoppedTracks=0,disconnected=0;const recorders=[],notices=[];
class MR{static isTypeSupported(){return true;}constructor(){this.state='inactive';recorders.push(this);}start(){this.state='recording';}stop(){if(this.state==='inactive')throw Object.assign(new Error('already inactive'),{name:'InvalidStateError'});this.state='inactive';this.onstop?.();}}
const track={stop(){stoppedTracks++;}},stream={getTracks:()=>[track],getVideoTracks:()=>[track],getAudioTracks:()=>[]};
const context={MediaRecorder:MR,MediaStream:class{},performance:{now:()=>clock},setInterval:fn=>(interval=fn,1),clearInterval:()=>{},setTimeout:()=>{},clearTimeout:()=>{},Blob};
vm.createContext(context);vm.runInContext(source+';globalThis.make=createClips;',context);
const clips=context.make({types:['video/webm'],stream:async()=>stream,ac:{createMediaStreamDestination:()=>({stream:{getTracks:()=>[],getAudioTracks:()=>[]}}),createDelay:()=>({connect(){},disconnect(){disconnected++;}})},node:()=>null,delay:()=>0,save:async()=>'',said:m=>notices.push(m)});
await clips.toggle();recorders[0].state='inactive';recorders[0].onerror?.({error:new Error('injected encoder failure')});
let rollError,stopError;clock=20000;try{interval();}catch(e){rollError=e.name;}await new Promise(r=>setImmediate(r));
// Failure has already switched clips off; the next press starts a new session, so it is not an off command.
const output={onErrorHandlerInstalled:typeof recorders[0].onerror==='function',rollError,stopError,stoppedTracks,disconnected,notices,onAfterStopAttempt:clips.on};
console.log(JSON.stringify(output,null,2));


