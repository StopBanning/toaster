// Lanes (V): the song's patterns coming at you down a tunnel. Each part has a lane on each side of the tube (the
// kick along the floor, then the bass, the clap up the walls and the hats along the top), its steps lit tiles a step
// apart in depth: the next bar flies at you, and each tile flashes as it crosses the near ring, at the moment it
// plays. Rings mark the steps, brighter on each beat and brightest on each bar; the near ring swells on the kick; the
// tunnel's mouth drifts in a slow loop; a drop sends a ring of light out from the middle.
// It's all a function of the time and the engine's step position (eng.stepAt), so it holds still when the beat is
// lost, and drifts slowly, with no tiles, before one is found.

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime, uStep, uLocked, uKick, uDrop;
uniform float uPat[64]; // kick, clap, hats, bass: 16 steps each, 1 where it plays
uniform float uLive[4]; // whether each part is playing now
uniform vec3 uBg, uFg, uAccent;
in vec2 vUv;
out vec4 o;
const float PI = 3.14159265;
const float R_NOW = 0.43; // the near ring, where a step plays (in screen heights from the mouth)
// the lane up from the floor (0 kick, 1 bass, 2 clap, 3 hats) to the pattern's part (kick, clap, hats, bass)
int partOf(int lane) { return lane == 0 ? 0 : lane == 1 ? 3 : lane == 2 ? 1 : 2; }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 q = p - vec2(0.06 * sin(uTime * 0.21), 0.04 * cos(uTime * 0.17));
  float r = max(length(q), 0.002);
  float steps = (R_NOW / r - 1.0) * 3.2;   // how many steps ahead of now this ring lies (below 0: gone by)
  float at = uStep + steps;                  // the step it shows
  float stepI = floor(at), stepF = fract(at);
  float side = abs(atan(q.x, -q.y)) / PI * 4.0; // 0 on the floor, 4 at the top, the same on both sides
  int lane = int(min(3.0, floor(side)));
  int part = partOf(lane);
  float across = fract(side);
  float aaX = fwidth(side) * 1.25, aaZ = fwidth(at) * 1.25;
  float edgeX = min(across, 1.0 - across), edgeZ = min(stepF, 1.0 - stepF);
  // (far rings fade into the distance; the steps gone by keep flying out past you, dimmer)
  float fog = steps >= 0.0 ? exp(-steps * 0.075) : 0.55 * exp(steps * 0.35);
  // the grid: lane borders, a ring each step, brighter each beat and each bar
  float laneLine = 1.0 - smoothstep(0.0, aaX * 1.6, edgeX);
  float ring = 1.0 - smoothstep(0.0, aaZ * 1.6, edgeZ);
  float nearest = floor(at + 0.5);
  float beat = mod(nearest, 4.0) < 0.5 ? 1.0 : 0.0, bar = mod(nearest, 16.0) < 0.5 ? 1.0 : 0.0;
  vec3 grid = mix(uBg, uFg, 0.16 + 0.22 * beat + 0.3 * bar);
  vec3 col = mix(uBg, grid, max(laneLine * 0.8, ring * (0.45 + 0.55 * beat)) * fog);
  // the tiles: where the part plays on that step, a rounded tile with a brighter rim and a soft glow around it (each
  // part its own mix of the theme's colours), lit brighter as it comes and flashing at the ring
  float on = uPat[part * 16 + int(mod(stepI, 16.0))] * uLive[part] * uLocked;
  float tile = smoothstep(0.13 - aaX, 0.13 + aaX, edgeX) * smoothstep(0.11 - aaZ, 0.11 + aaZ, edgeZ);
  float halo = smoothstep(0.0, 0.16, edgeX) * smoothstep(0.0, 0.14, edgeZ);
  float rim = tile * (1.0 - smoothstep(0.13 + aaX, 0.21, edgeX) * smoothstep(0.11 + aaZ, 0.18, edgeZ));
  float near = exp(-abs(steps + 0.5) * 1.6);
  vec3 tint = part == 0 ? uFg : part == 1 ? mix(uFg, uAccent, 0.6) : part == 2 ? mix(uFg, uAccent, 0.3) : uAccent;
  vec3 lit = mix(mix(uBg, tint, 0.82), uAccent, near * 0.7);
  float amt = on * fog;
  col = mix(col, mix(uBg, tint, 0.5), halo * amt * 0.35 * (0.4 + near));
  col = mix(col, lit, tile * amt * (0.55 + 0.45 * near));
  col = mix(col, mix(lit, vec3(1.0), 0.45), rim * amt * 0.6);
  // the near ring, swelling on the kick, with a glow
  float w = 0.004 + 0.012 * uKick, dn = r - R_NOW;
  col = mix(col, uAccent, exp(-pow(dn / w, 2.0)) * (0.35 + 0.5 * uLocked));
  col += uAccent * exp(-pow(dn / (w * 6.0), 2.0)) * 0.12 * (0.5 + uKick);
  // the tunnel's mouth, darker into the distance
  col = mix(col, uBg * 0.55, (1.0 - smoothstep(0.0, 0.3, r)) * 0.45);
  // a drop: a ring of light out from the middle
  float dr = (1.0 - uDrop) * 1.1;
  col = mix(col, uFg, exp(-pow((r - dr) / 0.025, 2.0)) * uDrop);
  // the far middle fades into the background
  col = mix(uBg, col, smoothstep(0.015, 0.09, r));
  o = vec4(col, 1.0);
}`;

const PARTS = [['bd'], ['sd'], ['hhc', 'hho'], ['bass']];

export function createLanes(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
  let prog = null, u = {}, broken = !gl, W = 0, H = 0;
  const pat = new Float32Array(64), live = new Float32Array(4);
  // (a lost context takes its program with it: built again at the next draw, once the context is back)
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); prog = null; });
  canvas.addEventListener('webglcontextrestored', () => { prog = null; });
  function build() {
    const sh = (type, text) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, text);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    for (const name of ['uRes', 'uTime', 'uStep', 'uLocked', 'uKick', 'uDrop', 'uPat', 'uLive', 'uBg', 'uFg', 'uAccent']) {
      u[name] = gl.getUniformLocation(prog, name.startsWith('uPat') || name.startsWith('uLive') ? name + '[0]' : name);
    }
  }
  const env = (age, tau) => (age >= 0 && age < tau * 12 ? Math.exp(-age / tau) : 0);
  const norm = (c) => (c ? [c[0] / 255, c[1] / 255, c[2] / 255] : null);
  return {
    get broken() { return broken; },
    // Not in use: the canvas shrunk, so its full-window buffer is freed while another background is picked (draw() sizes it again).
    clear() { canvas.width = canvas.height = 1; W = H = 0; },
    draw(t, eng, col, offset = 0) {
      if (broken || gl.isContextLost()) return; // (lost: wait for it to come back, then build again)
      if (!prog) {
        try { build(); } catch (err) { console.warn('lanes', err); broken = true; return; }
      }
      const d = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; }
      const at = t + offset; // (the grid where it's heard, as every layer draws it: blocks, orb, cuts, scenery, spectro, storm)
      const step = typeof eng.stepAt === 'function' ? eng.stepAt(at) : null;
      const locked = step != null && !eng.silent;
      for (let p = 0; p < 4; p++) {
        const ids = PARTS[p];
        live[p] = locked && ids.some((id) => eng.v?.[id] && eng.present(id, at)) ? 1 : 0;
        for (let s = 0; s < 16; s++) pat[p * 16 + s] = ids.some((id) => eng.v?.[id]?.shown?.[s]) ? 1 : 0;
      }
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uStep, locked ? step : t * 2);
      gl.uniform1f(u.uLocked, locked ? 1 : 0);
      gl.uniform1f(u.uKick, env(at - (eng.v?.bd?.lastHit?.t ?? -99), 0.17));
      gl.uniform1f(u.uDrop, env(at - (eng.lastDrop ?? -99), 0.7));
      gl.uniform1fv(u.uPat, pat);
      gl.uniform1fv(u.uLive, live);
      const fg = norm(col.fg);
      gl.uniform3fv(u.uBg, norm(col.bg));
      gl.uniform3fv(u.uFg, fg);
      gl.uniform3fv(u.uAccent, norm(col.accent) || fg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
