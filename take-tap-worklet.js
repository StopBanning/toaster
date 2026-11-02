// The perfect take's sound tap, on the audio thread (renderer/take-tap.js runs it): every render quantum it hears, sent on
// at once with its place on the audio clock (currentFrame, the quantum's first sample), the channels interleaved.
// Nothing is kept here and nothing is played: the node has no outputs.
class TakeTap extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.channels = options?.processorOptions?.channels || 2;
    this.on = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.on = false; };
  }
  process(inputs) {
    if (!this.on) return false;
    const input = inputs[0] || [], n = input[0]?.length || 128, ch = this.channels, out = new Float32Array(n * ch);
    for (let c = 0; c < ch; c++) {
      const from = input[c] || input[0]; // (a mono input goes to every channel; none at all is silence)
      if (from) for (let i = 0; i < n; i++) out[i * ch + c] = from[i];
    }
    this.port.postMessage({ frame: currentFrame, data: out }, [out.buffer]);
    return true;
  }
}
registerProcessor('take-tap', TakeTap);
