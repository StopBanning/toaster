// The page's half of the clock harness (tools/clock-harness.mjs): injected before the app starts, it gives the page a
// song that is the same every time, an engine that listens to it tick by tick on the clock's time, and a way to draw
// the app's frames one at a time and fingerprint what was drawn.
//
// The song is made here (a four-on-the-floor loop, drums, bass, chords), a sample at a time, and the analysers' reads
// (getFloatFrequencyData and getFloatTimeDomainData) are answered from it with an FFT of our own, as an AnalyserNode
// does: a Blackman window, the magnitude over the window's length, in dB. So the real engine runs on it, tick after
// tick, and finds the same beat, the same hits, the same chords on every run: nothing in a run waits for real time.
(() => {
  const H = (window.H = {});
  const TICK = 0.015; // the engine's timer, the app's 15 ms
  // The app starts listening to the machine's sound by itself once it has loaded (main.js asks it to): not in a check,
  // whose only sound is the song below. (Left to run, the engine hears the machine for the first second, and what it
  // heard stays in the pictures' queues, a different second each run.)
  Object.defineProperty(window, 'startSystemAudio', { configurable: true, get: () => () => Promise.resolve(), set() {} });

  // ------------------------------------------------------------ a song, the same every time
  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function makeSong(sr, seconds, bpm = 126) {
    const N = Math.floor(sr * seconds), x = new Float32Array(N), rand = mulberry32(1234567);
    const beat = 60 / bpm, bar = beat * 4, TAU = 2 * Math.PI;
    const add = (at, len, fn) => {
      const s0 = Math.floor(at * sr), n = Math.floor(len * sr);
      for (let i = 0; i < n && s0 + i < N; i++) if (s0 + i >= 0) x[s0 + i] += fn(i / sr, i);
    };
    const hz = (m) => 440 * 2 ** ((m - 69) / 12);
    const chords = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // Am F C G
    const roots = [33, 29, 36, 31]; // A1 F1 C2 G1
    for (let b = 0; b * beat < seconds; b++) {
      const at = b * beat, inBar = b % 4, barN = Math.floor(b / 4), chord = chords[barN % 4], root = hz(roots[barN % 4]);
      // the kick on every beat: a sine falling from 160 to 48 Hz
      add(at, 0.32, (t) => { const ph = TAU * (48 * t + (112 / 30) * (1 - Math.exp(-30 * t))); return 0.85 * Math.sin(ph) * Math.exp(-9 * t) * (1 - Math.exp(-900 * t)); });
      // a clap on 2 and 4: bursts of band-limited noise
      if (inBar === 1 || inBar === 3) {
        let prev = 0, lp = 0;
        for (const d of [0, 0.011, 0.022]) {
          add(at + d, d === 0.022 ? 0.16 : 0.012, (t) => { const n = rand() * 2 - 1; const hp = n - 0.85 * prev; prev = n; lp += 0.55 * (hp - lp); return 0.42 * lp * Math.exp(-(d === 0.022 ? 22 : 150) * t); });
        }
      }
      // closed hats on the offbeats, an open hat on the last one of the bar
      let prev = 0;
      add(at + beat / 2, inBar === 3 ? 0.4 : 0.07, (t) => { const n = rand() * 2 - 1; const hp = n - prev; prev = n; return (inBar === 3 ? 0.14 : 0.2) * hp * 0.5 * Math.exp(-(inBar === 3 ? 12 : 85) * t); });
      // the bass: on the beat and the offbeat but one, a saw-ish note of the chord's root
      for (const [k, on] of [[0, 1], [0.5, 0], [0.75, 1], [0.25, 0]]) {
        if (!on) continue;
        add(at + k * beat, beat * 0.28, (t) => { const ph = TAU * root * t; return 0.3 * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * Math.exp(-7 * t) * (1 - Math.exp(-400 * t)); });
      }
      // the chord, once a bar, softly (triangle-ish): held for the bar
      if (inBar === 0) {
        for (const m of chord) {
          add(at, bar * 0.97, (t) => { const ph = TAU * hz(m) * t; const env = Math.min(1, t / 0.05) * Math.min(1, (bar * 0.97 - t) / 0.08); return 0.06 * env * (Math.sin(ph) - Math.sin(3 * ph) / 9 + Math.sin(5 * ph) / 25); });
        }
      }
    }
    for (let i = 0; i < N; i++) x[i] = Math.tanh(x[i] * 1.1);
    return { sr, x, bpm };
  }

  // ------------------------------------------------------------ an FFT of our own
  const plans = new Map();
  function plan(n) {
    if (plans.has(n)) return plans.get(n);
    const bits = Math.log2(n), rev = new Uint32Array(n), cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), win = new Float64Array(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n); }
    const a = 0.16;
    for (let i = 0; i < n; i++) win[i] = (1 - a) / 2 - 0.5 * Math.cos((2 * Math.PI * i) / n) + (a / 2) * Math.cos((4 * Math.PI * i) / n);
    const p = { n, rev, cos, sin, win, re: new Float64Array(n), im: new Float64Array(n) };
    plans.set(n, p);
    return p;
  }
  // the last n samples before sample `end`, windowed: re and im of the transform
  function transform(song, n, end) {
    const p = plan(n), { re, im, rev, cos, sin, win } = p;
    for (let i = 0; i < n; i++) { const s = end - n + i; re[rev[i]] = s >= 0 && s < song.x.length ? song.x[s] * win[i] : 0; im[rev[i]] = 0; }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half, tr = re[b] * cos[k] - im[b] * sin[k], ti = re[b] * sin[k] + im[b] * cos[k];
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
    return p;
  }

  // ------------------------------------------------------------ the analysers, answered from the song
  H.audio = { song: null, at: 0 }; // at: the song's time, seconds, as of the tick
  const proto = AnalyserNode.prototype, real = { freq: proto.getFloatFrequencyData, time: proto.getFloatTimeDomainData };
  proto.getFloatFrequencyData = function (out) {
    const A = H.audio;
    if (!A.song) return real.freq.call(this, out);
    const n = this.fftSize, end = Math.floor(A.at * A.song.sr), p = transform(A.song, n, end);
    for (let k = 0; k < n / 2 && k < out.length; k++) {
      const m = Math.hypot(p.re[k], p.im[k]) / n;
      out[k] = m > 1e-10 ? 20 * Math.log10(m) : -200;
    }
  };
  proto.getFloatTimeDomainData = function (out) {
    const A = H.audio;
    if (!A.song) return real.time.call(this, out);
    const n = this.fftSize, end = Math.floor(A.at * A.song.sr);
    for (let i = 0; i < out.length; i++) { const s = end - n + i; out[i] = s >= 0 && s < A.song.x.length ? A.song.x[s] : 0; }
  };
  // a machine's output latency is its own: the same one for every run, or the blocks' timing offset differs from run to run
  Object.defineProperty(AudioContext.prototype, 'outputLatency', { configurable: true, get: () => 0.02 });

  // The star count rolls up from GitHub's number on a timer of real time, with a spray of glyphs at the end: not part of a
  // frame of the app.
  const hide = document.createElement('style');
  hide.textContent = '#b-star, .star-link, .star-spark { display: none !important; }';
  const hideNow = () => (document.head || document.documentElement).append(hide);
  if (document.documentElement) hideNow(); else document.addEventListener('DOMContentLoaded', hideNow, { once: true });

  // ------------------------------------------------------------ fingerprints of a frame
  const scratch = document.createElement('canvas'), sctx = scratch.getContext('2d', { willReadFrequently: true });
  function hashPixels(canvas) {
    scratch.width = canvas.width; scratch.height = canvas.height;
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.drawImage(canvas, 0, 0);
    const px = new Uint32Array(sctx.getImageData(0, 0, scratch.width, scratch.height).data.buffer);
    let h = 2166136261, lit = 0;
    for (let i = 0; i < px.length; i++) { const v = px[i]; h = Math.imul(h ^ v, 16777619); if (v) lit++; }
    return { hash: (h >>> 0).toString(16).padStart(8, '0'), w: canvas.width, h: canvas.height, lit };
  }
  const visible = (c) => !c.hidden && c.width > 0 && c.height > 0 && getComputedStyle(c).display !== 'none' && getComputedStyle(c).visibility !== 'hidden';
  function digest() {
    const canvases = {};
    for (const c of document.querySelectorAll('canvas')) if (visible(c)) canvases[c.id || `canvas${[...document.querySelectorAll('canvas')].indexOf(c)}`] = hashPixels(c);
    // the page's words and the state of every code line: what a viewer reads
    // (the code's lines: their classes, their inline styles (a glow set from the clock would be there), the words, the lit tokens)
    const code = [...document.querySelectorAll('#code, #code .ln')].map((el) => `${el.id}|${el.className}|${el.getAttribute('style') || ''}|${el.textContent}|${[...el.querySelectorAll('.on')].length}`).join('\n');
    const text = document.body.innerText;
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, '0'); };
    // and the engine's own state, so a difference can be told apart: the engine's (it ran differently) or the drawing's
    const e = nc().eng, f32 = (a) => { let h = 2166136261; const u = new Uint32Array(new Float32Array(a).buffer); for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619); return (h >>> 0).toString(16); };
    const engine = { roll: hash(JSON.stringify(e.rollCols)), fast: f32(e.fastDb), level: e.level, tempo: hash(JSON.stringify(e.tempo)), bar: e.bar, step: e.step };
    // the overlays the page puts over everything (the CRT's tube, the drop effects' desktop and its windows, the blue screen): their
    // classes and what is in them. The classes and the windows are what a timer or a counter would leave different.
    const overlays = ['tube', 'desk-back', 'desk-front', 'bsod'].map((id) => `${id}:${document.getElementById(id)?.className ?? '-'}`).join('|')
      + `|osd:${document.querySelector('#tube .t-osd')?.className ?? '-'}|flash:${document.querySelector('#desk-front')?.firstElementChild?.style.display ?? '-'}`;
    const windows = hash(document.querySelector('#desk-front .wins')?.innerHTML ?? '');
    // and how far each CSS animation and transition of the page has got (a line's flash as it lands, the CRT's kick fading): in
    // a render the clock sets that (renderer/dom-time.js), so it is the same at any frame rate
    const animations = document.getAnimations().map((a) => { const el = a.effect?.target; return `${el?.id || el?.className || el?.tagName || '?'}|${a.animationName || a.transitionProperty || a.id}|${a.playState}|${Math.round(+a.currentTime * 10) / 10}`; }).sort().join('\n');
    return { canvases, code: hash(code), text: hash(text), bodyClass: [...document.body.classList].sort().join(' '), overlays, windows, animations: hash(animations), engine, ...(H.detail ? { codeRaw: code, textRaw: text, animationsRaw: animations } : {}) };
  }
  H.digest = digest;
  H.pixels = (id) => {
    const c = document.getElementById(id) || document.querySelectorAll('canvas')[+String(id).replace(/^canvas/, '')]; // (a canvas with no id is named canvasN: the digest's name)
    scratch.width = c.width; scratch.height = c.height;
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.drawImage(c, 0, 0);
    const d = sctx.getImageData(0, 0, scratch.width, scratch.height).data;
    let bin = '';
    for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
    return { w: scratch.width, h: scratch.height, data: btoa(bin) };
  };

  // ------------------------------------------------------------ looks
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nc = () => window.__nc;

  // The base: nothing but the code on the theme's colour, then the look's own setting on top.
  function setLook(look) {
    const n = nc(), { state } = n;
    const S = n.presetSetters;
    n.setCalm(!!look.calm);
    S.theme(look.theme || 'bluescreen');
    S.codeHidden(look.code === 'none' ? true : look.code === 'beat' ? 'beat' : false);
    n.setOrb(false); n.setGlass(false); n.setBlocks(false);
    state.card = false;
    state.spectroTheme = !!look.spectroTheme;
    state.chromeCollage = look.chromeCollage !== false;
    state.spaghettiKind = look.spaghettiKind || 'snakes';
    if (look.worldLook) { state.worldLook = look.worldLook; n.worlds.setLook(look.worldLook); }
    state.sceneryTheme = false;
    state.sceneryScene = look.scene || 'auto';
    n.setVisual(n.VISUALS.indexOf(look.visual || 'off'));
    if (look.blocks) { state.blockLook = look.blocks; n.setBlocks(true); }
    if (look.orb) { n.setOrb(true); if (look.orbForm) n.orb.show(look.orbForm); }
    if (look.glass) n.setGlass(true);
    if (look.card) { state.card = true; n.applyCard(); }
    if (look.crt) n.setCrt(true);
    // (a drop effect: the one the app has chosen, set off by H.advance at look.dropAt, the way the engine's drop sets it off;
    // or, with look.dropShort, the effect started on its own for a short while so its ending falls in the frames compared)
    state.drop = n.DROPS.indexOf(look.drop || 'off');
    H.dropAt = look.dropAt; H.dropShort = look.dropShort; H.dropped = false;
    // (a post look, stream E's: the app gives its names in __nc.postLooks and sets one with __nc.setPostLook(name))
    if (look.post && n.setPostLook) n.setPostLook(look.post);
    else if (n.setPostLook) n.setPostLook('none');
  }

  H.setLook = setLook;

  // whether the look's own pieces are ready: its shader compiled, its first frame drawn
  function waiting() {
    const n = nc(), mode = n.VISUALS[n.state.visual];
    const w = { worlds: n.worlds, chrome: n.chrome, spaghetti: n.spaghetti, spectrogram: n.spectro, warp: n.warp, scenery: n.scenery }[mode];
    if (mode === 'scenery') return !n.scenery.drawnScene || n.scenery.drawnScene !== n.sceneShown();
    return !!w?.waiting || !!w?.broken;
  }

  // Everything before the first frame that counts: the app taken out of its live loop and into the clock's render
  // mode, a silent source attached (so the app is "playing"), the look set, its shaders waited for (in real time,
  // drawing at one moment of the clock, so the wait changes nothing), then the engine run on the song, tick by tick,
  // up to t0.
  H.prepare = async (look, { t0 = 10, seconds = 24, seed = 424242, fps = 60 } = {}) => {
    const n = nc();
    await document.fonts.ready;
    const { clock } = n;
    clock.render({ fps, t0: 0, seed }); // (once: a render's own start. Whatever the clock's timers are waiting for stays through the run)
    H.audio.song = makeSong(n.ac.sampleRate, seconds);
    H.audio.at = 0;
    n.attach(n.ac.createGain(), 'file', 'harness'); // (a silent source: the app listens as it does to a file)
    // (the engine keeps a few counters across a reset: the tick that decides which ticks look for notes and for the lead,
    // and where the audio clock stands against its own; before the app's own live ticks, as many as the page happened to
    // run before this, are forgotten, so the first tick of the song is the first of its kind)
    Object.assign(n.eng, { tick: 0, audioOff: undefined, lastAudioT: undefined });
    clock.seed = seed; // (attach started a new song, with a new seed: this song has the one every run has)
    clock.set(0);
    n.view.clear(); // (and the typing takes its dice from it)
    setLook(look);
    const started = performance.now();
    for (;;) {
      clock.set(0);
      n.drawFrame(0);
      await Promise.resolve();
      if (!waiting()) break;
      if (performance.now() - started > 120000) throw new Error('never ready: ' + JSON.stringify(look));
      await sleep(50);
    }
    await sleep(look.settle ?? 2500); // (a compile's last driver work, and the fonts)
    for (let i = 0; i < 3; i++) { clock.set(0); n.drawFrame(0); await Promise.resolve(); }
    // the engine, tick by tick, on the song, up to t0
    H.tickN = 0;
    H.advance(t0 - 1e-9);
    return { sr: n.ac.sampleRate, tempo: { ...n.eng.tempo }, ticks: H.tickN };
  };

  // Run the engine's ticks (and the code's) for every 15 ms up to time t (inclusive).
  H.advance = (t) => {
    const n = nc(), { clock, eng } = n;
    for (;;) {
      const tk = (H.tickN + 1) * TICK;
      if (tk > t + 1e-9) break;
      H.tickN++;
      H.audio.at = tk;
      clock.set(tk);
      eng.frame(tk, tk);
      // (the engine calls its drop from inside its tick, before the page's share of the tick: so here)
      if (H.dropAt !== undefined && !H.dropped && tk >= H.dropAt) {
        H.dropped = true;
        if (H.dropShort === 'takeover') n.takeover.start(tk, 'harness', 0.12); // (8 bars of 0.12 s: closing within a second)
        else if (H.dropShort === 'storm') n.storm.start(tk, 600); // (4 bars at 600 bpm: 1.6 s)
        else if (H.dropShort === 'y2k') n.y2k.start(tk, 'harness', 0.24); // (8 bars of 0.24 s: the blue screen and the clock again within 2 s)
        else eng.on.drop();
      }
      n.codeTick(tk);
    }
  };

  // Draw the frames of one second-long-or-so run at a frame rate: frame k at t0 + k/fps, each after the engine's ticks up to
  // it, and fingerprint the ones at the times asked for (seconds after t0).
  H.run = async ({ fps, t0, seconds, compare, pixelsOf }) => {
    const n = nc(), { clock } = n, out = {};
    const frames = Math.round(seconds * fps), want = new Map(compare.map((c) => [Math.round(c * fps), c]));
    for (let k = 0; k <= frames; k++) {
      const t = t0 + k / fps;
      H.advance(t);
      clock.set(t, k);
      await n.prepareFrame(t); // (what a frame waits for: the eye's clip seeking to the frame for t)
      n.drawFrame(t);
      await Promise.resolve(); // (the page's observers get their turn: the glass redraws what changed)
      if (want.has(k)) {
        const d = digest();
        d.eng = { locked: n.eng.tempo.locked, bpm: n.eng.tempo.bpm, bar: n.eng.bar, step: n.eng.step, animations: document.getAnimations().length };
        // (the pixels of one canvas, taken now: a WebGL canvas that does not keep its drawing buffer is blank a task later)
        if (pixelsOf) d.pixels = H.pixels(pixelsOf);
        out[want.get(k)] = d;
      }
      // (a turn of the page's event loop between frames, as a render has: the page's events (an animation starting or
      // ending, a resize) are delivered, and what listens for them, the glass, hears them. The frame was fingerprinted above,
      // before its canvases are given up.)
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  };

  H.ready = true;
})();
