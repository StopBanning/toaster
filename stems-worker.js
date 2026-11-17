// The singer's voice, pulled out of a recording: htdemucs (Défossez and others, the hybrid transformer Demucs, MIT) run by
// onnxruntime-web, off the page's thread. Only the export uses it (renderer/stems.js, from tune.js), when X is pressed; nothing
// live does. The tune is then read from the voice alone (renderer/voice.js): where she is silent, the stem is silent, which no
// reading of the whole mix could tell (ENGINEERING-NOV10.md, Nov 12).
//
// Built into the app (Colin, Nov 13: "build it in"): the runtime is a dependency (onnxruntime-web, MIT; the packager keeps only the
// bundle and its two engines), and the model, renderer/models/htdemucs/htdemucs_embedded.onnx, is the half-size one (88 MB: its
// weights stored at half precision and cast back as it loads; measured inaudible), put there by tools/fetch-splitter.mjs before a
// build. Where either is missing it answers { type: 'absent' } and the export goes on as before. The spectrograms the model wants
// are our own (stems-stft.js).
//
// Asked { audio, right, rate, prefer, parts }: a Float32Array at `rate` (the ear's 22050 Hz, or 44100), mono, or the left
// channel with `right` beside it; prefer 'webgpu' (the graphics card) or
// 'wasm' (the processor). Answers { type: 'ready', backend, threads } once the model is loaded, { type: 'progress', done }
// (0..1) a segment at a time, then { type: 'vocals', audio (mono, the same rate and length, sample for sample), parts
// ({ other, bass, drums }: those asked for in `parts`, the same shape), backend, threads, ms, loadMs }; or { type: 'absent', why }; or { type: 'error', error }.
//
// The model takes 7.8 s of 44.1 kHz stereo at a time (343,980 samples) and gives four parts, each as a waveform plus a
// spectrogram to turn back into one. Only the parts asked for are turned back (the vocals alone: a quarter of that work), the
// segments overlap by a quarter and are cross-faded.
import { up2, down2, segmentStarts, fadeWeight } from './stems.js';
import { modelInput, partWave, SEG, BINS, FRAMES } from './stems-stft.js';

const HERE = new URL('.', import.meta.url);
const MODEL = new URL('./models/htdemucs/htdemucs_embedded.onnx', HERE);
const TRACKS = ['drums', 'bass', 'other', 'vocals']; // (the model's order)
const SEGMENT_OVERLAP = 0.25;                           // (each segment starts three quarters of a segment after the last)

self.onmessage = async ({ data }) => {
  const t0 = performance.now();
  let ort;
  try { ort = await import(new URL('../node_modules/onnxruntime-web/dist/ort.all.min.mjs', HERE).href); }
  catch (err) { return self.postMessage({ type: 'absent', why: 'the voice splitter is not installed (' + String(err?.message || err).slice(0, 120) + ')' }); }
  try {
    const got = await fetch(MODEL).catch(() => null);
    if (!got || !got.ok) return self.postMessage({ type: 'absent', why: 'the voice splitter\'s model is not installed' });
    const model = await got.arrayBuffer();
    // (threads need shared memory: a page has it when it is cross-origin isolated, or when the app was started with it
    // switched on; without it, one thread)
    const threads = typeof SharedArrayBuffer === 'function' ? Math.max(1, Math.min(12, data.threads || navigator.hardwareConcurrency || 4)) : 1;
    ort.env.wasm.wasmPaths = new URL('../node_modules/onnxruntime-web/dist/', HERE).href;
    ort.env.wasm.numThreads = threads;
    const want = data.prefer === 'wasm' ? ['wasm'] : ['webgpu', 'wasm'];
    let session = null, backend = '';
    for (const ep of want) {
      if (ep === 'webgpu' && !navigator.gpu) continue;
      try { session = await ort.InferenceSession.create(model, { executionProviders: [ep], graphOptimizationLevel: 'basic' }); backend = ep; break; } catch (err) { if (ep === want.at(-1)) throw err; }
    }
    if (!session) throw new Error('no way to run the model here');
    const loadMs = Math.round(performance.now() - t0);
    self.postMessage({ type: 'ready', backend, threads });

    const rate = data.rate || 22050;
    if (rate !== 22050 && rate !== 44100) throw new Error('the voice splitter takes 22050 or 44100 Hz');
    // (one channel, given to the model as both; or two: `right` beside `audio`, the left)
    const left = rate === 22050 ? up2(data.audio) : data.audio, right = data.right ? (rate === 22050 ? up2(data.right) : data.right) : left, total = left.length;
    const stride = Math.floor(SEG * (1 - SEGMENT_OVERLAP));
    // (the vocals always; `parts` asks for others too: the chords are read from what is left with the drums and the voice out)
    const wanted = ['vocals', ...(data.parts || []).filter((p) => TRACKS.includes(p) && p !== 'vocals')];
    const outs = Object.fromEntries(wanted.map((p) => [p, new Float32Array(total)])), weight = new Float32Array(total);
    const starts = segmentStarts(total, SEG, SEGMENT_OVERLAP);
    const seg = new Float32Array(SEG), segR = right === left ? seg : new Float32Array(SEG), spent = { prep: 0, run: 0, back: 0 }; // (ms in the STFT, in the model, in turning the vocals back)
    for (let k = 0; k < starts.length; k++) {
      const start = starts[k], n = Math.min(SEG, total - start);
      seg.fill(0); seg.set(left.subarray(start, start + n));
      if (segR !== seg) { segR.fill(0); segR.set(right.subarray(start, start + n)); }
      let t = performance.now();
      const input = modelInput(seg, segR);
      spent.prep += performance.now() - t; t = performance.now();
      const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input.waveform, [1, 2, SEG]) };
      if (session.inputNames.length > 1) feeds[session.inputNames[1]] = new ort.Tensor('float32', input.magSpec, [1, 4, BINS, FRAMES]);
      const res = await session.run(feeds);
      spent.run += performance.now() - t; t = performance.now();
      let time = null, shape = null, freq = null;
      for (const name of session.outputNames) {
        const o = res[name];
        if (o.dims.length === 4 && o.dims[2] === 2) { time = o.data; shape = o.dims; } else if (o.dims.length === 5 && o.dims[2] === 4) freq = o.data;
      }
      if (!time) throw new Error('the model gave no waveform');
      const samples = shape[3], chans = shape[2];
      // each part asked for: its waveform (left and right averaged) plus its spectrogram turned back into one, cross-faded in
      for (const part of wanted) {
        const tr = TRACKS.indexOf(part), v = new Float32Array(n), base = tr * chans * samples;
        for (let i = 0; i < n; i++) v[i] = (time[base + i] + time[base + samples + i]) / 2;
        if (freq) { const back = partWave(freq, tr, n); for (let i = 0; i < n; i++) v[i] += back[i]; }
        const o = outs[part];
        for (let i = 0; i < n; i++) o[start + i] += v[i] * fadeWeight(i, n, stride);
      }
      for (const r of Object.values(res)) r.dispose?.();
      for (let i = 0; i < n; i++) weight[start + i] += fadeWeight(i, n, stride);
      spent.back += performance.now() - t;
      self.postMessage({ type: 'progress', done: (k + 1) / starts.length });
    }
    const parts = {};
    for (const part of wanted) {
      const o = outs[part];
      for (let i = 0; i < total; i++) if (weight[i] > 0) o[i] /= weight[i];
      parts[part] = rate === 22050 ? down2(o) : o;
    }
    await session.release?.();
    const audio = parts.vocals; delete parts.vocals;
    self.postMessage({ type: 'vocals', audio, parts, backend, threads, ms: Math.round(performance.now() - t0), loadMs, segments: starts.length, spent: { prep: Math.round(spent.prep), run: Math.round(spent.run), back: Math.round(spent.back) } }, [audio.buffer, ...Object.values(parts).map((p) => p.buffer)]);
  } catch (err) { self.postMessage({ type: 'error', error: String(err?.message || err) }); }
};
