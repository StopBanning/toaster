// The song as heard, kept from the moment the beat is found, for exporting it (X): at every bar
// line, the patterns the code shows for that bar (kick, clap, hats, the lead's notes, the bass
// line's rhythm), and each bar's chord and bass note. The same steady patterns the code is
// written from, not every hit the detectors fire on: those miss the odd kick and take some kicks
// for claps. Kept by beat, with the corrections the engine makes to its beat as it goes (a 16th
// earlier or later, the bar starting on another beat) applied to all of it when it's written
// out, so the whole song lines up with the beat as it ended up. A new tempo starts a new stretch
// (the longest is exported); a new song starts over, keeping the song before (if it got 4 bars)
// for X till the new one has 4 of its own: the time to export a song is often just after it ends,
// and a few seconds of silence count as a new song.
//
// Written out two ways: a MIDI file (drums on channel 10, bass, chords and lead on tracks of their
// own) to take into a DAW, and the whole song as Strudel code: every 4 bars as heard, each
// different 4 bars written once as a named stack, played in order with arrange().
import { NOTES } from './engine.js';
import { stepParts, wobble } from './codegen.js';

const nameOf = (midi) => NOTES[((midi % 12) + 12) % 12].toLowerCase() + (Math.floor(midi / 12) - 1);

export function createTape() {
  let stretches = [], cur = null, before = null;
  const api = {
    // who(): the song playing, { name, about } (set by the app), noted with each bar, so a song
    // kept after it ended is still named after itself
    who: null,
    // A new song. down: where the bar started in the one that's ending.
    reset(down = 0) {
      const done = api.song(down);
      if (done) before = done;
      stretches = [];
      cur = null;
    },
    // The beat found (or found again at a new tempo): beats are numbered afresh, a new stretch.
    // down: where the bar started in the stretch before (its last word on that).
    lock(bpm, down) {
      if (cur) cur.down = down;
      cur = { bpm, bars: [], harmony: [], moved: 0, down: 0 };
      stretches.push(cur);
    },
    tempo(bpm) { if (cur) cur.bpm = bpm; },
    // The engine moved its beat by this many beats (it found it was a 16th or two off): what came
    // before was on a beat this far off.
    shift(beats) { if (cur) cur.moved += beats; },
    // A bar starting at beat beat0 and the patterns playing in it: { id: [16 on/off] or null },
    // the lead's as { on, tok } (its notes, 0-11).
    pattern(beat0, parts) {
      if (!cur) return;
      cur.bars.push({ b: beat0 + cur.moved, parts });
      cur.who = api.who?.() || cur.who;
    },
    // wob: the bass's filter sweeps a beat in that bar (2, 3, 4), or 0 (engine.js: wobbleCheck)
    harmony(beat0, chord, bass, wob = 0) {
      if (cur) cur.harmony.push({ b: beat0 + cur.moved, chord: chord && { root: chord.root, third: chord.third, name: chord.name }, bass, wob });
    },
    // The longest stretch as bars from its first: { bpm, bars: [{ parts, chord, bass }], who }; the
    // song before if this one hasn't 4 bars yet; or null. down: where the bar starts now (for the
    // stretch still going).
    song(down) {
      let best = null;
      for (const st of stretches) if (!best || st.bars.length > best.bars.length) best = st;
      if (!best || best.bars.length < 4) return before;
      const d = best === cur ? down : best.down, off = best.moved;
      const map = new Map(), at = (bar) => { let x = map.get(bar); if (!x) map.set(bar, (x = { parts: {}, chord: null, bass: null })); return x; };
      // A bar recorded before the beat or bar line moved sits k 16ths off the final bar i;
      // turn a copy of its 16 steps by k (as relabel() did live) so the whole song lines up.
      const rot = (a, k) => {
        if (!a) return a;
        const out = new Array(16);
        for (let s = 0; s < 16; s++) out[(s + k + 16) % 16] = a[s];
        return out;
      };
      for (const r of best.bars) {
        const s0 = Math.round((r.b - off - d) * 4), i = Math.round(s0 / 16), k = s0 - 16 * i;
        const parts = {};
        for (const [id, v] of Object.entries(r.parts)) parts[id] = v && (id === 'vox' ? { on: rot(v.on, k), tok: rot(v.tok, k) } : rot(v, k));
        at(i).parts = parts;
      }
      for (const r of best.harmony) {
        const x = at(Math.floor((r.b - off - d + 2) / 4)); // the bar its middle falls in
        if (r.chord) x.chord = r.chord;
        if (r.bass) x.bass = r.bass;
        if (r.wob) x.wob = r.wob;
      }
      const keys = [...map.keys()], first = Math.min(...keys), last = Math.max(...keys);
      const bars = [];
      for (let b = first; b <= last; b++) bars.push(map.get(b) || { parts: {}, chord: null, bass: null });
      return { bpm: best.bpm, bars, who: best.who || null };
    },
  };
  return api;
}

// ---------------------------------------------------------------- MIDI

const PPQ = 96; // ticks a beat
// General MIDI drums (kick, hand clap, closed and open hat) and how hard each is hit
const DRUM = { bd: [36, 110], sd: [39, 100], hhc: [42, 70], hho: [46, 80] };
function vlq(n) {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
const text = (s) => [...new TextEncoder().encode(s)];
// One track from [tick, ...bytes] events (in time order, a note's end before the next one starts).
function track(events) {
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const bytes = [];
  let now = 0;
  for (const [tick, ...ev] of events) { bytes.push(...vlq(tick - now), ...ev); now = tick; }
  bytes.push(0, 0xff, 0x2f, 0); // end of track
  const n = bytes.length;
  return [...text('MTrk'), (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, ...bytes];
}
const named = (name) => [0, 0xff, 0x03, ...vlq(text(name).length), ...text(name)];

export function songMidi(song, title) {
  const bar = 4 * PPQ, step = PPQ / 4;
  const tempo = Math.round(60e6 / song.bpm);
  const meta = [[0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255], [0, 0xff, 0x58, 4, 4, 2, 24, 8]];
  const note = (list, ch, t, len, n, v) => { list.push([t + len, 0x80 | ch, n, 0], [t, 0x90 | ch, n, v]); };
  const drums = [], bass = [], chords = [], lead = [];
  song.bars.forEach((b, i) => {
    const t0 = i * bar, p = b.parts;
    for (const id in DRUM) p[id]?.forEach((on, s) => { if (on) note(drums, 9, t0 + s * step, step, DRUM[id][0], DRUM[id][1]); });
    p.vox?.on.forEach((on, s) => { const pc = +p.vox.tok[s]; if (on && Number.isFinite(pc)) note(lead, 2, t0 + s * step, step, 72 + pc, 90); });
    if (b.chord) {
      const r = 48 + b.chord.root;
      for (const n of [r, r + b.chord.third, r + 7]) note(chords, 1, t0, bar, n, 70);
    }
    // the bar's bass note on the steps the bass line plays (each held to the next, up to a beat),
    // or held through the bar
    if (b.bass) {
      const on = p.bass ? [...p.bass.keys()].filter((s) => p.bass[s]) : [];
      if (on.length) on.forEach((s, k) => note(bass, 0, t0 + s * step, Math.min(PPQ, ((on[k + 1] ?? 16) - s) * step), b.bass, 95));
      else note(bass, 0, t0, bar, b.bass, 95);
    }
  });
  const tracks = [
    track([...meta, named(title)]),
    track([named('drums'), ...drums]),
    track([named('bass'), ...bass]),
    track([named('chords'), ...chords]),
    track([named('lead'), ...lead]),
  ];
  const head = [...text('MThd'), 0, 0, 0, 6, 0, 1, 0, tracks.length, 0, PPQ];
  return new Uint8Array([...head, ...tracks.flat()]);
}

// ---------------------------------------------------------------- Strudel

const TOKEN = { bd: 'bd', sd: 'cp', hhc: 'hh', hho: 'oh' };
// Four values as <a b c d>, repeats written with ! (<e2!2 c2 d2>); one if they're all the same.
function slots(values) {
  if (values.every((v) => v === values[0])) return values[0];
  const out = [];
  for (let i = 0; i < values.length;) {
    let j = i + 1;
    while (j < values.length && values[j] === values[i]) j++;
    out.push(values[i] + (j - i > 1 ? '!' + (j - i) : ''));
    i = j;
  }
  return `<${out.join(' ')}>`;
}
// A bar's 16 steps (tokens or null) as mini-notation, or ~ for an empty bar.
const barText = (tok) => stepParts(tok)?.map((p) => p.text).join('') ?? '~';
// Four bars of a part: the one pattern if they're all the same, else each in turn.
function fourBars(texts) {
  if (texts.every((x) => x === texts[0])) return texts[0];
  return `<${texts.map((x) => (/\s/.test(x) ? `[${x}]` : x)).join(' ')}>`;
}

// The code for 4 bars (or fewer, at the end), one line a part, or null if nothing plays in them.
function blockCode(four) {
  const lines = [];
  for (const id of ['bd', 'sd', 'hhc', 'hho']) {
    if (!four.some((b) => b.parts[id]?.some(Boolean))) continue;
    const texts = four.map((b) => barText((b.parts[id] || []).map((on) => (on ? TOKEN[id] : null)).concat(new Array(16).fill(null)).slice(0, 16)));
    lines.push(`s("${fourBars(texts)}").bank("RolandTR909")${id === 'hhc' ? '.gain(.5)' : id === 'hho' ? '.gain(.4)' : ''}`);
  }
  if (four.some((b) => b.bass)) {
    const notes = slots(four.map((b) => (b.bass ? nameOf(b.bass) : '~')));
    // the bass line's rhythm, as the live code writes it (.struct), bar by bar: different ones go in
    // turn (<...>), as the notes do, so changing rhythms aren't lost (they were, unless all four
    // bars had the same one). A bar without one (or only the downbeat) has its note held all bar.
    const rhythm = four.map((b) => (b.parts.bass?.some((on, s) => on && s) ? barText(b.parts.bass.map((on) => (on ? 'x' : null))) : 'x'));
    const struct = rhythm.some((r) => r !== 'x') ? `.struct("${fourBars(rhythm)}")` : '';
    // (a wobble as most of the 4 bars had one, if at least two did)
    const wobs = four.map((b) => b.wob || 0).filter(Boolean), count = (r) => wobs.filter((w) => w === r).length;
    const wob = wobs.length >= 2 ? [3, 4].reduce((best, r) => (count(r) > count(best) ? r : best), 2) : 0;
    lines.push(`note("${notes}")${struct}.s("sawtooth").lpf(${wob ? 400 : 800})${wobble(wob)}`);
  }
  if (four.some((b) => b.chord)) lines.push(`chord("${slots(four.map((b) => b.chord?.name ?? '~'))}").voicing().s("supersaw").lpf(2000).gain(.6)`);
  if (four.some((b) => b.parts.vox?.on.some(Boolean))) {
    const texts = four.map((b) => {
      const v = b.parts.vox;
      return barText(Array.from({ length: 16 }, (_, s) => { const pc = +v?.tok[s]; return v?.on[s] && Number.isFinite(pc) ? NOTES[pc].toLowerCase() + '5' : null; }));
    });
    lines.push(`note("${fourBars(texts)}").s("triangle").clip(1)`);
  }
  return lines.length ? lines : null;
}

export function songStrudel(song, about) {
  const parts = new Map(), order = [];
  for (let i = 0; i < song.bars.length; i += 4) {
    const four = song.bars.slice(i, i + 4); // (the last may be shorter: as far as it was heard)
    const code = blockCode(four);
    const key = code ? code.join('\n') : '';
    if (key && !parts.has(key)) parts.set(key, String.fromCharCode(65 + (parts.size % 26)) + (parts.size >= 26 ? Math.floor(parts.size / 26) : ''));
    const name = key ? parts.get(key) : 'silence'; // (Strudel's own: nothing playing)
    const prev = order[order.length - 1];
    if (prev?.name === name) prev.bars += four.length;
    else order.push({ name, bars: four.length });
  }
  if (!parts.size) return null;
  const out = [
    `// ${about}, decompiled by toaster: the song as it heard it, every 4 bars, each different`,
    '// 4 bars written once and named, then played in order. ctrl+enter plays it, ctrl+. stops.',
    `setcpm(${Math.round(song.bpm)}/4)`,
    '',
  ];
  for (const [key, name] of parts) out.push(`const ${name} = stack(`, ...key.split('\n').map((l) => `  ${l},`), ')', '');
  out.push(`$: arrange(${order.map((o) => `[${o.bars}, ${o.name}]`).join(', ')})`);
  return out.join('\n') + '\n';
}
