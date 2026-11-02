// tools/take-tap.test.mjs's Electron half: renderer/take-tap.js in a real page. Known sound goes through the tap in an
// OfflineAudioContext (stereo, mono, in small blocks), then a live AudioContext runs for a moment. Hidden (no window, no
// Dock icon), muted, its own profile in the folder given; no microphone. Prints one line of JSON and quits.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dir = process.argv[process.argv.length - 1];
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setPath('userData', path.join(dir, 'profile'));
app.dock?.hide();
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 200, height: 200, webPreferences: { contextIsolation: false, nodeIntegration: true, backgroundThrottling: false } });
  ipcMain.once('result', (_e, result) => { console.log(JSON.stringify({ result })); app.quit(); });
  win.loadFile(path.join(__dirname, 'take-tap-check.html'));
});
setTimeout(() => { console.log(JSON.stringify({ result: { error: 'timed out' } })); app.exit(2); }, 60000);
