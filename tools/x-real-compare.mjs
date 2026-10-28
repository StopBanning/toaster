// Paired real-song writer study. Captures are offline; native Strudel is mandatory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { strudelRuntime, events, hasStrudel } from './strudel-test-runtime.mjs';
import { tape } from './export-fidelity-fixtures.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const input = path.join(root, '_checks/event-ledger');
const output = path.join(root, '_checks/x-real');
fs.mkdirSync(output, { recursive: true });
if (!hasStrudel) throw Error('Native Strudel is required; set STRUDEL_TEST_MODULES');
const data = (s) => 'data:text/javascript,' + encodeURIComponent(s);
// A failed git read (including a bad object) is fatal, never a missing baseline fallback.
const original = (name) => execFileSync('git', ['show', 'a3b0324:renderer/' + name + '.js'], { cwd: root, encoding: 'utf8', maxBuffer: 4e6 });
const engine = data(original('engine'));
const codegen = data(original('codegen').replace("'./engine.js'", JSON.stringify(engine)));
const old = await import(data(original('tape').replace("'./engine.js'", JSON.stringify(engine)).replace("'./codegen.js'", JSON.stringify(codegen))));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const runtime = await strudelRuntime();
const midi = (v) => {
  if (typeof v === 'number') return v;
  const m = /^([a-g])([#b]?)(-?\d+)$/i.exec(String(v));
  if (!m) throw Error('unrecognized pitch ' + v);
  return (+m[3] + 1) * 12 + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const sounds = { bd: ['bd', 36], cp: ['sd', 39], hh: ['hhc', 42], oh: ['hho', 46], sawtooth: ['bass'], supersaw: ['chords'], triangle: ['lead'] };
const rounded = (n) => Math.round(n * 1e8) / 1e8;
const key = (e, full = false) => JSON.stringify([e.part, e.pitch, rounded(e.onset), ...(full ? [rounded(e.duration), e.velocity] : [])]);
function compare(ref, pred, full = false) {
  const remaining = new Map();
  for (const e of ref) remaining.set(key(e, full), (remaining.get(key(e, full)) || 0) + 1);
  let kept = 0;
  for (const e of pred) {
    const k = key(e, full), count = remaining.get(k) || 0;
    if (count) { kept++; remaining.set(k, count - 1); }
  }
  return { reference: ref.length, predicted: pred.length, kept, missing: ref.length - kept, extra: pred.length - kept };
}
// Historical song() chooses the rounded bar containing each snapshot's midpoint.
// This derives its original grid origin independently of the new song's padded origin.
function oldOrigin(c) {
  let stretches = [], cur, before = null;
  const origin = (down) => {
    const best = stretches.reduce((a, b) => !a || b.patterns.length > a.patterns.length ? b : a, null);
    if (!best || best.patterns.length < 4) return before;
    const d = best === cur ? down : best.down;
    return 4 * Math.min(...best.patterns.map((b) => Math.round(Math.round((b - best.moved - d) * 4) / 16)),
      ...best.harmony.map((b) => Math.floor((b - best.moved - d + 2) / 4)));
  };
  for (const { method, args } of c.tapeCalls) {
    if (method === 'reset') { before = origin(args[0] ?? 0); stretches = []; cur = null; }
    if (method === 'lock') { if (cur) cur.down = args[1]; cur = { moved: 0, down: 0, patterns: [], harmony: [] }; stretches.push(cur); }
    if (cur && method === 'shift') cur.moved += args[0];
    if (cur && method === 'pattern') cur.patterns.push(args[0] + cur.moved);
    if (cur && method === 'harmony') cur.harmony.push(args[0] + cur.moved);
  }
  return origin(c.finalDown);
}
const jobs = JSON.parse(fs.readFileSync(path.join(input, 'jobs.json')));
const rows = [];
for (const job of jobs) {
  const captureFile = path.join(input, job.key + '.json');
  if (!fs.existsSync(captureFile)) {
    if (process.argv.includes('--partial')) continue;
    throw Error('missing full capture ' + job.key);
  }
  const captureBytes = fs.readFileSync(captureFile), c = JSON.parse(captureBytes);
  assert.equal(c.duration, job.seconds);
  assert.equal(c.parity, true);
  assert.ok(c.tapeCalls.length && c.song, 'full tape capture required');
  const baseline = old.createTape(), current = tape.createTape();
  for (const { method, args } of c.tapeCalls) {
    baseline[method](...structuredClone(args)); current[method](...structuredClone(args));
  }
  const oldSong = baseline.song(c.finalDown), newSong = current.song(c.finalDown);
  assert.deepEqual(newSong, c.song, 'tape calls reproduce the captured tape');
  const origin = (newSong.timeline?.originBeat || 0) / 4;
  const reference = newSong.bars.flatMap((b, i) => tape.barEvents(b).map((e) => ({ ...e, onset: i + e.onset + origin })));
  const row = { key: job.key, duration: c.duration, captureSHA256: sha(captureBytes), parity: c.parity,
    ledgerDroppedRecords: c.ledger.capture.coverage.droppedRecords, bars: newSong.bars.length,
    bpm: newSong.bpm, coverage: newSong.coverage, timeline: newSong.timeline, writers: {} };
  const variants = [['old', old.songStrudel, oldSong, oldOrigin(c) / 4], ['new', tape.songStrudel, newSong, origin]];
  if (tape.songStrudelCompact) variants.push(['compact', tape.songStrudelCompact, newSong, origin]);
  for (const [name, write, song, offset] of variants) {
    // Serialization-only time: five warmups followed by 21 independent samples.
    for (let i = 0; i < 5; i++) write(song, job.key);
    let code; const times = [];
    for (let i = 0; i < 21; i++) { const t = performance.now(); code = write(song, job.key); times.push(performance.now() - t); }
    times.sort((a, b) => a - b);
    fs.writeFileSync(path.join(output, job.key + '-' + name + '.strudel'), code);
    let native, error = null;
    try {
      const pattern = await runtime.evaluate(code);
      // Query each cycle independently to avoid one enormous Strudel query allocation.
      native = [];
      for (let i = 0; i < song.bars.length; i++) {
        for (const n of events(pattern, i, 1)) {
          const [part, pitch] = sounds[n.value.s] ?? [];
          if (!part) throw Error('unknown sound ' + n.value.s);
          native.push({ part, pitch: pitch ?? midi(n.value.note), onset: i + n.begin + offset,
            duration: n.end - n.begin, velocity: Math.round((n.value.velocity ?? 1) * 127) });
        }
      }
    } catch (e) { error = String(e.stack || e); }
    const stats = { lines: code.trimEnd().split('\n').length, bytes: Buffer.byteLength(code),
      phrases: [...code.matchAll(/^const \w+ = (?!\(p,)/gm)].length,
      helpers: [...code.matchAll(/^const \w+ = \(p,/gm)].length,
      longestLine: Math.max(...code.split('\n').map((line) => line.length)),
      medianWriteMs: times[10], p95WriteMs: times[19],
      evaluates: !error, error, sha256: sha(code), bars: song.bars.length };
    if (native) {
      stats.onsets = compare(reference, native);
      stats.fullEvents = compare(reference, native, true);
      stats.byPart = Object.fromEntries([...new Set(reference.map((e) => e.part))].map((part) => [part,
        compare(reference.filter((e) => e.part === part), native.filter((e) => e.part === part))]));
      if (name !== 'old') assert.deepEqual(stats.fullEvents, { reference: reference.length, predicted: reference.length, kept: reference.length, missing: 0, extra: 0 }, name + ' full parity: ' + job.key);
    }
    row.writers[name] = stats;
  }
  rows.push(row);
  console.log(job.key, Object.fromEntries(Object.entries(row.writers).map(([n, s]) => [n, [s.lines, s.bytes, s.phrases, s.onsets?.kept, s.evaluates]])));
}
fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseline: 'a3b0324',
  sources: Object.fromEntries(['renderer/tape.js', 'renderer/engine.js', 'tools/event-ledger-page.js', 'tools/x-real-compare.mjs'].map((f) => [f, sha(fs.readFileSync(path.join(root, f)))])), rows }, null, 2));
