// The glass blob that follows the hands (renderer/glasshands.js and glass.js's layout): the drift is exactly what it was with no hands or the setting off,
// the hands put the blob where the design says (backlog/glass-ball/DESIGN.md), a missing hand never makes it jump or blink, a burst fires once, and a replay of
// Colin's real hand logs (when they are on this machine) never throws it, blinks it out or breaks a number.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { layout, DROPS, createFollower, shyOfCode, keepInside, lobesOf, spikeProfile, spikeEnvelope, fitSpikes, LOBE_N, SPIKES, SPIKE_MAX, K_SIZE, ONE_HAND } from '../renderer/glasshands.js';

// --- the drift: glass.js's drop arithmetic as it was (copied from the move() of 0.5.9, before layout() was taken out of it)
function was(drops, { t, cx, cy, R, pulse, low, mid, high, spin }) {
  const set = (i, x, y, r) => { drops[i * 3] = x; drops[i * 3 + 1] = y; drops[i * 3 + 2] = r; };
  set(0, cx, cy, R * (0.95 + 0.12 * low + 0.16 * pulse));
  for (let i = 1; i <= 4; i++) {
    const a = spin * (i % 2 ? 1 : -0.7) * (0.6 + 0.15 * i) + i * 1.57;
    const dist = R * (0.62 + 0.18 * Math.sin(t * 0.37 + i * 1.7) + 0.22 * pulse);
    set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.85, R * (0.42 + 0.1 * Math.sin(t * 0.53 + i) + 0.18 * mid));
  }
  for (let i = 5; i < DROPS; i++) {
    const a = -spin * 0.45 + (i - 5) * Math.PI + Math.sin(t * 0.2 + i);
    const dist = R * (1.3 + 0.2 * Math.sin(t * 0.21 + i));
    set(i, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.8, R * (0.17 + 0.12 * high + 0.05 * pulse));
  }
}
let seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test('with no burst the drops are exactly the drift\'s, bit for bit, over a spread of times, sizes and levels', () => {
  const a = new Float32Array(DROPS * 3), b = new Float32Array(DROPS * 3);
  for (let n = 0; n < 400; n++) {
    const s = { t: rnd() * 5000, cx: rnd() * 1900, cy: rnd() * 1000, R: 20 + rnd() * 300, pulse: rnd(), low: rnd(), mid: rnd(), high: rnd(), spin: rnd() * 800 };
    was(a, s); layout(b, s); assert.deepEqual([...b], [...a], `sample ${n}`);
    layout(b, s, 0); assert.deepEqual([...b], [...a]);
  }
});

test('a burst flings the six circling drops outward and swells them, and leaves the middle drop where it is', () => {
  const s = { t: 12, cx: 600, cy: 400, R: 150, pulse: 0.2, low: 0.4, mid: 0.4, high: 0.4, spin: 3 }, a = new Float32Array(21), b = new Float32Array(21);
  layout(a, s); layout(b, s, 1);
  assert.deepEqual([...b.slice(0, 3)], [...a.slice(0, 3)]);
  for (let i = 1; i < DROPS; i++) {
    const da = Math.hypot(a[i * 3] - 600, a[i * 3 + 1] - 400), db = Math.hypot(b[i * 3] - 600, b[i * 3 + 1] - 400);
    assert.ok(db > 1.8 * da, `drop ${i} flung out: ${da.toFixed(0)} to ${db.toFixed(0)}`);
    assert.ok(b[i * 3 + 2] > a[i * 3 + 2], `drop ${i} swells`);
  }
});

// --- made-up hands: 21 points, the wrist (0), the knuckles (5, 9, 13, 17) round a palm centre, in camera 0-1; place() maps them to a 1000 x 600 screen
const W = 1000, H = 600, place = (x, y) => [x * W, y * H];
function hand(cx, cy, s = 0.1) {
  const P = Array.from({ length: 21 }, () => [cx, cy]);
  P[0] = [cx, cy + s * 0.9]; P[9] = [cx, cy - s * 0.1];   // wrist to middle knuckle: s of the picture's height
  for (const [i, dx] of [[5, -0.04], [13, 0.04], [17, 0]]) P[i] = [cx + dx, cy - s * 0.1];
  return { points: P };
}
const frames = (f, from, to, step = 1 / 30) => { for (let t = from; t <= to + 1e-9; t += step) f(t); };
function run(spec) { const f = createFollower(), out = []; frames((t) => { const o = f.update(t, { place, W, H, ...spec(t) }); out.push({ t, ...o }); }, 0, spec.end ?? 3); return { f, out }; }
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} against ${b}`);

test('no hands: it drifts, w stays 0, nothing is asked of the blob', () => {
  const { out } = run(() => ({ hands: [] }));
  for (const o of out) { assert.equal(o.w, 0); assert.equal(o.mode, 'drift'); assert.equal(o.burst, 0); }
});

test('two hands: the blob goes to the middle of the palms, sized by their distance, in about a third of a second', () => {
  const two = () => ({ hands: [hand(0.3, 0.5), hand(0.7, 0.5)] });
  const { out } = run(two), at = (t) => out.find((o) => o.t >= t);
  assert.ok(at(0.4).w > 0.9, `in charge by 0.4 s: ${at(0.4).w}`);
  const o = out[out.length - 1], pa = place(0.3 - 0.0, 0.5), pb = place(0.7, 0.5);
  // (a hand's palm centre is the mean of the wrist, and four knuckles and the 15 points left at its centre: close to (cx, cy), above it a little)
  near(o.x, (pa[0] + pb[0]) / 2, 8, 'x at the middle of the hands'); near(o.y, 300, 20, 'y');
  near(o.r, K_SIZE * 400, 25, 'radius from their distance');
  assert.equal(o.mode, 'two'); assert.equal(o.gone, 0);
  // and it grows as they part
  const f = createFollower(); let r0, r1;
  frames((t) => { r0 = f.update(t, { hands: [hand(0.4, 0.5), hand(0.6, 0.5)], place, W, H }).r; }, 0, 1);
  frames((t) => { r1 = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }).r; }, 1.03, 2);
  assert.ok(r1 > 1.5 * r0, `bigger with the hands apart (${r0.toFixed(0)} to ${r1.toFixed(0)})`);
});

test('one hand: the blob rides on the palm, sized by the hand; a hand missing under 0.25 s changes nothing, a longer loss moves it over', () => {
  assert.ok(ONE_HAND > 0);
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 0, 1);
  const x2 = o.x, y2 = o.y, r2 = o.r;
  // the right hand drops out for 0.2 s: the last place stands
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5)], place, W, H }); assert.equal(o.mode, 'hold'); near(o.x, x2, 2, 'x held'); near(o.y, y2, 2, 'y held'); near(o.r, r2, 2, 'r held'); }, 1.033, 1.2);
  // after 0.5 s it is one hand's blob, and it has not jumped: a step at most half a radius a frame
  let prev = { x: x2, y: y2 }, maxStep = 0;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5)], place, W, H }); maxStep = Math.max(maxStep, Math.hypot(o.x - prev.x, o.y - prev.y)); prev = o; }, 1.233, 3);
  assert.equal(o.mode, 'one'); near(o.x, 300, 15, 'on the palm'); assert.ok(o.r < r2, 'smaller with one hand');
  assert.ok(maxStep <= 0.5 * 0.35 * H * 2, `no jump (largest step ${maxStep.toFixed(1)} px)`);
});

test('no hands: held 0.4 s, then back to the drift over about a second; hands again before that turn it round', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 0, 1);
  const x = o.x;
  frames((t) => { o = f.update(t, { hands: [], place, W, H }); assert.equal(o.mode, 'hold'); assert.ok(o.w > 0.9); near(o.x, x, 2, 'held'); }, 1.033, 1.4);
  frames((t) => { o = f.update(t, { hands: [], place, W, H }); }, 1.433, 1.8);
  assert.ok(o.w < 0.9 && o.w > 0.2, `letting go (${o.w})`);
  frames((t) => { o = f.update(t, { hands: [], place, W, H }); }, 1.833, 3.4);
  assert.equal(o.mode, 'drift'); assert.ok(o.w < 0.05, `drifting again (${o.w})`);
  // hands back: it takes charge again, from where it is
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 3.433, 4.2);
  assert.ok(o.w > 0.95);
});

test('palms together: it shrinks away in about five frames and is back when they part (a hysteresis, no flicker at the edge)', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 0, 1, 1 / 60);
  assert.equal(o.gone, 0);
  frames((t) => { o = f.update(t, { hands: [hand(0.48, 0.5), hand(0.52, 0.5)], place, W, H }); }, 1.0167, 1.4, 1 / 60);   // palms 40 px apart (the hand is 60 px): well under 1.2 hand sizes
  assert.ok(o.gone > 0.95, `gone (${o.gone})`);
  // palms between 1.2 and 1.8 hand sizes apart (72 to 108 px here): inside the band, it stays gone
  for (const gap of [0.09, 0.1, 0.105, 0.09]) frames((t) => { o = f.update(t, { hands: [hand(0.5 - gap / 2, 0.5), hand(0.5 + gap / 2, 0.5)], place, W, H }); }, 1.45, 1.55, 1 / 60);
  assert.ok(o.gone > 0.95, `still gone inside the band (${o.gone})`);
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 1.6, 2.2, 1 / 60);
  assert.ok(o.gone < 0.05, `back (${o.gone})`);
});

test('hands thrown open: one burst, held about four frames, ringing down; slow spreading and a second throw inside 0.6 s do nothing', () => {
  const f = createFollower(), bursts = [];
  const spread = (t, d) => f.update(t, { hands: [hand(0.5 - d / 2, 0.5), hand(0.5 + d / 2, 0.5)], place, W, H });
  let t = 0; for (; t < 1; t += 1 / 60) spread(t, 0.4);
  // 0.4 to 0.62 of the picture's width in 0.1 s (more than a third)
  const t0 = t; for (; t < t0 + 0.1; t += 1 / 60) bursts.push([t, spread(t, 0.4 + 0.22 * ((t - t0) / 0.1)).burst]);
  for (; t < t0 + 1.2; t += 1 / 60) bursts.push([t, spread(t, 0.62).burst]);
  const peakAt = bursts.find(([, b]) => b === 1);
  assert.ok(peakAt, 'a burst fired');
  const held = bursts.filter(([, b]) => b === 1).length; assert.ok(held >= 3 && held <= 6, `held ${held} frames`);
  assert.ok(bursts.at(-1)[1] === 0, 'gone by the end');
  const after = bursts.find(([tt]) => tt >= peakAt[0] + 0.3)[1]; assert.ok(after > 0.1 && after < 0.8, `ringing down at 0.3 s (${after.toFixed(2)})`);
  // slow: the same widening over a second
  const g = createFollower(); let any = 0, u = 0;
  for (; u < 1; u += 1 / 60) g.update(u, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H });
  for (; u < 3; u += 1 / 60) any = Math.max(any, g.update(u, { hands: [hand(0.5 - (0.2 + 0.1 * (u - 1)) / 2, 0.5), hand(0.5 + (0.2 + 0.1 * (u - 1)) / 2, 0.5)], place, W, H }).burst);
  assert.equal(any, 0, 'slow spreading is no burst');
  // together, then thrown open again within 0.6 s: no second burst
  const h = createFollower(); let n = 0, was1 = false, v = 0;
  const sp = (d) => h.update(v, { hands: [hand(0.5 - d / 2, 0.5), hand(0.5 + d / 2, 0.5)], place, W, H }).burst;
  for (; v < 1; v += 1 / 60) sp(0.4);
  for (let k = 0; k < 6; k++, v += 1 / 60) { const b = sp(0.4 + 0.22 * (k / 5)); if (b === 1 && !was1) n++; was1 = b === 1; }
  for (let k = 0; k < 12; k++, v += 1 / 60) { const b = sp(k < 6 ? 0.3 : 0.62); if (b === 1 && !was1) n++; was1 = b === 1; }
  assert.equal(n, 1, `one burst, not ${n}`);
});

test('a wrong frame cannot throw it: a palm jumping across the picture moves the blob half a radius a frame at most', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.4, 0.5)], place, W, H }); }, 0, 1, 1 / 60);
  const p = { x: o.x, y: o.y }; o = f.update(1.02, { hands: [hand(0.85, 0.2), hand(0.95, 0.2)], place, W, H });
  const step = Math.hypot(o.x - p.x, o.y - p.y), r = Math.max(o.r, 0.06 * H);
  assert.ok(step <= 0.5 * r * 1.001 + 1e-6 || step <= 0.5 * 0.45 * H, `moved ${step.toFixed(1)} px against r ${r.toFixed(0)}`);
  assert.ok(step < 0.6 * Math.hypot(0.55 * W, 0.3 * H), 'and nothing like the whole jump');
});

test('a portal window open: the hands are left to it, the blob lets go to its drift, and it follows again when the window is gone', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H }); }, 0, 1);
  assert.ok(o.w > 0.95);
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H, portal: true }); }, 1.033, 3);
  assert.ok(o.w < 0.05, `drifting while the portal is open (${o.w})`);
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.7, 0.5)], place, W, H, portal: false }); }, 3.033, 4);
  assert.ok(o.w > 0.95);
});

test('the same hands once the tracker sees one hand twice (wrists nearly together): that is one hand, not two', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { hands: [hand(0.3, 0.5), hand(0.302, 0.5)], place, W, H }); }, 0, 1);
  assert.equal(o.mode, 'one');
});

// --- Colin's real hand logs (Nov 15), when they are on this machine: every frame through the follower, as the app would feed it
const logs = path.join(os.homedir(), 'Library/Application Support/Toaster/hand logs');
const files = fs.existsSync(logs) ? fs.readdirSync(logs).filter((f) => f.endsWith('.jsonl')).sort() : [];
test('replaying Colin\'s hand logs: no broken number, no blink, no throw, hands in charge while they are in view', { skip: files.length ? false : 'no hand logs on this machine' }, () => {
  for (const file of files) {
    const rows = fs.readFileSync(path.join(logs, file), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const fr = rows.find((r) => r.frame)?.frame, head = rows.find((r) => r.screen), [w, h] = head.screen;
    const p0 = [fr[4], fr[5]], p1 = [fr[6], fr[7]], pl = (x, y) => [p0[0] + x * (p1[0] - p0[0]), p0[1] + y * (p1[1] - p0[1])];
    const f = createFollower(); let prev = null, maxR = 0, minEdge = Infinity, maxStep = 0, inView = 0, inCharge = 0, blink = 0, n = 0, bursts = 0, wasBurst = false, goneFrames = 0;
    for (const r of rows) {
      if (!r.hands) continue;
      const hands = r.hands.map((x) => ({ points: Array.from({ length: 21 }, (_, i) => [x.p[2 * i], x.p[2 * i + 1]]) }));
      const o = f.update(r.t, { hands, place: pl, W: w, H: h });
      for (const k of ['w', 'x', 'y', 'r', 'gone', 'burst']) assert.ok(Number.isFinite(o[k]), `${file} ${r.t}: ${k} ${o[k]}`);
      assert.ok(o.w >= 0 && o.w <= 1 && o.gone >= 0 && o.gone <= 1 && o.burst >= 0 && o.burst <= 1 && o.r >= 0);
      maxR = Math.max(maxR, o.r); if (o.w > 0.01) minEdge = Math.min(minEdge, o.x - 1.25 * o.r + 1e-6, w - o.x - 1.25 * o.r + 1e-6, o.y - 1.25 * o.r + 1e-6, h - o.y - 1.25 * o.r + 1e-6);
      if (prev && o.w > 0.5) { const step = Math.hypot(o.x - prev.x, o.y - prev.y); maxStep = Math.max(maxStep, step / Math.max(1, Math.min(0.1, r.t - prev.t) * 60)); }
      if (hands.length) { inView++; if (o.w > 0.9) inCharge++; }
      if (o.w > 0.5 && o.gone < 0.5 && o.r < 0.05 * Math.min(w, h)) blink++;
      if (o.burst === 1 && !wasBurst) bursts++; wasBurst = o.burst === 1; if (o.gone > 0.9) goneFrames++;
      prev = { ...o, t: r.t }; n++;
    }
    assert.ok(maxR <= 0.25 * Math.min(w, h) + 1e-6, `${file}: the blob's radius reached ${maxR.toFixed(0)} px`);
    assert.ok(minEdge >= 0, `${file}: the middle drop went ${(-minEdge).toFixed(0)} px past its margin`);
    assert.ok(maxStep <= 0.5 * 0.25 * Math.min(w, h) + 1, `${file}: largest step per 60th ${maxStep.toFixed(1)} px`);
    assert.equal(blink, 0, `${file}: the blob blinked out ${blink} times while in charge`);
    console.log(`  replay ${file}: ${n} frames; hands in view ${inView}, in charge ${inCharge} (${(100 * inCharge / Math.max(1, inView)).toFixed(0)}%); largest step ${maxStep.toFixed(1)} px per 60th; bursts ${bursts}; gone for ${goneFrames} frames`);
  }
});

// --- the portals, as they are with the setting off: app.js feeds them the same way, glass.draw gets no follow (null) unless the setting and the blob are both on,
// and the setting is off to begin with and saved
test('with the setting off nothing about the portals or the blob changes: same portal.draw call, no follow handed to glass.draw, off by default, saved', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("portal.draw(t, { ...where, hands: tracker.hands, video: cam.video, mask: tracker.mask, bar: eng.bar, face: tracker.face, pose: tracker.pose });"), 'portal.draw is fed as it was');
  assert.match(app, /const following = state\.glassHands && state\.glass\s*\?[^;]*:\s*null;\s*glass\.draw\(t, eng, col, LAYERS, following\);/, 'glass.draw gets null unless the setting and the blob are on');
  assert.match(app, /glass: false, glassHands: false,/, 'off by default');
  assert.match(app, /'glass', 'glassHands',/, 'saved with the settings');
  assert.match(app, /state\.glassHands = state\.glassHands === true;/, 'read back as a boolean');
  assert.match(app, /id: 'glass-hands', name: 'the glass blob follows your hands \(on or off\)'/, 'in Ctrl+K');
  // the portals' own file is not part of this build
  const glass = fs.readFileSync(new URL('../renderer/glass.js', import.meta.url), 'utf8');
  assert.ok(!/portal/.test(glass), 'glass.js knows nothing of the portals');
});

test('size and place: never bigger than a quarter of the window\'s short side, even when the spring rings or the hands go far apart; the middle drop keeps its margin at every edge', () => {
  const f = createFollower(); let maxR = 0, bad = null;
  const feed = (t, a, b) => { const o = f.update(t, { hands: [hand(a[0], a[1]), hand(b[0], b[1])], place, W, H }); maxR = Math.max(maxR, o.r); const m = 1.25 * o.r - 1e-6; if (!bad && o.w > 0.01 && (o.x < m || o.x > W - m || o.y < m || o.y > H - m)) bad = { t, o }; return o; };
  let t = 0;
  for (; t < 1; t += 1 / 60) feed(t, [0.45, 0.5], [0.55, 0.5]);
  for (; t < 2; t += 1 / 60) feed(t, [0.02, 0.5], [0.98, 0.5]);              // thrown wide: the spring rings
  for (; t < 3; t += 1 / 60) feed(t, [0.02, 0.05], [0.12, 0.05]);            // the top left corner, small
  for (; t < 4; t += 1 / 60) feed(t, [0.9, 0.97], [0.99, 0.97]);             // the bottom right corner
  assert.ok(maxR <= 0.25 * H + 1e-6, `radius ${maxR} against ${0.25 * H}`);
  assert.equal(bad, null, JSON.stringify(bad));
  assert.deepEqual(keepInside(-50, 5000, 100, 1000, 600), { x: 125, y: 475 });
  assert.deepEqual(keepInside(500, 300, 100, 1000, 600), { x: 500, y: 300 });
});

test('shy of the code: over the lines the blob gets smaller and slides off them, clear of them it is left alone, with the hands not in charge it is left alone', () => {
  const lines = Array.from({ length: 8 }, (_, i) => ({ x0: 40, x1: 700, y0: 60 + i * 26, y1: 80 + i * 26 })), run = (rects, w = 1, x = 380, y = 160, r = 120, n = 150) => {
    const st = {}; let o; for (let i = 0; i < n; i++) o = shyOfCode(st, 1 / 60, x, y, r, rects, w); return o;
  };
  const clear = run(lines, 1, 380, 520, 100), none = run([], 1, 380, 160), off = run(lines, 0);
  assert.deepEqual([clear.x, clear.y, clear.r], [380, 520, 100], 'clear of the code: untouched');
  assert.deepEqual([none.x, none.y, none.r], [380, 160, 120], 'no code: untouched');
  assert.deepEqual([off.x, off.y, off.r], [380, 160, 120], 'the hands not in charge: untouched');
  const over = run(lines);
  assert.ok(over.r < 0.65 * 120, `smaller over the lines (${over.r.toFixed(0)} of 120)`);
  assert.ok(over.r >= 0.5 * 120 - 1e-6, 'but not gone');
  // the lines are above and to the left of its middle: down and right is off them (the lines fill y 60 to 268; the blob's middle is inside them, so it slides away from their weight)
  const edge = run(lines, 1, 380, 330, 100), st = {}; 
  assert.ok(edge.y > 330, `slides down, away from the lines above (${edge.y.toFixed(0)})`);
  // no flicker: a sudden cover moves it a little each frame, not all at once
  let prev = shyOfCode(st, 1 / 60, 380, 160, 120, [], 1), worst = 0;
  for (let i = 0; i < 30; i++) { const o = shyOfCode(st, 1 / 60, 380, 160, 120, lines, 1); worst = Math.max(worst, Math.abs(o.r - prev.r), Math.hypot(o.x - prev.x, o.y - prev.y)); prev = o; }
  assert.ok(worst < 0.09 * 120, `largest change in a frame ${worst.toFixed(2)} px`);
});

test('the spikes: 26 thin lobes, mostly sideways, a new set for each kick, nothing without a kick, never past the cap', () => {
  const a = lobesOf(1234), b = lobesOf(1234), c = lobesOf(1235);
  assert.equal(a.length, SPIKES); assert.deepEqual(a, b, 'the same kick, the same spikes'); assert.notDeepEqual(a, c, 'another kick, other spikes');
  for (const [, h, p] of a) { assert.ok(h >= 0 && h <= 1); assert.ok(p >= 50 && p <= 200, `power ${p}`); }
  // mostly sideways: across many kicks the lobes lean to the horizontal
  let side = 0, up = 0; for (let s = 0; s < 200; s++) for (const [phi] of lobesOf(s)) { side += Math.abs(Math.cos(phi)); up += Math.abs(Math.sin(phi)); }
  assert.ok(side > 1.6 * up, `sideways ${side.toFixed(0)} against up and down ${up.toFixed(0)}`);
  const z = new Float32Array(LOBE_N), p = new Float32Array(LOBE_N);
  assert.ok(spikeProfile(z, 7, 0).every((v) => v === 0), 'no kick, no spikes'); assert.ok(spikeProfile(z, 7, -1).every((v) => v === 0));
  spikeProfile(p, 7, 0.9);
  const max = Math.max(...p), above = p.filter((v) => v > 0.5 * max).length;
  assert.ok(max > 0.3 && max <= SPIKE_MAX, `tallest spike ${max.toFixed(2)} of a radius`);
  assert.ok(above < 0.4 * LOBE_N, `thin: ${above} of ${LOBE_N} samples are over half the tallest`);
  assert.ok(Math.max(...spikeProfile(new Float32Array(LOBE_N), 9, 50)) <= SPIKE_MAX, 'capped');
  const q = new Float32Array(LOBE_N); spikeProfile(q, 7, 0.45); for (let j = 0; j < LOBE_N; j++) assert.ok(Math.abs(q[j] * 2 - p[j]) < 1e-5, 'amp scales the whole profile');
});

test('the spikes cannot touch the plain blob: the shadow and the hands-off draw use the field without them, and the lobes are drawn only with a follow, a kick and the gate on', () => {
  const glass = fs.readFileSync(new URL('../renderer/glass.js', import.meta.url), 'utf8'), spikes = fs.readFileSync(new URL('../renderer/glassspikes.js', import.meta.url), 'utf8');
  assert.match(spikes, /field\(p - vec2\(10\.0, ?18\.0\), false\)/, 'the shadow uses the plain field');
  assert.match(glass, /follow && follow\.w > 0\.01 && kicks\.last/, 'spikes only with hands in charge and a kick');
  assert.match(spikes, /uniform float lobeOn/, 'a gate in the shader');
  assert.match(glass, /spiky = readySpiky\(\) && \(amp > 0\.01 \|\| !sp\.warm\)/, 'the spikes\' program draws only with a spike, except the one warming frame');
});

// --- the plain blob's shader is the one that shipped before there were hands (0.5.9, 0.5.10): byte for byte. Windows has no machine here to try a changed shader on, so the
// spikes are a second program (glassspikes.js), made only when the hands have the blob; glass.js's own FRAG must not move. The pin is the SHA-256 of FRAG's template text
// (the `${DROPS}` unexpanded) on main at 71eab01, where it is the same as at 0.5.9. Change it only on purpose, knowing the plain blob's shader on every machine changes.
test('the plain blob\'s shader is byte for byte what main ships, and the spikes live in a second program that is built only when the hands have the blob', () => {
  // (a Windows checkout has CRLF; a template literal's line ends are LF at run time whatever the file has, so the pin is on LF text)
  const glass = fs.readFileSync(new URL('../renderer/glass.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const a = glass.indexOf('const FRAG = `') + 'const FRAG = `'.length, b = glass.indexOf('}`;', a) + 1;
  const frag = glass.slice(a, b);
  assert.equal(Buffer.byteLength(frag), 4173, 'its length');
  assert.equal(crypto.createHash('sha256').update(frag).digest('hex'), '5e3ee15c819691d6aa8b55af13c33dc856bdffebde9431dd39b7a852f1b80bd9', 'its SHA-256');
  assert.ok(!/lobe|spike/i.test(frag), 'no spikes in it');
  // the plain program is built and set up as it was: its uniforms are main\'s nine, and nothing about the spikes (texture unit 2, the lobes) is made with it
  assert.match(glass, /\['size', 'dpr', 'drops', 'thickness', 'depth', 'fg', 'shine', 'scene', 'words'\]\.map/, 'the plain program\'s uniforms are the old nine');
  const init = glass.slice(glass.indexOf('function init()'), glass.indexOf('function buildSpiky()'));
  assert.ok(!/TEXTURE2|lobe/.test(init), 'init() makes nothing for the spikes');
  // the spikes' program: built the first time there is a follow, never with the hands off; a refusal keeps the plain blob (broken is not set)
  const spk = glass.slice(glass.indexOf('function buildSpiky()'), glass.indexOf('// Where the drops are this frame'));
  assert.ok(!/broken = true/.test(spk.replace(/sp\.broken = true/g, '')), 'a refused spikes program does not break the blob');
  assert.equal([...glass.matchAll(/buildSpiky\(\)/g)].length, 2, 'defined once, called once');
  assert.match(glass, /if \(follow && !sp && gl\) buildSpiky\(\);/, 'built when the hands have the blob');
  assert.equal([...glass.matchAll(/TEXTURE2/g)].length, 2, 'texture unit 2 is touched only by the spikes\' set-up and their upload');
});

test('the spikes let go faster than the kick\'s glow: the plain blob shows between kicks at 125 to 172 bpm, and a quiet kick throws less', () => {
  assert.equal(spikeEnvelope(-0.1, 1), 0); assert.equal(spikeEnvelope(0, 0), 0);
  assert.ok(Math.abs(spikeEnvelope(0, 1) - 1) < 1e-9, 'a full kick starts at full');
  let last = 2; for (let a = 0; a <= 0.4; a += 0.01) { const v = spikeEnvelope(a, 1); assert.ok(v <= last + 1e-12, 'only falls'); last = v; }
  assert.equal(spikeEnvelope(0.25, 1), 0, 'gone a quarter of a second on');
  assert.ok(spikeEnvelope(0.1, 1) > 0.15, 'still there a tenth of a second on');
  assert.ok(spikeEnvelope(0.05, 0.4) < spikeEnvelope(0.05, 1) * 0.5, 'a quiet kick throws less');
  // the share of time with spikes out, for a kick on every beat (the first beat of Blinding Lights is 172 bpm, a house kick 125)
  for (const [bpm, most] of [[172, 0.65], [140, 0.55], [125, 0.5]]) {
    const gap = 60 / bpm; let on = 0, n = 0;
    for (let a = 0; a < gap; a += 0.001) { n++; if (spikeEnvelope(a, 1) > 0) on++; }
    assert.ok(on / n < most, `${bpm} bpm: spikes out ${(100 * on / n).toFixed(0)}% of the time, under ${100 * most}%`);
  }
});

test('at an edge: the middle drop stays above the player bar and inside the window; the spikes are cut to the room, never past the edge or the bar', () => {
  const W = 1280, H = 800, r = 90, bar = 70;
  const a = keepInside(640, 790, r, W, H, bar); assert.ok(a.y <= H - bar - 1.25 * r + 1e-9, `bottom ${a.y}`);
  assert.deepEqual(keepInside(640, 790, r, W, H), keepInside(640, 790, r, W, H, 0), 'no bar, as before');
  assert.equal(keepInside(5, 5, r, W, H, bar).x, 1.25 * r);
  const out = new Float32Array(LOBE_N).fill(1.8);
  fitSpikes(out, 1280 - 150, 400, r, W, H, bar);            // near the right edge
  for (let j = 0; j < LOBE_N; j++) {
    const th = ((j + 0.5) / LOBE_N) * 2 * Math.PI - Math.PI, tipX = 1130 + Math.cos(th) * r * (1 + out[j]), tipY = 400 + Math.sin(th) * r * (1 + out[j]);
    assert.ok(tipX <= W + 1e-6 && tipX >= -1e-6 && tipY >= -1e-6 && tipY <= H - bar + 1e-6, `tip ${j} at ${tipX.toFixed(0)},${tipY.toFixed(0)}`);
  }
  assert.ok(out[0] > 1.0 && out[LOBE_N / 2] < 0.7, "to the left, with room, a spike keeps its height; to the right, at the edge, it is short");
  const full = new Float32Array(LOBE_N).fill(0.5); fitSpikes(full, 640, 400, r, W, H, bar);
  assert.ok(full.every((v) => v === 0.5), 'with room all round, nothing is cut');
});

test('hands gone: the blob fades out of its last place, never out of the window\'s corner', () => {
  const f = createFollower(); let last = null;
  frames((t) => { last = f.update(t, { place, W, H, hands: [hand(0.8, 0.5), hand(0.95, 0.5)] }); }, 0, 2);
  assert.ok(last.w > 0.9 && last.x > 600, 'the hands have it, at the right');
  const held = { x: last.x, y: last.y, r: last.r };
  let n = 0;
  frames((t) => { const o = f.update(t, { place, W, H, hands: [] }); if (o.w > 0) { n++; near(o.x, held.x, 0.02 * W, `x at ${t.toFixed(2)}`); near(o.y, held.y, 0.02 * H, 'y'); near(o.r, held.r, 0.1 * held.r + 1, 'r'); } }, 2.02, 6);
  assert.ok(n > 20, `w took ${n} frames to go`);
});

test('the finger frame has the hands like a portal window: the blob steps aside for it, in both feeds; the player bar is read only with the setting on', () => {
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  assert.equal([...app.matchAll(/portal: portal\.showing \|\| lens\.showing \}/g)].length, 2, 'the replay feed and the camera feed');
  assert.ok(!/portal: portal\.showing \}/.test(app), 'no feed that forgets the finger frame');
  assert.match(app, /if \(state\.glassHands && Math\.floor\(t \* 2\) !== insetAt\)/, 'the player bar is measured only for the hands\' blob');
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { place, W, H, hands: [hand(0.45, 0.5), hand(0.55, 0.5)], portal: false }); }, 0, 2);
  assert.ok(o.w > 0.9, 'the hands have it');
  frames((t) => { o = f.update(t, { place, W, H, hands: [hand(0.45, 0.5), hand(0.55, 0.5)], portal: true }); }, 2.02, 5);
  assert.equal(o.w, 0, 'with the finger frame (or a portal) open the blob goes back to the drift');
});

test('a clock that steps back: the hold counts from the step, so the hands lost just then do not hold the blob until the clock catches up', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { place, W, H, hands: [hand(0.45, 0.5), hand(0.55, 0.5)] }); }, 100, 102);
  assert.ok(o.w > 0.9, 'the hands have it');
  // the clock steps back 50 s, with the hands gone; 0.4 s hold, then it lets go (w falls to nothing in a second or two)
  let held = 0, end = null;
  frames((t) => { o = f.update(t - 52, { place, W, H, hands: [] }); if (o.mode === 'hold') held++; end = o; }, 102.02, 106);
  assert.ok(held >= 10 && held <= 16, `held about 0.4 s of frames at 30 a second (${held})`);
  assert.equal(end.w, 0, 'and let go');
  // and with hands that were seen just before the step the other way round (two hands, then one with the clock back): no hold of a hand that left a future ago
  const g = createFollower(); let p;
  frames((t) => { p = g.update(t, { place, W, H, hands: [hand(0.45, 0.5), hand(0.55, 0.5)] }); }, 100, 101);
  frames((t) => { p = g.update(t - 50, { place, W, H, hands: [hand(0.55, 0.5)] }); }, 101.02, 101.5);
  assert.equal(p.mode, 'one', 'one hand after the step is one hand, not the two\' last place');
});

// --- a hand coming back while the blob is still fading out (the clip at 8.5 s, Nov 23): the follower had dropped its place when the hands went, so the returning hand
// put the blob at the new palm in one frame (524 px, the radius 200 to 96). It starts from the place it held while the hands' say (w) is still above 0.
test('a hand coming back during the fade-out: the blob goes on from where it was, no jump in place or size', () => {
  const f = createFollower(); let o, prev = null, maxStep = 0, maxDr = 0, first = null;
  frames((t) => { o = f.update(t, { place, W, H, hands: [hand(0.15, 0.5), hand(0.3, 0.5)] }); }, 0, 2, 1 / 60);        // two hands at the left
  const held = { x: o.x, y: o.y, r: o.r };
  frames((t) => { o = f.update(t, { place, W, H, hands: [] }); }, 2.02, 2.9, 1 / 60);                                   // gone: held 0.4 s, then fading (w about 0.3 by 0.9 s)
  assert.ok(o.w > 0.1 && o.w < 0.6, `still fading (w ${o.w.toFixed(2)})`);
  near(o.x, held.x, 0.02 * W, 'held place'); near(o.r, held.r, 0.1 * held.r + 1, 'held size');
  prev = o;
  frames((t) => {                                                                                                         // one hand back, far to the right
    o = f.update(t, { place, W, H, hands: [hand(0.85, 0.7)] });
    const step = Math.hypot(o.x - prev.x, o.y - prev.y); maxStep = Math.max(maxStep, step); maxDr = Math.max(maxDr, Math.abs(o.r - prev.r));
    if (first === null) first = { step, dr: Math.abs(o.r - prev.r) };
    prev = o;
  }, 2.917, 4, 1 / 60);
  assert.ok(first.step < 0.15 * W && first.dr < 0.15 * held.r, `the first frame back: ${first.step.toFixed(0)} px, radius ${first.dr.toFixed(0)}`);
  assert.ok(maxStep < 0.08 * W, `no frame moves the blob more than ${(0.08 * W).toFixed(0)} px (${maxStep.toFixed(0)})`);
  assert.ok(maxDr < 0.1 * held.r, `nor changes its radius by more than a tenth (${maxDr.toFixed(1)})`);
  assert.ok(Math.hypot(o.x - 0.85 * W, 0) < 0.4 * W, 'and it does get to the hand');
});

test('a hand coming back after the fade-out is over starts at the hand (nothing was held)', () => {
  const f = createFollower(); let o;
  frames((t) => { o = f.update(t, { place, W, H, hands: [hand(0.15, 0.5), hand(0.3, 0.5)] }); }, 0, 2, 1 / 60);
  frames((t) => { o = f.update(t, { place, W, H, hands: [] }); }, 2.02, 8, 1 / 60);
  assert.equal(o.w, 0, 'the hands\' say is gone');
  o = f.update(8.02, { place, W, H, hands: [hand(0.85, 0.7)] });
  assert.ok(o.w < 0.4, 'it comes up as the say does (w starts small: the blob is at the hand, but only a little in charge)');
  near(o.x, place(0.85, 0.7)[0], 0.1 * W, 'at the hand');
});
