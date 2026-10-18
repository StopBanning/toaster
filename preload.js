// The small, safe set of things the page may ask the main process for.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nc', {
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  sysInfo: () => ipcRenderer.invoke('sys:info'),
  sysLoad: () => ipcRenderer.invoke('sys:load'),
  toggleFullscreen: () => ipcRenderer.invoke('win:fullscreen'),
  setVertical: (on) => ipcRenderer.invoke('win:vertical', on),
  setMini: (on) => ipcRenderer.invoke('win:mini', on),
  setTitleBar: (color, symbolColor) => ipcRenderer.invoke('win:titlebar', color, symbolColor),
  onNowPlaying: (fn) => ipcRenderer.on('nowplaying', (_e, info) => fn(info)),
  onWindowShown: (fn) => ipcRenderer.on('win:shown', (_e, shown) => fn(shown)),
  onFullScreen: (fn) => ipcRenderer.on('win:full', (_e, on) => fn(on)),
  // Where faces are in a grey camera frame (w x h bytes): { faces: [[x, y, w, h], ...] }.
  findFaces: (w, h, pixels) => ipcRenderer.invoke('faces:find', w, h, pixels),
  stopFaces: () => ipcRenderer.invoke('faces:stop'),
  // Opens a https://strudel.cc/#... link in the default browser.
  openStrudel: (url) => ipcRenderer.invoke('open:strudel', url),
  // Recording (M): a capture id for the page itself, then the video to a file, piece by piece.
  recSource: () => ipcRenderer.invoke('rec:source'),
  recStart: (ext) => ipcRenderer.invoke('rec:start', ext),
  recChunk: (buf) => ipcRenderer.invoke('rec:chunk', buf),
  recStop: () => ipcRenderer.invoke('rec:stop'),
  recShow: (file) => ipcRenderer.invoke('rec:show', file),
  // the file couldn't be written (fn gets why); the window is closing mid-recording (fn finishes
  // the video, then calls closeWindow)
  onRecFailed: (fn) => ipcRenderer.on('rec:failed', (_e, why) => fn(why)),
  onRecFinish: (fn) => ipcRenderer.on('rec:finish', () => fn()),
  closeWindow: () => ipcRenderer.invoke('win:close'),
  // Song export (X): the song as MIDI bytes and as Strudel code, into Music\Toaster.
  saveSong: (name, midi, code) => ipcRenderer.invoke('song:save', name, midi, code),
  // Drop clips (J): a finished clip, whole, into Videos\Toaster.
  saveClip: (buf, ext) => ipcRenderer.invoke('clip:save', buf, ext),
  // Updates (update.js): a newer release, or null; on your yes, fetch it and restart into it; or
  // its page in the browser. fn(fraction) as the download comes in.
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updatePage: () => ipcRenderer.invoke('update:page'),
  onUpdateProgress: (fn) => ipcRenderer.on('update:progress', (_e, p) => fn(p)),
  // The hand log (Ctrl+Shift+H): numbers only, into the settings folder.
  handLogStart: () => ipcRenderer.invoke('handlog:start'),
  handLogAdd: (text) => ipcRenderer.invoke('handlog:add', text),
  handLogStop: () => ipcRenderer.invoke('handlog:stop'),
});
