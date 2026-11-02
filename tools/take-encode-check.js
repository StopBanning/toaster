// The click track: 6 s at 30 fps, a white frame every half second (on frames 15, 30, ...) and a 2 ms click at exactly the
// same times, through createTakeEncoder as a take is. tools/take-encode.test.mjs decodes the files with ffmpeg and checks.
import { createTakeEncoder, impulse } from '../renderer/take-encode.js';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs'), path = window.require('path');
const dir = new URLSearchParams(location.search).get('dir');
const W = 1080, H = 1920, FPS = 30, SR = 48000, CH = 2, N = 180, KICKS = [];
for (let k = 15; k < N; k += 15) KICKS.push(k);

async function take(audioCodec, file) {
  const fd = fs.openSync(path.join(dir, file), 'w');
  const sound = Array.from({ length: CH }, () => new Float32Array((N / FPS) * SR)), click = impulse(SR);
  for (const k of KICKS) for (const ch of sound) ch.set(click, Math.round((k / FPS) * SR));
  const enc = await createTakeEncoder({ width: W, height: H, fps: FPS, frames: N, samples: sound[0].length, sampleRate: SR, channels: CH, audioCodec, write: (data, at) => fs.writeSync(fd, data, 0, data.length, at) });
  for (let i = 0; i < sound[0].length; i += 4800) await enc.addSound(sound.map((ch) => ch.subarray(i, i + 4800)));
  const canvas = new OffscreenCanvas(W, H), x = canvas.getContext('2d');
  for (let k = 0; k < N; k++) {
    x.fillStyle = KICKS.includes(k) ? '#fff' : '#000';
    x.fillRect(0, 0, W, H);
    if (k % 2) await enc.addFrame(canvas, k); // (odd frames as a page capture comes: BGRA bytes)
    else { const d = x.getImageData(0, 0, W, H).data; for (let i = 0; i < d.length; i += 4) { const r = d[i]; d[i] = d[i + 2]; d[i + 2] = r; } await enc.addFrame({ data: d, width: W, height: H }, k); }
  }
  const done = await enc.finish();
  fs.closeSync(fd);
  return { file, ...done };
}

(async () => {
  const result = { kicks: KICKS, fps: FPS, frames: N, takes: [] };
  try {
    result.takes.push(await take(undefined, 'take-aac.mp4'));
    result.takes.push(await take('opus', 'take-opus.mp4'));
  } catch (e) { result.error = e?.message || String(e); }
  ipcRenderer.send('result', result);
})();
