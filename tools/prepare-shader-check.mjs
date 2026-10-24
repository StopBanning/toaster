import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { rolledSceneSource } from '../renderer/scenery-source.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineRef = process.env.BASELINE_REF || 'e376dba';

function readBaseline(relPath) {
  return execFileSync('git', ['show', `${baselineRef}:${relPath}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function extractScenerySources(sceneryText, spaceArtText, customRolledFn = rolledSceneSource) {
  const spaceArt = {};
  vm.runInNewContext(
    `${spaceArtText.replace(/export const SPACE_ART/g, 'const SPACE_ART')}\nglobalThis.SPACE_ART = SPACE_ART;`,
    spaceArt,
  );
  const marker = 'export function createScenery';
  const index = sceneryText.indexOf(marker);
  if (index < 0) throw new Error('createScenery marker not found');
  const body = sceneryText.slice(index);
  const rollMatch = body.match(/\[([^\]]+)\]\.includes\(name\)\s*\?\s*rolledSceneSource\(source\)\s*:\s*source/);
  const rolledList = rollMatch
    ? rollMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    : ['sharks', 'garden', 'koi', 'halloween'];

  const header = sceneryText
    .slice(0, index)
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '');
  const context = { SPACE_ART: spaceArt.SPACE_ART, rolledSceneSource: customRolledFn };
  vm.runInNewContext(
    `${header}\nglobalThis.__shaders = { VS, LIB, MAINS, PAINT, PAINT_KOI, PAINT_SHARK };`,
    context,
  );
  return { ...context.__shaders, rolledList, rolledSceneSource: customRolledFn };
}

function extractWorldSources(worldsText, worldLooksText, customRolledFn = rolledSceneSource) {
  const looksCtx = { rolledSceneSource: customRolledFn };
  const looksCode = worldLooksText
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '');
  vm.runInNewContext(`${looksCode}\nglobalThis.LOOKS = LOOKS; globalThis.onePart = onePart;`, looksCtx);

  const marker = 'export function pieces';
  const index = worldsText.indexOf(marker);
  if (index < 0) throw new Error('pieces marker not found');
  const header = worldsText
    .slice(0, index)
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '');
  const worldsCtx = { LOOKS: looksCtx.LOOKS, onePart: looksCtx.onePart, rolledSceneSource: customRolledFn };
  vm.runInNewContext(
    `${header}\nglobalThis.__worlds = { VERT, WORLD, POST, LOOKS, onePart };`,
    worldsCtx,
  );
  return worldsCtx.__worlds;
}

function buildPrograms(scenery, worlds) {
  const programs = {};
  const rolledSet = new Set(scenery.rolledList);
  for (const [name, main] of Object.entries(scenery.MAINS)) {
    const raw = scenery.LIB + main;
    programs[name] = {
      vs: scenery.VS,
      fs: rolledSet.has(name) ? scenery.rolledSceneSource(raw) : raw,
      bare: true,
    };
  }
  programs.PAINT = { vs: scenery.VS, fs: scenery.PAINT, bare: true };
  programs.PAINT_KOI = { vs: scenery.VS, fs: scenery.PAINT_KOI, bare: true };
  programs.PAINT_SHARK = { vs: scenery.VS, fs: scenery.PAINT_SHARK, bare: true };

  programs.WORLD = { vs: worlds.VERT, fs: worlds.WORLD, bare: false };
  programs.POST = { vs: worlds.VERT, fs: worlds.POST, bare: false };
  for (const look of worlds.LOOKS) {
    if (look.frag) {
      programs[`look:${look.key}`] = { vs: worlds.VERT, fs: look.whole ? look.frag : worlds.onePart(look.frag), bare: false };
    }
  }
  return programs;
}

const spaceArtBefore = readBaseline('renderer/space-art.js');
const sceneryBefore = extractScenerySources(readBaseline('renderer/scenery.js'), spaceArtBefore);
const worldsBefore = extractWorldSources(readBaseline('renderer/worlds.js'), readBaseline('renderer/worldlooks.js'));

const spaceArtAfter = fs.readFileSync(path.join(root, 'renderer/space-art.js'), 'utf8');
const sceneryAfter = extractScenerySources(fs.readFileSync(path.join(root, 'renderer/scenery.js'), 'utf8'), spaceArtAfter);
const worldsAfter = extractWorldSources(
  fs.readFileSync(path.join(root, 'renderer/worlds.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'renderer/worldlooks.js'), 'utf8'),
);

const config = {
  baselineRef,
  repeats: Math.max(1, Number(process.env.SHADER_REPEATS || 3)),
  variantOrder: (process.env.SHADER_VARIANTS || 'before,after').split(',').map((s) => s.trim()).filter(Boolean),
  names: (process.env.SHADER_NAMES || '').split(',').map((s) => s.trim()).filter(Boolean),
  variants: {
    before: buildPrograms(sceneryBefore, worldsBefore),
    after: buildPrograms(sceneryAfter, worldsAfter),
  },
};

const outDir = path.join(root, '_checks');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'shader-variants.js'), `export default ${JSON.stringify(config)};\n`);
fs.writeFileSync(path.join(outDir, 'shader.html'), '<!doctype html><meta charset="utf-8"><script type="module" src="../tools/shader-compile.js"></script>\n');
console.log('wrote _checks/shader-variants.js and _checks/shader.html');
