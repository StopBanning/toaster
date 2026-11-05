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
// The Earth's views (V, renderer/earth.js): NASA's footage from the space station, 6-25 MB a clip, so not in the app.
// Each comes down from the site the first time it's picked and is kept in the settings folder, so after that it
// plays offline. Only these files, each checked against its SHA-256 (a damaged or changed one is fetched again).
// TOASTER_MEDIA_BASE points it elsewhere for testing.
const EARTH_SUMS = {
  'earth-aurora': '7e18fe8b83f26155c50e66d53372f95728e6098306a6abccdfee96c9b3b75c7b',
  'earth-northern-lights': '8181248931a137dce2a3839f345e5295b44404e17570ea903bf6d7ff99e42d4f',
  'earth-city-lights': 'c1e4342f92a1d8ca8d722b217f107db4a10dbea36fbd2cacc3d6cd8129ec1cf5',
  'earth-dawn': 'ca3f6b0f8a84aed35a11d5fb6caebbd4eb2b9eec3f65d762d721f41995296a8a',
  'earth-day': '40d0fd820153b5008e1a0bbb8d9b35e5b732bf0f2aa81758b1764c3a39c32672',
  'backrooms-walk': '3ce8b00f0de2d739ca42114def8644715eeaa57b23e5d00f3dce24f40814ca26', // (the backrooms, V: our own walk, renderer/backrooms.js)
};
const EARTH_BASE = process.env.TOASTER_MEDIA_BASE || 'https://toaster.locust.lol/media/';
// Looks from outside (U, docs/looks-from-shaders.md): the shaders that ship in renderer/looks and the ones in the
// looks folder in the settings folder (yours: mine), each a .frag or .glsl of at most 64 KB, at most 24 a folder.
const looksDir = () => path.join(app.getPath('userData'), 'looks');
async function looksList() {
  const read = async (dir, mine) => {
    const out = [];
    for (const f of (await fs.promises.readdir(dir).catch(() => [])).filter((n) => /\.(frag|glsl)$/i.test(n)).sort().slice(0, 24)) {
      const file = path.join(dir, f), st = await fs.promises.stat(file).catch(() => null);
      if (!st?.isFile() || st.size > 65536) continue;
      out.push({ name: f.replace(/\.(frag|glsl)$/i, '').replace(/[-_]+/g, ' ').trim(), text: await fs.promises.readFile(file, 'utf8'), mine });
    }
    return out;
  };
  return [...await read(path.join(__dirname, 'renderer', 'looks'), false), ...await read(looksDir(), true)];
}
const sha256 = (bytes) => require('node:crypto').createHash('sha256').update(bytes).digest('hex');
const earthFetches = new Map(); // (a clip being fetched: asked again meanwhile, the same download)
const earthChecked = new Map(); // (a kept clip checked this run: its size and time then, so it isn't hashed on every pick)
const EARTH_MAX = 64 * 1024 * 1024; // (no view is near this: a response bigger than it is refused)
async function earthClip(name) {
  const sum = EARTH_SUMS[name];
  if (!sum) throw new Error('no such view');
  const dir = path.join(app.getPath('userData'), 'media', 'earth'), file = path.join(dir, name + '.mp4');
  try {
    const st = await fs.promises.stat(file), seen = `${st.size}:${st.mtimeMs}`;
    const kept = await fs.promises.readFile(file);
    if (earthChecked.get(name) === seen || sha256(kept) === sum) { earthChecked.set(name, seen); return kept; }
  } catch {}
  if (!earthFetches.has(name)) {
    earthFetches.set(name, (async () => {
      const { net } = require('electron');
      const res = await net.fetch(`${EARTH_BASE}earth/${name}.mp4`, { signal: AbortSignal.timeout(180000) });
      if (!res.ok) throw new Error(`the view didn't come down (${res.status})`);
      if (+res.headers.get('content-length') > EARTH_MAX) throw new Error('the view is too big');
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > EARTH_MAX || sha256(bytes) !== sum) throw new Error('the view came down damaged');
      try {
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(file + '.part', bytes);
        await fs.promises.rename(file + '.part', file);
      } catch (err) { console.warn('the Earth: a view came down but could not be kept', err.message); } // (it plays; it comes down again next time)
      return bytes;
    })().finally(() => earthFetches.delete(name)));
  }
  return earthFetches.get(name);
}
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
// One station at a time for each page, the main window and the desktop handheld each with its own: radioTitles has each page's
// read (its AbortController), stopTitles stops it, and a page that goes stops its own. (helpers/radio.cjs is loaded when it's
// first needed: the test copies of the app don't carry helpers/.)
const radioTitles = new Map(), radioWatched = new WeakSet();
function stopTitles(page) { radioTitles.get(page)?.abort(); radioTitles.delete(page); }
async function readTitles(url, ctl, send) {
  const { net } = require('electron');
  const { icyTitles } = require('./helpers/radio.cjs');
  const res = await net.fetch(url, { headers: { 'Icy-MetaData': '1' }, signal: ctl.signal });
  const metaint = Number(res.headers.get('icy-metaint'));
  if (!res.ok || !(metaint > 0)) return ctl.abort(); // (cancelling only the body leaves net.fetch's connection open)
  const read = icyTitles(metaint, send);
  for await (const chunk of res.body) read(chunk);
}

// The player bar's transport (renderer/player.js): play, pause, next and previous on the system's own player, and where
// it is in the song, asked through helpers/player.cjs (loaded when it's first needed, as radio.cjs is). A copy run from
// source with --player-dry-run sends nothing, to any player: it keeps the commands it would have sent (a Spotify link the library
// plays too, in the Mac's AppleScript, or as ['open', address] elsewhere), which player:sent hands over for the checks (null in any
// other copy). Neither does anything in the installed app.
let playerControl = null, playerSent = null;
function player() {
  if (!playerControl) {
    const { createPlayerControl, dryRunner } = require('./helpers/player.cjs');
    if (!app.isPackaged && process.argv.includes('--player-dry-run')) {
      const dry = dryRunner();
      playerSent = dry.sent;
      playerControl = createPlayerControl({ run: dry.run, open: dry.open });
    } else playerControl = createPlayerControl({ open: (uri) => shell.openExternal(uri) }); // (open: a pasted Spotify link, off a Mac)
  }
  return playerControl;
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
// (a test copy with a folder of its own keeps its recordings, drop clips and perfect copies there too, in Videos/Toaster: never
// in yours)
const videosDir = () => (testData ? path.join(path.resolve(testData), 'Videos', 'Toaster') : path.join(app.getPath('videos'), 'Toaster'));

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
let takeKit = null, takeDrop = () => {}; // the perfect take's store and render, once first needed, and its stop (see setUpIpc)
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
  win.on('closed', () => { win = null; widget?.close(); takeDrop('the window closed'); });
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
  // (a perfect copy being made ends with the page that asked for it: a reload, or the page crashing)
  win.webContents.on('did-start-loading', () => takeDrop('the page reloaded'));
  win.webContents.on('render-process-gone', () => takeDrop('the page stopped'));
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
  // (what our own window may ask for: the sound and the screen it hears, fullscreen, and plain text onto the clipboard from a
  // click, which is the misread report's "copy report". Reading the clipboard is not on the list.)
  const allowed = new Set(['media', 'display-capture', 'fullscreen', 'clipboard-sanitized-write']);
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

function sendNowPlaying(reading) {
  lastNowPlaying = reading;
  win?.webContents.send('nowplaying', lastNowPlaying);
  widget?.webContents.send('nowplaying', lastNowPlaying);
}

// On a Mac the helper reads the system's Now Playing list (MediaRemote), which macOS 15.4 closed to apps that aren't Apple's: there it
// answers nothing, ever. So while it does, Spotify and Music are asked directly every two seconds (helpers/player.cjs nowPlaying, by
// AppleScript, and only when one is running), with Spotify's cover fetched once per song from its picture server (helpers/spotify.cjs).
let helperReading = null, askedReading = null, askedCover = { url: null, art: null }, askTimer = null;
async function askPlayers() {
  askTimer = null;
  if (quitting) return;
  try {
    if (!helperReading?.title) {
      const np = await player().nowPlaying();
      if (np && np.cover && np.cover !== askedCover.url) {
        askedCover = { url: np.cover, art: null };
        askedCover.art = await spotifyCover(np.cover).catch(() => null);
      }
      const reading = np ? { title: np.title, artist: np.artist, app: np.app, playing: np.playing, art: np.cover && np.cover === askedCover.url ? askedCover.art : null } : null;
      const was = askedReading;
      askedReading = reading;
      if (reading && JSON.stringify(reading) !== JSON.stringify(was)) sendNowPlaying(reading);
      else if (!reading && was) sendNowPlaying(helperReading || { title: null, artist: null, app: null, playing: false, art: null });
    }
  } catch { /* the next try */ }
  askTimer = setTimeout(askPlayers, 2000);
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
        helperReading = JSON.parse(line);
        if (mac && !helperReading.title && askedReading) continue; // (the system's list says nothing: the players' own answer stands)
        sendNowPlaying(helperReading);
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

// The library (G; renderer/library-panel.js): the folder your music is in, its scan, and the read of one file of it, all in
// helpers/library.cjs (loaded when it's first needed, as the other helpers are: the test copies of the app don't carry helpers/).
// It is main that keeps the folder you chose, so the page never names one; a copy run from source can be told to take a folder as
// the one chosen (--library-folder=<folder>: no dialog to answer, for the checks) and, with a settings folder of its own, never
// starts with your Music folder. Neither does anything in the installed app.
let libraryKept = null;
function library() {
  if (!libraryKept) {
    const { createLibrary, THUMB } = require('./helpers/library.cjs');
    const { dialog, nativeImage } = require('electron');
    const told = app.isPackaged ? '' : switchValue('library-folder') || '';
    libraryKept = createLibrary({
      dir: app.getPath('userData'), music: app.getPath('music'), home: os.homedir(), testCopy: !!testData, hidden, forced: told && path.resolve(told),
      rendererDir: path.join(__dirname, 'renderer'),
      dialog: {
        pick: async (from) => {
          const options = { title: 'Choose the folder your music is in', defaultPath: from, properties: ['openDirectory'] };
          const picked = await (win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options));
          return picked.canceled ? null : picked.filePaths[0] || null;
        },
      },
      // a cover's small picture for the cache (null for one it can't read)
      thumbnail: (bytes) => {
        const image = nativeImage.createFromBuffer(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length));
        if (image.isEmpty()) return null;
        const { width, height } = image.getSize(), k = Math.min(1, THUMB / Math.max(width, height));
        return image.resize({ width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)), quality: 'good' }).toJPEG(72);
      },
    });
  }
  return libraryKept;
}

// Spotify (the library's spotify section, renderer/library-panel.js): the sign-in with the listener's own Client ID and the tokens it
// gives, the lists and the player calls those allow, a pasted link played in the Spotify app, and the covers, all in helpers/spotify.cjs
// (loaded when it's first needed, as the other helpers are: the test copies of the app don't carry helpers/). The tokens stay here, in
// main, kept encrypted by safeStorage in the settings folder (spotify.bin): the page asks for a list or a play and gets rows or words
// back, and is never given a token. A copy run from source can be told to talk to a fake Spotify on this machine instead
// (--spotify-fake=http://127.0.0.1:<port>, helpers/spotify-fake.cjs: for the checks, which never call Spotify); it does nothing in the
// installed app.
let spotifyKept = null;
function spotify() {
  if (!spotifyKept) {
    const { createSpotify, createWebApi, patient } = require('./helpers/spotify.cjs');
    const { net, safeStorage } = require('electron');
    const fakeAt = app.isPackaged ? '' : switchValue('spotify-fake') || '';
    const fake = fakeAt ? require('./helpers/spotify-fake.cjs').fakeSpotify(fakeAt) : null;
    const fetch = patient(fake ? fake.fetch : (url, init) => net.fetch(String(url), init));
    const connection = createSpotify({
      file: path.join(app.getPath('userData'), 'spotify.bin'), fetch,
      safeStorage: fake ? fake.safeStorage : safeStorage,
      openExternal: fake ? fake.openExternal : async (url) => { try { await shell.openExternal(url); } catch { throw new Error('Toaster could not open your browser to sign in to Spotify.'); } },
      ...(fake ? { accounts: fake.base } : {}),
    });
    const web = createWebApi({ accessToken: connection.accessToken, fetch, ...(fake ? { api: fake.base } : {}) });
    spotifyKept = { connection, web, fetch };
  }
  return spotifyKept;
}
// a cover from Spotify's picture server as a data: address (the spotify section's covers and the playing song's, askPlayers)
const spotifyCover = (url) => require('./helpers/spotify.cjs').fetchCover(url, { fetch: spotify().fetch });
const plainObject = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {}); // (what the page sends for a request is checked by the helper, which wants an object)

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
    await updates.install((p) => win?.webContents.send('update:progress', p));
    setTimeout(() => win?.close(), 300);
    return true;
  });
  ipcMain.handle('update:page', () => shell.openExternal(updates.page()));
  // The header's star button: the project's star count, and its page in the browser.
  ipcMain.handle('repo:stars', () => repoStars().catch(() => null));
  ipcMain.handle('repo:open', () => shell.openExternal(REPO_PAGE));
  // The library's empty radio: the few stations that publish their streams' addresses (docs/radio-stations.md), in the browser.
  ipcMain.handle('stations:open', () => shell.openExternal(`${REPO_PAGE}/blob/main/docs/radio-stations.md`));
  // The radio's titles: read from the stream at url and sent to the page that asked, till that page asks
  // again (with null when the radio stops). Another page's read is its own: the handheld's start, which stops
  // what it has, no longer stops the main window's.
  ipcMain.handle('radio:titles', (e, url) => {
    const page = e.sender;
    stopTitles(page);
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    if (!radioWatched.has(page)) { radioWatched.add(page); page.once('destroyed', () => stopTitles(page)); }
    const ctl = new AbortController();
    radioTitles.set(page, ctl);
    readTitles(url, ctl, (song) => { if (!page.isDestroyed()) page.send('radio:title', song); }).catch(() => {});
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
  // The player bar's transport: who is 'music' or 'spotify' on a Mac, 'keys' (the media keys) on Windows, action one of
  // playpause, next, previous. Each answers { ok: true } or { ok: false, why } (and position adds where it is, in seconds).
  ipcMain.handle('player:command', (_e, who, action) => player().command(who, action));
  ipcMain.handle('player:position', (_e, who) => player().position(who));
  ipcMain.handle('player:sent', () => { player(); return playerSent; });
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
  // A bug report's draft, or a misread report's: a GitHub new-issue link, opened in your browser. Only
  // Toaster's own new-issue page goes through here (helpers/issue-url.cjs, loaded when it's first
  // needed: the test copies of the app don't carry helpers/).
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
    const dir = videosDir();
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
    const ours = [videosDir(), path.join(app.getPath('music'), 'Toaster')];
    if (typeof file !== 'string') return;
    const at = path.resolve(file);
    if (ours.some((dir) => { const rel = path.relative(dir, at); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); })) shell.showItemInFolder(at);
  });
  // Drop clips (J): each one arrives whole once it's done, beside the recordings in Videos\Toaster.
  // (its name taken at once, then written in the background: written in one go, the 16-26 MB held
  // up the window and a recording's chunks meanwhile)
  ipcMain.handle('clip:save', async (_e, buf, ext) => {
    const dir = videosDir();
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
  // The perfect take (stream B; helpers/take-*.cjs, loaded when first needed): while M records with the perfect copy on, the
  // page keeps the take: its sound from a run-up before M, what the page was like, what changed. When M stops, the take is
  // drawn again frame by frame in a hidden window (renderer/take-replay.js) and written beside the recording, as
  // "<recording> perfect.mp4". One at a time; quitting, or the page reloading, ends it; a take is dropped once drawn.
  const toPage = (channel, ...args) => { if (win && !win.isDestroyed()) win.webContents.send(channel, ...args); };
  const takes = () => {
    if (!takeKit) {
      const { createTakeStore, checkMeta, checkEnd } = require('./helpers/take-store.cjs');
      const { createTakeRender } = require('./helpers/take-render.cjs');
      takeKit = { store: createTakeStore({ root: path.join(app.getPath('userData'), 'takes') }), render: createTakeRender({ BrowserWindow, ipcMain, pendingFile: path.join(app.getPath('userData'), 'take-render-pending.json'), outputRoot: videosDir() }), checkMeta, checkEnd, stems: new Map(), queue: Promise.resolve(), waiting: new Set() };
      takeKit.store.prune(0); // (takes left by a run that ended mid-take are never drawn: gone)
    }
    return takeKit;
  };
  const fromPage = (e) => e.sender === win?.webContents;
  ipcMain.handle('take:begin', (e, meta) => {
    if (!fromPage(e)) throw new Error('not the page');
    const k = takes(), id = k.store.begin(k.checkMeta(meta));
    k.stems.set(id, recording?.stem || path.join(videosDir(), `toaster ${stamp()}`));
    return id;
  });
  // (the first sound that can't be kept ends the take, said once: a copy with a hole in its sound is no copy, and a full disk
  // would say so every second; take:end then finds no take, so nothing is drawn or said to be saved)
  ipcMain.on('take:sound', (e, id, data) => {
    if (!fromPage(e) || !takeKit?.stems.has(id)) return;
    try { takeKit.store.sound(id, data); } catch (err) {
      takeKit.stems.delete(id);
      try { takeKit.store.end(id); takeKit.store.remove(id); } catch { /* gone */ }
      toPage('take:failed', err.message);
    }
  });
  ipcMain.handle('take:end', (e, id, end) => {
    if (!fromPage(e) || !takeKit?.stems.has(id)) return false;
    const k = takeKit, stem = k.stems.get(id);
    k.stems.delete(id);
    const meta = k.store.end(id);
    let last;
    try { last = k.checkEnd(end, meta); } catch (err) { k.store.remove(id); throw err; }
    if (!last.keep) { k.store.remove(id); return false; }
    // (one at a time, in order: a second recording's copy waits for the first's. A step that fails does not end the line: a take's
    // folder that Windows would not let go of, a scanner holding its sound, rejected the queue, and no copy was made again till
    // Toaster was started again. renderTake says its own failures; a take left behind goes at the next start's prune)
    k.waiting.add(id);
    k.queue = k.queue.then(() => (k.waiting.delete(id) ? renderTake(id, meta, last, stem) : k.store.remove(id))).catch(() => {});
    return true;
  });
  ipcMain.handle('take:cancel', () => stopCopies('stopped'));
  // Ctrl+K's stop: the copies waiting and the one being made. Not a take still recording: M goes on, and its copy is still to come.
  function stopCopies(why) {
    if (!takeKit) return;
    takeKit.waiting.clear();
    takeKit.render.cancel(why);
  }
  // Every take still recording and every copy waiting or being made, ended: a reload, the page crashing, the window closing,
  // quitting.
  function dropTakes(why) {
    if (!takeKit) return;
    for (const id of takeKit.stems.keys()) { try { takeKit.store.end(id); takeKit.store.remove(id); } catch { /* gone */ } }
    takeKit.stems.clear();
    stopCopies(why);
  }
  takeDrop = dropTakes;
  async function renderTake(id, meta, last, stem) {
    const k = takeKit;
    try {
      const take = k.store.read(id), fps = meta.fps, frames = Math.max(1, Math.floor(last.duration * fps));
      const from = Math.round(meta.runup * meta.sampleRate);
      const samples = Math.max(0, Math.min(take.sound.samples - from, Math.round((frames / fps) * meta.sampleRate)));
      const sound = samples ? { sampleRate: meta.sampleRate, channels: 2, samples, read: (i, n) => take.sound.read(from + i, Math.min(n, samples - i)) } : null;
      // (the sound as the page's analysers hear it, one channel, made a stretch at a time so the take's two never sit in memory whole)
      const mono = new Float32Array(take.sound.samples);
      for (let i = 0; i < mono.length; i += 480000) {
        const [l, r] = take.sound.read(i, 480000);
        for (let j = 0; j < l.length; j++) mono[i + j] = (l[j] + r[j]) / 2;
      }
      fs.mkdirSync(path.dirname(stem), { recursive: true });
      const out = freeBase(`${stem} perfect`, ['.mp4', '.mp4.part']) + '.mp4';
      let shown = -1;
      const done = await k.render.render({
        page: { file: path.join(__dirname, 'renderer', 'index.html'), preload: path.join(__dirname, 'helpers', 'take-render-preload.cjs') },
        css: meta.css, dpr: meta.dpr, fps, frames, t0: meta.t0, out, sound, take: { meta, sound: mono, changes: last.changes }, loadMs: 120000,
        frameMs: 150000, // (a look that begins during the take is waited for inside its frame, two minutes at most: take-replay.js)
      }, { onProgress: (f) => { const pct = Math.floor(f * 100); if (pct !== shown) { shown = pct; toPage('take:progress', f); } } });
      toPage('take:done', done.file);
    } catch (err) {
      toPage('take:failed', err?.message || String(err));
    } finally {
      try { k.store.remove(id); } catch { /* already gone */ }
    }
  }
  app.on('before-quit', () => dropTakes('Toaster closed'));
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
  // The library (above): the folder in force, choosing another (the system's dialog), what the last scan kept, a scan (its progress
  // goes to the page that asked), and the bytes of one audio file of that folder, which helpers/library.cjs refuses unless it is
  // inside it and audio. None of them takes a folder from the page: only the path of the one file it wants read.
  ipcMain.handle('library:folder', () => library().folder());
  ipcMain.handle('library:choose', () => library().choose());
  ipcMain.handle('library:cached', () => library().cached());
  ipcMain.handle('library:scan', (e) => library().scan((p) => { if (!e.sender.isDestroyed()) e.sender.send('library:progress', p); }));
  ipcMain.handle('library:read', (_e, rel) => library().read(rel));
  ipcMain.handle('earth:clip', (_e, name) => earthClip(String(name)));
  ipcMain.handle('looks:list', () => looksList());
  ipcMain.handle('looks:open', async () => { await fs.promises.mkdir(looksDir(), { recursive: true }); return shell.openPath(looksDir()); });
  // Spotify (above): whether it is connected (never a token), connecting and disconnecting, the lists and the player, a pasted link played
  // in the Spotify app, and a cover as a data: address. helpers/spotify.cjs checks each request before anything is sent; none asks for a token.
  ipcMain.handle('spotify:status', () => spotify().connection.status());
  ipcMain.handle('spotify:connect', (_e, clientId) => spotify().connection.connect(clientId));
  ipcMain.handle('spotify:disconnect', () => spotify().connection.disconnect());
  ipcMain.handle('spotify:list', (_e, request) => spotify().web.list(plainObject(request)));
  ipcMain.handle('spotify:play', (_e, request) => spotify().web.play(plainObject(request)));
  // (the Spotify app comes to the front when it's told to play: Toaster, if it was in front, takes the front back, now and once more
  // after Spotify's own window has had a moment, so the song plays in the Spotify app behind the visuals; Colin, Nov 4)
  ipcMain.handle('spotify:open', (_e, text) => {
    const win = BrowserWindow.fromWebContents(_e.sender), front = !!win?.isFocused();
    const back = () => { if (front && win && !win.isDestroyed()) { if (process.platform === 'darwin') app.focus({ steal: true }); win.focus(); } };
    return Promise.resolve().then(() => require('./helpers/spotify.cjs').openLink(text, (uri) => player().playLink(uri))).finally(() => { back(); setTimeout(back, 400); });
  });
  ipcMain.handle('spotify:search', (_e, query) => require('./helpers/spotify.cjs').openSearch(query, (url) => shell.openExternal(url)));
  ipcMain.handle('spotify:cover', (_e, url) => require('./helpers/spotify.cjs').fetchCover(url, { fetch: spotify().fetch }));
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
  if (mac) askTimer = setTimeout(askPlayers, 2500);
});

app.on('before-quit', () => { quitting = true; clearTimeout(nowPlayingTimer); clearTimeout(askTimer); });
app.on('window-all-closed', () => {
  quitting = true;
  clearTimeout(nowPlayingTimer);
  nowPlayingProc?.kill();
  for (const page of [...radioTitles.keys()]) stopTitles(page);
  libraryKept?.stop();
  stopFaces();
  endRecording().finally(() => app.quit());
});
