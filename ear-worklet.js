// What Toaster heard, the last ten minutes of it, kept on the audio thread for the export's tune (renderer/ear.js runs it and
// asks for a stretch when X is pressed). Mono, at a half or a quarter of the audio clock's rate (24 kHz at 48, 22.05 at 44.1:
// Basic Pitch hears at 22.05), 16-bit: 29 MB for ten minutes at 48 kHz. Nothing is played (no outputs) and nothing is sent
// while it listens.
//
// Two channels are kept as their middle (the mono above, as it always was) and, once a sound's two channels differ, their
// side (half the left less half the right) beside it: another 29 MB, made only then. Left is the middle plus the side, right
// the middle less it. The voice splitter is what wants them (stems.js): measured Nov 12 on 14 sung songs, the tune read from
// the voice split out of two channels covers 0.80 of the sung moments, out of one 0.71 (the rate made no difference).
//
// Each sample kept is the sound low-passed below its new rate (a windowed sinc, so nothing above it folds down into the notes)
// and then one of every D taken. Kept sample k is the sound at the audio clock's frame frame0 + k * D: frame0 is the first
// frame heard less the filter's delay. Should the audio clock ever skip (a stretch with nothing to process), the stretch is
// kept as silence, so that stays true.
//
// A stretch asked for goes back in pieces of at most PIECE samples, one piece each time the audio thread comes round (every
// 128 frames): ten minutes copied at once would hold up the sound being played for longer than it can wait.
const TAPS = 63, PIECE = 1 << 17;

class Ear extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const seconds = options?.processorOptions?.seconds || 600;
    this.D = Math.max(1, Math.floor(sampleRate / 22050));
    this.ring = new Int16Array(Math.ceil((seconds * sampleRate) / this.D));
    this.kept = 0; // samples kept so far (the next goes at kept % ring.length)
    this.heard = 0; // input samples heard so far
    this.frame0 = null;
    this.next = null; // the frame the next process() should start on
    // the filter: a sinc at 0.45 of the new rate's width, Blackman-windowed, summing to 1
    const fc = 0.45 / this.D, h = new Float32Array(TAPS), mid = (TAPS - 1) / 2;
    let sum = 0;
    for (let i = 0; i < TAPS; i++) {
      const x = i - mid, sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
      const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (TAPS - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (TAPS - 1));
      sum += h[i] = sinc * w;
    }
    for (let i = 0; i < TAPS; i++) h[i] /= sum;
    this.h = h;
    this.hist = new Float32Array(TAPS * 2); // the last TAPS samples, twice over, so a window is always one straight run
    this.side = null; // the side's ring, made the first time the two channels differ
    this.hist2 = new Float32Array(TAPS * 2);
    this.at = 0;
    this.job = null;
    this.port.onmessage = ({ data }) => { if (data?.ask) this.ask(data.id, data.ask); };
  }

  process(inputs) {
    const input = inputs[0] || [], n = input[0]?.length || 128, ch = input.length;
    if (this.frame0 === null) { this.frame0 = currentFrame - (TAPS - 1) / 2; this.next = currentFrame; }
    if (currentFrame !== this.next) {
      const jump = currentFrame - this.next;
      // a quantum handed over again (the clock a quantum back, then on again: seen Nov 13 in two hidden runs of three, a minute in):
      // dropped, 2.7 ms, and `next` left where it was. It used to start the ring over, and X heard only what came after it.
      if (jump < 0 && -jump < sampleRate) { this.port.postMessage({ skipped: jump, at: currentFrame, dropped: true }); return true; }
      this.skip(jump);
    }
    this.next = currentFrame + n;
    if (this.job) this.send(); // (before this quantum is kept: a stretch starting at the oldest sample is sent before it's written over)
    const { h, hist, hist2, ring, D } = this;
    for (let i = 0; i < n; i++) {
      let x = 0;
      for (let c = 0; c < ch; c++) x += input[c][i];
      if (ch > 1) x /= ch;
      const s = ch === 2 ? (input[0][i] - input[1][i]) / 2 : 0;
      hist[this.at] = hist[this.at + TAPS] = x;
      hist2[this.at] = hist2[this.at + TAPS] = s;
      this.at = (this.at + 1) % TAPS;
      if (this.heard++ % D === 0) {
        // (the window, oldest to newest, starts at this.at; the filter is symmetric, so which way round doesn't matter)
        let y = 0;
        for (let k = 0, j = this.at; k < TAPS; k++, j++) y += h[k] * hist[j];
        const at = this.kept++ % ring.length;
        ring[at] = Math.max(-32768, Math.min(32767, Math.round(y * 32767)));
        if (s !== 0 && !this.side) this.side = new Int16Array(ring.length); // (everything before it was the same in both channels: zeros)
        if (this.side) {
          let z = 0;
          for (let k = 0, j = this.at; k < TAPS; k++, j++) z += h[k] * hist2[j];
          this.side[at] = Math.max(-32768, Math.min(32767, Math.round(z * 32767)));
        }
      }
    }
    return true;
  }

  // the audio clock went on by `frames` with nothing processed: kept as silence; the filter starts afresh. A skip longer than the
  // ring, or back by more than a second (a clock that really started over), starts the ring over.
  skip(frames) {
    this.port.postMessage({ skipped: frames, at: currentFrame, kept: this.kept });   // (rare: said, so a lost stretch can be seen)
    this.hist.fill(0); this.hist2.fill(0);
    const { ring, D } = this;
    if (frames < 0 || frames / D >= ring.length) {
      this.side?.fill(0);
      this.kept = 0; this.heard = 0; this.frame0 = this.next + frames - (TAPS - 1) / 2; this.job = null;
      return;
    }
    // (the input samples skipped, and as many kept samples as they make: the same count heard++ % D would have kept)
    const k0 = Math.ceil(this.heard / D), k1 = Math.ceil((this.heard + frames) / D);
    for (let k = k0; k < k1; k++) { ring[k % ring.length] = 0; if (this.side) this.side[k % ring.length] = 0; }
    this.kept += k1 - k0;
    this.heard += frames;
  }

  // ask: [from, to], the audio clock's frames. Answers { id, frame0, D, length, wide } (data[k], once together, is the sound at frame
  // frame0 + k * D, as -32768..32767; wide: a side is kept too), then the samples in pieces { id, at, data, side? }, then { id, done }; or { id, length: 0 } when
  // none of it is kept.
  ask(id, [from, to]) {
    const { ring, D } = this, oldest = Math.max(0, this.kept - ring.length);
    const a = this.frame0 === null ? 0 : Math.max(oldest, Math.ceil((from - this.frame0) / D));
    const b = this.frame0 === null ? 0 : Math.min(this.kept, Math.floor((to - this.frame0) / D) + 1);
    if (!(b > a)) { this.job = null; this.port.postMessage({ id, length: 0 }); return; }
    this.job = { id, a, b, at: a };
    this.port.postMessage({ id, frame0: this.frame0 + a * D, D, length: b - a, wide: !!this.side });
  }

  send() {
    const { ring } = this, job = this.job, oldest = Math.max(0, this.kept - ring.length);
    if (job.at < oldest) job.at = oldest; // (overwritten while it was being sent: it can't be, at this pace, but never send stale)
    const n = Math.min(PIECE, job.b - job.at), data = new Int16Array(n), i = job.at % ring.length;
    const first = Math.min(n, ring.length - i);
    data.set(ring.subarray(i, i + first));
    if (first < n) data.set(ring.subarray(0, n - first), first);
    // (the side of the same samples goes with them, where there is one)
    let side = null;
    if (this.side) { side = new Int16Array(n); side.set(this.side.subarray(i, i + first)); if (first < n) side.set(this.side.subarray(0, n - first), first); }
    this.port.postMessage(side ? { id: job.id, at: job.at - job.a, data, side } : { id: job.id, at: job.at - job.a, data }, side ? [data.buffer, side.buffer] : [data.buffer]);
    job.at += n;
    if (job.at >= job.b) { this.port.postMessage({ id: job.id, done: true }); this.job = null; }
  }
}
registerProcessor('ear', Ear);
