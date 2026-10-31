// Dots: the camera as a neon dot matrix (a camera effect, K), after decayingsun's "dream machine".
// The picture is sampled on a grid and each cell drawn as a round dot, as big as the cell is
// bright, coloured violet in the shadows, magenta in the middle and pink nearly white at the top,
// its red a little to one side and its green and blue to the other (a pink edge one side, a teal
// one the other, as a lens's fringe). The cut-out keeps you: the room fades to a faint grid. A glow
// round the dots and a short trail behind them. Black is see-through, so the background shows round
// you. The kick swells the dots (on the beat grid, as the blocks hit; a spring damped just enough
// not to wobble) and each new chord slides the palette a little, toward violet or coral (every 4
// bars without one). Drawn with WebGL on its own layer, over the camera's place on screen.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const VS = `#version 300 es
in vec2 a; out vec2 uv; void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
// the dots: area is the camera's rectangle in the canvas (pixels from the bottom left), vid the
// video's size; the video covers the rectangle, mirrored (mirror 1) or not (0), as the camera is drawn
const DOTS = `#version 300 es
precision highp float;
uniform sampler2D cam, mask;
uniform vec4 area;
uniform vec2 vid;
uniform float cell, pulse, hue, hasMask, mirror;
in vec2 uv; out vec4 o;
vec3 neon(float x) {
  vec3 a = vec3(0.22, 0.04, 0.62), b = vec3(0.98, 0.18, 0.78), c = vec3(1.00, 0.82, 0.98);
  return x < 0.6 ? mix(a, b, x / 0.6) : mix(b, c, (x - 0.6) / 0.4);
}
vec3 turn(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float s = sin(a), co = cos(a);
  return c * co + cross(k, c) * s + k * dot(k, c) * (1.0 - co);
}
void main() {
  vec2 ci = floor((gl_FragCoord.xy - area.xy) / cell), centre = area.xy + (ci + 0.5) * cell;
  vec2 rel = (centre - area.xy) / area.zw;
  if (rel.x < 0.0 || rel.y < 0.0 || rel.x > 1.0 || rel.y > 1.0) { o = vec4(0.0); return; }
  float sc = max(area.z / vid.x, area.w / vid.y);
  vec2 v = ((rel - 0.5) * area.zw) / (vid * sc) + 0.5;
  vec2 cu = vec2(mirror > 0.5 ? 1.0 - v.x : v.x, 1.0 - v.y);
  // (stretched: a webcam's picture sits in the middle greys; the dots run dark to blazing)
  float L = clamp((dot(texture(cam, cu).rgb, vec3(0.299, 0.587, 0.114)) - 0.12) * 1.7, 0.0, 1.0);
  float m = hasMask > 0.5 ? texture(mask, cu).r : 1.0;
  float k = (0.25 + 0.75 * L) * mix(0.025, 1.0, smoothstep(0.25, 0.75, m));
  vec2 p = (gl_FragCoord.xy - centre) / cell;
  float r = mix(0.14, 0.5, L) * (1.0 + 0.24 * pulse);
  float cR = 1.0 - smoothstep(r - 0.07, r + 0.02, length(p - vec2(0.1, 0.0)));
  float cGB = 1.0 - smoothstep(r - 0.07, r + 0.02, length(p + vec2(0.1, 0.0)));
  vec3 col = turn(neon(L), hue) * k * 1.35;
  float teal = max(0.0, cGB - cR) * k;
  o = vec4(col.r * cR, col.g * cGB + teal * 0.85, col.b * cGB + teal * 0.35, 1.0);
}`;
const BLUR = `#version 300 es
precision highp float;
uniform sampler2D src; uniform vec2 dir;
in vec2 uv; out vec4 o;
void main() {
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 c = texture(src, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) { c += texture(src, uv + dir * float(i)).rgb * w[i]; c += texture(src, uv - dir * float(i)).rgb * w[i]; }
  o = vec4(c, 1.0);
}`;
// the dots and their glow over the last picture, faded (the trail)
const COMP = `#version 300 es
precision highp float;
uniform sampler2D dots, glow, prev;
uniform float glowK, trail;
in vec2 uv; out vec4 o;
void main() {
  vec3 c = texture(dots, uv).rgb + texture(glow, uv).rgb * glowK;
  o = vec4(min(max(c, texture(prev, uv).rgb * trail), vec3(1.0)), 1.0);
}`;
// onto the page: black see-through (its alpha its brightest channel, the colour premultiplied)
const OUT = `#version 300 es
precision highp float;
uniform sampler2D src; in vec2 uv; out vec4 o;
void main() { vec3 c = texture(src, uv).rgb; o = vec4(c, max(c.r, max(c.g, c.b))); }`;

import { compileProgram } from './program.js';

export function createDotCam(canvas) {
  let gl = null, P = null, quad = null, camTex = null, maskTex = null, T = null, broken = false;
  let jobs = [], ready = false;
  let pulse = 0, pulseV = 0, kickV = 0, kickAt = -9, lastStep = null, heard = null, last = 0;
  let hue = 0, hueTo = 0, slides = 0, chord = null, slidBar = null, drawn = false, uploadedAt = 0;

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); P = null; T = null; });
  canvas.addEventListener('webglcontextrestored', () => { P = null; T = null; });

  function build() {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) { broken = true; return; }
    jobs = []; ready = false;
    const program = (fs) => { const job = compileProgram(gl, VS, fs); jobs.push(job); return job.program; };
    P = { dots: program(DOTS), blur: program(BLUR), comp: program(COMP), out: program(OUT) };
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const plain = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      return t;
    };
    camTex = plain();
    maskTex = plain();
    uploadedAt = 0;
  }
  // the render targets at the canvas's size: the dots, two half-size ones for the glow, and two for
  // the picture with its trail (this one and the last)
  function targets(w, h) {
    const target = (tw, th) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { t, f, w: tw, h: th };
    };
    dropTargets();
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    T = { dots: target(w, h), h1: target(hw, hh), h2: target(hw, hh), a: target(w, h), b: target(w, h) };
  }
  function dropTargets() {
    if (T && gl && !gl.isContextLost()) for (const k in T) { gl.deleteTexture(T[k].t); gl.deleteFramebuffer(T[k].f); }
    T = null;
  }
  const use = (p) => { gl.useProgram(p); const l = gl.getAttribLocation(p, 'a'); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); };
  const U = (p, n) => gl.getUniformLocation(p, n);
  const bindTex = (unit, t, p, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(U(p, name), unit); };

  // the music: a kick (counted once in a 16th and a half, as the orb does: a run of them read on
  // neighbouring 16ths is one), and the palette's slide
  function kick(t, bpm) {
    if (t - kickAt > 22.5 / bpm) kickV = 1;
    kickAt = t;
  }
  function slide(bar) {
    hueTo = 0.5 * Math.sin(++slides * 0.7);
    slidBar = bar;
  }

  return {
    get broken() { return broken; },
    get waiting() { return !broken && (!P || !ready); },
    clear() {
      if (gl && P && !gl.isContextLost()) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      // (its full-window targets freed while it's off: five of them at the window's size)
      dropTargets();
      drawn = false; lastStep = heard = null;
    },
    // video: the camera; mask: the cut-out's (0-255 a pixel of the camera's own frame, not
    // mirrored) or null; rect: the camera's place on screen (CSS pixels) or null for the whole
    // window; mirror: as the camera layer is drawn (cam.mirrored); offset: how far ahead to draw (as
    // the blocks), so the swell lands with the kick
    draw(t, { video, mask, rect, eng, mirror = true, offset = 0 }) {
      if (broken || !video || video.readyState < 2 || gl?.isContextLost()) return;
      if (!P) {
        try { build(); } catch (err) { broken = true; console.error('dots:', err); return; }
        if (broken) return;
      }
      if (!ready) {
        try { if (!jobs.every((job) => job.ready())) return; ready = true; }
        catch (err) { broken = true; console.error('dots:', err); return; }
      }
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
      if (canvas.width !== W || canvas.height !== H || !T) { canvas.width = W; canvas.height = H; targets(W, H); }

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
      // the palette: on each new chord (by its name: the engine hands over a new chord every bar, the
      // same one too), or every 4 bars without one
      if (eng.lastChord && eng.lastChord.name !== chord?.name) { chord = eng.lastChord; slide(eng.bar); }
      else if (eng.bar !== null && (slidBar === null || eng.bar - slidBar >= 4)) slide(eng.bar);
      hue += (hueTo - hue) * (1 - Math.exp(-dt / 0.6));

      // the camera at most 31 times a second (as the camera's own drawing: a webcam gives about 30)
      const now = performance.now();
      if (!uploadedAt || now - uploadedAt >= 1000 / 31) {
        uploadedAt = now;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.bindTexture(gl.TEXTURE_2D, camTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }
      if (mask) {
        gl.bindTexture(gl.TEXTURE_2D, maskTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mask.w, mask.h, 0, gl.RED, gl.UNSIGNED_BYTE, mask.data);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      }
      // the camera's rectangle in the canvas, from its bottom left; the dots a 70th of its smaller side
      const r = rect || { x: 0, y: 0, w: innerWidth, h: innerHeight };
      const ax = r.x * dpr, aw = r.w * dpr, ah = r.h * dpr, ay = H - (r.y + r.h) * dpr;
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.dots.f);
      gl.viewport(0, 0, W, H);
      use(P.dots);
      bindTex(0, camTex, P.dots, 'cam');
      bindTex(1, maskTex, P.dots, 'mask');
      gl.uniform4f(U(P.dots, 'area'), ax, ay, aw, ah);
      gl.uniform2f(U(P.dots, 'vid'), video.videoWidth, video.videoHeight);
      gl.uniform1f(U(P.dots, 'cell'), Math.max(5, Math.min(aw, ah) / 70));
      gl.uniform1f(U(P.dots, 'pulse'), pulse);
      gl.uniform1f(U(P.dots, 'hue'), hue);
      gl.uniform1f(U(P.dots, 'hasMask'), mask ? 1 : 0);
      gl.uniform1f(U(P.dots, 'mirror'), mirror ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // the glow: at half size, blurred across then down, twice (the second time wider)
      for (const [src, dst, dx, dy] of [[T.dots, T.h1, 1.5, 0], [T.h1, T.h2, 0, 1.5], [T.h2, T.h1, 3, 0], [T.h1, T.h2, 0, 3]]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f);
        gl.viewport(0, 0, dst.w, dst.h);
        use(P.blur);
        bindTex(0, src.t, P.blur, 'src');
        gl.uniform2f(U(P.blur, 'dir'), dx / dst.w, dy / dst.h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.b.f);
      gl.viewport(0, 0, W, H);
      use(P.comp);
      bindTex(0, T.dots.t, P.comp, 'dots');
      bindTex(1, T.h2.t, P.comp, 'glow');
      bindTex(2, T.a.t, P.comp, 'prev');
      gl.uniform1f(U(P.comp, 'glowK'), 1.7 * (1 + 0.5 * pulse));
      gl.uniform1f(U(P.comp, 'trail'), 0.55);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      [T.a, T.b] = [T.b, T.a];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      use(P.out);
      bindTex(0, T.a.t, P.out, 'src');
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      drawn = true;
    },
  };
}
