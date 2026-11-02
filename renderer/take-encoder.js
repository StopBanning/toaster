// The hidden page that encodes the perfect take (helpers/take-render.cjs sends it the job, the sound and the frames), one
// thing at a time and in order, through take-encode.js. The first thing that goes wrong is sent back in words; main then
// ends the render.
import { createTakeEncoder } from './take-encode.js';

const api = window.takeEncoder;
let enc = null, chain = Promise.resolve(), stopped = false;
const then = (fn) => {
  chain = chain.then(() => (stopped ? null : fn())).catch((e) => { stopped = true; enc?.abort(); api.failed(e?.message || String(e)); });
};
api.onStart((job) => then(async () => {
  enc = await createTakeEncoder({ ...job, write: (data, at) => api.write(data, at) });
  api.started({ video: enc.codecs.video.profile, audio: enc.codecs.audio ? (enc.codecs.audio.codec === 'opus' ? 'Opus' : 'AAC') : null, priming: enc.priming });
}));
api.onSound((planes) => then(() => enc.addSound(planes)));
api.onFrame((k, width, height, data) => then(async () => { await enc.addFrame({ data, width, height }, k); api.encoded(k); }));
api.onFinish(() => then(async () => api.finished(await enc.finish())));
