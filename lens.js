// Finger frame: frame something with your fingers in front of the camera (each hand pointing:
// index straight out, the other fingers curled, the thumb wherever) and a window opens between
// your fingertips, showing what's inside it through a filter.
// The window is a card with a filter on each face, each corner held by its own fingertip. Turn
// one hand over and its end of the card twists round, showing the back (the next filter) on that
// side; turn the whole card over and the back becomes its front, with a new filter behind it.
// Flicking it edge-on and back (a sliver for a moment), bunching one hand's fingertips together,
// a wink, opening it again and every 4 bars each bring the next filter too. Pinch one hand (thumb
// on index) and its two corners meet: a triangle. Open your hands and it closes at once; bring
// them together pinched and it shrinks away; drop them and it closes a moment later.
// What shows is what the camera sees there; the filter's own pattern (dots, grid lines, mosaic,
// wrinkles) lies on the card, in perspective. Drawn with WebGL. After agustinawaigel_'s and
// mishu.ksv's hand portals and autterp0p's hand-frame edit.
import { RAMP } from './visuals.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const GRACE = 0.7; // seconds it holds on without the hands (a fast turn, a flip, a blur)
const GRACE_ONE = 1.2; // and while one hand is still there pointing, the other lost for a moment

// The filters, in the order they come round (neighbours unalike), each with its outline's colour
// (null: the theme's text colour):
// thermal: a heat camera. comic: three flat inks (yellow, hot pink, blue) under a print's dots.
// cling: cling film stretched across, its wrinkles bending what's behind it. sketch: pencil on
// paper. mosaic: big square tiles. rgb: red and blue pulled apart (further on the kick). dither:
// pink and blue in a 4 x 4 ordered pattern. grid: white lines ruled across the card. edges: neon
// outlines that flare on the kick. halftone: newsprint dots. negative. frost: frosted glass.
// ascii: characters, as the ASCII camera draws you. purple: a violet wash. film: old sepia film.
// keyframes: the light mapped to three colours (dark, middle, light), the colours jumping to the
// next set on every kick (after cal1star's CapCut keyframe portal).
export const FILTERS = [
  { name: 'keyframes', edge: '#ffffff' },
  { name: 'thermal', edge: '#ffffff' },
  { name: 'comic', edge: '#ffe63c' },
  { name: 'cling', edge: '#ffffff' },
  { name: 'sketch', edge: '#ffffff' },
  { name: 'mosaic', edge: '#ff4fd8' },
  { name: 'rgb', edge: '#ffffff' },
  { name: 'dither', edge: '#ffffff' },
  { name: 'grid', edge: '#ffffff' },
  { name: 'edges', edge: '#3dff76' },
  { name: 'halftone', edge: '#ffffff' },
  { name: 'negative', edge: '#ff46b4' },
  { name: 'frost', edge: '#eaf6ff' },
  { name: 'ascii', edge: null },
  { name: 'purple', edge: '#e6a8ff' },
  { name: 'film', edge: '#f0d9b0' },
];
const pick = (k) => FILTERS[((k % FILTERS.length) + FILTERS.length) % FILTERS.length];
// the keyframes' colour sets, all dark to light (so a change of set changes the colours, not
// light for dark: no flash): purple-magenta-green, blue-red-yellow, cyan-lime, magenta-white,
// heat, teal-cyan, rust-peach, gold
export const KEYS = [
  ['#2a0055', '#ff2fd0', '#3dff76'], ['#1a1aff', '#ff3030', '#ffe94a'], ['#003318', '#18c8ff', '#c8ff3a'], ['#200040', '#ff3df0', '#f4f4f4'],
  ['#401000', '#ff7a00', '#ffe85a'], ['#003040', '#2ab8c8', '#e8ffff'], ['#2a0a00', '#d8502a', '#fff0d0'], ['#3a2a00', '#c8a040', '#fff2b0'],
].map((set) => set.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)));
const KEY_GAP = 450; // ms: the keyframes change set at most this often (the kick fires on bass notes too)

// ASCII: one character a cell of the background's grid (14 px rows of the code's font, so they
// line up with it), from blank to dense with the shadows there (the light dense on a light
// theme), in the theme's colours swapped round (the card would vanish into an ASCII background
// otherwise), each copied from a strip of the ten drawn once per theme.
const CELL = 14;

const VERT = `#version 300 es
in vec2 pos;    // on screen, CSS pixels
in vec3 card;   // where on the card (u, v), times q, and q: so it's drawn in perspective
in float face;  // 0 the front, 1 the back
uniform vec2 size;
out vec2 vP;
out vec3 vCard;
flat out float vFace;
void main() {
  vP = pos;
  vCard = card;
  vFace = face;
  gl_Position = vec4(pos.x / size.x * 2.0 - 1.0, 1.0 - pos.y / size.y * 2.0, 0.0, 1.0);
}`;

// The filters themselves, shared with the portals (portal.js): the uniforms they read, and
// look(f, p, uv), filter f's colour at p (on screen, CSS pixels), uv being where that is on the
// card (0-1 each way).
export const LOOK_GLSL = `${FILTERS.map((f, i) => `#define F_${f.name.toUpperCase()} ${i}`).join('\n')}
uniform sampler2D cam;     // what the camera sees in the window's box
uniform sampler2D glyphs;  // the ASCII characters, light to dense, side by side
uniform vec4 box;          // that box: x0, y0, x1, y1 (CSS pixels)
uniform vec2 texel;        // one pixel of the camera's picture, in texture units
uniform vec2 cardSize;     // the card's width and height (CSS pixels)
uniform vec2 corner[4];    // its corners, round from the top left
uniform float pulse;       // the kick: 1 on the hit, dying away
uniform float time;
uniform float dpr;
uniform float light;       // 1 on a light theme
uniform vec3 bg;           // the theme's colours
uniform vec3 fg;
uniform vec2 cell;         // an ASCII cell (CSS pixels)
uniform vec3 keys[3];      // the keyframes' colours now, dark to light

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 tex(vec2 p) { return clamp((p - box.xy) / (box.zw - box.xy), 0.0, 1.0); }
vec3 at(vec2 p) { return texture(cam, tex(p)).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// the cling film's surface: wrinkles drawn out along the card, drifting slowly
float film(vec2 w) { return noise(w) + 0.5 * noise(w * 2.3 + 4.1) + 0.25 * noise(w * 5.1 + 9.7); }

const vec3 HEAT[6] = vec3[6](vec3(0, 0, 40), vec3(30, 20, 190), vec3(0, 160, 255), vec3(40, 230, 120), vec3(250, 240, 40), vec3(255, 70, 20));
vec3 heat(float l) {
  float v = clamp(l * 1.25 - 0.08, 0.0, 0.999) * 5.0;
  int k = int(v);
  return mix(HEAT[k], HEAT[k + 1], fract(v)) / 255.0;
}
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

// a point of the card (0-1 each way) on screen, near enough: between its corners
vec2 onScreen(vec2 uv) { return mix(mix(corner[0], corner[1], uv.x), mix(corner[3], corner[2], uv.x), uv.y); }

// how much of a point (q: on the card, in pixels) is in a dot of radius r, the dots on a grid
// turned 45 degrees, apart pixels apart
float dots(vec2 q, float apart, float r) {
  vec2 g = mat2(0.7071, 0.7071, -0.7071, 0.7071) * q / apart;
  float d = length(fract(g) - 0.5) * apart;
  float w = max(fwidth(d), 0.5);
  return 1.0 - smoothstep(r - w, r + w, d);
}

vec3 look(int f, vec2 p, vec2 uv) {
  vec3 c = at(p);
  float l = lum(c);
  vec2 q = uv * cardSize;
  if (f == F_THERMAL) return heat(l);
  if (f == F_KEYFRAMES) { float v = clamp((l - 0.08) * 1.25, 0.0, 1.0); return v < 0.5 ? mix(keys[0], keys[1], v * 2.0) : mix(keys[1], keys[2], v * 2.0 - 1.0); }
  if (f == F_NEGATIVE) return 1.0 - c;
  if (f == F_DITHER) {
    ivec2 k = ivec2(mod(floor(q / 3.0), 4.0));
    return l * 1.2 - 0.08 > (BAYER[k.y * 4 + k.x] + 0.5) / 16.0 ? vec3(1.0, 0.275, 0.882) : vec3(0.086, 0.133, 1.0);
  }
  if (f == F_COMIC) {
    vec3 ink = l > 0.62 ? vec3(1.0, 0.9, 0.235) : l > 0.32 ? vec3(1.0, 0.25, 0.55) : vec3(0.157, 0.235, 0.784);
    return mix(ink, vec3(0.08, 0.047, 0.17), dots(q, 10.0, (1.0 - l) * 6.2));
  }
  if (f == F_HALFTONE) return mix(vec3(0.95, 0.94, 0.9), vec3(0.06, 0.06, 0.07), dots(q, 8.0, sqrt(1.0 - l) * 4.9));
  if (f == F_EDGES || f == F_SKETCH) {
    vec2 t = tex(p);
    if (f == F_EDGES) {
      // how sharply the light changes here (Sobel), as neon on black
      float a = lum(texture(cam, t + texel * vec2(-1.0, -1.0)).rgb), b = lum(texture(cam, t + texel * vec2(0.0, -1.0)).rgb), d = lum(texture(cam, t + texel * vec2(1.0, -1.0)).rgb);
      float e = lum(texture(cam, t + texel * vec2(-1.0, 0.0)).rgb), g = lum(texture(cam, t + texel * vec2(1.0, 0.0)).rgb);
      float h = lum(texture(cam, t + texel * vec2(-1.0, 1.0)).rgb), i = lum(texture(cam, t + texel * vec2(0.0, 1.0)).rgb), j = lum(texture(cam, t + texel * vec2(1.0, 1.0)).rgb);
      float gx = d + 2.0 * g + j - a - 2.0 * e - h, gy = h + 2.0 * i + j - a - 2.0 * b - d;
      return vec3(0.239, 1.0, 0.463) * clamp(length(vec2(gx, gy)) * 2.2 * (1.0 + 1.2 * pulse) - 0.12, 0.0, 1.0);
    }
    // pencil: darker than its surroundings is a stroke (a colour dodge of the light by its blur),
    // the shadows hatched across the card, on faintly grainy paper
    float m = 0.0;
    for (int k = 0; k < 12; k++) {
      float a = float(k) * 0.5236;
      m += lum(texture(cam, t + texel * 2.5 * vec2(cos(a), sin(a))).rgb) + lum(texture(cam, t + texel * 5.0 * vec2(cos(a + 0.26), sin(a + 0.26))).rgb);
    }
    m /= 24.0;
    float s = pow(clamp(l / max(m, 0.03), 0.0, 1.0), 4.0);
    float hatch = (1.0 - smoothstep(0.12, 0.38, l)) * step(0.62, fract((q.x + q.y) / 5.0)) * 0.45;
    float paper = 0.95 + (hash(floor(q * 0.7)) - 0.5) * 0.05;
    return vec3(1.0, 0.985, 0.95) * max(paper * s - hatch, 0.12);
  }
  if (f == F_MOSAIC) {
    vec2 n = max(floor(cardSize / 18.0 + 0.5), vec2(3.0));
    return at(onScreen((floor(uv * n) + 0.5) / n));
  }
  if (f == F_RGB) {
    vec2 d = vec2(12.0 + 18.0 * pulse, 0.0);
    return clamp((vec3(at(p + d).r, c.g, at(p - d).b) - 0.5) * 1.2 + 0.5, 0.0, 1.0);
  }
  if (f == F_FROST) {
    // every pixel a few others close by, at random: frosted, with a milky white over it
    vec3 s = vec3(0.0);
    for (int k = 0; k < 10; k++) s += at(p + (vec2(hash(p + float(k) * 7.31), hash(p.yx + float(k) * 3.17)) - 0.5) * 20.0);
    return mix(s / 10.0, vec3(0.92, 0.96, 1.0), 0.32) + (hash(floor(p * dpr)) - 0.5) * 0.05;
  }
  if (f == F_GRID) {
    vec2 n = vec2(8.0, clamp(floor(8.0 * cardSize.y / max(cardSize.x, 1.0) + 0.5), 3.0, 12.0));
    vec2 g = uv * n;
    vec2 d = abs(fract(g + 0.5) - 0.5) / max(fwidth(g), vec2(1e-4));
    return mix(c, vec3(1.0), (1.0 - clamp(min(d.x, d.y) - 0.4, 0.0, 1.0)) * 0.9);
  }
  if (f == F_CLING) {
    // the wrinkles' slope bends the picture behind (each colour a little differently), and they
    // catch the light in thin streaks
    // (stretched film: long smooth folds across the card, a few finer creases on them)
    vec2 w = q / vec2(150.0, 34.0) + vec2(time * 0.02, time * 0.03);
    float e = 0.02, h0 = film(w);
    vec2 slope = vec2(film(w + vec2(e, 0.0)) - h0, film(w + vec2(0.0, e)) - h0) / e;
    vec3 n = normalize(vec3(-slope * 0.22, 1.0));
    vec2 off = n.xy * 14.0;
    vec3 s = vec3(at(p + off * 1.1).r, at(p + off).g, at(p + off * 0.9).b);
    float spec = pow(max(dot(n, normalize(vec3(-0.35, -0.55, 0.75))), 0.0), 120.0);
    float sheen = pow(max(dot(n, normalize(vec3(0.5, 0.3, 0.8))), 0.0), 18.0);
    return min(mix(s, vec3(0.93, 0.95, 1.0), 0.06) + spec * 0.9 + sheen * 0.1, 1.0);
  }
  if (f == F_ASCII) {
    // in the theme's colours the other way round (blue letters on white, on the blue theme): in
    // its own colours it vanished into the ASCII backgrounds behind it
    vec2 k = floor(p / cell);
    float a = lum(at((k + 0.5) * cell));
    a = mix(1.0 - a, a, light);
    if (a <= 0.06) return fg;
    vec2 local = fract(p / cell);
    return mix(fg, bg, texture(glyphs, vec2((min(9.0, floor(a * 9.99)) + local.x) / 10.0, local.y)).a);
  }
  if (f == F_PURPLE) return clamp(mix(c * vec3(0.78, 0.42, 1.0), vec3(0.55, 0.16, 0.9), 0.22) * 1.12, 0.0, 1.0);
  if (f == F_FILM) {
    vec3 s = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
    float grain = (hash(floor(p * dpr) + fract(time * 13.7) * 91.0) - 0.5) * 0.2;
    return clamp(s * (1.0 - 0.6 * pow(length(uv - 0.5) * 1.3, 2.0)) * (0.96 + 0.04 * sin(time * 47.0)) + grain, 0.0, 1.0);
  }
  return c;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vP;
in vec3 vCard;
flat in float vFace;
uniform ivec2 filt;        // the filter on the front, and on the back
out vec4 color;
${LOOK_GLSL}

void main() {
  if (vP.x < box.x || vP.y < box.y || vP.x > box.z || vP.y > box.w) discard;
  color = vec4(look(vFace > 0.5 ? filt.y : filt.x, vP, clamp(vCard.xy / vCard.z, 0.0, 1.0)), 1.0);
}`;

// the outline: a flat colour
const LINE_VERT = `#version 300 es
in vec2 pos;
uniform vec2 size;
void main() { gl_Position = vec4(pos.x / size.x * 2.0 - 1.0, 1.0 - pos.y / size.y * 2.0, 0.0, 1.0); }`;
const LINE_FRAG = `#version 300 es
precision mediump float;
uniform vec4 ink;
out vec4 color;
void main() { color = ink; }`;

// Is the hand pointing? The index straight out and two of the other fingers curled, the thumb
// wherever; once the window is open, the index out and one finger curled will do. Each finger is
// judged in 3D (MediaPipe's world points, in metres round the hand's middle, which keep their
// shape through a turn) and on screen (which stays sure of an index pointing down, where the 3D
// guess goes soft and reads it as half bent), and either will do. views: the hand's points in
// those two ways (or just on screen). Points: 0 wrist, 4 thumb tip, 5/6/8 index knuckle, middle
// joint and tip, then the middle, ring and little fingers the same way.
const reach = (v, i) => Math.hypot(v[i][0] - v[0][0], v[i][1] - v[0][1], (v[i][2] || 0) - (v[0][2] || 0));
const out = (v, tip, joint, k) => reach(v, tip) > reach(v, joint) * k;
const OTHERS = [[12, 10], [16, 14], [20, 18]]; // the middle, ring and little fingers: tip, middle joint
function isFrame(views, held) {
  const index = views.some((v) => out(v, 8, 6, held ? 1.05 : 1.1));
  const curled = OTHERS.filter(([tip, joint]) => views.some((v) => !out(v, tip, joint, 1.1))).length;
  return index && curled >= (held ? 1 : 2);
}

// Is the hand pinching (thumb tip on index tip)? And are all its fingertips bunched together
// (agustinawaigel_'s todosLosDedosJuntos)? Measured against the hand's size (wrist to the middle
// finger's knuckle), in 3D if there is 3D.
const span = (v, i, j) => Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], (v[i][2] || 0) - (v[j][2] || 0));
export const isPinch = (views) => span(views[0], 4, 8) < 0.28 * span(views[0], 0, 9);
const TIPS = [4, 8, 12, 16, 20];
function isBunch(views) {
  const v = views[0], c = [0, 1, 2].map((k) => TIPS.reduce((s, i) => s + (v[i][k] || 0), 0) / TIPS.length);
  return TIPS.every((i) => Math.hypot(v[i][0] - c[0], v[i][1] - c[1], (v[i][2] || 0) - c[2]) < 0.3 * span(v, 0, 9));
}

// Has the hand let go, opened flat? The other three fingers plainly straight, in 3D and on screen
// both (a turning hand never looks like that, even for a moment, to both at once); not while it
// pinches (an OK sign keeps hold of its corner).
const isOpen = (views) => OTHERS.every(([tip, joint]) => views.every((v) => out(v, tip, joint, 1.2))) && !isPinch(views);

// The four fingertips as a shape: in order round their middle, so it never crosses itself (order:
// which of them comes first, second and so on). Round from the top left, as the screen goes.
function order(pts) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map((_, i) => i).sort((a, b) => Math.atan2(pts[a][1] - cy, pts[a][0] - cx) - Math.atan2(pts[b][1] - cy, pts[b][0] - cx));
}
const around = (pts) => order(pts).map((i) => pts[i]);
const area = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// The card's middle, and how to draw it in perspective: where its diagonals cross, with each
// corner's weight for that (q, after Nathan Reed's quadrilateral interpolation); or, when they
// don't cross inside (the card twisted into a bow-tie, or pinched to a triangle), the average of
// its corners, drawn flat.
function middle(P) {
  const [a, b, c, d] = P;
  const r = [c[0] - a[0], c[1] - a[1]], s = [d[0] - b[0], d[1] - b[1]], ab = [b[0] - a[0], b[1] - a[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) > 1e-6) {
    const t = (ab[0] * s[1] - ab[1] * s[0]) / den, u = (ab[0] * r[1] - ab[1] * r[0]) / den;
    if (t > 0.04 && t < 0.96 && u > 0.04 && u < 0.96) return { m: [a[0] + t * r[0], a[1] + t * r[1]], q: [1 / (1 - t), 1 / (1 - u), 1 / t, 1 / u], qm: 2 };
  }
  return { m: [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4], q: [1, 1, 1, 1], qm: 1 };
}
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

// The card as four triangles out from its middle, each to one side; a side whose corners have come
// round the other way (relative to how it was when it opened: way) shows the back.
function fan(P, way) {
  const { m, q, qm } = middle(P);
  const tris = [];
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4];
    const cr = (a[0] - m[0]) * (b[1] - m[1]) - (a[1] - m[1]) * (b[0] - m[0]);
    total += Math.abs(cr) / 2;
    tris.push({ i, cr, back: cr * way < 0 });
  }
  return { m, q, qm, tris, total };
}

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function createLens(canvas) {
  const buf = document.createElement('canvas'); // what the camera sees in the window's box
  const bx = buf.getContext('2d');
  let gl = null, card = null, line = null, parallel = null, ready = false, broken = false;
  let camTex = null, glyphTex = null, glyphFor = '', cellW = 0;
  const geo = new Float32Array(12 * 6), edge = new Float32Array(4 * 6 * 2);
  let tips = null, open = 0, which = -1, lastBar = null, last = 0, drawn = false, pulse = 0, keyset = 0, keyAt = -1e9;
  // the two hands: where their wrists were last seen; when either was last followed, when only one
  // was, and when the frame between them was last seen whole; when the filter changed; since when
  // a hand has been open; since when the hands have been together, pinched shut
  let wrists = null, seenAt = -9, halfAt = -9, wholeAt = -9, changedAt = -9, openSince = null, shutSince = null;
  let corners = null; // the fingertips' order round the card, from when it opened
  let way = 1; // which way round its corners go with the front showing (-1 once it's turned over)
  let backSince = null; // since when all of it has shown its back
  let big = 0, thinSince = null; // its size lately (area), and since when it's been a sliver
  const bunched = [{ since: null, counted: false }, { since: null, counted: false }];
  let winkSince = null, winked = false; // since when one eye has been shut (and that wink counted)
  let faces = null; // what each side shows, for checking

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; card = line = null; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; card = line = null; glyphFor = ''; });

  // Building the shaders takes Windows a moment the first time, so it's done in the background
  // where the driver allows it (from when the camera comes on), and the frame works once it's done.
  function program(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    return { prog: p };
  }
  function build() {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) { broken = true; return; }
    parallel = gl.getExtension('KHR_parallel_shader_compile');
    card = program(VERT, FRAG);
    line = program(LINE_VERT, LINE_FRAG);
  }
  function init() {
    if (parallel && [card, line].some((p) => !gl.getProgramParameter(p.prog, parallel.COMPLETION_STATUS_KHR))) return false;
    for (const p of [card, line]) {
      if (!gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p.prog) || gl.getAttachedShaders(p.prog).map((s) => gl.getShaderInfoLog(s)).join(' '));
      }
    }
    const attr = (p, name, n, stride, at) => {
      const l = gl.getAttribLocation(p.prog, name);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride * 4, at * 4);
    };
    for (const [p, layout] of [[card, [['pos', 2, 6, 0], ['card', 3, 6, 2], ['face', 1, 6, 5]]], [line, [['pos', 2, 2, 0]]]]) {
      p.vao = gl.createVertexArray();
      gl.bindVertexArray(p.vao);
      p.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, p.buf);
      for (const a of layout) attr(p, ...a);
    }
    gl.bindVertexArray(null);
    const where = (p, names) => Object.fromEntries(names.map((k) => [k, gl.getUniformLocation(p.prog, k)]));
    card.loc = where(card, ['size', 'cam', 'glyphs', 'box', 'texel', 'filt', 'cardSize', 'corner', 'pulse', 'time', 'dpr', 'light', 'bg', 'fg', 'cell', 'keys']);
    line.loc = where(line, ['size', 'ink']);
    const texture = (unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tx;
    };
    glyphTex = texture(1);
    camTex = texture(0);
    gl.useProgram(card.prog);
    gl.uniform1i(card.loc.cam, 0);
    gl.uniform1i(card.loc.glyphs, 1);
    glyphFor = '';
    ready = true;
    return true;
  }

  // the ASCII characters, drawn for this theme, pixel ratio and font
  function glyphs(col, dpr) {
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font'), key = `${col.fg}/${dpr}/${font}`;
    if (glyphFor === key) return;
    glyphFor = key;
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${CELL}px ${font}`;
    cellW = m.measureText('0'.repeat(40)).width / 40;
    const strip = document.createElement('canvas'), gw = Math.ceil(cellW * dpr);
    strip.width = gw * RAMP.length;
    strip.height = Math.ceil(CELL * dpr);
    const g = strip.getContext('2d');
    g.font = `${CELL * dpr}px ${font}`;
    g.textBaseline = 'top';
    g.fillStyle = '#fff';
    for (let i = 0; i < RAMP.length; i++) g.fillText(RAMP[i], i * gw, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
  }

  const wipe = () => {
    if (drawn && ready) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    drawn = false;
    faces = null;
  };
  // the next filter, unless it only just changed
  const next = (t) => { if (t - changedAt > 0.3) { which++; changedAt = t; } };

  return {
    clear() { wipe(); tips = wrists = openSince = shutSince = corners = backSince = thinSince = null; open = 0; seenAt = halfAt = wholeAt = -9; },
    // a kick: the edges flare, red and blue split wider and the outline swells, for a moment, and
    // the keyframes jump to their next colours (calm: fewer flashes: a gentler flare, and new
    // colours at most every 2 seconds)
    kick(s, calm = false) {
      pulse = Math.max(pulse, calm ? 0.25 + 0.2 * Math.min(1, s) : 0.6 + 0.4 * Math.min(1, s));
      const now = performance.now();
      if (now - keyAt > (calm ? 2000 : KEY_GAP)) { keyset++; keyAt = now; }
    },
    // is the window open (or opening, or closing)?
    get showing() { return open > 0; },
    // the filter on its front now
    get filter() { return pick(which).name; },
    // what each side of the card shows: { front, back, sides: ['front' | 'back', ...] }, or null
    get faces() { return faces; },
    // hands: from the tracker; place(x, y): a camera point (0-1, not mirrored) on screen;
    // crop(r, out, w, h): draws part of the camera picture; rect: where the camera is on screen;
    // eyes: how shut each eye is ([left, right] 0-1), or null.
    draw(t, { hands, place, crop, rect, col, bar, eyes = null }) {
      if (broken || gl?.isContextLost()) return; // (lost: wait for it to come back, then build again)
      if (!ready) {
        try {
          if (!card) build();
          if (broken || !init()) return;
        } catch (err) { if (!gl?.isContextLost()) { broken = true; console.error('finger frame:', err); } return; }
      }
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      pulse *= Math.exp(-dt / 0.15);
      const W = innerWidth, H = innerHeight;
      const dpr = Math.min(1.5, devicePixelRatio || 1), w = Math.round(W * dpr), h = Math.round(H * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = true; }
      // the hands on screen, with their 3D shape if there is one: which of them are pointing (or,
      // once it's open, pinching a corner) and which are bunched
      const seen = hands.map((hd) => {
        const P = hd.points.map(([x, y]) => place(x, y));
        const views = hd.world ? [hd.world, P] : [P];
        return { P, views, pinch: isPinch(views), bunch: isBunch(views) };
      });
      let pointing = seen.filter((hd) => isFrame(hd.views, open > 0) || (open > 0 && hd.pinch));
      // a hand opened flat (for more than a passing look) is letting go: close now, not after holding on
      if (seen.some((hd) => isOpen(hd.views))) { openSince ??= t; if (t - openSince > 0.15) wholeAt = halfAt = -9; }
      else openSince = null;
      // the tracker now and then sees one hand twice: count it once
      const near = 0.05 * Math.min(W, H);
      if (pointing.length === 2 && dist(pointing[0].P[0], pointing[1].P[0]) < near && dist(pointing[0].P[8], pointing[1].P[8]) < near) pointing = [pointing[0]];
      if (!wrists || t - seenAt > 1) tips = wrists = corners = null;
      // which hand is which: the one nearest where each was a moment ago, so turning, crossing or
      // flipping them never swaps their corners round; starting out, the left one first
      let follow = [];
      if (pointing.length === 2) {
        let [a, b] = pointing;
        if (wrists ? dist(a.P[0], wrists[1]) + dist(b.P[0], wrists[0]) < dist(a.P[0], wrists[0]) + dist(b.P[0], wrists[1]) : a.P[0][0] > b.P[0][0]) [a, b] = [b, a];
        follow = [a, b];
      } else if (pointing.length === 1 && wrists) {
        // one hand lost for a moment: keep following the other
        const hd = pointing[0];
        follow = dist(hd.P[0], wrists[0]) <= dist(hd.P[0], wrists[1]) ? [hd, null] : [null, hd];
      }
      if (follow.length) {
        const k = tips ? Math.min(1, dt * 18) : 1;
        tips ||= [[0, 0], [0, 0], [0, 0], [0, 0]];
        wrists ||= [[0, 0], [0, 0]];
        follow.forEach((hd, i) => {
          if (!hd) return;
          [hd.P[8], hd.P[4]].forEach((p, j) => { const q = tips[i * 2 + j]; tips[i * 2 + j] = [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k]; });
          wrists[i] = hd.P[0];
          // all its fingertips bunched together (for a moment, once a bunch): the next filter
          const b = bunched[i];
          if (hd.bunch && open > 0.5) { b.since ??= t; if (!b.counted && t - b.since > 0.1) { b.counted = true; next(t); } }
          else { b.since = null; b.counted = false; }
        });
        seenAt = t;
        if (!(follow[0] && follow[1])) halfAt = t;
        else if (area(around(tips)) > 0.01 * W * H) wholeAt = t;
      }
      // the hands brought together, pinched (all four fingertips close): it shrinks away now
      const across = tips ? Math.max(...tips.flatMap((p, i) => tips.slice(i + 1).map((q) => dist(p, q)))) : 0;
      if (open > 0.5 && follow[0] && follow[1] && across < 0.07 * Math.min(W, H)) { shutSince ??= t; if (t - shutSince > 0.1) wholeAt = halfAt = -9; }
      else shutSince = null;
      // through a moment without the whole frame (a fast turn, a flip, a blur) it holds on, and
      // for longer while one hand is still there pointing (the tracker loses a hand at the edge
      // of the picture, or turning over, more often than it loses both)
      const target = tips && t - wholeAt < (t - halfAt < 0.2 ? GRACE_ONE : GRACE) ? 1 : 0;
      // a new filter each time it opens; and the corners keep the order they had then, each on its
      // own fingertip, so turning one hand over crosses its two corners and twists that end of the
      // card round, rather than the four being sorted round into a new window
      if (target && open < 0.05) { which++; changedAt = t; corners = order(tips); way = 1; big = 0; backSince = thinSince = null; }
      open = clamp(open + (target ? dt * 7 : -dt * 9), 0, 1);
      if (open > 0.5 && bar !== null && bar !== lastBar && bar % 4 === 0) { if (lastBar !== null) next(t); lastBar = bar; }
      // A wink (one eye shut and the other open, for a moment) changes the filter while your hands
      // hold the window. A blink shuts both, so it doesn't count; each wink counts once.
      if (eyes && open > 0.5) {
        const [l, r] = eyes;
        if (Math.max(l, r) > 0.5 && Math.abs(l - r) > 0.35) {
          winkSince ??= t;
          if (!winked && t - winkSince > 0.12) { winked = true; next(t); }
        } else {
          winkSince = null;
          if (Math.max(l, r) < 0.35) winked = false;
        }
      }
      const shape = tips && (corners || order(tips)).map((i) => tips[i]);
      if (!shape || open < 0.02) { corners = null; wipe(); return; }

      // Which way each side faces. All of it showing the back for a moment: it has been turned
      // over, and the back is its front now (with the next filter behind it). Squeezed edge-on to a
      // sliver (thin, but as long as ever) and opened out again the same way round: the next.
      const F = fan(shape, way);
      const sides = F.tris.filter((tr) => Math.abs(tr.cr) / 2 > 0.04 * F.total);
      // (only once it's opened out again: a sliver's way round is anyone's guess)
      if (open > 0.5 && sides.length && F.total > 0.45 * big && sides.every((tr) => tr.back)) {
        backSince ??= t;
        if (t - backSince > 0.25) { way = -way; which++; changedAt = t; backSince = null; }
      } else backSince = null;
      if (open > 0.5) {
        big = Math.max(F.total, big * Math.exp(-dt / 2));
        // a sliver: far smaller than lately, and thin for its length (a card shrunk whole, the
        // hands coming together, keeps its shape)
        if (F.total < 0.3 * big && F.total < 0.1 * across * across) thinSince ??= t;
        else if (thinSince !== null && F.total > 0.45 * big) {
          if (t - thinSince < 1 && !sides.every((tr) => tr.back)) next(t);
          thinSince = null;
        }
      }

      // the card grows out of (and shrinks back into) its middle
      const s = 1 - (1 - open) ** 3;
      const P = shape.map(([x, y]) => [F.m[0] + (x - F.m[0]) * s, F.m[1] + (y - F.m[1]) * s]);
      const x0 = Math.max(rect.x, Math.min(...P.map((p) => p[0]))), x1 = Math.min(rect.x + rect.w, Math.max(...P.map((p) => p[0])));
      const y0 = Math.max(rect.y, Math.min(...P.map((p) => p[1]))), y1 = Math.min(rect.y + rect.h, Math.max(...P.map((p) => p[1])));
      if (x1 - x0 < 4 || y1 - y0 < 4) { wipe(); return; }
      // what the camera sees there, in place, at up to 736 pixels across (sized in steps of 32, so
      // a moving window doesn't make a new picture and texture every frame; the shader stretches
      // it back over the box)
      const bw = Math.max(32, Math.min(736, Math.ceil((x1 - x0) / 32) * 32)), bh = Math.max(32, Math.ceil((bw * (y1 - y0)) / (x1 - x0) / 32) * 32);
      if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
      if (!crop({ x: (x0 - rect.x) / rect.w, y: (y0 - rect.y) / rect.h, w: (x1 - x0) / rect.w, h: (y1 - y0) / rect.h }, bx, bw, bh)) { wipe(); return; }
      const front = pick(which), back = pick(which + 1);
      faces = { front: front.name, back: back.name, sides: sides.map((tr) => (tr.back ? 'back' : 'front')) };

      // the four triangles, the backs first so the front wins where they overlap, each corner with
      // where it is on the card (times its perspective weight)
      const M = F.m;
      let n = 0;
      const vert = (p, uv, q, face) => { geo.set([p[0], p[1], uv[0] * q, uv[1] * q, q, face], n); n += 6; };
      for (const tr of [...F.tris].sort((a, b) => b.back - a.back)) {
        const i = tr.i, j = (i + 1) % 4, face = tr.back ? 1 : 0;
        vert(M, [0.5, 0.5], F.qm, face);
        vert(P[i], UV[i], F.q[i], face);
        vert(P[j], UV[j], F.q[j], face);
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      gl.useProgram(card.prog);
      gl.bindVertexArray(card.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, card.buf);
      gl.bufferData(gl.ARRAY_BUFFER, geo, gl.DYNAMIC_DRAW);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, camTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (front.name === 'ascii' || back.name === 'ascii') glyphs(col, dpr);
      const L = card.loc, lum = ([r, g, b]) => r + g + b;
      gl.uniform2f(L.size, W, H);
      gl.uniform4f(L.box, x0, y0, x1, y1);
      gl.uniform2f(L.texel, 1 / bw, 1 / bh);
      gl.uniform2i(L.filt, FILTERS.indexOf(front), FILTERS.indexOf(back));
      gl.uniform2f(L.cardSize, (dist(P[0], P[1]) + dist(P[3], P[2])) / 2, (dist(P[0], P[3]) + dist(P[1], P[2])) / 2);
      gl.uniform2fv(L.corner, P.flat());
      gl.uniform1f(L.pulse, pulse);
      gl.uniform1f(L.time, t % 1000);
      gl.uniform1f(L.dpr, dpr);
      gl.uniform1f(L.light, lum(col.fg) < lum(col.bg) ? 1 : 0);
      gl.uniform3f(L.bg, col.bg[0] / 255, col.bg[1] / 255, col.bg[2] / 255);
      gl.uniform3f(L.fg, col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
      gl.uniform2f(L.cell, cellW || CELL * 0.6, CELL);
      gl.uniform3fv(L.keys, KEYS[keyset % KEYS.length].flat());
      gl.drawArrays(gl.TRIANGLES, 0, 12);

      // the outline, round the corners in order (so a twisted card's edges cross like strings)
      const lw = 2 + 2 * pulse;
      let m = 0;
      for (let i = 0; i < 4; i++) {
        const a = P[i], b = P[(i + 1) % 4], len = dist(a, b);
        if (len < 0.5) continue;
        const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, nx = (-dy * lw) / 2, ny = (dx * lw) / 2;
        const A = [a[0] - (dx * lw) / 2, a[1] - (dy * lw) / 2], B = [b[0] + (dx * lw) / 2, b[1] + (dy * lw) / 2];
        edge.set([A[0] + nx, A[1] + ny, A[0] - nx, A[1] - ny, B[0] + nx, B[1] + ny, B[0] + nx, B[1] + ny, A[0] - nx, A[1] - ny, B[0] - nx, B[1] - ny], m);
        m += 12;
      }
      const ink = front.edge ? rgbOf(front.edge) : col.fg;
      gl.useProgram(line.prog);
      gl.bindVertexArray(line.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, line.buf);
      gl.bufferData(gl.ARRAY_BUFFER, edge.subarray(0, m), gl.DYNAMIC_DRAW);
      gl.uniform2f(line.loc.size, W, H);
      gl.uniform4f(line.loc.ink, ink[0] / 255, ink[1] / 255, ink[2] / 255, 1);
      gl.drawArrays(gl.TRIANGLES, 0, m / 2);
      gl.bindVertexArray(null);
      drawn = true;
    },
  };
}
