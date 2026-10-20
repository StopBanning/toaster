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
const SPEED = [1, 0.5, 0.25, 0.12, 0.2];
// the glyphs the scene draws with (the first, blank, is nothing there)
const GLYPHS = {
  BLANK: ' ', DOT: '.', MID: '·', COMMA: ',', TICK: "'", COLON: ':', DASH: '-', TILDE: '~', EQ: '=', APPROX: '≈', UNDER: '_',
  CARET: '^', SLASH: '/', BACK: '\\', BAR: '|', LP: '(', RP: ')', STAR: '*', PLUS: '+', SMALLO: 'o', BIGO: 'O', AT: '@', PCT: '%',
  VEE: 'v', TRI: '▲', TRIO: '△', LIGHT: '░', MEDIUM: '▒', DARK: '▓', HATCH: '╱', HATCHB: '╲', DBL: '═', LINE: '─',
  SPARK: '✦', BULLET: '•', QUOTE: '"',
};
const SHEET = Object.values(GLYPHS);
const DEFS = Object.keys(GLYPHS).map((k, i) => `#define G_${k} ${i}`).join('\n');

const VS = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// The scene, a cell at a time: R the glyph (its place on the sheet), G its ink (0-1); and its colour.
const SCENE = `#version 300 es
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
layout(location = 0) out vec4 o;
layout(location = 1) out vec4 oc;
uint hu(uvec2 q) { q *= uvec2(1597334673u, 3812015801u); return (q.x ^ q.y) * 1597334673u; }
float h2(vec2 p) { return float(hu(uvec2(ivec2(floor(p)) + 32768))) / 4294967295.0; }
float h1(float x) { return h2(vec2(x, 7.0)); }
float vn(float x) { float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float vn2(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float cw, ch;
bool day;
void put(int g, float ink, vec3 c) { o = vec4(float(g) / 255.0, ink, 0.0, 1.0); oc = vec4(clamp(c, 0.0, 1.0), 1.0); }
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

  // --- the sky
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
    float gal = galaxy(Pc, farL.x, warm);
    float sp = h2(cell + 91.0);
    float chance = 0.035 * (1.0 + 4.0 * min(1.0, gal));
    if (Y > farL.x + 0.02 && sp < chance) {
      float b = min(4.0, 0.22 * pow(max(h2(cell + 33.0), 1e-3), -0.83));
      float tw = 0.75 + 0.25 * sin(time * (0.8 + 2.4 * h2(cell)) + sp * 60.0) * (0.5 + glow);
      int g = b < 0.4 ? G_DOT : b < 0.75 ? G_MID : b < 1.4 ? G_PLUS : b < 2.6 ? G_STAR : G_SPARK;
      put(g, clamp((0.35 + 0.3 * b) * tw, 0.0, 1.0), starTint(h2(cell + 55.0)));
      return;
    }
    // the Milky Way's light: a haze of the faintest dots, warm at the core, dark in its lanes
    if (Y > farL.x + 0.01 && gal > 0.05) {
      float dens = smoothstep(0.08, 1.0, gal) * 0.95;
      if (h0 < dens) {
        int g = gal > 0.7 && h0 < dens * 0.4 ? G_COLON : (h0 < dens * 0.65 ? G_MID : G_DOT);
        put(g, clamp(0.42 + 0.45 * gal, 0.0, 1.0), mix(rgb(160.0, 182.0, 228.0), rgb(244.0, 208.0, 162.0), warm));
        return;
      }
    }
    // airglow: a faint green haze just over the far peaks
    float ag = Y - farL.x - farL.y * 0.2;
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
}`;

// The glyphs, each from the sheet, over the paper. In its own colours: each in its colour, on a
// night sky (darkest overhead) or on the day's paper; or in the theme's: its ink in the theme's
// colour on its background. k: how strongly it shows (A's strength, in the theme's colours).
const PAINT = `#version 300 es
precision highp float;
uniform sampler2D cells, cols, sheet, sprite;
uniform vec2 grid, cellPx, slot, sheetSize;
uniform float perRow, dpr, H, k, own, horizon, night, time, water;
uniform vec3 bg, fg, top, low;
uniform vec4 spr;        // the boat: where it is (CSS pixels: x, y, w, h)
out vec4 o;
vec3 boat(vec4 sp) { return own > 0.5 ? sp.rgb * (night > 0.5 ? vec3(0.8, 0.82, 0.96) : vec3(1.0)) : mix(bg, fg, dot(sp.rgb, vec3(0.3, 0.55, 0.15))); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, H - gl_FragCoord.y) / dpr;
  vec2 cell = floor(p / cellPx);
  ivec2 at = ivec2(int(cell.x), int(grid.y) - 1 - int(cell.y));
  vec4 c = texelFetch(cells, at, 0);
  float gi = floor(c.r * 255.0 + 0.5);
  vec2 f = (p - cell * cellPx) / cellPx;
  float cov = gi > 0.5 ? texture(sheet, (vec2(mod(gi, perRow), floor(gi / perRow)) + f) * slot / sheetSize).a : 0.0;
  vec3 col;
  if (own > 0.5) {
    float y = p.y / (H / dpr);
    vec3 paper = mix(top, low, smoothstep(0.0, horizon, y));
    col = mix(paper, texelFetch(cols, at, 0).rgb, cov * c.g);
  } else col = mix(bg, fg, cov * min(1.0, c.g * k));
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
// the toast pops up on a drop and every 8 bars. 40 x 28 pixels; the water's line at 22.
const SW = 40, SH = 28, WATER = 22.5;
function drawBoat(g, { dy, pop, dip }) {
  g.clearRect(0, 0, SW, SH);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y + dy, w, h); };
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
  // the rowboat
  rect(6, 18, 28, 1, '#c8925a'); rect(6, 19, 28, 1, '#8a5a2b'); rect(7, 20, 26, 1, '#6e4521'); rect(8, 21, 24, 1, '#8a5a2b'); rect(10, 22, 20, 1, '#5e3a1a');
  // the rod, the line and the float (red over white), on the water
  line(23, 14, 34, 3, '#b0804e');
  rect(34, 3, 1, 1, '#d8a870');
  const fy = 21 + dip;
  line(35, 4, 36, fy - 1, 'rgba(150, 156, 184, 0.55)');
  rect(36, fy - 1, 1, 1, '#e04848'); rect(36, fy, 1, 1, '#ffffff');
}

export function createScenery(canvas) {
  let gl = null, scene = null, paint = null, vao = null, cellTex = null, colTex = null, sheetTex = null, spriteTex = null, fbo = null, dims = null, broken = false;
  const boatCv = Object.assign(document.createElement('canvas'), { width: SW, height: SH }), boatG = boatCv.getContext('2d');
  let popAt = -9, dipAt = -9, dropSeen = -99;
  // the music: the walk (in beats, kept on the beat), the wind, the glow, the fireflies, the
  // ripples, the birds or a falling star
  let last = 0, walkB = 0, wind = 0.25, glowV = 0, flyV = 0, kickAt = -1, lastBar = null, flock = null, falling = null;
  const rips = [], ripV = new Float32Array(16);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); scene = null; });
  canvas.addEventListener('webglcontextrestored', () => { scene = null; });
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
    scene = program(SCENE);
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
    sheetTex = gl.createTexture();
    spriteTex = gl.createTexture();
    fbo = gl.createFramebuffer();
    dims = null;
  }

  // The grid of cells for the window (the scene's two pictures: glyph and ink, colour), and the
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
    for (const t of [cellTex, colTex]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cellTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, colTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    dims = { W, H, dpr, cw, cols, rows, sw, sh, perRow, sheetW: sheet.width, sheetH: sheet.height };
  }

  return {
    get broken() { return broken; },
    // (the canvas shrunk, its full-window buffer freed while it's off)
    clear() {
      canvas.width = canvas.height = 1;
      dims = null;
      rips.length = 0;
      flock = falling = null; lastBar = null;
    },
    // col: the theme's colours (0-255), which also say day (a light theme) or night; offset: how far
    // ahead to draw (as the blocks), for the walk; colours: 'own' (the scenery's) or 'theme' (its
    // two); strength: the ASCII backgrounds' strength (A, with the theme's colours), 1.5 the usual
    draw(t, eng, { col, offset = 0, colours = 'own', strength = 1.5 } = {}) {
      if (broken || gl?.isContextLost()) return;
      if (!scene) {
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
      // the wind and the fireflies: the hats in the last 2 s
      let hats = 0;
      for (const o of eng.onsets) if (o.id === 'hh' && o.t > t - 2) hats++;
      const busy = Math.min(1, hats / 24);
      wind += (0.18 + busy * 0.75 - wind) * (1 - Math.exp(-dt / 1.5));
      flyV += (busy - flyV) * (1 - Math.exp(-dt / 2.5));
      // the sun's rays and the stars' twinkle: the loudness
      const lv = Math.min(1, Math.max(0, (20 * Math.log10(eng.level || 1e-6) + 50) / 50));
      glowV += (lv - glowV) * (1 - Math.exp(-dt / 0.4));
      const V = H > W ? TALL : WIDE, aspect = W / H;
      const night = col.bg[0] + col.bg[1] + col.bg[2] < col.fg[0] + col.fg[1] + col.fg[2] ? 1 : 0;
      // a ripple on the lake for each kick (while the kick's in the song), somewhere on it
      const kick = eng.v.bd.lastHit;
      if (kick.t > kickAt && t - kick.t < 0.3) {
        kickAt = kick.t;
        dipAt = t;
        if (eng.present('bd', t)) {
          rips.push({ x: (0.15 + 0.7 * Math.random()) * aspect, y: V.lake[1] + (V.lake[0] - V.lake[1]) * (0.25 + 0.6 * Math.random()), t });
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
      if ((eng.lastDrop ?? -99) > dropSeen) { dropSeen = eng.lastDrop; if (t - eng.lastDrop < 1) popAt = t; }
      const pa = t - popAt;
      drawBoat(boatG, { dy: Math.floor(walkB) % 2, pop: pa < 0.7 ? Math.round(5 * Math.sin((Math.PI * pa) / 0.7)) : 0, dip: t - dipAt < 0.2 ? 1 : 0 });
      const shoot = falling ? [falling.x, falling.y, t - falling.t, 1] : [0, 0, 0, 0];

      // the scene into the cells
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0, 0, dims.cols, dims.rows);
      gl.useProgram(scene.p);
      const u = scene.u;
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
      ripV.fill(0);
      rips.forEach((r, i) => ripV.set([r.x, r.y, t - r.t, 1], i * 4));
      gl.uniform4fv(u('rip'), ripV);
      gl.uniform4fv(u('birds'), birds);
      gl.uniform4fv(u('shoot'), shoot);
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
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, spriteTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boatCv);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(p('sprite'), 3);
      // (where the boat floats: out on the lake, its float clear of the light's path)
      const S = Math.max(1, Math.round(H / 270)), bw = SW * S, bh = SH * S;
      const waterY = (1 - (V.lake[0] - (V.lake[0] - V.lake[1]) * 0.3)) * H;
      const bx = (H > W ? 0.42 : 0.58) * W - bw / 2, by = waterY - WATER * S;
      gl.uniform4f(p('spr'), bx, by, bw, bh);
      gl.uniform1f(p('water'), waterY);
      gl.uniform1f(p('night'), night);
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
      if (night) { gl.uniform3f(p('top'), 4 / 255, 5 / 255, 13 / 255); gl.uniform3f(p('low'), 14 / 255, 18 / 255, 46 / 255); }
      else { gl.uniform3f(p('top'), 238 / 255, 232 / 255, 214 / 255); gl.uniform3f(p('low'), 248 / 255, 244 / 255, 232 / 255); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
    },
  };
}
