// The Earth (V): the planet from the space station, as its crews filmed it in 4K and NASA gave it to everyone (public
// domain). Twenty views: the night side (auroras, city lights, moonlit clouds, dawn coming up the curve), the day side
// (deserts, oceans, mountains, a hurricane through the window, the sun's glint on the sea) and a few of the station's
// own sights (the whole Earth from the cupola, the Earth in a porthole, the sun rising as a star, a capsule arriving, a
// cargo ship on the arm). A moves on to the next. Each clip is a loop (its last seconds crossfade into its first),
// turned upright (the crews mostly film with the Earth overhead) and cropped clear of the station, unless the station
// is the picture.
//
// The song lights it: at night the bass brightens the auroras' green and the kick sets the cities twinkling; by day the
// kick catches the brightest things (cloud tops, snow, the sun's glint) and the bass lifts the whole picture a little;
// a drop is a camera hit, a small push in and a flash that fall away over a beat or two. With "fewer flashes" on, the
// day side only breathes with the bass and a drop only opens the exposure a little, as before.
//
// The clips aren't in the app (4-25 MB each): one comes down the first time it's picked. The web plays it from the
// site; the app keeps a copy (window.nc.earthClip), so after that it plays offline. Until it's in, its poster shows.
import { clock } from './clock.js';

// (the first five keep their places: a saved view is kept by name, and A's round starts as it did)
export const EARTH_CLIPS = ['aurora', 'northern lights', 'city lights', 'dawn', 'day',
  'golden coast', 'aurora ribbon', 'aurora arm', 'moonlit clouds',
  'sahara', 'blue ocean', 'snow mountains', 'desert coast', 'sun glint', 'hurricane',
  'whole earth', 'porthole', 'sunrise star', 'capsule', 'cargo ship'];
// The picker's three shelves, and which light a view answers the song with (night: the aurora and the cities).
export const EARTH_GROUPS = [
  ['night', ['aurora', 'northern lights', 'aurora ribbon', 'aurora arm', 'city lights', 'golden coast', 'moonlit clouds', 'dawn']],
  ['day', ['day', 'sahara', 'blue ocean', 'snow mountains', 'desert coast', 'sun glint', 'hurricane']],
  ['from the station', ['whole earth', 'porthole', 'sunrise star', 'capsule', 'cargo ship']],
];
const NIGHT = new Set(EARTH_GROUPS[0][1]);
// The tour's order ("all views": a new one every 8 bars): night, day and the station's sights in turn, so each change
// is a change of light, and no two auroras or two deserts meet.
export const EARTH_TOUR = ['aurora', 'sahara', 'moonlit clouds', 'whole earth', 'city lights', 'blue ocean', 'sunrise star',
  'northern lights', 'snow mountains', 'capsule', 'golden coast', 'desert coast', 'porthole', 'aurora ribbon', 'sun glint',
  'dawn', 'day', 'cargo ship', 'aurora arm', 'hurricane'];
const KEEP_URLS = 4; // (clips held in memory at once: with twenty views, every one's bytes would be 300 MB)
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
uniform float uFade, uKick, uBass, uDrop, uHit, uCalm, uNight, uTime;
in vec2 vUv;
out vec4 o;
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
void main() {
  // cover: the clip fills the window, cut at the sides or at the top and bottom as the shapes need
  float ra = uRes.x / uRes.y, ta = uTexSize.x / uTexSize.y;
  vec2 uv = vUv;
  if (ra > ta) uv.y = (uv.y - 0.5) * ta / ra + 0.5; else uv.x = (uv.x - 0.5) * ra / ta + 0.5;
  uv = (uv - 0.5) * (1.0 - 0.035 * uHit * (1.0 - uCalm)) + 0.5; // (a drop: the camera pushed in a little, easing back)
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
    // by day the kick catches the brightest things: cloud tops, snow, the sun and its glint on the sea
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += c * smoothstep(0.45, 0.9, l) * 0.18 * uKick * (1.0 - uCalm);
    c *= 1.0 + 0.05 * uBass;
  }
  c *= 1.0 + 0.18 * uDrop + 0.4 * uHit * (1.0 - uCalm);
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
    for (const n of ['uTex', 'uRes', 'uTexSize', 'uFade', 'uKick', 'uBass', 'uDrop', 'uHit', 'uCalm', 'uNight', 'uTime']) u[n] = gl.getUniformLocation(prog, n);
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
      // (the oldest let go, never the one showing or wanted: its kept copy is read again if it's come back to)
      for (const [k, url] of urls) {
        if (urls.size <= KEEP_URLS) break;
        if (k !== n && k !== name && k !== wanted) { URL.revokeObjectURL(url); urls.delete(k); }
      }
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
    draw(t, eng, { offset = 0, calm = false } = {}) {
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
      gl.uniform1f(u.uHit, env(at - (eng.lastDrop ?? -99), 0.3));
      gl.uniform1f(u.uCalm, calm ? 1 : 0);
      gl.uniform1f(u.uNight, NIGHT.has(name) ? 1 : 0);
      gl.uniform1f(u.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
