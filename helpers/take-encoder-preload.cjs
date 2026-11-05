// The encoder page's half of the perfect take's render (helpers/take-render.cjs), as window.takeEncoder: the job, the
// sound and the frames come in; what was started and encoded, the file's bytes (with where they go) and any failure go
// back to main.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (fn) => { ipcRenderer.on(channel, (_e, ...args) => fn(...args)); };
contextBridge.exposeInMainWorld('takeEncoder', {
  onStart: on('take:start'),
  onSound: on('take:sound'),
  onFrame: on('take:frame'),
  onFinish: on('take:finish'),
  started: (info) => ipcRenderer.send('take:started', info),
  soundEncoded: () => ipcRenderer.send('take:sound-encoded'),
  encoded: (k) => ipcRenderer.send('take:encoded', k),
  finished: (info) => ipcRenderer.send('take:finished', info),
  failed: (why) => ipcRenderer.send('take:failed', String(why)),
  write: (data, at) => ipcRenderer.send('take:write', data, at),
});
