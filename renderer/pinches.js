// The pinches that bring a new look while the camera's window (portal.js) is open, apart from the portal so the tests can
// run them without a page.

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// The pinches that bring a new look while a window is open. A pinch counts once thumb and index have stayed together for
// a moment (0.2 s without a break): relaxed fingers drift across the line all the time, and counting every touch made
// the looks flip every half second (Colin's recording, Oct 31). After a pinch's look, none for a second: a pinch that counts
// in that second brings nothing, then or later (two hands pinching together bring one look). A pinch is let go
// once thumb and index are well apart (0.6 of the hand's size), or once it hasn't been seen for 0.3 s; until then it's the
// same pinch, and it brings one look at most. With both hands seen, a hand letting go forgets only its own pinch.
// update(t, hands: [{ p (between thumb and index), s (the hand's size), pinched, open (thumb to index over size), who
// (0 or 1 with two hands, else -1) }]): the point the new look spreads from, or null.
export function createPinches({ hold = 0.2, gap = 1, release = 0.6 } = {}) {
  let held = [], at = -9;
  return {
    update(t, hands) {
      let go = null;
      for (const h of hands) {
        if (!h.pinched) {
          if (h.open > release) held = held.filter((q) => (q.who >= 0 && h.who >= 0 && q.who !== h.who) || dist(q.p, h.p) > h.s);
          else for (const q of held) if (dist(q.p, h.p) < h.s) q.since = null; // (a break: the moment starts again)
          continue;
        }
        let q = held.find((o) => dist(o.p, h.p) < h.s);
        if (!q) held.push(q = { since: null, done: false, who: h.who });
        if (q.since === null) q.since = t;
        q.p = h.p; q.t = t;
        if (!q.done && t - q.since >= hold) {
          q.done = true; // (counted now, look or not: a pinch never brings a look later, out of the blue)
          if (!go && t - at >= gap) { at = t; go = h.p; }
        }
      }
      held = held.filter((q) => t - q.t < 0.3);
      return go;
    },
    reset() { held = []; at = -9; },
  };
}
