// The dynamic theme (T, after whitescreen): the colours of the song's cover. The cover comes in as its pixels
// (the page draws it small, 48 x 48, and hands over the RGBA bytes), so this is plain functions with no page in
// them, and the tests run them.
//
// The cover is sorted into five colours (k-means in OKLab, where the distance between two colours is about what
// the eye sees; it starts the same way every time, so one cover always gives one palette). The biggest of the five
// is the background, taken dark with its hue kept. The most saturated of the others that is clearly another
// colour is the text, lifted until it reads against the background (7:1). A cover that's grey or all one colour
// has no second colour to take: it gets bluescreen's look (white on a deep colour) in the cover's hue, and a grey
// cover as grey as it is. The theme's other variables come from those two the way style.css makes them for the
// fixed themes. Two more colours come from the cover for what the two can't do (extras): an accent, for the
// highlights, and a ground, the middle colour of the scenes and the spectrogram drawn in the cover's colours. Easing
// between two covers' colours, all of them, is here too (createDynamicTheme).

// style.css's own theme, what the dynamic one shows without a cover
export const BLUESCREEN = { bg: [5, 29, 181], fg: [255, 255, 255] };

const COLOURS = 5; // how many the cover is sorted into
const BG_LIGHTEST = 0.18; // the background's OKLab lightness, at most
const APART = 0.12; // how far (OKLab distance) a colour has to be from the background's to be a second one
const SHARE = 0.03; // and how much of the cover it has to fill, so a speck of it isn't taken
const FULL_CHROMA = 0.1; // a cover with this much colour (or more) gets bluescreen's full strength in its hue
const READS = 7.05; // the text against the background: 7:1, a hair over for the rounding to 8 bits
const DIM_READS = 4.55; // the dim text against it: 4.5:1 (the note by --dim in style.css)
const ACCENT_READS = 4.55; // the accent against the background: 4.5:1, for the marks and the large text it's on (text stays 7:1)
const ACCENT_SHARE = 0.01; // the accent can be a small part of the cover (a hundredth of it: less is a speck)
const ACCENT_APART = 0.1; // and has to look like another colour than the text
const GREY = 0.03; // less chroma than this is grey: no accent from it, and a grey ground takes the text's hue
const VIVID = 0.2; // the most chroma an accent made from one of the cover's hues is given
const SAME_HUE = (25 * Math.PI) / 180; // two colours closer in hue than this are one hue
const GROUND_READS = 2.2; // the ground against the background: seen, but well under the text and the lights

// ---------------------------------------------------------------- colour maths

const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i));

// (OKLab is Björn Ottosson's, from his 2020 post at bottosson.github.io/posts/oklab; the matrices below are the ones he gives.)
function labOfLinear(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
// An sRGB colour (0-255, or between) as OKLab [L, a, b].
export const toOklab = (rgb) => labOfLinear(lin(rgb[0]), lin(rgb[1]), lin(rgb[2]));

function linearOf([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const inside = (c) => c.every((v) => v >= -1e-4 && v <= 1.0001);

// An OKLab colour as sRGB (0-255, not rounded). One the screen can't show loses chroma, keeping its lightness and
// hue, until it can.
export function fromOklab([L, a, b]) {
  L = Math.min(1, Math.max(0, L));
  let c = linearOf([L, a, b]);
  if (!inside(c)) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (inside(linearOf([L, a * mid, b * mid]))) lo = mid; else hi = mid;
    }
    c = linearOf([L, a * lo, b * lo]);
  }
  return c.map((v) => gam(Math.min(1, Math.max(0, v))));
}

const hex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
const luminance = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
// How well two colours read against each other (WCAG's contrast ratio, 1 to 21).
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const ofLch = (L, C, h) => [L, C * Math.cos(h), C * Math.sin(h)];
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// Two colours, k of the way from a to b, mixed in OKLab (so the middle isn't muddy the way sRGB's is).
export const mixColours = (a, b, k) => {
  const p = toOklab(a), q = toOklab(b);
  return fromOklab(p.map((v, i) => v + (q[i] - v) * k));
};

// ---------------------------------------------------------------- the cover's five colours

// The same numbers every time: the start of the clustering draws from this, seeded the same each run.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// k-means over the points (OKLab, three numbers each): k-means++ to start (each new centre drawn by how far it is
// from the ones so far), then rounds of "every point to its nearest centre, every centre to the middle of its
// points" till nothing moves. Gives the colours with how many points each holds, the ones that hold none left out.
function cluster(points, n, k) {
  const rand = seeded(0x9e3779b9), at = (i) => [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
  const centres = [at(Math.floor(rand() * n))], near = new Float64Array(n).fill(Infinity);
  while (centres.length < k) {
    const c = centres[centres.length - 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = (points[i * 3] - c[0]) ** 2 + (points[i * 3 + 1] - c[1]) ** 2 + (points[i * 3 + 2] - c[2]) ** 2;
      if (d < near[i]) near[i] = d;
      total += near[i];
    }
    if (total < 1e-9) break; // every point is already a centre: the cover has fewer colours than k
    let pick = rand() * total, i = 0, last = 0;
    for (; i < n; i++) {
      if (!near[i]) continue;
      last = i;
      if ((pick -= near[i]) <= 0) break;
    }
    centres.push(at(i < n ? i : last));
  }
  const owner = new Uint8Array(n).fill(255), count = new Int32Array(centres.length);
  for (let round = 0; round < 24; round++) {
    let moved = 0;
    count.fill(0);
    const sums = new Float64Array(centres.length * 3);
    for (let i = 0; i < n; i++) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < centres.length; j++) {
        const c = centres[j], d = (points[i * 3] - c[0]) ** 2 + (points[i * 3 + 1] - c[1]) ** 2 + (points[i * 3 + 2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      if (owner[i] !== best) { owner[i] = best; moved++; }
      count[best]++;
      for (let x = 0; x < 3; x++) sums[best * 3 + x] += points[i * 3 + x];
    }
    centres.forEach((c, j) => { if (count[j]) for (let x = 0; x < 3; x++) c[x] = sums[j * 3 + x] / count[j]; });
    if (!moved) break;
  }
  return centres.map((lab, j) => ({ lab, n: count[j] })).filter((c) => c.n > 0);
}

// The text colour: the cluster's own, lifted (lighter, its hue and chroma kept as far as the screen allows) till it
// reads against the background (7:1; the accent asks less of it).
function lifted(lab, bg, reads = READS) {
  const at = (L) => fromOklab([L, lab[1], lab[2]]).map(Math.round);
  const own = at(lab[0]);
  if (contrast(own, bg) >= reads) return own;
  let lo = lab[0], hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(at(mid), bg) >= reads) hi = mid; else lo = mid;
  }
  const out = at(hi);
  return contrast(out, bg) >= reads ? out : [255, 255, 255];
}

// The palette's other two (the cover's colours sorted biggest first; second, the one the text came from, if any).
// The accent (the highlights: the lit steps, the card's title, the player bar's buttons, the library's playing row) is
// the most vivid of the cover's other colours that isn't grey, raised till it reads (4.5:1) and clearly another colour
// than the text. A cover with no such colour (most are nearly one hue) gets one of its hues at full strength: the
// text's, then the background's, as dark as reads or brighter than the text: whichever of those is clearly apart from
// the text, at least as vivid as it (a duller one is a shade, not a highlight) and the more vivid; and failing all
// those, the text colour itself. The ground is the biggest of the cover's colours besides the
// background and the text (a grey one in the text's hue), at a lightness between the two, as light as it takes to be
// seen against the background.
function extras(colours, n, second, bg, fg) {
  const [top] = colours, F = toOklab(fg), B = toOklab(bg);
  const chroma = (lab) => Math.hypot(lab[1], lab[2]), hue = (lab) => Math.atan2(lab[2], lab[1]), away = (c) => dist(toOklab(c), F);
  let accent = null;
  // (a shade of the text's own hue is no accent: it has to be another hue, or much more vivid)
  const shade = (lab) => chroma(F) >= GREY && Math.abs(((hue(lab) - hue(F) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < SAME_HUE && chroma(lab) < 1.5 * chroma(F);
  const vivid = colours.slice(1).filter((c) => c !== second && c.n >= ACCENT_SHARE * n && chroma(c.lab) >= GREY && dist(c.lab, top.lab) >= APART && !shade(c.lab));
  for (const c of vivid.sort((p, q) => chroma(q.lab) - chroma(p.lab) || q.n - p.n)) {
    const a = lifted(c.lab, bg, ACCENT_READS);
    if (away(a) >= ACCENT_APART) { accent = a; break; }
  }
  for (const lab of [F, B]) {
    if (accent || chroma(lab) < GREY) continue;
    const C = Math.min(VIVID, Math.max(0.12, chroma(lab) + 0.08)), h = hue(lab);
    const dark = lifted(ofLch(B[0], C, h), bg, ACCENT_READS), bright = fromOklab(ofLch(Math.min(0.93, F[0] + 0.15), C, h)).map(Math.round);
    const best = [dark, bright].filter((c) => contrast(c, bg) >= ACCENT_READS && away(c) >= ACCENT_APART && chroma(toOklab(c)) >= chroma(F) - 0.02)
      .sort((p, q) => chroma(toOklab(q)) - chroma(toOklab(p)))[0];
    if (best) accent = best;
  }
  const g = colours.slice(1).find((c) => c !== second) || second || top, tint = chroma(g.lab) >= GREY ? g.lab : F;
  const at = (L) => fromOklab(ofLch(L, Math.min(0.12, Math.max(chroma(g.lab), chroma(F) * 0.5)), hue(tint))).map(Math.round);
  const hi = Math.max(B[0] + 0.1, Math.min(0.62, F[0] - 0.12));
  let L = Math.min(Math.max(g.lab[0], B[0] + 0.16), hi);
  while (contrast(at(L), bg) < GROUND_READS && L < hi) L = Math.min(hi, L + 0.02);
  return { accent: accent || [...fg], ground: at(L) };
}

// The cover's colours: { bg, fg, accent, ground } as [r, g, b], from its RGBA pixels (as many as there are: 48 x 48
// in the app). null if there's no picture in them (nearly all see-through).
export function coverPalette(rgba) {
  const total = Math.floor(rgba.length / 4), points = new Float64Array(total * 3);
  let n = 0;
  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    const lab = labOfLinear(LIN[rgba[i * 4]], LIN[rgba[i * 4 + 1]], LIN[rgba[i * 4 + 2]]);
    points.set(lab, n * 3);
    n++;
  }
  if (n < 16 || n < total / 20) return null;
  const colours = cluster(points, n, COLOURS).sort((p, q) => q.n - p.n);
  const top = colours[0].lab, C = Math.hypot(top[1], top[2]), hue = Math.atan2(top[2], top[1]);
  // the background: the biggest colour, no lighter than BG_LIGHTEST, its hue (and as much of its chroma as the
  // screen has at that lightness) kept
  const bg = fromOklab(ofLch(Math.min(top[0], BG_LIGHTEST), C, hue)).map(Math.round);
  // the text: of the other colours that fill enough of the cover and are clearly not the background, the most
  // saturated (below a trace of colour, the lighter: a grey cover's text is its light grey)
  const second = colours.slice(1).filter((c) => c.n >= SHARE * n && dist(c.lab, top) >= APART)
    .sort((p, q) => Math.max(Math.hypot(q.lab[1], q.lab[2]), 0.03) - Math.max(Math.hypot(p.lab[1], p.lab[2]), 0.03) || q.lab[0] - p.lab[0] || q.n - p.n)[0];
  if (second) { const fg = lifted(second.lab, bg); return { bg, fg, ...extras(colours, n, second, bg, fg) }; }
  // one colour: bluescreen's look (white on a deep colour) in its hue, as light as bluescreen's as far as the cover
  // has colour to be that (grey stays dark, and a dark cover no lighter than it is), with its own chroma, no more
  // than bluescreen's
  const blue = toOklab(BLUESCREEN.bg), strength = Math.min(1, C / FULL_CHROMA);
  const L = Math.min(top[0], BG_LIGHTEST + strength * (blue[0] - BG_LIGHTEST));
  const deep = fromOklab(ofLch(L, Math.min(C, Math.hypot(blue[1], blue[2])), hue)).map(Math.round), white = [...BLUESCREEN.fg];
  return { bg: deep, fg: white, ...extras(colours, n, null, deep, white) };
}

// ---------------------------------------------------------------- the theme's variables

// The variables of style.css's fixed themes, for a background and a text colour, made the way bluescreen's are: ink
// is the background at 38%, the faint and highlight tints are the text at 14% and 18%, the code lines' backing the
// background at 62%, and the dim text (comments, the footer) is the text at 60%, or as much more as it takes to
// stay 4.5:1 against the background. Colours between two covers' (not whole numbers) are rounded here.
export function themeVars({ bg, fg }) {
  const B = bg.map(Math.round), F = fg.map(Math.round);
  const rgba = (c, a) => `rgba(${c.join(',')},${String(a).replace(/^0/, '')})`;
  let dim = 0.6;
  while (dim < 1 && contrast(F.map((v, i) => v * dim + B[i] * (1 - dim)), B) < DIM_READS) dim = Math.round((dim + 0.01) * 100) / 100;
  return {
    '--bg': hex(B), '--fg': hex(F), '--ink': hex(B.map((v) => v * 0.38)),
    '--dim': rgba(F, dim), '--faint': rgba(F, 0.14), '--hl-bg': rgba(F, 0.18), '--line-bg': rgba(B, 0.62),
  };
}
export const THEME_VARS = Object.keys(themeVars(BLUESCREEN));

// A palette with all four colours: one with two (bluescreen's, a test's) takes its text colour as its accent and the
// middle of the two as its ground, so with no cover the dynamic theme is bluescreen's look exactly.
export const fullPalette = (p) => ({ bg: p.bg, fg: p.fg, accent: p.accent || [...p.fg], ground: p.ground || mixColours(p.bg, p.fg, 0.5).map(Math.round) });
// The page's variables for a palette: the fixed themes' ones (themeVars), the accent (4.5:1: the lit steps, the play
// button, the progress bar, the card's big ID) and the accent as text (the same hue lifted to 7:1, as the text is: the
// card's song title, and the library's playing row, whose words sit on it). style.css gives the fixed themes their
// text colour as both, so their highlights stay as they were.
export const ACCENT_VAR = '--accent', ACCENT_TEXT_VAR = '--accent-text';
export const paletteVars = (p) => {
  const a = (p.accent || p.fg).map(Math.round), B = p.bg.map(Math.round);
  return { ...themeVars(p), [ACCENT_VAR]: hex(a), [ACCENT_TEXT_VAR]: hex(contrast(a, B) >= READS ? a : lifted(toOklab(a), B)) };
};

// The five colours of a heat map up from black to white by way of the text colour (what the spectrogram's own
// theme colours are, for the fixed themes: spectro.js).
export const heatStops = (fg) => [[0, 0, 0], fg.map((v) => v * 0.22), fg.map((v) => v * 0.62), fg, fg.map((v) => v + (255 - v) * 0.88)].map(hex);
// The dynamic theme's five: from its background up through the cover's ground, accent and text, darkest to lightest,
// to the lightest of those near white. The terrain stands on the theme's own background.
export function terrainStops(p) {
  const { bg, fg, accent, ground } = fullPalette(p);
  const mid = [ground, accent, fg].sort((a, b) => toOklab(a)[0] - toOklab(b)[0]);
  return [bg, ...mid, mid[2].map((v) => v + (255 - v) * 0.7)].map(hex);
}

// ---------------------------------------------------------------- easing

const ease = (k) => k * k * (3 - 2 * k);
const sameColours = (a, b) => a === b || Object.keys(b).every((k) => a[k] && a[k].every((v, i) => v === b[k][i]));

// The theme's colours over time. Each frame it's told the cover's palette (null: no cover) and the time, and says
// whether the colours moved. A new cover's colours are eased to over `seconds` (in OKLab, smoothly at both ends)
// from wherever they are, so a cover that comes while one is still easing turns it round without a jump. A cover
// that's gone is let go only after `hold` seconds, and then back to bluescreen's: between two songs the old cover
// is gone a moment before the next arrives (the radio's has to be looked up), and letting go at once was a detour
// to blue and back. Every colour the palettes have eases together (none: what there is with no cover; the app gives
// it bluescreen's with all four colours).
export function createDynamicTheme({ seconds = 1.2, hold = 4, none = BLUESCREEN } = {}) {
  let from = none, to = none, began = -Infinity, goneAt = null, last = none;
  const at = (now) => {
    const k = (now - began) / seconds;
    if (k >= 1) return to;
    const e = ease(Math.max(0, k));
    return Object.fromEntries(Object.keys(to).map((key) => [key, mixColours(from[key] || to[key], to[key], e)]));
  };
  return {
    palette: at,
    easing: (now) => now - began < seconds,
    // these colours at once (a theme picked, not a song changing)
    jump(palette) { from = to = last = palette; began = -Infinity; goneAt = null; },
    update(cover, now) {
      let want = to;
      if (cover) { goneAt = null; want = cover; }
      else { goneAt ??= now; if (now - goneAt >= hold) want = none; }
      if (!sameColours(want, to)) { from = at(now); to = want; began = now; }
      const shown = at(now), moved = !sameColours(shown, last);
      last = shown;
      return moved;
    },
  };
}
