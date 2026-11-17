// What Toaster heard, kept for the export's tune (renderer/tune.js): the last ten minutes of whatever the analysis hears (a
// file, the radio, system audio, an input, the demo), on the audio thread (ear-worklet.js), and handed over as a stretch of
// the engine's time when X is pressed. Nothing live reads it.
//
// The engine's time is the clock's (clock.js): while a song plays, the audio clock plus a constant (clock.audioOffset), which
// changes only when the audio clock restarts or a source is taken hold of again. The constant is noted as it changes (looked at
// four times a second), so a stretch heard before the last change, the song before the one playing, is still found where it was.
//
//   const ear = await createEar(ac, clock);  ear.connect(sourceNode);  (in attach, beside the analysers)
//   await ear.hear(t0, t1)   -> { audio: Float32Array, mono at 22050 Hz (the two channels' middle), side: the same length (half
//                               the left less half the right) or null where they never differed, t0: the engine's time of audio[0], missed: [seconds asked for
//                               and not kept before the stretch, after it, how far the clock's constant moved across it] } or null
export const RATE = 22050;

export async function createEar(ac, clock, { seconds = 600 } = {}) {
  await ac.audioWorklet.addModule(new URL('./ear-worklet.js', import.meta.url));
  const node = new AudioWorkletNode(ac, 'ear', {
    numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers', // (two: the worklet keeps their middle and, where they differ, their side)
    processorOptions: { seconds },
  });
  const sr = ac.sampleRate;
  // the constant, as it was from each time on: [[engine time, offset]]
  const offsets = [];
  const note = () => {
    const A = clock.audioOffset;
    if (Number.isFinite(A) && !(offsets.length && Math.abs(offsets.at(-1)[1] - A) < 1e-3)) offsets.push([clock.now(), A]);
    if (offsets.length > 512) offsets.splice(0, offsets.length - 512);
  };
  const timer = setInterval(note, 250);
  const offsetAt = (t) => {
    note();
    let A = offsets[0]?.[1];
    for (const [from, a] of offsets) if (from <= t) A = a; else break;
    return A;
  };

  let asked = 0, pending = null;
  node.port.onmessage = ({ data }) => {
    if (data?.skipped !== undefined) { console.info(`the ear: the audio clock ${data.dropped ? `handed over a quantum again at frame ${data.at}: dropped` : data.skipped < 0 ? `went back ${-data.skipped} frames at frame ${data.at}: what was kept starts over` : `skipped ${data.skipped} frames at frame ${data.at}: kept as silence`}`); return; }
    const p = pending;
    if (!p || data.id !== p.id) return;
    if (data.length === 0) { pending = null; p.resolve(null); return; }
    if (data.length) { p.head = data; p.samples = new Int16Array(data.length); p.side = data.wide ? new Int16Array(data.length) : null; return; }
    if (data.data) { p.samples.set(data.data, data.at); if (data.side && p.side) p.side.set(data.side, data.at); return; }
    if (data.done) { pending = null; p.resolve({ ...p.head, data: p.samples, side: p.side }); }
  };
  // the stretch of frames [f0, f1] as kept: { frame0, D, data }, or null
  const fetch = (f0, f1) => new Promise((resolve) => {
    pending?.resolve(null);
    pending = { id: ++asked, resolve };
    node.port.postMessage({ id: asked, ask: [f0, f1] });
    // (the answer takes a fraction of a second; a silent audio thread, a suspended context, never answers)
    setTimeout(() => { if (pending?.resolve === resolve) { pending = null; resolve(null); } }, 10000);
  });

  return {
    node,
    connect(source) { try { source.connect(node); } catch { /* a source that can't be heard */ } },
    // the sound from engine time t0 to t1, at 22050 Hz: its middle (mono), and its side where the channels differed
    async hear(t0, t1) {
      const A0 = offsetAt(t0), A1 = offsetAt(t1);
      if (!Number.isFinite(A0) || !Number.isFinite(A1) || !(t1 > t0)) return null;
      const f0 = Math.floor((t0 - A0) * sr), f1 = Math.ceil((t1 - A1) * sr);
      const got = await fetch(f0, f1);
      if (!got || got.data.length < 2) return null;
      // (resampled to Basic Pitch's rate by the browser's own resampler: the samples written out as a WAV file and decoded; with
      // a side kept, a two-channel file, the middle and the side, so both come back resampled alike)
      const rate = sr / got.D, n = got.data.length, chans = got.side ? 2 : 1, wav = new ArrayBuffer(44 + n * 2 * chans), v = new DataView(wav);
      const text = (at, s) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
      text(0, 'RIFF'); v.setUint32(4, 36 + n * 2 * chans, true); text(8, 'WAVEfmt '); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, chans, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2 * chans, true);
      v.setUint16(32, 2 * chans, true); v.setUint16(34, 16, true); text(36, 'data'); v.setUint32(40, n * 2 * chans, true);
      const pcm = new Int16Array(wav, 44);
      if (got.side) for (let i = 0; i < n; i++) { pcm[2 * i] = got.data[i]; pcm[2 * i + 1] = got.side[i]; } else pcm.set(got.data);
      const decoded = await new OfflineAudioContext(chans, 1, RATE).decodeAudioData(wav);
      const audio = new Float32Array(decoded.length);
      decoded.copyFromChannel(audio, 0); // (its own copy, free to hand to a worker)
      let side = null;
      if (got.side) { side = new Float32Array(decoded.length); decoded.copyFromChannel(side, 1); }
      // (missed: the seconds asked for that were not kept, before the stretch and after it; after, the song may simply not be over)
      return { audio, side, t0: got.frame0 / sr + offsetAt(got.frame0 / sr + A0), missed: [Math.max(0, got.frame0 - f0) / sr, Math.max(0, f1 - got.frame0 - got.data.length * got.D) / sr, A1 - A0] };
    },
    stop() { clearInterval(timer); try { node.disconnect(); } catch { /* not connected */ } node.port.onmessage = null; },
  };
}
