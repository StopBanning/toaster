// Voxels: the camera rebuilt as a room of cubes (a camera effect, K), after ntrxcam's voxel camera.
// The picture is cut into a grid of cubes, each the colour of its patch of the picture; where the
// cut-out finds you, the cubes stand out from the wall, so you're a stack of blocks in front of a
// tiled room, with a tiled floor running out from the wall's foot (the wall carries on past the
// picture's edges, so the view can swing without showing them). Seen from a little above,
// swinging slowly side to side, lit from the top left: tops lighter, sides darker, gaps between.
// Each cube eases to its new colour and height, so you move as blocks rather than flicker. The kick
// swells the cubes, yours most (on the beat grid, as the blocks hit; a spring damped just enough
// not to wobble). Drawn with WebGL on its own layer, in the camera's place on screen.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const COLS = 64, PADX = 14; // (the picture's columns; the wall's past it each side)

const VS = `#version 300 es
layout(location = 0) in vec3 pos;
layout(location = 1) in vec3 nrm;
layout(location = 2) in vec4 cell;   // x, y on the wall (z on the floor), height in cells, how much it's you
layout(location = 3) in vec3 color;
uniform mat4 viewProj;
uniform float size, base;
uniform int floorMode;
out vec3 vColor; out vec3 vNrm; out float vM;
void main() {
  float h = max(cell.z, 0.06), gap = mix(0.86, 0.95, cell.w);
  vec3 p = floorMode == 1
    ? vec3(pos.x * size * gap + cell.x, base + (pos.y - 0.5) * h * size, pos.z * size * gap + cell.y)
    : vec3(pos.xy * size * gap + cell.xy, (pos.z + 0.5) * h * size);
  vColor = color; vNrm = nrm; vM = cell.w;
  gl_Position = viewProj * vec4(p, 1.0);
}`;
// lit from the top left, tops lighter; the kick lifts the light a little, on you most (seen from
// the front, the cubes swelling toward you hardly show)
const FS = `#version 300 es
precision highp float;
in vec3 vColor; in vec3 vNrm; in float vM;
uniform vec3 light;
uniform float pulse;
out vec4 frag;
void main() {
  vec3 n = normalize(vNrm);
  float d = max(dot(n, light), 0.0);
  vec3 c = vColor * (0.38 + 0.62 * d) + (n.y > 0.5 ? 0.10 : 0.0) * vColor;
  frag = vec4(pow(c * (1.0 + pulse * (0.08 + 0.3 * vM)), vec3(0.95)), 1.0);
}`;

// small matrix helpers (column-major)
const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lookAt = (e, t, u) => { const z = norm(sub(e, t)), x = norm(cross(u, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };

import { compileProgram } from './program.js';
import { frameU } from './camview.js';

export function createVoxCam(canvas) {
  let gl = null, prog = null, vb = null, wall = null, floor = null, rows = 0, padY = 0, floorRows = 0, broken = false, U = null;
  let job = null, ready = false;
  let pulse = 0, pulseV = 0, kickV = 0, kickAt = -9, lastStep = null, heard = null, last = 0, clock = 0;
  // the picture, a patch per cube (pic: the camera's place, small: the whole wall, the picture
  // stretched over it and then in its place), read at most 31 times a second (as the camera's own
  // drawing: a webcam gives about 30); fit: where the video lies in the picture, for the cut-out
  const pic = document.createElement('canvas'), small = document.createElement('canvas');
  const pcx = pic.getContext('2d', { willReadFrequently: true }), sx = small.getContext('2d', { willReadFrequently: true });
  let px = null, sampledAt = 0, fit = null;

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); prog = null; wall = floor = null; });
  canvas.addEventListener('webglcontextrestored', () => { prog = null; wall = floor = null; });

  function build() {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) { broken = true; return; }
    ready = false;
    job = compileProgram(gl, VS, FS);
    prog = job.program;
    const loc = {};
    U = (n) => loc[n] ??= gl.getUniformLocation(prog, n);
    // the cube's faces that can be seen (not its back, against the wall)
    const faces = [[[0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 1, 0], [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[0, -1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[1, 0, 0], [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [[-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]];
    const verts = [];
    for (const [n, a, b, c, d] of faces) for (const v of [a, b, c, a, c, d]) verts.push(v[0] / 2, v[1] / 2, v[2] / 2, ...n);
    vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  }
  function instances(n) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    const cells = new Float32Array(n * 4), colors = new Float32Array(n * 3), cb = gl.createBuffer(), kb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cb); gl.bufferData(gl.ARRAY_BUFFER, cells.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(2, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, kb); gl.bufferData(gl.ARRAY_BUFFER, colors.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
    return { vao, cells, colors, cb, kb, n, upload() { gl.bindBuffer(gl.ARRAY_BUFFER, cb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, cells); gl.bindBuffer(gl.ARRAY_BUFFER, kb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors); } };
  }
  function drop() {
    if (gl && !gl.isContextLost()) for (const s of [wall, floor]) if (s) { gl.deleteVertexArray(s.vao); gl.deleteBuffer(s.cb); gl.deleteBuffer(s.kb); }
    wall = floor = null;
    rows = 0;
  }
  // the grid for a picture this shape (rows from the camera's place on screen): the picture spans
  // x -A..A, y -1..1 (up); the wall carries on round it (above it by 0.3 of the picture's height);
  // the floor lies at y -1, running out toward you as far as the picture is tall
  function grid(r) {
    drop();
    rows = r;
    padY = Math.ceil(0.15 * rows);
    floorRows = Math.ceil(rows / 2);
    const WC = COLS + 2 * PADX, WR = rows + padY, A = COLS / rows, SIZE = 2 / rows;
    pic.width = COLS; pic.height = rows;
    small.width = WC; small.height = WR;
    px = null;
    wall = instances(WC * WR);
    floor = instances(WC * floorRows);
    for (let y = 0; y < WR; y++) for (let x = 0; x < WC; x++) {
      const i = y * WC + x;
      wall.cells[i * 4] = -A + (x - PADX + 0.5) * SIZE;
      wall.cells[i * 4 + 1] = 1 + padY * SIZE - (y + 0.5) * SIZE;
      wall.cells[i * 4 + 2] = 0.3;
    }
    for (let y = 0; y < floorRows; y++) for (let x = 0; x < WC; x++) {
      const i = y * WC + x;
      floor.cells[i * 4] = -A + (x - PADX + 0.5) * SIZE;
      floor.cells[i * 4 + 1] = (y + 0.5) * SIZE;
      floor.cells[i * 4 + 2] = 0.22;
    }
  }
  function kick(t, bpm) {
    if (t - kickAt > 22.5 / bpm) kickV = 1;
    kickAt = t;
  }

  return {
    get broken() { return broken; },
    get waiting() { return !broken && (!prog || !ready); },
    clear() {
      // (the canvas shrunk, so its antialiased picture, the size of the window, is freed while it's off)
      canvas.width = canvas.height = 1;
      drop();
      lastStep = heard = null;
    },
    // as the dots (dotcam.js): video, the cut-out's mask (or null), the camera's place on screen
    // (CSS pixels, or null for the whole window), mirror, how far ahead to draw
    draw(t, { video, mask, rect, eng, mirror = true, offset = 0 }) {
      if (broken || !video || video.readyState < 2 || gl?.isContextLost()) return;
      if (!prog) {
        try { build(); } catch (err) { broken = true; console.error('voxels:', err); return; }
        if (broken) return;
      }
      if (!ready) {
        try { if (!job.ready()) return; ready = true; }
        catch (err) { broken = true; console.error('voxels:', err); return; }
      }
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      clock += dt;
      // (at most 1920 pixels on the long side, as recordings are: the cubes are big, and the
      // antialiased picture costs memory and time with its size)
      const dpr = Math.min(2, devicePixelRatio || 1, 1920 / Math.max(innerWidth, innerHeight)), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      const r = rect || { x: 0, y: 0, w: innerWidth, h: innerHeight };
      const want = clamp(Math.round((COLS * r.h) / r.w), 12, 140);
      if (!wall || rows !== want) grid(want);
      const WC = COLS + 2 * PADX, WR = rows + padY, SIZE = 2 / rows;

      // the kick: due by now on the beat grid, or (no beat yet) as it's heard
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 110, step = eng.stepAt(t + offset);
      if (step !== null) {
        if (lastStep === null || step < lastStep || step - lastStep > 8) lastStep = step;
        for (let g = Math.floor(lastStep) + 1; g <= step; g++) if (eng.v.bd.shown?.[((g % 16) + 16) % 16] && eng.present('bd', t)) kick(t, bpm);
        lastStep = step;
      } else {
        lastStep = null;
        const h = eng.v.bd.lastHit;
        if (heard !== null && h.t > heard) kick(t, bpm);
        heard = h.t;
      }
      kickV *= Math.exp(-dt / 0.16);
      for (let left = dt; left > 1e-6; left -= 1 / 240) {
        const h = Math.min(left, 1 / 240), a = 256 * (kickV - pulse) - 32 * pulseV;
        pulseV += a * h; pulse += pulseV * h;
      }

      // the picture, mirrored (unless the camera isn't: mirror), covering the camera's place
      const now = performance.now();
      if (!px || now - sampledAt >= 1000 / 31) {
        sampledAt = now;
        const vw = video.videoWidth, vh = video.videoHeight, sc = Math.max(COLS / vw, rows / vh);
        fit = { dw: vw * sc, dh: vh * sc, ox: (COLS - vw * sc) / 2, oy: (rows - vh * sc) / 2 };
        pcx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? COLS : 0, 0);
        pcx.drawImage(video, fit.ox, fit.oy, fit.dw, fit.dh);
        sx.drawImage(pic, 0, 0, WC, WR);
        sx.drawImage(pic, PADX, padY);
        px = sx.getImageData(0, 0, WC, WR).data;
      }
      const { dw, dh, ox, oy } = fit;
      // (the mask's frame is the camera's own, not mirrored: where a cube's patch falls in it, flipped if the picture is)
      const follow = 1 - Math.pow(0.4, dt * 60); // (how fast a cube takes up its new colour and height)
      for (let y = 0; y < WR; y++) for (let x = 0; x < WC; x++) {
        const i = y * WC + x, R = px[i * 4] / 255, G = px[i * 4 + 1] / 255, B = px[i * 4 + 2] / 255;
        const lum = 0.299 * R + 0.587 * G + 0.114 * B, pc = x - PADX, pr = y - padY;
        let m = 0;
        if (mask && pc >= 0 && pc < COLS && pr >= 0 && pr < rows) {
          const u = frameU(mirror, (pc + 0.5 - ox) / dw), v = (pr + 0.5 - oy) / dh;
          if (u >= 0 && u < 1 && v >= 0 && v < 1) m = mask.data[Math.min(mask.h - 1, Math.floor(v * mask.h)) * mask.w + Math.min(mask.w - 1, Math.floor(u * mask.w))] / 255;
        }
        // the room a low relief of tiles; you stand out, a little more where you're lighter
        let h = 0.25 + 0.35 * lum + m * (2.8 + 1.2 * lum);
        h *= 1 + pulse * (0.12 + 0.45 * m);
        const cl = wall.cells, co = wall.colors;
        cl[i * 4 + 2] += (h - cl[i * 4 + 2]) * follow;
        cl[i * 4 + 3] += (m - cl[i * 4 + 3]) * follow;
        co[i * 3] += (R - co[i * 3]) * follow;
        co[i * 3 + 1] += (G - co[i * 3 + 1]) * follow;
        co[i * 3 + 2] += (B - co[i * 3 + 2]) * follow;
      }
      // the floor: the colour of the wall's foot, a little darker each row out, every other tile a
      // touch lighter, so it reads as tiles; it swells a little with the kick too
      for (let y = 0; y < floorRows; y++) for (let x = 0; x < WC; x++) {
        const i = y * WC + x, j = (WR - 1) * WC + x, k = (0.78 - 0.3 * (y / floorRows)) * ((y + x) % 2 ? 1 : 1.08);
        floor.colors[i * 3] = wall.colors[j * 3] * k;
        floor.colors[i * 3 + 1] = wall.colors[j * 3 + 1] * k;
        floor.colors[i * 3 + 2] = wall.colors[j * 3 + 2] * k;
        floor.cells[i * 4 + 2] = 0.22 * (1 + 0.5 * pulse);
      }
      wall.upload(); floor.upload();

      // a view from a little above, swinging slowly side to side, into the camera's place: back far
      // enough that the whole picture shows (your head too), with a strip of the floor under it
      const ax = Math.round(r.x * dpr), aw = Math.round(r.w * dpr), ah = Math.round(r.h * dpr), ay = H - Math.round((r.y + r.h) * dpr);
      const yaw = 0.2 * Math.sin((2 * Math.PI * clock) / 16), pitch = 0.3 + 0.04 * Math.sin((2 * Math.PI * clock) / 11), D = 3.6;
      const eye = [D * Math.sin(yaw) * Math.cos(pitch), D * Math.sin(pitch), D * Math.cos(yaw) * Math.cos(pitch)];
      const vp = mul(persp((34 * Math.PI) / 180, aw / ah, 0.05, 50), lookAt(eye, [0, 0.1, 0.3], [0, 1, 0]));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(ax, ay, aw, ah);
      gl.viewport(ax, ay, aw, ah);
      gl.clearColor(0.043, 0.051, 0.063, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U('viewProj'), false, new Float32Array(vp));
      gl.uniform1f(U('size'), SIZE);
      gl.uniform1f(U('base'), -1);
      gl.uniform3fv(U('light'), norm([-0.45, 0.75, 0.55]));
      gl.uniform1f(U('pulse'), pulse);
      gl.uniform1i(U('floorMode'), 0);
      gl.bindVertexArray(wall.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, wall.n);
      gl.uniform1i(U('floorMode'), 1);
      gl.bindVertexArray(floor.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, floor.n);
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.SCISSOR_TEST);
    },
  };
}
