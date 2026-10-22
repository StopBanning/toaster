// Chrome: a pool of liquid chrome seen from above, an oil-slick film on it, the song playing it,
// with a collage cut into it every couple of bars (collage.js; A turns it off and on). The kick
// drops a bead into it where the beat falls in the bar (left to right, so the rings spell out the
// kick pattern), the clap strikes lightning in the sky it mirrors, the bass swells it, each chord
// gives the film its own colours, and a drop throws a big one in the middle. After two Y2K
// chrome-and-glitch collages (liquid chrome, holographic film, lightning, mosaics, code).
//
// The ripples: Hugo Elias' 2D water, the height now and a step ago in one picture, bounced between
// two (each step: the four neighbours' heights over two, less the height a step ago, damped). The
// chrome: the surface's normal from its slopes, the view straight down reflected off it into a
// photographer's studio for chrome (black, a long softbox overhead a little off centre so flat
// chrome sits on its edge and the smallest swell turns black to white and back, a strip light, a
// ring of softboxes, the white cyclorama at the horizon, a dark floor). The film: thin-film
// interference, a soap film's: two reflections half a wave apart adding or cancelling by
// wavelength as the film's thickness and the angle change (constructive where
// 2 n d cos(t) = (m - 1/2) wavelengths), shown where the surface tilts. Its colour for each
// optical path difference is worked out once over the visible spectrum with the CIE 1931 colour
// matching functions (Wyman, Sloan and Shirley's analytic fit, JCGT 2013), into a strip the shader
// looks up. No borrowed shader code: these are the published formulas.
import { NOTES } from './engine.js';
import { COLLAGE, layout, drawPanel } from './collage.js';

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const STEP = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 o;
uniform sampler2D water;   // r: height now, g: a step ago
uniform vec2 texel;
uniform float damp, aspect;
uniform vec4 drops[12];    // x, y (0-1), radius (of the height), depth
uniform int nDrops;
void main() {
  vec2 h = texture(water, uv).rg;
  float n = texture(water, uv + vec2(texel.x, 0.0)).r + texture(water, uv - vec2(texel.x, 0.0)).r
          + texture(water, uv + vec2(0.0, texel.y)).r + texture(water, uv - vec2(0.0, texel.y)).r;
  float next = (n * 0.5 - h.g) * damp;
  for (int i = 0; i < 12; i++) {
    if (i >= nDrops) break;
    vec2 d = (uv - drops[i].xy) * vec2(aspect, 1.0);
    next -= drops[i].w * exp(-dot(d, d) / (drops[i].z * drops[i].z));
  }
  o = vec4(next, h.r, 0.0, 1.0);
}`;

// The surface, at a third of the window's size: a slow liquid swell (noise warped by noise,
// flowing), the ripples on it; its normal (r, g), height (b) and the film's thickness (a).
const SURF = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 o;
uniform sampler2D water;
uniform vec2 texel;
uniform float aspect, time, swell, ripple, thick;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.32; } return s; }
float base(vec2 p) {
  vec2 q = p * vec2(aspect, 1.0) * 1.25;
  vec2 w = vec2(fbm(q + vec2(0.0, time * 0.05)), fbm(q + vec2(5.2, -time * 0.04)));
  return fbm(q + 0.9 * w + vec2(time * 0.025, 0.0));
}
float H(vec2 p) { return swell * base(p) + ripple * texture(water, p).r; }
void main() {
  vec2 e = texel;
  float h = H(uv);
  float hx = (H(uv + vec2(e.x, 0.0)) - H(uv - vec2(e.x, 0.0))) / (2.0 * e.x * aspect);
  float hy = (H(uv + vec2(0.0, e.y)) - H(uv - vec2(0.0, e.y))) / (2.0 * e.y);
  vec3 n = normalize(vec3(-hx, -hy, 1.0));
  vec2 q = uv * vec2(aspect, 1.0);
  float d = thick + 160.0 * (noise(q * 2.2 + vec2(time * 0.04, -time * 0.03)) - 0.5) + 30.0 * ripple / 0.01 * texture(water, uv).r;
  o = vec4(n.xy, h, d / 2400.0);
}`;

const SHOW = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D surf, film, bolt;
uniform float iris, flash, boltOn;
// the studio the chrome reflects, by the reflected direction r (z up): silver overhead, a black
// band, softboxes, the white cyclorama at the horizon, a dark floor; and the clap's lightning in
// the sky, drawn on a disc of directions (overhead in the middle)
vec3 studio(vec3 r) {
  float e = r.z, az = atan(r.y, r.x);
  vec2 d = r.xy;
  float v = 0.02 + 0.05 * smoothstep(0.5, 0.0, length(d));              // black, a little glow overhead
  vec2 b1 = abs(d - vec2(0.14, 0.06)) - vec2(0.2, 0.06);                  // overhead softbox: soft edges,
  v += 1.3 * smoothstep(0.09, -0.03, max(b1.x, b1.y)) * (0.55 + 0.45 * smoothstep(0.2, 0.0, abs(d.x - 0.14))) * step(0.0, e); // brightest in the middle
  vec2 b2 = abs(d - vec2(-0.42, -0.12)) - vec2(0.04, 0.3);                // the strip light
  v += 0.9 * smoothstep(0.08, -0.02, max(b2.x, b2.y)) * step(0.0, e);
  for (int k = 0; k < 3; k++) {                                          // softboxes, long, soft-edged
    float a = az - (float(k) * 2.094 + 0.6);
    a = abs(atan(sin(a), cos(a)));
    v += 1.5 * smoothstep(0.5, 0.3, a) * smoothstep(0.16, 0.02, abs(e - 0.5 - 0.1 * float(k)));
  }
  v += 2.0 * smoothstep(0.16, 0.0, abs(e - 0.1));                        // the cyclorama
  vec3 c = vec3(v) * vec3(0.96, 0.98, 1.02);
  c = mix(c, vec3(0.05), smoothstep(0.0, -0.1, e));                     // the floor
  if (e > 0.0) c += texture(bolt, r.xy * 0.5 + 0.5).rgb * boltOn * 1.8;
  return c + flash * vec3(0.3, 0.42, 0.85) * smoothstep(0.0, 0.7, e);
}
void main() {
  vec4 s = texture(surf, uv);
  vec3 n = vec3(s.xy, sqrt(max(0.0, 1.0 - dot(s.xy, s.xy))));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 c = studio(r);
  // the film, where the surface tilts (flat chrome stays clean): its colour by the optical path
  // difference 2 n d cos(t), n = 1.33
  float ci = n.z, st = sqrt(max(0.0, 1.0 - ci * ci)) / 1.33, ct = sqrt(1.0 - st * st);
  vec3 f = texture(film, vec2(clamp(2.0 * 1.33 * max(s.a * 2400.0, 0.0) * ct / 2400.0, 0.0, 1.0), 0.5)).rgb * 2.0;
  float amt = iris * smoothstep(0.997, 0.82, ci);
  c *= mix(vec3(1.0), f, amt);
  c = pow(c, vec3(1.18)) * 1.08;
  c = c / (1.0 + 0.3 * c);
  color = vec4(pow(max(c, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;

// The film's colour for optical path differences 0 to 2400 nm (a strip of 512): a soap film's
// reflectance sin^2(pi OPD / wavelength) over the visible spectrum, weighed by the CIE 1931
// observer (Wyman, Sloan and Shirley's multi-lobe fit), to XYZ, to linear sRGB, scaled so a flat
// 50% reflectance comes out white (1, 1, 1).
function filmStrip() {
  const g = (x, m, a, b) => { const t = (x - m) * (x < m ? a : b); return Math.exp(-0.5 * t * t); };
  const cmf = (w) => [
    0.362 * g(w, 442.0, 0.0624, 0.0374) + 1.056 * g(w, 599.8, 0.0264, 0.0323) - 0.065 * g(w, 501.1, 0.049, 0.0382),
    0.821 * g(w, 568.8, 0.0213, 0.0247) + 0.286 * g(w, 530.9, 0.0613, 0.0322),
    1.217 * g(w, 437.0, 0.0845, 0.0278) + 0.681 * g(w, 459.0, 0.0385, 0.0725),
  ];
  const toRGB = ([X, Y, Z]) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const sum = (R) => { const xyz = [0, 0, 0]; for (let w = 380; w <= 730; w += 5) { const c = cmf(w), r = R(w); xyz[0] += c[0] * r; xyz[1] += c[1] * r; xyz[2] += c[2] * r; } return toRGB(xyz); };
  const white = sum(() => 0.5);
  const out = new Uint8Array(512 * 4);
  for (let i = 0; i < 512; i++) {
    const opd = (i / 511) * 2400, rgb = sum((w) => Math.sin((Math.PI * opd) / w) ** 2);
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(255 * Math.min(1, Math.max(0, (rgb[k] / white[k]) * 0.5)));
    out[i * 4 + 3] = 255;
  }
  return out; // stored halved, so the shader's 2x is in [0, 2]: (see SHOW, iris)
}

// A lightning bolt by midpoint displacement (each segment's middle pushed sideways by up to a
// share of its length, then each half again), with a branch or two, on a disc of the sky's
// directions: from its rim toward the middle (overhead). Drawn as a wide soft glow, then a thin
// white core.
function drawBolt(g, S, rnd) {
  const split = (a, b, depth, out) => {
    if (depth === 0) { out.push(b); return; }
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1), off = (rnd() - 0.5) * len * 0.45;
    const m = [mx + nx * off, my + ny * off];
    split(a, m, depth - 1, out);
    split(m, b, depth - 1, out);
  };
  const ang = rnd() * Math.PI * 2, from = [S / 2 + Math.cos(ang) * S * 0.48, S / 2 + Math.sin(ang) * S * 0.48];
  const to = [S / 2 + (rnd() - 0.5) * S * 0.25, S / 2 + (rnd() - 0.5) * S * 0.25];
  const main = [from];
  split(from, to, 7, main);
  const paths = [main];
  for (let k = 0; k < 2; k++) {
    const at = main[Math.floor(main.length * (0.25 + rnd() * 0.5))], a2 = ang + Math.PI + (rnd() - 0.5) * 1.6;
    const end = [at[0] + Math.cos(a2) * S * 0.18, at[1] + Math.sin(a2) * S * 0.18], br = [at];
    split(at, end, 5, br);
    paths.push(br);
  }
  g.clearRect(0, 0, S, S);
  g.lineJoin = g.lineCap = 'round';
  for (const [w, a] of [[14, 0.08], [6, 0.18], [2, 1]]) {
    g.strokeStyle = w === 2 ? 'rgba(235,242,255,1)' : `rgba(120,150,255,${a})`;
    g.lineWidth = w;
    paths.forEach((p, i) => { g.globalAlpha = i ? 0.6 : 1; g.beginPath(); p.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
  }
  g.globalAlpha = 1;
}

export function createChrome(canvas) {
  let gl = null, ok = false, stepProg, surfProg, showProg, colProg, buf, water = [], fbo = [], surfTex = null, surfFbo = null, imgTex = null, imgFbo = null, filmTex, boltTex, textTex;
  let ls = {}, lf = {}, lv = {}, lc = {}, i = 0, w = 0, h = 0, sw = 0, sh = 0, iw = 0, ih = 0;
  let last = 0, flash = 0, boltOn = 0, boltAt = -9, thick = 260, thickTo = 260, swell = 0.1, iris = 0.75;
  let pulse = 0, tear = 0, lay = { rects: [], text: null }, layBar = null, strips = [];
  const drops = [];
  const panel = document.createElement('canvas').getContext('2d');
  const boltCanvas = document.createElement('canvas');
  boltCanvas.width = boltCanvas.height = 512;
  const bg = boltCanvas.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const compile = (src, type) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (frag) => {
    const pr = gl.createProgram();
    gl.attachShader(pr, compile(VERT, gl.VERTEX_SHADER));
    gl.attachShader(pr, compile(frag, gl.FRAGMENT_SHADER));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    return pr;
  };
  const tex2d = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const target = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); return f; };
  function build() {
    ok = false;
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    // (the ripples need float pictures to draw into; without them the chrome stays off)
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return;
    try { stepProg = program(STEP); surfProg = program(SURF); showProg = program(SHOW); colProg = program(COLLAGE); } catch (err) { console.error('chrome:', err); return; }
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ls = Object.fromEntries(['water', 'texel', 'damp', 'aspect', 'drops', 'nDrops'].map((k) => [k, gl.getUniformLocation(stepProg, k)]));
    lf = Object.fromEntries(['water', 'texel', 'aspect', 'time', 'swell', 'ripple', 'thick'].map((k) => [k, gl.getUniformLocation(surfProg, k)]));
    lv = Object.fromEntries(['surf', 'film', 'bolt', 'iris', 'flash', 'boltOn'].map((k) => [k, gl.getUniformLocation(showProg, k)]));
    lc = Object.fromEntries(['img', 'surf', 'film', 'text', 'res', 'rects', 'kinds', 'nRects', 'time', 'pulse', 'tear'].map((k) => [k, gl.getUniformLocation(colProg, k)]));
    filmTex = tex2d();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 512, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, filmStrip());
    boltTex = tex2d();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boltCanvas);
    textTex = tex2d();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    w = h = sw = sh = iw = ih = 0;
    layBar = null;
    ok = true;
  }
  // the water at a fifth of the window's size (ripples are smooth), in two pictures to bounce
  // between; the surface at a third; the chrome itself at full size, for the collage to cut up
  function size(W, H, SW, SH, IW, IH) {
    if (W !== w || H !== h) {
      w = W; h = H;
      for (const t of water) gl.deleteTexture(t);
      for (const f of fbo) gl.deleteFramebuffer(f);
      water = [0, 1].map(() => { const t = tex2d(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); return t; });
      fbo = water.map(target);
    }
    if (SW !== sw || SH !== sh) {
      sw = SW; sh = SH;
      if (surfTex) { gl.deleteTexture(surfTex); gl.deleteFramebuffer(surfFbo); }
      surfTex = tex2d();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, sw, sh, 0, gl.RGBA, gl.HALF_FLOAT, null);
      surfFbo = target(surfTex);
    }
    if (IW !== iw || IH !== ih) {
      iw = IW; ih = IH;
      if (imgTex) { gl.deleteTexture(imgTex); gl.deleteFramebuffer(imgFbo); }
      imgTex = tex2d();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, iw, ih, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      imgFbo = target(imgTex);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ok = false; });
  canvas.addEventListener('webglcontextrestored', () => { water = []; fbo = []; surfTex = imgTex = null; build(); });
  build();

  const drop = (x, y, r, depth) => { drops.push([x, y, r, depth]); if (drops.length > 12) drops.shift(); };
  const bolt = () => {
    drawBolt(bg, 512, rnd);
    gl.bindTexture(gl.TEXTURE_2D, boltTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boltCanvas);
    boltOn = 1;
    flash = Math.max(flash, 0.4);
  };
  // the clap: a holographic strip or two over the collage, and lightning, a bolt at most every
  // 1.8 seconds (none of either with fewer flashes)
  const clap = (calm, collage) => {
    if (calm) return;
    if (collage) for (let k = rnd() < 0.5 ? 1 : 2; k > 0; k--) { const y = 0.06 + 0.88 * rnd(), hh = (4 + 14 * rnd()) / (canvas.height || 800), x = 0.03 + 0.55 * rnd(); strips.push({ r: [x, y, Math.min(1, x + 0.15 + 0.4 * rnd()), y + hh], until: last + 0.25 + 0.2 * rnd() }); }
    if (last - boltAt < 1.8) return;
    boltAt = last;
    bolt();
  };
  // a new layout every `every` bars (the same bar, the same layout), the panel lettered for it
  const newBar = (b, every, lines) => {
    if (b === layBar || ((b % every) + every) % every) return;
    layBar = b;
    const W = canvas.width || innerWidth, H = canvas.height || innerHeight;
    lay = layout(b, W, H);
    if (!lay.text) return;
    const [x0, y0, x1, y1] = lay.text;
    drawPanel(panel, (x1 - x0) * W, (y1 - y0) * H, lines);
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panel.canvas);
  };
  // how loud a band of the fast spectrum is, 0-1 (as the warp reads it)
  const band = (eng, lo, hi) => {
    const db = eng.fastDb, hz = eng.hzFast;
    let m = -160;
    for (let k = Math.max(1, Math.floor(lo / hz)); k <= Math.min(db.length - 1, Math.ceil(hi / hz)); k++) m = Math.max(m, db[k]);
    return Math.min(1, Math.max(0, (m + 90) / 60));
  };

  // One frame: the water's steps (with the drops since the last), the surface, the chrome (onto the
  // screen, or into its picture), then the collage.
  function render(t, low, high, collage) {
    const W = Math.round(innerWidth * devicePixelRatio), H = Math.round(innerHeight * devicePixelRatio);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const WW = Math.max(16, Math.round(W / 5)), WH = Math.max(16, Math.round(H / 5)), SW = Math.max(16, Math.round(W / 3)), SH = Math.max(16, Math.round(H / 3));
    size(WW, WH, SW, SH, collage ? W : 1, collage ? H : 1);
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    flash *= Math.exp(-dt * 7);
    boltOn *= Math.exp(-dt * 8);
    pulse *= Math.exp(-dt * 6);
    tear *= Math.exp(-dt * 4);
    thick += (thickTo - thick) * Math.min(1, dt * 2);
    swell += (0.1 + 0.06 * low - swell) * Math.min(1, dt * 3);
    iris = 0.65 + 0.3 * high;
    // the water: two steps a frame (three when frames come at 30 a second)
    gl.viewport(0, 0, WW, WH);
    gl.useProgram(stepProg);
    gl.uniform2f(ls.texel, 1 / WW, 1 / WH);
    gl.uniform1f(ls.damp, 0.994);
    gl.uniform1f(ls.aspect, WW / WH);
    const steps = dt > 0.025 ? 3 : 2;
    for (let s = 0; s < steps; s++) {
      const n = s === 0 ? drops.length : 0;
      if (n) gl.uniform4fv(ls.drops, new Float32Array(drops.flat().concat(new Array((12 - n) * 4).fill(0))));
      gl.uniform1i(ls.nDrops, n);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - i]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, water[i]);
      gl.uniform1i(ls.water, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      i = 1 - i;
    }
    drops.length = 0;
    // the surface: its normal, height and film
    gl.bindFramebuffer(gl.FRAMEBUFFER, surfFbo);
    gl.viewport(0, 0, SW, SH);
    gl.useProgram(surfProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, water[i]); gl.uniform1i(lf.water, 0);
    gl.uniform2f(lf.texel, 1 / SW, 1 / SH);
    gl.uniform1f(lf.aspect, W / H);
    gl.uniform1f(lf.time, t);
    gl.uniform1f(lf.swell, swell);
    gl.uniform1f(lf.ripple, 0.01);
    gl.uniform1f(lf.thick, thick);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // the chrome
    gl.bindFramebuffer(gl.FRAMEBUFFER, collage ? imgFbo : null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(showProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, surfTex); gl.uniform1i(lv.surf, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, filmTex); gl.uniform1i(lv.film, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, boltTex); gl.uniform1i(lv.bolt, 2);
    gl.uniform1f(lv.iris, iris);
    gl.uniform1f(lv.flash, flash);
    gl.uniform1f(lv.boltOn, boltOn);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!collage) return;
    // the collage, onto the screen
    strips = strips.filter((x) => x.until > t);
    const list = [...lay.rects, ...strips.map((x) => [...x.r, 8, 0, 0, 0])].slice(0, 14);
    const R = new Float32Array(14 * 4), K = new Float32Array(14 * 4);
    list.forEach((r, k) => { R.set(r.slice(0, 4), k * 4); K.set(r.slice(4, 8), k * 4); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(colProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex); gl.uniform1i(lc.img, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, surfTex); gl.uniform1i(lc.surf, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, filmTex); gl.uniform1i(lc.film, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, textTex); gl.uniform1i(lc.text, 3);
    gl.uniform2f(lc.res, W, H);
    gl.uniform4fv(lc.rects, R);
    gl.uniform4fv(lc.kinds, K);
    gl.uniform1i(lc.nRects, list.length);
    gl.uniform1f(lc.time, t);
    gl.uniform1f(lc.pulse, pulse);
    gl.uniform1f(lc.tear, tear);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // the engine's hits, from when the chrome came on (none from before)
  const seen = new WeakSet();
  let since = null, root = -1;
  return {
    get broken() { return !ok; },
    // a drop (the kick back after a break): a big bead in the middle, and a bolt
    splash(calm) { if (!ok) return; drop(0.5, 0.5, 0.08, 2.4); pulse = 1; if (!calm) { boltAt = last; bolt(); } },
    // Not in use: let the pictures go (draw() makes them again) and start afresh next time.
    clear() { if (ok) size(1, 1, 1, 1, 1, 1); canvas.width = canvas.height = 1; since = null; layBar = null; lay = { rects: [], text: null }; },
    // song: { title, artist } (or null); calm: fewer flashes; collage: the collage over it or not
    draw(t, eng, { song = null, calm = false, collage = true } = {}) {
      if (!ok) return;
      if (since === null) since = t;
      for (const o of eng.onsets) {
        if (seen.has(o)) continue;
        seen.add(o);
        if (o.t < since) continue;
        if (o.id === 'bd') {
          // where the kick falls in the bar, left to right; a little higher or lower each bar
          const p = eng.placeAt(o.t), step = p ? p.step : 8, b = p ? p.bar : 0, s = Math.min(1, o.s);
          drop(0.06 + (0.88 * (step + 0.5)) / 16, 0.5 + 0.3 * Math.sin(b * 1.9), 0.04 + 0.015 * s, 1.0 + 0.8 * s);
          pulse = 1;
        } else if (o.id === 'sd') clap(calm, collage);
        else if (o.id === 'hh') tear = Math.min(1, tear + 0.4);
      }
      const p = eng.placeAt(t);
      if (p) {
        // the chord's root sets the film's thickness (a fifth round the circle a step), so each
        // chord has its own colours
        const slot = eng.slots[((p.bar % 4) + 4) % 4];
        if (slot?.chord && slot.chord.root !== root) { root = slot.chord.root; thickTo = 170 + 20 * ((root * 7) % 12); }
        if (collage) {
          const key = eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}` : 'key ?';
          newBar(p.bar, calm ? 4 : 2, [song?.title || 'toaster', song?.artist || '', `${key} · ${Math.round(eng.tempo.shown || eng.tempo.bpm)} bpm`]);
        }
      }
      render(t, band(eng, 40, 200), band(eng, 6000, 14000), collage);
    },
  };
}
