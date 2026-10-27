import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, stanceLayout, DEVICES } from '../renderer/game.js';
// Where the handheld game stands (game.js layout(), the metal handheld): the owner's rules for a tall window, and the
// part of a wide one the code leaves free (style.css: body.game-on:not(.vertical) #code { padding-right: 40vw }).
const SPAN = 118; // (the metal handheld with its cartridge: units across)
const TALL = [[571, 1015], [390, 844], [360, 640], [430, 932], [1080, 1920], [2160, 3840]];
const WIDE = [[1920, 1080], [1280, 720], [1280, 800], [1024, 768], [3840, 2160], [2560, 1080], [800, 800], [1600, 900]];
test('tall window: screens end above 74.5% of the height, the top is no higher than 30%, the cartridge ends by 88% of the width', () => {
  for (const [W, H] of TALL) {
    const L = layout(W, H), screensBottom = L.bottom.y + L.bottom.h;
    assert.ok(screensBottom <= 0.745 * H + 1e-6, `${W}x${H}: screens end at ${(100 * screensBottom / H).toFixed(2)}%`);
    assert.ok(L.y >= 0.3 * H - 1e-6, `${W}x${H}: top at ${(100 * L.y / H).toFixed(2)}%`);
    assert.ok(L.x + SPAN * L.u <= 0.88 * W + 1e-6, `${W}x${H}: right edge at ${(100 * (L.x + SPAN * L.u) / W).toFixed(2)}%`);
    assert.ok(SPAN * L.u <= 0.66 * W + 1e-6, `${W}x${H}: wider than 66%`);
  }
});
test('wide window: the handheld stays in the right 40%, so the code keeps the left 60% and nothing runs under it', () => {
  for (const [W, H] of WIDE) {
    const L = layout(W, H);
    assert.ok(L.x >= 0.6 * W - 1e-6, `${W}x${H}: starts at ${(100 * L.x / W).toFixed(2)}% of the width`);
    assert.ok(L.x + SPAN * L.u <= W + 1e-6, `${W}x${H}: runs off the right`);
    assert.ok(L.y >= -1e-6 && L.y + L.h <= H + 1e-6, `${W}x${H}: runs off the top or bottom`);
  }
});
// The one shown, seen at an angle (game.js stanceLayout()): its own rules for a tall window (the top no higher than 15%,
// the screens' lowest corner above 75.5%, no wider than 80%, its right end by 91%), the same right 40% of a wide one, and
// the mini player's (W) window to itself under the header.
const ST = DEVICES.stance, [DX0, DY0, DX1, DY1] = ST.stance.dev;
test('the angled one, tall window: top no higher than 15%, screens end above 75.5%, no wider than 80%, its right end by 91%', () => {
  for (const [W, H] of TALL) {
    const L = stanceLayout(W, H, ST);
    assert.ok(L.y + DY0 * L.u >= 0.15 * H - 1e-6, `${W}x${H}: top at ${(100 * (L.y + DY0 * L.u) / H).toFixed(2)}%`);
    assert.ok(L.y + ST.stance.low * L.u <= 0.755 * H + 1e-6, `${W}x${H}: screens end at ${(100 * (L.y + ST.stance.low * L.u) / H).toFixed(2)}%`);
    assert.ok((DX1 - DX0) * L.u <= 0.8 * W + 1e-6, `${W}x${H}: wider than 80%`);
    assert.ok(L.x + DX1 * L.u <= 0.91 * W + 1e-6, `${W}x${H}: right end at ${(100 * (L.x + DX1 * L.u) / W).toFixed(2)}%`);
  }
});
test('the angled one, wide window: in the right 40%, on screen', () => {
  for (const [W, H] of WIDE) {
    const L = stanceLayout(W, H, ST);
    assert.ok(L.x + DX0 * L.u >= 0.6 * W - 1e-6, `${W}x${H}: starts at ${(100 * (L.x + DX0 * L.u) / W).toFixed(2)}% of the width`);
    assert.ok(L.x + DX1 * L.u <= W + 1e-6, `${W}x${H}: runs off the right`);
    assert.ok(L.y + DY0 * L.u >= -1e-6 && L.y + DY1 * L.u <= H + 1e-6, `${W}x${H}: runs off the top or bottom`);
  }
});
test('the mini player (W): the handheld on its own, in the window under its header', () => {
  for (const [W, H] of [[300, 500], [200, 340], [460, 300], [600, 1000]]) {
    for (const [name, L, box] of [['angled', stanceLayout(W, H, ST, true), [DX0, DY0, DX1, DY1]], ['metal', layout(W, H, DEVICES.metal, true), [0, 0, ...DEVICES.metal.size]]]) {
      const [x0, y0, x1, y1] = box.map((v, i) => (i % 2 ? L.y : L.x) + v * L.u);
      assert.ok(x0 >= -1e-6 && x1 <= W + 1e-6, `${name} ${W}x${H}: off the side`);
      assert.ok(y0 >= 0.07 * H - 1e-6 && y1 <= H + 1e-6, `${name} ${W}x${H}: under the header or off the bottom`);
    }
  }
});
