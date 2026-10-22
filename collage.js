// The collage over the chrome (chrome.js), after a Y2K glitch collage: every couple of
// bars the screen is cut into rectangles (recursive splits, the longer side at 20 to 80%, bigger
// ones split more often: the generative "Mondrian"), and some of them show the chrome another way:
// mosaic tiles with seams, rows of pixels dragged sideways, columns dragged down (a barcode), the
// liquid's contour lines (rings round every kick's drop, like a circuit board), 1-bit with an
// ordered dither, black graph paper, and one light panel with the song's name, artist, key and
// tempo in the code's font, its rows knocked sideways. The rest stay chrome. The kick swells the
// mosaic's tiles, the hats tear the dragged rows, the clap flashes a holographic strip.
export const COLLAGE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D img, surf, film, text;
uniform vec2 res;
uniform vec4 rects[14];   // x0, y0, x1, y1 (0-1, y up)
uniform vec4 kinds[14];   // kind, size (px), -, seed
uniform int nRects;
uniform float time, pulse, tear;
const float BAYER[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h1(float x) { return fract(sin(x * 127.1 + 31.7) * 43758.5453); }
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 px = uv * res;
  vec3 c = texture(img, uv).rgb;
  // the liquid's height and how fast it changes from pixel to pixel, worked out here, outside the
  // branches below (screen-space derivatives aren't defined inside them)
  float hgt = texture(surf, uv).b, hw = fwidth(hgt);
  for (int i = 0; i < 14; i++) {
    if (i >= nRects) break;
    vec4 r = rects[i];
    if (uv.x < r.x || uv.x >= r.z || uv.y < r.y || uv.y >= r.w) continue;
    vec4 k = kinds[i];
    vec2 lp = (uv - r.xy) / (r.zw - r.xy);
    int kind = int(k.x + 0.5);
    if (kind == 1) {                         // mosaic: tiles with dark seams, 8 greys
      float s = k.y * (1.0 + 0.5 * pulse);
      vec2 o = r.xy * res, q = (px - o) / s, cell = floor(q);
      float v = lum(texture(img, (o + (cell + 0.5) * s) / res).rgb);
      v = floor(v * 7.0 + 0.5) / 7.0;
      vec2 f = fract(q);
      float seam = max(step(f.x, 1.2 / s), step(f.y, 1.2 / s));
      c = vec3(v) * (1.0 - 0.35 * seam);
    } else if (kind == 2) {                  // rows dragged sideways, with scan lines
      float band = floor((px.y - r.y * res.y) / k.y);
      float jit = (h1(band + k.w + floor(time * 9.0)) - 0.5) * 0.06 * tear;
      float x = r.x + (r.z - r.x) * (0.04 + 0.12 * h1(band * 1.7 + k.w)) + jit;
      float v = lum(texture(img, vec2(x, (r.y * res.y + (band + 0.5) * k.y) / res.y)).rgb);
      c = vec3(v * (0.82 + 0.18 * step(0.5, fract(px.y * 0.5))));
    } else if (kind == 3) {                  // columns dragged down: a barcode
      float band = floor((px.x - r.x * res.x) / k.y);
      float y = r.y + (r.w - r.y) * (0.15 + 0.7 * h1(band * 2.3 + k.w));
      float v = lum(texture(img, vec2((r.x * res.x + (band + 0.5) * k.y) / res.x, y)).rgb);
      c = vec3(step(0.5, v) * 0.85 + 0.08);
    } else if (kind == 4) {                  // the liquid's contour lines, a pixel wide, on a board's grid
      float h = hgt * k.y;
      float f = fract(h), d = min(f, 1.0 - f) / max(hw * k.y, 1e-4);
      float line = 1.0 - smoothstep(0.6, 1.6, d);
      vec2 g = fract(px / 22.0);
      c = mix(vec3(0.045), vec3(0.88), line) + 0.05 * max(step(g.x, 0.045), step(g.y, 0.045));
    } else if (kind == 5) {                  // 1-bit, a 4 x 4 ordered dither
      ivec2 q = ivec2(mod(floor(px / 2.0), 4.0));
      c = vec3(step((BAYER[q.x + q.y * 4] + 0.5) / 16.0, lum(texture(img, uv).rgb)));
    } else if (kind == 6) {                  // black graph paper
      vec2 g = fract(px / k.y);
      c = vec3(0.025) + 0.1 * max(step(g.x, 1.0 / k.y), step(g.y, 1.0 / k.y));
    } else if (kind == 7) {                  // the panel: light, the song in the code's font
      float row = floor(lp.y * 4.0);
      vec2 tp = lp;
      tp.x += (h1(row * 3.1 + k.w + floor(time * 3.0)) - 0.5) * 0.05 * (0.3 + tear);
      float a = texture(text, vec2(tp.x, 1.0 - tp.y)).a;
      c = mix(vec3(0.85), vec3(0.05), a);
    } else if (kind == 8) {                  // a holographic strip
      float o = 0.12 + 0.7 * lp.x + 0.04 * sin(time * 4.0 + lp.y * 9.0);
      c = texture(film, vec2(o, 0.5)).rgb * 1.5 + 0.12;
    }
  }
  color = vec4(c, 1.0);
}`;

// A small seeded random: the same bar gives the same layout.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The rectangles for one layout: [x0, y0, x1, y1, kind, size, 0, seed], kind 0 (chrome) left out.
// W, H: the window in pixels (splits go across the longer side, edges snap to 8 px).
export function layout(seed, W, H) {
  const rnd = seeded(seed * 9973 + 7);
  let rects = [[0, 0, 1, 1]];
  const want = 7 + Math.floor(rnd() * 4);
  while (rects.length < want) {
    const area = rects.map(([a, b, c, d]) => (c - a) * (d - b));
    let pick = rnd() * area.reduce((s, x) => s + x, 0), i = 0;
    while (i < rects.length - 1 && pick > area[i]) { pick -= area[i]; i++; }
    const [x0, y0, x1, y1] = rects[i], t = 0.2 + 0.6 * rnd();
    const snap = (v, n) => Math.round((v * n) / 8) * 8 / n;
    const parts = (x1 - x0) * W >= (y1 - y0) * H
      ? [[x0, y0, snap(x0 + (x1 - x0) * t, W), y1], [snap(x0 + (x1 - x0) * t, W), y0, x1, y1]]
      : [[x0, y0, x1, snap(y0 + (y1 - y0) * t, H)], [x0, snap(y0 + (y1 - y0) * t, H), x1, y1]];
    rects.splice(i, 1, ...parts);
  }
  // the panel: the widest rectangle that's at least twice as wide as tall (if any)
  let text = -1, best = 0;
  rects.forEach(([a, b, c, d], i) => { const w = (c - a) * W, h = (d - b) * H; if (a >= 0.45 && w > 2.2 * h && h > 70 && h < 0.4 * H && w * h > best) { best = w * h; text = i; } });
  // the rest: two in five stay chrome, the others a treatment (weighted)
  const KINDS = [[1, 2], [2, 3], [3, 1], [4, 4], [5, 1], [6, 1]], total = KINDS.reduce((s, [, w]) => s + w, 0);
  let treated = text >= 0 ? (rects[text][2] - rects[text][0]) * (rects[text][3] - rects[text][1]) : 0;
  const out = [];
  rects.forEach((r, i) => {
    if (i === text) { out.push([...r, 7, 0, 0, rnd() * 100]); return; }
    const area = (r[2] - r[0]) * (r[3] - r[1]);
    if (rnd() < 0.4 || area > 0.26 || treated + area > 0.5) return;
    treated += area;
    let p = rnd() * total, k = 0;
    while (p > KINDS[k][1]) { p -= KINDS[k][1]; k++; }
    const kind = KINDS[k][0], size = { 1: 8 + Math.round(rnd() * 10), 2: 2 + Math.round(rnd() * 5), 3: 3 + Math.round(rnd() * 6), 4: 260 + Math.round(rnd() * 300), 5: 0, 6: 18 + Math.round(rnd() * 14) }[kind];
    out.push([...r, kind, size, 0, rnd() * 100]);
  });
  return { rects: out, text: text >= 0 ? rects[text] : null };
}

// The panel's picture: the song's lines in the code's font, dark on clear, left-aligned, sized to
// the panel (three lines and a rule under the first).
export function drawPanel(g, w, h, lines) {
  g.canvas.width = Math.max(8, Math.round(w));
  g.canvas.height = Math.max(8, Math.round(h));
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  const n = lines.length, lh = g.canvas.height / (n + 1);
  let fs = Math.floor(lh * 0.62);
  g.fillStyle = '#000';
  g.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    g.font = `${i === 0 ? 700 : 500} ${fs}px "JetBrains Mono", monospace`;
    while (fs > 8 && g.measureText(lines[i]).width > g.canvas.width * 0.92) { fs -= 2; g.font = `${i === 0 ? 700 : 500} ${fs}px "JetBrains Mono", monospace`; }
    const y = lh * (i + 0.85);
    g.fillText(lines[i], g.canvas.width * 0.04, y);
    if (i === 0) g.fillRect(g.canvas.width * 0.04, y + fs * 0.62, Math.min(g.canvas.width * 0.9, g.measureText(lines[i]).width), Math.max(2, fs * 0.07));
  }
}
