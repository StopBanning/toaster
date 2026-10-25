// A linked program may still be compiling on ANGLE. Even asking for LINK_STATUS or a
// location then waits for it, so callers must poll ready() before using the program.
// Without the extension, keep the synchronous path used by these small renderers.
export function compileProgram(gl, vertex, fragment, attributes = []) {
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const shaders = [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]].map(([type, source]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  });
  const program = gl.createProgram();
  for (const shader of shaders) gl.attachShader(program, shader);
  for (const [index, name] of attributes) gl.bindAttribLocation(program, index, name);
  gl.linkProgram(program);
  let done = false, failure = null;
  const job = { program, ready() {
    if (done) { if (failure) throw failure; return true; }
    if (gl.isContextLost()) return false;
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) return false;
    const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
    const error = ok ? '' : gl.getProgramInfoLog(program);
    for (const shader of shaders) { gl.detachShader(program, shader); gl.deleteShader(shader); }
    done = true;
    if (!ok) { gl.deleteProgram(program); failure = new Error(error || 'Shader link failed'); throw failure; }
    return true;
  } };
  if (!parallel) job.ready();
  return job;
}
