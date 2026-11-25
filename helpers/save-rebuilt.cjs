// Song export (X), the song rebuilt from its own sounds (renderer/rebuild.js): at the top of the song's folder (beside the notes folder: helpers/save-song.cjs), the rebuilt program (song.strudel.js) and the sounds it plays, cut from the song. The page names the files; only plain names
// pass ("kick.wav", "voice/3.wav": letters, digits, - and _, at most one folder, .wav), so nothing can be written outside the
// folder. The folder must be new; if any file fails, the folder is taken back out and the error passed on (no half a song left).
const fs = require('node:fs');
const path = require('node:path');

const PLAIN = /^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+\.wav$/;
const LIST = 'strudel.json';   // (the one other file: the list that names the sounds, for samples('.../strudel.json'))
const allowed = (n) => PLAIN.test(n) || n === LIST;

// into: the folder is the song's own, made already (holding its notes: helpers/save-song.cjs); only what this writes is taken back out on a failure.
function saveRebuilt(dir, code, files, f = fs, { into = false } = {}) {
  if (typeof code !== 'string' || !code) throw new Error('no program to save');
  const names = Object.keys(files || {});
  for (const n of names) if (!allowed(n)) throw new Error(`not a plain sample name: ${n}`);
  const made = [];   // (what this call created, newest last: taken back out if it fails)
  const mk = (p) => { f.mkdirSync(p); made.push(p); };
  if (into) { if (!f.statSync(dir).isDirectory()) throw new Error('not a folder'); } else mk(dir);   // (not recursive: an existing folder is refused, and its parent must be there)
  try {
    for (const sub of new Set(names.filter((n) => n.includes('/')).map((n) => n.split('/')[0]))) mk(path.join(dir, sub));
    for (const n of names) { f.writeFileSync(path.join(dir, n), Buffer.from(files[n]), { flag: 'wx' }); made.push(path.join(dir, n)); }
    f.writeFileSync(path.join(dir, 'song.strudel.js'), code, { encoding: 'utf8', flag: 'wx' }); made.push(path.join(dir, 'song.strudel.js'));
  } catch (err) {
    for (const p of made.reverse()) { try { f.rmSync(p, { recursive: true, force: true }); } catch { /* (gone already) */ } }
    throw err;
  }
  return path.join(dir, 'song.strudel.js');
}

// strudel.json as the page wrote it has {{base}} for the address its sounds are fetched from; the files with that address in (base is the folder's
// address, or '' where nothing serves it). Nothing else changes; a list that is not text is left as it came.
function withBase(files, base) {
  const out = { ...files }, raw = out[LIST];
  if (raw != null) { try { out[LIST] = Buffer.from(Buffer.from(raw).toString('utf8').replace('{{base}}', () => String(base))); } catch { /* (left as it came) */ } }
  return out;
}

module.exports = { saveRebuilt, withBase, PLAIN, LIST, allowed };
