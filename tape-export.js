// Long sets can take hundreds of milliseconds to write out. Only start a worker when X is
// pressed, and retire it on success or failure; the listening and drawing stay on this thread.
export function buildSongFiles(song, name, about) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./tape-worker.js', import.meta.url), { type: 'module' });
    const finish = (err, result) => {
      clearTimeout(timeout);
      worker.terminate();
      if (err) reject(err); else resolve(result);
    };
    const timeout = setTimeout(() => finish(new Error('The song export took too long. Try exporting it again.')), 60000);
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data);
    worker.onerror = (e) => { e.preventDefault(); finish(new Error(e.message || 'The song could not be exported.')); };
    worker.onmessageerror = () => finish(new Error('The song export could not be read.'));
    try { worker.postMessage({ song, name, about }); } catch (err) { finish(err); }
  });
}
