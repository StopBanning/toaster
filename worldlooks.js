// The looks a world can be printed in, after the lens (the Locust Worlds page's finishes, the
// user's own, and Toaster's: its ASCII, and the theme's ink). Each is a fragment shader that reads
// the lensed picture (uSrc) in design px, with the shared prefix below; film is the picture as it is.
const PREFIX = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uScale;
uniform int uSeed;
uniform float uTime; // the film's time, s
uniform int uFrame;  // and its frame, for grain that changes every frame
out vec4 outColor;

// design px, y down, as the scene was drawn
vec2 designPx() { return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale; }
vec2 designSize() { return uRes / uScale; }
vec3 src(vec2 p) {
  vec2 uv = vec2(p.x * uScale / uRes.x, 1.0 - p.y * uScale / uRes.y);
  return texture(uSrc, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// brightness with its local contrast pushed (an unsharp mask r design px wide), so
// a one-ink print keeps the swarm off the sky and the texture in the wheat
float punch(vec2 p, float r, float amount) {
  float l = lum(src(p));
  float around = (lum(src(p + vec2(r, 0.0))) + lum(src(p - vec2(r, 0.0))) + lum(src(p + vec2(0.0, r))) + lum(src(p - vec2(0.0, r)))) * 0.25;
  return l + amount * (l - around);
}
// integer hashing: exact for any frame size and any seed
float hashI(ivec2 q, int s) {
  uvec2 u = uvec2(q + ivec2(65536)) ;
  uint h = u.x * 1597334677u ^ u.y * 3812015801u ^ uint(s) * 2654435761u;
  h ^= h >> 16; h *= 0x7feb352du; h ^= h >> 15; h *= 0x846ca68bu; h ^= h >> 16;
  return float(h) * (1.0 / 4294967296.0);
}
float vn(vec2 p, int s) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 q = ivec2(i);
  return mix(mix(hashI(q, s), hashI(q + ivec2(1, 0), s), u.x), mix(hashI(q + ivec2(0, 1), s), hashI(q + ivec2(1, 1), s), u.x), u.y);
}`;

// ours: the world as text in Toaster's ramp, each character in the colour of what it stands for,
// light on the dark (bright: dense)
const ASCII = `${PREFIX}
uniform sampler2D uGlyphs; // the ramp's characters in a row, white on clear
uniform float uCount;
uniform vec2 uCell;        // a character cell, design px
uniform vec3 uBg;
void main() {
  vec2 p = designPx();
  vec2 cell = floor(p / uCell);
  vec2 f = fract(p / uCell);
  vec2 c = (cell + 0.5) * uCell;
  vec3 s = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += src(c + vec2(float(i), float(j)) * uCell / 3.0);
  s /= 9.0;
  // brightness stretched, so a dark world still reads; each character the colour at full
  // strength, a little dimmer where it's dark
  float lv = smoothstep(0.03, 0.55, lum(s));
  float k = floor(clamp(lv, 0.0, 0.999) * uCount);
  float glyph = texture(uGlyphs, vec2((k + f.x) / uCount, f.y)).a;
  vec3 ink = s / max(0.05, max(s.r, max(s.g, s.b))) * (0.55 + 0.45 * lv);
  outColor = vec4(mix(uBg * 0.18, ink, glyph), 1.0);
}`;

// ours: the theme's two colours, dithered through blue noise (as the ID card's picture is)
const INK = `${PREFIX}
uniform sampler2D uNoise;
uniform float uDot; // one dot, design px
uniform vec3 uBg;
uniform vec3 uFg;
void main() {
  vec2 p = designPx();
  vec2 cell = floor(p / uDot);
  float t = smoothstep(0.1, 0.9, punch((cell + 0.5) * uDot, 6.0, 0.8));
  float on = step(texelFetch(uNoise, ivec2(mod(cell, 64.0)), 0).r, t);
  outColor = vec4(mix(uBg, uFg, on), 1.0);
}`;

// ours: the planet drawn in the song's code, the way ASCII art draws a picture: the characters in
// reading order (a grid of the code on screen, made by the worlds), but only as many cells printed
// as the world is bright there (which ones: a fixed hash a cell, so they don't crawl), each in the
// world's own colour, and the world itself faintly underneath. So the sky stays dark and the planet
// keeps its shape: it stays a world. (Every cell used to print, the sky lit up to nearly half, and
// it stopped being one.)
const CODE = `${PREFIX}
uniform sampler2D uCode; // the code, a character a cell, white on clear
uniform vec2 uGrid;      // its columns and rows
uniform vec2 uCell;      // a character cell, design px
uniform vec3 uBg;
void main() {
  vec2 p = designPx();
  vec2 cell = floor(p / uCell);
  vec2 f = fract(p / uCell);
  vec2 c = (cell + 0.5) * uCell;
  vec3 s = (src(c) + src(c + vec2(uCell.x * 0.3, 0.0)) + src(c - vec2(uCell.x * 0.3, 0.0))) / 3.0;
  float lv = smoothstep(0.05, 0.6, lum(s));
  float on = step(hashI(ivec2(cell), 11), lv * 1.1);
  float glyph = texture(uCode, (mod(cell, uGrid) + f) / uGrid).a * on;
  vec3 ink = min(vec3(1.0), s * (1.3 + 0.7 * lv) + 0.06);
  vec3 under = mix(uBg * 0.15, src(p), 0.38);
  outColor = vec4(mix(under, ink, glyph), 1.0);
}`;

// the Locust Worlds page's: a risograph print (blue, pink and yellow screens, navy line art, off register)
const RISO = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uScale;
uniform vec4 uMis;    // blue plate offset (xy), pink plate offset (zw), design px
uniform vec2 uMisY;   // yellow plate offset
uniform vec3 uPort;   // porthole centre and radius, design px; radius <= 0 for none
uniform float uSeed;
uniform float uPitch;
uniform float uModel; // how colours are split into inks: 0 by density (the teaser), 1 by how halftone dots mix
out vec4 outColor;

const vec3 PAPER = vec3(0.953, 0.933, 0.886);
const vec3 BLUE = vec3(0.0, 0.47, 0.75);
const vec3 PINK = vec3(1.0, 0.34, 0.66);
const vec3 YELLOW = vec3(1.0, 0.9, 0.1);
const vec3 NAVY = vec3(0.11, 0.13, 0.28);

float h21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 src(vec2 p) {
  vec2 uv = vec2(p.x * uScale / uRes.x, 1.0 - p.y * uScale / uRes.y);
  return texture(uSrc, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}
// How much of each ink a colour needs. Inks are translucent, so densities add:
// navy takes the darkness it can, and blue, pink and yellow are solved for the
// rest from their own densities -- a riso blue asks for blue ink and nothing
// else, an orange for yellow and pink.
vec4 separate(vec3 c) {
  vec3 D = -log(clamp(c / PAPER, 0.002, 1.0));
  vec3 dK = -log(NAVY);
  vec3 r = D / dK;
  float kraw = min(r.x, min(r.y, r.z));
  float k = clamp(kraw, 0.0, 1.0) * smoothstep(0.2, 0.6, kraw);
  vec3 rest = max(D - k * dK, 0.0);
  mat3 inks = mat3(-log(vec3(0.02, 0.47, 0.75)), -log(vec3(1.0, 0.34, 0.66)), -log(vec3(1.0, 0.9, 0.1)));
  return vec4(clamp(inverse(inks) * rest, 0.0, 1.0), k);
}
// The split by how the dots really mix. Halftone dots of translucent ink,
// printed on independent screens, average out to paper times, for each ink,
// (1 - coverage x what the ink absorbs) -- linear in coverage, not in density.
// The density split above under-inks every light tint (a pale blue asks for
// a little blue and a little pink, and prints lavender); this one solves the
// mixing itself, a few Newton steps from the density answer, so a pale blue
// prints as a light screen of blue. Navy is taken first, as it prints.
vec4 separateMix(vec3 c) {
  vec4 d = separate(c);
  float kp = smoothstep(0.3, 0.55, d.w);
  vec3 T = clamp(c / (PAPER * mix(vec3(1.0), NAVY, kp)), 0.003, 1.0);
  vec3 aB = vec3(1.0) - BLUE;
  vec3 aP = vec3(1.0) - PINK;
  vec3 aY = vec3(1.0) - YELLOW;
  vec3 x = d.xyz;
  for (int i = 0; i < 6; i++) {
    vec3 fB = max(vec3(1.0) - x.x * aB, vec3(0.004));
    vec3 fP = max(vec3(1.0) - x.y * aP, vec3(0.004));
    vec3 fY = max(vec3(1.0) - x.z * aY, vec3(0.004));
    vec3 F = log(fB * fP * fY) - log(T);
    mat3 J = mat3(-aB / fB, -aP / fP, -aY / fY);
    x = clamp(x - inverse(J) * F, 0.0, 1.0);
  }
  return vec4(x, d.w);
}
vec4 inks(vec3 c) { return uModel > 0.5 ? separateMix(c) : separate(c); }
float screen(vec2 p, float cov, float ang, float pitch) {
  float c = cos(ang); float s = sin(ang);
  vec2 q = mat2(c, s, -s, c) * p / pitch;
  float d = length(fract(q) - 0.5);
  cov = clamp(cov, 0.0, 1.0);
  float r = mix(sqrt(cov / 3.14159), 0.76, smoothstep(0.7, 1.0, cov));
  float aa = 0.8 / (pitch * uScale);
  return smoothstep(r + aa, r - aa, d) * step(0.02, cov);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float inside = 1.0;
  float rim = 0.0;
  if (uPort.z > 0.0) {
    float d = length(p - uPort.xy);
    inside = smoothstep(uPort.z + 1.0, uPort.z - 1.0, d);
    rim = smoothstep(uPort.z + 9.0, uPort.z + 7.0, d) * smoothstep(uPort.z - 1.0, uPort.z + 1.0, d);
  }
  float b = screen(p + uMis.xy, inks(src(p + uMis.xy)).x, 0.2618, uPitch);
  float pk = screen(p + uMis.zw, inks(src(p + uMis.zw)).y, 1.309, uPitch);
  float y = screen(p + uMisY, inks(src(p + uMisY)).z, 0.0, uPitch);
  // navy is the line-art ink: printed solid, never screened, so silhouettes and
  // the lines cut into them stay crisp
  float k = smoothstep(0.3, 0.55, separate(src(p)).w);
  // riso ink never lies flat: its density wanders, and solids drop out in specks
  float wander = 0.8 + 0.2 * vn(p / 70.0 + uSeed * 13.0);
  float speck = step(0.988, h21(floor(p * 0.8) + uSeed));
  b *= wander * (1.0 - speck);
  pk *= (0.84 + 0.16 * vn(p / 55.0 + uSeed * 7.0)) * (1.0 - speck);
  y *= 0.9 + 0.1 * vn(p / 40.0 + uSeed);
  k *= 0.94 * (1.0 - speck * 0.8);
  b = max(b * inside, rim * 0.95);
  pk *= inside; y *= inside; k *= inside;
  vec3 col = PAPER * (0.965 + 0.035 * vn(p / 2.5)) * (0.985 + 0.015 * vn(p / 110.0));
  col *= mix(vec3(1.0), YELLOW, y);
  col *= mix(vec3(1.0), PINK, pk);
  col *= mix(vec3(1.0), BLUE, b);
  col *= mix(vec3(1.0), NAVY, k);
  outColor = vec4(col, 1.0);
}`;

// a cyanotype: a contact print in Prussian blue, brushed on
const CYANOTYPE = `${PREFIX}
uniform float uEdge; // how far in the brushed coating stops, design px (0: coated to the edge)
const vec3 PAPER = vec3(0.961, 0.949, 0.914);
vec3 blues(float k) {
  vec3 c0 = vec3(0.945, 0.933, 0.894);
  vec3 c1 = vec3(0.667, 0.769, 0.855);
  vec3 c2 = vec3(0.204, 0.408, 0.659);
  vec3 c3 = vec3(0.086, 0.243, 0.486);
  vec3 c4 = vec3(0.039, 0.133, 0.298);
  if (k < 0.25) return mix(c0, c1, k / 0.25);
  if (k < 0.55) return mix(c1, c2, (k - 0.25) / 0.30);
  if (k < 0.80) return mix(c2, c3, (k - 0.55) / 0.25);
  return mix(c3, c4, (k - 0.80) / 0.20);
}
void main() {
  vec2 p = designPx();
  // a contact print is a little soft
  vec3 c = src(p) * 0.5 + (src(p + vec2(1.3, 0.0)) + src(p - vec2(1.3, 0.0)) + src(p + vec2(0.0, 1.3)) + src(p - vec2(0.0, 1.3))) * 0.125;
  float t = clamp((lum(c) - 0.05) / 0.88, 0.0, 1.0);
  // the emulsion lies in brush strokes across the sheet, and the paper has a tooth
  float streak = vn(vec2(p.x / 110.0, p.y / 3.5), uSeed);
  float tooth = vn(p / 1.6, uSeed + 7);
  float ink = clamp((1.0 - t) * (0.86 + 0.24 * streak) + (tooth - 0.5) * 0.06, 0.0, 1.0);
  float fibre = 0.97 + 0.05 * vn(p / 1.1, 3);
  vec3 col = blues(ink) * fibre;
  if (uEdge > 0.0) {
    vec2 D = designSize();
    float edge = min(min(p.x, D.x - p.x), min(p.y, D.y - p.y));
    float wob = vn(p / 70.0, uSeed + 11) * uEdge * 0.9 + vn(p / 9.0, uSeed + 13) * uEdge * 0.3 + vn(p / 2.2, uSeed + 17) * uEdge * 0.12;
    float coat = smoothstep(0.0, 2.5, edge - uEdge * 0.35 - wob);
    col = mix(PAPER * fibre, col, coat);
  }
  outColor = vec4(col, 1.0);
}`;

// a till receipt: a thermal printer's dots, blue-noise scattered
const RECEIPT = `${PREFIX}
uniform sampler2D uNoise; // blue-noise thresholds, 64 x 64
uniform float uDot;       // one printed dot, design px
const vec3 PAPER = vec3(0.973, 0.969, 0.949);
const vec3 INK = vec3(0.1, 0.1, 0.12);
void main() {
  vec2 p = designPx();
  vec2 D = designSize();
  vec2 cell = floor(p / uDot);
  vec2 centre = (cell + 0.5) * uDot;
  float t = smoothstep(0.2, 0.8, punch(centre, 7.0, 0.9));
  // blue noise: the dots scatter evenly, and the pattern holds still from frame to frame
  float threshold = texelFetch(uNoise, ivec2(mod(cell, 64.0)), 0).r;
  float on = step(threshold, 1.0 - t) * step(0.015, 1.0 - t);
  // a heated dot is round-cornered and bleeds into its neighbours
  vec2 f = fract(p / uDot) - 0.5;
  float aa = 0.9 / (uDot * uScale);
  float shape = smoothstep(0.7 + aa, 0.7 - aa, length(max(abs(f) - 0.2, 0.0)) + 0.36);
  // the print head is weaker in columns, the feed leaves faint bands, the ink is never quite black
  float head = 0.88 + 0.12 * vn(vec2(cell.x / 9.0, 0.5), uSeed);
  float feed = 0.97 + 0.03 * vn(vec2(0.5, p.y / 38.0), uSeed + 5);
  float dens = on * shape * head * (0.9 + 0.1 * hashI(ivec2(cell), uSeed + 9));
  vec3 paper = PAPER * (0.988 + 0.012 * vn(p / 3.0, 21)) * feed;
  // the roll curls a little toward its edges
  paper *= 0.965 + 0.035 * sin(3.14159 * clamp(p.x / D.x, 0.0, 1.0));
  outColor = vec4(mix(paper, INK, dens), 1.0);
}`;

// a thermal camera, in the iron palette
const THERMAL = `${PREFIX}
vec3 iron(float h) {
  if (h <= 0.000) return vec3(0.0157, 0.0000, 0.0706);
  if (h <= 0.180) return mix(vec3(0.0157, 0.0000, 0.0706), vec3(0.1569, 0.0000, 0.3922), (h - 0.000) / 0.180);
  if (h <= 0.360) return mix(vec3(0.1569, 0.0000, 0.3922), vec3(0.5098, 0.0000, 0.5882), (h - 0.180) / 0.180);
  if (h <= 0.520) return mix(vec3(0.5098, 0.0000, 0.5882), vec3(0.8235, 0.1176, 0.3529), (h - 0.360) / 0.160);
  if (h <= 0.660) return mix(vec3(0.8235, 0.1176, 0.3529), vec3(0.9608, 0.3529, 0.0784), (h - 0.520) / 0.140);
  if (h <= 0.800) return mix(vec3(0.9608, 0.3529, 0.0784), vec3(1.0000, 0.6667, 0.0000), (h - 0.660) / 0.140);
  if (h <= 0.920) return mix(vec3(1.0000, 0.6667, 0.0000), vec3(1.0000, 0.9020, 0.3529), (h - 0.800) / 0.120);
  if (h <= 1.000) return mix(vec3(1.0000, 0.9020, 0.3529), vec3(1.0000, 1.0000, 0.9412), (h - 0.920) / 0.080);
  return vec3(1.0000, 1.0000, 0.9412);
}
void main() {
  vec2 p = designPx();
  // a thermal sensor is soft: nine taps across a few pixels
  vec3 c = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) c += src(p + vec2(float(i), float(j)) * 2.5);
  c /= 9.0;
  // bright and warm reads hot, blue and dark cold
  float heat = smoothstep(0.2, 0.92, 0.6 * lum(c) + 0.4 * ((c.r - c.b) * 0.5 + 0.5));
  heat += (hashI(ivec2(p / 1.5), uFrame) - 0.5) * 0.035;
  vec2 q = p / designSize() - 0.5;
  outColor = vec4(iron(clamp(heat, 0.0, 1.0)) * (1.0 - 0.25 * dot(q, q)), 1.0);
}`;

// night vision: green phosphor, bloom, grain
const NIGHT = `${PREFIX}
uniform float uTube; // 0: a soft falloff; 1: the round field of a scope
vec3 phosphor(float g) {
  if (g < 0.35) return mix(vec3(0.0, 0.024, 0.008), vec3(0.071, 0.376, 0.141), g / 0.35);
  if (g < 0.7) return mix(vec3(0.071, 0.376, 0.141), vec3(0.376, 0.902, 0.471), (g - 0.35) / 0.35);
  return mix(vec3(0.376, 0.902, 0.471), vec3(0.882, 1.0, 0.882), clamp((g - 0.7) / 0.3, 0.0, 1.0));
}
float gain(vec2 p) { return pow(clamp(lum(src(p)) * 1.05, 0.0, 1.0), 1.35); }
void main() {
  vec2 p = designPx();
  vec2 D = designSize();
  float g = gain(p);
  // highlights bloom through the tube
  float bloom = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    vec2 d = vec2(cos(a), sin(a));
    bloom += max(gain(p + d * 7.0) - 0.6, 0.0) + max(gain(p + d * 16.0) - 0.6, 0.0);
  }
  g += bloom / 16.0 * 2.2;
  // it sparkles: the grain is new every frame
  g += (hashI(ivec2(p / 1.3), uFrame + uSeed * 7) - 0.5) * 0.28;
  vec3 col = phosphor(clamp(g, 0.0, 1.0)) * (0.92 + 0.08 * step(0.5, fract(p.y / 3.0)));
  vec2 q = (p - D * 0.5) / (D * 0.5);
  col *= 1.0 - 0.55 * smoothstep(0.55, 1.5, length(q));
  if (uTube > 0.5) {
    float r = length(p - D * 0.5) / (min(D.x, D.y) * 0.48);
    col *= smoothstep(1.0, 0.96, r);
  }
  outColor = vec4(col, 1.0);
}`;

// a CRT: curved glass, scanlines, an aperture grille
const CRT = `${PREFIX}
uniform float uLine; // the scanline's pitch, design px
void main() {
  vec2 p = designPx();
  vec2 D = designSize();
  vec2 q = p / D * 2.0 - 1.0;
  float r2 = dot(q, q);
  vec2 qc = q * (1.0 + 0.085 * r2) * 0.965;
  vec2 sp = (qc * 0.5 + 0.5) * D;
  // the glass's rounded corners, and black beyond it
  vec2 e = abs(qc);
  float glass = smoothstep(0.075, 0.06, length(max(e - vec2(0.93), 0.0))) * step(e.x, 1.0) * step(e.y, 1.0);
  vec3 c = src(sp) * 0.5 + (src(sp + vec2(0.9, 0.0)) + src(sp - vec2(0.9, 0.0))) * 0.25;
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    glow += src(sp + vec2(cos(a), sin(a)) * 6.0);
  }
  glow /= 8.0;
  float scan = 0.55 + 0.45 * pow(sin(3.14159 * sp.y / uLine), 2.0);
  int stripe = int(mod(floor(p.x / (uLine * 0.4)), 3.0));
  vec3 mask = vec3(0.62);
  mask[stripe] = 1.0;
  float roll = 1.0 + 0.035 * sin((sp.y / D.y - uTime * 0.35) * 6.28318);
  vec3 col = (c * scan * mask * 1.55 * roll + glow * 0.3) * (1.0 - 0.3 * r2);
  outColor = vec4(mix(vec3(0.02), col, glass), 1.0);
}`;

// VHS: tracking errors, chroma smear, dropouts
const VHS = `${PREFIX}
const vec3 YW = vec3(0.299, 0.587, 0.114);
void main() {
  vec2 p = designPx();
  vec2 D = designSize();
  float row = floor(p.y / 2.0);
  float shift = (hashI(ivec2(0, int(row)), uFrame) - 0.5) * 1.6;
  // a tracking error rolls slowly down the picture
  float bandY = mod(uTime * 60.0 + float(uSeed) * 97.0, D.y * 1.4) - D.y * 0.2;
  float band = smoothstep(18.0, 0.0, abs(p.y - bandY));
  shift += band * (10.0 * sin(p.y * 0.35 + uTime * 40.0) + 6.0 * hashI(ivec2(1, int(row)), uFrame));
  // the heads switch at the foot of the frame
  shift += smoothstep(D.y - 14.0, D.y, p.y) * 22.0;
  vec2 sp = p + vec2(shift, 0.0);
  vec3 a = src(sp);
  vec3 near = (src(sp - vec2(2.2, 0.0)) + a + src(sp + vec2(2.2, 0.0))) / 3.0;
  vec3 far = (src(sp - vec2(6.0, 0.0)) + a + src(sp + vec2(6.0, 0.0))) / 3.0;
  float Y = dot(near, YW);
  Y += (Y - dot(far, YW)) * 0.9;
  vec3 wide = vec3(0.0);
  for (int k = -3; k <= 3; k++) wide += src(sp + vec2(12.0 + float(k) * 5.5, 0.0));
  wide /= 7.0;
  float I = dot(wide, vec3(0.596, -0.274, -0.322));
  float Q = dot(wide, vec3(0.211, -0.523, 0.312));
  vec3 col = vec3(Y + 0.956 * I + 0.621 * Q, Y - 0.272 * I - 0.647 * Q, Y - 1.106 * I + 1.703 * Q);
  col += (hashI(ivec2(p / 1.2), uFrame) - 0.5) * 0.1;
  // dropouts: a white streak where the tape lost its oxide, a few a frame
  col += step(0.9993, hashI(ivec2(int(p.x / 40.0), int(row)), uFrame + 3)) * 0.8;
  col += band * step(0.9, hashI(ivec2(int(p.x / 7.0), int(row)), uFrame)) * 0.6;
  col = col * 0.9 + vec3(0.06, 0.04, 0.07);
  float m = dot(col, vec3(0.3333));
  vec2 v = p / D - 0.5;
  outColor = vec4(clamp(mix(vec3(m), col, 0.8) * (1.0 - 0.35 * dot(v, v)), 0.0, 1.0), 1.0);
}`;

// a quadtree: squares split where the picture has detail
const QUAD = `${PREFIX}
uniform float uRoot; // the largest square, design px
void main() {
  vec2 p = designPx();
  float S = uRoot;
  vec3 mean = src(p);
  for (int L = 0; L < 7; L++) {
    vec2 o = floor(p / S) * S;
    vec3 sum = vec3(0.0);
    vec3 sum2 = vec3(0.0);
    for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
      vec3 c = src(o + (vec2(float(i), float(j)) + 0.5) * S / 4.0);
      sum += c;
      sum2 += c * c;
    }
    mean = sum / 16.0;
    vec3 v = max(sum2 / 16.0 - mean * mean, 0.0);
    if (sqrt(max(v.r, max(v.g, v.b))) < 0.05 || S <= 5.0) break;
    S *= 0.5;
  }
  vec2 f = p - floor(p / S) * S;
  float edge = min(min(f.x, S - f.x), min(f.y, S - f.y)) * uScale;
  float line = S >= 6.0 ? smoothstep(1.0, 0.4, edge) : 0.0;
  outColor = vec4(mix(mean, mean * 0.55, line), 1.0);
}`;

const IRON = [[0, [4, 0, 18]], [.18, [40, 0, 100]], [0.36, [130, 0, 150]], [0.52, [210, 30, 90]], [0.66, [245, 90, 20]], [0.8, [255, 170, 0]], [0.92, [255, 230, 90]], [1, [255, 255, 240]]];

// A look prints on one part of the picture, the planet or the sky, and leaves the other as it is
// (over both, it washed the two together, and the code's own lines with them). The look's main()
// becomes lookMain(), and a new main() keeps what it printed to its side of the horizon: uPart, the
// horizon's circle in px with y up (centre, radius) and the side (1 the planet, -1 the sky, 0
// both), soft over a pixel or two either side.
export function onePart(frag) {
  return frag.replace('out vec4 outColor;', 'vec4 outColor;\nout vec4 lookOut;').replace('void main()', 'void lookMain()') + `
uniform vec4 uPart;
void main() {
  lookMain();
  float d = length(gl_FragCoord.xy - uPart.xy) - uPart.z;
  float m = uPart.w == 0.0 ? 1.0 : smoothstep(1.5, -1.5, d * uPart.w);
  lookOut = vec4(mix(texture(uSrc, gl_FragCoord.xy / uRes).rgb, outColor.rgb, m), 1.0);
}`;
}

// key: its name; frag: its shader (none for film); set: its uniforms; needs: the pictures it reads
// besides the world; overlay: drawn over it on the words' canvas (in CSS px, k: CSS px a design px);
// quilt: no shader here, the worlds draw it themselves (cells: the planet in cells of other worlds);
// whole: the whole picture, not one part (the screen and the tape bend and shift all of it, so a
// part would tear at the horizon)
export const LOOKS = [
  { key: 'film' },
  { key: 'ascii', frag: ASCII, set: { uCell: [13, 22] }, needs: ['glyphs'] },
  { key: 'code', frag: CODE, set: { uCell: [13, 22] }, needs: ['codegrid'] },
  { key: 'ink', frag: INK, set: { uDot: 3 }, needs: ['noise'] },
  { key: 'risograph', frag: RISO, riso: true },
  { key: 'cyanotype', frag: CYANOTYPE, set: { uEdge: 0 } },
  { key: 'receipt', frag: RECEIPT, set: { uDot: 2.5 }, needs: ['noise'] },
  { key: 'thermal', frag: THERMAL, overlay: thermalOverlay },
  { key: 'night vision', frag: NIGHT, set: { uTube: 0 } },
  { key: 'crt', frag: CRT, set: { uLine: 4 }, whole: true },
  { key: 'vhs', frag: VHS, overlay: vhsOverlay, whole: true },
  { key: 'quadtree', frag: QUAD, set: { uRoot: 256 } },
  { key: 'cells', quilt: true },
];

// the thermal camera's markings: a crosshair, the scale from hot to cold, the palette's name
function thermalOverlay(g, { W, H, k }) {
  g.save();
  g.strokeStyle = g.fillStyle = 'rgba(245,245,245,0.95)';
  g.lineWidth = Math.max(1, 2 * k);
  const cx = W / 2, cy = H / 2;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.beginPath(); g.moveTo(cx + dx * 8 * k, cy + dy * 8 * k); g.lineTo(cx + dx * 26 * k, cy + dy * 26 * k); g.stroke(); }
  const x = W * 0.09 + 0 * k, y0 = H * 0.46, y1 = H * 0.64, grad = g.createLinearGradient(0, y1, 0, y0);
  for (const [at, c] of IRON) grad.addColorStop(at, `rgb(${c.join(',')})`);
  g.fillStyle = grad;
  g.fillRect(x, y0, 14 * k, y1 - y0);
  g.strokeRect(x, y0, 14 * k, y1 - y0);
  g.fillStyle = 'rgba(245,245,245,0.95)';
  g.font = `500 ${Math.max(9, 15 * k)}px "JetBrains Mono", Consolas, monospace`;
  g.textAlign = 'center';
  g.fillText('HI', x + 7 * k, y0 - 10 * k);
  g.fillText('LO', x + 7 * k, y1 + 22 * k);
  g.textAlign = 'left';
  g.fillText('IR · IRON', x, y1 + 52 * k);
  g.restore();
}
// the VCR's: PLAY for the first seconds of the look, then the tape's counter
function vhsOverlay(g, { W, H, k, t }) {
  g.save();
  g.font = `700 ${Math.max(12, 30 * k)}px "JetBrains Mono", Consolas, monospace`;
  g.textBaseline = 'top';
  const say = (s, x, y) => { g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillText(s, x + 2 * k, y + 2 * k); g.fillStyle = 'rgba(242,242,242,0.97)'; g.fillText(s, x, y); };
  const x = W * 0.1, s = Math.floor(t);
  if (t < 3) say('PLAY ▶', x, H * 0.13);
  say(`SP 0:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, x, H * 0.7);
  g.restore();
}

// Blue noise: 64 x 64 thresholds whose dots scatter evenly (void and cluster), for the dithered
// looks. Worked out once, the first time one is used.
export function blueNoise(n = 64, seed = 5) {
  const N = n * n, sigma = 1.9, R = Math.ceil(sigma * 3.5), kernel = [];
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) kernel.push([x, y, Math.exp(-(x * x + y * y) / (2 * sigma * sigma))]);
  const on = new Uint8Array(N), energy = new Float64Array(N);
  const splat = (i, s) => { const x0 = i % n, y0 = (i / n) | 0; for (const [dx, dy, w] of kernel) energy[((y0 + dy + n) % n) * n + ((x0 + dx + n) % n)] += s * w; };
  const tightest = () => { let best = -1, e = -Infinity; for (let i = 0; i < N; i++) if (on[i] && energy[i] > e) { e = energy[i]; best = i; } return best; };
  const loosest = () => { let best = -1, e = Infinity; for (let i = 0; i < N; i++) if (!on[i] && energy[i] < e) { e = energy[i]; best = i; } return best; };
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const start = Math.floor(N / 10);
  for (let k = 0; k < start; ) { const i = Math.floor(r() * N); if (!on[i]) { on[i] = 1; splat(i, 1); k++; } }
  for (let k = 0; k < N; k++) { const a = tightest(); on[a] = 0; splat(a, -1); const b = loosest(); on[b] = 1; splat(b, 1); if (a === b) break; }
  const rank = new Int32Array(N), keepOn = on.slice(), keepE = energy.slice();
  for (let k = start - 1; k >= 0; k--) { const a = tightest(); on[a] = 0; splat(a, -1); rank[a] = k; }
  on.set(keepOn);
  energy.set(keepE);
  for (let k = start; k < N; k++) { const b = loosest(); on[b] = 1; splat(b, 1); rank[b] = k; }
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) out[i] = Math.round(((rank[i] + 0.5) / N) * 255);
  return out;
}
