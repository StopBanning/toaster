// Worlds: the song as a film of planets, after Anthropic's Claude Opus 5.5 launch film ("There's
// more to discover"), by way of the Locust films' worlds (the Locust Worlds page, whose world
// shader this is, with Toaster's own touches). Every shot has the same horizon across the frame:
// a sky above, and below an extreme close-up of a material (caramel, a leaf, marble, a wing,
// lace, terracotta, dunes, a circuit board...) seen as a planet from low orbit, the foreground
// soft the way a macro lens leaves it, gold dust in the air, grain over all of it. It cuts to the
// next world on the bar's first kick (once a bar; every other bar with fewer flashes), and the song's
// title sits on the horizon a word or two at a time, the next piece each bar. When the kick
// drops out, the film goes to its title card, dawn over a dark planet with the whole title, until
// the kick comes back. The terminal world shows the code, the ledger keeps the song's bars, the
// engraving has the title cut into it.
import { LOOKS, onePart } from './worldlooks.js';
import { WORLD_NOISE } from './world-noise.js';
import { RAMP } from './visuals.js';
// how long a look's program has been done before it's shown (ms): the graphics driver's own
// finishing of a shader new to it, about half a second, over by then (as the scenery has it)
const SETTLE_MS = 1500;
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const WORLD = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uRes;       // render target, pixels
uniform float uScale;    // render pixels per design pixel (design frame is 1920x1080)
uniform vec3 uCircle;    // horizon circle: centre x, centre y, radius (design px, y down)
uniform float uT;        // seconds into the shot
uniform int uWorld;
uniform int uVar;        // palette variant (dawn: 0 dawn, 1 lime airglow, 2 rainbow)
uniform float uBlend;    // dawn: blend from the variant's palette toward dawn
uniform float uFore;     // 0 = macro (mild foreshortening), 1 = seen from orbit
uniform vec2 uDrift;     // surface drift, design px per second
uniform vec3 uLight;     // light direction, y down
uniform vec3 uSkyA;      // sky gradient, top
uniform vec3 uSkyB;      // sky gradient, at the horizon
uniform float uSkyH;     // where the sky gradient ends, design px (0: 1080, as the films have it)
uniform float uStars;
uniform vec4 uSun;       // a sun behind the horizon: centre (design px), radius, strength (0 for none)
uniform vec4 uGlow;      // light along the horizon: colour, strength
uniform vec4 uBand;      // the galaxy's band: strength (0 for none), its tilt from straight up (radians), where it rises from the horizon (design px across), its core's height up it (design px)
uniform float uSkySeed;  // the sky's own draw: where its stars and clouds fall
uniform int uPass;       // 1: only the band, into a picture of its own (it holds still through the shot, so it's drawn once a shot)
uniform sampler2D uTexSky;
uniform float uQuilt;      // 1: the cells look (the planet in cells of the worlds around it)
uniform int uQuiltIds[6];  // the other worlds its cells show
uniform int uPrevWorld;    // the world the shot before showed (the cells turn over from it)
uniform float uCutSeed;    // a new cut each shot
uniform float uAge;        // seconds into the shot
uniform float uBeat;       // a beat, seconds
uniform float uCalm;       // 1 with fewer flashes: the cells slide slower
uniform vec3 uZoom;      // the camera pushing in: focus (design px), factor
uniform vec4 uAct;       // the board: signals on the traces (x), status lights amber rather than lime (y), their brightness (z)
uniform float uHit;      // the music's light: how hard the last hit was, fading (lifts the rim and the glitter)
uniform sampler2D uTexCode;
uniform sampler2D uTexLedger;
uniform sampler2D uTexMark;

out vec4 outColor;

#define PI 3.14159265
#define TAU 6.2831853

float h21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n + 17.31)); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p, int oct) {
  float a = 0.5; float s = 0.0; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * vn(p); p = m * p; a *= 0.5; }
  return s;
}
// x: distance to the nearest feature point, y: distance to the cell edge, z: cell id
vec3 voro(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); float d1 = 9.0; float d2 = 9.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 o = h22(i + g); vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h21(i + g); } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
}
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }

// The night sky as a long exposure from orbit has it (the numbers from star counts and photographs
// of the sky). Stars: their brightness drawn from a power law (each magnitude fainter, about three
// times as many), so a few stand out and most are a fine dust; their colours as a camera sees them,
// never more than pale: a few blue-white, most white to cream, the rest pale gold and pale orange,
// the fainter the greyer. Each is a Gaussian 0.6 to 0.7 of a pixel wide wherever the camera is, its
// light adding up the same wherever it falls between pixels, so the stars hold still as the camera
// pushes in (a smaller dot would shimmer).
vec3 starTint(float k, float b) {
  vec3 c = k < 0.04 ? vec3(0.69, 0.79, 1.0) : k < 0.17 ? vec3(0.79, 0.86, 1.0) : k < 0.41 ? vec3(0.91, 0.95, 1.0)
         : k < 0.65 ? vec3(1.0, 0.97, 0.93) : k < 0.83 ? vec3(1.0, 0.91, 0.77) : vec3(1.0, 0.84, 0.63);
  return mix(vec3(1.0), c, clamp(b * 1.6, 0.3, 1.0));
}
// one layer: a cell (design px) holds a star with chance keep, well inside it; its peak brightness
// at least lo, a Pareto draw (a = 1.2: three times as many per magnitude) up to hi. halo: for the
// brightest, the little of their light a lens scatters around them, falling off about as 1/r^2
// (a Moffat profile, px: one picture pixel) and cut off a dozen pixels out. blue: above 1, the
// layer's colours lean blue-white (the brightest stars of a night sky are mostly hot ones).
vec3 starLayer(vec2 p, float cell, float keep, float lo, float hi, float sig, float px, float halo, float blue, float seed) {
  vec2 g = floor(p / cell);
  if (h21(g + seed) > keep) return vec3(0.0);
  vec2 d = p - g * cell - (0.22 + 0.56 * h22(g + seed + 3.7)) * cell;
  float b = min(hi, lo * pow(max(h21(g + seed + 9.1), 1e-3), -0.83));
  float r2 = dot(d, d);
  float e = exp(-r2 / (2.0 * sig * sig));
  if (halo > 0.0) { float q = r2 / (px * px); e += halo * pow(1.0 + q / 2.25, -1.5) * smoothstep(144.0, 64.0, q); }
  return starTint(pow(h21(g + seed + 5.3), blue), b) * b * e;
}
// The galaxy's band: rising from behind the planet at a tilt; across it bright down the middle with
// a long faint skirt; clouds of stars along it (the noise stretched three times along the band);
// dust in lanes, ridged noise warped once, close to its middle, and a rift wandering down it, the
// dust dimming what's behind to about half and reddening it, never to black; blue-white along the
// arms, warm at the core, and here and there a faint pink glow of hydrogen. dens: how much it
// crowds the faint stars in (they thin where the dust is).
vec3 galaxy(vec2 p, out float dens) {
  dens = 0.0;
  vec2 dir = vec2(sin(uBand.y), -cos(uBand.y)), nrm = vec2(cos(uBand.y), sin(uBand.y));
  vec2 r = p - vec2(uBand.z, uCircle.y - uCircle.z);
  float u = dot(r, dir), v = dot(r, nrm), s = uSkySeed;
  float w = 170.0 * (0.8 + 0.45 * vn(vec2(u / 650.0, s)));
  float x = v / w;
  float prof = 0.93 * exp(-x * x * 1.4) + 0.07 * exp(-x * x * 0.12);
  if (prof < 0.012) return vec3(0.0);
  vec2 q = vec2(u / 270.0, v / 90.0) + s * 3.1;
  float c1 = fbm(q, 4);
  float lum = prof * (0.25 + 1.5 * c1 * c1) * (0.85 + 0.3 * fbm(q * 3.3 + 5.0, 3));
  vec2 wq = q * 1.6 + 1.3 * vec2(fbm(q * 1.1 + 2.0, 3), fbm(q * 1.1 + 7.0, 3));
  float n = (fbm(wq, 4) - 0.5) * 3.0;
  float lanes = pow(max(1.0 - abs(n), 0.0), 5.0) * exp(-x * x * 2.5);
  float lane = (fbm(vec2(u / 900.0, s + 1.0), 3) - 0.5) * w * 1.1;
  float lw = w * (0.12 + 0.22 * fbm(vec2(u / 400.0, s + 3.0), 3));
  float y = (v - lane) / lw;
  float rift = exp(-y * y) * (0.6 + 0.4 * fbm(q * 1.7 + 9.0, 4)) * smoothstep(0.25, 0.6, vn(vec2(u / 1100.0, s + 5.0)));
  float dust = clamp(lanes * 0.85 + rift * 0.9, 0.0, 1.0);
  // the core: a warm bulge, rounder than the band
  float cu = (u - uBand.w) / 360.0, cv = v / (w * 1.6);
  float k = exp(-cu * cu - cv * cv);
  lum *= 1.0 + 1.8 * k;
  vec3 col = mix(vec3(0.92, 0.95, 1.0), vec3(1.0, 0.88, 0.7), k) * lum;
  // hydrogen: a few faint pink clouds strung along it
  vec2 hc = vec2(u / 210.0, v / 120.0);
  vec2 hi = floor(hc);
  vec2 hd = hc - hi - (0.25 + 0.5 * h22(hi + s));
  float hii = step(0.62, h21(hi + s + 4.0)) * exp(-dot(hd, hd) * 14.0) * (0.5 + fbm(q * 2.5 + 3.0, 3));
  col += vec3(1.0, 0.5, 0.68) * hii * prof * 0.35;
  dens = min(1.0, prof) * (1.0 - 0.7 * dust);
  return col * mix(vec3(1.0), vec3(0.47, 0.42, 0.32), dust) * 0.1;
}
// The deep sky over the shot's own: the band from its picture (stored at 2.5 times its light,
// its pull on the stars in alpha), then the stars. The brighter the sky behind them, the dimmer the
// band and the faint dust of stars (the exposure is set for the sky); the stars you'd count stay as
// the world has them.
vec3 deepSky(vec2 p, vec3 base) {
  float dens = 0.0;
  vec3 col = vec3(0.0);
  float expo = 1.0 / (1.0 + 30.0 * dot(base, vec3(0.2126, 0.7152, 0.0722)));
  if (uBand.x > 0.0) {
    vec4 g = texture(uTexSky, vec2(p.x * uScale / uRes.x, 1.0 - p.y * uScale / uRes.y));
    col = g.rgb / 2.5 * uBand.x * expo;
    dens = g.a;
  }
  if (uStars <= 0.0) return col;
  float px = 1.0 / (uScale * uZoom.z);   // design px a pixel of the picture
  float k = uStars / 0.004;              // the shot's draw: 1 is a clear night
  vec3 st = starLayer(p, 7.0, min(0.9, 0.05 * k * (1.0 + 5.0 * dens)), 0.035, 0.3, 0.6 * px, px, 0.0, 1.0, uSkySeed) * expo;
  st += starLayer(p, 19.0, min(0.9, 0.2 * k * (1.0 + 1.5 * dens)), 0.2, 1.0, 0.62 * px, px, 0.0, 1.0, uSkySeed + 31.0);
  st += starLayer(p, 140.0, min(0.9, 0.07 * k), 0.5, 4.0, 0.68 * px, px, 0.08, 1.6, uSkySeed + 67.0);
  // a soft shoulder rather than a hard clip, so a bright star's core doesn't pulse as it moves
  // between pixels
  st = mix(st, 0.7 + 0.3 * (1.0 - exp(-(st - 0.7) / 0.3)), step(0.7, st));
  return col + st;
}
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }

vec3 shade(vec3 base, vec3 nb, float spec, float shin, float amb) {
  float dif = max(dot(nb, uLight), 0.0);
  vec3 H = normalize(uLight + vec3(0.0, 0.0, 1.0));
  return base * (amb + (1.0 - amb) * dif) + pow(max(dot(nb, H), 0.0), shin) * spec;
}
vec3 bumpN(vec3 n, vec3 T, vec3 B, vec2 g, float k) { return normalize(n - (T * g.x + B * g.y) * k); }
float rim(vec3 n, float k) { return pow(1.0 - clamp(n.z, 0.0, 1.0), k); }

// ---------------------------------------------------------------------------
vec3 dawnPalette(int v, out vec3 rimCol, out vec3 glowB) {
  if (v == 1) { rimCol = vec3(0.62, 0.9, 0.34); glowB = vec3(0.05, 0.17, 0.3); return vec3(0.45, 0.8, 0.3); }
  if (v == 2) { rimCol = vec3(1.0, 0.36, 0.45); glowB = vec3(0.28, 0.2, 0.85); return vec3(1.0, 0.4, 0.4); }
  rimCol = vec3(1.0, 0.52, 0.16); glowB = vec3(0.12, 0.27, 0.6); return vec3(1.0, 0.6, 0.22);
}
vec3 skyDawn(vec2 frag, float h) {
  vec3 rA; vec3 bA; vec3 gA = dawnPalette(uVar, rA, bA);
  vec3 rD; vec3 bD; vec3 gD = dawnPalette(0, rD, bD);
  vec3 glowA = mix(gA, gD, uBlend); vec3 glowB = mix(bA, bD, uBlend);
  vec3 col = vec3(0.004, 0.006, 0.013);
  float hh = max(h, 0.0);
  col += glowA * exp(-hh / 16.0) * 1.05;
  col += glowB * exp(-hh / 150.0) * 0.85;
  col += glowB * 0.5 * exp(-hh / 420.0) * 0.35;
  if (uVar == 2) {
    float b = hh / 70.0;
    col += pal(b * 0.9, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)) * exp(-b * 1.2) * 0.55 * (1.0 - uBlend);
  }
  return col;
}
vec4 wDawn(vec2 st, vec3 n, float dl) {
  vec3 rA; vec3 bA; dawnPalette(uVar, rA, bA);
  vec3 rD; vec3 bD; dawnPalette(0, rD, bD);
  vec3 rimCol = mix(rA, rD, uBlend);
  vec3 night = vec3(0.008, 0.01, 0.018) + vec3(0.018, 0.022, 0.035) * fbm(st / 380.0, 4);
  vec3 col = night + rimCol * exp(-dl / 9.0) * 0.95 + rimCol * exp(-dl / 80.0) * 0.12;
  return vec4(col, 1.0);
}

vec4 wCaramel(vec2 st, vec3 n, vec3 T, vec3 B) {
  vec2 s = st / 64.0;
  vec3 v = voro(s);
  float e = 0.03;
  float b0 = smoothstep(0.5, 0.08, v.x);
  float bx = smoothstep(0.5, 0.08, voro(s + vec2(e, 0.0)).x);
  float by = smoothstep(0.5, 0.08, voro(s + vec2(0.0, e)).x);
  float crust = fbm(s * 3.0, 4);
  vec2 g = vec2(bx - b0, by - b0) / e * 0.6 + vec2(fbm((s + vec2(e, 0.0)) * 3.0, 4) - crust, fbm((s + vec2(0.0, e)) * 3.0, 4) - crust) / e * 0.18;
  vec3 nb = bumpN(n, T, B, g, 0.3);
  float burn = smoothstep(0.52, 0.8, fbm(s * 0.6 + 3.1, 5));
  vec3 base = mix(vec3(0.92, 0.58, 0.14), vec3(0.55, 0.24, 0.05), fbm(s * 1.2, 4));
  base = mix(base, vec3(0.24, 0.1, 0.03), burn * 0.8);
  base = mix(base, vec3(1.0, 0.8, 0.42), b0 * 0.25);
  vec3 col = shade(base, nb, 1.6, 55.0, 0.3);
  col += vec3(1.0, 0.62, 0.22) * rim(n, 4.0) * 0.55;
  return vec4(col, 1.0);
}

vec4 wGold(vec2 st, vec3 n) {
  vec2 s = st / 240.0;
  float m = fbm(s, 5);
  vec3 base = mix(vec3(0.98, 0.67, 0.22), vec3(0.8, 0.4, 0.1), m);
  base *= 0.8 + 0.25 * fbm(st / 26.0, 4);
  vec3 col = base * (0.22 + 0.95 * max(dot(n, uLight), 0.0));
  col += vec3(1.0, 0.72, 0.32) * rim(n, 6.0) * 0.55;
  return vec4(col, 1.0);
}

vec4 wLeaf(vec2 st, vec3 n, float dl) {
  // bites out of the edge
  float notch = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float cx = -760.0 + fi * 380.0 + 110.0 * h21(vec2(fi, 3.0));
    float rr = 30.0 + 34.0 * h21(vec2(fi, 9.0));
    float dx = st.x - cx;
    notch = max(notch, sqrt(max(0.0, rr * rr - dx * dx)) * 0.9);
  }
  float a = smoothstep(notch - 0.8, notch + 0.8, dl);
  float vx = abs(fract((st.x * 0.85 + st.y * 0.9) / 110.0) - 0.5);
  float veins = smoothstep(0.035, 0.0, vx) * 0.55;
  float fine = smoothstep(0.03, 0.0, voro(st / 24.0).y) * 0.22;
  vec3 base = mix(vec3(0.2, 0.42, 0.09), vec3(0.38, 0.6, 0.15), fbm(st / 150.0, 4));
  base = mix(base, vec3(0.86, 0.8, 0.32), smoothstep(0.62, 0.74, fbm(st / 280.0 + 5.0, 4)) * 0.65);
  base = mix(base, vec3(0.58, 0.74, 0.34), veins + fine);
  vec3 col = base * (0.42 + 0.72 * max(dot(n, uLight), 0.0));
  col = mix(col, vec3(0.5, 0.38, 0.12), smoothstep(7.0, 0.0, dl - notch) * step(1.0, notch) * 0.55);
  col += vec3(0.75, 0.9, 0.4) * rim(n, 5.0) * 0.25;
  return vec4(col, a);
}

vec4 wBlueprint(vec2 st, vec3 n) {
  vec3 paper = vec3(0.15, 0.36, 0.66) * (0.88 + 0.14 * fbm(st / 7.0, 4));
  vec2 gr = abs(fract(st / 84.0) - 0.5) * 84.0;
  float g = smoothstep(1.3, 0.2, min(gr.x, gr.y)) * 0.22;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float ang = -1.25 + fi * 0.36;
    vec2 o = vec2(-380.0 + fi * 55.0, 980.0);
    vec2 d = vec2(sin(ang), -cos(ang));
    vec2 w = st - o;
    g = max(g, smoothstep(5.0, 1.6, abs(w.x * d.y - w.y * d.x)) * 0.92);
  }
  for (int i = 0; i < 4; i++) {
    float rad = 300.0 + float(i) * 150.0;
    g = max(g, smoothstep(4.5, 1.3, abs(length(st - vec2(320.0, 760.0)) - rad)) * 0.85);
  }
  float chalk = g * (0.5 + 0.5 * vn(st / 2.3)) * (0.65 + 0.35 * vn(st / 12.0));
  vec3 col = mix(paper, vec3(0.94, 0.96, 0.99), clamp(chalk * 1.2, 0.0, 1.0));
  col *= 0.86 + 0.22 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

vec4 wMarble(vec2 st, vec3 n) {
  vec2 s = st / 170.0 + vec2(uT * 0.04, 0.0);
  vec2 w = vec2(fbm(s + vec2(1.7, 9.2), 5), fbm(s + vec2(8.3, 2.8), 5));
  float f = fbm(s + 2.4 * w, 5);
  float band = smoothstep(0.44, 0.56, 0.5 + 0.5 * sin(f * 19.0 + w.x * 7.0));
  vec3 base = mix(vec3(0.04), vec3(0.94, 0.93, 0.9), band);
  vec3 col = base * (0.5 + 0.62 * max(dot(n, uLight), 0.0));
  col += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 40.0) * 0.35;
  return vec4(col, 1.0);
}

vec4 wWing(vec2 st, vec3 n) {
  // a locust's forewing, backlit: amber membrane in long cells, dark veins,
  // a thin film of colour only where the light glances off it
  vec3 v = voro(st / vec2(120.0, 34.0));
  float vein = smoothstep(0.1, 0.0, v.y);
  float mainV = smoothstep(4.0, 0.6, abs(fract(st.y / 170.0 + 0.16 * sin(st.x / 330.0)) - 0.5) * 170.0);
  float cross_ = smoothstep(2.0, 0.4, abs(fract(st.x / 260.0 + v.z * 0.05) - 0.5) * 260.0) * 0.6;
  vec3 membrane = mix(vec3(0.82, 0.56, 0.24), vec3(0.95, 0.8, 0.5), v.z) * (0.28 + 0.6 * rim(n, 1.1));
  vec3 film = pal(v.z * 0.5 + st.x / 700.0 + n.y * 2.0, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  float glance = pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 6.0);
  vec3 cell = membrane + film * glance * 0.35;
  vec3 col = mix(cell, vec3(0.13, 0.07, 0.03), max(max(vein, mainV), cross_));
  col += vec3(1.0, 0.84, 0.58) * rim(n, 5.0) * 0.75;
  return vec4(col, 1.0);
}

vec2 hexCell(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h; vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
vec4 wEye(vec2 st, vec3 n, vec3 T, vec3 B) {
  vec2 hc = hexCell(st / 54.0);
  float d = length(hc);
  vec3 nb = normalize(n + (T * hc.x + B * hc.y) * 2.4);
  vec3 base = mix(vec3(0.28, 0.08, 0.04), vec3(0.6, 0.27, 0.08), fbm(st / 320.0, 4));
  vec3 col = shade(base, nb, 2.2, 120.0, 0.2);
  col = mix(col, vec3(0.03, 0.012, 0.008), smoothstep(0.42, 0.5, d));
  col += vec3(0.95, 0.5, 0.25) * rim(n, 5.0) * 0.35;
  return vec4(col, 1.0);
}

// A Greek key (meander), the border painted round a pot: one turn of the key to a tile, x in tiles,
// y 0 to 1 across the band.
float meander(vec2 p) {
  vec2 f = vec2(fract(p.x), p.y);
  float d = sdSeg(f, vec2(0.0, 0.18), vec2(0.0, 0.82));
  d = min(d, sdSeg(f, vec2(0.0, 0.18), vec2(0.72, 0.18)));
  d = min(d, sdSeg(f, vec2(0.72, 0.18), vec2(0.72, 0.62)));
  d = min(d, sdSeg(f, vec2(0.72, 0.62), vec2(0.3, 0.62)));
  d = min(d, sdSeg(f, vec2(0.3, 0.62), vec2(0.3, 0.4)));
  d = min(d, sdSeg(f, vec2(0.3, 0.4), vec2(0.52, 0.4)));
  d = min(d, sdSeg(f, vec2(0.0, 0.82), vec2(1.0, 0.82)));
  return d;
}
vec4 wTerracotta(vec2 st, vec3 n) {
  vec3 clay = vec3(0.79, 0.41, 0.23) * (0.8 + 0.3 * fbm(st / 28.0, 5));
  clay *= 1.0 - 0.3 * smoothstep(0.6, 0.76, fbm(st / 90.0 + 2.0, 4));
  float y0 = 120.0; float y1 = 330.0;
  float band = smoothstep(y0 - 1.5, y0 + 1.5, st.y) * smoothstep(y1 + 1.5, y1 - 1.5, st.y);
  // the key in the clay's colour, cut into the black band, as red-figure ware has it
  float glyph = smoothstep(0.05, 0.034, meander(vec2(st.x / 210.0, (st.y - y0) / (y1 - y0))));
  vec3 black = vec3(0.07, 0.05, 0.04) * (0.8 + 0.3 * fbm(st / 11.0, 3));
  vec3 col = mix(clay, black, band * (1.0 - glyph));
  float lines = smoothstep(2.2, 0.6, abs(st.y - (y0 - 16.0))) + smoothstep(2.2, 0.6, abs(st.y - (y1 + 16.0)));
  col = mix(col, black, clamp(lines, 0.0, 1.0));
  col *= 0.5 + 0.65 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

vec4 wLedger(vec2 st, vec3 n) {
  vec3 paper = vec3(0.96, 0.94, 0.87) * (0.93 + 0.08 * fbm(st / 5.0, 3));
  vec4 ink = texture(uTexLedger, vec2(st.x / 640.0 + 0.5, st.y / 640.0));
  vec3 col = mix(paper, ink.rgb, ink.a);
  col *= 0.74 + 0.34 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

vec4 wEngraving(vec2 st, vec3 n) {
  float mark = texture(uTexMark, st / 900.0 + vec2(0.5, 0.0)).a;
  float lit = max(dot(n, uLight), 0.0);
  float hatch = step(fract((st.x * 0.7 + st.y) / 6.0), 0.12 + 0.3 * lit) * (0.35 + 0.65 * lit);
  float ink = max(mark, hatch * 0.4);
  vec3 col = mix(vec3(0.02), vec3(0.95, 0.94, 0.9), ink);
  return vec4(col, 1.0);
}

vec4 wDunes(vec2 st, vec3 n, vec3 T, vec3 B) {
  float warp = fbm(st / 420.0, 4) * 130.0;
  float ph = (st.x * 0.32 + st.y + warp) / 26.0;
  float e = 1.0;
  float rip = sin(ph);
  float hx = sin(ph + e * 0.32 / 26.0) - rip;
  float hy = sin(ph + e / 26.0) - rip;
  vec3 nb = bumpN(n, T, B, vec2(hx, hy) / e * 26.0, 0.55);
  vec3 base = vec3(0.87, 0.6, 0.36) * (0.9 + 0.12 * vn(st / 1.4));
  vec3 col = shade(base, nb, 0.04, 8.0, 0.28);
  col += vec3(1.0, 0.7, 0.45) * rim(n, 4.0) * 0.3;
  return vec4(col, 1.0);
}

vec4 wCode(vec2 st, vec3 n, vec2 frag) {
  vec4 t = texture(uTexCode, vec2(st.x / 1024.0 + 0.5, st.y / 1024.0));
  float scan = 0.72 + 0.28 * sin(frag.y * PI * 0.5);
  vec3 col = vec3(0.012, 0.028, 0.018) + t.rgb * t.a * 1.25 * scan;
  col += vec3(0.5, 0.85, 0.3) * rim(n, 4.0) * 0.35;
  return vec4(col, 1.0);
}

vec3 thermal(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.05, 0.0, 0.16), vec3(0.45, 0.05, 0.62), smoothstep(0.0, 0.28, t));
  c = mix(c, vec3(0.96, 0.16, 0.42), smoothstep(0.24, 0.48, t));
  c = mix(c, vec3(1.0, 0.62, 0.12), smoothstep(0.44, 0.66, t));
  c = mix(c, vec3(1.0, 0.95, 0.4), smoothstep(0.62, 0.82, t));
  c = mix(c, vec3(0.62, 1.0, 0.55), smoothstep(0.84, 1.0, t));
  return c;
}
vec4 wThermal(vec2 st, vec3 n) {
  float f = fbm(st / 240.0 + vec2(uT * 0.06, 0.0), 5) * 0.85 + 0.28 * max(dot(n, uLight), 0.0) + 0.22 * rim(n, 2.0);
  return vec4(thermal(f), 1.0);
}

vec4 wLace(vec2 st, vec3 n) {
  vec2 s = st / 118.0;
  vec2 f = fract(s) - 0.5;
  float r = length(f); float a = atan(f.y, f.x);
  float petals = abs(r - (0.27 + 0.075 * cos(a * 6.0)));
  float ring = abs(r - 0.45);
  float spokes = abs(sin(a * 6.0)) * r + step(r, 0.12);
  float thread = min(min(petals, ring), spokes);
  float t = smoothstep(0.034, 0.014, thread) + smoothstep(0.02, 0.0, abs(r - 0.1));
  vec2 m = abs(fract(st / 9.0) - 0.5);
  float mesh = smoothstep(0.12, 0.03, min(m.x, m.y)) * step(0.47, r) * 0.7;
  float lace = clamp(max(t, mesh), 0.0, 1.0);
  vec3 col = vec3(0.95, 0.94, 0.9) * (0.45 + 0.65 * max(dot(n, uLight), 0.0));
  return vec4(col, lace);
}

vec4 wPCB(vec2 st, vec3 n) {
  vec2 s = st / 24.0; vec2 id = floor(s); vec2 f = fract(s);
  float row = h21(vec2(id.y, 11.0)); float col_ = h21(vec2(id.x, 23.0));
  float gapH = step(0.25, h21(vec2(floor(id.x / 3.0), id.y)));
  float gapV = step(0.35, h21(vec2(id.x, floor(id.y / 4.0) + 7.0)));
  float tr = 0.0;
  if (row < 0.45) tr = max(tr, smoothstep(0.13, 0.06, abs(f.y - 0.5)) * gapH);
  if (col_ < 0.3) tr = max(tr, smoothstep(0.13, 0.06, abs(f.x - 0.5)) * gapV);
  float pad = smoothstep(0.24, 0.19, length(f - 0.5)) * step(0.88, h21(id + 3.0));
  vec3 board = vec3(0.02, 0.24, 0.12) * (0.85 + 0.22 * fbm(st / 18.0, 3));
  vec3 c = mix(board, vec3(0.8, 0.56, 0.26), tr * 0.85);
  c = mix(c, vec3(0.97, 0.82, 0.45), pad);
  c *= 0.5 + 0.7 * max(dot(n, uLight), 0.0);
  c += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 30.0) * 0.3 * (tr + pad);
  return vec4(c, 1.0);
}

vec4 wCutouts(vec2 st, vec3 n) {
  vec3 col = vec3(0.1, 0.14, 0.32) * (0.92 + 0.1 * fbm(st / 6.0, 3));
  vec2 s = st / 290.0;
  for (int k = 0; k < 2; k++) {
    vec2 ss = s + float(k) * vec2(0.5, 0.37);
    vec2 id = floor(ss); vec2 f = fract(ss) - 0.5;
    float h = h21(id + float(k) * 13.0);
    if (h21(id + 5.0 + float(k)) < 0.35) continue;
    vec3 c;
    int ci = int(h * 6.0);
    if (ci == 0) c = vec3(0.79, 0.94, 0.29);
    else if (ci == 1) c = vec3(0.37, 0.61, 0.94);
    else if (ci == 2) c = vec3(0.66, 0.55, 0.91);
    else if (ci == 3) c = vec3(0.93, 0.74, 0.29);
    else if (ci == 4) c = vec3(0.88, 0.33, 0.27);
    else c = vec3(0.95, 0.93, 0.86);
    vec2 o = (h22(id) - 0.5) * 0.25;
    float shape;
    if (h21(id + 1.3) < 0.5) shape = length(f - o) - 0.26;
    else { vec2 g = f - o; g.x += 0.14 * sin(g.y * 9.0 + h * 6.0); shape = sdEll(g, vec2(0.17, 0.42)); }
    float m = smoothstep(0.012, -0.012, shape);
    float shadow = smoothstep(0.05, -0.01, shape - 0.02) * (1.0 - m);
    col = mix(col, col * 0.62, shadow * 0.55);
    col = mix(col, c, m);
  }
  col *= 0.82 + 0.28 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

vec4 wCrayon(vec2 st, vec3 n, float dl) {
  vec3 paper = vec3(0.66, 0.8, 0.95);
  float tooth = vn(st / 1.6) * 0.6 + vn(st / 4.2) * 0.4;
  paper *= 0.94 + 0.08 * tooth;
  float y = dl - (74.0 + 18.0 * sin(st.x / 170.0) + 9.0 * sin(st.x / 61.0));
  float band = smoothstep(36.0, 21.0, abs(y));
  float wax = band * smoothstep(0.34, 0.62, tooth + 0.22 * vn(vec2(st.x / 32.0, y / 6.0)));
  vec3 col = mix(paper, vec3(0.17, 0.31, 0.86), wax);
  float y2 = dl - (158.0 + 12.0 * sin(st.x / 124.0 + 1.0));
  col = mix(col, vec3(0.3, 0.46, 0.95), smoothstep(13.0, 6.0, abs(y2)) * smoothstep(0.42, 0.7, tooth) * 0.8);
  col = mix(col, vec3(0.2, 0.3, 0.55), smoothstep(2.4, 0.6, dl) * 0.5);
  col *= 0.9 + 0.12 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

vec4 wFuzz(vec2 st, vec3 n) {
  float fib = vn(vec2(st.x / 3.2, st.y / 60.0)) * 0.6 + vn(vec2(st.x / 1.4, st.y / 24.0)) * 0.4;
  vec3 base = mix(vec3(0.33, 0.17, 0.03), vec3(0.96, 0.7, 0.23), fib);
  vec3 col = base * (0.38 + 0.82 * max(dot(n, uLight), 0.0));
  col += vec3(1.0, 0.8, 0.42) * smoothstep(0.58, 0.92, fib) * 0.35;
  col += vec3(1.0, 0.76, 0.32) * rim(n, 5.0) * 0.7;
  return vec4(col, 1.0);
}

vec4 wChitin(vec2 st, vec3 n, vec3 T, vec3 B) {
  // the plates of a locust's abdomen: overlapping bands, each lit along its ridge
  float seg = st.y / 64.0;
  float f = fract(seg);
  float h = smoothstep(0.0, 0.75, f) * (1.0 - smoothstep(0.85, 1.0, f));
  float f2 = fract(seg + 0.01);
  float h2 = smoothstep(0.0, 0.75, f2) * (1.0 - smoothstep(0.85, 1.0, f2));
  vec3 nb = bumpN(n, T, B, vec2(0.0, (h2 - h) / 0.01), 0.18);
  float pores = smoothstep(0.18, 0.0, voro(st / 9.0).x) * 0.5;
  vec3 base = mix(vec3(0.16, 0.2, 0.07), vec3(0.34, 0.36, 0.12), fbm(vec2(st.x / 160.0, floor(seg) * 3.1), 4));
  base *= 1.0 - pores * 0.4;
  vec3 col = shade(base, nb, 1.5, 60.0, 0.2);
  col += vec3(0.9, 0.95, 0.6) * pow(h, 6.0) * 0.18 * max(dot(n, uLight), 0.0);
  col *= 1.0 - smoothstep(0.86, 1.0, f) * 0.7;
  col += vec3(0.6, 0.75, 0.3) * rim(n, 5.0) * 0.25;
  return vec4(col, 1.0);
}

vec4 wGlitter(vec2 st, vec3 n) {
  vec2 s = st / 5.5; vec2 id = floor(s); vec2 f = fract(s) - 0.5;
  float h = h21(id);
  vec3 fn = normalize(vec3(h22(id) - 0.5, 0.45));
  float flash = pow(max(dot(normalize(n + fn * 1.1), normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 26.0);
  flash *= 0.45 + 0.55 * sin(uT * 9.0 + h * 40.0) + uHit * 1.2 * step(0.6, h21(id + 4.0));
  vec3 fc = mix(vec3(0.79, 0.94, 0.29), vec3(1.0, 0.85, 0.42), h21(id + 2.0));
  float flake = smoothstep(0.5, 0.3, max(abs(f.x), abs(f.y)));
  vec3 col = vec3(0.04, 0.05, 0.02) + fc * (0.22 + flash * 3.0) * flake;
  col += vec3(0.8, 0.95, 0.4) * rim(n, 5.0) * 0.2;
  return vec4(col, 1.0);
}

vec4 wGlobe(vec2 st, vec3 n, float dl) {
  vec3 paper = vec3(0.96, 0.94, 0.88) * (0.95 + 0.06 * vn(st / 3.0));
  float lat = abs(mod(st.y + 18.0, 72.0) - 36.0);
  float lon = abs(mod(st.x + 3.0 * sin(st.y / 40.0), 112.0) - 56.0);
  float wob = 1.3 + 0.6 * vn(st / 20.0);
  float l1 = smoothstep(wob + 0.9, wob - 0.4, lat);
  float l2 = smoothstep(wob + 0.9, wob - 0.4, lon);
  float idLat = floor((st.y + 18.0) / 72.0);
  vec3 ink = mod(idLat, 3.0) < 1.0 ? vec3(0.82, 0.22, 0.2) : (mod(idLat, 3.0) < 2.0 ? vec3(0.2, 0.36, 0.82) : vec3(0.12));
  vec3 col = mix(paper, ink, l1 * 0.85);
  col = mix(col, vec3(0.12), l2 * 0.8);
  col = mix(col, vec3(0.1), smoothstep(3.2, 1.0, dl) * 0.9);
  return vec4(col, 1.0);
}

vec4 wFeather(vec2 st, vec3 n) {
  float fib = vn(vec2(st.x / 2.4, st.y / 42.0)) * 0.7 + vn(vec2(st.x / 9.0, st.y / 90.0)) * 0.3;
  vec3 col = vec3(0.93, 0.92, 0.9) * (0.45 + 0.55 * fib) * (0.4 + 0.75 * max(dot(n, uLight), 0.0));
  return vec4(col, 1.0);
}

// Stones in a cut face: at most one to a cell, flattened and irregular -- a
// pebble, not a bead -- with a shadowed underside and a dark rim.
vec4 stones(vec2 p, float cell, float keep, float seed) {
  vec2 id = floor(p / cell);
  vec2 f = fract(p / cell) - 0.5;
  vec2 o = (h22(id + seed) - 0.5) * 0.45;
  float r = 0.08 + 0.2 * h21(id + seed + 3.1);
  vec2 e = (f - o) / vec2(1.0, 0.62 + 0.25 * h21(id + seed + 5.3));
  float ang = atan(e.y, e.x);
  float rr = r * (1.0 + 0.16 * sin(ang * 3.0 + h21(id) * 6.0) + 0.08 * sin(ang * 5.0 + h21(id + 1.0) * 6.0));
  float sd = length(e) - rr;
  float m = smoothstep(0.02, -0.02, sd) * step(1.0 - keep, h21(id + seed + 8.7));
  vec3 c = mix(vec3(0.74, 0.56, 0.42), vec3(0.56, 0.46, 0.44), h21(id + seed + 2.2));
  c *= 1.0 - 0.32 * smoothstep(-0.3 * r, 0.7 * r, e.y + e.x * 0.3);
  c = mix(c, vec3(0.3, 0.17, 0.14), smoothstep(-0.03, 0.0, sd) * 0.85);
  return vec4(c, m);
}

// The planet cut open, drawn the way a soil profile is: a dark crust, the dry
// sand the eggs are laid in, damp sand, then clay -- each layer following the
// curve of the ground, laminated, grained, with stones.
vec4 wSoil(vec2 st, float dl) {
  float x = st.x;
  float d = dl;
  // the crust is dark enough to print in navy: the ground line, drawn in ink
  float b1 = 11.0 + 6.0 * vn(vec2(x / 70.0, 1.0));
  float b2 = 380.0 + 80.0 * (fbm(vec2(x / 460.0, 4.0), 4) - 0.5);
  float b3 = 690.0 + 100.0 * (fbm(vec2(x / 380.0, 9.0), 4) - 0.5);
  vec3 crust = vec3(0.2, 0.2, 0.3);
  vec3 sand = vec3(1.0, 0.82, 0.46);
  vec3 damp = vec3(0.97, 0.58, 0.34);
  vec3 clay = vec3(0.7, 0.3, 0.38);
  vec3 col = mix(crust, sand, smoothstep(b1 - 1.5, b1 + 1.5, d));
  col = mix(col, damp, smoothstep(b2 - 2.0, b2 + 2.0, d));
  col = mix(col, clay, smoothstep(b3 - 2.0, b3 + 2.0, d));
  // a dark line where one layer meets the next
  float seam = smoothstep(3.0, 0.5, abs(d - b2)) + smoothstep(3.0, 0.5, abs(d - b3));
  col = mix(col, vec3(0.42, 0.18, 0.2), clamp(seam, 0.0, 1.0) * 0.55);
  // laminations: fine lines that follow the layers
  float lw = d + 26.0 * fbm(vec2(x / 300.0, d / 120.0), 3);
  float lam = smoothstep(0.86, 0.97, abs(sin(lw / 6.5))) * step(b1 + 8.0, d);
  col *= 1.0 - lam * (0.1 + 0.1 * vn(vec2(x / 40.0, lw / 6.5)));
  // grains: dark and light
  col *= 1.0 - 0.3 * smoothstep(0.74, 0.92, vn(st / 1.7));
  col = mix(col, vec3(1.0, 0.96, 0.84), smoothstep(0.84, 0.97, vn(st / 2.4 + 7.0)) * 0.55);
  // stones, more of them deeper down, and a few big ones in the clay
  vec4 s1 = stones(vec2(x, d), 64.0, mix(0.1, 0.4, smoothstep(b1, b3, d)), 0.0);
  vec4 s2 = stones(vec2(x, d) + 31.0, 160.0, 0.3 * smoothstep(b2, b3 + 60.0, d), 7.0);
  col = mix(col, s1.rgb, s1.a * step(b1 + 14.0, d));
  col = mix(col, s2.rgb, s2.a);
  // the cut face darkens with depth
  col *= 1.0 - 0.22 * smoothstep(0.0, 1000.0, d);
  return vec4(col, 1.0);
}

// Desert floor: golden sand in wind ripples, a few tussocks, each with its shadow.
vec4 wSteppe(vec2 st, vec3 n, vec3 T, vec3 B) {
  float warp = fbm(st / 420.0, 4) * 130.0;
  float ph = (st.x * 0.32 + st.y + warp) / 22.0;
  float rip = sin(ph);
  vec2 g = vec2(sin(ph + 0.32 / 22.0) - rip, sin(ph + 1.0 / 22.0) - rip) * 22.0;
  vec3 nb = bumpN(n, T, B, g, 0.5);
  vec3 base = vec3(1.0, 0.84, 0.5) * (0.92 + 0.1 * vn(st / 1.4));
  base = mix(base, vec3(0.99, 0.72, 0.44), smoothstep(0.55, 0.75, fbm(st / 260.0, 4)) * 0.6);
  vec3 col = shade(base, nb, 0.03, 8.0, 0.45);
  vec2 p = st / vec2(190.0, 140.0);
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 o = (h22(id + 9.0) - 0.5) * 0.55;
  float keep = step(0.74, h21(id + 4.2));
  vec2 q = (f - o) * vec2(1.0, 1.5);
  float r = 0.06 + 0.07 * h21(id + 1.7);
  float a = atan(q.y, q.x);
  float spikes = 0.65 + 0.35 * abs(sin(a * 6.0 + h21(id) * 20.0));
  float tuft = smoothstep(r * spikes + 0.01, r * spikes - 0.01, length(q)) * keep;
  float shadow = smoothstep(r + 0.03, r - 0.03, length(q - vec2(0.08, 0.05))) * keep * (1.0 - tuft);
  col *= 1.0 - 0.35 * shadow;
  col = mix(col, vec3(0.2, 0.3, 0.12) * (0.8 + 0.35 * vn(st / 2.0)), tuft);
  return vec4(col, 1.0);
}

// A field of ripe wheat seen low against the sun: upright stalks, ears catching light.
vec4 wWheat(vec2 st, vec3 n) {
  float fib = vn(vec2(st.x / 2.6, st.y / 44.0)) * 0.6 + vn(vec2(st.x / 1.2, st.y / 16.0)) * 0.4;
  float ears = smoothstep(0.62, 0.82, vn(vec2(st.x / 4.5, st.y / 8.0)));
  vec3 base = mix(vec3(0.5, 0.24, 0.06), vec3(1.0, 0.78, 0.3), fib);
  base = mix(base, vec3(1.0, 0.9, 0.48), ears * 0.45);
  vec3 col = base * (0.32 + 0.8 * max(dot(n, uLight), 0.0));
  col += vec3(1.0, 0.68, 0.32) * rim(n, 4.0) * 0.8;
  return vec4(col, 1.0);
}

// A motherboard: green solder mask, copper traces, gold pads, black chips. Signals run along the
// traces (uAct.x), the status lights on the pads blink (lime, or amber with uAct.y), as bright as
// uAct.z.
vec4 wBoard(vec2 st, vec3 n) {
  vec2 s = st / 26.0;
  vec2 id = floor(s);
  vec2 f = fract(s);
  float row = h21(vec2(id.y, 11.0));
  float col_ = h21(vec2(id.x, 23.0));
  float gapH = step(0.25, h21(vec2(floor(id.x / 4.0), id.y)));
  float gapV = step(0.35, h21(vec2(id.x, floor(id.y / 4.0) + 7.0)));
  float trH = row < 0.5 ? smoothstep(0.14, 0.07, abs(f.y - 0.5)) * gapH : 0.0;
  float trV = col_ < 0.34 ? smoothstep(0.14, 0.07, abs(f.x - 0.5)) * gapV : 0.0;
  float tr = max(trH, trV);
  float pad = smoothstep(0.27, 0.2, length(f - 0.5)) * step(0.86, h21(id + 3.0));
  float via = smoothstep(0.12, 0.08, length(f - 0.5)) * step(0.93, h21(id + 17.0)) * (1.0 - pad);
  // chips: black packages, pins down either long side, a white outline printed round them
  vec2 cs = st / vec2(360.0, 260.0);
  vec2 cid = floor(cs);
  vec2 cf = fract(cs) - 0.5;
  float hasChip = step(0.68, h21(cid + 41.0));
  vec2 half_ = vec2(0.14, 0.12) + vec2(0.08, 0.06) * h22(cid + 5.0);
  vec2 q = abs(cf) - half_;
  float box = max(q.x, q.y);
  float chip = hasChip * smoothstep(0.004, -0.004, box);
  float pinBand = step(q.x, -0.012) * step(0.0, q.y) * step(q.y, 0.04);
  float pins = hasChip * pinBand * step(0.5, fract(cf.x * 36.0));
  float silk = hasChip * smoothstep(0.005, 0.0, abs(box - 0.065)) * (1.0 - chip);
  vec3 board = vec3(0.1, 0.44, 0.3) * (0.86 + 0.2 * fbm(st / 18.0, 3));
  vec3 c = mix(board, vec3(0.86, 0.6, 0.28), tr * 0.9);
  c = mix(c, vec3(0.98, 0.84, 0.46), max(pad, pins));
  c = mix(c, vec3(0.2, 0.2, 0.22), via * 0.8);
  c = mix(c, vec3(0.05, 0.05, 0.07), chip);
  c = mix(c, vec3(0.95, 0.95, 0.9), silk * 0.85);
  c = mix(c, vec3(0.9, 0.9, 0.86), chip * step(abs(cf.x + half_.x - 0.05), 0.012) * step(abs(cf.y + half_.y - 0.05), 0.012));
  // signals running along the horizontal traces, each lane its own way and pace
  float lane = id.y;
  float dir = h21(vec2(lane, 1.0)) < 0.5 ? -1.0 : 1.0;
  float period = 420.0 + 380.0 * h21(vec2(lane, 9.0));
  float pos = mod(st.x - dir * uT * (120.0 + 120.0 * h21(vec2(lane, 3.0))) + h21(vec2(lane, 5.0)) * period, period);
  float pulse = exp(-pow((pos - period * 0.5) / 22.0, 2.0)) * trH * uAct.x;
  vec3 lime = vec3(0.86, 1.0, 0.4);
  c = mix(c, lime, clamp(pulse * 1.3, 0.0, 1.0));
  // status lights on some of the pads
  float led = pad * step(0.55, h21(id + 13.0));
  float blink = 0.5 + 0.5 * sin(uT * (2.5 + 3.0 * h21(id + 2.0)) + h21(id) * 6.28);
  vec3 ledC = mix(lime, vec3(1.0, 0.7, 0.16), uAct.y);
  c = mix(c, ledC, led * uAct.z * (0.45 + 0.55 * blink));
  c *= 0.5 + 0.7 * max(dot(n, uLight), 0.0);
  c += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 30.0) * 0.25 * max(tr, pad);
  c += vec3(0.6, 0.9, 0.5) * rim(n, 4.0) * 0.25;
  return vec4(c, 1.0);
}

// Farmland from high up: each field in its own crop, drilled in rows at its own
// angle, hedges between them with trees along the hedges.
vec4 wFields(vec2 st, vec3 n) {
  vec2 size = vec2(230.0, 130.0);
  vec2 p = st / size;
  p += 0.18 * vec2(fbm(p * 1.3, 3), fbm(p * 1.3 + 5.0, 3));
  vec3 v = voro(p);
  float h = v.z;
  vec3 crop;
  int ci = int(h * 6.0);
  if (ci == 0) crop = vec3(0.13, 0.58, 0.1);
  else if (ci == 1) crop = vec3(0.29, 0.69, 0.16);
  else if (ci == 2) crop = vec3(0.95, 0.73, 0.12);
  else if (ci == 3) crop = vec3(0.95, 0.46, 0.22);
  else if (ci == 4) crop = vec3(0.95, 0.9, 0.4);
  else crop = vec3(0.2, 0.62, 0.12);
  float ang = h * 31.0;
  float rows = sin(dot(st, vec2(cos(ang), sin(ang))) / 3.2);
  vec3 col = crop * (0.84 + 0.16 * rows) * (0.9 + 0.16 * fbm(st / 30.0, 3));
  float hedge = smoothstep(0.04, 0.015, v.y);
  float trees = smoothstep(0.5, 0.2, voro(st / 12.0).x) * smoothstep(0.12, 0.03, v.y) * step(0.45, h21(vec2(h * 57.0, 1.0)));
  col = mix(col, vec3(0.1, 0.2, 0.09), max(hedge * 0.9, trees * 0.85));
  col *= 0.5 + 0.62 * max(dot(n, uLight), 0.0);
  col += vec3(1.0, 0.75, 0.45) * rim(n, 4.0) * 0.3;
  return vec4(col, 1.0);
}

// ---------------------------------------------------------------------------
// The launch film's own close-ups, done in code.

// Citrus flesh, a blood orange's: juice cells long and narrow, their walls pale, wet enough to
// shine, a few bubbles caught in it.
vec4 wCitrus(vec2 st, vec3 n, vec3 T, vec3 B) {
  vec2 s = st / vec2(46.0, 15.0);
  vec3 v = voro(s);
  float wall = smoothstep(0.08, 0.0, v.y);
  float fill = smoothstep(0.55, 0.0, v.x);
  vec3 base = mix(vec3(0.62, 0.05, 0.04), vec3(0.98, 0.32, 0.12), v.z * 0.7 + 0.3 * fbm(st / 260.0, 3));
  base = mix(base, vec3(1.0, 0.75, 0.55), wall * 0.55);
  float fx = smoothstep(0.55, 0.0, voro(s + vec2(0.02, 0.0)).x) - fill;
  float fy = smoothstep(0.55, 0.0, voro(s + vec2(0.0, 0.02)).x) - fill;
  vec3 nb = bumpN(n, T, B, vec2(fx, fy) / 0.02 * 0.25, 0.35);
  vec3 col = shade(base, nb, 1.4, 70.0, 0.32);
  vec2 bs = st / 150.0; vec2 bid = floor(bs); vec2 bf = fract(bs) - 0.5;
  vec2 bo = (h22(bid + 7.0) - 0.5) * 0.5;
  float br = 0.06 + 0.12 * h21(bid + 3.0);
  float bd = length(bf - bo);
  float keep = step(0.62, h21(bid + 11.0));
  float ring = smoothstep(br, br - 0.015, bd) * smoothstep(br - 0.05, br - 0.012, bd) * keep;
  float glint = smoothstep(br * 0.35, 0.0, length(bf - bo + vec2(br * 0.35))) * keep;
  col = mix(col, vec3(1.0, 0.85, 0.75), ring * 0.7);
  col += glint * 0.8;
  col += vec3(1.0, 0.45, 0.3) * rim(n, 4.0) * 0.4;
  return vec4(col, 1.0);
}

// Honey, or amber: deep gold, darker the deeper it goes, slow streaks where it has flowed, specks
// hanging in it at three depths, the near ones sharp, the far ones soft.
vec4 wHoney(vec2 st, vec3 n, float dl) {
  float depth = clamp(dl / 900.0, 0.0, 1.0);
  vec2 w = vec2(fbm(st / 300.0 + vec2(uT * 0.02, 0.0), 4), fbm(st / 300.0 + 4.1, 4));
  float streak = fbm(vec2(st.x / 90.0 + w.x * 3.0, st.y / 420.0 + w.y), 4);
  vec3 base = mix(vec3(1.0, 0.68, 0.16), vec3(0.55, 0.22, 0.02), depth * 0.8 + 0.25 * streak);
  base *= 0.85 + 0.3 * streak;
  float specks = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 p = st / (26.0 + fk * 22.0) + fk * 17.0; vec2 id = floor(p); vec2 f = fract(p) - 0.5;
    vec2 o = (h22(id + fk) - 0.5) * 0.7;
    float r = 0.05 + 0.08 * h21(id + 5.0 + fk);
    float soft = 0.02 + fk * 0.12;
    specks = max(specks, smoothstep(r + soft, r - 0.01, length(f - o)) * step(0.55, h21(id + 9.0 + fk)) * (1.0 - fk * 0.25));
  }
  base = mix(base, vec3(0.22, 0.08, 0.01), specks * 0.75);
  vec3 col = base * (0.55 + 0.6 * max(dot(n, uLight), 0.0));
  col += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * 0.9;
  col += vec3(1.0, 0.78, 0.35) * rim(n, 3.0) * 0.6;
  return vec4(col, 1.0);
}

// An agate slice: bands following the stone's growth, purple and pink to white, and where the
// middle was hollow, crystals that glint.
vec4 wAgate(vec2 st, vec3 n) {
  vec2 s = st / 520.0;
  vec2 w = vec2(fbm(s * 2.0 + 1.3, 5), fbm(s * 2.0 + 7.7, 5));
  float d = length((s - vec2(0.0, 1.6)) * vec2(0.7, 1.0)) + 0.35 * (w.x - 0.5);
  float b = fract(d * 9.0);
  float fine = 0.5 + 0.5 * sin(d * 160.0 + w.y * 6.0);
  vec3 base = mix(vec3(0.45, 0.04, 0.32), vec3(0.86, 0.38, 0.64), smoothstep(0.0, 0.5, b));
  base = mix(base, vec3(0.98, 0.9, 0.95), smoothstep(0.55, 0.9, b) * 0.85);
  base *= 0.88 + 0.12 * fine;
  float hollow = smoothstep(0.58, 0.52, d);
  vec2 cid = floor(st / 7.0);
  float glint = pow(h21(cid + floor(uT * 3.0)), 30.0) * hollow;
  base = mix(base, vec3(0.75, 0.68, 0.8) * (0.7 + 0.5 * h21(cid)), hollow);
  vec3 col = base * (0.6 + 0.5 * max(dot(n, uLight), 0.0)) + glint * 1.2;
  col += vec3(1.0, 0.7, 0.9) * rim(n, 4.0) * 0.35;
  return vec4(col, 1.0);
}

// A film thin enough to show the colours of its thickness (oil on water, a bubble's skin).
vec3 filmColour(float th) { return pal(th, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)); }

// Oil on dark water: rainbow bands that drift, the water black where the film is thin, the rim
// all colours.
vec4 wSlick(vec2 st, vec3 n) {
  vec2 s = st / 380.0 + vec2(uT * 0.015, 0.0);
  vec2 w = vec2(fbm(s + 2.0, 5), fbm(s + 9.0, 5));
  float th = fbm(s * 1.5 + w * 1.8, 5);
  vec3 c = filmColour(th * 2.2 + n.y * 0.6);
  float thick = smoothstep(0.25, 0.45, th);
  vec3 col = mix(vec3(0.02, 0.025, 0.035), c * 0.9, thick * (0.35 + 0.65 * rim(n, 1.5)));
  col += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 50.0) * 0.6;
  col += filmColour(0.3 + n.y) * rim(n, 5.0) * 0.8;
  return vec4(col, 1.0);
}

// Denim: a twill, the indigo running at a slant over the white weft, slubs in the yarn, worn
// paler in places.
vec4 wDenim(vec2 st, vec3 n, vec3 T, vec3 B) {
  float u = (st.x + st.y * 0.55) / 9.0;
  float rib = sin(u * TAU);
  float slub = fbm(vec2(st.x / 3.0, st.y / 90.0), 3);
  float weft = smoothstep(0.6, 0.95, vn(st / 2.2)) * 0.35;
  vec3 indigo = mix(vec3(0.07, 0.12, 0.3), vec3(0.24, 0.36, 0.6), 0.5 + 0.5 * rib) * (0.8 + 0.4 * slub);
  vec3 base = mix(indigo, vec3(0.85, 0.86, 0.9), weft);
  base = mix(base, base * 1.5, smoothstep(0.62, 0.8, fbm(st / 200.0, 4)) * 0.6);
  vec3 nb = bumpN(n, T, B, vec2(cos(u * TAU), cos(u * TAU) * 0.55) * 0.9, 0.25);
  vec3 col = shade(base, nb, 0.08, 10.0, 0.35);
  col += vec3(0.6, 0.7, 1.0) * rim(n, 4.0) * 0.25;
  return vec4(col, 1.0);
}

// A plant stem cut across, under a microscope: pale pink cells, a skin of small ones along the
// edge, and a ring of vessels a little way in, each a cluster of small teal-walled cells.
vec4 wStem(vec2 st, vec3 n, float dl) {
  vec3 big = voro(st / 34.0);
  vec3 col = mix(vec3(0.96, 0.86, 0.84), vec3(0.93, 0.78, 0.78), big.z);
  col = mix(col, vec3(0.62, 0.42, 0.46), smoothstep(0.07, 0.0, big.y));
  float skin = smoothstep(46.0, 30.0, dl);
  vec3 small = voro(st / 10.0);
  col = mix(col, mix(vec3(0.5, 0.3, 0.42), vec3(0.75, 0.55, 0.62), small.z), skin * 0.9);
  col = mix(col, vec3(0.25, 0.12, 0.2), skin * smoothstep(0.1, 0.0, small.y) * 0.8);
  float pitch = 230.0;
  float k = floor(st.x / pitch);
  vec2 c = vec2((k + 0.5) * pitch + (h21(vec2(k, 3.0)) - 0.5) * 60.0, 150.0 + 40.0 * (h21(vec2(k, 7.0)) - 0.5));
  float d = length((st - c) / vec2(1.0, 1.25));
  float bundle = smoothstep(58.0, 50.0, d);
  vec3 vc = voro(st / 7.0);
  vec3 vcol = mix(vec3(0.55, 0.85, 0.82), vec3(0.2, 0.62, 0.62), vc.z);
  vcol = mix(vcol, vec3(0.03, 0.22, 0.25), smoothstep(0.12, 0.0, vc.y));
  col = mix(col, vcol, bundle);
  col = mix(col, vec3(0.05, 0.25, 0.28), smoothstep(3.0, 0.0, abs(d - 54.0)) * 0.8);
  col *= 0.85 + 0.2 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

// A colony on agar under a dark-field microscope: orange growth with a ragged, branching edge,
// speckled, holes in it, the dish dark around it.
vec4 wColony(vec2 st, vec3 n) {
  vec2 s = st / 260.0;
  float edge = fbm(s + vec2(0.0, uT * 0.01), 6) + 0.25 * fbm(s * 6.0, 4);
  float colony = smoothstep(0.5, 0.53, edge);
  float solid = smoothstep(0.62, 0.6, fbm(s * 2.3 + 5.0, 5));
  float speck = step(0.7, h21(floor(st / 2.0))) * (0.5 + 0.5 * vn(st / 3.0));
  vec3 dish = vec3(0.06, 0.015, 0.01) + speck * 0.12 * vec3(1.0, 0.4, 0.2);
  vec3 grow = mix(vec3(0.75, 0.18, 0.04), vec3(1.0, 0.5, 0.18), speck) * (0.7 + 0.4 * fbm(st / 30.0, 3));
  vec3 col = mix(dish, grow, colony * solid);
  col += vec3(1.0, 0.5, 0.2) * smoothstep(0.02, 0.0, abs(edge - 0.515)) * 0.5 * solid;
  col *= 0.75 + 0.35 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

// Bread crust: baked brown, darker where it caught, cracked into plates with the white crumb
// showing in the cracks, dusted with flour.
vec4 wCrust(vec2 st, vec3 n, vec3 T, vec3 B) {
  vec2 s = st / 70.0;
  vec2 wp = s + 0.35 * vec2(fbm(s * 0.7, 3), fbm(s * 0.7 + 3.0, 3));
  vec3 v = voro(wp);
  float crack = smoothstep(0.09, 0.02, v.y);
  float h0 = fbm(st / 40.0, 4);
  vec3 base = mix(vec3(0.62, 0.34, 0.14), vec3(0.32, 0.15, 0.05), h0 + 0.3 * v.z);
  base = mix(base, vec3(0.14, 0.07, 0.03), smoothstep(0.6, 0.8, fbm(st / 160.0 + 2.0, 4)) * 0.6);
  base = mix(base, vec3(0.93, 0.88, 0.8), smoothstep(0.62, 0.78, fbm(st / 22.0 + 9.0, 4)) * (1.0 - crack) * 0.75);
  base = mix(base, vec3(0.97, 0.9, 0.78), crack * 0.85);
  vec2 gr = vec2(fbm(st / 40.0 + vec2(0.03, 0.0), 4) - h0, fbm(st / 40.0 + vec2(0.0, 0.03), 4) - h0) / 0.03;
  vec3 nb = bumpN(n, T, B, gr * 0.6, 0.3);
  vec3 col = shade(base, nb, 0.25, 18.0, 0.3);
  col += vec3(1.0, 0.7, 0.4) * rim(n, 4.0) * 0.35;
  return vec4(col, 1.0);
}

// Crackle glaze on a pot's belly: deep blue, glassy, crazed into a net of fine pale lines, an
// oily sheen where the light glances off it.
vec4 wGlaze(vec2 st, vec3 n) {
  vec3 v1 = voro(st / 46.0);
  vec3 v2 = voro(st / 13.0 + 3.0);
  float craze = max(smoothstep(0.05, 0.0, v1.y), smoothstep(0.06, 0.0, v2.y) * 0.55);
  vec3 base = mix(vec3(0.03, 0.1, 0.32), vec3(0.12, 0.42, 0.72), fbm(st / 220.0, 4));
  base = mix(base, vec3(0.75, 0.88, 0.95), craze * 0.75);
  float glance = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
  vec3 sheen = filmColour(fbm(st / 160.0, 3) * 1.6 + n.x) * glance * 0.5;
  vec3 col = base * (0.45 + 0.65 * max(dot(n, uLight), 0.0)) + sheen;
  col += pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 90.0) * 1.2;
  return vec4(col, 1.0);
}

// Ripples in two colours, black and cream, as wet sand on rock: the wind's lines, bent.
vec4 wRipples(vec2 st, vec3 n) {
  float warp = fbm(st / 300.0, 4) * 160.0 + fbm(st / 70.0, 3) * 18.0;
  float ph = (st.y + st.x * 0.18 + warp) / 17.0;
  float band = smoothstep(-0.25, 0.25, sin(ph));
  vec3 col = mix(vec3(0.07, 0.06, 0.05), vec3(0.92, 0.84, 0.68), band);
  col *= 0.88 + 0.16 * vn(st / 2.0);
  col *= 0.7 + 0.4 * max(dot(n, uLight), 0.0);
  return vec4(col, 1.0);
}

// A world's surface at st: the shot's own, or (in the cells look) a cell showing another world.
vec4 material(int id, vec2 st, vec3 n, vec3 T, vec3 B, float dl, vec2 frag) {
  if (id == 0) return wDawn(st, n, dl);
  if (id == 1) return wCaramel(st, n, T, B);
  if (id == 2) return wGold(st, n);
  if (id == 3) return wLeaf(st, n, dl);
  if (id == 4) return wBlueprint(st, n);
  if (id == 5) return wMarble(st, n);
  if (id == 6) return wWing(st, n);
  if (id == 7) return wEye(st, n, T, B);
  if (id == 8) return wTerracotta(st, n);
  if (id == 9) return wLedger(st, n);
  if (id == 10) return wEngraving(st, n);
  if (id == 11) return wDunes(st, n, T, B);
  if (id == 12) return wCode(st, n, frag);
  if (id == 13) return wThermal(st, n);
  if (id == 14) return wLace(st, n);
  if (id == 15) return wPCB(st, n);
  if (id == 16) return wCutouts(st, n);
  if (id == 18) return wCrayon(st, n, dl);
  if (id == 19) return wFuzz(st, n);
  if (id == 20) return wChitin(st, n, T, B);
  if (id == 21) return wGlitter(st, n);
  if (id == 22) return wGlobe(st, n, dl);
  if (id == 23) return wFeather(st, n);
  if (id == 25) return wSoil(st, dl);
  if (id == 26) return wSteppe(st, n, T, B);
  if (id == 27) return wWheat(st, n);
  if (id == 28) return wFields(st, n);
  if (id == 30) return wCitrus(st, n, T, B);
  if (id == 31) return wHoney(st, n, dl);
  if (id == 32) return wAgate(st, n);
  if (id == 33) return wSlick(st, n);
  if (id == 34) return wDenim(st, n, T, B);
  if (id == 35) return wStem(st, n, dl);
  if (id == 36) return wColony(st, n);
  if (id == 37) return wCrust(st, n, T, B);
  if (id == 38) return wGlaze(st, n);
  if (id == 39) return wRipples(st, n);
  return wBoard(st, n);
}

// The cells look: the planet cut into rectangles (the screen's, split again and again, the longer
// side first, a few left big) from just above the horizon down, cut afresh each shot. About half
// show the shot's own world, the rest the worlds around it in the song (the ones just seen, the
// ones coming next). At the cut each cell turns from the world before to its own at its own moment
// within the first beat or so, so the planet goes over in pieces; through the shot each cell's
// surface slides along like a strip on a belt. Returns the world id; st comes back slid; seam is
// how much darker the pixel is for the hairline where cells meet.
int quiltCell(vec2 frag, inout vec2 st, out float seam) {
  vec2 lo = vec2(0.0, uCircle.y - uCircle.z - 12.0), hi = uRes / uScale;
  float node = 1.0;
  for (int L = 0; L < 7; L++) {
    vec2 sz = hi - lo;
    if (L >= 2 && h21(vec2(node + 0.5, uCutSeed + 3.0)) < 0.22) break;
    if (max(sz.x, sz.y) < 90.0) break;
    float f = 0.25 + 0.5 * h21(vec2(node, uCutSeed + float(L)));
    if (sz.x * (0.75 + 0.5 * h21(vec2(node, uCutSeed + 11.0))) > sz.y) {
      float m = lo.x + sz.x * f;
      if (frag.x < m) { hi.x = m; node = node * 2.0; } else { lo.x = m; node = node * 2.0 + 1.0; }
    } else {
      float m = lo.y + sz.y * f;
      if (frag.y < m) { hi.y = m; node = node * 2.0; } else { lo.y = m; node = node * 2.0 + 1.0; }
    }
  }
  float r = h21(vec2(node, uCutSeed + 21.0)), a = h21(vec2(node, uCutSeed + 22.0)), b = h21(vec2(node, uCutSeed + 23.0));
  int id = r < 0.45 ? uWorld : uQuiltIds[int(a * 5.999)];
  if (uAge < b * 0.9 * uBeat) id = uPrevWorld;
  vec2 dir = h21(vec2(node, uCutSeed + 24.0)) < 0.5 ? vec2(a < 0.5 ? -1.0 : 1.0, 0.0) : vec2(0.0, a < 0.5 ? -1.0 : 1.0);
  st += dir * (30.0 + 90.0 * b) * mix(1.0, 0.4, uCalm) * uAge / uBeat;
  float edge = min(min(frag.x - lo.x, hi.x - frag.x), min(frag.y - lo.y, hi.y - frag.y)) * uScale * uZoom.z;
  seam = mix(0.68, 1.0, smoothstep(0.5, 1.6, edge));
  return id;
}

// ---------------------------------------------------------------------------
void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  if (uPass == 1) {
    float dens;
    vec3 g = galaxy(frag, dens);
    outColor = vec4(g * 2.5, dens);
    return;
  }
  frag = uZoom.xy + (frag - uZoom.xy) / uZoom.z;
  vec2 c = uCircle.xy; float R = uCircle.z;
  vec2 q = (frag - c) / R;
  float r = length(q);
  float h = (r - 1.0) * R;   // design px above the horizon (negative below)

  vec3 sky = uWorld == 0 ? skyDawn(frag, h) : mix(uSkyA, uSkyB, smoothstep(0.0, uSkyH > 0.0 ? uSkyH : 1080.0, frag.y));
  if (h > -12.0) sky += deepSky(frag, sky);
  if (uGlow.a > 0.0) {
    float hh = max(h, 0.0);
    sky += uGlow.rgb * uGlow.a * (0.8 * exp(-hh / 30.0) + 0.55 * exp(-hh / 240.0));
  }
  if (uSun.w > 0.0) {
    float d = length(frag - uSun.xy);
    sky += vec3(1.0, 0.8, 0.4) * uSun.w * 0.45 * exp(-max(d - uSun.z, 0.0) / 140.0);
    sky = mix(sky, vec3(1.0, 0.9, 0.4), smoothstep(uSun.z + 1.2, uSun.z - 1.2, d) * uSun.w);
  }
  vec3 col = sky;
  if (uWorld == 24) {
    outColor = vec4(0.953, 0.933, 0.886, 1.0);
    return;
  }

  if (h < 2.0) {
    float z = sqrt(max(0.0, 1.0 - min(r * r, 1.0)));
    vec3 n = vec3(q, z);
    float dl = max(-h, 0.0);
    float arc = acos(clamp(z, 0.0, 1.0));
    float phi = atan(q.y, q.x) + 0.5 * PI;
    // down from the horizon: a sphere's full foreshortening, or a macro lens's milder one
    vec2 st = vec2(phi * R, mix(dl * 1.5, (0.5 * PI - arc) * R, uFore));
    st += uDrift * uT;
    vec3 T = normalize(vec3(-q.y, q.x, 0.0) + vec3(1e-5));
    vec3 B = normalize(cross(n, T));
    float seam = 1.0;
    int id = uQuilt > 0.5 ? quiltCell(frag, st, seam) : uWorld;
    vec4 s = material(id, st, n, T, B, dl, frag);
    s.rgb *= seam;
    s.rgb *= 1.0 + 0.18 * uHit * exp(-dl / 140.0);
    float edge = smoothstep(-0.9, 0.9, -h);
    // the far edge softens into the air, which also keeps it from aliasing
    s.rgb = mix(s.rgb, mix(s.rgb, sky, 0.35), exp(-dl / 3.0) * 0.6);
    // and catches the light when there is light along the horizon
    if (uGlow.a > 0.0) s.rgb += uGlow.rgb * uGlow.a * 0.45 * exp(-dl / 10.0);
    col = mix(sky, s.rgb, s.a * edge);
  }

  // fibres standing up past the horizon: feathers and the golden fuzz
  if ((uWorld == 23 || uWorld == 19) && h > -40.0 && h < 150.0) {
    float phi = atan(q.y, q.x) * R;
    float len = uWorld == 23 ? 110.0 : 36.0;
    float fib = vn(vec2(phi / (uWorld == 23 ? 2.2 : 1.6), h / (len * 0.5)));
    float reach = smoothstep(len * (0.35 + 0.65 * vn(vec2(phi / 9.0, 3.0))), 0.0, h);
    float a = smoothstep(0.55, 0.85, fib) * reach * step(0.0, h);
    vec3 fc = uWorld == 23 ? vec3(0.95, 0.95, 0.93) : vec3(1.0, 0.78, 0.35);
    col = mix(col, fc * (0.6 + 0.4 * fib), a * 0.85);
  }

  outColor = vec4(col, 1.0);
}`;

// The picture as a lens and film leave it: the foreground soft below the horizon (for the worlds
// shot that way; a little for the rest), grain that's new every frame, darker corners.
const POST = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uRes;      // px
uniform float uApex;    // the horizon's top, px down from the top
uniform float uScale;   // px a design px
uniform float uDof;     // how soft the foreground goes, 0 to 1
uniform float uFrame;
out vec4 outColor;
const vec2 DISC[12] = vec2[](vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
  vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893), vec2(0.507, 0.064),
  vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
float hash(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float y = uRes.y - gl_FragCoord.y;
  vec3 c = texture(uSrc, uv).rgb;
  float r = uDof * smoothstep(uApex + 110.0 * uScale, uApex + 420.0 * uScale, y) * 10.0 * uScale;
  if (r > 0.4) {
    vec3 acc = c;
    for (int i = 0; i < 12; i++) acc += texture(uSrc, uv + DISC[i] * r / uRes).rgb;
    c = acc / 13.0;
  }
  float g = hash(gl_FragCoord.xy + vec2(uFrame * 7.13, uFrame * 3.71)) - 0.5;
  c += g * (0.035 + 0.04 * (1.0 - clamp(dot(c, vec3(0.333)), 0.0, 1.0)));
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - 0.2 * smoothstep(0.45, 1.25, length(q));
  outColor = vec4(c, 1.0);
}`;

// The worlds (the Locust Worlds page's, less the ones that were Locust's own), each as it's shot:
// where the horizon's top sits (design px of a 1080-tall frame), the planet's radius (design px),
// how far toward orbit the view is (0 macro, 1 from orbit), the sky's top and its colour at the
// horizon, where the light comes from, and its extras. text: 'dark' where the sky is light.
const BLACK = ['#020202', '#0a0806'], SPACE = ['#000000', '#040506'];
const HIGH = [-0.35, -0.75, 0.55], LOW = [-0.85, -0.35, 0.4], FLAT = [-0.2, -0.35, 0.9];
const WORLDS = [
  { key: 'caramel', i: 1, apex: 610, R: 2500, fore: 0.25, sky: BLACK, light: HIGH, flecks: true, dof: true, drift: [14, 0] },
  { key: 'gold', i: 2, apex: 640, R: 3300, fore: 0.6, sky: SPACE, light: HIGH, stars: 0.004, drift: [8, 0] },
  { key: 'leaf', i: 3, apex: 560, R: 2300, fore: 0.3, sky: ['#efe7d8', '#e3d8c6'], light: FLAT, dof: true, text: 'dark' },
  { key: 'blueprint', i: 4, apex: 520, R: 2100, fore: 0.2, sky: ['#0b1d38', '#12305c'], light: FLAT, drift: [0, -30] },
  { key: 'marble', i: 5, apex: 590, R: 1900, fore: 0.3, sky: BLACK, light: HIGH, dof: true },
  { key: 'wing', i: 6, apex: 560, R: 2300, fore: 0.3, sky: SPACE, light: [-0.2, -0.9, 0.35], dof: true, drift: [18, 0] },
  { key: 'eye', i: 7, apex: 620, R: 1900, fore: 0.35, sky: SPACE, light: HIGH, dof: true },
  { key: 'terracotta', i: 8, apex: 560, R: 2600, fore: 0.2, sky: BLACK, light: [-0.6, -0.5, 0.6], drift: [22, 0] },
  { key: 'ledger', i: 9, apex: 520, R: 2900, fore: 0.25, sky: ['#dcdad4', '#cfccc4'], light: FLAT, text: 'dark', drift: [0, 40] },
  { key: 'engraving', i: 10, apex: 600, R: 2100, fore: 0.3, sky: SPACE, light: HIGH },
  { key: 'dunes', i: 11, apex: 640, R: 2600, fore: 0.35, sky: ['#e8b98b', '#8e5d4a'], light: LOW, dof: true, drift: [16, 0] },
  { key: 'code', i: 12, apex: 600, R: 2400, fore: 0.3, sky: SPACE, light: FLAT, drift: [0, 60] },
  { key: 'thermal', i: 13, apex: 620, R: 2000, fore: 0.4, sky: ['#12001e', '#35063f'], light: HIGH },
  { key: 'lace', i: 14, apex: 590, R: 2100, fore: 0.25, sky: SPACE, light: HIGH, drift: [12, 0] },
  { key: 'pcb', i: 15, apex: 600, R: 2500, fore: 0.3, sky: SPACE, light: HIGH, dof: true, drift: [20, 0] },
  { key: 'cutouts', i: 16, apex: 560, R: 2400, fore: 0.2, sky: ['#f3eee3', '#e8e0d0'], light: FLAT, text: 'dark' },
  { key: 'crayon', i: 18, apex: 590, R: 2300, fore: 0.2, sky: ['#bfd6f2', '#abc8ec'], light: FLAT, text: 'dark' },
  { key: 'fuzz', i: 19, apex: 640, R: 2400, fore: 0.3, sky: BLACK, light: HIGH, flecks: true, dof: true },
  { key: 'chitin', i: 20, apex: 600, R: 2000, fore: 0.3, sky: SPACE, light: HIGH, dof: true },
  { key: 'glitter', i: 21, apex: 620, R: 2300, fore: 0.3, sky: SPACE, light: HIGH, dof: true },
  { key: 'globe', i: 22, apex: 600, R: 1900, fore: 0.6, sky: ['#f6f2e8', '#ece6d8'], light: FLAT, text: 'dark' },
  { key: 'feather', i: 23, apex: 650, R: 2200, fore: 0.3, sky: SPACE, light: HIGH, dof: true },
  { key: 'soil', i: 25, apex: 560, R: 3000, fore: 0, sky: ['#07468e', '#f3574e'], glow: [1, 0.62, 0.22, 1], stars: 0.002, sun: [0, -60, 230], light: HIGH, drift: [0, 0] },
  { key: 'steppe', i: 26, apex: 560, R: 2400, fore: 0.35, sky: ['#097db1', '#87d4d8'], glow: [1, 0.9, 0.6, 0.35], light: [-0.55, -0.6, 0.55], drift: [60, 0] },
  { key: 'wheat', i: 27, apex: 700, R: 2600, fore: 0.3, sky: ['#ea4e8c', '#ffac4a'], sun: [0, 240, 330], glow: [1, 0.66, 0.3, 0.5], light: [0, -0.85, 0.45], drift: [12, 0] },
  { key: 'fields', i: 28, apex: 700, R: 3200, fore: 0.75, sky: ['#0570a9', '#f364a2'], glow: [1, 0.78, 0.35, 0.5], light: [-0.3, -0.7, 0.6], drift: [34, 0] },
  { key: 'board', i: 29, apex: 700, R: 2800, fore: 0.4, sky: ['#005695', '#92b9ca'], stars: 0.004, glow: [0.6, 0.7, 0.5, 0.35], light: [-0.3, -0.75, 0.6], drift: [0, 0], act: true },
  // the launch film's own close-ups
  { key: 'citrus', i: 30, apex: 600, R: 2200, fore: 0.25, sky: SPACE, light: HIGH, dof: true, drift: [10, 0] },
  { key: 'honey', i: 31, apex: 620, R: 2600, fore: 0.25, sky: SPACE, light: HIGH, flecks: true, dof: true, drift: [6, 0] },
  { key: 'agate', i: 32, apex: 600, R: 2100, fore: 0.3, sky: ['#7c2f78', '#9c4a90'], light: FLAT, drift: [8, 0] },
  { key: 'slick', i: 33, apex: 620, R: 1900, fore: 0.45, sky: ['#141416', '#1e1e24'], light: HIGH, drift: [12, 0] },
  { key: 'denim', i: 34, apex: 590, R: 2400, fore: 0.25, sky: ['#2a2e38', '#3a3f4c'], light: HIGH, dof: true, drift: [14, 0] },
  { key: 'stem', i: 35, apex: 560, R: 2300, fore: 0.2, sky: ['#f2e3df', '#ead6d1'], light: FLAT, text: 'dark', drift: [10, 0] },
  { key: 'colony', i: 36, apex: 600, R: 2200, fore: 0.3, sky: ['#120504', '#1d0806'], stars: 0.006, light: HIGH, drift: [8, 0] },
  { key: 'crust', i: 37, apex: 580, R: 2400, fore: 0.3, sky: ['#e3e3e1', '#d5d5d2'], light: LOW, text: 'dark', dof: true, drift: [12, 0] },
  { key: 'glaze', i: 38, apex: 620, R: 1800, fore: 0.5, sky: ['#141016', '#1d1820'], light: HIGH, drift: [10, 0] },
  { key: 'ripples', i: 39, apex: 580, R: 2600, fore: 0.3, sky: ['#e8c64a', '#e2bc3e'], light: FLAT, text: 'dark', drift: [16, 0] },
];
// the title card: dawn over a dark planet (its palette: orange, a lime airglow, or a rainbow)
const DAWN = { key: 'dawn', i: 0, apex: 700, R: 4200, fore: 1, sky: SPACE, light: HIGH, drift: [10, 0] };
const GLOWS = [[1, 0.72, 0.35], [0.62, 0.9, 0.34], [1, 0.4, 0.66], [0.35, 0.7, 1]];
const LIGHT_INK = '#f2efe9', DARK_INK = '#1c2147';
// the song's title on the horizon and on the card: off for now (the user: "too loud")
const TITLE = false;
const FONT = 'Georgia, "Times New Roman", serif';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const darkSky = (sky) => parseInt(sky[0].slice(1, 3), 16) < 40;
// a sky as dark as a night's, top and horizon both (a sunset's red horizon under a deep blue isn't)
const luma = (hex) => { const [r, g, b] = rgb(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const nightSky = (sky) => Math.max(luma(sky[0]), luma(sky[1])) < 0.3;
// a seeded random number generator (mulberry32), so a song gets the same order of worlds again
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashText = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

// The title a word or two at a time, as the film has "There's / more to / discover": words are
// put together while the piece stays nine characters or less.
export function pieces(text) {
  const out = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + w.length <= 9) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
}

export function createWorlds(canvas, wordsCanvas) {
  let gl = null, par = null, jobs = null, ok = false, worldProg, postProg, loc = {}, post = {}, fbo = null, fboTex = null, fw = 0, fh = 0;
  // the galaxy's band, drawn once a shot at half the size (smooth enough), and what it was drawn for
  let skyFbo = null, skyTex = null, skyFor = null;
  const tex = {}; // the code, the ledger and the engraving's mark, as pictures the shader reads
  const pics = { code: makeCanvas(1024), ledger: makeCanvas(1024), mark: makeCanvas(1024) };
  const wctx = wordsCanvas.getContext('2d');
  let shotNow = null, shotAt = 0, cutAt = -9, kickAt = -9, hit = 0, pulse = 0, last = 0, frame = 0;
  let deck = [], rnd = seeded(1), title = '', artist = '', parts = [], partI = 0, partAt = 0, barSeen = null;
  let calmNow = false, seenIds = []; // fewer flashes, as the last kick had it; the worlds shown lately (newest last)
  let night = false; // night skies: every world's sky as dark as a night's (see shot)
  let card = true, cardAt = 0, codeText = '', codeAt = -9, ledgerRows = [], ledgerDirty = true, markFor = null;
  let boxOf = null; // where the code is on screen (from the app), for the words to keep clear of it
  // the look: chosen (auto, or one by name), the one printing now, since when; with auto, a drop
  // brings another look for 8 bars
  let lookPick = 'auto', lookNow = 'film', lookAt = 0, lookTill = null, lookAuto = 'film', colours = { bg: [0, 0, 0], fg: [255, 255, 255] };
  const lookProgs = new Map(), lookPics = {};
  let looksStarted = 0; // how many of the looks have had their programs started (see draw)
  let lastBox = null; // where the code was at the last cut (see place)
  let fbo2 = null, fbo2Tex = null, gridText = null, gridAt = -9;
  // the code as a grid of characters, for the code look: read in order, round and round
  const GRID = [96, 40], gridPic = makeCanvas(1);
  function paintGrid(lines) {
    const cw = 24, ch = 40, [cols, rows] = GRID;
    if (gridPic.width !== cols * cw) { gridPic.width = cols * cw; gridPic.height = rows * ch; }
    const g = gridPic.getContext('2d');
    g.clearRect(0, 0, gridPic.width, gridPic.height);
    g.fillStyle = '#fff';
    g.font = '500 32px "JetBrains Mono", Consolas, monospace';
    g.textBaseline = 'middle';
    const text = (lines.map((l) => l.trim()).filter(Boolean).join('   ') || 'toaster') + '   ';
    let k = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++, k++) {
      const c = text[k % text.length];
      if (c !== ' ') g.fillText(c, x * cw + 3, y * ch + ch * 0.52);
    }
  }
  const dust = Array.from({ length: 70 }, (_, k) => {
    const r = seeded(31 + k * 977);
    return { x: r(), h: r() ** 1.6, vx: 8 + r() * 20, w: 0.6 + r() * 1.4, p: r() * Math.PI * 2, r: 1 + r() * 3.5, soft: r() < 0.4 ? 0 : r() * 3, a: 0.25 + r() * 0.55 };
  });

  function makeCanvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
  // A program, started now and compiled in the background where the driver can (on an empty
  // shader cache, a new install's first start or the first after a graphics driver update, the
  // world's takes about a minute, and waited for it held the whole window up that long); ready()
  // says it's done (throwing if it failed), and nothing may ask it anything before (that would wait
  // for it); settled() says it's been done a while (the driver finishing a new shader on its own
  // threads for a moment after, a draw then waiting for it).
  const programLater = (frag) => {
    const pr = gl.createProgram(), vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    let doneAt = 0, linked = false;
    const done = () => doneAt || (!par || gl.getProgramParameter(pr, par.COMPLETION_STATUS_KHR) ? (doneAt = performance.now()) : 0);
    const ready = () => {
      if (linked) return true;
      if (!done()) return false;
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(pr));
      linked = true;
      return true;
    };
    const settled = () => ready() && (!par || performance.now() - doneAt > SETTLE_MS);
    return { pr, ready, settled };
  };
  function picture(unit, wrap) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }
  function upload(unit, t, c) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  }
  // The context, its pictures, and both programs started (finish() when they're done)
  function build() {
    ok = false;
    jobs = null;
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) return;
    par = gl.getExtension('KHR_parallel_shader_compile');
    jobs = { world: programLater(WORLD), post: programLater(POST) };
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    tex.code = picture(0, gl.CLAMP_TO_EDGE);
    tex.ledger = picture(1, gl.REPEAT);
    tex.mark = picture(2, gl.REPEAT);
  }
  // Both programs settled: their places and pictures set, and the worlds can draw. False till then,
  // and for good if either failed.
  function finish() {
    try {
      if (!jobs || !jobs.world.settled() || !jobs.post.settled()) return false;
    } catch (err) { console.error('worlds:', err); jobs = null; return false; }
    worldProg = jobs.world.pr;
    postProg = jobs.post.pr;
    loc = Object.fromEntries(['uRes', 'uScale', 'uCircle', 'uT', 'uWorld', 'uVar', 'uBlend', 'uFore', 'uDrift', 'uLight', 'uSkyA', 'uSkyB', 'uSkyH', 'uStars', 'uSun', 'uGlow', 'uBand', 'uSkySeed', 'uPass', 'uQuilt', 'uQuiltIds', 'uPrevWorld', 'uCutSeed', 'uAge', 'uBeat', 'uCalm', 'uZoom', 'uAct', 'uHit', 'uTexCode', 'uTexLedger', 'uTexMark', 'uTexSky'].map((k) => [k, gl.getUniformLocation(worldProg, k)]));
    post = Object.fromEntries(['uSrc', 'uRes', 'uApex', 'uScale', 'uDof', 'uFrame'].map((k) => [k, gl.getUniformLocation(postProg, k)]));
    gl.useProgram(worldProg);
    gl.uniform1i(loc.uTexCode, 0);
    gl.uniform1i(loc.uTexLedger, 1);
    gl.uniform1i(loc.uTexMark, 2);
    gl.uniform1i(loc.uTexSky, 7);
    gl.useProgram(postProg);
    gl.uniform1i(post.uSrc, 3);
    fw = fh = 0;
    codeText = '';
    ledgerDirty = true;
    markFor = null;
    ok = true;
  }
  // the world is drawn into a picture of its own, which the lens pass reads; with a look, the lens
  // draws into a second, which the look reads (and the band into a third, on unit 7)
  function target(w = fw, h = fh, unit = 3) {
    const tx = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return [fb, tx];
  }
  function size(W, H) {
    if (W === fw && H === fh) return;
    fw = W;
    fh = H;
    for (const tx of [fboTex, fbo2Tex, skyTex]) if (tx) gl.deleteTexture(tx);
    for (const fb of [fbo, fbo2, skyFbo]) if (fb) gl.deleteFramebuffer(fb);
    [fbo, fboTex] = target();
    [fbo2, fbo2Tex] = target();
    [skyFbo, skyTex] = target(Math.ceil(W / 2), Math.ceil(H / 2), 7);
    skyFor = null;
  }
  // a look's program, started the first time it's asked for (every look's when the worlds first
  // draw), with the pictures it needs; null till it's settled, the worlds drawn without the look
  // meanwhile (on a song's first drop it's long settled, so the look comes in right on it)
  function lookProg(look) {
    let p = lookProgs.get(look.key);
    if (p?.prog) return p;
    if (p) return p.job.settled() ? useLook(p) : null;
    for (const need of look.needs || []) {
      if (lookPics[need]) continue;
      if (need === 'noise') {
        lookPics.noise = gl.createTexture();
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, lookPics.noise);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 64, 0, gl.RED, gl.UNSIGNED_BYTE, WORLD_NOISE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      } else if (need === 'codegrid') {
        lookPics.codegrid = picture(6, gl.CLAMP_TO_EDGE);
        gridText = null;
      } else if (need === 'glyphs') {
        const c = document.createElement('canvas'), g = c.getContext('2d');
        c.width = 48 * RAMP.length;
        c.height = 80;
        g.fillStyle = '#fff';
        g.font = '500 68px "JetBrains Mono", Consolas, monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (let q = 0; q < RAMP.length; q++) g.fillText(RAMP[q], 48 * (q + 0.5), 80 * 0.52);
        lookPics.glyphs = gl.createTexture();
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, lookPics.glyphs);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    }
    p = { job: programLater(look.whole ? look.frag : onePart(look.frag)), prog: null, at: null };
    lookProgs.set(look.key, p);
    return p.job.settled() ? useLook(p) : null;
  }
  // a look's program settled: its places and pictures set, the first time it's used
  function useLook(p) {
    const prog = p.job.pr, locs = new Map();
    const at = (name) => { if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name)); return locs.get(name); };
    gl.useProgram(prog);
    gl.uniform1i(at('uSrc'), 3);
    gl.uniform1i(at('uNoise'), 4);
    gl.uniform1i(at('uGlyphs'), 5);
    gl.uniform1i(at('uCode'), 6);
    gl.uniform2f(at('uGrid'), GRID[0], GRID[1]);
    gl.uniform1f(at('uCount'), RAMP.length);
    p.prog = prog;
    p.at = at;
    return p;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ok = false; });
  canvas.addEventListener('webglcontextrestored', () => { fbo = fboTex = fbo2 = fbo2Tex = skyFbo = skyTex = skyFor = null; lookProgs.clear(); looksStarted = 0; for (const k in lookPics) delete lookPics[k]; build(); });
  // (the worlds' shader, the biggest, about a minute to compile the first time: started when the
  // worlds are first shown, or warmed by the app once its first visual has settled; at startup it worked
  // through that minute alongside whatever was being shown, after every update that changed it.
  // Started early, it's asked after now and then till it's done, where the driver compiles in the
  // background, so the settling's long over by the time the worlds are picked and they show at once)
  const warm = () => { try { if (par && jobs && !gl.isContextLost() && !(jobs.world.ready() && jobs.post.ready())) setTimeout(warm, 1000); } catch {} };

  // The pictures the shader reads. The terminal: the code as it is now, green on black, the parts'
  // names in lime.
  function paintCode(lines) {
    const g = pics.code.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    g.font = '500 25px "JetBrains Mono", Consolas, monospace';
    const rows = lines.length ? lines : ['// listening'];
    for (let a = 0; a < 36; a++) {
      const s = rows[a % rows.length], x = 24 + (a % 3) * 8, y = 34 + a * 28;
      const m = /^(\s*_?[a-z]+:)(.*)$/.exec(s);
      if (m) {
        g.fillStyle = 'rgba(201,240,74,1)';
        g.fillText(m[1], x, y);
        g.fillStyle = 'rgba(170,200,160,0.85)';
        g.fillText(m[2], x + g.measureText(m[1]).width, y);
      } else {
        g.fillStyle = s.trim().startsWith('//') ? 'rgba(120,150,120,0.6)' : 'rgba(170,200,160,0.85)';
        g.fillText(s, x, y);
      }
    }
  }
  // The ledger: a ruled page, a row a bar: its number, what played, the chord, the tempo.
  function paintLedger() {
    const g = pics.ledger.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    g.strokeStyle = 'rgba(120,150,210,0.8)';
    g.lineWidth = 1.5;
    for (let y = 40; y < 1024; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    g.strokeStyle = 'rgba(210,70,60,0.85)';
    g.beginPath(); g.moveTo(96, 0); g.lineTo(96, 1024); g.stroke();
    g.font = '400 21px "JetBrains Mono", Consolas, monospace';
    g.fillStyle = 'rgba(30,34,52,0.92)';
    const rows = ledgerRows.length ? ledgerRows : [{ bar: 1, what: 'listening', chord: '', bpm: '' }];
    for (let s = 0; s < 26; s++) {
      const row = rows[s % rows.length], y = 40 + 38 * (s + 1) - 11;
      g.fillText(String(row.bar).padStart(4, '0'), 16, y);
      g.fillText(row.what.slice(0, 22).padEnd(22), 116, y);
      g.fillText(row.chord.padEnd(8), 560, y);
      g.fillText(row.bpm, 820, y);
    }
  }
  // The engraving's mark: the title cut big into the ground, three times, at angles (none while the
  // title is off: it's the title as loud as it gets).
  function paintMark(text) {
    const g = pics.mark.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    if (!text) return;
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const word = text.split(/\s+/).sort((a, b) => b.length - a.length)[0] || 'toaster';
    for (const [x, y, size, ang] of [[512, 300, 210, 0], [250, 800, 120, -0.3], [790, 780, 140, 0.25]]) {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.font = `700 ${Math.min(size, (size * 6) / Math.max(4, word.length))}px ${FONT}`;
      g.fillText(word, 0, 0);
      g.restore();
    }
  }

  // The next shot: the next world in the song's own shuffled order, each time a fresh view of it
  // (horizon, curve, zoom, light, a moment of its surface, sometimes a glow along the horizon).
  function nextWorld() {
    if (!deck.length) {
      deck = WORLDS.slice();
      for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
      if (shotNow && deck[deck.length - 1] === shotNow.w) deck.unshift(deck.pop());
    }
    return deck.pop();
  }
  // Where the horizon goes, and the words on it, clear of the code: in a wide window under the
  // code's lines (beside the chords' panel if that hangs lower), or, with no room under them,
  // beside the code; in a tall one just above the code (under the camera or the card). room: how
  // wide the words may be.
  function place() {
    const W = innerWidth, H = innerHeight, box = (lastBox = boxOf?.()), portrait = H > W, m = 24;
    if (portrait) {
      // under the camera or the card, just above the code; with neither, under the code if there's
      // room, the planet a band along the bottom
      const top = box ? box.top : H * 0.45;
      if (top > H * 0.3 || !box) return { horizon: clamp((top - H * 0.015) / H, 0.3, 0.62), x: W / 2, room: W - 2 * m };
      if (box.bottom < H * 0.9) return { horizon: clamp((box.bottom + H * 0.055) / H, 0.6, 0.95), x: W / 2, room: W - 2 * m };
      return { horizon: 0.62, x: W / 2, room: W - 2 * m };
    }
    if (!box) return { horizon: 0.62, x: W / 2, room: W - 2 * m };
    if (box.bottom < H * 0.74) return { horizon: clamp((box.bottom + H * 0.12) / H, 0.5, 0.86), x: W / 2, room: W - 2 * m };
    if (box.lines < H * 0.74) {
      const from = box.panelRight + m;
      if (W - m - from > 300) return { horizon: clamp((box.lines + H * 0.12) / H, 0.5, 0.86), x: (from + W - m) / 2, room: W - m - from };
    }
    const from = box.right + m;
    return W - m - from > 240 ? { horizon: 0.62, x: (from + W - m) / 2, room: W - m - from } : { horizon: 0.62, x: W / 2, room: W - 2 * m };
  }
  function shot(w) {
    const glow = w.glow ? [...w.glow] : darkSky(w.sky) && rnd() < 0.4 ? [...GLOWS[Math.floor(rnd() * GLOWS.length)], 0.25 + rnd() * 0.3] : null;
    const s = {
      w,
      ...place(),
      lift: (rnd() - 0.5) * 0.04,
      curve: 0.75 + rnd() * 0.65,
      zoom: 0.85 + rnd() * 0.6,
      angle: ((rnd() - 0.5) * 70 * Math.PI) / 180,
      t: rnd() * 45,
      fore: clamp(w.fore + (rnd() - 0.5) * 0.3, 0, 1),
      glow,
      stars: w.stars ?? (darkSky(w.sky) ? rnd() * 0.006 : 0),
      v: Math.floor(rnd() * 3),
    };
    // the sky's own draws, made from the shot's (the song's own draws stay as they were, so its
    // shots do): where its stars fall, and over most of the space-black worlds the galaxy's band,
    // rising from behind the planet somewhere along the horizon at a tilt, its core low or high
    const own = seeded(Math.floor(s.t * 1e6) + s.v);
    s.seed = own() * 100;
    // Night skies (or fewer flashes): a sky lighter than a night's goes as dark as one, its own
    // colour kept as a hint (a twelfth of its light), with stars, an airglow some of the time and the
    // galaxy's band as over the space-black worlds, no sun, and light words: so a cut never lights
    // the whole screen. (From its own draws: the song's order of worlds stays as it was.)
    const darkened = (night || calmNow) && w.i && !nightSky(w.sky);
    if (darkened) {
      s.sky = w.sky.map((c) => rgb(c).map((x) => x * 0.08));
      s.sun = null;
      s.text = 'light';
      if (s.glow) s.glow[3] *= 0.6;
      else if (own() < 0.4) s.glow = [...GLOWS[Math.floor(own() * GLOWS.length)], 0.2 + own() * 0.25];
      s.stars = Math.max(s.stars, 0.002 + own() * 0.004);
    }
    if (w.i && (w.sky === SPACE || w.sky === BLACK || darkened) && own() < 0.6) {
      s.band = { x: (own() - 0.5) * 0.8, tilt: (own() < 0.5 ? -1 : 1) * (0.25 + own() * 0.9), core: -150 + own() * 650, k: 0.75 + own() * 0.35 };
      s.stars = Math.max(s.stars, 0.003);
    }
    return s;
  }
  function cut(t) {
    const prev = shotNow?.w;
    shotNow = shot(nextWorld());
    quiltFor(shotNow, prev);
    shotAt = cutAt = t;
    card = false;
  }
  // For the cells look: the world the shot came from, and the six others its cells may show: the
  // ones just seen and the ones coming next in the song's order (not the code's or the ledger's,
  // whose pictures are only painted while they're on), topped up from a few that look good cut up.
  // None of it draws on the song's generator, so its order of worlds stays as it was.
  function quiltFor(s, prev) {
    if (prev && prev !== DAWN) { seenIds = seenIds.filter((i) => i !== prev.i); seenIds.push(prev.i); seenIds = seenIds.slice(-4); }
    s.prev = prev && prev !== DAWN ? prev.i : s.w.i;
    const ok = (i) => i && i !== 9 && i !== 12 && i !== s.w.i;
    const ids = [];
    for (const i of [...deck.slice(-3).reverse().map((x) => x.i), ...seenIds.slice().reverse(), 32, 38, 1, 15, 5, 6, 30, 22]) if (ok(i) && !ids.includes(i) && ids.length < 6) ids.push(i);
    s.quiltIds = ids;
  }
  function toCard(t) {
    if (card && shotNow) return;
    card = true;
    cardAt = t;
    shotNow = shot(DAWN);
    shotNow.zoom = 1;
    shotNow.curve = 1;
    shotNow.lift = 0;
    shotNow.horizon = Math.max(shotNow.horizon, 0.6);
    shotAt = t;
  }

  // The words: the piece of the title now, sitting on the horizon (or the whole title on the card),
  // coming into focus as it arrives; and the gold dust in the air above the horizon.
  function paintWords(t, view) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (wordsCanvas.width !== W || wordsCanvas.height !== H) { wordsCanvas.width = W; wordsCanvas.height = H; }
    const g = wctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { apexCss, cssPerDesign, centreCss } = view;
    // dust: drifting sideways, bobbing, twinkling, some of it out of focus
    if (shotNow.w.flecks) {
      g.globalCompositeOperation = 'lighter';
      const span = innerWidth / cssPerDesign;
      for (const d of dust) {
        const x = ((((d.x * span + (t - shotAt + shotNow.t) * d.vx) % span) + span) % span) * cssPerDesign;
        const y = apexCss - (40 + d.h * 420 + Math.sin(t * d.w + d.p) * 6) * cssPerDesign;
        const r = Math.max(0.6, d.r * cssPerDesign), soft = d.soft * cssPerDesign;
        const a = d.a * (0.6 + 0.4 * Math.sin(t * 3 + d.p)) * (1 + hit * 0.6);
        const grad = g.createRadialGradient(x, y, 0, x, y, r + soft);
        grad.addColorStop(0, `rgba(255,205,120,${Math.min(1, a)})`);
        grad.addColorStop(r / (r + soft), `rgba(255,205,120,${Math.min(1, a) * (soft ? 0.5 : 1)})`);
        grad.addColorStop(1, 'rgba(255,205,120,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y, r + soft, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    const ink = (shotNow.text ?? shotNow.w.text) === 'dark' ? DARK_INK : LIGHT_INK;
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const portrait = innerHeight > innerWidth;
    if (!TITLE) {
      // no words: just the dust and the look's markings
    } else if (card) {
      // the title card: the title in the middle of the night, the artist small under it
      const k = clamp((t - cardAt) / 0.6, 0, 1), ease = 1 - (1 - k) ** 3;
      const size = Math.round(clamp((portrait ? 0.075 : 0.042) * innerWidth, 22, 72));
      g.globalAlpha = ease;
      g.filter = ease < 0.98 ? `blur(${((1 - ease) * 6).toFixed(1)}px)` : 'none';
      g.font = `400 ${size}px ${FONT}`;
      const lines = wrap(g, title || 'toaster', Math.min(shotNow.room * 0.9, innerWidth * (portrait ? 0.8 : 0.42)));
      const y0 = apexCss - size * 0.5 - (lines.length - 1) * size * 1.1;
      lines.forEach((line, k2) => g.fillText(line, centreCss, y0 + k2 * size * 1.1 + (1 - ease) * size * 0.3));
      if (artist) {
        g.font = `500 ${Math.round(size * 0.3)}px "JetBrains Mono", Consolas, monospace`;
        g.globalAlpha = ease * 0.75;
        g.fillText(artist.toUpperCase().split('').join(' '), centreCss, apexCss + size * 0.62);
      }
    } else if (parts.length) {
      // the piece of the title, on the horizon: in focus within a third of a second
      const k = clamp((t - partAt) / 0.35, 0, 1), ease = 1 - (1 - k) ** 3;
      const text = parts[partI % parts.length];
      let size = Math.round(clamp((portrait ? 0.11 : 0.06) * innerWidth, 26, 120));
      g.font = `400 ${size}px ${FONT}`;
      const wide = g.measureText(text).width;
      if (wide > shotNow.room * 0.9) { size = Math.max(18, Math.floor((size * shotNow.room * 0.9) / wide)); g.font = `400 ${size}px ${FONT}`; }
      g.globalAlpha = ease;
      g.filter = ease < 0.98 ? `blur(${((1 - ease) * 0.12 * size).toFixed(1)}px)` : 'none';
      if (ink === LIGHT_INK) { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = size * 0.25; }
      g.fillText(text, centreCss, apexCss - size * 0.12 + (1 - ease) * size * 0.25);
      g.shadowBlur = 0;
    }
    g.filter = 'none';
    g.globalAlpha = 1;
    const look = LOOKS.find((l) => l.key === lookNow);
    if (look?.overlay && !card) look.overlay(g, { W: innerWidth, H: innerHeight, k: cssPerDesign, t: t - lookAt });
  }
  function wrap(g, text, max) {
    const out = [];
    for (const w of text.split(/\s+/)) {
      const lastLine = out[out.length - 1];
      if (lastLine && g.measureText(`${lastLine} ${w}`).width <= max) out[out.length - 1] = `${lastLine} ${w}`;
      else out.push(w);
    }
    return out.slice(0, 3);
  }

  return {
    get broken() { return !ok; },
    warm() { if (!gl) { build(); warm(); } },
    get world() { return card ? 'dawn' : shotNow?.w.key; },
    // a kick: its light, and the next world if it's the bar's first (onOne; null before the beat
    // is found): once a bar, or every other with fewer flashes. (A cut on every kick, once a beat,
    // was too fast to see a world in, and with the cells look a mosaic of them torn up every half
    // second.) Before the beat is found, about a bar apart; with no kick on the one for two bars
    // (the bar lines off, a part without one), on the next kick then.
    kick(s, t, calm, beat, onOne = null) {
      kickAt = t;
      calmNow = calm;
      hit = Math.max(hit, 0.5 + 0.5 * Math.min(1, s));
      if (!calm) pulse = Math.max(pulse, 0.5 + 0.5 * Math.min(1, s));
      // (never more than about three cuts a second either way, as the cuts background has it: a new
      // world is a change of the whole screen's light, and faster can set off seizures: WCAG's
      // flash limit)
      const gap = Math.max(0.34, (calm ? 8 : 4) * beat), since = t - cutAt;
      if (card || !shotNow || (onOne && since >= 0.75 * gap) || (onOne === null && since >= 0.95 * gap) || since >= 2 * gap) cut(t);
    },
    // The look: 'auto' (film, and on a drop another for 8 bars) or one by name.
    // (night: the auto look, with night skies: every world after the next cut keeps a sky as dark
    // as a night's, see shot)
    get look() { return night ? 'night' : lookPick; },
    get night() { return night; },
    get lookNow() { return lookNow; },
    get looks() { return ['auto', 'night', ...LOOKS.map((l) => l.key)]; },
    setLook(key) {
      if (key === 'night') { lookPick = 'auto'; night = true; }
      else if (key === 'auto' || LOOKS.some((l) => l.key === key)) { lookPick = key; night = false; }
    },
    // a drop: with auto, another look for 8 bars (not the one before)
    drop(t, bar) {
      if (lookPick !== 'auto' || bar === null) return;
      const pool = LOOKS.filter((l) => l.frag && l.key !== lookAuto);
      lookAuto = pool[Math.floor(rnd() * pool.length)].key;
      lookTill = bar + 8;
    },
    // One world by name, as if a kick had just cut to it (for looking at them one by one); over:
    // any of the shot's draws to set instead (its band, its stars...).
    show(key, t, over) {
      const w = WORLDS.find((x) => x.key === key) || (key === 'dawn' ? DAWN : null);
      if (!w) return false;
      if (w === DAWN) { card = false; toCard(t); } else { const prev = shotNow?.w; shotNow = { ...shot(w), ...over }; quiltFor(shotNow, prev); shotAt = cutAt = t; card = false; }
      kickAt = t;
      return true;
    },
    get names() { return WORLDS.map((x) => x.key); },
    // Not in use: let go of the pictures (draw() makes them again).
    clear() {
      if (ok) size(1, 1);
      canvas.width = canvas.height = 1;
      wordsCanvas.width = wordsCanvas.height = 1;
    },
    // info: the song ({ title, artist }), the code's lines, the bar, what played in it
    draw(t, eng, info) {
      if (!gl) build();
      if (!ok && !finish()) return;
      // every look's program started in the background once the worlds draw, one every few frames
      // (all eleven in the first frame, with the pictures they need, held it up 45-90 ms; the look
      // in use is started whenever it's asked for)
      if (par && looksStarted < LOOKS.length && frame % 6 === 0) {
        const l = LOOKS[looksStarted++];
        if (l.frag) try { lookProg(l); } catch (err) { console.error('worlds look:', l.key, err); }
      }
      boxOf = info.codeBox || null;
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      frame++;
      hit *= Math.exp(-dt * 5);
      pulse *= Math.exp(-dt * 6);
      const beat = eng.tempo.P || 0.5;
      // a new song: its own order of worlds, its title in pieces, and the title card first
      const name = info.song?.title || '';
      if (name !== title) {
        title = name;
        artist = info.song?.artist || '';
        parts = pieces(title || 'toaster');
        partI = 0;
        partAt = t;
        rnd = seeded(hashText(title || 'toaster'));
        deck = [];
        ledgerRows = [];
        ledgerDirty = true;
        toCard(t);
      }
      // the kick gone a while (a breakdown, or nothing playing): the title card till it's back
      if (!card && t - kickAt > Math.max(2.5, 4 * beat)) toCard(t);
      if (info.col) colours = info.col;
      // the look: the one picked, or with auto film, and after a drop another for 8 bars
      let want = lookPick === 'auto' ? (lookTill !== null && eng.bar !== null && eng.bar < lookTill ? lookAuto : 'film') : lookPick;
      if (lookPick === 'auto' && card) want = 'film';
      if (want !== lookNow) { lookNow = want; lookAt = t; }
      if (!shotNow) toCard(t);
      // each bar the next piece of the title, and a row in the ledger
      if (eng.bar !== null && eng.bar !== barSeen) {
        if (barSeen !== null && !card) { partI++; partAt = t; }
        barSeen = eng.bar;
        ledgerRows.unshift({ bar: eng.bar + 1, what: info.played || 'listening', chord: info.chord || '', bpm: eng.tempo.locked ? `${Math.round(eng.tempo.bpm)} bpm` : '' });
        ledgerRows.length = Math.min(ledgerRows.length, 26);
        ledgerDirty = true;
      }
      // the pictures the shader reads, when they've changed
      const w = shotNow.w;
      if (w.key === 'code') {
        const text = info.lines.join('\n');
        if (text !== codeText && t - codeAt > 0.5) { codeText = text; codeAt = t; paintCode(info.lines); upload(0, tex.code, pics.code); }
      }
      if (w.key === 'ledger' && ledgerDirty) { ledgerDirty = false; paintLedger(); upload(1, tex.ledger, pics.ledger); }
      if (w.key === 'engraving' && markFor !== title) { markFor = title; paintMark(TITLE ? title || 'toaster' : ''); upload(2, tex.mark, pics.mark); }

      // sizes: drawn at up to 0.6 megapixels and stretched to fit (it's soft anyway)
      const k = Math.min(1, Math.sqrt(600000 / Math.max(1, innerWidth * innerHeight)));
      const W = Math.max(1, Math.round(innerWidth * k)), H = Math.max(1, Math.round(innerHeight * k));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      size(W, H);
      // the shot in design px, 1920 across (a phone's frame zoomed in, as the films had it)
      const portrait = innerHeight > innerWidth;
      const zoom = (portrait ? 1.5 : 1) * shotNow.zoom;
      const C = (W / 1920) * zoom, U = W / C, Hd = H / C;
      const horizon = clamp(shotNow.horizon + shotNow.lift, 0.28, 0.9);
      const Z = horizon * Hd, Rd = w.R / zoom / shotNow.curve;
      const since = t - shotAt;
      // the camera pushes in slowly through the shot, and the kick punches it
      const push = 1 + Math.min(0.06, since * 0.012) + 0.025 * pulse;
      const [lx, ly, lz] = w.light, ca = Math.cos(shotNow.angle), sa = Math.sin(shotNow.angle);
      const L = [lx * ca - ly * sa, lx * sa + ly * ca, lz], Ln = Math.hypot(...L);
      const low = band(eng, 40, 200), level = Math.min(1, (eng.level || 0) * 6);
      const glow = shotNow.glow ? [shotNow.glow[0], shotNow.glow[1], shotNow.glow[2], shotNow.glow[3] * (0.75 + 0.5 * low)] : [0, 0, 0, 0];
      const sun = w.sun && shotNow.sun !== null ? [U / 2 + w.sun[0], Z - w.sun[1], w.sun[2], 1] : [0, 0, 0, 0];
      const bd = shotNow.band, milky = bd ? [bd.k, bd.tilt, U / 2 + bd.x * U, bd.core] : [0, 0, 0, 0];

      gl.useProgram(worldProg);
      // a new shot with the galaxy in it (or a new size): its band, drawn once into its picture
      // (the picture itself unbound meanwhile: a texture can't be read and drawn into at once)
      if (bd && skyFor !== shotNow) {
        const sw = Math.ceil(W / 2), sh = Math.ceil(H / 2);
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo);
        gl.viewport(0, 0, sw, sh);
        gl.uniform1i(loc.uPass, 1);
        gl.uniform2f(loc.uRes, sw, sh);
        gl.uniform1f(loc.uScale, (C * sw) / W);
        gl.uniform3f(loc.uCircle, U / 2, Z + Rd, Rd);
        gl.uniform4f(loc.uBand, ...milky);
        gl.uniform1f(loc.uSkySeed, shotNow.seed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.uniform1i(loc.uPass, 0);
        skyFor = shotNow;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, skyTex);
      for (const [unit, tt] of [[0, tex.code], [1, tex.ledger], [2, tex.mark]]) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tt); }
      gl.uniform2f(loc.uRes, W, H);
      gl.uniform1f(loc.uScale, C);
      gl.uniform3f(loc.uCircle, U / 2, Z + Rd, Rd);
      gl.uniform3f(loc.uZoom, U / 2, Z, push);
      gl.uniform1f(loc.uT, shotNow.t + since);
      gl.uniform1i(loc.uWorld, w.i);
      gl.uniform1i(loc.uVar, shotNow.v);
      gl.uniform1f(loc.uBlend, 0);
      gl.uniform1f(loc.uFore, shotNow.fore);
      gl.uniform2f(loc.uDrift, ...(w.drift || [10, 0]));
      gl.uniform3f(loc.uLight, L[0] / Ln, L[1] / Ln, L[2] / Ln);
      gl.uniform3f(loc.uSkyA, ...(shotNow.sky ? shotNow.sky[0] : rgb(w.sky[0])));
      gl.uniform3f(loc.uSkyB, ...(shotNow.sky ? shotNow.sky[1] : rgb(w.sky[1])));
      gl.uniform1f(loc.uSkyH, Z * 1.8);
      gl.uniform1f(loc.uStars, w === DAWN ? 0.0035 : shotNow.stars); // the card's as it always was
      gl.uniform4f(loc.uSun, ...sun);
      gl.uniform4f(loc.uGlow, ...glow);
      gl.uniform4f(loc.uBand, ...milky);
      gl.uniform1f(loc.uSkySeed, shotNow.seed || 0);
      // the cells look: the planet in cells of the worlds around it
      const quilt = !card && !!LOOKS.find((l) => l.key === lookNow)?.quilt && shotNow.quiltIds?.length === 6;
      gl.uniform1f(loc.uQuilt, quilt ? 1 : 0);
      if (quilt) {
        gl.uniform1iv(loc.uQuiltIds, new Int32Array(shotNow.quiltIds));
        gl.uniform1i(loc.uPrevWorld, shotNow.prev);
        gl.uniform1f(loc.uCutSeed, shotNow.seed || 0);
        gl.uniform1f(loc.uAge, t - cutAt);
        gl.uniform1f(loc.uBeat, beat);
        gl.uniform1f(loc.uCalm, calmNow ? 1 : 0);
      }
      gl.uniform4f(loc.uAct, w.act ? 1 : 0, 0, w.act ? 0.5 + 0.5 * level : 0, 0);
      gl.uniform1f(loc.uHit, hit);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const look = LOOKS.find((l) => l.key === lookNow) || LOOKS[0];
      // (the look's program, or none till it's settled: see lookProg)
      let lp = null;
      if (look.frag) {
        try { lp = lookProg(look); } catch (err) { console.error('worlds look:', look.key, err); lookPick = lookNow = 'film'; }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, lp ? fbo2 : null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(postProg);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      gl.uniform2f(post.uRes, W, H);
      gl.uniform1f(post.uApex, Z * C);
      gl.uniform1f(post.uScale, C);
      gl.uniform1f(post.uDof, card ? 0 : w.dof ? 1 : 0.35);
      gl.uniform1f(post.uFrame, frame % 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (lp) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.useProgram(lp.prog);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, fbo2Tex);
        if (lookPics.noise) { gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, lookPics.noise); }
        if (lookPics.glyphs) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, lookPics.glyphs); }
        if (lookPics.codegrid) {
          const text = info.lines.join('\n');
          if (text !== gridText && t - gridAt > 1) { gridText = text; gridAt = t; paintGrid(info.lines); upload(6, lookPics.codegrid, gridPic); }
          gl.activeTexture(gl.TEXTURE6);
          gl.bindTexture(gl.TEXTURE_2D, lookPics.codegrid);
        }
        gl.uniform2f(lp.at('uRes'), W, H);
        gl.uniform1f(lp.at('uScale'), C);
        // the look on one part: the planet, or the sky when the code sits over the planet (a
        // tall window), so the code's own lines stay clear of it (the horizon where the push has
        // it: the circle scaled about the apex)
        if (!look.whole) {
          // (the code where it was at the cut: measured every frame, it held each frame up for the
          // page's layout)
          const box = lastBox, overPlanet = box && (box.top + box.bottom) / 2 > Z * (innerWidth / 1920) * zoom;
          gl.uniform4f(lp.at('uPart'), W / 2, H - (Z + Rd * push) * C, Rd * push * C, overPlanet ? -1 : 1);
        }
        const seed = (hashText(title || 'toaster') % 997) + 1;
        if (look.riso) {
          // a print's plates never sit quite in register
          const r = seeded(seed);
          gl.uniform4f(lp.at('uMis'), (r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 6);
          gl.uniform2f(lp.at('uMisY'), (r() - 0.5) * 6, (r() - 0.5) * 6);
          gl.uniform3f(lp.at('uPort'), 0, 0, 0);
          gl.uniform1f(lp.at('uSeed'), seed % 30);
          gl.uniform1f(lp.at('uPitch'), 7);
          gl.uniform1f(lp.at('uModel'), 0);
        } else {
          gl.uniform1i(lp.at('uSeed'), seed);
          gl.uniform1f(lp.at('uTime'), t - lookAt);
          gl.uniform1i(lp.at('uFrame'), frame);
          for (const [name, v] of Object.entries(look.set || {})) { if (Array.isArray(v)) gl.uniform2f(lp.at(name), v[0], v[1]); else gl.uniform1f(lp.at(name), v); }
          gl.uniform3f(lp.at('uBg'), colours.bg[0] / 255, colours.bg[1] / 255, colours.bg[2] / 255);
          gl.uniform3f(lp.at('uFg'), colours.fg[0] / 255, colours.fg[1] / 255, colours.fg[2] / 255);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // the words go on a canvas of their own, at the screen's resolution
      const cssPerDesign = (innerWidth / 1920) * zoom;
      paintWords(t, { apexCss: Z * cssPerDesign, cssPerDesign, centreCss: shotNow.x });
    },
  };
  // how loud a band of the spectrum is, 0 to 1 (as the warp has it)
  function band(eng, lo, hi) {
    const db = eng.fastDb, hz = eng.hzFast;
    if (!db || !hz) return 0;
    let m = -160;
    for (let q = Math.max(1, Math.floor(lo / hz)); q <= Math.min(db.length - 1, Math.ceil(hi / hz)); q++) m = Math.max(m, db[q]);
    return Math.min(1, Math.max(0, (m + 90) / 60));
  }
}
