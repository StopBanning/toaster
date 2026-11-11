// The WebGL pictures against the browser's limit. A page may keep only so many WebGL contexts alive (Chromium: 16 on a
// computer, 8 on a phone); one more and the browser kills the oldest, and whatever drew with it goes black. Toaster has
// about twenty (each background, the looks, the orb, the glass, the camera's effects), each made the first time it is
// shown and, until now, kept for good: a visitor who tried most of the backgrounds lost the first ones. The desktop app
// raises the limit (main.js); a browser can't.
//
// So the pictures take turns. Measured in a blank window (Nov 10, Chromium 152; backlog/ENGINEERING-NOV10.md):
//   - a context given up by hand (WEBGL_lose_context's loseContext) no longer counts against the limit;
//   - taking it back (restoreContext) counts as making a new one, and works: the canvas gets webglcontextrestored and
//     draws again; so does one the browser killed, as long as the extension was asked for while it lived.
// The pool hears of every WebGL context as it is made (watch, below) and keeps the extension for each. Before one is made
// or taken back, while the page is at its budget, the layer that is off (its canvas hidden) and was shown longest ago
// gives its context up. A layer that is shown again and finds its context gone takes it back, and its own
// webglcontextrestored handler builds its picture again, as after any loss.
//
// A canvas that isn't in the page (the handheld's warp) can't be seen to be off, so it is never asked to give up.

// budget: how many may be alive at once. now(): seconds. Plain logic over what a canvas and a context offer
// (canvas.isConnected, canvas.hidden, gl.isContextLost(), the extension's loseContext / restoreContext), so the tests run
// it on stand-ins.
export function createGlPool({ budget = 12, now = () => performance.now() / 1000 } = {}) {
  const all = []; // { canvas (a WeakRef), gl, ext, seen, parked, returning, askedAt }
  // (one on its way back holds its place from the ask: the browser counts it at once and says so a moment later)
  const live = (e) => e.returning || (!e.parked && !e.gl.isContextLost());
  const off = (c) => c.isConnected && c.hidden;
  const sweep = () => { for (let i = all.length - 1; i >= 0; i--) if (!all[i].canvas.deref()) all.splice(i, 1); };
  const pool = {
    budget, parks: 0, returns: 0,
    get alive() { return all.filter(live).length; },
    get known() { return all.length; },
    // Room for one more: the layers that are off give theirs up, the one shown longest ago first. With every layer on
    // screen there is nothing to give, and the browser's own limit decides, as it always did.
    room() {
      sweep();
      while (all.filter(live).length >= pool.budget) {
        const idle = all.filter((e) => live(e) && e.ext && off(e.canvas.deref())).sort((a, b) => a.seen - b.seen)[0];
        if (!idle) return false;
        idle.parked = true; idle.returning = false; pool.parks++;
        idle.ext.loseContext();
      }
      return true;
    },
    // A context just made on this canvas (again for one already known: nothing).
    adopt(canvas, gl) {
      if (!gl || all.some((e) => e.gl === gl)) return;
      all.push({ canvas: new WeakRef(canvas), gl, ext: gl.getExtension('WEBGL_lose_context'), seen: now(), parked: false, returning: false, askedAt: -Infinity });
    },
    // Once a frame, after the layers are switched on and off: a layer that is on notes the time, and one that is on with
    // its context gone (given up here, or killed by the browser) takes it back. Asked once a second at most: the browser
    // answers with webglcontextrestored a moment later, and brings back by itself one it lost with the graphics driver.
    tend() {
      const t = now();
      for (const e of all) {
        const c = e.canvas.deref();
        if (!c || off(c)) continue;
        e.seen = t;
        if (!e.gl.isContextLost()) { e.parked = e.returning = false; continue; }
        if (!e.ext || t - e.askedAt < 1) continue;
        e.askedAt = t;
        e.parked = true; e.returning = false; // (not counted while it's gone, so the room made is for it)
        pool.room();
        try { e.ext.restoreContext(); e.returning = true; pool.returns++; } catch {}
      }
    },
  };
  return pool;
}

// Tells the pool of every WebGL context the page makes, by standing in front of getContext: room is made before a canvas's
// first WebGL context, and the context is adopted after. Everything else about getContext is as it was.
export function watch(pool, proto) {
  const make = proto.getContext;
  const known = new WeakSet();
  proto.getContext = function getContext(kind, ...rest) {
    const webgl = kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl';
    if (webgl && !known.has(this)) pool.room();
    const ctx = make.call(this, kind, ...rest);
    if (webgl && ctx && !known.has(this)) { known.add(this); pool.adopt(this, ctx); }
    return ctx;
  };
  return () => { proto.getContext = make; };
}

// How many the page may keep: the desktop app has raised Chromium's limit to 32 (main.js), a browser on a computer allows
// 16 and on a phone 8; a few are left spare for what the pool can't see.
export const glBudget = ({ app, touch }) => (app ? 28 : touch ? 6 : 12);
