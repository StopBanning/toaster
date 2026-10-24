import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../renderer/clips.js', import.meta.url), 'utf8').replace('export function createClips', 'function createClips');
const flush = () => new Promise((r) => setImmediate(r));
function fixture(save = async () => 'clip.mp4') {
  let clock = 0, roll, stopped = 0, disconnected = 0, next = 0;
  const recorders = [], notices = [], timers = new Map();
  class MR { static isTypeSupported() { return true; } constructor() { this.state = 'inactive'; recorders.push(this); }
    start() { this.state = 'recording'; } stop() { if (this.state === 'inactive') throw new Error('inactive'); this.state = 'inactive'; this.onstop?.(); } }
  const track = { stop() { stopped++; } }, video = { getTracks: () => [track], getVideoTracks: () => [track] };
  const ctx = { MediaRecorder: MR, MediaStream: class {}, performance: { now: () => clock }, setInterval: (fn) => { roll = fn; return 1; }, clearInterval() {},
    setTimeout: (fn) => { timers.set(++next, fn); return next; }, clearTimeout: (id) => timers.delete(id), Blob };
  vm.runInNewContext(source + ';globalThis.make=createClips;', ctx);
  const clips = ctx.make({ types: ['video/mp4'], stream: async () => video,
    ac: { createMediaStreamDestination: () => ({ stream: { getTracks: () => [], getAudioTracks: () => [] } }), createDelay: () => ({ connect() {}, disconnect() { disconnected++; } }) },
    node: () => null, delay: () => 0, save, said: (m) => notices.push(m) });
  return { clips, recorders, notices, timers, roll: () => { clock += 20000; roll(); }, get stopped() { return stopped; }, get disconnected() { return disconnected; } };
}
test('an inactive encoder error cleans all sources once and reports failure', async () => {
  const f = fixture(); await f.clips.toggle(); f.recorders[0].state = 'inactive';
  f.recorders[0].onerror({ error: new Error('injected failure') }); f.roll(); await flush();
  assert.equal(f.clips.on, false); assert.equal(f.stopped, 1); assert.equal(f.disconnected, 1); assert.match(f.notices[0], /injected failure/);
});
test('manual stop and roll tolerate an unexpectedly inactive recorder', async () => {
  for (const action of ['stop', 'roll']) { const f = fixture(); await f.clips.toggle(); f.recorders[0].state = 'inactive';
    if (action === 'stop') await f.clips.toggle(); else f.roll(); await flush();
    assert.equal(f.stopped, 1); assert.equal(f.disconnected, 1); assert.equal(f.clips.on, false); assert.match(f.notices[0], /unexpectedly/);
  }
});
test('a failed kept clip releases its source and a subsequent start works', async () => {
  const f = fixture(async () => { throw new Error('save failed'); }); await f.clips.toggle(); f.clips.drop();
  await f.clips.toggle(); const finish = [...f.timers.values()][0]; finish(); await flush();
  assert.equal(f.stopped, 1); assert.equal(f.disconnected, 1); assert.match(f.notices[0], /save failed/);
  await f.clips.toggle(); assert.equal(f.clips.on, true); await f.clips.toggle(); await flush(); assert.equal(f.stopped, 2);
});
test('an error in a kept clip cannot strand its other stretch', async () => {
  const f = fixture(); await f.clips.toggle(); f.clips.drop(); f.roll();
  f.recorders[0].state = 'inactive'; f.recorders[0].onerror({ error: new Error('encoder failed') }); await flush();
  assert.equal(f.recorders[1].state, 'inactive'); assert.equal(f.stopped, 1); assert.equal(f.disconnected, 1);
});
