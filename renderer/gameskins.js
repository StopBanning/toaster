// The handheld game's screens in other designs (skins). 'neon' is game.js's own drawing; these paint the same
// game from a model of it that game.js makes each frame (see model() there): the notes coming down the four
// lanes, the targets as they're hit, the latest judgement, the score and the combo, FEVER, the sixteen pads and
// the song.
//   os: Toaster's own look, in the theme's colours: flat and square, lit things inverted, as the app's buttons
//   lcd: a reflective monochrome LCD in four blue-greys at its own low resolution, in a font of our own: its
//     dots, their shadow, its lag
//   highway: gems coming down a fretboard going off into the distance, flames where they're hit
//   dance: arrows rising onto a row of targets, coloured by where in the beat they fall; the pad underneath
// Labels use gamewords.js. Older skins keep their original English labels in Japanese for pixel compatibility.
import { say, sayKey, screenFont, skinSay, skinKey } from './gamewords.js';
const FONT = '"JetBrains Mono", Consolas, monospace';
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// ---------------------------------------------------------------- the pixel font
// Our own 5 x 7 letters, a column of space after each.
const G = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  b: '10000 10000 10110 11001 10001 10001 11110', '#': '01010 01010 11111 01010 11111 01010 01010',
  '.': '00000 00000 00000 00000 00000 01100 01100', ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000', '!': '00100 00100 00100 00100 00100 00000 00100',
  '/': '00001 00010 00010 00100 01000 01000 10000', '+': '00000 00100 00100 11111 00100 00100 00000',
  '?': '01110 10001 00001 00010 00100 00000 00100', "'": '00100 00100 01000 00000 00000 00000 00000',
  ',': '00000 00000 00000 00000 01100 00100 01000', '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000', '&': '01100 10010 10100 01000 10101 10010 01101',
  '×': '00000 10001 01010 00100 01010 10001 00000', '·': '00000 00000 00000 00100 00000 00000 00000',
  '♪': '00110 00101 00100 00100 01100 11100 01000', ' ': '00000 00000 00000 00000 00000 00000 00000',
  // (katakana, for the Japan edition, as the old half-width LCD kana: a dakuten or handakuten is a cell of its own)
  'ア': '11111 00001 00101 00110 00100 00100 01000', 'イ': '00001 00010 00100 01100 10100 00100 00100',
  'ウ': '00100 11111 10001 10001 00001 00010 00100', 'エ': '00000 11111 00100 00100 00100 00100 11111',
  'オ': '00010 11111 00010 00110 01010 10010 00010', 'カ': '01000 11111 01001 01001 01001 01001 10010',
  'キ': '00100 11111 00100 11111 00100 00100 00100', 'ク': '00000 01111 01001 10001 00001 00010 01100',
  'ケ': '01000 01111 10010 00010 00010 00010 00100', 'コ': '00000 11111 00001 00001 00001 00001 11111',
  'サ': '01010 11111 01010 01010 00010 00100 01000', 'シ': '00000 11000 00001 11001 00001 00010 11100',
  'ス': '00000 11111 00001 00010 00100 01010 10001', 'セ': '01000 11111 01001 01010 01000 01000 00111',
  'ソ': '00000 10001 10001 01001 00001 00010 01100', 'タ': '00000 01111 01001 10101 00011 00010 01100',
  'チ': '00010 11100 00100 11111 00100 00100 01000', 'ツ': '00000 10101 10101 10101 00001 00010 00100',
  'テ': '01110 00000 11111 00100 00100 00100 01000', 'ト': '01000 01000 01000 01100 01010 01000 01000',
  'ナ': '00100 00100 11111 00100 00100 01000 10000', 'ニ': '00000 01110 00000 00000 00000 00000 11111',
  'ヌ': '00000 11111 00001 01010 00100 01010 10000', 'ネ': '00100 11111 00010 00100 01110 10101 00100',
  'ノ': '00010 00010 00010 00010 00010 00100 01000', 'ハ': '00000 00100 00010 10001 10001 10001 10001',
  'ヒ': '10000 10000 11111 10000 10000 10000 01111', 'フ': '00000 11111 00001 00001 00001 00010 01100',
  'ヘ': '00000 01000 10100 00010 00001 00001 00000', 'ホ': '00100 11111 00100 00100 10101 10101 00100',
  'マ': '00000 11111 00001 00001 01010 00100 00010', 'ミ': '00000 01110 00000 01110 00000 01110 00001',
  'ム': '00000 00100 01000 10000 10001 11111 00001', 'メ': '00000 00001 00001 01010 00100 01010 10000',
  'モ': '00000 11111 01000 11111 01000 01000 00111', 'ヤ': '01000 01000 11111 01001 01010 01000 01000',
  'ユ': '00000 01110 00010 00010 00010 00010 11111', 'ヨ': '00000 11111 00001 11111 00001 00001 11111',
  'ラ': '01110 00000 11111 00001 00001 00010 00100', 'リ': '10010 10010 10010 10010 00010 00100 01000',
  'ル': '00000 00100 10100 10100 10101 10101 10110', 'レ': '00000 10000 10000 10001 10010 10100 11000',
  'ロ': '00000 11111 10001 10001 10001 10001 11111', 'ワ': '00000 11111 10001 10001 00001 00010 00100',
  'ヲ': '11111 00001 11111 00001 00010 00100 01000', 'ン': '00000 11000 00000 00001 00001 00010 11100',
  'ァ': '00000 00000 11111 00001 00110 00100 01000', 'ィ': '00000 00000 00010 00100 01100 10100 00100',
  'ゥ': '00000 00000 00100 11111 10001 00001 00110', 'ェ': '00000 00000 00000 11111 00100 00100 11111',
  'ォ': '00000 00000 00010 11111 00110 01010 10010', 'ッ': '00000 00000 10101 10101 00001 00010 00100',
  'ャ': '00000 00000 01000 11111 01001 01010 01000', 'ュ': '00000 00000 00000 01110 00010 00010 11111',
  'ョ': '00000 00000 11111 00001 11111 00001 11111', 'ー': '00000 00000 00000 11111 00000 00000 00000',
  '゛': '10100 01010 00000 00000 00000 00000 00000', '゜': '11100 10100 11100 00000 00000 00000 00000',
  '・': '00000 00000 00000 00100 00000 00000 00000', '「': '00111 00100 00100 00100 00000 00000 00000',
  '」': '00000 00000 00000 00100 00100 00100 11100', '、': '00000 00000 00000 00000 10000 01000 00100',
  '。': '00000 00000 00000 00000 11100 10100 11100',
  // Accents occupy the top rows; shorter bodies stay inside the original cell (Å needs a three-row ring).
  'Á': '00010 00100 01110 10001 11111 10001 10001', 'À': '01000 00100 01110 10001 11111 10001 10001',
  'Â': '00100 01010 01110 10001 11111 10001 10001', 'Ä': '01010 00000 01110 10001 11111 10001 10001',
  'Ã': '01001 10110 01110 10001 11111 10001 10001', 'Å': '01110 01010 01110 10001 11111 10001 10001',
  'É': '00010 00100 11111 10000 11110 10000 11111', 'È': '01000 00100 11111 10000 11110 10000 11111',
  'Ê': '00100 01010 11111 10000 11110 10000 11111', 'Ë': '01010 00000 11111 10000 11110 10000 11111',
  'Í': '00010 00100 01110 00100 00100 00100 01110', 'Ì': '01000 00100 01110 00100 00100 00100 01110',
  'Î': '00100 01010 01110 00100 00100 00100 01110', 'Ï': '01010 00000 01110 00100 00100 00100 01110',
  'Ó': '00010 00100 01110 10001 10001 10001 01110', 'Ò': '01000 00100 01110 10001 10001 10001 01110',
  'Ô': '00100 01010 01110 10001 10001 10001 01110', 'Ö': '01010 00000 01110 10001 10001 10001 01110',
  'Õ': '01001 10110 01110 10001 10001 10001 01110',
  'Ú': '00010 00100 10001 10001 10001 10001 01110', 'Ù': '01000 00100 10001 10001 10001 10001 01110',
  'Û': '00100 01010 10001 10001 10001 10001 01110', 'Ü': '01010 00000 10001 10001 10001 10001 01110',
  'Ñ': '01001 10110 10001 11001 10101 10011 10001', 'Ç': '01110 10001 10000 10001 01110 00100 01000',
  'Ø': '01110 10011 10101 10101 10101 11001 01110', 'Æ': '01111 10100 10100 11111 10100 10100 10111',
  'Œ': '01111 10100 10100 10111 10100 10100 01111', 'ß': '01100 10010 10010 10100 10010 10001 10110',
  '¿': '00100 00000 00100 01000 10000 10001 01110', '¡': '00100 00000 00100 00100 00100 00100 00100',
  '«': '00000 00101 01010 10100 01010 00101 00000', '»': '00000 10100 01010 00101 01010 10100 00000',
  '…': '00000 00000 00000 00000 00000 00000 10101',
};
// each letter's rows as runs of lit pixels: [[x, y, len], ...]
const RUNS = Object.fromEntries(Object.entries(G).map(([ch, rows]) => {
  const runs = [];
  rows.split(' ').forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '1') { let n = 1; while (row[x + n] === '1') n++; runs.push([x, y, n]); x += n - 1; } });
  return [ch, runs];
}));
const glyph = (ch) => RUNS[ch] || RUNS[ch.toUpperCase()] || RUNS['?'];
// the cells a text takes: a katakana with a dakuten or handakuten as two, the letter then its mark (ベ as ヘ゛)
const KANA = /[゠-ヿ]/;
const cellsOf = (s) => (KANA.test(s) ? s.normalize('NFC').replace(/[゠-ヿ]/g, (ch) => { const d = ch.normalize('NFD'); return d.length > 1 ? d[0] + (d[1] === '゙' ? '゛' : '゜') : ch; }) : s.normalize('NFC'));
const textW = (s, k = 1) => (cellsOf(s).length * 6 - 1) * k;
// A whole-word end where possible, an explicit ellipsis even for one oversized word.
export function fitText(s, room, measure) {
  if (measure(s) <= room) return s;
  if (measure('…') > room) return '';
  let head = '';
  for (const ch of s) { if (measure(head + ch + '…') > room) break; head += ch; }
  const boundary = head.lastIndexOf(' ');
  if (boundary > 0 && s[head.length] !== ' ') head = head.slice(0, boundary);
  return head.trimEnd() + '…';
}
export function pixelText(s) {
  const covered = (w) => [...String(w).normalize('NFC')].filter((ch) => pixelCovers(ch)).join('');
  const text = covered(s);
  return text.trim() ? text : covered(say('now playing').toUpperCase()).trim() || 'NOW PLAYING';
}
export const fitPixel = (s, room, k = 1) => fitText(pixelText(s), room, (w) => textW(w, k));
// Text at (x, y) (its top left), k pixels a dot; an outline round it if asked
function ptext(c, s, x, y, color, k = 1, outline = null) {
  s = pixelText(s);
  if (outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) ptext(c, s, x + dx, y + dy, outline, k);
  c.fillStyle = color; s = cellsOf(s);
  for (let i = 0; i < s.length; i++) for (const [gx, gy, n] of glyph(s[i])) c.fillRect(x + (i * 6 + gx) * k, y + gy * k, n * k, k);
}
const ptextC = (c, s, cx, y, color, k = 1, outline = null) => {
  s = pixelText(s);
  ptext(c, s, Math.round(cx - textW(s, k) / 2), y, color, k, outline);
};
// (whether every cell of a text has a letter of its own, not the '?')
const pixelCovers = (s) => [...cellsOf(s)].every((ch) => RUNS[ch] || RUNS[ch.toUpperCase()]);
export { ptext, ptextC, textW, cellsOf, pixelCovers, G }; // also used by the glyph-sheet check
// A two-colour checkerboard (dithering): every other pixel
function dither(c, x, y, w, h, color, phase = 0) {
  c.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = (j + phase) & 1; i < w; i += 2) c.fillRect(x + i, y + j, 1, 1);
}

// ---------------------------------------------------------------- lcd
// Its colours by role: four shades of a blue-grey reflective LCD.
const L0 = '#c3d0d4', L1 = '#8b9fa8', L2 = '#4c6370', L3 = '#1b2932';
const LCD = {
  bg: L0, field: L0, grid: L1, bar: L1, barHi: L0, barLo: L2,
  text: L3, dim: L2, faint: L1, outline: L3, judge: { PERFECT: L3, GREAT: L3, GOOD: L2, MISS: L2 },
  lanes: [[L3, L2, L3], [L3, L2, L3], [L3, L2, L3], [L3, L2, L3]],
  miss: L1, chord: L2, fever: [L3, L2], padIn: L0, padOut: L0,
};

// The top screen at its own low resolution (lw x lh, about 160 x 120)
function lcdTop(c, lw, lh, m) {
  const P = LCD, t = m.t, fever = m.fever > 0;
  c.fillStyle = P.bg; c.fillRect(0, 0, lw, lh);
  // the bar: the score, the tempo; in a fever, flashing, and FEVER x2 on it
  const fc = P.fever[Math.floor(t * 8) % P.fever.length];
  c.fillStyle = fever ? fc : P.bar; c.fillRect(0, 0, lw, 11);
  c.fillStyle = P.barHi; c.fillRect(0, 0, lw, 1);
  c.fillStyle = P.barLo; c.fillRect(0, 11, lw, 1);
  const barText = fever ? P.outline : P.text;
  ptext(c, String(m.score).padStart(7, '0'), 3, 2, barText);
  const bpm = m.bpm ? String(Math.round(m.bpm)) : '---';
  ptext(c, '♪' + bpm, lw - 3 - textW('♪' + bpm), 2, fever ? P.outline : P.dim);
  if (fever) ptextC(c, skinSay('FEVER×2'), lw / 2, 2, P.outline);
  // the lanes, their notes falling onto the targets
  const mx = 4, lane = Math.floor((lw - 2 * mx) / 4), x0 = Math.round((lw - 4 * lane) / 2);
  const py0 = 13, labelY = lh - 9, ty = labelY - 7, run = ty - py0;
  for (let i = 0; i < 4; i++) {
    const x = x0 + i * lane;
    c.fillStyle = P.field; c.fillRect(x + 1, py0, lane - 1, labelY - 2 - py0);
    dither(c, x + 1, py0, lane - 1, labelY - 2 - py0, P.bg); // (the lanes' fields stay clear)
    c.fillStyle = P.grid; c.fillRect(x, py0, 1, labelY - 2 - py0);
  }
  c.fillStyle = P.grid; c.fillRect(x0 + 4 * lane, py0, 1, labelY - 2 - py0);
  // in a fever, light runs down the lanes
  if (fever) for (let i = 0; i < 4; i++) {
    const x = x0 + i * lane, y = py0 + ((t * 90 + i * 13) % (run + 8)) - 8;
    dither(c, x + 2, Math.max(py0, y), lane - 3, Math.min(6, ty - Math.max(py0, y)), P.lanes[i][2]);
  }
  // the targets: brackets; lit as they're hit (filled, then dithered as it fades)
  for (let i = 0; i < 4; i++) {
    const x = x0 + i * lane + 3, w = lane - 5, h = 7, y = ty - 3, k = m.hit[i], col = P.lanes[i];
    if (k > 0.5) { c.fillStyle = col[0]; c.fillRect(x + 1, y + 1, w - 2, h - 2); }
    else if (k > 0.05) dither(c, x + 1, y + 1, w - 2, h - 2, col[0], Math.floor(t * 30) & 1);
    c.fillStyle = k > 0.05 ? P.text : P.dim;
    for (const [bx, by, bw, bh] of [[x, y, 3, 1], [x, y, 1, 2], [x + w - 3, y, 3, 1], [x + w - 1, y, 1, 2], [x, y + h - 1, 3, 1], [x, y + h - 2, 1, 2], [x + w - 3, y + h - 1, 3, 1], [x + w - 1, y + h - 2, 1, 2]]) c.fillRect(bx, by, bw, bh);
  }
  // the notes: a pill for a drum (outlined, lit along its top, shaded under), a bar as long as it's held
  // for the bass; under the bar, clipped to the field
  c.save();
  c.beginPath(); c.rect(0, py0, lw, labelY - 2 - py0); c.clip();
  for (const n of m.notes) {
    c.globalAlpha = n.fade ?? 1;   // (a note that came in late fades in)
    const col = n.miss ? [P.miss, P.miss, P.miss] : P.lanes[n.lane];
    const x = x0 + n.lane * lane + 4, w = lane - 7;
    const y = Math.round(ty - (n.held ? 0 : n.d) * run);
    if (n.bass) {
      const top = Math.round(ty - (n.d + n.len) * run);
      if (top > labelY || y < py0 - 6) continue;
      const bx = x + 4, bw = w - 8;
      c.fillStyle = P.outline; c.fillRect(bx - 1, top - 1, bw + 2, y - top + 2);
      c.fillStyle = col[0]; c.fillRect(bx, top, bw, y - top);
      c.fillStyle = col[1]; c.fillRect(bx, top, 1, y - top);
      c.fillStyle = col[2]; c.fillRect(bx + bw - 1, top, 1, y - top);
    } else if (y < py0 - 6 || y > labelY + 4) continue;
    c.fillStyle = P.outline; c.fillRect(x - 1, y - 3, w + 2, 6);
    c.fillStyle = col[1]; c.fillRect(x, y - 2, w, 1);
    c.fillStyle = col[0]; c.fillRect(x, y - 1, w, 2);
    c.fillStyle = col[2]; c.fillRect(x, y + 1, w, 1);
  }
  c.restore();
  // the bursts: sparks flying off the target
  for (const b of m.bursts) {
    const k = b.age / 0.32, cx = x0 + b.lane * lane + lane / 2;
    c.fillStyle = P.text;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + b.lane, r = 3 + k * 11;
      const s = k < 0.5 ? 2 : 1;
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(ty + Math.sin(a) * r * 0.6), s, s);
    }
  }
  // the lane names, lit as they hit
  for (let i = 0; i < 4; i++) ptextC(c, fitPixel(skinSay(['KICK', 'CLAP', 'HATS', 'BASS'][i]), lane - 2), x0 + i * lane + lane / 2, labelY + 1, m.hit[i] > 0.05 ? P.text : P.dim);
  // the combo, big, over the field; the latest judgement over the targets, rising
  if (m.combo >= 2) {
    const up = m.comboPulse > 0 ? 1 : 0;
    ptextC(c, String(m.combo), lw / 2, py0 + 5 - up, P.text, 2, P.outline);
    ptextC(c, skinSay('COMBO'), lw / 2, py0 + 21, P.dim, 1, P.outline);
  }
  if (m.judge && m.judge.age < 0.6) {
    const y = Math.round(ty - 17 - m.judge.age * 16);
    if (m.judge.age < 0.45 || Math.floor(m.judge.age * 20) & 1) ptextC(c, skinSay(m.judge.text), lw / 2, y, P.judge[m.judge.text] || P.text, 1, P.outline);
  }
}

// A pad: an outlined key with a bevel (light along the top and left, dark along the bottom and right),
// pressed in when it's lit
function pad(c, x, y, w, h, face, label, labelColor, lit, P, edge) {
  const dy = lit ? 1 : 0;
  c.fillStyle = P.outline; c.fillRect(x, y, w, h + 1);
  c.fillStyle = face; c.fillRect(x + 1, y + 1 + dy, w - 2, h - 2);
  if (!lit) {
    c.fillStyle = edge[0]; c.fillRect(x + 1, y + 1, w - 2, 1); c.fillRect(x + 1, y + 1, 1, h - 2);
    c.fillStyle = edge[1]; c.fillRect(x + 1, y + h - 2, w - 2, 1); c.fillRect(x + w - 2, y + 1, 1, h - 2);
  }
  ptextC(c, fitPixel(skinSay(label), w - 4), x + w / 2, y + Math.round((h - 7) / 2) + dy, labelColor);
}

// The bottom screen at its own low resolution: the song along the top, the pads, the key and tempo under them
function lcdBottom(c, lw, lh, m) {
  const P = LCD, t = m.t;
  c.fillStyle = P.bg; c.fillRect(0, 0, lw, lh);
  c.fillStyle = P.bar; c.fillRect(0, 0, lw, 11);
  c.fillStyle = P.barHi; c.fillRect(0, 0, lw, 1);
  c.fillStyle = P.barLo; c.fillRect(0, 11, lw, 1);
  // the song, sliding by when it's too long
  const song = '♪ ' + pixelText((m.title || skinSay('LISTENING')).toUpperCase()), sw = textW(song), room = lw - 8;
  c.save(); c.beginPath(); c.rect(4, 0, room, 11); c.clip();
  if (sw <= room) ptext(c, song, 4, 2, P.text);
  else { const off = Math.floor((t * 22) % (sw + 24)); ptext(c, song, 4 - off, 2, P.text); ptext(c, song, 4 - off + sw + 24, 2, P.text); }
  c.restore();
  // the pads
  const gx = 4, gy = 14, gap = 2, fy = lh - 9;
  const pw = Math.floor((lw - 2 * gx - 3 * gap) / 4), ph = Math.floor((fy - 3 - gy - 3 * gap) / 4);
  const x0 = Math.round((lw - (4 * pw + 3 * gap)) / 2);
  m.pads.forEach((p, i) => {
    const x = x0 + (i % 4) * (pw + gap), y = gy + Math.floor(i / 4) * (ph + gap);
    if (p.drum) {
      const lit = p.lit > 0.3;
      pad(c, x, y, pw, ph, lit ? L3 : L0, p.label, lit ? L0 : L3, lit, P, [L0, L1]);
      return;
    }
    const lit = p.bass && p.lit > 0.3;
    const face = lit ? L3 : p.inKey ? P.padIn : P.padOut;
    const label = lit ? L0 : p.inKey ? P.text : P.faint;
    pad(c, x, y, pw, ph, face, p.label, label, lit, P, [L0, L1]);
    if (p.chord && !lit) { dither(c, x + 2, y + 2, pw - 4, ph - 4, P.chord, 0); ptextC(c, fitPixel(skinSay(p.label), pw - 4), x + pw / 2, y + Math.round((ph - 7) / 2), L3); }
    if (p.root) { c.fillStyle = lit ? L0 : P.dim; c.fillRect(x + pw - 4, y + 2 + (lit ? 1 : 0), 2, 2); }
  });
  // the key and the tempo
  ptext(c, skinKey(m.keyName), 4, fy + 1, P.dim);
  const bpm = (m.bpm ? Math.round(m.bpm) : '---') + ' BPM';
  ptext(c, bpm, lw - 4 - textW(bpm), fy + 1, P.dim);
}

// ---------------------------------------------------------------- os: Toaster's own look
function osTop(c, r, m, col) {
  let fg = col.fg, bg = col.bg;
  const fever = m.fever > 0;
  if (fever) [fg, bg] = [bg, fg]; // (in a fever the screen turns inside out)
  const t = m.t, H = r.h, W = r.w;
  c.fillStyle = rgba(bg); c.fillRect(r.x, r.y, W, H);
  const hH = Math.round(H * 0.13), labelH = Math.round(H * 0.12);
  const py0 = r.y + hH, py1 = r.y + H - labelH;
  const face = screenFont(FONT), fs = (k, wt = 600) => `${wt} ${Math.max(7, Math.round(H * k))}px ${face}`;
  c.textBaseline = 'middle';
  // the bar: score at the left, combo in the middle, tempo at the right
  c.font = fs(0.042); c.letterSpacing = `${Math.round(H * 0.006)}px`;
  c.fillStyle = rgba(fg, 0.6); c.textAlign = 'left';
  c.fillText(fitText(say(fever ? 'FEVER ×2' : 'SCORE'), W * 0.65, (s) => c.measureText(s).width), r.x + W * 0.04, r.y + hH * 0.32);
  c.textAlign = 'right'; c.fillText(say('BPM'), r.x + W * 0.96, r.y + hH * 0.32);
  c.letterSpacing = '0px';
  c.font = fs(0.068, 700); c.fillStyle = rgba(fg);
  c.textAlign = 'left'; c.fillText(String(m.score).padStart(7, '0'), r.x + W * 0.04, r.y + hH * 0.72);
  c.textAlign = 'right'; c.fillText(m.bpm ? String(Math.round(m.bpm)) : '---', r.x + W * 0.96, r.y + hH * 0.72);
  if (m.combo >= 2) {
    c.textAlign = 'center'; c.font = fs(0.095, 700);
    c.fillText('×' + m.combo, r.x + W / 2, r.y + hH * 0.52);
  }
  c.fillStyle = rgba(fg, 0.4); c.fillRect(r.x, py0 - 1, W, 1);
  // the lanes, and the beats going down them (faint lines a beat apart, moving with the notes)
  const mx = Math.round(W * 0.04), lane = (W - 2 * mx) / 4, ty = Math.round(py1 - (py1 - py0) * 0.1), run = ty - py0;
  c.fillStyle = rgba(fg, 0.16);
  for (let i = 0; i <= 4; i++) c.fillRect(Math.round(r.x + mx + i * lane), py0, 1, py1 - py0);
  const sub = ((m.step % 4) + 4) % 4;
  for (let k = 0; k <= 4; k++) {
    const y = Math.round(ty - ((k * 4 - sub) / 16) * run);
    if (y < py0 || y > ty) continue;
    c.fillStyle = rgba(fg, k * 4 - sub < 0.5 ? 0 : 0.07); c.fillRect(r.x + mx, y, W - 2 * mx, 1);
  }
  // the targets: a line across, a box in each lane, filled as it's hit
  c.fillStyle = rgba(fg, 0.5); c.fillRect(r.x + mx, ty, W - 2 * mx, 1);
  const nw = Math.round(lane * 0.7), nh = Math.max(4, Math.round(run / 16 * 0.78));
  const block = (x, y, w, h) => { c.beginPath(); c.roundRect(x, y, w, h, Math.max(1, Math.round(h * 0.22))); c.fill(); }; // (as the code's blocks)
  for (let i = 0; i < 4; i++) {
    const x = Math.round(r.x + mx + i * lane + (lane - nw) / 2), y = ty - Math.round(nh * 0.8), h = Math.round(nh * 1.6);
    if (m.hit[i] > 0) { c.fillStyle = rgba(fg, m.hit[i]); c.fillRect(x, y, nw, h); }
    c.strokeStyle = rgba(fg, 0.75); c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, nw - 1, h - 1);
  }
  // the notes: solid blocks, as the code's; the bass a bar as long as it's held
  c.save(); c.beginPath(); c.rect(r.x, py0, W, py1 - py0); c.clip();
  for (const n of m.notes) {
    c.globalAlpha = n.fade ?? 1;   // (a note that came in late fades in)
    const x = Math.round(r.x + mx + n.lane * lane + (lane - nw) / 2), y = Math.round(ty - (n.held ? 0 : n.d) * run);
    if (n.bass) {
      const top = Math.round(ty - (n.d + n.len) * run), bw = Math.round(nw * 0.36);
      c.fillStyle = rgba(fg, n.miss ? 0.25 : 0.55); c.fillRect(x + Math.round((nw - bw) / 2), top, bw, y - top);
    }
    if (n.miss) { c.strokeStyle = rgba(fg, 0.35); c.strokeRect(x + 0.5, y - nh / 2 + 0.5, nw - 1, nh - 1); continue; }
    c.fillStyle = rgba(fg, n.d < 0.06 ? 1 : 0.92); block(x, Math.round(y - nh / 2), nw, nh);
  }
  c.restore();
  // the bursts: four ticks opening from the target
  for (const b of m.bursts) {
    const k = b.age / 0.32, cx = r.x + mx + b.lane * lane + lane / 2, d = nw * (0.5 + 0.5 * k);
    c.fillStyle = rgba(fg, 1 - k);
    c.fillRect(Math.round(cx - d - 4), ty, 4, 1); c.fillRect(Math.round(cx + d), ty, 4, 1);
    c.fillRect(Math.round(cx), Math.round(ty - d * 0.7 - 4), 1, 4); c.fillRect(Math.round(cx), Math.round(ty + d * 0.7), 1, 4);
  }
  // the judgement, over the targets: a stamp, the screen's colour on a pill of its ink, landing with a pop and
  // staying solid till it goes (a MISS only its outline); a line of the screen's colour round it, so the
  // blocks going by behind it don't run into it
  if (m.judge && m.judge.age < 0.6) {
    const age = m.judge.age, miss = m.judge.text === 'MISS';
    const pop = age < 0.09 ? 1 + 0.32 * (1 - age / 0.09) ** 2 : 1, a = age < 0.45 ? 1 : Math.max(0, 1 - (age - 0.45) / 0.15);
    const cx = r.x + W / 2, cy = Math.round(ty - run * 0.24 - Math.min(age, 0.3) * H * 0.04);
    c.save(); c.translate(cx, cy); c.scale(pop, pop); c.globalAlpha = a;
    c.font = fs(0.064, 800); c.textAlign = 'center'; c.letterSpacing = `${Math.round(H * 0.006)}px`;
    const word = fitText(say(m.judge.text), W * 0.9, (s) => c.measureText(s).width), tw = c.measureText(word).width, ph = Math.round(H * 0.1), pw = Math.round(tw + H * 0.07);
    const edge = Math.max(2, Math.round(H * 0.008));
    c.fillStyle = rgba(bg); c.beginPath(); c.roundRect(-pw / 2 - edge, -ph / 2 - edge, pw + 2 * edge, ph + 2 * edge, (ph + 2 * edge) / 2); c.fill();
    c.beginPath(); c.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
    if (miss) { c.strokeStyle = rgba(fg, 0.7); c.lineWidth = Math.max(1, Math.round(H * 0.005)); c.stroke(); c.fillStyle = rgba(fg, 0.7); }
    else { c.fillStyle = rgba(fg); c.fill(); c.fillStyle = rgba(bg); }
    c.fillText(word, Math.round(H * 0.003), 1);
    c.restore(); c.letterSpacing = '0px';
  }
  // the lane names, inverted as they hit
  c.font = fs(0.046); c.textAlign = 'center'; c.letterSpacing = `${Math.round(H * 0.005)}px`;
  for (let i = 0; i < 4; i++) {
    const cx = r.x + mx + i * lane + lane / 2, y = py1 + labelH / 2, lit = m.hit[i] > 0.3;
    if (lit) { c.fillStyle = rgba(fg); c.fillRect(Math.round(cx - lane * 0.4), Math.round(y - labelH * 0.34), Math.round(lane * 0.8), Math.round(labelH * 0.68)); }
    c.fillStyle = lit ? rgba(bg) : rgba(fg, 0.75);
    c.fillText(fitText(say(['KICK', 'CLAP', 'HATS', 'BASS'][i]), lane * 0.9, (s) => c.measureText(s).width), cx, y);
  }
  c.letterSpacing = '0px';
}

function osBottom(c, r, m, col) {
  const fg = col.fg, bg = col.bg, H = r.h, W = r.w, t = m.t;
  c.fillStyle = rgba(bg); c.fillRect(r.x, r.y, W, H);
  const face = screenFont(FONT), fs = (k, wt = 600) => `${wt} ${Math.max(7, Math.round(H * k))}px ${face}`;
  const hH = Math.round(H * 0.13), fH = Math.round(H * 0.11);
  // the song along the top
  c.save(); c.beginPath(); c.rect(r.x + W * 0.04, r.y, W * 0.92, hH); c.clip();
  c.font = fs(0.058, 700); c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = rgba(fg);
  const song = '♪ ' + (m.title || say('listening…')).toUpperCase(), sw = c.measureText(song).width, room = W * 0.92;
  if (sw <= room) c.fillText(song, r.x + W * 0.04, r.y + hH / 2);
  else { const off = (t * H * 0.12) % (sw + H * 0.2); c.fillText(song, r.x + W * 0.04 - off, r.y + hH / 2); c.fillText(song, r.x + W * 0.04 - off + sw + H * 0.2, r.y + hH / 2); }
  c.restore();
  c.fillStyle = rgba(fg, 0.4); c.fillRect(r.x, r.y + hH - 1, W, 1);
  // the pads, as the app's buttons: a line round them; lit, filled and the label in the background's colour
  const gx = Math.round(W * 0.04), gap = Math.round(W * 0.025), gy = r.y + hH + gap, gy1 = r.y + H - fH;
  const pw = (W - 2 * gx - 3 * gap) / 4, ph = (gy1 - gy - 3 * gap) / 4;
  c.font = fs(0.05, 700); c.textAlign = 'center';
  m.pads.forEach((p, i) => {
    const x = Math.round(r.x + gx + (i % 4) * (pw + gap)), y = Math.round(gy + Math.floor(i / 4) * (ph + gap)), w = Math.round(pw), h = Math.round(ph);
    const lit = p.drum ? p.lit : p.bass ? p.lit : 0;
    if (lit > 0.05) { c.fillStyle = rgba(fg, Math.min(1, lit * 1.4)); c.fillRect(x, y, w, h); }
    else if (p.chord) { // (the chord's notes: hatched)
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.strokeStyle = rgba(fg, 0.4); c.lineWidth = 1;
      for (let d = -h; d < w; d += Math.max(4, Math.round(H * 0.022))) { c.beginPath(); c.moveTo(x + d, y + h); c.lineTo(x + d + h, y); c.stroke(); }
      c.restore();
    }
    c.strokeStyle = rgba(fg, p.drum ? 0.85 : p.inKey ? 0.6 : 0.22); c.lineWidth = p.chord && lit < 0.05 ? 2 : 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    c.fillStyle = lit > 0.5 ? rgba(bg) : rgba(fg, p.drum ? 1 : p.inKey ? 0.95 : 0.35);
    c.fillText(fitText(say(p.label), w - 4, (s) => c.measureText(s).width), x + w / 2, y + h / 2 + 1);
    if (p.root) { c.fillStyle = lit > 0.5 ? rgba(bg) : rgba(fg, 0.8); c.fillRect(x + 3, y + 3, 3, 3); }
  });
  // the key and the tempo, as the app's footer
  c.font = fs(0.046); c.fillStyle = rgba(fg, 0.7); c.textAlign = 'center'; c.letterSpacing = `${Math.round(H * 0.004)}px`;
  c.fillText(fitText(`${sayKey(m.keyName)} · ${m.bpm ? Math.round(m.bpm) : '---'} BPM`, W * 0.92, (s) => c.measureText(s).width), r.x + W / 2, gy1 + fH * 0.55);
  c.letterSpacing = '0px';
}

// ---------------------------------------------------------------- dance: arrows rising onto a row of targets
// The lanes as arrows (kick left, clap down, hats up, bass right) rising from the bottom onto their outlines
// along the top; each coloured by where in the beat it falls (on the beat red, between beats blue, the 16ths
// gold); the bass's held notes long, with a tail. A groove gauge along the top fills with the combo; the
// judgement and the combo big in the middle. Underneath: the dance pad, its four arrows lit as they're hit,
// the chord and the bass's note in its middle.
const DANCE = { bg: [9, 8, 18], stripe: [22, 14, 44], outline: [7, 6, 16], receptor: [96, 100, 140], beat: [255, 68, 102], half: [61, 139, 255], quarter: [255, 210, 63], hold: [92, 255, 122], miss: [70, 72, 96] };
const DIRS = [-Math.PI / 2, Math.PI, 0, Math.PI / 2]; // (each lane's arrow turned from pointing up: left, down, up, right)
const ARROW = [[0, -0.5], [0.5, 0.02], [0.2, 0.02], [0.2, 0.5], [-0.2, 0.5], [-0.2, 0.02], [-0.5, 0.02]];
function arrowPath(c, x, y, size, rot) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  c.beginPath();
  ARROW.forEach(([px, py], i) => { const X = x + (px * cs - py * sn) * size, Y = y + (px * sn + py * cs) * size; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
  c.closePath();
}
// An arrow: filled, with a darker rim, lit along its leading half
function arrow(c, x, y, size, rot, color, alpha = 1) {
  arrowPath(c, x, y, size, rot);
  const g = c.createLinearGradient(x - size * 0.5, y - size * 0.5, x + size * 0.5, y + size * 0.5);
  g.addColorStop(0, rgba(mix(color, [255, 255, 255], 0.45), alpha)); g.addColorStop(0.55, rgba(color, alpha)); g.addColorStop(1, rgba(mix(color, [0, 0, 0], 0.35), alpha));
  c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(1.5, size * 0.07); c.strokeStyle = rgba(DANCE.outline, alpha); c.stroke();
  c.lineWidth = Math.max(1, size * 0.03); c.strokeStyle = rgba([255, 255, 255], 0.55 * alpha);
  arrowPath(c, x, y, size * 0.78, rot); c.stroke();
}
function danceTop(c, r, m) {
  const H = r.h, W = r.w, t = m.t, fever = m.fever > 0;
  c.fillStyle = rgba(DANCE.bg); c.fillRect(r.x, r.y, W, H);
  // stripes rising with the beat behind it all
  const beatPos = (m.step / 4) % 1, sh = H * 0.11;
  c.fillStyle = rgba(fever ? mix(DANCE.stripe, [90, 20, 70], 0.6) : DANCE.stripe, 0.8);
  for (let y = -((beatPos * sh * 2) % (sh * 2)); y < H; y += sh * 2) c.fillRect(r.x, r.y + y + sh, W, sh * 0.5);
  const gH = Math.round(H * 0.085), lane = W * 0.92 / 4, x0 = r.x + W * 0.04;
  const size = Math.min(lane * 0.78, H * 0.16), ry = r.y + gH + H * 0.045 + size / 2, run = r.y + H - ry + size;
  // the groove gauge: a segment a note of the combo, all of them flashing in a fever
  const segs = 24, sw = (W * 0.9) / segs, filled = Math.min(segs, m.combo);
  for (let i = 0; i < segs; i++) {
    const on = i < filled, hue = mix([61, 210, 255], [255, 68, 160], i / segs);
    c.fillStyle = on ? rgba(fever && Math.floor(t * 12 + i) % 2 ? [255, 255, 255] : hue) : rgba([40, 40, 64]);
    c.fillRect(Math.round(r.x + W * 0.05 + i * sw), r.y + Math.round(gH * 0.28), Math.ceil(sw - 2), Math.round(gH * 0.5));
  }
  // the targets: outlines along the top, beating with the song, lit white as they're hit
  const pulse = 1 + 0.06 * Math.max(0, 1 - beatPos * 4);
  for (let i = 0; i < 4; i++) {
    const x = x0 + lane * i + lane / 2, k = m.hit[i];
    arrowPath(c, x, ry, size * pulse, DIRS[i]);
    c.fillStyle = rgba(k > 0 ? mix([30, 32, 54], [255, 255, 255], k) : [24, 25, 42]); c.fill();
    c.lineWidth = Math.max(2, size * 0.08); c.strokeStyle = rgba(k > 0 ? [255, 255, 255] : DANCE.receptor); c.stroke();
  }
  // the arrows, rising (the far ones first); the bass's held notes long, with a green tail
  const sorted = [...m.notes].sort((a, b) => b.d - a.d);
  for (const n of sorted) {
    c.globalAlpha = n.fade ?? 1;
    const x = x0 + lane * n.lane + lane / 2, y = ry + (n.held ? 0 : n.d) * run;
    if (y > r.y + H + size || y < r.y - size) continue;
    const color = n.miss ? DANCE.miss : n.bass ? DANCE.hold : n.g % 4 === 0 ? DANCE.beat : n.g % 2 === 0 ? DANCE.half : DANCE.quarter;
    if (n.bass) {
      const tail = ry + (n.d + n.len) * run, tw = size * 0.46;
      c.fillStyle = rgba(color, n.miss ? 0.3 : 0.55); c.fillRect(x - tw / 2, y, tw, Math.max(0, tail - y));
      c.strokeStyle = rgba(DANCE.outline); c.lineWidth = 2; c.strokeRect(x - tw / 2, y, tw, Math.max(0, tail - y));
    }
    arrow(c, x, y, size, DIRS[n.lane], color, n.miss ? 0.55 : 1);
  }
  c.globalAlpha = 1;
  // the hits: rings opening from the targets
  for (const b of m.bursts) {
    const k = b.age / 0.32, x = x0 + lane * b.lane + lane / 2;
    c.strokeStyle = rgba([255, 255, 255], 1 - k); c.lineWidth = Math.max(1.5, size * 0.06 * (1 - k));
    c.beginPath(); c.arc(x, ry, size * (0.45 + 0.5 * k), 0, 7); c.stroke();
  }
  // the judgement and the combo, big in the middle
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const cy = r.y + H * 0.6;
  if (m.judge && m.judge.age < 0.7) {
    const k = Math.min(1, m.judge.age / 0.08), sc = 1.25 - 0.25 * k, a = Math.max(0, 1 - Math.max(0, m.judge.age - 0.45) / 0.25);
    c.font = `italic 800 ${Math.round(H * 0.11 * sc)}px ${FONT}`;
    const g = c.createLinearGradient(0, cy - H * 0.06, 0, cy + H * 0.06);
    const top = { PERFECT: [255, 255, 255], GREAT: [140, 240, 255], GOOD: [170, 255, 150], MISS: [200, 200, 210] }[m.judge.text] || [255, 255, 255];
    const bot = { PERFECT: [255, 200, 60], GREAT: [40, 140, 255], GOOD: [40, 190, 90], MISS: [110, 110, 130] }[m.judge.text] || [200, 200, 200];
    g.addColorStop(0, rgba(top, a)); g.addColorStop(1, rgba(bot, a));
    c.lineWidth = Math.max(3, H * 0.018); c.strokeStyle = rgba(DANCE.outline, a); c.strokeText(skinSay(m.judge.text), r.x + W / 2, cy);
    c.fillStyle = g; c.fillText(skinSay(m.judge.text), r.x + W / 2, cy);
  }
  if (m.combo >= 4) {
    c.font = `italic 800 ${Math.round(H * 0.075)}px ${FONT}`;
    c.lineWidth = Math.max(2, H * 0.012); c.strokeStyle = rgba(DANCE.outline);
    const s = `${m.combo} COMBO`;
    c.strokeText(s, r.x + W / 2, cy + H * 0.11); c.fillStyle = rgba([255, 255, 255]); c.fillText(s, r.x + W / 2, cy + H * 0.11);
  }
  // the score and the tempo along the foot, on a strip of their own the arrows rise from under
  const fH = Math.round(H * 0.1), fy = r.y + H - fH;
  const fg = c.createLinearGradient(0, fy, 0, r.y + H);
  fg.addColorStop(0, rgba([20, 18, 40])); fg.addColorStop(1, rgba([8, 7, 18]));
  c.fillStyle = fg; c.fillRect(r.x, fy, W, fH);
  c.fillStyle = rgba(fever ? [255, 68, 160] : [61, 139, 255], 0.9); c.fillRect(r.x, fy, W, 2);
  c.font = `italic 800 ${Math.round(H * 0.055)}px ${FONT}`; c.fillStyle = rgba([235, 238, 250]); c.textBaseline = 'middle';
  c.textAlign = 'left'; c.fillText(String(m.score).padStart(7, '0'), r.x + W * 0.05, fy + fH * 0.55);
  c.textAlign = 'right'; c.fillStyle = rgba(fever ? [255, 120, 190] : [160, 166, 200]);
  c.fillText((fever ? skinSay('FEVER ×2') + ' · ' : '') + (m.bpm ? Math.round(m.bpm) : '---') + ' BPM', r.x + W * 0.95, fy + fH * 0.55);
}
function danceBottom(c, r, m) {
  const H = r.h, W = r.w;
  const g = c.createLinearGradient(r.x, r.y, r.x + W, r.y + H);
  g.addColorStop(0, '#1d2029'); g.addColorStop(1, '#0f1116');
  c.fillStyle = g; c.fillRect(r.x, r.y, W, H);
  const tH = H * 0.12;
  c.font = `italic 800 ${Math.round(H * 0.06)}px ${FONT}`; c.textBaseline = 'middle'; c.fillStyle = rgba([235, 238, 250]);
  c.textAlign = 'left'; c.fillText('♪ ' + fitText((m.title || skinSay('listening…')).toUpperCase(), W * 0.65, (s) => c.measureText(s).width), r.x + W * 0.04, r.y + tH * 0.55);
  c.textAlign = 'right'; c.fillStyle = rgba([150, 156, 190]); c.font = `700 ${Math.round(H * 0.045)}px ${FONT}`;
  c.fillText(skinKey(m.keyName), r.x + W * 0.96, r.y + tH * 0.55);
  // the pad: a cross of four arrow panels round a middle one, square metal at the corners
  const P = Math.min((W * 0.92) / 3, (H - tH - H * 0.04) / 3) * 0.96, gap = P * 0.05;
  const px0 = r.x + (W - 3 * P) / 2, py0 = r.y + tH + (H - tH - 3 * P) / 2;
  const cells = { '1,0': 2, '0,1': 0, '2,1': 3, '1,2': 1 }; // (up: hats, left: kick, right: bass, down: clap)
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    const x = px0 + gx * P + gap / 2, y = py0 + gy * P + gap / 2, s = P - gap, lane = cells[`${gx},${gy}`];
    const panel = c.createLinearGradient(x, y, x, y + s);
    panel.addColorStop(0, '#2c303c'); panel.addColorStop(1, '#1a1d25');
    c.fillStyle = panel; c.beginPath(); c.roundRect(x, y, s, s, s * 0.08); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2; c.stroke();
    if (lane === undefined && !(gx === 1 && gy === 1)) { // (a corner: four screws)
      c.fillStyle = 'rgba(120,126,150,0.6)';
      for (const [sx, sy] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) { c.beginPath(); c.arc(x + s * sx, y + s * sy, s * 0.035, 0, 7); c.fill(); }
      continue;
    }
    if (gx === 1 && gy === 1) { // the middle: the chord and the bass's note
      c.textAlign = 'center'; c.fillStyle = rgba([235, 238, 250]);
      c.font = `800 ${Math.round(s * 0.3)}px ${FONT}`; c.fillText(m.chordName || '—', x + s / 2, y + s * 0.42);
      c.font = `700 ${Math.round(s * 0.14)}px ${FONT}`; c.fillStyle = rgba(DANCE.hold); c.fillText(m.bassName ? skinSay('BASS') + ' ' + m.bassName : '', x + s / 2, y + s * 0.74);
      continue;
    }
    const k = m.hit[lane], color = [DANCE.beat, DANCE.half, DANCE.quarter, DANCE.hold][lane];
    if (k > 0) { c.fillStyle = rgba(color, 0.35 * k); c.beginPath(); c.roundRect(x, y, s, s, s * 0.08); c.fill(); }
    arrowPath(c, x + s / 2, y + s / 2, s * 0.62, DIRS[lane]);
    c.fillStyle = rgba(k > 0 ? mix(mix(color, [0, 0, 0], 0.5), color, k) : mix(color, [0, 0, 0], 0.62)); c.fill();
    c.lineWidth = Math.max(2, s * 0.04); c.strokeStyle = rgba(k > 0 ? [255, 255, 255] : mix(color, [0, 0, 0], 0.2), k > 0 ? 0.9 : 0.8); c.stroke();
  }
}

// ---------------------------------------------------------------- highway: gems coming down a fretboard
// The four lanes as a highway going off into the distance, the beats as frets across it rushing towards you,
// each note a gem in its lane's colour coming down to its ring on the strike line, a flame where it's hit;
// the bass's held notes a gem with a tail. The score, a multiplier that climbs with the combo (×1 to ×4)
// and the streak in the corners; in a fever the gems turn white-blue and the rails glow.
const HW = { lanes: [[255, 70, 120], [255, 176, 46], [62, 210, 255], [120, 230, 90]], bg: [9, 10, 18], road: [26, 28, 44], rail: [150, 160, 210], fever: [190, 235, 255] };
function highwayTop(c, r, m) {
  const H = r.h, W = r.w, t = m.t, fever = m.fever > 0;
  const g0 = c.createLinearGradient(0, r.y, 0, r.y + H);
  g0.addColorStop(0, '#04050b'); g0.addColorStop(1, rgba(HW.bg)); c.fillStyle = g0; c.fillRect(r.x, r.y, W, H);
  const ys = r.y + H * 0.83, yFar = r.y + H * 0.1, k = 2.6, p1 = 1 / (1 + k), yv = (yFar - ys * p1) / (1 - p1);
  const nearW = W * 0.86, cx = r.x + W / 2;
  const P = (d) => 1 / (1 + k * Math.max(-0.12, d));
  const Y = (d) => yv + (ys - yv) * P(d), X = (d, u) => cx + (u - 0.5) * nearW * P(d); // (u: across, 0-1)
  // the road
  const dN = -0.1, dF = 1.0;
  c.beginPath(); c.moveTo(X(dN, 0), Y(dN)); c.lineTo(X(dF, 0), Y(dF)); c.lineTo(X(dF, 1), Y(dF)); c.lineTo(X(dN, 1), Y(dN)); c.closePath();
  const rg = c.createLinearGradient(0, Y(dF), 0, Y(dN));
  rg.addColorStop(0, rgba(HW.road, 0.25)); rg.addColorStop(1, rgba(mix(HW.road, [50, 54, 80], 0.5)));
  c.fillStyle = rg; c.fill();
  // the frets: a line across on each beat, brighter on the bar's first
  for (let g = Math.ceil(m.step / 4) * 4; g <= m.step + 16; g += 4) {
    const d = (g - m.step) / 16;
    c.strokeStyle = rgba([210, 215, 240], (g % 16 === 0 ? 0.55 : 0.22) * (1 - d * 0.6)); c.lineWidth = g % 16 === 0 ? 2 : 1;
    c.beginPath(); c.moveTo(X(d, 0), Y(d)); c.lineTo(X(d, 1), Y(d)); c.stroke();
  }
  // the lanes' lines, and the rails (glowing in a fever)
  for (let i = 1; i < 4; i++) { c.strokeStyle = rgba([120, 126, 170], 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(X(dN, i / 4), Y(dN)); c.lineTo(X(dF, i / 4), Y(dF)); c.stroke(); }
  for (const u of [0, 1]) {
    c.strokeStyle = rgba(fever ? HW.fever : HW.rail, fever ? 0.95 : 0.7); c.lineWidth = fever ? 4 : 2.5;
    c.beginPath(); c.moveTo(X(dN, u), Y(dN)); c.lineTo(X(dF, u), Y(dF)); c.stroke();
  }
  // the strike line and its four rings, filled and flaming as they're hit
  const rr = (nearW / 4) * 0.34;
  c.strokeStyle = rgba([230, 232, 255], 0.75); c.lineWidth = 2;
  c.beginPath(); c.moveTo(X(0, 0), ys); c.lineTo(X(0, 1), ys); c.stroke();
  for (let i = 0; i < 4; i++) {
    const x = X(0, (i + 0.5) / 4), col = HW.lanes[i], h = m.hit[i];
    c.fillStyle = rgba(mix([12, 13, 22], col, 0.25 + 0.75 * h)); c.beginPath(); c.ellipse(x, ys, rr, rr * 0.5, 0, 0, 7); c.fill();
    c.strokeStyle = rgba(col); c.lineWidth = Math.max(2, rr * 0.18); c.stroke();
    c.strokeStyle = rgba([255, 255, 255], 0.5); c.lineWidth = 1; c.beginPath(); c.ellipse(x, ys - rr * 0.05, rr * 0.62, rr * 0.28, 0, 0, 7); c.stroke();
  }
  // the gems, the far ones first; the bass's with a tail up the lane
  const sorted = [...m.notes].sort((a, b) => b.d - a.d);
  for (const n of sorted) {
    c.globalAlpha = n.fade ?? 1;
    const d = n.held ? 0 : n.d;
    if (d > 1 || d < -0.12) continue;
    const u = (n.lane + 0.5) / 4, x = X(d, u), y = Y(d), s = P(d), col = n.miss ? [90, 92, 110] : fever ? HW.fever : HW.lanes[n.lane];
    if (n.bass) {
      const d2 = Math.min(1, n.d + n.len), steps = 8;
      c.fillStyle = rgba(col, 0.55);
      c.beginPath();
      for (let j = 0; j <= steps; j++) { const dd = d + (d2 - d) * (j / steps); c.lineTo(X(dd, u) - rr * 0.22 * P(dd), Y(dd)); }
      for (let j = steps; j >= 0; j--) { const dd = d + (d2 - d) * (j / steps); c.lineTo(X(dd, u) + rr * 0.22 * P(dd), Y(dd)); }
      c.closePath(); c.fill();
    }
    const gr = rr * 0.86 * s;
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(x, y + gr * 0.22, gr, gr * 0.5, 0, 0, 7); c.fill();
    const gg = c.createLinearGradient(0, y - gr * 0.5, 0, y + gr * 0.5);
    gg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.5))); gg.addColorStop(0.5, rgba(col)); gg.addColorStop(1, rgba(mix(col, [0, 0, 0], 0.45)));
    c.fillStyle = gg; c.beginPath(); c.ellipse(x, y, gr, gr * 0.5, 0, 0, 7); c.fill();
    c.strokeStyle = rgba(mix(col, [0, 0, 0], 0.55)); c.lineWidth = Math.max(1, gr * 0.12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x - gr * 0.25, y - gr * 0.16, gr * 0.3, gr * 0.12, 0, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  // the flames: tongues of the lane's colour off the ring just hit
  for (const b of m.bursts) {
    const kk = b.age / 0.32, x = X(0, (b.lane + 0.5) / 4), col = HW.lanes[b.lane];
    for (let j = 0; j < 5; j++) {
      const fx = x + (j - 2) * rr * 0.32, fh = rr * (1.6 + (j % 2) * 0.7) * (1 - kk) * (0.6 + 0.4 * Math.sin(t * 40 + j));
      const fg = c.createLinearGradient(0, ys, 0, ys - fh);
      fg.addColorStop(0, rgba([255, 255, 255], 0.9 * (1 - kk))); fg.addColorStop(0.35, rgba(col, 0.8 * (1 - kk))); fg.addColorStop(1, rgba(col, 0));
      c.fillStyle = fg; c.beginPath(); c.moveTo(fx - rr * 0.16, ys); c.quadraticCurveTo(fx, ys - fh * 0.5, fx, ys - fh); c.quadraticCurveTo(fx, ys - fh * 0.5, fx + rr * 0.16, ys); c.fill();
    }
  }
  // the score (top left), the multiplier and the streak (top right)
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = `italic 800 ${Math.round(H * 0.075)}px ${FONT}`; c.fillStyle = rgba([240, 242, 255]);
  c.fillText(String(m.score).padStart(7, '0'), r.x + W * 0.04, r.y + H * 0.08);
  const mult = Math.min(4, 1 + Math.floor(m.combo / 10)), prog = mult === 4 ? 1 : (m.combo % 10) / 10;
  const mx = r.x + W * 0.88, my = r.y + H * 0.1, mr = H * 0.065;
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = mr * 0.22; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.stroke();
  c.strokeStyle = rgba(fever ? HW.fever : [255, 200, 60]); c.beginPath(); c.arc(mx, my, mr, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke();
  c.textAlign = 'center'; c.font = `800 ${Math.round(mr * 0.95)}px ${FONT}`; c.fillStyle = rgba([255, 255, 255]); c.fillText('×' + mult * (fever ? 2 : 1), mx, my + 1);
  if (m.combo >= 2) { c.font = `700 ${Math.round(H * 0.04)}px ${FONT}`; c.fillStyle = rgba([180, 186, 220]); c.textAlign = 'right'; c.fillText(`${m.combo} ${skinSay('STREAK')}`, mx - mr * 1.5, my); }
}
function highwayBottom(c, r, m) {
  const H = r.h, W = r.w;
  const g = c.createLinearGradient(0, r.y, 0, r.y + H);
  g.addColorStop(0, '#11131f'); g.addColorStop(1, '#07080e'); c.fillStyle = g; c.fillRect(r.x, r.y, W, H);
  const tH = H * 0.13;
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = `italic 800 ${Math.round(H * 0.06)}px ${FONT}`; c.fillStyle = rgba([240, 242, 255]);
  c.fillText(fitText((m.title || skinSay('listening…')).toUpperCase(), W * 0.65, (s) => c.measureText(s).width), r.x + W * 0.04, r.y + tH * 0.55);
  c.textAlign = 'right'; c.font = `700 ${Math.round(H * 0.042)}px ${FONT}`; c.fillStyle = rgba([150, 156, 200]);
  c.fillText(`${skinKey(m.keyName)} · ${m.bpm ? Math.round(m.bpm) : '---'}`, r.x + W * 0.96, r.y + tH * 0.55);
  // the pads as gems: the drums in their lanes' colours, the notes dark until the bass plays them
  const gx = W * 0.05, gy = r.y + tH + H * 0.02, gw = W - 2 * gx, gh = r.y + H - H * 0.04 - gy, cw = gw / 4, ch = gh / 4;
  const rad = Math.min(cw * 0.42, ch * 0.62);
  m.pads.forEach((p, i) => {
    const x = r.x + gx + (i % 4) * cw + cw / 2, y = gy + Math.floor(i / 4) * ch + ch / 2;
    const base = p.drum ? HW.lanes[p.lane] : p.bass ? HW.lanes[3] : p.chord ? [170, 130, 255] : [60, 64, 92];
    const lit = p.drum || p.bass ? p.lit : p.chord ? 0.35 : 0;
    const col = mix(mix(base, [10, 11, 18], p.drum || p.bass || p.chord ? 0.55 : 0.4), base, lit);
    const gg = c.createLinearGradient(0, y - rad * 0.5, 0, y + rad * 0.5);
    gg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.35))); gg.addColorStop(1, rgba(mix(col, [0, 0, 0], 0.35)));
    c.fillStyle = gg; c.beginPath(); c.ellipse(x, y, rad, rad * 0.62, 0, 0, 7); c.fill();
    c.strokeStyle = rgba(mix(base, [0, 0, 0], 0.4), p.inKey === false ? 0.5 : 1); c.lineWidth = Math.max(1, rad * 0.08); c.stroke();
    if (lit > 0.4) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(x - rad * 0.28, y - rad * 0.2, rad * 0.32, rad * 0.12, 0, 0, 7); c.fill(); }
    c.textAlign = 'center'; c.font = `800 ${Math.round(rad * (p.drum ? 0.4 : 0.5))}px ${FONT}`;
    c.fillStyle = rgba(lit > 0.5 ? [10, 11, 18] : p.inKey === false ? [110, 114, 140] : [235, 238, 250]);
    c.fillText(skinSay(p.label), x, y + 1);
    if (p.root) { c.fillStyle = rgba([255, 200, 60]); c.beginPath(); c.arc(x + rad * 0.78, y - rad * 0.42, Math.max(1.5, rad * 0.09), 0, 7); c.fill(); }
  });
}

// ---------------------------------------------------------------- vfd: a vacuum fluorescent display
// Phosphor dots glowing behind smoked glass, as on an old stereo: every segment and legend is printed on it, the unlit
// ones faintly there; each lane behind its own colour filter, as a multi-colour VFD's zones (kick pink, clap amber, hats
// cyan, bass green); the score and the tempo in seven-segment digits over their ghost 8s; the judgements printed in a
// row and lit when they're the one; FEVER printed in the bar, lit and flashing in a fever.
const VFD = { bg: [5, 9, 11], cyan: [96, 255, 220], amber: [255, 178, 64], pink: [255, 72, 126], green: [150, 255, 96], ghost: 0.075 };
const VLANE = [VFD.pink, VFD.amber, VFD.cyan, VFD.green];
const vc = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
const SEGS = { a: [1, 0, 3, 1], b: [4, 1, 1, 3], c: [4, 5, 1, 3], d: [1, 8, 3, 1], e: [0, 5, 1, 3], f: [0, 1, 1, 3], g: [1, 4, 3, 1] };
// Seven-segment digits, 5 x 9 dots each (k dots a dot), 7 apart, each over its ghost 8 ('' a blank place, still its 8)
function seg7(c, str, x, y, col, k = 1) {
  for (let i = 0; i < str.length; i++) {
    const on = SEG7[str[i]] ?? '', X = x + i * 7 * k;
    for (const name in SEGS) {
      const [sx, sy, sw, sh] = SEGS[name];
      c.fillStyle = vc(col, on.includes(name) ? 1 : VFD.ghost); c.fillRect(X + sx * k, y + sy * k, sw * k, sh * k);
    }
  }
}
// A legend printed on the glass: faint, or lit (0..1 above the faint)
const legend = (c, txt, x, y, col, lit = 0, k = 1) => ptext(c, txt, x, y, vc(col, VFD.ghost + (1 - VFD.ghost) * lit), k);
const legendC = (c, txt, cx, y, col, lit = 0, k = 1) => legend(c, txt, Math.round(cx - textW(txt, k) / 2), y, col, lit, k);
// An outline, a dot wide, at k
function vbox(c, x, y, w, h, col, k) { c.fillStyle = vc(col, k); c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h); }

// The top screen at its own low resolution (lw x lh, about 150 x 112)
function vfdTop(c, lw, lh, m) {
  const t = m.t, fever = m.fever > 0, flash = fever && Math.floor(t * 8) & 1;
  c.fillStyle = vc(VFD.bg); c.fillRect(0, 0, lw, lh);
  // the bar: the score, FEVER, the tempo
  seg7(c, String(Math.min(9999999, m.score)).padStart(7, '0'), 3, 2, VFD.amber);
  seg7(c, m.bpm ? String(Math.round(m.bpm)).padStart(3, ' ') : '---', lw - 3 - (3 * 7 - 2), 2, VFD.cyan);
  legendC(c, skinSay('FEVER'), lw / 2 + 6, 3, VFD.pink, fever ? (flash ? 1 : 0.55) : 0);
  // the judgements, printed in a row, the latest lit (fading as it ages)
  const J = ['PERFECT', 'GREAT', 'GOOD', 'MISS'], jy = 14;
  const total = J.reduce((a, w) => a + textW(skinSay(w)), 0);
  const gap = Math.max(2, Math.floor((lw - 6 - total) / 3));
  let jx = 3;
  for (const w of J) {
    const on = m.judge && m.judge.text === w && m.judge.age < 0.6 ? 1 - m.judge.age / 0.6 : 0;
    const word = total <= lw - 12 ? skinSay(w) : fitPixel(skinSay(w), (lw - 12) / 4);
    legend(c, word, jx, jy, w === 'MISS' ? VFD.pink : VFD.cyan, on); jx += textW(word) + gap;
  }
  // the lanes: a frame each in its colour, a target at its foot, its name under that; in a fever a lit dot runs round
  const mx = 3, lane = Math.floor((lw - 2 * mx) / 4), x0 = Math.round((lw - 4 * lane) / 2);
  const py0 = 24, labelY = lh - 9, ty = labelY - 6, run = ty - py0, fw = lane - 2, fh = labelY - py0;
  for (let i = 0; i < 4; i++) {
    const x = x0 + i * lane, col = VLANE[i], k = m.hit[i];
    vbox(c, x + 1, py0 - 2, fw, fh, col, fever ? 0.22 : VFD.ghost);
    if (fever) {
      const per = 2 * (fw + fh), q = Math.floor((t * 160 + i * 17) % per);
      const [px, py] = q < fw ? [q, 0] : q < fw + fh ? [fw - 1, q - fw] : q < 2 * fw + fh ? [fw - 1 - (q - fw - fh), fh - 1] : [0, fh - 1 - (q - 2 * fw - fh)];
      c.fillStyle = vc(col); c.fillRect(x + 1 + px, py0 - 2 + py, 1, 1);
    }
    const bx = x + 4, bw = lane - 8;
    c.fillStyle = vc(col, VFD.ghost + (1 - VFD.ghost) * Math.min(1, k * 1.3));
    for (const [rx, ry, rw, rh] of [[bx, ty - 2, 3, 1], [bx, ty - 2, 1, 5], [bx + bw - 3, ty - 2, 3, 1], [bx + bw - 1, ty - 2, 1, 5], [bx, ty + 2, 3, 1], [bx + bw - 3, ty + 2, 3, 1]]) c.fillRect(rx, ry, rw, rh);
    if (k > 0.4) { c.fillStyle = vc(col, k); c.fillRect(bx + 2, ty - 1, bw - 4, 3); }
    legendC(c, fitPixel(skinSay(['KICK', 'CLAP', 'HATS', 'BASS'][i]), lane - 2), x + lane / 2, labelY + 1, col, Math.min(1, k * 1.5));
  }
  // the notes: a bar of lit dots for a drum, a column as long as it's held for the bass
  c.save(); c.beginPath(); c.rect(0, py0, lw, ty + 3 - py0); c.clip();
  for (const n of m.notes) {
    const col = n.miss ? VFD.pink : VLANE[n.lane], kk = (n.miss ? 0.3 : 1) * (n.fade ?? 1);
    const x = x0 + n.lane * lane + 4, w = lane - 8, y = Math.round(ty - (n.held ? 0 : n.d) * run);
    c.fillStyle = vc(col, kk);
    if (n.bass) { const top = Math.round(ty - (n.d + n.len) * run), bw = Math.max(3, Math.round(w * 0.3)); c.fillRect(x + Math.round((w - bw) / 2), top, bw, Math.max(2, y - top)); }   // (a slim column, a meter's)
    else c.fillRect(x, y - 1, w, 3);
  }
  c.restore();
  // the bursts: lit dots thrown off the target
  for (const b of m.bursts) {
    const kk = b.age / 0.32, cx = x0 + b.lane * lane + lane / 2;
    c.fillStyle = vc(VLANE[b.lane], 1 - kk * 0.6);
    for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2 + b.lane, rr = 3 + kk * 10; c.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(ty + Math.sin(a) * rr * 0.6), 1, 1); }
  }
  // the combo, big, over the lanes
  if (m.combo >= 2) {
    const str = String(Math.min(999, m.combo)), k = 2, w = (str.length * 7 - 2) * k;
    seg7(c, str, Math.round(lw / 2 - w / 2), py0 + 4 - (m.comboPulse > 0 ? 1 : 0), VFD.amber, k);
    legendC(c, 'COMBO', lw / 2, py0 + 4 + 9 * k + 3, VFD.amber, 0.7);
  }
}

// The bottom screen: the song along the top, the pads (printed outlines and names, lit as they play), the key and tempo
function vfdBottom(c, lw, lh, m) {
  const t = m.t;
  c.fillStyle = vc(VFD.bg); c.fillRect(0, 0, lw, lh);
  const song = '♪ ' + pixelText((m.title || skinSay('LISTENING')).toUpperCase()), sw = textW(song), room = lw - 8;
  c.save(); c.beginPath(); c.rect(4, 0, room, 11); c.clip();
  if (sw <= room) ptext(c, song, 4, 2, vc(VFD.cyan));
  else { const off = Math.floor((t * 22) % (sw + 24)); ptext(c, song, 4 - off, 2, vc(VFD.cyan)); ptext(c, song, 4 - off + sw + 24, 2, vc(VFD.cyan)); }
  c.restore();
  const gx = 4, gy = 14, gap = 2, fy = lh - 11;
  const pw = Math.floor((lw - 2 * gx - 3 * gap) / 4), ph = Math.floor((fy - 3 - gy - 3 * gap) / 4);
  const x0 = Math.round((lw - (4 * pw + 3 * gap)) / 2);
  m.pads.forEach((p, i) => {
    const x = x0 + (i % 4) * (pw + gap), y = gy + Math.floor(i / 4) * (ph + gap);
    const col = p.drum ? VLANE[p.lane] : p.bass ? VFD.green : VFD.cyan;
    const lit = p.drum || p.bass ? p.lit : p.chord ? 0.45 : 0;
    vbox(c, x, y, pw, ph, col, p.drum ? 0.16 : p.inKey ? 0.14 : VFD.ghost);
    if (lit > 0.3) { c.fillStyle = vc(col, lit); c.fillRect(x + 2, y + 2, pw - 4, ph - 4); ptextC(c, fitPixel(skinSay(p.label), pw - 4), x + pw / 2, y + Math.round((ph - 7) / 2), vc(VFD.bg)); }
    else ptextC(c, fitPixel(skinSay(p.label), pw - 4), x + pw / 2, y + Math.round((ph - 7) / 2), vc(col, p.drum || p.inKey ? 0.45 : 0.16));
    if (p.root) { c.fillStyle = vc(VFD.amber, 0.9); c.fillRect(x + pw - 4, y + 2, 2, 2); }
  });
  legend(c, skinKey(m.keyName), 4, fy + 2, VFD.cyan, 0.55);
  seg7(c, m.bpm ? String(Math.round(m.bpm)).padStart(3, ' ') : '---', lw - 4 - (3 * 7 - 2), fy + 1, VFD.cyan);
}
export { lcdTop, lcdBottom, vfdTop, vfdBottom }; // pure low-resolution painters for canvas fit checks

// ---------------------------------------------------------------- the painters
export function createSkins() {
  const lows = {}; // each LCD screen: its canvas, and the frame before (for its lag)
  // The LCD drawn at its own low resolution, 150 to 300 pixels across, each pixel a whole number of the canvas's
  // (one, on a small window), then laid on the screen square and sharp: its pixels lag (each frame a mix with the
  // last), they cast a faint shadow on the layer behind, and the gaps between them show.
  function low(ctx, r, which, paint) {
    const s = Math.max(1, Math.floor(r.w / 150)), lw = Math.floor(r.w / s), lh = Math.floor(r.h / s);
    let L = lows[which];
    if (!L || L.lw !== lw || L.lh !== lh) {
      const mk = () => { const c = document.createElement('canvas'); c.width = lw; c.height = lh; return c; };
      L = lows[which] = { lw, lh, c: mk(), prev: mk(), fresh: true, grid: null, s: 0 };
    }
    const c = L.c.getContext('2d');
    paint(c, lw, lh);
    if (!L.fresh) { c.globalAlpha = 0.42; c.drawImage(L.prev, 0, 0); c.globalAlpha = 1; }
    L.fresh = false;
    L.prev.getContext('2d').drawImage(L.c, 0, 0);
    const w = lw * s, h = lh * s, x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.c, x, y, w, h);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22;
    ctx.drawImage(L.c, x + Math.max(1, Math.round(s * 0.6)), y + Math.max(1, Math.round(s * 0.6)), w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (L.s !== s) { // (the gaps between the dots: a pattern a dot across)
      const g = document.createElement('canvas'); g.width = g.height = s;
      const gc = g.getContext('2d'); gc.fillStyle = 'rgba(30,48,58,0.13)'; gc.fillRect(s - 1, 0, 1, s); gc.fillRect(0, s - 1, s, 1);
      L.grid = ctx.createPattern(g, 'repeat'); L.s = s;
    }
    ctx.translate(x, y); ctx.fillStyle = L.grid; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // The VFD drawn as the LCD is, at its own low resolution, but each of its pixels a round dot with dark between (a
  // pattern a dot across, multiplied over it), and no shadow behind: it glows, it doesn't reflect.
  function dots(ctx, r, which, paint) {
    const s = Math.max(1, Math.floor(r.w / 150)), lw = Math.floor(r.w / s), lh = Math.floor(r.h / s);
    let L = lows[which];
    if (!L || L.lw !== lw || L.lh !== lh) { const c = document.createElement('canvas'); c.width = lw; c.height = lh; L = lows[which] = { lw, lh, c, s: 0 }; }
    paint(L.c.getContext('2d'), lw, lh);
    const w = lw * s, h = lh * s, x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
    ctx.save();
    ctx.fillStyle = vc(VFD.bg); ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.c, x, y, w, h);
    if (L.s !== s) {
      const g = document.createElement('canvas'); g.width = g.height = s; const gc = g.getContext('2d');
      gc.fillStyle = '#000'; gc.fillRect(0, 0, s, s); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(s / 2, s / 2, s * 0.43, 0, 7); gc.fill();
      L.pat = ctx.createPattern(g, 'repeat'); L.s = s;
    }
    ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); ctx.fillStyle = L.pat; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return {
    // (screen: how each is as a real screen, gamescreen.js; the LCD is lit by the room and has its own dots and lag)
    lcd: {
      top: (ctx, r, m) => low(ctx, r, 'ltop', (c, lw, lh) => lcdTop(c, lw, lh, m)),
      bottom: (ctx, r, m) => low(ctx, r, 'lbottom', (c, lw, lh) => lcdBottom(c, lw, lh, m)),
      screen: { dots: 0, shade: 1.5 },
    },
    os: { top: (ctx, r, m) => osTop(ctx, r, m, m.col), bottom: (ctx, r, m) => osBottom(ctx, r, m, m.col), screen: { black: [14, 16, 26], glow: 0.25 } },
    // (the VFD at its own low resolution as round dots, dark between; it glows, so its glow is the screen pass's)
    vfd: { top: (ctx, r, m) => dots(ctx, r, 'vtop', (c, lw, lh) => vfdTop(c, lw, lh, m)), bottom: (ctx, r, m) => dots(ctx, r, 'vbottom', (c, lw, lh) => vfdBottom(c, lw, lh, m)),
      screen: { dots: 0, glow: 0.6, lag: 0.08, shade: 1.1 } },
    dance: { top: (ctx, r, m) => danceTop(ctx, r, m), bottom: (ctx, r, m) => danceBottom(ctx, r, m), screen: { black: [12, 14, 24], glow: 0.45, lag: 0.15 } },
    highway: { top: (ctx, r, m) => highwayTop(ctx, r, m), bottom: (ctx, r, m) => highwayBottom(ctx, r, m), screen: { black: [12, 14, 24], glow: 0.45, lag: 0.12 } },
  };
}
