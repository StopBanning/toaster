// A built-in 16-bar test song at 124 bpm in E minor (Em C G D): intro, hats and a lead melody
// come in, a two-bar breakdown, then a drop with open hats. Handy for trying the visuals without
// any music playing.
export function makeDemo(ctx) {
  const out = ctx.createGain();
  out.gain.value = 0.85;
  out.connect(ctx.destination);
  const sixteenth = 60 / 124 / 4;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const BASS = [40, 36, 43, 38]; // E2 C2 G2 D2
  const CHORDS = [[64, 67, 71], [60, 64, 67], [67, 71, 74], [62, 66, 69]]; // Em C G D
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const env = (g, t, attack, peak, decay) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const kicks = []; // when each kick plays (audio-clock time), for checking how tight the visuals are
  const kick = (t) => {
    kicks.push(t);
    if (kicks.length > 64) kicks.shift();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.002, 1, 0.38);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.45);
  };
  const noiseHit = (t, type, freq, q, peak, decay) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    env(g, t, 0.001, peak, decay);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.05);
  };
  const clap = (t) => { noiseHit(t, 'bandpass', 1600, 0.9, 0.9, 0.2); noiseHit(t + 0.012, 'bandpass', 1250, 0.9, 0.6, 0.15); };
  const hat = (t, open) => noiseHit(t, 'highpass', open ? 6500 : 8000, 0.7, open ? 0.3 : 0.16, open ? 0.22 : 0.04);
  const bass = (t, m) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = hz(m);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.16);
    env(g, t, 0.004, 0.34, 0.17);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
  };
  const stab = (t, notes) => {
    for (const m of notes) for (const detune of [-9, 9]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      o.detune.value = detune;
      f.type = 'lowpass';
      f.frequency.value = 2600;
      env(g, t, 0.006, 0.05, 0.32);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.4);
    }
  };
  const LEAD = { 3: 71, 7: 74, 10: 76, 14: 79 }; // B4 D5 E5 G5, between the drum hits
  const lead = (t, m) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = hz(m);
    f.type = 'lowpass';
    f.frequency.value = 3000;
    env(g, t, 0.01, 0.09, 0.22);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.3);
  };
  let step = 0;
  let next = ctx.currentTime + 0.15;
  const schedule = () => {
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % 16, s = step % 16, harmony = bar % 4;
      const breakdown = bar === 8 || bar === 9;
      if (!breakdown) {
        if (s % 4 === 0) kick(next);
        if (s === 4 || s === 12) clap(next);
        if (bar >= 10) { if (s % 4 === 2) hat(next, true); else if (s % 2 === 1) hat(next, false); }
        else if (bar >= 2 && s % 2 === 0) hat(next, false);
        if (s % 2 === 0) bass(next, BASS[harmony] + (s % 4 === 2 ? 12 : 0));
        if (bar >= 4 && LEAD[s]) lead(next, LEAD[s]);
      }
      if (s === 0 || s === 6 || s === 12) stab(next, CHORDS[harmony]);
      next += sixteenth;
      step++;
    }
  };
  schedule();
  const timer = setInterval(schedule, 25);
  return { out, kicks, stop() { clearInterval(timer); try { out.disconnect(); } catch {} } };
}
