// The field of glyphs while a background gets ready: the worlds or the chrome compiling their
// programs, which on an empty shader cache (the first start after an update or a graphics driver
// update, a first visit to the website) takes seconds, the window black all the while. It's the
// field the scenery shows while its first scene compiles (scenery.js, PAINT's idle): glyphs
// flickering in the theme's ink, more of them and brighter where a slow swell passes out from the
// middle, over a faint grid of dots. Drawn on a 2D canvas of its own, over the backgrounds and under
// everything else, so nothing has to compile for it. Once the background is ready it decodes in, as
// a change of scene does: a wave out from the middle clears the field, glyphs flickering bright
// along its edge. (After quanhoangindex's ascii-reveal.)
// field: the scenery's glyphs and cell size ({ glyphs, cellPx(H) }), so the two fields are one.
export function createWait(canvas, field) {
  const g = canvas.getContext('2d');
  let dims = null, back = null, sheet = null, on = false, waitAt = null, revealAt = null, drawnAt = -1;
  document.fonts?.ready.then(() => { dims = null; });
  // (the shader's whu: an integer cell's random number, 0-1)
  const rnd = (x, y) => (Math.imul(Math.imul(x + 32768, 1597334673) ^ Math.imul(y + 32768, 3812015801), 1597334673) >>> 0) / 4294967295;
  const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  // the cells, the glyph sheet in the ink, and the paper with its dots, for this window and theme
  function layout(W, H, dpr, col) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'monospace';
    const px = field.cellPx(H);
    g.font = `${px}px ${font}`;
    const cw = g.measureText('M'.repeat(50)).width / 50 || 6;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / px), sw = Math.ceil(cw * dpr), sh = Math.ceil(px * dpr), perRow = 16;
    sheet = document.createElement('canvas');
    sheet.width = perRow * sw;
    sheet.height = Math.ceil(field.glyphs.length / perRow) * sh;
    const sx = sheet.getContext('2d');
    sx.font = `${px * dpr}px ${font}`;
    sx.textBaseline = 'middle';
    sx.textAlign = 'center';
    sx.fillStyle = rgb(col.fg);
    // (each glyph clipped to its slot, as the scenery's sheet: the shades ░▒▓ are drawn taller than a cell)
    field.glyphs.forEach((c, i) => {
      const x = (i % perRow) * sw, y = Math.floor(i / perRow) * sh;
      sx.save(); sx.beginPath(); sx.rect(x, y, sw, sh); sx.clip();
      sx.fillText(c, x + sw / 2, y + sh * 0.55);
      sx.restore();
    });
    // (a dot in every other cell of every other row, a fifth of the ink)
    back = document.createElement('canvas');
    back.width = canvas.width;
    back.height = canvas.height;
    const bx = back.getContext('2d');
    bx.fillStyle = rgb(col.bg);
    bx.fillRect(0, 0, back.width, back.height);
    bx.fillStyle = rgb(col.fg);
    bx.globalAlpha = 0.2;
    bx.beginPath();
    for (let j = 0; j < rows; j += 2) {
      for (let i = 0; i < cols; i += 2) {
        const x = (i + 0.5) * cw * dpr, y = (j + 0.5) * px * dpr;
        bx.moveTo(x + 0.1 * cw * dpr, y);
        bx.ellipse(x, y, 0.1 * cw * dpr, 0.1 * px * dpr, 0, 0, 2 * Math.PI);
      }
    }
    bx.fill();
    // each cell's own numbers, worked out once: how far it is from the middle (window heights), where
    // its flicker is in its eighth of a second, how late it decodes in, where its edge flicker is, and
    // its corner on the canvas
    const n = cols * rows, far = new Float32Array(n), phase = new Float32Array(n), late = new Float32Array(n), phase24 = new Float32Array(n);
    for (let j = 0, k = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++, k++) {
        far[k] = Math.hypot((i + 0.5) * cw - W / 2, (j + 0.5) * px - H / 2) / H;
        phase[k] = rnd(i + 3, j + 3) * 8;
        late[k] = 0.07 * rnd(i + 11, j + 5);
        phase24[k] = rnd(i + 7, j + 1) * 24;
      }
    }
    const xs = Int32Array.from({ length: cols }, (_, i) => Math.round(i * cw * dpr)), ys = Int32Array.from({ length: rows }, (_, j) => Math.round(j * px * dpr));
    dims = { W, H, dpr, cols, rows, sw, sh, perRow, far, phase, late, phase24, xs, ys, theme: `${col.bg}|${col.fg}` };
  }
  // glyph k of the sheet in cell i, j, as strong as a (0-1)
  const glyph = (k, i, j, a) => {
    const { sw, sh, perRow, xs, ys } = dims;
    g.globalAlpha = a;
    g.drawImage(sheet, (k % perRow) * sw, Math.floor(k / perRow) * sh, sw, sh, xs[i], ys[j], sw, sh);
  };
  // The field at time t, decoding in for age seconds (null: not yet). The decode is a wave out from
  // the middle at two window heights a second, each cell a little late or early (by up to 0.07 s);
  // in its 0.1 s edge a glyph in about seven cells in ten, flickering 24 times a second, bright, over
  // the paper fading; past it the background's own picture.
  function paint(t, age) {
    const { W, H, dpr, cols, rows, far, phase, late, phase24 } = dims, n = field.glyphs.length;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(back, 0, 0);
    const edge = [];
    for (let j = 0, k = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++, k++) {
        const r = far[k], pr = age === null ? -1 : (age - r * 0.5 - late[k]) / 0.1;
        if (pr >= 1) continue;
        if (pr >= 0) { edge.push(i, j, pr, phase24[k]); continue; }
        const swell = 0.5 + 0.5 * Math.sin(r * 9 - t * 2.4);
        const flick = Math.floor(t * 8 + phase[k]);
        if (rnd(Math.floor(i + flick * 1.3), Math.floor(j + flick * 1.3)) < 0.93 - 0.2 * swell) continue;
        glyph(Math.floor(rnd(Math.floor(i + flick * 2.7), Math.floor(j + flick * 2.7)) * n), i, j, 0.12 + 0.4 * swell);
      }
    }
    if (age === null) return;
    // (the paper wiped away from the middle out to the wave's front: all of it where every cell's
    // edge has passed, none where none has begun; then the edge's glyphs over it)
    const inner = Math.max(0, (age - 0.17) / 0.5) * H * dpr, outer = (age / 0.5) * H * dpr;
    const wipe = g.createRadialGradient(W / 2 * dpr, H / 2 * dpr, inner, W / 2 * dpr, H / 2 * dpr, Math.max(outer, inner + 1));
    wipe.addColorStop(0, 'rgba(0, 0, 0, 1)');
    wipe.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    g.fillStyle = wipe;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < edge.length; k += 4) {
      const i = edge[k], j = edge[k + 1], pr = edge[k + 2], flick = Math.floor(age * 24 + edge[k + 3]);
      if (rnd(i + flick * 17, j + flick * 5) < 0.7) glyph(Math.floor(rnd(i + flick * 29, j + flick * 3) * n), i, j, 0.9 - 0.5 * pr);
    }
  }
  return {
    // waiting: the background still getting ready (the field; then, the first frame it isn't, the
    // field decodes in and the canvas goes); col: the theme's colours. (A wait of a moment, programs
    // from the shader cache, shows nothing: the field and its decode would be longer than the wait.)
    draw(t, waiting, col) {
      if (waiting) {
        revealAt = null;
        waitAt ??= t;
        if (!on && t - waitAt >= 0.15) { on = true; canvas.hidden = false; drawnAt = -1; }
      } else {
        waitAt = null;
        if (on && revealAt === null) revealAt = t;
      }
      if (!on) return;
      const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      const age = revealAt === null ? null : t - revealAt;
      if (age !== null && age > 0.25 * Math.hypot(W / H, 1) + 0.25) {
        on = false; canvas.hidden = true; canvas.width = canvas.height = 1; dims = back = sheet = null;
        return;
      }
      // (about thirty times a second while it waits, every other frame: plenty for glyphs that
      // flicker eight times a second)
      if (age === null && t - drawnAt < 0.025) return;
      drawnAt = t;
      if (!dims || dims.W !== W || dims.H !== H || dims.dpr !== dpr || dims.theme !== `${col.bg}|${col.fg}`) layout(W, H, dpr, col);
      paint(t, age);
    },
  };
}
