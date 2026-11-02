// The perfect take in the main process (main.js: take:begin, take:sound, take:end, take:cancel and the queue that draws the copies
// one at a time): the handlers' own code, sliced out of main.js and run on stand-ins for Electron, the window and the take's render
// (as tools/recording.test.mjs runs the recorder's end of main.js). The store is the real one (helpers/take-store.cjs) in a folder
// under the temporary one, on a file system that can be made to refuse, as Windows does when a scanner holds a file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const nodeRequire = createRequire(import.meta.url);
const store = nodeRequire('../helpers/take-store.cjs');
const main = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const code = main.slice(main.indexOf('  // The perfect take (stream B;'), main.indexOf('  // The hand log (Ctrl+Shift+H'));
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
const META = { css: { width: 640, height: 360 }, dpr: 1, fps: 30, sampleRate: 48000, channels: 2, soundAt: 10, t0: 11, runup: 1, seed: 7 };

// The take's handlers on stand-ins. Each render the queue starts waits in renders[] till the test settles it; failRemove is a list
// of take folders the file system will not remove (EBUSY).
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-main-'));
  const handlers = {}, listeners = {}, sent = [], renders = [], failRemove = new Set(), strays = [], page = { gone: false };
  const flaky = { ...fs, rmSync: (p, o) => { if (failRemove.has(path.basename(p))) throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' }); return fs.rmSync(p, o); } };
  const render = {
    render: (job) => new Promise((resolve, reject) => renders.push({ job, resolve, reject })),
    cancel(why) { const r = renders.find((x) => !x.settled); if (r) { r.settled = true; r.reject(new Error(why)); } },
  };
  // (a page whose frame is gone: Electron's send throws)
  const webContents = { send: (...a) => { if (page.gone) throw new Error('Render frame was disposed before WebFrameMain could be accessed'); sent.push(a); } };
  const win = { isDestroyed: () => false, webContents };
  const modules = {
    './helpers/take-store.cjs': { ...store, createTakeStore: (o) => store.createTakeStore({ ...o, root, fs: flaky }) },
    './helpers/take-render.cjs': { createTakeRender: () => render },
  };
  const context = {
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: (name, fn) => { listeners[name] = fn; } },
    app: { getPath: () => root, on() {} }, path, fs, win, recording: null, videosDir: () => path.join(root, 'Videos'), stamp: () => 'stamp', freeBase: (b) => b,
    BrowserWindow: class {}, __dirname: '/app', require: (name) => modules[name] || nodeRequire(name), Float32Array, Math, Promise, Map, Set, Error, Number, String,
  };
  vm.runInNewContext('let takeKit = null, takeDrop = () => {};\n' + code + ';globalThis.api = { get kit() { return takeKit; }, drop: takeDrop };', context);
  const e = { sender: webContents };
  const onStray = (err) => strays.push(err);
  process.on('unhandledRejection', onStray);
  return {
    handlers, listeners, sent, renders, failRemove, strays, page, root, kit: () => context.api.kit,
    // (the seed tells the takes apart in the render's jobs)
    begin: async (seed = META.seed) => handlers['take:begin'](e, { ...META, seed }),
    sound: (id, seconds = 1) => listeners['take:sound'](e, id, new Float32Array(2 * 48000 * seconds)),
    end: async (id, keep = true) => handlers['take:end'](e, id, { duration: 1, changes: [], keep }),
    drop: (why) => context.api.drop(why),
    // a take begun, given its run-up (a second) and ended: it is queued to be drawn
    async make(seed, keep = true) { const id = await this.begin(seed); this.sound(id); const queued = await this.end(id, keep); await flush(); return { id, queued }; },
    done() { process.off('unhandledRejection', onStray); fs.rmSync(root, { recursive: true, force: true }); },
  };
}
const failures = (f) => f.sent.filter(([channel]) => channel === 'take:failed').map(([, why]) => why);
const seeds = (f) => f.renders.map((r) => r.job.take.meta.seed);
const kept = (f) => fs.readdirSync(f.root).filter((n) => n.startsWith('take-'));

test('a copy waiting in the queue that is stopped and cannot be cleared away (a scanner holds its files) does not end the queue: the next recording still gets its copy (A5, B11)', async () => {
  const f = fixture();
  try {
    const a = await f.make(1), b = await f.make(2);
    assert.deepEqual([a.queued, b.queued], [true, true]);
    assert.equal(f.renders.length, 1, 'the first is being drawn, the second waits');
    f.failRemove.add(b.id);
    await f.handlers['take:cancel']();
    await flush();
    assert.deepEqual(failures(f), ['stopped'], 'the one being drawn is stopped, said once');
    const c = await f.make(3);
    assert.deepEqual(seeds(f), [1, 3], 'a third recording is drawn all the same');
    f.renders[1].resolve({ file: path.join(f.root, 'Videos', 'stamp perfect.mp4') });
    await flush();
    assert.deepEqual(f.sent.filter(([channel]) => channel === 'take:done').map(([, file]) => path.basename(file)), ['stamp perfect.mp4'], 'and said saved');
    assert.deepEqual(f.strays, [], 'nothing left unhandled');
    assert.ok(c.id !== b.id);
  } finally { f.done(); }
});

test('a copy that fails and cannot even say so (the page is gone) does not end the queue either', async () => {
  const f = fixture();
  try {
    await f.make(1);
    assert.equal(f.renders.length, 1);
    f.page.gone = true;
    await f.handlers['take:cancel']();
    await flush();
    f.page.gone = false;
    await f.make(2);
    assert.equal(f.renders.length, 2, 'the next recording is drawn');
    assert.deepEqual(f.strays, [], 'nothing left unhandled');
  } finally { f.done(); }
});

test('Ctrl+K "perfect copy: stop making it" stops the copy being drawn and the ones waiting, not the take still recording (A6)', async () => {
  const f = fixture();
  try {
    await f.make(1); // being drawn
    await f.make(2); // waiting for it
    const b = await f.begin(3); // M is recording the next one
    f.sound(b);
    await f.handlers['take:cancel']();
    await flush();
    assert.deepEqual(failures(f), ['stopped'], 'the copy being drawn is stopped, said once');
    assert.deepEqual(seeds(f), [1], 'the one waiting is not drawn in its place');
    f.sound(b); // the recording goes on, and so does its take
    assert.equal(await f.end(b), true, 'and at its stop its copy is made');
    await flush();
    assert.deepEqual(seeds(f), [1, 3]);
    assert.equal(f.renders[1].job.sound.samples, 48000, 'with the sound that came after the stop of the other copy too (a second past its run-up)');
    f.renders[1].resolve({ file: path.join(f.root, 'Videos', 'stamp perfect.mp4') });
    await flush();
    assert.deepEqual(f.sent.filter(([channel]) => channel === 'take:done').length, 1, 'and said saved');
    assert.deepEqual(kept(f), [], 'nothing left in the store');
    assert.deepEqual(f.strays, []);
  } finally { f.done(); }
});

test('a reload, a crash, the window closing and quitting still end everything: the take recording, the copies waiting and the one being drawn', async () => {
  const f = fixture();
  try {
    await f.make(1);
    await f.make(2);
    const b = await f.begin(3);
    f.sound(b);
    f.drop('the page reloaded');
    await flush();
    assert.deepEqual(failures(f), ['the page reloaded'], 'the copy being drawn is ended, said once');
    f.sound(b);
    assert.equal(await f.end(b), false, 'the take that was recording is gone');
    await flush();
    assert.deepEqual(seeds(f), [1], 'the one waiting is not drawn');
    assert.deepEqual(kept(f), [], 'nothing left in the store');
    assert.deepEqual(f.strays, []);
  } finally { f.done(); }
});

test('a copy\'s frame may take as long as a look takes to be ready: one that begins during the take is waited for inside its frame, so the frame\'s time limit is longer than the look\'s own (B7)', async () => {
  const f = fixture();
  try {
    await f.make(1);
    const { frameMs, loadMs } = f.renders[0].job;
    assert.equal(loadMs, 120000);
    assert.ok(frameMs >= 125000, `${frameMs} ms: lookReady waits two minutes at most, and a second and a half to settle`);
  } finally { f.done(); }
});
