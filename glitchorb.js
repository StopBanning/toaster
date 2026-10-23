// Glitch orb: one of the orb's forms, after animoscillator's glitch orb (their "new orb to ponder",
// built here with their OK). A ball whose surface is a field of neon noise dragged into streaks:
// each band of rows on it has a point past which it slides along a few pixels a step, so the colour
// at that point is pulled out into a streak behind it, and the streaks grow between the kicks. Each
// kick drops a few fresh blocks of noise in; the first kick of a bar breaks it up into blocks again
// and turns the streaks' slant a little, and every other bar the points the rows are dragged past
// move: noisy blocks smeared out again, like a video losing its key frames and finding them. The
// surface is wrapped round the ball as its longitude and latitude, tilted to the slant, and turns
// with the orb. Drawn in the orb's own WebGL context: the surface is a texture worked out on the
// graphics card from the last one, 120 steps a second.
const SW = 512, SH = 256; // the surface: longitude across, latitude up
const RATE = 120; // its steps a second
const SPARKLE = 0.002; // fresh noise between the kicks too, a step's share of the blocks
const F = (x) => x.toFixed(1);

const VS = `
attribute vec2 a;
uniform vec4 box;
void main() { gl_Position = vec4(box.xy + a * box.zw, 0.0, 1.0); }`;
const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// a neon colour: often black, sometimes a dim one, else a fully saturated hue, now and then white
vec3 neon(float h, float v) {
  vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v < 0.45 ? vec3(0.0) : v < 0.6 ? c * 0.3 : v > 0.93 ? vec3(1.0) : c;
}`;
// the surface's step: each band of rows slides along past its drag point, pulling the colour there
// out into a streak; a kick (reseed above 0) drops blocks of fresh noise in, each a blend of two
// colours along its length, and a fresh start (reseed 1) scatters single pixels too
const STEP = HEAD + `
uniform sampler2D prev;
uniform float seed, dragSeed, reseed;
void main() {
  vec2 p = floor(gl_FragCoord.xy);
  float bandH = 1.0 + floor(hash(vec2(floor(gl_FragCoord.y / 3.0), dragSeed * 0.37)) * 3.0);
  float b = floor(gl_FragCoord.y / bandH);
  float x0 = hash(vec2(b, dragSeed)) * ${F(SW)}, sp = 2.0 + floor(hash(vec2(b, dragSeed + 7.1)) * 4.0);
  // (the rows to the right of their drag point slide right; the point's colour fills in behind)
  bool moving = mod(gl_FragCoord.x - x0, ${F(SW)}) < ${F(SW)} * (0.35 + 0.5 * hash(vec2(b, dragSeed + 3.3)));
  vec2 src = moving ? vec2(mod(p.x - sp, ${F(SW)}), p.y) : p;
  vec4 c = texture2D(prev, (src + 0.5) / vec2(${F(SW)}, ${F(SH)}));
  if (reseed > 0.0) {
    vec2 blk = floor(gl_FragCoord.xy / vec2(10.0, 3.0));
    float v = reseed > 0.5 && hash(gl_FragCoord.xy + seed) > 0.7 ? hash(gl_FragCoord.xy * 1.7 + seed) : hash(blk * 2.11 + seed);
    vec3 a = neon(hash(blk * 1.31 + seed), v), z = neon(hash(blk * 1.31 + seed + 0.5), v);
    if (hash(blk + seed * 1.7) < reseed) c = vec4(mix(a, z, smoothstep(0.0, 1.0, fract(gl_FragCoord.x / 10.0))), 1.0);
  }
  gl_FragColor = c;
}`;
// the ball: each pixel of the disc a point on it, turned to the slant, read off the surface as its
// longitude and latitude, smeared a little along the streaks (soft along their length, crisp
// across, as the post's are), a touch darker toward the rim as a lit ball is; the edge crackles
const DRAW = HEAD + `
uniform sampler2D surf;
uniform vec2 centre;
uniform vec3 ink;
uniform float radius, slant, spin, time, alpha;
void main() {
  vec2 p = (gl_FragCoord.xy - centre) / radius;
  float ang = atan(p.y, p.x + 1e-6), r = length(p);
  float edge = 1.0 + 0.018 * (hash(vec2(floor(ang * 90.0), floor(time * 24.0))) - 0.5);
  float aa = clamp((edge - r) * radius, 0.0, 1.0);
  if (aa <= 0.0) discard;
  float rr = min(r, 1.0), cs = cos(slant), sn = sin(slant);
  vec3 s = vec3(p, sqrt(max(0.0, 1.0 - rr * rr)));
  vec3 t = vec3(cs * s.x + sn * s.y, -sn * s.x + cs * s.y, s.z);
  float lon = atan(t.x, t.z + 1e-6) / 6.2831853 + spin, lat = asin(clamp(t.y, -1.0, 1.0)) / 3.1415927 + 0.5;
  vec3 c = vec3(0.0);
  for (int k = -2; k <= 2; k++) c += texture2D(surf, vec2(fract(lon + float(k) * 1.6 / ${F(SW)}), lat)).rgb * (3.0 - abs(float(k)));
  c *= mix(0.55, 1.0, s.z) / 9.0;
  if (r > 0.985) c = max(c, vec3(hash(vec2(ang * 200.0, time)) > 0.6 ? 0.9 : 0.0));
  // (its dark the theme's darkest colour: navy on the blue screen)
  c = 1.0 - (1.0 - c) * (1.0 - ink);
  float o = alpha * aa;
  gl_FragColor = vec4(c * o, o);
}`;

// gl: the orb's WebGL context; parallel: its KHR_parallel_shader_compile, if the driver has it (the
// shaders are built in the background, as the orb's are)
export function createGlitch(gl, parallel) {
  const program = (fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    return p;
  };
  const step = program(STEP), draw = program(DRAW), loc = { step: {}, draw: {} };
  let ready = false, broken = false, quad = null, A = null, B = null;
  let seed = Math.random() * 100, dragSeed = seed, reseed = 1, kicks = 0, ones = 0, lastBar = null, slant = -0.35, slantTo = -0.35, due = 0;

  const surface = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) throw new Error('glitch orb: its surface cannot be drawn into');
    return { t, f };
  };
  function init() {
    for (const p of [step, draw]) if (parallel && !gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR)) return false;
    for (const p of [step, draw]) if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || gl.getAttachedShaders(p).map((s) => gl.getShaderInfoLog(s)).join(' '));
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    A = surface(); B = surface();
    for (const [p, names] of [[step, ['box', 'prev', 'seed', 'dragSeed', 'reseed']], [draw, ['box', 'surf', 'centre', 'ink', 'radius', 'slant', 'spin', 'time', 'alpha']]]) {
      const l = p === step ? loc.step : loc.draw;
      l.a = gl.getAttribLocation(p, 'a');
      for (const n of names) l[n] = gl.getUniformLocation(p, n);
    }
    ready = true;
    return true;
  }
  const use = (p, l) => {
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(l.a);
    gl.vertexAttribPointer(l.a, 2, gl.FLOAT, false, 0, 0);
  };

  return {
    // whether it can be drawn yet (false while its shaders are still being built, or if they can't be)
    get ready() {
      if (ready || broken) return ready;
      try { return init(); } catch (err) { broken = true; console.error('glitch orb:', err); return false; }
    },
    // a fresh surface (all of it new blocks of noise), for when the form comes round
    fresh() { seed = Math.random() * 100; dragSeed = seed; reseed = 1; },
    // a kick; bar: the bar it fell in (on the beat grid), or nothing (no beat yet: every fourth kick
    // counts as a bar's first)
    kick(bar) {
      kicks++;
      seed = Math.random() * 100;
      const one = bar === undefined ? kicks % 4 === 1 : bar !== lastBar;
      if (bar !== undefined) lastBar = bar;
      if (one) {
        if (ones++ % 2 === 0) dragSeed = seed;
        slantTo = -0.35 + (Math.random() - 0.5) * 0.3;
      }
      reseed = Math.max(reseed, one ? 0.4 : 0.06);
    },
    // the surface's steps due by now, then the ball (into the canvas's own drawing buffer, w by h
    // pixels): cx, cy its middle (pixels from the bottom left), radius, spin (turns), ink (the dark,
    // 0 to 1 each), alpha
    draw(dt, w, h, { cx, cy, radius, spin, time, alpha, ink }) {
      if (!ready) return;
      due = Math.min(4, due + dt * RATE);
      gl.disable(gl.BLEND);
      use(step, loc.step);
      gl.uniform4f(loc.step.box, 0, 0, 1, 1);
      gl.uniform1i(loc.step.prev, 0);
      gl.uniform1f(loc.step.seed, seed);
      gl.uniform1f(loc.step.dragSeed, dragSeed);
      gl.activeTexture(gl.TEXTURE0);
      gl.viewport(0, 0, SW, SH);
      for (; due >= 1; due--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B.f);
        gl.bindTexture(gl.TEXTURE_2D, A.t);
        gl.uniform1f(loc.step.reseed, reseed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        [A, B] = [B, A];
        reseed = SPARKLE;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.enable(gl.BLEND);
      // (the slant eases to its new angle)
      slant += (slantTo - slant) * (1 - Math.exp(-dt / 0.35));
      use(draw, loc.draw);
      // (only the square the ball is in, a few pixels over for the crackling edge)
      const R = radius * 1.02 + 2;
      gl.uniform4f(loc.draw.box, (cx / w) * 2 - 1, (cy / h) * 2 - 1, (R / w) * 2, (R / h) * 2);
      gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(loc.draw.surf, 0);
      gl.uniform2f(loc.draw.centre, cx, cy);
      gl.uniform3f(loc.draw.ink, ink[0], ink[1], ink[2]);
      gl.uniform1f(loc.draw.radius, radius);
      gl.uniform1f(loc.draw.slant, slant);
      gl.uniform1f(loc.draw.spin, spin);
      gl.uniform1f(loc.draw.time, time);
      gl.uniform1f(loc.draw.alpha, alpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
