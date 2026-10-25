// Installed before the app in its disposable measuring copy. No per-frame GL object logging:
// only first draw, blocking status queries, and bounded rAF samples for the active step.
(() => {
  const frames = [], queries = [], draws = [], renderers = [], kinds = new WeakMap();
  let phase = null, last = performance.now(), salt = Date.now() % 8000000;
  const proto = WebGL2RenderingContext.prototype;
  const create = proto.createShader, source = proto.shaderSource;
  proto.createShader = function (type) { const s = create.call(this, type); kinds.set(s, type); return s; };
  proto.shaderSource = function (shader, text) {
    if (kinds.get(shader) === this.FRAGMENT_SHADER) {
      const nonce = ++salt;
      text = text.replace('#version 300 es', '#version 300 es\n#define FIRST_USE_SALT ' + nonce)
        .replace(/void main\(\)\s*\{/, (m) => 'uniform highp int firstUseSalt;\n' + m + '\nif(firstUseSalt < -FIRST_USE_SALT) discard;');
    }
    return source.call(this, shader, text);
  };
  for (const name of ['getShaderParameter', 'getProgramParameter']) {
    const fn = proto[name];
    proto[name] = function (object, pname) {
      if (phase && window.firstUseHold && this.canvas.id === phase.canvas && pname === this.getExtension('KHR_parallel_shader_compile')?.COMPLETION_STATUS_KHR && performance.now() - phase.at < window.firstUseHold) return false;
      const at = performance.now(), answer = fn.call(this, object, pname), ms = performance.now() - at;
      if (phase && (pname === this.LINK_STATUS || pname === this.COMPILE_STATUS || ms > 2)) queries.push({ phase: phase.label, canvas: this.canvas.id, name, pname, at, ms });
      return answer;
    };
  }
  function drawn(gl) {
    if (!phase || phase.firstDraw !== null || gl.canvas.id !== phase.canvas) return;
    phase.firstDraw = performance.now();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    renderers.push({ phase: phase.label, canvas: gl.canvas.id, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown' });
    draws.push({ phase: phase.label, at: phase.firstDraw });
  }
  const plain = proto.drawArrays, instanced = proto.drawArraysInstanced;
  proto.drawArrays = function (mode, first, count) { const value = plain.call(this, mode, first, count); drawn(this); return value; };
  proto.drawArraysInstanced = function (mode, first, count, instances) { const value = instanced.call(this, mode, first, count, instances); drawn(this); return value; };
  function frame() {
    const now = performance.now();
    if (phase) frames.push({ phase: phase.label, start: last, end: now, ms: now - last });
    last = now; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.firstUseStats = {
    begin(label, canvas) { phase = { label, canvas, at: performance.now(), firstDraw: null }; last = phase.at; },
    finish() {
      const p = phase, rows = frames.filter((r) => r.phase === p.label);
      const result = { ...p, firstDrawMs: p.firstDraw === null ? null : p.firstDraw - p.at,
        first2sGapMs: Math.max(0, ...rows.filter((r) => r.start < p.at + 2000).map((r) => r.ms)),
        untilReadyGapMs: Math.max(0, ...rows.map((r) => r.ms)), frames: rows,
        queries: queries.filter((q) => q.phase === p.label), renderers: renderers.filter((r) => r.phase === p.label) };
      phase = null; return result;
    },
    get phase() { return phase; },
  };
})();
