// A track the library's queue can't read or play is skipped, not the end of the album (the review of Nov 1, C5). Before, one track the
// player could not decode, or one that had gone from the folder, rejected playQueue: the error box came up, the page was left idle,
// and the album's auto-play was over. Now the queue goes on to the next track, as the next button does, with a notice that says
// which was left out; one that breaks part-way through is skipped too; and when every track of the album has failed in a row the queue
// stops, once, with the error.
//
// The queue's part of renderer/app.js (playQueue, skipTrack, nextTrack and what they use of the queue) is run here on stand-ins for the
// rest of the page, as tools/recording.test.mjs runs the recorder's: a folder whose files can be made unreadable, a player that cannot
// play the ones made broken (as playElement does when play() is refused: it lets go of the element and the source, and throws), and the
// page's notices and error box.
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteRecent, queueNext, queueOf, queueSkip, trackLabel } from '../renderer/library-core.js';

// (read with LF line endings: a Windows checkout's CRLF would turn the \n these slices look for into two characters)
const text = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const code = text.slice(text.indexOf('let queue = null, pendingQueue = null, queuing = 0;'), text.indexOf('// Where the queue is, kept a few times a minute'));
assert.ok(code.includes('async function playQueue(') && code.includes('const nextTrack = '), 'found the queue in app.js');

const settle = async () => { for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve)); };
const albumOf = (id, titles) => ({ id, tracks: titles.map((title, i) => ({ id: `${id}${i}`, path: `${id}/${i}.mp3`, title })) });

// titles: the album's tracks. broken: titles the player refuses; gone: titles the folder cannot give; early: titles whose element has failed
// by the time it is handed back; slowRead and slowPlay: a promise (by title) that the folder's answer, or the player's, waits for, which
// the test settles. more: the other albums (for repeat all)
function rig({ titles, broken = [], gone = [], early = [], slowRead = {}, slowPlay = {}, repeat = 'album', more = [] }) {
  const album = albumOf('a', titles), gone_ = new Set(gone), broken_ = new Set(broken);
  const state = { source: null, el: null, recentAlbums: [], queueRepeat: repeat };
  const log = { read: [], playing: [], notices: [], errors: [], retained: [], stops: 0 };
  const context = {
    state, queueNext, queueSkip, trackLabel, noteRecent,
    picking: 0, // (the page's ticket for each pick of a source: pick() below is another source picked, the radio or system audio)
    libraryPanel: { state: { albums: [album, ...more] } },
    librarySrc: {
      async file(track) {
        log.read.push(track.title);
        if (log.read.length > 50) return new Promise(() => {}); // (a queue that never gives up would starve the test of its turns: it stops here, and the test fails on what was read)
        if (slowRead[track.title]) await slowRead[track.title];
        if (gone_.has(track.title)) throw new Error("Error invoking remote method 'library:read': Error: that file is not in the folder any more"); // (as main's answer reaches the page)
        return { name: track.path, title: track.title };
      },
    },
    // as playElement does: the element becomes the player's, then play() is awaited; if it is refused, the element and the source are let go
    // and the error thrown, unless a newer source has taken over meanwhile, which is none of this one's business
    async useFile(file) {
      const el = { title: file.title, loop: true, duration: 200, currentTime: 0, error: early.includes(file.title) ? { message: 'decode' } : null };
      state.el = el; state.source = 'file';
      if (slowPlay[file.title]) await slowPlay[file.title];
      if (broken_.has(file.title)) {
        if (state.el !== el) return el;
        state.el = null; state.source = null;
        throw new Error('The element has no supported sources.');
      }
      log.playing.push(file.title);
      return el;
    },
    saveSettings() {}, freshStart() {},
    showNotice: (text) => log.notices.push(text), showError: (err) => log.errors.push(err.message), retainBugError: (err) => log.retained.push(err),
    stopPlayback() { log.stops++; state.source = null; state.el = null; },
  };
  vm.runInNewContext(code + ';globalThis.api = { playQueue, nextTrack, liveQueue };', context);
  return {
    ...context.api, album, state, log, gone: gone_, broken: broken_,
    ended() { state.el.onended(); },
    breaks(el = state.el) { el.error = { message: 'decode' }; el.onerror(); },
    pick() { context.picking++; },
  };
}

test('a source picked while a track is read wins over it: the track does not start over the radio picked after it (the review of Nov 1, C6)', async () => {
  let release;
  const r = rig({ titles: ['One', 'Two'], slowRead: { One: new Promise((resolve) => { release = resolve; }) } });
  const playing = r.playQueue(queueOf(r.album, 0));
  await settle();
  r.pick(); // (the radio, picked while One is still being read)
  release();
  await playing; await settle();
  assert.deepEqual(r.log.read, ['One']);
  assert.deepEqual(r.log.playing, [], 'One is not played over the source picked after it');
  assert.equal(r.liveQueue(), null, 'and the queue is not live');
  assert.deepEqual(r.log.errors, []);
});

test('a track that will not play is skipped on the way through the album: the next one plays, and the notice says which was left out', async () => {
  const r = rig({ titles: ['One', 'Two', 'Three', 'Four'], broken: ['Two'] });
  await r.playQueue(queueOf(r.album, 0)); await settle();
  assert.deepEqual(r.log.playing, ['One']);
  r.ended(); await settle();
  assert.deepEqual(r.log.read, ['One', 'Two', 'Three'], 'Two was tried, and the next after it read');
  assert.deepEqual(r.log.playing, ['One', 'Three']);
  assert.deepEqual(r.log.notices, ['skipped "02 Two": it could not be played']);
  assert.deepEqual(r.log.errors, [], 'no error box for it');
  assert.equal(r.log.retained.length, 1, 'but a trace of it for a bug report');
  assert.equal(r.liveQueue()?.index, 2, 'the queue is live on the track after it');
  assert.equal(r.state.el.loop, false, 'and plays through');
  r.ended(); await settle();
  assert.deepEqual(r.log.playing, ['One', 'Three', 'Four'], 'and the album goes on');
});

test('the last track broken: the album plays again from the first, as it does when the last track ends; one gone from the folder is skipped the same way', async () => {
  const r = rig({ titles: ['One', 'Two', 'Three'], broken: ['Three'] });
  await r.playQueue(queueOf(r.album, 1)); await settle();
  r.ended(); await settle();
  assert.deepEqual(r.log.playing, ['Two', 'One']);
  assert.deepEqual(r.log.notices, ['skipped "03 Three": it could not be played']);
  assert.equal(r.liveQueue()?.index, 0);
  const g = rig({ titles: ['One', 'Two', 'Three'], gone: ['One'] });
  await g.playQueue(queueOf(g.album, 0)); await settle();
  assert.deepEqual(g.log.playing, ['Two'], 'the first track, picked, is not in the folder any more: the second plays');
  assert.deepEqual(g.log.notices, ['skipped "01 One": it could not be played']);
  assert.deepEqual(g.log.errors, []);
});

test('every track broken: each is tried once, the queue stops, and the error box comes up once', async () => {
  const r = rig({ titles: ['A', 'B', 'C'], broken: ['A', 'B', 'C'] });
  await r.playQueue(queueOf(r.album, 1)); await settle();
  assert.deepEqual(r.log.read, ['B', 'C', 'A'], 'round the album once, from the track picked');
  assert.deepEqual(r.log.notices, ['skipped "02 B": it could not be played', 'skipped "03 C": it could not be played']);
  assert.equal(r.log.errors.length, 1);
  assert.match(r.log.errors[0], /^Could not play any of the 3 tracks of this album \(The element has no supported sources\)\.$/);
  assert.equal(r.liveQueue(), null, 'no queue is left');
  assert.equal(r.state.source, null);
  // an album of one is all of it
  const one = rig({ titles: ['Only'], broken: ['Only'] });
  await one.playQueue(queueOf(one.album, 0)); await settle();
  assert.deepEqual(one.log.read, ['Only']);
  assert.deepEqual(one.log.notices, []);
  assert.match(one.log.errors[0], /^Could not play that track \(/);
});

test('the track before ended and now none can be read: the queue is stopped as the stop square stops it, not left on an ended track', async () => {
  const r = rig({ titles: ['A', 'B', 'C'] });
  await r.playQueue(queueOf(r.album, 0)); await settle();
  for (const t of ['A', 'B', 'C']) r.gone.add(t); // (the folder went away: a drive taken out)
  r.ended(); await settle();
  assert.deepEqual(r.log.read, ['A', 'B', 'C', 'A']);
  assert.equal(r.log.stops, 1, 'stopped once');
  assert.equal(r.log.errors.length, 1);
  assert.equal(r.log.errors[0], 'Could not play any of the 3 tracks of this album (that file is not in the folder any more).', 'in words, without the bridge\'s own');
  assert.equal(r.liveQueue(), null);
});

test('repeat one does not hold the queue on the track that failed; repeat all goes on to the next album, and the count of failures starts again in it', async () => {
  const one = rig({ titles: ['A', 'B', 'C'], broken: ['B'], repeat: 'one' });
  await one.playQueue(queueOf(one.album, 1)); await settle();
  assert.deepEqual(one.log.read, ['B', 'C']);
  assert.deepEqual(one.log.playing, ['C']);
  const y = albumOf('y', ['y1', 'y2']);
  const all = rig({ titles: ['x1', 'x2'], broken: ['x2', 'y1'], repeat: 'all', more: [y] });
  await all.playQueue(queueOf(all.album, 0)); await settle();
  all.ended(); await settle();
  assert.deepEqual(all.log.read, ['x1', 'x2', 'y1', 'y2'], 'x2 failed, the next album began with y1, which failed, and y2 was still tried');
  assert.deepEqual(all.log.playing, ['x1', 'y2']);
  assert.deepEqual(all.log.errors, []);
});

test('a track that breaks part-way through is skipped; the one that broke is not heard from again; one already broken when it is handed back is skipped at once', async () => {
  const r = rig({ titles: ['One', 'Two', 'Three'] });
  await r.playQueue(queueOf(r.album, 0)); await settle();
  const first = r.state.el;
  r.breaks(); await settle();
  assert.deepEqual(r.log.playing, ['One', 'Two']);
  assert.deepEqual(r.log.notices, ['skipped "01 One": it could not be played']);
  first.onerror(); await settle(); // (a late word from the element that was let go)
  assert.deepEqual(r.log.playing, ['One', 'Two'], 'nothing more');
  assert.equal(r.log.notices.length, 1);
  const e = rig({ titles: ['One', 'Two'], early: ['One'] });
  await e.playQueue(queueOf(e.album, 0)); await settle();
  assert.deepEqual(e.log.playing, ['One', 'Two']);
  assert.deepEqual(e.log.notices, ['skipped "01 One": it could not be played']);
  assert.equal(e.liveQueue()?.index, 1);
});

test('a track picked while another one is on its way to failing is not overridden by the failure, whether the folder or the player is the slow one', async () => {
  let fail;
  const r = rig({ titles: ['A', 'B', 'C'], gone: ['B'], slowRead: { B: new Promise((resolve) => { fail = resolve; }) } });
  const first = r.playQueue(queueOf(r.album, 1)); // (B: the folder is still reading it)
  await settle();
  await r.playQueue(queueOf(r.album, 2)); // (C is picked meanwhile, and plays)
  await settle();
  fail(); // (and now B is found to be gone)
  await first; await settle();
  assert.deepEqual(r.log.read, ['B', 'C']);
  assert.deepEqual(r.log.playing, ['C'], 'C goes on; the failure of B did not bring up another track');
  assert.deepEqual(r.log.notices, [], 'B was not the pick that counts any more: no skip, no notice');
  assert.deepEqual(r.log.errors, []);
  assert.equal(r.liveQueue()?.index, 2);
  // and the player refusing a track that another has taken the place of
  let refuse;
  const p = rig({ titles: ['A', 'B', 'C'], broken: ['B'], slowPlay: { B: new Promise((resolve) => { refuse = resolve; }) } });
  const slow = p.playQueue(queueOf(p.album, 1));
  await settle();
  await p.playQueue(queueOf(p.album, 2));
  await settle();
  refuse();
  await slow; await settle();
  assert.deepEqual(p.log.playing, ['C']);
  assert.deepEqual(p.log.notices, []);
  assert.deepEqual(p.log.errors, []);
  assert.equal(p.liveQueue()?.index, 2);
});

test('app.js takes queueSkip and trackLabel from library-core.js, which the page has from its start', () => {
  assert.match(text, /import \{[^}]*\bqueueSkip\b[^}]*\} from '\.\/library-core\.js';/);
  assert.match(text, /import \{[^}]*\btrackLabel\b[^}]*\} from '\.\/library-core\.js';/);
});
