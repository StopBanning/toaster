// Fire: the old Doom fire (the PlayStation port's, as Fabien Sanglard wrote it up), lit by the
// song. A grid of square pixels, each a heat from 0 to 36 drawn in the fire's 37 colours: every tick
// each pixel's heat moves up a row, a step to the side (more often to the left, as the original
// drifts), losing a bit on the way, so flames climb, waver and burn out. The bottom row burns
// steady, as the original's does, only gently shaped by the spectrum (the bass in the middle, the
// highs out at the sides); the song sets how high the flames reach, and the kick lifts them,
// eased in and out, not a jolt. Now and then a hat spits a spark. Switched on, and on each drop,
// the fire flares: the flames leap to twice their height and die back over a few seconds.
// (After not.axel's ask on Threads: Doom fire with the "pixels" tied to the sound.)
import { bands } from './visuals.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// The fire's colours, black through red and orange to yellow and white (Doom's).
const PALETTE = [
  0x070707, 0x1f0707, 0x2f0f07, 0x470f07, 0x571707, 0x671f07, 0x771f07, 0x8f2707, 0x9f2f07,
  0xaf3f07, 0xbf4707, 0xc74707, 0xdf4f07, 0xdf5707, 0xdf5707, 0xd75f07, 0xd75f07, 0xd7670f,
  0xcf6f0f, 0xcf770f, 0xcf7f0f, 0xcf8717, 0xc78717, 0xc78f17, 0xc7971f, 0xbf9f1f, 0xbf9f1f,
  0xbfa727, 0xbfa727, 0xbfaf2f, 0xb7af2f, 0xb7b72f, 0xb7b737, 0xcfcf6f, 0xdfdf9f, 0xefefc7, 0xffffff,
];
const TOP = PALETTE.length - 1; // 36, the hottest
// A colour as one 32-bit pixel (little-endian: ABGR).
const abgr = (c, a = 255) => ((a << 24) | ((c & 0xff) << 16) | (c & 0xff00) | (c >> 16)) >>> 0;
// Each heat's pixel, the coolest few fading out so the background shows where the fire isn't.
const PIXEL = new Uint32Array(PALETTE.map((c, i) => abgr(c, i === 0 ? 0 : Math.round(255 * Math.min(1, i / 4)))));

const CELL = 4; // a pixel of fire, in CSS pixels
const TICK = 1 / 60; // the fire moves at 60 steps a second, whatever the frame rate
const BANDS = 24; // the spectrum along the bottom, mirrored: 24 bands each way from the middle
// The steps' dice: each one's low two bits the sideways step, 0..3 as Math.round(random * 3) gives
// them (1 and 2 twice as often as 0 and 3), the eight above them a roll for cooling (out of 256).
const DICE_MASK = (1 << 16) - 1;
const DICE = Uint16Array.from({ length: DICE_MASK + 1 }, () => (Math.round(Math.random() * 3) & 3) | (((Math.random() * 256) | 0) << 2));
const FLARE = 1.5; // a flare dies back over about this many seconds

export function createFire(canvas) {
  const ctx = canvas.getContext('2d');
  const grid = document.createElement('canvas'), gctx = grid.getContext('2d');
  let cols = 0, rows = 0, heat = null, img = null, px = null;
  let top = 0, drawnTop = 0; // the highest row with any heat in it, now and as last drawn
  let last = 0, acc = 0, kickLift = 0, lift = 0, flare = 0, seen = 0, shown = false;
  const spec = new Float32Array(BANDS), smooth = new Float32Array(BANDS);

  // The grid sized to the window, a cell every CELL pixels (made again when the window changes).
  const size = () => {
    const c = Math.ceil(innerWidth / CELL), r = Math.ceil(innerHeight / CELL);
    if (heat && c === cols && r === rows) return;
    cols = c; rows = r;
    heat = new Uint8Array(cols * rows);
    grid.width = cols; grid.height = rows;
    img = gctx.createImageData(cols, rows);
    px = new Uint32Array(img.data.buffer);
    top = drawnTop = 0; // (stepped and drawn whole the first time)
  };

  // One step, the original's: every pixel takes the heat of the one below it, from up to a column
  // to the right or two to the left (0..3 rounded, so straight and one left most often), cooled by
  // 1 with chance `cool` (how often sets how high the flames reach, about 36 / cool rows). Only from
  // just above the flames' top down (the rows over it are cold, and stay so), and its dice from a
  // table read from a new place each step (Math.random twice a pixel was most of its cost).
  const step = (feed, cool) => {
    const base = (rows - 1) * cols, c8 = Math.round(cool * 256);
    for (let x = 0; x < cols; x++) heat[base + x] = feed[x];
    let k = (Math.random() * DICE.length) | 0, hot = rows - 1;
    for (let y = Math.max(1, top - 1); y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const src = y * cols + x, h = heat[src];
        if (!h) { heat[src - cols] = 0; continue; }
        const d = DICE[k], dst = src - cols - (d & 3) + 1;
        k = (k + 1) & DICE_MASK;
        if (dst >= 0) { const v = (d >> 2) < c8 ? h - 1 : h; heat[dst] = v; if (v && y - 1 < hot) hot = y - 1; }
      }
    }
    top = hot;
  };

  const feed = new Uint8Array(4096);
  return {
    // the kick lifts the flames (softer with fewer flashes on): the lift eases in and back out
    kick(s, calm) { kickLift = Math.max(kickLift, (calm ? 0.5 : 1) * (0.6 + 0.4 * s)); },
    // a drop: the fire flares
    drop() { flare = 1; kickLift = Math.max(kickLift, 1); },
    clear() { canvas.width = canvas.height = 0; cols = rows = 0; heat = null; shown = false; },
    draw(t, eng, col) {
      if (!innerWidth || !innerHeight) return; // (a window with no size yet: nothing to burn)
      size();
      const W = Math.round(innerWidth * 0.75), H = Math.round(innerHeight * 0.75);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      if (!shown) { shown = true; flare = 1; } // switched on: it flares up from nothing
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      flare *= Math.exp(-dt / FLARE);
      // the kick's lift: quick up (~60 ms), slow down (~400 ms)
      kickLift *= Math.exp(-dt * 2.5);
      lift += (kickLift - lift) * (1 - Math.exp(-dt / (kickLift > lift ? 0.06 : 0.4)));
      const loud = clamp((eng.level || 0) * 6, 0, 1);

      // now and then a hat spits a spark, low down in the flames
      for (const o of eng.onsets) {
        if (o.t <= seen) continue;
        if (o.id === 'hh' && Math.random() < 0.35) {
          const x = (Math.random() * cols) | 0, y = rows - 2 - ((Math.random() * rows * 0.15) | 0);
          heat[y * cols + x] = TOP;
          top = Math.min(top, y); // (stepped from there on)
        }
      }
      if (eng.onsets.length) seen = Math.max(seen, eng.onsets[eng.onsets.length - 1].t);

      // the bottom row: near full heat all along, as the original's, a little lower where the
      // spectrum is quiet (smoothed over ~150 ms and across neighbouring bands, so it breathes
      // rather than flickers)
      if (eng.fastDb) bands(eng, spec);
      else spec.fill(0);
      const a = 1 - Math.exp(-dt / 0.15);
      for (let i = 0; i < BANDS; i++) {
        const v = (spec[Math.max(0, i - 1)] + 2 * spec[i] + spec[Math.min(BANDS - 1, i + 1)]) / 4;
        smooth[i] += (v - smooth[i]) * a;
      }
      const mid = (cols - 1) / 2;
      for (let x = 0; x < cols; x++) {
        const f = Math.abs(x - mid) / mid * (BANDS - 1), i = Math.floor(f), k = f - i;
        const v = smooth[i] * (1 - k) + smooth[Math.min(BANDS - 1, i + 1)] * k;
        feed[x] = Math.round(TOP * clamp(0.72 + 0.28 * v, 0, 1));
      }
      // how high it burns: a tenth of the window when quiet, about a fifth with the song loud,
      // a little more on the kick, so the code above stays readable; on a flare, up to twice that
      const reach = (0.1 + 0.1 * loud + 0.06 * lift) * (1 + flare);
      const cool = clamp(TOP / (rows * reach), 0.05, 1);

      acc = Math.min(acc + dt, TICK * 3);
      while (acc >= TICK) { step(feed, cool); acc -= TICK; }

      // (the pixels from the flames' top down: over it they're clear, and stay so; the rows the fire
      // has just left drawn once more, cleared)
      const from = Math.max(0, Math.min(top, drawnTop) - 1);
      drawnTop = top;
      for (let i = from * cols; i < heat.length; i++) px[i] = PIXEL[heat[i]];
      gctx.putImageData(img, 0, 0, 0, from, cols, rows - from);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false; // the pixels stay square and sharp
      ctx.drawImage(grid, 0, 0, (cols * CELL * W) / innerWidth, (rows * CELL * H) / innerHeight);
    },
  };
}
