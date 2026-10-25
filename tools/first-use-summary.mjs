// Retain just the chosen evidence before removing disposable profiles and app copies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const check = path.resolve('_checks'), out = path.resolve('tools/firstuse-evidence');
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(check), read = (f) => JSON.parse(fs.readFileSync(path.join(check, f))), copy = (f) => fs.copyFileSync(path.join(check, f), path.join(out, f));
const select = (pattern) => { const found = files.filter(f => pattern.test(f)); assert.equal(found.length, 1, String(pattern)); return found[0]; };
const rows = [];
for (const look of ['dots', 'voxels', 'warp', 'spectrum', 'rain', 'scope', 'asciicam']) {
  const names = ['before', 'after'].map(v => select(new RegExp(`^${v}-${look}-8-.*\\.json$`)));
  const data = names.map(read);
  for (const j of data) {
    assert.equal(j.errors.length, 0); assert.ok(!j.error); assert.match(j.drive, /9353/); assert.equal(j.focused, false);
    assert.ok(!/unknown|WARP|SwiftShader|Software|Basic Render/i.test(j.gpu));
  }
  for (const s of data[1].steps) assert.ok(s.untilReadyGapMs < 50, `${look}: ${s.untilReadyGapMs} ms`);
  const pendingName = select(new RegExp(`^after-${look}-pending8-.*\\.json$`)), pending = read(pendingName);
  assert.ok(!pending.error); assert.match(pending.drive, /9353/); assert.equal(pending.readyHidden, false);
  assert.ok(pending.steps[0].firstDrawMs >= 600); assert.ok(pending.steps[0].untilReadyGapMs < 50);
  rows.push({ look, beforeCold: data[0].steps[0].first2sGapMs, afterCold: data[1].steps[0].first2sGapMs,
    beforeWarm: data[0].steps[1].first2sGapMs, afterWarm: data[1].steps[1].first2sGapMs,
    beforeFirstDraw: data[0].steps[0].firstDrawMs, afterFirstDraw: data[1].steps[0].firstDrawMs,
    maxAfterTargetStatusQuery: Math.max(0, ...data[1].steps.flatMap(s => s.queries.filter(q => q.canvas === s.canvas).map(q => q.ms))),
    pendingGap: pending.steps[0].first2sGapMs, files: [...names, pendingName] });
  for (const f of [...names, pendingName]) copy(f);
}
const comparison = read('pixel-comparison-final.json'); assert.equal(comparison.length, 18);
for (const row of comparison) { assert.equal(row.maxChannelDifference, 0); assert.equal(row.changedPixels, 0); copy(row.before); copy(row.after); }
for (const v of ['before', 'after']) copy(select(new RegExp(`^${v}-pixels-7-.*\\.json$`)));
copy('pixel-comparison-final.json'); copy('fake-camera.png');
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(rows.map(r => `${r.look}: ${r.beforeCold.toFixed(1)} -> ${r.afterCold.toFixed(1)} cold; ${r.beforeWarm.toFixed(1)} -> ${r.afterWarm.toFixed(1)} warm; pending ${r.pendingGap.toFixed(1)}`).join('\n'));
