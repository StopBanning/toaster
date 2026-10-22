// The hand log (Ctrl+Shift+H, on and off; not in the help): what the tracker makes of your hands,
// for tuning the hand features on real hands. Numbers only, never a picture: every look, each
// hand's 21 points as the tracker gives them (held steady, in the camera's own 0-1 frame, not
// mirrored); where the camera's picture is on screen; and what the portal, the finger frame and
// the hand signs are doing, whenever that changes. A line of JSON each, written every few seconds
// to a file in the settings folder's "hand logs" (so a log survives the app closing). It stops by
// itself after an hour.
const r4 = (x) => Math.round(x * 1e4) / 1e4;

export function createHandLog(nc = window.nc) {
  let on = false, t0 = 0, sentAt = 0, lines = [], last = null, had = 0, was = {};
  const put = (t, o) => lines.push(JSON.stringify({ t: +(t - t0).toFixed(3), ...o }));
  const send = () => { if (lines.length) { nc.handLogAdd(lines.join('\n') + '\n'); lines = []; } };
  return {
    get on() { return on; },
    // on, or off; the file it writes to (or wrote), or null where there's none (in a browser)
    async toggle(t) {
      if (on) { on = false; send(); return nc.handLogStop(); }
      if (!nc?.handLogStart) return null;
      const file = await nc.handLogStart();
      on = true; t0 = t; sentAt = t; lines = []; last = null; had = 0; was = {};
      put(t, { started: new Date().toISOString(), screen: [innerWidth, innerHeight], dpr: devicePixelRatio });
      return file;
    },
    // each frame while the camera is on: the tracker's hands; place(x, y): a camera point on
    // screen; rect: the camera's picture on screen; portal: its state; lens: the finger frame
    // open; sign: the hand sign being held
    update(t, hands, { place, rect, portal, lens, sign }) {
      if (!on) return;
      if (t - t0 > 3600) { this.toggle(t); return; }
      if (hands !== last && (hands.length || had)) put(t, { hands: hands.map((h) => ({ side: h.side, p: h.points.flatMap(([x, y]) => [r4(x), r4(y)]) })) });
      last = hands;
      had = hands.length;
      // (the picture as x, y, width, height, and the camera frame's corners on screen: mirrored)
      const now = { frame: rect ? [rect.x, rect.y, rect.w, rect.h, ...place(0, 0), ...place(1, 1)].map(Math.round) : null, portal: [portal.phase, portal.look, portal.next], lens, sign };
      for (const [k, v] of Object.entries(now)) if (JSON.stringify(v) !== was[k]) { was[k] = JSON.stringify(v); put(t, { [k]: v }); }
      if (t - sentAt > 5) { sentAt = t; send(); }
    },
  };
}
