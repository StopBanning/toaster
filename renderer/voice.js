// The tune read from the voice alone: the notes of a recording that holds only the singer (a vocals stem, pulled out of the song
// by a source separator before this is called). Nothing here knows about the separator; nothing live uses this, only the export.
//
// Why (Nov 12): the export's tune was read out of the whole mix (melody.js: Basic Pitch's frames and a path through them), and
// from the mix there is no telling a sung note from the organ's between her phrases. Measured on 14 sung songs, 30 s each, against
// the voice's own notes: the mix's tune played through 31% of the voice's silences and sat on her note 84% of the time; the same
// reading done on the voice alone (split out of the app's own 22 kHz mono recording) played through 4% and sat on her note 95%.
// Colin, blind, on two clips of the mix's tune: "I feel like I know it, but I just can't name it."
//
// The reading is the one the measurements' answer key was made with (backlog/engineering/vocalpitch.py), kept the same on purpose:
// YIN (de Cheveigné and Kawahara, 2002) every 10 ms on a 46 ms window, only where the voice is loud enough and clearly pitched;
// then a note is a run of 60 ms or more that stays within half a semitone. No model.

const FMIN = 70, FMAX = 1000;           // (a voice: C#2 to about B5)
const midiOf = (hz) => 69 + 12 * Math.log2(hz / 440);

// One window's pitch in Hz, or null where it has none. threshold: how deep the dip in YIN's normalised difference must be.
export function yin(x, at, W, sr, threshold = 0.12) {
  const tmin = Math.floor(sr / FMAX), tmax = Math.floor(sr / FMIN);
  const d = new Float64Array(tmax + 2), c = new Float64Array(tmax + 2);
  for (let t = 1; t <= tmax + 1; t++) {
    let s = 0;
    for (let i = 0; i + t < W; i++) { const a = x[at + i] - x[at + i + t]; s += a * a; }
    d[t] = s;
  }
  c[0] = 1;
  let sum = 0;
  for (let t = 1; t <= tmax + 1; t++) { sum += d[t]; c[t] = d[t] * t / (sum + 1e-12); }
  if (sum < 1e-9) return null;   // (nothing in the window at all)
  for (let t = Math.max(1, tmin); t < tmax; t++) {
    if (c[t] < threshold && c[t] <= c[t + 1]) {
      const a = c[t - 1], b = c[t], e = c[t + 1], k = a - 2 * b + e;   // (the dip's true bottom lies between samples: a parabola through three)
      return sr / (t + (k ? 0.5 * (a - e) / k : 0));
    }
  }
  return null;
}

// The voice's pitch every 10 ms: { hop (seconds), f0: [midi number or null] }. A frame quieter than 0.12 of the loud frames
// (the 90th percentile of the frames' levels) is silence: a stem's leftovers of the band are that quiet.
export function voicePitch(x, sr = 22050) {
  const hop = Math.round(sr * 220 / 22050), W = Math.round(sr * 1024 / 22050), n = Math.max(0, Math.floor((x.length - W) / hop));
  const rms = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < W; k++) { const v = x[i * hop + k]; s += v * v; } rms[i] = Math.sqrt(s / W); }
  const sorted = Float64Array.from(rms).sort(), gate = Math.max(1e-4, (n ? sorted[Math.min(n - 1, Math.floor(0.9 * (n - 1)))] : 0) * 0.12);
  const f0 = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (rms[i] < gate) continue;
    const hz = yin(x, i * hop, W, sr);
    if (hz) f0[i] = Math.round(midiOf(hz) * 100) / 100;
  }
  return { hop: hop / sr, f0 };
}

// The pitch cut into notes: [[start s, length s, midi]]. A note is 6 frames (60 ms) or more within half a semitone of its
// own middle; anything shorter is a slide or a consonant.
const median = (a) => { const s = [...a].sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function voiceNotes({ hop, f0 }, { shortest = 6 } = {}) {
  const notes = [];
  let cur = null;
  for (let i = 0; i <= f0.length; i++) {
    const m = i < f0.length ? f0[i] : null;
    if (m != null && cur && Math.abs(m - median(cur.m)) <= 0.5) { cur.m.push(m); continue; }
    if (cur && cur.m.length >= shortest) notes.push([+(cur.i * hop).toFixed(3), +((i - cur.i) * hop).toFixed(3), Math.round(median(cur.m))]);
    cur = m != null ? { i, m: [m] } : null;
  }
  return notes;
}

// YIN's one known slip is the octave: a short note read an octave above or below the notes around it. A note of 0.4 s or less,
// 9 or more semitones from the middle pitch of the notes within 1.5 s of it (three or more of them), that would sit within 4 of
// that middle an octave over, is moved that octave. Measured Nov 12 on the 14 songs' voices: 39 of 748 notes moved, octave hops
// 1.1 -> 0.3 per 10 s, nothing else changed.
export function foldOctaves(notes, { longest = 0.4, around = 1.5 } = {}) {
  return notes.map(([t, d, m], i) => {
    if (d > longest) return [t, d, m];
    const near = notes.filter(([t2, d2], j) => j !== i && t2 + d2 > t - around && t2 < t + d + around).map((n) => n[2]).sort((a, b) => a - b);
    if (near.length < 3) return [t, d, m];
    const mid = near[near.length >> 1];
    for (const s of [-12, 12]) if (Math.abs(m - mid) >= 9 && Math.abs(m + s - mid) <= 4) return [t, d, m + s];
    return [t, d, m];
  });
}

// The tune of a vocals stem: [[start s, length s, midi]], from the recording's first sample; the same shape as melody.js's
// pathLine gives, so placeLead puts it on the export's bars as it does the mix's.
export function voiceLine(x, sr = 22050) {
  return foldOctaves(voiceNotes(voicePitch(x, sr)));
}

// Stray notes out: a short note with no other note within `alone` seconds either side is not singing. The splitter leaves a few
// such blips in a stretch nobody sings in (a cymbal's ring, a synth's edge: 2 in Around the World's 30 s, 4 in Time Back's, each
// under 0.2 s and 3 s or more from the next), and a sung phrase is never one short note by itself. Measured Nov 12 on 16 excerpts:
// every blip of the two unsung ones goes, and 3 of the 14 sung ones' 732 notes (their scores unchanged).
// notes: [[start s, length s, midi]], in order.
export function dropStrays(notes, { alone = 2, long = 0.3 } = {}) {
  return notes.filter(([t, d], i) => d >= long || notes.some(([t2, d2], j) => j !== i && t2 + d2 >= t - alone && t2 <= t + d + alone));
}

