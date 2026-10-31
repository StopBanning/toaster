// The spaghetti's noodles (renderer/noodles.js), run as the pasta runs them: two sheets' worth fed
// out of the machine and let go, then checked: nothing blown up, the strands still their length,
// hard landings bounced, and the rest lying on the floor or gone off its edge. The endless kind:
// the joins hold, they spread over the floor and drip off its edge, and a step's quick enough with
// them all. Then a few of them dance through each kind of beat: checked for the shape each kind
// gets, rearing up, not all moving alike nor facing one way, and the first sheet's dancers handing
// over to the second's as it goes. (The Apple port's Tests/pasta/Checks.swift, the same checks.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Noodles, Dancers } from '../renderer/noodles.js';

const N = 24, P = 38, L = Noodles.L, R = Noodles.R;
const n = new Noodles(2 * N, P);
const stretchOf = (n, i) => Math.abs(Math.hypot(n.x[i] - n.x[i - 1], n.y[i] - n.y[i - 1], n.z[i] - n.z[i - 1]) / L - 1);
const finite = (n, i) => Number.isFinite(n.x[i]) && Number.isFinite(n.y[i]) && Number.isFinite(n.z[i]);
const ms = (s) => (s).toFixed(2);

test('two sheets fed out fall, bounce and settle', () => {
  const dt = 1 / 60;
  let worst = 0;
  // each sheet: fed for 8 s (its strands a little apart, the sheet a little skew), then 8 s to land
  for (let sheet = 0; sheet < 2; sheet++) {
    const out = new Array(N).fill(false);
    for (let f = 0; f < 960; f++) {
      const feed = f / 480 * (P - 1) * L;
      for (let s = 0; s < N; s++) {
        if (out[s]) continue; // (as the pasta: once it's all out, no more feeding)
        out[s] = feed - s * 0.25 >= (P - 1) * L;
        const x = -8 + (s + 0.5) * 16 / N, crank = f / 30 * Math.PI + s * 0.4; // (the crank's phase as it lets each go)
        n.feed(sheet * N + s, feed - s * 0.25, [x, 46 - R - 0.05, 3], (P - 1) * L / 8, [2.5 * Math.cos(crank + s), 3, 9 + 7 * Math.sin(crank)]);
      }
      const t0 = performance.now();
      n.step(dt);
      worst = Math.max(worst, performance.now() - t0);
    }
  }
  for (let f = 0; f < 600; f++) n.step(dt);
  let bad = 0, stretched = 0, floating = 0, lying = 0, gone = 0;
  for (let s = 0; s < n.strands; s++) {
    if (!n.alive[s]) { gone++; continue; }
    for (let j = 0; j < P; j++) {
      const i = s * P + j;
      if (!finite(n, i)) { bad++; continue; }
      if (j > 0) stretched = Math.max(stretched, stretchOf(n, i));
      if (Math.abs(n.y[i] - n.oy[i]) * 60 > 2 && n.y[i] > 0) floating++;
      if (n.y[i] < R + 0.05) lying++;
    }
  }
  console.log(`pasta: ${n.landings} hard landings, ${gone} strands gone off the edge, ${lying} beads lying on the floor, ${floating} still moving, worst stretch ${(stretched * 100).toFixed(1)}%, slowest step ${ms(worst)} ms`);
  assert.equal(bad, 0, "every bead's place is a number");
  assert.ok(stretched < 0.25, `the strands keep their length (worst ${stretched})`);
  assert.ok(n.landings > 100, `hard landings bounce (${n.landings})`);
  assert.ok(floating < n.strands * P / 50, `after 10 s they've settled (${floating} beads still moving)`);
  assert.ok(lying > N * P / 2, `most lie on the floor (${lying})`);
});

// The endless kind, as the pasta runs it: 24 noodles fed out without end at the crank's rate (a
// turn a beat at 120 bpm), each link after link joined end to head, the oldest let go when few
// are left to spare.
test('endless: the joins hold, they spread over the floor and drip off its edge, a step is quick', () => {
  const LINKS = 240, link = P * L, rate = 3.5, dt = 1 / 60;
  const n = new Noodles(LINKS, P);
  n.floorG = 150;
  const cur = new Array(N).fill(-1), made = new Array(N).fill(0), born = new Array(LINKS).fill(0);
  let bounced = 0, lying = 0, floorBeads = [], count = 0, retired = 0, dripped = 0, all = 0, steps = 0, worst = 0;
  const free = () => n.alive.filter((a) => !a).length, alive = () => n.alive.filter(Boolean).length;
  for (let f = 0; f < 100 * 60; f++) {
    const fed = rate * f * dt, ft = f * dt;
    for (let s = 0; s < N; s++) {
      const sway = [2 * Math.sin(0.9 * ft + s), 0, 3 + 2 * Math.sin(0.6 * ft + 2 * s)];
      const len = Math.max(0, fed - s * 0.05), exit = [-8 + (s + 0.5) * 16 / N, 46 - R - 0.05, 3];
      while (made[s] <= Math.floor(len / link)) {
        if (cur[s] >= 0) n.feed(cur[s], link, exit, rate, [0, 0, 0], sway);
        const k = n.alive.indexOf(false);
        if (cur[s] >= 0) n.next[cur[s]] = k;
        cur[s] = k; made[s]++; count++; born[k] = count;
        n.feed(k, 0, exit, rate, [0, 0, 0], sway);
      }
      n.feed(cur[s], len - (made[s] - 1) * link, exit, rate, [0, 0, 0], sway);
    }
    while (free() < 2 * N) {
      let old = -1;
      for (let k = 0; k < LINKS; k++) if (n.alive[k] && !cur.includes(k) && (old < 0 || born[k] < born[old])) old = k;
      if (old < 0) break;
      n.kill(old); retired++;
    }
    if (f % 30 === 0) n.hop(n.hopBeat(0.5), 2); // (a kick each beat, as the pasta's)
    // how many of those lying on the floor at a kick are a noodle and more up at the top of the hop
    if (f % 30 === 0 && f > 60 * 60) { floorBeads = []; for (let i = 0; i < LINKS * P; i++) if (n.w[i] > 0 && n.y[i] > 0 && n.y[i] < 0.5) floorBeads.push(i); }
    if (f % 30 === 12 && f > 60 * 60) { lying += floorBeads.length; bounced += floorBeads.filter((i) => n.y[i] > 2).length; }
    const before = alive(), t0 = performance.now();
    n.step(dt);
    const took = performance.now() - t0;
    dripped += before - alive();
    if (f > 60 * 60) { all += took; steps++; worst = Math.max(worst, took); }
  }
  let bad = 0, broken = 0, stretched = 0;
  const cells = new Set();
  for (let s = 0; s < LINKS; s++) {
    if (!n.alive[s]) continue;
    for (let j = 0; j < P; j++) {
      const i = s * P + j;
      if (!finite(n, i)) { bad++; continue; }
      if (j > 0 && n.w[i] > 0 && n.w[i - 1] > 0) stretched = Math.max(stretched, stretchOf(n, i));
      if (n.y[i] < 2 && n.y[i] > 0) cells.add(Math.trunc((n.x[i] + 50) / 5) * 100 + Math.trunc((n.z[i] + 50) / 5));
    }
    if (n.next[s] >= 0) {
      const a = (s + 1) * P - 1, b = n.next[s] * P;
      if (Math.hypot(n.x[a] - n.x[b], n.y[a] - n.y[b], n.z[a] - n.z[b]) > 1.5 * L) broken++;
    }
  }
  console.log(`pasta endless: ${count} links made, ${retired} let go, ${dripped} dripped off the edge, the floor ${(cells.size / 4).toFixed(0)}% covered, ${(bounced * 100 / Math.max(1, lying)).toFixed(0)}% hopping high on a kick, worst stretch ${(stretched * 100).toFixed(0)}%, ${broken} joins pulled apart, a step ${ms(all / steps)} ms (${ms(worst)} at most)`);
  assert.equal(bad, 0, "every bead's place is a number");
  assert.equal(broken, 0, `the joins hold (${broken} pulled apart)`);
  assert.ok(stretched < 0.3, `the endless noodles keep their length (worst ${stretched})`);
  assert.ok(cells.size > 120, `they spread over the floor (${cells.size} of 400 cells)`);
  assert.ok(dripped > 0, `some drip off the edge (${dripped})`);
  assert.ok(bounced * 2 > lying, `most of those lying on the floor hop high on a kick (${bounced} of ${lying})`);
});

// A made-up groove at 120 bpm, each kind of beat a while (each part's 16 steps: x a hit), and the
// shape the dancers should end it in. On the first test's noodles, lying where they fell.
test('a few come alive and dance through each kind of beat', () => {
  const d = new Dancers(n), beat = 0.5, t0 = 100, dt = 1 / 60;
  const four = 'x...x...x...x...', back = '....x.......x...';
  const parts = [
    { name: 'four on the floor', secs: 14, kick: four, snare: back, hat: '..x...x...x...x.', bass: 'x.....x...x.....', fourOnFloor: true, shape: 'crowd' },
    { name: 'broken beat', secs: 10, kick: 'x.....x...x.....', snare: back, hat: 'x.x.x.x.x.x.x.x.', bass: '..x.....x.....x.', fourOnFloor: false, shape: 'cypher' },
    { name: 'sparse', secs: 8, kick: 'x.........x.....', snare: '', hat: '', bass: 'x.......x.......', fourOnFloor: false, shape: 'groups' },
    { name: 'breakdown', secs: 8, kick: '', snare: '', hat: '..x...x...x...x.', bass: '', fourOnFloor: false, shape: 'huddle' },
    { name: 'drop', secs: 8, kick: four, snare: back, hat: '..x...x...x...x.', bass: 'x.....x...x.....', fourOnFloor: true, shape: 'burst' },
  ];
  const g = new Dancers.Groove();
  g.silent = false; g.level = 0.12; g.P = beat;
  let t = t0, step = -1, lineHeads = 0, most = 0, tallest = 0, spread = 0, spreadN = 0, worst = 0, all = 0, frameN = 0;
  // how much of their time they spend crawling, and how often all of them that are set off at once;
  // the shake: how much the dancers' necks jerk frame to frame (second differences), beads up off the floor
  let crawled = 0, danced = 0, together = 0, moves = 0, wasMoving = 0;
  let was = [], was2 = [], shake = 0, shakeN = 0, motion = 0;
  // the spasms: dancers' beads jerking hard (over 0.15 a frame²) where where they're steered to doesn't (a bump, a bounce)
  let aw = [], aw2 = [], bw = [], bw2 = [], spasms = 0, jerks = 0, beadFrames = 0;
  const steered = () => { const out = []; for (let s = 0; s < n.strands; s++) if (n.steered[s]) out.push(s); return out; };
  const standing = () => steered().filter((s) => n.y[s * P] > 4); // (those standing: some may still be crawling)
  parts.forEach((part, k) => {
    const start = t;
    g.fourOnFloor = part.fourOnFloor;
    if (part.name === 'drop') g.drop = t;
    while (t < start + part.secs) {
      g.t = t; g.beat = (t - t0) / beat;
      const now = Math.floor((t - t0) / beat * 4);
      if (now !== step) {
        step = now;
        const on = (p) => p.length > 0 && p[now % 16] === 'x';
        if (on(part.kick)) g.kick = t;
        if (on(part.snare)) g.snare = t;
        if (on(part.hat)) g.hat = t;
        if (on(part.bass)) { g.bass = t; g.bassF0 = [45, 60, 90][now % 3]; }
      }
      if (t - start > 2) { crawled += d.travelling; danced += d.count - d.travelling; }
      if (d.travelling > wasMoving) { moves++; if (d.travelling - wasMoving >= Math.max(3, d.count - 1)) together++; }
      wasMoving = d.travelling;
      // (in the drop the first sheet goes: its dancers should lie down for the second's)
      const going = part.name === 'drop' && t - start > 1, t1 = performance.now();
      d.update(g, dt, (s) => (going ? (s < N ? 0 : 2) : 1));
      const took = performance.now() - t1;
      worst = Math.max(worst, took); all += took; frameN++;
      n.step(dt);
      t += dt;
      const ss = steered(), heads = ss.map((s) => n.y[s * P]);
      const bn = [], an = [];
      for (const s of ss) for (let j = 0; j < P; j++) { const i = s * P + j; bn.push(n.x[i], n.y[i], n.z[i]); an.push(n.aim[4 * i], n.aim[4 * i + 1], n.aim[4 * i + 2]); }
      if (bn.length === was.length && was.length === was2.length) {
        for (let i = 0; i < bn.length; i += 3) {
          if (bn[i + 1] <= 3) continue;
          for (let c = i; c < i + 3; c++) { shake += Math.abs(bn[c] - 2 * was[c] + was2[c]); motion += Math.abs(bn[c] - was[c]); }
          shakeN += 3;
        }
      }
      was2 = was; was = bn;
      if (bn.length === bw.length && bw.length === bw2.length) {
        const acc = (v, v1, v2, i) => { let q = 0; for (let c = i; c < i + 3; c++) { const e = v[c] - 2 * v1[c] + v2[c]; q += e * e; } return Math.sqrt(q); };
        for (let i = 0; i < bn.length; i += 3) {
          const ab = acc(bn, bw, bw2, i), aa = acc(an, aw, aw2, i);
          if (ab > 0.15) { jerks++; if (aa < 0.5 * ab) spasms++; }
          beadFrames++;
        }
      }
      bw2 = bw; bw = bn; aw2 = aw; aw = an;
      most = Math.max(most, heads.length);
      tallest = Math.max(tallest, ...heads, 0);
      if (heads.length > 2 && t - start > 3) { spread += Math.max(...heads) - Math.min(...heads); spreadN++; }
    }
    const heads = standing().map((s) => n.y[s * P]), avg = heads.reduce((a, b) => a + b, 0) / Math.max(1, heads.length);
    console.log(`pasta dance: ${part.name}: ${d.count} dancing in a ${d.shape} (${d.travelling} still on their way), heads ${avg.toFixed(1)} high on average`);
    assert.equal(d.shape, part.shape, `a ${part.name} gets a ${part.shape} (got a ${d.shape})`);
    if (k === 0) {
      lineHeads = avg;
      // the way each head points (along its level top), all of them: not all one way
      const ways = standing().map((s) => Math.atan2(n.z[s * P] - n.z[s * P + 6], n.x[s * P] - n.x[s * P + 6]));
      let widest = 0;
      for (const a of ways) for (const b of ways) widest = Math.max(widest, Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))));
      console.log(`pasta dance: the crowd's heads point ${(widest * 180 / Math.PI).toFixed(0)}° apart at most`);
      assert.ok(widest > 1.2, `they face every way, not one (at most ${widest} radians apart)`);
    }
  });
  const left = steered().filter((s) => s < N).length, second = steered().filter((s) => s >= N).length;
  console.log(`pasta dance: as the first sheet went, ${left} of its dancers still up, ${second} of the second's`);
  assert.ok(left === 0 && second >= 4, `the first sheet's dancers hand over to the second's (${left} left, ${second} new)`);
  let bad = 0, stretched = 0;
  for (let s = 0; s < n.strands; s++) {
    if (!n.alive[s]) continue;
    for (let j = 1; j < P; j++) {
      const i = s * P + j;
      if (!finite(n, i)) { bad++; continue; }
      stretched = Math.max(stretched, stretchOf(n, i));
    }
  }
  const crawling = crawled / Math.max(1, crawled + danced), spasmy = spasms / Math.max(1, beadFrames), shaky = shake / Math.max(1, shakeN);
  console.log(`pasta dance: ${most} at most, tallest head ${tallest.toFixed(1)}, heads ${(spread / Math.max(1, spreadN)).toFixed(1)} apart on average, worst stretch ${(stretched * 100).toFixed(0)}%, the dance ${ms(all / frameN)} ms a frame (${ms(worst)} at most)`);
  console.log(`pasta dance: ${jerks} hard jerks, ${spasms} of them spasms (not in the dance), a ${(spasmy * 100).toFixed(3)}% of bead-frames`);
  console.log(`pasta dance: crawling ${(crawling * 100).toFixed(0)}% of the time, ${moves} times setting off, ${together} of them nearly all at once`);
  console.log(`pasta dance: shake ${shaky.toFixed(4)} a bead a frame, motion ${(motion / Math.max(1, shakeN)).toFixed(4)}`);
  assert.equal(bad, 0, "every bead's place is a number");
  assert.ok(most >= 4, `several come alive (${most})`);
  assert.ok(lineHeads > 8.5, `they rear up high (heads ${lineHeads} high)`);
  assert.ok(spread / Math.max(1, spreadN) > 0.5, "they don't all move alike");
  assert.ok(stretched < 0.3, `the dancers keep their length (worst ${stretched})`);
  assert.ok(spasmy < 0.013, `the dancers don't spasm (${spasms} bead-frames jerked by the physics, not the dance)`);
  assert.ok(crawling < 0.35, `they dance most of the time, crawl less (${(crawling * 100).toFixed(0)}% crawling)`);
  assert.ok(together <= 1, `they don't set off all at once (${together} times)`);
  assert.ok(shaky < 0.06, `their necks move smoothly, no shaking (${shaky} a bead a frame)`);
});
