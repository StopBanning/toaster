// Runs MediaPipe's hand and face trackers on a thread of their own, so the beat detection and the
// drawing on the page never wait for them. The page sends camera frames ({ frame: ImageBitmap,
// t, face: wanted?, cut: wanted? }) and gets back where the hands and face are, in the frame's own
// 0-1 coordinates (not mirrored): { hands: [{ side, points: [[x, y] x 21], world: [[x, y, z] x 21] }],
// face: [[x, y] x 478], pose, mask, featureErrors }. Replies have type ready, result or fatal;
// an optional model's failure belongs to featureErrors, never a fake empty hand detection.
// pose is how the head is turned: MediaPipe's facial
// transformation matrix (4 x 4, column by column), with the face. With cut, mask is where a person
// is, for the cut-out: { data: 0-255 a pixel, w, h }, the frame at 256 across.
import { FilesetResolver, HandLandmarker, FaceLandmarker, ImageSegmenter } from './vendor/tasks-vision/vision_bundle.mjs';

const at = (path) => new URL(path, import.meta.url).href;
let files = null, hands = null, delegate = 'GPU';
const optional = Object.fromEntries(['face', 'cut'].map((name) => [name, { model: null, making: null, error: '', tries: 0, retryAt: 0 }]));
const options = (file, on = delegate) => ({ baseOptions: { modelAssetPath: at(`models/${file}`), delegate: on }, runningMode: 'VIDEO' });
// MediaPipe runs its WASM loader script to make each model, and clears what it set up once the
// model is made. In a module worker that script is imported, and an import only ever runs once, so
// a model made after the first (the face, the cut-out) failed with "ModuleFactory not set". Each
// of those gets the loader at an address of its own, which runs it afresh.
let loader = 0;
const filesFor = (name) => ({ ...files, wasmLoaderPath: `${files.wasmLoaderPath}?for=${name}&try=${++loader}` });

// On the graphics card (about 25 ms a look for hands and face; the very first time ever it takes
// a moment to set up, then Chromium remembers), or on the processor if that fails (about 60 ms).
// ?on=cpu forces the processor. The hands are ready first; the face model is only made the first
// time a look wants the face (big eyes, a drop's close-ups), and until it's ready looks go on
// without it.
const ready = (async () => {
  files = await FilesetResolver.forVisionTasks(at('./vendor/tasks-vision/wasm'), true);
  // a little more willing than the defaults (0.5) to keep hold of a hand through a fast turn or
  // flip, the way the finger frame gets played with
  const make = () => HandLandmarker.createFromOptions(files, { ...options('hand_landmarker.task'), numHands: 2, minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.35, minTrackingConfidence: 0.35 });
  if (new URL(import.meta.url).searchParams.get('on') !== 'cpu') {
    try { hands = await make(); return; } catch (err) { console.warn('tracking on the graphics card failed, using the processor:', err); }
  }
  delegate = 'CPU';
  hands = await make();
})();
function wantFace() {
  // (with blendshapes: how shut each eye is, for a wink; and the head's turn, for the skull) On the
  // processor, as the segmenter: set up on the graphics card it hitched the picture for up to 0.6 s,
  // twice, the first time the windows or big eyes came on; and with a face in view it costs the same
  // there (hands and face 58 ms a look, against 57)
  const make = () => FaceLandmarker.createFromOptions(filesFor('face-CPU'), { ...options('face_landmarker.task', 'CPU'), numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
  wantFeature('face', make);
}
// The selfie segmenter (who's a person in the picture), made the first time a look wants it, and
// always on the processor: made on the graphics card, its setting up froze every window's picture
// for about 1.2 s (the GPU process is shared) the first time the cut-out, dots or voxels came on. It's
// small: on the processor it costs this worker about 6 ms a look, never the page.
function wantCut() {
  const make = () => ImageSegmenter.createFromOptions(filesFor('cut-CPU'), { ...options('selfie_segmenter.tflite', 'CPU'), outputConfidenceMasks: true, outputCategoryMask: false });
  wantFeature('cut', make);
}
function featureFailed(name, err) {
  const f = optional[name];
  try { f.model?.close(); } catch { /* already failed */ }
  f.model = null;
  f.error = String(err?.message || err);
  f.tries = Math.max(1, f.tries);
  f.retryAt = performance.now() + 3000 * f.tries;
}
function wantFeature(name, make) {
  const f = optional[name];
  if (f.model || f.making || f.tries >= 4 || performance.now() < f.retryAt) return;
  f.tries++;
  f.making = make(delegate)
    .catch((err) => { if (delegate === 'CPU') throw err; return make('CPU'); })
    .then((model) => { f.model = model; }, (err) => featureFailed(name, err))
    .finally(() => { f.making = null; });
}
const featureError = (name, wanted) => {
  const f = optional[name];
  return wanted && f.error ? { message: f.error, retrying: f.tries < 4 } : null;
};
// Where a person is, at 256 across: 0-255 a pixel.
async function personMask(frame, t) {
  const w = 256, h = Math.max(1, Math.round((256 * frame.height) / frame.width));
  const small = await createImageBitmap(frame, { resizeWidth: w, resizeHeight: h, resizeQuality: 'low' });
  try {
    const r = optional.cut.model.segmentForVideo(small, t);
    try {
      const m = r.confidenceMasks?.[0];
      if (!m) return null;
      const f = m.getAsFloat32Array(), data = new Uint8Array(f.length);
      for (let i = 0; i < f.length; i++) data[i] = f[i] * 255;
      return { data, w: m.width, h: m.height };
    } finally { r.close(); }
  } finally { small.close(); }
}
ready.then(() => postMessage({ type: 'ready' }), (err) => postMessage({ type: 'fatal', error: String(err?.message || err) }));

onmessage = async ({ data }) => {
  const { frame, t } = data;
  try {
    await ready;
    const start = performance.now();
    const h = hands.detectForVideo(frame, t);
    let fr = null, mask = null;
    if (data.face) {
      wantFace();
      if (optional.face.model) try {
        fr = optional.face.model.detectForVideo(frame, t);
        optional.face.error = ''; optional.face.tries = 0;
      } catch (err) { featureFailed('face', err); }
    }
    const f = fr?.faceLandmarks[0] || null;
    // how shut each eye is (0 open, 1 shut): [left, right], the person's own
    const shapes = fr?.faceBlendshapes?.[0]?.categories, shut = (name) => shapes?.find((c) => c.categoryName === name)?.score ?? 0;
    const eyes = shapes ? [shut('eyeBlinkLeft'), shut('eyeBlinkRight')] : null;
    if (data.cut) {
      wantCut();
      if (optional.cut.model) try {
        mask = await personMask(frame, t);
        optional.cut.error = ''; optional.cut.tries = 0;
      } catch (err) { featureFailed('cut', err); }
    }
    postMessage({
      type: 'result',
      t,
      ms: performance.now() - start,
      // points: on the frame (0-1); world: the same in 3D, in metres round the hand's middle, for
      // judging its shape however it's turned
      hands: h.landmarks.map((points, i) => ({
        side: h.handedness[i]?.[0]?.categoryName || '',
        points: points.map((p) => [p.x, p.y]),
        world: h.worldLandmarks[i]?.map((p) => [p.x, p.y, p.z]) || null,
      })),
      face: f ? f.map((p) => [p.x, p.y]) : null,
      pose: f && fr.facialTransformationMatrixes?.[0] ? Array.from(fr.facialTransformationMatrixes[0].data) : null,
      eyes,
      mask,
      featureErrors: { face: featureError('face', data.face), cut: featureError('cut', data.cut) },
    }, mask ? [mask.data.buffer] : []);
  } catch (err) {
    postMessage({ type: 'fatal', t, error: String(err?.message || err) });
  } finally {
    frame.close();
  }
};
