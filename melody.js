// The export's melody, from the notes Spotify's Basic Pitch hears in what Toaster heard (its notes: [start s, length s, midi,
// loudness 0..1], in the engine's seconds). Before this the lead was the engine's own guess per 16th, and it was at chance: measured
// Nov 11 against 14 songs' sung melodies (demucs vocals), it matched the voice in 1% of the sung moments; Basic Pitch's top line in
// the voice's range matched 38% (the right note 80% of the time when it plays), and put into the export it made the songs more
// recognisable to a cover-song score (backlog/engineering/qmax.py: mean 0.27 -> 0.38). Only the export uses it; nothing live does.

// The top line: the notes in the voice's range loud enough to be a tune, each kept unless a higher one covers most of it, then no
// overlaps (a note ends where the next begins). lo/hi: midi (G3 to E6); minAmp: Basic Pitch's loudness floor for a melody note.
// Overtones first: Basic Pitch sometimes hears a strong note's overtones as notes of their own, an octave, an octave and a fifth
// or two octaves up, and the top line would take the overtone. A note that far above a note of the line's own (in range, loud
// enough) at least 0.8 as loud, which sounds through most of it, is that note's overtone and is left out. Measured Nov 11 on 14
// songs' sung melodies: the line's note exactly the voice's 73% -> 77% of the time it plays (an octave out 7% -> 4%), playing as
// often; no song worse, Starships' line right 54% -> 70%.
const OVERTONES = [12, 19, 24];
const overlap = (a, b) => Math.max(0, Math.min(a[0] + a[1], b[0] + b[1]) - Math.max(a[0], b[0]));
export function topLine(notes, { lo = 55, hi = 88, minAmp = 0.3 } = {}) {
  const inRange = notes.filter(([, , m, a]) => m >= lo && m <= hi && a >= minAmp).sort((x, y) => x[0] - y[0]);
  const overtone = (a) => inRange.some((b) => b !== a && OVERTONES.includes(a[2] - b[2]) && b[3] >= 0.8 * a[3] && overlap(a, b) >= 0.5 * a[1]);
  const voiced = inRange.filter((a) => !overtone(a));
  const kept = voiced.filter((a) => {
    let covered = 0;
    for (const b of voiced) if (b !== a && b[2] > a[2]) covered += overlap(a, b);
    return covered < 0.5 * a[1];
  }).map(([t, d, m]) => [t, d, m]);
  for (let i = 0; i + 1 < kept.length; i++) kept[i][1] = Math.min(kept[i][1], Math.max(0.03, kept[i + 1][0] - kept[i][0]));
  return kept;
}

// The tune as a path through what Basic Pitch heard, frame by frame (rows of its "frames" answer: how strongly each of the 88
// notes from A0 sounds, 86 rows a second), not from the notes it makes of them. Its note-maker wants a clear start for every note
// and so had a note for only half of what a voice sings; the frames show the voice through most of it. The path holds one note
// of the voice's range or a rest at each frame and is the one that scores most (Viterbi): a note scores how strongly it sounds
// above `floor` (under it a rest scores more), less `overtone` times the note an octave under it (an overtone of a louder note
// below is not the tune); changing note costs `jump` an octave (a tune moves by steps more than leaps; a rest is free). Notes
// shorter than `shortest` frames are left out.
// The path alone holds a pitch through syllables sung again on it ("star-ships-were-meant-to-fly" came out as one long note):
// `strikes` are the starts of Basic Pitch's own notes ([[frame, midi]]), and a note of the path is struck again where one falls
// inside it on its pitch (5 frames or more from its start and from the strike before, 3 from its end).
// Measured Nov 11 on 16 songs, 30 s each (backlog/engineering/ladder.py, melodystarts.py, qmax-matrix.py), against the top line
// of Basic Pitch's notes, which this replaced. Of the moments the voice sings (14 songs' vocal stems), on its note: 38% -> 59%
// (when it plays, right 81% -> 79%; as written on the 16ths, 34% -> 54%). Of the note starts Basic Pitch hears in the voice
// alone, found: 46% -> 75%. The exports to the cover-song score: 10 -> 12 of 16 recognisable, mean 0.40 -> 0.50, no song lower
// by more than 0.03 (One More Time 0.48 -> 0.77, Doechii 0.24 -> 0.73, Gotye 0.26 -> 0.56). It writes more notes
// (1.3 -> 3.4 a second). A cost for beginning a note or for changing it (calmer lines, 2.4 to 2.7 notes a second) scored lower
// on every one of these. Cutting the lows, or keeping only the middle of the stereo picture, before Basic Pitch: worse at every
// setting. The voice alone (a separated stem) would give 70 to 77%: the next step up is a separator, not a setting.
// -> [[first frame, frames, midi, mean strength]]
export function pathLine(rows, opts = {}) {
  if (opts.register && opts.centre == null) {
    const first = pathLine1(rows, { ...opts, register: 0 }); // (the first pass: where does this song's line sit?)
    if (!first.length) return first;
    const all = [];
    for (const [, n, m] of first) for (let i = 0; i < n; i++) all.push(m);
    all.sort((a, b) => a - b);
    return pathLine1(rows, { ...opts, centre: all[all.length >> 1] });
  }
  return pathLine1(rows, opts);
}
// The defaults since Nov 12 (measured on 14 sung songs, 30 s each, backlog/ENGINEERING-NOV10.md "the tune a person can follow"):
// tune notes per sung note 2.35 -> 1.25, octave hops per 10 s 3.9 -> 0.5, a note struck again 0.39 -> 0.12 per sung note, playing in
// the voice's silences 0.48 -> 0.31; on the voice's note when it plays 0.82 -> 0.84; sung moments covered 0.74 -> 0.60 (the price).
// `register` (off): tried at 0.5 to 2, it moved those counts by 0.01 to 0.03 and can drop a true low note, so it stays an option.
// The old behaviour: { floor: 0.2, jump: 0.3, shortest: 6, octave: 1, enter: 0, dip: 0, bridge: 0, forget: 0, register: 0 }.
function pathLine1(rows, { low = 21, lo = 55, hi = 88, floor = 0.25, jump = 1.0, overtone = 0.3, shortest = 8, strikes = [], octave = 3, enter = 0.6, dip = 0.5, bridge = 4, forget = 0.6, register = 0, centre = null } = {}) {
  const T = rows.length, P = hi - lo + 1, S = P + 1, off = lo - low; // (state 0 is the rest; state b + 1 the note lo + b)
  if (!T) return [];
  const cost = new Float64Array(P * P);
  // (a move of 11 semitones or more costs `octave` times a full jump: a voice does not leap an octave and back inside a phrase)
  for (let a = 0; a < P; a++) for (let b = 0; b < P; b++) { const d = Math.abs(a - b); cost[a * P + b] = d >= 11 ? jump * octave : jump * d / 12; }
  const back = new Uint8Array(T * S);
  const path = new Uint8Array(T);
  // (`register`: a voice keeps to its own part of the keyboard. With the middle of a first pass's line as `centre`, a note more than
  // a fourth under it pays `register` for each octave further down: those were the chords' notes the path fell to between phrases.)
  const low2 = new Float64Array(P);
  if (register && centre != null) for (let b = 0; b < P; b++) low2[b] = register * Math.max(0, (centre - 5) - (lo + b)) / 12;
  if (forget) {
    // The path REMEMBERS its last note through a rest. Before, a rest was free to fall to and to leave, so the dearest move
    // (an octave) cost nothing if the path blinked through one frame of rest on the way: F#4 F#5 F#4 inside a tenth of a second.
    // Now a rest after note a is its own state: coming back from it to note b costs the same jump as a -> b; only after
    // paying `forget` (once) is the rest a plain one, from which any note costs `enter`.
    const R = P, S2 = 1 + P + R; // 0: the plain rest; 1..P: the notes; P+1..2P: a rest that remembers note (index - P - 1)
    const back2 = new Uint8Array(T * S2);
    let sc = new Float64Array(S2), nx = new Float64Array(S2);
    for (let t = 0; t < T; t++) {
      const row = rows[t];
      let bestR = 0; // (the best remembering rest, to fall to the plain one)
      for (let a = 1; a < R; a++) if (sc[1 + P + a] > sc[1 + P + bestR]) bestR = a;
      if (sc[1 + P + bestR] - forget > sc[0]) { nx[0] = sc[1 + P + bestR] - forget; back2[t * S2] = 1 + P + bestR; } else { nx[0] = sc[0]; back2[t * S2] = 0; }
      for (let b = 0; b < P; b++) {
        let best = sc[0] - enter, from = 0;
        for (let a = 0; a < P; a++) {
          const c = cost[a * P + b];
          const v = sc[a + 1] - c; if (v > best) { best = v; from = a + 1; }
          const w = sc[1 + P + a] - c; if (w > best) { best = w; from = 1 + P + a; }
        }
        nx[b + 1] = best + row[off + b] - floor - (b >= 12 ? overtone * row[off + b - 12] : 0) - low2[b];
        back2[t * S2 + b + 1] = from;
        if (sc[b + 1] >= sc[1 + P + b]) { nx[1 + P + b] = sc[b + 1]; back2[t * S2 + 1 + P + b] = b + 1; } else { nx[1 + P + b] = sc[1 + P + b]; back2[t * S2 + 1 + P + b] = 1 + P + b; }
      }
      [sc, nx] = [nx, sc];
    }
    let k = 0;
    for (let s2 = 1; s2 < S2; s2++) if (sc[s2] > sc[k]) k = s2;
    for (let t = T - 1; t >= 0; t--) { path[t] = k >= 1 && k <= P ? k : 0; k = back2[t * S2 + k]; }
  } else {
  let score = new Float64Array(S), next = new Float64Array(S);
  for (let t = 0; t < T; t++) {
    const row = rows[t];
    let top = 0;
    for (let s = 1; s < S; s++) if (score[s] > score[top]) top = s;
    next[0] = score[top]; back[t * S] = top; // (a rest is free to fall to and to leave)
    for (let b = 0; b < P; b++) {
      let best = score[0] - enter, from = 0; // (`enter`: what it costs to start a note out of a rest, so a blip has to earn its place)
      for (let a = 0; a < P; a++) { const v = score[a + 1] - cost[a * P + b]; if (v > best) { best = v; from = a + 1; } }
      next[b + 1] = best + row[off + b] - floor - (b >= 12 ? overtone * row[off + b - 12] : 0);
      back[t * S + b + 1] = from;
    }
    [score, next] = [next, score];
  }
  let k = 0;
  for (let s = 1; s < S; s++) if (score[s] > score[k]) k = s;
  for (let t = T - 1; t >= 0; t--) { path[t] = k; k = back[t * S + k]; }
  }
  const struck = new Map(); // (midi -> the frames where Basic Pitch starts a note of its own on it)
  for (const [f, m] of strikes) struck.has(m) ? struck.get(m).push(f) : struck.set(m, [f]);
  if (bridge) { // (a rest of under `bridge` frames between two stretches of ONE note is the same note held: no new strike)
    for (let t = 1; t < T;) {
      if (path[t] || !path[t - 1]) { t++; continue; }
      let e = t;
      while (e < T && !path[e]) e++;
      if (e < T && e - t < bridge && path[e] === path[t - 1]) for (let f = t; f < e; f++) path[f] = path[t - 1];
      t = e + 1;
    }
  }
  const out = [];
  for (let t = 0; t < T;) {
    let e = t;
    while (e < T && path[e] === path[t]) e++;
    if (path[t] && e - t >= shortest) {
      const midi = lo + path[t] - 1;
      let mean = 0;
      for (let f = t; f < e; f++) mean += rows[f][off + path[t] - 1];
      mean /= e - t;
      // (`dip`: a held note is struck again only where its own strength really falls just before the new start, to under `dip` of
      // the note's mean; Basic Pitch starts a new note of its own on a held one at any wobble, and that came out as up to six strikes)
      const dips = (f) => { if (!dip) return true; let lo2 = Infinity; for (let g = Math.max(t, f - 4); g <= Math.min(e - 1, f + 1); g++) lo2 = Math.min(lo2, rows[g][off + path[t] - 1]); return lo2 <= dip * mean; };
      const cuts = (struck.get(midi) || []).filter((f) => f - t >= 5 && e - f >= 3 && dips(f)).sort((x, y) => x - y);
      const edges = [t, ...cuts.filter((f, i) => i === 0 || f - cuts[i - 1] >= 5), e];
      for (let i = 0; i + 1 < edges.length; i++) {
        let sum = 0;
        for (let f = edges[i]; f < edges[i + 1]; f++) sum += rows[f][off + path[t] - 1];
        out.push([edges[i], edges[i + 1] - edges[i], midi, sum / (edges[i + 1] - edges[i])]);
      }
    }
    t = e;
  }
  return out;
}

// The line written as the song's lead, on the export's bars (origin: the engine's time of bar 0; the bars are 240 / bpm seconds),
// on a grid of `grid` steps a bar: 16, as every other part of the export. 64 was tried first (a melody does move between 16ths)
// and measured Nov 11 on 16 songs with the app's own top line: the cover-song score was no better (mean 0.383 at 64, 0.396 at 16;
// 11 and 10 of 16 recognisable, the one that differs within 0.06 of the line either way), and the code it wrote read as machine
// output ("b4@1.25 ~@0.75 f#4@1.75", offsets like 0.40625) where 16ths read as someone's own ("b4 ~ f#4 b4 ~@3 d4 ~@8").
// Two notes on one step keep the longer (a voice often slides into its note: the slide came first and used to win; the written
// line on the voice's note 51% -> 52 to 54% of the sung moments, Nov 11); a note ends where the next begins; none crosses its bar. The song's own lead is replaced
// only where the line has notes: outside the stretch Basic Pitch heard, it stays as it was.
export function placeLead(song, line, origin, grid = 16) {
  if (!song?.bars?.length || !line.length || !(song.bpm > 0) || !Number.isFinite(origin)) return song;
  const barSec = 240 / song.bpm, placed = [];
  for (const [t, d, midi] of line) {
    const step = Math.round(((t - origin) / barSec) * grid), len = Math.max(1, Math.round((d / barSec) * grid));
    if (placed.length && placed.at(-1).step === step) { if (d > placed.at(-1).d) placed[placed.length - 1] = { step, len, midi, d }; continue; }
    placed.push({ step, len, midi, d });
  }
  placed.forEach((p, k) => { if (k + 1 < placed.length) p.len = Math.max(1, Math.min(p.len, placed[k + 1].step - p.step)); });
  const first = Math.floor(placed[0].step / grid), last = Math.floor(placed.at(-1).step / grid);
  const bars = song.bars.map((b, i) => (i >= first && i <= last ? { ...b, events: (b.events || []).filter((e) => e.part !== 'lead') } : b));
  for (const p of placed) {
    const i = Math.floor(p.step / grid), at = p.step - grid * i;
    if (i < 0 || i >= bars.length) continue;
    bars[i].events.push({ part: 'lead', pitch: p.midi, onset: at / grid, duration: Math.min(p.len, grid - at) / grid, velocity: 90 });
  }
  return { ...song, bars };
}

// The bass, filled in from the same notes: Basic Pitch's lowest note under C3 (hi), loud enough (minAmp), written only on the 16ths
// where the export's own bass rests, so a note the engine got right is never overwritten. Measured Nov 11 on the 36-song bench
// (backlog/engineering/bassunion.mjs): the record's bass notes the export also plays 0.626 -> 0.673, note starts on the right
// step 0.349 -> 0.377, the older scores up too (bassPc 0.792 -> 0.824), no song worse. Letting Basic Pitch overrule the
// engine's notes scored higher on average (0.70 to 0.72) but broke songs where the engine was right (Treehouse 0.96 -> 0.75), and
// to the cover-song score Thriller and Funkytown fell: not taken.
// Where the two meet on the same note in different octaves it is one note going on, in the octave it began in. Basic Pitch
// striking the sounding note again counts only where the engine's bass also starts a note within a step (it breaks held notes
// into pieces). A bar none of its notes reach is left exactly as it was.
export function placeBass(song, notes, origin, { hi = 48, minAmp = 0.25 } = {}) {
  if (!song?.bars?.length || !notes?.length || !(song.bpm > 0) || !Number.isFinite(origin)) return song;
  const bars = song.bars, N = bars.length * 16, step = 240 / song.bpm / 16;
  const own = new Array(N).fill(null), ownStart = new Array(N).fill(false), vel = new Array(N).fill(95);
  const bp = new Array(N).fill(null), bpStart = new Array(N).fill(false), touched = new Array(bars.length).fill(false);
  bars.forEach((b, i) => { for (const e of b.events || []) if (e.part === 'bass') {
    const s0 = i * 16 + Math.round(e.onset * 16), len = Math.max(1, Math.round(e.duration * 16));
    for (let s = s0; s < Math.min(N, s0 + len); s++) { own[s] = e.pitch; vel[s] = e.velocity ?? 95; }
    if (s0 < N) ownStart[s0] = true;
  } });
  // (highest first, so each step ends up with the lowest note sounding there, and that note's start)
  for (const [t, d, m] of notes.filter(([, , m, a]) => m < hi && a >= minAmp).sort((x, y) => y[2] - x[2])) {
    const s0 = Math.round((t - origin) / step), s1 = Math.max(s0 + 1, Math.round((t + d - origin) / step));
    for (let s = Math.max(0, s0); s < Math.min(N, s1); s++) { bp[s] = m; bpStart[s] = s === s0; }
  }
  const pitch = new Array(N).fill(null), start = new Array(N).fill(false);
  for (let s = 0; s < N; s++) {
    const filled = own[s] === null && bp[s] !== null;
    pitch[s] = filled ? bp[s] : own[s];
    if (pitch[s] === null) continue;
    if (filled) touched[Math.floor(s / 16)] = true;
    const struck = filled ? bpStart[s] : ownStart[s], inBar = s % 16 !== 0;
    if (!struck && inBar && pitch[s - 1] !== null && pitch[s - 1] !== pitch[s] && (pitch[s - 1] - pitch[s]) % 12 === 0) pitch[s] = pitch[s - 1];
    const again = struck && filled && inBar && pitch[s - 1] === pitch[s] && !(ownStart[s] || ownStart[s - 1] || ownStart[s + 1]);
    start[s] = (struck && !again) || !inBar || pitch[s - 1] !== pitch[s];
  }
  return { ...song, bars: bars.map((b, i) => {
    if (!touched[i]) return b;
    const events = (b.events || []).filter((e) => e.part !== 'bass');
    for (let s = i * 16; s < (i + 1) * 16; s++) {
      if (pitch[s] === null || !start[s]) continue;
      let e = s + 1;
      while (e < (i + 1) * 16 && pitch[e] === pitch[s] && !start[e]) e++;
      events.push({ part: 'bass', pitch: pitch[s], onset: (s - i * 16) / 16, duration: (e - s) / 16, velocity: vel[s] });
    }
    return { ...b, events };
  }) };
}
