// The background "scenery" (V): a calm landscape in ASCII (after Claude FM's ASCII world, and ASCII
// landscapes drawn as prints). Every surface is filled in glyphs, the way a print is inked:
// - Snowy mountain ranges, the far one pale with haze; the near one's faces hatched in slashes
//   where the light falls and blocked in shade where it doesn't, the snow in triangles.
// - A shore of pines (stacks of triangles, lit on one side) and here and there a tree in blossom.
// - A lake of strokes that mirrors it all, broken by ripples, with the light's path across it.
// - A meadow of grass and flowers in front.
// On a light theme it's day on paper: a sun, clouds in shaded puffs, birds. On a dark one, night:
// a crescent moon with its halo, a sky of stars by the real counts (a few bright, most faint
// dust) and the Milky Way across it with its dark lanes, fireflies over the grass.
// It listens, calmly: the land glides past a step a beat (the near layers faster), each kick sends
// a ripple over the lake, the grass sways and the fireflies blink more when the hats are busy, the
// sun's rays breathe with the loudness, and every 8 bars birds cross (day) or a star falls (night).
// In its own colours (night or day), or with A in the theme's two.
// Drawn with WebGL in two passes: the scene worked out a character cell at a time (a glyph, its
// ink and its colour) into two small pictures, then the glyphs drawn from a sheet in the app's font.

const PX = 10; // a cell's height (CSS pixels)
// The land, in units of the window's height: each range's base, tallest peak, how far apart its
// peaks come and its ink; the lake's far and near shores; how many cells a beat each layer glides
// (meadow, near, mid, far, clouds); where the sun (or the moon) is, as shares of the width and
// height; the Milky Way: where it meets the horizon (a share of the width), its tilt (radians) and
// width, and how far along it its core sits. A tall (9:16) window has the code over its top half,
// so its land sits lower, the sun just over the peaks.
const WIDE = { far: [0.34, 0.42, 0.4, 0.32], mid: [0.3, 0.22, 0.27, 0.56], near: [0.29, 0.04, 3.2, 0.86], lake: [0.29, 0.12], sun: [0.78, 0.8], band: [0.2, 0.62, 0.15, 0.2] };
const TALL = { far: [0.26, 0.4, 0.4, 0.32], mid: [0.22, 0.2, 0.27, 0.56], near: [0.21, 0.035, 3.2, 0.86], lake: [0.21, 0.08], sun: [0.8, 0.5], band: [0.05, 1.0, 0.14, 0.16] };
WIDE.toaster = { x: 0.58, y: 0.7, on: 'boat' };
TALL.toaster = { x: 0.42, y: 0.7, on: 'boat' };
// the sea: far is its islands on the horizon; lake its horizon and its shore
const SEA_WIDE = { ...WIDE, far: [0.4, 0.055, 0.3, 0.3], lake: [0.4, 0.16], sun: [0.55, 0.86], band: [0.42, 0.78, 0.15, 0.2], toaster: { x: 0.42, y: 0.12, on: 'rock' } };
const SEA_TALL = { ...TALL, far: [0.24, 0.045, 0.3, 0.3], lake: [0.24, 0.085], sun: [0.86, 0.905], band: [0.62, 1.25, 0.14, 0.16], toaster: { x: 0.3, y: 0.12, on: 'rock' } };
const FIRE_WIDE = { ...WIDE, far: [0.42, 0.06, 0.5, 0.3], lake: [0.36, 0.14], sun: [0.8, 0.84], band: [0.04, 0.95, 0.13, 0.3], toaster: { x: 0.42, y: 0, on: 'log' }, tint: [1.08, 0.9, 0.76] };
const FIRE_TALL = { ...TALL, far: [0.36, 0.05, 0.5, 0.3], lake: [0.3, 0.1], sun: [0.82, 0.52], band: [0.0, 1.1, 0.12, 0.3], toaster: { x: 0.25, y: 0, on: 'log' }, tint: [1.08, 0.9, 0.76] };
// the snow: far is its mountains; lake the frozen lake's far shore and its near one
const SNOW_WIDE = { ...WIDE, far: [0.4, 0.2, 0.36, 0.3], lake: [0.3, 0.09], sun: [0.82, 0.82], band: [5, 1.57, 0.1, 0.3], toaster: { x: 0.38, y: 0.45, on: 'ice' }, tint: [0.82, 0.95, 0.94], cool: true };
const SNOW_TALL = { ...TALL, far: [0.34, 0.18, 0.36, 0.3], lake: [0.26, 0.07], sun: [0.86, 0.905], band: [5, 1.57, 0.1, 0.3], toaster: { x: 0.3, y: 0.45, on: 'ice' }, tint: [0.82, 0.95, 0.94], cool: true };
// the city: lake is the far kerb (where the buildings stand) and the near kerb
const CITY_WIDE = { ...WIDE, lake: [0.24, 0.12], toaster: { x: 0.7, y: -0.6, on: 'umbrella' }, tint: [1.02, 0.9, 0.86], cool: true, toneN: [0.17, 0.08, 0.15] };
const CITY_TALL = { ...TALL, lake: [0.2, 0.1], toaster: { x: 0.55, y: -0.6, on: 'umbrella' }, tint: [1.02, 0.9, 0.86], cool: true, toneN: [0.17, 0.08, 0.15] };
// the garden: lake is the pond's far bank and its near one
const GARDEN_WIDE = { ...WIDE, lake: [0.3, 0.05], sun: [0.58, 0.83], band: [0.2, 0.7, 0.12, 0.3], toaster: { x: 0.66, y: 0, on: 'bridge' } };
const GARDEN_TALL = { ...TALL, lake: [0.26, 0.05], sun: [0.86, 0.905], band: [0.1, 1.0, 0.1, 0.3], toaster: { x: 0.62, y: 0, on: 'bridge' } };
// the falls: far.x is the lip; mid the hills behind it; lake the pool's far edge and its near bank
const FALLS_WIDE = { ...WIDE, far: [0.66, 0, 0, 0.3], mid: [0.68, 0.07, 0.3, 0.3], lake: [0.24, 0.04], sun: [0.8, 0.86], band: [0.75, 1.3, 0.13, 0.3], toaster: { x: 0.66, y: 0.5, on: 'tube' }, cool: true };
const FALLS_TALL = { ...TALL, far: [0.54, 0, 0, 0.3], mid: [0.56, 0.06, 0.3, 0.3], lake: [0.2, 0.035], sun: [0.86, 0.905], band: [0.6, 1.3, 0.12, 0.3], toaster: { x: 0.7, y: 0.45, on: 'tube' }, cool: true };
// halloween: moon its centre (a share of the width, a height) and radius (the sun there too); lake the
// hill's top behind the graves and the graveyard's front; its own paper (a purple night, a dusk)
const HALLOWEEN_LOOK = { band: [5, 1.57, 0.1, 0.3], tint: [0.92, 0.9, 0.98], toneN: [0.34, 0.31, 0.27], toneD: [0.0, -0.1, -0.22], paperN: [[5, 3, 10], [26, 14, 40]], paperD: [[226, 190, 186], [250, 212, 168]] };
const HALLOWEEN_WIDE = { ...WIDE, ...HALLOWEEN_LOOK, far: [0.34, 0, 0, 0.3], lake: [0.32, 0.06], moon: [0.64, 0.57, 0.32], sun: [0.64, 0.57], toaster: { x: 0.585, y: 0.64, on: 'broom' } };
// (in a tall window the code and its panels fill the top two thirds: the moon rises low, the toaster
// flies on its right, clear of them)
const HALLOWEEN_TALL = { ...TALL, ...HALLOWEEN_LOOK, far: [0.22, 0, 0, 0.3], lake: [0.2, 0.04], moon: [0.56, 0.28, 0.2], sun: [0.56, 0.28], toaster: { x: 0.74, y: 0.3, on: 'broom' } };
// the sharks: all water, seen from above (no horizon: the paper's shade runs top to bottom); the
// toaster floats on its ring (a share of the width across, of the height up); the lagoon's paper by
// day, the deep's by night; under a cell's tone, a shark's shadow darkens the day's paper, the
// plankton's glow lights the night's
const SHARKS_LOOK = { far: [0, 0, 0, 0.3], lake: [1, 0], band: [5, 1.57, 0.1, 0.3], tint: [0.78, 0.9, 1.0], toneN: [0.0, 0.2, 0.22], toneD: [-0.09, -0.055, -0.04], paperN: [[3, 9, 22], [6, 20, 42]], paperD: [[112, 200, 208], [148, 216, 212]] };
const SHARKS_WIDE = { ...WIDE, ...SHARKS_LOOK, toaster: { x: 0.7, y: 0.3, on: 'float' } };
const SHARKS_TALL = { ...TALL, ...SHARKS_LOOK, toaster: { x: 0.6, y: 0.15, on: 'float' } };
const LAYOUT = { lake: [WIDE, TALL], sea: [SEA_WIDE, SEA_TALL], fire: [FIRE_WIDE, FIRE_TALL], snow: [SNOW_WIDE, SNOW_TALL], city: [CITY_WIDE, CITY_TALL], garden: [GARDEN_WIDE, GARDEN_TALL], falls: [FALLS_WIDE, FALLS_TALL], halloween: [HALLOWEEN_WIDE, HALLOWEEN_TALL], sharks: [SHARKS_WIDE, SHARKS_TALL] };
const SPEED = [1, 0.5, 0.25, 0.12, 0.2];
// the glyphs the scene draws with (the first, blank, is nothing there)
const GLYPHS = {
  BLANK: ' ', DOT: '.', MID: '·', COMMA: ',', TICK: "'", COLON: ':', DASH: '-', TILDE: '~', EQ: '=', APPROX: '≈', UNDER: '_',
  CARET: '^', SLASH: '/', BACK: '\\', BAR: '|', LP: '(', RP: ')', STAR: '*', PLUS: '+', SMALLO: 'o', BIGO: 'O', AT: '@', PCT: '%',
  VEE: 'v', TRI: '▲', TRIO: '△', LIGHT: '░', MEDIUM: '▒', DARK: '▓', HATCH: '╱', HATCHB: '╲', DBL: '═', LINE: '─',
  SPARK: '✦', BULLET: '•', QUOTE: '"', LT: 'T', LA: 'A', LS: 'S', LESS: '<', MORE: '>', LP2: 'P', LE: 'E', LN: 'N', LH: 'H', LL: 'L', LR: 'R', LI: 'I',
  HASH: '#', DOLLAR: '$', SEMI: ';', SMALLI: 'i', SMALLX: 'x', EIGHT: '8', GRAVE: '`',
};
const SHEET = Object.values(GLYPHS);
const DEFS = Object.keys(GLYPHS).map((k, i) => `#define G_${k} ${i}`).join('\n');
// The jack-o'-lanterns' art, as the shader's constant arrays: each cell the glyph's place on the sheet
// plus 64 times its part (1 its outline, 2 its carved face, 3 its stem, 4 its body)
const PUMPKIN_ART = [[["        _|_        ", "        sss        "], ["    .-'     '-.    ", "    ooobbbbbooo    "], ["  .'  /\\   /\\  '.  ", "  oobbffbbbffbboo  "], [" (       ^       ) ", " obbbbbbbfbbbbbbbo "], ["  \\  \\/\\/\\/\\/\\  /  ", "  obbfffffffffbbo  "], ["   '-._______.-'   ", "   ooooooooooooo   "]], [["    |    ", "    s    "], [" .-' '-. ", " ooobooo "], ["( ▲   ▲ )", "obfbbbfbo"], [" '\\/\\/\\' ", " offfffo "]], [["    |,   ", "    ss   "], [" .-' '-. ", " ooobooo "], ["( o   o )", "obfbbbfbo"], [" '.\\_/.' ", " oofffoo "]]];
function pumpkinArrays() {
  const part = { o: 1, f: 2, s: 3, b: 4 };
  return PUMPKIN_ART.map((rows, k) => {
    const cells = rows.flatMap(([art, roles]) => [...art].map((c, i) => (c === ' ' && roles[i] !== 'b' ? 0 : SHEET.indexOf(c === ' ' ? '\u2591' : c) + 64 * (part[roles[i]] || 0))));
    return `const int PK${k}[${cells.length}] = int[${cells.length}](${cells.join(', ')});`;
  }).join('\n');
}

const VS = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// The scene, a cell at a time: R the glyph (its place on the sheet), G its ink (0-1); and its colour.
const LIB = `#version 300 es
precision highp float;
${DEFS}
uniform vec2 grid, cellPx, view;
uniform float time, wind, glow, night, fly;
uniform vec4 walk;                  // each layer's scroll, in cells: meadow, near, mid, far
uniform float clouds;               // the clouds' drift, in cells
uniform vec4 farL, midL, nearL;     // each range: base, height, how often its peaks come, ink
uniform vec2 lake;                  // the lake: its far shore, its near shore (heights, 0-1)
uniform vec4 rip[4];                // ripples: x (units of the height), y, age (s), strength
uniform vec4 birds;                 // the flock: x of its lead, y, wings up (1) or down (0), on (1)
uniform vec4 shoot;                 // a falling star: x, y where it starts, its age (s), on (1)
uniform vec2 sunAt;                 // where the sun (or the moon) is: x, y (units of the height)
uniform vec4 band;                  // the Milky Way: x at the horizon, tilt, width, the core along it
uniform vec4 car;                   // the city's car: x of its back, -, its colour (0-1), on (1); halloween's broom: the end of its bristles (x, y), -, on
uniform vec4 leap;                  // the falls' fish leaping, halloween's ghost rising: its age (s), which side (-1, 1), which (0-1), on (1)
uniform vec4 moon;                  // halloween's great moon: its centre (units of the height), its radius
uniform vec4 sea;                   // the sea: the beam's turn (radians), the koi's swim (leaping on kicks), the waves' phase (beats), a kick's splash (0-1)
layout(location = 0) out vec4 o;
layout(location = 1) out vec4 oc;
layout(location = 2) out vec4 ot;
uint hu(uvec2 q) { q *= uvec2(1597334673u, 3812015801u); return (q.x ^ q.y) * 1597334673u; }
float h2(vec2 p) { return float(hu(uvec2(ivec2(floor(p)) + 32768))) / 4294967295.0; }
float h1(float x) { return h2(vec2(x, 7.0)); }
float vn(float x) { float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float vn2(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float cw, ch;
bool day;
// (tone: the paper under the glyph lightened at night, cooled by day, 0-1: snow, ice; over: a glyph
// drawn over whatever's there, on its tone: snow falling, rain)
float tone = 0.0, overInk = 0.0;
int over = 0;
vec3 overC = vec3(0.0);
bool solid = false;      // (what the over-glyph passes behind: a sign, a lamp)
// (a tile: the cell filled with a colour under its glyph, how strongly: the sharks' skin, the light's
// net under them)
vec3 tileC = vec3(0.0);
float tileA = 0.0;
void put(int g, float ink, vec3 c) {
  if (over != 0 && !solid) { g = over; ink = overInk; c = overC; }
  o = vec4(float(g) / 255.0, ink, tone, 1.0); oc = vec4(clamp(c, 0.0, 1.0), 1.0); ot = vec4(clamp(tileC, 0.0, 1.0), tileA);
}
vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
// the scene's colours, by night and by day
vec3 P(vec3 n, vec3 d) { return day ? d : n; }

// The middle and far ranges: overlapping peaks, each a triangle (its two sides at their own
// slopes) with a little jaggedness on its edges, the way mountains are drawn in ASCII art. At x:
// the range's top, the apex's x and height of the peak on top there, and that peak's height.
vec4 peak(int i, float x) {
  vec4 L = i == 1 ? midL : farL;
  float salt = i == 1 ? 31.0 : 7.0, Pd = L.z, k0 = floor(x / Pd);
  vec4 best = vec4(-1.0);
  for (int j = -2; j <= 2; j++) {
    float k = k0 + float(j);
    float ax = (k + 0.5 + 0.7 * (h1(k * 1.9 + salt) - 0.5)) * Pd;
    float r = h1(k * 3.7 + salt), hh = L.y * (0.25 + 0.75 * r * r);
    float sl = (i == 1 ? 1.25 : 1.55) * (x < ax ? 0.8 + 0.5 * h1(k * 5.1 + salt) : 0.8 + 0.5 * h1(k * 6.3 + salt));
    float y = L.x + hh - abs(x - ax) * sl;
    if (y > best.x) best = vec4(y, ax, L.x + hh, hh);
  }
  best.x += 0.4 * ch * (vn(x * 47.0 + salt) - 0.5) + 0.25 * ch * (vn(x * 113.0 + salt) - 0.5);
  return best;
}
// The near shore's hills, low and rolling, and their trees: pines, stacked in tiers, and here and
// there one in blossom (a round crown on a trunk). At x: the trees' top there; which tree (its
// centre, base, height, and 1 if in blossom).
float hill(float x) { return nearL.x + nearL.y * vn(x * nearL.z); }
vec4 tree(float x, out float top, out float bottom) {
  float S = cw * 3.4, k0 = floor(x / S);
  top = -1.0; bottom = 9.0;
  vec4 best = vec4(0.0, 0.0, 0.0, -1.0);
  for (int j = -2; j <= 2; j++) {
    float k = k0 + float(j);
    if (h1(k * 9.1) < 0.12) continue;
    float tx = (k + 0.5 + 0.6 * (h1(k * 1.3) - 0.5)) * S;
    float blossom = h1(k * 4.4) < 0.14 ? 1.0 : 0.0;
    float th = blossom > 0.5 ? (0.05 + 0.03 * h1(k * 2.7)) : (0.035 + 0.07 * h1(k * 2.7) * h1(k * 8.3 + 1.0));
    float base = hill(tx);
    float y, b = base;
    if (blossom > 0.5) {
      // a round crown on a trunk: the trunk alone below it
      float rx = th * 0.55, ry = th * 0.36, cy = base + th * 0.62, dx = (x - tx) / rx;
      if (abs(dx) < 1.0) { y = cy + ry * sqrt(1.0 - dx * dx); b = abs(x - tx) < cw * 0.6 ? base : cy - ry * sqrt(1.0 - dx * dx); }
      else y = -1.0;
    } else {
      float hw = th * 0.42, ax = abs(x - tx);
      y = ax < hw ? base + th * (1.0 - ax / hw) : -1.0;
    }
    if (y > top) { top = y; bottom = b; best = vec4(tx, base, th, blossom); }
  }
  return best;
}
// a cloud: a flat-bottomed heap of puffs (signed distance: below 0 inside)
float cloud(vec2 p, vec2 c, float s, float seed) {
  float d = length((p - c) / vec2(2.4, 0.8)) * 0.8 - s;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    vec2 b = c + vec2((fk - 1.5) * 0.9 * s + 0.3 * s * (h1(seed + fk * 3.1) - 0.5), (0.3 + 0.5 * h1(seed + fk * 5.7) + (k == 1 || k == 2 ? 0.4 : 0.0)) * s);
    d = min(d, length(p - b) - s * (0.62 + 0.4 * h1(seed + fk * 7.3)));
  }
  return max(d, (c.y - 0.25 * s) - p.y);
}
// the nearest cloud of a row of them (one a period, now and then a gap); its middle's height in y
float clouds2(vec2 p, float Pd, float y0, float y1, float s0, float s1, float salt, out float cy) {
  float best = 1e9, k0 = floor(p.x / Pd);
  cy = 0.0;
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    if (h1(k * 1.7 + salt) < 0.25) continue;
    vec2 c = vec2((k + 0.25 + 0.5 * h1(k * 2.3 + salt)) * Pd, y0 + (y1 - y0) * h1(k * 4.1 + salt));
    float d = cloud(p, c, s0 + (s1 - s0) * h1(k * 5.9 + salt), k + salt);
    if (d < best) { best = d; cy = c.y; }
  }
  return best;
}
// a shape's outline as ASCII, from which of the cell's 4 neighbours are outside it: the classic
// way clouds are drawn, .-( )-. over (___)
int edge4(bool up, bool dn, bool lf, bool rt) {
  if (up && lf) return G_DOT;
  if (up && rt) return G_DOT;
  if (dn && lf) return G_LP;
  if (dn && rt) return G_RP;
  if (up) return G_DASH;
  if (dn) return G_UNDER;
  if (lf) return G_LP;
  if (rt) return G_RP;
  return 0;
}
// a star's colour as a camera sees it: a few blue-white, most white to cream, the rest pale gold
// and orange (as the worlds' night skies)
vec3 starTint(float k) {
  return k < 0.04 ? vec3(0.69, 0.79, 1.0) : k < 0.17 ? vec3(0.79, 0.86, 1.0) : k < 0.41 ? vec3(0.91, 0.95, 1.0)
       : k < 0.65 ? vec3(1.0, 0.97, 0.93) : k < 0.83 ? vec3(1.0, 0.91, 0.77) : vec3(1.0, 0.84, 0.63);
}
// The Milky Way: a band rising from the horizon at a tilt; across it bright down the middle with a
// faint skirt; clouds of stars along it; dust in lanes and a rift wandering down it; warm at the
// core, blue-white along the arms. Its light here (0-1+), and how warm (0-1).
float galaxy(vec2 p, float horizon, out float warm) {
  warm = 0.0;
  vec2 dir = vec2(cos(band.y), sin(band.y)), nrm = vec2(-dir.y, dir.x);
  vec2 r = p - vec2(band.x, horizon);
  float u = dot(r, dir), v = dot(r, nrm);
  float w = band.z * (0.8 + 0.45 * vn(u * 3.0 + 1.7));
  float x = v / w;
  float prof = 0.88 * exp(-x * x * 1.4) + 0.12 * exp(-x * x * 0.15);
  if (prof < 0.03) return 0.0;
  vec2 q = vec2(u * 7.0, v * 16.0);
  float c1 = fbm(q);
  float lum = prof * (0.25 + 1.6 * c1 * c1);
  float lane = (vn(u * 2.3 + 5.0) - 0.5) * w * 0.9;
  float yy = (v - lane) / (w * (0.2 + 0.18 * vn(u * 4.1 + 2.0)));
  float rift = exp(-yy * yy) * smoothstep(0.1, 0.45, vn(u * 1.3 + 9.0));
  float n = (fbm(q * 1.6 + 3.0) - 0.5) * 3.2;
  float lanes = pow(max(1.0 - abs(n), 0.0), 4.0) * exp(-x * x * 2.0);
  float dust = clamp(lanes * 0.9 + rift, 0.0, 1.0);
  float cu = (u - band.w) / 0.16;
  warm = exp(-cu * cu - x * x * 0.5);
  return lum * (1.0 + 1.6 * warm) * (1.0 - 0.92 * dust);
}
// a pine's half width at u (0 at its foot, 1 at its tip): tiers of branches, each widest at its
// skirt, overhanging the tier below
float pineW(float u, float w0, float tiers) {
  return u < 0.0 || u > 1.0 ? -1.0 : w0 * (1.0 - u) * (1.0 - 0.38 * fract(u * tiers));
}
// The sky, for every scene: birds or a falling star, the sun and its rays or the moon and its halo, the
// stars and the Milky Way (above horizon), the airglow (above glowAt), the clouds; else nothing.
void sky(vec2 cell, float X, float Y, float h0, float horizon, float glowAt) {
  vec2 Pc = vec2(X, Y);
  vec2 sun = sunAt;
  float R = day ? 0.062 : 0.07;
  if (birds.w > 0.5) {
    for (int k = 0; k < 7; k++) {
      float side = k == 0 ? 0.0 : (k % 2 == 1 ? 1.0 : -1.0), rank = float((k + 1) / 2);
      vec2 b = vec2(birds.x + rank * 0.03, birds.y + side * rank * 0.02 + 0.003 * sin(time * 2.0 + float(k) * 1.7));
      if (abs(X - b.x) < cw * 0.5 && abs(Y - b.y) < ch * 0.5) { put(birds.z > 0.5 ? G_VEE : G_DASH, 1.0, P(rgb(200.0, 200.0, 230.0), rgb(58.0, 48.0, 72.0))); return; }
    }
  }
  #define INSUN(p) (length((p) - sun) < R)
  if (day) {
    // the sun: a disk filled from its rim in, and its rays breathing with the loudness
    if (INSUN(Pc)) {
      int g = edge4(!INSUN(Pc + vec2(0.0, ch)), !INSUN(Pc - vec2(0.0, ch)), !INSUN(Pc - vec2(cw, 0.0)), !INSUN(Pc + vec2(cw, 0.0)));
      if (g == G_DOT && Pc.y < sun.y) g = G_TICK;
      float rr = length(Pc - sun) / R;
      if (g == 0) g = rr > 0.7 ? G_SMALLO : rr > 0.4 ? G_BIGO : G_AT;
      put(g, 1.0, mix(rgb(255.0, 210.0, 120.0), rgb(255.0, 140.0, 70.0), rr));
      return;
    }
    vec2 ds = Pc - sun;
    float rs = length(ds);
    if (rs > R * 1.35 && rs < R * (1.7 + 0.7 * glow)) {
      float an = atan(ds.y, ds.x), k = an / (3.14159265 / 4.0), off = abs(k - floor(k + 0.5));
      if (off * rs < 0.55 * cw) { int q = int(mod(floor(k + 0.5) + 8.0, 4.0)); put(q == 0 ? G_DASH : q == 2 ? G_BAR : q == 1 ? G_SLASH : G_BACK, 1.0, rgb(255.0, 170.0, 90.0)); return; }
    }
  } else {
    // the moon, full: its face in glyphs by how bright it is there, the seas darker, the limb a
    // little dimmer; a halo round it
    float rmoon = length(Pc - sun) / R;
    if (rmoon < 1.0) {
      vec2 mp = (Pc - sun) / R;
      float sea = smoothstep(0.45, 0.7, fbm(mp * 2.2 + 4.0));
      float b = (1.0 - 0.35 * rmoon * rmoon) * (1.0 - 0.45 * sea);
      int g = b > 0.82 ? G_AT : b > 0.68 ? G_BIGO : b > 0.55 ? G_PCT : b > 0.45 ? G_SMALLO : G_COLON;
      put(g, 1.0, mix(rgb(150.0, 152.0, 178.0), rgb(252.0, 246.0, 220.0), b));
      return;
    }
    float rm = rmoon;
    if (rm > 1.15 && rm < 2.6 && h0 < 0.5 * exp(-(rm - 1.15) * 1.6)) { put(rm < 1.6 ? G_MID : G_DOT, 0.8, rgb(150.0, 160.0, 205.0) * (1.25 - 0.3 * rm)); return; }
    // a falling star: a bright head, its trail fading behind it, down and to the left
    if (shoot.w > 0.5 && shoot.z < 1.2) {
      vec2 dir = normalize(vec2(-1.0, -0.42)), head = shoot.xy + dir * shoot.z * 0.55;
      vec2 rel = Pc - head;
      float along = dot(rel, -dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
      float fade = smoothstep(1.2, 0.7, shoot.z), len = 0.22 * min(1.0, shoot.z * 4.0);
      if (across < ch * 0.55 && along > -cw && along < len) {
        float a = (1.0 - along / (len + 1e-3)) * fade;
        if (a > 0.06) { put(along < cw ? G_SPARK : (a > 0.55 ? G_DBL : a > 0.3 ? G_LINE : G_DASH), 0.35 + 0.65 * a, mix(rgb(150.0, 170.0, 230.0), rgb(255.0, 252.0, 240.0), a)); return; }
      }
    }
    // stars: their brightness drawn from a power law (each step fainter, about three times as
    // many), so a few stand out and most are a fine dust; thicker along the Milky Way; twinkling
    float warm;
    float gal = galaxy(Pc, horizon, warm);
    float sp = h2(cell + 91.0);
    float chance = 0.035 * (1.0 + 4.0 * min(1.0, gal));
    if (Y > horizon + 0.02 && sp < chance) {
      float b = min(4.0, 0.22 * pow(max(h2(cell + 33.0), 1e-3), -0.83));
      float tw = 0.75 + 0.25 * sin(time * (0.8 + 2.4 * h2(cell)) + sp * 60.0) * (0.5 + glow);
      int g = b < 0.4 ? G_DOT : b < 0.75 ? G_MID : b < 1.4 ? G_PLUS : b < 2.6 ? G_STAR : G_SPARK;
      put(g, clamp((0.35 + 0.3 * b) * tw, 0.0, 1.0), starTint(h2(cell + 55.0)));
      return;
    }
    // the Milky Way's light: a haze of the faintest dots, warm at the core, dark in its lanes
    if (Y > horizon + 0.01 && gal > 0.05) {
      float dens = smoothstep(0.08, 1.0, gal) * 0.95;
      if (h0 < dens) {
        int g = gal > 0.7 && h0 < dens * 0.4 ? G_COLON : (h0 < dens * 0.65 ? G_MID : G_DOT);
        put(g, clamp(0.42 + 0.45 * gal, 0.0, 1.0), mix(rgb(160.0, 182.0, 228.0), rgb(244.0, 208.0, 162.0), warm));
        return;
      }
    }
    // airglow: a faint green haze just over the far peaks
    float ag = Y - glowAt;
    if (ag > 0.0 && ag < 0.12 && h0 < 0.06 * (1.0 - ag / 0.12)) { put(G_DOT, 0.5, rgb(70.0, 150.0, 120.0)); return; }
  }
  // clouds: shaded heaps of puffs, drifting, their outlines drawn; a second, smaller, paler row
  // further off (at night only a few, dim)
  for (int pass = 0; pass < 2; pass++) {
    float Pd = pass == 0 ? 0.7 : 0.42, y0 = pass == 0 ? 0.68 : 0.58, y1 = pass == 0 ? 0.9 : 0.7, s0 = pass == 0 ? 0.028 : 0.014, s1 = pass == 0 ? 0.048 : 0.022, salt = pass == 0 ? 0.0 : 50.0;
    if (!day) { Pd *= 1.6; }
    vec2 p = vec2((cell.x + clouds * (pass == 0 ? 1.0 : 0.5)) * cw, Y);
    float cy;
    #define INC(q) (clouds2((q), Pd, y0, y1, s0, s1, salt, cy) < 0.0)
    if (INC(p)) {
      if (!day) { put(h0 < 0.18 ? G_DOT : 0, 0.45, rgb(84.0, 92.0, 136.0)); return; }
      int g = edge4(!INC(p + vec2(0.0, ch)), !INC(p - vec2(0.0, ch)), !INC(p - vec2(cw, 0.0)), !INC(p + vec2(cw, 0.0)));
      float under = Y - cy;                       // below the middle: shaded
      vec3 c = g != 0 ? rgb(120.0, 128.0, 168.0) : mix(rgb(196.0, 202.0, 224.0), rgb(150.0, 158.0, 192.0), smoothstep(0.0, -0.03, under));
      if (g == 0) g = under < -0.012 ? G_LIGHT : (h0 < 0.25 ? G_DOT : 0);
      if (g != 0) { put(g, (day ? 0.85 : 0.55) * (pass == 0 ? 1.0 : 0.65), c); return; }
      put(0, 0.0, vec3(0.0));
      return;
    }
  }
  put(0, 0.0, vec3(0.0));
}
`;

// The lake: mountains, a shore of pines and blossom, the lake and a meadow (the scenery's first).
const LAKE = `
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  // where the light comes from (the sun by day, the moon by night): its side of each peak is lit
  float lightX = sunAt.x;

  // --- fireflies, over the meadow and the shore at night, wandering and blinking (more of them lit
  // when the hats are busy)
  if (!day && Y < lake.x + 0.03) {
    for (int k = 0; k < 14; k++) {
      float fk = float(k);
      vec2 f = vec2(h1(fk * 3.1) * view.x / H + 0.05 * sin(time * (0.21 + 0.1 * h1(fk)) + fk * 2.0),
                    lake.y + (lake.x - lake.y + 0.02) * h1(fk * 5.7) * 0.7 + 0.02 * sin(time * (0.33 + 0.2 * h1(fk * 1.9)) + fk));
      if (f.y > lake.y && f.y < lake.x - 0.01) f.y = lake.y - 0.015 * h1(fk * 2.2);  // (not over the water)
      float b = 0.5 + 0.5 * sin(time * (1.3 + 1.5 * h1(fk * 4.4)) + fk * 7.0);
      b = smoothstep(0.35, 1.0, b) * (0.35 + 0.65 * fly);
      if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5) {
        if (b > 0.08) { put(b > 0.5 ? G_BULLET : G_MID, 0.45 + 0.55 * b, rgb(255.0, 230.0, 128.0)); return; }
      } else if (b > 0.55 && abs(X - f.x) < cw * 1.5 && abs(Y - f.y) < ch * 1.2) { put(G_DOT, 0.5 * b, rgb(255.0, 214.0, 110.0)); return; }
    }
  }

  // --- the meadow, in front: tufts of grass, thicker toward the bottom, flowers here and there
  float gx = cell.x + walk.x;
  float ground = lake.y + 0.008 * (vn(gx * 0.05) - 0.5);
  vec3 grass = P(rgb(36.0, 104.0, 70.0), rgb(56.0, 124.0, 58.0)), tip = P(rgb(98.0, 180.0, 118.0), rgb(104.0, 170.0, 74.0));
  if (Y < ground + 2.0 * ch) {
    float near = clamp((ground - Y) / max(ground, 1e-3), 0.0, 1.0);    // 0 at the shore, 1 at the bottom
    float tc0 = floor(gx / 3.0), slot = gx - tc0 * 3.0;
    float th = h2(vec2(tc0, row) + 3.0);
    float lean = wind * sin(time * 1.1 + tc0 * 0.57 + row * 0.21);
    int g = 0; vec3 c = grass; float ink = 0.75 + 0.25 * near;
    if (Y < ground && th < 0.1 + 0.45 * near) {
      float fl = h2(vec2(tc0, row) + 8.0);
      if (fl < 0.09) {
        // a flower on its stem, in one of the meadow's colours
        float pick = h2(vec2(tc0, row) + 10.0);
        vec3 fc = pick < 0.45 ? P(rgb(255.0, 122.0, 184.0), rgb(232.0, 70.0, 82.0)) : pick < 0.8 ? P(rgb(255.0, 214.0, 122.0), rgb(248.0, 196.0, 52.0)) : P(rgb(226.0, 226.0, 255.0), rgb(255.0, 255.0, 255.0));
        g = slot == 1.0 ? (pick < 0.6 ? G_STAR : G_SMALLO) : slot == 0.0 ? G_BACK : G_SLASH;
        c = slot == 1.0 ? fc : grass;
        ink = 1.0;
      } else {
        g = slot == 0.0 ? (lean > 0.45 ? G_BAR : G_BACK) : slot == 1.0 ? (abs(lean) > 0.45 ? (lean > 0.0 ? G_SLASH : G_BACK) : G_BAR) : (lean < -0.45 ? G_BAR : G_SLASH);
        c = mix(grass, tip, h0 * 0.7) * (0.65 + 0.35 * near);
      }
    } else if (Y < ground && h0 < 0.12 + 0.3 * near) { g = h0 < 0.06 ? G_COMMA : (h0 < 0.1 ? G_QUOTE : G_TICK); c = grass * (0.6 + 0.3 * near); }
    else if (Y >= ground && Y < ground + ch && h1(gx * 1.3) < 0.4) { g = h1(gx * 2.1) < 0.5 ? G_COMMA : G_TICK; c = tip; }
    if (g != 0 || Y < ground) { put(g, ink, c); return; }
  }

  // each layer's own scroll, in whole cells
  float xs[3] = float[3]((cell.x + walk.y) * cw, (cell.x + walk.z) * cw, (cell.x + walk.w) * cw);

  // --- the lake: quiet strokes, everything above mirrored in it (darker, broken by the water), the
  // light's path across it, ripples on kicks
  if (Y < lake.x) {
    float depth = (lake.x - Y) / (lake.x - lake.y);
    float wob = (0.002 + 0.005 * depth) * sin(row * 2.1 + time * 1.2);
    float Ym = 2.0 * lake.x - Y;
    int g = 0; vec3 c = P(rgb(40.0, 72.0, 140.0), rgb(70.0, 130.0, 190.0)); float ink = 0.0;
    float streak = vn2(vec2((X + time * 0.003) * 12.0, row));
    bool hit = false;
    // the trees' reflections
    float tt, tb;
    vec4 tr = tree(xs[0] + wob, tt, tb);
    if (!hit && Ym < tt && Ym > max(tb, hill(xs[0] + wob))) {
      hit = true;
      if (streak > 0.22) { g = streak > 0.6 ? G_APPROX : G_TILDE; c = tr.w > 0.5 ? P(rgb(150.0, 70.0, 110.0), rgb(200.0, 110.0, 150.0)) : P(rgb(20.0, 70.0, 52.0), rgb(40.0, 100.0, 60.0)); ink = 0.85; }
    }
    if (!hit && Ym < hill(xs[0] + wob) + 0.5 * ch) {
      hit = true;
      if (streak > 0.35) { g = G_EQ; c = P(rgb(16.0, 46.0, 38.0), rgb(40.0, 90.0, 56.0)); ink = 0.8; }
    }
    for (int i = 1; i < 3 && !hit; i++) {
      float t0 = peak(i, xs[i] + wob).x;
      if (Ym < t0 + 0.5 * ch) {
        hit = true;
        bool edge = abs(Ym - t0) < ch * 0.8;
        if (streak > (edge ? 0.3 : 0.72)) {
          g = edge ? G_TILDE : G_LINE;
          c = i == 1 ? P(rgb(84.0, 76.0, 140.0), rgb(100.0, 110.0, 160.0)) : P(rgb(56.0, 62.0, 110.0), rgb(140.0, 160.0, 196.0));
          ink = edge ? 0.85 : 0.6;
        }
      }
    }
    if (!hit && streak > 0.87) { g = G_DASH; ink = 0.45; c = P(rgb(36.0, 58.0, 110.0), rgb(90.0, 140.0, 196.0)); }
    // the path of the light: glints that come and go
    float path = abs(X - sunAt.x) - 0.01 - 0.06 * depth;
    if (path < 0.0) {
      float tw = h2(vec2(cell.x, row) + floor(time * 2.0));
      if (tw > (day ? 0.58 : 0.45)) { g = tw > 0.93 ? G_STAR : tw > 0.75 ? G_DBL : G_DASH; c = P(rgb(242.0, 236.0, 208.0), rgb(255.0, 210.0, 140.0)); ink = 0.95; }
    }
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.015 + q.z * 0.08, d = length(vec2(X - q.x, (Y - q.y) * 5.0)) - rad;
      float a = exp(-q.z * 1.2) * q.w;
      if (abs(d) < cw * 0.8 && a > 0.08) {
        float side = (X - q.x) / max(rad, 1e-3);
        g = side < -0.85 ? G_LP : side > 0.85 ? G_RP : G_DASH;
        c = P(rgb(150.0, 180.0, 230.0), rgb(255.0, 255.0, 255.0));
        ink = max(ink, 0.35 + 0.65 * a);
      }
    }
    put(g, ink, c);
    return;
  }

  // --- the shore: its trees, then the low hills behind them
  {
    float lx = xs[0], top, bot;
    vec4 tr = tree(lx, top, bot);
    if (Y < top && Y > bot) {
      float u = (Y - tr.y) / tr.z;                 // up the tree, 0-1
      bool lit = (lx - tr.x) * (lightX - tr.x) > 0.0;
      if (tr.w > 0.5) {
        // a tree in blossom: its crown speckled with flowers, lighter on top; its trunk below
        if (u < 0.3 && abs(lx - tr.x) < cw * 0.6) { put(G_BAR, 0.9, P(rgb(110.0, 76.0, 80.0), rgb(110.0, 76.0, 60.0))); return; }
        float k = h2(vec2(floor(lx / cw), row) + 21.0);
        int g = k < 0.3 ? G_STAR : k < 0.55 ? G_PCT : k < 0.75 ? G_SMALLO : k < 0.9 ? G_AT : G_PLUS;
        vec3 c = mix(P(rgb(200.0, 96.0, 150.0), rgb(220.0, 96.0, 150.0)), P(rgb(255.0, 196.0, 226.0), rgb(255.0, 170.0, 200.0)), clamp(u - 0.3 + (lit ? 0.25 : -0.1), 0.0, 1.0));
        put(g, 0.95, c);
        return;
      }
      // a pine: tiers of branches, its tip a triangle; the edges drawn as slashes, the lit side light
      float ax = abs(lx - tr.x), hw = tr.z * 0.42 * (1.0 - u);
      float tier = fract(u * (2.0 + floor(tr.z * 60.0)));
      vec3 dark = P(rgb(22.0, 74.0, 56.0), rgb(36.0, 96.0, 58.0)), light = P(rgb(74.0, 166.0, 112.0), rgb(98.0, 172.0, 88.0));
      int g;
      if (u > 0.86) g = G_TRI;
      else if (ax > hw - cw * 0.9) g = lx < tr.x ? G_SLASH : G_BACK;
      else g = tier < 0.5 ? G_CARET : (h2(vec2(floor(lx / cw), row) + 4.0) < 0.5 ? G_TRI : G_CARET);
      put(g, 0.95, mix(dark, light, lit ? 0.75 - 0.3 * u : 0.15));
      return;
    }
    float hl = hill(lx);
    if (Y < hl) {
      // the hills under the trees: dark, in shade
      float k = h2(vec2(floor(lx / cw), row) + 2.0);
      int g = day ? (k < 0.3 ? G_MEDIUM : k < 0.65 ? G_COLON : G_DOT) : (k < 0.45 ? G_DARK : k < 0.8 ? G_MEDIUM : G_COLON);
      put(g, 0.7, P(rgb(14.0, 40.0, 34.0), rgb(36.0, 86.0, 52.0)));
      return;
    }
  }

  // --- mist: low bands drifting along the foot of each range, in front of it (thicker at night)
  {
    float drift = fbm(vec2(X * 4.0 + time * 0.012, Y * 26.0));
    float m = exp(-pow((Y - (farL.x + 0.03)) / 0.026, 2.0)) * 0.9 + exp(-pow((Y - (farL.x + 0.11)) / 0.018, 2.0)) * 0.45;
    m *= (0.15 + 0.85 * smoothstep(0.3, 0.7, drift)) * (day ? 0.8 : 1.0);
    if (h0 < m * 0.6) { put(h0 < m * 0.3 ? G_LINE : (h0 < m * 0.55 ? G_DASH : G_TILDE), 0.55 + 0.4 * m, P(rgb(118.0, 126.0, 172.0), rgb(150.0, 158.0, 190.0))); return; }
  }

  // --- the ranges, the middle then the far one. An outline wherever the edge runs through the
  // cell (one glyph thick: where it crosses the cell's middle column, or on a steep stretch its
  // middle row); the snow in triangles; the faces turned to the light hatched in slashes, those
  // turned away blocked in shade (the middle range), or a sparse stipple (the far one, in haze)
  for (int i = 1; i < 3; i++) {
    float lx = xs[i];
    float tl = peak(i, lx - 0.5 * cw).x, tr = peak(i, lx + 0.5 * cw).x;
    vec4 pk = peak(i, lx);
    float tc = pk.x;
    float hi = max(max(tl, tr), tc);
    if (Y - 0.5 * ch > hi) continue;
    vec2 cellW = vec2(floor(lx / cw), row);
    bool across = abs(tc - Y) <= 0.5 * ch, down = (Y - tl) * (Y - tr) <= 0.0;
    vec3 ridge = i == 1 ? P(rgb(196.0, 196.0, 244.0), rgb(44.0, 46.0, 80.0)) : P(rgb(116.0, 126.0, 186.0), rgb(86.0, 100.0, 146.0));
    if (across || down) {
      float rise = (tr - tl) / ch, lo = Y - 0.5 * ch, hi2 = Y + 0.5 * ch;
      bool top = tc > tl + 0.15 * ch && tc > tr + 0.15 * ch;
      bool stays = tl >= lo && tl < hi2 && tr >= lo && tr < hi2;
      int g;
      if (top && hi2 > tc) g = G_CARET;
      else if (stays && abs(rise) < 0.9) g = (tl + tr) * 0.5 < Y ? G_UNDER : G_DASH;
      else g = rise > 0.0 ? G_SLASH : G_BACK;
      put(g, 1.0, ridge);
      return;
    }
    float d = tc - Y;
    // which face: the one on the light's side of the apex is lit (the line between leaning a little)
    bool lit = (lx - (pk.y + (pk.z - Y) * 0.2)) * (lightX - pk.y) > 0.0;
    float snowD = pk.w > 0.1 * (i == 2 ? farL.y : midL.y) / 0.4 ? (0.32 + 0.1 * (vn(lx * 31.0) - 0.5)) * pk.w : 0.0;
    snowD = max(0.0, snowD - (pk.z - tc));
    bool snow = d < snowD;
    float st = h0, fall = 1.0 - smoothstep(0.02, 0.35, d);      // (nearer the ridge, denser)
    float haze = smoothstep(0.0, 0.25, (Y - farL.x) / max(1e-3, (i == 1 ? midL.y : farL.y)));
    if (i == 2) {
      // the far range: pale in the haze, a sparse stipple, its snow catching the light
      if (snow) { if (st < (lit ? 0.55 : 0.3)) { put(lit ? G_TRIO : G_MID, 0.8, P(rgb(176.0, 186.0, 232.0), rgb(130.0, 142.0, 186.0))); return; } }
      else if (st < (lit ? 0.22 : 0.4) * (0.4 + 0.6 * haze)) { put(lit ? G_DOT : G_COLON, 0.75, P(rgb(64.0, 70.0, 120.0), rgb(112.0, 128.0, 168.0))); return; }
      put(0, 0.0, vec3(0.0));
      return;
    }
    // the middle range
    if (snow) {
      if (snowD > ch && abs(d - snowD) < 0.5 * ch) { put(mod(cellW.x, 2.0) < 1.0 ? G_SLASH : G_BACK, 0.9, P(rgb(200.0, 208.0, 245.0), rgb(200.0, 206.0, 230.0))); return; }
      put(lit ? (st < 0.5 ? G_TRI : G_TRIO) : (st < 0.6 ? G_LIGHT : G_TRIO), 0.95, lit ? P(rgb(232.0, 238.0, 255.0), rgb(120.0, 132.0, 182.0)) : P(rgb(150.0, 162.0, 214.0), rgb(92.0, 100.0, 150.0)));
      return;
    }
    if (lit) {
      // hatched: slashes along the slope, woven (every other one turned) and thinning toward the foot
      // (by day, on paper, bolder: thin strokes read as grey there)
      float keep = day ? 0.8 + 0.2 * fall : 0.55 + 0.4 * fall;
      if (st < keep) put(day ? (mod(cellW.x + cellW.y, 2.0) < 1.0 ? G_SLASH : G_HATCH) : (mod(cellW.x + cellW.y, 2.0) < 1.0 ? G_HATCH : (st < 0.3 ? G_SLASH : G_HATCH)), day ? 1.0 : 0.85, P(rgb(140.0, 134.0, 204.0), rgb(66.0, 74.0, 128.0)) * (0.75 + 0.25 * fall));
      else put(0, 0.0, vec3(0.0));
      return;
    }
    // in shade: blocks under the ridge, thinning down the face to a stipple
    int g = day ? (d < 0.03 ? G_DARK : d < 0.07 ? G_MEDIUM : d < 0.14 ? (st < 0.8 ? G_LIGHT : G_COLON) : (st < 0.6 ? G_COLON : G_DOT))
                : (d < 0.022 ? G_MEDIUM : d < 0.05 ? (st < 0.7 ? G_LIGHT : G_COLON) : d < 0.13 ? (st < 0.55 ? G_COLON : st < 0.8 ? G_DOT : 0) : (st < 0.3 ? G_DOT : 0));
    put(g, 0.85, P(rgb(84.0, 70.0, 140.0), rgb(58.0, 60.0, 104.0)) * (0.75 + 0.25 * fall));
    return;
  }

  sky(cell, X, Y, h0, farL.x, farL.x + farL.y * 0.2);
}`;

// The sea: a lighthouse on a cliff, waves rolling in to a beach, islands far out (lake.x: the
// horizon; lake.y: the shore). The beam turns once every 2 bars and flashes at you on the bar's
// first beat; the waves roll in one every 2 beats; a kick throws foam up the beach.
const SEA = `
// the headland's top at x: rising from the right edge to a crown under the lighthouse, then a
// rounded shoulder falling to the sea about a third of the way in; jagged a little (on the right,
// out from under the code)
float cliffTop(float x, float aspect) {
  float a = 1.0 - x / aspect;
  float crown = lake.x + mix(0.1, 0.12, clamp((aspect - 0.56) / 1.22, 0.0, 1.0));
  float rise = mix(0.72, 1.0, smoothstep(-0.05, 0.16, a));
  float fall = 1.0 - smoothstep(0.17, 0.35, a);
  float top = lake.y + (crown - lake.y) * rise * pow(fall, 0.6);
  return top + 0.014 * (vn(x * 23.0) - 0.5) * fall + 0.007 * (vn(x * 91.0) - 0.5);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, horizon = lake.x, shore = lake.y;

  // --- a crab walking the beach sideways, a step a beat, turning every 16 beats; its claws up on
  // each beat
  {
    float beat = floor(sea.z), leg = mod(beat, 32.0), stepX = leg < 16.0 ? leg : 32.0 - leg;
    float c0 = floor((0.12 + 0.08 * clamp((aspect - 0.56) / 1.22, 0.0, 1.0)) * aspect / cw) + stepX, r0 = floor((1.0 - (shore - 0.05)) / ch);
    float o = cell.x - c0;
    if (row == r0 && o >= 0.0 && o < 7.0) {
      bool up = fract(sea.z) < 0.3;
      int g = o == 0.0 || o == 6.0 ? (up ? G_CARET : G_VEE) : o == 1.0 ? G_LP : o == 5.0 ? G_RP : o == 3.0 ? G_UNDER : G_SMALLO;
      solid = true;
      put(g, 1.0, P(rgb(255.0, 110.0, 90.0), rgb(220.0, 70.0, 50.0)));
      return;
    }
  }
  // --- the beach, in front: sand in dots, darker where it's wet, a shell here and there
  float wash = shore + 0.012 + 0.006 * sin(X * 23.0 + time * 0.9) + 0.01 * sea.w;   // how far up the sea comes
  if (Y < shore) {
    float wet = smoothstep(shore - 0.03, shore, Y);
    int g = 0;
    if (h0 < 0.012) g = h2(cell + 4.0) < 0.5 ? G_SMALLO : G_STAR;                       // shells
    else if (h0 < 0.1 + 0.15 * wet) g = h0 < 0.05 ? G_DOT : (h0 < 0.08 ? G_COLON : G_COMMA);
    put(g, 0.8, mix(P(rgb(84.0, 80.0, 112.0), rgb(186.0, 158.0, 108.0)), P(rgb(52.0, 56.0, 92.0), rgb(140.0, 120.0, 90.0)), wet) * (h0 < 0.012 ? 1.3 : 1.0));
    return;
  }

  // --- the cliff, on the right: rock hatched where the light falls and blocked in shade, grass along
  // its top; the lighthouse on it
  float ct = cliffTop(X, aspect);
  float wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);       // (0 in a tall window, 1 in a wide one)
  float lx = 0.84 * aspect, lb = cliffTop(lx, aspect), LH = mix(0.11, 0.17, wide);
  vec2 lamp = vec2(lx, lb + LH + 0.016);
  // the lighthouse: a tapering tower, white with red bands, a railed gallery, the lantern, its roof
  {
    float u = (Y - lb) / LH;
    if (u > 0.0 && u < 1.0) {
      float hw = mix(0.017, 0.011, u) * mix(0.85, 1.0, wide);
      if (abs(X - lx) < hw) {
        bool edge = abs(X - lx) > hw - cw;
        bool band = fract(u * 4.2) < 0.38;
        vec3 c = band ? P(rgb(190.0, 70.0, 80.0), rgb(200.0, 60.0, 60.0)) : P(rgb(206.0, 210.0, 232.0), rgb(120.0, 120.0, 140.0));
        put(edge ? (X < lx ? G_SLASH : G_BACK) : G_DARK, 1.0, c * (X < lx ? 1.0 : 0.82));
        return;
      }
    }
    float top = lb + LH;
    if (Y >= top && Y < top + ch && abs(X - lx) < 0.022) { put(G_DBL, 1.0, P(rgb(150.0, 152.0, 176.0), rgb(60.0, 60.0, 80.0))); return; }
    if (Y >= top + ch && Y < top + 0.032 && abs(X - lx) < 0.012) {
      put(abs(X - lx) > 0.012 - cw ? G_BAR : G_DARK, 1.0, P(rgb(255.0, 226.0, 140.0), rgb(255.0, 196.0, 90.0)) * (day ? 0.9 : 0.85 + 0.15 * glow));
      return;
    }
    if (Y >= top + 0.032 && Y < top + 0.032 + ch * 1.2 && abs(X - lx) < 0.014 - (Y - top - 0.032) * 0.8) { put(G_CARET, 1.0, P(rgb(110.0, 60.0, 70.0), rgb(90.0, 40.0, 40.0))); return; }
  }
  if (Y < ct) {
    float d = ct - Y;
    // grass along the top, a flower here and there
    if (d < ch * 1.6) { put(h0 < 0.06 ? G_STAR : (h0 < 0.55 ? G_QUOTE : G_COMMA), 0.9, h0 < 0.06 ? P(rgb(255.0, 214.0, 122.0), rgb(232.0, 70.0, 82.0)) : P(rgb(60.0, 120.0, 84.0), rgb(70.0, 130.0, 60.0))); return; }
    // rocks and foam where it meets the sea
    if (Y < shore + 0.025 && X < 0.8 * aspect) {
      float fo = smoothstep(shore + 0.025, shore, Y) * (0.5 + 0.5 * sea.w);
      if (h0 < fo * 0.6) { put(h0 < fo * 0.3 ? G_BULLET : G_TILDE, 0.9, P(rgb(206.0, 218.0, 246.0), rgb(110.0, 140.0, 190.0))); return; }
    }
    // the face: strata (darker lines across it, wavering), the part turned to the light hatched, the
    // rest in shade (blocks under the top, thinning down)
    float strata = fract(Y * 46.0 + 0.6 * vn(X * 17.0));
    if (strata < 0.13 && h0 < (day ? 0.45 : 0.8)) { put(day ? G_DASH : G_LINE, 0.8, P(rgb(40.0, 34.0, 66.0), rgb(110.0, 98.0, 112.0))); return; }
    // (lit where the slope falls toward the light, on the left; a little way down from the top
    // whatever the slope, the face is in shade)
    float slope = cliffTop(X + cw, aspect) - cliffTop(X - cw, aspect);
    bool lit = slope > 0.004 && d < 0.09;
    float down = smoothstep(0.03, 0.22, d);           // (0 under the top, 1 far down the face)
    int g = lit ? (mod(cell.x + row, 2.0) < 1.0 ? G_HATCH : G_SLASH)
          : day ? (h0 < 0.35 - 0.2 * down ? G_COLON : (h0 < 0.55 - 0.25 * down ? G_DOT : 0))
          : (d < 0.03 ? G_MEDIUM : (h0 < 0.5 - 0.25 * down ? G_LIGHT : (h0 < 0.8 - 0.3 * down ? G_COLON : G_DOT)));
    put(g, 0.85, lit ? P(rgb(132.0, 122.0, 176.0), rgb(110.0, 100.0, 124.0)) : P(rgb(62.0, 52.0, 96.0), rgb(84.0, 74.0, 96.0)) * (1.0 - 0.3 * smoothstep(0.03, 0.2, d)));
    return;
  }

  // --- a buoy out in the bay, bobbing on the beats, its light blinking red on each beat at night
  {
    float bx = floor((0.22 + 0.06 * wide) * aspect / cw), by = floor((1.0 - (shore + (horizon - shore) * 0.35)) / ch) + (fract(sea.z * 0.5) < 0.5 ? 0.0 : 1.0);
    if (cell.x == bx && (row == by || row == by - 1.0 || row == by - 2.0)) {
      vec3 red = P(rgb(230.0, 70.0, 80.0), rgb(210.0, 50.0, 50.0));
      if (row == by) { put(G_UNDER, 1.0, red * 0.8); return; }
      if (row == by - 1.0) { put(G_DARK, 1.0, red); return; }
      bool lit = !day && fract(sea.z) < 0.25;
      put(lit ? G_STAR : G_CARET, 1.0, lit ? rgb(255.0, 120.0, 120.0) : red);
      return;
    }
  }
  // --- a sailboat on the horizon by day; at night a ship's lights going by
  {
    float sx = fract(time * 0.0035 + 0.3) * (aspect + 0.3) - 0.15, c0 = floor(sx / cw), r0 = floor((1.0 - horizon) / ch);
    float o = cell.x - c0;
    if (day) {
      if (row == r0 && o >= 0.0 && o < 4.0) { put(o == 0.0 ? G_BACK : (o == 3.0 ? G_SLASH : G_UNDER), 0.9, rgb(120.0, 80.0, 60.0)); return; }
      if (row == r0 - 1.0 && (o == 1.0 || o == 2.0)) { put(o == 1.0 ? G_BAR : G_BACK, 1.0, o == 1.0 ? rgb(110.0, 90.0, 80.0) : rgb(200.0, 96.0, 70.0)); return; }
      if (row == r0 - 2.0 && (o == 1.0 || o == 2.0)) { put(o == 1.0 ? G_BAR : G_BACK, 1.0, o == 1.0 ? rgb(110.0, 90.0, 80.0) : rgb(200.0, 96.0, 70.0)); return; }
    } else if (row == r0 && o >= 0.0 && o < 6.0) {
      vec3 c = o == 0.0 ? rgb(255.0, 80.0, 80.0) : (o == 5.0 ? rgb(90.0, 255.0, 140.0) : rgb(255.0, 226.0, 160.0));
      if (o == 0.0 || o == 5.0 || h1(o + 3.0) < 0.7) { put(G_MID, 0.95, c); return; }
    }
  }
  // --- the sea: waves rolling in, in perspective (crests a fixed distance apart, so closer together
  // toward the horizon, too fine to tell apart out there), foam where they break, the light's path
  if (Y < horizon) {
    float dn = clamp((horizon - Y) / (horizon - shore), 0.001, 1.0);
    float D = 1.0 / dn;
    float per = 0.55;
    float rowD = ch * (horizon - shore) / pow(horizon - Y, 2.0);
    float w = (D + 0.12 * sin(X * 11.0 / (0.4 + D) + D * 2.3)) / per + sea.z * 0.5;
    float f = fract(w), hw = min(0.5, 0.5 * rowD / per + 0.06);
    // (each crest broken into strokes, shorter further out)
    bool crest = min(f, 1.0 - f) < hw && vn(X * (24.0 + 70.0 * (1.0 - dn)) + floor(w) * 7.3) > 0.42 - 0.2 * dn;
    int g = 0; vec3 c = P(rgb(26.0, 46.0, 96.0), rgb(80.0, 140.0, 196.0)); float ink = 0.6;
    if (Y < wash) { g = h0 < 0.5 ? G_TILDE : (h0 < 0.8 ? G_BULLET : G_MID); c = P(rgb(214.0, 226.0, 250.0), rgb(120.0, 150.0, 196.0)); ink = 0.9; }
    else if (crest) {
      if (dn > 0.82) { g = h0 < 0.4 ? G_TILDE : (h0 < 0.7 ? G_MID : G_BULLET); c = P(rgb(196.0, 212.0, 244.0), rgb(110.0, 140.0, 190.0)); ink = 0.9; }
      else { g = dn > 0.45 ? G_APPROX : (dn > 0.2 ? G_TILDE : G_DASH); c = P(rgb(76.0, 116.0, 184.0), rgb(48.0, 96.0, 160.0)); ink = 0.6 + 0.3 * dn; }
    } else if (h0 < 0.06 + 0.08 * (1.0 - dn)) { g = G_DASH; ink = 0.45; }
    float path = abs(X - sunAt.x) - 0.012 - 0.09 * dn;
    if (path < 0.0) {
      float tw = h2(vec2(cell.x, row) + floor(time * 2.0));
      if (tw > (day ? 0.6 : 0.42) - 0.1 * fly) { g = tw > 0.93 ? G_STAR : tw > 0.75 ? G_DBL : G_DASH; c = P(rgb(242.0, 236.0, 208.0), rgb(255.0, 206.0, 130.0)); ink = 0.95; }
    }
    put(g, ink, c);
    return;
  }

  // --- islands on the horizon: two low humps off to the left, pale in the haze, their outline drawn,
  // a couple of pines on the bigger
  for (int i = 0; i < 2; i++) {
    float ix = (i == 0 ? 0.16 : 0.42) * aspect, iw = (i == 0 ? 0.13 : 0.07) * mix(0.7, 1.0, wide), ih = i == 0 ? 0.034 : 0.02;
    #define ISL(x) (horizon + ih * max(0.0, 1.0 - pow(((x) - ix) / iw, 2.0)) + 0.003 * (vn((x) * 60.0) - 0.5))
    float it = ISL(X);
    if (abs(X - ix) < iw && Y < it + ch * 0.5 && Y >= horizon) {
      float tl = ISL(X - cw * 0.5), tr = ISL(X + cw * 0.5);
      bool across = abs(it - Y) <= 0.5 * ch, down = (Y - tl) * (Y - tr) <= 0.0;
      vec3 c = P(rgb(70.0, 78.0, 130.0), rgb(120.0, 136.0, 176.0));
      if (across || down) { float sl = (tr - tl) / ch; put(abs(sl) < 0.4 ? G_UNDER : (sl > 0.0 ? G_SLASH : G_BACK), 0.85, c); return; }
      if (Y < it) { put(h0 < 0.35 ? G_COLON : (h0 < 0.5 ? G_DOT : 0), 0.6, c * 0.85); return; }
    }
    if (i == 0) {
      for (int k = 0; k < 2; k++) {
        float px = ix + (k == 0 ? -0.025 : 0.012), pb = ISL(px) - ch * 0.3, phh = k == 0 ? 0.03 : 0.022;
        if (abs(X - px) < pineW((Y - pb) / phh, phh * 0.36, 3.0)) { put(G_TRI, 0.85, P(rgb(50.0, 80.0, 90.0), rgb(90.0, 120.0, 110.0))); return; }
      }
    }
  }

  // --- the beam, at night: a long wedge of light swung round, longest side-on, and a flash of glow
  // round the lantern as it turns to face you
  if (!day) {
    float sn = sin(sea.x), cs = cos(sea.x);
    vec2 r = vec2(X, Y) - lamp;
    float len = 1.4 * abs(sn);
    if (r.x * sn > 0.0 && abs(r.x) < len) {
      float spread = 0.006 + abs(r.x) * 0.07;
      float a = (1.0 - smoothstep(spread * 0.4, spread, abs(r.y))) * (1.0 - abs(r.x) / len);
      if (a > 0.08 && h0 < 0.35 + 0.65 * a) { put(a > 0.6 ? G_LINE : (a > 0.3 ? G_DASH : G_MID), 0.3 + 0.6 * a, rgb(255.0, 232.0, 160.0)); return; }
    }
    float fl = smoothstep(0.88, 1.0, cs);
    float rr = length(vec2(r.x, r.y * 1.3));
    if (fl > 0.05 && rr < 0.09 * fl && h0 < 0.7 * fl * (1.0 - rr / (0.09 * fl))) { put(rr < 0.03 ? G_STAR : G_MID, 0.5 + 0.5 * fl, rgb(255.0, 240.0, 190.0)); return; }
  }

  sky(cell, X, Y, h0, horizon, horizon + 0.02);
}`;

// The campfire: a clearing in the woods, a fire in a ring of stones in the middle, a tent to one
// side, the toaster on a log toasting bread on a stick. Pines frame it, a treeline of them closes the
// clearing, and over it the sky (lake.x: where the clearing ends; lake.y: the fire's foot). The
// flames leap on each kick, sparks fly up when the hats are busy, the firelight breathes with the
// loudness. By day: a sunny clearing, the fire low, its smoke rising.
const FIRE = `
// the treeline closing the clearing: pines of all heights, crowding (row 0 in front; row 1 behind it,
// taller, in the mist). In one at p? Its centre if so, else -9.
float treeAt(vec2 p, int i) {
  float S = cw * (i == 0 ? 5.0 : 3.5), k0 = floor(p.x / S), salt = i == 0 ? 0.0 : 40.0;
  float base = lake.x + (i == 0 ? 0.0 : 0.025);
  for (int j = -2; j <= 2; j++) {
    float k = k0 + float(j), r = h1(k * 2.7 + salt);
    float cx = (k + 0.5 + 0.7 * (h1(k * 1.3 + salt) - 0.5)) * S;
    float th = (i == 0 ? 0.05 : 0.08) + 0.14 * r * r;
    if (abs(p.x - cx) < pineW((p.y - base) / th, th * 0.34, 3.0 + floor(th * 30.0))) return cx;
  }
  return -9.0;
}
// the flames' heat at r (from the fire's foot; fh their height, fw their half width): five tongues
// licking up from a bed of flame on the logs, each flickering to its own height and swaying, torn
// by the turbulence rising through them; above 0 inside, hotter toward the core
float flame(vec2 r, float fh, float fw) {
  if (r.y < -0.5 * ch || r.y > fh * 1.5) return -1.0;
  float n = fbm(vec2(r.x / fw * 1.5 + 3.0, r.y / fh * 2.6 - time * 3.0)) - 0.5;
  float f = 0.8 * fw * sqrt(max(0.0, 1.0 - max(r.y, 0.0) / (0.3 * fh))) - abs(r.x);      // the bed
  for (int i = 0; i < 5; i++) {
    float fi = float(i), off = (fi - 2.0) * 0.4 * fw;
    float hi = fh * (1.0 - 0.17 * abs(fi - 2.0)) * (0.6 + 0.4 * vn(time * (2.0 + 0.8 * h1(fi)) + fi * 9.0));
    float u = r.y / hi;
    if (u > 1.0) continue;
    float sway = sin(time * (1.8 + h1(fi * 2.0)) + fi * 1.7) * 0.3 * fw * u * u;
    float w = 0.3 * fw * smoothstep(-0.1, 0.2, u) * pow(1.0 - max(u, 0.0), 0.7);
    f = max(f, w - abs(r.x - off - sway));
  }
  return f / fw + n * (0.12 + 0.3 * r.y / fh);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, back = lake.x, kick = sea.w;
  float wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);         // (0 in a tall window, 1 in a wide one)
  vec2 fire = vec2(0.5 * aspect, lake.y), r = vec2(X, Y) - fire;
  float fw = 0.05 * mix(0.8, 1.0, wide) * (day ? 0.75 : 1.0), fh = (day ? 0.075 : 0.13) * mix(0.85, 1.0, wide) * (1.0 + 0.5 * kick);
  // the firelight, on everything near the fire at night
  float warm = day ? 0.0 : smoothstep(0.5, 0.0, length(vec2(r.x * 0.7, r.y - 0.03))) * (0.75 + 0.25 * glow);
  vec3 ember = rgb(255.0, 150.0, 70.0);

  // --- an owl on a branch of the left pine: its eyes open at night, blinking on every fourth beat;
  // asleep by day
  {
    float oc = floor((0.03 * wide * aspect + mix(0.05, 0.075, wide)) / cw), orow = floor((1.0 - mix(0.5, 0.56, wide)) / ch);
    float o = cell.x - oc, r = row - orow;
    if (o >= -1.0 && o <= 1.0 && r >= -1.0 && r <= 1.0) {
      bool blink = day || fract(sea.z / 4.0) > 0.94;
      vec3 brown = P(rgb(150.0, 110.0, 80.0), rgb(140.0, 100.0, 70.0)), eye = blink ? brown : rgb(255.0, 220.0, 90.0);
      int g = r == -1.0 ? (o == 0.0 ? 0 : G_CARET)                                   // its ear tufts
            : r == 0.0 ? (o == 0.0 ? G_COMMA : (blink ? G_DASH : G_SMALLO))          // its eyes and beak
            : (o == 0.0 ? G_QUOTE : (o < 0.0 ? G_LP : G_RP));                        // its body
      if (g != 0) { put(g, 1.0, r == 0.0 && o != 0.0 ? eye : (r == 0.0 ? rgb(240.0, 170.0, 60.0) : brown)); return; }
    }
    // the branch it sits on
    if (row == orow + 2.0 && cell.x >= oc - 3.0 && cell.x <= oc + 2.0) { put(G_EQ, 1.0, P(rgb(90.0, 62.0, 50.0), rgb(110.0, 76.0, 50.0))); return; }
  }
  // --- the big pines in front, at either side: dark against the sky, their tiers' skirts drawn, the
  // side toward the fire catching its light
  {
    float w0 = 0.2 * min(1.0, aspect / 1.4);
    for (int i = 0; i < 2; i++) {
      float cx = (i == 0 ? 0.03 * wide : 1.0 - 0.03 * wide) * aspect;
      #define BIG(q) (abs((q).x - cx) < pineW(((q).y + 0.05) / 1.3, w0, 8.0))
      if (BIG(vec2(X, Y))) {
        bool lf = !BIG(vec2(X - cw, Y)), rt = !BIG(vec2(X + cw, Y)), dn = !BIG(vec2(X, Y - ch));
        bool lit = day ? (X - cx) * (sunAt.x - cx) > 0.0 : (X - cx) * (fire.x - cx) > 0.0;
        int g = lf && rt ? G_CARET : lf ? G_SLASH : rt ? G_BACK : dn ? G_UNDER
              : day ? (h0 < 0.45 ? G_CARET : (h0 < 0.75 ? G_TRI : 0)) : (h0 < 0.22 ? G_CARET : G_DARK);
        bool edge = lf || rt || dn;
        float reach = smoothstep(1.2, 0.1, length(vec2(r.x * 0.6, r.y)));
        vec3 c = edge ? P(rgb(40.0, 84.0, 72.0), rgb(30.0, 80.0, 46.0)) : (day ? rgb(54.0, 124.0, 66.0) : (g == G_DARK ? rgb(5.0, 12.0, 14.0) : rgb(20.0, 46.0, 40.0)));
        if (lit) c = day ? mix(c, rgb(120.0, 186.0, 92.0), edge ? 0.2 : 0.4) : mix(c, ember, (edge ? 0.6 : 0.2) * reach);
        put(g, edge ? 0.95 : (g == G_DARK ? 0.9 : 0.7), c);
        return;
      }
    }
  }

  // --- the fire: the flames (hot white at the core, through yellow and orange to red at the
  // tips; their edges drawn in parens), on logs glowing where they burn, in a ring of stones
  float hf = flame(r, fh, fw);
  if (hf > 0.0) {
    float hk = clamp(hf * 1.9 + 0.35 * (1.0 - r.y / fh) - 0.12 + 0.15 * kick, 0.0, 1.0);
    int g = hk < 0.14 ? (h0 < 0.5 ? G_TICK : G_COMMA) : hk < 0.28 ? G_CARET : hk < 0.42 ? G_STAR : hk < 0.56 ? G_SMALLO : hk < 0.7 ? G_BIGO : hk < 0.84 ? G_PCT : G_AT;
    vec3 c = hk > 0.75 ? mix(rgb(255.0, 210.0, 90.0), P(rgb(255.0, 248.0, 214.0), rgb(255.0, 186.0, 50.0)), (hk - 0.75) * 4.0)
           : hk > 0.4 ? mix(P(rgb(255.0, 120.0, 40.0), rgb(240.0, 96.0, 30.0)), rgb(255.0, 210.0, 90.0), (hk - 0.4) / 0.35)
           : mix(P(rgb(196.0, 36.0, 40.0), rgb(200.0, 40.0, 30.0)), P(rgb(255.0, 120.0, 40.0), rgb(240.0, 96.0, 30.0)), hk / 0.4);
    put(g, 1.0, c);
    return;
  }
  if (abs(r.y) < ch * 0.5 && abs(r.x) < fw * 1.3) {
    float a = abs(r.x) / (fw * 1.3);
    if (a > 1.0 - 1.5 * cw / (fw * 1.3)) { put(G_BIGO, 1.0, P(rgb(150.0, 140.0, 150.0), rgb(140.0, 136.0, 132.0)) * (1.0 + 0.4 * warm)); return; }
    float burn = smoothstep(0.75, 0.2, a) * (0.6 + 0.4 * vn(X * 90.0 + time * 3.0));
    put(burn > 0.45 && h0 < 0.4 ? G_STAR : G_EQ, 1.0, mix(rgb(120.0, 76.0, 46.0), rgb(255.0, 110.0, 40.0), day ? burn * 0.5 : burn));
    return;
  }
  if (abs(r.y + ch) < ch * 0.5 && abs(r.x) < fw * 1.6) {
    float k = h2(cell + 5.0);
    put(k < 0.55 ? G_BIGO : (k < 0.85 ? G_SMALLO : G_UNDER), 1.0, mix(P(rgb(110.0, 106.0, 124.0), rgb(130.0, 126.0, 124.0)), ember, 0.45 * warm));
    return;
  }
  // sparks: flying up off the fire, wandering, cooling from yellow to red (more of them when the hats
  // are busy, and on a kick)
  if (!day) for (int k = 0; k < 20; k++) {
    float fk = float(k), life = fract(time * (0.2 + 0.16 * h1(fk)) + h1(fk * 3.3));
    if (h1(fk * 7.1) > 0.3 + 0.55 * fly + 0.3 * kick) continue;
    vec2 sp = fire + vec2((h1(fk * 1.7) - 0.5) * fw * 1.4 + 0.03 * sin(life * 7.0 + fk * 2.0) * life + wind * life * 0.08, fh * 0.5 + life * 0.45);
    if (abs(X - sp.x) < cw * 0.5 && abs(Y - sp.y) < ch * 0.5) { put(life < 0.25 ? G_STAR : (life < 0.6 ? G_MID : G_DOT), 1.0 - life * 0.7, mix(rgb(255.0, 226.0, 130.0), rgb(220.0, 70.0, 40.0), life)); return; }
  }
  // smoke: curling up from the flames' tips, swaying, leaning with the wind, thinning out (lit warm
  // from below at night)
  for (int k = 0; k < 2; k++) {
    float sy = Y - fire.y - fh * (k == 0 ? 1.05 : 0.8), top = k == 0 ? 0.32 : 0.2;
    if (sy > 0.0 && sy < top) {
      float A = 0.012 + 0.08 * sy, kk = 24.0 + 6.0 * float(k), ph = sy * kk - time * 1.4 + float(k) * 2.4;
      float cx = fire.x + (k == 0 ? 0.0 : 0.25 * fw) + A * sin(ph) + wind * sy * sy * 0.35;
      float slope = (0.03 * sin(ph) + A * kk * cos(ph) + wind * sy * 0.7) * ch / cw;     // across per row, in cells
      float a = (1.0 - sy / top) * (day ? 0.95 : 0.6);
      bool on = vn(Y * 40.0 - time * 2.2 + float(k) * 7.0) < 0.35 + 0.6 * a;          // (broken into lengths)
      if (on && abs(X - cx) < cw * (0.5 + 0.3 * abs(slope))) {
        int g = abs(slope) < 0.45 ? (sin(ph) < 0.0 ? G_LP : G_RP) : (slope > 0.0 ? G_SLASH : G_BACK);
        put(g, 0.35 + 0.6 * a, P(rgb(128.0, 132.0, 168.0), rgb(130.0, 130.0, 140.0)));
        return;
      }
      if (sy > top * 0.4 && abs(X - cx) < cw * 2.5 && h0 < 0.12 * a) { put(G_TILDE, 0.3 + 0.4 * a, P(rgb(110.0, 114.0, 150.0), rgb(150.0, 150.0, 160.0))); return; }
    }
  }

  // --- the tent, to the right of the fire: an A-frame, its door open; a lantern lit inside at night
  {
    float tx = fire.x + mix(0.15, 0.39, wide), hw = mix(0.055, 0.1, wide), tb = lake.y + mix(0.075, 0.05, wide), th = hw * 1.25;
    float u = (Y - tb) / th, d = X - tx, ho = hw * (1.0 - u);
    if (abs(Y - tb) < ch * 0.5 && abs(d) < hw + cw) { put(G_UNDER, 0.95, P(rgb(150.0, 80.0, 56.0), rgb(150.0, 70.0, 40.0))); return; }
    if (u > 0.0 && u < 1.0 && abs(d) < ho + cw * 0.5) {
      float hd = hw * 0.42 * (1.0 - u / 0.72);
      float lit = day ? 0.0 : smoothstep(1.1, 0.0, length(vec2(d / hw, (u - 0.3) * 1.4)));    // the lantern's glow through the cloth
      vec3 cloth = mix(P(rgb(120.0, 62.0, 52.0), rgb(236.0, 128.0, 64.0)), ember, d < 0.0 ? 0.6 * warm : 0.2 * warm);
      cloth = mix(cloth, rgb(255.0, 196.0, 110.0), 0.85 * lit);
      if (abs(d) > ho - cw * 0.5) { put(d < 0.0 ? G_SLASH : G_BACK, 1.0, cloth * 1.15); return; }
      if (u < 0.72 && abs(d) < hd + cw * 0.5) {
        if (abs(d) > hd - cw * 0.5) { put(d < 0.0 ? G_SLASH : G_BACK, 1.0, cloth); return; }
        float lamp = day ? 0.0 : (0.85 + 0.15 * sin(time * 5.0) * sin(time * 3.1)) * smoothstep(0.7, 0.0, length(vec2(d / hw * 1.4, u - 0.22)));
        if (!day && abs(d) < cw * 0.5 && abs(u - 0.22) * th < ch * 0.5) { put(G_SPARK, 1.0, rgb(255.0, 240.0, 190.0)); return; }    // the lantern
        put(day ? G_DARK : (lamp > 0.5 ? G_MEDIUM : G_LIGHT), day ? 0.85 : 0.45 + 0.55 * lamp, day ? rgb(70.0, 40.0, 36.0) : mix(rgb(140.0, 80.0, 44.0), rgb(255.0, 220.0, 130.0), lamp));
        return;
      }
      put(day ? (mod(row, 3.0) < 1.0 && h0 < 0.7 ? G_DASH : G_LIGHT) : (lit > 0.6 ? G_DARK : lit > 0.25 ? G_MEDIUM : G_LIGHT), day ? 0.55 : 0.45 + 0.55 * lit, cloth);
      return;
    }
  }

  // --- the clearing's floor: grass in tufts, thicker toward you, worn to bare earth round the fire,
  // warmed by its light
  if (Y < back) {
    float near = 1.0 - Y / back;
    float worn = smoothstep(0.14, 0.05, length(vec2(r.x * 0.55, r.y)));
    int g = 0;
    if (h0 < (0.06 + 0.3 * near) * (1.0 - worn)) g = h0 < 0.04 ? G_QUOTE : (h0 < 0.12 ? G_COMMA : (h0 < 0.2 ? G_TICK : G_DOT));
    else if (h0 > 1.0 - 0.2 * worn) g = h0 > 1.0 - 0.06 * worn ? G_COMMA : G_DOT;
    if (h0 > 0.996 && worn < 0.1) g = G_STAR;                                       // a wildflower
    vec3 c = mix(P(rgb(36.0, 72.0, 58.0), rgb(78.0, 132.0, 64.0)), P(rgb(90.0, 66.0, 52.0), rgb(150.0, 116.0, 80.0)), worn);
    put(g, 0.55 + 0.35 * near + 0.3 * warm, h0 > 0.996 && worn < 0.1 ? P(rgb(220.0, 210.0, 255.0), rgb(232.0, 80.0, 90.0)) : mix(c, ember, 0.8 * warm));
    return;
  }

  // --- the treeline: the nearer row dark, its rims catching the light, the firelight on it; the row
  // behind it paler, in the mist
  for (int i = 0; i < 2; i++) {
    vec2 q = vec2(X, Y);
    if (treeAt(q, i) > -8.0) {
      bool lf = treeAt(q - vec2(cw, 0.0), i) < -8.0, rt = treeAt(q + vec2(cw, 0.0), i) < -8.0;
      int g = lf && rt ? G_CARET : lf ? G_SLASH : rt ? G_BACK : (h0 < 0.45 ? G_CARET : (h0 < 0.75 ? G_TRI : 0));
      vec3 c = i == 0 ? P(rgb(22.0, 58.0, 52.0), rgb(40.0, 100.0, 60.0)) : P(rgb(34.0, 48.0, 84.0), rgb(120.0, 150.0, 132.0));
      if (lf || rt) c = i == 0 ? P(rgb(56.0, 96.0, 104.0), rgb(30.0, 80.0, 46.0)) : P(rgb(60.0, 74.0, 120.0), rgb(100.0, 130.0, 116.0));
      if (i == 0) c = mix(c, ember, 0.6 * warm);
      put(g, i == 0 ? 0.9 : 0.65, c);
      return;
    }
  }
  sky(cell, X, Y, h0, farL.x, farL.x + 0.05);
}`;

// The snow: a log cabin on the far shore of a frozen lake, snow on its roof and on the pines round
// it, its windows lit; mountains behind; the toaster ice fishing out on the lake (lake.x: the far
// shore; lake.y: the near one). At night the aurora hangs over it all. Snow falls (more of it when
// the hats are busy, blown by the wind), the aurora shimmers and drifts with the music and flares
// on each kick, the float dips.
const SNOW = `
// the aurora: curtains of light hanging from two ribbons folded across the sky, drifting with the
// music, flaring on a kick. Each column a ray (they shimmer faster when the hats are busy), fading
// up from a crisp foot, brighter where the ribbon folds (seen edge on). Its light at p (0-1+), and
// how far up its curtain (0 at its foot, 1 at its top).
float aurora(vec2 p, float foot0, out float up) {
  float best = 0.0, ph = sea.z * 0.05 + time * 0.02;
  up = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i), x = p.x * (1.0 + 0.5 * fi) + fi * 3.7;
    float a1 = x * 2.1 + ph * 2.0, a2 = x * 5.3 - ph * 3.1;
    float foot = foot0 + fi * 0.09 + 0.07 * sin(a1) + 0.035 * sin(a2) + 0.008 * sin(x * 13.0 + time * 0.5);
    float fold = min(1.0, abs(0.147 * cos(a1) + 0.186 * cos(a2)) * 2.5);
    float hgt = (0.18 + 0.16 * vn(x * 3.0 + ph)) * (1.0 - 0.3 * fi);
    float s = (p.y - foot) / hgt;
    if (s < 0.0 || s > 1.0) continue;
    float ray = vn(x * 110.0 + time * (0.3 + 1.4 * fly) + fi * 50.0);
    ray = 0.2 + 0.8 * ray * ray * (0.5 + 0.5 * vn(x * 23.0 - time * 0.2));
    float a = 2.3 * ray * exp(-s * 1.9) * (1.0 - s * s) * (0.35 + 0.65 * vn(x * 1.6 + ph * 5.0)) * (0.65 + 0.6 * fold)
            * (0.65 + 0.45 * glow + 0.4 * sea.w * exp(-s * 5.0)) * (1.0 - 0.35 * fi);
    if (a > best) { best = a; up = s; }
  }
  return best;
}
// its colour up the curtain: pale green-white at the foot, green, teal, then violet at the top
vec3 auroraCol(float s) {
  return s < 0.08 ? mix(rgb(190.0, 255.0, 214.0), rgb(70.0, 236.0, 150.0), max(s, 0.0) / 0.08)
       : s < 0.55 ? mix(rgb(70.0, 236.0, 150.0), rgb(60.0, 190.0, 170.0), (s - 0.08) / 0.47)
       : mix(rgb(60.0, 190.0, 170.0), rgb(214.0, 92.0, 230.0), min(1.0, (s - 0.55) / 0.3));
}
// the pines along the far shore, of all heights, a gap here and there: in one at p? Its centre (else
// -9), and where in its tier (0 at the skirt, 1 at the top: the snow lies on the upper part).
float shoreTree(vec2 p, out float tier) {
  float S = cw * 4.5, k0 = floor(p.x / S);
  tier = 0.0;
  for (int j = -2; j <= 2; j++) {
    float k = k0 + float(j);
    if (h1(k * 6.1) < 0.2) continue;
    float r = h1(k * 2.3 + 5.0), cx = (k + 0.5 + 0.7 * (h1(k * 1.7) - 0.5)) * S, th = 0.045 + 0.12 * r * r;
    float u = (p.y - lake.x - 0.006) / th, n = 3.0 + floor(th * 28.0);
    if (abs(p.x - cx) < pineW(u, th * 0.33, n)) { tier = fract(u * n); return cx; }
  }
  return -9.0;
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);
  float footA = farL.x + farL.y * 0.75 + 0.04;                                   // (the aurora's foot)
  vec3 snowC = P(rgb(176.0, 196.0, 240.0), rgb(150.0, 170.0, 204.0)), shade = P(rgb(70.0, 86.0, 140.0), rgb(110.0, 130.0, 176.0));

  // --- snow falling, over everything: three layers, the nearer bigger and faster, blown by
  // the wind, thicker when the hats are busy
  for (int k = 0; k < 3; k++) {
    float fk = float(k), G = 7.0 + 3.0 * fk;
    vec2 q = vec2(cell.x - time * (0.4 + 2.5 * wind) * (1.4 - 0.3 * fk), row - time * (5.0 - 1.4 * fk));
    vec2 gi = floor(q / G), sub = floor(vec2(h2(gi + fk * 13.0), h2(gi + fk * 29.0)) * G);
    if (h2(gi + fk * 7.0) < 0.07 + 0.18 * fly && floor(q.x) - gi.x * G == sub.x && floor(q.y) - gi.y * G == sub.y) {
      over = k == 0 ? G_STAR : (k == 1 ? (h0 < 0.5 ? G_BULLET : G_PLUS) : G_MID);
      overInk = 0.85 - 0.2 * fk;
      overC = P(rgb(226.0, 234.0, 255.0), rgb(140.0, 160.0, 196.0));
      break;
    }
  }

  // --- the near shore: deep snow in drifts, a tuft of dry grass poking through here and there
  float nearY = lake.y + 0.012 * sin(X * 6.0 + 1.3);
  if (Y < nearY) {
    float dr = fract((Y - 0.012 * sin(X * 9.0)) * 38.0);
    float edge = smoothstep(0.0, 2.5 * ch, nearY - Y);
    tone = day ? 0.7 * (1.0 - edge) : mix(0.12, 0.8 + 0.1 * vn2(vec2(X * 9.0, Y * 40.0)), edge);
    float glint = h2(cell + floor(time * 1.5 + h0 * 9.0));
    int g = 0; float ink = 0.7; vec3 c = snowC;
    if (h0 < 0.03) { g = h0 < 0.012 ? G_QUOTE : G_COMMA; c = P(rgb(150.0, 136.0, 100.0), rgb(170.0, 140.0, 80.0)); }
    else if (!day && glint > 0.996) { g = glint > 0.999 ? G_SPARK : G_MID; c = rgb(230.0, 240.0, 255.0); ink = 1.0; }
    else if (dr < 0.12 && h0 < 0.6) { g = G_TILDE; c = shade; }
    else if (!day && h0 < 0.3) { g = h0 < 0.12 ? G_COLON : G_DOT; ink = 0.45; }
    else if (h0 < 0.1) g = G_DOT;
    put(g, ink, c);
    return;
  }

  // --- the cabin, on the far shore: walls of logs (their ends stacked at the corners), two windows
  // lit warm, a door; snow thick on the roof, icicles under its eaves; smoke from the chimney
  float cs = mix(0.7, 1.0, wide);
  vec2 cab = vec2(mix(0.8, 0.76, wide) * aspect, lake.x + 0.004);
  float hwc = 0.1 * cs, wall = 0.075 * cs, roofH = 0.065 * cs, eave = 0.018 * cs, winX = hwc * 0.55;
  // a snowman beside it: a hat, a carrot nose, a red scarf, stick arms, two buttons
  {
    float sc = floor((cab.x - hwc - mix(0.035, 0.05, wide)) / cw), sr = floor((1.0 - cab.y) / ch) - 1.0;
    float o = cell.x - sc, r = sr - row;                       // (r: rows up from its foot)
    vec3 snowW = P(rgb(220.0, 230.0, 255.0), rgb(150.0, 166.0, 200.0)), black = P(rgb(30.0, 30.0, 44.0), rgb(40.0, 40.0, 50.0));
    vec3 stick = P(rgb(130.0, 90.0, 60.0), rgb(110.0, 76.0, 50.0));
    if (abs(o) <= 2.0 && r >= 0.0 && r <= 4.0) {
      int g = 0; vec3 c = snowW;
      if (abs(o) <= 1.0 && r <= 3.0) tone = day ? 0.0 : 0.95;          // (the snow of its body, its head)
      if (r == 0.0) { g = abs(o) == 2.0 ? (o < 0.0 ? G_LP : G_RP) : (o == 0.0 ? G_COLON : G_UNDER); c = o == 0.0 ? black : snowW; }
      else if (r == 1.0) { g = abs(o) == 2.0 ? (o < 0.0 ? G_SLASH : G_BACK) : (o == 0.0 ? G_COLON : 0); c = abs(o) == 2.0 ? stick : (o == 0.0 ? black : snowW); }
      else if (r == 2.0 && abs(o) <= 1.0) { g = o == 0.0 ? G_EQ : G_DASH; c = rgb(220.0, 60.0, 60.0); }
      else if (r == 3.0 && abs(o) <= 1.0) { g = o == -1.0 ? G_LP : (o == 1.0 ? G_RP : G_QUOTE); c = o == 0.0 ? black : snowW; }
      else if (r == 4.0 && abs(o) <= 1.0) { g = o == 0.0 ? G_DARK : G_UNDER; c = black; }
      if (r == 3.0 && o == 1.0) { g = G_MORE; c = rgb(255.0, 140.0, 50.0); }    // (its carrot, on the right of its face)
      if (g != 0 || tone > 0.5) { solid = true; put(g, 1.0, c); return; }
    }
  }
  float flick = 0.88 + 0.12 * sin(time * 7.0) * sin(time * 4.3);
  vec3 lamp = rgb(255.0, 200.0, 110.0) * (day ? 1.0 : flick);
  {
    float d = X - cab.x, v = Y - cab.y, ad = abs(d);
    float chx = cab.x + 0.05 * cs, chTop = cab.y + wall + roofH * 1.1;
    // the chimney, up from the roof's slope, snow on its top
    if (abs(X - chx) < 0.012 * cs && v > wall + roofH * (1.0 - ad / (hwc + eave)) && Y < chTop + ch) {
      if (Y > chTop) { put(G_MEDIUM, 0.9, P(rgb(200.0, 214.0, 250.0), rgb(196.0, 210.0, 232.0))); return; }
      put(mod(row, 2.0) < 1.0 ? G_EQ : G_DARK, 0.9, P(rgb(110.0, 54.0, 50.0), rgb(150.0, 70.0, 56.0)));
      return;
    }
    // the roof: snow, its edges outlined, the wood under it along the bottom
    float hr = (hwc + eave) * (1.0 - (v - wall) / roofH);
    if (v >= wall && v < wall + roofH && ad < hr) {
      if (v < wall + ch) { put(G_DBL, 0.95, P(rgb(90.0, 60.0, 44.0), rgb(110.0, 70.0, 44.0))); return; }
      if (ad > hr - cw) { put(d < 0.0 ? G_SLASH : G_BACK, 1.0, P(rgb(220.0, 230.0, 255.0), rgb(120.0, 140.0, 180.0))); return; }
      put(h0 < 0.5 ? G_MEDIUM : G_LIGHT, 0.85, P(rgb(200.0, 214.0, 250.0), rgb(206.0, 218.0, 236.0)));
      return;
    }
    // icicles under the eaves, outside the walls
    if (v < wall && v > wall - 2.0 * ch && ad > hwc && ad < hwc + eave) {
      float len = 1.0 + floor(h1(floor(X / cw) * 3.1) * 2.0);
      if (wall - v < len * ch) { put(wall - v < ch ? G_BAR : G_TICK, 0.9, P(rgb(190.0, 220.0, 255.0), rgb(120.0, 160.0, 210.0))); return; }
    }
    if (v >= 0.0 && v < wall && ad < hwc) {
      // the log ends at the corners
      if (ad > hwc - cw) { put(mod(row, 2.0) < 1.0 ? G_BIGO : G_SMALLO, 1.0, P(rgb(150.0, 104.0, 70.0), rgb(176.0, 124.0, 80.0))); return; }
      // the windows: four panes, lit warm at night, the sky in them by day
      vec2 wq = vec2(ad - winX, v - wall * 0.55);
      if (abs(wq.x) < 0.024 * cs && abs(wq.y) < 0.018 * cs) {
        bool mx = abs(wq.x) < cw * 0.5, my = abs(wq.y) < ch * 0.5;
        if (mx || my) { put(mx && my ? G_PLUS : (mx ? G_BAR : G_DASH), 1.0, P(rgb(70.0, 44.0, 32.0), rgb(100.0, 64.0, 40.0))); return; }
        put(day ? G_LIGHT : G_DARK, 1.0, day ? rgb(150.0, 180.0, 220.0) : lamp);
        return;
      }
      // the door
      if (ad < 0.02 * cs && v < wall * 0.75) {
        put(ad > 0.02 * cs - cw ? G_BAR : (abs(v - wall * 0.35) < ch * 0.5 && d > 0.0 ? G_MID : G_MEDIUM), 1.0, P(rgb(80.0, 50.0, 36.0), rgb(110.0, 70.0, 44.0)) * (ad > 0.02 * cs - cw ? 1.0 : 0.85));
        return;
      }
      // the logs, a row each, in two browns; warm round the windows at night
      float glowW = day ? 0.0 : smoothstep(0.05 * cs, 0.0, length(wq)) * 0.6;
      vec3 c = mod(row, 2.0) < 1.0 ? P(rgb(84.0, 56.0, 40.0), rgb(140.0, 92.0, 56.0)) : P(rgb(66.0, 44.0, 34.0), rgb(116.0, 74.0, 46.0));
      put(mod(row, 2.0) < 1.0 ? G_DBL : G_EQ, 0.95, mix(c, lamp, glowW));
      return;
    }
    // smoke from the chimney: one strand, curling, leaning with the wind, thinning out
    float sy = Y - chTop - ch;
    if (sy > 0.0 && sy < 0.24) {
      float A = 0.006 + 0.06 * sy, ph2 = sy * 26.0 - time * 1.3;
      float sx = chx + A * sin(ph2) + wind * sy * sy * 0.5;
      float slope = (A * 26.0 * cos(ph2) + wind * sy) * ch / cw, a = 1.0 - sy / 0.24;
      bool on = vn(Y * 40.0 - time * 2.0) < 0.35 + 0.6 * a;
      if (on && abs(X - sx) < cw * (0.5 + 0.3 * abs(slope))) {
        put(abs(slope) < 0.45 ? (sin(ph2) < 0.0 ? G_LP : G_RP) : (slope > 0.0 ? G_SLASH : G_BACK), 0.3 + 0.6 * a, P(rgb(140.0, 146.0, 180.0), rgb(130.0, 134.0, 150.0)));
        return;
      }
    }
  }

  // --- the frozen lake: dark smooth ice, snow blown across it in drifts; the aurora's light glinting
  // on it under its brightest folds, the far shore's pines mirrored darkly, the windows' light in
  // long warm streaks
  if (Y < lake.x) {
    tone = day ? 0.7 : 0.12;
    float depth = (lake.x - Y) / (lake.x - lake.y);
    float streak = vn2(vec2((X + time * 0.002) * 14.0, row));
    // the windows' light
    for (int i = 0; i < 2; i++) {
      float wx = cab.x + (i == 0 ? -winX : winX);
      if (!day && abs(X - wx) < 0.016 * cs && depth < 0.75 && h2(cell + floor(time * 3.0)) < 0.75 - depth * 0.6) { put(h0 < 0.5 ? G_BAR : G_DASH, 0.9 - 0.7 * depth, lamp); return; }
    }
    // the pines mirrored just under the far shore
    float tier, Ym = 2.0 * lake.x - Y + 0.012;
    if (!day && depth < 0.45 && shoreTree(vec2(X + 0.002 * sin(row * 2.1 + time), Ym), tier) > -8.0) {
      if (streak > 0.3) { put(streak > 0.65 ? G_APPROX : G_TILDE, 0.7, P(rgb(20.0, 54.0, 60.0), rgb(60.0, 110.0, 96.0))); return; }
      put(0, 0.0, vec3(0.0));
      return;
    }
    // drifts of snow on the ice
    float drift = fbm(vec2(X * 5.0 - time * 0.01, Y * 34.0));
    if (drift > 0.56 && h0 < (drift - 0.56) * 4.0) { put(h0 < 0.2 ? G_COLON : G_DOT, 0.7, snowC); return; }
    // the aurora's light on the ice
    if (!day) {
      float up, a = aurora(vec2(X, footA + 0.03), footA, up);
      float st = vn2(vec2((X + time * 0.002) * 5.0, row));
      if (st > 0.9 - 0.22 * a) { put(st > 0.96 ? G_DBL : G_LINE, 0.25 + 0.6 * a, mix(rgb(60.0, 90.0, 140.0), auroraCol(0.1), min(1.0, a * 1.3))); return; }
    } else if (streak > 0.72) { put(streak > 0.9 ? G_LINE : G_DASH, 0.45, rgb(150.0, 182.0, 220.0)); return; }
    put(0, 0.0, vec3(0.0));
    return;
  }

  // --- the far shore: the pines, snow along the tops of their tiers, and the bank under them
  {
    float tier, t2;
    if (shoreTree(vec2(X, Y), tier) > -8.0) {
      bool lf = shoreTree(vec2(X - cw, Y), t2) < -8.0, rt = shoreTree(vec2(X + cw, Y), t2) < -8.0;
      bool snowy = tier > 0.64 || (lf && rt);
      int g = lf && rt ? G_TRI : lf ? G_SLASH : rt ? G_BACK : snowy ? (h0 < 0.6 ? G_TRI : G_CARET) : (h0 < 0.55 ? G_CARET : (day ? G_TRI : 0));
      vec3 needles = P(rgb(22.0, 58.0, 60.0), rgb(36.0, 96.0, 70.0));
      put(g, 0.95, snowy ? P(rgb(196.0, 212.0, 250.0), rgb(140.0, 160.0, 196.0)) : needles);
      return;
    }
    if (Y < lake.x + 0.012) { tone = day ? 0.0 : 0.9; put(h0 < 0.3 ? G_DOT : 0, day ? 0.7 : 0.45, snowC); return; }
  }

  // --- the mountains behind: snow from foot to peak, the side toward the moon (or the sun) lit and
  // stippled, the other in shade and hatched; their ridges drawn
  {
    vec4 pk = peak(2, X);
    float tl = peak(2, X - 0.5 * cw).x, tr = peak(2, X + 0.5 * cw).x, tc = pk.x;
    if (Y - 0.5 * ch <= max(max(tl, tr), tc)) {
      bool across = abs(tc - Y) <= 0.5 * ch, down = (Y - tl) * (Y - tr) <= 0.0;
      float sl = (tr - tl) / ch;
      if (across || down) {
        int g = abs(sl) < 0.4 ? (tl < tc && tr < tc ? G_CARET : G_UNDER) : (sl > 0.0 ? G_SLASH : G_BACK);
        put(g, 0.95, P(rgb(210.0, 222.0, 255.0), rgb(100.0, 116.0, 160.0)));
        return;
      }
      if (Y < tc) {
        bool lit = (X - pk.y) * (sunAt.x - pk.y) > 0.0;
        tone = day ? (lit ? 0.0 : 0.45) : (lit ? 0.55 : 0.18);
        vec3 c = lit ? P(rgb(170.0, 186.0, 236.0), rgb(150.0, 170.0, 210.0)) : P(rgb(64.0, 78.0, 136.0), rgb(110.0, 128.0, 180.0));
        if (!day) { float up, a = aurora(vec2(X, footA + 0.03), footA, up); c = mix(c, auroraCol(0.2), 0.3 * a); }
        int g = lit ? (h0 < 0.22 ? G_DOT : (h0 < 0.3 ? G_COLON : 0)) : (mod(cell.x + row, 2.0) < 1.0 ? G_HATCHB : (h0 < 0.4 ? G_DOT : 0));
        put(g, 0.8, c);
        return;
      }
    }
  }

  // --- the aurora at night, in front of the stars (they show through its gaps); then the sky
  if (!day) {
    float up, a = aurora(vec2(X, Y), footA, up);
    if (a > 0.1 && length(vec2(X, Y) - sunAt) > 0.085) {
      int g = a > 0.5 || (a > 0.3 && up < 0.3) ? G_BAR : a > 0.28 ? G_COLON : a > 0.17 ? G_TICK : G_DOT;
      put(g, clamp(0.35 + 0.65 * a, 0.0, 1.0), auroraCol(up) * (0.8 + 0.3 * min(a, 1.0)));
      return;
    }
  }
  sky(cell, X, Y, h0, farL.x, farL.x + 0.05);
}`;

// The city: a street at night in the rain, across from a row of buildings (their windows lit, a
// few going on or off each bar, a fire escape down one, a shop with a neon sign: TOAST), towers
// behind, low cloud lit orange from below. The toaster waits on the near pavement under an
// umbrella, a streetlamp beside it (lake.x: the far kerb, where the buildings stand; lake.y: the
// near kerb). The rain falls harder when the hats are busy, the puddles ripple on each kick, the
// towers' lights blink on the beat, a car goes by every 8 bars. By day: a grey rainy day.
const CITY = `
// the row across the street: the building at x (its left edge, its width, its height above the
// pavement, and which one), their edges a little uneven
vec4 bldg(float x) {
  float Pd = 0.17, k = floor(x / Pd);
  float b0 = (k + 0.35 * (h1(k * 1.7 + 3.0) - 0.5)) * Pd;
  if (x < b0) { k -= 1.0; b0 = (k + 0.35 * (h1(k * 1.7 + 3.0) - 0.5)) * Pd; }
  float b1 = (k + 1.0 + 0.35 * (h1((k + 1.0) * 1.7 + 3.0) - 0.5)) * Pd;
  if (x >= b1) { k += 1.0; b0 = b1; b1 = (k + 1.0 + 0.35 * (h1((k + 1.0) * 1.7 + 3.0) - 0.5)) * Pd; }
  float r = h1(k * 3.7 + 1.0);
  return vec4(b0, b1 - b0, 0.16 + 0.4 * r * r, k);
}
// whether a building's shop is lit (the one under the sign always is)
bool shopLit(vec4 b, float signX) { return h1(b.w * 2.3 + 7.0) < 0.6 || (signX >= b.x && signX < b.x + b.y); }
// the towers behind it: the one at x (its centre, half width, height, which one), or height -1
vec4 tower(float x) {
  float Pd = 0.12, k0 = floor(x / Pd);
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    float cx = (k + 0.5 + 0.4 * (h1(k * 2.1 + 9.0) - 0.5)) * Pd, hw = Pd * (0.2 + 0.15 * h1(k * 4.3 + 9.0));
    if (abs(x - cx) < hw) return vec4(cx, hw, 0.3 + 0.4 * pow(h1(k * 6.1 + 9.0), 1.5), k);
  }
  return vec4(0.0, 0.0, -1.0, 0.0);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);
  float base = lake.x, kerb = lake.y, foot = base + 0.025, bar = floor(sea.z / 4.0);
  vec3 lampC = rgb(255.0, 200.0, 120.0), neon = rgb(255.0, 84.0, 176.0);
  // the streetlamp (on the near pavement, its arm out over it) and the sign (over the shop)
  float sx = (0.9 - 0.02 * wide) * aspect, lampY = 0.38 + 0.06 * wide;
  vec2 head = vec2(sx - 0.035, lampY);
  float signX = (0.5 + 0.06 * wide) * aspect, signY = foot + 0.07;
  float coneW = (head.y - Y) * 0.42;
  bool inCone = !day && Y < head.y - ch && abs(X - head.x) < coneW;

  // --- the rain, over everything: streaks in three layers, the nearer longer and faster, slanting
  // with the wind, thicker when the hats are busy; lit where it falls through the lamp's light
  float lean = 0.1 + 0.6 * wind;
  for (int k = 0; k < 3; k++) {
    float fk = float(k), G = 6.0 + 3.0 * fk, Lr = 3.0 - fk;
    vec2 q = vec2(cell.x - lean * row * (1.0 - 0.25 * fk), row - time * (30.0 - 7.0 * fk));
    vec2 gi = floor(q / G), sub = floor(vec2(h2(gi + fk * 13.0), h2(gi + fk * 29.0)) * G);
    float dy = floor(q.y) - gi.y * G - sub.y;
    if (h2(gi + fk * 7.0) < 0.12 + 0.3 * fly && floor(q.x) - gi.x * G == sub.x && dy >= 0.0 && dy < Lr) {
      over = lean > 0.42 ? G_BACK : G_BAR;
      overInk = (inCone ? 0.95 : 0.5 - 0.12 * fk) * (1.0 - 0.4 * dy / Lr);
      overC = inCone ? lampC : P(rgb(140.0, 160.0, 214.0), rgb(110.0, 128.0, 166.0));
      break;
    }
  }

  // --- the car going by (every 8 bars): a body on two wheels, its windows, its lights; its
  // headlights' beam ahead of it on the road and through the rain
  if (car.w > 0.5) {
    float laneY = kerb + (base - kerb) * 0.3;
    float c0 = floor(car.x / cw), r0 = floor((1.0 - laneY) / ch);
    float cx = cell.x - c0, ry = r0 - row;          // (across from its back; up from its wheels' row)
    vec3 body = car.z < 0.5 ? P(rgb(236.0, 190.0, 60.0), rgb(230.0, 176.0, 40.0)) : P(rgb(120.0, 140.0, 220.0), rgb(60.0, 90.0, 170.0));
    if (cx >= 0.0 && cx < 14.0 && ry >= 0.0 && ry < 3.0) {
      int g = 0; vec3 c = body; float ink = 1.0;
      if (ry == 0.0) {
        if (cx == 2.0 || cx == 3.0 || cx == 10.0 || cx == 11.0) { g = G_BIGO; c = P(rgb(70.0, 70.0, 90.0), rgb(50.0, 50.0, 60.0)); }
        else if (cx == 13.0) { g = G_DARK; c = rgb(255.0, 236.0, 170.0); }
        else if (cx == 0.0) { g = G_DARK; c = rgb(230.0, 40.0, 50.0); }
        else g = G_EQ;
      } else if (ry == 1.0) {
        if (cx == 2.0) g = G_SLASH;
        else if (cx == 11.0) g = G_BACK;
        else if (cx == 7.0) g = G_BAR;
        else if (cx > 2.0 && cx < 11.0) { g = G_LIGHT; c = P(rgb(150.0, 170.0, 220.0), rgb(160.0, 190.0, 220.0)); }
        else g = G_UNDER;
      } else if (cx > 2.0 && cx < 11.0) g = G_UNDER;
      if (g != 0) { solid = true; put(g, ink, c); return; }
    }
    float ahead = cx - 14.0;
    if (!day && ahead >= 0.0 && ahead < 22.0 && ry >= -1.0 && ry <= 1.0 + ahead * 0.12) {
      float a = 1.0 - ahead / 22.0;
      if (h0 < 0.25 + 0.5 * a) { put(ry < 0.0 ? G_DASH : (h0 < 0.15 ? G_EQ : G_DASH), 0.25 + 0.6 * a, rgb(255.0, 240.0, 190.0)); return; }
    }
  }

  // --- the streetlamp: a post, an arm out over the pavement, the lamp under its shade
  if (abs(X - sx) < cw * 0.6 && Y > 0.012 && Y < lampY + ch * 0.5) { put(G_BAR, 1.0, P(rgb(84.0, 88.0, 116.0), rgb(70.0, 74.0, 90.0))); return; }
  if (abs(Y - lampY) < ch * 0.5 && X > head.x - cw && X < sx) { put(X < head.x + cw ? G_SLASH : G_LINE, 1.0, P(rgb(84.0, 88.0, 116.0), rgb(70.0, 74.0, 90.0))); return; }
  if (abs(Y - (lampY - ch)) < ch * 0.5 && abs(X - head.x) < cw * 1.6) { solid = true; put(abs(X - head.x) > cw * 1.1 ? (X < head.x ? G_SLASH : G_BACK) : G_DARK, 1.0, P(rgb(90.0, 94.0, 120.0), rgb(80.0, 84.0, 96.0))); return; }
  if (abs(Y - (lampY - 2.0 * ch)) < ch * 0.5 && abs(X - head.x) < cw * 1.6) { solid = true; put(G_DARK, 1.0, day ? rgb(210.0, 210.0, 200.0) : lampC * 1.1); return; }
  if (!day) {
    // its halo, and the edges of its cone down to the pavement, faint
    float hr = length(vec2((X - head.x) * 0.8, Y - (lampY - 2.0 * ch)));
    if (hr < 0.05 && h0 < 0.55 * (1.0 - hr / 0.05)) { put(hr < 0.025 ? G_MID : G_DOT, 0.9 - 8.0 * hr, lampC); return; }
    if (Y < lampY - 2.0 * ch && Y > 0.02 && abs(abs(X - head.x) - coneW) < cw * 0.5 && h0 < 0.35) { put(X < head.x ? G_SLASH : G_BACK, 0.3, lampC); return; }
  }

  // --- the near pavement: slabs, the kerb along its top, puddles (the sign and the lamp in them),
  // the rain splashing
  float splash = h2(cell + floor(time * 7.0 + h0 * 5.0));
  if (Y < kerb) {
    tone = day ? 0.5 : 0.12;
    if (kerb - Y < ch) { put(G_LINE, 0.9, P(rgb(120.0, 124.0, 150.0), rgb(110.0, 112.0, 130.0))); return; }
    float pud = vn2(vec2(X * 9.0, Y * 30.0));
    if (pud > 0.66) {
      // a puddle: the neon and the lamp in it, broken by the rain
      bool pink = abs(X - signX) < 0.06 && !day, warm = abs(X - head.x) < 0.04 && !day;
      if ((pink || warm) && h2(cell + floor(time * 4.0)) < 0.55) { put(h0 < 0.5 ? G_BAR : G_DASH, 0.7, pink ? neon : lampC); return; }
      if (splash > 0.97 - 0.03 * fly) { put(splash > 0.99 ? G_SMALLO : G_MID, 0.8, P(rgb(170.0, 186.0, 230.0), rgb(110.0, 128.0, 166.0))); return; }
      put(h0 < 0.3 ? G_TILDE : 0, 0.5, P(rgb(60.0, 70.0, 120.0), rgb(130.0, 150.0, 180.0)));
      return;
    }
    if (splash > 0.985 - 0.02 * fly) { put(G_DOT, 0.8, P(rgb(170.0, 186.0, 230.0), rgb(110.0, 128.0, 166.0))); return; }
    bool joint = mod(cell.x + floor(row / 3.0) * 4.0, 9.0) < 1.0 || mod(row, 3.0) < 1.0;
    put(joint ? (mod(row, 3.0) < 1.0 ? G_UNDER : G_BAR) : 0, 0.35, P(rgb(70.0, 74.0, 104.0), rgb(140.0, 144.0, 160.0)));
    return;
  }

  // --- the road: wet, the lights across the street drawn down it in long broken streaks (the shop
  // windows warm, the sign pink), a dashed line down the middle, ripples on the kicks
  if (Y < base) {
    tone = day ? 0.85 : 0.05;
    float m = (base - Y) / (base - kerb);               // (0 at the far kerb, 1 at the near)
    // ripples
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.008 + q.z * 0.05, d = length(vec2(X - q.x, (Y - q.y) * 4.0)) - rad;
      if (abs(d) < cw * 0.8 && exp(-q.z * 1.5) > 0.1) { put((X - q.x) < -rad * 0.8 ? G_LP : ((X - q.x) > rad * 0.8 ? G_RP : G_DASH), 0.6, P(rgb(160.0, 180.0, 230.0), rgb(110.0, 130.0, 170.0))); return; }
    }
    float run = vn(row * 0.8 - time * 2.5 + cell.x * 13.7);       // (the breaks, running down the streaks)
    bool colOn = h1(cell.x * 3.7) < 0.7;
    if (abs(X - signX) < 4.5 * cw && colOn && run > 0.3 + 0.5 * m) { put(run > 0.62 ? G_BAR : G_COLON, (day ? 0.35 : 0.85) - 0.4 * m, day ? rgb(200.0, 140.0, 170.0) : neon); return; }
    vec4 b = bldg(X);
    float bx = X - b.x;
    if (shopLit(b, signX) && bx > b.y * 0.15 && bx < b.y * 0.85 && colOn && run > 0.42 + 0.5 * m) { put(run > 0.7 ? G_BAR : G_COLON, (day ? 0.3 : 0.6) - 0.3 * m, day ? rgb(220.0, 180.0, 130.0) : rgb(255.0, 196.0, 120.0)); return; }
    if (abs(Y - (base + kerb) * 0.5) < ch * 0.5 && mod(cell.x, 6.0) < 3.0) { put(G_DASH, 0.6, P(rgb(200.0, 200.0, 210.0), rgb(250.0, 250.0, 250.0)) * (day ? 0.6 : 0.8)); return; }
    if (splash > 0.985 - 0.02 * fly) { put(G_DOT, 0.7, P(rgb(160.0, 178.0, 226.0), rgb(110.0, 128.0, 166.0))); return; }
    put(h0 < 0.05 ? G_DASH : 0, 0.3, P(rgb(50.0, 56.0, 90.0), rgb(120.0, 124.0, 140.0)));
    return;
  }

  // --- the far pavement, the sign over the shop, the buildings
  // people with umbrellas, walking the far pavement this way and that
  if (Y < foot + 2.0 * ch && Y > base) {
    float pr = floor((1.0 - (base + ch * 0.6)) / ch);        // (their bodies' row; the umbrellas' above)
    for (int k = 0; k < 5; k++) {
      float fk = float(k), v = (0.025 + 0.03 * h1(fk * 3.3)) * (h1(fk * 7.1) < 0.5 ? -1.0 : 1.0);
      float px = mod(h1(fk * 5.9) * 3.0 + v * time, aspect + 0.2) - 0.1;
      float pc = floor(px / cw), dc = cell.x - pc;
      if ((row == pr && dc == 0.0) || (row == pr - 1.0 && abs(dc) <= 1.0)) {
        solid = true;
        float uc = h1(fk * 9.7);
        vec3 brolly = uc < 0.3 ? rgb(220.0, 60.0, 70.0) : uc < 0.55 ? rgb(240.0, 200.0, 70.0) : uc < 0.8 ? rgb(80.0, 140.0, 230.0) : P(rgb(110.0, 110.0, 140.0), rgb(40.0, 40.0, 50.0));
        put(row == pr ? G_BAR : (dc < 0.0 ? G_SLASH : (dc > 0.0 ? G_BACK : G_CARET)), 1.0, row == pr ? P(rgb(30.0, 30.0, 44.0), rgb(60.0, 60.0, 70.0)) : brolly);
        return;
      }
    }
  }
  if (Y < foot) {
    tone = day ? 0.55 : 0.1;
    put(foot - Y < ch ? G_UNDER : (h0 < 0.12 ? G_DOT : 0), 0.6, P(rgb(80.0, 84.0, 116.0), rgb(120.0, 122.0, 140.0)));
    return;
  }
  {
    // the sign: TOAST in pink neon in a frame, flickering now and then, brighter on the kick
    float c0 = floor(signX / cw) - 4.0, rS = floor((1.0 - signY) / ch);
    float sc = cell.x - c0, sr = row - rS;
    if (sc >= 0.0 && sc <= 8.0 && abs(sr) <= 1.0) {
      solid = true;
      bool lit = !day && (sc < 2.0 || sc > 6.0 || h1(floor(time * 9.0) + sc) > 0.04);    // (a letter's tube flickering now and then)
      vec3 c = day ? rgb(170.0, 110.0, 140.0) : neon * (lit ? 1.0 + 0.35 * sea.w : 0.35);
      if (abs(sr) == 1.0) { put(sc == 0.0 || sc == 8.0 ? G_PLUS : G_EQ, 1.0, c * 0.85); return; }
      int g = sc == 0.0 || sc == 8.0 ? G_BAR : sc == 2.0 || sc == 6.0 ? G_LT : sc == 3.0 ? G_BIGO : sc == 4.0 ? G_LA : sc == 5.0 ? G_LS : 0;
      put(g, 1.0, sc >= 2.0 && sc <= 6.0 && lit ? mix(c, rgb(255.0, 230.0, 245.0), 0.45) : c);
      return;
    }
  }
  vec4 b = bldg(X);
  float bh = b.z, top = foot + bh, kk = b.w, look = h1(kk * 5.3 + 2.0);
  if (day && Y < top) tone = 0.45;
  vec3 wall = look < 0.4 ? P(rgb(96.0, 54.0, 60.0), rgb(150.0, 90.0, 80.0)) : (look < 0.75 ? P(rgb(60.0, 66.0, 100.0), rgb(120.0, 124.0, 144.0)) : P(rgb(74.0, 70.0, 92.0), rgb(140.0, 132.0, 140.0)));
  vec3 rim = P(rgb(190.0, 150.0, 200.0), rgb(90.0, 84.0, 100.0));        // (the edges catching the glow)
  if (Y < top) {
    float cx = floor((X - b.x) / cw), ncol = floor(b.y / cw), ry = floor((top - Y) / ch), nrow = floor(bh / ch);
    if (cx < 1.0 || cx >= ncol - 1.0) { put(G_BAR, 0.9, mix(wall * 0.75, rim, day ? 0.0 : 0.35)); return; }
    if (ry < 1.0) { put(G_LINE, 1.0, mix(wall * 1.1, rim, day ? 0.2 : 0.75)); return; }
    // a tall sign down the side of some: HOTEL, its letters chasing on the beats, all on at each bar
    if (!day && bh > 0.3 && h1(kk * 6.6) < 0.45 && cx >= ncol - 4.0 && cx <= ncol - 2.0 && ry >= 2.0 && ry <= 12.0) {
      solid = true;
      float li = floor((ry - 2.0) / 2.0), on = mod(ry, 2.0);
      float beat = floor(sea.z), chase = mod(beat, 4.0) == 3.0 ? 9.0 : mod(beat * 2.0 + floor(fract(sea.z) * 2.0), 5.0);
      bool litL = chase > 8.0 || li <= chase;
      vec3 c = rgb(255.0, 96.0, 64.0) * (litL ? 1.0 : 0.3);
      if (cx != ncol - 3.0) { put(G_BAR, 1.0, c * 0.8); return; }
      if (on < 1.0 || li > 4.0) { put(G_DASH, 0.6, c * 0.6); return; }
      put(li == 0.0 ? G_LH : li == 1.0 ? G_BIGO : li == 2.0 ? G_LT : li == 3.0 ? G_LE : G_LL, 1.0, litL ? mix(c, rgb(255.0, 230.0, 210.0), 0.35) : c);
      return;
    }
    // OPEN over some of the other lit shops, in blue
    if (shopLit(b, signX) && !(signX >= b.x && signX < b.x + b.y) && h1(kk * 4.1) < 0.45) {
      float oc = cell.x - floor((b.x + b.y * 0.5) / cw) + 3.0, orow = floor((1.0 - (foot + 0.068)) / ch);
      if (oc >= 0.0 && oc <= 5.0 && row == orow) {
        solid = true;
        bool lit = !day && h1(floor(time * 7.0) + kk) > 0.03;
        vec3 c = day ? rgb(120.0, 150.0, 170.0) : rgb(80.0, 220.0, 255.0) * (lit ? 1.0 : 0.3);
        put(oc == 0.0 || oc == 5.0 ? G_BAR : oc == 1.0 ? G_BIGO : oc == 2.0 ? G_LP2 : oc == 3.0 ? G_LE : G_LN, 1.0, oc > 0.0 && oc < 5.0 && lit ? mix(c, rgb(220.0, 250.0, 255.0), 0.4) : c);
        return;
      }
    }
    // the shop at street level: a window lit warm (or its shutter down), its door
    if (Y < foot + 0.05) {
      bool lit = shopLit(b, signX);
      float u = (X - b.x) / b.y;
      if (u > 0.12 && u < 0.88 && Y > foot + ch) {
        if (abs(u - 0.7) < 0.06) { put(G_MEDIUM, 0.9, P(rgb(60.0, 40.0, 40.0), rgb(90.0, 60.0, 50.0))); return; }
        if (!lit) { put(mod(row, 2.0) < 1.0 ? G_DBL : G_LINE, 0.7, P(rgb(80.0, 84.0, 100.0), rgb(130.0, 130.0, 140.0))); return; }
        put(mod(cx, 6.0) < 1.0 ? G_BAR : G_MEDIUM, 0.9, mod(cx, 6.0) < 1.0 ? wall * 0.6 : (day ? rgb(230.0, 200.0, 150.0) : rgb(255.0, 190.0, 110.0)));
        return;
      }
      put(G_EQ, 0.5, wall * 0.8);
      return;
    }
    // a fire escape down the front of some: landings every 4 floors' worth of rows, stairs between
    if (look > 0.3 && look < 0.52) {
      float u = cx - floor(ncol * 0.3), fl = mod(ry, 8.0);
      if (u >= 0.0 && u < 7.0) {
        if (fl < 1.0) { put(G_DBL, 0.95, P(rgb(130.0, 120.0, 140.0), rgb(60.0, 56.0, 64.0))); return; }
        float st = mod(floor(ry / 8.0), 2.0) < 1.0 ? fl - 1.0 : 7.0 - fl;
        if (abs(u - st) < 0.5) { put(mod(floor(ry / 8.0), 2.0) < 1.0 ? G_BACK : G_SLASH, 0.9, P(rgb(130.0, 120.0, 140.0), rgb(60.0, 56.0, 64.0))); return; }
      }
    }
    // the windows, two cells wide, a row tall; lit warm (or the blue of a screen), a few going on or
    // off each bar
    float wc = mod(cx - 1.0, 3.0), wr = mod(ry - 1.0, 2.0);
    if (wc < 2.0 && wr < 1.0 && cx < ncol - 2.0) {
      vec2 id = vec2(floor((cx - 1.0) / 3.0), floor((ry - 1.0) / 2.0)) + kk * 17.0;
      bool on = (h2(id) < 0.34) != (h2(id + bar * 1.37) < 0.05);
      bool screen = h2(id + 5.0) < 0.12;
      if (on) { put(G_DARK, 1.0, screen ? rgb(120.0, 170.0, 255.0) * (0.85 + 0.15 * sin(time * 9.0 + id.x)) : (day ? rgb(240.0, 200.0, 140.0) : rgb(255.0, 196.0, 110.0))); return; }
      put(G_LIGHT, 0.7, P(rgb(40.0, 46.0, 80.0), rgb(110.0, 130.0, 160.0)));
      return;
    }
    // the wall: brick in rows, or concrete
    if (look < 0.4) { put(mod(row, 2.0) < 1.0 ? (mod(cell.x + mod(row, 4.0), 4.0) < 1.0 ? G_BAR : G_UNDER) : 0, 0.35, wall); return; }
    put(h0 < 0.1 ? G_DOT : 0, 0.4, wall);
    return;
  }
  // on one roof a cat, sitting, its tail swishing on the beat
  {
    vec4 cb = bldg(signX + 0.2);
    float ccol = floor((cb.x + cb.y * 0.7) / cw), crow = floor((1.0 - (foot + cb.z)) / ch) - 1.0;
    float o = cell.x - ccol;
    vec3 fur = P(rgb(196.0, 160.0, 210.0), rgb(50.0, 46.0, 54.0));      // (its outline, caught in the glow)
    if (row == crow - 1.0 && o >= 0.0 && o <= 2.0) { solid = true; put(o == 1.0 ? G_DOT : G_CARET, 1.0, fur); return; }   // its ears, its face
    if (row == crow && o >= 0.0 && o <= 3.0) {
      solid = true;
      put(o == 3.0 ? (fract(sea.z) < 0.5 ? G_RP : G_TILDE) : (o == 0.0 ? G_LP : (o == 2.0 ? G_RP : G_UNDER)), 1.0, fur);   // its body, its tail
      return;
    }
  }
  // on the roofs: a water tank on some, an antenna with a red light (blinking on the beat) on others
  {
    float cx = (X - b.x) / b.y, up = Y - top;
    if (look > 0.78 && abs(cx - 0.4) < 0.12 && up < 3.0 * ch) {
      put(up < ch ? (cx < 0.4 ? G_SLASH : G_BACK) : (up < 2.0 * ch ? G_DARK : G_CARET), 0.9, P(rgb(80.0, 70.0, 80.0), rgb(110.0, 90.0, 80.0)));
      return;
    }
    if (look < 0.16 && abs(X - (b.x + b.y * 0.6)) < cw * 0.5 && up < 5.0 * ch) {
      bool tip = up > 4.0 * ch;
      put(tip ? G_SMALLO : G_BAR, 1.0, tip ? rgb(255.0, 60.0, 60.0) * (fract(sea.z) < 0.3 ? 1.0 : 0.35) : P(rgb(100.0, 100.0, 120.0), rgb(90.0, 90.0, 100.0)));
      return;
    }
  }
  // --- the towers behind: dark, a few windows lit, their red lights blinking on the beat
  {
    vec4 tw = tower(X);
    if (tw.z > 0.0 && Y < foot + tw.z) {
      tone = day ? 0.22 : 0.12 * smoothstep(0.9, foot, Y);
      float ry = floor((foot + tw.z - Y) / ch);
      if (ry < 1.0 && abs(X - tw.x) < cw) { put(G_SMALLO, 1.0, rgb(255.0, 60.0, 60.0) * (fract(sea.z + 0.5) < 0.3 ? 1.0 : 0.3)); return; }
      bool edge = abs(X - tw.x) > tw.y - cw;
      bool win = mod(cell.x, 2.0) < 1.0 && mod(row, 2.0) < 1.0 && h2(cell + tw.w) < 0.18;
      put(edge ? G_BAR : (win ? G_DOT : (h0 < 0.5 ? G_COLON : 0)), edge ? 0.6 : (win ? 0.9 : 0.25), win ? (day ? rgb(200.0, 180.0, 140.0) : rgb(255.0, 210.0, 130.0)) : P(rgb(44.0, 46.0, 78.0), rgb(140.0, 146.0, 166.0)));
      return;
    }
  }
  // --- the sky: low cloud, lit orange from below by the city (by day an even grey)
  float cl = fbm(vec2(X * 2.2 + time * 0.012, Y * 14.0));
  float under = smoothstep(0.95, 0.4, Y);
  if (!day) tone = 0.75 * smoothstep(0.95, foot + 0.05, Y);
  if (cl > 0.54 && h0 < (cl - 0.54) * 2.5) {
    put(cl > 0.64 ? G_TILDE : G_DASH, day ? 0.4 : 0.22 + 0.3 * under, day ? rgb(140.0, 146.0, 170.0) : mix(rgb(80.0, 74.0, 110.0), rgb(210.0, 130.0, 96.0), under * 0.75));
    return;
  }
  put(0, 0.0, vec3(0.0));
}`;

// The garden: a koi pond in spring, a red drum bridge arching over it (its reflection closing the
// ring), a cherry tree in blossom, stone lanterns lit on the far bank, a pagoda on the hill behind
// under the moon (lake.x: the far bank; lake.y: the near one). The toaster sits on top of the
// bridge and drops crumbs on each kick; the koi swim their rounds, darting on the kicks; petals fall
// thicker when the hats are busy; the lanterns breathe with the loudness. By day: a spring morning.
const GARDEN = `
// the bridge: its middle, half its span, the water line under it, its height at the top
vec4 bridgeAt(float aspect, float wide) {
  return vec4(mix(0.5, 0.64, wide) * aspect, mix(0.16, 0.2, wide), lake.y + (lake.x - lake.y) * 0.4, mix(0.1, 0.13, wide));
}
// the bridge's curve: its height over the water line at x (an arch, -1 past its ends)
float arch(float x, vec4 br) {
  float u = (x - br.x) / br.y;
  return abs(u) < 1.0 ? br.w * pow(max(0.0, 1.0 - u * u), 0.6) : -1.0;
}
// the cherry tree's blossom: clusters spread in a wide fan, a few hanging at the sides, gaps
// between (signed distance, below 0 inside), and the cluster nearest (its centre)
float crown(vec2 p, vec2 c, float r, out vec2 near) {
  float d = 9.0;
  near = c;
  for (int k = 0; k < 11; k++) {
    float fk = float(k);
    float a = 3.14159 * (k < 9 ? (0.04 + 0.92 * (fk + 0.5 * h1(fk * 1.7 + 3.0)) / 9.0) : (fk == 9.0 ? -0.06 : 1.06));
    float rr = r * (k < 9 ? 0.55 + 0.45 * h1(fk * 2.3 + 1.0) : 0.95);
    vec2 q = c + vec2(cos(a) * 1.55, sin(a) * 0.85 - 0.1) * rr;
    float dk = length((p - q) / vec2(1.25, 1.0)) - r * (0.24 + 0.12 * h1(fk * 3.1 + 2.0));
    if (dk < d) { d = dk; near = q; }
  }
  float core = length((p - c - vec2(0.0, 0.08 * r)) / vec2(1.7, 0.75)) - r * 0.42;
  if (core < d) { d = core; near = c; }
  return d + 0.012 * (vn(p.x * 70.0) - 0.5) + 0.01 * (vn(p.y * 90.0 + 3.0) - 0.5);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);
  float bank = lake.x, near = lake.y;
  vec4 br = bridgeAt(aspect, wide);
  vec3 pink = P(rgb(255.0, 150.0, 200.0), rgb(246.0, 130.0, 170.0)), pinkD = P(rgb(176.0, 70.0, 130.0), rgb(206.0, 86.0, 128.0)), pinkL = P(rgb(255.0, 214.0, 238.0), rgb(255.0, 196.0, 216.0));
  vec3 lampC = rgb(255.0, 196.0, 110.0) * (day ? 1.0 : 0.85 + 0.2 * glow);
  vec3 red = P(rgb(222.0, 70.0, 64.0), rgb(206.0, 52.0, 44.0)), redD = P(rgb(140.0, 40.0, 50.0), rgb(150.0, 40.0, 36.0));
  vec3 bark = P(rgb(74.0, 48.0, 56.0), rgb(90.0, 60.0, 50.0));
  float l1 = mix(0.22, 0.5, wide) * aspect, l2 = mix(0.86, 0.82, wide) * aspect;      // (the lanterns)

  // --- petals falling, over everything: drifting down, swaying, carried on the wind, thicker when
  // the hats are busy
  for (int k = 0; k < 2; k++) {
    float fk = float(k), G = 7.0 + 3.0 * fk;
    float sway = 2.0 * sin(row * 0.18 + time * 0.9 + fk * 2.0);
    vec2 q = vec2(cell.x - time * (1.0 + 4.0 * wind) * (1.2 - 0.3 * fk) - sway, row - time * (3.2 - 1.0 * fk));
    vec2 gi = floor(q / G), sub = floor(vec2(h2(gi + fk * 13.0), h2(gi + fk * 29.0)) * G);
    if (h2(gi + fk * 7.0) < 0.1 + 0.3 * fly && floor(q.x) - gi.x * G == sub.x && floor(q.y) - gi.y * G == sub.y) {
      float sp = h2(gi + 3.0);
      over = sp < 0.4 ? G_COMMA : (sp < 0.7 ? G_MID : G_TICK);
      overInk = 0.9 - 0.2 * fk;
      overC = mix(pink, pinkL, h2(gi + 5.0));
      break;
    }
  }

  // --- fireflies at night over the pond and the banks, wandering and blinking (more of them lit
  // when the hats are busy)
  if (!day && Y < bank + 0.06) {
    for (int k = 0; k < 10; k++) {
      float fk = float(k);
      vec2 f = vec2(h1(fk * 3.1 + 40.0) * aspect + 0.05 * sin(time * (0.2 + 0.1 * h1(fk)) + fk * 2.0),
                    near + (bank - near + 0.05) * h1(fk * 5.7 + 40.0) + 0.02 * sin(time * (0.3 + 0.2 * h1(fk * 1.9)) + fk));
      float bl = smoothstep(0.35, 1.0, 0.5 + 0.5 * sin(time * (1.3 + 1.5 * h1(fk * 4.4)) + fk * 7.0)) * (0.35 + 0.65 * fly);
      if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5 && bl > 0.08) { put(bl > 0.5 ? G_BULLET : G_MID, 0.45 + 0.55 * bl, rgb(255.0, 230.0, 128.0)); return; }
    }
  }

  // --- the cherry tree on the right: blossom in clusters (lighter on top and toward the light,
  // deeper underneath), its branches showing between them, its trunk down to the near bank
  {
    vec2 c = vec2(mix(0.84, 0.88, wide) * aspect, mix(0.56, 0.6, wide));
    float r = mix(0.15, 0.19, wide);
    vec2 q;
    float d = crown(vec2(X, Y), c, r, q);
    if (d < 0.0) {
      float k = h2(cell + 21.0);
      float lit = clamp(0.5 + (Y - q.y) / (r * 0.35) * 0.5 + (sunAt.x < c.x ? 0.15 : -0.1), 0.0, 1.0);
      int g = d > -cw * 1.2 ? (k < 0.5 ? G_STAR : G_SMALLO) : (k < 0.3 ? G_STAR : k < 0.55 ? G_PCT : k < 0.75 ? G_SMALLO : k < 0.9 ? G_AT : G_PLUS);
      put(g, 0.95, mix(pinkD, mix(pink, pinkL, lit), lit));
      return;
    }
    vec2 T = vec2(c.x + 0.06 * r / 0.2, c.y - r * 0.35);        // (where the trunk splits)
    // branches from there out to the clusters, seen in the gaps
    for (int k = 0; k < 6; k++) {
      float fk = float(k), a = 3.14159 * (0.1 + 0.8 * fk / 5.0);
      vec2 e = c + vec2(cos(a) * 1.3, sin(a) * 0.7) * r * 0.8;
      vec2 pa = vec2(X, Y) - T, ba = e - T;
      float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      if (length((pa - ba * hh) / vec2(cw, ch)) < 0.55) { float sl = ba.y / ba.x * cw / ch; put(abs(sl) > 2.5 ? G_BAR : (sl > 0.0 ? G_SLASH : G_BACK), 0.95, bark); return; }
    }
    float tb = bank, w = mix(0.022, 0.012, clamp((Y - tb) / (T.y - tb), 0.0, 1.0)) * (0.7 + 0.3 * wide);
    float tx = T.x + 0.01 * sin((Y - tb) * 18.0);
    if (Y > tb && Y < T.y && abs(X - tx) < w + cw * 0.4) {
      bool edge = abs(X - tx) > w - cw * 0.6;
      put(edge ? (X < tx ? G_LP : G_RP) : G_DARK, 1.0, bark * (edge ? 1.2 : 0.8));
      return;
    }
  }

  // --- the bridge: its girder a red band along the arch (in slope glyphs), the railing above it,
  // posts every few cells; the toaster sits on top
  float hc = arch(X, br), hl = max(arch(X - cw * 0.5, br), 0.0), hr = max(arch(X + cw * 0.5, br), 0.0);
  if (hc >= 0.0) {
    float dy = Y - br.z;
    float lo = min(hl, hr), hi = max(hl, hr), sl = (hr - hl) / ch;
    int sg = abs(sl) < 0.45 ? G_DBL : (sl > 0.0 ? G_SLASH : G_BACK);
    // the deck's top edge, the girder below it, the rail above
    if (dy > lo - ch * 0.5 && dy < hi + ch * 0.5) { put(sg, 1.0, red); return; }
    if (dy > lo - ch * 1.5 && dy < hi - ch * 0.5) { put(abs(sl) < 0.45 ? G_MEDIUM : sg, 1.0, redD); return; }
    float rail = 0.028;
    if (dy > lo + rail - ch * 0.5 && dy < hi + rail + ch * 0.5) { put(sg, 1.0, red * 1.05); return; }
    if (dy > hi && dy < hi + rail && mod(cell.x, 4.0) < 1.0) { put(G_BAR, 1.0, red); return; }
  }
  // crumbs, dropped on each kick from the top of the bridge, falling to the water
  if (sea.w > 0.02 && sea.w < 0.98) {
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      vec2 cr = vec2(br.x + 0.018 + 0.008 * fk, br.z + br.w - (1.0 - sea.w) * (br.w + 0.008 * fk));
      if (abs(X - cr.x) < cw * 0.5 && abs(Y - cr.y) < ch * 0.5) { put(G_DOT, 1.0, P(rgb(240.0, 200.0, 130.0), rgb(200.0, 140.0, 70.0))); return; }
    }
  }

  // --- the shishi-odoshi on the near bank: a bamboo spout drips into a pivoting tube; on each bar
  // it tips, pours into the stone basin under it and clacks back
  {
    float bph = fract(sea.x / 3.14159);                           // (where in the bar: the beam turns on the bars)
    float tip = bph < 0.1 ? 1.0 : 1.0 - smoothstep(0.1, 0.3, bph);
    float ang = mix(0.42, -0.55, tip) - 0.06 * bph;               // (left end up, filling; down when it tips)
    vec2 piv = vec2(mix(0.2, 0.38, wide) * aspect, near + 0.042);
    vec2 dir = vec2(-cos(ang), sin(ang));                          // (toward its open end)
    vec2 r = vec2(X, Y) - piv;
    vec3 bamboo = P(rgb(170.0, 190.0, 96.0), rgb(150.0, 170.0, 60.0));
    // (one glyph thick: in each column, the cell the tube's line crosses at its middle)
    float along = r.x / dir.x, lineY = piv.y + dir.y * along;
    if (along > -0.025 && along < 0.055 && abs(Y - lineY) < ch * 0.5) {
      int g = abs(ang) < 0.25 ? G_LINE : (ang > 0.0 ? G_BACK : G_SLASH);
      if (along > 0.048) g = G_SMALLO;                             // (its open end)
      put(g, 1.0, along > 0.048 ? bamboo * 0.6 : bamboo);
      return;
    }
    if (abs(X - piv.x) < cw * 0.5 && Y < piv.y && Y > near - 0.005) { put(G_BAR, 1.0, bark); return; }       // its post
    vec2 sp = piv + vec2(-0.03, 0.03);                             // (the feed: a bamboo spout from the left)
    if (abs(Y - sp.y) < ch * 0.5 && X > sp.x - 0.05 && X < sp.x) { put(X > sp.x - cw ? G_SMALLO : G_LINE, 1.0, bamboo * 0.85); return; }
    vec2 open = piv + dir * 0.055;
    if (tip < 0.5 && abs(X - sp.x + cw * 0.5) < cw * 0.5 && Y < sp.y && Y > open.y && fract(time * 2.0 + (sp.y - Y) * 30.0) < 0.3) { put(G_DOT, 0.9, P(rgb(170.0, 200.0, 255.0), rgb(90.0, 130.0, 200.0))); return; }
    // the basin under it, and the splash as it pours
    vec2 bs = vec2(piv.x - 0.04, near + 0.005);
    if (abs(Y - bs.y) < ch * 0.5 && abs(X - bs.x) < 0.022) { put(abs(X - bs.x) > 0.016 ? (X < bs.x ? G_BACK : G_SLASH) : G_UNDER, 1.0, P(rgb(130.0, 130.0, 150.0), rgb(130.0, 126.0, 120.0))); return; }
    if (tip > 0.3 && abs(X - bs.x) < 0.015 && Y > bs.y && Y < bs.y + 0.025 && h2(cell + floor(time * 12.0)) < 0.4 * tip) { put(G_MID, 0.9, P(rgb(190.0, 214.0, 255.0), rgb(110.0, 150.0, 210.0))); return; }
    // the clack: the tube's other end striking its stone
    vec2 tail = piv - dir * 0.025;
    if (bph < 0.06 && length(vec2(X, Y) - tail - vec2(0.0, -0.008)) < cw) { put(G_STAR, 1.0, rgb(255.0, 240.0, 200.0)); return; }
  }
  // --- irises along the near bank: blades of leaf, a violet flower atop some
  for (int i = 0; i < 3; i++) {
    float ix = (i == 0 ? 0.05 : (i == 1 ? mix(0.62, 0.46, wide) : 0.97)) * aspect;
    float dx = (X - ix) / cw;
    if (abs(dx) < 3.5 && Y > near - 0.01 && Y < near + 0.04) {
      float bladeH = 0.02 + 0.02 * h1(floor(dx) + float(i) * 7.0);
      float yb = Y - (near - 0.01);
      if (yb < bladeH) {
        bool flower = yb > bladeH - ch && h1(floor(dx) * 3.3 + float(i)) < 0.45;
        put(flower ? G_STAR : (dx < -1.0 ? G_BACK : (dx > 1.0 ? G_SLASH : G_BAR)), 0.95, flower ? P(rgb(170.0, 120.0, 255.0), rgb(110.0, 70.0, 200.0)) : P(rgb(70.0, 150.0, 90.0), rgb(60.0, 130.0, 60.0)));
        return;
      }
    }
  }

  // --- the near bank: moss and stones along the bottom
  float nb = near + 0.006 * sin(X * 11.0) + 0.004 * (vn(X * 40.0) - 0.5);
  if (Y < nb) {
    float k = h2(cell + 4.0);
    put(k < 0.1 ? G_BIGO : (k < 0.45 ? G_QUOTE : (k < 0.65 ? G_COMMA : 0)), 0.8, k < 0.1 ? P(rgb(110.0, 110.0, 130.0), rgb(140.0, 136.0, 130.0)) : P(rgb(50.0, 100.0, 76.0), rgb(80.0, 140.0, 70.0)));
    return;
  }

  // --- the pond: still water, the koi, a few lily pads, the bridge mirrored (closing the ring),
  // the lanterns and the moon drawn down it, ripples on the kicks
  if (Y < bank) {
    float depth = (bank - Y) / (bank - near);
    // the koi: little fish in ASCII (><(((o>), swimming their rounds, darting on the kicks
    for (int k = 0; k < 6; k++) {
      float fk = float(k);
      float ph = sea.y * (0.5 + 0.35 * h1(fk * 3.1)) + fk * 2.4;
      vec2 kc = vec2((0.15 + 0.75 * h1(fk * 5.7)) * aspect, near + (bank - near) * (0.12 + 0.4 * h1(fk * 7.9)));
      float ax = (0.08 + 0.1 * h1(fk * 1.3)) * aspect * 0.6;
      float fx = kc.x + ax * sin(ph), fy = kc.y + 0.02 * sin(ph * 2.0 + fk);
      bool right = cos(ph) > 0.0;
      float hc2 = floor(fx / cw), fr = floor((1.0 - fy) / ch);
      float o = right ? hc2 - cell.x : cell.x - hc2;             // (cells back from its head)
      if (row == fr && o >= 0.0 && o < 7.0) {
        int g = o == 0.0 ? (right ? G_MORE : G_LESS) : o == 1.0 ? G_SMALLO : o < 5.0 ? (right ? G_LP : G_RP) : o == 5.0 ? (right ? G_LESS : G_MORE) : (right ? G_MORE : G_LESS);
        float sk = h1(fk * 9.3);
        vec3 c = sk < 0.35 ? (mod(o, 2.0) < 1.0 ? rgb(255.0, 140.0, 60.0) : rgb(250.0, 246.0, 236.0))
               : sk < 0.6 ? rgb(255.0, 170.0, 50.0)
               : sk < 0.8 ? (o < 2.0 ? rgb(240.0, 240.0, 240.0) : (mod(o, 2.0) < 1.0 ? rgb(226.0, 60.0, 50.0) : rgb(40.0, 40.0, 50.0)))
               : rgb(230.0, 232.0, 246.0);
        put(g, 1.0, c * (day ? 0.9 : 0.85));
        return;
      }
    }
    // ripples
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.01 + q.z * 0.06, d = length(vec2(X - q.x, (Y - q.y) * 4.0)) - rad;
      if (abs(d) < cw * 0.8 && exp(-q.z * 1.2) > 0.1) { put((X - q.x) < -rad * 0.8 ? G_LP : ((X - q.x) > rad * 0.8 ? G_RP : G_DASH), 0.7, P(rgb(160.0, 190.0, 240.0), rgb(255.0, 255.0, 255.0))); return; }
    }
    // the bridge mirrored under its water line: the ring closed, broken by the water
    if (hc >= 0.0 && Y < br.z) {
      float m = br.z - Y, lo = min(hl, hr), hi = max(hl, hr);
      if (m > lo - ch * 1.5 && m < hi + ch * 0.5 && vn2(vec2(X * 30.0, row)) > 0.25) { put(G_TILDE, 0.7, red * 0.65); return; }
    }
    // petals floating on the water, drifting with the wind
    if (h2(vec2(floor(cell.x - time * (0.3 + 1.5 * wind)), row) + 77.0) < 0.012) { put(h0 < 0.5 ? G_COMMA : G_MID, 0.8, mix(pink, pinkL, h0)); return; }
    // lily pads, a few, a pink flower on some
    vec2 pg = vec2(floor(X / (cw * 9.0)), floor(Y / (ch * 3.0)));
    if (h2(pg + 2.0) < 0.05) {
      vec2 pc = (pg + 0.5 + 0.5 * (vec2(h2(pg + 4.0), h2(pg + 6.0)) - 0.5)) * vec2(cw * 9.0, ch * 3.0);
      float pd = length(vec2((X - pc.x) / 2.2, Y - pc.y));
      if (pd < ch * 0.9) {
        bool flower = h2(pg + 8.0) < 0.4 && abs(X - pc.x) < cw * 0.5 && abs(Y - pc.y) < ch * 0.5;
        put(flower ? G_STAR : (X < pc.x - cw ? G_LP : (X > pc.x + cw ? G_RP : G_UNDER)), 0.9, flower ? pinkL : P(rgb(60.0, 140.0, 90.0), rgb(70.0, 140.0, 60.0)));
        return;
      }
    }
    // the lanterns and the moon in the water
    float sd = h2(vec2(cell.x, row) + floor(time * 2.0));
    if (!day && (abs(X - l1) < cw * 1.5 || abs(X - l2) < cw * 1.5) && depth < 0.5 && sd < 0.6 - depth) { put(G_DASH, 0.8 - depth, lampC); return; }
    float path = abs(X - sunAt.x) - 0.01 - 0.05 * depth;
    if (path < 0.0 && sd > (day ? 0.6 : 0.45)) { put(sd > 0.92 ? G_STAR : (sd > 0.75 ? G_DBL : G_DASH), 0.9, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 216.0, 140.0))); return; }
    float streak = vn2(vec2((X + time * 0.002) * 12.0, row));
    put(streak > 0.86 ? G_DASH : (streak > 0.82 ? G_TILDE : 0), 0.5, P(rgb(50.0, 80.0, 150.0), rgb(80.0, 140.0, 200.0)));
    return;
  }

  // --- the stone lanterns on the far bank: a foot, a post, a ledge, the firebox lit, a flared roof,
  // a knob on top
  for (int i = 0; i < 2; i++) {
    float lx = i == 0 ? l1 : l2;
    float LH = mix(0.075, 0.095, wide), v = (Y - bank) / LH, d = abs(X - lx) / LH;
    if (v >= 0.0 && v < 1.0 && d < 0.4) {
      vec3 stone = P(rgb(140.0, 140.0, 160.0), rgb(130.0, 126.0, 120.0)), dark = stone * 0.7;
      if (v < 0.12) { if (d < 0.26) { put(G_DARK, 1.0, dark); return; } }
      else if (v < 0.44) { if (d < 0.08) { put(G_BAR, 1.0, stone); return; } }
      else if (v < 0.52) { if (d < 0.24) { put(G_DBL, 1.0, stone); return; } }
      else if (v < 0.72) {
        if (d < 0.07) { put(G_DARK, 1.0, day ? rgb(90.0, 80.0, 70.0) : lampC); return; }
        if (d < 0.17) { put(G_BAR, 1.0, stone); return; }
      } else if (v < 0.88) {
        float rw = 0.36 - (v - 0.72) * 1.6;
        if (d < rw) { put(d > rw - cw / LH ? (X < lx ? G_SLASH : G_BACK) : G_DARK, 1.0, d > rw - cw / LH ? stone : dark); return; }
      } else if (d < 0.07) { put(G_SMALLO, 1.0, stone); return; }
    }
  }

  // --- azaleas on the far bank, in round bushes; a bamboo fence behind the right lantern
  for (int i = 0; i < 3; i++) {
    float ax = (i == 0 ? mix(0.38, 0.6, wide) : (i == 1 ? mix(0.7, 0.72, wide) : mix(0.08, 0.27, wide))) * aspect;
    float rx = 0.03, ry = 0.018;
    float ad = length(vec2((X - ax) / rx, (Y - (bank + ry * 0.6)) / ry));
    if (ad < 1.0 && Y > bank) {
      float k = h2(cell + 31.0 + float(i));
      put(ad > 0.8 ? (k < 0.5 ? G_SMALLO : G_STAR) : (k < 0.4 ? G_AT : (k < 0.7 ? G_PCT : G_STAR)), 0.95,
          mix(P(rgb(170.0, 40.0, 90.0), rgb(200.0, 40.0, 80.0)), P(rgb(255.0, 110.0, 160.0), rgb(250.0, 90.0, 120.0)), clamp((Y - bank) / (ry * 1.6), 0.0, 1.0)));
      return;
    }
  }
  if (Y > bank && Y < bank + 0.04 && abs(X - l2) < 0.075 && abs(X - l2) > 0.03) {
    float v = (Y - bank) / 0.04;
    vec3 cane = P(rgb(176.0, 150.0, 100.0), rgb(170.0, 140.0, 80.0));
    if (abs(v - 0.33) < 0.12 || abs(v - 0.75) < 0.12) { put(G_DBL, 0.9, cane * 0.85); return; }
    if (mod(cell.x, 2.0) < 1.0) { put(G_BAR, 0.9, cane); return; }
  }

  // --- the far bank: grass, a stone here and there; the hills behind, their trees; the pagoda
  if (Y < bank + 0.01) { float k = h2(cell + 9.0); put(k < 0.06 ? G_BIGO : (k < 0.5 ? G_QUOTE : G_COMMA), 0.8, k < 0.06 ? P(rgb(110.0, 110.0, 130.0), rgb(140.0, 136.0, 130.0)) : P(rgb(50.0, 100.0, 76.0), rgb(80.0, 140.0, 70.0))); return; }
  {
    float px = mix(0.3, 0.42, wide) * aspect;
    float hill = bank + 0.04 + 0.05 * exp(-pow((X - px) / 0.3, 2.0)) + 0.015 * vn(X * 6.0);
    // the pagoda: five roofs, each flaring out, smaller going up, a spire on top
    float pb = bank + 0.085, PH = mix(0.14, 0.19, wide);
    float pv = (Y - pb) / PH, pd = abs(X - px) / PH;
    if (pv >= 0.0 && pv < 1.0 && pd < 0.4) {
      float tier = floor(pv * 5.0), f = fract(pv * 5.0);
      float ww = 0.24 * (1.0 - tier * 0.13);
      vec3 roof = P(rgb(70.0, 60.0, 92.0), rgb(70.0, 60.0, 70.0)), walls = P(rgb(120.0, 54.0, 60.0), rgb(176.0, 70.0, 60.0));
      if (pv > 0.92) { if (pd < 0.03) { put(G_BAR, 0.9, roof * 1.4); return; } }
      else if (f > 0.66) {
        float rw = ww * (1.0 + (1.0 - f) * 1.4);
        if (pd < rw) { put(pd > rw - cw / PH ? (X < px ? G_SLASH : G_BACK) : (f > 0.85 ? G_UNDER : G_DARK), 0.95, roof); return; }
      } else if (pd < ww * 0.62) {
        bool win = !day && f > 0.2 && f < 0.5 && mod(cell.x, 3.0) < 1.0;
        put(win ? G_DARK : G_MEDIUM, 0.85, win ? lampC * 0.8 : walls);
        return;
      }
    }
    if (Y < hill) {
      // round trees on the hills, dark
      float tk = floor(X / (cw * 5.0)), tc = (tk + 0.5) * cw * 5.0, th = 0.015 + 0.02 * h1(tk * 3.3);
      bool tree = h1(tk * 7.7) < 0.4 && length(vec2((X - tc) / 1.3, Y - (hill - 0.003))) < th;
      put(tree ? (h0 < 0.5 ? G_SMALLO : G_PCT) : (h0 < 0.25 ? G_COLON : 0), tree ? 0.8 : 0.45, tree ? P(rgb(30.0, 70.0, 64.0), rgb(60.0, 110.0, 70.0)) : P(rgb(30.0, 50.0, 64.0), rgb(110.0, 150.0, 110.0)));
      return;
    }
  }
  // --- a snow-capped peak far behind, faint in the haze, its slopes flaring out at the foot
  {
    float fx = mix(0.7, 0.62, wide) * aspect, fb = bank + 0.05, fh = mix(0.17, 0.2, wide), fw = mix(0.3, 0.36, wide);
    float u = abs(X - fx) / fw;
    float top = u < 1.0 ? fb + fh * pow(1.0 - u, 1.7) : -1.0;
    float tl = abs(X - cw * 0.5 - fx) / fw < 1.0 ? fb + fh * pow(1.0 - abs(X - cw * 0.5 - fx) / fw, 1.7) : -1.0;
    float tr = abs(X + cw * 0.5 - fx) / fw < 1.0 ? fb + fh * pow(1.0 - abs(X + cw * 0.5 - fx) / fw, 1.7) : -1.0;
    if (Y < max(max(tl, tr), top) + ch * 0.5 && (abs(top - Y) < ch * 0.5 || (Y - tl) * (Y - tr) <= 0.0) && top > 0.0) {
      float sl = (tr - tl) / ch;
      put(abs(sl) < 0.4 ? G_CARET : (sl > 0.0 ? G_SLASH : G_BACK), 0.8, P(rgb(190.0, 200.0, 240.0), rgb(130.0, 140.0, 180.0)));
      return;
    }
    if (Y < top) {
      bool snow = Y > fb + fh * 0.62 + 0.012 * (vn(X * 50.0) - 0.5);
      put(snow ? (h0 < 0.5 ? G_TRI : G_CARET) : (h0 < 0.15 ? G_DOT : (h0 < 0.22 ? G_COLON : 0)), snow ? 0.75 : 0.5, snow ? P(rgb(200.0, 210.0, 245.0), rgb(250.0, 250.0, 255.0)) * (day ? 0.8 : 0.9) : P(rgb(54.0, 62.0, 110.0), rgb(140.0, 160.0, 200.0)));
      return;
    }
  }
  sky(cell, X, Y, h0, bank + 0.08, bank + 0.1);
}`;

// The falls: a waterfall pouring between two cliffs into a pool, ferns and moss on their ledges,
// pines along their tops; the river above it running back between hills (far.x: the lip; lake.x:
// the pool's far edge; lake.y: its near bank). The water pours on the beats (faster with the
// tempo), the mist at its foot billows up on each kick, spray glints when the hats are busy, a fish
// leaps from the pool every 8 bars and on a drop; the toaster floats in the pool on an inner tube.
// By day a rainbow stands in the spray; at night, a moonbow.
const FALLS = `
// the falls' half width at y: narrow at the lip, widening as it falls
float fallW(float y) {
  float u = clamp((farL.x - y) / (farL.x - lake.x), 0.0, 1.0);
  return mix(0.06, 0.1, u);
}
// how far out from the falls' middle the rock starts on a side (s: -1 left, 1 right), at y: just
// outside the water, jutting here and there, opening out toward the pool
float rockIn(float y, float s) {
  float open = smoothstep(lake.x + 0.12, lake.x - 0.005, y);
  return fallW(y) + 0.008 + 0.016 * vn(y * 22.0 + s * 9.0) + 0.006 * vn(y * 80.0 + s * 3.0) + 0.22 * open * open;
}
// the cliff's top at dx out from the falls' middle on a side: a little over the lip by the falls,
// rising away from it, jagged
float rockTop(float dx, float s) {
  return farL.x + 0.012 + 0.11 * smoothstep(0.04, 0.5, dx) + 0.025 * (vn(dx * 7.0 + s * 4.0) - 0.5) + 0.008 * (vn(dx * 41.0 + s) - 0.5);
}
// the rock's blocks: cells round points jittered in a grid (wider than tall). At p: the nearest
// block's centre and a random value for it, how far p is inside it from its border with the next
// nearest (in units of the height), and toward that neighbour (n)
vec4 blocks(vec2 p, out vec2 n) {
  vec2 sc = vec2(0.085, 0.05), q = p / sc, i0 = floor(q);
  float d1 = 9.0, d2 = 9.0;
  vec2 c1 = vec2(0.0), c2 = vec2(0.0), g1 = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = i0 + vec2(float(i), float(j));
    vec2 c = (g + 0.15 + 0.7 * vec2(h2(g + 1.3), h2(g + 7.1))) * sc;
    float d = length(p - c);
    if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = c; g1 = g; } else if (d < d2) { d2 = d; c2 = c; }
  }
  n = normalize(c2 - c1);
  return vec4(c1, h2(g1 + 5.0), dot((c1 + c2) * 0.5 - p, n));
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);
  float cx = 0.5 * aspect, lip = farL.x, pool = lake.x, dx = abs(X - cx), sd = X < cx ? -1.0 : 1.0;
  float fw = fallW(Y), flow = sea.z;
  vec3 white = P(rgb(214.0, 230.0, 255.0), rgb(96.0, 140.0, 206.0)), blue = P(rgb(110.0, 146.0, 220.0), rgb(130.0, 176.0, 226.0));
  vec3 moss = P(rgb(70.0, 150.0, 104.0), rgb(76.0, 140.0, 64.0)), fern = P(rgb(90.0, 170.0, 110.0), rgb(90.0, 156.0, 70.0));

  // --- the mist at the falls' foot, drifting up, billowing on each kick; spray glinting in it when
  // the hats are busy; a rainbow standing in it by day, a moonbow at night
  float mr = length(vec2((X - cx) / 0.17, (Y - pool - 0.01) / 0.1));
  float mist = 0.0;
  if (mr < 1.7) {
    float n = fbm(vec2(X * 8.0 + time * 0.04, Y * 13.0 - time * 0.45));
    mist = smoothstep(1.7, 0.15, mr) * (0.34 + 0.45 * sea.w + 0.15 * glow) * (0.55 + 0.9 * n);
    // the bow: an arc over the foot, red outside to violet in
    vec2 bc = vec2(cx + 0.02, pool - 0.08);
    float R = mix(0.17, 0.23, wide), br = (length((vec2(X, Y) - bc) * vec2(0.85, 1.0)) - R) / 0.04;
    if (abs(br) < 1.0 && Y > pool - 0.02) {
      float vis = (0.22 + 0.78 * smoothstep(0.04, 0.3, mist)) * (day ? 1.0 : 0.55);
      if (h0 < vis * 0.9) {
        float k = (br + 1.0) * 0.5;               // (0 inside, 1 outside)
        vec3 c = day ? (k > 0.83 ? rgb(232.0, 70.0, 70.0) : k > 0.66 ? rgb(250.0, 150.0, 60.0) : k > 0.5 ? rgb(240.0, 210.0, 70.0) : k > 0.33 ? rgb(90.0, 190.0, 100.0) : k > 0.17 ? rgb(80.0, 140.0, 230.0) : rgb(150.0, 100.0, 220.0))
                     : mix(rgb(170.0, 180.0, 220.0), rgb(236.0, 240.0, 255.0), k);
        tone = day ? 0.0 : 0.2;
        put(h0 < vis * 0.4 ? G_COLON : G_MID, 0.5 + 0.4 * vis, c);
        return;
      }
    }
    float glint = h2(cell + floor(time * 9.0));
    if (glint > 0.992 - 0.03 * fly * smoothstep(1.4, 0.3, mr)) { put(glint > 0.998 ? G_SPARK : G_TICK, 1.0, P(rgb(240.0, 246.0, 255.0), rgb(120.0, 160.0, 220.0))); return; }
    if (h0 < mist * 0.75) {
      tone = day ? 0.3 * mist : 0.25 * mist;
      put(h0 < mist * 0.3 ? G_COLON : (h0 < mist * 0.55 ? G_MID : G_DOT), 0.4 + 0.4 * mist, P(rgb(190.0, 206.0, 240.0), rgb(140.0, 160.0, 196.0)));
      return;
    }
  }

  // --- the fish leaping (every 8 bars, and on a drop): up out of the pool beside the foot of the
  // falls and back in, a splash where it leaves and where it lands
  if (leap.w > 0.5 && leap.x < 1.3) {
    float u = leap.x / 1.0, x0 = cx + leap.y * 0.15, x1 = cx + leap.y * 0.06;
    vec2 f = vec2(mix(x0, x1, u), pool - 0.02 + 0.16 * sin(3.14159 * clamp(u, 0.0, 1.0)));
    if (u < 1.0) {
      float hc = floor(f.x / cw), fr = floor((1.0 - f.y) / ch);
      float o = (hc - cell.x) * -leap.y;          // (cells back from its head, its tail behind it)
      if (row == fr && o >= 0.0 && o < 3.0) {
        bool lt = leap.y > 0.0;                  // (heading left, toward the falls)
        int g = o == 0.0 ? (lt ? G_LESS : G_MORE) : o == 1.0 ? (lt ? G_MORE : G_LESS) : (lt ? G_LESS : G_MORE);
        put(g, 1.0, P(rgb(255.0, 170.0, 150.0), rgb(220.0, 110.0, 90.0)));
        return;
      }
    }
    for (int i = 0; i < 2; i++) {
      float age = leap.x - float(i);
      vec2 sp = vec2(i == 0 ? x0 : x1, pool - 0.02);
      if (age > 0.0 && age < 0.35 && abs(Y - sp.y - 0.01) < ch * 1.2 && abs(X - sp.x) < cw * (1.0 + age * 8.0) && h0 < 0.7 - 2.0 * age) { put(Y > sp.y + 0.005 ? G_TICK : G_STAR, 1.0, white); return; }
    }
  }

  // --- the near bank, along the bottom: stones and grass
  if (Y < lake.y) {
    float k = h2(cell + 4.0);
    put(k < 0.14 ? G_BIGO : (k < 0.3 ? G_SMALLO : (k < 0.55 ? G_QUOTE : (k < 0.7 ? G_COMMA : 0))), 0.8, k < 0.3 ? P(rgb(110.0, 110.0, 134.0), rgb(130.0, 126.0, 120.0)) : moss);
    return;
  }

  // --- the pool: churning white at the falls' foot, the current spreading out from it in rings
  // that move on the beats, ripples on the kicks, the falls drawn down it, boulders at its sides
  if (Y < pool) {
    tone = day ? 0.3 : 0.05;
    float footW = fallW(pool) * 1.3;
    float mound = pool - 0.03 * (1.0 - smoothstep(0.0, footW * 1.6, dx)) - 0.006 * vn(X * 60.0 + time * 4.0);
    if (dx < footW * 1.7 && Y > mound - 0.012 && Y > pool - 0.045) {
      float k = h2(cell + floor(time * 14.0));
      float hot = 1.0 - dx / (footW * 1.7);
      put(k < 0.3 * hot ? G_AT : (k < 0.5 * hot ? G_PCT : (k < 0.62 ? G_SMALLO : (k < 0.8 ? G_STAR : G_MID))), 0.6 + 0.4 * hot, white);
      return;
    }
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.01 + q.z * 0.07, d = length(vec2(X - q.x, (Y - q.y) * 4.0)) - rad;
      if (abs(d) < cw * 0.8 && exp(-q.z * 1.2) > 0.1) { put((X - q.x) < -rad * 0.8 ? G_LP : ((X - q.x) > rad * 0.8 ? G_RP : G_DASH), 0.7, white); return; }
    }
    // boulders along its far edge, out from the falls: round, outlined, moss on top, the water
    // lapping at their feet
    if (dx > fallW(pool) * 1.8 && Y > pool - 0.045) {
      float S = cw * 10.0, k = floor(X / S);
      for (int j = -1; j <= 1; j++) {
        float kk = k + float(j);
        if (h1(kk * 3.9 + 1.0) > 0.55) continue;
        float r = 0.012 + 0.012 * h1(kk * 5.3), bx = (kk + 0.5 + 0.3 * (h1(kk * 2.1) - 0.5)) * S, by = pool - 0.035 + 0.01 * h1(kk * 7.7), cut = by - r * 0.3;
        #define INB(p) (length(vec2(((p).x - bx) / (r * 1.7), ((p).y - by) / r)) < 1.0 && (p).y > cut)
        vec2 P0 = vec2(X, Y);
        if (INB(P0)) {
          vec3 stone = P(rgb(110.0, 110.0, 150.0), rgb(124.0, 118.0, 110.0));
          int g = edge4(!INB(P0 + vec2(0.0, ch)), false, !INB(P0 - vec2(cw, 0.0)), !INB(P0 + vec2(cw, 0.0)));
          if (Y < cut + ch && g == 0) g = h0 < 0.5 ? G_TILDE : G_DASH;              // (the water lapping at its foot)
          if (g == G_DASH || g == G_DOT) { put(h0 < 0.5 ? G_QUOTE : G_COMMA, 0.95, moss); return; }   // (moss along its top)
          if (g != 0) { put(g, 0.95, Y < cut + ch && g != G_LP && g != G_RP ? white : stone); return; }
          put((Y - by) / r < 0.2 && h0 < 0.4 ? G_LIGHT : (h0 < 0.15 ? G_DOT : 0), 0.7, stone * 0.8);
          return;
        }
      }
    }
    // the falls drawn down the water, broken
    if (dx < fallW(pool) * 1.2 && Y > pool - 0.1 && vn2(vec2(X * 50.0, row + time * 6.0)) > 0.4) { put(G_APPROX, 0.6, blue); return; }
    // the current: rings spreading out from the foot, moving on the beats
    float rr = length(vec2((X - cx) * 0.55, (Y - pool) * 2.6));
    float ring = fract(rr * 9.0 - flow * 0.5);
    if (ring < 0.12 && vn2(vec2(X * 20.0, row)) > 0.35) { put(ring < 0.06 ? G_TILDE : G_DASH, 0.55, blue); return; }
    float path = abs(X - sunAt.x) - 0.01 - 0.05 * (pool - Y) / (pool - lake.y);
    float tw = h2(vec2(cell.x, row) + floor(time * 2.0));
    if (path < 0.0 && tw > (day ? 0.62 : 0.5)) { put(tw > 0.92 ? G_STAR : G_DASH, 0.85, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 216.0, 140.0))); return; }
    put(h0 < 0.06 ? G_DASH : 0, 0.4, P(rgb(50.0, 74.0, 140.0), rgb(90.0, 140.0, 200.0)));
    return;
  }

  // --- the falls: strands of water pouring from the lip, each column its own, streaking down on
  // the beats, brightest at the middle, ragged at the edges, curving over at the lip
  if (dx < fw + cw && Y < lip + ch) {
    float e = dx / fw;                                         // (0 at the middle, 1 at the edge)
    if (Y > lip - 2.0 * ch) {                                 // the lip: the water swelling as it curves over
      if (e < 1.0) { put(e > 0.86 ? (X < cx ? G_LP : G_RP) : (Y > lip - ch ? (h0 < 0.5 ? G_TILDE : G_APPROX) : G_DBL), 1.0, white); return; }
    } else {
      float col = cell.x, sp = 3.0 + 1.6 * h1(col * 1.3);
      float v = vn(row * 0.35 / sp * 4.0 - flow * sp * 1.4 + h1(col) * 40.0);
      float dens = (1.0 - e * e * 0.7) * (0.75 + 0.3 * glow);
      if (e < 1.0 && v < dens) {
        tone = day ? 0.35 : 0.3;
        float b = dens - v;
        int g = b > 0.45 ? G_BAR : (b > 0.25 ? G_COLON : (b > 0.1 ? G_TICK : G_DOT));
        put(g, 0.55 + 0.45 * min(1.0, b * 2.0), mix(blue, white, clamp(1.1 - e, 0.0, 1.0)));
        return;
      }
      if (e < 1.0 + cw / fw) { tone = day ? 0.2 : 0.12; put(h0 < 0.3 ? G_TICK : 0, 0.5, blue); return; }
    }
  }

  // --- the cliffs: an outline like a pen's along their tops and down by the falls; the rock inside
  // in sparse strata and stipple, denser and darker into the gorge; ledges with moss and bushes, a
  // few ferns hanging; grass along the tops, pines out from the falls
  {
    float top = rockTop(dx, sd), inner = rockIn(Y, sd), e = dx - inner;
    vec3 ink = P(rgb(150.0, 146.0, 200.0), rgb(150.0, 110.0, 82.0));
    if (Y < top + ch * 0.5 && e > -cw * 0.5 && Y > pool - 0.005) {
      float tl = rockTop(abs(X - cw * 0.5 - cx), sd), tr = rockTop(abs(X + cw * 0.5 - cx), sd);
      bool across = abs(top - Y) <= 0.5 * ch, down = (Y - tl) * (Y - tr) <= 0.0;
      if (across || down) {
        float sl = (tr - tl) / ch;
        put(abs(sl) < 0.4 ? (h0 < 0.5 ? G_UNDER : G_DASH) : (sl > 0.0 ? G_SLASH : G_BACK), 0.95, ink);
        return;
      }
      if (Y < top && e < cw) { put(G_BAR, 0.9, ink * 0.85); return; }
      if (Y < top) {
        tone = day ? 0.18 : 0.03;
        float into = smoothstep(0.3, 0.0, e);           // (1 by the falls, 0 out at the sides)
        float dTop = top - Y;
        if (dTop < ch * 1.5) { put(h0 < 0.06 ? G_STAR : (h0 < 0.55 ? G_QUOTE : G_COMMA), 0.95, h0 < 0.06 ? P(rgb(255.0, 214.0, 122.0), rgb(232.0, 70.0, 82.0)) : moss); return; }
        // the rock: blocks outlined where they meet, each lit along its top and shaded toward its
        // foot, darker into the gorge; some grown over with moss and a bush; ferns from a few cracks
        vec2 nn;
        vec4 bl = blocks(vec2(X + sd * 3.1, Y), nn);
        vec3 shadow = P(rgb(50.0, 52.0, 92.0), rgb(120.0, 88.0, 70.0));
        float ext = 0.5 * (abs(nn.x) * cw + abs(nn.y) * ch);         // (a cell's half reach across the crack)
        bool mine = dot(nn, vec2(0.38, -0.92)) > 0.0;                 // (each crack drawn from one side)
        if (bl.w < ext && mine) {
          float tx = -nn.y / cw, ty = nn.x / ch, sl = ty / (abs(tx) + 1e-4) * sign(tx);
          int g = abs(sl) < 0.45 ? G_UNDER : (abs(sl) > 2.4 ? G_BAR : (sl > 0.0 ? G_SLASH : G_BACK));
          // a fern hanging from a few of the cracks along the bottoms of blocks
          put(g, 0.95, mix(ink, shadow, 0.35 * into));
          return;
        }
        float v = (Y - bl.y) / 0.05;                                   // (up the block: -1 at its foot, 1 at its top)
        bool mossy = bl.z < 0.16;
        if (mossy) {
          // grown over: moss all through, a bush on top
          if (v > 0.25 && h0 < 0.75) { put(h0 < 0.35 ? G_AT : (h0 < 0.6 ? G_PCT : G_SMALLO), 0.9, mix(moss * 0.75, fern, clamp(v, 0.0, 1.0))); return; }
          if (h0 < 0.5) { put(h0 < 0.2 ? G_QUOTE : G_COMMA, 0.85, moss * 0.9); return; }
          put(0, 0.0, vec3(0.0));
          return;
        }
        if (bl.z > 0.93 && v < -0.45 && abs(X - bl.x) < cw * 2.5) { put(mod(cell.x, 2.0) < 1.0 ? G_LP : G_RP, 0.85, fern); return; }
        // drips running down the wet rock beside the falls
        float dp = fract(time * 1.3 + h1(cell.x * 2.7)) * 12.0 - mod(row, 12.0);
        if (e < 0.05 && dp > 0.0 && dp < 0.9 && h1(cell.x * 5.1) < 0.35) { put(G_TICK, 0.9, blue); return; }
        // lit along its top (catching the light), shaded toward its foot; the gorge darker
        float shade = clamp(0.5 - 0.5 * v + 0.5 * into + 0.25 * (bl.z - 0.5), 0.0, 1.0);
        float dens = day ? 0.05 + 0.42 * shade * shade : 0.08 + 0.6 * shade * shade;
        if (h0 < dens) {
          int g = shade > 0.72 ? (day ? (h0 < dens * 0.45 ? G_COLON : G_LIGHT) : (h0 < dens * 0.45 ? G_MEDIUM : G_LIGHT)) : shade > 0.45 ? (h0 < dens * 0.5 ? G_COLON : G_DOT) : (mod(cell.x + row, 2.0) < 1.0 ? (sd < 0.0 ? G_HATCHB : G_HATCH) : G_TICK);
          put(g, 0.75, mix(ink, shadow, shade));
          return;
        }
        put(0, 0.0, vec3(0.0));
        return;
      }
    }
    // pines along the tops, out from the falls
    if (dx > 0.1) {
      float S = cw * 5.0, k = floor(X / S), tx = (k + 0.5 + 0.5 * (h1(k * 1.3) - 0.5)) * S;
      float th = (0.03 + 0.06 * h1(k * 2.7)) * (0.6 + 0.6 * smoothstep(0.1, 0.6, abs(tx - cx))), tb = rockTop(abs(tx - cx), tx < cx ? -1.0 : 1.0) - 0.004;
      float n = 3.0 + floor(th * 30.0), pw = pineW((Y - tb) / th, th * 0.34, n);
      if (h1(k * 9.1) < 0.85 && abs(X - tx) < pw) {
        bool lf = abs(X - cw - tx) >= pw, rt = abs(X + cw - tx) >= pw;
        put(lf && rt ? G_CARET : lf ? G_SLASH : rt ? G_BACK : (h0 < 0.5 ? G_TRI : G_CARET), 0.95, P(rgb(40.0, 100.0, 80.0), rgb(40.0, 100.0, 60.0)));
        return;
      }
    }
  }

  // --- above the lip: the river running back between the hills, narrowing; the hills behind
  if (Y < lip + 0.05 && Y >= lip) {
    float rw = fallW(lip) * (1.0 - (Y - lip) / 0.05);
    if (dx < rw) { put(h0 < 0.4 ? G_TILDE : (h0 < 0.7 ? G_DASH : 0), 0.7, white); return; }
  }
  {
    vec4 pk = peak(1, X);
    if (Y < pk.x) {
      bool edge = pk.x - Y < ch;
      put(edge ? (h0 < 0.5 ? G_UNDER : G_DASH) : (h0 < 0.3 ? G_COLON : (h0 < 0.4 ? G_DOT : 0)), 0.6, P(rgb(56.0, 64.0, 110.0), rgb(120.0, 140.0, 170.0)));
      return;
    }
  }
  sky(cell, X, Y, h0, lip + 0.03, lip + 0.06);
}`;

// Halloween: a graveyard on a hill under a great moon, a dark wood along the hill behind, a bare tree
// reaching across the moon; the toaster flies across it on a broomstick in a witch's hat. Bats
// flutter round the moon (more of them when the hats are busy), wisps of cloud drift over it, mist
// creeps between the graves, will-o'-the-wisps blink among them, jack-o'-lanterns grin at the front,
// flaring on each kick, and every 8 bars (and on a drop) a ghost rises from a grave. (moon: its
// centre and radius; lake.x: the hill's top behind the graves; lake.y: the graveyard's front.) By
// day it's dusk: the moon a great orange sun, everything else in silhouette.
const HALLOWEEN = `
// the hill the wood stands on, behind the graves
float hillTop(float x) { return lake.x + 0.022 * sin(x * 2.3 + 1.0) + 0.012 * (vn(x * 9.0) - 0.5); }
// the wood along the hill: pines of all heights, crowded. In one at p?
bool woodAt(vec2 p) {
  float S = cw * 3.0, k0 = floor(p.x / S);
  for (int j = -3; j <= 3; j++) {
    float k = k0 + float(j), r = h1(k * 2.7 + 11.0);
    float cx = (k + 0.5 + 0.8 * (h1(k * 1.3 + 11.0) - 0.5)) * S;
    float th = (0.06 + 0.14 * r * r) * mix(0.65, 1.0, clamp((view.x / view.y - 0.56) / 1.22, 0.0, 1.0)), base = hillTop(cx) - 0.012;
    if (abs(p.x - cx) < pineW((p.y - base) / th, th * 0.3, 3.0 + floor(th * 30.0))) return true;
  }
  return false;
}
// the bare tree: its limbs (from, to, in units of its size from its foot) and their thickness
const vec4 LIMB[11] = vec4[11](
  vec4(0.0, 0.0, -0.015, 0.16), vec4(-0.015, 0.16, 0.005, 0.3),
  vec4(0.005, 0.3, -0.13, 0.42), vec4(-0.13, 0.42, -0.23, 0.43), vec4(-0.13, 0.42, -0.17, 0.52),
  vec4(0.005, 0.3, 0.0, 0.46), vec4(0.0, 0.46, -0.05, 0.55),
  vec4(-0.015, 0.16, -0.16, 0.22), vec4(-0.16, 0.22, -0.27, 0.2), vec4(-0.16, 0.22, -0.2, 0.3),
  vec4(0.005, 0.3, 0.08, 0.38));
const float LIMBW[11] = float[11](0.024, 0.017, 0.007, 0.003, 0.003, 0.006, 0.003, 0.007, 0.003, 0.003, 0.004);
// in the tree at p (its foot at T, its size sc)? Its glyph (0 if not): the edges by the limb's slope,
// the middle of a thick limb solid (inside 1)
int treeAt(vec2 p, vec2 T, float sc, out float inside) {
  inside = 0.0;
  float best = 9.0, bsl = 0.0;
  for (int i = 0; i < 11; i++) {
    vec4 L = LIMB[i] * sc;
    vec2 a = T + L.xy, b = T + L.zw, pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length((pa - ba * h) / vec2(cw, ch)) - LIMBW[i] * sc / ch * (1.0 - 0.4 * h);
    if (d < best) { best = d; bsl = ba.y / (abs(ba.x) < 1e-5 ? 1e-5 : ba.x) * cw / ch; }
  }
  if (best > 0.5) return 0;
  if (best < -1.0) { inside = 1.0; return G_DARK; }
  return abs(bsl) > 2.4 ? G_BAR : (abs(bsl) < 0.4 ? G_UNDER : (bsl > 0.0 ? G_SLASH : G_BACK));
}
// the jack-o'-lanterns' art (see PUMPKIN_ART): kind 0 the big one, 1 and 2 the small ones. The glyph
// at column o, row r from its top left (0 if none); part 1 its outline, 2 its face, 3 its stem, 4 its
// body
${pumpkinArrays()}
int pumpkinAt(int kind, int o, int r, out int part) {
  part = 0;
  int w = kind == 0 ? 19 : 9, h = kind == 0 ? 6 : 4;
  if (o < 0 || o >= w || r < 0 || r >= h) return 0;
  int i = r * w + o;
  int v = kind == 0 ? PK0[i] : (kind == 1 ? PK1[i] : PK2[i]);
  part = v / 64;
  return v - part * 64;
}
// a gravestone, the column of its left side and the row of its foot at at; its kind: 0 a headstone
// (RIP), 1 a small one, 2 a cross. Its glyph at the cell (0 if none); face 1 on its face
int stone(vec2 cell, float row, vec2 at, float kind, out float face) {
  face = 0.0;
  float o = cell.x - at.x, rr = at.y - row;                     // (columns from its left side, rows up from its foot)
  if (kind > 2.5) {
    // a big one, its shoulders rounded:  .---.  .'   '.  | RIP |  |     |  |_____|
    if (o < 0.0 || o > 6.0 || rr < 0.0 || rr > 4.0) return 0;
    if (rr == 4.0) return o == 1.0 || o == 5.0 ? G_DOT : (o > 1.0 && o < 5.0 ? G_DASH : 0);
    if (rr == 3.0) { if (o == 0.0 || o == 6.0) return G_DOT; if (o == 1.0 || o == 5.0) return G_TICK; face = 1.0; return 0; }
    if (o == 0.0 || o == 6.0) return G_BAR;
    face = 1.0;
    if (rr == 2.0) return o == 2.0 ? G_LR : (o == 3.0 ? G_LI : (o == 4.0 ? G_LP2 : 0));
    return rr == 0.0 ? G_UNDER : 0;
  }
  if (kind < 0.5) {
    if (o < 0.0 || o > 4.0 || rr < 0.0 || rr > 3.0) return 0;
    if (rr == 3.0) return o == 0.0 || o == 4.0 ? G_DOT : G_DASH;
    if (o == 0.0 || o == 4.0) return G_BAR;
    face = 1.0;
    if (rr == 2.0) return o == 1.0 ? G_LR : (o == 2.0 ? G_LI : G_LP2);
    return rr == 0.0 ? G_UNDER : 0;
  }
  if (kind < 1.5) {
    if (o < 0.0 || o > 2.0 || rr < 0.0 || rr > 2.0) return 0;
    if (rr == 2.0) return o == 1.0 ? G_DASH : G_DOT;
    if (o != 1.0) return G_BAR;
    face = 1.0;
    return rr == 1.0 ? G_PLUS : G_UNDER;
  }
  if (o < 0.0 || o > 2.0 || rr < 0.0 || rr > 3.0) return 0;
  if (rr == 2.0) return o == 1.0 ? G_PLUS : G_DASH;
  return o == 1.0 ? G_BAR : 0;
}
// the graves: x in a tall window, in a wide one (shares of the width); where (0 at the graveyard's
// front, 1 at the hill's top); which kind
const vec4 STONES[11] = vec4[11](
  vec4(0.06, 0.46, 0.14, 1.0), vec4(0.46, 0.79, 0.12, 3.0), vec4(0.64, 0.88, 0.16, 2.0), vec4(0.9, 0.52, 0.2, 3.0),
  vec4(0.3, 0.55, 0.6, 1.0), vec4(0.4, 0.61, 0.66, 2.0), vec4(0.7, 0.69, 0.58, 0.0), vec4(0.84, 0.75, 0.64, 1.0),
  vec4(0.18, 0.84, 0.6, 0.0), vec4(0.56, 0.95, 0.66, 2.0), vec4(0.04, 0.42, 0.62, 2.0));
// the jack-o'-lanterns: x tall, x wide, foot (its bottom row), -
const vec4 PUMPS[3] = vec4[3](vec4(0.22, 0.63, 0.025, 1.0), vec4(0.4, 0.72, 0.025, 1.0), vec4(0.76, 0.55, 0.03, 1.0));
// where jack-o'-lantern i's art sits: its left column, its top row, its width, its height (0 wide if
// it's left out: the small ones in a small window)
vec4 pumpkinBox(int i, float aspect, float wide) {
  vec4 pk = PUMPS[i];
  float w = i == 0 ? 19.0 : 9.0, h = i == 0 ? 6.0 : 4.0;
  if (i > 0 && view.y < 520.0) return vec4(0.0);
  return vec4(floor(mix(pk.x, pk.y, wide) * aspect / cw) - floor(w / 2.0), floor((1.0 - pk.z) / ch) - (h - 1.0), w, h);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);
  vec2 Pp = vec2(X, Y), mc = moon.xy;
  float R = moon.z, r = length(Pp - mc) / R;
  float mtone = r < 1.0 ? 0.62 + 0.3 * (1.0 - r * r) : 0.0;     // (the moon's light on the paper)
  vec3 SIL = P(rgb(14.0, 9.0, 20.0), rgb(48.0, 28.0, 38.0));       // (silhouettes against it)
  vec3 RIM = P(rgb(86.0, 76.0, 118.0), rgb(58.0, 36.0, 46.0));     // (their edges, off the moon)
  vec3 moonC = P(rgb(248.0, 238.0, 210.0), rgb(214.0, 84.0, 40.0)), moonD = P(rgb(180.0, 168.0, 156.0), rgb(236.0, 128.0, 60.0));

  // --- sparkles trailing behind the broom: twinkling, drifting down as they fall behind, fading
  // (more of them when the hats are busy)
  if (car.w > 0.5) {
    for (int k = 0; k < 12; k++) {
      float fk = float(k);
      if (h1(fk * 4.7 + 1.0) > 0.45 + 0.55 * fly) continue;
      float u = fract(time * (0.5 + 0.25 * h1(fk * 2.3)) + h1(fk * 7.9));
      vec2 sp = car.xy + vec2(-u * 0.13 - 0.005, -0.03 * u * u + 0.012 * sin(u * 8.0 + fk * 2.0) * u);
      if (abs(X - sp.x) < cw * 0.5 && abs(Y - sp.y) < ch * 0.5) {
        float tw = 0.6 + 0.4 * sin(time * 9.0 + fk * 3.0);
        tone = mtone;
        put(u < 0.3 ? G_STAR : (u < 0.65 ? G_MID : G_DOT), (1.0 - 0.8 * u) * tw, P(r < 1.0 ? rgb(150.0, 70.0, 230.0) : rgb(214.0, 160.0, 255.0), rgb(110.0, 40.0, 150.0)));
        return;
      }
    }
  }

  // --- a ghost rising from a grave every 8 bars (and on a drop), swaying, its hem fluttering,
  // fading away as it goes up
  if (leap.w > 0.5 && leap.x < 4.5) {
    vec4 st = STONES[min(10, int(floor(leap.z * 11.0)))];
    float age = leap.x, a = smoothstep(0.0, 0.4, age) * (1.0 - smoothstep(3.0, 4.5, age));
    vec2 gc = vec2(mix(st.x, st.y, wide) * aspect + 0.015 * sin(age * 2.5), mix(lake.y, lake.x, st.z) + 0.06 + age * 0.055);
    float o = cell.x - (floor(gc.x / cw) - 3.0), rr = row - floor((1.0 - gc.y) / ch);   // (columns from its left, rows down from its top)
    if (a > 0.05 && o >= 0.0 && o <= 6.0 && rr >= 0.0 && rr <= 4.0) {
      int g = 0;
      if (rr == 0.0) g = o == 0.0 || o == 6.0 ? 0 : (o == 1.0 || o == 5.0 ? G_DOT : G_DASH);
      else if (rr == 1.0) g = o == 0.0 ? G_LP : (o == 6.0 ? G_RP : (o == 2.0 || o == 4.0 ? G_SMALLO : 0));
      else if (rr == 2.0) g = o == 0.0 || o == 6.0 ? G_BAR : (o == 3.0 ? G_BIGO : 0);
      else if (rr == 3.0) g = o == 0.0 || o == 6.0 ? G_BAR : 0;
      else g = mod(o + floor(age * 4.0), 2.0) < 1.0 ? G_BACK : G_SLASH;                    // (its hem, fluttering)
      if (rr >= 1.0 && rr <= 3.0 && o >= 1.0 && o <= 5.0) tone = 0.9 * a;                    // (its body, pale)
      bool hole = (rr == 1.0 || rr == 2.0) && o > 0.0 && o < 6.0;                             // (its eyes and its mouth, dark)
      if (g != 0 || tone > 0.0) { put(g, a, hole ? P(rgb(40.0, 30.0, 60.0), rgb(60.0, 50.0, 70.0)) : P(rgb(232.0, 240.0, 255.0), rgb(110.0, 110.0, 150.0))); return; }
    }
  }

  // --- the jack-o'-lanterns at the front: their faces lit from inside (flickering, flaring on each
  // kick, brighter with the loudness); by day unlit
  for (int i = 0; i < 3; i++) {
    vec4 bx = pumpkinBox(i, aspect, wide);
    if (bx.z == 0.0) continue;
    int part;
    int g = pumpkinAt(i, int(cell.x - bx.x), int(row - bx.y), part);
    if (part == 4) { put(0, 0.0, vec3(0.0)); return; }                   // (its body: dark, in the candle's glow)
    if (part != 0) {
      // (the candle inside: flickering, flaring on the kick, brighter with the loudness)
      float fl = 0.82 + 0.18 * sin(time * 11.0 + float(i) * 2.0) * sin(time * 6.7 + float(i));
      vec3 lit = mix(rgb(255.0, 150.0, 40.0), rgb(255.0, 236.0, 150.0), clamp(0.35 + 0.5 * sea.w + 0.2 * glow, 0.0, 1.0)) * fl;
      vec3 c = part == 3 ? P(rgb(120.0, 140.0, 70.0), rgb(90.0, 80.0, 40.0))
             : part == 2 ? (day ? rgb(70.0, 34.0, 24.0) : lit)
             : P(rgb(236.0, 116.0, 32.0), rgb(206.0, 90.0, 24.0));
      if (part == 2 && !day) tone = 0.22 * fl;                          // (a glow in the carved holes)
      put(g, 1.0, c);
      return;
    }
  }

  // --- the bare tree at the edge, its limbs reaching across the moon: black against it, rimmed off it
  {
    float inside;
    vec2 T = vec2(mix(0.92, 0.93, wide) * aspect, mix(lake.y, lake.x, 0.2));
    int g = treeAt(Pp, T, mix(0.95, 1.2, wide), inside);
    if (g != 0) {
      if (r < 1.0) { tone = inside > 0.5 ? 0.0 : mtone; put(inside > 0.5 && h0 < 0.06 ? G_TICK : g, 1.0, inside > 0.5 && h0 < 0.06 ? RIM * 0.6 : SIL); }
      else put(g, inside > 0.5 ? 1.0 : 0.85, inside > 0.5 ? SIL : RIM);
      return;
    }
  }

  // --- will-o'-the-wisps among the graves at night, wandering, blinking (more of them when the hats
  // are busy)
  if (!day) for (int k = 0; k < 5; k++) {
    float fk = float(k);
    vec2 f = vec2((0.1 + 0.85 * h1(fk * 3.7 + 20.0)) * aspect + 0.04 * sin(time * (0.17 + 0.08 * h1(fk)) + fk * 2.0),
                  mix(lake.y, lake.x, 0.15 + 0.6 * h1(fk * 5.1 + 20.0)) + 0.012 * sin(time * (0.5 + 0.3 * h1(fk * 1.9)) + fk));
    float b = smoothstep(0.3, 1.0, 0.5 + 0.5 * sin(time * (1.1 + h1(fk * 4.4)) + fk * 7.0)) * (0.3 + 0.7 * fly);
    if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5 && b > 0.08) { put(b > 0.5 ? G_BULLET : G_MID, 0.4 + 0.6 * b, rgb(150.0, 255.0, 210.0)); return; }
  }

  // --- the graves: headstones, small stones, crosses, pale in the moonlight
  for (int i = 0; i < 11; i++) {
    vec4 st = STONES[i];
    vec2 at = vec2(floor(mix(st.x, st.y, wide) * aspect / cw), floor((1.0 - mix(lake.y, lake.x, st.z)) / ch));
    float sw = st.w > 2.5 ? 7.0 : (st.w < 0.5 ? 5.0 : 3.0), sh = st.w > 2.5 ? 5.0 : (st.w > 1.5 || st.w < 0.5 ? 4.0 : 3.0);
    bool clash = false;
    for (int j = 0; j < 3; j++) {
      vec4 bx = pumpkinBox(j, aspect, wide);
      if (bx.z > 0.0 && at.x <= bx.x + bx.z && at.x + sw >= bx.x - 1.0 && at.y >= bx.y - 1.0 && at.y - sh <= bx.y + bx.w) clash = true;
    }
    if (clash) continue;
    float face;
    int g = stone(cell, row, at, st.w, face);
    if (g != 0 || face > 0.5) {
      tone = face > 0.5 ? (day ? 0.0 : 0.22) : 0.0;
      put(g, 0.95, face > 0.5 && g != G_UNDER ? P(rgb(130.0, 126.0, 164.0), rgb(90.0, 80.0, 90.0)) : P(rgb(176.0, 172.0, 204.0), rgb(70.0, 60.0, 70.0)));
      return;
    }
  }

  // --- mist creeping along the ground between the graves and at the foot of the wood, drifting with
  // the wind
  {
    float drift = fbm(vec2(X * 3.0 - time * (0.01 + 0.03 * wind), Y * 22.0));
    float m = exp(-pow((Y - (lake.y + 0.06)) / 0.03, 2.0)) * 0.8 + exp(-pow((Y - (lake.x - 0.012)) / 0.018, 2.0)) * 0.6;
    m *= (0.2 + 0.8 * smoothstep(0.35, 0.7, drift)) * (0.8 + 0.4 * glow);
    if (h0 < m * 0.3) { tone = 0.12 * m; put(h0 < m * 0.24 ? G_TILDE : G_DASH, 0.3 + 0.4 * m, P(rgb(150.0, 140.0, 196.0), rgb(196.0, 170.0, 170.0))); return; }
  }

  // --- the graveyard's ground: dead grass, fallen leaves; the hill's edge drawn
  float ht = hillTop(X);
  if (Y < ht + 0.5 * ch) {
    if (Y < ht) {
      float k = h2(cell + 4.0);
      int g = k < 0.03 ? G_COMMA : (k < 0.055 ? G_TICK : (k < 0.085 ? G_DOT : 0));
      put(g, 0.55, k < 0.055 ? P(rgb(80.0, 90.0, 70.0), rgb(80.0, 66.0, 40.0)) : P(rgb(150.0, 80.0, 40.0), rgb(160.0, 80.0, 36.0)));
      return;
    }
  }

  // --- the wood along the hill: black against the moon (its edges in the moon's light), rimmed off it
  if (woodAt(Pp)) {
    bool lf = !woodAt(Pp - vec2(cw, 0.0)), rt = !woodAt(Pp + vec2(cw, 0.0)), up = !woodAt(Pp + vec2(0.0, ch));
    int g = lf && rt ? G_CARET : (lf ? G_SLASH : (rt ? G_BACK : (up ? G_CARET : G_DARK)));
    if (r < 1.0) { tone = g == G_DARK ? 0.0 : mtone; put(g == G_DARK && h0 < 0.05 ? G_TICK : g, 1.0, g == G_DARK && h0 < 0.05 ? RIM * 0.6 : SIL); }
    else if (day) put(g, 1.0, SIL);                                     // (at dusk: black against the sky)
    else put(g == G_DARK ? (h0 < 0.12 ? G_CARET : (h0 < 0.2 ? G_TICK : 0)) : g, 0.85, RIM * (g == G_DARK ? 0.7 : 1.0));
    return;
  }

  // --- bats fluttering round the moon (more of them out when the hats are busy), wings up and down
  // twice a beat: black against it, dim off it
  for (int k = 0; k < 8; k++) {
    float fk = float(k);
    if (h1(fk * 5.3 + 2.0) > 0.3 + 0.7 * fly) continue;
    float sp = 0.2 + 0.18 * h1(fk * 1.9), ph = fk * 2.1;
    vec2 b = mc + vec2(0.15 + cos(time * sp + ph) * (1.05 + 0.3 * h1(fk * 3.7)), 0.1 + sin(time * sp * 1.6 + ph * 1.3) * (0.5 + 0.35 * h1(fk * 7.3))) * R;
    float o = cell.x - floor(b.x / cw), big = k < 3 ? 3.0 : 1.0;
    if (row == floor((1.0 - b.y) / ch) && abs(o) <= big) {
      bool up = fract(sea.z * 2.0 + h1(fk * 9.1)) < 0.5;
      int g = o == 0.0 ? G_VEE : (abs(o) == 1.0 ? (big > 1.0 ? G_CARET : (up ? G_CARET : G_DASH)) : (abs(o) == 2.0 ? (o < 0.0 ? G_LP : G_RP) : ((o < 0.0) == up ? G_BACK : G_SLASH)));
      if (r < 1.0) { tone = mtone; put(g, 1.0, SIL); }
      else put(g, 0.9, P(rgb(130.0, 116.0, 160.0), rgb(48.0, 28.0, 38.0)));
      return;
    }
  }

  // --- wisps of cloud drifting across the moon: dark streaks on it, faint beyond it
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float wy = mc.y + R * (i == 0 ? 0.55 : 0.2);
    if (abs(Y - wy) < ch * 0.5 && Y > ht + 0.16) {
      float len = R * (0.7 + 0.5 * h1(fi * 3.1)), x0 = mod(time * (0.01 + 0.005 * fi) + h1(fi * 7.7) * 3.0, aspect + 2.0 * len) - len;
      if (X > x0 && X < x0 + len && vn(X * 55.0 + fi * 9.0) > 0.28) {
        if (r < 1.0) { tone = mtone; put(G_LINE, 1.0, SIL); }
        else put(G_DASH, 0.45, P(rgb(90.0, 84.0, 124.0), rgb(170.0, 120.0, 110.0)));
        return;
      }
    }
  }

  // --- the moon: a great disc, its face knit in zigzags along each row (sparser and dimmer in its
  // seas, dimmer toward its rim), its rim drawn; by day an orange sun going down
  if (r < 1.0) {
    tone = mtone;
    #define OUT(o) (length(Pp + (o) - mc) > R)
    int eg = edge4(OUT(vec2(0.0, ch)), OUT(vec2(0.0, -ch)), OUT(vec2(-cw, 0.0)), OUT(vec2(cw, 0.0)));
    if (eg != 0) { put(eg, 1.0, moonC); return; }
    vec2 q = (Pp - mc) / R;
    float sea2 = day ? 0.0 : smoothstep(0.5, 0.64, fbm(q * 2.2 + 3.0));
    bool knit = sea2 < 0.5 || h0 < 0.45;
    put(knit ? (mod(cell.x, 2.0) < 1.0 ? G_HATCHB : G_HATCH) : (h0 < 0.7 ? G_DOT : 0), 0.9, mix(moonC, moonD, sea2) * (1.0 - 0.22 * r * r));
    return;
  }
  // its glow: a fine haze all round, breathing with the loudness
  if (r < 1.3) {
    float a = 1.0 - (r - 1.0) / 0.3;
    if (h0 < a * a * 0.22 * (0.6 + 0.6 * glow)) { put(h0 < a * 0.05 ? G_MID : G_DOT, 0.4 + 0.4 * a, moonC * 0.85); return; }
  }
  sky(cell, X, Y, h0, lake.x, lake.x + 0.05);
}`;

// The sharks, seen from above: by day a lagoon, turquoise over sand, the light gathering in a net on
// the bottom and the sharks' shadows on it; by night deep water, plankton lit in their wakes and
// twinkling (more when the hats are busy). Three swim their rounds under the toaster on its ring:
// a hammerhead, a blacktip reef shark and a leopard shark, darting on the kicks and rushing on a
// drop; a ripple spreads from the ring on each kick. The page swims them (swimSharks) and hands
// each over as a spine of 12 points, snout first, then 4 along its wake (shk); its kind, length,
// width (units of the height) and whether it's there (shkK); a box round it (shkB). moon: the
// ring's middle and radius.
const SHARKS = `
uniform vec2 shk[48];       // the sharks' spines, 16 points each from the snout (units of the height)
uniform vec4 shkK[3];       // each one's kind (0 a hammerhead, 1 a blacktip, 2 a zebra shark), its length, how far its left and right fins reach (as it banks)
uniform vec4 shkB[3];       // the box each one's in (x0, y0, x1, y1), none when x1 < x0
uniform vec4 shkD[3];       // how near each one is (1 the nearest), a number of its own
uniform sampler2D life;     // a cell at a time: a fish there (R, how bright), the water stirred (G), a splash where one was caught (B)
const vec2 SUN = vec2(-0.6, 0.8);
// (where in a cell the sharks are looked for, besides its middle)
const vec2 SUB[4] = vec2[4](vec2(-0.27, 0.24), vec2(0.27, 0.2), vec2(-0.2, -0.26), vec2(0.24, -0.24));
// the skin's glyphs, sparse to dense: sparse where it's lit, dense in its shadows
const int RAMP[10] = int[10](G_COLON, G_SEMI, G_SMALLI, G_PLUS, G_SMALLX, G_LS, G_DOLLAR, G_EIGHT, G_HASH, G_AT);
// what's at the last point looked at: 0 water, 1 a shark's body, 2 a fin, 3 the dorsal fin, 4 an
// eye, 5 a dark mark; how lit (0-1); how far along it (0 the snout, 1 the tail's end) and across it
// (signed, units of its length)
float what = 0.0, lit = 0.0, along = 0.0, across = 0.0;
float cr(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
bool inTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  float s1 = cr(b - a, p - a), s2 = cr(c - b, p - b), s3 = cr(a - c, p - c);
  return (s1 >= 0.0 && s2 >= 0.0 && s3 >= 0.0) || (s1 <= 0.0 && s2 <= 0.0 && s3 <= 0.0);
}
// half a shark's width at s (0 its snout, 1 its tail's end), in units of its length, seen from above:
// a rounded snout, widest a third back, narrowing to the stalk of its tail; the hammerhead's neck slim
// behind its head (the head's a wing across it, below); the zebra shark stout, half its length a tail
float bodyW(float s, float kind) {
  if (kind > 1.5) {
    if (s < 0.09) return 0.074 * pow(sin(1.5708 * s / 0.09), 0.7);
    if (s < 0.26) return mix(0.074, 0.097, smoothstep(0.09, 0.26, s));
    if (s < 0.52) return 0.027 + 0.07 * pow(1.0 - (s - 0.26) / 0.26, 1.15);
    float k = (s - 0.52) / 0.48;
    return 0.026 * (1.0 - k * k) + 0.016 * sin(k * 3.14159);
  }
  if (s < 0.12) return kind < 0.5 ? (s < 0.01 ? 0.0 : 0.036) : 0.085 * pow(sin(1.5708 * s / 0.12), 0.9);
  if (s < 0.3) return mix(kind < 0.5 ? 0.036 : 0.085, 0.1, smoothstep(0.12, 0.3, s));
  if (s < 0.84) return 0.018 + 0.082 * pow(1.0 - (s - 0.3) / 0.54, 1.3);
  float k = (s - 0.84) / 0.16;
  return 0.017 * (1.0 - k) + 0.009 * sin(k * 3.14159);
}
// the zebra shark's spots: one to each patch of its skin, somewhere in it, each its own size
bool spotAt(float s, float v, float id) {
  vec2 g = vec2(s / 0.05, v / 0.036), c = floor(g);
  vec2 o = 0.25 + 0.5 * vec2(h2(c + id * 7.0), h2(c + id * 7.0 + 19.0));
  return length(g - c - o) < 0.2 + 0.13 * h2(c + id * 7.0 + 41.0);
}
// shark k at p: whether it's there, and what's there (into what, lit, along, across). Its body lit
// from the top left, rounded (its flanks falling into shadow), a pale snout, the gill slits, the
// dorsal fin catching the light down the middle of its back (the blacktip's black at its tip); the
// fins: the pectorals long and swept back (sickle-shaped but the zebra shark's), the pelvics, the
// tail's fork; the hammerhead's head, its eyes on the ends; the blacktip's black tips, the zebra
// shark's ridges and spots
bool sharkAt(int k, vec2 p) {
  vec4 K = shkK[k];
  float kind = K.x, L = K.y, best = 1e9, arc = 0.0, at = 0.0, side = 1.0;
  vec2 nrm = vec2(0.0);
  for (int j = 0; j < 15; j++) {
    vec2 a = shk[k * 16 + j], ab = shk[k * 16 + j + 1] - a;
    float l = max(length(ab), 1e-6), u = clamp(dot(p - a, ab) / (l * l), 0.0, 1.0);
    vec2 d = p - a - ab * u;
    float dd = dot(d, d);
    if (dd < best) { best = dd; at = arc + u * l; side = cr(ab, d) < 0.0 ? -1.0 : 1.0; nrm = side * vec2(-ab.y, ab.x) / l; }
    arc += l;
  }
  float a = sqrt(best) / L, s = at / max(arc, 1e-6);
  along = s; across = side * a;
  if (kind < 0.5) {
    float r = a / 0.15, front = 0.03 * r * r, deep = 0.07 * (1.0 - 0.3 * r * r * r * r);
    if (r <= 1.0 && s >= front && s <= front + deep) {
      what = r > 0.85 ? 4.0 : 1.0;
      lit = r > 0.85 ? 0.0 : 0.6 - 0.18 * r + (s < front + 0.012 ? 0.12 : 0.0);
      return true;
    }
  }
  float w = bodyW(s, kind);
  if (a <= w) {
    float c = a / max(w, 1e-5);
    what = 1.0;
    lit = 0.58 - 0.3 * c * c + 0.15 * dot(nrm, SUN) * c;
    vec2 d1 = kind < 0.5 ? vec2(0.3, 0.43) : kind < 1.5 ? vec2(0.33, 0.45) : vec2(0.35, 0.43);
    vec2 d2 = kind > 1.5 ? vec2(0.47, 0.51) : vec2(0.7, 0.745);
    vec2 ey = kind < 0.5 ? vec2(-1.0) : kind < 1.5 ? vec2(0.085, 0.12) : vec2(0.055, 0.085);
    vec2 gi = kind < 0.5 ? vec2(0.15, 0.25) : kind < 1.5 ? vec2(0.17, 0.27) : vec2(0.13, 0.2);
    if (s > d1.x && s < d1.y && c < 0.3) { what = kind > 0.5 && kind < 1.5 && s > mix(d1.x, d1.y, 0.6) ? 5.0 : 3.0; lit = 1.0; }
    else if (s > d2.x && s < d2.y && c < 0.4) lit = max(lit, 0.8);
    else if (s > ey.x && s < ey.y && c > 0.6) { what = 4.0; lit = 0.0; }
    else if (s > gi.x && s < gi.y && c > 0.58) { if (mod(floor((s - gi.x) / (gi.y - gi.x) * 9.0), 2.0) < 0.5) lit *= 0.5; }
    else if (s < 0.045) lit = max(lit, 0.7);
    else if (kind > 1.5 && s > 0.08 && s < 0.52 && (c < 0.1 || abs(c - 0.62) < 0.07)) lit = max(lit, 0.8);
    else if (kind > 1.5 && s > 0.07 && spotAt(s, across, shkD[k].y)) what = 5.0;
    return true;
  }
  vec2 q = vec2(s, a);
  vec4 pc = kind < 0.5 ? vec4(0.17, 0.41, 0.51, 0.23) : kind < 1.5 ? vec4(0.15, 0.42, 0.53, 0.25) : vec4(0.12, 0.31, 0.37, 0.2);
  float tip = pc.w * (side > 0.0 ? K.z : K.w);
  if (inTri(q, vec2(pc.x, 0.0), vec2(pc.y, 0.0), vec2(pc.z, tip)) && (kind > 1.5 || !inTri(q, vec2(pc.y, 0.0), vec2(mix(pc.y, pc.z, 0.42), 0.55 * tip), vec2(pc.z, tip)))) {
    what = kind > 0.5 && kind < 1.5 && a > 0.66 * tip ? 5.0 : 2.0;
    lit = 0.38 + 0.22 * (1.0 - clamp(a / tip, 0.0, 1.0));
    if (kind > 1.5 && spotAt(s, across, shkD[k].y)) what = 5.0;
    return true;
  }
  vec4 pv = kind > 1.5 ? vec4(0.43, 0.49, 0.52, 0.06) : vec4(0.57, 0.64, 0.68, 0.07);
  if (inTri(q, vec2(pv.x, 0.0), vec2(pv.y, 0.0), vec2(pv.z, pv.w)) || (kind < 1.5 && inTri(q, vec2(0.85, 0.0), vec2(0.94, 0.0), vec2(1.0, kind < 0.5 ? 0.09 : 0.075)))) {
    what = kind > 0.5 && kind < 1.5 && s > 0.95 ? 5.0 : 2.0;
    lit = 0.36;
    return true;
  }
  return false;
}
// a colour for a glyph's flash, by its key
vec3 accent(float key) {
  int i = int(fract(key * 7.31) * 7.0);
  return i == 0 ? rgb(232.0, 168.0, 88.0) : i == 1 ? rgb(226.0, 70.0, 70.0) : i == 2 ? rgb(166.0, 98.0, 232.0) : i == 3 ? rgb(52.0, 196.0, 200.0)
       : i == 4 ? rgb(84.0, 190.0, 96.0) : i == 5 ? rgb(70.0, 104.0, 236.0) : rgb(232.0, 204.0, 84.0);
}
// a glyph along a line at angle a (on the screen, y up): -, /, | or the backslash, as the cells are drawn
int lineGlyph(float a) {
  float c = mod(atan(sin(a) / ch, cos(a) / cw), 3.14159265);
  return c < 0.3927 || c > 2.7489 ? G_DASH : c < 1.1781 ? G_SLASH : c < 1.9635 ? G_BAR : G_BACK;
}
// the light's net on the bottom: cells drifting (Voronoi), the light gathered along their edges:
// how far from the nearest edge (x, small on it) and the edge's direction there (y, an angle)
vec2 causticEdge(vec2 q, float t) {
  q += 0.22 * vec2(sin(q.y * 1.3 + t * 0.7), sin(q.x * 1.1 - t * 0.6));
  vec2 g = floor(q), f = fract(q), c1 = vec2(0.0), c2 = vec2(0.0);
  float d1 = 9.0, d2 = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)), hh = vec2(h2(g + o), h2(g + o + 31.0));
    vec2 c = o + 0.5 + 0.35 * vec2(sin(t * (0.6 + hh.x) + 6.28 * hh.y), cos(t * (0.5 + hh.y) + 6.28 * hh.x)) - f;
    float d = dot(c, c);
    if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = c; } else if (d < d2) { d2 = d; c2 = c; }
  }
  vec2 a = c2 - c1;
  return vec2(dot(0.5 * (c1 + c2), normalize(a)), atan(a.y, a.x) + 1.5708);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  vec2 p = vec2(X, Y);
  vec4 lf = texelFetch(life, ivec2(int(cell.x), int(row)), 0);

  // --- the sharks, the nearest first: a tile where one covers the cell, in its kind's colours
  // shaded by the light, its glyph from the skin's (keyed to a place on the skin, so it rides along
  // with it), dark but now and then flashing a colour or white, so the hide shimmers; and round
  // their edges, where a cell's only partly covered, a light glyph with no tile
  for (int k = 0; k < 3; k++) {
    vec4 B = shkB[k];
    if (B.z < B.x || X < B.x || X > B.z || Y < B.y || Y > B.w) continue;
    bool mid = sharkAt(k, p);
    float wh = what, li = lit, s = along, v = across;
    int n = mid ? 1 : 0;
    for (int i = 0; i < 4; i++) if (sharkAt(k, p + SUB[i] * vec2(cw, ch))) n++;
    if (n == 0) continue;
    vec4 K = shkK[k], D = shkD[k];
    float kind = K.x, cover = float(n) / 5.0, near = 0.74 + 0.26 * D.x;
    float key = h2(vec2(floor(s * 52.0 + 0.5), floor(v * K.y / cw + 0.5)) + D.y * 37.0);
    // (its colours, in shadow and lit: the hammerhead olive bronze, the blacktip grey, the zebra
    // shark sand; by night in the moonlight)
    vec3 dk = kind < 0.5 ? rgb(78.0, 76.0, 58.0) : kind < 1.5 ? rgb(70.0, 80.0, 94.0) : rgb(122.0, 98.0, 60.0);
    vec3 lt = kind < 0.5 ? rgb(170.0, 164.0, 128.0) : kind < 1.5 ? rgb(170.0, 182.0, 196.0) : rgb(226.0, 198.0, 140.0);
    if (!day) { dk *= vec3(0.55, 0.62, 0.8); lt *= vec3(0.6, 0.68, 0.86); }
    dk *= near; lt *= near;
    if (!mid || cover < 0.6) {
      put(cover >= 0.5 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.9, mix(dk, lt, 0.35));
      return;
    }
    // (its tile: shaded by the light, the fins a little duller, the dark marks darker, the dorsal
    // fin's edge catching the light, the eyes black; flickering a little)
    vec3 c = wh > 4.5 ? dk * 0.38 : wh > 3.5 ? rgb(16.0, 16.0, 20.0) : wh > 2.5 ? mix(lt, vec3(1.0), 0.25) : mix(dk, lt, wh > 1.5 ? 0.15 + 0.7 * li : li);
    c *= 1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.05;
    tileC = c; tileA = 1.0;
    int g = wh > 4.5 ? (key < 0.33 ? G_HASH : key < 0.67 ? G_PCT : G_AT)
          : wh > 3.5 ? G_SMALLO
          : wh > 2.5 ? (key < 0.33 ? G_AT : key < 0.67 ? G_EIGHT : G_PCT)
          : wh > 1.5 ? (key < 0.2 ? G_PCT : key < 0.4 ? G_SEMI : key < 0.6 ? G_SMALLI : key < 0.8 ? G_LS : G_COLON)
          : RAMP[clamp(int((1.0 - li) * 9.99) + int(fract(key * 13.7) * 3.0) - 1, 0, 9)];
    // (the shimmer: each glyph rolls again a couple of times a second, each on its own beat)
    float roll = h2(vec2(floor(key * 4096.0), floor(time * 2.4 + fract(key * 31.0) * 10.0)));
    vec3 ink = wh > 4.5 ? dk * 0.6 : wh > 3.5 ? rgb(154.0, 160.0, 173.0) : roll < 0.045 ? accent(key) : roll < 0.065 ? vec3(1.0)
             : day ? c * (li > 0.55 ? 0.36 : 0.48) : li > 0.55 ? rgb(14.0, 15.0, 19.0) : rgb(27.0, 29.0, 36.0);
    put(g, 1.0, ink);
    return;
  }

  // --- by day, their shadows on the bottom, down and to the right of each
  if (day) for (int k = 0; k < 3; k++) {
    vec4 B = shkB[k];
    vec2 q = p - vec2(0.02, -0.026);
    if (B.z < B.x || q.x < B.x || q.x > B.z || q.y < B.y || q.y > B.w) continue;
    if (sharkAt(k, q)) { tone = 0.8; break; }
  }
  // --- the fish: a dash each, brighter nearer, glinting as they turn or flee
  if (lf.r > 0.0) {
    put(G_DASH, 0.45 + 0.55 * lf.r, day ? mix(rgb(70.0, 120.0, 132.0), rgb(24.0, 62.0, 76.0), lf.r) : mix(rgb(70.0, 96.0, 150.0), rgb(220.0, 232.0, 255.0), lf.r));
    return;
  }
  // --- a splash of bubbles where a fish was caught
  if (lf.b > 0.08) { put(lf.b > 0.5 ? G_SMALLO : G_MID, 0.4 + 0.6 * lf.b, day ? vec3(1.0) : rgb(170.0, 250.0, 255.0)); return; }
  // --- a ripple spreading from the float on each kick
  for (int i = 0; i < 4; i++) {
    vec4 q = rip[i];
    if (q.w <= 0.0) continue;
    float fade = exp(-q.z * 1.7), rad = moon.z * 1.05 + q.z * 0.08, dr = length(p - q.xy) - rad;
    if (abs(dr) < cw * 0.55 && fade > 0.15 && h2(cell + 3.0) < 0.35 + 0.45 * fade) {
      vec2 dv = p - q.xy;
      put(lineGlyph(atan(dv.y, dv.x) + 1.5708), 0.25 + 0.6 * fade, P(rgb(150.0, 230.0, 240.0), rgb(248.0, 255.0, 255.0)));
      return;
    }
  }
  // --- by night the plankton lit where things swim, the light spreading and fading
  if (!day && lf.g > 0.1) { put(lf.g > 0.4 ? G_MID : G_DOT, min(1.0, 0.25 + 1.5 * lf.g), mix(rgb(50.0, 140.0, 210.0), rgb(120.0, 245.0, 255.0), min(1.0, 2.0 * lf.g))); return; }
  if (!day) {
    // (the plankton twinkling here and there, more when the hats are busy)
    float tw = h2(cell + floor(time * (2.0 + 4.0 * fly)) * 3.1);
    if (tw > 0.996 - 0.006 * fly) { put(tw > 0.9993 ? G_STAR : G_MID, 0.8, rgb(140.0, 255.0, 230.0)); return; }
    put(0, 0.0, vec3(0.0));
    return;
  }
  // --- the light's net on the bottom, cells lit along its edges, in patches, drifting (faster when
  // the hats are busy); none in the shadows
  if (tone == 0.0) {
    float sc0 = 14.0, netAt = vn2(p * 3.0 + vec2(time * 0.05, -time * 0.03));
    vec2 ce = causticEdge(p * sc0, time * (0.35 + 0.5 * wind));
    if (abs(ce.x) / sc0 < cw * 0.55 && netAt > 0.42) { tileC = rgb(250.0, 255.0, 252.0); tileA = min(0.45, 0.12 + 0.8 * (netAt - 0.42)); }
  }
  put(0, 0.0, vec3(0.0));
}
`;

const MAINS = { lake: LAKE, sea: SEA, fire: FIRE, snow: SNOW, city: CITY, garden: GARDEN, falls: FALLS, halloween: HALLOWEEN, sharks: SHARKS };

// The glyphs, each from the sheet, over the paper. In its own colours: each in its colour, on a
// night sky (darkest overhead) or on the day's paper; or in the theme's: its ink in the theme's
// colour on its background. k: how strongly it shows (A's strength, in the theme's colours).
const PAINT = `#version 300 es
precision highp float;
uniform sampler2D cells, cols, sheet, sprite, tiles;
uniform vec2 grid, cellPx, slot, sheetSize;
uniform float gridK;     // the cells' grid, drawn faintly (the sharks' water); 0 none
uniform float perRow, dpr, H, k, own, horizon, night, time, water;
uniform vec3 bg, fg, top, low;
uniform vec3 tint;       // the toaster's colour at night (moonlight, firelight, the aurora's)
uniform vec3 toneC;      // the paper shifted under a cell's tone (lighter at night, cooler by day)
uniform vec4 spr;        // the boat: where it is (CSS pixels: x, y, w, h)
uniform vec4 light;      // a warm light on the paper (the campfire, the cabin's windows): x, y (CSS pixels), radius, strength
uniform vec4 light2;     // and a second, in its own colour (the city's sign)
uniform vec3 light2C;
out vec4 o;
vec3 boat(vec4 sp) { return own > 0.5 ? sp.rgb * tint : mix(bg, fg, dot(sp.rgb, vec3(0.3, 0.55, 0.15))); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, H - gl_FragCoord.y) / dpr;
  vec2 cell = floor(p / cellPx);
  ivec2 at = ivec2(int(cell.x), int(grid.y) - 1 - int(cell.y));
  vec4 c = texelFetch(cells, at, 0);
  float gi = floor(c.r * 255.0 + 0.5);
  vec2 f = (p - cell * cellPx) / cellPx;
  float cov = gi > 0.5 ? texture(sheet, (vec2(mod(gi, perRow), floor(gi / perRow)) + f) * slot / sheetSize).a : 0.0;
  // (a tile fills its cell but for a hair along its top and left, where the grid's drawn)
  vec4 tl = texelFetch(tiles, at, 0);
  bool rim = f.x * cellPx.x * dpr < 1.0 || f.y * cellPx.y * dpr < 1.0;
  vec3 col;
  if (own > 0.5) {
    float y = p.y / (H / dpr);
    vec3 paper = mix(top, low, smoothstep(0.0, horizon, y)) + toneC * c.b;
    if (light.w > 0.0) paper += vec3(0.32, 0.13, 0.03) * light.w * pow(max(0.0, 1.0 - length((p - light.xy) * vec2(0.8, 1.0)) / light.z), 2.0);
    if (light2.w > 0.0) paper += light2C * light2.w * pow(max(0.0, 1.0 - length((p - light2.xy) * vec2(0.8, 1.0)) / light2.z), 2.0);
    if (rim) paper = mix(paper, night > 0.5 ? paper + 0.05 : paper * 0.9, gridK);
    else paper = mix(paper, tl.rgb, tl.a);
    col = mix(paper, texelFetch(cols, at, 0).rgb, cov * c.g);
  // (in the theme's colours at night, each glyph as bright as it is in the scenery's own: its shadows
  // stay dark, its lights full; a tile a faint block of the theme's ink)
  } else {
    vec3 under = rim ? mix(bg, fg, 0.05 * gridK) : mix(bg, fg, 0.22 * tl.a * min(1.0, k));
    col = mix(under, fg, cov * min(1.0, c.g * k) * (night > 0.5 ? clamp(dot(texelFetch(cols, at, 0).rgb, vec3(0.3, 0.55, 0.15)) * 2.2, 0.0, 1.0) : 1.0));
  }
  // the boat, in pixels over the glyphs (the way the stream draws its fisher); under the water's
  // line its reflection, wavering, broken into lines, faint
  if (spr.z > 0.0) {
    vec2 sq = (p - spr.xy) / spr.zw;
    if (sq.x >= 0.0 && sq.x < 1.0 && sq.y >= 0.0 && sq.y < 1.0) { vec4 sp = texture(sprite, sq); if (sp.a > 0.5) col = boat(sp); }
    float below = p.y - water;
    if (below > 0.0 && below < spr.w * 0.45) {
      vec2 rq = (vec2(p.x + 1.5 * sin(p.y * 0.45 + time * 2.5), water - below) - spr.xy) / spr.zw;
      if (rq.x >= 0.0 && rq.x < 1.0 && rq.y >= 0.0 && rq.y < 1.0 && mod(floor(below / 3.0), 2.0) < 1.0) { vec4 sp = texture(sprite, rq); if (sp.a > 0.5) col = mix(col, boat(sp), 0.32); }
    }
  }
  o = vec4(col, 1.0);
}`;

// The boat: a little toaster fishing from a rowboat on the lake, in pixels (after the stream's
// fisher in a boat; the toaster is ours). It bobs a pixel a beat, the float dips on each kick, and
// the toast pops up on a drop and every 8 bars. By the sea it fishes from a rock; at the campfire
// it sits on a log, toasting a slice of bread on a stick (browning through each 8 bars). 40 x 28
// pixels; the water's line (or the ground's) at 22.
const SW = 40, SH = 28, WATER = 22.5;
function drawBoat(g, { dy, pop, dip, on = 'boat', toast = 0 }) {
  g.clearRect(0, 0, SW, SH);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y + dy, w, h); };
  if (on === 'float') {
    // Seen from above (the sharks' scene): a ring, red and white, shaded down and to the right, a
    // shine on its top left; on it the toaster, its two slots, the toast in them (risen when it
    // pops), the lever at its side, and its face on the front
    const cx = 20, cy = 14;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const dx = x + 0.5 - cx, dy2 = y + 0.5 - cy, d = Math.hypot(dx, dy2);
        if (d < 7.4 || d > 12.6) continue;
        const red = Math.floor(((Math.atan2(dy2, dx) + Math.PI) / (Math.PI / 4)) + 0.5) % 2 === 0;
        const lit = -(dx + dy2) / d; // (the light from the top left)
        const mid = Math.abs(d - 10) < 0.8 && lit > 0.75;
        rect(x, y, 1, 1, mid ? '#ffffff' : red ? (lit < -0.3 ? '#a83232' : '#e04848') : (lit < -0.3 ? '#c4c4d0' : '#f2f2f6'));
      }
    }
    rect(14, 9, 13, 10, '#86817a'); rect(15, 9, 11, 1, '#e8e8f0'); rect(15, 10, 11, 8, '#c9c9d4'); rect(14, 18, 13, 1, '#6e6a64');
    for (const sy of [12, 15]) {
      rect(16, sy, 9, 1, '#2a2a33');
      rect(17, sy - (pop > 1 ? 1 : 0), 7, pop > 1 ? 2 : 1, '#e0a860');
      if (pop > 1) rect(17, sy - 1, 7, 1, '#a8682e');
    }
    rect(27, 13, 1, 2, '#3a3048');
    rect(17, 17, 1, 1, '#1a1626'); rect(23, 17, 1, 1, '#1a1626');
    rect(16, 17, 1, 1, '#ff9ab8'); rect(24, 17, 1, 1, '#ff9ab8');
    return;
  }
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, c);
  };
  // the toast, two slices (up out of their slots when it pops)
  const ty = 7 - pop;
  for (const x of [14, 19]) { rect(x, ty, 3, 9 - ty, '#e0a860'); rect(x, ty, 3, 1, '#a8682e'); }
  // the toaster: chrome, its edges darker, a highlight down its side, two eyes, a lever
  rect(13, 9, 10, 1, '#c9c9d4'); rect(12, 10, 12, 8, '#c9c9d4');
  rect(12, 10, 1, 8, '#86817a'); rect(23, 10, 1, 8, '#86817a'); rect(12, 17, 12, 1, '#6e6a64');
  rect(14, 11, 1, 5, '#ffffff');
  rect(14, 9, 3, 1, '#2a2a33'); rect(19, 9, 3, 1, '#2a2a33');
  rect(16, 13, 1, 1, '#1a1626'); rect(19, 13, 1, 1, '#1a1626');
  rect(15, 14, 1, 1, '#ff9ab8'); rect(20, 14, 1, 1, '#ff9ab8');
  rect(24, 12, 1, 2, '#3a3048');
  // the rowboat, a rock in the shallows, a log by the fire, a bucket on the ice and a hole in it,
  // or a bench on the pavement
  if (on === 'broom') {
    // the broomstick under it, the handle turned up at the front, the bristles fanning out behind,
    // bound with a band
    rect(6, 18, 31, 1, '#9a6a3a'); rect(6, 19, 31, 1, '#5e3a1a'); rect(37, 17, 2, 1, '#9a6a3a');
    [[15, '#e8c060'], [16.5, '#b8862e'], [18, '#e8c060'], [19.5, '#b8862e'], [21, '#e8c060'], [22.5, '#b8862e']].forEach(([y, c]) => line(6, 18.5, 0, Math.round(y), c));
    rect(6, 17, 2, 4, '#6a2a7a');
  } else if (on === 'tube') {
    const seg = (x) => (Math.floor((x - 6) / 4) % 2 ? '#f2f2f6' : '#e04848');
    for (let x = 9; x < 31; x++) if (x < 12 || x > 23) rect(x, 16, 1, 1, seg(x));
    for (let x = 7; x < 33; x++) if (x < 12 || x > 23) rect(x, 17, 1, 1, seg(x));
    for (let x = 6; x < 34; x++) { rect(x, 18, 1, 1, seg(x)); rect(x, 19, 1, 1, seg(x)); }
    rect(9, 18, 4, 1, 'rgba(255,255,255,0.55)');
  } else if (on === 'bridge') {
    // (nothing under it: the bridge is drawn in glyphs)
  } else if (on === 'umbrella') {
    rect(5, 18, 30, 1, '#7a5a40'); rect(5, 19, 30, 1, '#5e4430'); rect(7, 20, 1, 3, '#3a3036'); rect(32, 20, 1, 3, '#3a3036');
  } else if (on === 'ice') {
    rect(14, 18, 8, 1, '#8ea2c6'); rect(13, 19, 10, 2, '#6c80a8'); rect(13, 19, 1, 2, '#a4b6d6'); rect(12, 21, 12, 1, '#56688e');
    rect(33, 21, 7, 1, '#2c3e62'); rect(32, 22, 9, 1, '#122040'); rect(33, 23, 7, 1, '#2c3e62'); rect(32, 21, 1, 1, '#c8d6ee'); rect(40, 22, 1, 1, '#c8d6ee');
  } else if (on === 'log') {
    rect(6, 18, 28, 2, '#8a5a32'); rect(6, 20, 28, 2, '#6e4521'); rect(6, 18, 2, 4, '#c8925a'); rect(7, 19, 1, 2, '#8a5a32'); rect(32, 18, 2, 4, '#c8925a');
  } else if (on === 'rock') {
    rect(9, 18, 22, 1, '#a4a8be'); rect(7, 19, 26, 1, '#7c8098'); rect(6, 20, 28, 1, '#686c84'); rect(6, 21, 29, 1, '#55596e'); rect(7, 22, 27, 1, '#45485a');
    rect(13, 20, 3, 1, '#4a4d60'); rect(24, 21, 4, 1, '#3c3f50'); rect(10, 19, 2, 1, '#c4c8da');
  } else {
    rect(6, 18, 28, 1, '#c8925a'); rect(6, 19, 28, 1, '#8a5a2b'); rect(7, 20, 26, 1, '#6e4521'); rect(8, 21, 24, 1, '#8a5a2b'); rect(10, 22, 20, 1, '#5e3a1a');
  }
  if (on === 'broom') {
    // the witch's hat, perched on the toast (and lifted by it when it pops): a brim, a purple band,
    // the cone with its tip bent over
    const hy = -pop, hat = '#2b2238', glint = '#55447a';
    rect(10, 6 + hy, 16, 1, hat); rect(13, 5 + hy, 10, 1, '#8a3ab8');
    rect(14, 4 + hy, 8, 1, hat); rect(15, 3 + hy, 6, 1, hat); rect(16, 2 + hy, 4, 1, hat); rect(17, 1 + hy, 3, 1, hat); rect(19, hy, 3, 1, hat); rect(21, hy - 1, 2, 1, hat);
    rect(14, 4 + hy, 1, 1, glint); rect(15, 3 + hy, 1, 1, glint); rect(16, 2 + hy, 1, 1, glint);
    return;
  }
  if (on === 'bridge' || on === 'tube') return;
  if (on === 'umbrella') {
    // the umbrella, leant on the toaster's side over it: a red dome, scalloped, on a black shaft
    line(18, 4, 25, 16, '#2a2a33');
    rect(14, 0, 9, 1, '#d84858'); rect(11, 1, 15, 1, '#d84858'); rect(9, 2, 19, 1, '#d84858'); rect(8, 3, 21, 1, '#c03848');
    for (let x = 8; x < 29; x += 4) rect(x, 4, 2, 1, '#c03848');
    rect(12, 1, 3, 1, '#f07a88'); rect(10, 2, 3, 1, '#f07a88');
    return;
  }
  if (on === 'log') {
    // a stick reaching to the fire, a slice of bread on its end
    line(23, 14, 37, 17, '#8a5a32');
    const brown = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * toast)).join(',')})`;
    rect(36, 13, 4, 4, brown([240, 214, 160], [196, 122, 52])); rect(36, 13, 4, 1, brown([200, 160, 100], [130, 70, 30]));
    return;
  }
  // the rod, the line and the float (red over white), on the water
  line(23, 14, 34, 3, '#b0804e');
  rect(34, 3, 1, 1, '#d8a870');
  const fy = 21 + dip;
  line(35, 4, 36, fy - 1, 'rgba(150, 156, 184, 0.55)');
  rect(36, fy - 1, 1, 1, '#e04848'); rect(36, fy, 1, 1, '#ffffff');
}

// The sharks' water (the scene 'sharks'), in units of the window's height, y up (as the shader has
// them), a step a 60th of a second at a time. Three sharks patrol a loose round about the toaster's
// float, each its own way round and at its own distance, wandering off it, giving each other room,
// keeping clear of the float and turning back as they leave the window. None turns tighter than a
// shark can (the faster, the wider its turn); its spine follows its snout a joint at a time, bending
// so far at each and no further, and a wave runs down its body, more toward the tail. Schools of
// little fish (a dash each) shoal about: each keeps its room, lines up with its school and keeps to
// it (a bait ball milling round its middle), sees all but straight behind it, and swims mostly level;
// they flee a shark to whichever side of its path they're on, the alarm running through the school,
// and flinch from the float on each kick. On a drop (and every 8 bars, with the toast) the sharks get
// hungry and hunt: the nearest fish ahead of them, the strays sooner than those in a crowd; a caught
// fish leaves a splash of bubbles and comes back later with a new school swimming in from an edge.
// Where anything swims it stirs the water (a cell at a time, spreading and fading).
const SPINE = 16, SEA_STEP = 1 / 60;
const SHARK_KINDS = [
  { kind: 0, size: 1, near: 1 }, // a scalloped hammerhead
  { kind: 1, size: 0.84, near: 0.86 }, // a blacktip reef shark
  { kind: 2, size: 0.92, near: 0.74 }, // a zebra shark (the Indo-Pacific leopard shark)
];
// how each kind of fish schools: its cruising, top and least speeds (units of the height a second);
// how many to a school; the room each keeps (in cells, along and across); how strongly they line up
// with and keep to their school; how restless; a pull round the school's middle (a bait ball); how
// level they keep
const SCHOOLS = [
  { cruise: 0.05, top: 0.09, least: 0.025, n: [14, 22], room: [1.7, 1.1], line: 1.4, keep: 1.8, rest: 0.06, mill: 0.1, level: 0.6 }, // a bait ball
  { cruise: 0.06, top: 0.1, least: 0.03, n: [16, 26], room: [1.6, 1], line: 3, keep: 0.5, rest: 0.04, mill: 0, level: 1.5 }, // a ribbon
  { cruise: 0.035, top: 0.07, least: 0.015, n: [8, 12], room: [1.5, 1.2], line: 0.4, keep: 1.2, rest: 0.12, mill: 0, level: 0.4 }, // a loose swarm
];
const between = (a, b) => a + Math.random() * (b - a);
const within = (v, a, b) => (v < a ? a : v > b ? b : v);
const turnTo = (a, b) => {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
function newSea(cols, rows, cw, ch, aspect, fx, fy) {
  const n = cols * rows, side = Math.min(1, aspect);
  const sea = {
    cols, rows, cw, ch, aspect, fx, fy, t: 0, acc: 0, sharks: [], fish: [], lastSchool: 0, hunger: 0,
    // (the middle of the sharks' rounds: between the window's middle and the float; how far a fish sees)
    cx: 0.65 * (aspect / 2) + 0.35 * fx, cy: 0.65 * 0.5 + 0.35 * fy, R: Math.max(3 * ch, 5.5 * cw),
    wake: new Float32Array(n), wake2: new Float32Array(n), splash: new Float32Array(n), data: new Uint8Array(n * 4), seen: new Uint32Array(n), frame: 0,
  };
  const sx = aspect >= 1 ? 1.3 : 1, sy = aspect >= 1 ? 1 : 1.5;
  SHARK_KINDS.forEach((k, i) => {
    const L = (aspect >= 1 ? 0.56 : 0.5) * side * k.size, ring = side * between(0.26, 0.38), a = (i / SHARK_KINDS.length) * 2 * Math.PI + between(-0.4, 0.4), dir = i % 2 ? -1 : 1;
    const x = sea.cx + Math.cos(a) * ring * sx, y = sea.cy + Math.sin(a) * ring * sy, head = a + (dir * Math.PI) / 2;
    const nodes = new Float32Array(SPINE * 2), seg = L / (SPINE - 1);
    for (let j = 0; j < SPINE; j++) { nodes[2 * j] = x - Math.cos(head) * seg * j; nodes[2 * j + 1] = y - Math.sin(head) * seg * j; }
    sea.sharks.push({ ...k, id: i + 1, L, ring, dir, nodes, head, speed: 0.04, phase: between(0, 6.28), turn: 0, wander: 0, prey: null, look: 0 });
  });
  const total = within(Math.round(n / 80), 60, 220);
  while (sea.fish.length < total) {
    const kind = Math.floor(Math.random() * SCHOOLS.length), sc = SCHOOLS[kind];
    const size = Math.min(Math.round(between(sc.n[0], sc.n[1])), total - sea.fish.length);
    const x = between(0.06, 0.94) * aspect, y = between(0.08, 0.92), d = (Math.random() < 0.5 ? 0 : Math.PI) + between(-0.5, 0.5), mill = Math.random() < 0.5 ? 1 : -1;
    for (let j = 0; j < size; j++) {
      sea.fish.push({ x: x + between(-1, 1) * sc.room[0] * cw * Math.sqrt(size), y: y + between(-1, 1) * sc.room[1] * ch * Math.sqrt(size) * 0.6, vx: Math.cos(d) * sc.cruise, vy: Math.sin(d) * sc.cruise, kind, alarm: 0, alive: true, back: 0, turn: 0, near: between(0.55, 1), mill });
    }
  }
  return sea;
}
// a step: m the music's (kick: a kick this step; pace: how fast the sharks cruise, with the
// loudness); sea.hunger is set to 1 on a drop or the toast's pop, and fades
function stepSea(sea, m) {
  const dt = SEA_STEP;
  sea.t += dt;
  sea.hunger = Math.max(0, sea.hunger - dt * 0.12);
  // (the fish into buckets as wide as they see, for their neighbours)
  const R = sea.R, bc = Math.ceil(sea.aspect / R) + 4, br = Math.ceil(1 / R) + 4;
  if (!sea.head || sea.head.length !== bc * br) { sea.head = new Int32Array(bc * br); sea.count = new Uint16Array(bc * br); }
  if (!sea.next || sea.next.length !== sea.fish.length) sea.next = new Int32Array(sea.fish.length);
  const bucket = (x, y) => within(Math.floor(y / R) + 2, 0, br - 1) * bc + within(Math.floor(x / R) + 2, 0, bc - 1);
  sea.head.fill(-1);
  sea.count.fill(0);
  sea.fish.forEach((f, i) => {
    if (!f.alive) return;
    const b = bucket(f.x, f.y);
    sea.next[i] = sea.head[b];
    sea.head[b] = i;
    sea.count[b]++;
  });
  swimFish(sea, dt, m, bc, br, bucket);
  swimSharks(sea, dt, m, bucket);
  stirSea(sea, dt, m);
  // (caught fish back as a school from an edge, now and then)
  const due = sea.fish.filter((f) => !f.alive && f.back <= sea.t);
  if (due.length && (due.length >= 6 || sea.t - sea.lastSchool > 9)) {
    sea.lastSchool = sea.t;
    const edge = Math.floor(Math.random() * 4), u = between(0.15, 0.85), kind = Math.floor(Math.random() * SCHOOLS.length), sc = SCHOOLS[kind];
    const x = edge === 0 ? -0.03 : edge === 1 ? sea.aspect + 0.03 : u * sea.aspect, y = edge === 2 ? -0.03 : edge === 3 ? 1.03 : u;
    const d = Math.atan2(0.5 - y, sea.aspect / 2 - x) + between(-0.5, 0.5), mill = Math.random() < 0.5 ? 1 : -1;
    for (const f of due.slice(0, sc.n[1])) Object.assign(f, { alive: true, kind, alarm: 0, turn: 0, mill, x: x + between(-1, 1) * R, y: y + between(-1, 1) * R, vx: Math.cos(d) * sc.cruise * 1.4, vy: Math.sin(d) * sc.cruise * 1.4 });
  }
}
function swimFish(sea, dt, m, bc, br, bucket) {
  const { fish, sharks, cw, ch, aspect, R, head, next } = sea, R2 = R * R, calm = Math.exp(-dt * 0.7), pass = Math.min(1, dt * 6), t = sea.t;
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    if (!f.alive) continue;
    const sc = SCHOOLS[f.kind], room = 1 + 1.8 * f.alarm, rx = sc.room[0] * cw * room, ry = sc.room[1] * ch * room;
    const sp = Math.hypot(f.vx, f.vy) || 1e-6, hx = f.vx / sp, hy = f.vy / sp;
    let ax = 0, ay = 0, sx = 0, sy = 0, vx = 0, vy = 0, mx = 0, my = 0, n = 0, heard = 0;
    const b0 = bucket(f.x, f.y), c0 = b0 % bc, r0 = (b0 - c0) / bc;
    for (let r = Math.max(0, r0 - 1); r <= Math.min(br - 1, r0 + 1); r++) {
      for (let c = Math.max(0, c0 - 1); c <= Math.min(bc - 1, c0 + 1); c++) {
        for (let j = head[r * bc + c]; j !== -1; j = next[j]) {
          if (j === i) continue;
          const o = fish[j], dx = o.x - f.x, dy = o.y - f.y, d2 = dx * dx + dy * dy;
          if (d2 >= R2 || d2 < 1e-12) continue;
          const d = Math.sqrt(d2);
          if ((dx * hx + dy * hy) / d < -0.6) continue;
          // (its room: wider along than across, so each has a cell of its own)
          const qx = dx / rx, qy = dy / ry, q2 = qx * qx + qy * qy;
          if (q2 < 1) { const q = Math.sqrt(q2) || 1e-3, k = (1 - q) / q; sx -= qx * k; sy -= qy * k; }
          if (o.kind === f.kind) { vx += o.vx; vy += o.vy; mx += dx; my += dy; n++; }
          else if (d < 3 * cw) { const k = ((1 - d / (3 * cw)) / d) * 0.6; sx -= dx * k; sy -= dy * k; }
          heard = Math.max(heard, o.alarm);
        }
      }
    }
    ax += sx * 0.5; ay += sy * 0.5;
    if (n) {
      const keep = sc.keep * (1 - 0.8 * f.alarm);
      ax += (vx / n - f.vx) * 1.4 * sc.line + (mx / n) * keep;
      ay += (vy / n - f.vy) * 1.4 * sc.line + (my / n) * keep;
      if (sc.mill) { const l = Math.hypot(mx, my) || 1; ax -= (my / l) * f.mill * sc.mill * (1 - f.alarm); ay += (mx / l) * f.mill * sc.mill * (1 - f.alarm); }
    }
    // the sharks: away from the nearest part of the front half of each, and off to the side of its path
    let fear = 0;
    for (const s of sharks) {
      const far = s.L * 0.6 + 0.075;
      let best = Infinity, bx = 0, by = 0;
      for (let k = 0; k <= 8; k += 2) {
        const d2 = (f.x - s.nodes[2 * k]) ** 2 + (f.y - s.nodes[2 * k + 1]) ** 2;
        if (d2 < best) { best = d2; bx = s.nodes[2 * k]; by = s.nodes[2 * k + 1]; }
      }
      const d = Math.sqrt(best);
      if (d >= far || d < 1e-6) continue;
      const w = (1 - d / far) ** 2, ux = Math.cos(s.head), uy = Math.sin(s.head);
      const side = ux * (f.y - s.nodes[1]) - uy * (f.x - s.nodes[0]) >= 0 ? 1 : -1;
      ax += ((f.x - bx) / d * 0.7 - uy * side * 0.9) * 1.4 * w;
      ay += ((f.y - by) / d * 0.7 + ux * side * 0.9) * 1.4 * w;
      fear = Math.max(fear, Math.sqrt(w));
    }
    // (a flinch from the float on a kick)
    if (m.kick) {
      const dx = f.x - sea.fx, dy = f.y - sea.fy, d = Math.hypot(dx, dy);
      if (d < 0.2 && d > 1e-6) { const k = (1 - d / 0.2) * 0.12; f.vx += (dx / d) * k; f.vy += (dy / d) * k; fear = Math.max(fear, 0.5 * (1 - d / 0.2)); }
    }
    let alarm = Math.max(f.alarm * calm, fear);
    if (heard * 0.86 > alarm) alarm += (heard * 0.86 - alarm) * pass;
    f.alarm = alarm;
    // the window's edges, a slow current (curling, so it doesn't gather them anywhere), restlessness
    const e = 0.045;
    if (f.x < e) ax += (e - f.x) * 7; else if (f.x > aspect - e) ax -= (f.x - aspect + e) * 7;
    if (f.y < e) ay += (e - f.y) * 7; else if (f.y > 1 - e) ay -= (f.y - 1 + e) * 7;
    const a1 = f.x * 3.1 + t * 0.07, b1 = f.y * 2.6 - t * 0.05;
    ax += -0.011 * Math.sin(a1) * Math.sin(b1) + (Math.random() - 0.5) * sc.rest;
    ay += -0.013 * Math.cos(a1) * Math.cos(b1) + (Math.random() - 0.5) * sc.rest;
    ay -= f.vy * sc.level * (1 - 0.7 * f.alarm);
    const want = sc.cruise * (1 + 1.3 * f.alarm);
    ax += (want - sp) * hx * 1.6; ay += (want - sp) * hy * 1.6;
    const was = Math.atan2(f.vy, f.vx);
    f.vx += ax * dt; f.vy += ay * dt;
    const top = sc.top * (1 + 1.8 * f.alarm), v = Math.hypot(f.vx, f.vy);
    if (v > top) { f.vx *= top / v; f.vy *= top / v; } else if (v < sc.least && v > 1e-9) { f.vx *= sc.least / v; f.vy *= sc.least / v; }
    f.turn += (turnTo(was, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
    f.x = within(f.x + f.vx * dt, -0.075, aspect + 0.075);
    f.y = within(f.y + f.vy * dt, -0.075, 1.075);
  }
}
function swimSharks(sea, dt, m, bucket) {
  const { sharks, aspect, cx, cy, fx, fy, t } = sea, sx = aspect >= 1 ? 1.3 : 1, sy = aspect >= 1 ? 1 : 1.5;
  for (const s of sharks) {
    const { L, nodes } = s, x = nodes[0], y = nodes[1];
    let dx = Math.cos(s.head), dy = Math.sin(s.head);
    // (a wander: a slowly drifting aim ahead of its snout)
    s.wander = within(s.wander + (Math.random() - 0.5) * dt * 2.4, -0.7, 0.7);
    dx += Math.cos(s.head + s.wander) * 0.3; dy += Math.sin(s.head + s.wander) * 0.3;
    // hunting: the fish it's after, where it's about to be; or its round
    if (sea.hunger > 0.3 && t >= s.look) { s.prey = findPrey(sea, s, bucket); s.look = t + 0.45; }
    if (sea.hunger <= 0.3) s.prey = null;
    const f = s.prey && s.prey.alive && s.prey.x > 0.03 && s.prey.x < aspect - 0.03 && s.prey.y > 0.03 && s.prey.y < 0.97 ? s.prey : null;
    let close = 0;
    if (f) {
      const tx = f.x + f.vx * 0.35 - x, ty = f.y + f.vy * 0.35 - y, d = Math.hypot(tx, ty) || 1, w = 1.4 + 2.6 * sea.hunger;
      dx += (tx / d) * w; dy += (ty / d) * w;
      close = within(1 - d / (L * 0.9), 0, 1);
    } else {
      const rx = (x - cx) / sx, ry = (y - cy) / sy, r = Math.hypot(rx, ry) || 1, ring = s.ring * (1 + 0.15 * Math.sin(t * 0.05 + s.id)), out = within((ring - r) / ring, -1, 1);
      dx += ((-ry / r) * s.dir + (rx / r) * out * 0.9) * 0.55;
      dy += ((rx / r) * s.dir + (ry / r) * out * 0.9) * 0.55;
    }
    // room for the others
    for (const o of sharks) {
      if (o === s) continue;
      for (let k = 0; k < SPINE; k += 3) {
        const ox = x - o.nodes[2 * k], oy = y - o.nodes[2 * k + 1], d = Math.hypot(ox, oy), far = (L + o.L) * 0.45;
        if (d < far && d > 1e-6) { const w = (1 - d / far) * 3; dx += (ox / d) * w; dy += (oy / d) * w; }
      }
    }
    // clear of the float (unless it's chasing), and back in when its snout's out of the window
    const ex = x - fx, ey = y - fy, e = Math.hypot(ex, ey), clear = 0.11 + 0.1 * L;
    if (e < clear && e > 1e-6) { const w = (1 - e / clear) * (f ? 1 : 2.5); dx += (ex / e) * w; dy += (ey / e) * w; }
    const over = Math.max(-x, x - aspect, -y, y - 1);
    if (over > -L * 0.15) { const w = within((over + L * 0.15) / (L * 0.35), 0, 1) * 3.5 + (over > 0 ? 3 : 0), tx = cx - x, ty = cy - y, d = Math.hypot(tx, ty) || 1; dx += (tx / d) * w; dy += (ty / d) * w; }
    // its turn: no sharper than its speed allows (out of the window, where it doesn't show, as sharp
    // as when hunting)
    const most = Math.min(f || over > 0 ? 1.7 + close : 0.8, s.speed / (L * (f || over > 0 ? 0.35 : 0.3))) * dt, turned = within(turnTo(s.head, Math.atan2(dy, dx)), -most, most);
    s.head += turned;
    s.turn += (turned / dt - s.turn) * Math.min(1, dt * 3);
    const cruise = (0.03 + 0.06 * L) * m.pace, want = f ? cruise * (1.45 + 1.5 * close) : cruise;
    s.speed += (want - s.speed) * Math.min(1, dt * 1.1);
    s.phase += dt * (2 + s.speed / 0.03);
    nodes[0] += Math.cos(s.head) * s.speed * dt;
    nodes[1] += Math.sin(s.head) * s.speed * dt;
    // the spine after the snout, a joint at a time, each bending so far and no further
    const seg = L / (SPINE - 1);
    let prev = s.head + Math.PI;
    for (let k = 1; k < SPINE; k++) {
      const px = nodes[2 * k - 2], py = nodes[2 * k - 1];
      const a = prev + within(turnTo(prev, Math.atan2(nodes[2 * k + 1] - py, nodes[2 * k] - px)), -0.12, 0.12);
      nodes[2 * k] = px + Math.cos(a) * seg;
      nodes[2 * k + 1] = py + Math.sin(a) * seg;
      prev = a;
    }
    // a catch
    if (f) {
      const r = L * 0.05 + 0.01;
      for (const g of sea.fish) {
        if (g.alive && (g.x - nodes[0]) ** 2 + (g.y - nodes[1]) ** 2 < r * r) {
          g.alive = false;
          g.back = t + between(3, 8);
          sea.hunger = Math.max(0, sea.hunger - 0.08);
          stamp(sea, sea.splash, g.x, g.y, 2, 1);
        }
      }
    }
  }
}
// the fish a shark goes for: ahead of it, near, and alone rather than in a crowd (it keeps after the
// one it's after unless another's clearly better)
function findPrey(sea, s, bucket) {
  const range = s.L * 0.9 + 0.2, x = s.nodes[0], y = s.nodes[1], ux = Math.cos(s.head), uy = Math.sin(s.head);
  let best = null, bestScore = Infinity, mine = Infinity;
  for (const f of sea.fish) {
    if (!f.alive || f.x < 0.06 || f.x > sea.aspect - 0.06 || f.y < 0.06 || f.y > 0.94) continue;
    const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy);
    if (d > range || d < 1e-6) continue;
    const ahead = (dx * ux + dy * uy) / d;
    if (ahead < 0.2) continue;
    const score = d * (1 + (1 - ahead) * 0.8) * (1 + sea.count[bucket(f.x, f.y)] * 0.07);
    if (score < bestScore) { bestScore = score; best = f; }
    if (f === s.prey) mine = score;
  }
  return s.prey && mine < bestScore * 1.3 ? s.prey : best;
}
// a little of something into the cells round x, y (a round of r cells)
function stamp(sea, field, x, y, r, amount) {
  const c0 = Math.floor(x / sea.cw), r0 = Math.floor((1 - y) / sea.ch);
  for (let r1 = r0 - r; r1 <= r0 + r; r1++) {
    for (let c1 = c0 - r; c1 <= c0 + r; c1++) {
      if (c1 < 0 || r1 < 0 || c1 >= sea.cols || r1 >= sea.rows) continue;
      const d = Math.hypot(c1 - c0, (r1 - r0) * 1.4);
      if (d > r + 0.5) continue;
      const i = r1 * sea.cols + c1;
      field[i] = Math.min(1.6, field[i] + amount * (1 - d / (r + 1)));
    }
  }
}
// the water stirred: by each fish (more as it flees), each shark's tail, the float on a kick;
// spreading to the cells round it and fading
function stirSea(sea, dt, m) {
  const { cols, rows, cw, ch } = sea;
  const at = (x, y) => { const c = Math.floor(x / cw), r = Math.floor((1 - y) / ch); return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c; };
  let w = sea.wake;
  for (const f of sea.fish) {
    if (!f.alive) continue;
    const i = at(f.x, f.y);
    if (i >= 0) w[i] = Math.min(1.6, w[i] + 0.025 + f.alarm * 0.05);
  }
  for (const s of sea.sharks) {
    for (let k = SPINE - 5; k < SPINE; k++) {
      const i = at(s.nodes[2 * k], s.nodes[2 * k + 1]);
      if (i >= 0) w[i] = Math.min(1.6, w[i] + 0.12 + 2 * s.speed);
    }
  }
  if (m.kick) stamp(sea, w, sea.fx, sea.fy, 4, 0.8);
  const fade = Math.exp(-dt * 1.5), o = sea.wake2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      o[i] = (w[i] * 4 + w[c > 0 ? i - 1 : i] + w[c < cols - 1 ? i + 1 : i] + w[r > 0 ? i - cols : i] + w[r < rows - 1 ? i + cols : i]) * 0.125 * fade;
    }
  }
  sea.wake = o;
  sea.wake2 = w;
  const gone = Math.exp(-dt * 2.2), sp = sea.splash;
  for (let i = 0; i < sp.length; i++) sp[i] *= gone;
}
// the sea a cell at a time for the shader: R a fish (how bright: nearer, and glinting as it turns or
// flees; the nearer where two share a cell), G the water stirred, B a splash
function seaCells(sea) {
  const { data, cols, rows, cw, ch, wake, splash, seen } = sea, frame = ++sea.frame;
  for (let i = 0, n = cols * rows; i < n; i++) {
    data[4 * i] = 0;
    data[4 * i + 1] = Math.min(255, wake[i] * 160);
    data[4 * i + 2] = Math.min(255, splash[i] * 255);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (const f of sea.fish) {
      if (!f.alive || (f.near > 0.78 ? 0 : 1) !== pass) continue;
      const c = Math.floor(f.x / cw), r = Math.floor((1 - f.y) / ch);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = r * cols + c;
      if (seen[i] === frame) continue;
      seen[i] = frame;
      const glint = within(Math.abs(f.turn) / 3.5, 0, 1);
      data[4 * i] = Math.round(255 * within(0.3 + (0.4 * (f.near - 0.55)) / 0.45 + 0.3 * Math.max(glint, f.alarm), 0.05, 1));
    }
  }
}
// the sharks for the shader: each one's spine with its swimming wave on it (stronger toward the
// tail, quicker and wider the faster it goes), kind, length and fins (the one inside a turn
// foreshortened, the outer spread), its box, how near it is and its number
function seaSharks(sea, spine, kinds, boxes, nears) {
  sea.sharks.forEach((s, k) => {
    const { L, nodes } = s, swim = within(s.speed / 0.06, 0.4, 1.4);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let j = 0; j < SPINE; j++) {
      const u = j / (SPINE - 1), a = Math.max(0, j - 1), b = Math.min(SPINE - 1, j + 1);
      const tx = nodes[2 * a] - nodes[2 * b], ty = nodes[2 * a + 1] - nodes[2 * b + 1], tl = Math.hypot(tx, ty) || 1;
      const off = L * 0.05 * (0.1 + 0.9 * u ** 1.8) * swim * Math.sin(s.phase - u * 5.2);
      const x = nodes[2 * j] - (ty / tl) * off, y = nodes[2 * j + 1] + (tx / tl) * off;
      spine[(k * SPINE + j) * 2] = x;
      spine[(k * SPINE + j) * 2 + 1] = y;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    const bank = within(s.turn * 0.45, -0.35, 0.35), flex = 1 + 0.06 * Math.sin(s.phase * 0.5), mg = L * 0.3;
    kinds.set([s.kind, L, flex * (1 - bank), flex * (1 + bank)], k * 4);
    boxes.set([x0 - mg, y0 - mg, x1 + mg, y1 + mg], k * 4);
    nears.set([s.near, s.id, 0, 0], k * 4);
  });
}

export function createScenery(canvas) {
  let gl = null, ready = false, scenes = {}, makeProgram = null, paint = null, vao = null, cellTex = null, colTex = null, tileTex = null, lifeTex = null, sheetTex = null, spriteTex = null, fbo = null, dims = null, broken = false;
  const boatCv = Object.assign(document.createElement('canvas'), { width: SW, height: SH }), boatG = boatCv.getContext('2d');
  let popAt = -9, dipAt = -9, dropSeen = -99;
  // the music: the walk (in beats, kept on the beat), the wind, the glow, the fireflies, the
  // ripples, the birds or a falling star
  let last = 0, walkB = 0, beamB = 0, swimB = 0, car = null, wind = 0.25, glowV = 0, flyV = 0, kickAt = -1, lastBar = null, flock = null, falling = null;
  const rips = [], ripV = new Float32Array(16);
  // the sharks' water while their scene is up (a kick for it, the last pop it saw; the sharks for
  // the shader: spines, kinds, boxes, how near)
  let sea = null, seaKick = false, seaPop = -9;
  const shkV = new Float32Array(2 * 3 * SPINE), shkKV = new Float32Array(12), shkBV = new Float32Array(12), shkDV = new Float32Array(12);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; });
  // (the sheet drawn again once the app's font is in)
  document.fonts?.ready.then(() => { dims = null; });

  function build() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) { broken = true; return; }
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const program = (fs) => {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'a');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const loc = {};
      return { p, u: (n) => (loc[n] ??= gl.getUniformLocation(p, n)) };
    };
    makeProgram = program;
    scenes = {};
    paint = program(PAINT);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    cellTex = gl.createTexture();
    colTex = gl.createTexture();
    tileTex = gl.createTexture();
    lifeTex = gl.createTexture();
    sheetTex = gl.createTexture();
    spriteTex = gl.createTexture();
    fbo = gl.createFramebuffer();
    dims = null;
    ready = true;
  }
  // each scene's program, made the first time it's shown (the library and its own part)
  const sceneProgram = (name) => (scenes[name] ??= makeProgram(LIB + (MAINS[name] || MAINS.lake)));

  // The grid of cells for the window (the scene's three pictures: glyph and ink, colour, tile), and the
  // sheet: each glyph in a slot the size of a cell, in device pixels.
  function layout(W, H, dpr) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'monospace';
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${PX}px ${font}`;
    const cw = m.measureText('M'.repeat(50)).width / 50 || 6;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / PX);
    const sw = Math.ceil(cw * dpr), sh = Math.ceil(PX * dpr), perRow = 16;
    const sheet = document.createElement('canvas');
    sheet.width = perRow * sw;
    sheet.height = Math.ceil(SHEET.length / perRow) * sh;
    const sx = sheet.getContext('2d');
    sx.font = `${PX * dpr}px ${font}`;
    sx.textBaseline = 'middle';
    sx.textAlign = 'center';
    sx.fillStyle = '#fff';
    SHEET.forEach((g, i) => sx.fillText(g, (i % perRow) * sw + sw / 2, Math.floor(i / perRow) * sh + sh * 0.55));
    gl.bindTexture(gl.TEXTURE_2D, sheetTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    for (const t of [cellTex, colTex, tileTex]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cellTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, colTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, tileTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    dims = { W, H, dpr, cw, cols, rows, sw, sh, perRow, sheetW: sheet.width, sheetH: sheet.height };
  }

  return {
    get broken() { return broken; },
    // the scenes, by name
    get scenes() { return Object.keys(MAINS); },
    // (the canvas shrunk, its full-window buffer freed while it's off)
    clear() {
      canvas.width = canvas.height = 1;
      dims = null;
      rips.length = 0;
      flock = falling = null; lastBar = null;
      sea = null;
    },
    // col: the theme's colours (0-255), which also say day (a light theme) or night; offset: how far
    // ahead to draw (as the blocks), for the walk; colours: 'own' (the scenery's) or 'theme' (its
    // two); strength: the ASCII backgrounds' strength (with the theme's colours), 1.5 the usual;
    // scene: which (lake, sea, fire, snow)
    draw(t, eng, { col, offset = 0, colours = 'own', strength = 1.5, scene = 'lake' } = {}) {
      if (broken || gl?.isContextLost()) return;
      if (!ready) {
        try { build(); } catch (err) { broken = true; console.error('scenery:', err); return; }
        if (broken) return;
      }
      const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      if (!dims || dims.W !== W || dims.H !== H || dims.dpr !== dpr) layout(W, H, dpr);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;

      // the walk: a cell a beat in front (slower further back), slowly when nothing's playing, and
      // nudged onto the beat
      const T = eng.tempo, bpm = T.locked ? T.bpm : 96;
      walkB += dt * (bpm / 60) * (eng.silent ? 0.25 : 1);
      const step = T.locked ? eng.stepAt(t + offset) : null;
      if (step !== null) walkB += ((((step / 4 - walkB) % 1) + 1.5) % 1 - 0.5) * 0.08;
      // the lighthouse's beam: a turn every 2 bars, kept on the bars (facing you on every other bar's
      // first beat) the way the walk is kept on the beats
      beamB += dt * (bpm / 60) * (eng.silent ? 0.25 : 1);
      // the koi's swim: easy, darting ahead on each kick
      swimB += dt * (0.35 + 2.2 * Math.exp(-Math.max(0, t - dipAt) * 3));
      if (step !== null) beamB += ((((step / 4 - beamB) % 8) + 12) % 8 - 4) * 0.08;
      // the wind and the fireflies: the hats in the last 2 s
      let hats = 0;
      for (const o of eng.onsets) if (o.id === 'hh' && o.t > t - 2) hats++;
      const busy = Math.min(1, hats / 24);
      wind += (0.18 + busy * 0.75 - wind) * (1 - Math.exp(-dt / 1.5));
      flyV += (busy - flyV) * (1 - Math.exp(-dt / 2.5));
      // the sun's rays and the stars' twinkle: the loudness
      const lv = Math.min(1, Math.max(0, (20 * Math.log10(eng.level || 1e-6) + 50) / 50));
      glowV += (lv - glowV) * (1 - Math.exp(-dt / 0.4));
      const V = (LAYOUT[scene] || LAYOUT.lake)[H > W ? 1 : 0], aspect = W / H;
      const night = col.bg[0] + col.bg[1] + col.bg[2] < col.fg[0] + col.fg[1] + col.fg[2] ? 1 : 0;
      // a ripple on the lake for each kick (while the kick's in the song), somewhere on it
      const kick = eng.v.bd.lastHit;
      if (kick.t > kickAt && t - kick.t < 0.3) {
        kickAt = kick.t;
        dipAt = t;
        if (eng.present('bd', t)) {
          if (scene === 'falls') rips.push({ x: (0.5 + (Math.random() - 0.5) * 0.1) * aspect, y: V.lake[0] - 0.035 - 0.03 * Math.random(), t });
          else if (scene === 'sharks') { rips.push({ x: V.toaster.x * aspect, y: V.toaster.y, t }); seaKick = true; }
          else rips.push({ x: (0.15 + 0.7 * Math.random()) * aspect, y: V.lake[1] + (V.lake[0] - V.lake[1]) * (0.25 + 0.6 * Math.random()), t });
          if (rips.length > 4) rips.shift();
        }
      }
      // every 8 bars, on the bar's first beat: birds cross by day (if none are crossing), a star
      // falls by night
      const bar = step !== null ? Math.floor(step / 16) : null;
      if (bar !== null && bar !== lastBar) {
        if (lastBar !== null && bar % 8 === 0) {
          popAt = t;
          if (!night && !flock) flock = { t, y: 0.66 + 0.18 * Math.random() };
          if (night) falling = { t, x: (0.35 + 0.55 * Math.random()) * aspect, y: 0.72 + 0.2 * Math.random() };
          if (scene === 'city' && !car) car = { t, colour: Math.random() < 0.6 ? 0 : 1 };
        }
        lastBar = bar;
      }
      let birds = [0, 0, 0, 0];
      if (flock) {
        const x = aspect + 0.1 - (t - flock.t) * 0.045;
        if (x < -0.4) flock = null;
        else birds = [x, flock.y, Math.floor(walkB * 2) % 2, 1];
      }
      if (falling && t - falling.t > 1.3) falling = null;
      // (the city's car crossing, left to right, at an easy pace)
      let carU = [0, 0, 0, 0];
      if (car) {
        const x = -0.35 + (t - car.t) * 0.3;
        if (x > aspect + 0.4 || scene !== 'city') car = null;
        else carU = [x, 0, car.colour, 1];
      }
      if ((eng.lastDrop ?? -99) > dropSeen) { dropSeen = eng.lastDrop; if (t - eng.lastDrop < 1) popAt = t; }
      const pa = t - popAt;
      // (the toaster on its broom: flying across the moon, drifting to and fro, rising and falling,
      // slowly; its middle, CSS pixels)
      const Sz = Math.max(1, Math.round(H / 270));
      const flight = V.toaster.on === 'broom' ? { x: (V.toaster.x + 0.03 * Math.sin(t * 0.17)) * W, y: (1 - V.toaster.y - 0.012 * Math.sin(t * 0.71)) * H } : null;
      drawBoat(boatG, { dy: (V.toaster.on === 'broom' ? 5 : 0) + (['boat', 'tube', 'broom', 'float'].includes(V.toaster.on) ? Math.floor(walkB) % 2 : 0), pop: pa < 0.7 ? Math.round(5 * Math.sin((Math.PI * pa) / 0.7)) : 0, dip: t - dipAt < 0.2 ? 1 : 0, on: V.toaster.on, toast: (walkB % 32) / 32 });
      const shoot = falling ? [falling.x, falling.y, t - falling.t, 1] : [0, 0, 0, 0];
      // (the sharks' water: stepped on, a 60th of a second a step and at most 4 a frame, with the
      // kicks, the hunger a drop or the toast's pop brings, the loudness; its cells and the sharks
      // handed over)
      if (scene === 'sharks') {
        if (!sea || sea.cols !== dims.cols || sea.rows !== dims.rows || sea.aspect !== aspect) sea = newSea(dims.cols, dims.rows, dims.cw / H, PX / H, aspect, V.toaster.x * aspect, V.toaster.y);
        if (popAt > seaPop) { seaPop = popAt; if (t - popAt < 1) sea.hunger = 1; }
        sea.acc += dt;
        let steps = 0;
        while (sea.acc >= SEA_STEP && steps < 4) {
          stepSea(sea, { kick: seaKick, pace: 0.9 + 0.25 * glowV });
          seaKick = false;
          sea.acc -= SEA_STEP;
          steps++;
        }
        if (steps === 4) sea.acc = 0;
        if (steps) seaCells(sea);
        seaSharks(sea, shkV, shkKV, shkBV, shkDV);
      } else { sea = null; seaKick = false; }

      // the scene into the cells
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
      gl.viewport(0, 0, dims.cols, dims.rows);
      let sp;
      try { sp = sceneProgram(scene); } catch (err) { broken = true; console.error('scenery:', err); return; }
      gl.useProgram(sp.p);
      const u = sp.u;
      gl.uniform2f(u('grid'), dims.cols, dims.rows);
      gl.uniform2f(u('cellPx'), dims.cw, PX);
      gl.uniform2f(u('view'), W, H);
      gl.uniform1f(u('time'), t % 1000);
      gl.uniform1f(u('wind'), wind);
      gl.uniform1f(u('glow'), glowV);
      gl.uniform1f(u('fly'), flyV);
      gl.uniform1f(u('night'), night);
      gl.uniform4f(u('walk'), ...SPEED.slice(0, 4).map((s) => Math.floor(walkB * s)));
      gl.uniform1f(u('clouds'), Math.floor(walkB * SPEED[4] + t * 0.15));
      gl.uniform4fv(u('farL'), V.far);
      gl.uniform4fv(u('midL'), V.mid);
      gl.uniform4fv(u('nearL'), V.near);
      gl.uniform2fv(u('lake'), V.lake);
      gl.uniform2f(u('sunAt'), V.sun[0] * aspect, V.sun[1]);
      gl.uniform4f(u('band'), V.band[0] * aspect, V.band[1], V.band[2], V.band[3]);
      gl.uniform4f(u('sea'), beamB * Math.PI / 4, swimB, walkB, Math.exp(-Math.max(0, t - dipAt) * 4));
      ripV.fill(0);
      rips.forEach((r, i) => ripV.set([r.x, r.y, t - r.t, 1], i * 4));
      gl.uniform4fv(u('rip'), ripV);
      gl.uniform4fv(u('birds'), birds);
      gl.uniform4fv(u('shoot'), shoot);
      gl.uniform4fv(u('car'), flight ? [(flight.x - 20 * Sz) / H, 1 - (flight.y + 9.5 * Sz) / H, 0, 1] : carU);
      gl.uniform4f(u('leap'), t - popAt, Math.floor(popAt * 3.7) % 2 ? 1 : -1, (((popAt * 0.618) % 1) + 1) % 1, scene === 'falls' || scene === 'halloween' ? 1 : 0);
      gl.uniform4f(u('moon'), (V.moon?.[0] ?? 0) * aspect, V.moon?.[1] ?? 0, V.moon?.[2] ?? 0, 0);
      if (scene === 'sharks') {
        gl.uniform2fv(u('shk'), shkV);
        gl.uniform4fv(u('shkK'), shkKV);
        gl.uniform4fv(u('shkB'), shkBV);
        gl.uniform4fv(u('shkD'), shkDV);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, lifeTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, dims.cols, dims.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, sea.data);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.uniform1i(u('life'), 5);
        // (moon: the toaster's ring, its middle and its radius)
        gl.uniform4f(u('moon'), V.toaster.x * aspect, V.toaster.y, (12.6 * Math.max(1, Math.round(H / 270))) / H, 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // the glyphs onto the window
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(paint.p);
      const p = paint.u;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cellTex);
      gl.uniform1i(p('cells'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, colTex);
      gl.uniform1i(p('cols'), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sheetTex);
      gl.uniform1i(p('sheet'), 2);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, tileTex);
      gl.uniform1i(p('tiles'), 4);
      gl.uniform1f(p('gridK'), scene === 'sharks' ? 1 : 0);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, spriteTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boatCv);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(p('sprite'), 3);
      // (where the toaster fishes from: a boat out on the lake, a rock in the sea's shallows, its
      // float clear of the light's path; or where it sits by the campfire)
      const S = Math.max(1, Math.round(H / 270)), bw = SW * S, bh = SH * S;
      const wideF = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
      const flying = V.toaster.on === 'broom';
      const waterY = flying ? 1e6 : V.toaster.on === 'bridge'
        ? (1 - (V.lake[1] + (V.lake[0] - V.lake[1]) * 0.4 + (0.1 + 0.03 * wideF))) * H + (WATER - 18.5) * S
        : (1 - (V.lake[1] + (V.lake[0] - V.lake[1]) * V.toaster.y)) * H;
      const bx = flying ? flight.x - bw / 2 : (V.toaster.on === 'bridge' ? (0.5 + 0.14 * wideF) * W : V.toaster.x * W) - bw / 2;
      const by = flying ? flight.y - bh / 2 : waterY - (V.toaster.on === 'tube' ? 20 : V.toaster.on === 'float' ? SH / 2 : WATER) * S;
      gl.uniform4f(p('spr'), bx, by, bw, bh);
      gl.uniform1f(p('water'), ['log', 'ice', 'umbrella', 'bridge', 'broom', 'float'].includes(V.toaster.on) ? 1e6 : waterY);
      gl.uniform1f(p('night'), night);
      gl.uniform3fv(p('tint'), night ? V.tint || [0.8, 0.82, 0.96] : [1, 1, 1]);
      gl.uniform3fv(p('toneC'), night ? V.toneN || [0.1, 0.12, 0.17] : V.toneD || [-0.075, -0.045, -0.015]);
      // (the campfire's light on the paper, breathing with the loudness)
      const kickV = Math.exp(-Math.max(0, t - dipAt) * 4);
      if (scene === 'fire' && night) gl.uniform4f(p('light'), 0.5 * W, (1 - V.lake[1] - 0.04) * H, 0.55 * H, 0.7 + 0.2 * glowV + 0.25 * kickV + 0.06 * Math.sin(t * 13) * Math.sin(t * 7.3));
      else if (scene === 'snow' && night) {
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22)), cs = 0.7 + 0.3 * wide;
        gl.uniform4f(p('light'), (0.8 - 0.04 * wide) * W, (1 - V.lake[0] - 0.045 * cs) * H, 0.2 * cs * H, 0.5 + 0.06 * Math.sin(t * 7) * Math.sin(t * 4.3));
      } else if (scene === 'city' && night) {
        // (the streetlamp's pool of light, and the sign's pink glow, brighter on the kick)
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
        gl.uniform4f(p('light'), ((0.9 - 0.02 * wide) * aspect - 0.035) * H, (1 - 0.2 - 0.04 * wide) * H, 0.34 * H, 0.75);
      } else if (scene === 'garden' && night) {
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
        gl.uniform4f(p('light'), (0.22 + 0.28 * wide) * W, (1 - V.lake[0] - 0.05) * H, 0.13 * H, 0.45 + 0.2 * glowV);
      } else if (scene === 'halloween' && night) {
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
        gl.uniform4f(p('light'), (0.22 + 0.41 * wide) * W, (1 - 0.055) * H, 0.17 * H, 0.5 + 0.3 * kickV + 0.12 * glowV + 0.08 * Math.sin(t * 11) * Math.sin(t * 6.7));
      } else gl.uniform4f(p('light'), 0, 0, 1, 0);
      if (scene === 'city' && night) {
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
        gl.uniform4f(p('light2'), (0.5 + 0.06 * wide) * W, (1 - V.lake[0] - 0.095) * H, 0.2 * H, 0.55 + 0.3 * kickV);
        gl.uniform3f(p('light2C'), 0.3, 0.04, 0.17);
      } else if (scene === 'garden' && night) {
        const wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
        gl.uniform4f(p('light2'), (0.86 - 0.04 * wide) * W, (1 - V.lake[0] - 0.05) * H, 0.13 * H, 0.45 + 0.2 * glowV);
        gl.uniform3f(p('light2C'), 0.32, 0.13, 0.03);
      } else if (scene === 'halloween' && night) {
        gl.uniform4f(p('light2'), V.moon[0] * W, (1 - V.moon[1]) * H, V.moon[2] * 1.9 * H, 0.85 + 0.25 * glowV);
        gl.uniform3f(p('light2C'), 0.1, 0.085, 0.12);
      } else gl.uniform4f(p('light2'), 0, 0, 1, 0);
      gl.uniform1f(p('time'), t % 1000);
      gl.uniform2f(p('grid'), dims.cols, dims.rows);
      gl.uniform2f(p('cellPx'), dims.cw, PX);
      gl.uniform2f(p('slot'), dims.sw, dims.sh);
      gl.uniform2f(p('sheetSize'), dims.sheetW, dims.sheetH);
      gl.uniform1f(p('perRow'), dims.perRow);
      gl.uniform1f(p('dpr'), dpr);
      gl.uniform1f(p('H'), canvas.height);
      gl.uniform1f(p('k'), strength / 1.5);
      gl.uniform1f(p('own'), colours === 'own' ? 1 : 0);
      gl.uniform1f(p('horizon'), 1 - V.far[0]);
      gl.uniform3f(p('bg'), col.bg[0] / 255, col.bg[1] / 255, col.bg[2] / 255);
      gl.uniform3f(p('fg'), col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
      // (the paper: a night sky, darkest overhead; or the day's warm paper)
      // (or the scene's own)
      const paper = night ? V.paperN || [[4, 5, 13], [14, 18, 46]] : V.paperD || (V.cool ? [[222, 230, 242], [244, 247, 251]] : [[238, 232, 214], [248, 244, 232]]);
      gl.uniform3f(p('top'), paper[0][0] / 255, paper[0][1] / 255, paper[0][2] / 255);
      gl.uniform3f(p('low'), paper[1][0] / 255, paper[1][1] / 255, paper[1][2] / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
    },
  };
}
