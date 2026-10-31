// The spaghetti's noodles and dancers (ported from the Apple port's Noodles.swift and
// Dancers.swift, one to one: the same names, units and places as the pasta machine's, y up, units
// about centimetres).
//
// What the pasta (spaghetti.js) uses:
//
//   new Noodles(strands, beads)
//     Noodles.R, L, G, BOUNCE, KICK, CLASH, FLOOR, SLAB, VOID, LOW   numbers (static)
//     strands, beads                       ints
//     x, y, z, ox, oy, oz, w               Float32Array(strands * beads): bead j of strand s at s * beads + j
//     aim                                  Float32Array(4 * strands * beads): x, y, z, how hard (Dancers fills it)
//     alive, steered                       boolean[strands]
//     next                                 number[strands]: the strand joined on after it, or -1
//     swell                                number[strands]: 0-1, how far a dancer's up (its head drawn thicker)
//     landings                             int
//     floorG                               number (G; the endless kind sets 150)
//     feed(s, out, exit, speed, flick, sway = [0, 0, 0])   exit, flick, sway: [x, y, z]
//     kill(s)
//     hopBeat(P) -> number                 Swift's hop(beat: P)
//     hop(v, spread = 0)                   Swift's hop(v, spread:)
//     step(dt)
//
//   new Dancers(noodles)
//     Dancers.MOST                         6 (static)
//     Dancers.Groove                       new Dancers.Groove(): what's heard, all its defaults (below)
//     Dancers.aside(a) -> number           (static)
//     shape                                'crowd' | 'cypher' | 'groups' | 'huddle' | 'burst' (read it, don't set it)
//     count, travelling                    ints (getters)
//     clear()
//     update(g, dt, rank)                  g: a Groove, or a plain object with its fields (copied each
//                                          frame, so one object can be filled in again and again);
//                                          rank(s) -> int
//
//   A Groove: { t, beat, P, kick, snare, hat, openHat, bass, bassF0, drop, level, silent, fourOnFloor, calm }:
//   the time (s); the beat (beats from a bar's first; null without a tempo) and a beat's length
//   (s, 0.5); when the kick, snare, closed and open hats and bass last hit (s; -10); the bass
//   note's pitch (Hz, 60); when the last drop was (s; -99); how loud (0-1); and whether it's
//   silent (true), the kick's on every beat (false), the calm look (false).

// The pasta's noodles: strands of beads, each held to its length and loosely to its shape (Verlet,
// the constraints projected in turn: a soft rope that coils but won't kink), falling under a low
// gravity onto the floor slab and the table and piling on one another. A hard landing on the floor
// bounces back up and off sideways, the way the noodle's bent there and away from the pile's
// middle, far more than real pasta would; soft ones just settle. The dancers' (steered) don't
// bounce, nor spring off the others: they're held to their dance, and a bounce there is a spasm.
// Off the slab's edge they fall into the void and are gone. An endless noodle is strands joined
// end to head (next). The loops run every frame for up to 240 strands of 38 beads, so they make
// nothing new: plain loops over the typed arrays.
export class Noodles {
  static R = 0.3; static L = 0.7; // a noodle's radius, its beads' spacing
  static G = 20; // gravity, units/s²: a fiftieth of real, for the hang time
  static BOUNCE = 0.9; static KICK = 0.6; // a hard landing's way back up, and off sideways
  static CLASH = 0.7; // and two noodles meeting hard, off each other
  static FLOOR = 50; static SLAB = 6; static VOID = -70;
  static LOW = 4; // how high over the floor floorG pulls

  constructor(strands, beads) {
    this.strands = strands;
    this.beads = beads;
    const n = strands * beads;
    // each bead's place, its place a step ago, and 1 if it's free (0: held in the machine, or gone)
    this.x = new Float32Array(n); this.y = new Float32Array(n); this.z = new Float32Array(n);
    this.ox = new Float32Array(n); this.oy = new Float32Array(n); this.oz = new Float32Array(n);
    this.w = new Float32Array(n);
    this.alive = new Array(strands).fill(false); // strands being simulated (and drawn)
    this.next = new Array(strands).fill(-1); // the strand whose head each one's tail is joined to (an endless noodle's next link), or -1
    // the dancers' (Dancers below): where each bead's steered to (x y z) and how hard (of the way
    // there each step; 0, left be), 4 a bead; the strands being steered, and how far up each is
    // (its head drawn thicker as it is)
    this.aim = new Float32Array(4 * n);
    this.steered = new Array(strands).fill(false);
    this.swell = new Array(strands).fill(0);
    this.landings = 0; // hard landings so far (the self-check's)
    // gravity just over the floor (an endless one's: the kick's hop high, yet down by the next beat);
    // a landing that hard and no harder lands dead
    this.floorG = Noodles.G;
    this.lastH = H; this.clock = 0; this.left = 0;
    this.bounced = new Array(strands).fill(-1); // when each strand last sprang back
    // the touching beads: a hash of 2R cells, where each cell's beads start in cellBeads, and each bead's cell
    this.cellStart = new Int32Array(CELLS + 1); this.cellFill = new Int32Array(CELLS);
    this.cellBeads = new Int32Array(n); this.cellOf = new Int32Array(n); this.cellG = new Int32Array(3 * n);
  }

  // A strand coming out of the machine at exit (straight down), `out` units of it so far (its head
  // first): the beads out are free (a bead just let go leaves at the feed's speed), the rest held
  // inside, the next one in line just behind the exit and the others bunched behind it. As its
  // tail leaves the rollers it's flicked (units/s, most at the very end). Sway: how a bead let go
  // moves sideways too (units/s: an endless one, with no tail to flick, swaying as it comes).
  feed(s, out, exit, speed, flick, sway = ZERO) {
    const { x, y, z, ox, oy, oz, w, beads, lastH } = this, L = Noodles.L;
    this.alive[s] = true;
    for (let j = 0; j < beads; j++) {
      const i = s * beads + j, a = j * L;
      if (a <= out) {
        if (w[i] === 0) {
          w[i] = 1; x[i] = exit[0]; y[i] = exit[1]; z[i] = exit[2];
          ox[i] = exit[0] - sway[0] * lastH; oy[i] = exit[1] + speed * lastH; oz[i] = exit[2] - sway[2] * lastH;
          if (j === beads - 1) {
            for (let k = 0; k < Math.min(12, beads); k++) {
              const b = i - k, f = (1 - k / 12) * lastH;
              ox[b] -= flick[0] * f; oy[b] -= flick[1] * f; oz[b] -= flick[2] * f;
            }
          }
        }
      } else {
        w[i] = 0;
        x[i] = exit[0]; y[i] = exit[1] + Math.min(a - out, L); z[i] = exit[2];
        ox[i] = x[i]; oy[i] = y[i]; oz[i] = z[i];
      }
    }
  }

  kill(s) {
    this.alive[s] = false; this.steered[s] = false; this.swell[s] = 0;
    this.w.fill(0, s * this.beads, (s + 1) * this.beads);
    const p = this.next.indexOf(s);
    if (p >= 0) this.next[p] = -1;
    this.next[s] = -1;
  }

  // how fast a kick's hop can be and still come down a little before the next beat, P s on (for its
  // hop); with floorG over G, higher
  hopBeat(P) { return Math.min(30, 0.85 * this.floorG * P / 2); }
  // the kick: the noodles lying on the floor hop up a little (the dancers dance it instead); with
  // spread (units/s), all of a heap low down that's still, and off away from under the machine
  // (x 0, z -6) too, so an endless one spreads over the floor
  hop(v, spread = 0) {
    const { x, y, z, ox, oy, oz, w, beads, steered, lastH } = this, n = this.strands * beads;
    const top = spread > 0 ? Noodles.LOW : Noodles.R + 0.3, still = spread > 0 ? 0.01 : 0.05, out = spread * lastH;
    for (let i = 0; i < n; i++) {
      const dy = y[i] - oy[i];
      if (w[i] > 0 && !steered[(i / beads) | 0] && y[i] < top && y[i] > 0 && dy < still && dy > -still) {
        oy[i] -= v * lastH;
        if (out > 0) {
          const ax = x[i], az = z[i] + 6, l = Math.sqrt(ax * ax + az * az) + 1e-3;
          ox[i] -= ax / l * out; oz[i] -= az / l * out;
        }
      }
    }
  }

  // dt seconds on, in steps of a 180th (Verlet's speeds are only right with every step the same;
  // a frame's time isn't), the beads touching each other worked out once a frame
  step(dt) {
    const { y, w, beads, alive, next } = this;
    this.lastH = H;
    this.left = Math.min(this.left + dt, 12 * H);
    let n = Math.floor(this.left / H);
    this.left -= n * H;
    while (n > 0) {
      n--;
      this.clock += H;
      this.integrate(H);
      this.steer();
      this.chains(); this.chains(); this.chains();
      if (n === 0) { this.touch(); this.chains(); } // (once a frame: in a heap it's most of the work)
      this.world(H);
    }
    // a join next to a strand hanging off the slab's edge snaps, so an endless noodle drips off a
    // strand at a time (else what's over the edge pulls the rest off after it, a chain off a table)
    const m = beads >> 1, e = beads - 1, low = -Noodles.SLAB - 2;
    for (let s = 0; s < this.strands; s++) {
      if (!alive[s] || next[s] < 0) continue;
      const a = s * beads, b = next[s] * beads;
      if (y[a] < low || y[a + m] < low || y[a + e] < low || y[b] < low || y[b + m] < low || y[b + e] < low) next[s] = -1;
    }
    // a strand gone into the void is done with
    for (let s = 0; s < this.strands; s++) {
      if (!alive[s]) continue;
      let gone = true;
      for (let i = s * beads; i < (s + 1) * beads; i++) if (w[i] === 0 || y[i] > Noodles.VOID) { gone = false; break; }
      if (gone) this.kill(s);
    }
  }

  integrate(h) {
    const { x, y, z, ox, oy, oz, w } = this, n = this.strands * this.beads;
    const drag = 1 - 0.25 * h, fall = Noodles.G * h * h, low = this.floorG * h * h, LOW = Noodles.LOW, cap = 140 * h;
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue;
      let vx = (x[i] - ox[i]) * drag, vy = (y[i] - oy[i]) * drag, vz = (z[i] - oz[i]) * drag;
      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > cap * cap) { const k = cap / Math.sqrt(v2); vx *= k; vy *= k; vz *= k; }
      ox[i] = x[i]; oy[i] = y[i]; oz[i] = z[i];
      x[i] += vx; y[i] += vy - (y[i] > 0 && y[i] < LOW ? low : fall); z[i] += vz;
    }
  }

  // the dancers' beads pulled toward where the dance puts them, critically damped (their speed cut
  // by 2√k/(1+√k) first): undamped, the pull rang at about 14 Hz, a shake on every move
  steer() {
    const { x, y, z, ox, oy, oz, w, aim, beads, steered } = this;
    for (let s = 0; s < this.strands; s++) {
      if (!steered[s]) continue;
      for (let i = s * beads; i < (s + 1) * beads; i++) {
        const k = aim[4 * i + 3];
        if (k > 0 && w[i] > 0) {
          const r = Math.sqrt(k), d = 2 * r / (1 + r);
          ox[i] += (x[i] - ox[i]) * d; oy[i] += (y[i] - oy[i]) * d; oz[i] += (z[i] - oz[i]) * d;
          x[i] += (aim[4 * i] - x[i]) * k; y[i] += (aim[4 * i + 1] - y[i]) * k; z[i] += (aim[4 * i + 2] - z[i]) * k;
        }
      }
    }
  }

  // each bead L from the next, and from the one after that at least 1.7 L (no sharper than 60°: it
  // curves like spaghetti rather than curling) and a little pulled toward 2 L (some spring to it)
  chains() {
    const { x, y, z, w, alive, next, beads } = this, L = Noodles.L;
    for (let s = 0; s < this.strands; s++) {
      if (!alive[s]) continue;
      const end = (s + 1) * beads;
      for (let i = s * beads; i < end - 1; i++) {
        pull(x, y, z, w, i, i + 1, L, 1, true);
        if (i < end - 2) { pull(x, y, z, w, i, i + 2, 1.7 * L, 1, false); pull(x, y, z, w, i, i + 2, 2 * L, 0.05, true); }
      }
    }
    // and across each join, as if it were one strand
    for (let s = 0; s < this.strands; s++) {
      if (!alive[s] || next[s] < 0) continue;
      const a = (s + 1) * beads - 1, b = next[s] * beads;
      pull(x, y, z, w, a, b, L, 1, true);
      pull(x, y, z, w, a - 1, b, 1.7 * L, 1, false); pull(x, y, z, w, a - 1, b, 2 * L, 0.05, true);
      pull(x, y, z, w, a, b + 1, 1.7 * L, 1, false); pull(x, y, z, w, a, b + 1, 2 * L, 0.05, true);
    }
  }

  // The beads of different noodles (or far along the same one) kept 2R apart, with a little
  // friction, so they pile.
  touch() {
    const { x, y, z, ox, oy, oz, w, beads, steered, lastH, cellStart, cellFill, cellBeads, cellOf, cellG } = this;
    const n = this.strands * beads, D = 2 * Noodles.R, inv = 1 / D, VOID = Noodles.VOID;
    const CLASH = Noodles.CLASH, KICK = Noodles.KICK;
    cellStart.fill(0);
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (w[i] > 0 && y[i] > VOID) {
        const gx = grid(x[i] * inv), gy = grid(y[i] * inv), gz = grid(z[i] * inv);
        cellG[3 * i] = gx; cellG[3 * i + 1] = gy; cellG[3 * i + 2] = gz;
        const h = hash(gx, gy, gz);
        cellOf[i] = h; cellStart[h + 1]++; count++;
      }
    }
    if (count < 2) return;
    for (let c = 0; c < CELLS; c++) { cellStart[c + 1] += cellStart[c]; cellFill[c] = cellStart[c]; }
    for (let i = 0; i < n; i++) if (w[i] > 0 && y[i] > VOID) cellBeads[cellFill[cellOf[i]]++] = i;
    for (let i = 0; i < n; i++) {
      if (!(w[i] > 0 && y[i] > VOID)) continue;
      const gx = cellG[3 * i], gy = cellG[3 * i + 1], gz = cellG[3 * i + 2], strand = (i / beads) | 0;
      for (let a = 0; a < 27; a++) {
        const h = hash(gx + a % 3 - 1, gy + ((a / 3) | 0) % 3 - 1, gz + ((a / 9) | 0) - 1);
        for (let k = cellStart[h], kEnd = cellStart[h + 1]; k < kEnd; k++) {
          const j = cellBeads[k], other = (j / beads) | 0;
          if (j <= i || (j - i < 4 && other === strand)) continue;
          const dx = x[j] - x[i], dy = y[j] - y[i], dz = z[j] - z[i], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= D * D || d2 < 1e-10) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, push = (D - d) * 0.5;
          // meeting fast (over 10 units/s), they spring apart; slower, they just rest on each other
          const vn = ((x[i] - ox[i]) - (x[j] - ox[j])) * nx + ((y[i] - oy[i]) - (y[j] - oy[j])) * ny + ((z[i] - oz[i]) - (z[j] - oz[j])) * nz;
          if (vn > 10 * lastH && !steered[strand] && !steered[other]) {
            const back = (1 + CLASH) * vn * 0.5;
            ox[i] += nx * back; oy[i] += ny * back; oz[i] += nz * back;
            ox[j] -= nx * back; oy[j] -= ny * back; oz[j] -= nz * back;
            // the one landing on the other springs back up, off the way it hit
            const up = vn / lastH * CLASH * KICK;
            if (ny < -0.5) this.springBack(i, CLASH, -nx * up, -nz * up, lastH);
            else if (ny > 0.5) this.springBack(j, CLASH, nx * up, nz * up, lastH);
          }
          // (a dancer shoves the others aside but isn't shoved: once a frame, a shove's a spasm)
          const si = steered[strand] ? 0 : 1, sj = steered[other] ? 0 : 1;
          x[i] -= nx * push * si; y[i] -= ny * push * si; z[i] -= nz * push * si;
          x[j] += nx * push * sj; y[j] += ny * push * sj; z[j] += nz * push * sj;
          // friction: some of their sliding past each other gone
          const rx = (x[i] - ox[i]) - (x[j] - ox[j]), ry = (y[i] - oy[i]) - (y[j] - oy[j]), rz = (z[i] - oz[i]) - (z[j] - oz[j]);
          const rn = rx * nx + ry * ny + rz * nz, tx = (rx - rn * nx) * 0.03, ty = (ry - rn * ny) * 0.03, tz = (rz - rn * nz) * 0.03;
          ox[i] += tx; oy[i] += ty; oz[i] += tz;
          ox[j] -= tx; oy[j] -= ty; oz[j] -= tz;
        }
      }
    }
  }

  // The floor slab (bouncing), the table and the machine (pushed out); off the slab, the void.
  world(h) {
    const { x, y, z, ox, oy, oz, w, beads, steered } = this, n = this.strands * beads;
    const R = Noodles.R, F = Noodles.FLOOR, S = Noodles.SLAB, VOID = Noodles.VOID;
    for (let i = 0; i < n; i++) {
      if (w[i] === 0 || y[i] < VOID) continue;
      // (only near the table can it touch the table or the machine)
      if (y[i] > -R && y[i] < 60 + R && x[i] > -22 - R && x[i] < 22 + R && z[i] > -26 - R && z[i] < 6 + R) {
        for (let b = 0; b < BOXES.length; b += 6) this.box(i, b);
      }
      // the slab: from the side or below, pushed out; onto its top, landed
      const ax = Math.abs(x[i]), az = Math.abs(z[i]);
      if (ax >= F + R || az >= F + R || y[i] >= R || y[i] <= -S - R) continue;
      const top = R - y[i], side = F + R - (ax > az ? ax : az), under = y[i] + S + R;
      if (side < top && side < under) {
        if (ax > az) x[i] = x[i] < 0 ? -F - R : F + R; else z[i] = z[i] < 0 ? -F - R : F + R;
        continue;
      }
      if (under < top) { y[i] = -S - R; continue; }
      const vin = (y[i] - oy[i]) / h, vx = (x[i] - ox[i]) / h, vz = (z[i] - oz[i]) / h;
      y[i] = R;
      const k = this.floorG / Noodles.G, e = Noodles.BOUNCE * smooth(3 * k, 12 * k, -vin);
      if (e > 0.01 && !steered[(i / beads) | 0]) {
        // up again, and off sideways: away from the way it's bent here, and from the middle
        const j = i % beads, s0 = j === 0 ? i : i - 1, s1 = j === beads - 1 ? i : i + 1;
        let bx = 2 * x[i] - x[s0] - x[s1], bz = 2 * z[i] - z[s0] - z[s1];
        const bl = Math.sqrt(bx * bx + bz * bz);
        if (bl > 1e-4) { bx /= bl; bz /= bl; } else { bx = 0; bz = 0; }
        let mx = x[i], mz = z[i] - 3;
        const ml = Math.sqrt(mx * mx + mz * mz) + 1e-4;
        mx /= ml; mz /= ml;
        let kx = 0.8 * bx + 0.6 * mx, kz = 0.8 * bz + 0.6 * mz;
        const kl = Math.sqrt(kx * kx + kz * kz) + 1e-4, up = -vin * e;
        kx *= Noodles.KICK * up / kl; kz *= Noodles.KICK * up / kl;
        oy[i] = y[i] - up * h;
        ox[i] = x[i] - (vx * 0.7 + kx) * h; oz[i] = z[i] - (vz * 0.7 + kz) * h;
        this.springBack(i, e, kx, kz, h);
        if (e > 0.3) this.landings++;
      } else {
        // resting or sliding: no way down, and the floor's friction
        oy[i] = y[i];
        ox[i] += (x[i] - ox[i]) * 0.12; oz[i] += (z[i] - oz[i]) * 0.12;
      }
    }
  }

  // Strand of bead i springs back off what it hit hard there, as an al dente noodle would rather
  // than piling up on itself: whatever of it is falling turns round by e, the far end less, and
  // the near part is kicked sideways (kx, kz units/s) too, so it tumbles. Once a fifth of a second,
  // and only once it's out of the machine (hanging, it's being fed down, not falling).
  springBack(i, e, kx, kz, h) {
    const { y, ox, oy, oz, w, beads } = this, s = (i / beads) | 0;
    if (this.clock - this.bounced[s] < 0.2 || e < 0.3 || w[(s + 1) * beads - 1] === 0 || this.steered[s]) return;
    this.bounced[s] = this.clock;
    for (let b = s * beads; b < (s + 1) * beads; b++) {
      const k = Math.abs(b - i) / beads, vb = (y[b] - oy[b]) / h;
      if (b !== i && w[b] > 0 && vb < 0) {
        const f = 1 - 0.6 * k, near = f * f;
        oy[b] = y[b] + vb * e * f * h;
        ox[b] -= kx * near * h; oz[b] -= kz * near * h;
      }
    }
  }

  // bead i pushed out of a box (BOXES from o: min x y z, max x y z), the shortest way; on its top,
  // some friction
  box(i, o) {
    const { x, y, z, ox, oz } = this, R = Noodles.R, b = BOXES, px = x[i], py = y[i], pz = z[i];
    if (px <= b[o] - R || px >= b[o + 3] + R || py <= b[o + 1] - R || py >= b[o + 4] + R || pz <= b[o + 2] - R || pz >= b[o + 5] + R) return;
    let k = 0, d = px - b[o] + R, e = b[o + 3] + R - px;
    if (e < d) { d = e; k = 1; }
    e = py - b[o + 1] + R; if (e < d) { d = e; k = 2; }
    e = b[o + 4] + R - py; if (e < d) { d = e; k = 3; }
    e = pz - b[o + 2] + R; if (e < d) { d = e; k = 4; }
    e = b[o + 5] + R - pz; if (e < d) k = 5;
    switch (k) {
      case 0: x[i] = b[o] - R; break;
      case 1: x[i] = b[o + 3] + R; break;
      case 2: y[i] = b[o + 1] - R; break;
      case 3: y[i] = b[o + 4] + R; ox[i] += (x[i] - ox[i]) * 0.1; oz[i] += (z[i] - oz[i]) * 0.1; break;
      case 4: z[i] = b[o + 2] - R; break;
      default: z[i] = b[o + 5] + R;
    }
  }
}

const H = 1 / 180; // a step
const ZERO = [0, 0, 0];
// the table's top, the machine's body and the table's legs (Pasta.h's boxes): min x y z, max x y z
const BOXES = [-22, 43, -26, 22, 46, 0, -11, 46, -7, 11, 60, 6,
  ...[[-21, -25], [18, -25], [-21, -4], [18, -4]].flatMap(([x, z]) => [x, 0, z, x + 3, 43, z + 3])];
const CELLS = 16384;

// beads i and j toward rest apart by k of the way (both: either way; else only pushed apart)
function pull(x, y, z, w, i, j, rest, k, both) {
  const wi = w[i], wj = w[j];
  if (wi + wj === 0) return;
  const dx = x[j] - x[i], dy = y[j] - y[i], dz = z[j] - z[i], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d < 1e-6 || (!both && d >= rest)) return;
  const c = (d - rest) / d * k / (wi + wj);
  x[i] += dx * c * wi; y[i] += dy * c * wi; z[i] += dz * c * wi;
  x[j] -= dx * c * wj; y[j] -= dy * c * wj; z[j] -= dz * c * wj;
}
// a place's cell along one axis, and a cell's place in the hash
const grid = (v) => (v > -1e6 && v < 1e6 ? Math.floor(v) : 0);
const hash = (gx, gy, gz) => (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663) ^ Math.imul(gz, 83492791)) & (CELLS - 1);
function smooth(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// What's heard (the pasta fills it from the engine each frame); its fields are in the comment at the top.
class Groove {
  t = 0; beat = null; P = 0.5;
  kick = -10; snare = -10; hat = -10; openHat = -10; bass = -10; bassF0 = 60; drop = -99;
  level = 0; silent = true; fourOnFloor = false; calm = false;
}

// along the floor the way toward the eye and the screen's right
const EYE = { x: 0.70710678, z: 0.70710678 }, RIGHT = { x: 0.70710678, z: -0.70710678 };

// The spaghetti's dancers: a few of the noodles lying on the floor come alive as snakes and dance
// to what's heard, while the rest lie there and hop on the kick (Noodles.hop). A dancer rears up in
// an S, its head and the top of its neck held out level, and dances the way a crowd in a club does:
// everyone on the beat, nobody alike. Each part of the music has its move: the beat bounces its head
// and sways it, the kick dips it, the snare hits a pose it holds, a bass note rolls up its body from
// the tail (deeper notes, bigger rolls), a drop crouches it and throws it up in a jump, and a
// breakdown stands it tall, swaying slowly, looking up. The hats it lets go by: a rattle on every one
// blurred the beat. Each rides one part hardest (the kick, the snare or the bass) and has its own
// ways: how big and how sharp, a bounce each beat or each two, which beats of the bar it hits harder,
// a nodder or a swayer, how its body curls; all of them on the beat. Where they dance goes with the
// kind of beat, at a bar line once the beat's held two bars (a drop at once), always loose and facing
// every way: spread over the floor for a kick on every beat, a ring round a soloist (another each two
// bars, the two trading places) for a broken beat with a snare, little groups facing in when it's
// sparser, close together when the kick's gone, flung wide on a drop; one coming alive takes a free
// place, the rest staying put; and every few bars each turns to someone else or shifts where it
// stands. They set off each in its own time, and most of the time they dance, not crawl, crawling
// there like an inchworm, a stride each two beats: its middle pinched up in a tall Ω on one, laid
// flat a stride on by the next. It steers its strand's beads (Noodles.aim) rather than placing them,
// so they're still noodles: they bump the others, flop, and fall back when they jump.
export class Dancers {
  static MOST = 6; // dancing at once
  static Groove = Groove;

  constructor(noodles) {
    this.noodles = noodles;
    // where they dance: spread loose over the floor ('crowd'), a ring round a soloist ('cypher'),
    // little groups facing in ('groups'), close together ('huddle'), flung wide ('burst')
    this.shape = 'huddle';
    this.dancers = []; this.leaving = []; // (those lying down again, lowering themselves)
    this.heard = new Groove(); this.next = 0; this.bar = -1; this.solo = 0;
    this.pending = 'huddle'; this.pendingBars = 0; // (the shape the beat's asked for, and for how many bar lines)
    this.mid = { x: -8, z: 26 }; // the middle of where they dance
  }

  get count() { return this.dancers.length; }
  get travelling() { return this.dancers.filter((d) => d.moving).length; }

  clear() {
    for (const d of [...this.dancers, ...this.leaving]) { this.noodles.steered[d.s] = false; this.noodles.swell[d.s] = 0; }
    this.dancers = []; this.leaving = []; this.heard = new Groove(); this.next = 0; this.bar = -1; this.shape = 'huddle'; this.mid = { x: -8, z: 26 };
  }

  // A frame, dt seconds on; rank(s): how new strand s's sheet is (higher, newer; 0: it's shrinking
  // away, so it may not dance)
  update(g, dt, rank) {
    const n = this.noodles, MOST = Dancers.MOST;
    this.dancers = this.dancers.filter((d) => {
      if (n.alive[d.s] && rank(d.s) > 0) return true;
      d.leaving = true; this.leaving.push(d);
      return false;
    });
    this.leaving = this.leaving.filter((d) => {
      if (n.alive[d.s] && d.awake > 0) return true;
      n.steered[d.s] = false; n.swell[d.s] = 0;
      return false;
    });
    const barP = 4 * g.P, dropped = g.drop !== this.heard.drop && g.t - g.drop < 1; // (not one from before it started)
    const noKick = g.t - g.kick > 2 * barP, breakdown = noKick && !g.silent && g.beat != null;
    // more come alive while there's music, one each two beats, from the newest sheet; with all of
    // them up, one from an older sheet lies down again for one from a newer each four bars (so a
    // sheet going takes few with it); on a drop as many as can, at once. (Looked for every 0.3 s,
    // not each beat: just after the kick the ones lying there are all hopping.)
    const joined = [];
    if (!g.silent && (g.t >= this.next || dropped)) {
      this.next = g.t + 0.3;
      for (let s = this.pick(rank); s !== null; s = this.pick(rank)) {
        if (this.dancers.length >= MOST) {
          if (dropped) break;
          const old = this.dancers.reduce((a, d) => (rank(d.s) < rank(a.s) ? d : a));
          if (!(rank(old.s) < rank(s))) break;
          old.leaving = true; this.leaving.push(old); this.dancers = this.dancers.filter((d) => d !== old);
        }
        const d = new Dancer(s, n);
        this.dancers.push(d); joined.push(d);
        n.steered[s] = true;
        this.next = g.t + (this.dancers.length < MOST ? 2 : 16) * g.P;
        if (!dropped) break;
      }
    }
    // what's just been heard (each takes it in its own time and as much as it hears that part)
    if (g.kick !== this.heard.kick) for (const d of this.dancers) if (g.t - d.kickAt > 0.2) d.kickAt = g.t; // (one dip at a time: started again, it jumped)
    if (g.snare !== this.heard.snare) for (const d of this.dancers) d.hit(g.t, g.P);
    if (g.bass !== this.heard.bass) { // (one roll at a time, likewise)
      const r = Math.min(1.2, Math.max(0.5, 1.6 - g.bassF0 / 90));
      for (const d of this.dancers) if (g.t - d.rollAt > 1) { d.rollAt = g.t; d.roll = r; }
    }
    if (dropped) for (const d of this.dancers) d.jumpAt = g.t + 0.2 + rnd(0, 0.15);
    Object.assign(this.heard, g); // (a copy: the caller may fill the same one in again)
    // the shape for the kind of beat, changed at a bar line once it's held two (on a drop, at once:
    // a beat flickering between kinds had them crawling about all the time); between, the ring's
    // soloist handing over each two bars, and every few bars each turning or shifting on its own
    const wanted = g.silent || g.beat == null ? 'huddle' : g.t - g.drop < 4 * barP ? 'burst' : noKick ? 'huddle'
      : g.fourOnFloor ? 'crowd' : g.t - g.snare < 2 * barP ? 'cypher' : 'groups';
    const now = g.beat != null ? Math.floor(g.beat / 4) : Math.floor(g.t / 2);
    let reshaped = false;
    if (now !== this.bar || dropped) {
      const newBar = now !== this.bar;
      this.bar = now;
      if (newBar) { if (wanted === this.pending) this.pendingBars++; else { this.pending = wanted; this.pendingBars = 1; } }
      if (wanted !== this.shape && (this.pendingBars >= 2 || dropped || this.dancers.length === joined.length)) { this.shape = wanted; reshaped = true; this.layout(true); }
      else if (newBar && this.shape === 'cypher' && now % 2 === 0) this.handOver();
      else if (newBar) for (const d of this.dancers) if (now >= d.fidgetAt) { this.fidget(d); d.fidgetAt = now + rnd(2, 5); }
    }
    if (joined.length && !reshaped) this.layout(this.dancers.length === joined.length, joined);
    for (const d of this.dancers) d.dance(g, dt, breakdown, n);
    for (const d of this.leaving) d.dance(g, dt, breakdown, n);
  }

  // a strand lying on the open floor (not under the table, not near the edge; on others will do,
  // and hopping on the kick, but not falling), any of the newest sheet's
  pick(rank) {
    const n = this.noodles, P = n.beads, { x, y, z, ox, oy, oz, w } = n;
    let found = [], best = 1;
    for (let s = 0; s < n.strands; s++) {
      if (!n.alive[s] || n.steered[s]) continue;
      const r = rank(s);
      if (r < best) continue;
      let still = true;
      for (let i = s * P; i < (s + 1) * P; i++) {
        const vx = x[i] - ox[i], vy = y[i] - oy[i], vz = z[i] - oz[i], v = vx * vx + vy * vy + vz * vz;
        if (w[i] === 0 || y[i] > 2.2 || v > 3.6e-3 || x[i] * x[i] > 44 * 44 || z[i] * z[i] > 44 * 44 || (z[i] < 2 && x[i] * x[i] < 25 * 25)) { still = false; break; }
      }
      if (still) { if (r > best) { best = r; found = []; } found.push(s); }
    }
    return found.length ? found[Math.floor(Math.random() * found.length)] : null;
  }

  // the ring's soloist hands over to the next: the two trade places, the rest stay put
  handOver() {
    this.solo++;
    const old = this.dancers.find((d) => d.big > 1);
    if (this.dancers.length <= 1 || !old) return;
    const next = this.dancers[this.solo % this.dancers.length];
    if (next === old) return;
    [old.spot, next.spot] = [next.spot, old.spot]; [old.big, next.big] = [next.big, old.big];
    next.faceA = Dancers.aside(Math.PI / 4 + rnd(-1, 1));
    old.faceA = Dancers.aside(Math.atan2(next.spot.z - old.spot.z, next.spot.x - old.spot.x) + rnd(-0.35, 0.35));
    old.wait = irnd(0, 2); next.wait = irnd(0, 1);
  }

  // now and then one turns to someone else, to the eye, or just a little, and may shift a step
  fidget(d) {
    const roll = Math.random(), others = this.dancers.filter((o) => o !== d);
    if (roll < 0.45 && others.length) {
      const o = others[Math.floor(Math.random() * others.length)];
      d.faceA = Math.atan2(o.spot.z - d.spot.z, o.spot.x - d.spot.x) + rnd(-0.3, 0.3);
    } else if (roll < 0.7) d.faceA = Math.PI / 4 + rnd(-0.8, 0.8); else d.faceA += rnd(-0.9, 0.9);
    d.faceA = Dancers.aside(d.faceA);
    if (Math.random() < 0.35) { d.spot.x += rnd(-2.5, 2.5); d.spot.z += rnd(-2.5, 2.5); }
  }

  // Where on the floor in front of the table there's most room (the fewest noodles lying within
  // 13), a little toward its middle; somewhere else only if it's much roomier than where they are.
  room() {
    const n = this.noodles, { x, y, z, w } = n, P = n.beads;
    const crowd = (cx, cz) => {
      let c = 0;
      for (let s = 0; s < n.strands; s++) {
        if (!n.alive[s] || n.steered[s]) continue;
        for (let i = s * P; i < (s + 1) * P; i++) {
          const dx = x[i] - cx, dz = z[i] - cz;
          if (w[i] > 0 && y[i] < 2 && dx * dx + dz * dz < 13 * 13) c++;
        }
      }
      return c + 0.5 * Math.sqrt(cx * cx + (cz - 20) * (cz - 20));
    };
    let best = this.mid, least = Infinity;
    for (let gx = -32; gx <= 32; gx += 8) for (let gz = 6; gz <= 38; gz += 8) { const c = crowd(gx, gz); if (c < least) { least = c; best = { x: gx, z: gz }; } }
    if (crowd(this.mid.x, this.mid.z) > 1.5 * least + 20) this.mid = best;
  }

  // Each dancer's spot in the shape and the way it faces, loose: the spots strewn round where
  // there's room (looked for again for a new shape), each taken by the nearest dancer still
  // without one (the ring's middle by its soloist), then each facing the way its shape has it,
  // give or take, and setting off in its own time. Only some placed (those just come alive): they
  // take the spots furthest from where the rest are.
  layout(fresh, only = null) {
    const dancers = this.dancers, n = dancers.length, shape = this.shape;
    if (n === 0) return;
    if (fresh && shape !== 'burst') this.room();
    const M = this.mid, R = RIGHT, E = EYE, eye = Math.PI / 4;
    const place = (a, b) => ({ x: clamp(M.x + R.x * a + E.x * b, -40, 40), z: clamp(M.z + R.z * a + E.z * b, -40, 40) });
    // count places in a disc (radius r round a, b: along the screen's right, toward the eye), at
    // least gap apart where that can be found
    const scatter = (count, a, b, r, gap) => {
      const out = [];
      for (let c = 0; c < count; c++) {
        let best = place(a, b), bestGap = -1;
        for (let t = 0; t < 24; t++) {
          const ang = rnd(0, 2 * Math.PI), d = r * Math.sqrt(Math.random()), p = place(a + d * Math.cos(ang), b + d * Math.sin(ang));
          let near = Infinity;
          for (const q of out) near = Math.min(near, Math.hypot(q.x - p.x, q.z - p.z));
          if (near > bestGap) { best = p; bestGap = near; }
          if (near >= gap) break;
        }
        out.push(best);
      }
      return out;
    };
    const toward = (p, q, give) => Math.atan2(q.z - p.z, q.x - p.x) + rnd(-give, give);
    let spots = [];
    const middles = [];
    switch (shape) {
      case 'crowd': spots = scatter(n, 0, 0, 14, 7); break;
      case 'burst': { // (a few steps out from where each is, from their middle)
        let cx = 0, cz = 0;
        for (const d of dancers) { cx += d.tx[0] / n; cz += d.tz[0] / n; }
        spots = dancers.map((d) => {
          const dx = d.tx[0] - cx, dz = d.tz[0] - cz, l = Math.max(0.5, Math.hypot(dx, dz));
          return { x: clamp(d.tx[0] + dx / l * 7, -40, 40), z: clamp(d.tz[0] + dz / l * 7, -40, 40) };
        });
        break;
      }
      case 'huddle': spots = scatter(n, 0, -2, 6.5, 4.5); break;
      case 'cypher': {
        spots = [place(0, 0)];
        const r = 8 + n, a0 = rnd(0, 2 * Math.PI);
        for (let i = 1; i < n; i++) {
          const a = a0 + 2 * Math.PI * (i - 1 + rnd(-0.25, 0.25)) / (n - 1), rr = r + rnd(-1.5, 1.5);
          spots.push(place(rr * Math.cos(a), rr * Math.sin(a)));
        }
        break;
      }
      case 'groups': {
        const k = Math.max(1, n >> 1), centres = scatter(k, 0, 0, 15, 13), turns = centres.map(() => rnd(0, 2 * Math.PI));
        for (let i = 0; i < n; i++) {
          const g = i % k, size = Math.floor((n - g + k - 1) / k), a = turns[g] + 2 * Math.PI * Math.floor(i / k) / size + rnd(-0.3, 0.3);
          spots.push({ x: centres[g].x + 3.5 * Math.cos(a), z: centres[g].z + 3.5 * Math.sin(a) }); middles.push(centres[g]);
        }
        break;
      }
    }
    const mid = { x: 0, z: 0 };
    for (const p of spots) { mid.x += p.x / n; mid.z += p.z / n; }
    const free = (only ?? dancers).slice();
    let order = spots.map((_, k) => k);
    if (only) {
      const others = dancers.filter((d) => !only.includes(d));
      const clear = (k) => (others.length ? Math.min(...others.map((o) => (o.spot.x - spots[k].x) ** 2 + (o.spot.z - spots[k].z) ** 2)) : 0);
      order = order.sort((a, b) => clear(b) - clear(a)).slice(0, only.length);
    }
    for (const k of order) {
      const p = spots[k];
      let at = 0;
      if (shape === 'cypher' && k === 0 && !only) at = this.solo % n;
      else {
        let best = Infinity;
        free.forEach((d, j) => {
          const dx = d.tx[0] - p.x, dz = d.tz[0] - p.z;
          if (dx * dx + dz * dz < best) { best = dx * dx + dz * dz; at = j; }
        });
      }
      const d = free.splice(at, 1)[0];
      d.spot = p;
      d.big = shape === 'cypher' ? (k === 0 ? 1.4 : 0.85) : 1;
      const roll = Math.random();
      switch (shape) {
        case 'crowd': d.faceA = roll < 0.4 ? toward(p, mid, 0.6) : roll < 0.75 ? eye + rnd(-0.8, 0.8) : toward(p, spots[(k + 1) % n], 0.4); break;
        case 'burst': d.faceA = toward(mid, p, 0.6); break; // (outward)
        case 'huddle': d.faceA = roll < 0.7 ? toward(p, mid, 0.7) : eye + rnd(-0.6, 0.6); break;
        case 'cypher': d.faceA = k === 0 ? eye + rnd(-1, 1) : toward(p, spots[0], 0.35); break;
        case 'groups': d.faceA = toward(p, middles[k], 0.3); break;
      }
      d.faceA = Dancers.aside(d.faceA);
      d.fidgetAt = this.bar + rnd(2, 5);
      d.wait = shape === 'burst' ? irnd(0, 1) : irnd(0, 2);
    }
  }

  // a way to face turned off straight at the eye or straight away from it, to three quarters at
  // least (seen end on, a snake's S doesn't show)
  static aside(a) {
    const e = wrap(a - Math.PI / 4), ae = Math.abs(e), f = ae < 0.5 ? 0.5 : ae > Math.PI - 0.5 ? Math.PI - 0.5 : ae;
    return Math.PI / 4 + (e < 0 ? -f : f);
  }
}

// One snake: its strand's beads m from its head rear up as its neck, the rest lie along the floor
// behind it (its trail, where its neck's been), following it as it slithers.
class Dancer {
  constructor(s, n) {
    this.s = s;
    this.m = irnd(26, 29); // (two thirds of it up, the rest along the floor)
    // its ways, so no two dance alike: how far behind the beat (s, a hair at most: on the beat), how
    // big, how sharp (0 smooth, 1 popping), how tall; beats a bounce takes, how hard on each beat of
    // the bar; a nodder (0) or a swayer (1), how much its chest pumps, beats a sway takes; how much
    // it hears each part (the one it rides 1, the rest less); how far back its neck leans in the
    // middle and how much of it the S's lower bowl takes, how far down its head ends, its sideways
    // curl, which way its first snare pose goes, and the phases of its own slow drift
    this.lag = rnd(0, 0.015); this.size = rnd(0.75, 1.25); this.sharp = rnd(0, 1); this.tall = rnd(0.92, 1.08);
    this.every = oneOf([1, 1, 1, 2]);
    this.accent = [0, 1, 2, 3].map(() => rnd(0.45, 1));
    this.accent[irnd(0, 3)] = 1;
    this.style = rnd(0, 1); this.pump = rnd(0, 0.25); this.sway = oneOf([2, 4, 4, 8]);
    const rides = irnd(0, 2), w = [0, 1, 2].map((k) => (k === rides ? 1 : rnd(0.2, 0.55)));
    this.ear = { kick: w[0], snare: w[1], bass: w[2] };
    this.back = rnd(2.45, 2.6); this.low = rnd(0.36, 0.42); this.droop = rnd(0.15, 0.3); this.curl = rnd(-0.35, 0.35); this.flip = Math.random() < 0.5;
    this.drift = [0, 1, 2, 3, 4, 5].map(() => rnd(0, 2 * Math.PI));
    // the trail (x, z), from where the neck rises back, L apart
    const b = s * n.beads;
    this.tx = []; this.tz = [];
    for (let j = this.m; j < n.beads; j++) { this.tx.push(n.x[b + j]); this.tz.push(n.z[b + j]); }
    const { tx, tz } = this, c = tx.length, ex = tx[c - 1] - tx[c - 2], ez = tz[c - 1] - tz[c - 2];
    for (let k = 1; k <= 2; k++) { tx.push(tx[c - 1] + ex * k); tz.push(tz[c - 1] + ez * k); } // (on past its tail a little)
    // which way it's going (radians in x z); crawling: how much (0-1), the stride it's on (two beats
    // each), how big a one (1 a whole; shorter near its spot), the end it has on the floor (x, z) and
    // whether that's its head (or its tail)
    this.head = Math.atan2(tz[0] - tz[1], tx[0] - tx[1]);
    this.moving = false; this.movedFor = 0; this.crawl = 0; this.lap = 0; this.stride = 1;
    this.foot = { x: 0, z: 0 }; this.onHead = false;
    // strides it waits before setting off, and whether its strides start on the beats between (so
    // they don't all go at once)
    this.wait = 0;
    this.half = Math.random() < 0.5;
    // its body's sideways bends crawling (dead straight it looked stiff): the last stride's and this
    // one's, each a big soft one and a smaller ripple (how much, how many, where along it), random
    this.bendWas = someBends(); this.bendIs = someBends();
    // its spot, the way it faces there (radians in x z), how big its part (a soloist bigger), the
    // bar it next fidgets
    this.spot = { x: 0, z: 0 }; this.faceA = Math.PI / 4; this.big = 1; this.fidgetAt = 0;
    this.awake = 0; this.rise = 0; this.turn = 0; this.leaving = false;
    // the snare's poses (look, lean, bend): from, to, when; how long one's held; snares so far
    this.from = [0, 0, 0]; this.to = [0, 0, 0]; this.hitAt = -10; this.holdFor = 1.5; this.hits = 0;
    this.kickAt = -10; this.rollAt = -10; this.roll = 0; this.jumpAt = -10;
  }

  // a snare at t: into its next pose (its own; one way, then the other) from wherever it is
  hit(t, P) {
    this.hits++;
    const seed = this.hits * 31 + this.s * 977, side = (this.hits % 2 === 0) === this.flip ? 1 : -1;
    this.from = this.pose(t - this.lag);
    this.to = [side * (0.3 + 0.45 * hash01(seed, 1)), side * (0.08 + 0.2 * hash01(seed, 2)), -0.25 + 0.5 * hash01(seed, 3)];
    this.hitAt = t; this.holdFor = 3 * P;
  }
  // the pose at its own time tl: eased in (quicker the sharper it is), held, slowly let go
  pose(tl) {
    const { from, to } = this;
    const x = (tl - this.hitAt) / (0.06 + 0.15 * (1 - this.sharp)), e = x >= 1 ? 1 : x <= 0 ? 0 : 1 - (1 - x) * (1 - x) * (1 - x);
    const hold = Math.exp(-Math.max(0, tl - this.hitAt) / this.holdFor);
    return [(from[0] + (to[0] - from[0]) * e) * hold, (from[1] + (to[1] - from[1]) * e) * hold, (from[2] + (to[2] - from[2]) * e) * hold];
  }

  // A frame: to its spot if it's away, turning to the way it's to face, and the dance, as aims for
  // its beads.
  dance(g, dt, breakdown, n) {
    const L = Noodles.L, R = Noodles.R, tl = g.t - this.lag, T = tl % 3600, { tx, tz, m, spot, foot } = this;
    this.awake = this.leaving ? Math.max(0, this.awake - dt / 1.2) : Math.min(1, this.awake + dt / 1.5);
    n.swell[this.s] = this.awake;
    // crawling to its spot like an inchworm, a stride each two beats, all of it lying down: from flat
    // on the first beat its middle pinches up into a tall Ω by the second, its head staying put and
    // its tail drawn up behind it; then its tail stays put and the Ω unrolls, its front lifted and
    // reached on (turning to where it's going as it is), laid flat a stride on by the next. It
    // starts and stops only lying flat, as a stride begins; the last stride short, for what's left;
    // a step or two it shuffles instead, standing. It comes at its spot a little from behind.
    const dx = spot.x - tx[0], dz = spot.z - tz[0], dist = Math.hypot(dx, dz), lying = n.beads - m;
    const b = g.beat != null ? g.beat - this.lag / g.P : tl / 0.6, sb = b + (this.half ? 1 : 0), e = (sb / 2 - Math.floor(sb / 2)) * 2; // (0-1 gathering, 1-2 reaching)
    if (this.moving) this.movedFor += dt;
    if (this.leaving && this.moving) { this.moving = false; foot.x = tx[lying - 1]; foot.z = tz[lying - 1]; this.onHead = false; }
    if (Math.floor(sb / 2) !== this.lap) {
      this.lap = Math.floor(sb / 2);
      const ready = !this.moving && dist > 4 && !this.leaving && this.awake > 0.5;
      if (this.moving && (dist < 3 || this.movedFor > 14)) this.moving = false;
      else if (ready && this.wait > 0) this.wait--;
      else if (ready) { this.moving = true; this.movedFor = 0; foot.x = tx[lying - 1]; foot.z = tz[lying - 1]; this.onHead = false; }
      if (this.moving) { // (a short stride to turn in when where it's going is off to its side or behind: else it went round it)
        const off = Math.abs(wrap(Math.atan2(spot.z - foot.z, spot.x - foot.x) - this.head));
        this.stride = Math.min(1, Math.max(0.35, dist / 14)) * Math.max(0.35, Math.cos(Math.min(off, Math.PI / 2)));
        this.bendWas = this.bendIs; this.bendIs = someBends();
      }
    }
    if (!this.moving && dist > 0.3 && this.awake > 0.5 && !this.leaving && this.crawl < 0.05) { // (shuffling)
      const by = Math.min(dist, 1.5 * dt) / dist;
      for (let k = 0; k < tx.length; k++) { tx[k] += dx * by; tz[k] += dz * by; }
    }
    this.crawl += ((this.moving ? 1 : 0) - this.crawl) * Math.min(1, dt * 4);
    // its body crawling (cx, cy, cz, from its head; only while it is), and the trail laid out
    // straight behind where its neck will rise from, from its tail's end (stopped, the other way:
    // lying flat along the trail as it turns there)
    const cx = [], cy = [], cz = [];
    if (!this.moving) { foot.x = tx[lying - 1]; foot.z = tz[lying - 1]; this.onHead = false; }
    if (this.crawl > 0.001) {
      const bends = this.moving ? strideBends(e, this.stride) : [0, 0, 0], body = inchworm(bends[0], bends[1], bends[2], n.beads, L), last = n.beads - 1;
      // (laid out along it from its tail, each segment the way its bends turn it: as it's shaped, and
      // as it'd lie flat; the bends going over to this stride's as it goes)
      const ax = new Array(n.beads).fill(0), az = ax.slice(), fx = ax.slice(), fz = ax.slice();
      const w = this.moving ? Math.min(1, e / 2) : 1, mix = w * w * (3 - 2 * w);
      for (let q = 1; q < n.beads; q++) {
        const u = (q - 0.5) / last;
        const yaw = (k) => k[0] * Math.sin(Math.PI * u * k[1] + k[2]) + k[3] * Math.sin(Math.PI * u * k[4] + k[5]);
        const was = yaw(this.bendWas), way = this.head + was + (yaw(this.bendIs) - was) * mix;
        const c = Math.cos(way), sn = Math.sin(way), h = body.x[q] - body.x[q - 1];
        ax[q] = ax[q - 1] + c * h; az[q] = az[q - 1] + sn * h; fx[q] = fx[q - 1] + c * L; fz[q] = fz[q - 1] + sn * L;
      }
      if (this.moving && e < 1 && !this.onHead) { foot.x += ax[last]; foot.z += az[last]; this.onHead = true; }
      if (this.moving && e >= 1 && this.onHead) { foot.x -= ax[last]; foot.z -= az[last]; this.onHead = false; }
      if (this.moving && e >= 1) { // (its front in the air: turning, from its tail, which is where it stands)
        const lead = Math.min(dist * 0.5, 3), gx = spot.x - Math.cos(this.faceA) * lead - foot.x, gz = spot.z - Math.sin(this.faceA) * lead - foot.z;
        if (gx * gx + gz * gz > 4) { const spin = 4 * dt; this.head += clamp(wrap(Math.atan2(gz, gx) - this.head), -spin, spin); }
      }
      const fromX = this.onHead ? ax[last] : 0, fromZ = this.onHead ? az[last] : 0;
      for (let j = 0; j < n.beads; j++) {
        const q = last - j;
        cx.push(clamp(foot.x + ax[q] - fromX, -46, 46)); cy.push(R + body.y[q]); cz.push(clamp(foot.z + az[q] - fromZ, -46, 46));
      }
      if (this.moving) {
        for (let k = 0; k < tx.length; k++) {
          const q = lying - 1 - k, back = Math.max(0, -q); // (on past its tail a little)
          tx[k] = cx[last] + fx[Math.max(0, q)] - fx[1] * back; tz[k] = cz[last] + fz[Math.max(0, q)] - fz[1] * back;
        }
      }
    }
    // standing, it turns the way it's to face: its head first, its body on the floor swinging
    // round after it (about where its neck rises)
    const off = wrap(this.faceA - this.head);
    if (!this.moving && this.awake > 0.5 && !this.leaving) {
      const by = clamp(off * Math.min(1, dt * 1.5), -1.2 * dt, 1.2 * dt), c = Math.cos(by), sn = Math.sin(by);
      for (let k = 1; k < tx.length; k++) { const ax = tx[k] - tx[0], az = tz[k] - tz[0]; tx[k] = tx[0] + ax * c - az * sn; tz[k] = tz[0] + ax * sn + az * c; }
      this.head += by;
    }
    this.turn += ((this.moving ? 0 : clamp(off, -0.8, 0.8)) - this.turn) * Math.min(1, dt * 2.5);

    // how much it's feeling it: the louder the more; resting in silence, unsure without a tempo
    const felt = g.silent ? 0.15 : g.beat == null ? 0.35 : 0.55 + 0.45 * Math.min(1, g.level * 6);
    const amp = felt * this.size * this.big * (g.calm ? 0.55 : 1) * (1 - 0.6 * this.crawl);
    // the beat as it feels it: a bounce each of its beats (or between them), sharper the sharper
    // it is, harder on the beats of the bar it likes; a sway over its beats, slower through a
    // breakdown
    const sharp = this.sharp, q = b / this.every, ph = q - Math.floor(q), bar = Math.floor(b) % 4;
    const bounce = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 2 + 5 * sharp) * this.accent[bar < 0 ? bar + 4 : bar] * (this.every < 1 ? 0.6 : 1) * (breakdown ? 0.35 : 1);
    const at = 2 * Math.PI * b / (this.sway * (breakdown ? 2 : 1));
    const swing = (x) => (sharp > 0.5 ? Math.tanh(2 * Math.sin(x)) / Math.tanh(2) : Math.sin(x)); // (a popper sits at the ends, and goes between them quick but smooth)
    // the kick: a quick dip; a drop: a crouch, then a jump
    const kx = tl - this.kickAt, kick = kx < 0 ? 0 : (1 - Math.exp(-kx / 0.02)) * Math.exp(-kx / 0.11) * this.ear.kick;
    const jx = (tl - this.jumpAt) / 0.6, crouch = jx > -0.3 && jx < 0 ? (jx + 0.3) / 0.3 : jx >= 0 && jx < 0.2 ? 1 - jx / 0.2 : 0;
    const lift = jx >= 0 && jx < 1 ? 36 * jx * (1 - jx) * Math.min(1, amp + 0.4) : 0;
    // a bass note: a roll up its body, along the trail to the neck then up it (0-1 over 0.8 s)
    const rx = (tl - this.rollAt) / 0.8, rolling = rx >= 0 && rx < 1.2, rolled = 0.6 * this.roll * amp * this.ear.bass;
    const up = this.leaving ? 0 : g.silent ? 0.12 : this.moving ? 0.5 : this.tall * (breakdown ? 1.12 : 1) * (this.big > 1 ? 1.06 : 1);
    this.rise += (up - this.rise) * Math.min(1, dt * 3);
    const r = this.rise * Math.min(1, this.awake * 1.5) * (1 - 0.08 * bounce * amp - 0.35 * kick * amp - 0.45 * crouch);
    const p = this.pose(tl), hit = amp * this.ear.snare, drift = this.drift;
    // a nodder's head bobs, a swayer's goes side to side; it looks about
    const nod = -(0.08 + 0.24 * (1 - this.style)) * bounce * amp + (breakdown ? 0.3 : 0) + 0.06 * Math.sin(0.71 * T + drift[3]);
    const look = p[0] * hit + 0.12 * amp * Math.sin(at - 1.8) + 0.28 * Math.sin(0.21 * T + drift[0]) + 0.12 * Math.sin(0.57 * T + drift[4]);
    const bend = p[2] * hit + this.pump * bounce * amp + 0.05 * Math.sin(0.53 * T + drift[1]);
    const swayBy = (0.06 + 0.22 * this.style) * amp, hip = -(0.2 + 0.5 * this.style) * amp * swing(at); // (the base of its neck the other way to its head)

    const b0 = this.s * n.beads, kNeck = 0.22 * this.awake, kTail = 0.14 * this.awake, aim = n.aim;
    const c = cx.length ? this.crawl * this.crawl * (3 - 2 * this.crawl) : 0;
    const set = (j, x, y, z, k) => {
      const i = 4 * (b0 + j);
      aim[i] = c > 0 ? x + (cx[j] - x) * c : x; aim[i + 1] = c > 0 ? y + (cy[j] - y) * c : y; aim[i + 2] = c > 0 ? z + (cz[j] - z) * c : z; aim[i + 3] = k;
    };
    // the neck, segment by segment from the floor up, an S standing tall (🐍), its bowls round
    // (each bent evenly): the lower one forward and up off the floor and on round, leaning back
    // through the middle, the upper one over forward again, and the head going on round a little,
    // down, its tip about over the lower bowl (the pasta draws the head thicker); curled a little
    // sideways too, its own way
    const { head, low, back, droop, curl } = this;
    let px = tx[0] - Math.sin(head) * hip, py = R + lift, pz = tz[0] + Math.cos(head) * hip;
    set(m, px, py, pz, kNeck);
    for (let i = 0; i < m; i++) {
      const u = (i + 0.5) / m, spine = low + 0.25, over = ss(spine, spine + 0.2, u);
      let th = r * (back * lin(0, low, u) - 0.2 * lin(low, spine, u) - (back - 0.3) * lin(spine, spine + 0.2, u) - (0.1 + droop) * lin(spine + 0.2, 1, u))
        + nod * ss(spine + 0.1, 1, u) + bend * u;
      if (rolling) { const v = (u - (rx - 0.4) / 0.6 * 1.2 + 0.1) / 0.16; th += 0.9 * rolled * v * Math.exp(-v * v); }
      const yaw = head + this.turn * ss(0, 0.5, u) + (look + 0.6 * curl * Math.sin(4 * u + drift[5])) * over;
      const lean = swayBy * swing(at - 1.3 * u) + p[1] * hit * u + curl * Math.sin(5.6 * u + drift[5]) * (1 - over) + 0.05 * Math.sin(0.43 * T + drift[2]); // (its head behind its shoulders: a whip)
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw), ct = Math.cos(th);
      const ux = cyaw * ct - syaw * lean, uy = Math.sin(th), uz = syaw * ct + cyaw * lean, l = Math.sqrt(ux * ux + uy * uy + uz * uz);
      px += ux / l * L; py = Math.max(R, py + uy / l * L); pz += uz / l * L;
      set(m - 1 - i, px, py, pz, kNeck);
    }
    // the rest along the trail in an S of its own, swishing its tail against the sway
    let seg = 0, walked = 0, sx = 0, sz = 0, sl = 0;
    for (let k = 1; k < lying; k++) {
      const want = k * L;
      for (;;) {
        sx = tx[seg + 1] - tx[seg]; sz = tz[seg + 1] - tz[seg]; sl = Math.sqrt(sx * sx + sz * sz);
        if (walked + sl >= want || seg + 2 >= tx.length) break;
        walked += sl; seg++;
      }
      const f = sl > 1e-4 ? (want - walked) / sl : 0, ux = sl > 1e-4 ? -sx / sl : Math.cos(head), uz = sl > 1e-4 ? -sz / sl : Math.sin(head);
      const along = k / (lying - 1);
      const side = hip * Math.exp(-k / 4) + 1.4 * Math.sin(6 * along + drift[5]) * ss(0, 0.2, along) + 0.5 * amp * Math.sin(at + Math.PI + 0.35 * k) * ss(0.3, 1, along);
      let y = R + lift + 1.2 * ss(0.8, 1, along); // (its tail's tip curled up off the floor)
      if (rolling && rx < 0.5) { const v = (k - lying * (1 - rx / 0.45)) / 2.2; y += 1.1 * rolled * Math.exp(-v * v); }
      set(m + k, tx[seg] + sx * f - uz * side, y, tz[seg] + sz * f + ux * side, kTail);
    }
  }
}

function someBends() {
  return [(Math.random() < 0.5 ? 1 : -1) * rnd(0.15, 0.4), rnd(0.7, 1.4), rnd(0, 2 * Math.PI),
    (Math.random() < 0.5 ? 1 : -1) * rnd(0.05, 0.18), rnd(2, 3.5), rnd(0, 2 * Math.PI)];
}

// The inchworm's body seen side on (along, up) at each of count beads from its tail's end, L apart:
// a flat tail, its rear foot bent up by a (degrees), a leg, its top bent over by t, a leg, its front
// foot bent by f, a flat head. Flat at 0, 0, 0; the tall Ω, its feet nearly touching, at 100, 200, 100.
function inchworm(a, t, f, count, L) {
  const len = (count - 1) * L, k = len / 26.6, tail = 3 * k, front = 4.5 * k, rf = 0.9 * k, rt = 2.2 * k;
  const ar = a * Math.PI / 180, tr = t * Math.PI / 180, fr = f * Math.PI / 180;
  const legs = Math.max(0, len - tail - front - rf * Math.abs(ar) - rt * Math.abs(tr) - rf * Math.abs(fr)) / 2;
  const pieces = [[tail, 0], [rf * Math.abs(ar), ar < 0 ? -1 / rf : 1 / rf], [legs, 0], [rt * Math.abs(tr), tr < 0 ? 1 / rt : -1 / rt],
    [legs, 0], [rf * Math.abs(fr), fr < 0 ? -1 / rf : 1 / rf], [front, 0]];
  const xs = new Array(count).fill(0), ys = new Array(count).fill(0);
  let x = 0, y = 0, th = 0, s = 0, next = 1;
  for (const [l, c] of pieces) {
    if (l <= 0) continue;
    let done = 0;
    while (done < l - 1e-5 && next < count) {
      const d = Math.min(L / 8, l - done, next * L - s), mid = th + c * d / 2;
      x += Math.cos(mid) * d; y += Math.sin(mid) * d; th += c * d; s += d; done += d;
      if (s >= next * L - 1e-4) { xs[next] = x; ys[next] = y; next++; }
    }
  }
  while (next < count) { xs[next] = x; ys[next] = y; next++; } // (rounding)
  return { x: xs, y: ys };
}
// A stride's bends at e (0-1 gathering into the Ω, 1-2 reaching on from it), eased, through the
// sketch's poses on a smooth curve (Catmull-Rom; straight between them, it kinked at each);
// k: how big a stride (a shorter one is a lower Ω)
const REACH = [[100, 200, 100], [88, 155, 47], [68, 112, 19], [42, 64, 7], [16, 23, 2], [0, 0, 0]];
function strideBends(e, k) {
  const ease = (x) => x * x * x * (10 + x * (6 * x - 15)); // (still at both ends, and not speeding up yet)
  if (e < 1) { const w = ease(e) * 100 * k; return [w, 2 * w, w]; }
  const w = ease(e - 1) * 5, i = Math.min(4, Math.floor(w)), f = w - i;
  const p0 = REACH[Math.max(0, i - 1)], p1 = REACH[i], p2 = REACH[i + 1], p3 = REACH[Math.min(5, i + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f) * k;
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// 0-1 from a seed (a snare pose's own, the same for the same dancer and hit)
const hash01 = (seed, k) => (Math.imul(seed + k * 7919, 2654435761) >>> 16) / 65536;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // a to b, both ends
const oneOf = (list) => list[Math.floor(Math.random() * list.length)];
