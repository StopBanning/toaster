// Two backgrounds after the visuals Strudel draws for live coders (its spiral and pitch wheel),
// drawn from what Toaster hears, on the same canvas as the tunnel.
//
// Spiral: time going round, a turn a bar, the newest bar on the outside and older ones curling in
// toward the middle. Every kick, clap, hat and bass note is a mark where it fell, the kick's
// thickest, brightest when it has just played and fading as it curls in. Now is at the top.
//
// Pitch wheel: the twelve notes round a circle, C at the top. What's sounding lights its notes;
// the chord of the bar is drawn as a shape between its notes, the bass note as a line out from the
// middle, and the melody's notes as dots outside the circle that fade.
import { NOTES } from './engine.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`;

// Drawn at 75% resolution and stretched to fit, like the tunnel: soft lines look the same.
const SCALE = 0.75;
function fit(canvas) {
  const w = Math.round(innerWidth * SCALE), h = Math.round(innerHeight * SCALE);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return [w, h];
}
// Where to draw, on the canvas: rect (CSS pixels, a part of the window kept for it, like the top
// of the vertical layout) or the whole window. Returns its middle and its smaller side.
function stage(W, H, rect) {
  if (!rect) return { cx: W / 2, cy: H / 2, size: Math.min(W, H) };
  const k = W / innerWidth;
  return { cx: (rect.x + rect.w / 2) * k, cy: (rect.y + rect.h / 2) * k, size: Math.min(rect.w, rect.h) * k };
}

// ---------------------------------------------------------------- spiral

const TURNS = 5; // bars shown
// each part's mark: how bright, how thick (a share of the gap between turns), how long (bars)
const MARK = { bd: [1, 0.55, 1 / 28], sd: [0.85, 0.42, 1 / 28], hh: [0.5, 0.2, 1 / 48], bass: [0.7, 0.3, 1 / 10] };
const STEPS = 8; // steps of brightness the marks fade through as they curl in

export function createSpiral(canvas) {
  const ctx = canvas.getContext('2d');
  let pulse = 0, last = 0;
  return {
    kick(s) { pulse = Math.max(pulse, 0.35 + 0.4 * s); },
    clear() { canvas.width = canvas.height = 0; },
    // rect: where to draw it (CSS pixels), or null for the whole window
    draw(t, eng, col, rect) {
      const [W, H] = fit(canvas);
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      pulse *= Math.exp(-dt * 7);
      ctx.clearRect(0, 0, W, H);
      const { cx, cy, size } = stage(W, H, rect), R = size * 0.47, r0 = R * 0.1, gap = (R - r0) / TURNS;
      // where a moment is, in bars: from the beat when there is one, else a turn every 2 seconds
      const locked = eng.tempo.locked && eng.stepAt(t) !== null;
      const pos = (time) => (locked ? eng.stepAt(time) / 16 : time / 2);
      const now = pos(t);
      // a point age bars ago: round from the top, anticlockwise into the past, a turn a bar
      const point = (age) => {
        const a = -Math.PI / 2 - 2 * Math.PI * age, r = R - gap * age;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      };
      // a stretch of the spiral, from one age to another, added to a path
      const along = (path, from, to) => {
        const n = Math.max(2, Math.ceil((to - from) * 64));
        for (let i = 0; i <= n; i++) { const [x, y] = point(from + ((to - from) * i) / n); if (i) path.lineTo(x, y); else path.moveTo(x, y); }
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // the track
      const track = new Path2D();
      along(track, 0, TURNS);
      ctx.strokeStyle = rgba(col.fg, 0.08);
      ctx.lineWidth = 1;
      ctx.stroke(track);
      // the hits: each part's marks in a few steps of brightness, one stroke each (hundreds of
      // strokes a frame were most of the cost); the ones just played, thicker and brighter, on top
      const paths = {}, fresh = [];
      for (const o of eng.onsets) {
        const m = MARK[o.id];
        if (!m) continue;
        const age = now - pos(o.t);
        if (age < 0 || age >= TURNS) continue;
        if (age < 0.125) { fresh.push([o.id, age]); continue; }
        const step = Math.min(STEPS - 1, Math.floor((age / TURNS) * STEPS)), key = o.id + step;
        along((paths[key] ||= new Path2D()), Math.max(0, age - m[2] / 2), age + m[2] / 2);
      }
      for (const id in MARK) {
        const m = MARK[id];
        ctx.lineWidth = gap * m[1];
        for (let step = STEPS - 1; step >= 0; step--) {
          const path = paths[id + step];
          if (!path) continue;
          ctx.strokeStyle = rgba(col.fg, m[0] * (0.18 + 0.42 * (1 - (step + 0.5) / STEPS) ** 0.8));
          ctx.stroke(path);
        }
      }
      for (const [id, age] of fresh) {
        const m = MARK[id], k = 1 - age * 8, path = new Path2D();
        along(path, Math.max(0, age - m[2] / 2), age + m[2] / 2);
        ctx.lineWidth = gap * m[1] * (1 + 0.5 * k);
        ctx.strokeStyle = rgba(col.fg, m[0] * (0.6 + 0.3 * k));
        ctx.stroke(path);
      }
      // the playhead: across the outer turn at the top, swelling on the kick
      const [px, py] = point(0);
      ctx.beginPath();
      ctx.moveTo(px, py - gap * (0.7 + pulse));
      ctx.lineTo(px, py + gap * (0.7 + pulse));
      ctx.strokeStyle = rgba(col.fg, 0.75);
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  };
}

// ---------------------------------------------------------------- pitch wheel

export function createWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const glow = new Float32Array(12); // each note's light, easing toward what's heard
  const leads = []; // the melody's notes: { pc, t }
  let leadAt = -10, pulse = 0, last = 0, font = '', fontFor = 0;
  return {
    kick(s) { pulse = Math.max(pulse, 0.3 + 0.4 * s); },
    clear() { canvas.width = canvas.height = 0; },
    // rect: where to draw it (CSS pixels), or null for the whole window
    draw(t, eng, col, rect) {
      const [W, H] = fit(canvas);
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      pulse *= Math.exp(-dt * 6);
      ctx.clearRect(0, 0, W, H);
      const { cx, cy, size } = stage(W, H, rect), R = size * 0.36 * (1 + 0.04 * pulse);
      const at = (pc, r = R) => { const a = -Math.PI / 2 + (2 * Math.PI * pc) / 12; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      // what's sounding now (tonal peaks only, so drums barely count), as a share of the loudest
      const c = eng.frameChroma;
      let top = 1e-9;
      for (let i = 0; i < 12; i++) top = Math.max(top, c[i]);
      const k = Math.min(1, dt * 9);
      for (let i = 0; i < 12; i++) glow[i] += ((eng.silent ? 0 : c[i] / top) ** 1.6 - glow[i]) * k;
      // the circle, and the twelve notes on it
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.strokeStyle = rgba(col.fg, 0.16);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (fontFor !== size) { fontFor = size; font = `${Math.round(size * 0.027)}px ${getComputedStyle(document.body).fontFamily}`; }
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let pc = 0; pc < 12; pc++) {
        const [x, y] = at(pc), [lx, ly] = at(pc, R * 1.17);
        ctx.fillStyle = rgba(col.fg, 0.12 + 0.88 * glow[pc]);
        ctx.beginPath();
        ctx.arc(x, y, R * (0.018 + 0.05 * glow[pc]), 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = rgba(col.fg, 0.25 + 0.5 * glow[pc]);
        ctx.fillText(NOTES[pc], lx, ly);
      }
      // the chord: a shape between its notes
      const ch = eng.lastChord;
      if (ch && !eng.silent) {
        const tones = [ch.root, (ch.root + ch.third) % 12, (ch.root + 7) % 12];
        ctx.beginPath();
        tones.forEach((pc, i) => { const [x, y] = at(pc); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath();
        ctx.fillStyle = rgba(col.fg, 0.08 + 0.06 * pulse);
        ctx.fill();
        ctx.strokeStyle = rgba(col.fg, 0.55);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // the bass note: a line out from the middle, fading over a second
      const b = eng.lastBassHit;
      if (b && b.f0 > 0 && t - b.t < 1.2) {
        const pc = (((Math.round(69 + 12 * Math.log2(b.f0 / 440)) % 12) + 12) % 12), [x, y] = at(pc, R * 0.96);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.strokeStyle = rgba(col.fg, 0.8 * (1 - (t - b.t) / 1.2));
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // the melody: each new note a dot outside the circle, fading over a second and a half
      const v = eng.v.vox.lastHit;
      if (v.t !== leadAt && v.t > t - 0.3) {
        leadAt = v.t;
        const pc = +eng.v.vox.tok[v.step];
        if (Number.isFinite(pc)) { leads.push({ pc, t: v.t }); if (leads.length > 24) leads.shift(); }
      }
      for (const n of leads) {
        const age = t - n.t;
        if (age > 1.5 || age < 0) continue;
        const [x, y] = at(n.pc, R * (1.06 + 0.05 * age));
        ctx.fillStyle = rgba(col.fg, 0.9 * (1 - age / 1.5));
        ctx.beginPath();
        ctx.arc(x, y, R * 0.028 * (1 - 0.4 * age), 0, 2 * Math.PI);
        ctx.fill();
      }
    },
  };
}
