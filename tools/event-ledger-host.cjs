// Engine-only offline Web Audio bench. Does not load main.js/app.js, open devices, play
// speakers, expose a debugging port, or use the user's app profile. One hidden page.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const dir = process.env.EVENT_LEDGER_DIR || path.join(root, '_checks/event-ledger');
const profile = path.join(dir, 'profile');
fs.mkdirSync(profile, { recursive: true });
app.setName('EventLedgerBench'); app.setPath('userData', profile); app.setPath('sessionData', profile);
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('js-flags', '--single-threaded');
app.whenReady().then(async () => {
  try {
    session.defaultSession.setPermissionRequestHandler((_w, _p, done) => done(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, done) => done({ cancel: true }));
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false } });
    win.webContents.on('console-message', (_e, ...args) => console.log('page', ...args));
    setTimeout(() => { console.error('bench deadline'); app.exit(2); }, 90 * 60 * 1000).unref();
    await win.loadURL('about:blank');
    // Chromium raises some child process priorities after spawn. Keep only this harness's
    // own processes below normal as well as inheriting the two-processor affinity.
    const lowerOwned = () => { for (const metric of app.getAppMetrics()) {
      try { os.setPriority(metric.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* exiting */ }
    } };
    lowerOwned(); setInterval(lowerOwned, 1000).unref();
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'jobs.json')));
    const sources = Object.fromEntries(['engine', 'tape', 'codegen'].map((k) => [k, fs.readFileSync(path.join(root, 'renderer', k + '.js'), 'utf8')]));
    const checks = fs.readFileSync(path.join(root, 'tools/checks.js'), 'utf8');
    const bench = fs.readFileSync(path.join(root, 'tools/event-ledger-page.js'), 'utf8');
    const sourceFile = path.join(dir, 'capture-sources.json');
    const snapshot = JSON.stringify({ sources, checks, bench });
    if (config.some((job) => job.resume) && fs.existsSync(sourceFile) && fs.readFileSync(sourceFile, 'utf8') !== snapshot) {
      throw Error('Cannot resume captures made by different detector/generator/bench sources');
    }
    fs.writeFileSync(sourceFile, snapshot);
    for (const job of config) {
      const file = path.join(dir, job.key + '.json');
      if (job.resume && fs.existsSync(file)) {
        const saved = JSON.parse(fs.readFileSync(file));
        if (saved.key !== job.key || saved.duration !== job.seconds || saved.error || (job.parity && saved.parity !== true)) throw Error('Incompatible saved capture: ' + job.key);
        console.log('resumed', job.key); continue;
      }
      console.log('starting', job.key, new Date().toISOString());
      let audio;
      if (job.audio) audio = fs.readFileSync(job.audio).toString('base64');
      const result = await win.webContents.executeJavaScript(`(${bench})(${JSON.stringify({ job, sources, checks, audio })})`, true);
      if (result.error) throw Error(job.key + ': ' + result.error);
      fs.writeFileSync(path.join(dir, job.key + '.json'), JSON.stringify(result));
      console.log('captured', job.key, result.duration, 'seconds', result.ledger.chunks.flat().length, 'records', 'parity', result.parity);
    }
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
