import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { scratch, inputPath, readBaseline } from './paths.mjs';

test('scratch honors env and platform defaults', () => {
  const env = process.env.TOASTER_SCRATCH;
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    process.env.TOASTER_SCRATCH = '/tmp/toaster-scratch-test';
    assert.equal(scratch('gt'), path.resolve('/tmp/toaster-scratch-test/gt'));
    delete process.env.TOASTER_SCRATCH;
    for (const p of ['darwin', 'linux', 'win32']) {
      Object.defineProperty(process, 'platform', { value: p });
      assert.equal(scratch('gt'), path.resolve(p === 'win32' ? 'D:' + '/work/scratch' : path.join(os.homedir(), 'work/scratch'), 'gt'));
    }
  } finally {
    Object.defineProperty(process, 'platform', platform);
    if (env === undefined) delete process.env.TOASTER_SCRATCH; else process.env.TOASTER_SCRATCH = env;
  }
});

test('baseline reader accepts relative, absolute and legacy scratch inputs without changing numbers', () => {
  const baseline = readBaseline(JSON.stringify({ inputs: [{ source: 'toaster-audio/a.webm', truthPath: '/tmp/truth.json', seconds: 45 }], audio: 'D:' + '\\work\\scratch\\toaster-audio\\b.webm', score: .123 }));
  assert.equal(baseline.inputs[0].source, scratch('toaster-audio/a.webm'));
  assert.equal(baseline.inputs[0].truthPath, '/tmp/truth.json');
  assert.equal(baseline.audio, scratch('toaster-audio/b.webm'));
  assert.equal(inputPath('C:\\other\\song.wav'), 'C:\\other\\song.wav');
  assert.equal(baseline.inputs[0].seconds, 45);
  assert.equal(baseline.score, .123);
});
