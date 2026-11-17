// Runs tools/tune-real-check.html in a hidden, muted Electron window and prints its result as one line of JSON.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tune-real-'));
app.setPath('userData', dir); app.dock?.hide();
app.whenReady().then(async () => {
  let r = null;
  try {
    const w = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
    w.webContents.setAudioMuted(true);
    await w.loadFile(path.join(__dirname, 'tune-real-check.html'));
    for (let i = 0; i < 1800 && !r; i++) { r = await w.webContents.executeJavaScript('window.result'); if (!r) await new Promise((s) => setTimeout(s, 50)); }
    w.destroy();
  } catch (e) { r = { ok: false, error: String(e?.stack || e) }; }
  console.log(JSON.stringify(r || { ok: false, error: 'no result in 90 s' }));
  fs.rmSync(dir, { recursive: true, force: true });
  app.exit(r?.ok ? 0 : 1);
});
