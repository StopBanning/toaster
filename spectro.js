// The background "spectrogram" (V): what Toaster hears, as a landscape, and what it makes of it.
// The song's sound rises out of a floor in hills: the frequencies across it (low at the right, near
// you; high off to the far left; on a log scale), time running at you from a "now" edge at the back,
// a bar of it; the louder, the taller, and the further up a rainbow from the floor's orange through
// green and blue to violet and white (or, with A, the theme's own colours). Lit, and glossy. (After the 3D spectrum analysers: a dial-up
// modem's handshake seen as terrain.) A faint line across it on each beat, brighter on the bar's
// first, and a bright one where the chord changes, named at its end; the frequencies marked along
// the back. What Toaster recognises rides along as pins: bd on the kick, cp, hh and oh (for the
// lines the code plays), each bass note as the code writes it (e1, a3). Each row's level is taken
// against what that row usually is, and the floor set where about half of what's heard is now, so
// a sparse song and a dense one both stand as peaks on a floor.
// Drawn with WebGL (the levels, a column a frame, into a ring that raises a grid) on one canvas,
// and the marks and pins on another over it.
import { NOTES } from './engine.js';

const ROWS = 256, F_LO = 32, F_HI = 15000, FPS = 60, COLS = 512, NX = 224, NZ = 140;
const uOf = (f) => Math.log(f / F_LO) / Math.log(F_HI / F_LO);
const freqOf = (r) => F_LO * (F_HI / F_LO) ** (r / ROWS);
// where each drum's pin stands (Hz), and its label
const PINS = { bd: [70, 'bd'], sd: [2400, 'cp'], hhc: [9500, 'hh'], hho: [8000, 'oh'] };
// The landscape's width (the frequencies), height and depth (time), and the camera: from in front
// and to the right; on a tall (9:16) window, higher, over a narrower, deeper landscape that fills it.
const WIDE = { size: [3.4, 0.7, 3.0], eye: [2.7, 1.6, 2.9], look: [-0.7, 0, -0.1], fov: 40 };
const TALL = { size: [2.2, 0.7, 3.8], eye: [1.3, 1.9, 3.2], look: [-0.15, 0, -0.6], fov: 50 };
// The theme's colours, for the landscape in them (A): up from its background through its colours
// (the light theme the other way, to black)
const MAPS = {
  bluescreen: ['#000000', '#0a1660', '#1d4dff', '#4fd2ff', '#ffffff'],
  blackscreen: ['#000000', '#3b0f70', '#b5367a', '#fb8761', '#fcfdbf'],
  terminal: ['#000000', '#00300f', '#0f8a2e', '#3dff76', '#e8ffee'],
  pink: ['#000000', '#3a0026', '#a3156b', '#ff5cbf', '#fff0f8'],
  whitescreen: ['#ffffff', '#c9d4ff', '#5a7dff', '#1c2a8a', '#000000'],
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
// The levels: each row's usual level (its last 6 s or so) taken off; the floor where FLOOR_AT of the
// rows are now, at least MIN_SPAN dB under the peak; the FLOOR_DB under it rising gently to FLOOR_V
// (so quiet sound still ripples the floor); eased over TAU s.
const FLOOR_AT = 0.45, MIN_SPAN = 20, FLOOR_DB = 14, FLOOR_V = 0.12, TAU = 0.035;

// The grid, over u (across the frequencies, 0 the lowest) and w (back in time, 0 now), each point
// raised by the level heard there, its normal from its neighbours'.
const VS = `#version 300 es
layout(location = 0) in vec2 uw;
uniform sampler2D spec;          // the levels: columns of time (a ring), rows of frequency
uniform float head, span, cols;  // the newest column, how many across, the ring's size
uniform mat4 mvp;
uniform vec3 size;
uniform vec2 step;               // the grid's spacing
out vec3 vN; out vec3 vP; out float vH; out float vW;
float level(vec2 p) { return pow(texture(spec, vec2((head - clamp(p.y, 0.0, 1.0) * span + 0.5) / cols, clamp(p.x, 0.0, 1.0))).r, 1.4); }
vec3 at(vec2 p) { return vec3((0.5 - p.x) * size.x, level(p) * size.y, (p.y - 0.5) * size.z); }
void main() {
  vec3 P = at(uw);
  vN = normalize(cross(at(uw + vec2(step.x, 0.0)) - at(uw - vec2(step.x, 0.0)), at(uw + vec2(0.0, step.y)) - at(uw - vec2(0.0, step.y))));
  vP = P; vH = P.y / size.y; vW = uw.y;
  gl_Position = mvp * vec4(P, 1.0);
}`;
// Up the rainbow by height (from the floor's orange), or up the theme's colours, lit from above and
// in front with a glossy highlight; the beat lines and the chords' in the ink; the oldest fading out
// into the background at the front.
const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vP; in float vH; in float vW;
uniform vec3 eye;
uniform float beatNow, per;  // the beat now (from the grid), and how far back a beat is (in w)
uniform vec4 chords;         // where the last chord changes are (in w; under 0: none)
uniform bool themed;         // in the theme's colours (m0-m4), not the rainbow
uniform vec3 m0, m1, m2, m3, m4, bg, ink;
out vec4 o;
const vec3 R0 = vec3(0.16, 0.02, 0.0), R1 = vec3(0.72, 0.1, 0.0), R2 = vec3(1.0, 0.42, 0.0), R3 = vec3(1.0, 0.82, 0.0), R4 = vec3(0.38, 0.9, 0.12);
const vec3 R5 = vec3(0.0, 0.88, 0.78), R6 = vec3(0.06, 0.55, 1.0), R7 = vec3(0.2, 0.18, 1.0), R8 = vec3(0.72, 0.22, 1.0), R9 = vec3(1.0, 0.5, 1.0), R10 = vec3(1.0);
vec3 rainbow(float v) {
  v = clamp(v, 0.0, 1.0) * 10.0;
  float k = fract(v);
  int i = int(floor(v));
  vec3 a = i == 0 ? R0 : i == 1 ? R1 : i == 2 ? R2 : i == 3 ? R3 : i == 4 ? R4 : i == 5 ? R5 : i == 6 ? R6 : i == 7 ? R7 : i == 8 ? R8 : i == 9 ? R9 : R10;
  vec3 b = i == 0 ? R1 : i == 1 ? R2 : i == 2 ? R3 : i == 3 ? R4 : i == 4 ? R5 : i == 5 ? R6 : i == 6 ? R7 : i == 7 ? R8 : i == 8 ? R9 : R10;
  return mix(a, b, k);
}
vec3 heat(float v) {
  return v < 0.25 ? mix(m0, m1, v / 0.25) : v < 0.5 ? mix(m1, m2, (v - 0.25) / 0.25) : v < 0.75 ? mix(m2, m3, (v - 0.5) / 0.25) : mix(m3, m4, (v - 0.75) / 0.25);
}
void main() {
  vec3 N = normalize(vN), V = normalize(eye - vP), L = normalize(vec3(-0.35, 0.85, 0.45));
  float v = 0.2 + 0.8 * clamp(vH * 1.3, 0.0, 1.0);
  vec3 c = (themed ? heat(v) : rainbow(v)) * (0.3 + 0.7 * max(dot(N, L), 0.0));
  c += vec3(pow(max(dot(N, normalize(L + V)), 0.0), 40.0) * 0.55 * (0.4 + 0.6 * vH));
  float b = beatNow - vW / per, d = abs(fract(b + 0.5) - 0.5) * per;
  c = mix(c, ink, (1.0 - smoothstep(0.0032, 0.008, d)) * (abs(mod(floor(b + 0.5), 4.0)) < 0.5 ? 0.35 : 0.16));
  float cl = 0.0;
  for (int i = 0; i < 4; i++) if (chords[i] >= 0.0) cl = max(cl, 1.0 - smoothstep(0.004, 0.011, abs(vW - chords[i])));
  c = mix(c, ink, cl * 0.55);
  c = mix(bg, c, (smoothstep(0.0, 0.06, vW) * 0.85 + 0.15) * (1.0 - smoothstep(0.82, 1.0, vW)));
  o = vec4(c, 1.0);
}`;

// matrices, column by column as GL takes them
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lookAt = (e, c, up) => { const z = unit(sub(e, c)), x = unit(cross(up, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
const perspective = (fov, aspect, near, far) => { const f = 1 / Math.tan((fov * Math.PI) / 360); return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]; };
const times = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
// a point on screen (pixels), or null behind the camera
const project = (m, p, W, H) => {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return w > 0 ? [((x / w) * 0.5 + 0.5) * W, (1 - ((y / w) * 0.5 + 0.5)) * H] : null;
};

export function createSpectro(canvas, boxCanvas) {
  const og = boxCanvas.getContext('2d');
  let gl = null, prog = null, vao = null, tex = null, count = 0, U = null, broken = false;
  let lastCol = null, last = 0, peak = -30, floor = NaN, avg = null, blank = null;
  let heard = {}, bassAt = -1, chordWas = null;
  const pins = [], chords = [];
  const column = new Float32Array(ROWS), quiet = new Float32Array(ROWS), raw = new Float32Array(ROWS), tmp = new Float32Array(ROWS), sorted = new Float32Array(ROWS);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); prog = null; });
  canvas.addEventListener('webglcontextrestored', () => { prog = null; lastCol = null; });

  function build() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true });
    if (!gl) { broken = true; return; }
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const loc = {};
    U = (n) => loc[n] ??= gl.getUniformLocation(prog, n);
    const grid = new Float32Array(NX * NZ * 2);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) grid.set([i / (NX - 1), j / (NZ - 1)], (j * NX + i) * 2);
    const tris = new Uint16Array((NX - 1) * (NZ - 1) * 6);
    for (let j = 0, k = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++, k += 6) { const a = j * NX + i; tris.set([a, a + NX, a + 1, a + 1, a + NX, a + NX + 1], k); }
    count = tris.length;
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    // (half floats: smooth slopes for the light)
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, COLS, ROWS, 0, gl.RED, gl.FLOAT, new Float32Array(COLS * ROWS));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    lastCol = null;
  }

  // A column: each row's level, from the analysis that resolves it best (the 4096-point one up to
  // 1.5 kHz; above, the quicker 1024-point one, its bins averaged over the row), lifted 3 dB an
  // octave above 1 kHz (music's highs are quieter), smoothed a little across the rows; each row's
  // usual level taken off; then against the floor (where FLOOR_AT of the rows are) and a peak that
  // follows the music (up at once; down slowly, faster the further above it is: the analysers'
  // zeros before any sound would hold it up for half a minute), 0-1; eased in time.
  function makeColumn(eng, dt) {
    const hzMid = eng.sr / (eng.midDb.length * 2), hzFast = eng.hzFast;
    const at = (db, hz, f) => { const b = f / hz, i = Math.floor(b), k = b - i, a = db[Math.min(db.length - 1, i)], c = db[Math.min(db.length - 1, i + 1)]; return a + (c - a) * k; };
    const over = (db, hz, f0, f1) => {
      const i0 = Math.max(0, Math.floor(f0 / hz)), i1 = Math.min(db.length - 1, Math.ceil(f1 / hz));
      if (i1 - i0 < 2) return at(db, hz, Math.sqrt(f0 * f1));
      let s = 0;
      for (let i = i0; i <= i1; i++) s += 10 ** (db[i] / 10);
      return 10 * Math.log10(s / (i1 - i0 + 1));
    };
    for (let r = 0; r < ROWS; r++) {
      const f = freqOf(r + 0.5);
      raw[r] = (f < 1500 ? at(eng.midDb, hzMid, f) : over(eng.fastDb, hzFast, freqOf(r), freqOf(r + 1))) + (f > 1000 ? 3 * Math.log2(f / 1000) : 0);
      if (!(raw[r] > -200) || raw[r] >= 0) raw[r] = -200; // (nothing there, or the analysers' zeros before any sound)
    }
    for (let p = 0; p < 2; p++) {
      for (let r = 0; r < ROWS; r++) tmp[r] = (raw[Math.max(0, r - 1)] + 2 * raw[r] + raw[Math.min(ROWS - 1, r + 1)]) / 4;
      raw.set(tmp);
    }
    avg ??= Float32Array.from(raw);
    const k6 = 1 - Math.exp(-dt / 6);
    let mean = 0, top = -200;
    for (let r = 0; r < ROWS; r++) { avg[r] += (raw[r] - avg[r]) * k6; mean += avg[r] / ROWS; }
    for (let r = 0; r < ROWS; r++) { raw[r] -= avg[r] - mean; if (raw[r] > top) top = raw[r]; }
    peak = top > peak ? top : peak - Math.max(0.03, (peak - top) * 0.01);
    sorted.set(raw);
    sorted.sort();
    const want = Math.min(sorted[Math.floor(ROWS * FLOOR_AT)], peak - MIN_SPAN);
    floor = Number.isNaN(floor) ? want : floor + (want - floor) * (1 - Math.exp(-dt / 0.5));
    const span = Math.max(MIN_SPAN, peak - floor), kT = 1 - Math.exp(-dt / TAU);
    for (let r = 0; r < ROWS; r++) {
      const x = (raw[r] - floor) / span;
      column[r] += ((x >= 0 ? FLOOR_V + (1 - FLOOR_V) * Math.min(1, x) : FLOOR_V * Math.max(0, 1 + (x * span) / FLOOR_DB)) - column[r]) * kT;
    }
  }

  // What Toaster has recognised: pins { kind, t, f (Hz), label, born }, and the chords' changes
  function read(t, eng) {
    for (const id of ['bd', 'sd', 'hhc', 'hho']) {
      const h = eng.v[id].lastHit;
      if (h.t > (heard[id] ?? -1) && t - h.t < 0.5) {
        heard[id] = h.t;
        if (eng.present(id, t)) pins.push({ kind: id, t: h.t, f: PINS[id][0], label: PINS[id][1], born: t });
      }
    }
    // a bass note, while the code's bassline plays: labelled with the note the code wrote for its
    // bar (the bar's slot, as the bassline line shows it), at that pitch; the pitch heard, if the
    // bar has no note yet
    const b = eng.lastBassHit;
    if (b && b.t > bassAt && b.f0 > 25 && eng.playing(eng.bassSeen, t)) {
      bassAt = b.t;
      const st = eng.stepAt(b.t), slot = st === null ? null : eng.slots[((Math.floor(st / 16) % 4) + 4) % 4];
      const coded = slot?.bass && /^([a-g](?:#|b)?)(-?\d+)$/.exec(slot.bass);
      let f = b.f0, label;
      if (coded) {
        const midi = (+coded[2] + 1) * 12 + NOTES.findIndex((x) => x.toLowerCase() === coded[1]);
        f = 440 * 2 ** ((midi - 69) / 12);
        label = slot.bass;
      } else {
        const midi = Math.round(69 + 12 * Math.log2(b.f0 / 440));
        label = NOTES[((midi % 12) + 12) % 12].toLowerCase() + (Math.floor(midi / 12) - 1);
      }
      pins.push({ kind: 'bass', t: b.t, f, label, born: t });
    }
    // (a change of chord by its name: the engine hands over a new chord every bar, the same one too)
    const ch = eng.lastChord;
    if (ch && ch.name !== chordWas?.name) { chordWas = ch; chords.push({ t, label: NOTES[ch.root] + (ch.third === 3 ? 'm' : '') }); }
  }

  // Over it: the frequencies marked along the back, the chords named at the far end of their lines,
  // and the pins (a stem up from the floor, a tag with the code on it; they snap in from half again
  // as big, and fade out at the front)
  function drawMarks(t, m, { W, H, dpr, size, spanS, ink, bg }) {
    og.clearRect(0, 0, W, H);
    const [wx, hy, wz] = size, fade = (w) => 1 - Math.max(0, (w - 0.75) / 0.25);
    og.font = `${Math.round(10 * dpr)}px "JetBrains Mono", Consolas, monospace`;
    og.textBaseline = 'bottom';
    og.textAlign = 'center';
    og.lineWidth = dpr;
    for (const [f, label] of [[50, '50'], [100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k'], [10000, '10k']]) {
      const x = (0.5 - uOf(f)) * wx, a = project(m, [x, 0, -wz / 2], W, H), b = project(m, [x, hy * 1.25, -wz / 2], W, H);
      if (!a || !b) continue;
      og.strokeStyle = css(ink, 0.35);
      og.beginPath(); og.moveTo(a[0], a[1]); og.lineTo(b[0], b[1]); og.stroke();
      og.fillStyle = css(ink, 0.7);
      og.fillText(label, b[0], b[1] - 3 * dpr);
    }
    // (a chord's name rides its line where it crosses a little in from the right of the screen: the
    // code covers the left, and the line's ends are off the screen on a tall window)
    og.textBaseline = 'middle';
    og.textAlign = 'right';
    og.font = `bold ${Math.round(13 * dpr)}px "JetBrains Mono", Consolas, monospace`;
    for (const c of chords) {
      const w = (t - c.t) / spanS;
      if (w < 0 || w > 1) continue;
      const a = project(m, [-wx / 2, 0, (w - 0.5) * wz], W, H), b = project(m, [wx / 2, 0, (w - 0.5) * wz], W, H);
      if (!a || !b || a[0] === b[0]) continue;
      const x = Math.min(Math.max(a[0], b[0]), W - 12 * dpr), k = (x - a[0]) / (b[0] - a[0]);
      og.fillStyle = css(ink, 0.9 * fade(w));
      og.fillText(c.label, x, a[1] + (b[1] - a[1]) * k - 9 * dpr);
    }
    og.textAlign = 'left';
    for (const p of pins) {
      const w = (t - p.t) / spanS;
      if (w < 0 || w > 1) continue;
      const x = (0.5 - uOf(p.f)) * wx, z = (w - 0.5) * wz;
      const base = project(m, [x, 0, z], W, H), top = project(m, [x, hy * 1.2, z], W, H);
      if (!base || !top) continue;
      const snap = Math.min(1, (t - p.born) / 0.09), a = fade(w) * (0.6 + 0.4 * snap);
      og.strokeStyle = css(ink, 0.5 * a);
      og.lineWidth = 1.2 * dpr;
      og.beginPath(); og.moveTo(base[0], base[1]); og.lineTo(top[0], top[1]); og.stroke();
      const small = p.kind === 'hhc' || p.kind === 'hho';
      og.font = `bold ${Math.round((small ? 9 : 12) * dpr * (1 + 0.4 * (1 - snap)))}px "JetBrains Mono", Consolas, monospace`;
      const tw = og.measureText(p.label).width + 8 * dpr, th = (small ? 12 : 16) * dpr;
      og.fillStyle = css(ink, 0.92 * a);
      og.fillRect(top[0] - tw / 2, top[1] - th, tw, th);
      og.fillStyle = css(bg, a);
      og.fillText(p.label, top[0] - tw / 2 + 4 * dpr, top[1] - th / 2);
    }
  }

  return {
    get broken() { return broken; },
    // (the levels' history wiped too, so coming back to it doesn't show the sound of minutes ago
    // rolling past; the canvases shrunk, their full-window buffers freed while it's off)
    clear() {
      if (gl && prog && !gl.isContextLost()) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RED, gl.FLOAT, (blank ??= new Float32Array(COLS * ROWS)));
      }
      canvas.width = canvas.height = boxCanvas.width = boxCanvas.height = 1;
      pins.length = chords.length = 0;
      column.fill(0);
      heard = {}; bassAt = -1; chordWas = null; lastCol = null; peak = -30; floor = NaN; avg = null;
    },
    // theme: the theme's name; themed: in its colours, not the rainbow; offset: how far ahead to
    // draw (as the blocks), for the beat lines. (Fewer flashes isn't needed: nothing flashes.)
    draw(t, eng, { theme, themed = false, offset = 0 } = {}) {
      if (broken || gl?.isContextLost()) return;
      if (!prog) {
        try { build(); } catch (err) { broken = true; console.error('spectrogram:', err); return; }
        if (broken) return;
      }
      const dt = Math.min(0.1, Math.max(0.001, t - last));
      last = t;
      const dpr = Math.min(1.5, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
      for (const c of [canvas, boxCanvas]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 120, spanS = (4 * 60) / bpm;
      // the columns: one each 1/60 s; the ones since the last frame filled in (with this one, or
      // the bare floor after a long gap, the window hidden: nothing was heard into them)
      const col = Math.floor(t * FPS);
      makeColumn(eng, dt);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const gap = lastCol === null ? 1 : col - lastCol;
      for (let c = col - Math.min(gap, Math.ceil(spanS * FPS) + 2) + 1; c <= col; c++) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, ((c % COLS) + COLS) % COLS, 0, 1, ROWS, gl.RED, gl.FLOAT, gap > 8 && c < col ? quiet : column);
      }
      lastCol = col;
      read(t, eng);
      while (pins.length && t - pins[0].t > spanS + 0.5) pins.shift();
      while (chords.length > 4 || (chords.length && t - chords[0].t > spanS + 0.5)) chords.shift();

      // (the rainbow on black, its marks in white; or the theme's colours, on its background)
      const map = (MAPS[theme] || MAPS.bluescreen).map(hex), bg = themed ? map[0] : [0, 0, 0], ink = themed ? map[4] : [1, 1, 1];
      const view = H > W ? TALL : WIDE;
      const m = times(perspective(view.fov, W / H, 0.1, 20), lookAt(view.eye, view.look, [0, 1, 0]));
      gl.viewport(0, 0, W, H);
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U('spec'), 0);
      gl.uniform1f(U('head'), ((col % COLS) + COLS) % COLS);
      gl.uniform1f(U('span'), spanS * FPS);
      gl.uniform1f(U('cols'), COLS);
      gl.uniformMatrix4fv(U('mvp'), false, m);
      gl.uniform3fv(U('size'), view.size);
      gl.uniform2f(U('step'), 1 / (NX - 1), 1 / (NZ - 1));
      gl.uniform3fv(U('eye'), view.eye);
      gl.uniform1i(U('themed'), themed ? 1 : 0);
      ['m0', 'm1', 'm2', 'm3', 'm4'].forEach((k, i) => gl.uniform3fv(U(k), map[i]));
      gl.uniform3fv(U('bg'), bg);
      gl.uniform3fv(U('ink'), themed ? ink : [0.9, 0.95, 1]);
      const step = eng.stepAt(t + offset);
      gl.uniform1f(U('beatNow'), step === null ? -100 : step / 4);
      gl.uniform1f(U('per'), 60 / bpm / spanS);
      gl.uniform4fv(U('chords'), [0, 1, 2, 3].map((i) => (chords[i] ? (t - chords[i].t) / spanS : -1)));
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
      drawMarks(t, m, { W, H, dpr, size: view.size, spanS, ink, bg });
    },
  };
}
