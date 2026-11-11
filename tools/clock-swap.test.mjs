// The swap to the one clock (renderer/clock.js): nothing in the renderer that makes a picture may read the browser's own
// time or roll Math.random() as it draws. A frame is a function of the clock's time, and of what the engine heard, or a
// render (stream B: a take drawn again a frame at a time) and a live screen at another frame rate come out different.
//
// This reads every renderer .js file as text (with either line ending), takes the comments and the strings out, and
// finds every use of performance.now(), Date.now(), new Date(), requestAnimationFrame() and Math.random(). Each one
// must be on the list below, which says why it is not a picture's: a timeout, a network wait, a camera sensor on its
// own clock, a shader compile's settling time, a recorder. A use that is not on the list fails the test; so does a list
// entry that no longer matches anything (the list must not rot).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'fonts', 'models', 'pictures', 'thumbs', 'handheld', 'eye']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); } else if (p.endsWith('.js')) files.push(p);
  }
})(path.join(root, 'renderer'));

// The code of a source, line by line, with comments and the insides of strings blanked (a template's ${ } stays: it is
// code). One line at a time for quotes (a string does not run on over a line), across lines for block comments and templates.
function codeLines(text) {
  const out = [];
  let block = false, template = 0; // template: how deep in backticks
  const exprs = []; // for each open template: the depth of braces inside its ${ }, or -1 while in its text
  for (const line of text.split(/\r?\n/)) {
    let res = '', q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i], n = line[i + 1];
      if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
      if (q) { res += ' '; if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (template && exprs[exprs.length - 1] === -1) {
        res += ' ';
        if (c === '\\') i++;
        else if (c === '`') { template--; exprs.pop(); }
        else if (c === '$' && n === '{') { exprs[exprs.length - 1] = 0; i++; }
        continue;
      }
      if (c === '/' && n === '/') break;
      if (c === '/' && n === '*') { block = true; i++; continue; }
      if (c === '"' || c === "'") { q = c; res += ' '; continue; }
      if (c === '`') { template++; exprs.push(-1); res += ' '; continue; }
      if (template) {
        if (c === '{') exprs[exprs.length - 1]++;
        else if (c === '}') { if (exprs[exprs.length - 1] === 0) { exprs[exprs.length - 1] = -1; res += ' '; continue; } exprs[exprs.length - 1]--; }
      }
      res += c;
    }
    out.push(res);
  }
  return out;
}

const PATTERNS = {
  'Math.random': /\bMath\.random\s*\(/,
  'performance.now': /\bperformance\.now\s*\(/,
  'Date.now': /\bDate\.now\s*\(/,
  'new Date': /\bnew Date\s*\(/,
  requestAnimationFrame: /\brequestAnimationFrame\s*\(/,
};

// file -> pattern -> why it is not a picture's
const ALLOWED = {
  'renderer/clock.js': {
    'performance.now': 'the clock itself: the performance clock it is built on (and its fallback for a seed)',
    'Date.now': 'a last-resort seed when crypto is missing',
  },
  'renderer/engine.js': {
    'performance.now': 'nowSec() without a clock on the page (a test or a tool loading the file on its own): the performance clock',
  },
  'renderer/app.js': {
    'Date.now': 'the recorder\'s watchdog: how long the file has made no progress, in real time',
    'Math.random': 'which track the library\'s shuffle starts a queue on (what plays, not what is drawn)',
    requestAnimationFrame: 'the frame loop itself, and the recorder\'s wait for a frame: the screen asking to be drawn (what a drawn frame shows is the clock\'s)',
  },
  'renderer/chrome.js': { 'performance.now': 'how long its programs took to compile and settle (real time, for the driver)' },
  'renderer/scenery.js': { 'performance.now': 'how long a scene\'s program took to compile and settle (real time, for the driver)' },
  'renderer/spectro.js': { 'performance.now': 'how long its program took to compile and settle (real time, for the driver)' },
  'renderer/worlds.js': { 'performance.now': 'how long a look\'s program took to compile and settle (real time, for the driver)' },
  'renderer/spaghetti.js': { 'performance.now': 'how long the noodles took to work out (the quality governor) and how long its programs took to compile (real time)' },
  'renderer/gl-pool.js': { 'performance.now': 'how long since a layer was last on screen and since the browser was last asked for its context back (real time, for the browser: no picture reads it)' },
  'renderer/clips.js': { 'performance.now': 'the drop clips\' recorder: how long it has been recording a live stream (real time)' },
  'renderer/demo.js': { 'Math.random': 'the noise and the start of the demo beat\'s drum sounds: audio the demo plays, not a picture' },
  'renderer/handlog.js': { 'new Date': 'the hand log\'s header: when it was started' },
  'renderer/stars.js': { 'performance.now': 'the star count rolling up on the button, a UI one-shot on the page\'s own time', requestAnimationFrame: 'that same roll', 'Math.random': 'where that burst of glyphs flies, from a button\'s click: not part of a frame' },
  'renderer/tracking.js': { 'performance.now': 'the camera\'s sensors: when a hand, a face or a mask was last seen is the camera\'s own clock' },
  'renderer/visuals.js': { 'performance.now': 'the camera: when a face was last looked for or seen, and the camera\'s own frame pace (the camera is left out of the clock\'s pictures)' },
  'renderer/track-worker.js': { 'performance.now': 'a worker: it has no clock of the page\'s, and times its own model loads and retries' },
  'renderer/library-core.js': { 'Date.now': 'when a scene or a station was saved: a stamp (and the shuffle\'s dice are a parameter, Math.random by default, which a test replaces)' },
  'renderer/library-panel.js': { 'Date.now': 'when the folder was last scanned, and the panel\'s own wall clock', 'new Date': 'the panel\'s wall clock', requestAnimationFrame: 'the panel\'s own slide-in' },
  'renderer/library-source.js': { 'Date.now': 'the scan\'s pace, to let the page breathe', requestAnimationFrame: 'the scan\'s breathing space' },
  'renderer/library.js': { 'Date.now': '"3 days ago" in the library\'s rows' },
};

test('no renderer file reads the browser\'s time or rolls Math.random() except the ones listed, and each has a reason', () => {
  const found = new Map(); // `${file}|${pattern}` -> count
  const stray = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    codeLines(fs.readFileSync(file, 'utf8')).forEach((line, i) => {
      for (const [name, re] of Object.entries(PATTERNS)) {
        if (!re.test(line)) continue;
        const key = `${rel}|${name}`;
        found.set(key, (found.get(key) || 0) + 1);
        if (!ALLOWED[rel]?.[name]) stray.push(`${rel}:${i + 1}: ${name}`);
      }
    });
  }
  assert.deepEqual(stray, [], `a picture must read the clock (renderer/clock.js) and roll clock.rng(), not these:\n${stray.join('\n')}`);
  const stale = [];
  for (const [rel, names] of Object.entries(ALLOWED)) for (const name of Object.keys(names)) if (!found.has(`${rel}|${name}`)) stale.push(`${rel}: ${name}`);
  assert.deepEqual(stale, [], `a listed use is gone from the file: take it off the list\n${stale.join('\n')}`);
});

// A picture's own timers (a class that comes off 60 ms after a kick, a flash that lasts 90 ms) are on the clock, clock.after():
// a setTimeout fires in real time, which a render (a frame at a time, faster or slower than the song) is not. So no file that
// draws calls setTimeout() or setInterval(), except the ones below. The files that are not pictures (the page's shell and
// its panels, the recorder, the library, the camera's tracking, the demo) are named, so a new file is checked by default.
// (the perfect take's encoder, sound tap and render driver are the recorder's: take-encode waits for room in the encoder's queue,
// take-replay gives the page a turn between the run-up's frames, both in real time)
const NOT_PICTURES = new Set(['app', 'clips', 'take-encode', 'take-encoder', 'take-tap', 'take-tap-worklet', 'take-replay', 'clock', 'controls', 'demo', 'library', 'library-core', 'library-panel', 'library-source', 'stars', 'tape-export', 'tracking', 'track-worker', 'news', 'firstrun', 'bug-report', 'player', 'handlog', 'engine', 'program', 'codegen', 'presets', 'gestures', 'tape', 'tape-worker', 'audio-tags', 'embedded-cover', 'cover-palette', 'palette']);
const TIMERS = { setTimeout: /\bsetTimeout\s*\(/, setInterval: /\bsetInterval\s*\(/ };
const TIMERS_ALLOWED = {
  'renderer/fx.js': { setInterval: 'the machine-info readout (createSysinfo): live numbers from the machine, read in real time' },
  'renderer/visuals.js': { setTimeout: 'tries the game screens\' import again 5 s after it failed: loading code, not a picture' },
  'renderer/worlds.js': { setTimeout: 'checks again in a second whether its programs have finished compiling (real time, for the driver)' },
};

test('the pictures\' own timers are on the clock: no setTimeout() or setInterval() in a file that draws, except the ones listed', () => {
  const found = new Set(), stray = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (NOT_PICTURES.has(path.basename(file, '.js'))) continue;
    codeLines(fs.readFileSync(file, 'utf8')).forEach((line, i) => {
      for (const [name, re] of Object.entries(TIMERS)) {
        if (!re.test(line)) continue;
        found.add(`${rel}|${name}`);
        if (!TIMERS_ALLOWED[rel]?.[name]) stray.push(`${rel}:${i + 1}: ${name}`);
      }
    });
  }
  assert.deepEqual(stray, [], `a picture's timer is clock.after(seconds, fn), not these:\n${stray.join('\n')}`);
  const stale = [];
  for (const [rel, names] of Object.entries(TIMERS_ALLOWED)) for (const name of Object.keys(names)) if (!found.has(`${rel}|${name}`)) stale.push(`${rel}: ${name}`);
  assert.deepEqual(stale, [], `a listed timer is gone from the file: take it off the list\n${stale.join('\n')}`);
});

test('the CRT\'s timers, in the page\'s own file (which has timers of real time for its menus and offers), are on the clock too', () => {
  const app = fs.readFileSync(path.join(root, 'renderer/app.js'), 'utf8');
  const crt = codeLines(app.slice(app.indexOf('let crtOffT'), app.indexOf('// Fewer flashes'))).join('\n');
  assert.ok(crt.length > 800 && crt.includes('function crtKick'), 'found the CRT block');
  assert.doesNotMatch(crt, /\bsetTimeout\s*\(|\bsetInterval\s*\(/, 'the CRT\'s classes come off on the clock (clock.after)');
  assert.equal((crt.match(/clock\.after\(/g) || []).length, 4, 'power on, power off, the lettering and the kick');
});

test('the lexer sees the code and not the words: comments, strings, templates and either line ending', () => {
  const sample = ['// performance.now() in a comment', 'const a = "Math.random()"; /* Date.now()', 'still a comment */ const b = 1;', 'const c = `x ${Math.random()} y`;', "const d = 'it\\'s performance.now()';", 'const e = `a`, f = performance.now();'];
  for (const eol of ['\n', '\r\n']) {
    const lines = codeLines(sample.join(eol));
    const hits = [];
    lines.forEach((l, i) => { for (const [n, re] of Object.entries(PATTERNS)) if (re.test(l)) hits.push([i, n]); });
    assert.deepEqual(hits, [[3, 'Math.random'], [5, 'performance.now']], JSON.stringify(eol));
  }
});

test('the page starts the clock before anything that reads it, and the engine reads the clock the page has', () => {
  const app = fs.readFileSync(path.join(root, 'renderer/app.js'), 'utf8');
  const at = (s) => app.search(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(at("from './clock.js'") >= 0, 'app.js imports the clock');
  assert.ok(at("from './clock.js'") < at("from './engine.js'"), 'the clock is the first thing the page imports');
  const engine = fs.readFileSync(path.join(root, 'renderer/engine.js'), 'utf8');
  assert.match(engine, /export const nowSec = \(\) => globalThis\.clock\?\.now\(\) \?\? performance\.now\(\) \/ 1000;/);
  assert.doesNotMatch(engine, /^import /m, 'the engine stands alone: tests load it as plain text');
});

test('every look that draws from the clock imports it', () => {
  for (const f of ['visuals', 'cuts', 'fire', 'scenery', 'spectro', 'warp', 'chrome', 'orb', 'glitchorb', 'worlds', 'rings', 'card', 'codeview', 'spaghetti', 'noodles', 'fx', 'segcam']) {
    const text = fs.readFileSync(path.join(root, `renderer/${f}.js`), 'utf8');
    assert.match(text, /from '\.\/(clock|random|pulse)\.js'/, `${f}.js is on the clock`);
  }
});
