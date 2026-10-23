import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./hitch.mjs',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
// (a round's switches: the fake page's one background, then each scene the checker lists)
const STEPS=1+source.match(/for \(const scene of \[([^\]]*)\]/)[1].match(/'[^']+'/g).length;

async function runCheck(slowRound){
  let shows=0;
  const log=[];
  class Socket{
    constructor(){queueMicrotask(()=>this.onopen?.());}
    close(){}
    send(raw){
      const {id,method,params}=JSON.parse(raw);
      let value;
      if(method==='Runtime.evaluate'){
        const text=params.expression;
        if(text.includes('WEBGL_debug_renderer_info'))value='ANGLE hardware test GPU';
        else if(text.includes('const out = []'))value=[{i:0,name:'off'}];
        else if(text.includes('const gaps = []')){
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
  }catch(e){if(!('exitCode'in e))throw e;return{code:e.exitCode,shows,log};}
}

test('a hitch only in the warm round fails the real release checker',async()=>{
  const r=await runCheck(2);assert.equal(r.code,1);assert.equal(r.shows,2*STEPS);assert.ok(r.log.at(-1).startsWith('FAIL:'));
});
test('a first-round hitch still fails',async()=>assert.equal((await runCheck(1)).code,1));
test('two smooth rounds pass',async()=>assert.equal((await runCheck(0)).code,0));
