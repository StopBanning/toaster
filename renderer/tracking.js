// Hands and face from the webcam, with Google's MediaPipe (the models are in renderer/models),
// worked out in track-worker.js so the beat and the drawing never wait for it. A look at every
// camera frame (about 30 a second) while there are hands about (or the face is wanted): the
// tracker follows each hand from one look to the next, and looking every frame rather than 20
// times a second kept both hands of a heart found (100% of looks, against 94-100%) at no cost the
// main thread could measure; after 2 seconds without a hand, 8 a second, which still catches a
// hand coming up within a moment. Everything stays on this PC.
import { createHandSmoother } from './smooth.js';

export function createTracker(on = 'gpu') {
  let worker = null, ready = false, busy = false, error = '', last = 0, seenAt = 0, cost = 0, handAt = 0, answered = false;
  let hands = [], face = null, pose = null, eyes = null, mask = null, maskAt = 0;
  // the hands' points, held steady (smooth.js)
  const steady = createHandSmoother();
  // If it fails to start (the models, the graphics card), it tries again: three more times, 3, 6
  // and 9 seconds later; then it gives up until the camera is turned on again.
  let wanted = false, tries = 0, retry = 0, waiting = 0;
  let featureErrors = {};
  const fail = (why) => {
    error = why;
    console.error('tracking:', why);
    worker?.terminate();
    worker = null;
    ready = busy = false;
    clearTimeout(waiting);
    hands = steady([], 0);
    face = pose = eyes = mask = null;
    featureErrors = {};
    if (wanted && tries < 3) { tries++; retry = setTimeout(() => { retry = 0; if (wanted && !worker) open(); }, 3000 * tries); }
  };
  function open() {
    handAt = performance.now();
    const active = worker = new Worker(new URL(`./track-worker.js?on=${on}`, import.meta.url), { type: 'module' });
    answered = false;
    waiting = setTimeout(() => { if (worker === active) fail('tracking took too long to start'); }, 30000);
    active.onmessage = ({ data }) => {
      if (worker !== active) return;
      clearTimeout(waiting);
      if (data.type === 'ready') { ready = true; error = ''; return; }
      if (data.type === 'fatal') { fail(data.error || 'tracking failed'); return; }
      if (data.type !== 'result') { fail('tracking returned an unreadable reply'); return; }
      busy = false;
      answered = true;
      // A startup success isn't enough to reset inference retries: only a working frame is.
      tries = 0;
      hands = steady(data.hands, data.t);
      face = data.face;
      pose = data.pose || null;
      eyes = data.eyes || null;
      if (hands.length) handAt = performance.now();
      mask = data.mask || null;
      if (mask) maskAt = performance.now();
      featureErrors = data.featureErrors || {};
      cost = cost ? cost * 0.9 + data.ms * 0.1 : data.ms;
      seenAt = performance.now();
    };
    active.onerror = (e) => { if (worker === active) fail(e.message || 'tracker failed to start'); };
    active.onmessageerror = () => { if (worker === active) fail('tracking returned an unreadable reply'); };
  }

  return {
    start() {
      if (worker) return;
      wanted = true;
      tries = 0;
      error = '';
      clearTimeout(retry);
      last = 0;
      open();
    },
    stop() {
      wanted = false;
      clearTimeout(retry);
      clearTimeout(waiting);
      retry = 0;
      worker?.terminate();
      worker = null;
      ready = busy = false;
      hands = steady([], 0);
      face = pose = eyes = mask = null;
      featureErrors = {};
    },
    // Sends the camera's current frame along, unless one is still being looked at. wantFace,
    // wantCut: whether to find the face, and where a person is (the cut-out), too.
    update(video, wantFace, wantCut = false) {
      if (!worker || !ready || busy || !video || video.readyState < 2) return;
      const now = performance.now();
      if (now - last < (!wantFace && !wantCut && now - handAt > 2000 ? 125 : 33)) return;
      last = now;
      busy = true;
      const active = worker;
      // (a frame that never comes back: timed only once this worker has answered one, since the very
      // first look on a cold graphics card, or on the software renderer, can take many seconds)
      if (answered) waiting = setTimeout(() => { if (worker === active) fail('tracking did not return a camera frame'); }, 15000);
      createImageBitmap(video, { resizeWidth: 640, resizeQuality: 'medium' }).then(
        (frame) => {
          if (worker !== active) { frame.close(); return; }
          try { active.postMessage({ frame, t: now, face: wantFace, cut: wantCut }, [frame]); }
          catch (err) { frame.close(); fail(String(err?.message || err)); }
        },
        () => { if (worker === active) { clearTimeout(waiting); busy = false; } },
      );
    },
    get ready() { return ready; },
    // why it couldn't start ('' if it could, or hasn't tried); and whether it has given up
    get error() { return error; },
    // Optional models can fail while hands keep working. Each says whether it will retry.
    get featureErrors() { return featureErrors; },
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
