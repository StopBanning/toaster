// The handheld's power-on, each time the game comes on after being off, as an old handheld's: its light comes on, then
// its screens, flickering; the Toaster emblem and name come down the top screen a pixel at a time and land with a ding,
// the toast popping up out of the toaster; the bottom screen tests itself, reading the cartridge (the song, its tempo
// and key, the four parts it plays) a line at a time, and START is pressed; then both screens tear into the game. Drawn at a low resolution (about 150 pixels across) in the colours of
// the screens' design, then laid on the screens as they are (gamescreen.js). The sound is the song's own.
import { ptext, ptextC, textW } from './gameskins.js';

// When (seconds from the start): the light, each screen coming on, the logo landing (the ding), START pressed, the
// screens tearing into the game, and the end.
export const BOOT = { light: 0.1, on: { top: 0.16, bottom: 0.26 }, land: 1.02, start: 1.48, tear: 1.6, end: 1.9 };

// The emblem: the app's icon, a pixel a letter (the first five rows the toast: a and c its crust, b, d and e its bread;
// then the toaster: f its outline, g its top, h its side, i the >_ on it); MORE, a row of toast to show under it as it
// rises out of the slot.
const EMBLEM = [
  '.........aaaaaaaaaaaaaa.....', '........abbbbbbbbbbbbbba....', '...ccccccccccccccbbbbbbba...',
  '..cdddeeeeeeeeeeecbbbbbba...', '.ceeeeeeeeeeeeeeeec.........', '..ffffffffffffffffffffff....',
  '.fggggggggggggggggggggggf...', 'fggggggggggggggggggggggggf..', 'fhhhhhhhhhhhhhhhhhhhhhhhhf..',
  'fhhhhhhhhhhhhhhhhhhhhhhhhf..', 'fhhhiihhhhhhhhhhhhhhhhhhhfff', 'fhhhhiihhhhhhhhhhhhhhhhhhfif',
  'fhhhhhiihhhhhhhhhhhhhhhhhfif', 'fhhhhhhiihhhhhhhhhhhhhhhhfff', 'fhhhhhiihhhhhhhhhhhhhhhhhf..',
  'fhhhhiihhhhiiiiiiihhhhhhhf..', 'fhhhiihhhhhiiiiiiihhhhhhhf..', 'fhhhhhhhhhhhhhhhhhhhhhhhhf..',
  'fhhhhhhhhhhhhhhhhhhhhhhhhf..', 'fhhhhhhhhhhhhhhhhhhhhhhhhf..', 'fhhhhhhhhhhhhhhhhhhhhhhhhf..',
  'fhhhhhhhhhhhhhhhhhhhhhhhhf..', 'fhhhhhhhhhhhhhhhhhhhhhhhhf..', '.ffffffffffffffffffffffff...',
  '..fffff............fffff....',
];
const TOAST = 5, MORE = '.ceeeeeeeeeeeeeeeecbbbbba...';
const EW = EMBLEM[0].length, EH = EMBLEM.length;

const hex = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
// a number from 0 to 1 for (a, b), always the same (the tearing is the same in every take)
const rnd = (a, b) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// The boot's colours in a screen design: its background, the text, a dim one, and the emblem's (by its letters). The
// theme's own design draws the emblem in line, its side cut out; the LCD in its four greys; the others in its own colours.
const L0 = [195, 208, 212], L1 = [139, 159, 168], L2 = [76, 99, 112], L3 = [27, 41, 50];
const ICON = { a: [110, 61, 23], b: [207, 148, 69], c: [154, 91, 39], d: [251, 224, 166], e: [238, 184, 102], f: [70, 104, 255], g: [52, 72, 214], h: [5, 29, 181], i: [255, 255, 255] };
const VCY = [96, 255, 220], VAM = [255, 178, 64], vk = (c, k) => c.map((v) => v * k);
function palette(design, col) {
  // (the VFD's: its phosphors, cyan and amber, the emblem in them; it can't show the icon's own colours)
  if (design === 'vfd') return { bg: [5, 9, 11], fg: VCY, dim: vk(VCY, 0.3), hi: VAM, ok: [150, 255, 96],
    emblem: { a: VAM, c: VAM, b: vk(VAM, 0.55), e: vk(VAM, 0.55), d: VAM, f: VCY, g: vk(VCY, 0.55), h: vk(VCY, 0.18), i: VCY } };
  if (design === 'lcd') return { bg: L0, fg: L3, dim: L2, hi: L1, ok: L3, emblem: { a: L3, c: L3, b: L1, e: L1, d: L0, f: L3, g: L1, h: L2, i: L0 } };
  if (design === 'os') {
    const bg = col.bg, fg = col.fg, dim = mix(bg, fg, 0.45);
    return { bg, fg, dim, hi: fg, ok: fg, emblem: { a: fg, c: fg, b: dim, e: dim, d: fg, f: fg, g: fg, h: bg, i: fg } };
  }
  return { bg: [8, 10, 22], fg: [235, 238, 250], dim: [92, 102, 140], hi: [255, 77, 141], ok: [156, 255, 87], emblem: ICON };
}

// The emblem at (x, y), k a pixel; its toast lifted by lift pixels (of its own; down into the slot when below 0)
function emblem(c, x, y, k, pal, lift) {
  const at = (row, gy) => { for (let i = 0; i < EW; i++) { const ch = row[i]; if (ch !== '.') { c.fillStyle = hex(pal.emblem[ch]); c.fillRect(x + i * k, y + gy * k, k, k); } } };
  const up = Math.round(lift);
  for (let j = 0; j < TOAST; j++) at(EMBLEM[j], j - up);
  for (let j = 0; j < up; j++) at(MORE, TOAST - up + j); // (more of it out of the slot)
  for (let j = TOAST; j < EH; j++) at(EMBLEM[j], j);
}

// The toast's lift over the boot: down in the slot as it comes down, popping up on the ding, settling a little higher
// than it rests (s: seconds since the ding)
const lift = (s) => (s < 0 ? -2 : s < 0.09 ? -2 + (s / 0.09) * 9 : s < 0.3 ? 7 - ((s - 0.09) / 0.21) * 4 : 3);

// One screen's boot at bt (s) on a canvas lw x lh: which, top or bottom; info: the song (title, bpm, key)
function paint(c, lw, lh, which, bt, pal, info) {
  const on = BOOT.on[which];
  c.fillStyle = '#000'; c.fillRect(0, 0, lw, lh);
  if (bt < on) return;
  c.fillStyle = hex(pal.bg); c.fillRect(0, 0, lw, lh);
  const k = lw >= 190 ? 2 : 1; // (the letters' size: twice as big on a big low screen)
  if (which === 'top') {
    // the emblem and the name, coming down a pixel at a time, landing on the ding
    const ek = 2 * k, blockH = EH * ek + 5 * k + 7 * 2 * k, y1 = Math.round((lh - blockH) / 2);
    const f = Math.min(1, Math.max(0, (bt - on) / (BOOT.land - on))), y = Math.round(-blockH + (y1 + blockH) * f);
    const ding = bt - BOOT.land, flash = ding >= 0 && ding < 0.07;
    emblem(c, Math.round((lw - EW * ek) / 2), y, ek, pal, lift(ding));
    const ty = y + EH * ek + 5 * k;
    ptextC(c, 'TOASTER', lw / 2 + k, ty + k, hex(pal.dim), 2 * k); // (its shadow)
    ptextC(c, 'TOASTER', lw / 2, ty, hex(flash ? pal.hi : pal.fg), 2 * k);
    // the ding: a star over the toast, twinkling out
    if (ding >= 0.06 && ding < 0.42) {
      const sx = Math.round(lw / 2 + 3 * ek), sy = y - 7 * ek, n = ding < 0.24 ? 3 : 2;
      c.fillStyle = hex(pal.fg);
      for (let d = -n; d <= n; d++) { c.fillRect(sx + d * k, sy, k, k); c.fillRect(sx, sy + d * k, k, k); }
    }
  } else {
    // a self-test as it comes on, a line at a time: the cartridge (the song), its tempo and key, and the four parts the
    // game plays, each OK a moment after it's listed (-- for one that isn't playing); then START
    const cx = lw / 2, x = 6 * k, row = 10 * k, s = bt - on, max = Math.floor((lw - 2 * x) / (6 * k)) - 2;
    const title = (info.title || 'now playing').toUpperCase().replace(/[^A-Z0-9 .,:!?'&()/+#-]/g, '');
    const lines = [];
    for (const w of title.split(/\s+/).filter(Boolean)) { const l = lines[lines.length - 1]; if (l !== undefined && (l + ' ' + w).length <= max) lines[lines.length - 1] = l + ' ' + w; else lines.push(w.slice(0, max)); }
    let y = 5 * k;
    if (s >= 0) ptext(c, 'TOASTER OS', x, y, hex(pal.dim), k);
    y += row + 3 * k;
    lines.slice(0, 2).forEach((l, i) => { if (s >= 0.1 + 0.05 * i) ptext(c, (i ? '  ' : '♪ ') + l, x, y, hex(pal.fg), k); y += row; });
    const sub = [info.bpm ? `${Math.round(info.bpm)} BPM` : '', info.key || ''].filter(Boolean).join('  ');
    if (sub && s >= 0.24) ptext(c, sub, x, y, hex(pal.dim), k);
    y += row + 3 * k;
    const parts = info.parts || {}, half = Math.floor((lw - 2 * x) / 2);
    [['KICK', parts.kick], ['CLAP', parts.clap], ['HATS', parts.hats], ['BASS', parts.bass]].forEach(([name, ok], i) => {
      const at = 0.34 + 0.09 * i, px = x + (i % 2) * half;
      if (s >= at) ptext(c, name, px, y, hex(pal.fg), k);
      if (s >= at + 0.07) ptext(c, ok ? 'OK' : '--', px + 30 * k, y, hex(ok ? pal.ok : pal.dim), k);
      if (i % 2) y += row;
    });
    if (bt >= BOOT.land) {
      // PRESS START, blinking, then pressed (lit up inside a box)
      const sy = lh - 14 * k, s = bt - BOOT.land;
      if (bt >= BOOT.start) {
        const w = textW('PRESS START', k) + 8 * k;
        c.fillStyle = hex(pal.fg); c.fillRect(Math.round(cx - w / 2), sy - 3 * k, w, 13 * k);
        ptextC(c, 'PRESS START', cx, sy, hex(pal.bg), k);
      } else if (s > 0.16 && Math.floor((s - 0.16) / 0.1) % 2 === 0) ptextC(c, 'PRESS START', cx, sy, hex(pal.fg), k);
    }
  }
  // the screen coming on: lit too bright, settling, a line of noise rolling down it
  const since = bt - on;
  if (since < 0.09) {
    c.globalAlpha = 0.75 * (1 - since / 0.09); c.fillStyle = '#fff'; c.fillRect(0, 0, lw, lh); c.globalAlpha = 1;
    const ry = Math.floor((since / 0.09) * lh);
    for (let i = 0; i < lw; i += 2) if (rnd(i, ry) > 0.5) { c.fillStyle = hex(pal.fg); c.fillRect(i, ry, 2, 2); }
  }
}

export function createBoot() {
  const lows = {}; // each screen's low canvas, and a second for the tearing
  const low = (which, lw, lh) => {
    let L = lows[which];
    if (!L || L.lw !== lw || L.lh !== lh) {
      const mk = () => { const c = document.createElement('canvas'); c.width = lw; c.height = lh; return c; };
      L = lows[which] = { lw, lh, c: mk() };
    }
    return L;
  };
  return {
    // Draws a screen's boot over r (canvas pixels) at bt: under(), the game's own drawing of that screen, is drawn
    // first once the screens are tearing into it. Returns how the screen is as a real one: off (dark, no glow) till
    // it comes on.
    draw(ctx, r, which, bt, design, col, info, under, look) {
      const s = Math.max(1, Math.floor(r.w / 150)), lw = Math.floor(r.w / s), lh = Math.floor(r.h / s);
      const L = low(which, lw, lh), c = L.c.getContext('2d');
      paint(c, lw, lh, which, bt, palette(design, col), info);
      const w = lw * s, h = lh * s, x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); // (a band slipping sideways stays in its screen)
      ctx.imageSmoothingEnabled = false;
      if (bt < BOOT.tear) {
        ctx.drawImage(L.c, 0, 0, lw, lh, x, y, w, h);
        if (design === 'vfd' && s > 1) {   // (on the VFD its pixels are round dots with dark between, as the game's are)
          if (L.ds !== s) { const g = document.createElement('canvas'); g.width = g.height = s; const gc = g.getContext('2d'); gc.fillStyle = '#000'; gc.fillRect(0, 0, s, s); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(s / 2, s / 2, s * 0.43, 0, 7); gc.fill(); L.dots = ctx.createPattern(g, 'repeat'); L.ds = s; }
          ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); ctx.fillStyle = L.dots; ctx.fillRect(0, 0, w, h); ctx.restore();
        }
      }
      else {
        // the tearing: the game under it, the boot over it in bands, more of them gone each frame, the rest slipping
        // sideways, a ghost of each a little to the right, rows of noise
        const lk = under(), k = (bt - BOOT.tear) / (BOOT.end - BOOT.tear), fi = Math.floor(bt * 30);
        ctx.fillStyle = '#000';
        for (let by = 0, band = 0; by < lh; band++) {
          const bh = 2 + Math.floor(rnd(fi, band * 7 + 1) * 7), rr = rnd(fi, band * 7 + 2);
          if (rr > k * 1.15) {
            const dx = Math.round((rnd(fi, band * 7 + 3) - 0.5) * 2 * (2 + 22 * k)) * s;
            ctx.drawImage(L.c, 0, by, lw, bh, x + dx, y + by * s, w, bh * s);
            ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(L.c, 0, by, lw, bh, x + dx + 2 * s, y + by * s, w, bh * s);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          } else if (rr > k * 0.9) {
            for (let i = 0; i < lw; i += 2) if (rnd(fi + band, i) > 0.55) { ctx.fillStyle = rnd(i, fi) > 0.5 ? '#fff' : '#000'; ctx.fillRect(x + i * s, y + by * s, 2 * s, bh * s); }
          }
          by += bh;
        }
        ctx.restore();
        return lk;
      }
      ctx.restore();
      return bt < BOOT.on[which] ? { glow: 0, black: null, dots: 0, lag: 0, shade: look.shade } : look;
    },
  };
}
