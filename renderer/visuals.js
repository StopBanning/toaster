// Background visuals: ASCII field (spectrum + kick ripples, code rain, oscilloscope), a
// wireframe tunnel like the Hardcore Software visualizers, Strudel-style floating punchcard
// blocks, and the webcam tinted to the theme.
import { VOICES } from './engine.js';
import { beatRuns } from './codegen.js';
import { createDominoes } from './dominoes.js';
import { compileProgram } from './program.js';
import { pictureMap, toPicture, place, cropFrom, maskU } from './camview.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const RAMP = ' .:-=+*#%@';

// Reads a CSS colour (any syntax) as [r, g, b].
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
export function rgbOf(css) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function fit(canvas, scale = 1) {
  const w = Math.round(innerWidth * scale), h = Math.round(innerHeight * scale);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return [w, h];
}

// Log-spaced bands (0..1) from the fast analyser's spectrum, written into `out`.
export function bands(eng, out, lo = 40, hi = 14000) {
  const n = out.length, db = eng.fastDb, hz = eng.hzFast;
  for (let i = 0; i < n; i++) {
    const f0 = lo * (hi / lo) ** (i / n), f1 = lo * (hi / lo) ** ((i + 1) / n);
    let m = -160;
    for (let k = Math.floor(f0 / hz); k <= Math.max(Math.floor(f0 / hz), Math.floor(f1 / hz)) && k < db.length; k++) m = Math.max(m, db[k]);
    out[i] = clamp((m + 95) / 65, 0, 1);
  }
  return out;
}

// ---------------------------------------------------------------- ASCII field

// Drawn with WebGL where there is one: every character a small square cut from a sheet of glyphs
// drawn once in the same font, size and spacing, all in one call. Drawing it as rows of text
// (which it still does without WebGL) cost about 14% of a core, the most of anything on screen.
// The squares are a little taller and wider than a cell, so descenders and overhangs fall into
// the next row the way the text did.
const FIELD_PX = 14;
const GLYPHS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(''); // printable ASCII
const OTHER = GLYPHS.indexOf('+'); // stands in for anything else (a title's accents, say) in the code rain

function glField(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const VS = `#version 300 es
    in vec2 corner;          // 0-1 across the square
    in vec3 cell;            // column, row, glyph
    uniform vec2 view;       // the canvas, device px
    uniform vec2 step;       // from one cell to the next, device px
    uniform vec2 box;        // a glyph's square on the sheet, px
    uniform vec2 inset;      // where the cell starts inside its square
    uniform vec2 sheet;      // the sheet, px
    uniform float perRow;    // glyphs on a row of the sheet
    out vec2 uv;
    void main() {
      vec2 px = cell.xy * step - inset + corner * box;
      vec2 at = vec2(mod(cell.z, perRow), floor(cell.z / perRow)) * box;
      uv = (at + corner * box) / sheet;
      gl_Position = vec4(px.x / view.x * 2.0 - 1.0, 1.0 - px.y / view.y * 2.0, 0.0, 1.0);
    }`;
  const FS = `#version 300 es
    precision mediump float;
    in vec2 uv;
    uniform sampler2D glyphs;
    uniform vec3 color;
    out vec4 o;
    void main() { float a = texture(glyphs, uv).a; o = vec4(color * a, a); }`;
  let prog, vao, cells, tex, u, job, ready = false, failed = false, dims = null, last = null, data = new Float32Array(0);
  // Everything on the GPU side; again after the GPU drops it (a driver reset, say).
  function build() {
    ready = false; failed = false; dims = null;
    try { job = compileProgram(gl, VS, FS); prog = job.program; }
    catch (err) { failed = true; console.error('field:', err); }
  }
  function finish() {
    if (ready || failed || gl.isContextLost()) return ready;
    try { if (!job.ready()) return false; }
    catch (err) { failed = true; console.error('field:', err); return false; }
    u = Object.fromEntries(['view', 'step', 'box', 'inset', 'sheet', 'perRow', 'color', 'glyphs'].map((n) => [n, gl.getUniformLocation(prog, n)]));
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const aCorner = gl.getAttribLocation(prog, 'corner'), aCell = gl.getAttribLocation(prog, 'cell');
    gl.enableVertexAttribArray(aCorner);
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
    cells = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cells);
    gl.enableVertexAttribArray(aCell);
    gl.vertexAttribPointer(aCell, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aCell, 1);
    tex = gl.createTexture();
    dims = null;
    ready = true;
    if (last) api.setup(...last);
    return true;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => build());
  const api = {
    ready: finish,
    get failed() { return failed; },
    get waiting() { return !failed && !ready; },
    // The sheet of glyphs for this cell width and pixel ratio.
    setup(cw, dpr, font) {
      last = [cw, dpr, font];
      if (!ready) return;
      const pad = 2, bw = Math.ceil((cw + 2 * pad) * dpr), bh = Math.ceil(FIELD_PX * 1.5 * dpr), perRow = 16;
      const sheet = document.createElement('canvas');
      sheet.width = perRow * bw;
      sheet.height = Math.ceil(GLYPHS.length / perRow) * bh;
      const sx = sheet.getContext('2d');
      sx.font = `${FIELD_PX * dpr}px ${font}`;
      sx.textBaseline = 'top';
      sx.fillStyle = '#fff';
      for (let i = 0; i < GLYPHS.length; i++) sx.fillText(GLYPHS[i], (i % perRow) * bw + pad * dpr, Math.floor(i / perRow) * bh + pad * dpr);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      dims = { step: [cw * dpr, FIELD_PX * dpr], box: [bw, bh], inset: [pad * dpr, pad * dpr], sheet: [sheet.width, sheet.height], perRow };
    },
    draw(grid, [r, g, b]) {
      if (!dims || gl.isContextLost()) return;
      let n = 0;
      const need = grid.length * (grid[0]?.length || 0) * 3;
      if (data.length < need) data = new Float32Array(need);
      for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === ' ') continue;
          const c = ch.charCodeAt(0);
          data[n++] = x; data[n++] = y; data[n++] = c > 32 && c < 127 ? c - 32 : OTHER;
        }
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!n) return;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cells);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n), gl.STREAM_DRAW);
      gl.uniform2f(u.view, canvas.width, canvas.height);
      gl.uniform2fv(u.step, dims.step);
      gl.uniform2fv(u.box, dims.box);
      gl.uniform2fv(u.inset, dims.inset);
      gl.uniform2fv(u.sheet, dims.sheet);
      gl.uniform1f(u.perRow, dims.perRow);
      gl.uniform3f(u.color, r / 255, g / 255, b / 255);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.glyphs, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n / 3);
    },
  };
  build();
  return api;
}

export function createField(canvas) {
  let gpu = glField(canvas);
  // (if WebGL started but its shaders didn't, this canvas can't draw text any more: use a new one)
  if (!gpu && canvas.getContext('webgl2')) { const fresh = canvas.cloneNode(); canvas.replaceWith(fresh); canvas = fresh; }
  let ctx = gpu ? null : canvas.getContext('2d');
  const meter = document.createElement('canvas').getContext('2d');
  const f = { cols: 0, rows: 0, cw: 8.4, spec: null, band: null, heights: null, grid: [], rings: [], drops: [], last: 0, pool: 'strudel$:()[]<>~*.' };
  function measure() {
    const dpr = Math.min(1.5, devicePixelRatio || 1), font = getComputedStyle(document.documentElement).getPropertyValue('--font');
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    meter.font = `${FIELD_PX}px ${font}`;
    f.cw = meter.measureText('M'.repeat(100)).width / 100 || 8.4;
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = meter.font;
      ctx.textBaseline = 'top';
    }
    gpu?.setup(f.cw, dpr, font);
    f.cols = Math.ceil(innerWidth / f.cw) + 1;
    f.rows = Math.ceil(innerHeight / FIELD_PX) + 1;
    f.spec = new Float32Array(f.cols);
    f.band = new Float32Array(f.cols);
    f.heights = new Float32Array(f.cols);
    f.grid = Array.from({ length: f.rows }, () => new Array(f.cols).fill(' '));
    f.drops = Array.from({ length: f.cols }, () => ({ y: Math.random() * -f.rows, v: 8 + Math.random() * 14 }));
  }
  // (sized again on a resize and once the font's in, unless it's off: then draw() sizes it when it's
  // next shown, and a background that isn't up keeps no window-sized buffers)
  const remeasure = () => { if (canvas.width) measure(); };
  addEventListener('resize', remeasure);
  document.fonts?.ready.then(remeasure);
  measure();

  return {
    get waiting() { return !!gpu?.waiting; },
    kick(s) {
      f.rings.push({ t: performance.now() / 1000, s: 0.8 + 0.2 * Math.min(1.5, s) });
      if (f.rings.length > 5) f.rings.shift();
    },
    setPool(text) { f.pool = text.replace(/\s+/g, '') || f.pool; },
    // Not in use: drop the canvas's memory too (draw() sizes it again when needed).
    clear() { canvas.width = canvas.height = 0; },
    // mode: spectrum, rain, scope, or cam (the webcam as text). cam: the webcam, for the cam mode,
    // or, with its cut-out, so the others leave room for you (the camera as text is a layer of its
    // own, over this one)
    draw(t, eng, mode, col, cam) {
      // Poll even between text frames. Locations and the glyph texture wait for linking;
      // a failed link still gets the existing 2D fallback, on a fresh canvas.
      if (gpu && !gpu.ready()) {
        if (!gpu.failed) return;
        const fresh = canvas.cloneNode(); canvas.replaceWith(fresh); canvas = fresh;
        gpu = null; ctx = canvas.getContext('2d'); measure();
      }
      if (t - f.last < 1 / 24) return; // 24 fps is plenty for text art
      if (!canvas.width) measure();
      const dt = Math.min(0.1, t - f.last);
      f.last = t;
      const { cols, rows, grid } = f;
      for (const row of grid) row.fill(' ');
      if (mode === 'rain') {
        const pool = f.pool, speed = 0.6 + eng.level * 6;
        f.drops.forEach((d, x) => {
          d.y += d.v * speed * dt;
          if (d.y - 12 > rows) { d.y = Math.random() * -8; d.v = 8 + Math.random() * 14; }
          for (let k = 0; k < 12; k++) {
            const y = Math.floor(d.y) - k;
            if (y < 0 || y >= rows) continue;
            grid[y][x] = k === 0 ? pool[(x * 7 + y * 13) % pool.length] : k < 5 ? pool[(x + y * 3 + k) % pool.length] : k < 8 ? ':' : '.';
          }
        });
      } else if (mode === 'cam') {
        // The camera as text: each character the light where its cell falls on the picture (as the
        // camera layer shows it: mirrored or not, cropped to fill), from blank to dense; on a light theme
        // the shadows are the dense ones, so it isn't a negative. With the cut-out, nothing where
        // you aren't (the room is dark in the picture, and a light theme made that the densest).
        const fr = cam?.frame, r = cam?.rect;
        if (fr && r) {
          const light = col.fg[0] + col.fg[1] + col.fg[2] < col.bg[0] + col.bg[1] + col.bg[2];
          for (let y = 0; y < rows; y++) {
            const py = (y + 0.5) * FIELD_PX;
            if (py < r.y || py >= r.y + r.h) continue;
            const base = Math.min(fr.h - 1, Math.floor(((py - r.y) / r.h) * fr.h)) * fr.w, row = grid[y];
            for (let x = 0; x < cols; x++) {
              const px = (x + 0.5) * f.cw;
              if (px < r.x || px >= r.x + r.w) continue;
              const k = base + Math.min(fr.w - 1, Math.floor(((px - r.x) / r.w) * fr.w));
              if (fr.see && fr.see[k] < 128) continue;
              let a = fr.lum[k] / 255;
              if (light) a = 1 - a;
              if (a > 0.06) row[x] = RAMP[Math.min(9, Math.floor(a * 9.99))];
            }
          }
        }
      } else if (mode === 'scope') {
        const buf = eng.time, mid = rows / 2;
        let prevY = null;
        for (let x = 0; x < cols; x++) {
          const v = buf[Math.floor((x / cols) * buf.length)] || 0;
          const y = clamp(Math.round(mid - v * rows * 0.9), 0, rows - 1);
          const lo = prevY === null ? y : Math.min(y, prevY), hi = prevY === null ? y : Math.max(y, prevY);
          for (let yy = lo; yy <= hi; yy++) grid[yy][x] = yy === y ? '*' : '|';
          prevY = y;
        }
      } else {
        // spectrum "mountains" plus a ripple on every kick
        bands(eng, f.band);
        for (let x = 0; x < cols; x++) {
          f.spec[x] = Math.max(f.band[x], f.spec[x] * 0.86);
          f.heights[x] = f.spec[x] * rows * 0.85;
        }
        f.rings = f.rings.filter((r) => t - r.t < 1.4);
        const cx = cols / 2, cy = rows / 2, aspect = FIELD_PX / f.cw, level = f.band; // band is free to reuse now
        const mark = (row, x, a) => { if (a > 0.1) row[x] = RAMP[Math.min(9, Math.floor(a * 9.99))]; };
        for (let y = 0; y < rows; y++) {
          const fromBottom = rows - 1 - y, dy = (y - cy) * aspect, row = grid[y];
          for (let x = 0; x < cols; x++) {
            const h = f.heights[x];
            level[x] = fromBottom < h ? 0.35 + 0.65 * (1 - fromBottom / Math.max(1, h)) : 0;
          }
          // A ripple only touches the cells near its edge, so only those are worked out.
          for (const r of f.rings) {
            const age = t - r.t, radius = age * 38 * r.s, fadeOut = 1 - age / 1.4;
            if (Math.abs(dy) > radius + 2) continue;
            const outer = Math.sqrt((radius + 2) ** 2 - dy * dy), inner = Math.sqrt(Math.max(0, (radius - 2) ** 2 - dy * dy));
            for (let side = -1; side <= 1; side += 2) {
              const x0 = Math.max(0, Math.floor(cx + side * (side < 0 ? outer : inner))), x1 = Math.min(cols - 1, Math.ceil(cx + side * (side < 0 ? inner : outer)));
              for (let x = x0; x <= x1; x++) {
                const ring = Math.max(0, 1 - Math.abs(Math.hypot(x - cx, dy) - radius) / 2) * fadeOut;
                if (ring > level[x]) level[x] = ring;
              }
            }
          }
          for (let x = 0; x < cols; x++) mark(row, x, level[x]);
        }
      }
      // where you are, with the camera's cut-out, the background leaves room for you (the same
      // character cells the camera's layer draws you in), so you're in front of it, not mixed in
      if (mode !== 'cam' && cam?.frame?.see && cam.rect) {
        const fr = cam.frame, r = cam.rect;
        for (let y = 0; y < rows; y++) {
          const py = (y + 0.5) * FIELD_PX;
          if (py < r.y || py >= r.y + r.h) continue;
          const base = Math.min(fr.h - 1, Math.floor(((py - r.y) / r.h) * fr.h)) * fr.w, row = grid[y];
          for (let x = 0; x < cols; x++) {
            const px = (x + 0.5) * f.cw;
            if (px >= r.x && px < r.x + r.w && fr.see[base + Math.min(fr.w - 1, Math.floor(((px - r.x) / r.w) * fr.w))] >= 128) row[x] = ' ';
          }
        }
      }
      if (gpu) { gpu.draw(grid, col.fg); return; }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = `rgb(${col.fg[0]},${col.fg[1]},${col.fg[2]})`;
      for (let y = 0; y < rows; y++) {
        const text = grid[y].join('');
        if (text.trim()) ctx.fillText(text, 0, y * FIELD_PX);
      }
    },
  };
}

// ---------------------------------------------------------------- wireframe tunnel

export function createTunnel(canvas) {
  const ctx = canvas.getContext('2d');
  const N = 26, M = 36;
  const rings = Array.from({ length: N }, (_, i) => ({ z: (i + 1) / N }));
  // Point buffers reused every frame (this ring and the one behind it), so drawing makes no garbage.
  let pts = new Float32Array(M * 2), prev = new Float32Array(M * 2);
  const spec = new Float32Array(M);
  let flash = 0, last = 0;
  // Drawn at 75% resolution and stretched to fit: a soft background of thin lines looks the same,
  // and it's about half the pixels to fill.
  const SCALE = 0.75;
  return {
    kick(s) { flash = Math.min(1, 0.5 + s * 0.35); },
    // Not in use: drop the canvas's memory too.
    clear() { canvas.width = canvas.height = 0; },
    draw(t, eng, col) {
      const [W, H] = fit(canvas, SCALE);
      const dt = Math.min(0.05, t - last || 0.016);
      last = t;
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 110;
      const speed = 0.11 * (bpm / 120) * (1 + flash * 1.8);
      flash *= 0.86;
      bands(eng, spec);
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2 + Math.sin(t * 0.3) * W * 0.05, cy = H / 2 + Math.cos(t * 0.23) * H * 0.05;
      const base = Math.min(W, H) * 0.055;
      for (const r of rings) { r.z -= speed * dt; if (r.z <= 0.03) r.z += 1; }
      rings.sort((a, b) => b.z - a.z); // far to near; sorts in place
      let first = true;
      for (const r of rings) {
        const R = base / r.z, near = 1 - r.z;
        for (let i = 0; i < M; i++) {
          // twisting spiral: the angle drifts with depth and time
          const a = (i / M) * Math.PI * 2 + t * 0.2 + r.z * 2.2;
          const bump = 1 + 0.5 * spec[i] * near;
          pts[2 * i] = cx + Math.cos(a) * R * bump;
          pts[2 * i + 1] = cy + Math.sin(a) * R * bump * 0.8;
        }
        const alpha = Math.min(1, near * 1.5);
        ctx.strokeStyle = rgba(col.fg, alpha * 0.9);
        ctx.lineWidth = (0.6 + near * 2.4) * SCALE;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 1; i < M; i++) ctx.lineTo(pts[2 * i], pts[2 * i + 1]);
        ctx.closePath();
        ctx.stroke();
        if (!first) {
          ctx.lineWidth = (0.4 + near * 1.2) * SCALE;
          ctx.beginPath();
          for (let i = 0; i < M; i += 2) { ctx.moveTo(prev[2 * i], prev[2 * i + 1]); ctx.lineTo(pts[2 * i], pts[2 * i + 1]); }
          ctx.stroke();
        }
        first = false;
        const swap = prev;
        prev = pts;
        pts = swap;
      }
      // the waveform as dark shards around the centre, like the album visualizers
      const buf = eng.time;
      ctx.fillStyle = rgba(col.ink, 0.55);
      ctx.beginPath();
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const v = Math.abs(buf[Math.floor((i / 64) * buf.length)] || 0);
        const r0 = base * 2.2, r1 = r0 + v * Math.min(W, H) * 0.9;
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8);
        ctx.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1 * 0.8);
        ctx.lineTo(cx + Math.cos(a + 0.1) * r0, cy + Math.sin(a + 0.1) * r0 * 0.8);
      }
      ctx.fill();
      if (flash > 0.35) { ctx.fillStyle = rgba(col.fg, (flash - 0.35) * 0.22); ctx.fillRect(0, 0, W, H); }
    },
  };
}

// ---------------------------------------------------------------- floating punchcard blocks

// Like Strudel's full-screen punchcard(): the learned pattern as blocks sliding toward a
// playhead in the middle, lighting up as they cross it, so you can see what's coming. Two bars
// are visible.
//
// The blocks work like a sequencer queue. Each one is made as it enters at the right edge, from
// the pattern as it stands then, and keeps its place from then on: a changed pattern only
// affects blocks still to come. A part that stops (nothing heard for a while) goes dim and stops
// lighting up, and lights again the moment it's back; after 8 bars gone it stops sending blocks.
// Nothing pops up or vanishes in the middle of the screen.
const PCS = 'c c# d eb e f f# g ab a bb b'.split(' ');
const AHEAD = 16; // steps visible on each side of the playhead (one bar)
const ROW = { chords: 0, vox: 1, hho: 2, hhc: 3, sd: 4, bd: 5, bass: 6 };
const ROWS = { ...ROW, n: 7 }; // (for the dominoes: the rows and how many)
const WAITING = 0.42, LIT = 0.95, GHOST = 0.14; // how bright: a block, one crossing, one of a part that stopped

// The handheld game (game.js, its screens' designs and their drawing: about 90 KB) is fetched the first time it's
// shown, not with the page, so a first visit to the website is no bigger for it. Its screens' design (A) is kept here
// till then: the designs the app goes round, in turn (the first is the one it starts with).
// (the fretboard, 'highway', is off the round till it's polished: window.__gameSkin = 'highway' still draws it)
// (jp: the Japan edition, Toaster's own screens in Japanese on a Famicom-style handheld of its own)
export const GAME_SCREENS = ['os', 'neon', 'lcd', 'jp'];
let gameScreens = GAME_SCREENS[0], gameMod = null, gameLoad = null;
export function setGameScreens(name) { if (GAME_SCREENS.includes(name)) { gameScreens = name; gameMod?.setGameScreens(name); } }
// The code view's lines as they stand, for the handheld's bottom screen to show now and then (app.js hands over a
// function; the game calls it as it draws)
let gameCode = null;
export function setGameCode(fn) { gameCode = fn; }
// (a failed fetch, the website offline, is tried again after a few seconds, not every frame)
const loadGame = () => (gameLoad ??= import('./game.js').then((m) => { gameMod = m; m.setGameScreens(gameScreens); return m; }, () => { setTimeout(() => { gameLoad = null; }, 5000); return null; }));

export function createPunchcard(canvas) {
  const ctx = canvas.getContext('2d');
  const level = Object.fromEntries(Object.keys(ROW).map((k) => [k, 1])); // 1 playing .. 0 stopped
  let last = 0, vg = null, queuedTo = 0, moved = 0, blocks = [], sending = {}; // (sending: which parts the queue last sent blocks for)
  const dominoes = createDominoes();
  let game = null; // (game.js's, once it has been fetched: loadGame)
  const reset = () => { vg = null; blocks = []; sending = {}; dominoes.reset(); game?.reset(); };

  // Is a part playing? Heard within its longest gap between hits plus two beats, so a missed
  // hit or two doesn't count as stopping.
  const playing = (eng, id, t) => {
    const v = eng.v[id], on = v.shown;
    if (!on || v.tooBusy) return false; // (a clap pattern too busy to be one isn't shown anywhere)
    let first = -1, prev = -1, gap = 0;
    for (let s = 0; s < 16; s++) {
      if (!on[s]) continue;
      if (prev < 0) first = s;
      else gap = Math.max(gap, s - prev);
      prev = s;
    }
    if (prev < 0) return false;
    gap = Math.max(gap, first + 16 - prev);
    return t - v.last < ((gap + 8) * eng.tempo.P) / 4;
  };

  // Queues every step up to `to` from the patterns as they are now. For the game (look), a part that starts sending
  // blocks again (its pattern just learned, or back after 8 bars gone) also fills the steps already queued ahead of the
  // playhead, so its lane fills at once instead of a bar later (marked late: they fade in, not falling in from the top).
  const queue = (eng, t, to, look) => {
    const recent = (seen) => t - seen < 32 * eng.tempo.P; // heard in the last 8 bars
    for (const id of VOICES) {
      const v = eng.v[id], now = !!v.shown?.some(Boolean) && !v.tooBusy && recent(v.last);
      if (look === 'game' && now && sending[id] === false) {
        for (let g = Math.floor(vg) + 1; g <= queuedTo; g++) if (v.shown[((g % 16) + 16) % 16]) blocks.push({ lane: id, g, len: 0.9, lit: false, late: t });
      }
      sending[id] = now;
    }
    const rhythm = eng.v.bass.shown?.some(Boolean) && recent(eng.v.bass.last) ? eng.v.bass.shown : null;
    for (let g = Math.floor(queuedTo) + 1; g <= to; g++) {
      const s = ((g % 16) + 16) % 16, past = g < vg;
      for (const id of VOICES) {
        const v = eng.v[id];
        if (v.shown?.[s] && !v.tooBusy && recent(v.last)) blocks.push({ lane: id, g, len: 0.9, lit: past && level[id] > 0.5 });
      }
      // The bass: a block per note when its rhythm is known (each lasting to the next, at the note
      // of its beat where the bass moves in the bar), else one for each of the bar's notes by the
      // beat (engine.js bassTrack), or one for the bar.
      const k4 = ((Math.floor(g / 16) % 4) + 4) % 4, slot = eng.slots[k4], runs = beatRuns(eng.bassBeats?.[k4]);
      const run = runs?.find((r) => r.beats.includes(s >> 2));
      if ((rhythm ? rhythm[s] : runs ? run.beats[0] * 4 === s : s === 0) && (run || slot?.bass) && recent(eng.bassSeen)) {
        const pc = run ? run.m % 12 : PCS.indexOf(slot.bass.replace(/\d+$/, ''));
        let len = rhythm || !run ? 16 - s : run.beats.length * 4;
        if (rhythm) for (let k = s + 1; k < 16; k++) if (rhythm[k]) { len = k - s; break; }
        if (pc >= 0) blocks.push({ lane: 'bass', g, len: len - 0.3, pc, lit: past && level.bass > 0.5 });
      }
      if (s !== 0) continue;
      if (slot?.chord && recent(eng.chordSeen)) {
        // (tone: which of the chord's notes, for the dominoes, which stand them one behind another)
        [0, slot.chord.third, 7].forEach((iv, tone) => blocks.push({ lane: 'chords', g, len: 15.6, pc: (slot.chord.root + iv) % 12, tone, lit: past && level.chords > 0.5 }));
      }
    }
    queuedTo = Math.max(queuedTo, to);
  };

  return {
    // For tests (tools/checks.js): the drawing clock and the queued blocks.
    get vg() { return vg; },
    get blocks() { return blocks; },
    // Turned off: drop the canvas's memory too.
    clear() { canvas.width = canvas.height = 0; reset(); dominoes.release(); game?.release(); },
    // a drop, for the game: its fever
    drop(t, P) { game?.drop(t, P); },
    // the game's power-on again (it boots by itself when it comes on)
    boot() { game?.boot(); },
    newSong(playing) { game?.newSong(playing); },
    // offset (seconds) draws that far ahead, to make up for the time it takes to hear,
    // detect and draw a hit; the [ and ] keys tune it. chips: each block (and the playhead) on a
    // chip of the theme's panel colour, as the code's lines are over the worlds, whose pictures
    // can be white enough (the receipt look, a bright planet) to hide white blocks. look: 'blocks',
    // 'dominoes' (dominoes.js) or 'game' (game.js, which shows the song's title, and on a tall screen
    // stands in front of the code's lower lines), those two drawn at the screen's full resolution for
    // their fine lines.
    draw(t, eng, col, offset = 0, chips = false, look = 'blocks', title = '', pocket = false, colorway = 'blue') {
      const [W, H] = fit(canvas, look === 'dominoes' || look === 'game' ? Math.min(2, devicePixelRatio || 1) : 1);
      const gap = t - last, dt = Math.min(0.1, gap || 0.016);
      last = t;
      const target = eng.stepAt(t + offset);
      // The handheld game stands by instead of fading or playing on: a device stays where it is, its screens saying why.
      // It does from the moment it's picked till a song's beat is found, once the music has stopped, and while a new
      // song's beat isn't found yet. Stopped is when the engine itself would give up on the song: 4 s of quiet, or 20 s
      // while Windows says the song is still playing, so a breakdown's quiet carries on with the game. (With no input at
      // all the engine isn't run, so quiet is told by the time since it last heard sound.)
      const since = t - (eng.lastSound ?? t), quiet = eng.silent || since > 1.2;
      const stopped = quiet && since > (eng.song?.().playing ? 20 : 4);
      if (look === 'game' && (target === null || stopped)) {
        if (!game) { loadGame().then((m) => { if (m) game ??= m.createGame(); }); return; }
        reset();
        game.idle(ctx, { W, H, col, t, eng, title, pocket, colorway, kind: quiet ? 'silence' : 'reading' });
        return;
      }
      if (target === null) {
        // Nothing to place right now (a new song, or no beat found yet):
        // let what's on screen dissolve instead of vanishing.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.6)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        reset();
        return;
      }
      const T = eng.tempo;
      if (vg === null || gap > 0.5) {
        // Starting, or back after the window was hidden: fill the screen from the patterns.
        vg = target;
        moved = T.renumber;
        blocks = [];
        dominoes.reset();
        game?.reset();
        queuedTo = Math.floor(vg) - AHEAD - 2;
      } else {
        // The engine renumbered its steps (new bar lines, a new tempo, the beat found on another
        // 16th): same moment, new numbers. Shift everything by exactly that, so nothing moves.
        const d = T.renumber - moved;
        if (d) {
          moved = T.renumber;
          vg += d;
          queuedTo += d;
          for (const b of blocks) b.g += d;
        }
        if (Math.abs(target - vg) > 3) {
          // A jump the engine didn't announce (shouldn't happen): follow it, keeping blocks in place.
          const s = target - vg;
          vg = target;
          queuedTo += s;
          for (const b of blocks) b.g += s;
        } else {
          // A smooth clock for drawing: glide at the tempo (by the real time since the last frame,
          // so a frame that came late doesn't leave the blocks behind) and ease into the engine's
          // corrections, instead of jumping each time it re-estimates where the beat is.
          vg += (4 / T.P) * gap;
          vg += (target - vg) * Math.min(1, dt * 3);
        }
      }
      const ease = Math.min(1, dt * 8);
      for (const id of VOICES) level[id] += ((playing(eng, id, t) ? 1 : 0) - level[id]) * ease;
      level.bass += ((eng.playing(eng.bassSeen, t) ? 1 : 0) - level.bass) * ease;
      level.chords += ((eng.playing(eng.chordSeen, t) ? 1 : 0) - level.chords) * ease;
      queue(eng, t, Math.floor(vg + AHEAD + 1), look); // made just past the right edge
      // Blocks leave once they've scrolled off the left edge.
      // (marked gone as they leave: the dominoes mustn't lean a new one on a block that no longer moves with the clock)
      if (blocks.length && blocks[0].g + blocks[0].len < vg - AHEAD - 1) blocks = blocks.filter((b) => b.g + b.len >= vg - AHEAD - 1 || ((b.gone = true), false));

      if (look === 'dominoes') {
        dominoes.draw(ctx, { blocks, vg, W, H, col, level, t, dt, ahead: AHEAD, rows: ROWS, sps: 4 / (T.P || 0.5) });
        return;
      }
      if (look === 'game') {
        if (!game) { loadGame().then((m) => { if (m) game ??= m.createGame(); }); ctx.clearRect(0, 0, W, H); return; }
        game.draw(ctx, { blocks, vg, W, H, col, level, t, eng, title, offset, pocket, colorway, code: gameCode });
        return;
      }
      ctx.clearRect(0, 0, W, H);
      const fg = col.fg, stepW = W / (2 * AHEAD), laneH = H / 7, mid = W / 2;
      for (const b of blocks) {
        const waiting = vg < b.g, crossing = !waiting && vg < b.g + b.len;
        if (crossing && level[b.lane] > 0.5) b.lit = true; // lights up as it crosses, if the part is playing
        let a = b.lit ? WAITING : GHOST, pad = 2;
        if (waiting) a = GHOST + (WAITING - GHOST) * level[b.lane];
        else if (crossing && b.lit) { a = LIT; pad = 0; }
        const row = ROW[b.lane] * laneH;
        const y = b.pc === undefined ? row + laneH * 0.3 : row + laneH * (0.85 - b.pc / 14);
        const h = b.pc === undefined ? laneH * 0.4 : laneH / 9;
        const x = mid + (b.g - vg) * stepW + 1 + pad, w = Math.max(2, b.len * stepW - 2 - 2 * pad);
        if (chips) {
          ctx.fillStyle = rgba(col.ink, Math.min(0.75, 0.2 + a * 0.6));
          ctx.fillRect(x - 2, y + pad - 2, w + 4, h - 2 * pad + 4);
        }
        ctx.fillStyle = rgba(fg, a);
        ctx.fillRect(x, y + pad, w, h - 2 * pad);
      }
      if (chips) {
        ctx.fillStyle = rgba(col.ink, 0.6);
        ctx.fillRect(mid - 3, 0, 6, H);
      }
      ctx.fillStyle = rgba(fg, 0.8);
      ctx.fillRect(mid - 1, 0, 2, H);
    },
  };
}

// ---------------------------------------------------------------- webcam, tinted to the theme

export function createWebcam(canvas) {
  const ctx = canvas.getContext('2d');
  const small = document.createElement('canvas');
  small.width = 256;
  small.height = 144;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  let video = null, stream = null, glitch = 0;
  let lum = new Uint8ClampedArray(0); // the latest frame as light levels (0-255), before tinting
  let grey = new Uint8Array(0); // the same, untouched, for finding faces
  let map = null; // how the small picture sits on the camera's: offsets and scale, and whether it's mirrored (camview.js)
  let mirror = true; // as a selfie view is; off, as the camera sees it (the help's setting)
  let shownAt = null; // where the picture was last drawn on screen (CSS pixels)

  // The camera effects (K), worked on the picture's light levels, so the ASCII camera and the
  // pop-ups get them too.
  // Slit-scan: each row a moment later than the one above, the top now and the bottom 0.8 seconds
  // ago, so anything moving bends and smears down the picture.
  // Datamosh: what a video codec does when it loses its key frames: the last picture dragged
  // along with the motion in each 8 x 8 block (the shift, within 3 pixels, that best lines the
  // last frame up with this one), the real picture seeping back in slowly, and a fresh picture on
  // every bar line.
  // Cut-out: just you, where the selfie segmenter finds a person (mask: 0-255 a pixel of the
  // camera's own frame); the rest see-through, so the visuals show round you.
  let fx = 'none';
  const SLIT = 24, hist = [];
  const MOVES = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]];
  let moshOut = null, moshNext = null, moshPrev = null, moshBar = null, see = null;
  let cutNow = null; // the cut-out's see-through this frame (0-255 a pixel of the picture), or null
  const at = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  function applyFx(sw, sh, { mask, bar } = {}) {
    const n = sw * sh;
    if (fx === 'slit-scan') {
      if (hist[0]?.length !== n) hist.length = 0;
      const frame = hist.length >= SLIT ? hist.pop() : new Uint8ClampedArray(n);
      frame.set(lum);
      hist.unshift(frame);
      for (let y = 0; y < sh; y++) lum.set(hist[Math.min(hist.length - 1, Math.floor((y / sh) * hist.length))].subarray(y * sw, (y + 1) * sw), y * sw);
      return null;
    }
    if (fx === 'datamosh') {
      if (moshOut?.length !== n || bar !== moshBar) {
        moshOut = lum.slice(); moshNext = new Uint8ClampedArray(n); moshPrev = lum.slice(); moshBar = bar;
        return null;
      }
      for (let by = 0; by < sh; by += 8) {
        for (let bx = 0; bx < sw; bx += 8) {
          let best = 0, bestErr = Infinity;
          for (let c = 0; c < MOVES.length; c++) {
            const [dx, dy] = MOVES[c];
            let err = 0;
            for (let y = by; y < by + 8 && y < sh; y += 2) {
              for (let x = bx; x < bx + 8 && x < sw; x += 2) err += Math.abs(lum[y * sw + x] - moshPrev[at(y - dy, 0, sh - 1) * sw + at(x - dx, 0, sw - 1)]);
            }
            if (err < bestErr) { bestErr = err; best = c; }
          }
          const [dx, dy] = MOVES[best];
          for (let y = by; y < by + 8 && y < sh; y++) {
            for (let x = bx; x < bx + 8 && x < sw; x++) moshNext[y * sw + x] = moshOut[at(y - dy, 0, sh - 1) * sw + at(x - dx, 0, sw - 1)];
          }
        }
      }
      for (let i = 0; i < n; i++) moshNext[i] += (lum[i] - moshNext[i]) * 0.03;
      moshPrev.set(lum);
      [moshOut, moshNext] = [moshNext, moshOut];
      lum.set(moshOut);
      return null;
    }
    if (fx === 'cut-out') {
      if (!mask || !map || !video?.videoWidth) return null; // till the first mask: all of it
      if (see?.length !== n) see = new Uint8ClampedArray(n);
      const { scale, oy } = map, vw = video.videoWidth, vh = video.videoHeight;
      for (let y = 0; y < sh; y++) {
        const row = Math.floor(at((y + 0.5 - oy) / scale / vh, 0, 0.999) * mask.h) * mask.w;
        for (let x = 0; x < sw; x++) {
          // (the mask is the camera's own frame: the picture's column is looked up in it, flipped if the picture is mirrored)
          const a = at((mask.data[row + Math.floor(at(maskU(map, vw, x), 0, 0.999) * mask.w)] - 77) * 2.5, 0, 255);
          see[y * sw + x] = a;
          lum[y * sw + x] = (lum[y * sw + x] * a) / 255;
        }
      }
      return see;
    }
    return null;
  }

  // Where your face and eyes are, for the close-up pop-ups and the ID card: the system's face
  // detector (Windows' own, or Vision on the Mac) looks a few times a second and gives the
  // face's box; the eyes are found inside it. Smoothed, so close-ups glide instead of jumping.
  // All positions are 0-1 across the picture as it's shown.
  let face = null, seen = 0, asking = false, lastAsk = 0;
  // The eyes, as a pair: two dark spots side by side in the upper half of the face, about as far
  // apart as eyes are, with the lighter bridge of the nose between them. Looking for the pair keeps
  // it off the nostrils (dark too, but close together and lower down); wanting each spot lighter to
  // its left and right (the whites of the eye) and below (the cheek) keeps it off the eyebrows,
  // which are dark all along; wanting it dark all round, iris-sized, keeps it off glasses frames.
  // Searched in the face box scaled to 64 x 64, softened, so it costs the same at any distance from
  // the camera. Allows for a tilted head. (Windows' face box runs from just above the eyebrows to
  // just under the mouth, so the eyes sit about a quarter of the way down it.)
  const N = 64, cells = new Float32Array(N * N), soft = new Float32Array(N * N), blob = new Float32Array(N * N), like = new Float32Array(N * N);
  const blur = (from, to) => {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let s = 0, n = 0;
        for (let b = Math.max(0, j - 1); b <= Math.min(N - 1, j + 1); b++) {
          for (let a = Math.max(0, i - 1); a <= Math.min(N - 1, i + 1); a++) { s += from[b * N + a]; n++; }
        }
        to[j * N + i] = s / n;
      }
    }
  };
  function findEyes(box, w, h, expect) {
    const x0 = box.x * w, y0 = box.y * h, cw = (box.w * w) / N, ch = (box.h * h) / N;
    for (let j = 0; j < N; j++) {
      const ya = Math.max(0, Math.floor(y0 + j * ch)), yb = Math.min(h, Math.max(ya + 1, Math.floor(y0 + (j + 1) * ch)));
      for (let i = 0; i < N; i++) {
        const xa = Math.max(0, Math.floor(x0 + i * cw)), xb = Math.min(w, Math.max(xa + 1, Math.floor(x0 + (i + 1) * cw)));
        let s = 0, n = 0;
        for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { s += grey[y * w + x]; n++; }
        cells[j * N + i] = n ? s / n : 255;
      }
    }
    blur(cells, soft);
    blur(soft, blob);
    const at = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? 255 : soft[j * N + i]);
    const side = Math.round(N * 0.09), tilt = Math.round(N * 0.07);
    // how much each spot looks like an eye: dark all round, and lighter at both sides and below
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const v = blob[j * N + i];
        like[j * N + i] = 0.5 * (255 - v) + 1.2 * (Math.min(at(i - side, j), at(i + side, j)) - v) + 0.3 * (at(i, j + side) - v);
      }
    }
    // near the height they were last seen at for sure (or where they usually are in the box)
    const row = (expect ? (expect[0][1] + expect[1][1]) / 2 : 0.25) * N - 0.5;
    let best = -Infinity, found = null;
    for (let j = Math.round(N * 0.1); j <= Math.round(N * 0.5); j++) {
      for (let c = Math.round(N * 0.4); c <= Math.round(N * 0.6); c++) {
        const bridge = blob[j * N + c];
        for (let d = Math.round(N * 0.16); d <= Math.round(N * 0.33); d++) {
          for (let t = -tilt; t <= tilt; t++) {
            const l = blob[(j - t) * N + c - d], r = blob[(j + t) * N + c + d], ll = like[(j - t) * N + c - d], lr = like[(j + t) * N + c + d];
            // both alike (not one eye and one eyebrow), and level unless the evidence says tilted
            const score = ll + lr - 0.5 * Math.abs(ll - lr) + 0.5 * (bridge - (l + r) / 2) - Math.abs(l - r) - 4 * Math.abs(t) - 3 * Math.abs(j - row);
            if (score > best) {
              best = score;
              found = { at: [[(c - d + 0.5) / N, (j - t + 0.5) / N], [(c + d + 0.5) / N, (j + t + 0.5) / N]], sure: Math.min(ll, lr) };
            }
          }
        }
      }
    }
    return found;
  }
  // Where the eyes sit in the face box, learned from the frames where they were clear (open, the
  // whites showing). Used when they aren't (squinting, blinking, a hand in the way): the box still
  // follows the head, and the eyes don't move within it.
  const SURE = 200;
  let rel = null;
  function track(w, h) {
    const now = performance.now();
    if (asking || now - lastAsk < 200 || !window.nc?.findFaces) return;
    asking = true;
    lastAsk = now;
    window.nc.findFaces(w, h, grey.slice()).then(({ faces }) => {
      asking = false;
      const f = faces?.[0];
      if (!f || !stream) return;
      const box = { x: f[0] / w, y: f[1] / h, w: f[2] / w, h: f[3] / h };
      const jump = !face || performance.now() - seen > 3000 || Math.abs(box.x - face.x) > 0.25 || Math.abs(box.y - face.y) > 0.25;
      if (jump) rel = null;
      const found = findEyes(box, w, h, rel);
      if (found.sure > SURE) rel = rel ? rel.map((e, i) => e.map((v, k) => v + (found.at[i][k] - v) * 0.3)) : found.at;
      const eyes = (found.sure > SURE || !rel ? found.at : rel).map(([ex, ey]) => [box.x + ex * box.w, box.y + ey * box.h]);
      const ease = (a, b) => (jump ? b : a + (b - a) * 0.4);
      face = {
        x: ease(face?.x, box.x), y: ease(face?.y, box.y), w: ease(face?.w, box.w), h: ease(face?.h, box.h),
        eyes: eyes.map((e, i) => [ease(face?.eyes[i][0], e[0]), ease(face?.eyes[i][1], e[1])]),
        sure: found.sure,
      };
      seen = performance.now();
    }, () => { asking = false; });
  }

  // the camera being opened (one at a time), and a count of stops, so one that comes while it opens
  // cancels it
  let starting = null, stops = 0;
  return {
    get on() { return !!stream; },
    // For the pop-up windows, which tint the picture in their own colours.
    // see: with the cut-out, how much of each pixel is you (0-255); where it's low, the room is
    // gone, and anything drawn from the picture should leave it empty, whatever the theme
    get frame() { return stream && lum.length ? { lum, w: small.width, h: small.height, see: cutNow } : null; },
    // The face, if one was found in the last second and a half: { x, y, w, h, eyes: [[x, y], [x, y]],
    // sure } (sure: how clearly the eyes showed; over 200 is clear).
    get face() { return stream && face && performance.now() - seen < 1500 ? face : null; },
    // Opens the camera. A second press while it's opening waits for the same one (two would each
    // hold the camera, and stopping would let go of only one: the light stayed on), it's kept only
    // once its picture plays, and a stop meanwhile lets go of it.
    start() {
      starting ||= (async () => {
        const at = stops;
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        const v = document.createElement('video');
        v.srcObject = s;
        v.muted = true;
        v.playsInline = true;
        try {
          await v.play();
        } catch (err) {
          s.getTracks().forEach((tr) => tr.stop());
          throw err;
        }
        if (stops !== at) { s.getTracks().forEach((tr) => tr.stop()); return; } // turned off meanwhile
        stream = s;
        video = v;
      })().finally(() => { starting = null; });
      return starting;
    },
    stop() {
      stops++;
      stream?.getTracks().forEach((tr) => tr.stop());
      stream = video = null;
      face = shownAt = cutNow = null;
      window.nc?.stopFaces?.();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    // Draws part of the picture (r: x, y, w, h, 0-1 of the picture as it's shown) into a w x h canvas
    // at the camera's full resolution, for the close-ups. False if there's no picture yet.
    drawCrop(r, out, w, h) {
      if (!stream || !video || video.readyState < 2 || !map) return false;
      const c = cropFrom(map, r);
      out.save();
      if (c.flip) {
        out.translate(w, 0);
        out.scale(-1, 1);
      }
      out.drawImage(video, c.x, c.y, c.w, c.h, 0, 0, w, h);
      out.restore();
      return true;
    },
    // For the hand and face tracking: the camera itself, where its picture is on screen, and where
    // a point of the camera's own frame (0-1, not mirrored) lands on screen: mirrored or not, as the
    // picture was drawn (see camview.js).
    get video() { return stream ? video : null; },
    get rect() { return shownAt; },
    place(nx, ny) {
      if (!map || !shownAt || !video) return [0, 0];
      return place(map, shownAt, video.videoWidth, video.videoHeight, nx, ny);
    },
    // The same point as 0-1 of the picture as it's shown, the way face and crop positions are given.
    toPicture(nx, ny) {
      if (!map || !video) return [0, 0];
      return toPicture(map, video.videoWidth, video.videoHeight, nx, ny);
    },
    // Mirrored, as a selfie view is (the default), or as the camera sees it (the help's "Mirror the
    // camera"). Everything drawn from the camera follows (see camview.js); the effects' last pictures
    // are let go, as they'd be flipped the wrong way.
    get mirrored() { return mirror; },
    setMirror(on) { mirror = on !== false; hist.length = 0; moshOut = see = null; },
    kick(s) { glitch = Math.min(1, 0.4 + s * 0.4); },
    // The effect (K): none, cut-out, slit-scan, datamosh.
    setFx(name) { fx = name; hist.length = 0; moshOut = see = null; },
    // rect: where the camera goes, in CSS pixels; null for the whole window. opts: { mask (where
    // a person is, from the tracker), bar (the bar number, for the datamosh's fresh pictures) }.
    // Webcams deliver about 30 frames a second, so drawing more often would only repeat frames.
    draw(col, rect, opts) {
      if (!stream || !video || video.readyState < 2) return;
      const now = performance.now();
      if (now - (this.lastDraw || 0) < 1000 / 31) return;
      this.lastDraw = now;
      const [W, H] = fit(canvas);
      const r = rect || { x: 0, y: 0, w: W, h: H };
      shownAt = r;
      const sw = small.width, sh = Math.max(1, Math.round((sw * r.h) / r.w));
      if (small.height !== sh) small.height = sh;
      // mirror (unless it's off), and crop the video to fill the target shape
      const vw = video.videoWidth, vh = video.videoHeight;
      map = pictureMap(sw, sh, vw, vh, mirror);
      const { scale } = map;
      sctx.save();
      if (map.mirror) {
        sctx.translate(sw, 0);
        sctx.scale(-1, 1);
      }
      sctx.drawImage(video, map.ox, map.oy, vw * scale, vh * scale);
      sctx.restore();
      // light levels: as they are (for finding faces), and evened out (for the picture)
      const img = sctx.getImageData(0, 0, sw, sh), d = img.data, [br, bg, bb] = col.bg, [fr, fg, fb] = col.fg;
      if (lum.length !== sw * sh) { lum = new Uint8ClampedArray(sw * sh); grey = new Uint8Array(sw * sh); }
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
        grey[p] = l * 255;
        lum[p] = clamp((l - 0.12) * 1.5, 0, 1) * 255;
      }
      const alpha = applyFx(sw, sh, opts);
      cutNow = alpha;
      // duotone: dark parts take the background colour, bright parts the text colour
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const v = lum[p] / 255;
        d[i] = br + (fr - br) * v;
        d[i + 1] = bg + (fg - bg) * v;
        d[i + 2] = bb + (fb - bb) * v;
        d[i + 3] = alpha ? alpha[p] : 255;
      }
      sctx.putImageData(img, 0, 0);
      track(sw, sh);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(small, r.x, r.y, r.w, r.h);
      // on a kick, a few slices of the picture jump sideways
      if (glitch > 0.05) {
        for (let k = 0; k < 6; k++) {
          const y = r.y + Math.random() * r.h, h = Math.random() * r.h * 0.07 + 2;
          ctx.drawImage(canvas, r.x, y, r.w, h, r.x + (Math.random() - 0.5) * 60 * glitch, y, r.w, h);
        }
        glitch *= 0.82;
      }
    },
  };
}
