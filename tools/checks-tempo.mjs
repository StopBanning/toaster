// Tempo-only run of the real checks.js generated-song suite, without starting Toaster.
// Uses an isolated headless Chrome profile, silent Web Audio, and the app's analyser/tick setup.
// node tools/checks-tempo.mjs _checks/tap-tempo/before.json
// CHROME_PATH can select another Chromium binary. No UI/timing verdict is claimed here.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || '_checks/tap-tempo/results.json');
await mkdir(dirname(output), { recursive: true });
const profile = resolve(dirname(output), `chrome-${Date.now()}`);
const html = `<!doctype html><script type="module">
import { createEngine } from '/renderer/engine.js';
const ac = new AudioContext({latencyHint:'interactive', sampleRate:48000});
const analyser = size => { const a = ac.createAnalyser(); a.fftSize=size; a.smoothingTimeConstant=0; return a; };
const fast=analyser(1024), mid=analyser(4096), slow=analyser(16384);
const eng=createEngine({fast,mid,slow,sampleRate:ac.sampleRate});
eng.song=()=>({known:true,playing:true});
window.__nc={ac,eng,state:{},punch:{vg:null,blocks:[],draw(){}},syncOffset:()=>0,
  attach(node,source){node.connect(fast);node.connect(mid);node.connect(slow);this.state.node=node;this.state.source=source;eng.reset({top:true});}};
// Pull analysis through the audio graph, with zero output to the speakers.
const mute=ac.createGain();mute.gain.value=0;fast.connect(mute);mute.connect(ac.destination);
setInterval(()=>{if(window.__nc.state.node)eng.frame(performance.now()/1000,ac.currentTime);},15);
await ac.resume();
const script=document.createElement('script');script.src='/tools/checks.js';document.body.append(script);
</script>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.setHeader('Content-Type','text/html');res.end(html);return; }
    const path=resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!path.startsWith(root.endsWith(sep) ? root : root+sep)) {res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`;
const chrome=spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
  '--autoplay-policy=no-user-gesture-required','--no-first-run','--no-default-browser-check',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','about:blank'
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const sockets=[];
try {
  const endpoint=await new Promise((ok,fail)=>{
    let text='';const timeout=setTimeout(()=>fail(Error('Chrome CDP startup timed out')),20000);
    chrome.on('error',fail);chrome.stderr.on('data',data=>{text+=data;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timeout);ok(m[1]);}});
  });
  const socket=new WebSocket(endpoint);sockets.push(socket);
  await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
  let seq=0;const pending=new Map();
  socket.onmessage=({data})=>{const r=JSON.parse(data);const p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}};
  const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});
  async function page(){
    const {targetId}=await cdp('Target.createTarget',{url});
    const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
    for(let i=0;i<100;i++){
      const r=await cdp('Runtime.evaluate',{expression:'!!window.checks',returnByValue:true},sessionId);
      if(r.result.value)return sessionId;
      await new Promise(r=>setTimeout(r,100));
    }
    throw Error('Harness did not load');
  }
  const first=await page();
  const meta=await cdp('Runtime.evaluate',{expression:'({names:Object.keys(checks.SONGS),sampleRate:__nc.ac.sampleRate})',returnByValue:true},first);
  const names=meta.result.value.names;
  const sessions=[first];for(let i=1;i<4;i++)sessions.push(await page());
  const rows=[];let next=0;
  await Promise.all(sessions.map(async session=>{
    while(next<names.length){
      const name=names[next++];console.log('Running '+name);
      const r=await cdp('Runtime.evaluate',{expression:`checks.suite([${JSON.stringify(name)}])`,awaitPromise:true,returnByValue:true},session);
      if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
      const row=r.result.value[0];rows.push(row);console.log(JSON.stringify({name:row.name,tempo:row.tempo,error:row.error}));
    }
  }));
  rows.sort((a,b)=>names.indexOf(a.name)-names.indexOf(b.name));
  const music=rows.filter(r=>r.music),errors=rows.filter(r=>r.error);
  const tempoPass=music.filter(r=>r.tempo?.ratio!=null&&Math.abs(r.tempo.ratio-1)<=0.02);
  const noMusic=rows.filter(r=>r.music===false);
  const summary={songs:rows.length,music:music.length,tempoPass:tempoPass.length,tempoFail:music.length-tempoPass.length,
    noMusic:noMusic.length,falseLocks:noMusic.reduce((s,r)=>s+r.locks,0),errors:errors.length};
  const version=await cdp('Browser.getVersion');
  await writeFile(output,JSON.stringify({scope:'checks.suite; tempo only; headless Web Audio; four independent pages; no UI timing',browser:version.product,sampleRate:meta.result.value.sampleRate,summary,rows},null,2)+'\n');
  console.log(JSON.stringify(summary));console.log(output);
  if(summary.tempoFail || summary.falseLocks || summary.errors)process.exitCode=1;
} finally {
  for(const socket of sockets)socket.close();
  chrome.kill();server.closeAllConnections();server.close();
}
