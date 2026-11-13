// Song export (X), the song rebuilt from its own sounds (renderer/rebuild.js): a folder beside the MIDI file and the code, holding
// the rebuilt program (song.strudel.js) and the sounds it plays, cut from the song. The page names the files; only plain names
// pass ("kick.wav", "voice/3.wav": letters, digits, - and _, at most one folder, .wav), so nothing can be written outside the
// folder. The folder must be new; if any file fails, the folder is taken back out and the error passed on (no half a song left).
const fs = require('node:fs');
const path = require('node:path');

const PLAIN = /^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+\.wav$/;

function saveRebuilt(dir, code, files, f = fs) {
  if (typeof code !== 'string' || !code) throw new Error('no program to save');
  const names = Object.keys(files || {});
  for (const n of names) if (!PLAIN.test(n)) throw new Error(`not a plain sample name: ${n}`);
  f.mkdirSync(dir);   // (not recursive: an existing folder is refused, and its parent must be there)
  try {
    for (const sub of new Set(names.filter((n) => n.includes('/')).map((n) => n.split('/')[0]))) f.mkdirSync(path.join(dir, sub));
    for (const n of names) f.writeFileSync(path.join(dir, n), Buffer.from(files[n]), { flag: 'wx' });
    f.writeFileSync(path.join(dir, 'song.strudel.js'), code, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    try { f.rmSync(dir, { recursive: true, force: true }); } catch { /* (gone already) */ }
    throw err;
  }
  return path.join(dir, 'song.strudel.js');
}

module.exports = { saveRebuilt, PLAIN };
