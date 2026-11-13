// The spectrograms htdemucs is given and gives back (renderer/stems-worker.js): the model (Défossez's hybrid transformer Demucs)
// takes each 7.8 s segment twice, as a waveform and as its spectrogram, and answers each part the same two ways. What the
// spectrogram is, is the model's own definition (demucs/htdemucs.py, _spec and _ispec), written out here in plain JS:
//   n_fft 4096, hop 1024, a periodic Hann window, "normalized" (each transform divided by sqrt(4096)), "centered";
//   the segment padded by reflection with 1536 samples before it and up to a whole number of hops (plus 1536) after it;
//   the top bin (the 2049th) and two frames at each end left out: 2048 bins by 336 frames for a 343,980-sample segment.
// The inverse puts the left-out bin and frames back as zeros, transforms, overlap-adds and takes the padding off again.
// Only what the worker needs: the input for one segment, and one part's waveform, mono (the mean of its two channels, taken
// in the spectrum, where it costs one inverse instead of two).
export const SEG = 343980, NFFT = 4096, HOP = 1024, BINS = 2048, FRAMES = 336;
const PAD = (HOP >> 1) * 3;                       // 1536: the model's own padding either side
const FULL = FRAMES + 4;                          // frames before the two at each end are left out
const HALF = NFFT >> 1, LOG = 12, SCALE = 1 / Math.sqrt(NFFT);

const WINDOW = new Float64Array(NFFT);
for (let i = 0; i < NFFT; i++) WINDOW[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / NFFT));
const COS = new Float64Array(HALF), SIN = new Float64Array(HALF), REV = new Uint16Array(NFFT);
for (let k = 0; k < HALF; k++) { COS[k] = Math.cos(2 * Math.PI * k / NFFT); SIN[k] = Math.sin(2 * Math.PI * k / NFFT); }
for (let i = 0; i < NFFT; i++) { let r = 0; for (let b = 0; b < LOG; b++) r |= ((i >> b) & 1) << (LOG - 1 - b); REV[i] = r; }

// A 4096-point transform in place (re and im already in bit-reversed order): sign -1 forward, +1 inverse (not divided by n)
function transform(re, im, sign) {
  for (let size = 2; size <= NFFT; size <<= 1) {
    const half = size >> 1, step = NFFT / size;
    for (let i = 0; i < NFFT; i += size) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const c = COS[k], s = sign * SIN[k], a = i + j, b = a + half;
        const or = re[b] * c - im[b] * s, oi = re[b] * s + im[b] * c;
        re[b] = re[a] - or; im[b] = im[a] - oi; re[a] += or; im[a] += oi;
      }
    }
  }
}
// (exported for the tests: a forward transform of a real 4096-sample frame, and the inverse of a full spectrum)
export function fft4096(frame) {
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) re[i] = frame[REV[i]];
  transform(re, im, -1);
  return { re, im };
}
export function ifft4096(specRe, specIm) {
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) { re[i] = specRe[REV[i]]; im[i] = specIm[REV[i]]; }
  transform(re, im, 1);
  for (let i = 0; i < NFFT; i++) { re[i] /= NFFT; im[i] /= NFFT; }
  return { re, im };
}

// Padding by reflection (the edge sample itself not repeated), an index at a time: where sample k of a signal of length n
// padded this way comes from
const reflect = (k, n) => (k < 0 ? Math.min(-k, n - 1) : k >= n ? Math.max(0, 2 * n - 2 - k) : k);

// One channel's spectrogram, as the model wants it, written into out at [at + bin * FRAMES + frame] (real) and
// [at + BINS * FRAMES + bin * FRAMES + frame] (imaginary). x: SEG samples.
const inner = PAD + SEG + (PAD + Math.ceil(SEG / HOP) * HOP - SEG);   // the segment with the model's own padding: 347,136
function channelSpec(x, out, at) {
  const padded = new Float32Array(inner + NFFT);                      // ... and half a window either side (centred frames)
  for (let j = 0; j < padded.length; j++) padded[j] = x[reflect(reflect(j - HALF, inner) - PAD, SEG)];
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), size = BINS * FRAMES;
  for (let f = 0; f < FRAMES; f++) {
    const start = (f + 2) * HOP;                                      // (the two frames at each end are left out)
    for (let i = 0; i < NFFT; i++) { const r = REV[i]; re[i] = padded[start + r] * WINDOW[r]; im[i] = 0; }
    transform(re, im, -1);
    for (let b = 0; b < BINS; b++) { out[at + b * FRAMES + f] = re[b] * SCALE; out[at + size + b * FRAMES + f] = im[b] * SCALE; }
  }
}

// What the model is fed for one segment: { waveform: [left, right] one after the other, magSpec: left real, left imaginary,
// right real, right imaginary, each BINS x FRAMES }. With one channel given twice its spectrogram is made once.
export function modelInput(left, right = left) {
  const waveform = new Float32Array(2 * SEG), size = BINS * FRAMES, magSpec = new Float32Array(4 * size);
  waveform.set(left.subarray(0, SEG), 0); waveform.set(right.subarray(0, SEG), SEG);
  channelSpec(left, magSpec, 0);
  if (right === left) magSpec.copyWithin(2 * size, 0, 2 * size); else channelSpec(right, magSpec, 2 * size);
  return { waveform, magSpec };
}

// How much window lies over each output sample (the squares of every frame's window, the zero frames at the ends included,
// as the inverse transform counts them): the same for every call
const OUT = (FULL - 1) * HOP + NFFT;
const COVER = new Float32Array(OUT);
for (let f = 0; f < FULL; f++) for (let i = 0; i < NFFT; i++) COVER[f * HOP + i] += WINDOW[i] * WINDOW[i];

// One part's waveform from the model's spectrogram output, mono: freq is the whole answer ([part][left real, left imaginary,
// right real, right imaginary][bin][frame]), part its number (drums 0, bass 1, other 2, vocals 3). -> Float32Array(length)
export function partWave(freq, part, length = SEG) {
  const size = BINS * FRAMES, at = part * 4 * size, sum = new Float64Array(OUT);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const root = Math.sqrt(NFFT);
  for (let f = 0; f < FRAMES; f++) {
    // the frame's spectrum, its two channels averaged, mirrored into the upper half (a real signal's), in bit-reversed order
    re.fill(0); im.fill(0);
    for (let b = 0; b < BINS; b++) {
      const r = (freq[at + b * FRAMES + f] + freq[at + 2 * size + b * FRAMES + f]) / 2, i = (freq[at + size + b * FRAMES + f] + freq[at + 3 * size + b * FRAMES + f]) / 2;
      re[REV[b]] = r; im[REV[b]] = i;
      if (b > 0) { re[REV[NFFT - b]] = r; im[REV[NFFT - b]] = -i; }
    }
    transform(re, im, 1);
    const start = (f + 2) * HOP;
    for (let i = 0; i < NFFT; i++) sum[start + i] += (re[i] / NFFT) * WINDOW[i] * root;
  }
  const out = new Float32Array(length), off = HALF + PAD;
  for (let i = 0; i < length; i++) { const c = COVER[off + i]; out[i] = c > 1e-8 ? sum[off + i] / c : sum[off + i]; }
  return out;
}
