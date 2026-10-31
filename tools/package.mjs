// Packages Toaster for the OS you're on, or the one named: win32, darwin.
// The Mac build compiles the Swift helpers first (Intel and Apple silicon).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asked = (process.argv[2] || process.platform).toLowerCase();
const platform = asked === 'mac' || asked === 'osx' ? 'darwin' : asked === 'win' || asked === 'windows' ? 'win32' : asked;

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (platform !== 'darwin' && platform !== 'win32') {
  console.error(`package: ${platform} is not a Toaster target (win32 or darwin)`);
  process.exit(1);
}

// The copyright line the package carries: LegalCopyright in Toaster.exe, NSHumanReadableCopyright in the Mac app. Left
// out, Windows shows Electron's own and the Mac shows none. It is LICENSE's own line, so the two can't disagree.
const copyright = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').match(/^Copyright .+$/m)?.[0].trim();
if (!copyright) {
  console.error('package: no "Copyright ..." line in LICENSE');
  process.exit(1);
}

if (platform === 'darwin') {
  run('bash', ['helpers/mac/build.sh', 'universal']);
  buildIcon();
}

// The packager's own script, run with this Node: node_modules/.bin/electron-packager is a shell
// script, which Windows can't start without a shell (and through one, cmd mangles the ignores).
const packager = path.join(root, 'node_modules', '@electron', 'packager', 'bin', 'electron-packager.mjs');

// Only what git tracks goes in the package, plus what the build makes (node_modules, the Mac helpers' bin): notes,
// drafts, recordings, test output and other leftovers in a working copy, ignored by git or not, stay out, so a
// package built from a busy checkout holds what a clean one does. A clean checkout, as on GitHub's Macs, adds nothing.
const BUILT = ['node_modules/', 'helpers/mac/bin/', 'build/icon.icns'];
const untracked = spawnSync('git', ['ls-files', '--others', '--directory', '-z'], { cwd: root, encoding: 'utf8' });
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const untrackedIgnores = untracked.status === 0
  ? untracked.stdout.split('\0').filter((p) => p && !BUILT.some((b) => p === b || p.startsWith(b)))
    .map((p) => `--ignore=^/${escape(p.replace(/\/$/, ''))}(/|$)`)
  : [];
const ignore = [
  '--ignore=^/dist',
  '--ignore=^/tools',
  '--ignore=^/\\.claude',
  '--ignore=^/\\.github',
  '--ignore=^/prototype',
  '--ignore=^/docs',
  '--ignore=^/_checks',
  // (a Windows package never needs the Mac helpers, built or not)
  ...(platform === 'win32' ? ['--ignore=^/helpers/mac'] : []),
  ...untrackedIgnores,
  '--ignore=^/[^/]+\\.html$',
  '--ignore=^/[^/]+\\.md$',
  '--ignore=tasks-vision/wasm/vision_wasm_internal',
  '--ignore=tasks-vision/wasm/vision_wasm_nosimd_internal',
  '--ignore=tasks-vision/.*\\.map$',
  '--ignore=tasks-vision/.*\\.cjs$',
  '--ignore=tasks-vision/vision\\.d\\.ts$',
];

const args = [
  '.', 'Toaster',
  `--platform=${platform}`,
  '--out=dist',
  '--overwrite',
  `--app-copyright=${copyright}`,
  // Don't also pass --asar: this packager treats that as the whole option and then
  // ignores the sub-property. Helpers have to be real files. An asar is not a place
  // you can execute from.
  '--asar.unpackDir=helpers',
  ...ignore,
];

if (platform === 'darwin') {
  args.push('--arch=universal', '--icon=build/icon.icns', '--extend-info=build/Info.plist', '--app-category=public.app-category.music');
} else {
  args.push('--arch=x64', '--icon=build/icon.ico');
}

run(process.execPath, [packager, ...args]);

// iconutil wants a folder of sizes. Built beside the png, and not shipped on its own:
// the packager takes the .icns.
function buildIcon() {
  const src = path.join(root, 'build', 'icon.png');
  const out = path.join(root, 'build', 'icon.icns');
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-icon-'));
  const set = path.join(dir, 'icon.iconset');
  fs.mkdirSync(set);
  // The sizes iconutil accepts. The source is 256px, so the larger ones are scaled up.
  const sizes = [16, 32, 128, 256, 512];
  for (const size of sizes) {
    run('sips', ['-z', String(size), String(size), src, '--out', path.join(set, `icon_${size}x${size}.png`)]);
    run('sips', ['-z', String(size * 2), String(size * 2), src, '--out', path.join(set, `icon_${size}x${size}@2x.png`)]);
  }
  run('iconutil', ['-c', 'icns', set, '-o', out]);
  fs.rmSync(dir, { recursive: true, force: true });
}
