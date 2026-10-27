// A flat picture laid into a window seen at an angle, as a 2D canvas can't: a projective map (a homography), on the GPU,
// onto a 2D canvas. The handheld game's screens are drawn flat, square on (the same skins as ever), then laid this way
// into the handheld's windows when it's seen from the side (its stance, game.js).
//   draw(ctx, src, M, box, op, alpha): src (a canvas) laid over ctx's box ([x, y, w, h], whole pixels), where M (a 3 x 3,
//   row by row) takes a pixel of ctx's to the pixel of src's it shows; outside src, nothing. False when it can't (no WebGL).
const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
const FRAG = `precision highp float;
uniform sampler2D img; uniform mat3 M; uniform vec2 origin; uniform float boxH; uniform vec2 size;
void main() {
  vec3 q = M * vec3(origin.x + gl_FragCoord.x, origin.y + boxH - gl_FragCoord.y, 1.0);
  vec2 uv = q.xy / (q.z * size);
  if (q.z <= 0.0 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  gl_FragColor = texture2D(img, uv);
}`;

export function createWarp() {
  let canvas = null, gl = null, at = null, failed = false;

  function init() {
    canvas = document.createElement('canvas');
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; });
    canvas.addEventListener('webglcontextrestored', () => { canvas = null; }); // (made again on the next draw)
    const g = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!g) { failed = true; return; }
    const shader = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); return s; };
    const prog = g.createProgram();
    g.attachShader(prog, shader(g.VERTEX_SHADER, VERT)); g.attachShader(prog, shader(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) { failed = true; return; }
    g.useProgram(prog);
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), g.STATIC_DRAW);
    const p = g.getAttribLocation(prog, 'p');
    g.enableVertexAttribArray(p); g.vertexAttribPointer(p, 2, g.FLOAT, false, 0, 0);
    g.bindTexture(g.TEXTURE_2D, g.createTexture());
    for (const [k, v] of [[g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR], [g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE]]) g.texParameteri(g.TEXTURE_2D, k, v);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    at = Object.fromEntries(['M', 'origin', 'boxH', 'size', 'img'].map((n) => [n, g.getUniformLocation(prog, n)]));
    g.uniform1i(at.img, 0);
    gl = g;
  }

  function draw(ctx, src, M, box, op = 'source-over', alpha = 1) {
    if (!gl && !failed) init();
    if (!gl) return false;
    const [x, y, w, h] = box;
    if (w <= 0 || h <= 0) return true;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.uniformMatrix3fv(at.M, false, [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]]); // (GL's go column by column)
    gl.uniform2f(at.origin, x, y); gl.uniform1f(at.boxH, h); gl.uniform2f(at.size, src.width, src.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ctx.save();
    ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, x, y);
    ctx.restore();
    return true;
  }

  return { draw };
}

// 3 x 3s, row by row: a product, an inverse, a point through one
export const mul3 = (a, b) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]));
export function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C;
  return [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map((v) => v / det);
}
export const apply3 = (m, x, y) => { const z = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z]; };
