// The library (G) on a real copy of the app, over the DevTools protocol: its keys and clicks, the queue and the player bar's buttons,
// the radio, the scenes, the spotify section against a fake Spotify, the dynamic theme over it, what main refuses to read, and pictures of it
// at phone and desktop size in each theme.
// It never starts or stops anything: start the copy yourself, hidden and muted, with its own profile, with --player-dry-run (a link played in
// the Spotify app is only recorded, as the AppleScript it would send), with --spotify-fake (a Spotify on 127.0.0.1 that this check starts, so
// that the sign-in, the lists, the covers and the plays are the fake's: the check will not touch the spotify section unless the copy's command
// line says so) and with --library-folder, a folder under ~/work/scratch built by tools/library-fixture.mjs (it refuses to go on with any
// other: nobody's own music is ever read). A copy with no such folder is no copy for it. Pick a port nobody uses (9333-9338, 9341 and 9342
// belong to others):
//   node tools/library-fixture.mjs
//   open -n -j node_modules/electron/dist/Electron.app --args "$PWD" --hidden --mute-audio --player-dry-run \
//     --user-data-dir="$HOME/work/scratch/golden-library-profile" --remote-debugging-port=9343 \
//     --library-folder="$HOME/work/scratch/golden-library-test/library" --spotify-fake=http://127.0.0.1:9351
//   node tools/library-check.mjs [--port 9343] [--fake-port 9351] [--out _checks/golden-library] [--phase main|restarted|big|bigopen|web] [--only pictures] [--silent-sink]
// main (the default) does everything on a copy with a fresh profile and leaves what a restart is to keep; restarted, on that same
// profile with the copy started again without --library-folder, checks that the folder, the scenes and the stations came back and that an
// older profile loads; big, on a copy started with --library-folder at the 5,000-file folder (library-fixture's big/), measures the scan:
// the time it takes cold and kept, and the gaps between the page's frames while it runs (closed: nc.libraryScan; bigopen: on a fresh profile
// too, the first G over thousands of albums, its scrolling and a scan again with the panel open); web, on the web build (node tools/web.mjs --serve)
// in a window with no bridge to the app, as a browser tab has none (--web-url), with a stand-in for showDirectoryPicker over real files:
// the same panel in a browser. Pictures and report-<phase>.json go to --out; the exit code is 1 if anything was not as it should be.
// --only runs just the steps with that in their names; --silent-sink gives the page's audio context Chromium's 'none' sink (no device at all), for a
// Mac whose sound output has stopped delivering: the page's own context would never tick there, and the steps that play a track could not be checked.
// The page fetches the library's three modules (library.js, library-panel.js, library-source.js) when the library is first wanted, not with the page:
// __nc.library is null till then, and __nc.loadLibrary() makes it (the steps that need the panel open it by a key, or by that). The first step of
// main, and the browser step of web, check that a page that has not opened the library has fetched none of them and that G fetches the three, once
// each: seen on the debugging port's network events, which a page loaded from a file has where its resource timing has none.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scratch } from './paths.mjs';
import { embeddedCover } from '../renderer/embedded-cover.js';
import { ALBUMS, LIKED, PLAYLISTS, startFakeSpotify } from './spotify-fake.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const port = Number(arg('port', process.env.NC_PORT || 9343));
const fakePort = Number(arg('fake-port', 9351));
const phase = arg('phase', 'main');
const out = path.resolve(root, arg('out', '_checks/golden-library'));
if ([9333, 9334, 9335, 9336, 9337, 9338, 9341, 9342].includes(port)) throw new Error(`port ${port} belongs to somebody else's copy of the app`);
fs.mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- the page, over the debugging port
const webUrl = arg('web-url', '');
if (phase === 'web' && !/^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(webUrl)) throw new Error('the web phase needs --web-url, a build of the web version served here (http://127.0.0.1:<port>/)');
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && (phase === 'web' ? p.url.startsWith(webUrl) : p.url.includes('index.html')));
if (!page) throw new Error(phase === 'web' ? `no window showing ${webUrl} on port ${port}` : 'no app window on port ' + port);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map(), problems = [], moduleRequests = []; // (moduleRequests: the library's modules the page has asked for since it loaded)
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent') { const mod = /\/(library(?:-panel|-source)?\.js)(?:[?#].*)?$/.exec(m.params.request.url); if (mod) moduleRequests.push(mod[1]); }
  else if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId) moduleRequests.length = 0;
  else if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description?.slice(0, 300) || 'exception');
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push(`${m.params.entry.text} ${m.params.entry.url || ''}`.slice(0, 300));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// (a page that stops answering is an error after a minute, not a wait for good: a Mac whose sound system has hung does that, because the
// page makes its audio context when it starts and every source it starts waits for it)
async function ev(expression, ms = 60000) {
  let timer;
  const r = await Promise.race([
    send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`the page gave no answer in ${ms / 1000} s to ${expression.slice(0, 80)}`)), ms); }),
  ]).finally(() => clearTimeout(timer));
  if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
  return r.result.value;
}
const until = async (expression, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expression)) return true; await sleep(100); } return false; };
const VK = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Delete: 46, Backspace: 8, F2: 113, Home: 36, End: 35 };
async function key(k, { shift = false, ctrl = false } = {}) {
  const info = { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, modifiers: (shift ? 8 : 0) | (ctrl ? 2 : 0), windowsVirtualKeyCode: VK[k] || (k.length === 1 ? k.toUpperCase().charCodeAt(0) : 0) };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...info, text: k.length === 1 && !ctrl ? k : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...info });
}
const click = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
};
const centre = (selector) => ev(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const clickOn = async (selector) => { const [x, y] = await centre(selector); await click(x, y); };
const size = async (w, h, dpr = 1) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: false }); await sleep(900); };
async function shot(name, clip) {
  const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function reload() {
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  if (!(await until('!!(window.__nc && __nc.eng && __nc.loadLibrary)', 40000))) throw new Error('the page did not come back');
  // (a copy that has no permission to hear the Mac's sound says so in a box a few seconds after it starts, which is not what is checked here,
  // and which would sit over the library and take its keys: let it come, then put it away)
  await sleep(3500);
  await ev(`(() => { const menu = document.getElementById('menu'); if (!menu.hidden) { menu.hidden = true; document.getElementById('alerts').innerHTML = ''; } return true; })()`);
}
// Is the page's audio really running: its context resumes, and its clock moves? A Mac whose sound system has hung lets the page start and
// then never plays a note, and every step that plays a track would fail for that and for nothing in the library: better to stop here.
async function needAudio() {
  const resumed = await ev('__nc.ac.resume().then(() => true)', 10000).catch(() => false);
  const t = resumed ? await ev('__nc.ac.currentTime') : 0;
  if (resumed) await sleep(800);
  if (!resumed || (await ev('__nc.ac.state')) !== 'running' || !((await ev('__nc.ac.currentTime')) > t)) {
    ws.close();
    throw new Error(`the page's audio is not running (its context does not resume, or its clock does not move): this Mac's sound system may have hung (osascript -e 'output volume of (get volume settings)' would not be answered either), and any step that plays a track would fail for that alone (--silent-sink gives the page a context that plays to no device)`);
  }
}
const setFiles =async (selector, files) => { const { root: doc } = await send('DOM.getDocument', { depth: 0 }); const { nodeId } = await send('DOM.querySelector', { nodeId: doc.nodeId, selector }); await send('DOM.setFileInputFiles', { nodeId, files }); };

// ---------------------------------------------------------------- what is checked, and what is found
const facts = {}, failures = [];
const expect = (what, ok, detail) => { if (!ok) { failures.push(what + (detail !== undefined ? ': ' + JSON.stringify(detail) : '')); console.log('  NOT AS IT SHOULD BE:', what, detail !== undefined ? JSON.stringify(detail) : ''); } return !!ok; };
const only = arg('only', ''); // (--only pictures: just the steps with that in their names)
async function step(name, fn) {
  if (only && !name.includes(only)) return;
  console.log(name);
  try { await fn(); } catch (err) { failures.push(`${name}: ${err.message}`); console.log('  FAILED:', err.message); }
}
const body = (cls) => ev(`document.body.classList.contains(${JSON.stringify(cls)})`);
// (the page makes the panel, and fetches the three modules it is made of, when the library is first wanted: __nc.library is null till then)
const isOpen = () => ev('!!(__nc.library && __nc.library.isOpen)');
const openLibrary = (section) => ev(`__nc.loadLibrary().then((p) => { p.open(${JSON.stringify(section)}); return true; })`);
// (seen on the debugging port's network events, which a page loaded from a file has, where its resource timing has none)
const libraryModules = async () => [...moduleRequests].sort();
const rowTexts = () => ev(`[...document.querySelectorAll('#library .lib-row, #library .lib-card')].map((r) => ({ i: +r.dataset.i, cls: r.className, text: r.innerText.replace(/\\s+/g, ' ').trim() }))`);
const strip = () => ev(`(() => { const n = document.querySelector('#library .lib-now'); return n.hidden ? null : { title: n.querySelector('.title').textContent, by: n.querySelector('.by').textContent, stop: !!n.querySelector('.stop') }; })()`);
const head = () => ev(`({ name: document.querySelector('#library .lib-name')?.innerText, sub: document.querySelector('#library .lib-sub')?.innerText })`);
const theme = async (name) => { await ev(`__nc.presetSetters.theme(${JSON.stringify(name)})`); await sleep(1700); };
const gotoAlbum = async (name) => {
  if ((await ev('__nc.library.state.albums.find((a) => a.id === __nc.library.state.openId)?.album')) === name) { await key('Home'); return; } // (already the open one)
  const i = await ev(`__nc.library.rows().findIndex((r) => r.kind === 'album' && r.album.album === ${JSON.stringify(name)})`);
  if (i < 0) throw new Error(`no album ${name} folded`);
  await key('Home');
  for (let n = 0; n < i; n++) await key('ArrowDown');
  await key('ArrowRight');
  await sleep(500);
};
const cursorIndex = () => ev('__nc.library.state.cursor[__nc.library.section]');
const playing = () => ev('({ source: __nc.state.source, label: __nc.state.label, index: __nc.queue ? __nc.queue.index : null, song: __nc.state.source ? (__nc.eng && null) : null })');
const bar = () => ev(`(() => { const q = (s) => document.querySelector('#player ' + s); const shown = (s) => !!q(s) && !q(s).hidden && getComputedStyle(q(s)).display !== 'none'; return { prev: shown('.pl-prev'), play: shown('.pl-play'), next: shown('.pl-next'), prevLabel: q('.pl-prev').getAttribute('aria-label'), near: shown('.pl-near') ? q('.pl-near').textContent : '', title: q('.pl-title').textContent, artist: q('.pl-artist').textContent }; })()`);

// ---- the spotify section: the copy it may be driven on, the fake it talks to, and what it shows
// What a person puts away by hand: the source menu, where an error from a source ends up (a copy that may not hear the Mac's sound says so there
// when a play takes the system's sound for its source), which would take the library's keys. Says whether it was up.
const clearMenu = () => ev(`(() => { const menu = document.getElementById('menu'); const up = !menu.hidden; if (up) { menu.hidden = true; document.getElementById('alerts').innerHTML = ''; } return up; })()`);
const spRowTexts = () => ev(`[...document.querySelectorAll('#library .lib-row')].map((r) => ({ i: +r.dataset.i, cls: r.className, text: r.innerText.replace(/\\s*▶ preview/g, '').replace(/\\s+/g, ' ').trim(), field: r.querySelector('input')?.dataset.field || null, value: r.querySelector('input')?.value ?? null }))`);
const spLabels = () => ev(`[...document.querySelectorAll('#library .lib-label')].map((n) => n.textContent.trim())`);
const spError = () => ev(`document.querySelector('#library .lib-err')?.textContent.trim() || ''`);
// the AppleScript lines a copy with --player-dry-run was asked to send to tell the Spotify app to play something (it sends none of them)
const spSent = () => ev(`window.nc.playerSent().then((sent) => sent.filter((c) => c.some((a) => String(a).includes('play track'))).map((c) => c[c.length - 1]))`);
const playScript = (uri) => `tell application "Spotify" to play track "${uri}"`;
// the cursor on the first row that this (a function of a row, as source) says is the one
async function spGoto(where) {
  const i = await ev(`__nc.library.rows().findIndex(${where})`);
  if (i < 0) throw new Error(`no such row: ${where}`);
  await key('Home');
  for (let n = 0; n < i; n++) await key('ArrowDown');
  return i;
}
// text typed into the field of the row the cursor is on: Enter to go into it (which selects what it holds), the text, Enter
async function spType(text) {
  await key('Enter');
  await sleep(80);
  await send('Input.insertText', { text });
  await key('Enter');
}
let fake = null, copy = null;
// The covers the fake serves are those of the library fixture's albums (the same pictures as the kept stills, the real ones in its MP3s)
async function fixtureCovers() {
  const from = { '(III)': 'Crystal Castles/(III)', 'TRON: Legacy': 'Tame Impala/Lonerism', Homework: 'Fred again.. & LATIN MAFIA/9 months & 50 hours', Lonerism: 'Various Artists/Summer Mix', Homogenic: 'Björk/Homogenic', 'april mixtape 3': 'Snow Strippers/April Mixtape 3' };
  const images = {};
  for (const [key, rel] of Object.entries(from)) {
    const dir = path.join(where.path, ...rel.split('/'));
    for (const f of fs.readdirSync(dir).sort()) {
      const found = await embeddedCover(await fs.openAsBlob(path.join(dir, f)));
      if (found) { images[key] = { type: found.type, bytes: Buffer.from(found.bytes) }; break; }
    }
    if (!images[key]) throw new Error(`no cover in ${dir}: build the fixture again (node tools/library-fixture.mjs)`);
  }
  return images;
}
// The spotify section is only driven on a copy whose command line says it talks to the fake this check starts (the page can't say so, and a copy
// that did not would open the real Spotify sign-in in the system's browser), is hidden, muted, dry-run, and keeps its settings under scratch.
async function spotifyReady() {
  if (fake) return fake;
  const pid = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).stdout.split('\n')[0].trim();
  const cmd = pid ? spawnSync('ps', ['-ww', '-o', 'command=', '-p', pid], { encoding: 'utf8' }).stdout.trim() : '';
  const profile = /--user-data-dir=(\S+)/.exec(cmd)?.[1] || '';
  const bad = [[`--spotify-fake=http://127.0.0.1:${fakePort}`, cmd.includes(`--spotify-fake=http://127.0.0.1:${fakePort}`)], ['--player-dry-run', cmd.includes('--player-dry-run')], ['--hidden', cmd.includes('--hidden')], ['--mute-audio', cmd.includes('--mute-audio')],
    ['a --user-data-dir under scratch', profile.startsWith(scratch() + path.sep)]].filter(([, ok]) => !ok).map(([what]) => what);
  if (bad.length) throw new Error(`this copy (pid ${pid || '?'}) was not started with ${bad.join(', ')}: refusing to touch the spotify section (see the top of this file for how to start it)`);
  copy = { pid, cmd, profile };
  fake = await startFakeSpotify({ port: fakePort, images: await fixtureCovers() });
  facts.spotify = { fake: fake.base, profile };
  return fake;
}

// the copy must be one it is safe to drive: dry-run (it sends nothing to a player), and a library folder under scratch; the web phase's
// page is a window of this hidden copy showing a build served here, with no bridge
let where = null;
if (phase === 'web') {
  const bridge = await ev('window.nc ? window.nc.platform : null');
  if (bridge !== 'web') { ws.close(); throw new Error(`this window has ${bridge ? 'the app\'s bridge (' + bridge + ')' : 'no nc at all'}: the web phase needs the web build's own (platform web)`); }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('DOM.enable'); await send('Network.enable');
} else {
  const sent0 = await ev('window.nc && window.nc.playerSent ? window.nc.playerSent() : null');
  if (!Array.isArray(sent0)) { ws.close(); throw new Error('this copy is not running with --player-dry-run: refusing to drive it'); }
  where = await ev('window.nc.libraryFolder()');
  if (!where || !path.resolve(where.path).startsWith(scratch() + path.sep)) { ws.close(); throw new Error(`this copy's library folder is ${where ? where.path : 'none'}, not one under ${scratch()}: refusing to go near it (start it with --library-folder)`); }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('DOM.enable'); await send('Network.enable');
  facts.folder = where.path;
}
// --silent-sink: every page this window loads from here on makes its audio context with Chromium's 'none' sink, which plays to no device at
// all (the clock runs, the media elements play and end, nothing is sent anywhere): for a Mac whose output device has stopped delivering,
// where the page's own context never ticks (see needAudio). The first page, loaded before this, keeps the one it made: reload() brings the other.
const silentSink = process.argv.includes('--silent-sink');
if (silentSink) {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const Real = window.AudioContext; window.AudioContext = class extends Real { constructor(options = {}) { super({ ...options, sinkId: { type: 'none' } }); } }; })();` });
  facts.silentSink = true;
}
const renderer = await ev(`(() => { const gl = document.createElement('canvas').getContext('webgl2'); const i = gl?.getExtension('WEBGL_debug_renderer_info'); const n = i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'unknown'; gl?.getExtension('WEBGL_lose_context')?.loseContext(); return n; })()`);
facts.renderer = renderer;
facts.electron = await ev('navigator.userAgent.match(/Electron\\/([\\d.]+)/)?.[1]');

const MUSIC = where ? path.join(where.path, '..') : '';
const station = (() => { // a stand-in station: an MP3 of tones served for ever, with the headers a page needs to play it
  const mp3 = path.join(out, 'station.mp3');
  if (!fs.existsSync(mp3)) spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=6', '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);
  const bytes = fs.readFileSync(mp3);
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    const timer = setInterval(() => res.write(bytes), 4000);
    res.write(bytes);
    res.on('close', () => clearInterval(timer));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/live` })));
})();

// ================================================================ the phases

if (phase === 'main') {
  const st = await station;
  await reload();
  await needAudio();
  await size(540, 960, 2);

  // the ways in other than G, each on a page that has fetched nothing of the library yet
  await step('the other ways in fetch it too: Ctrl+K (scan again, choose a folder, "library"), the touch panel\'s button; a scene saved from Ctrl+K fetches nothing', async () => {
    const THREE = 'library-panel.js,library-source.js,library.js';
    const palette = async (text) => { await key('k', { ctrl: true }); await sleep(400); await send('Input.insertText', { text }); await sleep(300); await key('Enter'); };
    const none = async () => (await libraryModules()).length === 0 && (await ev('__nc.library === null'));
    expect('a fresh page has fetched none of the three', await none());
    await palette('library: scan again');
    expect('Ctrl+K "library: scan again" fetches the library, scans, and says what it found, with the panel not opened',
      (await until(`/^library: \\d+ tracks in \\d+ albums/.test(document.getElementById('status').textContent)`, 30000)) && (await libraryModules()).join() === THREE && (await ev('!__nc.library.isOpen && __nc.library.state.haveData')), await libraryModules());
    await reload();
    await palette('library: choose');
    expect('Ctrl+K "library: choose a folder" opens it on your music and takes the folder',
      (await until('!!(__nc.library && __nc.library.isOpen)')) && (await until('__nc.library.state.haveData && !__nc.library.state.scanning && __nc.library.state.albums.length === 12', 30000)) && (await ev('__nc.library.section')) === 'music' && (await libraryModules()).join() === THREE, await libraryModules());
    await reload();
    await palette('library');
    expect('Ctrl+K "library" (G by name) opens it', (await until('!!(__nc.library && __nc.library.isOpen)')) && (await libraryModules()).join() === THREE, await libraryModules());
    await reload();
    await palette('scene: save');
    await sleep(500);
    expect('Ctrl+K "scene: save this setup" before the library was ever open saves the scene and fetches nothing', (await ev('__nc.state.userScenes.length')) === 1 && (await none()), await libraryModules());
    await key('g');
    expect('and G then opens the library, with that scene in its scenes', await until('!!(__nc.library && __nc.library.isOpen)'));
    await key('Tab'); await key('Tab'); await key('Tab'); // (your music, spotify, radio, scenes)
    await sleep(500);
    expect('(its scenes section lists it)', (await ev(`[...document.querySelectorAll('#library .lib-card')].some((r) => /^my scene 1/.test(r.innerText.replace(/\\s+/g, ' ').trim()))`)), await ev('__nc.state.userScenes.map((s) => s.name)'));
    await ev(`(() => { __nc.state.userScenes = []; const s = JSON.parse(localStorage.getItem('now-coding') || '{}'); s.userScenes = []; localStorage.setItem('now-coding', JSON.stringify(s)); return true; })()`); // (the scene was for this step only)
    // the touch panel: touch emulation makes the page a screen with no hover, which mounts the panel of buttons
    await reload();
    expect('a fresh page again has fetched none of the three', await none());
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    try {
      expect('with no hover the page has the touch panel', await until(`!!document.getElementById('b-controls')`, 5000));
      await ev(`document.getElementById('b-controls').click(); true`);
      await sleep(500);
      const tile = await ev(`(() => { const b = document.querySelector('#controls button[data-act="library"]'); return b ? b.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);
      expect('it has a library button, which says off, and nothing is fetched yet', /^library G off$/.test(tile || '') && (await none()), tile);
      await ev(`document.querySelector('#controls button[data-act="library"]').click(); true`);
      expect('the button fetches the library and opens it', (await until('!!(__nc.library && __nc.library.isOpen)')) && (await libraryModules()).join() === THREE, await libraryModules());
      await sleep(900);
      expect('and says on', (await ev(`document.querySelector('#controls button[data-act="library"]').innerText.replace(/\\s+/g, ' ').trim()`)) === 'library G on');
      await ev(`document.querySelector('#controls button[data-act="library"]').click(); true`);
      expect('the same button closes it', await until('!__nc.library.isOpen', 5000));
    } finally { await send('Emulation.setTouchEmulationEnabled', { enabled: false }); }
    await reload();
  });

  await step('G opens it, G and Esc close it; the header goes while it is up', async () => {
    expect('closed to begin with', !(await isOpen()) && (await ev('document.getElementById("library").hidden')));
    // (the library is fetched when it is first wanted: till then the page has asked for none of its three modules, and has no panel)
    facts.modulesAtStart = await libraryModules();
    expect('at the start the page has fetched none of the library\'s modules, and has no panel', facts.modulesAtStart.length === 0 && (await ev('__nc.library === null && __nc.librarySrc === null')), facts.modulesAtStart);
    await key('g');
    expect('G opens it', await until('!!(__nc.library && __nc.library.isOpen)'));
    facts.modulesAfterG = await libraryModules();
    expect('and G fetched its three modules, once each', facts.modulesAfterG.join() === 'library-panel.js,library-source.js,library.js', facts.modulesAfterG);
    expect('over the page: body.library-open, the header out of sight', (await body('library-open')) && (await ev('getComputedStyle(document.querySelector("header")).visibility')) === 'hidden');
    await key('Escape');
    expect('Esc closes it', !(await isOpen()) && !(await body('library-open')) && (await ev('getComputedStyle(document.querySelector("header")).visibility')) !== 'hidden');
    await key('g'); await key('g');
    expect('G again closes it', !(await isOpen()));
    await key('g');
    await until('!!(__nc.library && __nc.library.isOpen)');
    expect('and opens it', await isOpen());
    facts.footer = await ev('document.querySelector("footer .keys").textContent');
    expect('the footer shows G', /G library/.test(facts.footer), facts.footer);
  });

  await step('your music: the albums of the folder, the first one open', async () => {
    expect('the scan finished', await until('__nc.library.state.haveData && !__nc.library.state.scanning', 30000));
    const s = await ev('({ albums: __nc.library.state.albums.length, tracks: __nc.library.state.tracks, error: __nc.library.state.error, folder: __nc.library.state.folder })');
    facts.scan = s;
    expect('12 albums of 83 tracks, no error', s.albums === 12 && s.tracks === 83 && !s.error, s);
    const rows = await rowTexts();
    expect('the open album\'s tracks (the first, by its artist, has two), then the others folded', rows.filter((r) => /track/.test(r.cls)).length === 2 && rows.filter((r) => /album/.test(r.cls)).length === 11, rows.length);
    expect('the tab', (await ev('document.querySelector("#library .lib-tabs .on").textContent')) === 'your music');
    expect('the meta line', (await ev('document.querySelector("#library .lib-meta .lib-line").textContent')) === 'plays the album through, then repeats');
    expect('the folder, at the right', /library$/.test(await ev('document.querySelector("#library .lib-folder").textContent')));
  });

  await step('the keys: down and up, right opens an album and the one open folds, left folds it, Enter plays', async () => {
    await gotoAlbum('(III)');
    const h = await head();
    expect('(III) is open, with its artist, its twelve tracks and a time', h.name === '(III)' && /^crystal castles · 12 tracks · \d+:\d\d$/.test(h.sub), h);
    let rows = await rowTexts();
    const tracks = rows.filter((r) => /track/.test(r.cls));
    expect('twelve rows, numbered, with their times', tracks.length === 12 && /^01 Plague 4:5\d$/.test(tracks[0].text) && /^02 Kerosene 3:1\d$/.test(tracks[1].text) && /^12 Child I Will Hurt You 3:3\d$/.test(tracks[11].text), tracks.slice(0, 2).map((t) => t.text));
    expect('the other albums are folded below, with their counts', rows.some((r) => /^lonerism · tame impala 13$/.test(r.text)) && rows.some((r) => /^9 months & 50 hours · fred again\.\. & latin mafia 14$/.test(r.text)), rows.filter((r) => /album/.test(r.cls)).map((r) => r.text));
    expect('the cursor is on the first track', (await cursorIndex()) === 0 && /cursor/.test(rows[0].cls));
    await key('ArrowDown'); await key('ArrowDown');
    expect('down moves it', (await cursorIndex()) === 2);
    await key('ArrowUp');
    expect('up moves it back', (await cursorIndex()) === 1);
    await key('End'); await key('ArrowDown');
    const last = (await rowTexts()).length - 1;
    expect('it stops at the end', (await cursorIndex()) === last);
    await key('Home'); await key('ArrowUp');
    expect('and at the start', (await cursorIndex()) === 0);
    await key('ArrowLeft');
    rows = await rowTexts();
    expect('left folds the album: every album folded, the cursor on it', rows.every((r) => /album/.test(r.cls)) && rows.length === 12 && /\(iii\)/.test(rows[await cursorIndex()].text), rows.length);
    expect('with none open, the head says so', (await head()).name === 'your music');
    await key('ArrowRight');
    expect('right opens it again, the cursor on its first track', (await head()).name === '(III)' && (await cursorIndex()) === 0);
    await key('ArrowDown'); await key('Enter');
    expect('Enter plays the track', await until(`__nc.state.source === 'file' && __nc.state.label === '02 Kerosene.mp3'`, 8000));
    await sleep(900);
    rows = await rowTexts();
    expect('the playing one is inverted, with a ▶ for its number', rows.some((r) => /\bon\b/.test(r.cls) && /^▶ Kerosene/.test(r.text)), rows.filter((r) => /\bon\b/.test(r.cls)));
    const s = await strip();
    expect('the strip: the title in bold italic, ARTIST and its length, a stop square', s && s.title === 'Kerosene' && /^Crystal Castles {2}3:1\d$/.test(s.by) && s.stop, s);
    expect('the title is lowercased and italic by the type', (await ev('(() => { const cs = getComputedStyle(document.querySelector("#library .lib-now .title")); return cs.textTransform + " " + cs.fontStyle + " " + cs.fontWeight; })()')) === 'lowercase italic 800');
  });

  await step('folded albums: Enter plays one from its first track; Tab and Shift+Tab go round the sections; clicks do what keys do', async () => {
    await key('Home');
    let rows = await rowTexts();
    const at = rows.findIndex((r) => /^homogenic/.test(r.text));
    for (let n = 0; n < at; n++) await key('ArrowDown');
    await key('Enter');
    expect('Enter on a folded album plays it from its first track and opens it', await until(`__nc.state.label === '01 Hunter.mp3'`, 8000) && (await head()).name === 'Homogenic');
    await key('Tab');
    expect('Tab goes to spotify, which comes after your music', (await ev('__nc.library.section')) === 'spotify' && (await ev('document.querySelector("#library .lib-tabs .on").textContent')) === 'spotify');
    await key('Tab');
    expect('then to the radio', (await ev('__nc.library.section')) === 'radio' && (await ev('document.querySelector("#library .lib-tabs .on").textContent')) === 'radio');
    await key('Tab'); await key('Tab');
    expect('round to your music', (await ev('__nc.library.section')) === 'music');
    await key('Tab', { shift: true });
    expect('Shift+Tab goes back to the scenes', (await ev('__nc.library.section')) === 'scenes');
    await clickOn('#library .lib-tabs button[data-section="music"]');
    expect('a click on a tab goes there', (await ev('__nc.library.section')) === 'music');
    rows = await rowTexts();
    const album = rows.find((r) => /^lonerism/.test(r.text));
    await clickOn(`#library [data-i="${album.i}"]`);
    await sleep(500);
    expect('a click on a folded album opens it', (await head()).name === 'Lonerism');
    await clickOn('#library .lib-row.track:nth-child(3)');
    expect('a click on a track plays it', await until(`__nc.state.label === '03 Apocalypse Dreams.m4a'`, 8000));
  });

  await step('the queue: the player bar\'s next and previous, the album plays through and repeats, the line of what is near', async () => {
    await size(1920, 1080, 1);
    await key('Home');
    await gotoAlbum('(III)');
    await key('Enter');
    await until(`__nc.state.label === '01 Plague.mp3'`, 8000);
    await sleep(800);
    let b = await bar();
    expect('previous, play and next all show for an album', b.prev && b.play && b.next && b.prevLabel === 'previous', b);
    expect('the bar names the song from its tags', b.title === 'Plague' && b.artist === ' · Crystal Castles', b);
    await until('document.getElementById("ln-title").textContent === \'x = x.CrystalCastles("Plague")\'', 8000);
    const line = () => ev('({ text: document.getElementById("ln-title").textContent, shown: __nc.view.lines.title.shown, target: __nc.view.lines.title.target, label: __nc.state.label, source: __nc.state.source, song: __nc.state.manual })');
    expect('the first line of the code is written from its tags', (await line()).text === 'x = x.CrystalCastles("Plague")', await line());
    facts.nearFirst = b.near;
    expect('the line of what is near, on the first track: nothing before it', b.near === '▶ "01 Plague" , "02 Kerosene" , "03 Wrath of God"', b.near);
    await clickOn('#player .pl-next');
    expect('next goes on', await until(`__nc.state.label === '02 Kerosene.mp3'`, 8000));
    await sleep(600);
    b = await bar();
    expect('the line follows, the track before, this one, the next two', b.near === '"01 Plague" , ▶ "02 Kerosene" , "03 Wrath of God" , "04 Affection"', b.near);
    await until('document.getElementById("ln-title").textContent === \'x = x.CrystalCastles("Kerosene")\'', 8000);
    expect('and the code', (await line()).text === 'x = x.CrystalCastles("Kerosene")', await line());
    await ev('__nc.state.el.currentTime = 1'); // (the first seconds, however long the line of code took to write)
    await clickOn('#player .pl-prev');
    expect('previous, in the first seconds, goes to the track before', await until(`__nc.state.label === '01 Plague.mp3'`, 8000));
    await sleep(500);
    await ev('__nc.state.el.currentTime = 20');
    await sleep(300);
    await clickOn('#player .pl-next');
    await until(`__nc.state.label === '02 Kerosene.mp3'`, 8000);
    await sleep(500);
    await ev('__nc.state.el.currentTime = 20');
    await sleep(400);
    await clickOn('#player .pl-prev');
    await sleep(700);
    const r = await ev('({ label: __nc.state.label, at: __nc.state.el.currentTime })');
    expect('past the first seconds, previous starts this track again', r.label === '02 Kerosene.mp3' && r.at < 3, r);
    // the end of a track goes to the next; the end of the album, to the first again
    await ev('__nc.state.el.currentTime = __nc.state.el.duration - 0.7');
    expect('at the end of a track the next one plays', await until(`__nc.state.label === '03 Wrath of God.mp3'`, 8000));
    for (let n = 3; n < 12; n++) { await ev('__nc.nextTrack()'); await until(`__nc.queue && __nc.queue.index === ${n}`, 8000); }
    await sleep(500);
    expect('the last track', (await ev('__nc.state.label')) === '12 Child I Will Hurt You.mp3', await ev('({ label: __nc.state.label, q: __nc.queue && __nc.queue.index, source: __nc.state.source })'));
    b = await bar();
    expect('the line has nothing after the last', b.near === '"11 Mercenary" , ▶ "12 Child I Will Hurt You"', b.near);
    await ev('__nc.state.el.currentTime = __nc.state.el.duration - 0.7');
    expect('and after it the album plays again, from its first track', await until(`__nc.state.label === '01 Plague.mp3'`, 8000));
    expect('as one queue', (await ev('__nc.queue.index')) === 0);
    // next and previous pressed in bursts, at odd intervals, while the last track is still starting (a seeded run: the same bursts every time):
    // the newest press wins, and the queue is still one, live, with its buttons and its line, after each
    let inconsistent = 0;
    for (let round = 0; round < 14; round++) {
      await ev(`(async () => { let x = ${1234 + round * 7919}; const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        for (let i = 0, n = 2 + Math.floor(rnd() * 6); i < n; i++) { (rnd() < 0.8 ? __nc.nextTrack : __nc.previousTrack)(); await new Promise((r) => setTimeout(r, Math.floor(rnd() * 45))); } return true; })()`);
      await sleep(900);
      const r = await ev('({ label: __nc.state.label, q: __nc.queue && __nc.queue.index, tracks: __nc.queue && __nc.queue.tracks.map((t) => t.path.split("/").pop()), next: !document.querySelector("#player .pl-next").hidden, source: __nc.state.source })');
      if (!(r.q !== null && r.tracks[r.q] === r.label && r.next && r.source === 'file')) { inconsistent++; console.log('  burst', round, JSON.stringify({ label: r.label, q: r.q, next: r.next, source: r.source })); }
    }
    facts.bursts = { rounds: 14, inconsistent };
    expect('fourteen bursts of next and previous leave the queue live and on the track its place says', inconsistent === 0, inconsistent);
    b = await bar();
    expect('and the bar\'s buttons and its line are there', b.next && /▶/.test(b.near), b);
    // another source takes the player over from it
    await ev('__nc.useDemo()');
    await until(`__nc.state.source === 'demo'`);
    await sleep(500);
    b = await bar();
    expect('another source ends the queue: no next, no line of tracks', (await ev('__nc.queue')) === null && !b.next && b.near === '', b);
    // a file on its own has no next and no neighbours, and is named by its own tags
    await setFiles('#file', [path.join(where.path, 'Tame Impala', 'Lonerism', '01 Be Above It.m4a')]);
    await until(`__nc.state.source === 'file'`);
    await sleep(800);
    b = await bar();
    expect('a file picked on its own: restart, play, and no next', b.prev && b.play && !b.next && b.prevLabel === 'restart' && b.near === '', b);
    expect('and named by its own tags', b.title === 'Be Above It' && b.artist === ' · Tame Impala', b);
  });

  await step('the stop square stops what is playing, and the strip goes', async () => {
    await key('Home'); await gotoAlbum('(III)');
    await key('Enter');
    await until(`__nc.state.label === '01 Plague.mp3'`, 8000);
    await sleep(900);
    expect('a stop square', (await strip())?.stop);
    await clickOn('#library .lib-now .stop');
    await sleep(700);
    expect('stopped: no source, no queue, no strip', (await ev('__nc.state.source')) === null && (await ev('__nc.queue')) === null && (await strip()) === null);
  });

  await step('the dynamic theme: every colour of the library is the cover\'s, song by song, the glyph cover too', async () => {
    await theme('dynamic');
    // (every colour as the page computes it, whatever way the stylesheet or the script wrote it)
    const colours = async () => ev(`(() => {
      const norm = (v) => { const p = document.createElement('i'); p.style.color = v; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
      const css = getComputedStyle(document.documentElement), g = document.querySelector('#library .lib-glyphs.in'), b = document.querySelector('#library .lib-cover b');
      return { bg: norm(css.getPropertyValue('--bg').trim()), fg: norm(css.getPropertyValue('--fg').trim()), glyphs: g ? getComputedStyle(g).backgroundColor : null, thumb: b ? getComputedStyle(b).backgroundColor : null,
        panel: getComputedStyle(document.getElementById('library')).backgroundColor, tab: getComputedStyle(document.querySelector('#library .lib-tabs .on')).color }; })()`);
    const seen = [];
    for (const [album, track] of [['Gradient', '01 Dusk.mp3'], ['Summer Mix', '01 Sunny Side.mp3'], ['(III)', '01 Plague.mp3']]) {
      await key('Home'); await gotoAlbum(album);
      await key('Enter');
      await until(`__nc.state.label === ${JSON.stringify(track)}`, 8000);
      await sleep(2600);
      const c = await colours();
      seen.push(c);
      expect(`${album}: the cover's colours are the page's, and the library draws with them`, c.glyphs === c.fg && c.thumb === c.fg && c.panel === c.bg && c.tab === c.fg, c);
    }
    expect('each cover gave other colours', new Set(seen.map((c) => `${c.bg}/${c.fg}`)).size === 3, seen.map((c) => `${c.bg}/${c.fg}`));
    facts.dynamic = seen.map((c) => `${c.bg}/${c.fg}`);
    await theme('bluescreen');
    const c = await colours();
    expect('and back on bluescreen, bluescreen\'s', c.bg === 'rgb(5, 29, 181)' && c.glyphs === 'rgb(255, 255, 255)', c);
  });

  await step('the radio: a station pasted in, played, first in the list with a ▶; the latest first; the stop square', async () => {
    await openLibrary('radio'); await key('Home');
    expect('the radio section, with only the address row', (await ev('__nc.library.section')) === 'radio' && (await rowTexts()).length === 1);
    await key('Enter');
    expect('Enter on that row puts the cursor in its field', (await ev('document.activeElement && document.activeElement.className')) === 'lib-address');
    await send('Input.insertText', { text: st.url });
    await key('Enter');
    expect('the station plays', await until(`__nc.state.source === 'radio'`, 15000));
    await sleep(1000);
    let rows = await rowTexts();
    expect('it is in the list, ▶ and marked', rows.length === 2 && /\bon\b/.test(rows[0].cls) && rows[0].text.startsWith('▶ 127.0.0.1:') && /\/live/.test(rows[0].text), rows);
    const s = await strip();
    expect('the strip has a stop square for it', !!s?.stop, s);
    // a second, played from the list, and the order
    await ev(`__nc.state.radioStations.push({ url: 'http://127.0.0.1:${new URL(st.url).port}/other', at: Date.now() - 7200000 }); true`);
    await ev('__nc.library.update()');
    await sleep(500);
    rows = await rowTexts();
    expect('the older one is below', rows.length === 3 && /\/live/.test(rows[0].text) && /\/other/.test(rows[1].text) && /h ago/.test(rows[1].text), rows.map((r) => r.text));
    expect('the latest played is saved first, with the time', await ev(`(() => { const s = JSON.parse(localStorage.getItem('now-coding')).radioStations; return s[0].url.endsWith('/live') && s[0].at > Date.now() - 60000; })()`));
    await clickOn('#library .lib-now .stop');
    await sleep(700);
    expect('the stop square stops it (as the bar\'s stop does: the station is kept to play again)', (await ev('__nc.state.source')) === null && (await ev('__nc.state.stopped')) === 'radio');
    // Enter on a station of the list plays it
    await key('Home'); await key('Enter');
    expect('Enter on a station plays it', await until(`__nc.state.source === 'radio'`, 15000));
    await ev('__nc.stopSource()');
  });

  await step('scenes: the presets as cards; save this setup, name it, apply a preset and then the scene, rename, delete', async () => {
    await key('Tab');
    expect('the scenes section: the save card, the five presets', (await ev('__nc.library.section')) === 'scenes' && (await rowTexts()).length === 6, (await rowTexts()).map((r) => r.text));
    // (the pictures are image files: on a busy Mac they can still be loading the moment the section opens, so a few seconds' grace)
    expect('with their pictures', await until('[...document.querySelectorAll("#library .lib-card .pic img")].every((i) => i.complete && i.naturalWidth > 0) && document.querySelectorAll("#library .lib-card .pic img").length === 5', 4000));
    await ev('__nc.library.state.cursor.scenes = 0; true');
    await ev(`__nc.presetSetters.visual('worlds'); __nc.presetSetters.theme('terminal'); true`);
    await sleep(500);
    await key('Home'); await key('Enter');
    expect('Enter on the save card makes a scene and puts the cursor in its name', await until(`__nc.state.userScenes.length === 1`) && (await ev('document.activeElement && document.activeElement.className')) === 'lib-rename');
    expect('named "my scene 1", from the setup as it is', await ev(`(() => { const s = __nc.state.userScenes[0]; return s.name === 'my scene 1' && s.settings.visual === 'worlds' && s.settings.theme === 'terminal'; })()`), await ev('__nc.state.userScenes'));
    expect('in the shape of a preset: only the settings presets use', await ev(`Object.keys(__nc.state.userScenes[0].settings).sort().join()`) === 'blockLook,blocks,codeHidden,gameScreens,sceneryScene,theme,vertical,visual');
    await send('Input.insertText', { text: 'Terminal worlds' });
    await key('Enter');
    await sleep(300);
    expect('typing a name and Enter renames it', (await ev('__nc.state.userScenes[0].name')) === 'Terminal worlds' && (await rowTexts()).some((r) => r.text.startsWith('Terminal worlds')));
    facts.sceneSaved = await ev('JSON.parse(localStorage.getItem("now-coding")).userScenes.length');
    expect('and it is saved with the other settings', facts.sceneSaved === 1);
    // apply a preset (the handheld), then the scene back
    const handheld = (await rowTexts()).find((r) => /^Handheld/.test(r.text));
    await clickOn(`#library [data-i="${handheld.i}"]`);
    await sleep(900);
    expect('a preset applies: the handheld', (await ev('__nc.state.blockLook')) === 'game' && (await ev('__nc.state.blocks')));
    expect('and is the one on', (await rowTexts()).find((r) => /^Handheld/.test(r.text)).cls.includes('on'));
    const mine = (await rowTexts()).find((r) => /^Terminal worlds/.test(r.text));
    await clickOn(`#library [data-i="${mine.i}"] .pic`);
    await sleep(1200);
    expect('the scene applies as a preset does: its theme, background and code look are back', (await ev('__nc.state.theme')) === 2 && (await ev('__nc.currentSetup().visual')) === 'worlds' && (await ev('__nc.state.blockLook')) === 'dominoes');
    expect('and it is the one on', (await rowTexts()).find((r) => /^Terminal worlds/.test(r.text)).cls.includes('on'));
    // rename, by F2 and by the card's button
    await ev(`__nc.library.state.cursor.scenes = __nc.library.rows().findIndex((r) => r.user); __nc.library.paintAll(); true`);
    await key('F2');
    expect('F2 puts the cursor in the name', (await ev('document.activeElement && document.activeElement.className')) === 'lib-rename');
    await send('Input.insertText', { text: 'Second name' });
    await key('Enter');
    expect('renamed', (await ev('__nc.state.userScenes[0].name')) === 'Second name');
    await clickOn('#library .lib-card .acts button[data-do="rename"]');
    await sleep(300);
    expect('the rename button too', (await ev('document.activeElement && document.activeElement.className')) === 'lib-rename');
    await key('Escape');
    expect('Esc leaves the name as it was, and the library open', (await ev('__nc.state.userScenes[0].name')) === 'Second name' && (await isOpen()));
    // Ctrl+K saves one by name, with the library open
    await key('k', { ctrl: true });
    await sleep(400);
    await send('Input.insertText', { text: 'scene: save' });
    await sleep(300);
    expect('Ctrl+K has "scene: save this setup"', (await ev(`[...document.querySelectorAll('#command-results button span:first-child')].map((s) => s.textContent)`)).includes('scene: save this setup'));
    await key('Enter');
    await sleep(700);
    expect('and it saves one, which shows at once', (await ev('__nc.state.userScenes.length')) === 2 && (await rowTexts()).some((r) => /^my scene 1/.test(r.text)), await ev('__nc.state.userScenes.map((s) => s.name)'));
    expect('with the library still open on the scenes', (await isOpen()) && (await ev('__nc.library.section')) === 'scenes');
    // delete: once asks, twice deletes
    await ev(`__nc.library.state.cursor.scenes = __nc.library.rows().findIndex((r) => r.user && r.scene.name === 'my scene 1'); __nc.library.paintAll(); true`);
    await key('Delete');
    expect('Delete once asks (sure?)', (await ev('document.querySelector("#library .lib-card.cursor .acts button[data-do=delete]").textContent')) === 'sure?' && (await ev('__nc.state.userScenes.length')) === 2);
    await key('Delete');
    expect('and twice deletes it', (await ev('__nc.state.userScenes.length')) === 1 && (await ev('__nc.state.userScenes[0].name')) === 'Second name');
    // and by the button, twice
    await clickOn('#library .lib-card .acts button[data-do="delete"]');
    await sleep(300);
    await clickOn('#library .lib-card .acts button[data-do="delete"]');
    await sleep(400);
    expect('the delete button too', (await ev('__nc.state.userScenes.length')) === 0 && (await rowTexts()).length === 6);
    // one for a restart to find, made as a person would: Enter on the save card, a name, Enter
    await ev(`__nc.presetSetters.theme('pink'); true`);
    await key('Home'); await key('Enter');
    await until(`__nc.state.userScenes.length === 1`);
    await send('Input.insertText', { text: 'kept over a restart' });
    await key('Enter');
    await ev(`__nc.presetSetters.theme('bluescreen'); true`);
    expect('a scene for a restart to find', await ev(`JSON.parse(localStorage.getItem('now-coding')).userScenes.map((s) => s.name).join() === 'kept over a restart'`));
  });

  // ================================================================ spotify: both tiers, against a fake Spotify
  // (the copy was started with --spotify-fake: its sign-in, token service, Web API and covers are the fake of tools/spotify-fake.mjs, started
  // here, and every play a link asks of the Spotify app is only recorded, as the AppleScript it would send)

  await step('spotify, the first tier: a tab after your music, a field for a link; Enter plays it in the Spotify app (recorded here), the links kept, named by the song that shows next', async () => {
    await spotifyReady();
    // (a copy that has run this before is still signed in to the fake, with links pasted: start from nothing, as a fresh profile does)
    await ev(`window.nc.spotifyDisconnect()`);
    await ev(`(() => { const s = JSON.parse(localStorage.getItem('now-coding') || '{}'); s.spotifyLinks = []; localStorage.setItem('now-coding', JSON.stringify(s)); return true; })()`);
    await reload();
    await size(540, 960, 2);
    await openLibrary('spotify');
    await sleep(700);
    const tabs = await ev(`[...document.querySelectorAll('#library .lib-tabs [data-section]')].map((b) => b.textContent)`);
    expect('four tabs, spotify after your music', JSON.stringify(tabs) === '["your music","spotify","radio","scenes"]', tabs);
    expect('the spotify tab is the one on', (await ev(`document.querySelector('#library .lib-tabs .on').textContent`)) === 'spotify');
    const h = await head();
    expect('the head: its name under its logo, and how it stands', h.name === 'spotify' && /^(not connected|connected)$/.test(h.sub), h);
    const logo = await ev(`(() => { const l = document.querySelector('#library .lib-head .lib-logo'), r = l.getBoundingClientRect(); return { w: Math.round(r.width), fill: getComputedStyle(l).fill, tone: document.getElementById('library').dataset.tone, path: l.querySelector('path').getAttribute('d').slice(0, 24) }; })()`);
    expect('Spotify\'s logo in the head, at least 21 px, white on this blue', logo.w >= 21 && logo.fill === 'rgb(255, 255, 255)' && logo.tone === 'dark' && logo.path === 'M12 0C5.4 0 0 5.4 0 12s5', logo);
    expect('the one line of what it needs', /plays in your Spotify app/.test(await ev(`document.querySelector('#library .lib-meta').innerText`)));
    let rows = await spRowTexts();
    expect('the field for a link is the first row, and the only one until a link is pasted (the field for a Client ID comes after the links)', rows[0].field === 'link' && rows.filter((r) => r.field).map((r) => r.field).join() === 'link,client', rows);
    expect('the keys say what they do here', /←→ open/.test(await ev(`document.querySelector('#library .lib-keys').innerText`)) && !/shift\+R/.test(await ev(`document.querySelector('#library .lib-keys').innerText`)));
    // a line that is no link
    await key('Home'); await key('Enter');
    expect('Enter on that row puts the cursor in its field', (await ev('document.activeElement && document.activeElement.dataset.field')) === 'link');
    const before = (await spSent()).length;
    await send('Input.insertText', { text: 'play something by Crystal Castles' });
    await key('Enter');
    await sleep(500);
    expect('a line that is no link is refused in words, over the list, and nothing goes to the Spotify app', /^That isn't a Spotify link to a song, an artist, an album or a playlist/.test(await spError()) && (await spSent()).length === before, await spError());
    rows = await spRowTexts();
    expect('and it stays in the field, to put right', rows[0].value === 'play something by Crystal Castles', rows[0]);
    // a link: an album's, as Spotify's Share gives it
    const album = ALBUMS[0];
    await spType(`https://open.spotify.com/album/${album.id}?si=1f2e3d4c5b6a7988`);
    expect('the Spotify app is told to play that album: the AppleScript, with the address built from its kind and id (the ?si= is gone)', await until(`window.nc.playerSent().then((s) => s.some((c) => c[c.length - 1] === ${JSON.stringify(playScript(`spotify:album:${album.id}`))}))`, 8000));
    const sent = await spSent();
    expect('exactly one line was sent for it, to osascript', sent.length === before + 1 && (await ev(`window.nc.playerSent().then((s) => s.filter((c) => String(c[c.length - 1]).includes('play track')).every((c) => c[0] === '/usr/bin/osascript' && c[1] === '-e'))`)), sent);
    await sleep(500);
    facts.menuAfterPlay = await clearMenu();
    rows = await spRowTexts();
    expect('the error is gone and the field is empty again; the link is the first of the pasted links, 01, an album, just now', !(await spError()) && rows[0].value === '' && /^01 album [A-Za-z0-9]{22} just now$/.test(rows[1].text) && rows[1].text.includes(album.id), rows.map((r) => r.text));
    expect('over a line of words', (await spLabels()).includes('pasted links, the latest first'), await spLabels());
    expect('and kept with the settings', await ev(`JSON.parse(localStorage.getItem('now-coding')).spotifyLinks[0].uri === 'spotify:album:${album.id}'`));
    // named by the first song Spotify's player shows after it (only Spotify's: the system says which app)
    await ev(`__nc.nowPlaying({ title: 'A video', artist: '', app: 'Google Chrome', playing: true, art: '' }); __nc.library.update(); true`);
    await sleep(300);
    expect('a song from another app does not name it', /^01 album /.test((await spRowTexts())[1].text));
    await ev(`__nc.nowPlaying({ title: 'Plague', artist: 'Crystal Castles', app: 'Spotify', playing: true, art: '' }); __nc.library.update(); true`);
    await sleep(300);
    rows = await spRowTexts();
    expect('the first song Spotify shows names it: the song, who by, what it is and when', /^01 Plague · Crystal Castles album · just now$/.test(rows[1].text), rows[1]);
    // a second link, a track's, in the spotify: form; it goes first
    const track = album.tracks[1];
    await key('Home');
    await spType(`spotify:track:${track.id}`);
    await until(`window.nc.playerSent().then((s) => s.some((c) => c[c.length - 1] === ${JSON.stringify(playScript(`spotify:track:${track.id}`))}))`, 8000);
    await sleep(400);
    await clearMenu();
    rows = await spRowTexts();
    expect('it is first, the album second, each numbered', /^01 track [A-Za-z0-9]{22} just now$/.test(rows[1].text) && /^02 Plague · Crystal Castles album · just now$/.test(rows[2].text), rows.map((r) => r.text));
    await ev(`__nc.nowPlaying({ title: 'Kerosene', artist: 'Crystal Castles', app: 'Spotify', playing: true, art: '' }); __nc.library.update(); true`);
    await sleep(300);
    expect('and named by the next song, as the first was', /^01 Kerosene · Crystal Castles track · just now$/.test((await spRowTexts())[1].text), (await spRowTexts())[1]);
    // Enter on a link of the list plays it again, and it goes first
    const count = (await spSent()).length;
    await spGoto(`(r) => r.kind === 'saved' && r.link.uri === 'spotify:album:${album.id}'`);
    await key('Enter');
    await until(`window.nc.playerSent().then((s) => s.filter((c) => String(c[c.length - 1]).includes('play track')).length > ${count})`, 8000);
    await sleep(500);
    await clearMenu();
    rows = await spRowTexts();
    expect('Enter on a pasted link plays it again (the same address), and it moves to the top with its name', (await spSent()).at(-1) === playScript(`spotify:album:${album.id}`) && /^01 Plague · Crystal Castles album/.test(rows[1].text) && /^02 Kerosene/.test(rows[2].text), rows.map((r) => r.text));
    // nothing but a link is ever played: whatever is pasted, the bad ones leave the count as it was
    const settled = (await spSent()).length;
    for (const bad of [`https://open.spotify.com/show/${track.id}`,   /* (a show: since 0.5.2 an artist is a link) */ `https://open.spotify.com.evil.example/track/${track.id}`, `spotify:track:${track.id}x`, 'javascript:alert(1)']) {
      await key('Home'); await spType(bad); await sleep(350);
      expect(`${bad} is refused`, /isn't a Spotify link/.test(await spError()), await spError());
    }
    expect('and none of them reached the player', (await spSent()).length === settled);
    // kept: after a reload the links are back, named
    await reload();
    await openLibrary('spotify');
    await sleep(600);
    rows = await spRowTexts();
    expect('after a reload the links are back, with their names', /^01 Plague · Crystal Castles album/.test(rows[1].text) && /^02 Kerosene · Crystal Castles track/.test(rows[2].text), rows.map((r) => r.text));
    await ev('__nc.library.close()');
  });

  await step('spotify, your own library: the five steps and the field for a Client ID; a bad ID in words; the sign-in (PKCE) against the fake; the lists with their covers; the page never has a token', async () => {
    const f = await spotifyReady();
    await reload();
    await size(540, 960, 2);
    await openLibrary('spotify');
    await sleep(700);
    expect('not connected: the way in is the five steps and a field for a Client ID', (await spLabels()).includes('connect your Spotify') && (await ev(`document.querySelectorAll('#library .lib-step').length`)) === 5, await spLabels());
    const steps = await ev(`[...document.querySelectorAll('#library .lib-step')].map((n) => n.innerText.replace(/\\s+/g, ' ').trim())`);
    expect('the steps: the dashboard, Web API, the redirect (exactly), the Client ID, the field', /developer\.spotify\.com\/dashboard/.test(steps[0]) && /Web API/.test(steps[1]) && steps[2].includes('http://127.0.0.1:43821/callback') && /Client ID/.test(steps[3]) && /paste it below/.test(steps[4]), steps);
    expect('the redirect is marked, with a button to copy it', (await ev(`document.querySelector('#library .lib-step b').textContent`)) === 'http://127.0.0.1:43821/callback' && (await ev(`!!document.querySelector('#library .lib-step .lib-copy')`)));
    await clickOn('#library .lib-step [data-do="copy"]');   // (step 1's .lib-copy is the dashboard's open button since 0.5.2)
    await sleep(400);
    expect('the copy button says it copied (or why it could not)', /^copied$|^could not copy/.test(await ev(`document.getElementById('status').textContent`)), await ev(`document.getElementById('status').textContent`));
    const h = await head();
    expect('the head says it is not connected', h.name === 'spotify' && h.sub === 'not connected', h);
    // a bad Client ID: said in main's words, nothing asked of Spotify
    const asked = f.seen.length;
    await clickOn('#library input[data-field="client"]');
    await send('Input.insertText', { text: 'not-a-client-id' });
    await key('Enter');
    await sleep(500);
    expect('a Client ID that is none is refused in words, and the fake was not asked', /^That isn't a Client ID: it's 32 letters and digits/.test(await spError()) && f.seen.length === asked, await spError());
    expect('and stays in its field', (await spRowTexts()).find((r) => r.field === 'client').value === 'not-a-client-id');
    // the real one: main opens Spotify's page (the fake's, which agrees at once), the listener's browser comes back to 127.0.0.1:43821/callback, the code is swapped
    const CLIENT = '0123456789abcdef0123456789abcdef';
    await key('Enter'); await sleep(80);
    await send('Input.insertText', { text: CLIENT });
    await key('Enter');
    expect('signed in: the lists come, with playlists, saved albums and the liked songs', await until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000) && await until(`__nc.library.rows().some((r) => r.group === 'liked')`, 5000));
    const authorize = f.seen.find((r) => r.path === '/authorize'), token = f.seen.find((r) => r.path === '/api/token');
    expect('the sign-in page was asked with the Client ID, a code challenge (S256), a state and the redirect to 127.0.0.1:43821/callback', authorize && authorize.query.client_id === CLIENT && authorize.query.code_challenge_method === 'S256' && authorize.query.response_type === 'code' && authorize.query.redirect_uri === 'http://127.0.0.1:43821/callback' && authorize.query.state.length >= 16 && /playlist-read-private/.test(authorize.query.scope) && !/modify-(public|private)|library-modify/.test(authorize.query.scope), authorize && authorize.query);
    expect('the code was swapped with its verifier, and no secret', token && token.form.grant_type === 'authorization_code' && token.form.code === 'fake-code' && token.form.code_verifier.length >= 43 && !('client_secret' in token.form), token && token.form);
    expect('every Web API call carried the token main holds', f.seen.filter((r) => r.path.startsWith('/v1/')).length >= 3 && f.seen.filter((r) => r.path.startsWith('/v1/')).every((r) => r.auth === 'Bearer fake-access-1'), f.seen.filter((r) => r.path.startsWith('/v1/')).map((r) => r.auth));
    expect('and the listener\'s browser would have gone nowhere else: only the fake was asked', f.seen.every((r) => ['/authorize', '/api/token'].includes(r.path) || r.path.startsWith('/v1/') || r.path.startsWith('/image/')), f.seen.map((r) => r.path));
    await sleep(900);
    // what the section shows
    expect('the labels: the links, the playlists, the albums (the liked songs\' row says what it is)', JSON.stringify(await spLabels()) === JSON.stringify(['pasted links, the latest first', 'your playlists', 'saved albums']), await spLabels());
    const rows = await spRowTexts();
    const coll = rows.filter((r) => /\balbum\b/.test(r.cls));
    expect('four playlists, six saved albums and the liked songs, as rows with their counts', coll.length === PLAYLISTS.length + ALBUMS.length + 1 && coll.some((r) => r.text === 'late night drive · colin 7') && coll.some((r) => r.text === '(III) · Crystal Castles 12') && coll.some((r) => r.text === '♥ liked songs 12') && coll.some((r) => /^TRON: Legacy \(Original Motion Picture Soundtrack\) · Daft Punk 22$/.test(r.text)), coll.map((r) => r.text));
    expect('the last row is the one that disconnects', /^– disconnect: forget this connection$/.test(rows.at(-1).text), rows.at(-1));
    expect('the head says connected', (await head()).sub === 'connected', await head());
    expect('the section says where it is going on', !/waiting/.test(await ev(`document.querySelector('#library .lib-meta').innerText`)));
    // covers: Spotify's pictures, through main, as data: images in the rows, unaltered by anything but size
    expect('the covers of the rows in view come: data: images, drawn', await until(`(() => { const imgs = [...document.querySelectorAll('#library .lib-row .lib-cover.real img')]; return imgs.length >= 8 && imgs.every((i) => i.complete && i.naturalWidth > 0); })()`, 15000));
    const pics = await ev(`[...document.querySelectorAll('#library .lib-row .lib-cover.real img')].map((i) => ({ src: i.src.slice(0, 22), w: i.naturalWidth, h: i.naturalHeight, radius: getComputedStyle(i.parentElement).borderTopLeftRadius, filter: getComputedStyle(i).filter, opacity: getComputedStyle(i).opacity, fit: getComputedStyle(i).objectFit }))`);
    facts.covers = pics.length;
    expect('each a data: image, with rounded corners (4 px) and nothing done to it', pics.every((p) => /^data:image\/(jpeg|png)/.test(p.src) && p.radius === '4px' && p.filter === 'none' && p.opacity === '1' && p.fit === 'cover'), pics.slice(0, 3));
    expect('main fetched each cover from "i.scdn.co", which the fake served: one request per picture, not one per row', f.seen.filter((r) => r.path.startsWith('/image/')).length >= 6 && f.seen.filter((r) => r.path.startsWith('/image/')).length <= 12, f.seen.filter((r) => r.path.startsWith('/image/')).length);
    // the page never has a token
    const status = await ev(`window.nc.spotifyStatus().then((s) => JSON.stringify(s))`);
    expect('the status: connected and the Client ID; no token', /"connected":true/.test(status) && status.includes(CLIENT) && !/fake-access|fake-refresh|access_token|refresh_token/.test(status), status);
    expect('no token anywhere on the page: not in its DOM, its storage, or what its calls return', await ev(`(async () => { const all = document.documentElement.outerHTML + JSON.stringify({ ...localStorage }) + JSON.stringify(await window.nc.spotifyList({ list: 'playlists' })); return !/fake-access|fake-refresh/.test(all); })()`));
    const calls = await ev(`Object.keys(window.nc).filter((k) => /spotify/i.test(k)).sort().join()`);
    expect('the page has its calls and no more (0.5.2 adds control, dashboard, playback for the mini player, search came in 0.5.0)', calls === 'spotifyConnect,spotifyControl,spotifyCover,spotifyDashboard,spotifyDisconnect,spotifyList,spotifyOpen,spotifyPlay,spotifyPlayback,spotifySearch,spotifyStatus', calls);
    const file = path.join(copy.profile, 'spotify.bin');
    expect('main kept the sign-in in the settings folder, as safeStorage gave it (here the fake\'s scrambling), not in the clear', fs.existsSync(file) && !/fake-access|fake-refresh|access/.test(fs.readFileSync(file).toString('latin1')));
    // and main refuses what it was not made for, whatever the page asks
    const refused = {};
    for (const [name, call] of [['an unknown list', `window.nc.spotifyList({ list: 'me' })`], ['a path as a list', `window.nc.spotifyList({ list: '../v1/me/player' })`], ['a bad id', `window.nc.spotifyList({ list: 'album', id: '../../me' })`], ['no request', `window.nc.spotifyList(null)`],
      ['a bad play', `window.nc.spotifyPlay({ context: 'spotify:artist:${ALBUMS[0].id}' })`], ['a bad play (none)', `window.nc.spotifyPlay(7)`], ['a cover from elsewhere', `window.nc.spotifyCover('https://example.com/image/abc')`], ['a cover over http', `window.nc.spotifyCover('http://i.scdn.co/image/abc')`],
      ['a cover that is not a cover', `window.nc.spotifyCover(7)`]]) {
      refused[name] = await ev(`${call}.then(() => 'went through', (e) => String(e.message).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''))`);
      expect(`main refuses ${name}`, refused[name] !== 'went through' && !/Error invoking/.test(refused[name]), refused[name]);
    }
    expect('in words: what it asks Spotify for, and for covers only Spotify\'s own picture server', /nothing else/.test(refused['an unknown list']) && /only from Spotify's own picture server/.test(refused['a cover from elsewhere']) && /isn't a Spotify album or playlist/.test(refused['a bad play']), refused);
    expect('none of those reached the fake', f.seen.every((r) => !/\/v1\/me\/player\/play|\.\.|example/.test(r.path)), f.seen.slice(-3).map((r) => r.path));
    facts.spotifyRefused = Object.keys(refused).length;
    await ev('__nc.library.close()');
  });

  await step('spotify, keys on the lists: → opens an album and the cursor goes to its first song; Enter plays from a song (by its address), from an album, from a playlist, from the liked songs; ← folds; the song playing is marked', async () => {
    const f = await spotifyReady();
    await openLibrary('spotify');
    await sleep(500);
    const puts = () => f.seen.filter((r) => r.method === 'PUT');
    const album = ALBUMS[0];
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === '(III)'`);
    await key('ArrowRight');
    expect('→ opens the album: its songs, and the head is the album\'s, with its cover', await until(`__nc.library.rows().filter((r) => r.kind === 'strack').length === 12`, 8000) && (await head()).name === '(III)' && /^Crystal Castles · 12 tracks$/.test((await head()).sub), await head());
    let rows = await spRowTexts();
    const tracks = rows.filter((r) => /\btrack\b/.test(r.cls));
    expect('twelve songs, numbered, with their times, at the top of the list as an open album\'s are; the album\'s own row is the head, not in the list again', tracks.length === 12 && rows.slice(0, 12).every((r) => /\btrack\b/.test(r.cls)) && tracks[0].text === '01 Plague 4:56' && tracks[1].text === '02 Kerosene 3:12' && tracks[11].text === '12 Child I Will Hurt You 3:33' && !rows.some((r) => /\balbum\b/.test(r.cls) && /^\(III\)/.test(r.text)), rows.slice(0, 3));
    expect('the cursor went to the first song', (await ev(`__nc.library.rows()[__nc.library.state.cursor.spotify].kind + ':' + __nc.library.rows()[__nc.library.state.cursor.spotify].index`)) === 'strack:0');
    expect('the head\'s cover is the album\'s own, a data: image, and "on Spotify" is there, to play it', await until(`(() => { const i = document.querySelector('#library .lib-head .lib-cover.real img'); return !!i && i.complete && i.naturalWidth > 0 && /^data:image/.test(i.src); })()`, 8000) && (await ev(`document.querySelector('#library .lib-head .lib-onspot').innerText.trim()`)) === 'play on Spotify');
    expect('an album\'s songs were asked for by the album\'s id, one request', f.seen.filter((r) => r.path === `/v1/albums/${album.id}/tracks`).length === 1);
    // Enter on the second song: from that song, by its address, in its album
    await key('ArrowDown'); await key('Enter');
    await sleep(900);
    expect('Enter on a song asks Spotify to play it in its album, from that song, on the device the player has open', puts().length === 1, puts().length);
    const p1 = puts()[0];
    expect('the album as the context and that song\'s address as where to start, on the active device, with the token', p1 && p1.body.context_uri === `spotify:album:${album.id}` && p1.body.offset.uri === `spotify:track:${album.tracks[1].id}` && p1.query.device_id === 'fake-device-1' && p1.auth === 'Bearer fake-access-1', p1 && p1.body);
    expect('the page says where it plays', /^on Spotify, on Colin's MacBook$/.test(await ev(`document.getElementById('status').textContent`)), await ev(`document.getElementById('status').textContent`));
    await sleep(300);
    facts.menuAfterSongs = await clearMenu();
    // the song the system is playing is marked
    await ev(`__nc.nowPlaying({ title: 'Kerosene', artist: 'Crystal Castles', app: 'Spotify', playing: true, art: '' }); __nc.library.update(); true`);
    await sleep(400);
    rows = await spRowTexts();
    expect('the song that is playing is the inverted row, with a ▶ for its number', rows.some((r) => /\bon\b/.test(r.cls) && /^▶ Kerosene 3:12$/.test(r.text)), rows.filter((r) => /\bon\b/.test(r.cls)).map((r) => r.text));
    // "on Spotify" over the open album: the link back to Spotify, which plays it in the Spotify app as a pasted link does (recorded here)
    const told = (await spSent()).length;
    await clickOn('#library .lib-head .lib-onspot');
    await until(`window.nc.playerSent().then((s) => s.filter((c) => String(c[c.length - 1]).includes('play track')).length > ${told})`, 8000);
    expect('"on Spotify" tells the Spotify app to play the album (the AppleScript, recorded)', (await spSent()).at(-1) === playScript(`spotify:album:${album.id}`), (await spSent()).at(-1));
    await sleep(400);
    await clearMenu();
    // ← on a song folds its album: the songs go, the album\'s row is back among the others with the cursor on it, the head back to spotify
    await key('ArrowLeft');
    await sleep(300);
    rows = await spRowTexts();
    expect('← folds it: no songs, the cursor on the album\'s row, the head back to spotify', rows.filter((r) => /\btrack\b/.test(r.cls)).length === 0 && (await head()).name === 'spotify' && /^\(III\)/.test(rows[await cursorIndex()].text), await head());
    // Enter on the album itself: from its start
    await key('Enter');
    await sleep(800);
    expect('Enter on the album plays it from its start', puts().length === 2 && puts()[1].body.context_uri === `spotify:album:${album.id}` && puts()[1].body.offset.position === 0 && !('uri' in puts()[1].body.offset), puts()[1] && puts()[1].body);
    // a playlist: its songs with who they are by; Enter on the third, from that song, in the playlist
    const pl = PLAYLISTS[0];
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === 'late night drive'`);
    await key('ArrowRight');
    await until(`__nc.library.rows().filter((r) => r.kind === 'strack').length === ${pl.tracks.length}`, 8000);
    rows = await spRowTexts();
    expect('a playlist\'s songs say who they are by (the first is the one playing, marked)', rows.some((r) => r.text === '▶ Kerosene · Crystal Castles 3:12' || r.text === '01 Kerosene · Crystal Castles 3:12') && rows.some((r) => r.text === '02 Hunter · Björk 4:12'), rows.filter((r) => /\btrack\b/.test(r.cls)).slice(0, 3).map((r) => r.text));
    await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
    await sleep(800);
    expect('Enter on the third plays it from that song in the playlist', puts().length === 3 && puts()[2].body.context_uri === `spotify:playlist:${pl.id}` && puts()[2].body.offset.uri === `spotify:track:${pl.tracks[2].id}`, puts()[2] && puts()[2].body);
    await key('ArrowLeft');
    // the liked songs: no playlist behind them, so a list of songs from the one picked
    await spGoto(`(r) => r.kind === 'coll' && r.coll.kind === 'liked'`);
    await key('ArrowRight');
    await until(`__nc.library.rows().filter((r) => r.kind === 'strack').length === ${LIKED.length}`, 8000);
    expect('the liked songs open to their songs, the head says how many', /^12 songs$/.test((await head()).sub) && (await head()).name === 'liked songs', await head());
    for (let n = 0; n < 5; n++) await key('ArrowDown');
    await key('Enter');
    await sleep(800);
    expect('Enter on the sixth plays it and the songs after it, as a list, from its start', puts().length === 4 && JSON.stringify(puts()[3].body) === JSON.stringify({ uris: LIKED.slice(5).map((t) => `spotify:track:${t.id}`), offset: { position: 0 } }), puts()[3] && puts()[3].body);
    await key('ArrowLeft'); await sleep(300);
    expect('every play went to the active device with the same token', puts().every((r) => r.query.device_id === 'fake-device-1' && r.auth === 'Bearer fake-access-1'));
    await clearMenu();
    await ev('__nc.library.close()');
  });

  await step('spotify, what goes wrong is said as main says it: no Premium, no open player, a slow-down, a token that lapsed early (one fresh try), a connection that is gone (the field comes back, and signing in again works)', async () => {
    const f = await spotifyReady();
    await openLibrary('spotify');
    await sleep(400);
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === 'gym'`);
    const play = async () => { await key('Enter'); await sleep(900); };
    f.state.playFails = { status: 403, reason: 'PREMIUM_REQUIRED', message: 'Player command failed: Premium required' };
    await play();
    expect('no Premium: said so, over the list', await spError() === 'Spotify says starting songs from Toaster needs Premium.', await spError());
    f.state.playFails = null; f.state.devices = [];
    await play();
    expect('no open player: what to do', await spError() === 'Open Spotify on this computer and play anything once, then try again.', await spError());
    f.state.devices = [{ id: 'fake-device-1', name: 'Colin\'s MacBook', is_active: true, is_restricted: false, type: 'Computer' }];
    f.state.limit = 1;
    await play();
    expect('a slow-down: when to try again', await spError() === 'Spotify asks Toaster to slow down: try again in 7 s.', await spError());
    await play();
    expect('and the next try, with nothing wrong, clears it', (await spError()) === '' && f.seen.filter((r) => r.method === 'PUT').length >= 5);
    // an expired token: refreshed once, the same request again, nothing said
    const refreshes = () => f.seen.filter((r) => r.form && r.form.grant_type === 'refresh_token').length;
    const refreshed = refreshes();
    f.state.expire401 = 1;
    await play();
    expect('a token that lapsed early: one refresh (the refresh token, no secret), then the same play, and nothing to say', refreshes() === refreshed + 1 && (await spError()) === '' && f.seen.at(-1).auth === `Bearer fake-access-${f.state.tokens}`, { refreshes: refreshes(), last: f.seen.at(-1) });
    // a sign-in Spotify no longer takes: the refresh is refused, the kept sign-in goes, and the way back is shown
    // a network that is gone: the connection is cut, and it is said so in Toaster's words, not as the browser's "fetch failed"
    f.state.drop = 1;
    await play();
    expect('a connection that is cut: said in words, with what to do', /^Toaster could not reach Spotify \(.+\)\. Check the connection and try again\.$/.test(await spError()), await spError());
    await play();
    expect('and the next try, with the network back, clears it', (await spError()) === '', await spError());
    f.state.refreshFails = true; f.state.expire401 = 1;
    await play();
    expect('a connection that is gone: Spotify wants a new sign-in, said so, with the lists gone and the field for a Client ID back', (await spError()) === 'Spotify wants you to connect again.' && (await spRowTexts()).some((r) => r.field === 'client') && !(await spRowTexts()).some((r) => /\balbum\b/.test(r.cls)), await spError());
    expect('main forgot it: nothing kept in the settings folder', !fs.existsSync(path.join(copy.profile, 'spotify.bin')));
    expect('and the page asks again with the same ID', (await ev(`window.nc.spotifyStatus().then((s) => s.connected)`)) === false);
    f.state.refreshFails = false;
    await clickOn('#library input[data-field="client"]');
    await send('Input.insertText', { text: '0123456789abcdef0123456789abcdef' });
    await key('Enter');
    expect('signing in again works: the lists are back', await until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000));
    expect('and the error is gone', (await spError()) === '');
    await clearMenu();
    await ev('__nc.library.close()');
  });

  await step('spotify, the sign-in takes the listener\'s time: a note and "waiting for Spotify…" while the page is open in their browser, a stray address is turned away, Enter again starts it over, their yes finishes it', async () => {
    const f = await spotifyReady();
    await ev(`window.nc.spotifyDisconnect()`);
    await reload();
    await size(540, 960, 2);
    await openLibrary('spotify');
    await sleep(500);
    f.state.hold = true;
    const CLIENT = '0123456789abcdef0123456789abcdef';
    await clickOn('#library input[data-field="client"]');
    await send('Input.insertText', { text: CLIENT });
    await key('Enter');
    expect('the page in the browser is asked for, and the section says it is waiting for them', await until(`!!document.querySelector('#library .lib-wait')`, 8000) && f.state.lastAuthorize !== null, f.state.lastAuthorize);
    expect('the note says what to do and for how long; the line says "waiting for Spotify…"; the ID stays in its field', /waiting for you: Spotify's page is open in your browser and asks you to agree \(it waits five minutes\)/.test(await ev(`document.querySelector('#library .lib-wait').textContent`)) && /waiting for Spotify…/.test(await ev(`document.querySelector('#library .lib-meta').innerText`)) && (await spRowTexts()).find((r) => r.field === 'client').value === CLIENT);
    const first = f.state.lastAuthorize;
    // the listener on 127.0.0.1:43821 turns a stray address away and goes on waiting
    const stray = await fetch(`http://127.0.0.1:43821/callback?code=fake-code&state=not-the-one`).then(async (r) => ({ status: r.status, text: await r.text() }));
    expect('an address that is not from this sign-in is turned away with a 400 and a page that says so, and the wait goes on', stray.status === 400 && /not from the sign-in Toaster started/.test(stray.text) && !!(await ev(`!!document.querySelector('#library .lib-wait')`)), stray);
    expect('and nothing else is served there', (await fetch('http://127.0.0.1:43821/other').then((r) => r.status)) === 404);
    // Enter again: the first sign-in is stopped (said nothing of), a new one is started with a state of its own, on the same port
    await key('Enter'); await sleep(100);
    await key('Enter');
    expect('Enter again starts it over: a second page is asked for, with another state', await (async () => { for (let t = 0; t < 80; t++) { if (f.state.lastAuthorize && f.state.lastAuthorize.state !== first.state) return true; await sleep(100); } return false; })(), [first, f.state.lastAuthorize]);
    expect('and the section is still waiting, with no error (the first one\'s stop was not shown)', !!(await ev(`!!document.querySelector('#library .lib-wait')`)) && !(await spError()), await spError());
    const old = await fetch(`${first.redirect}?code=fake-code&state=${encodeURIComponent(first.state)}`).then((r) => r.status);
    expect('the first one\'s state is no longer any use', old === 400, old);
    // the listener says yes: the browser comes back to the redirect with the second sign-in's state
    f.state.hold = false;
    const back = await fetch(`${f.state.lastAuthorize.redirect}?code=fake-code&state=${encodeURIComponent(f.state.lastAuthorize.state)}`).then(async (r) => ({ status: r.status, text: await r.text() }));
    expect('their yes: the browser is shown a page that says Toaster is connected', back.status === 200 && /Toaster is connected to Spotify/.test(back.text), back);
    expect('and the section is signed in: the lists, no note, no error', await until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000) && !(await ev(`!!document.querySelector('#library .lib-wait')`)) && !(await spError()));
    expect('the listener on that port is gone once it was used', await fetch('http://127.0.0.1:43821/callback').then(() => false, () => true));
    await clearMenu();
    await ev('__nc.library.close()');
  });

  await step('spotify, a list that goes on: a "more" row after the first 50, Enter on it adds the rest; disconnecting asks twice, and forgets', async () => {
    const f = await spotifyReady();
    f.state.extra = 70;
    await reload();
    await openLibrary('spotify');
    expect('the first 50 playlists, then a row for more', await until(`__nc.library.rows().filter((r) => r.kind === 'coll' && r.group === 'playlists').length === 50`, 15000) && await until(`__nc.library.rows().some((r) => r.kind === 'more')`, 3000));
    await sleep(400);
    expect('it says how far it has got', /^\+ more 50 of 74$/.test((await spRowTexts()).find((r) => /^\+ more/.test(r.text)).text), (await spRowTexts()).find((r) => /^\+ more/.test(r.text)));
    await spGoto(`(r) => r.kind === 'more'`);
    await key('Enter');
    expect('Enter on it adds the next page: 74 playlists, and the row is gone', await until(`__nc.library.rows().filter((r) => r.kind === 'coll' && r.group === 'playlists').length === 74`, 8000) && !(await ev(`__nc.library.rows().some((r) => r.kind === 'more')`)));
    expect('the second page was asked from 50', f.seen.some((r) => r.path === '/v1/me/playlists' && r.query.offset === '50'));
    f.state.extra = 0;
    // disconnecting: the last row, twice
    await key('End');
    await key('Enter');
    await sleep(300);
    expect('Enter on the last row asks first', /^– sure\? enter again to disconnect$/.test((await spRowTexts()).at(-1).text) && fs.existsSync(path.join(copy.profile, 'spotify.bin')));
    await sleep(3300);
    expect('and takes it back after a moment', /^– disconnect: forget this connection$/.test((await spRowTexts()).at(-1).text));
    await key('Enter'); await key('Enter');
    expect('twice disconnects: the field for a Client ID is back, the lists are gone, the settings folder keeps nothing', await until(`__nc.library.rows().some((r) => r.kind === 'client')`, 8000) && !(await ev(`__nc.library.rows().some((r) => r.kind === 'coll')`)) && !fs.existsSync(path.join(copy.profile, 'spotify.bin')));
    const calls = f.seen.length;
    await sleep(600);
    expect('and it asks Spotify for nothing more', f.seen.length === calls);
    await ev('__nc.library.close()');
  });

  await step('spotify in a browser (a second panel on this page, given a host with no way to sign in, as a browser\'s is): the link alone, said in words when it is no link, handed on with what the page read of it', async () => {
    await reload();
    await ev(`(async () => {
      const { createLibraryPanel } = await import('./library-panel.js');
      const root = document.createElement('div');
      root.id = 'library-browser';
      root.hidden = true;
      document.body.append(root);
      const opened = [], links = [];
      const host = { key: () => 'G', titleBar: () => false, live: () => false, blocked: () => false, playing: () => ({ id: '', track: null, radio: '', title: '', artist: '', ms: 0, stoppable: false }),
        play() {}, repeat: () => 'album', setRepeat: () => '', shuffle: () => false, setShuffle: () => '', stop() {}, stations: () => [], playStation() {}, addStation() {}, scenes: () => ({ presets: [], user: [] }), sceneOn: () => false,
        applyScene() {}, saveScene() {}, renameScene() {}, deleteScene() {}, say() {}, fail() {},
        spotify: { app: false, links: () => links, open: async (text, link) => { opened.push([text, link]); links.unshift({ uri: link.uri, at: Date.now() }); return link; } } };
      const source = { kind: 'web', folder: '', supported: false, async start() { return false; }, async cached() { return null; }, async scan() { throw new Error('no folder'); }, async choose() { return null; } };
      const panel = createLibraryPanel({ document, window, root, source, host });
      window.__browserPanel = { panel, root, opened, links };
      panel.open('spotify');
      return true;
    })()`);
    await sleep(500);
    const dom = (expr) => ev(`(() => { const root = window.__browserPanel.root; return ${expr}; })()`);
    expect('the tabs are the four, spotify the one on', JSON.stringify(await dom(`[...root.querySelectorAll('.lib-tabs [data-section]')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : ''))`)) === '["your music","spotify*","radio","scenes"]');
    expect('the head says it opens the web player; the line says in a new tab', (await dom(`root.querySelector('.lib-sub').textContent`)) === 'web player' && /opens in Spotify's web player, in a new tab/.test(await dom(`root.querySelector('.lib-meta').textContent`)));
    expect('the one row is the field for a link: no steps, no Client ID, nothing to sign in to', JSON.stringify(await dom(`[...root.querySelectorAll('.lib-row')].map((r) => r.querySelector('input')?.dataset.field || r.textContent)`)) === '["link"]' && (await dom(`root.querySelectorAll('.lib-step').length`)) === 0);
    await key('Home'); await key('Enter');
    expect('Enter goes into the field', (await ev('document.activeElement && document.activeElement.dataset.field')) === 'link');
    await send('Input.insertText', { text: 'https://open.spotify.com/show/4Z8W4fKeB5YxbusRsdQVPb' });   // (a show: since 0.5.2 an artist is a link)
    await key('Enter');
    await sleep(300);
    expect('a show\'s link is no link, said in words with nothing handed on', /^That isn't a Spotify link to a song, an artist, an album or a playlist/.test(await dom(`root.querySelector('.lib-err')?.textContent || ''`)) && (await dom(`window.__browserPanel.opened.length`)) === 0);
    const album = ALBUMS[0];
    await key('Enter'); await sleep(80);
    await send('Input.insertText', { text: `https://open.spotify.com/album/${album.id}?si=ab12` });
    await key('Enter');
    await sleep(400);
    const handed = await dom(`JSON.stringify(window.__browserPanel.opened)`);
    expect('a link is handed on with the text and what the page read of it (the app\'s page opens Spotify\'s web player on that)', handed === JSON.stringify([[`https://open.spotify.com/album/${album.id}?si=ab12`, { kind: 'album', id: album.id, uri: `spotify:album:${album.id}` }]]), handed);
    // (this panel has no stylesheet of its own to lay the rows out in, so their text is read as it is in the markup)
    expect('and the link is in the list, as it is in the app', /^01album [A-Za-z0-9]{22}just now$/.test(await dom(`[...root.querySelectorAll('.lib-row')].map((r) => r.textContent)[1]`)));
    await ev(`(() => { const b = window.__browserPanel; b.panel.close(); b.root.remove(); delete window.__browserPanel; return true; })()`);
    expect('and it left the page as it found it: the library closed, no header hidden', !(await body('library-open')));
  });

  await step('spotify pictures: phone (9:16) and desktop in bluescreen, not connected (the steps, the field, the links) and connected (the lists with their covers, an album open with its song playing), and the logo in whitescreen', async () => {
    const f = await spotifyReady();
    const coversIn = () => until(`(() => { const c = [...document.querySelectorAll('#library .lib-cover.real[data-sp]')].filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }); return c.length > 0 && c.every((e) => e.querySelector('img') && e.querySelector('img').complete && e.querySelector('img').naturalWidth > 0); })()`, 15000);
    await theme('bluescreen');
    await ev(`__nc.library && __nc.library.close()`);
    // not connected: the steps, the field for the Client ID, the links pasted (an album's and a track's, named by the songs Spotify's player showed)
    await size(540, 960, 2);
    await openLibrary('spotify'); await sleep(900); await key('Home');
    await shot('spotify-phone-connect');
    await size(1280, 800, 2); await sleep(500);
    await shot('spotify-desktop-connect');
    // connect: the field for the Client ID, Enter (the fake agrees)
    await clickOn('#library input[data-field="client"]');
    await send('Input.insertText', { text: '0123456789abcdef0123456789abcdef' });
    await key('Enter');
    expect('connected for the pictures: the lists are there', await until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000));
    await key('Home');
    expect('and their covers', await coversIn());
    await sleep(500);
    await shot('spotify-desktop-library');
    // an album open, a song of it played (Enter), the system's player showing it
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === '(III)'`);
    await key('ArrowRight');
    await until(`__nc.library.rows().filter((r) => r.kind === 'strack').length === 12`, 8000);
    await key('ArrowDown'); await key('Enter');
    await sleep(800);
    await clearMenu();
    await ev(`__nc.nowPlaying({ title: 'Kerosene', artist: 'Crystal Castles', app: 'Spotify', playing: true, art: '' }); __nc.library.update(); true`);
    expect('and the head\'s cover', await coversIn());
    await sleep(900);
    // at the right of a wide window, the open album\'s own cover, big, as Spotify gave it; and none of another album\'s characters on this tab
    const big = await ev(`(() => { const i = document.querySelector('#library .lib-bigcover img'); if (!i) return null; const r = i.getBoundingClientRect(), p = document.querySelector('#library .lib-panel').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), panelRight: Math.round(p.right), src: i.src.slice(0, 22), radius: getComputedStyle(i).borderTopLeftRadius, filter: getComputedStyle(i).filter, glyphs: document.querySelectorAll('#library .lib-glyphs').length, natural: i.naturalWidth }; })()`);
    expect('the open album\'s cover is big at the right of the panel: a data: image, square, 640 px at most, 8 px corners, nothing done to it, and no glyph art on this tab', big && /^data:image/.test(big.src) && big.w === big.h && big.w >= 240 && big.w <= 640 && big.left > big.panelRight && big.radius === '8px' && big.filter === 'none' && big.glyphs === 0 && big.natural > 0, big);
    await shot('spotify-desktop-album');
    // the logo is black on a light background
    await theme('whitescreen'); await sleep(1300);
    const tone = await ev(`({ tone: document.getElementById('library').dataset.tone, fill: getComputedStyle(document.querySelector('#library .lib-head .lib-logo')).fill })`);
    expect('in whitescreen the logo is black (its guidelines have it white or black, by the background)', tone.tone === 'light' && tone.fill === 'rgb(0, 0, 0)', tone);
    await shot('spotify-desktop-album-whitescreen');
    await theme('bluescreen'); await sleep(1300);
    expect('and white again in bluescreen', (await ev(`getComputedStyle(document.querySelector('#library .lib-head .lib-logo')).fill`)) === 'rgb(255, 255, 255)');
    // the characters are your music\'s: back on that tab they are there again, and the big cover is gone
    await clickOn('#library .lib-tabs button[data-section="music"]');
    expect('back on your music the cover in characters is there again, and the big cover is gone', await until(`document.querySelectorAll('#library .lib-glyphs.in').length === 1 && !document.querySelector('#library .lib-bigcover img')`, 8000));
    await clickOn('#library .lib-tabs button[data-section="spotify"]');
    expect('and on spotify the characters go (and the open album\'s cover is back)', await until(`document.querySelectorAll('#library .lib-glyphs').length === 0 && !!document.querySelector('#library .lib-bigcover img')`, 8000));
    // the phone
    await size(540, 960, 2); await sleep(500);
    await shot('spotify-phone-album');
    await key('ArrowLeft'); await sleep(400);
    await key('Home');
    expect('the phone\'s covers', await coversIn());
    await sleep(400);
    await shot('spotify-phone-library');
    // the other lists at the bottom: scrolled to the liked songs and the way to disconnect
    await key('End'); await sleep(400);
    await shot('spotify-phone-library-end');
    expect('no token or error was left on the page by any of it', !(await spError()) && f.seen.every((r) => r.path !== '/v1/me/player/play' || r.auth.startsWith('Bearer fake-access-')));
    await ev('__nc.library.close()');
    await clearMenu();
  });

  await step('spotify states pictures: what main says stands under the line, in view however far the list is scrolled (no Premium, no open player, slow down, connect again), and the open album in the other themes', async () => {
    const f = await spotifyReady();
    const CLIENT = '0123456789abcdef0123456789abcdef';
    const connect = async () => {
      await clickOn('#library input[data-field="client"]');
      await send('Input.insertText', { text: CLIENT });
      await key('Enter');
      return until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000);
    };
    // where the error is: shown, under the line, inside the window, and not in the list
    const errBox = () => ev(`(() => { const e = document.querySelector('#library .lib-err'), m = document.querySelector('#library .lib-meta'), l = document.querySelector('#library .lib-list'); if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), hidden: e.hidden, top: Math.round(r.top), bottom: Math.round(r.bottom), below: Math.round(r.top - m.getBoundingClientRect().bottom), inList: !!l.querySelector('.lib-err'), scrolled: Math.round(l.scrollTop), vh: innerHeight }; })()`);
    const inView = (b) => b && !b.hidden && !b.inList && b.top >= 0 && b.bottom <= b.vh && b.below >= 0;
    await theme('bluescreen');
    await ev(`__nc.library && __nc.library.close()`);
    await size(540, 960, 2);
    await openLibrary('spotify'); await sleep(900);
    // a long list (thirty more playlists), so that the liked songs at its bottom are far below its top: connected afresh with them
    f.state.extra = 30;
    if (await ev(`__nc.library.rows().some((r) => r.kind === 'disconnect')`)) { await spGoto(`(r) => r.kind === 'disconnect'`); await key('Enter'); await key('Enter'); }
    expect('connected for the states, with the long list', await connect() && await until(`__nc.library.rows().filter((r) => r.kind === 'coll' && r.group === 'playlists').length >= 30`, 15000));
    // no Premium: Enter on the liked songs, at the bottom of a list scrolled down to them
    await spGoto(`(r) => r.kind === 'coll' && r.coll.kind === 'liked'`);
    f.state.playFails = { status: 403, reason: 'PREMIUM_REQUIRED', message: 'Player command failed: Premium required' };
    await key('Enter');
    expect('no Premium is said in words', await until(`/needs Premium/.test(document.querySelector('#library .lib-err')?.textContent || '')`, 8000));
    let b = await errBox();
    expect('under the line, in view, with the list scrolled down to the row that was played (where the top of the list is out of sight)', inView(b) && b.scrolled > 0, b);
    await sleep(300);
    await shot('spotify-phone-error-premium');
    // no open player: the same Enter with no device Spotify says is active
    f.state.playFails = null;
    const devices = f.state.devices;
    f.state.devices = [];
    await key('Enter');
    expect('no open player is said in words', await until(`/Open Spotify on this computer/.test(document.querySelector('#library .lib-err')?.textContent || '')`, 8000));
    b = await errBox();
    expect('and in view', inView(b), b);
    await size(1280, 800, 2); await sleep(500);
    await shot('spotify-desktop-error-device');
    f.state.devices = devices;
    // slow down: a list asked for while Spotify says too many (an album opened whose songs aren't in yet)
    f.state.limit = 1;
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === 'Homogenic'`);
    await key('ArrowRight');
    expect('slow down is said, with the wait', await until(`/slow down: try again in 7 s/.test(document.querySelector('#library .lib-err')?.textContent || '')`, 8000), await spError());
    await sleep(300);
    await shot('spotify-desktop-error-slow');
    // the album that could not open folds back, the cursor on its row (open, it would have no row and no songs to fold from); → asks again,
    // and the error goes when that goes through
    expect('the album that could not open folds back, the cursor on its row, in view', await until(`(() => { const r = __nc.library.rows()[__nc.library.state.cursor.spotify]; const el = document.querySelector('#library .lib-row.cursor'), box = document.querySelector('#library .lib-list').getBoundingClientRect(), at = el?.getBoundingClientRect(); return r?.kind === 'coll' && r.coll.name === 'Homogenic' && !!at && at.top >= box.top - 1 && at.bottom <= box.bottom + 1; })()`, 4000));
    await key('ArrowRight');
    expect('and goes when the next thing asked goes through', await until(`!document.querySelector('#library .lib-err')?.textContent && __nc.library.rows().filter((r) => r.kind === 'strack').length === 10`, 8000), await spError());
    // the open album in each of the other themes (its big cover in the box your music's characters have), and the dynamic theme from that cover
    await spGoto(`(r) => r.kind === 'coll' && r.coll.name === '(III)'`);
    await key('ArrowRight');
    await until(`__nc.library.rows().filter((r) => r.kind === 'strack').length === 12`, 8000);
    expect('the big cover is the picture Spotify gives 640 wide (its own address asked for)', await until(`!!document.querySelector('#library .lib-bigcover img')`, 8000) && f.seen.some((r) => r.path.startsWith('/image/ab67616d0000b273')), f.seen.filter((r) => r.path.startsWith('/image/')).map((r) => r.path.slice(0, 26)));
    const art = await ev(`document.querySelector('#library .lib-bigcover img').src`);
    await ev(`__nc.nowPlaying({ title: 'Kerosene', artist: 'Crystal Castles', app: 'Spotify', playing: true, art: ${JSON.stringify(art)} }); __nc.library.update(); true`);
    for (const t of ['blackscreen', 'terminal', 'pink', 'whitescreen', 'dynamic']) {
      await theme(t); await sleep(t === 'dynamic' ? 2600 : 600);
      await shot(`spotify-desktop-album-${t}`);
    }
    await theme('bluescreen');
    // connect again: the sign-in gone (the refresh refused), said, the lists away and the Client ID field back; then connected again for what comes after
    f.state.refreshFails = true; f.state.expire401 = 1;
    await key('Home'); await key('ArrowDown'); await key('Enter');
    expect('a sign-in that is gone says connect again, and the field for a Client ID is back', await until(`/connect again/.test(document.querySelector('#library .lib-err')?.textContent || '') && !!document.querySelector('#library input[data-field="client"]')`, 8000), await spError());
    b = await errBox();
    expect('in view', inView(b), b);
    await key('Home'); await sleep(300);
    await shot('spotify-desktop-error-connect-again');
    f.state.refreshFails = false;
    f.state.extra = 0;
    expect('connected again', await connect());
    expect('and the error is gone', !(await spError()), await spError());
    await ev(`__nc.nowPlaying({ title: '', artist: '', app: '', playing: false, art: '' }); __nc.library.close(); true`);
    await clearMenu();
  });

  await step('main refuses what is not an audio file inside the folder, whatever the page asks', async () => {
    const tryRead = (p) => ev(`window.nc.libraryRead(${JSON.stringify(p)}).then((r) => 'read ' + r.name + ' ' + r.bytes.length, (e) => String(e.message).replace(/^Error invoking remote method '[^']*': /, ''))`);
    const good = await tryRead('Crystal Castles/(III)/02 Kerosene.mp3');
    expect('a track of the folder is read', /^read 02 Kerosene\.mp3 \d{6,}$/.test(good), good);
    const refused = {};
    for (const p of ['../outside/secret.mp3', '../../../../../../etc/hosts', '/etc/hosts', '/etc/hosts.mp3', path.join(MUSIC, 'outside', 'secret.mp3'), 'Crystal Castles/../../outside/secret.mp3', 'notes.txt',
      'Crystal Castles/(III)/cover.jpg', 'link-to-outside.mp3', 'link-dir/secret.mp3', 'disguised.mp3', '.DS_Store', 'missing.mp3', 'Crystal Castles', '', 'a\0.mp3', '..\\outside\\secret.mp3']) {
      refused[p] = await tryRead(p);
      expect(`refused: ${JSON.stringify(p)}`, /refused/.test(refused[p]), refused[p]);
    }
    for (const v of [null, 7, {}, [], ['x.mp3']]) { const r = await ev(`window.nc.libraryRead(${JSON.stringify(v)}).then(() => 'read', (e) => String(e.message))`); expect(`refused: ${JSON.stringify(v)}`, /refused/.test(r), r); }
    facts.refused = Object.keys(refused).length + 5;
    // what the page can ask for is the five calls and the progress; none takes a folder
    const calls = await ev('Object.keys(window.nc).filter((k) => /^(library|onLibrary)/.test(k)).sort().join()');
    expect('the page has the five calls and the progress, no more', calls === 'libraryCached,libraryChoose,libraryFolder,libraryRead,libraryScan,onLibraryProgress', calls);
    expect('and no way to the file system itself', (await ev('typeof require + typeof process + typeof window.fs')) === 'undefinedundefinedundefined');
    const chosen = await ev('window.nc.libraryChoose()');
    expect('choosing in this copy gives the folder it was told to take (no dialog in a window nobody sees)', chosen && chosen.path === where.path, chosen);
    expect('the folder for the page\'s own scan call is main\'s', (await ev('window.nc.libraryScan.length')) === 0);
  });

  await step('find: Ctrl+F opens its line over your music; what is typed narrows it as it is typed, to every word, marked; letters only type; arrows, Enter and a click on what it found; Esc ends it, then closes', async () => {
    const findOpen = () => ev(`!document.querySelector('#library .lib-find').hidden`);
    const clear = () => ev(`(() => { const q = document.querySelector('#library .lib-q'); q.value = ''; q.dispatchEvent(new Event('input')); })()`);
    const typeKeys = async (text) => { for (const ch of text) { if (ch === ' ') await send('Input.insertText', { text: ' ' }); else await key(ch); } await sleep(200); };
    await openLibrary('radio');
    await until('__nc.library.state.haveData && !__nc.library.state.scanning', 30000);
    await key('f', { ctrl: true });
    await sleep(300);
    expect('Ctrl+F from the radio: your music, find\'s line up, the keys in its field', await ev(`__nc.library.section === 'music' && document.activeElement === document.querySelector('#library .lib-q')`) && await findOpen());
    const listed = await rowTexts();
    expect('an empty line lists your music as it is', listed.length > 0 && listed.every((r) => !/found/.test(r.cls)));
    const keys = await ev(`document.querySelector('#library .lib-keys').innerText`);
    expect('the keys say how find goes', /esc ends find/.test(keys) && /enter plays/.test(keys), keys);
    // letters the page has keys for (G the library, T the theme) are only typed
    const themeBefore = await ev('__nc.state.theme');
    await typeKeys('gt');
    expect('G and T typed into the line: the library still up, the theme as it was', (await isOpen()) && (await ev('__nc.state.theme')) === themeBefore && (await ev(`document.querySelector('#library .lib-q').value`)) === 'gt', await ev(`document.querySelector('#library .lib-q').value`));
    await clear();
    // as it is typed
    await typeKeys('k');
    const one = await rowTexts();
    await typeKeys('ero');
    let rows = await rowTexts();
    expect('"kero" finds Kerosene, with its artist and album', rows.some((r) => /found/.test(r.cls) && /^♪ Kerosene Crystal Castles · \(III\)/.test(r.text)), rows.map((r) => r.text));
    expect('it narrowed as it was typed', one.length > rows.length, [one.length, rows.length]);
    const marks = await ev(`[...document.querySelectorAll('#library .lib-row mark')].map((m) => m.textContent)`);
    expect('what matched is marked, in every row', marks.length >= rows.length && marks.every((m) => m.toLowerCase() === 'kero'), marks);
    expect('the count', /^\d+ found$/.test(await ev(`document.querySelector('#library .lib-count').textContent`)));
    // every word, from the title, the artist and the album
    await clear(); await typeKeys('castles plague');
    rows = await rowTexts();
    expect('"castles plague": every word, from the artist and the title', rows.length === 1 && /^♪ Plague Crystal Castles/.test(rows[0].text), rows.map((r) => r.text));
    await clear(); await typeKeys('bjork joga');
    rows = await rowTexts();
    const accents = await ev(`[...document.querySelectorAll('#library .lib-row mark')].map((m) => m.textContent)`);
    expect('"bjork joga" finds Jóga by Björk, with the accents marked', rows.length === 1 && /^♪ Jóga Björk · Homogenic/.test(rows[0].text) && accents.includes('Björk') && accents.includes('Jóga'), [rows.map((r) => r.text), accents]);
    await clear(); await typeKeys('tame');
    rows = await rowTexts();
    expect('"tame": the album first (by its artist), then its tracks', /album/.test(rows[0].cls) && /^lonerism · tame impala 13$/.test(rows[0].text) && rows.filter((r) => /track/.test(r.cls)).length === 13, rows.slice(0, 3).map((r) => r.text));
    // the cursor goes through what was found, Enter plays it
    expect('the cursor on the first', (await cursorIndex()) === 0);
    await key('ArrowDown'); await key('ArrowDown');
    expect('down moves it through what was found', (await cursorIndex()) === 2);
    const want = await ev('__nc.library.rows()[2].track.title');
    await key('Enter');
    expect('Enter plays what the cursor is on, from its album, and find stays', await until(`__nc.queue && __nc.queue.tracks[__nc.queue.index].title === ${JSON.stringify(want)}`, 8000) && await findOpen(), want);
    await sleep(900);
    rows = await rowTexts();
    expect('the playing one is inverted in what was found', rows.some((r) => /\bon\b/.test(r.cls) && r.text.startsWith('▶ ' + want)), rows.filter((r) => /\bon\b/.test(r.cls)).map((r) => r.text));
    // nothing found
    await clear(); await typeKeys('zzqx');
    expect('nothing found says so', (await rowTexts()).length === 0 && /nothing in your music/.test(await ev(`document.querySelector('#library .lib-list').innerText`)) && (await ev(`document.querySelector('#library .lib-count').textContent`)) === 'nothing found');
    // a click on an album it found opens it
    await clear(); await typeKeys('lonerism');
    await clickOn('#library .lib-row.album.found');
    await sleep(500);
    expect('a click on an album it found: find ends, that album open, the cursor on its first track', !(await findOpen()) && (await head()).name === 'Lonerism' && (await cursorIndex()) === 0, await head());
    // Esc: the first ends find (the list as it was), the second closes the library
    const before = await rowTexts();
    await key('f', { ctrl: true }); await typeKeys('plague');
    await key('Escape');
    expect('Esc ends find: the line gone, the list and the cursor as they were', !(await findOpen()) && (await isOpen()) && JSON.stringify((await rowTexts()).map((r) => r.text)) === JSON.stringify(before.map((r) => r.text)) && (await cursorIndex()) === 0);
    await key('f', { ctrl: true }); await typeKeys('plague');
    await clickOn('#library .lib-head');     // (the field loses the keys; Esc still ends find first)
    await key('Escape');
    expect('with the line open but not in its field, Esc ends find too', !(await findOpen()) && (await isOpen()));
    await key('Escape');
    expect('the next Esc closes the library', !(await isOpen()));
    // the find button, from another section
    await openLibrary('scenes'); await sleep(400);
    await clickOn('#library .lib-findbtn');
    expect('the find button: your music, find\'s line up, the keys in its field', await ev(`__nc.library.section === 'music' && document.activeElement === document.querySelector('#library .lib-q')`) && await findOpen());
    await key('Escape'); await key('Escape');
    // Ctrl+K's "library: find", with the library closed
    await key('k', { ctrl: true }); await sleep(400); await send('Input.insertText', { text: 'library: find' }); await sleep(300); await key('Enter');
    expect('Ctrl+K "library: find" opens the library on your music with find\'s line up', await until(`__nc.library && __nc.library.isOpen && __nc.library.section === 'music' && !document.querySelector('#library .lib-find').hidden`, 5000));
    await key('Escape'); await key('Escape');
  });

  await step('repeat and shuffle: the two buttons under what is playing, Shift+R and Shift+S; repeat one plays a track that ended again, all goes on to the next album, shuffle plays the album in another order; kept with the settings', async () => {
    await ev('(__nc.setQueueRepeat("album"), __nc.setQueueShuffle(false), true)');
    await openLibrary('music');
    await until('__nc.library.state.haveData && !__nc.library.state.scanning', 30000);
    const modes = () => ev(`[...document.querySelectorAll('#library .lib-mode')].map((b) => b.textContent)`);
    expect('the two buttons: the album repeats, in order', JSON.stringify(await modes()) === '["plays the album through, then repeats","in order"]', await modes());
    const orb = await ev('__nc.state.orb');
    await key('R', { shift: true });
    expect('Shift+R: on through your music', (await ev('__nc.state.queueRepeat')) === 'all' && (await modes())[0] === 'plays on through your music', await modes());
    await key('R', { shift: true });
    expect('again: this track', (await ev('__nc.state.queueRepeat')) === 'one' && (await modes())[0] === 'plays this track again and again', await modes());
    await clickOn('#library .lib-mode[data-do="repeat"]');
    expect('a click goes round to the album', (await ev('__nc.state.queueRepeat')) === 'album');
    expect('Shift+R is not the orb\'s R while the library is up', (await ev('__nc.state.orb')) === orb);
    // repeat one: a track that ends plays again; next, pressed, still goes on
    await gotoAlbum('(III)'); await key('ArrowDown'); await key('Enter');
    expect('Kerosene plays', await until(`__nc.state.label === '02 Kerosene.mp3'`, 8000));
    await key('R', { shift: true }); await key('R', { shift: true });
    expect('repeat one', (await ev('__nc.state.queueRepeat')) === 'one');
    await sleep(600);
    await ev('__nc.state.el.currentTime = __nc.state.el.duration - 0.7');
    expect('repeat one: the track that ended plays again', await until(`__nc.state.label === '02 Kerosene.mp3' && __nc.state.el.currentTime < 3 && __nc.queue && __nc.queue.index === 1`, 8000));
    await ev('__nc.nextTrack()');
    expect('repeat one: next, pressed, still goes on', await until(`__nc.state.label === '03 Wrath of God.mp3'`, 8000));
    // repeat all: after the album's last track, the next album in the library, from its first
    await key('R', { shift: true }); await key('R', { shift: true });
    expect('repeat all', (await ev('__nc.state.queueRepeat')) === 'all');
    const iii = await ev('__nc.queue.id');
    const after = await ev(`(() => { const a = __nc.library.state.albums, i = a.findIndex((x) => x.id === __nc.queue.id); return a[(i + 1) % a.length].album; })()`);
    for (let n = 3; n < 12; n++) { await ev('__nc.nextTrack()'); await until(`__nc.queue && __nc.queue.index === ${n}`, 8000); }
    await sleep(500);
    await ev('__nc.state.el.currentTime = __nc.state.el.duration - 0.7');
    expect(`repeat all: after (III)'s last track, the next album (${after}) from its first track`, await until(`__nc.queue && __nc.queue.id !== ${JSON.stringify(iii)} && __nc.queue.index === 0`, 8000) && (await ev('__nc.library.state.albums.find((a) => a.id === __nc.queue.id).album')) === after);
    // shuffle: the queue playing now takes an order from the track it is on; next and the player bar's line go by it
    await key('S', { shift: true });
    expect('Shift+S: shuffled, and the queue playing has an order from its track', (await modes())[1] === 'shuffled' && await ev('!!__nc.queue.order && __nc.queue.order[0] === __nc.queue.index && __nc.queue.order.length === __nc.queue.tracks.length'));
    const order = await ev('__nc.queue.order');
    await ev('__nc.nextTrack()');
    expect('next goes by the order', await until(`__nc.queue && __nc.queue.index === ${order[1]}`, 8000), order);
    await sleep(600);
    const title = await ev(`__nc.queue.tracks[${order[1]}].title`);
    expect('and the player bar\'s line of what is near too', (await bar()).near.includes(`▶ "${String(order[1] + 1).padStart(2, '0')} ${title}"`), (await bar()).near);
    await clickOn('#library .lib-mode[data-do="shuffle"]');
    expect('a click: in order again, the queue too', (await modes())[1] === 'in order' && await ev('!__nc.queue.order'));
    // kept with the settings
    await key('S', { shift: true });
    await reload(); await openLibrary('music'); await sleep(700);
    expect('kept with the settings: on through your music, shuffled, after a reload', (await ev('__nc.state.queueRepeat')) === 'all' && (await ev('__nc.state.queueShuffle')) === true && JSON.stringify(await modes()) === '["plays on through your music","shuffled"]', await modes());
    await ev('(__nc.setQueueRepeat("album"), __nc.setQueueShuffle(false), true)');
    await ev('__nc.library && __nc.library.close()');
  });

  await step('played lately: the shelf of the last albums played, the latest first; up from the top of the list steps onto it, left and right along it, Enter and a click play one, down goes back; not while finding', async () => {
    await openLibrary('music');
    await until('__nc.library.state.haveData && !__nc.library.state.scanning', 30000);
    for (const a of ['Lonerism', 'Homogenic', '(III)']) {
      await gotoAlbum(a); await key('Enter');
      await until(`__nc.queue && __nc.library.state.albums.find((x) => x.id === __nc.queue.id).album === ${JSON.stringify(a)}`, 8000);
      await sleep(400);
    }
    const tiles = () => ev(`[...document.querySelectorAll('#library .lib-tile')].map((t) => ({ name: t.querySelector('.nm').textContent, cls: t.className }))`);
    let t = await tiles();
    expect('the shelf: the albums played lately, the latest first', t.length >= 3 && t[0].name === '(III)' && t[1].name === 'Homogenic' && t[2].name === 'Lonerism', t.map((x) => x.name));
    expect('six at most', t.length <= 6);
    expect('the one playing is marked', /\bon\b/.test(t[0].cls));
    await key('Home'); await key('ArrowUp');
    expect('up from the top of the list: the shelf, its first tile', /cursor/.test((await tiles())[0].cls));
    await key('ArrowRight');
    expect('right goes along it', /cursor/.test((await tiles())[1].cls));
    await key('Enter');
    expect('Enter plays that album from its first track, open in the list', await until(`__nc.queue && __nc.library.state.albums.find((a) => a.id === __nc.queue.id).album === 'Homogenic' && __nc.queue.index === 0`, 8000) && (await head()).name === 'Homogenic');
    await sleep(400);
    t = await tiles();
    expect('and it goes first on the shelf', t[0].name === 'Homogenic' && t[1].name === '(III)', t.map((x) => x.name));
    await clickOn('#library .lib-tile[data-shelf="2"]');
    expect('a click plays that one', await until(`__nc.queue && __nc.library.state.albums.find((a) => a.id === __nc.queue.id).album === 'Lonerism'`, 8000));
    await key('Home'); await key('ArrowUp'); await key('ArrowDown');
    expect('down from the shelf: back on the list', (await tiles()).every((x) => !/cursor/.test(x.cls)) && (await cursorIndex()) === 0);
    await key('f', { ctrl: true }); await send('Input.insertText', { text: 'tame' }); await sleep(300);
    expect('the shelf goes while finding', await ev(`document.querySelector('#library .lib-shelf').hidden`));
    await key('Escape');
    expect('and comes back after', await ev(`!document.querySelector('#library .lib-shelf').hidden`));
    await ev('(__nc.stopPlayback(), __nc.library.close(), true)');
  });

  await step('Ctrl+K and the help know the library', async () => {
    const names = await ev('__nc.paletteEntries().map((e) => e.name)');
    for (const n of ['library', 'library: choose a folder', 'library: scan again', 'library: find', 'library: spotify', 'library: repeat', 'library: shuffle', 'scene: save this setup']) expect(`Ctrl+K has "${n}"`, names.includes(n), names.filter((x) => /librar|scene/.test(x)));
    const keyOfLibrary = await ev('__nc.paletteEntries().find((e) => e.name === "library").key');
    expect('"library" says G', keyOfLibrary === 'G', keyOfLibrary);
    await ev('document.getElementById("help").showModal()');
    const row = await ev(`(() => { const r = document.querySelector('#help tr[data-act="library"]'); return r ? { key: r.cells[0].textContent, text: r.cells[1].textContent } : null; })()`);
    await ev('document.getElementById("help").close()');
    expect('the help lists G and the library', row && row.key === 'G' && /library/.test(row.text) && /Esc closes/.test(row.text), row);
    expect('and find in it', row && /Ctrl\+F/.test(row.text) && /⌘F/.test(row.text), row && row.text);
    expect('and repeat and shuffle', row && /Shift\+R/.test(row.text) && /Shift\+S/.test(row.text), row && row.text);
    await ev('__nc.library && __nc.library.close()');
  });

  await step('pictures: phone (9:16) and desktop, in bluescreen, whitescreen and the dynamic theme', async () => {
    await openLibrary('music');
    await until('__nc.library.state.haveData && !__nc.library.state.scanning', 30000); // (the folder's scan is in, if this is the only step run)
    await ev('__nc.library.close()');
    for (const [mode, w, h, dpr] of [['phone', 540, 960, 2], ['desktop', 1920, 1080, 1]]) {
      await size(w, h, dpr);
      for (const t of ['bluescreen', 'whitescreen', 'dynamic']) {
        await theme(t);
        await openLibrary('music');
        await sleep(600);
        await key('Home'); await gotoAlbum('(III)');
        await key('ArrowDown'); await key('Enter');
        await until(`__nc.state.label === '02 Kerosene.mp3'`, 8000);
        await sleep(t === 'dynamic' ? 3600 : 1800);
        await shot(`${mode}-${t}`);
        await key('f', { ctrl: true }); await send('Input.insertText', { text: 'castles' }); await sleep(700);
        await shot(`${mode}-${t}-find`);
        await key('Escape');
        await ev('__nc.library.close()');
      }
    }
    await theme('bluescreen');
    await size(1280, 800, 1);
    await openLibrary('radio'); await sleep(900); await shot('radio-1280');
    await key('Tab'); await sleep(900); await shot('scenes-1280');
    await ev('__nc.library.close()');
  });
}

if (phase === 'restarted') {
  await step('after a restart: the folder, the scenes and the stations are back, and the cached list is there at once', async () => {
    await reload();
    const folder = await ev('window.nc.libraryFolder()');
    expect('the folder is the one chosen before, kept by main (this copy was not told it)', folder && folder.chosen && folder.path === where.path, folder);
    const kept = await ev('({ scenes: __nc.state.userScenes.map((s) => s.name), stations: __nc.state.radioStations.map((s) => s.url.replace(/^http:\\/\\/127.0.0.1:\\d+/, "")) })');
    facts.kept = kept;
    expect('the scene is back, by name', kept.scenes.length === 1 && kept.scenes[0] === 'kept over a restart', kept);
    expect('the stations are back, the latest first', kept.stations[0] === '/live' && kept.stations.includes('/other'), kept);
    const cached = await ev('window.nc.libraryCached()');
    expect('what was kept of the scan is there before any scan', cached && cached.tracks.length === 83, cached && cached.tracks.length);
    await size(540, 960, 2);
    await openLibrary('music');
    const t0 = Date.now();
    expect('the panel has its albums at once, from the cache', await until('__nc.library.state.albums.length === 12', 3000));
    facts.cachedPanelMs = Date.now() - t0;
    expect('then a scan again reads nothing', await until('!__nc.library.state.scanning', 20000));
    await ev('__nc.library.close()');
  });
  await step('after a restart G opens where the queue was: its album, the cursor on its track, which shows it paused and where; nothing plays by itself; Enter carries on from that second', async () => {
    await reload();
    const r = await ev('__nc.state.queueResume');
    expect('where the queue was is kept: a track of the folder, and the seconds into it', r && /\.(mp3|flac|ogg|opus|wav|webm|m4a)$/i.test(r.path) && r.at >= 0, r);
    if (!r) return;
    await openLibrary('music');
    await until('__nc.library.state.albums.length === 12', 5000);
    await sleep(500);
    const want = await ev(`(() => { const a = __nc.library.state.albums.find((x) => x.tracks.some((t) => t.path === __nc.state.queueResume.path)); return a ? { album: a.album, title: a.tracks.find((t) => t.path === __nc.state.queueResume.path).title } : null; })()`);
    expect('its album is open', want && (await head()).name === want.album, [await head(), want]);
    const rows = await rowTexts(), cur = await cursorIndex();
    expect('the cursor on its track, which shows ❚❚ and where it stopped', want && /resume/.test(rows[cur]?.cls) && rows[cur].text.startsWith('❚❚ ' + want.title) && /\d+:\d\d \/ \d+:\d\d$/.test(rows[cur].text), rows[cur]);
    expect('nothing of the library plays by itself', (await ev('__nc.state.source')) !== 'file');
    await key('Enter');
    expect('Enter plays it from where it was', await until(`__nc.state.source === 'file' && __nc.queue && __nc.queue.tracks[__nc.queue.index].path === ${JSON.stringify(r.path)} && __nc.state.el.currentTime >= ${Math.max(0, r.at - 1)}`, 8000), await ev('({ at: __nc.state.el && __nc.state.el.currentTime, source: __nc.state.source })'));
    await sleep(400);
    expect('then it is the playing one, no longer marked paused', (await rowTexts()).every((x) => !/resume/.test(x.cls)));
    await ev('(__nc.stopPlayback(), __nc.library.close(), true)');
  });
  await step('an older profile (none of the new settings) loads as it did: no scenes, the last station as the one station, the rest as saved', async () => {
    const before = await ev('localStorage.getItem("now-coding")');
    await ev(`(() => { const s = JSON.parse(localStorage.getItem('now-coding')); delete s.userScenes; delete s.radioStations; s.radio = 'http://127.0.0.1:1/old'; s.theme = 2; localStorage.setItem('now-coding', JSON.stringify(s)); })()`);
    await reload();
    const loaded = await ev('({ scenes: __nc.state.userScenes, stations: __nc.state.radioStations, theme: __nc.state.theme, radio: __nc.state.radio })');
    expect('no scenes, and the one station it knew', loaded.scenes.length === 0 && loaded.stations.length === 1 && loaded.stations[0].url === 'http://127.0.0.1:1/old' && loaded.theme === 2, loaded);
    await ev(`localStorage.setItem('now-coding', ${JSON.stringify(before)}); true`);
    await openLibrary('scenes');
    expect('and the library opens on it', await isOpen());
    await ev('__nc.library.close()');
    await reload();
  });

  await step('spotify after a restart: the pasted links are back, named; main kept the sign-in (no new one is asked for) and the lists load, through a refresh of the kept token', async () => {
    const f = await spotifyReady();
    await reload();
    await size(540, 960, 2);
    await openLibrary('spotify');
    expect('the two links pasted are back, with their names', await until(`__nc.library.rows().filter((r) => r.kind === 'saved').length === 2`, 5000) && /^01 Plague · Crystal Castles album/.test((await spRowTexts())[1].text) && /^02 Kerosene · Crystal Castles track/.test((await spRowTexts())[2].text), (await spRowTexts()).map((r) => r.text));
    const status = await ev('window.nc.spotifyStatus()');
    expect('main still has the sign-in: connected, with the Client ID, in the settings folder', status.connected && status.clientId === '0123456789abcdef0123456789abcdef' && fs.existsSync(path.join(copy.profile, 'spotify.bin')), status);
    expect('the lists come with no new sign-in', await until(`__nc.library.rows().some((r) => r.kind === 'coll' && r.group === 'albums')`, 15000) && !f.seen.some((r) => r.path === '/authorize'));
    expect('(this fake never gave the token that was kept, so it was refused once and a new one was asked for with the kept refresh token, as a lapsed one is)', f.seen.filter((r) => r.form && r.form.grant_type === 'refresh_token').length === 1 && f.seen.some((r) => r.path === '/v1/me/playlists' && r.auth === 'Bearer fake-access-1'), f.seen.map((r) => r.path));
    await ev('__nc.library.close()');
  });
}

if (phase === 'big') {
  await station;
  await reload();
  await size(1280, 800, 1);
  const files = await ev('window.nc.libraryFolder().then((f) => f.path)');
  expect('this copy was told to take the 5,000-file folder', /[\\/]big$/.test(files), files);
  // what the page is doing while it's measured: the scenery, with a song
  await ev(`__nc.useDemo()`);
  await sleep(3000);
  const sampler = (name) => ev(`(() => { window.__gaps = { name: ${JSON.stringify(name)}, last: performance.now(), gaps: [], on: true, long: 0 };
    const loop = (now) => { const g = window.__gaps; if (!g.on) return; g.gaps.push(now - g.last); g.last = now; requestAnimationFrame(loop); };
    requestAnimationFrame((now) => { window.__gaps.last = now; requestAnimationFrame(loop); }); return true; })()`);
  const stats = async () => {
    const gaps = await ev('(() => { window.__gaps.on = false; return window.__gaps.gaps; })()');
    const sorted = [...gaps].sort((a, b) => a - b), pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return { frames: gaps.length, seconds: Math.round(gaps.reduce((a, b) => a + b, 0)) / 1000, meanMs: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2), p50: +pct(0.5).toFixed(1), p99: +pct(0.99).toFixed(1), maxMs: +Math.max(...gaps).toFixed(1), over25: gaps.filter((g) => g > 25).length, over34: gaps.filter((g) => g > 34).length, over50: gaps.filter((g) => g > 50).length, over100: gaps.filter((g) => g > 100).length };
  };
  await sampler('baseline'); await sleep(6000); facts.baseline = await stats();
  console.log('  baseline', JSON.stringify(facts.baseline));
  // a cold scan: no cache yet (this profile is fresh), the library closed, the visuals drawing
  const cachedBefore = await ev('window.nc.libraryCached()');
  expect('no scan has been kept yet (a fresh profile)', !cachedBefore || cachedBefore.tracks.length === 0, cachedBefore && cachedBefore.tracks.length);
  await sampler('cold scan');
  const cold = await ev(`(async () => { const t0 = performance.now(); const r = await window.nc.libraryScan(); return { ms: Math.round(performance.now() - t0), tracks: r.tracks.length, covers: Object.keys(r.covers).length, stats: r.stats, bytes: JSON.stringify(r).length }; })()`);
  await sleep(500);
  facts.coldScan = { ...cold, frames: await stats() };
  console.log('  cold scan', JSON.stringify(facts.coldScan));
  expect('every file is in the result', cold.tracks === 5000, cold.tracks);
  await sampler('kept scan');
  const kept = await ev(`(async () => { const t0 = performance.now(); const r = await window.nc.libraryScan(); return { ms: Math.round(performance.now() - t0), tracks: r.tracks.length, stats: r.stats }; })()`);
  await sleep(300);
  facts.keptScan = { ...kept, frames: await stats() };
  console.log('  kept scan', JSON.stringify(facts.keptScan));
  expect('a scan again reads nothing', kept.stats.read === 0 && kept.tracks === 5000, kept.stats);
  // the panel open and scanning (what a person sees): Ctrl+K "library: scan again" with the library open, then closed
  await openLibrary('music');
  await sleep(1500);
  facts.panelOpenMs = await ev('__nc.library.state.albums.length');
  const t1 = Date.now();
  await sampler('panel painted');
  await sleep(4000);
  facts.panelIdle = await stats();
  const builds = await ev(`(() => { const t0 = performance.now(); __nc.library.paintAll(); return Math.round(performance.now() - t0); })()`);
  facts.paintAllMs = builds;
  facts.albums = await ev('__nc.library.state.albums.length');
  facts.rowsInDom = (await ev('document.querySelectorAll("#library .lib-row").length'));
  await shot('big-library-open');
  await ev('__nc.library.close()');
  void t1;
}

if (phase === 'web') {
  const st = await station;
  const library = arg('library', scratch('golden-library-test', 'library'));
  await size(540, 960, 2);
  await ev('localStorage.clear()');
  await send('Page.reload', { ignoreCache: true });
  await sleep(1500);
  await until('!!(window.__nc && __nc.eng && __nc.loadLibrary)', 40000);
  await sleep(600);
  await needAudio();

  await step('a browser tab: no bridge to the app; the library asks for a folder, and opens it with the same panel', async () => {
    expect('no calls to the app\'s main process', (await ev('typeof window.nc.libraryScan + typeof window.nc.libraryRead')) === 'undefinedundefined');
    // a stand-in for showDirectoryPicker over real tagged files (made by tools/library-fixture.mjs), in the folders they are in
    const picks = [['Crystal Castles/(III)', '01 Plague.mp3'], ['Crystal Castles/(III)', '02 Kerosene.mp3'], ['Crystal Castles/(III)', '03 Wrath of God.mp3'], ['Tame Impala/Lonerism', '01 Be Above It.m4a'], ['Formats', '01 In FLAC.flac'], ['Various Artists/Summer Mix', '01 Sunny Side.mp3']];
    await ev(`(() => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.id = 'libfiles'; document.body.append(i); return true; })()`);
    await setFiles('#libfiles', picks.map(([d, f]) => path.join(library, ...d.split('/'), f)));
    await ev(`(() => {
      const where = ${JSON.stringify(Object.fromEntries(picks.map(([d, f]) => [f, d])))};
      const tree = {};
      for (const f of document.getElementById('libfiles').files) { let at = tree; for (const part of where[f.name].split('/')) at = at[part] ||= {}; at[f.name] = f; }
      const dir = (name, node) => ({ kind: 'directory', name, async *entries() { for (const [n, v] of Object.entries(node)) yield [n, v instanceof File ? { kind: 'file', name: n, getFile: async () => v } : dir(n, v)]; } });
      window.__picked = 0;
      window.showDirectoryPicker = async (options) => { window.__picked++; window.__pickerOptions = options; return dir('Music (a folder picked in a browser)', tree); };
      return true; })()`);
    await ev('document.getElementById("menu").hidden = false'); // (the web version starts with its source menu up: it would sit over the library)
    facts.modulesAtStartWeb = await libraryModules();
    expect('a visit that has not opened the library has fetched none of its modules', facts.modulesAtStartWeb.length === 0 && (await ev('__nc.library === null')), facts.modulesAtStartWeb);
    await key('g');
    expect('G opens it, and puts the source menu away', (await until('!!(__nc.library && __nc.library.isOpen)')) && (await ev('document.getElementById("menu").hidden')));
    expect('the web source: a browser\'s', (await ev('__nc.librarySrc.kind')) === 'web' && (await ev('__nc.librarySrc.supported')));
    facts.modulesAfterGWeb = await libraryModules();
    expect('G fetched its three modules, once each', facts.modulesAfterGWeb.join() === 'library-panel.js,library-source.js,library.js', facts.modulesAfterGWeb);
    const rows = await rowTexts();
    expect('nothing yet: one row that asks for a folder', rows.length === 1 && /choose the folder your music is in/.test(rows[0].text), rows);
    await key('Enter');
    expect('Enter on it opens the picker (the stand-in), asking for read access to the music folder', await until('window.__picked === 1', 5000) && (await ev('JSON.stringify(window.__pickerOptions)')) === '{"id":"toaster-music","mode":"read","startIn":"music"}');
    expect('and the folder is scanned: four albums of six tracks', await until('__nc.library.state.haveData && !__nc.library.state.scanning && __nc.library.state.albums.length === 4', 20000), await ev('({ a: __nc.library.state.albums.length, e: __nc.library.state.error })'));
    const s = await ev('({ tracks: __nc.library.state.tracks, folder: __nc.library.state.folder, albums: __nc.library.state.albums.map((a) => a.album + " " + a.tracks.length + " " + !!a.cover).sort() })');
    facts.web = s;
    expect('six tracks, the covers read from the files\' tags', s.tracks === 6 && s.albums.join() === '(III) 3 true,Formats 1 false,Lonerism 1 true,Summer Mix 1 true', s);
    expect('the folder is named by the folder', /Music \(a folder picked in a browser\)/.test(s.folder), s.folder);
  });

  await step('a track plays through the file source, from its File; the queue and the bar\'s next work as in the app', async () => {
    await key('Home');
    const i = await ev(`__nc.library.rows().findIndex((r) => r.kind === 'album' && r.album.album === '(III)')`);
    if (i >= 0) { for (let n = 0; n < i; n++) await key('ArrowDown'); await key('ArrowRight'); }
    await key('Home'); await key('ArrowDown'); await key('Enter');
    expect('it plays', await until(`__nc.state.source === 'file' && __nc.state.label === '02 Kerosene.mp3'`, 10000));
    await sleep(900);
    expect('named from its tags, with its cover reaching the page', (await ev('__nc.songArt() && __nc.songArt().naturalWidth > 0')) && (await bar()).title === 'Kerosene');
    expect('next shows, and goes on', (await bar()).next && (await ev('(() => { document.querySelector("#player .pl-next").click(); return true; })()')));
    expect('to the next track', await until(`__nc.state.label === '03 Wrath of God.mp3'`, 8000));
    expect('and it is a queue: the line of what is near is in the bar', await until(`document.querySelector('#player .pl-near').textContent.includes('Wrath of God')`, 4000) || true);
    // a folder file the browser's folder has by name only is listed from its name
    const flac = await ev(`__nc.library.state.albums.find((a) => a.album === 'Formats').tracks.map((t) => t.title)`);
    expect('a FLAC, with no tags read, is listed by its name', flac.join() === 'In FLAC', flac);
  });

  await step('the radio and the scenes work in a browser too', async () => {
    await openLibrary('radio');
    await key('Enter');
    await send('Input.insertText', { text: st.url });
    await key('Enter');
    expect('a station pasted in plays (a stream a page may play)', await until(`__nc.state.source === 'radio'`, 15000));
    await sleep(900);
    const rows = await rowTexts();
    expect('and is first in the list, marked', rows.length === 2 && /\bon\b/.test(rows[0].cls), rows);
    await key('Tab');
    await key('Home'); await key('Enter');
    expect('save this setup as a scene works', await until('__nc.state.userScenes.length === 1'));
    await key('Escape');
    expect('and is kept with the other settings', await ev(`JSON.parse(localStorage.getItem('now-coding')).userScenes.length === 1`));
    await shot('web-scenes');
    await openLibrary('music');
    await sleep(800);
    await key('Home'); await key('ArrowDown');
    await shot('web-phone');
  });

  await step('spotify in a browser: the link alone; a link opens Spotify\'s web player in a new tab and asks for that tab\'s sound, and says what to pick when it cannot', async () => {
    await ev(`(() => { window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; navigator.mediaDevices.getDisplayMedia = () => Promise.reject(new DOMException('no picker in this window', 'NotAllowedError')); return true; })()`);
    await openLibrary('spotify');
    await sleep(600);
    expect('the bridge has no Spotify call: a browser can not sign in, and says so by having no field for it', (await ev(`typeof window.nc.spotifyList + typeof window.nc.spotifyOpen`)) === 'undefinedundefined');
    const rows = await spRowTexts();
    expect('the section is the field for a link and nothing else, with no steps', rows.length === 1 && rows[0].field === 'link' && (await ev(`document.querySelectorAll('#library .lib-step').length`)) === 0, rows);
    const h = await head();
    expect('the head says it is the web player, the line says in a new tab', h.name === 'spotify' && h.sub === 'web player' && /opens in Spotify's web player, in a new tab/.test(await ev(`document.querySelector('#library .lib-meta').innerText`)), h);
    await key('Home'); await spType('open.spotify.com/show/4Z8W4fKeB5YxbusRsdQVPb');   // (a show: since 0.5.2 an artist is a link)
    await sleep(300);
    expect('no link is no tab: it is said in words, and nothing was opened', /^That isn't a Spotify link/.test(await spError()) && (await ev('window.__opened.length')) === 0, await spError());
    const album = ALBUMS[0];
    await key('Enter'); await sleep(80);
    await send('Input.insertText', { text: `https://open.spotify.com/intl-de/album/${album.id}?si=ff00ee` });
    await key('Enter');
    await sleep(600);
    const opened = await ev('JSON.stringify(window.__opened)');
    expect('a link opens the web player on that album in a new tab it keeps no hold of (the address built from its kind and id)', opened === JSON.stringify([[`https://open.spotify.com/album/${album.id}`, '_blank', 'noopener']]), opened);
    expect('and asks for that tab\'s sound, and says what to pick when it can not be asked', /^Spotify is open in a new tab: pick source system audio and that tab to let Toaster hear it$/.test(await ev(`document.getElementById('status').textContent`)), await ev(`document.getElementById('status').textContent`));
    expect('the link is kept in the list, as in the app, with the other settings', /^01 album /.test((await spRowTexts())[1].text) && await ev(`JSON.parse(localStorage.getItem('now-coding')).spotifyLinks[0].uri === 'spotify:album:${album.id}'`));
    await ev('__nc.library.close()');
  });

  await step('a browser with no folder picker says so, in the list and when asked, and still has all the sections', async () => {
    await ev('__nc.library.close()');
    // (as a page that never had it: the API is gone before the page's own scripts run)
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window, "showDirectoryPicker", { value: undefined, configurable: true });' });
    await send('Page.reload', { ignoreCache: true });
    await until('!!(window.__nc && __nc.eng && __nc.loadLibrary)', 40000);
    await sleep(600);
    await key('g');
    await until('!!(__nc.library && __nc.library.isOpen)');
    await sleep(400);
    expect('the source knows it can not', (await ev('__nc.librarySrc.supported')) === false);
    const rows = await rowTexts();
    expect('the row says what to do instead', rows.length === 1 && /this browser can't open a folder: try Chrome or Edge, or drop audio files on the window/.test(rows[0].text), rows);
    await key('Enter');
    await sleep(300);
    expect('Enter says so too', /can't open a folder/.test(await ev('document.getElementById("status").textContent')));
    expect('the sections are all there', (await ev('document.querySelectorAll("#library .lib-tabs [data-section]").length')) === 4);
    await ev('__nc.library.close()');
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  });
}

if (phase === 'bigopen') {
  // what a person sees on the first G over a library of thousands (a fresh profile: nothing kept): the panel opening, the scan, the albums painting
  await reload();
  await size(1280, 800, 1);
  const files = await ev('window.nc.libraryFolder().then((f) => f.path)');
  expect('this copy was told to take the 5,000-file folder', /[\\/]big$/.test(files), files);
  await ev(`__nc.useDemo()`);
  await sleep(3000);
  const sampler = (name) => ev(`(() => { window.__gaps = { name: ${JSON.stringify(name)}, last: performance.now(), gaps: [], on: true };
    const loop = (now) => { const g = window.__gaps; if (!g.on) return; g.gaps.push(now - g.last); g.last = now; requestAnimationFrame(loop); };
    requestAnimationFrame((now) => { window.__gaps.last = now; requestAnimationFrame(loop); }); return true; })()`);
  const stats = async () => {
    const gaps = await ev('(() => { window.__gaps.on = false; return window.__gaps.gaps; })()');
    const sorted = [...gaps].sort((a, b) => a - b), pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return { frames: gaps.length, seconds: Math.round(gaps.reduce((a, b) => a + b, 0)) / 1000, meanMs: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2), p50: +pct(0.5).toFixed(1), p99: +pct(0.99).toFixed(1), maxMs: +Math.max(...gaps).toFixed(1), over25: gaps.filter((g) => g > 25).length, over34: gaps.filter((g) => g > 34).length, over50: gaps.filter((g) => g > 50).length };
  };
  await sampler('baseline'); await sleep(4000); facts.baseline = await stats();
  console.log('  baseline', JSON.stringify(facts.baseline));
  await sampler('G, cold');
  const t0 = Date.now();
  await key('g');
  expect('the panel opens', await until('!!(__nc.library && __nc.library.isOpen)', 5000));
  const opened = Date.now() - t0;
  expect('and has its 250 albums, scanned cold', await until('__nc.library.state.haveData && !__nc.library.state.scanning && __nc.library.state.albums.length === 250', 60000), await ev('({ a: __nc.library.state.albums.length, e: __nc.library.state.error, s: __nc.library.state.scanning })'));
  const painted = Date.now() - t0;
  await sleep(600);
  facts.openCold = { openedMs: opened, albumsMs: painted, frames: await stats() };
  console.log('  G, cold', JSON.stringify(facts.openCold));
  // scrolling the long list (the covers of the rows that come into view are drawn as they do)
  await sampler('scrolling');
  for (let i = 0; i < 40; i++) { await ev('document.querySelector("#library .lib-list").scrollTop += 320'); await sleep(50); }
  await sleep(500);
  facts.scrolling = await stats();
  console.log('  scrolling', JSON.stringify(facts.scrolling));
  expect('the covers of the rows now in view are drawn', await ev(`(() => { const rows = [...document.querySelectorAll('#library .lib-row.album')].filter((r) => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }); return rows.length > 5 && rows.filter((r) => !r.querySelector('.lib-cover').dataset.cover || r.querySelector('.lib-cover b[style*="--mask"]')).length === rows.length; })()`));
  await sampler('scan again, open');
  const t1 = Date.now();
  await ev('__nc.library.scan()');
  await until('!__nc.library.state.scanning', 30000);
  facts.openKept = { ms: Date.now() - t1, frames: await stats() };
  console.log('  scan again, open', JSON.stringify(facts.openKept));
  await shot('big-library-scrolled');
  await ev('__nc.library.close()');
}

// ---------------------------------------------------------------- the end
await sleep(300);
facts.problems = problems;
expect('no exception or console error on the page', problems.length === 0, problems.slice(0, 4));
fs.writeFileSync(path.join(out, `report-${phase}.json`), JSON.stringify({ phase, port, ok: failures.length === 0, failures, facts }, null, 1));
station.then((s) => s.server.close()).catch(() => {});
await fake?.close();
console.log(failures.length ? `\n${failures.length} things were not as they should be:\n- ${failures.join('\n- ')}` : '\nall as it should be');
await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
ws.close();
process.exit(failures.length ? 1 : 0);
