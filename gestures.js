// Hand signs, while the camera is on: hold one up for a moment and it does something, so the show
// runs without the keyboard. ✌️ (two fingers up in a V): the next theme. 👍 (held a second): start
// or stop recording. ✊ (a raised fist): hush, every part muted and the picture dimmed, the way
// Strudel's hush() stops everything. 🖐 (an open hand): back from the hush. Each fires once a
// hold, and nothing fires while the finger frame is open (its pointing hands match none of these).
// A finger's bend is judged in 3D (MediaPipe's world points keep the hand's shape whichever way it
// faces); which way things point, on screen. Points: 0 wrist, 2/3/4 the thumb's knuckle, joint and
// tip, 5/6/8 the index's knuckle, middle joint and tip, then the middle, ring and little fingers.
const HOLD = { peace: 0.6, thumb: 1, fist: 0.8, open: 0.6 }; // seconds to hold each before it counts
const GAP = 0.3; // a hold survives the tracker losing the hand this long

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const reach = (v, i, from) => Math.hypot(v[i][0] - v[from][0], v[i][1] - v[from][1], (v[i][2] || 0) - (v[from][2] || 0));
const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]]; // index, middle, ring, little: tip, middle joint
// Straight: the tip well beyond the middle joint, seen from the wrist (about 1.35 straight, 1.2
// for a relaxed hand's half-bent fingers). Curled: the tip come back nearer the wrist than the
// middle joint is (about 0.6 in a fist).
const straight = (v, [tip, joint]) => reach(v, tip, 0) > reach(v, joint, 0) * 1.25;
const curled = (v, [tip, joint]) => reach(v, tip, 0) < reach(v, joint, 0) * 0.95;

// Which sign one hand is making, or null. P: its points on screen; v: in 3D (or P again);
// near: how big a hand has to be on screen to count (smaller is too far off, or someone behind);
// raised: the wrist in the top 60% of the camera's picture (a fist lower down is more likely a
// chin resting on it than a sign).
function read(P, v, near, raised) {
  const size = Math.max(dist(P[0], P[9]), dist(P[5], P[17]) * 1.3);
  if (size < near) return null;
  const [index, middle, ring, little] = FINGERS;
  const fist = FINGERS.every((f) => curled(v, f));
  // 👍 the thumb straight (its tip far past its joint, from its knuckle) and pointing up, its tip
  // the top of the hand; the hand can face any way
  const thumbOut = reach(v, 4, 2) > reach(v, 3, 2) * 1.5;
  const top = Math.min(...P.map((p, i) => (i === 4 || i === 3 ? Infinity : p[1])));
  if (fist && thumbOut && P[4][1] < P[3][1] && P[3][1] < P[2][1] && top - P[4][1] > 0.3 * size) return 'thumb';
  // the rest are held up: the knuckles above the wrist, the palm not end-on to the camera
  const palm = dist(P[0], P[9]);
  if (!(palm > 0.4 * size && P[0][1] - P[9][1] > 0.5 * palm)) return null;
  if (fist && raised && P[4][1] > P[5][1] - 0.2 * size) return 'fist';
  if (straight(v, index) && straight(v, middle) && curled(v, ring) && curled(v, little)) return 'peace';
  if (FINGERS.every((f) => straight(v, f))) return 'open';
  return null;
}

export function createGestures() {
  let held = null, since = 0, seen = 0, fired = false, rest = 0;
  return {
    // hands: from the tracker; place(x, y): a camera point on screen; busy: the finger frame is
    // open; wanted: the signs that would do something now. Returns a sign the moment it has been
    // held long enough (once a hold), else null.
    update(t, hands, place, busy, wanted) {
      if (busy) { held = null; return null; }
      let now = null;
      const near = 0.06 * Math.min(innerWidth, innerHeight);
      const signs = new Set(hands.map((hd) => {
        const P = hd.points.map(([x, y]) => place(x, y));
        const s = read(P, hd.world || P, near, hd.points[0][1] < 0.6);
        return wanted.includes(s) ? s : null;
      }));
      signs.delete(null);
      if (signs.size === 1) [now] = signs; // two hands making different signs: neither
      // both hands in raised fists is a flex, not a hush (it set the hush off by accident in a
      // video of flexing for the camera, Oct 15): one fist up hushes
      if (now === 'fist' && hands.length > 1 && hands.every((hd) => read(hd.points.map(([x, y]) => place(x, y)), hd.world || hd.points.map(([x, y]) => place(x, y)), 0, hd.points[0][1] < 0.6) === 'fist')) now = null;
      if (now && now === held) seen = t;
      else if (now) { held = now; since = seen = t; fired = false; }
      else if (held && t - seen > GAP) held = null;
      if (!held || fired || t < rest || t - since < HOLD[held]) return null;
      fired = true;
      rest = t + 1.5; // and then a moment before the next, so one move can't set off two
      return held;
    },
    // the sign being held that hasn't fired yet (for a hint), or null
    get holding() { return held && !fired ? held : null; },
    reset() { held = null; fired = false; },
  };
}

export { read as readSign };
