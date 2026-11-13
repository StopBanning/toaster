// Toaster: wires the audio sources, the listening engine, the code view and the visuals.
import { clock } from './clock.js';
import { createAnimationDriver } from './dom-time.js';
import { createEngine, NOTES, nowSec, ROLL_COLS } from './engine.js';
import { buildLines, LINE_IDS, resetCodegen, strudelProgram, strudelLink } from './codegen.js';
import { createCodeView, nextCodeSetting } from './codeview.js';
import { createField, createTunnel, createPunchcard, createWebcam, rgbOf, bands, RAMP, GAME_SCREENS, setGameScreens, setGameCode } from './visuals.js';
import { readMirror } from './camview.js';
import { createOrb } from './orb.js';
import { createDotCam } from './dotcam.js';
import { createVoxCam } from './voxcam.js';
import { createTakeover, createSysinfo, showBsod, xpAlert } from './fx.js';
import { createStorm } from './storm.js';
import { createY2k } from './y2k.js';
import { createCard } from './card.js';
import { createPost, LOOKS } from './post.js';
import { createGlass } from './glass.js';
import { createTracker } from './tracking.js';
import { createLens } from './lens.js';
import { createHandPoints } from './handpoints.js';
import { createPortal } from './portal.js';
import { createSegcam } from './segcam.js';
import { createGestures } from './gestures.js';
import { createHandLog } from './handlog.js';
import { createSpiral, createWheel } from './rings.js';
import { createFire } from './fire.js';
import { createWarp } from './warp.js';
import { createWorlds } from './worlds.js';
import { createChrome } from './chrome.js';
import { createSpaghetti } from './spaghetti.js';
import { createSpectro } from './spectro.js';
import { createScenery, FIELD } from './scenery.js';
import { createLanes } from './lanes.js';
import { createEarth, EARTH_CLIPS, EARTH_GROUPS, EARTH_TOUR } from './earth.js';
import { createBackrooms } from './backrooms.js';
import { createWait } from './wait.js';
import { createCuts } from './cuts.js';
import { createTape } from './tape.js';
import { buildSongFiles } from './tape-export.js';
import { createClips } from './clips.js';
import { createTakeTap } from './take-tap.js';
import { makeDemo } from './demo.js';
import { NEWS, newsSince } from './news.js';
import { createControls } from './controls.js';
import { createPlayerBar, readPlayerBar, readPlayerRec } from './player.js';
import { createPalette, actionCommands } from './palette.js';
import { advanceHints, initialHints } from './firstrun.js';
import { createBugReport, errorSummary } from './bug-report.js';
import { createMisreadReport } from './misread.js';
import { drawShareCard, shareCardName } from './share-card.js';
import { PRESETS, applyPreset } from './presets.js';
import { ACCENT_TEXT_VAR, ACCENT_VAR, BLUESCREEN, THEME_VARS, coverPalette, createDynamicTheme, fullPalette, heatStops, paletteVars, terrainStops } from './cover-palette.js';
import { embeddedCover } from './embedded-cover.js';
import { readTags, songOfFile } from './audio-tags.js';
// (the library's panel and its two modules, library-panel.js, library-source.js and library.js, are not imported here: they are fetched when
// it is first opened, see makeLibrary below. library-core.js is what the page has of it from the start.)
import { lazyLibrary, queueLine, queueNext, queueOf, queuePrevious, readScenes, sceneForLoad, readStations, noteStation, sceneIsOn, setupOf, readLinks, noteLink, nameLink, nextRepeat, noteRecent, readRecent, readRepeat, readResume, withShuffle, deleteScene as dropScene, renameScene as nameScene, saveScene as addScene, noteRadioCover, queueSkip, trackLabel } from './library-core.js';
import { createGlPool, watch, glBudget } from './gl-pool.js';
// The WebGL pictures take turns under the browser's limit (gl-pool.js): every canvas is watched from here on, before any
// layer is made, and showLayers tends the pool each frame.
const glPool = createGlPool({ budget: glBudget({ app: !!window.nc, touch: matchMedia('(hover: none)').matches }) });
watch(glPool, HTMLCanvasElement.prototype);

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const VISUALS = ['spectrum', 'tunnel', 'spiral', 'pitchwheel', 'warp', 'cuts', 'worlds', 'chrome', 'spectrogram', 'scenery', 'rain', 'scope', 'fire', 'off', 'spaghetti', 'lanes', 'earth', 'backrooms'];
// What V goes round, best first, and their names on screen. The rest of VISUALS (spectrum, tunnel, spiral, pitch wheel,
// warp, scope) are out of the round since 0.4.23: kept unlisted for a release, in case someone misses one, then gone.
// The rain came back in 0.4.26: someone did miss it. The rest stay out of V but can be picked by name in Ctrl+K
// ("background: warp (classic)"), and stay picked.
const V_ROUND = ['scenery', 'earth', 'backrooms', 'worlds', 'chrome', 'spaghetti', 'spectrogram', 'lanes', 'cuts', 'fire', 'rain', 'off'];
const V_NAME = { scenery: 'scenes', pitchwheel: 'pitch wheel', earth: 'the Earth', backrooms: 'the backrooms' };
const visName = (v) => V_NAME[v] || v;
const ON_VIS = ['tunnel', 'spiral', 'pitchwheel', 'cuts', 'fire']; // the backgrounds drawn on the #vis canvas
const FIELD_VIS = ['spectrum', 'rain', 'scope']; // and the ones drawn as ASCII, on #field
// (the last, dynamic, has no colours of its own: they're the song's cover's, see the dynamic theme below)
const THEMES = ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen', 'dynamic', 'softclub', 'fall2003']; // (kept by its place in this list: a new one goes last)
const DROPS = ['xp takeover', 'y2k bug', 'blue screen', 'not responding', 'off'];
// The camera's effects (K): none, just you over the visuals, slit-scan, datamosh, windows, glass,
// dots, voxels.
const CAM_FX = ['none', 'cut-out', 'slit-scan', 'datamosh', 'windows', 'glass', 'dots', 'voxels'];
// How strongly the ASCII background shows (A): a multiple of each theme's own strength (--field).
const STRENGTHS = [['soft', 1], ['normal', 1.5], ['bold', 2.2]];

// ---------------------------------------------------------------- audio

// (in the perfect take's render mode (take-replay.js) the page is in the render's hidden window: the take says what it was like)
const TAKE = window.takeRender?.meta || null;
const ac = new AudioContext(TAKE ? { sampleRate: TAKE.sampleRate } : { latencyHint: 'interactive' });
// (the take's cover, as the live page had it: the copy's card and cover colours are the live ones. It comes in during the run-up)
let takeArt = null;
if (TAKE?.art) { const im = new Image(); im.onload = () => { takeArt = im; }; im.src = TAKE.art; }
// (and its seed, from the start: what the page rolls as it starts, the rain's first drops, the CRT's snow, the noodle dancers' dice,
// would be rolled from this page's own seed, before the replay sets the take's, and two copies of one take would not agree)
if (TAKE) clock.seed = TAKE.seed;
clock.attach(ac); // the one clock (clock.js): on the audio clock while a source plays (see attach below), else the performance clock
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
const spaghetti = createSpaghetti($('spaghetti'));
const earth = createEarth($('earth')); // the planet from the space station, NASA's footage
let earthSaid = false; // (told once that a clip couldn't come down)
const backrooms = createBackrooms($('backrooms')); // our own walk through the backrooms, its lights worked by the song
let backroomsSaid = false;
let pendingLook = null; // (the look last used, while the looks from outside load)
const outsideLooks = new Set(); // (the looks from outside now in U's round)
const spectro = createSpectro($('spectro'), $('spectrobox')); // the spectrogram, and the pins over it
const scenery = createScenery($('scenery'));
const lanes = createLanes($('lanes')); // the patterns down a tunnel
const wait = createWait($('wait'), FIELD);
const cuts = createCuts($('vis')); // on the tunnel's canvas too
const punch = createPunchcard($('punch')); // its own layer, so it can sit on top of any background
const post = createPost($('post')); // U's looks: the layers above, run through a look, under the code
const cam = createWebcam($('cam'));
const dotCam = createDotCam($('dotcam'));
const voxCam = createVoxCam($('voxcam'));
const tracker = createTracker(); // hands and face, while the camera is on
const takeover = createTakeover({
  back: $('desk-back'), front: $('desk-front'),
  sources: { cam: () => cam.on, face: () => meshFace() || cam.face, crop: (r, out, w, h) => cam.drawCrop(r, out, w, h) },
});
const y2k = createY2k({ back: $('desk-back'), front: $('desk-front'), bsod: $('bsod') }); // the drop effect "y2k bug": the same desktop, as Windows 98
const sys = createSysinfo($('sys'), () => describeAudio());
const card = createCard($('card'));
const glass = createGlass($('glass'), $('code'));
const orb = createOrb($('orb'));
const LAYERS = ['cam', 'voxcam', 'dotcam', 'worlds', 'worldwords', 'chrome', 'spaghetti', 'earth', 'backrooms', 'spectro', 'spectrobox', 'scenery', 'lanes', 'vis', 'warp', 'field', 'asciicam', 'orb', 'punch'].map($); // the background canvases, bottom first, for the glass
const storm = createStorm($('storm')); // the drop effect "not responding"
const STORM_LAYERS = [...LAYERS, $('glass')]; // (what its window shows: the backgrounds, and the glass blob over them)
const lens = createLens($('lens')); // the finger frame
const handPoints = createHandPoints($('handpoints')); // the tracked hands drawn over the picture (Ctrl+K: hand points)
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
  visual: VISUALS.indexOf('scenery'), strength: 1, blocks: true, blockLook: 'dominoes', gameScreens: GAME_SCREENS[0], orb: false, theme: 0, drop: 0, info: false, vertical: false, glass: false, glassPlates: true, chromeCollage: true,
  mini: false, // the mini player (W): a small window over everything else
  codeHidden: false, // Z: the code hidden, just the visuals (Toaster as a visualizer)
  stagedTypos: false, // optional theatrical typing mistakes, disabled in recordings
  beatHidden: false, // Z's middle setting: just the beat hidden, the drum lines and their grid (for music with no pulse)
  crt: false, // Y: an old screen over everything (see #tube in the CSS)
  look: 'off', // U: a look over the visuals and under the code (renderer/post.js)
  eyes: false, // the camera's third setting: big eyes over your face
  ascii: false, // and its fourth: the camera as text, in place of the ASCII background
  camFx: 0, // the camera's effect (K), in CAM_FX
  handPoints: false, // the tracked hands drawn as dots and lines over the camera (Ctrl+K: hand points)
  worldLook: 'auto', // the worlds' look (A while they're on): auto, night, film, ascii, ink, risograph...
  spectroTheme: false, // the spectrogram in the theme's colours rather than the rainbow (A while it's on)
  sceneryTheme: false, // the scenery in the theme's two colours rather than its own (A while it's on)
  sceneryScene: 'auto', // and its scene (A too): auto (a new one each song), or one by name
  spaghettiKind: 'snakes', // the spaghetti's noodles (A while it's on): SPAGHETTI_KINDS
  earthTour: true,
  earthClip: 'aurora', // the Earth's view (A while it's on): EARTH_CLIPS
  calm: false, // fewer flashes (the help's setting; on at first if Windows' animations are off)
  updates: true, // look for a newer Toaster when it starts (the help's setting)
  mirror: true, // the camera mirrored, as a selfie view is; off, as the camera sees it (the help's setting; see camview.js)
  playerBar: true, // the player bar along the bottom (the help's setting; see player.js)
  playerRec: false, // and in a recording, which leaves it out unless this is on (the help's setting too)
  stopped: null, // the radio or the demo, stopped from the player bar: source is null then, and its play button brings it back
  radio: '', // the radio's address, as last played
  radioStations: [], // the stations played, the latest first: { url, at } (the library's radio: see library.js)
  userScenes: [], // the setups saved as scenes: { id, name, settings } in the shape of a preset (the library's scenes)
  spotifyLinks: [], // the Spotify links pasted into the library's spotify section, the latest first: { uri, at } and, once Spotify's player showed what it started on, title and artist
  queueRepeat: 'album', queueShuffle: false, // what the library's queue does at an album's end (REPEATS in library-core.js), and in what order
  libCover: 'chars', // the library's cover: 'chars' (all of it in characters) or 'photo' (the cover itself, framed, the characters faint around it; the album and its tracks written as code)
  recentAlbums: [], // the library's albums played lately, the latest first, by id (its shelf of six)
  queueResume: null, // where the library's queue was: { path, at } (the track's path in the folder, and the seconds into it), for G after a restart
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
const SAVED = ['handPoints', 'perfectCopy', 'stagedTypos', 'hintsDone', 'keys', 'codeHidden', 'beatHidden', 'crt', 'look', 'strength', 'blocks', 'blockLook', 'gameScreens', 'orb', 'card', 'cardV', 'cardBig', 'glass', 'theme', 'drop', 'syncTrim', 'camFx', 'calm', 'updates', 'mirror', 'playerBar', 'playerRec', 'worldLook', 'chromeCollage', 'spectroTheme', 'sceneryTheme', 'sceneryScene', 'spaghettiKind', 'radio', 'seenVersion', 'userScenes', 'radioStations', 'spotifyLinks', 'queueRepeat', 'queueShuffle', 'libCover', 'queueResume', 'recentAlbums', 'glassPlates', 'earthClip', 'patternKick', 'earthTour'];
function sceneDomains() {
  return { visual: VISUALS, theme: THEMES, blockLook: BLOCK_LOOKS, gameScreens: GAME_SCREENS,
    sceneryScene: ['auto', ...scenery.scenes], blocks: true, vertical: true, orb: true, libCover: ['chars', 'photo'],
    look: LOOKS, drop: DROPS, camFx: CAM_FX, earthClip: EARTH_CLIPS, earthTour: true, glass: true };
}
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
  state.earthTour = state.earthTour !== false;
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
  if (DROPS[state.drop] === 'y2k bug') y2k.prepare(); // (its font, ready for the drop)
  if (!Number.isFinite(state.syncTrim)) state.syncTrim = 0;
  if (!(state.strength in STRENGTHS)) state.strength = 1;
  if (!(state.camFx in CAM_FX)) state.camFx = 0;
  if (!BLOCK_LOOKS.includes(state.blockLook)) state.blockLook = 'blocks';
  if (!GAME_SCREENS.includes(state.gameScreens)) state.gameScreens = GAME_SCREENS[0];
  setGameScreens(state.gameScreens);
  if (!worlds.looks.includes(state.worldLook)) state.worldLook = 'auto';
  worlds.setLook(state.worldLook);
  if (!EARTH_CLIPS.includes(state.earthClip)) state.earthClip = 'aurora';
  state.glassPlates = state.glassPlates !== false;
  earth.setClip(state.earthClip);
  state.card = state.card === true;
  state.cardV = state.cardV !== false;
  state.mirror = readMirror(state.mirror); // (an older profile has none: mirrored)
  state.playerBar = readPlayerBar(state.playerBar); // (and none of these two: the bar on, and out of recordings)
  state.playerRec = readPlayerRec(state.playerRec);
  // (the library's: an older profile has no scenes, and as its stations only the last one played)
  state.userScenes = readScenes(state.userScenes, sceneDomains());
  state.radioStations = readStations(state.radioStations, state.radio);
  state.spotifyLinks = readLinks(state.spotifyLinks); // (an older profile has none)
  state.queueRepeat = readRepeat(state.queueRepeat); // (an older profile has neither: the album repeats, in its order)
  state.queueShuffle = state.queueShuffle === true;
  if (state.libCover !== 'photo') state.libCover = 'chars';
  state.queueResume = readResume(state.queueResume);
  state.recentAlbums = readRecent(state.recentAlbums);
  state.cardBig = state.cardBig === true;
  state.spectroTheme = state.spectroTheme === true;
  state.sceneryTheme = state.sceneryTheme === true;
  if (!['auto', ...scenery.scenes].includes(state.sceneryScene)) state.sceneryScene = 'auto';
  if (!SPAGHETTI_KINDS.includes(state.spaghettiKind)) state.spaghettiKind = 'snakes';
  state.keys = readKeys(state.keys); // (the keys you changed)
  state.glass = state.glass === true;
  state.codeHidden = state.codeHidden === true;
  state.beatHidden = state.beatHidden === true && !state.codeHidden;
  state.crt = state.crt === true;
  state.perfectCopy = state.perfectCopy === true;
  state.stagedTypos = state.stagedTypos === true;
  pendingLook = state.look; // (a look from outside isn't in yet: it's put back once it is, see loadLooks)
  state.look = LOOKS.includes(state.look) ? state.look : 'off';
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
  if (TAKE) return 0.014; // (a render has no screen and no speakers: only the ~14 ms the engine takes to notice a hit)
  const display = 35, notice = 14;
  return (display + notice - heardAfter() + state.syncTrim) / 1000;
}
function saveSettings() {
  if (WIDGET || TAKE) return;
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
  clock.playing = false;
  // (and the radio's titles, read beside its stream, and the cover of the file that was playing)
  window.nc?.radioTitles?.(null);
  state.radioSong = radioArt = fileArt = null;
  fileTags = null;
  state.radioKey = '';
}

function attach(node, source, label) {
  // (the names a file read before it started, if this is that file: see useFile)
  fileTags = source === 'file' && pendingTags?.name === label ? pendingTags.tags : null;
  pendingTags = null;
  // (and the library's queue, if this is a track picked there: it plays through, so the file doesn't loop)
  if (source === 'file' && pendingQueue?.name === label) { queue = { ...pendingQueue.q, el: state.el }; state.el.loop = false; pendingQueue = null; }
  node.connect(fast);
  node.connect(mid);
  node.connect(slow);
  state.node = node;
  clock.playing = true;
  state.source = source;
  state.label = label;
  state.stopped = null;
  tapRecording();
  clips.retap();
  takeFollow();
  // a file or the demo plays from its start; system audio, inputs and the radio may be halfway through a song
  freshStart(source === 'file' || source === 'demo');
  $('menu').hidden = true;
  if (window.nc?.platform === 'web') $('alerts').innerHTML = '';   // (a browser's "pick a source" box goes with the menu)
  document.body.classList.add('live');
  $('status').classList.add('on');
  $('status').textContent = '● live';
}

// New source or new song: wipe the screen and start typing again from a blank window. top: the
// song starts now, from its beginning (see listenOpening in engine.js).
function freshStart(top = false) {
  clock.newSong(); // the dice of a song (clock.rng) are its own; a take keeps the seed so a render rolls them the same
  if (state.hushed) setHush(false); // a new song comes in unhushed
  punch.newSong(gameShowing() && !eng.silent);
  eng.reset({ top });
  eng.ledger.startCapture({ source: state.source, sourceId: state.label, startTime: nowSec() });
  resetCodegen();
  view.clear();
  takeover.stop();
  y2k.stop();
  storm.stop();
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
  // (in a browser: a tab or the screen, picked in its sharing box, and this tab kept in front, as
  // the browser would otherwise switch to the tab picked, leaving Toaster in the back, not drawing)
  const web = window.nc?.platform === 'web', controller = web && window.CaptureController ? new CaptureController() : null;
  const stay = () => { try { controller?.setFocusBehavior('focus-capturing-application'); } catch { /* (too late, or an older browser: it switches) */ } };
  stay();
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: RAW_AUDIO, video: !onMac(), ...(controller ? { controller } : {}) });
  stay();                                                                   // (and again the moment it's picked, for browsers that only take it then)
  const track = stream.getAudioTracks()[0];
  if (!track || outdated(ticket)) {
    stream.getTracks().forEach((t) => t.stop());
    if (!track && !outdated(ticket)) throw new Error(web ? "No sound came with that share. In Chrome or Edge, pick a tab and turn on 'Share tab audio'. Firefox and Safari can't share a tab's sound: use your mic, a file, or the desktop app." : onMac() ? 'macOS did not hand over any audio.' : 'Windows did not hand over any audio.');
    return;
  }
  await track.applyConstraints(RAW_AUDIO).catch(() => {}); // in case the first request was ignored
  stream.getVideoTracks().forEach((t) => t.stop()); // only the sound is needed
  if (outdated(ticket)) { track.stop(); return; }
  detach();
  state.stream = stream;
  track.addEventListener('ended', () => { if (state.stream === stream) showMenu(web ? 'Sharing stopped. Pick a source.' : 'System audio stopped. Pick a source.', 'warning'); });
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
  // A stream can take seconds to start, and the engine, started over at attach, has heard only that silence: music after a
  // silence it takes for a song from its start, whose first chord is home (see listenOpening in engine.js), which a station
  // joined halfway through a song isn't. So it starts over again now the sound begins, as attach had it.
  if (eng.silent) eng.reset({ top: source === 'file' });
  if (source === 'file') followPauses(el);
  // (a stream that ends, or anything that drops, says so, as system audio does when it stops)
  el.onended = el.onerror = () => { if (state.el === el) showMenu(`${label} stopped playing. Pick a source.`, 'warning'); };
}

// A file paused and played on: the song goes on from where it stopped, so the beat goes on from where it was, its grid moved on
// by the time the file stood still. (The engine keeps the beat through the silence, as it does through a quiet part of a song:
// see eng.song. Before, a pause over 4 s started the code over and moved the scenes on, and the beat was found again from
// scratch; a shorter one left the grid off the beat by the pause's length.) A take notes each move, for the copy to make.
function followPauses(el) {
  let pausedAt = null;
  el.addEventListener('pause', () => { if (!el.ended) pausedAt = nowSec(); });
  el.addEventListener('playing', () => {
    if (pausedAt === null) return;
    const t = nowSec(), gap = t - pausedAt;
    pausedAt = null;
    if (state.el !== el || !eng.tempo.locked) return; // (moved in meanwhile, or the beat let go: there is no grid to move on)
    eng.resume(gap); // (the grid and the hits it was found from, together)
    if (takeRec.id) takeRec.changes.push({ t, resume: gap });
    takeRec.resumes = [...(takeRec.resumes || []).filter((x) => x.t > t - TAKE_RUNUP), { t, gap }]; // (the run-up's, for a take begun after)
  });
}

async function useFile(file) {
  const cover = fileCover(file).catch(() => null); // (read while it starts to play)
  // its title and artist are read before it starts (a few small reads), so the song is named by them from its first line; the
  // file's attach takes them, and the next source's lets them go. It claims the player first (picking), so that a newer pick, of
  // a file or anything else, which comes in while they are read wins over it, whichever of the two finishes reading first.
  const asked = ++picking;
  const tags = await readTags(file).catch(() => null);
  if (picking !== asked) return; // (a newer pick came in meanwhile)
  pendingTags = { name: file.name, tags };
  let mine = null;
  await playElement('file', file.name, (el) => { mine = el; el.src = URL.createObjectURL(file); el.loop = true; });
  const art = await cover;
  if (art && mine && state.el === mine) fileArt = art; // (unless another source took over meanwhile)
  return mine;
}

// A file's own title and artist, from its tag (audio-tags.js): what the song it plays is called (see currentSong); read in useFile,
// taken by the file's attach.
let fileTags = null, pendingTags = null;

// A file's own cover, the picture in its tag (embedded-cover.js), as a loaded image; null if it has none.
let fileArt = null;
async function fileCover(file) {
  const found = await embeddedCover(file);
  if (!found) return null;
  const im = new Image();
  im.src = URL.createObjectURL(new Blob([found.bytes], { type: found.type }));
  try { await im.decode(); return im; } catch { return null; } finally { URL.revokeObjectURL(im.src); }
}

// The library's cover look (Shift+C in the library): all of it in characters, or the cover itself with the characters around it
function setLibCover(look) {
  state.libCover = look === 'photo' ? 'photo' : 'chars';
  saveSettings();
  libraryPanel.update();
  return state.libCover === 'photo' ? 'cover: half ascii' : 'cover: full ascii';
}
// An album's own cover at full size (the scan keeps 160 px ones), from its first track's tag that has one: an object URL, or null
async function albumCover(album) {
  for (const t of album?.tracks?.slice(0, 3) || []) {
    try {
      const found = await embeddedCover(await librarySrc.file(t));
      if (found) return URL.createObjectURL(new Blob([found.bytes], { type: found.type }));
    } catch { /* a track gone from the folder: the next */ }
  }
  return null;
}

// The player bar's stop, for the radio and the demo: the source is let go (nothing plays, nothing is listened to, the page
// looks as it does with no source), and which it was is kept, so the bar's play button can pick it again.
function stopSource() {
  const was = state.source;
  if (was !== 'radio' && was !== 'demo') return;
  picking++; // (a pick still opening gives up)
  detach();
  takeover.stop(); y2k.stop(); storm.stop(); // (and the drop effects go with it)
  state.source = null;
  state.label = '';
  state.stopped = was;
  document.body.classList.remove('live');
  $('status').classList.remove('on');
  $('status').textContent = restingStatus();
}

// The library's queue (G): the album from a track on, which plays through and then repeats (library.js has its steps). Each track is
// read from the library (main, or the folder picked in a browser) and played as a file, so its cover reaches the theme and the card as
// a picked file's does. The queue is live while the file it started is the source: any other pick takes the player over from it.
// A track that can't be read or played is skipped, not the end of the album (skipTrack); failed is how many have been skipped in a row.
let queue = null, pendingQueue = null, queuing = 0;
const liveQueue = () => (queue && state.source === 'file' && state.el && state.el === queue.el ? queue : null);
async function playQueue(q, at = 0, failed = 0) {
  const ticket = ++queuing, picked = picking;
  let el;
  try {
    const file = await librarySrc.file(q.tracks[q.index]);
    if (ticket !== queuing || picked !== picking) return; // (another track, or another source, was picked while this one was read: that one wins)
    const mine = pendingQueue = { name: file.name, q }; // (taken by that file's attach, so the bar's buttons and the song's names hold from its first moment)
    try { el = await useFile(file); } finally { if (pendingQueue === mine) pendingQueue = null; } // (only its own: a newer track's may be waiting)
  } catch (err) {
    if (ticket === queuing) skipTrack(q, err, failed + 1); // (unless another track was picked meanwhile)
    return;
  }
  if (ticket !== queuing || !el || state.el !== el) return;
  if (liveQueue()?.el !== el) { queue = { ...q, el }; el.loop = false; } // (an older track's attach can have been first to the slot: then it is made so here)
  if (state.recentAlbums[0] !== q.id) { state.recentAlbums = noteRecent(state.recentAlbums, q.id); saveSettings(); } // (the shelf of albums played lately)
  el.onended = () => { if (liveQueue()?.el === el) playQueue(queueNext(queue, queueSteps(true))).catch(showError); };
  el.onerror = () => { if (liveQueue()?.el === el) skipTrack(queue, el.error, 1); }; // (and a track that breaks part-way through)
  if (el.error) { skipTrack(queue, el.error, 1); return; } // (one that broke before these were set)
  if (at > 0 && at < (el.duration || Infinity) - 1) { el.currentTime = at; freshStart(false); } // (carried on from where it was)
}
// A track that can't be read or played (a file the player can't decode, one that has gone from the folder) is skipped: the queue goes on to
// the next, as the next button does, and the page says which was left out. Once every track of the album has failed in a row there is
// nothing to play: it stops, as the library's stop square does, and says so.
function skipTrack(q, err, failed) {
  retainBugError(err);
  const next = queueSkip(q, failed, queueSteps(false));
  if (!next) {
    if (liveQueue()) stopPlayback(); // (the track before it ended, or broke: nothing plays, and the page looks as it does after the stop)
    queue = null;
    const why = String(err?.message || 'it would not start').replace(/^Error invoking remote method '[^']*': (Error: )?/, '').replace(/\.$/, '');
    showError(new Error(`Could not play ${q.tracks.length === 1 ? 'that track' : `any of the ${q.tracks.length} tracks of this album`} (${why}).`));
    return;
  }
  showNotice(`skipped "${trackLabel(q, q.index)}": it could not be played`);
  playQueue(next, 0, next.id === q.id ? failed : 0).catch(showError); // (another album, with repeat all, starts the count again)
}
// how the queue goes on: the library's repeat (Shift+R in it), and for repeat all the album after this one in the library's order
const albumAfter = (id) => { const albums = libraryPanel.state?.albums || [], i = albums.findIndex((a) => a.id === id); return i < 0 || albums.length < 2 ? null : albums[(i + 1) % albums.length]; };
const queueSteps = (ended) => ({ repeat: state.queueRepeat, ended, nextAlbum: albumAfter });
const nextTrack = () => { const q = liveQueue(); if (q) playQueue(queueNext(q, queueSteps(false))).catch(showError); };
// Where the queue is, kept a few times a minute while it plays and when the window goes, so G after a restart opens there and Enter
// carries on from the same second (a file never starts by itself)
let resumeAt = 0;
function noteResume(t, now = false) {
  const q = liveQueue();
  if (!q || (!now && t - resumeAt < 5)) return;
  resumeAt = t;
  state.queueResume = { path: q.tracks[q.index].path, at: Math.round(state.el.currentTime * 10) / 10 };
  saveSettings();
}
addEventListener('pagehide', () => noteResume(0, true));
// Repeat and shuffle (Shift+R and Shift+S in the library, its two buttons, Ctrl+K): kept with the settings; shuffle reorders a queue that
// is playing at once, from the track it is on
const REPEAT_SAID = { album: 'repeat: the album', all: 'repeat: on through your music', one: 'repeat: this track' };
function setQueueRepeat(mode) { state.queueRepeat = readRepeat(mode); saveSettings(); libraryPanel.update(); return REPEAT_SAID[state.queueRepeat]; }
function setQueueShuffle(on) {
  state.queueShuffle = !!on;
  const q = liveQueue();
  if (q) queue = { ...withShuffle(q, state.queueShuffle), el: q.el };
  saveSettings();
  libraryPanel.update();
  return state.queueShuffle ? 'shuffle on' : 'shuffle off';
}
// previous: this track again once it's past its first seconds (or there is none before it), else the one before
function previousTrack() {
  const q = liveQueue();
  if (!q) return;
  const step = queuePrevious(q, state.el.currentTime);
  if (step.restart) { state.el.currentTime = 0; freshStart(true); } else playQueue(step.queue).catch(showError);
}
// The library's stop square: the radio and the demo stop as the player bar's stop does; a file (and its queue) is let go
function stopPlayback() {
  if (state.source === 'radio' || state.source === 'demo') { stopSource(); return; }
  if (state.source !== 'file') return;
  picking++; // (a pick still opening gives up)
  queue = null;
  queuing++;
  detach();
  takeover.stop(); y2k.stop(); storm.stop(); // (and the drop effects go with it)
  state.source = null;
  state.label = '';
  document.body.classList.remove('live');
  $('status').classList.remove('on');
  $('status').textContent = restingStatus();
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
  state.radioStations = noteStation(state.radioStations, url.href); // (and in the library's radio, the latest first)
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
  return `iOS is not letting ${b} use the microphone, and it only asks once. Open the Settings app, find ${b} and turn Microphone on (on newer iOS: Settings, Apps, ${b}). Then close ${b} completely, open this page again and tap "use your mic".`
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
  if (tapToRevive || globalThis.clock?.mode === 'render') return; // (a render's page plays no sound: the note would be drawn into the video)
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
  return state.source === 'system' ? `${window.nc?.platform === 'web' ? 'shared tab or screen' : 'system loopback'} · ${rate}` : `${state.label || 'none'} · ${rate}`;
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
  if (TAKE?.song) return TAKE.song; // (a copy: the song the take was of, not the silent source it listens through)
  if (state.manual) return state.manual;
  if (state.source === 'system') return state.winSong;
  if (state.source === 'radio') return state.radioSong;
  if (state.source === 'demo') return { title: 'demo_beat', artist: 'Toaster' };
  const q = liveQueue();
  if (q) { const t = q.tracks[q.index]; return { title: t.title, artist: t.artist || 'File' }; } // (the library's names, from the tags and the folders)
  if (state.source === 'file') return songOfFile(fileTags, state.label);
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
// A Spotify link pasted into the library is named by the first song Spotify's player shows after it (the system's now-playing says which app a
// song is from): linkNaming is the link just played, the title that was showing then, and until when. (Declared here, with nowPlaying, which
// can be called while the rest of the page is still loading.)
let linkNaming = null;
function nameTheLink(song, key) {
  if (!linkNaming) return;
  if (Date.now() > linkNaming.until) { linkNaming = null; return; }
  if (!song || !/spotify/i.test(song.app || '') || key === linkNaming.was) return;
  state.spotifyLinks = nameLink(state.spotifyLinks, linkNaming.uri, song);
  linkNaming = null;
  saveSettings();
}
function nowPlaying(info) {
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
  // fills in late is still the same song. Nor does the first title of all: that's the song that was
  // playing when Toaster started. (main.js starts the helper 2 seconds after the window, and on
  // Windows PowerShell takes a few more to load, so that reading can come after the beat was found:
  // it threw the beat away and looked for it again.)
  const key = song ? song.title.trim().toLowerCase() : '';
  nameTheLink(song, key);
  if (!key || key === state.winKey) return;
  const changed = !!state.winKey;
  state.winKey = key;
  const reset = changed && state.source === 'system' && !state.manual && eng.tempo.locked;
  eng.note(`now playing: ${song.title} | ${song.artist} (${info.app || '?'}, ${info.playing ? 'playing' : 'paused'})${reset ? ' -> reset' : ''}`);
  if (state.source === 'system') { clipsThisSong = 0; lastClipAt = -99; }
  if (reset) freshStart(true);
}
window.nc?.onNowPlaying(nowPlaying);

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
    noteRadioCover(radioCovers, key, radioCovers.get(key)); // (this song last in line, asked for now or heard before: the covers are 600 px, so only the last 50 songs' are kept)
    radioCovers.get(key).then((im) => { if (state.radioSong === song) radioArt = im; });
  }
  if (!key || key.toLowerCase() === state.radioKey) return;
  const reset = !!state.radioKey && !state.manual && eng.tempo.locked;
  state.radioKey = key.toLowerCase();
  eng.note(`radio: ${song.title} | ${song.artist}${reset ? ' -> reset' : ''}`);
  clipsThisSong = 0; lastClipAt = -99;
  if (reset) freshStart(true);
}

// The playing song's picture, for the ID card, the backgrounds that show it and the dynamic theme: the
// system's cover (Windows', or the Mac helper's) for its song, the iTunes Store's for the radio's, a file's
// own, from its tag; none for a name you gave a song (a file's cover is still its cover, whatever it's
// called). (An image, so it draws on a canvas and loads as a texture.)
function songArt() {
  if (takeArt) return takeArt;
  if (state.source === 'file') return fileArt;
  return state.manual ? null : state.source === 'system' ? artImg : state.source === 'radio' ? radioArt : null;
}

// The kick's visuals. Once the beat is locked and the kick's line is written, they follow that line, step by step on
// Toaster's own clock (patternClock, from drawFrame), so a flash lands on every kick the code shows and nowhere else: no
// stray flash from a bass note or a fill, no lag behind the hit. Before the lock, or with the line muted, the kick heard
// fires them, as it always did. (Wet Carp, Nov 3: "my screen flash on the kick ... keeps the same pattern, which helps
// avoid extra noise".)
const patternKickOn = () => state.patternKick !== false && !!eng.tempo.locked && !!eng.v?.bd?.here;
eng.on.kick = (s) => { if (!patternKickOn()) kickVisuals(s); };
let patternStep = null;
function patternClock(t) {
  const at = patternKickOn() ? eng.placeAt(t) : null;
  if (!at) { patternStep = null; return; }
  const cur = Math.floor(at.bar * 16 + at.step + at.off + 1e-6);   // (the step whose start has passed)
  if (patternStep !== null && cur > patternStep && cur - patternStep <= 4) {
    for (let q = patternStep + 1; q <= cur; q++) {
      const step = ((q % 16) + 16) % 16;
      if (eng.v.bd.shown?.[step]) kickVisuals(step === 0 ? 1 : 0.8);   // (the bar's first kick a little harder)
    }
  }
  patternStep = cur;
}
function kickVisuals(s) {
  field.kick(s); spiral.kick(s); wheel.kick(s); glass.kick(s); segcam.kick(s); takeover.kick(); y2k.kick();
  lens.kick(s, state.calm);
  handPoints.kick(s, state.calm);
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
}
// Drop clips: the first two drops of each song (the ones that matter, without a long night of
// a song that keeps dropping filling the disk). Turning them on again starts the count over.
// A 12 s gap (matching the engine's drop cooldown) keeps D on a real drop from starting a second clip.
let clipsThisSong = 0, lastClipAt = -99;
// pressed: D (or a perfect copy replaying it). The y2k bug tells one story over its 8 bars (midnight, the crash, the blue screen), so a drop
// the engine hears while it runs (the kick back after a break inside them) leaves it alone; D still starts it over.
eng.on.drop = (pressed = false) => {
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
  if (mode === 'xp takeover') { y2k.stop(); takeover.start(t, currentSong()?.title, (eng.tempo.P || 0.5) * 4); }
  else if (mode === 'y2k bug') { if (pressed || !y2k.active) { takeover.stop(); y2k.start(t, currentSong()?.title, (eng.tempo.P || 0.5) * 4); } }
  else if (mode === 'blue screen') showBsod($('bsod'), glitch, eng.tempo.P || 0.35);
  else if (mode === 'not responding') storm.start(t, eng.tempo.locked ? eng.tempo.bpm : 0);
};
eng.on.newSong = () => { resetCodegen(); view.clear(); takeover.stop(); y2k.stop(); storm.stop(); glitch(); clipsThisSong = 0; lastClipAt = -99; nextAutoScene(); };
// A known song keeps its beat through breakdowns and quiet parts (see tempoUpdate in engine.js). The
// radio's is known while it has a title: a station going from a song to talking sends an empty one,
// which lets the song go (radioTitle), and then the beat goes after a minute without one, as on an
// input. The system says when its song is still playing; a file's song is the file's, playing or
// paused, until it ends (a pause is a silence the same song comes back from: see followPauses; and a
// perfect copy of a file's take, which listens through no element, hears it the same). The radio's
// stream always plays, and a long silence on it is dead air or the next song (which brings its own
// title), not a quiet part.
eng.song = () => ({ known: !!currentSong(), playing: (state.source === 'system' && !!state.winSong && !!state.winPlaying) || (state.source === 'file' && !state.el?.ended) });

// ---------------------------------------------------------------- look

function glitch() {
  document.body.classList.remove('glitch');
  void document.body.offsetWidth;
  document.body.classList.add('glitch');
}

// The dynamic theme (the sixth): the colours of the song's cover (cover-palette.js). A cover's palette is worked
// out once, from a 48 x 48 copy of it. When the song changes the colours ease to the next cover's over 1.2 s,
// and each step goes through applyTheme, so everything that follows the theme follows the ease: the page's own
// variables, col (the visuals' colours) and the Windows title bar.
const swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
swatch.canvas.width = swatch.canvas.height = 48;
swatch.imageSmoothingQuality = 'high';
const coverPalettes = new WeakMap(); // a cover's image -> its palette (null: nothing in it to take)
const NO_COVER = fullPalette(BLUESCREEN); // (what the dynamic theme shows with no cover: bluescreen's look, its four colours)
const coverTheme = createDynamicTheme({ none: NO_COVER });
let themeLook = null; // the dynamic theme's colours for the scenes and the spectrogram in its colours (null: a fixed theme's)
let dynamicShown = false; // the dynamic theme is what's on screen (so applying it again is a step of the ease)
let titleBarAt = -Infinity; // when the Windows title bar last took the colours (see applyTheme)
function paletteOf(im) {
  if (!coverPalettes.has(im)) {
    let palette = null;
    try {
      swatch.clearRect(0, 0, 48, 48);
      swatch.drawImage(im, 0, 0, 48, 48);
      palette = coverPalette(swatch.getImageData(0, 0, 48, 48).data);
    } catch { /* a picture the canvas won't give the pixels of */ }
    coverPalettes.set(im, palette);
  }
  return coverPalettes.get(im);
}
// each frame while the dynamic theme is on: the cover to ease to (none: the last one's colours are held a while,
// then bluescreen's), and the colours where the ease has got to
function stepTheme(t) {
  const art = songArt();
  if (coverTheme.update(art ? paletteOf(art) : null, t)) applyTheme(t);
}

function applyTheme(now = nowSec()) {
  const root = document.documentElement, dynamic = THEMES[state.theme] === 'dynamic';
  if (state.theme === 0) delete root.dataset.theme;
  else root.dataset.theme = THEMES[state.theme];
  // The dynamic theme's colours are set on the page itself, over the stylesheet's (which, for a theme it has no
  // word on, are bluescreen's: what the dynamic one shows with no cover); the others have the stylesheet's alone.
  // Switched to, it takes the cover's colours at once, as the other themes switch.
  if (dynamic && !dynamicShown) { const art = songArt(); coverTheme.jump((art && paletteOf(art)) || NO_COVER); }
  dynamicShown = dynamic;
  const pal = dynamic ? coverTheme.palette(now) : null, vars = pal ? paletteVars(pal) : null;
  for (const name of [...THEME_VARS, ACCENT_VAR, ACCENT_TEXT_VAR]) { if (vars) root.style.setProperty(name, vars[name]); else root.style.removeProperty(name); }
  // (the scenes in the theme's colours take the cover's ground, text (their lights) and accent; the spectrogram in them
  // climbs through all of them: see cover-palette.js)
  themeLook = pal ? { scene: { ground: pal.ground, lights: pal.fg, accent: pal.accent }, terrain: terrainStops(pal) } : null;
  const cs = getComputedStyle(root);
  const get = (name) => cs.getPropertyValue(name).trim();
  col = { bg: rgbOf(get('--bg')), fg: rgbOf(get('--fg')), ink: rgbOf(get('--ink')), accent: rgbOf(get('--accent')) };
  // (Windows' title bar too: while the dynamic theme's colours ease, a few times a second rather than every frame,
  // as each is a trip to main and a repaint of the window's frame; the ease's last colours always go)
  if (!onMac() && (!dynamic || !coverTheme.easing(now) || now - titleBarAt >= 0.15)) {
    titleBarAt = now;
    window.nc?.setTitleBar(get('--bg'), get('--fg'));
  }
}

function setVisual(i) {
  state.visual = i;
  const mode = VISUALS[i];
  if (!FIELD_VIS.includes(mode)) field.clear();
  for (const [name, v] of [['tunnel', tunnel], ['spiral', spiral], ['pitchwheel', wheel], ['warp', warp], ['cuts', cuts], ['worlds', worlds], ['chrome', chrome], ['spaghetti', spaghetti], ['earth', earth], ['backrooms', backrooms], ['spectrogram', spectro], ['scenery', scenery], ['lanes', lanes], ['fire', fire]]) if (mode !== name) v.clear();
  $('b-visual').textContent = visName(mode) + ' ▾';
  queueMicrotask(footerKeys); // (A's word follows the background; after the page's first run, once the keys are set up)
  document.body.classList.toggle('worlds-on', mode === 'worlds');
  document.body.classList.toggle('chrome-on', mode === 'chrome');
  document.body.classList.toggle('spaghetti-on', mode === 'spaghetti');
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
// The tour's next view, in the tour's own order (EARTH_TOUR: night, day and the station's sights in turn), see tourEarth
function nextEarthClip(quiet = false) {
  state.earthClip = EARTH_TOUR[(EARTH_TOUR.indexOf(state.earthClip) + 1) % EARTH_TOUR.length];
  earth.setClip(state.earthClip);
  if (!quiet) flashStatus('the Earth: ' + state.earthClip);
  earthTour.at = nowSec(); // (a view picked by hand starts the tour's count over)
  saveSettings();
}
// A view of the Earth by name, which stays (the tour off), or 'all': every view in turn, a new one every 8 bars (the tour on).
const earthLabel = () => (state.earthTour !== false ? 'earth (all): a new view every 8 bars' : `earth (${state.earthClip})`);
function setEarthView(view, say = true) {
  if (view === 'all') state.earthTour = true;
  else { state.earthTour = false; state.earthClip = view; earth.setClip(view); }
  earthTour.at = nowSec();
  if (say) flashStatus(earthLabel());
  saveSettings();
}
// A, while the Earth is on: the next view, each one staying put, then all of them, then round again
function nextEarthView() {
  const order = [...EARTH_CLIPS, 'all'], now = state.earthTour !== false ? 'all' : state.earthClip;
  setEarthView(order[(order.indexOf(now) + 1) % order.length]);
}
// The Earth moves through its views with the song: every 8 bars (a phrase) the next view, its fade to black starting on the
// phrase's last beat so the new view rises on the downbeat; and a new view as a breakdown starts (it fades through black in the
// quiet, so the drop lands on it at full light). Not before the beat is found. Only with "all views" picked (earthTour); a view
// picked by name stays.
const earthTour = { at: -Infinity, quiet: false };
function tourEarth(t) {
  if (VISUALS[state.visual] !== 'earth' || state.earthTour === false || !eng.tempo.locked || eng.silent) { earthTour.quiet = false; return; }
  if (earthTour.at === -Infinity) { earthTour.at = t; return; } // (the view you came to stays for its first 8 bars at least)
  const bar = 4 * (eng.tempo.P || 0.5), held = t - earthTour.at;
  const quiet = t - (eng.lastKick ?? -99) > 2 * bar && t - (eng.lastDrop ?? -99) > 4 * bar; // (the code's "// breakdown")
  const startsQuiet = quiet && !earthTour.quiet;
  earthTour.quiet = quiet;
  if (held < 7.5 * bar) return;
  const at = eng.placeAt(t), onLastBeat = !!at && at.step === 12 && Math.abs(at.off) < 0.5;
  if (startsQuiet || (onLastBeat && !quiet)) nextEarthClip(true);
}
// A, while the chrome is on: the collage over it, off and on
function toggleCollage() {
  state.chromeCollage = !state.chromeCollage;
  flashStatus('collage: ' + (state.chromeCollage ? 'on' : 'off'));
  saveSettings();
}
// A, while the spaghetti's on: its noodles, snakes (a card each time round, a few of its noodles
// dancing) or endless (the card stuck in the slot, the crank never stopping)
const SPAGHETTI_KINDS = ['snakes', 'endless'];
function nextSpaghetti() {
  state.spaghettiKind = SPAGHETTI_KINDS[(SPAGHETTI_KINDS.indexOf(state.spaghettiKind) + 1) % SPAGHETTI_KINDS.length];
  flashStatus('noodles: ' + state.spaghettiKind);
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
const SCENE_NAMES = { auto: 'auto (a new one each song)', lake: 'the lake', sea: 'the sea', fire: 'the campfire', snow: 'the snow', city: 'the city in the rain', garden: 'the garden', sharks: 'the sharks', festival: 'the festival', koi: 'the koi pond', space: 'space', eye: 'the eye' };
function nextScene() {
  const all = ['auto', ...scenery.scenes];
  if (state.sceneryTheme) { state.sceneryTheme = false; state.sceneryScene = 'auto'; }
  else if (state.sceneryScene === all[all.length - 1]) { state.sceneryTheme = true; state.sceneryScene = 'auto'; }
  else state.sceneryScene = all[all.indexOf(state.sceneryScene) + 1];
  flashStatus('scene: ' + (SCENE_NAMES[state.sceneryScene] || state.sceneryScene) + (state.sceneryTheme ? ", in the theme's colours" : ''));
  saveSettings();
}
// with auto, the scene shown: a new one each song, in turn (from one picked at random at the start)
// (a copy starts from the live page's: rolled here, it would be rolled from this page's own seed, before the take's is set)
let autoScene = Number.isInteger(TAKE?.autoScene) ? TAKE.autoScene : Math.floor(clock.rng('auto-scene', 0)() * 64), autoSceneAt = -99;
const autoScenes = () => scenery.scenes;
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
// U: a look over the visuals (trails, dots, LED, halftone, VHS, line art), under the code (renderer/post.js).
// The looks from outside (docs/looks-from-shaders.md): the ones that ship (renderer/looks: chroma kick) and, in the
// app, the shaders in the looks folder (custom: <file>). One that won't compile stays out of U's round and is said.
async function loadLooks(say = false) {
  for (const n of outsideLooks) post.removeLook(n);
  outsideLooks.clear();
  const kept = window.nc?.looksList || window.takeRender?.looksList; // (a perfect copy's render has no nc: its preload asks main)
  const list = kept ? await kept().catch(() => [])
    : await fetch(new URL('./looks/chroma-kick.frag', import.meta.url)).then((r) => (r.ok ? r.text() : null)).then((text) => (text ? [{ name: 'chroma kick', text, mine: false }] : []), () => []);
  const errors = [];
  for (const { name, text, mine } of list) {
    const id = mine ? 'custom: ' + name : name, err = post.addLook(id, text);
    if (err) errors.push(`${name}: ${err.split('\n').find((l) => l.trim()) || err}`);
    else outsideLooks.add(id);
  }
  const want = pendingLook || state.look; // (the look in use: reloading took it out, so it goes back on)
  if (want !== 'off' && LOOKS.includes(want) && post.look !== want) setLook(want, false);
  pendingLook = null;
  if (say) flashStatus(errors.length ? `a look wouldn't compile: ${errors[0]}` : `looks: ${list.filter((l) => l.mine).length} from the folder`);
  else for (const e of errors) console.warn('look', e);
}
// The code on glass (Ctrl+K): each line and panel on a pane of liquid glass over the picture, or on its flat plate.
function setGlassPlates(on, say = true) {
  state.glassPlates = on;
  const ok = post.setGlass(on);
  document.body.classList.toggle('glass-on', ok);
  if (say) flashStatus(on && !ok ? 'the glass needs WebGL 2' : on ? 'the code on glass' : 'the code on plates');
  saveSettings();
}
function setLook(name, say = true) {
  state.look = post.set(name);
  if (say) flashStatus(post.broken ? 'looks need WebGL 2' : `look: ${state.look}`);
  saveSettings();
}
let crtOffT = null; // (a clock timer's cancel: the classes below come off on the clock, so a render sees them go at the same time)
function setCrt(on) {
  state.crt = on;
  const tube = $('tube');
  crtOffT?.();
  tube.style.setProperty('--crt-px', `${1 / (devicePixelRatio || 1)}px`);
  if (on) {
    if (!tube.style.getPropertyValue('--crt-static')) tube.style.setProperty('--crt-static', crtSnow());
    document.body.classList.add('tube-on');
    tube.hidden = false;
    tube.classList.remove('power-off');
    replay(tube, 'power-on');
    crtOffT = clock.after(0.7, () => tube.classList.remove('power-on'));
    crtOsd(crtChannel());
  } else if (!tube.hidden) {
    // (the picture shrinks into the dot, then the page is back as it was)
    tube.classList.remove('power-on');
    replay(tube, 'power-off');
    crtOffT = clock.after(state.calm ? 0 : 0.52, () => { tube.hidden = true; tube.classList.remove('power-off'); document.body.classList.remove('tube-on'); });
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
  const dice = clock.rng('crt-snow', 0);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = dice() < 0.5 ? dice() * 90 : 120 + dice() * 135;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return `url(${c.toDataURL()})`;
}
function crtStatic() { if (state.crt && !state.calm) replay($('tube'), 'static'); }
// The set's lettering, top right, for a couple of seconds: the channel (the background, V) or the
// picture (the theme, T)
const crtChannel = () => `CH ${String(state.visual + 1).padStart(2, '0')}\n${VISUALS[state.visual].toUpperCase()}`;
let crtOsdT = null;
function crtOsd(text) {
  if (!state.crt) return;
  const osd = $('tube').querySelector('.t-osd');
  osd.textContent = text;
  osd.classList.add('on');
  crtOsdT?.();
  crtOsdT = clock.after(2.2, () => osd.classList.remove('on'));
}
// (the kick: the tube's darkness eased off for a moment, and back over a third of a second (the CSS))
let crtKickT = null;
function crtKick() {
  $('tube').classList.add('kick');
  crtKickT?.();
  crtKickT = clock.after(0.06, () => $('tube').classList.remove('kick'));
}

// Optional staged typing mistakes, under code in the help.
function setStagedTypos(on) {
  state.stagedTypos = on;
  $('staged-typos').checked = on;
  view.slipsOff = !on || !!rec.mr || clips.on || !!TAKE;
  saveSettings();
}
$('staged-typos').addEventListener('change', (e) => setStagedTypos(e.target.checked));

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
// it downloads, checks it, closes and opens again as the new one (on a Mac, with the old one in the
// Trash); or, where it can't (a copy it can't write beside, a Mac copy run from Downloads or a disk
// image, which says to move it into Applications first, a try at that version that didn't go
// through in the last day, with why), the release's page.
function setUpdates(on) {
  state.updates = on;
  $('updates').checked = on;
  saveSettings();
}
$('updates').addEventListener('change', (e) => setUpdates(e.target.checked));

// Mirror the camera: the help's checkbox, and Ctrl+K's "camera: mirrored" and "camera: not mirrored". On
// (as it always was), the camera is shown as a mirror shows you; off, as the camera sees it, for pointing
// it at your gear. The camera layer, the ASCII camera, the dots, the voxels, big eyes, the cut-out, the
// finger frame and the portal all follow, through the camera's one flag (renderer/camview.js).
function setMirror(on) {
  state.mirror = on;
  cam.setMirror(on);
  $('mirror').checked = on;
  saveSettings();
}
$('mirror').addEventListener('change', (e) => setMirror(e.target.checked));

// The player bar (renderer/player.js, #player and body.player-bar in the CSS): the help's checkbox, and Ctrl+K's "player bar:
// shown" and "player bar: hidden". H hides it with the footer, Z's visualizer mode shows it only at the bottom edge, and a
// recording leaves it out unless "in recordings" (the help's second checkbox, body.player-rec) is on.
function setPlayerBar(on) {
  state.playerBar = on;
  document.body.classList.toggle('player-bar', on);
  $('playerbar').checked = on;
  saveSettings();
}
function setPlayerRec(on) {
  state.playerRec = on;
  document.body.classList.toggle('player-rec', on);
  $('playerrec').checked = on;
  saveSettings();
}
$('playerbar').addEventListener('change', (e) => setPlayerBar(e.target.checked));
$('playerrec').addEventListener('change', (e) => setPlayerRec(e.target.checked));
async function offerUpdate(u) {
  if (!state.updates || !window.nc?.updateCheck) return;
  u ||= await window.nc.updateCheck().catch(() => null);
  if (!u) return;
  if (rec.mr || !$('alerts').isConnected || $('alerts').childElementCount) { setTimeout(() => offerUpdate(u), 30000); return; }
  xpAlert($('alerts'), {
    title: 'toaster update', icon: 'info',
    text: u.failed
      ? `Toaster ${u.version} is out (this one is ${u.current}), but installing it here didn't go through last time (${u.failed}). Open its page to get it?`
      : u.why
        ? `Toaster ${u.version} is out (this one is ${u.current}), but ${u.why}. Open its page to get it?`
        : `Toaster ${u.version} is out (this one is ${u.current}). ${u.canInstall ? 'Update now? It downloads, then closes and opens again as the new one.' : 'Open its page to get it?'}`,
    buttons: [u.canInstall ? 'Update now' : 'Open page', 'Later'],
  });
  $('alerts').querySelector('button').addEventListener('click', async () => {
    if (!u.canInstall) { window.nc.updatePage(); return; }
    showUpdateProgress();
    flashStatus('downloading the update');
    try {
      await window.nc.updateInstall();
      $('update-download-text').textContent = `opening Toaster ${u.version}`;
      flashStatus(`opening Toaster ${u.version}`);
    } catch (err) {
      xpAlert($('alerts'), { title: 'toaster update', icon: 'warning', text: `The update didn't go through (${String(err?.message || err).replace(/^.*?Error: /, '')}), and nothing changed. Get it from its page instead?`, buttons: ['Open page', 'OK'] });
      $('alerts').querySelector('button').addEventListener('click', () => window.nc.updatePage());
    }
  });
}
function showUpdateProgress() {
  xpAlert($('alerts'), { title: 'toaster update', icon: 'info', text: 'downloading the update…', buttons: [] });
  const box = $('alerts').querySelector('.xp');
  box.querySelector('.xp-ctl').remove();
  box.querySelector('p').id = 'update-download-text';
  const bar = document.createElement('progress');
  bar.id = 'update-download-bar';
  bar.max = 1;
  bar.setAttribute('aria-label', 'Update download');
  box.querySelector('.xp-frame').append(bar);
}
window.nc?.onUpdateProgress?.((p) => {
  const text = $('update-download-text'), bar = $('update-download-bar');
  if (!text || !bar) return;
  const mb = (bytes) => (bytes / 1e6).toFixed(1);
  text.textContent = p.total
    ? `downloading the update: ${mb(p.downloaded)} / ${mb(p.total)} MB`
    : `downloading the update: ${mb(p.downloaded)} MB (total unknown)`;
  if (p.fraction === null) bar.removeAttribute('value');
  else bar.value = p.fraction;
  if (p.fraction === 1) text.textContent += ' — checking and unpacking…';
});

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
  $('alerts').querySelector('button').addEventListener('click', () => { $('help').showModal(); helpTab('new'); });
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
    showNotice(`saved ${song.bars.length} bars as MIDI${code ? ' and Strudel code' : ''}: ${file.split(/[\\/]/).pop().replace(/\.mid$/, '')} (an approximate sketch of the song: whether you can share it depends on the music's rights)`, file);
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
  camShown();
}
// (what follows any change of the camera's way: the layers it no longer feeds cleared, the body's classes, its button's word)
function camShown() {
  if (!state.eyes) segcam.clear();
  if (!(cam.on && state.ascii)) asciiCam.clear();
  document.body.classList.toggle('cam-on', cam.on);
  document.body.classList.toggle('cam-ascii', cam.on && state.ascii);
  camLabel();
}
// The camera's ways in C's order: off, on, big eyes, ASCII. And one picked by its place (the strip's click, Shift+C), by
// toggleCam's own first and last steps, not through the ways between (which would stop the camera and start it again).
const camWay = () => (!cam.on ? 0 : state.eyes ? 2 : state.ascii ? 3 : 1);
async function pickCam(i) {
  if (i === camWay()) return;
  if (i === 0) { state.eyes = false; state.ascii = true; return toggleCam(); } // (its last step: the camera off)
  state.eyes = i === 2; state.ascii = i === 3;
  if (!cam.on) return toggleCam(); // (its first step: the camera on, in the way set)
  camShown();
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
    // (and tall from the library too: the mini player there is the cover with the song and its buttons under it, a portrait)
    const shape = which === 'mini' && (gameShowing() || document.body.classList.contains('library-open')) ? 'tall' : 'wide';
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
  // (before the lock, where it is, as the code's tempo line says it: nothing heard yet (and how to start), sound but no pulse yet,
  // a pulse heard and the bar's start being found; a newcomer otherwise saw one 'waiting' however long it took and whatever it was
  // waiting for. From Astra's review, Nov 7: 'help before the beat locks')
  const pre = !state.node ? `no sound yet: play a song (${K('source')} picks where it listens)`
    : eng.silent ? 'no sound yet: play something'
    : eng.tempo.provisional ? `a beat at ~${Math.round(eng.tempo.provisional.bpm)} bpm · finding bar one...` : 'hearing it · finding the beat...';
  const status = locked ? `    bar ${eng.bar + 1} · step ${eng.step + 1}/16` : `    ${pre}`;
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
// The code keeps clear of the window's foot. Where it reaches too far down (the vertical layout under the ID card or the
// camera, a short window, a song with every part and long lines), the bottom of the window would cut a line or the roll in
// half, and the player bar, while it's up, would have the last lines running under it. So a line or a panel that doesn't
// fit whole is hidden till there's room again, the last ones first, as they come in the code. (Hidden, each keeps its
// place: whether one fits doesn't change with it.)
function fitRoll() {
  const foot = innerHeight - playerBar.reserved() + 1; // (the player bar, while it's up, covers the bottom)
  for (const el of $('code').children) { const r = el.getBoundingClientRect(); el.classList.toggle('cut', r.height > 0 && r.bottom > foot); }
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

// The player bar (renderer/player.js). A file plays and pauses on its own element; restarting it or moving in it starts the
// page over from there, as a new song does (the code was written for the song as it was); the radio and the demo stop, and
// play again as they were picked. The next button shows only where there's a queue to go on to, which is act.next: not given
// yet (the library will).
const playerBar = createPlayerBar({
  document, root: $('player'), nc: window.nc, platform: window.nc?.platform || 'web', window,
  act: {
    restart: () => { if (state.el) { state.el.currentTime = 0; freshStart(true); } },
    seek: (to) => { if (state.el) { state.el.currentTime = to; freshStart(to < 1); } },
    stop: stopSource,
    start: (kind) => (kind === 'radio' ? useRadio(state.radio) : useDemo()).catch(showError),
    fail: showError,
    note: (text) => showNotice(text),
    misread: () => misreadReport.show(), // (the flag at the bar's right end)
    // the queue's buttons exist only while a library album is playing (a file on its own has no neighbours)
    get next() { return liveQueue() ? nextTrack : undefined; },
    get previous() { return liveQueue() ? previousTrack : undefined; },
    // and its shuffle and repeat (the library's own: Shift+S and Shift+R there), shown beside the transport
    get shuffle() { return liveQueue() ? () => state.queueShuffle : undefined; },
    get repeat() { return liveQueue() ? () => state.queueRepeat : undefined; },
    setShuffle: (on) => flashStatus(setQueueShuffle(on)),
    setRepeat: (mode) => flashStatus(setQueueRepeat(mode)),
  },
});
// on screen just now: on, and not put away by H, the mini player or a recording (so it's worth asking Music where it is). The mini
// player keeps it when it's the library's (the cover, then the song and its buttons under it: style.css, body.mini.library-open)
const playerShowing = () => !document.hidden && !document.body.classList.contains('clean') && !(state.mini && !document.body.classList.contains('library-open')) && !(rec.mr && !state.playerRec);
function updatePlayer(t) {
  if (!state.playerBar || WIDGET) return;
  playerBar.update({
    t, active: playerShowing(), source: state.source, stopped: state.stopped, label: state.label, song: currentSong(),
    app: state.winSong?.app || '', session: !!state.winSong, systemPlaying: !!state.winPlaying, el: state.el,
    tempo: eng.tempo, key: eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}` : '', at: eng.placeAt(t),
    near: liveQueue() ? queueLine(liveQueue()) : null,
    art: state.source === 'system' && artSrc.startsWith('data:') ? artSrc : '',
  });
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
// Left alone, the capture would be 1920 x 1080 whatever the window's shape, with bars round it. In a
// browser: this tab, as the browser's own sharing dialog offers it, held at the size it starts at
// (the bar the browser shows while sharing shrinks the page, and a recording whose size changes
// partway comes out with broken frames).
async function windowStream() {
  const w = innerWidth * devicePixelRatio, h = innerHeight * devicePixelRatio, k = Math.min(2, 1920 / Math.max(w, h));
  const even = (x) => 2 * Math.round((x * k) / 2);
  if (window.nc.platform === 'web') {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
    await stream.getVideoTracks()[0]?.applyConstraints({ width: { exact: even(w) }, height: { exact: even(h) }, frameRate: 60, resizeMode: 'crop-and-scale' }).catch(() => {});
    return stream;
  }
  const id = await window.nc.recSource();
  const size = { minWidth: even(w), maxWidth: even(w), minHeight: even(h), maxHeight: even(h) };
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: id, maxFrameRate: 60, ...size } } });
}

async function startRecording() {
  if (!window.nc?.recSource) throw new Error('recording works in the app, not in a browser');
  // the note about the last recording goes first, and is off the screen before the capture starts
  // (hidden once recording had begun, it was in the first second of the video)
  hideNotice();
  // (the recorder waits for the page to paint: real time, the screen's)
  await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 100); });
  // (Date.now() below: how long the recorder's file has made no progress, a watchdog in real time)
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
  takeBegin().catch((err) => console.error('perfect copy:', err)); // (a take that can't begin leaves the recording as it is, and says why)
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

// The perfect take (stream B): with the perfect copy on (Ctrl+K, "perfect copy"), a tap (take-tap.js) keeps the last 30 s of
// what the app hears. M starts a take with that run-up, and sends the rest as it comes; M's stop ends it with what changed
// on the way, and main draws it again in a hidden window, one exact frame at a time, as "<recording> perfect.mp4"
// (take-replay.js is the page's half of that). The take holds what the page was like at M: its size (the recording's: the long
// side at most 1920 pixels, an even number each way), the settings and the storage it opens with, the clock's seed.
const TAKE_RUNUP = 30;
const takeRec = { tap: null, starting: false, node: null, blocks: [], id: null, t0: 0, setup: '', changes: [], skipped: '' };
async function takeFollow() {
  if (TAKE || !window.nc?.takeBegin) return;
  if (takeRec.starting) return; // (the tap is being made, and follows the page as it is by then: a second go would find it not there yet)
  if (!state.perfectCopy || !state.node) { takeStop(); return; }
  if (!takeRec.tap) {
    takeRec.starting = true;
    try { takeRec.tap = await createTakeTap(ac, { send: takeBlock }); } catch (err) { console.error('perfect copy:', err); } finally { takeRec.starting = false; }
    if (!takeRec.tap) return;
    if (!state.perfectCopy || !state.node) { takeStop(); return; } // (turned off, or the source gone, while it started)
  }
  if (takeRec.node === state.node) return;
  try { takeRec.node?.disconnect(takeRec.tap.node); } catch { /* gone */ }
  takeRec.node = state.node;
  state.node?.connect(takeRec.tap.node);
}
function takeStop() {
  if (!takeRec.tap) return;
  takeEnd(false); // (a take still recording would have no sound from here, or a gap in it if the tap came back: a copy with a hole in its sound is no copy, so it goes)
  try { takeRec.node?.disconnect(takeRec.tap.node); } catch { /* gone */ }
  takeRec.tap.stop();
  takeRec.tap = takeRec.node = null;
  takeRec.blocks = [];
}
// a block of sound: to the take, while there is one, else into the run-up (the last 30 s)
function takeBlock(b) {
  if (takeRec.id) { window.nc.takeSound(takeRec.id, b.data); return; }
  takeRec.blocks.push(b);
  if (takeRec.beginning) return; // (a take is beginning: takeBegin sends these with the run-up)
  while (takeRec.blocks.length > 1 && takeRec.blocks[takeRec.blocks.length - 1].at - takeRec.blocks[0].at > TAKE_RUNUP) takeRec.blocks.shift();
}
// the page's storage as it is (what it opens with in the render), the small entries only
function storageNow() {
  const out = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k); if (v !== null && v.length < 65536) out[k] = v; } } catch { /* none */ }
  return out;
}
// The cover as a take keeps it: a small JPEG of songArt() (at most 320 px), or nothing (none, or a picture that won't be read)
function artData() {
  const im = songArt(), w = im?.naturalWidth || im?.width || 0, h = im?.naturalHeight || im?.height || 0;
  if (!w || !h) return '';
  try {
    const s = Math.min(1, 320 / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } catch { return ''; }
}
// A take that can't begin gives no copy, and the recording goes on as it was: said in the status, and again when the recording stops
// (the header is out of the picture while M records, and the picture is the video, so it can't be read then)
function takeSkip(why) {
  takeRec.skipped = `no perfect copy of this recording: ${why}`;
  flashStatus(takeRec.skipped);
}
// what main's refusal says, without the IPC's own words before it
const takeSaid = (err) => (err?.message || String(err)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
async function takeBegin() {
  takeRec.skipped = '';
  if (!state.perfectCopy || takeRec.id) return; // (off: nothing to say; a take already begun goes on)
  if (!takeRec.tap) return takeSkip(!state.node ? 'there is no sound playing for it to keep' : takeRec.starting ? 'its sound tap is only just starting' : "its sound tap didn't start");
  if (!takeRec.blocks.length) return takeSkip('it has heard no sound yet (it was turned on a moment ago)');
  const dpr = devicePixelRatio * Math.min(2, 1920 / Math.max(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio));
  const first = takeRec.blocks[0], t0 = clock.now(), soundAt = clock.fromAudio(first.at);
  if (!Number.isFinite(soundAt)) return takeSkip("the clock isn't on the sound yet");
  const song = currentSong();
  const meta = {
    // (the CSS size as it is: the render rounds the pixels down to even, take-render.cjs outputSize)
    css: { width: innerWidth, height: innerHeight }, dpr, fps: 30, sampleRate: ac.sampleRate, channels: 2,
    soundAt, t0, runup: t0 - soundAt, seed: clock.seed, source: state.source, label: state.label || '', storage: storageNow(),
    vertical: !!state.vertical, mini: !!state.mini, // (the window's layout: the render's window is already that shape, the page is told)
    song: song?.title ? { title: song.title, artist: song.artist || '' } : null, art: artData(), autoScene, autoSceneAt, // (what names and colours it, and the scene: the counter and when it last moved)
  };
  // (the blocks that come while main answers join the run-up, none trimmed, so its first is still where the take's sound
  // begins; then all of them go, in order)
  takeRec.beginning = true;
  try { takeRec.id = await window.nc.takeBegin(meta); }
  catch (err) { return takeSkip(takeSaid(err)); } // (main said no: a sound rate or pixel ratio it has no list for, a full disk)
  finally { takeRec.beginning = false; }
  const blocks = takeRec.blocks;
  takeRec.blocks = [];
  for (const b of blocks) window.nc.takeSound(takeRec.id, b.data);
  takeRec.t0 = t0; takeRec.setup = JSON.stringify(takeSetup());
  // (taps of tap tempo in the run-up are the take's too: the copy hears the run-up again, and taps it again where they fell)
  takeRec.changes = [...(eng.taps || []).filter((x) => x >= soundAt).map((x) => ({ t: x, tap: true })),
    ...(takeRec.dropsAt || []).filter((x) => x >= soundAt).map((x) => ({ t: x, drop: true })),
    ...(takeRec.resumes || []).filter((x) => x.t >= soundAt).map((x) => ({ t: x.t, resume: x.gap }))].sort((a, b) => a.t - b.t); // (and a file played on after a pause: followPauses)
}
// what changed during the take (a background, a scene, the blocks, the theme, the code hidden): noted at its time (not the
// layout: the copy keeps the shape the recording began with)
// (and the toggles and A's variants a scene doesn't hold: the orb, the card, hush, the drop effect, the CRT, the look, the worlds'
// look, the chrome's collage, the noodles, the spectrogram's colours; applied in the copy by takeSetters)
const TAKE_EXTRAS = ['orb', 'glass', 'card', 'cardV', 'cardBig', 'hushed', 'drop', 'crt', 'look', 'worldLook', 'chromeCollage', 'spaghettiKind', 'spectroTheme'];
const takeSetup = () => { const { vertical, ...rest } = currentSetup(); return { ...rest, ...Object.fromEntries(TAKE_EXTRAS.map((k) => [k, state[k]])) }; };
function takeNote(t) {
  const now = JSON.stringify(takeSetup());
  if (now !== takeRec.setup) { takeRec.setup = now; takeRec.changes.push({ t, set: JSON.parse(now) }); }
}
function takeEnd(keep) {
  if (!takeRec.id) { if (keep && takeRec.skipped) flashStatus(takeRec.skipped); takeRec.skipped = ''; return; } // (no take: why, now the header is back)
  takeRec.tap?.flush(); // (the last second, not yet a whole block, goes to the take first)
  const id = takeRec.id;
  takeRec.id = null;
  window.nc.takeEnd(id, { duration: clock.now() - takeRec.t0, changes: takeRec.changes, keep: !!keep })
    // (said once main has the take to draw: one whose sound couldn't be kept is gone, and nothing will follow)
    .then((drawing) => { if (drawing) flashStatus('making a perfect copy…'); })
    .catch((err) => showNotice('the perfect copy could not be made: ' + takeSaid(err)));
}
function setPerfectCopy(on) {
  state.perfectCopy = on;
  saveSettings();
  const recording = !!takeRec.id; // (turned off now, its take goes: see takeStop)
  takeFollow();
  flashStatus(on ? `perfect copy: on (${rec.mr ? 'from the next recording' : 'each recording is drawn again, frame by frame, beside it'})` : recording ? 'perfect copy: off (this recording gets none)' : 'perfect copy: off');
}
window.nc?.onTakeProgress?.((f) => { takeRec.making = true; flashStatus(`making a perfect copy… ${Math.floor(f * 100)}%`); });
window.nc?.onTakeDone?.((file) => { takeRec.making = false; showNotice('saved ' + file.split(/[\\/]/).pop(), file); });
window.nc?.onTakeFailed?.((why) => { takeRec.making = false; showNotice('the perfect copy could not be made: ' + why); });

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
    takeEnd(file && !file.endsWith('.part'));
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
  takeEnd(false); // (no recording, no perfect copy: the take is dropped)
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

// A note in the corner for a few seconds, with a button to show the file (in a browser it's in the
// downloads). While recording it would be in the video (a drop clip or an export finishing then), so
// it goes to the status line in the footer instead, which hides while recording.
function showNotice(text, file, keep = false) {
  if (rec.mr) { flashStatus(text); return; }
  const el = $('notice');
  el.textContent = text;
  if (file && window.nc?.platform !== 'web') {
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
// (in render mode the page's CSS animations run on the clock's time, not the browser's: see dom-time.js)
const domTime = createAnimationDriver();
clock.timerHook = (at) => domTime(at); // (an animation a clock timer starts takes its age from the timer's own time)
let codeAt = -Infinity, hushWas = false;
// (the page's words that are not a layer, refreshed on the engine's ticks: when each last was)
let footerAt = -Infinity, poolAt = -Infinity, rollAt = -Infinity;
// The code's share of a tick: what the engine knows is typed into the code view (about every third tick: 40 ms or
// more after the last time, counted on the clock, not in ticks, so where a render starts doesn't change it) and the
// view goes a step on. A render (the clock in render mode, stream B) calls this itself at each tick of its take, with
// the engine's state put in place first; live, the timer below does, after the engine has listened.
function codeTick(t) {
  if (t - codeAt >= 0.04 || t < codeAt) {
    codeAt = t;
    view.slipsOff = !state.stagedTypos || !!rec.mr || clips.on || !!TAKE; // (no staged slips in a video: see codeview.js; a perfect copy is one)
    const lines = buildLines(eng, { song: currentSong(), source: state.label || 'nothing yet', hushed: state.hushed }, t);
    view.update(lines, t, state.hushed !== hushWas); // a hush goes in at once
    hushWas = state.hushed;
  }
  view.step(t);
  // The tokens that light with the hits and the changes that land on the bar line (each flashes: a CSS animation begins), as
  // of this tick: so which are lit, and when a flash began, is the same whatever frames are drawn.
  view.highlight(t, eng);
  // What the page says in words, apart from the layers, is refreshed here, on the engine's ticks (which a render runs the same
  // at any frame rate), not on whatever frames happen to come: the footer's readout (the level, the tempo and key) 8 times a
  // second, the rain's pool of characters every 2 s, whether the roll fits every half second.
  if (t - footerAt > 0.125 || t < footerAt) { footerAt = t; renderFooter(); }
  // (the rain's characters: the code's lines, not the panels' boxes, which rained as +)
  if (t - poolAt > 2 || t < poolAt) { poolAt = t; field.setPool(Object.values(lineTexts()).filter(Boolean).join('\n')); }
  if (t - rollAt > 0.5 || t < rollAt) { rollAt = t; fitRoll(); }
  if (clock.mode === 'render') domTime(t);
  else if (takeRec.id) takeNote(t);
}
setInterval(() => {
  if (clock.mode === 'render') return; // (a render is driven from outside: it listens to nothing live)
  const t = nowSec();
  // (the audio clock times the onsets for the tempo; after a stop the engine goes on listening, to nothing, till it hears the
  // silence, else it would beat on to a song that stopped: the rings, the scenery's walk, the chrome)
  if (state.node || (eng.tempo.locked && !eng.silent)) eng.frame(t, ac.currentTime);
  codeTick(t);
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
  spaghetti: () => VISUALS[state.visual] === 'spaghetti',
  earth: () => VISUALS[state.visual] === 'earth',
  // (the backrooms had no line here till 0.5.6: its canvas, emptied when another background was picked, stayed in the page over
  // the worlds, the chrome, the spaghetti and the Earth, and an empty canvas that isn't see-through is a black sheet: those four drew
  // black after a visit to the backrooms, till Toaster was started again)
  backrooms: () => VISUALS[state.visual] === 'backrooms',
  spectro: () => VISUALS[state.visual] === 'spectrogram',
  spectrobox: () => VISUALS[state.visual] === 'spectrogram',
  scenery: () => VISUALS[state.visual] === 'scenery',
  lanes: () => VISUALS[state.visual] === 'lanes',
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
  glPool.tend();
}

// Drawing: at most 60 frames a second, even on faster monitors, and none while minimized. With
// nothing to hear the picture hardly moves, so after 3 seconds of quiet it draws 30 times a
// second, and after 30 seconds 10 times, if the window isn't in front (it measured 16% of a core
// drawing a still screen at 60). The next sound brings it straight back. Never while recording,
// with the camera on, during a drop or while the dynamic theme's colours are easing (a song changed).
let playerAt = 0, lastFrame = 0, windowShown = true, libraryAt = 0;
let worldsWarmScheduled = false;
let trackShown = ''; // the tracking trouble last told about (see draw)
window.nc?.onWindowShown((shown) => { windowShown = shown; });
function frameGap(t) {
  if (rec.mr || cam.on || takeover.active || y2k.active || storm.active || coverTheme.easing(t)) return 1000 / 61;
  const quiet = state.node ? t - eng.lastSound : Infinity;
  return quiet > 30 && !document.hasFocus() ? 1000 / 10.5 : quiet > 3 ? 1000 / 30.5 : 1000 / 61;
}
// (`now`, the frame's own timestamp, only decides whether this frame is drawn: what a drawn frame shows is a function
// of the clock's time, and of what the engine heard. A render draws its frames itself, with drawFrame.)
function draw(now) {
  requestAnimationFrame(draw);
  if (clock.mode === 'render') return;
  const t = nowSec();
  if (!windowShown || now - lastFrame < frameGap(t)) return;
  lastFrame = now;
  drawFrame(t);
}
// One frame, for time t: every layer drawn as it is at that time. Live, draw() above calls it as the screen asks; in
// render mode whoever drives the clock calls it, once per frame of the video, after clock.set(t).
function drawFrame(t) {
  patternClock(t);
  tourEarth(t);
  showLayers();
  if (THEMES[state.theme] === 'dynamic') stepTheme(t);
  if (clock.mode === 'render') domTime(t); // (in a render each CSS animation takes its age from the clock: see dom-time.js)
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
  else if (mode === 'earth') {
    earth.draw(t, eng, { offset: syncOffset(), calm: state.calm });
    if (earth.failed && !earthSaid) { earthSaid = true; flashStatus("the Earth's views come down the first time: no connection"); }
  } else if (mode === 'backrooms') {
    backrooms.draw(t, eng, { offset: syncOffset() });
    if (backrooms.failed && !backroomsSaid) { backroomsSaid = true; flashStatus('the backrooms come down the first time: no connection'); }
  }
  else if (mode === 'worlds') {
    const played = ['bd', 'sd', 'hhc', 'hho'].filter((id) => eng.presentAt(id, t)).map((id) => ({ bd: 'kick', sd: 'clap', hhc: 'hats', hho: 'open hats' })[id]).join(' ');
    worlds.draw(t, eng, { song: currentSong(), lines: Object.values(lineTexts()).filter(Boolean), played, chord: eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}` : '', codeBox, col });
  }
  else if (mode === 'chrome') chrome.draw(t, eng, { song: currentSong(), calm: state.calm, collage: state.chromeCollage });
  else if (mode === 'spaghetti') spaghetti.draw(t, eng, { col, calm: state.calm, offset: syncOffset(), picture: songArt(), endless: state.spaghettiKind === 'endless' });
  else if (mode === 'spectrogram') spectro.draw(t, eng, { theme: THEMES[state.theme], themed: state.spectroTheme, offset: syncOffset(), stops: THEMES[state.theme] === 'dynamic' ? themeLook?.terrain || heatStops(col.fg) : null });
  else if (mode === 'scenery') scenery.draw(t, eng, { col, offset: syncOffset(), colours: state.sceneryTheme ? 'theme' : 'own', palette: themeLook?.scene || null, strength: STRENGTHS[state.strength][1], scene: sceneShown(), open: state.codeHidden });
  else if (mode === 'lanes') lanes.draw(t, eng, col, syncOffset());
  else if (mode === 'cuts') cuts.draw(t, eng, col, syncOffset(), state.calm, { lines: lineTexts(), cam: cam.frame, art: songArt() });
  // (a background still compiling, the window black: the field of glyphs over it, see wait.js)
  wait.draw(t, !!{ worlds, chrome, spaghetti, spectrogram: spectro, warp, spectrum: field, rain: field, scope: field }[mode]?.waiting, col);
  // Don't make the worlds' compiler compete with the first visual. In particular a cold scenery
  // shader may take longer than 30 seconds: start that clock only once it actually draws.
  const settled = mode === 'scenery' ? !!scenery.drawnScene : mode === 'worlds' ? !worlds.broken : mode === 'chrome' ? !chrome.broken : mode === 'spaghetti' ? !spaghetti.broken : true;
  if (!worldsWarmScheduled && settled) {
    worldsWarmScheduled = true;
    setTimeout(() => worlds.warm(), 30000);
  }
  if (state.orb) orb.draw(t, eng, col, syncOffset(), (out, at) => bands(eng, out, 40, 14000, at), storm.orbRect(stageRect()));
  if (state.blocks) punch.setBackdrop(mode !== 'off');
  if (state.blocks) punch.draw(t, eng, col, syncOffset(), mode === 'worlds' || mode === 'chrome' || mode === 'spaghetti', state.blockLook, currentSong()?.title, WIDGET ? 'widget' : state.mini, THEMES[state.theme] === 'pink' ? 'pink' : 'blue');
  if (card.shown) card.draw(t, eng, { song: currentSong(), source: state.label, frame: cam.frame, face: meshFace() || cam.face, art: songArt() }, col);
  cam.draw(col, camRect(), { mask: tracker.mask, bar: eng.bar });
  if (dotCamOn()) dotCam.draw(t, { video: cam.video, mask: tracker.mask, rect: camRect(), eng, mirror: cam.mirrored, offset: syncOffset() });
  if (voxCamOn()) voxCam.draw(t, { video: cam.video, mask: tracker.mask, rect: camRect(), eng, mirror: cam.mirrored, offset: syncOffset() });
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
    const where = { place: cam.place, crop: cam.drawCrop, rect: cam.rect, mirror: cam.mirrored, col };
    // a portal, while one is open, stands in for the finger frame (and the hand signs)
    portal.draw(t, { ...where, hands: tracker.hands, video: cam.video, mask: tracker.mask, bar: eng.bar, face: tracker.face, pose: tracker.pose });
    if (portal.showing) lens.clear();
    else lens.draw(t, { ...where, hands: tracker.hands, eyes: tracker.eyes, bar: eng.bar });
    // (behind the code: a window filling the picture, and the camera's glass effect, which is drawn
    // on the portals' canvas over the whole picture: over the code, it hid it)
    const under = portal.full || portal.glassFx;
    if (under !== document.body.classList.contains('portal-full')) document.body.classList.toggle('portal-full', under);
    if (state.handPoints) handPoints.draw(t, { hands: tracker.hands, place: cam.place, col });
    else handPoints.clear();
    watchSigns(t);
    if (handLog.on) handLog.update(t, tracker.hands, { place: cam.place, rect: cam.rect, portal: portal.state, lens: lens.showing, sign: gestures.holding });
    if (state.eyes || windows) segcam.draw(t, { ...where, face: tracker.face, eyes: state.eyes, windows, frame: cam.frame, ascii: state.ascii });
  } else handPoints.clear();
  post.draw(t, eng, col, syncOffset());
  glass.draw(t, eng, col, LAYERS);
  storm.draw(t, eng, { layers: STORM_LAYERS, bg: `rgb(${col.bg})`, offset: syncOffset(), calm: state.calm });
  takeover.draw(t, grid, cam.frame, eng.bar, state.calm);
  y2k.draw(t, grid, state.calm);
  if (t - playerAt > 0.125 || t < playerAt) { playerAt = t; updatePlayer(t); } // (the player bar: a control of the page, on the frames; the footer's readout is codeTick's)
  noteResume(t); // (where the library's queue is: kept every five seconds while it plays)
  if (libraryPanel.isOpen && t - libraryAt > 0.25) { libraryAt = t; libraryPanel.update(); } // (what's playing, and the clock)
}

// ---------------------------------------------------------------- controls

const run = (fn) => () => fn().catch(showError);
$('go-system').onclick = run(useSystem);
$('go-demo').onclick = run(useDemo);
$('go-demo-hero').onclick = () => $('go-demo').click(); // (a page's first visit: the same demo, as the one big first click)
$('go-file').onclick = () => $('file').click();
$('go-input').onclick = run(chooseInput);
$('go-mic').onclick = run(() => useInput(null)); // (a phone or a tablet: its microphone at once, in the tap, as iOS needs)
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
  blockLook: (look) => { state.blockLook = look; setBlocks(state.blocks); },
  gameScreens: (screen) => { state.gameScreens = screen; setGameScreens(screen); saveSettings(); },
  theme: (name) => { state.theme = THEMES.indexOf(name); applyTheme(); saveSettings(); },
  codeHidden: (v) => (v === 'beat' ? setCodeHidden(false, true) : setCodeHidden(v)),
  vertical: async (on) => state.vertical === on || (await toggleLayout()),
  libCover: setLibCover,
  orb: (on) => setOrb(on),
  glass: (on) => setGlass(on),
  look: (name) => setLook(name, false),
  drop: (name) => { state.drop = DROPS.indexOf(name); if (name === 'y2k bug') y2k.prepare(); saveSettings(); },
  camFx: (name) => setCamFx(CAM_FX.indexOf(name), false),
  earthClip: (name) => { state.earthClip = name; earth.setClip(name); earthTour.at = nowSec(); saveSettings(); },
  earthTour: (on) => { state.earthTour = on; earthTour.at = nowSec(); saveSettings(); },
};
let presetQueue = Promise.resolve();
function choosePreset(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return Promise.reject(new Error('Unknown preset'));
  return runPreset(preset, 'preset');
}
// (a preset, or a scene of yours, which is the same shape: what it says by `word` once it's on)
function runPreset(preset, word) {
  const run = async () => {
    // (with just the beat hidden, a preset's codeHidden: false still means all of the code)
    if (word === 'scene') await looksReady;
    const current = currentSetup();
    let warning = '';
    const load = word === 'scene' ? sceneForLoad(preset, sceneDomains(), (message) => { warning = message; }) : preset;
    const changed = await applyPreset(load, current, presetSetters);
    if (warning) flashStatus(warning);
    else if (changed) flashStatus(`${word}: ${preset.name.toLowerCase()}`);
  };
  presetQueue = presetQueue.then(run, run);
  return presetQueue;
}

// The picker under the background button: a picture of each scene (auto first) and of each other background in V's
// round (the spaghetti's two kinds each), the one showing marked; a click shows it (a scene: the scenes, with that one
// picked). Its pictures are renderer/thumbs, fetched only when it opens.
function showVisMenu(open) {
  visMenu.hidden = !open;
  if (!open) return;
  const now = VISUALS[state.visual];
  const tile = (kind, name, label, on) => `<button type="button" role="menuitem" class="tile${on ? ' on' : ''}" data-kind="${kind}" data-name="${name}"><img src="thumbs/${kind}-${name}.webp" alt="" width="160" height="100"><span>${label}</span></button>`;
  const scenes = ['auto', ...scenery.scenes].map((s) => tile('scene', s, s === 'auto' ? 'auto: a new one each song' : (SCENE_NAMES[s] || s).replace(/^the /, ''), now === 'scenery' && !state.sceneryTheme && state.sceneryScene === s));
  const more = V_ROUND.filter((v) => v !== 'scenery').flatMap((v) => (v === 'spaghetti' ? SPAGHETTI_KINDS.map((k) => tile('spaghetti', k, 'spaghetti: ' + k, now === v && state.spaghettiKind === k))
    : v === 'earth' ? []
    : [tile('bg', v, v === 'off' ? 'off: just the code' : visName(v), now === v)]));
  // the Earth has its own shelves (twenty views): all of them in turn first, then the night side, the day side and the station's sights
  const earthTile = (c) => tile('earth', c.replace(/ /g, '-'), c, now === 'earth' && state.earthTour === false && state.earthClip === c);
  const earthShelves = `<div class="pick-head">the Earth, from the space station</div><div class="pick-grid">${tile('earth', 'all', 'all views: a new one every 8 bars', now === 'earth' && state.earthTour !== false)}</div>`
    + EARTH_GROUPS.map(([shelf, views]) => `<div class="pick-sub">${shelf}</div><div class="pick-grid">${views.map(earthTile).join('')}</div>`).join('');
  const presets = PRESETS.map((p) => `<button type="button" role="menuitem" class="tile" data-kind="preset" data-name="${p.id}"><img src="${p.picture}" alt="" width="160" height="100"><span>${p.name}</span></button>`);
  visMenu.innerHTML = `<div class="pick-head">presets</div><div class="pick-presets">${presets.join('')}</div><div class="pick-head">scenes</div><div class="pick-grid">${scenes.join('')}</div>${earthShelves}<div class="pick-head">more backgrounds</div><div class="pick-grid">${more.join('')}</div>`;
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
  } else if (b.dataset.kind === 'spaghetti') {
    state.spaghettiKind = b.dataset.name;
    setVisual(VISUALS.indexOf('spaghetti'));
    flashStatus('background: spaghetti, ' + b.dataset.name);
  } else if (b.dataset.kind === 'earth') {
    setEarthView(b.dataset.name.replace(/-/g, ' '), false);
    setVisual(VISUALS.indexOf('earth'));
    flashStatus(earthLabel());
  } else { setVisual(VISUALS.indexOf(b.dataset.name)); flashStatus('background: ' + visName(b.dataset.name)); }
  saveSettings();
  showVisMenu(false); crtStatic(); crtOsd(crtChannel());
};
addEventListener('pointerdown', (e) => { if (!visMenu.hidden && !e.target.closest('#vis-menu, #b-visual')) showVisMenu(false); }, true);
// the koi pond: a click on the water (not on a button, a menu or a panel) drops food there, and the
// koi nearest come to it
addEventListener('click', (e) => {
  if (VISUALS[state.visual] === 'scenery' && sceneShown() === 'koi' && !e.target.closest('button, a, input, select, dialog, [role="menu"], .panel, #menu, #bar, footer, #player, #alerts, #notice, #err, #card, #library')) scenery.feed(e.clientX, e.clientY);
});
$('b-blocks').onclick = () => { nextBlocks(); showRound('blocks'); };
$('b-cam').onclick = () => toggleCam().then(() => showRound('cam'));
$('b-card').onclick = () => { toggleCard(); showRound('card'); };
$('b-strudel').onclick = () => openInStrudel();
$('b-rec').onclick = () => toggleRecording();
$('b-layout').onclick = () => toggleLayout();
$('b-mini').onclick = () => (gameShowing() && window.nc?.setWidget ? window.nc.setWidget(true) : toggleMini());
$('b-help').onclick = () => $('help').showModal();
// The help's pages: keys (the one it opens on), settings, what's new, how it works; the one last looked at stays for next time
// it opens. (It was all four down one long scroll: the settings were under two paragraphs, the keys under the settings.)
// Only what shows changes (style.css, #help[data-tab]); the arrows move between the tabs when one has the focus.
function helpTab(name) {
  const h = $('help');
  h.dataset.tab = name;
  for (const b of h.querySelectorAll('.help-tabs button')) { const on = b.dataset.tab === name; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }
  h.scrollTop = 0;
}
$('help').querySelector('.help-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) helpTab(b.dataset.tab); };
$('help').querySelector('.help-tabs').onkeydown = (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const all = [...e.currentTarget.querySelectorAll('button')], to = all[(all.indexOf(document.activeElement) + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
  e.preventDefault(); helpTab(to.dataset.tab); to.focus();
};
helpTab('keys');

$('rename-form').addEventListener('submit', () => {
  const title = $('rename-title').value.trim(), artist = $('rename-artist').value.trim();
  state.manual = title || artist ? { title: title || 'untitled', artist: artist || 'Unknown' } : null;
});

// ---------------------------------------------------------------- keys

// Every action and its key. Each key can be changed in the help (?): click it, press the new one;
// a key another action has goes over to it in exchange. The changes are kept with the settings
// (only the ones that differ from these). Esc, ? and F11 stay as they are.
// R's round: what floats over the picture. The orb and the glass blob are each on or off; the round goes none, the orb, the
// glass blob, both (its place read from the two, so the orb's preset and Ctrl+K's "the glass blob" land in it too).
const OVER = ['none', 'the orb', 'the glass blob', 'both'];
const overAt = () => (state.orb ? 1 : 0) + (state.glass ? 2 : 0);
function pickOver(i) {
  if (!!(i & 1) !== !!state.orb) setOrb(!!(i & 1));
  if (!!(i & 2) !== !!state.glass) setGlass(!!(i & 2));
  flashStatus('over the picture: ' + OVER[i]);
}
const ACTIONS = [
  { id: 'source', key: 's', run: () => showMenu() },
  { id: 'library', key: 'g', run: () => toggleLibrary() },
  { id: 'visual', key: 'v', run: () => { setVisual(VISUALS.indexOf(V_ROUND[(V_ROUND.indexOf(VISUALS[state.visual]) + 1) % V_ROUND.length])); flashStatus('background: ' + visName(VISUALS[state.visual])); crtStatic(); crtOsd(crtChannel()); } },
  { id: 'strength', key: 'a', run: () => (state.blocks && state.blockLook === 'game' ? nextGameScreens() : VISUALS[state.visual] === 'worlds' ? nextWorldLook() : VISUALS[state.visual] === 'earth' ? nextEarthView() : VISUALS[state.visual] === 'chrome' ? toggleCollage() : VISUALS[state.visual] === 'spaghetti' ? nextSpaghetti() : VISUALS[state.visual] === 'spectrogram' ? toggleSpectroColours() : VISUALS[state.visual] === 'scenery' ? nextScene() : flashStatus(`${K('strength')} changes the scene, the world's look, the Earth's view, the chrome's collage, the spaghetti's noodles, the spectrogram's colours or the handheld's screens`)) },
  { id: 'blocks', key: 'p', run: () => nextBlocks() },
  // R: the orb, its 3D shapes over any background (off the keys in 0.4.23, back in 0.4.26: it was missed)
  // (and since 0.5.6 R goes round what floats over the picture: none, the orb, the glass blob, both. The glass had no key
  // from 0.4.23 on, only its name in Ctrl+K, and nobody found it)
  { id: 'orb', key: 'r', run: () => pickOver((overAt() + 1) % OVER.length) },
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
  { id: 'drop', key: 'd', run: () => {
    const t = nowSec();
    eng.lastDrop = t; eng.on.drop(true);
    takeRec.dropsAt = [...(takeRec.dropsAt || []).filter((x) => x > t - TAKE_RUNUP), t]; // (the run-up's, for a take begun after)
    if (takeRec.id) takeRec.changes.push({ t, drop: true }); // (a perfect copy drops it again, at the same time: take-replay.js)
  } },
  { id: 'dropfx', key: 'b', run: () => { state.drop = (state.drop + 1) % DROPS.length; if (DROPS[state.drop] === 'y2k bug') y2k.prepare(); saveSettings(); flashStatus('drop fx: ' + DROPS[state.drop]); } },
  { id: 'machine', key: 'i', run: () => { state.info = !state.info; sys.show(state.info); } },
  { id: 'layout', key: 'l', run: () => toggleLayout() },
  { id: 'mini', key: 'w', run: () => (WIDGET ? window.nc?.setWidget(false) : gameShowing() && window.nc?.setWidget ? window.nc.setWidget(true) : toggleMini()) },
  { id: 'theme', key: 't', run: () => nextTheme() },
  { id: 'crt', key: 'y', run: () => { setCrt(!state.crt); flashStatus(state.crt ? 'crt on' : 'crt off'); } },
  { id: 'look', key: 'u', run: () => setLook(LOOKS[(LOOKS.indexOf(state.look) + 1) % LOOKS.length]) },
  { id: 'name', key: 'e', run: () => renameSong() },
  { id: 'hide', key: 'h', run: () => document.body.classList.toggle('clean') },
  { id: 'code', key: 'z', run: () => { const next = nextCodeSetting(state); setCodeHidden(next.codeHidden, next.beatHidden); flashStatus(codeSaid()); } },
  { id: 'full', key: 'f', run: () => window.nc?.toggleFullscreen() },
];
// the footer's list of keys, in this order: [actions..., what it says]
const FOOTER = [['source', 'source'], ['library', 'library'], ['visual', 'background'], ['strength', 'next'], ['blocks', 'code look'], ['theme', 'theme'], ['code', 'hide code']];
// The rounds: a key that goes round a list (V, A, P, T, B, C, K, N, U, Z) shows the whole list for a moment over the footer, the one
// picked lit (#strip). The key again goes on as it always did; Shift with it goes back; while the list shows the arrows step
// either way and a click picks. (Before, a press said one name in the header, which sits dim while a song plays: no telling
// how many there were, where the round was, or that B's has an "off".) A round: its word, its names in the key's order, where
// it is now (-1: on none of them), how one is picked; `from`, the name the strip starts at (B's: "off" first).
function aRound() {
  const mode = VISUALS[state.visual];
  if (gameShowing()) return { word: "the handheld's screens", names: GAME_SCREENS.map((g) => SCREEN_NAMES[g]), at: GAME_SCREENS.indexOf(state.gameScreens),
    pick: (i) => { state.gameScreens = GAME_SCREENS[i]; setGameScreens(state.gameScreens); saveSettings(); flashStatus('screens: ' + SCREEN_NAMES[state.gameScreens]); } };
  if (mode === 'worlds') { const all = worlds.looks; return { word: "the world's look", names: all, at: all.indexOf(state.worldLook),
    pick: (i) => { state.worldLook = all[i]; worlds.setLook(all[i]); flashStatus('look: ' + all[i]); saveSettings(); } }; }
  if (mode === 'earth') { const all = [...EARTH_CLIPS, 'all']; return { word: 'the Earth', names: [...EARTH_CLIPS, 'all, in turn'], at: state.earthTour !== false ? all.length - 1 : all.indexOf(state.earthClip),
    pick: (i) => setEarthView(all[i]) }; }
  if (mode === 'chrome') return { word: 'the collage', names: ['off', 'on'], at: state.chromeCollage ? 1 : 0, pick: (i) => { if (!!state.chromeCollage !== !!i) toggleCollage(); } };
  if (mode === 'spaghetti') return { word: 'the noodles', names: SPAGHETTI_KINDS, at: SPAGHETTI_KINDS.indexOf(state.spaghettiKind),
    pick: (i) => { state.spaghettiKind = SPAGHETTI_KINDS[i]; flashStatus('noodles: ' + state.spaghettiKind); saveSettings(); } };
  if (mode === 'spectrogram') return { word: 'colours', names: ['rainbow', "the theme's"], at: state.spectroTheme ? 1 : 0, pick: (i) => { if (!!state.spectroTheme !== !!i) toggleSpectroColours(); } };
  if (mode === 'scenery') { const all = ['auto', ...scenery.scenes]; return { word: 'scene', names: [...all.map((n) => (SCENE_NAMES[n] || n).replace(/^the | \(.*/g, '')), "auto, in the theme's colours"], at: state.sceneryTheme ? all.length : all.indexOf(state.sceneryScene),
    pick: (i) => { state.sceneryTheme = i === all.length; state.sceneryScene = all[i] || 'auto'; flashStatus('scene: ' + (SCENE_NAMES[state.sceneryScene] || state.sceneryScene) + (state.sceneryTheme ? ", in the theme's colours" : '')); saveSettings(); } }; }
  return null; // (nothing for A to change on this background: the key says so, as before)
}
const ROUNDS = {
  visual: () => ({ word: 'background', names: V_ROUND.map(visName), at: V_ROUND.indexOf(VISUALS[state.visual]), more: ['pictures ▾', () => showVisMenu(true)],
    pick: (i) => { setVisual(VISUALS.indexOf(V_ROUND[i])); flashStatus('background: ' + visName(V_ROUND[i])); crtStatic(); crtOsd(crtChannel()); } }),
  strength: aRound,
  blocks: () => ({ word: 'the code as', names: ['dominoes', 'handheld game', 'punchcard', 'none'], at: state.blocks ? BLOCK_LOOKS.indexOf(state.blockLook) : BLOCK_LOOKS.length,
    pick: (i) => { if (BLOCK_LOOKS[i]) state.blockLook = BLOCK_LOOKS[i]; setBlocks(!!BLOCK_LOOKS[i]); flashStatus('code look: ' + ['dominoes', 'handheld game', 'punchcard', 'none'][i]); } }),
  theme: () => ({ word: 'theme', names: THEMES, at: state.theme, pick: (i) => { state.theme = i; applyTheme(); crtOsd(`PICTURE\n${THEMES[i].toUpperCase()}`); saveSettings(); } }),
  dropfx: () => ({ word: 'on a drop', names: DROPS, at: state.drop, from: DROPS.indexOf('off'),
    pick: (i) => { state.drop = i; if (DROPS[i] === 'y2k bug') y2k.prepare(); saveSettings(); flashStatus('drop fx: ' + DROPS[i]); } }),
  camfx: () => ({ word: 'camera effect', names: CAM_FX, at: state.camFx, pick: (i) => setCamFx(i, true) }),
  look: () => ({ word: 'look', names: LOOKS, at: LOOKS.indexOf(state.look), pick: (i) => setLook(LOOKS[i]) }),
  cam: () => ({ word: 'camera', names: ['off', 'on', 'big eyes', 'ASCII'], at: camWay(), pick: pickCam }),
  orb: () => ({ word: 'over the picture', names: OVER, at: overAt(), pick: pickOver }),
  card: () => {
    if ((state.vertical || state.mini) && gameShowing()) return null; // (the cartridge has the song: N says so)
    const on = state.vertical ? state.cardV : state.card;
    if (state.mini) return { word: 'card', names: ['off', 'on'], at: on ? 1 : 0, pick: (i) => { if (!!on !== !!i) toggleCard(); } };
    return { word: 'card', names: ['off', 'on', 'big'], at: !on ? 0 : state.cardBig ? 2 : 1,
      pick: (i) => { if (state.vertical) state.cardV = i > 0; else state.card = i > 0; state.cardBig = i === 2; applyCard(); saveSettings(); } };
  },
  code: () => ({ word: 'the code', names: ['shown', 'hidden', 'all but the beat'], at: state.codeHidden ? 1 : state.beatHidden ? 2 : 0, pick: (i) => { setCodeHidden(i === 1, i === 2); flashStatus(codeSaid()); } }),
};
const strip = $('strip');
let stripId = null, stripT = 0;
const stripShowing = () => !!stripId && !strip.hidden && strip.getClientRects().length > 0; // (not while recording or with the clean look: the CSS has it out)
function hideRound() { clearTimeout(stripT); strip.hidden = true; stripId = null; }
function showRound(id) {
  const r = ROUNDS[id]?.();
  if (!r) { hideRound(); return; }
  stripId = id;
  const n = r.names.length, el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; x.textContent = text; return x; };
  const word = el('span', 'word', ' ' + r.word);
  word.prepend(el('kbd', '', K(id)));
  strip.replaceChildren(word, ...r.names.map((_, j) => {
    const i = ((r.from || 0) + j) % n, b = el('button', i === r.at ? 'on' : '', r.names[i]);
    b.type = 'button'; b.dataset.i = i;
    if (i === r.at) b.setAttribute('aria-current', 'true');
    return b;
  }));
  if (r.more) { const b = el('button', 'more', r.more[0]); b.type = 'button'; b.dataset.more = '1'; strip.append(b); }
  strip.append(el('span', 'back', `shift+${K(id)} back`));
  strip.hidden = false;
  clearTimeout(stripT);
  stripT = setTimeout(hideRound, 2600);
}
// (a step from where the round is: on from none of them is the first, back from none the last)
function stepRound(id, dir) {
  const r = ROUNDS[id]?.();
  if (!r) return false;
  const n = r.names.length;
  Promise.resolve(r.pick(r.at < 0 ? (dir > 0 ? 0 : n - 1) : (r.at + dir + n) % n)).then(() => showRound(id), showError); // (the camera's takes a moment to start)
  return true;
}
strip.onclick = (e) => {
  const b = e.target.closest('button'), id = stripId;
  if (!b || !id) return;
  if (b.dataset.more) { const more = ROUNDS[id]()?.more; hideRound(); more?.[1](); return; }
  Promise.resolve(ROUNDS[id]()?.pick(+b.dataset.i)).then(() => showRound(id), showError);
};
// (it stays longer while the mouse moves on it; not for good, or a mouse left resting there would keep it over the picture)
strip.onpointermove = () => { clearTimeout(stripT); stripT = setTimeout(hideRound, 6000); };
strip.onpointerleave = () => { clearTimeout(stripT); stripT = setTimeout(hideRound, 1200); };

const RESERVED = new Set(['escape', '?', '/', 'f11', 'tab', 'enter', 'shift', 'control', 'alt', 'meta', 'capslock', 'contextmenu']);
// The keys you changed, as saved: kept if they're single keys, not taken twice, and not the key another action has as its own. A profile
// from before an action had its key may have set that key for another one (U's look and G's library came later): that one goes back
// to its own, and so on if that is taken too. (Two actions that traded keys were saved together: neither takes the other's own.)
function readKeys(saved) {
  const keys = {}, used = new Set();
  for (const [id, k] of Object.entries(saved && typeof saved === 'object' ? saved : {})) if (typeof k === 'string' && k && !used.has(k)) { keys[id] = k; used.add(k); }
  const taken = (id) => ACTIONS.some((a) => a.id !== id && (keys[a.id] ?? a.key) === keys[id]);
  let clash;
  while ((clash = Object.keys(keys).find(taken))) delete keys[clash];
  return keys;
}
const keyOf = (id) => state.keys[id] ?? ACTIONS.find((a) => a.id === id).key;
const keyName = (k) => (k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
const K = (id) => keyName(keyOf(id)); // an action's key as written
let byKey = new Map();

// Ctrl+K (renderer/palette.js): every action by name, then each scene, background, code look,
// handheld screen and theme, the camera's mirror, the player bar, and the bug and misread reports.
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
  { id: 'looks:folder', name: 'looks folder', aliases: ['shaders', 'hyprland', 'custom looks'], run: () => (window.nc?.looksOpen ? window.nc.looksOpen() : flashStatus('looks from a folder are in the app')) },
  { id: 'looks:reload', name: 'reload looks', aliases: ['shaders'], run: () => loadLooks(true) },
  { id: 'hand-points', name: 'hand points (on or off): the tracked hands drawn over the camera', aliases: ['hands', 'hand tracking', 'skeleton', 'landmarks', 'dots'], run: () => { state.handPoints = !state.handPoints; saveSettings(); flashStatus(state.handPoints ? 'hand points on' : 'hand points off'); } },
  { id: 'glass', name: 'the glass blob (on or off)', aliases: ['glass', 'blob', 'liquid', 'lens'], run: () => { setGlass(!state.glass); flashStatus(state.glass ? 'the glass on' : 'the glass off'); } },
  { id: 'code:glass', name: 'code on glass (on or off)', aliases: ['glass', 'liquid glass', 'acrylic', 'plates'], run: () => setGlassPlates(!state.glassPlates) },
  // the Earth's views, by name
  ...EARTH_CLIPS.map((c) => ({
    id: 'earth:' + c, name: `earth (${c})`, aliases: ['earth', 'space', 'nasa', 'iss', EARTH_GROUPS.find(([, views]) => views.includes(c))[0], ...(c.includes('aurora') || c.includes('northern') ? ['aurora', 'northern lights'] : [])],
    run: () => { setEarthView(c, false); setVisual(VISUALS.indexOf('earth')); flashStatus(earthLabel()); },
  })),
  { id: 'earth:all', name: 'earth (all): a new view every 8 bars', aliases: ['earth', 'the earth', 'earth tour', 'all earth', 'cycle earth', 'nasa', 'space'],
    run: () => { setEarthView('all', false); setVisual(VISUALS.indexOf('earth')); flashStatus(earthLabel()); } },
  { id: 'vis:backrooms', name: 'the backrooms', aliases: ['backrooms', 'liminal', 'liminal spaces', 'yellow rooms'], run: () => setVisual(VISUALS.indexOf('backrooms')) },
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
  // the camera's mirror, by name (the help's checkbox)
  ...[['mirrored', true, ['mirror', 'selfie']], ['not mirrored', false, ['unmirrored', 'flip', 'as the camera sees it', 'overhead', 'gear']]].map(([name, on, aliases]) => ({
    id: 'camera:' + name, name: 'camera: ' + name, aliases,
    run: () => { setMirror(on); flashStatus('camera: ' + name); },
  })),
  // the player bar, by name (the help's checkboxes): shown or hidden, and in recordings or not
  ...[['shown', true, ['show', 'transport', 'progress']], ['hidden', false, ['hide', 'transport', 'progress']]].map(([name, on, aliases]) => ({
    id: 'player:' + name, name: 'player bar: ' + name, aliases,
    run: () => { setPlayerBar(on); flashStatus('player bar: ' + name); },
  })),
  ...[['in recordings', true, ['record', 'video']], ['not in recordings', false, ['record', 'video']]].map(([name, on, aliases]) => ({
    id: 'player-rec:' + name, name: 'player bar: ' + name, aliases,
    run: () => { setPlayerRec(on); flashStatus('player bar: ' + name); },
  })),
  ...PRESETS.map((p) => ({ id: 'preset:' + p.id, name: 'preset: ' + p.name.toLowerCase(), aliases: ['setup'], run: () => choosePreset(p.id) })),
  // the library by name (its key, G, is an action above): its folder, a scan again, a setup saved as a scene, and the scenes saved
  { id: 'library:choose', name: 'library: choose a folder', aliases: ['music folder', 'folder', 'open folder'], run: () => { libraryPanel.open('music'); return libraryPanel.choose(); } },
  { id: 'library:scan', name: 'library: scan again', aliases: ['rescan', 'refresh music'], run: () => scanLibraryAgain() },
  { id: 'library:repeat', name: 'library: repeat', aliases: ['repeat', 'repeat all', 'repeat one', 'loop'], run: () => flashStatus(setQueueRepeat(nextRepeat(state.queueRepeat))) },
  { id: 'library:cover', name: 'library: cover, full or half ascii', aliases: ['cover', 'ascii cover', 'album art'], run: () => flashStatus(setLibCover(state.libCover === 'photo' ? 'chars' : 'photo')) },
  { id: 'library:shuffle', name: 'library: shuffle', aliases: ['shuffle', 'random order'], run: () => flashStatus(setQueueShuffle(!state.queueShuffle)) },
  { id: 'library:spotify', name: 'library: spotify', aliases: ['spotify', 'playlists', 'paste a spotify link', 'connect spotify'], run: () => { if (WIDGET || state.mini) { toggleLibrary(); return; } closeMenu(); return libraryPanel.open('spotify'); } },
  { id: 'library:find', name: 'library: find', aliases: ['find music', 'search music', 'find a song', 'search'], run: () => { if (WIDGET || state.mini) { toggleLibrary(); return; } closeMenu(); return libraryPanel.find(); } },
  { id: 'scene:save', name: 'scene: save this setup', aliases: ['save scene', 'save setup'], run: () => { saveSetupAsScene(); libraryPanel.update(); } },
  ...state.userScenes.map((s) => ({ id: 'user-scene:' + s.id, name: 'scene: ' + s.name.toLowerCase(), aliases: ['setup'], run: () => runPreset(s, 'scene') })),
  { id: 'perfect-copy', name: `perfect copy: ${state.perfectCopy ? 'off' : 'on'} (M's recordings drawn again, frame by frame)`, aliases: ['perfect take', 'export', 'render', 'recording'], run: () => setPerfectCopy(!state.perfectCopy) },
  ...(takeRec.making ? [{ id: 'perfect-copy:stop', name: 'perfect copy: stop making it', aliases: ['cancel', 'stop render'], run: () => window.nc?.takeCancel?.() }] : []),
  { id: 'share-card', name: 'share card: save a picture of this song', aliases: ['share', 'picture', 'post', 'image'], run: () => saveShareCard() },
  { id: 'report-bug', name: 'report a bug', aliases: ['bug', 'issue', 'problem'], run: () => bugReport.show() },
  { id: 'report-misread', name: 'report a misread', aliases: ['misread', 'wrong', 'wrong tempo', 'wrong key', 'wrong beat', 'sounded wrong', 'got it wrong'], run: () => misreadReport.show() },
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
  // (none in a perfect copy: its timer runs on real time, so a hint would show in whatever frames that time fell on)
  const blocked = !!TAKE || !!rec.mr || rec.busy || document.body.classList.contains('clean') || state.vertical || state.mini || WIDGET
    || !!document.querySelector('dialog[open]') || !$('menu').hidden || !visMenu.hidden || !$('notice').hidden || libraryPanel.isOpen;
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
// The share card (share-card.js): the ID card, the code's first lines and the link as one picture, saved as a file to post.
// It shows the card first if it's off, so the picture has the song's ID, title and cover.
async function saveShareCard() {
  if (!document.body.classList.contains('card-on')) toggleCard();
  // (the card's ID decodes in for a moment when it appears: the picture waits till it has held still a little, 5 s at most)
  const id = () => $('card').querySelector('.c-id')?.textContent;
  for (let last = id(), held = 0, waited = 0; held < 400 && waited < 5000; waited += 100) { await new Promise((r) => setTimeout(r, 100)); const now = id(); held = now === last ? held + 100 : 0; last = now; }
  await document.fonts.ready;
  const blob = await new Promise((r) => drawShareCard(document).toBlob(r, 'image/png'));
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: shareCardName(document) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  flashStatus('share card saved');
}
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

// Report a misread (renderer/misread.js), from the player bar's flag, the help or Ctrl+K: what Toaster read of the song just now.
// How far into the song: a file's own position; for the rest, how long Toaster has been listening to this song (since the
// engine's last start: the source picked, or a new song). The lines are the code's as it is now, or is being typed toward.
// With no source nothing was read (the engine counts on with nothing feeding it), so the tempo and key are left out.
function songSeconds() {
  if (!state.source) return null;
  if (state.source === 'file' && state.el && Number.isFinite(state.el.currentTime)) return state.el.currentTime;
  return nowSec() - eng.resetAt;
}
const misreadReport = createMisreadReport({
  document,
  snapshot: () => ({
    version: bugVersion, source: state.source, song: currentSong(), seconds: songSeconds(),
    tempo: state.source ? eng.tempo : null, key: state.source && eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}` : '',
    lines: Object.values(lineTexts()), os: osName(), browser: browserName(),
  }),
  open: (url) => (desktopApp() ? window.nc.openBugIssue(url) : window.open(url, '_blank', 'noopener')),
  clipboard: navigator.clipboard,
  fail: showError,
});
$('report-misread').onclick = () => { $('help').close(); misreadReport.show(); };

// (A's word: what it changes on what's showing; left out where there's nothing to change)
function nextWhat() {
  if (gameShowing()) return 'next screen';
  return { scenery: 'next scene', worlds: 'next look', chrome: 'collage', spaghetti: 'noodles', spectrogram: 'colours', earth: 'next view' }[VISUALS[state.visual]] || null;
}
// (Z's word: what it does next, as the code is now)
function codeNext() {
  return state.codeHidden ? 'code, no beat' : state.beatHidden ? 'all the code' : 'hide code';
}
function footerKeys() {
  const word = (f) => (f[0] === 'code' ? codeNext() : f[f.length - 1]);
  const parts = FOOTER.map((f) => (f[0] === 'strength' ? (nextWhat() ? `${K('strength')} ${nextWhat()}` : null) : `${f.slice(0, -1).map(K).join(' ')} ${word(f)}`));
  // (first, the way to everything by name: the palette, which was only told of in the help)
  const find = `${document.documentElement.classList.contains('darwin') ? '⌘K' : 'Ctrl+K'} find anything`;
  document.querySelector('footer .keys').textContent = [find, ...parts.filter(Boolean), '? all keys'].join(' · ');
}
// The bars fade while a song plays (body.live), so the picture has the window; a moving mouse is someone looking for a
// button, so they come back for as long as it moves and three seconds more.
{
  let asleep = 0;
  addEventListener('mousemove', () => {
    document.body.classList.add('awake');
    clearTimeout(asleep);
    asleep = setTimeout(() => document.body.classList.remove('awake'), 3000);
  }, { passive: true });
}

// The controls panel (controls.js): on a screen with no hover (an iPad, a phone), every action above as a
// button, with what it's set to. Nothing is added where there's a mouse. What a device can't do is left out.
const onoff = (v) => ({ text: v ? 'on' : 'off', on: !!v });
const desktopApp = () => !!window.nc && window.nc.platform !== 'web';
const standalone = () => !!navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const canRecord = () => !!window.nc?.recSource && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices && (desktopApp() || !!navigator.mediaDevices.getDisplayMedia);
// The library (G; renderer/library-panel.js): its tracks come from the folder you chose (main keeps it; in a browser, the one you pick);
// what plays and what it's called, the stations and the scenes you save are the page's, and the panel asks for each through `host`.
// The panel is made, with its modules, when it is first wanted (G, its entries in the footer, the help, Ctrl+K and the touch panel all
// come to toggleLibrary and libraryPanel below, which is library-core.js's handle for it): the page starts without them.
let librarySrc = null; // (where its tracks come from: made with the panel, which is the only thing that starts a queue)
const currentSetup = () => setupOf({ ...state, drop: DROPS[state.drop], camFx: CAM_FX[state.camFx], visual: VISUALS[state.visual], theme: THEMES[state.theme], codeHidden: state.beatHidden ? 'beat' : state.codeHidden });
function saveSetupAsScene() {
  state.userScenes = addScene(state.userScenes, currentSetup());
  const scene = state.userScenes[state.userScenes.length - 1];
  saveSettings();
  flashStatus('scene saved: ' + scene.name);
  return scene;
}
// what's playing, for the panel's strip and its marks: the library track (by its path), the radio's station, the song's names
function playingNow() {
  const q = liveQueue(), song = currentSong(), track = q?.tracks[q.index];
  const el = state.source === 'file' ? state.el : null, ms = track?.ms || (el && Number.isFinite(el.duration) ? el.duration * 1000 : 0);
  const station = state.source === 'radio' && !song; // (a station that sends no titles: it is the station that is playing)
  return {
    id: `${state.source}|${song?.title}|${song?.artist}|${track?.path || ''}`, track: track?.path || null, radio: state.source === 'radio' ? state.radio : '',
    title: station ? state.label : song?.title || '', artist: station ? 'radio' : song && song.artist !== 'File' ? song.artist : '', ms: Math.round(ms), stoppable: ['file', 'radio', 'demo'].includes(state.source),
    art: state.source === 'system' && artSrc.startsWith('data:') ? artSrc : '', // (the system's song's own cover, as Spotify or Music gave it: the spotify tab's big cover follows it)
  };
}
// The library's spotify section (library-panel.js; main has the rest, helpers/spotify.cjs). A link pasted is read and played in the Spotify
// app by main (a browser has no main: it opens Spotify's web player in a new tab and asks for that tab's sound), is kept in the section's list,
// and is named by the first song Spotify's player shows after it; Toaster then hears it as the system's sound, as it hears anything. What the
// listener's own library lists and plays is main's too, with its tokens: the page asks, and gets rows or errors in words, never a token.
const spotifyBridge = () => (desktopApp() && typeof window.nc.spotifyList === 'function' ? window.nc : null);
// Spotify plays in its own app, so Toaster takes the system's sound for its source, unless it has it already (the library's other plays do the same for theirs)
const hearSystem = () => { if (state.source !== 'system') useSystem().catch(showError); };
async function spotifyOpen(text, link) {
  const nc = spotifyBridge();
  const played = nc ? await nc.spotifyOpen(text) : link;
  state.spotifyLinks = noteLink(state.spotifyLinks, played.uri);
  saveSettings();
  if (nc) {
    linkNaming = { uri: played.uri, was: state.winKey, until: Date.now() + 90000 };
    hearSystem();
  } else {
    window.open(`https://open.spotify.com/${played.kind}/${played.id}`, '_blank', 'noopener');
    useSystem().catch(() => flashStatus('Spotify is open in a new tab: pick source system audio and that tab to let Toaster hear it'));
  }
  return played;
}
async function spotifyPlay(request) {
  const said = await spotifyBridge().spotifyPlay(request);
  hearSystem();
  return said;
}
// The three modules are asked for at once (the panel would only find library.js once it had arrived), and the panel is made from them.
async function makeLibrary() {
  const [{ createLibraryPanel }, { librarySource }] = await Promise.all([import('./library-panel.js'), import('./library-source.js'), import('./library.js')]);
  librarySrc = librarySource(window);
  return createLibraryPanel({
    document, window, root: $('library'), source: librarySrc,
    host: {
      key: () => K('library'), titleBar: desktopApp, live: () => !!state.node,
      blocked: () => WIDGET || state.mini || !$('menu').hidden || !!document.querySelector('dialog[open]'), // (in the mini player it's hidden: the keys are the player's)
      playing: playingNow,
      // (index null: the album, from its first track, or from any with shuffle on)
      // (Math.random: which track a shuffled album starts on, not a picture's dice)
      play: (album, index, at = 0) => playQueue(queueOf(album, index ?? (state.queueShuffle ? Math.floor(Math.random() * album.tracks.length) : 0), { shuffle: state.queueShuffle }), at).catch(showError),
      resume: () => state.queueResume, recent: () => state.recentAlbums,
      repeat: () => state.queueRepeat, setRepeat: setQueueRepeat, shuffle: () => state.queueShuffle, setShuffle: setQueueShuffle,
      coverLook: () => state.libCover, setCoverLook: setLibCover, fullCover: albumCover,
      stop: stopPlayback,
      spotify: {
        get app() { return !!spotifyBridge(); },
        links: () => state.spotifyLinks,
        open: spotifyOpen,
        search: (query) => {
          const nc = spotifyBridge();
          if (nc) return nc.spotifySearch(query);
          if (typeof query !== 'string' || !query.trim() || query.trim().length > 256) throw new Error('Enter a Spotify song or artist (up to 256 characters).');
          const opened = window.open(`https://open.spotify.com/search/${encodeURIComponent(query.trim())}`, '_blank', 'noopener');
          // noopener may return null even when the tab opened; do not treat that as a failure.
          return { opened: !!opened };
        },
        status: () => spotifyBridge().spotifyStatus(),
        connect: (clientId) => spotifyBridge().spotifyConnect(clientId),
        disconnect: () => spotifyBridge().spotifyDisconnect(),
        list: (request) => spotifyBridge().spotifyList(request),
        play: spotifyPlay,
        prepareVideo: () => { stopPlayback(); hearSystem(); },
        cover: (url) => spotifyBridge().spotifyCover(url),
        dashboard: () => (window.nc?.spotifyDashboard ? window.nc.spotifyDashboard() : window.open('https://developer.spotify.com/dashboard', '_blank', 'noopener')),
      },
      stations: () => state.radioStations,
      playStation: (url) => useRadio(url).catch(showError),
      addStation: (text) => useRadio(text),
      openStations: window.nc?.openStations ? () => window.nc.openStations() : null, // (a page has none: its link opens a tab)
      scenes: () => ({ presets: PRESETS, user: state.userScenes }),
      sceneOn: (scene) => sceneIsOn(scene, currentSetup()),
      applyScene: (scene) => runPreset(scene, 'scene').catch(showError),
      saveScene: saveSetupAsScene,
      renameScene: (id, name) => { state.userScenes = nameScene(state.userScenes, id, name); saveSettings(); },
      deleteScene: (id) => { state.userScenes = dropScene(state.userScenes, id); saveSettings(); flashStatus('scene deleted'); },
      say: flashStatus, fail: showError,
    },
  });
}
// (a page that can't fetch them says so at each ask; a page keeps a module that failed to load, so it takes a new page to get it)
const libraryPanel = lazyLibrary({
  load: makeLibrary,
  fail: (err) => showError(new Error(`The library could not be loaded (${err?.message || err}). ${desktopApp() ? 'Restart Toaster' : 'Reload the page'} and press ${K('library')} again.`)),
});
// G: the library over the whole window (the mini player and the desktop handheld are too small for it)
function toggleLibrary() {
  // (in the mini player G only closes it: opening it needs the full window; the mini player from the library is the cover and its song)
  if (WIDGET || (state.mini && !libraryPanel.isOpen)) { flashStatus(`the library needs the full window (${K('mini')} brings it back)`); return; }
  if (!libraryPanel.isOpen) closeMenu(); // (the source menu, which the web version starts with, would sit over it)
  libraryPanel.toggle();
}
// Ctrl+K's "library: scan again": in the background, over whatever is showing, and what it found said at the end
async function scanLibraryAgain() {
  flashStatus('scanning the library…');
  await libraryPanel.scan();
  const l = libraryPanel.state;
  if (!l) return; // (it could not be loaded, which was said)
  flashStatus(l.error || `library: ${l.tracks} tracks in ${l.albums.length} albums`);
}

const controls = createControls({
  document, window, query: matchMedia('(hover: none)'), actions: ACTIONS, K, fail: (err) => showError(err),
  dock: new URLSearchParams(location.search).get('dock') || 'auto',
  now: {
    source: () => state.label || '',
    library: () => onoff(libraryPanel.isOpen),
    visual: () => VISUALS[state.visual],
    strength: () => {
      const v = VISUALS[state.visual];
      if (state.blocks && state.blockLook === 'game') return `game screens: ${SCREEN_NAMES[state.gameScreens]}`;
      return v === 'worlds' ? state.worldLook : v === 'chrome' ? `collage ${state.chromeCollage ? 'on' : 'off'}` : v === 'spaghetti' ? `noodles: ${state.spaghettiKind}` : v === 'earth' ? (state.earthTour !== false ? 'all' : state.earthClip) : v === 'spectrogram' ? (state.spectroTheme ? "the theme's colours" : 'rainbow')
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
    look: () => state.look,
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
  const t = nowSec(), n = eng.tap(t);
  if (takeRec.id) takeRec.changes.push({ t, tap: true }); // (a perfect copy taps it again, at the same time: take-replay.js)
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
  if (k === 'escape') { hideRound(); if (WIDGET) { window.nc?.setWidget(false); return; } closeMenu(); return; }
  if (e.target.closest('#alerts, #menu:not([hidden]) input')) return; // let Enter/Space press the message box's button, and an address be typed
  if (k === '?' || k === '/') { $('help').showModal(); return; }
  if (k === 'f11') { e.preventDefault(); window.nc?.toggleFullscreen(); return; }
  if ((k === 'arrowleft' || k === 'arrowright') && stripShowing()) { e.preventDefault(); stepRound(stripId, k === 'arrowright' ? 1 : -1); return; }
  const act = byKey.get(k);
  if (!act) return;
  if (k === ' ' || act.id === 'full') e.preventDefault(); // (Space would scroll or press a button)
  // A key held down repeats: only the sync nudges ([ and ]) take that. Anything else would go
  // round again (Oct 16: M held a moment too long stopped a recording and started a new one a
  // second later, which ran on unnoticed for four minutes).
  if (e.repeat && act.id !== 'later' && act.id !== 'earlier') return;
  updateHints({ action: act.id });
  // (Shift with a round's key goes back a step; only a letter's or a digit's, as Shift is part of typing the others)
  if (e.shiftKey && /^[a-z0-9]$/.test(k) && ROUNDS[act.id] && stepRound(act.id, -1)) return;
  const ran = act.run();
  if (ROUNDS[act.id]) Promise.resolve(ran).then(() => showRound(act.id), () => {}); // (after the camera has started, for C)
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
const prepareFrame = (t) => Promise.all([scenery.prepare(t), spaghetti.prepare(), earth.prepare(t), backrooms.prepare(t)]);
window.__nc = { glPool, clock, drawFrame, codeTick, prepareFrame, analysers: { fast, mid, slow }, get artImg() { return artImg; }, get col() { return col; }, songArt, nowPlaying, radioTitle, radioCovers, coverTheme, useFile, eng, state, view, ac, cam, takeover, y2k, punch, card, glass, orb, cuts, worlds, tracker, lens, portal, segcam, gestures, handLog, setHush, meshFace, openInStrudel, strudelProgram, strudelLink, attach, syncOffset, useDemo, useSystem, useInput, setCalm, setVisual, setBlocks, palette, paletteEntries, updateHints, bugReport, misreadReport, retainBugError, choosePreset, presetSetters, setOrb, setGlass, toggleLayout, toggleCard, showMenu, controls, playerBar, setPlayerBar, setPlayerRec, stopSource, get library() { return libraryPanel.panel; }, get librarySrc() { return librarySrc; }, loadLibrary: () => libraryPanel.ready(), playQueue, nextTrack, previousTrack, stopPlayback, setQueueRepeat, setQueueShuffle, currentSetup, saveSetupAsScene, runPreset, get queue() { return liveQueue(); } };
// (for the clock harness, tools/clock-harness.mjs, and for whatever drives a render: the layers and what a look is made of)
Object.assign(window.__nc, { setAutoScene: (n, at) => { autoScene = n; if (Number.isFinite(at)) autoSceneAt = at; }, lookWaiting, setPerfectCopy, takeBegin, takeEnd, takeState: () => ({ id: takeRec.id, tapping: !!takeRec.tap, runup: takeRec.blocks.length, making: !!takeRec.making }), VISUALS, BLOCK_LOOKS, THEMES, SPAGHETTI_KINDS, DROPS, scenery, chrome, spaghetti, spectro, warp, fire, tunnel, spiral, wheel, field, wait, storm, sceneShown, applyCard, setCrt, freshStart, setPostLook: (name) => setLook(name === 'none' ? 'off' : name, false), setGlassPlates: (on) => setGlassPlates(on, false) });
// (the looks as they are now: the ones from outside come in after the page starts)
Object.defineProperty(window.__nc, 'postLooks', { get: () => LOOKS.filter((l) => l !== 'off'), configurable: true });

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
setLook(state.look, false);
setGlassPlates(state.glassPlates, false);
const looksReady = loadLooks();
setCalm(state.calm);
setStagedTypos(state.stagedTypos);
setUpdates(state.updates);
setMirror(state.mirror);
setPlayerBar(state.playerBar);
setPlayerRec(state.playerRec);
setTimeout(() => offerUpdate(), 8000);
applyCard();
// the first time Toaster opens, a word on where to start (it's already listening to the PC)
window.nc?.onFullScreen?.((on) => document.documentElement.classList.toggle('full', !!on));
const inBrowser = !window.nc || window.nc.platform === 'web';
if (state.firstRun && !inBrowser) setTimeout(() => showNotice(`Toaster is listening to whatever your ${onMac() ? 'Mac' : 'PC'} plays and writing it as code. ? shows the keys and how it works; ${K('source')} picks another source; ${K('cam')} turns on the camera.`), 2500);
requestAnimationFrame(draw);
// (in a browser nothing's heard till a source is picked: screen capture needs a click. The menu says
// where to start itself; a box over it hid its options. On a phone or a tablet, sharing a tab's sound is
// no way in: its browser has no screen capture, or the screen is touch only. So there the menu leaves it
// out and leads with the microphone, the song played out loud near it. Asked of the browser, not guessed
// from its name)
if (inBrowser && !TAKE) {
  const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!navigator.mediaDevices?.getDisplayMedia || touchOnly) {
    document.documentElement.classList.add('mic-first');
    const device = !touchOnly ? 'computer' : Math.min(screen.width, screen.height) < 600 ? 'phone' : 'tablet';   // (600: where a tablet starts, as Android counts it)
    document.querySelectorAll('#menu .device').forEach((el) => { el.textContent = device; });
  }
  showMenu();
}

// The perfect take's render mode (take-replay.js): this page, in the render's hidden window, listening again to a take's own
// sound and drawing it a frame at a time. It started with the settings and storage it had at M (the preload put them back);
// what changed during the take goes in on its time, through the same setters as a scene of yours (applySetup).
const takeSetters = {
  ...presetSetters,
  orb: (on) => setOrb(on), glass: (on) => setGlass(on), hushed: (on) => setHush(on), crt: (on) => setCrt(on), look: (name) => setLook(name, false),
  card: (on) => { state.card = on; applyCard(); }, cardV: (on) => { state.cardV = on; applyCard(); }, cardBig: (on) => { state.cardBig = on; applyCard(); },
  drop: (i) => { state.drop = i; }, worldLook: (look) => { state.worldLook = look; worlds.setLook(look); },
  chromeCollage: (on) => { state.chromeCollage = on; }, spaghettiKind: (kind) => { state.spaghettiKind = kind; }, spectroTheme: (on) => { state.spectroTheme = on; },
};
const applySetup = (settings) => applyPreset({ name: 'take', settings }, { ...state, visual: VISUALS[state.visual], theme: THEMES[state.theme], codeHidden: state.beatHidden ? 'beat' : state.codeHidden }, takeSetters).catch(() => false);
// (the look's own pieces ready, its shaders compiled and pictures loaded: drawn again and again at one moment of the clock till
// they are, so the wait changes nothing; then a moment for a compile's last driver work and the fonts)
// (the look as it is now not ready: its shaders still compiling, its pictures not loaded; the replay asks before each frame, see take-replay.js)
function lookWaiting() {
  const mode = VISUALS[state.visual], w = { worlds, chrome, spaghetti, spectrogram: spectro, warp, scenery, earth, backrooms }[mode];
  return mode === 'scenery' ? !scenery.drawnScene || scenery.drawnScene !== sceneShown() : !!w?.waiting || !!w?.broken;
}
async function lookReady(t) {
  await document.fonts.ready;
  for (let tries = 0; ; tries++) { // (50 ms a try: two minutes at most; the frame's time limit, frameMs in main.js, is longer, as a look is waited for in a frame too)
    clock.set(t); await prepareFrame(t); drawFrame(t);
    await new Promise((r) => setTimeout(r, 50));
    if (!lookWaiting()) break;
    if (tries > 2400) throw new Error('the look never finished loading');
  }
  await new Promise((r) => setTimeout(r, 1500));
}
if (TAKE) {
  document.body.classList.add('recording'); // (as M records: the header and footer out of the picture)
  // (the layout the take was made in: the 9:16 one or the mini player, set as changeWindowMode sets it, without resizing a window)
  for (const mode of ['vertical', 'mini']) if (TAKE[mode]) { state[mode] = true; document.body.classList.add(mode); }
  applyCard();
  import('./take-replay.js')
    .then(async ({ replay }) => replay(window.__nc, await window.takeRender.take(), window.takeRender, { apply: applySetup, waitReady: lookReady }))
    .catch((err) => window.takeRender.failed(err?.message || String(err)));
}
