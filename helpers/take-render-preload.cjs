// The render page's half of the perfect take's render (helpers/take-render.cjs), as window.takeRender. onDraw(fn) hears
// each frame to draw, fn(k, t), t being the take's clock time. drawn(k) says the frame is drawn; the answer goes two
// animation frames later, once the frame is on the page's surface (one isn't always enough). ready() says the page can
// draw, and failed(why) says it can't.
//
// For the app page in render mode (renderer/take-replay.js) there is a take: meta says what the page was like at M, and
// take() brings the take's sound and its changes. Before the app starts, the page's storage is put back as it was at M (in the
// render's own session, so nothing here touches the live app's), so it opens with the same settings.
const { contextBridge, ipcRenderer } = require('electron');

const meta = ipcRenderer.sendSync('take:meta');
if (meta?.storage) {
  try { for (const [key, value] of Object.entries(meta.storage)) localStorage.setItem(key, value); } catch { /* no storage: the app's defaults */ }
}

contextBridge.exposeInMainWorld('takeRender', {
  meta: meta ? { ...meta, storage: undefined } : null,
  take: () => ipcRenderer.invoke('take:data'),
  onDraw: (fn) => { ipcRenderer.on('take:draw', (_e, k, t) => fn(k, t)); },
  drawn: (k) => { requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('take:drawn', k))); },
  ready: () => { requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('take:ready'))); },
  failed: (why) => ipcRenderer.send('take:failed', String(why)),
  earthClip: (name) => ipcRenderer.invoke('earth:clip', name), // (the Earth's view, as the app keeps it: main.js earth:clip)
  looksList: () => ipcRenderer.invoke('looks:list'), // (the looks from outside, the shipped ones and the folder's: main.js looks:list)
});
