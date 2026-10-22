// Dominoes: the blocks' other look (P), after mewtw0o's domino piano roll. The blocks' queue and
// clock (visuals.js) with each block stood up as a domino: the playhead knocks it over as it plays,
// and it tips over to the left, onto the one before it when that one lies close enough to lean on.
// A held note (the bass's, a chord's) is a slab on dominoes that glows while the note holds: its
// posts go down as the playhead passes them, and it drops when the note ends. A part that has
// stopped stands faint and isn't knocked over. Boxes in an oblique view (the front, and each face
// that turns toward you as it falls), shaded in the theme's colour, with soft shadows.

// A drum's domino: height and width, in units of U (see layout)
const DRUM = { bd: [1, 0.24], sd: [0.86, 0.21], hho: [0.72, 0.18], hhc: [0.6, 0.16], vox: [0.8, 0.2] };
const KX = 0.5, KY = 0.38; // where depth goes on screen: right and up, per pixel of depth
const PUSH = 5, GRAV = 420, BOUNCE = 0.3; // the knock (rad/s), gravity (rad/s² fully leaning, for a domino U tall), how much comes back from a landing
const SX = 0.55, SZ = 0.3; // the shadows: how far right and back per pixel of height
const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const LIGHT = norm([-0.35, 0.8, -0.55]); // toward the light: above, a little left, in front of you
const FRONT = Math.max(0, -LIGHT[2]); // how much light the fronts get (they face you)
// How long a domino takes to go over flat (s), with gravity G: knocked that much early, it lands on
// its beat, which is when it's heard (the clack of a domino is its landing, not its tipping).
const fallTime = (G) => {
  let th = 0.02, om = PUSH, t = 0;
  const h = 1 / 480;
  while (th < Math.PI / 2 && t < 1) { om += G * Math.sin(th) * h; th += om * h; t += h; }
  return t;
};

// A box's corners on screen, worked out once a box: 0-7 by (u, v, z) bits (u along its width, v
// up it, z into the screen), 8 and 9 halfway up its front's left and right edges.
const cx = new Float64Array(10), cy = new Float64Array(10);
// and the shadow's 8 corners on the floor
const shadowPts = Array.from({ length: 8 }, () => [0, 0]);

export function createDominoes() {
  let lastDown = new Map(); // per lane and height: the last domino knocked over (the next one may lean on it)
  let lastW = 0, lastH = 0, order = null, orderOf = null;
  const shade = document.createElement('canvas'), sctx = shade.getContext('2d');
  const reset = () => { lastDown = new Map(); };

  // The parts a block stands as: a domino, or for a held note a slab on posts.
  const build = (b, L) => {
    const U = L.U;
    if (DRUM[b.lane]) {
      const [h, w] = DRUM[b.lane];
      b.posts = [{ b, dg: 0, h: h * U, w: w * U, base: L.floor(b.lane) }];
      return;
    }
    const base = L.pitchBase(b.lane, b.pc), P = 0.4 * U, t = 0.15 * U, w = 0.15 * U;
    // a chord: a domino for each of its notes, at their heights, one behind another (b.tone: which
    // of the chord's notes it is, set as the queue made it; a step number would move with the clock)
    if (b.lane === 'chords') { b.posts = [{ b, dg: 0, h: 0.5 * U, w: 0.13 * U, base, z: (b.tone || 0) * 0.3 * U }]; return; }
    if (b.len < 1.5) { b.posts = [{ b, dg: 0, h: P + t, w, base }]; return; }
    // a held note: a slab on legs, which stand while it holds and go down when it ends
    b.posts = [];
    for (let s = 0; s < b.len - 1.5; s += 4) b.posts.push({ b, dg: s, h: P, w, base });
    b.posts.push({ b, dg: b.len - 0.45, h: P, w, base });
    b.slab = { y: P, dy: 0, vy: 0, t, base, glow: 0, down: false, released: false };
  };

  // A domino's step: its block's (which the engine's renumbering moves) and its place in it.
  const at = (p) => p.b.g + p.dg;
  // Where a domino knocked over comes to rest: flat, or leaning on the one before it. (Not on one
  // whose block has left the queue: off the screen, and not moved with the clock any more.)
  const restFor = (p, key, stepW) => {
    const prev = lastDown.get(key);
    lastDown.set(key, p);
    if (!prev || prev.b.gone || at(prev) >= at(p)) return Math.PI / 2;
    // the corner of the one before that sticks up nearest (its bottom right, turned as it lies)
    const dx = (at(p) - at(prev)) * stepW - prev.w * Math.cos(prev.rest), dy = prev.w * Math.sin(prev.rest);
    if (dx <= 0 || Math.hypot(dx, dy) > p.h) return Math.PI / 2;
    return Math.max(0.5, Math.atan2(dx, dy));
  };

  // A box turned th (radians, toward the left) about its bottom left front corner, at (px, py) on
  // screen: w wide, h tall, d deep, zo back. Its faces' colours from tone(brightness + boost).
  function box(ctx, px, py, w, h, d, th, tone, boost, line, split, zo = 0) {
    const c = Math.cos(th), s = Math.sin(th);
    for (let i = 0; i < 8; i++) {
      const u = i & 1 ? w : 0, v = i & 2 ? h : 0, z = (i & 4 ? d : 0) + zo;
      cx[i] = px + u * c - v * s + z * KX;
      cy[i] = py - (u * s + v * c) - z * KY;
    }
    ctx.strokeStyle = line;
    // the sides that turn toward you (depth runs up and to the right on screen, so a side shows
    // when its normal leans that way): top, right, bottom, left
    side(ctx, -s, c, 2, 3, 7, 6, tone, boost);
    side(ctx, c, s, 1, 5, 7, 3, tone, boost);
    side(ctx, s, -c, 0, 4, 5, 1, tone, boost);
    side(ctx, -c, -s, 0, 2, 6, 4, tone, boost);
    // the front: two halves like a domino's, the lower a little darker, a line between
    if (split) {
      cx[8] = (cx[0] + cx[2]) / 2; cy[8] = (cy[0] + cy[2]) / 2;
      cx[9] = (cx[1] + cx[3]) / 2; cy[9] = (cy[1] + cy[3]) / 2;
      quad(ctx, 0, 1, 9, 8, tone(FRONT * 0.86 + boost));
      quad(ctx, 8, 9, 3, 2, tone(FRONT + boost));
    } else quad(ctx, 0, 1, 3, 2, tone(FRONT + boost));
  }
  function side(ctx, nx, ny, a, b, c, d, tone, boost) {
    if (nx * KX + ny * KY > 0.02) quad(ctx, a, b, c, d, tone(Math.max(0, nx * LIGHT[0] + ny * LIGHT[1]) + boost));
  }
  function quad(ctx, a, b, c, d, fill) {
    ctx.beginPath();
    ctx.moveTo(cx[a], cy[a]);
    ctx.lineTo(cx[b], cy[b]);
    ctx.lineTo(cx[c], cy[c]);
    ctx.lineTo(cx[d], cy[d]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }

  // Its shadow on the floor at py (each corner carried down and away from the light), into the
  // shadow canvas at scale k; e: how high above that floor the box's bottom is (a slab on its posts).
  function shadow(px, py, w, h, d, th, k, zo = 0, e = 0) {
    const c = Math.cos(th), s = Math.sin(th);
    for (let i = 0; i < 8; i++) {
      const u = i & 1 ? w : 0, v = i & 2 ? h : 0, z = i & 4 ? d : 0;
      const X = u * c - v * s, Y = u * s + v * c + e, Z = z + zo + Y * SZ;
      shadowPts[i][0] = (px + X + Y * SX + Z * KX) * k;
      shadowPts[i][1] = (py - Z * KY) * k;
    }
    const hull = convexHull(shadowPts);
    sctx.beginPath();
    sctx.moveTo(hull[0][0], hull[0][1]);
    for (let i = 1; i < hull.length; i++) sctx.lineTo(hull[i][0], hull[i][1]);
    sctx.closePath();
    sctx.fill();
  }

  return {
    reset,
    // Turned off: let go of the shadows' canvas too.
    release() { shade.width = shade.height = 0; lastW = lastH = 0; reset(); },
    // blocks and vg: the queue and the clock (in steps); W, H: the canvas; col: the theme's
    // colours; level: how much each part is playing (0..1); t, dt: now and the frame's length (s).
    // ahead: the steps the queue makes on each side of the playhead; on a tall screen (the 9:16
    // layout) half as many show, a bar across, so the dominoes come out bigger.
    // sps: steps a second (the tempo's), to knock each domino early enough to land on its beat.
    draw(ctx, { blocks, vg, W, H, col, level, t, dt, ahead, rows, sps }) {
      const span = W < H ? Math.min(ahead, 8) : ahead;
      const stepW = W / (2 * span), laneH = H / rows.n, mid = W / 2;
      const U = Math.min(laneH * 0.8, stepW * 2.3);
      const L = {
        U,
        floor: (lane) => rows[lane] * laneH + laneH * 0.84,
        pitchBase: (lane, pc) => rows[lane] * laneH + laneH * (0.9 - (0.45 * pc) / 11),
      };
      // A new size (the window, the layout, the screen's scale): sizes, heights and the angles
      // dominoes lean at were all worked out in pixels, so every domino is made again at the new
      // size, set down as it was: one played lies at rest (b.lit), one to come stands.
      if (W !== lastW || H !== lastH) {
        for (const b of blocks) b.posts = b.slab = null;
        reset();
        lastW = W;
        lastH = H;
      }
      if (rows !== orderOf) { order = Object.keys(rows).filter((k2) => k2 !== 'n').sort((a, b) => rows[a] - rows[b]); orderOf = rows; }
      const X = (g) => mid + (g - vg) * stepW;
      const tone = toneOf(col);
      const line = `rgba(${col.ink.join(',')},0.9)`;
      const lw = Math.max(1, U * 0.016);
      // the physics: knocks, falls and landings, in small steps
      const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
      for (const b of blocks) {
        if (!b.posts) {
          build(b, L);
          // made already past the playhead (starting up, or after a new size): down already, if
          // its part was playing (a held note's legs only once the note is over)
          const over = !b.slab || b.g + b.len <= vg;
          for (const p of b.posts) {
            p.th = 0; p.om = 0; p.st = 0; p.tf = fallTime((GRAV * U) / p.h);
            if (at(p) <= vg && over && b.lit) { p.rest = restFor(p, b.lane + '|' + Math.round(p.base), stepW); p.th = p.rest; p.st = 2; p.hit = -9; }
            else if (b.slab && over) p.ghost = true;
          }
          if (b.slab && over) {
            b.slab.released = true;
            if (b.lit) { b.slab.dy = b.slab.y - b.posts[0].w; b.slab.down = true; }
          }
        }
        const on = level[b.lane] > 0.5, sl = b.slab;
        // A held note ending: its legs go down one after another from the end back (the last one
        // landing as the note ends), and the slab drops with them; not played, they stand, faint.
        if (sl && !sl.released && vg >= b.g + b.len - 0.45 - b.posts[b.posts.length - 1].tf * sps) {
          sl.released = true;
          if (on) b.posts.forEach((p, i, all) => { p.knockAt = t + (all.length - 1 - i) * 0.04; });
          else for (const p of b.posts) if (p.st === 0) p.ghost = true;
        }
        for (const p of b.posts) {
          const due = sl ? p.knockAt !== undefined && t >= p.knockAt : on && vg >= at(p) - p.tf * sps;
          if (p.st === 0 && !p.ghost && due) {
            p.st = 1; p.th = 0.02; p.om = PUSH; p.hit = undefined; // (it lights up as it lands)
            p.rest = restFor(p, b.lane + '|' + Math.round(p.base), stepW);
            b.lit = true; // (played: a rebuild sets it down at rest)
          } else if (!sl && p.st === 0 && vg >= at(p) + 1) p.ghost = true; // its part wasn't playing: it stays up, faint
          if (p.st !== 1) continue;
          const G = (GRAV * U) / p.h;
          for (let i = 0; i < n; i++) {
            p.om += G * Math.sin(p.th) * h;
            p.th += p.om * h;
            if (p.th >= p.rest) {
              p.th = p.rest;
              if (p.hit === undefined) p.hit = t; // the landing: the beat
              // it comes to rest once a landing is too soft to lift it clear of the next step's
              // pull back down (at some frame lengths a fixed speed was never reached, and it kept
              // landing, unseen, every step)
              if (p.om > Math.max(2.5, 1.5 * G * h)) p.om = -p.om * BOUNCE;
              else { p.om = 0; p.st = 2; break; }
            }
          }
        }
        if (sl) {
          const holding = on && vg >= b.g && vg < b.g + b.len;
          sl.glow += ((holding ? 1 : 0) - sl.glow) * Math.min(1, dt * 14);
          // it drops once its legs are going (one left standing, its part not playing, holds it up)
          if (!sl.down && sl.released && b.posts.every((p) => p.st !== 0)) sl.down = true;
          if (sl.down) {
            // onto its fallen posts
            const floor = sl.y - b.posts[0].w;
            for (let i = 0; i < n; i++) {
              sl.vy += 30 * U * h;
              sl.dy += sl.vy * h;
              if (sl.dy >= floor) { sl.dy = floor; sl.vy = sl.vy > 0.6 * U ? -sl.vy * 0.25 : 0; }
            }
          }
        }
      }

      // the shadows, all at once: drawn small and stretched, so their edges come out soft
      const k = 1 / 3, sw = Math.ceil(W * k), shh = Math.ceil(H * k);
      if (shade.width !== sw || shade.height !== shh) { shade.width = sw; shade.height = shh; }
      sctx.clearRect(0, 0, sw, shh);
      sctx.fillStyle = '#000';
      const byLane = new Map(order.map((l) => [l, []]));
      for (const b of blocks) if (b.posts && X(b.g + (b.len || 1)) > -U && X(b.g) < W + U) byLane.get(b.lane)?.push(b);
      for (const mine of byLane.values()) {
        for (const b of mine) {
          for (const p of b.posts) if (!p.ghost) shadow(X(at(p)), p.base, p.w, p.h, p.w, p.th, k, p.z || 0);
          const sl = b.slab;
          if (sl) shadow(X(b.g) - p0(b).w * 0.4, sl.base, (b.len - 0.1) * stepW, sl.t, p0(b).w, 0, k, 0, sl.y - sl.dy);
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(shade, 0, 0, sw, shh, 0, 0, W, H);
      ctx.restore();

      // the dominoes: lane by lane from the top, left to right, each slab over its posts
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      for (const [lane, mine] of byLane) {
        // (the chords' back row first)
        if (lane === 'chords') mine.sort((a, b) => (b.posts[0].z || 0) - (a.posts[0].z || 0) || a.g - b.g);
        for (const b of mine) {
          for (const p of b.posts) {
            const flash = p.hit !== undefined ? Math.max(0, 1 - (t - p.hit) / 0.3) : 0;
            ctx.globalAlpha = (p.ghost ? 0.28 : 0.35 + 0.65 * Math.max(level[b.lane], p.st ? 1 : 0)) * (lane === 'chords' ? 0.8 : 1);
            box(ctx, X(at(p)), p.base, p.w, p.h, p.w, p.th, tone, 0.35 * flash, line, true, p.z || 0);
          }
          const sl = b.slab;
          if (sl) {
            ctx.globalAlpha = 0.35 + 0.65 * level[b.lane];
            if (sl.glow > 0.02) { ctx.shadowColor = `rgba(${col.fg.join(',')},${0.5 * sl.glow})`; ctx.shadowBlur = U * 0.22 * sl.glow; }
            box(ctx, X(b.g) - p0(b).w * 0.4, sl.base - sl.y + sl.dy, (b.len - 0.1) * stepW, sl.t, p0(b).w, 0, tone, 0.2 * sl.glow, line, false);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
          }
        }
      }
      ctx.globalAlpha = 1;
      // the playhead
      ctx.fillStyle = `rgba(${col.fg.join(',')},0.55)`;
      ctx.fillRect(mid - Math.max(0.5, lw / 2), 0, Math.max(1, lw), H);
    },
  };
}

const p0 = (b) => b.posts[0];

// A face's colour for its brightness (about 0.3 in shade .. 1 in full light, more when lit up): a
// light theme colour darkens into the shade; a dark one (the whitescreen's black) lightens in the light.
function toneOf(col) {
  const [r, g, b] = col.fg, light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.45;
  return (v) => {
    if (light) {
      const k = Math.min(1, 0.25 + 0.75 * v), up = Math.max(0, v - 1) * 0.6;
      return `rgb(${Math.round(r * k + (255 - r * k) * up)},${Math.round(g * k + (255 - g * k) * up)},${Math.round(b * k + (255 - b * k) * up)})`;
    }
    const m = Math.min(0.85, Math.max(0, 0.55 * (v - 0.35)));
    return `rgb(${Math.round(r + (255 - r) * m)},${Math.round(g + (255 - g) * m)},${Math.round(b + (255 - b) * m)})`;
  };
}

// Andrew's monotone chain: the outline around a few points.
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
