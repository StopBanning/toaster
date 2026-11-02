// tools/take-render.test.mjs's render page: everything on it is a pure function of k and t (a shader over the page, code
// text with one line lit, a white flash on every 15th frame from 15), with k itself in 16 black and white squares at the
// top left, so the test can see that each frame in the file is the one asked for. ?stallAt=k stops answering at frame k;
// ?failAt=k says it can't draw there.
const q = new URLSearchParams(location.search), stallAt = +(q.get('stallAt') ?? -1), failAt = +(q.get('failAt') ?? -1);
const gl = document.getElementById('gl').getContext('webgl2', { antialias: false });
const cv = gl.canvas;
cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
const pr = gl.createProgram();
gl.attachShader(pr, shader(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'));
gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float; uniform float t; uniform vec2 r; out vec4 o;\nvoid main(){ vec2 u = gl_FragCoord.xy / r; o = vec4(.25 + .2 * sin(6.28 * (u.x + t * .3)), .2 + .15 * sin(6.28 * (u.y * 2. - t * .5)), .3, 1.); }'));
gl.linkProgram(pr); gl.useProgram(pr);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const ut = gl.getUniformLocation(pr, 't'), ur = gl.getUniformLocation(pr, 'r');
const code = document.getElementById('code'), flash = document.getElementById('flash'), mark = document.getElementById('mark').getContext('2d');
const lines = Array.from({ length: 30 }, (_, i) => `$: s("bd*4").bank("tr909").gain(${(0.5 + i / 60).toFixed(2)}) // part ${i}`);

function draw(k, t) {
  gl.viewport(0, 0, cv.width, cv.height); gl.uniform1f(ut, t); gl.uniform2f(ur, cv.width, cv.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
  code.textContent = '';
  lines.forEach((l, i) => { const el = i === k % 30 ? Object.assign(document.createElement('span'), { className: 'lit' }) : document.createTextNode(''); el.textContent = l + '\n'; code.append(el); });
  code.append(`// frame ${k}, t = ${t.toFixed(3)}`);
  flash.style.display = k > 0 && k % 15 === 0 ? 'block' : 'none';
  for (let i = 0; i < 16; i++) { mark.fillStyle = (k >> (15 - i)) & 1 ? '#fff' : '#000'; mark.fillRect(i, 0, 1, 1); }
}

window.takeRender.onDraw((k, t) => {
  if (k === failAt) { window.takeRender.failed('no song'); return; }
  if (stallAt >= 0 && k >= stallAt) return;
  draw(k, t);
  window.takeRender.drawn(k);
});
draw(0, 0);
window.takeRender.ready();
