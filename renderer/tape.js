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
// own, bar by bar as heard) to take into a DAW, and Strudel code: exact phrases written once
// as named stacks and played in order with arrange(), retaining each variation.
import { NOTES } from './engine.js';
import { wobble, beatRuns, bassRhythmEvents, MELODY_OCTAVE } from './codegen.js';

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
    // wob: the bass's filter sweeps a beat in that bar (2, 3, 4), or 0 (engine.js: wobbleCheck);
    // beats: its bass notes by the beat (4, null where none: engine.js bassTrack), or null
    harmony(beat0, chord, bass, wob = 0, beats = null) {
      if (cur) cur.harmony.push({ b: beat0 + cur.moved, chord: chord && { root: chord.root, third: chord.third, name: chord.name }, bass, wob, beats });
    },
    // The longest stretch as bars from its first: { bpm, bars: [{ parts, chord, bass }], who }; the
    // song before if this one hasn't 4 bars yet; or null. down: where the bar starts now (for the
    // stretch still going).
    song(down) {
      let best = null;
      for (const st of stretches) if (!best || st.bars.length > best.bars.length) best = st;
      if (!best || best.bars.length < 4) return before;
      const d = best === cur ? down : best.down, off = best.moved;
      // Build accepted note events BEFORE moving their coordinates. A duration belongs to
      // its note, not to whichever bar its onset lands in after a phase correction.
      const recorded = new Map();
      const source = (b) => {
        if (!recorded.has(b)) recorded.set(b, { parts: {}, chord: null, bass: null });
        return recorded.get(b);
      };
      for (const r of best.bars) source(r.b).parts = r.parts;
      // Harmony closes a bar after its pattern was recorded. If phase changed meanwhile,
      // the starts may differ; pair the nearest snapshots without moving the harmony start.
      const remaining = new Set(best.harmony);
      for (const r of best.bars) {
        let match = null;
        for (const h of remaining) if (Math.abs(h.b - r.b) < 2 && (!match || Math.abs(h.b - r.b) < Math.abs(match.b - r.b))) match = h;
        if (match) {
          Object.assign(source(r.b), { chord: match.chord, bass: match.bass, wob: match.wob, beats: match.beats, harmonyBeat: match.b });
          remaining.delete(match);
        }
      }
      for (const r of remaining) Object.assign(source(r.b), { chord: r.chord, bass: r.bass, wob: r.wob, beats: r.beats, harmonyBeat: r.b });
      const shifted = [], windows = [];
      for (const [b, raw] of recorded) {
        const start = Math.round((b - off - d) * 4) / 16;
        windows.push([start, start + 1]);
        const harmonyStart = Math.round(((raw.harmonyBeat ?? b) - off - d) * 4) / 16;
        for (const e of barEvents(raw)) {
          const harmonic = e.part === 'chords' || (e.part === 'bass' && !raw.parts.bass?.some(Boolean));
          shifted.push({ ...e, onset: (harmonic ? harmonyStart : start) + e.onset, wob: raw.wob || 0 });
        }
        if (raw.harmonyBeat != null) windows.push([harmonyStart, harmonyStart + 1]);
      }
      // Keep pickups, adding leading padding to the preceding bar. No negative timestamp
      // is wrapped back into its former bar and no boundary note is cut or retriggered.
      const first = Math.floor(Math.min(...windows.map((w) => w[0])));
      const last = Math.ceil(Math.max(...windows.map((w) => w[1]))) - 1;
      const bars = Array.from({ length: last - first + 1 }, () => ({ parts: {}, chord: null, bass: null, events: [] }));
      for (const e of shifted) {
        const i = Math.floor(e.onset), target = bars[i - first];
        const { wob, ...note } = e;
        target.events.push({ ...note, onset: e.onset - i });
        if (e.part === 'bass') target.wob = wob;
        // The grids remain a convenient inspection view; writers use the timed events.
        const step = Math.round((e.onset - i) * 16);
        if (e.part in DRUM) {
          target.parts[e.part] ||= Array(16).fill(false);
          target.parts[e.part][step] = true;
        } else if (e.part === 'lead') {
          target.parts.vox ||= { on: Array(16).fill(false), tok: Array(16).fill(null) };
          target.parts.vox.on[step] = true;
          target.parts.vox.tok[step] = String(e.pitch % 12);
        }
      }
      const timeline = {
        originBeat: first * 4, startBeat: Math.min(...windows.map((w) => w[0])) * 4,
        endBeat: Math.max(...windows.map((w) => w[1])) * 4, pickupPolicy: 'keep',
      };
      const coverage = {
        selectedStretch: stretches.indexOf(best) + 1,
        stretches: stretches.map((st, i) => ({ stretch: i + 1, bpm: st.bpm, bars: st.bars.length, seconds: st.bars.length * 240 / st.bpm })),
        recordedBars: stretches.reduce((n, st) => n + st.bars.length, 0),
        recordedSeconds: stretches.reduce((n, st) => n + st.bars.length * 240 / st.bpm, 0),
      };
      return { bpm: best.bpm, bars, who: best.who || null, coverage, timeline };
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

// Shared accepted export notes. onset/duration are in bars, relative to this bar.
// This is an export view of learned patterns, not a new detector/event ledger.
export function barEvents(b) {
  if (b.events) return b.events;
  const out = [], p = b.parts;
  const add = (part, pitch, onset, duration, velocity) => out.push({ part, pitch, onset, duration, velocity });
  for (const id in DRUM) p[id]?.forEach((on, s) => { if (on) add(id, DRUM[id][0], s / 16, 1 / 16, DRUM[id][1]); });
  p.vox?.on.forEach((on, s) => {
    const pc = +p.vox.tok[s];
    if (on && Number.isFinite(pc)) add('lead', (MELODY_OCTAVE + 1) * 12 + pc, s / 16, 1 / 16, 90);
  });
  if (b.chord) {
    const r = 48 + b.chord.root;
    for (const pitch of [r, r + b.chord.third, r + 7]) add('chords', pitch, 0, 1, 70);
  }
  const runs = beatRuns(b.beats);
  if (b.bass != null || runs) {
    const noteAt = (s) => runs ? runs.find((r) => r.beats.includes(s >> 2)).m : b.bass;
    const rhythmic = bassRhythmEvents(p.bass, noteAt);
    if (rhythmic.length) out.push(...rhythmic);
    else if (runs) runs.forEach((r) => add('bass', r.m, r.beats[0] / 4, r.beats.length / 4, 95));
    else add('bass', b.bass, 0, 1, 95);
  }
  return out;
}

export function songMidi(song, title) {
  const bar = 4 * PPQ;
  const tempo = Math.round(60e6 / song.bpm);
  const meta = [[0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255], [0, 0xff, 0x58, 4, 4, 2, 24, 8]];
  const drums = [], bass = [], chords = [], lead = [];
  const targets = { bass: [bass, 0], chords: [chords, 1], lead: [lead, 2] };
  song.bars.forEach((b, i) => {
    for (const e of barEvents(b)) {
      const [list, ch] = targets[e.part] || [drums, 9];
      const begin = Math.round((i + e.onset) * bar), end = Math.round((i + e.onset + e.duration) * bar);
      list.push([end, 0x80 | ch, e.pitch, 0], [begin, 0x90 | ch, e.pitch, e.velocity]);
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

const DRUMS = ['bd', 'sd', 'hhc', 'hho'];
const TOKEN = { bd: 'bd', sd: 'cp', hhc: 'hh', hho: 'oh' };
// Compare musical content exactly: absent/off steps are equivalent, active notes are not.
const barKey = (b) => JSON.stringify([
  barEvents(b).map((e) => JSON.stringify([e.part, e.pitch, e.onset, e.duration, e.velocity])).sort(),
  b.wob || 0,
]);

// Exact four-bar phrases, reduced only by an exact period and reused only on exact equality.
// A fill or a new note gets its own variant; instrument presence never gates accepted data.
export function songSections(song) {
  const parts = [], sections = [], known = new Map();
  const bars = song.bars || [];
  for (let start = 0; start < bars.length; start += 4) {
    const block = bars.slice(start, start + 4), keys = block.map(barKey);
    let period = block.length;
    for (let n = 1; n <= block.length; n++) {
      if (block.length % n === 0 && keys.every((k, j) => k === keys[j % n])) { period = n; break; }
    }
    const raw = block.slice(0, period), key = JSON.stringify(keys.slice(0, period));
    let part = known.get(key);
    if (part === undefined) {
      part = parts.length;
      known.set(key, part);
      parts.push({ bars: period, raw });
    }
    const prev = sections.at(-1);
    if (prev?.part === part) prev.bars += block.length;
    else sections.push({ start, bars: block.length, part });
  }
  return { sections, parts };
}

// A weighted mini pattern declares the rests and note lengths explicitly in sixteenths.
// Equal simultaneous notes (a triad) share one token. Overlaps/tails use separate lanes.
function eventCode(es, bars, value) {
  if (!es.length) return null;
  const groups = new Map();
  for (const e of es) {
    const key = JSON.stringify([e.onset, e.duration, e.velocity]);
    if (!groups.has(key)) groups.set(key, { ...e, values: [] });
    groups.get(key).values.push(value(e));
  }
  const lanes = [];
  for (const e of [...groups.values()].sort((a, b) => a.onset - b.onset)) {
    let lane = lanes.find((l) => l.velocity === e.velocity && l.end <= e.onset && e.onset + e.duration - l.events[0].onset <= bars);
    if (!lane) { lane = { velocity: e.velocity, end: 0, events: [] }; lanes.push(lane); }
    lane.events.push(e); lane.end = e.onset + e.duration;
  }
  return lanes.map((lane) => {
    // Start the cycle on its first note, then delay it: boundary-crossing tails keep their
    // whole duration, rather than being chopped into two fresh onsets by a bar boundary.
    const offset = lane.events[0].onset, texts = [];
    let end = offset;
    const token = (v, length) => v + (length === 1 / 16 ? '' : '@' + length * 16);
    for (const e of lane.events) {
      if (e.onset > end) texts.push(token('~', e.onset - end));
      texts.push(token(e.values.length === 1 ? e.values[0] : '[' + e.values.join(',') + ']', e.duration));
      end = e.onset + e.duration;
    }
    const span = bars;
    if (end - offset < span) texts.push(token('~', span - (end - offset)));
    let code = `note("${texts.join(' ')}").slow(${span})`;
    if (offset) code += `.late(${offset})`;
    return code + `.velocity(${lane.velocity}/127)`;
  });
}

function blockCode(block) {
  const es = block.flatMap((b, i) => barEvents(b).map((e) => ({ ...e, onset: i + e.onset, wob: b.wob || 0 })));
  const lines = [];
  for (const id of DRUMS) {
    const code = eventCode(es.filter((e) => e.part === id), block.length, () => TOKEN[id]);
    if (code) lines.push(...code.map((c) => c.replace(/^note\(/, 's(') + `.bank("RolandTR909")${id === 'hhc' ? '.gain(.5)' : id === 'hho' ? '.gain(.4)' : ''}`));
  }
  for (const [id, sound] of [['bass', 'sawtooth'], ['chords', 'supersaw'], ['lead', 'triangle']]) {
    const selected = es.filter((e) => e.part === id);
    for (const wob of id === 'bass' ? new Set(selected.map((e) => e.wob)) : [0]) {
      const code = eventCode(selected.filter((e) => id !== 'bass' || e.wob === wob), block.length, (e) => nameOf(e.pitch));
      const effect = id === 'bass' ? `.lpf(${wob ? 400 : 800})` + wobble(wob) : id === 'chords' ? '.lpf(2000).gain(.6)' : '.clip(1)';
      if (code) lines.push(...code.map((c) => c + `.s("${sound}")` + effect));
    }
  }
  return lines.length ? lines : null;
}

export function songStrudel(song, about) {
  const S = songSections(song);
  const named = [], names = [];
  for (const P of S.parts) {
    const code = blockCode(P.raw);
    if (code) {
      const name = String.fromCharCode(65 + (named.length % 26)) + (named.length >= 26 ? Math.floor(named.length / 26) : '');
      named.push([name, code]);
      names.push(name);
    } else names.push('silence'); // (Strudel's own: nothing playing)
  }
  if (!named.length) return null;
  const order = [];
  for (const sec of S.sections) {
    const name = names[sec.part], prev = order[order.length - 1];
    if (prev?.name === name) prev.bars += sec.bars;
    else order.push({ name, bars: sec.bars });
  }
  const out = [
    `// ${about}, decompiled by toaster: the song in exact phrases, each written once`,
    '// and played in order, including variations. ctrl+enter plays it, ctrl+. stops.',
    `setcpm(${song.bpm}/4)`,
    '',
  ];
  if (song.coverage) {
    const c = song.coverage, selected = c.stretches.find((st) => st.stretch === c.selectedStretch);
    out.splice(2, 0,
      `// Coverage: stretch ${c.selectedStretch}/${c.stretches.length}; ${selected.bars}/${c.recordedBars} recorded bars, ~${selected.seconds.toFixed(3)}/~${c.recordedSeconds.toFixed(3)} seconds.`,
      '// Durations use each stretch final BPM; pre-lock audio is not recorded. Other tempo stretches are omitted.',
      `// Capture coverage: ${JSON.stringify(c)}`);
  }
  if (song.timeline) out.splice(2, 0,
    '// Phase correction keeps pickups and note tails; leading/trailing partial bars are padded with silence.',
    `// Export timeline (beats on corrected grid): ${JSON.stringify(song.timeline)}`);
  for (const [name, code] of named) out.push(`const ${name} = stack(`, ...code.map((l) => `  ${l},`), ')', '');
  out.push(`$: arrange(${order.map((o) => `[${o.bars}, ${o.name}]`).join(', ')})`);
  return out.join('\n') + '\n';
}

// Optional lossless compact view. Near-identical bars share their unchanged instrument
// phrases; each track's arrange list explicitly enumerates the exact bar variations.
// This does not vote, quantize, or drop notes.
export function songStrudelCompact(song, about) {
  const exact = songStrudel(song, about);
  if (!exact) return null;
  // The file opens on what it is and how to play it; the exact writer's record of the timeline and
  // the coverage moves to the end, where it's there for checking without being the first thing read.
  const top = exact.slice(0, exact.indexOf('\nconst ')).trimEnd().split('\n');
  const record = top.slice(2).filter((l) => l.startsWith('//'));
  const header = [
    `// ${about}, decompiled by toaster: every bar it heard, each phrase written once`,
    '// No events simplified. ctrl+enter plays it, ctrl+. stops',
    ...top.slice(2).filter((l) => !l.startsWith('//')),
  ];
  const definitions = [], tracks = [], renderers = new Map();
  const compactLine = (line) => {
    // Factor identical instrument/effect settings, retaining every explicit note token.
    const match = /^(note|s)\("([^"]*)"\)\.slow\(1\)(?:\.late\(([^)]+)\))?(\.velocity\(.*)$/.exec(line);
    if (!match) throw Error('Unexpected compact instrument expression');
    const [, constructor, pattern, offset, effects] = match;
    const key = constructor + effects;
    if (!renderers.has(key)) renderers.set(key, { name: `voice${renderers.size + 1}`, constructor, effects });
    const { name } = renderers.get(key);
    // Compress unit-weight tokens only: mini's @weight!n precedence changes durations.
    const tokens = pattern.split(' '), packed = [];
    for (let i = 0; i < tokens.length;) {
      let end = i + 1;
      while (!tokens[i].includes('@') && end < tokens.length && tokens[end] === tokens[i]) end++;
      packed.push(tokens[i] + (end - i > 1 ? '!' + (end - i) : '')); i = end;
    }
    return `${name}("${packed.join(' ')}"${offset ? ', ' + offset : ''})`;
  };
  for (const id of [...DRUMS, 'bass', 'chords', 'lead']) {
    const known = new Map(), order = [];
    for (const b of song.bars) {
      const raw = { parts: {}, events: barEvents(b).filter((e) => e.part === id), wob: id === 'bass' ? b.wob : 0 };
      const key = barKey(raw);
      let name = known.get(key);
      if (!name) {
        const lines = blockCode([raw]);
        name = lines ? `${id}${known.size + 1}` : 'silence';
        if (lines) {
          const expressions = lines.map(compactLine);
          definitions.push(`const ${name} = ${expressions.length === 1 ? expressions[0] : 'stack(' + expressions.join(', ') + ')'}`);
        }
        known.set(key, name);
      }
      if (order.at(-1)?.name === name) order.at(-1).bars++;
      else order.push({ name, bars: 1 });
    }
    if (order.some((o) => o.name !== 'silence')) tracks.push(`  arrange(${order.map((o) => `[${o.bars}, ${o.name}]`).join(', ')}), // ${id}`);
  }
  const helpers = [...renderers.values()].map((r) => `const ${r.name} = (p, t = 0) => ${r.constructor}(p).slow(1).late(t)${r.effects}`);
  // Break long strings into concatenated chunks and arrangement arguments at commas;
  // concatenation preserves mini-notation whitespace and the resulting events.
  const wrap = (line) => {
    if (line.startsWith('//') && line.length > 100) {
      // at a space, or after a comma inside the record's JSON, never in the middle of a word
      const chunks = [];
      let rest = line.slice(3);
      while (rest.length > 94) {
        let cut = rest.lastIndexOf(' ', 94);
        if (cut < 40) { const comma = rest.lastIndexOf(',', 93); cut = comma >= 40 ? comma + 1 : 94; }
        chunks.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
      }
      chunks.push(rest);
      return chunks.map((c) => '// ' + c).join('\n');
    }
    if (line.startsWith('const voice') && line.length > 100) line = line.replace('.velocity(', '\n  .velocity(');
    line = line.replace(/"([^"\n]{75,})"/g, (_, value) => {
      const chunks = value.match(/.{1,70}/g);
      return chunks.map((c) => JSON.stringify(c)).join(' +\n    ');
    });
    return line.replace(/, (?=\[\d+, )/g, ',\n    ').replace(/, (?=voice\d+\()/g, ',\n    ');
  };
  const tail = record.length ? ['// for checking the export:', ...record, ''] : [];
  return [...header, '', ...helpers, '', ...definitions, '', '$: stack(', ...tracks, ')', '', ...tail].map(wrap).join('\n');
}
