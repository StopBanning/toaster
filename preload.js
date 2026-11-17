// The small, safe set of things the page may ask the main process for.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nc', {
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  sysInfo: () => ipcRenderer.invoke('sys:info'),
  sysLoad: () => ipcRenderer.invoke('sys:load'),
  toggleFullscreen: () => ipcRenderer.invoke('win:fullscreen'),
  setVertical: (on) => ipcRenderer.invoke('win:vertical', on),
  setMini: (on, shape) => ipcRenderer.invoke('win:mini', on, shape),
  setWidget: (on) => ipcRenderer.invoke('win:widget', on),
  onWidget: (fn) => ipcRenderer.on('win:widget', (_e, on) => fn(on)),
  setTitleBar: (color, symbolColor) => ipcRenderer.invoke('win:titlebar', color, symbolColor),
  onNowPlaying: (fn) => ipcRenderer.on('nowplaying', (_e, info) => fn(info)),
  onWindowShown: (fn) => ipcRenderer.on('win:shown', (_e, shown) => fn(shown)),
  onFullScreen: (fn) => ipcRenderer.on('win:full', (_e, on) => fn(on)),
  // Where faces are in a grey camera frame (w x h bytes): { faces: [[x, y, w, h], ...] }.
  findFaces: (w, h, pixels) => ipcRenderer.invoke('faces:find', w, h, pixels),
  stopFaces: () => ipcRenderer.invoke('faces:stop'),
  // Opens a https://strudel.cc/#... link in the default browser.
  openStrudel: (url) => ipcRenderer.invoke('open:strudel', url),
  // Opens a bug report's draft, or a misread report's (a github.com/StopBanning/toaster/issues/new link), the same way.
  openBugIssue: (url) => ipcRenderer.invoke('open:bug-issue', url),
  // Recording (M): a capture id for the page itself, then the video to a file, piece by piece.
  recSource: () => ipcRenderer.invoke('rec:source'),
  recStart: (ext) => ipcRenderer.invoke('rec:start', ext),
  recChunk: (token, buf) => ipcRenderer.invoke('rec:chunk', token, buf),
  recStop: (token, failed = false) => ipcRenderer.invoke('rec:stop', token, failed),
  recShow: (file) => ipcRenderer.invoke('rec:show', file),
  // the file couldn't be written (fn gets why); the window is closing mid-recording (fn finishes
  // the video, then calls closeWindow)
  onRecFailed: (fn) => ipcRenderer.on('rec:failed', (_e, token, why) => fn(token, why)),
  onRecFinish: (fn) => ipcRenderer.on('rec:finish', () => fn()),
  closeWindow: () => ipcRenderer.invoke('win:close'),
  // Song export (X): the song as MIDI bytes and as Strudel code, into Music\Toaster.
  saveSong: (name, midi, code) => ipcRenderer.invoke('song:save', name, midi, code),
  saveRebuilt: (midiFile, code, files) => ipcRenderer.invoke('song:save-rebuilt', midiFile, code, files),
  // The perfect take (stream B): a take begun (its details; says its id), its sound as it comes, its end (with what changed);
  // main draws it again beside the recording and says how far along it is, when it's done (the file) or why it couldn't be.
  takeBegin: (meta) => ipcRenderer.invoke('take:begin', meta),
  takeSound: (id, data) => ipcRenderer.send('take:sound', id, data),
  takeEnd: (id, end) => ipcRenderer.invoke('take:end', id, end),
  takeCancel: () => ipcRenderer.invoke('take:cancel'),
  onTakeProgress: (fn) => ipcRenderer.on('take:progress', (_e, f) => fn(f)),
  onTakeDone: (fn) => ipcRenderer.on('take:done', (_e, file) => fn(file)),
  onTakeFailed: (fn) => ipcRenderer.on('take:failed', (_e, why) => fn(why)),
  // Drop clips (J): a finished clip, whole, into Videos\Toaster.
  saveClip: (buf, ext) => ipcRenderer.invoke('clip:save', buf, ext),
  // Updates (update.js): a newer release, or null; on your yes, fetch it and restart into it; or
  // its page in the browser. fn(fraction) as the download comes in.
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updatePage: () => ipcRenderer.invoke('update:page'),
  onUpdateProgress: (fn) => ipcRenderer.on('update:progress', (_e, p) => fn(p)),
  // The header's star button: GitHub's star count (or null), and the project's page in the browser.
  stars: () => ipcRenderer.invoke('repo:stars'),
  openRepo: () => ipcRenderer.invoke('repo:open'),
  // the station list (docs/radio-stations.md) in the browser, from the library's empty radio
  openStations: () => ipcRenderer.invoke('stations:open'),
  // The radio's song: start reading the titles in the stream at url (null stops it), fn({ title,
  // artist } or null) for each new one; and a song's cover from the iTunes Store, as the picture's
  // bytes (null: none found).
  radioTitles: (url) => ipcRenderer.invoke('radio:titles', url),
  onRadioTitle: (fn) => ipcRenderer.on('radio:title', (_e, song) => fn(song)),
  radioCover: (artist, title) => ipcRenderer.invoke('radio:cover', artist, title),
  // The player bar: play and pause, next or previous on the system's own player (who: 'music' or 'spotify' on a Mac,
  // 'keys', the media keys, on Windows; action: 'playpause', 'next', 'previous'), and where it is in the song: { ok, ... }.
  // playerSent is for the checks: what a copy started with --player-dry-run was asked to send (null in any other).
  playerCommand: (who, action) => ipcRenderer.invoke('player:command', who, action),
  playerPosition: (who) => ipcRenderer.invoke('player:position', who),
  playerSent: () => ipcRenderer.invoke('player:sent'),
  // The library (G): the folder your music is in as main has it ({ path, label, chosen } or null), choosing another (the system's
  // dialog; the same, or null if it was cancelled), what the last scan kept at once and a scan ({ folder, tracks, covers }; fn({ seen,
  // files, read, reading }) as it goes), and the bytes of one audio file in that folder ({ name, bytes }). main refuses a read of
  // anything that isn't audio inside it; the page never names a folder.
  libraryFolder: () => ipcRenderer.invoke('library:folder'),
  libraryChoose: () => ipcRenderer.invoke('library:choose'),
  libraryCached: () => ipcRenderer.invoke('library:cached'),
  libraryScan: () => ipcRenderer.invoke('library:scan'),
  libraryRead: (rel) => ipcRenderer.invoke('library:read', rel),
  // The Earth's views (V): a clip's bytes, from the copy kept in the settings folder (downloaded the first time).
  earthClip: (name) => ipcRenderer.invoke('earth:clip', name),
  // Looks from outside (U): the shaders that ship and the ones in the looks folder; the folder, opened.
  looksList: () => ipcRenderer.invoke('looks:list'),
  looksOpen: () => ipcRenderer.invoke('looks:open'),
  onLibraryProgress: (fn) => ipcRenderer.on('library:progress', (_e, p) => fn(p)),
  // Spotify (the library's spotify section): whether this copy is connected ({ connected, clientId }: never a token, which main keeps), connecting
  // with the listener's own Client ID (the system browser opens Spotify's page; resolves once they've agreed) and disconnecting, a list of
  // theirs (list: playlists, albums, liked, or playlist or album with an id) as rows, a play on the device Spotify has open, a pasted link played
  // in the Spotify app (the link as main read it: { kind, id, uri }), and a cover (an i.scdn.co address) as a data: address. main checks each
  // request before anything is sent; a failure comes back as an error in words.
  spotifyStatus: () => ipcRenderer.invoke('spotify:status'),
  spotifyConnect: (clientId) => ipcRenderer.invoke('spotify:connect', clientId),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  spotifyList: (request) => ipcRenderer.invoke('spotify:list', request),
  spotifyPlayback: () => ipcRenderer.invoke('spotify:playback'),
  spotifyControl: (request) => ipcRenderer.invoke('spotify:control', request),
  spotifyPlay: (request) => ipcRenderer.invoke('spotify:play', request),
  spotifyOpen: (text) => ipcRenderer.invoke('spotify:open', text),
  spotifySearch: (query) => ipcRenderer.invoke('spotify:search', query),
  spotifyCover: (url) => ipcRenderer.invoke('spotify:cover', url),
  spotifyDashboard: () => ipcRenderer.invoke('spotify:dashboard'),
  // The hand log (Ctrl+Shift+H): numbers only, into the settings folder.
  handLogStart: () => ipcRenderer.invoke('handlog:start'),
  handLogAdd: (text) => ipcRenderer.invoke('handlog:add', text),
  handLogStop: () => ipcRenderer.invoke('handlog:stop'),
});
