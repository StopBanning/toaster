// The library's scan, in a worker thread (helpers/library.cjs starts it): it walks the folder and reads each new or changed file with
// the page's own readers (renderer/audio-tags.js and embedded-cover.js, plain modules that work on anything with a size and
// slice()), and posts what it finds. Main's loop and the page are never in it. The readers are loaded from where main says
// they are (rendererDir), as the app's own files are wherever it is installed.
'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parentPort, workerData } = require('node:worker_threads');
const { scanFolder } = require('./library.cjs');

(async () => {
  const { root, known, knownCovers, rendererDir } = workerData;
  const load = (name) => import(pathToFileURL(path.join(rendererDir, name)).href);
  const [{ readTags }, { embeddedCover }] = await Promise.all([load('audio-tags.js'), load('embedded-cover.js')]);
  await scanFolder({
    root, known, knownCovers, readTags, readCover: embeddedCover,
    post: (message) => parentPort.postMessage(message),
  });
})().catch((err) => parentPort.postMessage({ type: 'error', message: String(err?.message || err) }));
