// What the export's tune hears (renderer/ear-worklet.js): the last minutes of the sound, kept on the audio thread at a half or a
// quarter of its rate. Run here on the audio thread's own terms (sampleRate, currentFrame, a port), quantum by quantum: a kept
// sample is the sound at the frame it says (frame0 + k * D), what's above the new rate is filtered out and what's below kept,
// a stretch asked for comes back whole in pieces, the ring wraps, and a skip in the audio clock is kept as silence so the
// samples after it are still where they say.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../renderer/ear-worklet.js', import.meta.url), 'utf8');

// one ear on a pretend audio thread at `rate`, keeping `seconds`
function ear(rate, seconds = 60) {
  const scope = { sampleRate: rate, currentFrame: 0, made: null };
  class AudioWorkletProcessor { constructor() { this.port = { sent: [], postMessage(m) { this.sent.push(m); }, onmessage: null }; } }
  // (the worklet reads sampleRate and currentFrame as globals: given here as getters on the scope)
  new Function('AudioWorkletProcessor', 'registerProcessor', 'scope', `with (scope) { ${source} }`)(
    AudioWorkletProcessor, (name, cls) => { scope.made = cls; }, scope);
  const node = new scope.made({ processorOptions: { seconds } });
  return {
    node, scope,
    // play the samples (mono) in 128-frame quanta from frame `at`
    play(samples, at = scope.currentFrame) {
      for (let i = 0; i < samples.length; i += 128) {
        scope.currentFrame = at + i;
        const q = new Float32Array(128); q.set(samples.subarray(i, i + 128));
        node.process([[q]]);
      }
      scope.currentFrame = at + Math.ceil(samples.length / 128) * 128;
    },
    // ask for [from, to] and let the audio thread come round until it has all been sent; the stretch put back together
    ask(from, to) {
      node.port.sent.length = 0;
      node.port.onmessage({ data: { id: 1, ask: [from, to] } });
      const head = node.port.sent[0];
      if (!head.length) return { head, data: null, pieces: 0 };
      const data = new Int16Array(head.length);
      let pieces = 0, done = false;
      for (let guard = 0; !done && guard < 10000; guard++) {
        node.process([[new Float32Array(128)]]);
        scope.currentFrame += 128;
        for (const m of node.port.sent.splice(1)) {
          if (m.data) { data.set(m.data, m.at); pieces++; assert.ok(m.data.length <= 1 << 17, 'a piece is small enough not to hold up the sound'); }
          if (m.done) done = true;
        }
      }
      assert.ok(done, 'the whole stretch was sent');
      return { head, data, pieces };
    },
  };
}

const tone = (rate, hz, seconds, amp = 0.5) => Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));
const rms = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += (a[i] / 32767) ** 2; return Math.sqrt(s / (to - from)); };

test('a kept sample is the sound at the frame it says, at 44.1, 48 and 96 kHz', () => {
  for (const rate of [44100, 48000, 96000]) {
    const e = ear(rate), D = Math.max(1, Math.floor(rate / 22050));
    const sound = new Float32Array(rate); // a second, a click at frame 12345 (the clock starting at 1000)
    sound[12345 - 1000] = 1;
    e.play(sound, 1000);
    const { head, data } = e.ask(1000, 1000 + rate);
    let peak = 0;
    for (let k = 1; k < data.length; k++) if (data[k] > data[peak]) peak = k;
    const at = head.frame0 + peak * head.D;
    assert.equal(head.D, D, `D at ${rate}`);
    assert.ok(Math.abs(at - 12345) <= D / 2, `${rate} Hz: the click is kept at frame ${at}, not 12345`);
  }
});

test('what is above the new rate is filtered out, what is below it kept at its level', () => {
  const rate = 48000, e = ear(rate);
  e.play(tone(rate, 1000, 1), 0);
  e.play(tone(rate, 16000, 1), rate);
  const { data } = e.ask(0, 2 * rate), half = data.length / 2;
  const low = rms(data, 2000, half - 2000), high = rms(data, half + 2000, data.length - 2000);
  assert.ok(Math.abs(low - 0.5 / Math.SQRT2) < 0.005, `1 kHz kept at its level (rms ${low.toFixed(4)})`);
  assert.ok(high < 0.5 / Math.SQRT2 / 100, `16 kHz, above the kept 12 kHz, filtered out (rms ${high.toFixed(5)}: under -40 dB)`);
});

test('a stretch comes back whole, in pieces, from the frame asked for; one not kept comes back empty', () => {
  const rate = 48000, e = ear(rate);
  const ramp = Float32Array.from({ length: rate * 20 }, (_, i) => ((i % 9600) / 9600) * 0.8 - 0.4);
  e.play(ramp, 0);
  const all = e.ask(0, rate * 20), part = e.ask(rate * 5, rate * 15);
  assert.ok(all.pieces > 1, 'in pieces');
  const k0 = (part.head.frame0 - all.head.frame0) / all.head.D;
  assert.ok(Number.isInteger(k0) && k0 >= 0, 'the stretch starts on a kept sample');
  assert.deepEqual(Array.from(part.data.subarray(0, 1000)), Array.from(all.data.subarray(k0, k0 + 1000)), 'the same samples as in the whole');
  assert.ok(Math.abs(part.head.frame0 - rate * 5) <= all.head.D, 'from the frame asked for');
  assert.equal(e.ask(rate * 30, rate * 40).head.length, 0, 'nothing kept that late');
});

test('the ring wraps: the newest seconds are kept, in order, and older ones are gone', () => {
  const rate = 48000, e = ear(rate, 2); // (two seconds kept)
  const slow = tone(rate, 50, 5);
  e.play(slow, 0);
  const got = e.ask(0, rate * 5);
  assert.equal(got.head.length, e.node.ring.length, 'two seconds of samples');
  assert.ok(Math.abs(got.head.frame0 - rate * 3) <= 64, 'the last two seconds');
  assert.equal(e.ask(0, rate * 2).head.length, 0, 'the first seconds are gone');
  // (in order: each kept sample is the 50 Hz tone at its frame)
  for (const k of [100, 5000, 30000, got.data.length - 200]) {
    const want = 0.5 * Math.sin((2 * Math.PI * 50 * (got.head.frame0 + k * got.head.D)) / rate);
    assert.ok(Math.abs(got.data[k] / 32767 - want) < 0.005, `sample ${k} in order`);
  }
});

test('a skip in the audio clock is kept as silence: what comes after is still at its frame', () => {
  const rate = 48000, e = ear(rate);
  e.play(tone(rate, 500, 0.5), 0);
  const click = new Float32Array(rate); click[3000] = 1;
  e.play(click, rate * 2); // (a second and a half with nothing processed, then a click 3000 frames in)
  const { head, data } = e.ask(0, rate * 3);
  let peak = Math.round((rate * 1.5) / head.D);
  for (let k = peak; k < data.length; k++) if (data[k] > data[peak]) peak = k;
  assert.ok(Math.abs(head.frame0 + peak * head.D - (rate * 2 + 3000)) <= 1, 'the click after the skip is at its frame');
  assert.ok(rms(data, Math.round((rate * 0.6) / head.D), Math.round((rate * 1.9) / head.D)) === 0, 'the skip is silence');
});

// ---------------------------------------------------------------- two channels (Nov 12: the voice splitter hears the singer better in stereo)
// play left and right in 128-frame quanta, then ask for it all back: { head, mid, side } (side null where none was sent)
function stereo(e, left, right) {
  const at = e.scope.currentFrame;
  for (let i = 0; i < left.length; i += 128) {
    e.scope.currentFrame = at + i;
    const l = new Float32Array(128), r = new Float32Array(128); l.set(left.subarray(i, i + 128)); r.set(right.subarray(i, i + 128));
    e.node.process([[l, r]]);
  }
  e.scope.currentFrame = at + Math.ceil(left.length / 128) * 128;
}
function askBoth(e, from, to) {
  e.node.port.sent.length = 0;
  e.node.port.onmessage({ data: { id: 1, ask: [from, to] } });
  const head = e.node.port.sent[0], mid = new Int16Array(head.length), side = head.wide ? new Int16Array(head.length) : null;
  let done = false, sideSeen = 0;
  for (let guard = 0; !done && guard < 10000; guard++) {
    e.node.process([[new Float32Array(128), new Float32Array(128)]]);
    e.scope.currentFrame += 128;
    for (const m of e.node.port.sent.splice(1)) {
      if (m.data) { mid.set(m.data, m.at); if (m.side) { side.set(m.side, m.at); sideSeen++; } }
      if (m.done) done = true;
    }
  }
  assert.ok(done);
  return { head, mid, side, sideSeen };
}

test('one channel, or two that are the same: nothing more is kept or sent than before', () => {
  const e = ear(44100), t = tone(44100, 440, 1);
  e.play(t);
  stereo(e, t, t);
  const got = askBoth(e, 0, 2 * 44100);
  assert.equal(got.head.wide, false);
  assert.equal(got.side, null); assert.equal(got.sideSeen, 0);
  assert.equal(e.node.side, null, 'no second ring was made');
  assert.ok(Math.abs(rms(got.mid, 2000, 40000) - 0.5 / Math.SQRT2) < 0.01);
});

test('two channels that differ: the middle is kept as ever and the side beside it, and left and right come back as their sum and difference', () => {
  const e = ear(44100), rate = 44100, L = tone(rate, 440, 1, 0.5), R = tone(rate, 660, 1, 0.3);
  stereo(e, L, R);
  const got = askBoth(e, 0, rate);
  assert.equal(got.head.wide, true);
  assert.ok(got.sideSeen >= 1 && got.side);
  const n = got.mid.length, left = Float32Array.from({ length: n }, (_, i) => (got.mid[i] + got.side[i]) / 32767), right = Float32Array.from({ length: n }, (_, i) => (got.mid[i] - got.side[i]) / 32767);
  // each is its own tone again: its level, and next to nothing of the other's (measured by projecting on each tone)
  const level = (x, hz) => { let c = 0, s = 0; const a = 2000, b = n - 2000; for (let i = a; i < b; i++) { const ph = 2 * Math.PI * hz * i / (rate / got.head.D); c += x[i] * Math.cos(ph); s += x[i] * Math.sin(ph); } return 2 * Math.hypot(c, s) / (b - a); };
  assert.ok(Math.abs(level(left, 440) - 0.5) < 0.01 && level(left, 660) < 0.005, `left: ${level(left, 440)} of its own, ${level(left, 660)} of the right's`);
  assert.ok(Math.abs(level(right, 660) - 0.3) < 0.01 && level(right, 440) < 0.005, `right: ${level(right, 660)} of its own, ${level(right, 440)} of the left's`);
});

test('a sound that starts in one channel and opens out: the side before it opened is silence, and after a skip too', () => {
  const e = ear(44100), rate = 44100, t = tone(rate, 440, 0.5);
  e.play(t);                                     // half a second, one channel
  stereo(e, t, new Float32Array(t.length));      // then left only
  const got = askBoth(e, 0, rate);
  assert.equal(got.head.wide, true);
  const half = got.mid.length >> 1;
  assert.ok(rms(got.side, 0, half - 100) === 0, 'nothing in the side while both channels were the same');
  assert.ok(Math.abs(rms(got.side, half + 500, got.side.length - 500) - 0.25 / Math.SQRT2) < 0.01, 'then half the left');
  e.scope.currentFrame += 128 * 40;              // the audio clock skips
  stereo(e, t, new Float32Array(t.length));
  const all = askBoth(e, 0, e.scope.currentFrame);
  // (the skipped stretch is silence in the side as in the middle: 40 quanta from one second in)
  const a = Math.ceil((rate + 128 * 4) / all.head.D), b = Math.floor((rate + 128 * 36) / all.head.D);
  assert.ok(rms(all.side, a, b) === 0 && rms(all.mid, a, b) === 0, 'the skip is kept as silence in both');
  assert.ok(rms(all.side, b + 400, all.side.length - 400) > 0.1, 'and the side goes on after it');
});

test('a quantum handed over again (the clock a quantum back, then on) is dropped, and nothing kept before it is lost', () => {
  // (as caught Nov 13 in a hidden copy: back 128 frames at frame 526720, then on 128 at 526976; it used to start the ring over)
  const rate = 48000, e = ear(rate), first = tone(rate, 440, 2);
  e.play(first, 0);
  const at = e.scope.currentFrame;
  e.play(new Float32Array(128), at - 128);   // the last quantum's frame again
  e.play(tone(rate, 440, 1), at + 128);      // then on, one quantum past where it was
  const { head, data } = e.ask(0, at + rate);
  assert.ok(head.frame0 <= 1, `kept from the start: frame0 ${head.frame0}`);
  assert.ok(rms(data, Math.round((rate * 0.2) / head.D), Math.round((rate * 1.8) / head.D)) > 0.3, 'the first two seconds are still there');
});

test('a clock that really goes back (more than a second) still starts over', () => {
  const rate = 48000, e = ear(rate);
  e.play(tone(rate, 440, 3), rate * 5);
  e.play(tone(rate, 440, 1), rate);          // four seconds back
  const { head } = e.ask(0, rate * 3);
  assert.ok(head.frame0 >= rate - 40, `started over at the new clock: frame0 ${head.frame0}`);
});
