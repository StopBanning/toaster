// The perfect take's store (helpers/take-store.cjs, stream B): a take's sound, log and page details kept in a folder of
// its own while M records, and read back for the re-render a stretch at a time. In a temporary folder: a whole take round
// trip, ids that aren't the store's refused (no path from the page), takes still recording kept out of reach, the oldest
// pruned first, and a disk that refuses said in words.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createTakeStore, KEEP } = createRequire(import.meta.url)('../helpers/take-store.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-takes-'));
let tick = 0;
const clock = () => new Date(2026, 10, 1, 4, 10, tick++); // (a second later each time: each take its own name)

test('a take round trip: the sound interleaved and read back per channel in stretches, the log line by line, the page details', () => {
  const root = tmp();
  try {
    const store = createTakeStore({ root, now: clock });
    const id = store.begin({ css: { width: 540, height: 960 }, dpr: 2, fps: 30, sampleRate: 48000, channels: 2, soundAt: 12.5 });
    assert.match(id, /^take-20261101-0410\d\d-[0-9a-f]{6}$/);
    const block = (from, n) => Float32Array.from({ length: n * 2 }, (_, i) => (i % 2 ? -1 : 1) * (from + Math.floor(i / 2)) / 1e5);
    store.sound(id, block(0, 48000)); store.sound(id, block(48000, 24000));
    store.log(id, [{ t: 12.5, kick: true }, { t: 12.51, code: 'x' }]); store.log(id, []); store.log(id, [{ t: 12.52 }]);
    assert.deepEqual(store.list(), [], 'a take still recording is not listed');
    assert.throws(() => store.read(id), { message: 'that take is still recording' });
    const meta = store.end(id, { duration: 1.5 });
    assert.equal(meta.samples, 72000); assert.equal(meta.duration, 1.5); assert.equal(meta.channels, 2); assert.equal(meta.dpr, 2); assert.ok(meta.began && meta.ended);
    const take = store.read(id);
    assert.deepEqual(take.log, [{ t: 12.5, kick: true }, { t: 12.51, code: 'x' }, { t: 12.52 }]);
    assert.deepEqual({ ...take.sound, read: undefined }, { sampleRate: 48000, channels: 2, samples: 72000, read: undefined });
    const [l, r] = take.sound.read(47999, 3);
    assert.deepEqual([...l].map((x) => Math.round(x * 1e5)), [47999, 48000, 48001], 'left, across the two blocks');
    assert.deepEqual([...r].map((x) => Math.round(x * 1e5)), [-47999, -48000, -48001], 'right');
    assert.equal(take.sound.read(71990, 100)[0].length, 10, 'a stretch past the end comes back short');
    assert.equal(take.sound.read(80000, 10)[0].length, 0);
    assert.equal(fs.statSync(path.join(root, id, 'sound.f32')).size, 72000 * 2 * 4);
    assert.throws(() => store.sound(id, block(0, 1)), { message: 'that take has ended, or never began' });
    assert.throws(() => store.end(id), { message: 'that take has ended, or never began' });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('only the store\'s own ids: a path, a name of another shape or a made-up id is refused', () => {
  const root = tmp();
  try {
    const store = createTakeStore({ root, now: clock });
    for (const bad of ['../../etc', '/tmp/x', 'take-20261101-041000-zzzzzz', 'take-20261101-041000-abcdef/../..', '', null, 42]) {
      assert.throws(() => store.read(bad), { message: 'that is not a take' }, String(bad));
      assert.throws(() => store.remove(bad), { message: 'that is not a take' }, String(bad));
    }
    assert.throws(() => store.sound('take-20261101-041000-abcdef', new Float32Array(2)), { message: 'that take has ended, or never began' });
    const id = store.begin({ channels: 2, sampleRate: 48000 });
    assert.throws(() => store.sound(id, new Float32Array(3)), { message: "the take's sound must come as 2 channels of 32-bit floats" });
    assert.throws(() => store.sound(id, new Uint8Array(8)), { message: "the take's sound must come as 2 channels of 32-bit floats" });
    assert.throws(() => store.log(id, 'not a list'), { message: "the take's log must come as a list" });
    assert.throws(() => store.remove(id), { message: 'that take is still recording' });
    store.end(id);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test(`the oldest go first: ${KEEP} wait at most, and one still recording is never pruned`, () => {
  const root = tmp();
  try {
    const store = createTakeStore({ root, now: clock });
    const ids = Array.from({ length: 5 }, () => { const id = store.begin({ sampleRate: 48000 }); store.end(id); return id; });
    const recording = store.begin({ sampleRate: 48000 });
    assert.deepEqual(store.list().map((t) => t.id), ids, 'oldest first');
    assert.deepEqual(store.prune(), ids.slice(0, 2));
    assert.deepEqual(store.list().map((t) => t.id), ids.slice(2));
    assert.ok(fs.existsSync(path.join(root, recording)), 'the one recording is still there');
    store.remove(ids[2]);
    assert.deepEqual(fs.readdirSync(root).sort(), [ids[3], ids[4], recording].sort());
    store.end(recording);
    assert.deepEqual(createTakeStore({ root }).list().map((t) => t.id), [ids[3], ids[4], recording], 'a new store finds the takes left');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a disk that refuses is said in words', () => {
  const root = tmp();
  try {
    const full = { ...fs, writeSync: () => { const e = new Error('no space'); e.code = 'ENOSPC'; throw e; } };
    const store = createTakeStore({ root, fs: full, now: clock });
    const id = store.begin({ channels: 1, sampleRate: 48000 });
    assert.throws(() => store.sound(id, new Float32Array(4)), { message: "the take's sound could not be kept (ENOSPC)" });
    assert.throws(() => store.log(id, [{ t: 1 }]), { message: "the take's log could not be kept (ENOSPC)" });
    store.end(id);
    // a disk that takes part of it (a write that comes back short): the same, not a take with a hole in its sound (A3)
    const short = createTakeStore({ root, fs: { ...fs, writeSync: (fd, buf) => Math.max(0, buf.length - 4) }, now: clock });
    const sid = short.begin({ channels: 1, sampleRate: 48000 });
    assert.throws(() => short.sound(sid, new Float32Array(4)), { message: "the take's sound could not be kept (12 of 16 bytes written)" });
    short.end(sid);
    const nowhere = createTakeStore({ root: path.join(root, 'file'), now: clock });
    fs.writeFileSync(path.join(root, 'file'), 'not a folder');
    assert.throws(() => nowhere.begin({}), { message: /^the take could not be kept \((ENOTDIR|EEXIST)\)$/ });
    assert.deepEqual(nowhere.list(), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('what the page says a take was like is checked first: the known details only, sane, and refused in words', () => {
  const { checkMeta, checkEnd } = createRequire(import.meta.url)('../helpers/take-store.cjs');
  const good = { css: { width: 540, height: 960 }, dpr: 2, fps: 30, sampleRate: 48000, channels: 2, soundAt: 100, t0: 130, runup: 30, seed: 424242, source: 'system', label: 'x'.repeat(300), storage: { 'now-coding': '{}' }, extra: 'dropped' };
  const m = checkMeta(good);
  assert.deepEqual(Object.keys(m), ['css', 'dpr', 'fps', 'sampleRate', 'channels', 'soundAt', 't0', 'runup', 'seed', 'source', 'label', 'storage', 'vertical', 'mini', 'song', 'art', 'autoScene', 'autoSceneAt']);
  assert.deepEqual([m.vertical, m.mini, checkMeta({ ...good, vertical: true }).vertical, checkMeta({ ...good, vertical: 'yes' }).vertical], [false, false, true, false], 'the layout: true only when said so');
  // the song, the cover and the scene (a copy is named and coloured as the live page was, on its scene): kept when plain, else left out
  const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(64);
  const named = checkMeta({ ...good, song: { title: 'Kerosene', artist: 'Crystal Castles', extra: 1 }, art: jpeg, autoScene: 7, autoSceneAt: 88.5 });
  assert.deepEqual([named.song, named.art, named.autoScene, named.autoSceneAt], [{ title: 'Kerosene', artist: 'Crystal Castles' }, jpeg, 7, 88.5]);
  assert.deepEqual([m.song, m.art, m.autoScene, m.autoSceneAt], [null, '', null, null], 'none said: none');
  const odd = checkMeta({ ...good, song: { title: '' }, art: 'https://example.com/cover.jpg', autoScene: 2.5 });
  assert.deepEqual([odd.song, odd.art, odd.autoScene], [null, '', null], 'no title, a cover that is not a picture in the take, a scene not a whole number: left out');
  assert.equal(checkMeta({ ...good, art: 'data:image/jpeg;base64,' + 'A'.repeat(400000) }).art, '', 'a cover too big for a take: left out');
  assert.equal(m.label.length, 200);
  const bad = (change, words) => assert.throws(() => checkMeta({ ...good, ...change }), { message: words });
  bad({ css: { width: 540.5, height: 960 } }, "a take's page size must be whole pixels, 100 to 8000");
  bad({ css: { width: 90000, height: 960 } }, "a take's page size must be whole pixels, 100 to 8000");
  bad({ dpr: 9 }, "a take's pixel ratio must be 0.25 to 4");
  bad({ fps: 29.97 }, "a take's frame rate must be 24, 25, 30, 50 or 60");
  bad({ sampleRate: 12345 }, "a take's sound must be 2 channels at a usual sample rate");
  bad({ channels: 1 }, "a take's sound must be 2 channels at a usual sample rate");
  bad({ runup: 29 }, "a take's times don't add up");
  bad({ runup: 90, soundAt: 40 }, "a take's times don't add up");
  bad({ seed: -1 }, "a take's seed must be a 32-bit whole number");
  bad({ storage: { a: 'x'.repeat(2e6 + 1) } }, "a take's storage is too big");
  assert.throws(() => checkMeta(null), { message: 'a take needs its details' });
  const e = checkEnd({ duration: 12, keep: true, changes: [{ t: 131, set: { visual: 'tunnel', blocks: false } }, { t: 999, set: { visual: 'x' } }, { t: 132, set: { visual: { evil: 1 } } }, 'junk'] }, m);
  assert.deepEqual(e, { duration: 12, changes: [{ t: 131, set: { visual: 'tunnel', blocks: false } }], keep: true });
  // taps of tap tempo: from the run-up on (the copy hears it again), in time order with the changes; none before the sound
  const tapped = checkEnd({ duration: 12, changes: [{ t: 133, set: { blocks: true } }, { t: 101.5, tap: true }, { t: 99, tap: true }, { t: 132.25, tap: true }, { t: 102, tap: 'yes' }, { t: 132.5, drop: true }, { t: 98, drop: true }] }, m);
  assert.deepEqual(tapped.changes, [{ t: 101.5, tap: true }, { t: 132.25, tap: true }, { t: 132.5, drop: true }, { t: 133, set: { blocks: true } }], 'and D\'s drops, the same way (B5)');
  assert.equal(checkEnd({ duration: 5 }, m).keep, false, 'kept only when said so');
  assert.throws(() => checkEnd({ duration: 0 }, m), { message: 'a perfect copy is made of recordings up to ten minutes long' });
  assert.throws(() => checkEnd({ duration: 601 }, m), { message: 'a perfect copy is made of recordings up to ten minutes long' });
});
