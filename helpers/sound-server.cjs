// The rebuilt songs' sounds, for strudel.cc (Colin's pick, Nov 13: "Toaster serves"). While Toaster is open, a song rebuilt from its
// own sounds (helpers/save-rebuilt.cjs) plays at strudel.cc with its sounds fetched from here: http://localhost:PORT/<folder>/<sound>.
// Only this computer can reach it (127.0.0.1), only GET and the browser's preflight, only a .wav with a plain name inside a folder
// whose name ends in " rebuilt", directly inside the songs folder. Nothing else is ever read. Chrome asks the listener once whether
// strudel.cc may reach "apps on this device"; the private-network header below is what it wants to hear from us.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { PLAIN } = require('./save-rebuilt.cjs');

const PORT = 47283;   // (fixed, so a saved song's code still finds its sounds after Toaster restarts)
const HEAD = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*' };

// the file a request names, or null: <folder ending " rebuilt">/<plain .wav name>, inside `root`
function fileFor(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  const m = /^\/([^/]+ rebuilt)\/(.+)$/.exec(p);
  if (!m || !PLAIN.test(m[2]) || m[1].includes('..') || /[\\\x00-\x1f]/.test(m[1])) return null;
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
    res.writeHead(200, { ...HEAD, 'Content-Type': 'audio/wav', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  };
}

// start(root: () => the songs folder) -> Promise<{ port, base(folder), close() }> or null if the port is taken (the code then
// finds no sounds; said once in the log)
function start(root, port = PORT) {
  return new Promise((resolve) => {
    const server = http.createServer(handler(root));
    server.on('error', (err) => { console.warn(`the rebuilt songs' sounds can't be served on port ${port}:`, err.code || err.message); resolve(null); });
    server.listen(port, '127.0.0.1', () => resolve({
      port: server.address().port,
      base: (folder) => `http://localhost:${server.address().port}/${encodeURIComponent(folder)}/`,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}

module.exports = { start, fileFor, PORT };
