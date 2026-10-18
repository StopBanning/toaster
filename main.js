// Toaster: main process. Opens the window, hands the page the machine's audio without a
// share prompt, reports what the system says is playing, and answers questions about the machine.
const { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const updates = require('./update.js');

const mac = process.platform === 'darwin';

// Run from source (npm start, npm run dev, the checks), it keeps its settings in a folder of its
// own, so trying things out never changes the installed app's.
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Toaster (dev)'));

// One Toaster at a time (two would both capture the sound and fight over the camera): opening it
// again brings the one that's running to the front. (The copy run from source keeps its own
// settings folder, so it runs alongside the installed one.)
const first = app.requestSingleInstanceLock();
if (!first) app.quit();
app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});

// It was called Now Coding: the first time Toaster starts, it brings that version's saved
// settings (background, theme, blocks sync and so on) over from its folder.
try {
  const from = path.join(app.getPath('appData'), 'Now Coding', 'Local Storage');
  const to = path.join(app.getPath('userData'), 'Local Storage');
  if (fs.existsSync(from) && !fs.existsSync(to)) fs.cpSync(from, to, { recursive: true });
} catch { /* start fresh */ }

let win = null;
let nowPlayingProc = null;
let lastNowPlaying = null;
let normalBounds = null;
let miniFrom = null, miniBounds = null; // the window before the mini player, and where the mini one was

// The page keeps listening while the window is covered or minimized (see backgroundThrottling
// below), but Chromium also drops a hidden window's page to idle priority, and then anything
// else busy on the PC can stall the listening for most of a second at a time. Keep it at normal
// priority; listening alone costs about 2% of one core.
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function createWindow() {
  // Windows draws its caption buttons on the right (the overlay). macOS draws the traffic
  // lights on the left; the page leaves them a gap (see renderer/boot.js).
  const frame = mac
    ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 11 } }
    : { titleBarStyle: 'hidden', titleBarOverlay: { color: '#051db5', symbolColor: '#ffffff', height: 36 } };
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 560,
    title: 'Toaster',
    backgroundColor: '#051db5',
    autoHideMenuBar: true,
    ...frame,
    icon: path.join(__dirname, 'build', mac ? 'icon.png' : 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // Keep listening at full speed when the window is covered (for example, behind OBS).
      backgroundThrottling: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
  // The page is the app: it never opens other windows or goes anywhere else (links to Strudel go
  // to the browser, through open:strudel).
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // Closing mid-recording: the page finishes the video first (its last piece, and the recorder's
  // own ending, only come once it stops), then asks to close (win:close). If that takes too long
  // (a page that's stuck), it closes anyway, keeping what has arrived.
  let finishing = false;
  win.on('close', (e) => {
    if (!recording || finishing) return;
    e.preventDefault();
    finishing = true;
    win.webContents.send('rec:finish');
    setTimeout(() => win?.destroy(), 5000);
  });
  // With background throttling off the page can't tell it's minimized, so say so: it stops
  // drawing (but keeps listening) while nobody can see it.
  win.on('minimize', () => win.webContents.send('win:shown', false));
  win.on('restore', () => win.webContents.send('win:shown', true));
  // Fullscreen hides the traffic lights, so the page can use that left gap.
  win.on('enter-full-screen', () => win.webContents.send('win:full', true));
  win.on('leave-full-screen', () => win.webContents.send('win:full', false));
  win.webContents.on('did-finish-load', () => {
    if (lastNowPlaying) win.webContents.send('nowplaying', lastNowPlaying);
    // Start listening right away. Screen/audio capture needs a user gesture, and running this
    // from here counts as one.
    win.webContents.executeJavaScript('window.startSystemAudio && window.startSystemAudio()', true);
  });
}

// The page asks for the machine's audio; we hand it over with no picker and no "sharing
// your screen" bar. Windows loopback rides on a screen source. macOS hears the mix through
// a Core Audio tap (audio only): a screen source would be a Screen Recording prompt for a
// picture Toaster never uses.
function setUpCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      if (mac) {
        callback({ audio: 'loopback' });
        return;
      }
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      callback({ video: sources[0], audio: 'loopback' });
    } catch (err) {
      console.error('capture failed', err);
      callback({});
    }
  });
  const allowed = new Set(['media', 'display-capture', 'fullscreen']);
  // (asked for by our own window only)
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(wc === win?.webContents && allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

// Windows: helpers/*.ps1. Mac: helpers/mac/bin, compiled Swift (see helpers/mac/build.sh).
// Same protocol either way: JSON lines on stdout, and for faces a grey frame per line on stdin.
function spawnHelper(name) {
  let file;
  let cmd;
  let args;
  const opts = {};
  if (process.platform === 'win32') {
    file = path.join(__dirname, 'helpers', `${name}.ps1`).replace('app.asar', 'app.asar.unpacked');
    cmd = 'powershell.exe';
    args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file];
    opts.windowsHide = true;
  } else if (mac) {
    file = path.join(__dirname, 'helpers', 'mac', 'bin', name).replace('app.asar', 'app.asar.unpacked');
    cmd = file;
    args = [];
  } else {
    return null;
  }
  if (!fs.existsSync(file)) return null;
  const proc = spawn(cmd, args, opts);
  proc.stderr?.setEncoding('utf8');
  proc.stderr?.on('data', (chunk) => {
    const line = String(chunk).trim();
    if (line) console.error(`${name}: ${line}`);
  });
  return proc;
}

// From source on a Mac, compile the helpers if the Swift changed. A packaged app already
// carries the binaries (and the person running it doesn't have a compiler).
function ensureMacHelpers() {
  if (!mac || app.isPackaged) return;
  const result = spawnSync('bash', [path.join(__dirname, 'helpers', 'mac', 'build.sh')], { encoding: 'utf8' });
  if (result.status !== 0) console.error(result.stderr || result.stdout || 'could not compile the mac helpers');
}

function startNowPlaying() {
  nowPlayingProc = spawnHelper('nowplaying');
  if (!nowPlayingProc) return;
  let buffer = '';
  nowPlayingProc.stdout.setEncoding('utf8');
  nowPlayingProc.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        lastNowPlaying = JSON.parse(line);
        win?.webContents.send('nowplaying', lastNowPlaying);
      } catch { /* ignore partial or odd lines */ }
    }
  });
  nowPlayingProc.on('error', () => { nowPlayingProc = null; });
}

// Face finding for the camera pop-ups that close in on your face and eyes. The helper runs
// the system's own face detector (Windows.Media, or Vision on the Mac) while the camera is
// on. Small grey frames go in on stdin, one line each, and a line of face boxes comes back
// for each. Nothing leaves the machine.
let faceProc = null, faceWaiting = [], faceBuffer = '';
function startFaces() {
  const proc = spawnHelper('faces');
  if (!proc) return;
  faceProc = proc;
  faceBuffer = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    faceBuffer += chunk;
    let nl;
    while ((nl = faceBuffer.indexOf('\n')) >= 0) {
      const line = faceBuffer.slice(0, nl).trim();
      faceBuffer = faceBuffer.slice(nl + 1);
      const reply = faceWaiting.shift();
      if (!reply) continue;
      try { reply(JSON.parse(line)); } catch { reply({ faces: [] }); }
    }
  });
  const done = () => {
    if (faceProc === proc) faceProc = null;
    faceWaiting.splice(0).forEach((reply) => reply({ faces: [] }));
  };
  proc.on('exit', done);
  proc.on('error', done);
}
function stopFaces() {
  faceProc?.kill();
  faceProc = null;
}

// CPU use comes from the change in CPU time between two readings.
let lastCpu = os.cpus();
function cpuPercent() {
  const now = os.cpus();
  let idle = 0, total = 0;
  now.forEach((c, i) => {
    const before = lastCpu[i]?.times || c.times;
    for (const k of Object.keys(c.times)) total += c.times[k] - before[k];
    idle += c.times.idle - before.idle;
  });
  lastCpu = now;
  return total > 0 ? Math.round(100 * (1 - idle / total)) : 0;
}

function setUpIpc() {
  ipcMain.handle('sys:info', () => {
    const d = screen.getPrimaryDisplay();
    const cpus = os.cpus();
    return {
      os: `${os.version()} ${os.release().split('.').pop()}`,
      cpu: cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'cpu',
      threads: cpus.length,
      ramGB: os.totalmem() / 2 ** 30,
      screen: `${d.size.width}x${d.size.height}@${d.scaleFactor}x`,
      electron: process.versions.electron,
    };
  });
  ipcMain.handle('sys:load', () => ({
    cpu: cpuPercent(),
    ramUsedGB: (os.totalmem() - os.freemem()) / 2 ** 30,
    uptime: os.uptime(),
  }));
  ipcMain.handle('win:fullscreen', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
    return win?.isFullScreen();
  });
  // Vertical mode: a 9:16 window sized for recording TikToks and Shorts.
  ipcMain.handle('win:vertical', (_e, on) => {
    if (!win) return false;
    if (win.isFullScreen()) win.setFullScreen(false);
    if (on) {
      normalBounds = win.getBounds();
      const area = screen.getDisplayMatching(normalBounds).workArea;
      const h = Math.round(area.height * 0.94);
      const w = Math.round((h * 9) / 16);
      win.setBounds({ x: area.x + Math.round((area.width - w) / 2), y: area.y + Math.round((area.height - h) / 2), width: w, height: h });
    } else if (normalBounds) {
      win.setBounds(normalBounds);
    }
    return on;
  });
  // The mini player: a small window over everything else (the code and the background, still
  // listening), in the corner of the screen it's on, or wherever you last moved it; off, the
  // window goes back to where it was.
  ipcMain.handle('win:mini', (_e, on) => {
    if (!win) return false;
    if (win.isFullScreen()) win.setFullScreen(false);
    if (on && !miniFrom) {
      miniFrom = win.getBounds();
      const area = screen.getDisplayMatching(miniFrom).workArea, w = 460, h = 300;
      win.setMinimumSize(320, 200);
      win.setAlwaysOnTop(true, 'floating');
      win.setBounds(miniBounds || { x: area.x + area.width - w - 16, y: area.y + area.height - h - 16, width: w, height: h });
    } else if (!on && miniFrom) {
      miniBounds = win.getBounds();
      win.setAlwaysOnTop(false);
      win.setMinimumSize(420, 560);
      win.setBounds(miniFrom);
      miniFrom = null;
    }
    return on;
  });
  ipcMain.handle('app:version', () => app.getVersion());
  // Updates (update.js): the page asks once it has started (if its setting is on); on your yes
  // the new copy is fetched, checked and readied, then the window closes (a recording finishes
  // first) and the swap script takes over. Or the release's page, in the browser.
  ipcMain.handle('update:check', () => updates.check().catch(() => null));
  ipcMain.handle('update:install', async () => {
    let last = -1;
    await updates.install((p) => { if (p - last >= 0.01 || p >= 1) { last = p; win?.webContents.send('update:progress', p); } });
    setTimeout(() => win?.close(), 300);
    return true;
  });
  ipcMain.handle('update:page', () => shell.openExternal(updates.page()));
  ipcMain.handle('win:titlebar', (_e, color, symbolColor) => {
    try { win?.setTitleBarOverlay({ color, symbolColor }); } catch { /* not supported */ }
  });
  // One grey frame (w x h bytes) in, its face boxes out. Starts the helper on first use.
  ipcMain.handle('faces:find', (_e, w, h, pixels) => new Promise((resolve) => {
    if (!faceProc) startFaces();
    if (!faceProc || faceWaiting.length >= 2) { resolve({ faces: [], busy: true }); return; }
    faceWaiting.push(resolve);
    faceProc.stdin.write(`${w} ${h} ${Buffer.from(pixels).toString('base64')}\n`);
  }));
  ipcMain.handle('faces:stop', () => stopFaces());
  // The code, opened in the Strudel REPL in your browser (the code rides in the link's #, which
  // stays in the browser). Nothing but strudel.cc links goes through here.
  ipcMain.handle('open:strudel', (_e, url) => {
    if (typeof url === 'string' && url.startsWith('https://strudel.cc/#') && url.length < 60000) return shell.openExternal(url);
  });
  // Recording (M): a capture id for the page itself (just what's in the window: no frame, no
  // cursor, nothing else on screen), then the video it sends, piece by piece, into a file in
  // Videos\Toaster. The taskbar icon goes red while it records.
  ipcMain.handle('rec:source', () => win?.webContents.getMediaSourceId(win.webContents));
  ipcMain.handle('rec:start', (_e, ext) => {
    endRecording();
    const dir = path.join(app.getPath('videos'), 'Toaster');
    fs.mkdirSync(dir, { recursive: true });
    const dotExt = '.' + (ext === 'webm' ? 'webm' : 'mp4');
    const stem = path.join(dir, `toaster ${stamp()}`);
    const file = freeBase(stem, [dotExt, dotExt + '.part']) + dotExt;
    const out = fs.createWriteStream(file + '.part', { flags: 'wx' });
    recording = { stem, ext: dotExt, file, out, failed: false };
    // The file can't be written (the disk is full, say): tell the page once, which stops the
    // recording and says so, and take no more of it. (Unhandled, the error would end the app.)
    out.on('error', (err) => {
      if (recording?.out !== out || recording.failed) return;
      recording.failed = true;
      win?.webContents.send('rec:failed', String(err?.message || err));
    });
    win?.setProgressBar(1, { mode: 'error' });
    win?.setTitle('● recording - Toaster');
    return file;
  });
  // true once the piece is on disk, false if it couldn't be written
  ipcMain.handle('rec:chunk', (_e, buf) => new Promise((resolve) => {
    if (!recording || recording.failed) { resolve(false); return; }
    recording.out.write(Buffer.from(buf), (err) => resolve(!err));
  }));
  ipcMain.handle('rec:stop', () => endRecording());
  ipcMain.handle('win:close', () => win?.close());
  ipcMain.handle('rec:show', (_e, file) => {
    // only files inside our own folders (resolved first, so a .. in the path can't step out)
    const ours = [path.join(app.getPath('videos'), 'Toaster'), path.join(app.getPath('music'), 'Toaster')];
    if (typeof file !== 'string') return;
    const at = path.resolve(file);
    if (ours.some((dir) => { const rel = path.relative(dir, at); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); })) shell.showItemInFolder(at);
  });
  // Drop clips (J): each one arrives whole once it's done, beside the recordings in Videos\Toaster.
  ipcMain.handle('clip:save', (_e, buf, ext) => {
    const dir = path.join(app.getPath('videos'), 'Toaster');
    fs.mkdirSync(dir, { recursive: true });
    const dotExt = '.' + (ext === 'webm' ? 'webm' : 'mp4');
    const file = freeBase(path.join(dir, `toaster drop ${stamp()}`), [dotExt]) + dotExt;
    fs.writeFileSync(file, Buffer.from(buf), { flag: 'wx' });
    return file;
  });
  // The hand log (Ctrl+Shift+H, renderer/handlog.js): lines of JSON (numbers only), in the
  // settings folder's "hand logs", a file a log, added to every few seconds.
  let handLog = null;
  ipcMain.handle('handlog:start', () => {
    const dir = path.join(app.getPath('userData'), 'hand logs');
    fs.mkdirSync(dir, { recursive: true });
    handLog = freeBase(path.join(dir, `hands ${stamp()}`), ['.jsonl']) + '.jsonl';
    fs.writeFileSync(handLog, '', { flag: 'wx' });
    return handLog;
  });
  ipcMain.handle('handlog:add', (_e, text) => {
    if (!handLog || typeof text !== 'string' || text.length > 8e6) return false;
    fs.appendFileSync(handLog, text);
    return true;
  });
  ipcMain.handle('handlog:stop', () => { const file = handLog; handLog = null; return file; });
  // Song export (X): the song as a MIDI file and as Strudel code, side by side in Music\Toaster,
  // named after the song and the time.
  ipcMain.handle('song:save', (_e, name, midi, code) => {
    const dir = path.join(app.getPath('music'), 'Toaster');
    fs.mkdirSync(dir, { recursive: true });
    const safe = String(name || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'song';
    const base = freeBase(path.join(dir, `${safe} ${stamp()}`), ['.mid', '.strudel.js']);
    fs.writeFileSync(base + '.mid', Buffer.from(midi), { flag: 'wx' });
    if (typeof code === 'string' && code) fs.writeFileSync(base + '.strudel.js', code, { encoding: 'utf8', flag: 'wx' });
    return base + '.mid';
  });
}

function stamp(d = new Date()) {
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}.${two(d.getMinutes())}.${two(d.getSeconds())}`;
}
// A name that doesn't collide with one already on disk (x, x (2), x (3)...), checking every file
// the save will create (.mid with .strudel.js, a recording with its .part).
function freeBase(stem, exts) {
  for (let n = 1; ; n++) {
    const cand = n === 1 ? stem : `${stem} (${n})`;
    if (exts.every((e) => !fs.existsSync(cand + e))) return cand;
  }
}

// Finishes the file being recorded (also when the app closes mid-recording): what has arrived
// becomes the video, under its proper name.
let recording = null, endingRec = Promise.resolve(null);
// (A file that failed partway stays as .part, so it isn't taken for a whole video; and the close
// never waits more than 5 seconds on a stream that has gone wrong.)
function endRecording() {
  if (!recording) return endingRec;
  const { stem, ext, file, out, failed } = recording;
  recording = null;
  win?.setProgressBar(-1);
  win?.setTitle('Toaster');
  if (failed) {
    out.destroy();
    endingRec = Promise.resolve(fs.existsSync(file + '.part') ? file + '.part' : null);
    return endingRec;
  }
  endingRec = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(file + '.part'), 5000);
    out.end(() => {
      const dest = fs.existsSync(file) ? freeBase(stem, [ext, ext + '.part']) + ext : file;
      fs.rename(file + '.part', dest, (err) => { clearTimeout(timer); resolve(err ? file + '.part' : dest); });
    });
  });
  return endingRec;
}

app.whenReady().then(() => {
  if (!first) return;
  if (mac) app.dock?.setIcon(path.join(__dirname, 'build', 'icon.png'));
  ensureMacHelpers();
  setUpCapture();
  setUpIpc();
  createWindow();
  startNowPlaying();
});

app.on('window-all-closed', () => {
  nowPlayingProc?.kill();
  stopFaces();
  endRecording().finally(() => app.quit());
});
