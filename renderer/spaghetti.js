// The spaghetti: the song's cover (or, without one, one of a dozen bundled pictures) fed through a
// pasta machine. An isometric kitchen, a chrome pasta machine clamped to a table on a floor slab
// floating in the theme's background. Each time round the picture drops into the slot on top as a
// stiff card, a little skew; from the next bar line the crank turns once a beat for 4 bars (then 14
// beats for the noodles to land, and round again), lurching on the beat's hits (pace), and the
// rollers draw it in, and it comes out underneath as spaghetti, each strand a column of the
// picture: a curtain (the picture, stretched), each strand let go with a flick as its tail leaves
// the rollers. They fall in a low gravity and bounce far more than pasta would (noodles.js),
// piling up with the last sheets' (three at most, the oldest shrinking away) and hopping on the kick,
// a few of them coming alive as snakes and dancing to the beat (noodles.js's Dancers). Or endless
// (A): the card stays stuck in the slot on top and the machine never stops, each strand coming out
// without end, the picture again and again along it (links a picture long, joined end to head);
// they spread over the floor on the kick and drip off its edge, the oldest shrinking away when there
// are too many (as many as the noodles can do in 3.5 ms a frame). Timed in bars once the beat's
// found; twice as slow with fewer flashes.
//
// Drawn with WebGL2: the kitchen raymarched once into a cache, colour and depth (spaghetti-kitchen.js,
// again only for a new size or theme); each frame the cache put back with its depth, the noodles'
// shadows on the floor, the crank (raymarched over it), the card going into the slot, and the
// noodles, each a strip facing the eye shaded as a round, wet strand of the picture, its beads read
// from a float texture (a strand a row). Measurements as in spaghetti-kitchen.js's PASTA.
import { PASTA, KITCHEN, CRANK_VERT, CRANK } from './spaghetti-kitchen.js';
import { Noodles, Dancers } from './noodles.js';

// ---------------------------------------------------------------- the pictures

// The picture the spaghetti shows: the song's cover, or without one one of the bundled pictures
// (renderer/pictures), another each time round. Cropped to its middle square, 1024 px, off the main
// thread (createImageBitmap); the last one asked for wins.
const PICTURES = ['01-merian-banana', '02-seba-serpents', '03-brueghel-ark', '04-jakuchu-shells', '05-courbet-loue', '06-hamzanama-grocer',
  '07-sekka-hydrangeas', '08-suzani', '09-shahnama-zal', '10-jnanadakini-mandala', '11-morris-strawberry-thief', '12-limbourg-april'];
class Covers {
  static S = 1024; // the picture's side, px
  pic = null; // the one showing (an ImageBitmap)
  next = null;
  cover = null;
  presets = [];
  loads = 0;

  clear() { this.pic = null; this.next = null; this.cover = null; this.loads++; }

  // A frame: the cover asked for loaded when it changes (without one, at each new round the next
  // bundled picture); one that's loaded takes over when it may (now), or straight away with none
  // showing. True when pic changed.
  update(picture, round, now) {
    if (picture) { if (picture !== this.cover) { this.cover = picture; this.load(picture); } }
    else if (this.cover || round) { this.cover = null; this.load(this.nextPreset()); }
    if (!this.next || !(now || !this.pic)) return false;
    this.pic = this.next;
    this.next = null;
    return true;
  }

  // the bundled pictures, shuffled
  nextPreset() {
    if (!this.presets.length) this.presets = PICTURES.map((n) => [Math.random(), n]).sort((a, b) => a[0] - b[0]).map(([, n]) => n);
    return Object.assign(new Image(), { src: new URL(`./pictures/${this.presets.pop()}.jpg`, import.meta.url).href });
  }

  load(im) {
    const ticket = ++this.loads, S = Covers.S;
    Promise.resolve(im.decode?.()).then(() => {
      const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, side = Math.min(w, h);
      if (!side) return null;
      return createImageBitmap(im, (w - side) / 2, (h - side) / 2, side, side, { resizeWidth: S, resizeHeight: S, resizeQuality: 'high' });
    }).then((bm) => { if (bm && ticket === this.loads) this.next = bm; }, () => {});
  }
}

// ---------------------------------------------------------------- the machine

const ZERO = [0, 0, 0];
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

class Pasta {
  static N = 24; static P = 38; static SLOTS = 4; // strands a sheet, beads a strand, sheets kept
  static LINKS = 240; // endless: links at most
  static HEAD = [1.1, 1.45, 1.6, 1.55, 1.35, 1.1]; // a dancer's head, from its tip: how much thicker
  static SIDE = 16; // the card's side, units
  static LENGTH = (Pasta.P - 1) * Noodles.L; static STRETCH = Pasta.LENGTH / Pasta.SIDE; // a strand's length, over the card's
  static LINK = Pasta.P * Noodles.L; // an endless strand's, a link with its join
  static NIP = 56; static SLOT = 60; // where the card's low corner rests, the slot's top
  static PULL = 0.35;

  constructor(endless = false) {
    const n = endless ? Pasta.LINKS : Pasta.SLOTS * Pasta.N, N = Pasta.N;
    this.endless = endless;
    this.noodles = new Noodles(n, Pasta.P);
    if (endless) this.noodles.floorG = 150;
    this.dancers = new Dancers(this.noodles);
    // each sheet kept: in use, its picture up (as a texture with mipmaps, for the thin strands: the
    // drawing's), the picture that was from, when it began to shrink away; the order they came in;
    // those to put up (the drawing does)
    this.used = [false, false, false, false]; this.pics = [false, false, false, false];
    this.source = [null, null, null, null]; this.goneAt = [null, null, null, null];
    this.order = []; this.copies = new Set();
    // the card: its sheet, when it dropped in, its skew in its own plane (the low corner goes in
    // first), how far it's gone in (units; endless, how much has come out, this card's from cardFrom),
    // the crank's turn (radians, and as drawn) and the beats it's turned for, which strands are out
    this.slot = -1; this.dropAt = 0; this.skew = 0; this.fed = 0; this.cardFrom = 0; this.out = new Array(N).fill(false);
    this.turn = 0; this.crank = 0; this.turned = 0;
    // endless: each column's link coming out and how many it's had; each link's column, picture,
    // age and when it began to shrink away; the picture new links show, links made
    this.cur = new Array(N).fill(-1); this.made = new Array(N).fill(0);
    this.col = new Array(n).fill(0); this.tex = new Array(n).fill(0); this.born = new Array(n).fill(0); this.gone = new Array(n).fill(null);
    this.linkTex = 0; this.links = 0;
    // endless: the links let be (as many as the noodles can do in 3.5 ms a frame: the oldest go sooner
    // on a slow machine), and how long they take a frame (s, smoothed)
    this.keep = Pasta.LINKS - 2 * N; this.cost = 0;
    // the last kick, and when the card last shook to one and how hard
    this.kickSeen = -10; this.shook = { at: -10, k: 0 };
    // endless, a new picture: the last card's sheet while it's pulled into the machine (PULL s, then the
    // new one drops), and the crank's extra turn so far for it
    this.pulled = -1; this.gulped = 0;
    // what's drawn: the beads, a strand a row (x y z, and w: how much thicker it's drawn there), then
    // what it shows (the picture's column, its middle and width in u; how much of it is left, 0-1;
    // its picture); the card's triangles (position, normal, uv: z 0 the picture, 1 the edge; w its picture)
    this.beads = new Float32Array(n * (Pasta.P + 1) * 4);
    this.cardV = new Float32Array(1024 * 12); this.cardCount = 0;
  }

  // Not in use: everything let go (made again when it's back).
  clear() {
    this.cur.fill(-1); this.made.fill(0); this.gone.fill(null); this.pulled = -1;
    this.dancers.clear();
    for (let s = 0; s < this.noodles.strands; s++) this.noodles.kill(s);
    this.used.fill(false); this.pics.fill(false); this.source.fill(null); this.goneAt.fill(null);
    this.order = []; this.copies.clear(); this.slot = -1;
  }

  // A time round (the spaghetti's start()): a new card drops in, on a free sheet; with three lying on
  // the floor already, the oldest begins to shrink away.
  start(t) {
    const live = this.order.filter((s) => this.goneAt[s] === null);
    if (live.length >= 3) this.goneAt[live[0]] = t;
    const free = this.used.indexOf(false);
    if (free < 0) return;
    this.slot = free;
    this.used[free] = true; this.source[free] = null; this.goneAt[free] = null;
    this.order.push(free);
    this.dropAt = t;
    this.skew = (0.03 + 0.05 * Math.random()) * (Math.random() < 0.5 ? 1 : -1);
    this.fed = 0; this.cardFrom = 0; this.turn = 0; this.turned = 0; this.linkTex = free;
    this.out.fill(false);
  }

  // Endless, a new picture: the card in the slot is pulled into the machine at once, the crank
  // whirling, and another drops in in its place; the noodles show it from when it lands.
  drop(t) {
    if (!this.endless || this.slot < 0 || !(this.fed > this.cardFrom)) return; // (not in yet: it shows the new picture itself)
    this.pulled = this.slot; this.gulped = 0;
    this.slot = (this.slot + 1) % Pasta.SLOTS; // shortcut: a picture four songs back is drawn over, on its links still lying there; keep a count per picture if that shows
    this.source[this.slot] = null; this.dropAt = t + Pasta.PULL; this.cardFrom = Infinity;
  }

  // A frame: b beats into the round, the card going in from feed[0] to feed[1] (beats), slow 2 with
  // fewer flashes; pic, the picture the spaghetti has now.
  draw(c, dt, b, feed, slow, pic) {
    const t = c.t, N = Pasta.N, SIDE = Pasta.SIDE, STRETCH = Pasta.STRETCH, noodles = this.noodles;
    if (this.slot < 0) this.start(t);
    if (this.cardFrom === Infinity && t - this.dropAt > 0.95) { this.cardFrom = this.fed; this.linkTex = this.slot; } // (endless, a new card landed)
    // the card's picture: the latest, till it starts going in
    if (this.fed <= this.cardFrom && pic && this.source[this.slot] !== pic) { this.source[this.slot] = pic; this.copies.add(this.slot); }
    // the crank: from the bar line a turn a beat (endless, on and on), lurching on the beat's hits;
    // its lurches come to a turn a beat over a bar, and what's over or short at the end is made up
    const span = (feed[1] - feed[0]) / slow, k = Math.max(0, (b - feed[0]) / slow), at = this.endless ? k : Math.min(span, k);
    this.turn += 2 * Math.PI * Math.max(0, at - this.turned) * this.pace(c);
    this.turned = at;
    if (!this.endless && at >= span) this.turn = 2 * Math.PI * span;
    if (this.pulled >= 0) { // (the last card pulled in: the crank whirls a turn more, and out comes a surge)
      const x = Math.min(1, 1 - (this.dropAt - t) / Pasta.PULL), g = 2 * Math.PI * x * x;
      this.turn += g - this.gulped; this.gulped = g;
      if (x >= 1) this.pulled = -1;
    }
    this.crank = this.turn % (2 * Math.PI);
    // the card drawn in after it, the lurches smoothed (fed in jerks faster than they fall, the strands buckle)
    const total = SIDE * (1 + Math.abs(Math.sin(this.skew))) + 0.5, goal = total * (this.turn / (2 * Math.PI * span));
    const was = this.fed;
    this.fed = Math.max(this.fed, goal - this.fed < 1e-3 ? goal : this.fed + (goal - this.fed) * (1 - Math.exp(-dt / 0.2)));
    const speed = ((this.fed - was) / Math.max(dt, 1e-3)) * STRETCH;
    const lift = Math.max(0, -SIDE * Math.sin(this.skew)); // (the left corner's height over the right's, if that's lower)
    // the strands: as much out as has passed the nip, flicked as they go
    if (!this.endless && this.fed > 0) {
      for (let s = 0; s < N; s++) {
        if (this.out[s]) continue;
        const across = ((s + 0.5) * SIDE) / N, x = -SIDE / 2 + across;
        const len = STRETCH * Math.max(0, this.fed - (lift + across * Math.sin(this.skew)));
        this.out[s] = len >= Pasta.LENGTH;
        noodles.feed(this.slot * N + s, len, [x, 46 - Noodles.R - 0.05, 3], speed, [2.5 * Math.cos(this.crank + s), 3, 9 + 7 * Math.sin(this.crank)]);
      }
    }
    // endless: each column's strand coming out link after link, a picture long each, swaying a little
    if (this.endless && this.fed > 0) {
      const ts = t % 6000;
      for (let s = 0; s < N; s++) {
        const across = ((s + 0.5) * SIDE) / N, len = STRETCH * Math.max(0, this.fed - (lift + across * Math.sin(this.skew)));
        const exit = [-SIDE / 2 + across, 46 - Noodles.R - 0.05, 3];
        const sway = [2 * Math.sin(0.9 * ts + s), 0, 3 + 2 * Math.sin(0.6 * ts + 2 * s)]; // (mostly forward: else they heap under it)
        while (this.made[s] <= Math.floor(len / Pasta.LINK)) {
          if (this.cur[s] >= 0) noodles.feed(this.cur[s], Pasta.LINK, exit, speed, ZERO, sway);
          const k = this.link();
          if (this.cur[s] >= 0) noodles.next[this.cur[s]] = k;
          this.links++;
          this.cur[s] = k; this.made[s]++; this.col[k] = s; this.tex[k] = this.linkTex; this.born[k] = this.links; this.gone[k] = null;
        }
        noodles.feed(this.cur[s], len - (this.made[s] - 1) * Pasta.LINK, exit, speed, ZERO, sway);
      }
      this.retire(t);
    }
    // the kick: the ones lying on the floor hop; endless, as high as they can and still be down a
    // little before the next beat (for its hop), the heap spreading
    if (c.eng.lastKick !== this.kickSeen) {
      this.kickSeen = c.eng.lastKick;
      const P = c.eng.tempo.locked && c.eng.tempo.P > 0 ? c.eng.tempo.P : 0.5;
      noodles.hop(this.endless ? noodles.hopBeat(P) * (c.calm ? 0.5 : 1) : c.calm ? 2.5 : 5, this.endless ? 2 : 0);
      if (Math.random() < 0.3) this.shook = { at: t, k: c.calm ? 0.5 : 1 }; // (the card shakes to some, not all: a rattle on every one is a machine)
    }
    // the oldest sheet shrinking away
    for (let s = 0; s < Pasta.SLOTS; s++) {
      const g = this.goneAt[s];
      if (g === null || t - g <= 1.5) continue;
      for (let i = s * N; i < (s + 1) * N; i++) noodles.kill(i);
      this.used[s] = false; this.goneAt[s] = null; this.order = this.order.filter((o) => o !== s);
    }
    if (!this.endless) this.dancers.update(this.groove(c), Math.min(dt, 0.05), (s) => (this.goneAt[Math.floor(s / N)] === null ? this.order.indexOf(Math.floor(s / N)) + 1 : 0));
    const t0 = performance.now();
    noodles.step(Math.min(dt, 0.05));
    if (this.endless) {
      this.cost += ((performance.now() - t0) / 1000 - this.cost) * 0.05;
      let alive = 0;
      for (const a of noodles.alive) if (a) alive++;
      const fits = (alive * 0.0035) / Math.max(this.cost, 1e-6);
      this.keep += (Math.min(Pasta.LINKS - 2 * N, Math.max(3 * N, fits)) - this.keep) * 0.01; // (eased: all at once, a crowd of them shrinks away together)
    }

    // the beads and what each strand shows
    const P = Pasta.P, W = P + 1, v = this.beads, x = noodles.x, y = noodles.y, z = noodles.z;
    for (let s = 0; s < noodles.strands; s++) {
      for (let j = 0; j < P; j++) { const i = s * P + j, o = 4 * (s * W + j); v[o] = x[i]; v[o + 1] = y[i]; v[o + 2] = z[i]; v[o + 3] = 1; }
      if (noodles.swell[s] > 0) Pasta.HEAD.forEach((h, j) => { v[4 * (s * W + j) + 3] = 1 + (h - 1) * noodles.swell[s]; });
    }
    for (let s = 0; s < noodles.strands; s++) { // (a join drawn whole: both ends at its middle)
      if (!noodles.alive[s] || noodles.next[s] < 0) continue;
      const a = 4 * (s * W + P - 1), e = 4 * noodles.next[s] * W;
      for (let d = 0; d < 3; d++) { const m = (v[a + d] + v[e + d]) / 2; v[a + d] = m; v[e + d] = m; }
    }
    for (let s = 0; s < noodles.strands; s++) {
      const o = 4 * (s * W + P), sheet = this.endless ? this.tex[s] : Math.floor(s / N), g = this.endless ? this.gone[s] : this.goneAt[sheet];
      const left = g === null ? 1 : 1 - ease((t - g) / 1.5);
      v[o] = ((this.endless ? this.col[s] : s % N) + 0.5) / N; v[o + 1] = 1 / N;
      v[o + 2] = noodles.alive[s] && this.pics[sheet] ? left : 0; v[o + 3] = sheet;
    }
    this.card(t - this.dropAt, t - this.shook.at);
  }

  // Endless: a link from those not in use, or failing that the oldest there is, gone at once.
  link() {
    const n = this.noodles;
    for (let k = 0; k < n.strands; k++) if (!n.alive[k] && !this.cur.includes(k)) return k;
    let k = -1;
    for (let j = 0; j < n.strands; j++) if (!this.cur.includes(j) && (k < 0 || this.born[j] < this.born[k])) k = j;
    n.kill(k);
    return k;
  }
  // Endless: the oldest links (the strands' far ends) shrink away while there are more than keep, or
  // there'd be no end to the work; those dripped into the void are gone already.
  retire(t) {
    const n = this.noodles;
    let kept = 0;
    for (let k = 0; k < n.strands; k++) if (n.alive[k] && this.gone[k] === null) kept++;
    while (kept > this.keep) {
      let k = -1;
      for (let j = 0; j < n.strands; j++) if (n.alive[j] && this.gone[j] === null && !this.cur.includes(j) && (k < 0 || this.born[j] < this.born[k])) k = j;
      if (k < 0) break;
      this.gone[k] = t; kept--;
    }
    for (let k = 0; k < n.strands; k++) { const g = this.gone[k]; if (g !== null && (t - g > 1.5 || !n.alive[k])) { n.kill(k); this.gone[k] = null; } }
  }

  // How fast the crank turns now, against a turn a beat: a lurch on each hit of the bar's pattern (a
  // kick's the biggest, then a snare's, a hat's a little; on the beats with none heard), slower
  // between, a turn a beat over the bar. Smooth without a beat.
  pace(c) {
    const eng = c.eng, p = eng.placeAt(c.t + c.offset);
    if (!p) return 1;
    const w = new Array(16).fill(0);
    for (const [id, k] of [['bd', 1], ['sd', 0.8], ['hhc', 0.25], ['hho', 0.25]]) { const on = eng.v[id].on; for (let s = 0; s < 16; s++) if (on[s]) w[s] += k; }
    if (!w.some((x) => x > 0)) for (let s = 0; s < 16; s += 4) w[s] = 1;
    const bar = p.beatF - eng.tempo.down, rise = 0.06, base = 0.3; // (a lurch peaks rise beats after its hit)
    let v = base, area = 4 * base;
    for (let s = 0; s < 16; s++) {
      if (!(w[s] > 0)) continue;
      const d = bar - s / 4, x = (d - 4 * Math.floor(d / 4)) / rise;
      v += w[s] * x * Math.exp(1 - x);
      area += w[s] * rise * Math.E;
    }
    return (v * 4) / area;
  }

  // what the dancers hear
  groove(c) {
    const eng = c.eng, T = eng.tempo, p = eng.placeAt(c.t + c.offset), bd = eng.v.bd.on;
    return {
      t: c.t, P: T.locked && T.P > 0 ? T.P : 0.5, beat: p ? p.beatF - T.down : null,
      kick: eng.lastKick, snare: eng.v.sd.lastHit.t, hat: eng.v.hhc.lastHit.t, openHat: eng.v.hho.lastHit.t,
      bass: eng.lastBassHit?.t ?? -10, bassF0: eng.lastBassHit?.f0 ?? 60, drop: eng.lastDrop,
      level: eng.level, silent: eng.silent, calm: c.calm, fourOnFloor: bd[0] && bd[4] && bd[8] && bd[12],
    };
  }

  // The card, as it is s seconds after it dropped: falling into the slot from above, landing with a
  // wobble, then drawn down; the part above the slot leans back a little, bowed; j seconds after it
  // last shook to a kick, jolted up, rattling and rocking. Its front (the picture) in a grid, its top
  // edge (card stock) over it. (Endless, s < 0: the last card, pulled in, faster and faster.)
  card(since, j) {
    this.cardCount = 0;
    const SIDE = Pasta.SIDE, pulling = since < 0 && this.pulled >= 0, sheet = pulling ? this.pulled : this.slot, x = 1 + since / Pasta.PULL, s = pulling ? 9 : since;
    const total = SIDE * (1 + Math.abs(Math.sin(this.skew))) + 0.5, into = !this.endless ? Math.max(0, this.fed - this.cardFrom) : pulling ? total * x * x : 0; // (endless, stuck there till then)
    if (sheet < 0 || !this.pics[sheet] || into >= total) return;
    const land = 0.95, fall = s < land ? 35 * (1 - (s * s) / (land * land)) : 0, tl = Math.max(0, s - land);
    const jolt = s < land ? 0 : this.shook.k * Math.exp(-9 * j), tilt = this.skew + 0.05 * jolt * Math.sin(29 * j);
    const hop = s < land ? 0 : 0.7 * Math.exp(-7 * tl) * Math.abs(Math.sin(11 * tl)) + 0.8 * jolt * Math.abs(Math.sin(17 * j));
    const lean = 0.1 + (s < land ? 0.05 : 0.14 * Math.exp(-3.5 * tl) * Math.sin(13 * tl) + 0.1 * jolt * Math.sin(21 * j));
    const cx = Math.cos(tilt), sx = Math.sin(tilt);
    const x0 = (-SIDE / 2) * cx, y0 = Pasta.NIP + Math.max(0, -SIDE * sx) + fall + hop - into;
    const v = this.cardV;
    const put = (a, b, n0, n1, n2, u0, u1, u2, back) => {
      if (this.cardCount >= 1024) return;
      const y = y0 + sx * a + cx * b, over = Math.max(0, y - Pasta.SLOT), m = (a / SIDE - 0.5) * 2, o = 12 * this.cardCount++;
      v[o] = x0 + cx * a - sx * b; v[o + 1] = y; v[o + 2] = 3 - over * Math.tan(lean) - 0.3 * (1 - m * m) * Math.min(1, over / 4); v[o + 3] = 1; // (leaning on nothing but the slot's back, bowed)
      if (back) { v[o + 1] += Math.sin(lean) * 0.2; v[o + 2] -= Math.cos(lean) * 0.2; }
      v[o + 4] = n0; v[o + 5] = n1; v[o + 6] = n2; v[o + 7] = 0;
      v[o + 8] = u0; v[o + 9] = u1; v[o + 10] = u2; v[o + 11] = sheet;
    };
    const C = 8, R = 10, S = SIDE, fy = Math.sin(lean), fz = Math.cos(lean);
    for (let r = 0; r < R; r++) {
      for (let col = 0; col < C; col++) {
        for (const [dc, dr] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
          const a = (S * (col + dc)) / C, b = (S * (r + dr)) / R;
          put(a, b, 0, fy, fz, a / S, 1 - b / S, 0, false);
        }
      }
    }
    for (let col = 0; col < C; col++) {
      for (const [dc, back] of [[0, false], [1, false], [1, true], [0, false], [1, true], [0, true]]) put((S * (col + dc)) / C, S, 0, fz, -fy, 0, 0, 1, back);
    }
  }
}

// ---------------------------------------------------------------- the pasta's own shaders

// a triangle over the whole canvas
const FULL = `#version 300 es
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

// the cached kitchen, its colour and depth, into the frame
const COPY = `#version 300 es
precision highp float;
uniform sampler2D color;
uniform highp sampler2D depth;
out vec4 o;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  o = texelFetch(color, p, 0);
  gl_FragDepth = texelFetch(depth, p, 0).r;
}`;

// one of the (up to four) sheets' pictures
const PIC = `
uniform sampler2D p0, p1, p2, p3;
vec3 pasta_pic(float i, vec2 uv) {
  return (i < 0.5 ? texture(p0, uv) : i < 1.5 ? texture(p1, uv) : i < 2.5 ? texture(p2, uv) : texture(p3, uv)).rgb;
}`;

// a strand (instance): its beads, a row of the texture (P each; w: how much thicker it is there, a
// dancer's head), then what it shows (the picture's column, its middle and width in u; how much of
// it is left, 0-1; its picture). The bead j of strand iid and which way the strand runs there; a
// strand's vertices go two per bead.
const STRAND = `
uniform highp sampler2D beads;
uniform int P;
vec3 pasta_bead(int iid, int j, out vec3 T) {
  vec3 d = texelFetch(beads, ivec2(min(j + 1, P - 1), iid), 0).xyz - texelFetch(beads, ivec2(j > 0 ? j - 1 : 0, iid), 0).xyz;
  T = length(d) > 1e-5 ? normalize(d) : vec3(0.0, -1.0, 0.0);
  return texelFetch(beads, ivec2(j, iid), 0).xyz;
}`;

const NOODLE_VERT = `#version 300 es
${PASTA}
${STRAND}
out float vs;      // across it, -1 to 1
out vec3 vside;    // which way across it is (world), as on the screen
out vec3 vfront;   // and toward the eye, square to it
out vec2 vuv;
out float vy;      // its height over the floor
out float vr;      // its radius, units
flat out float vpic;
void main() {
  int j = gl_VertexID >> 1, iid = gl_InstanceID;
  float side = (gl_VertexID & 1) != 0 ? 1.0 : -1.0;
  vec3 T;
  vec3 p = pasta_bead(iid, j, T);
  vec4 st = texelFetch(beads, ivec2(P, iid), 0);
  float r = u.r * st.z * texelFetch(beads, ivec2(j, iid), 0).w;
  // seen from the eye a round strand is a band as wide as it is, across it square to the eye's ray
  vec3 W = cross(T, PASTA_EYE);
  W = length(W) > 1e-4 ? normalize(W) : PASTA_R;
  vec2 across = vec2(dot(W, PASTA_R), -dot(W, PASTA_UP));
  vec2 at = pasta_px(p) + across * side * r * u.scale;
  // its ends: a little past the last bead (most of the end's round)
  vec2 along = vec2(dot(T, PASTA_R), -dot(T, PASTA_UP));
  if (j == 0) at -= along * r * 0.7 * u.scale;
  if (j == P - 1) at += along * r * 0.7 * u.scale;
  gl_Position = vec4(at.x / u.view.x * 2.0 - 1.0, 1.0 - at.y / u.view.y * 2.0, st.z > 0.0 ? pasta_depth(p) * 2.0 - 1.0 : 2.0, 1.0); // (none left: past the far plane)
  vs = side;
  vside = W;
  vfront = normalize(PASTA_EYE - T * dot(PASTA_EYE, T) + 1e-5);
  vuv = vec2(st.x + side * st.y * 0.5, 1.0 - float(j) / float(P - 1)); // (its head, out first, is the picture's foot)
  vy = p.y;
  vr = r;
  vpic = st.w;
}`;

const NOODLE = `#version 300 es
${PASTA}
${PIC}
in float vs;
in vec3 vside;
in vec3 vfront;
in vec2 vuv;
in float vy;
in float vr;
flat in float vpic;
out vec4 o;
void main() {
  float s = clamp(vs, -1.0, 1.0), c = sqrt(max(0.0, 1.0 - s * s));
  vec3 n = normalize(vside * s + vfront * c);
  // the picture, a little warmed toward the dough it's printed in
  vec3 base = pasta_pic(vpic, vuv);
  base = mix(base, base * vec3(1.0, 0.92, 0.74) + vec3(0.05, 0.04, 0.0), 0.18);
  vec3 H = normalize(PASTA_L + PASTA_EYE);
  // soft light that wraps round it (cooked pasta lets some through), the room's light from above,
  // darker underneath where it lies on the floor or the others
  float wrap = clamp((dot(n, PASTA_L) + 0.45) / 1.45, 0.0, 1.0);
  float sky = 0.6 + 0.4 * n.y;
  float under = mix(0.5, 1.0, smoothstep(-0.2, 1.4, vy - vr + (n.y + 1.0) * vr));
  vec3 col = base * (0.36 * sky + 0.8 * wrap) * under;
  col += base * pow(1.0 - c, 3.0) * 0.22 * vec3(1.0, 0.86, 0.62); // light through its edge
  float nh = clamp(dot(n, H), 0.0, 1.0);
  col += (pow(nh, 80.0) * 0.6 + pow(nh, 14.0) * 0.07) * vec3(1.0, 0.97, 0.9) * under; // wet
  o = vec4(col, 1.0);
  gl_FragDepth = gl_FragCoord.z - vr * c * dot(vfront, PASTA_EYE) / 400.0;
}`;

// its shadow: the strand laid on the floor along the light, softer and fainter the higher it is
const SHADOW_VERT = `#version 300 es
${PASTA}
${STRAND}
out float vs;
out float va;
out vec2 vxz;
void main() {
  int j = gl_VertexID >> 1, iid = gl_InstanceID;
  float side = (gl_VertexID & 1) != 0 ? 1.0 : -1.0;
  vec3 T;
  vec3 p = pasta_bead(iid, j, T);
  vec4 st = texelFetch(beads, ivec2(P, iid), 0);
  float h = max(p.y, 0.0);
  vec3 q = p - PASTA_L * (h / PASTA_L.y);
  q.y = 0.04;
  vec3 Tq = T - PASTA_L * (T.y / PASTA_L.y);
  Tq.y = 0.0;
  vec3 W = length(Tq) > 1e-4 ? normalize(vec3(-Tq.z, 0.0, Tq.x)) : vec3(1.0, 0.0, 0.0);
  float w = u.r * st.z * texelFetch(beads, ivec2(j, iid), 0).w * (2.2 + 0.09 * h); // (lying down, a soft dark rim round it on the floor)
  gl_Position = pasta_clip(q + W * side * w);
  vs = side;
  va = p.y < -0.5 ? 0.0 : 0.5 * st.z / (1.0 + 0.2 * h);
  vxz = q.xz;
}`;

const SHADOW = `#version 300 es
${PASTA}
in float vs;
in float va;
in vec2 vxz;
out vec4 o;
void main() {
  if (abs(vxz.x) > PASTA_FLOOR || abs(vxz.y) > PASTA_FLOOR) discard;
  float a = va * (1.0 - smoothstep(0.0, 1.0, abs(vs)));
  o = vec4(0.0, 0.0, 0.0, a);
}`;

// the cover: a stiff square card, its picture on the front, card stock on its edge
const CARD_VERT = `#version 300 es
${PASTA}
layout(location = 0) in vec4 cp;
layout(location = 1) in vec4 cn;
layout(location = 2) in vec4 cuv; // (z 0 the picture, 1 the edge; w its picture)
out vec3 vn;
out vec2 vuv;
out float vkind;
flat out float vpic;
void main() { gl_Position = pasta_clip(cp.xyz); vn = cn.xyz; vuv = cuv.xy; vkind = cuv.z; vpic = cuv.w; }`;

const CARD = `#version 300 es
${PASTA}
${PIC}
in vec3 vn;
in vec2 vuv;
in float vkind;
flat in float vpic;
out vec4 o;
void main() {
  vec3 n = normalize(vn);
  vec3 base = vkind < 0.5 ? pasta_pic(vpic, vuv) : vec3(0.9, 0.88, 0.83);
  vec3 H = normalize(PASTA_L + PASTA_EYE);
  float lit = 0.42 * (0.6 + 0.4 * n.y) + 0.72 * clamp(dot(n, PASTA_L), 0.0, 1.0);
  vec3 col = base * lit + pow(clamp(dot(n, H), 0.0, 1.0), 40.0) * 0.18 * vec3(1.0, 0.98, 0.94); // a printed sleeve's sheen
  o = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------- the background

const FIT = { w: 150, h: 115, mid: 10.7 }; // what's seen, in units across and up, and its middle's height
const LONG = 2048; // the canvas's longest side, px
// (a fresh compile is left a moment after it's done before it's drawn with, as the chrome's is; one
// done within QUICK_MS of being asked came from the shader cache, and is used at once)
const SETTLE_MS = 1500, QUICK_MS = 150;

export function createSpaghetti(canvas) {
  let gl = null, ok = false, built = false, par = null, jobs = null, progs = {}, empty = null, cardVao = null, cardBuf = null;
  let beadTex = null, dummy = null, cache = null;
  const pics = [null, null, null, null]; // each sheet's picture, with mipmaps
  // the time round (Spaghetti.swift's): the machine, the pictures; whether it's started, a new round
  // (for the pictures), beats into it, where its parts end (the crank starts, stops, the noodles have
  // landed), how slow
  let pasta = new Pasta(), started = false, round = false, b = 0, feed = [0, 0], end = 0, slow = 1, last = 0;
  const covers = new Covers();

  const UNIFORMS = ['u.view', 'u.origin', 'u.scale', 'u.crank', 'u.r', 'u.bg', 'pass', 'centre', 'centreInfo', 'centreDepth', 'color', 'depth', 'beads', 'P', 'p0', 'p1', 'p2', 'p3'];
  // A program started now, compiled in the background where the driver can; finish() looks at it
  // once it's done.
  const program = ([vert, frag]) => {
    const pr = gl.createProgram(), vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, vert);
    gl.compileShader(vs);
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    return { pr, vs, fs };
  };
  const texture = (w, h, format, filter = gl.NEAREST, levels = 1) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, levels, format, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.NEAREST ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const target = (colors, depth = null) => {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    colors.forEach((t, k) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + k, gl.TEXTURE_2D, t, 0));
    if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    gl.drawBuffers(colors.map((t, k) => gl.COLOR_ATTACHMENT0 + k));
    return f;
  };
  function build() {
    ok = false;
    gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: false });
    if (!gl) return;
    par = gl.getExtension('KHR_parallel_shader_compile');
    const list = { kitchen: [FULL, KITCHEN], crank: [CRANK_VERT, CRANK], copy: [FULL, COPY], shadow: [SHADOW_VERT, SHADOW], card: [CARD_VERT, CARD], noodle: [NOODLE_VERT, NOODLE] };
    jobs = { at: performance.now(), done: 0, progs: Object.fromEntries(Object.entries(list).map(([k, v]) => [k, program(v)])) };
    empty = gl.createVertexArray();
    cardVao = gl.createVertexArray();
    gl.bindVertexArray(cardVao);
    cardBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cardBuf);
    for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, 4, gl.FLOAT, false, 48, 16 * k); }
    gl.bindVertexArray(null);
    beadTex = texture(Pasta.P + 1, Pasta.LINKS, gl.RGBA32F);
    dummy = texture(1, 1, gl.RGBA8);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    pics.fill(null);
    cache = null;
  }
  // The programs done and settled: their places found, and the spaghetti can draw. False till then,
  // and for good if one failed.
  function finish() {
    if (!jobs) return false;
    const now = performance.now(), all = Object.values(jobs.progs);
    if (!jobs.done) {
      if (par && !all.every((j) => gl.getProgramParameter(j.pr, par.COMPLETION_STATUS_KHR))) return false;
      jobs.done = now;
    }
    if (par && jobs.done - jobs.at > QUICK_MS && now - jobs.done < SETTLE_MS) return false;
    const bad = all.find((j) => !gl.getProgramParameter(j.pr, gl.LINK_STATUS));
    if (bad) {
      if (!gl.isContextLost()) console.error('spaghetti:', gl.getShaderInfoLog(bad.vs) || gl.getShaderInfoLog(bad.fs) || gl.getProgramInfoLog(bad.pr));
      jobs = null;
      return false;
    }
    progs = Object.fromEntries(Object.entries(jobs.progs).map(([k, j]) => {
      const loc = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(j.pr, n)]));
      gl.useProgram(j.pr);
      // (the textures' units: the pictures 0-3, the beads 4; the kitchen's first pass 0-2, the cache 0-1)
      [['p0', 0], ['p1', 1], ['p2', 2], ['p3', 3], ['beads', 4], ['centre', 0], ['centreInfo', 1], ['centreDepth', 2], ['color', 0], ['depth', 1]].forEach(([n, k]) => loc[n] && gl.uniform1i(loc[n], k));
      if (loc.P) gl.uniform1i(loc.P, Pasta.P);
      return [k, { pr: j.pr, loc }];
    }));
    jobs = null;
    ok = true;
    return true;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ok = false; });
  canvas.addEventListener('webglcontextrestored', () => { build(); pasta.pics.fill(false); pasta.source.forEach((s, k) => s && pasta.copies.add(k)); });

  // the uniforms (Pasta.h's PastaU) into a program
  let U = null;
  const use = (name) => {
    const { pr, loc } = progs[name];
    gl.useProgram(pr);
    gl.uniform2fv(loc['u.view'], U.view);
    gl.uniform2fv(loc['u.origin'], U.origin);
    gl.uniform1f(loc['u.scale'], U.scale);
    gl.uniform1f(loc['u.crank'], U.crank);
    gl.uniform1f(loc['u.r'], U.r);
    gl.uniform3fv(loc['u.bg'], U.bg);
    return loc;
  };
  const bind = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };

  // The kitchen into the cache: each pixel's centre (colour; normal and material; depth), then the
  // edges' extra rays over that.
  function kitchen(W, H, key) {
    if (cache) { gl.deleteTexture(cache.color); gl.deleteTexture(cache.depth); }
    const first = texture(W, H, gl.RGBA8), info = texture(W, H, gl.RGBA8), depth = texture(W, H, gl.DEPTH_COMPONENT32F), color = texture(W, H, gl.RGBA8);
    const f0 = target([first, info], depth), f1 = target([color]);
    gl.viewport(0, 0, W, H);
    gl.bindVertexArray(empty);
    gl.disable(gl.BLEND);
    const loc = use('kitchen');
    gl.bindFramebuffer(gl.FRAMEBUFFER, f0);
    for (let k = 0; k < 3; k++) bind(k, dummy);
    gl.uniform1i(loc.pass, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f1);
    gl.disable(gl.DEPTH_TEST);
    bind(0, first); bind(1, info); bind(2, depth);
    gl.uniform1i(loc.pass, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let k = 0; k < 3; k++) bind(k, null);
    gl.deleteFramebuffer(f0); gl.deleteFramebuffer(f1); gl.deleteTexture(first); gl.deleteTexture(info);
    cache = { color, depth, W, H, key };
  }

  // The frame: the kitchen (drawn again only for a new size or theme), a sheet's new picture, then
  // the kitchen put back with its depth, the noodles' shadows on the floor, the crank, the card, the
  // noodles.
  function encode(col) {
    const dpr = devicePixelRatio || 1, k = Math.min(dpr, LONG / Math.max(1, innerWidth, innerHeight));
    const W = Math.max(1, Math.round(innerWidth * k)), H = Math.max(1, Math.round(innerHeight * k));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const scale = Math.min(W / FIT.w, H / FIT.h);
    U = { view: [W, H], origin: [W / 2, H / 2 + FIT.mid * scale], scale, crank: pasta.crank, r: Noodles.R, bg: col.bg.map((v) => v / 255) };
    const key = col.bg.join();
    if (!cache || cache.W !== W || cache.H !== H || cache.key !== key) kitchen(W, H, key);
    for (const s of pasta.copies) {
      const src = pasta.source[s];
      if (!src) continue;
      if (!pics[s]) { pics[s] = texture(Covers.S, Covers.S, gl.RGBA8, gl.LINEAR_MIPMAP_LINEAR, Math.log2(Covers.S) + 1); }
      bind(0, pics[s]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      pasta.pics[s] = true;
    }
    pasta.copies.clear();
    const strands = pasta.noodles.strands;
    bind(4, beadTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Pasta.P + 1, strands, gl.RGBA, gl.FLOAT, pasta.beads);
    const any = pics.find((p) => p) || dummy;
    for (let s = 0; s < 4; s++) bind(s, pics[s] || any);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.bindVertexArray(empty);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // the kitchen, with its depth
    bind(0, cache.color); bind(1, cache.depth);
    use('copy');
    gl.disable(gl.BLEND);
    gl.depthFunc(gl.ALWAYS);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    for (let s = 0; s < 4; s++) bind(s, pics[s] || any);
    // the noodles' shadows on the floor, the crank, the card, the noodles
    use('shadow');
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * Pasta.P, strands);
    use('crank');
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
    if (pasta.cardCount > 0) {
      use('card');
      gl.bindVertexArray(cardVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cardBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pasta.cardV.subarray(0, 12 * pasta.cardCount), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, pasta.cardCount);
      gl.bindVertexArray(empty);
    }
    use('noodle');
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * Pasta.P, strands);
  }

  // A new time round: the card in for a bar, the crank starting on a bar line once the beat's found.
  function start(c) {
    slow = c.calm ? 2 : 1;
    let whole = 4 * slow;
    const p = c.eng.placeAt(c.t);
    if (p) {
      const x = p.beatF - c.eng.tempo.down + whole;
      whole += (4 - (x - 4 * Math.floor(x / 4))) % 4;
    }
    feed = [whole, whole + 16 * slow];
    end = pasta.endless ? Infinity : whole + 30 * slow;
    b = 0;
    round = true;
    pasta.start(c.t);
  }

  return {
    get broken() { return !ok; },
    // (compiling: its programs started and not yet done)
    get waiting() { return !!jobs && !ok; },
    // Not in use: everything let go (made again when it's back).
    clear() {
      pasta.clear(); covers.clear(); started = false;
      if (ok) {
        if (cache) { gl.deleteTexture(cache.color); gl.deleteTexture(cache.depth); cache = null; }
        pics.forEach((p) => p && gl.deleteTexture(p));
        pics.fill(null);
      }
      canvas.width = canvas.height = 1;
    },
    // col: the theme's colours; calm: fewer flashes; offset: how far ahead to draw (see syncOffset);
    // picture: the song's cover (an image), or null for the bundled ones; endless: the endless kind
    draw(t, eng, { col, calm = false, offset = 0, picture = null, endless = false }) {
      if (!built) { built = true; build(); }
      if (!ok && !finish()) return;
      if (endless !== pasta.endless) { pasta = new Pasta(endless); started = false; }
      const c = { t, eng, calm, offset };
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (!started) { start(c); started = true; }
      b += dt / (eng.tempo.locked && eng.tempo.P > 0 ? eng.tempo.P : 0.5);
      if (b >= end) start(c);
      if (covers.update(picture, round, true)) pasta.drop(t); // (endless: a new picture's card dropped in)
      round = false;
      pasta.draw(c, dt, b, feed, slow, covers.pic);
      encode(col);
    },
  };
}
