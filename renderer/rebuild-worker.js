// The song rebuilt from its own sounds (rebuild.js), off the page's thread: a whole song is several seconds of arithmetic and the
// picture must not stop for it. Asked { parts: { drums, bass, other, vocals } (Float32Array), sr, bpm, origin, from, bars, title, base (where its sounds will be) },
// answers { type: 'rebuilt', code, files: { name: Uint8Array (a WAV); rebuilt.wav is the song as sound, mastered }, bars, sounds, ms } or { type: 'error', error }.
import { rebuild, render, program, fileMix, wavBytes } from './rebuild.js';

self.onmessage = ({ data }) => {
  try {
    const t0 = performance.now(), { parts, sr, bpm, origin, from, bars, title, base } = data;
    const r = rebuild(parts, sr, { bpm, origin, from, bars });
    const audio = render(r, parts, sr);
    const { code, files } = program(r, audio.gain, { title, base });
    const bytes = Object.fromEntries(Object.entries(files).map(([k, x]) => [k, wavBytes(x, sr)]));
    // and what the song sounds like, to hear without strudel.cc: the parts at their record levels, mastered (rebuild.js fileMix)
    bytes['rebuilt.wav'] = wavBytes(fileMix(audio, sr), sr);
    self.postMessage({ type: 'rebuilt', code, files: bytes, bars: r.count, sounds: Object.keys(bytes).length - 1, ms: Math.round(performance.now() - t0) }, Object.values(bytes).map((b) => b.buffer));
  } catch (err) { self.postMessage({ type: 'error', error: String(err?.message || err) }); }
};
