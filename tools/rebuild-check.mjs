// rebuild-check.mjs: the app's rebuild (renderer/rebuild.js) run on a song's four split parts, against the record: the tempo, the
// drum lines, the bass and the voice it reads, and the sound-match number (40 log bands every 23 ms, correlated with the record over
// the same seconds; the offline proof's measure: 0.85 on Eyes Without a Face, 0.78 on Somebody That I Used to Know). Writes the
// rebuilt audio, the program and its samples.
//   node tools/rebuild-check.mjs <dir with drums/bass/other/vocals.wav> <mix.wav (same start)> <from s> <bars> <out dir> [rate] [bpm]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rebuild, render, program, fft } from '../renderer/rebuild.js';

const [dir, mixFile, fromS, barsS, out, rateS = '44100', bpmS] = process.argv.slice(2);
if (!out) { console.error('usage: node tools/rebuild-check.mjs <parts dir> <mix.wav> <from s> <bars> <out dir> [rate] [bpm]'); process.exit(2); }
const sr = +rateS;
const load = (f) => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4).slice(); };
const parts = Object.fromEntries(['drums', 'bass', 'other', 'vocals'].map((p) => [p, load(path.join(dir, `${p}.wav`))]));
const mix = load(mixFile);
const t0 = performance.now();
const r = rebuild(parts, sr, { from: +fromS, bars: +barsS, bpm: bpmS ? +bpmS : null });
const audio = render(r, parts, sr);
const { code, files } = program(r, audio.gain);
const ms = Math.round(performance.now() - t0);
const N = audio.length, mixed = new Float32Array(N);
for (const p of Object.keys(audio.parts)) for (let i = 0; i < N; i++) mixed[i] += audio.parts[p][i] * audio.gain[p];
let peak = 1e-9; for (const v of mixed) peak = Math.max(peak, Math.abs(v));

// the sound-match number, as the proof's: mono at 22.05 kHz, 1024-sample frames every 512, 40 log-spaced bands
function bands(x) {
  const n = 1024, re = new Float64Array(n), im = new Float64Array(n), w = Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  const e = Array.from({ length: 41 }, (_, i) => Math.floor(2 * (480 / 2) ** (i / 40))), rows = [];
  for (let at = 0; at + n <= x.length; at += 512) {
    for (let i = 0; i < n; i++) { re[i] = x[at + i] * w[i]; im[i] = 0; }
    fft(re, im);
    rows.push(e.slice(0, -1).map((a, b) => { let s = 0; for (let k = a; k <= e[b + 1]; k++) s += Math.hypot(re[k], im[k]); return Math.log1p(s * 10); }));
  }
  return rows;
}
const to22 = (x) => { const f = sr / 22050; return Float64Array.from({ length: Math.floor(x.length / f) }, (_, i) => x[Math.floor(i * f)]); };
function sim(a, b) {
  const A = bands(to22(a)), B = bands(to22(b)), k = Math.min(A.length, B.length);
  let ma = 0, mb = 0, n = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < 40; j++) { ma += A[i][j]; mb += B[i][j]; n++; }
  ma /= n; mb /= n;
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < 40; j++) { const p = A[i][j] - ma, q = B[i][j] - mb; ab += p * q; aa += p * p; bb += q * q; }
  return ab / Math.sqrt(aa * bb);
}
const a0 = Math.round(audio.start * sr), rec = mix.subarray(a0, a0 + N);
const match = sim(rec, mixed);

fs.mkdirSync(path.join(out, 'samples/voice'), { recursive: true }); fs.mkdirSync(path.join(out, 'samples/keys'), { recursive: true });
const wav = (f, x, scale = 1) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', '-', f], { input: Buffer.from(Float32Array.from(x, (v) => v * scale).buffer) });
wav(path.join(out, 'rebuilt.wav'), mixed, 0.9 / peak);
for (const [f, x] of Object.entries(files)) wav(path.join(out, 'samples', f), x);
fs.writeFileSync(path.join(out, 'code.js'), code);
const g = r.grid, line = (k) => [0, 1].map((b) => Array.from({ length: 16 }, (_, i) => (r.drums.steps[k].includes(r.first + b * 16 + i) ? 'x' : '.')).join(''));
const info = {
  rate: sr, ms, bpm: +g.bpm.toFixed(3), bar_start_s: +audio.start.toFixed(3), seconds: +(r.count * g.bar).toFixed(2), match: +match.toFixed(3),
  hits: Object.fromEntries(Object.entries(r.drums.steps).map(([k, v]) => [k, v.length])), drum_bars_1_2: Object.fromEntries(Object.keys(r.drums.steps).map((k) => [k, line(k)])),
  drum_feel_ms: Object.fromEntries(Object.entries(r.drums.feel).map(([k, v]) => [k, +(v * 1000).toFixed(1)])),
  bass_notes_in_window: r.events.filter((e) => e.part === 'bass').length, bass_root: r.bass.root, voice_phrases_in_window: r.events.filter((e) => e.part === 'voice').length,
  keys_slices: r.events.filter((e) => e.part === 'keys').length, gains: audio.gain,
};
fs.writeFileSync(path.join(out, 'info.json'), JSON.stringify(info, null, 1));
console.log(JSON.stringify(info));
