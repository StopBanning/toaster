// Game: the blocks' third look (P), after mewtw0o's handheld rhythm game reels: the song played on a
// little two-screen handheld of our own. The blocks' queue and clock (visuals.js) as notes falling down
// four lanes (kick, clap, hats, bass) onto their targets, each hit as it's heard: a judgement and a
// burst, the combo and the score climbing; a part that drops out under its notes misses them. Below, a
// 4 x 4 of pads: the drums across the top, the twelve notes from the song's key under them, lit as the
// bass plays them, and softer for the chord's. The handheld itself is a render of a real model of it
// (handheld/body.webp, its screens clear): the screens are drawn first and the body over them, so its glass
// lies over the live screens; its buttons go down with the drums (handheld/parts.webp: each part as it is
// pressed, laid over the body) and its light flashes with the kick. A drop is FEVER for two bars, points
// doubled. Its two screens are drawn apart from its body, so they could one day fill a small screen of their
// own (a real handheld). Its screens can be drawn in other designs (skins, gameskins.js), from a model of
// the game made each frame; 'neon' is the drawing here. Which: setGameScreens (the app's A while the game is on).
import { NOTES } from './engine.js';
import { createSkins } from './gameskins.js';
import { createScreens } from './gamescreen.js';
import { createWarp, mul3, inv3, apply3 } from './gamewarp.js';
import { createBoot, BOOT } from './gameboot.js';

// The screens' design chosen (visuals.js's GAME_SCREENS: the ones the app goes round, A).
let chosen = 'os';
export function setGameScreens(name) { chosen = name; }

const LANES = [
  { ids: ['bd'], name: 'KICK', color: [255, 77, 141] },
  { ids: ['sd'], name: 'CLAP', color: [255, 176, 46] },
  { ids: ['hhc', 'hho'], name: 'HATS', color: [62, 230, 255] },
  { ids: ['bass'], name: 'BASS', color: [156, 255, 87] },
];
const LANE = { bd: 0, sd: 1, hhc: 2, hho: 2, bass: 3 };
const LANE_OF = { kick: 0, clap: 1, hats: 2, bass: 3 }; // (the lights, by the lane they show)
const DROP_GLOW = [255, 190, 90]; // (the cartridge handheld's DROP button, lit)
const PADS = [['bd', 'KICK', 0], ['sd', 'CLAP', 1], ['hhc', 'HAT', 2], ['hho', 'OPEN', 2]]; // the drum pads: part, label, lane colour
const CHORD = [190, 140, 255]; // the chord's notes on the pads
const AHEAD = 16; // steps the top screen shows coming: a bar
const SCALE = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
const FONT = '"JetBrains Mono", Consolas, monospace';
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// The handhelds: renders of models of them (tools/handheld), about 10.24 pixels a unit, with room round each for its
// shadow (pad, units). size: its width and height (units); span: how far it reaches across (a cartridge out of its
// side); screens: where they are, from its top left corner (units); parts: where each pressed part is on parts.webp
// and where it goes: [sx, sy, sw, sh, x, y]; lights: the glow each light adds (lights.webp), by what it shows, in
// pieces; press: what goes down with the drums (ab: A on the kick, B on the clap, the cross on the hats and the bass;
// lanes: a button for each lane, and DROP on a drop); tints: a light's own colour (else its lane's); led: the power
// light; label: where the song's name is printed on its cartridge (x, y, w, h, and the width of the label's band).
// stance (the metal one seen at an angle) is the one shown; the others are kept for a while, to try (window.__gameShell).
const WHITE_PARTS = {"a": [0, 0, 165, 165, 77.9244, 149.9811], "b": [167, 0, 165, 164, 60.9354, 157.4992], "led": [334, 0, 54, 55, 9.3827, 73.726], "dl": [390, 0, 267, 267, 8.9921, 151.4457], "dr": [659, 0, 267, 267, 8.9921, 151.4457], "du": [928, 0, 267, 267, 8.9921, 151.4457], "dd": [1197, 0, 267, 267, 8.9921, 151.4457]};
const CLEAR_PARTS = {"a": [0, 0, 165, 165, 77.9244, 149.9811], "b": [167, 0, 165, 164, 60.9354, 157.4992], "led": [334, 0, 54, 55, 9.3827, 73.726], "dl": [390, 0, 267, 267, 8.9921, 151.4457], "dr": [659, 0, 267, 267, 8.9921, 151.4457], "du": [928, 0, 267, 267, 8.9921, 151.4457], "dd": [1197, 0, 267, 267, 8.9921, 151.4457]};
const METAL_PARTS = {"a": [0, 0, 177, 177, 77.3351, 149.3826], "b": [179, 0, 177, 177, 60.3483, 156.8997], "led": [358, 0, 54, 55, 9.3879, 73.723], "dl": [414, 0, 267, 268, 8.9974, 151.4327], "dr": [683, 0, 267, 268, 8.9974, 151.4327], "du": [952, 0, 267, 268, 8.9974, 151.4327], "dd": [1221, 0, 267, 268, 8.9974, 151.4327]};
const METAL_LIGHTS = {"kick": [[0, 0, 43, 121, 73.1372, 158.9499], [45, 0, 162, 164, 77.9208, 149.8707]], "clap": [[209, 0, 163, 170, 60.7388, 157.095], [374, 0, 40, 131, 77.8232, 152.7018]]};
const CART_PARTS = {"k0": [0, 0, 177, 177, 14.9525, 79.3852], "k1": [179, 0, 177, 177, 32.5251, 79.3852], "k2": [358, 0, 177, 177, 50.1953, 79.3852], "k3": [537, 0, 177, 177, 67.7678, 79.3852], "drop": [716, 0, 255, 256, 63.5699, 111.504]};
const CART_LIGHTS = {"kick": [[0, 0, 171, 165, 15.343, 80.2639]], "clap": [[173, 0, 173, 165, 32.8179, 79.5805]], "hats": [[348, 0, 173, 165, 50.3905, 79.5805]], "bass": [[523, 0, 169, 168, 67.9631, 80.0686]], "drop": [[694, 0, 105, 69, 55.0765, 89.1478], [801, 0, 237, 237, 64.4485, 112.0897], [1040, 0, 117, 56, 70.6966, 90.6121]]};
const CLEAR_LIGHTS = {"kick": [[0, 0, 147, 1681, -0.7717, 0.2047], [149, 0, 153, 1708, 85.9307, 0.1071], [304, 0, 59, 49, 88.7622, 74.6047]], "clap": [[365, 0, 247, 102, 9.1874, 71.8709]], "hats": [[614, 0, 323, 318, 63.1811, 159.7449]], "bass": [[939, 0, 415, 393, 4.2079, 145.978]]};
const TWO = { top: [10, 10, 80, 60], bottom: [10, 84, 80, 60] };
// The metal one seen from the hero picture's angle, turned to show its side and cartridge (tools/handheld/assets_stance.py):
// its picture's size; where its body is in it (without its shadow); the mappings (3 x 3, row by row) from its units on its
// face and on its label to the picture's pixels; how many pixels a unit is round its screens (mm); its light; its parts and
// lights, placed in the picture's pixels.
const STANCE = {"img": [1449, 2480], "dev": [4, 368, 986, 2254], "front": [7.0400232, 0.0783649, -1.242, -0.6453428, 9.6283697, 390.136, -0.0010233, 0.0002124, 1.0], "label": [6.9854686, 0.077762, 36.001, -0.6403435, 9.5537753, 392.0, -0.0010154, 0.0002107, 1.0], "mm": 8.7149, "led": [88.2, 1113.68], "parts": {"a": [0, 0, 159, 216, 567, 1858], "b": [161, 0, 152, 213, 434, 1907], "led": [315, 0, 41, 56, 68, 1086], "dl": [358, 0, 208, 301, 55, 1789], "dr": [568, 0, 208, 301, 55, 1789], "du": [778, 0, 208, 301, 55, 1789], "dd": [988, 0, 208, 301, 55, 1789]}, "lights": {"kick": [[0, 0, 66, 125, 512, 1949], [68, 0, 186, 199, 581, 1846]], "clap": [[256, 0, 220, 210, 447, 1883]]}};
// (the pink edition's: the same model and camera, its own glow cuts and a pixel taller)
const STANCE_PINK = {"img": [1449, 2481], "dev": [4, 368, 986, 2254], "front": [7.0400232, 0.0783649, -1.242, -0.6453428, 9.6283697, 390.136, -0.0010233, 0.0002124, 1.0], "label": [6.9854686, 0.077762, 36.001, -0.6403435, 9.5537753, 392.0, -0.0010154, 0.0002107, 1.0], "mm": 8.7149, "led": [88.2, 1113.68], "parts": {"a": [0, 0, 159, 216, 567, 1858], "b": [161, 0, 152, 213, 434, 1907], "led": [315, 0, 41, 56, 68, 1086], "dl": [358, 0, 208, 301, 55, 1789], "dr": [568, 0, 208, 301, 55, 1789], "du": [778, 0, 208, 301, 55, 1789], "dd": [988, 0, 208, 301, 55, 1789]}, "lights": {"kick": [[0, 0, 70, 127, 508, 1947], [72, 0, 130, 152, 581, 1889]], "clap": [[204, 0, 220, 195, 447, 1897]]}};
export const DEVICES = {
  white: { dir: '', size: [100, 190], pad: 12, screens: TWO, parts: WHITE_PARTS, press: 'ab', led: [12, 76.4] },
  clear: { dir: 'clear/', size: [100, 190], pad: 12, screens: TWO, parts: CLEAR_PARTS, lights: CLEAR_LIGHTS, press: 'ab', led: [12, 76.4] },
  cart: { dir: 'cart/', size: [100, 150], span: [0, 118], pad: 24, screens: { top: [10, 12.5, 80, 60] }, parts: CART_PARTS, lights: CART_LIGHTS,
    press: 'lanes', label: [100.6, 23.2, 13.2, 37.6, 2.6] },
  metal: { dir: 'metal/', size: [100, 190], span: [0, 118], pad: 24, screens: TWO, parts: METAL_PARTS, lights: METAL_LIGHTS,
    tints: { kick: [70, 120, 255], clap: [150, 200, 255] }, press: 'ab', led: [12, 76.4], label: [100.6, 21.2, 13.2, 37.6, 2.6] },
  // (its units are its picture's pixels: parts, lights and the light are placed in them)
  stance: { dir: 'stance/', stance: STANCE, size: STANCE.img, pad: 0, screens: TWO, parts: STANCE.parts, lights: STANCE.lights,
    tints: { kick: [70, 120, 255], clap: [150, 200, 255] }, press: 'ab', led: STANCE.led, label: [100.6, 21.2, 13.2, 37.6, 2.6] },
  // (the same in pink, for the pink theme: its buttons, its cartridge and the room's light on it; the same model and camera)
  stancePink: { dir: 'stance-pink/', stance: STANCE_PINK, size: STANCE_PINK.img, pad: 0, screens: TWO, parts: STANCE_PINK.parts, lights: STANCE_PINK.lights,
    tints: { kick: [255, 70, 160], clap: [255, 160, 210] }, press: 'ab', led: STANCE_PINK.led, label: [100.6, 21.2, 13.2, 37.6, 2.6],
    labelInk: ['rgba(88,8,56,0.92)', 'rgba(226,38,128,0.85)'] },
};
const image = (name) => { const im = new Image(); im.decoding = 'async'; im.src = new URL('./handheld/' + name, import.meta.url).href; return im; };
// (a handheld's pictures, loaded the first time it's shown)
const deviceOf = (name) => {
  const s = DEVICES[name] || DEVICES.stance;
  if (!s.body) {
    s.body = image(s.dir + 'body.webp'); s.sheet = image(s.dir + 'parts.webp');
    if (s.lights) s.glow = image(s.dir + 'lights.webp');
    if (s.stance) s.shade = image(s.dir + 'shadow.webp');
  }
  return s;
};
const ready = (im) => im.complete && im.naturalWidth > 0;

// Where the handheld sits on a canvas W x H, and its screens (dev.screens, units from its top left). On a wide
// screen, right of the code, as big as fits. On a tall one (a vertical video), in front of the code's lower
// lines, its shadow on them: as big as fits with its screens' lowest edge above 74.5% of the way down (where a
// phone app lays its caption over a vertical video), its top no higher than 30% (the code's first lines stay
// clear), its whole span (a cartridge sticking out too) no wider than 66%; the span's right end at 88% (clear
// of a phone app's buttons down the right edge), so the starts of the code's lines show to its left. u: a
// hundredth of its width.
export function layout(W, H, dev = DEVICES.metal, pocket = false) {
  const [sw, sh] = dev.size, span = dev.span || [0, sw], ws = span[1] - span[0];
  let u, x, y;
  if (pocket) {   // (the mini player: the handheld on its own, filling the window under its header)
    const top = H * 0.07;
    u = Math.min(W * 0.92 / ws, (H - top) * 0.94 / sh);
    x = (W - ws * u) / 2 - span[0] * u;
    y = top + (H - top - sh * u) / 2;
  } else if (W < H) {
    const low = Math.max(...Object.values(dev.screens).filter(Boolean).map((r) => r[1] + r[3]));
    u = Math.min(W * 0.66 / ws, H * (0.745 - 0.3) / low);
    x = W * 0.88 - span[1] * u;
    y = H * 0.745 - low * u;
  } else {
    u = Math.min(W * 0.34 / ws, H * 0.88 / sh);
    x = W - ws * u - Math.min(W * 0.06, ws * u * 0.25) - span[0] * u;
    y = (H - sh * u) / 2;
  }
  const at = (r) => r && { x: x + r[0] * u, y: y + r[1] * u, w: r[2] * u, h: r[3] * u };
  return { x, y, w: sw * u, h: sh * u, u, top: at(dev.screens.top), bottom: at(dev.screens.bottom) };
}

// The same for one seen at an angle (dev.stance), from where its body and its screens' lowest corner are in its picture,
// and bigger on a tall screen (seen from the side, it's narrower and hides less of the code for its size): its top no
// higher than 15% (a few of the code's first lines still show), its screens' lowest corner above 75.5% (a phone app's
// caption line), its whole width no more than 80%, its right end at 91%. x, y, and u: a pixel of its picture in the canvas's.
export function stanceLayout(W, H, dev, pocket = false) {
  const st = dev.stance, [dx0, dy0, dx1, dy1] = st.dev, ws = dx1 - dx0;
  if (st.low === undefined) {
    const r = Object.values(dev.screens).filter(Boolean).reduce((a, b) => (a[1] + a[3] > b[1] + b[3] ? a : b));
    st.low = Math.max(apply3(st.front, r[0], r[1] + r[3])[1], apply3(st.front, r[0] + r[2], r[1] + r[3])[1]);
  }
  let u, x, y;
  if (pocket) {   // (the mini player: the handheld on its own, filling the window under its header)
    const top = H * 0.07, hs = dy1 - dy0;
    u = Math.min(W * 0.92 / ws, (H - top) * 0.94 / hs);
    x = (W - ws * u) / 2 - dx0 * u;
    y = top + (H - top - hs * u) / 2 - dy0 * u;
  } else if (W < H) {
    u = Math.min(W * 0.8 / ws, H * (0.755 - 0.15) / (st.low - dy0));
    x = W * 0.91 - dx1 * u;
    y = H * 0.755 - st.low * u;
  } else {
    u = Math.min(W * 0.34 / ws, H * 0.88 / (dy1 - dy0));
    x = W - ws * u - Math.min(W * 0.06, ws * u * 0.25) - dx0 * u;
    y = (H - (dy1 - dy0) * u) / 2 - dy0 * u;
  }
  return { x, y, u, w: st.img[0] * u, h: st.img[1] * u };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + rr[0], y);
  ctx.lineTo(x + w - rr[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr[1]);
  ctx.lineTo(x + w, y + h - rr[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr[2], y + h);
  ctx.lineTo(x + rr[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr[3]);
  ctx.lineTo(x, y + rr[0]);
  ctx.quadraticCurveTo(x, y, x + rr[0], y);
  ctx.closePath();
}

// The screens as real ones (gamescreen.js), for the drawing here: dark, lit from behind, its notes glowing, a little slow.
const NEON = { black: [10, 13, 24], glow: 0.5, lag: 0.18 };

export function createGame() {
  let dropAt = -9, score = 0, combo = 0, best = 0, feverUntil = -1, hatSide = 0, lastBass = null, bassDir = 0;
  const lastHit = { bd: -9, sd: -9, hhc: -9, hho: -9, bass: -9 }; // when each part last hit
  const pops = new Array(LANES.length).fill(null); // each lane's judgement: { text, t, color }
  let bursts = []; // { lane, t, color }
  let textW = { text: '', font: '', w: 0 }; // the song line's width, measured when it changes

  const reset = () => { score = 0; combo = 0; feverUntil = -1; bursts = []; pops.fill(null); lastBass = null; };
  const skins = createSkins(), screens = createScreens();
  // its power-on (gameboot.js) each time it comes on after being off: when it started ('next': at the next frame), when
  // it was last drawn, and how far in it is (s; null when it's not booting)
  const booter = createBoot();
  let bootAt = null, lastDraw = -9, bootT = null, newSongPlaying = false;

  // The game as it is now, for the skins to draw: the notes in the lanes (d: how far up from the target,
  // in bars; len, a bass note's length; held, a bass note being played; miss; g, its step; step, the clock's
  // step now), each target's light, the
  // latest judgement, the bursts, the sixteen pads, the score, the combo and the song.
  function model(t, vg, blocks, fever, eng, title, col) {
    const notes = [];
    for (const b of blocks) {
      const lane = LANE[b.lane];
      if (lane === undefined) continue;
      const d = (b.g - vg) / AHEAD, miss = b.gMiss !== undefined;
      if (b.lane === 'bass') {
        const len = (b.len || 1) / AHEAD, held = b.gHit !== undefined && vg < b.g + (b.len || 1);
        if ((b.gHit !== undefined && !held) || d > 1.15 || d + len < -0.3) continue;
        notes.push({ lane, d, len, held, miss, bass: true, g: b.g, fade: 1 });
      } else if (b.gHit === undefined && d < 1.15 && d > -0.35) notes.push({ lane, d, len: 0, held: false, miss, bass: false, g: b.g, fade: b.late ? Math.min(1, (t - b.late) / 0.25) : 1 });
    }
    const hit = LANES.map((L) => Math.max(...L.ids.map((id) => Math.max(0, 1 - (t - lastHit[id]) / 0.16))));
    let judge = null;
    for (const p of pops) if (p && p.text && (!judge || p.t > judge.t)) judge = p;
    bursts = bursts.filter((p) => t - p.t < 0.35);
    // the pads: the drums, then the twelve notes up from the key, the bass's lit, the chord's marked
    let bass = null, bassAt = -9;
    const chord = new Set();
    for (const b of blocks) {
      if (vg < b.g || vg >= b.g + (b.len || 1)) continue;
      if (b.lane === 'bass' && b.gHit !== undefined) { bass = b.pc; bassAt = b.gHit; }
      if (b.lane === 'chords') chord.add(b.pc);
    }
    const key = eng.key, root = key ? key.root : 0, scale = key ? SCALE[key.mode] || SCALE.minor : null;
    const pads = [];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) {
      if (row === 0) { const [id, name, lane] = PADS[i]; pads.push({ label: name, drum: true, lane, lit: Math.max(0, 1 - (t - lastHit[id]) / 0.22) }); continue; }
      const pc = (root + (row - 1) * 4 + i) % 12, isBass = pc === bass;
      pads.push({ label: NOTES[pc], drum: false, inKey: !scale || scale.includes((pc - root + 12) % 12), root: !!key && pc === root, bass: isBass,
        lit: isBass ? 0.55 + 0.45 * Math.max(0, 1 - (t - bassAt) / 0.25) : 0, chord: !isBass && chord.has(pc) });
    }
    return {
      t, step: vg, fever, score, combo, bpm: eng.tempo?.bpm, title, col, notes, hit, pads,
      keyName: key ? `${NOTES[key.root]} ${key.mode.toUpperCase()}` : 'KEY ?',
      chordName: eng.lastChord ? NOTES[eng.lastChord.root] + (eng.lastChord.third === 3 ? 'm' : '') : '', bassName: bass === null ? '' : NOTES[bass],
      judge: judge && { text: judge.text, age: Math.max(0, t - judge.t - 0.12) },
      bursts: bursts.map((b) => ({ lane: b.lane, age: t - b.t })).filter((b) => b.age < 0.32),
      comboPulse: Math.max(0, 1 - (t - Math.max(...Object.values(lastHit))) / 0.1),
    };
  }

  // A note reaching its target: hit if its part is playing, else missed. A hit's judgement waits a
  // moment for the hit itself to be heard (at: the song's time it's due), then says how near it was.
  function judge(b, t, level, at) {
    const lane = LANE[b.lane];
    if (level[b.lane] > 0.5) {
      combo++;
      best = Math.max(best, combo);
      const fever = t < feverUntil;
      score += (fever ? 200 : 100) * (1 + Math.floor(combo / 10));
      pops[lane] = { text: null, t, at, id: b.lane === 'hho' || b.lane === 'hhc' ? 'hh' : b.lane, color: LANES[lane].color };
      bursts.push({ lane, t, color: LANES[lane].color });
      lastHit[b.lane] = t;
      if (b.lane === 'hhc' || b.lane === 'hho') hatSide ^= 1;
      if (b.lane === 'bass') { if (lastBass !== null && b.pc !== lastBass) bassDir = ((b.pc - lastBass + 12) % 12) < 6 ? 1 : -1; lastBass = b.pc; }
      b.gHit = t;
    } else {
      if (combo > 3) pops[lane] = { text: 'MISS', t: t - 0.12, color: [255, 90, 90] };
      combo = 0;
      b.gMiss = t;
    }
  }

  // Each light's pieces tinted with its lane's colour (a little white in it, so its middle burns white), once.
  const tinted = new Map();
  const tint = (s, lane, p) => {
    const key = s.dir + lane + p[0];
    if (!tinted.has(key)) {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = p[2]; c.height = p[3];
      x.drawImage(s.glow, p[0], p[1], p[2], p[3], 0, 0, p[2], p[3]);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = rgba(mix(s.tints?.[lane] || (LANE_OF[lane] === undefined ? DROP_GLOW : LANES[LANE_OF[lane]].color), [255, 255, 255], 0.2), 1);
      x.fillRect(0, 0, p[2], p[3]);
      x.globalCompositeOperation = 'destination-in'; // (the light's own alpha again: the fill made it all opaque)
      x.drawImage(s.glow, p[0], p[1], p[2], p[3], 0, 0, p[2], p[3]);
      tinted.set(key, c);
    }
    return tinted.get(key);
  };

  // The song on the cartridge's label (r: x, y, w, h and its band's width, units): its title as big as fits up the
  // label, the tempo and key under it; dark ink, read from the bottom up, as a spine is.
  // (ink: the title's colour and the tempo's, the device's own or the app's blue)
  const INK = ['rgba(2,11,69,0.92)', 'rgba(5,29,181,0.85)'];
  function drawLabel(ctx, L, r, info, s) {
    if (r[5] === 'across') return drawLabelAcross(ctx, L, r, info, s);
    const ink = s?.labelInk || INK;
    const u = L.u, x0 = L.x + (r[0] + r[4] + 0.7) * u, w = (r[2] - r[4] - 1.4) * u, y1 = L.y + (r[1] + r[3] - 1.4) * u, len = (r[3] - 2.8) * u;
    const title = (info.title || 'listening…').toUpperCase();
    ctx.save();
    ctx.translate(x0, y1); ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let size = w * 0.5;
    ctx.font = `800 ${size}px ${FONT}`;
    const tw = ctx.measureText(title).width;
    if (tw > len) { size *= len / tw; ctx.font = `800 ${size}px ${FONT}`; }
    ctx.fillStyle = ink[0];
    ctx.fillText(title, 0, size * 0.95);
    ctx.font = `700 ${Math.max(5, w * 0.17)}px ${FONT}`;
    ctx.fillStyle = ink[1];
    ctx.fillText([info.bpm ? `${Math.round(info.bpm)} BPM` : '', info.key].filter(Boolean).join('  ·  '), 0, size * 0.95 + w * 0.3);
    ctx.restore();
  }

  // A label lying across (r: x, y, w, h, the band's height across its top, 'across', the barcode's width at its right end): a
  // cartridge standing up out of a wide handheld's top. Its title under the band, as big as fits left of the barcode, the
  // tempo and key under that.
  function drawLabelAcross(ctx, L, r, info, s) {
    const ink = s?.labelInk || INK;
    const u = L.u, x0 = L.x + (r[0] + 1.3) * u, top = L.y + (r[1] + r[4]) * u, room = (r[2] - 2.6 - r[6]) * u, h = (r[3] - r[4]) * u;
    const title = (info.title || 'listening…').toUpperCase();
    ctx.save();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let size = h * 0.4;
    ctx.font = `800 ${size}px ${FONT}`;
    const tw = ctx.measureText(title).width;
    if (tw > room) { size *= room / tw; ctx.font = `800 ${size}px ${FONT}`; }
    const base = top + h * 0.1 + size * 0.85;
    ctx.fillStyle = ink[0];
    ctx.fillText(title, x0, base);
    ctx.font = `700 ${Math.max(5, h * 0.13)}px ${FONT}`;
    ctx.fillStyle = ink[1];
    ctx.fillText([info.bpm ? `${Math.round(info.bpm)} BPM` : '', info.key].filter(Boolean).join('  ·  '), x0, base + h * 0.26);
    ctx.restore();
  }

  // The same on one seen at an angle: drawn as square on, then laid onto its cartridge at the angle (by the map's slope at
  // the label's middle: the label's small, so the rest of its perspective is under a pixel)
  function stanceLabel(ctx, L, r, info, s) {
    const Hc = mul3([L.u, 0, L.x, 0, L.u, L.y, 0, 0, 1], s.stance.label);
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, [ox, oy] = apply3(Hc, cx, cy);
    const [ax, ay] = apply3(Hc, cx - 1, cy), [bx, by] = apply3(Hc, cx + 1, cy), [px, py] = apply3(Hc, cx, cy - 1), [qx, qy] = apply3(Hc, cx, cy + 1);
    const ex = [(bx - ax) / 2, (by - ay) / 2], ey = [(qx - px) / 2, (qy - py) / 2], S = Math.max(Math.hypot(...ex), Math.hypot(...ey));
    ctx.save();
    ctx.transform(ex[0] / S, ex[1] / S, ey[0] / S, ey[1] / S, ox - ex[0] * cx - ey[0] * cy, oy - ex[1] * cx - ey[1] * cy);
    drawLabel(ctx, { x: 0, y: 0, u: S }, r, info, s);
    ctx.restore();
  }

  // Its shadow (one seen at an angle has its own, rendered), in the theme's ink: made once a theme
  let inked = null;
  function inkShadow(s, ink) {
    const key = s.dir + ink;
    if (inked?.key !== key) {
      const c = document.createElement('canvas'); c.width = s.shade.naturalWidth; c.height = s.shade.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(s.shade, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = ink; x.fillRect(0, 0, c.width, c.height);
      inked = { key, c };
    }
    return inked.c;
  }

  // On a tall screen, where it stands in front of the code: its shadow on the code behind it, as if it were
  // held a little above it (its outline, blurred, down and right of it: the light is from the top left), in the
  // theme's ink. Made once for its size, at a quarter of the resolution.
  let shade = null;
  function shadowOf(s, w, h, ink) {
    const key = `${s.dir}:${Math.round(w)}x${Math.round(h)}:${ink}`;
    if (shade?.key !== key) {
      const q = 4, sw = Math.ceil(w / q), sh = Math.ceil(h / q), blur = sw * 0.035;
      const flat = document.createElement('canvas'); flat.width = sw; flat.height = sh;
      const f = flat.getContext('2d');
      f.drawImage(s.body, 0, 0, sw, sh);
      f.globalCompositeOperation = 'source-in'; f.fillStyle = ink; f.fillRect(0, 0, sw, sh);
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const x = c.getContext('2d'); x.filter = `blur(${blur}px)`; x.drawImage(flat, 0, 0);
      shade = { key, c };
    }
    return shade.c;
  }

  // The handheld over its screens: the body, then each part that's down (the drums' buttons as they hit;
  // the cross pressed left and right in turn on the hats, up or down as the bass climbs or falls), its lights
  // (the clear one's: each lane's lit as its part hits, fading; in a fever all of them breathing with the beat),
  // and its power light flashing with the kick.
  function drawShell(ctx, L, t, s, vg, fever, label, ink) {
    const u = L.u, BODY = s.body, SHEET = s.sheet;
    if (!ready(BODY)) return;
    const k = u * (s.size[0] + 2 * s.pad) / BODY.naturalWidth; // (the render's pixels to the canvas's)
    const bw = BODY.naturalWidth * k, bh = BODY.naturalHeight * k;
    if (ink) { ctx.globalAlpha = 0.75; ctx.drawImage(shadowOf(s, bw, bh, ink), L.x - s.pad * u + 5 * u, L.y - s.pad * u + 9 * u, bw, bh); ctx.globalAlpha = 1; }
    ctx.drawImage(BODY, L.x - s.pad * u, L.y - s.pad * u, bw, bh);
    if (s.label) (s.stance ? stanceLabel : drawLabel)(ctx, L, s.label, label, s);
    if (!ready(SHEET)) return;
    const part = (name, alpha = 1) => {
      const p = s.parts[name];
      if (!p || alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(SHEET, p[0], p[1], p[2], p[3], L.x + p[4] * u, L.y + p[5] * u, p[2] * k, p[3] * k);
      ctx.globalAlpha = 1;
    };
    if (s.lights && ready(s.glow)) {
      const fade = (id, d) => Math.max(0, 1 - (t - lastHit[id]) / d) ** 1.5;
      const breath = fever * (0.3 + 0.25 * Math.cos(Math.PI * vg / 2)); // (a beat is four steps)
      const on = { kick: fade('bd', 0.3), clap: fade('sd', 0.32), hats: Math.max(fade('hhc', 0.16), fade('hho', 0.3)), bass: fade('bass', 0.5),
        drop: Math.max(fever * (0.55 + 0.45 * Math.cos(Math.PI * vg / 2)), Math.max(0, 1 - (t - dropAt) / 0.5)) };
      for (const lane in s.lights) {
        const a = Math.min(1, Math.max(on[lane], breath));
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        // (its colour through the frosted guide, then its glow over that)
        for (const op of ['multiply', 'lighter']) {
          ctx.globalCompositeOperation = op;
          for (const p of s.lights[lane]) ctx.drawImage(tint(s, lane, p), L.x + p[4] * u, L.y + p[5] * u, p[2] * k, p[3] * k);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    const down = (id) => t - lastHit[id] < 0.09;
    if (bootT !== null && bootT >= BOOT.start && bootT < BOOT.start + 0.12) part(s.press === 'lanes' ? 'k0' : 'a'); // (START, pressed)
    if (s.press === 'lanes') {
      if (down('bd')) part('k0');
      if (down('sd')) part('k1');
      if (down('hhc') || down('hho')) part('k2');
      if (down('bass')) part('k3');
      if (t - dropAt < 0.16) part('drop');
    } else {
      if (down('bd')) part('a');
      if (down('sd')) part('b');
      if (down('bass') && bassDir) part(bassDir > 0 ? 'du' : 'dd');
      else if (down('hhc') || down('hho')) part(hatSide ? 'dr' : 'dl');
    }
    // the light: lit with the kick, fading, and its glow on the glass round it
    const lit = !s.led ? 0 : bootT !== null ? (bootT < BOOT.light ? 0 : 0.9) : Math.max(0, 1 - (t - lastHit.bd) / 0.18); // (on, steady, as it boots)
    const LED = s.led;
    if (lit > 0.02) {
      part('led', lit);
      const x = L.x + LED[0] * u, y = L.y + LED[1] * u, R = 4 * u * (s.stance ? s.stance.mm : 1), gr = ctx.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, `rgba(255,60,70,${0.4 * lit})`); gr.addColorStop(1, 'rgba(255,60,70,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
  }

  // The handheld seen at an angle (its stance): its shadow on the code, in the theme's ink; its screens drawn flat, square
  // on, about as big as they're shown, then laid into its windows at the angle (gamewarp.js), their pixels laid on there;
  // the body over them, its label, lights and parts; the screens' glow on the glass round them, laid in at the angle too.
  const warp = createWarp();
  // (where on its face its screens and their glow are, units: round them, 4 more each side)
  const faceOf = (dev) => dev.face || (dev.face = (() => {
    const rs = Object.values(dev.screens).filter(Boolean), x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1]));
    return [x0 - 4, y0 - 4, Math.max(...rs.map((r) => r[0] + r[2])) - x0 + 8, Math.max(...rs.map((r) => r[1] + r[3])) - y0 + 8];
  })());
  let flat = null, glass = null;
  const sized = (c, w, h) => { c = c || document.createElement('canvas'); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };
  function drawStance(ctx, W, H, dev, t, vg, fever, screensOn, fx, info, ink, pocket) {
    if (!ready(dev.body)) return;
    const st = dev.stance, L = stanceLayout(W, H, dev, pocket);
    if (ink && ready(dev.shade)) { ctx.globalAlpha = 0.8; ctx.drawImage(inkShadow(dev, ink), L.x, L.y, L.w, L.h); ctx.globalAlpha = 1; }
    const Hc = mul3([L.u, 0, L.x, 0, L.u, L.y, 0, 0, 1], st.front); // (its face's units to the canvas)
    const half = (x0, y0, x1, y1) => { const a = apply3(Hc, x0, y0), b = apply3(Hc, x1, y1); return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2; };
    const F = faceOf(dev), my = F[1] + F[3] / 2, xl = F[0] + 1, xr = F[0] + F[2] - 1;
    // (the flat screens' pixels a unit: as many as its nearer side shows)
    const uf = Math.max(1, ...[xl, xr].flatMap((x) => [half(x - 1, my, x + 1, my), half(x, my - 1, x, my + 1)]));
    const fw = Math.ceil(F[2] * uf), fh = Math.ceil(F[3] * uf);
    const at = (r) => r && { x: (r[0] - F[0]) * uf, y: (r[1] - F[1]) * uf, w: r[2] * uf, h: r[3] * uf };
    const Lf = { top: at(dev.screens.top), bottom: at(dev.screens.bottom) };
    flat = sized(flat, fw, fh);
    const f = flat.getContext('2d');
    f.clearRect(0, 0, fw, fh);
    const lk = screensOn(f, Lf, uf, false);
    // (M: a canvas pixel to the flat one it shows)
    const M = mul3([uf, 0, -F[0] * uf, 0, uf, -F[1] * uf, 0, 0, 1], inv3(Hc));
    const quad = (r) => [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]].map(([x, y]) => apply3(Hc, x, y));
    const face = quad(F), bx = face.map((p) => p[0]), by = face.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...bx))), y0 = Math.max(0, Math.floor(Math.min(...by)));
    const box = [x0, y0, Math.min(W, Math.ceil(Math.max(...bx))) - x0, Math.min(H, Math.ceil(Math.max(...by))) - y0];
    const lay = (src, op) => warp.draw(ctx, src, M, box, op) || affine(ctx, src, face, op, F[2] * uf, F[3] * uf);
    lay(flat, 'source-over');
    // their pixels, laid on at the canvas's own (resampled at the angle, a fine grid would beat into stripes)
    if (fx) for (const which of ['top', 'bottom']) {
      const r = dev.screens[which];
      if (!r || !lk[which]) continue;
      const q = quad(r), qx = q.map((p) => p[0]), qy = q.map((p) => p[1]), gx = Math.floor(Math.min(...qx)), gy = Math.floor(Math.min(...qy));
      ctx.save();
      ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
      screens.grid(ctx, which, lk[which], gx, gy, Math.ceil(Math.max(...qx)) - gx, Math.ceil(Math.max(...qy)) - gy, lk[which].dot || Math.max(3, Math.round(r[2] * uf / 190)));
      ctx.restore();
    }
    drawShell(ctx, L, t, dev, vg, fever, info, false);
    if (fx && (lk.top?.glow || lk.bottom?.glow)) {
      glass = sized(glass, fw, fh);
      const g = glass.getContext('2d');
      g.clearRect(0, 0, fw, fh);
      for (const which of ['top', 'bottom']) if (Lf[which]) screens.spill(g, Lf[which], which, lk[which], 4 * uf);
      lay(glass, 'screen');
    }
  }
  // (with no WebGL: the flat picture laid in as near as a 2D canvas can, by three of its corners; w, h: its size in it)
  function affine(ctx, src, face, op, w, h) {
    const [p0, p1, , p3] = face;
    ctx.save();
    ctx.globalCompositeOperation = op;
    ctx.transform((p1[0] - p0[0]) / w, (p1[1] - p0[1]) / w, (p3[0] - p0[0]) / h, (p3[1] - p0[1]) / h, p0[0], p0[1]);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    return true;
  }

  // The top screen: the lanes, their notes coming down onto the targets, the score, the combo.
  function drawTop(ctx, r, s) {
    const { blocks, vg, t, level, u, fever, bpm } = s;
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 1.2 * u);
    ctx.clip();
    // the screen: dark, a little of the theme in it; in a fever, the lanes' colours wash up it
    let gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    gr.addColorStop(0, '#0b0f1c'); gr.addColorStop(1, '#05070d');
    ctx.fillStyle = gr;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (fever > 0) {
      const beat = 0.5 + 0.5 * Math.cos(t * 12);
      gr = ctx.createLinearGradient(0, r.y + r.h, 0, r.y);
      gr.addColorStop(0, rgba([255, 60, 160], 0.35 * fever * (0.6 + 0.4 * beat)));
      gr.addColorStop(1, rgba([120, 60, 255], 0));
      ctx.fillStyle = gr;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    const hud = r.h * 0.14, padX = r.w * 0.06, laneW = (r.w - 2 * padX) / LANES.length;
    const targetY = r.y + r.h * 0.83, topY = r.y + hud, stepH = (targetY - topY) / AHEAD;
    const laneX = (i) => r.x + padX + i * laneW;
    // the lanes: faint guides, and each target, bright as it hits
    for (let i = 0; i < LANES.length; i++) {
      const c = LANES[i].color, x = laneX(i);
      ctx.fillStyle = rgba(c, 0.05 + 0.04 * level[LANES[i].ids[0]]);
      ctx.fillRect(x + laneW * 0.08, topY, laneW * 0.84, targetY - topY + stepH);
      const hit = Math.max(...LANES[i].ids.map((id) => Math.max(0, 1 - (t - lastHit[id]) / 0.16)));
      roundRect(ctx, x + laneW * 0.12, targetY - stepH * 0.45, laneW * 0.76, stepH * 0.9, stepH * 0.3);
      ctx.lineWidth = Math.max(1, 0.45 * u);
      ctx.strokeStyle = rgba(c, 0.45 + 0.55 * hit);
      ctx.stroke();
      if (hit > 0) { ctx.fillStyle = rgba(c, 0.35 * hit); ctx.fill(); }
      ctx.font = `700 ${Math.max(7, 2.1 * u)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(c, 0.6);
      ctx.fillText(LANES[i].name, x + laneW / 2, targetY + stepH * 1.3);
    }
    // the notes: a pill for a drum, a bar as long as it's held for the bass; past their target, gone
    // if hit, falling on, red and faint, if missed. They come in under the score, out of the dark.
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, topY - stepH * 0.5, r.w, r.h); ctx.clip();
    for (const b of blocks) {
      const i = LANE[b.lane];
      if (i === undefined) continue;
      const dy = (b.g - vg) * stepH, y = targetY - dy;
      const c = LANES[i].color, x = laneX(i) + laneW * 0.18, w = laneW * 0.64;
      if (b.lane === 'bass') {
        const top = y - (b.len || 1) * stepH;
        if (top > targetY + stepH * 3 || y < topY - stepH) continue;
        const held = b.gHit !== undefined && vg < b.g + b.len;
        const yb = held ? targetY : y; // (held: the bar's eaten from the bottom at the target)
        if (b.gHit !== undefined && !held) continue;
        const a = b.gMiss !== undefined ? 0.25 : 0.95;
        roundRect(ctx, x + w * 0.2, Math.max(topY - stepH, top), w * 0.6, Math.max(2, yb - Math.max(topY - stepH, top)), w * 0.18);
        ctx.fillStyle = rgba(b.gMiss !== undefined ? [255, 90, 90] : c, a * 0.55);
        ctx.fill();
        roundRect(ctx, x, yb - stepH * 0.5, w, stepH * 0.6, stepH * 0.25);
        ctx.fillStyle = rgba(b.gMiss !== undefined ? [255, 90, 90] : c, a);
        ctx.fill();
        continue;
      }
      if (b.gHit !== undefined) continue;
      if (y < topY - stepH || y > r.y + r.h + stepH) continue;
      ctx.globalAlpha = b.late ? Math.min(1, (t - b.late) / 0.25) : 1;
      const missed = b.gMiss !== undefined;
      const h = Math.max(3, stepH * 0.62);
      roundRect(ctx, x, y - h / 2, w, h, h * 0.4);
      ctx.fillStyle = rgba(missed ? [255, 90, 90] : c, missed ? 0.3 : 0.95);
      ctx.fill();
      if (!missed) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, x + w * 0.08, y - h / 2 + h * 0.15, w * 0.84, h * 0.22, h * 0.1); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    gr = ctx.createLinearGradient(0, topY - stepH * 0.5, 0, topY + stepH * 2.5);
    gr.addColorStop(0, 'rgba(11,15,28,1)'); gr.addColorStop(1, 'rgba(11,15,28,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(r.x, topY - stepH * 0.5, r.w, stepH * 3);
    ctx.restore();
    // the bursts: a ring opening from the target, with sparks
    bursts = bursts.filter((p) => t - p.t < 0.35);
    for (const p of bursts) {
      const k = (t - p.t) / 0.35, x = laneX(p.lane) + laneW / 2;
      ctx.strokeStyle = rgba(p.color, 1 - k);
      ctx.lineWidth = Math.max(1, (1 - k) * 1.2 * u);
      ctx.beginPath(); ctx.ellipse(x, targetY, laneW * (0.35 + 0.4 * k), stepH * (0.5 + 1.2 * k), 0, 0, 7); ctx.stroke();
      ctx.fillStyle = rgba(mix(p.color, [255, 255, 255], 0.5), 1 - k);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + p.t * 7, d = laneW * (0.2 + 0.55 * k);
        ctx.fillRect(x + Math.cos(a) * d - 0.4 * u, targetY + Math.sin(a) * d * 0.6 - 0.4 * u, 0.8 * u, 0.8 * u);
      }
    }
    // the judgements, rising off the targets
    ctx.lineJoin = 'round';
    for (let i = 0; i < LANES.length; i++) {
      const p = pops[i];
      if (!p || !p.text || t - p.t > 0.62) continue;
      const k = Math.max(0, (t - p.t - 0.12) / 0.5), y = targetY - stepH * (1.6 + 2.2 * k);
      ctx.font = `800 ${Math.max(7, 2.6 * u)}px ${FONT}`;
      ctx.lineWidth = Math.max(2, 0.9 * u);
      ctx.strokeStyle = `rgba(5,7,13,${0.85 * (1 - k * k)})`;
      ctx.strokeText(p.text, laneX(i) + laneW / 2, y);
      ctx.fillStyle = rgba(p.color, 1 - k * k);
      ctx.fillText(p.text, laneX(i) + laneW / 2, y);
    }
    // the score, the tempo and the combo
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(7, 2.2 * u)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.fillText('SCORE', r.x + padX, r.y + hud * 0.34);
    ctx.font = `800 ${Math.max(9, 3.6 * u)}px ${FONT}`;
    ctx.fillStyle = '#f2f6ff';
    ctx.fillText(String(score).padStart(7, '0'), r.x + padX, r.y + hud * 0.72);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.max(7, 2.2 * u)}px ${FONT}`;
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.fillText(fever > 0 ? 'FEVER x2' : 'BPM', r.x + r.w - padX, r.y + hud * 0.34);
    ctx.font = `800 ${Math.max(9, 3.6 * u)}px ${FONT}`;
    ctx.fillStyle = fever > 0 ? (Math.floor(t * 8) % 2 ? '#ff5fb0' : '#ffd84a') : '#f2f6ff';
    ctx.fillText(bpm ? String(Math.round(bpm)) : '---', r.x + r.w - padX, r.y + hud * 0.72);
    if (combo >= 2) {
      const pulse = Math.max(0, 1 - (t - Math.max(...Object.values(lastHit))) / 0.12);
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.max(10, (5.4 + 0.8 * pulse) * u)}px ${FONT}`;
      ctx.fillStyle = `rgba(255,255,255,${0.75 + 0.25 * pulse})`;
      ctx.fillText(String(combo), r.x + r.w / 2, r.y + hud * 0.55);
      ctx.font = `700 ${Math.max(6, 1.8 * u)}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('COMBO', r.x + r.w / 2, r.y + hud * 1.05);
    }
    ctx.restore();
  }

  // The bottom screen: the pads (the drums, then the twelve notes up from the key), and the song.
  function drawBottom(ctx, r, s) {
    const { blocks, vg, t, u, key, title, bpm } = s;
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 1.2 * u);
    ctx.clip();
    ctx.fillStyle = '#070a12';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    // what's sounding now: the bass's note, the chord's
    let bass = null, bassAt = -9;
    const chord = new Set();
    for (const b of blocks) {
      if (vg < b.g || vg >= b.g + (b.len || 1)) continue;
      if (b.lane === 'bass' && b.gHit !== undefined) { bass = b.pc; bassAt = b.gHit; }
      if (b.lane === 'chords') chord.add(b.pc);
    }
    const root = key ? key.root : 0, scale = key ? SCALE[key.mode] || SCALE.minor : null;
    const foot = r.h * 0.15, gap = r.w * 0.025, pw = (r.w - 5 * gap) / 4, ph = (r.h - foot - 5 * gap) / 4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = r.x + gap + col * (pw + gap), y = r.y + gap + row * (ph + gap);
      let c, lit = 0, label, inKey = true, isRoot = false;
      if (row === 0) {
        const [id, name, lane] = PADS[col];
        c = LANES[lane].color; label = name;
        lit = Math.max(0, 1 - (t - lastHit[id]) / 0.22);
      } else {
        const pc = (root + (row - 1) * 4 + col) % 12;
        label = NOTES[pc];
        inKey = !scale || scale.includes((pc - root + 12) % 12);
        isRoot = key && pc === root;
        if (pc === bass) { c = LANES[3].color; lit = 0.55 + 0.45 * Math.max(0, 1 - (t - bassAt) / 0.25); }
        else if (chord.has(pc)) { c = CHORD; lit = 0.45; }
        else c = [150, 170, 210];
      }
      roundRect(ctx, x, y, pw, ph, Math.min(pw, ph) * 0.16);
      ctx.fillStyle = lit > 0 ? rgba(mix([18, 22, 34], c, 0.25 + 0.6 * lit), 1) : rgba([18, 22, 34], inKey ? 1 : 0.6);
      ctx.fill();
      if (lit > 0.3) { // (a glow round it: a softer pad a little bigger, under a second fill: no blur, which costs)
        roundRect(ctx, x - 0.8 * u, y - 0.8 * u, pw + 1.6 * u, ph + 1.6 * u, Math.min(pw, ph) * 0.2);
        ctx.fillStyle = rgba(c, 0.22 * lit); ctx.fill();
        roundRect(ctx, x, y, pw, ph, Math.min(pw, ph) * 0.16);
        ctx.fillStyle = rgba(mix([18, 22, 34], c, 0.25 + 0.6 * lit), 1); ctx.fill();
      }
      ctx.lineWidth = Math.max(1, 0.35 * u);
      ctx.strokeStyle = rgba(row === 0 ? c : inKey ? [150, 170, 210] : [90, 100, 130], row === 0 ? 0.5 : inKey ? 0.4 : 0.2);
      ctx.stroke();
      ctx.font = `800 ${Math.max(7, Math.min(ph * 0.3, 2.8 * u))}px ${FONT}`;
      ctx.fillStyle = lit > 0.3 ? '#0a0d18' : rgba(row === 0 ? c : [200, 215, 245], row === 0 ? 0.85 : inKey ? 0.8 : 0.35);
      ctx.fillText(label, x + pw / 2, y + ph / 2);
      if (isRoot) { ctx.fillStyle = lit > 0.3 ? '#0a0d18' : 'rgba(200,215,245,0.7)'; ctx.beginPath(); ctx.arc(x + pw * 0.86, y + ph * 0.2, Math.max(1.2, 0.6 * u), 0, 7); ctx.fill(); }
    }
    // the song along the foot, sliding by when it's too long to fit
    const fy = r.y + r.h - foot / 2;
    ctx.font = `700 ${Math.max(7, 2.2 * u)}px ${FONT}`;
    const keyName = key ? `${NOTES[key.root]} ${key.mode.toUpperCase()}` : 'KEY ?';
    const text = `♪ ${(title || 'listening…').toUpperCase()} · ${bpm ? Math.round(bpm) + ' BPM' : '--- BPM'} · ${keyName}`;
    if (textW.text !== text || textW.font !== ctx.font) textW = { text, font: ctx.font, w: ctx.measureText(text).width };
    const tw = textW.w, room = r.w - 2 * gap;
    ctx.fillStyle = 'rgba(200,220,255,0.7)';
    ctx.textAlign = 'left';
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x + gap, fy - foot / 2, room, foot); ctx.clip();
    if (tw <= room) ctx.fillText(text, r.x + gap + (room - tw) / 2, fy);
    else {
      const off = ((t * 30 * u) / 10) % (tw + 12 * u);
      ctx.fillText(text, r.x + gap - off, fy);
      ctx.fillText(text, r.x + gap - off + tw + 12 * u, fy);
    }
    ctx.restore();
    ctx.restore();
  }

  return {
    reset,
    // Off, even for a moment: the next entry starts a fresh power-on, not the previous one's clock.
    release() { reset(); bootAt = null; lastDraw = -9; newSongPlaying = false; },
    // A new song while it stays on: the engine's new beat is not another power-on.
    newSong(playing) { newSongPlaying = playing; },
    // its power-on, from the next frame (it boots by itself each time it comes on after being off)
    boot() { bootAt = 'next'; },
    // a drop: FEVER for two bars
    drop(t, P) { feverUntil = t + 8 * (P || 0.5); dropAt = t; },
    // blocks and vg: the queue and the clock (in steps); W, H: the canvas; col: the theme's colours;
    // level: how much each part is playing (0..1); t: now (s); eng: the engine (its hits, tempo and
    // key); title: the song's; offset: how far ahead the blocks are drawn (s), so a note's crossing is
    // matched with its hit
    draw(ctx, { blocks, vg, W, H, col, level, t, eng, title, offset = 0, pocket = false, colorway = 'blue' }) {
      // (colorway: the theme's, pink for the pink one; window.__gameShell, a switch to try the others: metal, white, clear, cart)
      const dev = deviceOf(window.__gameShell || (colorway === 'pink' ? 'stancePink' : 'stance'));
      for (const b of blocks) if (LANE[b.lane] !== undefined && b.gHit === undefined && b.gMiss === undefined && vg >= b.g) {
        // (a note made already past its target, starting up: played already, not judged)
        if (vg - b.g > 1) b.gHit = -1;
        else judge(b, t, level, t + offset);
      }
      // the judgements still waiting: the hit heard nearest the note's time
      for (const p of pops) {
        if (!p || p.text || t - p.t < 0.12) continue;
        let near = 9;
        for (let i = eng.onsets.length - 1; i >= 0 && i > eng.onsets.length - 48; i--) {
          const o = eng.onsets[i];
          if (o.id === p.id) near = Math.min(near, Math.abs(o.t - p.at));
        }
        p.text = near < 0.06 ? 'PERFECT' : near < 0.13 ? 'GREAT' : 'GOOD';
      }
      // on after being off, it boots (window.__gameBoot = false, a switch for tests, skips it)
      if (bootAt === 'next' || (!newSongPlaying && t - lastDraw > 0.5 && window.__gameBoot !== false)) bootAt = t;
      newSongPlaying = false;
      lastDraw = t;
      bootT = bootAt === null ? null : t - bootAt;
      if (bootT !== null && bootT >= BOOT.end) bootAt = bootT = null;
      if (bootT !== null && bootT < BOOT.tear) { score = 0; combo = 0; pops.fill(null); bursts = []; } // (the game starts afresh as it tears in)
      ctx.clearRect(0, 0, W, H);
      const fever = t < feverUntil ? Math.min(1, (feverUntil - t) / 0.4) : 0;
      const skin = skins[window.__gameSkin || chosen]; // (a switch, to try one the app doesn't go round: dance)
      const m = skin && model(t, vg, blocks, fever, eng, title, col);
      const look = (at) => { const k = { ...(skin ? skin.screen : NEON), ...at }; if (k.glow) k.glow *= 1 + 0.6 * fever; return k; };
      const fx = window.__screenFx !== false; // (a mock-up switch, for side by sides)
      const keyName = eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode.toUpperCase()}` : '';
      // (the boot's self-test: a part is OK when the game has its notes coming, or just gone by, in its lane)
      const lanesIn = new Set();
      if (bootT !== null) for (const b of blocks) if (LANE[b.lane] !== undefined && b.g >= vg - AHEAD) lanesIn.add(LANE[b.lane]);
      const info = { title, bpm: eng.tempo?.bpm, key: keyName, parts: { kick: lanesIn.has(0), clap: lanesIn.has(1), hats: lanesIn.has(2), bass: lanesIn.has(3) } }, ink = W < H && rgba(col.ink || [0, 0, 0], 1);
      // each screen (a little dark round it, under the edges of the body's windows), then over it what makes it a real
      // one (its glow brighter in a fever; its pixels left for later when it's to be laid in at an angle); u: a unit
      const screensOn = (c, L, u, dots) => {
        c.fillStyle = '#05070d';
        for (const r of [L.top, L.bottom]) if (r) c.fillRect(r.x - u, r.y - u, r.w + 2 * u, r.h + 2 * u);
        const s = { blocks, vg, t, level, u, fever, bpm: eng.tempo?.bpm, key: eng.key, title }, out = {};
        for (const which of ['top', 'bottom']) {
          const r = L[which];
          if (!r) continue;
          const own = () => look(skin ? skin[which](c, r, m) : (which === 'top' ? drawTop : drawBottom)(c, r, s));
          out[which] = bootT === null ? own() : booter.draw(c, r, which, bootT, window.__gameSkin || chosen, col, info, own, look({}));
          if (fx) screens.over(c, r, which, dots ? out[which] : { ...out[which], dots: 0 });
        }
        return out;
      };
      if (dev.stance) return drawStance(ctx, W, H, dev, t, vg, fever, screensOn, fx, info, ink, pocket);
      // the screens; the body over them; their glow on the glass round them
      const L = layout(W, H, dev, pocket);
      const lk = screensOn(ctx, L, L.u, true);
      drawShell(ctx, L, t, dev, vg, fever, info, ink);
      if (fx) for (const which of ['top', 'bottom']) if (L[which]) screens.spill(ctx, L[which], which, lk[which], 4 * L.u);
    },
  };
}
