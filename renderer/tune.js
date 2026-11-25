// The export's tune (X): Spotify's Basic Pitch listens to the stretch of sound the exported song covers (renderer/ear.js keeps
// it; tune-worker.js runs the model on the graphics card) and the top line of what it hears, in the voice's range, is written as
// the song's lead (renderer/melody.js) in the MIDI file and the Strudel code. Measured Nov 11 on 16 songs against their sung
// melodies: the lead the engine wrote matched the voice 1% of the time, Basic Pitch's top line 38% (the right note 80% of the time
// it plays); the exports became more recognisable to a cover-song score (0.27 -> 0.38). Nothing live uses it.
//
//   await tuneFor(song, ear, onProgress)   -> { notes: [[start, length, midi, loudness]], line: [[start, length, midi]] (the tune),
//                                             both in the engine's seconds, backend, ms, from: 'voice' or 'mix' }
//                                             or { notes: null, why } (no tempo line, nothing kept, no graphics card, an error)
//   withTune(song, notes, line)            -> the song with the line as its lead and its bass's rests filled from the notes
//                                             (melody.js), or the song as it was
import { topLine, placeLead, placeBass } from './melody.js';
import { splitVoice } from './stems.js';
import { voiceLineSliced, dropStrays } from './voice.js';

// (where bar 0 falls: the fitted tempo line's, else the last tempo's, tape.js)
const originOf = (song) => (Number.isFinite(song?.origin) ? song.origin : song?.originLast);

// The tune from the voice alone, where the voice splitter is installed (stems.js; an experiment, Nov 12): the stretch's singer
// pulled out, her notes read with no model (voice.js). On 14 sung songs the tune read this way plays through 4% of her
// silences (the mix's: 31%) and sits on her note 95% of the time (84%). Where the splitter is absent, fails or finds too
// little singing (an instrumental: fewer than 4 notes once the stray blips are out, voice.js dropStrays), the answer is null
// and the line read from the mix stands.
//   -> { line: [[start s, length s, midi]] from the audio's first sample, backend, ms } or { line: null, why }
// side: the ear's second channel (half the left less half the right), where the sound had two: the splitter is given left and
// right again (the middle plus and minus the side), which is worth 9 points of the sung moments to it (0.71 -> 0.80, Nov 12).
// keep: the drums, the bass and the rest too (for the song rebuilt from its own sounds, rebuild.js): they come back as `parts`.
export async function voiceTune(audio, onProgress = () => {}, split = splitVoice, side = null, { keep = false } = {}) {
  let left = audio, right = null;
  if (side && side.length === audio.length) {
    left = new Float32Array(audio.length); right = new Float32Array(audio.length);
    for (let i = 0; i < audio.length; i++) { left[i] = audio[i] + side[i]; right[i] = audio[i] - side[i]; }
  }
  const got = await split(left, { rate: 22050, right, onProgress, ...(keep && { parts: ['drums', 'bass', 'other'] }) });
  if (!got?.vocals) return { line: null, why: got?.why || 'the voice could not be pulled out', absent: !!got?.absent };
  const parts = keep && got.parts?.drums && got.parts?.bass && got.parts?.other ? { ...got.parts, vocals: got.vocals } : null;
  // (in slices, the page drawing between them: the pitch read is seconds of work on a whole song, and it froze the picture)
  const line = dropStrays(await voiceLineSliced(got.vocals, 22050));
  if (line.length < 4) return { line: null, why: 'hardly any singing in it', backend: got.backend, ms: got.ms, parts };
  return { line, backend: got.backend, ms: got.ms, parts };
}

// keep: the four parts come back too (`parts`, 22.05 kHz, from `t0` in the engine's seconds), for the rebuilt song.
export async function tuneFor(song, ear, onProgress = () => {}, { split = splitVoice, onVoice = () => {}, keep = false } = {}) {
  if (!song || !Number.isFinite(originOf(song)) || !(song.bpm > 0) || !song.bars?.length) return { notes: null, why: 'the song has no tempo line to put a tune on' };
  if (!ear) return { notes: null, why: 'nothing was kept to listen to' };
  try {
    const barSec = 240 / song.bpm;
    // (a second either side: a note on the first beat is heard from its start, and one on the last runs out)
    const heard = await ear.hear(originOf(song) - 1, originOf(song) + song.bars.length * barSec + 1);
    if (!heard || heard.audio.length < 22050) return { notes: null, why: 'nothing was kept of the song to listen to' };
    const seconds = heard.audio.length / 22050;
    // (the voice first, on a copy: the notes' worker takes the recording itself; one at a time, both want the graphics card)
    const voice = await voiceTune(heard.side ? heard.audio : heard.audio.slice(), onVoice, split, heard.side, { keep }).catch((err) => ({ line: null, why: String(err?.message || err) }));
    const got = await runWorker(heard.audio, seconds, onProgress);
    // (partsWhy: why the rebuilt song has no parts to be made from, for the export to say: the split failed, timed out, or would not start)
    const kept = voice.parts ? { parts: voice.parts, t0: heard.t0 } : { partsWhy: voice.why || 'the voice splitter gave nothing back' };
    if (!got.notes && !voice.line) return { ...got, ...kept };
    const line = voice.line || got.line;
    return { ...got, notes: (got.notes || []).map(([t, d, m, a]) => [t + heard.t0, d, m, a]), line: line?.map(([t, d, m]) => [t + heard.t0, d, m]), seconds, missed: heard.missed,
      from: voice.line ? 'voice' : 'mix', voice: { why: voice.why, backend: voice.backend, ms: voice.ms, wide: !!heard.side }, ...kept };
  } catch (err) { return { notes: null, why: String(err?.message || err) }; } // (the export goes on without it)
}

// Basic Pitch in its worker, started now and let go after. On the processor (no graphics card for it) it would take minutes a
// song, so it is let go as soon as it says that's where it is.
function runWorker(audio, seconds, onProgress) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./tune-worker.js', import.meta.url), { type: 'module' });
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    // (about 3 s a minute of sound on an M-series Mac; a slow graphics card gets twenty times that)
    const timer = setTimeout(() => finish({ notes: null, why: 'listening for the tune took too long' }), 30000 + seconds * 1000);
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') { if (data.backend !== 'webgl') finish({ notes: null, why: 'the tune needs the graphics card, and it could not be used' }); }
      else if (data.type === 'progress') onProgress(data.done);
      else if (data.type === 'notes') finish({ notes: data.notes, line: data.line, backend: data.backend, ms: data.ms });
      else finish({ notes: null, why: data.error || 'the tune could not be heard' });
    };
    worker.onerror = (e) => { e.preventDefault(); finish({ notes: null, why: e.message || 'the tune could not be heard' }); };
    try { worker.postMessage({ audio }, [audio.buffer]); } catch (err) { finish({ notes: null, why: String(err?.message || err) }); }
  });
}

// What the export's notice says of the rebuilt song (the sweep, Nov 16, finding 3: when it did not happen the notice only left it out and the
// reason went to the console, so a failure on a machine nobody had tried looked like the feature not being there). rebuilt: what
// saveRebuilt answered, or null; why: the reason it was not made or not saved, in words.
//   -> { mid: said where the notice lists what was saved, end: said after it }
export function rebuildSaid(rebuilt, why, browser, fromO = false) {
  if (rebuilt) return { mid: ', and rebuilt from its own sounds', end: rebuilt.served === false ? " Its sounds can't be served (another program has the port they are served from), so the Strudel code can't play them." : pressO(browser, fromO) };
  const w = String(why || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').slice(0, 140);
  return { mid: '', end: w ? ` Couldn't rebuild it from its own sounds: ${w}.` : '' };
}

// How the notice tells how to hear the rebuilt song (Nov 24: O opened Safari on a Mac, which can't play it, and nothing said so). browser: what a Mac would
// open it in ('Chrome', 'Edge'), null on a Mac with neither, undefined where the browser is not the question (Windows, Linux). fromO: O made this
// rebuild and opens it next (or, with neither Chrome nor Edge on a Mac, shows rebuilt.wav in its folder), so there is nothing to press: it says what happens next.
function pressO(browser, fromO) {
  if (fromO) return browser ? ` Opening it in ${browser} now: say Allow when ${browser} asks.` : browser === null ? ' It needs Chrome or Edge to play: rebuilt.wav is shown in its folder.' : ' Rebuilt: opening it now.';
  if (browser) return ` Press O to hear it (opens in ${browser}; say Allow when it asks).`;
  if (browser === null) return ' To hear it you need Chrome or Edge (Safari stays silent). rebuilt.wav in its folder is how it sounds.';
  return ' Press O to hear it.';
}

// What O says it did. result: what main.js answered, { browser, plays }; null when it refused the link or the call failed; undefined when nothing is known (a plain
// browser tab). rebuilt: whether it opened the rebuilt song (else the live code, which Shift+O opens). bars: for a rebuild opened again, how many bars it covers.
//   -> { text, explain }: explain is true for the words that tell something (a warning, a failure), which go in the notice box (8 s) and not in the status line's
//      1.6 s flash, which a browser coming to the front covers.
// How long ago, for a rebuild opened again ("just now" under 45 s, then minutes, then hours).
export function agoSaid(ms) {
  const s = Math.max(0, ms) / 1000;
  if (s < 45) return 'just now';
  if (s < 5400) return `${Math.max(1, Math.round(s / 60))} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

// What X's notice says it saved (one folder per song, Nov 24). name: the song's folder; notes: what the notes hold ("20 bars as MIDI and Strudel code, ..."); rebuilt: whether the
// song was rebuilt from its own sounds (its notes are in a subfolder); end: what rebuildSaid said after (how to hear it, or why it could not be made). With no rebuild, only the
// notes were saved, and it says so and why.
export function savedSaid(name, notes, rebuilt, end = '') {
  const rights = "an approximate sketch of the song: whether you can share it depends on the music's rights";
  return rebuilt
    ? `saved ${name}, rebuilt from its own sounds, with its notes (${notes}) in a subfolder (${rights}).${end}`
    : `saved only the notes for ${name}: ${notes}, on stand-in sounds, so it won't sound like the song (${rights}).${end || " It wasn't rebuilt from its own sounds this time."}`;
}

export function openedSaid(result, rebuilt, bars = 0, age = 0) {
  if (result === null) return { text: rebuilt ? "couldn't open it in a browser: paste song.strudel.js, in the song's folder, into strudel.cc in Chrome" : "couldn't open strudel.cc in a browser", explain: true };
  const where = result?.browser && result.browser !== 'default' ? `in ${result.browser}` : 'in strudel.cc';
  // (Shift+O in the app: the live code is the stand-in sketch, not the song. It says so in a notice, which also replaces what O last said about the rebuild; a plain browser tab, the website, has only the flash)
  if (!rebuilt) return result ? { text: 'Opened the live code (the stand-in sketch) in your browser.', explain: true } : { text: `opened the live code ${where}`, explain: false };
  if (result?.plays === false) return { text: "If this opened in Safari it will stay silent: Safari can't load the sounds. Use Chrome or Edge. rebuilt.wav in its folder is how it sounds.", explain: true };
  // (bars: an earlier rebuild of this song was opened again, not made again: it covers that many bars, and X makes a new one with more)
  // (a rebuild under a minute old is the one X just made: no bar count and no "redo it" for someone who just pressed X, Nov 24)
  if (bars && age < 60000) return { text: `opened the rebuild ${where}`, explain: true };
  return bars ? { text: `opened the rebuild made ${agoSaid(age)} (${bars} bars). Press X to redo it with more.`, explain: true } : { text: `opened the song rebuilt from its own sounds ${where}`, explain: false };
}

export function withTune(song, notes, line) {
  if (!notes?.length && !line?.length) return song;
  // (the lead from the path through the frames, or with none the notes' top line; then the bass's rests filled from the low
  // notes: melody.js)
  return placeBass(placeLead(song, line?.length ? line : topLine(notes || []), originOf(song)), notes || [], originOf(song));
}
