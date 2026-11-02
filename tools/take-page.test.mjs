// The perfect take on the page (renderer/app.js, stream B): what M's start and stop, and the setting, do to the take the page keeps. The
// code is the page's own, sliced out of app.js (from TAKE_RUNUP to the recording's stop) and run on stand-ins for the clock, the sound
// tap and main, as tools/recording.test.mjs runs the recorder's part: a take that can't begin and says why (B10), the copy turned off
// and on while M records and the tap's start met twice (B9).
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const code = text.slice(text.indexOf('const TAKE_RUNUP = 30;'), text.indexOf('async function stopRecording()'));
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };

// The page's take code on stand-ins. begin(meta) is what main answers to take:begin; the tap's start can be held (hold.tap) to be
// let go by the test; fromAudio is the clock's mapping of the audio clock (NaN: not on it yet).
function fixture({ begin = async () => 'take-20261101-190000-abcdef', fromAudio = (a) => a + 50, perfectCopy = true, tap = null } = {}) {
  const statuses = [], notices = [], taps = [], calls = { begin: [], sound: [], end: [] }, hold = { tap: null };
  const graph = () => ({ connected: new Set(), connect(n) { this.connected.add(n); }, disconnect(n) { this.connected.delete(n); } });
  const state = { perfectCopy, node: graph(), source: 'file', label: 'song.mp3', vertical: false, mini: false };
  const context = {
    TAKE: null, state, rec: { mr: null }, ac: { sampleRate: 48000 }, clock: { now: () => 100, fromAudio: (a) => fromAudio(a), seed: 7 }, eng: { taps: [] },
    window: { nc: {
      takeBegin: async (meta) => { calls.begin.push(meta); return begin(meta); },
      takeSound: (id, data) => { calls.sound.push([id, data]); },
      takeEnd: async (id, end) => { calls.end.push([id, end]); return end.keep; },
    } },
    createTakeTap: async (ctx, { send }) => {
      if (tap) return tap();
      if (hold.tap) await hold.tap;
      const made = { node: { name: 'tap' }, send, flushed: 0, stopped: false, flush() { this.flushed++; }, stop() { this.stopped = true; } };
      taps.push(made);
      return made;
    },
    currentSong: () => ({ title: 'Plague', artist: 'Crystal Castles' }), songArt: () => null, localStorage: { length: 0 }, document: {},
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, autoScene: 0, autoSceneAt: -99, currentSetup: () => ({}),
    flashStatus: (s) => statuses.push(s), showNotice: (s) => notices.push(s), saveSettings() {}, console: { error() {} },
  };
  vm.runInNewContext(code + ';globalThis.api = { takeBegin, takeEnd, takeFollow, takeStop, takeBlock, setPerfectCopy, takeRec };', context);
  const api = context.api;
  // a block of the tap's sound, one second of it starting at audio time `at`
  const block = (at) => ({ frame: at * 48000, at, data: new Float32Array(2 * 48000) });
  return { ...api, state, rec: context.rec, statuses, notices, taps, calls, hold, block, flush,
    // the perfect copy on with a source, the tap up and a second of sound heard: what M finds when it is pressed a few seconds on
    async ready() { await api.takeFollow(); taps[0].send(block(40)); return this; } };
}
const said = /^no perfect copy of this recording: /;

test('a take that cannot begin says why in the status: the copy was only just turned on, so no sound has been heard yet (B10)', async () => {
  const f = fixture();
  await f.takeFollow(); // (the tap is up, no block has come yet)
  assert.equal(await f.takeBegin(), undefined);
  assert.equal(f.calls.begin.length, 0, 'no take was asked for');
  assert.match(f.statuses.at(-1), said);
  assert.match(f.statuses.at(-1), /no sound yet|not heard/);
  const first = f.statuses.length;
  f.takeEnd(true); // (M stops: the status is out of the picture while it records, so it is said again now)
  assert.equal(f.statuses.length, first + 1);
  assert.match(f.statuses.at(-1), said);
  f.takeEnd(true);
  assert.equal(f.statuses.length, first + 1, 'once');
  assert.equal(f.calls.end.length, 0, 'there was no take to end');
});

test('the clock not on the audio clock yet, and no tap at all, say so too (B10)', async () => {
  const off = fixture({ fromAudio: () => NaN });
  await off.ready();
  await off.takeBegin();
  assert.equal(off.calls.begin.length, 0);
  assert.match(off.statuses.at(-1), /clock/);
  const none = fixture();
  none.state.node = null; // (nothing playing: the tap was never made)
  await none.takeBegin();
  assert.equal(none.calls.begin.length, 0);
  assert.match(none.statuses.at(-1), /no sound playing/);
  const broken = fixture({ tap: async () => { throw new Error('no worklet here'); } });
  await broken.takeFollow(); // (a source, and the tap would not start)
  await broken.takeBegin();
  assert.equal(broken.calls.begin.length, 0);
  assert.match(broken.statuses.at(-1), /tap didn't start/);
  const slow = fixture();
  slow.hold.tap = new Promise(() => {}); // (the tap still starting)
  slow.takeFollow();
  await slow.flush();
  await slow.takeBegin();
  assert.match(slow.statuses.at(-1), /only just starting/);
});

test('main refusing the take (a sample rate or pixel ratio it has no list for, a full disk) says its words in the status, and the recording is left as it is (B10)', async () => {
  const f = fixture({ begin: async () => { throw new Error("Error invoking remote method 'take:begin': Error: a take's sound must be 2 channels at a usual sample rate"); } });
  await f.ready();
  await f.takeBegin();
  assert.equal(f.calls.begin.length, 1);
  assert.equal(f.takeRec.id, null, 'no take');
  assert.equal(f.statuses.at(-1), "no perfect copy of this recording: a take's sound must be 2 channels at a usual sample rate");
  assert.equal(f.takeRec.beginning, false);
  f.takeBlock(f.block(41)); // (the sound keeps gathering into the run-up, none sent anywhere)
  assert.equal(f.takeRec.blocks.length, 2);
  assert.equal(f.calls.sound.length, 0);
  f.takeEnd(true);
  assert.match(f.statuses.at(-1), /usual sample rate/, 'and again at the stop');
  assert.equal(f.calls.end.length, 0);
});

test('nothing is said with the perfect copy off, when the take began, or when the recording itself was lost; the next recording starts clean (B10)', async () => {
  const off = fixture({ perfectCopy: false });
  await off.takeBegin();
  off.takeEnd(true);
  assert.deepEqual(off.statuses, [], 'off: nothing to say');
  const f = fixture();
  await f.ready();
  await f.takeBegin();
  assert.equal(f.takeRec.id, 'take-20261101-190000-abcdef');
  assert.deepEqual(f.statuses, [], 'it began: nothing to say');
  f.takeEnd(true);
  assert.equal(f.calls.end.length, 1);
  assert.deepEqual(f.statuses, []);
  // a recording that had no take (said) and was lost: the notice for the recording says it, not this
  const g = fixture();
  await g.takeFollow();
  await g.takeBegin();
  const said1 = g.statuses.length;
  g.takeEnd(false);
  assert.equal(g.statuses.length, said1, 'a recording that failed has its own notice');
  // and the next recording, with its take, hears nothing of the last one's reason
  g.taps[0].send(g.block(40));
  await g.takeBegin();
  assert.ok(g.takeRec.id);
  g.takeEnd(true);
  assert.equal(g.statuses.length, said1);
  // (a reason that was never cleared is not told of a recording made with the copy off)
  const h = fixture();
  await h.takeFollow();
  await h.takeBegin();
  const said2 = h.statuses.length;
  h.state.perfectCopy = false;
  await h.takeBegin();
  h.takeEnd(true);
  assert.equal(h.statuses.length, said2);
});

// ---------------------------------------------------------------- the copy turned off and on while M records (B9)

test('the copy turned off while M records ends its take, dropped: a copy whose sound stops at the toggle is no copy (B9)', async () => {
  const f = fixture();
  await f.ready();
  await f.takeBegin();
  const id = f.takeRec.id;
  assert.ok(id);
  f.rec.mr = {};
  f.takeBlock(f.block(41));
  assert.equal(f.calls.sound.filter(([i]) => i === id).length, 2, 'the run-up and a second since went to the take');
  f.setPerfectCopy(false);
  assert.equal(f.takeRec.id, null, 'the take is over');
  assert.deepEqual(f.calls.end.map(([i, end]) => [i, end.keep]), [[id, false]], 'main is told to drop it, not to draw it');
  assert.equal(f.taps[0].stopped, true, 'the tap is let go');
  assert.equal(f.takeRec.tap, null);
  assert.match(f.statuses.at(-1), /^perfect copy: off \(this recording gets none\)$/);
  f.takeEnd(true); // (M stops: nothing more goes to main)
  assert.equal(f.calls.end.length, 1);
  assert.equal(f.notices.length, 0);
});

test('turned on again while M still records, it starts no take half way: the sound it hears waits for the next recording, with no gap skipped in the old one (B9)', async () => {
  const f = fixture();
  await f.ready();
  await f.takeBegin();
  f.rec.mr = {};
  f.setPerfectCopy(false);
  const sent = f.calls.sound.length;
  f.setPerfectCopy(true);
  await f.flush();
  assert.match(f.statuses.at(-1), /^perfect copy: on \(from the next recording\)$/);
  assert.equal(f.taps.length, 2, 'a new tap');
  f.taps[1].send(f.block(60)); // (sound heard after the gap)
  assert.equal(f.calls.sound.length, sent, 'none of it joined the take that was dropped');
  assert.equal(f.takeRec.blocks.length, 1, 'it is the next recording\'s run-up');
  f.takeEnd(true);
  assert.equal(f.calls.end.length, 1, 'and the old take is not ended a second time');
  f.rec.mr = null;
  f.setPerfectCopy(false);
  assert.equal(f.statuses.at(-1), 'perfect copy: off', 'with no recording going there is nothing to add');
  f.setPerfectCopy(true);
  assert.match(f.statuses.at(-1), /^perfect copy: on \(each recording is drawn again, frame by frame, beside it\)$/);
});

test('the tap is made once however often the page is told while it starts, and follows the page as it is by then: the source it has, and the setting (B9)', async () => {
  // a second source attached while the tap starts: both calls end with the tap on the later one, none throws
  const f = fixture();
  let release; f.hold.tap = new Promise((r) => { release = r; });
  const first = f.takeFollow();
  const later = { connected: new Set(), connect(n) { this.connected.add(n); }, disconnect(n) { this.connected.delete(n); } };
  f.state.node = later;
  const second = f.takeFollow();
  release();
  await Promise.all([first, second]);
  assert.equal(f.taps.length, 1, 'one tap');
  assert.equal(f.takeRec.node, later);
  assert.ok(later.connected.has(f.taps[0].node), 'on the source the page has by then');
  // the copy turned off, and on, while it starts: the page's setting then is what counts
  const g = fixture();
  let letGo; g.hold.tap = new Promise((r) => { letGo = r; });
  const one = g.takeFollow();
  g.setPerfectCopy(false);
  g.setPerfectCopy(true);
  letGo();
  await one;
  assert.ok(g.state.node.connected.has(g.taps[0].node), 'turned on again: it listens');
  // and turned off for good while it starts: it is let go the moment it is made
  const h = fixture();
  let freed; h.hold.tap = new Promise((r) => { freed = r; });
  const pending = h.takeFollow();
  h.setPerfectCopy(false);
  freed();
  await pending;
  assert.equal(h.taps[0].stopped, true, 'off: no tap left running');
  assert.equal(h.takeRec.tap, null);
  assert.equal(h.state.node.connected.size, 0);
});

test('a change of source keeps the tap and moves it to the new one, in a take or out of it', async () => {
  const f = fixture();
  await f.ready();
  const old = f.state.node, fresh = { connected: new Set(), connect(n) { this.connected.add(n); }, disconnect(n) { this.connected.delete(n); } };
  assert.ok(old.connected.has(f.taps[0].node));
  f.state.node = fresh;
  await f.takeFollow();
  assert.equal(f.taps.length, 1);
  assert.ok(fresh.connected.has(f.taps[0].node) && !old.connected.has(f.taps[0].node));
});
