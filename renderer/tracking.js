// Hands and face from the webcam, with Google's MediaPipe (the models are in renderer/models),
// worked out in track-worker.js so the beat and the drawing never wait for it. A look at every
// camera frame (about 30 a second) while there are hands about (or the face is wanted): the
// tracker follows each hand from one look to the next, and looking every frame rather than 20
// times a second kept both hands of a heart found (100% of looks, against 94-100%) at no cost the
// main thread could measure; after 2 seconds without a hand, 8 a second, which still catches a
// hand coming up within a moment. Everything stays on this PC.
import { createHandSmoother } from './smooth.js';

export function createTracker(on = 'gpu') {
  let worker = null, ready = false, busy = false, error = '', last = 0, seenAt = 0, cost = 0, handAt = 0;
  let hands = [], face = null, pose = null, eyes = null, mask = null, maskAt = 0;
  // the hands' points, held steady (smooth.js)
  const steady = createHandSmoother();
  // If it fails to start (the models, the graphics card), it tries again: three more times, 3, 6
  // and 9 seconds later; then it gives up until the camera is turned on again.
  let wanted = false, tries = 0, retry = 0;
  const fail = (why) => {
    error = why;
    console.error('tracking:', why);
    worker?.terminate();
    worker = null;
    ready = busy = false;
    if (wanted && tries < 3) { tries++; retry = setTimeout(() => { retry = 0; if (wanted && !worker) open(); }, 3000 * tries); }
  };
  function open() {
    handAt = performance.now();
    worker = new Worker(new URL(`./track-worker.js?on=${on}`, import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.ready) { ready = true; error = ''; tries = 0; return; }
      if (data.error && !('hands' in data)) { fail(data.error); return; }
      busy = false;
      hands = steady(data.hands, data.t);
      face = data.face;
      pose = data.pose || null;
      eyes = data.eyes || null;
      if (hands.length) handAt = performance.now();
      if (data.mask) { mask = data.mask; maskAt = performance.now(); }
      cost = cost ? cost * 0.9 + data.ms * 0.1 : data.ms;
      seenAt = performance.now();
    };
    worker.onerror = (e) => fail(e.message || 'tracker failed to start');
  }

  return {
    start() {
      if (worker) return;
      wanted = true;
      tries = 0;
      error = '';
      clearTimeout(retry);
      open();
    },
    stop() {
      wanted = false;
      clearTimeout(retry);
      worker?.terminate();
      worker = null;
      ready = busy = false;
      hands = [];
      face = pose = mask = null;
    },
    // Sends the camera's current frame along, unless one is still being looked at. wantFace,
    // wantCut: whether to find the face, and where a person is (the cut-out), too.
    update(video, wantFace, wantCut = false) {
      if (!worker || !ready || busy || !video || video.readyState < 2) return;
      const now = performance.now();
      if (now - last < (!wantFace && !wantCut && now - handAt > 2000 ? 125 : 33)) return;
      last = now;
      busy = true;
      createImageBitmap(video, { resizeWidth: 640, resizeQuality: 'medium' }).then(
        (frame) => worker ? worker.postMessage({ frame, t: now, face: wantFace, cut: wantCut }, [frame]) : frame.close(),
        () => { busy = false; },
      );
    },
    get ready() { return ready; },
    // why it couldn't start ('' if it could, or hasn't tried); and whether it has given up
    get error() { return error; },
    get gaveUp() { return !!error && !worker && !retry; },
    // how long a look takes, on average (ms, on the tracker's own thread)
    get cost() { return cost; },
    // the latest, if it's fresh (half a second): hands [{ side, points }], face [[x, y] x 478]
    get hands() { return performance.now() - seenAt < 500 ? hands : []; },
    get face() { return performance.now() - seenAt < 500 ? face : null; },
    // how the head is turned (MediaPipe's facial transformation matrix: 4 x 4, column by column),
    // with the face
    get pose() { return performance.now() - seenAt < 500 ? pose : null; },
    // how shut each eye is, [left, right] 0-1, while the face is being looked for, if fresh
    get eyes() { return performance.now() - seenAt < 500 ? eyes : null; },
    // where a person is (0-255 a pixel, the camera's frame at 256 across), if fresh
    get mask() { return performance.now() - maskAt < 500 ? mask : null; },
  };
}
