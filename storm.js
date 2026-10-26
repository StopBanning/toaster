// The drop effect "not responding" (B): Windows XP's hung-window smear. On the drop a window,
// toaster.exe, opens over the visuals and the cursor grabs its title bar and drags it round a slow
// figure 8 for 4 bars. After a bar it hangs (the title says "Not Responding") and, as a hung XP
// window does, leaves a copy of itself wherever it's been: one every 8th, each keeping its moment.
// The window shows the visuals under it (the backgrounds, the orb, the glass, as the page stacks
// them) in a new look on every beat: negative, thermal, cyanotype, a green CRT, edges, dither,
// x-ray, diamond plate, frosted glass. An XP taskbar sits at the foot, the tempo in its tray. Then
// the trail is taken back, newest first, one a 32nd, and the window closes. The orb swells a little
// while it lasts (orbRect). With fewer flashes on, the look changes once a bar and the copies come
// a beat apart.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const BARS = 4;
const TITLE = 'toaster.exe';

function pattern(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'));
  return c;
}
const PLATE = pattern(28, 28, (p) => {
  const gr = p.createLinearGradient(0, 0, 28, 28);
  gr.addColorStop(0, '#3d5fe8'); gr.addColorStop(1, '#2443c9');
  p.fillStyle = gr; p.fillRect(0, 0, 28, 28);
  p.strokeStyle = 'rgba(255,255,255,0.45)'; p.lineWidth = 2.2; p.lineCap = 'round';
  for (const [x, y, k] of [[7, 7, 1], [21, 21, 1], [21, 7, -1], [7, 21, -1]]) { p.beginPath(); p.moveTo(x - 4 * k, y - 2); p.lineTo(x + 4 * k, y + 2); p.stroke(); }
});
const SCAN = pattern(4, 4, (p) => { p.fillStyle = 'rgba(0,0,0,0.35)'; p.fillRect(0, 0, 4, 2); });
const GRID = pattern(24, 24, (p) => { p.strokeStyle = 'rgba(80,255,120,0.3)'; p.lineWidth = 1; p.strokeRect(0.5, 0.5, 24, 24); });
// what the window shows the visuals as: bg behind them in the window, a canvas filter, a blend, a
// pattern laid over, px (drawn blocky, a pixel per px)
const LOOKS = [
  { bg: '#fff', filter: 'invert(1) grayscale(1) contrast(1.3)' }, // negative
  { bg: '#000', filter: 'grayscale(1) contrast(1.4) sepia(1) saturate(8) hue-rotate(-30deg) brightness(1.2)', over: GRID }, // thermal
  { bg: '#f3f6ff', filter: 'grayscale(1) invert(1) sepia(1) hue-rotate(185deg) saturate(9) brightness(0.85) contrast(1.4)', blend: 'multiply' }, // cyanotype
  { bg: '#021004', filter: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(5) brightness(1.15)', over: SCAN }, // green CRT
  { bg: '#000', edges: true }, // edges
  { bg: '#fff', filter: 'grayscale(1) contrast(6) invert(1)', px: 6, blend: 'multiply' }, // dither
  { bg: '#0b0e14', filter: 'invert(1) grayscale(1) contrast(1.6) brightness(0.9)', blend: 'screen', over: SCAN }, // x-ray
  { bg: 'plate', filter: 'grayscale(1) brightness(1.7) contrast(1.15)', blend: 'multiply' }, // diamond plate
  { bg: 'rgba(225,235,255,0.5)', filter: 'blur(5px) brightness(1.5) saturate(0.6)' }, // frosted
];

export function createStorm(canvas) {
  const g = canvas.getContext('2d');
  const scene = document.createElement('canvas'), sg = scene.getContext('2d');
  const small = document.createElement('canvas'), smg = small.getContext('2d');
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  let on = false, closing = false, t0 = 0, end = 0, dur = 1, closeAt = 0, closeFrom = 0, doneAt = 0;
  let stamps = [], lastStep = null, lastTick = null, look = 0, swell = 0, last = 0;

  // The picture under the window: the layers as the page stacks them (as the glass composes them)
  function compose(W, H, layers, bg) {
    if (scene.width !== W || scene.height !== H) { scene.width = W; scene.height = H; }
    sg.globalAlpha = 1; sg.fillStyle = bg; sg.fillRect(0, 0, W, H);
    const shown = [];
    for (const el of layers) {
      if (!el || !el.width || el.hidden) continue;
      const st = getComputedStyle(el);
      if (st.display !== 'none') shown.push([el, +st.opacity, +st.zIndex || 0]);
    }
    shown.sort((a, b) => a[2] - b[2]);
    for (const [el, op] of shown) { sg.globalAlpha = op; sg.drawImage(el, 0, 0, W, H); }
    sg.globalAlpha = 1;
  }
  // The window's size, and where its middle is u of the way round the figure 8 (CSS pixels): down
  // the right of the top loop, the left of the bottom one, back up the right and over the top left
  function geometry(W, H) {
    const w = Math.round(H > W ? W * 0.5 : W * 0.28), h = Math.round(w * 0.68);
    return { w, h, ax: ((W - w) / 2) * 0.85, ay: ((H - h - 40) / 2) * 0.78, cx: W / 2, cy: (H - 40) / 2 + 6 };
  }
  const pathAt = (u, G) => [G.cx + G.ax * Math.sin(4 * Math.PI * u), G.cy - G.ay * Math.cos(2 * Math.PI * u)];

  function frame(x, y, w, h, k, hung) {
    const tb = Math.round(22 * k), r = 6 * k, bw = Math.max(2, Math.round(3 * k));
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h); g.closePath();
    g.lineWidth = bw; g.strokeStyle = '#0831d9'; g.stroke();
    const gr = g.createLinearGradient(0, y, 0, y + tb);
    gr.addColorStop(0, '#3a8cff'); gr.addColorStop(0.15, '#0a5ff0'); gr.addColorStop(0.55, '#0054e3'); gr.addColorStop(1, '#0a3fbf');
    g.fillStyle = gr; g.fillRect(x, y, w, tb);
    g.font = `bold ${Math.round(11 * k)}px Tahoma, "Segoe UI", sans-serif`; g.textBaseline = 'middle';
    const text = hung ? TITLE + ' (Not Responding)' : TITLE;
    g.fillStyle = 'rgba(0,0,40,0.6)'; g.fillText(text, x + 8 * k + 1, y + tb / 2 + 1);
    g.fillStyle = '#fff'; g.fillText(text, x + 8 * k, y + tb / 2);
    const bs = Math.round(16 * k), by = y + (tb - bs) / 2;
    const btn = (bx, red, glyph) => {
      const bg = g.createLinearGradient(0, by, 0, by + bs);
      bg.addColorStop(0, red ? '#f08a6c' : '#5a9cff'); bg.addColorStop(1, red ? '#c63e1c' : '#1f5ad6');
      g.fillStyle = bg; g.fillRect(bx, by, bs, bs);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, k); g.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, 2 * k); g.beginPath(); glyph(bx, by, bs); g.stroke();
    };
    btn(x + w - bs * 3 - 6 * k, false, (bx, b, s) => { g.moveTo(bx + s * 0.28, b + s * 0.72); g.lineTo(bx + s * 0.62, b + s * 0.72); });
    btn(x + w - bs * 2 - 4 * k, false, (bx, b, s) => { g.rect(bx + s * 0.28, b + s * 0.28, s * 0.44, s * 0.44); });
    btn(x + w - bs - 2 * k, true, (bx, b, s) => { g.moveTo(bx + s * 0.3, b + s * 0.3); g.lineTo(bx + s * 0.7, b + s * 0.7); g.moveTo(bx + s * 0.7, b + s * 0.3); g.lineTo(bx + s * 0.3, b + s * 0.7); });
    return { tb, bw };
  }
  function content(lk, x, y, w, h) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = lk.bg === 'plate' ? g.createPattern(PLATE, 'repeat') : lk.bg;
    g.fillRect(x, y, w, h);
    if (lk.edges) {
      // edges: the patch against itself two pixels over ("difference"), brightened
      const iw = Math.ceil(w), ih = Math.ceil(h);
      if (tmp.width !== iw || tmp.height !== ih) { tmp.width = iw; tmp.height = ih; }
      tg.globalCompositeOperation = 'source-over'; tg.filter = 'grayscale(1)';
      tg.drawImage(scene, x, y, w, h, 0, 0, w, h);
      tg.globalCompositeOperation = 'difference'; tg.drawImage(scene, x + 2, y + 2, w, h, 0, 0, w, h);
      tg.filter = 'none'; tg.globalCompositeOperation = 'source-over';
      g.filter = 'brightness(3) contrast(2)'; g.drawImage(tmp, 0, 0, w, h, x, y, w, h); g.filter = 'none';
      g.fillStyle = g.createPattern(GRID, 'repeat'); g.fillRect(x, y, w, h);
    } else {
      g.filter = lk.filter;
      if (lk.blend) g.globalCompositeOperation = lk.blend;
      if (lk.px) {
        const sw = Math.max(1, Math.round(w / lk.px)), sh = Math.max(1, Math.round(h / lk.px));
        small.width = sw; small.height = sh;
        smg.drawImage(scene, x, y, w, h, 0, 0, sw, sh);
        g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, sw, sh, x, y, w, h); g.imageSmoothingEnabled = true;
      } else g.drawImage(scene, x, y, w, h, x, y, w, h);
      g.filter = 'none'; g.globalCompositeOperation = 'source-over';
      if (lk.over) { g.fillStyle = g.createPattern(lk.over, 'repeat'); g.fillRect(x, y, w, h); }
    }
    g.restore();
  }
  // the arrow cursor (XP's: white, outlined black), its tip at x, y
  function cursor(x, y, k) {
    const P = [[0, 0], [0, 17], [4, 13], [7, 20], [9.5, 19], [6.5, 12.5], [12, 12.5]];
    g.save(); g.translate(x, y); g.scale(1.25 * k, 1.25 * k);
    g.beginPath(); P.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetX = 1.5; g.shadowOffsetY = 1.5; g.shadowBlur = 1.5;
    g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 1; g.strokeStyle = '#000'; g.stroke();
    g.restore();
  }
  // the taskbar, risen rise (0-1) of its height: Start (toast), the window's button, the tray with
  // the tempo
  function taskbar(W, H, k, rise, title, bpm) {
    const th = Math.round(30 * k), y = H - th * rise;
    const gr = g.createLinearGradient(0, y, 0, y + th);
    gr.addColorStop(0, '#3f8cf3'); gr.addColorStop(0.08, '#245edb'); gr.addColorStop(0.9, '#1941a5'); gr.addColorStop(1, '#1941a5');
    g.fillStyle = gr; g.fillRect(0, y, W, th);
    const sw = Math.round(96 * k), sgr = g.createLinearGradient(0, y, 0, y + th);
    sgr.addColorStop(0, '#5eac56'); sgr.addColorStop(0.5, '#3c9a3a'); sgr.addColorStop(1, '#2f7d2d');
    g.fillStyle = sgr; g.beginPath(); g.moveTo(0, y); g.lineTo(sw - 12 * k, y); g.quadraticCurveTo(sw, y, sw, y + th / 2); g.quadraticCurveTo(sw, y + th, sw - 12 * k, y + th); g.lineTo(0, y + th); g.closePath(); g.fill();
    g.font = `italic bold ${Math.round(15 * k)}px Tahoma, "Segoe UI", sans-serif`; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText('toast', 14 * k + 1, y + th / 2 + 1); g.fillStyle = '#fff'; g.fillText('toast', 14 * k, y + th / 2);
    const tw = Math.round(118 * k), tx = W - tw, tgr = g.createLinearGradient(0, y, 0, y + th);
    tgr.addColorStop(0, '#1290e8'); tgr.addColorStop(1, '#0c6fc9');
    g.fillStyle = tgr; g.fillRect(tx, y, tw, th);
    g.font = `${Math.round(11 * k)}px Tahoma, "Segoe UI", sans-serif`; g.fillStyle = '#fff';
    g.fillText(`${Math.round(bpm)} BPM`, tx + 14 * k, y + th / 2);
    const bx = sw + 8 * k, bwid = Math.min(Math.round(220 * k), tx - bx - 8 * k), bg = g.createLinearGradient(0, y + 3 * k, 0, y + th - 3 * k);
    bg.addColorStop(0, '#1e52b7'); bg.addColorStop(1, '#174499');
    g.fillStyle = bg; g.fillRect(bx, y + 3 * k, bwid, th - 6 * k);
    g.save(); g.beginPath(); g.rect(bx, y, bwid - 4 * k, th); g.clip();
    g.fillStyle = '#fff'; g.fillText(title, bx + 8 * k, y + th / 2);
    g.restore();
  }
  function finish() {
    on = closing = false; doneAt = 0; stamps = []; lastStep = lastTick = null;
    g.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
  }

  return {
    get active() { return on; },
    // the orb's place while the storm lasts: swollen a little round the middle, so the window's
    // figure 8 runs round it (rect: where it would be, or null for the middle of the window)
    orbRect(rect) {
      if (swell < 0.001) return rect;
      const W = innerWidth, H = innerHeight, s = (rect ? Math.min(rect.w, rect.h) : Math.min(W, H)) * (1 + 0.45 * swell);
      const cx = rect ? rect.x + rect.w / 2 : W / 2, cy = rect ? rect.y + rect.h / 2 : H / 2;
      return { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
    },
    // bpm: the tempo, for 4 bars of it (0 when it isn't known: 120)
    start(t, bpm) {
      on = true; closing = false; doneAt = 0; stamps = []; lastStep = lastTick = null; look = 0;
      t0 = t; dur = (BARS * 4 * 60) / (bpm || 120); end = t0 + dur;
      canvas.hidden = false;
    },
    stop() { if (on) finish(); },
    // layers: the canvases under it, as the glass takes them; bg: the page's background colour;
    // offset: how far ahead to draw (as the blocks), so the copies land with the 8ths
    draw(t, eng, { layers, bg, offset = 0, calm = false }) {
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      const live = on && !closing;
      swell += ((live ? 1 : 0) - swell) * (1 - Math.exp(-dt / (live ? 0.35 : 0.5)));
      if (!on) return;
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      g.clearRect(0, 0, W, H);
      const bpm = eng.tempo.locked ? eng.tempo.bpm : 120, beat = 60 / bpm;
      const k = dpr * (innerHeight > innerWidth ? 1.3 : 1);
      const G = geometry(innerWidth, innerHeight);
      const [mx, my] = pathAt(live ? Math.min(1, (t - t0) / dur) : 1, G);
      const wx = (mx - G.w / 2) * dpr, wy = (my - G.h / 2) * dpr, ww = G.w * dpr, wh = G.h * dpr;

      // The music: a copy every 8th (a beat with fewer flashes), the look on to the next every beat
      // (every bar); on the beat grid, or (no beat yet) on a clock of its own from the drop
      let stampNow = false;
      if (live) {
        const step = eng.stepAt(t + offset), every = calm ? 4 : 2, turn = calm ? 16 : 4;
        const ticks = [];
        if (step !== null) {
          if (lastStep === null || step < lastStep || step - lastStep > 8) lastStep = step;
          for (let s = Math.floor(lastStep) + 1; s <= step; s++) ticks.push(((s % 16) + 16) % 16);
          lastStep = step;
        } else {
          const n = Math.floor((t - t0) / (beat / 4));
          if (lastTick === null) lastTick = n;
          for (let s = lastTick + 1; s <= n; s++) ticks.push(s % 16);
          lastTick = n;
        }
        for (const i of ticks) {
          if (t - t0 < beat * 0.4) continue; // (the window first, then its copies)
          if (i % turn === 0) look = (look + 1) % LOOKS.length;
          if (i % every === 0) stampNow = true;
        }
      }
      if (live && t > end) { closing = true; closeAt = t; closeFrom = stamps.length; }
      if (closing) {
        stamps.length = Math.min(stamps.length, Math.max(0, closeFrom - Math.floor((t - closeAt) / (beat / 8))));
        if (!stamps.length && !doneAt) doneAt = t;
      }
      compose(W, H, layers, bg);
      // the trail
      for (const s of stamps) {
        const sw = s.c.width / s.k, sh = s.c.height / s.k;
        g.fillStyle = 'rgba(0,0,30,0.3)'; g.fillRect(s.x + 5 * dpr, s.y + 6 * dpr, sw, sh);
        g.drawImage(s.c, s.x, s.y, sw, sh);
      }
      // the window: popping open, closing at the end
      const open = Math.min(1, (t - t0) / 0.09), shut = doneAt ? Math.min(1, (t - doneAt) / 0.14) : 0;
      if (shut >= 1) { finish(); return; }
      const sc = (0.92 + 0.08 * open) * (1 - 0.15 * shut), hung = t - t0 > 4 * beat;
      g.save();
      g.globalAlpha = 1 - shut;
      g.translate(wx + ww / 2, wy + wh / 2); g.scale(sc, sc); g.translate(-(wx + ww / 2), -(wy + wh / 2));
      g.fillStyle = 'rgba(0,0,30,0.35)'; g.fillRect(wx + 5 * dpr, wy + 6 * dpr, ww, wh);
      const { tb, bw } = frame(wx, wy, ww, wh, k, hung);
      content(LOOKS[look], wx + bw, wy + tb, ww - 2 * bw, wh - tb - bw);
      g.restore();
      // a copy of the window as it is now (kept at up to 1.25 pixels a CSS pixel: a sharp 4K screen
      // would make each a few MB, and 32 of them)
      if (stampNow && open >= 1) {
        const ks = Math.min(1, 1.25 / dpr), c = document.createElement('canvas');
        c.width = Math.ceil(ww * ks); c.height = Math.ceil(wh * ks);
        c.getContext('2d').drawImage(canvas, wx, wy, ww, wh, 0, 0, c.width, c.height);
        stamps.push({ x: wx, y: wy, c, k: ks });
        if (stamps.length > 48) stamps.shift();
      }
      if (!closing) cursor(wx + ww * 0.36, wy + tb * 0.55, k);
      const rise = closing ? (doneAt ? 1 - shut : 1) : Math.min(1, (t - t0) / 0.2);
      taskbar(W, H, k, rise, hung ? TITLE + ' (Not Responding)' : TITLE, bpm);
    },
  };
}
