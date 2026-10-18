// Updates from GitHub (main process). When Toaster starts, the page asks (unless you turned it
// off in the help): the latest release of the repo is looked up, and a newer version is offered
// to the page, which asks you. With your yes, on Windows, in a copy unzipped somewhere it can
// write to: the release's zip is downloaded, checked against the SHA-256 GitHub lists for it,
// and unpacked beside the app; then the window closes (a recording finishes first) and a small
// PowerShell script waits for Toaster to exit, moves the old copy aside, moves the new one in,
// starts it, and removes the old copy. Anything amiss, and nothing is swapped: the page offers
// the release's page instead. On a Mac (no download yet) it only offers the page. The request to
// GitHub carries nothing about you or what's playing.
const { app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const REPO = 'StopBanning/toaster';
// (a feed served on this PC stands in for GitHub's in tests: TOASTER_UPDATE_FEED, localhost only)
const FEED = /^http:\/\/127\.0\.0\.1:\d+\//.test(process.env.TOASTER_UPDATE_FEED || '') ? process.env.TOASTER_UPDATE_FEED : `https://api.github.com/repos/${REPO}/releases/latest`;

// '0.3.10' is newer than '0.3.9'
const newer = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

let found = null; // the release offered: what install() fetches (never a URL from the page)

// A newer release than this copy, or null: { version, current, page, canInstall }.
async function check() {
  if (!app.isPackaged && !process.env.TOASTER_UPDATE_FEED) return null; // (run from source: git pull)
  const res = await net.fetch(FEED, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': `Toaster/${app.getVersion()}` } });
  if (!res.ok) return null;
  const rel = await res.json();
  const version = String(rel.tag_name || '').replace(/^v/, ''), current = app.getVersion();
  if (rel.draft || rel.prerelease || !/^\d+(\.\d+)*$/.test(version) || !newer(version, current)) return null;
  const zip = (rel.assets || []).find((a) => a.name === `Toaster-${version}-win-x64.zip`);
  const sha = /^sha256:([0-9a-f]{64})$/.exec(zip?.digest || '')?.[1];
  const appDir = path.dirname(process.execPath);
  found = { version, page: String(rel.html_url || `https://github.com/${REPO}/releases/latest`), zip: zip?.browser_download_url, size: zip?.size, sha, appDir };
  const canInstall = process.platform === 'win32' && !!zip && !!sha && writable(path.dirname(appDir));
  return { version, current, page: found.page, canInstall };
}

// can a folder be made beside the app (where the new copy is unpacked, so the swap is a rename)?
function writable(dir) {
  const probe = path.join(dir, `.toaster-write-test-${process.pid}`);
  try { fs.mkdirSync(probe); fs.rmdirSync(probe); return true; } catch { return false; }
}

// Downloads, checks and unpacks the release found, then hands over to the swap script; resolves
// once the script is waiting (the caller then closes the window), or throws with why not.
// progress(fraction) as the zip arrives.
async function install(progress) {
  const f = found;
  if (!f?.zip || !f.sha || process.platform !== 'win32') throw new Error('no download for this system');
  const parent = path.dirname(f.appDir), stage = path.join(parent, `Toaster-update-${f.version}`);
  fs.rmSync(stage, { recursive: true, force: true }); // (a stage left by an update that didn't finish)
  fs.mkdirSync(stage, { recursive: true });
  const file = path.join(stage, `Toaster-${f.version}-win-x64.zip`);
  const res = await net.fetch(f.zip, { headers: { 'User-Agent': `Toaster/${app.getVersion()}` } });
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const hash = crypto.createHash('sha256'), out = fs.createWriteStream(file);
  let got = 0;
  for await (const chunk of res.body) {
    hash.update(chunk);
    got += chunk.length;
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    if (f.size) progress(got / f.size);
  }
  await new Promise((r, j) => out.end((err) => (err ? j(err) : r())));
  if (hash.digest('hex') !== f.sha) { fs.rmSync(stage, { recursive: true, force: true }); throw new Error("the download didn't match GitHub's checksum"); }
  // unpacked with Windows' own tar (in Windows 10 and 11), then checked: one folder, with the app
  const tar = spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', file, '-C', stage], { windowsHide: true });
  if (tar.status !== 0) throw new Error('could not unpack the update');
  fs.rmSync(file, { force: true });
  const dirs = fs.readdirSync(stage, { withFileTypes: true }).filter((d) => d.isDirectory());
  const exe = path.basename(process.execPath);
  const fresh = dirs.length === 1 ? path.join(stage, dirs[0].name) : null;
  if (!fresh || !fs.existsSync(path.join(fresh, exe)) || !fs.existsSync(path.join(fresh, 'resources', 'app.asar'))) throw new Error('the update looked wrong');
  // (the paths go in the script itself, PowerShell-quoted, so none has to survive a command line)
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const log = path.join(app.getPath('temp'), 'toaster-update.log');
  const script = path.join(stage, 'swap.ps1');
  fs.writeFileSync(script, [`$Wait = ${process.pid}`, `$App = ${q(f.appDir)}`, `$Fresh = ${q(fresh)}`, `$Old = ${q(`${f.appDir}.old`)}`, `$Exe = ${q(exe)}`, `$Stage = ${q(stage)}`, `$Log = ${q(log)}`, SWAP].join('\r\n'), 'utf8');
  // Started through cmd's start: a PowerShell Electron starts itself dies with it when the window
  // closes, and one started detached gets no console and never runs (tried both, Oct 17).
  const cmd = `"start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${script}""`;
  // (from the temp folder: a process whose working folder is the app's keeps it from being moved,
  // and Toaster opened from Explorer works in its own folder)
  spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', cmd], { cwd: app.getPath('temp'), detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
}

// The swap, once Toaster has exited: the old copy aside, the new one in (and back if that fails),
// the new one started, then the old copy and the stage removed. Retried a few times, as Windows
// can hold a file for a moment after a program exits. What it did goes in toaster-update.log in
// the temp folder.
const SWAP = `Set-Content -LiteralPath $Log -Value ("update to " + $Fresh + " started " + (Get-Date -Format s))
function Note($what) { Add-Content -LiteralPath $Log -Value ((Get-Date -Format HH:mm:ss) + " " + $what) }
function Open { Start-Process -FilePath (Join-Path $App $Exe) -WorkingDirectory $App }
Set-Location -LiteralPath ([System.IO.Path]::GetTempPath())
try { Wait-Process -Id $Wait -Timeout 60 -ErrorAction SilentlyContinue } catch {}
Note "Toaster closed"
Start-Sleep -Milliseconds 800
if (Test-Path -LiteralPath $Old) { Remove-Item -LiteralPath $Old -Recurse -Force -ErrorAction SilentlyContinue }
$moved = $false
for ($i = 0; $i -lt 40 -and -not $moved; $i++) { try { Move-Item -LiteralPath $App -Destination $Old -ErrorAction Stop; $moved = $true } catch { $why = $_; Start-Sleep -Milliseconds 500 } }
if (-not $moved) { Note ("the old copy couldn't be moved, so it stays: " + $why); Open; exit 1 }
try { Move-Item -LiteralPath $Fresh -Destination $App -ErrorAction Stop }
catch { Note ("the new copy couldn't go in: " + $_); Move-Item -LiteralPath $Old -Destination $App -ErrorAction SilentlyContinue; Open; exit 1 }
Note "swapped in; starting it"
Open
Start-Sleep -Seconds 5
Remove-Item -LiteralPath $Old -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue
Note "done"
`;

module.exports = { check, install, newer, page: () => found?.page || `https://github.com/${REPO}/releases/latest` };
