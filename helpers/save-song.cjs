// Song export (X), one folder per song (Colin, Nov 24: "make it as easy for the user as possible so we don't keep running into these issues": tuni and
// samir opened the loose sketch beside the rebuilt folder and took it for the song). The song's folder holds, at its top, what to open (rebuilt.wav, how it
// sounds; song.strudel.js, the rebuilt code O opens; the sounds and strudel.json it needs: helpers/save-rebuilt.cjs), and, in one subfolder, Toaster's notes: the MIDI
// file and the sketch's Strudel code on stand-in drum-machine sounds, with a line of README that says so. When the rebuild can't be made only the notes are there,
// and their README says that.
const fs = require('node:fs');
const path = require('node:path');

const NOTES = 'notes (stand-in sounds)';
const README = 'README.txt';
const ABOUT = "Toaster's notes for this song, on stand-in drum-machine sounds: editable, but it won't sound like the record.";
const README_UP = `${ABOUT} The song itself is one folder up.`;
const README_ALONE = `${ABOUT} (The song itself was not rebuilt this time. Toaster's notice said why.)`;

// The new folder dir (its parent is there already; an existing one is refused), its notes folder with base.mid, base.strudel.js (if there is code) and the README, and
// the path of the .mid file. If anything fails the folder is taken back out: no half a song left.
function saveNotes(dir, base, midi, code, f = fs) {
  f.mkdirSync(dir);
  try {
    const notes = path.join(dir, NOTES);
    f.mkdirSync(notes);
    f.writeFileSync(path.join(notes, base + '.mid'), midi, { flag: 'wx' });
    if (typeof code === 'string' && code) f.writeFileSync(path.join(notes, base + '.strudel.js'), code, { encoding: 'utf8', flag: 'wx' });
    f.writeFileSync(path.join(notes, README), README_ALONE + '\n', 'utf8');
    return path.join(notes, base + '.mid');
  } catch (err) {
    try { f.rmSync(dir, { recursive: true, force: true }); } catch { /* (gone already) */ }
    throw err;
  }
}

// The rebuild is there now: the README says the song is one folder up. (midiFile: what saveNotes answered.)
function markRebuilt(midiFile, f = fs) {
  f.writeFileSync(path.join(path.dirname(midiFile), README), README_UP + '\n', 'utf8');
}

// The song's folder for a notes file the page names, or null: it must be a .mid directly inside a NOTES folder directly inside a folder of `root`.
function folderOf(root, midiFile) {
  const file = path.resolve(String(midiFile || '')), notes = path.dirname(file), dir = path.dirname(notes);
  return file.endsWith('.mid') && path.basename(notes) === NOTES && path.dirname(dir) === path.resolve(root) ? dir : null;
}

module.exports = { saveNotes, markRebuilt, folderOf, NOTES, README, README_UP, README_ALONE };
