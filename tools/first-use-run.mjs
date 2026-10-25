// One child at a time; every cold look gets a new profile, plus a unique used shader salt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [variant = 'before', chosen = 'all', repeat = '1'] = process.argv.slice(2);
if (!['before', 'after'].includes(variant)) throw new Error('before or after');
const cases = ['dots', 'voxels', 'warp', 'spectrum', 'rain', 'scope', 'asciicam'];
if (chosen !== 'all' && chosen !== 'pixels' && !cases.includes(chosen)) throw new Error('unknown look');
const copy = path.join(root, '_checks', 'app-' + variant); fs.mkdirSync(copy, { recursive: true });
// A deterministic synthetic colour chart, delivered by Chromium's fake camera. The
// stock fake device returned black frames off-screen on this Windows build.
const fake = path.join(root, '_checks', 'fake-camera.y4m');
if (!fs.existsSync(fake)) {
  const w = 640, h = 480, frame = Buffer.alloc(w * h * 3 / 2), colours = [[255,255,255],[255,255,0],[0,255,255],[0,255,0],[255,0,255],[255,0,0],[0,0,255],[32,32,32]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r,g,b] = colours[Math.floor(x / 80)], shade = y > 300 && (x % 40 < 8 || y % 40 < 8) ? .25 : 1;
    frame[y*w+x] = 16 + (.257*r+.504*g+.098*b)*shade;
    if (!(y%2) && !(x%2)) { const k=y/2*w/2+x/2; frame[w*h+k]=128+(-.148*r-.291*g+.439*b)*shade; frame[w*h*5/4+k]=128+(.439*r-.368*g-.071*b)*shade; }
  }
  fs.writeFileSync(fake, Buffer.concat([Buffer.from('YUV4MPEG2 W640 H480 F30:1 Ip A1:1 C420jpeg\nFRAME\n'), frame]));
}
for (const d of ['renderer', 'build']) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
for (const f of ['main.js', 'preload.js', 'update.js', 'package.json']) fs.copyFileSync(path.join(root, f), path.join(copy, f));
if (variant === 'before') for (const f of ['app.js', 'dotcam.js', 'voxcam.js', 'warp.js', 'visuals.js']) fs.writeFileSync(path.join(copy, 'renderer', f), execFileSync('git', ['show', '1d4be9a:renderer/' + f], { cwd: root }));
const edit = (f, from, to) => { const p = path.join(copy, f), s = fs.readFileSync(p, 'utf8'); if (!s.includes(from)) throw new Error('missing fixture anchor: ' + from); fs.writeFileSync(p, s.replace(from, to)); };
edit('renderer/app.js', 'if (cam.on) tracker.start();', '/* model tracking is excluded from the shader measurement */');
edit('renderer/app.js', 'setTimeout(() => worlds.warm(), 30000);', '/* unrelated world warming is excluded from this check */');
edit('renderer/visuals.js', 'function track(w, h) {', 'function track(w, h) { return; // native face tracking is excluded from this check\n');
fs.appendFileSync(path.join(copy, 'renderer/app.js'), '\nwindow.firstUse={setCamFx,toggleCam,cam,fx:CAM_FX,visuals:VISUALS,field,asciiCam,dotCam,voxCam,warp};');
const settings = { visualName: 'off', updates: false, blocks: false, orb: false, glass: false, dropName: 'off', seenVersion: JSON.parse(fs.readFileSync(path.join(copy, 'package.json'))).version };
fs.writeFileSync(path.join(copy, 'renderer/boot.js'), 'localStorage.setItem("now-coding",' + JSON.stringify(JSON.stringify(settings)) + ');\n' + fs.readFileSync(path.join(copy, 'renderer/boot.js'), 'utf8'));
fs.copyFileSync(path.join(root, 'tools/first-use-probe.js'), path.join(copy, 'renderer/first-use-probe.js'));
edit('renderer/index.html', '<script src="boot.js"></script>', '<script src="first-use-probe.js"></script>\n<script src="boot.js"></script>');
if (chosen === 'pixels') {
  fs.copyFileSync(path.join(root, 'tools/first-use-pixels.js'), path.join(copy, 'renderer/first-use-pixels.js'));
  fs.copyFileSync(path.join(root, '_checks/fake-camera.png'), path.join(copy, 'renderer/fake-camera.png'));
  fs.writeFileSync(path.join(copy, 'renderer/first-use-pixels.html'), '<!doctype html><link rel="stylesheet" href="style.css"><script type="module" src="first-use-pixels.js"></script>');
}
let failed = false;
for (const look of chosen === 'all' ? cases : [chosen]) {
  const run = `${variant}-${look}-${repeat}-${Date.now()}`, dir = path.join(root, '_checks', 'runs', run); fs.mkdirSync(path.join(dir, 'temp'), { recursive: true });
  const output = path.join(root, '_checks', run + '.json'), log = fs.createWriteStream(output + '.log');
  const child = spawn(path.join(root, 'node_modules/electron/dist/electron.exe'), [path.join(root, 'tools/first-use-host.cjs'), '--remote-debugging-port=9353', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + fake, '--copy=' + copy, '--run=' + dir, '--output=' + output, '--look=' + look, ...(repeat.startsWith('pending') ? ['--hold=600'] : [])], { cwd: root, windowsHide: true, env: { ...process.env, TEMP: path.join(dir, 'temp'), TMP: path.join(dir, 'temp') }, stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(run, 'owned PID', child.pid); child.stdout.on('data', (b) => log.write(b)); child.stderr.on('data', (b) => log.write(b));
  const exit = await new Promise((r, reject) => { child.on('error', reject); child.on('close', r); }); log.end();
  console.log('exit', exit, output); if (exit) { failed = true; break; }
}
process.exitCode = failed ? 1 : 0;
