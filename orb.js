// Orb: a cloud of soft dots in 3D, after libraries.dev's Thinking Orbs (Jakub Antalik and
// Alexandr Brinza), grown into a background the music plays. It holds a form for 8 bars and at the
// phrase every dot flows to its place in the next: a sphere, a glitch ball (the dots fading into a
// ball of neon streaks, after animoscillator's glitch orb: see glitchorb.js), a crystal (a cube of
// dots on its corner), orbit paths with their dots running round them, a staff the bass notes
// appear on as they're played, a spiral galaxy, a network its signals run through on the hats, a
// field of waves riding the spectrum, a sphere in slices that turn one a beat and then solve themselves (Thinking
// Orbs' moves, MIT licence, see THIRD-PARTY-NOTICES), a globe's lines, a ring breathing in slow
// lobes (Thinking Orbs' breathing), an icosahedron,
// rings swelling with their bands of the spectrum, a burst of rays, ripples on a disc, and an
// outline that changes shape on the bar. The kick breathes it out and back (the field of waves, a
// cloth, ripples and shivers instead), the clap spins it, the hats send a band of light round it,
// the bass swells the dots. Nearer dots are bigger and brighter. Drawn
// with WebGL: the dots move on the graphics card (the forms that move by themselves are worked out a
// frame at a time and handed over). Timed off the beat clock like the blocks.
import { createGlitch } from './glitchorb.js';

const N = 2200;
const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const frac = (x) => x - Math.floor(x);
const smoothE = (x) => x * x * (3 - 2 * x);
function hashD(a, b) { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); }
function fibDir(i, n) {
  const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

// ---------------------------------------------------------------- the forms (about unit size)
const FORMS = {
  sphere() {
    const p = new Float32Array(N * 3), g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), a = i * g;
      p.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    }
    return p;
  },
  // the glitch ball is drawn over a sphere of the dots, which fade out under it (see draw)
  glitch() { return FORMS.sphere(); },
  galaxy() {
    const p = new Float32Array(N * 3), r = rng(9);
    for (let i = 0; i < N; i++) {
      const t = Math.sqrt(i / N), arm = i % 3, spread = 0.32 * (1 - t) + 0.05;
      const a = t * TAU * 1.5 + (arm * TAU) / 3 + (r() - 0.5) * spread * 2, rad = 0.08 + 1.05 * t + (r() - 0.5) * 0.06;
      p.set([Math.cos(a) * rad, (r() - 0.5) * 0.14 * (1 - t), Math.sin(a) * rad], i * 3);
    }
    return p;
  },
  waves() {
    const p = new Float32Array(N * 3), cols = 55, rows = Math.ceil(N / cols);
    for (let i = 0; i < N; i++) {
      const cx = i % cols, cz = Math.floor(i / cols);
      p.set([((cx / (cols - 1)) * 2 - 1) * 1.35, 0, ((cz / (rows - 1)) * 2 - 1) * 0.9], i * 3);
    }
    return p;
  },
  rays() {
    const p = new Float32Array(N * 3), rays = 88, per = Math.ceil(N / rays), g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const k = i % rays, j = Math.floor(i / rays), y = 1 - (2 * (k + 0.5)) / rays, r = Math.sqrt(1 - y * y), a = k * g;
      const d = 0.28 + (0.85 * j) / per;
      p.set([Math.cos(a) * r * d, y * d, Math.sin(a) * r * d], i * 3);
    }
    return p;
  },
  // solving: a crystal, a cube of dots thirteen to a side, stood on its corner
  lattice() {
    const p = new Float32Array(N * 3), n = 13, c = Math.SQRT1_2, tilt = Math.atan(Math.SQRT1_2), ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < N; i++) {
      const k = Math.min(i, n * n * n - 1);
      let x = ((k % n) / (n - 1) - 0.5) * 1.15, y = ((Math.floor(k / n) % n) / (n - 1) - 0.5) * 1.15, z = (Math.floor(k / (n * n)) / (n - 1) - 0.5) * 1.15;
      [x, z] = [x * c - z * c, x * c + z * c];
      [y, z] = [y * ct - z * st, y * st + z * ct];
      p.set([x, y, z], i * 3);
    }
    return p;
  },
  // listening: a flat disc of rings, as round a drop in still water (the kick's ripple runs out
  // through them); each ring as many dots as its length wants
  ripple() {
    const p = new Float32Array(N * 3), rings = 16, R = Array.from({ length: rings }, (_, k) => 0.12 + (1.25 * k) / (rings - 1)), total = R.reduce((a, b) => a + b, 0);
    let i = 0;
    for (let k = 0; k < rings && i < N; k++) {
      const n = k === rings - 1 ? N - i : Math.round((N * R[k]) / total);
      for (let j = 0; j < n && i < N; j++, i++) { const a = (j / n) * TAU + k * 0.37; p.set([Math.cos(a) * R[k], 0, Math.sin(a) * R[k]], i * 3); }
    }
    return p;
  },
  // searching: a globe drawn in its lines, nine parallels and twelve meridians (the hats' band of
  // light sweeps round it like a scan)
  globe() {
    const p = new Float32Array(N * 3), half = Math.floor(N / 2), lat = 9, mer = 12;
    for (let i = 0; i < N; i++) {
      if (i < half) {
        const k = i % lat, j = Math.floor(i / lat), per = Math.ceil(half / lat), y = -0.8 + (1.6 * k) / (lat - 1), rad = Math.sqrt(1 - y * y), a = (j / per) * TAU;
        p.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3);
      } else {
        const q = i - half, k = q % mer, j = Math.floor(q / mer), per = Math.ceil((N - half) / mer), th = -Math.PI / 2 + (Math.PI * j) / (per - 1), a = (k / mer) * TAU;
        p.set([Math.cos(a) * Math.cos(th), Math.sin(th), Math.sin(a) * Math.cos(th)], i * 3);
      }
    }
    return p;
  },
  // shaping: an icosahedron drawn in its thirty edges
  solid() {
    const p = new Float32Array(N * 3), t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; });
    const edges = [];
    for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) if (Math.hypot(v[a][0] - v[b][0], v[a][1] - v[b][1], v[a][2] - v[b][2]) < 1.1) edges.push([a, b]);
    const per = Math.ceil(N / edges.length);
    for (let i = 0; i < N; i++) {
      const [a, b] = edges[i % edges.length], s = Math.floor(i / edges.length) / (per - 1);
      p.set([0, 1, 2].map((k) => (v[a][k] + (v[b][k] - v[a][k]) * s) * 1.05), i * 3);
    }
    return p;
  },
};

// ---------------------------------------------------------------- the forms that move by themselves
// Each is made fresh when it comes round and worked out a frame at a time: step(t, dt, m) puts every
// dot's place in pos and how lit it is (0 to 1: bigger and brighter) in lit. t is the orb's own
// clock (it runs with the tempo), m what the music is doing (see draw).
const DYN = {
  // working: eleven orbit paths round the middle, each dot running round its path, every fortieth a
  // bright particle. The paths face evenly spread ways (their axes spread over half a sphere, as
  // the dots of the sphere are over a whole one): tilted at random, some crowded together and left
  // gaps, a lumpy tangle.
  orbits() {
    const K = 11, axes = Array.from({ length: K }, (_, k) => fibDir(k, 2 * K)); // the top half's
    // each path's two directions across it: a and b, square to its axis and to each other
    const ab = axes.map((n) => {
      const h = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const a = [h[1] * n[2] - h[2] * n[1], h[2] * n[0] - h[0] * n[2], h[0] * n[1] - h[1] * n[0]], la = Math.hypot(...a);
      a[0] /= la; a[1] /= la; a[2] /= la;
      return [a, [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]]];
    });
    const speed = Array.from({ length: K }, (_, k) => (0.22 + 0.3 * hashD(k, 3.1)) * (k % 2 ? 1 : -1));
    const pos = new Float32Array(N * 3), lit = new Float32Array(N);
    for (let i = 0; i < N; i++) lit[i] = Math.floor(i / K) % 40 === 0 ? 1 : 0;
    return {
      pos, lit,
      step(t) {
        for (let i = 0; i < N; i++) {
          const k = i % K, an = (i / N) * TAU + k + t * speed[k], c = Math.cos(an), sn = Math.sin(an), [a, b] = ab[k];
          pos[i * 3] = a[0] * c + b[0] * sn; pos[i * 3 + 1] = a[1] * c + b[1] * sn; pos[i * 3 + 2] = a[2] * c + b[2] * sn;
        }
      },
    };
  },
  // composing: a staff wrapped round the middle, five lines, and on it the bass notes as they're
  // played (A1 to A3 across its lines and spaces), each a head and a stem, coming in at the front
  // and carried round as the orb turns. Their dots wait between the lines' own and fly up to make
  // each note, and back when it's done.
  staff() {
    const LINES = [-0.36, -0.18, 0, 0.18, 0.36], onLines = Math.floor(N * 0.62), SLOTS = 22, PER = Math.floor((N - onLines) / SLOTS), HEAD = 26, LIFE = 9;
    const home = new Float32Array(N * 3), pos = new Float32Array(N * 3), lit = new Float32Array(N), notes = [];
    const place = (i, j, count, shift) => { const L = LINES[j % 5], a = ((Math.floor(j / 5) + shift) / (count / 5)) * TAU, rad = Math.sqrt(1 - L * L); home.set([Math.cos(a) * rad, L, Math.sin(a) * rad], i * 3); };
    for (let i = 0; i < onLines; i++) place(i, i, onLines, 0);
    for (let j = 0; j < N - onLines; j++) place(onLines + j, j, N - onLines, 0.5);
    pos.set(home);
    const ball = Array.from({ length: HEAD }, (_, k) => fibDir(k, HEAD));
    let heard = null, slot = 0;
    return {
      pos, lit,
      step(t, dt, m) {
        const b = m.bass;
        if (b && b.t !== heard) {
          if (heard !== null && b.f0 > 0) {
            const midi = 69 + 12 * Math.log2(b.f0 / 440), at = clamp(Math.round(((midi - 33) * 8) / 24), 0, 8);
            notes[slot] = { a: m.yaw + Math.PI / 2, y: -0.36 + at * 0.09, at: m.now };
            slot = (slot + 1) % SLOTS;
          }
          heard = b.t;
        }
        const k = Math.min(1, dt * 9);
        for (let s = 0; s < SLOTS; s++) {
          const n = notes[s], age = n ? m.now - n.at : LIFE, live = age < LIFE, rad = n ? Math.sqrt(1 - n.y * n.y) : 1;
          for (let q = 0; q < PER; q++) {
            const i = onLines + s * PER + q;
            let tx = home[i * 3], ty = home[i * 3 + 1], tz = home[i * 3 + 2];
            lit[i] = 0;
            if (live && q < HEAD) {
              const d = ball[q];
              tx = Math.cos(n.a) * rad + d[0] * 0.045; ty = n.y + d[1] * 0.035; tz = Math.sin(n.a) * rad + d[2] * 0.045;
              lit[i] = 0.2 + 0.8 * Math.exp(-age * 3);
            } else if (live) {
              const f = (q - HEAD + 1) / (PER - HEAD), a = n.a + 0.045;
              tx = Math.cos(a) * rad; ty = n.y + 0.03 + f * 0.28; tz = Math.sin(a) * rad;
            }
            pos[i * 3] += (tx - pos[i * 3]) * k; pos[i * 3 + 1] += (ty - pos[i * 3 + 1]) * k; pos[i * 3 + 2] += (tz - pos[i * 3 + 2]) * k;
          }
        }
      },
    };
  },
  // connecting: a network over the sphere, 42 points (each a small knot of dots, lit a little)
  // joined to their nearest by lines of dots, a signal running down one of the lines on every hat.
  // (Knots of 14 packed in tight were bright lumps, a third of all the dots.)
  web() {
    const M = 42, KNOT = 7, SIG = 8, TRAIL = 6, g = Math.PI * (3 - Math.sqrt(5));
    const nodes = Array.from({ length: M }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / M, rr = Math.sqrt(1 - y * y), a = i * g; return [Math.cos(a) * rr, y, Math.sin(a) * rr]; });
    const edges = [];
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 3);
      for (const [j] of near) if (!edges.some(([u, v]) => (u === i && v === j) || (u === j && v === i))) edges.push([i, j]);
    });
    const onArc = (a, b, f, out, o) => { const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f, l = Math.hypot(x, y, z) || 1; out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l; };
    const pos = new Float32Array(N * 3), lit = new Float32Array(N), knots = M * KNOT, sig0 = N - SIG * TRAIL, lineN = sig0 - knots;
    for (let i = 0; i < knots; i++) { const c = nodes[Math.floor(i / KNOT)], d = fibDir(i % KNOT, KNOT); pos.set([c[0] + d[0] * 0.03, c[1] + d[1] * 0.03, c[2] + d[2] * 0.03], i * 3); lit[i] = 0.35; }
    // the lines' dots, each line as many as its length wants, evenly along it
    const len = edges.map(([a, b]) => Math.acos(clamp(nodes[a][0] * nodes[b][0] + nodes[a][1] * nodes[b][1] + nodes[a][2] * nodes[b][2], -1, 1))), total = len.reduce((s, l) => s + l, 0);
    let i = knots;
    edges.forEach(([a, b], e) => {
      const n = e === edges.length - 1 ? sig0 - i : Math.round((lineN * len[e]) / total);
      for (let q = 0; q < n && i < sig0; q++, i++) onArc(nodes[a], nodes[b], (q + 0.5) / n, pos, i * 3);
    });
    const park = (s, q) => { const c = nodes[(s * 5) % M]; pos.set(c, (sig0 + s * TRAIL + q) * 3); lit[sig0 + s * TRAIL + q] = 0; };
    for (let s = 0; s < SIG; s++) for (let q = 0; q < TRAIL; q++) park(s, q);
    return {
      pos, lit,
      step(t, dt, m) {
        for (let s = 0; s < SIG; s++) {
          const h = m.hats.findLast((x) => x.n % SIG === s && m.now - x.at < 0.5);
          for (let q = 0; q < TRAIL; q++) {
            if (!h) { park(s, q); continue; }
            const [a, b] = edges[Math.floor(hashD(h.n, 1.7) * edges.length)], f = clamp((m.now - h.at) / 0.45 - q * 0.04, 0, 1);
            onArc(nodes[a], nodes[b], smoothE(f), pos, (sig0 + s * TRAIL + q) * 3);
            lit[sig0 + s * TRAIL + q] = (1 - q / TRAIL) * (f < 1 ? 1 : 0.3);
          }
        }
      },
    };
  },
  // solving, again: the sphere in slices like a puzzle's, one turning on each beat, scrambled over
  // 14 beats and solved over the next 14 (Thinking Orbs' moves), the turning slice lit
  puzzle() {
    const base = FORMS.sphere(), pos = new Float32Array(N * 3), lit = new Float32Array(N), p = [0, 0, 0];
    return {
      pos, lit,
      step(t, dt, m) {
        const sc = solveCycle(m.beats, MOVES.length, 1, 4);
        for (let i = 0; i < N; i++) {
          const act = applyMoves(base[i * 3], base[i * 3 + 1], base[i * 3 + 2], sc, p);
          pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; lit[i] = act ? 0.5 : 0;
        }
      },
    };
  },
  // listening, again: 23 rings round a sphere, each swelling with its band of the spectrum (the low
  // notes at the bottom), a wave rolling up through them
  bands() {
    const RINGS = 23, lat = Array.from({ length: RINGS }, (_, r) => -Math.PI / 2 + ((r + 0.5) / RINGS) * Math.PI), w = lat.map(Math.cos), sum = w.reduce((a, b) => a + b, 0);
    const counts = w.map((x) => Math.floor((N * x) / sum));
    counts[Math.floor(RINGS / 2)] += N - counts.reduce((a, b) => a + b, 0);
    const ringOf = new Int16Array(N), lon = new Float32Array(N), pos = new Float32Array(N * 3), lit = new Float32Array(N), raw = new Float32Array(RINGS), sw = new Float32Array(RINGS);
    let i = 0;
    counts.forEach((n, r) => { for (let j = 0; j < n; j++, i++) { ringOf[i] = r; lon[i] = (j / n) * TAU + r * 0.37; } });
    return {
      pos, lit,
      step(t, dt, m) {
        // each ring's swell: its band of the spectrum (in between two bands, some of each) and the
        // wave, then softened with the rings either side, so the outline rolls instead of
        // stepping ring to ring (as it did with each ring its own nearest band: lumpy)
        for (let r = 0; r < RINGS; r++) {
          const f = (r / (RINGS - 1)) * 15, lo = Math.floor(f), band = m.bands[lo] + (m.bands[Math.min(15, lo + 1)] - m.bands[lo]) * (f - lo);
          raw[r] = clamp(0.35 * Math.sin(t * 2.1 - r * 0.52) + 1.5 * (band - 0.3), -1, 1.2);
        }
        for (let r = 0; r < RINGS; r++) sw[r] = 0.25 * raw[Math.max(0, r - 1)] + 0.5 * raw[r] + 0.25 * raw[Math.min(RINGS - 1, r + 1)];
        for (let i = 0; i < N; i++) {
          const r = ringOf[i], s = sw[r], rr = 0.93 + 0.07 * s, c = Math.cos(lat[r]);
          pos[i * 3] = Math.cos(lon[i]) * c * rr; pos[i * 3 + 1] = Math.sin(lat[r]) * rr; pos[i * 3 + 2] = Math.sin(lon[i]) * c * rr;
          lit[i] = Math.max(0, s - 0.5) * 0.7;
        }
      },
    };
  },
  // shaping, again: a dotted outline facing you, five deep, circle, triangle, square, holding the
  // bar and turning into the next over its last quarter, to land on the one (Thinking Orbs' shapes)
  shapes() {
    const LAYERS = 5, per = N / LAYERS, pos = new Float32Array(N * 3), lit = new Float32Array(N);
    return {
      pos, lit,
      step(t, dt, m) {
        const bar = Math.max(0, m.bars), k = Math.floor(bar) % 3, local = frac(bar), mm = local > 0.75 ? smoothE((local - 0.75) / 0.25) : 0;
        const cy = Math.cos(m.yaw), sy = Math.sin(m.yaw), cp = Math.cos(m.pitch), sp = Math.sin(m.pitch), flash = 0.45 * Math.exp(-local * 12);
        for (let L = 0; L < LAYERS; L++) {
          const dz = (L - 2) * 0.05, sc = 3.4 * (1 + (L - 2) * 0.015);
          for (let q = 0; q < per; q++) {
            const f = q / per, A = OUTLINES[k](f), B = OUTLINES[(k + 1) % 3](f), u = (A[0] + (B[0] - A[0]) * mm) * sc, v = -(A[1] + (B[1] - A[1]) * mm) * sc, i = L * per + q;
            // where the orb's turn and tilt bring it round to face you
            pos[i * 3] = cy * u + sp * sy * v - cp * sy * dz; pos[i * 3 + 1] = cp * v + sp * dz; pos[i * 3 + 2] = sy * u - sp * cy * v + cp * cy * dz;
            lit[i] = (L === 2 ? 0.3 : 0) + flash;
          }
        }
      },
    };
  },
  // breathing: a ring facing you, its outline slowly swelling round in three lobes and five, each
  // of its lanes a little out of step with the next (Thinking Orbs' breathing ring: its sash's
  // undulation moved onto the radius), the lobes coming round faster as the tempo rises and
  // swelling further as the music gets louder, the band turning slowly
  ring() {
    const LANES = 7, SEGS = Math.floor(N / LANES), pos = new Float32Array(N * 3), lit = new Float32Array(N);
    let loud = 0.5;
    return {
      pos, lit,
      step(t, dt, m) {
        let sum = 0;
        for (let b = 0; b < 16; b++) sum += m.bands[b];
        loud += (sum / 16 - loud) * Math.min(1, dt * 2);
        const amp = 0.55 + 0.9 * clamp(loud, 0, 1), cy = Math.cos(m.yaw), sy = Math.sin(m.yaw), cp = Math.cos(m.pitch), sp = Math.sin(m.pitch);
        for (let i = 0; i < N; i++) {
          const w = i % LANES, lane = w - (LANES - 1) / 2, a = (Math.floor(i / LANES) / SEGS) * TAU + t * 0.24;
          const wob = 0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1);
          const rr = 0.86 * (1 + wob * amp) + lane * 0.022, dz = lane * 0.03, u = Math.cos(a) * rr, v = Math.sin(a) * rr;
          // where the orb's turn and tilt bring it round to face you (as the shapes)
          pos[i * 3] = cy * u + sp * sy * v - cp * sy * dz; pos[i * 3 + 1] = cp * v + sp * dz; pos[i * 3 + 2] = sy * u - sp * cy * v + cp * cy * dz;
        }
      },
    };
  },
};
// Thinking Orbs' puzzle moves: fourteen quarter turns of a slice half a unit thick; solveCycle
// gives how far each has turned at a time (scrambling, then the same turns undone in reverse)
function solveCycle(time, count, slotDur, rest) {
  const cyc = 2 * count * slotDur + rest, tc = ((time % cyc) + cyc) % cyc, amount = new Array(count).fill(0);
  let active = -1;
  if (tc < 2 * count * slotDur) {
    const slot = Math.floor(tc / slotDur), p = (tc - slot * slotDur) / slotDur, cl = Math.min(1, p / 0.7), ep = 1 - (1 - cl) ** 3;
    if (slot < count) {
      for (let i = 0; i < slot; i++) amount[i] = 1;
      amount[slot] = ep;
      active = slot;
    } else {
      const u = 2 * count - 1 - slot;
      for (let i = 0; i < u; i++) amount[i] = 1;
      amount[u] = 1 - ep;
      active = u;
    }
  }
  return { amount, active };
}
const MOVES = Array.from({ length: 14 }, (_, i) => {
  const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3)), lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4)), dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
  return { axis, lo, hi: lo + 0.5, ang: (dir * Math.PI) / 2 };
});
// a point through the turns so far (into out); whether it's in the slice turning now
function applyMoves(x, y, z, sc, out) {
  let inActive = false;
  for (let i = 0; i < MOVES.length; i++) {
    if (sc.amount[i] <= 0) continue;
    const mv = MOVES[i], coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
    if (coord < mv.lo || coord >= mv.hi) continue;
    if (i === sc.active) inActive = true;
    const a = mv.ang * sc.amount[i], ca = Math.cos(a), sa = Math.sin(a);
    if (mv.axis === 0) { const y2 = y * ca - z * sa; z = y * sa + z * ca; y = y2; }
    else if (mv.axis === 1) { const x2 = x * ca + z * sa; z = -x * sa + z * ca; x = x2; }
    else { const x2 = x * ca - y * sa; y = x * sa + y * ca; x = x2; }
  }
  out[0] = x; out[1] = y; out[2] = z;
  return inActive;
}
// Thinking Orbs' outlines, about a quarter unit across
function polyPath(verts) {
  const V = verts.length, L = [];
  let total = 0;
  for (let i = 0; i < V; i++) { const a = verts[i], b = verts[(i + 1) % V], l = Math.hypot(b[0] - a[0], b[1] - a[1]); L.push(l); total += l; }
  return (f) => {
    let target = f * total, i = 0;
    while (target > L[i] && i < V - 1) { target -= L[i]; i++; }
    const a = verts[i], b = verts[(i + 1) % V], ff = L[i] ? Math.min(1, target / L[i]) : 0;
    return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff];
  };
}
const OUTLINES = [
  (f) => { const a = -Math.PI / 2 + f * TAU; return [Math.cos(a) * 0.24, Math.sin(a) * 0.24]; },
  polyPath([[0, -0.26], [0.24, 0.16], [-0.24, 0.16]]),
  polyPath([[0, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [-0.2, -0.2]]),
];

// Every form lists its dots in the same order: round the vertical axis in 48 slices, low to high
// within each. So a dot keeps its direction from one form to the next and only moves in or out,
// up or down: the shape reshapes instead of dissolving into a cloud and back. (The order: which of
// the form's own dots goes in each place.)
function alignOrder(p) {
  const key = new Float32Array(N), idx = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < N; i++) {
    const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
    key[i] = Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * 48) * 10 + clamp(y + 2, 0, 4);
  }
  idx.sort((a, b) => key[a] - key[b]);
  return Int32Array.from(idx);
}
function reorder(order, p, lit, outP, outL) {
  for (let to = 0; to < N; to++) {
    const from = order[to];
    outP[to * 3] = p[from * 3]; outP[to * 3 + 1] = p[from * 3 + 1]; outP[to * 3 + 2] = p[from * 3 + 2];
    outL[to] = lit ? lit[from] : 0;
  }
}
const ORDER = ['sphere', 'glitch', 'lattice', 'orbits', 'staff', 'galaxy', 'web', 'waves', 'puzzle', 'globe', 'ring', 'solid', 'bands', 'rays', 'ripple', 'shapes'];
const WAVY = { waves: 1 }; // forms whose dots ride the spectrum
let PHRASE = 8; // bars a form holds
const MORPH = 1.8; // seconds for the dots to flow to the next form
const BREATH_W = 8; // the breath's spring (rad/s): out at its fullest 1/8 s after the kick

const VERT = `
attribute vec3 aFrom, aTo;
attribute float aSeed, aLit;
uniform float uMix, uTime, uKick, uKickAge, uClapAge, uHat, uBass, uScale, uWaveFrom, uWaveTo, uDot, uDpr, uSpan, uBreath;
uniform mat3 uRot;
uniform vec2 uSize, uShift;
uniform float uBands[16];
varying float vA;
float band(float x) {
  float f = clamp((x / 1.35 * 0.5 + 0.5) * 15.0, 0.0, 15.0);
  int i = int(floor(f));
  float a = uBands[0], b = uBands[0];
  for (int k = 0; k < 16; k++) { if (k == i) a = uBands[k]; if (k == i + 1) b = uBands[k]; }
  return mix(a, b, fract(f));
}
void main() {
  // each dot sets off a little after the last, so a new form flows in rather than snapping
  float m = smoothstep(0.0, 1.0, clamp(uMix * 1.4 - aSeed * 0.4, 0.0, 1.0));
  vec3 p = mix(aFrom, aTo, m);
  float w = mix(uWaveFrom, uWaveTo, m);
  p.y += w * (0.32 * band(p.x) - 0.1 + 0.05 * sin(p.x * 5.0 + p.z * 3.0 + uTime * 2.4));
  // The kick, on the field of waves (a cloth): a springy ripple that runs out from the middle,
  // overshoots and wobbles back (it's already most of the way out when it starts, so it lands on
  // the hit rather than after it), and the clap a quick shiver along each dot's way out. On a solid
  // (the sphere and the rest) those read as lumps, every dot at its own place in the wobble: it
  // breathes instead, all of it out and back at once, smoothly (uBreath: worked out per frame).
  float r = length(p), age = uKickAge - r * 0.09;
  float spring = age > 0.0 ? exp(-age * 6.0) * sin(age * 21.0 + 0.9) : 0.0;
  float shiver = uClapAge < 0.6 ? exp(-uClapAge * 9.0) * sin(uClapAge * 70.0 + aSeed * 25.0) : 0.0;
  p *= uScale * (1.0 + mix(0.08 * uBreath, 0.12 * spring + 0.035 * shiver, w));
  // and the dots never quite sit still (a solid's only just)
  p += mix(0.005, 0.012, w) * vec3(sin(uTime * 0.7 + aSeed * 53.0), cos(uTime * 0.9 + aSeed * 41.0), sin(uTime * 0.8 + aSeed * 29.0));
  p = uRot * p;
  float d = 3.2 - p.z, persp = 3.2 / d;
  vec2 xy = p.xy * persp * uSpan;
  gl_Position = vec4(xy / (uSize * 0.5) + uShift, 0.0, 1.0);
  // nearer: bigger and brighter; the band of light the hats move round; a little twinkle; and the
  // dots a form lights itself (its particles, notes, signals, the slice turning)
  float near = smoothstep(-1.1, 1.1, p.z);
  float ang = atan(p.z, p.x), da = abs(mod(ang - uHat + 3.14159, 6.28318) - 3.14159);
  float lit = exp(-da * da * 9.0);
  gl_PointSize = uDot * uDpr * persp * (0.75 + 0.5 * aSeed) * (1.0 + 0.7 * uBass) * (1.0 + 0.6 * lit) * (1.0 + 0.9 * aLit);
  vA = clamp((0.14 + 0.66 * near) * (0.85 + 0.3 * fract(aSeed * 91.0 + uTime * 0.15)) + 0.6 * lit + 0.2 * uKick + 0.55 * aLit, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uGlow, uFade;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = uFade * (uGlow > 0.0 ? uGlow * vA * (1.0 - d) * (1.0 - d) : vA * (1.0 - smoothstep(0.45, 1.0, d)));
  gl_FragColor = vec4(uColor * a, a);
}`;

export function createOrb(canvas) {
  let gl = null, prog = null, parallel = null, ready = false, broken = false, loc = {}, buf = {};
  const bands = new Float32Array(16), raw = new Float32Array(16); // the spectrum, smoothed (raw: this frame's)
  let form = null, from = null, mixAt = -9, changedAt = -9, flowFor = null, which = 0, last = 0, lastStep = null, heard = {}, phraseOf = null, since = 0, clock = 0;
  let kick = 0, kickAt = -9, clapAt = -9, hatTo = 0, hat = 0, yaw = 0, spin = 0, spinNow = 0, bass = 0, drawn = false;
  // the breath: a spring damped just enough not to overshoot, each kick a push outward (out in an
  // eighth of a second, back over half a second; kicks close together carry on from each other)
  let breath = 0, breathV = 0;
  // the glitch ball (glitchorb.js) and how far it's come in (0 to 1)
  let glitch = null, glitchA = 0;
  let kickHeard = -9, clapHeard = -9; // the last kick and clap, counted or run into the one before
  const hats = []; let hatN = 0; // the hats just gone (for the network's signals)
  // what the music is doing, for the forms that move by themselves
  const music = { now: 0, beats: 0, bars: 0, yaw: 0, pitch: 0, bands, hats, bass: null };

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; prog = null; glitch = null; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; prog = null; glitch = null; });

  // the shader is built in the background where the driver allows it (see glass.js)
  function build() {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) { broken = true; return; }
    parallel = gl.getExtension('KHR_parallel_shader_compile');
    prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    glitch = createGlitch(gl, parallel);
  }
  function init() {
    if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || gl.getAttachedShaders(prog).map((s) => gl.getShaderInfoLog(s)).join(' '));
    gl.useProgram(prog);
    for (const name of ['aFrom', 'aTo', 'aSeed', 'aLit']) {
      buf[name] = gl.createBuffer();
      loc[name] = gl.getAttribLocation(prog, name);
    }
    const seeds = new Float32Array(N), r = rng(3);
    for (let i = 0; i < N; i++) seeds[i] = r();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.aSeed);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    for (const name of ['uMix', 'uTime', 'uKick', 'uKickAge', 'uClapAge', 'uHat', 'uBass', 'uScale', 'uWaveFrom', 'uWaveTo', 'uDot', 'uDpr', 'uRot', 'uSize', 'uBands', 'uColor', 'uGlow', 'uFade', 'uSpan', 'uShift', 'uBreath']) loc[name] = gl.getUniformLocation(prog, name);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    ready = true;
    upload();
    return true;
  }
  // where the dots are now (mid-flow if a new form comes while they're still moving), as the
  // shader works it out, so the next form flows on from there
  const seedOf = (() => { const s = new Float32Array(N), r = rng(3); for (let i = 0; i < N; i++) s[i] = r(); return s; })();
  function current(mix) {
    if (!from) return form.pos.slice();
    const out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = clamp(mix * 1.4 - seedOf[i] * 0.4, 0, 1), m = t * t * (3 - 2 * t);
      for (let k = 0; k < 3; k++) out[i * 3 + k] = from.pos[i * 3 + k] + (form.pos[i * 3 + k] - from.pos[i * 3 + k]) * m;
    }
    return out;
  }
  function upload() {
    if (!ready || !form) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.aFrom);
    gl.bufferData(gl.ARRAY_BUFFER, from ? from.pos : form.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.aTo);
    gl.bufferData(gl.ARRAY_BUFFER, form.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.aLit);
    gl.bufferData(gl.ARRAY_BUFFER, form.lit, gl.DYNAMIC_DRAW);
  }
  // a form that moves by itself: this frame's places, in the order every form keeps
  function stepDyn(dt) {
    form.dyn.step(clock, dt, music);
    if (!form.order) form.order = alignOrder(form.dyn.pos);
    reorder(form.order, form.dyn.pos, form.dyn.lit, form.pos, form.lit);
  }
  function next(t, name = null) {
    name = name || ORDER[which++ % ORDER.length];
    const mix = clamp((t - mixAt) / MORPH, 0, 1);
    from = form ? { pos: current(mix), wavy: mix < 0.5 && from ? from.wavy : form.wavy } : null;
    if (DYN[name]) {
      form = { name, pos: new Float32Array(N * 3), lit: new Float32Array(N), wavy: 0, dyn: DYN[name](), order: null };
      stepDyn(0);
    } else {
      form = { name, pos: (() => { const p = FORMS[name](); const out = new Float32Array(N * 3); reorder(alignOrder(p), p, null, out, new Float32Array(N)); return out; })(), lit: new Float32Array(N), wavy: WAVY[name] || 0 };
    }
    if (name === 'glitch') glitch?.fresh();
    mixAt = from ? t : -9;
    changedAt = t;
    since = 0;
    upload();
  }

  return {
    get form() { return form?.name; },
    get broken() { return broken; },
    get forms() { return ORDER.slice(); },
    // on to the next form now, or to one by name (for checking them)
    nextForm() { if (form) next(performance.now() / 1000); },
    show(name) { if (!FORMS[name] && !DYN[name]) return; next(performance.now() / 1000, name); which = ORDER.indexOf(name) + 1; },
    // how many bars a form holds (shorter, to see them all)
    set phrase(bars) { PHRASE = Math.max(1, Math.round(bars)); },
    clear() {
      if (ready) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      drawn = false; lastStep = null; heard = {}; phraseOf = null;
    },
    // offset: as for the blocks (how far ahead to draw, so the moves land when you hear the hit);
    // rect: where to draw it (CSS pixels: the top of the vertical layout, where the pitch wheel or
    // the spiral is, so it sits inside the wheel's ring of notes as it does in the wide layout), or
    // null for the middle of the window
    draw(t, eng, col, offset, bandsOf, rect = null) {
      if (broken || gl?.isContextLost()) return;
      if (!ready) {
        try {
          if (!prog) build();
          if (broken || !init()) return;
        } catch (err) { if (!gl?.isContextLost()) { broken = true; console.error('orb:', err); } return; }
      }
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      if (!form) next(t);
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 110;
      // the hits: due by now on the beat grid, or (no beat yet) as they're heard. A beat read wrong
      // (a slap bass taken for kicks, guitar chops for claps) crowds them together: a run of them on
      // neighbouring 16ths counts as one, and claps don't wind the spin up, so the orb stays smooth
      // and the hits that are right still land.
      const close = 22.5 / bpm; // a 16th and a half
      // (at: the 16th it's due on, on the beat grid)
      const fire = (id, at) => {
        if (id === 'bd') { if (t - kickHeard > close) { kick = 1; kickAt = t; breathV += BREATH_W * Math.E; glitch?.kick(at === undefined ? undefined : Math.floor(at / 16)); } kickHeard = t; }
        else if (id === 'sd') { if (t - clapHeard > close) { spin = Math.max(spin, 1.1); clapAt = t; } clapHeard = t; }
        else { hatTo += TAU / 12; hats.push({ n: hatN++, at: t }); }
      };
      const step = eng.stepAt(t + offset);
      if (step !== null) {
        // The phrase count only goes up: a beat grid corrected just as it crosses a phrase can take
        // it back and over again, which changed the form twice (skipping one); a jump of more than a
        // phrase or two (a new beat) only starts the count again.
        // The dots set off for the next form a flow's length before the phrase's end, so they land
        // on its one, with the kick.
        const per = 16 * PHRASE, phrase = Math.floor(step / per), lead = MORPH / (60 / bpm / 4);
        if (phraseOf === null || phrase < phraseOf - 2 || phrase > phraseOf + 2) { phraseOf = phrase; flowFor = phrase; }
        if (flowFor !== phraseOf + 1 && step >= (phraseOf + 1) * per - lead && t - changedAt > 2) { next(t); flowFor = phraseOf + 1; }
        if (phrase > phraseOf) phraseOf = phrase;
        if (lastStep === null || step < lastStep || step - lastStep > 8) lastStep = step;
        for (let g = Math.floor(lastStep) + 1; g <= step; g++) {
          const s16 = ((g % 16) + 16) % 16;
          for (const id of ['bd', 'sd', 'hhc', 'hho']) if (eng.v[id].shown?.[s16] && eng.present(id, t)) fire(id, g);
        }
        lastStep = step;
      } else {
        lastStep = phraseOf = flowFor = null;
        since += dt;
        if (since > 16) next(t);
        for (const id of ['bd', 'sd', 'hhc']) {
          const h = id === 'hhc' ? eng.hhHit : eng.v[id].lastHit;
          if (h.t > (heard[id] ?? Infinity)) fire(id);
          heard[id] = h.t;
        }
      }
      while (hats.length && t - hats[0].at > 0.6) hats.shift();
      kick *= Math.exp(-dt / 0.16);
      // (in steps of at most a 120th of a second, so a slow frame can't make it ring)
      for (let n = Math.ceil(dt * 120), k = 0; k < n; k++) {
        const h = dt / n;
        breathV += (-BREATH_W * BREATH_W * breath - 2 * BREATH_W * breathV) * h;
        breath = clamp(breath + breathV * h, -0.3, 1.5);
      }
      hat += (hatTo - hat) * Math.min(1, dt * 10);
      spin *= Math.exp(-dt * 2.2);
      // the clap's spin comes on over a tenth of a second rather than all at once: a whip round on
      // every clap read as the orb spazzing out (Oct 15, on a 147 bpm song)
      spinNow += (spin - spinNow) * Math.min(1, dt * 10);
      yaw += dt * (0.16 * (bpm / 120) + spinNow);
      clock += dt * (bpm / 120);
      // The waves ride the spectrum: rising within about a tenth of a second and settling over a
      // quarter, not jumping with every 20 ms reading (the field of waves flapped about)
      bandsOf(raw);
      for (let i = 0; i < 16; i++) bands[i] += (raw[i] - bands[i]) * Math.min(1, dt * (raw[i] > bands[i] ? 12 : 4));
      // the bass swells the dots quickly and lets them go slowly, so a busy bass line (a slap bass,
      // 16ths) breathes instead of flickering with every note
      const low = (bands[0] + bands[1] + bands[2]) / 3;
      bass += (low - bass) * Math.min(1, dt * (low > bass ? 12 : 3));
      const pitch = 0.42 + 0.12 * Math.sin(t * 0.13);
      // the forms that move by themselves: this frame's places
      if (form.dyn) {
        music.now = t; music.beats = step !== null ? step / 4 : clock * 2; music.bars = music.beats / 4; music.yaw = yaw; music.pitch = pitch; music.bass = eng.lastBassHit || null;
        stepDyn(dt);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.aTo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, form.pos);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.aLit);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, form.lit);
      }

      const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      const w = Math.round(W * dpr), h = Math.round(H * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // its size (a third of the stage's smaller side: just inside the pitch wheel's ring)
      const mix = clamp((t - mixAt) / MORPH, 0, 1), span = (rect ? Math.min(rect.w, rect.h) : Math.min(W, H)) * 0.34;
      const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
      // The glitch ball, under the dots: it comes in as they settle into the sphere (and they fade
      // out), and goes again quickly as they set off for the next form. It's the dots' sphere as the
      // eye sees it (its outline, in perspective, a little wider than the sphere) and breathes with it.
      const gTo = form.name === 'glitch' ? smoothE(clamp((mix - 0.55) / 0.45, 0, 1)) : 0;
      glitchA = gTo > glitchA ? Math.min(gTo, glitchA + dt / 0.3) : Math.max(gTo, glitchA - dt / 0.45);
      const fade = glitchA > 0 && glitch?.ready ? smoothE(glitchA) : 0;
      if (fade > 0) {
        const R = 1 + 0.08 * breath, ink = lum(col.bg) > lum(col.fg) || !col.ink ? [0, 0, 0] : col.ink.map((c) => c / 255);
        glitch.draw(dt, w, h, {
          cx: (rect ? rect.x + rect.w / 2 : W / 2) * dpr, cy: (rect ? H - rect.y - rect.h / 2 : H / 2) * dpr,
          radius: ((R * 3.2) / Math.sqrt(3.2 * 3.2 - R * R)) * span * dpr, spin: -yaw / TAU, time: t % 1000, alpha: 0.95 * fade, ink,
        });
        gl.useProgram(prog);
      }
      gl.uniform1f(loc.uFade, 1 - fade);
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      // turn round the vertical, then tip toward you (column-major, as WebGL wants)
      gl.uniformMatrix3fv(loc.uRot, false, [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
      gl.uniform1f(loc.uMix, mix);
      gl.uniform1f(loc.uTime, t % 1000);
      gl.uniform1f(loc.uKick, kick);
      gl.uniform1f(loc.uBreath, breath);
      gl.uniform1f(loc.uKickAge, Math.min(10, t - kickAt));
      gl.uniform1f(loc.uClapAge, Math.min(10, t - clapAt));
      gl.uniform1f(loc.uHat, ((hat % TAU) + TAU) % TAU - Math.PI);
      gl.uniform1f(loc.uBass, clamp(bass * 1.4 - 0.2, 0, 1));
      gl.uniform1f(loc.uScale, 1);
      gl.uniform1f(loc.uWaveFrom, from ? from.wavy : form.wavy);
      gl.uniform1f(loc.uWaveTo, form.wavy);
      gl.uniform1f(loc.uDpr, dpr);
      gl.uniform2f(loc.uSize, W, H);
      // its size and where its middle is, from the window's middle
      gl.uniform1f(loc.uSpan, span);
      gl.uniform2f(loc.uShift, rect ? (rect.x + rect.w / 2 - W / 2) / (W / 2) : 0, rect ? (H / 2 - rect.y - rect.h / 2) / (H / 2) : 0);
      gl.uniform1fv(loc.uBands, bands);
      gl.uniform3f(loc.uColor, col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
      for (const [name, size] of [['aFrom', 3], ['aTo', 3], ['aSeed', 1], ['aLit', 1]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf[name]);
        gl.enableVertexAttribArray(loc[name]);
        gl.vertexAttribPointer(loc[name], size, gl.FLOAT, false, 0, 0);
      }
      // a faint glow round the dots on dark themes, then the dots
      if (lum(col.bg) < lum(col.fg)) {
        gl.uniform1f(loc.uGlow, 0.07);
        gl.uniform1f(loc.uDot, 9);
        gl.drawArrays(gl.POINTS, 0, N);
      }
      gl.uniform1f(loc.uGlow, 0);
      gl.uniform1f(loc.uDot, 2.7);
      gl.drawArrays(gl.POINTS, 0, N);
      drawn = true;
    },
  };
}
