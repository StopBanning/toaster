// The Mac self-update (update.js on a Mac, helpers/mac-update.cjs), run for real on throwaway folders under scratch. Nothing here
// touches an installed Toaster, its settings, or the Trash: the "apps" are tiny fake .app folders (an Info.plist, an executable,
// an app.asar, a framework with the symbolic links Electron's have), zipped by ditto as the release's workflow zips the real one,
// and the "GitHub" is a server on 127.0.0.1 that serves a release's JSON and that zip (or breaks in the ways a download can).
// Needs a Mac (ditto, plutil, /bin/sh), so the parts that run things skip elsewhere; the parts that read text run anywhere.
//   - the swap script, as text and run end to end (the old copy goes to the Trash and the new one in; with the new copy
//     unmovable, or the old one stuck, or Toaster slow to close, or the wrong version in place, the old copy is left running);
//   - update.js's check() and install() against the fake feed: the zip downloaded, its checksum, unpacked, version-checked,
//     and each way it can fail (a bad checksum, a connection that drops halfway, no write permission, a copy run from
//     Downloads, a wrong or broken zip) leaves the old app exactly as it was, says plainly that the update failed, and starts
//     nothing; and the script install() writes, run, swaps for real.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { scratch } from './paths.mjs';

const mac = process.platform === 'darwin';
const asRoot = typeof process.getuid === 'function' && process.getuid() === 0; // (root can write anywhere: the permission tests skip)
const require = createRequire(import.meta.url);
// (spawn is hooked before anything of ours is loaded, as update.js and the helper take it when they load: a test can then watch
// the script install() starts, and decline to start it. With no hook set, it is the real one.)
const cp = require('node:child_process'), realSpawn = cp.spawn;
let spawnHook = null;
cp.spawn = (...args) => spawnHook?.(...args) ?? realSpawn(...args);
const helper = require('../helpers/mac-update.cjs');
const sq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

// ---------------------------------------------------------------- throwaway folders

// (under scratch, as throwaway output goes; where there is none to be made, the temporary folder)
const parent = (() => { try { fs.mkdirSync(scratch(), { recursive: true }); return scratch(); } catch { return os.tmpdir(); } })();
const made = [];
const folder = (name) => { const dir = fs.mkdtempSync(path.join(parent, `mac-update-${name}-`)); made.push(dir); return fs.realpathSync(dir); };
after(() => {
  for (const dir of made) {
    if (mac) { spawnSync('/bin/chmod', ['-R', 'u+w', dir]); spawnSync('/usr/bin/chflags', ['-R', 'nouchg', dir]); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A fake app: the parts the update looks at, and a framework's links (a real Electron app is made of them).
function fakeApp(dir, { version, tag, exe = 'Toaster', asar = true }) {
  const at = (...p) => path.join(dir, 'Contents', ...p);
  fs.mkdirSync(at('MacOS'), { recursive: true });
  fs.mkdirSync(at('Resources'), { recursive: true });
  fs.mkdirSync(at('Frameworks', 'Fake.framework', 'Versions', 'A'), { recursive: true });
  fs.writeFileSync(at('Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>CFBundleExecutable</key><string>${exe}</string><key>CFBundleIdentifier</key><string>example.toaster-update-test</string><key>CFBundleShortVersionString</key><string>${version}</string></dict></plist>\n`);
  fs.writeFileSync(at('MacOS', exe), `#!/bin/sh\necho ${tag}\n`, { mode: 0o755 });
  // (bytes that don't compress, so the zip is big enough to be cut in the middle)
  if (asar) fs.writeFileSync(at('Resources', 'app.asar'), Buffer.concat([Buffer.from(`${tag} asar `), crypto.randomBytes(200000)]));
  fs.writeFileSync(at('Frameworks', 'Fake.framework', 'Versions', 'A', 'Fake'), `${tag} framework`);
  fs.symlinkSync('A', at('Frameworks', 'Fake.framework', 'Versions', 'Current'));
  fs.symlinkSync('Versions/Current/Fake', at('Frameworks', 'Fake.framework', 'Fake'));
}
const exeOf = (app) => path.join(app, 'Contents', 'MacOS', 'Toaster');

// Zipped as the release's workflow zips the real one (.github/workflows/mac.yml).
function zipOf(app) {
  const zip = path.join(folder('zip'), 'app.zip');
  execFileSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zip]);
  return fs.readFileSync(zip);
}
// A new version's zip: Toaster.app, as the real one has it.
function newZip(version = '0.4.30', tag = 'new', options = {}) {
  const dir = path.join(folder('newapp'), options.name || 'Toaster.app');
  fakeApp(dir, { version, tag, ...options });
  return zipOf(dir);
}

// Every path under a folder with what's in it (permissions, contents, links), to show that nothing changed.
function snapshot(dir) {
  const out = [];
  const walk = (p, rel) => {
    const st = fs.lstatSync(p), mode = (st.mode & 0o777).toString(8);
    if (st.isSymbolicLink()) out.push(`${rel} -> ${fs.readlinkSync(p)}`);
    else if (st.isDirectory()) { out.push(`${rel}/ ${mode}`); for (const n of fs.readdirSync(p).sort()) walk(path.join(p, n), `${rel}/${n}`); }
    else out.push(`${rel} ${mode} ${sha(fs.readFileSync(p)).slice(0, 16)}`);
  };
  walk(dir, '.');
  return out;
}
const lines = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n') : []);
const text = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const versionOf = (app) => execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleShortVersionString', 'raw', '-o', '-', path.join(app, 'Contents', 'Info.plist')], { encoding: 'utf8' }).trim();
const DEAD = 999999; // (a process id that is never in use: macOS stops at 99999)

// ---------------------------------------------------------------- what is pure: the app's path, the script's text

test('the app is found from the executable inside it, and a program that is not in an app has none', () => {
  assert.equal(helper.bundleOf('/Applications/Toaster.app/Contents/MacOS/Toaster'), '/Applications/Toaster.app');
  assert.equal(helper.bundleOf('/Users/me/My Apps/Toaster 2.app/Contents/MacOS/Toaster'), '/Users/me/My Apps/Toaster 2.app');
  // (an app inside another's resources: the one the program is in)
  assert.equal(helper.bundleOf('/A/Outer.app/Contents/Resources/Toaster.app/Contents/MacOS/Toaster'), '/A/Outer.app/Contents/Resources/Toaster.app');
  assert.equal(helper.bundleOf('/x/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), '/x/node_modules/electron/dist/Electron.app');
  for (const not of ['/usr/local/bin/node', '/Applications/Toaster.app/Contents/MacOS', '/Applications/Toaster.app/Contents/Frameworks/x/y', 'Toaster.app/Contents/MacOS/Toaster', 'C:\\Toaster\\Toaster.exe', '', undefined, null]) {
    assert.equal(helper.bundleOf(not), null, String(not));
  }
});

test('a copy a Mac runs from its AppTranslocation folder cannot replace itself: the page is told to move it into Applications', () => {
  // (a made-up path of the kind a Mac gives an app opened straight from Downloads: nothing is looked at on disk)
  const exe = '/private/var/folders/zz/abcdefghijkl/T/AppTranslocation/0F1E2D3C-AAAA-BBBB-CCCC-0123456789AB/d/Toaster.app/Contents/MacOS/Toaster';
  const { bundle, problem } = helper.where(exe);
  assert.equal(bundle, path.dirname(path.dirname(path.dirname(exe))));
  assert.match(problem, /temporary read-only place/);
  assert.match(problem, /can't replace itself/);
  assert.match(problem, /move Toaster into Applications/);
  assert.doesNotMatch(problem, /[\n.]$/, 'a clause: the page puts its own full stop after it');
});

test('a program that is not in an app has nothing to replace', () => {
  assert.match(helper.where('/usr/local/bin/node').problem, /isn't running from an app/);
  assert.match(helper.where('/nowhere/at/all/Gone.app/Contents/MacOS/Gone').problem, /isn't running from an app/);
});

test('the swap script has every value quoted at the top, however odd the folders, and only removes folders named like its own', () => {
  const odd = `/Apps 'q' "d" $x \`b\`; rm -rf ~`;
  const text = helper.swapScript({ pid: 4242, app: `${odd}/Toaster.app`, fresh: `${odd}/.Toaster-update-0.4.30/Toaster.app`, stage: `${odd}/.Toaster-update-0.4.30`, aside: `${odd}/.Toaster-old-4242`, trash: '/Users/me/.Trash', keep: 'Toaster 0.4.29', version: '0.4.30', log: '/tmp/toaster-update.log' });
  const head = text.split('\n').slice(0, 12);
  assert.deepEqual(head.slice(0, 2), ["PID='4242'", `APP='${odd.replace(/'/g, `'\\''`)}/Toaster.app'`]);
  assert.ok(head.every((l) => /^[A-Z]+='/.test(l)), 'the values come first, one to a line');
  assert.match(text, /OPEN='\/usr\/bin\/open'/);
  assert.match(text, /PATIENCE='120'/);
  // (the script's own text, after the values: the odd folder's name above has an rm -rf in it, to be quoted and never run)
  const body = text.split('\n').slice(12).join('\n');
  assert.match(body, /\/\?\*\/\.Toaster-update-\* \| \/\?\*\/\.Toaster-old-\*\) rm -rf "\$1"/, 'rm -rf, once, behind the check on the folder\'s name');
  assert.equal([...body.matchAll(/rm -rf/g)].length, 1);
  // the order: Toaster closes, the old copy goes aside, the new one in, the version is read back, it's started, then the Trash
  const order = ['Toaster closed', 'mv "$APP" "$ASIDE"', 'mv "$FRESH" "$APP"', 'CFBundleShortVersionString', 'swapped in; starting it', 'mv "$ASIDE" "$dest"', 'note "done"'].map((s) => text.indexOf(s));
  assert.ok(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])), order.join(','));
  // "done" once, and nothing says it before the new copy is in place
  assert.equal([...text.matchAll(/"done"/g)].length, 1);
  assert.ok(!/unzip|ditto/.test(text.replace(/^# .*$/gm, '')), 'the script never unpacks anything');
});

test('the swap script refuses what it was not meant to be given', () => {
  const good = { pid: 4242, app: '/A/Toaster.app', fresh: '/A/.Toaster-update-0.4.30/Toaster.app', stage: '/A/.Toaster-update-0.4.30', aside: '/A/.Toaster-old-4242', trash: '/U/.Trash', keep: 'Toaster 0.4.29', version: '0.4.30', log: '/T/toaster-update.log' };
  assert.doesNotThrow(() => helper.swapScript(good));
  for (const bad of [
    { pid: 0 }, { pid: '4242' }, { pid: 1.5 },
    { app: 'Toaster.app' }, { app: '/A/Toaster' }, { app: '/' }, { trash: '.Trash' }, { log: 'toaster-update.log' }, { open: 'open' },
    { stage: '/A/Toaster-update-0.4.30' }, { stage: '/', fresh: '/Toaster.app' }, { stage: '/A/.Toaster-update-0.4.30/..', fresh: '/A/.Toaster-update-0.4.30/../Toaster.app' },
    { aside: '/A/Toaster.old' }, { aside: '/A' },
    { fresh: '/B/Toaster.app' }, { fresh: '/A/.Toaster-update-0.4.30' },
    { version: '0.4.30; reboot' }, { version: '' }, { version: 'v0.4.30' }, { keep: '' }, { keep: 'a/b' },
    { patience: -1 }, { patience: 1.5 }, { settle: -1 }, { settle: 'soon' },
  ]) assert.throws(() => helper.swapScript({ ...good, ...bad }), /swapScript/, JSON.stringify(bad));
});

test('the script is valid for the Mac\'s sh and for a strict POSIX one', { skip: !mac }, () => {
  const dir = folder('syntax'), file = path.join(dir, 'swap.sh');
  fs.writeFileSync(file, helper.swapScript({ pid: 4242, app: '/A/Toaster.app', fresh: '/A/.Toaster-update-0.4.30/Toaster.app', stage: '/A/.Toaster-update-0.4.30', aside: '/A/.Toaster-old-4242', trash: '/U/.Trash', keep: 'Toaster 0.4.29', version: '0.4.30', log: '/T/toaster-update.log' }));
  for (const sh of ['/bin/sh', '/bin/dash', '/bin/bash']) {
    if (!fs.existsSync(sh)) continue;
    const r = spawnSync(sh, ['-n', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${sh}: ${r.stderr}`);
  }
});

test('the Mac path unpacks with ditto and nothing else, updates through its own script and never through Electron\'s updater or a relaunch', () => {
  // (the source files, read as text: any line endings)
  for (const file of ['update.js', 'helpers/mac-update.cjs']) {
    const src = fs.readFileSync(path.join(import.meta.dirname, '..', file), 'utf8');
    assert.doesNotMatch(src, /\bunzip\b|autoUpdater|squirrel|\.relaunch\(/i, `${file}: no other unpacker, no Electron updater, no app.relaunch (it starts the old path's program)`);
  }
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'helpers/mac-update.cjs'), 'utf8');
  assert.match(src, /const DITTO = '\/usr\/bin\/ditto'/);
  assert.match(src, /spawn\(DITTO, \['-x', '-k', zip, dest\]/);
  assert.match(src, /const OPEN = '\/usr\/bin\/open'/);
  // the script starts the new copy by its path, from its own place in the swap
  assert.match(src, /launch\(\) \{ err=\$\("\$OPEN" -n "\$APP" 2>&1\)/);
});

test('the update notice on the page offers the update on a Mac as on Windows, and says why where it cannot', () => {
  const app = fs.readFileSync(path.join(import.meta.dirname, '..', 'renderer', 'app.js'), 'utf8');
  const offer = app.slice(app.indexOf('async function offerUpdate(u) {'), app.indexOf("window.nc?.onUpdateProgress?.("));
  assert.match(offer, /u\.why\s*\?\s*`Toaster \$\{u\.version\} is out \(this one is \$\{u\.current\}\), but \$\{u\.why\}\. Open its page to get it\?`/);
  assert.match(offer, /buttons: \[u\.canInstall \? 'Update now' : 'Open page', 'Later'\]/);
  assert.match(offer, /Update now\? It downloads, then closes and opens again as the new one\./);
  assert.match(offer, /The update didn't go through \(\$\{String\(err\?\.message \|\| err\)\.replace\(\/\^\.\*\?Error: \/, ''\)\}\), and nothing changed\./);
  // (and nothing in it says a Mac is different: the one button, the same words)
  assert.doesNotMatch(offer, /darwin|mac/i);
});

// ---------------------------------------------------------------- where it can be replaced

test('an app and a folder this user can change can be replaced where they stand', { skip: !mac }, () => {
  const dir = folder('where'), app = path.join(dir, 'Toaster.app');
  fakeApp(app, { version: '0.4.29', tag: 'old' });
  const { bundle, problem } = helper.where(exeOf(app));
  assert.equal(bundle, app);
  assert.equal(problem, null);
});

test('a folder or an app this user cannot change cannot be replaced, and the words say what to do', { skip: !mac || asRoot }, () => {
  const dir = folder('readonly'), apps = path.join(dir, 'Apps'), app = path.join(apps, 'Toaster.app');
  fs.mkdirSync(apps);
  fakeApp(app, { version: '0.4.29', tag: 'old' });
  fs.chmodSync(apps, 0o555);
  assert.match(helper.where(exeOf(app)).problem, /can't replace itself where it is, because its folder isn't one you can change: move Toaster into Applications/);
  fs.chmodSync(apps, 0o755);
  fs.chmodSync(app, 0o555);
  assert.match(helper.where(exeOf(app)).problem, /can't replace itself where it is/);
  fs.chmodSync(app, 0o755);
  assert.equal(helper.where(exeOf(app)).problem, null);
});

test('a link to the app is followed: the app itself is what is replaced', { skip: !mac }, () => {
  const dir = folder('link'), real = path.join(dir, 'Real.app'), via = path.join(dir, 'Toaster.app');
  fakeApp(real, { version: '0.4.29', tag: 'old' });
  fs.symlinkSync(real, via);
  assert.equal(helper.where(exeOf(via)).bundle, real);
});

// ---------------------------------------------------------------- the zip, unpacked and checked

test('a zip written by ditto unpacks with its links, permissions and contents, and its version is read back', { skip: !mac }, async () => {
  const src = path.join(folder('src'), 'Toaster.app');
  fakeApp(src, { version: '0.4.30', tag: 'new' });
  const zip = path.join(folder('zipdir'), 'Toaster-0.4.30-mac-universal.zip'), stage = path.join(folder('stage'), helper.STAGE_PREFIX + '0.4.30');
  fs.writeFileSync(zip, zipOf(src));
  await helper.unpack(zip, stage);
  assert.deepEqual(fs.readdirSync(stage), ['Toaster.app'], 'nothing else comes out (no __MACOSX)');
  assert.deepEqual(snapshot(path.join(stage, 'Toaster.app')), snapshot(src));
  assert.equal(fs.readlinkSync(path.join(stage, 'Toaster.app/Contents/Frameworks/Fake.framework/Versions/Current')), 'A');
  assert.ok(fs.statSync(exeOf(path.join(stage, 'Toaster.app'))).mode & 0o100, 'still executable');
  assert.equal(await helper.unpackedBundle(stage, '0.4.30', '/Applications/Toaster.app/Contents/MacOS/Toaster'), path.join(stage, 'Toaster.app'));
  assert.equal(await helper.plistValue(path.join(stage, 'Toaster.app'), 'CFBundleShortVersionString'), '0.4.30');
});

test('an unpacked app that is not what the release says is refused, in words', { skip: !mac }, async () => {
  const run = async (options, version = '0.4.30', exe = '/Applications/Toaster.app/Contents/MacOS/Toaster') => {
    const stage = path.join(folder('refuse'), helper.STAGE_PREFIX + '0.4.30');
    const src = path.join(folder('refuse-src'), options.name || 'Toaster.app');
    fakeApp(src, { version, tag: 'new', ...options });
    const zip = path.join(folder('refuse-zip'), 'z.zip');
    fs.writeFileSync(zip, zipOf(src));
    await helper.unpack(zip, stage);
    return helper.unpackedBundle(stage, '0.4.30', exe);
  };
  await assert.rejects(run({}, '0.4.31'), { message: 'the update looked wrong (it says Toaster 0.4.31, not 0.4.30)' });
  await assert.rejects(run({ asar: false }), { message: 'the update looked wrong' });
  await assert.rejects(run({ name: 'Other.app' }), { message: 'the update looked wrong' });
  // (an Electron run from source is not Toaster: a copy run that way is never replaced by a release)
  await assert.rejects(run({}, '0.4.30', '/x/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), { message: 'the update looked wrong' });
  await assert.doesNotReject(run({}));
});

test('a zip that is not a zip says it could not be unpacked', { skip: !mac }, async () => {
  const dir = folder('garbage'), zip = path.join(dir, 'bad.zip');
  fs.writeFileSync(zip, crypto.randomBytes(5000));
  await assert.rejects(helper.unpack(zip, path.join(dir, 'out')), { message: 'could not unpack the update' });
});

// ---------------------------------------------------------------- the swap script, run for real

// An old app (0.4.29) and a new one (0.4.30) in a folder whose name has everything a shell treats specially, the Trash under a
// made-up home, and a stand-in for `open` that notes what it was asked to open.
function swapRig(name, { openExit = 0 } = {}) {
  const base = folder(name), apps = path.join(base, `Apps 'q' "d" $x \`b\``);
  fs.mkdirSync(apps);
  const app = path.join(apps, 'Toaster.app'), stage = helper.stageOf(app, '0.4.30'), fresh = path.join(stage, 'Toaster.app');
  fakeApp(app, { version: '0.4.29', tag: 'old' });
  fakeApp(fresh, { version: '0.4.30', tag: 'new' });
  const trash = path.join(base, 'home', '.Trash');
  fs.mkdirSync(trash, { recursive: true });
  const open = path.join(base, 'open'), openLog = path.join(base, 'open.log');
  fs.writeFileSync(open, `#!/bin/sh\necho "$@" >> ${sq(openLog)}\nexit ${openExit}\n`, { mode: 0o755 });
  return { base, apps, app, stage, fresh, trash, open, openLog, log: path.join(base, 'toaster-update.log'), aside: helper.asideOf(app, process.pid), before: snapshot(apps) };
}
const scriptOf = (t, extra = {}) => helper.swapScript({ pid: DEAD, app: t.app, fresh: t.fresh, stage: t.stage, aside: t.aside, trash: t.trash, keep: 'Toaster 0.4.29', version: '0.4.30', log: t.log, open: t.open, settle: 0, ...extra });
function runSwap(t, extra) {
  const file = path.join(t.base, 'swap.sh');
  fs.writeFileSync(file, scriptOf(t, extra));
  const r = spawnSync('/bin/sh', [file], { encoding: 'utf8', timeout: 60000 });
  return { code: r.status, log: lines(t.log), err: r.stderr.trim(), opened: lines(t.openLog) };
}
const why = (r) => r.log.concat(r.err ? ['stderr: ' + r.err] : []).join('\n');
// (a try that failed never says it went through: no "swapped in", no "done")
const noSuccess = (r) => assert.ok(!r.log.some((l) => /swapped in|done$/.test(l)), why(r));

test('the swap puts the new copy in, starts it, and the old copy in the Trash', { skip: !mac }, () => {
  const t = swapRig('plain');
  const r = runSwap(t);
  assert.equal(r.code, 0, why(r));
  assert.equal(versionOf(t.app), '0.4.30');
  assert.equal(fs.readFileSync(exeOf(t.app), 'utf8'), '#!/bin/sh\necho new\n');
  assert.equal(fs.readlinkSync(path.join(t.app, 'Contents/Frameworks/Fake.framework/Versions/Current')), 'A', 'the app is moved, not copied: its links are as they were');
  assert.deepEqual(fs.readdirSync(t.trash), ['Toaster 0.4.29.app']);
  assert.equal(versionOf(path.join(t.trash, 'Toaster 0.4.29.app')), '0.4.29');
  assert.equal(fs.readFileSync(exeOf(path.join(t.trash, 'Toaster 0.4.29.app')), 'utf8'), '#!/bin/sh\necho old\n');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app'], 'no stage and no aside left');
  assert.deepEqual(r.opened, [`-n ${t.app}`], 'the new copy is what is started, by its path');
  assert.match(r.log[0], /^update to .*\.Toaster-update-0\.4\.30\/Toaster\.app started \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/);
  assert.deepEqual(r.log.slice(1).map((l) => l.replace(/^\d\d:\d\d:\d\d /, '')), ['Toaster closed', 'swapped in; starting it', 'the old copy is in the Trash', 'done']);
});

test('an old copy already in the Trash is not overwritten: the new name is numbered', { skip: !mac }, () => {
  const t = swapRig('trash-taken');
  fs.mkdirSync(path.join(t.trash, 'Toaster 0.4.29.app'));
  fs.writeFileSync(path.join(t.trash, 'Toaster 0.4.29.app', 'keep'), 'earlier');
  fs.mkdirSync(path.join(t.trash, 'Toaster 0.4.29 2.app'));
  const r = runSwap(t);
  assert.equal(r.code, 0, why(r));
  assert.deepEqual(fs.readdirSync(t.trash).sort(), ['Toaster 0.4.29 2.app', 'Toaster 0.4.29 3.app', 'Toaster 0.4.29.app']);
  assert.equal(fs.readFileSync(path.join(t.trash, 'Toaster 0.4.29.app', 'keep'), 'utf8'), 'earlier');
  assert.equal(versionOf(path.join(t.trash, 'Toaster 0.4.29 3.app')), '0.4.29');
});

test('with no Trash to put it in, the old copy is deleted, and the new one is in place all the same', { skip: !mac }, () => {
  const t = swapRig('no-trash');
  fs.rmSync(t.trash, { recursive: true });
  const r = runSwap(t);
  assert.equal(r.code, 0, why(r));
  assert.equal(versionOf(t.app), '0.4.30');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app']);
  assert.match(r.log.at(-2), /the old copy couldn't go to the Trash, so it was deleted/);
  assert.match(r.log.at(-1), /done$/);
});

test('a start that fails is noted, and the new copy stays in place', { skip: !mac }, () => {
  const t = swapRig('open-fails', { openExit: 1 });
  const r = runSwap(t);
  assert.equal(r.code, 0, why(r));
  assert.equal(versionOf(t.app), '0.4.30');
  assert.ok(r.log.some((l) => /it couldn't be started/.test(l)), why(r));
  assert.match(r.log.at(-1), /done$/);
});

test('it waits for Toaster to close, and swaps only after', { skip: !mac }, async () => {
  const t = swapRig('waits');
  const toaster = spawn('/bin/sleep', ['3'], { stdio: 'ignore' }); // (stands for the running Toaster)
  const file = path.join(t.base, 'swap.sh');
  fs.writeFileSync(file, scriptOf(t, { pid: toaster.pid }));
  const script = spawn('/bin/sh', [file], { stdio: 'ignore' });
  const done = new Promise((resolve) => script.once('exit', resolve));
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(versionOf(t.app), '0.4.29', 'still Toaster\'s own old copy while it runs');
  assert.deepEqual(fs.readdirSync(t.trash), []);
  assert.equal(await done, 0, lines(t.log).join('\n'));
  assert.equal(versionOf(t.app), '0.4.30');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app']);
});

test('a Toaster that does not close in time is left alone, and the update given up with that said', { skip: !mac }, async () => {
  const t = swapRig('slow');
  const toaster = spawn('/bin/sleep', ['60'], { stdio: 'ignore' });
  try {
    const r = runSwap(t, { pid: toaster.pid, patience: 2 }); // (a second)
    assert.equal(r.code, 1, why(r));
  noSuccess(r);
    assert.match(r.log.at(-1), /Toaster didn't close, so the old copy stays$/);
    assert.deepEqual(snapshot(t.app), t.before.filter((l) => l.startsWith('./Toaster.app')).map((l) => l.replace('./Toaster.app', '.')), 'the old copy is untouched');
    assert.ok(!fs.existsSync(t.stage), 'its stage is removed');
    assert.deepEqual(r.opened, [], 'nothing is started: Toaster is still running');
  } finally { toaster.kill(); }
});

test('with the new copy unmovable, the old copy comes back where it was and is started again', { skip: !mac || asRoot }, () => {
  const t = swapRig('unmovable');
  fs.chmodSync(t.fresh, 0o555); // (a folder moved to another folder must be writable: this one cannot go in)
  const r = runSwap(t);
  assert.equal(r.code, 1, why(r));
  noSuccess(r);
  assert.match(r.log.at(-1), /the new copy couldn't go in \(Permission denied\), so the old copy stays$/);
  assert.ok(!r.log.some((l) => /done|swapped in/.test(l)), 'never says it went through');
  assert.equal(versionOf(t.app), '0.4.29');
  assert.equal(fs.readFileSync(exeOf(t.app), 'utf8'), '#!/bin/sh\necho old\n');
  assert.deepEqual(snapshot(t.app), t.before.filter((l) => l.startsWith('./Toaster.app')).map((l) => l.replace('./Toaster.app', '.')), 'exactly as it was');
  assert.ok(!fs.existsSync(t.aside), 'nothing left aside');
  assert.deepEqual(fs.readdirSync(t.trash), [], 'and not in the Trash');
  assert.deepEqual(r.opened, [`-n ${t.app}`], 'the old copy is started again');
});

test('with the new copy locked (an immutable flag), the old copy comes back too', { skip: !mac || asRoot }, () => {
  const t = swapRig('locked');
  execFileSync('/usr/bin/chflags', ['uchg', t.fresh]);
  const r = runSwap(t);
  assert.equal(r.code, 1, why(r));
  noSuccess(r);
  assert.match(r.log.at(-1), /the new copy couldn't go in \(Operation not permitted\), so the old copy stays$/);
  assert.equal(versionOf(t.app), '0.4.29');
  assert.deepEqual(r.opened, [`-n ${t.app}`]);
});

test('with the old copy stuck, it stays where it is and nothing else is touched', { skip: !mac || asRoot }, () => {
  const t = swapRig('stuck');
  execFileSync('/usr/bin/chflags', ['uchg', t.app]);
  const r = runSwap(t);
  execFileSync('/usr/bin/chflags', ['nouchg', t.app]);
  assert.equal(r.code, 1, why(r));
  noSuccess(r);
  assert.match(r.log.at(-1), /the old copy couldn't be moved aside \(Operation not permitted\), so the old copy stays$/);
  assert.equal(versionOf(t.app), '0.4.29');
  assert.ok(!fs.existsSync(t.stage), 'the stage is removed');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app']);
  assert.deepEqual(fs.readdirSync(t.trash), []);
  assert.deepEqual(r.opened, [`-n ${t.app}`]);
});

test('a new copy that does not say the version it should, where it stands, is taken out again', { skip: !mac }, () => {
  const t = swapRig('wrong-version');
  const r = runSwap(t, { version: '0.4.31' }); // (it was checked as 0.4.30 when it was unpacked; this one is asked to be 0.4.31)
  assert.equal(r.code, 1, why(r));
  noSuccess(r);
  assert.match(r.log.at(-1), /the new copy didn't check out where it stands \(it says 0\.4\.30\), so the old copy stays$/);
  assert.equal(versionOf(t.app), '0.4.29');
  assert.equal(fs.readFileSync(exeOf(t.app), 'utf8'), '#!/bin/sh\necho old\n');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app'], 'the rejected copy goes with the stage');
  assert.deepEqual(r.opened, [`-n ${t.app}`], 'the old copy is started again');
});

test('with no old copy where it was, or no new copy, nothing is swapped and it says so', { skip: !mac }, () => {
  const gone = swapRig('gone');
  fs.rmSync(gone.app, { recursive: true });
  const r1 = runSwap(gone);
  assert.equal(r1.code, 1, why(r1));
  noSuccess(r1);
  assert.match(r1.log.at(-1), /the old copy isn't at .* any more, so nothing was changed$/);
  assert.deepEqual(r1.opened, []);
  const missing = swapRig('missing');
  fs.rmSync(missing.fresh, { recursive: true });
  const r2 = runSwap(missing);
  assert.equal(r2.code, 1, why(r2));
  noSuccess(r2);
  assert.match(r2.log.at(-1), /the new copy isn't there, so the old copy stays$/);
  assert.equal(versionOf(missing.app), '0.4.29');
  assert.deepEqual(r2.opened, [`-n ${missing.app}`]);
});

test('it removes nothing but folders named like the update\'s own', { skip: !mac }, () => {
  const t = swapRig('drop');
  fs.rmSync(t.app, { recursive: true }); // (with no old copy to replace, the script clears the stage and stops)
  const bystander = path.join(t.apps, 'Other.app');
  fs.mkdirSync(bystander);
  fs.writeFileSync(path.join(bystander, 'keep'), 'mine');
  // swapScript will not be written with a stage like that; the script is given one anyway, to show that it would not remove it
  const file = path.join(t.base, 'swap.sh');
  fs.writeFileSync(file, scriptOf(t).replace(/^STAGE='.*'$/m, `STAGE=${sq(bystander)}`));
  const r = spawnSync('/bin/sh', [file], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(path.join(bystander, 'keep'), 'utf8'), 'mine');
  assert.match(lines(t.log).at(-1), /it won't remove .*Other\.app$/);
});

// ---------------------------------------------------------------- update.js against a fake GitHub

// The fake feed: what it serves is set by each test. update.js reads TOASTER_UPDATE_FEED once, when it's loaded, so the server is
// up first; and it loads Electron, which is not here, so the Electron it asks for is a stand-in whose "app" says what each test
// wants (where the program is, what version, the temp folder), and whose net.fetch is Node's.
const serving = { release: null, zip: Buffer.alloc(0), mode: 'whole', status: 200, requests: [] };
const world = { exe: '', temp: '', version: '0.4.29' };
let server, base, update, started = [];

if (mac) {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/latest') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(serving.release)); return; }
    if (!url.pathname.startsWith('/dl/')) { res.writeHead(404); res.end(); return; }
    serving.requests.push(url.pathname);
    const body = serving.zip, half = body.subarray(0, body.length >> 1);
    if (serving.status !== 200) { res.writeHead(serving.status); res.end('no'); return; }
    if (serving.mode === 'whole') { res.writeHead(200, { 'Content-Length': body.length }); res.end(body); return; }
    // (breaking: half the body, then the connection is cut, or, with no way to tell, closed as if that were all)
    if (serving.mode === 'silent') { res.socket.write('HTTP/1.0 200 OK\r\n\r\n'); res.socket.write(half); setTimeout(() => res.socket.end(), 20); return; }
    res.writeHead(200, serving.mode === 'length' ? { 'Content-Length': body.length } : {});
    res.write(half);
    setTimeout(() => res.socket.destroy(), 20);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.TOASTER_UPDATE_FEED = `${base}/latest`;
  after(() => { server.closeAllConnections?.(); server.close(); });

  const electron = {
    app: { isPackaged: true, getVersion: () => world.version, getPath: (name) => (name === 'exe' ? world.exe : world.temp) },
    net: { fetch: (url, init) => fetch(url, init) },
  };
  const Module = require('node:module'), load = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? electron : load.call(this, request, ...rest); };
  try { update = require('../update.js'); } finally { Module._load = load; }
}

function releaseOf(zip, { version = '0.4.30', sum = sha(zip), digest = `sha256:${sum}`, mac: withMac = true, win = false } = {}) {
  const asset = (name) => ({ name, browser_download_url: `${base}/dl/${name}`, size: zip.length, ...(digest ? { digest } : {}) });
  return { tag_name: `v${version}`, html_url: `${base}/page`, draft: false, prerelease: false, assets: [...(withMac ? [asset(`Toaster-${version}-mac-universal.zip`)] : []), ...(win ? [asset(`Toaster-${version}-win-x64.zip`)] : [])] };
}

// A fake installed Toaster (0.4.29) in a folder of its own, with a temp folder and a home for the Trash; the world says so.
function rig(name, { zip = newZip(), release = {} } = {}) {
  const dir = folder(name), apps = path.join(dir, 'My Apps'), app = path.join(apps, 'Toaster.app'), temp = path.join(dir, 'tmp'), home = path.join(dir, 'home');
  fs.mkdirSync(apps);
  fs.mkdirSync(temp);
  fs.mkdirSync(path.join(home, '.Trash'), { recursive: true });
  fakeApp(app, { version: '0.4.29', tag: 'old' });
  Object.assign(world, { exe: exeOf(app), temp, version: '0.4.29' });
  Object.assign(serving, { zip, release: releaseOf(zip, release), mode: 'whole', status: 200, requests: [] });
  started = [];
  spawnHook = null;
  return { dir, apps, app, temp, home, trash: path.join(home, '.Trash'), zip, before: snapshot(apps) };
}
async function withHome(home, fn) {
  const was = process.env.HOME;
  process.env.HOME = home;
  try { return await fn(); } finally { process.env.HOME = was; }
}
// Hooks spawn so that the script install() starts is noted and not started (the fake child says it is running, or fails to).
function holdScript(fail = false) {
  spawnHook = (cmd, args, options) => {
    if (cmd !== '/bin/sh') return undefined; // (ditto is for real)
    started.push({ cmd, args, options });
    const child = new EventEmitter();
    child.unref = () => {};
    setImmediate(() => (fail ? child.emit('error', new Error('spawn /bin/sh ENOENT')) : child.emit('spawn')));
    return child;
  };
}
// What a failed install must leave: nothing started, the app and its folder exactly as they were, our temp folder empty, the
// Trash empty, and the failure said in words that say nothing was changed on the app's side (the page adds "and nothing changed").
async function failsWith(t, expected) {
  holdScript();
  const progress = [];
  await withHome(t.home, () => assert.rejects(update.install((p) => progress.push(p)), expected));
  assert.deepEqual(started, [], 'no script is started');
  assert.deepEqual(snapshot(t.apps), t.before, 'the app and its folder are exactly as they were');
  assert.deepEqual(fs.readdirSync(t.temp), [], 'no download or folder of ours is left in the temp folder');
  assert.deepEqual(fs.readdirSync(t.trash), []);
  return progress;
}

test('an update on offer: a newer Mac zip with its digest, in a folder the app can replace itself in', { skip: !mac }, async () => {
  const t = rig('offer');
  const u = await update.check();
  assert.deepEqual(u, { version: '0.4.30', current: '0.4.29', page: `${base}/page`, canInstall: true, failed: null, why: null });
  assert.deepEqual(serving.requests, [], 'checking downloads nothing');
  assert.deepEqual(snapshot(t.apps), t.before, 'and writes nothing beside the app');
});

test('nothing is offered for a release that is not newer, a draft, a prerelease, or not a version', { skip: !mac }, async () => {
  rig('older');
  for (const change of [{ tag_name: 'v0.4.29' }, { tag_name: 'v0.4.28' }, { draft: true }, { prerelease: true }, { tag_name: 'latest' }]) {
    serving.release = { ...releaseOf(serving.zip), ...change };
    assert.equal(await update.check(), null, JSON.stringify(change));
  }
});

test('with no Mac zip yet, or no digest for it, the page is offered and nothing is downloaded', { skip: !mac }, async () => {
  for (const release of [{ mac: false, win: true }, { digest: null }, { digest: 'sha256:abc' }, { digest: `md5:${'0'.repeat(32)}` }]) {
    const t = rig('no-asset', { release });
    const u = await update.check();
    assert.equal(u.canInstall, false, JSON.stringify(release));
    assert.equal(u.why, null, 'nothing to say about the place when there is nothing to install');
    assert.equal(u.version, '0.4.30');
    await assert.rejects(update.install(() => {}), { message: 'no download for this system' });
    assert.deepEqual(serving.requests, []);
    assert.deepEqual(snapshot(t.apps), t.before);
  }
});

test('a download that is not on GitHub is refused (the feed itself may only point at this machine)', { skip: !mac }, async () => {
  const t = rig('foreign');
  serving.release.assets[0].browser_download_url = 'https://evil.example/Toaster-0.4.30-mac-universal.zip';
  const u = await update.check();
  assert.equal(u.canInstall, false);
  await assert.rejects(update.install(() => {}), { message: 'the update download is not on GitHub' });
  assert.deepEqual(snapshot(t.apps), t.before);
});

test('the zip is downloaded with its progress, checked against the digest, unpacked beside the app and handed to the script', { skip: !mac }, async () => {
  const t = rig('good');
  holdScript();
  await update.check();
  const progress = [];
  await withHome(t.home, () => update.install((p) => progress.push(p)));
  assert.deepEqual(serving.requests, ['/dl/Toaster-0.4.30-mac-universal.zip']);
  assert.ok(progress.length > 0 && progress.every((p, i) => i === 0 || p >= progress[i - 1]) && progress.at(-1) === 1, `progress ends at 1: ${progress.at(-1)}`);
  // the new copy is unpacked in a hidden folder beside the app, checked, and the zip is gone
  const stage = path.join(t.apps, '.Toaster-update-0.4.30');
  assert.deepEqual(fs.readdirSync(t.apps).sort(), ['.Toaster-update-0.4.30', 'Toaster.app']);
  assert.deepEqual(fs.readdirSync(stage).sort(), ['Toaster.app', 'swap.sh']);
  assert.equal(versionOf(path.join(stage, 'Toaster.app')), '0.4.30');
  assert.equal(fs.readlinkSync(path.join(stage, 'Toaster.app/Contents/Frameworks/Fake.framework/Versions/Current')), 'A');
  assert.deepEqual(fs.readdirSync(t.temp), [], 'the zip and its folder are gone');
  assert.deepEqual(snapshot(t.app), t.before.filter((l) => l.startsWith('./Toaster.app')).map((l) => l.replace('./Toaster.app', '.')), 'the old copy is not touched until Toaster closes');
  // one script, run by sh, detached from Toaster (it has to outlive it), from the temp folder
  assert.equal(started.length, 1);
  assert.equal(started[0].args[0], path.join(stage, 'swap.sh'));
  assert.deepEqual(started[0].args, [path.join(stage, 'swap.sh')]);
  assert.equal(started[0].options.detached, true);
  assert.equal(started[0].options.stdio, 'ignore');
  assert.equal(started[0].options.cwd, t.temp);
  assert.equal(fs.statSync(started[0].args[0]).mode & 0o777, 0o700);
  const script = fs.readFileSync(started[0].args[0], 'utf8');
  const value = (name) => new RegExp(`^${name}='(.*)'$`, 'm').exec(script)[1];
  assert.equal(value('PID'), String(process.pid));
  assert.equal(value('APP'), t.app);
  assert.equal(value('FRESH'), path.join(stage, 'Toaster.app'));
  assert.equal(value('STAGE'), stage);
  assert.equal(value('ASIDE'), path.join(t.apps, `.Toaster-old-${process.pid}`));
  assert.equal(value('TRASH'), path.join(t.home, '.Trash'));
  assert.equal(value('KEEP'), 'Toaster 0.4.29');
  assert.equal(value('WANT'), '0.4.30');
  assert.equal(value('LOG'), path.join(t.temp, 'toaster-update.log'));
  assert.equal(value('OPEN'), '/usr/bin/open');
});

test('the script install() wrote, run once Toaster has closed, swaps the new copy in for real', { skip: !mac }, async () => {
  const t = rig('swap-for-real');
  holdScript();
  await update.check();
  await withHome(t.home, () => update.install(() => {}));
  // as written, but waiting for a process that has already gone, and with a stand-in for open
  const open = path.join(t.dir, 'open'), openLog = path.join(t.dir, 'open.log');
  fs.writeFileSync(open, `#!/bin/sh\necho "$@" >> ${sq(openLog)}\n`, { mode: 0o755 });
  const written = fs.readFileSync(started[0].args[0], 'utf8');
  const patched = written.replace(/^PID='\d+'$/m, `PID='${DEAD}'`).replace(/^OPEN='.*'$/m, `OPEN=${sq(open)}`).replace(/^SETTLE='.*'$/m, "SETTLE='0'");
  assert.notEqual(patched, written);
  const file = path.join(t.dir, 'swap.sh');
  fs.writeFileSync(file, patched);
  const r = spawnSync('/bin/sh', [file], { encoding: 'utf8', timeout: 60000 });
  const log = lines(path.join(t.temp, 'toaster-update.log'));
  assert.equal(r.status, 0, log.join('\n') + r.stderr);
  assert.equal(versionOf(t.app), '0.4.30');
  assert.equal(fs.readFileSync(exeOf(t.app), 'utf8'), '#!/bin/sh\necho new\n');
  assert.equal(fs.readlinkSync(path.join(t.app, 'Contents/Frameworks/Fake.framework/Versions/Current')), 'A');
  assert.deepEqual(fs.readdirSync(t.apps), ['Toaster.app'], 'no stage, no aside');
  assert.deepEqual(fs.readdirSync(t.trash), ['Toaster 0.4.29.app']);
  assert.equal(versionOf(path.join(t.trash, 'Toaster 0.4.29.app')), '0.4.29');
  assert.deepEqual(lines(openLog), [`-n ${t.app}`]);
  assert.match(log.at(-1), /done$/);
  // and the page, on the next start, finds nothing amiss to say about this version's try
  assert.equal((await update.check()).failed, null);
});

test('a failed swap is what the next check says, instead of offering the update again', { skip: !mac || asRoot }, async () => {
  const t = rig('says-why');
  holdScript();
  await update.check();
  await withHome(t.home, () => update.install(() => {}));
  const written = fs.readFileSync(started[0].args[0], 'utf8');
  fs.chmodSync(path.join(t.apps, '.Toaster-update-0.4.30', 'Toaster.app'), 0o555); // (the new copy cannot be moved in)
  const open = path.join(t.dir, 'open');
  fs.writeFileSync(open, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const file = path.join(t.dir, 'swap.sh');
  fs.writeFileSync(file, written.replace(/^PID='\d+'$/m, `PID='${DEAD}'`).replace(/^OPEN='.*'$/m, `OPEN=${sq(open)}`).replace(/^SETTLE='.*'$/m, "SETTLE='0'"));
  const r = spawnSync('/bin/sh', [file], { encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 1);
  assert.equal(versionOf(t.app), '0.4.29', 'the old copy is back');
  const u = await update.check();
  assert.equal(u.canInstall, false);
  assert.match(u.failed, /^the new copy couldn't go in \(Permission denied\), so the old copy stays$/);
});

// -- the ways an install fails: each leaves the old app untouched and working, says so plainly, and starts nothing

test('a download that does not match its checksum is refused, and nothing is left', { skip: !mac }, async () => {
  const t = rig('bad-checksum', { release: { sum: sha('some other zip') } });
  await update.check();
  await failsWith(t, { message: "the download didn't match GitHub's checksum" });
  assert.deepEqual(serving.requests, ['/dl/Toaster-0.4.30-mac-universal.zip'], 'it was downloaded, and then not trusted');
});

test('a zip changed on the way is caught by the checksum even when its size is right', { skip: !mac }, async () => {
  const zip = newZip();
  const t = rig('tampered', { zip });
  const tampered = Buffer.from(zip);
  tampered[tampered.length >> 1] ^= 0xff;
  await update.check();
  serving.zip = tampered; // (what the feed lists is the real zip's digest and size)
  await failsWith(t, { message: "the download didn't match GitHub's checksum" });
});

test('a connection that drops halfway is reported as that, and nothing is left', { skip: !mac }, async () => {
  for (const mode of ['length', 'chunked']) {
    const t = rig(`dropped-${mode}`);
    await update.check();
    serving.mode = mode;
    const progress = await failsWith(t, { message: 'the connection dropped partway through the download' });
    assert.ok(progress.length > 0 && progress.at(-1) < 1, `${mode}: it was cut partway: ${progress.at(-1)}`);
  }
});

test('a connection closed early with no way to tell is caught by the size GitHub lists', { skip: !mac }, async () => {
  const t = rig('cut-short');
  await update.check();
  serving.mode = 'silent';
  await failsWith(t, { message: 'the download was cut short' });
});

test('a download GitHub does not have is refused, and a server that cannot be reached is said so', { skip: !mac }, async () => {
  const t = rig('not-found');
  await update.check();
  serving.status = 404;
  await failsWith(t, { message: 'download failed (404)' });
  // (nothing is listening there any more)
  const gone = http.createServer();
  await new Promise((r) => gone.listen(0, '127.0.0.1', r));
  const port = gone.address().port;
  await new Promise((r) => gone.close(r));
  serving.status = 200;
  serving.release.assets[0].browser_download_url = `http://127.0.0.1:${port}/dl/Toaster-0.4.30-mac-universal.zip`;
  await update.check();
  await failsWith(t, { message: "the download couldn't be started (GitHub couldn't be reached)" });
});

test('with no write permission where the app is, the update is not offered, and an install is refused before anything is downloaded', { skip: !mac || asRoot }, async () => {
  for (const [what, lock] of [['its folder', (t) => t.apps], ['the app itself', (t) => t.app]]) {
    const t = rig('no-permission');
    fs.chmodSync(lock(t), 0o555);
    const u = await update.check();
    assert.equal(u.canInstall, false, what);
    assert.match(u.why, /^Toaster can't replace itself where it is, because its folder isn't one you can change: move Toaster into Applications/);
    assert.equal(u.failed, null);
    assert.equal(u.version, '0.4.30');
    // (an install asked for anyway, as when the folder was locked after the offer)
    const before = snapshot(t.apps);
    holdScript();
    await withHome(t.home, () => assert.rejects(update.install(() => {}), { message: u.why }));
    assert.deepEqual(serving.requests, [], 'nothing was downloaded');
    assert.deepEqual(started, []);
    assert.deepEqual(snapshot(t.apps), before);
    assert.deepEqual(fs.readdirSync(t.temp), []);
    fs.chmodSync(lock(t), 0o755);
  }
});

test('a copy run from an AppTranslocation folder is not offered the update, is told to move into Applications, and cannot install', { skip: !mac }, async () => {
  const t = rig('translocated');
  world.exe = '/private/var/folders/zz/abcdefghijkl/T/AppTranslocation/0F1E2D3C-AAAA-BBBB-CCCC-0123456789AB/d/Toaster.app/Contents/MacOS/Toaster';
  const u = await update.check();
  assert.equal(u.canInstall, false);
  assert.equal(u.version, '0.4.30');
  assert.match(u.why, /^Toaster is running from a temporary read-only place your Mac made when it was opened from Downloads or a disk image, so it can't replace itself: move Toaster into Applications/);
  assert.equal(u.page, `${base}/page`, 'the page is still offered');
  holdScript();
  await withHome(t.home, () => assert.rejects(update.install(() => {}), { message: u.why }));
  assert.deepEqual(serving.requests, [], 'nothing was downloaded');
  assert.deepEqual(started, []);
  assert.deepEqual(snapshot(t.apps), t.before);
  assert.deepEqual(fs.readdirSync(t.temp), []);
});

test('a zip that is not a zip, with the right checksum, says it could not be unpacked, and leaves nothing', { skip: !mac }, async () => {
  const t = rig('not-a-zip', { zip: crypto.randomBytes(30000) });
  await update.check();
  await failsWith(t, { message: 'could not unpack the update' });
});

test('a release whose app is another version, or not the app, is refused after it is unpacked, and leaves nothing', { skip: !mac }, async () => {
  for (const [zip, message] of [
    [newZip('0.4.31'), 'the update looked wrong (it says Toaster 0.4.31, not 0.4.30)'],
    [newZip('0.4.30', 'new', { name: 'Other.app' }), 'the update looked wrong'],
    [newZip('0.4.30', 'new', { asar: false }), 'the update looked wrong'],
  ]) {
    const t = rig('looks-wrong', { zip });
    await update.check();
    await failsWith(t, { message });
  }
});

test('a copy run from source (Electron, not Toaster) is never replaced by a release', { skip: !mac }, async () => {
  const t = rig('dev');
  const dev = path.join(t.apps, 'Electron.app');
  fakeApp(dev, { version: '0.4.29', tag: 'electron', exe: 'Electron' });
  world.exe = path.join(dev, 'Contents', 'MacOS', 'Electron');
  t.before = snapshot(t.apps);
  const u = await update.check();
  assert.equal(u.canInstall, true, 'the place is fine; what is in it is looked at when the zip is unpacked');
  await failsWith(t, { message: 'the update looked wrong' });
});

test('a script that cannot be started is reported, and leaves nothing', { skip: !mac }, async () => {
  const t = rig('cannot-start');
  await update.check();
  const progress = [];
  holdScript(true);
  await withHome(t.home, () => assert.rejects(update.install((p) => progress.push(p)), { message: "the update couldn't be started" }));
  assert.equal(started.length, 1);
  assert.deepEqual(snapshot(t.apps), t.before, 'the stage is removed with it');
  assert.deepEqual(fs.readdirSync(t.temp), []);
});

test('a stage left by an update that did not finish, of this version or another, is cleared first; nothing else is', { skip: !mac }, async () => {
  const t = rig('stale-stage');
  for (const left of ['.Toaster-update-0.4.30', '.Toaster-update-0.4.28']) {
    fs.mkdirSync(path.join(t.apps, left, 'Toaster.app'), { recursive: true });
    fs.writeFileSync(path.join(t.apps, left, 'left-over'), 'from before');
  }
  // (not the update's: an old copy waiting beside the app, another app, a file)
  fs.mkdirSync(path.join(t.apps, '.Toaster-old-123'));
  fs.mkdirSync(path.join(t.apps, 'Other.app'));
  fs.writeFileSync(path.join(t.apps, '.Toaster-update'), 'a file, not a stage');
  holdScript();
  await update.check();
  await withHome(t.home, () => update.install(() => {}));
  assert.deepEqual(fs.readdirSync(t.apps).sort(), ['.Toaster-old-123', '.Toaster-update', '.Toaster-update-0.4.30', 'Other.app', 'Toaster.app']);
  assert.deepEqual(fs.readdirSync(path.join(t.apps, '.Toaster-update-0.4.30')).sort(), ['Toaster.app', 'swap.sh']);
});

test('the Windows check is as it was: the Windows zip, offered where a folder can be made beside the app', { skip: !mac }, async () => {
  const dir = folder('win'), exeDir = path.join(dir, 'Toaster-win32-x64');
  fs.mkdirSync(exeDir);
  const platform = Object.getOwnPropertyDescriptor(process, 'platform'), execPath = process.execPath;
  const zip = Buffer.from('a windows zip');
  Object.assign(world, { temp: dir, version: '0.4.29', exe: path.join(exeDir, 'Toaster.exe') });
  serving.release = releaseOf(zip, { win: true });
  try {
    // (the program's own path is where Windows looks: it is pointed at a folder made here, so the probe is made there)
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.execPath = path.join(exeDir, 'Toaster.exe');
    const u = await update.check();
    assert.deepEqual(u, { version: '0.4.30', current: '0.4.29', page: `${base}/page`, canInstall: true, failed: null, why: null });
    serving.release = releaseOf(zip, { mac: true, win: false }); // (only a Mac zip: nothing for Windows)
    assert.equal((await update.check()).canInstall, false);
    assert.deepEqual(fs.readdirSync(dir), ['Toaster-win32-x64'], 'the probe is removed');
  } finally {
    Object.defineProperty(process, 'platform', platform);
    process.execPath = execPath;
  }
});
