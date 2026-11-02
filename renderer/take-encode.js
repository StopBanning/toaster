// The perfect take's encoder (stream B): the take's pictures and sound in, an MP4 out, made with the browser's own encoders
// (WebCodecs) and mp4-muxer, no ffmpeg. The picture is H.264 (High, else Main, else Baseline: whatever this computer's
// encoder takes, its hardware one where it has it); the sound is AAC where the platform can write it, else Opus.
//
// Timing is by count, never by a clock: frame k is at k / fps and the sound's sample n at n / sampleRate, both from 0, so
// the picture and the sound can't drift apart. AAC encoders start with a stretch of "priming" (2112 samples on the Mac)
// that players play as sound, and mp4-muxer writes no edit list to skip it, so that many samples are dropped from the front
// of the sound instead: everything after lands on its own time. The priming is measured, not assumed (audioPriming): an
// impulse goes through the encoder and back through the decoder, and where it comes out says how far it was held.
//
// wc is where the WebCodecs classes come from (the page's own; the tests pass stand-ins).
import { Muxer, StreamTarget } from '../node_modules/mp4-muxer/build/mp4-muxer.mjs';

export const KEY_EVERY = 2; // seconds between key frames
const H264 = [['avc1.64', 'High'], ['avc1.4d', 'Main'], ['avc1.42', 'Baseline']];
// H.264's levels, the lowest the picture fits: [level, the most macroblocks a frame, the most a second]. 1080x1920 at 60 fps is
// 4.2; a wider recording (1920x1200, from a window shaped like the screen) needs 5.0.
const LEVELS = [[0x28, 8192, 245760], [0x2a, 8704, 522240], [0x32, 22080, 589824], [0x33, 36864, 983040], [0x34, 36864, 2073600]];
export function h264Level(width, height, fps) {
  const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
  const fit = LEVELS.find(([, frame, second]) => mbs <= frame && mbs * fps <= second);
  return fit ? fit[0].toString(16) : null;
}
const AAC_FRAME = 1024, OPUS_FRAME_US = 20000;

// the picture's bit rate: 12 Mbps for 1080x1920 at 30 fps, more for more pixels or frames (16 Mbps at 60 fps)
export const videoBitrate = (width, height, fps) => Math.round(12e6 * ((width * height) / (1080 * 1920)) * (fps > 30 ? 4 / 3 : 1));

// The configurations to encode with: the first H.264 profile and the first sound codec this computer takes at this size
// and rate. Throws, in words, when there's none. audioCodec 'opus' skips AAC (the tests use it); channels 0 means no sound.
export async function pickCodecs({ width, height, fps, sampleRate, channels, audioCodec }, wc = globalThis) {
  if (width % 2 || height % 2) throw new Error(`the picture must be an even number of pixels each way (it's ${width}x${height})`);
  let video = null;
  const level = h264Level(width, height, fps);
  if (!level) throw new Error(`a picture of ${width}x${height} at ${fps} fps is too big for H.264`);
  for (const [prefix, profile] of H264) {
    const config = { codec: `${prefix}00${level}`, width, height, bitrate: videoBitrate(width, height, fps), framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } };
    if ((await wc.VideoEncoder.isConfigSupported(config)).supported) { video = { ...config, profile }; break; }
  }
  if (!video) throw new Error(`this computer can't encode H.264 video at ${width}x${height}`);
  if (!channels) return { video, audio: null };
  const aac = { codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 192000 };
  const opus = { codec: 'opus', sampleRate, numberOfChannels: channels, bitrate: 192000, opus: { frameDuration: OPUS_FRAME_US } };
  for (const config of audioCodec === 'opus' ? [opus] : [aac, opus]) {
    if ((await wc.AudioEncoder.isConfigSupported(config)).supported) return { video, audio: config };
  }
  throw new Error(`this computer can't encode the sound (${channels} channels at ${sampleRate} Hz) as AAC or Opus`);
}

// How many samples the encoder holds the sound back by: an impulse 0.1 s into half a second of silence, encoded, decoded
// back, and found. Only AAC needs it (Opus says its own delay in the file, and players honour it).
export async function audioPriming(config, wc = globalThis) {
  if (!config.codec.startsWith('mp4a')) return 0;
  const { sampleRate: rate, numberOfChannels: ch } = config, n = Math.round(rate / 2), at = Math.round(rate / 10);
  const click = impulse(rate), data = new Float32Array(n * ch);
  for (let c = 0; c < ch; c++) data.set(click, c * n + at);
  const chunks = [];
  let decoderConfig = null, error = null;
  const enc = new wc.AudioEncoder({ output: (chunk, meta) => { if (meta?.decoderConfig) decoderConfig = meta.decoderConfig; chunks.push(chunk); }, error: (e) => { error = e; } });
  enc.configure(config);
  enc.encode(new wc.AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: n, numberOfChannels: ch, timestamp: 0, data }));
  await enc.flush();
  enc.close();
  if (error || !decoderConfig) throw new Error('the sound encoder failed its first test' + (error ? ': ' + error.message : ''));
  const out = [];
  const dec = new wc.AudioDecoder({ output: (d) => { const f = new Float32Array(d.numberOfFrames); d.copyTo(f, { planeIndex: 0, format: 'f32-planar' }); out.push(f); d.close(); }, error: (e) => { error = e; } });
  dec.configure(decoderConfig);
  for (const c of chunks) dec.decode(c);
  await dec.flush();
  dec.close();
  if (error) throw new Error('the sound decoder failed the encoder\'s first test: ' + error.message);
  const heard = new Float32Array(out.reduce((a, f) => a + f.length, 0));
  out.reduce((o, f) => { heard.set(f, o); return o + f.length; }, 0);
  const found = bestMatch(heard, click);
  if (found < 0) throw new Error('the sound encoder\'s first test came back silent');
  return found - at;
}

// a 2 ms click: 3 kHz under a Hann window (easy to find again after a lossy encoder)
export function impulse(rate) {
  const n = Math.round(rate / 500);
  return Float32Array.from({ length: n }, (_, i) => 0.8 * Math.sin((2 * Math.PI * 3000 * i) / rate) * Math.sin((Math.PI * i) / n) ** 2);
}
// where in a the template t matches best (the start of the match), or -1 if a is silent there
export function bestMatch(a, t) {
  let best = 0, at = -1;
  for (let i = 0; i + t.length <= a.length; i++) {
    let s = 0;
    for (let j = 0; j < t.length; j++) s += a[i + j] * t[j];
    if (s > best) { best = s; at = i; }
  }
  return at;
}

// How many chunks each track will have, for the room kept at the front of the file (Fast Start without holding the file in
// memory): one per frame, and one per 1024 samples of AAC or 20 ms of Opus, with a few to spare for the encoder's last ones.
export function chunkCounts({ frames, samples, audio, priming = 0 }) {
  if (!audio) return { video: frames, audio: 0 };
  const per = audio.codec === 'opus' ? Math.round((audio.sampleRate * OPUS_FRAME_US) / 1e6) : AAC_FRAME;
  return { video: frames, audio: Math.ceil(Math.max(0, samples - priming) / per) + 8 };
}

// The encoder for one take of `frames` pictures and `samples` samples of sound. write(data, position) puts bytes in the
// file at a position (positions can go back: the file's index is written last, into the room kept for it at the front).
// Frames must come in order (addFrame(source, k): a VideoFrame, a canvas or bitmap, or { data, width, height } in BGRA,
// as a page capture gives); the sound comes in blocks, one Float32Array per channel. finish() says what was written.
export async function createTakeEncoder({ width, height, fps, frames, samples = 0, sampleRate = 48000, channels = 2, audioCodec, write }, wc = globalThis) {
  if (!(frames > 0)) throw new Error('a take needs at least one frame');
  const codecs = await pickCodecs({ width, height, fps, sampleRate, channels: samples ? channels : 0, audioCodec }, wc);
  const priming = codecs.audio ? await audioPriming(codecs.audio, wc) : 0;
  const counts = chunkCounts({ frames, samples, audio: codecs.audio, priming });
  const muxer = new Muxer({
    target: new StreamTarget({ onData: write, chunked: true }),
    video: { codec: 'avc', width, height, frameRate: fps },
    ...(codecs.audio && { audio: { codec: codecs.audio.codec === 'opus' ? 'opus' : 'aac', numberOfChannels: channels, sampleRate } }),
    fastStart: { expectedVideoChunks: counts.video, expectedAudioChunks: counts.audio },
  });
  let failed = null, next = 0, skip = priming, sent = 0, videoChunks = 0, audioChunks = 0;
  const fail = (what) => (e) => { failed ||= new Error(`${what} stopped: ${e?.message || e}`); };
  // (the chunks go in as bytes: mp4-muxer's addVideoChunk wants the page's own EncodedVideoChunk class, and wc may not be it)
  const bytes = (chunk) => { const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); return data; };
  const ve = new wc.VideoEncoder({ output: (chunk, meta) => { videoChunks++; muxer.addVideoChunkRaw(bytes(chunk), chunk.type, chunk.timestamp, chunk.duration, meta); }, error: fail('the video encoder') });
  ve.configure(codecs.video);
  const ae = codecs.audio && new wc.AudioEncoder({ output: (chunk, meta) => { audioChunks++; muxer.addAudioChunkRaw(bytes(chunk), chunk.type, chunk.timestamp, chunk.duration, meta); }, error: fail('the sound encoder') });
  ae?.configure(codecs.audio);
  const check = () => { if (failed) throw failed; };
  const room = async (enc) => { while (enc.encodeQueueSize > 4 && !failed) await new Promise((r) => { enc.addEventListener('dequeue', r, { once: true }); setTimeout(r, 50); }); };
  const keyEvery = Math.max(1, Math.round(KEY_EVERY * fps));

  return {
    codecs, priming,
    async addFrame(source, k) {
      check();
      if (k !== next) throw new Error(`frame ${k} came when frame ${next} was due`);
      if (k >= frames) throw new Error(`frame ${k} is past the take's ${frames}`);
      const at = { timestamp: Math.round((k * 1e6) / fps), duration: Math.round(1e6 / fps) };
      const frame = source?.data
        ? new wc.VideoFrame(source.data, { format: 'BGRA', codedWidth: source.width, codedHeight: source.height, ...at })
        : new wc.VideoFrame(source, at);
      try { await room(ve); check(); ve.encode(frame, { keyFrame: k % keyEvery === 0 }); }
      finally { frame.close(); }
      next++;
    },
    async addSound(planes) {
      check();
      if (!ae) return;
      if (planes.length !== channels) throw new Error(`the sound came with ${planes.length} channels, not ${channels}`);
      let from = 0;
      if (skip) { from = Math.min(skip, planes[0].length); skip -= from; }
      const n = planes[0].length - from;
      if (n <= 0) return;
      const data = new Float32Array(n * channels);
      for (let c = 0; c < channels; c++) data.set(planes[c].subarray(from), c * n);
      await room(ae); check();
      ae.encode(new wc.AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round((sent / sampleRate) * 1e6), data }));
      sent += n;
    },
    async finish() {
      check();
      if (next !== frames) throw new Error(`the take ended at frame ${next} of ${frames}`);
      await ve.flush();
      if (ae) await ae.flush();
      check();
      if (videoChunks !== frames) throw new Error(`the video encoder gave ${videoChunks} frames for ${frames}`);
      muxer.finalize();
      ve.close(); ae?.close();
      return { frames: videoChunks, audioChunks, priming, video: codecs.video.profile, audio: codecs.audio ? (codecs.audio.codec === 'opus' ? 'Opus' : 'AAC') : null };
    },
    abort(why = 'cancelled') {
      failed ||= new Error(why);
      for (const e of [ve, ae]) try { if (e && e.state !== 'closed') e.close(); } catch { /* already closed */ }
    },
  };
}
