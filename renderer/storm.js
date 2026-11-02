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
    const w = Math.round(H > W ? W * 0.56 : W * 0.28), h = Math.round(w * 0.68);
    return { w, h, ax: ((W - w) / 2) * 0.85, ay: ((H - h - 40) / 2) * 0.78, cx: W / 2, cy: (H - 40) / 2 + 6 };
  }
  const pathAt = (u, G) => [G.cx + G.ax * Math.sin(4 * Math.PI * u), G.cy - G.ay * Math.cos(2 * Math.PI * u)];

  // the window's frame, as the pop-ups' Luna windows in style.css: XP's blue round it, the title bar's gradient with its
  // top corners rounded, the title (cut short with "..." where it would run under the buttons) and the three buttons
  const stops = (gr, list) => { for (const [o, c] of list) gr.addColorStop(o, c); return gr; };
  const TITLEBAR = [[0, '#0997ff'], [0.08, '#0053ee'], [0.4, '#0050ee'], [0.88, '#0066ff'], [0.93, '#0066ff'], [0.95, '#005bff'], [0.96, '#003dd7'], [1, '#003dd7']];
  const BLUE_BTN = [[0, '#0054e9'], [0.55, '#2263d5'], [0.7, '#4479e4'], [0.9, '#a3bbec'], [1, '#fff']];
  const RED_BTN = [[0, '#cc4600'], [0.55, '#dc6527'], [0.7, '#cd7546'], [0.9, '#ffccb2'], [1, '#fff']];
  function frame(x, y, w, h, k, hung) {
    const tb = Math.round(22 * k), r = 7 * k, bw = Math.max(2, Math.round(3 * k));
    const top = (bottom) => { g.beginPath(); g.moveTo(x, bottom); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, bottom); g.closePath(); };
    top(y + h);
    g.lineWidth = bw; g.strokeStyle = '#0831d9'; g.stroke();
    top(y + tb);
    g.fillStyle = stops(g.createLinearGradient(0, y, 0, y + tb), TITLEBAR); g.fill();
    const bs = Math.round(16 * k), by = y + (tb - bs) / 2;
    g.font = `bold ${Math.round(11 * k)}px "Trebuchet MS", Tahoma, sans-serif`; g.textBaseline = 'middle';
    let text = hung ? TITLE + ' (Not Responding)' : TITLE;
    const room = w - bs * 3 - 18 * k;
    if (g.measureText(text).width > room) {
      while (text.length > 4 && g.measureText(text + '...').width > room) text = text.slice(0, -1);
      text = text.trimEnd() + '...';
    }
    g.fillStyle = '#0f1089'; g.fillText(text, x + 8 * k + Math.max(1, k * 0.8), y + tb / 2 + Math.max(1, k * 0.8));
    g.fillStyle = '#fff'; g.fillText(text, x + 8 * k, y + tb / 2);
    const btn = (bx, red, glyph) => {
      const cx = bx + bs * 0.9, cy = by + bs * 0.9;
      g.beginPath(); g.roundRect(bx, by, bs, bs, 3 * k);
      g.fillStyle = stops(g.createRadialGradient(cx, cy, 0, cx, cy, bs * 1.27), red ? RED_BTN : BLUE_BTN); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, k * 0.8); g.stroke();
      g.lineWidth = Math.max(1.5, 2 * k); g.lineCap = 'round'; g.beginPath(); glyph(bx, by, bs); g.stroke(); g.lineCap = 'butt';
    };
    btn(x + w - bs * 3 - 6 * k, false, (bx, b, s) => { g.moveTo(bx + s * 0.28, b + s * 0.72); g.lineTo(bx + s * 0.58, b + s * 0.72); });
    btn(x + w - bs * 2 - 4 * k, false, (bx, b, s) => { g.rect(bx + s * 0.27, b + s * 0.27, s * 0.46, s * 0.46); g.moveTo(bx + s * 0.27, b + s * 0.32); g.lineTo(bx + s * 0.73, b + s * 0.32); });
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
  // the taskbar, risen rise (0-1) of its height, as the takeover's in style.css: the green start button (toast) with
  // XP's four-colour flag, the window's button (pressed, its icon and title) and the tray, a speaker and the tempo
  function taskbar(W, H, k, rise, title, bpm) {
    const th = Math.round(30 * k), y = H - th * rise;
    g.fillStyle = stops(g.createLinearGradient(0, y, 0, y + th), [[0, '#3168d5'], [0.04, '#4993e6'], [0.09, '#2157d7'], [0.6, '#2663e0'], [1, '#1941a5']]);
    g.fillRect(0, y, W, th);
    const sw = Math.round(100 * k), rad = 10 * k;
    g.fillStyle = stops(g.createRadialGradient(sw / 2, y + th * 0.2, 0, sw / 2, y + th * 0.2, Math.hypot(sw / 2, th * 0.8)), [[0, '#5eb75e'], [0.45, '#3c9a3c'], [1, '#2f852f']]);
    g.beginPath(); g.roundRect(0, y, sw, th, [0, rad, rad, 0]); g.fill();
    // (the flag: red, green, blue, yellow, a little gap between them, leaning a little)
    const fs = Math.round(15 * k), fx = 9 * k, fy = y + (th - fs) / 2, half = fs / 2 - Math.max(0.5, k * 0.6);
    g.save(); g.translate(fx, fy + fs / 2); g.transform(1, -0.1, 0, 1, 0, 0); g.translate(0, -fs / 2);
    for (const [c, i, j] of [['#f25022', 0, 0], ['#7fba00', 1, 0], ['#00a4ef', 0, 1], ['#ffb900', 1, 1]]) { g.fillStyle = c; g.fillRect(i * (fs - half), j * (fs - half), half, half); }
    g.restore();
    g.font = `italic bold ${Math.round(16 * k)}px "Trebuchet MS", Tahoma, sans-serif`; g.textBaseline = 'middle';
    g.fillStyle = '#1a4a1a'; g.fillText('toast', fx + fs + 5 * k + Math.max(1, k * 0.8), y + th / 2 + Math.max(1, k * 0.8));
    g.fillStyle = '#fff'; g.fillText('toast', fx + fs + 5 * k, y + th / 2);
    const tw = Math.round(104 * k), tx = W - tw;
    g.fillStyle = stops(g.createLinearGradient(0, y, 0, y + th), [[0, '#0c59b9'], [0.06, '#139ee9'], [0.1, '#18b5f2'], [0.14, '#139beb'], [0.6, '#1290e8'], [0.76, '#0d8dea'], [1, '#0961b7']]);
    g.fillRect(tx, y, tw, th);
    g.fillStyle = '#092e7a'; g.fillRect(tx, y, Math.max(1, k), th);
    g.fillStyle = '#18bbff'; g.fillRect(tx + Math.max(1, k), y, Math.max(1, k * 0.8), th);
    // (the speaker)
    const vx = tx + 11 * k, vy = y + th / 2;
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(vx, vy - 1.5 * k); g.lineTo(vx + 3.5 * k, vy - 1.5 * k); g.lineTo(vx + 8 * k, vy - 5 * k); g.lineTo(vx + 8 * k, vy + 5 * k); g.lineTo(vx + 3.5 * k, vy + 1.5 * k); g.lineTo(vx, vy + 1.5 * k); g.closePath(); g.fill();
    g.font = `${Math.round(11 * k)}px Tahoma, "Segoe UI", sans-serif`;
    g.fillText(`${Math.round(bpm)} BPM`, vx + 16 * k, y + th / 2);
    const bx = sw + 6 * k, bwid = Math.min(Math.round(200 * k), tx - bx - 6 * k), bh = th - 7 * k, btop = y + 3.5 * k;
    g.fillStyle = '#1e52b7'; g.beginPath(); g.roundRect(bx, btop, bwid, bh, 3 * k); g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(bx, btop + bh); g.lineTo(bx, btop); g.lineTo(bx + bwid, btop); g.stroke();
    // (the window's icon: a little window, its title bar blue)
    const ix = bx + 8 * k, iy = y + th / 2 - 6 * k;
    g.fillStyle = '#ece9d8'; g.fillRect(ix, iy, 14 * k, 12 * k);
    g.fillStyle = '#0058ee'; g.fillRect(ix, iy, 14 * k, 3.5 * k);
    g.beginPath(); g.rect(bx, y, bwid - 5 * k, th); g.clip();
    g.fillStyle = '#fff'; g.fillText(title, ix + 19 * k, y + th / 2);
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
