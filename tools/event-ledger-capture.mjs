import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const outputArg = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const dir = outputArg ? path.resolve(outputArg) : path.join(root, '_checks/event-ledger'); fs.mkdirSync(dir, { recursive: true });
const checks = fs.readFileSync(path.join(root, 'tools/checks.js'), 'utf8');
const names = [...checks.slice(checks.indexOf('  const SONGS = {'), checks.indexOf('  // Plays a song')).matchAll(/^    (\w+)(?:,|:)/gm)].map((m) => m[1]);
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const gt = process.argv.find((a) => a.startsWith('--gt='))?.slice(5);
const limit = Number(process.argv.find((a) => a.startsWith('--seconds='))?.slice(10) ?? 45);
if (!(limit > 0 && limit <= 180)) throw Error('--seconds must be in (0, 180]');
const jobs = names.filter((k) => !only || only.includes(k)).map((key) => ({ key, seconds: key === 'change' ? 85 : 45 }));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inputs = [], excluded = [];
if (gt) {
  const manifest = JSON.parse(fs.readFileSync(path.join(gt, 'input-manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
  for (const row of manifest.songs) {
    if (only && !only.includes(row.key)) continue;
    if (['funkytown','showmelove','upsidedown'].includes(row.key)) { excluded.push({key:row.key,reason:'unreadable audio excluded by bar-one handoff'}); continue; }
    const truthPath = path.join(gt, 'truth', row.key + '.json');
    if (!fs.existsSync(truthPath) || !fs.existsSync(row.audio)) {
      excluded.push({ key: row.key, reason: 'missing reference or original audio', audio: row.audio }); continue;
    }
    const truth = JSON.parse(fs.readFileSync(truthPath));
    const actual = hash(row.audio);
    if (actual !== row.audio_sha256 || actual !== truth.source_sha256) {
      excluded.push({ key: row.key, reason: 'audio checksum mismatch', actual }); continue;
    }
    const key = 'silver-' + row.key, from = 0, seconds = Math.min(limit, truth.duration);
    jobs.push({ key, audio: row.audio, from, seconds });
    // A local immutable reference copy plus hashes preserves exactly what this baseline used.
    fs.copyFileSync(truthPath, path.join(dir, key + '-reference.json'));
    inputs.push({ key, source: row.audio, audioSHA256: actual, truthPath, truthSHA256: hash(truthPath), from, seconds });
  }
}
fs.writeFileSync(path.join(dir, 'inputs.json'), JSON.stringify(inputs, null, 2));
fs.writeFileSync(path.join(dir, 'excluded.json'), JSON.stringify(excluded, null, 2));
console.log('jobs', jobs.length, 'excluded', excluded.length);
for (const job of jobs) { job.parity = process.argv.includes('--parity'); job.resume = process.argv.includes('--resume'); }
fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(jobs, null, 2));
const electron = createRequire(import.meta.url)('electron');
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
// Child Chromium processes inherit the two-processor affinity and below-normal priority.
const cmd = `$benchProcess = [Diagnostics.Process]::GetCurrentProcess(); $benchProcess.ProcessorAffinity = [IntPtr]3; $benchProcess.PriorityClass = 'BelowNormal'; & ${quote(electron)} ${quote(path.join(root, 'tools/event-ledger-host.cjs'))} | Out-Default; exit $LASTEXITCODE`;
const env = { ...process.env, UV_THREADPOOL_SIZE: '2', OMP_NUM_THREADS: '2', EVENT_LEDGER_DIR: dir }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { cwd: root, env, windowsHide: true, stdio: 'inherit' });
process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
