// Frozen replay: the sole picture is one previously captured Chromium fake-camera frame.
// No devices, sources, app loop, model tracking, or network calls run on this page.
import { createDotCam } from './dotcam.js';
import { createVoxCam } from './voxcam.js';
import { createWarp } from './warp.js';
import { createField } from './visuals.js';
window.pixelRun = async () => {
  await document.fonts.load('14px ' + getComputedStyle(document.documentElement).getPropertyValue('--font'));
  await document.fonts.ready;
  const picture = new Image(); picture.src = './fake-camera.png'; await picture.decode();
  const video = document.createElement('canvas'); video.width = 640; video.height = 480;
  video.getContext('2d').drawImage(picture, 0, 0);
  Object.assign(video, { videoWidth: 640, videoHeight: 480, readyState: 4 });
  const image = video.getContext('2d').getImageData(0, 0, 640, 480).data;
  const lum = Uint8Array.from({ length: 640 * 480 }, (_, i) => (.299 * image[i * 4] + .587 * image[i * 4 + 1] + .114 * image[i * 4 + 2]));
  const mask = { w: 64, h: 48, data: Uint8Array.from({ length: 64 * 48 }, (_, i) => (i % 64 - 32) ** 2 / 600 + (Math.floor(i / 64) - 24) ** 2 / 400 < 1 ? 255 : 0) };
  const eng = { fastDb: Float32Array.from({ length: 1024 }, (_, i) => -65 + Math.sin(i * .1) * 16), hzFast: 24,
    time: Float32Array.from({ length: 1024 }, (_, i) => Math.sin(i * .04) * .4), level: .12, silent: false,
    tempo: { locked: true, bpm: 120 }, stepAt: () => null, v: { bd: { lastHit: { t: 0 } } }, lastChord: null, bar: null };
  let clock = 0; Object.defineProperty(performance, 'now', { value: () => clock * 1000 });
  const results = [];
  for (const dark of [true, false]) for (const name of ['dots', 'dots-mask', 'voxels', 'voxels-mask', 'warp', 'spectrum', 'rain', 'scope', 'asciicam']) {
    let seed = 17; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    clock = 0;
    const canvas = document.createElement('canvas'); document.body.append(canvas);
    const col = dark ? { bg: [0, 0, 0], fg: [0, 255, 128] } : { bg: [245, 241, 230], fg: [32, 30, 28] };
    const kind = name.split('-')[0];
    const instance = kind === 'dots' ? createDotCam(canvas) : kind === 'voxels' ? createVoxCam(canvas) : name === 'warp' ? createWarp(canvas) : createField(canvas);
    // A field's fonts-ready sizing runs once more in a microtask in both versions.
    await Promise.resolve();
    const draw = (t) => {
      clock = t;
      if (['dots', 'voxels'].includes(kind)) instance.draw(t, { video, mask: name.endsWith('-mask') ? mask : null, eng });
      else if (name === 'warp') instance.draw(t, eng, col);
      else instance.draw(t, eng, name === 'asciicam' ? 'cam' : name, col, { frame: { w: 640, h: 480, lum }, rect: { x: 0, y: 0, w: innerWidth, h: innerHeight } });
    };
    for (let n = 0; ; n++) { draw(0); if (!instance.waiting) break; if (n > 3000) throw new Error('pixel compile timeout'); await new Promise(r => setTimeout(r, 10)); }
    for (let i = 1; i <= 24; i++) draw(i / 24);
    const gl = canvas.getContext('webgl2'), error = gl?.getError();
    const info = gl?.getExtension('WEBGL_debug_renderer_info'), renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    if (/unknown|Basic Render|WARP|SwiftShader|llvmpipe|Software/i.test(renderer)) throw new Error('not a hardware renderer: ' + renderer);
    if (error) throw new Error(name + ': GL error ' + error);
    results.push({ name: name + (dark ? '-dark' : '-light'), width: canvas.width, height: canvas.height, png: canvas.toDataURL('image/png').split(',')[1], error, renderer });
    instance.clear(); gl?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
  }
  return results;
};
