// The backrooms (V): an endless walk through yellow rooms, damp wallpaper, wet carpet and buzzing fluorescent panels, the
// liminal place everyone knows. It's our own walk, rendered in Blender (a closed path through a maze of rooms, so its last
// frame runs into its first), not footage of anyone's.
//
// The song works the lights. In a quiet stretch the tubes stutter now and then; each kick of the song brightens the rooms
// for a moment, the light blooming off the walls; a drop blows the tubes out (a white flash, then dark for half a beat)
// and the kicks bring them back. Over it all, a camcorder's tape: grain and a little colour bleed.
//
// The walk isn't in the app (about 12 MB): it comes down the first time the backrooms are picked, from the site on the
// web and through main in the app (window.nc.earthClip keeps it, as it keeps the Earth's views), so after that it plays
// offline. Until it's in, its poster shows.
import { clock } from './clock.js';

const FILE = 'backrooms-walk', FADE_IN = 1.2;

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uTexSize;
uniform float uFade, uLight, uBloom, uWhite, uTime;
in vec2 vUv;
out vec4 o;
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rnd(uvec2 c, uint f) { return float(pcg(c.x ^ pcg(c.y + f * 0x9e3779b9u))) / 4294967295.0; }
vec3 tap(vec2 uv) { return texture(uTex, vec2(uv.x, 1.0 - uv.y)).rgb; }
void main() {
  // cover: the walk fills the window, cut at the sides or at the top and bottom as the shapes need
  float ra = uRes.x / uRes.y, ta = uTexSize.x / uTexSize.y;
  vec2 uv = vUv;
  if (ra > ta) uv.y = (uv.y - 0.5) * ta / ra + 0.5; else uv.x = (uv.x - 0.5) * ra / ta + 0.5;
  // the tape: the red a touch to one side, the blue to the other
  float px = 1.5 / uRes.x;
  vec3 c = vec3(tap(uv + vec2(px * 2.0, 0.0)).r, tap(uv).g, tap(uv - vec2(px * 1.5, 0.0)).b);
  c *= vec3(1.05, 1.0, 0.82); // (the backrooms' mustard)
  // the lights: how lit the rooms are, and a bloom off the bright parts (the panels, the walls under them) on a kick
  vec3 lit = c * uLight;
  // (the glow is the picture blurred, from its smaller mip levels: smooth, no copies of the panels)
  vec2 fuv = vec2(uv.x, 1.0 - uv.y);
  vec3 glow = uBloom > 0.001 ? (max(textureLod(uTex, fuv, 4.0).rgb - 0.55, 0.0) * 0.9 + max(textureLod(uTex, fuv, 6.0).rgb - 0.5, 0.0) * 0.7) * uBloom : vec3(0.0);
  vec3 col = lit + glow * vec3(1.0, 0.95, 0.78) + uBloom * 0.06 * vec3(1.0, 0.92, 0.7);
  col = mix(col, vec3(1.0, 0.98, 0.9), uWhite); // (the blow-out)
  // grain and a vignette wider than tall (no scanlines: against the wallpaper's stripes and the ceiling's grid they beat into moiré)
  col += (rnd(uvec2(gl_FragCoord.xy), uint(uTime * 30.0)) - 0.5) * 0.03;
  vec2 q = vUv - 0.5;
  col *= 1.0 - 0.55 * q.x * q.x - 0.35 * q.y * q.y;
  o = vec4(clamp(col, 0.0, 1.0) * uFade, 1.0);
}`;

const has = (eng, fn) => typeof eng[fn] === 'function';
// a stutter of the tubes in a quiet stretch: a few short dips a bar or two apart, the same each run (seeded by the time)
const stutter = (t) => {
  const slot = Math.floor(t / 0.9), f = Math.abs(Math.sin(slot * 91.7) * 43758.5453 % 1);
  const x = t - (slot * 0.9 + f * 0.6);
  return f < 0.11 && x >= 0 && x < 0.16 ? 0.22 * Math.sin((x / 0.16) * Math.PI) : 0;
};

// How lit the rooms are at time `at`, from the song: { light, bloom, white }. Pure, so a test can hold it to its story.
export function lightsAt(at, { kick = -99, drop = -99, beat = 0.5, seen = kick } = {}) {
  const sinceDrop = at - drop;
  if (sinceDrop >= 0 && sinceDrop < 0.06) return { light: 1, bloom: 0, white: 1 }; // the tubes blow
  if (sinceDrop >= 0.06 && sinceDrop < beat * 0.5 && kick <= drop + 0.05) return { light: 0.08, bloom: 0, white: 0 }; // dark
  const k = at - kick, flash = k >= 0 && k < 2 ? Math.min(1, Math.max(0, at - seen) / 0.1) * Math.exp(-k / 0.3) : 0;
  // (a 3-frame rise from when the kick is known, which is a few frames after it sounds: never a one-frame jump)
  const base = sinceDrop >= 0 && sinceDrop < 8 * beat * 4 ? 0.7 : 0.92; // (a little dimmer through the drop's bars, so the kicks show)
  const quiet = k > beat * 8 && !(sinceDrop >= 0 && sinceDrop < 8 * beat * 4);
  return { light: base + 0.42 * flash - (quiet ? stutter(at) : 0), bloom: flash, white: 0 };
}

export function createBackrooms(canvas) {
  let gl = null, prog = null, tex = null, u = {}, ready = false;
  let kickWas = -99, kickSeen = -99; // (the last kick, and when this view first knew of it)
  let video = null, poster = null, posterUp = false, shownAt = -1, start = null, failed = false, loading = null, frameUp = false, active = false, url = null;

  function setup() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl || gl.isContextLost()) return false;
    const sh = (type, text) => { const s = gl.createShader(type); if (s) { gl.shaderSource(s, text); gl.compileShader(s); } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    prog = gl.createProgram();
    if (!vs || !fs || !prog) return false;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    for (const n of ['uTex', 'uRes', 'uTexSize', 'uFade', 'uLight', 'uBloom', 'uWhite', 'uTime']) u[n] = gl.getUniformLocation(prog, n);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return true;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; });

  // where the walk comes from: the app's kept copy (main fetches it once), or on the web the site's
  async function source() {
    const kept = window.nc?.earthClip || window.takeRender?.earthClip;
    if (!kept) return new URL(`/media/earth/${FILE}.mp4`, location.origin).href;
    url ??= URL.createObjectURL(new Blob([await kept(FILE)], { type: 'video/mp4' }));
    return url;
  }

  function load() {
    failed = false; frameUp = false; posterUp = false; start = null;
    poster = Object.assign(new Image(), { src: new URL(`./backrooms/${FILE}.jpg`, import.meta.url).href });
    poster.decode().then(() => { posterUp = 'new'; }, () => {});
    video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
    for (const ev of ['loadeddata', 'seeked', 'timeupdate']) video.addEventListener(ev, () => { frameUp = false; });
    const mine = video;
    loading = source().then((src) => {
      if (mine !== video) return;
      mine.src = src;
      if (clock.mode !== 'render') mine.play().catch(() => {});
    }, () => { if (mine === video) failed = true; }).finally(() => { if (mine === video) loading = null; });
  }

  function upload(el) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, el);
    gl.generateMipmap(gl.TEXTURE_2D); // (for the glow's blur)
  }

  return {
    get failed() { return failed; },
    get loading() { return !!loading; },
    get waiting() { return !failed && (!!loading || !video || video.readyState < 2); },
    // for a render, before each frame: the walk's frame for time t, asked of the video and waited for (as the Earth's)
    prepare(t) {
      if (clock.mode !== 'render' || !active || !video || !(video.duration > 0)) return null;
      video.pause();
      start ??= t;
      const d = video.duration, want = (((t - start) % d) + d) % d;
      if (Math.abs(video.currentTime - want) < 0.0005 && !video.seeking) return null;
      return new Promise((resolve) => {
        const done = () => { video.removeEventListener('seeked', done); resolve(); };
        video.addEventListener('seeked', done);
        video.currentTime = want;
      });
    },
    clear() {
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); video = null; }
      if (url) { URL.revokeObjectURL(url); url = null; }
      loading = null; active = false;
      canvas.width = canvas.height = 0;
      shownAt = -1;
    },
    draw(t, eng, { offset = 0 } = {}) {
      active = true;
      if (gl?.isContextLost()) return;
      if (!ready) { if (!setup()) return; ready = true; posterUp = posterUp && 'new'; frameUp = false; }
      if (!video) { load(); shownAt = -1; }
      if (video.paused && clock.mode !== 'render' && video.src) video.play().catch(() => {});

      const dpr = Math.min(devicePixelRatio || 1, 2), k = Math.min(1, Math.sqrt(2.6e6 / (innerWidth * innerHeight * dpr * dpr)));
      const W = Math.max(1, Math.round(innerWidth * dpr * k)), H = Math.max(1, Math.round(innerHeight * dpr * k));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      let size = null;
      if (video.readyState >= 2 && video.videoWidth) {
        if (!frameUp || !video.paused) { upload(video); frameUp = true; }
        size = [video.videoWidth, video.videoHeight];
      } else if (posterUp && poster.naturalWidth) {
        if (posterUp === 'new') { upload(poster); posterUp = true; }
        size = [poster.naturalWidth, poster.naturalHeight];
      }
      if (size && shownAt < 0) shownAt = t;
      const fade = shownAt < 0 ? 0 : Math.min(1, (t - shownAt) / FADE_IN);

      const at = t + offset, v = eng.v || {}; // (where it's heard: tools/offset-convention)
      const kick = !v.bd ? -99 : has(eng, 'lastHitAt') ? eng.lastHitAt('bd', t) : v.bd.lastHit?.t ?? -99;
      if (kick !== kickWas) { kickWas = kick; kickSeen = at; }
      const L = lightsAt(at, { kick, seen: Math.max(kick, kickSeen), drop: eng.lastDrop ?? -99, beat: eng.tempo?.P || 0.5 });
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform2f(u.uTexSize, size ? size[0] : 16, size ? size[1] : 9);
      gl.uniform1f(u.uFade, size ? fade : 0);
      gl.uniform1f(u.uLight, L.light);
      gl.uniform1f(u.uBloom, L.bloom);
      gl.uniform1f(u.uWhite, L.white);
      gl.uniform1f(u.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
