// The detection bench's host: runs one checkout's engine (renderer/engine.js, tape.js, codegen.js under --root) over real
// songs, offline and deterministic (an OfflineAudioContext stepped every 15 ms, as the app's timer polls), in hidden pages
// that never open a device or a speaker. What the engine read is written to --out as JSON, for score.mjs.
//   <electron> tools/detbench/host.cjs --root=<checkout> --jobs=<jobs.json> --out=<results.json> [--par=4] [--sr=48000]
// jobs.json: [{ key, audio, from, seconds }, ...]. Each job hears its song from `from` for `seconds`.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const root = path.resolve(arg('root', path.join(__dirname, '../..')));
const jobs = JSON.parse(fs.readFileSync(arg('jobs'), 'utf8'));
const out = path.resolve(arg('out'));
const par = Math.max(1, +arg('par', 4)), sr = +arg('sr', 48000);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'detbench-'));
app.setPath('userData', profile);
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('disable-gpu');
app.dock?.hide();
app.on('window-all-closed', () => {});
process.on('uncaughtException', (e) => { console.error(e); app.exit(3); });
app.whenReady().then(async () => {
  setTimeout(() => { console.error('detbench deadline'); app.exit(2); }, 4 * 3600 * 1000).unref();
  session.defaultSession.setPermissionRequestHandler((_w, _p, done) => done(false));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, done) => done({ cancel: true }));
  const sources = Object.fromEntries(['engine', 'tape', 'codegen'].map((k) => [k, fs.readFileSync(path.join(root, 'renderer', k + '.js'), 'utf8')]));
  sources.checks = fs.readFileSync(path.join(root, 'tools/checks.js'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');
  const results = {};
  let next = 0;
  async function worker() {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false } });
    await win.loadURL('about:blank');
    while (next < jobs.length) {
      const job = jobs[next++], t0 = Date.now();
      try {
        const audio = job.audio ? fs.readFileSync(job.audio).toString('base64') : '';
        const r = await win.webContents.executeJavaScript(`(${page})(${JSON.stringify({ job, sources, sr })}, ${JSON.stringify(audio)})`);
        results[job.key] = { ...r, ms: Date.now() - t0 };
        console.log(`${job.key}: ${r.error ? 'ERROR ' + r.error.split('\n')[0] : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
      } catch (e) {
        results[job.key] = { error: String(e.stack || e) };
        console.log(`${job.key}: ERROR ${e.message}`);
      }
    }
    win.destroy();
  }
  await Promise.all(Array.from({ length: Math.min(par, jobs.length) }, worker));
  fs.writeFileSync(out, JSON.stringify({ root, sr, made: new Date().toISOString(), results }));
  fs.rmSync(profile, { recursive: true, force: true });
  app.exit(0);
});
