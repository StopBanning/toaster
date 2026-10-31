// The player bar on a real copy of the app: its picture for each source, theme and mode (H, Z, a recording, narrow and
// touch screens), with what each one shows checked as it goes. It never starts or stops anything: start the copy
// yourself, hidden and muted with its own profile, and with --player-dry-run, which keeps it from sending a thing to
// Music, Spotify or the media keys (the commands it would have sent are kept, and read back here); this refuses to go on
// without it. See docs/mac-dev-launch.md, and pick a port that is not in use (9333-9338 and 9341 belong to others):
//   open -n -j node_modules/electron/dist/Electron.app --args "$PWD" --hidden --mute-audio \
//     --user-data-dir="$HOME/work/scratch/player-bar-profile" --remote-debugging-port=9342 --player-dry-run
//   node tools/player-bar-check.mjs [--port 9342] [--out _checks/player-bar] [--file song.webm]
// Its sounds are its own: a beat it makes (or --file's song), played as the file, and served from 127.0.0.1 as a station for
// the radio, the page's demo beat, silent stand-ins for a mic and a tab; the system's player is the page's own idea of one
// (the demo feeds the engine). Pictures and report.json go to --out; the exit code is 1 if anything was not as it should be.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const port = Number(arg('port', process.env.NC_PORT || 9342));
const out = path.resolve(arg('out', '_checks/player-bar'));
fs.mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- the page, over the debugging port
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('index.html'));
if (!page) throw new Error('no app window on port ' + port);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
  return r.result.value;
}
const until = async (expression, ms = 25000) => { for (let t = 0; t < ms; t += 250) { if (await ev(expression)) return true; await sleep(250); } return false; };
const VK = { Escape: 27, Enter: 13 };
async function key(k, { ctrl = false } = {}) {
  const info = { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, modifiers: ctrl ? 2 : 0, windowsVirtualKeyCode: k.length === 1 ? k.toUpperCase().charCodeAt(0) : VK[k] || 0 };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...info, text: k.length === 1 && !ctrl ? k : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...info });
}
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
async function click(x, y) {
  await move(x, y);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}
const rect = (selector) => ev(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; })()`);
const clickOn = async (selector, along = 0.5) => { const r = await rect(selector); await click(r.x + r.w * along, r.cy); };
const viewport = () => ev('({ w: innerWidth, h: innerHeight })');
async function shot(name, barOnly = false) {
  const v = await viewport();
  const clip = barOnly ? { x: 0, y: Math.max(0, v.h - 140), width: v.w, height: Math.min(140, v.h), scale: 2 } : undefined;
  const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function size(width, height, touch = false) {
  if (!width) await send('Emulation.clearDeviceMetricsOverride'); else await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 5 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: touch, configuration: 'mobile' });
  await sleep(1500);
}

// the copy must say it is in dry-run mode (an array of what it was asked to send), or nothing here goes on
const sent0 = await ev('window.nc && window.nc.playerSent ? window.nc.playerSent() : null');
if (!Array.isArray(sent0)) { ws.close(); throw new Error('this copy is not running with --player-dry-run: refusing to drive it'); }
const sent = () => ev('window.nc.playerSent()');

// ---------------------------------------------------------------- what is checked, and what is found
const facts = {}, failures = [];
const expect = (what, ok, detail) => { if (!ok) { failures.push(what + (detail !== undefined ? ': ' + JSON.stringify(detail) : '')); console.log('  NOT AS IT SHOULD BE:', what, detail !== undefined ? JSON.stringify(detail) : ''); } };
const bar = () => ev(`(() => {
  const q = (s) => document.querySelector('#player ' + s), p = document.getElementById('player'), cs = getComputedStyle(p);
  return {
    theme: document.documentElement.dataset.theme || 'bluescreen', source: __nc.state.source, stopped: __nc.state.stopped,
    chip: q('.pl-chip').textContent, chipOff: q('.pl-chip').classList.contains('off'), song: q('.pl-song').textContent, status: q('.pl-status').textContent,
    buttons: [...p.querySelectorAll('.pl-btn')].filter((b) => !b.hidden).map((b) => b.dataset.kind + ':' + b.dataset.state),
    progressHidden: q('.pl-progress').hidden, pos: q('.pl-pos').textContent, len: q('.pl-len').textContent, seeks: q('.pl-track').classList.contains('seek'),
    opacity: cs.opacity, visibility: cs.visibility, display: cs.display, pointer: cs.pointerEvents, height: Math.round(p.getBoundingClientRect().height),
    reserved: __nc.playerBar.reserved(), el: __nc.state.el ? { paused: __nc.state.el.paused, t: __nc.state.el.currentTime, d: __nc.state.el.duration } : null,
  };
})()`);
const systemIs = (app, title, artist, playing = true) => ev(`(() => { const s = __nc.state; s.source = 'system'; s.label = 'system audio'; s.winSong = ${app ? `{ title: ${JSON.stringify(title)}, artist: ${JSON.stringify(artist)}, app: ${JSON.stringify(app)} }` : 'null'}; s.winPlaying = ${playing}; })()`);
// (the key comes a few bars after the tempo locks)
const locked = async () => { const ok = await until('__nc.eng.tempo.locked && __nc.eng.bar !== null && !!__nc.eng.key', 45000); await sleep(400); return ok; }; // (and the bar follows the engine every 125 ms)
// each theme in turn with T (the page's own key; its Ctrl+K entries list them in T's order), a picture of the bar at each (of the whole
// window too, for the first and the last), and back where it started
const themeNow = () => ev("document.documentElement.dataset.theme || 'bluescreen'");
async function eachTheme(name, only = null) {
  const themes = await ev("__nc.paletteEntries().filter((e) => e.id.startsWith('theme:')).map((e) => e.id.slice(6))");
  const here = await themeNow();
  for (let i = 0; i < themes.length; i++) {
    const theme = await themeNow();
    if (!only || only.includes(theme)) {
      await sleep(900);
      await shot(`${name}-${theme}-bar`, true);
      if (i === 0 || i === themes.length - 1 || theme === 'whitescreen') await shot(`${name}-${theme}`);
    }
    await key('t');
    await sleep(250);
  }
  expect(`${name}: T goes round all ${themes.length} themes and back`, (await themeNow()) === here, [here, await themeNow()]);
  await sleep(500);
}
const pointerAway = () => move(300, 200);

// ---------------------------------------------------------------- a beat of its own, and a station to play it from
function makeBeat(bpm = 124, seconds = 90, rate = 22050) {
  const n = Math.floor(seconds * rate), s = new Float32Array(n), P = 60 / bpm;
  let seed = 7;
  const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
  const at = (t, length, f) => { const i0 = Math.floor(t * rate); for (let i = 0; i < length * rate && i0 + i < n; i++) s[i0 + i] += f(i / rate); };
  for (let b = 0; b * P < seconds - 1; b++) {
    const t = b * P;
    at(t, 0.28, (x) => 0.9 * Math.sin(2 * Math.PI * (48 * x + (110 * (1 - Math.exp(-28 * x))) / 28)) * Math.exp(-11 * x)); // the kick, on every beat
    if (b % 2 === 1) at(t, 0.14, (x) => 0.45 * noise() * Math.exp(-26 * x)); // a clap on 2 and 4
    at(t + P / 2, 0.07, (x) => 0.22 * noise() * Math.exp(-48 * x)); // a hat on the off-beat
    at(t + P / 2, 0.22, (x) => 0.3 * Math.sin(2 * Math.PI * 55 * x) * Math.exp(-9 * x)); // the bass, on the off-beat
    if (b % 4 === 0) for (const f of [220, 261.63, 329.63]) at(t, 4 * P, (x) => 0.05 * Math.sin(2 * Math.PI * f * x) * Math.min(1, x * 20)); // A minor, a bar at a time
  }
  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s[i])) * 32000), 44 + i * 2);
  return wav;
}
const songFile = arg('file', null) || path.join(out, 'beat.wav');
const wav = fs.existsSync(songFile) && arg('file', null) ? fs.readFileSync(songFile) : makeBeat();
if (!arg('file', null)) fs.writeFileSync(songFile, wav);
const station = http.createServer((req, res) => { res.writeHead(200, { 'content-type': arg('file', null) ? 'audio/webm' : 'audio/wav', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }); res.end(wav); });
await new Promise((r) => station.listen(0, '127.0.0.1', r));
const streamUrl = `http://127.0.0.1:${station.address().port}/live`;

// ---------------------------------------------------------------- the run
const errors = [];
await send('Runtime.enable');
ws.addEventListener('message', (ev2) => {
  const m = JSON.parse(ev2.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
try {
  await pointerAway();
  facts.startedOn = (await bar()).theme;

  console.log('the demo beat');
  await ev('__nc.useDemo()');
  expect('the tempo locks on the demo', await locked());
  let b = facts.demo = await bar();
  expect('demo: chip, a stop button, no progress bar', b.chip === 'demo' && JSON.stringify(b.buttons) === '["play:stop"]' && b.progressHidden, b);
  expect('demo: bpm · key · bar.beat · source', /^\d+ bpm · [A-G][b#]? (major|minor) · bar \d{3,}\.[1-4] · demo$/.test(b.status), b.status);
  await eachTheme('demo');

  console.log('the system, with Music, Spotify, a browser and nothing');
  await systemIs('Music', 'Nanana', 'Peggy Gou');
  await until(`!document.querySelector('#player .pl-progress').hidden`, 8000);
  b = facts.systemMusic = await bar();
  expect('Music: prev, pause, next and a progress bar that does not seek', JSON.stringify(b.buttons) === '["prev:prev","play:pause","next:next"]' && !b.progressHidden && !b.seeks && b.len === '3:35', b);
  expect('Music: the system chip and "system" last in the status line', b.chip === 'system' && /· system$/.test(b.status), b);
  const before = (await sent()).length;
  for (const k of ['prev', 'play', 'next']) { await clickOn(`#player .pl-${k}`); await sleep(500); }
  await sleep(600);
  const commands = (await sent()).slice(before).map((c) => c[2]).filter((s) => !/player position/.test(s)).map((s) => s.replace(/^.* to /, ''));
  expect('Music: the three buttons send back track, playpause, next track, in that order, and nothing else', JSON.stringify(commands) === '["back track","playpause","next track"]', commands);
  await eachTheme('system-music');
  await systemIs('Spotify', 'Nanana', 'Peggy Gou');
  await sleep(1500); // (the bar follows the page's state every 125 ms: a click before that goes to the player it had)
  await until(`!document.querySelector('#player .pl-progress').hidden`, 8000);
  const mark = (await sent()).length;
  await clickOn('#player .pl-next'); await sleep(600);
  const spotify = (await sent()).slice(mark).map((c) => c[2]);
  expect('Spotify: asked as Spotify, next is next track', spotify.some((s) => /tell application "Spotify" to next track$/.test(s)) && spotify.every((s) => !/"Music"/.test(s)), spotify.map((s) => s.slice(0, 80)));
  b = facts.systemSpotify = await bar();
  expect('Spotify: the same three buttons and a progress bar', JSON.stringify(b.buttons) === '["prev:prev","play:pause","next:next"]' && !b.progressHidden, b);
  await shot(`system-spotify-${await themeNow()}-bar`, true);
  await systemIs('Google Chrome', 'Nanana (Official Video)', '');
  await sleep(2500);
  const quiet = (await sent()).length;
  await sleep(4500);
  b = facts.systemBrowser = await bar();
  expect('a browser: no buttons and no progress bar', b.buttons.length === 0 && b.progressHidden, b);
  expect('a browser is not asked anything', (await sent()).length === quiet, (await sent()).slice(quiet));
  await shot(`system-browser-${await themeNow()}-bar`, true);
  await shot(`system-browser-${await themeNow()}`);
  await systemIs(null);
  await sleep(1500);
  b = facts.systemNothing = await bar();
  expect('the system with no song: no buttons', b.buttons.length === 0 && b.progressHidden, b);
  await shot(`system-nothing-${await themeNow()}-bar`, true);

  console.log('a mic and a tab (silent stand-ins)');
  await ev(`__nc.state.winSong = null; __nc.attach(__nc.ac.createGain(), 'input', 'MacBook Pro Microphone')`);
  await sleep(1500);
  b = facts.mic = await bar();
  expect('a mic: its name where the song would be', b.chip === 'mic' && b.song === 'MacBook Pro Microphone', b);
  expect('a mic: no buttons, no progress bar', b.buttons.length === 0 && b.progressHidden, b);
  await eachTheme('mic', ['bluescreen', 'whitescreen']);
  await ev(`__nc.attach(__nc.ac.createGain(), 'tab', 'tab audio')`);
  await sleep(1500);
  b = facts.tab = await bar();
  expect('a tab: no buttons, no progress bar', b.chip === 'tab' && b.buttons.length === 0 && b.progressHidden, b);
  await eachTheme('tab', ['bluescreen', 'whitescreen']);

  console.log('a file');
  await send('DOM.getDocument', { depth: 0 }).then(async ({ root }) => {
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#file' });
    await send('DOM.setFileInputFiles', { nodeId, files: [songFile] });
  });
  expect('the file starts playing', await until(`__nc.state.source === 'file' && __nc.state.el && !__nc.state.el.paused && __nc.state.el.duration > 1`, 15000));
  expect('the tempo locks on the file', await locked());
  b = facts.file = await bar();
  expect('file: restart and pause, a progress bar that seeks, times', JSON.stringify(b.buttons) === '["prev:prev","play:pause"]' && !b.progressHidden && b.seeks && /^\d+:\d\d$/.test(b.pos) && /^\d+:\d\d$/.test(b.len), b);
  expect('file: the title is the file\'s name, with no artist', b.chip === 'file' && b.song === path.basename(songFile).replace(/\.[^.]+$/, ''), b.song);
  await eachTheme('file');
  await clickOn('#player .pl-track', 0.5);
  await sleep(1000);
  b = await bar();
  expect('file: a click on the middle of the track goes to about the middle', b.el && Math.abs(b.el.t / b.el.d - 0.5) < 0.04, b.el);
  await clickOn('#player .pl-play'); await sleep(700);
  b = await bar();
  expect('file: the play button pauses it, and shows play', b.el.paused && b.buttons.includes('play:play'), b);
  await shot(`file-paused-${await themeNow()}-bar`, true);
  await clickOn('#player .pl-play'); await sleep(700);
  b = await bar();
  expect('file: and plays it again', !b.el.paused && b.buttons.includes('play:pause'), b);
  await key(' '); await sleep(400);
  b = await bar();
  expect('file: Space (tap tempo) after a click does not press the button again', !b.el.paused, b.el);
  await clickOn('#player .pl-prev'); await sleep(900);
  b = await bar();
  expect('file: restart goes back to the start', b.el.t < 3, b.el);
  await pointerAway();

  console.log('the radio');
  await ev(`(() => { document.getElementById('radio-url').value = ${JSON.stringify(streamUrl)}; document.getElementById('radio').dispatchEvent(new Event('submit', { cancelable: true })); })()`);
  expect('the radio starts', await until(`__nc.state.source === 'radio' && __nc.state.el && !__nc.state.el.paused`, 15000));
  expect('the tempo locks on the radio', await locked());
  await ev(`__nc.state.radioSong = { title: 'Night Drive', artist: 'Test Station' }`);
  await sleep(1200);
  b = facts.radio = await bar();
  expect('radio: a stop button only, the song as the station gives it', b.chip === 'radio' && JSON.stringify(b.buttons) === '["play:stop"]' && b.progressHidden && b.song === 'Night Drive · Test Station', b);
  await eachTheme('radio', ['bluescreen', 'whitescreen']);
  await clickOn('#player .pl-play'); await sleep(1200);
  b = facts.radioStopped = await bar();
  expect('radio: stopped, the source is let go and the chip stays, dim, with a play button', b.source === null && b.stopped === 'radio' && b.chipOff && JSON.stringify(b.buttons) === '["play:play"]' && /· stopped$/.test(b.status), b);
  await pointerAway();
  await eachTheme('radio-stopped', ['bluescreen', 'whitescreen']);
  await clickOn('#player .pl-play');
  expect('radio: play brings it back', await until(`__nc.state.source === 'radio' && __nc.state.el && !__nc.state.el.paused`, 15000));
  await pointerAway();
  await ev('__nc.useDemo()');
  await locked();
  await systemIs('Music', 'Nanana', 'Peggy Gou');
  await until(`!document.querySelector('#player .pl-progress').hidden`, 8000);

  console.log('H, Z, a recording');
  const modes = {}, theme = await themeNow(), v = await viewport();
  await key('h'); await sleep(900); modes.h = await bar(); await shot(`h-${theme}`); await key('h'); await sleep(900);
  expect('H: it fades out with the footer and takes no room', modes.h.opacity === '0' && modes.h.pointer === 'none' && modes.h.reserved === 0, modes.h);
  expect('H again: it is back', (await bar()).opacity === '1');
  await key('z'); await sleep(900); modes.zAway = await bar(); await shot(`z-away-${theme}`);
  await move(v.w / 2, v.h - 45); await sleep(900); modes.zBar = await bar(); await shot(`z-hover-${theme}`); await shot(`z-hover-${theme}-bar`, true);
  await pointerAway(); await sleep(900);
  await move(v.w / 2, v.h - 10); await sleep(900); modes.zFooter = await bar();
  await pointerAway(); await sleep(600);
  await key('z'); await sleep(300); await key('z'); await sleep(800);
  expect('Z: hidden with the pointer away, shown on the bar and on the footer', modes.zAway.opacity === '0' && modes.zBar.opacity === '1' && modes.zFooter.opacity === '1', [modes.zAway.opacity, modes.zBar.opacity, modes.zFooter.opacity]);
  expect('Z twice more: the code and the bar are back as they were', (await bar()).opacity === '1');
  await ev(`document.body.classList.add('recording')`); await sleep(400); modes.recordingOff = await bar(); await shot(`recording-off-${theme}`);
  await ev(`__nc.setPlayerRec(true)`); await sleep(400); modes.recordingOn = await bar(); await shot(`recording-on-${theme}`);
  await ev(`__nc.setPlayerRec(false); document.body.classList.remove('recording')`); await sleep(400);
  expect('a recording leaves the bar out, and the setting puts it back in', modes.recordingOff.visibility === 'hidden' && modes.recordingOff.reserved === 0 && modes.recordingOn.visibility === 'visible' && modes.recordingOn.reserved > 0, [modes.recordingOff, modes.recordingOn]);
  // (no video is made: the page's own sign of one, the class, is what the CSS goes by)
  facts.modes = modes;

  console.log('the help, Ctrl+K, and a long title');
  const settings = () => ev(`({ bar: __nc.state.playerBar, rec: __nc.state.playerRec, display: getComputedStyle(document.getElementById('player')).display, saved: (({ playerBar, playerRec }) => ({ playerBar, playerRec }))(JSON.parse(localStorage.getItem('now-coding') || '{}')) })`);
  await clickOn('#b-help'); await sleep(600);
  await ev(`document.getElementById('playerbar').scrollIntoView({ block: 'center' })`); await sleep(300);
  await shot('help-settings');
  const box1 = await rect('#playerbar'), box2 = await rect('#playerrec');
  await click(box1.cx, box1.cy); await sleep(400); let st = await settings();
  expect('the help: unticking Player bar hides it, and saves that', !st.bar && st.display === 'none' && st.saved.playerBar === false, st);
  await click(box1.cx, box1.cy); await sleep(400); st = await settings();
  expect('the help: ticking it brings it back, and saves that', st.bar && st.display !== 'none' && st.saved.playerBar === true, st);
  await click(box2.cx, box2.cy); await sleep(400); st = await settings();
  expect('the help: ticking Player bar in recordings sets and saves it', st.rec && st.saved.playerRec === true, st);
  await click(box2.cx, box2.cy); await sleep(400); st = await settings();
  expect('the help: and unticking it', !st.rec && st.saved.playerRec === false, st);
  await ev(`document.getElementById('help').close()`); await sleep(300);
  const palette = async (text) => {
    await key('k', { ctrl: true }); await sleep(300);
    await send('Input.insertText', { text }); await sleep(300);
    return ev(`[...document.querySelectorAll('#command-results button')].map((b) => b.querySelector('span').textContent)`);
  };
  const rows = await palette('player');
  await shot('palette-player');
  expect('Ctrl+K: "player" finds the four entries', ['player bar: shown', 'player bar: hidden', 'player bar: in recordings', 'player bar: not in recordings'].every((n) => rows.includes(n)), rows);
  await key('Escape'); await sleep(300);
  for (const [name, check] of [['player bar: hidden', (s) => !s.bar && s.saved.playerBar === false], ['player bar: shown', (s) => s.bar && s.saved.playerBar === true], ['player bar: in recordings', (s) => s.rec && s.saved.playerRec === true], ['player bar: not in recordings', (s) => !s.rec && s.saved.playerRec === false]]) {
    await palette(name); await key('Enter'); await sleep(500);
    st = await settings();
    expect(`Ctrl+K: "${name}" does it, and saves it`, check(st), st);
  }
  const transport = await palette('transport');
  expect('Ctrl+K: "transport" finds shown and hidden', transport.includes('player bar: shown') && transport.includes('player bar: hidden'), transport);
  await key('Escape'); await sleep(300);
  // a title too long for its room: cut with an ellipsis, with the whole of it in the tooltip, and the notice above the bar
  const longTitle = 'Nanana (Peggy Gou Extended Remix) [Official Visualizer] feat. The Very Long Name Orchestra of the North';
  await systemIs('Music', longTitle, 'Peggy Gou & Friends of the Extended Family Band');
  await ev(`(() => { const n = document.getElementById('notice'); n.textContent = 'saved 12 bars as MIDI and Strudel code: Peggy Gou - Nanana'; n.hidden = false; })()`);
  await sleep(1500);
  const long = await ev(`(() => { const s = document.querySelector('#player .pl-song'); return { cut: s.scrollWidth > s.clientWidth, tip: s.title }; })()`);
  expect('a long title is cut, and its tooltip has all of it', long.cut && long.tip.startsWith(longTitle), long);
  await shot('long-title-and-notice'); await shot('long-title-bar', true);
  await ev(`document.getElementById('notice').hidden = true`);
  await systemIs('Music', 'Nanana', 'Peggy Gou');
  await sleep(1200);

  console.log('what sits at the bottom steps over the bar');
  // the notice, the first visit's hint and (in the 9:16 layout) the machine readout, shown by hand where they would be, against the bar's top edge
  const clear = await ev(`(() => {
    const top = document.getElementById('player').getBoundingClientRect().top, bottom = (e) => e.getBoundingClientRect().bottom;
    const n = document.getElementById('notice'), h = document.getElementById('first-run-hint'), sys = document.getElementById('sys');
    n.textContent = 'saved 12 bars as MIDI and Strudel code'; n.hidden = false;
    h.hidden = false; h.classList.add('show'); h.textContent = 'P switches the code look';
    const wide = { top, notice: bottom(n), hint: bottom(h) };
    n.hidden = true; h.hidden = true; h.classList.remove('show');
    document.body.classList.add('vertical'); sys.textContent = 'machine readout'; sys.hidden = false;
    const tall = { top: document.getElementById('player').getBoundingClientRect().top, sys: bottom(sys) };
    sys.hidden = true; document.body.classList.remove('vertical');
    return { wide, tall };
  })()`);
  expect('the notice and the first visit\'s hint sit above the bar', clear.wide.notice <= clear.wide.top && clear.wide.hint <= clear.wide.top, clear.wide);
  expect('in the 9:16 layout the machine readout sits above it too', clear.tall.sys <= clear.tall.top, clear.tall);
  facts.clearOfTheBar = clear;

  console.log('narrow, vertical and touch screens');
  const layouts = {};
  for (const [name, w, h, touch, cls] of [['wide-1100', 1100, 700], ['short-1100', 1100, 560], ['two-rows-800', 800, 600], ['no-status-480', 480, 800], ['vertical-562', 562, 1000, false, 'vertical'], ['touch-1024', 1024, 768, true], ['touch-phone-390', 390, 844, true]]) {
    await size(w, h, !!touch);
    if (cls) await ev(`document.body.classList.add('${cls}')`);
    await sleep(900);
    const l = layouts[name] = await ev(`(() => { const p = document.getElementById('player'); const r = p.getBoundingClientRect(); return { h: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), status: getComputedStyle(p.querySelector('.pl-status')).display, buttons: [...p.querySelectorAll('.pl-btn')].filter((x) => !x.hidden).map((x) => Math.round(x.getBoundingClientRect().height)), track: Math.round(p.querySelector('.pl-track').getBoundingClientRect().height), overflow: p.scrollWidth > p.clientWidth, reserved: __nc.playerBar.reserved(), roll: (() => { const roll = document.getElementById('roll'), q = roll.getBoundingClientRect(); return { cut: roll.classList.contains('cut'), height: Math.round(q.height), bottom: Math.round(q.bottom), barTop: Math.round(r.top) }; })() }; })()`);
    await shot(`layout-${name}`); await shot(`layout-${name}-bar`, true);
    if (cls) await ev(`document.body.classList.remove('${cls}')`);
    expect(`${name}: it fits (no overflow), sits just above the footer, and what it reserves is its height and the footer's strip`, !l.overflow && l.bottom === 32 && l.reserved === l.h + l.bottom, l);
    expect(`${name}: the code's roll is cut where it would run under the bar, and never sits under it`, l.roll.cut || l.roll.height === 0 || l.roll.bottom <= l.roll.barTop + 1, l.roll);
    if (name === 'two-rows-800') expect('800 px: two rows, with the status line', l.h === 62 && l.status !== 'none', l);
    if (name === 'no-status-480') expect('480 px: two rows, no status line', l.h === 62 && l.status === 'none', l);
    if (touch) expect(`${name}: buttons and track of 44 px or more`, l.buttons.every((x) => x >= 44) && l.track >= 44, l);
  }
  await size(0);
  facts.layouts = layouts;
} finally {
  await size(0).catch(() => {});
  await ev(`document.body.classList.remove('recording', 'vertical'); __nc.setPlayerBar(true); __nc.setPlayerRec(false); document.getElementById('notice').hidden = true`).catch(() => {});
  station.close();
  ws.close();
}
expect('no error in the page the whole way through', errors.length === 0, errors.slice(0, 3));
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ facts, failures, errors, when: new Date().toISOString() }, null, 2));
// the pictures on one page, the bar's own crops first, each with its name
const pictures = fs.readdirSync(out).filter((f) => f.endsWith('.png')).sort((a, b) => (b.endsWith('-bar.png') - a.endsWith('-bar.png')) || a.localeCompare(b));
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>the player bar</title>
<style>body{margin:16px;background:#222;color:#ddd;font:13px ui-monospace,monospace}figure{margin:0 0 14px}img{display:block;max-width:100%;border:1px solid #444}figcaption{margin:2px 0}</style>
${pictures.map((f) => `<figure><figcaption>${f}</figcaption><img src="${f}" loading="lazy"></figure>`).join('\n')}
`);
console.log(failures.length ? `\n${failures.length} thing(s) not as they should be; see ${out}/report.json` : `\nall as it should be; pictures, index.html and report.json in ${out}`);
process.exit(failures.length ? 1 : 0);
