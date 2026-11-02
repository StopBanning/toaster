// Known sound through the tap: what comes out must be every sample, unchanged, in blocks placed on the audio clock.
import { createTakeTap } from '../renderer/take-tap.js';
const { ipcRenderer } = window.require('electron');
const SR = 48000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function offline({ channels, frames, block, mono = false, startAt = 0 }) {
  const ac = new OfflineAudioContext(2, frames, SR), blocks = [];
  const tap = await createTakeTap(ac, { channels, block, send: (b) => blocks.push({ frame: b.frame, at: b.at, data: Array.from(b.data) }) });
  const buf = ac.createBuffer(mono ? 1 : 2, frames, SR);
  const l = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) l[i] = ((i % 1000) + 1) / 1000;
  if (!mono) { const r = buf.getChannelData(1); for (let i = 0; i < frames; i++) r[i] = -l[i]; }
  const src = new AudioBufferSourceNode(ac, { buffer: buf });
  src.connect(tap.node);
  src.start(startAt / SR);
  await ac.startRendering();
  for (let i = 0; i < 40 && blocks.reduce((a, b) => a + b.data.length, 0) < frames * channels; i++) await wait(50);
  const end = tap.stop();
  // what came out, against what went in (a sample's wrongness, and where the blocks begin)
  const out = blocks.flatMap((b) => b.data);
  let wrong = 0;
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
    const want = i < startAt ? 0 : (mono || c === 0 ? 1 : -1) * ((((i - startAt) % 1000) + 1) / 1000);
    if (Math.abs((out[i * channels + c] ?? NaN) - Math.fround(want)) > 1e-7) wrong++;
  }
  return { end, wrong, got: out.length / channels, starts: blocks.map((b) => b.frame), ats: blocks.slice(0, 3).map((b) => b.at) };
}

(async () => {
  const result = {};
  try {
    result.stereo = await offline({ channels: 2, frames: 96000, block: 1 });
    result.mono = await offline({ channels: 2, frames: 24000, block: 1, mono: true });
    result.blocks = await offline({ channels: 2, frames: 30000, block: 0.25, startAt: 1000 });
    const ac = new AudioContext({ sampleRate: SR });
    await ac.resume();
    let blocks = 0;
    const tap = await createTakeTap(ac, { send: () => { blocks++; }, block: 0.1 });
    const osc = new OscillatorNode(ac, { frequency: 440 });
    osc.connect(tap.node); osc.start();
    const from = ac.currentTime;
    await wait(600);
    const end = tap.stop(), ran = ac.currentTime - from;
    osc.stop(); await ac.close();
    result.live = { ...end, blocks, ran };
  } catch (e) { result.error = e?.stack || String(e); }
  ipcRenderer.send('result', result);
})();
