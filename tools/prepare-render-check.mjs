import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineRef = process.env.BASELINE_REF || 'e376dba';
const checkRoot = path.join(root, '_checks', 'render-check');

function readBaseline(relPath) {
  return execFileSync('git', ['show', `${baselineRef}:${relPath}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function patchScenery(source) {
  return source
    .replace('if (background && !busy &&', 'if (false && background && !busy &&')
    .replace("const pondPx = scene === 'koi' &&", "const pondPx = !window.forceCells && scene === 'koi' &&");
}

function patchWorlds(source) {
  return source
    .replace('let looksStarted = 0;', 'let looksStarted = LOOKS.length;')
    .replace('      frame++;', '      frame = 17;');
}

const relFiles = [
  'renderer/scenery.js',
  'renderer/scenery-source.js',
  'renderer/space-art.js',
  'renderer/worlds.js',
  'renderer/worldlooks.js',
  'renderer/world-noise.js',
  'renderer/visuals.js',
];

for (const variant of ['before', 'after']) {
  const dir = path.join(checkRoot, variant);
  for (const rel of relFiles) {
    let text = variant === 'before'
      ? readBaseline(rel)
      : fs.readFileSync(path.join(root, rel), 'utf8');
    if (rel === 'renderer/scenery.js') text = patchScenery(text);
    if (rel === 'renderer/worlds.js') {
      text = patchWorlds(text);
      // RAMP is a fixed glyph string. visuals.js also imports the engine, which this fixture does not copy.
      text = text.replace("import { RAMP } from './visuals.js';", "const RAMP = ' .:-=+*#%@';");
    }
    const out = path.join(dir, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
  }
}

const renderConfig = {
  mode: process.env.RENDER_MODE || 'both',
  onlyScenes: (process.env.RENDER_SCENES || '').split(',').map((s) => s.trim()).filter(Boolean),
  onlyLooks: (process.env.RENDER_LOOKS || '').split(',').map((s) => s.trim()).filter(Boolean),
  onlyWorlds: (process.env.RENDER_WORLDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  pixelsOnly: process.env.PIXELS_ONLY === '1',
  noFallback: process.env.NO_FALLBACK === '1',
  batches: Math.max(1, Number(process.env.RENDER_BATCHES || 7)),
};

fs.mkdirSync(checkRoot, { recursive: true });
fs.writeFileSync(path.join(checkRoot, 'render-config.js'), `export default ${JSON.stringify(renderConfig)};\n`);
fs.writeFileSync(
  path.join(checkRoot, 'render.html'),
  '<!doctype html><meta charset="utf-8"><style>:root{--font:monospace}body{margin:0;background:#000}</style><script type="module" src="../../tools/shader-render.js"></script>\n',
);
console.log('prepared the render check in _checks/render-check (before, after, render-config.js, render.html)');
