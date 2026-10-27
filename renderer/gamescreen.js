// The handheld's screens made to sit in its body as real ones do, drawn over each screen after its skin
// (over) and round it after the body (spill). Lit from behind, a screen's black is never quite black; its
// pixels are in rows and columns, red, green and blue, with gaps between them; what's bright glows in the
// glass over it, and a little onto the black glass round it; the frame's edge stands over the screen, its
// shadow on the top and left (the light is from the top left, as on the model), and the corners are a little
// dimmer; an old LCD is slow, each frame keeping a little of the last.
//   look: dot: the size of a pixel (canvas pixels; 0, a fine one for the screen's size) and where they start
//   (ox, oy); black: the screen's black ([r, g, b], or none: a screen lit by the room); glow (0..1); lag (0..1);
//   shade: how deep the frame's shadow is (0..1).
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

// A pixel: three upright stripes, red, green and blue, a dark gap under them, and down their right when it's
// big enough to have one. (To multiply with: white leaves the screen as it is.)
function pixel(n) {
  const c = canvasOf(n, n), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, n, n);
  const w = n >= 4 ? (n - 1) / 3 : n / 3;
  ['rgb(255,200,200)', 'rgb(200,255,208)', 'rgb(204,214,255)'].forEach((s, i) => { x.fillStyle = s; x.fillRect(i * w, 0, w, n); });
  x.fillStyle = 'rgb(132,136,148)';
  x.fillRect(0, n - 1, n, 1);
  if (n >= 4) x.fillRect(n - 1, 0, 1, n);
  return c;
}

// How the glow fades out round a screen, onto the glass: opaque at the screen's edge, gone m out (a canvas
// the size of the screen and m each side, at a quarter of the size; clear over the screen itself).
function fade(w, h, m) {
  const c = canvasOf(w + 2 * m, h + 2 * m), x = c.getContext('2d'), d = x.createImageData(c.width, c.height);
  for (let j = 0; j < c.height; j++) {
    for (let i = 0; i < c.width; i++) {
      const dx = Math.max(m - i, 0, i - (m + w - 1)), dy = Math.max(m - j, 0, j - (m + h - 1));
      const e = Math.hypot(dx, dy) / m;
      const a = dx === 0 && dy === 0 ? 0 : Math.max(0, 1 - e) ** 2;
      d.data[(j * c.width + i) * 4 + 3] = Math.round(a * 255);
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}

export function createScreens() {
  const per = {}; // each screen: its last frame (for the lag), its glow (small copies of it), its pixel pattern

  // The pixels laid over what a screen shows (x0, y0, w, h: canvas pixels, under whatever clip is set); n: a pixel's
  // size. Part of over, and on its own for a screen laid in at an angle (its pixels laid on after, so a fine grid isn't
  // resampled into stripes).
  function grid(ctx, which, look, x0, y0, w, h, n = look.dot || Math.max(3, Math.round(w / 190))) {
    const S = per[which] || (per[which] = {}), ox = look.ox ?? 0, oy = look.oy ?? 0;
    if (n < 3 || !((look.dots ?? 0.32) > 0)) return;
    if (S.n !== n) { S.pattern = ctx.createPattern(pixel(n), 'repeat'); S.n = n; }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = look.dots ?? 0.32;
    ctx.translate(ox, oy); // (the pattern starts where the screen's pixels do)
    ctx.fillStyle = S.pattern;
    ctx.fillRect(x0 - ox, y0 - oy, w, h);
    ctx.restore();
  }

  function over(ctx, r, which, look) {
    const S = per[which] || (per[which] = {});
    const x0 = Math.round(r.x), y0 = Math.round(r.y), w = Math.round(r.w), h = Math.round(r.h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    // the slowness: a little of the last frame left in this one
    if (look.lag) {
      if (S.last?.width !== w || S.last?.height !== h) S.last = canvasOf(w, h);
      else { ctx.globalAlpha = look.lag; ctx.drawImage(S.last, x0, y0); ctx.globalAlpha = 1; }
      const lx = S.last.getContext('2d');
      lx.clearRect(0, 0, w, h); lx.drawImage(ctx.canvas, x0, y0, w, h, 0, 0, w, h);
    }
    // the glow, taken from what the screen shows: two small copies, a quarter and a sixteenth of it, each made by
    // halving and halving again with plain smoothing (an even average of each 2 by 2; a 'high' resize from the whole
    // canvas cost a 4K screen every other frame)
    if (look.glow) {
      const half = (n) => Math.max(1, Math.ceil(n / 2)), gw = half(half(w)), gh = half(half(h));
      if (S.g1?.width !== gw || S.g1?.height !== gh) {
        S.h1 = canvasOf(half(w), half(h)); S.g1 = canvasOf(gw, gh); S.h2 = canvasOf(half(gw), half(gh)); S.g2 = canvasOf(half(half(gw)), half(half(gh))); S.fade = null;
      }
      const halve = (to, from, sx = 0, sy = 0, sw = from.width, sh = from.height) => {
        const c = to.getContext('2d');
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
        c.clearRect(0, 0, to.width, to.height); c.drawImage(from, sx, sy, sw, sh, 0, 0, to.width, to.height);
      };
      halve(S.h1, ctx.canvas, x0, y0, w, h); halve(S.g1, S.h1); halve(S.h2, S.g1); halve(S.g2, S.h2);
    }
    // the black it can't go below
    if (look.black) {
      ctx.globalCompositeOperation = 'lighten';
      ctx.fillStyle = `rgb(${look.black.join(',')})`;
      ctx.fillRect(x0, y0, w, h);
    }
    // the pixels
    grid(ctx, which, look, x0, y0, w, h);
    // the glow over it, in the glass
    if (look.glow) {
      ctx.globalCompositeOperation = 'screen';
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = Math.min(1, look.glow * 0.75); ctx.drawImage(S.g1, x0, y0, w, h);
      ctx.globalAlpha = Math.min(1, look.glow * 0.55); ctx.drawImage(S.g2, x0, y0, w, h);
      ctx.globalAlpha = 1;
    }
    // the frame's shadow, soft, on the top and left; a little on the others; the corners dimmer
    ctx.globalCompositeOperation = 'source-over';
    const k = look.shade ?? 1;
    const edge = (x1, y1, x2, y2, a, rx, ry, rw, rh) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, `rgba(0,0,0,${a * k})`); g.addColorStop(0.3, `rgba(0,0,0,${a * k * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    };
    const th = h * 0.075, lw = w * 0.05, bh = h * 0.03, rw = w * 0.022;
    edge(0, y0, 0, y0 + th, 0.6, x0, y0, w, th);
    edge(x0, 0, x0 + lw, 0, 0.5, x0, y0, lw, h);
    edge(0, y0 + h, 0, y0 + h - bh, 0.25, x0, y0 + h - bh, w, bh);
    edge(x0 + w, 0, x0 + w - rw, 0, 0.25, x0 + w - rw, y0, rw, h);
    const cx = x0 + w / 2, cy = y0 + h / 2, v = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.hypot(w, h) * 0.56);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.24 * k})`);
    ctx.fillStyle = v; ctx.fillRect(x0, y0, w, h);
    // the glass over it: the room's light in it, faint, from the top left; the frame's edge lit along the bottom and right
    if (look.glass ?? 1) {
      const g = ctx.createLinearGradient(x0, y0, x0 + w * 0.55, y0 + h * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0.075)'); g.addColorStop(0.5, 'rgba(255,255,255,0.025)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
      const e = Math.max(1, Math.round(w / 400));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x0, y0 + h - e, w, e); ctx.fillRect(x0 + w - e, y0, e, h);
    }
    ctx.restore();
  }

  // After the body: the glow on the black glass round the screen, fading out m (canvas pixels) from it
  function spill(ctx, r, which, look, m) {
    const S = per[which];
    if (!look.glow || !S?.g2) return;
    const w = Math.round(r.w), h = Math.round(r.h), q = Math.max(1, Math.round(m / 4));
    const fw = Math.ceil(w / 4), fh = Math.ceil(h / 4);
    if (!S.fade || S.fadeKey !== `${fw}x${fh}x${q}`) { S.fade = fade(fw, fh, q); S.fadeKey = `${fw}x${fh}x${q}`; S.spill = canvasOf(fw + 2 * q, fh + 2 * q); }
    const s = S.spill.getContext('2d');
    s.globalCompositeOperation = 'copy';
    s.imageSmoothingQuality = 'high';
    s.drawImage(S.g2, 0, 0, S.spill.width, S.spill.height);        // (the glow, stretched out over the glass round it)
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(S.fade, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1, look.glow * 1.1);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.spill, Math.round(r.x) - q * 4, Math.round(r.y) - q * 4, S.spill.width * 4, S.spill.height * 4);
    ctx.restore();
  }

  return { over, spill, grid };
}
