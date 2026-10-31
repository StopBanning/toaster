import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The render check's page script, run against stand-in scenery modules (one per version) and a stand-in graphics
// context: its settings import is given as an argument, and its dynamic imports go through loadModule.
const source=readFileSync(new URL('./shader-render.js',import.meta.url),'utf8')
  .replace(/^import config from .*$/m,'')
  .replace(/\bimport\(/g,'loadModule(');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

async function run({before,after,mode='scenery',onlyScenes=[],pixelsOnly=true,noFallback=false}){
  const drawn=[],window={},log=[];
  const version=(tag,names)=>({createScenery:()=>{
    let shown=null;
    return {
      get scenes(){return names;},
      get drawnScene(){return shown;},
      clear(){},
      draw(_t,_eng,{scene}){shown=scene;drawn.push(tag+':'+scene);},
    };
  }});
  const modules={before:version('before',before),after:version('after',after)};
  const gl={NO_ERROR:0,getError:()=>0,finish(){},readPixels(){},getExtension:()=>null};
  const canvas={width:2,height:2,getContext:()=>gl,addEventListener(){},remove(){}};
  const document={createElement:()=>canvas,body:{append(){}}};
  class WebGL2RenderingContext{drawArrays(){}}
  const loadModule=async path=>modules[path.match(/render-check\/(before|after)\//)[1]];
  const config={mode,onlyScenes,onlyLooks:[],onlyWorlds:[],pixelsOnly,noFallback,batches:2};
  const execute=new AsyncFunction('config','window','document','performance','console','setTimeout','Math','WebGL2RenderingContext','loadModule',source);
  await execute(config,window,document,performance,{log:(...x)=>log.push(x.join(' ')),error(){}},fn=>queueMicrotask(fn),Object.create(Math),WebGL2RenderingContext,loadModule);
  return {result:window.checkResult,drawn,log};
}
const names=result=>result.rows.map(r=>r.scene+(r.cells?'(cells)':''));

test('the scenes checked are the ones the app lists, not a list kept in the tool',async()=>{
  const {result,drawn}=await run({before:['lake','retired','koi'],after:['lake','aurora','koi']});
  assert.equal(result.error,undefined);
  // (a scene added since is in; so is every one the app has, the koi pond's cells fallback with it)
  assert.deepEqual(names(result),['lake','aurora','koi','koi(cells)']);
  assert.ok(!names(result).includes('sea'));
});

test('a scene only the new version has is drawn alone, and one only the baseline has is listed and left out',async()=>{
  const {result,drawn,log}=await run({before:['lake','retired'],after:['lake','aurora']});
  assert.equal(result.error,undefined);
  assert.deepEqual(result.scenesNewOnly,['aurora']);
  assert.deepEqual(result.scenesBaselineOnly,['retired']);
  assert.ok(drawn.includes('after:aurora'));
  // (a version asked for a scene it hasn't would draw the lake under that name, and look different)
  assert.ok(!drawn.includes('before:aurora'));
  assert.ok(!drawn.some(d=>d.endsWith(':retired')));
  const aurora=result.rows.find(r=>r.scene==='aurora');
  assert.equal(aurora.newOnly,true);
  assert.deepEqual(aurora.pixels,[]);
  assert.ok(log.some(l=>l.includes('aurora')&&l.includes('new in this version')));
  assert.ok(log.some(l=>l.includes('retired')&&l.includes('only in the baseline')));
});

test('a scene both versions have is compared pixel for pixel, in every colour the check tries',async()=>{
  const {result}=await run({before:['lake'],after:['lake']});
  const lake=result.rows.find(r=>r.scene==='lake');
  assert.equal(lake.newOnly,undefined);
  assert.equal(lake.pixels.length,3*2*2);
  assert.deepEqual(result.scenesNewOnly,[]);
  assert.deepEqual(result.scenesBaselineOnly,[]);
});

test('the new scene alone is timed on the new version only',async()=>{
  const {result}=await run({before:['lake'],after:['lake','aurora']},);
  assert.equal(result.rows.find(r=>r.scene==='aurora').gpu.after.length,0,'pixels-only run measures no time');
  const timed=await run({before:['lake'],after:['lake','aurora'],pixelsOnly:false});
  const gpu=timed.result.rows.find(r=>r.scene==='aurora').gpu;
  assert.equal(gpu.after.length,2);
  assert.deepEqual(gpu.before,[]);
});

test('asking for scenes by name still narrows the list, and the koi fallback needs a koi pond',async()=>{
  const some=await run({before:['lake','aurora'],after:['lake','aurora'],onlyScenes:['aurora']});
  assert.deepEqual(names(some.result),['aurora']);
  const noKoi=await run({before:['lake'],after:['lake']});
  assert.deepEqual(names(noKoi.result),['lake']);
  const skipped=await run({before:['koi'],after:['koi'],noFallback:true});
  assert.deepEqual(names(skipped.result),['koi']);
});

test('an app that lists no scenes fails the check instead of passing with nothing checked',async()=>{
  const {result}=await run({before:['lake'],after:[]});
  assert.match(result.error,/no scenes/);
});
