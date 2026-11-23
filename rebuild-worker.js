// The song rebuilt from its own sounds (rebuild.js), off the page's thread: a whole song is several seconds of arithmetic and the
// picture must not stop for it. Asked { parts: { drums, bass, other, vocals } (Float32Array), sr, bpm, origin, from, bars, title, song (its own title, for the bank), base (where its sounds will be) },
// answers { type: 'rebuilt', code, files: { name: Uint8Array (a WAV; strudel.json names them; rebuilt.wav is the song as sound, mastered) }, bars, sounds, ms } or { type: 'error', error }.
import { rebuild, render, program, fileMix, wavBytes, samplesJson } from './rebuild.js';

self.onmessage = ({ data }) => {
  try {
    const t0 = performance.now(), { parts, sr, bpm, origin, from, bars, title, song, base } = data;
    const r = rebuild(parts, sr, { bpm, origin, from, bars });
    const audio = render(r, parts, sr);
    const { code, files, samples } = program(r, audio.gain, { title, song, base });
    const bytes = Object.fromEntries(Object.entries(files).map(([k, x]) => [k, wavBytes(x, sr)]));
    const sounds = Object.keys(bytes).length;
    // strudel.json: what samples('.../strudel.json') reads (rebuild.js samplesJson); its _base is the {{base}} main.js puts the address in for
    bytes['strudel.json'] = new TextEncoder().encode(samplesJson(samples, base));
    // and what the song sounds like, to hear without strudel.cc: the parts at their record levels, mastered (rebuild.js fileMix)
    bytes['rebuilt.wav'] = wavBytes(fileMix(audio, sr), sr);
    self.postMessage({ type: 'rebuilt', code, files: bytes, bars: r.count, sounds, ms: Math.round(performance.now() - t0) }, Object.values(bytes).map((b) => b.buffer));
  } catch (err) { self.postMessage({ type: 'error', error: String(err?.message || err) }); }
};
