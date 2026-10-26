// The glass blob: a lump of liquid glass floating over the code and bending it like a lens, after
// null.mpeg's AIRGLOW visuals. Each frame the background is drawn into a
// picture, the code goes over it, and a WebGL shader shows that through the blob: bent toward the
// middle (so what's under it looks bigger, like through a drop of water), split slightly into
// colours toward the edge, with the theme's light catching the rim, a soap bubble's colours in it,
// and a soft shadow under it.
// The blob is a few round drops melted together that drift and turn, swell on the kick and spin
// faster as the music gets louder.
import { bands } from './visuals.js';

const DROPS = 7;

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

const FRAG = `
precision highp float;
uniform sampler2D scene;      // the background
uniform sampler2D words;      // the code over it (premultiplied)
uniform vec2 size;            // the window, in CSS pixels
uniform float dpr;
uniform vec3 drops[${DROPS}];  // x, y, radius (CSS pixels, from the top left); radius 0 = unused
uniform float thickness;      // how thick the glass is in the middle of a drop, in pixels
uniform float depth;          // how strongly it bends what's under it
uniform vec3 fg;              // the theme's text colour, which the rim reflects
uniform vec3 shine;           // the highlights: the theme's lighter colour
const vec3 LIGHT = vec3(-0.45, -0.65, 0.62); // from the top left (y runs down the screen)
const float EDGE = 0.3679;    // exp(-1): a drop on its own ends at its radius

// What the page shows at a point: the code over the background.
vec3 look(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  vec4 w = texture2D(words, uv);
  return texture2D(scene, uv).rgb * (1.0 - w.a) + w.rgb;
}

// The blob as a field: each drop is a soft hill, and the glass is wherever the hills add up past
// EDGE, so drops that come close grow a bridge and melt together. Returns the field's height and
// its slope.
vec3 field(vec2 p) {
  float f = 0.0;
  vec2 g = vec2(0.0);
  for (int i = 0; i < ${DROPS}; i++) {
    vec3 c = drops[i];
    if (c.z <= 0.0) continue;
    vec2 q = p - c.xy;
    float k = exp(-dot(q, q) / (c.z * c.z));
    f += k;
    g -= 2.0 * k * q / (c.z * c.z);
  }
  return vec3(f, g);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, size.y * dpr - gl_FragCoord.y) / dpr;
  vec3 F = field(p);
  float d = (EDGE - F.x) / max(length(F.yz), 1e-4); // about how far outside the rim, in pixels
  float shadow = 0.26 * smoothstep(EDGE * 0.3, EDGE * 1.1, field(p - vec2(10.0, 18.0)).x);
  if (d > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, shadow); return; }

  // Thickness rises steeply at the rim, like a drop, and keeps curving all the way in.
  float A = thickness / sqrt(1.0 - EDGE), e = max(F.x - EDGE, 0.0);
  float h = A * sqrt(e);
  vec2 slope = F.yz * (0.5 * A / sqrt(max(e, 1e-4)));
  slope *= min(1.0, 6.0 / max(length(slope), 1e-4)); // steep at the very rim, not vertical
  vec3 n = normalize(vec3(-slope, 1.0));

  // Looking straight down through it: the ray bends toward the middle on the way in.
  vec3 t = refract(vec3(0.0, 0.0, -1.0), n, 0.69);
  vec2 shift = t.xy / max(0.25, -t.z) * (h + thickness * 0.3) * depth;
  shift *= min(1.0, thickness * 1.2 / max(length(shift), 1e-4));
  vec2 bend = shift / size;
  vec2 uv = p / size;
  vec3 col = vec3(look(uv + bend * 0.92).r, look(uv + bend).g, look(uv + bend * 1.08).b);

  // Toward the rim it reflects more than it lets through (what's around it, washed with light).
  vec3 L = normalize(LIGHT), V = vec3(0.0, 0.0, 1.0), r = reflect(-V, n);
  float fres = pow(1.0 - n.z, 3.0);
  vec3 env = look(uv - r.xy * 0.22);
  env = mix(env, fg, 0.3 + 0.35 * clamp(-r.y, 0.0, 1.0));
  col = mix(col, env, clamp(fres, 0.0, 0.8));

  // Light: a sharp highlight, a broad sheen from the other side, the lit edge bright and the far
  // edge a little dark (light that never makes it out), and a touch brighter where it's thick.
  vec2 out2 = normalize(n.xy + 1e-6);
  float facing = dot(out2, normalize(L.xy));
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 90.0);
  float sheen = pow(max(dot(n, normalize(vec3(0.55, 0.6, 0.6) + V)), 0.0), 16.0);
  float lip = 1.0 - smoothstep(0.0, 3.0, -d);
  float inner = 1.0 - smoothstep(2.0, 18.0, -d);
  col *= 1.0 + 0.07 * min(h / thickness, 1.5);
  col *= 1.0 - 0.3 * inner * clamp(-facing, 0.0, 1.0);
  col += shine * (spec * 1.1 + sheen * 0.16 + lip * 0.55 * clamp(facing * 0.8 + 0.4, 0.0, 1.0));
  // thin-film colours toward the rim, like a soap bubble's (AIRGLOW's rims run green, yellow and
  // rainbow), shifting with the glass's thickness and which way the rim faces
  vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + h / thickness * 1.6 + facing * 0.3));
  col += film * (lip * 0.3 + clamp(fres, 0.0, 0.8) * 0.22);

  float a = clamp(0.5 - d, 0.0, 1.0);
  gl_FragColor = vec4(min(col, 1.0) * a, a + shadow * (1.0 - a));
}`;

export function createGlass(canvas, code) {
  const scene = document.createElement('canvas');
  const sx = scene.getContext('2d');
  // The code, drawn into a picture of its own that stays on the graphics card: a line is drawn
  // again, and sent up, only when it changes (something typed, a token lit, a line flashing), and
  // all of them when the theme, layout or size does. The caret, which blinks the whole time it
  // types, goes in with the background each frame. (Drawing all of the code every frame was most
  // of the glass's cost.)
  const words = document.createElement('canvas');
  const wx = words.getContext('2d');
  let all = true;
  const dirty = new Set(); // lines (the code's children) to draw again
  const drawnAt = new Map(); // where each line was drawn, in the picture's pixels
  const lineSeen = new Map(); // where each line's text is, for where the code is
  const lineOf = (node) => { while (node && node.parentNode !== code) node = node.parentNode; return node; };
  const touched = (node) => { if (node === code) all = true; else { const el = lineOf(node); if (el) dirty.add(el); } };
  const watchers = [
    [new MutationObserver((recs) => { for (const r of recs) touched(r.target); }), code, { subtree: true, childList: true, characterData: true, attributes: true }],
    [new MutationObserver(() => { all = true; }), document.documentElement, { attributes: true }],
    [new MutationObserver(() => { all = true; }), document.body, { attributes: true, attributeFilter: ['class', 'style'] }],
  ];
  addEventListener('resize', () => { all = true; });
  document.fonts?.addEventListener?.('loadingdone', () => { all = true; });
  // lines in the middle of a flash (and the code in a glitch) are drawn every frame till it ends; a
  // line retyped mid-flash takes its old text away without a word, so those are let go
  const animating = new Map(); // element -> when its animation started
  const prune = () => { for (const [el, since] of animating) if (!el.isConnected || performance.now() - since > 1500) animating.delete(el); };
  code.addEventListener('animationstart', (e) => {
    if (e.target.classList.contains('caret')) return;
    animating.set(e.target, performance.now());
    if (animating.size > 40) prune();
  });
  for (const end of ['animationend', 'animationcancel']) code.addEventListener(end, (e) => { animating.delete(e.target); touched(e.target); });
  const drops = new Float32Array(DROPS * 3), band = new Float32Array(8);
  let gl = null, prog = null, parallel = null, ready = false, broken = false, loc = {};
  let font = { size: 0, family: '', cw: 0 };
  let pulse = 0, spin = 0, last = 0, low = 0, mid = 0, high = 0;
  // where the code is on screen (it drifts over that), measured as it's drawn
  let area = null;
  const seen = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  let hidden = false, wordsShown = true; // (the code hidden (Z); whether the words canvas has it)

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; prog = null; });
  canvas.addEventListener('webglcontextrestored', () => { ready = false; prog = null; });

  // Building the shader takes Windows most of a second the first time, so it's built in the
  // background where the driver allows it, and the glass appears once it's done.
  function build() {
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false };
    gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
    if (!gl) { broken = true; return; }
    parallel = gl.getExtension('KHR_parallel_shader_compile');
    prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
  }

  function init() {
    if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog) || gl.getAttachedShaders(prog).map((s) => gl.getShaderInfoLog(s)).join(' ');
      throw new Error(log);
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle over the window
    const p = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    // the background on texture unit 0, the code on 1, both premultiplied, as canvases keep them
    for (const unit of [1, 0]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    loc = Object.fromEntries(['size', 'dpr', 'drops', 'thickness', 'depth', 'fg', 'shine', 'scene', 'words'].map((k) => [k, gl.getUniformLocation(prog, k)]));
    gl.uniform1i(loc.scene, 0);
    gl.uniform1i(loc.words, 1);
    all = true; // a new texture for the code: all of it goes up
    ready = true;
    return true;
  }

  // Where the drops are this frame. The middle one drifts slowly about over the code; the others
  // circle it at their own speeds, closer and further, so they keep melting in and pulling away.
  function move(t, eng, W, H) {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    bands(eng, band);
    const ease = (v, x, rate) => v + (x - v) * Math.min(1, dt * rate);
    low = ease(low, (band[0] + band[1]) / 2, 6);
    mid = ease(mid, (band[2] + band[3] + band[4]) / 3, 6);
    high = ease(high, (band[5] + band[6] + band[7]) / 3, 8);
    pulse *= Math.exp(-dt * 5);
    spin += dt * (0.25 + 0.9 * mid);
    const R = 0.18 * Math.min(W, H);
    // (over the code; with it hidden (Z) or none yet, about the middle of the window)
    const code = seen.x1 > seen.x0 && !hidden ? seen : { x0: W * 0.2, x1: W * 0.8, y0: H * 0.2, y1: H * 0.8 };
    if (!area) area = { ...code };
    for (const k of ['x0', 'x1', 'y0', 'y1']) area[k] = ease(area[k], code[k], 0.5);
    const cx = (area.x0 + area.x1) / 2 + (area.x1 - area.x0) * 0.3 * Math.sin(t * 0.09) * Math.cos(t * 0.05);
    const cy = (area.y0 + area.y1) / 2 + (area.y1 - area.y0) * 0.22 * Math.sin(t * 0.07 + 0.6);
    const set = (i, x, y, r) => { drops[i * 3] = x; drops[i * 3 + 1] = y; drops[i * 3 + 2] = r; };
    set(0, cx, cy, R * (0.95 + 0.12 * low + 0.16 * pulse));
    for (let i = 1; i <= 4; i++) {
      const a = spin * (i % 2 ? 1 : -0.7) * (0.6 + 0.15 * i) + i * 1.57;
      const dist = R * (0.62 + 0.18 * Math.sin(t * 0.37 + i * 1.7) + 0.22 * pulse);
      set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.85, R * (0.42 + 0.1 * Math.sin(t * 0.53 + i) + 0.18 * mid));
    }
    for (let i = 5; i < DROPS; i++) {
      const a = -spin * 0.45 + (i - 5) * Math.PI + Math.sin(t * 0.2 + i);
      const dist = R * (1.3 + 0.2 * Math.sin(t * 0.21 + i));
      set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.8, R * (0.17 + 0.12 * high + 0.05 * pulse));
    }
    return R;
  }

  // The picture under the glass: the background layers as the page shows them, and the caret
  // (the code goes over it in the shader; the text after the caret goes over it, as on the page).
  function compose(W, H, dpr, col, layers) {
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (scene.width !== w || scene.height !== h) { scene.width = w; scene.height = h; words.width = w; words.height = h; font.size = 0; all = true; }
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.fillStyle = `rgb(${col.bg})`;
    sx.fillRect(0, 0, w, h);
    // (in the order the page stacks them: the cut-out and the dots go up over the backgrounds)
    const shown = [];
    for (const el of layers) {
      if (!el.width || el.hidden) continue;
      const st = getComputedStyle(el);
      if (st.display !== 'none') shown.push([el, +st.opacity, +st.zIndex || 0]);
    }
    shown.sort((a, b) => a[2] - b[2]);
    for (const [el, opacity] of shown) {
      sx.globalAlpha = opacity;
      sx.drawImage(el, 0, 0, w, h);
    }
    sx.globalAlpha = 1;
    const caret = code.querySelector('.caret');
    if (caret) {
      const r = caret.getBoundingClientRect(), st = getComputedStyle(caret);
      sx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sx.globalAlpha = +st.opacity;
      sx.fillStyle = st.backgroundColor;
      sx.fillRect(r.left, r.top, r.width, r.height);
      sx.globalAlpha = 1;
    }
  }

  // The code as the page shows it, the lines that changed (or all of them): each line's text in its
  // colour on the dark box behind it, lit tokens boxed, the grid and roll panels in their small
  // type. (It's monospace, so a character's place on the line is all it takes.) Each line is
  // cleared and drawn inside its own rectangle, on whole pixels, so lines never bleed into each
  // other. Returns the part of the picture that changed ({ x, y, w, h, full }), or null.
  function drawCode(H, dpr) {
    // (with the code hidden (Z) the glass shows none of it: the words cleared once and left so; it's
    // drawn again in full when the code comes back, as any change to the page's classes does)
    if (hidden) {
      if (wordsShown) { wordsShown = false; wx.clearRect(0, 0, words.width, words.height); return { full: true }; }
      return null;
    }
    wordsShown = true;
    const sx = wx;
    const cs = getComputedStyle(code), size = parseFloat(cs.fontSize), family = cs.fontFamily;
    if (size !== font.size || family !== font.family) {
      sx.font = `${size}px ${family}`;
      font = { size, family, cw: sx.measureText('0'.repeat(40)).width / 40 };
      all = true;
    }
    prune();
    for (const el of animating.keys()) touched(el);
    const full = all, list = full ? [...code.children] : [...dirty];
    all = false;
    dirty.clear();
    if (full) { sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, words.width, words.height); drawnAt.clear(); lineSeen.clear(); }
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (b) => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); };
    for (const el of list) {
      const was = drawnAt.get(el);
      if (was) { sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(was.x, was.y, was.w, was.h); grow(was); drawnAt.delete(el); }
      lineSeen.delete(el);
      const r = el.getBoundingClientRect();
      if (!el.firstChild || el.classList.contains('cut') || !r.height || r.bottom < 0 || r.top > H) continue;
      const X = Math.max(0, Math.floor(r.left * dpr)), Y = Math.max(0, Math.round(r.top * dpr));
      const b = { x: X, y: Y, w: Math.min(words.width, Math.ceil(r.right * dpr)) - X, h: Math.min(words.height, Math.round(r.bottom * dpr)) - Y };
      if (b.w <= 0 || b.h <= 0) continue;
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.clearRect(b.x, b.y, b.w, b.h);
      sx.save();
      sx.beginPath();
      sx.rect(b.x, b.y, b.w, b.h);
      sx.clip();
      sx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sx.textBaseline = 'middle';
      const ext = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      if (el.classList.contains('panel')) {
        const ps = size * 0.58;
        sx.fillStyle = getComputedStyle(el).backgroundColor;
        sx.fillRect(r.left, r.top, r.width, r.height);
        sx.font = `${ps}px ${family}`;
        runs(el, r.left + 0.4 * ps, r.top + 0.35 * ps, ps * 1.2, font.cw * 0.58, ps, ext);
      } else {
        // (a long line runs on over more rows, each a line-height tall)
        const rows = Math.max(1, Math.round(r.height / (parseFloat(cs.lineHeight) || size * 1.55)));
        sx.font = `${size}px ${family}`;
        runs(el, r.left, r.top, r.height / rows, font.cw, size, ext);
      }
      sx.restore();
      drawnAt.set(el, b);
      if (ext.x1 > ext.x0) lineSeen.set(el, ext);
      grow(b);
    }
    Object.assign(seen, { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
    for (const e of lineSeen.values()) {
      seen.x0 = Math.min(seen.x0, e.x0); seen.x1 = Math.max(seen.x1, e.x1);
      seen.y0 = Math.min(seen.y0, e.y0); seen.y1 = Math.max(seen.y1, e.y1);
    }
    if (full) return { x: 0, y: 0, w: words.width, h: words.height, full };
    return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, full } : null;
  }

  // An element's text, run by run (lines inside it split on newlines), each in its colour, with
  // the backgrounds and outlines of the spans it's in.
  function runs(root, x0, y0, lh, cw, size, seen) {
    const sx = wx;
    let col = 0, row = 0;
    const box = size * 1.32; // an inline box is about the font's height
    const walk = (node, color) => {
      for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) {
          const parts = c.data.split('\n');
          for (let i = 0; i < parts.length; i++) {
            if (i) { row++; col = 0; }
            if (!parts[i]) continue;
            const x = x0 + col * cw, y = y0 + row * lh;
            sx.fillStyle = color;
            sx.fillText(parts[i], x, y + lh / 2);
            col += parts[i].length;
            if (parts[i].trim()) {
              seen.x0 = Math.min(seen.x0, x); seen.x1 = Math.max(seen.x1, x0 + col * cw);
              seen.y0 = Math.min(seen.y0, y); seen.y1 = Math.max(seen.y1, y + lh);
            }
          }
        } else if (c.nodeType === 1) {
          const st = getComputedStyle(c), x = x0 + col * cw, y = y0 + row * lh + (lh - box) / 2;
          if (c.classList.contains('caret')) continue; // drawn each frame, over this
          const text = c.textContent;
          if (text && !text.includes('\n')) {
            if (st.backgroundColor !== 'rgba(0, 0, 0, 0)') { sx.fillStyle = st.backgroundColor; sx.fillRect(x, y, text.length * cw, box); }
            if (c.classList.contains('sl')) {
              // a slider's track: the whole width dim, filled as far as its value
              const k = parseFloat(c.style.getPropertyValue('--k')) || 0;
              sx.fillStyle = st.getPropertyValue('--dim').trim() || st.color;
              sx.fillRect(x, y + box - 2, text.length * cw, 2);
              sx.fillStyle = st.getPropertyValue('--fg').trim() || st.color;
              sx.fillRect(x, y + box - 2, text.length * cw * k, 2);
            }
            const ow = st.outlineStyle === 'none' ? 0 : parseFloat(st.outlineWidth);
            if (ow) { sx.strokeStyle = st.outlineColor; sx.lineWidth = ow; sx.strokeRect(x - ow / 2, y - ow / 2, text.length * cw + ow, box + ow); }
          }
          walk(c, st.color);
        }
      }
    };
    walk(root, getComputedStyle(root).color);
  }

  return {
    // Turning it on shows the layer; it starts drawing on the next frame.
    show(on) {
      canvas.hidden = !on;
      if (!on && ready) gl.clear(gl.COLOR_BUFFER_BIT);
      for (const [mo, target, opts] of watchers) { if (on) mo.observe(target, opts); else mo.disconnect(); }
      all = true;
    },
    get broken() { return broken; },
    // the pictures under the glass, for checking what it bends: the background, and the code
    get scene() { return scene; },
    get words() { return words; },
    kick(s) { pulse = Math.max(pulse, Math.min(1, s)); },
    // layers: the background canvases, bottom first.
    draw(t, eng, col, layers) {
      if (canvas.hidden || broken || gl?.isContextLost()) return; // (lost: wait for it to come back, then build again)
      if (!ready) {
        try {
          if (!prog) build();
          if (broken || !init()) return;
        } catch (err) { if (!gl?.isContextLost()) { broken = true; console.error('glass:', err); } return; }
      }
      const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      const w = Math.round(W * dpr), h = Math.round(H * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      hidden = document.body.classList.contains('nocode');
      const R = move(t, eng, W, H);
      compose(W, H, dpr, col, layers);
      gl.viewport(0, 0, w, h);
      const changed = drawCode(H, dpr);
      if (changed) {
        gl.activeTexture(gl.TEXTURE1);
        if (changed.full || !gl.texStorage2D) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, words);
        else {
          // WebGL 2: just the rows that changed
          gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, changed.x);
          gl.pixelStorei(gl.UNPACK_SKIP_ROWS, changed.y);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, changed.x, changed.y, changed.w, changed.h, gl.RGBA, gl.UNSIGNED_BYTE, words);
          gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
          gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
        }
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
      gl.uniform2f(loc.size, W, H);
      gl.uniform1f(loc.dpr, dpr);
      gl.uniform3fv(loc.drops, drops);
      gl.uniform1f(loc.thickness, R);
      gl.uniform1f(loc.depth, 1.25);
      const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
      const shine = lum(col.fg) >= lum(col.bg) ? col.fg : col.bg;
      gl.uniform3f(loc.fg, col.fg[0] / 255, col.fg[1] / 255, col.fg[2] / 255);
      gl.uniform3f(loc.shine, shine[0] / 255, shine[1] / 255, shine[2] / 255);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
