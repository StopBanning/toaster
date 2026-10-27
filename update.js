// Updates from GitHub (main process). When Toaster starts, the page asks (unless you turned it
// off in the help): the latest release of the repo is looked up, and a newer version is offered
// to the page, which asks you. With your yes, on Windows, in a copy unzipped somewhere it can
// write to: the release's zip is downloaded, checked against the SHA-256 GitHub lists for it,
// and unpacked beside the app; then the window closes (a recording finishes first) and a small
// PowerShell script waits for Toaster to exit, moves the old copy aside, moves the new one in,
// starts it, and removes the old copy (or, when another program holds a file open so the folder
// can't move, writes the new files over the old ones in place). Anything amiss, and nothing is
// swapped: the page offers the release's page instead, and an update that didn't go through says
// why rather than offering itself again. On a Mac (no download yet) it only offers the page. The
// request to GitHub carries nothing about you or what's playing.
const { app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');

const REPO = 'StopBanning/toaster';
const DOWNLOAD_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com']);
function isDownloadURL(value) {
  try {
    const u = new URL(value);
    // (the stand-in feed's own downloads, in tests: only while that feed is the one in use)
    if (FEED !== GITHUB_FEED) return /^http:\/\/127\.0\.0\.1:\d+\//.test(value);
    return u.protocol === 'https:' && DOWNLOAD_HOSTS.has(u.hostname) && !u.username && !u.password && !u.port;
  } catch { return false; }
}
// (a feed served on this PC stands in for GitHub's in tests: TOASTER_UPDATE_FEED, localhost only)
const GITHUB_FEED = `https://api.github.com/repos/${REPO}/releases/latest`;
const FEED = /^http:\/\/127\.0\.0\.1:\d+\//.test(process.env.TOASTER_UPDATE_FEED || '') ? process.env.TOASTER_UPDATE_FEED : GITHUB_FEED;
const STALL_MS = 60000; // a download that sends nothing for this long is given up

// '0.3.10' is newer than '0.3.9'
const newer = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

let found = null; // the release offered: what install() fetches (never a URL from the page)

// What the swap script's log (in the temp folder) says about the last try at this version: when that try ended
// with the old copy still in place, why, so the page says so rather than offering the same update again (on
// Oct 27 a file another app held made every try reopen the old copy, which looked like Toaster crashing). A day
// on, it's offered again.
function lastTry(version) {
  try {
    const file = path.join(app.getPath('temp'), 'toaster-update.log');
    if (Date.now() - fs.statSync(file).mtimeMs > 24 * 3600e3) return null;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    if (!lines[0]?.includes(`Toaster-update-${version}`)) return null;
    const fail = lines.find((l) => /old copy stays|so it stays|couldn't go in/.test(l));
    return fail ? fail.replace(/^\d\d:\d\d:\d\d /, '').slice(0, 160) : null;
  } catch { return null; }
}

// A newer release than this copy, or null: { version, current, page, canInstall, failed }.
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
  const canInstall = process.platform === 'win32' && !!zip && !!sha && isDownloadURL(found.zip) && writable(path.dirname(appDir));
  const failed = canInstall ? lastTry(version) : null;
  return { version, current, page: found.page, canInstall: canInstall && !failed, failed };
}

// can a folder be made beside the app (where the new copy is unpacked, so the swap is a rename)?
function writable(dir) {
  const probe = path.join(dir, `.toaster-write-test-${process.pid}`);
  try { fs.mkdirSync(probe); fs.rmdirSync(probe); return true; } catch { return false; }
}

// tar can take seconds on a large release; keep the main process answering the window meanwhile.
function unpack(file, stage) {
  return new Promise((resolve, reject) => {
    const tar = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', file, '-C', stage], { windowsHide: true, stdio: 'ignore' });
    tar.once('error', () => reject(new Error('could not unpack the update')));
    tar.once('close', (code) => code === 0 ? resolve() : reject(new Error('could not unpack the update')));
  });
}

// Downloads, checks and unpacks the release found, then hands over to the swap script; resolves
// once the script is waiting (the caller then closes the window), or throws with why not.
// progress(fraction) as the zip arrives.
async function install(progress) {
  const f = found;
  if (!f?.zip || !f.sha || process.platform !== 'win32') throw new Error('no download for this system');
  if (!isDownloadURL(f.zip)) throw new Error('the update download is not on GitHub');
  const parent = path.dirname(f.appDir), stage = path.join(parent, `Toaster-update-${f.version}`);
  fs.rmSync(stage, { recursive: true, force: true }); // (a stage left by an update that didn't finish)
  fs.mkdirSync(stage, { recursive: true });
  try {
  const file = path.join(stage, `Toaster-${f.version}-win-x64.zip`);
  const download = new AbortController(), hash = crypto.createHash('sha256');
  // A server that stops sending (before the headers or mid-body) would otherwise leave the download
  // waiting forever: with nothing for STALL_MS, it's given up.
  let stalled = false, watchdog;
  const alive = () => { clearTimeout(watchdog); watchdog = setTimeout(() => { stalled = true; download.abort(); }, STALL_MS); };
  try {
    alive();
    // (GitHub sends a release's download on to its CDN: net.fetch follows that itself; a 'manual'
    // redirect throws in Electron, so only the release's own URL is checked, above)
    const res = await net.fetch(f.zip, { signal: download.signal, headers: { 'User-Agent': `Toaster/${app.getVersion()}` } });
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    let got = 0;
    const meter = new Transform({ transform(chunk, encoding, done) {
      alive();
      hash.update(chunk);
      got += chunk.length;
      try { if (f.size) progress(got / f.size); done(null, chunk); } catch (err) { done(err); }
    } });
    // The pipeline observes open, write and finish errors, including while waiting for drain.
    // Destroying its readable cancels the response, so a failed disk never leaves a download running.
    // (its signal ends it on a stall even if the response body never errors)
    await pipeline(Readable.fromWeb(res.body), meter, fs.createWriteStream(file), { signal: download.signal });
  } catch (err) {
    download.abort();
    await fs.promises.rm(file, { force: true }).catch(() => {});
    throw stalled ? new Error('the download stalled') : err;
  } finally {
    clearTimeout(watchdog);
  }
  if (hash.digest('hex') !== f.sha) { fs.rmSync(stage, { recursive: true, force: true }); throw new Error("the download didn't match GitHub's checksum"); }
  // unpacked with Windows' own tar (in Windows 10 and 11), then checked: one folder, with the app
  await unpack(file, stage);
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
  } catch (err) {
    // Only the stage is ours to remove: the installed app hasn't been touched at this point.
    await fs.promises.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

// The swap, once Toaster has exited: the old copy aside, the new one in (and back if that fails),
// the new one started, then the old copy and the stage removed. Retried a few times, as Windows
// can hold a file for a moment after a program exits. When the folder still can't move, another
// program has a file in it open (on Oct 27 another app reading resources\app.asar, sharing it for
// reading and writing but not for renaming), and the new files are written over the old ones
// where they are: every file is opened first, so nothing changes unless all of them can be
// written; the old ones are copied aside first and put back if the new ones don't check out.
// What it did goes in toaster-update.log in the temp folder.
const SWAP = `Set-Content -LiteralPath $Log -Value ("update to " + $Fresh + " started " + (Get-Date -Format s))
function Note($what) { Add-Content -LiteralPath $Log -Value ((Get-Date -Format HH:mm:ss) + " " + $what) }
function Open { Start-Process -FilePath (Join-Path $App $Exe) -WorkingDirectory $App }
function Same($a, $b) { (Get-FileHash -LiteralPath $a).Hash -eq (Get-FileHash -LiteralPath $b).Hash }
function Put($from, $to) {
  $bytes = [System.IO.File]::ReadAllBytes($from)
  $s = [System.IO.File]::Open($to, 'OpenOrCreate', 'Write', 'ReadWrite')
  try { $s.SetLength(0); $s.Write($bytes, 0, $bytes.Length) } finally { $s.Close() }
}
function InPlace {
  $files = @(Get-ChildItem -LiteralPath $Fresh -Recurse -File | ForEach-Object { $_.FullName.Substring($Fresh.Length) })
  foreach ($r in $files) { if (Test-Path -LiteralPath ($App + $r)) { $s = [System.IO.File]::Open($App + $r, 'Open', 'ReadWrite', 'ReadWrite'); $s.Close() } }
  foreach ($r in $files) {
    if (Test-Path -LiteralPath ($App + $r)) { $null = New-Item -ItemType Directory -Force -Path (Split-Path ($Old + $r)); [System.IO.File]::Copy($App + $r, $Old + $r, $true) }
  }
  try {
    foreach ($r in $files) { $null = New-Item -ItemType Directory -Force -Path (Split-Path ($App + $r)); Put ($Fresh + $r) ($App + $r) }
    foreach ($r in $files) { if (-not (Same ($Fresh + $r) ($App + $r))) { throw ($r + " didn't match after copying") } }
  } catch {
    $err = $_
    foreach ($r in $files) { if (Test-Path -LiteralPath ($Old + $r)) { try { Put ($Old + $r) ($App + $r) } catch {} } }
    throw $err
  }
}
Set-Location -LiteralPath ([System.IO.Path]::GetTempPath())
try { Wait-Process -Id $Wait -Timeout 60 -ErrorAction SilentlyContinue } catch {}
Note "Toaster closed"
Start-Sleep -Milliseconds 800
if (Test-Path -LiteralPath $Old) { Remove-Item -LiteralPath $Old -Recurse -Force -ErrorAction SilentlyContinue }
$moved = $false
for ($i = 0; $i -lt 40 -and -not $moved; $i++) { try { Move-Item -LiteralPath $App -Destination $Old -ErrorAction Stop; $moved = $true } catch { $why = $_; Start-Sleep -Milliseconds 500 } }
if (-not $moved) {
  Note ("the old copy couldn't be moved (" + $why + "), so the new files go over it")
  # (the old files copied aside stay where they are on a failure, for putting things right by hand)
  try { InPlace } catch { Note ("that didn't work either, so the old copy stays: " + $_); Open; exit 1 }
  Note "copied in; starting it"
  Open
  Start-Sleep -Seconds 5
  Remove-Item -LiteralPath $Old -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue
  Note "done"
  exit 0
}
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
