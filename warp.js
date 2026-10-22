// Warp: a feedback background in the style of the Hydra patches live coders run behind their
// code (this is its own shader, not Hydra). Every frame draws the last one again, a little zoomed
// in and turned, so everything trails and swirls toward you; over it go stripes folded into a
// kaleidoscope, bending the trails where they cross. All in the theme's two colours. The kick
// punches the zoom, the bass widens the stripes, the hats spin it, and how loud it is sets how
// bright the new stripes come in. Worked out at half the window's size (feedback is soft anyway)
// and stretched to fit, on the graphics card: a couple of calls a frame.
const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D prev;     // last frame
uniform float time, aspect, zoom, spin, sides, freq, gain, wobble;
uniform vec3 bg, fg;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main() {
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  // stripes, folded into a kaleidoscope of 'sides' wedges, drifting outward
  float a = atan(p.y, p.x), r = length(p), w = 6.2831853 / sides;
  a = abs(mod(a + time * 0.05, w) - w * 0.5);
  vec2 k = vec2(cos(a), sin(a)) * r;
  float s = 0.5 + 0.5 * sin(k.x * freq - time * 1.7 + sin(k.y * 6.0 + time) * wobble);
  s = smoothstep(0.35, 0.65, s);
  // last frame, zoomed in toward the middle and turned, bent a little by the stripes
  vec2 q = rot(spin) * ((uv - 0.5) * (1.0 - zoom)) + 0.5;
  q += (s - 0.5) * 0.004 * vec2(cos(time), sin(time * 1.3));
  float back = texture(prev, q).r * 0.93;
  float v = max(back, s * gain * smoothstep(0.75, 0.1, r));
  color = vec4(v, v, v, 1.0);
}`;

// the brightness worked out above, in the theme's colours, onto the screen
const SHOW = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D frame;
uniform vec3 bg, fg;
void main() { float v = texture(frame, uv).r; color = vec4(mix(bg, fg, v), 1.0); }`;

export function createWarp(canvas) {
  let gl = null, ok = false, stepProg, showProg, buf, tex = [], fbo = [], loc = {}, show = {}, i = 0, w = 0, h = 0;
  let pulse = 0, last = 0, spin = 0;
  const band = (eng, lo, hi) => {
    const db = eng.fastDb, hz = eng.hzFast;
    let m = -160;
    for (let k = Math.max(1, Math.floor(lo / hz)); k <= Math.min(db.length - 1, Math.ceil(hi / hz)); k++) m = Math.max(m, db[k]);
    return Math.min(1, Math.max(0, (m + 90) / 60));
  };
  const compile = (src, type) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const program = (frag) => {
    const pr = gl.createProgram();
    gl.attachShader(pr, compile(VERT, gl.VERTEX_SHADER));
    gl.attachShader(pr, compile(frag, gl.FRAGMENT_SHADER));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    return pr;
  };
  function build() {
    ok = false;
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
    if (!gl) return;
    try {
      stepProg = program(FRAG);
      showProg = program(SHOW);
    } catch (err) { console.error('warp:', err); return; }
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    loc = Object.fromEntries(['prev', 'time', 'aspect', 'zoom', 'spin', 'sides', 'freq', 'gain', 'wobble'].map((k) => [k, gl.getUniformLocation(stepProg, k)]));
    show = Object.fromEntries(['frame', 'bg', 'fg'].map((k) => [k, gl.getUniformLocation(showProg, k)]));
    w = h = 0;
    ok = true;
  }
  // two pictures to bounce between, at half the window's size
  function size(W, H) {
    if (W === w && H === h) return;
    w = W;
    h = H;
    for (const t of tex) gl.deleteTexture(t);
    for (const f of fbo) gl.deleteFramebuffer(f);
    tex = [0, 1].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    fbo = tex.map((t) => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return f;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ok = false; });
  canvas.addEventListener('webglcontextrestored', () => { tex = []; fbo = []; build(); });
  build();

  return {
    get broken() { return !ok; },
    kick(s) { pulse = Math.max(pulse, 0.5 + 0.5 * Math.min(1, s)); },
    // Not in use: drop the pictures' memory too (draw() makes them again).
    clear() { if (ok) { size(1, 1); } canvas.width = canvas.height = 1; },
    draw(t, eng, col) {
      if (!ok) return;
      const W = Math.max(1, Math.round(innerWidth / 2)), H = Math.max(1, Math.round(innerHeight / 2));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      size(W, H);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      pulse *= Math.exp(-dt * 6);
      const low = band(eng, 40, 200), high = band(eng, 6000, 14000), level = Math.min(1, (eng.level || 0) * 6);
      spin += dt * (0.08 + 0.5 * high);
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 110;
      // new stripes: one picture's brightness from the other, then onto the screen
      const from = i, to = 1 - i;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[to]);
      gl.viewport(0, 0, W, H);
      gl.useProgram(stepProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[from]);
      gl.uniform1i(loc.prev, 0);
      gl.uniform1f(loc.time, t * (bpm / 120));
      gl.uniform1f(loc.aspect, W / H);
      gl.uniform1f(loc.zoom, 0.006 + 0.03 * pulse);
      gl.uniform1f(loc.spin, Math.sin(spin) * 0.01);
      gl.uniform1f(loc.sides, 6);
      gl.uniform1f(loc.freq, 34 - 16 * low);
      gl.uniform1f(loc.gain, eng.silent ? 0 : 0.35 + 0.65 * level);
      gl.uniform1f(loc.wobble, 1.2 + 2 * low);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(showProg);
      gl.bindTexture(gl.TEXTURE_2D, tex[to]);
      gl.uniform1i(show.frame, 0);
      gl.uniform3f(show.bg, col.bg[0] / 255, col.bg[1] / 255, col.bg[2] / 255);
      gl.uniform3f(show.fg, col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      i = to;
    },
  };
}
