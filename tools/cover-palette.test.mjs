// The dynamic theme's colours (renderer/cover-palette.js): the palette a cover gives, that its text reads and that one cover always
// gives one palette, how a one-colour or grey cover is handled, that the variables are made the way style.css makes them, and the
// easing between two covers. The covers are generated (tools/cover-fixtures.mjs): black, white, greys, neon, two-colour,
// a mark on a plain ground, gradients and noisy photo-like ones.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLUESCREEN, THEME_VARS, contrast, coverPalette, createDynamicTheme, fromOklab, heatStops, mixColours, themeVars, toOklab } from '../renderer/cover-palette.js';
import { COVERS, coverPixels, pixels } from './cover-fixtures.mjs';

// WCAG's contrast ratio, written out again here (with the threshold its text gives, 0.03928) so the module is not checked by itself
const channel = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const wcag = (a, b) => {
  const y = (c) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]), p = y(a), q = y(b);
  return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05);
};
const NAMES = Object.keys(COVERS);
const hue = (rgb) => { const [, a, b] = toOklab(rgb); return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360; };
const chroma = (rgb) => { const [, a, b] = toOklab(rgb); return Math.hypot(a, b); };
const apart = (x, y) => Math.abs(((x - y + 540) % 360) - 180); // degrees between two hues
const parse = (css) => css.match(/[\d.]+/g).map(Number);
const hexOf = (css) => [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16));

test('thirty covers, flat to noisy: each has a palette in whole numbers, and its text reads against its background at 7:1', () => {
  assert.equal(NAMES.length, 30);
  for (const name of NAMES) {
    const p = coverPalette(coverPixels(name));
    assert.ok(p, name);
    for (const c of [p.bg, p.fg]) assert.ok(c.length === 3 && c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), `${name}: ${c}`);
    assert.ok(wcag(p.fg, p.bg) >= 7, `${name}: ${wcag(p.fg, p.bg).toFixed(2)}:1`);
    assert.ok(Math.abs(wcag(p.fg, p.bg) - contrast(p.fg, p.bg)) < 1e-3, `${name}: the module's contrast agrees`);
  }
});

test('and so do 300 random covers (two to six colours in random shapes, with grain): always 7:1, always the same palette', () => {
  let seed = 20261031;
  const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let n = 0; n < 300; n++) {
    const colours = Array.from({ length: 2 + Math.floor(rand() * 5) }, () => (rand() < 0.15 ? Array(3).fill(Math.floor(rand() * 256)) : [0, 1, 2].map(() => Math.floor(rand() * 256))));
    const centres = colours.map(() => [rand(), rand()]), grain = rand() * 30, salt = Math.floor(rand() * 1e6);
    const make = () => pixels((u, v, x, y) => {
      let best = 0, bestD = Infinity;
      centres.forEach(([cx, cy], i) => { const d = Math.hypot(u - cx, v - cy); if (d < bestD) { bestD = d; best = i; } });
      const g = ((Math.imul(x * 7919 + y * 104729, 2654435761 + salt) >>> 20) / 4096 - 0.5) * grain;
      return colours[best].map((c) => Math.max(0, Math.min(255, Math.round(c + g))));
    });
    const p = coverPalette(make());
    assert.ok(p && wcag(p.fg, p.bg) >= 7, `cover ${n}: ${p && wcag(p.fg, p.bg)} from ${JSON.stringify(colours)}`);
    assert.deepEqual(coverPalette(make()), p, `cover ${n}: the same palette again`);
  }
});

test('the variables made from them: the dim text reads at 4.5:1 and is never fainter than bluescreen\'s, the rest as the fixed themes', () => {
  for (const name of NAMES) {
    const p = coverPalette(coverPixels(name)), v = themeVars(p);
    assert.deepEqual(Object.keys(v), THEME_VARS);
    assert.deepEqual(hexOf(v['--bg']), p.bg);
    assert.deepEqual(hexOf(v['--fg']), p.fg);
    const [r, g, b, a] = parse(v['--dim']);
    assert.ok(a >= 0.6 && a <= 1, `${name}: dim ${a}`);
    const over = [r, g, b].map((c, i) => c * a + p.bg[i] * (1 - a));
    assert.ok(wcag(over, p.bg) >= 4.5, `${name}: dim ${wcag(over, p.bg).toFixed(2)}:1`);
    assert.deepEqual(parse(v['--faint']), [...p.fg, 0.14]);
    assert.deepEqual(parse(v['--hl-bg']), [...p.fg, 0.18]);
    assert.deepEqual(parse(v['--line-bg']), [...p.bg, 0.62]);
    assert.deepEqual(hexOf(v['--ink']), p.bg.map((c) => Math.round(c * 0.38)));
  }
});

test('one cover, one palette: the same pixels give the same colours however often, in whatever order covers are asked', () => {
  const first = Object.fromEntries(NAMES.map((n) => [n, coverPalette(coverPixels(n))]));
  for (const n of [...NAMES].reverse()) assert.deepEqual(coverPalette(coverPixels(n)), first[n], n);
  for (let i = 0; i < 5; i++) assert.deepEqual(coverPalette(coverPixels('warm photo')), first['warm photo']);
  assert.deepEqual(coverPalette(Uint8Array.from(coverPixels('sunset'))), first.sunset, 'the same bytes in another kind of array');
  // and a different cover gives a different palette (most of them: some of the greys and flat colours will share one)
  const distinct = new Set(NAMES.map((n) => JSON.stringify(first[n])));
  assert.ok(distinct.size >= 22, `${distinct.size} distinct palettes of ${NAMES.length}`);
});

test('the background is the biggest colour made dark with its hue kept; the text is the other colour that stands out', () => {
  // navy with an orange stripe
  const navy = [14, 24, 70], orange = [255, 140, 20], p = coverPalette(coverPixels('navy with an orange stripe'));
  assert.ok(toOklab(p.bg)[0] <= 0.18 + 0.005, `bg lightness ${toOklab(p.bg)[0]}`);
  assert.ok(apart(hue(p.bg), hue(navy)) < 12, `bg hue ${hue(p.bg)} against navy ${hue(navy)}`);
  assert.ok(apart(hue(p.fg), hue(orange)) < 15, `fg hue ${hue(p.fg)} against orange ${hue(orange)}`);
  assert.ok(chroma(p.fg) > 0.1, 'the text is vivid');
  // a cover whose biggest colour is light: the background is that colour darkened, the text the mark on it
  const disc = coverPalette(coverPixels('white with a red disc'));
  assert.ok(toOklab(disc.bg)[0] <= 0.18 + 0.005 && chroma(disc.bg) < 0.01, 'white darkened is neutral');
  assert.ok(apart(hue(disc.fg), hue([188, 0, 45])) < 20 && chroma(disc.fg) > 0.08, `the disc's red, lifted: ${disc.fg}`);
  // red and cyan halves: one of each
  const halves = coverPalette(coverPixels('red and cyan halves'));
  assert.ok(apart(hue(halves.bg), hue([220, 30, 40])) < 15 && apart(hue(halves.fg), hue([30, 210, 220])) < 15, `${halves.bg} ${halves.fg}`);
  // a small bright mark on near black: black ground, the mark's colour as text (it fills a twelfth of the cover)
  const mark = coverPalette(coverPixels('black with a neon pink mark'));
  assert.ok(toOklab(mark.bg)[0] < 0.13 && apart(hue(mark.fg), hue([255, 20, 147])) < 15, `${mark.bg} ${mark.fg}`);
  // the background never lighter than 0.18 where there are two colours to take
  for (const n of ['navy with an orange stripe', 'orange and navy squares', 'blue to red', 'sunset', 'warm photo', 'cool photo', 'purple to orange', 'rainbow']) {
    assert.ok(toOklab(coverPalette(coverPixels(n)).bg)[0] <= 0.18 + 0.005, n);
  }
});

test('a lifted text colour keeps its cover\'s hue where the screen allows: no bluer or greener than the colour it came from', () => {
  const lift = coverPalette(coverPixels('navy with an orange stripe')).fg, plain = [255, 140, 20];
  assert.ok(wcag(lift, coverPalette(coverPixels('navy with an orange stripe')).bg) >= 7);
  assert.ok(apart(hue(lift), hue(plain)) < 15);
  // the same cover in a darker orange is lifted lighter to read, and still orange
  const dark = coverPalette(pixels((u, v) => (v > 0.7 && v < 0.82 ? [150, 70, 0] : [14, 24, 70])));
  assert.ok(wcag(dark.fg, dark.bg) >= 7 && apart(hue(dark.fg), hue([150, 70, 0])) < 15, `${dark.fg} on ${dark.bg}`);
  assert.ok(toOklab(dark.fg)[0] > toOklab([150, 70, 0])[0] + 0.05, 'lifted');
});

test('a grey cover stays grey, a dark one dark, and a one-colour cover is bluescreen\'s look (white on a deep colour) in its hue', () => {
  const black = coverPalette(coverPixels('black')), grey = coverPalette(coverPixels('mid grey')), white = coverPalette(coverPixels('white'));
  assert.deepEqual(black, { bg: [0, 0, 0], fg: [255, 255, 255] });
  for (const p of [grey, white, coverPalette(coverPixels('light grey')), coverPalette(coverPixels('dark grey'))]) {
    assert.ok(chroma(p.bg) < 0.005 && toOklab(p.bg)[0] <= 0.18 + 0.005, `${p.bg}`);
    assert.ok(chroma(p.fg) < 0.005 && wcag(p.fg, p.bg) >= 7);
  }
  for (const [name, rgb] of [['red', [220, 20, 40]], ['blue', [20, 40, 200]], ['neon magenta', [255, 0, 255]], ['neon green', [57, 255, 20]], ['yellow', [255, 224, 0]]]) {
    const p = coverPalette(coverPixels(name));
    assert.deepEqual(p.fg, [255, 255, 255], name);
    assert.ok(apart(hue(p.bg), hue(rgb)) < 12, `${name}: bg hue ${hue(p.bg)} against ${hue(rgb)}`);
    assert.ok(chroma(p.bg) > 0.06, `${name}: ${chroma(p.bg)}`); // (yellow cannot be much more at this lightness: dark yellow is olive)
    assert.ok(toOklab(p.bg)[0] > 0.18 && toOklab(p.bg)[0] <= toOklab(BLUESCREEN.bg)[0] + 0.005, `${name}: as light as bluescreen's at most, ${toOklab(p.bg)[0]}`);
  }
  // blue is where bluescreen is, near enough that the two are hard to tell apart
  const blue = coverPalette(coverPixels('blue'));
  assert.ok(Math.hypot(...toOklab(blue.bg).map((v, i) => v - toOklab(BLUESCREEN.bg)[i])) < 0.04);
  // a faint tint (sepia) is a faint tint: the cover's warm hue, much less of it than a one-colour cover gets
  const sepia = coverPalette(pixels((u, v) => { const l = 120 + 80 * Math.sin(u * 7) * Math.cos(v * 5); return [l, l * 0.85, l * 0.65]; }));
  assert.ok(wcag(sepia.fg, sepia.bg) >= 7 && apart(hue(sepia.bg), 75) < 25 && chroma(sepia.bg) < 0.07, `${sepia.bg} ${sepia.fg}`);
});

test('see-through pixels are not part of the cover: nothing in it is no palette, and a half is the other half', () => {
  assert.equal(coverPalette(pixels(() => [255, 0, 0, 0])), null);
  assert.equal(coverPalette(pixels((u, v) => [255, 0, 0, u < 0.03 && v < 0.5 ? 255 : 0])), null, 'a sliver');
  assert.equal(coverPalette(new Uint8ClampedArray(0)), null);
  const half = coverPalette(pixels((u) => (u < 0.5 ? [220, 20, 40, 255] : [30, 210, 220, 0])));
  assert.deepEqual(half, coverPalette(pixels(() => [220, 20, 40])), 'the opaque half alone');
});

test('themeVars of bluescreen\'s colours are the stylesheet\'s bluescreen, so "no cover" and the first frame of a fade are exactly it', () => {
  const css = fs.readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8');
  const block = css.match(/:root \{([^}]*)\}/)[1], real = {};
  for (const name of THEME_VARS) real[name] = block.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();
  const norm = (v) => (/^#[0-9a-f]{3}$/i.test(v) ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v.replace(/\s+/g, '')).toLowerCase();
  const made = themeVars(BLUESCREEN);
  for (const name of THEME_VARS) assert.equal(norm(made[name]), norm(real[name]), name);
  // and the same rule gives the other fixed themes' structure: ink dark of the background, the tints as the text's alpha
  assert.deepEqual(themeVars({ bg: [0, 0, 0], fg: [255, 255, 255] })['--ink'], '#000000');
  assert.deepEqual(new Set(Object.keys(made)), new Set(THEME_VARS));
});

test('OKLab: sRGB goes there and back, and a colour the screen cannot show loses chroma, not lightness or hue', () => {
  for (const rgb of [[0, 0, 0], [255, 255, 255], [5, 29, 181], [255, 92, 191], [61, 255, 118], [128, 64, 200], [1, 2, 3], [250, 250, 5]]) {
    const back = fromOklab(toOklab(rgb));
    assert.ok(back.every((v, i) => Math.abs(v - rgb[i]) < 1e-3), `${rgb} -> ${back}`); // (the matrices are published to ten places: a thousandth of a level)
  }
  const out = fromOklab([0.5, 0.4, 0.2]), lab = toOklab(out);
  assert.ok(out.every((v) => v >= 0 && v <= 255));
  assert.ok(Math.abs(lab[0] - 0.5) < 0.01, `lightness ${lab[0]}`);
  assert.ok(apart((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360, (Math.atan2(0.2, 0.4) * 180) / Math.PI) < 3, 'hue kept');
  assert.deepEqual(fromOklab([2, 0, 0]).map(Math.round), [255, 255, 255]);
  assert.deepEqual(fromOklab([-1, 0, 0]).map(Math.round), [0, 0, 0]);
});

test('mixing is in OKLab: the middle of two colours is the middle of their OKLab, not of their sRGB', () => {
  const a = [220, 20, 40], b = [30, 210, 220], mid = mixColours(a, b, 0.5), want = toOklab(a).map((v, i) => (v + toOklab(b)[i]) / 2);
  assert.ok(toOklab(mid).every((v, i) => Math.abs(v - want[i]) < 1e-4));
  assert.ok(Math.abs(mid[0] - (a[0] + b[0]) / 2) > 10, 'which sRGB\'s middle is not');
  assert.deepEqual(mixColours(a, b, 0).map(Math.round), a);
  assert.deepEqual(mixColours(a, b, 1).map(Math.round), b);
});

test('the heat map is five colours from black to near white by way of the text colour', () => {
  for (const fg of [[255, 92, 191], [61, 255, 118], [255, 255, 255], [30, 120, 255]]) {
    const stops = heatStops(fg);
    assert.equal(stops.length, 5);
    assert.ok(stops.every((s) => /^#[0-9a-f]{6}$/.test(s)));
    assert.equal(stops[0], '#000000');
    assert.deepEqual(hexOf(stops[3]), fg);
    const lightness = stops.map((s) => toOklab(hexOf(s))[0]);
    // (rising, but a white text colour is already as light as it goes: its last two are the same)
    assert.ok(lightness.every((v, i) => !i || v > lightness[i - 1] - 1e-9 && (v > lightness[i - 1] || fg.every((c) => c === 255))), `rising: ${lightness}`);
    assert.ok(hexOf(stops[4]).every((v) => v >= 200));
  }
});

// ---------------------------------------------------------------- easing

const RED = coverPalette(coverPixels('navy with an orange stripe')), TEAL = coverPalette(coverPixels('red and cyan halves'));
const shown = (theme, t) => theme.palette(t);
const dist = (p, q) => Math.hypot(...toOklab(p.bg).map((v, i) => v - toOklab(q.bg)[i]), ...toOklab(p.fg).map((v, i) => v - toOklab(q.fg)[i]));

test('with no cover it is bluescreen; a cover eases in over 1.2 s, in OKLab, and is exactly the cover\'s at the end', () => {
  const theme = createDynamicTheme();
  assert.deepEqual(shown(theme, 0), BLUESCREEN);
  assert.equal(theme.update(null, 0), false, 'nothing moves without a cover');
  assert.equal(theme.update(RED, 10), true);
  assert.equal(theme.easing(10), true);
  assert.ok(dist(shown(theme, 10), BLUESCREEN) < 1e-5, 'it starts where it was');
  // halfway (the curve is symmetric): the middle of the two in OKLab
  const mid = shown(theme, 10.6);
  for (const k of ['bg', 'fg']) {
    const want = toOklab(BLUESCREEN[k]).map((v, i) => (v + toOklab(RED[k])[i]) / 2), got = toOklab(mid[k]);
    assert.ok(Math.abs(got[0] - want[0]) < 1e-3, `${k} halfway: as light as the middle of the two`);
    // (white and orange: the middle's chroma is a hair more than the screen has at that lightness, so it loses that, and keeps the hue)
    assert.ok(Math.hypot(got[1], got[2]) <= Math.hypot(want[1], want[2]) + 1e-3 && apart((Math.atan2(got[2], got[1]) * 180) / Math.PI, (Math.atan2(want[2], want[1]) * 180) / Math.PI) < 1, `${k} halfway: its hue`);
  }
  assert.ok(toOklab(mid.bg).every((v, i) => Math.abs(v - (toOklab(BLUESCREEN.bg)[i] + toOklab(RED.bg)[i]) / 2) < 1e-3), 'a colour inside the screen\'s is exactly the middle');
  assert.deepEqual(shown(theme, 11.21), RED);
  assert.deepEqual(shown(theme, 99), RED);
  assert.equal(theme.easing(11.19), true);
  assert.equal(theme.easing(11.21), false);
});

test('the ease is smooth: it only moves one way, a little at a time, slowest at both ends; every frame of it is reported as moved, then it rests', () => {
  const theme = createDynamicTheme(), total = dist(BLUESCREEN, RED);
  theme.update(RED, 0);
  let before = 0, moved = 0, biggest = 0;
  const steps = [];
  for (let f = 1; f <= 90; f++) { // 60 frames a second, 1.5 s
    const t = f / 60, did = theme.update(RED, t), away = dist(shown(theme, t), BLUESCREEN);
    assert.ok(away >= before - 1e-9, `never backwards at ${t}`);
    steps.push(away - before);
    biggest = Math.max(biggest, away - before);
    if (did) moved++;
    before = away;
  }
  assert.equal(moved, 72, 'a frame to frame for the 1.2 s, and the 18 after it quiet');
  assert.ok(biggest < 0.045 * total, `largest step ${(biggest / total).toFixed(3)} of the way`);
  assert.ok(steps[0] < steps[30] / 4 && steps[71] < steps[30] / 4, 'slow at both ends');
  assert.ok(Math.abs(before - total) < 1e-6);
});

test('a cover that comes while one is easing turns it round from where the colours are: no jump', () => {
  const theme = createDynamicTheme();
  theme.update(RED, 0);
  theme.update(RED, 0.5);
  const at = shown(theme, 0.5);
  theme.update(TEAL, 0.5);
  assert.ok(dist(shown(theme, 0.5), at) < 1e-5, 'the same colours the moment after');
  assert.ok(dist(shown(theme, 0.52), at) < 0.03, 'and a small step on');
  assert.deepEqual(shown(theme, 1.7), TEAL);
  theme.update(TEAL, 1.8);
  // the same colours again (another picture of the same album) is not a new ease
  const other = { bg: [...TEAL.bg], fg: [...TEAL.fg] };
  assert.equal(theme.update(other, 5), false);
  assert.equal(theme.easing(5.1), false);
});

test('a cover that goes is held four seconds (the next song\'s arrives a moment later), then bluescreen eases back; one that returns in time changes nothing', () => {
  const theme = createDynamicTheme();
  theme.update(RED, 0);
  theme.update(RED, 2);
  assert.deepEqual(shown(theme, 2), RED);
  for (let t = 3; t < 6.9; t += 1 / 60) assert.equal(theme.update(null, t), false, `held at ${t}`);
  assert.deepEqual(shown(theme, 6.8), RED);
  // the next song's cover comes inside the hold: it eases from the old one, never via bluescreen
  theme.update(TEAL, 5.5);
  let nearest = Infinity;
  for (let t = 5.5; t < 7; t += 1 / 60) { theme.update(TEAL, t); nearest = Math.min(nearest, dist(shown(theme, t), BLUESCREEN)); }
  assert.ok(nearest > 0.1, `never near bluescreen: ${nearest}`);
  assert.deepEqual(shown(theme, 7.1), TEAL);
  // gone for good: after the hold, bluescreen's colours
  theme.update(null, 10);
  theme.update(null, 13.9);
  assert.deepEqual(shown(theme, 13.9), TEAL);
  assert.equal(theme.update(null, 14.01), true);
  assert.deepEqual(shown(theme, 15.3), BLUESCREEN);
  // and a cover that blinks (gone for less than the hold) restarts the hold
  theme.update(RED, 20); theme.update(RED, 22);
  theme.update(null, 23); theme.update(RED, 26); theme.update(null, 27);
  theme.update(null, 30.5);
  assert.deepEqual(shown(theme, 30.5), RED);
  theme.update(null, 31.1);
  assert.equal(theme.easing(31.2), true, 'the hold is over: it turns toward bluescreen');
});

test('picking the theme shows a cover\'s colours at once (jump), and the next song eases from them', () => {
  const theme = createDynamicTheme();
  theme.update(RED, 0); theme.update(RED, 5);
  theme.jump(TEAL);
  assert.deepEqual(shown(theme, 5), TEAL);
  assert.equal(theme.easing(5), false);
  assert.equal(theme.update(TEAL, 5.1), false);
  assert.equal(theme.update(RED, 6), true);
  assert.ok(dist(shown(theme, 6), TEAL) < 1e-5);
});
