// The update's swap script (update.js SWAP), run for real in PowerShell on throwaway folders (Windows only):
// - a plain swap;
// - a swap while another program reads resources\app.asar, sharing reads and writes but not renames (an Electron
//   app's asar cache did this on Oct 27): the folder can't move, so the new files must go in over the old ones;
// - a file held with no sharing at all: nothing may change, and the old copy is started again.
// Each checks the app folder's files afterwards and the log's last line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const win = process.platform === 'win32';

// update.js's SWAP text, without loading Electron: the template literal is cut out of the source
function swapText() {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'update.js'), 'utf8');
  const start = src.indexOf('const SWAP = `') + 'const SWAP = `'.length;
  return src.slice(start, src.indexOf('`;', start));
}

function setUp(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `swap-${name}-`));
  const app = path.join(root, 'Toaster-win32-x64'), stage = path.join(root, 'Toaster-update-9.9.9');
  const fresh = path.join(stage, 'Toaster-win32-x64');
  for (const [dir, tag] of [[app, 'old'], [fresh, 'new']]) {
    fs.mkdirSync(path.join(dir, 'resources'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'locales'), { recursive: true });
    // (Start-Process needs something to run: rundll32 with no arguments shows no window and exits at once)
    fs.copyFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe'), path.join(dir, 'Toaster.exe'));
    fs.writeFileSync(path.join(dir, 'resources', 'app.asar'), `${tag} asar `.repeat(tag === 'new' ? 4000 : 3000));
    fs.writeFileSync(path.join(dir, 'locales', 'en-US.pak'), `${tag} pak`);
  }
  fs.writeFileSync(path.join(fresh, 'resources', 'only-new.txt'), 'new file');
  const log = path.join(root, 'update.log'), script = path.join(stage, 'swap.ps1');
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  // ($Wait: a process that's already gone; the swap waits for nothing)
  fs.writeFileSync(script, [`$Wait = 999999`, `$App = ${q(app)}`, `$Fresh = ${q(fresh)}`, `$Old = ${q(`${app}.old`)}`, `$Exe = 'Toaster.exe'`, `$Stage = ${q(stage)}`, `$Log = ${q(log)}`, swapText()].join('\r\n'), 'utf8');
  return { root, app, stage, fresh, log, script };
}

// a reader holding a file open the way an Electron asar cache does (FileShare ReadWrite, no Delete), or with no
// sharing at all; resolves once it holds the file, and returns a function that lets go
function hold(file, share) {
  const ps = spawn('powershell.exe', ['-NoProfile', '-Command', `$s = [System.IO.File]::Open('${file}', 'Open', 'Read', '${share}'); 'held'; [Console]::In.ReadLine() | Out-Null; $s.Close()`], { stdio: ['pipe', 'pipe', 'inherit'] });
  return new Promise((resolve) => ps.stdout.once('data', () => resolve(() => { ps.stdin.end('\n'); return new Promise((r) => ps.once('exit', r)); })));
}

function runSwap(t) {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', t.script], { encoding: 'utf8', timeout: 120000 });
  return { code: r.status, log: fs.existsSync(t.log) ? fs.readFileSync(t.log, 'utf8').trim().split(/\r?\n/) : [] };
}
const read = (t, rel) => fs.readFileSync(path.join(t.app, rel), 'utf8');

test('the swap moves the new copy in', { skip: !win }, () => {
  const t = setUp('plain');
  const r = runSwap(t);
  assert.equal(r.code, 0, r.log.join('\n'));
  assert.match(read(t, 'resources/app.asar'), /^new asar/);
  assert.equal(read(t, 'resources/only-new.txt'), 'new file');
  assert.match(r.log.at(-1), /done/);
  assert.ok(!fs.existsSync(t.stage) && !fs.existsSync(`${t.app}.old`));
  fs.rmSync(t.root, { recursive: true, force: true });
});

test('with app.asar held for reading (shared read+write), the new files go in over the old', { skip: !win }, async () => {
  const t = setUp('held');
  const release = await hold(path.join(t.app, 'resources', 'app.asar'), 'ReadWrite');
  const r = runSwap(t);
  await release();
  assert.equal(r.code, 0, r.log.join('\n'));
  assert.ok(r.log.some((l) => /couldn't be moved/.test(l)), r.log.join('\n'));
  assert.match(read(t, 'resources/app.asar'), /^new asar/);
  assert.equal(read(t, 'resources/app.asar').length, 'new asar '.length * 4000);
  assert.equal(read(t, 'locales/en-US.pak'), 'new pak');
  assert.equal(read(t, 'resources/only-new.txt'), 'new file');
  assert.match(r.log.at(-1), /done/);
  fs.rmSync(t.root, { recursive: true, force: true });
});

test('with a file held exclusively, nothing changes and the old copy stays', { skip: !win }, async () => {
  const t = setUp('locked');
  const release = await hold(path.join(t.app, 'locales', 'en-US.pak'), 'None');
  const r = runSwap(t);
  await release();
  assert.equal(r.code, 1, r.log.join('\n'));
  assert.ok(r.log.some((l) => /old copy stays/.test(l)), r.log.join('\n'));
  assert.match(read(t, 'resources/app.asar'), /^old asar/);
  assert.equal(read(t, 'locales/en-US.pak'), 'old pak');
  assert.ok(!fs.existsSync(path.join(t.app, 'resources', 'only-new.txt')));
  fs.rmSync(t.root, { recursive: true, force: true });
});

// lastTry (update.js), lifted out of the source with a stand-in temp folder: the reason a recent try at this version
// left the old copy in place, else null (another version's try, a try that went through, or one over a day old)
test('a try at this version that left the old copy says why, for a day', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'update.js'), 'utf8');
  const start = src.indexOf('function lastTry(version) {');
  // (to the function's closing brace at the start of a line; update.js has Windows line endings)
  const body = src.slice(start, start + src.slice(start).search(/\r?\n\}\r?\n/) + 3);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lasttry-'));
  const lastTry = new Function('app', 'fs', 'path', `${body}; return lastTry;`)({ getPath: () => temp }, fs, path);
  const log = path.join(temp, 'toaster-update.log');
  const write = (...lines) => fs.writeFileSync(log, lines.join('\r\n'));
  assert.equal(lastTry('0.4.22'), null); // no log yet
  write('update to D:/x/Toaster-update-0.4.22/Toaster-win32-x64 started 2026-10-27T15:23:58', '15:23:58 Toaster closed', "15:24:19 the old copy couldn't be moved (in use), so the new files go over it", "15:24:20 that didn't work either, so the old copy stays: a file was locked");
  assert.match(lastTry('0.4.22'), /^that didn't work either, so the old copy stays/);
  assert.equal(lastTry('0.4.23'), null); // another version's try
  write('update to D:/x/Toaster-update-0.4.21/Toaster-win32-x64 started 2026-10-27T15:23:58', '15:23:58 Toaster closed', "15:24:19 the old copy couldn't be moved, so it stays: in use");
  assert.match(lastTry('0.4.21'), /so it stays/); // (the wording of 0.4.21 and before)
  write('update to D:/x/Toaster-update-0.4.22/Toaster-win32-x64 started 2026-10-27T15:23:58', '15:23:58 Toaster closed', '15:24:00 swapped in; starting it', '15:24:05 done');
  assert.equal(lastTry('0.4.22'), null); // it went through
  write('update to D:/x/Toaster-update-0.4.22/Toaster-win32-x64 started 2026-10-25T15:23:58', "15:24:19 the new copy couldn't go in: no room");
  const old = (Date.now() - 25 * 3600e3) / 1000;
  fs.utimesSync(log, old, old);
  assert.equal(lastTry('0.4.22'), null); // over a day ago: offered again
  fs.rmSync(temp, { recursive: true, force: true });
});
