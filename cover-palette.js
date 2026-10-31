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
// fixed themes. Easing between two covers' colours is here too (createDynamicTheme).

// style.css's own theme, what the dynamic one shows without a cover
export const BLUESCREEN = { bg: [5, 29, 181], fg: [255, 255, 255] };

const COLOURS = 5; // how many the cover is sorted into
const BG_LIGHTEST = 0.18; // the background's OKLab lightness, at most
const APART = 0.12; // how far (OKLab distance) a colour has to be from the background's to be a second one
const SHARE = 0.03; // and how much of the cover it has to fill, so a speck of it isn't taken
const FULL_CHROMA = 0.1; // a cover with this much colour (or more) gets bluescreen's full strength in its hue
const READS = 7.05; // the text against the background: 7:1, a hair over for the rounding to 8 bits
const DIM_READS = 4.55; // the dim text against it: 4.5:1 (the note by --dim in style.css)

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
// reads against the background.
function lifted(lab, bg) {
  const at = (L) => fromOklab([L, lab[1], lab[2]]).map(Math.round);
  const own = at(lab[0]);
  if (contrast(own, bg) >= READS) return own;
  let lo = lab[0], hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(at(mid), bg) >= READS) hi = mid; else lo = mid;
  }
  const out = at(hi);
  return contrast(out, bg) >= READS ? out : [255, 255, 255];
}

// The cover's colours: { bg, fg } as [r, g, b], from its RGBA pixels (as many as there are: 48 x 48 in the app).
// null if there's no picture in them (nearly all see-through).
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
  if (second) return { bg, fg: lifted(second.lab, bg) };
  // one colour: bluescreen's look (white on a deep colour) in its hue, as light as bluescreen's as far as the cover
  // has colour to be that (grey stays dark, and a dark cover no lighter than it is), with its own chroma, no more
  // than bluescreen's
  const blue = toOklab(BLUESCREEN.bg), strength = Math.min(1, C / FULL_CHROMA);
  const L = Math.min(top[0], BG_LIGHTEST + strength * (blue[0] - BG_LIGHTEST));
  return { bg: fromOklab(ofLch(L, Math.min(C, Math.hypot(blue[1], blue[2])), hue)).map(Math.round), fg: [...BLUESCREEN.fg] };
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

// The five colours of a heat map up from black to white by way of the text colour (what the spectrogram's own
// theme colours are, for the fixed themes: spectro.js).
export const heatStops = (fg) => [[0, 0, 0], fg.map((v) => v * 0.22), fg.map((v) => v * 0.62), fg, fg.map((v) => v + (255 - v) * 0.88)].map(hex);

// ---------------------------------------------------------------- easing

const ease = (k) => k * k * (3 - 2 * k);
const sameColours = (a, b) => a === b || (a.bg.every((v, i) => v === b.bg[i]) && a.fg.every((v, i) => v === b.fg[i]));

// The theme's colours over time. Each frame it's told the cover's palette (null: no cover) and the time, and says
// whether the colours moved. A new cover's colours are eased to over `seconds` (in OKLab, smoothly at both ends)
// from wherever they are, so a cover that comes while one is still easing turns it round without a jump. A cover
// that's gone is let go only after `hold` seconds, and then back to bluescreen's: between two songs the old cover
// is gone a moment before the next arrives (the radio's has to be looked up), and letting go at once was a detour
// to blue and back.
export function createDynamicTheme({ seconds = 1.2, hold = 4 } = {}) {
  let from = BLUESCREEN, to = BLUESCREEN, began = -Infinity, goneAt = null, last = BLUESCREEN;
  const at = (now) => {
    const k = (now - began) / seconds;
    return k >= 1 ? to : { bg: mixColours(from.bg, to.bg, ease(Math.max(0, k))), fg: mixColours(from.fg, to.fg, ease(Math.max(0, k))) };
  };
  return {
    palette: at,
    easing: (now) => now - began < seconds,
    // these colours at once (a theme picked, not a song changing)
    jump(palette) { from = to = last = palette; began = -Infinity; goneAt = null; },
    update(cover, now) {
      let want = to;
      if (cover) { goneAt = null; want = cover; }
      else { goneAt ??= now; if (now - goneAt >= hold) want = BLUESCREEN; }
      if (!sameColours(want, to)) { from = at(now); to = want; began = now; }
      const shown = at(now), moved = !sameColours(shown, last);
      last = shown;
      return moved;
    },
  };
}
