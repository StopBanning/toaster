// The notes in a recording, heard by Spotify's Basic Pitch (renderer/vendor/basic-pitch.mjs; its model in
// renderer/models/basic-pitch), off the page's thread: the listening and drawing never wait for it. Only the export uses it
// (renderer/tune.js), when X is pressed; nothing live does. On the graphics card (TensorFlow.js's WebGL), else the processor.
//
// Asked { audio }: mono, 22050 Hz (Basic Pitch's rate), a Float32Array. Answers { type: 'ready', backend } ('webgl' or 'cpu')
// once the model is loaded, { type: 'progress', done } (0..1) as it goes, then { type: 'notes', notes: [[start s, length s,
// midi, loudness 0..1]], line: [[start s, length s, midi]] (the tune: melody.js pathLine), backend, ms }, starts from the
// audio's first sample; or { type: 'error', error }.
//
// The model is run as Basic Pitch's own evaluateModel runs it (inference.js): 2 s windows, 30 frames of overlap, half an
// overlap of silence first, the overlap's ends cut off each window's output. Written out here, not called, so that each
// window's tensors are let go (evaluateModel keeps them all: a long song would fill the graphics card's memory) and only
// what the notes are made from comes back off the card (the notes' and onsets' frames, not the pitch contours).
// The notes are made from the frames as the offline measurements made them (backlog/engineering/bp.mjs: Basic Pitch's
// outputToNotesPoly with its thresholds 0.5 and 0.3, notes of more than 11 frames, its "melodia trick" that follows the main
// line through a mix), 30 s at a time with 3 s either side: its note-making looks across everything it is given for each
// note it adds, so a whole song at once took minutes, and 30 s pieces are what was measured.
import { tf, loadGraphModel, outputToNotesPoly, noteFramesToTime } from './vendor/basic-pitch.mjs';
import { pathLine } from './melody.js';

const SR = 22050, HOP = 256, FPS = Math.floor(SR / HOP); // (86 frames a second)
const WINDOW = SR * 2 - HOP, OVERLAP = 30, HALF = OVERLAP / 2, STEP = WINDOW - OVERLAP * HOP;
const PIECE = 30 * FPS, SIDE = 3 * FPS, KEYS = 88;

let model = null, backend = '';
async function load() {
  if (model) return model;
  // (TensorFlow.js's packed textures, four numbers to a pixel, made each window 2.5 times slower for this model: 54 ms against
  // 22 on an M-series Mac, measured Nov 11, the time going to packing and unpacking between its layers; the notes the same)
  tf.env().set('WEBGL_PACK', false);
  for (const b of ['webgl', 'cpu']) {
    try { if (await tf.setBackend(b)) { await tf.ready(); backend = b; break; } } catch { /* the next */ }
  }
  model = await loadGraphModel(new URL('./models/basic-pitch/model.json', import.meta.url).href);
  return model;
}

// The notes in the recording: [[start s, length s, midi, loudness]], from its first sample. One window at a time, as Basic
// Pitch runs it (a batch of windows at once came out wrong: the model takes a batch as one stretch of sound; and asking for
// several before reading the first saved nothing), the notes made from each 30 s of frames as soon as the 3 s after it are in.
// A frame: a row of 88 (A0 to C8), 86 a second.
async function hear(audio, progress) {
  const m = await load();
  const padded = new Float32Array(OVERLAP * HOP / 2 + audio.length);
  padded.set(audio, OVERLAP * HOP / 2);
  const want = Math.floor(audio.length * (FPS / SR)), windows = Math.max(1, Math.ceil(padded.length / STEP));
  const fr = [], on = [], notes = [];
  let piece = 0;
  const make = (all) => {
    for (; piece < fr.length && (all || piece + PIECE + SIDE <= fr.length); piece += PIECE) {
      const from = Math.max(0, piece - SIDE), to = Math.min(fr.length, piece + PIECE + SIDE);
      for (const n of outputToNotesPoly(fr.slice(from, to), on.slice(from, to), 0.5, 0.3, 11, true, null, null, true)) {
        const at = from + n.startFrame;
        if (at >= piece && at < piece + PIECE) notes.push({ ...n, startFrame: at });
      }
    }
  };
  for (let w = 0; w < windows && fr.length < want; w++) {
    const win = new Float32Array(WINDOW);
    win.set(padded.subarray(w * STEP, w * STEP + WINDOW));
    const [f, o] = tf.tidy(() => {
      const [fr1, on1] = m.execute(tf.tensor3d(win, [1, WINDOW, 1]), ['Identity_1', 'Identity_2']);
      // (the functions, not the tensor's methods: the bundle leaves those out)
      const cut = (t) => tf.reshape(tf.slice(t, [0, HALF, 0], [-1, t.shape[1] - 2 * HALF, -1]), [-1, KEYS]);
      return [cut(fr1), cut(on1)];
    });
    const [fd, od] = await Promise.all([f.data(), o.data()]);
    tf.dispose([f, o]);
    for (let r = 0; r < fd.length / KEYS && fr.length < want; r++) {
      fr.push(Array.from(fd.subarray(r * KEYS, (r + 1) * KEYS)));
      on.push(Array.from(od.subarray(r * KEYS, (r + 1) * KEYS)));
    }
    make(false);
    progress(fr.length / Math.max(1, want));
  }
  make(true);
  // (the tune: a path through the frames themselves, struck again where a note of Basic Pitch's own starts, melody.js pathLine;
  // its frames to seconds as the notes')
  const line = noteFramesToTime(pathLine(fr, { strikes: notes.map((n) => [n.startFrame, n.pitchMidi]) }).map(([startFrame, durationFrames, pitchMidi, amplitude]) => ({ startFrame, durationFrames, pitchMidi, amplitude })));
  return {
    notes: noteFramesToTime(notes).map((n) => [n.startTimeSeconds, n.durationSeconds, n.pitchMidi, n.amplitude]).sort((x, y) => x[0] - y[0] || x[2] - y[2]),
    line: line.map((n) => [n.startTimeSeconds, n.durationSeconds, n.pitchMidi]),
  };
}

// (a failure inside TensorFlow.js's own waits never reaches the try below: said here, so the page isn't left waiting)
self.addEventListener('unhandledrejection', (e) => postMessage({ type: 'error', error: String(e.reason?.message || e.reason) }));
self.onmessage = async ({ data: { audio } }) => {
  try {
    const t0 = performance.now();
    await load();
    postMessage({ type: 'ready', backend });
    const { notes, line } = await hear(audio, (done) => postMessage({ type: 'progress', done }));
    postMessage({ type: 'notes', notes, line, backend, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    postMessage({ type: 'error', error: String(err?.message || err) });
  }
};
