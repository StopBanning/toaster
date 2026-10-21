// Release check: does anything freeze the first time it's shown? A shader is compiled the first
// time it's used, and on Windows a big one can hold the whole app up for seconds; the compiled
// shaders are cached on disk afterwards, so a copy that's already shown everything never shows the
// problem. So run this against a copy with a fresh profile (an empty cache), as every user's copy
// is the first time they open an update.
//
// It reloads the window, then shows every background (V) and every scenery scene in turn, each
// for 2 seconds, and reports the longest gap between frames after each switch. A second round
// shows the same with everything compiled. Fails (exit code 1) if any switch held up longer than
// the limit. Stops first (exit code 2) if the window isn't drawing with the graphics card: with no
// GPU to use (a driver update half done, a remote desktop) Chrome draws on the processor instead,
// and every number here would be the processor's.
//
//   node tools/hitch.mjs [port] [limit ms]     (port 9333 by default, limit 250)
//
// Before a release: build, make the ToasterTest copy (its own settings folder), delete its
// settings folder (%APPDATA%\ToasterTest) so its shader cache is empty, start it with
// --remote-debugging-port, run this against that port; delete the folder and run it once more
// (a first run on a fresh profile can show one slow switch while the compiler itself loads).
const port = process.argv[2] || 9333;
const limit = +(process.argv[3] || 250);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('index.html'));
if (!page) throw new Error('No app window found on port ' + port);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map(), errors = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description?.slice(0, 200));
};
const send = (method, params = {}) => new Promise((resolve) => { const id = ++nextId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Runtime.enable');
await send('Page.reload', { ignoreCache: true });
for (let i = 0; i < 80; i++) { await sleep(250); try { if (await evaluate('!!(window.__nc && __nc.eng)')) break; } catch {} }
await sleep(1500);
const version = await evaluate('window.nc?.version?.()');
// what draws the WebGL: the graphics card, or a software stand-in (Microsoft's WARP, SwiftShader)
const renderer = await evaluate(`(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return name;
})()`);
if (/Basic Render|WARP|SwiftShader|llvmpipe|Software/i.test(renderer)) {
  console.log(`Toaster ${version}: WebGL is drawing on the processor, not the graphics card (${renderer}).`);
  console.log('Nothing measured: get the GPU back first (after a driver update, a restart), then run this again.');
  ws.close();
  process.exit(2);
}

// everything to show: each background but the scenery, then the scenery's scenes
// (the backgrounds' names from the V button, one index at a time till they run out)
const visuals = await evaluate(`(() => { const out = []; for (let i = 0; i < 40; i++) { __nc.setVisual(i); const name = document.getElementById('b-visual')?.textContent?.replace(/[^a-z ]/gi, '').trim(); if (!name || name === 'undefined' || out.some((o) => o.name === name)) break; out.push({ i, name }); } __nc.setVisual(0); return out; })()`);
const steps = [];
for (const v of visuals) if (!/scenery/i.test(v.name)) steps.push({ label: v.name || `visual ${v.i}`, js: `__nc.setVisual(${v.i})` });
const scenery = visuals.find((v) => /scenery/i.test(v.name));
for (const scene of ['lake', 'sea', 'fire', 'snow', 'city', 'garden', 'falls', 'halloween', 'sharks']) {
  steps.push({ label: `scenery: ${scene}`, js: `(__nc.state.sceneryScene = ${JSON.stringify(scene)}, __nc.state.sceneryTheme = false, __nc.setVisual(${scenery ? scenery.i : 9}))` });
}

// one switch: the longest gap between frames in the 2 s after it
const show = (js) => evaluate(`new Promise((done) => {
  const gaps = []; let last = performance.now(); const t0 = last;
  ${js};
  const f = () => { const now = performance.now(); gaps.push(now - last); last = now; if (now - t0 < 2000) requestAnimationFrame(f); else done(Math.round(Math.max(...gaps))); };
  requestAnimationFrame(f);
})`);

console.log(`Toaster ${version}, limit ${limit} ms, on ${renderer}`);
let worst = 0;
for (const round of [1, 2]) {
  const row = [];
  for (const s of steps) {
    const ms = await show(s.js);
    if (round === 1) worst = Math.max(worst, ms);
    row.push(`${s.label} ${ms}${ms > limit ? ' !!' : ''}`);
  }
  console.log(`${round === 1 ? 'first time' : 'again     '}: ${row.join(' | ')}`);
}
await evaluate(`(() => { __nc.state.sceneryScene = 'auto'; __nc.setVisual(0); return 1; })()`);
console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' || ') : 'page errors: none');
console.log(worst > limit ? `FAIL: a switch held up ${worst} ms (limit ${limit})` : `ok: the longest hold-up was ${worst} ms`);
ws.close();
process.exit(worst > limit || errors.length ? 1 : 0);
