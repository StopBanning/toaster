// Hand points: the hands the camera tracks, drawn over the picture as the tracker sees them, the
// 21 joints of each hand as dots and the bones between them as lines, so whoever's watching can see
// that the hands really are what's driving it. The fingertips are drawn bigger and swell on the
// kick. In the theme's text colour, on a thin dark edge so they read on any picture. On or off from
// the command menu (Ctrl+K: "hand points"); off by default.

// MediaPipe's hand: 0 the wrist; 1-4 the thumb, 5-8 the index, 9-12 the middle, 13-16 the ring and
// 17-20 the little finger, each from its knuckle out to the tip.
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];
const TIPS = new Set([4, 8, 12, 16, 20]);

export function createHandPoints(canvas) {
  const g = canvas.getContext('2d');
  let pulse = 0, last = 0, drawn = false;
  const clear = () => { if (drawn) { g.clearRect(0, 0, canvas.width, canvas.height); drawn = false; } };
  return {
    kick(s, calm = false) { pulse = Math.max(pulse, calm ? 0.35 : 0.6 + 0.4 * Math.min(1, s)); },
    clear,
    // hands: from the tracker; place(x, y): a camera point (0-1) on screen; col: the theme
    draw(t, { hands, place, col }) {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      pulse *= Math.exp(-dt / 0.12);
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      clear();
      if (!hands?.length) return;
      const fg = `rgb(${col.fg})`, edge = `rgba(${col.bg},0.75)`;
      const unit = Math.min(w, h) / 1000;
      for (const hd of hands) {
        const P = hd.points.map(([x, y]) => { const [sx, sy] = place(x, y); return [sx * dpr, sy * dpr]; });
        // how big the hand is on screen (wrist to middle knuckle), so the dots scale with it
        const size = Math.hypot(P[9][0] - P[0][0], P[9][1] - P[0][1]);
        const k = Math.max(0.6, Math.min(1.6, size / (180 * unit)));
        g.lineCap = 'round';
        for (const [stroke, width] of [[edge, 6], [fg, 2.8]]) {
          g.strokeStyle = stroke; g.lineWidth = width * unit * k; g.globalAlpha = stroke === fg ? 0.85 : 1;
          g.beginPath();
          for (const [a, b] of BONES) { g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); }
          g.stroke();
        }
        g.globalAlpha = 1;
        P.forEach(([x, y], i) => {
          const r = (TIPS.has(i) ? 9 * (1 + 0.6 * pulse) : 5.5) * unit * k;
          g.fillStyle = edge; g.beginPath(); g.arc(x, y, r + 2 * unit * k, 0, Math.PI * 2); g.fill();
          g.fillStyle = fg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        });
      }
      drawn = true;
    },
  };
}
