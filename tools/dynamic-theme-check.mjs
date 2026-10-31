// Smoke check for the dynamic theme (T's sixth), against a hidden, muted test copy over the DevTools protocol. It never starts the app:
// start the copy first, with a settings folder of its own and a port nobody else uses (docs/mac-dev-launch.md), from this checkout:
//
//   open -n -j node_modules/electron/dist/Electron.app --args "$PWD" --hidden --mute-audio \
//     --user-data-dir="$HOME/work/scratch/golden-theme-profile" --remote-debugging-port=9341
//   node tools/dynamic-theme-check.mjs [--port=9341] [--out=_checks]
//
// It presses T round the themes (real key events) and checks each theme's variables against style.css and `col` (what the visuals draw
// with) against them; then, in dynamic, gives it covers made here (nobody's artwork) the three ways one arrives: a file with the cover in
// its tag, picked through the file input as a person would; the system's now-playing art; and the radio's cover. For each it samples the
// page's variables and `col` every frame and checks that the colours reach the cover's palette, ease over about 1.2 s without a step,
// and that `col` is the variables at every frame. Then the gap between two songs (no cover, then the next: the colours stay), a cover that
// is gone for good (held, then bluescreen), T away and back, and a restart (a reload, and an older profile, and an odd one). The ID card's
// dots are read off its canvas: they're the text colour. Screenshots go to --out (_checks, which git ignores); nothing leaves this machine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BLUESCREEN, THEME_VARS, contrast, coverPalette, themeVars, toOklab } from '../renderer/cover-palette.js';
import { COVERS, apicBody, coverPixels, id3Tag, pixels, png, silentMp3 } from './cover-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const port = +arg('port', 9341), out = path.resolve(root, arg('out', '_checks'));
assert.ok(!(port >= 9333 && port <= 9338), `port ${port} belongs to somebody else's copy of the app`);
fs.mkdirSync(out, { recursive: true });
const work = fs.mkdtempSync(path.join(process.env.TOASTER_SCRATCH || path.join(os.homedir(), 'work', 'scratch'), 'dynamic-theme-'));

// ---------------------------------------------------------------- the page, over CDP

const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page');
assert.ok(page, `no window on port ${port}: start the test copy first (see the top of this file)`);
assert.ok(page.url.startsWith(pathToFileURL(path.join(root, 'renderer', 'index.html')).href), `the copy on port ${port} is not this checkout's: ${page.url}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const waiting = new Map();
const trouble = []; // what the page threw or logged as an error while this ran
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') trouble.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') trouble.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial;
  waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (what, fn, ms = 8000) => { for (let t = 0; t < ms; t += 50) { const v = await ev(fn); if (v) return v; await sleep(50); } throw new Error(`timed out waiting for ${what}`); };
const press = async (key, modifiers = 0) => { // (modifiers: 2 is Ctrl)
  const code = key.length === 1 ? 'Key' + key.toUpperCase() : key, vk = key.length === 1 ? key.toUpperCase().charCodeAt(0) : key === 'Enter' ? 13 : 0;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, ...(key.length === 1 && !modifiers ? { text: key } : {}), windowsVirtualKeyCode: vk });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk });
};
const shots = [];
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
  shots.push(name + '.png');
};
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- what the page should show

const css = fs.readFileSync(path.join(root, 'renderer', 'style.css'), 'utf8');
const NAMES = ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen', 'dynamic'];
const norm = (v) => (/^#[0-9a-f]{3}$/i.test(v) ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v.replace(/\s+/g, '')).toLowerCase();
const fixed = Object.fromEntries(NAMES.slice(0, 5).map((name) => {
  const block = name === 'bluescreen' ? css.match(/:root \{([^}]*)\}/)[1] : css.match(new RegExp(`:root\\[data-theme="${name}"\\] \\{([^}]*)\\}`))[1];
  return [name, Object.fromEntries(THEME_VARS.map((v) => [v, norm(block.match(new RegExp(`${v}:\\s*([^;]+);`))[1].trim())]))];
}));
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
// the page's variables, its `col`, and which of the variables are set on the page itself
const READ = `(() => { const cs = getComputedStyle(document.documentElement), s = document.documentElement.style; return { theme: __nc.state.theme, name: document.documentElement.dataset.theme || null,
  vars: Object.fromEntries(${JSON.stringify(THEME_VARS)}.map((v) => [v, cs.getPropertyValue(v).trim()])), inline: ${JSON.stringify(THEME_VARS)}.filter((v) => s.getPropertyValue(v)), col: { bg: __nc.col.bg, fg: __nc.col.fg, ink: __nc.col.ink } }; })()`;
const showing = async () => ev(READ);
const sameVars = (got, want, what) => { for (const v of THEME_VARS) assert.equal(norm(got.vars[v]), norm(want[v]), `${what}: ${v}`); };
const colIs = (got, vars, what) => { assert.deepEqual(got.col.bg, hex(vars['--bg']), `${what}: col.bg`); assert.deepEqual(got.col.fg, hex(vars['--fg']), `${what}: col.fg`); assert.deepEqual(got.col.ink, hex(vars['--ink']), `${what}: col.ink`); };
const wcag = (a, b) => { const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, y = (c) => 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]), p = y(a), q = y(b); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
const away = (p, q) => Math.hypot(...toOklab(p.bg).map((v, i) => v - toOklab(q.bg)[i]), ...toOklab(p.fg).map((v, i) => v - toOklab(q.fg)[i]));

// ---------------------------------------------------------------- a sampler: the variables and col, every frame

const START = `(() => { window.__rows = []; window.__sampling = true; const root = document.documentElement;
  const tick = () => { if (!window.__sampling) return; const cs = getComputedStyle(root), c = __nc.col;
    window.__rows.push([performance.now(), cs.getPropertyValue('--bg').trim(), cs.getPropertyValue('--fg').trim(), c.bg.join(), c.fg.join()]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick); return true; })()`;
const startSampling = () => ev(START);
const stopSampling = async () => { await ev('window.__sampling = false'); return (await ev('window.__rows')).map(([t, bg, fg, cbg, cfg]) => ({ t, bg: hex(norm(bg)), fg: hex(norm(fg)), cbg: cbg.split(',').map(Number), cfg: cfg.split(',').map(Number) })); };
// What the frames show of a change from one palette to where the colours ended up: when it starts and ends, how many different
// colours it passed through, the biggest step between two of them (as a fraction of the whole way), whether it only moved one way, and
// whether col was the variables at every frame.
function analyse(rows, from) {
  const at = (r) => ({ bg: r.bg, fg: r.fg }), to = at(rows.at(-1));
  // (the ease starts the frame before its first visible step, and ends at the first frame that is exactly where it was going)
  const first = rows.findIndex((r) => away(at(r), from) > 1e-6), settled = rows.findIndex((r) => away(at(r), to) < 1e-6);
  const path = rows.slice(Math.max(0, first - 1), settled + 1).filter((r, i, all) => !i || r.bg.join() !== all[i - 1].bg.join() || r.fg.join() !== all[i - 1].fg.join()).map(at);
  const way = away(from, to);
  let biggest = 0, back = 0;
  for (let i = 1; i < path.length; i++) { biggest = Math.max(biggest, away(path[i], path[i - 1]) / way); back = Math.max(back, away(path[i], to) - away(path[i - 1], to)); }
  const ms = first > 0 && settled > first ? rows[settled].t - rows[first - 1].t : null;
  const colWas = rows.every((r) => r.cbg.join() === r.bg.join() && r.cfg.join() === r.fg.join());
  return { ms, colours: path.length, biggest, back, colWas, frames: rows.length, way, first, settled, to };
}
const smooth = (m, what) => {
  assert.ok(m.first > 0 && m.settled > m.first, `${what}: the colours changed and settled (${JSON.stringify(m)})`);
  assert.ok(m.ms >= 1050 && m.ms <= 1500, `${what}: eased over ${Math.round(m.ms)} ms, not about 1200`);
  assert.ok(m.colours >= 40, `${what}: ${m.colours} colours on the way, which is not smooth`);
  assert.ok(m.biggest < 0.06, `${what}: a step of ${(m.biggest * 100).toFixed(1)}% of the way`);
  assert.ok(m.back < 0.006, `${what}: it went backwards`);
  assert.ok(m.colWas, `${what}: col was the page's variables at every frame`);
};

// ---------------------------------------------------------------- the covers, made here

const COVER = { file: 'sunset', system: 'cool photo', radio: 'rainbow', gap: 'navy with an orange stripe' };
const tagged = png(pixels(COVERS[COVER.file]));
fs.writeFileSync(path.join(work, 'cover-file.mp3'), silentMp3(30, id3Tag({ version: 3, frames: [{ id: 'APIC', body: apicBody(tagged, { mime: 'image/png' }), flags: [0, 0] }] })));
const dataUrl = (bytes) => 'data:image/png;base64,' + Buffer.from(bytes).toString('base64');
// the system's art is bigger than the 48 x 48 the palette is made from, as a real one is (96, so the page has to shrink it: a half each way)
const big = pixels(COVERS[COVER.system], 96), small = new Uint8ClampedArray(48 * 48 * 4);
for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) for (let c = 0; c < 4; c++) small[(y * 48 + x) * 4 + c] = Math.round([0, 1].flatMap((dy) => [0, 1].map((dx) => big[((y * 2 + dy) * 96 + x * 2 + dx) * 4 + c])).reduce((a, b) => a + b) / 4);
const WANT = {
  file: coverPalette(coverPixels(COVER.file)), system: coverPalette(small), radio: coverPalette(coverPixels(COVER.radio)), gap: coverPalette(coverPixels(COVER.gap)),
};
const closeTo = (got, want, tol, what) => { for (const k of ['bg', 'fg']) got[k].forEach((v, i) => assert.ok(Math.abs(v - want[k][i]) <= tol, `${what}: ${k} ${got[k]} against ${want[k]}`)); };
const finalPalette = async () => { const s = await showing(); return { bg: hex(norm(s.vars['--bg'])), fg: hex(norm(s.vars['--fg'])), now: s }; };
const settle = () => sleep(1900); // (from the cover being there: the ease is 1.2 s, and a frame or two to start it)

const results = { themes: [], covers: {} };

try {
  // ------------------------------------------------------------ start: the demo beat, so there's code and dominoes to see
  await send('Runtime.enable');
  await until('the app', "typeof __nc === 'object' && !!__nc.state");
  // (the koi pond in the theme's two colours, so the whole picture shows them; no first-visit hints over it)
  await ev("(async () => { await __nc.useDemo(); const s = __nc.state; s.hintsDone = true; s.sceneryScene = 'koi'; s.sceneryTheme = true; const n = document.getElementById('notice'), h = document.getElementById('first-run-hint'); n.hidden = true; if (h) h.hidden = true; return true; })()");
  for (let i = 0; i < 6 && (await ev('__nc.state.theme')) !== 0; i++) await press('t'); // (from wherever it was, round to the first)
  await sleep(7000);

  // ------------------------------------------------------------ T round the themes
  for (let i = 0; i < NAMES.length - 1; i++) {
    const now = await showing(), name = NAMES[i];
    assert.equal(now.theme, i, `the ${i + 1}st theme`);
    assert.equal(now.name, i ? name : null, `${name}: the page's data-theme`);
    sameVars(now, fixed[name], name);
    colIs(now, fixed[name], name);
    assert.deepEqual(now.inline, [], `${name}: none of the variables set on the page itself, only the stylesheet's`);
    await shot(`theme-${i + 1}-${name}`);
    results.themes.push(name);
    await press('t');
    await sleep(450);
  }
  let now = await showing();
  assert.equal(now.theme, 5);
  assert.equal(now.name, 'dynamic');
  assert.equal(await ev('__nc.songArt()'), null, 'no cover yet');
  sameVars(now, themeVars(BLUESCREEN), 'dynamic with no cover is bluescreen');
  sameVars(now, fixed.bluescreen, 'and the stylesheet\'s bluescreen exactly');
  colIs(now, fixed.bluescreen, 'dynamic with no cover');
  assert.deepEqual(now.inline.sort(), [...THEME_VARS].sort(), 'its colours are set on the page itself');
  await shot('theme-6-dynamic-no-cover');
  results.themes.push('dynamic');
  const entries = await ev('__nc.paletteEntries().map((e) => e.name)');
  assert.deepEqual(entries.filter((n) => n.startsWith('theme: ')), NAMES.map((n) => 'theme: ' + n), 'Ctrl+K lists every theme, dynamic last');
  assert.match(await ev("document.querySelector('#help tr[data-act=\"theme\"]').textContent"), /theme: bluescreen, blackscreen, terminal, pink, whitescreen, dynamic \(the colours of the song's cover/, 'the help lists it');
  log('ok  T round: bluescreen, blackscreen, terminal, pink, whitescreen, dynamic (bluescreen\'s colours with no cover)');
  // (the ID card, to show the cover's dots in the theme's colours: N goes off, on, big, off, so round to on and not big)
  for (let i = 0; i < 3 && !(await ev('__nc.state.card && !__nc.state.cardBig')); i++) await ev('__nc.toggleCard()');
  const cardDots = () => ev("(() => { const c = document.querySelector('#card .c-photo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; } return { n, mean: n ? [r / n, g / n, b / n] : null, w: c.width, h: c.height }; })()");
  const nearFg = (dots, fg, what) => assert.ok(dots.n > 100 && dots.mean.every((v, i) => Math.abs(v - fg[i]) < 3), `${what}: ${JSON.stringify(dots)} against ${fg}`);

  // ------------------------------------------------------------ a cover from each way in
  let from = BLUESCREEN;

  // 1. a file with the cover in its tag, picked through the file input
  await startSampling();
  await send('DOM.enable');
  const { root: dom } = await send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#file' });
  await send('DOM.setFileInputFiles', { files: [path.join(work, 'cover-file.mp3')], nodeId });
  await until('the file to play with its cover', "__nc.state.source === 'file' && !!__nc.songArt()", 10000);
  await settle();
  let m = analyse(await stopSampling(), from);
  smooth(m, 'file cover');
  let got = await finalPalette();
  closeTo(got, WANT.file, 0, 'file cover');
  assert.ok(contrast(got.bg, got.fg) >= 7 && wcag(got.bg, got.fg) >= 7, 'file cover: text reads at 7:1');
  colIs(got.now, themeVars(got), 'file cover (settled)');
  const dots = await cardDots();
  nearFg(dots, got.fg, 'the card\'s cover dots are the text colour');
  await shot('dynamic-1-file-cover-sunset');
  results.covers.file = { palette: got, ...m };
  log(`ok  a file's own cover (ID3v2.3 tag, picked through the file input): ${themeVars(got)['--bg']} on ${themeVars(got)['--fg']}, eased in ${Math.round(m.ms)} ms over ${m.colours} colours, ${dots.n} card dots in the text colour`);
  from = got;

  // 2. the system's now-playing art (the demo beat plays on, standing in for the system's sound, so there's something to look at)
  await ev("(async () => { await __nc.useDemo(); __nc.state.source = 'system'; return true; })()");
  await startSampling();
  await ev(`__nc.nowPlaying({ title: 'Cool test', artist: 'Check', app: 'Test', playing: true, art: ${JSON.stringify(dataUrl(png(big, 96)))} })`);
  await until('the system art', '!!__nc.songArt()');
  await settle();
  m = analyse(await stopSampling(), from);
  smooth(m, 'system art');
  got = await finalPalette();
  closeTo(got, WANT.system, 12, 'system art (a 96 x 96 cover the page shrinks)');
  assert.ok(wcag(got.bg, got.fg) >= 7, 'system art: text reads at 7:1');
  colIs(got.now, themeVars(got), 'system art (settled)');
  await sleep(300);
  const dots2 = await cardDots();
  nearFg(dots2, got.fg, 'the card\'s cover dots follow the theme');
  await sleep(6000); // (the song changed, so the beat is found again: a few seconds)
  await shot('dynamic-2-system-art-cool');
  results.covers.system = { palette: got, ...m };
  log(`ok  the system's art (a 96 x 96 PNG): ${themeVars(got)['--bg']} on ${themeVars(got)['--fg']}, eased in ${Math.round(m.ms)} ms over ${m.colours} colours`);
  from = got;

  // 3. the radio's cover (the radio's own cover cache, seeded here, so it asks the iTunes Store nothing)
  await ev("(async () => { await __nc.useDemo(); __nc.state.source = 'radio'; return true; })()");
  await ev(`(async () => { const im = new Image(); im.src = ${JSON.stringify(dataUrl(png(pixels(COVERS[COVER.radio]))))}; await im.decode(); __nc.radioCovers.set('Radio Check Rainbow Song', Promise.resolve(im)); return true; })()`);
  await startSampling();
  await ev("__nc.radioTitle(__nc.state.el, { artist: 'Radio Check', title: 'Rainbow Song' })");
  await until('the radio cover', '!!__nc.songArt()');
  await sleep(600);
  await shot('dynamic-3-radio-cover-mid-ease'); // (the colours half way between the system's cover and this one's)
  await settle();
  m = analyse(await stopSampling(), from);
  smooth(m, 'radio cover');
  got = await finalPalette();
  closeTo(got, WANT.radio, 0, 'radio cover');
  assert.ok(wcag(got.bg, got.fg) >= 7, 'radio cover: text reads at 7:1');
  colIs(got.now, themeVars(got), 'radio cover (settled)');
  await sleep(5000); // (a new source: the beat is found again)
  await shot('dynamic-3-radio-cover-rainbow');
  results.covers.radio = { palette: got, ...m };
  log(`ok  the radio's cover: ${themeVars(got)['--bg']} on ${themeVars(got)['--fg']}, eased in ${Math.round(m.ms)} ms over ${m.colours} colours`);
  from = got;

  // ------------------------------------------------------------ between two songs: the cover goes for a moment, then the next one's arrives
  await startSampling();
  // (the source is the system's again, with a new title and no art yet; in one call, so the system's earlier art is not seen on the way)
  await ev("(() => { __nc.nowPlaying({ title: 'Gap test', artist: 'Check', app: 'Test', playing: true, art: '' }); __nc.state.source = 'system'; return true; })()");
  await until('the art to be gone', '!__nc.songArt()');
  await sleep(1800);
  await ev(`__nc.nowPlaying({ title: 'Gap test', artist: 'Check', app: 'Test', playing: true, art: ${JSON.stringify(dataUrl(png(pixels(COVERS[COVER.gap]))))} })`);
  await until('the next cover', '!!__nc.songArt()');
  await settle();
  const rows = await stopSampling();
  const nearest = Math.min(...rows.map((r) => away({ bg: r.bg, fg: r.fg }, BLUESCREEN)));
  assert.ok(nearest > 0.9 * Math.min(away(from, BLUESCREEN), away(WANT.gap, BLUESCREEN)), `the gap did not take the colours toward bluescreen (closest ${nearest.toFixed(3)})`);
  const still = rows.filter((r) => r.t - rows[0].t < 1500);
  assert.ok(still.every((r) => away({ bg: r.bg, fg: r.fg }, from) < 1e-6), 'the colours stayed while the cover was gone');
  m = analyse(rows, from);
  assert.ok(m.colWas && m.biggest < 0.06 && m.ms >= 1050 && m.ms <= 1500, `the next song's cover eased in on its own (${JSON.stringify(m)})`);
  closeTo(await finalPalette(), WANT.gap, 0, 'the cover after the gap');
  await sleep(5000);
  await shot('dynamic-4-after-a-gap-navy');
  // (the handheld game follows the theme too; the ID card off for the picture, as it would cover the handheld)
  for (let i = 0; i < 3 && (await ev('__nc.state.card')); i++) await ev('__nc.toggleCard()');
  await ev("(() => { __nc.state.blockLook = 'game'; __nc.setBlocks(true); return true; })()");
  await sleep(7000);
  await shot('dynamic-5-handheld-game');
  await ev("(() => { __nc.state.blockLook = 'dominoes'; __nc.setBlocks(true); __nc.toggleCard(); return true; })()");
  log(`ok  a cover that goes for 1.8 s and the next one: the colours stayed, then eased (closest to bluescreen ${nearest.toFixed(2)}, the covers are ${away(from, BLUESCREEN).toFixed(2)} and ${away(WANT.gap, BLUESCREEN).toFixed(2)} from it)`);
  from = WANT.gap;

  // ------------------------------------------------------------ a cover gone for good: held, then bluescreen
  await startSampling();
  await ev("__nc.nowPlaying({ title: 'Gone test', artist: 'Check', app: 'Test', playing: true, art: '' })");
  await sleep(7000);
  const gone = await stopSampling();
  const moved = gone.find((r) => away({ bg: r.bg, fg: r.fg }, from) > 1e-6);
  assert.ok(moved && moved.t - gone[0].t >= 3600 && moved.t - gone[0].t <= 4600, `held about 4 s before it let go (${moved && Math.round(moved.t - gone[0].t)} ms)`);
  m = analyse(gone, from);
  assert.ok(m.colWas && m.biggest < 0.06 && m.ms >= 1050 && m.ms <= 1500, `and eased back to bluescreen's (${JSON.stringify(m)})`);
  assert.ok(away(m.to, BLUESCREEN) < 1e-6, 'it ended on bluescreen\'s colours');
  now = await showing();
  sameVars(now, fixed.bluescreen, 'a cover gone for good: bluescreen');
  log(`ok  a cover gone for good: held ${Math.round(moved.t - gone[0].t)} ms, then bluescreen's colours over ${Math.round(m.ms)} ms`);

  // ------------------------------------------------------------ T away and back
  await ev(`__nc.nowPlaying({ title: 'Back test', artist: 'Check', app: 'Test', playing: true, art: ${JSON.stringify(dataUrl(png(pixels(COVERS[COVER.gap]))))} })`);
  await until('the cover again', '!!__nc.songArt()');
  await sleep(2000);
  await press('t');
  await sleep(400);
  now = await showing();
  assert.equal(now.theme, 0);
  assert.equal(now.name, null);
  sameVars(now, fixed.bluescreen, 'dynamic then T: bluescreen');
  assert.deepEqual(now.inline, [], 'leaving dynamic clears the variables set on the page');
  colIs(now, fixed.bluescreen, 'bluescreen after dynamic');
  for (let i = 0; i < 5; i++) { await press('t'); await sleep(250); }
  now = await showing();
  assert.equal(now.theme, 5);
  sameVars(now, themeVars(WANT.gap), 'T into dynamic with a cover on: its colours at once');
  colIs(now, themeVars(WANT.gap), 'T into dynamic with a cover on');
  assert.equal(await ev('__nc.coverTheme.easing(performance.now() / 1000)'), false, 'no ease: a theme picked is not a song changing');
  log('ok  T away clears the page\'s variables; T back into dynamic shows the cover\'s colours at once');
  const saved = JSON.parse(await ev("localStorage.getItem('now-coding')"));
  assert.equal(saved.theme, 5, 'saved as the sixth theme');
  // Ctrl+K, typed as a person would: from bluescreen, "theme: dyn" and Enter
  await press('t');
  await sleep(300);
  assert.equal((await showing()).theme, 0);
  await press('k', 2);
  await until('the palette', "document.getElementById('command-palette')?.open");
  await send('Input.insertText', { text: 'theme: dyn' });
  await sleep(200);
  assert.equal(await ev("document.querySelector('#command-results button')?.firstChild.textContent"), 'theme: dynamic', 'its first match');
  await press('Enter');
  await sleep(400);
  now = await showing();
  assert.equal(now.theme, 5);
  assert.equal(now.name, 'dynamic');
  sameVars(now, themeVars(WANT.gap), 'Ctrl+K "theme: dynamic" with a cover on: its colours at once');
  log('ok  Ctrl+K, "theme: dyn", Enter: dynamic, with the cover\'s colours at once; the help and Ctrl+K list it');

  // ------------------------------------------------------------ a restart: the saved profile, an older one, an odd one
  const reload = async (profile) => {
    if (profile !== undefined) await ev(`localStorage.setItem('now-coding', ${JSON.stringify(JSON.stringify(profile))})`);
    await send('Page.reload');
    await sleep(1500);
    await until('the app again', "typeof __nc === 'object' && !!__nc.state && !!__nc.col", 15000);
    await sleep(600);
    return showing();
  };
  now = await reload();
  assert.equal(now.theme, 5, 'dynamic survives a restart');
  assert.equal(now.name, 'dynamic');
  sameVars(now, fixed.bluescreen, 'after a restart, no cover yet: bluescreen\'s colours');
  const keep = { hintsDone: true, seenVersion: '0.4.28', visualName: 'scenery', dropName: 'off', mirror: true, card: false, cardV: true };
  now = await reload({ ...keep, theme: 3 }); // (a profile from before there was a sixth theme)
  assert.equal(now.theme, 3);
  assert.equal(now.name, 'pink');
  sameVars(now, fixed.pink, 'an older profile (pink)');
  assert.deepEqual(now.inline, [], 'an older profile: the stylesheet\'s colours alone');
  now = await reload({ ...keep, theme: 4 });
  assert.equal(now.name, 'whitescreen');
  sameVars(now, fixed.whitescreen, 'an older profile (whitescreen)');
  now = await reload({ ...keep, theme: 9 }); // (one that names no theme)
  assert.equal(now.theme, 0);
  assert.equal(now.name, null);
  sameVars(now, fixed.bluescreen, 'an odd profile: bluescreen');
  now = await reload({ ...keep, theme: 5 });
  assert.equal(now.name, 'dynamic');
  log('ok  a restart: dynamic is kept (bluescreen\'s colours till a cover comes); a profile from before it loads as it did; an odd one is bluescreen');
  await shot('after-restart-dynamic');
  await ev("localStorage.removeItem('now-coding')"); // (the test copy's own profile: left as a first run would find it)
  await send('Page.reload');
  assert.deepEqual(trouble, [], 'the page threw or logged errors');
  log('ok  nothing thrown and no console errors in the page throughout');
} finally {
  fs.writeFileSync(path.join(out, 'dynamic-theme-check.json'), JSON.stringify({ port, shots, trouble, ...results }, null, 2));
  fs.rmSync(work, { recursive: true, force: true });
  ws.close();
}
log(`\nall checks passed; ${shots.length} screenshots in ${path.relative(root, out) || '.'}: ${shots.join(', ')}`);
