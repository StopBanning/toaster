// The glass blob follows your hands (G2 of backlog/glass-ball/DESIGN.md). From the tracker's hands each frame this answers where the blob's middle drop
// should be, how big it is, whether the hands were just thrown open, and how much the hands are in charge at all (`w`: 0 = the blob drifts as it always
// has, 1 = it is where the hands put it). No page in here: the hands, the camera-to-screen mapping and the time go in, numbers come out, so it is tested in
// node on made-up hands and on replays of real hand logs. glass.js does the drawing.
//
//   two hands   the middle drop at the middle of the two palms, sized by their distance
//   one hand    on that palm, sized by the hand (wrist to middle knuckle)
//   a hand missing under 0.25 s: its last place is used; longer: the blob goes to the other palm over a moment (the springs)
//   no hands    held 0.4 s, then it glides back to the drift (w falls over about a second)
//   palms together (closer than about a hand and a fifth)  it shrinks away in about five frames, and comes back when they part
//   hands thrown open (their distance up by a third within 0.12 s)  a burst, held about four frames, ringing down over ~0.45 s
//   a portal window open  the portals win: the blob goes back to the drift and the hands are left to them
// The numbers are the brief's (backlog/orb/BRIEF-APP-LOOK.md) and the measured hand logs' (backlog/glass-ball/DESIGN.md); tuned on a clip.

export const DROPS = 7;   // the blob is seven drops melted together (glass.js)

// Where the seven drops are: the middle one at (cx, cy), the four that circle it, the two outer ones, from the size R, the kick's pulse, the three bands'
// levels and the turning. Pure (the drops array is written), so a test can pin it. `burst` (0 to 1: the hands thrown open, glasshands.js) flings the six
// circling drops outward and swells them; at 0 every number is what it was before there was a burst.
export function layout(drops, { t, cx, cy, R, pulse, low, mid, high, spin }, burst = 0) {
  const set = (i, x, y, r) => { drops[i * 3] = x; drops[i * 3 + 1] = y; drops[i * 3 + 2] = r; };
  const fling = 1 + 1.1 * burst, swell = 1 + 0.25 * burst;
  set(0, cx, cy, R * (0.95 + 0.12 * low + 0.16 * pulse));
  for (let i = 1; i <= 4; i++) {
    const a = spin * (i % 2 ? 1 : -0.7) * (0.6 + 0.15 * i) + i * 1.57;
    const dist = R * (0.62 + 0.18 * Math.sin(t * 0.37 + i * 1.7) + 0.22 * pulse) * fling;
    set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.85, R * (0.42 + 0.1 * Math.sin(t * 0.53 + i) + 0.18 * mid) * swell);
  }
  for (let i = 5; i < DROPS; i++) {
    const a = -spin * 0.45 + (i - 5) * Math.PI + Math.sin(t * 0.2 + i);
    const dist = R * (1.3 + 0.2 * Math.sin(t * 0.21 + i)) * fling;
    set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.8, R * (0.17 + 0.12 * high + 0.05 * pulse) * swell);
  }
}

export const K_SIZE = 0.22;       // the blob's radius from the palms' distance (the clip at 0.3 filled the whole gap and the screen: too much; its whole outline is about 2.7 radii across)
export const ONE_HAND = 1.0;      // ... from a hand's size, with one hand (set to 0 to have no blob on one hand)
const HOLD_ONE = 0.25;            // a hand missing this long or less: the two hands' last place stands
const HOLD_NONE = 0.4;            // no hands this long: held, then released to the drift
const TOGETHER = 1.2, APART = 1.8; // palms closer than this many hand sizes: gone; farther than this: back (a hysteresis). Colin's logs (Nov 15) never have
                                   // the palms nearer than 1.75 hand sizes (a circle's are 3 to 5 apart), so these two are a guess from the pose, to be tuned on a clip
const BURST_RATIO = 1.33, BURST_WINDOW = 0.12, BURST_MIN = 0.35, BURST_GAP = 0.6, BURST_HOLD = 4 / 60, BURST_TAU = 0.15;
const R_MAX = 0.25;               // the blob's radius at most this much of the window's short side (a drift is 0.18); the clip at 0.35 filled the picture
const MARGIN = 1.25;              // the middle drop (about 1.25 radii at its biggest) is kept this many radii from every edge, so it never goes half off the picture
const MAX_STEP = 0.5;             // the middle drop moves at most this fraction of its radius a frame (60 a second)

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const palm = (P) => [0, 5, 9, 13, 17].reduce((s, i) => [s[0] + P[i][0] / 5, s[1] + P[i][1] / 5], [0, 0]);

// A damped spring on one number (w: its speed, z: its damping; the brief's: position w 15 z 0.36, size w 12 z 0.28), stepped in pieces of at most 1/120 s.
function spring(w, z) {
  let x = 0, v = 0, started = false;
  return {
    get x() { return x; },
    step(target, dt) {
      if (!started) { x = target; v = 0; started = true; return x; }
      const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
      for (let i = 0; i < n; i++) { v += (w * w * (target - x) - 2 * z * w * v) * h; x += v * h; }
      return x;
    },
    reset() { started = false; },
    seed(at) { x = at; v = 0; started = true; },   // (start from here: a hand coming back while the blob is still fading out goes on from where the blob was)
  };
}
const ease = (x, target, dt, tau) => x + (target - x) * (1 - Math.exp(-dt / tau));

// The middle drop's place kept inside the window with a margin of MARGIN radii (a window too small for that: its middle).
// (bottom: the height of the player bar when it is showing; the blob keeps above it, so it is never half under it)
export function keepInside(x, y, r, W, H, bottom = 0) {
  const mg = Math.min(MARGIN * r, 0.5 * Math.min(W, H)), floor = Math.max(mg, H - Math.max(0, bottom) - mg);
  return { x: clamp(x, mg, Math.max(mg, W - mg)), y: clamp(y, mg, floor) };
}

export function createFollower() {
  let last = null, lastSeen = -Infinity, twoAt = -Infinity, lastTwo = null, lastTgt = null, mode = 'drift';
  let held = null, w = 0, gone = 0, together = false, burstAt = -Infinity, burstEnd = -Infinity, px = 0, py = 0, placed = false;
  const sx = spring(15, 0.36), sy = spring(15, 0.36), sr = spring(12, 0.28), hist = [];
  const drop = () => { sx.reset(); sy.reset(); sr.reset(); placed = false; };
  return {
    reset() { held = null; last = null; lastSeen = twoAt = burstAt = burstEnd = -Infinity; lastTwo = lastTgt = null; mode = 'drift'; w = 0; gone = 0; together = false; hist.length = 0; drop(); },
    get mode() { return mode; },
    // t: seconds; hands: the tracker's [{ points: [[x, y] x 21] }] (camera 0-1) or []; place(x, y): a camera point on screen; W, H: the window;
    // portal: a portal window is open. Answers { w, x, y, r, gone, burst, mode } (screen pixels).
    update(t, { hands = [], place, W, H, portal = false }) {
      // a clock that steps back (a render that starts its clock again): every time kept "when" is taken back to now, so a hold counts from the step, not
      // from a moment still to come (the follower would otherwise hold its last place until the clock caught up)
      if (last !== null && t < last) { lastSeen = Math.min(lastSeen, t); twoAt = Math.min(twoAt, t); burstAt = Math.min(burstAt, t); burstEnd = Math.min(burstEnd, t); hist.length = 0; }
      const dt = last === null ? 1 / 60 : clamp(t - last, 0, 0.1);
      last = t;
      const unit = Math.min(W, H);
      const hs = hands.map((h) => { const P = h.points.map(([x, y]) => place(x, y)); return { P, size: dist(P[0], P[9]), c: palm(P) }; });
      // the tracker now and then sees one hand twice: two hands whose wrists are under half a hand apart are one
      let cur = null;
      if (hs.length >= 2 && dist(hs[0].P[0], hs[1].P[0]) >= 0.5 * hs[0].size) {
        const [a, b] = hs, d = dist(a.c, b.c);
        cur = { k: 2, x: (a.c[0] + b.c[0]) / 2, y: (a.c[1] + b.c[1]) / 2, d, size: (a.size + b.size) / 2, r: clamp(K_SIZE * d, 0.06 * unit, R_MAX * unit) };
      } else if (hs.length >= 1) {
        const a = hs[0];
        cur = { k: 1, x: a.c[0], y: a.c[1], d: 0, size: a.size, r: ONE_HAND > 0 ? clamp(ONE_HAND * a.size, 0.06 * unit, R_MAX * unit) : 0 };
      }
      let tgt = null;
      if (cur) {
        lastSeen = t;
        if (cur.k === 2) { twoAt = t; lastTwo = cur; tgt = cur; mode = 'two'; }
        else if (lastTwo && t - twoAt <= HOLD_ONE) { tgt = lastTwo; mode = 'hold'; }   // a hand missing a moment: the two hands' last place stands
        else { tgt = cur; mode = 'one'; }
        lastTgt = tgt;
      } else if (lastTgt && t - lastSeen <= HOLD_NONE) { tgt = lastTgt; mode = 'hold'; }   // no hands for a moment: held where they were
      else { mode = 'drift'; lastTwo = lastTgt = null; }
      // how much the hands are in charge: up fast (about a third of a second), down over about a second; not at all while a portal window is open
      const wTarget = tgt && !portal ? 1 : 0;
      w = ease(w, wTarget, dt, wTarget > w ? 0.12 : 0.35);
      if (wTarget === 0 && w < 1e-3) w = 0;
      let r = 0;
      if (tgt) {
        // (a hand back while the blob is still fading out, w above 0: the springs start from where the blob was held, so it moves on from there; with the say gone there is
        // nothing held, and the blob starts at the hand as w comes up. Before this the springs started at the new palm and the blob stepped there in one frame: 524 px, Nov 23.)
        if (!placed && held && w > 0) { sx.seed(held.x); sy.seed(held.y); sr.seed(held.r); px = held.x; py = held.y; placed = true; }
        const x = sx.step(tgt.x, dt), y = sy.step(tgt.y, dt);
        r = Math.min(R_MAX * unit, sr.step(tgt.r, dt));   // (the spring rings: it may not ring past the cap)
        // (the size's spring rings, and a big step down would take it under nothing: it keeps a floor, so the blob shrinks but never blinks; only the palms together take it away)
        if (ONE_HAND > 0) r = Math.max(0.06 * unit, r);
        if (!placed) { px = x; py = y; placed = true; }
        // at most half a radius a frame: a wrong frame from the tracker drags the blob, it cannot throw it
        const lim = Math.max(1, MAX_STEP * Math.max(r, 0.06 * unit) * (dt * 60)), mx = x - px, my = y - py, m = Math.hypot(mx, my);
        if (m > lim) { px += (mx / m) * lim; py += (my / m) * lim; } else { px = x; py = y; }
      } else drop();
      if (tgt) held = { x: px, y: py, r };   // (where the blob last was: while the hands' say fades out it fades from there, not from the corner)
      // palms together: gone (a hysteresis), and back when they part or the hands have been out of sight a while
      if (mode === 'two') {
        if (!together && tgt.d < TOGETHER * tgt.size) together = true;
        else if (together && tgt.d > APART * tgt.size) together = false;
      } else if (mode === 'drift' || mode === 'one') together = false;
      const goneTarget = together ? 1 : 0;
      gone = ease(gone, goneTarget, dt, goneTarget > gone ? 0.03 : 0.05);
      if (goneTarget === 0 && gone < 1e-3) gone = 0;
      // thrown open: the palms' distance up by a third within 0.12 s, and wide enough to matter (against the camera picture's width)
      if (cur && cur.k === 2) {
        hist.push([t, cur.d]);
        while (hist.length > 2 && t - hist[1][0] > 0.4) hist.shift();
        const old = at(hist, t - BURST_WINDOW), pw = Math.abs(place(1, 1)[0] - place(0, 0)[0]) || W;
        if (old !== null && cur.d > BURST_MIN * pw && cur.d >= BURST_RATIO * old && t - burstAt > BURST_GAP) { burstAt = t; burstEnd = t + BURST_HOLD; }
      } else if (!cur) hist.length = 0;
      const burst = t <= burstEnd ? 1 : Math.exp(-(t - burstEnd) / BURST_TAU);
      // the middle drop stays inside the window with a margin (the hands can be at its very edge; the blob is not)
      const inside = keepInside(placed ? px : 0, placed ? py : 0, r, W, H);
      const out = placed ? { x: inside.x, y: inside.y, r } : w > 0 && held ? { ...keepInside(held.x, held.y, held.r, W, H), r: held.r } : { x: 0, y: 0, r };
      if (!placed && w === 0) held = null;
      return { w, x: out.x, y: out.y, r: out.r, gone, burst: burst < 0.01 ? 0 : burst, mode };
    },
  };
}
// the value of the (time, number) samples at time s, or null when s is before the first or the samples do not reach back to it
function at(hist, s) {
  if (hist.length < 2 || s < hist[0][0]) return null;
  for (let i = hist.length - 1; i > 0; i--) {
    if (hist[i - 1][0] <= s) { const [t0, v0] = hist[i - 1], [t1, v1] = hist[i]; return t1 === t0 ? v1 : v0 + (v1 - v0) * ((s - t0) / (t1 - t0)); }
  }
  return null;
}

// Shy of the code: the code is the proof in every reel, so where the blob sits over its lines it gets smaller and slides off them. `rects` are the lines' text on
// screen ({ x0, x1, y0, y1 } in CSS pixels, glass.js's lineSeen). How much of the blob's body (a disk of 1.25 radii round the middle drop) lies on text is counted on a grid
// of points; the more, the smaller (to half its size at a fifth covered) and the further it is pushed away from where the text is. Both ease (0.3 s in, 0.6 s out) so typing
// that moves the lines does not make it flicker. `st` is the state it keeps between frames ({ scale: 1, dx: 0, dy: 0 } to begin with); `w` is how much the hands
// are in charge (the drift is meant to float over the code, so it is left alone). Returns { x, y, r }.
export function shyOfCode(st, dt, x, y, r, rects, w = 1) {
  const body = 1.25 * r, G = 9; let hits = 0, inside = 0, vx = 0, vy = 0;
  if (w > 0 && r > 1 && rects && rects.length) {
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const px = x + ((i + 0.5) / G * 2 - 1) * body, py = y + ((j + 0.5) / G * 2 - 1) * body;
      if ((px - x) ** 2 + (py - y) ** 2 > body * body) continue;
      inside++;
      for (const q of rects) if (px >= q.x0 && px <= q.x1 && py >= q.y0 && py <= q.y1) { hits++; vx += px - x; vy += py - y; break; }
    }
  }
  const cover = inside ? hits / inside : 0, k = Math.min(1, Math.max(0, (cover - 0.03) / 0.17));
  const scaleT = 1 - 0.5 * k, m = hits ? Math.hypot(vx, vy) / hits : 0, away = m > 1e-6 ? [-vx / hits / m, -vy / hits / m] : [0, 0];
  const dxT = away[0] * k * 1.1 * r, dyT = away[1] * k * 1.1 * r;
  const tau = (v, t) => (t < v ? 0.3 : 0.6), e = (v, t, dd) => v + (t - v) * (1 - Math.exp(-dd / tau(v, t)));
  st.scale = e(st.scale ?? 1, scaleT, dt); st.dx = e(st.dx ?? 0, dxT, dt); st.dy = e(st.dy ?? 0, dyT, dt);
  const f = 1 - (1 - st.scale) * w;
  return { x: x + st.dx * w, y: y + st.dy * w, r: r * f };
}

// --- the spikes (G3): on a kick the middle drop's edge is pushed out in thin lobes. The profile is how far, as a fraction of the drop's radius, at each angle round
// it (LOBE_N samples, sample j at the angle (j + 0.5) / LOBE_N of a turn from -pi); glass.js puts it in a small texture and the shader makes the drop's radius
// r * (1 + profile(angle)), so the edge is round with spikes out of it, not a round bump. The orb brief's recipe: 26 lobes, mostly sideways (where they show),
// sharp (a cosine to the power 50 to 200: the brief's 16 to 38 were for a 3D ball, and in the flat they overlapped into a crown), seen as the flat shadow of a ball's spikes, a new set for every kick; the song's envelope (the kick's glow) and how heavy the low end has been (a quiet passage
// only ripples it) scale the whole profile, outside this function: amp.
export const LOBE_N = 128, SPIKES = 26, SPIKE_MAX = 1.8;
// How long the spikes stay: not the kick's own glow (a fifth of a second, which the blob's swell uses) but a shorter one, so that at 125 to 172 bpm
// the plain blob shows between two kicks. A kick of full level throws spikes for about 0.2 s (tau 0.1 s, the first eighth of it cut away); a quiet one for less.
// The spikes trimmed to the room there is: along each angle the tip may not pass the window's edge (or the player bar's top), so a fan thrown at an
// edge is shorter there and not cropped by it. (x, y: the middle drop's place; r: its radius; pad: pixels kept clear of the edge.)
export function fitSpikes(out, x, y, r, W, H, bottom = 0, pad = 6) {
  const floorY = H - Math.max(0, bottom);
  for (let j = 0; j < out.length; j++) {
    const th = ((j + 0.5) / out.length) * 2 * Math.PI - Math.PI, dx = Math.cos(th), dy = Math.sin(th);
    let d = Infinity;
    if (dx > 1e-9) d = Math.min(d, (W - x) / dx); else if (dx < -1e-9) d = Math.min(d, x / -dx);
    if (dy > 1e-9) d = Math.min(d, (floorY - y) / dy); else if (dy < -1e-9) d = Math.min(d, y / -dy);
    const room = Math.max(0, (d - pad) / r - 1);
    if (out[j] > room) out[j] = room;
  }
  return out;
}
export const SPIKE_TAU = 0.1, SPIKE_FLOOR = 0.12;
export function spikeEnvelope(age, level) {
  if (!(age >= 0) || !(level > 0)) return 0;
  const v = level * Math.exp(-age / SPIKE_TAU);
  return v <= SPIKE_FLOOR ? 0 : (v - SPIKE_FLOOR) / (1 - SPIKE_FLOOR);
}   // (the profile is kept under SPIKE_MAX: the texture holds half of it in a byte)
const hash = (n) => { n = Math.imul(n ^ (n >>> 15) ^ 0x9e3779b9, 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
// the lobes of one kick: [angle, height, power] for each, from the kick's seed (an integer: the kick's time in milliseconds is one)
export function lobesOf(seed) {
  const out = [];
  for (let i = 0; i < SPIKES; i++) {
    // a direction on a ball (the proof's spikes were on a 3D ball): seen flat, one pointing at the viewer hardly shows, one on the rim shows its whole length
    const a = 2 * Math.PI * hash(seed * 31 + i * 4), phi = Math.atan2(0.4 * Math.sin(a), Math.cos(a)), z = 2 * hash(seed * 31 + i * 4 + 3) - 1, shows = 1 - z * z;
    out.push([phi, (0.35 + 0.65 * hash(seed * 31 + i * 4 + 1)) * shows, 50 + 150 * hash(seed * 31 + i * 4 + 2)]);   // [angle, height, power]
  }
  return out;
}
// the profile of those lobes times amp into out (a Float32Array of LOBE_N), 0 to SPIKE_MAX
export function spikeProfile(out, seed, amp) {
  out.fill(0);
  if (!(amp > 0)) return out;
  for (const [phi, h, p] of lobesOf(seed)) {
    for (let j = 0; j < LOBE_N; j++) {
      const c = Math.cos(((j + 0.5) / LOBE_N) * 2 * Math.PI - Math.PI - phi);
      if (c > 0) out[j] = Math.max(out[j], h * c ** p);   // (the tallest of the lobes there, not their sum: a crowd of lobes does not pile up into a crown)
    }
  }
  for (let j = 0; j < LOBE_N; j++) out[j] = Math.min(SPIKE_MAX, out[j] * amp);
  return out;
}
