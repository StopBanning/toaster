// An isolated window for local rendering and recording checks. It never loads the app's main
// process, and cannot open capture devices, contact the network, or use the person's profile.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const profile = path.join(root, '_checks', 'profile-' + process.pid);
fs.mkdirSync(profile, { recursive: true });
app.setName('ToasterChecks');
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-features', 'ANGLEPerContextBlobCache');
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_w, _p, done) => done(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, done) => done({ cancel: true }));
  const win = new BrowserWindow({ x: -20000, y: -20000, width: 1920, height: 1080, show: false,
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true } });
  win.webContents.on('console-message', (_e, ...args) => console.log('page', ...args));
  win.webContents.on('render-process-gone', (_e, details) => { console.error('renderer exited', details); app.exit(2); });
  setTimeout(() => { console.error('isolated check deadline'); app.exit(2); }, 1200000).unref();
  const page = process.argv.find((s) => s.startsWith('--page='))?.slice(7) || path.join(root, '_checks', 'shader.html');
  await win.loadFile(page);
  win.showInactive();
  const timer = setInterval(async () => {
    try {
      const result = await win.webContents.executeJavaScript('window.checkResult || null');
      if (!result) return;
      clearInterval(timer);
      const output = process.argv.find((s) => s.startsWith('--output='))?.slice(9) || path.join(root, '_checks', 'result.json');
      if (result.artifacts) {
        const dir = path.join(path.dirname(output), 'pictures'); fs.mkdirSync(dir, { recursive: true });
        result.artifacts = result.artifacts.map(({ name, data }) => {
          if (!/^[a-zA-Z0-9_-]+\.png$/.test(name)) throw new Error('bad artifact name');
          fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
          return name;
        });
      }
      fs.writeFileSync(output, JSON.stringify(result, null, 2));
      console.log('CHECK_DONE', output);
      app.exit(result.error ? 1 : 0);
    } catch (err) { console.error(err); clearInterval(timer); app.exit(1); }
  }, 250);
});
