// The spaghetti's kitchen (spaghetti.js): a floor slab floating in the theme's background, a wooden
// table on it and a chrome hand-crank pasta machine clamped to the table's front edge, raymarched.
// KITCHEN draws all of it but the crank once into a cache (colour and depth); CRANK draws the
// crank's arm and handle every frame over that, depth-tested against it. Linear light inside, a
// filmic shoulder and gamma 2.2 out. PASTA is what they and the pasta's own shaders share: the
// uniforms, the camera, the light and where things are. Units are about centimetres, y up; the
// machine's front faces +z. spaghetti.js keeps the same measurements.

export const PASTA = `
precision highp float;
precision highp int;
// the canvas (px); where the world's origin is on it (px from the top left, y down); px per unit;
// the crank's turn (radians about +x, 0: the arm straight up); a noodle's radius (units); the
// theme's background, rgb 0-1 (the void round the floor is this exactly)
struct PastaU { vec2 view; vec2 origin; float scale; float crank; float r; vec3 bg; };
uniform PastaU u;
// The camera: orthographic, from the front right and above (45 degrees round, 30 down): the
// screen's right, its up, and toward the eye.
const vec3 PASTA_R = vec3(0.70710678, 0.0, -0.70710678);
const vec3 PASTA_UP = vec3(-0.35355339, 0.86602540, -0.35355339);
const vec3 PASTA_EYE = vec3(0.61237244, 0.5, 0.61237244);
// The light, toward it: high, from the screen's left and a little in front
const vec3 PASTA_L = vec3(-0.35777088, 0.89442719, 0.26832816);
// a world point on the canvas (px), its depth (0 near, 1 far; +-200 units of the origin), and both
// as a clip position (GL's clip z runs -1 to 1: the depth buffer gets the same 0 to 1)
vec2 pasta_px(vec3 p) { return u.origin + u.scale * vec2(dot(p, PASTA_R), -dot(p, PASTA_UP)); }
float pasta_depth(vec3 p) { return clamp(0.5 - dot(p, PASTA_EYE) / 400.0, 0.0, 1.0); }
vec4 pasta_clip(vec3 p) {
  vec2 s = pasta_px(p);
  return vec4(s.x / u.view.x * 2.0 - 1.0, 1.0 - s.y / u.view.y * 2.0, pasta_depth(p) * 2.0 - 1.0, 1.0);
}
// the eye's ray through a canvas pixel starts here (depth 0) and runs along -PASTA_EYE
vec3 pasta_ray(vec2 px) {
  vec2 w = (px - u.origin) / u.scale;
  return PASTA_R * w.x - PASTA_UP * w.y + PASTA_EYE * 200.0;
}
// The floor: a slab, x and z -50 to 50, its top at y 0, 6 thick, floating in the theme's background
const float PASTA_FLOOR = 50.0;
const float PASTA_FLOOR_T = 6.0;
// The table: its top x -22 to 22, y 43 to 46, z -26 to 0 (the front edge); a 3 x 3 leg in each corner, 1 in
const vec3 PASTA_TABLE_MIN = vec3(-22.0, 43.0, -26.0);
const vec3 PASTA_TABLE_MAX = vec3(22.0, 46.0, 0.0);
// The way through: the sheet (16 wide) goes into the slot on top (x -8.5 to 8.5, z 2 to 4), down
// the plane z 3 between the rollers (their nip at y 56), and out under the body (y 46), x -8 to 8,
// as noodles
const float PASTA_FEED_Z = 3.0;
const float PASTA_NIP_Y = 56.0;
// The crank: on the right (+x) side, its shaft along x from here; the arm 6.5 long, turning in the
// y-z plane, a wooden handle at its end sticking out along +x
const vec3 PASTA_CRANK = vec3(11.0, 55.0, 3.0);
const float PASTA_ARM = 6.5;
`;

// what the crank's vertex and fragment shaders share: the box round it in its own frame, and back
const CRANK_FRAME = `
const vec3 PM_CRANK_LO = vec3(0.45, -1.1, -1.1);
const vec3 PM_CRANK_HI = vec3(6.32, PASTA_ARM + 0.8, 1.1);
vec3 pm_to_crank(vec3 p, float c, float s) {
  vec3 d = p - PASTA_CRANK;
  return vec3(d.x, c * d.y + s * d.z, -s * d.y + c * d.z);
}
vec3 pm_from_crank(vec3 q, float c, float s) { return vec3(q.x, c * q.y - s * q.z, s * q.y + c * q.z); }
`;

const LIB = `
#define saturate(x) clamp(x, 0.0, 1.0)
// ---------------------------------------------------------------- small things

float pm_h21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float pm_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(pm_h21(i), pm_h21(i + vec2(1, 0)), w.x), mix(pm_h21(i + vec2(0, 1)), pm_h21(i + vec2(1, 1)), w.x), w.y);
}
float pm_fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * pm_noise(p); p = vec2(p.x * 1.6 - p.y * 1.2, p.x * 1.2 + p.y * 1.6) + 7.3; a *= 0.5; }
  return s / 0.9375;
}
vec3 pm_lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
// linear light to the canvas: a filmic shoulder (Narkowicz' ACES fit), then gamma. A little less
// exposure on a light theme keeps the lit floor off its background
vec3 pm_display(vec3 c, vec3 bgS) {
  c *= mix(0.86, 0.6, dot(bgS, vec3(0.3, 0.59, 0.11)));
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

float pm_smax(float a, float b, float k) { float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float pm_smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float pm_box(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float pm_rbox(vec3 p, vec3 b, float r) { return pm_box(p, b - r) - r; }
float pm_box2(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
// a 2D outline (its distance d2) extruded h either side of w = 0, the edges rounded r
float pm_extrude(float d2, float w, float h, float r) {
  vec2 q = vec2(d2 + r, abs(w) - h + r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
// a cylinder: s the distance from its axis, a the way along it; radius r, half-length h, edges rounded e
float pm_cyl(float s, float a, float r, float h, float e) {
  vec2 q = vec2(s - r + e, abs(a) - h + e);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - e;
}
// a ray against a box: entry and exit
vec2 pm_slab(vec3 ro, vec3 rd, vec3 lo, vec3 hi) {
  vec3 inv = 1.0 / mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  vec3 a = (lo - ro) * inv, b = (hi - ro) * inv;
  vec3 n = min(a, b), f = max(a, b);
  return vec2(max(max(n.x, n.y), n.z), min(min(f.x, f.y), f.z));
}

// ---------------------------------------------------------------- where things are (PASTA has the rest)

const vec3 PM_FLOOR_LO = vec3(-PASTA_FLOOR, -PASTA_FLOOR_T, -PASTA_FLOOR);
const vec3 PM_FLOOR_HI = vec3(PASTA_FLOOR, 0.0, PASTA_FLOOR);
// everything raymarched (the table, the machine, its clamp, what's on the table) is in here
const vec3 PM_UP_LO = vec3(-22.6, -0.01, -26.6);
const vec3 PM_UP_HI = vec3(22.6, 60.3, 6.6);
// the thickness dial on the machine's front, and where it's set
const vec2 PM_DIAL = vec2(-6.6, 52.6);
const float PM_DIAL_SET = -0.55;
// the fontana on the table (x, z)
const vec2 PM_FONTANA = vec2(7.0, -19.5);

// materials
#define PM_TOP 1.0      // the table's top, oak
#define PM_FRAME 2.0    // its legs and aprons
#define PM_FLOUR 3.0    // the fontana's flour
#define PM_YOLK 4.0     // yolks
#define PM_WHITE 5.0    // egg white
#define PM_SHELL 6.0    // an egg's shell (brown out, white in)
#define PM_PIN 7.0      // the rolling pin, beech
#define PM_BADGE 9.0    // a brass badge on the machine's front
#define PM_CHROME 10.0  // the machine's body, polished
#define PM_PLATE 11.0   // its side plates, brushed
#define PM_ROLLER 12.0  // the rollers, satin
#define PM_KNOB 13.0    // the dial's knob, red enamel
#define PM_CUTTER 14.0  // the cutter's housing, chrome with a comb
#define PM_CLAMP 15.0   // the clamp, chrome
#define PM_SCREW 16.0   // screw heads
#define PM_THREAD 17.0  // the clamp's screw
#define PM_ARM 40.0     // the crank's arm (chrome)
#define PM_HANDLE 41.0  // its wooden handle
#define PM_FLOOR 100.0
#define PM_SIDE 101.0

// ---------------------------------------------------------------- the shapes

vec2 pm_table(vec3 p) {
  float top = pm_rbox(p - vec3(0.0, 44.5, -13.0), vec3(22.0, 1.5, 13.0), 0.45);
  // the legs (3 x 3, a touch tapered) and the aprons between them, folded onto the nearest
  float lz = p.z < -13.0 ? p.z + 23.5 : p.z + 2.5;
  float lx = abs(p.x) - 19.5;
  float hw = 1.5 - 0.25 * (1.0 - clamp(p.y / 43.0, 0.0, 1.0));
  float leg = pm_rbox(vec3(lx, p.y - 21.5, lz), vec3(hw, 21.5, hw), 0.22);
  float apF = pm_rbox(vec3(p.x, p.y - 41.25, lz), vec3(18.2, 1.75, 0.5), 0.12);
  float apS = pm_rbox(vec3(lx, p.y - 41.25, p.z + 13.0), vec3(0.5, 1.75, 9.3), 0.12);
  float frame = min(leg, min(apF, apS));
  return top < frame ? vec2(top, PM_TOP) : vec2(frame, PM_FRAME);
}

vec2 pm_machine(vec3 p) {
  // the side plates: a rounded outline in y-z (y 46..60, z -7..6), 0.9 thick, standing proud of the top
  float prof = pm_box2(vec2(p.y - 53.0, p.z + 0.5), vec2(4.8, 4.3)) - 2.2;
  vec2 r = vec2(pm_extrude(prof, abs(p.x) - 10.55, 0.45, 0.18), PM_PLATE);
  // the body between them: its top level with the rollers' (so they show), crowned a little, its
  // front swelling out round them
  float body = pm_rbox(p - vec3(0.0, 51.8, -0.25), vec3(10.2, 5.8, 6.25), 0.9);
  body = pm_smax(body, length(vec2(p.y - 52.5, p.z + 16.4)) - 22.0, 0.6);
  body = pm_smax(body, length(vec2(p.y - 27.6, p.z + 2.5)) - 30.0, 0.6);
  // the opening over the rollers (the slot, z 2..4, and a little either side) and their chamber
  float funnel = pm_box(p - vec3(0.0, 57.0, 3.07), vec3(8.5, 2.2, 1.67));
  float rz = p.z < PASTA_FEED_Z ? p.z - 2.0 : p.z - 4.0;
  float ry = p.y - PASTA_NIP_Y;
  float chamber = pm_cyl(length(vec2(ry, rz)), p.x, 1.12, 9.2, 0.0);
  // the mouth underneath, where the noodles come out
  float mouth = pm_box(p - vec3(0.0, 46.5, PASTA_FEED_Z), vec3(8.3, 0.85, 1.3));
  body = pm_smax(body, -min(min(funnel, chamber), mouth), 0.14);
  if (body < r.x) r = vec2(body, PM_CHROME);
  // the rollers, meeting at the nip
  float roll = pm_cyl(length(vec2(ry, rz)), p.x, 0.985, 9.1, 0.12);
  if (roll < r.x) r = vec2(roll, PM_ROLLER);
  // the cutter's housing across the bottom of the front
  float cut = pm_rbox(p - vec3(0.0, 47.75, 5.2), vec3(9.5, 1.75, 0.72), 0.32);
  if (cut < r.x) r = vec2(cut, PM_CUTTER);
  // the thickness dial: a knob with a pointer
  vec2 kq = p.xy - PM_DIAL;
  float knob = pm_cyl(length(kq), p.z - 5.6, 1.22, 0.3, 0.13);
  vec2 kd = vec2(sin(PM_DIAL_SET), cos(PM_DIAL_SET));
  vec2 kr = vec2(dot(kq, vec2(kd.y, -kd.x)), dot(kq, kd));
  knob = pm_smin(knob, pm_rbox(vec3(kr.x, kr.y - 0.5, p.z - 5.9), vec3(0.12, 0.62, 0.08), 0.05), 0.06);
  if (knob < r.x) r = vec2(knob, PM_KNOB);
  // a small brass badge on the front, blank
  float front = length(vec2(p.y - 52.5, p.z + 16.4)) - 22.0;
  float oval = (length((p.xy - vec2(3.6, 52.9)) / vec2(2.1, 0.9)) - 1.0) * 0.9;
  float badge = pm_smax(front - 0.08, oval, 0.05);
  if (badge < r.x) r = vec2(badge, PM_BADGE);
  // the crank's boss and the end of its shaft
  vec2 cq = p.yz - PASTA_CRANK.yz;
  float boss = pm_cyl(length(cq), p.x - 11.1, 1.3, 0.28, 0.12);
  boss = min(boss, pm_box(vec3(p.x - 11.5, cq), vec3(0.3, 0.32, 0.32)) - 0.03);
  if (boss < r.x) r = vec2(boss, PM_CHROME);
  // screws: four in each side plate, one in each end of the cutter
  vec3 sq = vec3(abs(p.x) - 11.0, abs(p.y - 53.0) - 5.4, abs(p.z + 0.5) - 5.15);
  float screw = pm_cyl(length(sq.yz), sq.x, 0.4, 0.12, 0.1);
  vec3 cs = vec3(abs(p.x) - 8.85, p.y - 47.75, p.z - 5.87);
  screw = min(screw, pm_cyl(length(cs.xy), cs.z, 0.32, 0.1, 0.08));
  if (screw < r.x) r = vec2(screw, PM_SCREW);
  return r;
}

// the C-clamp: down from under the machine in front of the table's edge, a jaw back under the top,
// the screw up through it to a pad on the underside, a T-handle at its foot
vec2 pm_clamp(vec3 p) {
  vec3 q = p - vec3(-10.1, 0.0, 0.0);
  float bar = pm_rbox(q - vec3(0.0, 43.1, 0.8), vec3(0.7, 2.9, 0.5), 0.2);
  float jaw = pm_rbox(q - vec3(0.0, 40.75, -0.15), vec3(0.7, 0.55, 1.45), 0.2);
  float flange = pm_rbox(q - vec3(0.0, 45.8, 1.0), vec3(0.85, 0.2, 1.0), 0.08);
  vec2 r = vec2(min(pm_smin(bar, jaw, 0.35), flange), PM_CLAMP);
  float sr = length(q.xz - vec2(0.0, -0.5));
  float screw = pm_cyl(sr, q.y - 39.7, 0.27, 3.05, 0.05);
  if (screw < r.x) r = vec2(screw, PM_THREAD);
  float pad = pm_cyl(sr, q.y - 42.83, 0.65, 0.15, 0.07);
  vec3 hq = q - vec3(0.0, 36.75, -0.5);
  vec2 dir = vec2(0.906, 0.423);
  float along = dot(hq.xz, dir), across = dot(hq.xz, vec2(-dir.y, dir.x));
  float tee = length(vec3(max(abs(along) - 1.7, 0.0), hq.y, across)) - 0.17;
  tee = min(tee, length(vec3(abs(along) - 1.85, hq.y, across)) - 0.34);
  tee = pm_smin(tee, pm_cyl(length(hq.xz), hq.y, 0.42, 0.28, 0.1), 0.1);
  float rest = min(pad, tee);
  if (rest < r.x) r = vec2(rest, PM_CLAMP);
  return r;
}

// what's on the table: a fontana (a mound of flour, two eggs broken into its well), a whole egg and
// half a shell beside it, a rolling pin
float pm_ellipsoid(vec3 p, vec3 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
vec2 pm_fontana(vec3 p) {
  vec2 fq = p.xz - PM_FONTANA;
  float fr = length(fq);
  float H = 1.9 * (1.0 - smoothstep(0.8, 5.0, fr)) - 1.25 * (1.0 - smoothstep(0.5, 2.1, fr)) - 0.04;
  H += 0.1 * (pm_noise(fq * 1.4) - 0.5) * (1.0 - smoothstep(3.0, 5.0, fr));
  // a height field: its height over, by its steepest slope (about 1.5)
  vec2 r = vec2((p.y - PASTA_TABLE_MAX.y - H) * 0.55, PM_FLOUR);
  float white = max(p.y - 46.74, fr - 1.45);
  if (white < r.x) r = vec2(white, PM_WHITE);
  float yolk = min(pm_ellipsoid(p - vec3(PM_FONTANA.x - 0.45, 46.78, PM_FONTANA.y - 0.3), vec3(0.62, 0.42, 0.62)),
                   pm_ellipsoid(p - vec3(PM_FONTANA.x + 0.65, 46.76, PM_FONTANA.y + 0.55), vec3(0.6, 0.4, 0.6)));
  if (yolk < r.x) r = vec2(yolk, PM_YOLK);
  // the whole egg on its side, the half shell open side up
  vec3 eq = p - vec3(18.0, 46.84, -22.6);
  eq.xz = vec2(dot(eq.xz, vec2(0.866, 0.5)), dot(eq.xz, vec2(-0.5, 0.866)));
  float egg = pm_ellipsoid(eq, vec3(1.15, 0.85, 0.85));
  vec3 sq = p - vec3(14.4, 46.8, -24.3);
  float rim = 0.06 * sin(atan(sq.z, sq.x) * 7.0) + 0.05;
  float shell = max(abs(pm_ellipsoid(sq, vec3(0.85, 0.8, 0.85))) - 0.045, sq.y - rim);
  egg = min(egg, shell);
  if (egg < r.x) r = vec2(egg, PM_SHELL);
  return r;
}
vec2 pm_pin(vec3 p) {
  vec3 q = p - vec3(17.2, 47.05, -12.5);
  vec2 ax = vec2(0.423, -0.906);   // 65 degrees round from x
  float a = dot(q.xz, ax), s = length(vec2(dot(q.xz, vec2(-ax.y, ax.x)), q.y));
  float barrel = pm_cyl(s, a, 1.05, 5.0, 0.25);
  float handle = pm_cyl(s, abs(a) - 6.35, 0.5 + 0.08 * smoothstep(0.9, -0.9, abs(a) - 6.35), 1.15, 0.22);
  return vec2(pm_smin(barrel, handle, 0.25), PM_PIN);
}

// the static scene: distance and material. The machine and the clamp hide behind tight boxes: far
// off, a box's distance stands in for theirs, blending into it nearer so soft shadows and AO see no
// seam; the table, mostly air inside its box, is cheap enough always (its box would cast a shadow)
vec2 pm_bounded(vec2 r, float b, vec2 m) {
  m.x = mix(m.x, b, smoothstep(1.0, 2.5, b));
  return m.x < r.x ? m : r;
}
vec2 pm_map(vec3 p) {
  vec2 r = pm_table(p);
  float b = pm_box(p - vec3(0.2, 53.0, -0.5), vec3(11.65, 7.0, 6.52));
  if (b < r.x) r = b > 2.5 ? vec2(b, 0.0) : pm_bounded(r, b, pm_machine(p));
  b = pm_box(p - vec3(-10.1, 41.2, -0.1), vec3(2.1, 4.95, 2.3));
  if (b < r.x) r = b > 2.5 ? vec2(b, 0.0) : pm_bounded(r, b, pm_clamp(p));
  b = pm_box(p - vec3(10.5, 47.0, -19.75), vec3(9.0, 1.1, 5.75));
  if (b < r.x) r = b > 2.5 ? vec2(b, 0.0) : pm_bounded(r, b, pm_fontana(p));
  b = pm_box(p - vec3(17.2, 47.05, -12.5), vec3(3.6, 1.1, 7.3));
  if (b < r.x) r = b > 2.5 ? vec2(b, 0.0) : pm_bounded(r, b, pm_pin(p));
  return r;
}

vec3 pm_normal(vec3 p) {
  vec3 n = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e * pm_map(p + e * 0.0025).x;
  }
  return normalize(n);
}

// soft shadow toward the light from ro, between t0 and t1: iq's, the nearest pass between two steps
// estimated where their spheres meet (s the step between them, which needn't be the last distance)
float pm_shadow(vec3 ro, float t0, float t1, float k, int steps, float smin) {
  float res = 1.0, t = t0, ph = 1e5, s = 1e5;
  for (int i = 0; i < steps; i++) {
    float h = pm_map(ro + PASTA_L * t).x;
    if (h < 0.0005) return 0.0;
    // y back from here to the nearest pass, d its distance; outside the step, the step's ends
    float y = (h * h - ph * ph + s * s) / (2.0 * s);
    float d = y > s ? ph : (y < 0.0 ? h : sqrt(max(h * h - y * y, 0.0)));
    res = min(res, k * d / max(t - clamp(y, 0.0, s), 1e-4));
    ph = h;
    s = clamp(h, smin, 2.0);
    t += s;
    if (res < 0.002 || t > t1) break;
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

float pm_ao(vec3 p, vec3 n, float s, int taps) {
  float occ = 0.0, w = 1.0, dh = 0.96 / float(taps);
  for (int i = 0; i < taps; i++) {
    float h = s * (0.04 + dh * float(i));
    vec3 q = p + n * h;
    float d = min(pm_map(q).x, q.y);
    occ += (h - d) * w;
    w *= 1.0 - 1.4 * dh;
  }
  return clamp(1.0 - 1.1 * occ / s, 0.0, 1.0);
}

// ---------------------------------------------------------------- light

const vec3 PM_SUN = vec3(2.6, 2.44, 2.18);
vec3 pm_sky(vec3 n) {
  return mix(vec3(0.14, 0.12, 0.10), vec3(0.40, 0.43, 0.48), 0.5 + 0.5 * n.y);
}
// the room the chrome sees: pale walls and ceiling, brighter toward the window (where the light
// comes from), a dimmer softbox behind on the right; below the horizon a dark band of counters, then
// a floor lit toward the window, with a little of the void the diorama floats in
vec3 pm_env(vec3 d, float rough, vec3 voidL) {
  float w = 0.03 + rough * 0.7;
  float side = 0.5 + 0.5 * dot(normalize(d.xz + 1e-5), vec2(-0.8, 0.6));
  float above = smoothstep(-w, w, d.y);
  vec3 room = mix(vec3(0.40, 0.38, 0.35), vec3(0.82, 0.82, 0.83), smoothstep(0.0, 0.7, d.y)) * (0.7 + 0.4 * side);
  vec3 T = normalize(vec3(PASTA_L.z, 0.0, -PASTA_L.x));
  vec3 B = cross(PASTA_L, T);
  float c = dot(d, PASTA_L);
  if (c > 0.05) {
    vec2 g = vec2(dot(d, T), dot(d, B)) / c;
    float soft = 0.03 + rough * 1.1;
    vec2 e = abs(g) - vec2(0.62, 0.48);
    float pane = smoothstep(soft, -soft, max(e.x, e.y));
    float mull = smoothstep(0.03 + soft, soft * 0.5, min(abs(g.x), abs(g.y))) * (1.0 - rough * 2.0);
    room += vec3(4.2, 4.1, 3.9) * pane * (1.0 - 0.85 * clamp(mull, 0.0, 1.0));
  }
  vec3 sb = normalize(vec3(0.75, 0.42, -0.5));
  room += vec3(0.9, 0.95, 1.0) * smoothstep(0.86 - rough * 0.5, 0.95, dot(d, sb));
  vec3 ground = mix(vec3(0.44, 0.40, 0.35), voidL, 0.3) * (0.3 + 1.0 * side);
  ground *= mix(1.0, 0.28, smoothstep(-0.26 - w, -0.24 + w, d.y));
  return mix(ground, room, above);
}

float pm_ggx(vec3 n, vec3 v, vec3 l, float rough) {
  vec3 h = normalize(v + l);
  float a = max(rough * rough, 0.003), a2 = a * a;
  float nh = max(dot(n, h), 0.0), nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-3);
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * dd * dd);
  float k = a * 0.5;
  float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  return D * G / (4.0 * nv);
}

struct PmMat {
  vec3 alb;     // albedo (metals: their reflectance)
  float metal, rough, f0;
  vec3 n;       // the shading normal
  vec3 tang;    // brushing direction (0 for none)
  float polish; // 1: a mirror, its reflection traced
};

// oak: g.x along the grain, g.y across, in units
vec3 pm_wood(vec2 g, float seed, float pw, vec3 light, vec3 dark) {
  float warp = pm_fbm(vec2(g.x * 0.045, g.y * 0.32) + seed * 13.1);
  float rings = g.y * 1.25 + warp * 3.2 + g.x * 0.01;
  float fr = fract(rings);
  float late = smoothstep(0.45, 0.92, fr) * (1.0 - smoothstep(0.92, 1.0, fr));
  float vis = smoothstep(2.0, 4.5, 0.8 / pw);
  float streak = pm_noise(vec2(g.x * 0.35, g.y * 5.5) + seed * 3.0);
  float vs = smoothstep(1.2, 2.5, 0.18 / pw);
  float t = clamp(late * 0.45 * vis + (warp - 0.5) * 0.5 + 0.22, 0.0, 1.0);
  vec3 c = mix(light, dark, t);
  c *= 1.0 + (streak - 0.5) * 0.1 * vs;
  return pm_lin(c);
}

PmMat pm_material(float id, vec3 p, vec3 n, float pw) {
  PmMat m;
  m.alb = vec3(0.5); m.metal = 0.0; m.rough = 0.5; m.f0 = 0.04; m.n = n; m.tang = vec3(0.0); m.polish = 0.0;
  vec3 oakL = vec3(0.76, 0.61, 0.44), oakD = vec3(0.55, 0.40, 0.27);
  if (id < PM_TOP + 0.5) {
    // planks along x, 6.5 wide; end grain on the right; oiled
    float k = floor(-p.z / 6.5);
    vec2 g = abs(n.x) > 0.6 ? vec2(p.y * 4.0, length(vec2(p.y - 41.0, p.z + 6.5 * k + 3.25)) * 1.4)
                            : vec2(p.x + k * 17.0, p.z + (abs(n.y) > 0.6 ? 0.0 : p.y * 0.5));
    m.alb = pm_wood(g, k, pw, oakL, oakD);
    if (abs(n.x) > 0.6) m.alb *= 0.8;
    float seam = abs(fract(-p.z / 6.5 + 0.5) - 0.5) * 6.5;
    float sw = 1.0 - smoothstep(0.03, 0.03 + pw, seam);
    m.alb *= 1.0 - 0.65 * sw * step(0.3, abs(n.y) + abs(n.x)) * step(-25.9, p.z) * step(p.z, -0.1);
    m.rough = 0.38;
    // flour dusted round the fontana, and where the dough was rolled
    if (n.y > 0.5) {
      float near = max(1.0 - smoothstep(4.5, 8.5, length(p.xz - PM_FONTANA)),
                       0.5 * (1.0 - smoothstep(2.0, 7.0, length((p.xz - vec2(16.0, -12.0)) * vec2(1.0, 0.6)))));
      float dust = smoothstep(0.45, 0.8, pm_fbm(p.xz * 0.9) + near * 0.55) * near;
      m.alb = mix(m.alb, pm_lin(vec3(0.86, 0.84, 0.79)), dust * 0.8);
      m.rough = mix(m.rough, 0.9, dust);
    }
  } else if (id < PM_FRAME + 0.5) {
    float lz = p.z < -13.0 ? p.z + 23.5 : p.z + 2.5;
    bool leg = abs(abs(p.x) - 19.5) < 1.55 && abs(lz) < 1.55;
    float across = abs(n.x) > abs(n.z) ? p.z : p.x;
    vec2 g = leg ? vec2(p.y, across * 1.3 + p.x * 0.7) : (abs(abs(p.x) - 19.5) < 0.6 ? vec2(p.z, p.y) : vec2(p.x, p.y + p.z));
    m.alb = pm_wood(g, leg ? 5.0 + sign(p.x) + sign(lz) * 2.0 : 9.0, pw, oakL, oakD) * 0.92;
    m.rough = 0.45;
  } else if (id < PM_FLOUR + 0.5) {
    float sp = pm_noise(p.xz * 9.0 + p.y * 3.0);
    m.alb = pm_lin(vec3(0.84, 0.82, 0.77) * (0.95 + 0.05 * sp)); m.rough = 0.95;
  } else if (id < PM_YOLK + 0.5) {
    m.alb = pm_lin(vec3(0.98, 0.62, 0.10)); m.rough = 0.06; m.f0 = 0.05;
  } else if (id < PM_WHITE + 0.5) {
    m.alb = pm_lin(vec3(0.90, 0.88, 0.80)); m.rough = 0.05; m.f0 = 0.05;
  } else if (id < PM_SHELL + 0.5) {
    // brown and speckled outside, white inside the half shell
    vec3 sq = p - vec3(14.4, 46.8, -24.3);
    float inside = (length(sq / vec3(0.85, 0.8, 0.85)) < 0.97 && sq.y < 0.2) ? 1.0 : 0.0;
    float speck = smoothstep(0.78, 0.86, pm_noise(vec2(p.x * 14.0 + p.y * 9.0, p.z * 14.0 - p.y * 9.0))) * smoothstep(1.5, 3.0, 0.07 / pw);
    m.alb = pm_lin(mix(vec3(0.86, 0.68, 0.52) * (1.0 - 0.2 * speck), vec3(0.94, 0.92, 0.88), inside));
    m.rough = 0.55;
  } else if (id < PM_PIN + 0.5) {
    vec3 q = p - vec3(17.2, 47.05, -12.5);
    float a = dot(q.xz, vec2(0.423, -0.906));
    m.alb = pm_wood(vec2(a * 1.2, q.y * 3.0 + q.z), 31.0, pw, vec3(0.86, 0.72, 0.54), vec3(0.72, 0.56, 0.38));
    m.rough = 0.4;
  } else if (id < PM_BADGE + 0.5) {
    // brass: a polished rim, a brushed field with a few engraved lines
    float e = length((p.xy - vec2(3.6, 52.9)) / vec2(2.1, 0.9));
    float field = smoothstep(0.86, 0.8, e);
    float lines = (1.0 - smoothstep(0.03, 0.03 + pw, abs(fract((p.y - 52.9) / 0.32 + 0.5) - 0.5) * 0.32)) * step(abs(p.y - 52.9), 0.45) * step(abs(p.x - 3.6), 1.35);
    m.alb = mix(vec3(0.92, 0.74, 0.42), vec3(0.80, 0.62, 0.34), field) * (1.0 - 0.6 * lines * smoothstep(1.5, 3.0, 0.32 / pw));
    m.metal = 1.0; m.rough = mix(0.08, 0.3, field);
  } else if (id < PM_CHROME + 0.5) {
    m.alb = vec3(0.80, 0.81, 0.83); m.metal = 1.0; m.rough = 0.04; m.polish = 1.0;
    // the dial's scale on the front: ticks engraved and filled black
    vec2 kq = p.xy - PM_DIAL;
    float kr = length(kq);
    if (n.z > 0.5 && kr < 2.4) {
      float ang = atan(kq.x, kq.y);
      float st = 0.5235988;  // 30 degrees
      float j = clamp(round(ang / st), -4.0, 4.0);
      float dt = abs(ang - j * st) * kr;
      float outer = mod(abs(j), 2.0) < 0.5 ? 2.15 : 1.85;
      float tick = (1.0 - smoothstep(0.045, 0.045 + pw, dt)) * smoothstep(1.45, 1.45 + pw, kr) * (1.0 - smoothstep(outer, outer + pw, kr));
      m.alb = mix(m.alb, vec3(0.02), tick); m.rough = mix(m.rough, 0.5, tick); m.metal = 1.0 - tick;
    }
  } else if (id < PM_PLATE + 0.5) {
    m.alb = vec3(0.70, 0.71, 0.73); m.metal = 1.0; m.rough = 0.2;
    m.tang = normalize(vec3(0.0, 0.0, 1.0) - n * n.z + 1e-4);
    float br = pm_noise(vec2(p.z * 0.4, p.y * 9.0));
    m.alb *= 0.93 + 0.12 * br * smoothstep(1.0, 2.0, 0.11 / pw);
  } else if (id < PM_ROLLER + 0.5) {
    m.alb = vec3(0.66, 0.67, 0.69); m.metal = 1.0; m.rough = 0.26;
    m.tang = normalize(cross(vec3(1.0, 0.0, 0.0), n) + 1e-4);
  } else if (id < PM_KNOB + 0.5) {
    m.alb = pm_lin(vec3(0.72, 0.09, 0.07)); m.rough = 0.16; m.f0 = 0.05;
    // knurled round its rim
    vec2 kq = p.xy - PM_DIAL;
    if (abs(n.z) < 0.6) {
      float a = atan(kq.y, kq.x);
      float fade = smoothstep(1.5, 3.0, 0.27 / pw);
      vec3 t = normalize(vec3(-kq.y, kq.x, 0.0));
      m.n = normalize(n + t * 0.35 * sin(a * 28.0) * fade);
    }
  } else if (id < PM_CUTTER + 0.5) {
    m.alb = vec3(0.79, 0.80, 0.82); m.metal = 1.0; m.rough = 0.05; m.polish = 1.0;
    // the comb's slots down its face
    if (n.z > 0.7 && abs(p.x) < 8.1) {
      float gx = fract(p.x / 0.6 + 0.5) - 0.5;
      float fade = smoothstep(2.5, 5.0, 0.6 / pw) * smoothstep(46.35, 46.6, p.y) * (1.0 - smoothstep(48.9, 49.15, p.y));
      float slot = (1.0 - smoothstep(0.13, 0.13 + pw / 0.6, abs(gx))) * fade;
      m.alb *= 1.0 - 0.85 * slot;
      m.rough = mix(m.rough, 0.4, slot);
      m.n = normalize(n + vec3(sign(gx) * 0.5 * slot, 0.0, 0.0));
    }
  } else if (id < PM_CLAMP + 0.5) {
    m.alb = vec3(0.76, 0.77, 0.79); m.metal = 1.0; m.rough = 0.07; m.polish = 1.0;
  } else if (id < PM_SCREW + 0.5) {
    m.alb = vec3(0.78, 0.79, 0.81); m.metal = 1.0; m.rough = 0.12;
    // a slot across the head, each turned its own way
    vec3 a = abs(n.x) > 0.5 ? vec3(0.0, p.y, p.z) : vec3(p.x, p.y, 0.0);
    vec2 c = abs(n.x) > 0.5 ? vec2(53.0 + sign(p.y - 53.0) * 5.4, -0.5 + sign(p.z + 0.5) * 5.15) : vec2(sign(p.x) * 8.85, 47.75);
    vec2 l = abs(n.x) > 0.5 ? a.yz - c : a.xy - c;
    float ang = pm_h21(c) * 3.14159;
    float s = abs(dot(l, vec2(cos(ang), sin(ang))));
    float slot = (1.0 - smoothstep(0.06, 0.06 + pw, s)) * step(length(l), 0.36);
    m.alb *= 1.0 - 0.8 * slot;
  } else if (id < PM_THREAD + 0.5) {
    m.alb = vec3(0.70, 0.71, 0.72); m.metal = 1.0; m.rough = 0.22;
    float fade = smoothstep(1.5, 3.0, 0.2 / pw);
    m.n = normalize(n + vec3(0.0, 0.6 * sin(p.y * 31.4) * fade, 0.0));
  } else if (id < PM_ARM + 0.5) {
    // satin: a mirror-flat arm would show the table through itself
    m.alb = vec3(0.82, 0.83, 0.85); m.metal = 1.0; m.rough = 0.2;
  } else if (id < PM_HANDLE + 0.5) {
    // turned beech, varnished: the grain runs along the handle (x)
    m.alb = pm_wood(vec2(p.x * 1.0, (p.y + p.z) * 2.0), 21.0, pw, vec3(0.58, 0.38, 0.24), vec3(0.38, 0.22, 0.13));
    m.rough = 0.22; m.f0 = 0.05;
  }
  return m;
}

// lit: sh the light's shadow, ao the ambient's, refl what the surface mirrors
vec3 pm_light(PmMat m, vec3 v, float sh, float ao, vec3 refl) {
  vec3 N = m.n;
  float ndl = max(dot(N, PASTA_L), 0.0);
  float ndv = max(dot(N, v), 1e-3);
  vec3 F0 = mix(vec3(m.f0), m.alb, m.metal);
  vec3 F = F0 + (max(vec3(1.0 - m.rough), F0) - F0) * pow(1.0 - ndv, 5.0);
  vec3 col = m.alb * (1.0 - m.metal) * (PM_SUN * ndl * sh + pm_sky(N) * ao) * (1.0 - F);
  col += F * refl;
  if (m.rough > 0.1) col += PM_SUN * (sh * ndl > 0.0 ? 1.0 : 0.0) * sh * pm_ggx(N, v, PASTA_L, m.rough) * F;
  return col;
}

// what a rough or brushed surface sees of the room (brushing smears it along tang)
vec3 pm_env_rough(PmMat m, vec3 r, vec3 voidL) {
  if (dot(m.tang, m.tang) < 0.5) return pm_env(r, m.rough, voidL);
  vec3 a = normalize(r + m.tang * 0.35), b = normalize(r - m.tang * 0.35);
  return (pm_env(r, m.rough, voidL) * 2.0 + pm_env(a, m.rough, voidL) + pm_env(b, m.rough, voidL)) * 0.25;
}

// ---------------------------------------------------------------- the floor

// the tiles: 12.5 square, a calm checker of oat and warm stone, grouted, with a hint of the theme
vec3 pm_floor_alb(vec2 xz, float pw, vec3 bgS, out vec3 n, out float grout) {
  const float S = 12.5;
  vec2 g = xz / S;
  vec2 cell = floor(g);
  vec2 f = (g - cell) * S;
  vec2 e = min(f, S - f);
  // a joint round the slab's edge too
  float de = min(min(e.x, e.y), PASTA_FLOOR - max(abs(xz.x), abs(xz.y)) + 0.1);
  float chk = mod(abs(cell.x + cell.y), 2.0);
  float h = pm_h21(cell + 3.7);
  vec3 tile = mix(vec3(0.64, 0.60, 0.53), vec3(0.52, 0.48, 0.42), chk) * (0.96 + 0.07 * h);
  tile *= 0.95 + 0.09 * pm_fbm(xz * 0.21 + cell * 5.1);
  tile = mix(tile, bgS, 0.06);
  float fw = pw * 1.6;
  grout = 1.0 - smoothstep(0.17 - fw * 0.5, 0.17 + fw, de);
  vec3 c = mix(tile, vec3(0.58, 0.55, 0.51), grout);
  // the tiles' edges round down into the grout
  float bev = (1.0 - smoothstep(0.17, 0.55, de)) * (1.0 - grout) * smoothstep(1.0, 2.5, 0.4 / pw);
  vec2 dir = e.x < e.y ? vec2(f.x < S * 0.5 ? -1.0 : 1.0, 0.0) : vec2(0.0, f.y < S * 0.5 ? -1.0 : 1.0);
  n = normalize(vec3(dir.x * bev * 0.5, 1.0, dir.y * bev * 0.5));
  return pm_lin(c);
}

// how much of the sky a floor point sees past a rectangle above it (its form factor, xz, h above)
float pm_ff(float a, float b) {
  float sa = sqrt(1.0 + a * a), sb = sqrt(1.0 + b * b);
  return (a / sa * atan(b / sa) + b / sb * atan(a / sb)) * 0.15915494;
}
float pm_rect_occ(vec2 p, float h, vec2 lo, vec2 hi) {
  vec2 A = (lo - p) / h, B = (hi - p) / h;
  return pm_ff(B.x, B.y) - pm_ff(A.x, B.y) - pm_ff(B.x, A.y) + pm_ff(A.x, A.y);
}

vec3 pm_floor_shade(vec3 p, vec3 v, float pw, vec3 voidL, vec3 bgS, bool full, bool lite) {
  vec3 n; float grout;
  vec3 alb = pm_floor_alb(p.xz, pw, bgS, n, grout);
  float sh = 1.0, ao = 1.0 - 1.5 * pm_rect_occ(p.xz, 43.0, vec2(-22.0, -26.0), vec2(22.0, 0.0));
  if (full) {
    vec2 tb = pm_slab(p, PASTA_L, PM_UP_LO, PM_UP_HI);
    if (tb.y > max(tb.x, 0.0)) sh = pm_shadow(p + vec3(0.0, 0.01, 0.0), max(tb.x, 0.05), tb.y, 5.0, lite ? 20 : 48, lite ? 0.15 : 0.05);
    if (pm_map(p).x < 6.0) ao *= pm_ao(p, vec3(0.0, 1.0, 0.0), 3.0, lite ? 2 : 5);
  }
  PmMat m; m.alb = alb; m.metal = 0.0; m.rough = 0.32; m.f0 = 0.04; m.n = n; m.tang = vec3(0.0); m.polish = 0.0;
  vec3 refl = pm_env(reflect(-v, n), 0.32, voidL) * ao * (1.0 - grout) * 0.8;
  return pm_light(m, v, sh, ao, refl);
}
`;

// what only the cache's pass needs: the slab's sides, reflections, the samples
const SCENE = `
// the slab's cut sides: the tiles (a terracotta body under the glaze), their mortar bed, concrete
vec3 pm_side_shade(vec3 p, vec3 n, vec3 v, float pw, vec3 voidL, vec3 bgS) {
  float fw = pw * 1.3;
  float along = abs(n.x) > 0.5 ? p.z : p.x;
  vec3 tn; float grout;
  vec3 glaze = pm_floor_alb(abs(n.x) > 0.5 ? vec2(PASTA_FLOOR - 0.3, p.z) : vec2(p.x, PASTA_FLOOR - 0.3), pw, bgS, tn, grout);
  vec3 body = pm_lin(mix(vec3(0.74, 0.50, 0.38), bgS, 0.08));
  vec3 bed = pm_lin(vec3(0.60, 0.58, 0.54));
  float agg = pm_noise(vec2(along, p.y) * 3.1) * pm_noise(vec2(along, p.y) * 1.3 + 4.0);
  vec3 conc = pm_lin(mix(vec3(0.50, 0.48, 0.45), bgS, 0.12) * (0.92 + 0.2 * agg * smoothstep(1.0, 2.0, 0.3 / pw)));
  vec3 c = mix(conc, bed, smoothstep(-1.6 - fw, -1.6 + fw, p.y));
  c = mix(c, body * (grout > 0.5 ? 0.75 : 1.0), smoothstep(-0.75 - fw, -0.75 + fw, p.y));
  c = mix(c, glaze, smoothstep(-0.18 - fw, -0.18 + fw, p.y));
  PmMat m; m.alb = c; m.metal = 0.0; m.rough = 0.7; m.f0 = 0.03; m.n = n; m.tang = vec3(0.0); m.polish = 0.0;
  return pm_light(m, v, 1.0, 1.0, pm_env(reflect(-v, n), 0.7, voidL) * 0.5);
}

// ---------------------------------------------------------------- reflections

// a hit seen in a mirror, shaded simply (its shadow and AO roughly)
vec3 pm_shade_simple(vec3 p, float id, vec3 v, float pw, vec3 voidL, bool lite) {
  vec3 n = pm_normal(p);
  PmMat m = pm_material(id, p, n, pw);
  float occ = clamp(pm_map(p + n * 0.6).x / 0.6, 0.0, 1.0);
  float sh = dot(n, PASTA_L) <= 0.0 ? 0.0 : (lite ? 1.0 : pm_shadow(p + n * 0.02, 0.05, 20.0, 6.0, 16, 0.05));
  vec3 r = reflect(-v, m.n);
  return pm_light(m, v, sh, occ, pm_env(r, max(m.rough, 0.15), voidL) * occ);
}

vec3 pm_reflection(vec3 ro, vec3 rd, float pw, vec3 voidL, vec3 bgS, bool lite) {
  vec2 ts = pm_slab(ro, rd, PM_FLOOR_LO, PM_FLOOR_HI);
  float tS = (ts.x <= ts.y && ts.y > 0.0) ? max(ts.x, 0.0) : 1e9;
  vec2 tb = pm_slab(ro, rd, PM_UP_LO, PM_UP_HI);
  if (tb.x <= tb.y && tb.y > 0.0) {
    float t = max(tb.x, 0.0), t1 = min(tb.y, tS);
    for (int i = 0; i < (lite ? 24 : 64) && t < t1; i++) {
      vec3 q = ro + rd * t;
      vec2 m = pm_map(q);
      if (m.x < 0.003 + 0.002 * t) return pm_shade_simple(q, m.y, -rd, pw * 2.0, voidL, lite);
      t += m.x;
    }
  }
  if (tS < 1e8) {
    vec3 q = ro + rd * tS;
    if (q.y > -1e-3) return pm_floor_shade(q, -rd, pw * 2.0, voidL, bgS, false, true);
    return pm_side_shade(q, q.x > PASTA_FLOOR - 1e-3 ? vec3(1, 0, 0) : (q.x < -PASTA_FLOOR + 1e-3 ? vec3(-1, 0, 0) : vec3(0, 0, sign(q.z))), -rd, pw * 2.0, voidL, bgS);
  }
  return pm_env(rd, 0.0, voidL);
}

// ---------------------------------------------------------------- the scene pass

vec3 pm_shade(vec3 p, vec3 n, float id, vec3 v, float pw, vec3 voidL, vec3 bgS, bool lite) {
  PmMat m = pm_material(id, p, n, pw);
  float sh = 0.0;
  if (dot(n, PASTA_L) > -0.05) {
    vec2 tb = pm_slab(p, PASTA_L, PM_UP_LO, PM_UP_HI);
    sh = pm_shadow(p + n * 0.03, 0.06, max(tb.y, 0.1), 3.5, lite ? 16 : 40, lite ? 0.05 : 0.015);
  }
  float ao = pm_ao(p, n, 1.0, lite ? 2 : 5);
  vec3 r = reflect(-v, m.n);
  vec3 refl;
  if (m.polish > 0.5) refl = pm_reflection(p + n * 0.02, r, pw, voidL, bgS, lite) * mix(ao, 1.0, 0.4);
  else refl = pm_env_rough(m, r, voidL) * ao;
  return pm_light(m, v, sh, ao, refl);
}

struct PmSample { vec3 col; float depth; vec3 n; float id; bool edge; };

// lite: an edge's extra rays, shaded more cheaply (they're averaged with the centre's), and not at
// all where they land on what the centre (ref) did, a pixel or so from it: its colour stands
PmSample pm_sample(vec2 px, float pw, vec3 voidL, vec3 bgS, bool lite, PmSample ref) {
  PmSample s; s.col = bgS; s.depth = 1.0; s.n = vec3(0.0); s.id = 0.0; s.edge = false;
  vec3 ro = pasta_ray(px), rd = -PASTA_EYE;
  vec2 ts = pm_slab(ro, rd, PM_FLOOR_LO, PM_FLOOR_HI);
  float tS = ts.x <= ts.y ? ts.x : 1e9;
  vec2 tb = pm_slab(ro, rd, PM_UP_LO, PM_UP_HI);
  if (tb.x <= tb.y) {
    // the march; a ray that comes within a pixel of something and leaves it again passed an edge
    float t = max(tb.x, 0.0), t1 = min(tb.y, tS);
    float eps = max(0.12 * pw, 0.0015);
    bool near = false;
    for (int i = 0; i < 160 && t < t1; i++) {
      vec2 m = pm_map(ro + rd * t);
      // a hit; or, out of steps grazing something, call that one
      if (m.x < eps || (i == 159 && m.x < 20.0 * eps)) {
        vec3 p = ro + rd * t;
        s.depth = pasta_depth(p); s.id = m.y;
        if (lite && abs(m.y - ref.id) < 0.5 && abs(s.depth - ref.depth) < 0.008 * pw) { s.col = ref.col; return s; }
        vec3 n = pm_normal(p);
        s.col = pm_display(pm_shade(p, n, m.y, -rd, pw, voidL, bgS, lite), bgS);
        s.n = n;
        s.edge = s.edge || dot(n, -rd) < 0.22;
        return s;
      }
      if (m.x < pw * 0.9) near = true;
      else if (near && m.x > pw * 2.0) s.edge = true;
      t += m.x;
    }
  }
  if (tS < 1e8) {
    vec3 p = ro + rd * tS;
    if (p.y > -1e-3) {
      s.col = lite && ref.id == PM_FLOOR ? ref.col : pm_display(pm_floor_shade(p, -rd, pw, voidL, bgS, true, lite), bgS);
      s.id = PM_FLOOR; s.n = vec3(0, 1, 0);
    } else {
      vec3 n = p.x > PASTA_FLOOR - 1e-3 ? vec3(1, 0, 0) : vec3(0, 0, 1);
      s.col = pm_display(pm_side_shade(p, n, -rd, pw, voidL, bgS), bgS); s.id = PM_SIDE; s.n = n;
    }
    s.depth = pasta_depth(p);
  }
  return s;
}

// which of the slab's faces (or none) a pixel's ray meets first
int pm_slab_face(vec2 px) {
  vec3 ro = pasta_ray(px), rd = -PASTA_EYE;
  vec2 t = pm_slab(ro, rd, PM_FLOOR_LO, PM_FLOOR_HI);
  if (t.x > t.y) return 0;
  vec3 p = ro + rd * t.x;
  return p.y > -1e-3 ? 1 : (p.x > PASTA_FLOOR - 1e-3 ? 2 : 3);
}
`;

// The kitchen into its cache, in two passes of the same program (one call site for the sample: it's
// big; two would cost every pixel registers): first each pixel's centre (its colour, and its normal,
// material and depth for the second), then the edges four more rays each (a rotated grid), averaged.
// An edge is one the march saw, one with its neighbours across it (a different normal or material),
// or the slab's outline. (The Metal took the neighbours from its 2x2 quad's derivatives, inside the
// loop; WebGL on Direct3D zeroes derivatives in such a loop, so the first pass hands them over.)
export const KITCHEN = `#version 300 es
${PASTA}
${LIB}
${SCENE}
uniform int pass;             // 0: the centres; 1: the edges
uniform sampler2D centre, centreInfo;  // the first pass's colour; its normal (rgb) and material (a, +128 on an edge)
uniform highp sampler2D centreDepth;
layout(location = 0) out vec4 o;
layout(location = 1) out vec4 info;
// the centre, then four more (a rotated grid) on edges
const vec2 PM_SUB[5] = vec2[5](vec2(0.0), vec2(-0.125, -0.375), vec2(0.375, -0.125), vec2(0.125, 0.375), vec2(-0.375, 0.125));
PmSample pm_centre(ivec2 q) {
  ivec2 hi = ivec2(u.view) - 1;
  q = clamp(q, ivec2(0), hi);
  vec4 i = texelFetch(centreInfo, q, 0);
  float a = floor(i.a * 255.0 + 0.5);
  PmSample s;
  s.col = texelFetch(centre, q, 0).rgb; s.depth = texelFetch(centreDepth, q, 0).r;
  s.n = i.rgb * 2.0 - 1.0; s.id = a >= 128.0 ? a - 128.0 : a; s.edge = a >= 128.0;
  return s;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, u.view.y - gl_FragCoord.y);
  float pw = 1.0 / u.scale;
  vec3 bgS = u.bg, voidL = pm_lin(bgS);
  vec3 col = vec3(0.0);
  float n = 0.0;
  PmSample c; c.col = vec3(0.0); c.depth = 1.0; c.n = vec3(0.0); c.id = -1.0; c.edge = false;
  int k0 = 0, k1 = 1;
  if (pass == 1) {
    ivec2 q = ivec2(gl_FragCoord.xy);
    c = pm_centre(q);
    PmSample l = pm_centre(q - ivec2(1, 0)), r = pm_centre(q + ivec2(1, 0)), d = pm_centre(q - ivec2(0, 1)), up = pm_centre(q + ivec2(0, 1));
    vec3 dn = max(abs(c.n - l.n), abs(c.n - r.n)) + max(abs(c.n - d.n), abs(c.n - up.n));
    bool edge = c.edge || length(dn) > 0.35 || c.id != l.id || c.id != r.id || c.id != d.id || c.id != up.id;
    int face = pm_slab_face(px);
    for (int j = 1; j < 5; j++) edge = edge || pm_slab_face(px + PM_SUB[j]) != face;
    col = c.col; n = 1.0;
    k0 = 1; k1 = edge ? 5 : 1;
  }
  for (int k = k0; k < k1; k++) {
    PmSample s = pm_sample(px + PM_SUB[k], pw, voidL, bgS, k > 0, c);
    col += s.col; n += 1.0;
    if (k == 0) c = s;
  }
  o = vec4(col / n, 1.0);
  info = vec4(c.n * 0.5 + 0.5, (c.id + (c.edge ? 128.0 : 0.0)) / 255.0);
  gl_FragDepth = c.depth;
}`;

// ---------------------------------------------------------------- the crank (every frame)

export const CRANK_VERT = `#version 300 es
${PASTA}
${CRANK_FRAME}
// a box on the canvas round the crank as it's turned now
void main() {
  float c = cos(u.crank), s = sin(u.crank);
  vec2 lo = vec2(1e9), hi = vec2(-1e9);
  for (int i = 0; i < 8; i++) {
    vec3 q = vec3((i & 1) != 0 ? PM_CRANK_HI.x : PM_CRANK_LO.x, (i & 2) != 0 ? PM_CRANK_HI.y : PM_CRANK_LO.y, (i & 4) != 0 ? PM_CRANK_HI.z : PM_CRANK_LO.z);
    vec2 sp = pasta_px(PASTA_CRANK + pm_from_crank(q, c, s));
    lo = min(lo, sp); hi = max(hi, sp);
  }
  lo -= 2.0; hi += 2.0;
  vec2 v = vec2((gl_VertexID & 1) != 0 ? hi.x : lo.x, (gl_VertexID & 2) != 0 ? hi.y : lo.y);
  gl_Position = vec4(v.x / u.view.x * 2.0 - 1.0, 1.0 - v.y / u.view.y * 2.0, 0.0, 1.0);
}`;

export const CRANK = `#version 300 es
${PASTA}
${LIB}
${CRANK_FRAME}
out vec4 o;
// in its own frame: x out along the shaft from the boss, y along the arm, z across it
vec2 pm_crank_map(vec3 q) {
  // the arm: a tapered bar, round at both ends, leaning out a little toward the handle
  vec2 a = vec2(q.z, q.y);
  float r1 = 1.0, r2 = 0.62, h = PASTA_ARM;
  float b = (r1 - r2) / h, ca = sqrt(1.0 - b * b);
  a.x = abs(a.x);
  float k = dot(a, vec2(-b, ca));
  float prof = k < 0.0 ? length(a) - r1 : (k > ca * h ? length(a - vec2(0.0, h)) - r2 : dot(a, vec2(ca, b)) - r1);
  float arm = pm_extrude(prof, q.x - 0.85 - 0.035 * q.y, 0.26, 0.11);
  // the nut on the shaft
  arm = pm_smin(arm, pm_cyl(length(q.yz), q.x - 1.25, 0.52, 0.22, 0.12), 0.08);
  vec2 r = vec2(arm, PM_ARM);
  // the handle: a ferrule, the turned wood, a cap
  vec3 hq = vec3(q.x, q.y - h, q.z);
  float s = length(hq.yz);
  float fer = pm_cyl(s, hq.x - 1.45, 0.34, 0.32, 0.08);
  float cap = pm_cyl(s, hq.x - 6.05, 0.36, 0.2, 0.14);
  float met = min(fer, cap);
  if (met < r.x) r = vec2(met, PM_ARM);
  float x = clamp((hq.x - 1.7) / 4.25, 0.0, 1.0);
  float rad = 0.5 + 0.24 * sin(x * 2.9) - 0.04 * smoothstep(0.05, 0.0, abs(x - 0.12));
  float wood = pm_cyl(s - rad + 0.5, hq.x - 3.82, 0.5, 2.12, 0.18) * 0.9;
  if (wood < r.x) r = vec2(wood, PM_HANDLE);
  return r;
}

vec3 pm_crank_normal(vec3 q) {
  vec3 n = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e * pm_crank_map(q + e * 0.002).x;
  }
  return normalize(n);
}

// the machine's shadow on the crank: its body as one rounded box
float pm_crank_shadow(vec3 p) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 24; i++) {
    float h = pm_rbox(p + PASTA_L * t - vec3(0.0, 53.0, -0.5), vec3(11.0, 7.0, 6.5), 1.0);
    res = min(res, 7.0 * h / t);
    t += clamp(h, 0.05, 2.0);
    if (res < 0.002 || t > 30.0) break;
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

// what the crank's chrome sees: the table top and the floor flat, else the room
vec3 pm_crank_mirror(vec3 ro, vec3 rd, float pw, vec3 voidL, vec3 bgS) {
  if (rd.y < 0.0) {
    float t = (PASTA_TABLE_MAX.y - ro.y) / rd.y;
    vec3 q = ro + rd * t;
    if (abs(q.x) < PASTA_TABLE_MAX.x && q.z > PASTA_TABLE_MIN.z && q.z < PASTA_TABLE_MAX.z) {
      PmMat m = pm_material(PM_TOP, q, vec3(0, 1, 0), pw * 2.0);
      return m.alb * (PM_SUN * PASTA_L.y + pm_sky(vec3(0, 1, 0)));
    }
    t = -ro.y / rd.y;
    q = ro + rd * t;
    if (abs(q.x) < PASTA_FLOOR && abs(q.z) < PASTA_FLOOR) return pm_floor_shade(q, -rd, pw * 2.0, voidL, bgS, false, true);
  }
  return pm_env(rd, 0.0, voidL);
}

// one ray at the crank: hit (t > 0) or not, and whether it's by an edge (it missed but came within a
// pixel, or came that close to something and left it before it hit)
vec2 pm_crank_march(vec3 ro, vec3 rd, float pw, inout bool near) {
  vec2 tb = pm_slab(ro, rd, PM_CRANK_LO, PM_CRANK_HI);
  if (tb.x > tb.y) return vec2(-1.0, 0.0);
  float t = tb.x;
  bool close = false;
  for (int i = 0; i < 48 && t < tb.y; i++) {
    vec2 m = pm_crank_map(ro + rd * t);
    if (m.x < max(0.1 * pw, 0.001)) return vec2(t, m.y);
    if (m.x < pw * 1.2) close = true;
    else if (close && m.x > pw * 2.0) near = true;
    t += m.x;
  }
  near = near || close;
  return vec2(-1.0, 0.0);
}

vec3 pm_crank_shade(vec3 q, float id, float c, float s, float pw, vec3 voidL, vec3 bgS) {
  vec3 nl = pm_crank_normal(q);
  vec3 n = pm_from_crank(nl, c, s);
  vec3 p = PASTA_CRANK + pm_from_crank(q, c, s);
  PmMat m = pm_material(id, id > PM_ARM + 0.5 ? q : p, n, pw);
  m.n = n;
  vec3 v = PASTA_EYE;
  float sh = dot(n, PASTA_L) > 0.0 ? pm_crank_shadow(p + n * 0.02) : 0.0;
  // a little darker toward the machine's side
  float ao = mix(0.55, 1.0, smoothstep(0.3, 1.6, q.x));
  vec3 r = reflect(-v, n);
  vec3 refl = m.polish > 0.5 ? pm_crank_mirror(p, r, pw, voidL, bgS) : pm_env(r, m.rough, voidL);
  return pm_display(pm_light(m, v, sh, ao, refl * ao), bgS);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u.view.y - gl_FragCoord.y);
  float pw = 1.0 / u.scale;
  float c = cos(u.crank), s = sin(u.crank);
  vec3 bgS = u.bg, voidL = pm_lin(bgS);
  vec3 rd = pm_to_crank(PASTA_CRANK - PASTA_EYE, c, s);  // the eye's direction in the crank's frame
  bool near = false;
  vec3 ro = pm_to_crank(pasta_ray(px), c, s);
  vec2 h = pm_crank_march(ro, rd, pw, near);
  if (h.x < 0.0 && !near) discard;
  vec3 hq = ro + rd * h.x;
  bool inner = h.x > 0.0 && !near && dot(pm_crank_normal(hq), -rd) > 0.3;
  if (inner) {
    o = vec4(pm_crank_shade(hq, h.y, c, s, pw, voidL, bgS), 1.0);
    gl_FragDepth = pasta_depth(PASTA_CRANK + pm_from_crank(hq, c, s));
    return;
  }
  // an edge: four rays, the colour by coverage
  vec3 acc = vec3(0.0); float cov = 0.0, depth = 1.0;
  for (int k = 0; k < 4; k++) {
    vec2 o2 = vec2((k & 1) != 0 ? 0.25 : -0.25, (k & 2) != 0 ? 0.25 : -0.25);
    vec3 ro2 = pm_to_crank(pasta_ray(px + o2), c, s);
    bool n2 = false;
    vec2 h2 = pm_crank_march(ro2, rd, pw, n2);
    if (h2.x > 0.0) {
      vec3 q = ro2 + rd * h2.x;
      acc += pm_crank_shade(q, h2.y, c, s, pw, voidL, bgS);
      cov += 1.0;
      depth = min(depth, pasta_depth(PASTA_CRANK + pm_from_crank(q, c, s)));
    }
  }
  if (cov < 0.5) discard;
  o = vec4(acc * 0.25, cov * 0.25);
  gl_FragDepth = depth;
}`;
