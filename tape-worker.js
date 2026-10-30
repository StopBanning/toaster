import { songMidi, songStrudelShortest } from './tape.js';

self.onmessage = ({ data: { song, name, about } }) => {
  try {
    const midi = songMidi(song, name), code = songStrudelShortest(song, about);
    postMessage({ midi, code }, [midi.buffer]);
  } catch (err) { postMessage({ error: String(err?.message || err) }); }
};
