// The detection bench: one checkout's engine over the reference songs, offline and deterministic, then scored.
//   node tools/detbench/run.mjs --root=<checkout> --out=<results.json> [--sets=full,mid,kick,synth] [--only=a,b] [--par=6] [--sr=48000] [--offsets=0,5,10] [--gain=1]
//   node tools/detbench/score.mjs <results.json> [--vs=<baseline results.json>]
//   node tools/detbench/harmony.mjs <results.json> [--vs=<baseline results.json>] (the key line, chords and bass notes)
// Sets (references read from DETBENCH_REFS, default ~/Archive/toaster-song-references-2026-11-01, and DETBENCH_KICKREF,
// default ~/work/scratch/detbench/refs/kickref, a frozen copy of backlog/research/kickref-nov1):
//   full  the 36 songs of the downbeat key, heard from 0 for up to 150 s (tempo, beats, bar one, kick/clap lines)
//   mid   the same songs heard from 60 s for 60 s, as a DJ drops Toaster into a song (tempo, bar one)
//   kick  the drum-stem kick references, heard from 0 to the end of each reference window (kick line)
//   synth tools/checks.js's test songs (two takes each), made offline with what was played kept as the truth
//   key   Better Off Alone (Ab minor) and Toz Pembe (D minor) from 0 for 150 s, each at five poll phases (the key line)
//   held  the key work's twelve held-out songs from 0 for 150 s (the key line, chords and bass; harmony.mjs)
// (key and held run only when asked for: --sets=full,mid,kick,synth,key,held)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const home = os.homedir();
export const REFS = process.env.DETBENCH_REFS || path.join(home, 'Archive/toaster-song-references-2026-11-01');
export const KICKREF = process.env.DETBENCH_KICKREF || path.join(home, 'work/scratch/detbench/refs/kickref');
export const KICKEXTRA = [path.join(home, 'work/now-coding/backlog/research/kickref-nov2'), path.join(home, 'work/scratch/vet-saints/ref')];
const AUDIO = path.join(home, 'work/scratch/toaster-audio');
const local = (p) => {
  if (!p) return null;
  const f = p.split(/[\\/]/).pop();
  return [path.join(AUDIO, f), path.join(REFS, 'downbeat-key/inputs/audio', f)].find((x) => fs.existsSync(x)) || path.join(AUDIO, f);
};
export const KEYSONGS = ['betteroffalone-alicedeejay', 'tozpembe-manifest'];
export const HELDSONGS = ['prettyravegirl-s3rl', 'afterdark-mrkitty', 'baptism-crystalcastles', 'char-crystalcastles', 'musicformachines-grimes',
  'lady-modjo', 'language-porter', 'callonme-prydz', 'goomuck', 'levels-avicii', 'dracula-tameimpala', 'ghostbusters-rpj'];

export function songs() {
  const out = [];
  for (const f of fs.readdirSync(path.join(REFS, 'downbeat-key/key')).filter((x) => x.endsWith('.json')).sort()) {
    const key = JSON.parse(fs.readFileSync(path.join(REFS, 'downbeat-key/key', f), 'utf8'));
    const truthFile = path.join(REFS, 'gt/truth', key.key + '.json');
    const truth = fs.existsSync(truthFile) ? JSON.parse(fs.readFileSync(truthFile, 'utf8')) : null;
    const audio = local(truth?.source);
    if (!audio || !fs.existsSync(audio)) continue;
    out.push({ key: key.key, audio, duration: truth.duration });
  }
  return out;
}
export function kickSongs(includeExtra = false) {
  const dirs = includeExtra ? [KICKREF, ...KICKEXTRA] : [KICKREF];
  return dirs.filter((d) => fs.existsSync(d)).flatMap((dir) =>
    fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort().flatMap((f) => {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        return fs.existsSync(r.audio) ? [{ key: r.slug, audio: r.audio, end: r.window[1] }] : [];
      } catch { return []; }
    })
  );
}
export function synthSongs(root) {
  const checks = fs.readFileSync(path.join(root, 'tools/checks.js'), 'utf8');
  return [...checks.slice(checks.indexOf('  const SONGS = {'), checks.indexOf('  // Plays a song')).matchAll(/^    (\w+)(?:,|:)/gm)].map((m) => m[1]);
}
export function jobs(sets, only, root = path.join(here, '../..')) {
  const js = [];
  const pick = (k) => !only || only.includes(k);
  if (sets.includes('full')) for (const s of songs()) if (pick(s.key)) js.push({ key: 'full:' + s.key, audio: s.audio, from: 0, seconds: Math.min(150, s.duration - 0.5) });
  if (sets.includes('mid')) for (const s of songs()) if (pick(s.key) && s.duration > 125) js.push({ key: 'mid:' + s.key, audio: s.audio, from: 60, seconds: 60 });
  if (sets.includes('synth')) for (const k of synthSongs(root)) for (const seed of [k, k + ' 2']) if (pick(k)) js.push({ key: `synth:${k}${seed === k ? '' : '#2'}`, synth: k, seed, from: 0, seconds: k === 'change' ? 85 : 45 });
  if (sets.includes('kick')) for (const s of kickSongs(!!only)) if (pick(s.key)) js.push({ key: 'kick:' + s.key, audio: s.audio, from: 0, seconds: +(s.end + 1).toFixed(2) });
  // (bench instrumentation, harmony.mjs) key: two songs whose key is known, from the start at five poll phases (the key
  // they settle on has hung on a few ms of timing); held: the key work's held-out songs (round 3's twelve), from the start
  for (const [set, list] of [['key', KEYSONGS], ['held', HELDSONGS]]) {
    if (!sets.includes(set)) continue;
    for (const k of list) {
      const audio = path.join(AUDIO, k + '.webm');
      if (!fs.existsSync(audio) || !pick(k)) continue;
      for (const phase of set === 'key' ? [0, 0.003, 0.006, 0.009, 0.012] : [0]) js.push({ key: `${set}:${k}${phase ? '#' + Math.round(phase * 1000) : ''}`, audio, from: 0, phase, seconds: 150 });
    }
  }
  return js;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(arg('root', path.join(here, '../..')));
  const out = path.resolve(arg('out', 'detbench-results.json'));
  // (--offsets=0,5,10: each song once per poll offset in ms; the lines are sensitive to where the polls fall, as live runs differ)
  const offsets = arg('offsets', '0').split(',').map(Number);
  const js = offsets.flatMap((o) => jobs(arg('sets', 'full,mid,kick,synth').split(','), arg('only')?.split(','), root)
    .map((j) => (o ? { ...j, key: `${j.key}@${o}`, offset: o / 1000 } : j)));
  if (arg('gain')) for (const j of js) j.gain = +arg('gain'); // (the level the engine hears at: 0.1 is 20 dB down, as an app turned down or a quiet microphone)
  const jobFile = out.replace(/\.json$/, '') + '.jobs.json';
  fs.writeFileSync(jobFile, JSON.stringify(js));
  const electron = path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const bin = fs.existsSync(electron) ? electron : path.join(here, '../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const r = spawnSync(bin, [path.join(here, 'host.cjs'), `--root=${root}`, `--jobs=${jobFile}`, `--out=${out}`, `--par=${arg('par', 6)}`, `--sr=${arg('sr', 48000)}`],
    { stdio: ['ignore', process.argv.includes('--quiet') ? 'ignore' : 'inherit', 'ignore'] });
  fs.rmSync(jobFile, { force: true });
  // (a host that never ran, or died, fails the run: it mustn't report the songs done over an older results file)
  if (r.error || r.signal || r.status) { console.error('host failed', r.error?.message || r.signal || r.status); process.exit(r.status || 1); }
  console.log(`${js.length} songs -> ${out}`);
}
