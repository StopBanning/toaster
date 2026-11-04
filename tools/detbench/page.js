async function ({ job, sources, sr }, audio) {
  // One song through the engine, as the app hears a file: polled every 15 ms on the audio clock, the code's lines rebuilt
  // every 45 ms (the app: 40). Returns the engine's timing (beats and bar lines it counted), its tempo changes and every
  // change of the written lines (bpm, key, the four drum lines). Run by host.cjs; see score.mjs for what is measured.
  try {
    const url = (s) => 'data:text/javascript,' + encodeURIComponent(s);
    globalThis.checkTime = 0; globalThis.NC_DEBUG = false;
    const engineURL = url(sources.engine.replace('performance.now() / 1000', 'globalThis.checkTime'));
    const { createEngine } = await import(engineURL);
    const codegenURL = url(sources.codegen.replace("'./engine.js'", JSON.stringify(engineURL)));
    const { buildLines, resetCodegen } = await import(codegenURL);
    const { createTape } = await import(url(sources.tape.replace("'./engine.js'", JSON.stringify(engineURL))
      .replace("'./codegen.js'", JSON.stringify(codegenURL))));
    const duration = job.seconds;
    const ac0 = new OfflineAudioContext(1, Math.ceil(duration * sr), sr);
    let scheduleTime = 0;
    const synth = !!job.synth;
    // (a synthetic song's scheduler reads currentTime while it is written ahead, before the render starts)
    const ac = new Proxy(ac0, { get(target, key) {
      if (key === 'currentTime') return synth ? scheduleTime : target.currentTime;
      const v = target[key]; return typeof v === 'function' ? v.bind(target) : v;
    } });
    const fast = ac.createAnalyser(), mid = ac.createAnalyser(), slow = ac.createAnalyser();
    [fast, mid, slow].forEach((a, i) => { a.fftSize = [1024, 4096, 16384][i]; a.smoothingTimeConstant = 0; });
    const bus = ac.createGain(); bus.gain.value = job.gain ?? 1; bus.connect(fast); bus.connect(mid); bus.connect(slow);
    const sink = ac.createGain(); sink.gain.value = 0;
    for (const a of [fast, mid, slow]) a.connect(sink);
    sink.connect(ac.destination);
    const truth = synth ? { drums: {}, bars: [] } : null;
    if (synth) {
      // One of tools/checks.js's test songs, made by its own instruments and generator (seeded by the song's name, as
      // checks.start does), with what it played kept as the truth: every drum hit and each bar's start and tempo.
      const timers = [];
      const setInterval = (fn, ms) => { const x = { fn, ms, at: ms / 1000 }; timers.push(x); return x; };
      const clearInterval = () => {};
      const wrap = (x) => new Proxy(x, { get(target, name) {
        const fn = target[name]; if (typeof fn !== 'function') return fn;
        return (...args) => {
          const [start, value] = args;
          const part = { kick: 'bd', snare: 'sd', rim: 'sd', hat: value ? 'hho' : 'hhc', shaker: 'hhc' }[name];
          if (part) (truth.drums[part] ??= []).push(+start.toFixed(4));
          // (bench instrumentation: the bass notes played, [start, midi, length])
          if (name === 'bass') (truth.bass ??= []).push([+start.toFixed(4), value, +args[2].toFixed(4)]);
          return fn.apply(target, args);
        };
      } });
      const checks = sources.checks;
      const body = checks.slice(checks.indexOf('  let rand = Math.random;'), checks.indexOf('  // seed: another take'));
      const generate = new Function('ac', 'sr', 'setInterval', 'clearInterval', 'wrap',
        body.replace('const x = instruments(bus)', 'const x = wrap(instruments(bus))')
          .replace('instruments(duck) : x', 'wrap(instruments(duck)) : x')
        + '\nrand = seeded(' + JSON.stringify(job.seed || job.synth) + '); return play(SONGS[' + JSON.stringify(job.synth) + ']);');
      const p = generate(ac, sr, setInterval, clearInterval, wrap); p.out.connect(bus);
      while (true) {
        const timer = timers.reduce((a, b) => !a || b.at < a.at ? b : a, null);
        if (!timer || timer.at > duration) break;
        scheduleTime = timer.at; timer.fn(); timer.at += timer.ms / 1000;
      }
      truth.bars = (p.bars || []).filter((b) => b.c < duration).map((b) => [+b.c.toFixed(4), b.bpm, b.chord]);
      truth.kind = job.synth;
    } else {
      const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
      const buffer = await ac0.decodeAudioData(bytes.buffer);
      // (phase: the song starts this much after the first poll, as the app's timer can fall anywhere in a song's first 15 ms)
      const src = ac0.createBufferSource(); src.buffer = buffer; src.connect(bus); src.start(job.phase || 0, job.from || 0, duration);
    }
    const e = createEngine({ fast, mid, slow, sampleRate: sr, ledger: null });
    e.reset({ top: !(job.from > 0) });
    e.resetAt = e.lastSound = 0;
    e.song = () => ({ known: true, playing: false });
    e.tape = createTape();
    resetCodegen();
    const from = (job.from || 0) - (job.phase || 0);
    let stretches = [], curStretch = null, beforeOrigin = null;
    const calcOrigin = (s, st) => {
      if (!s || !st?.final || !st.rows.length) return null;
      const first = Math.min(...st.rows.map((r) => r.kind === 'pattern'
        ? Math.round((r.b - st.moved - st.down) / 4)
        : Math.floor((r.b - st.moved - st.down + 2) / 4)));
      return +(from + st.final.t0 + ((s.timeline?.originBeat ?? first * 4) + st.down - st.final.n0) * st.final.P).toFixed(4);
    };
    const reset0 = e.tape.reset.bind(e.tape), lock0 = e.tape.lock.bind(e.tape), pat0 = e.tape.pattern.bind(e.tape), harm0 = e.tape.harmony.bind(e.tape), shift0 = e.tape.shift.bind(e.tape);
    e.tape.reset = (down = 0) => {
      const done = e.tape.song(down);
      if (done) {
        const best = stretches[(done.coverage?.selectedStretch ?? 1) - 1] || stretches.reduce((a, b) => !a || b.patterns > a.patterns ? b : a, null);
        if (best?.patterns >= 4) beforeOrigin = calcOrigin(done, best);
      }
      stretches = []; curStretch = null;
      return reset0(down);
    };
    e.tape.lock = (...a) => { curStretch = { moved: 0, rows: [], patterns: 0, down: 0 }; stretches.push(curStretch); return lock0(...a); };
    e.tape.shift = (d) => { if (curStretch) curStretch.moved += d; return shift0(d); };
    e.tape.pattern = (b, p) => { if (curStretch) { curStretch.rows.push({ b: b + curStretch.moved, kind: 'pattern' }); curStretch.patterns++; } return pat0(b, p); };
    e.tape.harmony = (b, ...r) => { if (curStretch) curStretch.rows.push({ b: b + curStretch.moved, kind: 'harmony' }); return harm0(b, ...r); };
    const beats = [], tempo = [], lines = [], notes = [];
    // (bench instrumentation) each bar's harmony as the engine filed it: the bar's start and length, the chord found in it
    // (null: none) and the one its slot writes, the bass found in it (per beat, filled forward as the code writes them, else
    // the bar's one note; null: none new) and the one its slot writes, and the key shown after it
    const harmony = [], tuning = [], SENT = {}, harmonyBar = e.harmonyBar;
    e.harmonyBar = function (prevBar) {
      const T = this.tempo, slot = ((prevBar % 4) + 4) % 4, chord0 = this.lastChord, beats0 = this.bassBeats[slot];
      const start = T.t0 + (prevBar * 4 + T.down - T.n0) * T.P, len = 4 * T.P;
      // (and what the bar's harmony is decided from, for replaying it: the note analysis's notes and bass over the bar, how
      // many of its readings had bass, its bass notes' octaves, the bass tracker's readings by the beat, the first chord's key)
      const tb = this.bt.bars.get(prevBar), r3 = (x) => Math.round(x * 1000) / 1000;
      const inputs = { c: Array.from(this.barChroma, r3), b: Array.from(this.barBass, r3), bf: this.bassFrames, f: this.barFrames,
        midi: Object.fromEntries([...this.bassMidi.keys()].filter((m) => this.bassMidi[m] > 0).map((m) => [m, r3(this.bassMidi[m])])),
        tb: tb ? { n: Array.from(tb.n), notes: tb.notes.map((x) => [...x]) } : null, home: this.opening.key ? this.opening.key.root + (this.opening.key.mode === 'minor' ? 'm' : '') : null,
        ks: this.keyShown, kb: this.keyBars };
      this.bassBeats[slot] = SENT;
      harmonyBar.call(this, prevBar);
      const got = this.bassBeats[slot];
      if (got === SENT) this.bassBeats[slot] = beats0;
      const fill = (bs) => { let cur = bs.find((m) => m !== null); return bs.map((m) => (m !== null ? (cur = m) : cur)); };
      const bb = this.bassBeats[slot], written = bb?.some((m) => m !== null) ? fill(bb) : this.slots[slot]?.bass ?? null;
      const fresh = got && got !== SENT ? fill(got) : got === null ? this.slots[slot]?.bass ?? null : null;
      harmony.push([+(start + from).toFixed(3), +len.toFixed(4), this.lastChord !== chord0 ? this.lastChord.name : null, this.slots[slot]?.chord?.name ?? null,
        fresh, written, this.key ? this.key.root + (this.key.mode === 'minor' ? 'm' : '') : null, inputs]);
    };
    // (bench instrumentation) the key line's inputs in order, for replaying it offline (keyreplay.mjs): [time, 'reset'], the
    // first chord heard [time, 'open', root, quality, its bass note (-1: none; undefined: an engine that doesn't take it)],
    // and each bar's chord and bass as the key saw them [time, 'bar', root, quality, bass note (-1: none), 1 when the count of
    // bars the key has been shown was started over since (a new tempo), the chord's score, the bass tracker's notes by the
    // beat (MIDI or null; null for none)]. Nothing the key shown decides is read back by the engine.
    const keylog = [], { keyBar, keyOpening, reset } = e;
    if (keyBar) {
      let shownAfter = 0;
      const at = () => +(globalThis.checkTime + from).toFixed(3);
      e.reset = function (...args) { keylog.push([at(), 'reset']); shownAfter = 0; return reset.apply(this, args); };
      e.keyOpening = function (chord, ...rest) { keylog.push([at(), 'open', chord.root, chord.q, rest[0]]); return keyOpening.call(this, chord, ...rest); };
      e.keyBar = function (chord, bassPc, ...rest) {
        keylog.push([at(), 'bar', chord.root, chord.q, bassPc, this.keyShown !== shownAfter ? 1 : 0, +chord.score.toFixed(3), rest[0] ?? null]);
        keyBar.call(this, chord, bassPc, ...rest);
        shownAfter = this.keyShown;
      };
    }
    const last = {};
    let lastTime = -1, lastSig = '', render, k = 0;
    const origNote = e.note?.bind(e);
    if (origNote) e.note = (msg, ...rest) => { notes.push([+(globalThis.checkTime + from).toFixed(3), String(msg).slice(0, 80)]); return origNote(msg, ...rest); };
    for (let t = 0.015 + (job.offset || 0); t < duration - 0.005; t += 0.015) {
      const paused = ac0.suspend(t);
      if (lastTime < 0) render = ac0.startRendering(); else await ac0.resume();
      await paused;
      const now = ac0.currentTime; globalThis.checkTime = now;
      // (as the app: the engine runs while there is a source; a file is a source from its start to its end)
      e.frame(now, now);
      const T = e.tempo;
      const sig = `${T.locked ? 1 : 0}|${T.locked ? T.bpm.toFixed(2) : ''}|${T.locked ? T.down : ''}|${e.silent ? 1 : 0}`;
      if (sig !== lastSig) { tempo.push([+(now + from).toFixed(3), T.locked ? +T.bpm.toFixed(2) : null, T.locked ? T.down : null, e.silent ? 1 : 0, T.provisional ? +T.provisional.bpm.toFixed(1) : null]); lastSig = sig; }
      if (T.locked) {
        const beat = T.n0 + (now - T.t0) / T.P;
        const b = Math.floor(beat), at = T.t0 + (b - T.n0) * T.P;
        if (at > lastTime && at <= now) beats.push([+(at + from).toFixed(4), (((b - T.down) % 4) + 4) % 4]);
      }
      if (k++ % 3 === 0) {
        const L = buildLines(e, { song: null, source: 'file' }, now);
        for (const id of ['tempo', 'scale', 'bd', 'sd', 'hhc', 'hho', 'bassline']) {
          const text = (L[id] || []).map((p) => p.text).join('');
          if (text !== last[id]) { lines.push([+(now + from).toFixed(3), id, text]); last[id] = text; }
        }
      }
      // (bench instrumentation: the tuning the engine names notes in, the bass tracker's and the note analysis's, every 10 s)
      if (k % 666 === 0) tuning.push([+(now + from).toFixed(1), e.bt.c !== undefined ? +(Math.atan2(e.bt.s, e.bt.c) / (2 * Math.PI)).toFixed(3) : null, e.tune ? +(e.tune.est ?? e.tune.off).toFixed(3) : null]);
      if (curStretch) { curStretch.final = { t0: T.t0, n0: T.n0, P: T.P }; curStretch.down = T.down; }
      lastTime = now;
    }
    await ac0.resume(); await render;
    const song = e.tape.song(e.tempo.down);
    const best = stretches[(song?.coverage?.selectedStretch ?? 1) - 1] || stretches.reduce((a, b) => !a || b.patterns > a.patterns ? b : a, null);
    const origin = song?.origin != null ? +(from + song.origin).toFixed(4) : (song ? (best && best.patterns >= 4 ? calcOrigin(song, best) : beforeOrigin) : null);
    return { key: job.key, from: job.from || 0, seconds: duration, sr, beats, tempo, lines, notes: notes.slice(0, 400), truth, harmony, tuning, keylog, song, origin };
  } catch (error) { return { error: String(error.stack || error) }; }
}
