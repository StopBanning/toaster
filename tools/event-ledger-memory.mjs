// node --expose-gc tools/event-ledger-memory.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { createEventLedger } = await import('data:text/javascript,' + encodeURIComponent(
  fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8')));
if (!globalThis.gc) throw Error('Run with node --expose-gc');
const ledger = createEventLedger({ sampleRate: 48000 });
globalThis.gc(); const initialHeap = process.memoryUsage().heapUsed;
const checkpoints = [];
for (let i = 0; i < 3600 * 67; i++) {
  const t = i / 67;
  ledger.cover(t, t);
  ledger.event(t, { parts: [{ part: 'bass', confidence: null }], kind: 'pitch', sampleEnd: ledger.sample(t + .015),
    midi: 36, cents: 2.3, state: 'voiced', strength: .1, acousticConfidence: null, timingConfidence: null, status: 'observed' });
  if ((i + 1) % (600 * 67) === 0) {
    globalThis.gc(); checkpoints.push({ seconds: (i + 1) / 67, heapUsed: process.memoryUsage().heapUsed,
      heapDelta: process.memoryUsage().heapUsed - initialHeap, ...ledger.stats() });
  }
}
assert.ok(checkpoints.at(-1).heapUsed < checkpoints[2].heapUsed + 4 * 1024 * 1024, 'second half-hour heap must plateau');
const result = { initialHeap, checkpoints, note: 'Node heap after explicit GC; includes process/JIT overhead, not a Chromium heap measurement' };
fs.mkdirSync(new URL('../_checks/event-ledger/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../_checks/event-ledger/memory.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
