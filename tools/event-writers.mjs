import fs from 'node:fs';
import { hasStrudel, strudelRuntime, events } from './strudel-test-runtime.mjs';
import { onsets, notes, intervals } from './event-score.mjs';
const data = (s) => 'data:text/javascript,' + encodeURIComponent(s);
const source = (k) => fs.readFileSync(new URL('../renderer/' + k + '.js', import.meta.url), 'utf8');
const engine = data(source('engine')), codegen = data(source('codegen').replace("'./engine.js'", JSON.stringify(engine)));
const { songStrudel, songMidi } = await import(data(source('tape').replace("'./engine.js'", JSON.stringify(engine)).replace("'./codegen.js'", JSON.stringify(codegen))));
// Independent SMF decoder, including running status, meta events, note-off velocity zero,
// actual file PPQ and tempo. The current writer emits a single constant tempo.
export function decodeMidi(bytes) {
  const b = Buffer.from(bytes); if (b.toString('ascii', 0, 4) !== 'MThd') throw Error('not MIDI');
  const ppq = b.readUInt16BE(12); if (ppq & 0x8000) throw Error('SMPTE not supported');
  let pos = 8 + b.readUInt32BE(4), track = 0; const all = [], tempos = [];
  while (pos < b.length) {
    if (b.toString('ascii', pos, pos + 4) !== 'MTrk') throw Error('invalid MIDI track');
    const end = pos + 8 + b.readUInt32BE(pos + 4); pos += 8;
    let tick = 0, running = 0; const active = new Map();
    const vlq = () => { let n = 0, v; do { if (pos >= end) throw Error('truncated VLQ'); v = b[pos++]; n = n * 128 + (v & 127); } while (v & 128); return n; };
    while (pos < end) {
      tick += vlq(); let status = b[pos] < 128 ? running : b[pos++];
      if (status === 255) {
        const type = b[pos++], len = vlq();
        if (type === 81) tempos.push({ tick, us: b.readUIntBE(pos, len) });
        pos += len; continue;
      }
      if (status === 240 || status === 247) { pos += vlq(); continue; }
      if (status < 128 || status >= 240) throw Error('unsupported MIDI status');
      running = status; const type = status & 240, channel = status & 15;
      const midi = b[pos++], velocity = type === 192 || type === 208 ? 0 : b[pos++];
      const key = channel + ':' + midi;
      if (type === 144 && velocity) {
        const q = active.get(key) ?? []; q.push({ tick, velocity }); active.set(key, q);
      } else if (type === 128 || type === 144) {
        const start = active.get(key)?.shift(); if (!start) throw Error('unpaired MIDI note');
        all.push({ startTick: start.tick, endTick: tick, midi, velocity: start.velocity, channel, track });
      }
    }
    if ([...active.values()].some((q) => q.length)) throw Error('unterminated MIDI note');
    track++;
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const sec = (tick) => {
    let at = 0, us = 500000, time = 0;
    for (const t of tempos) { if (t.tick > tick) break; time += (t.tick - at) * us / 1e6 / ppq; at = t.tick; us = t.us; }
    return time + (tick - at) * us / 1e6 / ppq;
  };
  return all.map((n) => ({ ...n, start: sec(n.startTick), end: sec(n.endTick) }));
}
const noteNumber = (value) => {
  if (typeof value === 'number') return value;
  const match = /^([a-g])([#b]?)(-?\d+)$/i.exec(String(value));
  return match ? 12 * (+match[3] + 1) + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[match[1].toLowerCase()]
    + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) : null;
};
function chordClasses(harmony) {
  const root = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  return harmony.map((r) => {
    const match = /^([A-G]#?|Eb|Ab|Bb)(m?)$/.exec(r.label ?? '');
    const pc = match ? root[match[1]] : undefined;
    return { ...r, label: pc === undefined ? 'unknown' : [pc, (pc + (match[2] ? 3 : 4)) % 12, (pc + 7) % 12].sort((a, b) => a - b).join(',') };
  });
}
function chordSpans(pred, duration) {
  const notes = pred.filter((p) => p.part === 'chords' && p.midi !== null);
  const times = [...new Set([0, duration, ...notes.flatMap((n) => [n.start, n.end])])]
    .filter((t) => t >= 0 && t <= duration).sort((a, b) => a - b);
  return times.slice(1).map((end, i) => {
    const start = times[i], t = (start + end) / 2;
    const pcs = [...new Set(notes.filter((n) => n.start <= t && t < n.end).map((n) => n.midi % 12))].sort((a, b) => a - b);
    return { start, end, label: pcs.length ? pcs.join(',') : 'unknown' };
  });
}
export async function writerScores(capture, accepted) {
  const { song, writerOrigin: origin } = capture;
  if (!song || origin === null) return { status: 'no four-bar tape export' };
  const duration = song.bars.length * 240 / song.bpm, finish = origin + duration;
  const captureDuration = capture.duration ?? finish;
  // Compare the whole known capture, so pre-lock material and discarded tempo stretches
  // count as writer misses. Exclude predictions beyond observed coverage, reporting that tail.
  const crop = (xs) => xs.filter((r) => r.start >= 0 && r.start < captureDuration);
  const score = (prediction) => {
    const pred = crop(prediction);
    return {
    drums: Object.fromEntries(['bd', 'sd', 'hhc', 'hho'].map((id) => [id,
      Object.fromEntries([.025, .05].map((tol) => [tol, onsets(crop(accepted.drums[id] ?? []), pred.filter((p) => p.part === id), tol)]))])),
    bass: notes(crop(accepted.bass), pred.filter((p) => p.part === 'bass')),
    lead: notes(crop(accepted.lead), pred.filter((p) => p.part === 'vox')),
    harmonyPitchClasses: intervals(chordClasses(accepted.harmony ?? []), chordSpans(pred, captureDuration), captureDuration),
  }; };
  const drum = { 36: 'bd', 39: 'sd', 42: 'hhc', 46: 'hho' };
  const midi = decodeMidi(songMidi(song, capture.key)).map((n) => ({ ...n, start: n.start + origin, end: n.end + origin,
    part: n.track === 1 ? drum[n.midi] : { 2: 'bass', 3: 'chords', 4: 'vox' }[n.track] }));
  let native = null;
  if (!hasStrudel) throw Error('Native Strudel packages required: set STRUDEL_TEST_MODULES (see REPORT.md)');
  const runtime = await strudelRuntime(), code = songStrudel(song, capture.key);
  const pattern = code ? await runtime.evaluate(code) : null, barSeconds = 240 / song.bpm;
  native = (pattern ? events(pattern, 0, song.bars.length) : []).map((n) => {
    const s = n.value.s, value = String(s ?? '');
    const part = ({ bd: 'bd', cp: 'sd', hh: 'hhc', oh: 'hho' })[value]
      ?? (value === 'sawtooth' ? 'bass' : value === 'triangle' ? 'vox' : 'chords');
    return { start: origin + n.begin * barSeconds, end: origin + n.end * barSeconds, midi: noteNumber(n.value.note), part, value: n.value };
  });
  return { status: 'scored', origin, duration, evaluatedCaptureSeconds: captureDuration,
    unobservedWriterTailSeconds: Math.max(0, finish - captureDuration),
    originMethod: 'tape retained stretch and final beat anchor; no fitted shift; whole capture reference',
    midi: score(midi), strudel: score(native), counts: { midi: midi.length, strudel: native.length },
    // Chord labels have no observed voicing in the ledger; do not invent a pitch reference.
    chordVoicing: 'not scored: ledger has chord candidates, not observed chord-note MIDI pitches' };
}
