// Big eyes: little windows over your face, each with one feature blown up in place: your eyes
// (far too big for your head) and your mouth, swelling on the kick. After the segcam effect
// lo.fi.sci.fi made. Placed with MediaPipe's face landmarks (see
// tracking.js); points used: iris centres 468 and 473, eye corners 33/133 and 362/263, mouth
// corners 61/291 and lips 13/14.
// size: how much around the feature each window shows (times the feature's width); zoom: how
// much bigger than life.
//
// Windows (the camera effect, K): the room is gone and you show only through little windows that
// pop open wherever something moves, each showing what was there the moment it opened, so moving
// leaves a trail of them; they close again after a second or so, and a burst opens on each kick.
// One stays on your face, live. Also after segcam (its motion windows and trail length), and the
// windows a music video cuts its singer into.
// With the camera as text (the ASCII camera, C) the windows show you as text too, each window the
// theme turned over (its text colour, the characters in the background's), so its text never
// matches the text around it, under a title bar in the ID card's panel colour: you're only there
// in code.
import { RAMP } from './visuals.js';
const PARTS = [
  { title: 'eye', ends: [33, 133], mid: [468], zoom: 1.9, size: 1.3 },
  { title: 'eye', ends: [362, 263], mid: [473], zoom: 1.9, size: 1.3 },
  { title: 'mouth.exe', ends: [61, 291], mid: [13, 14], zoom: 1.45, size: 1.2 },
];
const BAR = 13; // title bar height
const CELL = 16; // movement is looked for in squares of the camera's small picture, this many pixels a side
const MOVED = 9; // how much a square's light has to change (0-255, on average) to count as moving
const MAX = 42; // windows open at once, at most
const SHAPES = [[4, 3], [1, 1], [16, 10], [3, 4]];
// the face's outline (MediaPipe's face oval), for the window on it
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

// The title bar of a window of text: the ID card's panel colour (the theme's ink: navy on the
// blue theme, grey on the white one) where that stands apart from the page, else the page a fifth
// of the way to the text colour. (A window of text is the text colour inside: a bar of that colour
// melted into it, and the frame with it.)
function barOf(col) {
  const apart = Math.abs(col.ink[0] - col.bg[0]) + Math.abs(col.ink[1] - col.bg[1]) + Math.abs(col.ink[2] - col.bg[2]);
  return apart > 60 ? col.ink : col.bg.map((c, i) => Math.round(c + (col.fg[i] - c) * 0.2));
}

// A piece of the camera's small picture (fx, fy, fw, fh, in its own pixels) as text, the ASCII
// camera's way (its ramp, 14 px rows), filling w x h of ix: the characters in ink on paper, dense
// where it's light, or, on light paper, where it's dark (so it isn't a negative). cw: a
// character's width.
const ROW = 14;
function asText(ix, w, h, frame, fx, fy, fw, fh, paper, ink, cw) {
  ix.fillStyle = `rgb(${paper})`;
  ix.fillRect(0, 0, w, h);
  ix.fillStyle = `rgb(${ink})`;
  ix.font = `${ROW}px "JetBrains Mono", Consolas, monospace`;
  ix.textBaseline = 'top';
  const light = paper[0] + paper[1] + paper[2] > ink[0] + ink[1] + ink[2];
  const cols = Math.max(1, Math.floor(w / cw)), rows = Math.max(1, Math.floor(h / ROW));
  const x0 = (w - cols * cw) / 2, y0 = (h - rows * ROW) / 2;
  for (let y = 0; y < rows; y++) {
    const sy = Math.min(frame.h - 1, Math.max(0, Math.floor(fy + ((y + 0.5) / rows) * fh)));
    let line = '';
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(frame.w - 1, Math.max(0, Math.floor(fx + ((x + 0.5) / cols) * fw)));
      let a = frame.lum[sy * frame.w + sx] / 255;
      if (light) a = 1 - a;
      line += a > 0.06 ? RAMP[Math.min(9, Math.floor(a * 9.99))] : ' ';
    }
    ix.fillText(line, x0, y0 + y * ROW);
  }
}

export function createSegcam(canvas) {
  const ctx = canvas.getContext('2d');
  let cw = 0; // a character's width at 14 px, measured once
  // a picture each for the two eyes, the mouth and the face window, sized in steps of 16 pixels
  // (drawn stretched to fit), so they aren't made anew every frame
  const bufs = [0, 1, 2, 3].map(() => { const c = document.createElement('canvas'); return { c, x: c.getContext('2d') }; });
  const sized = (b, w, h) => {
    const W = Math.max(16, Math.ceil(w / 16) * 16), H = Math.max(16, Math.ceil(h / 16) * 16);
    if (b.c.width !== W || b.c.height !== H) { b.c.width = W; b.c.height = H; }
    return b;
  };
  let drawn = false, pulse = 0, last = 0, spots = null;
  let before = null, wins = [], spare = [], kicked = false; // the last picture, the windows open, canvases to reuse

  const wipe = () => { if (drawn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; } };
  const shut = () => { for (const w of wins) spare.push(w.img); wins = []; before = null; };

  // A window's frame: the title bar in the theme's text colour (on a window of text, the card's
  // panel colour, with its name and close box in the text colour), the outline round it all, its
  // name, a close box.
  function chrome(x, y, w, h, title, col, ascii = false) {
    ctx.fillStyle = `rgb(${ascii ? barOf(col) : col.fg})`;
    ctx.fillRect(x, y - BAR, w, BAR);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgb(${col.fg})`;
    ctx.strokeRect(x, y - BAR, w, h + BAR);
    ctx.fillStyle = `rgb(${ascii ? col.fg : col.bg})`;
    ctx.fillText(title, x + 4, y - BAR / 2 + 0.5);
    ctx.fillRect(x + w - 10, y - BAR + 3, 7, 7);
  }

  // How much each square of the picture changed since the last one; null when it's the same
  // picture (the camera sends about 30 a second, fewer than are drawn).
  function moved(frame) {
    const { lum, w, h } = frame, cols = Math.floor(w / CELL), rows = Math.floor(h / CELL);
    if (!before || before.length !== lum.length) { before = lum.slice(); return null; }
    const score = new Float32Array(cols * rows);
    let any = 0;
    for (let y = 0; y < rows * CELL; y++) {
      const row = Math.floor(y / CELL) * cols;
      for (let x = 0; x < cols * CELL; x++) {
        const d = Math.abs(lum[y * w + x] - before[y * w + x]);
        score[row + Math.floor(x / CELL)] += d;
        any += d;
      }
    }
    if (!any) return null;
    before.set(lum);
    for (let i = 0; i < score.length; i++) score[i] /= CELL * CELL;
    return { score, cols };
  }

  // A window at (cx, cy) of the small picture, showing what's there now (as text, with ascii).
  // (Kept inside the picture: one reaching past its edge would show a strip of whatever its
  // canvas held before.)
  function open(cx, cy, frame, t, rect, crop, ascii, col) {
    const [a, b] = SHAPES[Math.floor(Math.random() * SHAPES.length)], side = CELL * (1.6 + Math.random() * 2.4);
    const sw = Math.min(frame.w, (side * a) / Math.max(a, b)), sh = Math.min(frame.h, (side * b) / Math.max(a, b)), k = rect.w / frame.w;
    cx = Math.min(frame.w - sw / 2, Math.max(sw / 2, cx));
    cy = Math.min(frame.h - sh / 2, Math.max(sh / 2, cy));
    const w = Math.round(sw * k), h = Math.round(sh * k);
    const img = spare.pop() || document.createElement('canvas');
    // (text drawn at the screen's own resolution, so it stays sharp)
    const dpr = ascii ? Math.min(1.5, devicePixelRatio || 1) : 1, iw = Math.max(1, Math.round(w * dpr)), ih = Math.max(1, Math.round(h * dpr));
    if (img.width !== iw || img.height !== ih) { img.width = iw; img.height = ih; }
    const ix = img.getContext('2d');
    ix.setTransform(1, 0, 0, 1, 0, 0);
    ix.clearRect(0, 0, img.width, img.height);
    if (ascii) {
      ix.setTransform(dpr, 0, 0, dpr, 0, 0);
      asText(ix, w, h, frame, cx - sw / 2, cy - sh / 2, sw, sh, col.fg, col.bg, cw);
    } else if (!crop({ x: (cx - sw / 2) / frame.w, y: (cy - sh / 2) / frame.h, w: sw / frame.w, h: sh / frame.h }, ix, img.width, img.height)) { spare.push(img); return; }
    wins.push({ x: rect.x + (cx - sw / 2) * k, y: rect.y + (cy - sh / 2) * k, w, h, cx, cy, born: t, life: 0.7 + Math.random() * 0.9, img, ascii, title: `motion#${1000 + Math.floor(Math.random() * 9000)}` });
    if (wins.length > MAX) spare.push(wins.shift().img);
  }

  return {
    clear() { wipe(); spots = null; shut(); },
    kick(s) { pulse = Math.max(pulse, Math.min(1, s)); kicked = true; },
    // face: the 478 face points (camera's own 0-1 coordinates); place, crop, rect: as for the lens;
    // eyes: the big eyes on; windows: the windows effect on; frame: the camera's small picture
    // (light levels; see createWebcam); ascii: the windows show you as text.
    draw(t, { face, place, crop, rect, col, eyes = true, windows = false, frame = null, ascii = false }) {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      pulse *= Math.exp(-dt * 6);
      const dpr = Math.min(1.5, devicePixelRatio || 1), w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = true; }
      if (!rect) { wipe(); spots = null; shut(); return; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!cw) { ctx.font = `${ROW}px "JetBrains Mono", Consolas, monospace`; cw = ctx.measureText('M'.repeat(100)).width / 100 || 8.4; }
      ctx.font = '9px "JetBrains Mono", Consolas, monospace';
      ctx.textBaseline = 'middle';
      drawn = true;

      if (windows && frame) {
        // new windows where it moved most (two a picture, five on a kick, never right on top of
        // one just opened), old ones closing
        const m = moved(frame);
        if (m) {
          const want = kicked ? 5 : 2, floor = kicked ? MOVED / 3 : MOVED;
          let made = 0;
          for (const c of [...m.score.keys()].sort((p, q) => m.score[q] - m.score[p])) {
            if (made >= want || m.score[c] < floor) break;
            const cx = ((c % m.cols) + 0.5) * CELL, cy = (Math.floor(c / m.cols) + 0.5) * CELL;
            if (wins.some((o) => t - o.born < 0.12 && Math.abs(o.cx - cx) < CELL * 1.5 && Math.abs(o.cy - cy) < CELL * 1.5)) continue;
            open(cx, cy, frame, t, rect, crop, ascii, col);
            made++;
          }
          kicked = false;
        }
        for (const o of wins) if (t - o.born >= o.life) spare.push(o.img);
        wins = wins.filter((o) => t - o.born < o.life);
        for (const o of wins) {
          ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
          chrome(o.x, o.y, o.w, o.h, o.title, col, o.ascii);
        }
        // the face, live, in a window of its own
        if (face) {
          const P = OVAL.map((i) => place(face[i][0], face[i][1]));
          const x0 = Math.min(...P.map((p) => p[0])), x1 = Math.max(...P.map((p) => p[0])), y0 = Math.min(...P.map((p) => p[1])), y1 = Math.max(...P.map((p) => p[1]));
          const fw = (x1 - x0) * 1.3, fh = (y1 - y0) * 1.2, fx = (x0 + x1) / 2 - fw / 2, fy = (y0 + y1) / 2 - fh / 2;
          const src = { x: (fx - rect.x) / rect.w, y: (fy - rect.y) / rect.h, w: fw / rect.w, h: fh / rect.h };
          if (ascii && fw > 8) {
            // as text, live: at the screen's resolution, drawn in the window's own size
            const b = sized(bufs[3], fw * dpr, fh * dpr);
            b.x.setTransform(b.c.width / fw, 0, 0, b.c.height / fh, 0, 0);
            asText(b.x, fw, fh, frame, src.x * frame.w, src.y * frame.h, src.w * frame.w, src.h * frame.h, col.fg, col.bg, cw);
            ctx.drawImage(b.c, fx, fy, fw, fh);
            chrome(fx, fy, fw, fh, 'you.txt', col, true);
          } else {
            const b = sized(bufs[3], fw, fh);
            b.x.setTransform(1, 0, 0, 1, 0, 0);
            if (fw > 8 && crop(src, b.x, b.c.width, b.c.height)) {
              ctx.drawImage(b.c, fx, fy, fw, fh);
              chrome(fx, fy, fw, fh, 'you.exe', col);
            }
          }
        }
      } else if (wins.length || before) shut();

      if (!eyes || !face) { spots = null; return; }
      // where each part is on screen and how wide, eased so the windows glide between looks
      const want = PARTS.map((p) => {
        const [a, b] = p.ends.map((i) => place(face[i][0], face[i][1]));
        const m = p.mid.map((i) => place(face[i][0], face[i][1]));
        return { x: m.reduce((s, q) => s + q[0], 0) / m.length, y: m.reduce((s, q) => s + q[1], 0) / m.length, w: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      });
      const k = spots ? Math.min(1, dt * 20) : 1;
      spots = want.map((q, i) => (spots ? { x: spots[i].x + (q.x - spots[i].x) * k, y: spots[i].y + (q.y - spots[i].y) * k, w: spots[i].w + (q.w - spots[i].w) * k } : q));
      // the mouth first, so the eyes sit on top where they meet; the eyes named for the side of
      // the screen they're on
      const leftEye = spots[0].x < spots[1].x ? 0 : 1;
      for (const i of [2, 0, 1]) {
        const p = PARTS[i], s = spots[i];
        const title = i === 2 ? p.title : i === leftEye ? 'eye_l.exe' : 'eye_r.exe';
        if (s.w < 4) continue;
        const side = s.w * p.size, grow = p.zoom * (1 + 0.14 * pulse), out = side * grow;
        const src = { x: (s.x - side / 2 - rect.x) / rect.w, y: (s.y - (side * 0.75) / 2 - rect.y) / rect.h, w: side / rect.w, h: (side * 0.75) / rect.h };
        const dw = Math.round(out), dh = Math.round(out * 0.75), b = sized(bufs[i], dw, dh);
        if (!crop(src, b.x, b.c.width, b.c.height)) continue;
        const x = s.x - dw / 2, y = s.y - dh / 2;
        ctx.drawImage(b.c, x, y, dw, dh);
        chrome(x, y, dw, dh, title, col);
      }
    },
  };
}
