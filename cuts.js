// Cuts: a scene for each part, cut to on its hits, after Atsushi Tadokoro's TidalCycles and
// TouchDesigner sets (Eulerroom's Solstice Stream, December 2023). The kick, the clap, the open
// hat and the bass each own a scene, and each of their hits cuts straight to it: bright on the
// hit, dimming through the beat, held till the next cut. Every 8 bars the parts swap scenes.
// Under it all, thin lines run across the middle, moving with the sound; with nothing playing (or
// before the beat is found) that's all there is, so a song starts bare and builds as its parts
// come in.
// Every scene is Toaster's own view of the song, in its own look (the code's font, the ID card's
// 1-bit dots, the theme's two colours): the part's word in the code (bd, cp, the bass note) as
// big as it goes; its line of code magnified, crawling past; its 16 steps as a punchcard with the
// step playing now lit; the spectrum falling as a dithered spectrogram; the waveform itself; you
// (with the camera on) or the song's cover in big 1-bit dots; the tempo and the key, printed huge.
// Once the beat is found, the cuts come from the learned patterns, a little ahead, so they land
// as you hear the hit (like the blocks); before that, from the hits as they're heard. When a clap
// and a kick land together, the clap's scene wins; the open hat, the bass and the closed hats
// give way to a kick or clap that's about to land (they'd take every cut between them) and lift
// the picture instead. However busy the music, it cuts at most three times a second (the flash
// limit for seizures).
import { bands, RAMP } from './visuals.js';
import { NOTES } from './engine.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`;
const FONT = '"JetBrains Mono", Consolas, monospace';
// the ordered-dither thresholds the ID card's dots use (a 4 x 4 Bayer matrix)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((x) => (x + 0.5) / 16);

function fit(canvas) {
  const w = Math.round(innerWidth), h = Math.round(innerHeight);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return [w, h];
}

// A repeatable run of random numbers from a seed (mulberry32): a cut's layout stays put through
// its frames.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// each part's word in the code, and its line
const WORD = { bd: 'bd', sd: 'cp', hho: 'oh', hhc: 'hh' };
const LINE = { bd: 'bd', sd: 'sd', hho: 'hho', hhc: 'hhc', bass: 'bassline' };

// the bass note playing in this bar, as the code writes it (f#1), or null
function bassNote(eng) {
  const slot = eng.bar !== null ? ((eng.bar % 4) + 4) % 4 : 0;
  return eng.slots?.[slot]?.bass || null;
}

// big squares where v (0-1, from at(col, row)) beats the Bayer threshold: the 1-bit dots
function dots(g, x0, y0, cols, rows, cell, at) {
  g.beginPath();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (at(i, j) > BAYER[(j & 3) * 4 + (i & 3)]) g.rect(x0 + i * cell, y0 + j * cell, cell - 1, cell - 1);
    }
  }
  g.fill();
}

// The scenes. Each draws on the canvas (W x H, middle cx, cy, smaller side m) in the theme's
// colours; k: how bright (1 on the hit), age: seconds since the cut, r: its random numbers, d:
// what it shows (the engine, the part that cut, the code's lines, the song, the camera).
const SCENES = {
  // the part's word in the code, as big as it goes, and its line small under it
  word(g, { W, H, cx, cy, fg }, k, age, r, d) {
    const word = d.part === 'bass' ? bassNote(d.eng) || 'bass' : WORD[d.part] || d.part;
    const size = Math.min(H * 0.72, (W * 1.15) / Math.max(1, word.length * 0.6));
    const kick = Math.exp(-age * 14) * size * 0.04;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${Math.round(size)}px ${FONT}`;
    g.fillStyle = rgba(fg, k);
    g.fillText(word, cx + (r() - 0.5) * kick, cy + size * 0.04 + (r() - 0.5) * kick);
    const line = (d.lines[LINE[d.part]] || '').replace(/^(\/\/ |_)/, '').slice(0, 72);
    if (line) {
      // as big as fits across (the vertical layout is narrow)
      g.font = `500 ${Math.round(Math.min(Math.max(13, H * 0.024), (W * 0.92) / (line.length * 0.6)))}px ${FONT}`;
      g.fillStyle = rgba(fg, 0.75 * k);
      g.fillText(line, cx, H * 0.9);
    }
  },
  // the part's line of code, magnified and crawling past, its word picked out in blocks
  line(g, { W, H, cy, fg, ink }, k, age, r, d) {
    const text = (d.lines[LINE[d.part]] || '').replace(/^(\/\/ |_)/, '');
    if (!text) return SCENES.word(...arguments);
    const size = Math.round(H * 0.17), cw = size * 0.6;
    g.font = `700 ${size}px ${FONT}`;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    const width = text.length * cw, x0 = W * 0.08 - ((age * W * 0.22 + r() * width * 0.5) % Math.max(1, width - W * 0.6));
    const word = d.part === 'bass' ? null : WORD[d.part];
    // the part's word wherever it is in the line, as a block with the letters cut out of it
    const mark = new Uint8Array(text.length);
    if (word) {
      for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) {
        mark.fill(1, i, i + word.length);
        g.fillStyle = rgba(fg, k);
        g.fillRect(x0 + i * cw - cw * 0.08, cy - size * 0.62, word.length * cw + cw * 0.16, size * 1.24);
      }
    }
    for (let i = 0; i < text.length; i++) {
      const x = x0 + i * cw;
      if (x < -cw || x > W) continue;
      g.fillStyle = mark[i] ? rgba(ink, 1) : rgba(fg, k);
      g.fillText(text[i], x, cy);
    }
    g.font = `500 ${Math.round(H * 0.022)}px ${FONT}`;
    g.fillStyle = rgba(fg, 0.6 * k);
    g.fillText(`${d.part === 'bass' ? 'bassline' : LINE[d.part] === 'sd' ? 'clap' : LINE[d.part] === 'bd' ? 'kick' : LINE[d.part]}  ·  bar ${(d.eng.bar ?? 0) + 1}`, W * 0.08, H * 0.12);
  },
  // the part's 16 steps as a punchcard, the step playing now lit, the other drums thin above it
  grid(g, { W, H, fg, ink }, k, age, r, d) {
    const step = d.step === null ? -1 : ((Math.floor(d.step) % 16) + 16) % 16;
    const x0 = W * 0.06, cell = (W * 0.88) / 16, gap = Math.max(2, cell * 0.08);
    const rows = ['bd', 'sd', 'hhc', 'hho', 'bass'];
    const main = d.part, others = rows.filter((id) => id !== main);
    const big = H * 0.34, thin = H * 0.045, top = H * 0.5 - big / 2;
    const row = (id, y, h, a) => {
      const on = d.eng.v[id]?.shown;
      for (let s = 0; s < 16; s++) {
        const x = x0 + s * cell;
        if (on?.[s]) { g.fillStyle = rgba(fg, a * (s === step ? 1 : 0.62)); g.fillRect(x, y, cell - gap, h); }
        else if (s === step) { g.strokeStyle = rgba(fg, a * 0.8); g.lineWidth = 2; g.strokeRect(x + 1, y + 1, cell - gap - 2, h - 2); }
        else { g.fillStyle = rgba(ink, a * 0.35); g.fillRect(x, y + h / 2 - 1, cell - gap, 2); }
      }
    };
    row(main, top, big, k);
    others.forEach((id, i) => row(id, (i < 2 ? top - (2 - i) * (thin + gap * 2) : top + big + gap * 2 + (i - 2) * (thin + gap * 2)), thin, 0.45 * k));
    g.font = `600 ${Math.round(H * 0.03)}px ${FONT}`;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = rgba(fg, 0.7 * k);
    g.fillText(`${String(step + 1).padStart(2, '0')}/16`, x0, H * 0.94);
  },
  // the spectrum falling, newest at the top, in the ID card's 1-bit dots
  fall(g, { W, H, fg }, k, age, r, d) {
    // dots big enough that the rows kept fill the height too (a tall window: the vertical layout)
    const hist = d.hist, cell = Math.max(Math.ceil(W / hist.cols), Math.ceil(H / hist.n));
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    g.fillStyle = rgba(fg, 0.75 * k);
    dots(g, 0, 0, cols, rows, cell, (i, j) => {
      const row = j < hist.n && hist.rows[(hist.at - 1 - j + hist.n) % hist.n];
      return row ? row[Math.min(hist.cols - 1, Math.floor((i * hist.cols) / cols))] * (0.4 + 0.8 * k) : 0;
    });
  },
  // the waveform itself, thick, the last few frames fading behind it
  wave(g, { W, H, cy, fg }, k, age, r, d) {
    const traces = d.traces;
    traces.forEach((tr, n) => {
      const a = k * (n === traces.length - 1 ? 1 : 0.18 + 0.12 * n);
      g.strokeStyle = rgba(fg, a);
      g.lineWidth = n === traces.length - 1 ? Math.max(3, H * 0.008) : 2;
      g.beginPath();
      for (let i = 0; i < tr.length; i++) {
        const x = (i / (tr.length - 1)) * W, y = cy - tr[i] * H * 0.42;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    });
  },
  // you (with the camera on) or the song's cover, in big 1-bit dots; else the part's word
  face(g, { W, H, m, fg }, k, age, r, d) {
    const src = d.picture();
    if (!src) return SCENES.word(...arguments);
    const cell = Math.max(6, Math.round(m / 46)), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    // fill the screen with the picture (cropped to it), brighter on the hit
    const s = Math.max(cols / src.w, rows / src.h), ox = (src.w - cols / s) / 2, oy = (src.h - rows / s) / 2;
    const gain = 0.85 + 0.5 * Math.exp(-age * 6);
    g.fillStyle = rgba(fg, 0.75 * k);
    dots(g, 0, 0, cols, rows, cell, (i, j) => {
      const x = Math.min(src.w - 1, Math.floor(ox + i / s)), y = Math.min(src.h - 1, Math.floor(oy + j / s));
      return src.lum[y * src.w + x] * gain;
    });
  },
  // the tempo and the key, printed as big as the ID card would
  info(g, { W, H, cx, cy, fg }, k, age, r, d) {
    const T = d.eng.tempo, key = d.eng.key;
    const bpm = T.locked ? String(T.shown || Math.round(T.bpm)) : '---';
    const size = Math.min(H * 0.6, W / 2.2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${Math.round(size)}px ${FONT}`;
    g.fillStyle = rgba(fg, k);
    g.fillText(bpm, cx, cy - size * 0.12);
    g.font = `600 ${Math.round(size * 0.2)}px ${FONT}`;
    g.fillText(`BPM  ·  ${key ? NOTES[key.root] + (key.mode === 'minor' ? 'm' : '') : '?'}`, cx, cy + size * 0.5);
  },
  // the spectrum as text, mirrored both ways like a kaleidoscope (after rentalunit5's video-synth
  // pieces): the newest rows in the middle, older ones out to the top and bottom, the low notes in
  // the middle and the high ones out to the sides, each character's weight its level
  mirror(g, { W, H, fg }, k, age, r, d) {
    const hist = d.hist, size = Math.max(12, Math.round(Math.min(W, H) / 22)), cw = size * 0.6;
    const cols = Math.ceil(W / cw / 2), rows = Math.ceil(H / size / 2);
    g.font = `700 ${size}px ${FONT}`;
    g.textAlign = 'left'; g.textBaseline = 'top';
    for (let j = 0; j < rows; j++) {
      const row = hist.rows[(hist.at - 1 - j + hist.n) % hist.n];
      if (!row) continue;
      let left = '';
      for (let c = 0; c < cols; c++) {
        const v = row[Math.min(hist.cols - 1, Math.floor(((cols - 1 - c) / cols) * hist.cols * 0.7))] * (0.5 + 0.7 * k);
        left += RAMP[Math.min(9, Math.max(0, Math.floor(v * 9.99)))];
      }
      const right = [...left].reverse().join('');
      g.fillStyle = rgba(fg, (0.35 + 0.65 * k) * (1 - (j / rows) * 0.5));
      for (const y of [H / 2 - (j + 1) * size, H / 2 + j * size]) { g.fillText(left, W / 2 - cols * cw, y); g.fillText(right, W / 2, y); }
    }
  },
  // a tunnel of rectangles flowing out toward you (after the same pieces' video feedback): a ring a
  // band of the spectrum, the low ones out at the edge, the kick pushing them out
  tunnel(g, { W, H, cx, cy, fg }, k, age, r, d) {
    const hist = d.hist, row = hist.rows[(hist.at - 1 + hist.n) % hist.n], N = 14, kick = Math.exp(-age * 8), flow = (age * 1.2) % 1;
    for (let i = 0; i < N; i++) {
      const f = (i + flow) / N, e = 0.03 + 0.97 * f * f * (1 + 0.06 * kick), w = W * e, h = H * e;
      const v = row ? row[Math.min(hist.cols - 1, Math.floor((1 - f) * hist.cols * 0.8))] : 0.3;
      g.strokeStyle = rgba(fg, k * (0.25 + 0.75 * v) * (0.4 + 0.6 * f));
      g.lineWidth = Math.max(1, (2 + 10 * v) * f);
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    }
  },
};
const NAMES = Object.keys(SCENES);
// the parts that cut, in the order they win when they land together
const PARTS = ['sd', 'bd', 'hho', 'bass', 'hhc'];

export function createCuts(canvas) {
  const ctx = canvas.getContext('2d');
  const band = new Float32Array(8);
  const salt = Math.floor(Math.random() * 1e6);
  let last = 0, prev = null, cut = null, n = 0, lift = 0;
  let calm = false, before = null; // fewer flashes on; the scene fading out under a new one
  const taken = new WeakSet(); // the hits already used, before the beat is found
  // what some scenes show: the spectrum's last rows (fall), the last few waveforms (wave), and a
  // small picture from the camera or the cover (face)
  const hist = { cols: 72, n: 64, at: 0, rows: [] };
  const traces = [];
  const art = { img: null, lum: null, w: 64, h: 64 };
  let lastRow = 0;

  // which scene each part has in the 8 bars a bar falls in
  const castFor = new Map();
  function cast(section) {
    if (!castFor.has(section)) {
      const r = rng(section * 7919 + salt), list = NAMES.slice();
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      if (castFor.size > 64) castFor.clear();
      castFor.set(section, Object.fromEntries(PARTS.map((p, i) => [p, list[i % list.length]])));
    }
    return castFor.get(section);
  }

  function cutTo(part, t, eng) {
    // never more than three a second: a new scene is a change of the whole screen's light, and
    // faster than that can set off seizures (WCAG's flash limit); with fewer flashes, once a bar
    if (cut && t - cut.at < (calm ? 4 * (eng.tempo.P || 0.5) : 0.34)) return;
    const section = eng.bar !== null ? Math.floor(eng.bar / 8) : 0;
    before = calm ? cut : null;
    cut = { scene: cast(section)[part], part, at: t, seed: ++n * 2654435761 + salt };
    shownAt[part] = t;
  }

  // Which part cuts at step s of the bar, from the learned patterns, if any. (The bass and the
  // closed hats only on the eighths: on every sixteenth they'd strobe.) When several land
  // together, the one whose scene has been away longest: a song that claps on every beat over a
  // kick on every beat would otherwise show the clap's scene alone.
  const shownAt = {};
  function partAt(eng, s, t) {
    const drums = eng.present('bd', t) || eng.present('sd', t);
    let best = null;
    for (const id of PARTS) {
      if ((id === 'bass' || id === 'hhc') && s % 2) continue;
      let hits = false;
      if (id === 'bass') hits = !drums && eng.v.bass?.shown?.[s] && eng.playing(eng.bassSeen, t);
      else if (eng.v[id]?.shown?.[s] && eng.present(id, t)) {
        if (id === 'hhc' && drums) { lift = 1; continue; }
        hits = true;
      }
      if (hits && (best === null || (shownAt[id] ?? -1) < (shownAt[best] ?? -1))) best = id;
    }
    return best;
  }
  // a kick or clap in the learned patterns within the time a cut has to last
  function drumSoon(eng, s, t) {
    const ahead = Math.ceil((calm ? 4 * (eng.tempo.P || 0.5) : 0.34) / ((eng.tempo.P || 0.5) / 4));
    for (let k = 1; k <= ahead; k++) {
      const i = (((s + k) % 16) + 16) % 16;
      for (const id of ['sd', 'bd']) if (eng.v[id]?.shown?.[i] && eng.present(id, t)) return true;
    }
    return false;
  }

  // the spectrum, 72 bands from 40 Hz to 14 kHz on a log scale, a row about 30 times a second
  function listen(eng, t) {
    if (t - lastRow >= 1 / 30) {
      lastRow = t;
      const db = eng.fastDb, hz = eng.hzFast, row = new Float32Array(hist.cols);
      for (let i = 0; i < hist.cols; i++) {
        const f0 = 40 * (14000 / 40) ** (i / hist.cols), f1 = 40 * (14000 / 40) ** ((i + 1) / hist.cols);
        let mx = -160;
        for (let b = Math.floor(f0 / hz); b <= Math.max(Math.floor(f0 / hz), Math.floor(f1 / hz)) && b < db.length; b++) mx = Math.max(mx, db[b]);
        row[i] = clamp((mx + 62) / 42, 0, 1) ** 1.6; // only the loud parts lit, so the code stays readable
      }
      hist.rows[hist.at] = row;
      hist.at = (hist.at + 1) % hist.n;
    }
    const time = eng.time;
    if (time && time.length) {
      // a window starting where the wave crosses zero going up, so it stands still on a steady note
      let s0 = 0;
      for (let i = 1; i < time.length / 2; i++) if (time[i - 1] <= 0 && time[i] > 0) { s0 = i; break; }
      const n = Math.min(512, time.length - s0), tr = new Float32Array(n);
      let peak = 1e-4;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(time[s0 + i]));
      for (let i = 0; i < n; i++) tr[i] = time[s0 + i] / Math.max(peak, 0.25);
      traces.push(tr);
      if (traces.length > 4) traces.shift();
    }
  }
  // the camera's small grey picture, or the cover's, for the face scene
  function picture(extra) {
    const fr = extra.cam;
    if (fr && fr.lum && fr.w) {
      // (the camera's lum is 0-255 or 0-1 depending on the source: normalise to 0-1)
      const lum = fr.lum, n = fr.w * fr.h;
      let mx = 0;
      for (let i = 0; i < n; i += 37) mx = Math.max(mx, lum[i]);
      if (mx > 1.5) { const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = lum[i] / 255; return { lum: out, w: fr.w, h: fr.h }; }
      return { lum, w: fr.w, h: fr.h };
    }
    const img = extra.art;
    if (!img || !img.complete || !img.naturalWidth) return null;
    if (art.img !== img) {
      const c = new OffscreenCanvas(art.w, art.h), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, art.w, art.h);
      const px = x.getImageData(0, 0, art.w, art.h).data;
      art.lum = new Float32Array(art.w * art.h);
      for (let i = 0; i < art.lum.length; i++) art.lum[i] = (0.3 * px[4 * i] + 0.59 * px[4 * i + 1] + 0.11 * px[4 * i + 2]) / 255;
      art.img = img;
    }
    return { lum: art.lum, w: art.w, h: art.h };
  }

  return {
    clear() { canvas.width = canvas.height = 0; prev = cut = before = null; },
    // one scene by name, as if its part had just hit (for looking at them one by one)
    show(scene, part = 'bd', t = performance.now() / 1000) { if (SCENES[scene]) cut = { scene, part, at: t, seed: ++n * 2654435761 + salt }; },
    get scenes() { return NAMES; },
    // offset (seconds): how far ahead to cut, so it lands as you hear the hit (see syncOffset);
    // fewer: fewer flashes (a scene change at most once a bar, faded across, never bright);
    // extra: what the scenes show besides the engine ({ lines, cam, art })
    draw(t, eng, col, offset = 0, fewer = false, extra = {}) {
      calm = fewer;
      const [W, H] = fit(canvas);
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      lift *= Math.exp(-dt * 18);
      listen(eng, t);
      const step = eng.stepAt(t + offset);
      if (step !== null) {
        // every step crossed since the last frame (none after a jump: new bar lines, a new tempo)
        if (prev !== null && step > prev && step - prev < 3) {
          for (let s = Math.floor(prev) + 1; s <= Math.floor(step); s++) {
            const part = partAt(eng, ((s % 16) + 16) % 16, t);
            // the open hat, the bass and the closed hats give way to a kick or clap coming within
            // the time a cut has to last: otherwise, landing between them (house's open hats),
            // they took every cut and the kick's and clap's scenes never showed
            if (part && part !== 'sd' && part !== 'bd' && drumSoon(eng, s, t)) { lift = 1; continue; }
            if (part) cutTo(part, t, eng);
          }
        }
        prev = step;
      } else {
        // no beat yet: the hits as they're heard (the hats only without drums). Each is taken
        // once, by itself rather than by its time: a kick is filed up to 90 ms late (once it's
        // been told from a bass note) with the time it began, after hats that came later.
        prev = null;
        const fresh = eng.onsets.filter((o) => t - o.t < 0.3 && !taken.has(o));
        for (const o of fresh) taken.add(o);
        const ids = new Set(fresh.map((o) => (o.id === 'hh' ? 'hhc' : o.id)));
        const drums = eng.onsets.some((o) => (o.id === 'bd' || o.id === 'sd') && t - o.t < 2);
        const part = PARTS.find((id) => ids.has(id) && !(id === 'hhc' && drums));
        if (part) cutTo(part, t, eng);
      }

      ctx.clearRect(0, 0, W, H);
      const where = { W, H, cx: W / 2, cy: H / 2, m: Math.min(W, H), fg: col.fg, ink: col.ink || col.fg };
      // how bright the scene is: full on the hit, down to a half through the beat, then fading
      // out after 8 beats without a cut (the parts have stopped); with fewer flashes, a steady
      // low light, faded in over half a second
      const beat = eng.tempo.P || 0.5;
      let k = 0;
      if (cut) {
        const age = t - cut.at, gone = age > 8 * beat ? Math.exp(-(age - 8 * beat) / 1.5) : 1;
        if (calm) k = 0.42 * Math.min(1, age / 0.5) * gone;
        else k = Math.min(1, (0.5 + 0.5 * Math.exp(-age / (0.45 * beat))) * gone + 0.2 * lift);
        if (age > 8 * beat && k < 0.01) cut = null;
      }
      // the lines across the middle, faint under a scene
      bands(eng, band);
      const quiet = eng.silent ? 0.3 : 1;
      ctx.lineWidth = 1;
      for (let L = 0; L < 4; L++) {
        ctx.strokeStyle = rgba(col.fg, (0.55 - 0.5 * k) * quiet * (L ? 0.6 : 1));
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const u = x / W, y = where.cy + (L - 1.5) * where.m * 0.014
            + Math.sin(u * 9 + t * (1.1 + L * 0.37) + L) * where.m * 0.035 * (band[1] + 0.5 * band[3])
            + Math.sin(u * 23 - t * 2.3 + L * 2) * where.m * 0.014 * band[5];
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      const data = (c) => ({ eng, part: c.part, lines: extra.lines || {}, step, hist, traces, picture: () => picture(extra) });
      // (with fewer flashes, the last scene fades out as the new one fades in)
      if (before && cut) {
        const kb = 0.42 * (1 - Math.min(1, (t - cut.at) / 0.5));
        if (kb > 0 && calm) SCENES[before.scene](ctx, where, kb, t - before.at, rng(before.seed), data(before));
        else before = null;
      }
      if (cut) SCENES[cut.scene](ctx, where, k, t - cut.at, rng(cut.seed), data(cut));
    },
    // for tests: the scene showing, and every scene's name
    get scene() { return cut?.scene || null; },
    get scenes() { return NAMES; },
  };
}
