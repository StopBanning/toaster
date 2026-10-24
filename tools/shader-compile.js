import config from '../_checks/shader-variants.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
const par = gl?.getExtension('KHR_parallel_shader_compile');
const bare = (s) => s.replace(/\/\/[^\n]*/g, '');

// A used, always-false guard survives preprocessing and keeps both driver and browser caches cold.
// The define alone could disappear before the driver sees it. benchSalt is never set (zero).
const salt = (s, id) =>
  s
    .replace('#version 300 es', '#version 300 es\n#define COLD_SALT ' + id)
    .replace('void main()', 'uniform highp int benchSalt;\nvoid main()')
    .replace(/void main\(\)\s*\{/, (m) => m + '\nif (benchSalt < -COLD_SALT) discard;');

async function compile(prog, id) {
  const p = gl.createProgram();
  const vsText = prog.bare ? bare(prog.vs) : prog.vs;
  const fsRaw = prog.bare ? bare(prog.fs) : prog.fs;
  const fsText = salt(fsRaw, id);
  for (const [kind, text] of [
    [gl.VERTEX_SHADER, vsText],
    [gl.FRAGMENT_SHADER, fsText],
  ]) {
    const s = gl.createShader(kind);
    gl.shaderSource(s, text);
    gl.compileShader(s);
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  gl.bindAttribLocation(p, 0, 'a');
  gl.bindAttribLocation(p, 0, 'aPos');
  const at = performance.now();
  gl.linkProgram(p);
  while (!gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR)) await wait(5);
  const ms = performance.now() - at;
  const ok = gl.getProgramParameter(p, gl.LINK_STATUS);
  const error = ok ? null : gl.getProgramInfoLog(p);
  gl.deleteProgram(p);
  return { ms, ok, error };
}

try {
  if (!par) throw new Error('KHR_parallel_shader_compile is required for this measurement');
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  window.progress = { rows: [], gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown' };

  const { variants, variantOrder, repeats, names } = config;
  const allNames = Object.keys(variants[variantOrder[0]]);
  const programNames = names.length ? names.filter((n) => allNames.includes(n)) : allNames;

  let id = Date.now() % 8000000;
  for (const name of programNames) {
    for (let repeat = 0; repeat < repeats; repeat++) {
      const order = repeat % 2 ? [...variantOrder].reverse() : variantOrder;
      for (const variant of order) {
        const prog = variants[variant][name];
        const result = await compile(prog, ++id);
        window.progress.rows.push({ name, variant, repeat, salt: id, ...result });
        console.log(`[shader-compile] ${name} ${variant} #${repeat}: ${result.ms.toFixed(1)}ms ok=${result.ok}`);
        if (!result.ok) throw new Error(name + ' (' + variant + '): ' + result.error);
        await wait(50);
      }
    }
  }
  window.checkResult = window.progress;
} catch (err) {
  window.checkResult = { error: String(err?.stack || err), partial: window.progress };
}
