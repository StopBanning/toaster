// The camera's picture, mirrored or not. The camera layer (createWebcam in visuals.js) draws the
// video into a small picture, mirrored as a selfie view is (the default) or, with "Mirror the camera"
// off in the help, as the camera sees it, for pointing it at your gear. Whatever else is drawn from the
// camera has to land where that picture does, so it finds its places through the picture's map and its
// flag: the finger frame and the portal through place(), the close-ups through cropFrom(), the cut-out's
// mask through maskU(), and the dots, the voxels and the portal's skull through the flag itself
// (cam.mirrored in app.js). The tracker's points stay as it gives them: 0-1 of the camera's own frame,
// never mirrored. Plain functions, so the tests can run them.

// The setting as it was saved: only an explicit false is not mirrored (an older Toaster saved none).
export const readMirror = (saved) => saved !== false;

// How the camera's frame (vw x vh) covers the small picture (sw x sh): the scale that fills it, the
// offsets that centre it, and the flag the picture is drawn with.
export function pictureMap(sw, sh, vw, vh, mirror) {
  const scale = Math.max(sw / vw, sh / vh);
  return { sw, sh, scale, ox: (sw - vw * scale) / 2, oy: (sh - vh * scale) / 2, mirror: mirror !== false };
}

// Across the small picture (pixels): where a point of the camera's own frame falls (nx: 0-1 of its width).
const across = (m, vw, nx) => (m.mirror ? m.sw - (m.ox + nx * vw * m.scale) : m.ox + nx * vw * m.scale);

// A point of the camera's own frame (0-1, not mirrored) as 0-1 of the picture as it's shown.
export const toPicture = (m, vw, vh, nx, ny) => [across(m, vw, nx) / m.sw, (m.oy + ny * vh * m.scale) / m.sh];

// The same point on screen, the picture being at rect (CSS pixels).
export function place(m, rect, vw, vh, nx, ny) {
  const xs = across(m, vw, nx), ys = m.oy + ny * vh * m.scale;
  return [rect.x + (xs * rect.w) / m.sw, rect.y + (ys * rect.h) / m.sh];
}

// Part of the picture as it's shown (r: x, y, w, h, 0-1 of it) as the rectangle of the camera's own
// frame it comes from (pixels), and whether the cut-out is drawn flipped: what a close-up copies.
export function cropFrom(m, r) {
  const x0 = r.x * m.sw, x1 = (r.x + r.w) * m.sw, y0 = r.y * m.sh, y1 = (r.y + r.h) * m.sh;
  return { x: ((m.mirror ? m.sw - x1 : x0) - m.ox) / m.scale, y: (y0 - m.oy) / m.scale, w: (x1 - x0) / m.scale, h: (y1 - y0) / m.scale, flip: m.mirror };
}

// Where column x (a pixel's middle is x + 0.5) of the small picture falls across the camera's own
// frame, 0-1: how the person mask (the camera's frame, not mirrored) is looked up for it.
export const maskU = (m, vw, x) => ((m.mirror ? m.sw - x - 0.5 : x + 0.5) - m.ox) / m.scale / vw;

// u (0-1 across the picture as it's shown) as 0-1 across the camera's own frame.
export const frameU = (mirror, u) => (mirror ? 1 - u : u);
