const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { app, session } = require('electron');
const arg = (name) => process.argv.find((s) => s.startsWith('--' + name + '='))?.slice(name.length + 3);
const root = path.resolve(__dirname, '..'), copy = arg('copy'), runDir = arg('run'), output = arg('output'), look = arg('look');
for (const p of [copy, runDir, output]) { const rel = path.relative(path.join(root, '_checks'), path.resolve(p)); if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('owned check paths required'); }
if (arg('remote-debugging-port') !== '9353') throw new Error('only port 9353 is allowed');
app.setName('ToasterFirstUse'); app.setVersion(JSON.parse(fs.readFileSync(path.join(copy, 'package.json'))).version);
for (const key of ['appData', 'userData', 'sessionData', 'temp', 'videos', 'music']) { const dir = path.join(runDir, key); fs.mkdirSync(dir, { recursive: true }); app.setPath(key, dir); }
for (const flag of ['mute-audio', 'use-fake-device-for-media-stream', 'use-fake-ui-for-media-stream', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag);
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
const result = { look, runDir, errors: [], permissions: [], versions: process.versions }, pause = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => fs.writeFileSync(output, JSON.stringify(result, null, 2));
const fail = (err, code = 1) => { result.error = String(err?.stack || err); save(); app.exit(code); };
global.firstUseLoad = async (win) => {
  let command;
  const run = async (expression) => {
    const reply = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result?.value;
  };
  win.webContents.on('render-process-gone', (_e, d) => fail(JSON.stringify(d), 2));
  session.defaultSession.setPermissionRequestHandler((wc, permission, done, details) => {
    const types = details.mediaTypes || []; result.permissions.push({ permission, types });
    done(wc.id === win.webContents.id && permission === 'media' && types.length > 0 && types.every((t) => t === 'video'));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission, _origin, d) => wc?.id === win.webContents.id && permission === 'media' && d.mediaType === 'video');
  session.defaultSession.setDisplayMediaRequestHandler((_r, done) => done({}));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, done) => done({ cancel: true }));
  await win.loadURL('about:blank');
  const targets = await (await fetch('http://127.0.0.1:9353/json/list')).json();
  const pages = targets.filter((p) => p.type === 'page');
  if (pages.length !== 1 || pages[0].url !== win.webContents.getURL()) throw new Error('expected only this isolated page on port 9353');
  const socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0; const pending = new Map();
  socket.onmessage = (event) => {
    const reply = JSON.parse(event.data);
    if (reply.id) { const p = pending.get(reply.id); pending.delete(reply.id); if (reply.error) p.reject(new Error(JSON.stringify(reply.error))); else p.resolve(reply.result); }
    else if (reply.method === 'Runtime.exceptionThrown') result.errors.push(reply.params.exceptionDetails);
  };
  command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  await command('Runtime.enable');
  result.drive = 'CDP WebSocket on 127.0.0.1:9353';
  if (look === 'pixels') {
    win.setContentSize(640, 480);
    await win.loadFile(path.join(copy, 'renderer/first-use-pixels.html')); win.showInactive();
    result.images = await run('pixelRun()');
    for (const row of result.images) {
      row.file = path.basename(output, '.json') + '-' + row.name + '.png';
      fs.writeFileSync(path.join(root, '_checks', row.file), Buffer.from(row.png, 'base64')); delete row.png;
    }
    result.focused = win.isFocused(); save(); win.destroy(); app.exit(result.errors.length ? 1 : 0); return;
  }
  await win.loadFile(path.join(copy, 'renderer/index.html')); win.showInactive();
  result.gpu = await run(`(()=>{const gl=document.createElement('canvas').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');const name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';gl?.getExtension('WEBGL_lose_context')?.loseContext();return name;})()`);
  if (/unknown|Basic Render|WARP|SwiftShader|llvmpipe|Software/i.test(result.gpu)) { fail('not a hardware WebGL renderer: ' + result.gpu, 2); return; }
  await run('__nc.useDemo()'); await pause(750);
  if (arg('hold')) await run('window.firstUseHold=600');
  const camera = ['dots', 'voxels', 'asciicam'].includes(look);
  if (camera) {
    await run('firstUse.setCamFx(firstUse.fx.indexOf("none"));firstUse.toggleCam()');
    for (let i = 0; i < 100; i++) { if (await run('firstUse.cam.on && firstUse.cam.video.readyState >= 2')) break; await pause(100); if (i === 99) throw new Error('fake camera did not open'); }
    result.camera = await run('(()=>{const track=firstUse.cam.video.srcObject.getVideoTracks()[0],s=track.getSettings();return{label:track.label,width:s.width,height:s.height,frameRate:s.frameRate};})()');
    if (!/fake/i.test(result.camera.label)) throw new Error('camera is not labelled as fake');
    // A readyState alone can still be the initial black frame. The fake device must
    // actually deliver its coloured test picture before it can test ASCII drawing.
    for (let i = 0; i < 100; i++) {
      const pixels = await run('(()=>{const c=document.createElement("canvas");c.width=64;c.height=48;const g=c.getContext("2d");g.drawImage(firstUse.cam.video,0,0,64,48);return Math.max(...g.getImageData(0,0,64,48).data.filter((_,i)=>i%4!==3));})()');
      if (pixels > 100) break;
      if (i === 99) throw new Error('fake camera stayed black'); await pause(100);
    }
    const pic = await run('(()=>{const c=document.createElement("canvas");c.width=640;c.height=480;c.getContext("2d").drawImage(firstUse.cam.video,0,0,640,480);return c.toDataURL("image/png").split(",")[1];})()');
    const input = path.join(root, '_checks', 'fake-camera.png'); fs.writeFileSync(input, Buffer.from(pic, 'base64'));
    await pause(500);
  }
  const canvas = { dots: 'dotcam', voxels: 'voxcam', warp: 'warp', spectrum: 'field', rain: 'field', scope: 'field', asciicam: 'asciicam' }[look];
  const select = camera ? look === 'asciicam' ? 'await firstUse.toggleCam();await firstUse.toggleCam();' : 'firstUse.setCamFx(firstUse.fx.indexOf(' + JSON.stringify(look) + '));' : '__nc.setVisual(firstUse.visuals.indexOf(' + JSON.stringify(look) + '));';
  result.steps = [];
  for (const round of ['cold', 'warm']) {
    await run(`(async()=>{firstUseStats.begin(${JSON.stringify(round)},${JSON.stringify(canvas)});${select}})()`);
    for (let i = 0; i < 300; i++) {
      await pause(100);
      if (arg('hold') && round === 'cold' && i === 2) {
        result.pending = await run(`(()=>{const ids=['cam','dotcam','voxcam','asciicam','wait'];return Object.fromEntries(ids.map(id=>{const c=document.getElementById(id);return[id,{hidden:c.hidden,width:c.width,height:c.height}];}));})()`);
      }
      const done = await run('firstUseStats.phase.firstDraw !== null && performance.now()-firstUseStats.phase.at >= 2000 && performance.now()-firstUseStats.phase.firstDraw >= 500');
      if (done) break; if (i === 299) { result.unfinished = await run('({stats:firstUseStats.finish(),state:{ascii:__nc.state.ascii,eyes:__nc.state.eyes,camFx:__nc.state.camFx},frame:firstUse.cam.frame&&{w:firstUse.cam.frame.w,h:firstUse.cam.frame.h},rect:firstUse.cam.rect})'); throw new Error('look did not draw: ' + look); }
    }
    result.steps.push(await run('firstUseStats.finish()'));
    if (arg('hold') && round === 'cold') {
      result.readyHidden = await run('document.getElementById(' + JSON.stringify(canvas) + ').hidden');
      const before = result.pending;
      if (camera ? before.cam.hidden || !before[canvas].hidden : before.wait.hidden) throw new Error('pending placeholder is not visible');
      if (result.readyHidden || result.steps[0].firstDrawMs < 600) throw new Error('delayed compile did not become visible correctly');
    }
    if (round === 'cold') {
      if (look === 'asciicam') { await run('firstUse.toggleCam()'); await run('firstUse.toggleCam()'); await pause(500); }
      else if (camera) await run('firstUse.setCamFx(firstUse.fx.indexOf("none"))');
      else await run('__nc.setVisual(firstUse.visuals.indexOf("off"))');
      await pause(300);
    }
  }
  result.bounds = win.getBounds(); result.focused = win.isFocused();
  if (result.focused || result.bounds.x !== -20000) throw new Error('window isolation failed');
  if (result.steps.some((s) => s.renderers.some((r) => /unknown|Basic Render|WARP|SwiftShader|llvmpipe|Software/i.test(r.renderer)))) { fail('target used a software renderer', 2); return; }
  save(); win.destroy(); app.exit(result.errors.length ? 1 : 0);
};
let source = fs.readFileSync(path.join(copy, 'main.js'), 'utf8');
const change = (from, to) => { if (!source.includes(from)) throw new Error('missing first-use fixture anchor'); source = source.replace(from, to); };
change("if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Toaster (dev)'));", '');
change('    width: 1280,', '    show: false, x: -20000, y: -20000,\n    width: 1280,');
change('webPreferences: {', 'webPreferences: { backgroundThrottling: false,');
change("win.loadFile(path.join(__dirname, 'renderer', 'index.html'));", 'global.firstUseLoad(win).catch(err=>global.firstUseFail(err));');
change("win.webContents.executeJavaScript('window.startSystemAudio && window.startSystemAudio()', true);", '');
change('  setTimeout(startNowPlaying, 2000);', ''); change('  setUpCapture();', '');
global.firstUseFail = fail;
const m = new Module(path.join(copy, 'main.js'), module); m.filename = path.join(copy, 'main.js'); m.paths = Module._nodeModulePaths(copy); m._compile(source, m.filename);
setTimeout(() => fail('first-use check timeout', 2), 90000).unref();
