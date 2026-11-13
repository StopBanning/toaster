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
import { voiceLine, dropStrays } from './voice.js';

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
  const line = dropStrays(voiceLine(got.vocals, 22050));
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
    const kept = voice.parts ? { parts: voice.parts, t0: heard.t0 } : {};
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

export function withTune(song, notes, line) {
  if (!notes?.length && !line?.length) return song;
  // (the lead from the path through the frames, or with none the notes' top line; then the bass's rests filled from the low
  // notes: melody.js)
  return placeBass(placeLead(song, line?.length ? line : topLine(notes || []), originOf(song)), notes || [], originOf(song));
}
