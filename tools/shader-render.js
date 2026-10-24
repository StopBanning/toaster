import config from '../_checks/render-config.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
const worldRows = [];
const lookRows = [];
const artifacts = [];
window.progress = { rows, worldRows, lookRows };

// Replay the real frame's GL commands, with the uniforms frozen, so CPU simulation or a changing
// fish's position cannot masquerade as a different shader cost. No drawing code is reimplemented.
let capture = null;
const originals = {};
for (const name of Object.getOwnPropertyNames(WebGL2RenderingContext.prototype).filter((n) =>
  /^(bind|uniform|useProgram|activeTexture|pixelStorei|tex|draw|copy|clear|viewport|enable|disable|blend|scissor)/.test(n),
)) {
  const fn = Object.getOwnPropertyDescriptor(WebGL2RenderingContext.prototype, name).value;
  if (typeof fn !== 'function') continue;
  originals[name] = fn;
  WebGL2RenderingContext.prototype[name] = function (...args) {
    if (capture?.gl === this) {
      capture.commands.push([name, args.map((a) => (ArrayBuffer.isView(a) ? a.slice() : a))]);
    }
    return fn.apply(this, args);
  };
}

const SCENES = [
  'lake', 'sea', 'fire', 'snow', 'city', 'garden', 'falls',
  'halloween', 'sharks', 'festival', 'koi', 'basement', 'space',
];
const eng = {
  tempo: { locked: true, bpm: 120, P: 0.5 },
  bar: 0,
  silent: false,
  onsets: [],
  level: 0.03,
  v: { bd: { lastHit: { t: -99, s: 0 } } },
  present: () => false,
  lastDrop: -99,
  stepAt: (t) => t * 8,
  fastDb: new Float32Array(64).fill(-50),
  hzFast: 20,
};

Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });

const colours = (day) =>
  day
    ? { bg: [248, 247, 241], fg: [24, 31, 51], ink: [70, 75, 88] }
    : { bg: [3, 5, 10], fg: [248, 244, 220], ink: [80, 80, 80] };

async function runReplayTiming(gl, ext, commands) {
  const replay = () => {
    for (const [name, args] of commands) originals[name].apply(gl, args);
  };
  for (let i = 0; i < 100; i++) replay();
  if (gl.getError() !== gl.NO_ERROR) throw new Error('GL error during frame replay');
  gl.finish();
  const query = ext && gl.createQuery();
  if (ext) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
  const at = performance.now();
  for (let i = 0; i < 300; i++) replay();
  if (ext) {
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    gl.flush();
  } else {
    gl.finish();
  }
  let ms = (performance.now() - at) / 300;
  if (ext) {
    const deadline = performance.now() + 10000;
    while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
      if (performance.now() > deadline) throw new Error('GPU query did not finish');
      await wait(5);
    }
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) throw new Error('GPU timer disjoint');
    ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / 300;
    gl.deleteQuery(query);
  }
  return ms;
}

async function sceneryInstance(variant, scene) {
  window.progress.stage = `${scene} ${variant} warming`;
  const { createScenery } = await import(`../_checks/${variant}/renderer/scenery.js`);
  let seed = 317;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const c = document.createElement('canvas');
  document.body.append(c);
  const api = createScenery(c);
  const draw = (t, day = false, theme = false) => {
    Math.random = random;
    api.draw(t, eng, { col: colours(day), colours: theme ? 'theme' : 'own', offset: 0, strength: 1.5, scene, open: false });
  };
  const start = performance.now();
  while (api.drawnScene !== scene) {
    draw(0);
    await wait(20);
    if (performance.now() - start > 180000) throw new Error(`${scene} never drew`);
  }
  const gl = c.getContext('webgl2');
  const pixels = () => {
    const bytes = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return bytes;
  };
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const commands = [];
  const captureFrame = (time, day, theme) => {
    commands.length = 0;
    capture = { gl, commands };
    draw(time, day, theme);
    capture = null;
  };
  captureFrame(42, false, false);
  const timing = () => runReplayTiming(gl, ext, commands);
  return {
    draw,
    pixels,
    timing,
    captureFrame,
    method: ext ? 'GPU query' : 'finish wall time',
    c,
    close() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      c.remove();
    },
  };
}

async function sceneryPair(scene, cells = false) {
  window.forceCells = cells;
  const a = await sceneryInstance('before', scene);
  const b = await sceneryInstance('after', scene);
  const pixels = [];
  for (const time of [10, 20, 40]) {
    for (const day of [false, true]) {
      for (const theme of [false, true]) {
        a.draw(time, day, theme);
        const x = a.pixels();
        b.draw(time, day, theme);
        const y = b.pixels();
        let max = 0;
        let changed = 0;
        for (let i = 0; i < x.length; i++) {
          const d = Math.abs(x[i] - y[i]);
          if (d > max) max = d;
          if (d) changed++;
        }
        pixels.push({ time, day, theme, max, changed });
        console.log(`[shader-render] scenery:${scene}${cells ? '(cells)' : ''} t=${time} day=${day} theme=${theme} max=${max} changed=${changed}`);
      }
    }
  }
  a.captureFrame(42, false, false);
  b.captureFrame(42, false, false);
  const gpu = { before: [], after: [], method: a.method, time: 42, day: false, theme: false };
  if (!config.pixelsOnly) {
    for (let r = 0; r < config.batches; r++) {
      for (const [name, ins] of r % 2 ? [['after', b], ['before', a]] : [['before', a], ['after', b]]) {
        gpu[name].push(await ins.timing());
      }
    }
    console.log(`[shader-render] scenery:${scene} gpu before=${gpu.before.map((v) => v.toFixed(4)).join(',')} after=${gpu.after.map((v) => v.toFixed(4)).join(',')}`);
  }
  rows.push({ scene, cells, pixels, gpu, width: a.c.width, height: a.c.height });
  a.close();
  b.close();
  await wait(50);
}

async function measureWorlds() {
  // Track which shader programs were used on a context
  const proto = WebGL2RenderingContext.prototype;
  const sources = new Map();
  const attached = new Map();
  const usedProgs = new Map();
  const origShaderSource = proto.shaderSource;
  const origAttachShader = proto.attachShader;
  const origUseProgram = proto.useProgram;
  const origDrawArrays = proto.drawArrays;
  proto.shaderSource = function (s, src) {
    sources.set(s, src);
    return origShaderSource.call(this, s, src);
  };
  proto.attachShader = function (p, s) {
    const arr = attached.get(p) || [];
    arr.push(s);
    attached.set(p, arr);
    return origAttachShader.call(this, p, s);
  };
  proto.useProgram = function (p) {
    const st = usedProgs.get(this) || { current: null, drawn: [] };
    st.current = p;
    usedProgs.set(this, st);
    return origUseProgram.call(this, p);
  };
  proto.drawArrays = function (...args) {
    const st = usedProgs.get(this);
    if (st?.current) st.drawn.push(st.current);
    return origDrawArrays.apply(this, args);
  };

  async function worldInstance(variant) {
    const { createWorlds } = await import(`../_checks/${variant}/renderer/worlds.js`);
    const { LOOKS, onePart } = await import(`../_checks/${variant}/renderer/worldlooks.js`);
    const c = document.createElement('canvas');
    const words = document.createElement('canvas');
    document.body.append(c, words);
    const world = createWorlds(c, words);
    const info = { song: { title: 'check', artist: 'toaster' }, lines: ['sound("bd")'], bar: 0, col: colours(false) };
    const start = performance.now();
    world.setLook('film');
    while (true) {
      world.draw(10, eng, info);
      const gl = c.getContext('webgl2');
      if (c.width > 1 && usedProgs.get(gl)?.drawn.length) break;
      await wait(20);
      if (performance.now() - start > 180000) throw new Error(`worlds (${variant}) never drew`);
    }
    const gl = c.getContext('webgl2');
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const pixels = () => {
      const data = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    };
    const ensureLookReady = async (look) => {
      const target = look.frag ? (look.whole ? look.frag : onePart(look.frag)) : null;
      const at = performance.now();
      while (true) {
        usedProgs.get(gl).drawn.length = 0;
        world.draw(10, eng, info);
        const used = usedProgs.get(gl).drawn.some((p) => attached.get(p)?.some((s) => sources.get(s) === target));
        if (!target || used) break;
        if (performance.now() - at > 120000) throw new Error(`look never drew (${variant}): ${look.key}`);
        await wait(20);
      }
    };
    const commands = [];
    const captureFrame = (t) => {
      commands.length = 0;
      capture = { gl, commands };
      world.draw(t, eng, info);
      capture = null;
    };
    const timing = () => runReplayTiming(gl, ext, commands);
    return {
      world,
      LOOKS,
      info,
      gl,
      c,
      pixels,
      ensureLookReady,
      captureFrame,
      timing,
      method: ext ? 'GPU query' : 'finish wall time',
      close() {
        world.clear();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        c.remove();
        words.remove();
      },
    };
  }

  const a = await worldInstance('before');
  const b = await worldInstance('after');

  const compare = (x, y) => {
    let max = 0;
    let changed = 0;
    for (let i = 0; i < x.length; i++) {
      const d = Math.abs(x[i] - y[i]);
      if (d > max) max = d;
      if (d) changed++;
    }
    return { max, changed };
  };

  // 1. Check all 13 looks at fixed shot ('marble'), fixed time (10), and fixed grain frame (17)
  const looksToRun = config.onlyLooks.length
    ? a.LOOKS.filter((l) => config.onlyLooks.includes(l.key) || config.onlyLooks.includes(l.name))
    : a.LOOKS;

  for (const look of looksToRun) {
    a.world.setLook(look.key);
    b.world.setLook(look.key);
    a.world.show('marble', 10);
    b.world.show('marble', 10);
    a.world.kick(1, 10, false, 0.5, false);
    b.world.kick(1, 10, false, 0.5, false);
    await a.ensureLookReady(look);
    await b.ensureLookReady(look);
    // Reset to identical deterministic state after look is settled
    a.world.setLook(look.key);
    b.world.setLook(look.key);
    a.world.show('marble', 10);
    b.world.show('marble', 10);
    a.world.kick(1, 10, false, 0.5, false);
    b.world.kick(1, 10, false, 0.5, false);
    a.captureFrame(10);
    const pxA = a.pixels();
    b.captureFrame(10);
    const pxB = b.pixels();
    const diff = compare(pxA, pxB);

    const gpu = { before: [], after: [], method: a.method };
    if (!config.pixelsOnly) {
      for (let r = 0; r < config.batches; r++) {
        for (const [name, ins] of r % 2 ? [['after', b], ['before', a]] : [['before', a], ['after', b]]) {
          gpu[name].push(await ins.timing());
        }
      }
    }
    lookRows.push({ look: look.key, label: look.label, ...diff, gpu });
    console.log(`[shader-render] look:${look.key} max=${diff.max} changed=${diff.changed} gpuBefore=${gpu.before[0]?.toFixed(4)} gpuAfter=${gpu.after[0]?.toFixed(4)}`);
  }

  // 2. Check all world materials (under 'film' look) to verify every material in WORLD is pixel-exact
  const allWorlds = ['dawn', ...a.world.names];
  const worldsToCheck = config.onlyWorlds.length
    ? allWorlds.filter((w) => config.onlyWorlds.includes(w))
    : allWorlds;
  a.world.setLook('film');
  b.world.setLook('film');
  for (const wKey of worldsToCheck) {
    const over = {
      horizon: 0.62,
      lift: 0.01,
      curve: 1.0,
      zoom: 1.0,
      angle: 0.2,
      t: 15.0,
      fore: 0.5,
      stars: 0.004,
      v: 1,
      seed: 42.5,
      band: { x: 0.1, tilt: 0.4, core: 120, k: 0.9 },
    };
    a.world.show(wKey, 10, over);
    b.world.show(wKey, 10, over);
    a.world.draw(10.5, eng, a.info);
    b.world.draw(10.5, eng, b.info);
    const diff = compare(a.pixels(), b.pixels());
    worldRows.push({ world: wKey, ...diff });
    if (diff.max !== 0) console.error(`[shader-render] world:${wKey} max=${diff.max} changed=${diff.changed}`);
  }
  console.log(`[shader-render] checked ${worldRows.length} worlds, maxDiff=${Math.max(0, ...worldRows.map((r) => r.max))}`);

  a.close();
  b.close();
}

try {
  if (config.mode === 'scenery' || config.mode === 'both') {
    const scenes = config.onlyScenes.length ? SCENES.filter((s) => config.onlyScenes.includes(s)) : SCENES;
    for (const scene of scenes) {
      await sceneryPair(scene, false);
    }
    if (!config.noFallback && (!config.onlyScenes.length || config.onlyScenes.includes('koi'))) {
      await sceneryPair('koi', true);
    }
  }
  if (config.mode === 'worlds' || config.mode === 'both') {
    await measureWorlds();
  }
  window.checkResult = { rows, worldRows, lookRows, artifacts };
} catch (err) {
  window.checkResult = { error: String(err), stack: err.stack, rows, worldRows, lookRows, artifacts };
}
