// Builds renderer/vendor/basic-pitch.mjs and copies Basic Pitch's model into renderer/models/basic-pitch: Spotify's Basic
// Pitch (npm @spotify/basic-pitch 1.0.1, Apache-2.0), the model that hears the notes in a recording, polyphonic, and the
// parts of TensorFlow.js (3.21, Apache-2.0) it runs on: the core, the WebGL and CPU backends and the graph-model loader.
// One ES module with no imports of its own, so the page and a worker can load it as it is (the npm packages import each
// other by bare names, which a page can't). Only the export uses it (renderer/tune-worker.js); nothing live does.
//
// Not a dependency of the app: the packages are installed beside, once, and this run again only to change versions.
//   npm install --no-save --prefix <dir> @spotify/basic-pitch@1.0.1 esbuild@0.24.2
//   node tools/vendor-basic-pitch.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const dir = path.resolve(process.argv[2] || '');
const nm = path.join(dir, 'node_modules');
if (!fs.existsSync(path.join(nm, '@spotify/basic-pitch'))) throw Error(`no @spotify/basic-pitch in ${nm}: see the top of this file`);
const require = createRequire(path.join(dir, 'package.json'));
const esbuild = require('esbuild');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const version = (p) => JSON.parse(fs.readFileSync(path.join(nm, p, 'package.json'), 'utf8')).version;

// (the entry: what tune-worker.js uses. toMidi.js turns the model's frames into notes; its MIDI writer, the only user of
// @tonejs/midi, isn't used, so that package is left out)
const entry = path.join(dir, 'toaster-basic-pitch-entry.mjs');
const stub = path.join(dir, 'toaster-no-midi.mjs');
fs.writeFileSync(entry, [
  "import * as tf from '@tensorflow/tfjs-core';",
  "import '@tensorflow/tfjs-backend-webgl';",
  "import '@tensorflow/tfjs-backend-cpu';",
  "import { loadGraphModel } from '@tensorflow/tfjs-converter';",
  "import { outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch/esm/toMidi.js';",
  'export { tf, loadGraphModel, outputToNotesPoly, noteFramesToTime };',
].join('\n'));
fs.writeFileSync(stub, 'export class Midi {}\n');

// (one fix, as TensorFlow.js made it later: its timer asks `!window`, which in a worker, where there is no window, throws
// instead of being true, and the model's first wait for the graphics card never comes back)
const workerSafe = {
  name: 'worker-safe-timer',
  setup(build) {
    build.onLoad({ filter: /tfjs-core[\\/]dist[\\/]platforms[\\/]platform_browser\.js$/ }, (args) => {
      const src = fs.readFileSync(args.path, 'utf8'), from = "if (!window || !env().getBool('USE_SETTIMEOUTCUSTOM'))";
      if (!src.includes(from)) throw Error('platform_browser.js has changed: check its timer for `!window` again');
      return { contents: src.replace(from, "if (typeof window === 'undefined' || !env().getBool('USE_SETTIMEOUTCUSTOM'))"), loader: 'js' };
    });
  },
};

const out = path.join(root, 'renderer/vendor/basic-pitch.mjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
const banner = `// Spotify's Basic Pitch ${version('@spotify/basic-pitch')} (its note-making, toMidi.js) and TensorFlow.js ${version('@tensorflow/tfjs-core')}
// (core, WebGL and CPU backends, converter), bundled by tools/vendor-basic-pitch.mjs. Apache License 2.0: licenses/Apache-2.0.txt.
// Copyright 2022 Spotify AB; Copyright Google LLC. See THIRD-PARTY-NOTICES.txt.`;
const result = await esbuild.build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'browser', target: 'chrome120',
  minify: true, legalComments: 'none', banner: { js: banner }, alias: { '@tonejs/midi': stub }, nodePaths: [nm],
  absWorkingDir: dir, logLevel: 'warning', metafile: true, plugins: [workerSafe],
  // (tfjs-core looks for node's modules only when it runs in node; in a page they're never asked for)
  external: ['node-fetch', 'util', 'crypto', 'fs', 'path', 'worker_threads', 'perf_hooks'],
});
fs.rmSync(entry); fs.rmSync(stub);

const models = path.join(root, 'renderer/models/basic-pitch');
fs.mkdirSync(models, { recursive: true });
for (const f of ['model.json', 'group1-shard1of1.bin']) fs.copyFileSync(path.join(nm, '@spotify/basic-pitch/model', f), path.join(models, f));
const size = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log(`${path.relative(root, out)}: ${size(out)}; model: ${size(path.join(models, 'model.json'))} + ${size(path.join(models, 'group1-shard1of1.bin'))}`);
const imports = Object.values(result.metafile.outputs)[0].imports.map((i) => i.path);
if (imports.length) console.log('imports left in the bundle (must be none a page loads):', imports.join(', '));
