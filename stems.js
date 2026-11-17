// The voice pulled out of a stretch of recording, for the export's tune (renderer/tune.js): the worker (stems-worker.js) started
// now and let go after. Where the splitter is not installed, or it fails, or it takes too long, the answer says why and the
// export's tune is read from the whole mix as before.
//
//   await splitVoice(audio, { rate, prefer, parts, onProgress })  -> { vocals: Float32Array (mono, the same rate and length), parts: { other?, bass?, drums? }
//                                                             (those asked for in `parts`), backend, ms }
//                                                             or { vocals: null, why, absent? }
export function splitVoice(audio, { rate = 22050, prefer = 'webgpu', threads = 0, parts = [], right = null, onProgress = () => {}, WorkerClass = globalThis.Worker } = {}) {
  return new Promise((resolve) => {
    let worker, done = false, timer = null;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { worker?.terminate(); } catch { /* gone already */ }
      resolve(result);
    };
    try { worker = new WorkerClass(new URL('./stems-worker.js', import.meta.url), { type: 'module' }); } catch (err) { return finish({ vocals: null, why: String(err?.message || err) }); }
    // (on this Mac about 3 s of sound a second; a plain machine's processor about 1: so twice the stretch's own length, and a minute)
    const seconds = audio.length / rate;
    timer = setTimeout(() => finish({ vocals: null, why: 'pulling the voice out took too long' }), 60000 + seconds * 2000);
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') return;
      if (data.type === 'progress') onProgress(data.done);
      else if (data.type === 'vocals') finish({ vocals: data.audio, parts: data.parts || {}, backend: data.backend, threads: data.threads, ms: data.ms, loadMs: data.loadMs, segments: data.segments, spent: data.spent });
      else if (data.type === 'absent') finish({ vocals: null, absent: true, why: data.why });
      else finish({ vocals: null, why: data.error || 'the voice could not be pulled out' });
    };
    worker.onerror = (e) => { e.preventDefault?.(); finish({ vocals: null, why: e.message || 'the voice could not be pulled out' }); };
    try { worker.postMessage({ audio, right, rate, prefer, threads, parts }, right ? [audio.buffer, right.buffer] : [audio.buffer]); } catch (err) { finish({ vocals: null, why: String(err?.message || err) }); }
  });
}

// ---------------------------------------------------------------- the worker's arithmetic (here so it can be tested; stems-worker.js uses it)
// 22050 -> 44100 (a sample between each two, the mean of its neighbours) and back (each pair's mean): the model was trained at
// 44.1 kHz, and the voice's pitch lives far under either rate's limit. Back and forth, a sample is 3/4 itself and 1/4 the next.
export function up2(x) {
  const y = new Float32Array(x.length * 2);
  for (let i = 0; i < x.length; i++) { y[2 * i] = x[i]; y[2 * i + 1] = (x[i] + (i + 1 < x.length ? x[i + 1] : x[i])) / 2; }
  return y;
}
export function down2(y) {
  const x = new Float32Array(y.length >> 1);
  for (let i = 0; i < x.length; i++) x[i] = (y[2 * i] + y[2 * i + 1]) / 2;
  return x;
}
// Where each of the model's segments starts: `seg` samples long, each overlapping the one before by `overlap` of its length.
// A last segment that would start inside the one before's reach is left out: that one already covers the end.
export function segmentStarts(total, seg, overlap = 0.25) {
  const stride = Math.floor(seg * (1 - overlap)), lap = seg - stride, starts = [];
  for (let s = 0; s === 0 || s + lap < total; s += stride) starts.push(s);
  return starts;
}
// The cross-fade over a segment's n samples: up over half a stride at its start, down over half a stride at its end, never 0
// (a segment's own edge still counts for something where it is the only one there)
export const fadeWeight = (i, n, stride) => Math.max(1e-3, Math.min(1, i / (stride * 0.5), (n - i) / (stride * 0.5)));

