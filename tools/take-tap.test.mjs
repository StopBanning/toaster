// The perfect take's sound tap (renderer/take-tap.js and its worklet, stream B): every sample the app hears, unchanged,
// in blocks placed on the audio clock. Where this machine has Electron, for real (take-tap-check.cjs): known sound
// through an OfflineAudioContext comes out sample for sample (stereo, mono spread to both channels, a late start, small
// blocks starting where they should), and a live AudioContext keeps the samples coming with no gap though the tap plays
// nothing. The sources: no outputs, connected before M's delay is the caller's job, and the blocks are copies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8').replace(/\r\n/g, '\n');
const tap = read('renderer/take-tap.js'), worklet = read('renderer/take-tap-worklet.js');

test('the tap plays nothing, sends every quantum with its place on the audio clock, and hands on copies', () => {
  assert.match(tap, /numberOfInputs: 1, numberOfOutputs: 0, channelCount: channels, channelCountMode: 'explicit', channelInterpretation: 'speakers'/);
  assert.match(worklet, /this\.port\.postMessage\(\{ frame: currentFrame, data: out \}, \[out\.buffer\]\);/);
  assert.match(worklet, /registerProcessor\('take-tap', TakeTap\);/);
  assert.match(tap, /data: buf\.slice\(0, fill\)/, 'the last, short block is a copy of its own');
  assert.doesNotMatch(tap.replace(/\/\/.*$/gm, ''), /\b(window|document|fetch|localStorage|Date\.now|performance\.now)\b/);
});

let electron = null;
try { electron = createRequire(import.meta.url)('electron'); if (!fs.existsSync(electron)) electron = null; } catch { /* no Electron here */ }

test('for real: every sample through unchanged, in blocks on the audio clock; a live context keeps coming with no gap', { skip: !electron && 'no Electron here', timeout: 90000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-tap-'));
  try {
    const run = spawnSync(electron, [path.join(here, 'take-tap-check.cjs'), dir], { encoding: 'utf8', timeout: 80000 });
    const line = (run.stdout || '').split('\n').find((l) => l.startsWith('{"result"'));
    assert.ok(line, `no result from Electron: ${run.stdout}\n${run.stderr}`.slice(0, 2000));
    const { result: r } = JSON.parse(line);
    assert.equal(r.error, undefined, r.error);
    assert.deepEqual([r.stereo.wrong, r.stereo.got, r.stereo.starts, r.stereo.ats], [0, 96000, [0, 48000], [0, 1]], 'stereo, sample for sample, a block a second');
    assert.deepEqual(r.stereo.end, { firstFrame: 0, firstAt: 0, samples: 96000, gaps: 0 });
    assert.equal(r.mono.wrong, 0, 'mono goes to both channels');
    assert.deepEqual([r.blocks.wrong, r.blocks.starts, r.blocks.ats], [0, [0, 12000, 24000], [0, 0.25, 0.5]], 'quarter-second blocks, silence before a late start');
    assert.equal(r.live.gaps, 0);
    assert.ok(r.live.blocks >= 4, `${r.live.blocks} blocks of 0.1 s in ~0.6 s`);
    assert.ok(Math.abs(r.live.samples / 48000 - r.live.ran) < 0.05, `the samples (${r.live.samples}) cover the time the context ran (${r.live.ran.toFixed(3)} s)`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
