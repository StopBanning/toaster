// One folder per song (helpers/save-song.cjs, save-rebuilt.cjs into it, sound-server.cjs): what X writes, the notes-only case, the old folders. Nothing here opens a browser or
// touches the real Music/Toaster.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { savedSaid } from '../renderer/tune.js';

const req = createRequire(import.meta.url);
const { saveNotes, markRebuilt, folderOf, NOTES, README_UP, README_ALONE } = req('../helpers/save-song.cjs');
const { saveRebuilt } = req('../helpers/save-rebuilt.cjs');
const { start, fileFor, hasSongs } = req('../helpers/sound-server.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'save-song-'));
const same = (a, b, msg) => assert.deepEqual([...a].sort(), [...b].sort(), msg);   // (the same files, in any order)
const wav = new Uint8Array([82, 73, 70, 70]);
const ls = (dir, pre = '') => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => e.isDirectory() ? [pre + e.name + '/', ...ls(path.join(dir, e.name), pre + e.name + '/')] : [pre + e.name]);

test('X writes one folder per song: the notes (MIDI, the sketch\'s code, a README) in one subfolder, and the rebuilt song at the top beside it', () => {
  const root = tmp(), name = 'Toz Pembe 2026-11-24 11.45.38', dir = path.join(root, name);
  const mid = saveNotes(dir, name, Buffer.from('MThd'), 'sketch()');
  assert.equal(mid, path.join(dir, NOTES, name + '.mid'));
  same(ls(root), [`${name}/`, `${name}/${NOTES}/`, `${name}/${NOTES}/${name}.mid`, `${name}/${NOTES}/${name}.strudel.js`, `${name}/${NOTES}/README.txt`], 'notes alone: nothing loose in Music/Toaster, one folder');
  const file = saveRebuilt(folderOf(root, mid), 'rebuilt()', { 'kick.wav': wav, 'rebuilt.wav': wav, 'voice/0.wav': wav, 'strudel.json': Buffer.from('{}') }, fs, { into: true });
  markRebuilt(mid);
  assert.equal(file, path.join(dir, 'song.strudel.js'));
  const tree = ls(root);
  console.log(tree.join('\n'));
  same(tree, [`${name}/`, `${name}/${NOTES}/`, `${name}/${NOTES}/${name}.mid`, `${name}/${NOTES}/${name}.strudel.js`, `${name}/${NOTES}/README.txt`, `${name}/kick.wav`, `${name}/rebuilt.wav`, `${name}/song.strudel.js`, `${name}/strudel.json`, `${name}/voice/`, `${name}/voice/0.wav`]);
  assert.equal(fs.readFileSync(path.join(dir, NOTES, 'README.txt'), 'utf8'), README_UP + '\n');
  assert.equal(README_UP, "Toaster's notes for this song, on stand-in drum-machine sounds: editable, but it won't sound like the record. The song itself is one folder up.");
  assert.equal(fs.readFileSync(path.join(dir, NOTES, name + '.strudel.js'), 'utf8'), 'sketch()', 'the sketch is the notes\' code, not the rebuilt one');
  assert.equal(fs.readFileSync(file, 'utf8'), 'rebuilt()');
});

test('when the rebuild cannot be made, the notes are still saved, alone, and their README says the song was not rebuilt', () => {
  const root = tmp(), name = 'Song 2026-11-24 12.00.00', dir = path.join(root, name);
  saveNotes(dir, name, Buffer.from('MThd'), 'sketch()');
  same(ls(dir), [`${NOTES}/`, `${NOTES}/${name}.mid`, `${NOTES}/${name}.strudel.js`, `${NOTES}/README.txt`]);
  assert.equal(fs.readFileSync(path.join(dir, NOTES, 'README.txt'), 'utf8'), README_ALONE + '\n');
  assert.match(README_ALONE, /^Toaster's notes for this song, on stand-in drum-machine sounds: editable, but it won't sound like the record\. \(The song itself was not rebuilt this time/);
  // no code (a song with nothing to write): the MIDI file and the README
  const dir2 = path.join(root, 'No code');
  saveNotes(dir2, 'No code', Buffer.from('MThd'), null);
  same(ls(dir2), [`${NOTES}/`, `${NOTES}/No code.mid`, `${NOTES}/README.txt`]);
});

test('the notice says it saved only the notes, and why, when there is no rebuild; with one it names the subfolder', () => {
  const notes = '20 bars as MIDI and Strudel code, with the tune it heard';
  const alone = savedSaid('Song 2026-11-24 12.00.00', notes, false, " Couldn't rebuild it from its own sounds: the voice splitter's model is not installed.");
  assert.match(alone, /^saved only the notes for Song 2026-11-24 12\.00\.00: 20 bars as MIDI and Strudel code, with the tune it heard, on stand-in sounds, so it won't sound like the song \(/);
  assert.match(alone, /Couldn't rebuild it from its own sounds: the voice splitter's model is not installed\.$/);
  assert.match(savedSaid('S', notes, false, ''), /It wasn't rebuilt from its own sounds this time\.$/, 'never without a reason of some kind');
  const full = savedSaid('S', notes, true, ' Press O to hear it (opens in Chrome; say Allow when it asks).');
  assert.match(full, /^saved S, rebuilt from its own sounds, with its notes \(20 bars as MIDI and Strudel code, with the tune it heard\) in a subfolder \(/);
  assert.match(full, /whether you can share it depends on the music's rights\)\. Press O to hear it/);
  assert.doesNotMatch(full, /only the notes/);
});

test('a failure writing the notes takes the whole folder back out; a failure writing the rebuild takes back only what it wrote, and the notes stay', () => {
  const root = tmp(), name = 'A 2026-11-24 12.01.00', dir = path.join(root, name);
  const failMid = { ...fs, writeFileSync: (f, ...r) => { if (String(f).endsWith('.mid')) throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); return fs.writeFileSync(f, ...r); } };
  assert.throws(() => saveNotes(dir, name, Buffer.from('M'), 'x', failMid), /ENOSPC/);
  assert.equal(fs.existsSync(dir), false, 'no half a song');
  assert.throws(() => saveNotes(path.join(root, 'x'), 'x', Buffer.from('M'), 'x', { ...fs, mkdirSync: () => { throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' }); } }), /EEXIST/);
  const mid = saveNotes(dir, name, Buffer.from('M'), 'x');
  const failBass = { ...fs, writeFileSync: (f, ...r) => { if (String(f).endsWith('bass.wav')) throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); return fs.writeFileSync(f, ...r); } };
  assert.throws(() => saveRebuilt(folderOf(root, mid), 'p()', { 'kick.wav': wav, 'voice/0.wav': wav, 'bass.wav': wav }, failBass, { into: true }), /ENOSPC/);
  same(ls(dir), [`${NOTES}/`, `${NOTES}/${name}.mid`, `${NOTES}/${name}.strudel.js`, `${NOTES}/README.txt`], 'the notes are as they were; no kick.wav, no voice folder');
});

test('the page can only name a notes file in a song folder directly in the songs folder', () => {
  const root = tmp(), name = 'S 2026-11-24 12.02.00', mid = saveNotes(path.join(root, name), name, Buffer.from('M'), 'x');
  assert.equal(folderOf(root, mid), path.join(root, name));
  for (const bad of [path.join(root, name + '.mid'), path.join(root, name, 'x.mid'), path.join(root, name, NOTES, 'a.js'), path.join(root, 'a', 'b', NOTES, 'x.mid'), path.join(root, '..', NOTES, 'x.mid'), '', undefined, '/etc/passwd']) assert.equal(folderOf(root, bad), null, String(bad));
  assert.equal(folderOf(path.join(root, 'elsewhere'), mid), null);
});

test('the sound server serves a song\'s folder (marked by its song.strudel.js) and an older " rebuilt" folder where it is, and nothing else', async () => {
  const root = tmp();
  const name = 'New 2026-11-24 12.03.00', mid = saveNotes(path.join(root, name), name, Buffer.from('M'), 'x');
  saveRebuilt(folderOf(root, mid), 'p()', { 'kick.wav': wav, 'strudel.json': Buffer.from('{"A": "kick.wav"}') }, fs, { into: true });
  const old = 'Old 2026-11-13 09.03.00 rebuilt';   // (made before: no move, the name's end is the mark)
  fs.mkdirSync(path.join(root, old)); fs.writeFileSync(path.join(root, old, 'kick.wav'), 'RIFFold'); fs.writeFileSync(path.join(root, old, 'song.strudel.js'), 'p()');
  fs.mkdirSync(path.join(root, 'Unmarked folder')); fs.writeFileSync(path.join(root, 'Unmarked folder', 'kick.wav'), 'no');
  fs.writeFileSync(path.join(root, name, NOTES, 'kick.wav'), 'no');
  assert.equal(hasSongs(root), true); assert.equal(hasSongs(tmp()), false); assert.equal(hasSongs(path.join(root, 'nothing')), false);
  const s = await start(() => root, 0);
  try {
    let r = await fetch(s.base(name) + 'kick.wav'); assert.equal(r.status, 200); assert.equal(await r.text(), 'RIFF');
    r = await fetch(s.base(name) + 'strudel.json'); assert.deepEqual(await r.json(), { A: 'kick.wav' });
    r = await fetch(s.base(old) + 'kick.wav'); assert.equal(r.status, 200); assert.equal(await r.text(), 'RIFFold', 'a song rebuilt before this change keeps working where it is');
    const at = `http://localhost:${s.port}`;
    for (const bad of [`${at}/Unmarked%20folder/kick.wav`, `${s.base(name)}song.strudel.js`, `${at}/${encodeURIComponent(name)}/${encodeURIComponent(NOTES)}/kick.wav`, `${at}/./kick.wav`, `${at}/../kick.wav`]) assert.equal((await fetch(bad)).status, 404, bad);
  } finally { await s.close(); }
  assert.equal(fileFor('/songs', '/x/kick.wav', () => true), path.join('/songs', 'x', 'kick.wav'));
  assert.equal(fileFor('/songs', '/x/kick.wav', () => false), null);
});

test('main.js: X makes the song\'s folder (a free name), saves the notes in it, and the rebuild goes into the same folder; the server starts for either kind of folder', () => {
  const main = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /const folder = freeBase\(path\.join\(dir, `\$\{safe\} \$\{stamp\(\)\}`\), \['']\);/);
  assert.match(main, /saveNotes\(folder, path\.basename\(folder\), Buffer\.from\(midi\), code\)/);
  assert.match(main, /saveSong\.folderOf\(songsDir\(\), midiFile\)/);
  assert.match(main, /if \(!dir \|\| !fs\.existsSync\(path\.resolve\(String\(midiFile\)\)\)\) throw new Error\('not a song X saved'\)/, 'the page cannot add files to a folder by naming a .mid that is not there');
  assert.match(main, /saver\.saveRebuilt\(dir, final, saver\.withBase\(plainObject\(files\), address\), fs, \{ into: true \}\)/);
  assert.match(main, /sound-server\.cjs'\)\.hasSongs\(songsDir\(\)\)/);
  assert.doesNotMatch(main, /save-pair|' rebuilt'/, 'no loose pair and no folder beside it');
});
