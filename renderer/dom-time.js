// The page's CSS animations and transitions on the clock's time.
//
// A line of code flashes when it lands (a CSS animation), the caret blinks, the CRT's scanlines roll, a layer fades
// in: every one of those runs on the browser's own clock, in real time, whatever the clock says. Fine live. In render
// mode (clock.js: the page drawn again from a take, a frame at a time, as fast as it can, or slowly) a frame would
// show them wherever the real time happened to have got them. So in render mode the driver takes them over: each
// animation is paused, and set to the age it would have on the clock, the time since the clock first met it (the
// frame, or the tick, that made it start). What was running before the first drive, which only the page's own start
// can have begun, in real time, is met as new at that drive: how long the page took to start is not in the picture.
//
//   const drive = createAnimationDriver();   drive(t) after the page's state for time t is in place
//
// It also reaches animations made with element.animate() (they are in document.getAnimations() too).
//
// An element made between the driver's calls, at a time of its own (a step of a clock.simulate grid, run while a frame is
// drawn), says when with data-born="<clock time>" on it or an ancestor: its animations start then, not at the next call,
// which comes sooner at 60 frames a second than at 30 (fx.js's closing alert: the clock harness's drop-takeover-closing).
export function createAnimationDriver(doc = globalThis.document) {
  const met = new WeakMap(); // animation -> the clock time it started at
  let first = true; // (the first drive: what the page began by itself, in real time, before it, as the CRT's roll and flicker do at boot, begins now)
  return function drive(t) {
    if (!doc?.getAnimations) return 0;
    let n = 0;
    for (const a of doc.getAnimations()) {
      try {
        if (!met.has(a)) {
          const born = Number(a.effect?.target?.closest?.('[data-born]')?.dataset.born);
          met.set(a, Number.isFinite(born) && born <= t ? born : first ? t : t - (+a.currentTime || 0) / 1000);
        }
        if (a.playState === 'running') a.pause();
        a.currentTime = Math.max(0, (t - met.get(a)) * 1000);
        n++;
      } catch { /* one that went with its element, or that cannot be set: left to the browser */ }
    }
    first = false;
    return n;
  };
}
