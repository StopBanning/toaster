// A hit's glow as a function of time.
//
// The old way was a number that jumped to its level on a hit and was multiplied by a fraction every frame:
//   pulse = Math.max(pulse, level);   ...   pulse *= Math.exp(-dt / tau);
// which is only right if the frames come at the rate it was tuned at, and which starts the fade at the first frame
// after the hit rather than at the hit. The same thing worked out from the hits themselves:
//   pulse(t) = the largest of  level * exp(-(t - hit time) / tau)  over the hits so far
// is what that loop computes with frames of no length, and it is the same at any frame rate, and the same when a frame
// is drawn again later. (A max of fades is the fade of the max: the loop and this agree exactly in the limit.)
//
//   const kicks = createPulses(0.15);    kicks.hit(0.8)  on a hit (at the clock's time, or give it);
//   kicks.at(t)                          its glow at t, 0 to the biggest level given.
import { clock } from './clock.js';

export function createPulses(tau, { keep = 12 } = {}) {
  let hits = [];
  return {
    hit(level = 1, t = clock.now()) {
      hits.push({ t, level });
      // (a hit's glow is a millionth of its level after `keep` time constants; a second of room for a draw that is behind)
      const old = t - keep * tau - 1;
      if (hits.length > 8 && hits[0].t < old) hits = hits.filter((h) => h.t >= old);
    },
    at(t) {
      let m = 0;
      for (let i = hits.length - 1; i >= 0; i--) {
        const age = t - hits[i].t;
        if (age < 0) continue;
        if (age > keep * tau) break;
        const v = hits[i].level * Math.exp(-age / tau);
        if (v > m) m = v;
      }
      return m;
    },
    // when the last hit was, and how hard (null: none yet)
    get last() { return hits.length ? hits[hits.length - 1] : null; },
    clear() { hits = []; },
  };
}
