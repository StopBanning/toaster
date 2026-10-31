import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The page script, run against a stand-in graphics context: its one import (the variants the prepare script writes) is
// given as an argument instead.
const source=readFileSync(new URL('./shader-compile.js',import.meta.url),'utf8').replace(/^import config from .*$/m,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const program={vs:'#version 300 es\nvoid main() { }',fs:'#version 300 es\nvoid main() { }',bare:false};
const variantsOf=(...names)=>Object.fromEntries(names.map(n=>[n,program]));

async function run(variants,variantOrder,{repeats=2,names=[],badLink=''}={}){
  const log=[],window={};
  const gl={
    VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,
    getExtension:name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:4}:null,
    createProgram:()=>({}),createShader:()=>({}),shaderSource(){},compileShader(){},attachShader(){},deleteShader(){},
    bindAttribLocation(){},linkProgram(){},deleteProgram(){},getProgramInfoLog:()=>'did not link',
    getProgramParameter:(_p,what)=>what!==gl.LINK_STATUS||!badLink,
  };
  const document={createElement:()=>({getContext:()=>gl})};
  const execute=new AsyncFunction('config','window','document','performance','console','setTimeout',source);
  await execute({variants,variantOrder,repeats,names},window,document,performance,{log:(...x)=>log.push(x.join(' '))},fn=>queueMicrotask(fn));
  return {result:window.checkResult,log};
}

const seen=(rows,name)=>[...new Set(rows.filter(r=>r.name===name).map(r=>r.variant))];

test('a program only the baseline has is reported as baseline-only, and the run carries on',async()=>{
  // (the shape of the real case: a scene retired since the baseline, another added)
  const {result,log}=await run({before:variantsOf('lake','basement'),after:variantsOf('lake','eye')},['before','after']);
  assert.equal(result.error,undefined);
  assert.deepEqual(result.baselineOnly,['basement']);
  assert.deepEqual(result.newOnly,['eye']);
  assert.deepEqual(seen(result.rows,'basement'),['before']);
  assert.deepEqual(seen(result.rows,'eye'),['after']);
  assert.deepEqual(seen(result.rows,'lake').sort(),['after','before']);
  assert.equal(result.rows.filter(r=>r.name==='lake').length,4);
  assert.ok(log.some(l=>l.includes('basement: baseline-only')));
  assert.ok(log.some(l=>l.includes('eye: new-only')));
});

test('programs every variant has are all compiled, and nothing is reported',async()=>{
  const {result}=await run({before:variantsOf('lake','sea'),after:variantsOf('lake','sea')},['before','after'],{repeats:3});
  assert.equal(result.error,undefined);
  assert.deepEqual(result.baselineOnly,[]);
  assert.deepEqual(result.newOnly,[]);
  assert.equal(result.rows.length,2*3*2);
});

test('one variant alone has nothing to be unpaired with',async()=>{
  const {result}=await run({before:variantsOf('lake','basement'),after:variantsOf('lake','eye')},['after']);
  assert.equal(result.error,undefined);
  assert.deepEqual([...new Set(result.rows.map(r=>r.name))],['lake','eye']);
  assert.deepEqual(result.baselineOnly,[]);
  assert.deepEqual(result.newOnly,[]);
});

test('names asked for are still the only ones compiled, one-sided or not',async()=>{
  const {result}=await run({before:variantsOf('lake','basement'),after:variantsOf('lake','eye')},['before','after'],{names:['basement','eye']});
  assert.deepEqual([...new Set(result.rows.map(r=>r.name))],['basement','eye']);
  assert.deepEqual(result.baselineOnly,['basement']);
  assert.deepEqual(result.newOnly,['eye']);
});

test('a program that does not link still stops the run, with its name',async()=>{
  const {result}=await run({before:variantsOf('lake'),after:variantsOf('lake')},['before','after'],{badLink:'yes'});
  assert.match(result.error,/lake \(before\): did not link/);
});
