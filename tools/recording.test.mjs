import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
const code = text.slice(text.indexOf('const REC_TYPES ='), text.indexOf('// Drop clips (J; clips.js)'));
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };
function fixture(write = async () => true, stoppedFile = null) {
  let clock = 0, id = 0, token = 0, trackStops = 0, failure;
  const timers = new Map(), calls = [], notices = [], recorders = [], stops = [];
  const later = (fn, ms, interval = 0) => { const key = ++id; timers.set(key, { fn, at: clock + ms, interval }); return key; };
  const element = { textContent: '', hidden: true, classList: { add() {}, remove() {} } };
  const track = { stop() { trackStops++; } }, video = { getTracks: () => [track], getVideoTracks: () => [track] };
  const node = () => ({ connect() {}, disconnect() {}, delayTime: { value: 0 } });
  class MR {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() { if (this.state === 'inactive') throw new Error('already inactive'); this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  }
  const context = { Date: class extends Date { static now() { return clock; } },
    window: { nc: { recSource: () => 1, recStart: async () => ({ token: ++token }),
      recChunk: async (session, b) => { calls.push({ token: session, byte: new Uint8Array(b)[0] }); return write(session, b); },
      recStop: async (session, failed) => { stops.push({ token: session, failed }); return stoppedFile; }, onRecFailed: (fn) => { failure = fn; } } },
    navigator: { mediaDevices: { getUserMedia: async () => video } }, MediaRecorder: MR, MediaStream: class {},
    ac: { createMediaStreamDestination: () => ({ ...node(), stream: { getTracks: () => [], getAudioTracks: () => [] } }), createDelay: node },
    state: { node: null, syncTrim: 0 }, heardAfter: () => 12, requestAnimationFrame: (fn) => queueMicrotask(fn),
    setTimeout: (fn, ms) => later(fn, ms), clearTimeout: (n) => timers.delete(n), setInterval: (fn, ms) => later(fn, ms, ms), clearInterval: (n) => timers.delete(n),
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, document: { body: element }, $: () => element,
    hideNotice() {}, showNotice: (s) => notices.push(s), console: { error() {} } };
  vm.runInNewContext(code + ';globalThis.api={toggleRecording,rec,recordingFailed};', context);
  return { ...context.api, recorders, calls, notices, stops, failure: (...a) => failure(...a), get trackStops() { return trackStops; },
    chunk(byte, size = 1, conversion) { recorders.at(-1).ondataavailable({ data: { size, arrayBuffer: conversion || (async () => new Uint8Array([byte]).buffer) } }); },
    async advance(ms) {
      const until = clock + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [key, t] = next; clock = t.at;
        if (t.interval) t.at += t.interval; else timers.delete(key);
        t.fn(); await flush();
      }
      clock = until; await flush();
    } };
}
test('a failed write discards every queued old piece before restart', async () => {
  const f = fixture(async () => false); await f.toggleRecording();
  f.chunk(11); f.chunk(22); await flush(); assert.equal(f.rec.mr, null);
  await f.toggleRecording(); await flush();
  assert.deepEqual(f.calls, [{ token: 1, byte: 11 }]);
  assert.ok(f.rec.mr); assert.equal(f.trackStops, 1);
});
test('a conversion released after failure cannot write to the replacement', async () => {
  let release; const f = fixture(); await f.toggleRecording();
  f.chunk(22, 1, () => new Promise((r) => { release = r; })); await flush();
  f.recordingFailed(f.rec.session, 'injected'); await f.toggleRecording();
  release(new Uint8Array([22]).buffer); await flush();
  assert.equal(f.calls.length, 0); assert.ok(f.rec.mr);
  f.failure(1, 'old disk error'); assert.ok(f.rec.mr);
});
test('a stalled sink cannot queue more than 32 MiB', async () => {
  const f = fixture(() => new Promise(() => {})); await f.toggleRecording(); const old = f.rec.session;
  for (let i = 0; i < 120 && f.rec.mr; i++) f.chunk(i, 1048576);
  await flush(); assert.equal(f.rec.mr, null); assert.equal(old.pending, 0); assert.equal(old.queue.length, 0);
  assert.match(f.notices[0], /32 MiB/); assert.equal(f.trackStops, 1);
});
test('no completed write for ten seconds stops and preserves the partial file', async () => {
  const f = fixture(() => new Promise(() => {})); await f.toggleRecording(); f.chunk(1); await flush();
  await f.advance(10000);
  assert.equal(f.rec.mr, null); assert.match(f.notices[0], /10 seconds/); assert.equal(f.stops[0].failed, true);
});
test('stop completes within fifteen seconds even when a write never resolves', async () => {
  const f = fixture(() => new Promise(() => {})); await f.toggleRecording(); f.chunk(1); await flush();
  let done = false; const stopped = f.toggleRecording().then(() => { done = true; });
  await f.advance(15000); await stopped;
  assert.equal(done, true); assert.equal(f.rec.busy, false); assert.equal(f.trackStops, 1);
});
test('recovering writes drain in order and normal stop saves once', async () => {
  let release; const f = fixture(() => new Promise((r) => { release = r; })); await f.toggleRecording(); f.chunk(11); f.chunk(22); await flush();
  await f.advance(5000); release(true); await flush(); release(true); await flush();
  await f.toggleRecording();
  assert.deepEqual(f.calls.map((x) => x.byte), [11, 22]); assert.equal(f.stops.length, 1); assert.equal(f.trackStops, 1); assert.deepEqual(f.notices, []);
});
test('main rejects old tokens for both write and stop, and preload carries them', async () => {
  const src = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const handlers = {}, writes = [];
  const out = { on() {}, write(buf, done) { writes.push([...buf]); done(); } };
  const ctx = { ipcMain: { handle: (key, fn) => { handlers[key] = fn; } }, fs: { mkdirSync() {}, createWriteStream: () => out },
    path: { join: (...s) => s.join('/') }, app: { getPath: () => 'test' }, freeBase: (s) => s, stamp: () => 'test', Buffer,
    win: { setProgressBar() {}, setTitle() {} } };
  const part = src.slice(src.indexOf("  ipcMain.handle('rec:start'"), src.indexOf("  ipcMain.handle('win:close'"));
  vm.runInNewContext('let recording=null,recordingId=0; function endRecording(){recording=null;}\n' + part, ctx);
  const first = handlers['rec:start']({}, 'mp4'), second = handlers['rec:start']({}, 'mp4');
  assert.equal(await handlers['rec:chunk']({}, first.token, [22]), false);
  assert.equal(handlers['rec:stop']({}, first.token), null);
  assert.equal(await handlers['rec:chunk']({}, second.token, [33]), true);
  assert.deepEqual(writes, [[33]]);
  const preload = fs.readFileSync(new URL('../preload.js', import.meta.url), 'utf8');
  assert.match(preload, /invoke\('rec:chunk', token, buf\)/); assert.match(preload, /invoke\('rec:stop', token, failed\)/);
});
test('a partial file returned at close is described as unfinished', async () => {
  const f = fixture(async () => true, 'video.mp4.part'); await f.toggleRecording(); await f.toggleRecording();
  assert.match(f.notices[0], /before the file could be finished/);
});
test('main destroys a stalled file after five seconds and never renames on a late end callback', async () => {
  const src = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const part = src.slice(src.indexOf('function endRecording()'), src.indexOf('app.whenReady().then'));
  let timeout, end, destroyed = 0, renamed = 0;
  const out = { once() {}, end(fn) { end = fn; }, destroy() { destroyed++; } };
  const ctx = { fixture: { token: 1, stem: 'video', ext: '.mp4', file: 'video.mp4', out, failed: false },
    fs: { existsSync: () => false, rename() { renamed++; } }, win: { setProgressBar() {}, setTitle() {} },
    setTimeout: (fn, ms) => { assert.equal(ms, 5000); timeout = fn; return 1; }, clearTimeout() {} };
  vm.runInNewContext('let recording=fixture,endingRec=Promise.resolve(null);' + part + ';globalThis.finish=endRecording;', ctx);
  const stopped = ctx.finish(); timeout(); assert.equal(await stopped, 'video.mp4.part'); end();
  assert.equal(destroyed, 1); assert.equal(renamed, 0);
});
