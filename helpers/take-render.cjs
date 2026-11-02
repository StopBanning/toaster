// The perfect take's render (stream B): the take drawn again, one exact frame at a time, and written as an MP4.
//
// Two hidden windows. The render page draws frame k at the take's time t when asked, and answers two animation frames
// later, when the frame is on the page's surface; main then captures it with capturePage (stayHidden: a hidden window
// can be captured). Each capture is exactly the frame asked for; one animation frame isn't enough (tested in
// backlog/astrofox/B-SPIKE.md). The encoder page (renderer/take-encoder.html, with renderer/take-encode.js) turns the
// frames and the take's sound into the file, which main writes. The render window is the live page's CSS size times its
// devicePixelRatio, zoomed by that ratio, so the page lays out as it did live and comes out at full size. Nothing is shown,
// and nothing is played.
//
// A frame that doesn't come in time, a page that crashes, a capture of the wrong size, a disk that refuses, an encoder
// that stops, a cancel: each closes both windows, removes the unfinished file and says what happened, once.
//
// The render page's side of it (through its preload) is four IPC messages: it hears 'take:draw' (k, t) and answers
// 'take:drawn' (k) once the frame is drawn; it says 'take:ready' when it can draw, and 'take:failed' (why) if it can't.
// helpers/take-render-preload.cjs gives a page those as window.takeRender.

const fs = require('node:fs');
const path = require('node:path');

const ENCODER_PAGE = path.join(__dirname, '..', 'renderer', 'take-encoder.html');
const ENCODER_PRELOAD = path.join(__dirname, 'take-encoder-preload.cjs');
const IN_FLIGHT = 4; // frames sent to the encoder and not yet encoded, at most
const SOUND_BLOCK = 1; // seconds of sound per message

// The output size for a page of css.width x css.height CSS pixels at this devicePixelRatio: whole pixels, an even number each
// way (the encoder's), the nearest below. (At a ratio like 1.6 no CSS size need come out even: 803 gives 1284.8, and 802 1283.2.)
function outputSize(css, dpr) {
  const even = (v) => 2 * Math.floor(v / 2 + 1e-9);
  const width = even(css.width * dpr), height = even(css.height * dpr);
  if (!(width > 0 && height > 0)) throw new Error(`a take can't be ${width}x${height}`);
  return { width, height };
}

const seconds = (ms) => (ms >= 1000 ? `${+(ms / 1000).toFixed(1)} s` : `${ms} ms`);

function createTakeRender({ BrowserWindow, ipcMain, encoderPage = ENCODER_PAGE, encoderPreload = ENCODER_PRELOAD }) {
  let current = null, jobs = 0;

  async function render(job, { onProgress = () => {}, signal } = {}) {
    if (current) throw new Error('a perfect copy is already being made');
    const { width, height } = outputSize(job.css, job.dpr);
    const { fps, frames, t0 = 0, out, sound = null, take = null } = job;
    if (!(fps > 0) || !Number.isInteger(frames) || frames < 1) throw new Error('a take needs a frame rate and at least one frame');
    const frameMs = job.frameMs ?? 10000, loadMs = job.loadMs ?? 30000, finishMs = job.finishMs ?? 60000;
    const part = out + '.part';
    const run = current = { cancel: null };
    const windows = [], listeners = [];
    let fd = null, failure = null, done = false, renderWc = null, handled = false;
    // Whatever went wrong first, said once: every wait below ends with it.
    const waiters = new Set();
    const fail = (why) => { if (!failure && !done) { failure = new Error(why); for (const w of waiters) w.reject(failure); } };
    run.cancel = (why = 'cancelled') => fail(why);
    // (an AbortController's own reason is "This operation was aborted": that's said as "cancelled"; a reason given is said as it is)
    const why = () => (signal.reason instanceof Error && signal.reason.name !== 'AbortError' ? signal.reason.message : 'cancelled');
    const onAbort = () => fail(why());
    if (signal?.aborted) { current = null; throw new Error(why()); }
    signal?.addEventListener('abort', onAbort);
    // The next message on a channel from one window (that matches), or the failure, or a timeout said in words.
    const next = (wc, channel, match, ms, late) => new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      const w = { reject: (e) => { clearTimeout(timer); ipcMain.removeListener(channel, on); waiters.delete(w); reject(e); } };
      const on = (e, ...args) => {
        if (e.sender !== wc || (match && !match(...args))) return;
        clearTimeout(timer); ipcMain.removeListener(channel, on); waiters.delete(w); resolve(args);
      };
      const timer = setTimeout(() => fail(late), ms);
      waiters.add(w);
      ipcMain.on(channel, on);
    });
    const listen = (channel, fn) => { ipcMain.on(channel, fn); listeners.push([channel, fn]); };
    const hidden = (webPreferences, size = { width: 200, height: 200 }) => {
      const win = new BrowserWindow({ show: false, ...size, useContentSize: true, paintWhenInitiallyHidden: true, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, ...webPreferences } });
      windows.push(win);
      return win;
    };

    try {
      fd = fs.openSync(part, 'w');
      // the encoder page
      const enc = hidden({ preload: encoderPreload });
      const encWc = enc.webContents;
      encWc.on('render-process-gone', (_e, d) => fail(`the encoder page stopped (${d?.reason || 'gone'})`));
      let inflight = 0, encoded = 0, wake = null;
      listen('take:write', (e, data, at) => {
        if (e.sender !== encWc || failure) return;
        try { fs.writeSync(fd, Buffer.from(data.buffer, data.byteOffset, data.byteLength), 0, data.byteLength, at); }
        catch (err) { fail(`the file could not be written (${err.code || err.message})`); }
      });
      listen('take:encoded', (e) => { if (e.sender === encWc) { inflight--; encoded++; wake?.(); } });
      listen('take:failed', (e, why) => { if (e.sender === encWc) fail(why); else if (e.sender === renderWc) fail(`the page couldn't draw the take: ${why}`); });
      await enc.loadFile(encoderPage);
      // (the sound: { planes, sampleRate } in memory, or a stored take's { samples, channels, sampleRate, read(from, count) })
      const samples = sound ? sound.samples ?? sound.planes[0].length : 0, channels = sound ? sound.channels ?? sound.planes.length : 0;
      const stretch = (i, n) => (sound.read ? sound.read(i, n) : sound.planes.map((p) => p.slice(i, i + n)));
      const startedP = next(encWc, 'take:started', null, loadMs, `the encoder page didn't start within ${seconds(loadMs)}`);
      encWc.send('take:start', { width, height, fps, frames, samples, sampleRate: sound?.sampleRate || 48000, channels, audioCodec: job.audioCodec });
      const [codecs] = await startedP;

      // the render page, at the live page's CSS size and pixel ratio, in a session of its own (its storage starts empty and goes
      // when the app does: the take's is put back by its preload, and nothing it writes reaches the live app's). Drawn offscreen:
      // a window on a screen is captured at its size times the screen's scale (2 on a Retina display, 1.5 at 150%) and can be no
      // bigger than the screen (a 1920-tall take on a 1080p display came out 1041), where offscreen it is its size, everywhere
      const win = hidden({ preload: job.page.preload, zoomFactor: job.dpr, partition: `take-render-${++jobs}`, offscreen: true, ...job.page.webPreferences }, { width, height });
      const wc = renderWc = win.webContents;
      wc.setFrameRate?.(60); // (an offscreen page still runs its frames: the two after each draw, before it's captured)
      // (the take, for the app page in render mode: what the page was like, asked for before the app starts, then the sound)
      listen('take:meta', (e) => { e.returnValue = e.sender === renderWc && take ? take.meta : null; });
      ipcMain.handle('take:data', (e) => {
        if (e.sender !== renderWc || !take) throw new Error('there is no take for this page');
        return { meta: take.meta, sound: take.sound, changes: take.changes || [] };
      });
      handled = true;
      wc.on('render-process-gone', (_e, d) => fail(`the render page stopped (${d?.reason || 'gone'})`));
      wc.on('did-fail-load', (_e, code, desc) => fail(`the render page didn't load (${desc || code})`));
      const readyP = next(wc, 'take:ready', null, loadMs, `the render page wasn't ready within ${seconds(loadMs)}`);
      await win.loadFile(job.page.file, { query: job.page.query });
      // (Windows makes even an offscreen window no bigger than the screen; sized again once its page is in, it is the size asked
      // for, and the page lays out at its CSS size before it says it's ready. A resize before the load cancels it.)
      win.setContentSize(width, height);
      await readyP;
      if (failure) throw failure;

      // the sound, in blocks of a second
      if (sound) {
        const step = Math.round(sound.sampleRate * SOUND_BLOCK);
        // (copies, not views: a view would send its whole buffer, the whole take's sound, every time)
        for (let i = 0; i < samples; i += step) encWc.send('take:sound', stretch(i, step));
      }

      // each frame: drawn, captured, sent; at most IN_FLIGHT waiting to be encoded
      for (let k = 0; k < frames; k++) {
        if (failure) throw failure;
        const drawnP = next(wc, 'take:drawn', (n) => n === k, frameMs, `frame ${k} wasn't drawn within ${seconds(frameMs)}`);
        wc.send('take:draw', k, t0 + k / fps);
        await drawnP;
        const image = await wc.capturePage(undefined, { stayHidden: true });
        if (failure) throw failure;
        const size = image.getSize();
        if (size.width !== width || size.height !== height) throw new Error(`frame ${k} came out ${size.width}x${size.height}, not ${width}x${height}`);
        while (inflight >= IN_FLIGHT && !failure) await new Promise((r) => { wake = r; setTimeout(r, 100); });
        if (failure) throw failure;
        inflight++;
        encWc.send('take:frame', k, width, height, image.toBitmap());
        onProgress((k + 1) / frames, k);
      }
      const finishedP = next(encWc, 'take:finished', null, finishMs, `the encoder didn't finish within ${seconds(finishMs)}`);
      encWc.send('take:finish');
      const [info] = await finishedP;
      if (failure) throw failure;
      if (encoded !== frames) throw new Error(`the encoder took ${encoded} frames of ${frames}`);
      fs.fsyncSync(fd); fs.closeSync(fd); fd = null;
      fs.renameSync(part, out);
      done = true;
      return { file: out, width, height, fps, ...codecs, ...info };
    } catch (err) {
      fail(err?.message || String(err));
      throw failure;
    } finally {
      signal?.removeEventListener('abort', onAbort);
      for (const [channel, fn] of listeners) ipcMain.removeListener(channel, fn);
      if (handled) ipcMain.removeHandler('take:data');
      for (const w of waiters) w.reject(failure || new Error('ended'));
      for (const win of windows) if (!win.isDestroyed()) win.destroy();
      if (fd !== null) try { fs.closeSync(fd); } catch { /* already closed */ }
      if (!done) try { fs.rmSync(part, { force: true }); } catch { /* nothing to remove */ }
      current = null;
    }
  }

  return {
    render,
    cancel: (why) => current?.cancel?.(why),
    get busy() { return !!current; },
  };
}

module.exports = { createTakeRender, outputSize };
