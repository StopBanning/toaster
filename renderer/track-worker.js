// Runs MediaPipe's hand and face trackers on a thread of their own, so the beat detection and the
// drawing on the page never wait for them. The page sends camera frames ({ frame: ImageBitmap,
// t, face: wanted?, cut: wanted? }) and gets back where the hands and face are, in the frame's own
// 0-1 coordinates (not mirrored): { hands: [{ side, points: [[x, y] x 21], world: [[x, y, z] x 21] }],
// face: [[x, y] x 478], pose, mask }. pose is how the head is turned: MediaPipe's facial
// transformation matrix (4 x 4, column by column), with the face. With cut, mask is where a person
// is, for the cut-out: { data: 0-255 a pixel, w, h }, the frame at 256 across.
import { FilesetResolver, HandLandmarker, FaceLandmarker, ImageSegmenter } from '../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';

const at = (path) => new URL(path, import.meta.url).href;
let files = null, hands = null, face = null, faceMaking = null, faceError = null, cutter = null, cutMaking = null, cutError = null, delegate = 'GPU';
const options = (file, on = delegate) => ({ baseOptions: { modelAssetPath: at(`models/${file}`), delegate: on }, runningMode: 'VIDEO' });
// MediaPipe runs its WASM loader script to make each model, and clears what it set up once the
// model is made. In a module worker that script is imported, and an import only ever runs once, so
// a model made after the first (the face, the cut-out) failed with "ModuleFactory not set". Each
// of those gets the loader at an address of its own, which runs it afresh.
const filesFor = (name) => ({ ...files, wasmLoaderPath: `${files.wasmLoaderPath}?for=${name}` });

// On the graphics card (about 25 ms a look for hands and face; the very first time ever it takes
// a moment to set up, then Chromium remembers), or on the processor if that fails (about 60 ms).
// ?on=cpu forces the processor. The hands are ready first; the face model is only made the first
// time a look wants the face (big eyes, a drop's close-ups), and until it's ready looks go on
// without it.
const ready = (async () => {
  files = await FilesetResolver.forVisionTasks(at('../node_modules/@mediapipe/tasks-vision/wasm'), true);
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
  // (with blendshapes: how shut each eye is, for a wink; and the head's turn, for the skull)
  const make = (on) => FaceLandmarker.createFromOptions(filesFor('face-' + on), { ...options('face_landmarker.task', on), numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
  faceMaking ||= make(delegate)
    .catch((err) => { if (delegate === 'CPU') throw err; console.warn('face tracking on the graphics card failed, using the processor:', err); return make('CPU'); })
    .then((f) => { face = f; }, (err) => { faceError = String(err?.message || err); console.error('face tracking failed:', err); });
}
// The selfie segmenter (who's a person in the picture), made the first time a look wants it.
function wantCut() {
  const make = (on) => ImageSegmenter.createFromOptions(filesFor('cut-' + on), { ...options('selfie_segmenter.tflite', on), outputConfidenceMasks: true, outputCategoryMask: false });
  cutMaking ||= make(delegate)
    .catch((err) => { if (delegate === 'CPU') throw err; console.warn('cut-out on the graphics card failed, using the processor:', err); return make('CPU'); })
    .then((c) => { cutter = c; }, (err) => { cutError = String(err?.message || err); console.error('cut-out failed:', err); });
}
// Where a person is, at 256 across: 0-255 a pixel.
async function personMask(frame, t) {
  const w = 256, h = Math.max(1, Math.round((256 * frame.height) / frame.width));
  const small = await createImageBitmap(frame, { resizeWidth: w, resizeHeight: h, resizeQuality: 'low' });
  try {
    const r = cutter.segmentForVideo(small, t);
    const m = r.confidenceMasks?.[0];
    if (!m) { r.close(); return null; }
    const f = m.getAsFloat32Array(), data = new Uint8Array(f.length);
    for (let i = 0; i < f.length; i++) data[i] = f[i] * 255;
    const out = { data, w: m.width, h: m.height };
    r.close();
    return out;
  } finally { small.close(); }
}
ready.then(() => postMessage({ ready: true }), (err) => postMessage({ error: String(err?.message || err) }));

onmessage = async ({ data }) => {
  const { frame, t } = data;
  try {
    await ready;
    const start = performance.now();
    const h = hands.detectForVideo(frame, t);
    if (data.face && !face) wantFace();
    const fr = data.face && face ? face.detectForVideo(frame, t) : null, f = fr?.faceLandmarks[0] || null;
    // how shut each eye is (0 open, 1 shut): [left, right], the person's own
    const shapes = fr?.faceBlendshapes?.[0]?.categories, shut = (name) => shapes?.find((c) => c.categoryName === name)?.score ?? 0;
    const eyes = shapes ? [shut('eyeBlinkLeft'), shut('eyeBlinkRight')] : null;
    if (data.cut && !cutter) wantCut();
    const mask = data.cut && cutter ? await personMask(frame, t) : null;
    postMessage({
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
      cutError: data.cut ? cutError : null,
      faceError: data.face ? faceError : null,
    }, mask ? [mask.data.buffer] : []);
  } catch (err) {
    postMessage({ t, hands: [], face: null, error: String(err?.message || err) });
  } finally {
    frame.close();
  }
};
