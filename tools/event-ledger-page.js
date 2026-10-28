async function ({ job, sources, checks, audio }) {
  try {
    const url = (s) => 'data:text/javascript,' + encodeURIComponent(s);
    globalThis.checkTime = 0; globalThis.NC_DEBUG = false;
    const engineURL = url(sources.engine.replace('performance.now() / 1000', 'globalThis.checkTime'));
    const { createEngine, createEventLedger } = await import(engineURL);
    const codegenURL = url(sources.codegen.replace("'./engine.js'", JSON.stringify(engineURL)));
    const { createTape } = await import(url(sources.tape.replace("'./engine.js'", JSON.stringify(engineURL))
      .replace("'./codegen.js'", JSON.stringify(codegenURL))));
    const sr = 44100, duration = job.seconds;
    const ac0 = new OfflineAudioContext(1, Math.ceil(duration * sr), sr);
    let scheduleTime = 0;
    const ac = new Proxy(ac0, { get(target, key) {
      if (key === 'currentTime') return scheduleTime;
      const v = target[key]; return typeof v === 'function' ? v.bind(target) : v;
    } });
    const fast = ac.createAnalyser(), mid = ac.createAnalyser(), slow = ac.createAnalyser();
    [fast, mid, slow].forEach((a, i) => { a.fftSize = [1024, 4096, 16384][i]; a.smoothingTimeConstant = 0; });
    const bus = ac.createGain(); bus.connect(fast); bus.connect(mid); bus.connect(slow);
    // Destination is offline memory only. The zero sink keeps every analyser in the render graph.
    const sink = ac.createGain(); sink.gain.value = 0;
    for (const a of [fast, mid, slow]) a.connect(sink);
    sink.connect(ac.destination);
    const truth = { drums: {}, bass: [], lead: [], harmony: [], tempo: [], downbeats: [] };
    let bars = [];
    if (audio) {
      const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
      const buffer = await ac0.decodeAudioData(bytes.buffer);
      const src = ac.createBufferSource(); src.buffer = buffer; src.connect(bus); src.start(0, job.from ?? 0, duration);
    } else {
      // Use the shipped generator/instruments unchanged. Virtual 25/50ms scheduler callbacks
      // are advanced before rendering; RNG is seeded exactly as checks.start does.
      const timers = [];
      const setInterval = (fn, ms) => { const x = { fn, ms, at: ms / 1000 }; timers.push(x); return x; };
      const clearInterval = () => {};
      const wrap = (x) => new Proxy(x, { get(target, name) {
        const fn = target[name]; if (typeof fn !== 'function') return fn;
        return (...args) => {
          const [start, value, len] = args;
          const part = { kick: 'bd', snare: 'sd', rim: 'sd', hat: value ? 'hho' : 'hhc', shaker: 'hhc' }[name];
          if (part) (truth.drums[part] ??= []).push({ start });
          if (name === 'bass' || name === 'lead') truth[name].push({ start, end: start + len, midi: value });
          return fn.apply(target, args);
        };
      } });
      const body = checks.slice(checks.indexOf('  let rand = Math.random;'), checks.indexOf('  // seed: another take'));
      const generate = new Function('ac', 'sr', 'setInterval', 'clearInterval', 'wrap',
        body.replace('const x = instruments(bus)', 'const x = wrap(instruments(bus))')
          .replace('instruments(duck) : x', 'wrap(instruments(duck)) : x')
        + '\nrand = seeded(' + JSON.stringify(job.key) + '); return play(SONGS[' + JSON.stringify(job.key) + ']);');
      const p = generate(ac, sr, setInterval, clearInterval, wrap); p.out.connect(bus); bars = p.bars;
      while (true) {
        const timer = timers.reduce((a, b) => !a || b.at < a.at ? b : a, null);
        if (!timer || timer.at > duration) break;
        scheduleTime = timer.at; timer.fn(); timer.at += timer.ms / 1000;
      }
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i], end = Math.min(duration, bars[i + 1]?.c ?? duration);
        if (b.c >= duration) continue;
        truth.harmony.push({ start: b.c, end, label: b.chord });
        truth.tempo.push({ start: b.c, bpm: b.bpm }); truth.downbeats.push({ start: b.c });
      }
      if (bars.length) truth.harmony.unshift({ start: 0, end: bars[0].c, label: null });
      if (job.key === 'ambient') {
        // No metrical ground truth for this deliberately pulse-free fixture.
        truth.tempo = []; truth.downbeats = [];
      }
      if (job.key === 'talk') truth.harmony = [{ start: 0, end: duration, label: null }];
    }
    const ledger = createEventLedger({ sampleRate: sr });
    const opts = { fast, mid, slow, sampleRate: sr };
    const e = createEngine({ ...opts, ledger }), control = job.parity ? createEngine({ ...opts, ledger: null }) : null;
    e.reset({ top: true }); control?.reset({ top: true });
    for (const eng of [e, control].filter(Boolean)) { eng.resetAt = eng.lastSound = 0; eng.song = () => ({ known: true, playing: true }); eng.tape = createTape(); }
    ledger.startCapture({ source: audio ? 'file' : 'generated', sourceId: job.key, startTime: 0 });
    const tape = e.tape, stretches = []; let current;
    const lock = tape.lock.bind(tape), pattern = tape.pattern.bind(tape), harmony = tape.harmony.bind(tape), shift = tape.shift.bind(tape);
    tape.lock = (...args) => { current = { moved: 0, rows: [], patterns: 0, down: 0 }; stretches.push(current); return lock(...args); };
    tape.shift = (delta) => { if (current) current.moved += delta; return shift(delta); };
    tape.pattern = (beat, parts) => { if (current) { current.rows.push({ b: beat + current.moved, kind: 'pattern' }); current.patterns++; } return pattern(beat, parts); };
    tape.harmony = (beat, ...rest) => { if (current) current.rows.push({ b: beat + current.moved, kind: 'harmony' }); return harmony(beat, ...rest); };
    // Preserve the actual accepted tape calls for paired historical-writer replay.
    // Cloning at call time prevents later engine mutations from changing the replay.
    const tapeCalls = [];
    for (const method of ['reset', 'lock', 'tempo', 'shift', 'pattern', 'harmony']) {
      const original = tape[method].bind(tape);
      tape[method] = (...args) => {
        tapeCalls.push({ method, args: structuredClone(args) });
        return original(...args);
      };
    }
    const downbeats = [], beats = []; let lastTime = -1, parity = true;
    const state = (eng) => JSON.stringify({ tempo: eng.tempo, v: eng.v, slots: eng.slots,
      bassBeats: eng.bassBeats, key: eng.key, silent: eng.silent, tape: eng.tape.song(eng.tempo.down) });
    let render;
    for (let t = .015; t < duration - .005; t += .015) {
      const paused = ac0.suspend(t);
      if (lastTime < 0) render = ac0.startRendering(); else await ac0.resume();
      await paused;
      const actual = ac0.currentTime; globalThis.checkTime = actual;
      if(Math.floor(actual/10)>Math.floor(lastTime/10))console.log('progress',job.key,Math.floor(actual));
      e.frame(actual, actual); control?.frame(actual, actual);
      if (control && state(e) !== state(control)) throw Error('ledger changed engine output at ' + actual);
      const T = e.tempo;
      if (T.locked) {
        const beat = T.n0 + (actual - T.t0) / T.P;
        const b = Math.floor(beat), at = T.t0 + (b - T.n0) * T.P;
        if (at > lastTime && at <= actual) {
          beats.push({ start: at }); if (((b - T.down) % 4 + 4) % 4 === 0) downbeats.push({ start: at });
        }
      }
      if (current) { current.final = { ...T }; current.down = T.down; }
      lastTime = actual;
    }
    await ac0.resume(); await render;
    const song = tape.song(e.tempo.down), best = stretches.reduce((a, b) => !a || b.patterns > a.patterns ? b : a, null);
    let origin = null;
    if (song && best?.final) {
      const first = Math.min(...best.rows.map((r) => r.kind === 'pattern'
        ? Math.round((r.b - best.moved - best.down) / 4)
        : Math.floor((r.b - best.moved - best.down + 2) / 4)));
      origin = best.final.t0 + ((song.timeline?.originBeat ?? first * 4) + best.down - best.final.n0) * best.final.P;
    }
    return { key: job.key, duration, sampleRate: sr, truth, ledger: ledger.snapshot(), downbeats, beats,
      song, tapeCalls, finalDown: e.tempo.down, writerOrigin: origin, parity: control ? parity : null, methodology: 'serial offline Web Audio; 15ms requested polls, audio-block-rounded suspensions; parity only when --parity requested' };
  } catch (error) { return { error: String(error.stack || error) }; }
}
