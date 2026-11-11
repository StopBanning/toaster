// Song export (X): the song's MIDI file and its Strudel code, a pair side by side. If the code can't be written, the MIDI file
// is taken back out and the error passed on: the page says the export failed, so no half of a pair is left behind. (A code file
// that was already there, EEXIST, isn't ours to remove: only the MIDI file goes then.)
const fs = require('node:fs');

function savePair(base, midi, code, f = fs) {
  f.writeFileSync(base + '.mid', midi, { flag: 'wx' });
  if (typeof code !== 'string' || !code) return base + '.mid';
  try {
    f.writeFileSync(base + '.strudel.js', code, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    for (const ext of err && err.code === 'EEXIST' ? ['.mid'] : ['.mid', '.strudel.js']) {
      try { f.unlinkSync(base + ext); } catch { /* (gone already) */ }
    }
    throw err;
  }
  return base + '.mid';
}

module.exports = { savePair };
