// A played file names its song from its own tags (renderer/audio-tags.js songOfFile, wired in renderer/app.js): its title and artist
// where it has them (the album artist where it has no artist), its file's name and "File" where a tag is empty. What the code's first
// line, the ID card and the player bar are written from. Files with tags, with none and with only a title are built here
// (tools/tag-fixtures.mjs); a real tagged MP3 is read too when it is there (it is under scratch, not in the repository).
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTags, songOfFile } from '../renderer/audio-tags.js';
import { buildLines, resetCodegen } from '../renderer/codegen.js';
import { songLine } from '../renderer/player.js';
import { id3Tag } from './cover-fixtures.mjs';
import { scratch } from './paths.mjs';
import { m4a, mp3, textFrame } from './tag-fixtures.mjs';

// (read with LF line endings, as a Windows checkout's CRLF would otherwise hide the function ends body() looks for)
const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const body = (name) => app.slice(app.indexOf(`function ${name}(`), app.indexOf('\n}\n', app.indexOf(`function ${name}(`)) + 3);
const song = async (bytes, name) => songOfFile(await readTags(new Blob([bytes])), name);
const tagged = (...frames) => mp3({ tag: id3Tag({ version: 3, frames }), frames: 8 });

// the code's first line for a song, from the engine as the code writer wants one
function firstLine(s) {
  resetCodegen();
  const eng = {
    tempo: { locked: true, bpm: 120, shown: 120 }, bar: 0, silent: false, key: null, lastDrop: -100, lastKick: 0, knobs: { bassLpf: 800, chordLpf: 2000, hhGain: 0.5 }, slots: [], bassBeats: null,
    v: Object.fromEntries(['bd', 'sd', 'hhc', 'hho', 'bass', 'vox'].map((id) => [id, { shown: Array.from({ length: 16 }, (_, step) => step === 0), tok: ['0'] }])), present: () => true, playing: () => true,
  };
  return buildLines(eng, { song: s }, 0).title.map((p) => p.text).join('');
}

test('a file with its tags is its title and its artist; the album artist stands in for an artist it lacks', async () => {
  assert.deepEqual(await song(tagged(textFrame('TIT2', 'Around the World'), textFrame('TPE1', 'Daft Punk'), textFrame('TALB', 'Homework')), 'aroundtheworld.mp3'), { title: 'Around the World', artist: 'Daft Punk' });
  assert.deepEqual(await song(tagged(textFrame('TIT2', 'Kerosene'), textFrame('TPE2', 'Crystal Castles')), 'x.mp3'), { title: 'Kerosene', artist: 'Crystal Castles' }, 'TPE2 where there is no TPE1');
  assert.deepEqual(await song(tagged(textFrame('TIT2', 'Both'), textFrame('TPE1', 'Track Artist'), textFrame('TPE2', 'Album Artist')), 'x.mp3'), { title: 'Both', artist: 'Track Artist' }, 'the artist first');
  assert.deepEqual(await song(m4a({ tags: { title: 'Untrust Us', artist: 'Crystal Castles', album: 'Crystal Castles' } }), 'untrustus.m4a'), { title: 'Untrust Us', artist: 'Crystal Castles' });
  assert.deepEqual(await song(m4a({ tags: { title: 'Only Album Artist', albumArtist: 'Label' } }), 'x.m4a'), { title: 'Only Album Artist', artist: 'Label' }, 'aART where there is no ©ART');
  assert.deepEqual(await song(tagged(textFrame('TIT2', 'Björk — Jóga'), textFrame('TPE1', 'Björk', { encoding: 1 })), 'x.mp3'), { title: 'Björk — Jóga', artist: 'Björk' });
});

test('a file with no tags is its file\'s name without the extension, by "File"; one with only a title has that title, by "File"; with only an artist, its file\'s name by them', async () => {
  assert.deepEqual(await song(mp3({ frames: 8 }), 'aroundtheworld.mp3'), { title: 'aroundtheworld', artist: 'File' });
  assert.deepEqual(await song(new Uint8Array(500), 'a recording.v2.wav'), { title: 'a recording.v2', artist: 'File' });
  assert.deepEqual(await song(m4a({ seconds: 3 }), 'voice memo.m4a'), { title: 'voice memo', artist: 'File' });
  assert.deepEqual(await song(tagged(textFrame('TIT2', 'Only a Title')), 'whatever.mp3'), { title: 'Only a Title', artist: 'File' });
  assert.deepEqual(await song(m4a({ tags: { title: 'Only a Title' } }), 'whatever.m4a'), { title: 'Only a Title', artist: 'File' });
  assert.deepEqual(await song(tagged(textFrame('TPE1', 'Only an Artist')), 'untitled take.mp3'), { title: 'untitled take', artist: 'Only an Artist' });
  // empty tags are no tags
  assert.deepEqual(await song(tagged(textFrame('TIT2', '   '), textFrame('TPE1', '')), 'blank.mp3'), { title: 'blank', artist: 'File' });
  // and a name with no extension, or none at all
  assert.deepEqual(songOfFile(null, 'noext'), { title: 'noext', artist: 'File' });
  assert.deepEqual(songOfFile({}, ''), { title: '', artist: 'File' });
  assert.deepEqual(songOfFile(undefined, undefined), { title: '', artist: 'File' });
});

test('the code\'s first line is written from them: DaftPunk("Around the World") for a tagged file, File("aroundtheworld") as it was for one with none', async () => {
  assert.equal(firstLine(await song(tagged(textFrame('TIT2', 'Around the World'), textFrame('TPE1', 'Daft Punk')), 'aroundtheworld.mp3')), 'x = x.DaftPunk("Around the World")');
  assert.equal(firstLine(await song(mp3({ frames: 8 }), 'aroundtheworld.mp3')), 'x = x.File("aroundtheworld")');
  assert.equal(firstLine(await song(tagged(textFrame('TIT2', 'Only a Title')), 'x.mp3')), 'x = x.File("Only a Title")');
});

test('the player bar shows a real artist beside the title, and still hides the "File" a tag-less file has', async () => {
  const real = await song(tagged(textFrame('TIT2', 'Around the World'), textFrame('TPE1', 'Daft Punk')), 'aroundtheworld.mp3');
  assert.deepEqual(songLine(real, 'file', 'aroundtheworld.mp3'), { title: 'Around the World', artist: 'Daft Punk', idle: '' });
  const bare = await song(mp3({ frames: 8 }), 'aroundtheworld.mp3');
  assert.deepEqual(songLine(bare, 'file', 'aroundtheworld.mp3'), { title: 'aroundtheworld', artist: '', idle: '' });
  assert.deepEqual(songLine(await song(tagged(textFrame('TIT2', 'Only a Title')), 'x.mp3'), 'file', 'x.mp3'), { title: 'Only a Title', artist: '', idle: '' });
});

test('the page reads them when a file is picked, before it starts, and only that file\'s source has them', () => {
  assert.match(app, /import \{ readTags, songOfFile \} from '\.\/audio-tags\.js';/);
  // read in useFile before the file plays, and not if another source was picked meanwhile
  const use = body('useFile');
  assert.match(use, /const asked = picking;\s*pendingTags = \{ name: file\.name, tags: await readTags\(file\)\.catch\(\(\) => null\) \};\s*if \(picking !== asked\) return;/);
  assert.ok(use.indexOf('pendingTags =') < use.indexOf('await playElement('), 'before it plays');
  // taken by the attach of that file (by its name), and let go with any other source or with the file
  assert.match(body('attach'), /fileTags = source === 'file' && pendingTags\?\.name === label \? pendingTags\.tags : null;\s*pendingTags = null;/);
  assert.match(body('detach'), /state\.radioSong = radioArt = fileArt = null;\s*fileTags = null;/);
  // and named by them: the title and artist, the file's name and 'File' where one is empty
  assert.match(body('currentSong'), /if \(state\.source === 'file'\) return songOfFile\(fileTags, state\.label\);/);
  assert.doesNotMatch(app, /artist: 'File'/, 'no other place makes a file\'s song');
});

test('a real tagged MP3 (Daft Punk, Around the World, Homework), when it is there: its names and the line they write', { skip: !fs.existsSync(scratch('toaster-audio', 'demo', 'aroundtheworld.mp3')) }, async () => {
  const bytes = fs.readFileSync(scratch('toaster-audio', 'demo', 'aroundtheworld.mp3'));
  const tags = await readTags(new Blob([bytes]));
  assert.deepEqual([tags.title, tags.artist, tags.album], ['Around the World', 'Daft Punk', 'Homework']);
  assert.ok(Math.abs(tags.duration - 429.52) < 0.1, `its length, ${tags.duration}`);
  assert.deepEqual(songOfFile(tags, 'aroundtheworld.mp3'), { title: 'Around the World', artist: 'Daft Punk' });
  assert.equal(firstLine(songOfFile(tags, 'aroundtheworld.mp3')), 'x = x.DaftPunk("Around the World")');
});
