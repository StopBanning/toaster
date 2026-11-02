// The Earth (V): the planet from the space station, as its crews filmed it in 4K and NASA gave it to everyone (public
// domain): the aurora over the clouds on the night side, the northern lights along the limb, a continent's city
// lights, dawn coming up the curve, and the day side's clouds over the mountains. A moves on to the next. Each clip is
// a loop (its last seconds crossfade into its first), turned upright (the crews mostly film with the Earth overhead)
// and cropped clear of the station.
//
// The song lights it only a little, so it stays a calm place to look: the bass brightens the auroras' green, the kick
// sets the cities twinkling, a drop opens the exposure for a moment. The day side breathes with the bass, and that's all.
//
// The clips aren't in the app (10-25 MB each): one comes down the first time it's picked. The web plays it from the
// site; the app keeps a copy (window.nc.earthClip), so after that it plays offline. Until it's in, its poster shows.
import { clock } from './clock.js';

export const EARTH_CLIPS = ['aurora', 'northern lights', 'city lights', 'dawn', 'day'];
const NIGHT = new Set(['aurora', 'northern lights', 'city lights', 'dawn']);
const file = (name) => 'earth-' + name.replace(/ /g, '-'); // ('northern lights' -> earth-northern-lights)
const FADE_OUT = 0.5, FADE_IN = 1.2; // seconds, a clip changing: down to black, then up from it once the next one shows

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
uniform float uFade, uKick, uBass, uDrop, uNight, uTime;
in vec2 vUv;
out vec4 o;
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
void main() {
  // cover: the clip fills the window, cut at the sides or at the top and bottom as the shapes need
  float ra = uRes.x / uRes.y, ta = uTexSize.x / uTexSize.y;
  vec2 uv = vUv;
  if (ra > ta) uv.y = (uv.y - 0.5) * ta / ra + 0.5; else uv.x = (uv.x - 0.5) * ra / ta + 0.5;
  vec3 c = texture(uTex, vec2(uv.x, 1.0 - uv.y)).rgb;
  if (uNight > 0.5) {
    // the aurora's green, brighter with the bass
    float aurora = smoothstep(0.03, 0.25, c.g - max(c.r, c.b));
    c += c * aurora * 0.45 * uBass;
    // warm points of light (the cities), each cluster twinkling on the kick to its own amount
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float city = smoothstep(0.42, 0.85, l) * step(c.b, c.r);
    uvec2 cell = uvec2(gl_FragCoord.xy / 3.0);
    float tw = float(pcg(cell.x ^ pcg(cell.y + uint(floor(uTime * 6.0)) * 0x9e3779b9u))) / 4294967295.0;
    c += c * city * (0.2 + 0.6 * tw) * uKick;
  } else {
    c *= 1.0 + 0.05 * uBass;
  }
  c *= 1.0 + 0.18 * uDrop;
  o = vec4(c * uFade, 1.0);
}`;

const env = (age, tau) => (age >= 0 && age < tau * 12 ? Math.exp(-age / tau) : 0);
const has = (eng, fn) => typeof eng[fn] === 'function';

export function createEarth(canvas) {
  let gl = null, prog = null, tex = null, u = {}, ready = false;
  let video = null, poster = null, posterUp = false, name = null, wanted = EARTH_CLIPS[0];
  let fadeFrom = 0, fadingOut = false, shownAt = -1, start = null, failed = false, loading = null, frameUp = false, active = false;
  const urls = new Map(); // (each view's object URL while the Earth is up: A comes back to it without fetching it again)

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
    for (const n of ['uTex', 'uRes', 'uTexSize', 'uFade', 'uKick', 'uBass', 'uDrop', 'uNight', 'uTime']) u[n] = gl.getUniformLocation(prog, n);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return true;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; });

  // Where a clip comes from: the app's own copy (downloaded once, then kept), or on the web the site's. A perfect copy's
  // render has no window.nc: its preload asks main for the same copy.
  async function source(n) {
    const kept = window.nc?.earthClip || window.takeRender?.earthClip;
    if (kept) {
      if (urls.has(n)) return urls.get(n);
      const bytes = await kept(file(n));
      if (!urls.has(n)) urls.set(n, URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' })));
      return urls.get(n);
    }
    return new URL(`/media/earth/${file(n)}.mp4`, location.origin).href;
  }

  // Load clip n: its poster at once (it's in the app), its video when it's in.
  function load(n) {
    name = n; failed = false; frameUp = false; posterUp = false; start = null;
    poster = Object.assign(new Image(), { src: new URL(`./earth/${file(n)}.jpg`, import.meta.url).href });
    poster.decode().then(() => { if (name === n) posterUp = 'new'; }, () => {});
    if (video) { video.removeAttribute('src'); video.load(); } // (its URL stays in urls, for A's way back)
    video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
    for (const ev of ['loadeddata', 'seeked', 'timeupdate']) video.addEventListener(ev, () => { frameUp = false; });
    const mine = video;
    loading = source(n).then((src) => {
      if (mine !== video) return;
      mine.src = src;
      if (clock.mode !== 'render') mine.play().catch(() => {});
    }, () => { if (mine === video) failed = true; }).finally(() => { if (mine === video) loading = null; });
  }

  function upload(el) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, el);
  }

  return {
    // the clip shown, and the clip to show (A): it fades down, then the next fades up once it has a picture
    get clip() { return wanted; },
    get failed() { return failed; },
    get loading() { return !!loading; },
    // (for a render's start: the view's clip not yet showing a frame, unless it can't come at all)
    get waiting() { return !failed && (!!loading || !video || video.readyState < 2); },
    setClip(n) {
      if (!EARTH_CLIPS.includes(n) || n === wanted) return;
      wanted = n;
      if (name) { fadingOut = true; fadeFrom = clock.now(); }
    },
    // For a render, before each frame: the clip is a video element on its own clock, so the frame for time t is asked
    // of it (looping from the first frame asked for) and waited for. Resolves at once otherwise. (Like the eye's.)
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
      // (the clips' memory let go: the video emptied, the URLs freed; the next pick fetches the kept copy again)
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); video = null; }
      for (const u of urls.values()) URL.revokeObjectURL(u);
      urls.clear();
      name = null; loading = null; active = false;
      canvas.width = canvas.height = 0;
      shownAt = -1;
    },
    draw(t, eng, { offset = 0 } = {}) {
      active = true;
      if (gl?.isContextLost()) return; // (its picture comes back when the context does)
      if (!ready) { if (!setup()) return; ready = true; posterUp = posterUp && 'new'; frameUp = false; }
      if (name !== wanted && (!name || !fadingOut || t - fadeFrom >= FADE_OUT)) { load(wanted); fadingOut = false; shownAt = -1; }
      if (video && video.paused && clock.mode !== 'render' && video.src) video.play().catch(() => {});

      const dpr = Math.min(devicePixelRatio || 1, 2), k = Math.min(1, Math.sqrt(2.6e6 / (innerWidth * innerHeight * dpr * dpr)));
      const W = Math.max(1, Math.round(innerWidth * dpr * k)), H = Math.max(1, Math.round(innerHeight * dpr * k));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      // the picture: the clip's frame once it has one, else its poster
      let size = null;
      if (video && video.readyState >= 2 && video.videoWidth) {
        if (!frameUp || !video.paused) { upload(video); frameUp = true; }
        size = [video.videoWidth, video.videoHeight];
      } else if (posterUp && poster.naturalWidth) {
        if (posterUp === 'new') { upload(poster); posterUp = true; }
        size = [poster.naturalWidth, poster.naturalHeight];
      }
      if (size && shownAt < 0) shownAt = t;
      const fade = fadingOut ? Math.max(0, 1 - (t - fadeFrom) / FADE_OUT) : shownAt < 0 ? 0 : Math.min(1, (t - shownAt) / FADE_IN);

      const at = t + offset, v = eng.v || {}; // (where it's heard, as every layer draws the grid: tools/offset-convention)
      const hit = (id) => (!v[id] ? -99 : has(eng, 'lastHitAt') ? eng.lastHitAt(id, t) : v[id].lastHit?.t ?? -99);
      const bassAt = eng.lastBassHit ? eng.lastBassHit.t : hit('bass');
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform2f(u.uTexSize, size ? size[0] : 16, size ? size[1] : 9);
      gl.uniform1f(u.uFade, size ? fade : 0);
      gl.uniform1f(u.uKick, env(at - hit('bd'), 0.25));
      gl.uniform1f(u.uBass, env(at - bassAt, 0.4));
      gl.uniform1f(u.uDrop, env(at - (eng.lastDrop ?? -99), 0.9));
      gl.uniform1f(u.uNight, NIGHT.has(name) ? 1 : 0);
      gl.uniform1f(u.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
