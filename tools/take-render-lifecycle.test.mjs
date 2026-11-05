import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {createTakeRender} = require('../helpers/take-render.cjs');

function fixture() {
  const ipc = new EventEmitter(); ipc.handle = () => {}; ipc.removeHandler = () => {};
  const seen = { ack:true, pending:0, max:0, partitions:[], cleared:0, sounds:0 }, windows=[];
  class BrowserWindow {
    constructor(options) {
      this.options=options; windows.push(this);
      const wc=this.webContents=new EventEmitter();
      wc.session={clearStorageData:async()=>{seen.cleared++;}};
      wc.send=(channel,...args)=>{
        const reply=(name,...data)=>ipc.emit(name,{sender:wc},...data);
        if(channel==='take:start') queueMicrotask(()=>reply('take:started',{}));
        if(channel==='take:sound') {
          seen.pending++; seen.sounds++; seen.max=Math.max(seen.max,seen.pending);
          if (seen.ack) setImmediate(()=>{ seen.pending--; reply('take:sound-encoded'); });
        }
        if(channel==='take:draw') queueMicrotask(()=>reply('take:drawn',args[0]));
        if(channel==='take:frame') queueMicrotask(()=>reply('take:encoded',args[0]));
        if(channel==='take:finish') queueMicrotask(()=>reply('take:finished',{}));
      };
      wc.capturePage=async()=>({getSize:()=>({width:100,height:100}),toBitmap:()=>Buffer.alloc(4)});
      if(options.webPreferences.partition) seen.partitions.push(options.webPreferences.partition);
    }
    async loadFile() { if(this.options.webPreferences.partition) setImmediate(()=>ipc.emit('take:ready',{sender:this.webContents})); }
    setContentSize() {}
    isDestroyed(){return !!this.gone;}
    destroy(){this.gone=true;}
  }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'review-render-'));
  const job=(name)=>({css:{width:100,height:100},dpr:1,fps:30,frames:1,out:path.join(dir,name+'.mp4'),page:{file:'fake'},sound:{sampleRate:48000,channels:2,samples:48000*60,read:()=>[new Float32Array(48000),new Float32Array(48000)]}});
  return {ipc,BrowserWindow,seen,dir,job};
}
test('B12: sound IPC is bounded and sequential jobs reuse a cleared render session', async()=>{
  const f=fixture();
  try {
    const render=createTakeRender({BrowserWindow:f.BrowserWindow,ipcMain:f.ipc});
    await render.render(f.job('one'));
    await render.render(f.job('two'));
    assert.equal(f.seen.sounds,120);
    assert.ok(f.seen.max<=1,`queued ${f.seen.max} seconds of sound`);
    assert.equal(new Set(f.seen.partitions).size,1,'one bounded session across jobs');
    assert.equal(f.seen.cleared,4,'storage cleared before and after each job');
  } finally {fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('B12: next startup removes only journaled partial copies inside its own output folder',()=>{
  const f=fixture();
  try {
    const outputRoot=path.join(f.dir,'Videos');fs.mkdirSync(outputRoot);
    const stale=path.join(outputRoot,'stale.mp4.part'), complete=path.join(outputRoot,'keep.mp4'), outside=path.join(f.dir,'other.mp4.part');
    for(const file of [stale,complete,outside])fs.writeFileSync(file,'keep');
    const pendingFile=path.join(f.dir,'pending.json');
    fs.writeFileSync(pendingFile,JSON.stringify([stale,complete,outside]));
    createTakeRender({BrowserWindow:f.BrowserWindow,ipcMain:f.ipc,pendingFile,outputRoot});
    assert.equal(fs.existsSync(stale),false);
    assert.equal(fs.existsSync(complete),true);
    assert.equal(fs.existsSync(outside),true);
    assert.deepEqual(JSON.parse(fs.readFileSync(pendingFile)),[]);
  } finally {fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('B12: cancelling while sound is unacknowledged removes its journaled partial and allows another job',async()=>{
  const f=fixture();
  try {
    f.seen.ack=false;
    const pendingFile=path.join(f.dir,'pending.json');
    const renderer=createTakeRender({BrowserWindow:f.BrowserWindow,ipcMain:f.ipc,pendingFile,outputRoot:f.dir});
    const first=renderer.render(f.job('cancelled'));
    while(!f.seen.sounds)await new Promise(r=>setImmediate(r));
    assert.deepEqual(JSON.parse(fs.readFileSync(pendingFile)),[f.job('cancelled').out+'.part']);
    renderer.cancel('stopped');
    await assert.rejects(first,/stopped/);
    assert.deepEqual(JSON.parse(fs.readFileSync(pendingFile)),[]);
    assert.equal(fs.existsSync(f.job('cancelled').out+'.part'),false);
    f.seen.ack=true;
    await renderer.render(f.job('next'));
    assert.equal(renderer.busy,false);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
