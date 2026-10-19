// The background "spectrogram" (V): what Toaster hears, and what it makes of it. The song's sound
// pours in at a glowing "now" edge on the right and flows left, 2 bars across, low notes at the
// foot, on black in a heat map of the theme's colours. Each time Toaster recognises something, a
// box snaps onto that sound with the code it became written on it: the kick bd, the clap cp, the
// hats hh and oh (for the lines the code plays), each bass note as the code writes it (e1, a3),
// boxed at that note's pitch; the chord named along the foot where it changes. Bar lines from the
// beat grid. The kick flares the edge (not with fewer flashes).
// Drawn with WebGL (the picture, a column of the analysers' levels a frame) on one canvas and the
// boxes on another over it.
import { NOTES } from './engine.js';

const ROWS = 256, F_LO = 32, F_HI = 15000, FPS = 60, COLS = 1024;
const rowOf = (f) => (ROWS * Math.log(f / F_LO)) / Math.log(F_HI / F_LO);
const freqOf = (r) => F_LO * (F_HI / F_LO) ** (r / ROWS);
// what a hit is boxed round (Hz), its label, and how long the box is (s)
const BANDS = { bd: [36, 140, 'bd', 0.1], sd: [1300, 4600, 'cp', 0.12], hhc: [7000, 14000, 'hh', 0.06], hho: [5200, 12500, 'oh', 0.22] };
// each theme's heat map: black up through its colours to white (the light theme the other way)
const MAPS = {
  bluescreen: ['#000000', '#0a1660', '#1d4dff', '#4fd2ff', '#ffffff'],
  blackscreen: ['#000000', '#3b0f70', '#b5367a', '#fb8761', '#fcfdbf'],
  terminal: ['#000000', '#00300f', '#0f8a2e', '#3dff76', '#e8ffee'],
  pink: ['#000000', '#3a0026', '#a3156b', '#ff5cbf', '#fff0f8'],
  whitescreen: ['#ffffff', '#c9d4ff', '#5a7dff', '#1c2a8a', '#000000'],
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

const VS = `#version 300 es
in vec2 a; out vec2 uv; void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
// x: the last span columns, now at the right; y: the rows; the heat map's five stops
const FS = `#version 300 es
precision highp float;
uniform sampler2D spec; uniform vec3 c0, c1, c2, c3, c4; uniform float head, span, cols, pulse; uniform vec2 res;
in vec2 uv; out vec4 o;
vec3 heat(float v) {
  return v < 0.25 ? mix(c0, c1, v / 0.25) : v < 0.5 ? mix(c1, c2, (v - 0.25) / 0.25) : v < 0.75 ? mix(c2, c3, (v - 0.5) / 0.25) : mix(c3, c4, (v - 0.75) / 0.25);
}
void main() {
  float col = head - (1.0 - uv.x) * span;
  float v = texture(spec, vec2((col + 0.5) / cols, uv.y)).r;
  vec3 c = heat(clamp(v * (1.0 + 0.25 * pulse), 0.0, 1.0));
  // the "now" edge: a glow at the right, flaring on the kick
  float edge = exp(-(1.0 - uv.x) * res.x / (18.0 + 40.0 * pulse));
  o = vec4(c + (c3 * 0.35 + c4 * 0.25 * pulse) * edge, 1.0);
}`;

export function createSpectro(canvas, boxCanvas) {
  const og = boxCanvas.getContext('2d');
  let gl = null, prog = null, quad = null, tex = null, U = null, broken = false;
  let lastCol = null, peak = -40, last = 0, kickV = 0, pulse = 0;
  let heard = {}, bassAt = -1, chordWas = null, blank = null;
  const boxes = [];
  const column = new Uint8Array(ROWS), dark = new Uint8Array(ROWS), raw = new Float32Array(ROWS);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); prog = null; });
  canvas.addEventListener('webglcontextrestored', () => { prog = null; lastCol = null; });

  function build() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) { broken = true; return; }
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const loc = {};
    U = (n) => loc[n] ??= gl.getUniformLocation(prog, n);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, COLS, ROWS, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(COLS * ROWS));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    lastCol = null;
  }

  // A column: each row's level, from the analysis that resolves it best (the 4096-point one up to
  // 1.5 kHz, the quicker 1024-point one above), lifted 3 dB an octave above 1 kHz (music's highs
  // are quieter: the hats would hardly show), taken against a peak that follows the music (so a
  // quiet song still fills the range, but silence stays black): the top 60 dB under it, on a curve.
  function makeColumn(eng) {
    const hzMid = eng.sr / (eng.midDb.length * 2), hzFast = eng.hzFast;
    const at = (db, hz, f) => { const b = f / hz, i = Math.floor(b), k = b - i, a = db[Math.min(db.length - 1, i)], c = db[Math.min(db.length - 1, i + 1)]; return a + (c - a) * k; };
    let top = -Infinity;
    for (let r = 0; r < ROWS; r++) {
      const f = freqOf(r + 0.5);
      const d = (f < 1500 ? at(eng.midDb, hzMid, f) : at(eng.fastDb, hzFast, f)) + (f > 1000 ? 3 * Math.log2(f / 1000) : 0);
      raw[r] = d;
      if (d > top) top = d;
    }
    peak = Math.max(-55, top > peak ? top : peak - 0.03); // (up at once, down slowly)
    for (let r = 0; r < ROWS; r++) column[r] = Math.round(Math.max(0, Math.min(1, (raw[r] - (peak - 60)) / 60)) ** 1.7 * 255) || 0;
  }

  // What Toaster has recognised, as boxes: { kind, t, w (s), lo, hi (Hz), label }
  function read(t, eng) {
    for (const id of ['bd', 'sd', 'hhc', 'hho']) {
      const h = eng.v[id].lastHit;
      if (h.t > (heard[id] ?? -1) && t - h.t < 0.5) {
        heard[id] = h.t;
        if (eng.present(id, t)) {
          const [lo, hi, label, w] = BANDS[id];
          boxes.push({ kind: id, t: h.t, w, lo, hi, label, born: t });
          if (id === 'bd') kickV = 1;
        }
      }
    }
    // a bass note, while the code's bassline plays: labelled with the note the code wrote for its
    // bar (the bar's slot, as the bassline line shows it) and boxed at that pitch; the pitch heard,
    // if the bar has no note yet
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
      const prev = boxes.findLast((x) => x.kind === 'bass');
      if (prev && !prev.w) prev.w = Math.max(0.08, b.t - prev.t - 0.02);
      boxes.push({ kind: 'bass', t: b.t, w: 0, lo: f * 2 ** (-1.5 / 12), hi: f * 2 ** (1.5 / 12), label, born: t });
    }
    const ch = eng.lastChord;
    if (ch && ch !== chordWas) { chordWas = ch; boxes.push({ kind: 'chord', t, label: NOTES[ch.root] + (ch.third === 3 ? 'm' : ''), born: t }); }
  }

  // The boxes: corner brackets round the sound, a tag with its code (inside the box when above
  // would be off the top); they snap in (from half again as big, brighter) and fade over the 2 bars
  function drawBoxes(t, eng, { W, H, dpr, span, map, offset, bpm }) {
    og.clearRect(0, 0, W, H);
    const ink = map[4], bg = map[0];
    const xOf = (tt) => W - ((t - tt) / span) * W, yOf = (f) => H - (rowOf(f) / ROWS) * H;
    og.textBaseline = 'middle';
    const step = eng.stepAt(t + offset);
    if (step !== null) {
      const per16 = 60 / bpm / 4;
      og.fillStyle = css(ink, 0.14);
      for (let k = 0; k < 4; k++) {
        const x = xOf(t - (step - (Math.floor(step / 16) - k) * 16) * per16);
        if (x >= 0) og.fillRect(x, 0, Math.max(1, dpr), H);
      }
    }
    for (const bx of boxes) {
      const snap = Math.min(1, (t - bx.born) / 0.09), fade = Math.max(0, 1 - (t - bx.t) / span) ** 0.6;
      if (bx.kind === 'chord') {
        const x = xOf(bx.t);
        og.font = `bold ${Math.round(13 * dpr)}px "JetBrains Mono", Consolas, monospace`;
        og.fillStyle = css(ink, 0.85 * fade);
        og.fillRect(x, H - 30 * dpr, Math.max(1, dpr), 30 * dpr);
        og.fillText(bx.label, x + 6 * dpr, H - 14 * dpr);
        continue;
      }
      const w = bx.kind === 'bass' ? bx.w || Math.max(0.08, t - bx.t) : bx.w;
      let x0 = xOf(bx.t - 0.015), x1 = Math.min(W, xOf(bx.t + w)), y0 = yOf(bx.hi), y1 = yOf(bx.lo);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = 1 + 0.5 * (1 - snap);
      x0 = cx + (x0 - cx) * k; x1 = cx + (x1 - cx) * k; y0 = cy + (y0 - cy) * k; y1 = cy + (y1 - cy) * k;
      const a = (0.55 + 0.45 * (1 - snap)) * fade, L = Math.min(10 * dpr, (x1 - x0) / 2.5, (y1 - y0) / 2.5);
      og.strokeStyle = css(ink, a);
      og.lineWidth = 1.5 * dpr;
      og.beginPath();
      for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { og.moveTo(px + sx * L, py); og.lineTo(px, py); og.lineTo(px, py + sy * L); }
      og.stroke();
      if (snap < 1) { og.strokeStyle = css(ink, 0.25 * (1 - snap)); og.strokeRect(x0, y0, x1 - x0, y1 - y0); }
      const small = bx.kind === 'hhc' || bx.kind === 'hho';
      og.font = `bold ${Math.round((small ? 9 : 11) * dpr)}px "JetBrains Mono", Consolas, monospace`;
      const tw = og.measureText(bx.label).width + 8 * dpr, th = (small ? 12 : 15) * dpr;
      const ty = y0 - th - 2 * dpr < 0 ? y0 + 2 * dpr : y0 - th - 2 * dpr;
      og.fillStyle = css(ink, 0.9 * fade);
      og.fillRect(x0, ty, tw, th);
      og.fillStyle = css(bg, 1);
      og.fillText(bx.label, x0 + 4 * dpr, ty + th / 2);
    }
  }

  return {
    get broken() { return broken; },
    // (the picture's history wiped too, so coming back to it doesn't show the sound of minutes
    // ago sliding out; the canvases shrunk, their full-window buffers freed while it's off)
    clear() {
      if (gl && prog && !gl.isContextLost()) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RED, gl.UNSIGNED_BYTE, (blank ??= new Uint8Array(COLS * ROWS)));
      }
      canvas.width = canvas.height = boxCanvas.width = boxCanvas.height = 1;
      boxes.length = 0; heard = {}; bassAt = -1; chordWas = null; lastCol = null; peak = -40;
    },
    // theme: the theme's name; offset: how far ahead to draw (as the blocks), for the bar lines
    draw(t, eng, { theme, offset = 0, calm = false }) {
      if (broken || gl?.isContextLost()) return;
      if (!prog) {
        try { build(); } catch (err) { broken = true; console.error('spectrogram:', err); return; }
        if (broken) return;
      }
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
      for (const c of [canvas, boxCanvas]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 120, span = (2 * 4 * 60) / bpm;
      // the columns: one each 1/60 s; the ones since the last frame filled in (with this one, or
      // black after a long gap, the window hidden: nothing was heard into them)
      const col = Math.floor(t * FPS);
      makeColumn(eng);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const gap = lastCol === null ? 1 : col - lastCol;
      for (let c = col - Math.min(gap, Math.ceil(span * FPS) + 2) + 1; c <= col; c++) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, ((c % COLS) + COLS) % COLS, 0, 1, ROWS, gl.RED, gl.UNSIGNED_BYTE, gap > 8 && c < col ? dark : column);
      }
      lastCol = col;
      read(t, eng);
      while (boxes.length && t - boxes[0].t > span + 1) boxes.shift();
      kickV *= Math.exp(-dt / 0.12);
      pulse += ((calm ? 0 : kickV) - pulse) * (1 - Math.exp(-dt / 0.03));

      const map = (MAPS[theme] || MAPS.bluescreen).map(hex);
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U('spec'), 0);
      ['c0', 'c1', 'c2', 'c3', 'c4'].forEach((k, i) => gl.uniform3fv(U(k), map[i]));
      gl.uniform1f(U('head'), ((col % COLS) + COLS) % COLS);
      gl.uniform1f(U('span'), span * FPS);
      gl.uniform1f(U('cols'), COLS);
      gl.uniform1f(U('pulse'), pulse);
      gl.uniform2f(U('res'), W, H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      drawBoxes(t, eng, { W, H, dpr, span, map, offset, bpm });
    },
  };
}
