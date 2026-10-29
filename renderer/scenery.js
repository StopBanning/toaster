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

import { rolledSceneSource } from './scenery-source.js';
import { SPACE_ART } from './space-art.js';

const PX = 10; // a cell's height (CSS pixels), in a window 500 tall or more
// (in a smaller one, the mini player, finer: the scenes' shapes are sized to the window and the cells
// weren't, so in a 300 px window a koi was a column or two of cells wide and its edges broke up)
const cellPxFor = (H) => (H >= 500 ? PX : Math.max(6, Math.round(H / 50)));
// how long a scene's program has been done before it's shown (ms): the graphics driver's own
// finishing of a shader new to it, about half a second for the bigger scenes, over by then. One
// done within QUICK_MS of being asked for came from the shader cache, nothing new to finish: shown
// at once
const SETTLE_MS = 1500, QUICK_MS = 150;
// the shaders' clock wraps round (a float loses the fine steps as it grows): every 6 hours. At every
// 1000 s, as it did, the code fish, the stingray and the koi pond's petals jumped across the window
// each time (16 min 40 s), several times a set
const CLOCK = 6 * 3600;
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
const SEA_WIDE = { ...WIDE, far: [0.4, 0.055, 0.3, 0.3], lake: [0.4, 0.16], sun: [0.55, 0.86], band: [0.38, 1.2, 0.11, 0.4], toaster: { x: 0.42, y: 0.12, on: 'rock' } };
const SEA_TALL = { ...TALL, far: [0.24, 0.045, 0.3, 0.3], lake: [0.24, 0.085], sun: [0.86, 0.905], band: [5, 1.57, 0.1, 0.3], toaster: { x: 0.3, y: 0.12, on: 'rock' } };
const FIRE_WIDE = { ...WIDE, far: [0.42, 0.06, 0.5, 0.3], lake: [0.36, 0.14], sun: [0.8, 0.84], band: [0.04, 0.95, 0.13, 0.3], toaster: { x: 0.42, y: 0, on: 'log' }, tint: [1.08, 0.9, 0.76] };
const FIRE_TALL = { ...TALL, far: [0.36, 0.05, 0.5, 0.3], lake: [0.3, 0.1], sun: [0.82, 0.52], band: [0.0, 1.1, 0.12, 0.3], toaster: { x: 0.25, y: 0, on: 'log' }, tint: [1.08, 0.9, 0.76] };
// the snow: far is its mountains; lake the frozen lake's far shore and its near one
// (by day a clear winter sky, so the snow stands out against it)
const SNOW_WIDE = { ...WIDE, far: [0.4, 0.2, 0.36, 0.3], lake: [0.3, 0.09], sun: [0.82, 0.82], band: [5, 1.57, 0.1, 0.3], toaster: { x: 0.38, y: 0.45, on: 'ice' }, tint: [0.82, 0.95, 0.94], cool: true, paperD: [[124, 170, 224], [206, 224, 244]] };
const SNOW_TALL = { ...TALL, far: [0.34, 0.18, 0.36, 0.3], lake: [0.26, 0.07], sun: [0.86, 0.905], band: [5, 1.57, 0.1, 0.3], toaster: { x: 0.3, y: 0.45, on: 'ice' }, tint: [0.82, 0.95, 0.94], cool: true, paperD: [[124, 170, 224], [206, 224, 244]] };
// the city: lake is the far kerb (where the buildings stand) and the near kerb
const CITY_WIDE = { ...WIDE, lake: [0.24, 0.12], toaster: { x: 0.7, y: -0.6, on: 'umbrella' }, tint: [1.02, 0.9, 0.86], cool: true, toneN: [0.17, 0.08, 0.15], paperD: [[180, 189, 208], [226, 230, 238]] };
const CITY_TALL = { ...TALL, lake: [0.2, 0.1], toaster: { x: 0.55, y: -0.6, on: 'umbrella' }, tint: [1.02, 0.9, 0.86], cool: true, toneN: [0.17, 0.08, 0.15], paperD: [[180, 189, 208], [226, 230, 238]] };
// the garden: lake is the pond's far bank and its near one
const GARDEN_WIDE = { ...WIDE, lake: [0.3, 0.05], sun: [0.58, 0.83], band: [0.2, 0.7, 0.12, 0.3], toaster: { x: 0.66, y: 0, on: 'bridge' } };
const GARDEN_TALL = { ...TALL, lake: [0.26, 0.05], sun: [0.86, 0.905], band: [0.1, 1.0, 0.1, 0.3], toaster: { x: 0.62, y: 0, on: 'bridge' } };
// the falls: far.x is the lip; mid the hills behind it; lake the pool's far edge and its near bank
const FALLS_WIDE = { ...WIDE, far: [0.62, 0, 0, 0.3], mid: [0.64, 0.07, 0.3, 0.3], lake: [0.24, 0.04], sun: [0.8, 0.86], band: [0.75, 1.3, 0.13, 0.3], toaster: { x: 0.66, y: 0.5, on: 'tube' }, cool: true };
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
// the koi pond: all water, seen from above as the sharks' is; the toaster on a lily pad (a share of
// the width across, of the height up); the pond's paper, jade by day, dark by night; under a cell's
// tone, by day, the shadows of the koi and the pads on the bottom
const KOI_LOOK = { far: [0, 0, 0, 0.3], lake: [1, 0], band: [5, 1.57, 0.1, 0.3], tint: [0.8, 0.9, 0.94], toneN: [0.04, 0.1, 0.08], toneD: [-0.1, -0.07, -0.06], paperN: [[3, 12, 12], [6, 22, 20]], paperD: [[88, 148, 122], [116, 170, 138]] };
const KOI_WIDE = { ...WIDE, ...KOI_LOOK, toaster: { x: 0.68, y: 0.32, on: 'pad' } };
const KOI_TALL = { ...TALL, ...KOI_LOOK, toaster: { x: 0.6, y: 0.17, on: 'pad' } };
// the festival: a stage on the far shore of a lake in the mountains; lake its far shore (the stage's
// foot) and its near one (where the crowd stands); stage its middle (a share of the width), its
// floor and its half width (units of the height), handed to the shader as moon; the toaster at its
// decks, on the floor
const FESTIVAL_WIDE = { ...WIDE, far: [0.36, 0.3, 0.4, 0.32], mid: [0.33, 0.15, 0.27, 0.56], near: [0.32, 0.022, 3.2, 0.86], lake: [0.32, 0.12], stage: [0.63, 0.335, 0.21], sun: [0.9, 0.86], band: [0.62, 1.28, 0.11, 0.35], tint: [1.0, 0.88, 1.0] };
const FESTIVAL_TALL = { ...TALL, far: [0.27, 0.28, 0.4, 0.32], mid: [0.24, 0.14, 0.27, 0.56], near: [0.23, 0.018, 3.2, 0.86], lake: [0.23, 0.08], stage: [0.5, 0.243, 0.17], sun: [0.86, 0.55], band: [5, 1.57, 0.1, 0.3], tint: [1.0, 0.88, 1.0] };
const onStage = (L, x) => ({ x, y: (L.stage[1] - L.lake[1]) / (L.lake[0] - L.lake[1]), on: 'decks' });
for (const L of [FESTIVAL_WIDE, FESTIVAL_TALL]) L.toaster = onStage(L, L.stage[0]);
// space: on the moon, the Earth in its sky (its middle where the sun is: a share of the width, a height);
// lake its ground's far edge and the lander's foot; the toaster floating over it on its cord (its middle:
// a share of the width across, of the height up); Saturn small and far (planet), the astronaut on its
// line from the window's top (astro: a share of the width across); the deep's paper by night, a pastel
// dawn's by day. In a tall window the code and its panels fill the top and the left: the toaster floats on
// the right beside them, the Earth rising over the horizon under it (the ground hiding its foot)
// (space's Milky Way: its core (a share of the width, a height), its tilt and its width; night in every
// theme, so its day paper is its night's)
const SPACE_LOOK = { band: [0.6, 0.55, 0.46, 0.11], tint: [0.94, 0.94, 1.0], toneN: [0.06, 0.06, 0.1], toneD: [0.06, 0.06, 0.1], paperN: [[2, 3, 10], [10, 10, 26]], paperD: [[2, 3, 10], [10, 10, 26]] };
const SPACE_WIDE = { ...WIDE, ...SPACE_LOOK, far: [0.22, 0, 0, 0.3], lake: [0.22, 0.1], sun: [0.79, 0.7], planet: [0.47, 0.86], astro: [0.94], toaster: { x: 0.82, y: 0.5, on: 'space' } };
const SPACE_TALL = { ...TALL, ...SPACE_LOOK, band: [0.42, 0.3, 0.62, 0.085], far: [0.15, 0, 0, 0.3], lake: [0.15, 0.06], sun: [0.86, 0.21], planet: null, astro: null, bow: 0.35, toaster: { x: 0.84, y: 0.42, on: 'space' } };
// the eye: a real eye's footage drawn in glyphs, filling the window (see EYE and EYE_CLIP); its own
// paper, near black, night whatever the theme (as space). No toaster in it: its space is photos drawn in
// glyphs, and the toaster in pixels there looked pasted on (its place below only where it glides from when
// the scene changes)
const EYE_LOOK = { band: [5, 1.57, 0.1, 0.3], tint: [1.0, 0.96, 0.92], toneN: [0.04, 0.03, 0.03], toneD: [0.04, 0.03, 0.03], paperN: [[3, 2, 2], [8, 6, 5]], paperD: [[3, 2, 2], [8, 6, 5]] };
// (moon: the eye's middle, a share of the width and of the height up, and the share of the window's width
// it spans: beside the code in a wide window, under it in a tall one)
// (planet: where Saturn comes to in the pupil's space, a share of the width across and of the height up;
// gal: the galaxy's radius once the dive's in (window heights) and its middle (from the pupil's, in that
// radius): clear of the code either way (in a tall window, all under its panels))
const EYE_WIDE = { ...WIDE, ...EYE_LOOK, moon: [0.62, 0.5, 0.6], planet: [0.87, 0.8], satW: 0.13, gal: [0.5, 0.4, -0.22], toaster: { x: 0.5, y: 0.16, on: 'eye' } };
const EYE_TALL = { ...TALL, ...EYE_LOOK, moon: [0.5, 0.15, 0.86], planet: [0.8, 0.26], satW: 0.085, gal: [0.3, 0, 0.1], toaster: { x: 0.2, y: 0.08, on: 'eye' } };
// (the stage's glow on the paper: the show's first colours, as the shader has them, dimmed)
const FESTIVAL_GLOW = [[0.3, 0.1, 0.25], [0.3, 0.21, 0.08], [0.12, 0.3, 0.2], [0.21, 0.16, 0.3]];
// With the code hidden (Z), what changes where the code kept room: the sharks' float comes to the
// middle (they circle it), and so does the koi's lily pad; in a tall window, where the code fills
// the top two thirds, the land rises (see RAISE) and Halloween's moon into the middle, the toaster
// flying across it; in a wide one the festival's stage moves to the middle, the toaster with it.
// (wide, tall: null if nothing changes)
// (a tall window's land, raised by d (units of the height): every range and both shores, and the
// sun or moon with them. Kept low under the code, it put the toaster in the bottom fifth, under the
// caption and the name a phone lays over a reel)
const RAISE = (L, d) => ({ far: [L.far[0] + d, ...L.far.slice(1)], mid: [L.mid[0] + d, ...L.mid.slice(1)], near: [L.near[0] + d, ...L.near.slice(1)], lake: [L.lake[0] + d, L.lake[1] + d], sun: [L.sun[0], Math.min(0.92, L.sun[1] + d)] });
const OPEN = {
  lake: [null, RAISE(TALL, 0.17)],
  sea: [null, RAISE(SEA_TALL, 0.17)],
  fire: [null, RAISE(FIRE_TALL, 0.17)],
  snow: [null, RAISE(SNOW_TALL, 0.17)],
  city: [null, RAISE(CITY_TALL, 0.21)],
  garden: [null, RAISE(GARDEN_TALL, 0.17)],
  falls: [null, RAISE(FALLS_TALL, 0.17)],
  sharks: [{ toaster: { x: 0.5, y: 0.45, on: 'float' } }, { toaster: { x: 0.5, y: 0.42, on: 'float' } }],
  koi: [{ toaster: { x: 0.5, y: 0.45, on: 'pad' } }, { toaster: { x: 0.5, y: 0.42, on: 'pad' } }],
  halloween: [null, { ...RAISE(HALLOWEEN_TALL, 0.18), moon: [0.5, 0.56, 0.22], sun: [0.5, 0.56], toaster: { x: 0.66, y: 0.6, on: 'broom' } }],
  festival: [{ stage: [0.5, FESTIVAL_WIDE.stage[1], FESTIVAL_WIDE.stage[2]], toaster: onStage(FESTIVAL_WIDE, 0.5) }, null],
  space: [null, { ...RAISE(SPACE_TALL, 0.17), band: [0.45, 0.56, 0.62, 0.09], planet: [0.24, 0.8], toaster: { x: 0.62, y: 0.58, on: 'space' } }],
  eye: [{ moon: [0.5, 0.5, 0.72] }, { moon: [0.5, 0.48, 0.96] }],
};
// (the land's parts that glide when Z raises it)
const LAND = ['far', 'mid', 'near', 'lake', 'sun'];
const LAYOUT = { lake: [WIDE, TALL], sea: [SEA_WIDE, SEA_TALL], fire: [FIRE_WIDE, FIRE_TALL], snow: [SNOW_WIDE, SNOW_TALL], city: [CITY_WIDE, CITY_TALL], garden: [GARDEN_WIDE, GARDEN_TALL], falls: [FALLS_WIDE, FALLS_TALL], halloween: [HALLOWEEN_WIDE, HALLOWEEN_TALL], sharks: [SHARKS_WIDE, SHARKS_TALL], festival: [FESTIVAL_WIDE, FESTIVAL_TALL], koi: [KOI_WIDE, KOI_TALL], space: [SPACE_WIDE, SPACE_TALL], eye: [EYE_WIDE, EYE_TALL] };
const SPEED = [1, 0.5, 0.25, 0.12, 0.2];
// the glyphs the scene draws with (the first, blank, is nothing there)
const GLYPHS = {
  BLANK: ' ', DOT: '.', MID: '·', COMMA: ',', TICK: "'", COLON: ':', DASH: '-', TILDE: '~', EQ: '=', APPROX: '≈', UNDER: '_',
  CARET: '^', SLASH: '/', BACK: '\\', BAR: '|', LP: '(', RP: ')', STAR: '*', PLUS: '+', SMALLO: 'o', BIGO: 'O', AT: '@', PCT: '%',
  VEE: 'v', TRI: '▲', TRIO: '△', LIGHT: '░', MEDIUM: '▒', DARK: '▓', HATCH: '╱', HATCHB: '╲', DBL: '═', LINE: '─',
  SPARK: '✦', BULLET: '•', QUOTE: '"', LT: 'T', LA: 'A', LS: 'S', LESS: '<', MORE: '>', LP2: 'P', LE: 'E', LN: 'N', LH: 'H', LL: 'L', LR: 'R', LI: 'I',
  HASH: '#', DOLLAR: '$', SEMI: ';', SMALLI: 'i', SMALLX: 'x', EIGHT: '8', GRAVE: '`',
  VLINE: '│', VHEAVY: '┃', HHEAVY: '━',
};
// (and on the sheet after them, characters only the sharks' code fish draws with: kept out of GLYPHS,
// so the program every scene shares (LIB) stays as it was and no other scene has to compile again;
// past 63, so never in the art below, which keeps its glyph under 64)
const EXTRA = [...'0123456789!?&[]{}'];
const SHEET = [...Object.values(GLYPHS), ...EXTRA];
// the field of glyphs while the scenery gets ready (PAINT's idle) draws with every glyph but the blank, a
// cell the size the scenes' are; the app's other backgrounds wait in the same field (wait.js)
export const FIELD = { glyphs: SHEET.slice(1), cellPx: cellPxFor };
const DEFS = Object.keys(GLYPHS).map((k, i) => `#define G_${k} ${i}`).join('\n');
// the code fish's characters, as places on the sheet: digits and the code's punctuation
const CODE_CHARS = [...'0123456789$%#@*+=-~<>/!?&[]{}'].map((c) => SHEET.indexOf(c));
// Halloween's art (the jack-o'-lanterns), as the shader's
// constant arrays: each cell the glyph's place on the sheet plus 64 times its part (1 an outline, 2 lit:
// a carved hole, a bat's eye; 3 a stem; 4 inside: a pumpkin's body, a bat's head)
const PUMPKIN_ART = [[["          _)_          ", "          sss          "], ["     .-'~~~|~~~'-.     ", "     ooooooooooooo     "], ["   .'(( (( | )) ))'.   ", "   oobbbbbbbbbbbbboo   "], ["  /((  /\\ ( ) /\\  ))\\  ", "  obbbbffbbbbbffbbbbo  "], [" |((( /__\\(|)/__\\ )))| ", " obbbbffffbbbffffbbbbo "], [" |((((   (/_\\)   ))))| ", " obbbbbbbbfffbbbbbbbbo "], ["  \\((\\/\\/\\/\\/\\/\\/\\))/  ", "  obbfffffffffffffbbo  "], ["   '.(( \\/\\/\\/\\ )).'   ", "   oobbbfffffffbbboo   "], ["      '-._____.-'      ", "      ooooooooooo      "]], [["     _|,     ", "     sss     "], ["  .-'~|~'-.  ", "  ooooooooo  "], [" /(( ▲|▲ ))\\ ", " obbbfbfbbbo "], ["|(((  ^  )))|", "obbbbbfbbbbbo"], [" \\(( \\_/ ))/ ", " obbbfffbbbo "], ["  '-.___.-'  ", "  ooooooooo  "]], [["     _|_     ", "     sss     "], ["  .-'~|~'-.  ", "  ooooooooo  "], [" /(\\\\ | //)\\ ", " obffbbbffbo "], ["|(( (( )) ))|", "obbbbbbbbbbbo"], [" \\( \\/\\/\\ )/ ", " obbfffffbbo "], ["  '-.___.-'  ", "  ooooooooo  "]]];
// The garden's pagoda: three roofs, their eaves turned up at the ends, red walls with windows (lit at
// night), the spire on top and a stone base (parts: 1 an outline, 2 lit, 3 the spire, 5 a wall, 6 a
// roof's tiles, 7 the base)
const PAGODA_ART = [[
  ['          ┃          ', '          s          '],
  ['         ═┃═         ', '         sss         '],
  ['       _.-^-._       ', '       ooooooo       '],
  ["    '-.~~~~~~~.-'    ", '    ooorrrrrrrooo    '],
  ['       |▒▓▒▓▒|       ', '       owfwfwo       '],
  ['     _.~~~~~~~._     ', '     oorrrrrrroo     '],
  ["  '-.~~~~~~~~~~~.-'  ", '  ooorrrrrrrrrrrooo  '],
  ['      |▒▓▒▓▒▓▒|      ', '      owfwfwfwo      '],
  ['    _.~~~~~~~~~._    ', '    oorrrrrrrrroo    '],
  ["'-.~~~~~~~~~~~~~~~.-'", 'ooorrrrrrrrrrrrrrrooo'],
  ['    |▒▓▒▒▓▓▓▒▒▓▒|    ', '    owfwwfffwwfwo    '],
  ['   ═══════════════   ', '   ggggggggggggggg   '],
], [ // (two roofs, for a short window)
  ['     ┃     ', '     s     '],
  ['   _.^._   ', '   ooooo   '],
  ["  '-~~~-'  ", '  oorrroo  '],
  ['   |▒▓▒|   ', '   owfwo   '],
  ["'-.~~~~~.-'", 'ooorrrrrooo'],
  ['  |▒▓▓▓▒|  ', '  owfffwo  '],
  [' ═════════ ', ' ggggggggg '],
]];
function artArrays(name, art) {
  const part = { o: 1, f: 2, s: 3, b: 4, w: 5, r: 6, g: 7 };
  return art.map((rows, k) => {
    const cells = rows.flatMap(([a, roles]) => [...a].map((c, i) => (part[roles[i]] ? SHEET.indexOf(c) + 64 * part[roles[i]] : 0)));
    return `const int ${name}${k}[${cells.length}] = int[${cells.length}](${cells.join(', ')});`;
  }).join('\n');
}

const VS = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// The scene, a cell at a time: its glyph (its place on the sheet), its ink (0-1), its tone, its
// colour and its tile, packed into one texel.
const LIB = `#version 300 es
precision highp float;
precision highp int;
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
uniform float moonLit;              // by night, how much of the moon is lit (1 full, 0.5 half): its halo and its wash
uniform vec4 band;                  // the Milky Way: x at the horizon, tilt, width, the core along it
uniform vec4 car;                   // the city's car: x of its back, -, its colour (0-1), on (1); halloween's broom: the end of its bristles (x, y), -, on
uniform vec4 leap;                  // the falls' fish leaping, halloween's ghost rising: its age (s), which side (-1, 1), which (0-1), on (1)
uniform vec4 moon;                  // halloween's great moon: its centre (units of the height), its radius; the festival's stage: its middle, its floor, its half width
uniform vec4 sea;                   // the sea: the beam's turn (radians), the koi's swim (leaping on kicks), the waves' phase (beats), a kick's splash (0-1)
// (one output, the cell packed: x its glyph, ink and tone, y its colour, z its tile, a byte each.
// One, not three: on Windows a program compiled in the background is ready for one output, and
// drawing to more made it compile again at its first draw, holding everything up for seconds)
layout(location = 0) out highp uvec4 o;
uint b8(float v) { return uint(clamp(v, 0.0, 1.0) * 255.0 + 0.5); }
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
float front = 0.5;       // (how near for the pixel layer: 0 the sky, 0.5 most things, 1 in front: a lily pad over a koi)
// (a tile: the cell filled with a colour under its glyph, how strongly: the sharks' skin, the light's
// net under them)
vec3 tileC = vec3(0.0);
float tileA = 0.0;
float richSky = 0.0;      // (the night-only scenes' sky: a gradient, the moon's wash, the Milky Way in haze)
void put(int g, float ink, vec3 c) {
  if (over != 0 && !solid) { g = over; ink = overInk; c = overC; }
  o = uvec4((uint(g) & 255u) | (b8(ink) << 8) | (b8(tone) << 16), b8(c.r) | (b8(c.g) << 8) | (b8(c.b) << 16),
    b8(tileC.r) | (b8(tileC.g) << 8) | (b8(tileC.b) << 16) | (b8(tileA) << 24), b8(front));
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
// A range (see peak) drawn solid: i 1 the middle one, 2 the far one; lx the cell's x along it (where it
// scrolls), the light on the side of lightX. Its faces filled, the lit one lighter and the one in shade
// darker, paler toward the foot in the haze (the far range paler all through); snow on the high peaks,
// its foot ragged, a drip of it into the rock below; the ridge in its outline glyphs along the top,
// over the face as far as the cell's in it; a little texture, sparse. True if it drew the cell.
bool drawRange(int i, float lx, float Y, float h0, float lightX) {
  float tl = peak(i, lx - 0.5 * cw).x, tr = peak(i, lx + 0.5 * cw).x;
  vec4 pk = peak(i, lx);
  float tc = pk.x;
  if (Y - 0.5 * ch > max(max(tl, tr), tc)) return false;
  vec4 L = i == 1 ? midL : farL;
  bool lit = (lx - (pk.y + (pk.z - Y) * 0.2)) * (lightX - pk.y) > 0.0;
  float d = tc - Y;
  float snowD = pk.w > 0.1 * L.y / 0.4 ? (0.32 + 0.1 * (vn(lx * 31.0) - 0.5)) * pk.w : 0.0;
  snowD = max(0.0, snowD - (pk.z - tc));
  if (snowD > 0.0) snowD += ch * 1.6 * (vn(lx * 90.0 + float(i) * 7.0) - 0.4);
  bool snow = d < snowD;
  float up = clamp((Y - L.x) / max(1e-3, pk.z - L.x), 0.0, 1.0);
  float hz = i == 2 ? 0.5 + 0.15 * (1.0 - up) : 0.3 * (1.0 - up);
  vec3 rockL = i == 1 ? P(rgb(52.0, 56.0, 98.0), rgb(146.0, 148.0, 194.0)) : P(rgb(36.0, 40.0, 76.0), rgb(176.0, 180.0, 214.0));
  vec3 rockS = i == 1 ? P(rgb(32.0, 34.0, 66.0), rgb(98.0, 98.0, 148.0)) : P(rgb(26.0, 30.0, 60.0), rgb(152.0, 156.0, 198.0));
  vec3 snowL = P(rgb(168.0, 180.0, 230.0), rgb(250.0, 251.0, 255.0)), snowS = P(rgb(98.0, 110.0, 164.0), rgb(192.0, 198.0, 230.0));
  vec3 paper = P(rgb(14.0, 18.0, 42.0), rgb(242.0, 238.0, 226.0));
  vec3 rock = mix(lit ? rockL : rockS, paper, hz), face = snow ? mix(lit ? snowL : snowS, paper, hz * 0.6) : rock;
  if (abs(tc - Y) <= 0.5 * ch || (Y - tl) * (Y - tr) <= 0.0) {
    float rise = (tr - tl) / ch, lo = Y - 0.5 * ch, hi2 = Y + 0.5 * ch;
    bool top = tc > tl + 0.15 * ch && tc > tr + 0.15 * ch, stays = tl >= lo && tl < hi2 && tr >= lo && tr < hi2;
    int g = top && hi2 > tc ? G_CARET : (stays && abs(rise) < 0.9 ? ((tl + tr) * 0.5 < Y ? G_UNDER : G_DASH) : (rise > 0.0 ? G_SLASH : G_BACK));
    tileC = face; tileA = clamp(0.5 + d / ch, 0.2, 0.8);
    put(g, 0.9, snow ? mix(face, vec3(1.0), 0.35) : mix(face, P(rgb(130.0, 138.0, 210.0), rgb(54.0, 54.0, 96.0)), 0.55));
    return true;
  }
  tileC = face; tileA = 1.0;
  if (!snow && snowD > ch && d < snowD + 0.9 * ch) { put(G_VEE, 0.85, mix(lit ? snowL : snowS, paper, hz * 0.6)); return true; }
  int g = snow ? (h0 < 0.05 ? G_MID : 0) : (h0 < 0.06 ? G_DASH : h0 < 0.09 ? G_DOT : 0);
  put(g, 0.4, face * (snow ? 1.06 : 0.78));
  return true;
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
// the night-only scenes' sky colour at height Y: deep navy overhead, lifting to a dusky violet over the
// horizon
vec3 nightGrad(float Y, float horizon) {
  float up = smoothstep(horizon, 1.0, Y);
  return mix(mix(rgb(52.0, 34.0, 84.0), rgb(20.0, 22.0, 62.0), smoothstep(0.0, 0.35, up)), rgb(5.0, 7.0, 24.0), smoothstep(0.3, 1.0, up));
}
// The sky, for every scene: birds or a falling star, the sun and its rays or the moon and its halo, the
// stars and the Milky Way (above horizon), the airglow (above glowAt), the clouds; else nothing.
void sky(vec2 cell, float X, float Y, float h0, float horizon, float glowAt) {
  front = 0.0;                        // (the sky's the furthest thing: the pixel moon over it)
  vec2 Pc = vec2(X, Y);
  vec2 sun = sunAt;
  float R = day ? 0.062 : 0.07;
  // (the birds are in pixels: see drawBird)
  #define INSUN(p) (length((p) - sun) < R)
  if (day) {
    // the sun: a solid disc in warm bands (pale at its heart, deepening to orange at its rim), its
    // edge soft where a cell's only partly in it; and its rays breathing with the loudness
    if (INSUN(Pc)) {
      int g = edge4(!INSUN(Pc + vec2(0.0, ch)), !INSUN(Pc - vec2(0.0, ch)), !INSUN(Pc - vec2(cw, 0.0)), !INSUN(Pc + vec2(cw, 0.0)));
      float rr = length(Pc - sun) / R;
      tileC = rr < 0.5 ? rgb(255.0, 242.0, 186.0) : rr < 0.78 ? rgb(255.0, 214.0, 122.0) : rgb(255.0, 176.0, 92.0);
      tileA = g != 0 ? 0.6 : 1.0;
      put(0, 0.0, vec3(0.0));
      return;
    }
    vec2 ds = Pc - sun;
    float rs = length(ds);
    if (rs > R * 1.35 && rs < R * (1.7 + 0.7 * glow)) {
      float an = atan(ds.y, ds.x), k = an / (3.14159265 / 4.0), off = abs(k - floor(k + 0.5));
      if (off * rs < 0.55 * cw) { int q = int(mod(floor(k + 0.5) + 8.0, 4.0)); put(q == 0 ? G_DASH : q == 2 ? G_BAR : q == 1 ? G_SLASH : G_BACK, 1.0, rgb(255.0, 170.0, 90.0)); return; }
    }
  } else {
    // the moon: drawn in pixels over the sky (see drawMoon), so nothing here but the dark it sits in;
    // a halo round it
    float rmoon = length(Pc - sun) / R;
    if (richSky > 0.5) {
      // (the gradient; the moon's light washed round it)
      tileC = nightGrad(Y, horizon);
      tileC += rgb(70.0, 80.0, 130.0) * 0.5 * (0.3 + 0.7 * moonLit) * exp(-max(rmoon - 1.0, 0.0) * 0.55);
      tileA = 1.0;
    }
    if (rmoon < 1.0) { put(0, 0.0, vec3(0.0)); return; }
    float rm = rmoon;
    // (a crescent's halo thinner than the full moon's)
    if (rm > 1.35 && rm < 2.6 && h0 < 0.5 * moonLit * exp(-(rm - 1.35) * 1.6)) { put(rm < 1.6 ? G_MID : G_DOT, 0.8, rgb(150.0, 160.0, 205.0) * (1.25 - 0.3 * rm)); return; }
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
    float chance = (richSky > 0.5 ? 0.05 : 0.035) * (1.0 + 4.0 * min(1.0, gal));
    if (richSky > 0.5 && gal > 0.02 && Y > horizon + 0.01) tileC = mix(tileC, mix(rgb(84.0, 96.0, 160.0), rgb(170.0, 128.0, 140.0), warm), clamp(0.4 * gal, 0.0, 0.42));
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
      vec3 c = mix(rgb(255.0, 254.0, 250.0), rgb(204.0, 210.0, 232.0), smoothstep(0.006, -0.03, under));
      if (pass == 1) c = mix(c, rgb(238.0, 236.0, 232.0), 0.4);
      tileC = c; tileA = g != 0 ? 0.55 : 1.0;
      put(g != 0 && under < 0.0 ? g : 0, 0.45, mix(c, rgb(150.0, 158.0, 196.0), 0.55));
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
        if (b > 0.08) { over = b > 0.5 ? G_BULLET : G_MID; overInk = 0.45 + 0.55 * b; overC = rgb(255.0, 230.0, 128.0); break; }
      } else if (b > 0.55 && abs(X - f.x) < cw * 1.5 && abs(Y - f.y) < ch * 1.2) { over = G_DOT; overInk = 0.5 * b; overC = rgb(255.0, 214.0, 110.0); break; }
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
    // (the ground solid, darker toward you; the blades, the tufts and the flowers over it)
    if (Y < ground) { tileC = mix(P(rgb(18.0, 50.0, 38.0), rgb(98.0, 156.0, 74.0)), P(rgb(10.0, 30.0, 26.0), rgb(66.0, 120.0, 52.0)), near); tileA = 1.0; }
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
    else if (Y >= ground && Y < ground + ch && h1(gx * 1.3) < 0.4) { g = h1(gx * 2.1) < 0.5 ? G_COMMA : G_TICK; c = tip; tileC = P(rgb(16.0, 26.0, 62.0), rgb(106.0, 156.0, 208.0)); tileA = 1.0; }
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
    // (the water solid, paler toward the far shore where it holds the sky, deeper toward you)
    vec3 water = mix(P(rgb(34.0, 52.0, 104.0), rgb(180.0, 208.0, 234.0)), P(rgb(16.0, 26.0, 62.0), rgb(106.0, 156.0, 208.0)), depth);
    tileC = water; tileA = 1.0;
    // the trees' reflections
    float tt, tb;
    vec4 tr = tree(xs[0] + wob, tt, tb);
    if (!hit && Ym < tt && Ym > max(tb, hill(xs[0] + wob))) {
      hit = true;
      vec3 rc = tr.w > 0.5 ? P(rgb(120.0, 54.0, 96.0), rgb(214.0, 136.0, 172.0)) : P(rgb(12.0, 44.0, 36.0), rgb(60.0, 118.0, 78.0));
      if (streak > 0.22) tileC = mix(water, rc, (day ? 0.5 : 0.66) - 0.3 * depth);
      if (streak > 0.6) { g = G_TILDE; c = mix(rc, water, 0.4); ink = 0.6; }
    }
    if (!hit && Ym < hill(xs[0] + wob) + 0.5 * ch) {
      hit = true;
      if (streak > 0.3) tileC = mix(water, P(rgb(10.0, 36.0, 30.0), rgb(70.0, 118.0, 80.0)), 0.6 - 0.3 * depth);
    }
    for (int i = 1; i < 3 && !hit; i++) {
      float t0 = peak(i, xs[i] + wob).x;
      if (Ym < t0 + 0.5 * ch) {
        hit = true;
        bool edge = abs(Ym - t0) < ch * 0.8;
        vec3 rc = i == 1 ? P(rgb(60.0, 56.0, 112.0), rgb(146.0, 154.0, 200.0)) : P(rgb(44.0, 50.0, 96.0), rgb(166.0, 182.0, 214.0));
        if (streak > (edge ? 0.25 : 0.4)) tileC = mix(water, rc, (edge ? 0.6 : 0.45) * (day ? 0.75 : 1.0) - 0.25 * depth);
        if (edge && streak > 0.55) { g = G_TILDE; c = mix(rc, vec3(1.0), 0.2); ink = 0.6; }
      }
    }
    if (!hit && streak > 0.87) { g = G_DASH; ink = 0.45; c = P(rgb(60.0, 84.0, 140.0), rgb(214.0, 232.0, 246.0)); }
    // the path of the light: glints that come and go
    float path = abs(X - sunAt.x) - 0.01 - 0.06 * depth;
    if (path < 0.0) {
      float tw = h2(vec2(cell.x, row) + floor(time * 2.0));
      tileC = mix(tileC, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 226.0, 160.0)), 0.18);
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
        // a tree in blossom: its crown solid, in puffs of pink, lighter on top and on the side toward
        // the light, deeper under; a few petals white in it; its trunk below
        if (u < 0.3 && abs(lx - tr.x) < cw * 0.6) { tileC = P(rgb(66.0, 44.0, 50.0), rgb(108.0, 72.0, 58.0)); tileA = 1.0; put(G_BAR, 0.5, tileC * 1.25); return; }
        float puff = vn2(vec2(lx * 150.0, Y * 100.0) + tr.x * 37.0);
        float sh = clamp(u - 0.34 + (lit ? 0.26 : -0.12) + 0.4 * (puff - 0.5), 0.0, 1.0);
        vec3 c = mix(P(rgb(118.0, 46.0, 92.0), rgb(204.0, 82.0, 136.0)), P(rgb(250.0, 178.0, 214.0), rgb(255.0, 196.0, 220.0)), sh);
        tileC = c; tileA = clamp((top - Y) / ch + 0.5, 0.45, 1.0);
        float k = h2(vec2(floor(lx / cw), row) + 21.0);
        put(k < 0.1 && sh > 0.4 ? G_STAR : (k < 0.16 ? G_MID : 0), 0.7, mix(c, vec3(1.0), 0.5));
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
      vec3 pc = mix(dark, light, lit ? 0.75 - 0.3 * u : 0.15);
      tileC = pc * (day ? 0.82 : 0.58); tileA = ax > hw - cw * 0.9 ? 0.5 : 0.92;
      put(g, 0.95, mix(pc, vec3(1.0), 0.12) * (day ? 1.0 : 0.8));
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

  // --- the ranges, the middle then the far one, solid (see drawRange)
  for (int i = 1; i < 3; i++) if (drawRange(i, xs[i], Y, h0, lightX)) return;

  sky(cell, X, Y, h0, farL.x, farL.x + farL.y * 0.2);
}`;

// The sea: a lighthouse on a cliff, waves rolling in to a beach, islands far out (lake.x: the
// horizon; lake.y: the shore). Its two beams turn once every 2 bars, one flashing at you on each
// bar's first beat; the waves roll in one every 2 beats; a kick throws foam up the beach.
const SEA = `
// the headland's top at x: rising from the right edge to a crown under the lighthouse, then a
// rounded shoulder falling to the sea about a third of the way in; jagged a little (on the right,
// out from under the code)
// (its smooth line, before the shelf and the jags)
float cliffLine(float x, float aspect) {
  float a = 1.0 - x / aspect;
  float crown = lake.x + mix(0.1, 0.12, clamp((aspect - 0.56) / 1.22, 0.0, 1.0));
  float rise = mix(0.72, 1.0, smoothstep(-0.05, 0.16, a));
  float fall = 1.0 - smoothstep(0.17, 0.35, a);
  return lake.y + (crown - lake.y) * rise * pow(fall, 0.6);
}
float cliffTop(float x, float aspect) {
  float a = 1.0 - x / aspect, fall = 1.0 - smoothstep(0.17, 0.35, a);
  float top = cliffLine(x, aspect);
  // a level shelf for the keeper's cottage, from the lighthouse's foot out past the cottage's far
  // wall, its edge rounding off (where the crown's wide enough for the cottage: see pixFor)
  float S = max(1.0, floor(view.y / 270.0 + 0.5)), lx = 0.84 * aspect, kx = lx - 31.0 * S / view.y, edge = kx - 15.0 * S / view.y;
  float T = cliffLine(lx, aspect);
  if (x < lx && cliffLine(kx, aspect) > T - 0.09) top = max(top, mix(top, T, smoothstep(edge - 0.1, edge, x)));
  float jag = smoothstep(0.02, 0.06, abs(x - 0.84 * aspect + 0.05) - 0.1);   // (none on the lighthouse's crown)
  return top + (0.014 * (vn(x * 23.0) - 0.5) * fall + 0.007 * (vn(x * 91.0) - 0.5)) * jag;
}
// a beam's glyph by its direction on the screen (a, radians), the cells being taller than wide
int beamGlyph(float a) {
  float c = mod(atan(sin(a) / ch, cos(a) / cw), 3.14159265);
  return c < 0.3927 || c > 2.7489 ? G_LINE : c < 1.1781 ? G_SLASH : c < 1.9635 ? G_BAR : G_BACK;
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = false; richSky = 1.0;     // (night only, whatever the theme)
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H, horizon = lake.x, shore = lake.y;

  // (a crab walks the beach: in pixels, over the glyphs: see drawCrab)
  // --- the beach, in front: sand in dots, darker where it's wet, a shell here and there
  float wash = shore + 0.012 + 0.006 * sin(X * 23.0 + time * 0.9) + 0.01 * sea.w;   // how far up the sea comes
  if (Y < shore) {
    float wet = smoothstep(shore - 0.03, shore, Y);
    int g = 0;
    if (h0 < 0.012) g = h2(cell + 4.0) < 0.5 ? G_SMALLO : G_STAR;                       // shells
    else if (h0 < 0.1 + 0.15 * wet) g = h0 < 0.05 ? G_DOT : (h0 < 0.08 ? G_COLON : G_COMMA);
    // (solid: the sand pale where it's dry, darker toward the water where it's wet; its grains and the
    // shells over it)
    float fr = clamp((shore - Y) / max(shore, 1e-3), 0.0, 1.0);
    // (ripples the wind left in the sand, a little lighter on their crests)
    float rip = 0.94 + 0.08 * sin(Y * 260.0 + 4.0 * vn(X * 7.0));
    tileC = mix(mix(P(rgb(64.0, 62.0, 92.0), rgb(236.0, 212.0, 160.0)), P(rgb(52.0, 50.0, 80.0), rgb(222.0, 194.0, 140.0)), fr), P(rgb(40.0, 44.0, 76.0), rgb(196.0, 168.0, 122.0)), wet) * rip; tileA = 1.0;
    // the light's path carried on across the wet sand, a smear of it fading up the beach
    float sheen = wet * (1.0 - smoothstep(0.01, 0.035 + 0.02 * wet, abs(X - sunAt.x + 0.004 * sin(Y * 120.0))));
    if (sheen > 0.05) {
      tileC = mix(tileC, P(rgb(200.0, 196.0, 190.0), rgb(250.0, 236.0, 196.0)), 0.45 * sheen);
      if (h2(cell + floor(time * 3.0)) < 0.5 * sheen) { put(G_DASH, 0.5 + 0.4 * sheen, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 240.0, 200.0))); return; }
    }
    put(g, 0.7, mix(P(rgb(84.0, 80.0, 112.0), rgb(186.0, 158.0, 108.0)), P(rgb(52.0, 56.0, 92.0), rgb(140.0, 120.0, 90.0)), wet) * (h0 < 0.012 ? 1.3 : 1.0));
    return;
  }

  // --- the cliff, on the right: rock hatched where the light falls and blocked in shade, grass along
  // its top; the lighthouse on it
  float ct = cliffTop(X, aspect);
  float wide = clamp((aspect - 0.56) / 1.22, 0.0, 1.0);       // (0 in a tall window, 1 in a wide one)
  // the lighthouse and the keeper's cottage are in pixels (see drawLighthouse): its foot on the crown at
  // 0.84 of the width, the lamp LIGHT_H - LIGHT_LAMP of its pixels up (S of them to a pixel, as pixFor has it)
  float S = max(1.0, floor(H / 270.0 + 0.5)), lx = 0.84 * aspect, lb = cliffTop(lx, aspect);
  vec2 lamp = vec2(lx, lb + (78.0 - 17.0 - 1.5) * S / H);
  float lampRow = floor((1.0 - lamp.y) / ch), lampCol = floor(lamp.x / cw), oc = cell.x - lampCol;
  float flare = day ? 0.0 : smoothstep(0.86, 1.0, abs(cos(sea.x)));      // (a beam facing you)
  // (the headland and the lighthouse are the nearest things: the sailboat in pixels passes behind them)
  if ((Y < ct + 0.5 * ch && ct > horizon) || (abs(X - lx) < 16.0 * S / H && Y < lb + 78.0 * S / H && Y > lb - ch)) front = 1.0;
  if (Y < ct) {
    float d = ct - Y;
    // grass along the top, a flower here and there
    if (d < ch * 1.6) { tileC = P(rgb(30.0, 62.0, 48.0), rgb(78.0, 140.0, 66.0)); tileA = 1.0; put(h0 < 0.06 ? G_STAR : (h0 < 0.3 ? G_QUOTE : 0), 0.9, h0 < 0.06 ? P(rgb(255.0, 214.0, 122.0), rgb(232.0, 70.0, 82.0)) : P(rgb(70.0, 130.0, 92.0), rgb(110.0, 176.0, 90.0))); return; }
    // rocks and foam where it meets the sea
    if (Y < shore + 0.025 && X < 0.8 * aspect) {
      float fo = smoothstep(shore + 0.025, shore, Y) * (0.5 + 0.5 * sea.w);
      if (h0 < fo * 0.6) { put(h0 < fo * 0.3 ? G_BULLET : G_TILDE, 0.9, P(rgb(206.0, 218.0, 246.0), rgb(110.0, 140.0, 190.0))); return; }
    }
    // the face: rough rock, broken into facets that catch the light (those turned up and to the left,
    // toward it) or fall into shade, the cracks between them dark; the side turned to the light lighter
    // as a whole; deeper in shade further down
    // (lit where the slope falls toward the light; a little way down from the top whatever the
    // slope, the face is in shade)
    float slope = cliffTop(X + cw, aspect) - cliffTop(X - cw, aspect);
    bool lit = slope > 0.004 && d < 0.09;
    float down = smoothstep(0.03, 0.22, d);           // (0 under the top, 1 far down the face)
    vec3 rock = lit ? P(rgb(84.0, 80.0, 132.0), rgb(176.0, 164.0, 168.0)) : mix(P(rgb(54.0, 48.0, 90.0), rgb(128.0, 114.0, 124.0)), P(rgb(28.0, 26.0, 56.0), rgb(88.0, 78.0, 94.0)), down);
    vec2 q = vec2(X * 9.0, Y * 13.0);
    float n = fbm(q), facet = clamp(0.5 + 5.0 * (fbm(q - vec2(0.3, 0.0)) - fbm(q + vec2(0.0, 0.3))) + 3.0 * (n - 0.5), 0.0, 1.0);
    float crack = abs(fbm(q * vec2(0.7, 1.4) + 40.0) - 0.5);
    vec3 c = rock * (0.62 + 0.62 * facet);
    tileC = crack < 0.022 ? rock * 0.4 : c; tileA = 1.0;
    int g = crack < 0.022 ? (h0 < 0.5 ? G_SLASH : G_BAR) : facet > 0.72 ? (h0 < 0.55 ? G_SLASH : 0) : facet < 0.25 && h0 < 0.4 ? G_DOT : 0;
    put(g, crack < 0.022 ? 0.4 : 0.42, crack < 0.022 ? rock * 0.25 : c * 1.35);
    return;
  }

  // --- a buoy out in the bay, bobbing on the beats, its light blinking red on each beat at night
  {
    float bx = floor((0.22 + 0.06 * wide) * aspect / cw), by = floor((1.0 - (shore + (horizon - shore) * 0.35)) / ch) + (fract(sea.z * 0.5) < 0.5 ? 0.0 : 1.0);
    if (cell.x == bx && (row == by || row == by - 1.0 || row == by - 2.0)) {
      vec3 red = P(rgb(230.0, 70.0, 80.0), rgb(210.0, 50.0, 50.0));
      if (row == by) { tileC = P(rgb(26.0, 46.0, 96.0), rgb(80.0, 140.0, 196.0)); tileA = 1.0; put(G_UNDER, 1.0, red * 0.8); return; }
      if (row == by - 1.0) { tileC = red; tileA = 1.0; put(G_DASH, 0.8, P(rgb(240.0, 240.0, 240.0), rgb(250.0, 250.0, 250.0))); return; }
      bool lit = !day && fract(sea.z) < 0.25;
      put(lit ? G_STAR : G_CARET, 1.0, lit ? rgb(255.0, 120.0, 120.0) : red);
      return;
    }
  }
  // --- a sailboat on the horizon by day; at night a ship's lights going by
  {
    float sx = fract(time * 0.0035 + 0.3) * (aspect + 0.3) - 0.15, c0 = floor(sx / cw), r0 = floor((1.0 - horizon) / ch);
    float o = cell.x - c0;
    if (!day && row == r0 && o >= 0.0 && o < 6.0) {
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
    // (solid: deep out at the horizon, greener in the shallows; each crest a lighter band, white where
    // it breaks; the foam of the wash running up the sand)
    vec3 sea0 = mix(P(rgb(24.0, 36.0, 84.0), rgb(116.0, 168.0, 214.0)), P(rgb(14.0, 26.0, 64.0), rgb(56.0, 132.0, 196.0)), smoothstep(0.0, 0.5, dn));
    sea0 = mix(sea0, P(rgb(20.0, 44.0, 72.0), rgb(84.0, 186.0, 200.0)), smoothstep(0.6, 1.0, dn));
    tileC = sea0; tileA = 1.0;
    vec3 foam = P(rgb(176.0, 194.0, 236.0), rgb(248.0, 252.0, 255.0));
    if (Y < wash) { tileC = mix(sea0, foam, 0.75); g = h0 < 0.4 ? G_TILDE : 0; c = foam; ink = 0.7; }
    else if (crest) {
      if (dn > 0.82) { tileC = mix(sea0, foam, 0.7); g = h0 < 0.4 ? G_TILDE : 0; c = foam; ink = 0.8; }
      else { tileC = mix(sea0, P(rgb(60.0, 90.0, 160.0), rgb(170.0, 214.0, 240.0)), 0.18 + 0.5 * dn); g = dn > 0.55 && h0 < 0.5 ? G_TILDE : 0; c = P(rgb(96.0, 130.0, 200.0), rgb(206.0, 232.0, 248.0)); ink = 0.5 + 0.3 * dn; }
    } else if (h0 < 0.02) { g = G_DASH; ink = 0.35; c = P(rgb(50.0, 74.0, 130.0), rgb(150.0, 196.0, 232.0)); }
    // (the light's path: a narrow column of it broken on the waves, the crests catching it in strokes
    // across, wider toward you; a glint between them here and there, twinkling)
    float path = abs(X - sunAt.x + 0.006 * sin(Y * 90.0 + time * 1.3)) - 0.008 - 0.05 * dn;
    if (path < 0.0) {
      float tw = h2(vec2(cell.x, row) + floor(time * 3.0)), edge = clamp(-path / (0.008 + 0.05 * dn), 0.0, 1.0);
      tileC = mix(tileC, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 230.0, 170.0)), 0.1 + 0.12 * edge);
      vec3 lit = P(rgb(242.0, 236.0, 208.0), rgb(255.0, 206.0, 130.0));
      if (crest && tw > 0.25 - 0.2 * edge) { g = G_LINE; c = lit; ink = 0.6 + 0.35 * edge; }
      else if (tw > 0.9 - 0.05 * fly) { g = tw > 0.97 ? G_STAR : G_DASH; c = lit; ink = 0.8; }
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
      vec3 fill = P(rgb(36.0, 42.0, 82.0), rgb(150.0, 168.0, 196.0));
      if (across || down) { float sl = (tr - tl) / ch; tileC = fill; tileA = clamp(0.5 + (it - Y) / ch, 0.2, 0.7); put(abs(sl) < 0.4 ? G_UNDER : (sl > 0.0 ? G_SLASH : G_BACK), 0.85, c); return; }
      if (Y < it) { tileC = fill; tileA = 1.0; put(h0 < 0.06 ? G_DOT : 0, 0.5, c * 0.85); return; }
    }
    if (i == 0) {
      for (int k = 0; k < 2; k++) {
        float px = ix + (k == 0 ? -0.025 : 0.012), pb = ISL(px) - ch * 0.3, phh = k == 0 ? 0.03 : 0.022;
        if (abs(X - px) < pineW((Y - pb) / phh, phh * 0.36, 3.0)) { tileC = P(rgb(30.0, 52.0, 62.0), rgb(100.0, 132.0, 120.0)); tileA = 0.9; put(G_TRI, 0.85, P(rgb(50.0, 80.0, 90.0), rgb(90.0, 120.0, 110.0))); return; }
      }
    }
  }

  // --- the beams, at night: two, back to back, swung round, seen from the beach in perspective: the
  // one turned away from you dips toward the horizon, shortening; the one turned toward you sweeps
  // up across the sky, widening; as one comes round to face you the lantern flares
  if (!day) {
    vec2 r = vec2(X, Y) - lamp;
    float cx = 0.5 * aspect, best = 0.0;
    int bg = 0;
    for (int i = 0; i < 2; i++) {
      float th = sea.x + 3.14159265 * float(i), dx = sin(th), dz = -cos(th);      // (dz below 0: toward you)
      // (its line on the screen: from the lamp toward where it vanishes on the horizon, or away from
      // there when it's coming toward you, seen from not far below the lamp so it tilts only a little;
      // t how far along that from the lamp, d how far off it; k how far out along the beam and z how
      // far from you, in units of the lighthouse's distance)
      vec2 g = vec2(1.1 * dx - (lamp.x - cx) * dz, -0.25 * (lamp.y - horizon) * dz);
      float gl = length(g);
      if (gl < 1e-5) continue;
      vec2 u = g / gl;
      float t = dot(r, u), d = abs(r.x * u.y - r.y * u.x), den = gl - t * dz;
      if (t <= 0.0 || den <= 0.0) continue;
      float k = t / den, z = 1.0 + k * dz;
      if (z < 0.08) continue;
      // (its half width there on the screen; fading as it goes, and where it would rear up steeply,
      // nearly at you: the flare's there instead)
      float w = (0.009 + 0.09 * k) / z;
      float a = (1.0 - smoothstep(0.4 * w, w, d)) * exp(-0.55 * k) * mix(0.55, 1.0, max(0.0, -dz)) * smoothstep(0.15, 0.5, z) * (1.0 - smoothstep(0.35, 0.75, abs(u.y)));
      if (a > best) { best = a; bg = beamGlyph(atan(u.y, u.x)); }
    }
    // (its core solid, its edges thinning out)
    if (best > 0.04) { tileC = mix(nightGrad(Y, horizon), rgb(255.0, 226.0, 150.0), min(0.38, 0.5 * best)); tileA = 1.0; }
    if (best > 0.45 || (richSky < 0.5 && ((best > 0.2 && h0 < 1.6 * best) || (best > 0.1 && h0 < best)))) { put(best > 0.45 ? bg : (best > 0.2 ? G_MID : G_DOT), 0.3 + 0.65 * best, rgb(255.0, 232.0, 160.0)); return; }
    // (the flare: rays out of the lantern, across and up, and a glow round it)
    if (flare > 0.02) {
      float oy = row - lampRow, n = flare * 0.13 / cw;
      int g = 0;
      if (oy == 0.0 && abs(oc) <= n) g = G_LINE;
      else if (oc == 0.0 && oy < 0.0 && -oy <= n * 0.3) g = G_BAR;
      else if (abs(oc) == -oy && -oy <= n * 0.25) g = oc > 0.0 ? G_SLASH : G_BACK;
      if (g != 0) { put(g, 0.5 + 0.5 * flare, rgb(255.0, 240.0, 190.0)); return; }
      float rr = length(r * vec2(1.0, 1.3));
      if (rr < 0.07 * flare && h0 < 0.6 * flare * (1.0 - rr / (0.07 * flare))) { put(G_MID, 0.5 + 0.5 * flare, rgb(255.0, 240.0, 190.0)); return; }
    }
  }

  sky(cell, X, Y, h0, horizon, horizon + 0.02);
}`;

// The campfire: a clearing in the woods, a fire in a ring of stones in the middle, a tent to one
// side, the toaster on a log toasting bread on a stick. Pines frame it, a treeline of them closes the
// clearing, and over it the sky (lake.x: where the clearing ends; lake.y: the fire's foot). The
// flames leap on each kick, sparks fly up when the hats are busy, the firelight breathes with the
// loudness. By day: a sunny clearing, the fire low, its smoke rising; the grass in patches and
// clumps, wildflowers in drifts, the earth worn bare round the fire.
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

  // --- the branch of the left pine an owl sits on (the owl in pixels: see drawOwl)
  {
    float oc = floor((0.03 * wide * aspect + mix(0.05, 0.075, wide)) / cw), orow = floor((1.0 - mix(0.5, 0.56, wide)) / ch);
    // (the owl itself: in pixels, over the glyphs: see drawOwl)
    // the branch it sits on
    if (row == orow + 2.0 && cell.x >= oc - 3.0 && cell.x <= oc + 2.0) { tileC = P(rgb(60.0, 42.0, 36.0), rgb(110.0, 76.0, 50.0)); tileA = 1.0; put(G_EQ, 0.6, tileC * 0.6); return; }
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
        // (solid: the needles a fill, darker within, the glyphs a little lighter over it)
        vec3 fill = day ? mix(rgb(28.0, 78.0, 44.0), c, 0.5) : (lit ? mix(rgb(6.0, 14.0, 16.0), ember, 0.25 * reach) : rgb(6.0, 14.0, 16.0));
        tileC = fill; tileA = lf || rt ? 0.55 : 1.0;
        if (g == G_DARK) g = h0 < 0.2 ? G_CARET : 0;
        put(g, edge ? 0.95 : 0.7, mix(c, vec3(1.0), day ? 0.1 : 0.0));
        return;
      }
    }
  }

  // --- the fire itself is in pixels (see drawFlame, drawFireBack): the logs, the stones, the flames
  // sparks: flying up off the fire, wandering, cooling from yellow to red (more of them when the hats
  // are busy, and on a kick)
  if (!day) for (int k = 0; k < 20; k++) {
    float fk = float(k), life = fract(time * (0.2 + 0.16 * h1(fk)) + h1(fk * 3.3));
    if (h1(fk * 7.1) > 0.3 + 0.55 * fly + 0.3 * kick) continue;
    vec2 sp = fire + vec2((h1(fk * 1.7) - 0.5) * fw * 1.4 + 0.03 * sin(life * 7.0 + fk * 2.0) * life + wind * life * 0.08, fh * 0.5 + life * 0.45);
    if (abs(X - sp.x) < cw * 0.5 && abs(Y - sp.y) < ch * 0.5) { over = life < 0.25 ? G_STAR : (life < 0.6 ? G_MID : G_DOT); overInk = 1.0 - life * 0.7; overC = mix(rgb(255.0, 226.0, 130.0), rgb(220.0, 70.0, 40.0), life); break; }
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
        over = abs(slope) < 0.45 ? (sin(ph) < 0.0 ? G_LP : G_RP) : (slope > 0.0 ? G_SLASH : G_BACK);
        overInk = 0.35 + 0.6 * a; overC = P(rgb(128.0, 132.0, 168.0), rgb(130.0, 130.0, 140.0));
        break;
      }
      if (sy > top * 0.4 && abs(X - cx) < cw * 2.5 && h0 < 0.12 * a) { over = G_TILDE; overInk = 0.3 + 0.4 * a; overC = P(rgb(110.0, 114.0, 150.0), rgb(150.0, 150.0, 160.0)); break; }
    }
  }

  // --- the tent, to the right of the fire: an A-frame, its door open; a lantern lit inside at night
  {
    float tx = fire.x + mix(0.15, 0.39, wide), hw = mix(0.055, 0.1, wide), tb = lake.y + mix(0.075, 0.05, wide), th = hw * 1.25;
    float u = (Y - tb) / th, d = X - tx, ho = hw * (1.0 - u);
    if (abs(Y - tb) < ch * 0.5 && abs(d) < hw + cw) { tileC = P(rgb(70.0, 40.0, 34.0), rgb(130.0, 64.0, 40.0)); tileA = 0.8; put(G_UNDER, 0.95, P(rgb(150.0, 80.0, 56.0), rgb(150.0, 70.0, 40.0))); return; }
    if (u > 0.0 && u < 1.0 && abs(d) < ho + cw * 0.5) {
      float hd = hw * 0.42 * (1.0 - u / 0.72);
      float lit = day ? 0.0 : smoothstep(1.1, 0.0, length(vec2(d / hw, (u - 0.3) * 1.4)));    // the lantern's glow through the cloth
      vec3 cloth = mix(P(rgb(120.0, 62.0, 52.0), rgb(236.0, 128.0, 64.0)), ember, d < 0.0 ? 0.6 * warm : 0.2 * warm);
      cloth = mix(cloth, rgb(255.0, 196.0, 110.0), 0.85 * lit);
      if (abs(d) > ho - cw * 0.5) { tileC = cloth; tileA = 0.55; put(d < 0.0 ? G_SLASH : G_BACK, 1.0, cloth * 1.15); return; }
      if (u < 0.72 && abs(d) < hd + cw * 0.5) {
        if (abs(d) > hd - cw * 0.5) { tileC = cloth * 0.85; tileA = 1.0; put(d < 0.0 ? G_SLASH : G_BACK, 1.0, cloth * 1.1); return; }
        float lamp = day ? 0.0 : (0.85 + 0.15 * sin(time * 5.0) * sin(time * 3.1)) * smoothstep(0.7, 0.0, length(vec2(d / hw * 1.4, u - 0.22)));
        if (!day && abs(d) < cw * 0.5 && abs(u - 0.22) * th < ch * 0.5) { put(G_SPARK, 1.0, rgb(255.0, 240.0, 190.0)); return; }    // the lantern
        tileC = day ? rgb(62.0, 34.0, 30.0) : mix(rgb(60.0, 32.0, 24.0), rgb(255.0, 206.0, 120.0), lamp); tileA = 1.0;
        put(0, 0.0, tileC);
        return;
      }
      // (the cloth solid, its seams along it, lighter on the side toward the light)
      tileC = d < 0.0 ? cloth : cloth * 0.86; tileA = 1.0;
      put(mod(row, 3.0) < 1.0 && h0 < 0.7 ? G_DASH : 0, 0.4, cloth * 0.7);
      return;
    }
  }

  // --- the clearing's floor: grass in tufts, thicker toward you, worn to bare earth round the fire,
  // warmed by its light
  if (Y < back) {
    float near = 1.0 - Y / back;
    // (by day the meadow in the sun: the grass in patches, lighter where it's dry and darker where it's
    // lush, its blades in clumps, thicker toward you; wildflowers in drifts, each its own colour; the
    // earth round the fire bare to a clear edge, darker where it's burnt, grit and pebbles on it)
    if (day) {
      float clump = vn2(vec2(X * 34.0 + 3.0, Y * 40.0));
      float d = length(vec2(r.x * 0.55, r.y)) + 0.022 * (clump - 0.5), rim = smoothstep(0.07, 0.1, d);
      int g = 0;
      float ink = 0.8;
      vec3 gc;
      if (d < 0.1 && h2(cell + 5.0) >= 0.85 * rim) {
        tileC = mix(mix(rgb(104.0, 80.0, 60.0), rgb(158.0, 126.0, 88.0), smoothstep(0.03, 0.06, d)), rgb(130.0, 120.0, 72.0), rim * 0.6);
        g = h0 > 0.975 ? G_BULLET : (h0 < 0.1 ? G_DOT : (h0 < 0.16 ? G_COMMA : 0));
        gc = h0 > 0.975 ? rgb(146.0, 142.0, 136.0) : rgb(112.0, 86.0, 62.0);
      } else {
        float pat = vn2(vec2(X * 5.0, Y * 16.0)), fl = smoothstep(0.72, 0.86, vn2(vec2(X * 12.0 + 11.0, Y * 24.0)));
        vec3 grass = mix(rgb(104.0, 150.0, 72.0), rgb(62.0, 112.0, 50.0), near);
        grass = mix(grass, rgb(150.0, 168.0, 86.0), 0.35 * smoothstep(0.58, 0.72, pat));
        tileC = mix(grass, rgb(48.0, 98.0, 48.0), 0.4 * smoothstep(0.38, 0.24, pat));
        float dense = 0.07 + 0.12 * near + 0.45 * smoothstep(0.52, 0.78, clump), q = h0 / dense, hue = vn(X * 3.0 + Y * 7.0 + 40.0);
        gc = q > 0.9 ? rgb(156.0, 194.0, 98.0) : tileC * 0.6;
        if (h0 > 0.996) { g = G_STAR; ink = 1.0; gc = rgb(232.0, 80.0, 90.0); }    // (a wildflower on its own)
        else if (fl > 0.0 && h0 < 0.6 * fl) { g = h0 < 0.35 * fl && near > 0.3 ? G_STAR : (h0 < 0.4 * fl ? G_MID : G_DOT); ink = 1.0; gc = hue < 0.42 ? rgb(248.0, 246.0, 234.0) : hue < 0.62 ? rgb(250.0, 210.0, 76.0) : rgb(196.0, 150.0, 232.0); }
        else if (h0 < dense) g = q < 0.35 ? G_QUOTE : (q < 0.6 ? (near > 0.55 ? G_VEE : G_TICK) : G_COMMA);
      }
      tileA = 1.0;
      put(g, ink, gc);
      return;
    }
    float worn = smoothstep(0.14, 0.05, length(vec2(r.x * 0.55, r.y)));
    int g = 0;
    if (h0 < (0.06 + 0.3 * near) * (1.0 - worn)) g = h0 < 0.04 ? G_QUOTE : (h0 < 0.12 ? G_COMMA : (h0 < 0.2 ? G_TICK : G_DOT));
    else if (h0 > 1.0 - 0.2 * worn) g = h0 > 1.0 - 0.06 * worn ? G_COMMA : G_DOT;
    if (h0 > 0.996 && worn < 0.1) g = G_STAR;                                       // a wildflower
    vec3 c = mix(P(rgb(36.0, 72.0, 58.0), rgb(78.0, 132.0, 64.0)), P(rgb(90.0, 66.0, 52.0), rgb(150.0, 116.0, 80.0)), worn);
    // (solid: the ground darker toward you, the grass's tufts lighter over it, the fire's warmth on both)
    vec3 ground = mix(P(rgb(16.0, 34.0, 30.0), rgb(92.0, 142.0, 70.0)), P(rgb(10.0, 22.0, 22.0), rgb(70.0, 116.0, 56.0)), near);
    ground = mix(ground, P(rgb(52.0, 36.0, 30.0), rgb(140.0, 108.0, 74.0)), worn);
    tileC = mix(ground, ember, 0.55 * warm); tileA = 1.0;
    put(g, 0.55 + 0.35 * near + 0.3 * warm, h0 > 0.996 && worn < 0.1 ? P(rgb(220.0, 210.0, 255.0), rgb(232.0, 80.0, 90.0)) : mix(mix(c, vec3(1.0), day ? 0.1 : 0.15), ember, 0.8 * warm));
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
      // (solid: a fill under the tiers' glyphs, the row behind paler in the mist)
      tileC = i == 0 ? mix(P(rgb(8.0, 24.0, 24.0), rgb(30.0, 84.0, 50.0)), ember, 0.35 * warm) : P(rgb(24.0, 34.0, 64.0), rgb(150.0, 174.0, 156.0));
      tileA = lf || rt ? 0.5 : 0.95;
      put(g, i == 0 ? 0.9 : 0.65, c);
      return;
    }
  }
  // (by day no sky between the trees' feet: the misty row behind carried down to the clearing)
  if (day && Y < back + 0.03) { tileC = rgb(150.0, 174.0, 156.0); tileA = 0.95; put(h0 < 0.45 ? G_CARET : (h0 < 0.75 ? G_TRI : 0), 0.65, rgb(120.0, 150.0, 132.0)); return; }
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
      overC = P(rgb(226.0, 234.0, 255.0), rgb(236.0, 242.0, 252.0));
      break;
    }
  }

  // --- the near shore: deep snow in drifts, solid, white on their crests and shaded blue in their lee;
  // its top a lighter lip where it meets the ice; a tuft of dry grass poking through here and there; at
  // night glints in it
  float nearY = lake.y + 0.012 * sin(X * 6.0 + 1.3);
  if (Y < nearY) {
    vec3 snowT = P(rgb(134.0, 150.0, 204.0), rgb(246.0, 249.0, 255.0)), snowSh = P(rgb(74.0, 90.0, 148.0), rgb(204.0, 216.0, 240.0));
    float dr = fract((Y - 0.02 * sin(X * 7.0 + 1.0) - 0.01 * sin(X * 17.0)) * 14.0);
    tileC = mix(snowT, snowSh, (1.0 - smoothstep(0.0, 0.3, dr)) * 0.85); tileA = 1.0;
    if (nearY - Y < ch) tileC = mix(tileC, P(rgb(170.0, 186.0, 236.0), vec3(1.0)), 0.5);
    float glint = h2(cell + floor(time * 1.5 + h0 * 9.0));
    if (h0 < 0.03) { put(h0 < 0.012 ? G_QUOTE : G_COMMA, 0.8, P(rgb(150.0, 136.0, 100.0), rgb(170.0, 140.0, 80.0))); return; }
    if (!day && glint > 0.996) { put(glint > 0.999 ? G_SPARK : G_MID, 1.0, rgb(230.0, 240.0, 255.0)); return; }
    put(0, 0.0, tileC);
    return;
  }

  // --- the cabin, on the far shore: walls of logs (their ends stacked at the corners), two windows
  // lit warm, a door; snow thick on the roof, icicles under its eaves; smoke from the chimney
  float cs = mix(0.7, 1.0, wide);
  vec2 cab = vec2(mix(0.8, 0.76, wide) * aspect, lake.x + 0.004);
  float hwc = 0.1 * cs, wall = 0.075 * cs, roofH = 0.065 * cs, eave = 0.018 * cs, winX = hwc * 0.55;
  // (a snowman beside it: in pixels, over the glyphs: see drawSnowman)
  float flick = 0.88 + 0.12 * sin(time * 7.0) * sin(time * 4.3);
  vec3 lamp = rgb(255.0, 200.0, 110.0) * (day ? 1.0 : flick);
  {
    float d = X - cab.x, v = Y - cab.y, ad = abs(d);
    float chx = cab.x + 0.05 * cs, chTop = cab.y + wall + roofH * 1.1;
    // the chimney, up from the roof's slope, snow on its top
    if (abs(X - chx) < 0.012 * cs && v > wall + roofH * (1.0 - ad / (hwc + eave)) && Y < chTop + ch) {
      if (Y > chTop) { tileC = P(rgb(176.0, 190.0, 236.0), rgb(246.0, 249.0, 255.0)); tileA = 1.0; put(0, 0.0, tileC); return; }
      tileC = P(rgb(96.0, 46.0, 44.0), rgb(150.0, 70.0, 56.0)); tileA = 1.0;
      put(mod(row, 2.0) < 1.0 ? G_EQ : 0, 0.5, tileC * 0.6);
      return;
    }
    // the roof: snow, its edges outlined, the wood under it along the bottom
    float hr = (hwc + eave) * (1.0 - (v - wall) / roofH);
    if (v >= wall && v < wall + roofH && ad < hr) {
      if (v < wall + ch) { tileC = P(rgb(70.0, 46.0, 36.0), rgb(110.0, 70.0, 44.0)); tileA = 1.0; put(G_DBL, 0.6, tileC * 0.6); return; }
      if (ad > hr - cw) { tileC = P(rgb(176.0, 190.0, 236.0), rgb(246.0, 249.0, 255.0)); tileA = 0.55; put(d < 0.0 ? G_SLASH : G_BACK, 1.0, P(rgb(220.0, 230.0, 255.0), rgb(120.0, 140.0, 180.0))); return; }
      // (thick snow, solid, a little bluer toward the eaves)
      tileC = mix(P(rgb(176.0, 190.0, 236.0), rgb(246.0, 249.0, 255.0)), P(rgb(120.0, 136.0, 196.0), rgb(214.0, 224.0, 244.0)), 0.6 * (1.0 - (v - wall) / roofH)); tileA = 1.0;
      put(h0 < 0.05 ? G_DOT : 0, 0.4, tileC * 0.85);
      return;
    }
    // icicles under the eaves, outside the walls
    if (v < wall && v > wall - 2.0 * ch && ad > hwc && ad < hwc + eave) {
      float len = 1.0 + floor(h1(floor(X / cw) * 3.1) * 2.0);
      if (wall - v < len * ch) { put(wall - v < ch ? G_BAR : G_TICK, 0.9, P(rgb(190.0, 220.0, 255.0), rgb(120.0, 160.0, 210.0))); return; }
    }
    if (v >= 0.0 && v < wall && ad < hwc) {
      // the log ends at the corners
      if (ad > hwc - cw) { tileC = P(rgb(120.0, 84.0, 58.0), rgb(196.0, 150.0, 100.0)); tileA = 1.0; put(mod(row, 2.0) < 1.0 ? G_BIGO : G_SMALLO, 0.8, P(rgb(70.0, 46.0, 32.0), rgb(120.0, 80.0, 50.0))); return; }
      // the windows: four panes, lit warm at night, the sky in them by day
      vec2 wq = vec2(ad - winX, v - wall * 0.55);
      if (abs(wq.x) < 0.024 * cs && abs(wq.y) < 0.018 * cs) {
        bool mx = abs(wq.x) < cw * 0.5, my = abs(wq.y) < ch * 0.5;
        tileC = day ? mix(rgb(150.0, 180.0, 220.0), rgb(206.0, 224.0, 244.0), clamp(wq.y / (0.036 * cs) + 0.5, 0.0, 1.0)) : lamp; tileA = 1.0;
        if (mx || my) { put(mx && my ? G_PLUS : (mx ? G_BAR : G_DASH), 1.0, P(rgb(70.0, 44.0, 32.0), rgb(100.0, 64.0, 40.0))); return; }
        put(0, 0.0, tileC);
        return;
      }
      // the door
      if (ad < 0.02 * cs && v < wall * 0.75) {
        tileC = P(rgb(62.0, 40.0, 30.0), rgb(104.0, 66.0, 42.0)); tileA = 1.0;
        put(ad > 0.02 * cs - cw ? G_BAR : (abs(v - wall * 0.35) < ch * 0.5 && d > 0.0 ? G_BULLET : 0), 1.0, ad > 0.02 * cs - cw ? tileC * 0.6 : P(rgb(200.0, 170.0, 90.0), rgb(214.0, 180.0, 90.0)));
        return;
      }
      // the logs, a row each, in two browns; warm round the windows at night
      float glowW = day ? 0.0 : smoothstep(0.05 * cs, 0.0, length(wq)) * 0.6;
      vec3 c = mod(row, 2.0) < 1.0 ? P(rgb(84.0, 56.0, 40.0), rgb(140.0, 92.0, 56.0)) : P(rgb(66.0, 44.0, 34.0), rgb(116.0, 74.0, 46.0));
      tileC = mix(c, lamp, glowW); tileA = 1.0;
      put(mod(row, 2.0) < 1.0 ? G_DBL : G_EQ, 0.55, tileC * 0.62);
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

  // --- the frozen lake: smooth ice, solid, streaked lighter where the wind's polished it, snow blown
  // across it in drifts; at night the aurora's light glinting on it under its brightest folds, the far
  // shore's pines mirrored darkly, the windows' light in long warm streaks
  if (Y < lake.x) {
    float depth = (lake.x - Y) / (lake.x - lake.y);
    float streak = vn2(vec2((X + time * 0.002) * 14.0, row));
    vec3 ice = mix(P(rgb(30.0, 40.0, 78.0), rgb(204.0, 220.0, 238.0)), P(rgb(18.0, 24.0, 54.0), rgb(178.0, 198.0, 226.0)), depth);
    tileC = streak > 0.62 ? mix(ice, P(rgb(56.0, 70.0, 120.0), rgb(232.0, 240.0, 250.0)), 0.6 * smoothstep(0.62, 0.9, streak)) : ice; tileA = 1.0;
    // the windows' light
    for (int i = 0; i < 2; i++) {
      float wx = cab.x + (i == 0 ? -winX : winX);
      if (!day && abs(X - wx) < 0.016 * cs && depth < 0.75 && h2(cell + floor(time * 3.0)) < 0.75 - depth * 0.6) { tileC = mix(tileC, lamp, 0.5 * (1.0 - depth)); put(h0 < 0.3 ? G_DASH : 0, 0.8 - 0.6 * depth, lamp); return; }
    }
    // the pines mirrored just under the far shore
    float tier, Ym = 2.0 * lake.x - Y + 0.012;
    if (!day && depth < 0.45 && shoreTree(vec2(X + 0.002 * sin(row * 2.1 + time), Ym), tier) > -8.0) {
      tileC = mix(tileC, rgb(14.0, 40.0, 46.0), 0.6);
      put(streak > 0.3 ? (streak > 0.65 ? G_APPROX : G_TILDE) : 0, 0.6, P(rgb(20.0, 54.0, 60.0), rgb(60.0, 110.0, 96.0)));
      return;
    }
    // drifts of snow on the ice
    float drift = fbm(vec2(X * 5.0 - time * 0.01, Y * 34.0));
    if (drift > 0.56) { tileC = mix(tileC, P(rgb(134.0, 150.0, 204.0), rgb(246.0, 249.0, 255.0)), min(1.0, (drift - 0.56) * 5.0)); put(0, 0.0, tileC); return; }
    // the aurora's light on the ice
    if (!day) {
      float up, a = aurora(vec2(X, footA + 0.03), footA, up);
      float st = vn2(vec2((X + time * 0.002) * 5.0, row));
      if (st > 0.9 - 0.22 * a) { tileC = mix(tileC, auroraCol(0.1) * 0.6, 0.3 * min(1.0, a)); put(st > 0.96 ? G_DBL : G_LINE, 0.25 + 0.6 * a, mix(rgb(60.0, 90.0, 140.0), auroraCol(0.1), min(1.0, a * 1.3))); return; }
    }
    put(0, 0.0, tileC);
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
      tileC = snowy ? P(rgb(150.0, 166.0, 214.0), rgb(226.0, 234.0, 248.0)) : needles * 0.85; tileA = lf || rt ? 0.5 : 0.92;
      put(g, 0.95, snowy ? P(rgb(196.0, 212.0, 250.0), rgb(140.0, 160.0, 196.0)) : mix(needles, vec3(1.0), 0.12));
      return;
    }
    if (Y < lake.x + 0.012) { tileC = P(rgb(134.0, 150.0, 204.0), rgb(246.0, 249.0, 255.0)); tileA = 1.0; put(0, 0.0, tileC); return; }
  }

  // --- the mountains behind: snow from foot to peak, solid: the face toward the moon (or the sun)
  // lit, the other in shade; rock showing dark through the snow in gullies down the faces, more on the
  // shaded ones and lower down; paler toward the foot in the haze; at night the aurora's light on them;
  // their ridges drawn along the top, over the face as far as the cell's in it
  {
    vec4 pk = peak(2, X);
    float tl = peak(2, X - 0.5 * cw).x, tr = peak(2, X + 0.5 * cw).x, tc = pk.x;
    if (Y - 0.5 * ch <= max(max(tl, tr), tc)) {
      float s = X < pk.y ? -1.0 : 1.0;
      bool lit = (X - (pk.y + (pk.z - Y) * 0.2)) * (sunAt.x - pk.y) > 0.0;
      float up = clamp((Y - farL.x) / max(1e-3, pk.z - farL.x), 0.0, 1.0);
      vec3 snowL = P(rgb(158.0, 176.0, 232.0), rgb(244.0, 247.0, 255.0)), snowS = P(rgb(62.0, 76.0, 136.0), rgb(156.0, 176.0, 214.0));
      vec3 rock = P(rgb(30.0, 36.0, 72.0), rgb(110.0, 118.0, 150.0)), haze = P(rgb(14.0, 18.0, 42.0), rgb(204.0, 222.0, 242.0));
      vec3 face = lit ? snowL : snowS;
      // (rock showing through in ribs down the shaded faces, broken along their length; on the lit
      // ones only low down, where the snow thins)
      float c1 = (X - pk.y) - s * (pk.z - Y) * 0.6;
      float rib = vn(c1 * 48.0 + pk.y * 31.0) * (0.55 + 0.45 * vn2(vec2(c1 * 30.0, Y * 12.0)));
      if (rib > (lit ? 0.72 + 0.4 * up : 0.5) && up > 0.12) face = mix(face, rock, lit ? 0.35 : 0.6);
      if (!day) { float u2, a = aurora(vec2(X, footA + 0.03), footA, u2); face = mix(face, auroraCol(0.2), 0.3 * a); }
      face = mix(face, haze, 0.45 * (1.0 - up) * (1.0 - up));
      if (abs(tc - Y) <= 0.5 * ch || (Y - tl) * (Y - tr) <= 0.0) {
        float rise = (tr - tl) / ch;
        bool top = tc > tl + 0.15 * ch && tc > tr + 0.15 * ch;
        int g = top && Y + 0.5 * ch > tc ? G_CARET : (abs(rise) < 0.9 ? G_UNDER : (rise > 0.0 ? G_SLASH : G_BACK));
        tileC = face; tileA = clamp(0.5 + (tc - Y) / ch, 0.2, 0.8);
        put(g, 0.9, P(rgb(214.0, 226.0, 255.0), rgb(110.0, 126.0, 170.0)));
        return;
      }
      if (Y < tc) {
        tileC = face; tileA = 1.0;
        put(h0 < 0.04 ? G_DOT : 0, 0.4, face * 0.85);
        return;
      }
    }
  }

  // --- the aurora at night, in front of the stars (they show through its gaps); then the sky
  if (!day) {
    float up, a = aurora(vec2(X, Y), footA, up);
    front = 0.2;                       // (the moon in pixels over it: no bites out of its rim)
    if (a > 0.1 && length(vec2(X, Y) - sunAt) > 0.085) {
      // (its rays drawn in lines that meet from row to row, heavier where it's brightest)
      int g = a > 0.95 ? G_VHEAVY : a > 0.5 || (a > 0.3 && up < 0.3) ? G_VLINE : a > 0.28 ? G_COLON : a > 0.17 ? G_TICK : G_DOT;
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
// towers' lights blink on the beat, a car goes by every 8 bars. By day: a rainy day under low
// cloud, the row across the street in brick, stucco, slate and sage, its windows glass, awnings
// over the shops, the towers behind in glass or stone, all of it in the wet road.
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
// a building's wall by day, by its look: red brick, cream stucco, slate, sage
vec3 dayWall(float look) { return look < 0.4 ? rgb(168.0, 90.0, 72.0) : look < 0.6 ? rgb(212.0, 198.0, 166.0) : look < 0.8 ? rgb(116.0, 134.0, 160.0) : rgb(138.0, 154.0, 132.0); }
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

  // --- the streetlamp: a post, an arm out over the pavement, the lamp under its shade (in front of
  // the people walking the far pavement)
  if (abs(X - sx) < cw * 0.6 && Y > 0.012 && Y < lampY + ch * 0.5) { front = 1.0; put(G_BAR, 1.0, P(rgb(84.0, 88.0, 116.0), rgb(70.0, 74.0, 90.0))); return; }
  if (abs(Y - lampY) < ch * 0.5 && X > head.x - cw && X < sx) { front = 1.0; put(X < head.x + cw ? G_SLASH : G_LINE, 1.0, P(rgb(84.0, 88.0, 116.0), rgb(70.0, 74.0, 90.0))); return; }
  if (abs(Y - (lampY - ch)) < ch * 0.5 && abs(X - head.x) < cw * 1.6) { solid = true; front = 1.0; put(abs(X - head.x) > cw * 1.1 ? (X < head.x ? G_SLASH : G_BACK) : G_DARK, 1.0, P(rgb(90.0, 94.0, 120.0), rgb(80.0, 84.0, 96.0))); return; }
  if (abs(Y - (lampY - 2.0 * ch)) < ch * 0.5 && abs(X - head.x) < cw * 1.6) { solid = true; front = 1.0; put(G_DARK, 1.0, day ? rgb(210.0, 210.0, 200.0) : lampC * 1.1); return; }
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
    // (solid: slabs, the kerb's edge lighter; puddles darker, the lights in them)
    vec3 slab = P(rgb(28.0, 30.0, 48.0), rgb(172.0, 176.0, 188.0));
    tileC = slab * (0.94 + 0.08 * h2(vec2(floor((cell.x + floor(row / 3.0) * 4.0) / 9.0), floor(row / 3.0)) + 2.0)); tileA = 1.0;
    if (kerb - Y < ch) { tileC = P(rgb(52.0, 54.0, 76.0), rgb(196.0, 198.0, 206.0)); put(G_LINE, 0.9, P(rgb(120.0, 124.0, 150.0), rgb(110.0, 112.0, 130.0))); return; }
    float pud = vn2(vec2(X * 9.0, Y * 30.0));
    if (pud > 0.66) {
      // (by day the pale sky in it, by night the dark)
      tileC = P(rgb(16.0, 18.0, 34.0), rgb(184.0, 192.0, 208.0));
      // a puddle: the neon and the lamp in it, broken by the rain
      bool pink = abs(X - signX) < 0.06 && !day, warm = abs(X - head.x) < 0.04 && !day;
      if (pink || warm) tileC = mix(tileC, pink ? neon : lampC, 0.3);
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
    float m = (base - Y) / (base - kerb);               // (0 at the far kerb, 1 at the near)
    // (solid: wet asphalt, the lights across the street drawn down it in colour)
    vec3 tar = mix(P(rgb(20.0, 22.0, 38.0), rgb(100.0, 104.0, 118.0)), P(rgb(14.0, 16.0, 30.0), rgb(84.0, 88.0, 100.0)), m);
    // (by day the row across the street in it, faint, broken by the rain, fading toward the near kerb)
    vec4 b = bldg(X);
    if (day) tar = mix(tar, dayWall(h1(b.w * 5.3 + 2.0)) * 0.82, 0.3 * (1.0 - m) * (0.7 + 0.3 * vn(cell.x * 0.7 + row * 1.3 - time)));
    tileC = tar; tileA = 1.0;
    // ripples
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.008 + q.z * 0.05, d = length(vec2(X - q.x, (Y - q.y) * 4.0)) - rad;
      if (abs(d) < cw * 0.8 && exp(-q.z * 1.5) > 0.1) { put((X - q.x) < -rad * 0.8 ? G_LP : ((X - q.x) > rad * 0.8 ? G_RP : G_DASH), 0.6, P(rgb(160.0, 180.0, 230.0), rgb(110.0, 130.0, 170.0))); return; }
    }
    float run = vn(row * 0.8 - time * 2.5 + cell.x * 13.7);       // (the breaks, running down the streaks)
    bool colOn = h1(cell.x * 3.7) < 0.7;
    if (abs(X - signX) < 4.5 * cw && colOn && run > 0.3 + 0.5 * m) { tileC = mix(tar, day ? rgb(200.0, 140.0, 170.0) : neon, (day ? 0.12 : 0.3) * (1.0 - 0.6 * m)); put(run > 0.62 ? G_BAR : G_COLON, (day ? 0.35 : 0.85) - 0.4 * m, day ? rgb(200.0, 140.0, 170.0) : neon); return; }
    float bx = X - b.x;
    if (shopLit(b, signX) && bx > b.y * 0.15 && bx < b.y * 0.85 && colOn && run > 0.42 + 0.5 * m) { tileC = mix(tar, day ? rgb(220.0, 180.0, 130.0) : rgb(255.0, 196.0, 120.0), (day ? 0.1 : 0.22) * (1.0 - 0.6 * m)); put(run > 0.7 ? G_BAR : G_COLON, (day ? 0.3 : 0.6) - 0.3 * m, day ? rgb(220.0, 180.0, 130.0) : rgb(255.0, 196.0, 120.0)); return; }
    if (abs(Y - (base + kerb) * 0.5) < ch * 0.5 && mod(cell.x, 6.0) < 3.0) { put(G_DASH, 0.6, P(rgb(200.0, 200.0, 210.0), rgb(250.0, 250.0, 250.0)) * (day ? 0.6 : 0.8)); return; }
    if (splash > 0.985 - 0.02 * fly) { put(G_DOT, 0.7, P(rgb(160.0, 178.0, 226.0), rgb(110.0, 128.0, 166.0))); return; }
    put(h0 < 0.05 ? G_DASH : 0, 0.3, P(rgb(50.0, 56.0, 90.0), rgb(120.0, 124.0, 140.0)));
    return;
  }

  // --- the far pavement, the sign over the shop, the buildings
  // (people with umbrellas walk the far pavement: in pixels, over the glyphs: see drawWalker)
  if (Y < foot) {
    if (day) { tileC = rgb(150.0, 154.0, 166.0) * (0.96 + 0.06 * h2(vec2(floor(cell.x / 5.0), row))); tileA = 1.0; }
    else tone = 0.1;
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
  vec3 wall = look < 0.4 ? P(rgb(96.0, 54.0, 60.0), rgb(150.0, 90.0, 80.0)) : (look < 0.75 ? P(rgb(60.0, 66.0, 100.0), rgb(120.0, 124.0, 144.0)) : P(rgb(74.0, 70.0, 92.0), rgb(140.0, 132.0, 140.0)));
  // (by day solid: the wall in its material, a little lighter up its height (the sky on it))
  vec3 dw = dayWall(look);
  if (day && Y < top) { wall = dw; tileC = dw * (0.93 + 0.1 * clamp((Y - foot) / max(bh, 1e-3), 0.0, 1.0)); tileA = 1.0; }
  vec3 rim = P(rgb(190.0, 150.0, 200.0), rgb(90.0, 84.0, 100.0));        // (the edges catching the glow)
  if (Y < top) {
    float cx = floor((X - b.x) / cw), ncol = floor(b.y / cw), ry = floor((top - Y) / ch), nrow = floor(bh / ch);
    if (cx < 1.0 || cx >= ncol - 1.0) { if (day) tileC = dw * 0.78; put(G_BAR, 0.9, mix(wall * 0.75, rim, day ? 0.0 : 0.35)); return; }
    if (ry < 1.0) { if (day) tileC = dw * 0.7; put(G_LINE, 1.0, day ? min(dw * 1.3, vec3(1.0)) : mix(wall * 1.1, rim, 0.75)); return; }
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
        vec3 c = day ? rgb(150.0, 214.0, 240.0) : rgb(80.0, 220.0, 255.0) * (lit ? 1.0 : 0.3);
        if (day) tileC = rgb(40.0, 46.0, 60.0);           // (by day on a dark board, so it reads)
        put(oc == 0.0 || oc == 5.0 ? G_BAR : oc == 1.0 ? G_BIGO : oc == 2.0 ? G_LP2 : oc == 3.0 ? G_LE : G_LN, 1.0, oc > 0.0 && oc < 5.0 && lit ? mix(c, rgb(220.0, 250.0, 255.0), 0.4) : c);
        return;
      }
    }
    // (by day an awning over the shops with no sign over them: striped in two colours of its own, its
    // edge darker)
    if (day && shopLit(b, signX) && !(signX >= b.x && signX < b.x + b.y) && h1(kk * 4.1) >= 0.45 && Y >= foot + 0.05 && Y < foot + 0.05 + 1.5 * ch) {
      float u = (X - b.x) / b.y;
      if (u > 0.08 && u < 0.92) {
        float pick = h1(kk * 8.9);
        vec3 c1 = pick < 0.33 ? rgb(196.0, 64.0, 56.0) : pick < 0.66 ? rgb(52.0, 120.0, 88.0) : rgb(60.0, 92.0, 160.0), c2 = rgb(236.0, 228.0, 210.0);
        bool low = Y < foot + 0.05 + 0.5 * ch;
        tileC = mod(cell.x, 2.0) < 1.0 ? c1 : c2;
        put(low ? G_UNDER : 0, 1.0, c1 * 0.7);
        return;
      }
    }
    // the shop at street level: a window lit warm (or its shutter down), its door
    if (Y < foot + 0.05) {
      bool lit = shopLit(b, signX);
      float u = (X - b.x) / b.y;
      if (u > 0.12 && u < 0.88 && Y > foot + ch) {
        if (abs(u - 0.7) < 0.06) { if (day) tileC = dw * 0.5; put(G_MEDIUM, 0.9, P(rgb(60.0, 40.0, 40.0), rgb(90.0, 60.0, 50.0))); return; }
        if (!lit) { if (day) tileC = rgb(150.0, 152.0, 162.0); put(mod(row, 2.0) < 1.0 ? G_DBL : G_LINE, 0.7, P(rgb(80.0, 84.0, 100.0), rgb(116.0, 118.0, 128.0))); return; }
        // (by day the window lit warm behind its glass, the mullions dark)
        if (day) tileC = mod(cx, 6.0) < 1.0 ? dw * 0.6 : rgb(240.0, 214.0, 164.0);
        bool goods = day && h2(cell + 41.0) < 0.12;
        put(mod(cx, 6.0) < 1.0 ? G_BAR : (goods ? G_DOT : G_MEDIUM), 0.9, mod(cx, 6.0) < 1.0 ? wall * 0.6 : (day ? (goods ? rgb(200.0, 150.0, 96.0) : tileC) : rgb(255.0, 190.0, 110.0)));
        return;
      }
      if (day) tileC = dw * 0.86;
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
      if (day) {
        tileC = on ? (screen ? rgb(150.0, 186.0, 236.0) : rgb(238.0, 206.0, 148.0)) : mix(rgb(160.0, 178.0, 204.0), rgb(196.0, 208.0, 226.0), h2(id + 9.0));
        // (a lit one's glyph in its own colour: nothing on the glass, but in the theme's colours lit)
        if (on) { put(G_DARK, 1.0, tileC); return; }
        bool glint = h2(id + 23.0) < 0.22 && wc < 1.0;
        put(glint ? G_SLASH : G_UNDER, glint ? 0.6 : 0.9, glint ? rgb(232.0, 238.0, 246.0) : min(dw * 1.3, vec3(1.0)));
        return;
      }
      if (on) { put(G_DARK, 1.0, screen ? rgb(120.0, 170.0, 255.0) * (0.85 + 0.15 * sin(time * 9.0 + id.x)) : rgb(255.0, 196.0, 110.0)); return; }
      put(G_LIGHT, 0.7, rgb(40.0, 46.0, 80.0));
      return;
    }
    // the wall: brick in rows, or concrete
    if (look < 0.4) { put(mod(row, 2.0) < 1.0 ? (mod(cell.x + mod(row, 4.0), 4.0) < 1.0 ? G_BAR : G_UNDER) : 0, day ? 0.5 : 0.35, day ? rgb(214.0, 168.0, 150.0) : wall); return; }
    put(h0 < 0.1 ? G_DOT : 0, 0.4, day ? dw * 0.82 : wall);
    return;
  }
  // (on one roof a cat: in pixels, over the glyphs: see drawCat)
  // on the roofs: a water tank on some, an antenna with a red light (blinking on the beat) on others
  {
    float cx = (X - b.x) / b.y, up = Y - top;
    if (look > 0.78 && abs(cx - 0.4) < 0.12 && up < 3.0 * ch) {
      put(up < ch ? (cx < 0.4 ? G_SLASH : G_BACK) : (up < 2.0 * ch ? G_DARK : G_CARET), 0.9, P(rgb(80.0, 70.0, 80.0), rgb(110.0, 90.0, 80.0)));
      return;
    }
    if (look < 0.16 && abs(X - (b.x + b.y * 0.6)) < cw * 0.5 && up < 5.0 * ch) {
      bool tip = up > 4.0 * ch;
      put(tip ? G_BULLET : G_BAR, 1.0, tip ? rgb(255.0, 60.0, 60.0) * (fract(sea.z) < 0.3 ? 1.0 : 0.35) : P(rgb(100.0, 100.0, 120.0), rgb(90.0, 90.0, 100.0)));
      return;
    }
  }
  // --- the towers behind: dark, a few windows lit, their red lights blinking on the beat
  {
    vec4 tw = tower(X);
    if (tw.z > 0.0 && Y < foot + tw.z) {
      tone = day ? 0.22 : 0.12 * smoothstep(0.9, foot, Y);
      float ry = floor((foot + tw.z - Y) / ch);
      if (ry < 1.0 && abs(X - tw.x) < cw * 0.5) { put(G_BULLET, 1.0, rgb(255.0, 60.0, 60.0) * (fract(sea.z + 0.5) < 0.3 ? 1.0 : 0.3)); return; }
      bool edge = abs(X - tw.x) > tw.y - cw;
      bool win = mod(cell.x, 2.0) < 1.0 && mod(row, 2.0) < 1.0 && h2(cell + tw.w) < 0.18;
      // (solid: a silhouette in the haze, paler further up by day, its sunlit side lighter, a cornice
      // along its top; by day its face a grid of windows catching the sky, a few lit; by night its
      // windows lit here and there)
      float face = clamp((Y - foot) / 0.4, 0.0, 1.0);
      bool sunny = day && (X - tw.x) * (sunAt.x - tw.x) > 0.0;
      // (by day each in its material: blue glass, or warm stone)
      bool stone = h1(tw.w * 3.3 + 1.0) < 0.4;
      vec3 dayFace = stone ? mix(rgb(160.0, 154.0, 152.0), rgb(194.0, 188.0, 182.0), face) : mix(rgb(138.0, 150.0, 174.0), rgb(178.0, 190.0, 210.0), face);
      tileC = P(rgb(18.0, 20.0, 38.0), dayFace * (sunny ? 1.08 : 1.0)) * (edge ? 0.9 : 1.0); tileA = 1.0;
      if (ry < 2.0) tileC = P(rgb(30.0, 32.0, 56.0), rgb(120.0, 126.0, 146.0));
      bool grid = day && !edge && ry >= 2.0 && mod(cell.x, 2.0) < 1.0 && mod(row, 2.0) < 1.0;
      if (grid) tileC = mix(tileC, stone ? rgb(120.0, 130.0, 150.0) : rgb(200.0, 214.0, 234.0), stone ? 0.3 : 0.35);
      if (win) tileC = day ? mix(tileC, rgb(214.0, 196.0, 150.0), 0.55) : rgb(255.0, 206.0, 120.0) * (0.55 + 0.35 * h2(cell + tw.w + 3.0));
      put(edge ? G_BAR : 0, 0.4, P(rgb(44.0, 46.0, 78.0), rgb(140.0, 146.0, 166.0)));
      return;
    }
  }
  // --- the sky: low cloud, lit orange from below by the city (by day an even grey)
  float cl = fbm(vec2(X * 2.2 + time * 0.012, Y * 14.0));
  float under = smoothstep(0.95, 0.4, Y);
  if (!day) tone = 0.75 * smoothstep(0.95, foot + 0.05, Y);
  // (by day in banks, darker where it's thickest, thinning into the haze over the roofs)
  else { tileC = rgb(150.0, 158.0, 180.0); tileA = 0.55 * smoothstep(0.46, 0.66, cl) * smoothstep(foot + 0.15, 0.75, Y); }
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
// four points in a cell (shares of it from its middle), for how much of the cell a shape covers
const vec2 SUBG[4] = vec2[4](vec2(-0.27, 0.24), vec2(0.27, 0.2), vec2(-0.2, -0.26), vec2(0.24, -0.24));
// the lily pad in grid cell pg (one cell in a few has one), at p: 0 not there, 1 the leaf, 2 its
// flower; its colour. Seen flat across the water: a round pad with its notch cut in, lighter toward
// its far edge, at least two rows deep; a pink flower on some
int gardenPad(vec2 pg, vec2 p, vec2 gsz, out vec3 c) {
  c = vec3(0.0);
  if (h2(pg + 2.0) > 0.12) return 0;
  vec2 pc = (pg + 0.5 + 0.25 * (vec2(h2(pg + 4.0), h2(pg + 6.0)) - 0.5)) * gsz;
  float pr = max(cw * (3.4 + 1.8 * h2(pg + 9.0)), 3.4 * ch * (0.9 + 0.2 * h2(pg + 9.0)));
  vec2 d = vec2((p.x - pc.x) / pr, (p.y - pc.y) / (pr * 0.34));
  float notch = h2(pg + 3.0) * 6.2832, ang = atan(d.y, d.x);
  if (length(d) > 1.0 || (abs(mod(ang - notch + 3.14159, 6.28318) - 3.14159) < 0.3 && length(d) > 0.2)) return 0;
  if (h2(pg + 8.0) < 0.45 && length((p - pc - vec2(pr * 0.2, pr * 0.1)) / vec2(max(cw * 1.4, pr * 0.22), max(ch * 0.9, pr * 0.12))) < 1.0) { c = rgb(255.0, 190.0, 214.0); return 2; }
  c = mix(P(rgb(30.0, 86.0, 52.0), rgb(58.0, 120.0, 48.0)), P(rgb(70.0, 150.0, 92.0), rgb(116.0, 180.0, 82.0)), clamp(0.55 + 0.45 * d.y, 0.0, 1.0));
  return 1;
}
// a light glyph for a cell a shape only partly covers: from which of its four points (top left, top
// right, bottom left, bottom right) are in it, so its edge follows the shape
int edgeG(bool tl, bool tr, bool bl, bool br) {
  bool top = tl || tr, bot = bl || br, lf = tl || bl, rt = tr || br;
  if (top && !bot) return lf && rt ? G_TICK : G_GRAVE;
  if (bot && !top) return lf && rt ? G_UNDER : G_DOT;
  if (lf && !rt) return G_RP;
  if (rt && !lf) return G_LP;
  return G_COLON;
}
// the bridge: its middle, half its span, the water line under it, its height at the top
vec4 bridgeAt(float aspect, float wide) {
  return vec4(mix(0.5, 0.64, wide) * aspect, mix(0.16, 0.2, wide), lake.y + (lake.x - lake.y) * 0.4, mix(0.1, 0.13, wide));
}
// the bridge's curve: its height over the water line at x (an arch, -1 past its ends)
float arch(float x, vec4 br) {
  float u = (x - br.x) / br.y;
  return abs(u) < 1.0 ? br.w * pow(max(0.0, 1.0 - u * u), 0.6) : -1.0;
}
// the cherry tree's limbs (from, to: in units of its size, from its foot; it leans out over the
// pond) and how thick each is where it starts
const vec4 CLIMB[17] = vec4[17](
  vec4(0.0, 0.0, -0.03, 0.14), vec4(-0.03, 0.14, -0.07, 0.26),
  vec4(-0.07, 0.26, -0.3, 0.37), vec4(-0.3, 0.37, -0.52, 0.41), vec4(-0.3, 0.37, -0.36, 0.49),
  vec4(-0.07, 0.26, -0.16, 0.5), vec4(-0.16, 0.5, -0.26, 0.58),
  vec4(-0.07, 0.26, 0.06, 0.46), vec4(0.06, 0.46, 0.14, 0.56),
  vec4(-0.03, 0.14, 0.18, 0.3), vec4(0.18, 0.3, 0.3, 0.33),
  // (twigs out past the blossom, and the roots flaring at its foot)
  vec4(-0.52, 0.41, -0.69, 0.47), vec4(-0.5, 0.4, -0.59, 0.31), vec4(0.3, 0.33, 0.44, 0.3), vec4(0.26, 0.4, 0.41, 0.47),
  vec4(0.0, 0.03, -0.08, 0.0), vec4(0.0, 0.03, 0.07, 0.0));
const float CLIMBW[17] = float[17](0.085, 0.07, 0.04, 0.022, 0.012, 0.03, 0.012, 0.028, 0.012, 0.026, 0.012, 0.007, 0.006, 0.007, 0.006, 0.03, 0.026);
// its blossom: clumps along the limbs and at their tips, smaller ones round the edges and hanging
// under them, a lacy outline (centre, radius: units of its size)
const vec3 PUFF[24] = vec3[24](
  vec3(-0.45, 0.5, 0.085), vec3(-0.32, 0.57, 0.095), vec3(-0.18, 0.63, 0.1), vec3(-0.04, 0.67, 0.095),
  vec3(0.09, 0.62, 0.095), vec3(0.2, 0.54, 0.085), vec3(0.3, 0.45, 0.075),
  vec3(-0.58, 0.45, 0.05), vec3(-0.53, 0.38, 0.045), vec3(-0.4, 0.42, 0.06), vec3(-0.25, 0.46, 0.065),
  vec3(-0.11, 0.52, 0.07), vec3(0.03, 0.51, 0.065), vec3(0.15, 0.42, 0.06), vec3(0.25, 0.36, 0.05),
  vec3(0.36, 0.37, 0.045), vec3(-0.27, 0.69, 0.055), vec3(-0.1, 0.76, 0.05), vec3(0.05, 0.74, 0.055),
  vec3(0.18, 0.66, 0.05), vec3(-0.48, 0.32, 0.04), vec3(-0.36, 0.33, 0.035), vec3(0.33, 0.29, 0.035),
  vec3(-0.63, 0.4, 0.03));
// in the blossom at p (the tree's foot at T, its size S)? How far into the nearest clump (0 its
// middle, 1 its edge, lumpy), the same for the next nearest (d2), and the nearest's centre
float bloom(vec2 p, vec2 T, float S, out float d2, out vec2 c1) {
  float d1 = 9.0;
  d2 = 9.0;
  c1 = T;
  for (int k = 0; k < 24; k++) {
    vec3 b = PUFF[k];
    vec2 c = T + b.xy * S, q = (p - c) / (b.z * 1.15 * S);
    float d = length(q / vec2(1.15, 0.92)) / (1.0 + 0.16 * (vn2(q * 2.6 + float(k) * 5.3) - 0.5));
    if (d < d1) { d2 = d1; d1 = d; c1 = c; } else if (d < d2) d2 = d;
  }
  return d1;
}
// in the cherry tree's limbs at p? Their glyph (0 if not): the edges by the limb's slope, the middle
// of a thick one solid (inside 1)
int limbAt(vec2 p, vec2 T, float S, out float inside) {
  inside = 0.0;
  float best = 9.0, bsl = 0.0;
  for (int i = 0; i < 17; i++) {
    vec4 L = CLIMB[i] * S;
    vec2 a = T + L.xy, b = T + L.zw, pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length((pa - ba * h) / vec2(cw, ch)) - CLIMBW[i] * S / ch * (1.0 - 0.35 * h);
    if (d < best) { best = d; bsl = ba.y / (abs(ba.x) < 1e-5 ? 1e-5 : ba.x) * cw / ch; }
  }
  if (best > 0.5) return 0;
  if (best < -0.35) { inside = 1.0; return G_DARK; }
  return abs(bsl) > 2.4 ? G_BAR : (abs(bsl) < 0.4 ? G_UNDER : (bsl > 0.0 ? G_SLASH : G_BACK));
}
// the pagoda (see PAGODA_ART): the glyph at column o, row r from its top left (0 if none), and its
// part. Kind 0 the big one, 1 the small one (a short window)
${artArrays('PG', PAGODA_ART)}
int pagodaAt(int kind, int o, int r, out int part) {
  part = 0;
  int w = kind == 0 ? 21 : 11, h = kind == 0 ? 12 : 7;
  if (o < 0 || o >= w || r < 0 || r >= h) return 0;
  int v = kind == 0 ? PG0[r * w + o] : PG1[r * w + o];
  part = v / 64;
  return v - part * 64;
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
      if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5 && bl > 0.08) { over = bl > 0.5 ? G_BULLET : G_MID; overInk = 0.45 + 0.55 * bl; overC = rgb(255.0, 230.0, 128.0); break; }
    }
  }

  // --- the cherry tree on the right, leaning out over the pond: its blossom in clumps along the limbs
  // (masses lit from above, deeper underneath, a seam where one clump meets the one behind it, every
  // cell of them a blossom glyph as the light falls), loose blossoms past their edges, its limbs and
  // twigs and trunk in the gaps and below
  {
    vec2 T = vec2(mix(0.95, 0.91, wide) * aspect, bank - 0.004), P0 = vec2(X, Y), c1;
    float S = mix(0.36, 0.56, wide), d2 = 9.0;
    bool near0 = X > T.x - 0.75 * S && Y > T.y - 0.01 && Y < T.y + 0.85 * S;    // (anywhere near it at all)
    float d1 = near0 ? bloom(P0, T, S, d2, c1) : 9.0;
    if (d1 < 1.0) {
      float lit = clamp(0.5 + 3.2 * (Y - c1.y) / S + 0.12 * (vn2(cell * 0.3) - 0.5), 0.0, 1.0);
      bool seam = d2 < 1.06 && d2 - d1 < 0.16 && Y < c1.y + S * 0.03;
      tileC = mix(P(rgb(92.0, 28.0, 66.0), rgb(232.0, 140.0, 178.0)), P(rgb(186.0, 76.0, 134.0), rgb(255.0, 210.0, 228.0)), lit) * (seam ? 0.78 : 1.0);
      tileA = smoothstep(1.0, 0.86, d1);
      // (the masses solid; a few open flowers on the lit tops, buds at the edge, the seams darker)
      float k = h2(cell + 21.0);
      int g = 0;
      if (d1 > 0.86) g = k < 0.35 ? G_STAR : (k < 0.6 ? G_MID : 0);
      else if (seam) g = k < 0.3 ? G_COMMA : 0;
      else if (lit > 0.6) g = k < 0.1 ? G_STAR : (k < 0.16 ? G_MID : 0);
      else if (lit > 0.3) g = k < 0.05 ? G_MID : 0;
      vec3 sh = P(rgb(196.0, 76.0, 140.0), rgb(150.0, 36.0, 92.0)), md = P(rgb(255.0, 140.0, 200.0), rgb(200.0, 64.0, 124.0)), hi = P(rgb(255.0, 230.0, 245.0), rgb(240.0, 110.0, 160.0));
      put(g, 0.95, lit < 0.5 ? mix(sh, md, lit * 2.0) : mix(md, hi, lit * 2.0 - 1.0));
      return;
    }
    if (near0 && d1 < 1.3 && h2(cell + 51.0) < 0.5 * (1.3 - d1)) { put(h2(cell + 52.0) < 0.5 ? G_STAR : G_SMALLO, 0.85, P(rgb(255.0, 170.0, 216.0), rgb(220.0, 90.0, 146.0))); return; }
    float inside;
    int g = near0 ? limbAt(P0, T, S, inside) : 0;
    if (g != 0) {
      // (the bark: fissures running up it, a knot here and there)
      if (inside > 0.5) { tileC = bark * 0.75; tileA = 0.9; float f = h2(vec2(cell.x, floor(row / 3.0)) + 61.0); put(h0 < 0.03 ? G_SMALLO : (f < 0.45 ? G_BAR : 0), 0.9, bark * 1.6); }
      else put(g, 1.0, bark * 1.25);
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
    // (solid: the deck a band of red lit along its top, the girder under it shaded; the rail and the
    // posts over whatever's behind them)
    if (dy > lo - ch * 0.5 && dy < hi + ch * 0.5) { tileC = red; tileA = 1.0; put(sg, 0.9, mix(red, vec3(1.0), 0.3)); return; }
    if (dy > lo - ch * 1.5 && dy < hi - ch * 0.5) { tileC = redD; tileA = 1.0; put(abs(sl) < 0.45 ? 0 : sg, 0.8, redD * 0.7); return; }
    float rail = 0.028;
    if (dy > lo + rail - ch * 0.5 && dy < hi + rail + ch * 0.5) { over = sg; overInk = 1.0; overC = red * 1.05; }
    else if (dy > hi && dy < hi + rail && mod(cell.x, 4.0) < 1.0) { over = G_BAR; overInk = 1.0; overC = red; }
  }
  // crumbs, dropped on each kick from the top of the bridge, falling to the water
  if (sea.w > 0.02 && sea.w < 0.98) {
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      vec2 cr = vec2(br.x + 0.018 + 0.008 * fk, br.z + br.w - (1.0 - sea.w) * (br.w + 0.008 * fk));
      if (abs(X - cr.x) < cw * 0.5 && abs(Y - cr.y) < ch * 0.5) { over = G_DOT; overInk = 1.0; overC = P(rgb(240.0, 200.0, 130.0), rgb(200.0, 140.0, 70.0)); break; }
    }
  }

  // --- the shishi-odoshi on the near bank: a bamboo spout drips into a pivoting tube; on each bar
  // it tips, pours into the stone basin under it and clacks back (in front of the koi)
  front = 1.0;
  {
    float bph = fract(sea.x / 3.14159);                           // (where in the bar: the beam turns on the bars)
    float tip = bph < 0.1 ? 1.0 : 1.0 - smoothstep(0.1, 0.3, bph);
    float ang = mix(0.42, -0.55, tip) - 0.06 * bph;               // (left end up, filling; down when it tips)
    vec2 piv = vec2(mix(0.2, 0.38, wide) * aspect, near + 0.042);
    vec2 dir = vec2(-cos(ang), sin(ang));                          // (toward its open end)
    vec2 r = vec2(X, Y) - piv;
    vec3 bamboo = P(rgb(96.0, 118.0, 62.0), rgb(150.0, 170.0, 60.0));
    // (the tube: a stout length of bamboo, solid, a node every few fingers, lit along its top and
    // shaded under it, its open end cut dark; at least two rows thick, whatever the window)
    float tr = max(0.006, 0.85 * ch);
    vec2 a0 = piv - dir * 0.03, a1 = piv + dir * 0.06, ba = a1 - a0, nrm = vec2(-ba.y, ba.x) / length(ba) * sign(ba.x);
    float tt, off;
    int tn = 0;
    for (int i = 0; i < 5; i++) {
      vec2 pa = vec2(X, Y) + (i == 4 ? vec2(0.0) : SUBG[i] * vec2(cw, ch)) - a0;
      float t2 = dot(pa, ba) / dot(ba, ba), o2 = dot(pa - ba * clamp(t2, 0.0, 1.0), nrm);
      if (t2 >= 0.0 && t2 <= 1.0 && abs(o2) < tr) tn++;
      if (i == 4) { tt = t2; off = o2; }
    }
    if (tn > 0) {
      bool inTube = tt >= 0.0 && tt <= 1.0 && abs(off) < tr;
      // (round its edge, where a cell's only partly in it: a stroke along the tube's slope)
      if (!inTube || tn < 4) { put(abs(ang) < 0.25 ? (off > 0.0 ? G_UNDER : G_TICK) : (ang > 0.0 ? G_BACK : G_SLASH), 0.9, bamboo * (off > 0.0 ? 1.05 : 0.8)); return; }
      bool node = fract(tt * length(ba) / 0.024 + 0.3) < 0.13;
      vec3 c = bamboo * (node ? 0.7 : (off > tr * 0.35 ? 1.14 : (off < -tr * 0.4 ? 0.8 : 1.0)));
      tileC = tt > 0.96 ? bamboo * 0.42 : c; tileA = 1.0;
      put(node ? G_BAR : G_BLANK, 0.5, c * 0.7);
      return;
    }
    // (its post, solid, the pin through the tube at the top)
    if (abs(X - piv.x) < max(cw * 0.6, 0.0035) && Y < piv.y && Y > near - 0.005) { tileC = bark; tileA = 1.0; put(G_BLANK, 0.0, bark); return; }
    // (the feed: a thinner pipe of bamboo from the left, a node at its mouth)
    vec2 sp = piv + vec2(-0.03, 0.03);
    float fr2 = max(0.004, 0.55 * ch);
    if (abs(Y - sp.y) < fr2 && X > sp.x - 0.05 && X < sp.x) { vec3 c = bamboo * 0.88 * (Y > sp.y + fr2 * 0.3 ? 1.12 : 1.0); tileC = X > sp.x - cw * 1.2 ? bamboo * 0.6 : c; tileA = 1.0; put(G_BLANK, 0.0, c); return; }
    vec2 open = piv + dir * 0.055;
    if (tip < 0.5 && abs(X - sp.x + cw * 0.5) < cw * 0.5 && Y < sp.y && Y > open.y && fract(time * 2.0 + (sp.y - Y) * 30.0) < 0.3) { put(G_DOT, 0.9, P(rgb(170.0, 200.0, 255.0), rgb(90.0, 130.0, 200.0))); return; }
    // the basin under it, a stone bowl, the water in it catching the light; and the splash as it pours
    vec2 bs = vec2(piv.x - 0.04, near + 0.002);
    float brx = 0.024, bry = max(0.01, 1.6 * ch);
    vec2 bq = vec2((X - bs.x) / brx, (Y - bs.y) / bry);
    if (bq.y >= 0.0 && bq.y < 1.0 && length(bq) < 1.0) {
      vec3 st = P(rgb(120.0, 120.0, 140.0), rgb(140.0, 134.0, 126.0)) * (0.8 + 0.25 * bq.y - 0.15 * bq.x);
      bool water = bq.y > 0.72;
      tileC = water ? P(rgb(90.0, 120.0, 180.0), rgb(140.0, 190.0, 220.0)) : st; tileA = 1.0;
      put(water ? G_TILDE : G_BLANK, 0.5, water ? P(rgb(170.0, 200.0, 255.0), rgb(240.0, 250.0, 255.0)) : st);
      return;
    }
    if (tip > 0.3 && abs(X - bs.x) < 0.015 && Y > bs.y && Y < bs.y + 0.025 && h2(cell + floor(time * 12.0)) < 0.4 * tip) { put(G_MID, 0.9, P(rgb(190.0, 214.0, 255.0), rgb(110.0, 150.0, 210.0))); return; }
    // the clack: the tube's other end striking its stone
    vec2 tail = piv - dir * 0.025;
    if (bph < 0.06 && length(vec2(X, Y) - tail - vec2(0.0, -0.008)) < cw) { put(G_STAR, 1.0, rgb(255.0, 240.0, 200.0)); return; }
  }
  // --- irises along the near bank, in front of the koi: blades of leaf, a violet flower atop some
  for (int i = 0; i < 3; i++) {
    float ix = (i == 0 ? 0.05 : (i == 1 ? mix(0.62, 0.46, wide) : 0.97)) * aspect;
    float dx = (X - ix) / cw;
    if (abs(dx) < 3.5 && Y > near - 0.01 && Y < near + 0.04) {
      float bladeH = 0.02 + 0.02 * h1(floor(dx) + float(i) * 7.0);
      float yb = Y - (near - 0.01);
      if (yb < bladeH) {
        bool flower = yb > bladeH - ch && h1(floor(dx) * 3.3 + float(i)) < 0.45;
        tileC = Y < near ? P(rgb(14.0, 34.0, 30.0), rgb(102.0, 150.0, 92.0)) : P(rgb(12.0, 20.0, 46.0), rgb(116.0, 170.0, 184.0)); tileA = 1.0;
        put(flower ? G_STAR : (dx < -1.0 ? G_BACK : (dx > 1.0 ? G_SLASH : G_BAR)), 0.95, flower ? P(rgb(170.0, 120.0, 255.0), rgb(110.0, 70.0, 200.0)) : P(rgb(70.0, 150.0, 90.0), rgb(60.0, 130.0, 60.0)));
        return;
      }
    }
  }

  front = 0.5;
  // --- the near bank: moss and stones along the bottom
  float nb = near + 0.006 * sin(X * 11.0) + 0.004 * (vn(X * 40.0) - 0.5);
  if (Y < nb) {
    // (moss, solid, tufts of grass on it, a stone here and there)
    float k = h2(cell + 4.0);
    tileC = mix(P(rgb(14.0, 34.0, 30.0), rgb(102.0, 150.0, 92.0)), P(rgb(10.0, 26.0, 24.0), rgb(82.0, 128.0, 74.0)), clamp((nb - Y) / max(nb, 1e-3), 0.0, 1.0)); tileA = 1.0;
    put(k < 0.035 ? G_BIGO : (k < 0.22 ? G_QUOTE : (k < 0.34 ? G_COMMA : 0)), 0.8, k < 0.035 ? P(rgb(130.0, 130.0, 150.0), rgb(130.0, 126.0, 120.0)) : P(rgb(60.0, 120.0, 86.0), rgb(70.0, 130.0, 66.0)));
    return;
  }

  // --- the pond: still water, the koi, a few lily pads, the bridge mirrored (closing the ring),
  // the lanterns and the moon drawn down it, ripples on the kicks
  if (Y < bank) {
    float depth = (bank - Y) / (bank - near);
    // (solid: still water, jade by day, paler toward the far bank; deep by night)
    vec3 water = mix(P(rgb(26.0, 36.0, 70.0), rgb(178.0, 210.0, 212.0)), P(rgb(12.0, 20.0, 46.0), rgb(116.0, 170.0, 184.0)), depth);
    tileC = water; tileA = 1.0;
    // (the koi: in pixels, over the glyphs, behind the lily pads: see drawGardenKoi)
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
      if (m > lo - ch * 1.5 && m < hi + ch * 0.5 && vn2(vec2(X * 30.0, row)) > 0.25) { tileC = mix(water, red, 0.45); put(h0 < 0.4 ? G_TILDE : 0, 0.6, red * 0.8); return; }
    }
    // petals floating on the water, drifting with the wind
    if (h2(vec2(floor(cell.x - time * (0.3 + 1.5 * wind)), row) + 77.0) < 0.012) { put(h0 < 0.5 ? G_COMMA : G_MID, 0.8, mix(pink, pinkL, h0)); return; }
    // lily pads (see gardenPad): a tile where one covers the cell, a light glyph round its edge
    {
      vec2 gsz = vec2(cw * 16.0, ch * 7.0), pg = floor(vec2(X, Y) / gsz);
      vec3 c, c2;
      int part = gardenPad(pg, vec2(X, Y), gsz, c);
      bool hit[4];
      int n = part > 0 ? 1 : 0;
      for (int i = 0; i < 4; i++) { hit[i] = gardenPad(pg, vec2(X, Y) + SUBG[i] * vec2(cw, ch), gsz, c2) > 0; if (hit[i]) { n++; if (part == 0) c = c2; } }
      if (n > 0) {
        front = 1.0;
        if (part == 0 || n < 3) { put(edgeG(hit[0], hit[1], hit[2], hit[3]), 0.9, c); return; }
        tileC = c; tileA = 1.0;
        put(part == 2 ? G_STAR : G_BLANK, 0.6, part == 2 ? pink : c);
        return;
      }
    }
    // the lanterns and the moon in the water
    float sd = h2(vec2(cell.x, row) + floor(time * 2.0));
    if (!day && (abs(X - l1) < cw * 1.5 || abs(X - l2) < cw * 1.5) && depth < 0.5 && sd < 0.6 - depth) { tileC = mix(water, lampC, 0.35 * (1.0 - depth)); put(G_DASH, 0.8 - depth, lampC); return; }
    float path = abs(X - sunAt.x) - 0.01 - 0.05 * depth;
    if (path < 0.0) tileC = mix(tileC, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 236.0, 180.0)), 0.16);
    if (path < 0.0 && sd > (day ? 0.6 : 0.45)) { put(sd > 0.92 ? G_STAR : (sd > 0.75 ? G_DBL : G_DASH), 0.9, P(rgb(242.0, 236.0, 208.0), rgb(255.0, 216.0, 140.0))); return; }
    float streak = vn2(vec2((X + time * 0.002) * 12.0, row));
    if (streak > 0.8) tileC = mix(tileC, P(rgb(50.0, 70.0, 120.0), rgb(206.0, 228.0, 228.0)), 0.4);
    put(streak > 0.86 ? G_DASH : 0, 0.45, P(rgb(70.0, 96.0, 160.0), rgb(226.0, 240.0, 240.0)));
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
    float ad = length(vec2((X - ax) / rx, (Y - (bank + ry * 0.6)) / ry)) / (1.0 + 0.1 * (vn(X * 160.0 + float(i) * 9.0) - 0.5));
    if (ad < 1.0 && Y > bank) {
      // (clipped round, solid, lighter on top, flowers dotted over it)
      float k = h2(cell + 31.0 + float(i)), lit = clamp((Y - bank) / (ry * 1.6), 0.0, 1.0);
      tileC = mix(P(rgb(84.0, 18.0, 52.0), rgb(206.0, 70.0, 118.0)), P(rgb(168.0, 46.0, 106.0), rgb(250.0, 144.0, 182.0)), lit);
      tileA = 0.88 * smoothstep(1.0, 0.72, ad);
      put(ad > 0.82 && Y > bank + ry * 0.6 ? G_SMALLO : (k < 0.3 ? G_STAR : 0), 0.95, P(rgb(255.0, 150.0, 200.0), rgb(140.0, 24.0, 76.0)));
      return;
    }
  }
  if (Y > bank && Y < bank + 0.04 && abs(X - l2) < 0.075 && abs(X - l2) > 0.03) {
    float v = (Y - bank) / 0.04;
    vec3 cane = P(rgb(176.0, 150.0, 100.0), rgb(170.0, 140.0, 80.0));
    if (abs(v - 0.33) < 0.12 || abs(v - 0.75) < 0.12) { put(G_DBL, 0.9, cane * 0.85); return; }
    if (mod(cell.x, 2.0) < 1.0) { put(G_BAR, 0.9, cane); return; }
  }

  // --- the far bank: grass, a stone here and there; the hill behind it, its trees, the pagoda on top
  if (Y < bank + 0.01) {
    float k = h2(cell + 9.0);
    tileC = P(rgb(18.0, 40.0, 34.0), rgb(150.0, 190.0, 130.0)); tileA = 0.5;
    put(k < 0.03 ? G_BIGO : (k < 0.3 ? G_QUOTE : (k < 0.45 ? G_COMMA : 0)), 0.8, k < 0.03 ? P(rgb(110.0, 110.0, 130.0), rgb(140.0, 136.0, 130.0)) : P(rgb(50.0, 100.0, 76.0), rgb(80.0, 140.0, 70.0)));
    return;
  }
  {
    float px = mix(0.28, 0.4, wide) * aspect;
    float hump = bank + 0.035 + 0.07 * exp(-pow((X - px) / 0.17, 2.0));
    float hill = hump + 0.01 * (vn(X * 9.0) - 0.5);
    // the pagoda (PAGODA_ART), standing on the hill's top (the small one in a short window)
    int part, pk = grid.y < 44.0 ? 1 : 0;
    int g = pagodaAt(pk, int(cell.x) - (int(floor(px / cw)) - (pk == 0 ? 10 : 5)), int(row) - (int(floor((1.0 - bank - 0.105) / ch)) - (pk == 0 ? 11 : 6)), part);
    if (part != 0) {
      vec3 roof = P(rgb(46.0, 40.0, 70.0), rgb(92.0, 84.0, 104.0)), edge = P(rgb(150.0, 146.0, 196.0), rgb(60.0, 54.0, 70.0));
      if (part == 3) { put(g, 1.0, P(rgb(220.0, 190.0, 110.0), rgb(160.0, 124.0, 60.0))); return; }     // (the spire)
      if (part == 6) { tileC = roof; tileA = 0.95; put(g, 0.8, roof * 1.7 + 0.04); return; }         // (a roof's tiles)
      if (part == 5) { tileC = P(rgb(112.0, 34.0, 40.0), rgb(204.0, 82.0, 62.0)); tileA = 0.95; put(g, 0.7, P(rgb(160.0, 60.0, 60.0), rgb(236.0, 120.0, 92.0))); return; }
      if (part == 2) {                                                                              // (a window, lit at night)
        tileC = day ? rgb(60.0, 30.0, 36.0) : lampC * (0.7 + 0.15 * glow); tileA = 1.0;
        put(g, 1.0, day ? rgb(90.0, 50.0, 50.0) : rgb(255.0, 230.0, 170.0));
        return;
      }
      if (part == 7) { tileC = P(rgb(70.0, 70.0, 90.0), rgb(150.0, 146.0, 140.0)); tileA = 0.9; put(g, 1.0, P(rgb(150.0, 150.0, 176.0), rgb(110.0, 106.0, 100.0))); return; }
      put(g, 1.0, edge);                                                                            // (the eaves and walls' edges)
      return;
    }
    if (Y < hill) {
      // the hill, solid, its line drawn along its top; round trees on it, darker, their crowns
      // breaking its line
      float tk = floor(X / (cw * 5.0)), tc = (tk + 0.5) * cw * 5.0, th = 0.014 + 0.02 * h1(tk * 3.3);
      bool tree = h1(tk * 7.7) < 0.55 && length(vec2((X - tc) / 1.3, Y - (hill - 0.004))) < th;
      if (!tree && Y > hill - ch) {
        float hl = bank + 0.035 + 0.07 * exp(-pow((X - cw * 0.5 - px) / 0.17, 2.0)) + 0.01 * (vn((X - cw * 0.5) * 9.0) - 0.5);
        float hr = bank + 0.035 + 0.07 * exp(-pow((X + cw * 0.5 - px) / 0.17, 2.0)) + 0.01 * (vn((X + cw * 0.5) * 9.0) - 0.5);
        float sl = (hr - hl) / ch;
        tileC = P(rgb(20.0, 30.0, 44.0), rgb(160.0, 196.0, 150.0)); tileA = (day ? 0.6 : 0.85) * 0.45;
        put(abs(sl) < 0.4 ? G_UNDER : (sl > 0.0 ? G_SLASH : G_BACK), 0.9, P(rgb(60.0, 110.0, 96.0), rgb(90.0, 140.0, 90.0)));
        return;
      }
      tileC = tree ? P(rgb(14.0, 34.0, 32.0), rgb(96.0, 146.0, 100.0)) : P(rgb(20.0, 30.0, 44.0), rgb(160.0, 196.0, 150.0));
      tileA = day ? 0.6 : 0.85;
      put(tree ? (h0 < 0.3 ? G_SMALLO : 0) : (h0 < 0.08 ? G_COLON : 0), 0.7, P(rgb(50.0, 100.0, 86.0), rgb(60.0, 110.0, 70.0)));
      return;
    }
    // (a tree's crown standing above the hill's line)
    float tk = floor(X / (cw * 5.0)), tc = (tk + 0.5) * cw * 5.0, th = 0.014 + 0.02 * h1(tk * 3.3);
    float td = length(vec2((X - tc) / 1.3, Y - (hill - 0.004)));
    if (h1(tk * 7.7) < 0.55 && td < th) {
      tileC = P(rgb(14.0, 34.0, 32.0), rgb(96.0, 146.0, 100.0)); tileA = (day ? 0.6 : 0.85) * clamp((th - td) / (ch * 0.8) + 0.3, 0.0, 1.0);   // (its edge soft)
      put(h0 < 0.3 ? G_SMALLO : 0, 0.7, P(rgb(50.0, 100.0, 86.0), rgb(60.0, 110.0, 70.0)));
      return;
    }
  }
  // --- a snow-capped peak far behind, faint in the haze, its slopes flaring out at the foot
  {
    float fx = mix(0.42, 0.5, wide) * aspect, fb = bank + 0.05, fh = mix(0.17, 0.2, wide), fw = mix(0.3, 0.36, wide);   // (behind the pagoda)
    float u = abs(X - fx) / fw;
    float top = u < 1.0 ? fb + fh * pow(1.0 - u, 1.7) : -1.0;
    float tl = abs(X - cw * 0.5 - fx) / fw < 1.0 ? fb + fh * pow(1.0 - abs(X - cw * 0.5 - fx) / fw, 1.7) : -1.0;
    float tr = abs(X + cw * 0.5 - fx) / fw < 1.0 ? fb + fh * pow(1.0 - abs(X + cw * 0.5 - fx) / fw, 1.7) : -1.0;
    if (Y < max(max(tl, tr), top) + ch * 0.5 && (abs(top - Y) < ch * 0.5 || (Y - tl) * (Y - tr) <= 0.0) && top > 0.0) {
      float sl = (tr - tl) / ch;
      bool apex = top > tl && top > tr, snowE = Y > fb + fh * 0.6;
      tileC = snowE ? P(rgb(150.0, 160.0, 206.0), rgb(252.0, 252.0, 255.0)) : P(rgb(30.0, 36.0, 74.0), rgb(170.0, 186.0, 222.0));
      tileA = clamp(0.5 + (top - Y) / ch, 0.15, 0.6);
      put(apex ? G_CARET : (abs(sl) < 0.4 ? G_UNDER : (sl > 0.0 ? G_SLASH : G_BACK)), 0.8, P(rgb(190.0, 200.0, 240.0), rgb(130.0, 140.0, 180.0)));
      return;
    }
    if (Y < top) {
      // (solid, hazy; its snow cap's foot ragged, streaks of it running down the gullies)
      float gully = pow(vn(X * 46.0 + 3.0), 3.0);
      float snowY = fb + fh * (0.62 - 0.16 * gully) + 0.01 * (vn(X * 30.0) - 0.5);
      bool snow = Y > snowY, foot = snow && Y < snowY + ch;           // (its foot ragged, a drip here and there)
      // (the face toward the sun or the moon lit, the other in shade, a little deeper toward the ridge)
      bool lit = (X - fx) * (sunAt.x - fx) > 0.0;
      float k = lit ? 0.0 : 0.6 + 0.4 * (1.0 - u);
      tileC = snow ? mix(P(rgb(150.0, 160.0, 206.0), rgb(252.0, 252.0, 255.0)), P(rgb(96.0, 106.0, 160.0), rgb(196.0, 206.0, 236.0)), k)
                   : mix(P(rgb(30.0, 36.0, 74.0), rgb(170.0, 186.0, 222.0)), P(rgb(20.0, 24.0, 54.0), rgb(132.0, 148.0, 196.0)), k);
      tileA = foot ? (h0 < 0.5 ? 0.6 : 0.35) : (snow ? (day ? 0.85 : 0.62) : (day ? 0.5 : 0.6));
      put(foot ? (h0 < 0.3 ? G_VEE : 0) : (snow ? 0 : (h0 < 0.06 ? G_DOT : 0)), foot ? 0.7 : (snow ? 0.6 : 0.45), snow ? P(rgb(220.0, 228.0, 255.0), rgb(150.0, 162.0, 210.0)) : P(rgb(70.0, 80.0, 130.0), rgb(130.0, 150.0, 190.0)));
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
// the falls swelling after a drop (and every 8 bars): 1 then, fading over a few seconds
float surge() { return leap.w > 0.5 ? exp(-max(leap.x, 0.0) * 0.6) : 0.0; }
// the falls' half width at y: narrow at the lip, widening as it falls, wider in a surge
float fallW(float y) {
  float u = clamp((farL.x - y) / (farL.x - lake.x), 0.0, 1.0);
  return mix(0.07, 0.115, u) * (1.0 + 0.12 * surge());
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
// a strand of the falls, column col, fallen fall (0 at the lip, 1 at the pool, along the square root
// of the drop: stretching and quickening on the way down, as under gravity): below 0 none, else how
// thick (layer 0 the front, 1 the sheet behind it, dimmer and slower)
float strand(float col, float fall, float flow, int layer) {
  float cs = h1(col * (layer == 0 ? 1.3 : 2.9) + (layer == 0 ? 0.0 : 5.0));
  return vn(fall * (layer == 0 ? 10.0 + 5.0 * cs : 6.0 + 3.0 * cs) - flow * (layer == 0 ? 0.8 + 0.5 * cs : 0.45 + 0.3 * cs) + cs * 40.0);
}
// the aurora (as over the snow): curtains of light hanging from two ribbons folded across the sky,
// drifting with the music, flaring on a kick, each column a ray. Its light at p (0-1+), and how far up
// its curtain (0 at its foot, 1 at its top)
float aurora(vec2 p, float foot0, out float up) {
  float best = 0.0, ph = sea.z * 0.05 + time * 0.02;
  up = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i), x = p.x * (1.0 + 0.5 * fi) + fi * 3.7 + 1.3;
    float a1 = x * 2.1 + ph * 2.0, a2 = x * 5.3 - ph * 3.1;
    float foot = foot0 + fi * 0.08 + 0.06 * sin(a1) + 0.03 * sin(a2) + 0.008 * sin(x * 13.0 + time * 0.5);
    float fold = min(1.0, abs(0.147 * cos(a1) + 0.186 * cos(a2)) * 2.5);
    float hgt = (0.2 + 0.16 * vn(x * 3.0 + ph)) * (1.0 - 0.3 * fi);
    float s = (p.y - foot) / hgt;
    if (s < 0.0 || s > 1.0) continue;
    float ray = vn(x * 110.0 + time * (0.3 + 1.4 * fly) + fi * 50.0);
    ray = 0.2 + 0.8 * ray * ray * (0.5 + 0.5 * vn(x * 23.0 - time * 0.2));
    float a = 2.3 * ray * exp(-s * 1.9) * (1.0 - s * s) * (0.35 + 0.65 * vn(x * 1.6 + ph * 5.0)) * (0.65 + 0.6 * fold)
            * (0.65 + 0.45 * glow + 0.4 * sea.w * exp(-s * 5.0)) * (1.0 - 0.35 * fi) * 0.72;   // (a backdrop here, under the falls)
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
// the mist and the bow over this cell (set at the start of main), laid over whatever's drawn there (see
// putF): their colours and how thick
float mistA = 0.0, bowA = 0.0;
vec3 mistC = vec3(1.0), bowC = vec3(0.0);
// a colour x laid over the cell at a: its tile's colour and cover as they'd look with it over them, the
// paper under them
void lay(vec3 x, float a) {
  if (a <= 0.0) return;
  float A = tileA + a - tileA * a;
  tileC = (tileC * tileA * (1.0 - a) + x * a) / max(A, 1e-4);
  tileA = A;
}
// put, with the bow and then the mist over it
void putF(int g, float ink, vec3 c) {
  lay(bowC, bowA); c = mix(c, bowC, bowA);
  lay(mistC, mistA); c = mix(c, mistC, mistA);
  put(g, ink, c);
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
  float fw = fallW(Y), flow = sea.z, footA = lip + 0.12;
  // the water's blues, deep to light, and its foam's white
  vec3 wD = P(rgb(20.0, 34.0, 84.0), rgb(58.0, 110.0, 174.0)), wM = P(rgb(40.0, 66.0, 134.0), rgb(98.0, 156.0, 214.0));
  vec3 wL = P(rgb(98.0, 130.0, 204.0), rgb(172.0, 212.0, 244.0)), wW = P(rgb(196.0, 212.0, 252.0), rgb(246.0, 251.0, 255.0));
  vec3 white = wW, blue = wL;
  vec3 moss = P(rgb(70.0, 150.0, 104.0), rgb(76.0, 140.0, 64.0)), fern = P(rgb(90.0, 170.0, 110.0), rgb(90.0, 156.0, 70.0));
  vec3 stL = P(rgb(92.0, 96.0, 140.0), rgb(156.0, 150.0, 140.0)), stD = P(rgb(36.0, 38.0, 70.0), rgb(94.0, 88.0, 84.0));
  float sg = surge(), ka = sea.w > 0.02 ? -log(sea.w) / 4.0 : 9.0;      // (the surge; how long since the kick, s)

  // --- the mist at the falls' foot, drifting up, billowing on each kick, laid over whatever's there;
  // a rainbow standing in it by day, a moonbow at night
  float mr = length(vec2((X - cx) / (0.18 + 0.05 * sg), (Y - pool - 0.01) / (0.1 + 0.04 * sg + 0.02 * sea.w)));
  if (mr < 1.8) {
    float n = fbm(vec2(X * 6.0 + 0.4 * sin(time * 0.13), Y * 9.0 - time * 0.32));
    mistA = min(0.78, smoothstep(1.8, 0.2, mr) * (0.24 + 0.3 * sea.w + 0.3 * sg + 0.1 * glow) * (0.35 + 1.05 * n));
    mistC = P(rgb(150.0, 170.0, 226.0), rgb(250.0, 252.0, 255.0));
    // (the bow: an arc over the foot, red outside to violet in, in bands a cell or so wide)
    vec2 bc = vec2(cx + 0.02, pool - 0.08);
    float R = mix(0.17, 0.23, wide), br = (length((vec2(X, Y) - bc) * vec2(0.85, 1.0)) - R) / 0.05;
    if (abs(br) < 1.0 && Y > pool - 0.02) {
      float k = (br + 1.0) * 0.5;               // (0 inside, 1 outside)
      bowC = day ? (k > 0.83 ? rgb(232.0, 70.0, 70.0) : k > 0.66 ? rgb(250.0, 150.0, 60.0) : k > 0.5 ? rgb(240.0, 210.0, 70.0) : k > 0.33 ? rgb(90.0, 190.0, 100.0) : k > 0.17 ? rgb(80.0, 140.0, 230.0) : rgb(150.0, 100.0, 220.0))
                 : mix(rgb(170.0, 180.0, 220.0), rgb(236.0, 240.0, 255.0), k);
      bowA = (0.25 + 0.55 * smoothstep(0.04, 0.4, mistA)) * (day ? 0.62 : 0.34) * (1.0 - pow(abs(br), 6.0));
    }
  }
  // (over it all: the spray, a burst of drops thrown up from the foot on each kick, arcing over and
  // falling back; glints in the mist when the hats are busy)
  if (ka < 0.9) {
    for (int k = 0; k < 16; k++) {
      float fk = float(k), a = (h1(fk * 3.1) - 0.5) * 2.6, sp = 0.2 + 0.25 * h1(fk * 7.7);
      vec2 pp = vec2(cx + (h1(fk * 1.7) - 0.5) * fallW(pool) * 2.0, pool + 0.004) + vec2(sin(a), cos(a)) * sp * ka - vec2(0.0, 0.75 * ka * ka);
      if (pp.y > pool - 0.01 && abs(X - pp.x) < cw * 0.5 && abs(Y - pp.y) < ch * 0.5) { over = ka < 0.15 ? G_STAR : (ka < 0.45 ? G_TICK : G_DOT); overInk = 1.0 - 0.8 * ka; overC = wW; break; }
    }
  }
  if (mr < 1.4 && over == 0) {
    float glint = h2(cell + floor(time * 9.0));
    if (glint > 0.992 - 0.03 * fly * smoothstep(1.4, 0.3, mr)) { over = glint > 0.998 ? G_SPARK : G_TICK; overInk = 1.0; overC = P(rgb(240.0, 246.0, 255.0), rgb(255.0, 255.0, 255.0)); }
  }
  // (the fish's splashes where it leaves the pool and where it lands; the fish itself is in pixels)
  if (leap.w > 0.5 && leap.x < 1.3 && over == 0) {
    float x0 = cx + leap.y * 0.15, x1 = cx + leap.y * 0.06;
    for (int i = 0; i < 2; i++) {
      float age = leap.x - float(i);
      vec2 sp = vec2(i == 0 ? x0 : x1, pool - 0.02);
      if (age > 0.0 && age < 0.35 && abs(Y - sp.y - 0.01) < ch * 1.2 && abs(X - sp.x) < cw * (1.0 + age * 8.0) && h0 < 0.7 - 2.0 * age) { over = Y > sp.y + 0.005 ? G_TICK : G_STAR; overInk = 1.0; overC = wW; break; }
    }
  }

  // --- the near bank, along the bottom: grass, solid, darker toward the front, its blades and tufts
  // lighter, thicker toward the front, a flower here and there; stones over it, round, lit on top,
  // bigger toward the front, moss on some; a boulder at each corner in front, framing it; at night
  // fireflies drifting over it, blinking
  if (Y < lake.y) {
    float k = h2(cell + 4.0), dn = clamp((lake.y - Y) / max(0.02, lake.y), 0.0, 1.0);    // (0 at its top, 1 at the bottom)
    if (!day) {
      for (int i = 0; i < 9; i++) {
        float fi = float(i), fx = fract(h1(fi * 3.7) + time * 0.006 * (h1(fi) - 0.5)) * aspect + 0.02 * sin(time * 0.5 + fi * 2.1);
        float fy = lake.y * (0.15 + 0.75 * h1(fi * 5.3)) + 0.012 * sin(time * 0.8 + fi * 1.3);
        float on = step(0.45 - 0.3 * fly, h1(fi * 9.1 + floor(time * 1.5 + fi * 0.37)));
        if (on > 0.5 && abs(X - fx) < cw * 0.5 && abs(Y - fy) < ch * 0.5) { over = G_BULLET; overInk = 1.0; overC = rgb(210.0, 255.0, 130.0); break; }
      }
    }
    // (the boulders at the corners, in front: big, round, mossy on top)
    for (int i = 0; i < 2; i++) {
      float bx = i == 0 ? 0.06 * aspect - 0.02 : 0.94 * aspect + 0.02, by = lake.y * 0.32, rx = 0.06 + 0.02 * wide, ry = min(0.05, lake.y * 0.42);
      vec2 q = vec2((X - bx) / rx, (Y - by) / ry);
      if (dot(q, q) < 1.0) {
        tileC = mix(stD * 0.85, stL, clamp(0.45 + 0.5 * q.y + 0.2 * q.x * (i == 0 ? 1.0 : -1.0), 0.0, 1.0)); tileA = 1.0;
        if (q.y > 0.45 + 0.2 * vn(X * 60.0)) { tileC = mix(tileC, moss, 0.65); putF(h0 < 0.45 ? G_QUOTE : 0, 0.75, moss * 1.25); return; }
        putF(h0 < 0.05 ? G_DOT : 0, 0.4, tileC * 0.7);
        return;
      }
    }
    vec3 grass = mix(P(rgb(30.0, 62.0, 52.0), rgb(108.0, 160.0, 82.0)), P(rgb(16.0, 38.0, 36.0), rgb(66.0, 116.0, 56.0)), dn);
    vec3 blade = mix(grass, P(rgb(74.0, 124.0, 92.0), rgb(164.0, 208.0, 122.0)), 0.6);
    vec2 SS = vec2(cw * 12.0, 0.08), gi = floor(vec2(X, Y) / SS);
    bool shade = false;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 gg = gi + vec2(float(i), float(j));
      if (h2(gg + 3.7) > 0.4) continue;
      vec2 c = (gg + 0.2 + 0.6 * vec2(h2(gg + 1.1), h2(gg + 2.3))) * SS;
      if (c.y > lake.y - 0.014) continue;                       // (on the bank, not over its edge)
      float sz = (0.8 + 0.7 * h2(gg + 5.5)) * (1.0 + 0.8 * clamp((lake.y - c.y) / max(0.02, lake.y), 0.0, 1.0));
      vec2 q = vec2((X - c.x) / (cw * 2.4 * sz), (Y - c.y) / (0.017 * sz)), q2 = q + vec2(-0.25, 1.0) * vec2(1.0, 0.017 * sz) / (0.017 * sz);
      if (dot(vec2(q.x - 0.15, q.y + 0.7), vec2(q.x - 0.15, q.y + 0.7)) < 0.8 && dot(q, q) >= 1.0) shade = true;   // (its shadow on the grass)
      if (dot(q, q) < 1.0) {
        tileC = mix(stD, stL, clamp(0.5 + 0.5 * q.y - 0.2 * q.x, 0.0, 1.0)); tileA = 1.0;
        if (q.y > 0.35 && h2(gg + 8.0) < 0.45) { tileC = mix(tileC, moss, 0.6); putF(h0 < 0.4 ? G_QUOTE : 0, 0.7, moss * 1.2); return; }
        putF(0, 0.0, tileC);
        return;
      }
    }
    tileC = Y > lake.y - ch ? mix(grass, blade, 0.5) : grass; tileA = 1.0;
    if (shade) tileC *= 0.78;
    if (k < 0.012) { putF(G_STAR, 0.9, k < 0.006 ? P(rgb(230.0, 200.0, 120.0), rgb(255.0, 214.0, 90.0)) : P(rgb(220.0, 150.0, 190.0), rgb(240.0, 120.0, 170.0))); return; }
    float tuft = vn2(vec2(X * 30.0, Y * 40.0));
    putF(k < 0.12 + 0.3 * dn * tuft ? G_QUOTE : (k < 0.26 + 0.2 * dn ? G_COMMA : 0), 0.75, blade);
    return;
  }

  // --- the pool: solid water, deeper toward the bank, churned lighter by the foot; foam churning out
  // from the falls' foot in white puffs and drifting off across it in trails; ripples on the kicks;
  // boulders at its sides; on its surface the falls mirrored, broken by the ripples, the current's
  // rings moving on the beats, the moon's (or the sun's) path, and at night the aurora's light
  if (Y < pool) {
    float dd = pool - Y, depth = clamp(dd / (pool - lake.y), 0.0, 1.0);
    float footW = fallW(pool) * 1.3 * (1.0 + 0.25 * sea.w + 0.3 * sg);
    vec3 water = mix(wM, wD, 0.3 + 0.55 * depth);
    water = mix(water, wL, 0.4 * (1.0 - smoothstep(0.0, footW * 3.0, dx)) * (1.0 - depth));
    tileC = water; tileA = 1.0;
    // (the white water churning at the falls' foot: puffs, dense in the middle, breaking up toward its
    // edges, lit on top, wider on a kick and in a surge)
    float mound = pool - 0.03 * (1.0 - smoothstep(0.0, footW * 1.6, dx)) - 0.006 * vn(X * 60.0 + time * 4.0);
    if (dx < footW * 1.7 && Y > mound - 0.012 && Y > pool - 0.045) {
      float hot = 1.0 - dx / (footW * 1.7);
      float fo = fbm(vec2(X * 34.0, Y * 24.0 - time * 1.5)), th = 0.66 - 0.5 * hot;
      if (fo > th) {
        float up = fbm(vec2(X * 34.0, (Y + ch) * 24.0 - time * 1.5));
        tileC = mix(wL, wW, up > th ? 0.55 + 0.45 * smoothstep(th, th + 0.25, fo) : 1.0);
        putF(h0 < 0.05 ? G_SMALLO : 0, 0.5, wL);
        return;
      }
      tileC = mix(water, wL, 0.5 * hot);
    }
    for (int i = 0; i < 4; i++) {
      vec4 q = rip[i];
      if (q.w <= 0.0) continue;
      float rad = 0.01 + q.z * 0.07, d = length(vec2(X - q.x, (Y - q.y) * 4.0)) - rad;
      if (abs(d) < cw * 0.8 && exp(-q.z * 1.2) > 0.1) { putF((X - q.x) < -rad * 0.8 ? G_LP : ((X - q.x) > rad * 0.8 ? G_RP : G_DASH), 0.8, wW); return; }
    }
    // boulders along its far edge, out from the falls: round, solid, lit on top, moss over them, the
    // water lapping white at their feet
    if (dx > fallW(pool) * 1.8 && Y > pool - 0.075) {
      float S = cw * 12.0, k = floor(X / S);
      for (int j = -1; j <= 1; j++) {
        float kk = k + float(j);
        if (h1(kk * 3.9 + 1.0) > 0.55) continue;
        float r = 0.026 + 0.02 * h1(kk * 5.3), bx = (kk + 0.5 + 0.3 * (h1(kk * 2.1) - 0.5)) * S, by = pool - r - ch, cut = by - r * 0.35;
        #define INB(p) (length(vec2(((p).x - bx) / (r * 1.3), ((p).y - by) / r)) < 1.0 && (p).y > cut)
        vec2 P0 = vec2(X, Y);
        if (INB(P0)) {
          float v = (Y - by) / r, u = (X - bx) / (r * 1.3);
          tileC = mix(stD, stL, clamp(0.4 + 0.55 * v - 0.3 * u * sd, 0.0, 1.0)); tileA = 1.0;
          if (h1(kk * 8.3) < 0.5 && !INB(P0 + vec2(0.0, ch))) { tileC = moss * (day ? 0.85 : 0.6); putF(h0 < 0.4 ? G_QUOTE : 0, 0.8, moss * 1.2); return; }   // (moss along its top)
          if (Y < cut + ch) { tileC = mix(tileC, wW, 0.45); putF(0, 0.0, wW); return; }   // (the water lapping white at its foot)
          putF(0, 0.0, tileC);
          return;
        }
      }
    }
    float rip2 = 0.004 * sin(Y * 150.0 + time * 1.9) + 0.003 * sin(Y * 61.0 - time * 1.1);
    // (foam drifting off from the foot in trails, out across the pool, thinning as it goes)
    {
      float ang = atan(dd * 3.0, X - cx), rad = length(vec2((X - cx) * 0.6, dd * 2.2));
      float tr = vn2(vec2(ang * 7.0, rad * 30.0 - time * 0.9)) * (1.0 - smoothstep(0.08, 0.45, rad));
      if (tr > 0.6 - 0.08 * sea.w && rad > 0.04) { tileC = mix(tileC, wL, 0.35 + 0.6 * (tr - 0.55)); putF(tr > 0.72 ? G_TILDE : 0, 0.6, wW); return; }
    }
    // (the falls mirrored in the water, lighter strips, broken by the ripples)
    {
      float ym = pool + dd * 1.15, xr = X + rip2;
      float e = abs(xr - cx) / fallW(ym);
      if (e < 1.0 && ym < lip && mod(row, 4.0) > 0.5) {
        float fall = sqrt(clamp((lip - ym) / (lip - pool), 0.0, 1.0));
        float v = strand(floor(xr / cw), fall, flow, 0), dens = (1.0 - e * e * 0.7) * 0.55 * (1.0 - dd / (pool - lake.y));
        if (v < dens) { tileC = mix(tileC, wL, 0.2 + 0.4 * (dens - v)); putF(dens - v > 0.2 ? G_VLINE : 0, 0.35, wW); return; }
      }
    }
    // (at night the aurora's light on the water, its rays mirrored, broken by the ripples)
    if (!day) {
      float up, a = aurora(vec2(X + rip2 * 2.0, footA + 0.05 + dd * 0.6), footA, up);
      if (a > 0.4 && mod(row + floor(h0 * 3.0), 3.0) > 0.5) { tileC = mix(tileC, auroraCol(up) * 0.7, 0.25 * min(1.0, a)); putF(G_VLINE, 0.25 + 0.4 * min(1.0, a), auroraCol(up) * 0.85); return; }
    }
    // the current: rings spreading out from the foot, moving on the beats
    float rr = length(vec2((X - cx) * 0.55, (Y - pool) * 2.6));
    float ring = fract(rr * 9.0 - flow * 0.5);
    if (ring < 0.12 && vn2(vec2(X * 20.0, row)) > 0.35) { tileC = mix(tileC, wL, 0.22); putF(ring < 0.035 ? G_TILDE : 0, 0.45, wL); return; }
    float path = abs(X + rip2 - sunAt.x) - 0.01 - 0.05 * (pool - Y) / (pool - lake.y);
    float tw = h2(vec2(cell.x, row) + floor(time * 2.0));
    if (path < 0.0) {
      vec3 gc = P(rgb(242.0, 236.0, 208.0), rgb(255.0, 230.0, 160.0));
      tileC = mix(tileC, gc, 0.18);
      if (tw > (day ? 0.62 : 0.5)) { putF(tw > 0.92 ? G_STAR : G_DASH, 0.9, gc); return; }
    }
    putF(h0 < 0.03 ? G_DASH : 0, 0.4, wL);
    return;
  }

  // --- the falls: water pouring from the lip in a solid curtain, each column its own blue, its strands
  // streaking down it in light lines, quickening as they fall, the sheet behind showing darker where they
  // part; the brink glassy as it curves over, lit along its edge; whitening into foam toward the foot; a
  // surge of white racing down on each kick, the whole falls swelling in a surge. Behind its sides the
  // wet rock, dark, drops fraying off the water's edges across it
  if (dx < fw + 3.0 * cw && Y < lip + ch) {
    float e = dx / fw;                                         // (0 at the middle, 1 at the edge)
    if (Y > lip - 2.0 * ch) {                                 // the brink: the river's surface, then the glassy curve over
      if (e < 1.0) {
        bool curve = Y <= lip - ch;
        tileC = curve ? mix(wL, wW, 0.35) : mix(wM, wL, 0.3); tileA = 1.0;
        if (e > 0.86) tileC = mix(tileC, wD, 0.45);
        putF(curve ? G_HHEAVY : (h0 < 0.5 ? G_TILDE : G_APPROX), curve ? 0.85 : 0.6, curve ? wW : wL);
        return;
      }
    } else {
      float col = cell.x, fall = sqrt(clamp((lip - Y) / (lip - pool), 0.0, 1.0));
      float pulse = ka < 0.8 ? exp(-pow((fall - ka * 1.9) / 0.09, 2.0)) * (1.0 - ka) : 0.0;
      if (e < 1.0) {
        float v = strand(col, fall, flow, 0), v2 = strand(col, fall, flow, 1);
        float dens = (1.0 - e * e * 0.7) * (0.72 + 0.3 * glow + 0.25 * sg) + 0.5 * pulse;
        dens += 0.5 * smoothstep(0.12, 0.0, fall);             // (just under the brink the water's glassy still)
        // (the body: each column its own blue, darker toward the edges and where the sheet behind shows,
        // whitening toward the foot, a surge of white racing down it)
        vec3 body = mix(wM, wL, 0.2 + 0.35 * h1(col * 1.7 + 3.0));
        body = mix(body, wD, 0.75 * smoothstep(0.55, 1.0, e));
        if (v > dens && v2 > 0.3 * (1.0 - e * e)) body = mix(body, wD, 0.5);
        body = mix(body, wL, 0.55 * smoothstep(0.15, 0.0, fall));
        body = mix(body, wW, min(1.0, 0.75 * smoothstep(0.76, 1.0, fall) + 0.65 * pulse));
        tileC = body; tileA = 1.0;
        float b = dens - v;
        // (the strands: unbroken lines where a strand's thickest, then the broken texture of | : ' .)
        int g = b > 0.5 ? G_VHEAVY : (b > 0.34 ? G_VLINE : (b > 0.22 ? G_BAR : (b > 0.12 ? G_COLON : (b > 0.05 ? G_TICK : 0))));
        putF(g, 0.45 + 0.5 * min(1.0, b * 2.0), mix(wL, wW, clamp(0.45 + b + pulse, 0.0, 1.0)));
        return;
      }
    }
  }
  // --- the wall behind the falls' sides, down to the pool where the gorge opens out: wet rock, dark,
  // glistening here and there; drops fraying off the water's edges, drifting down and out across it
  if (Y >= pool && Y < lip && dx >= fw && dx < rockIn(Y, sd) - cw * 0.5) {
    float col = cell.x, e = dx / fw, fall = sqrt(clamp((lip - Y) / (lip - pool), 0.0, 1.0));
    tileC = mix(P(rgb(16.0, 18.0, 40.0), rgb(70.0, 70.0, 80.0)), wD, 0.25 * h1(col * 3.1)); tileA = 1.0;
    float dr = h2(vec2(col, floor(fall * 34.0 - flow * 1.2)));
    float fray = e < 1.0 + 3.0 * cw / fw ? 0.18 * (1.0 - (e - 1.0) * fw / (3.0 * cw)) * (0.5 + 0.5 * fall) : 0.0;
    putF(dr < fray ? (dr < fray * 0.55 ? G_COMMA : G_TICK) : (h0 < 0.04 ? G_TICK : 0), 0.7, wL);
    return;
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
        putF(abs(sl) < 0.4 ? (h0 < 0.5 ? G_UNDER : G_DASH) : (sl > 0.0 ? G_SLASH : G_BACK), 0.95, ink);
        return;
      }
      if (Y < top && e < cw) { tileC = P(rgb(30.0, 32.0, 62.0), rgb(112.0, 90.0, 76.0)); tileA = 1.0; putF(0, 0.0, ink); return; }
      if (Y < top) {
        tone = day ? 0.18 : 0.03;
        float into = smoothstep(0.3, 0.0, e);           // (1 by the falls, 0 out at the sides)
        float dTop = top - Y;
        // the grass along the top: solid, a tuft and a flower here and there
        if (dTop < ch * 1.5) { tileC = moss * (day ? 0.8 : 0.55); tileA = 1.0; putF(h0 < 0.05 ? G_STAR : (h0 < 0.3 ? G_QUOTE : 0), 0.9, h0 < 0.05 ? P(rgb(255.0, 214.0, 122.0), rgb(232.0, 70.0, 82.0)) : moss * 1.15); return; }
        // the rock: blocks, each solid, lit along its top and shaded toward its foot, darker into the
        // gorge, the cracks between them darker still; some grown over with moss and a bush; ferns
        // from a few cracks; drips down the wet rock by the falls
        vec2 nn;
        vec4 bl = blocks(vec2(X + sd * 3.1, Y), nn);
        vec3 rockL = P(rgb(74.0, 76.0, 122.0), rgb(198.0, 176.0, 148.0)), rockD = P(rgb(30.0, 32.0, 62.0), rgb(112.0, 90.0, 76.0));
        // (at night the aurora's light on the rock just under the tops)
        if (!day) { float up, aurL = aurora(vec2(X, footA + 0.02), footA, up) * (1.0 - smoothstep(0.0, 0.14, dTop)); rockL = mix(rockL, auroraCol(0.15), min(0.45, aurL * 0.5)); }
        float v = (Y - bl.y) / 0.05;                                   // (up the block: -1 at its foot, 1 at its top)
        float shade = clamp(0.5 - 0.5 * v + 0.5 * into + 0.25 * (bl.z - 0.5), 0.0, 1.0);
        vec3 rock = mix(rockL, rockD, shade);
        float ext = 0.5 * (abs(nn.x) * cw + abs(nn.y) * ch);         // (a cell's half reach across the crack)
        bool mine = dot(nn, vec2(0.38, -0.92)) > 0.0;                 // (each crack drawn from one side)
        tileC = rock; tileA = 1.0;
        if (bl.w < ext && mine) {
          float tx = -nn.y / cw, ty = nn.x / ch, sl = ty / (abs(tx) + 1e-4) * sign(tx);
          tileC = rock * 0.72;
          putF(abs(sl) < 0.45 ? G_UNDER : (abs(sl) > 2.4 ? G_BAR : (sl > 0.0 ? G_SLASH : G_BACK)), 0.8, rock * 0.45);
          return;
        }
        if (bl.z < 0.16) {
          // grown over: moss all through, a bush on top
          tileC = mix(moss * 0.62, fern * 0.9, clamp(v * 0.5 + 0.5, 0.0, 1.0)) * (day ? 1.0 : 0.62); tileA = 1.0;
          putF(v > 0.3 && h0 < 0.25 ? G_QUOTE : 0, 0.8, fern * 1.2);
          return;
        }
        if (bl.z > 0.93 && v < -0.45 && abs(X - bl.x) < cw * 2.5) { putF(mod(cell.x, 2.0) < 1.0 ? G_LP : G_RP, 0.85, fern); return; }
        float dp = fract(time * 1.3 + h1(cell.x * 2.7)) * 12.0 - mod(row, 12.0);
        if (e < 0.05 && dp > 0.0 && dp < 0.9 && h1(cell.x * 5.1) < 0.35) { putF(G_TICK, 0.9, blue); return; }
        putF(h0 < 0.05 ? G_DOT : 0, 0.4, rock * 0.7);
        return;
      }
    }
    // pines along the tops, out from the falls
    if (dx > 0.1) {
      float S = cw * 5.0, kk = floor(X / S), tx = (kk + 0.5 + 0.5 * (h1(kk * 1.3) - 0.5)) * S;
      float th = (0.03 + 0.06 * h1(kk * 2.7)) * (0.6 + 0.6 * smoothstep(0.1, 0.6, abs(tx - cx))), tb = rockTop(abs(tx - cx), tx < cx ? -1.0 : 1.0) - 0.004;
      float n = 3.0 + floor(th * 30.0), pw = pineW((Y - tb) / th, th * 0.34, n);
      if (h1(kk * 9.1) < 0.85 && abs(X - tx) < pw) {
        bool lf = abs(X - cw - tx) >= pw, rt = abs(X + cw - tx) >= pw;
        // (solid, the tiers' glyphs over a fill, as the lake's)
        vec3 pc = P(rgb(40.0, 100.0, 80.0), rgb(40.0, 100.0, 60.0));
        tileC = pc * 0.8; tileA = lf || rt ? 0.5 : 0.92;
        putF(lf && rt ? G_CARET : lf ? G_SLASH : rt ? G_BACK : (h0 < 0.5 ? G_TRI : G_CARET), 0.95, mix(pc, vec3(1.0), 0.12));
        return;
      }
    }
  }

  // --- above the lip: the river coming on toward the brink from between low hills, narrowing back
  // toward them, paler further back, its ripples coming on; the hills solid in the haze, the near
  // ones greener, the far ones paler, their tops a little ragged
  float hN = lip + 0.022 + 0.012 * sin(X * 19.0 + 0.4) + 0.006 * sin(X * 43.0 + 1.0), hF = lip + 0.05 + 0.022 * sin(X * 11.0 + 0.7) + 0.012 * sin(X * 27.0 + 2.1);
  if (Y >= lip && Y < hN) {
    float k = (Y - lip) / max(1e-3, hN - lip), rw = fallW(lip) * (1.0 - 0.55 * k);
    if (dx < rw) {
      float rp = fract((Y - lip) * 70.0 + flow * 0.6 + 0.3 * vn(X * 40.0));
      tileC = mix(mix(wM, wL, 0.3), wL, 0.5 * k); tileA = 1.0;
      putF(rp < 0.4 ? G_TILDE : 0, 0.7, wW);
      return;
    }
  }
  if (Y < hF) {
    bool near = Y < hN;
    float top = near ? hN : hF;
    tileC = near ? P(rgb(26.0, 48.0, 54.0), rgb(108.0, 148.0, 108.0)) : P(rgb(30.0, 36.0, 72.0), rgb(156.0, 172.0, 194.0));
    tileA = top - Y < ch ? clamp(0.5 + (top - Y) / ch, 0.3, 0.85) : 1.0;
    put(top - Y < ch && h0 < 0.5 ? G_UNDER : 0, 0.5, tileC * 0.8);
    return;
  }
  // --- the aurora at night, over it all, in front of the stars (they show through its gaps)
  if (!day) {
    float up, a = aurora(vec2(X, Y), footA, up);
    front = 0.2;                       // (the moon in pixels over it: no bites out of its rim)
    if (a > 0.12 && length(vec2(X, Y) - sunAt) > 0.085) {
      int g = a > 0.95 ? G_VHEAVY : a > 0.5 || (a > 0.3 && up < 0.3) ? G_VLINE : a > 0.28 ? G_COLON : a > 0.17 ? G_TICK : G_DOT;
      put(g, clamp(0.35 + 0.65 * a, 0.0, 1.0), auroraCol(up) * (0.8 + 0.3 * min(a, 1.0)));
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
  float best = 9.0, bsl = 0.0, bdy = 9.0;
  for (int i = 0; i < 11; i++) {
    vec4 L = LIMB[i] * sc;
    vec2 a = T + L.xy, b = T + L.zw, pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length((pa - ba * h) / vec2(cw, ch)) - LIMBW[i] * sc / ch * (1.0 - 0.4 * h);
    if (d < best) { best = d; bsl = ba.y / (abs(ba.x) < 1e-5 ? 1e-5 : ba.x) * cw / ch; bdy = abs((pa - ba * h).y) / ch; }
  }
  if (best > 0.5) return 0;
  if (best < -1.0) { inside = 1.0; return G_DARK; }
  // (a limb near level: the one row its middle runs through, a line across it; drawn on every row it
  // touched it stacked into grey bars)
  if (abs(bsl) < 0.4) return bdy < 0.5 ? G_LINE : 0;
  return abs(bsl) > 2.4 ? G_BAR : (bsl > 0.0 ? G_SLASH : G_BACK);
}
// the art (see PUMPKIN_ART): the glyph at column o, row r from its top left (0 if none), and its part:
// 1 an outline, 2 lit, 3 a stem, 4 inside. Jack-o'-lantern kind 0 the big one, 1 and 2 the small ones
${artArrays('PK', PUMPKIN_ART)}
int pumpkinAt(int kind, int o, int r, out int part) {
  part = 0;
  int w = kind == 0 ? 23 : 13, h = kind == 0 ? 9 : 6;
  if (o < 0 || o >= w || r < 0 || r >= h) return 0;
  int i = r * w + o;
  int v = kind == 0 ? PK0[i] : (kind == 1 ? PK1[i] : PK2[i]);
  part = v / 64;
  return v - part * 64;
}
// where bat k is at time t: its loops round the moon, a wobble on them
vec2 batPath(float fk, float t, vec2 mc, float R) {
  float sp = 0.14 + 0.1 * h1(fk * 1.9), ph = fk * 2.1;
  return mc + R * vec2(0.1 + cos(t * sp + ph) * (1.05 + 0.3 * h1(fk * 3.7)) + 0.1 * sin(t * sp * 3.1 + fk),
                       0.08 + sin(t * sp * 1.6 + ph * 1.3) * (0.5 + 0.3 * h1(fk * 7.3)) + 0.07 * sin(t * sp * 4.3 + fk * 2.0));
}
// a bat seen from the front, at q in its own units (its wingspan 2, its middle at 0), its wings at f
// (1 up, 0 level, -1 down): its body, its head and its pointed ears; each wing from the shoulder up to
// the wrist and out along the longest finger to its tip, the membrane scalloped between the fingers'
// tips along its trailing edge. Whether q is in it; eye, on one of its eyes; bone, on a finger
float segD(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
bool batAt(vec2 q, float f, out bool eye, out bool bone) {
  eye = false; bone = false;
  vec2 a = vec2(abs(q.x), q.y);
  if (length(a / vec2(0.12, 0.24)) < 1.0) return true;
  if (length(a - vec2(0.0, 0.25)) < 0.12) { eye = length((a - vec2(0.055, 0.26)) / vec2(0.05, 0.045)) < 1.0; return true; }
  if (a.y > 0.28 && a.y < 0.48 && abs(a.x - 0.07) < 0.05 * (0.48 - a.y) / 0.2) return true;
  if (a.x < 0.07 || a.x > 1.0) return false;
  // (the joints: the shoulder, the wrist, the wing's tip; the fingers' tips along the trailing edge)
  vec2 sh = vec2(0.07, 0.12), wr = vec2(0.46, 0.34 + 0.34 * f), tip = vec2(1.0, 0.16 + 0.6 * f);
  vec2 f1 = vec2(0.36, -0.42 + 0.16 * f), f2 = vec2(0.66, -0.3 + 0.36 * f), body = vec2(0.07, -0.34);
  // (the leading edge: shoulder to wrist to tip)
  float lead = a.x < wr.x ? mix(sh.y, wr.y, (a.x - sh.x) / (wr.x - sh.x)) : mix(wr.y, tip.y, (a.x - wr.x) / (tip.x - wr.x));
  // (the trailing edge: straight between the tips, each span curving up into a scallop)
  vec2 l = a.x < f1.x ? body : (a.x < f2.x ? f1 : f2), r = a.x < f1.x ? f1 : (a.x < f2.x ? f2 : tip);
  float u = (a.x - l.x) / (r.x - l.x), trail = mix(l.y, r.y, u) + 0.16 * sin(3.14159 * u) * (r.x - l.x) / 0.32;
  if (a.y > lead || a.y < trail) return false;
  bone = segD(a, wr, f1) < 0.025 || segD(a, wr, f2) < 0.025 || segD(a, wr, tip) < 0.025;
  return true;
}
// the ghost at q, in units of its head's radius (its head's middle at 0), age seconds into its rise: a
// round head, a sheet falling from it, a little wider toward its hem, the hem a flutter of scallops; its
// arms held out to the sides; the whole of it trailing as it sways
vec2 ghostSway(vec2 q, float age) { return vec2(q.x - 0.25 * sin(age * 2.5 - q.y * 0.9) * clamp(-q.y * 0.5, 0.0, 1.0), q.y); }
bool ghostAt(vec2 q, float age) {
  q = ghostSway(q, age);
  float hem = -2.3 + 0.22 * sin(q.x * 5.0 - age * 7.0);
  if (length(q) < 1.0 || (q.y < 0.0 && q.y > hem && abs(q.x) < 1.0 + 0.16 * -q.y)) return true;
  return length((vec2(abs(q.x), q.y) - vec2(1.15, -0.75)) / vec2(0.42, 0.26)) < 1.0;
}
// a gravestone of kind k (3 a big one, arched; 0 a headstone, arched; 1 a small one, rounded; 2 a stone
// cross), its foot's middle at f, its size s (units of the height), leaning by t (radians): whether p is
// in it, and where in it (uv: x -1 to 1 across its body, y 0 at its foot to 1 at its top)
bool stoneAt(vec2 p, vec2 f, float s, float k, float t, out vec2 uv) {
  vec2 d = p - f;
  d = vec2(d.x * cos(t) - d.y * sin(t), d.x * sin(t) + d.y * cos(t));
  bool cross = k > 1.5 && k < 2.5;
  float hw = s * (k > 2.5 ? 0.5 : (k < 0.5 ? 0.4 : (cross ? 0.1 : 0.44))), h = s * (k > 2.5 ? 1.2 : (k < 0.5 ? 1.0 : (cross ? 1.15 : 0.55)));
  uv = vec2(d.x / hw, d.y / h);
  if (d.y < 0.0 || d.y > h) return false;
  if (cross) return abs(d.x) < hw || (abs(d.x) < s * 0.36 && abs(d.y - h * 0.7) < s * 0.1);
  if (abs(d.x) > hw) return false;
  float top = h - hw;                      // (its top arched over its whole width; the small one's over it all)
  return d.y < top || length(vec2(d.x, (d.y - top) * (k > 0.5 && k < 1.5 ? 1.6 : 1.0))) < hw;
}
// the graves: x in a tall window, in a wide one (shares of the width); where (0 at the graveyard's
// front, 1 at the hill's top); which kind
const vec4 STONES[11] = vec4[11](
  vec4(0.06, 0.46, 0.14, 1.0), vec4(0.46, 0.79, 0.12, 3.0), vec4(0.64, 0.88, 0.16, 2.0), vec4(0.9, 0.52, 0.2, 3.0),
  vec4(0.3, 0.55, 0.6, 1.0), vec4(0.4, 0.61, 0.66, 2.0), vec4(0.7, 0.69, 0.58, 0.0), vec4(0.84, 0.75, 0.64, 1.0),
  vec4(0.18, 0.84, 0.6, 0.0), vec4(0.56, 0.95, 0.66, 2.0), vec4(0.04, 0.42, 0.62, 2.0));
// the jack-o'-lanterns: x tall, x wide, foot (its bottom row), -
const vec4 PUMPS[3] = vec4[3](vec4(0.22, 0.63, 0.025, 1.0), vec4(0.4, 0.73, 0.025, 1.0), vec4(0.76, 0.4, 0.03, 1.0));
// where jack-o'-lantern i's art sits: its left column, its top row, its width, its height (0 wide if
// it's left out: the small ones in a small window); raised as far as the graveyard is (its front
// above where a tall or a wide window has it: see RAISE)
vec4 pumpkinBox(int i, float aspect, float wide) {
  vec4 pk = PUMPS[i];
  float w = i == 0 ? 23.0 : 13.0, h = i == 0 ? 9.0 : 6.0;
  if (i > 0 && view.y < 520.0) return vec4(0.0);
  float foot = pk.z + max(0.0, lake.y - (aspect < 1.0 ? 0.04 : 0.06));
  return vec4(floor(mix(pk.x, pk.y, wide) * aspect / cw) - floor(w / 2.0), floor((1.0 - foot) / ch) - (h - 1.0), w, h);
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
        over = u < 0.3 ? G_STAR : (u < 0.65 ? G_MID : G_DOT); overInk = (1.0 - 0.8 * u) * tw;
        overC = P(r < 1.0 ? rgb(150.0, 70.0, 230.0) : rgb(214.0, 160.0, 255.0), rgb(110.0, 40.0, 150.0));
        break;
      }
    }
  }

  // --- a ghost rising from a grave every 8 bars (and on a drop): a sheet ghost, its arms out, swaying
  // as it rises, its hem fluttering; pale, see-through toward its hem, glowing a little at night (by day
  // drawn round with a soft line, so it shows on the pale sky); its eyes and its mouth dark; fading
  // away as it goes up
  if (leap.w > 0.5 && leap.x < 4.5) {
    vec4 st = STONES[min(10, int(floor(leap.z * 11.0)))];
    float age = leap.x, a = smoothstep(0.0, 0.4, age) * (1.0 - smoothstep(3.0, 4.5, age));
    float gs = max(0.028, 3.2 * cw) * mix(1.0, 0.75, st.z);
    vec2 gc = vec2(mix(st.x, st.y, wide) * aspect + 0.015 * sin(age * 2.5), mix(lake.y, lake.x, st.z) + gs * 2.6 + age * 0.055);
    vec2 q = (Pp - gc) / gs;
    if (a > 0.05 && ghostAt(q, age)) {
      vec2 w = ghostSway(q, age);
      bool eye = length((vec2(abs(w.x), w.y) - vec2(0.38, 0.12)) / vec2(0.21, 0.3)) < 1.0, mouth = length((w - vec2(0.0, -0.42)) / vec2(0.2, 0.24)) < 1.0;
      if (r < 1.0) tone = 0.0;
      if (eye || mouth) { tileC = P(rgb(28.0, 22.0, 50.0), rgb(54.0, 44.0, 64.0)); tileA = a; put(G_BLANK, 0.0, tileC); return; }
      vec3 c = P(rgb(222.0, 232.0, 255.0), rgb(252.0, 250.0, 246.0)) * (0.9 + 0.1 * sin(w.x * 3.0 + 1.0));
      float hemY = -2.3 + 0.22 * sin(w.x * 5.0 - age * 7.0);
      tileC = c; tileA = a * (w.y < hemY + 0.55 ? 0.62 : 0.9);
      bool rim = !ghostAt(q + vec2(0.0, ch / gs), age) || !ghostAt(q + vec2(cw / gs, 0.0), age) || !ghostAt(q - vec2(cw / gs, 0.0), age);
      if (rim && day) { put(G_MEDIUM, 0.55 * a, rgb(150.0, 140.0, 170.0)); return; }
      put(G_BLANK, 0.0, c);
      return;
    }
    if (a > 0.05 && !day && length((q + vec2(0.0, 0.6)) * vec2(1.0, 0.62)) < 2.0) { tileC = rgb(190.0, 210.0, 255.0); tileA = 0.12 * a; }
  }

  // --- the jack-o'-lanterns at the front: solid and round, lit from the moon's side (their top left),
  // their feet in shadow, ribbed with darker grooves, their faces carved: by day dark holes, at
  // night lit from inside (flickering, flaring on each kick, brighter with the loudness); a shadow
  // on the ground under each
  for (int i = 0; i < 3; i++) {
    vec4 bx = pumpkinBox(i, aspect, wide);
    if (bx.z == 0.0) continue;
    int part, po = int(cell.x - bx.x), pr = int(row - bx.y);
    int g = pumpkinAt(i, po, pr, part);
    if (part == 0 && float(pr) == bx.w && abs(float(po) + 0.5 - bx.z * 0.5) < bx.z * 0.4) { put(G_LIGHT, 0.55, P(rgb(40.0, 26.0, 44.0), rgb(150.0, 106.0, 84.0))); return; }
    if (part == 0) continue;
    // (the skin's shade: where in it the cell is, -1 to 1 across and down, the light from the top left)
    vec2 q = vec2((float(po) + 0.5) / bx.z, (float(pr) + 0.5) / bx.w) * 2.0 - 1.0;
    float sh = clamp(0.78 - 0.22 * (q.x * 0.55 + q.y * 0.85) - 0.15 * dot(q, q), 0.0, 1.0);
    vec3 skin = mix(P(rgb(62.0, 22.0, 10.0), rgb(150.0, 56.0, 16.0)), P(rgb(188.0, 86.0, 24.0), rgb(246.0, 140.0, 48.0)), sh);
    if (part == 3) { tileC = P(rgb(58.0, 70.0, 34.0), rgb(92.0, 100.0, 46.0)); tileA = 1.0; put(g, 1.0, P(rgb(130.0, 150.0, 76.0), rgb(54.0, 60.0, 28.0))); return; }     // (its stem)
    if (part == 2) {
      // (a carved hole, the candle's light in it: flickering, flaring on the kick, brighter with the
      // loudness)
      float fl = 0.82 + 0.18 * sin(time * 11.0 + float(i) * 2.0) * sin(time * 6.7 + float(i));
      vec3 lit = mix(rgb(255.0, 150.0, 40.0), rgb(255.0, 236.0, 150.0), clamp(0.35 + 0.5 * sea.w + 0.2 * glow, 0.0, 1.0)) * fl;
      // (the light deep orange round the hole's edges, the cuts in it yellow-white)
      tileC = day ? rgb(56.0, 26.0, 20.0) : mix(rgb(255.0, 118.0, 18.0), lit, 0.5) * (0.8 + 0.2 * fl); tileA = 1.0;
      put(g, 1.0, day ? rgb(130.0, 60.0, 30.0) : mix(lit, rgb(255.0, 248.0, 220.0), 0.6));
      return;
    }
    // (the skin, solid to its edge: its ribs darker grooves on it, its outline the skin's own rim)
    tileC = skin; tileA = 1.0;
    put(g, part == 1 ? 0.9 : 0.75, skin * (part == 1 ? 0.6 : 0.68));
    return;
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
    if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5 && b > 0.08) { over = b > 0.5 ? G_BULLET : G_MID; overInk = 0.4 + 0.6 * b; overC = rgb(150.0, 255.0, 210.0); break; }
  }

  // --- the graves: solid stones, arched headstones, small rounded ones and stone crosses, each leaning a
  // little, nearer ones bigger; lit from the moon's side above, their right sides in shade, their tops
  // catching the light, RIP cut into the big ones, moss at their feet; each on a low mound of earth.
  // The nearest one in front where they overlap; one that would stand in a jack-o'-lantern left out
  {
    float bz = 9.0, bs = 0.0, bt = 0.0, bk = 0.0;
    vec2 buv = vec2(0.0), bf = vec2(0.0);
    for (int i = 0; i < 11; i++) {
      vec4 st = STONES[i];
      if (st.z >= bz) continue;
      float s = max(0.05, 6.0 * cw) * mix(1.15, 0.78, st.z), t = (h1(float(i) * 3.3) - 0.5) * 0.16;
      vec2 f = vec2(mix(st.x, st.y, wide) * aspect, mix(lake.y, lake.x, st.z));
      float hw = s * 0.5, hgt = s * 1.2;
      bool clash = false;
      for (int j = 0; j < 3; j++) {
        vec4 bx = pumpkinBox(j, aspect, wide);
        if (bx.z == 0.0) continue;
        float x0 = (bx.x - 1.0) * cw, x1 = (bx.x + bx.z + 1.0) * cw, y0 = 1.0 - (bx.y + bx.w + 1.0) * ch, y1 = 1.0 - (bx.y - 1.0) * ch;
        if (f.x + hw > x0 && f.x - hw < x1 && f.y + hgt > y0 && f.y < y1) clash = true;
      }
      if (clash) continue;
      vec2 uv;
      if (stoneAt(Pp, f, s, st.w, t, uv)) { bz = st.z; bs = s; bt = t; bk = st.w; buv = uv; bf = f; }
      // (its mound: a low hump of earth round its foot)
      else if (bs == 0.0 && abs(X - f.x) < hw * 1.4 * (1.0 - 0.4 * clamp((f.y - Y) / ch, 0.0, 1.0)) && Y > f.y - ch && Y < f.y + 0.3 * ch) {
        tileC = P(rgb(36.0, 26.0, 46.0), rgb(176.0, 136.0, 106.0)); tileA = 0.55;
      }
    }
    if (bs > 0.0) {
      vec2 uv;
      bool up = !stoneAt(Pp + vec2(0.0, ch), bf, bs, bk, bt, uv), rt = !stoneAt(Pp + vec2(cw, 0.0), bf, bs, bk, bt, uv);
      float sh = clamp(0.62 - 0.3 * buv.x * 0.5 + 0.22 * buv.y, 0.0, 1.0);
      vec3 c = mix(P(rgb(46.0, 44.0, 70.0), rgb(108.0, 100.0, 102.0)), P(rgb(170.0, 168.0, 204.0), rgb(204.0, 196.0, 188.0)), sh);
      if (buv.y < 0.14 && h0 < 0.55) c = mix(c, P(rgb(60.0, 86.0, 64.0), rgb(110.0, 124.0, 80.0)), 0.5);   // (moss)
      tileC = c; tileA = 1.0;
      if (r < 1.0) tone = 0.0;
      if (up) { put(G_MEDIUM, 0.7, mix(c, P(rgb(220.0, 220.0, 250.0), rgb(236.0, 230.0, 222.0)), 0.6)); return; }
      if (rt) { put(G_MEDIUM, 0.6, c * 0.6); return; }
      // (RIP cut across the big ones' middle, where it's wide enough: a letter a cell)
      if (bk > 2.5 || bk < 0.5) {
        float mid = floor(bf.x / cw), rr = floor((1.0 - (bf.y + bs * (bk > 2.5 ? 1.2 : 1.0) * 0.56)) / ch), kc = cell.x - mid;
        if (bs * (bk > 2.5 ? 0.5 : 0.4) / cw > 2.4 && row == rr && abs(kc) <= 1.0) { put(kc < -0.5 ? G_LR : (kc > 0.5 ? G_LP2 : G_LI), 0.9, c * 0.45); return; }
      }
      put(h0 < 0.1 ? G_MID : G_BLANK, 0.35, c * 0.75);
      return;
    }
  }

  // --- mist creeping along the ground between the graves and at the foot of the wood, drifting with
  // the wind
  {
    float drift = fbm(vec2(X * 3.0 - time * (0.01 + 0.03 * wind), Y * 22.0));
    float m = exp(-pow((Y - (lake.y + 0.06)) / 0.03, 2.0)) * 0.8 + exp(-pow((Y - (lake.x - 0.012)) / 0.018, 2.0)) * 0.6;
    m *= (0.2 + 0.8 * smoothstep(0.35, 0.7, drift)) * (0.8 + 0.4 * glow);
    // (the mist a see-through shade over the ground, the grass showing through it; a wisp drawn in it
    // only where it's thickest)
    if (m > 0.05) { tileC = P(rgb(120.0, 112.0, 168.0), rgb(236.0, 214.0, 200.0)); tileA = min(0.3, m * 0.32); }
    if (h0 < m * 0.12 && over == 0) { over = G_TILDE; overInk = 0.25 + 0.3 * m; overC = P(rgb(160.0, 150.0, 206.0), rgb(196.0, 170.0, 170.0)); }
  }

  // --- the graveyard's ground: dead grass, fallen leaves; the hill's edge drawn
  float ht = hillTop(X);
  if (Y < ht + 0.5 * ch) {
    if (Y < ht) {
      float k = h2(cell + 4.0), dn = clamp((ht - Y) / max(ht, 1e-3), 0.0, 1.0);
      // (solid: the earth dusky, darker toward you; the mist, if any, laid over it)
      vec3 earth = mix(P(rgb(28.0, 22.0, 40.0), rgb(150.0, 98.0, 74.0)), P(rgb(16.0, 12.0, 26.0), rgb(106.0, 66.0, 52.0)), dn);
      tileC = mix(earth, tileC, tileA); tileA = 1.0;
      int g = k < 0.04 ? G_COMMA : (k < 0.07 ? G_TICK : (k < 0.1 ? G_DOT : 0));
      put(g, 0.6, k < 0.07 ? P(rgb(80.0, 90.0, 70.0), rgb(70.0, 50.0, 34.0)) : P(rgb(150.0, 80.0, 40.0), rgb(196.0, 104.0, 46.0)));
      return;
    }
  }

  // --- the wood along the hill: black against the moon (its edges in the moon's light), rimmed off it
  if (woodAt(Pp)) {
    bool lf = !woodAt(Pp - vec2(cw, 0.0)), rt = !woodAt(Pp + vec2(cw, 0.0)), up = !woodAt(Pp + vec2(0.0, ch));
    int g = lf && rt ? G_CARET : (lf ? G_SLASH : (rt ? G_BACK : (up ? G_CARET : G_DARK)));
    // (solid: a silhouette, its edges' glyphs over a partial fill, the moon's light along them)
    bool inner = g == G_DARK;
    tileC = SIL; tileA = inner ? 1.0 : 0.55;
    if (inner) g = h0 < 0.05 ? G_TICK : 0;
    if (r < 1.0) { tone = inner ? 0.0 : mtone; put(g, 1.0, inner ? RIM * 0.6 : SIL); }
    else if (day) put(g, 1.0, SIL);                                     // (at dusk: black against the sky)
    else put(inner ? (h0 < 0.12 ? G_CARET : (h0 < 0.2 ? G_TICK : 0)) : g, 0.85, RIM * (inner ? 0.7 : 1.0));
    return;
  }

  // --- bats flitting round the moon: two big near ones, their wings beating once a beat, their eyes
  // glinting at night; small ones further off (more of them out when the hats are busy), twice a beat:
  // solid against the moon and the dusk sky, their tops just touched by the moonlight at night; dim off
  // the moon at night
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    if (k > 1 && h1(fk * 5.3 + 2.0) > 0.25 + 0.75 * fly) continue;
    vec2 b = batPath(fk, time, mc, R);
    float bsz = max((k < 2 ? 0.09 : 0.026) * (0.85 + 0.3 * h1(fk * 6.1)), (k < 2 ? 12.0 : 4.0) * cw);
    vec2 q = (Pp - b) / bsz;
    if (abs(q.x) > 1.05 || abs(q.y) > 1.0) continue;
    float f = sin(6.2832 * (sea.z * (k < 2 ? 1.0 : 2.0) + h1(fk * 9.1)));
    bool eye, bone;
    if (!batAt(q, f, eye, bone)) continue;
    if (r < 1.0) tone = 0.0;
    if (eye && k < 2 && !day) { tileC = rgb(255.0, 170.0, 60.0); tileA = 1.0; put(G_BLANK, 0.0, tileC); return; }
    vec3 c = r < 1.0 || day ? SIL : rgb(56.0, 48.0, 80.0);
    tileC = c; tileA = 1.0;
    bool e2, b2;
    bool up = !batAt(q + vec2(0.0, ch / bsz), f, e2, b2);
    if (up && !day) { put(G_MEDIUM, 0.75, mix(c, RIM, 0.8)); return; }
    if (bone && k < 2 && !day) { put(G_LINE, 0.4, mix(c, RIM, 0.5)); return; }
    put(G_BLANK, 0.0, c);
    return;
  }

  // --- wisps of cloud drifting across the moon: a soft, see-through shade over it, thickest in their
  // middle and thinning to nothing at their ends (only a breath of them off it); what's under shows
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float wy = mc.y + R * (i == 0 ? 0.55 : 0.2);
    float len = R * (0.7 + 0.5 * h1(fi * 3.1)), x0 = mod(time * (0.01 + 0.005 * fi) + h1(fi * 7.7) * 3.0, aspect + 2.0 * len) - len;
    float u = (X - x0) / len, th = ch * (0.6 + 0.9 * sin(3.14159 * clamp(u, 0.0, 1.0)));
    if (u > 0.0 && u < 1.0 && abs(Y - wy) < th && Y > ht + 0.16) {
      float a = sin(3.14159 * u) * (1.0 - abs(Y - wy) / th) * (0.6 + 0.4 * vn(X * 30.0 + fi * 9.0 - time * 0.3));
      tileC = r < 1.0 ? SIL : P(rgb(70.0, 64.0, 100.0), rgb(200.0, 150.0, 140.0)); tileA = (r < 1.0 ? 0.55 : 0.18) * a;
    }
  }

  // --- the moon: a great disc, solid: by night its face as the pixel moon has it (its seas in soft
  // greys, dimmer toward the limb, a few craters lit on their upper left); by day a sun going down, pale
  // at its heart, deepening to orange at its rim, its lower half cut by bands that widen toward its foot;
  // the cloud wisps laid over it; its rim a soft edge
  if (r < 1.0) {
    tone = mtone;
    vec2 q = (Pp - mc) / R;
    vec3 wc = tileC; float wa = tileA;            // (a wisp over it, if one's here)
    vec3 face;
    if (day) {
      float band = fract((q.y + 1.0) * 6.0);
      if (q.y < -0.05 && band < 0.12 + 0.45 * (-q.y)) { tileC = wc; tileA = wa; put(0, 0.0, vec3(0.0)); return; }
      face = r < 0.45 ? rgb(255.0, 226.0, 160.0) : r < 0.75 ? rgb(255.0, 182.0, 102.0) : rgb(246.0, 132.0, 74.0);
    } else {
      float u = q.x, v = -q.y, sea = 0.0;
      sea = max(sea, 1.0 - length(vec2((u + 0.3) / 0.3, (v + 0.38) / 0.24)));
      sea = max(sea, 1.0 - length(vec2((u - 0.12) / 0.16, (v + 0.35) / 0.15)));
      sea = max(sea, 1.0 - length(vec2((u - 0.28) / 0.2, (v + 0.08) / 0.17)));
      sea = max(sea, 1.0 - length(vec2((u - 0.66) / 0.11, (v + 0.25) / 0.09)));
      sea = max(sea, 1.0 - length(vec2((u + 0.55) / 0.22, v / 0.4)));
      sea = max(sea, 1.0 - length(vec2((u + 0.15) / 0.18, (v - 0.32) / 0.13)));
      sea = max(sea, 1.0 - length(vec2((u - 0.5) / 0.12, (v - 0.15) / 0.15)));
      face = sea > 0.6 ? mix(moonC, moonD, 0.75) : sea > 0.28 ? mix(moonC, moonD, 0.4) : moonC;
      face *= 1.0 - 0.22 * r * r;
      for (int k = 0; k < 4; k++) {
        vec2 cc = k == 0 ? vec2(0.32, -0.52) : k == 1 ? vec2(-0.36, -0.5) : k == 2 ? vec2(0.62, -0.4) : vec2(-0.08, -0.66);
        float cr = length(q - cc) / (k == 3 ? 0.07 : 0.05);
        if (cr < 1.0) face *= dot(q - cc, vec2(-0.7, 0.7)) > 0.0 ? 1.12 : 0.82;
      }
    }
    tileC = mix(face, wc, wa); tileA = 1.0;
    #define OUT(o) (length(Pp + (o) - mc) > R)
    int eg = edge4(OUT(vec2(0.0, ch)), OUT(vec2(0.0, -ch)), OUT(vec2(-cw, 0.0)), OUT(vec2(cw, 0.0)));
    if (eg != 0) { tileA = 0.6; put(eg, 0.8, face); return; }
    put(0, 0.0, face);
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
uniform float sharkCells;   // 1: the sharks, the stingray and the jellyfish drawn here, in the cells (when the paint pass can't draw them in pixels: see SHARK_PX); 0: only their skins' glyphs, for the pixels
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
// a jellyfish's bell, seen from the side: its rim's middle at c, half its width a, its height b, and
// how far its hollow underside rises in the middle h. Is p inside it?
bool bellAt(vec2 p, vec2 c, float a, float b, float h) {
  float x = (p.x - c.x) / a;
  if (abs(x) >= 1.0) return false;
  float w = 1.0 - x * x, y = p.y - c.y;
  return y < b * sqrt(w) && y > h * w;
}
// the code fish's characters (see CODE_CHARS)
const int CODE[${CODE_CHARS.length}] = int[${CODE_CHARS.length}](${CODE_CHARS.join(', ')});
// the code fish's way across: a gentle meander at x = u (units of the height)
vec2 fishWay(float u) { return vec2(u, 0.62 + 0.06 * sin(u * 3.0 + 1.0) + 0.025 * sin(u * 7.0)); }
// what's of the code fish at p, seen from above as the sharks are: its snout at u along its way, F
// long, its spine following its way back from its snout with a wave running down it as it swims. 0
// nothing, 1 its body, 2 a fin, 3 the dark of its back, 4 an eye; how far along it (s: 0 its snout, 1
// its tail's tip), across it (side: -1 one edge, 1 the other) and which way its left is (lf)
int fishAt(vec2 p, float u, float F, out float s, out float side, out vec2 lf) {
  s = 0.0; side = 0.0; lf = vec2(0.0, 1.0);
  float best = 9.0, bl = 0.0;
  vec2 prev = vec2(0.0), pt = vec2(1.0, 0.0), back = vec2(-1.0, 0.0), root = vec2(0.0);
  for (int i = 0; i <= 14; i++) {
    float si = float(i) / 14.0, ui = u - si * F;
    vec2 q;
    if (i <= 12) {
      // (its body, to the root of its tail, bending as it swims: an easy beat)
      q = fishWay(ui);
      vec2 tg = normalize(fishWay(ui + 0.01) - q);
      q += vec2(-tg.y, tg.x) * 0.085 * F * pow(si, 1.6) * sin(6.2832 * (si * 1.1 - time * 0.7));
      if (i > 0) back = normalize(q - prev);
      root = q;
    } else q = root + back * (si - 12.0 / 14.0) * F;      // (its tail: stiff, swung by the root as one piece)
    if (i > 0) {
      vec2 pa = p - q, ba = prev - q;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
      if (dl < best) { best = dl; s = i == 14 && dot(pa, ba) < 0.0 ? 9.0 : (float(i) - h) / 14.0; bl = sign(ba.x * pa.y - ba.y * pa.x) * dl; pt = normalize(-ba); }   // (past its tail's tip: nothing)
    }
    prev = q;
  }
  if (s > 1.0) return 0;
  float wm = 0.13 * F;
  // (its body: a round snout, full, then narrowing to the root of its tail)
  float w = s < 0.15 ? wm * sqrt(s / 0.15) : mix(wm, 0.2 * wm, smoothstep(0.5, 0.86, s));
  lf = vec2(pt.y, -pt.x);                                  // (the side its positive edge faces)
  if (abs(bl) < w) {
    side = bl / w;
    if (abs(s - 0.07) < 0.025 && abs(abs(side) - 0.55) < 0.25) return 4;
    if (abs(side) < (s > 0.32 && s < 0.56 ? 0.16 : 0.26) && s > 0.08 && s < 0.84) return 3;
    return 1;
  }
  // (its fins: the pectorals swept back behind its head; its tail spread in a fork)
  if (s > 0.19 && s < 0.42) {
    // (its pectorals: slender sickles from behind its gills, swept back and out, paddling a little)
    float f = (s - 0.19) / 0.23, reach = w + (0.1 + 0.85 * f * (1.15 - 0.3 * f)) * wm * (1.0 + 0.12 * sin(time * 1.4));
    if (abs(abs(bl) - reach) < 0.17 * wm * (1.0 - f) + 0.02 * wm) { side = sign(bl) * 2.0; return 2; }
  }
  if (s > 0.86) {
    float span = mix(0.25, 1.35, pow((s - 0.86) / 0.14, 0.6)) * wm, notch = s > 0.94 ? 0.95 * wm * pow((s - 0.94) / 0.06, 1.4) : -1.0;
    if (abs(bl) < span && abs(bl) > notch) { side = bl / span; return 2; }
  }
  return 0;
}
// the stingray's way: a slow meander right to left (u along it: x falls as u grows), low in a wide
// window, through the middle of a tall one
vec2 rayWay(float u, float asp, float lane) { return vec2(asp + 0.3 - u, lane + 0.05 * sin(u * 2.3 + 0.7) + 0.02 * sin(u * 5.1)); }
// what's of the stingray at p, seen from above: its disc's middle at u along its way, its half length
// Lb and half span Wb, its tail T long, following its way behind it. 0 nothing, 1 its disc, 2 its wings'
// thin edges, 3 its tail, 4 an eye, 5 a spiracle, 6 a pelvic fin. Where on the disc (al along it, ac
// across it, -1 to 1; r how far out, 0 its middle, 1 its edge); along the tail, its way there (td)
int rayAt(vec2 p, float u, float asp, float lane, float Lb, float Wb, float T, out float al, out float ac, out float r, out vec2 td) {
  vec2 c = rayWay(u, asp, lane), d = normalize(c - rayWay(u - 0.01, asp, lane)), sd = vec2(-d.y, d.x), q = p - c;
  al = dot(q, d) / Lb; ac = dot(q, sd) / Wb; r = 9.0; td = -d;
  // (its disc: a rounded diamond, a little pointed at its snout; its wings' edges rippling, a wave
  // running back along each as it flies)
  float edge = (1.0 + 0.09 * smoothstep(0.35, 1.0, abs(ac)) * sin(7.0 * al + time * 2.6 + (ac > 0.0 ? 0.0 : 1.4))) * (1.0 + 0.04 * sin(time * 1.5));   // (its wings rippling, flapping slowly)
  // (its disc: a kite, its wingtips a little behind its middle; its front edges bowed out a little to a
  // rounded snout, its back edges running in to the root of its tail)
  float wt = -0.08, span = al > wt ? pow(clamp((1.0 - al) / (1.0 - wt), 0.0, 1.0), 0.72) : pow(clamp((al + 1.0) / (wt + 1.0), 0.0, 1.0), 0.9);
  span = min(span * edge, 0.98);
  r = max(abs(ac) / max(span, 1e-3), abs(al) * 0.9);
  if (abs(al) < 1.0 && abs(ac) < span) {
    if (abs(al - 0.42) < 0.09 && abs(abs(ac) - 0.16) < 0.06) return 4;
    if (abs(al - 0.27) < 0.06 && abs(abs(ac) - 0.21) < 0.05) return 5;
    return r > 0.86 ? 2 : 1;
  }
  // (its pelvic fins: two small lobes at the back of its disc)
  if (length(vec2((al + 0.97) * Lb, (abs(ac) - 0.17) * Wb)) < 0.17 * Lb) return 6;
  // (its tail: long and whip thin, following its way behind it, swaying)
  if (al < -0.8) {
    float best = 9.0, bt = 0.0;
    vec2 prev = c - d * Lb;
    for (int i = 1; i <= 10; i++) {
      float t = float(i) / 10.0, back = Lb + t * T;
      vec2 w = rayWay(u - back, asp, lane), wd = normalize(rayWay(u - back + 0.01, asp, lane) - w);
      w += vec2(-wd.y, wd.x) * 0.02 * t * sin(t * 7.0 - time * 2.2);
      vec2 pa = p - prev, ba = w - prev;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
      if (dl < best) { best = dl; bt = (float(i - 1) + h) / 10.0; td = normalize(ba); }
      prev = w;
    }
    if (best < mix(0.12 * Lb, 0.02 * Lb, bt) + 0.45 * cw) { r = bt; return 3; }
  }
  return 0;
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
  // with it), a shade of the skin itself (sparse where it's lit, dense in its shadow), now and then
  // flashing a colour or white, so the hide shimmers; and round their edges, where a cell's only
  // partly covered, a light glyph on a tile as faint as the cover, so each one reads as one smooth form.
  // With them in pixels (see SHARK_PX) only their skins' glyphs from here: where a cell's well inside
  // one, its glyph laid over whatever's there, the shark's number in the cell's front (124 + which one),
  // so the paint pass lays it on that shark's pixels and nowhere else; its ink full for a flash of colour
  // or white (in that colour), else a hair under (the paint pass inks it in the skin's own tone, darker)
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
    int g = wh > 4.5 ? (key < 0.33 ? G_HASH : key < 0.67 ? G_PCT : G_AT)
          : wh > 3.5 ? G_SMALLO
          : wh > 2.5 ? (key < 0.33 ? G_AT : key < 0.67 ? G_EIGHT : G_PCT)
          : wh > 1.5 ? (key < 0.2 ? G_PCT : key < 0.4 ? G_SEMI : key < 0.6 ? G_SMALLI : key < 0.8 ? G_LS : G_COLON)
          : RAMP[clamp(int((1.0 - li) * 9.99) + int(fract(key * 13.7) * 3.0) - 1, 0, 9)];
    // (the shimmer: each glyph rolls again a couple of times a second, each on its own beat)
    float roll = h2(vec2(floor(key * 4096.0), floor(time * 2.4 + fract(key * 31.0) * 10.0)));
    if (sharkCells < 0.5) {
      if (mid && n >= 3 && (wh < 3.5 || wh > 4.5)) {
        over = g; overInk = roll < 0.05 && wh < 3.5 ? 1.0 : 0.996; overC = roll < 0.035 ? accent(key) : vec3(1.0);
        front = (124.0 + float(k)) / 255.0;
      }
      break;
    }
    // (its colours, in shadow and lit: the hammerhead olive bronze, the blacktip grey, the zebra
    // shark sand; by night in the moonlight)
    vec3 dk = kind < 0.5 ? rgb(78.0, 76.0, 58.0) : kind < 1.5 ? rgb(70.0, 80.0, 94.0) : rgb(122.0, 98.0, 60.0);
    vec3 lt = kind < 0.5 ? rgb(170.0, 164.0, 128.0) : kind < 1.5 ? rgb(170.0, 182.0, 196.0) : rgb(226.0, 198.0, 140.0);
    if (!day) { dk *= vec3(0.55, 0.62, 0.8); lt *= vec3(0.6, 0.68, 0.86); }
    dk *= near; lt *= near;
    if (!mid || cover < 0.6) {
      tileC = mix(dk, lt, 0.4); tileA = clamp(cover * 0.8, 0.15, 0.6);
      put(cover >= 0.5 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.8, mix(dk, lt, 0.6));
      return;
    }
    // (its tile: shaded by the light, the fins a little duller, the dark marks darker, the dorsal
    // fin's edge catching the light, the eyes black; flickering a little)
    vec3 c = wh > 4.5 ? dk * 0.38 : wh > 3.5 ? rgb(16.0, 16.0, 20.0) : wh > 2.5 ? mix(lt, vec3(1.0), 0.25) : mix(dk, lt, wh > 1.5 ? 0.15 + 0.7 * li : li);
    c *= 1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.02;
    tileC = c; tileA = 1.0;
    vec3 ink = wh > 4.5 ? dk * 0.6 : wh > 3.5 ? rgb(154.0, 160.0, 173.0) : roll < 0.035 ? accent(key) : roll < 0.05 ? vec3(1.0)
             : day ? c * (0.7 - 0.12 * li) : min(c * (1.3 + 0.2 * li), vec3(1.0));
    put(g, 1.0, ink);
    return;
  }

  // --- by day, their shadows on the bottom, down and to the right of each
  if (day && sharkCells > 0.5) for (int k = 0; k < 3; k++) {
    vec4 B = shkB[k];
    vec2 q = p - vec2(0.02, -0.026);
    if (B.z < B.x || q.x < B.x || q.x > B.z || q.y < B.y || q.y > B.w) continue;
    if (sharkAt(k, q)) { tone = 0.8; break; }
  }
  // --- the fish: a wisp each, brighter nearer, glinting as they turn or flee: a dash swimming level,
  // a dot turning steeply (never a tall stroke: a bait ball milling round was a jumble of them)
  if (lf.r > 0.0) {
    float fa = mod(atan(sin(lf.a * 3.14159) / ch, cos(lf.a * 3.14159) / cw), 3.14159265);
    bool level = fa < 0.6 || fa > 2.54;
    put(level ? G_DASH : G_MID, (0.45 + 0.55 * lf.r) * (level ? 1.0 : 0.85), day ? mix(rgb(70.0, 120.0, 132.0), rgb(24.0, 62.0, 76.0), lf.r) : mix(rgb(70.0, 96.0, 150.0), rgb(220.0, 232.0, 255.0), lf.r));
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
  // --- the code fish, drawn as the sharks are, seen from above: a big fish meandering across the water
  // (surging on the kicks, back in from the left once it's gone), its body bending side to side as it
  // swims. A tile where it covers the cell, silver, shaded by the light, its back dark; its scales the
  // code's characters (digits and punctuation), each rolling to another a few times a second (faster
  // when the hats are busy), now and then flashing a colour or white; light glyphs round its edge where
  // a cell's only partly covered; its shadow on the bottom by day
  {
    float asp = view.x / view.y, F = 0.3 * min(1.0, 0.6 + 0.4 * asp), s, side;
    float u = mod(time * 0.014 + sea.y * 0.012 + 0.4, asp + F + 0.6) - 0.15;   // (cruising, a little faster after a kick)
    vec2 lf;
    if (abs(X - (u - F * 0.5)) < F * 0.7 && abs(Y - 0.62) < 0.2) {
      int what = fishAt(p, u, F, s, side, lf);
      int n = what != 0 ? 1 : 0;
      float s2, side2; vec2 lf2;
      for (int i = 0; i < 4; i++) if (fishAt(p + SUB[i] * vec2(cw, ch), u, F, s2, side2, lf2) != 0) n++;
      float key = h2(vec2(floor(s * F / cw * 1.4 + 0.5), floor(side * 3.0 + 0.5)) + 71.0);
      vec3 dk = rgb(44.0, 62.0, 104.0), lt = rgb(176.0, 196.0, 224.0);
      if (!day) { dk *= vec3(0.55, 0.62, 0.8); lt *= vec3(0.6, 0.68, 0.86); }
      // (its cells marked (front 127), so the jellyfish and the stingray in pixels pass behind it)
      if (n > 0 && over == 0) front = 127.0 / 255.0;
      if (n > 0 && (what == 0 || n < 3)) {
        put(n >= 2 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.9, mix(dk, lt, 0.35));
        return;
      }
      if (what != 0) {
        // (lit on the side toward the light, its back dark, its fins a little see-through, its eyes black)
        float li = clamp(0.55 + 0.45 * side * dot(lf, normalize(SUN)), 0.0, 1.0);
        // (a yellowfin: its back a deep metal blue, silver sides with a gold stripe along them, yellow fins)
        vec3 gold = mix(rgb(196.0, 150.0, 40.0), rgb(250.0, 214.0, 96.0), li) * (day ? 1.0 : 0.62);
        vec3 c = what == 4 ? rgb(14.0, 14.0, 20.0) : what == 3 ? (day ? mix(dk, lt, 0.22) : dk * 0.82) : what == 2 ? (abs(side) > 1.5 ? mix(mix(dk, lt, 0.4), gold, 0.35 + 0.45 * smoothstep(0.25, 0.42, s)) : gold) : mix(mix(dk, lt, li), gold, 0.55 * smoothstep(0.16, 0.0, abs(abs(side) - 0.5)));
        c *= 1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.05;
        tileC = c; tileA = what == 2 ? 0.8 : 1.0;
        float roll = h2(vec2(floor(key * 4096.0), floor(time * (0.7 + 1.8 * fly) + fract(key * 31.0) * 10.0)));
        int g = what == 4 ? G_SMALLO : CODE[int(roll * ${CODE_CHARS.length}.0)];
        float fl = h2(vec2(floor(key * 2048.0), floor(time * 2.4 + fract(key * 17.0) * 10.0)));
        vec3 ink = what == 4 ? rgb(150.0, 160.0, 175.0) : fl < 0.05 ? accent(key) : fl < 0.075 ? vec3(1.0)
                 : day ? c * (li > 0.55 ? 0.36 : 0.48) : li > 0.55 ? rgb(14.0, 15.0, 19.0) : rgb(27.0, 29.0, 36.0);
        put(g, 1.0, ink);
        return;
      }
    }
    // (its shadow on the bottom by day, down and to the right of it)
    if (day && abs(X - 0.02 - (u - F * 0.5)) < F * 0.7 && abs(Y + 0.026 - 0.62) < 0.2) {
      float s2, side2; vec2 lf2;
      if (fishAt(p - vec2(0.02, -0.026), u, F, s2, side2, lf2) != 0) tone = 0.8;
    }
  }
  // --- jellyfish rising through the middle of the water, seen from the side, drawn as the sharks are:
  // the bell a dome, its tiles shaded by the light from above, its glyphs keyed to it (so they ride
  // along with it) and now and then flashing, so it shimmers; light glyphs round its edge where a cell's
  // only partly in it; its rim glowing, a fringe of short tentacles under it, its four rings showing
  // through. It beats every two beats (squeezing, a surge up, gliding on). Under it its tentacles hang
  // in swaying strands that end in wisps, its frilled arms between them. They glow at night
  {
    float asp = view.x / view.y, s2 = sea.z * 0.5, b2 = fract(s2);
    float pulse = exp(-b2 * 6.0);                                                   // (1 as it beats)
    float rise = floor(s2) + (1.0 - exp(-b2 * 5.0)) / (1.0 - exp(-5.0));           // (a surge, then gliding)
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      bool big = k == 0;
      // (its bell: half its width, its height, its hollow's rise, squeezing as it beats; its tentacles' length)
      float sz = min(1.0, 0.55 + 0.45 * asp);                                         // (a little smaller in a tall window)
      float a = (big ? 0.105 : 0.066) * sz * (1.0 - 0.14 * pulse), b = (big ? 0.1 : 0.064) * sz * (1.0 + 0.12 * pulse);
      float hh = (big ? 0.014 : 0.009) * sz * (1.0 + 1.2 * pulse), L = (big ? 0.3 : 0.19) * sz;
      vec2 c = vec2((k == 0 ? 0.24 : (k == 1 ? 0.58 : 0.86)) * asp + 0.03 * sin(time * 0.11 + fk * 2.1),
                    mod(0.1 + 0.53 * fk + rise * (big ? 0.022 : 0.016), 1.75) - 0.4);   // (its rim's middle: rising, back in below once well out the top)
      if (abs(X - c.x) > a + 0.06 || Y > c.y + b + 0.02 || Y < c.y - L - 0.02) continue;
      vec3 glowC = k == 1 ? rgb(190.0, 150.0, 255.0) : (k == 2 ? rgb(120.0, 230.0, 255.0) : rgb(255.0, 150.0, 220.0));
      vec3 dk = day ? rgb(178.0, 206.0, 232.0) : glowC * 0.1, lt = day ? rgb(248.0, 242.0, 255.0) : glowC * 0.66;   // (see-through, and its skin)
      bool mid = bellAt(p, c, a, b, hh);
      int n = mid ? 1 : 0;
      for (int i = 0; i < 4; i++) if (bellAt(p + SUB[i] * vec2(cw, ch), c, a, b, hh)) n++;
      if (sharkCells < 0.5 && n == 0) continue;
      float x = clamp((X - c.x) / a, -0.999, 0.999), w = 1.0 - x * x, yT = b * sqrt(w), yB = hh * w, dy = Y - c.y;
      float vv = clamp((dy - yB) / max(yT - yB, 1e-4), 0.0, 1.0);                  // (0 its underside, 1 its top)
      float key = h2(vec2(floor((X - c.x) / cw + 0.5), floor((dy - yB) / ch + 0.5)) + fk * 37.0);
      // (glowing at its skin, along its top and down its sides, see-through inside; lit from above)
      float skin = max(smoothstep(0.5, 1.0, vv), smoothstep(0.55, 1.0, abs(x)));
      float li = clamp(0.08 + 0.8 * skin + 0.15 * vv, 0.0, 1.0);
      bool rim = (dy - yB) < ch * 0.9;                                            // (its rim, glowing: a row along its base)
      bool ring = false;                                                          // (its four rings, in a row)
      for (int i = 0; i < 4; i++) if (abs(x - (-0.54 + 0.36 * float(i))) * a < cw * 0.6 && abs(vv - 0.32) * (yT - yB) < ch * 0.55) ring = true;
      // (the shimmer: each glyph rolls again a couple of times a second, on its own beat; more as it beats)
      float roll = h2(vec2(floor(key * 4096.0), floor(time * 2.4 + fract(key * 31.0) * 10.0)));
      // (fine grain on its skin, nearly clear inside: a fleck here and there)
      int grain = li > 0.6 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < (li > 0.3 ? 0.35 : 0.14) ? G_MID : 0);
      // (with them in pixels (see SHARK_PX), only that grain from here, where a cell's well inside its
      // bell (none on its rim or its rings: the pixels' own), laid over whatever's there, the
      // jellyfish's number in the cell's front (120 + which one); its ink full for a flash of white)
      if (sharkCells < 0.5) {
        if (over == 0 && mid && n >= 3 && !rim && !ring && grain != 0) {
          over = grain; overInk = roll < 0.05 + 0.08 * pulse ? 1.0 : 0.996; overC = vec3(1.0); front = (120.0 + fk) / 255.0;
        }
        break;
      }
      if (n > 0 && (!mid || n < 3)) {
        // (its edge: a light glyph, no tile)
        put(n >= 2 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.9, day ? mix(dk, lt, 0.2) * 0.85 : mix(dk, lt, 0.7) * 1.3);
        return;
      }
      if (n > 0) {
        vec3 tc = rim ? (day ? rgb(236.0, 206.0, 244.0) : glowC * (0.62 + 0.3 * pulse))
                : ring ? (day ? rgb(236.0, 160.0, 214.0) : mix(glowC, vec3(1.0), 0.2) * 0.62)
                : mix(dk, lt, li) * (1.0 + 0.25 * pulse * (day ? 0.0 : 1.0));
        tc *= 1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.05;
        tileC = tc; tileA = day ? 0.88 : 1.0;
        int g = rim ? (mod(cell.x + fk, 2.0) < 1.0 ? G_TILDE : G_DASH) : ring ? G_SMALLO : grain;
        vec3 ink = roll < 0.05 + 0.08 * pulse ? vec3(1.0) : (day ? tc * (ring ? 0.62 : 0.72) : tc * (ring ? 1.5 : 1.55));
        put(g, 1.0, ink);
        return;
      }
      // (a fringe of short tentacles just under its rim)
      if (dy < yB && dy > yB - ch * 1.6 && abs(X - c.x) < a * 0.98 && h2(vec2(cell.x, floor(time * 1.5)) + fk * 9.0) < 0.75) {
        put(mod(cell.x, 3.0) < 1.0 ? G_GRAVE : (mod(cell.x, 3.0) < 2.0 ? G_TICK : G_COMMA), 0.7, day ? dk * 0.85 : glowC * 0.75);
        return;
      }
      // (its tentacles: from points along its rim, hanging, swaying, strands, then dots, then wisps)
      int N = big ? 5 : 3;
      for (int j = 0; j < 5; j++) {
        if (j >= N) break;
        float fj = float(j), u = (fj / float(N - 1) - 0.5) * 1.7;
        float len = L * (0.75 + 0.25 * h1(fj * 3.7 + fk * 11.0));
        float xa = c.x + u * a, ya = c.y + hh * (1.0 - u * u) - ch;
        float down = ya - Y;
        if (down < 0.0 || down >= len) continue;
        float t0 = down / len, rr = down / ch, A = (big ? 1.6 : 1.0) * cw, ph = time * 1.3 + fj * 1.1 + fk * 2.0;
        float x1 = xa + A * pow(t0, 0.8) * sin(ph - rr * 0.5), x2 = xa + A * pow(min(1.0, (down + ch) / len), 0.8) * sin(ph - (rr + 1.0) * 0.5);
        if (abs(X - x1) < cw * 0.5) {
          float sl = (x2 - x1) / cw;
          put(t0 > 0.7 ? G_MID : (t0 > 0.35 ? G_COLON : (sl > 0.4 ? G_BACK : (sl < -0.4 ? G_SLASH : G_BAR))), 0.75 - 0.4 * t0, (day ? dk * 0.8 : glowC * 0.8) * (1.0 - 0.45 * t0));
          return;
        }
      }
      // (its frilled arms from the middle of its underside, shorter, swaying slower and wider: two, or
      // one on a small one)
      for (int j = 0; j < 2; j++) {
        if (!big && j == 1) break;
        float fj = float(j), len = L * 0.58;
        float xa = c.x + (big ? (fj - 0.5) * 0.36 : 0.0) * a, ya = c.y + hh - ch;
        float down = ya - Y;
        if (down < 0.0 || down >= len) continue;
        float t0 = down / len, x1 = xa + 1.4 * cw * pow(t0, 0.7) * sin(time * 0.8 + fj * 2.5 + fk - down / ch * 0.35);
        if (abs(X - x1) < cw * 0.5) { put(t0 > 0.75 ? G_TILDE : G_APPROX, 0.8 - 0.35 * t0, day ? mix(dk, rgb(200.0, 100.0, 180.0), 0.5) : mix(glowC, vec3(1.0), 0.2)); return; }
      }
    }
  }
  // --- a stingray gliding along the bottom, drawn as the sharks are, seen from above: a blue-spotted
  // ribbontail, its disc sandy gold with electric blue spots, shaded by the light (domed a little, its
  // wings' thin edges paler), the edges of its wings rippling as it flies, its eyes and spiracles on
  // top; its long thin tail following its way behind it, banded blue. Light glyphs round its edge where
  // a cell's only partly covered; its shadow close under it on the bottom by day
  {
    float asp = view.x / view.y, wide = clamp((asp - 0.56) / 1.22, 0.0, 1.0), sz = min(1.0, 0.55 + 0.45 * asp);
    float Lb = 0.075 * sz, Wb = 0.105 * sz, T = 0.26 * sz, lane = mix(0.84, 0.8, wide);
    float u = mod(time * 0.011 + sea.y * 0.006 + 0.9, asp + 0.65 + T);
    vec2 c0 = rayWay(u, asp, lane);
    if (length(p - c0) < Lb + Wb + T + 0.06) {
      float al, ac, r;
      vec2 td;
      int what = rayAt(p, u, asp, lane, Lb, Wb, T, al, ac, r, td);
      vec3 night = day ? vec3(1.0) : vec3(0.6, 0.68, 0.86);
      if (what == 3) {
        // (its tail: a line along its way, sand banded blue, a wisp at its end; in pixels, the pixels')
        if (sharkCells > 0.5) {
          float ta = mod(atan(td.y / ch, td.x / cw), 3.14159265);
          int tg = r > 0.85 ? G_MID : (r < 0.45 && (ta < 0.4 || ta > 2.74) ? G_HHEAVY : (r < 0.45 && abs(ta - 1.5708) < 0.4 ? G_VHEAVY : lineGlyph(atan(td.y, td.x))));
          put(tg, 1.0, (mod(r * 14.0, 2.0) < 1.0 ? rgb(70.0, 150.0, 250.0) : rgb(176.0, 144.0, 88.0)) * night);
          return;
        }
      } else {
        int n = what != 0 ? 1 : 0;
        float a2, c2, r2; vec2 t2;
        for (int i = 0; i < 4; i++) { int w2 = rayAt(p + SUB[i] * vec2(cw, ch), u, asp, lane, Lb, Wb, T, a2, c2, r2, t2); if (w2 != 0 && w2 != 3) n++; }
        float key = h2(vec2(floor(al * Lb / cw * 1.3 + 0.5), floor(ac * Wb / ch * 1.3 + 0.5)) + 53.0);
        vec3 dk = rgb(150.0, 114.0, 64.0), lt = rgb(238.0, 210.0, 148.0);
        // (lit from above: domed a little, brighter toward the light; its wings' edges paler)
        vec2 rdir = normalize(p - c0 + vec2(1e-5));
        float li = clamp(0.5 + 0.3 * dot(rdir, normalize(SUN)) * min(1.0, r) + 0.25 * (1.0 - min(1.0, r)), 0.0, 1.0);
        // (its spots: electric blue, spread evenly over its wings and the back of its disc, one to a
        // patch of it, riding along with it; none on its edge, none round its eyes)
        float span0 = al > -0.08 ? pow(clamp((1.0 - al) / 1.08, 0.0, 1.0), 0.72) : pow(clamp((al + 1.0) / 0.92, 0.0, 1.0), 0.9);
        vec2 sg = vec2(al * Lb, ac * Wb) / 0.028, gi = floor(sg);
        vec2 sc = gi + 0.3 + 0.4 * vec2(h2(gi + 3.1), h2(gi + 9.7));
        bool spot = what == 1 && (span0 - abs(ac)) * Wb > 1.3 * max(cw, ch) && !(al > 0.15 && abs(ac) < 0.3) && h2(gi + 5.3) < 0.5 && length(sg - sc) < 0.26;
        int g = what == 4 ? G_SMALLO : what == 5 ? G_DOT : spot ? G_SMALLO : RAMP[clamp(int((1.0 - li) * 9.99) + int(fract(key * 13.7) * 3.0) - 1, 0, 9)];
        // (with it in pixels (see SHARK_PX), only its skin's glyphs from here, on its disc and wings where
        // a cell's well inside it (none on its eyes, spiracles or spots: the pixels' own), laid over
        // whatever's there; its front 123)
        if (sharkCells < 0.5) {
          if (over == 0 && n >= 3 && (what == 1 || what == 2 || what == 6) && !spot) { over = g; overInk = 0.996; overC = vec3(0.0); front = 123.0 / 255.0; }
        } else {
          if (n > 0 && (what == 0 || n < 3)) {
            put(n >= 2 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.9, mix(dk, lt, 0.5) * night);
            return;
          }
          if (what != 0) {
            vec3 c = mix(dk, lt, li);
            // (its body raised down its middle, a little darker and richer, a faint line where its wings
            // begin; the wings' thin edges paler)
            float wing = abs(ac) / 0.34;
            if (what == 1 && wing < 1.0) c = mix(c, c * vec3(0.86, 0.8, 0.72), 0.7);
            if (what == 1 && abs(wing - 1.0) < 0.09 && abs(al) < 0.82) c *= 0.84;
            if (what == 2) c = mix(c, rgb(250.0, 236.0, 200.0), 0.35);
            if (what == 6) c *= 0.85;
            if (spot) c = rgb(60.0, 150.0, 255.0);
            if (what == 4) c = rgb(36.0, 30.0, 22.0);
            if (what == 5) c = mix(dk, rgb(36.0, 30.0, 22.0), 0.5);
            c *= night * (1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.04);
            tileC = c; tileA = 1.0;
            vec3 ink = what == 4 ? rgb(200.0, 190.0, 160.0) * night : spot ? rgb(190.0, 230.0, 255.0) * night
                     : day ? c * (li > 0.55 ? 0.42 : 0.52) : li > 0.55 ? rgb(16.0, 15.0, 14.0) : rgb(30.0, 28.0, 26.0);
            put(g, 1.0, ink);
            return;
          }
        }
      }
    }
    // (its shadow close under it on the bottom by day: it swims low; in pixels, the pixels')
    if (sharkCells > 0.5 && day && length(p - c0) < Lb + Wb + T + 0.08) {
      float a2, c2, r2; vec2 t2;
      if (rayAt(p - vec2(0.012, -0.016), u, asp, lane, Lb, Wb, T, a2, c2, r2, t2) != 0) tone = 0.8;
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

// The festival: a stage on the far shore of a lake in the mountains, the toaster at its decks. Its
// lights' beams fan up into the sky and sweep with the bars, brighter on the kick; the screen behind
// the decks plays the music as bars; the speakers thump on the kick; fireworks go up over the
// mountains every 8 bars and on a drop. The crowd stands on the near shore, seen from behind
// against the light, heads bobbing on the beat, glow sticks and phones up, every hand in the air
// when the fireworks go; the lake mirrors all of it. By day an afternoon set: the lights off, the
// screen still playing. (moon: the stage's middle, its floor, its half width; lake: its far shore
// and the near one; the show's two colours change every 8 bars)
const FESTIVAL = `
vec3 showA(float beats) { float k = mod(floor(beats / 32.0), 4.0); return k < 0.5 ? rgb(255.0, 84.0, 214.0) : k < 1.5 ? rgb(255.0, 178.0, 70.0) : k < 2.5 ? rgb(100.0, 255.0, 170.0) : rgb(176.0, 136.0, 255.0); }
vec3 showB(float beats) { float k = mod(floor(beats / 32.0), 4.0); return k < 0.5 ? rgb(86.0, 222.0, 255.0) : k < 1.5 ? rgb(120.0, 146.0, 255.0) : k < 2.5 ? rgb(255.0, 124.0, 222.0) : rgb(236.0, 238.0, 255.0); }
// a light's beam from o, leaning a (radians from straight up, + to the right): how bright at p, and
// how far from its middle line (0 there, 1 at its edge); widening and fading as it goes
float beamAt(vec2 p, vec2 o, float a, out float edge) {
  vec2 d = vec2(sin(a), cos(a)), v = p - o;
  float along = dot(v, d), across = abs(v.x * d.y - v.y * d.x);
  float w = 0.004 + 0.05 * along;
  edge = across / w;
  if (along <= 0.0 || edge >= 1.0) return 0.0;
  return (1.0 - edge * edge) * exp(-along * 1.5);
}
// the beams' lean: fanned out, sweeping together across the sky every 2 bars
float beamLean(float fi, float beats) { return (fi - 2.0) * 0.26 + 0.3 * sin(beats * 0.7854 + fi * 0.9); }
// a person seen from behind, head at h (radius r): the head, the shoulders sloping out under it, the
// body down off the foot of the window, and with up an arm raised on the side s (1 right, -1 left, 0
// both); the distance from p to the shape (negative inside), in units of the height
float person(vec2 p, vec2 h, float r, float up, float s) {
  float d = length((p - h) * vec2(1.0, 0.92)) - r;
  vec2 q = p - vec2(h.x, h.y - r * 2.7);
  vec2 e = abs(q) - vec2(r * 1.3, r * 0.9);
  d = min(d, length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - r * 0.9);
  d = min(d, max(abs(p.x - h.x) - r * 2.2, p.y - (h.y - r * 2.7)));
  if (up > 0.5) {
    for (int k = 0; k < 2; k++) {
      float side = k == 0 ? 1.0 : -1.0;
      if (s != 0.0 && side != s) continue;
      vec2 a = vec2(h.x + side * r * 1.7, h.y - r * 1.6), b = vec2(h.x + side * r * 2.3, h.y + r * 2.6);
      vec2 pa = p - a, ba = b - a;
      float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      d = min(d, length(pa - ba * t) - r * 0.36);
    }
  }
  return d;
}
// someone in the crowd, head at h (see person); or with high someone up on someone's shoulders: their
// head and shoulders over the head and shoulders of the one carrying them
float crowdShape(vec2 p, vec2 h, float r, float up, float s, bool high) {
  if (!high) return person(p, h, r, up, s);
  return min(max(person(p, h, r, up, s), h.y - r * 3.4 - p.y), person(p, h - vec2(0.0, r * 3.2), r, 0.0, 0.0));
}
// what someone has on, seen by day: navy, maroon, olive, mustard, denim, grey
vec3 wear(float s) { float k = floor(h1(s + 11.0) * 6.0); return k < 0.5 ? rgb(40.0, 52.0, 92.0) : k < 1.5 ? rgb(112.0, 40.0, 50.0) : k < 2.5 ? rgb(72.0, 82.0, 46.0) : k < 3.5 ? rgb(156.0, 112.0, 40.0) : k < 4.5 ? rgb(62.0, 84.0, 124.0) : rgb(92.0, 90.0, 98.0); }
// whether a beam's middle line, from o leaning a, passes through the cell at c (its glyph then: │ ╱
// ╲, joined cell to cell into one line, as the ridges are drawn)
int beamLine(vec2 c, vec2 o, float a) {
  float y0 = max(c.y - 0.5 * ch, o.y), y1 = c.y + 0.5 * ch;
  if (y1 <= o.y) return 0;
  float ta = tan(a), x0 = o.x + (y0 - o.y) * ta, x1 = o.x + (y1 - o.y) * ta;
  if (max(x0, x1) < c.x - 0.5 * cw || min(x0, x1) > c.x + 0.5 * cw) return 0;
  return abs(x1 - x0) < cw * 0.6 ? G_VLINE : (x1 > x0 ? G_HATCH : G_HATCHB);
}
// the fireworks: three shells each time (leap), rising from behind the stage, each bursting into a
// ring of sparks that streak out, fall and twinkle out, white hot at first; at p the brightest
// (0-1), its colour and its glyph (a streak along its way out, its head a star)
float fireworks(vec2 p, float beats, out vec3 col, out int g) {
  col = vec3(0.0);
  g = 0;
  if (leap.w < 0.5 || leap.x > 3.6) return 0.0;
  float best = 0.0;
  vec2 cs = vec2(cw, ch);
  for (int s = 0; s < 3; s++) {
    float fs = float(s), t = leap.x - fs * 0.4;
    if (t < 0.0) continue;
    float seed = leap.z * 17.0 + fs * 3.7;
    vec2 from = vec2(moon.x + (h1(seed) - 0.5) * 0.7, moon.y + 0.05);
    vec2 burst = vec2(from.x + (h1(seed + 1.0) - 0.5) * 0.25, 0.62 + 0.22 * h1(seed + 2.0));
    vec3 c = s == 1 ? showB(beats) : s == 2 ? rgb(255.0, 220.0, 130.0) : showA(beats);
    if (t < 0.65) {
      // rising, its trail behind it
      float u = t / 0.65;
      vec2 q = mix(from, burst, 1.0 - (1.0 - u) * (1.0 - u));
      if (abs(p.x - q.x) < cw * 0.55 && p.y < q.y + ch * 0.5 && p.y > q.y - ch * 4.5) {
        float b = 1.0 - (q.y - p.y) / (ch * 5.0);
        if (b > best) { best = b; col = rgb(255.0, 236.0, 196.0); g = p.y > q.y - ch * 0.5 ? G_BULLET : G_VLINE; }
      }
      continue;
    }
    float tb = t - 0.65, R = 0.17 + 0.07 * h1(seed + 3.0);
    if (length(p - burst) > R * 1.15 + 0.05 * tb * tb + 0.02) continue;          // (nowhere near it)
    float fade = exp(-tb * 1.2), out1 = 1.0 - exp(-tb * 2.8), tp = max(tb - 0.14, 0.0), out0 = 1.0 - exp(-tp * 2.8);
    vec3 cc = tb < 0.25 ? mix(rgb(255.0, 250.0, 235.0), c, tb / 0.25) : c;
    // (its first instant: one flash at its heart, the sparks drawn once they're on their way)
    if (tb < 0.12 && length((p - burst) / cs) < 0.7) { best = 1.0; col = rgb(255.0, 252.0, 240.0); g = G_SPARK; continue; }
    for (int k = 0; k < 20; k++) {
      float fk = float(k), ang = fk * 0.31416 + h1(seed + fk) * 0.25, sp = R * (0.8 + 0.2 * h1(seed + fk * 1.7));
      vec2 u = vec2(sin(ang), cos(ang));
      vec2 q1 = burst + u * sp * out1 - vec2(0.0, 0.05 * tb * tb), q0 = burst + u * sp * out0 - vec2(0.0, 0.05 * tp * tp);
      if (length((q1 - burst) / cs) < 1.2) continue;
      // (the streak from q0 to q1, measured in cells)
      vec2 a = (p - q0) / cs, ab = (q1 - q0) / cs;
      float h = clamp(dot(a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      if (length(a - ab * h) < 0.6) {
        float b = fade * (0.45 + 0.55 * h) * (tb > 1.6 ? 0.6 + 0.4 * h1(seed + fk * 2.3 + floor(tb * 9.0)) : 1.0);
        if (b > best) {
          best = b;
          col = cc;
          g = h > 0.8 ? (b > 0.6 ? G_SPARK : G_STAR) : (abs(ab.x) < 0.5 * abs(ab.y) ? G_VLINE : (abs(ab.y) < 0.5 * abs(ab.x) ? G_LINE : (ab.x * ab.y > 0.0 ? G_HATCH : G_HATCHB)));
        }
      }
    }
  }
  return best;
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = false; richSky = 1.0;     // (night only, whatever the theme)
  float h0 = h2(cell + 17.0);
  float beats = sea.z, kick = sea.w;
  float sx = moon.x, sf = moon.y, sw = moon.z, roof = sf + 0.125;
  float dx = X - sx, ax = abs(dx);
  vec3 cA = showA(beats), cB = showB(beats);
  bool pop = leap.w > 0.5 && leap.x < 3.0;
  vec3 dark = P(rgb(8.0, 8.0, 20.0), rgb(40.0, 36.0, 56.0));          // (the crowd, against the light)

  // --- the crowd on the near shore, seen from behind against the lit water: three rows of people,
  // the nearest the biggest, each solid: by night a silhouette, dark, its outline lit in the show's
  // colours where it stands against the light; by day in what they have on, under their hair. Heads
  // bobbing on the beat (some a little behind it), some jumping on a kick; here and there an arm up,
  // a glow stick or a phone in its hand, now and then someone up on someone's shoulders waving a
  // every arm up when the fireworks go
  // (as high as a rider's flag: someone up on someone's shoulders in the far row, an arm up)
  if (Y < lake.y + 0.2) {
    bool hit = false, above = false;                  // (the cell in someone; the cell over it in anyone)
    int hitR = 0;
    float seedB = 0.0, radB = 0.0, upB = 1.0;
    bool highB = false;
    vec2 headC = vec2(0.0);
    for (int r = 2; r >= 0; r--) {
      float fr = float(r), rad = r == 2 ? 0.044 : (r == 1 ? 0.031 : 0.022), sp = rad * (r == 2 ? 4.3 : 4.0), off = fr * 0.031;
      float hy0 = r == 2 ? max(0.05, lake.y - 0.06) : (r == 1 ? lake.y - 0.02 : lake.y + 0.006);
      float i0 = floor((X - off) / sp), best = 1.0, bestUp = 1.0, seedR = 0.0;
      bool highR = false;
      vec2 headR = vec2(0.0);
      for (int n = -1; n < 2; n++) {
        float i = i0 + float(n), seed = i * 7.13 + fr * 101.0;
        float bob = fract(beats + h1(seed) * 0.35) < 0.3 ? rad * 0.35 : 0.0;
        float jump = kick > 0.45 && h1(seed + 2.0) < 0.25 ? rad * 0.7 : 0.0;
        bool high = false;                 // (no one up on shoulders: at this size they stood up out of the lake)
        vec2 hd = vec2((i + 0.5) * sp + off + (h1(seed + 9.0) - 0.5) * sp * 0.5, hy0 + (h1(seed + 1.0) - 0.5) * 0.01 + bob + jump + (high ? rad * 3.2 : 0.0));
        float up = pop || high || h1(seed + 3.0) < 0.1 + 0.15 * fly ? 1.0 : 0.0, side = pop ? 0.0 : (h1(seed + 8.0) < 0.5 ? -1.0 : 1.0);
        float dUp = crowdShape(vec2(X, Y + ch), hd, rad, up, side, high);
        above = above || dUp < 0.0;
        if (hit) continue;                                          // (someone nearer's in front)
        float d = crowdShape(vec2(X, Y), hd, rad, up, side, high);
        if (d < best) {
          best = d; seedR = seed; headR = hd; bestUp = dUp; highR = high;
          // (the hand of a raised arm: a glow stick in the show's colour, or a phone, lit)
          if (up > 0.5 && !high) {
            for (int k = 0; k < 2; k++) {
              float sd = k == 0 ? 1.0 : -1.0;
              if (side != 0.0 && sd != side) continue;
              vec2 hand = vec2(hd.x + sd * rad * 2.3, hd.y + rad * 2.6 + 0.4 * ch);
              float holds = h1(seed + 4.0 + float(k));
              if (holds < 0.3 && abs(X - hand.x) < cw * 0.5 && Y > hand.y - 0.5 * ch && Y < hand.y + 1.5 * ch) { put(G_VHEAVY, 1.0, h1(seed + 7.0) < 0.5 ? cA : cB); return; }
              if (holds > 0.75 && !day && abs(X - hand.x) < cw * 0.6 && abs(Y - hand.y) < ch * 0.6) { put(G_BULLET, 1.0, rgb(232.0, 240.0, 255.0)); return; }
            }
          }
        }
      }
      if (!hit && best < 0.0) { hit = true; hitR = r; seedB = seedR; radB = rad; headC = headR; upB = bestUp; highB = highR; }
    }
    if (hit) {
      vec3 lightC = mix(cA, cB, h1(seedB + 6.0));
      if (!day) {
        // by night a silhouette, flat: dark, a shade of their own, the far rows a little paler in the
        // haze; lit along its outline where it stands against the light
        float far = hitR == 0 ? 1.0 : (hitR == 1 ? 0.5 : 0.0);
        vec3 tone = mix(rgb(6.0, 6.0, 14.0), rgb(26.0, 22.0, 46.0), far) * (0.85 + 0.3 * h1(seedB + 5.0));
        tileC = above ? tone : mix(tone, lightC, 0.28); tileA = 1.0;
        put(G_BLANK, 0.0, tileC);
        return;
      }
      float hk = floor(h1(seedB + 13.0) * 5.0);
      vec3 hair = hk < 0.5 ? rgb(30.0, 24.0, 26.0) : hk < 1.5 ? rgb(78.0, 52.0, 36.0) : hk < 2.5 ? rgb(120.0, 58.0, 36.0) : hk < 3.5 ? rgb(176.0, 140.0, 82.0) : rgb(128.0, 124.0, 124.0);
      // (a rider's carrier: their hair and what they have on their own)
      bool carrier = highB && Y < headC.y - radB * 3.4;
      float sdB = carrier ? seedB + 37.0 : seedB;
      if (carrier) { float hk2 = floor(h1(sdB + 13.0) * 5.0); hair = hk2 < 0.5 ? rgb(30.0, 24.0, 26.0) : hk2 < 1.5 ? rgb(78.0, 52.0, 36.0) : hk2 < 2.5 ? rgb(120.0, 58.0, 36.0) : hk2 < 3.5 ? rgb(176.0, 140.0, 82.0) : rgb(128.0, 124.0, 124.0); }
      vec2 hc = carrier ? headC - vec2(0.0, radB * 3.2) : headC;
      vec3 body = length((vec2(X, Y) - hc) * vec2(1.0, 0.92)) < radB * 1.15 ? hair : mix(rgb(52.0, 42.0, 48.0), wear(sdB), 0.45);
      tileC = body; tileA = 1.0;
      if (upB > 0.0) { put(G_MEDIUM, 0.95, mix(body, rgb(236.0, 226.0, 210.0), 0.45)); return; }
      put(G_DARK, 0.5, body);
      return;
    }
    if (Y < lake.y) { tileC = P(dark * 0.6, rgb(80.0, 72.0, 70.0)); tileA = 1.0; put(G_BLANK, 0.0, tileC); return; }
  }

  // --- the lake: everything over it mirrored, dimmer, broken by the water: the stage's light lying
  // across it toward the crowd, the beams, the fireworks, the mountains; ripples on the kicks
  if (Y < lake.x) {
    float depth = (lake.x - Y) / (lake.x - lake.y);
    float wob = (0.002 + 0.006 * depth) * sin(row * 2.1 + time * 1.3);
    float Ym = 2.0 * lake.x - Y, Xw = X + wob;
    float streak = vn2(vec2((X + time * 0.004) * 14.0, row));
    int g = 0; vec3 c = P(rgb(36.0, 60.0, 120.0), rgb(70.0, 130.0, 190.0)); float ink = 0.0;
    // (solid: paler toward the far shore where it holds the sky, deeper toward the crowd)
    vec3 water = mix(P(rgb(26.0, 32.0, 72.0), rgb(180.0, 208.0, 234.0)), P(rgb(12.0, 16.0, 44.0), rgb(106.0, 156.0, 208.0)), depth);
    tileC = water; tileA = 1.0;
    // (the stage's light lying across it, widening and brightening toward the crowd)
    float pathW = sw * (0.4 + 0.45 * depth), across = abs(Xw - sx) / pathW;
    if (across < 1.0) {
      // (each row of ripples catching the one colour, strokes along it thinning toward the edges)
      c = h1(row * 1.7) < 0.5 ? cA : cB;
      tileC = mix(water, c, ((day ? 0.08 : 0.14) + 0.18 * kick * (day ? 0.3 : 1.0)) * (1.0 - across * across));
      if (streak > 0.45 + 0.4 * across) { g = streak > 0.8 && across < 0.4 ? G_LINE : G_DASH; ink = (0.3 + 0.35 * glow + 0.3 * kick) * (0.6 + 0.4 * depth) * (1.0 - 0.5 * across) * (day ? 0.45 : 1.0); }
    }
    // (the fireworks, then the beams' middle lines, mirrored)
    if (g == 0) {
      vec3 fc;
      int fg;
      float f = fireworks(vec2(Xw, Ym), beats, fc, fg);
      if (f > 0.15 && streak > 0.3) { g = fg == G_HATCH ? G_HATCHB : (fg == G_HATCHB ? G_HATCH : fg); c = fc; ink = 0.3 + 0.4 * f; tileC = mix(water, fc, 0.25 * min(1.0, f)); }
    }
    if (!day && g == 0 && streak > 0.35) {
      for (int i = 0; i < 5; i++) {
        float fi = float(i), a = beamLean(fi, beats);
        vec2 o = vec2(sx + (fi - 2.0) * sw * 0.38, roof + 2.0 * ch);
        int bg = beamLine(vec2(Xw, Ym), o, a);
        if (bg != 0) { g = bg == G_HATCH ? G_HATCHB : (bg == G_HATCHB ? G_HATCH : bg); c = i % 2 == 0 ? cA : cB; ink = (0.3 + 0.3 * glow + 0.35 * kick) * exp(-(Ym - o.y) * 1.8); tileC = mix(water, c, 0.25 * ink); break; }
      }
    }
    if (g == 0) {
      for (int i = 1; i < 3; i++) {
        float t0 = peak(i, Xw).x;
        if (Ym < t0 + 0.5 * ch) {
          bool edge = abs(Ym - t0) < ch * 0.8;
          vec3 rc = i == 1 ? P(rgb(50.0, 48.0, 100.0), rgb(146.0, 154.0, 200.0)) : P(rgb(36.0, 40.0, 84.0), rgb(166.0, 182.0, 214.0));
          if (streak > (edge ? 0.25 : 0.4)) tileC = mix(water, rc, (edge ? 0.5 : 0.36) * (day ? 0.75 : 1.0) - 0.25 * depth);
          if (edge && streak > 0.55) { g = G_TILDE; c = mix(rc, vec3(1.0), 0.2); ink = 0.5; }
          break;
        }
      }
    }
    if (g == 0 && streak > 0.88) { g = G_DASH; ink = 0.4; c = P(rgb(60.0, 80.0, 140.0), rgb(214.0, 232.0, 246.0)); }
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

  // --- the stage, on the far shore
  if (ax < sw + cw && Y < roof + 4.0 * ch) {
    vec3 steel = P(rgb(120.0, 120.0, 150.0), rgb(70.0, 72.0, 92.0));
    vec3 back = P(rgb(10.0, 10.0, 22.0), rgb(56.0, 54.0, 70.0)), steelT = P(rgb(46.0, 48.0, 66.0), rgb(110.0, 112.0, 128.0));
    // its floor, a lit edge; under it the skirt, dark, uplights along its front
    if (Y < sf) {
      if (ax < sw && Y > sf - ch) { tileC = steelT; tileA = 1.0; put(G_HHEAVY, 0.95, P(rgb(150.0, 150.0, 180.0), rgb(160.0, 160.0, 176.0))); return; }
      if (ax < sw) {
        tileC = P(rgb(14.0, 14.0, 28.0), rgb(46.0, 44.0, 58.0)); tileA = 1.0;
        if (mod(cell.x, 5.0) < 1.0 && Y > sf - 2.0 * ch) { put(G_CARET, 0.7 + 0.3 * kick, mod(cell.x, 10.0) < 5.0 ? cA : cB); return; }
        put(0, 0.0, tileC);
        return;
      }
    }
    // the roof: a truss, two chords and a lattice between, its lights hanging under it, blinking
    // round on the beats
    float rr = (Y - roof) / ch;
    if (rr > -0.5 && rr < 2.5 && ax < sw + cw * 0.5) {
      tileC = rr < 0.5 || rr > 1.5 ? steelT : back; tileA = 1.0;
      if (rr < 0.5 || rr > 1.5) { put(G_DBL, 0.95, steel); return; }
      put(mod(cell.x, 2.0) < 1.0 ? G_HATCH : G_HATCHB, 0.8, steel);
      return;
    }
    // the sign on top of it, its name lit, flaring on the kick
    if (rr >= 2.5 && rr < 3.5) {
      float kc = floor(dx / cw + 0.5);
      if (abs(kc) <= 3.0) {
        tileC = P(rgb(14.0, 12.0, 26.0), rgb(40.0, 36.0, 52.0)); tileA = 1.0;
        put(kc == -3.0 ? G_LT : kc == -2.0 ? G_BIGO : kc == -1.0 ? G_LA : kc == 0.0 ? G_LS : kc == 1.0 ? G_LT : kc == 2.0 ? G_LE : G_LR, 0.8 + 0.2 * kick, day ? cA * 0.75 : mix(rgb(255.0, 255.0, 255.0), cA, 0.3));
        return;
      }
      if (abs(kc) == 5.0) { tileC = steelT; tileA = 0.6; put(G_VLINE, 0.8, steel); return; }
    }
    if (rr > -1.5 && rr <= -0.5 && ax < sw && mod(cell.x, 4.0) < 1.0) {
      float on = fract(beats * 0.5 + floor(cell.x / 4.0) * 0.25) < 0.5 ? 1.0 : 0.4;
      tileC = back; tileA = 1.0;
      put(G_VEE, 0.6 + 0.4 * on, mod(cell.x, 8.0) < 4.0 ? cA : cB);
      return;
    }
    // the towers holding it up, at its ends
    if (abs(ax - sw) < cw * 0.6 && Y >= sf && Y < roof) { tileC = steelT; tileA = 1.0; put(G_VHEAVY, 0.9, steel); return; }
    if (Y >= sf && Y < roof && ax < sw) {
      // the speakers, stacked at each side, their cones thumping on the kick
      float spx = sw - 0.035;
      if (abs(ax - spx) < 0.022 && Y < sf + 0.09) {
        float sy = (Y - sf) / 0.09;
        tileC = P(rgb(20.0, 20.0, 32.0), rgb(34.0, 34.0, 42.0)); tileA = 1.0;
        if (abs(ax - spx) < cw * 0.6 && (abs(sy - 0.3) < 0.12 || abs(sy - 0.72) < 0.12)) { put(kick > 0.5 ? G_AT : G_BIGO, 0.75 + 0.25 * kick, P(rgb(150.0, 150.0, 170.0), rgb(120.0, 120.0, 132.0))); return; }
        put(h0 < 0.3 ? G_DOT : 0, 0.4, P(rgb(60.0, 60.0, 80.0), rgb(70.0, 70.0, 84.0)));
        return;
      }
      // the screen behind the decks: the music as bars rising from its foot, coloured up them
      float scrW = sw - 0.075, s0 = sf + 0.012, s1 = roof - 0.016;
      if (ax < scrW && Y > s0 && Y < s1) {
        float u = (Y - s0) / (s1 - s0), col = floor((X - (sx - scrW)) / cw);
        float lvl = clamp(0.2 + 0.65 * vn(col * 0.45 + beats * 1.6) * (0.65 + 0.5 * glow) + 0.3 * kick, 0.0, 1.0);
        tileC = P(rgb(12.0, 14.0, 30.0), rgb(30.0, 34.0, 52.0)); tileA = 1.0;
        if (u < lvl) {
          bool cap = u > lvl - ch / (s1 - s0);
          tileC = cap ? mix(cA, vec3(1.0), 0.5) : mix(cB, cA, u) * (day ? 0.85 : 0.9);
          put(cap ? G_HHEAVY : 0, 1.0, rgb(250.0, 250.0, 255.0));
          return;
        }
        put(mod(cell.x + row, 2.0) < 1.0 ? G_MID : 0, 0.3, P(rgb(60.0, 70.0, 110.0), rgb(90.0, 96.0, 120.0)));
        return;
      }
      // (the rest of it dark, the haze in it lit in the show's colours)
      float hz = fbm(vec2(X * 9.0 - time * 0.2, Y * 14.0));
      tileC = back; tileA = 1.0;
      if (!day && h0 < 0.35 * hz) { tileC = mix(back, cA, 0.12 * hz); put(G_TILDE, 0.3 + 0.3 * hz, cA); return; }
      put(0, 0.0, tileC);
      return;
    }
  }

  // --- the far shore beside it: pines, and the low hills behind them; the side of each tree toward
  // the stage lit in its colours at night, the nearer the brighter
  {
    float top, bot;
    vec4 tr = tree(X, top, bot);
    if (abs(tr.x - sx) > sw + 0.05 && Y < top && Y > bot) {
      float u = (Y - tr.y) / tr.z, axT = abs(X - tr.x), hw = tr.z * 0.42 * (1.0 - u);
      float tier = fract(u * (2.0 + floor(tr.z * 60.0)));
      int g = u > 0.86 ? G_TRI : (axT > hw - cw * 0.9 ? (X < tr.x ? G_SLASH : G_BACK) : (tier < 0.5 ? G_CARET : G_TRI));
      bool toward = (X - tr.x) * (sx - tr.x) > 0.0;
      put(g, 0.95, mix(P(rgb(18.0, 54.0, 46.0), rgb(36.0, 96.0, 58.0)), cA, toward && !day ? 0.55 * exp(-abs(tr.x - sx) * 3.0) : 0.0));
      return;
    }
    if (Y < hill(X) && ax > sw) { put(h0 < 0.5 ? G_DARK : G_MEDIUM, 0.7, P(rgb(12.0, 34.0, 30.0), rgb(36.0, 86.0, 52.0))); return; }
  }

  // --- the fireworks, over the mountains, in front of the beams
  {
    vec3 fc;
    int fg;
    float f = fireworks(vec2(X, Y), beats, fc, fg);
    if (f > 0.08) { put(fg, clamp(0.35 + 0.75 * f, 0.0, 1.0), fc); return; }
  }

  // --- the lights' beams, fanning up from the roof into the sky and sweeping with the bars, brighter
  // on the kick (at night): each a crisp line up its middle, the haze it lights round it a soft
  // scatter of dots, thinning out to its edges and as it goes
  if (!day && Y > roof) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i), e, a = beamLean(fi, beats);
      vec2 o = vec2(sx + (fi - 2.0) * sw * 0.38, roof + 2.0 * ch);
      float b = beamAt(vec2(X, Y), o, a, e) * (0.5 + 0.35 * glow + 0.5 * kick);
      vec3 bc = i % 2 == 0 ? cA : cB;
      int bg = beamLine(vec2(X, Y), o, a);
      if (bg != 0 && b > 0.04) { put(bg, clamp(0.4 + 0.9 * b, 0.0, 1.0), bc); return; }
      if (b > 0.05 && h0 < 0.9 * b * (1.0 - e)) { put(e < 0.45 && h0 < 0.4 * b ? G_COLON : G_MID, clamp(0.3 + 0.6 * b, 0.0, 1.0), bc); return; }
    }
  }

  // --- mist along the mountains' foot, and the ranges (as the lake's, lit by the moon)
  float lightX = sunAt.x;
  {
    float drift = fbm(vec2(X * 4.0 + time * 0.012, Y * 26.0));
    float m = exp(-pow((Y - (farL.x + 0.03)) / 0.026, 2.0)) * 0.8;
    m *= (0.15 + 0.85 * smoothstep(0.3, 0.7, drift)) * (day ? 0.8 : 1.0);
    if (h0 < m * 0.6) { put(h0 < m * 0.3 ? G_LINE : (h0 < m * 0.55 ? G_DASH : G_TILDE), 0.5 + 0.4 * m, P(rgb(118.0, 126.0, 172.0), rgb(150.0, 158.0, 190.0))); return; }
  }
  // the ranges, the middle then the far one, solid (see drawRange)
  for (int i = 1; i < 3; i++) if (drawRange(i, X, Y, h0, lightX)) return;

  sky(cell, X, Y, h0, farL.x, farL.x + farL.y * 0.2);
}`;

// The koi pond, seen from above as the sharks' water is: five koi swimming about it (a kohaku, white
// with red patches; a showa, black, red and white; a sanke, white and red flecked with black; a
// yamabuki, gold; an orange ogon), drawn as the sharks are, their fins and tails see-through; lily
// pads in the corners, two in flower, the koi passing under them; the toaster on a pad of its own, a
// ripple spreading from it on each kick, crumbs of toast on the water when it pops (or where food's
// dropped on it); a few petals floating. By day the bottom's pebbles, the light's net drifting over
// them and the shadows of the koi and the pads; by night fireflies (more of them lit when the hats
// are busy). The page swims the koi (stepPond) and hands each over as a spine of 13 points, snout
// first (koiS); its kind, length and how far its pectorals are spread (koiK); a box round it (koiB).
// moon: the toaster's pad, its middle and radius; a ripple's strength (rip.w) is how big it starts
const KOI = `
uniform vec2 koiS[65];      // the koi's spines, 13 points each from the snout (units of the height)
uniform vec4 koiK[5];       // each one's kind (0 a kohaku, 1 a showa, 2 a sanke, 3 a yamabuki, 4 an orange ogon), its length, how far its left and right pectorals are spread (0-1)
uniform vec4 koiB[5];       // the box each one's in (x0, y0, x1, y1), none when x1 < x0
uniform vec4 food;          // the last food on the water: where (units of the height), how long ago (s), how far it's spread
uniform float koiCells;     // 1: the koi drawn here, in the cells (when the paint pass can't draw them in pixels: see KOI_PX)
const vec2 SUN = vec2(-0.6, 0.8);
// (where in a cell the koi and the pads are looked for, besides its middle)
const vec2 SUB[4] = vec2[4](vec2(-0.27, 0.24), vec2(0.27, 0.2), vec2(-0.2, -0.26), vec2(0.24, -0.24));
// the skin's glyphs, sparse to dense, as the sharks': sparse where it's lit, dense in its shadows
const int RAMP[10] = int[10](G_COLON, G_SEMI, G_SMALLI, G_PLUS, G_SMALLX, G_LS, G_DOLLAR, G_EIGHT, G_HASH, G_AT);
// the lily pads, in the corners: which (0 the top left, 1 the top right, 2 the bottom left, 3 the
// bottom right), how far in from it (across, and up or down) and how big (units of the height, in a
// wide window); 0 and 5 in flower
const int PADC[8] = int[8](0, 0, 0, 1, 1, 2, 2, 3);
const vec2 PADO[8] = vec2[8](vec2(0.1, 0.11), vec2(0.215, 0.06), vec2(0.05, 0.245), vec2(0.11, 0.13), vec2(0.225, 0.05), vec2(0.13, 0.11), vec2(0.04, 0.245), vec2(0.09, 0.08));
const float PADR[8] = float[8](0.075, 0.042, 0.034, 0.062, 0.038, 0.07, 0.04, 0.052);
// a glyph along a line at angle a (on the screen, y up): a dash, a slash, a bar or a backslash, as the cells are drawn
int lineGlyph(float a) {
  float c = mod(atan(sin(a) / ch, cos(a) / cw), 3.14159265);
  return c < 0.3927 || c > 2.7489 ? G_DASH : c < 1.1781 ? G_SLASH : c < 1.9635 ? G_BAR : G_BACK;
}
// the light's net on the bottom, as in the sharks' water: how far from the nearest edge (x) and the
// edge's direction there (y)
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
float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }

// --- the koi. What's of koi k at p, seen from above: 0 nothing, 1 its body, 2 a fin, 3 its tail.
// Where on it: kS how far along it (0 its snout, 1 its tail's tip), kSide across it (-1 its right
// edge, 1 its left), kLf which way its left is; on a fin, kR how far out (0 its root, 1 its edge),
// kRay the way its rays run there (on the screen) and kRd how far from the nearest of them
float kS = 0.0, kSide = 0.0, kR = 0.0, kRay = 0.0, kRd = 0.0, kRidge = 0.0;
vec2 kLf = vec2(0.0, 1.0);
// Coverage and shadows only need the body; leave fins and tail out of these repeated samples.
int koiBodyAt(int k, vec2 p) {
  vec4 K = koiK[k];
  float L = K.y, best = 9.0, bl = 0.0, s = 9.0, fk = float(k);
  vec2 pt = vec2(1.0, 0.0);
  for (int i = 1; i <= 12; i++) {
    vec2 q = koiS[k * 13 + i], ba = koiS[k * 13 + i - 1] - q, pa = p - q;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
    if (dl < best) { best = dl; s = i == 12 && dot(pa, ba) < 0.0 ? 9.0 : (float(i) - h) / 12.0; bl = sign(ba.x * pa.y - ba.y * pa.x) * dl; pt = normalize(-ba); }
  }
  kS = s; kSide = 0.0; kRidge = 0.0; kLf = vec2(pt.y, -pt.x);
  if (s > 1.0) return 0;
  float wm = 0.115 * L, ab = abs(bl), sd = sign(bl);
  // (its body: a round head, full from its shoulders to halfway down, then narrowing to the root of
  // its tail)
  float x = 1.0 - min(1.0, s / 0.3), w = mix(wm * sqrt(1.0 - x * x), 0.33 * wm, smoothstep(0.45, 0.8, s));
  if (ab < w && s < 0.8) {
    // (its dorsal fin along the middle of its back, seen edge on: a cell wide)
    kSide = bl / w; kRidge = s > 0.3 && s < 0.64 && ab < 0.5 * (abs(pt.x) * ch + abs(pt.y) * cw) ? 1.0 : 0.0;
    return 1;
  }
  return 0;
}
int koiAt(int k, vec2 p) {
  vec4 K = koiK[k];
  float L = K.y, best = 9.0, bl = 0.0, s = 9.0, fk = float(k);
  vec2 pt = vec2(1.0, 0.0);
  for (int i = 1; i <= 12; i++) {
    vec2 q = koiS[k * 13 + i], ba = koiS[k * 13 + i - 1] - q, pa = p - q;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
    if (dl < best) { best = dl; s = i == 12 && dot(pa, ba) < 0.0 ? 9.0 : (float(i) - h) / 12.0; bl = sign(ba.x * pa.y - ba.y * pa.x) * dl; pt = normalize(-ba); }
  }
  kS = s; kSide = 0.0; kRidge = 0.0; kLf = vec2(pt.y, -pt.x);
  if (s > 1.0) return 0;
  float wm = 0.115 * L, ab = abs(bl), sd = sign(bl);
  // (its body: a round head, full from its shoulders to halfway down, then narrowing to the root of
  // its tail)
  float x = 1.0 - min(1.0, s / 0.3), w = mix(wm * sqrt(1.0 - x * x), 0.33 * wm, smoothstep(0.45, 0.8, s));
  if (ab < w && s < 0.8) {
    // (its dorsal fin along the middle of its back, seen edge on: a cell wide)
    kSide = bl / w; kRidge = s > 0.3 && s < 0.64 && ab < 0.5 * (abs(pt.x) * ch + abs(pt.y) * cw) ? 1.0 : 0.0;
    return 1;
  }
  // (its pectoral fins: rounded paddles from behind its head, folded back as it cruises, spread as it
  // turns or slows, stirring slowly; and two small pelvic fins halfway down)
  for (int f = 0; f < 2; f++) {
    float at = f == 0 ? 0.24 : 0.52, spread = sd > 0.0 ? K.z : K.w;
    float an = f == 0 ? 0.5 + 0.75 * spread + 0.08 * sin(time * 1.3 + fk * 2.3 + sd) : 0.5 + 0.2 * spread;
    float a = (f == 0 ? 0.1 : 0.048) * L, b = (f == 0 ? 0.052 : 0.024) * L;
    vec2 lp = vec2((s - at) * L, ab - (f == 0 ? 0.75 : 0.5) * wm), d = vec2(cos(an), sin(an)), c = lp - d * 0.9 * a;
    float e1 = dot(c, d) / a, e2 = (d.x * c.y - d.y * c.x) / b;
    if (e1 * e1 + e2 * e2 < 1.0) {
      float th = atan(lp.y, lp.x);
      kSide = sd; kR = length(lp) / (1.9 * a);
      kRd = abs(th - 0.36 * round(th / 0.36)) * length(lp);
      vec2 dir = lp.x * pt + lp.y * sd * kLf;
      kRay = atan(dir.y, dir.x);
      return 2;
    }
  }
  // (its tail: a broad fan, forked a little, its edge rippling)
  if (s > 0.76) {
    float tx = (s - 0.76) / 0.24, span = wm * (0.3 + 1.1 * pow(tx, 0.55)) * (1.0 + 0.05 * sin(time * 2.2 + tx * 5.0 + fk));
    if (ab < span && tx < 0.62 + 0.38 * pow(min(1.0, ab / (1.4 * wm)), 0.8)) {
      vec2 v = p - koiS[k * 13 + 9];
      float th = atan(pt.x * v.y - pt.y * v.x, dot(pt, v));
      kSide = bl / span; kR = tx;
      kRd = abs(th - 0.28 * round(th / 0.28)) * length(v);
      kRay = atan(v.y, v.x);
      return 3;
    }
  }
  return 0;
}
// a koi's colours: its skin at s along it, side across it, and its fins r out on them. 0 a kohaku
// (white, red patches, one on its head), 1 a showa (black, red and white, its fins black at their
// roots), 2 a sanke (a kohaku flecked with black), 3 a yamabuki (gold), 4 an orange ogon; its patches
// clouds riding along with it
vec3 koiSkin(int kind, float s, float side, float seed) {
  if (kind == 3) return rgb(242.0, 194.0, 76.0);
  if (kind == 4) return rgb(244.0, 132.0, 42.0);
  vec2 q = vec2(s * 7.0, side * 1.3) + seed * 9.7;
  float n = vn2(q) + 0.32 * bump(s, 0.13, 0.055) - 0.35 * bump(s, 0.245, 0.035) - (s < 0.045 ? 1.0 : 0.0);
  bool hi = n > 0.52 && abs(side) < 0.92;
  vec3 white = rgb(246.0, 243.0, 234.0), red = rgb(226.0, 70.0, 40.0), black = rgb(30.0, 29.0, 34.0);
  if (kind == 1) return hi ? red : vn2(q * 1.4 + 31.0) > 0.45 ? black : white;
  if (kind == 2 && !hi && s > 0.22 && vn2(vec2(s * 18.0, side * 3.0) + 51.0) > 0.74) return black;
  return hi ? red : white;
}
vec3 koiFin(int kind, float r) {
  if (kind == 3) return rgb(250.0, 214.0, 120.0);
  if (kind == 4) return rgb(250.0, 162.0, 82.0);
  if (kind == 1) return mix(rgb(40.0, 38.0, 44.0), rgb(238.0, 238.0, 234.0), smoothstep(0.25, 0.7, r));
  return rgb(244.0, 242.0, 236.0);
}

// --- the lily pads: lily pad k, its middle, its size and which way its notch points; drifting a
// little, turning slowly
vec4 padOf(int k, float asp, float sz) {
  float fk = float(k);
  int c = PADC[k];
  vec2 o = PADO[k] * sz;
  vec2 m = vec2(c == 0 || c == 2 ? o.x : asp - o.x, c < 2 ? 1.0 - o.y : o.y);
  return vec4(m + 0.008 * vec2(sin(time * 0.05 + fk), cos(time * 0.04 + fk * 1.7)), PADR[k] * sz, 6.2832 * h1(fk * 9.1 + 3.0) + 0.06 * sin(time * 0.03 + fk));
}
// what's of lily pad P at p: 0 nothing, 1 the leaf, 2 its rim, 3 a vein; dr how far out (0 its
// middle, 1 its edge, a little wavy); its notch a V cut in to its middle
int padAt(vec4 P, vec2 p, out float dr) {
  vec2 d0 = p - P.xy;
  float a = atan(d0.y, d0.x);
  dr = length(d0) / (P.z * (1.0 + 0.025 * sin(a * 7.0 + P.w * 3.0)));
  if (dr > 1.0) return 0;
  float da = abs(mod(a - P.w + 3.14159, 6.28318) - 3.14159);
  if (dr > 0.06 && da < 0.03 + 0.2 * dr) return 0;
  if (dr > 0.88) return 2;
  float va = abs(mod(a - P.w + 0.349, 0.6981) - 0.349);
  if (dr > 0.1 && va * dr * P.z < 0.4 * cw) return 3;
  return 1;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = night < 0.5;
  vec2 p = vec2(X, Y);
  float asp = view.x / view.y, sz = min(1.0, 0.55 + 0.45 * asp), h0 = h2(cell + 17.0);
  vec3 dim = day ? vec3(1.0) : vec3(0.5, 0.58, 0.74);   // (by night, in the moonlight)

  // --- fireflies over the water at night, wandering, blinking (more of them lit when the hats are
  // busy), each a glow round it on the water
  if (!day) for (int k = 0; k < 9; k++) {
    float fk = float(k);
    vec2 f = vec2(h1(fk * 3.1 + 40.0) * asp + 0.06 * sin(time * (0.2 + 0.1 * h1(fk)) + fk * 2.0),
                  0.08 + 0.84 * h1(fk * 5.7 + 40.0) + 0.04 * sin(time * (0.3 + 0.2 * h1(fk * 1.9)) + fk));
    float bl = smoothstep(0.35, 1.0, 0.5 + 0.5 * sin(time * (1.3 + 1.5 * h1(fk * 4.4)) + fk * 7.0)) * (0.35 + 0.65 * fly);
    if (bl < 0.08) continue;
    if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5) { tileC = rgb(255.0, 214.0, 96.0); tileA = 0.3 * bl; front = 0.75; put(bl > 0.5 ? G_BULLET : G_MID, 0.45 + 0.55 * bl, rgb(255.0, 236.0, 150.0)); return; }
    float d = length(vec2((X - f.x) / cw, (Y - f.y) / ch)) / 2.6;
    if (d < 1.0 && 0.22 * bl * (1.0 - d) * (1.0 - d) > tileA) { tileC = rgb(255.0, 210.0, 90.0); tileA = 0.22 * bl * (1.0 - d) * (1.0 - d); }
  }
  // --- petals floating on the water, drifting slowly across
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    vec2 f = vec2(mod(h1(fk * 2.3 + 60.0) * (asp + 0.2) + time * (0.004 + 0.003 * h1(fk + 61.0)), asp + 0.2) - 0.1,
                  0.05 + 0.9 * h1(fk * 4.9 + 60.0) + 0.02 * sin(time * 0.05 + fk));
    if (abs(X - f.x) < cw * 0.5 && abs(Y - f.y) < ch * 0.5) { front = 0.75; put(h1(fk + 62.0) < 0.5 ? G_COMMA : G_TICK, 0.95, rgb(255.0, 178.0, 208.0) * (day ? 1.0 : 0.6)); return; }
  }
  // --- food on the water (the toast's crumbs when it pops, or where it's dropped), spreading a little,
  // eaten a crumb at a time
  if (food.z < 9.0) for (int k = 0; k < 7; k++) {
    float fk = float(k), seed = floor(food.x * 977.0 + food.y * 613.0);
    float a = 6.2832 * h1(fk * 5.3 + seed), r = food.w * (0.55 + 0.45 * h1(fk * 2.9 + seed)) + 0.004 * food.z;
    vec2 c = food.xy + r * vec2(cos(a), sin(a));
    if (2.0 + 7.0 * h1(fk * 8.7 + seed) > food.z && abs(X - c.x) < cw * 0.5 && abs(Y - c.y) < ch * 0.5) { front = 0.75; put(fk < 3.0 ? G_SMALLO : G_DOT, 0.9, rgb(214.0, 150.0, 76.0) * (day ? 1.0 : 0.7)); return; }
  }

  // --- the lily pads: each leaf a tile, lit from the top left, its rim paler, veins running out
  // from its middle; two in flower: a water lily, two rings of pointed petals, white going pink at
  // their tips, a golden heart
  for (int k = 0; k < 8; k++) {
    vec4 P0 = padOf(k, asp, sz);
    if (length(p - P0.xy) > P0.z * 1.05 + 0.012) continue;
    if (k == 0 || k == 5) {
      vec2 fc = P0.xy - 0.25 * P0.z * vec2(cos(P0.w), sin(P0.w)), fd = p - fc;
      float fr = length(fd) / (0.6 * P0.z), fa = atan(fd.y, fd.x);
      float o1 = abs(mod(fa - P0.w, 0.7854) - 0.3927) / 0.3927, o2 = abs(mod(fa - P0.w + 0.3927, 0.7854) - 0.3927) / 0.3927;
      bool inner = fr < 0.68 - 0.38 * pow(o2, 0.8);
      front = 1.0;
      if (fr < 0.2) { tileC = rgb(250.0, 200.0, 70.0) * dim; tileA = 1.0; put(G_STAR, 1.0, rgb(160.0, 100.0, 20.0) * dim); return; }
      if (inner || fr < 1.0 - 0.6 * pow(o1, 0.8)) {
        vec3 pc = mix(rgb(255.0, 248.0, 250.0), rgb(242.0, 128.0, 172.0), smoothstep(inner ? 0.35 : 0.5, inner ? 0.9 : 1.0, fr));
        tileC = pc * dim; tileA = 1.0;
        put(lineGlyph(fa), 1.0, mix(pc, rgb(150.0, 50.0, 100.0), 0.55) * dim);
        return;
      }
      front = 0.5;
    }
    float dr, d2;
    int what = padAt(P0, p, dr);
    int n = what != 0 ? 1 : 0;
    for (int i = 0; i < 4; i++) if (padAt(P0, p + SUB[i] * vec2(cw, ch), d2) != 0) n++;
    if (n == 0) continue;
    front = 1.0;
    vec3 dk = rgb(30.0, 84.0, 46.0), lt = rgb(112.0, 172.0, 86.0);
    if (what == 0 || n < 3) { put(n >= 2 ? G_COLON : G_DOT, 0.85, mix(dk, lt, 0.6) * dim); return; }
    float li = clamp(0.5 + 0.28 * dot(normalize(p - P0.xy + 1e-5), normalize(SUN)) * dr + 0.18 * (1.0 - dr), 0.0, 1.0);
    vec3 c = mix(dk, lt, li);
    if (what == 2) c = mix(c, rgb(152.0, 198.0, 106.0), 0.45);
    if (what == 3) c *= 0.82;
    c *= dim;
    tileC = c; tileA = 1.0;
    put(what == 3 ? lineGlyph(atan(p.y - P0.y, p.x - P0.x)) : h0 < 0.07 ? G_MID : 0, 1.0, c * (day ? 0.55 : 0.5));
    return;
  }

  // --- a ripple spreading from the toaster's pad on each kick, or from where food's dropped
  for (int i = 0; i < 4; i++) {
    vec4 q = rip[i];
    if (q.w <= 0.0) continue;
    float fade = exp(-q.z * 1.5), rad = q.w + q.z * 0.075, dr = length(p - q.xy) - rad;
    if (abs(dr) < cw * 0.55 && fade > 0.15 && h2(cell + 3.0) < 0.35 + 0.45 * fade) {
      vec2 dv = p - q.xy;
      front = 0.75;
      put(lineGlyph(atan(dv.y, dv.x) + 1.5708), 0.25 + 0.6 * fade, P(rgb(150.0, 220.0, 200.0), rgb(244.0, 255.0, 250.0)));
      return;
    }
  }

  // --- the koi, the first over the rest: a tile where one's body covers the cell, its colours shaded
  // by the light (by night in the moonlight, still bright: they're what's to see), a glyph of the
  // skin's on its shaded side (keyed to a place on the skin, so it rides along with it) a shade darker
  // than it (on a black patch, lighter), now and then glinting white (the ogons' metal more often),
  // its eyes dark beads; light glyphs round its body where a cell's only partly covered; its fins and
  // tail see-through, only their rays drawn, pale
  vec3 kdim = day ? vec3(1.0) : vec3(0.72, 0.76, 0.88);
  // (a fin's film, kept while the koi under it are looked at: drawn only if none of them shows
  // there, so a fin over another koi never cuts a hole in it)
  bool fin = false;
  vec3 finC = vec3(0.0);
  int finG = 0;
  float finInk = 0.0;
  if (koiCells > 0.5) for (int k = 0; k < 5; k++) {
    vec4 B = koiB[k];
    if (B.z < B.x || X < B.x || X > B.z || Y < B.y || Y > B.w) continue;
    int what = koiAt(k, p);
    float s = kS, side = kSide, r = kR, ray = kRay, rd = kRd, ridge = kRidge, fk = float(k), L = koiK[k].y;
    vec2 lf = kLf;
    int n = what == 1 ? 1 : 0;
    for (int i = 0; i < 4; i++) if (koiBodyAt(k, p + SUB[i] * vec2(cw, ch)) == 1) n++;
    int kind = int(koiK[k].x + 0.5);
    float key = h2(vec2(floor(s * L / cw * 1.3 + 0.5), floor(side * 2.5 + 0.5)) + fk * 41.0);
    if (what == 1 && n >= 3) {
      vec3 base = koiSkin(kind, s, side, fk);
      float li = clamp(0.55 + 0.45 * clamp(side, -1.0, 1.0) * dot(lf, normalize(SUN)), 0.0, 1.0);
      vec3 c = base * (0.7 + 0.42 * li);
      if (kind >= 3) c = mix(c, vec3(1.0, 0.98, 0.88), 0.4 * smoothstep(0.62, 1.0, li));   // (the ogons' metal)
      c *= kdim * (1.0 + (h2(cell + floor(time * 6.0) * 1.3) - 0.5) * 0.04);
      tileC = c; tileA = 1.0;
      vec2 e0 = koiS[k * 13 + 1], ed = normalize(koiS[k * 13] - koiS[k * 13 + 2]), el = vec2(-ed.y, ed.x) * 0.055 * L;
      vec2 a1 = abs(p - e0 - el), a2 = abs(p - e0 + el);
      if ((a1.x < 0.5 * cw && a1.y < 0.5 * ch) || (a2.x < 0.5 * cw && a2.y < 0.5 * ch)) { tileC = rgb(22.0, 20.0, 26.0); put(G_MID, 0.9, rgb(230.0, 230.0, 236.0) * kdim); return; }
      float roll = h2(vec2(floor(key * 4096.0), floor(time * 2.0 + fract(key * 31.0) * 10.0)));
      if (ridge > 0.5) { put(lineGlyph(atan(lf.x, -lf.y)), 0.85, day ? c * 0.68 : mix(c, vec3(1.0), 0.3)); return; }
      if (roll < (kind >= 3 ? 0.05 : 0.015)) { put(G_MID, 1.0, vec3(1.0)); return; }
      bool sumi = dot(base, vec3(1.0)) < 0.5;
      int g = li > 0.74 - 0.18 * key ? 0 : RAMP[clamp(int((0.86 - li) * 6.0) + int(fract(key * 13.7) * 2.0), 0, 6)];
      put(g, 1.0, sumi ? c * 2.4 + 0.06 : c * (day ? 0.6 : 0.52));
      return;
    }
    if (n > 0) {
      put(n >= 2 ? (key < 0.5 ? G_COLON : G_SEMI) : (key < 0.25 ? G_DOT : key < 0.5 ? G_TICK : key < 0.75 ? G_COMMA : G_GRAVE), 0.9, koiSkin(kind, s, side, fk) * 0.85 * kdim);
      return;
    }
    if (!fin && (what == 2 || what == 3)) {
      // (a fin: a faint film, its rays drawn on it)
      fin = true;
      finC = koiFin(kind, r) * kdim;
      finG = rd < 0.5 * (abs(sin(ray)) * cw + abs(cos(ray)) * ch) ? lineGlyph(ray) : 0;
      finInk = 0.75 - 0.3 * r;
    }
  }
  if (fin) {
    tileC = finC; tileA = day ? 0.2 : 0.13;
    put(finG, finG != 0 ? finInk : 0.0, finC);
    return;
  }
  // (by day their shadows on the bottom, and the pads', down and to the right of each)
  if (day) {
    for (int k = 0; k < 8; k++) {
      vec4 P0 = padOf(k, asp, sz);
      float d2;
      if (padAt(P0, p - vec2(0.022, -0.032), d2) != 0) { tone = 0.8; break; }
    }
    if (length(p - vec2(0.022, -0.032) - moon.xy) < moon.z) tone = 0.8;
    if (tone == 0.0 && koiCells > 0.5) for (int k = 0; k < 5; k++) {
      vec4 B = koiB[k];
      vec2 q = p - vec2(0.014, -0.02);
      if (B.z < B.x || q.x < B.x || q.x > B.z || q.y < B.y || q.y > B.w) continue;
      if (koiBodyAt(k, q) == 1) { tone = 0.8; break; }
    }
  }

  // --- the bottom: pebbles here and there; by day the light's net drifting over it (faster when
  // the hats are busy), none in the shadows
  if (day && tone == 0.0) {
    float sc0 = 13.0, netAt = vn2(p * 3.0 + vec2(time * 0.05, -time * 0.03));
    vec2 ce = causticEdge(p * sc0, time * (0.35 + 0.5 * wind));
    if (abs(ce.x) / sc0 < cw * 0.45 && netAt > 0.5) { tileC = rgb(236.0, 252.0, 228.0); tileA = min(0.22, 0.06 + 0.6 * (netAt - 0.5)); }
  }
  float pb = h2(cell + 5.0);
  put(pb < 0.02 ? G_SMALLO : pb < 0.05 ? G_DOT : 0, 0.5, P(rgb(40.0, 70.0, 66.0), rgb(66.0, 104.0, 84.0)));
}
`;

// The space: on the moon, the Earth in its sky. Its ground in front, grey and rolling, its far edge
// against the sky; craters in it, seen low (squashed with the distance), each lit on its far wall and dark
// in its near, a rim round it; dust and stones, more toward you. Over it the stars, a few bright and most
// a fine dust, thicker along the Milky Way, twinkling with the loudness, and a star falling every 8 bars;
// the Milky Way itself across the sky, as it is with no air in the way, and Andromeda beside it. Night
// whatever the theme: there's no day in space. On a drop, a shower of meteors. The Earth, Saturn, the astronaut, the lander and the toaster on its cord are in pixels (see
// pixFor and drawSpace). (lake.x: the ground's far edge)
const SPACE = `
// the ground's far edge at x: rising to the right (as the stream's moon ground does), rolling a little
float groundAt(float x, float aspect) {
  return lake.x + 0.05 * (x / aspect - 0.5) + 0.012 * sin(x * 2.1 + 0.7) + 0.01 * (vn(x * 5.0 + 3.0) - 0.5) + 0.004 * (vn(x * 19.0) - 0.5);
}
// The Milky Way, broad across the sky and rising to the right (band: its core, its tilt, its width): its
// light here, bright down its middle with a faint skirt either side and a bulge at the core; star clouds
// along it, wisped; the dust in a rift wandering down its middle, deepest through the core, and in lanes
// across it. warmth: how warm (the core's old stars); knot: a pink knot of glowing gas here
float mwGlow(vec2 p, out float warmth, out float knot) {
  vec2 dir = vec2(cos(band.z), sin(band.z)), nrm = vec2(-dir.y, dir.x);
  vec2 r = p - band.xy;
  float u = dot(r, dir), v = dot(r, nrm);
  float w = band.w * (0.85 + 0.35 * vn(u * 2.2 + 4.0));
  float mid = (vn(u * 1.6 + 9.0) - 0.5) * 0.35 * band.w;
  float x = (v - mid) / w;
  float prof = exp(-x * x * 1.3) + 0.22 * exp(-x * x * 0.18);
  float cu = u / (2.4 * band.w), cv = (v - mid) / (1.3 * band.w);
  float core = exp(-cu * cu - cv * cv);
  vec2 q = vec2(u * 5.0, v * 11.0);
  vec2 wq = q + 0.6 * vec2(fbm(q * 0.7 + 3.1), fbm(q * 0.7 + 7.7));
  float clouds = fbm(wq);
  float lum = prof * (0.3 + 1.3 * clouds * clouds) * (0.55 + 0.45 * exp(-u * u / (25.0 * band.w * band.w))) + 1.4 * core;
  float rv = (v - mid - (vn(u * 3.3 + 1.0) - 0.5) * 0.4 * w) / (w * (0.15 + 0.1 * vn(u * 5.0 + 2.0)));
  float rift = exp(-rv * rv) * smoothstep(0.15, 0.55, vn(u * 1.1 + 6.0) + 0.35 * core);
  // (near the core the rift splits in two, a second lane above the first)
  float rv2 = (v - mid - 0.42 * w - (vn(u * 4.1 + 8.0) - 0.5) * 0.3 * w) / (w * 0.11);
  rift = max(rift, 0.8 * exp(-rv2 * rv2) * exp(-u * u / (10.0 * band.w * band.w)) * smoothstep(-0.2, 0.6, u / band.w + 0.5));
  float n = fbm(wq * 1.9 + 11.0);
  float lanes = smoothstep(0.62, 0.8, 1.0 - abs(2.0 * n - 1.0)) * exp(-x * x * 1.6);
  float dust = clamp(0.85 * rift + 0.65 * lanes, 0.0, 0.92);
  warmth = clamp(1.3 * core + 0.2 * prof * (1.0 - clouds), 0.0, 1.0);
  knot = smoothstep(0.86, 0.96, vn2(vec2(u * 26.0, v * 30.0) + 21.0)) * smoothstep(0.45, 0.9, prof) * (1.0 - dust) * (1.0 - core);
  return lum * (1.0 - dust);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  float X = (cell.x + 0.5) * cw, Y = 1.0 - (row + 0.5) * ch;
  day = false;   // (no day in space)
  float h0 = h2(cell + 17.0);
  float aspect = view.x / H;
  float gy = groundAt(X, aspect);

  // --- the ground, as the stream's moon ground is drawn: streaks of four colours drawn out along it, the
  // darkest most of it, the lightest along the rises; finer and flatter toward the far edge; a little dust
  if (Y < gy + 0.5 * ch) {
    float d = max(gy - Y, 0.0), v = sqrt(d / max(gy, 0.05));
    vec3 c0 = P(rgb(25.0, 23.0, 32.0), rgb(156.0, 146.0, 186.0)), c1 = P(rgb(35.0, 35.0, 44.0), rgb(174.0, 164.0, 202.0));
    vec3 c2 = P(rgb(39.0, 51.0, 63.0), rgb(190.0, 190.0, 220.0)), c3 = P(rgb(63.0, 94.0, 92.0), rgb(232.0, 230.0, 246.0));
    float n = fbm(vec2(X * 2.6 - v * 3.0, v * 9.0)) + 0.18 * (vn(X * 9.0 + v * 30.0) - 0.5);
    vec3 c = n > 0.66 ? c3 : n > 0.55 ? c2 : n > 0.44 ? c1 : c0;
    // the far edge against the sky, lit along it where it rises
    if (abs(Y - gy) < 0.5 * ch) {
      float l = groundAt(X - cw, aspect), r2 = groundAt(X + cw, aspect), rise = (r2 - l) / (2.0 * ch);
      tileC = rise > -0.1 ? c3 : c2; tileA = clamp(0.5 + d / ch, 0.25, 1.0);
      put(abs(rise) < 0.35 ? G_UNDER : rise > 0.0 ? G_SLASH : G_BACK, 0.8, mix(c3, P(rgb(190.0, 230.0, 226.0), rgb(255.0, 255.0, 255.0)), 0.4));
      return;
    }
    int g = h0 < 0.01 + 0.05 * v ? (h0 < 0.004 + 0.01 * v ? G_SMALLO : G_DOT) : 0;
    tileC = c; tileA = 1.0;
    put(g, 0.35 + 0.3 * v, mix(c, P(rgb(120.0, 150.0, 150.0), rgb(252.0, 250.0, 255.0)), 0.45));
    return;
  }

  // --- the sky (the furthest thing: the Earth, Saturn and the rest over it)
  front = 0.0;
  vec2 Pc = vec2(X, Y);
  // a shower of meteors on a drop: twenty, one after another over two seconds, streaking out from a point
  // up to the right and down across the sky, each a bright head glowing on the paper and a trail slanted
  // along its way, fading behind it
  float flare = 0.0;
  if (leap.w > 0.5 && leap.y > 1.5 && leap.x < 3.0) {
    flare = exp(-leap.x * 1.5);
    // (in a tall window, where the code fills the top, from the right edge across the sky under it)
    vec2 rad = aspect < 1.0 ? vec2(1.04 * aspect, 0.6) : vec2(0.97 * aspect, 1.06);
    for (int k = 0; k < 20; k++) {
      float fk = float(k), a0 = leap.x - fk * 0.11 - 0.08 * h1(fk * 3.1);
      if (a0 < 0.0 || a0 > 0.75) continue;
      float th = 3.14159 + 0.3 + 0.62 * h1(fk * 5.3);
      vec2 dir = vec2(cos(th), sin(th));
      vec2 head = rad + dir * (0.12 + 0.5 * h1(fk * 1.7) + 2.2 * a0);
      vec2 rel = Pc - head;
      float along = dot(rel, -dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
      float fade = smoothstep(0.75, 0.45, a0), len = 0.3 * min(1.0, a0 * 6.0);
      if (across < ch * 0.6 && along > -cw && along < len) {
        float a = (1.0 - along / (len + 1e-3)) * fade;
        if (a > 0.05) {
          vec3 hot = rgb(255.0, 252.0, 240.0), tail = day ? rgb(236.0, 110.0, 168.0) : rgb(130.0, 150.0, 236.0);
          bool level = abs(dir.y) < 0.4 * abs(dir.x);
          if (along < cw) { tileC = mix(tail, hot, 0.7); tileA = 0.85 * fade; put(G_SPARK, 1.0, hot); return; }
          if (along < 3.0 * cw) { tileC = mix(tail, hot, 0.4); tileA = 0.45 * a; }
          // (the trail's glyph by where its line crosses the cell: low, middle or high, so a shallow streak
          // runs on smoothly, not in steps; a steep one slanted)
          float off = dot(rel, vec2(-dir.y, dir.x)) * sign(dir.x) / ch;
          int gl = level || abs(dir.y) < 0.75 * abs(dir.x) ? (off > 0.18 ? G_UNDER : off < -0.18 ? G_TICK : G_DASH) : (dir.x * dir.y > 0.0 ? G_SLASH : G_BACK);
          put(gl, 0.4 + 0.6 * a, mix(tail, hot, a));
          return;
        }
      }
    }
  }
  // a star falling, every 8 bars at night: a bright head, its trail fading behind it
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
  // the Milky Way's glow, in the cells: cool along the arms, warm at the core, pink at the knots; then the
  // stars over it
  float warmth, knot, mw = mwGlow(Pc, warmth, knot);
  if (mw > 0.06 || knot > 0.05) {
    vec3 cool = rgb(118.0, 138.0, 214.0), warm = rgb(250.0, 206.0, 150.0), pink = rgb(232.0, 104.0, 156.0);
    // (its heart whiter and brighter than the rest)
    float heart = smoothstep(0.7, 1.0, warmth) * clamp(mw - 0.7, 0.0, 1.0);
    tileC = mix(mix(mix(cool, warm, warmth), rgb(255.0, 242.0, 222.0), heart), pink, min(0.85, knot * 2.0));
    tileA = min(0.6 + 0.2 * heart, 0.4 * clamp(mw, 0.0, 1.5) + 0.25 * knot);
  }
  // Andromeda, off the band and above it: a small tilted spiral, a bright core in a faint disk, a dust
  // lane along one side
  vec2 adir = vec2(cos(band.z + 0.55), sin(band.z + 0.55)), anrm = vec2(-adir.y, adir.x);
  vec2 ar = Pc - (band.xy + vec2(-sin(band.z), cos(band.z)) * 0.3 + vec2(cos(band.z), sin(band.z)) * 0.16);
  float au = dot(ar, adir) / 0.075, av = dot(ar, anrm) / 0.022, ae = au * au + av * av;
  if (ae < 1.0) {
    float lane = exp(-pow((av - 0.38) / 0.13, 2.0)) * (1.0 - exp(-ae * 6.0));
    float ab = exp(-ae * 3.0) * (1.0 - 0.75 * lane);
    tileC = mix(rgb(170.0, 182.0, 236.0), rgb(255.0, 236.0, 204.0), exp(-ae * 7.0));
    tileA = max(tileA, 0.12 + 0.5 * ab);
    if (ae < 0.05) { put(G_STAR, 1.0, rgb(255.0, 246.0, 226.0)); return; }
    if (ae < 0.22 && h0 < 0.6) { put(G_MID, 0.75, rgb(255.0, 236.0, 210.0)); return; }
  }
  // the stars: their brightness by a power law, so a few stand out and most are a fine dust; far more
  // along the Milky Way, brightest at its core; twinkling with the loudness
  float gal = min(1.0, mw);
  float sp = h2(cell + 91.0);
  if (sp < 0.03 + 0.16 * gal * gal) {
    float b = min(4.0, 0.22 * pow(max(h2(cell + 33.0), 1e-3), -0.83)) * (1.0 + 0.5 * warmth);
    float tw = 0.75 + 0.25 * sin(time * (0.8 + 2.4 * h2(cell)) + sp * 60.0) * (0.5 + glow) + 0.8 * flare;
    int g = b + 2.0 * flare < 0.4 ? G_DOT : b + 2.0 * flare < 0.75 ? G_MID : b + 2.0 * flare < 1.4 ? G_PLUS : b + 2.0 * flare < 2.6 ? G_STAR : G_SPARK;
    put(g, clamp((0.35 + 0.3 * b) * tw, 0.0, 1.0), mix(starTint(h2(cell + 55.0)), rgb(255.0, 226.0, 180.0), 0.5 * warmth));
    return;
  }
  // (the band's finest stars, unresolved: a dust of dots in its brighter clouds)
  if (gal > 0.35 && h0 < 0.45 * (gal - 0.35)) { put(G_DOT, 0.55, mix(rgb(190.0, 205.0, 255.0), rgb(255.0, 232.0, 196.0), warmth)); return; }
  put(0, 0.0, vec3(0.0));
}`;

// The eye, after @emaaad.d's eye in code: a real eye's footage (EYE_CLIP) drawn in glyphs, as his is.
// Each cell a glyph by how bright the eye is there (the light's slow slope taken out, so the white
// and the skin read apart), in the clip's own colour over a faint tile of it; the strong edges (the
// lids, the iris's rim) drawn as strokes along them; the iris's brown drawn by its colour as well; the
// eye in the dark round it. It looks out at you, calm, and blinks now and then (the clip at half speed,
// looping there and back). On a drop it's held where it is, and the window glides slowly into the pupil, a
// window onto space (see space): a galaxy and Saturn, photos drawn in glyphs as the eye is; after 8 bars,
// back out. Night whatever the theme.
const EYE = `
uniform sampler2D eyeVid;   // the clip's frame now, mipmapped
uniform vec4 eyeF;   // the clip in the window: the eye's middle in it (u; v down), how much of its height a window's height shows, its aspect
uniform vec4 eyeP;   // the pupil (where the clip's held for a dive), in the window's units: its middle, its radius; the clip ready (1) or not yet (0)
uniform vec4 eyeZ;   // the dive: how much bigger it's drawn about the pupil (1 none), how long since it began (s), the kick (0-1), the drop's flare (0-1)
uniform vec4 eyeS;   // the space: the galaxy's photo's half width in the window now (window heights), its middle (from the pupil's, in that); unused
uniform vec4 eyeL;   // the levels the clip's read at: a cell's (its mip), the light's slope (a blur's); the eye's middle in the window
uniform vec4 eyeD;   // the dive: how far in (0-1), the pupil's rim (window heights from its middle; 0 not diving), how fast it's going in (the zoom's log a second, smoothed), the zoom's share of its end
uniform sampler2D eyeSky;   // the galaxy: Hubble's photo of M51, the Whirlpool, graded, square, its core in the middle; mipmapped
uniform sampler2D eyeSat;   // Saturn: Hubble's photo of it (2019), cropped to its rings, 1024 x 484; mipmapped
uniform vec4 eyeT;   // Saturn in the window: its middle (window heights, y up), its half width (window heights; 0 not out); unused
// the brightness ramp: the scene's glyphs by their ink in the app's font, blank to @, sixteen steps
const float EYE_W = 0.62;   // (the eye's width in the clip, as EYE_CLIP's)
const int RAMP[16] = int[16](0, G_DOT, G_COLON, G_SEMI, G_EQ, G_PLUS, G_LL, G_SMALLX, G_SMALLO, G_LS, G_LE, G_HASH, G_EIGHT, G_PCT, G_DOLLAR, G_AT);
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
// the clip's colour at uv, at a mip level
vec3 eyeAt(vec2 uv, float lod) { return textureLod(eyeVid, uv, lod).rgb; }
// the space's light at q (window heights from the pupil's middle), averaged over a patch px across (window
// heights): the galaxy turning slowly, the corners of its photo faded off, its core brighter on the kick;
// Saturn in front of it (nearer), its dark see-through (the gaps in its rings, the space round it) but not
// its disc (its shadowed bands)
vec3 skyAt(vec2 q, float px, out float sat) {
  float L = eyeS.x;
  vec2 g = q / L - eyeS.yz;
  // seen at a slant (its disc tipped 50 degrees away, about an axis turned 25 degrees), turning
  g = vec2(0.906 * g.x + 0.423 * g.y, -0.423 * g.x + 0.906 * g.y);
  g.y /= 0.64;
  float ang = 0.3 + time * 0.02, ca = cos(ang), sa = sin(ang);
  g = vec2(ca * g.x - sa * g.y, sa * g.x + ca * g.y);
  float r = length(g);
  vec3 c = textureLod(eyeSky, vec2(0.5 + 0.5 * g.x, 0.5 - 0.5 * g.y), log2(max(1.0, px * 512.0 / (0.64 * L)))).rgb;
  c *= smoothstep(1.0, 0.6, r) * (1.0 + 0.7 * eyeZ.z * exp(-r * 8.0));
  sat = 0.0;
  if (eyeT.z > 0.0) {
    vec2 d = (q + eyeP.xy - eyeT.xy) / eyeT.z, su = vec2(0.5 + 0.5 * d.x, 0.5 - 0.5 * d.y * (1024.0 / 484.0));
    if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) {
      vec3 sc = textureLod(eyeSat, su, log2(max(1.0, px * 512.0 / eyeT.z))).rgb;
      float disc = 1.0 - smoothstep(0.94, 1.0, length((su * vec2(1024.0, 484.0) - vec2(512.0, 242.0)) / vec2(187.0, 172.0)));
      // (faded in as it grows, from about 3 rows tall to 6: smaller, its rings can't be drawn in cells and it
      // read as a little grey box, not a planet)
      sat = max(smoothstep(0.03, 0.14, luma(sc)), disc) * smoothstep(3.0 * ch, 6.5 * ch, eyeT.z);
      c = mix(c, sc, sat);
    }
  }
  return c;
}
// The near stars, between you and the galaxy: their places grow as the zoom to the 1.3 (faster than the
// window), so as the dive goes in they come out from the middle and fly out past you, each drawn along the
// way it's going (a stroke from where it was a moment ago) while it's quick; a sparse two layers, each
// shown once its stars are a few cells apart. Whether q (window heights from the pupil's middle) is on
// one; if so it's drawn.
bool nearStar(vec2 q, float open, float kick) {
  float Ln = 0.6 * pow(max(eyeD.w, 1e-3), 1.3), sp = max(eyeD.z, 0.0);
  vec2 sk = vec2(cw / ch, 1.0), nq = q / Ln;
  for (int i = 0; i < 2; i++) {
    float fi = float(i), gs = 0.3 * pow(0.6, fi);
    float vis = smoothstep(2.0, 4.0, gs * Ln / ch);
    if (vis <= 0.0) continue;
    vec2 gv = gs * sk, kk = floor(nq / gv);
    float hh = h2(kk + fi * 13.0 + 91.0);
    if (hh > 0.1) continue;
    vec2 at = (kk + 0.5 + 0.8 * (vec2(h2(kk + 5.3 + fi), h2(kk + 8.1 + fi)) - 0.5)) * gv;
    // its way: from where it was a moment ago to where it is (the cell's distance to that, in cells)
    vec2 tail = at * exp(-0.12 * sp), e = at - tail, d = nq - tail;
    float k = clamp(dot(d, e) / max(dot(e, e), 1e-9), 0.0, 1.0);
    vec2 off = (d - e * k) * Ln / vec2(cw, ch);
    if (abs(off.x) > 0.5 || abs(off.y) > 0.5) continue;
    // (the head bright, a stroke along its way while it's quick; its trail a fading line of dots)
    bool head = length((nq - at) * Ln / vec2(cw, ch)) < 0.75;
    int g = k > 0.5 ? G_MID : G_DOT;
    if (head) {
      float a = mod(degrees(atan(at.y, at.x)), 180.0);
      g = length(e) * Ln > 1.5 * ch ? (a < 22.5 || a >= 157.5 ? G_DASH : a < 67.5 ? G_SLASH : a < 112.5 ? G_BAR : G_BACK) : hh < 0.04 ? G_STAR : G_PLUS;
    }
    put(g, clamp((head ? 1.0 : 0.25 + 0.5 * k) * vis * open * (0.85 + 0.3 * kick), 0.0, 1.0), mix(vec3(0.75, 0.82, 1.0), vec3(1.0), k));
    return true;
  }
  return false;
}
// space, as the pupil holds it: photos (see skyAt) drawn as the eye is, a glyph by how bright it is there
// (its own light, so the dark stays dark, lifted a little against what's round it), its colour richer, and
// under each glyph a tile of its light, stronger than the eye's (the galaxy's arms are in its light more
// than its edges). The galaxy's glyphs follow its light a little smoothed (2.5 cells), so they run along
// its arms rather than flicker with each knot of stars; Saturn's its own, sharp, its bands in them. The
// strong edges as strokes along them (Saturn's rings and limb; on the galaxy only the strongest). In the
// dark the stars in layers (each a grid, one at most to a square, shown once they're more than a cell and
// a half apart: they spread as it dives in, finer ones coming out), twinkling. S the cell's middle in the
// window, P the pupil's middle, edge how far in from the pupil's rim (window heights)
void space(vec2 S, vec2 P, float edge) {
  front = 0.0;   // (the furthest thing)
  float kick = eyeZ.z;
  // (out of the pupil's dark as it's drawn bigger; dimmer just inside its rim)
  float open = smoothstep(1.1, 3.0, eyeZ.x) * smoothstep(0.0, 3.0 * ch, edge);
  vec2 q = S - P;
  float sat, sat2, sat3, sat4;   // (how much of each sample is Saturn)
  vec3 c = skyAt(q, ch, sat);
  float lumF = luma(c), lum = mix(luma(skyAt(q, 1.8 * ch, sat2)), lumF, sat), base = luma(skyAt(q, 12.0 * ch, sat3)) + 0.004;
  float v = mix(pow(clamp(1.4 * lum + 0.6 * (lum - base), 0.0, 1.0), 1.3), pow(clamp(0.8 * lumF + 0.4 * (lumF - base), 0.0, 1.0), 1.8), sat);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float chroma = (mx - mn) / (mx + 0.04) * sqrt(clamp(mx / 0.8, 0.0, 1.0));
  v = max(v, 0.8 * chroma * smoothstep(0.03, 0.1, lumF));
  // the edges: the light's slope across the cell's neighbours, the strong ones drawn as strokes
  float lR = luma(skyAt(q + vec2(cw, 0.0), ch, sat4)), lL = luma(skyAt(q - vec2(cw, 0.0), ch, sat4));
  float lU = luma(skyAt(q + vec2(0.0, ch), ch, sat4)), lD = luma(skyAt(q - vec2(0.0, ch), ch, sat4));
  vec2 gr = vec2(lR - lL, lU - lD) / (base + 0.06) * 0.5;
  float mag = length(gr) * smoothstep(0.04, 0.12, lumF), thr = mix(0.55, 0.3, sat);
  float a = mod(degrees(atan(gr.y, gr.x)) + 90.0, 180.0);   // (the edge's own way, y up)
  // (the tile's strength in its alpha, by how bright it is there, so in the theme's colours its ink
  // follows the galaxy's light rather than filling its disc)
  float ta = clamp(lumF * 2.5, 0.0, 1.0);
  tileC = min(c * 0.6 / max(ta, 0.05), vec3(1.0)); tileA = ta * open;
  if (nearStar(q, open, kick)) return;
  if (v > 0.06 || mag > thr) {
    int gi = mag > thr ? (a < 22.5 || a >= 157.5 ? G_DASH : a < 67.5 ? G_SLASH : a < 112.5 ? G_BAR : G_BACK) : RAMP[clamp(int(v * 15.0 + 0.5), 0, 15)];
    // (the galaxy's glyphs richer than its light, so its arms read blue and its knots pink)
    vec3 cg = max(mix(vec3(lumF), c, mix(1.35, 1.0, sat)), 0.0);
    vec3 col = clamp(cg * 1.7 + 0.8 * chroma * cg / (mx + 1e-3), 0.0, 1.0);
    put(gi, clamp(0.82 + 0.14 * kick, 0.0, 1.0) * open, col);
    return;
  }
  // the stars: their brightness by a power law, so a few stand out and most are a fine dust; twinkling
  // with the loudness (a layer's squares as many cells across as up; in window heights, so they spread as
  // the galaxy's drawn bigger)
  float L = eyeS.x;
  vec2 sq = q / L, s = vec2(cw, ch) / L, sk = vec2(cw / ch, 1.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i), gs = 0.5 * pow(0.45, fi);
    float vis = smoothstep(1.5, 3.0, gs / s.y);
    if (vis <= 0.0) continue;
    vec2 gv = gs * sk, kk = floor(sq / gv);
    float hh = h2(kk + fi * 31.0 + 7.0);
    if (hh > 0.3) continue;
    vec2 sp = (kk + 0.5 + 0.8 * (vec2(h2(kk + 3.1 + fi), h2(kk + 9.7 + fi)) - 0.5)) * gv;
    if (abs(sq.x - sp.x) < 0.5 * s.x && abs(sq.y - sp.y) < 0.5 * s.y) {
      float b = min(4.0, 0.22 * pow(max(h2(kk + 51.0 + fi), 1e-3), -0.83));
      float tw = 0.75 + 0.25 * sin(time * (0.8 + 2.4 * hh) + hh * 60.0) * (0.5 + glow) + 0.3 * kick;
      int gl = b < 0.4 ? G_DOT : b < 0.75 ? G_MID : b < 1.4 ? G_PLUS : b < 2.6 ? G_STAR : G_SPARK;
      put(gl, clamp((0.35 + 0.3 * b) * tw * vis * open, 0.0, 1.0), starTint(h2(kk + 77.0 + fi)));
      return;
    }
  }
  put(0, 0.0, vec3(0.0));
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = grid.y - 1.0 - cell.y, H = view.y, aspect = view.x / view.y;
  cw = cellPx.x / H; ch = cellPx.y / H;
  vec2 S = vec2((cell.x + 0.5) * cw, 1.0 - (row + 0.5) * ch);
  day = false;   // (night whatever the theme, as space)
  float Z = eyeZ.x;
  vec2 P = eyeP.xy;
  // the point of the window this cell shows (drawn Z times bigger about the pupil as it dives in)
  vec2 p = P + (S - P) / Z;
  // (the dive: the pupil a window onto space; across its rim the space shows through a cell at a time)
  float inF = eyeD.y - length(S - P), band = 1.5 * ch;
  if (eyeD.y > 0.0 && inF > 0.0 && (inF > band || h2(cell + 5.0) < inF / band)) { space(S, P, inF); return; }
  if (eyeP.w < 0.5) { put(0, 0.0, vec3(0.0)); return; }
  // the clip's point there; nothing past its edges (the dark round the eye)
  vec2 uv = vec2(eyeF.x + (p.x - eyeL.z) * eyeF.z / eyeF.w, eyeF.y - (p.y - eyeL.w) * eyeF.z);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { put(0, 0.0, vec3(0.0)); return; }
  float lod = max(0.0, eyeL.x - log2(Z)), blur = max(1.0, eyeL.y - log2(Z));
  vec3 c = eyeAt(uv, lod);
  // (falling in: the iris smeared toward the pupil by how fast the dive's going, so it streaks outward)
  float fast = clamp(eyeD.z, 0.0, 1.2);
  if (fast > 0.05) {
    for (int i = 1; i <= 3; i++) {
      vec2 pi = P + (p - P) * (1.0 - 0.06 * fast * float(i));
      c += eyeAt(vec2(eyeF.x + (pi.x - eyeL.z) * eyeF.z / eyeF.w, eyeF.y - (pi.y - eyeL.w) * eyeF.z), lod);
    }
    c *= 0.25;
  }
  float lum = luma(c), base = luma(eyeAt(uv, blur)) + 0.004;
  // the level: the light's slow slope taken out (each cell against what's round it), mostly; spread over
  // the ramp as the clip's own levels lie (the skin about the middle, the white and the glints the top)
  float rel = min(lum / base * 0.5, 1.2) * 0.75 + lum * 0.29;
  float v = pow(clamp((rel - 0.17) / 0.56, 0.0, 1.0), 1.35);
  // (colour draws too: the iris's brown is dark, but rich)
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float chroma = (mx - mn) / (mx + 0.04) * sqrt(clamp(mx / 0.8, 0.0, 1.0));
  // the eye in the dark round it, opening a little on the kick and on the drop
  float hw = 0.5 * EYE_W * eyeF.w / eyeF.z;   // (the eye's half width in the window)
  vec2 vq = vec2((S.x - eyeL.z) / (1.45 * hw), (S.y - eyeL.w) / (1.0 * hw));
  float vig = pow(clamp(1.15 + 0.08 * eyeZ.z + 0.25 * eyeZ.w - dot(vq, vq), 0.0, 1.0), 0.7);
  // (and toward the clip's own edges, so they never show)
  vig *= smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x) * smoothstep(0.0, 0.06, uv.y) * smoothstep(1.0, 0.94, uv.y);
  v = max(v, 1.5 * chroma) * vig;
  // the edges: the level's slope across the cell's neighbours; the strong ones drawn as strokes
  vec2 du = vec2(cw * eyeF.z / eyeF.w, ch * eyeF.z) / Z;
  float lR = luma(eyeAt(uv + vec2(du.x, 0.0), lod)), lL = luma(eyeAt(uv - vec2(du.x, 0.0), lod));
  float lU = luma(eyeAt(uv - vec2(0.0, du.y), lod)), lD = luma(eyeAt(uv + vec2(0.0, du.y), lod));
  vec2 gr = vec2(lR - lL, lU - lD) / base * 0.5;
  float mag = length(gr) * vig;
  float a = mod(degrees(atan(gr.y, gr.x)) + 90.0, 180.0);   // (the edge's own way, y up)
  int gi = mag > 0.2 ? (a < 22.5 || a >= 157.5 ? G_DASH : a < 67.5 ? G_SLASH : a < 112.5 ? G_BAR : G_BACK) : RAMP[clamp(int(v * 15.0 + 0.5), 0, 15)];
  // (falling fast, more and more of the iris's cells drawn as strokes along the way out from the pupil)
  if (fast > 0.3 && v > 0.12 && h2(cell + 21.0) < 0.7 * smoothstep(0.3, 0.9, fast)) {
    float ra = mod(degrees(atan(S.y - P.y, S.x - P.x)), 180.0);
    gi = ra < 22.5 || ra >= 157.5 ? G_DASH : ra < 67.5 ? G_SLASH : ra < 112.5 ? G_BAR : G_BACK;
  }
  // its colour: the clip's own, lifted (glyphs are thin), and the brown's richness; a faint tile of it
  // under the glyph; a few cells shimmering with the hats
  vec3 col = clamp(c * (1.55 * vig) + 0.8 * chroma * c / (mx + 1e-3) * vig, 0.0, 1.0);
  float sh = step(0.985 - 0.04 * wind, h2(cell + floor(time * 12.0)));
  // (its strength in its alpha, not its colour, so in the theme's colours the dark stays the theme's dark)
  tileC = c * 0.34; tileA = vig * smoothstep(0.0, 0.15, lum);
  put(gi, clamp(0.82 + 0.14 * eyeZ.z + 0.25 * eyeZ.w + 0.3 * sh, 0.0, 1.0), col);
}`;
const MAINS = { lake: LAKE, sea: SEA, fire: FIRE, snow: SNOW, city: CITY, garden: GARDEN, falls: FALLS, halloween: HALLOWEEN, sharks: SHARKS, festival: FESTIVAL, koi: KOI, space: SPACE, eye: EYE };

// The glyphs, each from the sheet, over the paper. In its own colours: each in its colour, on a
// night sky (darkest overhead) or on the day's paper; or in the theme's: its ink in the theme's
// colour on its background. k: how strongly it shows (A's strength, in the theme's colours).
const PAINT = `#version 300 es
precision highp float;
uniform highp usampler2D cells;
uniform sampler2D sheet, sprite;
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
// the pixel layer (see PIX): its atlas; how many of its pictures are up; each one's place (CSS pixels:
// x, y, w, h), its frame in the atlas (texels: x, y, w, h), and whether it's flipped, how opaque, how
// near (it draws over a cell as near or further: see LIB's front), how much of its own colour it keeps
// at night (0 the night's tint all through); the show's two colours, the kick, the hats
uniform sampler2D pixAt;
uniform int pixN;
uniform vec4 pixR[16], pixU[16], pixF[16];
uniform vec3 pixC, pixC2;
uniform float pixK, pixH;
// the decode (a scene change): the window's picture before it; the wave: where it starts (CSS pixels),
// how long ago (s), on (1); how many glyphs the sheet has, to flicker through
uniform sampler2D before;
uniform vec4 wave;
uniform float glyphs;
uniform float idle;      // (1: the scenery getting ready, nothing to show yet: the field of glyphs)
out vec4 o;
uint whu(uvec2 q) { q *= uvec2(1597334673u, 3812015801u); return (q.x ^ q.y) * 1597334673u; }
float wh2(vec2 q) { return float(whu(uvec2(ivec2(floor(q)) + 32768))) / 4294967295.0; }
vec3 boat(vec4 sp) { return own > 0.5 ? sp.rgb * tint : mix(bg, fg, dot(sp.rgb, vec3(0.3, 0.55, 0.15))); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, H - gl_FragCoord.y) / dpr;
  vec2 cell = floor(p / cellPx);
  // the scenery getting ready (its first scene still compiling): glyphs flickering in the theme's ink,
  // more of them and brighter where a slow swell passes out from the middle, over a faint grid of dots,
  // the grid the scene will decode into
  if (idle > 0.5) {
    vec2 fr = (p - cell * cellPx) / cellPx;
    float r = length((cell + 0.5) * cellPx - 0.5 * grid * cellPx) / (H / dpr);
    float swell = 0.5 + 0.5 * sin(r * 9.0 - time * 2.4);
    float flick = floor(time * 8.0 + wh2(cell + 3.0) * 8.0);
    float gI = 1.0 + floor(wh2(cell + flick * 2.7) * (glyphs - 1.0));
    float gc = step(0.93 - 0.2 * swell, wh2(cell + flick * 1.3)) * texture(sheet, (vec2(mod(gI, perRow), floor(gI / perRow)) + fr) * slot / sheetSize).a;
    float dotk = mod(cell.x, 2.0) < 0.5 && mod(cell.y, 2.0) < 0.5 ? smoothstep(0.16, 0.05, length(fr - 0.5)) : 0.0;
    o = vec4(mix(bg, fg, max(gc * (0.12 + 0.4 * swell), dotk * 0.2)), 1.0);
    return;
  }
  ivec2 at = ivec2(int(cell.x), int(grid.y) - 1 - int(cell.y));
  // (the cell unpacked: its glyph, ink and tone; its colour; its tile)
  uvec4 u = texelFetch(cells, at, 0);
  vec4 c = vec4(float(u.x & 255u), float((u.x >> 8) & 255u) / 255.0, float((u.x >> 16) & 255u) / 255.0, 1.0);
  vec3 cc = vec3(float(u.y & 255u), float((u.y >> 8) & 255u), float((u.y >> 16) & 255u)) / 255.0;
  vec4 tl = vec4(float(u.z & 255u), float((u.z >> 8) & 255u), float((u.z >> 16) & 255u), float(u.z >> 24)) / 255.0;
  float gi = c.r;
  vec2 f = (p - cell * cellPx) / cellPx;
  float cov = gi > 0.5 ? texture(sheet, (vec2(mod(gi, perRow), floor(gi / perRow)) + f) * slot / sheetSize).a : 0.0;
  // (a tile fills its cell, but for a hair along its top and left where there's a grid drawn: the
  // grid's in the water, so a solid tile (a shark's body) covers it and reads as one form, not a mosaic)
  bool rim = gridK > 0.0 && tl.a < 0.7 && (f.x * cellPx.x * dpr < 1.0 || f.y * cellPx.y * dpr < 1.0);
  vec3 col;
  if (own > 0.5) {
    float y = p.y / (H / dpr);
    vec3 paper = mix(top, low, smoothstep(0.0, horizon, y)) + toneC * c.b;
    if (light.w > 0.0) paper += vec3(0.32, 0.13, 0.03) * light.w * pow(max(0.0, 1.0 - length((p - light.xy) * vec2(0.8, 1.0)) / light.z), 2.0);
    if (light2.w > 0.0) paper += light2C * light2.w * pow(max(0.0, 1.0 - length((p - light2.xy) * vec2(0.8, 1.0)) / light2.z), 2.0);
    if (rim) paper = mix(paper, night > 0.5 ? paper + 0.05 : paper * 0.9, gridK);
    else paper = mix(paper, tl.rgb, tl.a);
    col = mix(paper, cc, cov * c.g);
  // (in the theme's colours at night, each glyph as bright as it is in the scenery's own: its shadows
  // stay dark, its lights full; a tile a faint block of the theme's ink)
  } else {
    vec3 under = rim ? mix(bg, fg, 0.05 * gridK) : mix(bg, fg, 0.22 * tl.a * min(1.0, k));
    col = mix(under, fg, cov * min(1.0, c.g * k) * (night > 0.5 ? clamp(dot(cc, vec3(0.3, 0.55, 0.15)) * 2.2, 0.0, 1.0) : 1.0));
  }
  // the pixel layer: its pictures in pixels over the glyphs, the later over the earlier, each only over
  // cells as near as it or further; a pixel's light in its alpha (255 plain, 254 lit by the kick at
  // night, 253 the show's colour at night, 252 shimmering with the hats at night, 251 its own light (the
  // moon: not the night's tint), under 250 see-through)
  float cellD = float(u.w & 255u) / 255.0;
  for (int i = 0; i < 16; i++) {
    if (i >= pixN) break;
    vec4 R = pixR[i], U = pixU[i], F = pixF[i];
    vec2 q = (p - R.xy) / R.zw;
    if (q.x < 0.0 || q.x >= 1.0 || q.y < 0.0 || q.y >= 1.0 || cellD > F.z + 0.01) continue;
    vec2 t = floor(q * U.zw);
    if (F.x > 0.5) t.x = U.z - 1.0 - t.x;
    vec4 sx = texelFetch(pixAt, ivec2(U.xy + t), 0);
    float a8 = floor(sx.a * 255.0 + 0.5);
    if (a8 < 1.0) continue;
    vec3 c = sx.rgb;
    bool lit = night > 0.5 && a8 > 251.5 && a8 < 254.5;
    if (lit && a8 > 253.5) c = c * (0.3 + 0.8 * pixK) + pixC2 * 0.3 * pixK;
    else if (lit && a8 > 252.5) c = mix(c, pixC, 0.85) * (0.85 + 0.4 * pixK);
    else if (lit) c *= 0.75 + 0.45 * pixH * (0.5 + 0.5 * sin(time * 31.0 + t.x * 1.7)) + 0.3 * pixK;
    vec3 sc = own > 0.5 ? (lit || (a8 > 250.5 && a8 < 251.5) ? c : c * mix(tint, vec3(1.0), F.w)) : mix(bg, fg, dot(c, vec3(0.3, 0.55, 0.15)));
    col = mix(col, sc, (a8 > 249.5 ? 1.0 : a8 / 250.0) * F.y);
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
  // the decode: the new scene spreading from the toaster, a cell at a time, each flickering through
  // glyphs as the wave reaches it (bright at the wave's edge, settling into the new scene's colours),
  // the picture before it beyond the wave
  if (wave.w > 0.5) {
    float Hc = H / dpr, d = length((cell + 0.5) * cellPx - wave.xy) / Hc;
    float pr = (wave.z - d * 0.5 - 0.07 * wh2(cell + 7.0)) / 0.1;
    vec3 old = texelFetch(before, ivec2(gl_FragCoord.xy), 0).rgb;
    if (pr < 0.0) col = old;
    else if (pr < 1.0) {
      // (a glyph in most of the cells at a time, not all, so the wave breathes; each in the old scene's
      // colour, lightened, at the wave's edge and the new one's as it settles)
      float flick = floor(time * 24.0);
      float g2 = 1.0 + floor(wh2(cell + flick * 3.1) * (glyphs - 1.0));
      float cov2 = step(0.3, wh2(cell + flick * 1.7 + 11.0)) * texture(sheet, (vec2(mod(g2, perRow), floor(g2 / perRow)) + f) * slot / sheetSize).a;
      vec3 ink2 = mix(mix(old, vec3(1.0), 0.6), own > 0.5 ? max(cc, vec3(0.45)) : fg, pr);
      col = mix(mix(old, col, pr), ink2, cov2 * (1.0 - 0.4 * pr));
    }
  }
  o = vec4(col, 1.0);
}`;

// The koi pond's koi in pixels, where the cells couldn't carry them (a skin of glyphs read as noise,
// their fins as scratches): the paint pass's own copy for the koi pond (PAINT_KOI) draws them over the
// water a pixel at a time, the pixel layer's pixels (koiPx, CSS pixels; 0 the window's own), under the
// lily pads (a cell in front) and under what's on the water (a cell 0.75 near: the koi under it, its
// glyph drawn again over them), each over the ones after it. Their shapes are the scene's (koiAt, the
// same but for the dorsal fin's width); their skins in a few tones, as a pixel picture's: lit along the
// back toward the sun, shaded down the far side, a pixel's rim darker still (the ogons' metal shining
// along the back, glinting); the patterns' patches sharp-edged; dark beads of eyes, a glint in each; the
// dorsal fin a line down the back; the fins and tails see-through films, their rays drawn, their edges
// paler. By day their shadows on the bottom, in pixels too.
const KOI_PX = `
uniform vec2 koiS[65];
uniform vec4 koiK[5];
uniform vec4 koiB[5];
uniform float koiPx;
const vec2 KSUN = vec2(-0.6, 0.8);
uint khu(uvec2 q) { q *= uvec2(1597334673u, 3812015801u); return (q.x ^ q.y) * 1597334673u; }
float kh2(vec2 q) { return float(khu(uvec2(ivec2(floor(q)) + 32768))) / 4294967295.0; }
float kvn2(vec2 q) { vec2 i = floor(q), e = fract(q), w = e * e * (3.0 - 2.0 * e); return mix(mix(kh2(i), kh2(i + vec2(1, 0)), w.x), mix(kh2(i + vec2(0, 1)), kh2(i + vec2(1, 1)), w.x), w.y); }
float kbump(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }
vec3 krgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
// (where on koi fish p is, as the scene's koiAt has it; how far in from the edge of what it's on, in
// pixels (kEdge); its body's half width there (kW))
float kS = 0.0, kSide = 0.0, kR = 0.0, kRd = 0.0, kRidge = 0.0, kEdge = 0.0, kW = 0.0;
vec2 kLf = vec2(0.0, 1.0);
// Coverage and shadows only need the body; leave fins and tail out of these repeated samples.
int koiBodyAt(int fish, vec2 p, float px) {
  vec4 K = koiK[fish];
  float L = K.y, best = 9.0, bl = 0.0, s = 9.0, fk = float(fish);
  vec2 pt = vec2(1.0, 0.0);
  for (int i = 1; i <= 12; i++) {
    vec2 q = koiS[fish * 13 + i], ba = koiS[fish * 13 + i - 1] - q, pa = p - q;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
    if (dl < best) { best = dl; s = i == 12 && dot(pa, ba) < 0.0 ? 9.0 : (float(i) - h) / 12.0; bl = sign(ba.x * pa.y - ba.y * pa.x) * dl; pt = normalize(-ba); }
  }
  kS = s; kSide = 0.0; kRidge = 0.0; kLf = vec2(pt.y, -pt.x);
  if (s > 1.0) return 0;
  float wm = 0.115 * L, ab = abs(bl), sd = sign(bl);
  float x = 1.0 - min(1.0, s / 0.3), w = mix(wm * sqrt(1.0 - x * x), 0.33 * wm, smoothstep(0.45, 0.8, s));
  kW = w;
  if (ab < w && s < 0.8) {
    kSide = bl / w; kEdge = (w - ab) / px; kRidge = s > 0.32 && s < 0.62 && ab < 0.6 * px ? 1.0 : 0.0;
    return 1;
  }
  return 0;
}
int koiAt(int fish, vec2 p, float px) {
  vec4 K = koiK[fish];
  float L = K.y, best = 9.0, bl = 0.0, s = 9.0, fk = float(fish);
  vec2 pt = vec2(1.0, 0.0);
  for (int i = 1; i <= 12; i++) {
    vec2 q = koiS[fish * 13 + i], ba = koiS[fish * 13 + i - 1] - q, pa = p - q;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
    if (dl < best) { best = dl; s = i == 12 && dot(pa, ba) < 0.0 ? 9.0 : (float(i) - h) / 12.0; bl = sign(ba.x * pa.y - ba.y * pa.x) * dl; pt = normalize(-ba); }
  }
  kS = s; kSide = 0.0; kRidge = 0.0; kLf = vec2(pt.y, -pt.x);
  if (s > 1.0) return 0;
  float wm = 0.115 * L, ab = abs(bl), sd = sign(bl);
  float x = 1.0 - min(1.0, s / 0.3), w = mix(wm * sqrt(1.0 - x * x), 0.33 * wm, smoothstep(0.45, 0.8, s));
  kW = w;
  if (ab < w && s < 0.8) {
    kSide = bl / w; kEdge = (w - ab) / px; kRidge = s > 0.32 && s < 0.62 && ab < 0.6 * px ? 1.0 : 0.0;
    return 1;
  }
  for (int f = 0; f < 2; f++) {
    float at = f == 0 ? 0.24 : 0.52, spread = sd > 0.0 ? K.z : K.w;
    float an = f == 0 ? 0.5 + 0.75 * spread + 0.08 * sin(time * 1.3 + fk * 2.3 + sd) : 0.5 + 0.2 * spread;
    float a = (f == 0 ? 0.1 : 0.048) * L, b = (f == 0 ? 0.052 : 0.024) * L;
    vec2 lp = vec2((s - at) * L, ab - (f == 0 ? 0.75 : 0.5) * wm), d = vec2(cos(an), sin(an)), c = lp - d * 0.9 * a;
    float e1 = dot(c, d) / a, e2 = (d.x * c.y - d.y * c.x) / b, e = e1 * e1 + e2 * e2;
    if (e < 1.0) {
      float th = atan(lp.y, lp.x);
      kSide = sd; kR = length(lp) / (1.9 * a); kEdge = (1.0 - sqrt(e)) * b / px;
      kRd = abs(th - 0.36 * round(th / 0.36)) * length(lp);
      return 2;
    }
  }
  if (s > 0.76) {
    float tx = (s - 0.76) / 0.24, span = wm * (0.3 + 1.1 * pow(tx, 0.55)) * (1.0 + 0.05 * sin(time * 2.2 + tx * 5.0 + fk));
    float end = 0.62 + 0.38 * pow(min(1.0, ab / (1.4 * wm)), 0.8);
    if (ab < span && tx < end) {
      vec2 v = p - koiS[fish * 13 + 9];
      float th = atan(pt.x * v.y - pt.y * v.x, dot(pt, v));
      kSide = bl / span; kR = tx; kEdge = min(span - ab, (end - tx) * 0.24 * L) / px;
      kRd = abs(th - 0.28 * round(th / 0.28)) * length(v);
      return 3;
    }
  }
  return 0;
}
// (its colours where it is, as the scene's koiSkin has them)
vec3 koiBase(int kind, float s, float side, float seed) {
  if (kind == 3) return krgb(242.0, 194.0, 76.0);
  if (kind == 4) return krgb(244.0, 132.0, 42.0);
  vec2 q = vec2(s * 7.0, side * 1.3) + seed * 9.7;
  float n = kvn2(q) + 0.32 * kbump(s, 0.13, 0.055) - 0.35 * kbump(s, 0.245, 0.035) - (s < 0.045 ? 1.0 : 0.0);
  bool hi = n > 0.52 && abs(side) < 0.92;
  vec3 white = krgb(246.0, 243.0, 234.0), red = krgb(226.0, 70.0, 40.0), black = krgb(30.0, 29.0, 34.0);
  if (kind == 1) return hi ? red : kvn2(q * 1.4 + 31.0) > 0.45 ? black : white;
  if (kind == 2 && !hi && s > 0.22 && kvn2(vec2(s * 18.0, side * 3.0) + 51.0) > 0.74) return black;
  return hi ? red : white;
}
// (a colour in one of its tones: 0 the rim, 1 in shade (cooler), 2 between, 3 lit, 4 the highlight)
vec3 ktone(vec3 c, int t) {
  bool dark = dot(c, vec3(0.3, 0.55, 0.15)) < 0.3;
  if (t == 0) return dark ? c * 0.6 : c * vec3(0.52, 0.56, 0.66);
  if (t == 1) return c * vec3(0.76, 0.8, 0.88);
  if (t == 2) return c * vec3(0.9, 0.92, 0.95);
  if (t == 3) return c;
  return mix(c, vec3(1.0, 0.99, 0.94), dark ? 0.14 : 0.42);
}
vec3 koiFinC(int kind, float r) {
  if (kind == 3) return krgb(250.0, 214.0, 120.0);
  if (kind == 4) return krgb(250.0, 162.0, 82.0);
  if (kind == 1) return mix(krgb(40.0, 38.0, 44.0), krgb(238.0, 238.0, 234.0), smoothstep(0.3, 0.55, r));
  return krgb(244.0, 242.0, 236.0);
}
// (what of koi fish shows at p: its colour, and how opaque, 0 nothing)
vec4 koiPix(int fish, vec2 p, float px) {
  int what = koiAt(fish, p, px);
  if (what == 0) return vec4(0.0);
  int kind = int(koiK[fish].x + 0.5);
  float L = koiK[fish].y, s = kS, side = kSide;
  if (what == 1) {
    vec2 e0 = koiS[fish * 13 + 1], ed = normalize(koiS[fish * 13] - koiS[fish * 13 + 2]), el = vec2(-ed.y, ed.x) * 0.055 * L;
    for (int j = 0; j < 2; j++) {
      vec2 d = (p - e0 - (j == 0 ? el : -el)) / px;
      if (max(abs(d.x), abs(d.y)) < 1.0) return vec4(dot(d, KSUN) > 0.4 ? krgb(120.0, 124.0, 138.0) : krgb(18.0, 16.0, 22.0), 1.0);
    }
    vec3 base = koiBase(kind, s, side, float(fish));
    float sd = clamp(side, -1.0, 1.0), li = cos(1.5 * sd) + 0.35 * sd * dot(kLf, KSUN);
    bool metal = kind >= 3, dark = dot(base, vec3(0.3, 0.55, 0.15)) < 0.3;
    int t = kEdge < 1.0 ? 0 : metal && li > 0.86 ? 4 : li > 0.74 ? 3 : li > 0.42 ? 2 : 1;
    // (the dorsal fin, seen edge on: a line down the back, darker over the white and the red, paler
    // over the black; the ogons' metal glinting a pixel at a time, now and then)
    if (kRidge > 0.5) t = dark ? 4 : 2;
    else if (metal && t >= 3 && kh2(vec2(floor(s * L / px), floor(sd * kW / px)) + floor(time * 2.5) * 7.1) > 0.992) return vec4(1.0, 1.0, 0.95, 1.0);
    return vec4(ktone(base, t), 1.0);
  }
  vec3 fc = koiFinC(kind, kR);
  float a = mix(0.62, 0.34, clamp(kR, 0.0, 1.0));
  if (kRd < 0.5 * px) { a += 0.2; fc *= 0.88; }
  if (kEdge < 1.0) { a = max(a, 0.66); fc = mix(fc, vec3(1.0), 0.3); }
  return vec4(fc, a);
}
`;
const KOI_PX_DRAW = `
  {
    float kHc = H / dpr, kp = max(koiPx, 1.0 / dpr) / kHc;
    vec2 kpk = koiPx > 0.0 ? (floor(p / koiPx) + 0.5) * koiPx : p;
    vec2 kq = vec2(kpk.x, kHc - kpk.y) / kHc;
    float gA = own > 0.5 ? cov * c.g : cov * min(1.0, c.g * k) * (night > 0.5 ? clamp(dot(cc, vec3(0.3, 0.55, 0.15)) * 2.2, 0.0, 1.0) : 1.0);
    bool kOn = false;
    // (by day their shadows on the bottom, down and to the right of each, as the scene had them)
    if (own > 0.5 && night < 0.5 && cellD < 0.8) for (int j = 0; j < 5; j++) {
      vec4 B = koiB[j];
      vec2 sq = kq - vec2(0.014, -0.02);
      if (B.z < B.x || sq.x < B.x || sq.x > B.z || sq.y < B.y || sq.y > B.w) continue;
      if (koiBodyAt(j, sq, kp) == 1) { col += vec3(-0.08, -0.056, -0.048); break; }
    }
    if (cellD < 0.8) for (int j = 4; j >= 0; j--) {
      vec4 B = koiB[j];
      if (B.z < B.x || kq.x < B.x || kq.x > B.z || kq.y < B.y || kq.y > B.w) continue;
      vec4 kc = koiPix(j, kq, kp);
      if (kc.a <= 0.0) continue;
      vec3 kcol = night > 0.5 ? kc.rgb * vec3(0.72, 0.76, 0.88) : kc.rgb;
      col = mix(col, own > 0.5 ? kcol : mix(bg, fg, dot(kcol, vec3(0.3, 0.55, 0.15))), kc.a);
      kOn = true;
    }
    if (kOn && cellD > 0.7) col = mix(col, own > 0.5 ? cc : fg, gA);
  }
`;
const PAINT_KOI = PAINT.replace('void main() {', () => KOI_PX + 'void main() {').replace('  float cellD = float(u.w & 255u) / 255.0;\n', (m) => m + KOI_PX_DRAW);

// The sharks in pixels, where the cells drew them chunky (a cell's blocks for a skin, its edges in
// steps): the paint pass's own copy for the sharks (PAINT_SHARK) draws them over the water a pixel at a
// time, the pixel layer's pixels (sharkPx, CSS pixels; 0 the window's own), the nearest over the
// others. Their shapes are the scene's (sharkAt: the same spines, widths, heads and fins); their skins
// in a few tones, as a pixel picture's: lit across the back toward the sun, falling into shade down the
// flanks, a pixel's rim darker still; the dorsal fin a ridge down the back, lit on the sun's side; the
// gill slits; eyes, a glint in each; the blacktip's black tips, the zebra shark's ridges and spots. Over
// them their skins' glyphs still, from the cells (see SHARKS: keyed to the skin, shimmering), and the
// stingray's and the jellyfish's over theirs; by day their shadows on the bottom.
const SHARK_PX = `
uniform vec2 shk[48];
uniform vec4 shkK[3];
uniform vec4 shkB[3];
uniform vec4 shkD[3];
uniform float sharkPx;
const vec2 SSUN = vec2(-0.6, 0.8);
uint shu(uvec2 q) { q *= uvec2(1597334673u, 3812015801u); return (q.x ^ q.y) * 1597334673u; }
float sh2(vec2 q) { return float(shu(uvec2(ivec2(floor(q)) + 32768))) / 4294967295.0; }
vec3 srgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
float scr(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
// (how far q is inside the triangle a b c, in its own units: below 0 outside)
float sTri(vec2 q, vec2 a, vec2 b, vec2 c) {
  float g = scr(b - a, c - a) < 0.0 ? -1.0 : 1.0;
  return min(min(g * scr(b - a, q - a) / length(b - a), g * scr(c - b, q - b) / length(c - b)), g * scr(a - c, q - c) / length(a - c));
}
// (as the scene's bodyW and spotAt)
float sBodyW(float s, float kind) {
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
bool sSpot(float s, float v, float id) {
  vec2 g = vec2(s / 0.05, v / 0.036), c = floor(g);
  vec2 o = 0.25 + 0.5 * vec2(sh2(c + id * 7.0), sh2(c + id * 7.0 + 19.0));
  return length(g - c - o) < 0.2 + 0.13 * sh2(c + id * 7.0 + 41.0);
}
// what of shark k is at p (units of the height), px a pixel there: 0 nothing, 1 its body, 2 a fin, 3
// its dorsal fin, 4 an eye, 5 a dark mark, 6 the hammerhead's head; how lit (sLit), how far along it
// and across it (sS; sV, signed, units of its length), how far in from its edge (sEdge, pixels)
float sLit = 0.0, sS = 0.0, sV = 0.0, sEdge = 0.0;
vec2 sNrm = vec2(0.0);
int sharkAtPx(int k, vec2 p, float px) {
  vec4 K = shkK[k];
  float kind = K.x, L = K.y, best = 1e9, arc = 0.0, at = 0.0, side = 1.0;
  vec2 nrm = vec2(0.0);
  for (int j = 0; j < 15; j++) {
    vec2 a = shk[k * 16 + j], ab = shk[k * 16 + j + 1] - a;
    float l = max(length(ab), 1e-6), u = clamp(dot(p - a, ab) / (l * l), 0.0, 1.0);
    vec2 d = p - a - ab * u;
    float dd = dot(d, d);
    if (dd < best) { best = dd; at = arc + u * l; side = scr(ab, d) < 0.0 ? -1.0 : 1.0; nrm = side * vec2(-ab.y, ab.x) / l; }
    arc += l;
  }
  arc = max(arc, 1e-6);
  float a = sqrt(best) / L, s = at / arc, pl = px / L;
  sS = s; sV = side * a; sNrm = nrm;
  if (kind < 0.5) {
    float r = a / 0.15, front = 0.03 * r * r, deep = 0.07 * (1.0 - 0.3 * r * r * r * r);
    if (r <= 1.0 && s >= front && s <= front + deep) {
      sEdge = min(min(s - front, front + deep - s) * arc / L, 0.15 - a) / pl;
      // (its eyes on the wing's ends)
      float em = front + 0.5 * deep;
      if (r > 0.86 && abs(s - em) * arc / px < 1.6) { sLit = 0.0; return 4; }
      sLit = (s - front) * arc / L < 0.012 ? 0.8 : 0.55 - 0.1 * r;
      return 6;
    }
  }
  float w = sBodyW(s, kind);
  if (a <= w) {
    float c = a / max(w, 1e-5);
    sEdge = (w - a) / pl;
    sLit = 0.58 - 0.3 * c * c + 0.15 * dot(nrm, SSUN) * c;
    vec2 d1 = kind < 0.5 ? vec2(0.3, 0.43) : kind < 1.5 ? vec2(0.33, 0.45) : vec2(0.35, 0.43);
    vec2 d2 = kind > 1.5 ? vec2(0.47, 0.51) : vec2(0.7, 0.745);
    vec2 gi = kind < 0.5 ? vec2(0.15, 0.25) : kind < 1.5 ? vec2(0.17, 0.27) : vec2(0.13, 0.2);
    // (its eyes: a dot each side of its head, out near its edge)
    if (kind > 0.5) {
      float es = kind < 1.5 ? 0.1 : 0.07, ea = 0.8 * sBodyW(es, kind);
      vec2 ed = vec2((s - es) * arc, (a - ea) * L) / px;
      if (dot(ed, ed) < 1.5) { sLit = 0.0; return 4; }
    }
    if (s > d1.x && s < d1.y + 0.04) {
      float ft = (s - d1.x) / (d1.y + 0.04 - d1.x), fw = 0.3 * (1.0 - ft) * (1.0 - ft) + 0.02;
      bool sunny = dot(nrm, SSUN) > 0.0;
      if (c < fw) { sLit = sunny ? 1.0 : 0.25; sEdge = min(sEdge, (fw - c) * w / pl); return kind > 0.5 && kind < 1.5 && ft > 0.55 ? 5 : 3; }
      if (!sunny && c < fw + 0.22 && ft < 0.9) sLit -= 0.22;
    }
    if (s > d2.x && s < d2.y && c < 0.4) sLit = max(sLit, 0.8);
    else if (s > gi.x && s < gi.y && c > 0.55 && fract((s - gi.x) / (gi.y - gi.x) * 5.0) < 0.3) sLit *= 0.55;
    else if (s < 0.045) sLit = max(sLit, 0.7);
    else if (kind > 1.5 && s > 0.08 && s < 0.52 && (c < 0.08 || abs(c - 0.62) < 0.06)) sLit = max(sLit, 0.82);
    else if (kind > 1.5 && s > 0.07 && sSpot(s, sV, shkD[k].y)) return 5;
    return 1;
  }
  vec2 q = vec2(s, a);
  vec4 pc = kind < 0.5 ? vec4(0.17, 0.41, 0.51, 0.23) : kind < 1.5 ? vec4(0.15, 0.42, 0.53, 0.25) : vec4(0.12, 0.31, 0.37, 0.2);
  float tip = pc.w * (side > 0.0 ? K.z : K.w);
  float fe = sTri(q, vec2(pc.x, 0.0), vec2(pc.y, 0.0), vec2(pc.z, tip));
  if (fe >= 0.0 && (kind > 1.5 || sTri(q, vec2(pc.y, 0.0), vec2(mix(pc.y, pc.z, 0.42), 0.55 * tip), vec2(pc.z, tip)) < 0.0)) {
    sEdge = fe / pl;
    sLit = 0.38 + 0.22 * (1.0 - clamp(a / max(tip, 1e-4), 0.0, 1.0));
    if (kind > 0.5 && kind < 1.5 && a > 0.66 * tip) return 5;
    if (kind > 1.5 && sSpot(s, sV, shkD[k].y)) return 5;
    return 2;
  }
  vec4 pv = kind > 1.5 ? vec4(0.43, 0.49, 0.52, 0.06) : vec4(0.57, 0.64, 0.68, 0.07);
  float pe = sTri(q, vec2(pv.x, 0.0), vec2(pv.y, 0.0), vec2(pv.z, pv.w));
  float te = kind < 1.5 ? sTri(q, vec2(0.85, 0.0), vec2(0.94, 0.0), vec2(1.0, kind < 0.5 ? 0.09 : 0.075)) : -1.0;
  if (pe >= 0.0 || te >= 0.0) {
    sEdge = max(pe, te) / pl;
    sLit = 0.36;
    return kind > 0.5 && kind < 1.5 && s > 0.95 ? 5 : 2;
  }
  return 0;
}
// (the stingray and the jellyfish, as the scene has them: sea its beats and swims, sView the window
// (CSS pixels))
uniform vec4 sea;
uniform vec2 sView;
float sh1(float x) { return sh2(vec2(x, 7.0)); }
vec2 sRayWay(float u, float asp, float lane) { return vec2(asp + 0.3 - u, lane + 0.05 * sin(u * 2.3 + 0.7) + 0.02 * sin(u * 5.1)); }
// (as the scene's rayAt: 0 nothing, 1 its disc, 2 its wings' thin edges, 3 its tail, 4 an eye, 5 a
// spiracle, 6 a pelvic fin)
int sRayAt(vec2 p, float u, float asp, float lane, float Lb, float Wb, float T, float px, out float al, out float ac, out float r, out vec2 td) {
  vec2 c = sRayWay(u, asp, lane), d = normalize(c - sRayWay(u - 0.01, asp, lane)), sd = vec2(-d.y, d.x), q = p - c;
  al = dot(q, d) / Lb; ac = dot(q, sd) / Wb; r = 9.0; td = -d;
  float edge = (1.0 + 0.09 * smoothstep(0.35, 1.0, abs(ac)) * sin(7.0 * al + time * 2.6 + (ac > 0.0 ? 0.0 : 1.4))) * (1.0 + 0.04 * sin(time * 1.5));
  float wt = -0.08, span = al > wt ? pow(clamp((1.0 - al) / (1.0 - wt), 0.0, 1.0), 0.72) : pow(clamp((al + 1.0) / (wt + 1.0), 0.0, 1.0), 0.9);
  span = min(span * edge, 0.98);
  r = max(abs(ac) / max(span, 1e-3), abs(al) * 0.9);
  if (abs(al) < 1.0 && abs(ac) < span) {
    if (abs(al - 0.42) < 0.09 && abs(abs(ac) - 0.16) < 0.06) return 4;
    if (abs(al - 0.27) < 0.06 && abs(abs(ac) - 0.21) < 0.05) return 5;
    return r > 0.86 ? 2 : 1;
  }
  if (length(vec2((al + 0.97) * Lb, (abs(ac) - 0.17) * Wb)) < 0.17 * Lb) return 6;
  if (al < -0.8) {
    float best = 9.0, bt = 0.0;
    vec2 prev = c - d * Lb;
    for (int i = 1; i <= 10; i++) {
      float t = float(i) / 10.0, back = Lb + t * T;
      vec2 w = sRayWay(u - back, asp, lane), wd = normalize(sRayWay(u - back + 0.01, asp, lane) - w);
      w += vec2(-wd.y, wd.x) * 0.02 * t * sin(t * 7.0 - time * 2.2);
      vec2 pa = p - prev, ba = w - prev;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0), dl = length(pa - ba * h);
      if (dl < best) { best = dl; bt = (float(i - 1) + h) / 10.0; td = normalize(ba); }
      prev = w;
    }
    if (best < mix(0.12 * Lb, 0.02 * Lb, bt) + 0.6 * px) { r = bt; return 3; }
  }
  return 0;
}
// the stingray in pixels: its disc sandy gold, domed a little toward the light in four tones, its body
// raised down its middle, its wings' thin edges paler and rimmed; electric blue spots; its eyes and
// spiracles; its tail banded blue. (shadow: only whether it's there.) rPlain: the pixel's its plain skin
// (its disc, its wings' edges, a pelvic fin: not a spot, an eye or a spiracle), for its glyph
bool rPlain = false;
vec4 rayPix(vec2 p, float px, float asp, bool shadow) {
  rPlain = false;
  float wide = clamp((asp - 0.56) / 1.22, 0.0, 1.0), sz = min(1.0, 0.55 + 0.45 * asp);
  float Lb = 0.075 * sz, Wb = 0.105 * sz, T = 0.26 * sz, lane = mix(0.84, 0.8, wide);
  float u = mod(time * 0.011 + sea.y * 0.006 + 0.9, asp + 0.65 + T);
  vec2 c0 = sRayWay(u, asp, lane);
  if (length(p - c0) > Lb + Wb + T + 0.06) return vec4(0.0);
  float al, ac, r;
  vec2 td;
  int what = sRayAt(p, u, asp, lane, Lb, Wb, T, px, al, ac, r, td);
  if (what == 0) return vec4(0.0);
  if (shadow) return vec4(1.0);
  if (what == 3) return vec4(mod(r * 14.0, 2.0) < 1.0 ? srgb(70.0, 150.0, 250.0) : srgb(176.0, 144.0, 88.0), 1.0);
  vec3 dk = srgb(150.0, 114.0, 64.0), lt = srgb(238.0, 210.0, 148.0);
  vec2 rdir = normalize(p - c0 + vec2(1e-5));
  float li = clamp(0.5 + 0.3 * dot(rdir, normalize(SSUN)) * min(1.0, r) + 0.25 * (1.0 - min(1.0, r)), 0.0, 1.0);
  vec3 c = mix(dk, lt, floor(li * 4.0 + 0.5) / 4.0);
  float wing = abs(ac) / 0.34;
  if (what == 1 && wing < 1.0) c = mix(c, c * vec3(0.86, 0.8, 0.72), 0.7);
  if (what == 1 && abs(wing - 1.0) < 0.06 && abs(al) < 0.82) c *= 0.84;
  if (what == 2) c = r > 0.96 ? dk * 0.72 : mix(c, srgb(250.0, 236.0, 200.0), 0.35);
  if (what == 6) c *= 0.85;
  float span0 = al > -0.08 ? pow(clamp((1.0 - al) / 1.08, 0.0, 1.0), 0.72) : pow(clamp((al + 1.0) / 0.92, 0.0, 1.0), 0.9);
  vec2 sg = vec2(al * Lb, ac * Wb) / 0.028, gi = floor(sg);
  vec2 sc = gi + 0.3 + 0.4 * vec2(sh2(gi + 3.1), sh2(gi + 9.7));
  bool spot = what == 1 && (span0 - abs(ac)) * Wb > 3.0 * px && !(al > 0.15 && abs(ac) < 0.3) && sh2(gi + 5.3) < 0.5 && length(sg - sc) < 0.26;
  if (spot) c = length(sg - sc) < 0.12 ? srgb(150.0, 210.0, 255.0) : srgb(60.0, 150.0, 255.0);
  if (what == 4) c = srgb(36.0, 30.0, 22.0);
  if (what == 5) c = mix(dk, srgb(36.0, 30.0, 22.0), 0.5);
  rPlain = !spot && what != 4 && what != 5;
  return vec4(c, 1.0);
}
// the jellyfish in pixels, seen from the side as the scene has them, beating every two beats (squeezing,
// a surge up, gliding on): the bell see-through, its skin brighter toward its top and sides in four
// tones, outlined bright; its rim glowing; its four rings showing through; a fringe of short tentacles
// under the rim; long tentacles a pixel wide, swaying, fading as they go; the frilled arms wider. They
// glow at night. (jWho: which one the pixel's of, when jPlain: it's its bell's plain skin, for its grain)
int jWho = -1;
bool jPlain = false;
vec4 jellyPix(vec2 p, float px, float asp) {
  jWho = -1; jPlain = false;
  float s2 = sea.z * 0.5, b2 = fract(s2), pulse = exp(-b2 * 6.0);
  float rise = floor(s2) + (1.0 - exp(-b2 * 5.0)) / (1.0 - exp(-5.0));
  bool day = night < 0.5;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    bool big = k == 0;
    float sz = min(1.0, 0.55 + 0.45 * asp);
    float a = (big ? 0.105 : 0.066) * sz * (1.0 - 0.14 * pulse), b = (big ? 0.1 : 0.064) * sz * (1.0 + 0.12 * pulse);
    float hh = (big ? 0.014 : 0.009) * sz * (1.0 + 1.2 * pulse), L = (big ? 0.3 : 0.19) * sz;
    vec2 c = vec2((k == 0 ? 0.24 : (k == 1 ? 0.58 : 0.86)) * asp + 0.03 * sin(time * 0.11 + fk * 2.1),
                  mod(0.1 + 0.53 * fk + rise * (big ? 0.022 : 0.016), 1.75) - 0.4);
    if (abs(p.x - c.x) > a + 0.06 || p.y > c.y + b + 0.02 || p.y < c.y - L - 0.02) continue;
    vec3 glowC = k == 1 ? srgb(190.0, 150.0, 255.0) : (k == 2 ? srgb(120.0, 230.0, 255.0) : srgb(255.0, 150.0, 220.0));
    vec3 dk = day ? srgb(178.0, 206.0, 232.0) : glowC * 0.12, lt = day ? srgb(248.0, 242.0, 255.0) : glowC * 0.7;
    float x = (p.x - c.x) / a, dy = p.y - c.y;
    if (abs(x) < 1.0) {
      float w = 1.0 - x * x, yT = b * sqrt(w), yB = hh * w;
      if (dy < yT && dy > yB) {
        float vv = clamp((dy - yB) / max(yT - yB, 1e-4), 0.0, 1.0);
        float ed = min(yT - dy, (1.0 - abs(x)) * a) / px;
        float skin = max(smoothstep(0.55, 1.0, vv), smoothstep(0.6, 1.0, abs(x)));
        bool ring = false;
        for (int i = 0; i < 4; i++) if (abs(x - (-0.54 + 0.36 * float(i))) * a < 2.2 * px && abs(vv - 0.32) * (yT - yB) < 1.8 * px) ring = true;
        if (ed < 1.0) return vec4(day ? lt : glowC * 0.95, 0.95);
        if ((dy - yB) < 2.0 * px) return vec4(day ? srgb(236.0, 206.0, 244.0) : glowC * (0.65 + 0.3 * pulse), 0.92);
        if (ring) return vec4(day ? srgb(232.0, 150.0, 210.0) : mix(glowC, vec3(1.0), 0.25) * 0.75, 0.9);
        float li = clamp(0.08 + 0.8 * skin + 0.15 * vv, 0.0, 1.0);
        vec3 tc = mix(dk, lt, floor(li * 4.0 + 0.5) / 4.0) * (day ? 1.0 : 1.0 + 0.3 * pulse);
        jWho = k; jPlain = true;
        return vec4(tc, day ? 0.5 + 0.35 * skin : 0.4 + 0.5 * skin);
      }
    }
    float yBr = hh * max(0.0, 1.0 - x * x);
    if (abs(x) < 0.98 && dy < yBr && dy > yBr - 4.0 * px && mod(floor(p.x / px) + fk, 3.0) < 1.0) return vec4(day ? dk * 0.85 : glowC * 0.75, 0.8);
    int N = big ? 5 : 3;
    for (int j = 0; j < 5; j++) {
      if (j >= N) break;
      float fj = float(j), u = (fj / float(N - 1) - 0.5) * 1.7;
      float len = L * (0.75 + 0.25 * sh1(fj * 3.7 + fk * 11.0));
      float xa = c.x + u * a, ya = c.y + hh * (1.0 - u * u) - 2.0 * px;
      float down = ya - p.y;
      if (down < 0.0 || down >= len) continue;
      float t0 = down / len, A = big ? 0.012 : 0.0075, ph = time * 1.3 + fj * 1.1 + fk * 2.0;
      float x1 = xa + A * pow(t0, 0.8) * sin(ph - down * 40.0);
      if (abs(p.x - x1) < 0.6 * px) return vec4((day ? dk * 0.8 : glowC * 0.8) * (1.0 - 0.4 * t0), 0.8 - 0.45 * t0);
    }
    for (int j = 0; j < 2; j++) {
      if (!big && j == 1) break;
      float fj = float(j), len = L * 0.58;
      float xa = c.x + (big ? (fj - 0.5) * 0.36 : 0.0) * a, ya = c.y + hh - 2.0 * px;
      float down = ya - p.y;
      if (down < 0.0 || down >= len) continue;
      float t0 = down / len, x1 = xa + 0.0105 * pow(t0, 0.7) * sin(time * 0.8 + fj * 2.5 + fk - down * 28.0);
      if (abs(p.x - x1) < (2.2 - 1.2 * t0) * px * (1.0 + 0.4 * sin(down * 260.0))) return vec4(day ? mix(dk, srgb(200.0, 100.0, 180.0), 0.5) : mix(glowC, vec3(1.0), 0.2), 0.82 - 0.35 * t0);
    }
  }
  return vec4(0.0);
}
// (what of shark k shows at p: its colour, and how opaque, 0 nothing)
vec4 sharkPix(int k, vec2 p, float px) {
  int what = sharkAtPx(k, p, px);
  if (what == 0) return vec4(0.0);
  float kind = shkK[k].x, near = 0.74 + 0.26 * shkD[k].x;
  // (its colours, in shadow and lit: the hammerhead olive bronze, the blacktip grey, the zebra shark sand)
  vec3 dk = kind < 0.5 ? srgb(78.0, 76.0, 58.0) : kind < 1.5 ? srgb(70.0, 80.0, 94.0) : srgb(122.0, 98.0, 60.0);
  vec3 lt = kind < 0.5 ? srgb(176.0, 170.0, 134.0) : kind < 1.5 ? srgb(176.0, 188.0, 202.0) : srgb(230.0, 204.0, 146.0);
  if (what == 4) {
    // (an eye: dark, a glint on the sun's side)
    return vec4(srgb(14.0, 14.0, 18.0), 1.0);
  }
  if (what == 5) return vec4(kind > 1.5 ? dk * 0.42 : srgb(22.0, 24.0, 30.0), 1.0);
  // (the light across it in four steps, as a pixel picture's; a pixel's rim darker; the fins a little duller)
  float li = clamp((sLit - 0.22) / 0.56, 0.0, 1.0);
  float lq = floor(li * 4.0 + 0.5) / 4.0;
  vec3 c = mix(dk, lt, what == 2 ? 0.08 + 0.5 * lq : lq);
  if (what == 1 && abs(sV) < 0.012 && sS > 0.05 && sS < 0.8) c = mix(c, lt * 1.08, 0.5);
  if (what == 3) c = sLit > 0.9 ? mix(lt, vec3(1.0), 0.32) : dk * 0.62;
  // (the hammerhead's wing lit along its front edge, darker behind)
  if (what == 6) c = sLit > 0.66 ? mix(lt, vec3(1.0), 0.18) : mix(dk, lt, 0.55);
  if (sEdge < 1.0) c = dk * (what == 2 ? 0.5 : 0.7);
  return vec4(c * near, 1.0);
}
`;
const SHARK_PX_DRAW = `
  {
    float sHc = H / dpr, spx = max(sharkPx, 1.0 / dpr) / sHc;
    // (a cell holding a skin's glyph (see SHARKS: whose, in its front: 120-122 a jellyfish's, 123 the
    // stingray's, 124-126 a shark's): the water there drawn again without it, the glyph laid on that
    // one's pixels below; 127 the code fish, in front of the jellyfish and the stingray (and the
    // shadows), the sharks over it)
    float sk = cellD * 255.0 - 120.0;
    int skin = sk > -0.5 && sk < 6.5 ? int(sk + 0.5) : -1;
    bool fish = sk > 6.5 && sk < 7.5;
    if (skin >= 0) {
      if (own > 0.5) {
        vec3 pap = mix(top, low, smoothstep(0.0, horizon, p.y / sHc)) + toneC * c.b;
        col = rim ? mix(pap, night > 0.5 ? pap + 0.05 : pap * 0.9, gridK) : mix(pap, tl.rgb, tl.a);
      } else col = rim ? mix(bg, fg, 0.05 * gridK) : mix(bg, fg, 0.22 * tl.a * min(1.0, k));
    }
    vec2 spk = sharkPx > 0.0 ? (floor(p / sharkPx) + 0.5) * sharkPx : p;
    vec2 sq = vec2(spk.x, sHc - spk.y) / sHc;
    // (by day their shadows on the bottom, down and to the right of each, as the scene had them)
    float sAsp = sView.x / max(sView.y, 1.0);
    bool shade = false;
    if (own > 0.5 && night < 0.5 && !fish) {
      for (int j = 0; j < 3; j++) {
        vec4 B = shkB[j];
        vec2 dq = sq - vec2(0.02, -0.026);
        if (B.z < B.x || dq.x < B.x || dq.x > B.z || dq.y < B.y || dq.y > B.w) continue;
        if (sharkAtPx(j, dq, spx) != 0) { shade = true; break; }
      }
      if (!shade && rayPix(sq - vec2(0.012, -0.016), spx, sAsp, true).a > 0.0) shade = true;
      if (shade) col *= vec3(0.8, 0.85, 0.88);
    }
    vec4 rc = fish ? vec4(0.0) : rayPix(sq, spx, sAsp, false);
    if (rc.a > 0.0) {
      vec3 rcol = night > 0.5 ? rc.rgb * vec3(0.6, 0.68, 0.86) : rc.rgb;
      // (its skin's glyph from the cell, on its plain skin: the skin's tone darker)
      if (skin == 3 && rPlain && cov > 0.0) rcol = mix(rcol, rcol * 0.5, cov);
      col = mix(col, own > 0.5 ? rcol : mix(bg, fg, dot(rcol, vec3(0.3, 0.55, 0.15))), rc.a);
    }
    vec4 jc = fish ? vec4(0.0) : jellyPix(sq, spx, sAsp);
    if (jc.a > 0.0) {
      vec3 jcol = jc.rgb;
      // (the grain on its bell from the cell: its skin's tone darker (by night lighter, glowing), or a
      // flash of white)
      if (skin == jWho && jPlain && cov > 0.0) jcol = mix(jcol, c.g > 0.998 ? vec3(1.0) : night > 0.5 ? min(jcol * 1.55, vec3(1.0)) : jcol * 0.72, cov);
      col = mix(col, own > 0.5 ? jcol : mix(bg, fg, dot(jcol, vec3(0.3, 0.55, 0.15))), jc.a);
    }
    // (the nearest first: the first one there is drawn)
    for (int j = 0; j < 3; j++) {
      vec4 B = shkB[j];
      if (B.z < B.x || sq.x < B.x || sq.x > B.z || sq.y < B.y || sq.y > B.w) continue;
      vec4 sc = sharkPix(j, sq, spx);
      if (sc.a <= 0.0) continue;
      vec3 scol = night > 0.5 ? sc.rgb * vec3(0.6, 0.68, 0.86) : sc.rgb;
      // (its skin's glyph from the cell, on its pixels: the skin's own tone darker (by night lighter,
      // glowing), or as it shimmers a flash of colour or white)
      if (skin == j + 4 && cov > 0.0) scol = mix(scol, c.g > 0.998 ? cc : night > 0.5 ? min(scol * 1.5, vec3(1.0)) : scol * 0.62, cov);
      col = mix(col, own > 0.5 ? scol : mix(bg, fg, dot(scol, vec3(0.3, 0.55, 0.15))), sc.a);
      break;
    }
  }
`;
const PAINT_SHARK = PAINT.replace('void main() {', () => SHARK_PX + 'void main() {').replace('  float cellD = float(u.w & 255u) / 255.0;\n', (m) => m + SHARK_PX_DRAW);

// The pixel layer: small things drawn in pixels over the glyphs, where a text cell can't carry the
// detail, the way the toaster is: the garden's koi, the space's Earth and Saturn. Each picture is
// drawn once, frame by frame, into one atlas. A colour is [r, g, b, a]: a 255 plain, 254 lit by the kick
// at night, 253 in the show's colour at night, 252 shimmering with the hats at night; under 250
// see-through (a fin).
const PIX_MAX = 16;
const hexA = (s, a = 255) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), a];
const shadeA = (c, k, a = c[3]) => [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k)), a];
function pixPicture(w, h) {
  const d = new Uint8Array(w * h * 4);
  const set = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (!c || x < 0 || y < 0 || x >= w || y >= h) return;
    d.set([c[0], c[1], c[2], c[3] ?? 255], (y * w + x) * 4);
  };
  return {
    w, h, d, set,
    alpha: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]),
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); },
    // (an ellipse, filled: its middle, its half axes; c a colour, or one from where in it (u, v from -1 to 1))
    oval(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x - cx) / rx, v = (y - cy) / ry;
        if (u * u + v * v <= 1) set(x, y, typeof c === 'function' ? c(u, v) : c);
      }
    },
    line(x0, y0, x1, y1, c, t = 1) {
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
        for (let a = 0; a < t; a++) for (let e = 0; e < t; e++) set(x + a, y + e, c);
      }
    },
    // (another picture laid over this one, its empty pixels skipped)
    over(o) { for (let k = 0; k < o.d.length; k += 4) if (o.d[k + 3]) d.set(o.d.subarray(k, k + 4), k); },
  };
}
// The garden's koi, seen from the bank, 22 x 10, facing right: a body round at the head and tapering to
// the root of its tail, lighter along its back, darker at its belly, a sheen of scales; its tail fanned
// and forked (swish -1, 0, 1), its fins see-through; an eye. Kind 0 a kohaku (red on white), 1 an ogon
// (orange gold), 2 a showa (black, red and white), 3 a tancho (white, a red crown)
const KOI_W = 22, KOI_H = 10;
const KOI_TOP = [4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4], KOI_BOT = [5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5];   // (x 5 to 20)
function drawGardenKoi(kind, swish) {
  const g = pixPicture(KOI_W, KOI_H), C = hexA;
  const base = [C('#f3efe7'), C('#f08a2c'), C('#2b2830'), C('#f4f0ea')][kind], red = C('#d6402c'), white = C('#efebe3');
  const spot = (x, y) => {
    if (kind === 0) return (x >= 9 && x <= 13 && y <= 4) || (x >= 15 && x <= 18 && y <= 3) || (x >= 6 && x <= 8 && y >= 4 && y <= 5) ? red : null;
    if (kind === 2) return (x >= 8 && x <= 12 && y <= 5) || (x >= 15 && x <= 18 && y <= 4) ? red : (x >= 12 && x <= 15 && y >= 5) || (x >= 6 && x <= 8 && y >= 5) ? white : null;
    if (kind === 3) return Math.hypot(x - 17, y - 3) < 1.6 ? red : null;
    return null;
  };
  // (the tail: two lobes fanned from its root, swishing, a notch between them, see-through)
  for (let x = 0; x <= 4; x++) {
    const f = (4 - x) / 4, up = 4 - Math.round(f * (3 - swish)), dn = 5 + Math.round(f * (3 + swish));
    for (let y = up; y <= dn; y++) if (!(x <= 1 && y > up + 1 && y < dn - 1)) g.set(x, y, shadeA(base, (x + y) % 2 ? 0.9 : 1.04, 200));
  }
  // (the body: its pattern, the light on its back, the shade at its belly, a sheen of scales)
  for (let x = 5; x <= 20; x++) {
    const top = KOI_TOP[x - 5], bot = KOI_BOT[x - 5];
    for (let y = top; y <= bot; y++) {
      let c = spot(x, y) || base;
      if (kind === 1 && y === top + 1) c = C('#ffc274');
      g.set(x, y, shadeA(c, y === top ? 1.16 : y === bot ? 0.72 : y === bot - 1 ? 0.88 : (x + y) % 2 ? 1.0 : 1.07, 255));
    }
  }
  // (the fins: the dorsal along its back, the pectoral and the pelvic below; see-through)
  for (let x = 10; x <= 14; x++) g.set(x, 1, shadeA(base, 1.1, 150));
  for (let x = 11; x <= 13; x++) g.set(x, 0, shadeA(base, 1.15, 120));
  for (let x = 15; x <= 17; x++) g.set(x, 8, shadeA(base, 1.05, 150));
  for (let x = 10; x <= 11; x++) g.set(x, 8, shadeA(base, 1.0, 130));
  // (its eye, its mouth)
  g.set(18, 4, C(kind === 2 ? '#e8e4dc' : '#141218')); g.set(20, 5, shadeA(spot(20, 5) || base, 0.7, 255));
  return g;
}
// The moon, 38 across, for the night skies: its face a little dimmer toward the limb, its seas (the
// maria) in soft greys where the near side has them, dithered at their shores, a few craters lit on the
// upper left, Tycho bright near the bottom; its own light (251: not tinted by the night). lit: how much of
// it the sun lights (1 full, 0.5 half, under it a crescent), from the right as it waxes or the left as it
// wanes; the terminator a little dimmer where the light grazes it, the dark side not drawn (the sky's dark
// shows there, starless: the shader keeps the disc clear)
const MOON_D = 38;
function drawMoon(lit = 1, waning = false) {
  const g = pixPicture(MOON_D, MOON_D), C = (c) => hexA(c, 251), r0 = MOON_D / 2;
  const maria = [[-0.3, -0.38, 0.3, 0.24], [0.12, -0.35, 0.16, 0.15], [0.28, -0.08, 0.2, 0.17], [0.66, -0.25, 0.11, 0.09], [-0.55, 0.0, 0.22, 0.4], [-0.15, 0.32, 0.18, 0.13], [0.5, 0.15, 0.12, 0.15]];
  // (the terminator, an ellipse across the disc: at each height lit where u is past c times the half
  // width there; c from -1 (all lit) through 0 (the half) to 1 (none))
  const c = 1 - 2 * lit;
  const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const into = (u, v) => { const w = Math.sqrt(Math.max(0, 1 - v * v)); return lit >= 1 ? 9 : ((waning ? -u : u) - c * w) / Math.max(w, 1e-3); };
  for (let y = 0; y < MOON_D; y++) for (let x = 0; x < MOON_D; x++) {
    const u = (x + 0.5 - r0) / r0, v = (y + 0.5 - r0) / r0, r = Math.hypot(u, v);
    if (r > 1) continue;
    const d = into(u, v);
    if (d < 0) continue;
    let sea = 0;
    for (const [mx, my, rx, ry] of maria) sea = Math.max(sea, 1 - Math.hypot((u - mx) / rx, (v - my) / ry));
    const face = sea > 0.6 ? '#aeaa9c' : sea > 0.28 ? '#c6c2b2' : r > 0.9 ? '#d6cfb6' : r > 0.7 ? '#e7e0c8' : '#f4eed9';
    g.set(x, y, C(d < 0.12 ? shade(face, 0.74) : d < 0.26 ? shade(face, 0.88) : face));
  }
  for (const [cx, cy] of [[0.32, 0.52], [-0.36, 0.5], [0.62, 0.4]]) {
    const x = Math.round(r0 + cx * r0), y = Math.round(r0 + cy * r0);
    if (into(cx, cy) < 0.3) continue;
    g.set(x, y, C('#cdc6ae')); g.set(x - 1, y - 1, C('#fbf7e8')); g.set(x + 1, y + 1, C('#c0b9a2'));
  }
  const tx = Math.round(r0 - 0.08 * r0), ty = Math.round(r0 + 0.66 * r0);
  if (into(-0.08, 0.66) > 0.3) { g.set(tx, ty, C('#fffcf2')); g.set(tx + 1, ty, C('#f9f4e4')); g.set(tx, ty - 1, C('#f9f4e4')); }
  return g;
}
// The sea's crab, 13 x 9, seen from the beach: a shell rounded on top, lighter where the sun is and
// darker under, two eyes on stalks, its claws up (frame 0, on the beat) or down (1), its legs stepping.
const CRAB_W = 13, CRAB_H = 9;
function drawCrab(up) {
  const g = pixPicture(CRAB_W, CRAB_H), C = hexA, shell = C('#e2553a'), hi = C('#ff8f6c'), lo = C('#a83828'), eye = C('#1a1412');
  for (const x0 of [2, 4, 8, 10]) g.line(x0, 7, x0 + (x0 < 6 ? -1 : 1) * (up ? 1 : 0), 8, lo);
  g.oval(6, 5.2, 4.6, 2.5, (u, v) => (v < -0.45 ? hi : v > 0.5 ? lo : shell));
  g.set(4, 2, shell); g.set(8, 2, shell); g.set(4, 1, eye); g.set(8, 1, eye);
  if (up) {
    for (const sd of [-1, 1]) { const x = 6 + sd * 5; g.line(6 + sd * 3.5, 4, x, 2, shell); g.rect(sd < 0 ? x - 1 : x, 0, 2, 2, shell); g.set(sd < 0 ? x - 1 : x + 1, 0, hi); g.set(x, 1, lo); }
  } else {
    for (const sd of [-1, 1]) { const x = 6 + sd * 5.5; g.line(6 + sd * 3.8, 5, x, 5, shell); g.rect(sd < 0 ? x - 1 : x, 4, 2, 2, shell); g.set(sd < 0 ? x - 1 : x + 1, 4, hi); }
  }
  return g;
}
// The sea's lighthouse, 31 x 78, standing on the headland: a white tower tapering up, three red bands
// round it, lit down its left side and shaded down its right, a window up each white stretch and a door
// at its foot on a stone plinth; the gallery's railing round the top; the lantern, its glass lit at
// night (251, its own light: frame 1) or pale by day (0), the lamp's bright core in the middle, the
// frame's bars across it; a red dome over it, its vent and the lightning rod on top. (LIGHT_LAMP: the
// lamp's row, from the top)
const LIGHT_W = 31, LIGHT_H = 78, LIGHT_LAMP = 17;
function drawLighthouse(lit) {
  const g = pixPicture(LIGHT_W, LIGHT_H), C = hexA;
  const white = C('#eceef4'), whiteL = C('#ffffff'), whiteD = C('#b4b8c8'), whiteDD = C('#8c90a4');
  const red = C('#c8383c'), redL = C('#e8585a'), redD = C('#8c2428'), redDD = C('#641a1e');
  const iron = C('#2c2c36'), ironL = C('#4a4a58'), stone = C('#8a8896'), stoneD = C('#64626e'), stoneL = C('#a8a6b2');
  const glass = lit ? C('#ffd878', 251) : C('#a8c4dc'), glassL = lit ? C('#fff4cc', 251) : C('#d4e6f4'), core = lit ? C('#ffffff', 251) : C('#e8f2fa');
  const cx = 15;
  // the lightning rod and the vent ball
  g.line(cx, 0, cx, 3, ironL); g.oval(cx, 5, 1.6, 1.4, (u) => (u < -0.2 ? redL : redD));
  // the dome: red, lit on its left
  for (let y = 7; y <= 12; y++) {
    const hw = Math.round(6.5 * Math.sqrt(Math.max(0, 1 - ((12.6 - y) / 6.2) ** 2)));
    for (let x = cx - hw; x <= cx + hw; x++) g.set(x, y, x < cx - hw * 0.45 ? redL : x > cx + hw * 0.5 ? redD : red);
  }
  g.rect(cx - 8, 13, 17, 1, redDD);
  // the lantern: glass between the frame's bars, the lamp's core
  for (let y = 14; y <= 21; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    const bar = x === cx - 6 || x === cx + 6 || x === cx - 3 || x === cx + 3;
    g.set(x, y, bar ? iron : Math.abs(x - cx) <= 1 && y >= 15 && y <= 20 ? core : y <= 15 || Math.abs(x - cx) <= 2 ? glassL : glass);
  }
  g.rect(cx - 7, 22, 15, 1, iron);
  // the gallery: its rail, the balusters, its deck and the brackets under it
  g.rect(cx - 10, 23, 21, 1, ironL);
  for (let x = cx - 10; x <= cx + 10; x += 2) g.set(x, 24, iron);
  g.rect(cx - 11, 25, 23, 1, iron); g.rect(cx - 9, 26, 19, 1, ironL);
  for (let k = 0; k < 3; k++) { g.set(cx - 8 + k, 27 + k, iron); g.set(cx + 8 - k, 27 + k, iron); }
  // the tower: tapering from 11 across under the gallery to 19 at its foot
  const top = 27, foot = 72, bands = [[33, 39], [47, 53], [61, 67]];
  for (let y = top; y < foot; y++) {
    const hw = Math.round(5 + (4 * (y - top)) / (foot - top));
    const band = bands.some(([a, b]) => y >= a && y < b);
    for (let x = cx - hw; x <= cx + hw; x++) {
      const e = x - (cx - hw), f = cx + hw - x;
      g.set(x, y, band ? (e === 0 ? redL : f <= 1 ? redDD : f <= 3 ? redD : red) : e === 0 ? whiteL : f <= 1 ? whiteDD : f <= 3 ? whiteD : white);
    }
  }
  // a window up each white stretch, the door at the foot
  for (const [wx, wy] of [[cx - 1, 42], [cx, 56]]) { g.rect(wx, wy, 2, 3, iron); g.set(wx, wy, ironL); }
  g.rect(cx - 1, 67, 3, 5, C('#4a3426')); g.set(cx - 1, 67, C('#6a4a36')); g.set(cx + 1, 69, C('#c8a060'));
  // the plinth: stone, its courses
  for (let y = foot; y < LIGHT_H; y++) for (let x = cx - 12; x <= cx + 12; x++) {
    const seam = y === foot + 2 || ((x + (y > foot + 2 ? 2 : 0)) % 5 === 0);
    g.set(x, y, y === foot ? stoneL : seam ? stoneD : x > cx + 8 ? stoneD : stone);
  }
  return g;
}
// The keeper's cottage beside it, 25 x 17: white walls, a red roof, its chimney, a door, and a window
// lit warm at night (251: frame 1), dark by day (0).
const COTTAGE_W = 25, COTTAGE_H = 17;
function drawCottage(lit) {
  const g = pixPicture(COTTAGE_W, COTTAGE_H), C = hexA;
  const white = C('#e4e4ec'), whiteD = C('#aeb0c0'), red = C('#b8363a'), redL = C('#d85656'), redD = C('#7c2226');
  g.rect(17, 0, 3, 5, C('#7a6a66')); g.rect(17, 0, 3, 1, C('#9a8a86'));
  for (let y = 2; y <= 8; y++) { const hw = 2 + Math.round((y - 2) * 1.75); for (let x = 12 - hw; x <= 12 + hw; x++) g.set(x, y, x < 12 - hw + 2 ? redL : x > 12 + hw - 3 ? redD : red); }
  g.rect(0, 9, 25, 1, redD);
  g.rect(1, 10, 23, 7, white); g.rect(19, 10, 5, 7, whiteD);
  const win = lit ? C('#ffcf6e', 251) : C('#3a4054'), winL = lit ? C('#fff0b8', 251) : C('#5a6278');
  g.rect(4, 11, 5, 4, win); g.rect(4, 11, 2, 2, winL); g.rect(6, 11, 1, 4, C('#5a4636')); g.rect(4, 13, 5, 1, C('#5a4636'));
  g.rect(14, 11, 3, 6, C('#5a3a2a')); g.set(16, 14, C('#c8a060'));
  return g;
}
// The campfire's owl, 9 x 12, on its branch: brown, its belly lighter and barred, ear tufts, a pale face
// with big eyes (open and glowing at night, 251; shut while it blinks or sleeps by day: frame 1), a
// beak, its feet on the branch.
const OWL_W = 9, OWL_H = 12;
function drawOwl(awake) {
  const g = pixPicture(OWL_W, OWL_H), C = hexA, brown = C('#8a5a36'), dark = C('#5a3a22'), belly = C('#c4955f'), face = C('#dcb584');
  g.oval(4, 7.3, 3.7, 4.4, (u, v) => (Math.abs(u) < 0.5 && v > 0.1 ? ((Math.round((v + 1) * 5) % 2) ? belly : C('#a87a4a')) : u > 0.55 ? dark : brown));
  g.set(1, 2, dark); g.set(1, 3, brown); g.set(7, 2, dark); g.set(7, 3, brown);
  g.oval(4, 5, 3, 1.7, face);
  if (awake) {
    const ey = C('#ffd24a', 251), pu = C('#141010', 251);
    g.rect(2, 4, 2, 2, ey); g.rect(5, 4, 2, 2, ey); g.set(3, 5, pu); g.set(5, 5, pu);
  } else { g.rect(2, 5, 2, 1, dark); g.rect(5, 5, 2, 1, dark); }
  g.set(4, 6, C('#e8a030')); g.set(4, 7, C('#b87a20'));
  g.set(3, 11, C('#e0a030')); g.set(5, 11, C('#e0a030'));
  return g;
}
// The snowman, 13 x 17, by the cabin: three snowballs, lit on the upper left and shaded on the lower
// right, a top hat with a red band, coal eyes and buttons, a carrot nose, a red scarf with its tail
// hanging, stick arms.
const SNOWMAN_W = 13, SNOWMAN_H = 17;
function drawSnowman() {
  const g = pixPicture(SNOWMAN_W, SNOWMAN_H), C = hexA, snow = C('#f2f6ff'), hi = C('#ffffff'), lo = C('#c3cfe6'), coal = C('#22222e'), stick = C('#7a5236');
  g.line(3, 8, 0, 5, stick); g.set(0, 4, stick); g.line(9, 8, 12, 6, stick); g.set(12, 5, stick);
  const ball = (u, v) => (u + v > 0.7 ? lo : u + v < -0.9 ? hi : snow);
  g.oval(6, 13.2, 5.1, 3.6, ball); g.oval(6, 8.6, 3.7, 2.7, ball); g.oval(6, 4.4, 2.7, 2.3, ball);
  g.rect(3, 2, 7, 1, coal); g.rect(4, 0, 5, 2, coal); g.rect(4, 1, 5, 1, C('#c03040'));
  g.set(5, 4, coal); g.set(7, 4, coal); g.set(8, 5, C('#ff8a2a')); g.set(9, 5, C('#e06a1a'));
  g.rect(3, 6, 7, 1, C('#d84040')); g.rect(4, 7, 5, 1, C('#b83030')); g.rect(8, 7, 1, 3, C('#d84040'));
  g.set(6, 9, coal); g.set(6, 11, coal); g.set(6, 13, coal);
  return g;
}
// The city's cat, 10 x 9, sitting on a roof: dark against the glow, ears up, its eyes glinting (251)
// at night, its tail curled up beside it, swishing (frames 0 and 1).
const CAT_W = 10, CAT_H = 9;
function drawCat(swish) {
  const g = pixPicture(CAT_W, CAT_H), C = hexA, fur = C('#3a3244'), rim = C('#6a5a7a'), eye = C('#ffd040', 251);
  g.oval(4, 6.2, 3, 2.7, fur); g.oval(4, 2.6, 2.2, 1.8, fur);
  g.set(2, 0, fur); g.set(2, 1, fur); g.set(6, 0, fur); g.set(6, 1, fur);
  g.set(2, 0, rim); g.set(6, 0, rim); g.rect(3, 1, 3, 1, rim);
  g.set(3, 2, eye); g.set(5, 2, eye);
  if (swish) { g.set(7, 8, fur); g.set(8, 7, fur); g.set(9, 6, fur); g.set(9, 5, fur); }
  else { g.set(7, 8, fur); g.set(8, 8, fur); g.set(9, 7, fur); g.set(9, 6, fur); }
  return g;
}
// The city's people, 9 x 14, walking the far pavement under umbrellas (red, yellow, blue, black), seen
// side on, facing right: the canopy domed and scalloped at its edge, lighter on top, its shaft, a head,
// a coat, legs mid-stride (frames 0 and 1).
const WALKER_W = 9, WALKER_H = 14;
const BROLLY = ['#d8404c', '#efc04a', '#4c88e0', '#3a3a48'];
function drawWalker(kind, stride) {
  const g = pixPicture(WALKER_W, WALKER_H), C = hexA, cv = C(BROLLY[kind]), cvL = shadeA(cv, 1.25), cvD = shadeA(cv, 0.7);
  const coat = C(['#3c3a4a', '#4a3a30', '#2e3a4a', '#5a4a44'][kind]), skin = C('#d6a482'), shoe = C('#1e1c22');
  g.rect(3, 0, 3, 1, cvL); g.rect(1, 1, 7, 1, cv); g.rect(1, 1, 3, 1, cvL); g.rect(0, 2, 9, 1, cv); for (let x = 0; x < 9; x += 2) g.set(x, 3, cvD);
  g.rect(4, 3, 1, 3, C('#2a2a30'));
  g.rect(3, 5, 2, 2, skin); g.set(3, 5, C('#3a2a22')); g.set(4, 5, C('#3a2a22'));
  g.rect(2, 7, 4, 4, coat); g.set(5, 6, skin);
  if (stride) { g.line(3, 11, 2, 13, shoe); g.line(4, 11, 5, 13, shoe); } else { g.rect(3, 11, 2, 3, shoe); }
  return g;
}
// the shaders' hash in JS (LIB's hu, h2, h1), for things the pixel layer puts where a shader put them
const huJS = (x, y) => Math.imul((Math.imul(x >>> 0, 1597334673) ^ Math.imul(y >>> 0, 3812015801)) >>> 0, 1597334673) >>> 0;
const h1JS = (x) => huJS(Math.floor(x) + 32768, 7 + 32768) / 4294967295;
// the city's building at x (as its shader's bldg has it): its left, its width, its height, which one
function bldgJS(x) {
  const Pd = 0.17, at = (k) => (k + 0.35 * (h1JS(k * 1.7 + 3) - 0.5)) * Pd;
  let k = Math.floor(x / Pd), b0 = at(k);
  if (x < b0) { k -= 1; b0 = at(k); }
  let b1 = at(k + 1);
  if (x >= b1) { k += 1; b0 = b1; b1 = at(k + 1); }
  const r = h1JS(k * 3.7 + 1);
  return [b0, b1 - b0, 0.16 + 0.4 * r * r, k];
}
// the scenes whose night sky has the moon in it (Halloween has its own; the city's sky is the rain's), and
// its phase in each, so each scene's night is its own: [waning (lit from the left), how much of it is lit;
// short of full, its own picture, <scene>Moon]. Full over the falls (a moonbow needs a bright moon) and the
// garden (the moon-viewing moon); waxing over the lake, waning over the snow and the aurora; the last
// quarter at sea, the lighthouse's beam the brighter light; a crescent through the campfire's pines; a thin
// one over the festival, its lasers the sky's
const MOON_OF = { falls: [false, 1], garden: [false, 1], lake: [false, 0.8], snow: [true, 0.72], sea: [true, 0.5], fire: [false, 0.26], festival: [true, 0.15] };
const MOON_SCENES = new Set(Object.keys(MOON_OF));
// the scenes with a day sky for the flock to cross (as the shader's sky had it): not the city's street
// or the water seen from above
const SKY_SCENES = new Set(['lake', 'sea', 'fire', 'snow', 'garden', 'falls', 'halloween', 'festival']);
// the atlas: every picture's frames packed in rows, each frame's place in it (texels: x, y, w, h)
let PIX = null;
// The falls' trout, 18 x 14, leaping, drawn by hand a column at a time: its back olive and speckled
// black, a pink stripe down its silver side, its belly white, its tail forked and spotted, a fin on its
// back and one under; its eye, its gill. Frame 0 nose up (rising), 1 level (at the top of its leap), 2
// nose down (falling back): the columns slid up or down toward the snout.
const TROUT_W = 18, TROUT_H = 14;
// (its body's top and bottom rows, level, by column from the tail's root, x 3, to the snout, x 17)
const TROUT_TOP = [6, 6, 5, 5, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6], TROUT_BOT = [7, 7, 8, 8, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7];
function drawTrout(pose) {
  const g = pixPicture(TROUT_W, TROUT_H), C = hexA;
  const backD = C('#47562f'), back = C('#64753e'), stripe = C('#d6728a'), side = C('#c8cdc0'), belly = C('#f0efe6'), spot = C('#262819');
  const fin = C('#72804c', 215), finD = C('#55623a', 215), gill = C('#a1a798'), eye = C('#121210');
  const dy = (x) => Math.round((x - 9) * [-0.35, 0, 0.35][pose]);
  const put = (x, y, c) => g.set(x, y + dy(x), c);
  const spots = new Set(['5,6', '7,4', '8,5', '10,4', '11,5']);
  // (the tail: two lobes forked from its root, a spot on each)
  for (const [x, rows] of [[0, [3, 4, 9, 10]], [1, [4, 5, 8, 9]], [2, [5, 6, 7, 8]]]) for (const y of rows) put(x, y, y === 3 || y === 10 ? finD : fin);
  put(1, 4, spot); put(0, 9, spot);
  // (the body, a column at a time: the back, the stripe, the side, the belly)
  for (let x = 3; x <= 17; x++) {
    const top = TROUT_TOP[x - 3], bot = TROUT_BOT[x - 3];
    for (let y = top; y <= bot; y++) {
      const v = (y - top) / Math.max(1, bot - top);
      let c = v <= 0.2 ? backD : v <= 0.4 ? back : v <= 0.6 ? (x < 14 ? stripe : side) : v <= 0.8 ? side : belly;
      if (spots.has(`${x},${y}`)) c = spot;
      if (x === 13 && v > 0.3 && v < 0.9) c = gill;
      put(x, y, c);
    }
  }
  // (the fin on its back, the one under it, its eye)
  put(8, 3, fin); put(9, 2, finD); put(9, 3, fin); put(10, 3, fin);
  put(10, 10, fin); put(11, 10, finD);
  put(15, 6, eye);
  return g;
}
// The campfire in pixels, its own light (251: not tinted at night). The flames, 32 x 52: a bed of flame on
// the logs and tongues licking up off it, drawing in to their tips, torn by heat rising through them, hot
// white-yellow at the core through yellow and orange to red at their edges; six frames of flicker in each
// of three heights (0 low, by day; 1 high, at night; 2 roaring, on a kick at night).
const FLAME_W = 32, FLAME_H = 52;
function drawFlame(set, k) {
  const g = pixPicture(FLAME_W, FLAME_H), C = (c) => hexA(c, 251);
  const hh = [0.52, 0.8, 1.0][set];
  const h = (a, b) => huJS(a + 32768, b + 32768) / 4294967295;
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx) * (1 - sy) + (h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx) * sy;
  };
  const fbm = (x, y) => 0.5 * n2(x, y) + 0.3 * n2(x * 2.1 + 5.3, y * 2.1 + 1.7) + 0.2 * n2(x * 4.3 + 9.1, y * 4.3 + 3.3);
  const red = C('#d23a28'), orange = C('#ff7a26'), yellow = C('#ffc63c'), core = C('#fff3c0');
  for (let y = 0; y < FLAME_H; y++) for (let x = 0; x < FLAME_W; x++) {
    // (u across, -1 to 1; v up from the foot, 1 at the top of this height)
    const u = (x + 0.5 - FLAME_W / 2) / (FLAME_W / 2), v = (FLAME_H - 0.5 - y) / (FLAME_H * hh);
    if (v > 1.25) continue;
    // (three tongues over the bed, each swaying a little from frame to frame)
    const wb = 0.8 * Math.sqrt(Math.max(0, 1 - ((v - 0.12) / 0.3) ** 2));      // (the bed: round at its foot)
    let shape = Math.max(0, 1 - Math.abs(u) / (wb + 1e-3)) * (wb > 0 ? 1 : 0);
    for (const [o, tall, ph] of [[-0.42, 0.75, 0.3], [0.02, 1.0, 1.7], [0.44, 0.7, 3.1]]) {
      const vt = v / tall, sway = 0.12 * vt * vt * Math.sin(k * 1.05 + ph);
      const w = 0.44 * Math.pow(Math.max(0, 1 - vt), 0.75);
      shape = Math.max(shape, Math.max(0, 1 - Math.abs(u - o - sway) / (w + 1e-3)) * (vt < 1 ? 1 : 0));
    }
    const n = fbm(x * 0.21 + 3.1, (y + k * 2.6) * 0.14);
    const heat = shape * (1.05 - 0.42 * v) + 0.32 * (n - 0.5);
    if (heat < 0.15 || shape <= 0) continue;
    g.set(x, y, heat > 0.8 ? core : heat > 0.56 ? yellow : heat > 0.34 ? orange : red);
  }
  return g;
}
// The campfire's logs and the stones behind them, 40 x 14: two logs crossed, their bark dark, their ends
// pale, glowing where they burn (their own light, 251); the ring of stones round the back, grey, lit on
// top. And the stones in front, 40 x 7, over the flames' foot.
const FIRE_W = 40, FIREB_H = 14, FIREF_H = 7;
function drawFireBack() {
  const g = pixPicture(FIRE_W, FIREB_H), C = hexA;
  const stone = C('#8d8a92'), stoneL = C('#b4b0b6'), stoneD = C('#5e5b66');
  for (const [cx, cy, rx, ry] of [[4, 8, 4, 3], [11, 6, 4, 3], [20, 5, 5, 3], [29, 6, 4, 3], [36, 8, 4, 3]]) g.oval(cx, cy, rx, ry, (u, v) => (v < -0.4 ? stoneL : v > 0.5 ? stoneD : stone));
  const bark = C('#4a2e20'), barkL = C('#6e4630'), end = C('#c9a070'), endD = C('#a07850'), glow = C('#ff7a2a', 251), glowH = C('#ffc04a', 251);
  // (the two logs, crossed: one leaning left, one right, their pale ends at the outside)
  for (const [x0, y0, x1, y1] of [[5, 12, 28, 6], [35, 12, 12, 6]]) {
    g.line(x0, y0, x1, y1, bark, 3);
    g.line(x0, y0, x1, y1, barkL, 1);
  }
  g.oval(5.5, 12, 1.6, 1.6, end); g.set(5, 12, endD); g.oval(35.5, 12, 1.6, 1.6, end); g.set(36, 12, endD);
  // (where they burn, in the middle: glowing cracks)
  for (const [x, y] of [[17, 8], [18, 9], [20, 8], [21, 7], [22, 8], [19, 7], [23, 9], [16, 9], [24, 7]]) g.set(x, y, (x + y) % 3 ? glow : glowH);
  return g;
}
function drawFireFront() {
  const g = pixPicture(FIRE_W, FIREF_H), C = hexA;
  const stone = C('#8d8a92'), stoneL = C('#b9b5ba'), stoneD = C('#5a5762');
  for (const [cx, cy, rx, ry] of [[3, 4, 3.4, 2.6], [10, 4.4, 4, 2.6], [19, 4.6, 4.6, 2.5], [28, 4.4, 4, 2.6], [36, 4, 3.4, 2.6]]) g.oval(cx, cy, rx, ry, (u, v) => (v < -0.35 ? stoneL : v > 0.45 ? stoneD : stone));
  return g;
}
// A bird of the day sky's flock, 7 x 4: a gull's silhouette, its wings up (frame 0) or down (1)
const BIRD_W = 7, BIRD_H = 4;
function drawBird(up) {
  const g = pixPicture(BIRD_W, BIRD_H), c = hexA('#3a3048'), d = hexA('#2a2234');
  const rows = up ? ['.......', 'x.....x', '.xx.xx.', '...x...'] : ['...x...', '.xx.xx.', 'x.....x', '.......'];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x') g.set(x, y, x === 3 ? d : c); }));
  return g;
}
// The space scene's art, from the user's stream (see space-art.js): a picture of one of them, a its
// pixels' alpha (251: its own light, not the night's tint)
const ART_KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function drawArt(name, a = 255) {
  const art = SPACE_ART[name], g = pixPicture(art.w, art.h), pal = art.pal.map((c) => hexA(c, a));
  art.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') g.set(x, y, pal[ART_KEYS.indexOf(ch)]); }));
  return g;
}
// The space scene's lander, 24 x 22, on the moon's ground: its upper stage silver, its window, a dish to
// one side, a mast with a lamp on top (lit by the kick at night: 254); its lower stage wrapped in gold foil,
// crinkled; its nozzle; two of its four legs out to their pads; on its right the socket the toaster's cord
// plugs into (LANDER_PLUG: the plug's pixel)
const LANDER_W = 24, LANDER_H = 22, LANDER_PLUG = [19, 7];
function drawLander() {
  const g = pixPicture(LANDER_W, LANDER_H), C = hexA;
  const rows = [
    '..........r.............',
    '..........m.............',
    '..dd......m.............',
    '.dddd.sssssssss.........',
    '..dd.sSSSSSSSSss........',
    '...msSwwwSSSSSsss.......',
    '....sSwWwSSSSssss.......',
    '....sSSwSSSSSsssskk.....',
    '....ssSSSSSSSssss.......',
    '...kkkkkkkkkkkkkkkk.....',
    '..gGgYgGgYgGgYgGgYg.....',
    '..GgYgGgYgGgYgGgYgG.....',
    '..gYgGgYgGgYgGgYgGg.....',
    '..YgGgYgGgYgGgYgGgY.....',
    '..kkkkkkkkkkkkkkkkk.....',
    '..l.......u.......l.....',
    '.l.......uuu.......l....',
    '.l.................l....',
    'l...................l...',
    'l...................l...',
    'ppp................ppp..',
    '........................',
  ];
  const col = { r: C('#ff5a5a', 254), m: C('#8a8a96'), d: C('#d8d8e4'), s: C('#9ca0b0'), S: C('#d4d8e4'), w: C('#262c48'), W: C('#7aa6e0'), k: C('#3a3a46'), g: C('#c8941e'), G: C('#f0c84a'), Y: C('#ffe48c'), l: C('#a0a0ae'), u: C('#5a5a66'), p: C('#707080') };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (col[ch]) g.set(x, y, col[ch]); }));
  return g;
}
// A slice of the toast that popped in space, tumbling away, 14 x 14, turned k quarters of a turn (a slice
// reads as one only upright or on its side: turned between, it's a coin): a slice's own shape, its crown a
// dome wider than its body, a crust round it, its face toasted golden, darker just inside the crust,
// lighter over the middle, a speck or two toasted darker
const SLICE_D = 14;
function drawToast(k) {
  const g = pixPicture(SLICE_D, SLICE_D), a = (k * Math.PI) / 2, c = Math.round(Math.cos(a)), sn = Math.round(Math.sin(a)), mid = (SLICE_D - 1) / 2;
  // (in the slice's own frame, y down: the dome over the body's shoulders)
  const inside = (x, y) => ((x / 5.3) ** 2 + ((y + 1.5) / 3.6) ** 2 <= 1 && y <= -1.5) || (Math.abs(x) <= 4.2 && y >= -1.6 && y <= 5.0);
  const at = (px, py) => { const dx = px - mid, dy = py - mid; return [c * dx + sn * dy, -sn * dx + c * dy]; };
  const crust = hexA('#7e4a22'), rim = hexA('#b97836'), face = hexA('#d9994c'), heart = hexA('#eec27e');
  for (let y = 0; y < SLICE_D; y++) for (let x = 0; x < SLICE_D; x++) {
    const [u, v] = at(x, y);
    if (!inside(u, v)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => !inside(...at(x + ox, y + oy)));
    const deep = [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([ox, oy]) => !inside(...at(x + ox, y + oy)));
    const speck = (Math.abs(u + 1.5) < 0.6 && Math.abs(v - 0.5) < 0.6) || (Math.abs(u - 1.8) < 0.6 && Math.abs(v - 2.4) < 0.6);
    g.set(x, y, edge ? crust : deep ? rim : speck ? face : Math.abs(u) < 2.7 && v > -2.6 && v < 3.5 ? heart : face);
  }
  return g;
}
function pixAtlas() {
  if (PIX) return PIX;
  const pics = [];
  for (let k = 0; k < 4; k++) for (let w = -1; w <= 1; w++) pics.push([`koi${k}_${w + 1}`, drawGardenKoi(k, w)]);
  pics.push(['moon', drawMoon()]);
  for (const [scene, [waning, lit]] of Object.entries(MOON_OF)) if (lit < 1) pics.push([scene + 'Moon', drawMoon(lit, waning)]);
  pics.push(['light0', drawLighthouse(false)], ['light1', drawLighthouse(true)], ['cottage0', drawCottage(false)], ['cottage1', drawCottage(true)]);
  pics.push(['crab0', drawCrab(true)], ['crab1', drawCrab(false)], ['owl0', drawOwl(true)], ['owl1', drawOwl(false)], ['snowman', drawSnowman()], ['cat0', drawCat(false)], ['cat1', drawCat(true)]);
  for (let k = 0; k < 4; k++) for (let w = 0; w < 2; w++) pics.push([`walker${k}_${w}`, drawWalker(k, w)]);
  for (let k = 0; k < 3; k++) pics.push(['trout' + k, drawTrout(k)]);
  for (let set = 0; set < 3; set++) for (let k = 0; k < 6; k++) pics.push([`flame${set}_${k}`, drawFlame(set, k)]);
  pics.push(['fireback', drawFireBack()], ['firefront', drawFireFront()]);
  pics.push(['bird0', drawBird(true)], ['bird1', drawBird(false)]);
  pics.push(['earth', drawArt('earth', 251)], ['saturn', drawArt('saturn', 251)], ['astro0', drawArt('astro0')], ['astro1', drawArt('astro1')], ['lander', drawLander()]);
  for (let k = 0; k < 4; k++) pics.push(['toast' + k, drawToast(k)]);
  const AW = 256, at = {};
  let x = 0, y = 0, rowH = 0;
  for (const [n, g] of pics) {
    if (x + g.w > AW) { x = 0; y += rowH + 1; rowH = 0; }
    at[n] = [x, y, g.w, g.h];
    x += g.w + 1; rowH = Math.max(rowH, g.h);
  }
  const AH = y + rowH, d = new Uint8Array(AW * AH * 4);
  for (const [n, g] of pics) { const [ax, ay] = at[n]; for (let j = 0; j < g.h; j++) d.set(g.d.subarray(j * g.w * 4, (j + 1) * g.w * 4), ((ay + j) * AW + ax) * 4); }
  return (PIX = { w: AW, h: AH, d, at });
}
// the show's two colours, for each 8 bars (the pixel layer's 253s at night)
const SHOW_A = [[255, 70, 110], [255, 160, 50], [80, 130, 255], [200, 80, 255]].map((c) => c.map((v) => v / 255));
const SHOW_B = [[255, 196, 110], [255, 80, 160], [110, 236, 255], [255, 120, 80]].map((c) => c.map((v) => v / 255));
// The pixel layer's pictures up this frame: [frame, x, y (CSS pixels, its top left), scale, flipped,
// how near (see LIB's front)]. The moon in the night sky, behind everything else; the
// garden's koi swimming their rounds in the pond (nearer ones drawn last),
// turning as they go, their tails swishing, behind the lily pads.
function pixFor(scene, W, H, V, { t, beats, swim, popAt, dropAt, night, cwPx, chPx, kick = 0, birds = null, eye = null }) {
  const A = pixAtlas().at, S = Math.max(1, Math.round(H / 270)), out = [];
  const aspect = W / H, wide = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22)), cw = cwPx / H, ch = chPx / H;
  const mix = (a, b, k) => a + (b - a) * k;
  // (a picture by its foot's middle, CSS pixels)
  const at = (f, x, y, k, flip = false, near = 0.75, keep = 0) => out.push([f, Math.round(x - (f[2] * k) / 2), Math.round(y - f[3] * k), k, flip, near, keep]);
  if (scene === 'sea' && V.lake) {
    // the lighthouse on the headland's crown at 0.84 of the width, the keeper's cottage beside it (the
    // shader's cliffTop, which keeps the crown there smooth); their windows lit at night
    const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
    const line = (x) => {
      const a = 1 - x / aspect, crown = V.lake[0] + mix(0.1, 0.12, wide);
      return V.lake[1] + (crown - V.lake[1]) * mix(0.72, 1, sm(-0.05, 0.16, a)) * Math.pow(1 - sm(0.17, 0.35, a), 0.6);
    };
    const lx = 0.84 * aspect, kx = lx - (15 + 4 + 12) * S / H, edge = kx - (15 * S) / H, shelf = line(kx) > line(lx) - 0.09;
    // (with the level shelf the shader cuts for the cottage beside the lighthouse)
    const top = (x) => (shelf && x < lx ? Math.max(line(x), mix(line(x), line(lx), sm(edge - 0.1, edge, x))) : line(x));
    // (only where the crown's wide enough for it: a tall window's falls away under it)
    if (shelf) at(A[night ? 'cottage1' : 'cottage0'], kx * H, (1 - top(kx)) * H + 2 * S, S, false, 1);
    at(A[night ? 'light1' : 'light0'], lx * H, (1 - top(lx)) * H + 2 * S, S, false, 1);
  }
  if (scene === 'sea' && V.lake) {
    // the crab: a step a beat along the beach, turning every 16 beats, its claws up on each beat
    const leg = ((Math.floor(beats) % 32) + 32) % 32, step = leg < 16 ? leg : 32 - leg;
    const c0 = Math.floor(((0.12 + 0.08 * wide) * aspect) / cw) + step, r0 = Math.floor((1 - (V.lake[1] - 0.05)) / ch);
    at(A[((beats % 1) + 1) % 1 < 0.3 ? 'crab0' : 'crab1'], (c0 + 3.5) * cwPx, (r0 + 1) * chPx, S);
  }
  if (scene === 'fire' && V.lake) {
    // the campfire: the logs and the stones behind, the flames over them (a step of flicker every tenth
    // of a second: low by day, high at night, roaring on a kick), the stones in front over their foot
    const fx = 0.5 * aspect * H, fy = (1 - V.lake[1]) * H;
    at(A.fireback, fx, fy + 2 * S, S, false, 0.75, 0);
    at(A[`flame${night ? (kick > 0.45 ? 2 : 1) : 0}_${Math.floor(t * 10) % 6}`], fx, fy - 4 * S, S, false, 0.75, 1);
    at(A.firefront, fx, fy + 4 * S, S, false, 0.75, 0);
  }
  if (scene === 'fire') {
    // the owl on its branch: awake at night, blinking every fourth beat; asleep by day
    const oc = Math.floor((0.03 * wide * aspect + mix(0.05, 0.075, wide)) / cw), orow = Math.floor((1 - mix(0.5, 0.56, wide)) / ch);
    at(A[night && (((beats / 4) % 1) + 1) % 1 <= 0.94 ? 'owl0' : 'owl1'], (oc + 0.5) * cwPx, (orow + 2) * chPx, S);
  }
  if (scene === 'snow' && V.lake) {
    // the snowman beside the cabin
    const cs = mix(0.7, 1, wide), cabX = mix(0.8, 0.76, wide) * aspect, sc = Math.floor((cabX - 0.1 * cs - mix(0.035, 0.05, wide)) / cw);
    at(A.snowman, (sc + 0.5) * cwPx, Math.floor((1 - (V.lake[0] + 0.004)) / ch) * chPx, S, false, 0.75, 0.6);
  }
  if (scene === 'city' && V.lake) {
    // the cat on its roof, its tail swishing on the beat; the people walking the far pavement
    const base = V.lake[0], foot = base + 0.025, cb = bldgJS((0.5 + 0.06 * wide) * aspect + 0.2);
    at(A[((beats % 1) + 1) % 1 < 0.5 ? 'cat0' : 'cat1'], (cb[0] + cb[1] * 0.7) * H + 2 * cwPx, (1 - (foot + cb[2])) * H, S);
    for (let k = 0; k < 5; k++) {
      const v = (0.025 + 0.03 * h1JS(k * 3.3)) * (h1JS(k * 7.1) < 0.5 ? -1 : 1), span = aspect + 0.2;
      const x = ((((h1JS(k * 5.9) * 3 + v * t) % span) + span) % span) - 0.1;
      at(A[`walker${Math.floor(h1JS(k * 9.7) * 4)}_${Math.floor(t * 4 + k) % 2}`], x * H, (1 - base) * H, S, v < 0, 0.75, 0.45);
    }
  }
  if (scene === 'falls' && V.lake) {
    // the trout leaping from the pool beside the falls' foot (every 8 bars, and on a drop): up and over
    // toward the falls and back in, nose up rising, down falling (as the shader's leap: its splashes)
    const age = t - popAt, side = Math.floor(popAt * 3.7) % 2 ? 1 : -1;
    if (age >= 0 && age < 1) {
      const x0 = 0.5 * aspect + side * 0.15, x1 = 0.5 * aspect + side * 0.06;
      const fy = V.lake[0] - 0.02 + 0.16 * Math.sin(Math.PI * age);
      at(A[age < 0.38 ? 'trout0' : age < 0.62 ? 'trout1' : 'trout2'], mix(x0, x1, age) * H, (1 - fy) * H + (TROUT_H * S) / 2, S, side > 0, 0.75, 0.35);
    }
  }
  if (birds && birds[3] > 0.5 && SKY_SCENES.has(scene)) {
    // the day sky's flock crossing, in its V: the lead, then the others in rank behind it to either side,
    // each bobbing a little, each flapping out of step with the next (as the shader's sky had them)
    for (let k = 0; k < 7; k++) {
      const side = k === 0 ? 0 : k % 2 === 1 ? 1 : -1, rank = Math.floor((k + 1) / 2);
      const bx = birds[0] + rank * 0.03, by = birds[1] + side * rank * 0.02 + 0.003 * Math.sin(t * 2 + k * 1.7);
      at(A[(Math.floor(beats * 2) + k) % 2 ? 'bird1' : 'bird0'], bx * H, (1 - by) * H + (BIRD_H * S) / 2, S, false, 0.6);
    }
  }
  if (night && MOON_SCENES.has(scene) && V.sun) {
    const k = Math.max(1, Math.ceil((2 * 0.07 * H) / MOON_D));
    out.push([A[MOON_OF[scene][1] < 1 ? scene + 'Moon' : 'moon'], Math.round(V.sun[0] * W - (MOON_D * k) / 2), Math.round((1 - V.sun[1]) * H - (MOON_D * k) / 2), k, false, 0.25]);
  }
  if (scene === 'space' && V.lake && V.sun) {
    // the Earth where the sun is, Saturn small and far off (their own light, not the night's tint)
    at(A.earth, V.sun[0] * W, (1 - V.sun[1]) * H + (A.earth[3] * S) / 2, S, false, 0.25, 1);
    if (V.planet) at(A.saturn, V.planet[0] * W, (1 - V.planet[1]) * H + (A.saturn[3] * S) / 2, S, false, 0.25, 1);
    // the astronaut, floating on its line from the window's top, a little up and down, now and then
    // blinking
    if (V.astro) {
      const bob = Math.round(2 * S * (1 + Math.sin(t * 1.1)));
      at(A[((beats % 16) + 16) % 16 > 15.6 ? 'astro1' : 'astro0'], V.astro[0] * W, (A.astro0[3] - 5) * S + bob, S, false, 0.6, 0.5);
    }
    // the lander on the ground, its lamp lit by the kick at night
    const L = spaceLander(V, W, H, S);
    at(A.lander, L.x, L.y, S, false, 0.75, 0.5);
    // the toast that popped, a slice each way, tumbling away end over end (the two turning opposite ways)
    const pa = t - popAt;
    if (pa > 0.35 && pa < 10) {
      const T = spaceToaster(V, W, H, t), age = pa - 0.35, k = 2 * S;
      for (let i = 0; i < 2; i++) {
        const x = T.x + (i ? 3 : -3) * k + (i ? 0.03 : -0.04) * age * H, y = T.y - 5 * k - (i ? 0.055 : 0.065) * age * H;
        const turn = (Math.floor(age * 4) + i * 2) % 4;
        if (y > -10 * k) at(A[`toast${i ? (4 - turn) % 4 : turn}`], x, y + (SLICE_D * S) / 2, S, false, 0.7, 0.5);
      }
    }
  }
  if (scene === 'garden' && V.lake) {
    const aspect = W / H, near = V.lake[1], bank = V.lake[0], fish = [];
    for (let i = 0; i < 4; i++) {
      const ph = swim * [0.55, 0.7, 0.62, 0.8][i] + i * 2.4;
      const fx = ([0.2, 0.42, 0.62, 0.84][i] + [0.1, 0.08, 0.11, 0.07][i] * Math.sin(ph)) * aspect;
      const fy = near + (bank - near) * [0.22, 0.5, 0.3, 0.58][i] + 0.015 * Math.sin(ph * 2 + i);
      fish.push([fy, A[`koi${i}_${Math.round(Math.sin(t * 9 + i * 3)) + 1}`], fx * H, (1 - fy) * H, Math.cos(ph) <= 0]);
    }
    fish.sort((a, b) => b[0] - a[0]);
    for (const [, f, x, y, left] of fish) out.push([f, Math.round(x - (KOI_W * S) / 2), Math.round(y - (KOI_H * S) / 2), S, left, 0.75]);
  }
  return out.slice(0, PIX_MAX);
}

// The eye's clip: renderer/eye/eye.mp4, 960x540, 30 frames a second, 15.8 s: Pexels video 32198166 (a
// brown eye, close), its first 3.95 s at half speed (shot at 60 a second, so every frame its own), a little
// smoothed, played forward and then back, so it loops without a seam: it looks out, calm, and at the turn
// blinks. The window that was reflected in it, just right of the pupil, is painted out (in glyphs it read as
// a square): filled from the iris across the pupil, blended in. Where the eye sits in it (its middle: shares of the width and the height down); eyeW, how much of
// the clip's width it's shown across; when it's blinking (no pupil to dive into, s); the pupil as it
// drifts (every 0.5 s of the clip's first half, mirrored in its second: its middle, shares of the width
// and the height) and its radius (a share of the height)
const EYE_CLIP = {
  box: [0.66, 0.47], eyeW: 0.62, aspect: 16 / 9, len: 15.77, blink: [6.6, 9.17], r: 0.0769,
  pupil: [[0.6516, 0.4684], [0.6534, 0.469], [0.6555, 0.4701], [0.6575, 0.4696], [0.66, 0.4696], [0.6616, 0.4695], [0.6638, 0.4687], [0.6657, 0.4657], [0.6676, 0.465], [0.6731, 0.4652], [0.6747, 0.4653], [0.6749, 0.4649], [0.6744, 0.4619], [0.6736, 0.4603], [0.6756, 0.4507]],
};
// how much of the clip's height the window's height shows, for the eye to span `span` of its width
const eyeShow = (aspect, span) => (EYE_CLIP.eyeW * EYE_CLIP.aspect) / (span * aspect);
// the pupil in the window at the clip's time c: its middle (window heights, y up) and its radius; E the
// eye's middle in the window (window heights, y up), k as eyeShow
function eyePupil(E, k, c) {
  const n = EYE_CLIP.pupil.length, f = Math.min(n - 1, Math.max(0, (c > EYE_CLIP.len / 2 ? EYE_CLIP.len - c : c) / 0.5));
  const a = EYE_CLIP.pupil[Math.floor(f)], b = EYE_CLIP.pupil[Math.min(n - 1, Math.floor(f) + 1)], w = f - Math.floor(f);
  const u = a[0] + (b[0] - a[0]) * w, v = a[1] + (b[1] - a[1]) * w, [bu, bv] = EYE_CLIP.box;
  return [E[0] + ((u - bu) * EYE_CLIP.aspect) / k, E[1] - (v - bv) / k, EYE_CLIP.r / k];
}
// The eye's dive into its pupil (see EYE): how far in at t, 0 (not diving) to 1: in over EYE_DIVE s from
// diveAt, held, out over EYE_DIVE s from outAt
const EYE_DIVE = 4;
function eyeDive(e, t) {
  if (t < e.diveAt || t > e.outAt + EYE_DIVE) return 0;
  return t < e.outAt ? Math.min(1, (t - e.diveAt) / EYE_DIVE) : 1 - Math.min(1, (t - e.outAt) / EYE_DIVE);
}
// how much bigger it's drawn about the pupil, s in (1: not diving), till the pupil fills the window (zmax):
// eased, creeping in a little while held
function eyeZoom(e, t, s, zmax) {
  if (s <= 0) return 1;
  const k = s * s * (3 - 2 * s), held = Math.max(0, Math.min(t, e.outAt) - e.diveAt - EYE_DIVE);
  return Math.exp(k * Math.log(zmax)) * (1 + 0.004 * held * k);
}
// The space scene's toaster: its middle (CSS pixels), floating, drifting slowly to and fro and up and down
const spaceToaster = (V, W, H, t) => ({ x: (V.toaster.x + 0.014 * Math.sin(t * 0.21)) * W, y: (1 - V.toaster.y - 0.02 * Math.sin(t * 0.37 + 1)) * H });
// its lander: the foot's middle, and where the cord's plug goes (CSS pixels); S the pixels' size
function spaceLander(V, W, H, S) {
  const x = V.toaster.x * W - 0.19 * H, y = (1 - V.lake[1]) * H;
  return { x, y, plug: [x + (LANDER_PLUG[0] - LANDER_W / 2) * S, y - (LANDER_H - LANDER_PLUG[1]) * S] };
}
// The cord, in the toaster's sprite, in the scene's own pixels: its curve (a Bezier's four points: from the
// plug in the lander's socket, rising and bowing out to the left, round into the toaster's side, a little
// sway in it) and the canvas to hold it all and the toaster (twice its size: its box at
// ox, oy), placed so the plug's pixel lands in the socket (the toaster moving a whole pixel at
// a time with it); a kick's ripple running up it (wave: how far along, -1 none)
function spaceCord(V, W, H, S, T, t, kickAge, night) {
  const L = spaceLander(V, W, H, S);
  const px = Math.round((L.plug[0] - (T.x - SW * S)) / S), py = Math.round((L.plug[1] - (T.y - SH * S)) / S);
  const sx = Math.round(5 * Math.sin(t * 0.6)), sy = Math.round(4 * Math.sin(t * 0.45 + 1));
  // (bow: how far out it bows, less in a tall window, where the code's panels are to that side)
  const end = [30, 32], dy = Math.max(8, py - end[1]), bow = V.bow ?? 1;
  const pts = [[px + 0.5, py + 0.5], [px - 0.25 * dy * bow + sx, py - 0.75 * dy], [end[0] - Math.max(12, 0.55 * dy) * bow, end[1] + 0.12 * dy + sy], end];
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.floor(Math.min(0, ...xs)) - 6, y0 = Math.floor(Math.min(0, ...ys)) - 6;
  const w = Math.ceil(Math.max(2 * SW, ...xs)) + 6 - x0, h = Math.ceil(Math.max(2 * SH, ...ys)) + 6 - y0;
  const wave = kickAge < 0.7 ? Math.floor(kickAge * 24) : -1;
  return { ox: -x0, oy: -y0, w, h, k: S, px: px - x0, py: py - y0, pts: pts.map(([x, y]) => [x - x0, y - y0]), wave, night, x: L.plug[0] - (px - x0) * S, y: L.plug[1] - (py - y0) * S, key: `${x0} ${y0} ${w} ${h} ${px} ${py} ${sx} ${sy} ${wave} ${night}` };
}
// The sprite: the toaster (see drawBoat, drawn at its own size and doubled), and behind it its cord;
// paler at night (against the dark)
function drawSpace(cv, g, boat, c) {
  if (cv.width !== c.w || cv.height !== c.h) { cv.width = c.w; cv.height = c.h; }
  g.clearRect(0, 0, c.w, c.h);
  const tc = drawSpace.tc || (drawSpace.tc = Object.assign(document.createElement('canvas'), { width: SW, height: SH }));
  drawBoat(tc.getContext('2d'), boat);
  g.imageSmoothingEnabled = false;
  g.drawImage(tc, c.ox, c.oy, 2 * SW, 2 * SH);
  const [P0, P1, P2, P3] = c.pts;
  const n = Math.ceil(Math.hypot(P3[0] - P0[0], P3[1] - P0[1]) * 4) + 30, core = new Map();
  for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s;
    let x = u * u * u * P0[0] + 3 * u * u * s * P1[0] + 3 * u * s * s * P2[0] + s * s * s * P3[0];
    let y = u * u * u * P0[1] + 3 * u * u * s * P1[1] + 3 * u * s * s * P2[1] + s * s * s * P3[1];
    const tx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * s * (P2[0] - P1[0]) + 3 * s * s * (P3[0] - P2[0]);
    const ty = 3 * u * u * (P1[1] - P0[1]) + 6 * u * s * (P2[1] - P1[1]) + 3 * s * s * (P3[1] - P2[1]);
    const tl = Math.hypot(tx, ty) || 1;
    let nx = -ty / tl, ny = tx / tl;
    if (ny > 0) { nx = -nx; ny = -ny; }
    if (c.wave >= 0) { const at = c.wave / 17, bump = 3 * (1 - at) * Math.exp(-(((s - at) / 0.08) ** 2)); x += nx * bump; y += ny * bump; }
    core.set(`${Math.floor(x)},${Math.floor(y)}`, [Math.floor(x), Math.floor(y)]);
  }
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = c.night ? '#9a9ab4' : '#34343f';
  for (const [X, Y] of core.values()) g.fillRect(X, Y, 1, 1);
  g.globalCompositeOperation = 'source-over';
  // the plug, in the socket
  g.fillStyle = '#c9c9d4';
  g.fillRect(c.px - 1, c.py - 1, 2, 2);
}

// The boat: a little toaster fishing from a rowboat on the lake, in pixels (after the stream's
// fisher in a boat; the toaster is ours). It bobs a pixel a beat, the float dips on each kick, and
// the toast pops up on a drop and every 8 bars. By the sea it fishes from a rock; at the campfire
// it sits on a log, toasting a slice of bread on a stick (browning through each 8 bars). 40 x 28
// pixels; the water's line (or the ground's) at 22.
const SW = 40, SH = 28, WATER = 22.5;
function drawBoat(g, { dy, pop, dip, on = 'boat', toast = 0, gone = false }) {
  g.clearRect(0, 0, SW, SH);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y + dy, w, h); };
  if (on === 'float' || on === 'pad') {
    // Seen from above (the sharks' scene): a ring, red and white, shaded down and to the right, a
    // shine on its top left; or (the koi pond) a lily pad, its notch cut in from its edge, its veins
    // running out from its middle, its rim paler. On it the toaster, its two slots, the toast in them
    // (risen when it pops), the lever at its side, and its face on the front
    const cx = 20, cy = 14;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const dx = x + 0.5 - cx, dy2 = y + 0.5 - cy, d = Math.hypot(dx, dy2);
        if (on === 'pad') {
          const a = Math.atan2(dy2, dx), lit = -(dx + dy2) / (d || 1);
          if (d > 12.6 || (d > 1.5 && Math.abs(a - 0.8) < 0.04 + 0.022 * d)) continue;
          const vein = d > 2.5 && d < 11.4 && Math.abs(((a - 0.8 + Math.PI * 2 + 0.349) % 0.6981) - 0.349) * d < 0.5;
          rect(x, y, 1, 1, d > 11.4 ? (lit < -0.3 ? '#5e9a48' : '#8cc46a') : vein ? '#3a6e38' : lit > 0.35 ? '#62a454' : lit < -0.35 ? '#3f7a3e' : '#4f8f47');
          continue;
        }
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
  if (!gone) for (const x of [14, 19]) { rect(x, ty, 3, 9 - ty, '#e0a860'); rect(x, ty, 3, 1, '#a8682e'); }
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
  } else if (on === 'space' || on === 'eye') {
    // (nothing under it: floating, on its cord (see drawSpace); the eye's isn't drawn)
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
  } else if (on === 'decks') {
    // the festival's decks, the toaster behind them in headphones: the table, its front lit in a
    // strip of two colours; a turntable at each end, its tonearm over it; the mixer in the middle,
    // its knobs lit; the headphones' band over the toast, a cup either side
    rect(2, 17, 36, 1, '#4a4a5e'); rect(2, 18, 36, 5, '#20202a'); rect(2, 18, 36, 1, '#34343f');
    for (let x = 4; x < 36; x += 4) rect(x, 20, 2, 1, x % 8 ? '#5ce1ff' : '#ff5cbf');
    for (const px of [3, 29]) {
      rect(px, 16, 8, 1, '#111118'); rect(px + 3, 15, 2, 1, '#26262f');
      rect(px < 20 ? px + 7 : px, 14, 1, 2, '#b8b8c8');
    }
    rect(14, 16, 12, 1, '#2a2a35');
    rect(15, 15, 1, 1, '#ffd34a'); rect(18, 15, 1, 1, '#5ce1ff'); rect(21, 15, 1, 1, '#ff5cbf'); rect(24, 15, 1, 1, '#9cff6a');
    rect(12, 6, 12, 1, '#2a2a33'); rect(11, 7, 1, 4, '#2a2a33'); rect(24, 7, 1, 4, '#2a2a33');
    rect(10, 11, 2, 4, '#ff5cbf'); rect(24, 11, 2, 4, '#ff5cbf'); rect(10, 11, 1, 4, '#c43c94'); rect(25, 11, 1, 4, '#c43c94');
    return;
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
  if (on === 'bridge' || on === 'tube' || on === 'space' || on === 'eye') return;
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
// and flinch from the float on each kick. A bait ball shelters under the float, milling round it,
// bursting a little on each kick and drawing back in. On a drop (and every 8 bars, with the toast) the
// sharks get hungry: they charge the bait ball, each straight through from its own side and back for
// another pass, a catch at a time, the water boiling white where they cut through, till it's scattered
// (or gone: then they hunt the nearest fish ahead of them, the strays sooner than those in a crowd). A
// caught fish leaves a splash of bubbles and comes back later with a new school swimming in from an
// edge; the bait ball's come back to it, and it re-forms under the float.
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
// how long the sharks are for the window's shape (a tall window's narrower, so they're shorter)
const sharkSize = (aspect) => (aspect >= 1 ? 0.56 : 0.5) * Math.min(1, aspect);
function newSea(cols, rows, cw, ch, aspect, fx, fy) {
  const n = cols * rows, side = Math.min(1, aspect);
  const sea = {
    cols, rows, cw, ch, aspect, fx, fy, t: 0, acc: 0, sharks: [], fish: [], lastSchool: 0, hunger: 0,
    // (the middle of the sharks' rounds: across, between the window's middle and the float; up and
    // down, the window's middle; how far a fish sees)
    cx: 0.65 * (aspect / 2) + 0.35 * fx, cy: 0.5, R: Math.max(3 * ch, 5.5 * cw),
    wake: new Float32Array(n), wake2: new Float32Array(n), splash: new Float32Array(n), data: new Uint8Array(n * 4), seen: new Uint32Array(n), frame: 0,
  };
  const sx = aspect >= 1 ? 1.3 : 1, sy = aspect >= 1 ? 1 : 1.5;
  SHARK_KINDS.forEach((k, i) => {
    const L = sharkSize(aspect) * k.size, ring = side * between(0.25, 0.35), a = (i / SHARK_KINDS.length) * 2 * Math.PI + between(-0.4, 0.4), dir = i % 2 ? -1 : 1;
    const x = sea.cx + Math.cos(a) * ring * sx, y = sea.cy + Math.sin(a) * ring * sy, head = a + (dir * Math.PI) / 2;
    const nodes = new Float32Array(SPINE * 2), seg = L / (SPINE - 1);
    for (let j = 0; j < SPINE; j++) { nodes[2 * j] = x - Math.cos(head) * seg * j; nodes[2 * j + 1] = y - Math.sin(head) * seg * j; }
    sea.sharks.push({ ...k, id: i + 1, L, ring, dir, nodes, head, speed: 0.04, phase: between(0, 6.28), turn: 0, wander: 0, prey: null, look: 0 });
  });
  const total = within(Math.round(n / 80), 60, 220);
  // (the bait ball under the float, its own: back to it when nothing's after it)
  for (let j = 0; j < 70; j++) {
    const a = Math.random() * 2 * Math.PI, r = 0.06 + 0.03 * Math.random(), sc = SCHOOLS[0];
    sea.fish.push({ x: fx + Math.cos(a) * r * 1.3, y: fy + Math.sin(a) * r, vx: -Math.sin(a) * sc.cruise, vy: Math.cos(a) * sc.cruise, kind: 0, alarm: 0, alive: true, back: 0, turn: 0, near: between(0.55, 1), mill: 1, home: true });
  }
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
// The window's size changed: the same sharks and fish, moved across with it (each body with its
// snout: the spine's laid out again from there each step), the sharks' length and rounds following
// the window's shape; the water's cells made again at the new size, the wakes starting afresh.
// (Made anew, as they were, every one of them jumped somewhere new, every frame of a drag)
function fitSea(sea, cols, rows, cw, ch, aspect) {
  const k = aspect / sea.aspect, grow = sharkSize(aspect) / sharkSize(sea.aspect), side = Math.min(1, aspect) / Math.min(1, sea.aspect), n = cols * rows;
  for (const s of sea.sharks) {
    const dx = s.nodes[0] * (k - 1);
    for (let j = 0; j < s.nodes.length; j += 2) s.nodes[j] += dx;
    s.L *= grow;
    s.ring *= side;
  }
  for (const f of sea.fish) f.x *= k;
  Object.assign(sea, { cols, rows, cw, ch, aspect, R: Math.max(3 * ch, 5.5 * cw) });
  if (sea.data.length !== n * 4) Object.assign(sea, { wake: new Float32Array(n), wake2: new Float32Array(n), splash: new Float32Array(n), data: new Uint8Array(n * 4), seen: new Uint32Array(n) });
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
  // (the bait ball: where its fish are, while there are enough of them to call it one)
  let bx = 0, by = 0, bn = 0;
  for (const f of sea.fish) if (f.alive && f.home) { bx += f.x; by += f.y; bn++; }
  sea.ball = bn >= 8 ? { x: bx / bn, y: by / bn, n: bn } : null;
  swimFish(sea, dt, m, bc, br, bucket);
  swimSharks(sea, dt, m, bucket);
  stirSea(sea, dt, m);
  // (caught fish back as a school from an edge, now and then)
  // (the bait ball's own come back together, to it)
  let due = sea.fish.filter((f) => !f.alive && f.back <= sea.t);
  const home = due.filter((f) => f.home);
  due = home.length * 2 >= due.length ? home : due.filter((f) => !f.home);
  if (due.length && (due.length >= 6 || sea.t - sea.lastSchool > 9)) {
    sea.lastSchool = sea.t;
    const edge = Math.floor(Math.random() * 4), u = between(0.15, 0.85), kind = due[0].home ? 0 : Math.floor(Math.random() * SCHOOLS.length), sc = SCHOOLS[kind];
    const x = edge === 0 ? -0.03 : edge === 1 ? sea.aspect + 0.03 : u * sea.aspect, y = edge === 2 ? -0.03 : edge === 3 ? 1.03 : u;
    const d = Math.atan2(0.5 - y, sea.aspect / 2 - x) + between(-0.5, 0.5), mill = due[0].home || Math.random() < 0.5 ? 1 : -1;
    for (const f of due.slice(0, due[0].home ? due.length : sc.n[1])) Object.assign(f, { alive: true, kind, alarm: 0, turn: 0, mill, x: x + between(-1, 1) * R, y: y + between(-1, 1) * R, vx: Math.cos(d) * sc.cruise * 1.4, vy: Math.sin(d) * sc.cruise * 1.4 });
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
      const keep = sc.keep * (1 - 0.8 * f.alarm) * (f.home ? 0.25 : 1);
      ax += (vx / n - f.vx) * 1.4 * sc.line + (mx / n) * keep;
      ay += (vy / n - f.vy) * 1.4 * sc.line + (my / n) * keep;
      if (sc.mill && !f.home) { const l = Math.hypot(mx, my) || 1; ax -= (my / l) * f.mill * sc.mill * (1 - f.alarm); ay += (mx / l) * f.mill * sc.mill * (1 - f.alarm); }
    }
    // the sharks: away from the nearest part of the front half of each, and off to the side of its path
    let fear = 0;
    for (const s of sharks) {
      // (the bait ball holds together while they're only going round: only a snout right on it, or a
      // charge, breaks it)
      const far = f.home && sea.hunger <= 0.3 ? 0.08 : s.L * 0.6 + 0.075;
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
      if (d < 0.2 && d > 1e-6) { const k = (1 - d / 0.2) * (f.home ? 0.07 : 0.12); f.vx += (dx / d) * k; f.vy += (dy / d) * k; fear = Math.max(fear, (f.home ? 0.25 : 0.5) * (1 - d / 0.2)); }
    }
    // (the bait ball's: back round the float when nothing's after them, a ring about it clear of it,
    // all swimming round it the same way)
    if (f.home) {
      const hx = f.x - sea.fx, hy = f.y - sea.fy, hd = Math.hypot(hx, hy) || 1, off = hd - 0.075, calmK = 1 - f.alarm;
      const k = (Math.abs(off) > 0.012 ? off - Math.sign(off) * 0.012 : 0) * 4 * calmK;
      ax -= (hx / hd) * k; ay -= (hy / hd) * k;
      ax += ((-hy / hd) * sc.cruise * 1.2 - f.vx) * 1.5 * calmK;
      ay += ((hx / hd) * sc.cruise * 1.2 - f.vy) * 1.5 * calmK;
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
    ay -= f.vy * sc.level * (f.home ? 0.2 : 1) * (1 - 0.7 * f.alarm);
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
    // hungry with the bait ball there: a charge, at the ball's middle and a little to its own side,
    // aiming on through (past the middle the aim's behind it, so it turns back for another pass);
    // else hunting: the fish it's after, where it's about to be; or its round
    const ball = sea.hunger > 0.3 ? sea.ball : null;
    if (sea.hunger > 0.3 && !ball && t >= s.look) { s.prey = findPrey(sea, s, bucket); s.look = t + 0.45; }
    if (sea.hunger <= 0.3 || ball) s.prey = null;
    // (a fish that's run for an edge is let go)
    if (s.prey && !(s.prey.alive && huntGround(sea, s.prey, 0.6))) { s.prey = null; s.look = Math.min(s.look, t + 0.15); }
    const f = s.prey;
    let close = 0;
    if (ball) {
      const side = (s.id - 2) * 0.025, bx = ball.x - x, by = ball.y - y, bd = Math.hypot(bx, by) || 1;
      const tx = bx + (bx / bd) * 0.12 - (by / bd) * side, ty = by + (by / bd) * 0.12 + (bx / bd) * side, d = Math.hypot(tx, ty) || 1;
      dx += (tx / d) * 4; dy += (ty / d) * 4;
      close = within(1 - bd / (L * 0.9), 0, 1);
      // (the water boiling white where it cuts through)
      if (bd < 0.06) stamp(sea, sea.splash, x, y, 1, 0.35);
    } else if (f) {
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
        if (d < far && d > 1e-6) { const w = (1 - d / far) * (ball ? 0.8 : 3); dx += (ox / d) * w; dy += (oy / d) * w; }
      }
    }
    // clear of the float (unless it's chasing), and back in when its snout's out of the window
    const ex = x - fx, ey = y - fy, e = Math.hypot(ex, ey), clear = (f || ball ? 0.11 : 0.17) + 0.1 * L;
    if (e < clear && e > 1e-6) { const w = (1 - e / clear) * (f ? 1 : ball ? 0.4 : 2.5); dx += (ex / e) * w; dy += (ey / e) * w; }
    const over = Math.max(-x, x - aspect, -y, y - 1);
    const near = L * (f || ball ? 0.45 : 0.3);
    if (over > -near) { const w = within((over + near) / (L * 0.35), 0, 1) * 3.5 + (over > 0 ? 3 : 0), tx = cx - x, ty = cy - y, d = Math.hypot(tx, ty) || 1; dx += (tx / d) * w; dy += (ty / d) * w; }
    // its turn: no sharper than its speed allows (out of the window, where it doesn't show, as sharp
    // as when hunting; sharper still charging the ball just after a drop)
    const chase = f || ball, most = Math.min(chase || over > 0 ? 1.7 + close + (ball ? 1.3 * sea.hunger : 0) : 0.8, s.speed / (L * (ball ? 0.22 : chase || over > 0 ? 0.35 : 0.3))) * dt, turned = within(turnTo(s.head, Math.atan2(dy, dx)), -most, most);
    s.head += turned;
    s.turn += (turned / dt - s.turn) * Math.min(1, dt * 3);
    // (charging the ball: fastest just after the drop, easing as the hunger fades)
    const cruise = (0.03 + 0.06 * L) * m.pace, want = ball ? cruise * (3.2 + 1.2 * close) * (1 + 0.8 * sea.hunger) : f ? cruise * (1.45 + 1.5 * close) : cruise;
    s.speed += (want - s.speed) * Math.min(1, dt * (ball ? 3.5 : 1.1));
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
    // a catch (in a charge one at a time, the hunger lasting: it's the ball they're after)
    if (f || (ball && t - (s.ate ?? -9) > 0.4)) {
      const r = L * 0.05 + 0.01;
      for (const g of sea.fish) {
        if (g.alive && (g.x - nodes[0]) ** 2 + (g.y - nodes[1]) ** 2 < r * r) {
          g.alive = false;
          g.back = t + between(3, 8);
          sea.hunger = Math.max(0, sea.hunger - (ball ? 0.02 : 0.08));
          stamp(sea, sea.splash, g.x, g.y, 2, 1);
          if (ball) { s.ate = t; break; }
        }
      }
    }
  }
}
// where the sharks hunt: the window less a margin (m of it: 1 the whole margin, less to let a chase
// run on a little), so a hunt stays in view
const huntGround = (sea, f, m = 1) => {
  const e = m * (0.06 + 0.24 * Math.min(1, sea.aspect));
  return f.x > e && f.x < sea.aspect - e && f.y > e && f.y < 1 - e;
};
// the fish a shark goes for: on its hunting ground, ahead of it, near, and alone rather than in a
// crowd (it keeps after the one it's after unless another's clearly better)
function findPrey(sea, s, bucket) {
  const range = s.L * 0.9 + 0.2, x = s.nodes[0], y = s.nodes[1], ux = Math.cos(s.head), uy = Math.sin(s.head);
  let best = null, bestScore = Infinity, mine = Infinity;
  for (const f of sea.fish) {
    if (!f.alive || !huntGround(sea, f)) continue;
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
      data[4 * i + 3] = Math.round((((Math.atan2(f.vy, f.vx) % Math.PI) + Math.PI) % Math.PI) / Math.PI * 255);
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

// The koi pond (the scene 'koi'), in units of the window's height, y up (as the shader has them), a
// step a 60th of a second at a time, as the sharks' water is. Five koi (four in a tall window) swim
// slow, wandering rounds of the pond, each its own way, giving each other room, keeping clear of the
// toaster's pad and turning back before they leave the window. None turns tighter than a koi can;
// its spine follows its snout a joint at a time, bending so far at each and no further, and a wave
// runs down it as it swims, more toward its tail (stiff, swung from its root). Each kick sends them on
// a little. When the toast pops the one nearest the pad comes to feed (on a drop, all of them,
// darting in, round it like the petals of a flower), nosing at its edge a few seconds, its pectorals
// spread, then drifting off again; food dropped on the water (a click) brings the three nearest to it.
const KOI_SPINE = 13, KOI_JOINTS = 10;
const KOI_KINDS = [
  { kind: 0, size: 1 }, // a kohaku
  { kind: 1, size: 0.92 }, // a showa
  { kind: 3, size: 0.84 }, // a yamabuki ogon
  { kind: 2, size: 0.8 }, // a sanke
  { kind: 4, size: 0.7 }, // an orange ogon
];
// how big the koi are for the window's shape, and how many (fewer in a narrow window)
const koiSize = (aspect) => Math.min(1, 0.55 + 0.45 * aspect), koiCount = (aspect) => (aspect < 0.8 ? 4 : 5);
function newPond(aspect, fx, fy, fr) {
  const sz = koiSize(aspect), count = koiCount(aspect);
  const pond = { aspect, fx, fy, fr, gx: fx, gy: fy, t: 0, acc: 0, koi: [] };
  KOI_KINDS.slice(0, count).forEach((k, i) => {
    const L = 0.42 * sz * k.size, seg = L / 12;
    // (spread about the pond, each somewhere of its own, heading anywhere)
    const x = (0.15 + 0.7 * ((i * 0.618 + 0.3) % 1)) * aspect, y = 0.22 + 0.56 * ((i * 0.382 + 0.55) % 1), head = between(0, 2 * Math.PI);
    const nodes = new Float32Array(KOI_JOINTS * 2);
    for (let j = 0; j < KOI_JOINTS; j++) { nodes[2 * j] = x - Math.cos(head) * seg * j; nodes[2 * j + 1] = y - Math.sin(head) * seg * j; }
    pond.koi.push({ ...k, L, nodes, head, speed: 0.03, turn: 0, wander: between(-0.5, 0.5), phase: between(0, 6.28), fins: [0.3, 0.3], feed: -9, spot: [0, 0], food: [0, 0] });
  });
  return pond;
}
// The window's size changed: the same koi, moved across with it (as the sharks are, see fitSea),
// their length following the window's shape, and where they were feeding with them (and the pad and
// where it's going, so their move isn't taken for Z's)
function fitPond(pond, aspect) {
  const k = aspect / pond.aspect, grow = koiSize(aspect) / koiSize(pond.aspect);
  for (const s of pond.koi) {
    const dx = s.nodes[0] * (k - 1);
    for (let j = 0; j < s.nodes.length; j += 2) s.nodes[j] += dx;
    s.L *= grow;
    s.spot[0] *= k;
    s.food[0] *= k;
  }
  pond.fx *= k;
  pond.gx *= k;
  pond.aspect = aspect;
}
// food on the water at x, y (the pad's, pad: the koi feeding there go where it's going if Z moves
// it; a drop, rush: they dart in): the n koi nearest come to feed for a while (s), each to a place
// of its own r from it, its body lying out from it, in the order the koi are round it, each as near
// as it can be to the side its koi comes from (so they come straight in, none crossing): a few
// coming from one side to places side by side there, else (or many) spaced evenly all round; near
// an edge, only where a body lying out from the food stays in the window, spaced out over that (over
// every side with room, when no one side has room for them all)
function feedKoi(pond, x, y, r, n, long, pad = false, rush = false) {
  const TAU = 2 * Math.PI, K = 72;
  const near = pond.koi.map((s) => [Math.hypot(s.nodes[0] - x, s.nodes[1] - y), s]).sort((a, b) => a[0] - b[0]);
  let come = near.slice(0, n).map(([, s]) => [Math.atan2(s.nodes[1] - y, s.nodes[0] - x), s]);
  if (!come.length) return;
  n = come.length;
  let sx = 0, sy = 0;
  for (const [a] of come) { sx += Math.cos(a); sy += Math.sin(a); }
  const mid = Math.atan2(sy, sx), L = Math.max(...come.map(([, s]) => s.L)), places = [];
  // (the ways out it can lie, in runs: of those with room for them, the one nearest the side
  // they're coming from, else the longest)
  const ok = Array.from({ length: K }, (_, k) => {
    const a = (k / K) * TAU, ex = x + Math.cos(a) * (r + L), ey = y + Math.sin(a) * (r + L);
    return ex > 0.02 && ex < pond.aspect - 0.02 && ey > 0.02 && ey < 0.98;
  });
  const runs = [], middle = ([k, m]) => ((k + m / 2) / K) * TAU;
  for (let k = 0; k < K; k++) {
    if (!ok[k] || ok[(k + K - 1) % K]) continue;
    let m = 0;
    while (m < K && ok[(k + m) % K]) m++;
    runs.push([k, m]);
  }
  const roomy = runs.filter(([, m]) => (m / K) * TAU >= 0.5 * n);
  const run = roomy.length
    ? roomy.reduce((a, b) => (Math.abs(turnTo(middle(a), mid)) <= Math.abs(turnTo(middle(b), mid)) ? a : b))
    : runs.reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0]);
  const side = (gap, centre) => {
    come = come.map(([a, s]) => [turnTo(centre, a), s]).sort((p, q) => p[0] - q[0]);
    come.forEach((c, i) => places.push(centre + (i - (n - 1) / 2) * gap));
  };
  if (!roomy.length && runs.length > 1) {
    // (no side with room for them all, as round a pad in a narrow window: a ring of places spaced
    // evenly all round, turned so they fall where there's room (or nearest it), each moved to the
    // nearest way out with room; the koi to them in the order they come round, turned the way that
    // moves them least)
    const nearest = (k) => {
      for (let d = 0; d < K; d++) {
        if (ok[(k + d) % K]) return (k + d) % K;
        if (ok[(k - d + K) % K]) return (k - d + K) % K;
      }
      return k;
    };
    const apart = (a, b) => Math.min(Math.abs(a - b), K - Math.abs(a - b));
    let ring = [], miss = Infinity;
    for (let k0 = 0; k0 < K / n; k0++) {
      const ks = Array.from({ length: n }, (_, i) => Math.round(k0 + (i * K) / n) % K);
      const m = ks.reduce((sum, k) => sum + apart(k, nearest(k)), 0);
      if (m < miss) { miss = m; ring = ks.map((k) => (nearest(k) / K) * TAU); }
    }
    come.sort((p, q) => p[0] - q[0]);
    let best = 0, least = Infinity;
    for (let j = 0; j < n; j++) {
      const moved = come.reduce((sum, [a], i) => sum + Math.abs(turnTo(ring[(i + j) % n], a)), 0);
      if (moved < least) { least = moved; best = j; }
    }
    come.forEach((c, i) => places.push(ring[(i + best) % n]));
  } else if (run[1] > 0 && run[1] < K) {
    // (their places as near the side they come from as the run allows: round its middle, as far
    // either way as leaves them all in it)
    const len = (run[1] / K) * TAU, gap = Math.min(n >= 4 ? TAU / n : 0.9, len / n), half = (gap * (n - 1)) / 2;
    const c = middle(run), room = Math.max(0, len / 2 - half - gap / 2);
    side(gap, c + within(turnTo(c, mid), -room, room));
  } else if (n <= 3 && Math.hypot(sx, sy) > 0.5 * n) side(0.9, mid);
  else {
    // (the turn of the whole ring of places that moves them least)
    const gap = TAU / Math.max(n, 3);
    come.sort((p, q) => p[0] - q[0]);
    sx = 0; sy = 0;
    come.forEach(([a], i) => { sx += Math.cos(a - i * gap); sy += Math.sin(a - i * gap); });
    const turn = Math.atan2(sy, sx);
    come.forEach((c, i) => places.push(turn + i * gap));
  }
  come.forEach(([, s], i) => {
    s.feed = pond.t + long * between(0.9, 1.1);
    s.spot = [x + Math.cos(places[i]) * r, y + Math.sin(places[i]) * r];
    s.food = [x, y];
    s.pad = pad;
    s.rush = rush;
  });
}
function stepPond(pond, m) {
  const dt = SEA_STEP, { koi, aspect, fx, fy, fr } = pond;
  pond.t += dt;
  const t = pond.t;
  for (const s of koi) {
    const { L, nodes } = s, x = nodes[0], y = nodes[1];
    let dx = Math.cos(s.head), dy = Math.sin(s.head);
    // (a wander: a slowly drifting aim ahead of its snout)
    s.wander = within(s.wander + (Math.random() - 0.5) * dt * 1.8, -0.8, 0.8);
    dx += Math.cos(s.head + s.wander) * 0.45; dy += Math.sin(s.head + s.wander) * 0.45;
    // feeding: a rush to its place by the food, in along its own spoke from the food (swinging out
    // to it first if it's coming from aside), slowing as it comes, stopping there and turning to face
    // the food; just after, turning away
    const feeding = t < s.feed, rush = feeding && s.rush, leaving = !feeding && t < s.feed + 2.5;
    let close = 0, there = 0;
    if (feeding) {
      const ox = s.spot[0] - s.food[0], oy = s.spot[1] - s.food[1], ol = Math.hypot(ox, oy) || 1;
      const px = x - s.food[0], py = y - s.food[1], pl = Math.hypot(px, py) || 1;
      const a = within(((px * ox + py * oy) / (pl * ol) - 0.7) / 0.23, 0, 1), on = a * a * (3 - 2 * a), out = L * 0.6 * (1 - on);
      const tx = s.spot[0] + (ox / ol) * out - x, ty = s.spot[1] + (oy / ol) * out - y, d = Math.hypot(tx, ty) || 1;
      there = within(1 - d / 0.03, 0, 1);
      dx += ((tx / d) * (1 - there) - (px / pl) * there) * 3; dy += ((ty / d) * (1 - there) - (py / pl) * there) * 3;
      close = within(1 - d / (L * 0.7), 0, 1) * on;
    }
    // room for the others
    for (const o of koi) {
      if (o === s) continue;
      for (let k = 0; k < KOI_JOINTS; k += 3) {
        const ox = x - o.nodes[2 * k], oy = y - o.nodes[2 * k + 1], d = Math.hypot(ox, oy), far = (L + o.L) * 0.4;
        if (d < far && d > 1e-6) { const w = (1 - d / far) * (feeding ? 1 : 2.5); dx += (ox / d) * w; dy += (oy / d) * w; }
      }
    }
    // clear of the pad (unless it's feeding there), and back before its snout leaves the window
    const ex = x - fx, ey = y - fy, e = Math.hypot(ex, ey), clear = fr + 0.05 + 0.15 * L;
    const atPad = feeding && Math.hypot(s.food[0] - fx, s.food[1] - fy) < fr + 0.1;
    if (!atPad && e < clear && e > 1e-6) { const w = (1 - e / clear) * 2.5; dx += (ex / e) * w; dy += (ey / e) * w; }
    const edge = 0.06 + 0.45 * L, over = Math.max(-x, x - aspect, -y, y - 1);
    if (!feeding && over > -edge) { const w = within((over + edge) / edge, 0, 1.5) * 3, tx = aspect / 2 - x, ty = 0.5 - y, d = Math.hypot(tx, ty) || 1; dx += (tx / d) * w; dy += (ty / d) * w; }
    // its turn: no sharper than its speed allows (wide as it cruises, tighter to feed, to turn away
    // after or to keep in, tightest darting in on a drop)
    const most = Math.min(rush ? 3 : 1.2, (s.speed + (feeding ? 0.025 : 0.006)) / (L * (rush ? 0.3 : feeding || leaving ? 0.5 : over > -edge ? 0.65 : 1))) * dt, turned = within(turnTo(s.head, Math.atan2(dy, dx)), -most, most);
    s.head += turned;
    s.turn += (turned / dt - s.turn) * Math.min(1, dt * 3);
    // its speed: cruising (slower when it's quiet, faster when it's loud), a little faster after each
    // kick; rushing to the food (darting, on a drop), slowing to a stop at it
    const cruise = (0.025 + 0.05 * L) * m.pace, want = feeding ? cruise * (rush ? 6 : 3) * (1 - close) : cruise * (1 + 0.5 * m.kick);
    s.speed += (want - s.speed) * Math.min(1, dt * (rush ? 5 : feeding ? 3 : 1.5));
    s.phase += dt * (1.5 + s.speed / 0.012);
    // its pectorals: folded back as it cruises, the inner one spread as it turns, both as it noses
    const spread = feeding ? 0.3 + 0.7 * close : 0.15;
    s.fins[0] += (within(spread + s.turn * 1.5, 0, 1) - s.fins[0]) * Math.min(1, dt * 2);
    s.fins[1] += (within(spread - s.turn * 1.5, 0, 1) - s.fins[1]) * Math.min(1, dt * 2);
    nodes[0] += Math.cos(s.head) * s.speed * dt;
    nodes[1] += Math.sin(s.head) * s.speed * dt;
    // the spine after the snout, a joint at a time, each bending so far and no further
    const seg = L / 12;
    let prev = s.head + Math.PI;
    for (let k = 1; k < KOI_JOINTS; k++) {
      const px = nodes[2 * k - 2], py = nodes[2 * k - 1];
      const a = prev + within(turnTo(prev, Math.atan2(nodes[2 * k + 1] - py, nodes[2 * k] - px)), -0.13, 0.13);
      nodes[2 * k] = px + Math.cos(a) * seg;
      nodes[2 * k + 1] = py + Math.sin(a) * seg;
      prev = a;
    }
  }
}
// the koi for the shader: each one's spine (13 points from its snout: its body bent by the swim's
// wave, then its tail straight on from its body's last joint), its kind, length and how far its
// pectorals are spread (left, right), and a box round it (none for a koi that isn't there)
function pondKoi(pond, spine, kinds, boxes) {
  for (let k = 0; k < boxes.length / 4; k++) boxes.set([1, 1, 0, 0], k * 4);
  pond.koi.forEach((s, k) => {
    const { L, nodes } = s, swim = within(s.speed / 0.03, 0.3, 1.4), seg = L / 12;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, lx = 0, ly = 0, px = 0, py = 0;
    const at = (j, x, y) => {
      spine[(k * KOI_SPINE + j) * 2] = x;
      spine[(k * KOI_SPINE + j) * 2 + 1] = y;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    };
    for (let j = 0; j < KOI_JOINTS; j++) {
      const u = j / 12, a = Math.max(0, j - 1), b = Math.min(KOI_JOINTS - 1, j + 1);
      const tx = nodes[2 * a] - nodes[2 * b], ty = nodes[2 * a + 1] - nodes[2 * b + 1], tl = Math.hypot(tx, ty) || 1;
      const off = L * 0.07 * u * u * swim * Math.sin(s.phase - u * 5.5);
      px = lx; py = ly;
      lx = nodes[2 * j] - (ty / tl) * off; ly = nodes[2 * j + 1] + (tx / tl) * off;
      at(j, lx, ly);
    }
    // (its tail, on from its body's last joint the way the body runs there)
    const bx = lx - px, by = ly - py, bl = Math.hypot(bx, by) || 1;
    for (let j = KOI_JOINTS; j < KOI_SPINE; j++) at(j, lx + (bx / bl) * seg * (j - KOI_JOINTS + 1), ly + (by / bl) * seg * (j - KOI_JOINTS + 1));
    const mg = L * 0.3;
    kinds.set([s.kind, L, s.fins[0], s.fins[1]], k * 4);
    boxes.set([x0 - mg, y0 - mg, x1 + mg, y1 + mg], k * 4);
  });
}

export function createScenery(canvas) {
  let gl = null, ready = false, scenes = {}, makeProgram = null, background = false, paint = null, koiPaint = null, sharkPaint = null, beforeTex = null, beforeFbo = null, beforeOk = false, beforeN = 0, latestTex = null, latestFbo = null, latestOk = false, wave = null, fromIdle = false, vao = null, cellTex = null, lifeTex = null, sheetTex = null, spriteTex = null, fbo = null, dims = null, broken = false;
  const boatCv = Object.assign(document.createElement('canvas'), { width: SW, height: SH }), boatG = boatCv.getContext('2d');
  let popAt = -9, dipAt = -9, dropSeen = -99;
  // the eye's state while it's up (its gaze, its dive), what its shader's told; its clip and that clip's
  // texture (made the first time it's shown), whether a frame's waiting to go up, whether one has
  let eye = null, eyeU = null, eyeVid = null, eyeTex = null, eyeDirty = false, eyeHave = false;
  // the photos in its pupil's space (the galaxy, Saturn: see EYE's skyAt), loaded with the clip; their
  // textures (a blank till the photo's decoded)
  let eyePics = null;
  const eyeSkyTex = [null, null];
  const eyeSpacePics = () => {
    if (!eyePics) {
      eyePics = ['galaxy', 'saturn'].map((n) => {
        const pic = { img: Object.assign(new Image(), { src: new URL(`./eye/${n}.jpg`, import.meta.url).href }), ok: false, up: false };
        pic.img.decode().then(() => { pic.ok = true; }, () => {});
        return pic;
      });
    }
    return eyePics;
  };
  const eyeClip = () => {
    if (!eyeVid) {
      eyeVid = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', src: new URL('./eye/eye.mp4', import.meta.url).href });
      for (const ev of ['loadeddata', 'seeked']) eyeVid.addEventListener(ev, () => { eyeDirty = true; });
    }
    return eyeVid;
  };
  // the music: the walk (in beats, kept on the beat), the wind, the glow, the fireflies, the
  // ripples, the birds or a falling star
  let last = 0, walkB = 0, beamB = 0, swimB = 0, car = null, wind = 0.25, glowV = 0, flyV = 0, kickAt = -1, lastBar = null, flock = null, falling = null, glide = null;
  const rips = [], ripV = new Float32Array(16);
  // the sharks' water while their scene is up (a kick for it, the last pop it saw; the sharks for
  // the shader: spines, kinds, boxes, how near)
  let sea = null, seaKick = false, seaPop = -9;
  // (the toaster's sprite as last drawn and as last sent up, and the size the sharks' cells texture
  // was made at: each done again only when it changes)
  let boatKey = null, boatUp = null, lifeSize = null, lifeData = null, lifeDirty = false, pixTex = null, pixUp = false;
  // the koi pond's koi while its scene is up (the last pop it saw, the last drop); the koi for the
  // shader: spines, kinds, boxes
  let pond = null, pondPop = -9, dropAt = -99;
  // (the last food on the water, for the shader: where, when, how far it's spread; food dropped on
  // it since the last frame: where it was clicked, CSS pixels)
  let food = null, dropped = null;
  const koiV = new Float32Array(2 * 5 * KOI_SPINE), koiKV = new Float32Array(20), koiBV = new Float32Array(20);
  // the scene last drawn (it stays up while the next one's program is being compiled)
  let shownScene = null;
  const shkV = new Float32Array(2 * 3 * SPINE), shkKV = new Float32Array(12), shkBV = new Float32Array(12), shkDV = new Float32Array(12);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; });
  // (the sheet drawn again once the app's font is in)
  document.fonts?.ready.then(() => { dims = null; });

  function build(first) {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) { broken = true; return; }
    // A program, compiled and linked; ready() says whether it's done (without waiting for it when
    // the driver compiles in the background, on its own threads), never if it failed (failed() says
    // so, and the scene's left out: one that a weaker graphics card can't take mustn't blank the
    // rest). Until
    // it's ready nothing may ask it anything (that would wait for it). settled() says it's been done
    // a while: a shader the graphics driver hasn't seen before (after an update that changed it)
    // is still being finished on the driver's own threads for a moment after the link says done,
    // and a draw before then waits for it, the whole window frozen (half a second for the bigger
    // scenes); one that came back at once, from the cache, is settled when done. done() notes when
    // it finished, failed or not, without asking anything else. (The sources go in without their
    // comments: the cache knows a shader by its text, and a comment changed would have every scene
    // compiled again, for everyone, after the update)
    const par = gl.getExtension('KHR_parallel_shader_compile');
    const bare = (src) => src.replace(/\/\/[^\n]*/g, '');
    const program = (fs) => {
      const p = gl.createProgram(), vs = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER), asked = performance.now();
      gl.shaderSource(vs, bare(VS));
      gl.compileShader(vs);
      gl.shaderSource(f, bare(fs));
      gl.compileShader(f);
      gl.attachShader(p, vs);
      gl.attachShader(p, f);
      gl.bindAttribLocation(p, 0, 'a');
      gl.linkProgram(p);
      const loc = {};
      let ok = false, bad = false, doneAt = 0;
      const done = () => doneAt || (!par || gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR) ? (doneAt = performance.now()) : 0);
      const ready = () => {
        if (ok) return true;
        if (bad || !done()) return false;
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
          bad = true;
          console.error('scenery: a program failed:', gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p));
          return false;
        }
        ok = true;
        return true;
      };
      const settled = () => ready() && (!par || doneAt - asked < QUICK_MS || performance.now() - doneAt > SETTLE_MS);
      return { p, done, ready, settled, failed: () => { ready(); return bad; }, u: (n) => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(p, n))) };
    };
    makeProgram = program;
    background = !!par;
    scenes = {};
    paint = program(PAINT);
    koiPaint = null;
    sharkPaint = null;
    // (when the driver can compile in the background, the scene asked for is started now and the
    // rest one at a time once it's up (in draw): all started at once, a new version's eleven fought
    // over the processor, the window freezing for up to 3 s at a time and the first scene taking 9 s
    // to come)
    if (par) sceneProgram(first);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    cellTex = gl.createTexture();
    lifeTex = gl.createTexture();
    boatUp = null; lifeSize = null; lifeData = null;
    sheetTex = gl.createTexture();
    spriteTex = gl.createTexture();
    pixTex = gl.createTexture(); pixUp = false;
    fbo = gl.createFramebuffer();
    beforeTex = gl.createTexture(); beforeFbo = gl.createFramebuffer(); beforeOk = false; wave = null;
    latestTex = gl.createTexture(); latestFbo = gl.createFramebuffer(); latestOk = false;
    eyeTex = null; eyeSkyTex[0] = eyeSkyTex[1] = null;
    if (eyePics) for (const pic of eyePics) pic.up = false;
    dims = null;
    ready = true;
  }
  // each scene's program (the library and its own part): where the driver compiles in the
  // background, the one shown first made when the scenery starts and the rest one at a time after
  // it; otherwise each the first time it's shown. (The koi pond's paint program with it: its koi in
  // pixels, see KOI_PX)
  const sceneProgram = (name) => {
    if (scenes[name]) return scenes[name];
    if (name === 'sharks' && !sharkPaint) {
      try { sharkPaint = makeProgram(PAINT_SHARK); }
      catch (err) {
        console.error('scenery: the sharks in pixels', err);
        sharkPaint = { done: () => true, ready: () => false, settled: () => false, failed: () => true };
      }
    }
    if (name === 'koi' && !koiPaint) {
      try { koiPaint = makeProgram(PAINT_KOI); }
      catch (err) {
        if (gl?.isContextLost()) throw err;
        console.error('scenery: the koi in pixels', err);
        koiPaint = { done: () => true, ready: () => false, settled: () => false, failed: () => true };
      }
    }
    try {
      const source = LIB + (MAINS[name] || MAINS.lake);
      return (scenes[name] = makeProgram(['sharks', 'garden', 'koi', 'halloween'].includes(name) ? rolledSceneSource(source) : source));
    }
    catch (err) {
      if (gl?.isContextLost()) throw err;
      console.error('scenery:', name, err);
      return (scenes[name] = { done: () => true, ready: () => false, settled: () => false, failed: () => true });
    }
  };

  // The scenery getting ready, nothing to show yet (its first scene compiling): the paint pass alone, the
  // field of glyphs (see PAINT's idle), kept as the picture before, so the first scene decodes in over it
  function drawIdle(t, col) {
    const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (!dims || dims.W !== W || dims.H !== H || dims.dpr !== dpr) layout(W, H, dpr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindVertexArray(vao);
    gl.useProgram(paint.p);
    const p = paint.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cellTex); gl.uniform1i(p('cells'), 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, sheetTex); gl.uniform1i(p('sheet'), 2);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, beforeTex); gl.uniform1i(p('before'), 6);
    // (every sampler on a unit of its own, as the scene's draw has them: left on unit 0 with the cells'
    // integer texture, the boat's and the pixel layer's would make the draw fail, the window black)
    gl.uniform1i(p('sprite'), 3);
    gl.uniform1i(p('pixAt'), 4);
    gl.uniform1f(p('idle'), 1);
    gl.uniform1f(p('time'), t % CLOCK);
    gl.uniform2f(p('grid'), dims.cols, dims.rows);
    gl.uniform2f(p('cellPx'), dims.cw, dims.px);
    gl.uniform2f(p('slot'), dims.sw, dims.sh);
    gl.uniform2f(p('sheetSize'), dims.sheetW, dims.sheetH);
    gl.uniform1f(p('perRow'), dims.perRow);
    gl.uniform1f(p('dpr'), dpr);
    gl.uniform1f(p('H'), canvas.height);
    gl.uniform1f(p('glyphs'), SHEET.length);
    gl.uniform3f(p('bg'), col.bg[0] / 255, col.bg[1] / 255, col.bg[2] / 255);
    gl.uniform3f(p('fg'), col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1f(p('idle'), 0);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, beforeFbo);
    gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    beforeOk = true; fromIdle = true;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  }

  // The grid of cells for the window (the scene's picture: each cell packed, glyph and ink, colour, tile), and the
  // sheet: each glyph in a slot the size of a cell, in device pixels.
  function layout(W, H, dpr) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'monospace';
    const m = document.createElement('canvas').getContext('2d');
    const px = cellPxFor(H);
    m.font = `${px}px ${font}`;
    const cw = m.measureText('M'.repeat(50)).width / 50 || 6;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / px);
    const sw = Math.ceil(cw * dpr), sh = Math.ceil(px * dpr), perRow = 16;
    const sheet = document.createElement('canvas');
    sheet.width = perRow * sw;
    sheet.height = Math.ceil(SHEET.length / perRow) * sh;
    const sx = sheet.getContext('2d');
    sx.font = `${px * dpr}px ${font}`;
    sx.textBaseline = 'middle';
    sx.textAlign = 'center';
    sx.fillStyle = '#fff';
    // (each glyph clipped to its slot: some are drawn taller than a cell (the shades ░▒▓), and their ink ran
    // into the slots beside them, so at 1.5 device pixels to the CSS pixel a / came with a block under it)
    SHEET.forEach((g, i) => {
      const x = (i % perRow) * sw, y = Math.floor(i / perRow) * sh;
      sx.save(); sx.beginPath(); sx.rect(x, y, sw, sh); sx.clip();
      sx.fillText(g, x + sw / 2, y + sh * 0.55);
      sx.restore();
    });
    gl.bindTexture(gl.TEXTURE_2D, sheetTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, cols, rows, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cellTex, 0);
    // (the picture before a change of scene, the window's size: kept anew, a change mid-wave cut short;
    // and the latest picture while a wave spreads, for a change that comes before it's done)
    for (const [tex, f] of [[beforeTex, beforeFbo], [latestTex, latestFbo]]) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    }
    beforeOk = false; latestOk = false; wave = null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    dims = { W, H, dpr, cw, px, cols, rows, sw, sh, perRow, sheetW: sheet.width, sheetH: sheet.height };
  }

  return {
    get broken() { return broken; },
    // the scenes, by name
    get scenes() { return Object.keys(MAINS).filter((name) => !scenes[name]?.failed()); },
    get drawnScene() { return shownScene; },
    // food dropped on the koi pond, where it was clicked (CSS pixels)
    feed(x, y) { dropped = { x, y }; },
    // (the canvas shrunk, its full-window buffer freed while it's off)
    clear() {
      canvas.width = canvas.height = 1;
      dims = null;
      rips.length = 0;
      flock = falling = null; lastBar = null;
      sea = null;
      pond = food = dropped = null;
    },
    // col: the theme's colours (0-255), which also say day (a light theme) or night; offset: how far
    // ahead to draw (as the blocks), for the walk; colours: 'own' (the scenery's) or 'theme' (its
    // two); strength: the ASCII backgrounds' strength (with the theme's colours), 1.5 the usual;
    // scene: which (lake, sea, fire, snow); open: the code hidden (Z), so the scene can open out
    draw(t, eng, { col, offset = 0, colours = 'own', strength = 1.5, scene = 'lake', open = false } = {}) {
      if (broken || gl?.isContextLost()) return;
      if (!ready) {
        try { build(scene); } catch (err) { if (!gl?.isContextLost()) { broken = true; console.error('scenery:', err); } return; }
        if (broken) return;
      }
      // (a scene whose program isn't settled yet: the one before stays up meanwhile; with none up
      // yet, nothing till then; one that failed is left out, the one before staying up, or with
      // none the first that's up. Every program is looked at each frame, so it's known when each
      // finished. Once the one asked for has settled (or failed) and nothing else is compiling, the
      // next scene not made yet is started, the ones after it first.)
      let sp;
      try {
        let busy = false;
        for (const k in scenes) if (!scenes[k].done()) busy = true;
        if (koiPaint && !koiPaint.done()) busy = true;
        if (sharkPaint && !sharkPaint.done()) busy = true;
        sp = sceneProgram(scene);
        if (background && !busy && (sp.settled() || sp.failed())) {
          const all = Object.keys(MAINS), at = all.indexOf(scene), next = [...all.slice(at + 1), ...all.slice(0, at)].find((k) => !scenes[k]);
          if (next) sceneProgram(next);
        }
        if (sp.failed()) {
          const up = shownScene && scenes[shownScene]?.ready() ? shownScene : Object.keys(scenes).find((k) => scenes[k].ready());
          if (!up) return;
          scene = up;
          sp = scenes[up];
        }
        const before = shownScene && shownScene !== scene && paint.ready() && scenes[shownScene]?.ready();
        // (the koi pond waits for its paint program too; if that failed, its koi are in the cells)
        if (!paint.settled() || !sp.settled() || (scene === 'koi' && koiPaint && !koiPaint.failed() && !koiPaint.settled()) || (scene === 'sharks' && sharkPaint && !sharkPaint.failed() && !sharkPaint.settled())) {
          // (nothing up yet: the field of glyphs, once the paint pass is ready)
          if (!before) { if (paint.ready()) drawIdle(t, col); return; }
          scene = shownScene;
          sp = scenes[scene];
        }
      } catch (err) { if (!gl?.isContextLost()) { broken = true; console.error('scenery:', err); } return; }
      // (each scene's ripples are its own: the koi pond's start at their own size, the others' at
      // a strength, so those of the scene before go when it changes)
      if (shownScene !== scene) rips.length = 0;
      // (a change of scene with the picture before it kept: the decode, from where the toaster is)
      // (one that comes while a wave's still spreading starts from the picture as it was, half
      // changed, not the one before that wave: changed a beat at a time, each scene came out of the first)
      if (((shownScene && shownScene !== scene) || fromIdle) && beforeOk) {
        if (wave && latestOk) { [beforeTex, latestTex] = [latestTex, beforeTex]; [beforeFbo, latestFbo] = [latestFbo, beforeFbo]; }
        wave = { t0: t }; latestOk = false;
      }
      fromIdle = false;
      shownScene = scene;
      const pondPx = scene === 'koi' && !!koiPaint?.settled();
      const sharksPx = scene === 'sharks' && !!sharkPaint?.settled();
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
      // the lighthouse's beams: a turn every 2 bars, kept on the bars (one facing you on each bar's
      // first beat), but only by turning a little faster or slower, never back: a new bar line or a
      // new tempo has them catch up over a few beats (they used to swing round to it, backward half
      // the time)
      let turn = (bpm / 60) * (eng.silent ? 0.25 : 1);
      if (step !== null) turn *= Math.min(2, Math.max(0.4, 1 + 0.5 * ((((step / 4 - beamB) % 4) + 6) % 4 - 2)));
      beamB += dt * turn;
      // the koi's swim: easy, darting ahead on each kick
      swimB += dt * (0.35 + 2.2 * Math.exp(-Math.max(0, t - dipAt) * 3));
      // the wind and the fireflies: the hats in the last 2 s
      let hats = 0;
      for (const o of eng.onsets) if (o.id === 'hh' && o.t > t - 2) hats++;
      const busy = Math.min(1, hats / 24);
      wind += (0.18 + busy * 0.75 - wind) * (1 - Math.exp(-dt / 1.5));
      flyV += (busy - flyV) * (1 - Math.exp(-dt / 2.5));
      // the sun's rays and the stars' twinkle: the loudness
      const lv = Math.min(1, Math.max(0, (20 * Math.log10(eng.level || 1e-6) + 50) / 50));
      glowV += (lv - glowV) * (1 - Math.exp(-dt / 0.4));
      const tall = H > W ? 1 : 0, aspect = W / H;
      let V = (LAYOUT[scene] || LAYOUT.lake)[tall];
      if (open && OPEN[scene]?.[tall]) V = { ...V, ...OPEN[scene][tall] };
      // (the toaster, the moon, the stage and the land glide to where they're going, over a second or
      // so, when Z's pressed; anything else, a new scene or window, puts them straight there)
      if (!glide || glide.scene !== scene || glide.tall !== tall) glide = { scene, tall, x: V.toaster.x, y: V.toaster.y, moon: V.moon ? [...V.moon] : null, stage: V.stage ? [...V.stage] : null, land: Object.fromEntries(LAND.filter((k) => V[k]).map((k) => [k, [...V[k]]])) };
      const gk = 1 - Math.exp(-dt / 0.45);
      glide.x += (V.toaster.x - glide.x) * gk;
      glide.y += (V.toaster.y - glide.y) * gk;
      if (glide.moon) glide.moon = glide.moon.map((v, i) => v + (V.moon[i] - v) * gk);
      if (glide.stage) glide.stage = glide.stage.map((v, i) => v + (V.stage[i] - v) * gk);
      for (const k in glide.land) glide.land[k] = glide.land[k].map((v, i) => v + (V[k][i] - v) * gk);
      // (where the toaster's going, for the koi: they make for that, not for where it's gliding past)
      const goal = V.toaster;
      V = { ...V, ...glide.land, toaster: { ...V.toaster, x: glide.x, y: glide.y }, ...(glide.moon ? { moon: glide.moon, sun: glide.moon.slice(0, 2) } : {}), ...(glide.stage ? { stage: glide.stage } : {}) };
      // (space has no day: night there whatever the theme)
      const night = scene === 'space' || scene === 'eye' || scene === 'sea' || scene === 'festival' || col.bg[0] + col.bg[1] + col.bg[2] < col.fg[0] + col.fg[1] + col.fg[2] ? 1 : 0;
      // a ripple on the lake for each kick (while the kick's in the song), somewhere on it
      const kick = eng.v.bd.lastHit;
      if (kick.t > kickAt && t - kick.t < 0.3) {
        kickAt = kick.t;
        dipAt = t;
        if (eng.present('bd', t)) {
          if (scene === 'falls') rips.push({ x: (0.5 + (Math.random() - 0.5) * 0.1) * aspect, y: V.lake[0] - 0.035 - 0.03 * Math.random(), t });
          else if (scene === 'sharks') { rips.push({ x: V.toaster.x * aspect, y: V.toaster.y, t }); seaKick = true; }
          else if (scene === 'koi') rips.push({ x: V.toaster.x * aspect, y: V.toaster.y, t, r: (13.2 * Math.max(1, Math.round(H / 270))) / H });
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
      if ((eng.lastDrop ?? -99) > dropSeen) { dropSeen = eng.lastDrop; if (t - eng.lastDrop < 1) popAt = dropAt = t; }
      const pa = t - popAt;
      // (the eye: its clip looping, so it looks out at you, calm, and blinks now and then; on a drop the clip's
      // held where it is (out of a blink first, if it's in one) and the window glides into the pupil till it
      // fills it, 8 bars in its space (4 in a slow song), and back out)
      if (scene === 'eye') {
        const vid = eyeClip();
        eyeSpacePics();
        if (!eye) eye = { tried: -9, diveAt: -99, outAt: -99, want: false, at: 0, drop: dropAt, zs: 0, lz: 0, lt: -1 };
        const holding = () => t >= eye.diveAt && t <= eye.outAt + EYE_DIVE;
        if (dropAt > eye.drop) { eye.drop = dropAt; if (t - dropAt < 1 && !holding()) eye.want = true; }
        if (eye.want) {
          const c = vid.currentTime;
          if (!(c > EYE_CLIP.blink[0] && c < EYE_CLIP.blink[1]) || t - dropAt > 4) {
            const bpm2 = T.locked ? T.bpm : 120;
            eye.want = false; eye.at = c; vid.pause(); vid.playbackRate = 1;
            eye.diveAt = t; eye.outAt = t + EYE_DIVE + ((bpm2 < 100 ? 4 : 8) * 4 * 60) / bpm2;
          } else vid.playbackRate = 2.5;
        }
        if (!holding() && !eye.want && vid.paused && t - eye.tried > 1) { eye.tried = t; vid.play().catch(() => {}); }
        const ek = eyeShow(aspect, V.moon[2]), E = [V.moon[0] * aspect, V.moon[1]], P = eyePupil(E, ek, holding() ? eye.at : vid.currentTime);
        const far = Math.max(...[[0, 0], [aspect, 0], [0, 1], [aspect, 1]].map(([x, y]) => Math.hypot(x - P[0], y - P[1])));
        const zmax = Math.max(12, (1.08 * far) / P[2]), s = eyeDive(eye, t), z = eyeZoom(eye, t, s, zmax);
        // (how fast the dive's going in: the zoom's log a second, smoothed)
        const lz = Math.log(z);
        if (eye.lt >= 0 && t > eye.lt) eye.zs += ((lz - eye.lz) / (t - eye.lt) - eye.zs) * Math.min(1, (t - eye.lt) * 8);
        eye.lz = lz; eye.lt = t;
        eyeU = { k: ek, e: E, p: P, zmax, z: [z, Math.max(0, t - eye.diveAt), Math.exp(-Math.max(0, t - dipAt) * 6), Math.exp(-Math.max(0, t - dropAt) * 3)], d: [s, s > 0 ? P[2] * z : 0, eye.zs, z / zmax] };
      } else if (eye) { if (eyeVid) { eyeVid.pause(); eyeVid.playbackRate = 1; } eye = null; eyeU = null; }
      // (the toaster on its broom: flying across the moon, drifting to and fro, rising and falling,
      // slowly; its middle, CSS pixels)
      const Sz = Math.max(1, Math.round(H / 270));
      const flight = V.toaster.on === 'broom' ? { x: (V.toaster.x + 0.03 * Math.sin(t * 0.17)) * W, y: (1 - V.toaster.y - 0.012 * Math.sin(t * 0.71)) * H } : V.toaster.on === 'space' ? spaceToaster(V, W, H, t) : null;
      // (drawn again only when it changes: a pixel's move on the beat, the toast's pop, the float's
      // dip, the campfire toast browning a step; the float's and the pad's are drawn a pixel at a time)
      const boat = { dy: (V.toaster.on === 'broom' ? 5 : 0) + (['boat', 'tube', 'broom', 'float', 'pad'].includes(V.toaster.on) ? Math.floor(walkB) % 2 : 0), pop: pa < 0.7 ? Math.round(5 * Math.sin((Math.PI * pa) / 0.7)) : 0, dip: t - dipAt < 0.2 ? 1 : 0, on: V.toaster.on, toast: V.toaster.on === 'log' ? Math.round((walkB % 32) * 2) / 64 : 0 };
      // (in space: the toast gone from its slots once it's popped, till a new slice is in; its cord, and the
      // sprite's canvas made big enough to hold it all)
      const cord = V.toaster.on === 'space' ? spaceCord(V, W, H, Sz, flight, t, t - dipAt, night) : null;
      if (cord) boat.gone = pa > 0.35 && pa < 4;
      const bk = cord ? `space ${boat.pop} ${boat.gone} ${cord.key}` : `${boat.on} ${boat.dy} ${boat.pop} ${boat.dip} ${boat.toast}`;
      if (bk !== boatKey) {
        boatKey = bk;
        if (cord) drawSpace(boatCv, boatG, boat, cord);
        else {
          if (boatCv.width !== SW || boatCv.height !== SH) { boatCv.width = SW; boatCv.height = SH; }
          drawBoat(boatG, boat);
        }
      }
      const shoot = falling ? [falling.x, falling.y, t - falling.t, 1] : [0, 0, 0, 0];
      // (the sharks' water: stepped on, a 60th of a second a step and at most 4 a frame, with the
      // kicks, the hunger a drop or the toast's pop brings, the loudness; its cells and the sharks
      // handed over)
      if (scene === 'sharks') {
        if (!sea) sea = newSea(dims.cols, dims.rows, dims.cw / H, dims.px / H, aspect, V.toaster.x * aspect, V.toaster.y);
        else if (sea.cols !== dims.cols || sea.rows !== dims.rows || sea.aspect !== aspect) fitSea(sea, dims.cols, dims.rows, dims.cw / H, dims.px / H, aspect);
        // (the float where it is now, and the sharks' rounds about it: it glides when Z's pressed)
        sea.fx = V.toaster.x * aspect;
        sea.fy = V.toaster.y;
        sea.cx = 0.65 * (aspect / 2) + 0.35 * sea.fx;
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
        if (steps) { seaCells(sea); lifeDirty = true; }
        seaSharks(sea, shkV, shkKV, shkBV, shkDV);
      } else { sea = null; seaKick = false; }
      // (the koi pond: stepped on as the sharks' water is, with the kicks and the loudness; the
      // toast's pop brings the nearest to the pad to feed, a drop all of them; food dropped on the
      // water (a click) the three nearest to it, a splash where it lands)
      if (scene === 'koi') {
        const fx = V.toaster.x * aspect, fy = V.toaster.y, fr = (12.6 * Sz) / H, gx = goal.x * aspect, gy = goal.y;
        if (!pond || koiCount(aspect) !== pond.koi.length) pond = newPond(aspect, fx, fy, fr);
        else if (pond.aspect !== aspect) {
          if (food) food.x *= aspect / pond.aspect;
          fitPond(pond, aspect);
        }
        // (Z pressed: the koi feeding at the pad make for where it's going, and the toast's crumbs
        // round it glide with it)
        const mx = gx - pond.gx, my = gy - pond.gy;
        if (mx || my) for (const s of pond.koi) if (s.pad && pond.t < s.feed) { s.spot[0] += mx; s.spot[1] += my; s.food[0] += mx; s.food[1] += my; }
        if (food?.pad) { food.x += fx - pond.fx; food.y += fy - pond.fy; }
        Object.assign(pond, { fx, fy, fr, gx, gy });
        if (popAt > pondPop) {
          pondPop = popAt;
          if (t - popAt < 1) { feedKoi(pond, gx, gy, fr + 0.035, popAt === dropAt ? 5 : 1, popAt === dropAt ? 12 : 8, true, popAt === dropAt); food = { x: fx, y: fy, r: fr * 1.7, t, pad: true }; }
        }
        if (dropped) {
          const x = within(dropped.x / H, 0.08, aspect - 0.08), y = within(1 - dropped.y / H, 0.08, 0.92);
          feedKoi(pond, x, y, 0.065, 3, 7);
          food = { x, y, r: 0.03, t };
          rips.push({ x, y, t, r: 0.012 });
          if (rips.length > 4) rips.shift();
          dropped = null;
        }
        pond.acc += dt;
        let steps = 0;
        while (pond.acc >= SEA_STEP && steps < 4) {
          stepPond(pond, { kick: Math.exp(-Math.max(0, t - dipAt) * 3), pace: (0.9 + 0.25 * glowV) * (eng.silent ? 0.6 : 1) });
          pond.acc -= SEA_STEP;
          steps++;
        }
        if (steps === 4) pond.acc = 0;
        pondKoi(pond, koiV, koiKV, koiBV);
      } else { pond = null; food = null; dropped = null; }

      // the scene into the cells
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.viewport(0, 0, dims.cols, dims.rows);
      gl.useProgram(sp.p);
      const u = sp.u;
      gl.uniform2f(u('grid'), dims.cols, dims.rows);
      gl.uniform2f(u('cellPx'), dims.cw, dims.px);
      gl.uniform2f(u('view'), W, H);
      gl.uniform1f(u('time'), t % CLOCK);
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
      gl.uniform1f(u('moonLit'), MOON_OF[scene]?.[1] ?? 1);
      gl.uniform4f(u('band'), V.band[0] * aspect, V.band[1], V.band[2], V.band[3]);
      gl.uniform4f(u('sea'), beamB * Math.PI / 4, swimB, walkB, Math.exp(-Math.max(0, t - dipAt) * 4));
      ripV.fill(0);
      rips.forEach((r, i) => ripV.set([r.x, r.y, t - r.t, r.r ?? 1], i * 4));
      gl.uniform4fv(u('rip'), ripV);
      gl.uniform4fv(u('birds'), birds);
      gl.uniform4fv(u('shoot'), shoot);
      gl.uniform4fv(u('car'), flight ? [(flight.x - 20 * Sz) / H, 1 - (flight.y + 9.5 * Sz) / H, 0, 1] : carU);
      gl.uniform4f(u('leap'), t - popAt, scene === 'space' ? (popAt === dropAt ? 2 : 1) : Math.floor(popAt * 3.7) % 2 ? 1 : -1, (((popAt * 0.618) % 1) + 1) % 1, scene === 'falls' || scene === 'halloween' || scene === 'festival' || scene === 'space' ? 1 : 0);
      const M = V.stage || V.moon; // (halloween's moon, or the festival's stage)
      gl.uniform4f(u('moon'), (M?.[0] ?? 0) * aspect, M?.[1] ?? 0, M?.[2] ?? 0, 0);
      if (scene === 'sharks') {
        gl.uniform2fv(u('shk'), shkV);
        gl.uniform4fv(u('shkK'), shkKV);
        gl.uniform4fv(u('shkB'), shkBV);
        gl.uniform4fv(u('shkD'), shkDV);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, lifeTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        // (made for the window's cells; refilled only when the water stepped or was made again)
        const size = `${dims.cols}x${dims.rows}`;
        if (lifeSize !== size) {
          lifeSize = size;
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, dims.cols, dims.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, sea.data);
          for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        } else if (lifeDirty || lifeData !== sea.data) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, dims.cols, dims.rows, gl.RGBA, gl.UNSIGNED_BYTE, sea.data);
        lifeData = sea.data;
        lifeDirty = false;
        gl.uniform1i(u('life'), 5);
        gl.uniform1f(u('sharkCells'), sharksPx ? 0 : 1);
        // (moon: the toaster's ring, its middle and its radius)
        gl.uniform4f(u('moon'), V.toaster.x * aspect, V.toaster.y, (12.6 * Math.max(1, Math.round(H / 270))) / H, 0);
      }
      if (scene === 'koi') {
        gl.uniform2fv(u('koiS'), koiV);
        gl.uniform4fv(u('koiK'), koiKV);
        gl.uniform4fv(u('koiB'), koiBV);
        gl.uniform4f(u('food'), food?.x ?? 0, food?.y ?? 0, food ? t - food.t : 99, food?.r ?? 0);
        gl.uniform1f(u('koiCells'), pondPx ? 0 : 1);
        // (moon: the toaster's lily pad, its middle and its radius)
        gl.uniform4f(u('moon'), V.toaster.x * aspect, V.toaster.y, (12.6 * Math.max(1, Math.round(H / 270))) / H, 0);
      }
      if (scene === 'eye' && eyeU) {
        // the clip's frame now into its texture (each time it's moved on: playing, or a seek landed),
        // mipmapped (the cells read it at their own size, and the light's slope much coarser)
        gl.activeTexture(gl.TEXTURE5);
        if (!eyeTex) {
          eyeTex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, eyeTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
          for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
          eyeHave = false; eyeDirty = true;
        }
        gl.bindTexture(gl.TEXTURE_2D, eyeTex);
        if (eyeVid.readyState >= 2 && (eyeDirty || !eyeVid.paused)) {
          eyeDirty = false;
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, eyeVid);
          gl.generateMipmap(gl.TEXTURE_2D);
          eyeHave = true;
        }
        gl.uniform1i(u('eyeVid'), 5);
        const cellLod = Math.log2(Math.max(1, (dims.px / H) * eyeU.k * 540));
        gl.uniform4f(u('eyeF'), EYE_CLIP.box[0], EYE_CLIP.box[1], eyeU.k, EYE_CLIP.aspect);
        gl.uniform4f(u('eyeP'), eyeU.p[0], eyeU.p[1], eyeU.p[2], eyeHave ? 1 : 0);
        gl.uniform4fv(u('eyeZ'), eyeU.z);
        gl.uniform4fv(u('eyeD'), eyeU.d);
        // (the galaxy drawn bigger as the dive comes in, but slower than the eye: further off)
        const G = V.gal || [0.4, 0, 0];
        gl.uniform4f(u('eyeS'), G[0] * Math.pow(eyeU.z[0] / eyeU.zmax, 0.6), G[1], G[2], 0);
        gl.uniform4f(u('eyeL'), cellLod, cellLod + 3.8, eyeU.e[0], eyeU.e[1]);
        // the space's photos into their textures once they're decoded, mipmapped (read at the cells' size and
        // much coarser)
        eyePics.forEach((pic, i) => {
          gl.activeTexture(gl.TEXTURE7 + i);
          if (!eyeSkyTex[i]) {
            eyeSkyTex[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, eyeSkyTex[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
          }
          gl.bindTexture(gl.TEXTURE_2D, eyeSkyTex[i]);
          if (pic.ok && !pic.up) {
            pic.up = true;
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic.img);
            gl.generateMipmap(gl.TEXTURE_2D);
          }
          gl.uniform1i(u(i ? 'eyeSat' : 'eyeSky'), 7 + i);
        });
        // (Saturn: nearer than the galaxy, so drawn bigger faster as the dive comes in, out from by the
        // pupil's middle to its place; none till the dive's begun)
        const SP = V.planet || [0.86, 0.74], sm = Math.pow(eyeU.z[0] / eyeU.zmax, 0.9);
        gl.uniform4f(u('eyeT'), eyeU.p[0] + (SP[0] * aspect - eyeU.p[0]) * sm, eyeU.p[1] + (SP[1] - eyeU.p[1]) * sm, eyeU.d[0] > 0 ? (V.satW ?? 0.15) * sm : 0, 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // the glyphs onto the window (the koi pond's with its koi in pixels: see KOI_PX)
      const pp = pondPx ? koiPaint : sharksPx ? sharkPaint : paint;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pp.p);
      const p = pp.u;
      if (pondPx) {
        gl.uniform2fv(p('koiS'), koiV);
        gl.uniform4fv(p('koiK'), koiKV);
        gl.uniform4fv(p('koiB'), koiBV);
        gl.uniform1f(p('koiPx'), Math.max(1, Math.round(H / 270)));
      }
      if (sharksPx) {
        gl.uniform2fv(p('shk'), shkV);
        gl.uniform4fv(p('shkK'), shkKV);
        gl.uniform4fv(p('shkB'), shkBV);
        gl.uniform4fv(p('shkD'), shkDV);
        gl.uniform1f(p('sharkPx'), Math.max(1, Math.round(H / 270)));
        gl.uniform4f(p('sea'), beamB * Math.PI / 4, swimB, walkB, Math.exp(-Math.max(0, t - dipAt) * 4));
        gl.uniform2f(p('sView'), W, H);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cellTex);
      gl.uniform1i(p('cells'), 0);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sheetTex);
      gl.uniform1i(p('sheet'), 2);
      gl.uniform1f(p('gridK'), scene === 'sharks' ? 1 : 0);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, spriteTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (boatUp !== boatKey) {
        boatUp = boatKey;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boatCv);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      }
      gl.uniform1i(p('sprite'), 3);
      // (the pixel layer: its atlas up once; where each of its pictures is this frame)
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, pixTex);
      if (!pixUp) {
        const A = pixAtlas();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, A.w, A.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, A.d);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        pixUp = true;
      }
      gl.uniform1i(p('pixAt'), 4);
      const pics = pixFor(scene, W, H, V, { t, beats: walkB, swim: swimB, popAt, dropAt, night, cwPx: dims.cw, chPx: dims.px, kick: Math.exp(-Math.max(0, t - dipAt) * 4), birds, eye: eyeU });
      const pR = new Float32Array(PIX_MAX * 4), pU = new Float32Array(PIX_MAX * 4), pF = new Float32Array(PIX_MAX * 4);
      pics.forEach(([f, x, y, k, flip, near, keep = 0], i) => { pR.set([x, y, f[2] * k, f[3] * k], i * 4); pU.set(f, i * 4); pF.set([flip ? 1 : 0, 1, near, keep], i * 4); });
      gl.uniform1i(p('pixN'), pics.length);
      gl.uniform4fv(p('pixR'), pR); gl.uniform4fv(p('pixU'), pU); gl.uniform4fv(p('pixF'), pF);
      const show = ((Math.floor(walkB / 32) % 4) + 4) % 4;
      gl.uniform3fv(p('pixC'), SHOW_A[show]); gl.uniform3fv(p('pixC2'), SHOW_B[show]);
      gl.uniform1f(p('pixK'), Math.exp(-Math.max(0, t - dipAt) * 4));
      gl.uniform1f(p('pixH'), flyV);
      // (where the toaster fishes from: a boat out on the lake, a rock in the sea's shallows, its
      // float clear of the light's path; or where it sits by the campfire)
      const S = Math.max(1, Math.round(H / 270)), bw = SW * S, bh = SH * S;
      const wideF = Math.min(1, Math.max(0, (aspect - 0.56) / 1.22));
      const flying = V.toaster.on === 'broom';
      const waterY = flying ? 1e6 : V.toaster.on === 'bridge'
        ? (1 - (V.lake[1] + (V.lake[0] - V.lake[1]) * 0.4 + (0.1 + 0.03 * wideF))) * H + (WATER - 18.5) * S
        : (1 - (V.lake[1] + (V.lake[0] - V.lake[1]) * V.toaster.y)) * H;
      const bx = flying ? flight.x - bw / 2 : (V.toaster.on === 'bridge' ? (0.5 + 0.14 * wideF) * W : V.toaster.x * W) - bw / 2;
      const by = flying ? flight.y - bh / 2 : waterY - (V.toaster.on === 'tube' ? 20 : V.toaster.on === 'float' || V.toaster.on === 'pad' ? SH / 2 : WATER) * S;
      if (cord) gl.uniform4f(p('spr'), cord.x, cord.y, cord.w * cord.k, cord.h * cord.k);
      else if (V.toaster.on === 'eye') gl.uniform4f(p('spr'), 0, 0, 0, 0);   // (none in the eye: see EYE_LOOK)
      else gl.uniform4f(p('spr'), bx, by, bw, bh);
      gl.uniform1f(p('water'), ['log', 'ice', 'umbrella', 'bridge', 'broom', 'float', 'pad', 'decks', 'space', 'eye'].includes(V.toaster.on) ? 1e6 : waterY);
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
        // (on the big jack-o'-lantern, raised as far as the graveyard is: see pumpkinBox)
        const up = Math.max(0, V.lake[1] - (aspect < 1 ? 0.04 : 0.06));
        gl.uniform4f(p('light'), (0.22 + 0.41 * wide) * W, (1 - 0.055 - up) * H, 0.17 * H, 0.5 + 0.3 * kickV + 0.12 * glowV + 0.08 * Math.sin(t * 11) * Math.sin(t * 6.7));
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
      } else if (scene === 'festival' && night) {
        // (the stage's glow, in the show's first colour of these 8 bars, flaring on the kick)
        gl.uniform4f(p('light2'), V.stage[0] * W, (1 - V.stage[1] - 0.06) * H, 0.34 * H, 0.45 + 0.25 * glowV + 0.4 * kickV);
        gl.uniform3f(p('light2C'), ...FESTIVAL_GLOW[((Math.floor(walkB / 32) % 4) + 4) % 4]);
      } else gl.uniform4f(p('light2'), 0, 0, 1, 0);
      gl.uniform1f(p('time'), t % CLOCK);
      gl.uniform2f(p('grid'), dims.cols, dims.rows);
      gl.uniform2f(p('cellPx'), dims.cw, dims.px);
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
      // (the decode: from the toaster's middle, over by the time it's crossed the window)
      if (wave && t - wave.t0 > Math.hypot(aspect, 1) * 0.5 + 0.2) wave = null;
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, beforeTex);
      gl.uniform1i(p('before'), 6);
      gl.uniform4f(p('wave'), bx + bw / 2, by + bh / 2, wave ? t - wave.t0 : 0, wave ? 1 : 0);
      gl.uniform1f(p('glyphs'), SHEET.length);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // (the picture kept for the next change of scene, every third frame; while one's spreading, every
      // frame into the latest instead)
      if (wave || ++beforeN % 3 === 0 || !beforeOk) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, wave ? latestFbo : beforeFbo);
        gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (wave) latestOk = true; else beforeOk = true;
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
    },
  };
}
