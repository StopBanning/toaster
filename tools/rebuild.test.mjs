// The song rebuilt from its own sounds (renderer/rebuild.js), on made-up parts whose answers are known: the grid of a drum
// machine, its hits sorted into their sounds with the feel kept, a bass line's notes, a singer's phrases, repeated keys found,
// and a program whose bars always add up to 16 sixteenths and whose audio puts each sound where the program says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fft, findGrid, readDrums, readBass, readVoice, readKeys, rebuild, render, program, master, fileMix, noteName } from '../renderer/rebuild.js';

const SR = 22050;
let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;
const kick = (n = Math.round(0.25 * SR)) => Float32Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-i / 400)) * i / SR) * Math.exp(-i / (0.08 * SR)));
const snare = (n = Math.round(0.2 * SR)) => Float32Array.from({ length: n }, (_, i) => (0.8 * rnd() + 0.3 * Math.sin(2 * Math.PI * 190 * i / SR)) * Math.exp(-i / (0.05 * SR)));
const hat = (n = Math.round(0.05 * SR)) => { const y = Float32Array.from({ length: n }, () => rnd()); for (let i = n - 1; i > 0; i--) y[i] -= y[i - 1]; return y.map((v, i) => 0.3 * v * Math.exp(-i / (0.01 * SR))); };
const put = (out, x, t, g = 1) => { const a = Math.round(t * SR); for (let i = 0; i < x.length && a + i < out.length; i++) if (a + i >= 0) out[a + i] += x[i] * g; };

// a drum machine at 120 BPM (a 16th = 0.125 s), bars from 0.3 s: kick on 1 and 3, snare on 2 and 4 played 25 ms early, hats on 8ths
const BPM = 120, STEP = 0.125, O = 0.3, BARS = 12;
function drumMachine() {
  const out = new Float32Array(Math.round((O + BARS * 2 + 1) * SR));
  for (let b = 0; b < BARS; b++) for (let s = 0; s < 16; s++) {
    const t = O + (b * 16 + s) * STEP;
    if (s === 0 || s === 8) put(out, kick(), t);
    if (s === 4 || s === 12) put(out, snare(), t - 0.025);
    if (s % 2 === 0) put(out, hat(), t + 0.003, 0.6);
  }
  return out;
}

test('the FFT matches a direct transform', () => {
  const n = 64, x = Array.from({ length: n }, () => rnd()), re = Float64Array.from(x), im = new Float64Array(n);
  fft(re, im);
  for (const k of [0, 1, 5, 31]) {
    let r = 0, i = 0; for (let t = 0; t < n; t++) { r += x[t] * Math.cos(2 * Math.PI * k * t / n); i -= x[t] * Math.sin(2 * Math.PI * k * t / n); }
    assert.ok(Math.abs(re[k] - r) < 1e-9 && Math.abs(im[k] - i) < 1e-9, `bin ${k}`);
  }
});

test('the grid: the drum machine\'s tempo, and its bars where the kicks are', () => {
  const g = findGrid(drumMachine(), SR);
  assert.ok(Math.abs(g.bpm - BPM) < 0.3, `bpm ${g.bpm}`);
  // on the beat; and at the bar's start or its middle (the kick is on 1 and on 3 alike: which is "1" the app's own bars decide)
  const off = ((g.origin - O) % (g.bar / 2) + g.bar / 2) % (g.bar / 2);
  assert.ok(Math.min(off, g.bar / 2 - off) < 0.02, `bar start ${g.origin} against ${O} (off by ${off} s)`);
});

test('drums: kicks, snares and hats sorted into their own sounds, each in its place, the snare\'s early feel kept', () => {
  const d = drumMachine(), g = findGrid(d, SR, { bpm: BPM }), r = readDrums(d, SR, g, { groups: 3 });
  const first = Math.round((O - g.origin) / STEP);
  const at = (k) => r.steps[k].map((s) => ((s - first) % 16 + 16) % 16);
  const kickName = Object.keys(r.steps).find((k) => k.startsWith('kick'));
  assert.ok(kickName, `a kick group among ${Object.keys(r.steps)}`);
  assert.deepEqual([...new Set(at(kickName))].sort((a, b) => a - b), [0, 8]);
  const sn = Object.keys(r.steps).find((k) => { const p = new Set(at(k)); return p.has(4) && p.has(12) && !p.has(2); });
  assert.ok(sn, `a group on beats 2 and 4: ${JSON.stringify(Object.fromEntries(Object.keys(r.steps).map((k) => [k, [...new Set(at(k))]])))}`);
  assert.ok(Math.abs(r.feel[sn] * 1000 + 25) < 6, `the snare's feel ${r.feel[sn] * 1000} ms, played 25 ms early`);
  assert.ok(Math.abs(r.feel[kickName] * 1000) < 6, `the kick's feel ${r.feel[kickName] * 1000} ms`);
  for (const x of Object.values(r.sounds)) assert.ok(x.length > 0.04 * SR && x.length < 0.4 * SR);
});

test('drums: a push on the "e" of each beat is kept for those hits alone, on their own line in the program', () => {
  // hats on every 16th: on the beat and the "and" on time, the "e" 20 ms early, the "a" on time; kick on 1 and 3
  const out = new Float32Array(Math.round((O + BARS * 2 + 1) * SR));
  for (let b = 0; b < BARS; b++) for (let s = 0; s < 16; s++) {
    const t = O + (b * 16 + s) * STEP;
    if (s === 0 || s === 8) put(out, kick(), t);
    put(out, hat(), t + (s % 4 === 1 ? -0.02 : 0.002), 0.6);
  }
  const quiet = new Float32Array(out.length), parts = { drums: out, bass: quiet, other: quiet, vocals: quiet };
  const r = rebuild(parts, SR, { bpm: BPM, origin: O, from: O, bars: 4 }), first = Math.round((O - r.grid.origin) / STEP);
  // (the hats' own group: the biggest; a hat that rings out of a kick can be grouped with it, as before)
  const drumEv = r.events.filter((e) => e.part === 'drums'), count = (k) => drumEv.filter((e) => e.sound === k).length;
  const hatName = Object.keys(r.drums.sounds).sort((x, y) => count(y) - count(x))[0], hats = drumEv.filter((e) => e.sound === hatName);
  const by = [0, 1, 2, 3].map((p) => hats.filter((e) => (((e.step - first) % 4) + 4) % 4 === p).map((e) => Math.round(e.shift * 1000)));
  assert.ok(by[1].length && by[1].every((v) => Math.abs(v + 20) <= 4), `the "e" hats pushed 20 ms early: ${by[1]}`);
  for (const p of [0, 2, 3]) assert.ok(by[p].length && by[p].every((v) => Math.abs(v - 2) <= 4), `place ${p} on time: ${by[p]}`);
  const a = render(r, parts, SR), { code } = program(r, a.gain);
  const lines = code.split('\n').filter((l) => l.includes(`thisSong_${hatName}")`));
  assert.equal(lines.length, 2, `two lines for ${hatName}:\n${lines.join('\n')}`);
  assert.ok(lines.some((l) => /\.early\(0\.0(09|10)\d\)/.test(l)), `one line 20 ms early (0.0100 of a 2 s bar):\n${lines.join('\n')}`);
});

test('bass: the notes of a line, held as long as they sound, all from one cut note', () => {
  const g = { step: STEP, origin: O, bar: 16 * STEP, beat: 4 * STEP }, line = [[0, 4, 33], [4, 4, 36], [8, 2, 40], [12, 4, 38]];   // A1, C2, E2, D2
  const out = new Float32Array(Math.round((O + 4 * 2 + 1) * SR));
  for (let b = 0; b < 4; b++) for (const [s, L, m] of line) {
    const t0 = O + (b * 16 + s) * STEP, f = 440 * 2 ** ((m - 69) / 12), n = Math.round(L * STEP * SR * 0.95);
    put(out, Float32Array.from({ length: n }, (_, i) => (0.6 * Math.sin(2 * Math.PI * f * i / SR) + 0.3 * Math.sin(4 * Math.PI * f * i / SR)) * Math.min(1, i / 60, (n - i) / 200)), t0);
  }
  const r = readBass(out, SR, g);
  const got = [...r.notes.entries()].filter(([s]) => s >= 16 && s < 48).map(([s, [m, L]]) => [(s - 16) % 16, L, m]).sort((a, b) => a[0] - b[0]);
  for (const [s, L, m] of line) {
    const n = got.find((x) => x[0] === s);
    assert.ok(n, `a note on step ${s}: ${JSON.stringify(got)}`);
    assert.equal(n[2], m, `step ${s}: ${noteName(n[2])} against ${noteName(m)}`);
    assert.ok(Math.abs(n[1] - L) <= 1, `step ${s}: held ${n[1]} sixteenths against ${L}`);
  }
  assert.ok(r.sample && r.sample.length > 0.1 * SR, 'one cut note to play them all');
});

test('voice: phrases at their true starts, and one over the first bar line cut there', () => {
  const g = { step: STEP, origin: O, bar: 16 * STEP, beat: 4 * STEP }, out = new Float32Array(Math.round(8 * SR));
  const tone = (secs) => Float32Array.from({ length: Math.round(secs * SR) }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 330 * i / SR) * Math.min(1, i / 200, (secs * SR - i) / 200));
  put(out, tone(1.0), O + 3 * STEP + 0.04);   // starts 40 ms after a 16th
  put(out, tone(1.5), O + 14 * STEP);          // runs over the bar line at step 16
  const r = readVoice(out, SR, g, { from: 16 });
  const starts = [...r.phrases.entries()].map(([s, [, off]]) => [s, off]);
  const p = starts.find(([s]) => s === 3);
  assert.ok(p, `a phrase on step 3: ${JSON.stringify(starts)}`);
  assert.ok(Math.abs(p[1] - 0.02) <= 0.006, `its start kept (sample from 20 ms before the voice, at +40 ms): ${p[1]}`);
  assert.ok(starts.some(([s, off]) => s === 16 && off === 0), `the long phrase cut at the bar line: ${JSON.stringify(starts)}`);
});

test('keys: a half bar that repeats is played from its first time', () => {
  const g = { step: STEP, origin: O, bar: 16 * STEP, beat: 4 * STEP }, H = 8 * STEP, out = new Float32Array(Math.round((O + 6 * H + 0.5) * SR));
  const chord = (fs) => Float32Array.from({ length: Math.round(H * SR) }, (_, i) => fs.reduce((s, f) => s + 0.2 * Math.sin(2 * Math.PI * f * i / SR), 0) * Math.exp(-i / (0.6 * SR)));
  const A = chord([220, 277, 330]), B = chord([196, 247, 294, 392]);
  [A, B, A, B, A, B].forEach((c, i) => put(out, c, O + i * H));
  const r = readKeys(out, SR, g), ids = [...r.slices.entries()].sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  assert.deepEqual(ids.slice(0, 6), [0, 1, 0, 1, 0, 1]);
  assert.equal(r.sounds.length >= 2, true);
});

test('the program: every bar adds up to 16 sixteenths, only documented Strudel, and the audio plays what it says', () => {
  const d = drumMachine(), n = d.length, quiet = new Float32Array(n);
  const parts = { drums: d, bass: quiet, other: quiet, vocals: quiet };
  const r = rebuild(parts, SR, { bpm: BPM, from: O, bars: 4 }), a = render(r, parts, SR), { code, files } = program(r, a.gain);
  assert.equal(r.count, 4);
  for (const m of code.matchAll(/(?:struct|note|n)\("<([^>]*)>"\)/g)) {
    for (const bar of m[1].match(/\[[^\]]*\]/g)) {
      const w = bar.slice(1, -1).trim().split(/\s+/).reduce((s, t) => s + (t.includes('@') ? +t.split('@')[1] : 1), 0);
      assert.equal(w, 16, `a bar of ${w}: ${bar}`);
    }
    assert.equal([...m[1].matchAll(/\[[^\]]*\](?:!(\d+))?/g)].reduce((n, x) => n + (x[1] ? +x[1] : 1), 0), 4, `four bars in ${m[1]}`);
  }
  assert.doesNotMatch(code, /nudge/);
  assert.match(code, /^samples\(\{/m); assert.match(code, /setcpm\(30\.000\)/); assert.match(code, /\.early\(0\.0[01]\d+\)/);
  for (const f of code.matchAll(/'([\w/]+\.wav)'/g)) assert.ok(files[f[1]], `the program names ${f[1]} and it is written`);
  // each kick event's sound starts exactly at its step plus its group's feel
  const kickName = Object.keys(r.drums.sounds).find((k) => k.startsWith('kick'));
  const ev = r.events.find((e) => e.sound === kickName), x = r.drums.sounds[kickName];
  const at = Math.round((r.grid.origin + ev.step * r.grid.step + ev.shift - a.start) * SR);
  let max = 0; for (let i = 0; i < 400; i++) max = Math.max(max, Math.abs(a.parts.drums[at + 100 + i] - x[100 + i]));
  assert.ok(max < 0.35, `the kick lands where the program puts it (largest difference ${max})`);
});

test('the app\'s own bar line is used when X gives it, and a sample is a well-formed WAV', async () => {
  const { wavBytes } = await import('../renderer/rebuild.js');
  const g = findGrid(drumMachine(), SR, { bpm: BPM, origin: O + 2 * 2 + 0.5 });   // (any bar of the line, plus a beat)
  assert.equal(g.bpm, BPM);
  assert.ok(Math.abs(g.origin - (O + 0.5)) < 1e-9, `origin ${g.origin}`);
  const b = wavBytes(Float32Array.from([0, 0.5, -1, 1]), SR), v = new DataView(b.buffer);
  assert.equal(String.fromCharCode(...b.slice(0, 4)), 'RIFF'); assert.equal(String.fromCharCode(...b.slice(8, 12)), 'WAVE');
  assert.equal(v.getUint32(24, true), SR); assert.equal(v.getUint32(40, true), 8); assert.equal(b.length, 52);
  assert.deepEqual([0, 1, 2, 3].map((i) => v.getInt16(44 + 2 * i, true)), [0, 16384, -32767, 32767]);
});

test('the app\'s tempo read double is set aside for the drums\' own', () => {
  const d = drumMachine(), quiet = new Float32Array(d.length);
  const r = rebuild({ drums: d, bass: quiet, other: quiet, vocals: quiet }, SR, { bpm: 2 * BPM, origin: O, from: O });
  assert.ok(Math.abs(r.grid.bpm - BPM) < 0.3, `bpm ${r.grid.bpm}`);
  const r2 = rebuild({ drums: d, bass: quiet, other: quiet, vocals: quiet }, SR, { bpm: BPM, origin: O, from: O });
  assert.equal(r2.grid.bpm, BPM, 'a tempo that agrees is kept as given');
});

// a whole made-up song at 120 BPM: the drum machine, a bass line on the kicks, a singer's phrases and a pair of chords, all loud and landing together
function wholeSong() {
  const d = drumMachine(), n = d.length, H = 8 * STEP, bass = new Float32Array(n), vocals = new Float32Array(n), other = new Float32Array(n);
  for (let b = 0; b < BARS; b++) {
    for (const [s, m] of [[0, 33], [8, 36]]) {
      const f = 440 * 2 ** ((m - 69) / 12), len = Math.round(8 * STEP * SR * 0.95);
      put(bass, Float32Array.from({ length: len }, (_, i) => 0.9 * Math.sin(2 * Math.PI * f * i / SR) * Math.min(1, i / 60, (len - i) / 200)), O + (b * 16 + s) * STEP);
    }
    const tone = (secs, f) => Float32Array.from({ length: Math.round(secs * SR) }, (_, i) => 0.9 * Math.sin(2 * Math.PI * f * i / SR) * Math.min(1, i / 200, (secs * SR - i) / 200));
    if (b % 3 === 0) put(vocals, tone(0.6, 330), O + (b * 16 + 3) * STEP + 0.02);
    if (b % 3 === 1) put(vocals, tone(0.6, 392), O + (b * 16 + 6) * STEP);
    const chord = (fs) => Float32Array.from({ length: Math.round(H * SR) }, (_, i) => fs.reduce((s, f) => s + 0.3 * Math.sin(2 * Math.PI * f * i / SR), 0) * Math.exp(-i / (0.6 * SR)));
    put(other, chord(b % 2 ? [196, 247, 294] : [220, 277, 330]), O + b * 16 * STEP); put(other, chord(b % 2 ? [220, 277, 330] : [196, 247, 294]), O + (b * 16 + 8) * STEP);
  }
  const q = (x) => Float32Array.from(x, (v) => v * 0.55);   // (about as loud as a mastered song's parts)
  return { drums: q(d), bass: q(bass), other: q(other), vocals: q(vocals) };
}
const rebuiltSong = () => { const parts = wholeSong(), r = rebuild(parts, SR, { bpm: BPM, from: O, bars: 8 }), a = render(r, parts, SR); return { parts, r, a, ...program(r, a.gain) }; };
// how many sounds a line of the program starts, as Strudel reads it: a line whose first call is n("<bars>") starts one sound for every
// value in its bars (the structure is n's); one that begins s("name").n(...) takes its structure from s, so a value not at the very start of a cycle never starts
const startsOf = (line) => {
  const m = line.match(/^\s*(n|s|note)\("<([^>]*)>"\)/); if (!m) return 0;
  let k = 0; for (const [, bar, rep] of m[2].matchAll(/(\[[^\]]*\])(?:!(\d+))?/g)) k += (rep ? +rep : 1) * bar.slice(1, -1).trim().split(/\s+/).filter((t) => !t.startsWith('~')).length;
  return k;
};

test('the program: every voice and keys event starts when Strudel plays it (n() first, the way the bass line is, so its values are the events)', () => {
  const { r, code } = rebuiltSong(), lines = code.split('\n');
  for (const part of ['voice', 'keys']) {
    const mine = lines.filter((l) => l.includes(`.s("thisSong_${part}")`)), events = r.events.filter((e) => e.part === part).length;
    assert.ok(events >= 4, `${events} ${part} events in the song`);
    assert.ok(mine.length >= 1, `a ${part} line`);
    for (const l of mine) assert.match(l, /^\s*n\("</, `the line starts with n(): ${l}`);
    assert.equal(mine.reduce((n, l) => n + startsOf(l), 0), events, `${part}: a start for each of ${events} events`);
  }
  assert.doesNotMatch(code, /s\("thisSong_(voice|keys)"\)\.n\(/);
  // the same count for the other lines, so the counting itself is checked on lines that always worked
  const kicks = lines.filter((l) => /^\s*s\("thisSong_kick\d*"\)\.struct/.test(l));
  assert.ok(kicks.length >= 1);
});

test('the program: each keys event is written as long as it plays (the line is clipped to its events), and the voice lines are not clipped', () => {
  const { r, code } = rebuiltSong(), line = code.split('\n').find((l) => l.includes('.s("thisSong_keys")'));
  const keys = r.events.filter((e) => e.part === 'keys');
  assert.ok(keys.length >= 4 && line && line.includes('.clip(1)'));
  // what the line writes: [step in the song, written length in sixteenths] for every event, bar by bar (the bars' ! repeats opened out)
  const written = []; let bar = 0;
  for (const [, txt, rep] of line.match(/n\("<([^>]*)>"\)/)[1].matchAll(/\[([^\]]*)\](?:!(\d+))?/g)) {
    for (let k = 0; k < (rep ? +rep : 1); k++, bar++) { let s = 0; for (const tok of txt.trim().split(/\s+/)) { const [v, L = 1] = tok.split('@'); if (v !== '~') written.push([bar * 16 + s, +L]); s += +L; } }
  }
  const want = keys.map((e) => [e.step - r.first, e.steps]).sort((a, b) => a[0] - b[0]);
  assert.ok(want.every(([, L]) => L > 1), `a keys event plays more than a sixteenth: ${JSON.stringify(want.slice(0, 3))}`);
  assert.deepEqual(written, want, 'each keys event is written from its step for as many sixteenths as it plays');
  // the voice lines are not clipped: a phrase plays to its end whatever the next event is
  for (const l of code.split('\n').filter((l) => l.includes('.s("thisSong_voice")'))) assert.doesNotMatch(l, /clip/, l);
});

test('the program\'s gains: the sounds landing together stay under full scale, and the sum is as loud as it can be for that', () => {
  const { r, a, parts } = rebuiltSong(), N = a.length;
  const mix = (g) => { const m = new Float32Array(N); for (const p of Object.keys(a.parts)) for (let i = 0; i < N; i++) m[i] += a.parts[p][i] * g[p]; return m; };
  const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0), rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  const loud = mix(a.matched), safe = mix(a.gain);
  assert.ok(peak(loud) > 1.2, `the song as it was in the record peaks over full scale when its sounds land together (${peak(loud).toFixed(2)}): this test needs that`);
  assert.ok(peak(safe) <= 0.98, `the code's sum peaks at ${peak(safe).toFixed(3)}`);
  assert.equal(Math.round(a.peak * 1e6), Math.round(peak(safe) * 1e6), 'render reports the peak it measured');
  assert.ok(peak(safe) >= 0.85, `and not further down than needed (${peak(safe).toFixed(3)})`);
  // one common factor: the parts keep their balance (to the hundredth the code is written in)
  const f = a.gain.drums / a.matched.drums;
  for (const p of Object.keys(a.gain)) assert.ok(Math.abs(a.gain[p] - a.matched[p] * f) <= 0.02, `${p}: ${a.gain[p]} against ${a.matched[p]} x ${f.toFixed(3)}`);
  assert.ok(rms(safe) < rms(loud));
  // a song that never goes over is left at the levels it had
  const quiet = { drums: Float32Array.from(parts.drums, (v) => v * 0.1), bass: Float32Array.from(parts.bass, (v) => v * 0.1), other: Float32Array.from(parts.other, (v) => v * 0.1), vocals: Float32Array.from(parts.vocals, (v) => v * 0.1) };
  const a2 = render(r, quiet, SR); assert.deepEqual(a2.gain, a2.matched); assert.ok(a2.peak <= 0.97);
});

test('master: nothing over -1 dBFS, a quiet file untouched, the level back up after a peak', () => {
  const sr = SR, x = Float32Array.from({ length: 2 * sr }, (_, i) => 0.3 * Math.sin(2 * Math.PI * 110 * i / sr));
  assert.deepEqual(master(x, sr), x, 'a file under the ceiling is returned as it was');
  const y = Float32Array.from(x); for (let i = 0; i < 40; i++) y[sr + i] = 2.5 * Math.sin(2 * Math.PI * 800 * i / sr);   // a burst 8 dB over full scale at 1 s
  const m = master(y, sr), peak = m.reduce((v, s) => Math.max(v, Math.abs(s)), 0);
  assert.ok(peak <= 0.89 + 1e-6, `peak ${peak}`);
  assert.ok(peak > 0.85, `the burst is turned down only as far as it needs (${peak})`);
  for (let i = 0; i < sr / 2; i++) assert.equal(m[i], x[i], `untouched well before the burst, at ${i}`);   // (the look-ahead is milliseconds)
  const late = Math.round((1 + 1.0) * sr) - 1; assert.ok(Math.abs(m[late] - x[late]) < 0.01 * 0.3 + 1e-4, `back to level a second later (${m[late]} against ${x[late]})`);
  const rms = (a, from, to) => { let s = 0; for (let i = from; i < to; i++) s += a[i] ** 2; return Math.sqrt(s / (to - from)); };
  assert.ok(rms(m, 0, 2 * sr) > 0.9 * rms(x, 0, 2 * sr), 'one burst does not turn the whole file down');
});

test('the saved rebuilt.wav: kept at the song\'s loudness, no sample at full scale, louder than the old peak scale', () => {
  const { a } = rebuiltSong(), N = a.length, mix = new Float32Array(N);
  for (const p of Object.keys(a.parts)) for (let i = 0; i < N; i++) mix[i] += a.parts[p][i] * a.matched[p];
  const file = fileMix(a, SR), rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length), peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak(file) <= 0.95, `peak ${peak(file)}`);
  assert.equal(file.filter((v) => Math.abs(v) >= 1).length, 0);
  const dB = (v) => 20 * Math.log10(v);
  assert.ok(Math.abs(dB(rms(file)) - dB(rms(mix))) <= 2, `the file's level ${dB(rms(file)).toFixed(1)} dB against the parts at theirs ${dB(rms(mix)).toFixed(1)}`);
  const old = rms(mix) * 0.9 / peak(mix);   // what the file was: the whole mix scaled so its peak is 0.9
  assert.ok(rms(file) > old * 1.2, `louder than the peak scale (${dB(rms(file)).toFixed(1)} against ${dB(old).toFixed(1)} dB)`);
});
