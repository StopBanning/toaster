// O opens strudel.cc in a browser that can play the rebuilt song (Nov 24, Big Brother's finding 1: Safari, the default on every Mac, refuses an https page asking
// http://localhost, so the rebuilt song was silent), and says which one it opened and why it fell back to the live code (finding 2). Everything here is mocked:
// no browser opens, no tab appears on a screen. helpers/strudel-open.cjs takes execFile, openExternal and the file check as parameters.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openedSaid, rebuildSaid, agoSaid } from '../renderer/tune.js';
import { createEngine } from '../renderer/engine.js';
import { songTitle } from '../renderer/rebuild.js';
import { realArtist } from '../renderer/codegen.js';

const { openStrudel, macBrowser, isStrudelLink } = createRequire(import.meta.url)('../helpers/strudel-open.cjs');
const LINK = 'https://strudel.cc/#c3RhY2soKQ';
const installed = (...apps) => (p) => apps.includes(path.basename(p).replace(/\.app$/, ''));

// rebuilt: whether the link is the rebuilt song's (the page says so; only that one needs a browser that can reach localhost)
function rig({ platform = 'darwin', has = [], execFails = false, rebuilt = true } = {}) {
  const calls = { exec: [], external: [] };
  const execFile = (file, args, opts, cb) => { calls.exec.push([file, args]); cb(execFails ? new Error('no such app') : null); };
  const openExternal = async (u) => { calls.external.push(u); };
  return { calls, run: (...a) => openStrudel(a.length ? a[0] : LINK, { rebuilt, platform, execFile, openExternal, exists: installed(...has), home: '/Users/nobody' }) };
}

test('the rebuilt song on a Mac with Chrome opens in Chrome, through `open -a`, and not in the default browser', async () => {
  const r = rig({ has: ['Google Chrome', 'Safari'] });
  assert.deepEqual(await r.run(), { browser: 'Chrome', plays: true });
  assert.deepEqual(r.calls.exec, [['open', ['-a', 'Google Chrome', LINK]]]);
  assert.deepEqual(r.calls.external, [], 'the default browser (Safari) is not asked');
});

test('with no Chrome, Edge is used; Chrome first when both are there', async () => {
  const edge = rig({ has: ['Microsoft Edge'] });
  assert.deepEqual(await edge.run(), { browser: 'Edge', plays: true });
  assert.deepEqual(edge.calls.exec[0][1].slice(0, 2), ['-a', 'Microsoft Edge']);
  const both = rig({ has: ['Microsoft Edge', 'Google Chrome'] });
  assert.equal((await both.run()).browser, 'Chrome');
});

test('Brave is not used: nobody has run it, and its own page says it blocks public sites from reaching localhost', async () => {
  const r = rig({ has: ['Brave Browser'] });
  assert.deepEqual(await r.run(), { browser: 'default', plays: false });
  assert.deepEqual(r.calls.exec, []);
  assert.equal(macBrowser({ exists: installed('Brave Browser'), home: '/Users/me' }), null);
});

test('a browser in the user\'s own Applications folder counts', () => {
  const asked = [];
  assert.equal(macBrowser({ exists: (p) => { asked.push(p); return p === '/Users/me/Applications/Google Chrome.app'; }, home: '/Users/me' }).name, 'Chrome');
  assert.ok(asked.includes('/Applications/Google Chrome.app'), 'the system folder is looked in first');
});

test('the live code opens the default browser even on a Mac with Chrome: it has no sounds to fetch and plays in Safari', async () => {
  const r = rig({ has: ['Google Chrome'], rebuilt: false });
  assert.deepEqual(await r.run(), { browser: 'default', plays: null });
  assert.deepEqual(r.calls, { exec: [], external: [LINK] });
  const unflagged = rig({ has: ['Google Chrome'] });   // (the flag is `=== true`: anything else is the live code)
  assert.deepEqual(await openStrudel(LINK, { rebuilt: 'yes', platform: 'darwin', execFile: () => assert.fail('not run'), openExternal: async (u) => unflagged.calls.external.push(u), exists: installed('Google Chrome') }), { browser: 'default', plays: null });
});

test('the rebuilt song on a Mac with neither: the default browser opens, and the answer says it may not play the sounds', async () => {
  const r = rig({ has: ['Safari'] });
  assert.deepEqual(await r.run(), { browser: 'default', plays: false });
  assert.deepEqual(r.calls.external, [LINK]);
  assert.deepEqual(r.calls.exec, [], 'nothing is run');
});

test('if `open -a Chrome` fails, the default browser still opens (a link that goes nowhere is worse), and the answer says it may not play', async () => {
  const r = rig({ has: ['Google Chrome'], execFails: true });
  assert.deepEqual(await r.run(), { browser: 'default', plays: false });
  assert.deepEqual(r.calls.external, [LINK]);
});

test('Windows and Linux open the default browser as before and claim nothing, the rebuilt song or not', async () => {
  for (const platform of ['win32', 'linux']) for (const rebuilt of [true, false]) {
    const r = rig({ platform, has: ['Google Chrome'], rebuilt });
    assert.deepEqual(await r.run(), { browser: 'default', plays: null });
    assert.deepEqual(r.calls, { exec: [], external: [LINK] }, platform);
  }
});

test('the guard is the one it was: strudel.cc links with the code in the #, under 60,000 characters, and nothing else, on every platform', async () => {
  for (const platform of ['darwin', 'win32']) for (const rebuilt of [true, false]) {
    for (const bad of ['https://evil.example/#x', 'http://strudel.cc/#x', 'https://strudel.cc/', 'https://strudel.cc.evil.example/#x', '-a Safari', '', null, undefined, 42, { toString: () => LINK }, 'https://strudel.cc/#' + 'a'.repeat(60000)]) {
      const r = rig({ platform, has: ['Google Chrome'], rebuilt });
      assert.equal(await r.run(bad), null, `${platform}: ${String(bad).slice(0, 40)}`);
      assert.deepEqual(r.calls, { exec: [], external: [] });
    }
  }
  assert.equal(isStrudelLink('https://strudel.cc/#' + 'a'.repeat(59979)), true, 'one under the cap goes through');
  assert.equal(isStrudelLink('https://strudel.cc/#' + 'a'.repeat(59980)), false, 'the cap is below 60,000 characters in all');
});

test('the main process hands the link to the helper and nothing else: no shell, one handler, the flag passed on, the guard inside the helper', () => {
  const main = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(main, /ipcMain\.handle\('open:strudel', \(_e, url, rebuilt\) => require\('\.\/helpers\/strudel-open\.cjs'\)\.openStrudel\(url, \{ rebuilt: rebuilt === true, openExternal: \(u\) => shell\.openExternal\(u\) \}\)\);/);
  const helper = fs.readFileSync(new URL('../helpers/strudel-open.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(helper, /shell:\s*true|\bexec\(|execSync|spawnSync/, 'execFile only: the link is one argument, never a command line');
  const preload = fs.readFileSync(new URL('../preload.js', import.meta.url), 'utf8');
  assert.match(preload, /openStrudel: \(url, rebuilt = false\) => ipcRenderer\.invoke\('open:strudel', url, rebuilt === true\)/);
  assert.match(preload, /strudelBrowser: \(\) => ipcRenderer\.invoke\('strudel:browser'\)/);
});

// ---- the words the page says
test('O says which browser it opened the rebuilt song in, in a flash of the status line', () => {
  assert.deepEqual(openedSaid({ browser: 'Chrome', plays: true }, true), { text: 'opened the song rebuilt from its own sounds in Chrome', explain: false });
  assert.equal(openedSaid({ browser: 'Edge', plays: true }, true).text, 'opened the song rebuilt from its own sounds in Edge');
  assert.equal(openedSaid(undefined, true).text, 'opened the song rebuilt from its own sounds in strudel.cc', 'where nothing is known (Windows, Linux, a plain browser tab)');
  assert.equal(openedSaid({ browser: 'default', plays: null }, true).explain, false);
});

test('the rebuilt song in the default browser: "if this opened in Safari it will stay silent ... Use Chrome or Edge", in the notice box (it may be Arc or Firefox, so it does not say it is Safari)', () => {
  const said = openedSaid({ browser: 'default', plays: false }, true);
  assert.equal(said.text, "If this opened in Safari it will stay silent: Safari can't load the sounds. Use Chrome or Edge. rebuilt.wav in its folder is how it sounds.");
  assert.equal(said.explain, true);
});

test('the live code (Shift+O): a notice of its own in the app, a flash in a plain browser tab', () => {
  assert.deepEqual(openedSaid({ browser: 'default', plays: null }, false), { text: 'Opened the live code (the stand-in sketch) in your browser.', explain: true }, 'Shift+O in the app: a notice of its own, not a flash');
  assert.deepEqual(openedSaid(undefined, false), { text: 'opened the live code in strudel.cc', explain: false });
  assert.equal(openedSaid({ browser: 'default', plays: false }, false).text, 'Opened the live code (the stand-in sketch) in your browser.', 'it has no sounds to fetch: Safari plays it, so no Safari warning');
});

test('when the link is refused or the call fails, O says so and does not say it opened', () => {
  for (const rebuilt of [true, false]) {
    const said = openedSaid(null, rebuilt);
    assert.match(said.text, /^couldn't open/);
    assert.doesNotMatch(said.text, /^opened/);
    assert.equal(said.explain, true);
  }
  assert.match(openedSaid(null, true).text, /song\.strudel\.js/, 'and for the rebuilt song, the way round it');
});

test('the notice after X says how to hear the rebuilt song, by what the Mac would open', () => {
  const rebuilt = { served: true };
  assert.equal(rebuildSaid(rebuilt, null, 'Chrome').end, ' Press O to hear it (opens in Chrome; say Allow when it asks).');
  assert.equal(rebuildSaid(rebuilt, null, 'Edge').end, ' Press O to hear it (opens in Edge; say Allow when it asks).');
  assert.equal(rebuildSaid(rebuilt, null, null).end, ' To hear it you need Chrome or Edge (Safari stays silent). rebuilt.wav in its folder is how it sounds.');
  assert.equal(rebuildSaid(rebuilt, null, undefined).end, ' Press O to hear it.', 'Windows and Linux');
  assert.match(rebuildSaid({ served: false }, null, 'Chrome').end, /can't be served/, 'the port taken: that is what it says, not "press O"');
  assert.equal(rebuildSaid(null, 'it could not be saved', 'Chrome').end, " Couldn't rebuild it from its own sounds: it could not be saved.");
});

test('an untitled song\'s notice says the same as a named one\'s: O right after X opens that rebuild (Big Brother, Nov 24, fix 2)', () => {
  for (const browser of ['Chrome', 'Edge']) assert.equal(rebuildSaid({ served: true }, null, browser).end, ` Press O to hear it (opens in ${browser}; say Allow when it asks).`);
  assert.doesNotMatch(rebuildSaid({ served: true }, null, 'Chrome').end, /rebuild it again|can't see/);
});

test('when O made the rebuild, the notice says what happens next: it opens in the browser, or rebuilt.wav is shown with neither; a failure and a port taken are still said', () => {
  assert.equal(rebuildSaid({ served: true }, null, 'Chrome', true).end, ' Opening it in Chrome now: say Allow when Chrome asks.');
  assert.equal(rebuildSaid({ served: true }, null, 'Edge', true).end, ' Opening it in Edge now: say Allow when Edge asks.');
  assert.equal(rebuildSaid({ served: true }, null, null, true).end, ' It needs Chrome or Edge to play: rebuilt.wav is shown in its folder.');
  assert.equal(rebuildSaid({ served: true }, null, undefined, true).end, ' Rebuilt: opening it now.');
  assert.match(rebuildSaid({ served: false }, null, 'Chrome', true).end, /can't be served/);
  assert.match(rebuildSaid(null, 'the voice could not be pulled out', 'Chrome', true).end, /Couldn't rebuild it from its own sounds: the voice could not be pulled out\./);
});

test('a rebuild opened again says how many bars it covers and that X makes a new one with more, in the notice box', () => {
  assert.deepEqual(openedSaid({ browser: 'Chrome', plays: true }, true, 16, 10000), { text: 'opened the rebuild in Chrome', explain: true }, 'under a minute old: the one X just made, no bar count and no "redo it"');
  assert.equal(openedSaid({ browser: 'Chrome', plays: true }, true, 16, 59999).text, 'opened the rebuild in Chrome');
  assert.deepEqual(openedSaid({ browser: 'Chrome', plays: true }, true, 16, 60000), { text: 'opened the rebuild made 1 min ago (16 bars). Press X to redo it with more.', explain: true });
  assert.equal(openedSaid({ browser: 'Chrome', plays: true }, true, 16, 60000).text, 'opened the rebuild made 1 min ago (16 bars). Press X to redo it with more.', 'and how old it is: a wrong one is at least visible');
  assert.equal(agoSaid(10000), 'just now'); assert.equal(agoSaid(100000), '2 min ago'); assert.equal(agoSaid(3 * 3600 * 1000), '3 h ago');
  assert.equal(openedSaid({ browser: 'Chrome', plays: true }, true, 0).text, 'opened the song rebuilt from its own sounds in Chrome', 'a rebuild just made: no such words');
  assert.match(openedSaid({ browser: 'default', plays: false }, true, 16).text, /^If this opened in Safari/, 'the Safari warning comes first');
});

// ---- O on the page, run on stand-ins for the rest of it
const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const slice = (from, to) => { const a = app.indexOf(from), b = app.indexOf(to, a); assert.ok(a >= 0 && b > a, `found ${from}`); return app.slice(a, b); };
// answer: what main.js answers (a function is called, to throw; null is a refused link). via: what strudelBrowser says ('Chrome'; null for a Mac with neither; undefined elsewhere).
// make: what the rebuild gives (exportSong stands in for X's job, and sets lastRebuilt as the real one does; a function for one that takes time; null for none made).
function page(answer, { make = null, via = 'Chrome', saveSong = true } = {}) {
  const flashed = [], notices = [], opened = [], flags = [], exports = [], shown = [];
  const context = { songTitle, realArtist, openedSaid, song: null, state: { label: 'system audio' }, strudelLink: (c) => 'https://strudel.cc/#' + c, lineTexts: () => ({}), strudelProgram: () => 'live()', codeHold: { holding: false }, eng: { bar: 0, resets: 0 }, exporting: false, rec: { mr: null }, clips: { on: false },
    flashStatus: (s) => flashed.push(s), showNotice: (text, file, keep) => notices.push([text, file, keep]), currentSong: () => context.song,
    exportSong: async (o) => { exports.push(o); const r = typeof make === 'function' ? await make() : make; if (r) context.setRebuilt({ ...r, resets: context.eng.resets, at: Date.now() }); return r ? { ...r, resets: context.eng.resets, at: Date.now() } : null; },
    window: { nc: { saveSong: saveSong ? () => {} : undefined, strudelBrowser: async () => via, recShow: (f) => shown.push(f), openStrudel: async (u, rebuilt) => { opened.push(u); flags.push(rebuilt); if (typeof answer === 'function') return answer(); return answer; } }, open: (u) => opened.push('tab:' + u) } };
  vm.runInNewContext(slice('function songNames(s) {', '\n}\n') + '\n}\n' + slice('let lastRebuilt = null;', '// What went wrong starting the camera') + ';globalThis.O = () => openSong(); globalThis.openSketch = () => openInStrudel(); globalThis.setRebuilt = (r) => { lastRebuilt = r; };', context);
  return { context, flashed, notices, opened, flags, exports, shown, play: (s) => { context.song = s; } };
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const queen = { title: "Don't Stop Me Now", artist: 'Queen' };
const wav = (r) => r.file.replace(/song\.strudel\.js$/, 'rebuilt.wav');
const rebuiltQueen = { name: "Queen - Don't Stop Me Now", code: 'stack()', titled: true, served: true, bars: 16, file: '/m/Queen 2026 rebuilt/song.strudel.js' };
const rebuiltUntitled = { name: 'system audio', code: 'stack(1)', titled: false, served: true, bars: 12, file: '/m/system audio 2026 rebuilt/song.strudel.js' };

test('O with nothing rebuilt makes the rebuild (the job X does), says it is rebuilding, then opens that rebuild, in the browser that can play it', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltQueen });
  p.play(queen);   // (a song with a title, never rebuilt this session)
  p.context.O(); await settle();
  assert.deepEqual(JSON.parse(JSON.stringify(p.exports)), [{ forO: true }], 'the rebuild was made, and told it was O that asked');
  assert.match(p.notices[0][0], /^Rebuilding this song from its own sounds: about half a minute .*then it opens in Chrome\. The status line shows how far it is\.$/);
  assert.equal(p.notices[0][2], true, 'and the notice stays: the rebuild takes longer than 8 s');
  assert.deepEqual(p.opened, ['https://strudel.cc/#stack()']);
  assert.deepEqual(p.flags, [true], 'the rebuilt song: Chrome or Edge');
  assert.deepEqual(p.flashed, ['opened the song rebuilt from its own sounds in Chrome']);
  assert.deepEqual(p.shown, []);
});

test('O on a song Toaster cannot name (a song in a browser; tuni\'s file and Spotify too) makes the rebuild and opens it: O made it, so it needs no title to match', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltUntitled });
  p.play(null);
  p.context.O(); await settle();
  assert.equal(p.exports.length, 1);
  assert.deepEqual(p.opened, ['https://strudel.cc/#stack(1)']);
  assert.deepEqual(p.flags, [true]);
});

test('O twice on the same untitled song rebuilds once: the second press opens that rebuild (nothing but the engine starting over tells two untitled songs apart)', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltUntitled });
  p.play(null);
  p.context.O(); await settle();
  p.context.O(); await settle();
  assert.equal(p.exports.length, 1, 'one rebuild');
  assert.equal(p.opened.length, 2);
  assert.equal(p.notices.at(-1)[0], 'opened the rebuild in Chrome', 'and the second says it opened the rebuild (a young one: no bar count, no redo hint)');
  p.context.eng.resets += 1;   // a new song, a new source, a long pause: the engine started over
  p.context.O(); await settle();
  assert.equal(p.exports.length, 2, 'the next untitled song never takes an earlier one\'s rebuild');
});

test('O on the song already rebuilt (by X, say) opens it at once with how many bars it covers, and does not rebuild', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltQueen });
  p.play(queen); p.context.setRebuilt({ ...rebuiltQueen, resets: 0 });
  p.context.O(); await settle();
  assert.deepEqual(p.exports, []);
  assert.deepEqual(p.opened, ['https://strudel.cc/#stack()']);
  assert.deepEqual(p.notices.map((n) => n[0]), ['opened the rebuild in Chrome']);
  assert.deepEqual(p.flashed, []);
});

test('O on another song than the one rebuilt makes a new rebuild', async () => {
  const other = { name: 'Nicki Minaj - Starships', code: 'stack(2)', titled: true, served: true, bars: 8, file: '/m/s/song.strudel.js' };
  const p = page({ browser: 'Chrome', plays: true }, { make: other });
  p.play({ title: 'Starships', artist: 'Nicki Minaj' }); p.context.setRebuilt({ ...rebuiltQueen, resets: 0 });
  p.context.O(); await settle();
  assert.equal(p.exports.length, 1);
  assert.deepEqual(p.opened, ['https://strudel.cc/#stack(2)']);
});

test('too little heard yet: nothing opens, not even the sketch (the real exportSong says to let it play longer, in the notice box)', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: null });   // (exportSong answers null: nothing rebuilt)
  p.play(queen);
  p.context.O(); await settle();
  assert.deepEqual(p.opened, []);
  assert.deepEqual(p.flashed, []);
  // the real exportSong, up to the point it goes on (no beat found yet; and with one)
  const head = slice('async function exportSong(', '  exporting = true;') + "  return 'went on';\n}";
  const run = async (song, forO) => {
    const said = { flash: [], notice: [] };
    const ctx = { exporting: false, window: { nc: { saveSong() {} } }, eng: { tape: { song: () => song }, tempo: { down: 0 }, resets: 0 }, flashStatus: (t) => said.flash.push(t), showNotice: (t) => said.notice.push(t) };
    ctx.result = await vm.runInNewContext(head + ';exportSong(' + JSON.stringify({ forO }) + ')', ctx);
    return { ...said, result: ctx.result };
  };
  const forO = await run(null, true);
  assert.deepEqual(forO.notice, ["Toaster hasn't heard enough of this song yet: let it play a little longer, then press O."]);
  assert.deepEqual(forO.flash, []);
  assert.equal(forO.result, null);
  const forX = await run(null, false);
  assert.deepEqual(forX.flash, ['nothing to export yet: no beat found'], 'X keeps its own words');
  assert.deepEqual(forX.notice, []);
  assert.equal((await run({ bars: [] }, true)).result, 'went on', 'with a song, it goes on to rebuild');
});

test('a rebuild that could not be made or played does not open the sketch in its place', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: null });
  p.play(queen);
  p.context.O(); await settle();
  assert.deepEqual(p.opened, []);
  assert.match(app, /return rebuilt && rebuilt\.served !== false \? lastRebuilt : null;/, 'exportSong answers the rebuilt song only when its sounds can be played');
  assert.match(app, /resets: resets0/, 'and the rebuild notes which tape it is of');
});

test('a second O press while the rebuild runs does not start another; and O while X is exporting waits for it', async () => {
  let release;
  const p = page({ browser: 'Chrome', plays: true }, { make: () => new Promise((r) => { release = () => r(rebuiltQueen); }) });
  p.play(queen);
  p.context.O(); p.context.O(); p.context.O(); await settle();
  assert.equal(p.exports.length, 1, 'one rebuild');
  release(); await settle();
  assert.deepEqual(p.opened, ['https://strudel.cc/#stack()'], 'opened once');
  const q = page({ browser: 'Chrome', plays: true }, { make: rebuiltQueen });
  q.play(queen); q.context.exporting = true;
  q.context.O(); await settle();
  assert.deepEqual(q.exports, []);
  assert.deepEqual(q.flashed, ['still exporting: press O again when it has finished']);
});

test('while recording, O does not start a rebuild (X drops frames while it splits the sound): it says so and points at Shift+O; an existing rebuild still opens', async () => {
  for (const [what, set] of [['recording', (c) => { c.rec.mr = {}; }], ['drop clips', (c) => { c.clips.on = true; }]]) {
    const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltQueen });
    p.play(queen); set(p.context);
    p.context.O(); await settle();
    assert.deepEqual(p.exports, [], what);
    assert.deepEqual(p.opened, [], what);
    assert.deepEqual(p.notices.map((n) => n[0]), [what === 'recording' ? 'Stop recording to rebuild, or press Shift+O for the live code.' : 'Turn off J (drop clips) to rebuild, or press Shift+O for the live code.'], what);
    p.context.setRebuilt({ ...rebuiltQueen, resets: 0 });
    p.context.O(); await settle();
    assert.equal(p.opened.length, 1, `${what}: a rebuild that exists opens`);
  }
});

test('an untitled song\'s rebuild is taken again only while it is recent: two songs in a browser less than 4 s apart (no engine start-over) never share one past two minutes (Big Brother, fix 3)', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltUntitled });
  p.play(null);
  p.context.O(); await settle();
  assert.equal(p.exports.length, 1);
  p.context.O(); await settle();
  assert.equal(p.exports.length, 1, 'a minute on, the same engine: the same song, opened again');
  const t0 = Date.now();
  p.context.Date = { now: () => t0 + 121000 };   // (the page's own clock, two minutes on)
  p.context.O(); await settle();
  assert.equal(p.exports.length, 2, 'older than two minutes: a new rebuild, though the engine never started over');
});

test('a rebuild opened again says how old it is (a titled song\'s too)', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: rebuiltQueen });
  p.play(queen); p.context.setRebuilt({ ...rebuiltQueen, resets: 0, at: Date.now() - 5 * 60000 });
  p.context.O(); await settle();
  assert.equal(p.notices[0][0], 'opened the rebuild made 5 min ago (16 bars). Press X to redo it with more.');
});

test('the Rebuilding notice does not stay up when nothing was made and nothing replaced it (X began in the instant between)', async () => {
  const p = page({ browser: 'Chrome', plays: true }, { make: null });
  p.play(queen);
  const hidden = []; let text = '';
  p.context.$ = () => ({ get hidden() { return hidden.length > 0; }, get textContent() { return text; } });
  p.context.hideNotice = () => hidden.push(1);
  p.context.showNotice = (t) => { text = t; p.notices.push([t]); };
  p.context.O(); await settle();
  assert.equal(hidden.length, 1, 'taken down');
  const q = page({ browser: 'Chrome', plays: true }, { make: null });
  q.play(queen); const hid = [];
  q.context.$ = () => ({ hidden: false, textContent: 'Toaster hasn\'t heard enough of this song yet' });   // (a notice of exportSong\'s own is up)
  q.context.hideNotice = () => hid.push(1);
  q.context.O(); await settle();
  assert.equal(hid.length, 0, 'but the words of another notice stay');
});

test('the website\'s help and the O button\'s tooltip keep the old words and have no Shift+O row (no app to rebuild with); the app\'s have the new ones', () => {
  const block = slice("if (!window.nc?.saveSong) {   // (the website", "$('b-rec').dataset.title");
  const mk = (saveSong) => {
    const log = { removed: 0 }, btn = { dataset: { title: 'app words' } }, cell = { textContent: 'app help words' }, xCell = { textContent: 'app export words' };
    const ctx = { window: { nc: saveSong ? { saveSong() {} } : undefined }, document: { querySelector: (q) => ({ lastElementChild: /export/.test(q) ? xCell : cell }) }, $: (id) => id === 'help-shift-o' ? { remove: () => { log.removed++; } } : btn };
    vm.runInNewContext(block, ctx);
    return { log, btn, cell, xCell };
  };
  const web = mk(false);
  assert.equal(web.btn.dataset.title, 'Open this code in Strudel, in your browser');
  assert.equal(web.cell.textContent, 'open the code in Strudel');
  assert.equal(web.xCell.textContent, 'export the song (in the app)', 'X saves in the app only');
  assert.equal(web.log.removed, 1, 'the Shift+O row is gone');
  const appRun = mk(true);
  assert.equal(appRun.btn.dataset.title, 'app words'); assert.equal(appRun.cell.textContent, 'app help words'); assert.equal(appRun.xCell.textContent, 'app export words'); assert.equal(appRun.log.removed, 0);
  assert.match(fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8'), /<tr id="help-shift-o"><td>Shift\+<span data-k="strudel">O<\/span><\/td>/);
});

test('a Mac with neither Chrome nor Edge: it says so before the work, rebuilds, and shows rebuilt.wav in its folder instead of opening a silent tab', async () => {
  const p = page({ browser: 'default', plays: false }, { make: rebuiltQueen, via: null });
  p.play(queen);
  p.context.O(); await settle();
  assert.equal(p.notices[0][0], 'Rebuilding. It needs Chrome or Edge to play, so rebuilt.wav will open in its folder.');
  assert.deepEqual(p.opened, [], 'no Safari tab');
  assert.deepEqual(p.shown, [wav(rebuiltQueen)]);
  p.context.O(); await settle();   // (and with the rebuild there already: the folder again, with the words)
  assert.deepEqual(p.exports.length, 1);
  assert.deepEqual(p.opened, []);
  assert.deepEqual(p.shown, [wav(rebuiltQueen), wav(rebuiltQueen)]);
  assert.equal(p.notices.at(-1)[0], 'It needs Chrome or Edge to play the rebuilt song: rebuilt.wav is shown in its folder.');
});

test('O without the app (the website, a browser tab: nothing to rebuild with) opens the live code, as it always did', async () => {
  const p = page(null, { saveSong: false });
  p.context.window = { open: (u) => p.opened.push('tab:' + u) };
  p.play(queen);
  p.context.O(); await settle();
  assert.equal(p.opened.length, 1);
  assert.match(p.opened[0], /^tab:https:\/\/strudel\.cc\/#live\(\)/);
  assert.deepEqual(p.exports, []);
});

test('Shift+O (and Shift-clicking the button) opens the live code in the default browser, rebuilt or not, with no reason said', async () => {
  const p = page({ browser: 'default', plays: null }, { make: rebuiltQueen });
  p.play(null); p.context.setRebuilt({ ...rebuiltQueen, resets: 0 });   // (a song was rebuilt and the song playing is another: Shift+O is the sketch, whatever)
  p.context.openSketch(); await settle();
  assert.deepEqual(p.opened, ['https://strudel.cc/#live()']);
  assert.deepEqual(p.flags, [false], 'not the rebuilt song: the default browser');
  assert.deepEqual(p.flashed, []);
  assert.deepEqual(p.notices.map((n) => n[0]), ['Opened the live code (the stand-in sketch) in your browser.'], 'its own notice (8 s), replacing what O said about the rebuild');
  assert.deepEqual(p.exports, [], 'and nothing is rebuilt for it');
  // the key and the button, as wired
  assert.match(app, /if \(e\.shiftKey && act\.id === 'strudel'\) \{ openInStrudel\(\); return; \}/);
  assert.ok(app.indexOf("act.id === 'strudel') { openInStrudel()") < app.indexOf('const ran = act.run();'), 'before the key runs its action');
  assert.match(app, /\$\('b-strudel'\)\.onclick = \(e\) => \(e\.shiftKey \? openInStrudel\(\) : openSong\(\)\);/);
  assert.match(app, /\{ id: 'strudel', key: 'o', run: \(\) => openSong\(\) \}/);
  assert.equal((app.match(/e\.shiftKey/g) || []).length, 4, 'Shift is used by the hand log, the rounds\' step back, O\'s key and O\'s button, and nothing else');
  const html = fs.readFileSync(new URL('../renderer/index.html', import.meta.url), 'utf8');
  assert.match(html, /<td>Shift\+<span data-k="strudel">O<\/span><\/td><td>open the live code in Strudel<\/td>/);
  assert.match(html, /<td>hear the song rebuilt from its own sounds \(rebuilds it first if needed\)<\/td>/);
  assert.match(html, /title="Hear the song rebuilt from its own sounds in Strudel \(rebuilds it first if needed\); with Shift, the live code \(O\)"/, 'the button\'s tooltip');
});

test('the refused link, the failed call, and the rebuilt-in-Safari warning go through the notice box', async () => {
  for (const answer of [null, () => { throw new Error('ipc closed'); }]) {
    const p = page(answer, { make: rebuiltQueen });
    p.play(queen);
    p.context.O(); await settle();
    assert.equal(p.flashed.length, 0);
    assert.match(p.notices.at(-1)[0], /^couldn't open it in a browser/);
    const live = page(answer); live.play(queen);
    live.context.openSketch(); await settle();
    assert.equal(live.notices[0][0], "couldn't open strudel.cc in a browser");
  }
  const safari = page({ browser: 'default', plays: false }, { make: rebuiltQueen });   // (Chrome was there, `open` failed, the default browser opened)
  safari.play(queen);
  safari.context.O(); await settle();
  assert.deepEqual(safari.flashed, []);
  assert.match(safari.notices.at(-1)[0], /^If this opened in Safari it will stay silent/);
  assert.equal(safari.notices.at(-1)[1], "/m/Queen 2026 rebuilt/rebuilt.wav", 'with a button to rebuilt.wav in its folder');
});

test('the engine counts its start-overs, which is what tells one untitled song\'s rebuild from the next one\'s: every reset, freshStart\'s or its own, bumps it', () => {
  globalThis.window ??= { NC_DEBUG: false };
  const fake = (size) => ({ fftSize: size, frequencyBinCount: size / 2, getFloatFrequencyData: (out) => out.fill(-90), getFloatTimeDomainData: (out) => out.fill(0) });
  const eng = createEngine({ fast: fake(1024), mid: fake(4096), slow: fake(16384), sampleRate: 48000 });
  const before = eng.resets | 0;
  eng.reset();
  assert.equal(eng.resets, before + 1);
  eng.reset({ top: true });
  assert.equal(eng.resets, before + 2);
  assert.match(app, /resets: resets0/, 'and the page keeps the count with the rebuild');
});

test('the first-run notice names X and O in plain words, in the keys as bound, in the one notice (no new screen)', () => {
  const line = app.split('\n').find((l) => l.includes('Toaster is listening to whatever your'));
  assert.ok(line, 'the notice is there');
  assert.match(line, /writing it as code\. \$\{K\('export'\)\} rebuilds the song from its own sounds, \$\{K\('strudel'\)\} plays it in strudel\.cc\. \? shows the keys;/);
  assert.equal((line.match(/showNotice\(/g) || []).length, 1, 'one notice');
});
