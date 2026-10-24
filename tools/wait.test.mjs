import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../renderer/wait.js', import.meta.url), 'utf8').replace('export function createWait', 'function createWait');
// a 2D canvas that counts what's drawn on it
function fakeCanvas() {
  const calls = { drawImage: 0, fillText: [], clearRect: 0 };
  const ctx = { calls, font: '', fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over', textBaseline: '', textAlign: '',
    measureText: (s) => ({ width: 6 * s.length }), fillText: (c) => calls.fillText.push(c), drawImage: () => { calls.drawImage++; }, clearRect: () => { calls.clearRect++; },
    fillRect() {}, beginPath() {}, moveTo() {}, ellipse() {}, fill() {}, createRadialGradient: () => ({ addColorStop() {} }) };
  return { width: 300, height: 150, hidden: true, ctx, getContext: () => ctx };
}
function fixture(W = 1280, H = 800) {
  const canvas = fakeCanvas(), made = [];
  const env = { innerWidth: W, innerHeight: H, devicePixelRatio: 1, Math,
    document: { documentElement: {}, createElement: () => { const c = fakeCanvas(); made.push(c); return c; } },
    getComputedStyle: () => ({ getPropertyValue: () => 'monospace' }) };
  vm.runInNewContext(source + ';globalThis.make=createWait;', env);
  const wait = env.make(canvas, { glyphs: [...'.:-=+*#%@'], cellPx: () => 10 });
  return { wait, canvas, made };
}
const col = { bg: [5, 29, 181], fg: [255, 255, 255] }, col2 = { bg: [0, 0, 0], fg: [0, 255, 0] };
test('never shown while nothing waits', () => {
  const f = fixture();
  for (let t = 0; t < 2; t += 1 / 60) f.wait.draw(t, false, col);
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.canvas.ctx.calls.drawImage, 0);
});
test('a wait shows the field, drawn at most thirty times a second', () => {
  const f = fixture();
  let frames = 0, before = 0;
  for (let i = 0; i < 120; i++) {
    f.wait.draw(i / 60, true, col);
    const n = f.canvas.ctx.calls.drawImage;
    if (n > before) frames++;
    before = n;
  }
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.canvas.width, 1280);
  // (from 0.15 s in: a wait shorter than that shows nothing)
  assert.ok(frames >= 50 && frames <= 57, `${frames} frames drawn in 2 s`);
  // (a glyph in about a tenth to a quarter of the cells each frame, past the paper)
  const cells = Math.ceil(1280 / 6) * Math.ceil(800 / 10), per = (before - frames) / frames;
  assert.ok(per > cells * 0.05 && per < cells * 0.3, `${per} glyphs a frame of ${cells} cells`);
});
test('a wait of a moment (programs from the cache) shows nothing', () => {
  const f = fixture();
  for (let i = 0; i < 6; i++) f.wait.draw(i / 60, true, col);
  for (let i = 6; i < 90; i++) f.wait.draw(i / 60, false, col);
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.canvas.ctx.calls.drawImage, 0);
});
test('ready, the field decodes in and the canvas goes', () => {
  const f = fixture();
  for (let i = 0; i < 30; i++) f.wait.draw(i / 60, true, col);
  let t = 30 / 60, gone = null;
  for (let i = 0; i < 120 && gone === null; i++, t += 1 / 60) {
    f.wait.draw(t, false, col);
    if (f.canvas.hidden) gone = t - 30 / 60;
  }
  assert.ok(gone !== null && gone > 0.4 && gone < 0.9, `decoded in ${gone} s`);
  assert.equal(f.canvas.width, 1);
  // (and it stays gone)
  const n = f.canvas.ctx.calls.drawImage;
  f.wait.draw(t + 1, false, col);
  assert.equal(f.canvas.ctx.calls.drawImage, n);
});
test('a wait again mid-decode brings the field back', () => {
  const f = fixture();
  for (let i = 0; i < 30; i++) f.wait.draw(i / 60, true, col);
  for (let i = 30; i < 40; i++) f.wait.draw(i / 60, false, col);
  for (let i = 40; i < 160; i++) f.wait.draw(i / 60, true, col);
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.canvas.width, 1280);
});
test('a change of theme draws the glyphs in its ink', () => {
  const f = fixture();
  f.wait.draw(0, true, col);
  f.wait.draw(0.2, true, col);
  const sheets = f.made.length;
  f.wait.draw(0.3, true, col2);
  assert.ok(f.made.length > sheets);
  assert.equal(f.made.at(-2).ctx.fillStyle, 'rgb(0, 255, 0)');
});
