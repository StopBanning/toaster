// Steadier hands. The tracker's points shimmer by a pixel or two from one look to the next even
// while a hand is held still, enough to make the finger frame's corners wobble and a sign sit on
// the edge of being read. Each point goes through a One Euro filter (Casiez, Roussel and Vogel,
// 2012): a smoothing whose strength falls as the point speeds up, so a still hand is held steady
// and a moving one isn't dragged behind.

// One number's filter. minCutoff: how smooth when still (Hz, lower is smoother); beta: how fast the
// smoothing lets go as it speeds up. Returns (x, dt in seconds) => the smoothed x.
export function euro(minCutoff, beta, dCutoff = 1) {
  let x0 = null, dx0 = 0;
  const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
  return (x, dt) => {
    if (x0 === null || !(dt > 0)) { x0 = x; dx0 = 0; return x; }
    dx0 += alpha(dCutoff, dt) * ((x - x0) / dt - dx0);
    x0 += alpha(minCutoff + beta * Math.abs(dx0), dt) * (x - x0);
    return x0;
  };
}

// For the hands from the tracker (points on the camera's 0-1 frame): each hand is followed from one
// look to the next by where its wrist is (the tracker lists them in no set order), and its points
// smoothed; a hand that's new, or was lost, starts afresh. Tuned on made-up looks at the tracker's
// pace with its shimmer (2 px of the 640 it looks at): held still, that drops to about 0.7 px;
// crossing the picture in a second, the hand is about 7 px (20 ms) behind. Returns (hands, t in
// ms) => the hands, smoothed.
export function createHandSmoother(minCutoff = 0.7, beta = 12) {
  let tracks = [];
  return (hands, t) => {
    const taken = [];
    const out = hands.map((hd) => {
      const [wx, wy] = hd.points[0];
      let track = null, nearest = 0.15;
      for (const tr of tracks) {
        const d = Math.hypot(tr.wrist[0] - wx, tr.wrist[1] - wy);
        if (d < nearest && !taken.includes(tr)) { nearest = d; track = tr; }
      }
      const dt = track ? (t - track.at) / 1000 : 0;
      track ||= { filters: hd.points.map(() => [euro(minCutoff, beta), euro(minCutoff, beta)]) };
      track.at = t;
      taken.push(track);
      const points = hd.points.map(([x, y], i) => [track.filters[i][0](x, dt), track.filters[i][1](y, dt)]);
      track.wrist = points[0];
      return { ...hd, points };
    });
    tracks = taken;
    return out;
  };
}
