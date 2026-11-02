// The perfect take's sound (stream B): a node that hears what the app hears, every sample, and hands it on in blocks
// (a second each by default) with each block's place on the audio clock. The re-render pairs the picture's clock times
// with these, so the tap is connected before M's delay (recDelay): the take lines the two up itself. Its worklet is
// take-tap-worklet.js; the node has no outputs, so nothing is played twice.
//
// send({ frame, at, data }) gets each block: frame is the audio clock's sample number of its first sample, at the same in
// seconds, data the channels interleaved (Float32Array). flush() hands on the block not yet full, now; stop() hands on
// what's left and says where the take's sound began and how long it is.
export async function createTakeTap(ac, { send, channels = 2, block = 1 }) {
  await ac.audioWorklet.addModule(new URL('./take-tap-worklet.js', import.meta.url));
  const node = new AudioWorkletNode(ac, 'take-tap', {
    numberOfInputs: 1, numberOfOutputs: 0, channelCount: channels, channelCountMode: 'explicit', channelInterpretation: 'speakers',
    processorOptions: { channels },
  });
  const size = Math.round(ac.sampleRate * block) * channels;
  let buf = new Float32Array(size), fill = 0, blockFrame = -1, first = -1, samples = 0, next = -1, gaps = 0, stopped = false;
  const flush = () => {
    if (!fill) return;
    send({ frame: blockFrame, at: blockFrame / ac.sampleRate, data: buf.slice(0, fill) });
    fill = 0; blockFrame = -1;
  };
  node.port.onmessage = ({ data: { frame, data } }) => {
    if (stopped) return;
    if (first < 0) first = frame;
    if (next >= 0 && frame !== next) { gaps++; flush(); } // (the audio clock never skips; if it ever did, a new block starts where it went)
    next = frame + data.length / channels;
    for (let i = 0; i < data.length;) {
      if (blockFrame < 0) blockFrame = frame + i / channels;
      const n = Math.min(data.length - i, size - fill);
      buf.set(data.subarray(i, i + n), fill);
      fill += n; i += n;
      if (fill === size) { send({ frame: blockFrame, at: blockFrame / ac.sampleRate, data: buf }); buf = new Float32Array(size); fill = 0; blockFrame = -1; }
    }
    samples += data.length / channels;
  };
  return {
    node,
    flush,
    stop() {
      if (stopped) return null;
      stopped = true;
      node.port.postMessage('stop');
      try { node.disconnect(); } catch { /* not connected */ }
      flush();
      node.port.onmessage = null;
      return { firstFrame: first, firstAt: first < 0 ? null : first / ac.sampleRate, samples, gaps };
    },
  };
}
