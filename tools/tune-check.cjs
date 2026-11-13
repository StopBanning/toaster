// Runs tools/tune-check.html in a hidden Electron window and prints its result as one line of JSON.
//   electron tools/tune-check.cjs <audio> [start s] [seconds]
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const [audio, start = '0', seconds = '30'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tune-check-'));
app.setPath('userData', dir); app.dock?.hide();
app.whenReady().then(async () => {
  let r = null;
  try {
    const w = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
    w.webContents.setAudioMuted(true);
    w.webContents.on('console-message', (e) => process.stderr.write('console: ' + (e.message ?? '') + '\n'));
    await w.loadFile(path.join(__dirname, 'tune-check.html'), { query: { audio: path.resolve(audio), start, seconds } });
    const limit = Number(process.env.TUNE_CHECK_SECONDS || 300) * 20;
    for (let i = 0; i < limit && !r; i++) { r = await w.webContents.executeJavaScript('window.result'); if (!r) await new Promise((s) => setTimeout(s, 50)); }
    if (!r) r = { ok: false, error: 'no result in time; stage: ' + await w.webContents.executeJavaScript('window.stage') };
    w.destroy();
  } catch (e) { r = { ok: false, error: String(e?.stack || e) }; }
  if (!r) r = { ok: false, error: 'no result in time' };
  console.log(JSON.stringify(r));
  fs.rmSync(dir, { recursive: true, force: true });
  app.exit(r?.ok ? 0 : 1);
});
