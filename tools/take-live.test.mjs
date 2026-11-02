// The perfect take in the app, whole (stream B): main.js, preload.js and app.js together on a hidden, muted test copy with a
// settings folder of its own, driven by take-live-check.mjs. The perfect copy turned on, the demo beat playing, the tap
// gathers a run-up; a take begins and ends 4 s later; main draws it again and writes "toaster <stamp> perfect.mp4" into the
// copy's own Videos/Toaster (never yours), and the page says it saved it. The sources: the setting is saved and off by
// default, Ctrl+K turns it on and off, a test copy's files stay in its folder, a reload or a quit ends a render.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), main = read('main.js'), preload = read('preload.js');

test('the setting and the wiring: saved, off by default, Ctrl+K, the tap before M\'s delay, the files in a test copy\'s own folder', () => {
  assert.match(app, /const SAVED = \['perfectCopy', /);
  assert.match(app, /state\.perfectCopy = state\.perfectCopy === true;/, 'off unless turned on');
  assert.match(app, /\{ id: 'perfect-copy', name: `perfect copy: \$\{state\.perfectCopy \? 'off' : 'on'\}/);
  assert.match(app, /  mr\.start\(1000\);\n  takeBegin\(\)\.catch\(/, 'the take begins as the recorder starts');
  assert.match(app, /    takeEnd\(file && !file\.endsWith\('\.part'\)\);\n/, 'and ends with the recording, drawn only if the recording was kept');
  assert.match(app, /  tapRecording\(\);\n  clips\.retap\(\);\n  takeFollow\(\);\n/, 'the tap follows a change of source');
  assert.match(main, /const videosDir = \(\) => \(testData \? path\.join\(path\.resolve\(testData\), 'Videos', 'Toaster'\) : path\.join\(app\.getPath\('videos'\), 'Toaster'\)\);/);
  assert.match(main, /win\.webContents\.on\('did-start-loading', \(\) => takeDrop\('the page reloaded'\)\);/);
  assert.match(main, /win\.on\('closed', \(\) => \{ win = null; widget\?\.close\(\); takeDrop\('the window closed'\); \}\);/);
  assert.match(main, /app\.on\('before-quit', \(\) => dropTakes\('Toaster closed'\)\);/);
  assert.match(main, /k\.queue = k\.queue\.then\(/, 'one copy at a time, in order');
  assert.match(app, /\.then\(\(drawing\) => \{ if \(drawing\) flashStatus\('making a perfect copy…'\); \}\)/, 'said only once main has a take to draw (A3, after a take that failed)');
  assert.match(app, /  takeRec\.beginning = true;\n  try \{ takeRec\.id = await window\.nc\.takeBegin\(meta\); \}\n  catch \(err\) \{ return takeSkip\(takeSaid\(err\)\); \}[^\n]*\n  finally \{ takeRec\.beginning = false; \}\n  const blocks = takeRec\.blocks;\n  takeRec\.blocks = \[\];\n  for \(const b of blocks\) window\.nc\.takeSound\(takeRec\.id, b\.data\);/, 'the blocks that come while main answers go with the run-up, in order (B6)');
  assert.match(app, /takeRec\.blocks\.push\(b\);\n  if \(takeRec\.beginning\) return;/, 'and none is trimmed meanwhile');
  assert.match(main, /try \{ takeKit\.store\.sound\(id, data\); \} catch \(err\) \{\n      takeKit\.stems\.delete\(id\);\n      try \{ takeKit\.store\.end\(id\); takeKit\.store\.remove\(id\); \} catch \{ \/\* gone \*\/ \}\n      toPage\('take:failed', err\.message\);/, 'the first sound that cannot be kept ends the take, said once (A3)');
  assert.match(app, /  takeEnd\(false\); \/\/ \(no recording, no perfect copy: the take is dropped\)/, 'a failed recording drops its take');
  assert.match(main, /const k = takes\(\), id = k\.store\.begin\(k\.checkMeta\(meta\)\);/, 'what the page says is checked before it is kept');
  for (const name of ['takeBegin', 'takeSound', 'takeEnd', 'takeCancel', 'onTakeProgress', 'onTakeDone', 'onTakeFailed']) assert.ok(preload.includes(`  ${name}: `), name);
});

let electron = null;
try { electron = createRequire(import.meta.url)('electron'); if (!fs.existsSync(electron)) electron = null; } catch { /* no Electron here */ }
const tool = (name) => { const bin = process.env[name.toUpperCase()] || name; return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0 ? bin : null; };
const ffprobe = tool('ffprobe');

test('for real: a take made in the app comes out as "<recording> perfect.mp4" in the test copy\'s own folder', { skip: !electron && 'no Electron here', timeout: 300000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-live-'));
  try {
    const r = spawnSync(process.execPath, [path.join(here, 'take-live-check.mjs'), dir, String(9361 + (process.pid % 30))], { encoding: 'utf8', timeout: 280000 });
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('{"result"'));
    assert.ok(line, `no result: ${r.stdout}\n${r.stderr}`.slice(0, 2000));
    const { result: x } = JSON.parse(line);
    assert.equal(x.error, undefined, x.error);
    assert.equal(x.before.tapping, true, 'the tap runs with the perfect copy on and a source playing');
    assert.ok(x.before.runup >= 5, `a run-up gathered (${x.before.runup} s)`);
    assert.match(x.during.id, /^take-\d{8}-\d{6}-[0-9a-f]{6}$/);
    assert.ok(x.file, `a perfect copy written: ${JSON.stringify(x.files)} ${x.notice}`);
    assert.match(path.basename(x.file), /^toaster \d{4}-\d\d-\d\d \d\d\.\d\d\.\d\d perfect\.mp4$/);
    assert.ok(x.file.startsWith(path.join(dir, 'profile', 'Videos', 'Toaster')), 'in the test copy\'s own folder');
    assert.match(x.notice, /^saved toaster .* perfect\.mp4/);
    assert.match(x.second.id, /^take-/, 'a second take began straight after the first');
    assert.ok(x.second.file && x.second.file !== x.file, 'and its copy was made too, after the first\'s');
    if (ffprobe) {
      const n = +spawnSync(ffprobe, ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', x.file], { encoding: 'utf8' }).stdout.trim();
      assert.ok(n >= 115 && n <= 135, `about 4 s at 30 fps: ${n} frames`);
      const a = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', x.file], { encoding: 'utf8' }).stdout.trim();
      assert.ok(['aac', 'opus'].includes(a), `with its sound (${a})`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
