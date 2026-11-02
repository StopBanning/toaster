// The Mac side of Toaster's self-update (update.js's install() calls it on a Mac): which app this copy is and whether it can
// be replaced where it stands, the release's Mac zip unpacked and checked, and the small shell script that swaps the new copy
// in once Toaster has closed. Plain functions with no Electron in them, so the tests can run all of it on folders built under
// scratch. (Loaded when it's first needed, as the other helpers are: the test copies of the app don't carry helpers/.)
//
// The new copy is unpacked beside the old one (in a hidden folder next to Toaster.app), so every step of the swap is a rename
// within one folder, which either happens or doesn't, whichever disk Toaster is on. In the order it happens (swapScript below
// has the text):
//   1. Toaster closes (a recording finishes first) and the script, which has been waiting for its process, goes on;
//   2. the old copy is renamed aside, beside itself, and the new one renamed into its place;
//   3. the new one's version is read back from where it now stands, and Toaster is started from there;
//   4. the old copy goes to the Trash (deleted instead where the Trash can't be written), and the hidden folder is removed.
// Anything wrong before step 4 puts the old copy back and starts it again, and the log (the one update.js reads on the next
// start) says why, so the page can say the update didn't go through instead of offering it again. The log's last line is
// "done" only once the new copy really is in place.
//
// How it's done, and why: no part of it is Electron's own updater (that wants an app signed by a developer, and Toaster is signed
// ad hoc), and the zip is unpacked by ditto, the tool that made it: it keeps the symbolic links inside Electron's frameworks, the
// permissions and the extended attributes that the app's signature covers, which other tools can drop.
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');

const DITTO = '/usr/bin/ditto';
const PLUTIL = '/usr/bin/plutil';
const SH = '/bin/sh';
const OPEN = '/usr/bin/open';
const STAGE_PREFIX = '.Toaster-update-'; // the hidden folder the new copy is unpacked into, beside the old one
const ASIDE_PREFIX = '.Toaster-old-'; // where the old copy waits during the swap (a sibling of the app, outside the stage)

const zipName = (version) => `Toaster-${version}-mac-universal.zip`;
const stageOf = (bundle, version) => path.join(path.dirname(bundle), `${STAGE_PREFIX}${version}`);
const asideOf = (bundle, pid) => path.join(path.dirname(bundle), `${ASIDE_PREFIX}${pid}`);

// The .app the running program is in: its path from the executable's (<app>/Contents/MacOS/<name>), or null (run from
// source, there is no app of ours to replace).
function bundleOf(exe) {
  return /^(\/.+\.app)\/Contents\/MacOS\/[^/]+$/.exec(String(exe))?.[1] || null;
}

// The place a Mac runs a quarantined app from when it was opened straight from Downloads, the Desktop or a disk image, until
// it's moved: a read-only copy under .../AppTranslocation/<id>/d/, which can't replace itself.
const TRANSLOCATED = /\/AppTranslocation\//;

const WHY_TRANSLOCATED = "Toaster is running from a temporary read-only place your Mac made when it was opened from Downloads or a disk image, so it can't replace itself: move Toaster into Applications and open it from there";
const WHY_READ_ONLY = "Toaster can't replace itself where it is, because its folder isn't one you can change: move Toaster into Applications, or another folder you can change, and open it from there";
const WHY_NOT_AN_APP = "Toaster isn't running from an app, so it can't replace itself";

// can this user rename things in the folder (the new copy goes in by rename)?
function writable(dir) {
  try { fs.accessSync(dir, fs.constants.W_OK | fs.constants.X_OK); return true; } catch { return false; }
}

// This copy's app and what stops it replacing itself there: { bundle, problem }. bundle is the app's real path (null when
// the program isn't in an app); problem is null when it can be replaced, else a clause saying why not and what to do, which
// the page shows as it is. Both the app and its folder must be ones this user can change: the folder for the renames, the
// app itself because a folder moved to another folder (the old copy, to the Trash) must be writable too.
function where(exe) {
  const found = bundleOf(exe);
  if (!found) return { bundle: null, problem: WHY_NOT_AN_APP };
  if (TRANSLOCATED.test(found)) return { bundle: found, problem: WHY_TRANSLOCATED };
  let bundle;
  try { bundle = fs.realpathSync(found); } catch { return { bundle: found, problem: WHY_NOT_AN_APP }; }
  if (TRANSLOCATED.test(bundle)) return { bundle, problem: WHY_TRANSLOCATED };
  if (!writable(path.dirname(bundle)) || !writable(bundle)) return { bundle, problem: WHY_READ_ONLY };
  return { bundle, problem: null };
}

// Stages an update that didn't finish left beside the app, of any version (each is hundreds of megabytes, and a stage is only
// ever this update's own): removed, as far as they can be.
function clearStages(bundle) {
  const dir = path.dirname(bundle);
  let names = [];
  try { names = fs.readdirSync(dir).filter((name) => name.startsWith(STAGE_PREFIX)); } catch { /* the stage's own making says if the folder is no good */ }
  for (const name of names) {
    try { fs.rmSync(path.join(dir, name), { recursive: true, force: true }); } catch { /* the same */ }
  }
}

// The zip unpacked into dest by ditto (it can take seconds on a large release; the main process keeps answering the window
// meanwhile). ditto -x -k reads the zip the release's workflow wrote with ditto -c -k.
function unpack(zip, dest) {
  return new Promise((resolve, reject) => {
    const ditto = spawn(DITTO, ['-x', '-k', zip, dest], { stdio: 'ignore' });
    ditto.once('error', () => reject(new Error('could not unpack the update')));
    ditto.once('close', (code) => (code === 0 ? resolve() : reject(new Error('could not unpack the update'))));
  });
}

// A string out of an app's Info.plist (the plist may be XML or binary: plutil reads both), or '' when it isn't there.
function plistValue(bundle, key) {
  return new Promise((resolve) => {
    execFile(PLUTIL, ['-extract', key, 'raw', '-o', '-', path.join(bundle, 'Contents', 'Info.plist')], (err, out) => resolve(err ? '' : String(out).trim()));
  });
}

// The unpacked app, once it checks out: Toaster.app in the stage, with the program this one is running (an Electron run from
// source has another name, so a copy run that way is never replaced) and its app.asar, and the version the release says.
// Returns its path, or throws the reason.
async function unpackedBundle(stage, version, exe) {
  const fresh = path.join(stage, 'Toaster.app');
  const ok = (() => {
    try {
      if (!fs.lstatSync(fresh).isDirectory()) return false;
      fs.accessSync(path.join(fresh, 'Contents', 'MacOS', path.basename(exe)), fs.constants.X_OK);
      // (app.asar is looked for in its folder's listing, not by a call on its path: inside Electron, fs reads a path that ends in
      // .asar as the archive's insides, a folder, and a stat of the file itself says it isn't one; found by a run in Electron)
      return fs.readdirSync(path.join(fresh, 'Contents', 'Resources'), { withFileTypes: true }).some((d) => d.name === 'app.asar' && d.isFile());
    } catch { return false; }
  })();
  if (!ok) throw new Error('the update looked wrong');
  const have = await plistValue(fresh, 'CFBundleShortVersionString');
  if (have !== version) throw new Error(`the update looked wrong (it says Toaster ${have || 'with no version'}, not ${version})`);
  return fresh;
}

// A value in a sh script, single-quoted so that nothing in it (spaces, quotes, $, backticks) means anything to the shell.
const sq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// The script's text. Every value is filled in at the top, quoted, so none has to survive a command line. They are checked
// here because the script removes folders (only ones named like the stage's and the aside's: it refuses any other).
//   pid       the Toaster process to wait for
//   app       the old copy (the running .app), fresh the new Toaster.app inside stage, aside where the old copy waits
//   trash     the Trash folder, keep the name the old copy goes by there ('Toaster 0.4.29': ' 2', ' 3' follow when it's taken)
//   version   what the new copy must say it is, where it stands, before it's kept
//   log       the log update.js reads (the first line names the stage, which is how it knows whose try it was)
//   open      the program that starts an app (/usr/bin/open; the tests give a stand-in that notes what it was asked)
//   patience  how many half seconds to wait for Toaster to close (it's left alone, and the update given up, after that)
//   settle    seconds to wait once it has closed, for the system to let go of it
function swapScript({ pid, app, fresh, stage, aside, trash, keep, version, log, open = OPEN, patience = 120, settle = 1 }) {
  const absolute = (p) => typeof p === 'string' && p.startsWith('/') && p.length > 1;
  if (!Number.isInteger(pid) || pid < 1) throw new Error('swapScript: pid');
  if (![app, fresh, stage, aside, trash, log, open].every(absolute) || !app.endsWith('.app') || !fresh.startsWith(`${stage}/`)) throw new Error('swapScript: paths');
  if (!path.basename(stage).startsWith(STAGE_PREFIX) || !path.basename(aside).startsWith(ASIDE_PREFIX)) throw new Error('swapScript: folders');
  if (!/^\d+(\.\d+)*$/.test(version) || !keep || keep.includes('/')) throw new Error('swapScript: version');
  if (!Number.isInteger(patience) || patience < 0 || !(settle >= 0)) throw new Error('swapScript: waits');
  return [
    `PID=${sq(pid)}`, `APP=${sq(app)}`, `FRESH=${sq(fresh)}`, `STAGE=${sq(stage)}`, `ASIDE=${sq(aside)}`, `TRASH=${sq(trash)}`,
    `KEEP=${sq(keep)}`, `WANT=${sq(version)}`, `LOG=${sq(log)}`, `OPEN=${sq(open)}`, `PATIENCE=${sq(patience)}`, `SETTLE=${sq(settle)}`,
    SWAP,
  ].join('\n');
}

// (the steps are in the header's list; each one that fails says what failed and puts the old copy back, never "done")
const SWAP = `# Toaster's update on a Mac, run once Toaster has closed (helpers/mac-update.cjs wrote it).
echo "update to $FRESH started $(date +%Y-%m-%dT%H:%M:%S)" > "$LOG"
note() { echo "$(date +%H:%M:%S) $1" >> "$LOG"; }
# (a failed command's reason in a few words: what it said after its last colon)
said() { printf '%s' "$1" | sed 's/^.*: //'; }
# (only a folder this update made is ever removed)
drop() {
  case "$1" in
    /?*/${STAGE_PREFIX}* | /?*/${ASIDE_PREFIX}*) rm -rf "$1" 2>/dev/null ;;
    *) note "it won't remove $1" ;;
  esac
}
# (a start that fails is noted, never fatal; -n so that it is the program at this path that is started, never one of the same
# name that is still closing, which the system would bring to the front instead)
launch() { err=$("$OPEN" -n "$APP" 2>&1) || note "it couldn't be started ($(said "$err"))"; }
# the old copy back where it was (the new one, if it got that far, to the stage), started again, and the stage removed
put_back() {
  if [ -e "$APP" ]; then mv "$APP" "$STAGE/rejected" 2>/dev/null; fi
  mv "$ASIDE" "$APP" 2>/dev/null || note "the old copy couldn't be put back: it is at $ASIDE"
  drop "$STAGE"
  launch
}
# (not from inside the app: a working folder in it would be one more thing holding it)
cd / || exit 1
n=0
while kill -0 "$PID" 2>/dev/null; do
  if [ "$n" -ge "$PATIENCE" ]; then
    note "Toaster didn't close, so the old copy stays"
    drop "$STAGE"
    exit 1
  fi
  n=$((n + 1))
  sleep 0.5
done
note "Toaster closed"
sleep "$SETTLE"
if [ ! -d "$APP" ]; then
  note "the old copy isn't at $APP any more, so nothing was changed"
  drop "$STAGE"
  exit 1
fi
if [ ! -d "$FRESH" ]; then
  note "the new copy isn't there, so the old copy stays"
  launch
  exit 1
fi
if [ -e "$ASIDE" ]; then
  note "something is already at $ASIDE, so the old copy stays"
  drop "$STAGE"
  launch
  exit 1
fi
if ! err=$(mv "$APP" "$ASIDE" 2>&1); then
  note "the old copy couldn't be moved aside ($(said "$err")), so the old copy stays"
  drop "$STAGE"
  launch
  exit 1
fi
if [ -e "$APP" ]; then
  st=1
  err="something else is in its place"
else
  err=$(mv "$FRESH" "$APP" 2>&1)
  st=$?
fi
if [ "$st" -ne 0 ]; then
  note "the new copy couldn't go in ($(said "$err")), so the old copy stays"
  put_back
  exit 1
fi
have=$(/usr/bin/plutil -extract CFBundleShortVersionString raw -o - "$APP/Contents/Info.plist" 2>/dev/null)
if [ "$have" != "$WANT" ]; then
  [ -n "$have" ] || have="no version"
  note "the new copy didn't check out where it stands (it says $have), so the old copy stays"
  put_back
  exit 1
fi
note "swapped in; starting it"
launch
dest="$TRASH/$KEEP.app"
n=1
while [ -e "$dest" ] || [ -L "$dest" ]; do
  n=$((n + 1))
  dest="$TRASH/$KEEP $n.app"
done
if [ -d "$TRASH" ] && mv "$ASIDE" "$dest" 2>/dev/null; then
  note "the old copy is in the Trash"
else
  drop "$ASIDE"
  if [ -e "$ASIDE" ]; then note "the old copy couldn't go to the Trash or be deleted: it is at $ASIDE"; else note "the old copy couldn't go to the Trash, so it was deleted"; fi
fi
drop "$STAGE"
note "done"
exit 0
`;

// Writes the script into the stage and starts it, detached from Toaster (it has to outlive it). Resolves once the script is
// running, and it waits for the process it was given to exit; or throws, with nothing started.
async function startSwap(opts) {
  const script = path.join(opts.stage, 'swap.sh');
  fs.writeFileSync(script, swapScript(opts), { mode: 0o700 });
  // (from the temp folder: a process whose working folder is the app's keeps it from being moved)
  const child = spawn(SH, [script], { cwd: path.dirname(opts.log), detached: true, stdio: 'ignore' });
  await new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error("the update couldn't be started")));
    child.once('spawn', resolve);
  });
  child.unref();
}

module.exports = { zipName, stageOf, asideOf, bundleOf, where, clearStages, unpack, plistValue, unpackedBundle, swapScript, startSwap, STAGE_PREFIX, ASIDE_PREFIX };
