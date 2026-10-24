// Loads only a disposable copy under this worktree. Capture is a generated canvas, audio is the
// app's muted demo. All profile, temporary and output folders live beside this test.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { app, session } = require('electron');
const root = path.resolve(__dirname, '..'), base = path.join(root, '_checks', 'recording'), copy = path.join(base, 'app');
fs.mkdirSync(copy, { recursive: true });
for (const file of ['package.json', 'preload.js', 'update.js']) fs.copyFileSync(path.join(root, file), path.join(copy, file));
for (const dir of ['renderer', 'build']) fs.cpSync(path.join(root, dir), path.join(copy, dir), { recursive: true });
let renderer = fs.readFileSync(path.join(copy, 'renderer/app.js'), 'utf8');
renderer += '\nwindow.recordCheck={rec,toggleRecording};';
fs.writeFileSync(path.join(copy, 'renderer/app.js'), renderer);
app.setName('ToasterRecordingCheck');
for (const key of ['appData', 'userData', 'sessionData', 'temp', 'videos', 'music']) {
  const dir = path.join(base, key); fs.mkdirSync(dir, { recursive: true }); app.setPath(key, dir);
}
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
const result = { errors: [] }, save = () => fs.writeFileSync(path.join(base, 'result.json'), JSON.stringify(result, null, 2));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
global.recordCheckLoad = async (win) => {
  const run = (s) => win.webContents.executeJavaScript(s, true);
  session.defaultSession.setPermissionRequestHandler((_w, _p, done) => done(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setDisplayMediaRequestHandler((_r, done) => done({}));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, done) => done({ cancel: true }));
  win.webContents.on('console-message', (_e, details) => { if (details.level === 'error') result.errors.push(details.message); });
  await win.loadURL('about:blank');
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.setItem("now-coding",JSON.stringify({visualName:"off",dropName:"off",updates:false,seenVersion:"0.4.14",firstRun:false}));navigator.mediaDevices.getUserMedia=async()=>{throw new Error("physical capture forbidden")};navigator.mediaDevices.getDisplayMedia=navigator.mediaDevices.getUserMedia;' });
  await win.loadFile(path.join(copy, 'renderer/index.html')); win.showInactive();
  await run(`(async()=>{
    await __nc.useDemo();
    const c=document.createElement('canvas');c.width=640;c.height=360;const g=c.getContext('2d');let frame=0;
    const draw=()=>{g.fillStyle='#051db5';g.fillRect(0,0,640,360);g.fillStyle='#fff';g.font='48px monospace';g.fillText('frame '+frame,40,90);g.fillRect(frame*4%600,180,40,80);frame++;window.checkFrame=requestAnimationFrame(draw);};draw();
    navigator.mediaDevices.getUserMedia=async()=>c.captureStream(30);
    await recordCheck.toggleRecording();
  })()`);
  result.active = await run('!!recordCheck.rec.mr');
  await pause(8000);
  await run('recordCheck.toggleRecording()');
  result.stopped = await run('!recordCheck.rec.mr && !recordCheck.rec.busy');
  const dir = path.join(base, 'videos', 'Toaster'), files = fs.readdirSync(dir).filter((f) => f.endsWith('.mp4'));
  if (!files.length) throw new Error('no MP4 saved');
  const file = path.join(dir, files.at(-1)), bytes = fs.readFileSync(file); result.file = file; result.bytes = bytes.length;
  result.playback = await run(`(async()=>{
    const b=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([b],{type:'video/mp4'})),v=document.createElement('video');v.muted=true;v.src=url;document.body.append(v);
    try { await Promise.race([new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('MP4 decode error'));}),new Promise((_,j)=>setTimeout(()=>j(new Error('decode timeout')),10000))]);
      await v.play(); await new Promise(r=>setTimeout(r,2500));
      return {width:v.videoWidth,height:v.videoHeight,currentTime:v.currentTime,decoded:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.message||null};
    } finally {v.pause();v.remove();URL.revokeObjectURL(url);cancelAnimationFrame(window.checkFrame);}
  })()`);
  result.bounds = win.getBounds(); result.focused = win.isFocused(); save();
  win.destroy(); app.exit(0);
};
let source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const change = (from, to) => { if (!source.includes(from)) throw new Error('missing test anchor ' + from); source = source.replace(from, to); };
change("if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Toaster (dev)'));", '');
change('    width: 1280,', '    show: false, x: -20000, y: -20000,\n    width: 1280,');
change("win.loadFile(path.join(__dirname, 'renderer', 'index.html'));", 'global.recordCheckLoad(win).catch(err=>{console.error(err);app.exit(1)});');
change("win.webContents.executeJavaScript('window.startSystemAudio && window.startSystemAudio()', true);", '');
change('  setTimeout(startNowPlaying, 2000);', ''); change('  setUpCapture();', '');
fs.writeFileSync(path.join(copy, 'main.js'), source);
const m = new Module(path.join(copy, 'main.js'), module); m.filename = path.join(copy, 'main.js'); m.paths = Module._nodeModulePaths(copy); m._compile(source, m.filename);
setTimeout(() => { result.error = 'recording test timeout'; save(); app.exit(2); }, 90000).unref();
