// The rebuilt songs' sounds, for strudel.cc (Colin's pick, Nov 13: "Toaster serves"). While Toaster is open, a song rebuilt from its
// own sounds (helpers/save-rebuilt.cjs) plays at strudel.cc with its sounds fetched from here: http://localhost:PORT/<folder>/<sound>.
// Only this computer can reach it (127.0.0.1), only GET and the browser's preflight, only a .wav with a plain name (or strudel.json, which lists them) inside a folder
// that is a song's own: a folder directly inside the songs folder that holds song.strudel.js (a song's folder, since Nov 24) or whose name ends in
// " rebuilt" (the folders made before: they keep working where they are). Nothing else is ever read. Chrome asks the listener once whether
// strudel.cc may reach "apps on this device"; the private-network header below is what it wants to hear from us.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { allowed, LIST } = require('./save-rebuilt.cjs');

const PORT = 47283;   // (fixed, so a saved song's code still finds its sounds after Toaster restarts)
const HEAD = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*' };

// A song's folder: one Toaster made. Its code is the mark (song.strudel.js at the top), or, for the folders made before, the name's end.
const isSongFolder = (root, name, exists = fs.existsSync) => name.endsWith(' rebuilt') || exists(path.join(root, name, 'song.strudel.js'));

// the file a request names, or null: <a song's folder>/<plain .wav name>, inside `root`
function fileFor(root, urlPath, exists = fs.existsSync) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  const m = /^\/([^/]+)\/(.+)$/.exec(p);
  if (!m || !allowed(m[2]) || m[1] === '.' || m[1].includes('..') || /[\\\x00-\x1f]/.test(m[1]) || !isSongFolder(root, m[1], exists)) return null;
  const file = path.join(root, m[1], m[2]);
  if (path.relative(root, file).startsWith('..') || path.isAbsolute(path.relative(root, file))) return null;
  return file;
}

function handler(root) {
  return (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, HEAD); res.end(); return; }
    if (req.method !== 'GET') { res.writeHead(405, HEAD); res.end(); return; }
    const file = fileFor(root(), new URL(req.url, 'http://localhost').pathname);
    let st = null;
    try { st = file && fs.statSync(file); } catch { /* not there */ }
    if (!st || !st.isFile()) { res.writeHead(404, HEAD); res.end(); return; }
    res.writeHead(200, { ...HEAD, 'Content-Type': file.endsWith(LIST) ? 'application/json' : 'audio/wav', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  };
}

// start(root: () => the songs folder) -> Promise<{ port, base(folder), close() }> or null if the port is taken (the code then
// finds no sounds; said once in the log)
// A folder's name in an address. encodeURIComponent leaves ! ' ( ) * as they are, and the address is written into the song's code between
// single quotes (main.js song:save-rebuilt, rebuild.js program), so an apostrophe in a song's name ("Don't Stop Me Now") ended the string and
// the saved song did not run: those five are escaped too (fileFor reads them back with decodeURIComponent).
const encodeName = (name) => encodeURIComponent(name).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function start(root, port = PORT) {
  return new Promise((resolve) => {
    const server = http.createServer(handler(root));
    server.on('error', (err) => { console.warn(`the rebuilt songs' sounds can't be served on port ${port}:`, err.code || err.message); resolve(null); });
    server.listen(port, '127.0.0.1', () => resolve({
      port: server.address().port,
      base: (folder) => `http://localhost:${server.address().port}/${encodeName(folder)}/`,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}

// Whether the songs folder holds any song to serve (so the server is up as soon as Toaster is, where a song's code may be open at strudel.cc already).
function hasSongs(root) {
  try { return fs.readdirSync(root, { withFileTypes: true }).some((e) => e.isDirectory() && isSongFolder(root, e.name)); } catch { return false; }
}

module.exports = { start, fileFor, hasSongs, isSongFolder, encodeName, PORT };
