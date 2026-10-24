import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_checks');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'visual.html'), '<!doctype html><style>:root{--font:monospace}body{margin:0;background:#000}</style><script type="module" src="../tools/visual-check.js"></script>');
fs.writeFileSync(path.join(out, 'sea.html'), '<!doctype html><style>:root{--font:monospace}body{margin:0;background:#000}</style><script>window.onlySea=true;</script><script type="module" src="../tools/visual-check.js"></script>');
for (const variant of ['before', 'after']) {
  const dir = path.join(out, variant, 'renderer'); fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(root, 'renderer'), dir, { recursive: true });
  if (variant === 'before') for (const f of ['scenery.js', 'worlds.js', 'worldlooks.js']) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['show', 'd039ba0:renderer/' + f], { cwd: root }));
  for (const f of ['scenery.js', 'worlds.js']) {
    let s = fs.readFileSync(path.join(dir, f), 'utf8');
    // Only the requested shaders are warmed. Both variants retain the same shader strings,
    // simulation and draw path; skipping unrelated warm-up keeps the comparison quiet.
    if (f === 'scenery.js') s = s.replace('if (background && !busy &&', 'if (false && background && !busy &&');
    else {
      s = s.replace('let looksStarted = 0;', 'let looksStarted = LOOKS.length;').replace('      frame++;', '      frame = 17;');
      if (variant === 'before') s = s.replace('blueNoise());', 'profileNoise());') + '\nfunction profileNoise(){const at=performance.now();const bytes=blueNoise();(window.noiseTimes ||= []).push({at,ms:performance.now()-at});return bytes;}';
    }
    fs.writeFileSync(path.join(dir, f), s);
  }
}
