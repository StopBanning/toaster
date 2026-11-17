// The export's tune for real (tools/tune-real-check.html, in a hidden, muted Electron window): a known tune played on a live
// AudioContext, kept by the ear on the app's clock and heard by Basic Pitch on the graphics card, comes back at its pitches and
// its times in the engine's seconds, and the line the export writes is the tune, in its octave. Measured Nov 11 on an M-series
// Mac: all 24 notes, 5 ms early on average, 17 ms at worst; the line all 24, none an octave off (the organ tone's overtones
// are heard as notes too, and melody.js leaves them out).
// Run beside heavy jobs (two headless Chromes rendering and the rest of the suite, Nov 11) the notes came back 30 ms late on
// average, over this test's 15: alone, twice running, -4.9 ms to the decimal. So a failure here under load is the machine;
// rerun it alone before believing it. (On the export's 16ths, 125 ms at 120 BPM, 30 ms seldom moves a note.)
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
// (GitHub's Windows runner has no audio device and no GPU: there the tune can't be heard, and X exports without it, saying why)
const RUNNER = process.env.GITHUB_ACTIONS === 'true' && process.platform === 'win32' && "GitHub's Windows runner: no audio device, no GPU";

test('a tune played into the ear is heard at its notes and times, and the line written is the tune', { skip: RUNNER }, () => {
  const r = spawnSync(require('electron'), [fileURLToPath(new URL('./tune-real-check.cjs', import.meta.url))], { encoding: 'utf8', timeout: 120000 });
  const out = JSON.parse(r.stdout.trim().split('\n').at(-1) || '{}');
  assert.ok(out.ok, r.stdout + r.stderr);
  assert.equal(out.backend, 'webgl');
  assert.ok(out.found >= out.played - 2, `${out.found} of ${out.played} notes heard at their pitch`);
  assert.ok(Math.abs(out.meanOffsetMs) <= 15 && out.worstOffsetMs <= 40, `on time: ${out.meanOffsetMs} ms on average, ${out.worstOffsetMs} ms at worst`);
  assert.ok(out.inLine >= out.played - 2 && out.octaveOff <= 1, `the line: ${out.inLine} of ${out.played} notes, ${out.octaveOff} an octave off`);
});
