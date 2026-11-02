// The perfect take's encoder (renderer/take-encode.js, stream B). With stand-ins for the browser's encoders: which codecs
// it picks, the AAC priming it measures and drops, the room it keeps at the front of the file, frames in order, failures
// said in words, and the file mp4-muxer writes (read back box by box). Then, where this machine has Electron and ffmpeg, the
// real thing: a click track (a white frame and a 2 ms click every half second) written by the real encoders in a hidden
// Electron page (take-encode-check.cjs) and decoded by ffmpeg: every frame there, each flash on its frame, and each click
// within a millisecond of its flash, with AAC and with Opus. Sources are read with LF endings.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCodecs, audioPriming, chunkCounts, createTakeEncoder, videoBitrate, impulse, bestMatch, h264Level, KEY_EVERY } from '../renderer/take-encode.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../renderer/take-encode.js'), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------- stand-ins for WebCodecs

// An encoder that makes one chunk per frame, one per 1024 samples (AAC) or 960 (Opus at 48 kHz), and a decoder that gives
// the sound back `delay` samples late, as an AAC encoder's priming does.
function fakeCodecs({ videoOk = () => true, audioOk = () => true, delay = 2112, failVideoAt = -1 } = {}) {
  const log = { videoConfigs: [], audioConfigs: [], frames: [], keys: [], audioEncoders: [], closedFrames: 0 };
  class Chunk {
    constructor(type, timestamp, duration, bytes, samples) { Object.assign(this, { type, timestamp, duration, byteLength: bytes.length, bytes, samples }); }
    copyTo(dst) { dst.set(this.bytes); }
  }
  class VideoFrame {
    constructor(source, init) { Object.assign(this, init, { source }); }
    close() { log.closedFrames++; }
  }
  class AudioData {
    constructor(init) { Object.assign(this, init); }
    copyTo(dst, { planeIndex }) { dst.set(this.data.subarray(planeIndex * this.numberOfFrames, (planeIndex + 1) * this.numberOfFrames)); }
    close() {}
  }
  class VideoEncoder extends EventTarget {
    static async isConfigSupported(c) { return { supported: videoOk(c) }; }
    constructor({ output, error }) { super(); Object.assign(this, { output, error, encodeQueueSize: 0, n: 0, state: 'unconfigured' }); }
    configure(c) { log.videoConfigs.push(c); this.c = c; this.state = 'configured'; }
    encode(frame, opts) {
      log.frames.push(frame.timestamp); log.keys.push(!!opts?.keyFrame);
      if (this.n === failVideoAt) { this.n++; queueMicrotask(() => this.error(new Error('the GPU went away'))); return; }
      const meta = this.n++ ? undefined : { decoderConfig: { codec: this.c.codec, codedWidth: this.c.width, codedHeight: this.c.height, description: new Uint8Array([1, 0x64, 0, 0x2a, 0xff, 0xe1, 0, 0]) } };
      this.output(new Chunk(opts?.keyFrame ? 'key' : 'delta', frame.timestamp, frame.duration, new Uint8Array(40)), meta);
    }
    async flush() {}
    close() { this.state = 'closed'; }
  }
  class AudioEncoder extends EventTarget {
    static async isConfigSupported(c) { return { supported: audioOk(c) }; }
    constructor({ output, error }) { super(); Object.assign(this, { output, error, encodeQueueSize: 0, state: 'unconfigured', pending: [], at: 0, first: true, samples: 0, timestamps: [] }); log.audioEncoders.push(this); }
    configure(c) { log.audioConfigs.push(c); this.c = c; this.per = c.codec === 'opus' ? Math.round(c.sampleRate / 50) : 1024; this.state = 'configured'; }
    encode(d) {
      this.timestamps.push(d.timestamp); this.samples += d.numberOfFrames;
      const mono = d.data.subarray(0, d.numberOfFrames);
      for (const x of mono) this.pending.push(x);
      while (this.pending.length >= this.per) this.emit(this.pending.splice(0, this.per));
    }
    emit(samples) {
      const opus = this.c.codec === 'opus';
      const description = opus ? new Uint8Array([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, this.c.numberOfChannels, 0x38, 1, 0x80, 0xbb, 0, 0, 0, 0, 0]) : new Uint8Array([0x11, 0x90]);
      const meta = this.first ? { decoderConfig: { codec: this.c.codec, sampleRate: this.c.sampleRate, numberOfChannels: this.c.numberOfChannels, description } } : undefined;
      this.first = false;
      const dur = Math.round((samples.length / this.c.sampleRate) * 1e6);
      this.output(new Chunk('key', Math.round((this.at / this.c.sampleRate) * 1e6), dur, new Uint8Array(8), Float32Array.from(samples)), meta);
      this.at += samples.length;
    }
    async flush() { const rest = this.pending.splice(0); if (rest.length) this.emit(rest.concat(new Array(this.per - rest.length).fill(0))); }
    close() { this.state = 'closed'; }
  }
  class AudioDecoder {
    constructor({ output }) { this.output = output; this.heard = []; }
    configure(c) { this.c = c; }
    decode(chunk) { for (const x of chunk.samples) this.heard.push(x); }
    async flush() {
      const n = this.heard.length, late = new Float32Array(n);
      late.set(Float32Array.from(this.heard).subarray(0, n - delay), delay);
      this.output(new AudioData({ format: 'f32-planar', sampleRate: this.c.sampleRate, numberOfFrames: n, numberOfChannels: 1, data: late }));
    }
    close() {}
  }
  return { wc: { VideoEncoder, AudioEncoder, AudioDecoder, VideoFrame, AudioData }, log };
}

// a file written at positions (as the muxer's StreamTarget writes it), read back as one Buffer
function memoryFile() {
  const parts = [];
  return { write: (data, at) => parts.push([at, Buffer.from(data)]), bytes: () => { const end = Math.max(...parts.map(([a, b]) => a + b.length)), out = Buffer.alloc(end); for (const [a, b] of parts) b.copy(out, a); return out; } };
}

// ---------------------------------------------------------------- an MP4, box by box

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts']);
function boxes(buf, start = 0, end = buf.length) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    let size = buf.readUInt32BE(p), hdr = 8;
    const type = buf.toString('latin1', p + 4, p + 8);
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    const b = { type, start: p, body: p + hdr, end: p + size };
    if (CONTAINERS.has(type)) b.kids = boxes(buf, b.body, b.end);
    out.push(b);
    p += size;
  }
  return out;
}
const kid = (b, type) => b.kids.find((k) => k.type === type);
function tracks(buf) {
  const top = boxes(buf), moov = top.find((b) => b.type === 'moov');
  return {
    order: top.map((b) => b.type),
    tracks: moov.kids.filter((b) => b.type === 'trak').map((trak) => {
      const mdia = kid(trak, 'mdia'), stbl = kid(kid(mdia, 'minf'), 'stbl');
      const hdlr = kid(mdia, 'hdlr'), mdhd = kid(mdia, 'mdhd'), stts = kid(stbl, 'stts'), stsz = kid(stbl, 'stsz'), stsd = kid(stbl, 'stsd');
      const deltas = [];
      for (let i = 0, n = buf.readUInt32BE(stts.body + 4); i < n; i++) { const at = stts.body + 8 + i * 8; for (let j = 0; j < buf.readUInt32BE(at); j++) deltas.push(buf.readUInt32BE(at + 4)); }
      const stss = kid(stbl, 'stss'), keys = [];
      if (stss) for (let i = 0, n = buf.readUInt32BE(stss.body + 4); i < n; i++) keys.push(buf.readUInt32BE(stss.body + 8 + i * 4) - 1);
      return { kind: buf.toString('latin1', hdlr.body + 8, hdlr.body + 12), timescale: buf.readUInt32BE(mdhd.body + 12), samples: buf.readUInt32BE(stsz.body + 8), deltas, keys, codec: buf.toString('latin1', stsd.body + 12, stsd.body + 16) };
    }),
  };
}

// ---------------------------------------------------------------- what it picks

test('a plain module: its only import is mp4-muxer, and the browser\'s encoders come in as wc', () => {
  const code = src.replace(/\/\/.*$/gm, '');
  assert.deepEqual([...code.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]), ['../node_modules/mp4-muxer/build/mp4-muxer.mjs']);
  assert.doesNotMatch(code, /\b(window|document|localStorage|fetch|require|performance\.now|Date\.now|Math\.random)\b/);
});

test('the picture\'s bit rate: 12 Mbps for 1080x1920 at 30 fps, a third more at 60, in step with the pixels', () => {
  assert.equal(videoBitrate(1080, 1920, 30), 12e6);
  assert.equal(videoBitrate(1920, 1080, 30), 12e6);
  assert.equal(videoBitrate(1080, 1920, 60), 16e6);
  assert.equal(videoBitrate(540, 960, 30), 3e6);
});

test('the H.264 level is the lowest the picture fits: 1080x1920 at 30 or 60 fps is 4.0 or 4.2, 1920x1200 needs 5.0', () => {
  assert.equal(h264Level(1080, 1920, 30), '28');
  assert.equal(h264Level(1080, 1920, 60), '2a');
  assert.equal(h264Level(1920, 1200, 30), '32');
  assert.equal(h264Level(3840, 2160, 30), '33');
  assert.equal(h264Level(3840, 2160, 60), '34');
  assert.equal(h264Level(8192, 8192, 60), null);
});

test('it takes H.264 High, else Main, else Baseline, and AAC, else Opus; none says so in words', async () => {
  const base = { width: 1080, height: 1920, fps: 30, sampleRate: 48000, channels: 2 };
  let { wc } = fakeCodecs();
  let c = await pickCodecs(base, wc);
  assert.equal(c.video.profile, 'High'); assert.equal(c.video.codec, 'avc1.640028'); assert.equal(c.video.bitrate, 12e6); assert.equal(c.audio.codec, 'mp4a.40.2');
  ({ wc } = fakeCodecs({ videoOk: (x) => !x.codec.startsWith('avc1.64'), audioOk: (x) => x.codec === 'opus' }));
  c = await pickCodecs(base, wc);
  assert.equal(c.video.profile, 'Main'); assert.equal(c.audio.codec, 'opus'); assert.equal(c.audio.opus.frameDuration, 20000);
  ({ wc } = fakeCodecs({ videoOk: (x) => x.codec === 'avc1.420028' }));
  assert.equal((await pickCodecs(base, wc)).video.profile, 'Baseline');
  ({ wc } = fakeCodecs());
  assert.equal((await pickCodecs({ ...base, audioCodec: 'opus' }, wc)).audio.codec, 'opus', 'Opus asked for: AAC is skipped');
  assert.equal((await pickCodecs({ ...base, channels: 0 }, wc)).audio, null, 'no sound, no sound track');
  ({ wc } = fakeCodecs({ videoOk: () => false }));
  await assert.rejects(pickCodecs(base, wc), { message: "this computer can't encode H.264 video at 1080x1920" });
  ({ wc } = fakeCodecs({ audioOk: () => false }));
  await assert.rejects(pickCodecs(base, wc), { message: "this computer can't encode the sound (2 channels at 48000 Hz) as AAC or Opus" });
  await assert.rejects(pickCodecs({ ...base, width: 1081 }, wc), { message: "the picture must be an even number of pixels each way (it's 1081x1920)" });
});

test('the AAC priming is measured: an impulse through the encoder and back comes out that many samples late', async () => {
  for (const delay of [2112, 1024, 0]) {
    const { wc } = fakeCodecs({ delay });
    assert.equal(await audioPriming({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }, wc), delay);
  }
  const { wc, log } = fakeCodecs();
  assert.equal(await audioPriming({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2 }, wc), 0, 'Opus says its own delay in the file');
  assert.equal(log.audioConfigs.length, 0, 'and is not encoded to find out');
  const click = impulse(48000), a = new Float32Array(9000);
  a.set(click, 4321);
  assert.equal(click.length, 96);
  assert.equal(bestMatch(a, click), 4321);
  assert.equal(bestMatch(new Float32Array(500), click), -1, 'silence: not found');
});

test('the room kept at the front: a chunk per frame, per 1024 samples of AAC (after the priming) or 20 ms of Opus, and 8 spare', () => {
  assert.deepEqual(chunkCounts({ frames: 300, samples: 480000, audio: { codec: 'mp4a.40.2', sampleRate: 48000 }, priming: 2112 }), { video: 300, audio: 467 + 8 });
  assert.deepEqual(chunkCounts({ frames: 300, samples: 480000, audio: { codec: 'opus', sampleRate: 48000 } }), { video: 300, audio: 500 + 8 });
  assert.deepEqual(chunkCounts({ frames: 300, samples: 0, audio: null }), { video: 300, audio: 0 });
});

// ---------------------------------------------------------------- a whole take, with stand-ins

async function fakeTake({ fps = 30, frames = 150, seconds = 5, audioCodec, delay = 2112, wcOpts = {} } = {}) {
  const { wc, log } = fakeCodecs({ delay, ...wcOpts }), file = memoryFile(), sampleRate = 48000, samples = seconds * sampleRate;
  const enc = await createTakeEncoder({ width: 1080, height: 1920, fps, frames, samples, sampleRate, channels: 2, audioCodec, write: file.write }, wc);
  const sound = [new Float32Array(samples), new Float32Array(samples)];
  for (let i = 0; i < samples; i += 4800) await enc.addSound(sound.map((ch) => ch.subarray(i, i + 4800)));
  for (let k = 0; k < frames; k++) await enc.addFrame(k % 2 ? { data: new Uint8Array(1080 * 1920 * 4), width: 1080, height: 1920 } : { width: 1080, height: 1920 }, k);
  const done = await enc.finish();
  return { done, log, mp4: tracks(file.bytes()), enc };
}

test('a take: every frame at k / fps with a key frame every 2 s, the sound from 0 less the measured priming, the index first', async () => {
  const { done, log, mp4 } = await fakeTake();
  assert.deepEqual(done, { frames: 150, audioChunks: Math.ceil((240000 - 2112) / 1024), priming: 2112, video: 'High', audio: 'AAC' });
  assert.deepEqual(log.frames, Array.from({ length: 150 }, (_, k) => Math.round((k * 1e6) / 30)));
  assert.deepEqual(log.keys.flatMap((key, k) => (key ? [k] : [])), [0, 60, 120], `a key frame every ${KEY_EVERY} s`);
  assert.equal(log.closedFrames, 150, 'every frame closed once encoded');
  const take = log.audioEncoders.at(-1); // (the first one was the priming's test)
  assert.equal(log.audioEncoders.length, 2);
  assert.equal(take.samples, 240000 - 2112, 'the first 2112 samples dropped, the rest all sent');
  assert.equal(take.timestamps[0], 0, 'the sound starts at 0');
  assert.ok(take.timestamps.every((t, i) => i === 0 || t > take.timestamps[i - 1]), 'and goes on in order');
  assert.ok(mp4.order.indexOf('moov') < mp4.order.indexOf('mdat'), `the index (moov) before the media (mdat): ${mp4.order}`);
  const [v, a] = mp4.tracks;
  assert.equal(v.kind, 'vide'); assert.equal(v.codec, 'avc1'); assert.equal(v.timescale, 30); assert.equal(v.samples, 150);
  assert.ok(v.deltas.every((d) => d === 1), 'each frame lasts exactly one 30th of a second');
  assert.deepEqual(v.keys, [0, 60, 120], 'the file marks the same key frames');
  assert.equal(a.kind, 'soun'); assert.equal(a.codec, 'mp4a'); assert.equal(a.timescale, 48000); assert.equal(a.samples, done.audioChunks);
  assert.ok(a.deltas.every((d) => d === 1024), 'each AAC chunk is 1024 samples');
});

test('Opus: nothing dropped (the file says its own delay), 20 ms chunks', async () => {
  const { done, log, mp4 } = await fakeTake({ audioCodec: 'opus' });
  assert.equal(done.priming, 0); assert.equal(done.audio, 'Opus');
  assert.equal(log.audioEncoders.length, 1, 'no priming test for Opus');
  assert.equal(log.audioEncoders[0].samples, 240000);
  assert.equal(mp4.tracks[1].codec, 'Opus');
  assert.ok(mp4.tracks[1].deltas.every((d) => d === 960));
});

test('frames in order and all of them; a failing encoder is said in words, and the take stops', async () => {
  const { wc } = fakeCodecs(), file = memoryFile();
  let enc = await createTakeEncoder({ width: 640, height: 360, fps: 30, frames: 3, write: file.write }, wc);
  await assert.rejects(enc.addFrame({}, 1), { message: 'frame 1 came when frame 0 was due' });
  await enc.addFrame({}, 0);
  await assert.rejects(enc.finish(), { message: 'the take ended at frame 1 of 3' });
  await enc.addFrame({}, 1); await enc.addFrame({}, 2);
  await assert.rejects(enc.addFrame({}, 3), { message: "frame 3 is past the take's 3" });
  assert.equal((await enc.finish()).frames, 3);
  assert.equal(enc.codecs.audio, null, 'no samples: no sound track');
  const bad = fakeCodecs({ failVideoAt: 1 });
  enc = await createTakeEncoder({ width: 640, height: 360, fps: 30, frames: 5, write: file.write }, bad.wc);
  await enc.addFrame({}, 0); await enc.addFrame({}, 1);
  await new Promise((r) => setTimeout(r, 0));
  await assert.rejects(enc.addFrame({}, 2), { message: 'the video encoder stopped: the GPU went away' });
  await assert.rejects(enc.finish(), { message: 'the video encoder stopped: the GPU went away' });
  enc = await createTakeEncoder({ width: 640, height: 360, fps: 30, frames: 5, write: file.write }, fakeCodecs().wc);
  enc.abort('the render was cancelled');
  await assert.rejects(enc.addFrame({}, 0), { message: 'the render was cancelled' });
  await assert.rejects(createTakeEncoder({ width: 640, height: 360, fps: 30, frames: 0, write: file.write }, wc), { message: 'a take needs at least one frame' });
});

// ---------------------------------------------------------------- the real encoders, measured by ffmpeg

let electron = null;
try { electron = createRequire(import.meta.url)('electron'); if (!fs.existsSync(electron)) electron = null; } catch { /* no Electron here */ }
const tool = (name) => { const bin = process.env[name.toUpperCase()] || name; return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0 ? bin : null; };
const ffmpeg = tool('ffmpeg'), ffprobe = tool('ffprobe');

test('real encoders: a click track keeps every frame, each flash on its frame, each click within 1 ms of its flash (AAC and Opus)', { skip: !electron ? 'no Electron here' : !ffmpeg || !ffprobe ? 'needs ffmpeg and ffprobe' : false, timeout: 120000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-take-'));
  try {
    const run = spawnSync(electron, [path.join(here, 'take-encode-check.cjs'), dir], { encoding: 'utf8', timeout: 100000 });
    const line = (run.stdout || '').split('\n').find((l) => l.startsWith('{"result"'));
    assert.ok(line, `no result from Electron: ${run.stdout}\n${run.stderr}`.slice(0, 2000));
    const { result } = JSON.parse(line);
    assert.equal(result.error, undefined, result.error);
    assert.deepEqual(result.takes.map((t) => [t.audio, t.frames]), [['AAC', 180], ['Opus', 180]]);
    assert.ok(result.takes[0].priming > 0, 'AAC primes, and the priming was found');
    const click = impulse(48000);
    for (const t of result.takes) {
      const file = path.join(dir, t.file);
      const pts = JSON.parse(spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v', '-show_frames', '-show_entries', 'frame=pts_time', '-of', 'json', file], { encoding: 'utf8' }).stdout).frames.map((f) => +f.pts_time);
      assert.equal(pts.length, 180, `${t.file}: every frame`);
      assert.ok(pts.every((p, k) => Math.abs(p - k / 30) < 1e-4), `${t.file}: frame k at k/30`);
      const luma = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:v', '-vf', 'scale=16:16,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 }).stdout;
      const flashes = [];
      for (let k = 0; k < 180; k++) { let s = 0; for (let i = 0; i < 256; i++) s += luma[k * 256 + i]; if (s / 256 > 128) flashes.push(k); }
      assert.deepEqual(flashes, result.kicks, `${t.file}: the flashes on their frames`);
      const pcm = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 26 }).stdout;
      const sound = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
      for (const k of result.kicks) {
        const want = Math.round((k / 30) * 48000), from = want - 2880, found = bestMatch(sound.subarray(from, want + 2880 + click.length), click);
        assert.ok(found >= 0, `${t.file}: the click at frame ${k}`);
        const offMs = ((from + found - want) / 48000) * 1000;
        assert.ok(Math.abs(offMs) < 1, `${t.file}: the click at frame ${k} is ${offMs.toFixed(3)} ms off its flash`);
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
