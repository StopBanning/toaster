// Toaster: wires the audio sources, the listening engine, the code view and the visuals.
import { createEngine, NOTES, nowSec, ROLL_COLS } from './engine.js';
import { buildLines, LINE_IDS, resetCodegen, strudelProgram, strudelLink } from './codegen.js';
import { createCodeView, nextCodeSetting } from './codeview.js';
import { createField, createTunnel, createPunchcard, createWebcam, rgbOf, bands, RAMP, GAME_SCREENS, setGameScreens, setGameCode } from './visuals.js';
import { createOrb } from './orb.js';
import { createDotCam } from './dotcam.js';
import { createVoxCam } from './voxcam.js';
import { createTakeover, createSysinfo, showBsod, xpAlert } from './fx.js';
import { createStorm } from './storm.js';
import { createCard } from './card.js';
import { createGlass } from './glass.js';
import { createTracker } from './tracking.js';
import { createLens } from './lens.js';
import { createPortal } from './portal.js';
import { createSegcam } from './segcam.js';
import { createGestures } from './gestures.js';
import { createHandLog } from './handlog.js';
import { createSpiral, createWheel } from './rings.js';
import { createFire } from './fire.js';
import { createWarp } from './warp.js';
import { createWorlds } from './worlds.js';
import { createChrome } from './chrome.js';
import { createSpectro } from './spectro.js';
import { createScenery, FIELD } from './scenery.js';
import { createWait } from './wait.js';
import { createCuts } from './cuts.js';
import { createTape } from './tape.js';
import { buildSongFiles } from './tape-export.js';
import { createClips } from './clips.js';
import { makeDemo } from './demo.js';
import { NEWS, newsSince } from './news.js';
import { createControls } from './controls.js';
import { createPalette, actionCommands } from './palette.js';
import { advanceHints, initialHints } from './firstrun.js';
import { createBugReport, errorSummary } from './bug-report.js';
import { PRESETS, applyPreset } from './presets.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const VISUALS = ['spectrum', 'tunnel', 'spiral', 'pitchwheel', 'warp', 'cuts', 'worlds', 'chrome', 'spectrogram', 'scenery', 'rain', 'scope', 'fire', 'off'];
// What V goes round, best first, and their names on screen. The rest of VISUALS (spectrum, tunnel, spiral, pitch wheel,
// warp, scope) are out of the round since 0.4.23: kept unlisted for a release, in case someone misses one, then gone.
// The rain came back in 0.4.26: someone did miss it. The rest stay out of V but can be picked by name in Ctrl+K
// ("background: warp (classic)"), and stay picked.
const V_ROUND = ['scenery', 'worlds', 'chrome', 'spectrogram', 'cuts', 'fire', 'rain', 'off'];
const V_NAME = { scenery: 'scenes', pitchwheel: 'pitch wheel' };
const visName = (v) => V_NAME[v] || v;
const ON_VIS = ['tunnel', 'spiral', 'pitchwheel', 'cuts', 'fire']; // the backgrounds drawn on the #vis canvas
const FIELD_VIS = ['spectrum', 'rain', 'scope']; // and the ones drawn as ASCII, on #field
const THEMES = ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen'];
const DROPS = ['xp takeover', 'blue screen', 'not responding', 'off'];
// The camera's effects (K): none, just you over the visuals, slit-scan, datamosh, windows, glass,
// dots, voxels.
const CAM_FX = ['none', 'cut-out', 'slit-scan', 'datamosh', 'windows', 'glass', 'dots', 'voxels'];
// How strongly the ASCII background shows (A): a multiple of each theme's own strength (--field).
const STRENGTHS = [['soft', 1], ['normal', 1.5], ['bold', 2.2]];

// ---------------------------------------------------------------- audio

const ac = new AudioContext({ latencyHint: 'interactive' });
const analyser = (size) => {
  const a = ac.createAnalyser();
  a.fftSize = size;
  a.smoothingTimeConstant = 0;
  return a;
};
const fast = analyser(1024), mid = analyser(4096), slow = analyser(16384);
const eng = createEngine({ fast, mid, slow, sampleRate: ac.sampleRate });
eng.tape = createTape(); // the song as heard, for X
eng.tape.who = () => songNames(currentSong());
const view = createCodeView(LINE_IDS);
setGameCode(() => view.snapshot()); // (the handheld's bottom screen shows the code while it's typed)
let fieldView = null, fieldPool = '';
const field = {
  get waiting() { return !fieldView || fieldView.waiting; },
  clear: () => fieldView?.clear(),
  kick: (s) => fieldView?.kick(s),
  setPool(text) { fieldPool = text; fieldView?.setPool(text); },
  draw(...args) {
    if (!fieldView) {
      fieldView = createField($('field'));
      if (fieldPool) fieldView.setPool(fieldPool);
    }
    fieldView.draw(...args);
  },
};
// the camera as text (C's fourth setting): a layer of its own, over whichever background is picked,
// made the first time it's shown (a graphics context and a window-sized buffer otherwise kept from
// startup for a setting most never use)
let asciiCamField = null;
const asciiCam = { get waiting() { return !asciiCamField || asciiCamField.waiting; }, clear: () => asciiCamField?.clear(), draw: (...a) => (asciiCamField ??= createField($('asciicam'))).draw(...a) };
const tunnel = createTunnel($('vis'));
const spiral = createSpiral($('vis')), wheel = createWheel($('vis')); // on the tunnel's canvas
const fire = createFire($('vis')); // and the fire
const warp = createWarp($('warp'));
const worlds = createWorlds($('worlds'), $('worldwords'));
const chrome = createChrome($('chrome'));
const spectro = createSpectro($('spectro'), $('spectrobox')); // the spectrogram, and the pins over it
const scenery = createScenery($('scenery'));
const wait = createWait($('wait'), FIELD);
const cuts = createCuts($('vis')); // on the tunnel's canvas too
const punch = createPunchcard($('punch')); // its own layer, so it can sit on top of any background
const cam = createWebcam($('cam'));
const dotCam = createDotCam($('dotcam'));
const voxCam = createVoxCam($('voxcam'));
const tracker = createTracker(); // hands and face, while the camera is on
const takeover = createTakeover({
  back: $('desk-back'), front: $('desk-front'),
  sources: { cam: () => cam.on, face: () => meshFace() || cam.face, crop: (r, out, w, h) => cam.drawCrop(r, out, w, h) },
});
const sys = createSysinfo($('sys'), () => describeAudio());
const card = createCard($('card'));
const glass = createGlass($('glass'), $('code'));
const orb = createOrb($('orb'));
const LAYERS = ['cam', 'voxcam', 'dotcam', 'worlds', 'worldwords', 'chrome', 'spectro', 'spectrobox', 'scenery', 'vis', 'warp', 'field', 'asciicam', 'orb', 'punch'].map($); // the background canvases, bottom first, for the glass
const storm = createStorm($('storm')); // the drop effect "not responding"
const STORM_LAYERS = [...LAYERS, $('glass')]; // (what its window shows: the backgrounds, and the glass blob over them)
const lens = createLens($('lens')); // the finger frame
const portal = createPortal($('portal')); // portals
const segcam = createSegcam($('segcam')); // big eyes
const gestures = createGestures(); // hand signs: theme, record, hush
const handLog = createHandLog(); // Ctrl+Shift+H: the hands as numbers, for tuning

// The face for the close-ups and the card: from MediaPipe's face landmarks when they're being
// tracked (exact), else the system's face box and the eye finder (visuals.js). Shaped like
// Windows' box (from just above the eyebrows to just under the mouth), which the close-ups
// are framed for. The Mac helper crops its box to that same shape.
function meshFace() {
  const f = tracker.face;
  if (!f || !cam.on) return null;
  const at = (i) => cam.toPicture(f[i][0], f[i][1]);
  const xs = [234, 454].map((i) => at(i)[0]), cx = (xs[0] + xs[1]) / 2, w = Math.abs(xs[1] - xs[0]) * 0.84;
  const brow = Math.min(...[70, 63, 105, 66, 107, 336, 296, 334, 293, 300].map((i) => at(i)[1])), lip = at(17)[1], span = lip - brow;
  const eyes = [468, 473].map(at).sort((a, b) => a[0] - b[0]);
  return { x: cx - w / 2, y: brow - span * 0.1, w, h: span * 1.15, eyes, sure: 999 };
}

// The desktop handheld (?widget, its own window, opened by W with the handheld on): only the handheld game, on
// nothing, listening for itself. It keeps nothing: what's picked in it isn't saved over the main window's settings.
const WIDGET = new URLSearchParams(location.search).has('widget');

const state = {
  source: null, label: '', node: null, stream: null, el: null, demo: null,
  winSong: null, winKey: '', manual: null,
  radioSong: null, radioKey: '', // the radio's song, from the titles in its stream (see radioTitle)
  visual: VISUALS.indexOf('scenery'), strength: 1, blocks: true, blockLook: 'dominoes', gameScreens: GAME_SCREENS[0], orb: false, theme: 0, drop: 0, info: false, vertical: false, glass: false, chromeCollage: true,
  mini: false, // the mini player (W): a small window over everything else
  codeHidden: false, // Z: the code hidden, just the visuals (Toaster as a visualizer)
  beatHidden: false, // Z's middle setting: just the beat hidden, the drum lines and their grid (for music with no pulse)
  crt: false, // Y: an old screen over everything (see #tube in the CSS)
  eyes: false, // the camera's third setting: big eyes over your face
  ascii: false, // and its fourth: the camera as text, in place of the ASCII background
  camFx: 0, // the camera's effect (K), in CAM_FX
  worldLook: 'auto', // the worlds' look (A while they're on): auto, night, film, ascii, ink, risograph...
  spectroTheme: false, // the spectrogram in the theme's colours rather than the rainbow (A while it's on)
  sceneryTheme: false, // the scenery in the theme's two colours rather than its own (A while it's on)
  sceneryScene: 'auto', // and its scene (A too): auto (a new one each song), or one by name
  calm: false, // fewer flashes (the help's setting; on at first if Windows' animations are off)
  updates: true, // look for a newer Toaster when it starts (the help's setting)
  radio: '', // the radio's address, as last played
  seenVersion: '', // the version last opened, to tell what's new after an update
  firstRun: false, // nothing saved yet: this is the first time Toaster has opened
  hintsDone: true, // the first visit's key hints are over (only a first run starts without it)
  hushed: false, // every part muted and the picture dimmed (a raised fist, or Q)
  card: false, cardV: true, // the ID card in the wide layout, and in the vertical one (on there unless you turn it off)
  cardBig: false, // and big (N a second time): the same card as big as fits
  syncTrim: 0, // your fine-tuning of the blocks' timing, in ms ([ and ] keys); see syncOffset()
  keys: {}, // the keys you changed: action -> key (see ACTIONS)
};
let col = { bg: [5, 29, 181], fg: [255, 255, 255], ink: [2, 11, 69] };

// The look you picked (background and its strength, blocks, orb, card, glass, theme, drop effect)
// is remembered between launches. The camera always starts off.
const SAVED = ['hintsDone', 'keys', 'codeHidden', 'beatHidden', 'crt', 'strength', 'blocks', 'blockLook', 'gameScreens', 'orb', 'card', 'cardV', 'cardBig', 'glass', 'theme', 'drop', 'syncTrim', 'camFx', 'calm', 'updates', 'worldLook', 'chromeCollage', 'spectroTheme', 'sceneryTheme', 'sceneryScene', 'radio', 'seenVersion'];
function loadSettings() {
  let saved = {};
  try {
    const kept = localStorage.getItem('now-coding');
    state.firstRun = kept === null;
    saved = JSON.parse(kept || '{}');
    state.hintsDone = typeof saved.hintsDone === 'boolean' ? saved.hintsDone : !state.firstRun;
    for (const k of SAVED) if (k in saved) state[k] = saved[k];
  } catch { /* first run, or storage unavailable */ }
  // fewer flashes: as you set it, or (till you do) as Windows' "Show animations" says
  if (typeof saved.calm !== 'boolean') state.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  state.orb = state.orb === true;
  // The background is saved by name (older versions saved its number in the list). The orb (and
  // the scenes before it) used to be a background; if that's what was picked, it's the orb on its
  // own: the orb on, the background off.
  const name = typeof saved.visualName === 'string' ? saved.visualName : VISUALS[saved.visual];
  if (name === 'orb' || name === 'scenes') { state.orb = true; state.visual = VISUALS.indexOf('off'); }
  else if (VISUALS.includes(name)) state.visual = VISUALS.indexOf(name); // (none saved, a first start: the scenes, as state starts)
  // (the old strengths and the glass: back to the round's own; a classic background picked by name stays)
  state.strength = 1; state.glass = false;
  if (!['auto', 'night', 'film', 'ascii', 'thermal', 'cells'].includes(state.worldLook)) state.worldLook = 'auto'; // (worlds.js's looks)
  if (!(state.theme in THEMES)) state.theme = 0;
  // the drop effect too (older versions saved its number, in a list without "not responding"); off till
  // it's set: the scenes take the drop themselves, and a takeover over them was clunky
  const dropName = typeof saved.dropName === 'string' ? saved.dropName : ['xp takeover', 'blue screen', 'off'][saved.drop];
  state.drop = DROPS.includes(dropName) ? DROPS.indexOf(dropName) : DROPS.indexOf('off');
  if (!Number.isFinite(state.syncTrim)) state.syncTrim = 0;
  if (!(state.strength in STRENGTHS)) state.strength = 1;
  if (!(state.camFx in CAM_FX)) state.camFx = 0;
  if (!BLOCK_LOOKS.includes(state.blockLook)) state.blockLook = 'blocks';
  if (!GAME_SCREENS.includes(state.gameScreens)) state.gameScreens = GAME_SCREENS[0];
  setGameScreens(state.gameScreens);
  if (!worlds.looks.includes(state.worldLook)) state.worldLook = 'auto';
  worlds.setLook(state.worldLook);
  state.card = state.card === true;
  state.cardV = state.cardV !== false;
  state.cardBig = state.cardBig === true;
  state.spectroTheme = state.spectroTheme === true;
  state.sceneryTheme = state.sceneryTheme === true;
  if (!['auto', ...scenery.scenes].includes(state.sceneryScene)) state.sceneryScene = 'auto';
  // the keys you changed: kept if they're single keys not taken twice
  const keys = state.keys && typeof state.keys === 'object' ? state.keys : {};
  state.keys = {};
  const used = new Set();
  for (const [id, k] of Object.entries(keys)) if (typeof k === 'string' && k && !used.has(k)) { state.keys[id] = k; used.add(k); }
  state.glass = state.glass === true;
  state.codeHidden = state.codeHidden === true;
  state.beatHidden = state.beatHidden === true && !state.codeHidden;
  state.crt = state.crt === true;
}

// How far ahead (seconds) to draw the blocks so they land when you hear the beat. The beat clock
// follows the hits as the app detects them, which is about 14 ms after they reach it. When they
// reach it, relative to your ears, depends on the source (measured with tools/checks.js):
// system audio arrives about as the speakers play it (Windows' capture takes about as long as
// the speakers do, ~53 ms round trip); the app's own playback (demo, files) is analysed about
// 8 ms more than one output delay before the speakers play it; an input takes ~30 ms to capture.
// A frame takes ~35 ms to reach the screen. Your [ / ] fine-tuning goes on top.
// How long after the app gets a hit you hear it (ms): system audio about as it arrives, the demo
// and files after the speakers' latency and a little more, a mic before (you hear the room).
function heardAfter() {
  const output = ac.outputLatency ? ac.outputLatency * 1000 : 40;
  return state.source === 'system' ? 0 : state.source === 'input' ? -30 : output + 8;
}
function syncOffset() {
  const display = 35, notice = 14;
  return (display + notice - heardAfter() + state.syncTrim) / 1000;
}
function saveSettings() {
  if (WIDGET) return;
  const out = Object.fromEntries(SAVED.map((k) => [k, state[k]]));
  out.visualName = VISUALS[state.visual];
  out.dropName = DROPS[state.drop];
  try { localStorage.setItem('now-coding', JSON.stringify(out)); } catch { /* ignore */ }
}

function detach() {
  try { state.node?.disconnect(); } catch { /* already gone */ }
  state.stream?.getTracks().forEach((t) => t.stop());
  if (state.el) {
    const src = state.el.src;
    state.el.pause(); state.el.removeAttribute('src'); state.el.load();
    if (src.startsWith('blob:')) URL.revokeObjectURL(src); // the file it played, let go
  }
  state.demo?.stop();
  state.node = state.stream = state.el = state.demo = null;
  // (and the radio's titles, read beside its stream)
  window.nc?.radioTitles?.(null);
  state.radioSong = radioArt = null;
  state.radioKey = '';
}

function attach(node, source, label) {
  node.connect(fast);
  node.connect(mid);
  node.connect(slow);
  state.node = node;
  state.source = source;
  state.label = label;
  tapRecording();
  clips.retap();
  // a file or the demo plays from its start; system audio, inputs and the radio may be halfway through a song
  freshStart(source === 'file' || source === 'demo');
  $('menu').hidden = true;
  document.body.classList.add('live');
  $('status').classList.add('on');
  $('status').textContent = '● live';
}

// New source or new song: wipe the screen and start typing again from a blank window. top: the
// song starts now, from its beginning (see listenOpening in engine.js).
function freshStart(top = false) {
  if (state.hushed) setHush(false); // a new song comes in unhushed
  punch.newSong(gameShowing() && !eng.silent);
  eng.reset({ top });
  eng.ledger.startCapture({ source: state.source, sourceId: state.label, startTime: nowSec() });
  resetCodegen();
  view.clear();
  takeover.stop();
  glitch();
  clipsThisSong = 0;
  lastClipAt = -99;
  nextAutoScene();
}

// System audio: main.js answers this request with the machine's loopback, so there's no picker.
// On the Mac that's audio only (a Core Audio tap). Windows' loopback rides on a screen source,
// which this asks for and then drops. Voice-call processing (echo cancelling, noise suppression,
// auto gain) is on by default. On music it costs CPU and hurts: noise suppression squashes hats
// and claps, auto gain flattens the dynamics.
const onMac = () => document.documentElement.classList.contains('darwin');
const RAW_AUDIO = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
// An iPhone or iPad, in any browser (they all run on WebKit). An iPad's browser reports itself as a Mac
// by default, but a Mac has no touch screen.
const onIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1);
const iosBrowser = () => (/CriOS/.test(navigator.userAgent) ? 'Chrome' : /FxiOS/.test(navigator.userAgent) ? 'Firefox' : /EdgiOS/.test(navigator.userAgent) ? 'Edge' : 'Safari');

// Each pick of a source takes a ticket: one still opening when another is picked (system audio
// can take a moment) gives up when it's ready, letting go of what it opened, instead of taking
// over from the one you picked after it.
let picking = 0;
const outdated = (ticket) => ticket !== picking;

async function useSystem() {
  const ticket = ++picking;
  await ac.resume();
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: RAW_AUDIO, video: !onMac() });
  const track = stream.getAudioTracks()[0];
  if (!track || outdated(ticket)) {
    stream.getTracks().forEach((t) => t.stop());
    if (!track && !outdated(ticket)) throw new Error(onMac() ? 'macOS did not hand over any audio.' : 'Windows did not hand over any audio.');
    return;
  }
  await track.applyConstraints(RAW_AUDIO).catch(() => {}); // in case the first request was ignored
  stream.getVideoTracks().forEach((t) => t.stop()); // only the sound is needed
  if (outdated(ticket)) { track.stop(); return; }
  detach();
  state.stream = stream;
  track.addEventListener('ended', () => { if (state.stream === stream) showMenu('System audio stopped. Pick a source.', 'warning'); });
  attach(ac.createMediaStreamSource(new MediaStream([track])), 'system', 'system audio');
}

async function useDemo() {
  const ticket = ++picking;
  await ac.resume();
  if (outdated(ticket)) return;
  detach();
  state.demo = makeDemo(ac);
  attach(state.demo.out, 'demo', 'demo beat');
}

// A file or the radio: an audio element, played to the speakers and heard by the analysis. load
// gives it what to play, once it's this pick's turn.
async function playElement(source, label, load) {
  const ticket = ++picking;
  await ac.resume();
  if (outdated(ticket)) return;
  detach();
  const el = new Audio();
  load(el);
  const node = ac.createMediaElementSource(el);
  node.connect(ac.destination);
  state.el = el;
  attach(node, source, label);
  try { await el.play(); } catch (err) {
    if (state.el !== el) return; // a newer source already took over
    detach();
    state.source = null;
    state.label = '';
    document.body.classList.remove('live');
    $('status').classList.remove('on');
    $('status').textContent = restingStatus();
    throw err;
  }
  if (outdated(ticket)) { el.pause(); return; }
  // (a stream that ends, or anything that drops, says so, as system audio does when it stops)
  el.onended = el.onerror = () => { if (state.el === el) showMenu(`${label} stopped playing. Pick a source.`, 'warning'); };
}

async function useFile(file) {
  await playElement('file', file.name, (el) => { el.src = URL.createObjectURL(file); el.loop = true; });
}

// The radio: the stream at an address you paste in (Toaster comes with no stations). It's read
// cross-origin, the only way the analysis hears another server's sound (see docs/how-it-works.md).
async function useRadio(address) {
  let url = null;
  try { url = new URL(address.trim()); } catch { /* not an address */ }
  if (!['http:', 'https:'].includes(url?.protocol)) throw new Error("That isn't a stream's address: paste one that starts with http:// or https://.");
  const label = url.host + url.pathname.replace(/\/$/, '');
  const browser = desktopApp() ? '' : ` In a browser, a stream only plays if its server lets other sites play it, and an https page can't play an http stream: the Toaster app for Windows or Mac has neither limit (${$('b-star').href}).`;
  await playElement('radio', label, (a) => { a.crossOrigin = 'anonymous'; a.src = url.href; }).catch(() => {
    throw new Error(`Could not play ${label}. The station may be off the air, or this isn't the stream itself (MP3 or AAC) but the station's page or a .pls or .m3u playlist (open one of those in a text editor: the stream's address is in it).${browser}`);
  });
  if (state.source !== 'radio') return; // (another pick took over before it played)
  state.radio = url.href; // (kept for next time once it plays)
  saveSettings();
  window.nc?.radioTitles?.(url.href); // (its songs' titles, in the app: see radioTitle)
}

// What went wrong when the microphone wouldn't open, said so it can be acted on. iOS asks about the
// microphone once per browser and, after a no (or if the browser was never allowed), refuses every
// page without a prompt, so there the way out is in its Settings.
function micTrouble(err, refused) {
  const name = err?.name || '';
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return "The browser only allows a microphone on a secure (https) page, and this one isn't. Open Toaster at https://toaster.locust.lol.";
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone found. Plug one in (or turn it on), then try again.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The microphone could not be started. Another app may be using it: close that, then try again.';
  if (!onIOS()) return refused;
  const b = iosBrowser();
  if (navigator.standalone) return 'iOS has not allowed the microphone for this home-screen page. Open toaster.locust.lol in Safari instead, allow the microphone there, and try again.';
  return `iOS is not letting ${b} use the microphone, and it only asks once. Open the Settings app, find ${b} and turn Microphone on (on newer iOS: Settings, Apps, ${b}). Then close ${b} completely, open this page again and tap "audio input".`
    + (b === 'Safari' ? ' (In Safari you can also tap aA in the address bar, then Website Settings, then Microphone, then Allow.)' : '');
}
const openMic = async (audio, refused) => {
  try { return await navigator.mediaDevices.getUserMedia({ audio }); }   // (no mediaDevices at all on an insecure page: it throws, so the words come from here too)
  catch (err) { throw new Error(micTrouble(err, refused)); }
};

// (iOS counts a request as the tap's only if nothing is waited on before it, and a list of inputs needs
// a request first. So on iOS there is no list: one request, at once, for the microphone it hands over.)
async function chooseInput() {
  if (onIOS()) return useInput(null);
  const probe = await openMic(true, 'Allow microphone access so the inputs can be listed.');
  let inputs;
  try { inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput'); }
  finally { probe.getTracks().forEach((t) => t.stop()); }
  const list = $('device-list');
  list.innerHTML = '';
  for (const d of inputs) {
    const b = document.createElement('button');
    b.textContent = d.label || 'input ' + d.deviceId.slice(0, 6);
    b.onclick = () => { $('devices').close(); useInput(d.deviceId, d.label).catch(showError); };
    list.append(b);
  }
  if (!inputs.length) list.textContent = 'No audio inputs found.';
  $('devices').showModal();
}

// (no deviceId: the browser's default microphone. The sound is asked to start in the same breath as the
// microphone, not before it, which on iOS may cost the tap.)
async function useInput(deviceId, label) {
  const ticket = ++picking;
  const resumed = resumeAudio();
  const stream = await openMic({ ...(deviceId ? { deviceId: { exact: deviceId } } : {}), ...RAW_AUDIO }, 'Microphone access was refused. Allow it for this page (or in your system settings), then try again.');
  await resumed;
  if (outdated(ticket)) { stream.getTracks().forEach((t) => t.stop()); return; }
  detach();
  state.stream = stream;
  state.inputId = deviceId;
  const track = stream.getAudioTracks()[0];
  // (hidden, the microphone is the system's to take: coming back to the page revives it)
  track?.addEventListener('ended', () => { if (state.stream === stream && !document.hidden) revive(); });
  track?.addEventListener('mute', () => setTimeout(() => { if (state.stream === stream && track.muted && !document.hidden) revive(); }, 1500));
  attach(ac.createMediaStreamSource(stream), 'input', label || track?.label || 'audio input');
  if (ac.state !== 'running') waitForTap();
}

// iOS (Safari on an iPad or a phone) stops a page's sound when it's interrupted: the screen locks, another app plays,
// the page goes to the background. Its audio then sits suspended (or 'interrupted'), and a microphone's track ends or
// stays muted, until a tap brings it back; and an iPad has no keyboard to pick the source again with. So when the
// sound stops while a source is on, it's brought back at once if it can be, and if not, the next tap anywhere does it
// (a note says so). A microphone that went dead is opened again: ended, muted, or giving exact zeros, which no real
// microphone does (once per silence: a line-in with nothing playing is silent, and opening it again won't change that).
let reviving = null, tapToRevive = null, inputDead = 0, deadTried = false;
// (resume() can sit pending for good: without a tap on some browsers, and after an interruption on iOS)
const resumeAudio = () => (ac.state === 'running' ? Promise.resolve() : Promise.race([ac.resume(), new Promise((r) => setTimeout(r, 3000))]).catch(() => {}));
async function reviveAudio() {
  if (!state.source) return true;
  await resumeAudio();
  if (state.source === 'input') {
    let tr = state.stream?.getAudioTracks()[0];
    if (tr?.muted && tr.readyState !== 'ended') { await new Promise((r) => setTimeout(r, 1000)); tr = state.stream?.getAudioTracks()[0]; }   // (it often unmutes by itself on coming back)
    if (!state.source) return true;
    if (!tr || tr.readyState === 'ended' || tr.muted || inputDead >= 4) {
      inputDead = 0;
      try { await useInput(state.inputId, state.label); } catch { return false; }
    }
  }
  return ac.state === 'running';
}
function revive() {
  reviving ||= reviveAudio().then((ok) => { reviving = null; if (!ok) waitForTap(); else clearTapNote(); return ok; });
  return reviving;
}
const TAP_EVENTS = ['pointerup', 'touchend', 'keydown'];
function clearTapNote() {
  if (!tapToRevive) return;
  TAP_EVENTS.forEach((e) => removeEventListener(e, tapToRevive, true));
  tapToRevive = null;
  hideNotice();
  flashStatus('back on');
}
function waitForTap() {
  if (tapToRevive) return;
  showNotice('the sound stopped: tap anywhere to turn it back on', null, true);
  tapToRevive = async () => {   // (started inside the tap: that's what lets resume() through)
    if (await reviveAudio()) clearTapNote();
  };
  TAP_EVENTS.forEach((e) => addEventListener(e, tapToRevive, true));
}
ac.addEventListener('statechange', () => {
  if (ac.state === 'running') { if (tapToRevive) tapToRevive(); }   // (iOS can bring it back by itself when the interruption ends)
  else if (state.source && !document.hidden) revive();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.source) revive(); });
const deadProbe = new Float32Array(fast.fftSize);
setInterval(() => {
  if (state.source !== 'input' || document.hidden || ac.state !== 'running') { inputDead = 0; return; }
  fast.getFloatTimeDomainData(deadProbe);
  if (!deadProbe.every((v) => v === 0)) { inputDead = 0; deadTried = false; return; }
  inputDead++;
  if (inputDead >= 4 && !deadTried) { deadTried = true; revive(); }
}, 1000);

function describeAudio() {
  const rate = `${ac.sampleRate / 1000} kHz`;
  return state.source === 'system' ? `system loopback · ${rate}` : `${state.label || 'none'} · ${rate}`;
}

// The source menu, with an optional message shown as an XP message box on top.
function showMenu(msg = '', icon = 'error') {
  $('menu').hidden = false;
  if (msg) xpAlert($('alerts'), { title: 'toaster.exe', icon, text: msg });
}
// The last few errors, by type only, for a bug report's details (renderer/bug-report.js).
const recentBugErrors = [];
function retainBugError(err) {
  recentBugErrors.push({ name: errorSummary(err) });
  if (recentBugErrors.length > 5) recentBugErrors.shift();
}
addEventListener('error', (e) => retainBugError(e.error));
addEventListener('unhandledrejection', (e) => retainBugError(e.reason));
function showError(err) {
  retainBugError(err);
  showMenu(String(err?.message || err));
}

// ---------------------------------------------------------------- what's playing

// Where the code is on screen (its lines' text and the panels between them), for the worlds to
// keep their words clear of it. Measured only when they cut to a new world.
function codeBox() {
  if (state.codeHidden) return null; // (hidden (Z): nothing to keep clear of)
  let top = Infinity, bottom = -Infinity, right = 0, lines = -Infinity;
  const panels = [];
  for (const el of document.querySelectorAll('#code .ln .txt, #code .panel')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.classList.contains('cut')) continue; // (the roll, hidden)
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    right = Math.max(right, r.right);
    if (el.classList.contains('panel')) panels.push(r);
    else lines = Math.max(lines, r.bottom);
  }
  if (!Number.isFinite(top)) return null;
  // how far right the panels reach that hang below the last line (the chords' roll)
  const panelRight = Math.max(0, ...panels.filter((r) => r.bottom > lines).map((r) => r.right));
  return { top, bottom, right, lines: Number.isFinite(lines) ? lines : top, panelRight };
}

// Each code line's text as it is now (or is being typed toward), by line id.
const lineTexts = () => Object.fromEntries(LINE_IDS.map((id) => [id, view.lines[id].target || view.lines[id].shown]));

function currentSong() {
  if (state.manual) return state.manual;
  if (state.source === 'system') return state.winSong;
  if (state.source === 'radio') return state.radioSong;
  if (state.source === 'demo') return { title: 'demo_beat', artist: 'Toaster' };
  if (state.source === 'file') return { title: state.label.replace(/\.[^.]+$/, ''), artist: 'File' };
  // (an input, or the radio without a title: none, which also lets the engine drop a beat that's
  // gone, as when a station goes from a song to talking: see song() in engine.js)
  return null;
}

// The song's cover from Windows (a small image, for the ID card), decoded once a cover. Not an
// app's icon: a browser playing a song hands Windows its own icon (Chrome's) until the song's
// cover arrives, and an icon has see-through corners, which a cover (a JPEG, or a square PNG)
// doesn't; till the cover comes, the card shows the camera or the sound.
let artSrc = '', artImg = null;
function isIcon(im) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, 16, 16);
  const d = g.getImageData(0, 0, 16, 16).data, alpha = (x, y) => d[(y * 16 + x) * 4 + 3];
  return [alpha(0, 0), alpha(15, 0), alpha(0, 15), alpha(15, 15)].filter((a) => a < 128).length >= 3;
}
window.nc?.onNowPlaying((info) => {
  if ((info?.art || '') !== artSrc) {
    artSrc = info?.art || '';
    artImg = null;
    if (artSrc) { const im = new Image(); im.onload = () => { if (im.src === artSrc && !isIcon(im)) artImg = im; }; im.src = artSrc; }
  }
  const song = info?.title ? { title: info.title, artist: info.artist || '', app: (info.app || '').replace(/\.exe$/i, '') } : null;
  state.winSong = song;
  state.winPlaying = !!info?.playing;
  // A new song on the system: start over, the way the code gets rewritten for each track. Only a
  // different title counts: a reading without one (between tracks, or a hiccup) or an artist that
  // fills in late is still the same song.
  const key = song ? song.title.trim().toLowerCase() : '';
  if (!key || key === state.winKey) return;
  state.winKey = key;
  const reset = state.source === 'system' && !state.manual && eng.tempo.locked;
  eng.note(`now playing: ${song.title} | ${song.artist} (${info.app || '?'}, ${info.playing ? 'playing' : 'paused'})${reset ? ' -> reset' : ''}`);
  if (state.source === 'system') { clipsThisSong = 0; lastClipAt = -99; }
  if (reset) freshStart(true);
});

// The radio's song, from the titles main.js reads in its stream. A title arrives with its sound's
// bytes, which the player plays after what it has buffered ahead of them, so it's taken on then. A new
// title starts over, as a new song on the system does: not the first (joined halfway through), nor the
// same one again after a gap without one (a DJ talking). Its cover is looked up in the iTunes Store
// (main.js) once a song, and only the latest song's is shown.
let radioArt = null;
const radioCovers = new Map(); // 'artist title' -> a promise of its cover (an image, or null)
window.nc?.onRadioTitle?.((song) => {
  const el = state.el, b = el?.buffered;
  setTimeout(() => radioTitle(el, song), b?.length ? Math.max(0, b.end(b.length - 1) - el.currentTime) * 1000 : 0);
});
function radioTitle(el, song) {
  if (state.source !== 'radio' || state.el !== el) return; // (another source since, or the radio again)
  const key = song ? `${song.artist} ${song.title}` : '';
  state.radioSong = song;
  radioArt = null;
  if (song?.artist) {
    if (!radioCovers.has(key)) {
      radioCovers.set(key, window.nc.radioCover(song.artist, song.title).then(async (bytes) => {
        if (!bytes) return null;
        const im = new Image();
        im.src = URL.createObjectURL(new Blob([bytes]));
        await im.decode();
        URL.revokeObjectURL(im.src);
        return im;
      }).catch(() => { radioCovers.delete(key); return null; })); // (one that couldn't be asked is asked again next time)
    }
    radioCovers.get(key).then((im) => { if (state.radioSong === song) radioArt = im; });
  }
  if (!key || key.toLowerCase() === state.radioKey) return;
  const reset = !!state.radioKey && !state.manual && eng.tempo.locked;
  state.radioKey = key.toLowerCase();
  eng.note(`radio: ${song.title} | ${song.artist}${reset ? ' -> reset' : ''}`);
  clipsThisSong = 0; lastClipAt = -99;
  if (reset) freshStart(true);
}

// The playing song's picture, for the ID card and the backgrounds that show it: Windows' cover for the
// system's song, the iTunes Store's for the radio's, none for a name you gave it. (An image, so it draws
// on a canvas and loads as a texture.)
function songArt() { return state.manual ? null : state.source === 'system' ? artImg : state.source === 'radio' ? radioArt : null; }

eng.on.kick = (s) => {
  field.kick(s); spiral.kick(s); wheel.kick(s); glass.kick(s); segcam.kick(s); takeover.kick();
  lens.kick(s, state.calm);
  fire.kick(s, state.calm);
  portal.kick(s, state.calm);
  // the ones that punch the whole picture's light (the tunnel's flash, the warp, the camera's and
  // the card's glitches) sit out with fewer flashes on
  if (!state.calm) { tunnel.kick(s); warp.kick(s); cam.kick(s); card.kick(s); }
  if (state.crt && !state.calm && s > 0.4) crtKick();
  if (VISUALS[state.visual] === 'worlds') {
    // (whether it's the bar's first beat, a 16th either way; null before the beat is found)
    const t = nowSec(), at = eng.placeAt(t);
    worlds.kick(s, t, state.calm, eng.tempo.P || 0.5, at ? at.step === 15 || at.step <= 1 : null);
  }
};
// Drop clips: the first two drops of each song (the ones that matter, without a long night of
// a song that keeps dropping filling the disk). Turning them on again starts the count over.
// A 12 s gap (matching the engine's drop cooldown) keeps D on a real drop from starting a second clip.
let clipsThisSong = 0, lastClipAt = -99;
eng.on.drop = () => {
  const t = nowSec();
  if (clipsThisSong < 2 && t - lastClipAt > 12 && clips.drop()) { clipsThisSong++; lastClipAt = t; flashStatus('✂ clipping the drop…'); }
  if (VISUALS[state.visual] === 'worlds') worlds.drop(t, eng.bar);
  if (VISUALS[state.visual] === 'chrome') chrome.splash(state.calm);
  if (VISUALS[state.visual] === 'fire') fire.drop(t);
  portal.drop(t, eng.tempo.P || 0.5); // (the glass: you, back in view for a beat)
  if (state.blocks && state.blockLook === 'game') punch.drop(t, eng.tempo.P);
  if (state.crt && !state.calm) { replay(document.body, 'jolt'); crtStatic(); }
  const mode = DROPS[state.drop];
  // a bar's length in seconds; half a second a beat if the tempo isn't known yet
  if (mode === 'xp takeover') takeover.start(t, currentSong()?.title, (eng.tempo.P || 0.5) * 4);
  else if (mode === 'blue screen') showBsod($('bsod'), glitch);
  else if (mode === 'not responding') storm.start(t, eng.tempo.locked ? eng.tempo.bpm : 0);
};
eng.on.newSong = () => { resetCodegen(); view.clear(); takeover.stop(); storm.stop(); glitch(); clipsThisSong = 0; lastClipAt = -99; nextAutoScene(); };
// A known song keeps its beat through breakdowns and quiet parts (see tempoUpdate in engine.js). The
// radio's is known while it has a title: a station going from a song to talking sends an empty one,
// which lets the song go (radioTitle), and then the beat goes after a minute without one, as on an
// input. Only the system says a song is still playing: the radio's stream always plays, and a long
// silence on it is dead air or the next song (which brings its own title), not a quiet part.
eng.song = () => ({ known: !!currentSong(), playing: state.source === 'system' && !!state.winSong && !!state.winPlaying });

// ---------------------------------------------------------------- look

function glitch() {
  document.body.classList.remove('glitch');
  void document.body.offsetWidth;
  document.body.classList.add('glitch');
}

function applyTheme() {
  if (state.theme === 0) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = THEMES[state.theme];
  const cs = getComputedStyle(document.documentElement);
  const get = (name) => cs.getPropertyValue(name).trim();
  col = { bg: rgbOf(get('--bg')), fg: rgbOf(get('--fg')), ink: rgbOf(get('--ink')) };
  if (!onMac()) window.nc?.setTitleBar(get('--bg'), get('--fg'));
}

function setVisual(i) {
  state.visual = i;
  const mode = VISUALS[i];
  if (!FIELD_VIS.includes(mode)) field.clear();
  for (const [name, v] of [['tunnel', tunnel], ['spiral', spiral], ['pitchwheel', wheel], ['warp', warp], ['cuts', cuts], ['worlds', worlds], ['chrome', chrome], ['spectrogram', spectro], ['scenery', scenery], ['fire', fire]]) if (mode !== name) v.clear();
  $('b-visual').textContent = visName(mode) + ' ▾';
  queueMicrotask(footerKeys); // (A's word follows the background; after the page's first run, once the keys are set up)
  document.body.classList.toggle('worlds-on', mode === 'worlds');
  document.body.classList.toggle('chrome-on', mode === 'chrome');
  document.body.classList.toggle('spectro-on', mode === 'spectrogram');
  applyStage();
  saveSettings();
}

// Punchcard blocks: a layer of their own, on top of whichever background is picked.
// The ASCII background's strength: soft is how it always was, normal (the default) half again as
// strong, bold more than double. The code lines sit on their own bands, so they stay readable.
// A, while the worlds are on: their look, in turn (auto: film, and on a drop another for 8 bars)
function nextWorldLook() {
  const all = worlds.looks;
  state.worldLook = all[(all.indexOf(state.worldLook) + 1) % all.length];
  worlds.setLook(state.worldLook);
  flashStatus('look: ' + state.worldLook);
  saveSettings();
}
// A, while the chrome is on: the collage over it, off and on
function toggleCollage() {
  state.chromeCollage = !state.chromeCollage;
  flashStatus('collage: ' + (state.chromeCollage ? 'on' : 'off'));
  saveSettings();
}
// A, while the spectrogram is on: its colours, the rainbow or the theme's
function toggleSpectroColours() {
  state.spectroTheme = !state.spectroTheme;
  flashStatus('colours: ' + (state.spectroTheme ? "the theme's" : 'rainbow'));
  saveSettings();
}
// A, while the scenery is on: the next scene (auto, a new one each song; then each by name), and
// after the last, auto again in the theme's two colours rather than its own
const SCENE_NAMES = { auto: 'auto (a new one each song)', lake: 'the lake', sea: 'the sea', fire: 'the campfire', snow: 'the snow', city: 'the city in the rain', garden: 'the garden', falls: 'the falls', halloween: 'halloween', sharks: 'the sharks', festival: 'the festival', koi: 'the koi pond', space: 'space', eye: 'the eye' };
function nextScene() {
  const all = ['auto', ...scenery.scenes];
  if (state.sceneryTheme) { state.sceneryTheme = false; state.sceneryScene = 'auto'; }
  else if (state.sceneryScene === all[all.length - 1]) { state.sceneryTheme = true; state.sceneryScene = 'auto'; }
  else state.sceneryScene = all[all.indexOf(state.sceneryScene) + 1];
  flashStatus('scene: ' + (SCENE_NAMES[state.sceneryScene] || state.sceneryScene) + (state.sceneryTheme ? ", in the theme's colours" : ''));
  saveSettings();
}
// with auto, the scene shown: a new one each song, in turn (from one picked at random at the start)
// (Halloween's among them only in October)
let autoScene = Math.floor(Math.random() * 64), autoSceneAt = -99;
const autoScenes = () => scenery.scenes.filter((s) => s !== 'halloween' || new Date().getMonth() === 9);
const sceneShown = () => (state.sceneryScene === 'auto' ? autoScenes()[autoScene % autoScenes().length] : state.sceneryScene);
function nextAutoScene() {
  const t = nowSec();
  if (t - autoSceneAt < 20) return; // (a new source and the engine can both say so, for one song)
  autoSceneAt = t;
  autoScene++;
}
function setStrength(i, say) {
  state.strength = i;
  document.documentElement.style.setProperty('--field-k', STRENGTHS[i][1]);
  if (say) flashStatus('background: ' + STRENGTHS[i][0]);
  saveSettings();
}

function setBlocks(on) {
  state.blocks = on;
  if (!on) punch.clear();
  $('b-blocks').classList.toggle('on', on);
  gameOn();
  saveSettings();
}
// P: the punchcard blocks, then the dominoes (the same parts, each hit a domino the playhead
// knocks over as it plays), then the handheld game (game.js: the song played on a little two-screen
// handheld), then none, in turn.
const BLOCK_LOOKS = ['dominoes', 'game', 'blocks']; // (P's round, best first, then none)
function nextBlocks() {
  const i = BLOCK_LOOKS.indexOf(state.blockLook);
  if (!state.blocks) { state.blockLook = BLOCK_LOOKS[0]; setBlocks(true); }
  else if (i < BLOCK_LOOKS.length - 1) { state.blockLook = BLOCK_LOOKS[i + 1]; saveSettings(); }
  else setBlocks(false);
  gameOn();
  flashStatus('code look: ' + (!state.blocks ? 'none' : { blocks: 'punchcard', dominoes: 'dominoes', game: 'handheld game' }[state.blockLook]));
}
// The handheld game on (body.game-on: in the tall layout it stands in front of the code's lower lines, in the
// pitch roll's place; its pads show the notes). There, and in the mini player, where it's on its own, the ID card
// would sit on its top screen, and its cartridge has the song on it: the card steps aside while it's on. And A is the
// game's screens, in the footer too.
const gameShowing = () => state.blocks && state.blockLook === 'game';
function gameOn() { document.body.classList.toggle('game-on', gameShowing()); applyCard(); footerKeys(); }
// A, while the game is on: its screens' next design (Toaster's own look in the theme's colours, the neon,
// a reflective LCD, the Japan edition: Toaster's own in Japanese on a handheld of its own), remembered.
const SCREEN_NAMES = { os: "Toaster's own", neon: 'neon', lcd: 'LCD', jp: 'the Japan edition' };
function nextGameScreens() {
  state.gameScreens = GAME_SCREENS[(GAME_SCREENS.indexOf(state.gameScreens) + 1) % GAME_SCREENS.length];
  setGameScreens(state.gameScreens);
  saveSettings();
  flashStatus('screens: ' + SCREEN_NAMES[state.gameScreens]);
}

// The dot orb: a layer of its own, like the blocks, so it goes over any background (or none).
function setOrb(on) {
  state.orb = on;
  if (!on) orb.clear();
  $('b-orb')?.classList.toggle('on', on); // (its button is gone since 0.4.23; R has it again since 0.4.26)
  saveSettings();
}

// Z: the code hidden, just the visuals, for Toaster as a visualizer; or (beat) just its beat hidden, the drum lines
// and their grid, for music with no pulse (Z's middle setting: see nextCodeSetting). It's still written underneath,
// so it shows again as it stands.
function setCodeHidden(on, beat = false) {
  state.codeHidden = on;
  state.beatHidden = !on && beat;
  document.body.classList.toggle('nocode', on);
  document.body.classList.toggle('nobeat', state.beatHidden);
  footerKeys();
  saveSettings();
}
// what Z has done, and what it does next
function codeSaid() {
  return state.codeHidden ? `code hidden: ${K('code')} for all but the beat` : state.beatHidden ? `beat hidden: ${K('code')} shows it all` : 'code shown';
}

// Y: the CRT, an old TV over everything (#tube and body.tube-on in the CSS; .crt is the drop effect's
// monitor); its scanlines and phosphor stripes are spaced in whole device pixels, so the window's scale
// sets them. It comes on from a white line, as an old set does (at launch too, when it was left on), and
// goes off into a dot.
let crtOffT = 0;
function setCrt(on) {
  state.crt = on;
  const tube = $('tube');
  clearTimeout(crtOffT);
  tube.style.setProperty('--crt-px', `${1 / (devicePixelRatio || 1)}px`);
  if (on) {
    if (!tube.style.getPropertyValue('--crt-static')) tube.style.setProperty('--crt-static', crtSnow());
    document.body.classList.add('tube-on');
    tube.hidden = false;
    tube.classList.remove('power-off');
    replay(tube, 'power-on');
    crtOffT = setTimeout(() => tube.classList.remove('power-on'), 700);
    crtOsd(crtChannel());
  } else if (!tube.hidden) {
    // (the picture shrinks into the dot, then the page is back as it was)
    tube.classList.remove('power-on');
    replay(tube, 'power-off');
    crtOffT = setTimeout(() => { tube.hidden = true; tube.classList.remove('power-off'); document.body.classList.remove('tube-on'); }, state.calm ? 0 : 520);
  }
  saveSettings();
}
// (a class's animation from its start, even while it's still running)
function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
// The static the set shows on a drop and between channels: a small field of grey snow, drawn once,
// stretched big and blocky over the screen.
function crtSnow() {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 90;
  const x = c.getContext('2d'), im = x.createImageData(160, 90);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.random() < 0.5 ? Math.random() * 90 : 120 + Math.random() * 135;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return `url(${c.toDataURL()})`;
}
function crtStatic() { if (state.crt && !state.calm) replay($('tube'), 'static'); }
// The set's lettering, top right, for a couple of seconds: the channel (the background, V) or the
// picture (the theme, T)
const crtChannel = () => `CH ${String(state.visual + 1).padStart(2, '0')}\n${VISUALS[state.visual].toUpperCase()}`;
let crtOsdT = 0;
function crtOsd(text) {
  if (!state.crt) return;
  const osd = $('tube').querySelector('.t-osd');
  osd.textContent = text;
  osd.classList.add('on');
  clearTimeout(crtOsdT);
  crtOsdT = setTimeout(() => osd.classList.remove('on'), 2200);
}
// (the kick: the tube's darkness eased off for a moment, and back over a third of a second (the CSS))
let crtKickT = 0;
function crtKick() {
  $('tube').classList.add('kick');
  clearTimeout(crtKickT);
  crtKickT = setTimeout(() => $('tube').classList.remove('kick'), 60);
}

// Fewer flashes: the help's checkbox (see eng.on.kick, cuts, the takeover and body.calm in the CSS).
function setCalm(on) {
  state.calm = on;
  document.body.classList.toggle('calm', on);
  $('calm').checked = on;
  saveSettings();
}
$('calm').addEventListener('change', (e) => setCalm(e.target.checked));

// Updates: the help's checkbox, and the offer of a newer Toaster (update.js in the main process
// looks it up on GitHub): a few seconds after it starts, once, not over a recording. Update now:
// it downloads, checks it, closes and opens again as the new one; or, where it can't (a Mac, a
// copy it can't write beside, a try at that version that didn't go through in the last day, with
// why), the release's page.
function setUpdates(on) {
  state.updates = on;
  $('updates').checked = on;
  saveSettings();
}
$('updates').addEventListener('change', (e) => setUpdates(e.target.checked));
async function offerUpdate(u) {
  if (!state.updates || !window.nc?.updateCheck) return;
  u ||= await window.nc.updateCheck().catch(() => null);
  if (!u) return;
  if (rec.mr || !$('alerts').isConnected || $('alerts').childElementCount) { setTimeout(() => offerUpdate(u), 30000); return; }
  xpAlert($('alerts'), {
    title: 'toaster update', icon: 'info',
    text: u.failed
      ? `Toaster ${u.version} is out (this one is ${u.current}), but installing it here didn't go through last time (${u.failed}). Open its page to get it?`
      : `Toaster ${u.version} is out (this one is ${u.current}). ${u.canInstall ? 'Update now? It downloads, then closes and opens again as the new one.' : 'Open its page to get it?'}`,
    buttons: [u.canInstall ? 'Update now' : 'Open page', 'Later'],
  });
  $('alerts').querySelector('button').addEventListener('click', async () => {
    if (!u.canInstall) { window.nc.updatePage(); return; }
    flashStatus('downloading the update');
    try {
      await window.nc.updateInstall();
      flashStatus(`opening Toaster ${u.version}`);
    } catch (err) {
      xpAlert($('alerts'), { title: 'toaster update', icon: 'warning', text: `The update didn't go through (${String(err?.message || err).replace(/^.*?Error: /, '')}), and nothing changed. Get it from its page instead?`, buttons: ['Open page', 'OK'] });
      $('alerts').querySelector('button').addEventListener('click', () => window.nc.updatePage());
    }
  });
}
window.nc?.onUpdateProgress?.((p) => flashStatus(`downloading the update ${Math.round(p * 100)}%`));

// What's new (news.js): after an update, once, a box with what came in since the version last
// opened, each with its key (the first time Toaster opens, the welcome note instead); "Show in
// help" opens the help at its top, where the last few versions' are kept. Not over a recording or
// another message: it waits.
const newsLine = (it) => [it.act ? K(it.act) + (it.in ? ' · ' + it.in : '') : it.key, it.text];
function showNews(news, version) {
  if (rec.mr || $('alerts').childElementCount) { setTimeout(() => showNews(news, version), 30000); return; }
  const items = news.flatMap((n) => n.items).map(newsLine);
  xpAlert($('alerts'), {
    title: 'toaster updated', icon: 'info',
    text: news.length > 1 ? `New since you last opened Toaster (now ${version}):` : `New in ${version}:`,
    list: items.length > 6 ? [...items.slice(0, 5), ['?', `and ${items.length - 5} more in the help`]] : items,
    buttons: ['Show in help', 'OK'],
  });
  $('alerts').querySelector('button').addEventListener('click', () => { $('help').showModal(); $('news-head').scrollIntoView({ block: 'start' }); });
  state.seenVersion = version;
  saveSettings();
}
// the help's top: the last three versions' additions (the keys filled in by applyKeys)
function newsRows() {
  const rows = [`<tr class="sec" id="news-head"><th colspan="2">recently added</th></tr>`];
  for (const n of NEWS.slice(0, 3)) for (const it of n.items) {
    rows.push(`<tr class="news"><td>${it.act ? `<span data-k="${it.act}"></span>${it.in ? ` · ${esc(it.in)}` : ''}` : esc(it.key)}</td><td>${esc(it.text)} <span class="vtag">${n.version}</span></td></tr>`);
  }
  $('help').querySelector('table tbody').insertAdjacentHTML('afterbegin', rows.join(''));
}

// The glass blob: over the code, under the card and the pop-ups.
function setGlass(on) {
  state.glass = on;
  glass.show(on);
  $('b-glass')?.classList.toggle('on', on); // (its button is gone since 0.4.23; the glass stays, unlisted)
  saveSettings();
}

// K: the camera's effect. The cut-out puts you over the visuals (the camera layer above them,
// see-through round you); glass (the portals' look, drawn by them over the whole picture, in
// colour) makes you clear, the room bent through you; dots and voxels redraw the picture on layers
// of their own; the others work on the picture as it is.
// The camera button: filled while it's on, with its look past the plain one, and its effect (K)
// if there is one.
function camLabel() {
  const look = state.eyes ? 'big eyes' : state.ascii ? 'ascii' : '', fx = CAM_FX[state.camFx];
  $('b-cam').textContent = 'cam' + (cam.on && look ? ': ' + look : '') + (cam.on && fx !== 'none' ? ' · ' + fx : '');
  $('b-cam').classList.toggle('on', cam.on);
}

function setCamFx(i, say) {
  state.camFx = i;
  cam.setFx(CAM_FX[i]);
  if (CAM_FX[i] === 'windows') asciiCam.clear(); // (the camera as text shows in the windows instead)
  document.body.classList.toggle('cam-cut', CAM_FX[i] === 'cut-out');
  portal.glassFx = CAM_FX[i] === 'glass';
  if (CAM_FX[i] !== 'dots') dotCam.clear();
  if (CAM_FX[i] !== 'voxels') voxCam.clear();
  if (say) flashStatus('camera effect: ' + CAM_FX[i] + (cam.on ? '' : ` (${K('cam')} turns the camera on)`));
  camLabel();
  saveSettings();
}

function nextTheme() {
  state.theme = (state.theme + 1) % THEMES.length;
  applyTheme();
  crtOsd(`PICTURE
${THEMES[state.theme].toUpperCase()}`);
  saveSettings();
}

// Hush (a raised fist, or Q): every part muted with a _, the way Strudel's hush() stops them all,
// and the picture dimmed; an open hand (or Q again) brings it back, and so does a new song. The
// status says so the whole time ("hush · Q"): set off by a fist in a video, the hush stayed on
// after the camera went off, and the app just looked dull, every theme, with no sign why.
function setHush(on) {
  state.hushed = on;
  document.body.classList.toggle('hushed', on);
  flashStatus(on ? '✊ hush' : '🖐 back');
}
const restingStatus = () => (state.hushed ? `✊ hush · ${K('hush')}` : state.node ? '● live' : '○ idle');

// Hand signs (gestures.js), while the camera is on: ✌️ the next theme, 👍 record, ✊ hush, 🖐 back.
const SIGNS = { peace: '✌️', thumb: '👍', fist: '✊', open: '🖐' };
let hinted = null;
function watchSigns(t) {
  const wanted = ['peace', 'thumb', state.hushed ? 'open' : 'fist'];
  const sign = gestures.update(t, tracker.hands, cam.place, lens.showing || portal.showing, wanted);
  // a hint in the header while one is held (hidden in a recording, like the rest of the header)
  if (gestures.holding !== hinted) { hinted = gestures.holding; if (hinted) flashStatus(SIGNS[hinted] + ' …'); }
  if (sign === 'peace') { nextTheme(); flashStatus('✌️ ' + THEMES[state.theme]); }
  else if (sign === 'thumb') toggleRecording();
  else if (sign === 'fist') setHush(true);
  else if (sign === 'open') setHush(false);
}

// Ctrl+Shift+H (not in the help): the hand log (handlog.js), the hands as numbers into the
// settings folder, for tuning the hand features on real hands.
async function toggleHandLog() {
  const file = await handLog.toggle(nowSec());
  if (file) flashStatus(handLog.on ? 'hand log on' : 'hand log saved');
}

// A song's names: for its files ("artist - title"), and for the first line of its code.
function songNames(s) {
  const one = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  return {
    name: s?.title ? `${s.artist ? one(s.artist) + ' - ' : ''}${one(s.title)}` : one(state.label) || 'song',
    about: s?.title ? `"${one(s.title)}"${s.artist ? ' by ' + one(s.artist) : ''}` : 'whatever was playing',
  };
}

// X: the song so far, decompiled: a MIDI file (drums, bass, chords, lead) and the whole song as
// Strudel code (every 4 bars, the different ones named, in order with arrange()), into
// Music\Toaster.
let exporting = false;
async function exportSong() {
  if (exporting) return; // X held or pressed again mustn't build the same snapshot twice
  if (!window.nc?.saveSong) { flashStatus('exporting works in the app, not in a browser'); return; }
  const song = eng.tape.song(eng.tempo.down);
  if (!song) { flashStatus('nothing to export yet: no beat found'); return; }
  exporting = true;
  clearTimeout(statusTimer);
  $('status').textContent = 'exporting…';
  try {
    // song() makes a snapshot; the worker owns a copy while listening keeps adding to the tape.
    // (named after the song it was: X just after a song ends exports that one)
    const { name, about } = song.who || songNames(currentSong());
    const { midi, code } = await buildSongFiles(song, name, about);
    const file = await window.nc.saveSong(name, midi, code);
    showNotice(`saved ${song.bars.length} bars as MIDI${code ? ' and Strudel code' : ''}: ${file.split(/[\\/]/).pop().replace(/\.mid$/, '')}`, file);
  } finally { exporting = false; $('status').textContent = restingStatus(); }
}

// O: the code as it is now, opened in the Strudel REPL in your browser, to play and change.
function openInStrudel() {
  const texts = lineTexts();
  const phase = ((eng.bar % 4) + 4) % 4;
  const url = strudelLink(strudelProgram(texts, currentSong(), phase, eng.v?.bass?.shown));
  if (window.nc?.openStrudel) window.nc.openStrudel(url);
  else window.open(url, '_blank', 'noopener');
  flashStatus('opened in strudel.cc');
}

// What went wrong starting the camera, in words, with what to do about it.
function cameraTrouble(err) {
  const name = err?.name || '';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return `No camera found. Plug one in (or switch it on) and press ${K('cam')} again.`;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return onMac()
      ? `The camera is blocked. In System Settings, Privacy & Security, Camera, allow Toaster (Electron, if this copy is running from source), then press ${K('cam')} again.`
      : `The camera is blocked. In Windows Settings, Privacy, Camera, let desktop apps use the camera, then press ${K('cam')} again.`;
  }
  if (name === 'NotReadableError' || name === 'AbortError') return `The camera is busy: another app (Zoom, Teams, OBS...) is probably using it. Close that and press ${K('cam')} again.`;
  return 'Camera: ' + (err?.message || err);
}

// The camera (C goes round): off, on (behind the code; frame something with your fingers for the
// finger frame), on with big eyes over your face, and as text (ASCII), then off.
async function toggleCam() {
  if (!cam.on) {
    try {
      await cam.start();
      if (cam.on) tracker.start();
    } catch (err) { showMenu(cameraTrouble(err)); }
  } else if (!state.eyes && !state.ascii) {
    state.eyes = true;
  } else if (state.eyes) {
    state.eyes = false;
    state.ascii = true;
  } else {
    state.ascii = false;
    cam.stop();
    tracker.stop();
    lens.clear();
    portal.clear();
    document.body.classList.remove('portal-full');
    segcam.clear();
    gestures.reset();
  }
  if (!state.eyes) segcam.clear();
  if (!(cam.on && state.ascii)) asciiCam.clear();
  document.body.classList.toggle('cam-on', cam.on);
  document.body.classList.toggle('cam-ascii', cam.on && state.ascii);
  camLabel();
}

async function toggleLayout() {
  return changeWindowMode('vertical');
}

// The mini player (W), like Spotify's: the window shrinks to a small panel in the corner of the
// screen, over everything else, still listening: the code over the background. W again (or its
// button) brings the window back where it was.
async function toggleMini() {
  return changeWindowMode('mini');
}

let windowChanging = false;
async function changeWindowMode(mode) {
  if (rec.mr) { flashStatus(`the window can't change size while recording (${K('rec')} stops it)`); return false; }
  if (windowChanging) return false;
  windowChanging = true;
  let changed = false;
  const apply = async (which, on) => {
    const method = which === 'mini' ? 'setMini' : 'setVertical';
    // The desktop replies with the new state (false is a successful exit). A web adapter may
    // refuse entry with false; a missing adapter or a rejected call is not a successful resize.
    // (the mini player tall with the handheld game on: the handheld on its own, a little player)
    const shape = which === 'mini' && gameShowing() ? 'tall' : 'wide';
    if (await window.nc?.[method]?.(on, shape) !== on) throw new Error('This window layout is only available in the desktop app.');
    state[which] = on;
    changed = true;
    document.body.classList.toggle(which, on);
    $(which === 'mini' ? 'b-mini' : 'b-layout').textContent = which === 'mini' ? (on ? 'back' : 'mini') : (on ? 'wide' : '9:16');
    applyCard();
  };
  try {
    const on = !state[mode], other = mode === 'mini' ? 'vertical' : 'mini';
    if (on && state[other]) await apply(other, false);
    await apply(mode, on);
    return true;
  } catch (err) { showError(err); return false; }
  finally {
    try {
      // A successful first resize still matters if the second call was refused.
      if (changed && clips.on) { await clips.toggle(); await new Promise((r) => setTimeout(r, 400)); await clips.toggle(); }
    } finally { windowChanging = false; }
  }
}

// The ID card has its own on/off for each layout: off in the wide one until you turn it on, on in
// the vertical one (where it takes the camera's place at the top) until you turn it off.
function applyCard() {
  const on = (state.vertical ? state.cardV : state.card) && !((state.vertical || state.mini) && gameShowing()), big = on && state.cardBig;
  card.show(on);
  document.body.classList.toggle('card-on', on);
  document.body.classList.toggle('card-big', big);
  sizeCard();
  applyStage();
  $('b-card').textContent = big ? 'big card' : 'card';
  $('b-card').classList.toggle('on', on);
}
// N (or the card button): off, on, big, off. (Each layout keeps its own on or off; big is for both.)
// In the mini player the card has one size, so N is just on and off there.
function toggleCard() {
  if ((state.vertical || state.mini) && gameShowing()) { flashStatus('card: the cartridge has the song while the game is on'); return; }
  const on = state.vertical ? state.cardV : state.card, set = (v) => { if (state.vertical) state.cardV = v; else state.card = v; };
  if (state.mini) set(!on);
  else if (!on) { set(true); state.cardBig = false; }
  else if (!state.cardBig) state.cardBig = true;
  else { set(false); state.cardBig = false; }
  applyCard();
  saveSettings();
}
// The big card is the same card scaled up (a picture drawn pixelated stays sharp, and the text is
// text): as big as fits on the right half of the wide layout (the code keeps the left), or the top
// of the vertical one. The code starts below the card in the vertical layout, and stops short of it
// in the wide one, however big it is. In the mini player it's scaled down to the panel's height.
function sizeCard() {
  const el = $('card'), w = el.offsetWidth, h = el.offsetHeight;
  let k = 1;
  if (state.mini && w && h) k = Math.min(1, (innerHeight - 44) / h);
  else if (document.body.classList.contains('card-big') && w && h) {
    k = state.vertical ? Math.min((innerWidth * 0.96) / w, (innerHeight * 0.62) / h) : Math.min((innerWidth * 0.5) / w, (innerHeight - 70) / h);
    k = Math.max(1, k);
  }
  const s = document.body.style;
  s.setProperty('--card-k', k.toFixed(3));
  s.setProperty('--card-h', `${Math.round(h * k)}px`);
  s.setProperty('--card-w', `${Math.round(w * k)}px`);
}
new ResizeObserver(sizeCard).observe($('card'));
addEventListener('resize', sizeCard);

// In the vertical layout the camera sits in the top part of the frame, and the ID card, while it's
// on, in its place.
const camRect = () => (state.vertical ? { x: 0, y: 0, w: innerWidth, h: Math.round(innerHeight * 0.42) } : null);
const camCovered = () => state.vertical && card.shown;

// The pitch wheel and the spiral are diagrams: behind the code they're lost. In the vertical layout
// (without the card, which has the top) they get the top of the frame, as the camera does, and the
// code moves down below them; with the camera on too, they're drawn over it there.
const DIAGRAMS = ['pitchwheel', 'spiral'];
function applyStage() {
  document.body.classList.toggle('wheel-up', state.vertical && !card.shown && DIAGRAMS.includes(VISUALS[state.visual]));
}
const stageRect = () => (document.body.classList.contains('wheel-up') ? { x: 0, y: 40, w: innerWidth, h: Math.round(innerHeight * 0.42) - 40 } : null);

// ---------------------------------------------------------------- panels

// The grid changes about ten times a second (each step, each hit), so the page is only
// touched when it actually changed. Returns the plain text for the Notepad pop-ups.
const GRID_ROWS = [['bd', 'bd'], ['sd', 'cp'], ['hhc', 'hh'], ['hho', 'oh'], ['vox', 'vx']];
let gridHtml = '', gridText = '';
function renderGrid() {
  const locked = eng.tempo.locked && eng.bar !== null && !eng.silent;
  let html = '    ' + [1, 2, 3, 4].map((b) => String(b).padEnd(8)).join('') + '\n';
  let text = html;
  for (const [id, label] of GRID_ROWS) {
    const v = eng.v[id], on = v.shown || v.on;
    html += label + ' │';
    text += label + ' │';
    for (let s = 0; s < 16; s++) {
      // █ hit on a step in the pattern · ▒ pattern step still to come · ░ hit off the pattern
      const hit = locked && v.hitBar[s] === eng.bar;
      let cell = '··';
      if (locked && on[s]) cell = hit ? '██' : s > eng.step ? '▒▒' : '··';
      else if (hit) cell = '░░';
      html += locked && s === eng.step ? `<span class="cur">${cell}</span>` : cell;
      text += cell;
    }
    html += '│\n';
    text += '│\n';
  }
  const status = locked ? `    bar ${eng.bar + 1} · step ${eng.step + 1}/16` : '    waiting for the beat...';
  html += `<span class="dim">${status}</span>`;
  if (html !== gridHtml) {
    gridHtml = html;
    gridText = text + status;
    $('grid').innerHTML = html;
  }
  return gridText;
}

function renderRoll() {
  if (!eng.rollDirty) return;
  eng.rollDirty = false;
  const cols = eng.rollCols, chord = eng.lastChord;
  const tones = chord ? [chord.root, (chord.root + chord.third) % 12, (chord.root + 7) % 12] : [];
  let html = '';
  for (let pc = 11; pc >= 0; pc--) {
    const label = NOTES[pc].padEnd(2);
    html += tones.includes(pc) ? `<span class="lab on">${label}</span>` : `<span class="lab">${label}</span>`;
    let row = '';
    for (let i = 0; i < ROLL_COLS; i++) {
      const c = cols[i - (ROLL_COLS - cols.length)];
      row += c ? RAMP[Math.min(9, Math.floor(c[pc] ** 1.7 * 10))] : ' ';
    }
    html += ' │' + esc(row) + '│\n';
  }
  html += `<span class="dim">   ${chord ? 'chord ' + chord.name : 'listening for chords...'}</span>`;
  $('roll').innerHTML = html;
}
// The roll hangs below the last line. Where the code reaches too far down for it (the vertical
// layout under the ID card or the camera, or a short window), the bottom of the window would cut
// it in half, so it's hidden till there's room again. (Hidden, it keeps its place: whether it fits
// doesn't change with it.)
function fitRoll() {
  const roll = $('roll'), r = roll.getBoundingClientRect();
  roll.classList.toggle('cut', r.height > 0 && r.bottom > innerHeight + 1);
}

const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
function renderFooter() {
  const lv = Math.min(1, Math.max(0, (20 * Math.log10(eng.level || 1e-6) + 50) / 50));
  const cells = Math.round(lv * 12);
  setText($('meter'), '▕' + '█'.repeat(cells) + '░'.repeat(12 - cells) + '▏');
  const T = eng.tempo, parts = [];
  parts.push(T.locked ? `${T.bpm.toFixed(1)} bpm` : '--- bpm');
  if (eng.key) parts.push(`${NOTES[eng.key.root]} ${eng.key.mode}`);
  parts.push(state.label || 'no source');
  if (eng.silent && state.node) parts.push('silence');
  setText($('stats'), parts.join(' · '));
}

// ---------------------------------------------------------------- recording

// M records what's in the window (just the page: no frame, no cursor, nothing else on screen)
// with the sound, into Videos\Toaster: MP4 (H.264 and AAC, ready for TikTok, Shorts and Reels)
// where Chromium can write it, else WebM. Set it up first (L for the vertical layout); the
// header and footer hide while it records, and the taskbar icon goes red.
const REC_TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
// How far the recorded sound is held back to line up with the picture (seconds). The blocks are
// drawn to land when you hear a hit, and a recording has no speakers: measured on the demo beat
// (drawn late to allow for the speakers), they landed 38 ms after the hit in the recording. So
// what's drawn late for your ears gets the sound held back to match: that, less 12 ms (system
// audio, drawn 50 ms earlier, lands 12 ms early, which looks in time), and your sync trim.
const recDelay = () => Math.max(0, heardAfter() - 12 - state.syncTrim) / 1000;
// At most 32 MiB waits for disk. Ten seconds without a completed write stops the recording;
// stopping has a 15-second total deadline, including the recorder's last piece and file close.
const REC_BUFFER = 32 * 1024 * 1024, REC_PROGRESS_MS = 10000, REC_STOP_MS = 15000;
const rec = { session: null, get mr() { return this.session?.mr || null; }, busy: false, op: Promise.resolve(), noticeTimer: 0 };
const recCurrent = (s) => rec.session === s && s.active;
function recWithin(promise, ms, why) {
  let timer;
  return Promise.race([promise, new Promise((_r, reject) => { timer = setTimeout(() => reject(new Error(why)), ms); })]).finally(() => clearTimeout(timer));
}

async function toggleRecording() {
  if (rec.busy) return;
  rec.busy = true;
  rec.op = (async () => {
    try {
      if (rec.mr) await stopRecording();
      else await startRecording();
    } catch (err) {
      console.error('recording:', err);
      if (rec.session) recordingFailed(rec.session, err?.message || err);
      else showNotice('could not record: ' + (err?.message || err));
    } finally {
      rec.busy = false;
    }
  })();
  await rec.op;
}

// The window's picture as a stream: just the page, at the window's own shape, up to 1920 on the
// long side (the vertical layout comes out about 1080 x 1920, the size TikTok and Shorts want).
// Left alone, the capture would be 1920 x 1080 whatever the window's shape, with bars round it.
async function windowStream() {
  const id = await window.nc.recSource();
  const w = innerWidth * devicePixelRatio, h = innerHeight * devicePixelRatio, k = Math.min(2, 1920 / Math.max(w, h));
  const even = (x) => 2 * Math.round((x * k) / 2);
  const size = { minWidth: even(w), maxWidth: even(w), minHeight: even(h), maxHeight: even(h) };
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: id, maxFrameRate: 60, ...size } } });
}

async function startRecording() {
  if (!window.nc?.recSource) throw new Error('recording works in the app, not in a browser');
  // the note about the last recording goes first, and is off the screen before the capture starts
  // (hidden once recording had begun, it was in the first second of the video)
  hideNotice();
  await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 100); });
  const s = { active: true, mr: null, video: null, tap: null, queue: [], pending: 0, writing: false, write: Promise.resolve(), lastWrite: Date.now() };
  rec.session = s;
  s.video = await windowStream();
  const dest = ac.createMediaStreamDestination(), delay = ac.createDelay(1);
  delay.connect(dest);
  s.tap = { dest, delay, node: null };
  tapRecording();
  const type = REC_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
  if (!type) throw new Error('no video format to record in');
  const started = await window.nc.recStart(type.startsWith('video/mp4') ? 'mp4' : 'webm');
  s.token = started.token;
  const mr = s.mr = new MediaRecorder(new MediaStream([...s.video.getVideoTracks(), ...dest.stream.getAudioTracks()]), { mimeType: type, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 });
  // Every piece belongs to this session, through conversion and IPC. Failure drops the waiting
  // pieces at once; a late conversion or disk callback can never write to a replacement file.
  mr.ondataavailable = (e) => {
    if (!recCurrent(s) || !e.data.size) return;
    if (s.pending + e.data.size > REC_BUFFER) { recordingFailed(s, 'the file is too slow (32 MiB waiting to be written)'); return; }
    if (!s.pending) s.lastWrite = Date.now();
    s.pending += e.data.size;
    s.queue.push(e.data);
    if (!s.writing) s.write = writeRecording(s);
  };
  s.stopped = new Promise((resolve) => { mr.onstop = () => { resolve(); if (recCurrent(s) && !s.stopping) recordingFailed(s, 'the recorder stopped unexpectedly'); }; });
  mr.onerror = (e) => recordingFailed(s, e.error?.message || 'the recorder stopped');
  s.watch = setInterval(() => {
    if (recCurrent(s) && s.pending && Date.now() - s.lastWrite >= REC_PROGRESS_MS) recordingFailed(s, 'the file has not made progress for 10 seconds');
  }, 250);
  mr.start(1000);
  document.body.classList.add('recording');
  $('b-rec').textContent = '■ stop';
}

async function writeRecording(s) {
  s.writing = true;
  try {
    while (recCurrent(s) && s.queue.length) {
      const chunk = s.queue.shift(), buf = await chunk.arrayBuffer();
      if (!recCurrent(s)) return;
      const ok = await window.nc.recChunk(s.token, buf);
      if (!recCurrent(s)) return;
      if (!ok) throw new Error('the file could not be written');
      s.pending -= chunk.size;
      s.lastWrite = Date.now();
    }
  } catch (err) { recordingFailed(s, err?.message || err); }
  finally { s.writing = false; }
}

// The sound comes from the app's own audio graph, from whatever it's listening to (the music as
// it arrives, not after the speakers), held back recDelay(), and follows a change of source
// mid-recording.
function tapRecording() {
  const tap = rec.session?.tap;
  if (!tap || tap.node === state.node) return;
  try { tap.node?.disconnect(tap.delay); } catch { /* gone */ }
  tap.node = state.node;
  tap.delay.delayTime.value = recDelay();
  state.node?.connect(tap.delay);
}

async function stopRecording() {
  const s = rec.session;
  if (!s) return;
  s.stopping = true;
  await recWithin((async () => {
    if (s.mr.state !== 'inactive') s.mr.stop();
    await s.stopped;
    await s.write;
    if (!recCurrent(s)) return;
    const file = await window.nc.recStop(s.token);
    if (!recCurrent(s)) return;
    endRecordingTracks(s);
    if (file) showNotice((file.endsWith('.part') ? 'recording stopped before the file could be finished; kept ' : 'saved ') + file.split(/[\\/]/).pop(), file);
  })(), REC_STOP_MS, 'finishing the recording took more than 15 seconds');
}

// The recording can't go on (the disk is full, the recorder broke): stop it, keeping what was
// written (main.js leaves that as a .part file), and say so, once.
function recordingFailed(s, why) {
  if (!recCurrent(s)) return;
  s.active = false;
  s.queue.length = 0;
  s.pending = 0;
  try { s.mr.ondataavailable = null; if (s.mr.state !== 'inactive') s.mr.stop(); } catch { /* already stopping */ }
  endRecordingTracks(s);
  if (s.token !== undefined) recWithin(Promise.resolve(window.nc?.recStop?.(s.token, true)), 5000, 'file close timed out').catch(() => {});
  showNotice('recording stopped: ' + why);
}
// The window is closing mid-recording (main.js asks): finish the video properly, then close.
window.nc?.onRecFinish?.(async () => {
  try { await rec.op; if (rec.mr) await toggleRecording(); } finally { window.nc.closeWindow(); }
});
window.nc?.onRecFailed?.((token, why) => { if (rec.session?.token === token) recordingFailed(rec.session, why); });

function endRecordingTracks(s) {
  if (s.released) return;
  s.released = true;
  s.active = false;
  clearInterval(s.watch);
  s.video?.getTracks().forEach((t) => t.stop());
  s.tap?.dest.stream.getTracks().forEach((t) => t.stop());
  try { s.tap?.node?.disconnect(s.tap.delay); } catch { /* gone */ }
  s.tap?.delay.disconnect();
  if (rec.session !== s) return;
  rec.session = null;
  document.body.classList.remove('recording');
  $('b-rec').textContent = '● rec';
}

// Drop clips (J; clips.js): the build-up and the drop, saved as a video of their own each time
// one hits, into Videos\Toaster.
const clips = createClips({
  ac, types: REC_TYPES, stream: windowStream, node: () => state.node, delay: recDelay,
  save: (buf, ext) => window.nc.saveClip(buf, ext),
  said: (text, file) => showNotice(text, file),
  stopped: () => document.body.classList.remove('clips-on'),
});
async function toggleClips() {
  if (!window.nc?.saveClip) { flashStatus('drop clips work in the app, not in a browser'); return; }
  try {
    const on = await clips.toggle();
    if (on) { clipsThisSong = 0; lastClipAt = -99; }
    document.body.classList.toggle('clips-on', on);
    flashStatus(on ? 'drop clips: on (the first two drops of each song, with their build-up)' : 'drop clips: off');
  } catch (err) {
    showNotice('could not start drop clips: ' + (err?.message || err));
  }
}

// A note in the corner for a few seconds, with a button to show the file. While recording it would
// be in the video (a drop clip or an export finishing then), so it goes to the status line in the
// footer instead, which hides while recording.
function showNotice(text, file, keep = false) {
  if (rec.mr) { flashStatus(text); return; }
  const el = $('notice');
  el.textContent = text;
  if (file) {
    const b = document.createElement('button');
    b.textContent = 'show in folder';
    b.onclick = () => { window.nc?.recShow(file); hideNotice(); };
    el.append(' ', b);
  }
  el.hidden = false;
  clearTimeout(rec.noticeTimer);
  if (!keep) rec.noticeTimer = setTimeout(hideNotice, 8000);
}
function hideNotice() { $('notice').hidden = true; }

// ---------------------------------------------------------------- loops

// Listening runs on a timer so it keeps going when the window is covered; drawing uses frames.
// The engine runs every tick (~66 a second); the code it writes is refreshed every third tick,
// which is plenty since patterns change at bar lines. Typing runs every tick to stay smooth.
let tick = 0, hushWas = false;
setInterval(() => {
  const t = nowSec();
  if (state.node) eng.frame(t, ac.currentTime); // the audio clock times the onsets for the tempo
  if (tick++ % 3 === 0) {
    view.slipsOff = !!rec.mr || clips.on; // (no staged slips in a video: see codeview.js)
    const lines = buildLines(eng, { song: currentSong(), source: state.label || 'nothing yet', hushed: state.hushed }, t);
    view.update(lines, t, state.hushed !== hushWas); // a hush goes in at once
    hushWas = state.hushed;
  }
  view.step(t);
}, 15);

// Layers whose feature is off are taken out of the page: an empty full-window canvas still costs
// the GPU every frame (measured: about 2% of a core for the four that used to stay up).
const dotCamOn = () => cam.on && !state.ascii && CAM_FX[state.camFx] === 'dots' && !camCovered();
const voxCamOn = () => cam.on && !state.ascii && CAM_FX[state.camFx] === 'voxels' && !camCovered();
const LAYER_ON = {
  // Keep the ordinary picture until its replacement can draw. The active effects are
  // still polled below while hidden, so hiding one never prevents its compile finishing.
  cam: () => cam.on && CAM_FX[state.camFx] !== 'windows' && (state.ascii ? asciiCam.waiting : CAM_FX[state.camFx] === 'dots' ? dotCam.waiting || dotCam.broken : CAM_FX[state.camFx] === 'voxels' ? voxCam.waiting || voxCam.broken : true),
  dotcam: () => dotCamOn() && !dotCam.waiting && !dotCam.broken,
  voxcam: () => voxCamOn() && !voxCam.waiting && !voxCam.broken,
  vis: () => ON_VIS.includes(VISUALS[state.visual]),
  warp: () => VISUALS[state.visual] === 'warp',
  worlds: () => VISUALS[state.visual] === 'worlds',
  worldwords: () => VISUALS[state.visual] === 'worlds',
  chrome: () => VISUALS[state.visual] === 'chrome',
  spectro: () => VISUALS[state.visual] === 'spectrogram',
  spectrobox: () => VISUALS[state.visual] === 'spectrogram',
  scenery: () => VISUALS[state.visual] === 'scenery',
  field: () => FIELD_VIS.includes(VISUALS[state.visual]),
  asciicam: () => cam.on && state.ascii && !asciiCam.waiting,
  orb: () => state.orb,
  punch: () => state.blocks,
  segcam: () => cam.on && (state.eyes || CAM_FX[state.camFx] === 'windows'),
  lens: () => cam.on,
  portal: () => cam.on,
};
function showLayers() {
  for (const id in LAYER_ON) { const el = $(id), on = LAYER_ON[id](); if (el.hidden === on) el.hidden = !on; }
}

// Drawing: at most 60 frames a second, even on faster monitors, and none while minimized. With
// nothing to hear the picture hardly moves, so after 3 seconds of quiet it draws 30 times a
// second, and after 30 seconds 10 times, if the window isn't in front (it measured 16% of a core
// drawing a still screen at 60). The next sound brings it straight back. Never while recording,
// with the camera on or during a drop.
let poolAt = 0, rollAt = 0, footerAt = 0, lastFrame = 0, windowShown = true;
let worldsWarmScheduled = false;
let trackShown = ''; // the tracking trouble last told about (see draw)
window.nc?.onWindowShown((shown) => { windowShown = shown; });
function frameGap(t) {
  if (rec.mr || cam.on || takeover.active || storm.active) return 1000 / 61;
  const quiet = state.node ? t - eng.lastSound : Infinity;
  return quiet > 30 && !document.hasFocus() ? 1000 / 10.5 : quiet > 3 ? 1000 / 30.5 : 1000 / 61;
}
function draw(now) {
  requestAnimationFrame(draw);
  const t = nowSec();
  if (!windowShown || now - lastFrame < frameGap(t)) return;
  lastFrame = now;
  showLayers();
  view.highlight(t, eng);
  const grid = renderGrid();
  renderRoll();
  const mode = VISUALS[state.visual];
  if (FIELD_VIS.includes(mode)) field.draw(t, eng, mode, col, cam.on && state.ascii ? cam : null);
  // the camera as text goes over whichever background is picked (in place of the ASCII ones'
  // own text where you are, with the cut-out), so every background works with it
  // (with the windows effect, the windows show you as text instead: you're only in them)
  if (cam.on && state.ascii && CAM_FX[state.camFx] !== 'windows') asciiCam.draw(t, eng, 'cam', col, cam);
  if (mode === 'tunnel') tunnel.draw(t, eng, col);
  else if (mode === 'spiral') spiral.draw(t, eng, col, stageRect());
  else if (mode === 'pitchwheel') wheel.draw(t, eng, col, stageRect());
  else if (mode === 'warp') warp.draw(t, eng, col);
  else if (mode === 'fire') fire.draw(t, eng, col);
  else if (mode === 'worlds') {
    const played = ['bd', 'sd', 'hhc', 'hho'].filter((id) => eng.present(id, t)).map((id) => ({ bd: 'kick', sd: 'clap', hhc: 'hats', hho: 'open hats' })[id]).join(' ');
    worlds.draw(t, eng, { song: currentSong(), lines: Object.values(lineTexts()).filter(Boolean), played, chord: eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}` : '', codeBox, col });
  }
  else if (mode === 'chrome') chrome.draw(t, eng, { song: currentSong(), calm: state.calm, collage: state.chromeCollage });
  else if (mode === 'spectrogram') spectro.draw(t, eng, { theme: THEMES[state.theme], themed: state.spectroTheme, offset: syncOffset() });
  else if (mode === 'scenery') scenery.draw(t, eng, { col, offset: syncOffset(), colours: state.sceneryTheme ? 'theme' : 'own', strength: STRENGTHS[state.strength][1], scene: sceneShown(), open: state.codeHidden });
  else if (mode === 'cuts') cuts.draw(t, eng, col, syncOffset(), state.calm, { lines: lineTexts(), cam: cam.frame, art: songArt() });
  // (a background still compiling, the window black: the field of glyphs over it, see wait.js)
  wait.draw(t, !!{ worlds, chrome, spectrogram: spectro, warp, spectrum: field, rain: field, scope: field }[mode]?.waiting, col);
  // Don't make the worlds' compiler compete with the first visual. In particular a cold scenery
  // shader may take longer than 30 seconds: start that clock only once it actually draws.
  const settled = mode === 'scenery' ? !!scenery.drawnScene : mode === 'worlds' ? !worlds.broken : mode === 'chrome' ? !chrome.broken : true;
  if (!worldsWarmScheduled && settled) {
    worldsWarmScheduled = true;
    setTimeout(() => worlds.warm(), 30000);
  }
  if (state.orb) orb.draw(t, eng, col, syncOffset(), (out) => bands(eng, out), storm.orbRect(stageRect()));
  if (state.blocks) punch.draw(t, eng, col, syncOffset(), mode === 'worlds' || mode === 'chrome', state.blockLook, currentSong()?.title, WIDGET ? 'widget' : state.mini, THEMES[state.theme] === 'pink' ? 'pink' : 'blue');
  if (card.shown) card.draw(t, eng, { song: currentSong(), source: state.label, frame: cam.frame, face: meshFace() || cam.face, art: songArt() }, col);
  // (the code rain's characters: the code's lines, not the panels' boxes, which rained as +)
  if (t - poolAt > 2) { poolAt = t; field.setPool(Object.values(lineTexts()).filter(Boolean).join('\n')); }
  if (t - rollAt > 0.5) { rollAt = t; fitRoll(); }
  cam.draw(col, camRect(), { mask: tracker.mask, bar: eng.bar });
  if (dotCamOn()) dotCam.draw(t, { video: cam.video, mask: tracker.mask, rect: camRect(), eng, offset: syncOffset() });
  if (voxCamOn()) voxCam.draw(t, { video: cam.video, mask: tracker.mask, rect: camRect(), eng, offset: syncOffset() });
  if (cam.on) {
    // (the face is looked for while the finger frame is open too: a wink changes its filter; and for
    // the portals' skull)
    const windows = CAM_FX[state.camFx] === 'windows';
    tracker.update(cam.video, state.eyes || windows || takeover.active || lens.showing || portal.wantsFace, ['cut-out', 'dots', 'voxels'].includes(CAM_FX[state.camFx]) || portal.wantsCut);
    // tracking that couldn't start is said (once, and again if it gives up), so the hand effects
    // not working isn't a mystery
    const optionalTrouble = Object.entries(tracker.featureErrors).filter(([, err]) => err);
    const trouble = tracker.error ? `${tracker.error}|${tracker.gaveUp}` : JSON.stringify(optionalTrouble);
    if (trouble !== trackShown) {
      trackShown = trouble;
      if (tracker.error) showNotice(tracker.gaveUp ? `Hand and face tracking is off (${tracker.error}). The camera still works; turning it off and on (C) tries again.` : `Hand and face tracking had trouble (${tracker.error}); trying again.`);
      else if (optionalTrouble.length) showNotice(optionalTrouble.map(([name, err]) => `${name === 'face' ? 'Face tracking' : 'Cut-out'} is unavailable (${err.message}). ${err.retrying ? 'Trying again.' : 'Turn the camera off and on (C) to try again.'}`).join(' ') + ' Hand tracking still works.');
    }
    const where = { place: cam.place, crop: cam.drawCrop, rect: cam.rect, col };
    // a portal, while one is open, stands in for the finger frame (and the hand signs)
    portal.draw(t, { ...where, hands: tracker.hands, video: cam.video, mask: tracker.mask, bar: eng.bar, face: tracker.face, pose: tracker.pose });
    if (portal.showing) lens.clear();
    else lens.draw(t, { ...where, hands: tracker.hands, eyes: tracker.eyes, bar: eng.bar });
    // (behind the code: a window filling the picture, and the camera's glass effect, which is drawn
    // on the portals' canvas over the whole picture: over the code, it hid it)
    const under = portal.full || portal.glassFx;
    if (under !== document.body.classList.contains('portal-full')) document.body.classList.toggle('portal-full', under);
    watchSigns(t);
    if (handLog.on) handLog.update(t, tracker.hands, { place: cam.place, rect: cam.rect, portal: portal.state, lens: lens.showing, sign: gestures.holding });
    if (state.eyes || windows) segcam.draw(t, { ...where, face: tracker.face, eyes: state.eyes, windows, frame: cam.frame, ascii: state.ascii });
  }
  glass.draw(t, eng, col, LAYERS);
  storm.draw(t, eng, { layers: STORM_LAYERS, bg: `rgb(${col.bg})`, offset: syncOffset(), calm: state.calm });
  takeover.draw(t, grid, cam.frame, eng.bar, state.calm);
  if (t - footerAt > 0.125) { footerAt = t; renderFooter(); }
}

// ---------------------------------------------------------------- controls

const run = (fn) => () => fn().catch(showError);
$('go-system').onclick = run(useSystem);
$('go-demo').onclick = run(useDemo);
$('go-file').onclick = () => $('file').click();
$('go-input').onclick = run(chooseInput);
$('radio').onsubmit = (e) => { e.preventDefault(); useRadio($('radio-url').value).catch(showError); }; // (its button, or Enter in the field)
$('file').onchange = () => { const f = $('file').files[0]; if (f) useFile(f).catch(showError); $('file').value = ''; };
$('b-source').onclick = () => showMenu();
// (on a touch screen, with no Esc: the menu closes with its button, or a tap beside it)
const closeMenu = () => { $('menu').hidden = true; $('alerts').innerHTML = ''; };
$('menu-close').onclick = closeMenu;
$('menu').addEventListener('click', (e) => { if (e.target === $('menu') && state.source && matchMedia('(hover: none)').matches) closeMenu(); });
// The visual button opens a list of the backgrounds to pick from (V steps through them); a click
// anywhere else or any key closes it.
const visMenu = $('vis-menu');
// Presets (renderer/presets.js): a whole setup in one click, the picker's first row and in Ctrl+K. Each setting goes
// through the setter the keys use; presets picked in a row are applied one after the other, never at once.
const presetSetters = {
  visual: (name) => setVisual(VISUALS.indexOf(name)),
  sceneryScene: (scene) => { state.sceneryScene = scene; state.sceneryTheme = false; saveSettings(); },
  blocks: setBlocks,
  blockLook: (look) => { state.blockLook = look; setBlocks(true); },
  gameScreens: (screen) => { state.gameScreens = screen; setGameScreens(screen); saveSettings(); },
  theme: (name) => { state.theme = THEMES.indexOf(name); applyTheme(); saveSettings(); },
  codeHidden: setCodeHidden,
  vertical: async (on) => state.vertical === on || (await toggleLayout()),
};
let presetQueue = Promise.resolve();
function choosePreset(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return Promise.reject(new Error('Unknown preset'));
  const run = async () => {
    // (with just the beat hidden, a preset's codeHidden: false still means all of the code)
    const current = { ...state, visual: VISUALS[state.visual], theme: THEMES[state.theme], codeHidden: state.beatHidden ? 'beat' : state.codeHidden };
    if (await applyPreset(preset, current, presetSetters)) flashStatus('preset: ' + preset.name.toLowerCase());
  };
  presetQueue = presetQueue.then(run, run);
  return presetQueue;
}

// The picker under the background button: a picture of each scene (auto first) and of each other background in V's
// round, the one showing marked; a click shows it (a scene: the scenes, with that one picked). Its pictures are
// renderer/thumbs, fetched only when it opens.
function showVisMenu(open) {
  visMenu.hidden = !open;
  if (!open) return;
  const now = VISUALS[state.visual];
  const tile = (kind, name, label, on) => `<button type="button" role="menuitem" class="tile${on ? ' on' : ''}" data-kind="${kind}" data-name="${name}"><img src="thumbs/${kind}-${name}.webp" alt="" width="160" height="100"><span>${label}</span></button>`;
  const scenes = ['auto', ...scenery.scenes].map((s) => tile('scene', s, s === 'auto' ? 'auto: a new one each song' : (SCENE_NAMES[s] || s).replace(/^the /, ''), now === 'scenery' && !state.sceneryTheme && state.sceneryScene === s));
  const more = V_ROUND.filter((v) => v !== 'scenery').map((v) => tile('bg', v, v === 'off' ? 'off: just the code' : visName(v), now === v));
  const presets = PRESETS.map((p) => `<button type="button" role="menuitem" class="tile" data-kind="preset" data-name="${p.id}"><img src="${p.picture}" alt="" width="160" height="100"><span>${p.name}</span></button>`);
  visMenu.innerHTML = `<div class="pick-head">presets</div><div class="pick-presets">${presets.join('')}</div><div class="pick-head">scenes</div><div class="pick-grid">${scenes.join('')}</div><div class="pick-head">more backgrounds</div><div class="pick-grid">${more.join('')}</div>`;
  const b = $('b-visual');
  visMenu.style.left = `${Math.max(12, Math.min(b.offsetLeft, innerWidth - visMenu.offsetWidth - 12))}px`;
}
$('b-visual').onclick = () => showVisMenu(visMenu.hidden);
visMenu.onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.kind === 'preset') { showVisMenu(false); choosePreset(b.dataset.name).catch(showError); return; }
  if (b.dataset.kind === 'scene') {
    state.sceneryScene = b.dataset.name; state.sceneryTheme = false;
    setVisual(VISUALS.indexOf('scenery'));
    flashStatus('scene: ' + (SCENE_NAMES[b.dataset.name] || b.dataset.name));
  } else { setVisual(VISUALS.indexOf(b.dataset.name)); flashStatus('background: ' + visName(b.dataset.name)); }
  saveSettings();
  showVisMenu(false); crtStatic(); crtOsd(crtChannel());
};
addEventListener('pointerdown', (e) => { if (!visMenu.hidden && !e.target.closest('#vis-menu, #b-visual')) showVisMenu(false); }, true);
// the koi pond: a click on the water (not on a button, a menu or a panel) drops food there, and the
// koi nearest come to it
addEventListener('click', (e) => {
  if (VISUALS[state.visual] === 'scenery' && sceneShown() === 'koi' && !e.target.closest('button, a, input, select, dialog, [role="menu"], .panel, #menu, #bar, footer, #alerts, #notice, #err, #card')) scenery.feed(e.clientX, e.clientY);
});
$('b-blocks').onclick = () => nextBlocks();
$('b-cam').onclick = () => toggleCam();
$('b-card').onclick = () => toggleCard();
$('b-strudel').onclick = () => openInStrudel();
$('b-rec').onclick = () => toggleRecording();
$('b-layout').onclick = () => toggleLayout();
$('b-mini').onclick = () => (gameShowing() && window.nc?.setWidget ? window.nc.setWidget(true) : toggleMini());
$('b-help').onclick = () => $('help').showModal();

$('rename-form').addEventListener('submit', () => {
  const title = $('rename-title').value.trim(), artist = $('rename-artist').value.trim();
  state.manual = title || artist ? { title: title || 'untitled', artist: artist || 'Unknown' } : null;
});

// ---------------------------------------------------------------- keys

// Every action and its key. Each key can be changed in the help (?): click it, press the new one;
// a key another action has goes over to it in exchange. The changes are kept with the settings
// (only the ones that differ from these). Esc, ? and F11 stay as they are.
const ACTIONS = [
  { id: 'source', key: 's', run: () => showMenu() },
  { id: 'visual', key: 'v', run: () => { setVisual(VISUALS.indexOf(V_ROUND[(V_ROUND.indexOf(VISUALS[state.visual]) + 1) % V_ROUND.length])); flashStatus('background: ' + visName(VISUALS[state.visual])); crtStatic(); crtOsd(crtChannel()); } },
  { id: 'strength', key: 'a', run: () => (state.blocks && state.blockLook === 'game' ? nextGameScreens() : VISUALS[state.visual] === 'worlds' ? nextWorldLook() : VISUALS[state.visual] === 'chrome' ? toggleCollage() : VISUALS[state.visual] === 'spectrogram' ? toggleSpectroColours() : VISUALS[state.visual] === 'scenery' ? nextScene() : flashStatus(`${K('strength')} changes the scene, the world's look, the chrome's collage, the spectrogram's colours or the handheld's screens`)) },
  { id: 'blocks', key: 'p', run: () => nextBlocks() },
  // R: the orb, its 3D shapes over any background (off the keys in 0.4.23, back in 0.4.26: it was missed)
  { id: 'orb', key: 'r', run: () => { setOrb(!state.orb); flashStatus(state.orb ? 'the orb on' : 'the orb off'); } },
  // the blocks' timing: earlier if they land after the beat, later if before
  { id: 'later', key: '[', run: () => nudgeSync(-10) },
  { id: 'earlier', key: ']', run: () => nudgeSync(10) },
  { id: 'cam', key: 'c', run: () => toggleCam() },
  { id: 'card', key: 'n', run: () => toggleCard() },
  { id: 'strudel', key: 'o', run: () => openInStrudel() },
  { id: 'rec', key: 'm', run: () => toggleRecording() },
  { id: 'clips', key: 'j', run: () => toggleClips() },
  { id: 'export', key: 'x', run: () => exportSong().catch(showError) },
  { id: 'camfx', key: 'k', run: () => setCamFx((state.camFx + 1) % CAM_FX.length, true) },
  { id: 'tap', key: ' ', run: () => tapBeat() },
  { id: 'hush', key: 'q', run: () => setHush(!state.hushed) },
  // (D: the drop, now, for everything that answers one: the drop effect (none when B has it off),
  // the worlds' look, the chrome's splash, and the scenery's moment, which watches the engine's drop
  // time: the toast pops, the koi gather, the sharks charge, the fireworks go up)
  { id: 'drop', key: 'd', run: () => { eng.lastDrop = nowSec(); eng.on.drop(); } },
  { id: 'dropfx', key: 'b', run: () => { state.drop = (state.drop + 1) % DROPS.length; saveSettings(); flashStatus('drop fx: ' + DROPS[state.drop]); } },
  { id: 'machine', key: 'i', run: () => { state.info = !state.info; sys.show(state.info); } },
  { id: 'layout', key: 'l', run: () => toggleLayout() },
  { id: 'mini', key: 'w', run: () => (WIDGET ? window.nc?.setWidget(false) : gameShowing() && window.nc?.setWidget ? window.nc.setWidget(true) : toggleMini()) },
  { id: 'theme', key: 't', run: () => nextTheme() },
  { id: 'crt', key: 'y', run: () => { setCrt(!state.crt); flashStatus(state.crt ? 'crt on' : 'crt off'); } },
  { id: 'name', key: 'e', run: () => renameSong() },
  { id: 'hide', key: 'h', run: () => document.body.classList.toggle('clean') },
  { id: 'code', key: 'z', run: () => { const next = nextCodeSetting(state); setCodeHidden(next.codeHidden, next.beatHidden); flashStatus(codeSaid()); } },
  { id: 'full', key: 'f', run: () => window.nc?.toggleFullscreen() },
];
// the footer's list of keys, in this order: [actions..., what it says]
const FOOTER = [['source', 'source'], ['visual', 'background'], ['strength', 'next'], ['blocks', 'code look'], ['theme', 'theme'], ['code', 'hide code']];
const RESERVED = new Set(['escape', '?', '/', 'f11', 'tab', 'enter', 'shift', 'control', 'alt', 'meta', 'capslock', 'contextmenu']);
const keyOf = (id) => state.keys[id] ?? ACTIONS.find((a) => a.id === id).key;
const keyName = (k) => (k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
const K = (id) => keyName(keyOf(id)); // an action's key as written
let byKey = new Map();

// Ctrl+K (renderer/palette.js): every action by name, then each scene, background, code look,
// handheld screen and theme, and the bug report.
const sceneName = (scene) => SCENE_NAMES[scene] || scene;
const screenName = (screen) => SCREEN_NAMES[screen] || screen;
const paletteEntries = () => [
  ...actionCommands(ACTIONS, K),
  ...scenery.scenes.map((scene) => ({
    id: 'scene:' + scene, name: sceneName(scene).replace(/^the /, ''), aliases: scene === 'koi' ? ['koi pond'] : [],
    run: () => { state.sceneryScene = scene; state.sceneryTheme = false; setVisual(VISUALS.indexOf('scenery')); flashStatus('scene: ' + sceneName(scene)); },
  })),
  ...V_ROUND.map((name) => ({
    id: 'background:' + name, name: 'background: ' + visName(name),
    run: () => { setVisual(VISUALS.indexOf(name)); flashStatus('background: ' + visName(name)); },
  })),
  // the classics, out of V's round since 0.4.23, by name only
  ...VISUALS.filter((name) => !V_ROUND.includes(name)).map((name) => ({
    id: 'background:' + name, name: `background: ${visName(name)} (classic)`, aliases: ['classic', 'old'],
    run: () => { setVisual(VISUALS.indexOf(name)); flashStatus(`background: ${visName(name)} (classic)`); },
  })),
  ...BLOCK_LOOKS.map((look) => ({
    id: 'look:' + look, name: 'code look: ' + ({ game: 'handheld game', blocks: 'punchcard' }[look] || look),
    aliases: look === 'game' ? ['handheld', 'game'] : [],
    run: () => { state.blockLook = look; setBlocks(true); flashStatus('code look: ' + look); },
  })),
  // Z's three settings, by name
  ...[['shown', false, false], ['hidden', true, false], ['the beat hidden', false, true]].map(([name, on, beat]) => ({
    id: 'code:' + name, name: 'code: ' + name, aliases: beat ? ['drums', 'ambient', 'no beat'] : [],
    run: () => { setCodeHidden(on, beat); flashStatus(codeSaid()); },
  })),
  ...GAME_SCREENS.map((screen) => ({
    id: 'screen:' + screen, name: 'handheld screens: ' + screenName(screen), aliases: screen === 'jp' ? ['japan', 'jp'] : [],
    run: () => { state.gameScreens = screen; setGameScreens(screen); state.blockLook = 'game'; setBlocks(true); flashStatus('screens: ' + screenName(screen)); },
  })),
  ...THEMES.map((name, i) => ({
    id: 'theme:' + name, name: 'theme: ' + name,
    run: () => { state.theme = i; applyTheme(); saveSettings(); flashStatus('theme: ' + name); },
  })),
  ...PRESETS.map((p) => ({ id: 'preset:' + p.id, name: 'preset: ' + p.name.toLowerCase(), aliases: ['setup'], run: () => choosePreset(p.id) })),
  { id: 'report-bug', name: 'report a bug', aliases: ['bug', 'issue', 'problem'], run: () => bugReport.show() },
];
const palette = createPalette({
  document, window, entries: paletteEntries, fail: showError,
  blocked: () => WIDGET || !$('menu').hidden || !!document.querySelector('dialog[open]'),
});
$('search-commands').onclick = () => { $('help').close(); palette.open(); };

// The first visit (renderer/firstrun.js): a hint for V, then P, then Z, over that key in the footer.
// Never while recording, in the clean, 9:16 or mini views, or over a dialog, a menu or a notice.
// Once all three are done that's saved, and the check stops.
let hintState = initialHints(), hintCloseTimer;
const hintPill = document.createElement('button');
hintPill.id = 'first-run-hint';
hintPill.type = 'button';
hintPill.hidden = true;
hintPill.setAttribute('aria-live', 'polite');
document.body.append(hintPill);
function updateHints(event = {}) {
  const blocked = !!rec.mr || rec.busy || document.body.classList.contains('clean') || state.vertical || state.mini || WIDGET
    || !!document.querySelector('dialog[open]') || !$('menu').hidden || !visMenu.hidden || !$('notice').hidden;
  const result = advanceHints(hintState, {
    now: nowSec(), hasCode: LINE_IDS.some((id) => !!view.lines[id].shown), enabled: !state.hintsDone, blocked,
    touch: matchMedia('(hover: none) and (pointer: coarse)').matches,
    keys: { visual: K('visual'), blocks: K('blocks'), code: K('code') },
    ...event,
  });
  hintState = result.state;
  if (result.complete && !state.hintsDone) { state.hintsDone = true; saveSettings(); }
  if (result.hint) {
    clearTimeout(hintCloseTimer);
    hintPill.hidden = false;
    hintPill.classList.add('show');
    if (hintPill.dataset.hint !== result.hint.text) {
      const k = document.createElement('kbd');
      k.textContent = result.hint.key;
      hintPill.replaceChildren(k, document.createTextNode(' ' + result.hint.body));
      hintPill.dataset.hint = result.hint.text;
    }
    // centred over its key in the footer's list (or the screen, if the footer doesn't show it)
    const text = document.querySelector('footer .keys').firstChild;
    const at = text?.textContent.indexOf(result.hint.key + ' ');
    let x = innerWidth / 2;
    if (text && at >= 0) {
      const range = document.createRange();
      range.setStart(text, at);
      range.setEnd(text, at + result.hint.key.length);
      const r = range.getBoundingClientRect();
      x = (r.left + r.right) / 2;
    }
    hintPill.style.left = Math.max(12, Math.min(x - hintPill.offsetWidth / 2, innerWidth - hintPill.offsetWidth - 12)) + 'px';
  } else if (hintPill.classList.contains('show')) {
    hintPill.classList.remove('show');
    clearTimeout(hintCloseTimer);
    hintCloseTimer = setTimeout(() => { hintPill.hidden = true; }, 200);
  }
}
hintPill.onclick = () => updateHints({ dismiss: true });
const hintTimer = setInterval(() => {
  updateHints();
  if (state.hintsDone && hintPill.hidden) clearInterval(hintTimer);
}, 200);

// Report a bug (renderer/bug-report.js), from the help or Ctrl+K. The details it fills in.
let bugVersion = NEWS[0]?.version || 'unknown'; // (the website's; the app says its own below)
window.nc?.version?.().then((v) => { bugVersion = v; }).catch(() => {});
function osName() {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) return 'Android';
  if (/iPad|iPhone/.test(ua)) return 'iOS'; // (before Mac: an iPhone says "like Mac OS X")
  return /Mac/.test(ua) ? 'macOS' : 'other';
}
function browserName() {
  const ua = navigator.userAgent;
  // Edge says Chrome too, and Chrome says Safari, so the order matters
  for (const [name, re] of [['Edge', /Edg\/(\d+)/], ['Firefox', /Firefox\/(\d+)/], ['Chrome', /Chrome\/(\d+)/], ['Safari', /Version\/(\d+).*Safari/]]) {
    const m = ua.match(re);
    if (m) return name + ' ' + m[1];
  }
  return 'unknown';
}
const SOURCE_KINDS = { system: 'system', file: 'file', input: 'mic', tab: 'tab', demo: 'demo', radio: 'stream' };
const bugReport = createBugReport({
  document,
  context: () => ({
    version: bugVersion, platform: desktopApp() ? 'app' : 'website', os: osName(), browser: browserName(),
    layout: state.vertical ? '9:16' : 'wide', background: VISUALS[state.visual], codeLook: state.blocks ? state.blockLook : 'none',
    theme: THEMES[state.theme], audioSource: SOURCE_KINDS[state.source] || 'none',
  }),
  errors: () => recentBugErrors,
  open: (url) => (desktopApp() ? window.nc.openBugIssue(url) : window.open(url, '_blank', 'noopener')),
  fail: showError,
});
$('report-bug').onclick = () => { $('help').close(); bugReport.show(); };

// (A's word: what it changes on what's showing; left out where there's nothing to change)
function nextWhat() {
  if (gameShowing()) return 'next screen';
  return { scenery: 'next scene', worlds: 'next look', chrome: 'collage', spectrogram: 'colours' }[VISUALS[state.visual]] || null;
}
// (Z's word: what it does next, as the code is now)
function codeNext() {
  return state.codeHidden ? 'code, no beat' : state.beatHidden ? 'all the code' : 'hide code';
}
function footerKeys() {
  const word = (f) => (f[0] === 'code' ? codeNext() : f[f.length - 1]);
  const parts = FOOTER.map((f) => (f[0] === 'strength' ? (nextWhat() ? `${K('strength')} ${nextWhat()}` : null) : `${f.slice(0, -1).map(K).join(' ')} ${word(f)}`));
  document.querySelector('footer .keys').textContent = [...parts.filter(Boolean), '? all keys'].join(' · ');
}

// The controls panel (controls.js): on a screen with no hover (an iPad, a phone), every action above as a
// button, with what it's set to. Nothing is added where there's a mouse. What a device can't do is left out.
const onoff = (v) => ({ text: v ? 'on' : 'off', on: !!v });
const desktopApp = () => !!window.nc && window.nc.platform !== 'web';
const standalone = () => !!navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const canRecord = () => !!window.nc?.recSource && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices && (desktopApp() || !!navigator.mediaDevices.getDisplayMedia);
const controls = createControls({
  document, window, query: matchMedia('(hover: none)'), actions: ACTIONS, K, fail: (err) => showError(err),
  dock: new URLSearchParams(location.search).get('dock') || 'auto',
  now: {
    source: () => state.label || '',
    visual: () => VISUALS[state.visual],
    strength: () => {
      const v = VISUALS[state.visual];
      if (state.blocks && state.blockLook === 'game') return `game screens: ${SCREEN_NAMES[state.gameScreens]}`;
      return v === 'worlds' ? state.worldLook : v === 'chrome' ? `collage ${state.chromeCollage ? 'on' : 'off'}` : v === 'spectrogram' ? (state.spectroTheme ? "the theme's colours" : 'rainbow')
        : v === 'scenery' ? state.sceneryScene + (state.sceneryTheme ? ", theme's colours" : '') : STRENGTHS[state.strength][0];
    },
    blocks: () => ({ text: !state.blocks ? 'off' : { blocks: 'punchcard', dominoes: 'dominoes', game: 'handheld game' }[state.blockLook], on: state.blocks }),
    later: () => `blocks sync ${state.syncTrim > 0 ? '+' : ''}${state.syncTrim} ms`,
    earlier: () => `blocks sync ${state.syncTrim > 0 ? '+' : ''}${state.syncTrim} ms`,
    cam: () => ({ text: !cam.on ? 'off' : state.eyes ? 'big eyes' : state.ascii ? 'ASCII' : 'on', on: cam.on }),
    card: () => { const on = state.vertical ? state.cardV : state.card; return { text: !on ? 'off' : state.cardBig ? 'big' : 'on', on }; },
    rec: () => ({ text: rec.mr ? 'recording' : 'off', on: !!rec.mr }),
    clips: () => onoff(clips.on),
    camfx: () => CAM_FX[state.camFx],
    tap: () => (eng.tempo?.bpm ? `tempo ${Math.round(eng.tempo.bpm)}` : ''),
    hush: () => onoff(state.hushed),
    dropfx: () => DROPS[state.drop],
    machine: () => onoff(state.info),
    layout: () => onoff(state.vertical),
    mini: () => onoff(state.mini),
    theme: () => THEMES[state.theme],
    crt: () => onoff(state.crt),
    name: () => state.manual?.title || '',
    hide: () => onoff(document.body.classList.contains('clean')),
    code: () => ({ text: state.codeHidden ? 'on' : state.beatHidden ? 'just the beat' : 'off', on: state.codeHidden || state.beatHidden }),
    full: () => onoff(document.fullscreenElement || document.webkitFullscreenElement),
  },
  can: {
    cam: () => !!navigator.mediaDevices?.getUserMedia,
    rec: canRecord,
    clips: () => canRecord() && !!window.nc?.saveClip,
    export: () => !!window.nc?.saveSong,
    strudel: () => !!window.nc?.openStrudel,
    layout: desktopApp,
    mini: desktopApp,
    // (a phone's browser has no fullscreen; an app on the home screen already is)
    full: () => !!window.nc?.toggleFullscreen && !standalone() && (desktopApp() || !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)),
  },
});

function nudgeSync(ms) {
  state.syncTrim = Math.max(-200, Math.min(200, state.syncTrim + ms));
  saveSettings();
  flashStatus(`blocks sync: ${state.syncTrim > 0 ? '+' : ''}${state.syncTrim} ms`);
}
// tap tempo: four taps on the beat set it, for a song it can't find (or finds wrong)
function tapBeat() {
  document.activeElement?.blur?.();
  const n = eng.tap(nowSec());
  flashStatus(n < 4 ? 'tap ' + '•'.repeat(n) : `tempo ${Math.round(eng.tempo.bpm)} (tapped)`);
}
function renameSong() {
  const s = currentSong();
  $('rename-title').value = state.manual?.title || s?.title || '';
  $('rename-artist').value = state.manual?.artist || s?.artist || '';
  $('rename').showModal();
}

// The keys as set, everywhere they're shown: the footer, the header buttons' tips, the help (each
// key a button to change it) and the help's mentions of them.
function applyKeys() {
  byKey = new Map(ACTIONS.map((a) => [keyOf(a.id), a]));
  footerKeys();
  for (const b of document.querySelectorAll('header button[data-act]')) b.title = `${b.dataset.title} (${K(b.dataset.act)})`;
  for (const el of document.querySelectorAll('#help [data-k]')) el.textContent = K(el.dataset.k);
  for (const row of document.querySelectorAll('#help tr[data-act]')) {
    const cell = row.cells[0];
    cell.textContent = '';
    row.dataset.act.split(',').forEach((id, i) => {
      if (i) cell.append(' / ');
      const b = document.createElement('button');
      b.className = 'key';
      b.textContent = K(id);
      b.title = 'click, then press the key you want for this';
      b.onclick = () => { rebinding = { id, b }; b.textContent = 'press a key'; b.classList.add('waiting'); };
      cell.append(b);
    });
  }
}
let rebinding = null;
// (while a key button in the help waits, the next key goes to it, and nowhere else)
addEventListener('keydown', (e) => {
  if (!rebinding) return;
  const k = e.key.toLowerCase();
  e.preventDefault();
  e.stopImmediatePropagation();
  if (['shift', 'control', 'alt', 'meta'].includes(k)) return; // the key itself is still to come
  const { id, b } = rebinding;
  rebinding = null;
  b.blur();
  if (k !== 'escape' && !RESERVED.has(k)) {
    const other = ACTIONS.find((a) => a.id !== id && keyOf(a.id) === k);
    if (other) state.keys[other.id] = keyOf(id); // they trade
    state.keys[id] = k;
    for (const a of ACTIONS) if (state.keys[a.id] === a.key) delete state.keys[a.id];
    saveSettings();
    flashStatus(`${K(id)}: ${FOOTER.find((f) => f.includes(id))?.at(-1) ?? id}` + (other ? ` (${K(other.id)} now)` : ''));
  }
  applyKeys();
}, true);
$('keys-reset').onclick = () => { state.keys = {}; saveSettings(); applyKeys(); flashStatus('keys as they came'); };

addEventListener('keydown', (e) => {
  if (e.target.closest('dialog')) return;
  if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyH') { if (!e.repeat) toggleHandLog().catch(showError); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (!visMenu.hidden) { showVisMenu(false); if (k === 'escape') return; }
  if (k === 'escape') { if (WIDGET) { window.nc?.setWidget(false); return; } closeMenu(); return; }
  if (e.target.closest('#alerts, #menu:not([hidden]) input')) return; // let Enter/Space press the message box's button, and an address be typed
  if (k === '?' || k === '/') { $('help').showModal(); return; }
  if (k === 'f11') { e.preventDefault(); window.nc?.toggleFullscreen(); return; }
  const act = byKey.get(k);
  if (!act) return;
  if (k === ' ' || act.id === 'full') e.preventDefault(); // (Space would scroll or press a button)
  // A key held down repeats: only the sync nudges ([ and ]) take that. Anything else would go
  // round again (Oct 16: M held a moment too long stopped a recording and started a new one a
  // second later, which ran on unnoticed for four minutes).
  if (e.repeat && act.id !== 'later' && act.id !== 'earlier') return;
  updateHints({ action: act.id });
  act.run();
});

let statusTimer;
function flashStatus(text) {
  const el = $('status');
  el.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = restingStatus(); }, 1600);
}

addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => {
  e.preventDefault();
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(x.name));
  if (f) useFile(f).catch(showError);
});

// main.js calls this right after the window loads (as a user gesture, which screen capture needs).
window.startSystemAudio = () => useSystem().catch((err) => {
  const denied = err?.name === 'NotAllowedError' || err?.name === 'NotReadableError';
  if (onMac() && denied) {
    showMenu('Could not hear this Mac. In System Settings, Privacy & Security, allow Toaster to record system audio (it is listed as Electron when you run it from source), then quit Toaster and open it again. The demo beat, a file or an input still work.');
    return;
  }
  showMenu(`Could not hear your ${onMac() ? 'Mac' : 'PC'}'s sound (${err?.message || err}). The demo beat, a file or an input still work: pick one below.`);
});

// For testing from tools/cdp.mjs: lets a script drive the app (e.g. run the demo silently).
window.__nc = { get artImg() { return artImg; }, songArt, eng, state, view, ac, cam, takeover, punch, card, glass, orb, cuts, worlds, tracker, lens, portal, segcam, gestures, handLog, setHush, meshFace, openInStrudel, strudelProgram, strudelLink, attach, syncOffset, useDemo, useSystem, useInput, setCalm, setVisual, setBlocks, palette, paletteEntries, updateHints, bugReport, retainBugError, choosePreset, presetSetters, setOrb, setGlass, toggleLayout, toggleCard, showMenu, controls };

// the version, in the menu and the help; and what's new since the version last opened
window.nc?.version?.().then((v) => {
  for (const el of document.querySelectorAll('.ver')) el.textContent = 'v' + v;
  const news = state.firstRun ? [] : newsSince(state.seenVersion, v);
  if (news.length) setTimeout(() => showNews(news, v), 3500);
  else if (state.seenVersion !== v) { state.seenVersion = v; saveSettings(); }
});

loadSettings();
if (WIDGET) {
  Object.assign(state, { blocks: true, blockLook: 'game', visual: VISUALS.indexOf('off'), codeHidden: true, card: false, cardV: false, orb: false, glass: false, crt: false, firstRun: false });
  document.documentElement.classList.add('widget'); document.body.classList.add('widget');
  $('w-back').onclick = () => window.nc?.setWidget(false);
}
$('radio-url').value = state.radio;
newsRows();
$('b-rec').dataset.title = `Record a video of the window, with the sound, into ${onMac() ? 'Movies/Toaster' : 'Videos\\Toaster'}`;
applyKeys();
applyTheme();
setVisual(state.visual);
setStrength(state.strength);
setCamFx(state.camFx);
setBlocks(state.blocks);
setOrb(state.orb);
setGlass(state.glass);
setCodeHidden(state.codeHidden, state.beatHidden);
setCrt(state.crt);
setCalm(state.calm);
setUpdates(state.updates);
setTimeout(() => offerUpdate(), 8000);
applyCard();
// the first time Toaster opens, a word on where to start (it's already listening to the PC)
window.nc?.onFullScreen?.((on) => document.documentElement.classList.toggle('full', !!on));
if (state.firstRun && window.nc) setTimeout(() => showNotice(`Toaster is listening to whatever your ${onMac() ? 'Mac' : 'PC'} plays and writing it as code. ? shows the keys and how it works; ${K('source')} picks another source; ${K('cam')} turns on the camera.`), 2500);
requestAnimationFrame(draw);
if (!window.nc) showMenu('Running outside the desktop app: pick a source.', 'info');
