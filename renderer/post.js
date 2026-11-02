// The looks (U): the visuals under the code, gathered into one picture and run through a look: trails, dots, LED,
// halftone, VHS or line art. While a look is on, each drop also glitches the picture for a moment.
//
// Each frame, the layers that are showing (the backgrounds, the code's blocks, the orb, the camera's) are drawn in
// their stacking order, at their opacity, into one 2D canvas, which becomes the texture a look's shader reads. The
// #post canvas sits over those layers (z-index 1, after them in the page) and under the code (#code is z-index 2), so
// the code stays sharp. (A WebGL layer that didn't draw this frame still gives its last picture: Chromium reads the
// displayed buffer.)
//
// What a look does is a function of the time and the engine's timestamped hits: no frame counting, no random at draw
// time (its noise is seeded by the time). A frame drawn at t looks the same however often frames come. The trails,
// an echo of the pictures before, are the one look with a past: they move in steps on the clock's own grid, 30 a
// second, so they come out the same at 30 fps and at 60 too (see the trails in createPost).

import { simulate } from './clock.js';
import { mulberry32 } from './random.js';

export const LOOKS = ['off', 'trails', 'dots', 'LED', 'halftone', 'VHS', 'line art', 'ripples', 'rain on glass', 'prism', 'heat shimmer'];
// (the looks that see the picture blurred as well: it's given them with its mipmaps)
const BLURRED = new Set(['rain on glass', 'prism', 'heat shimmer']);
const RIPPLE_LIFE = 2; // seconds a ripple runs
const MAX_RIPPLES = 12;

// The canvases a look takes in, in page order (style.css gives each its z-index; ties go by this order).
export const POST_LAYERS = ['cam', 'voxcam', 'dotcam', 'worlds', 'worldwords', 'chrome', 'spaghetti', 'earth', 'spectro', 'spectrobox',
  'scenery', 'lanes', 'wait', 'vis', 'warp', 'field', 'asciicam', 'orb', 'punch'];

const MAX_PIXELS = 2.6e6; // (about 2160 x 1200: a look is soft by nature, and 4K would cost four times the fill)
const TRAIL_HZ = 30; // the trails' steps a second (a frame rate the recordings use, and every other frame at 60)

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// What every look gets: the gathered picture (uSrc), the last output (uPrev, for the trails), the size in device
// pixels and the device pixel ratio, the time, the hits as envelopes (1 on the hit, falling away), where the beat and
// the bar are (0..1), the drop's envelope, and the theme's colours.
const HEAD = `#version 300 es
precision highp float;
uniform sampler2D uSrc, uPrev;
uniform vec2 uRes;
uniform float uTime, uDt, uDpr, uKick, uClap, uHat, uBass, uBeat, uBar, uBarN, uDrop, uLocked;
uniform vec3 uBg, uFg, uAccent;
in vec2 vUv;
out vec4 o;
// a 32-bit integer hash (PCG, after Jarzynski and Olano, "Hash Functions for GPU Rendering", 2020)
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rnd(float a, float b) { return float(pcg(uint(int(a) & 0x7fffffff) ^ pcg(uint(int(b) & 0x7fffffff) + 0x9e3779b9u))) / 4294967295.0; }
// smooth value noise from the hash
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = rnd(i.x, i.y), b = rnd(i.x + 1.0, i.y), c = rnd(i.x, i.y + 1.0), d = rnd(i.x + 1.0, i.y + 1.0);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// how far a colour is on the way from the theme's background to its foreground, 0..1, by brightness: a night scene on
// the blue theme reads as background and its moon as ink; on a light theme, dark reads as ink. (Where the two are
// about as bright as each other, by colour distance instead.)
float ink(vec3 c) {
  float b = luma(uBg), f = luma(uFg);
  if (abs(f - b) < 0.15) return clamp(distance(c, uBg) / max(0.3, distance(uFg, uBg)), 0.0, 1.0);
  return clamp((luma(c) - b) / (f - b), 0.0, 1.0);
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
`;

const LOOK_SRC = {
  // Motion trails: what moves leaves an echo (what stands still doesn't: a pixel feeds the trail by how much it
  // changed since the last frame). The trail is zoomed toward the middle on each kick, a rush forward that settles
  // between the hits, turned a touch with each clap (one way, then the other, a bar at a time), and fades back to the
  // background, older echoes drifting toward the accent colour. This pass keeps the trail; the last pass lays it under
  // the picture, the inkier of the two winning at each pixel, so the trails show on any theme.
  trails: `
uniform sampler2D uSrcPrev;
void main() {
  float k = uDt * 60.0;
  float zoom = 1.0 + (0.0003 + 0.03 * uKick) * k;
  float dir = mod(uBarN, 2.0) < 1.0 ? 1.0 : -1.0;
  float spin = dir * (0.0006 + 0.003 * uClap) * k;
  vec2 pc = rot(spin) * (vUv - 0.5) / zoom + 0.5;
  vec3 trail = mix(uBg, texture(uPrev, pc).rgb, pow(mix(0.86, 0.94, uLocked), k));
  trail = mix(trail, mix(uBg, uAccent, ink(trail)), 0.05 * k);
  vec3 cur = texture(uSrc, vUv).rgb;
  float moved = smoothstep(0.04, 0.2, distance(cur, texture(uSrcPrev, vUv).rgb));
  vec3 feed = mix(uBg, cur, moved);
  o = vec4(ink(feed) > ink(trail) ? feed : trail, 1.0);
}`,

  // A 1-bit dot screen at 45°, in the theme's two colours (the ID card's look): each cell's dot grows with the
  // picture's ink there. The cells swell a little on each kick, and the drop flips the colours for a moment.
  dots: `
void main() {
  float cell = (5.0 + 1.6 * uKick) * uDpr;
  mat2 R = rot(0.7853982);
  vec2 q = R * (vUv * uRes) / cell;
  vec2 id = floor(q) + 0.5;
  vec2 centre = transpose(R) * (id * cell);
  float v = pow(ink(texture(uSrc, centre / uRes).rgb), 0.85);
  float d = length(q - id);
  float r = sqrt(v) * 0.64;
  float aa = 0.9 / cell + fwidth(d) * 0.5;
  float on = 1.0 - smoothstep(r - aa, r + aa, d);
  float flip = step(0.5, uDrop) * step(fract(uTime * 4.0), 0.5);
  vec3 a = mix(uBg, uFg, flip), b = mix(uFg, uBg, flip);
  o = vec4(mix(a, b, on), 1.0);
}`,

  // An LED wall: the picture sampled once per lamp, its brightness in six steps (the panel's dimming), each lamp a
  // lit dot with a soft glow around it; unlit lamps stay faintly visible. The wall breathes with the beat and glows
  // up on the kick.
  LED: `
void main() {
  float cell = 7.0 * uDpr;
  vec2 p = vUv * uRes;
  vec2 id = floor(p / cell);
  vec2 f = p / cell - id - 0.5;
  vec3 src = texture(uSrc, (id + 0.5) * cell / uRes).rgb;
  vec3 lit = floor(src * 6.0 + 0.5) / 6.0;
  float breath = 0.92 + 0.08 * (1.0 - uBeat) * uLocked + 0.25 * uDrop;
  float d = length(f);
  float core = 1.0 - smoothstep(0.31, 0.39, d);
  float glow = exp(-d * d * 10.0) * (0.35 + 0.45 * uKick);
  vec3 off = uBg * 0.22 + 0.025;
  vec3 panel = uBg * 0.08;
  vec3 lamp = mix(off, lit * breath, core);
  o = vec4(mix(panel, lamp, core) + lit * glow * breath, 1.0);
}`,

  // A colour print of the picture, in its own colours: three screens at 15°, 75° and 0°. On a dark theme they're
  // light (red, green and blue dots adding up on the dark, like a screen up close); on a light theme they're ink (cyan,
  // magenta and yellow taking their colour away from the paper). A little off register, jumping on each kick, with a
  // faint grain; where the screens cross they make the print's rosettes.
  halftone: `
float cover(vec2 p, float ang, float cell, out vec2 centre) {
  mat2 R = rot(ang);
  vec2 q = R * p / cell;
  vec2 id = floor(q) + 0.5;
  centre = transpose(R) * (id * cell);
  return length(q - id);
}
void main() {
  float cell = 7.0 * uDpr;
  vec2 p = vUv * uRes;
  vec2 mis = vec2(1.0, -0.7) * uDpr * (1.0 + 2.0 * uKick);
  bool dark = luma(uBg) < 0.5;
  vec3 col = dark ? uBg * 0.3 : uBg;
  float aa = 1.1 / cell;
  for (int i = 0; i < 3; i++) {
    float ang = i == 0 ? 0.2618 : i == 1 ? 1.309 : 0.0;
    vec2 off = i == 0 ? vec2(0.0) : i == 1 ? mis : -mis;
    vec2 c;
    float d = cover(p + off, ang, cell, c);
    vec3 s = texture(uSrc, (c - off) / uRes).rgb;
    float v = clamp(dark ? s[i] : 1.0 - s[i], 0.0, 1.0);
    float r = sqrt(v) * 0.7;
    float k = 1.0 - smoothstep(r - aa, r + aa, d);
    vec3 one = vec3(0.0);
    one[i] = 1.0;
    if (dark) col += one * k * 0.95;
    else col *= mix(vec3(1.0), vec3(1.0) - one, k * 0.9);
  }
  col += (vnoise(p * 0.3 / uDpr) - 0.5) * 0.03;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,

  // An old tape: the lines wobble, the colour bleeds to the right of the picture, a tracking band rolls down the
  // screen once a bar, the head-switching noise runs along the bottom (jumping on each kick), with scanlines, grain
  // and a soft vignette; a drop turns the colour up.
  VHS: `
vec3 yiq(vec3 c) { return mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312) * c; }
vec3 rgb(vec3 c) { return mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703) * c; }
void main() {
  float field = floor(uTime * 59.94);
  float line = floor(vUv.y * uRes.y / (2.0 * uDpr));
  vec2 uv = vUv;
  float wob = (vnoise(vec2(line * 0.06, uTime * 1.7)) - 0.5) * (0.0022 + 0.006 * uKick);
  float bandY = 1.0 - fract(uLocked > 0.5 ? uBar : uTime * 0.25);
  float band = smoothstep(0.06, 0.0, abs(vUv.y - bandY));
  wob += band * (rnd(line, field) - 0.5) * 0.026;
  float head = smoothstep(0.055, 0.025, vUv.y);
  wob += head * (0.006 + 0.03 * uKick) * rnd(line, field + 17.0);
  uv.x += wob;
  vec3 base = yiq(texture(uSrc, uv).rgb);
  vec2 chroma = vec2(0.0);
  for (int i = 0; i < 6; i++) chroma += yiq(texture(uSrc, uv - vec2(float(i) * 2.2 * uDpr / uRes.x, 0.0)).rgb).yz;
  chroma /= 6.0;
  vec3 col = rgb(vec3(base.x, chroma * (1.25 + 0.7 * uDrop)));
  col += (rnd(gl_FragCoord.x + field * 7.0, gl_FragCoord.y) - 0.5) * 0.055;
  col += band * step(0.985, rnd(floor(gl_FragCoord.x / (3.0 * uDpr)) + field, line)) * 0.7;
  col = mix(col, vec3(rnd(gl_FragCoord.x, gl_FragCoord.y + field)), head * 0.35);
  col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 3.14159 / uDpr);
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,

  // Line art: the edges in the picture (a Sobel filter on its ink, so a shape's outline shows on any theme) drawn in
  // the theme's foreground on its background, thicker on each kick.
  'line art': `
float at(vec2 uv) { return ink(texture(uSrc, uv).rgb); }
void main() {
  vec2 px = (1.0 + 0.9 * uKick) * uDpr / uRes;
  float tl = at(vUv + px * vec2(-1, 1)), t = at(vUv + px * vec2(0, 1)), tr = at(vUv + px * vec2(1, 1));
  float l = at(vUv + px * vec2(-1, 0)), r = at(vUv + px * vec2(1, 0));
  float bl = at(vUv + px * vec2(-1, -1)), b = at(vUv + px * vec2(0, -1)), br = at(vUv + px * vec2(1, -1));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = tl + 2.0 * t + tr - bl - 2.0 * b - br;
  float e = smoothstep(0.12, 0.42, length(vec2(gx, gy)));
  o = vec4(mix(uBg, uFg, e), 1.0);
}`,
  // Ripples: each kick drops a ring into the picture somewhere (where, from its time: a render puts it in the same
  // place), each clap one from the middle, a drop a big one; a ring runs out and fades over a second or two, bending
  // the picture as it passes, its crest catching the light. (After Hyprland's click ripples.)
  ripples: `
const int MAXR = 12;
uniform vec4 uRip[MAXR];
uniform int uRipN;
void main() {
  vec2 pos = vUv * uRes;
  float diag = length(uRes);
  vec2 disp = vec2(0.0);
  float crest = 0.0;
  for (int i = 0; i < MAXR; i++) {
    if (i >= uRipN) break;
    vec4 r = uRip[i];
    float prog = clamp(r.z / (1.4 + 0.5 * r.w), 0.0, 1.0);
    vec2 d = pos - r.xy * uRes;
    float dist = length(d);
    float width = (26.0 + 10.0 * r.w) * uDpr;
    float sd = dist - prog * diag * (0.3 + 0.12 * r.w);
    if (abs(sd) >= width) continue;
    float envl = 0.5 + 0.5 * cos(3.14159265 * abs(sd) / width);
    float wave = cos(6.2831853 * sd / width);
    float fade = (1.0 - prog) * (1.0 - prog) * r.w;
    disp += d / max(dist, 1.0) * wave * envl * fade;
    crest += max(wave, 0.0) * envl * fade;
  }
  float dl = length(disp);
  if (dl > 1.0) disp /= dl;
  vec3 col = texture(uSrc, clamp(vUv + disp * 14.0 * uDpr / uRes, 0.0, 1.0)).rgb;
  o = vec4(col + min(crest, 1.5) * 0.08 * mix(vec3(1.0), uAccent, 0.3), 1.0);
}`,

  // Rain on glass: the picture through a misted window with rain on it. Big drops stick, then slide down in fits and
  // starts, leaving broken trails and small beads behind; small drops land and fade. Where there's water the glass is
  // clear and the picture bends through the drop; between them it's misted. The kick sharpens the bending a little.
  // All of it from the time alone (no drop is kept from one frame to the next). (Hyprland's drops blur, ported.)
  'rain on glass': `
float hsh(vec2 p) { return float(pcg(uint(int(floor(p.x * 1024.0)) & 0x7fffffff) ^ pcg(uint(int(floor(p.y * 1024.0)) & 0x7fffffff) + 0x9e3779b9u))) / 4294967295.0; }
struct Drop { float h; float c; };
Drop both(Drop a, Drop b) { return Drop(max(a.h, b.h), max(a.c, b.c)); }
vec4 dropRnd(vec2 cell, float seed) {
  vec2 k = cell + vec2(seed, seed * 1.61803);
  return vec4(hsh(k + vec2(17.17, 91.73)), hsh(k + vec2(63.31, 11.89)), hsh(k + vec2(37.61, 53.47)), hsh(k + vec2(79.13, 41.27)));
}
float cap(vec2 v) { float d = dot(v, v); return sqrt(max(0.0, 1.0 - d)) * (1.0 - smoothstep(0.82, 1.0, d)); }
float pulse(float a, float b, float c, float d, float x) { return smoothstep(a, b, x) * (1.0 - smoothstep(c, d, x)); }
float sstep(float a, float b, float x) { float p = clamp((x - a) / max(b - a, 0.001), 0.0, 1.0); return p * p * p * (p * (p * 6.0 - 15.0) + 10.0); }
float sstepV(float a, float b, float x) { float p = clamp((x - a) / max(b - a, 0.001), 0.0, 1.0), q = 1.0 - p; return 30.0 * p * p * q * q / max(b - a, 0.001); }
float stickSlip(float ph, vec4 r) {
  float s = (r.z - 0.5) * 0.05;
  return sstep(0.13 + s, 0.28 + s, ph) * 0.16 + sstep(0.41 - s, 0.58 - s, ph) * 0.29 + sstep(0.68 + s, 0.91 + s, ph) * 0.55;
}
float sliding(float ph, vec4 r) {
  float s = (r.z - 0.5) * 0.05;
  return clamp((sstepV(0.13 + s, 0.28 + s, ph) * 0.16 + sstepV(0.41 - s, 0.58 - s, ph) * 0.29 + sstepV(0.68 + s, 0.91 + s, ph) * 0.55) / 4.6, 0.0, 1.0);
}
float path(float p, float x0, vec4 r) {
  float ph = r.w * 6.2831853;
  return clamp(x0 + (r.y - 0.5) * 0.12 * p + (sin(p * mix(4.0, 7.0, r.z) + ph) - sin(ph)) * mix(0.012, 0.035, r.x), 0.2, 0.8);
}
Drop moving(vec2 local, vec2 cell, float seed, float density, float t, float rate0) {
  vec4 r = dropRnd(cell, seed);
  if (r.w < 1.0 - density) return Drop(0.0, 0.0);
  float rate = (0.75 + floor(hsh(cell + vec2(seed + 81.31, 19.47)) * 3.0) * 0.25) * rate0;
  float ph = fract(t * rate + hsh(cell + vec2(seed + 43.17, 71.53)));
  float prog = stickSlip(ph, r), slide = sliding(ph, r);
  float x0 = mix(0.23, 0.77, r.x), y0 = mix(0.45, 0.82, r.y), travel = mix(0.42, 0.82, r.z);
  vec2 centre = vec2(path(prog, x0, r), y0 - travel * prog);
  float landing = sstep(0.0, 0.035, ph), impact = pulse(0.0, 0.014, 0.035, 0.075, ph), drain = sstep(0.9, 0.975, ph);
  float life = landing * (1.0 - sstep(0.955, 0.985, ph));
  float scale = mix(0.58, 1.0, landing) * (1.0 + impact * 0.12) * mix(1.0, 0.28, drain);
  vec2 base = vec2(mix(0.11, 0.17, r.z), mix(0.075, 0.12, r.x));
  vec2 rad = base * vec2(mix(1.0, 0.82, slide), mix(1.0, 1.24, slide)) * scale;
  vec2 off = local - centre;
  float vy = off.y / rad.y;
  float body = cap(vec2(off.x / (rad.x * mix(1.05, 0.58, smoothstep(-0.75, 0.95, vy))), vy)) * life * mix(1.0, 0.42, drain);
  float hp = (y0 - local.y) / travel;
  float win = smoothstep(-0.015, 0.015, hp) * (1.0 - smoothstep(max(0.0, prog - 0.015), prog + 0.015, hp));
  float tp = clamp(hp, 0.0, prog);
  float tw = mix(base.x * 0.13, base.x * 0.27, clamp(tp / max(prog, 0.001), 0.0, 1.0));
  float td = abs(local.x - path(tp, x0, r)) / max(tw, 0.001);
  float tlife = landing * (1.0 - sstep(0.965, 1.0, ph)) * sstep(0.025, 0.12, prog);
  float trail = sqrt(max(0.0, 1.0 - td * td)) * win * mix(0.35, 1.0, clamp(tp / max(prog, 0.001), 0.0, 1.0))
    * mix(0.42, 1.0, smoothstep(-0.35, 0.2, sin((local.y + r.z) * 47.0))) * tlife * 0.24;
  float sp = prog * mix(0.28, 0.62, r.z);
  float sat = cap((local - vec2(path(sp, x0, r), y0 - travel * sp)) / (base * mix(0.18, 0.29, r.y))) * tlife * 0.5;
  return Drop(max(body, max(trail, sat)), max(smoothstep(0.04, 0.34, body) * 0.76, max(smoothstep(0.015, 0.2, trail) * 0.42, smoothstep(0.04, 0.35, sat) * 0.54)));
}
Drop rainLayer(vec2 p, float seed, float density, float t, float rate) {
  const vec2 CELL = vec2(1.45, 3.2);
  vec2 g = p / CELL + vec2(0.0, hsh(vec2(floor(p.x / CELL.x), seed + 9.71)));
  vec2 cell = floor(g), local = fract(g);
  Drop d = moving(local, cell, seed, density, t, rate);
  if (local.y > 0.4) d = both(d, moving(local - vec2(0.0, 1.0), cell + vec2(0.0, 1.0), seed, density, t, rate));
  return d;
}
Drop beads(vec2 p, float seed, float density, float t) {
  vec2 cell = floor(p), local = fract(p);
  vec4 r = dropRnd(cell, seed);
  if (r.w < 1.0 - density) return Drop(0.0, 0.0);
  vec2 centre = mix(vec2(0.2), vec2(0.8), r.xy);
  float rad = mix(0.08, 0.19, r.z * r.z);
  vec2 radii = vec2(rad * mix(0.82, 1.08, r.x), rad * mix(0.9, 1.22, r.y));
  float amp = mix(0.42, 0.78, r.z);
  float keep = step(0.48, hsh(cell + vec2(seed + 57.91, 13.37)));
  float rate = 0.75 + floor(hsh(cell + vec2(seed + 67.19, 31.43)) * 3.0) * 0.25;
  float ph = fract(t * rate + hsh(cell + vec2(seed + 23.73, 89.11)));
  float landing = sstep(0.0, 0.03, ph), impact = pulse(0.0, 0.012, 0.03, 0.07, ph) * (1.0 - keep);
  float life = mix(landing * (1.0 - sstep(0.84, 1.0, ph)), 1.0, keep);
  float edge = min(min(centre.x, 1.0 - centre.x), min(centre.y, 1.0 - centre.y)), maxR = max(radii.x, radii.y);
  float sc = mix(min(mix(0.48, 1.0, landing) * (1.0 + impact * 0.16), edge / max(maxR * 1.7, 0.001)), min(1.0, edge / max(maxR, 0.001)), keep);
  vec2 n = (local - centre) / (radii * max(sc, 0.16));
  float body = cap(n) * life;
  float ring = (1.0 - smoothstep(0.1, 0.26, abs(length(n) - 1.4))) * impact * 0.08;
  float h = max(body, ring) * amp;
  return Drop(h, max(smoothstep(0.04, 0.36, body * amp) * 0.48, smoothstep(0.01, 0.06, ring * amp) * 0.16));
}
Drop surface(vec2 p, float t) {
  Drop big = rainLayer(p, 3.17, 0.55, t, 0.45);
  Drop small = rainLayer(p * 1.43 + vec2(0.37, 1.91), 17.83, 0.35, t, 1.0);
  small.h *= 0.78; small.c *= 0.74;
  return both(big, both(small, beads(p * 1.75 + vec2(4.13, 2.71), 31.41, 0.36, t)));
}
void main() {
  float size = 110.0 * uDpr;
  vec2 p = gl_FragCoord.xy / size;
  Drop s = surface(p, uTime);
  float px = 1.0 / size;
  vec2 g = vec2(surface(p + vec2(px, 0.0), uTime).h - s.h, surface(p + vec2(0.0, px), uTime).h - s.h) * size * 0.16;
  g /= max(1.0, length(g));
  vec2 uv = clamp(vUv + g * (16.0 + 8.0 * uKick) * uDpr / uRes, 0.0, 1.0);
  vec3 col = mix(textureLod(uSrc, uv, 3.0).rgb, texture(uSrc, uv).rgb, s.c);
  col *= 1.0 + dot(g, vec2(-0.451219, 0.892413)) * 0.075;
  o = vec4(col, 1.0);
}`,

  // Prism: the picture through faceted glass, triangles cut on three axes, each bending it its own way and splitting
  // its colours at the folds, which catch a spectrum of light. The kick bends it harder. (Hyprland's prism blur.)
  prism: `
float hsh(vec2 p) { return float(pcg(uint(int(floor(p.x * 1024.0)) & 0x7fffffff) ^ pcg(uint(int(floor(p.y * 1024.0)) & 0x7fffffff) + 0x9e3779b9u))) / 4294967295.0; }
float tri(float x) { return 1.0 - abs(fract(x) * 2.0 - 1.0); }
float fold(float x) { x = fract(x); return min(min(x, 1.0 - x), abs(x - 0.5)); }
void main() {
  float size = 120.0 * uDpr;
  vec2 p = gl_FragCoord.xy / size;
  const vec2 A = vec2(1.0, 0.0), B = vec2(-0.5, 0.8660254), C = vec2(-0.5, -0.8660254);
  vec3 ph = vec3(dot(p, A), dot(p, B), dot(p, C));
  vec3 slope = 1.0 - 2.0 * step(vec3(0.5), fract(ph));
  vec2 n = (slope.x * A + slope.y * B + slope.z * C) * 0.46;
  vec2 cell = floor(ph.xy);
  n += (vec2(hsh(cell + vec2(19.17, 73.41)), hsh(cell + vec2(61.83, 11.29))) - 0.5) * 0.18;
  float fd = min(fold(ph.x), min(fold(ph.y), fold(ph.z)));
  float aa = max(fwidth(fd), 0.001);
  float edge = 1.0 - smoothstep(aa * 0.65, aa * 2.8, fd);
  float spec = fract((tri(ph.x) + tri(ph.y) + tri(ph.z)) * 0.19 + hsh(cell) * 0.24);
  n /= max(1.0, length(n));
  vec2 refr = n * (8.0 + 14.0 * uKick) * uDpr / uRes;
  vec2 c = clamp(vUv + refr * 0.72, 0.0, 1.0);
  vec3 split = vec3(texture(uSrc, clamp(c + refr * 0.2, 0.0, 1.0)).r, texture(uSrc, c).g, texture(uSrc, clamp(c - refr * 0.2, 0.0, 1.0)).b);
  vec3 col = mix(textureLod(uSrc, c, 1.0).rgb, split, 0.6);
  float emboss = dot(n, vec2(-0.451219, 0.892413));
  col *= 1.0 + emboss * 0.06;
  col += (0.58 + 0.42 * cos(6.2831853 * (spec + vec3(0.0, 0.333333, 0.666667)))) * edge * (0.03 + 0.08 * max(emboss, 0.0)) * (1.0 + uKick);
  o = vec4(col, 1.0);
}`,

  // Heat shimmer: the picture wavering as through the air over hot ground, rising; the bass and a drop make it
  // stronger. (Hyprland's heat shimmer blur.)
  'heat shimmer': `
void main() {
  float size = 70.0 * uDpr, t = uTime;
  vec2 p = vec2(gl_FragCoord.x, -gl_FragCoord.y) / size, w = p;
  w.x += sin(p.y * 0.73 - t) * 0.32;
  w.y += sin(p.x * 0.41 + t) * 0.12;
  float broad = w.y * 1.15 + w.x * 0.22 + t, detail = w.y * 2.37 - w.x * 0.31 + t * 2.0, cross = w.x * 0.74 + w.y * 0.41 - t;
  vec2 n = vec2(cos(broad) * 0.46 + cos(detail) * 0.22 + sin(cross) * 0.09, cos(cross) * 0.09 + sin(detail) * 0.05);
  n /= max(1.0, length(n));
  vec2 uv = clamp(vUv + n * (3.0 + 7.0 * uBass + 10.0 * uDrop) * uDpr / uRes, 0.0, 1.0);
  vec3 col = mix(texture(uSrc, uv).rgb, textureLod(uSrc, uv, 1.5).rgb, 0.25);
  o = vec4(col * (1.0 + dot(n, vec2(-0.451219, 0.892413)) * 0.04), 1.0);
}`,
};

// The last pass, onto the screen: a copy, or on a drop the glitch (bands of rows sliding sideways, the odd block
// jumping, the colours split along a line that changes every frame), fading out over a couple of seconds.
// (With the trails, uOut is the trail, laid under the picture here.)
const PRESENT = HEAD.replace('uniform sampler2D uSrc, uPrev;', 'uniform sampler2D uSrc, uPrev, uOut;\nuniform float uUnder;') + `
vec3 base(vec2 uv) {
  vec3 o = texture(uOut, uv).rgb;
  if (uUnder < 0.5) return o;
  vec3 c = texture(uSrc, uv).rgb;
  return mix(c, o, smoothstep(0.03, 0.1, ink(o) - ink(c)));
}
void main() {
  float s = uDrop;
  if (s < 0.01) { o = vec4(base(vUv), 1.0); return; }
  float f = floor(uTime * 30.0);
  float row = floor(vUv.y * 22.0);
  float shift = rnd(row, f) > 0.55 ? (rnd(row + 7.0, f) - 0.5) * 0.14 * s : 0.0;
  float blk = rnd(floor(vUv.x * 11.0), row + f * 3.0);
  vec2 uv = vUv + vec2(shift, blk > 0.94 ? (blk - 0.94) * 0.5 * s : 0.0);
  float a = rnd(f, 3.0) * 6.2831853;
  vec2 dir = vec2(cos(a), sin(a)) * 0.009 * s;
  o = vec4(base(uv + dir).r, base(uv).g, base(uv - dir).b, 1.0);
}`;


// The code on glass (Ctrl+K: code on glass): each line's text and each panel (the drum grid, the piano roll) sits on a
// pane of liquid glass instead of a flat plate. Inside a pane the picture under the code is misted, tinted toward the
// theme's background so the code stays readable, and clear through the middle; round the edge, where the glass curves
// away, it bends the picture (the colours parting a little) and catches the light along its rim. Outside the panes the
// picture passes through untouched. (Hyprland's acrylic blur, ported: its rounded profile, lens, clarity and rim.)
const MAX_PLATES = 32;
const GLASS = HEAD + `
const int MAXP = 32;
uniform sampler2D uIn;
uniform vec4 uPlates[MAXP];
uniform int uPlateN;
uniform float uRadius, uPower, uRefract, uBulb, uClarity, uAberr, uAbsorb, uAlone;
float plen(vec2 v, float p) { v = abs(v); return pow(pow(v.x, p) + pow(v.y, p), 1.0 / p); }
float boxSdf(vec2 q, vec2 hs, float r, float p) {
  r = clamp(r, 0.0, min(hs.x, hs.y));
  vec2 d = abs(q) - (hs - vec2(r)), out_ = max(d, vec2(0.0));
  return ((out_.x > 0.0 || out_.y > 0.0) ? plen(out_, p) : 0.0) + min(max(d.x, d.y), 0.0) - r;
}
float smst(float a, float b, float x) { float t = clamp((x - a) / max(b - a, 0.0001), 0.0, 1.0); return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float inner(vec2 q, vec2 hs, float r, float p, float inset) { vec2 h = max(hs - vec2(inset), vec2(0.001)); return boxSdf(q, h, clamp(r, 0.0, min(h.x, h.y)), p); }
float depthOf(vec2 q, vec2 hs, float r, float p, float w, float sdf) {
  if (sdf >= 0.0) return 0.0;
  if (inner(q, hs, r, p, w) <= 0.0) return w;
  float lo = 0.0, hi = w;
  for (int i = 0; i < 8; ++i) { float m = (lo + hi) * 0.5; if (inner(q, hs, r, p, m) <= 0.0) lo = m; else hi = m; }
  return (lo + hi) * 0.5;
}
vec2 normalOf(vec2 q, vec2 hs, float r, float p, float inset) {
  vec2 h = max(hs - vec2(inset), vec2(0.001));
  float rr = clamp(r, 0.0, min(h.x, h.y));
  vec2 c = max(abs(q) - (h - vec2(rr)), vec2(0.0)), g;
  if (c.x > 0.0001 || c.y > 0.0001) g = p <= 1.0001 ? vec2(c.x > 0.0001 ? 1.0 : 0.0, c.y > 0.0001 ? 1.0 : 0.0) : pow(c, vec2(p - 1.0));
  else { vec2 e = h - abs(q); g = e.x < e.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0); }
  g *= sign(q);
  return g / max(length(g), 0.0001);
}
float travelTo(vec2 o0, vec2 d, vec2 lo, vec2 hi) {
  float t = 1e10;
  if (d.x > 0.000001) t = min(t, (hi.x - o0.x) / d.x); else if (d.x < -0.000001) t = min(t, (lo.x - o0.x) / d.x);
  if (d.y > 0.000001) t = min(t, (hi.y - o0.y) / d.y); else if (d.y < -0.000001) t = min(t, (lo.y - o0.y) / d.y);
  return max(t, 0.0);
}
void main() {
  vec3 sharp = texture(uIn, vUv).rgb;
  // the pane this pixel is in (they don't overlap)
  int k = -1;
  vec2 hs = vec2(1.0), q = vec2(0.0);
  float sdf = 1.0, rad = 0.0;
  for (int i = 0; i < MAXP; i++) {
    if (i >= uPlateN) break;
    vec4 pl = uPlates[i];
    vec2 h = pl.zw * 0.5, p = gl_FragCoord.xy - (pl.xy + h);
    float r = min(uRadius, min(h.x, h.y)), d = boxSdf(p, h, r, uPower);
    if (d < 1.0) { k = i; hs = h; q = p; sdf = d; rad = r; break; }
  }
  if (k < 0) { o = vec4(sharp, 1.0 - uAlone); return; }
  vec3 blurred = textureLod(uIn, vUv, 2.6).rgb;
  float shape = 1.0 - smoothstep(-0.9, 0.9, sdf);
  float minHalf = min(hs.x, hs.y), bulb = clamp(uBulb, 1.0, max(minHalf * 0.8, 1.0));
  float depth = depthOf(q, hs, rad, uPower, bulb, sdf), prog = clamp(depth / bulb, 0.0, 1.0);
  float core = smst(0.25, 0.6, prog), curv = 1.0 - smst(0.0, 1.0, prog);
  float lens = smst(0.0, 0.08, prog) * (1.0 - smst(0.16, 1.0, prog));
  float rim = 1.0 - smst(0.0, max(bulb * 0.07, 2.0), depth);
  float caustic = smst(0.04, 0.13, prog) * (1.0 - smst(0.22, 0.48, prog));
  float counter = smst(0.18, 0.34, prog) * (1.0 - smst(0.42, 0.72, prog));
  vec2 outward = normalOf(q, hs, rad, uPower, depth);
  vec2 dx = vec2(1.0 / uRes.x, 0.0), dy = vec2(0.0, 1.0 / uRes.y), half_ = 0.5 / uRes, hiUV = vec2(1.0) - half_;
  vec2 outUV = outward.x * dx + outward.y * dy;
  float avail = travelTo(vUv, outUV, half_, hiUV);
  float valid = smoothstep(0.0, uRefract + 1.0, avail);
  float safe = min(uRefract * valid, max(avail - 0.5, 0.0));
  vec2 disp = outward * safe * lens, dUV = disp.x * dx + disp.y * dy;
  vec2 gUV = clamp(vUv + dUV * (1.0 - uAberr * 0.5), half_, hiUV);
  vec3 c = blurred;
  if (lens > 0.0001 && safe > 0.0001) c = mix(c, textureLod(uIn, gUV, 2.6).rgb, curv * valid);
  float clarity = uClarity * mix(1.0, 0.84, curv) * core;
  if (clarity > 0.0001) {
    vec3 through = textureLod(uIn, gUV, 0.0).rgb;
    if (uAberr > 0.0001 && lens > 0.0001 && safe > 0.0001) {
      through.r = textureLod(uIn, clamp(vUv + dUV, half_, hiUV), 0.0).r;
      through.b = textureLod(uIn, clamp(vUv + dUV * (1.0 - uAberr), half_, hiUV), 0.0).b;
    }
    c = mix(c, through, clarity);
  }
  float trans = exp(-uAbsorb * mix(0.34, 1.0, curv));
  c = c * trans + uBg * (1.0 - trans);
  vec3 n = normalize(vec3(outward * curv * 2.15, 1.0));
  const vec2 LIGHT = vec2(-0.451219, 0.892413);
  vec3 halfway = normalize(normalize(vec3(LIGHT, 0.72)) + vec3(0.0, 0.0, 1.0));
  float fres = 0.0204 + 0.9796 * pow(1.0 - max(n.z, 0.0), 5.0), spec = pow(max(dot(n, halfway), 0.0), 40.0);
  float dir = dot(outward, LIGHT), lum = clamp(luma(c), 0.0, 1.0);
  float hl = 1.6 * (rim * (0.045 + 0.12 * max(dir, 0.0)) + caustic * (0.035 + 0.08 * max(dir, 0.0)) + curv * (0.08 * fres + 0.13 * spec)) * mix(1.0, 0.4, lum);
  float shade = (rim * 0.09 * max(-dir, 0.0) + counter * (0.025 + 0.05 * max(-dir, 0.0))) * mix(0.45, 1.0, lum);
  c = c * (1.0 - shade) + mix(vec3(1.0), uBg, 0.08) * hl;
  o = uAlone > 0.5 ? vec4(c, shape) : vec4(mix(sharp, c, shape), 1.0);
}`;

// Looks from outside (docs/looks-from-shaders.md): a screen shader written for Hyprland (decoration:screen_shader)
// runs as a look as it is. Hyprland's names (tex, v_texcoord, fragColor, time; gl_FragColor and texture2D from GLSL ES
// 1.00) become Toaster's, its own declarations of them are taken out, and it gets the song's uniforms as well (HEAD's,
// without HEAD's helpers, which its own functions could clash with). TOASTER is defined for #ifdef.
const OUTSIDE_HEAD = HEAD.slice(0, HEAD.indexOf('out vec4 o;')) + 'out vec4 toaster_out;\n#define TOASTER 1\n#define tex uSrc\n#define v_texcoord vUv\n#define time uTime\n';
const QUAL = '(?:(?:highp|mediump|lowp)[ \\t]+)?', END = '[ \\t]*;[ \\t]*(?:\\/\\/[^\\n]*)?$';
export function adaptScreenShader(src) {
  src = String(src).replace(/^\uFEFF/, '');
  // its output, whatever it's called (fragColor in Hyprland's example), becomes toaster_out
  const out = new RegExp(`^[ \\t]*(?:layout[ \\t]*\\([^)]*\\)[ \\t]*)?out[ \\t]+${QUAL}vec4[ \\t]+(\\w+)${END}`, 'm').exec(src)?.[1] || 'fragColor';
  return OUTSIDE_HEAD + `#define ${out} toaster_out\n` + src
    .replace(/^[ \t]*#[ \t]*(version|extension)\b[^\n]*$/gm, '')
    .replace(/^[ \t]*precision[ \t]+\w+[ \t]+float[ \t]*;[ \t]*$/gm, '')
    .replace(new RegExp(`^[ \\t]*uniform[ \\t]+${QUAL}sampler2D[ \\t]+tex${END}`, 'gm'), '')
    .replace(new RegExp(`^[ \\t]*(?:in|varying)[ \\t]+${QUAL}vec2[ \\t]+v_texcoord${END}`, 'gm'), '')
    .replace(new RegExp(`^[ \\t]*(?:layout[ \\t]*\\([^)]*\\)[ \\t]*)?out[ \\t]+${QUAL}vec4[ \\t]+${out}${END}`, 'gm'), '')
    .replace(new RegExp(`^[ \\t]*uniform[ \\t]+${QUAL}float[ \\t]+time${END}`, 'gm'), '')
    .replace(/\bgl_FragColor\b/g, 'toaster_out')
    .replace(/\btexture2D[ \t]*\(/g, 'texture(');
}

export function createPost(canvas, layerIds = POST_LAYERS) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
  const gather = document.createElement('canvas');
  const gx = gather.getContext('2d', { alpha: false });
  const els = layerIds.map((id) => document.getElementById(id));
  const code = document.getElementById('code');
  let look = 'off', broken = !gl, W = 0, H = 0, dpr = 1;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); broken = true; canvas.hidden = true; document.body.classList.remove('look-on'); });
  const programs = {};
  // the gathered pictures, two taking turns: this frame's (pics[picAt]), and the one the trails' last step took in (the
  // other, once fedOk); the look's two ping-pong targets (the newest output first), and the last pass's
  let pics = [], picAt = 0, fedOk = false, pp = [], present = null, glassT = null;
  let glass = false; // the code on glass (setGlass)
  const plateV = new Float32Array(4 * MAX_PLATES);
  // The code's panes for the glass, in this canvas's pixels (y up): each line's text and each panel showing, at most
  // MAX_PLATES. None while the code is hidden.
  function platesNow() {
    if (!code) return 0;
    const cs = getComputedStyle(code);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return 0;
    const sx = W / innerWidth, sy = H / innerHeight;
    let n = 0;
    for (const el of code.querySelectorAll('.ln .txt, .panel')) {
      if (n >= MAX_PLATES) break;
      const r = el.getBoundingClientRect(), ln = el.classList.contains('txt') ? el.parentElement?.getBoundingClientRect() : null;
      const right = ln ? Math.min(r.right, ln.right) : r.right, w = right - r.left;
      if (w < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || getComputedStyle(el).visibility === 'hidden') continue;
      plateV.set([r.left * sx, (innerHeight - r.bottom) * sy, w * sx, r.height * sy], n * 4);
      n++;
    }
    return n;
  }
  let blank = true; // the trail is to start again from the theme's background (cleared at the next draw, which knows it)

  function compile(type, text) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, text);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  function program(frag) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  const programOf = (name) => (programs[name] ??= program(name === '<present>' ? PRESENT : name === '<glass>' ? GLASS : HEAD + LOOK_SRC[name]));

  function texture() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target() {
    const tex = texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb };
  }
  function release() {
    for (const r of [...pp, present, glassT]) if (r) { gl.deleteTexture(r.tex); gl.deleteFramebuffer(r.fb); }
    pp = []; present = null;
  }
  // The canvases, at the window's device pixels (capped), made again when the window changes.
  function fit() {
    const d = devicePixelRatio || 1, cw = innerWidth, ch = innerHeight;
    const scale = Math.min(d, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch)));
    const w = Math.max(2, Math.round(cw * scale)), h = Math.max(2, Math.round(ch * scale));
    if (w === W && h === H && scale === dpr) return false;
    W = w; H = h; dpr = scale;
    canvas.width = gather.width = W;
    canvas.height = gather.height = H;
    release();
    if (!pics.length) pics = [texture(), texture()];
    pp = [target(), target()];
    present = target();
    glassT = target();
    return true;
  }
  // The trail starting again: from the theme's background, with no picture taken in yet, and the steps' grid begun again
  // at the next draw.
  function restart() {
    blank = true;
    fedOk = false;
    trails.reset();
  }

  // The layers showing, drawn in their stacking order at their opacity over the theme's background.
  function collect(bg) {
    gx.globalAlpha = 1;
    gx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    gx.fillRect(0, 0, W, H);
    const shown = [];
    els.forEach((el, i) => {
      if (!el || el.hidden || !el.width || !el.height) return;
      const cs = getComputedStyle(el);
      const a = +cs.opacity;
      if (cs.display === 'none' || cs.visibility === 'hidden' || !(a > 0.004)) return;
      shown.push({ el, a, z: parseInt(cs.zIndex, 10) || 0, i });
    });
    shown.sort((p, q) => p.z - q.z || p.i - q.i);
    for (const { el, a } of shown) { gx.globalAlpha = Math.min(1, a); gx.drawImage(el, 0, 0, W, H); }
    gx.globalAlpha = 1;
  }

  const env = (age, tau) => (age >= 0 && age < tau * 12 ? Math.exp(-age / tau) : 0);
  const norm = (c) => (c ? [c[0] / 255, c[1] / 255, c[2] / 255] : null);
  const has = (eng, fn) => typeof eng[fn] === 'function';
  // a hit's time, if the engine had filed it by asOf (a hit is filed a little after it sounds: a step at its own time
  // takes it in only from then, see clock.js), else long ago
  const filed = (hit, asOf) => (hit && !(hit.known > asOf) ? hit.t : -99);

  // What a pass knows, for time t: the engine as it stood at asOf (a frame: its own time; a trails step: the step's).
  function uniforms(u, t, dt, eng, col, offset, asOf = t) {
    const at = t + offset, v = eng.v || {}; // (where it's heard, as every layer draws the grid)
    const part = (id) => (!v[id] ? -99 : has(eng, 'lastHitAt') ? eng.lastHitAt(id, asOf) : filed(v[id].lastHit, asOf));
    const step = has(eng, 'stepAt') ? eng.stepAt(at, asOf) : null;
    const locked = (has(eng, 'bpmAt') ? eng.bpmAt(asOf) > 0 : !!eng.tempo?.locked) && !(has(eng, 'silentAt') ? eng.silentAt(asOf) : eng.silent);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uDt, Math.min(0.1, Math.max(1 / 240, dt)));
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform1f(u.uKick, env(at - part('bd'), 0.17));
    gl.uniform1f(u.uClap, env(at - part('sd'), 0.2));
    gl.uniform1f(u.uHat, env(at - filed(eng.hhHit, asOf), 0.07));
    gl.uniform1f(u.uBass, env(at - (eng.lastBassHit ? filed(eng.lastBassHit, asOf) : part('bass')), 0.3));
    gl.uniform1f(u.uBeat, step == null ? 0 : (((step / 4) % 1) + 1) % 1);
    gl.uniform1f(u.uBar, step == null ? 0 : (((step / 16) % 1) + 1) % 1);
    gl.uniform1f(u.uBarN, step == null ? 0 : Math.floor(step / 16));
    gl.uniform1f(u.uDrop, env(at - (eng.lastDropKnown > asOf ? -99 : eng.lastDrop ?? -99), 0.7));
    gl.uniform1f(u.uLocked, locked ? 1 : 0);
    const bg = norm(col.bg), fg = norm(col.fg);
    gl.uniform3fv(u.uBg, bg);
    gl.uniform3fv(u.uFg, fg);
    gl.uniform3fv(u.uAccent, norm(col.accent) || fg);
  }
  function bindTex(u, name, unit, tex) {
    if (!u[name]) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u[name], unit);
  }

  // The trails run in steps on the clock's own grid (simulate, clock.js), not once a frame: each step fades and turns
  // the trail a step's worth, and feeds it what moved since the picture the step before took in. A frame between two
  // steps (every other one at 60 fps) shows the trail as the last step left it, under the picture of its own time. So
  // a frame at 30 fps and the one at the same time at 60 come out the same: the same steps, on the same pictures. (A
  // step takes in the picture of the frame that runs it: at a rate off the grid, up to a frame late. A frame that runs
  // more than one, after a stall, feeds what moved on the first and only fades the trail on the rest.)
  let frame = null; // the frame running the steps: its picture and what it was drawn from
  // The ripples' rings: one for each kick (where it lands from its time, so a render puts it in the same place), each
  // clap and each drop, kept while they run. (Taken in as the frames come: a hit between two frames is still seen.)
  const rings = [], ripV = new Float32Array(4 * MAX_RIPPLES);
  let ringHits = { bd: -99, sd: -99, drop: -99 }, ringT = -Infinity;
  function feedRings(t, eng, offset) {
    const at = t + offset, v = eng.v || {}; // (where it's heard, as every layer draws the grid)
    const hit = (id) => (!v[id] ? -99 : has(eng, 'lastHitAt') ? eng.lastHitAt(id, t) : filed(v[id].lastHit, t));
    if (t < ringT - 0.25) { rings.length = 0; ringHits = { bd: -99, sd: -99, drop: -99 }; } // (the clock went back: a render begun again)
    ringT = t;
    const k = hit('bd'), c = hit('sd'), d = eng.lastDropKnown > t ? -99 : eng.lastDrop ?? -99;
    if (k > ringHits.bd) { ringHits.bd = k; const r = mulberry32(Math.round(k * 1000) | 0); rings.push({ x: 0.15 + 0.7 * r(), y: 0.15 + 0.7 * r(), t: k, s: 1 }); }
    if (c > ringHits.sd) { ringHits.sd = c; rings.push({ x: 0.5, y: 0.5, t: c, s: 1.6 }); }
    if (d > ringHits.drop) { ringHits.drop = d; rings.push({ x: 0.5, y: 0.5, t: d, s: 3 }); }
    while (rings.length && (at - rings[0].t > RIPPLE_LIFE * 1.5 || rings.length > MAX_RIPPLES)) rings.shift();
    rings.forEach((g, i) => ripV.set([g.x, g.y, Math.max(0, at - g.t), g.s], i * 4));
    return rings.length;
  }
  const trails = simulate(TRAIL_HZ, (st, h) => {
    const { src, eng, col, offset } = frame;
    const [prev, next] = pp;
    const L = programOf('trails');
    gl.useProgram(L.p);
    uniforms(L.u, st, h, eng, col, offset, st);
    bindTex(L.u, 'uSrc', 0, src);
    bindTex(L.u, 'uPrev', 1, prev.tex);
    bindTex(L.u, 'uSrcPrev', 3, fedOk && !frame.fed ? pics[picAt ^ 1] : src);
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    pp = [next, prev];
    frame.fed = true;
  }, { rewound: () => { blank = true; fedOk = false; } });

  return {
    get look() { return look; },
    get broken() { return broken; },
    // Picks a look by name ('off' hides the canvas); a look whose shader won't compile is said, and stays off.
    set(name) {
      look = LOOKS.includes(name) ? name : 'off';
      const on = look !== 'off' && !broken;
      canvas.hidden = !(on || (glass && !broken));
      document.body.classList.toggle('look-on', on);
      restart(); // (the trails start from the background, not from whatever an earlier look left)
      if (!on) return look;
      try { programOf(look); programOf('<present>'); } catch (err) { console.warn('look', look, err); broken = true; canvas.hidden = true; document.body.classList.remove('look-on'); return look; }
      return look;
    },
    // A look from outside (a screen shader, see adaptScreenShader), added to U's round once it compiles. Returns
    // null, or why it won't.
    addLook(name, src) {
      if (broken) return 'looks need WebGL 2';
      let made;
      try { made = program(adaptScreenShader(src)); } catch (err) { return String(err?.message || err).slice(0, 400); }
      if (programs[name]) gl.deleteProgram(programs[name].p);
      programs[name] = made;
      if (!LOOKS.includes(name)) LOOKS.push(name);
      return null;
    },
    removeLook(name) {
      if (look === name) this.set('off');
      const i = LOOKS.indexOf(name);
      if (i > 0) LOOKS.splice(i, 1);
      if (programs[name]) { gl.deleteProgram(programs[name].p); delete programs[name]; }
    },
    // The code on glass, on or off; false if this machine can't (no WebGL 2, or its shader won't compile).
    setGlass(on) {
      glass = !!on && !broken;
      if (glass) try { programOf('<glass>'); programOf('<present>'); } catch (err) { console.warn('glass', err); glass = false; }
      canvas.hidden = !((look !== 'off' || glass) && !broken);
      return glass;
    },
    draw(t, eng, col, offset = 0) {
      if ((look === 'off' && !glass) || broken) return;
      if (fit()) restart();
      const panes = glass ? platesNow() : 0;
      if (look === 'off' && !panes) { if (!canvas.hidden) canvas.hidden = true; return; } // (the code hidden: nothing on glass)
      if (canvas.hidden) canvas.hidden = false;
      collect(col.bg);
      const src = pics[picAt];
      gl.bindTexture(gl.TEXTURE_2D, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gather);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const blur = BLURRED.has(look) || (panes > 0 && (look === 'off' || look === 'trails'));
      if (blur) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, blur ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.viewport(0, 0, W, H);
      if (look === 'trails') {
        // the steps due by t, into the ping-pong targets (none on a frame between two steps)
        frame = { src, eng, col, offset, fed: false };
        trails.advance(t);
        if (blank) {
          const [r, g, b] = norm(col.bg);
          for (const p of pp) { gl.bindFramebuffer(gl.FRAMEBUFFER, p.fb); gl.clearColor(r, g, b, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
          blank = fedOk = false;
        } else if (frame.fed) { picAt ^= 1; fedOk = true; } // (this picture is the one taken in now: the next goes in the other)
        frame = null;
      } else if (look !== 'off') {
        // a look with no past: the picture through the look, into the target the last pass reads
        const L = programOf(look);
        gl.useProgram(L.p);
        uniforms(L.u, t, 1 / 60, eng, col, offset);
        if (look === 'ripples') { const n = feedRings(t, eng, offset); gl.uniform1i(L.u.uRipN, n); if (n) gl.uniform4fv(L.u['uRip[0]'], ripV); }
        bindTex(L.u, 'uSrc', 0, src);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp[0].fb);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // the code's panes of glass, over the picture as the look left it (with the trails, over the picture itself: the
      // trail goes under it in the last pass)
      let shown = look === 'off' ? src : pp[0].tex;
      if (panes) {
        const under = look === 'trails' || look === 'off' ? src : pp[0].tex;
        if (under !== src) { gl.bindTexture(gl.TEXTURE_2D, under); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        const G = programOf('<glass>');
        gl.useProgram(G.p);
        uniforms(G.u, t, 1 / 60, eng, col, offset);
        bindTex(G.u, 'uIn', 0, under);
        gl.uniform1i(G.u.uPlateN, panes);
        gl.uniform4fv(G.u['uPlates[0]'], plateV);
        gl.uniform1f(G.u.uRadius, 7 * dpr);
        gl.uniform1f(G.u.uPower, 4);
        gl.uniform1f(G.u.uRefract, 16 * dpr);
        gl.uniform1f(G.u.uBulb, 14 * dpr);
        gl.uniform1f(G.u.uClarity, 0.55);
        gl.uniform1f(G.u.uAberr, 0.08);
        gl.uniform1f(G.u.uAbsorb, 0.7);
        // (on its own, with no look: straight onto the screen, clear outside the panes, and done)
        gl.uniform1f(G.u.uAlone, look === 'off' ? 1 : 0);
        if (look === 'off') { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
        gl.bindFramebuffer(gl.FRAMEBUFFER, glassT.fb);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        shown = glassT.tex;
      }
      // the last pass onto the screen (the drop's glitch, or a copy; the trails laid under the picture)
      const P = programOf('<present>');
      gl.useProgram(P.p);
      uniforms(P.u, t, 1 / 60, eng, col, offset);
      gl.uniform1f(P.u.uUnder, look === 'trails' ? 1 : 0);
      bindTex(P.u, 'uSrc', 0, look === 'trails' && panes ? glassT.tex : src);
      bindTex(P.u, 'uOut', 2, look === 'trails' ? pp[0].tex : shown);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // the code's lit lines glow with the kick (style.css: body.look-on #code)
      code?.style.setProperty('--look-kick', env(t + offset - (eng.v?.bd?.lastHit?.t ?? -99), 0.17).toFixed(3));
    },
  };
}
