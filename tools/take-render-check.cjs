// tools/take-render.test.mjs's Electron half: helpers/take-render.cjs run for real on tools/take-render-page.html, in the
// folder given. A whole take (150 frames at 540x960 at 2x, with a click on every flash), then each way it can end early: a
// cancel, a crash, a page that stops answering, a page that can't draw, a second render while one runs, and a size that
// can't be encoded. After each: how many windows are left, and which files. Hidden (no window, no Dock icon), muted, its
// own profile in that folder; nothing is played. Prints one line of JSON and quits.
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const fs = require('fs'), path = require('path');
const { createTakeRender } = require('../helpers/take-render.cjs');
const dir = process.argv[process.argv.length - 1];
app.commandLine.appendSwitch('mute-audio');
app.setPath('userData', path.join(dir, 'profile'));
app.dock?.hide();
app.on('window-all-closed', () => {}); // (the renders' windows come and go; the app stays till the end)

const FPS = 30, SR = 48000;
const click = Float32Array.from({ length: 96 }, (_, i) => 0.8 * Math.sin((2 * Math.PI * 3000 * i) / SR) * Math.sin((Math.PI * i) / 96) ** 2);
function sound(frames) {
  const planes = [new Float32Array((frames / FPS) * SR), new Float32Array((frames / FPS) * SR)];
  for (let k = 15; k < frames; k += 15) for (const p of planes) p.set(click, Math.round((k / FPS) * SR));
  return { planes, sampleRate: SR };
}
const page = (query = {}) => ({ file: path.join(__dirname, 'take-render-page.html'), preload: path.join(__dirname, '..', 'helpers', 'take-render-preload.cjs'), query });
const job = (name, more = {}) => ({ page: page(), css: { width: 540, height: 960 }, dpr: 2, fps: FPS, frames: 150, out: path.join(dir, name + '.mp4'), ...more });
const left = (name) => ({ windows: BrowserWindow.getAllWindows().length, files: fs.readdirSync(dir).filter((f) => f.startsWith(name)) });

app.whenReady().then(async () => {
  const takes = createTakeRender({ BrowserWindow, ipcMain });
  const result = {};
  const attempt = async (name, j, opts) => {
    const t0 = Date.now();
    try { const r = await takes.render(j, opts); result[name] = { ok: r, ms: Date.now() - t0, ...left(name) }; }
    catch (e) { result[name] = { error: e.message, ms: Date.now() - t0, ...left(name) }; }
  };
  let progress = 0;
  // (the whole take's sound comes from a stored take, as the app's will: helpers/take-store.cjs)
  const store = require('../helpers/take-store.cjs').createTakeStore({ root: path.join(dir, 'takes') });
  const id = store.begin({ sampleRate: SR, channels: 2 }), s = sound(150), both = new Float32Array(s.planes[0].length * 2);
  for (let i = 0; i < s.planes[0].length; i++) { both[2 * i] = s.planes[0][i]; both[2 * i + 1] = s.planes[1][i]; }
  store.sound(id, both); store.end(id);
  await attempt('full', job('full', { sound: store.read(id).sound }), { onProgress: (f) => { progress = f; } });
  result.full.progress = progress;
  const ac = new AbortController();
  await attempt('cancel', job('cancel', { frames: 300, sound: sound(300) }), { signal: ac.signal, onProgress: (_f, k) => { if (k === 30) ac.abort(); } });
  await attempt('crash', job('crash', { frames: 100 }), { onProgress: (_f, k) => { if (k === 10) webContents.getAllWebContents().find((w) => w.getURL().includes('take-render-page'))?.forcefullyCrashRenderer(); } });
  await attempt('stall', job('stall', { frames: 60, frameMs: 1500, page: page({ stallAt: '5' }) }));
  await attempt('pagefail', job('pagefail', { frames: 60, page: page({ failAt: '3' }) }));
  const first = takes.render(job('busy1', { frames: 300 }));
  await attempt('busy', job('busy2', { frames: 10 }));
  takes.cancel('the user stopped it');
  try { await first; result.busy.first = 'finished'; } catch (e) { result.busy.first = e.message; }
  Object.assign(result.busy, left('busy'));
  await attempt('odd', job('odd', { css: { width: 541, height: 960 }, dpr: 1, frames: 10 })); // (an odd size: drawn at the even size below)
  console.log(JSON.stringify({ result }));
  app.quit();
});
setTimeout(() => { console.log(JSON.stringify({ result: { error: 'timed out' } })); app.exit(2); }, 150000);
