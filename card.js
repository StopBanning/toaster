// The now-playing ID card (N, and the top of the vertical layout): a retro cyberpunk ID card, after
// s1lax.art's After Effects look. The photo is the webcam in chunky 1-bit dither at a choppy 10
// frames a second (with the camera off, the song's cover from Windows in finer dots, or else the
// sound itself as a pulsing disc); the fields fill in
// from what's playing; the "auth string" is the spectrum in hex, rewritten on every beat; the
// footer says whether the beat has been found.
import { NOTES } from './engine.js';
import { bands } from './visuals.js';

const W = 40, H = 50, FPS = 10; // the photo, in dots (each drawn 3x3)
// A song's cover gets twice the dots each way (each drawn 1.5 x 1.5): a picture made to be looked
// at needs detail the camera's chunky look does without. (Its lettering was blobs at 40 x 50.)
const AW = 80, AH = 100;

const clean = (s) => String(s || '').replace(/\p{Extended_Pictographic}|️|‍/gu, ' ').replace(/\s+/g, ' ').trim();
// a short tag from a name: "Brutalismus 3000" -> "BRU"
const tag = (s) => (clean(s).normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || 'UNK').padEnd(3, 'X');
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
// The ID code scrambles like s1lax.art's card until the beat is found, then decodes left to
// right; a few of its characters glitch on each new bar. Till then the signal line cycles through
// its errors.
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const scramble = (s, keep) => [...s].map((c, i) => (c === '-' || c === '.' || keep(i) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
const LOST = ['UNIDENTIFIED SIGNAL', 'SIGNAL_LOST', 'TRACE_X', 'ENTITY_404', 'NULL_存在', 'SYS_FAIL', 'DATA 破損'];

export function createCard(el) {
  el.innerHTML = `
    <div class="c-row"><span>TOASTER SYSTEMS</span><span><b class="c-pow">NO SIGNAL</b><i class="c-bat"><i></i></i></span></div>
    <div class="c-rule"></div>
    <div class="c-row c-dim"><span class="c-sig">UNIDENTIFIED SIGNAL</span><span class="c-bar">BAR ---.-</span></div>
    <div class="c-id"></div>
    <div class="c-mid">
      <canvas class="c-photo" width="${W}" height="${H}"></canvas>
      <div class="c-fields">
        <div class="c-info">
          <div><span class="c-dim">SRC / </span><span class="c-src"></span></div>
          <div><span class="c-dim">TEMPO / </span><span class="c-bpm"></span></div>
          <div><span class="c-dim">KEY / </span><span class="c-key"></span></div>
        </div>
        <div class="c-title"></div>
        <div class="c-jp">トースター</div>
      </div>
    </div>
    <div class="c-rule c-auth"></div>
    <div class="c-dim c-auth">DIGITAL KEY / AUTH STRING</div>
    <pre class="c-hex"></pre>
    <div class="c-rule"></div>
    <div class="c-foot"></div>`;
  const q = (sel) => el.querySelector(sel);
  const photo = q('.c-photo'), pctx = photo.getContext('2d');
  // the dots for the camera and the sound (coarse) and for a cover (fine): light levels, the
  // dither's carried error, and the picture they make
  // (hole: with the camera's cut-out, the dots where you aren't, left empty whatever the theme)
  const dotsOf = (w, h) => ({ w, h, lum: new Float32Array(w * h), err: new Float32Array(w * h), img: pctx.createImageData(w, h), sorted: new Float32Array(w * h), hole: new Uint8Array(w * h), holes: false });
  const coarse = dotsOf(W, H), fine = dotsOf(AW, AH);
  const lum = coarse.lum, sorted = coarse.sorted, spec = new Float32Array(64);
  const shown = new Map(); // element -> text on screen; the page is only touched on a change
  const set = (sel, text) => { const e = q(sel); if (shown.get(e) !== text) { shown.set(e, text); e.textContent = text; } };
  let lastPhoto = 0, lastHex = 0, lastBeat = null, pulse = 0, glitch = 0, visible = false;
  let rows = null, lastEq = 0, idAt = 0, lockedAt = null, lastBar = null, burstUntil = 0;

  // The camera frame, cropped to the photo's shape (head and shoulders, when a face was found) and
  // averaged down to one value a dot.
  function fromCamera(f, face) {
    let cw = f.w, ch = Math.round((f.w * H) / W);
    if (ch > f.h) { ch = f.h; cw = Math.round((f.h * W) / H); }
    let x0 = (f.w - cw) >> 1, y0 = (f.h - ch) >> 1;
    if (face) {
      ch = Math.min(f.h, Math.round(face.h * f.h * 2.3));
      cw = Math.min(f.w, Math.round((ch * W) / H));
      x0 = Math.round(Math.min(f.w - cw, Math.max(0, (face.x + face.w / 2) * f.w - cw / 2)));
      y0 = Math.round(Math.min(f.h - ch, Math.max(0, (face.y + face.h * 0.62) * f.h - ch / 2)));
    }
    for (let y = 0; y < H; y++) {
      const ya = y0 + Math.floor((y * ch) / H), yb = Math.max(ya + 1, y0 + Math.floor(((y + 1) * ch) / H));
      for (let x = 0; x < W; x++) {
        const xa = x0 + Math.floor((x * cw) / W), xb = Math.max(xa + 1, x0 + Math.floor(((x + 1) * cw) / W));
        let s = 0, you = 0;
        for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) { s += f.lum[yy * f.w + xx]; if (f.see) you += f.see[yy * f.w + xx]; }
        const n = (yb - ya) * (xb - xa);
        lum[y * W + x] = s / (n * 255);
        coarse.hole[y * W + x] = f.see && you < n * 128 ? 1 : 0;
      }
    }
    coarse.holes = !!f.see;
    // stretch the levels so the darkest tenth goes black and the brightest goes white
    sorted.set(lum);
    sorted.sort();
    const lo = sorted[Math.floor(W * H * 0.08)], hi = sorted[Math.floor(W * H * 0.97)], span = Math.max(0.05, hi - lo);
    for (let i = 0; i < lum.length; i++) lum[i] = (lum[i] - lo) / span;
  }

  // No camera, but a cover for the song (from Windows): the cover, cropped to the photo's shape, in
  // the finer dots, sharpened a little (each dot pushed away from the average of the dots round
  // it, so edges and lettering survive the dither) and levelled, the darkest 2% black and the
  // brightest 2% white. It doesn't move, so that's worked out once a cover (see showArt).
  const artLum = new Float32Array(AW * AH), artDots = document.createElement('canvas');
  artDots.width = AW;
  artDots.height = AH;
  const actx = artDots.getContext('2d', { willReadFrequently: true });
  actx.imageSmoothingQuality = 'high';
  let artFor = null;
  function fromArt(im) {
    if (artFor !== im) {
      artFor = im;
      const k = Math.max(AW / im.naturalWidth, AH / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
      actx.clearRect(0, 0, AW, AH);
      actx.drawImage(im, (AW - w) / 2, (AH - h) / 2, w, h);
      const d = actx.getImageData(0, 0, AW, AH).data, L = fine.err; // (free until the dither)
      for (let i = 0; i < AW * AH; i++) L[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      for (let y = 0; y < AH; y++) {
        for (let x = 0; x < AW; x++) {
          let sum = 0, n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const X = x + dx, Y = y + dy;
              if (X >= 0 && X < AW && Y >= 0 && Y < AH) { sum += L[Y * AW + X]; n++; }
            }
          }
          const i = y * AW + x;
          artLum[i] = L[i] + 0.8 * (L[i] - sum / n);
        }
      }
      const so = fine.sorted;
      so.set(artLum);
      so.sort();
      const lo = so[Math.floor(AW * AH * 0.02)], hi = so[Math.floor(AW * AH * 0.98)], span = Math.max(0.05, hi - lo);
      for (let i = 0; i < artLum.length; i++) artLum[i] = Math.min(1.2, Math.max(-0.2, (artLum[i] - lo) / span));
    }
  }

  // The cover's dots, worked out once a cover (and theme), and the same dots drawn every frame,
  // glowing brighter on the kick. (Dithered afresh each frame, with the kick nudging its levels,
  // a fifth of the dots switched on or off ten times a second: it flickered.)
  const artPicture = document.createElement('canvas');
  artPicture.width = AW;
  artPicture.height = AH;
  const apctx = artPicture.getContext('2d');
  let artKey = '';
  function showArt(im, col) {
    const key = `${col.fg}/${col.bg}`;
    if (artFor !== im || artKey !== key) {
      fromArt(im);
      fine.lum.set(artLum);
      dither(col, fine);
      apctx.clearRect(0, 0, AW, AH);
      apctx.putImageData(fine.img, 0, 0);
      artKey = key;
    }
    show(fine, artPicture, 0.72 + 0.28 * Math.min(1, pulse));
  }

  // No camera: the sound as an eye. A ring whose edge the spectrum pushes out (mirrored left to
  // right), a dim iris, and a core that swells on each kick.
  function fromSound(eng) {
    coarse.holes = false;
    bands(eng, spec);
    const cx = W / 2, cy = H * 0.47, r0 = W * 0.24, core = W * (0.07 + 0.06 * pulse);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
        const band = Math.min(spec.length - 1, Math.floor((Math.abs(Math.atan2(dx, -dy)) / Math.PI) * spec.length));
        const edge = r0 + spec[band] * W * 0.2;
        const rim = Math.max(0, 1 - Math.abs(r - edge) / 2.2); // the bright ring
        const iris = r < edge ? 0.12 + 0.3 * (r / edge) ** 2 : Math.max(0, 0.18 - (r - edge) * 0.05);
        lum[y * W + x] = Math.max(rim, iris, r < core ? 1 : 0);
      }
    }
  }

  // Atkinson dither to one bit, in the theme's text colour, into dots.img. On a light theme that
  // colour is dark, so it inks the shadows instead of the highlights (or the picture would be a
  // negative). dots: the coarse ones or the fine ones.
  function dither(col, dots) {
    const { w, h, lum: L, err, img } = dots, hole = dots.holes ? dots.hole : null;
    const light = col.fg[0] + col.fg[1] + col.fg[2] < col.bg[0] + col.bg[1] + col.bg[2];
    for (let i = 0; i < L.length; i++) err[i] = light ? 1 - L[i] : L[i];
    const d = img.data, [r, g, b] = col.fg;
    const add = (x, y, e) => { if (x >= 0 && x < w && y < h) err[y * w + x] += e; };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, gone = hole && hole[i], on = !gone && err[i] > 0.5 ? 1 : 0, e = gone ? 0 : (err[i] - on) / 8;
        add(x + 1, y, e); add(x + 2, y, e); add(x - 1, y + 1, e); add(x, y + 1, e); add(x + 1, y + 1, e); add(x, y + 2, e);
        const p = i * 4;
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = on ? 255 : 0;
      }
    }
  }

  // The photo shows the dots (it takes their size; it's shown the same size either way): their
  // picture, or a ready one (picture) at some strength. On a kick a few rows slip sideways.
  function show(dots, picture, strength = 1) {
    const { w, h, img } = dots, k = w / W; // (k: how much finer than the camera's)
    if (photo.width !== w || photo.height !== h) { photo.width = w; photo.height = h; }
    pctx.clearRect(0, 0, w, h);
    if (picture) {
      pctx.globalAlpha = strength;
      pctx.drawImage(picture, 0, 0);
      pctx.globalAlpha = 1;
    } else pctx.putImageData(img, 0, 0);
    if (glitch > 0.3) {
      for (let n = 0; n < 3; n++) {
        const y = Math.floor(Math.random() * h), rows = Math.round((1 + Math.floor(Math.random() * 4)) * k);
        pctx.drawImage(photo, 0, y, w, rows, Math.round((Math.random() - 0.5) * 6 * glitch * k), y, w, rows);
      }
    }
  }

  // 64 bytes of spectrum as 4 rows of hex (8 groups each), salted per song so two songs don't read
  // alike.
  function hex(eng, salt) {
    bands(eng, spec);
    const out = [];
    for (let r = 0; r < 4; r++) {
      const groups = [];
      for (let gI = 0; gI < 8; gI++) {
        const i = r * 16 + gI * 2;
        const b0 = (Math.round(spec[i] * 255) ^ (salt >>> (i % 24))) & 255, b1 = (Math.round(spec[i + 1] * 255) ^ (salt >>> ((i + 7) % 24))) & 255;
        groups.push(((b0 << 8) | b1).toString(16).toUpperCase().padStart(4, '0'));
      }
      out.push(groups);
    }
    return out;
  }
  // The rows as a text equalizer: each as long as its quarter of the spectrum is loud, from the
  // lows at the top.
  function eq(eng) {
    bands(eng, spec);
    return rows.map((row, r) => {
      let s = 0;
      for (let i = r * 16; i < r * 16 + 16; i++) s += spec[i];
      return row.slice(0, Math.max(1, Math.min(8, 1 + Math.round((s / 16) * 10)))).join(' ');
    }).join('\n');
  }

  return {
    get shown() { return visible; },
    show(on) { visible = on; el.hidden = !on; },
    kick(s) { pulse = Math.max(pulse, 0.5 + 0.5 * s); glitch = Math.max(glitch, 0.4 + 0.6 * s); },
    // info: { song, source, frame (the camera's, or null), face (where it is in the frame, or null),
    // art (the song's cover, a loaded image, or null) }
    draw(t, eng, info, col) {
      if (!visible) return;
      const T = eng.tempo, locked = T.locked && eng.bar !== null, song = info.song;
      const lv = Math.min(1, Math.max(0, (20 * Math.log10(eng.level || 1e-6) + 50) / 50));
      set('.c-pow', eng.silent ? 'NO SIGNAL' : lv < 0.35 ? 'LOW POWER' : 'POWER');
      const bat = `${Math.round(lv * 10) * 10}%`, cell = q('.c-bat i');
      if (cell.style.width !== bat) cell.style.width = bat;
      set('.c-sig', locked ? 'REGISTERED SIGNAL' : LOST[Math.floor(t / 0.7) % LOST.length]);
      set('.c-bar', locked ? `BAR ${String(eng.bar + 1).padStart(3, '0')}.${Math.floor(eng.step / 4) + 1}` : 'BAR ---.-');
      const key = eng.key ? NOTES[eng.key.root] + (eng.key.mode === 'minor' ? 'm' : '') : '?';
      const id = `${tag(song?.artist || song?.app || info.source)}-${locked ? T.shown : '???'}.${key}`;
      if (!locked) lockedAt = null;
      else {
        lockedAt ??= t;
        if (eng.bar !== lastBar) { if (lastBar !== null) burstUntil = t + 0.12; lastBar = eng.bar; }
      }
      if (t - idAt > 1 / 15) {
        idAt = t;
        const settled = locked ? ((t - lockedAt) / 0.6) * id.length : -1;
        set('.c-id', scramble(id, (i) => i < settled && (t > burstUntil || Math.random() > 0.35)));
      }
      set('.c-src', clean(song?.app || info.source || 'NONE').toUpperCase().slice(0, 18));
      set('.c-bpm', locked ? `${T.shown} BPM` : '--- BPM');
      set('.c-key', eng.key ? `${NOTES[eng.key.root]} ${eng.key.mode}`.toUpperCase() : 'UNKNOWN');
      set('.c-title', clean(song?.title || 'UNTITLED SIGNAL').toUpperCase().slice(0, 64));
      set('.c-foot', eng.silent ? '// NO SIGNAL //' : locked ? '// TRACK IDENTIFIED //' : '// IDENTITY NOT FOUND //');
      // the auth string: rewritten on every beat once locked, a few times a second before; its
      // rows' lengths follow the sound ten times a second
      if ((locked && eng.beat !== lastBeat) || (!locked && t - lastHex > 0.4) || lastHex === 0) {
        lastBeat = eng.beat;
        lastHex = t;
        rows = hex(eng, hash(song?.title || info.source || ''));
      }
      if (t - lastEq > 0.1) { lastEq = t; set('.c-hex', eq(eng)); }
      // the photo, at a choppy 10 frames a second (snapping to a kick right away)
      if (t - lastPhoto >= 1 / FPS || glitch > 0.9) {
        lastPhoto = t;
        if (info.frame) { fromCamera(info.frame, info.face); dither(col, coarse); show(coarse); }
        else if (info.art) showArt(info.art, col);
        else { fromSound(eng); dither(col, coarse); show(coarse); }
        pulse *= 0.6;
        glitch *= 0.5;
      }
    },
  };
}
