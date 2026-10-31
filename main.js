// Toaster: main process. Opens the window, hands the page the machine's audio without a
// share prompt, reports what the system says is playing, and answers questions about the machine.
const { app, BrowserWindow, Menu, desktopCapturer, ipcMain, screen, session, shell } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const updates = require('./update.js');
// The header's star button: the project's page, and its star count on GitHub, asked at most once every
// ten minutes (null when it can't be had). (Kept out of update.js: a change there only shows at the next
// update.)
const REPO_PAGE = 'https://github.com/StopBanning/toaster';
let starsKept = null;
async function repoStars() {
  if (starsKept && Date.now() - starsKept.at < 600000) return starsKept.n;
  const { net } = require('electron');
  const res = await net.fetch('https://api.github.com/repos/StopBanning/toaster', { headers: { Accept: 'application/vnd.github+json', 'User-Agent': `Toaster/${app.getVersion()}` } });
  if (!res.ok) return null;
  const n = (await res.json()).stargazers_count;
  if (typeof n !== 'number') return null;
  starsKept = { n, at: Date.now() };
  return n;
}

// The radio's titles (renderer/app.js, useRadio): Icecast and Shoutcast put them in the stream itself
// when asked (Icy-MetaData), so the station's stream is read a second time, its sound thrown away, and
// each new title goes to the page (send). A station that sends none (no icy-metaint) is let go at once.
// One station at a time: radioTitles stops it. (helpers/radio.cjs is loaded when it's first needed: the
// test copies of the app don't carry helpers/.)
let radioTitles = null;
async function readTitles(url, ctl, send) {
  const { net } = require('electron');
  const { icyTitles } = require('./helpers/radio.cjs');
  const res = await net.fetch(url, { headers: { 'Icy-MetaData': '1' }, signal: ctl.signal });
  const metaint = Number(res.headers.get('icy-metaint'));
  if (!res.ok || !(metaint > 0)) return ctl.abort(); // (cancelling only the body leaves net.fetch's connection open)
  const read = icyTitles(metaint, send);
  for await (const chunk of res.body) read(chunk);
}

const mac = process.platform === 'darwin';

// Copies run from source for testing (the checks, the release smoke, a bench driven over the
// debugging port) can keep apart from the copy you're using: --user-data-dir=<folder> (or
// TOASTER_USER_DATA) gives one its own settings folder, and with it its own single-instance lock,
// so it never hands off to yours or brings it forward; --hidden (or TOASTER_HIDDEN=1) keeps its
// windows, its Dock icon and its menu out of sight. Neither does anything in the installed app.
const switchValue = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const testData = app.isPackaged ? '' : switchValue('user-data-dir') || process.env.TOASTER_USER_DATA || '';
const hidden = !app.isPackaged && (process.argv.includes('--hidden') || process.env.TOASTER_HIDDEN === '1');
if (hidden && mac) app.dock?.hide();

// Run from source (npm start, npm run dev, the checks), it keeps its settings in a folder of its
// own, so trying things out never changes the installed app's.
if (!app.isPackaged) {
  const profile = testData ? path.resolve(testData) : path.join(app.getPath('appData'), 'Toaster (dev)');
  const canonical = (p) => fs.realpathSync(p);
  const defaultProfile = path.join(app.getPath('appData'), 'Toaster (dev)');
  if (testData && (profile === defaultProfile || (fs.existsSync(profile) && fs.existsSync(defaultProfile) && canonical(profile) === canonical(defaultProfile)))) {
    console.error('Refusing test profile: --user-data-dir / TOASTER_USER_DATA must keep apart from Toaster (dev).');
    app.exit(1);
  } else {
    app.setPath('userData', profile);
    app.setPath('sessionData', profile);
  }
}

// One Toaster at a time (two would both capture the sound and fight over the camera): opening it
// again brings the one that's running to the front. (The lock is the settings folder's, so the copy
// run from source runs alongside the installed one, and a test copy with its own folder alongside both.)
const first = app.requestSingleInstanceLock();
if (!first) app.quit();
app.on('second-instance', () => {
  if (!win || hidden) return;
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
let nowPlayingProc = null, nowPlayingTimer = null, nowPlayingDelay = 2000, quitting = false;
let lastNowPlaying = null;
let normalBounds = null;
let miniFrom = null, miniBounds = {}; // the window before the mini player, and where the mini one was (each shape's own)
let widget = null, widgetAt = null; // the desktop handheld (W with the handheld on), and where it was last put

// The page keeps listening while the window is covered or minimized (see backgroundThrottling
// below), but Chromium also drops a hidden window's page to idle priority, and then anything
// else busy on the PC can stall the listening for most of a second at a time. Keep it at normal
// priority; listening alone costs about 2% of one core.
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Keep the scenery's compiled shaders between launches. Chromium (Electron 44, Chrome 156 too)
// writes a compiled program to the shader cache on disk (GPUCache, in the settings folder) only if
// its link finishes while the graphics process is running the page's commands; one the driver takes
// seconds over, as every scenery scene's does, finishes in between and was kept in memory only, so
// every start compiled the first scene again (3 s, then the 1.5 s settle: the lake at about 5 s).
// Chromium's per-context cache path hands every program to the disk cache; with it a restart
// shows the first scene in about half a second.
const features = app.commandLine.getSwitchValue('enable-features');
app.commandLine.appendSwitch('enable-features', [features, 'ANGLEPerContextBlobCache'].filter(Boolean).join(','));

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
    show: !hidden,
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
  win.on('closed', () => { win = null; widget?.close(); });
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
  const ours = (wc) => !!wc && (wc === win?.webContents || wc === widget?.webContents);
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(ours(wc) && allowed.has(permission)));
  // A null webContents cannot be attributed to our window, so deny it.
  session.defaultSession.setPermissionCheckHandler((wc, permission) => ours(wc) && allowed.has(permission));
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
  nowPlayingTimer = null;
  if (quitting || nowPlayingProc) return;
  const proc = spawnHelper('nowplaying');
  if (!proc) return;
  nowPlayingProc = proc;
  const started = Date.now();
  let buffer = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        lastNowPlaying = JSON.parse(line);
        win?.webContents.send('nowplaying', lastNowPlaying);
        widget?.webContents.send('nowplaying', lastNowPlaying);
      } catch { /* ignore partial or odd lines */ }
    }
  });
  const done = () => {
    if (nowPlayingProc !== proc) return; // error and exit can both arrive
    nowPlayingProc = null;
    if (quitting) return;
    if (Date.now() - started >= 60000) nowPlayingDelay = 2000;
    nowPlayingTimer = setTimeout(startNowPlaying, nowPlayingDelay);
    nowPlayingDelay = Math.min(nowPlayingDelay * 2, 60000);
  };
  proc.on('error', done);
  proc.on('exit', done);
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
    if (faceProc !== proc) return; // late output belongs to the old helper, not the new queue
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
    if (faceProc !== proc) return; // an older helper mustn't empty the new one's replies
    faceProc = null;
    faceWaiting.splice(0).forEach((reply) => reply({ faces: [] }));
  };
  // The helper can exit between checking it and writing a frame. EPIPE belongs to the stream,
  // not the child process's error event; release the waiting frames instead of crashing main.
  proc.stdin.on('error', () => { done(); proc.kill(); });
  proc.on('exit', done);
  proc.on('error', done);
}
function stopFaces() {
  const proc = faceProc;
  faceProc = null;
  faceWaiting.splice(0).forEach((reply) => reply({ faces: [] }));
  proc?.kill();
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
  // Out of full screen and un-maximized before the window takes a new size: Windows keeps a
  // maximized window as it is (a new size only becomes the one it restores to later), and can put
  // the full screen's old size back after setFullScreen(false) has returned. Says what it was, so
  // the window can go back to it.
  const unbig = async () => {
    const was = { full: win.isFullScreen(), max: win.isMaximized() };
    if (was.full) {
      await new Promise((r) => {
        const t = setTimeout(r, 1500);
        win.once('leave-full-screen', () => { clearTimeout(t); r(); });
        win.setFullScreen(false);
      });
      await new Promise((r) => setTimeout(r, 150)); // (Windows settling the window back)
    }
    if (win.isMaximized()) win.unmaximize();
    return was;
  };
  const rebig = (was) => {
    if (was?.max) win.maximize();
    if (was?.full) win.setFullScreen(true);
  };
  // Vertical mode: a 9:16 window sized for recording TikToks and Shorts. (Asked for twice, as the
  // mini player is, it keeps the window it came from: saving the 9:16 one over it left the window
  // that shape for good.)
  let normalWas = null;
  ipcMain.handle('win:vertical', async (_e, on) => {
    if (!win) return false;
    const was = await unbig();
    if (on && !normalBounds) {
      normalBounds = win.getBounds();
      normalWas = was;
      const area = screen.getDisplayMatching(normalBounds).workArea;
      const h = Math.round(area.height * 0.94);
      const w = Math.round((h * 9) / 16);
      win.setBounds({ x: area.x + Math.round((area.width - w) / 2), y: area.y + Math.round((area.height - h) / 2), width: w, height: h });
    } else if (!on && normalBounds) {
      win.setBounds(normalBounds);
      rebig(normalWas);
      normalBounds = normalWas = null;
    }
    return on;
  });
  // The mini player: a small window over everything else (the code and the background, still
  // listening), in the corner of the screen it's on, or wherever you last moved it; off, the
  // window goes back to where it was (maximized or full screen again, if it was). Its shape: wide,
  // or tall for the handheld game (the handheld on its own, as a little player).
  let miniWas = null, miniShape = 'wide';
  ipcMain.handle('win:mini', async (_e, on, shape) => {
    if (!win) return false;
    const was = await unbig();
    if (on && !miniFrom) {
      miniFrom = win.getBounds();
      miniWas = was;
      miniShape = shape === 'tall' ? 'tall' : 'wide';
      const area = screen.getDisplayMatching(miniFrom).workArea, [w, h] = miniShape === 'tall' ? [300, 500] : [460, 300];
      win.setMinimumSize(miniShape === 'tall' ? 200 : 320, 200);
      win.setAlwaysOnTop(true, 'floating');
      win.setBounds(miniBounds[miniShape] || { x: area.x + area.width - w - 16, y: area.y + area.height - h - 16, width: w, height: h });
    } else if (!on && miniFrom) {
      miniBounds[miniShape] = win.getBounds();
      win.setAlwaysOnTop(false);
      win.setMinimumSize(420, 560);
      win.setBounds(miniFrom);
      rebig(miniWas);
      miniFrom = null;
      miniWas = null;
    }
    return on;
  });
  // The desktop handheld: the handheld game on its own, no window round it, over everything else: a see-through
  // window shaped by what's drawn in it (the device and its shadow), dragged anywhere by the device. It's the page
  // again (?widget), listening for itself while the main window waits hidden; closing it (Esc, W or its x) brings the
  // main window back. It opens where the main window is (or wherever it was last put), without taking the focus.
  ipcMain.handle('win:widget', async (_e, on) => {
    if (on && !widget && win) {
      const b = win.getBounds(), w = 360, h = 600;
      const at = widgetAt || { x: b.x + b.width - w - 24, y: b.y + b.height - h - 24 };
      widget = new BrowserWindow({
        x: at.x, y: at.y, width: w, height: h, frame: false, transparent: true, resizable: false, maximizable: false,
        fullscreenable: false, hasShadow: false, alwaysOnTop: true, show: false, title: 'Toaster', backgroundColor: '#00000000',
        icon: path.join(__dirname, 'build', mac ? 'icon.png' : 'icon.ico'),
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false },
      });
      widget.setAlwaysOnTop(true, 'floating');
      widget.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { widget: '1' } });
      widget.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      widget.webContents.on('will-navigate', (e) => e.preventDefault());
      widget.webContents.on('did-finish-load', () => {
        if (lastNowPlaying) widget?.webContents.send('nowplaying', lastNowPlaying);
        widget?.webContents.executeJavaScript('window.startSystemAudio && window.startSystemAudio()', true);
      });
      widget.once('ready-to-show', () => { if (!hidden) widget?.showInactive(); });
      widget.on('moved', () => { if (widget) widgetAt = widget.getBounds(); });
      widget.on('closed', () => {
        widget = null;
        if (win) { if (!hidden) win.showInactive(); win.webContents.send('win:shown', true); win.webContents.send('win:widget', false); }
      });
      win.webContents.send('win:shown', false);
      win.hide();
    } else if (!on && widget) widget.close();
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
  // The header's star button: the project's star count, and its page in the browser.
  ipcMain.handle('repo:stars', () => repoStars().catch(() => null));
  ipcMain.handle('repo:open', () => shell.openExternal(REPO_PAGE));
  // The radio's titles: read from the stream at url and sent to the page that asked, till it asks
  // again (with null when the radio stops).
  ipcMain.handle('radio:titles', (e, url) => {
    radioTitles?.abort();
    radioTitles = null;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    const page = e.sender;
    radioTitles = new AbortController();
    readTitles(url, radioTitles, (song) => { if (!page.isDestroyed()) page.send('radio:title', song); }).catch(() => {});
  });
  // The radio's song's cover: looked up in the iTunes Store's search (it needs no key) by its artist
  // and title, kept only if both match (pickCover), and handed over as the picture's bytes (the page
  // can't fetch from other servers). null: no match; an error: it couldn't be asked.
  ipcMain.handle('radio:cover', async (_e, artist, title) => {
    if (typeof artist !== 'string' || typeof title !== 'string' || !artist || !title) return null;
    const { net } = require('electron');
    const { pickCover } = require('./helpers/radio.cjs');
    const q = new URLSearchParams({ media: 'music', entity: 'song', limit: '5', term: `${artist} ${title}` });
    const found = await net.fetch(`https://itunes.apple.com/search?${q}`);
    if (!found.ok) throw new Error(`iTunes search: ${found.status}`);
    const art = pickCover((await found.json()).results, artist, title);
    if (!art) return null;
    const pic = await net.fetch(art);
    if (!pic.ok) throw new Error(`the cover: ${pic.status}`);
    return new Uint8Array(await pic.arrayBuffer());
  });
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
  // A bug report's draft, a GitHub new-issue link, opened in your browser. Only Toaster's own
  // new-issue page goes through here (helpers/issue-url.cjs, loaded when it's first needed: the
  // test copies of the app don't carry helpers/).
  ipcMain.handle('open:bug-issue', (_e, url) => {
    if (!require('./helpers/issue-url.cjs').isAllowedIssueUrl(url)) throw new Error('Invalid bug report URL');
    return shell.openExternal(url);
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
    const token = ++recordingId;
    recording = { token, stem, ext: dotExt, file, out, failed: false };
    // The file can't be written (the disk is full, say): tell the page once, which stops the
    // recording and says so, and take no more of it. (Unhandled, the error would end the app.)
    out.on('error', (err) => {
      if (recording?.out !== out || recording.failed) return;
      recording.failed = true;
      win?.webContents.send('rec:failed', token, String(err?.message || err));
    });
    win?.setProgressBar(1, { mode: 'error' });
    win?.setTitle('● recording - Toaster');
    return { token, file };
  });
  // true once the piece is on disk, false if it couldn't be written
  ipcMain.handle('rec:chunk', (_e, token, buf) => new Promise((resolve) => {
    if (!recording || recording.token !== token || recording.failed) { resolve(false); return; }
    recording.out.write(Buffer.from(buf), (err) => resolve(!err));
  }));
  ipcMain.handle('rec:stop', (_e, token, failed) => {
    if (!recording || recording.token !== token) return null;
    if (failed) recording.failed = true;
    return endRecording();
  });
  ipcMain.handle('win:close', () => win?.close());
  ipcMain.handle('rec:show', (_e, file) => {
    // only files inside our own folders (resolved first, so a .. in the path can't step out)
    const ours = [path.join(app.getPath('videos'), 'Toaster'), path.join(app.getPath('music'), 'Toaster')];
    if (typeof file !== 'string') return;
    const at = path.resolve(file);
    if (ours.some((dir) => { const rel = path.relative(dir, at); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); })) shell.showItemInFolder(at);
  });
  // Drop clips (J): each one arrives whole once it's done, beside the recordings in Videos\Toaster.
  // (its name taken at once, then written in the background: written in one go, the 16-26 MB held
  // up the window and a recording's chunks meanwhile)
  ipcMain.handle('clip:save', async (_e, buf, ext) => {
    const dir = path.join(app.getPath('videos'), 'Toaster');
    fs.mkdirSync(dir, { recursive: true });
    const dotExt = '.' + (ext === 'webm' ? 'webm' : 'mp4');
    const file = freeBase(path.join(dir, `toaster drop ${stamp()}`), [dotExt]) + dotExt;
    try { await fs.promises.writeFile(file, Buffer.from(buf), { flag: 'wx' }); }
    catch (err) {
      // EEXIST means someone else owns the file: never remove it.
      if (err.code !== 'EEXIST') await fs.promises.rm(file, { force: true }).catch(() => {});
      throw err;
    }
    return file;
  });
  // The hand log (Ctrl+Shift+H, renderer/handlog.js): lines of JSON (numbers only), in the
  // settings folder's "hand logs", a file a log, added to every few seconds.
  let handLog = null, handLogWrites = Promise.resolve();
  ipcMain.handle('handlog:start', () => {
    const dir = path.join(app.getPath('userData'), 'hand logs');
    fs.mkdirSync(dir, { recursive: true });
    handLog = freeBase(path.join(dir, `hands ${stamp()}`), ['.jsonl']) + '.jsonl';
    fs.writeFileSync(handLog, '', { flag: 'wx' });
    return handLog;
  });
  ipcMain.handle('handlog:add', (_e, text) => {
    if (!handLog || typeof text !== 'string' || text.length > 8e6) return false;
    const file = handLog;
    const write = handLogWrites.then(() => fs.promises.appendFile(file, text)).then(() => true, () => false);
    handLogWrites = write; // a failed write must not prevent the next one
    return write;
  });
  ipcMain.handle('handlog:stop', async () => { const file = handLog; handLog = null; await handLogWrites; return file; });
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
let recording = null, recordingId = 0, endingRec = Promise.resolve(null);
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
    let done = false;
    const finish = (dest) => { if (done) return; done = true; clearTimeout(timer); resolve(dest); };
    const timer = setTimeout(() => { out.destroy(); finish(file + '.part'); }, 5000);
    out.once('error', () => finish(file + '.part'));
    out.end(() => {
      if (done) return;
      const dest = fs.existsSync(file) ? freeBase(stem, [ext, ext + '.part']) + ext : file;
      fs.rename(file + '.part', dest, (err) => finish(err ? file + '.part' : dest));
    });
  });
  return endingRec;
}

app.whenReady().then(() => {
  if (!first) return;
  if (hidden) Menu.setApplicationMenu(null);
  if (mac && !hidden) app.dock?.setIcon(path.join(__dirname, 'build', 'icon.png'));
  ensureMacHelpers();
  setUpCapture();
  setUpIpc();
  createWindow();
  // (the now-playing helper a moment after: PowerShell loading .NET took a core while the window and
  // its graphics were starting; the page gets the latest reading whenever it comes)
  nowPlayingTimer = setTimeout(startNowPlaying, 2000);
});

app.on('before-quit', () => { quitting = true; clearTimeout(nowPlayingTimer); });
app.on('window-all-closed', () => {
  quitting = true;
  clearTimeout(nowPlayingTimer);
  nowPlayingProc?.kill();
  radioTitles?.abort();
  stopFaces();
  endRecording().finally(() => app.quit());
});
