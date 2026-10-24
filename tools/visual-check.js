const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [], artifacts = [], tasks = [], counters = new Map();
window.progress = { rows };
Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
new PerformanceObserver((list) => tasks.push(...list.getEntries().map((e) => ({ at: e.startTime, ms: e.duration })))).observe({ type: 'longtask', buffered: true });
const proto = WebGL2RenderingContext.prototype, sources = new Map(), attached = new Map();
for (const method of ['shaderSource', 'attachShader', 'useProgram', 'drawArrays', 'texSubImage2D']) {
  const original = proto[method];
  proto[method] = function (...args) {
    const c = counters.get(this) || { used: [], uploads: 0 }; counters.set(this, c);
    if (method === 'shaderSource') sources.set(args[0], args[1]);
    if (method === 'attachShader') { const a = attached.get(args[0]) || []; a.push(args[1]); attached.set(args[0], a); }
    if (method === 'useProgram') c.program = args[0];
    if (method === 'drawArrays') c.used.push(c.program);
    if (method === 'texSubImage2D' && args.length === 9) c.uploads++;
    return original.apply(this, args);
  };
}
const engine = { tempo: { locked: true, bpm: 120, P: .5 }, bar: 0, silent: false, onsets: [], level: .03, v: { bd: { lastHit: { t: -99, s: 0 } } }, present: () => false, lastDrop: -99, stepAt: (t) => t * 8 };
const col = { bg: [0, 0, 0], fg: [255, 255, 255], ink: [80, 80, 80] };
const pixels = (canvas) => { const gl = canvas.getContext('webgl2'), data = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data); return data; };
const compare = (a, b) => { let max = 0, changed = 0; if (a.length !== b.length) throw new Error('different image sizes'); for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); max = Math.max(max, d); if (d) changed++; } return { max, changed }; };
const picture = (canvas, name) => artifacts.push({ name: name + '.png', data: canvas.toDataURL('image/png').split(',')[1] });
const saved = new Map();
try {
  // Frozen worlds, each real look shader fully settled, with identical seeded shot and uniforms.
  for (const variant of window.onlySea ? [] : ['before', 'after']) {
    const { createWorlds } = await import('../_checks/' + variant + '/renderer/worlds.js');
    const { LOOKS, onePart, blueNoise } = await import('../_checks/' + variant + '/renderer/worldlooks.js');
    const c = document.createElement('canvas'), words = document.createElement('canvas'); document.body.append(c, words);
    const world = createWorlds(c, words), info = { song: { title: 'check' }, lines: ['sound("bd")'], bar: 0, col };
    const start = performance.now(); let asked = 0;
    world.setLook('film');
    do { world.draw(10, engine, info); if (c.width > 1 && counters.get(c.getContext('webgl2'))?.used.length) break; await wait(20); if (performance.now() - start > 180000) throw new Error('world never drew'); } while (true);
    for (const look of LOOKS) {
      world.setLook(look.key); world.show('marble', 10); world.kick(1, 10, false, .5, false);
      const gl = c.getContext('webgl2'), target = look.frag ? (look.whole ? look.frag : onePart(look.frag)) : null;
      const at = performance.now();
      do {
        counters.get(gl).used.length = 0; world.draw(10, engine, info);
        const used = counters.get(gl).used.some((p) => attached.get(p)?.some((s) => sources.get(s) === target));
        if (!target || used) break;
        if (performance.now() - at > 120000) throw new Error('look never drew: ' + look.key);
        await wait(20);
      } while (true);
      const key = 'world-' + look.key.replaceAll(' ', '-'), data = pixels(c);
      if (variant === 'before') saved.set(key, data); else rows.push({ name: key, ...compare(saved.get(key), data) });
      picture(c, key + '-' + variant);
    }
    const times = []; for (let i = 0; i < 3; i++) { await wait(10); const at = performance.now(); blueNoise(64, 5); times.push(performance.now() - at); }
    rows.push({ name: variant + '-generator-ms', times });
    world.clear(); c.getContext('webgl2').getExtension('WEBGL_lose_context')?.loseContext(); c.remove(); words.remove();
  }
  // Simulate 120 Hz drawing against the 60 Hz water, including repeated timestamps, then resize
  // and a trip away from the sharks. Each compared frame comes from the real simulation/draw.
  for (const variant of ['before', 'after']) {
    let seed = 317; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const { createScenery } = await import('../_checks/' + variant + '/renderer/scenery.js');
    const c = document.createElement('canvas'); document.body.append(c); const api = createScenery(c);
    const args = { col, colours: 'own', offset: 0, strength: 1.5, scene: 'sharks', open: false };
    const at = performance.now();
    args.scene = 'lake';
    while (api.drawnScene !== 'lake') { api.draw(0, engine, args); await wait(20); if (performance.now() - at > 180000) throw new Error('lake never drew'); }
    args.scene = 'sharks';
    while (api.drawnScene !== 'sharks') { api.draw(0, engine, args); await wait(20); if (performance.now() - at > 180000) throw new Error('sharks never drew'); }
    // Warming may keep the prior scene up for a different number of frames. Freeze its clock,
    // then start the simulation afresh once both real programs are ready, with the same seed.
    api.clear(); seed = 317;
    const gl = c.getContext('webgl2'), ctr = counters.get(gl); ctr.uploads = 0;
    for (let frame = 0; frame < 360; frame++) {
      if (frame === 120 || frame === 240) { Object.defineProperty(window, 'innerWidth', { configurable: true, value: frame === 120 ? 608 : 1920 }); Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 }); }
      if (frame === 180) { args.scene = 'lake'; api.draw(10 + frame / 120, engine, args); if (api.drawnScene !== 'lake') throw new Error('away scene did not draw'); args.scene = 'sharks'; }
      api.draw(10 + frame / 120, engine, args);
      if (frame % 30 === 0 || frame === 121 || frame === 241) {
        const key = 'sharks-' + frame, data = pixels(c);
        if (variant === 'before') saved.set(key, data); else rows.push({ name: key, ...compare(saved.get(key), data) });
        picture(c, key + '-' + variant);
      }
      if (frame % 10 === 0) await wait(0);
    }
    rows.push({ name: variant + '-sea-uploads', uploads: ctr.uploads, frames: 360 });
    const gaps = []; let last = performance.now();
    for (let i = 0; i < 120; i++) { await new Promise(requestAnimationFrame); const now = performance.now(); gaps.push(now - last); last = now; api.draw(13 + i / 60, engine, args); }
    rows.push({ name: variant + '-raf', frames: 120, totalMs: gaps.reduce((a, b) => a + b, 0), maxMs: Math.max(...gaps) });
    gl.getExtension('WEBGL_lose_context')?.loseContext(); c.remove();
  }
  await wait(100); window.checkResult = { rows, tasks, noiseTimes: window.noiseTimes, artifacts };
} catch (err) { window.checkResult = { error: String(err), stack: err.stack, rows, tasks, artifacts }; }
