// Builds the music the library's live check scans (tools/library-check.mjs), under scratch and nowhere else: nobody's real folder is read or
// written. Two folders in --out (~/work/scratch/golden-library-test by default):
//   library/  about a hundred tracks, real audio (clips of the songs in ~/work/scratch/toaster-audio, cut and tagged with ffmpeg), laid out
//             as albums: the five of the kept stills (the names, the track counts and, for (III), its lengths), a two-disc album, a
//             compilation, files with no tags, and each format the library lists (FLAC, Ogg, Opus, WAV, WebM, by their names)
//   big/      5,000 tiny tagged files (an MP3's tag and a few silent frames; some ID3v2.4, some M4A, some with no tags) in 250 albums
//             of 20, some with a cover, for the scan's budget
//   node tools/library-fixture.mjs [--out dir] [--only library|big] [--files 5000]
// It needs ffmpeg for the first, and the songs in scratch/toaster-audio; the second needs neither.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { COVERS, apicBody, id3Tag, pixels, png } from './cover-fixtures.mjs';
import { scratch } from './paths.mjs';
import { m4a, mp3, textFrame } from './tag-fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const out = path.resolve(arg('out', scratch('golden-library-test')));
const only = arg('only', '');
const files = Number(arg('files', 5000));
if (!out.startsWith(scratch() + path.sep)) throw new Error(`refusing to build anywhere but under ${scratch()}`);
const songs = scratch('toaster-audio');

const put = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
const safe = (s) => s.replace(/[<>:"/\\|?*]/g, '').trim();
const two = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- the library of real clips

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0 || r.stderr.trim()) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr.slice(0, 600)}`);
}

function buildLibrary() {
  const root = path.join(out, 'library'), work = path.join(out, 'library-work');
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  // the sources: songs by the artists of the stills where there are some
  const src = (name) => path.join(songs, name);
  const SRC = { cc: ['baptism-crystalcastles.webm', 'char-crystalcastles.webm', 'courtshipdating-crystalcastles.webm', 'empathy-crystalcastles.webm'].map(src), tame: [src('dracula-tameimpala.webm')], fred: [src('leavemealone-fredagain.webm')], jane: ['eternalembrace-sped-babyjane.webm', 'hidenseek-sped-babyjane.webm'].map(src), any: [src('nanana-full.webm'), src('dracula-tameimpala.webm')] };
  for (const list of Object.values(SRC)) for (const f of list) if (!fs.existsSync(f)) throw new Error(`no ${f}: the songs are in scratch/toaster-audio`);
  // the covers: the three real ones in the demo MP3s, and made ones
  const demo = scratch('toaster-audio', 'demo');
  const covers = {};
  for (const [name, from] of [['cc', 'untrustus.mp3'], ['tron', 'derezzed.mp3'], ['daft', 'aroundtheworld.mp3']]) {
    covers[name] = path.join(work, `${name}.jpg`);
    ffmpeg(['-i', path.join(demo, from), '-an', '-c:v', 'copy', '-frames:v', '1', covers[name]]);
  }
  for (const [name, fn] of [['warm', COVERS['warm photo']], ['cool', COVERS['cool photo']], ['loud', COVERS['loud photo']], ['grey', COVERS['grey photo']], ['dark', COVERS['dark photo']], ['sunset', COVERS.sunset], ['purple', COVERS['purple to orange']]]) {
    covers[name] = path.join(work, `${name}.png`);
    fs.writeFileSync(covers[name], png(pixels(fn, 500), 500));
  }

  // one track: seconds of a source from an offset (looped if the song is shorter), tagged, the cover in it
  let nth = 0;
  function track(dir, file, { title, artist, album, albumArtist, n, of, disc, discOf, compilation, seconds = 8, source = SRC.any, cover = null, format = 'mp3', untagged = false }) {
    const from = source[nth % source.length], offset = 5 + ((nth * 23) % 90);
    nth++;
    const target = path.join(root, dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // (a song shorter than the clip is looped by a filter: the demuxer's own loop gave timestamps that ran backwards)
    const input = ['-ss', String(offset), '-i', from], loop = ['-af', 'aloop=loop=-1:size=300000000'];
    const meta = untagged ? ['-map_metadata', '-1'] : ['-map_metadata', '-1', '-metadata', `title=${title}`, '-metadata', `artist=${artist}`, '-metadata', `album=${album}`, '-metadata', `track=${n}/${of}`,
      ...(albumArtist ? ['-metadata', `album_artist=${albumArtist}`] : []), ...(disc ? ['-metadata', `disc=${disc}/${discOf || disc}`] : []), ...(compilation ? ['-metadata', 'compilation=1'] : [])];
    const withCover = !!cover && !untagged, inputs = [...input, ...(withCover ? ['-i', covers[cover]] : [])];
    if (format === 'mp3') {
      const art = withCover ? ['-map', '0:a', '-map', '1:v', '-c:v', 'copy', '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)'] : ['-vn'];
      ffmpeg([...inputs, ...loop, '-t', String(seconds), ...art, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100', '-id3v2_version', nth % 5 === 0 ? '4' : '3', ...(untagged ? ['-write_id3v2', '0'] : []), ...meta, target]);
    } else if (format === 'm4a') {
      ffmpeg([...inputs, ...loop, '-t', String(seconds), ...(withCover ? ['-map', '0:a', '-map', '1:v', '-c:v', 'copy', '-disposition:v', 'attached_pic'] : ['-vn']), '-c:a', 'aac', '-b:a', '64k', ...meta, target]);
    } else {
      const codec = { flac: ['-c:a', 'flac'], ogg: ['-c:a', 'libopus', '-b:a', '48k'], opus: ['-c:a', 'libopus', '-b:a', '48k'], wav: ['-c:a', 'pcm_s16le', '-ar', '22050', '-ac', '1'], webm: ['-c:a', 'libopus', '-b:a', '48k'] }[format];
      ffmpeg([...input, ...loop, '-t', String(seconds), '-vn', ...codec, ...meta, target]);
    }
  }

  // an album: tracks [title, seconds], the cover, and its folder; each track named "NN Title.mp3" in Artist/Album
  const album = (artist, name, list, { cover, seconds, format = 'mp3', folder, albumArtist, compilation, artists, discs } = {}) => {
    const dir = folder || path.join(safe(artist), safe(name));
    list.forEach(([title, secs], i) => {
      const d = discs ? (i < discs[0] ? 1 : 2) : 0, within = discs ? (i < discs[0] ? i : i - discs[0]) : i;
      track(discs ? path.join(dir, `CD${d}`) : dir, `${two(within + 1)} ${safe(title)}.${format}`, {
        title, artist: artists ? artists[i % artists.length] : artist, album: name, albumArtist, n: within + 1, of: discs ? discs[d - 1] : list.length, disc: d || undefined, discOf: discs ? 2 : undefined,
        compilation, seconds: seconds ?? secs, source: SRC[artist === 'Crystal Castles' ? 'cc' : artist === 'Tame Impala' ? 'tame' : artist.startsWith('Fred') ? 'fred' : artist === 'Baby Jane' ? 'jane' : 'any'], cover, format,
      });
    });
  };

  // the five of the kept stills: (III) with its own lengths, the others in short clips (their counts are what the folded rows show)
  album('Crystal Castles', '(III)', [['Plague', 296], ['Kerosene', 192], ['Wrath of God', 187], ['Affection', 157], ['Pale Flesh', 179], ['Sad Eyes', 207], ['Insulin', 107], ['Transgender', 185], ['Violent Youth', 262], ['Telepath', 235], ['Mercenary', 158], ['Child I Will Hurt You', 213]], { cover: 'cc' });
  album('Snow Strippers', 'April Mixtape 3', ['Again', 'Under Your Spell', "Now It's Not The Same", 'Deceitful Eyes', 'Sick', 'Like To Complicate', "I'm On My Own", 'Your Ridicule', 'Depriving You', 'Lacerate', "It's Goin Bad", 'Kinda Like It That Way', "Don't You Feel", 'Under A Siege', 'Fake Smile', "It's A Dream (feat. Lil Uzi Vert)"].map((t) => [t, 8]), { cover: 'cool' });
  album('Tame Impala', 'Lonerism', ['Be Above It', 'Endors Toi', 'Apocalypse Dreams', 'Mind Mischief', 'Music To Walk Home By', "Why Won't They Talk To Me?", 'Feels Like We Only Go Backwards', 'Keep On Lying', 'Elephant', 'Led Zeppelin', 'She Just Won\'t Believe Me', 'Nothing That Has Happened So Far Has Been Anything We Could Control', "Sun's Coming Up"].map((t) => [t, 8]), { cover: 'tron', format: 'm4a' });
  album('Fred again.. & LATIN MAFIA', '9 months & 50 hours', ['Hey Hey', 'Alvafro', 'Bonita', 'benjy chord', 'Cmon (LATIN MAFIA & Fred edit)', 'Quiereme', 'casino143 (Rue De La Fortuna Remix)', 'Film Scene Soundtrack', 'Open Eye Signal (under the fabric)', 'Piensas En Mi', 'Halo', 'Te Estoy Correteando', 'Mabe', 'I wish it wasnt'].map((t) => [t, 8]), { cover: 'daft' });
  album('Baby Jane', 'Eternal Embrace - Single', [['Eternal Embrace', 20], ['Eternal Embrace (Sped Up)', 16]], { cover: 'warm' });
  // a two-disc album (a folder to a disc), a compilation (an album artist of Various Artists), files with no tags, and each format
  album('Band Of Tests', 'Double Album', ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((t) => [t, 6]), { cover: 'loud', albumArtist: 'Band Of Tests', discs: [3, 3] });
  album('Various Artists', 'Summer Mix', ['Sunny Side', 'Long Days', 'Salt Water', 'Last Light', 'Slow Tide'].map((t) => [t, 6]), { cover: 'sunset', albumArtist: 'Various Artists', compilation: true, artists: ['Ann Example', 'Bob Sample', 'Cy Placeholder'], folder: path.join('Various Artists', 'Summer Mix') });
  for (const [file, title] of [['01 - First Take', 'First Take'], ['02 - Second Take', 'Second Take'], ['rough mix', 'rough mix']]) track(path.join('Mixes', 'Untagged'), `${file}.mp3`, { title, artist: '', album: '', n: 1, of: 1, untagged: true, seconds: 5 });
  for (const f of ['flac', 'ogg', 'opus', 'wav', 'webm']) track('Formats', `${f === 'flac' ? '01' : f === 'ogg' ? '02' : f === 'opus' ? '03' : f === 'wav' ? '04' : '05'} In ${f.toUpperCase()}.${f}`, { title: `In ${f}`, artist: 'Formats', album: 'Formats', n: 1, of: 5, seconds: 5, format: f });
  album('Björk', 'Homogenic', [['Hunter', 8], ['Jóga', 8], ['Unravel', 8]], { cover: 'grey' });
  album('Dark Room', 'After Hours Or A Very Long Title For A Record Nobody Asked For', [['A track with a very long name that does not fit on any row of the library at any size', 6], ['Short', 6]], { cover: 'dark' });
  album('Purple Test', 'Gradient', [['Dusk', 6], ['Dawn', 6]], { cover: 'purple' });
  // what a library has that is not music
  put(path.join(root, '.DS_Store'), new Uint8Array(20));
  put(path.join(root, 'Crystal Castles', '(III)', 'cover.jpg'), fs.readFileSync(covers.cc));
  put(path.join(root, 'Crystal Castles', '(III)', '._01 Plague.mp3'), new Uint8Array(80));
  put(path.join(root, 'notes.txt'), 'not music');
  // what must not be followed or read: a link to a song outside the folder, a link to a folder outside it, one to a text file inside
  const outside = path.join(out, 'outside');
  fs.rmSync(outside, { recursive: true, force: true });
  put(path.join(outside, 'secret.mp3'), fs.readFileSync(path.join(root, 'Formats', '04 In WAV.wav')));
  put(path.join(outside, 'notes.txt'), 'outside');
  fs.symlinkSync(path.join(outside, 'secret.mp3'), path.join(root, 'link-to-outside.mp3'));
  fs.symlinkSync(outside, path.join(root, 'link-dir'));
  fs.symlinkSync(path.join(root, 'notes.txt'), path.join(root, 'disguised.mp3'));
  fs.rmSync(work, { recursive: true, force: true });
  let count = 0, bytes = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(mp3|m4a|flac|ogg|opus|wav|webm)$/i.test(e.name) && !e.name.startsWith('._')) { count++; bytes += fs.statSync(p).size; } } };
  walk(root);
  console.log(`library: ${count} audio files, ${(bytes / 1048576).toFixed(1)} MB, in ${root}`);
}

// ---------------------------------------------------------------- 5,000 tiny tagged files

const mulberry = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const WORDS = ['Velvet', 'Static', 'Bloom', 'Hours', 'Neon', 'Garden', 'Signal', 'Echo', 'Paper', 'Thunder', 'Glass', 'Harbor', 'Midnight', 'Orchard', 'Pulse', 'Quiet', 'River', 'Silver', 'Tide', 'Union', 'Violet', 'Winter', 'Yellow', 'Zenith', 'Amber', 'Basin', 'Cobalt', 'Dune', 'Ember', 'Fable'];

function buildBig() {
  const root = path.join(out, 'big');
  fs.rmSync(root, { recursive: true, force: true });
  const rand = mulberry(7), pick = () => WORDS[Math.floor(rand() * WORDS.length)];
  const albums = Math.ceil(files / 20);
  // sixty covers of 500 pixels (what a downloaded album has: a picture a few tens of KB), shared out among the albums that have one
  const photos = Object.values(COVERS).filter((_, i) => i >= 22).concat([COVERS.sunset, COVERS.rainbow, COVERS['purple to orange'], COVERS['yellow to dark red'], COVERS['blue to red']]);
  const pictures = Array.from({ length: 40 }, (_, i) => { const fn = photos[i % photos.length]; return png(pixels((u, v, x, y) => fn((u + i * 0.07) % 1, v, x, y), 160), 160); });
  let made = 0, bytes = 0;
  for (let a = 0; a < albums && made < files; a++) {
    const artist = `${pick()} ${pick()}`, name = `${pick()} ${pick()}${a % 7 === 0 ? ` ${a}` : ''}`, dir = path.join(root, `${two(Math.floor(a / 4))} ${safe(artist)}`, `${safe(name)} ${a}`);
    const withCover = a % 2 === 0, everyTrack = a % 17 === 0, picture = pictures[a % pictures.length];
    const kind = a % 40 === 39 ? 'untagged' : a % 11 === 0 ? 'm4a' : a % 5 === 0 ? 'v4' : 'v3', multi = a % 9 === 0;
    for (let n = 1; n <= 20 && made < files; n++) {
      const title = `${pick()} ${pick()} ${n}`, base = `${two(n)} ${safe(title)}`, disc = multi ? (n <= 10 ? 1 : 2) : 0, num = multi ? ((n - 1) % 10) + 1 : n;
      const cover = withCover && (n === 1 || everyTrack) ? picture : null;
      let bytesOf, ext = 'mp3';
      if (kind === 'untagged') bytesOf = mp3({ frames: 6 });
      else if (kind === 'm4a') { ext = 'm4a'; bytesOf = m4a({ tags: { title, artist, album: name, albumArtist: artist, track: [num, multi ? 10 : 20], ...(disc ? { disc: [disc, 2] } : {}) }, seconds: 150 + n * 7, pictures: cover ? [[cover, 14]] : [] }); }
      else {
        const frames = [textFrame('TIT2', title), textFrame('TPE1', artist), textFrame('TALB', name), textFrame('TPE2', artist), textFrame('TRCK', `${num}/${multi ? 10 : 20}`), ...(disc ? [textFrame('TPOS', `${disc}/2`)] : []), ...(cover ? [{ id: 'APIC', body: apicBody(cover, { mime: 'image/png' }), flags: [0, 0] }] : [])];
        bytesOf = mp3({ tag: id3Tag({ version: kind === 'v4' ? 4 : 3, frames, padding: 64 }), frames: 6 + (n % 5) });
      }
      put(path.join(dir, `${base}.${ext}`), bytesOf);
      made++;
      bytes += bytesOf.length;
    }
  }
  console.log(`big: ${made} audio files, ${(bytes / 1048576).toFixed(1)} MB, in ${root}`);
}

if (only !== 'big') buildLibrary();
if (only !== 'library') buildBig();
