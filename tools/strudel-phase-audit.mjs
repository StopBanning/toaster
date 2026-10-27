// Recheck the original audit's stored slots/current-bar comparisons without changing its
// captures. Usage: STRUDEL_TEST_MODULES=<test node_modules> node tools/strudel-phase-audit.mjs <audit worktree>
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writer, strudelRuntime, events } from './strudel-test-runtime.mjs';
const audit = process.argv[2];
if (!audit) throw Error('Pass the original Strudel audit worktree as the first argument');
const { selectSnapshots, expectedO, eventsByPart, compare } = await import(pathToFileURL(path.resolve(audit, 'tools/strudel-compare.mjs')));
const { songs } = await import(pathToFileURL(path.resolve(audit, 'tools/strudel-songs.mjs')));
const output = new URL('../_checks/ophase/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
const runtime = await strudelRuntime();
const rows = [];
let webCase;
function comparisons(snapshot, pattern, phase) {
  const actual = eventsByPart(events(pattern, 0, 4));
  const expected = expectedO(snapshot, phase);
  return Object.fromEntries(['bass', 'chords'].map((part) => [part, compare(expected[part], actual[part], part, part === 'chords')]));
}
const differs = (parts) => Object.values(parts).some((part) => part.missing + part.extra > 0);
for (const [key] of songs) {
  const data = JSON.parse(fs.readFileSync(path.resolve(audit, '_checks/strudel', key + '.json')));
  for (const snapshot of selectSnapshots(data)) {
    const phase = ((snapshot.bar % 4) + 4) % 4;
    const song = { title: key, artist: 'audit' };
    const originalCode = writer.strudelProgram(snapshot.texts, song);
    assert.equal(originalCode, snapshot.code, key + ': original program bytes');
    assert.equal(writer.strudelProgram(snapshot.texts, song, 0), snapshot.code, key + ': zero-phase bytes');
    const code = writer.strudelProgram(snapshot.texts, song, phase);
    const original = await runtime.evaluate(originalCode), shifted = await runtime.evaluate(code);
    assert.deepEqual(events(shifted, 0, 4), events(original, phase, 4), key + ': all exported events in phase');
    const stored = comparisons(snapshot, original, 0), before = comparisons(snapshot, original, phase), after = comparisons(snapshot, shifted, phase);
    rows.push({ key, position: snapshot.position, bar: snapshot.bar, phase, stored, before, after });
    if (!webCase && phase && /^bassline:|^chords:/m.test(code)) webCase = { key, phase, bar: snapshot.bar, code, link: writer.strudelLink(code) };
  }
}
const result = {
  snapshots: rows.length, storedSlotMismatches: rows.filter((row) => differs(row.stored)).length,
  beforeCurrentBarMismatches: rows.filter((row) => differs(row.before)).length,
  afterCurrentBarMismatches: rows.filter((row) => differs(row.after)).length, rows,
};
fs.writeFileSync(new URL('comparison.json', output), JSON.stringify(result, null, 2));
fs.writeFileSync(new URL('web-case.json', output), JSON.stringify(webCase, null, 2));
console.log(JSON.stringify({ ...result, rows: undefined }, null, 2));
assert.equal(result.snapshots, 66);
assert.equal(result.storedSlotMismatches, 0);
assert.equal(result.beforeCurrentBarMismatches, 42);
assert.equal(result.afterCurrentBarMismatches, 0);
