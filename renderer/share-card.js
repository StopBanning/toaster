// The share card: one picture of the song as Toaster heard it, to post. The ID card (its ID, the song's title, tempo and
// key, and its picture: the cover in characters, or the camera), the code's first lines on the code view's backing, and
// the link, in the theme's colours, 1080 x 1350 (a 4:5 post). It's drawn from the page's own parts (the card's fields
// and picture, the code's lines, the theme's variables), so the app and the site make the same one.
const W = 1080, H = 1350, PAD = 64, MONO = '"JetBrains Mono", ui-monospace, monospace';

// the text cut to a width, with an ellipsis where it's cut
function fit(x, text, width) {
  if (x.measureText(text).width <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (x.measureText(text.slice(0, mid) + '…').width <= width) lo = mid; else hi = mid - 1; }
  return text.slice(0, lo) + '…';
}
// words onto lines no wider than width, at most max lines (the last one cut)
function wrap(x, text, width, max) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + word : word;
    if (x.measureText(next).width <= width || !line) line = next;
    else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  if (out.length > max) { out.length = max; out[max - 1] = fit(x, out[max - 1] + '…', width); }
  return out;
}

export function drawShareCard(doc, canvas = doc.createElement('canvas')) {
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext('2d'), cs = doc.defaultView.getComputedStyle(doc.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  const bg = v('--bg'), fg = v('--fg'), dim = v('--dim'), faint = v('--faint'), lineBg = v('--line-bg');
  const accent = v('--accent') || fg, accentText = v('--accent-text') || fg;
  const card = doc.getElementById('card'), field = (sel) => card?.querySelector(sel)?.textContent.trim() || '';
  const font = (px, bold = false) => `${bold ? 700 : 400} ${px}px ${MONO}`;
  const rule = (y) => { x.fillStyle = faint; x.fillRect(PAD, y, W - 2 * PAD, 2); };
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.textBaseline = 'alphabetic';

  // the card's head: who, and the signal's ID, big
  x.font = font(26); x.fillStyle = dim;
  x.textAlign = 'left'; x.fillText('TOASTER SYSTEMS', PAD, 92);
  x.textAlign = 'right'; x.fillText(field('.c-bar') || 'BAR ---.-', W - PAD, 92);
  rule(116);
  x.textAlign = 'left'; x.font = font(26); x.fillStyle = dim; x.fillText(field('.c-sig') || 'REGISTERED SIGNAL', PAD, 164);
  x.font = font(118, true); x.fillStyle = accent; x.fillText(fit(x, field('.c-id') || 'TOASTER', W - 2 * PAD), PAD - 4, 282);

  // the picture (the card's own, its pixels kept), and the song beside it
  const photo = card?.querySelector('.c-photo'), top = 330, pw = 360, ph = 450;
  if (photo && photo.width) {
    x.imageSmoothingEnabled = false;
    x.drawImage(photo, PAD, top, pw, ph);
    x.strokeStyle = faint; x.lineWidth = 2; x.strokeRect(PAD, top, pw, ph);
  }
  const cx = PAD + pw + 44, cw = W - PAD - cx;
  let y = top + 34;
  for (const [label, sel] of [['SRC / ', '.c-src'], ['TEMPO / ', '.c-bpm'], ['KEY / ', '.c-key']]) {
    x.font = font(28); x.fillStyle = dim; x.fillText(label, cx, y);
    const lw = x.measureText(label).width;
    x.fillStyle = fg; x.fillText(fit(x, field(sel) || '-', cw - lw), cx + lw, y);
    y += 46;
  }
  y += 40;
  x.font = font(54, true); x.fillStyle = accentText;
  for (const line of wrap(x, field('.c-title') || 'whatever is playing', cw, 4)) { x.fillText(line, cx, y); y += 64; }
  x.font = font(30); x.fillStyle = dim; x.fillText('トースター', cx, Math.max(y + 10, top + ph - 8));

  // the code's first lines, each on the code view's backing, the commented ones dim
  rule(top + ph + 46);
  let ly = top + ph + 108;
  const room = Math.floor((H - 150 - ly) / 50) + 1;   // (as many as fit above the link)
  const lines = [...doc.querySelectorAll('#code .ln')].filter((el) => !el.classList.contains('gap') && el.textContent.trim()).slice(0, room);
  x.font = font(30);
  for (const el of lines) {
    const text = fit(x, el.textContent.replace(/\s+$/, ''), W - 2 * PAD - 20), tw = x.measureText(text).width;
    x.fillStyle = lineBg; x.fillRect(PAD - 8, ly - 32, tw + 16, 44);
    x.fillStyle = el.classList.contains('cm') ? dim : fg; x.fillText(text, PAD, ly);
    ly += 50;
  }

  // the link
  rule(H - 112);
  x.font = font(40, true); x.fillStyle = accent; x.textAlign = 'left'; x.fillText('toaster.locust.lol', PAD, H - 56);
  x.font = font(26); x.fillStyle = dim; x.textAlign = 'right'; x.fillText('free, in your browser', W - PAD, H - 58);
  return canvas;
}

// The card's file name: toaster- and the signal's ID, safe for any file system
export const shareCardName = (doc) => 'toaster-' + ((doc.getElementById('card')?.querySelector('.c-id')?.textContent || 'card').trim().replace(/[^\w.-]+/g, '-') || 'card') + '.png';
