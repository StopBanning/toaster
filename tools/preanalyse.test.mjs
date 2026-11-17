// The library's songs listened to ahead of time (renderer/preanalyse.js): the scheduler only works when the app is idle, one at a time, keeps what it learns in the song memory, never
// looks again at a song it had nothing to keep of, and goes quiet the moment it is told to stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSongMemory } from '../renderer/song-memory.js';
import { createPreanalysis } from '../renderer/preanalyse.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const line = (...on) => Array.from({ length: 16 }, (_, i) => on.includes(i));
const snap = { bpm: 120, parts: { bd: line(0, 4, 8, 12) } };
const track = (title) => ({ title, artist: '', file: { arrayBuffer: async () => new ArrayBuffer(8) } });
const waitFor = async (f, ms = 3000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 5)); } };

test('only when the app is idle: nothing is read while it is busy, and it starts when it stops being busy', async () => {
  const mem = createSongMemory(store()); let busy = true, reads = 0;
  const p = createPreanalysis({ library: () => [track('a')], read: async (t) => { reads++; return t.file; }, keyOf: (t) => 'x|' + t.title, memory: mem, idle: () => !busy, analyse: async () => ({ snapshots: [snap] }), between: 1 });
  p.start();
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(reads, 0);
  busy = false;
  await waitFor(() => mem.prior('x|a'), 5000);
  assert.equal(reads, 1);
  p.stop();
});

test('what it learns goes into the song memory, so the first play of the song is a repeat; a song with a memory is not looked at again', async () => {
  const mem = createSongMemory(store()); const seen = [];
  const p = createPreanalysis({ library: () => [track('a'), track('b')], read: async (t) => t.file, keyOf: (t) => 'x|' + t.title, memory: mem, idle: () => true, analyse: async () => { seen.push(1); return { snapshots: [snap, snap] }; }, between: 1 });
  p.start();
  await waitFor(() => p.state.done === 2, 5000);
  p.stop();
  assert.deepEqual(mem.prior('x|a').parts.bd, line(0, 4, 8, 12));
  assert.equal(mem.prior('x|b').bpm, 120);
  assert.equal(seen.length, 2);
});

test('a song it had nothing to keep of is marked and not tried again; one it was told to give up on (the app got busy) is left for later', async () => {
  const mem = createSongMemory(store()); let calls = 0, mode = 'empty';
  const p = createPreanalysis({ library: () => [track('a')], read: async (t) => t.file, keyOf: (t) => 'x|' + t.title, memory: mem, idle: () => true, analyse: async () => { calls++; return mode === 'empty' ? null : { aborted: true }; }, between: 1 });
  p.start();
  await waitFor(() => p.state.gaveUp === 1, 3000);
  await new Promise((r) => setTimeout(r, 100));
  p.stop();
  assert.equal(mem.tried('x|a'), true);
  assert.equal(calls, 1);
  const mem2 = createSongMemory(store()); let n = 0;
  const q = createPreanalysis({ library: () => [track('a')], read: async (t) => t.file, keyOf: (t) => 'x|' + t.title, memory: mem2, idle: () => true, analyse: async () => { n++; return { aborted: true }; }, between: 1 });
  q.start();
  await waitFor(() => n >= 1, 3000);
  q.stop();
  assert.equal(mem2.tried('x|a'), false);
});

test('the real analysis runs the engine on a second copy with a clock of its own, in the page\'s idle time, in small steps', () => {
  const pre = fs.readFileSync(new URL('../renderer/preanalyse.js', import.meta.url), 'utf8');
  assert.match(pre, /import\('\.\/engine\.js\?analysis'\)/);
  assert.match(pre, /engine\.useOwnTime\(\(\) => now\)/);
  assert.match(pre, /k % 100 === 0/);
  const eng = fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8');
  assert.match(eng, /export const useOwnTime/);
  assert.ok(eng.includes('globalThis.clock?.now() ?? performance.now() / 1000'), 'the bench swaps this text for its own clock');
  const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  for (const guard of ['eng.silent && nowSec() - eng.lastSound > 10', '!(state.el && !state.el.paused)', '!rec.mr', '!takeRec.id', '!takeRec.starting', '!libraryPanel.state?.scanning']) assert.ok(app.includes(guard), guard);
  assert.match(app, /if \(preanalysis \|\| TAKE \|\| WIDGET/);
  assert.match(app, /libraryPanel\.ready\(\)\.then\(\(p\) => p\.load\(\)\)/); // (the library, loaded quietly once the app is idle, if the tab was never opened)
  assert.match(app, /!libraryAsked && !state\.mini && window\.nc\?\.libraryScan && preIdle\(\)/);
});

// The sweep, Nov 16 (finding 2): a library over the song memory's cap. The read-ahead picks the first song with nothing kept; the memory dropped the oldest at the cap, so it went round
// the first CAP+1 songs for ever (482 songs "analysed" in 0.6 s in the sweep's run) and pushed out what had been played.
test('a library bigger than the memory: the read-ahead fills what room there is, stops, and neither goes round nor pushes out a song that was played', async () => {
  const CAP = 5, mem = createSongMemory(store(), { cap: CAP });
  mem.put('x|played', snap);
  const lib = Array.from({ length: 8 }, (_, i) => track('s' + i)), order = [];
  const p = createPreanalysis({ library: () => lib, read: async (t) => t.file, keyOf: (t) => 'x|' + t.title, memory: mem, idle: () => true, between: 1,
    analyse: async () => { order.push(order.length); return { snapshots: [snap, snap, snap] }; } });
  p.start();
  await waitFor(() => mem.size() === CAP && p.state.full, 3000);
  await new Promise((r) => setTimeout(r, 300));   // (a looping read-ahead would have gone on analysing)
  p.stop();
  assert.equal(order.length, CAP - 1, 'one analysis for each place that was free, no more');
  assert.equal(p.state.done, CAP - 1);
  assert.equal(mem.size(), CAP);
  assert.ok(mem.prior('x|played'), 'the song that was played is still there');
  for (const i of [0, 1, 2, 3]) assert.ok(mem.prior('x|s' + i), 'read ahead: s' + i);
  assert.equal(mem.prior('x|s0').n, 3, 'all of a song\'s snapshots are kept, not only the first');
  assert.equal(mem.prior('x|s4'), null);
  // a song played now takes the place of a read-ahead one, and the read-ahead does not pick that one up again
  mem.put('x|heard', snap);
  assert.equal(mem.size(), CAP);
  assert.ok(mem.prior('x|played') && mem.prior('x|heard'));
  assert.equal(mem.prior('x|s0'), null, 'the oldest read-ahead song made way');
});
