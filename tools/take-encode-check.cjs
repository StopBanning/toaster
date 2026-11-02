// tools/take-encode.test.mjs's Electron half: renderer/take-encode.js run in a real page (the real encoders), a click track
// written as MP4 twice (AAC, then Opus) into the folder given. Hidden (no window, no Dock icon), muted, its own profile in
// that folder; nothing is played, and no camera or microphone is touched. Prints one line of JSON and quits.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dir = process.argv[process.argv.length - 1];
app.commandLine.appendSwitch('mute-audio');
app.setPath('userData', path.join(dir, 'profile'));
app.dock?.hide();
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 200, height: 200, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
  ipcMain.once('result', (_e, result) => { console.log(JSON.stringify({ result })); app.quit(); });
  win.loadFile(path.join(__dirname, 'take-encode-check.html'), { query: { dir } });
});
setTimeout(() => { console.log(JSON.stringify({ result: { error: 'timed out' } })); app.exit(2); }, 80000);
