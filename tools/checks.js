// Checks for Toaster, run in the dev copy (npm run dev) through tools/cdp.mjs. Test songs play
// silently, straight into the analysis, and what the app reports is scored against what was
// actually played: tempo, key, every drum part, bass, chords, the lead line, and block timing.
//   node tools/cdp.mjs run tools/checks.js "checks.song('trap')"           one test song, in detail
//   node tools/cdp.mjs run tools/checks.js "checks.suite(['house','pop'])" several, one row each
//   node tools/cdp.mjs run tools/checks.js "checks.beat('house')"          block timing, in detail
//   node tools/cdp.mjs run tools/checks.js "checks.loopback()"             system audio's capture delay
//   node tools/cdp.mjs run tools/checks.js "checks.listen(60)"             what it makes of the PC's audio
//   node tools/cdp.mjs run tools/checks.js "checks.lag()"                  stalls and costs
// Times are in ms; "early" means a block reaches the playhead before you'd hear its hit.
(() => {
  const n = window.__nc, ac = n.ac, sr = ac.sampleRate;
  const DISPLAY = 0.035; // what syncOffset() assumes a frame takes to reach the screen
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const r1 = (x) => Math.round(x * 10) / 10;
  const summary = (xs) => {
    if (!xs.length) return null;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    const sorted = [...xs].sort((a, b) => a - b);
    return { n: xs.length, median: r1(sorted[sorted.length >> 1]), mean: r1(mean), sd: r1(sd), min: r1(sorted[0]), max: r1(sorted[sorted.length - 1]) };
  };
  const mode = (xs) => {
    const count = new Map();
    for (const x of xs) count.set(x, (count.get(x) || 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const mod = (x, m) => ((x % m) + m) % m;

  // ---------------------------------------------------------------- system audio path

  // How long the app's own output takes to come back in through Windows' loopback capture
  // (out to the mixer, then captured back into the analysis). The probe is inaudible: an 80 ms
  // high sweep (16-20 kHz) at a very low level (-70 dBFS).
  async function loopback(tries = 5, dbfs = -70, f0 = 16000, f1 = 20000) {
    if (n.state.source !== 'system') return 'switch to system audio first';
    const N = 32768;
    const tap = (node) => {
      const a = ac.createAnalyser();
      a.fftSize = N;
      a.smoothingTimeConstant = 0;
      node.connect(a);
      return a;
    };
    const input = n.state.node, back = tap(input);
    const probe = ac.createGain();
    probe.connect(ac.destination);
    const sent = tap(probe);
    const L = Math.round(0.08 * sr), buf = ac.createBuffer(1, L, sr), p = buf.getChannelData(0), amp = 10 ** (dbfs / 20);
    for (let i = 0; i < L; i++) {
      const t = i / sr, T = L / sr;
      p[i] = amp * Math.sin(2 * Math.PI * (f0 * t + ((f1 - f0) * t * t) / (2 * T))) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (L - 1)));
    }
    // where the probe starts in x (cross-correlation), and how far it stands above the rest
    const find = (x) => {
      let best = 0, at = -1, sum = 0;
      for (let j = 0; j + L <= N; j++) {
        let s = 0;
        for (let i = 0; i < L; i++) s += x[j + i] * p[i];
        s = Math.abs(s);
        sum += s;
        if (s > best) { best = s; at = j; }
      }
      return { at, clarity: best / (sum / (N - L + 1) || 1e-30) };
    };
    const a = new Float32Array(N), b = new Float32Array(N), rts = [], tries_ = [];
    const peak = (x) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return m; };
    for (let k = 0; k < tries; k++) {
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(probe);
      src.start(ac.currentTime + 0.05);
      await sleep(400);
      back.getFloatTimeDomainData(a);
      sent.getFloatTimeDomainData(b);
      const got = find(a), out = find(b);
      tries_.push({ clarity: [Math.round(out.clarity), Math.round(got.clarity)], peakBackDb: r1(20 * Math.log10(peak(a) || 1e-12)), ms: r1(((got.at - out.at) / sr) * 1000) });
      if (out.clarity > 8 && got.clarity > 100) rts.push(((got.at - out.at) / sr) * 1000);
      await sleep(250);
    }
    input.disconnect(back);
    probe.disconnect();
    return { roundTrip: summary(rts), tries: tries_, outputLatency: ac.outputLatency * 1000, baseLatency: ac.baseLatency * 1000 };
  }

  // ---------------------------------------------------------------- instruments

  // Every random choice in a test song (its timing wobble, the noise, the talk and game sounds)
  // comes from rand(), seeded from the song's name when it starts (mulberry32), so a song plays
  // the same every run and two runs differ only in what the app did.
  let rand = Math.random;
  const seeded = (text) => {
    let a = 0x9e3779b9;
    for (const c of String(text)) a = Math.imul(a ^ c.charCodeAt(0), 2654435761) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']; // spelled the way the engine does
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const chordOf = (s) => { const [, r, m] = /^([A-G][#b]?)(m?)$/.exec(s); return { root: PC[r], minor: m === 'm', name: NAMES[PC[r]] + m }; };
  const midiOf = (s) => { const [, r, o] = /^([A-G][#b]?)(-?\d)$/.exec(s); return PC[r] + 12 * (+o + 1); };
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);

  // Simple synthesized instruments, all playing into `dest`.
  function instruments(dest) {
    const noise = ac.createBuffer(1, sr * 2, sr), nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;
    const env = (g, t, attack, peak, decay) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };
    const hold = (g, t, attack, peak, dur, release) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
      g.gain.linearRampToValueAtTime(0, t + dur);
    };
    const osc = (type, f, t, stop, ...chain) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      let node = o;
      for (const c of chain) node = node.connect(c);
      node.connect(dest);
      o.start(t);
      o.stop(stop);
      return o;
    };
    const filter = (type, f, q = 0.9) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    const gain = () => ac.createGain();
    const noiseHit = (t, type, freq, peak, decay, q = 0.9) => {
      const s = ac.createBufferSource(), g = gain();
      s.buffer = noise;
      env(g, t, 0.001, peak, decay);
      s.connect(filter(type, freq, q)).connect(g).connect(dest);
      s.start(t, rand() * 1.5);
      s.stop(t + decay + 0.05);
    };
    return {
      kick(t, style) {
        if (style === 'sub') {
          // dubstep's: a long sweep into the sub, with a click on top
          const g = gain(), o = osc('sine', 130, t, t + 0.5, g);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.08);
          env(g, t, 0.002, 1, 0.45);
          noiseHit(t, 'highpass', 4000, 0.35, 0.012);
          return;
        }
        const g = gain(), o = osc('sine', 150, t, t + 0.45, g);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        env(g, t, 0.002, 1, 0.38);
      },
      snare(t, style) {
        if (style === 'big') {
          // dubstep's: a body (a tone at 190 Hz), a wide burst of noise, and its room ringing on
          // after it (as a real one's reverb does: a couple of dB down 30-90 ms in, not 20)
          const g = gain(), o = osc('triangle', 190, t, t + 0.2, g);
          o.frequency.exponentialRampToValueAtTime(160, t + 0.1);
          env(g, t, 0.002, 0.6, 0.15);
          noiseHit(t, 'highpass', 1200, 0.8, 0.22, 0.5);
          noiseHit(t + 0.004, 'bandpass', 4000, 0.45, 0.9, 0.4);
          return;
        }
        noiseHit(t, 'bandpass', 1600, 0.9, 0.2); noiseHit(t + 0.012, 'bandpass', 1250, 0.6, 0.15);
      },
      rim(t) { noiseHit(t, 'bandpass', 2200, 0.7, 0.03, 4); const g = gain(); osc('triangle', 1700, t, t + 0.05, g); env(g, t, 0.001, 0.25, 0.03); },
      hat(t, open) { noiseHit(t, 'highpass', open ? 6500 : 8000, open ? 0.3 : 0.16, open ? 0.45 : 0.04); },
      shaker(t, accent) { noiseHit(t, 'highpass', 6000, accent ? 0.1 : 0.06, 0.03); },
      crash(t) { noiseHit(t, 'highpass', 4500, 0.3, 1.4); },
      tom(t, midi) {
        const g = gain(), o = osc('sine', hz(midi) * 1.6, t, t + 0.4, g);
        o.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.08);
        env(g, t, 0.002, 0.7, 0.3);
      },
      bass(t, midi, dur, sound) {
        const g = gain();
        if (sound === 'sub') {
          osc('sine', hz(midi), t, t + dur + 0.05, g);
          hold(g, t, 0.01, 0.55, dur, 0.04);
        } else if (sound === '808') {
          const o = osc('sine', hz(midi) * 1.25, t, t + dur + 0.1, g);
          o.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.05);
          hold(g, t, 0.005, 0.6, dur, 0.08);
        } else {
          const f = filter('lowpass', 900);
          f.frequency.setValueAtTime(900, t);
          f.frequency.exponentialRampToValueAtTime(220, t + 0.16);
          osc('sawtooth', hz(midi), t, t + dur + 0.05, f, g);
          hold(g, t, 0.004, 0.34, dur, 0.05);
        }
      },
      chord(t, notes, dur, style) {
        for (const [i, m] of notes.entries()) {
          if (style === 'piano') { const g = gain(); osc('triangle', hz(m), t, t + 1.2, filter('lowpass', 3000), g); env(g, t, 0.003, 0.12, 1); continue; }
          if (style === 'pluck') { const g = gain(); osc('triangle', hz(m), t, t + 0.4, g); env(g, t, 0.002, 0.11, 0.3); continue; }
          const at = style === 'strum' ? t + i * 0.012 : t;
          for (const detune of [-8, 8]) {
            const g = gain(), o = osc('sawtooth', hz(m), at, at + dur + 0.1, filter('lowpass', style === 'strum' ? 1800 : 2600), g);
            o.detune.value = detune;
            if (style === 'stab') env(g, at, 0.006, 0.05, 0.32);
            else if (style === 'strum') env(g, at, 0.003, 0.05, Math.min(dur, 0.25));
            else hold(g, at, style === 'ambient' ? 1 : 0.06, style === 'ambient' ? 0.04 : 0.045, dur, style === 'ambient' ? 0.8 : 0.08);
          }
        }
      },
      lead(t, midi, dur, sound) {
        const g = gain();
        if (sound === 'voice') {
          // a sung "ah": buzzy tone through two formants, with a little vibrato
          const o = osc('sawtooth', hz(midi), t, t + dur + 0.05), lfo = ac.createOscillator(), depth = gain();
          lfo.frequency.value = 5.5;
          depth.gain.value = hz(midi) * 0.008;
          lfo.connect(depth).connect(o.frequency);
          lfo.start(t);
          lfo.stop(t + dur + 0.05);
          o.disconnect();
          const f1 = filter('bandpass', 750, 5), f2 = filter('bandpass', 1200, 5), mix = gain();
          o.connect(f1).connect(mix);
          o.connect(f2).connect(mix);
          mix.connect(g).connect(dest);
          hold(g, t, 0.03, 0.5, dur, 0.06);
        } else if (sound === 'pluck') {
          const f = filter('lowpass', 4000);
          f.frequency.setValueAtTime(4000, t);
          f.frequency.exponentialRampToValueAtTime(800, t + 0.2);
          osc('sawtooth', hz(midi), t, t + 0.35, f, g);
          env(g, t, 0.002, 0.12, 0.3);
        } else {
          osc('square', hz(midi), t, t + 0.3, filter('lowpass', 3000), g);
          env(g, t, 0.01, 0.09, 0.22);
        }
      },
      // someone talking: syllables of buzzy, formant-shaped sound, now and then a consonant
      syllable(t) {
        const d = 0.08 + rand() * 0.14, f0 = 100 + rand() * 130, g = gain();
        const o = osc('sawtooth', f0, t, t + d + 0.02, filter('bandpass', 500 + rand() * 1800, 2), g);
        o.frequency.linearRampToValueAtTime(f0 * (0.8 + rand() * 0.4), t + d);
        hold(g, t, 0.015, 0.5, d, 0.03);
        if (rand() < 0.35) noiseHit(t + d * 0.7, 'highpass', 3500, 0.12, 0.06);
      },
      // game sounds: thumps, bangs and clicks at random
      impact(t) {
        const r = rand();
        if (r < 0.4) { const g = gain(), o = osc('sine', 90, t, t + 0.5, g); o.frequency.exponentialRampToValueAtTime(40, t + 0.3); env(g, t, 0.003, 0.6 * rand() + 0.2, 0.4); }
        else if (r < 0.8) noiseHit(t, 'bandpass', 800 + rand() * 3000, 0.4 + rand() * 0.4, 0.05 + rand() * 0.2);
        else noiseHit(t, 'highpass', 6000, 0.2, 0.02);
      },
      noiseBed(db) {
        const s = ac.createBufferSource(), g = gain();
        s.buffer = noise;
        s.loop = true;
        g.gain.value = 10 ** (db / 20);
        s.connect(filter('lowpass', 6000, 0.5)).connect(g).connect(dest);
        s.start();
        return s;
      },
    };
  }

  // ---------------------------------------------------------------- test songs

  // Steps are 16ths of a bar. prog: one chord a bar (4 bars, repeating). bass.line: semitones
  // over the chord's root for each bass step. lead: the lead line, one bar repeating.
  // Parts the app has no line for (toms, rim, shaker, crash) are there to see where they end up.
  const E8 = [0, 2, 4, 6, 8, 10, 12, 14], S16 = [...Array(16).keys()];
  const house = {
    bpm: 124, key: 'A minor', prog: ['Am', 'F', 'C', 'G'],
    bd: [0, 4, 8, 12], sd: [4, 12], hho: [2, 6, 10, 14],
    bass: { steps: [2, 6, 10, 14] }, chords: 'stab', chordSteps: [0, 6, 12],
    lead: { 3: 'C5', 7: 'E5', 10: 'A5', 14: 'G5' }, leadSound: 'square',
  };
  const pop = {
    bpm: 100, key: 'C major', prog: ['C', 'G', 'Am', 'F'],
    bd: [0, 7, 8], sd: [4, 12], hhc: E8, hho: [14],
    bass: { steps: E8 }, chords: 'pad',
    lead: { 0: 'E5', 3: 'G5', 6: 'A5', 8: 'G5', 11: 'E5', 14: 'D5' }, leadSound: 'voice',
  };
  const boombap = {
    bpm: 90, key: 'D minor', prog: ['Dm', 'Bb', 'F', 'C'], swing: 0.12, humanize: 6,
    bd: [0, 7, 10], sd: [4, 12], hhc: E8,
    bass: { steps: [0, 6, 10], line: [0, 7, 12] }, chords: 'piano', chordSteps: [0, 8],
  };
  const SONGS = {
    house,
    pop,
    boombap,
    trap: {
      bpm: 140, key: 'F# minor', prog: ['F#m', 'D', 'A', 'E'],
      bd: [0, 3, 6, 11], sd: [8], hhc: S16, rolls: true,
      bass: { steps: [0, 3, 6, 11], sound: '808' }, chords: 'pad',
      lead: { 0: 'C#6', 3: 'A5', 6: 'F#5', 11: 'A5' }, leadSound: 'pluck',
    },
    // half-time, as dubstep plays it: the kick on 1 (sitting on the sub, still held from the bar
    // before), the snare on 3 (the sub coming back in with it), the hats between the beats. Its
    // bar line is checked too (see verdict): the snare lands on 3, not on 2 and 4.
    dubstep: {
      bpm: 140, key: 'F minor', prog: ['Fm', 'Fm', 'Db', 'Eb'], barLine: true,
      bd: [0], sd: [8], hhc: [2, 6, 10, 14], kick: 'sub', snare: 'big',
      bass: { steps: [8], line: [-12], sound: 'sub', len: 10 }, chords: 'pad',
    },
    dnb: {
      bpm: 174, key: 'E minor', prog: ['Em', 'C', 'G', 'D'],
      bd: [0, 10], sd: [4, 12], hhc: E8, hho: [6],
      bass: { steps: [0, 3, 6, 10, 12], line: [0, 0, 7, 0, 12] }, chords: 'pad',
    },
    reggaeton: {
      bpm: 95, key: 'G minor', prog: ['Gm', 'Eb', 'Bb', 'F'],
      bd: [0, 4, 8, 12], sd: [3, 6, 11, 14], hhc: E8,
      bass: { steps: [0, 3, 6, 8, 11, 14] }, chords: 'pluck', chordSteps: [2, 6, 10, 14],
      lead: { 2: 'D5', 5: 'F5', 8: 'G5', 13: 'Bb4' }, leadSound: 'voice',
    },
    afrobeats: {
      bpm: 105, key: 'E major', prog: ['E', 'C#m', 'A', 'B'], humanize: 4,
      bd: [0, 3, 8, 11], rim: [4, 12], shaker: S16,
      bass: { steps: [0, 3, 8, 11] }, chords: 'strum', chordSteps: E8,
      lead: { 1: 'B4', 4: 'E5', 7: 'G#5', 10: 'F#5', 13: 'E5' }, leadSound: 'pluck',
    },
    rock: {
      bpm: 118, key: 'E major', prog: ['E', 'B', 'C#m', 'A'], humanize: 12, drift: 5,
      bd: [0, 8, 10], sd: [4, 12], hhc: E8, crash: true, fill: true,
      bass: { steps: E8 }, chords: 'strum', chordSteps: E8,
    },
    shuffle: {
      bpm: 92, key: 'C minor', prog: ['Cm', 'Ab', 'Eb', 'Bb'], swing: 0.33,
      bd: [0, 10], sd: [4, 12], hhc: S16,
      bass: { steps: [0, 6, 10], line: [0, 7, 12] }, chords: 'piano', chordSteps: [0, 8],
    },
    acoustic: {
      bpm: 100, key: 'G major', prog: ['G', 'D', 'Em', 'C'],
      chords: 'strum', chordSteps: E8, bass: { steps: [0, 8] },
      lead: { 0: 'B4', 4: 'D5', 8: 'E5', 12: 'D5' }, leadSound: 'voice',
    },
    loud: { ...house, compress: true, noise: -26 },
    quiet: { ...pop, gain: -30 },
    intro: { ...pop, drumsFrom: 8, warm: 34 },
    change: { ...house, bpm: 128, then: { at: 16, ...boombap, bpm: 85 }, warm: 48 },
    talk: { talk: true },
    // house with a held pad, with and without the pad pumping under the kick (for .duck())
    pads: { ...house, chords: 'pad', chordSteps: undefined },
    pumping: { ...house, chords: 'pad', chordSteps: undefined, pump: 8 },
    ambient: { ambient: true, prog: ['F', 'Am', 'G', 'C'] },
  };

  // Plays a song into the analysis (not the speakers). Keeps what was played, as it's played.
  function play(spec0) {
    const out = ac.createGain(), bus = ac.createGain(), master = ac.createGain();
    let chain = bus;
    if (spec0.compress) {
      const c = ac.createDynamicsCompressor(), makeup = ac.createGain();
      c.threshold.value = -30; c.ratio.value = 12; c.attack.value = 0.003; c.release.value = 0.15;
      makeup.gain.value = 3;
      chain = bus.connect(c).connect(makeup);
    }
    master.gain.value = 10 ** ((spec0.gain || 0) / 20);
    chain.connect(master).connect(out);
    const x = instruments(bus), bed = spec0.noise ? x.noiseBed(spec0.noise) : null;
    // pump (dB): the chords go through a gain that ducks under each kick and swells back over
    // about a third of a second, like a compressor keyed off the kick
    const duck = ac.createGain(), xc = spec0.pump ? instruments(duck) : x;
    duck.connect(bus);
    const hits = [], bars = [], events = []; // events: every note and hit played, by instrument
    const add = (c, id) => { events.push({ c, id }); if (events.length > 4000) events.splice(0, 1000); return c; };
    const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    let spec = spec0, step = 0, next = ac.currentTime + 0.2;
    const start = next;
    let timer;
    if (spec0.talk) {
      timer = setInterval(() => {
        while (next < ac.currentTime + 0.3) {
          x.syllable(next);
          next += 0.1 + rand() * 0.2 + (rand() < 0.12 ? 0.3 + rand() * 0.9 : 0);
        }
      }, 25);
      let bang = ac.currentTime + 0.5;
      const game = setInterval(() => { while (bang < ac.currentTime + 0.3) { x.impact(bang); bang += -Math.log(rand()) / 1.2; } }, 25);
      return { out, hits, bars, stop() { clearInterval(timer); clearInterval(game); try { out.disconnect(); } catch { /* gone */ } } };
    }
    if (spec0.ambient) {
      timer = setInterval(() => {
        while (next < ac.currentTime + 0.3) {
          const ch = chordOf(spec0.prog[step++ % spec0.prog.length]), r = 48 + ch.root + (ch.root < 7 ? 12 : 0);
          x.chord(next, [r, r + (ch.minor ? 3 : 4), r + 7], 5.2, 'ambient');
          x.bass(next, 36 + ch.root, 5, 'saw');
          next += 5;
        }
      }, 50);
      return { out, hits, bars, stop() { clearInterval(timer); try { out.disconnect(); } catch { /* gone */ } } };
    }
    timer = setInterval(() => {
      while (next < ac.currentTime + 0.25) {
        const bar = Math.floor(step / 16), s = step % 16;
        if (spec0.then && bar === spec0.then.at && s === 0) spec = spec0.then;
        const bpm = spec.bpm + ((spec.drift || 0) * (next - start)) / 60, sixteenth = 60 / bpm / 4;
        const when = (extra = 0) => Math.max(ac.currentTime + 0.01, next + extra + (s % 2 ? (spec.swing || 0) * sixteenth : 0) + ((spec.humanize || 0) * gauss()) / 1000);
        const ch = spec.prog && chordOf(spec.prog[bar % spec.prog.length]);
        if (s === 0 && ch) bars.push({ bar, c: next, chord: ch.name, bpm });
        if (bar >= (spec.drumsFrom || 0)) {
          if (spec.bd?.includes(s)) {
            const t = add(when(), 'kick');
            x.kick(t, spec.kick);
            hits.push({ c: t, id: 'bd', step });
            if (spec0.pump) { const g = duck.gain; g.setValueAtTime(1, t); g.linearRampToValueAtTime(10 ** (-spec0.pump / 20), t + 0.012); g.setTargetAtTime(1, t + 0.06, 0.09); }
          }
          if (spec.sd?.includes(s)) { const t = add(when(), 'snare'); x.snare(t, spec.snare); hits.push({ c: t, id: 'sd', step }); }
          if (spec.rim?.includes(s)) { const t = add(when(), 'rim'); x.rim(t); hits.push({ c: t, id: 'sd', step }); }
          if (spec.rolls && bar % 2 === 1 && s >= 12) { if (s === 12) for (let k = 0; k < 6; k++) x.hat(add(when((k * 4 * sixteenth) / 6), 'hat'), false); }
          else if (spec.hhc?.includes(s)) x.hat(add(when(), 'hat'), false);
          if (spec.hho?.includes(s)) x.hat(add(when(), 'open hat'), true);
          if (spec.shaker?.includes(s)) x.shaker(add(when(), 'shaker'), s % 4 === 0);
          if (spec.crash && s === 0 && bar % 4 === 0) x.crash(add(when(), 'crash'));
          if (spec.fill && bar % 4 === 3 && s >= 12) x.tom(add(when(), 'tom'), [50, 50, 45, 45][s - 12]);
        }
        if (ch && spec.bass) {
          const i = spec.bass.steps.indexOf(s);
          if (i >= 0) {
            const nextStep = spec.bass.steps[i + 1] ?? 16;
            x.bass(add(when(), 'bass'), 36 + ch.root + (spec.bass.line?.[i % spec.bass.line.length] || 0), (spec.bass.len ?? nextStep - s) * sixteenth * 0.9, spec.bass.sound);
          }
        }
        if (ch && spec.chords && (spec.chordSteps ? spec.chordSteps.includes(s) : s === 0)) {
          const r = 48 + ch.root + (ch.root < 7 ? 12 : 0), len = spec.chordSteps ? 2 : 16;
          xc.chord(add(when(), 'chord'), [r, r + (ch.minor ? 3 : 4), r + 7], len * sixteenth, spec.chords);
        }
        if (spec.lead?.[s] && bar >= 2) x.lead(add(when(), 'lead'), midiOf(spec.lead[s]), 1.6 * sixteenth, spec.leadSound);
        next += sixteenth;
        step++;
      }
    }, 25);
    return { out, hits, bars, events, stop() { clearInterval(timer); bed?.stop(); try { out.disconnect(); } catch { /* gone */ } } };
  }

  // seed: another take of the song (its random choices from this instead of its name)
  async function start(kind, seed) {
    if (kind === 'demo') {
      await n.useDemo();
      n.state.demo.out.disconnect(ac.destination);
      // the demo keeps its kick times only; number them from the first one (beats only, no bars)
      const kicks = n.state.demo.kicks, sixteenth = 60 / 124 / 4;
      return { get hits() { return kicks.map((c) => ({ c, id: 'bd', step: Math.round((c - kicks[0]) / sixteenth) })); }, bars: [], barsKnown: false };
    }
    const spec = SONGS[kind];
    if (!spec) throw new Error('no test song called ' + kind);
    try { n.state.node?.disconnect(); } catch { /* gone */ }
    n.state.stream?.getTracks().forEach((t) => t.stop());
    n.state.demo?.stop();
    n.state.stream = null;
    rand = seeded(seed ?? kind);
    const p = play(spec);
    n.state.demo = p;
    n.attach(p.out, 'demo', `test song (${kind})`);
    return { hits: p.hits, bars: p.bars, events: p.events, spec, barsKnown: true };
  }

  // What each of the app's parts really heard. Every hit it registers is matched to what was
  // played around then (its own instrument first, else the nearest anything), and for each
  // instrument: how many of its notes or hits got registered as that part.
  const PART = { kick: 'bd', snare: 'sd', rim: 'sd', hat: 'hhc', shaker: 'hhc', 'open hat': 'hho', crash: 'hho', lead: 'vox' };
  const NOTICE = { vox: 0.045 }, WINDOW = { vox: 0.07 }; // the lead is noticed later, with a longer window
  // When several things play at once, the likeliest cause for each part, in order.
  const LIKELY = {
    bd: ['kick', 'tom', 'bass'],
    sd: ['snare', 'rim', 'chord', 'lead', 'open hat', 'hat', 'shaker', 'crash', 'kick', 'tom', 'bass'],
    hhc: ['hat', 'shaker', 'open hat', 'crash', 'snare', 'rim'],
    hho: ['open hat', 'crash', 'hat', 'shaker', 'snare', 'rim'],
    vox: ['lead', 'chord', 'bass'],
  };
  function heardAs(placed, events, rec) {
    const ts = rec.ts.filter((s) => s[1] > 0);
    const rendered = Math.min(...ts.map((s) => s[3] - s[2])); // audio clock -> when it was processed
    const playedAt = (p) => p.t - rendered - (NOTICE[p.id] ?? 0.014);
    const within = (p, e) => Math.abs(e.c - playedAt(p)) < (WINDOW[p.id] ?? 0.035);
    const as = {}, strays = {};
    for (const p of placed) {
      const near = events.filter((x) => within(p, x));
      let what = 'nothing';
      if (near.length) {
        const order = LIKELY[p.id] || [];
        what = order.find((id) => near.some((x) => x.id === id)) || near.sort((a, b) => Math.abs(a.c - playedAt(p)) - Math.abs(b.c - playedAt(p)))[0].id;
      } else {
        // a hit with nothing played at that moment: what came just before it, and how long before
        let prev = null;
        for (const x of events) if (x.c < playedAt(p) && (!prev || x.c > prev.c)) prev = x;
        if (prev) {
          const key = `${prev.id} +${Math.round((playedAt(p) - prev.c) * 100) * 10}ms`;
          (strays[p.id] ||= {})[key] = ((strays[p.id] ||= {})[key] || 0) + 1;
        }
      }
      const row = (as[p.id] ||= {});
      row[what] = (row[what] || 0) + 1;
    }
    const from = ts[0][2] + 0.2, to = ts[ts.length - 1][2] - 0.3, caught = {};
    for (const e of events) {
      if (e.c < from || e.c > to || !PART[e.id]) continue;
      const k = (caught[e.id] ||= { n: 0, got: 0 });
      k.n++;
      if (placed.some((p) => p.id === PART[e.id] && within(p, e))) k.got++;
    }
    return { registeredAs: as, strays, caught: Object.fromEntries(Object.entries(caught).map(([k, v]) => [`${k} -> ${PART[k]}`, `${v.got}/${v.n}`])) };
  }

  // ---------------------------------------------------------------- watching the blocks

  // Is the window drawing? Not while minimized or covered (a minimized window still gets a
  // frame a second, so count them).
  const drawing = () => new Promise((res) => {
    let frames = 0;
    const count = () => { frames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    setTimeout(() => res(frames >= 6 && screenX !== -32000), 300);
  });

  // Watches every drawn frame: the drawing clock, the nearest kick block at the playhead, and any
  // block that shows up or goes away anywhere but off the edges. With the window minimized the
  // app draws nothing, so this draws the blocks itself, 60 times a second.
  async function record() {
    const p = n.punch, draw = p.draw, rec = { frames: [], bad: [], ts: [], jumps: [], window: [], selfDriven: !(await drawing()) };
    let prev = null, lastT = null, lastVg = null, renumber = null, shown = null;
    p.draw = function (t, eng, col, off) {
      draw.call(p, t, eng, col, off);
      const vg = p.vg, T = eng.tempo;
      // the drawing clock jumping (renumbering, a restart) and whether the engine announced it
      if (vg !== null && lastVg !== null) {
        const moved = vg - (lastVg + ((t - lastT) * 4) / T.P);
        if (Math.abs(moved) > 0.5) rec.jumps.push({ t: r1(t), steps: r1(moved), announced: renumber !== null ? r1(T.renumber - renumber) : null, gapMs: Math.round((t - lastT) * 1000) });
      }
      lastT = t; lastVg = vg; renumber = T.renumber;
      if (vg === null) { prev = null; return; }
      const W = innerWidth, stepW = W / 32, xOf = (g) => W / 2 + (g - vg) * stepW;
      let bd = null; // start of the latest kick block that has reached the playhead (give or take half a step)
      for (const b of p.blocks) if (b.lane === 'bd' && b.g <= vg + 0.5 && (bd === null || b.g > bd)) bd = b.g;
      rec.frames.push([t, vg, off, eng.stepAt(t + off), bd, eng.tempo.P]);
      const cur = new Set(p.blocks);
      if (prev) {
        for (const b of cur) if (!prev.has(b) && xOf(b.g) < W) rec.bad.push({ t: r1(t), what: 'appeared on screen', lane: b.lane, x: Math.round(xOf(b.g)) });
        for (const b of prev) if (!cur.has(b) && xOf(b.g + b.len) > 0) rec.bad.push({ t: r1(t), what: 'vanished on screen', lane: b.lane, x: Math.round(xOf(b.g)) });
      }
      prev = cur;
    };
    const timer = setInterval(() => {
      const o = ac.getOutputTimestamp();
      rec.ts.push([o.contextTime, o.performanceTime / 1000, ac.currentTime, performance.now() / 1000]);
      const now = screenX !== -32000; // a minimized window sits at -32000
      if (now !== shown) { rec.window.push({ t: r1(performance.now() / 1000), shown: now }); shown = now; }
    }, 100);
    const driver = rec.selfDriven && setInterval(() => p.draw(performance.now() / 1000, n.eng, { fg: [255, 255, 255] }, n.syncOffset()), 1000 / 60);
    rec.stop = () => { p.draw = draw; clearInterval(timer); clearInterval(driver); };
    return rec;
  }

  // For every kick played during the recording: where the blocks stood in the frame on screen
  // when you'd hear it, and whether a kick block was at the playhead. Also how the engine's step
  // numbers map onto the song's (K) and how late it notices hits.
  function timing(hits, rec) {
    const ts = rec.ts.filter((s) => s[1] > 0), frames = rec.frames;
    if (!frames.length || !ts.length) return null;
    const heard = (c) => { // audio-clock time -> when it comes out of the speakers (performance clock)
      let best = ts[0];
      for (const s of ts) if (Math.abs(s[0] - c) < Math.abs(best[0] - c)) best = s;
      return best[1] + (c - best[0]);
    };
    const rendered = Math.min(...ts.map((s) => s[3] - s[2])); // audio-clock -> when it was processed
    const t0 = frames[0][0], t1 = frames[frames.length - 1][0];
    const frameAt = (t) => { // the last frame drawn at or before t
      let lo = 0, hi = frames.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (frames[m][0] <= t) lo = m; else hi = m - 1; }
      return frames[lo];
    };
    const rows = [];
    for (const h of hits) {
      if (h.id !== 'bd') continue;
      const H = heard(h.c), td = H - DISPLAY;
      if (td < t0 + 0.2 || td > t1) continue;
      const [ft, vg, off, target, bd, P] = frameAt(td);
      const per = 4 / P; // steps a second
      rows.push({ step: h.step, H, vg: vg + (td - ft) * per, eng: target + (H - ft - off) * per, bd, P });
    }
    if (!rows.length) return null;
    // The engine counts steps its own way: a whole-number offset K maps the song's steps onto it.
    // K changes when the engine renumbers (new bar lines); the blocks move along with it.
    for (const r of rows) r.K = Math.round(r.vg - r.step);
    const K = mode(rows.map((r) => r.K));
    const ms = (steps, P) => (steps * P * 1000) / 4;
    const lag = { bd: [], sd: [] };
    for (const h of hits) {
      const r = h.c + rendered;
      let near = null;
      for (const o of n.eng.onsets) if (o.id === h.id && (!near || Math.abs(o.t - r) < Math.abs(near.t - r))) near = o;
      if (near && Math.abs(near.t - r) < 0.08) lag[h.id].push((near.t - r) * 1000);
    }
    const grid = summary(rows.map((r) => ms(r.eng - (r.step + r.K), r.P))); // heard this long after the engine's beat
    return {
      K,
      kicks: rows.length,
      early: summary(rows.map((r) => ms(r.vg - (r.step + r.K), r.P))), // >0: blocks reach the playhead before the kick is heard
      withBlock: rows.filter((r) => r.bd === r.step + r.K).length,
      missing: rows.filter((r) => r.bd !== r.step + r.K).map((r) => ({ t: r1(r.H), step: r.step % 16, blockAt: r.bd === null ? null : r1(r.bd - r.step - r.K) })),
      renumbered: rows.filter((r, i) => i && r.K !== rows[i - 1].K).map((r) => ({ t: r1(r.H), K: r.K })),
      grid,
      idealOffsetMs: grid && r1(DISPLAY * 1000 - grid.median),
      lag: { bd: summary(lag.bd), sd: summary(lag.sd) },
    };
  }

  // Plays a test beat and checks the blocks against it, in detail.
  async function beat(kind = 'house', secs = 20, warm = 16) {
    const b = await start(kind);
    await sleep(warm * 1000); // lock on and learn the patterns
    const rec = await record();
    await sleep(secs * 1000);
    rec.stop();
    const tm = timing(b.hits, rec);
    if (!tm) return { kind, error: 'the blocks never drew, or no kicks (beat not found?)', events: n.eng.events.slice(-6) };
    const T = n.eng.tempo, K = tm.K;
    const shown = (id) => n.eng.v[id].shown?.map((x) => (x ? 'x' : '.')).join('') ?? null;
    const want = (steps) => steps && [...Array(16).keys()].map((s) => (steps.includes(mod(s - K, 16)) ? 'x' : '.')).join('');
    return {
      kind,
      bpm: r1(T.bpm),
      kicks: tm.kicks,
      blocksEarlyMs: tm.early,
      kickBlockAtPlayhead: `${tm.withBlock}/${tm.kicks}`,
      missing: tm.missing,
      renumbered: tm.renumbered,
      heardAfterEngineBeatMs: tm.grid,
      offsetMs: r1(rec.frames[rec.frames.length - 1][2] * 1000),
      idealOffsetMs: tm.idealOffsetMs,
      detectLagMs: tm.lag,
      alignment: b.barsKnown ? { sixteenthsOff: mod(K, 4), beatsOff: Math.floor(mod(K, 16) / 4) } : { sixteenthsOff: mod(K, 4) },
      patterns: b.spec ? { bd: [shown('bd'), want(b.spec.bd)], sd: [shown('sd'), want(b.spec.sd || b.spec.rim)] } : { bd: shown('bd'), sd: shown('sd') },
      blocksBad: rec.bad.slice(0, 12),
      blocksBadCount: rec.bad.length,
      clockJumps: rec.jumps,
      selfDriven: rec.selfDriven,
      window: rec.window,
      events: n.eng.events.slice(-6),
    };
  }

  // ---------------------------------------------------------------- what got picked up

  const CODE = ['tempo', 'scale', 'bd', 'sd', 'hhc', 'hho', 'bassline', 'chords', 'vox'];
  const codeLines = () => Object.fromEntries(CODE.map((id) => [id, document.getElementById('ln-' + id)?.textContent || '']));

  // Keeps track of when the engine had the beat, every 100 ms, and how rhythmic it judged the
  // sound (its best tempo's fit, and how much that tempo stood out).
  function watchLock() {
    const log = [], events0 = n.eng.events.length, rhythm = [];
    let last = null;
    const timer = setInterval(() => {
      log.push([performance.now() / 1000, n.eng.tempo.locked, n.eng.tempo.bpm]);
      if (n.eng.rhythm && n.eng.rhythm !== last) { last = n.eng.rhythm; rhythm.push(last); }
    }, 100);
    const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.floor(p * (s.length - 1))] * 100) / 100 : null; };
    return () => {
      clearInterval(timer);
      const first = log.find((x) => x[1]);
      return {
        lockedShare: log.length ? log.filter((x) => x[1]).length / log.length : 0,
        firstLockS: first ? r1(first[0] - log[0][0]) : null,
        rhythm: { fit: `${q(rhythm.map((r) => r.fit), 0.1)} | ${q(rhythm.map((r) => r.fit), 0.5)} | ${q(rhythm.map((r) => r.fit), 0.9)}`, conf: `${q(rhythm.map((r) => r.conf), 0.1)} | ${q(rhythm.map((r) => r.conf), 0.5)} | ${q(rhythm.map((r) => r.conf), 0.9)}` },
        events: n.eng.events.slice(events0),
      };
    };
  }

  // Plays a test song and scores everything the app reports against what was played. seed: another
  // take of it (see start).
  async function song(name, seed) {
    const b = await start(name, seed), spec = b.spec, lock = watchLock();
    const warm = spec.warm ?? 16, secs = spec.secs ?? 16;
    if (spec.talk || spec.ambient) {
      await sleep((warm + secs) * 1000);
      const L = lock();
      return {
        name, music: false,
        lockedShare: r1(L.lockedShare * 100) + '%', firstLockS: L.firstLockS, rhythm: L.rhythm,
        locks: L.events.filter((e) => /tempo (lock|change)/.test(e)).length,
        patterns: Object.fromEntries(['bd', 'sd', 'hhc', 'hho', 'vox'].map((id) => [id, n.eng.v[id].shown?.map((x) => (x ? 'x' : '.')).join('') ?? null])),
        code: codeLines(), events: L.events.slice(-6),
      };
    }
    await sleep(warm * 1000);
    const rec = await record(), eng = n.eng, placed = [], place = eng.place;
    eng.place = function (id, t, ...rest) { placed.push({ id, t }); return place.call(this, id, t, ...rest); };
    await sleep(secs * 1000);
    rec.stop();
    eng.place = place;
    const L = lock(), tm = timing(b.hits, rec), T = eng.tempo, part = spec.then || spec;
    const report = { name, music: true, firstLockS: L.firstLockS, relocks: L.events.filter((e) => /tempo change/.test(e)).length, rhythm: L.rhythm };
    report.heard = heardAs(placed, b.events, rec);
    const lastBar = b.bars[b.bars.length - 1], trueBpm = r1(lastBar?.bpm ?? part.bpm);
    report.tempo = { heard: T.locked ? r1(T.bpm) : null, played: trueBpm, ratio: T.locked ? r1((T.bpm / trueBpm) * 100) / 100 : null };
    report.key = { heard: eng.key ? `${NAMES[eng.key.root]} ${eng.key.mode}` : null, played: part.key };
    if (!tm) {
      // no kicks to line up with (or never locked): compare patterns at their best rotation
      report.timing = null;
    } else {
      report.timing = { blocksEarlyMs: tm.early && { median: tm.early.median, worst: Math.max(Math.abs(tm.early.min), Math.abs(tm.early.max)) }, kickBlocks: `${tm.withBlock}/${tm.kicks}`, bad: rec.bad.length, unannouncedJumps: rec.jumps.filter((j) => !j.announced).length };
      report.alignment = { sixteenthsOff: mod(tm.K, 4), beatsOff: Math.floor(mod(tm.K, 16) / 4) };
    }
    const K = tm ? tm.K : null;
    // Drums: which steps of each part the app shows, against the steps played.
    // (what the app shows: a clap pattern it judged too busy to be one is shown nowhere)
    const shownSteps = (id) => (eng.v[id].tooBusy ? [] : eng.v[id].shown || []).flatMap((x, s) => (x ? [s] : []));
    const best = (want, got) => { // the rotation that lines them up best, when there's no K
      let top = 0;
      for (let k = 0; k < 16; k++) top = Math.max(top, want.filter((s) => got.includes(mod(s + k, 16))).length);
      return top;
    };
    const compare = (wantSteps, got) => {
      const want = (wantSteps || []).map((s) => (K === null ? s : mod(s + K, 16)));
      const found = K === null ? best(want, got) : want.filter((s) => got.includes(s)).length;
      return { found, of: want.length, extra: Math.max(0, got.length - found) };
    };
    const drums = {
      kick: compare(part.bd, shownSteps('bd')),
      clap: compare(part.sd || part.rim, shownSteps('sd')),
      hatClosed: compare(part.rolls ? (part.hhc || []).filter((s) => s < 12) : part.hhc || part.shaker, shownSteps('hhc')),
      hatOpen: compare(part.hho, shownSteps('hho')),
    };
    report.drums = Object.fromEntries(Object.entries(drums).map(([k, v]) => [k, `${v.found}/${v.of}${v.extra ? ` +${v.extra} extra` : ''}`]));
    // The bass line's rhythm: the steps a bass note starts on, against the steps played.
    if (part.bass?.steps) {
      const r = compare(part.bass.steps, shownSteps('bass'));
      report.bassRhythm = `${r.found}/${r.of}${r.extra ? ` +${r.extra} extra` : ''}`;
    }
    // Bars: chord and bass note of each of the 4 bars the app keeps, against the song's.
    if (part.prog && K !== null) {
      const chords = [], bass = [];
      for (let slot = 0; slot < 4; slot++) {
        const songBar = Math.round((16 * slot - K) / 16), want = chordOf(part.prog[mod(songBar, part.prog.length)]);
        const got = eng.slots[slot];
        chords.push(`${got?.chord?.name ?? '-'}${got?.chord?.name === want.name ? '' : `(${want.name})`}`);
        const pc = got?.bass ? PC[got.bass.replace(/\d+$/, '').replace(/^./, (c) => c.toUpperCase())] : null;
        bass.push(`${got?.bass ?? '-'}${pc === want.root ? '' : `(${NAMES[want.root].toLowerCase()})`}`);
      }
      report.chords = { right: chords.filter((c) => !c.includes('(')).length + '/4', bars: chords.join(' ') };
      report.bass = { right: bass.filter((c) => !c.includes('(')).length + '/4', bars: bass.join(' ') };
    }
    // Lead line: steps and notes (as pitch classes) against the riff played.
    if (part.lead) {
      const want = Object.entries(part.lead).map(([s, note]) => ({ s: K === null ? +s : mod(+s + K, 16), pc: midiOf(note) % 12 }));
      const v = eng.v.vox, got = shownSteps('vox');
      const stepsOk = want.filter((w) => got.includes(w.s)).length, notesOk = want.filter((w) => got.includes(w.s) && v.tok[w.s] === String(w.pc)).length;
      report.lead = { steps: `${stepsOk}/${want.length}${got.length > stepsOk ? ` +${got.length - stepsOk} extra` : ''}`, notes: `${notesOk}/${want.length}` };
    } else report.lead = shownSteps('vox').length ? `${shownSteps('vox').length} steps shown, none played` : 'none (none played)';
    report.code = codeLines();
    report.events = L.events.slice(-5);
    return report;
  }

  // Pass or fail for one song's report, against limits a little under what the app does now, so a
  // change that makes it worse shows (the known weak spots, the bass rhythm and a key read as its
  // relative major or minor, as after the key change in "change", are reported but don't fail):
  // - talk and ambient sound: the beat never locks
  // - the tempo within 2% of the one played
  // - the key right, or its relative major/minor
  // - the kick at least 3 of 4 steps, the clap at least half, neither with more extra hits than
  //   real ones (the loud song's squashed kick is let off: 1 of 4)
  const LIMITS = { tempo: 0.02, kick: 0.75, clap: 0.5 };
  const LET_OFF = { loud: ['kick'] };
  function verdict(r) {
    if (r.error) return { pass: false, fails: ['error'] };
    const fails = [], notes = [];
    if (!r.music) {
      if (r.locks > 0) fails.push(`locked ${r.locks} times on no music`);
      return { pass: !fails.length, fails, notes };
    }
    const ratio = r.tempo?.ratio;
    if (ratio === null || ratio === undefined || Math.abs(ratio - 1) > LIMITS.tempo) fails.push(`tempo ${r.tempo?.heard ?? 'none'} (played ${r.tempo?.played})`);
    const [hk, pk] = [r.key?.heard, r.key?.played];
    if (hk !== pk) {
      const rel = (k) => { if (!k) return null; const [name, mode] = k.split(' '); const pc = PC[name]; return mode === 'major' ? `${NAMES[(pc + 9) % 12]} minor` : `${NAMES[(pc + 3) % 12]} major`; };
      if (hk && rel(hk) === pk) notes.push(`key ${hk}, the relative of ${pk}`);
      else fails.push(`key ${hk ?? 'none'} (played ${pk})`);
    }
    // (the bar line is timed by the blocks: with them off, or the window not drawing, it can't be
    // checked, and says so rather than passing)
    if (SONGS[r.name]?.barLine && !r.alignment) notes.push('bar line not checked: no blocks drawn to time it by');
    else if (SONGS[r.name]?.barLine && r.alignment.beatsOff !== 0) fails.push(`bar line ${r.alignment.beatsOff} beat(s) off`);
    const share = (s) => { const m = /^(\d+)\/(\d+)(?: \+(\d+) extra)?/.exec(s || ''); return m ? { found: +m[1], of: +m[2], extra: +(m[3] || 0) } : null; };
    for (const [part, min] of [['kick', LIMITS.kick], ['clap', LIMITS.clap]]) {
      const d = share(r.drums?.[part]);
      if (!d || !d.of || LET_OFF[r.name]?.includes(part)) continue;
      if (d.found / d.of < min) fails.push(`${part} ${d.found}/${d.of}`);
      if (d.extra > d.of) fails.push(`${part} ${d.extra} extra hits`);
    }
    if (r.bassRhythm && /^0\//.test(r.bassRhythm)) notes.push(`bass rhythm ${r.bassRhythm}`);
    return { pass: !fails.length, fails, notes };
  }

  // Several songs in a row; one line each, with the details after. Each row gets its verdict
  // (see verdict above).
  async function suite(names = Object.keys(SONGS)) {
    const rows = [];
    for (const name of names) {
      try { rows.push(await song(name)); } catch (err) { rows.push({ name, error: String(err) }); }
      rows[rows.length - 1].verdict = verdict(rows[rows.length - 1]);
    }
    return rows;
  }

  // The kick band's sounds, for telling a kick from a bass note (on a riddim track the sub, pulsing
  // every 8th, was taken for kicks; a trap 808 is both): each new sound there, measured in the frame
  // it starts in, before lowDecide calls it a kick or a bass note (up to 90 ms later): how much the
  // low band (40-130 Hz), the body (150-400), the click (2-6 kHz) and the top (6-12 kHz) rose, in dB
  // averaged over their bins; what it was called; and what was played then. Each song's sounds,
  // and the medians by what was played.
  //   node tools/cdp.mjs run tools/checks.js "checks.lows(['trap', 'house'])"
  async function lows(names = Object.keys(SONGS).filter((k) => !SONGS[k].talk && !SONGS[k].ambient), seed) {
    const e = n.eng, songs = [], all = [];
    const band = (lo, hi, a) => {
      const i = Math.max(1, Math.round(lo / e.hzFast)), j = Math.min(a.length - 1, Math.round(hi / e.hzFast));
      let s = 0;
      for (let k = i; k <= j; k++) s += a[k];
      return s / (j - i + 1);
    };
    for (const name of names) {
      const b = await start(name, seed), spec = b.spec, rec = await record(), sounds = [];
      const { frame, onset, bassHit } = e;
      e.frame = function (t, audioT) {
        const before = this.fastDb.slice(), had = this.lowPending;
        frame.call(this, t, audioT);
        if (this.lowPending && this.lowPending !== had) {
          const rise = (lo, hi) => r1(band(lo, hi, this.fastDb) - band(lo, hi, before));
          sounds.push({ t, s: r1(this.lowPending.s), low: rise(40, 130), body: rise(150, 400), click: rise(2000, 6000), top: rise(6000, 12000), called: null });
        }
      };
      // (with lowDecide's readings: the pitch and its clarity in each half of the sound, and how
      // loud the second half is against the first)
      const read = (x, r) => { if (r) Object.assign(x, { af: r1(r.a.f), ar: +r.a.r.toFixed(2), bf: r1(r.b.f), br: +r.b.r.toFixed(2), ratio: +(r.b.rms / (r.a.rms || 1e-9)).toFixed(2) }); };
      e.onset = function (id, t, ...rest) { if (id === 'bd') { const x = sounds.find((q) => q.t === t); if (x) { x.called = 'kick'; read(x, this.lowRead); } } return onset.call(this, id, t, ...rest); };
      e.bassHit = function (t, ...rest) { const x = sounds.find((q) => q.t === t); if (x && !x.called) { x.called = 'bass'; read(x, this.lowRead); } return bassHit.call(this, t, ...rest); };
      try {
        await sleep(((spec.warm ?? 16) + (spec.secs ?? 16)) * 1000);
      } finally {
        Object.assign(e, { frame, onset, bassHit });
        rec.stop();
      }
      // (as heardAs: the audio clock to when the sound was processed)
      const ts = rec.ts.filter((s) => s[1] > 0), rendered = Math.min(...ts.map((s) => s[3] - s[2]));
      for (const x of sounds) {
        const at = x.t - rendered - 0.014, near = [...new Set(b.events.filter((ev) => Math.abs(ev.c - at) < 0.035).map((ev) => ev.id))].sort();
        x.played = near.length ? near.join('+') : 'nothing';
        x.song = name;
        delete x.t;
        all.push(x);
      }
      songs.push({ name, sounds: sounds.length, called: { kick: sounds.filter((x) => x.called === 'kick').length, bass: sounds.filter((x) => x.called === 'bass').length } });
    }
    const med = (xs) => { const a = xs.filter((v) => Number.isFinite(v)).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : null; };
    const byPlayed = {};
    for (const x of all) (byPlayed[x.played] ||= []).push(x);
    const summary = Object.fromEntries(Object.entries(byPlayed).map(([k, xs]) => [k, {
      n: xs.length, calledKick: xs.filter((x) => x.called === 'kick').length, calledBass: xs.filter((x) => x.called === 'bass').length,
      low: med(xs.map((x) => x.low)), body: med(xs.map((x) => x.body)), click: med(xs.map((x) => x.click)), top: med(xs.map((x) => x.top)), s: med(xs.map((x) => x.s)),
    }]));
    return { songs, summary, sounds: all };
  }

  // What the app makes of whatever the PC is playing right now (system audio), over secs.
  async function listen(secs = 60) {
    if (n.state.source !== 'system') await n.useSystem();
    const lock = watchLock(), bpms = new Set();
    const timer = setInterval(() => { if (n.eng.tempo.locked) bpms.add(Math.round(n.eng.tempo.bpm)); }, 500);
    await sleep(secs * 1000);
    clearInterval(timer);
    const L = lock();
    return {
      lockedShare: r1(L.lockedShare * 100) + '%', firstLockS: L.firstLockS, rhythm: L.rhythm, tempos: [...bpms],
      locks: L.events.filter((e) => /tempo (lock|change)/.test(e)).length,
      patterns: Object.fromEntries(['bd', 'sd', 'hhc', 'hho', 'vox'].map((id) => [id, n.eng.v[id].shown?.map((x) => (x ? 'x' : '.')).join('') ?? null])),
      code: codeLines(), events: L.events.slice(-8),
    };
  }

  // Follows a test song from the first moment: every jump of the drawing clock, every change of
  // tempo or bar lines, and every block put anywhere but on a whole step.
  async function trace(kind = 'house', secs = 25) {
    await start(kind);
    const rec = await record(), log = [], eng = n.eng;
    let last = null, down = eng.tempo.down, bpm = eng.tempo.bpm, seen = new Set(), pat = '', renumber = eng.tempo.renumber;
    const watch = setInterval(() => {
      const T = eng.tempo, t = r1((performance.now() / 1000) * 10) / 10;
      if ((T.renumber ?? 0) !== renumber) { log.push({ t, what: `renumbered by ${r1(((T.renumber ?? 0) - renumber) * 100) / 100} steps` }); renumber = T.renumber ?? 0; }
      const p = eng.v.bd.shown?.map((x) => (x ? 'x' : '.')).join('') ?? '';
      if (p !== pat) { log.push({ t, what: `kick pattern ${pat || '(none)'} -> ${p || '(none)'}` }); pat = p; }
      if (T.down !== down) { log.push({ t, what: `bar lines moved ${down} -> ${T.down}` }); down = T.down; }
      if (T.bpm !== bpm && Math.abs(T.bpm - bpm) / (bpm || 1) > 0.01) { log.push({ t, what: `tempo ${r1(bpm)} -> ${r1(T.bpm)}` }); }
      bpm = T.bpm;
      const kicks = [];
      for (const b of n.punch.blocks) {
        if (seen.has(b)) continue;
        seen.add(b);
        if (Math.abs(b.g - Math.round(b.g)) > 0.01) log.push({ t, what: `${b.lane} block off the grid at ${r1(b.g * 100) / 100}` });
        if (b.lane === 'bd') kicks.push(mod(Math.round(b.g), 16));
      }
      if (kicks.length) log.push({ t, what: `kick blocks queued at steps ${kicks.join(',')}` });
      const f = rec.frames[rec.frames.length - 1];
      if (f && last && f !== last) {
        const expect = last[1] + ((f[0] - last[0]) * 4) / last[5];
        if (Math.abs(f[1] - expect) > 0.5) log.push({ t, what: `clock jumped ${r1(f[1] - expect)} steps`, before: { vg: r1(last[1] * 100) / 100, target: r1(last[3] * 100) / 100 }, after: { vg: r1(f[1] * 100) / 100, target: r1(f[3] * 100) / 100 } });
      }
      last = f;
    }, 5);
    await sleep(secs * 1000);
    clearInterval(watch);
    rec.stop();
    return { kind, log: log.slice(0, 90).map((e) => `${e.t} ${e.what}${e.before ? ' ' + JSON.stringify(e.before) + ' -> ' + JSON.stringify(e.after) : ''}`), logCount: log.length, bad: rec.bad.slice(0, 10), events: eng.events.slice(-5) };
  }

  // ---------------------------------------------------------------- lag

  // Frame and listening-tick timing, main-thread stalls, and what the engine and the blocks
  // cost. With the window minimized the blocks are drawn here, 60 times a second.
  async function lag(secs = 10) {
    const raf = [], ticks = [], longs = [], cost = { draw: [], frame: [], tempo: [] };
    let last = 0, run = true, lastTick = 0;
    const loop = (now) => { if (!run) return; if (last) raf.push(now - last); last = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(Math.round(e.duration)); });
    po.observe({ type: 'longtask' });
    const eng = n.eng, frame = eng.frame, tempo = eng.estimateTempo, p = n.punch, draw = p.draw;
    const timed = (fn, into) => function (...args) { const s = performance.now(); const r = fn.apply(this, args); into.push(performance.now() - s); return r; };
    const timedFrame = timed(frame, cost.frame);
    eng.frame = function (t, audioT) { const now = performance.now(); if (lastTick) ticks.push(now - lastTick); lastTick = now; return timedFrame.call(this, t, audioT); };
    eng.estimateTempo = timed(tempo, cost.tempo);
    p.draw = timed(draw, cost.draw);
    const driver = !(await drawing()) && setInterval(() => p.draw(performance.now() / 1000, eng, { fg: [255, 255, 255] }, n.syncOffset()), 1000 / 60);
    await sleep(secs * 1000);
    run = false;
    po.disconnect();
    clearInterval(driver);
    eng.frame = frame;
    eng.estimateTempo = tempo;
    p.draw = draw;
    const over = (xs, ms) => xs.filter((x) => x > ms).length;
    return {
      refreshMs: summary(raf), framesOver25ms: over(raf, 25),
      tickMs: summary(ticks), ticksOver30ms: over(ticks, 30),
      costMs: { blocksDraw: summary(cost.draw), engineTick: summary(cost.frame), tempoEstimate: summary(cost.tempo) },
      blocks: p.blocks.length, selfDriven: !!driver,
      longTasks: longs.length, longestTaskMs: longs.length ? Math.max(...longs) : 0,
    };
  }

  // What the drum detectors see around each kick, bass note and clap of a test song: for telling
  // kicks from bass notes, and why claps get missed. Per instrument, the median of each measure.
  async function probe(name = 'house', secs = 12) {
    const b = await start(name);
    await sleep(14000);
    const eng = n.eng, frame = eng.frame, ticks = [];
    const mag = (db, k) => (db[k] > -160 ? 10 ** (db[k] / 20) : 0);
    eng.frame = function (t, audioT) {
      const r = frame.call(this, t, audioT), db = this.fastDb, d = this.det;
      let lo = 0, loW = 0, mid = 0, hi = 0;
      for (let k = 1; k <= 4; k++) { lo += mag(db, k); loW += k * mag(db, k); }
      for (let k = 5; k <= 13; k++) mid += mag(db, k); // ~230-610 Hz: where a bass note's overtones sit
      for (let k = 22; k <= 110; k++) hi += mag(db, k); // ~1-5 kHz: a kick's click, a clap's body
      const md = this.midDb, hzMid = sr / 4096;
      let peak = -200, pk = 0, around = 0;
      for (let k = Math.round(35 / hzMid); k <= Math.round(250 / hzMid); k++) if (md[k] > peak) { peak = md[k]; pk = k; }
      for (const k of [pk - 4, pk - 3, pk + 3, pk + 4]) around += md[k] / 4;
      ticks.push({ t, lo, cent: lo ? (loW / lo) * (sr / 1024) : 0, mid, hi, bd: d.bd.prevX / (d.bd.prevThr || 1), bdX: d.bd.prevX, bdPeak: d.bd.peak, sd: d.sd.prevX / (d.sd.prevThr || 1), sdX: d.sd.prevX, sdPeak: d.sd.peak, cover: this.sdCover, lead: d.lead.prevX / (d.lead.prevThr || 1), sdVsHh: (d.sd.prevX / (this.band.sd[1] - this.band.sd[0] + 1)) / ((d.hh.prevX + 1e-6) / (this.band.hh[1] - this.band.hh[0] + 1)), sharp: peak - around, hit: { bd: d.bd.last === t, sd: d.sd.last === t } });
      return r;
    };
    const rec = { ts: [] }, tsTimer = setInterval(() => rec.ts.push([0, 1, ac.currentTime, performance.now() / 1000]), 50);
    await sleep(secs * 1000);
    eng.frame = frame;
    clearInterval(tsTimer);
    const rendered = Math.min(...rec.ts.map((s) => s[3] - s[2]));
    const feats = {};
    for (const e of b.events) {
      if (!['kick', 'bass', 'snare', 'rim', 'chord', 'lead', 'hat', 'open hat', 'shaker'].includes(e.id)) continue;
      const at = e.c + rendered, after = ticks.filter((k) => k.t >= at - 0.005 && k.t <= at + 0.12);
      if (after.length < 6) continue;
      const before = ticks.filter((k) => k.t < at - 0.005).slice(-2)[0];
      const onset = after.slice(0, 3).reduce((a, k) => (k.bd > a.bd ? k : a), after[0]); // the tick where the kick band jumps most
      const i = after.indexOf(onset), later = after[Math.min(after.length - 1, i + 3)], decay = after[Math.min(after.length - 1, i + 6)];
      const f = (feats[e.id] ||= { n: 0, bdOverThr: [], bdHit: 0, centDropHz: [], decay90ms: [], midRise: [], hiRise: [], sharpDb: [], sdOverThr: [], sdHit: 0, cover: [], sdVsHh: [], leadOverThr: [] });
      f.n++;
      f.bdOverThr.push(onset.bd);
      if (after.slice(0, 3).some((k) => k.hit.bd)) f.bdHit++;
      f.centDropHz.push(onset.cent - later.cent);
      f.decay90ms.push(decay.lo / (onset.lo || 1e-9));
      f.midRise.push(before ? onset.mid / (before.mid || 1e-9) : 0);
      f.hiRise.push(before ? onset.hi / (before.hi || 1e-9) : 0);
      f.sharpDb.push(later.sharp);
      const sdTick = after.slice(0, 3).reduce((a, k) => (k.sd > a.sd ? k : a), after[0]);
      f.sdOverThr.push(sdTick.sd);
            f.cover.push(sdTick.cover);
      f.sdVsHh.push(sdTick.sdVsHh);
      f.leadOverThr.push(Math.max(...after.slice(0, 7).map((k) => k.lead)));
      if (after.slice(0, 3).some((k) => k.hit.sd)) f.sdHit++;
    }
    const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? r1(s[s.length >> 1] * 100) / 100 : null; };
    const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? r1(s[Math.floor(p * (s.length - 1))] * 100) / 100 : null; };
    return Object.fromEntries(Object.entries(feats).map(([id, f]) => [id, {
      n: f.n, bdHits: f.bdHit, sdHits: f.sdHit,
      ...Object.fromEntries(['bdOverThr', 'centDropHz', 'decay90ms', 'sdOverThr', 'cover', 'sdVsHh', 'leadOverThr'].map((k) => [k, `${q(f[k], 0.1)} | ${med(f[k])} | ${q(f[k], 0.9)}`])),
    }]));
  }

  // How long each hi-hat rings as the engine measures it (ms), by what was played. "m": a hat on a
  // clap, which can't be timed.
  async function rings(name = 'pop', secs = 12) {
    const b = await start(name);
    await sleep(10000);
    const eng = n.eng, finish = eng.hhFinish, got = [], offs = [];
    eng.hhFinish = function (p, ring) { got.push({ t: p.t, ring, masked: p.masked }); return finish.call(this, p, ring); };
    const timer = setInterval(() => offs.push(performance.now() / 1000 - ac.currentTime), 50);
    await sleep(secs * 1000);
    clearInterval(timer);
    eng.hhFinish = finish;
    const rendered = Math.min(...offs), by = {};
    for (const g of got) {
      const c = g.t - rendered - 0.014;
      const near = b.events.filter((e) => ['hat', 'open hat', 'shaker', 'crash'].includes(e.id) && Math.abs(e.c - c) < 0.035);
      const id = near.find((e) => e.id === 'open hat')?.id || near[0]?.id || 'other';
      (by[id] ||= []).push(Math.round(g.ring * 1000) + (g.masked ? 'm' : ''));
    }
    return by;
  }

  // Each bar's 12-note profile as the engine heard it (strongest = 100), the bass profile's top
  // note, and the chord it chose, against the chord played.
  async function chords(name = 'boombap', bars = 6) {
    const b = await start(name);
    await sleep(12000);
    const eng = n.eng, harmonyBar = eng.harmonyBar, got = [];
    eng.harmonyBar = function (prevBar) {
      const c = Array.from(this.barChroma), bass = Array.from(this.barBass), mx = Math.max(...c) || 1;
      const slot = mod(prevBar, 4);
      harmonyBar.call(this, prevBar);
      const top = bass.indexOf(Math.max(...bass));
      got.push({ slot, chord: this.slots[slot]?.chord?.name ?? null, bass: NAMES[top], notes: NAMES.map((nm, i) => `${nm}${Math.round((100 * c[i]) / mx)}`).join(' ') });
    };
    while (got.length < bars) await sleep(200);
    eng.harmonyBar = harmonyBar;
    return { played: b.spec.prog.join(' '), heard: got };
  }

  // How long the engine takes to lock onto a test song (seconds), and at what tempo.
  async function lockTime(kind = 'house', tries = 3) {
    const out = [];
    for (let i = 0; i < tries; i++) {
      await start(kind);
      const t0 = performance.now();
      while (!n.eng.tempo.locked && performance.now() - t0 < 30000) await sleep(50);
      out.push({ s: r1((performance.now() - t0) / 1000), bpm: r1(n.eng.tempo.bpm) });
      await sleep(1500);
    }
    return { kind, locks: out };
  }

  window.checks = { loopback, beat, song, suite, verdict, listen, lows, trace, lag, lockTime, probe, rings, chords, SONGS };
})();
