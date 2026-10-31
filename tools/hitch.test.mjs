import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./hitch.mjs',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
// The fake page: a background of its own besides the scenes one, which is named and numbered as the checker could not
// guess, and scenes the checker can only know by asking the page.
const PAGE={visuals:[{i:0,name:'off'},{i:1,name:'gallery'}],sceneryAt:1,scenes:['aurora','dunes','tea']};
// (a round's switches: the fake page's one other background, then each scene it lists)
const STEPS=1+PAGE.scenes.length;

async function runCheck(slowRound,page=PAGE){
  let shows=0;
  const log=[],switched=[];
  class Socket{
    constructor(){queueMicrotask(()=>this.onopen?.());}
    close(){}
    send(raw){
      const {id,method,params}=JSON.parse(raw);
      let value;
      if(method==='Runtime.evaluate'){
        const text=params.expression;
        if(text.includes('WEBGL_debug_renderer_info'))value='ANGLE hardware test GPU';
        else if(text.includes('const out = []'))value=page;
        else if(text.includes('const gaps = []')){
          switched.push(text);
          const round=Math.floor(shows++/STEPS)+1;
          value=round===slowRound?400:17;
        }else if(text.includes('version'))value='test';
        else value=true;
      }
      this.onmessage({data:JSON.stringify({id,result:{result:{value}}})});
    }
  }
  const proc={argv:['node','hitch','9345','250'],exit(code){throw Object.assign(new Error('exit'),{exitCode:code});}};
  const execute=new AsyncFunction('fetch','WebSocket','process','console','setTimeout',source);
  try{
    await execute(async()=>({json:async()=>[{type:'page',url:'file:///test/index.html',webSocketDebuggerUrl:'ws://test'}]}),Socket,proc,{log:(...x)=>log.push(x.join(' '))},fn=>queueMicrotask(fn));
    assert.fail('checker must return an exit status');
  }catch(e){if(!('exitCode'in e))throw e;return{code:e.exitCode,shows,log,switched};}
}

test('a hitch only in the warm round fails the real release checker',async()=>{
  const r=await runCheck(2);assert.equal(r.code,1);assert.equal(r.shows,2*STEPS);assert.ok(r.log.at(-1).startsWith('FAIL:'));
});
test('a first-round hitch still fails',async()=>assert.equal((await runCheck(1)).code,1));
test('two smooth rounds pass',async()=>assert.equal((await runCheck(0)).code,0));

test('the scenes shown are the ones the app lists, whatever they are',async()=>{
  const r=await runCheck(0);
  assert.equal(r.code,0);
  assert.equal(r.shows,2*STEPS);
  // (the other background by its number, then each scene by the app's own entry for it, in the app's order)
  const round=r.switched.slice(0,STEPS);
  assert.ok(round[0].includes('__nc.setVisual(0)'));
  PAGE.scenes.forEach((scene,k)=>assert.ok(round[1+k].includes(`"scene:${scene}"`)&&round[1+k].includes('.run()'),scene));
  // (none from a list kept in the checker)
  assert.ok(r.switched.every(js=>!/lake|halloween|sharks|festival|koi|space|eye/.test(js)));
  assert.ok(r.log.some(l=>l.includes('scene: aurora')&&l.includes('scene: tea')));
});

test('the scenes background is not shown as a plain background, wherever the app has it',async()=>{
  const r=await runCheck(0);
  assert.ok(r.switched.every(js=>!js.includes('__nc.setVisual(1)')),'the scenes background (number 1 here) was shown on its own');
  // (and the other way round: the scenes background first, the other after it)
  const moved=await runCheck(0,{...PAGE,visuals:[{i:0,name:'scenes'},{i:1,name:'off'}],sceneryAt:0});
  assert.equal(moved.shows,2*STEPS);
  assert.ok(moved.switched[0].includes('__nc.setVisual(1)'));
  assert.ok(moved.switched.every(js=>!js.includes('__nc.setVisual(0)')));
});

test('an app that lists no scenes stops the check before it measures anything',async()=>{
  const r=await runCheck(0,{...PAGE,scenes:[]});
  assert.equal(r.code,2);
  assert.equal(r.shows,0);
  assert.ok(r.log.some(l=>l.includes('no scenes')));
});
