// A stand-in world for the microphone and sound-revival code in renderer/app.js: a fake AudioContext
// (with iOS's states and its need for a tap), a fake getUserMedia and fake tracks, and a fake clock. The
// real code is cut out of app.js by its markers and run against it, so a test exercises what ships.
// Used by ios-mic.test.mjs (in Node) and by a script that runs the same scenarios inside a WebKit page.
//
// Not a model of iOS itself: what iOS does is written down in the report, and tried on a real iPad.

export function cutOut(appSource) {
  const slice = (from, to) => {
    const a = appSource.indexOf(from), b = appSource.indexOf(to);
    if (a < 0 || b < a) throw new Error(`app.js: can't find "${from}" .. "${to}"`);
    return appSource.slice(a, b);
  };
  return slice('const RAW_AUDIO', 'async function useSystem') + '\n' + slice("// What went wrong when the microphone wouldn't open", 'function describeAudio');
}

export function makeWorld({ ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', platform = 'Win32', touchPoints = 0, secure = true, standalone = false, win, doc } = {}) {
  // ---- a clock that only moves when told to
  let now = 0, nextId = 1;
  const timers = new Map();
  const clock = {
    setTimeout: (fn, ms = 0) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn, every: ms }); return id; },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await flush();
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, t] = due;
        now = t.at;
        if (t.every) t.at += t.every; else timers.delete(id);
        t.fn();
      }
      now = end;
      await flush();
    },
  };
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

  const world = {
    gesture: false,          // true while a tap's handler is running (iOS lets resume() through only then)
    log: [],                 // everything the code asked the browser for, in order
    resumeMode: 'ok',        // ok | needsTap-pending | needsTap-reject | hang
    micMode: 'allow',        // allow | NotAllowedError | NotFoundError | NotReadableError | hang
    micNeedsGesture: false,  // refuse (NotAllowedError) a request made outside a tap
    signal: 'tone',          // what the microphone gives: tone | zeros
    notices: [], status: [],
    streams: [],
  };
  const T = (type, init) => (typeof Event === 'function' ? new Event(type, init) : { type });

  // ---- the page
  const documentEl = doc || Object.assign(new EventTarget(), { hidden: false });
  const windowEl = win || new EventTarget();
  const hiddenState = { v: false };
  if (!documentEl.createElement) documentEl.createElement = () => ({});
  Object.defineProperty(documentEl, 'hidden', { get: () => hiddenState.v, configurable: true });
  world.setHidden = (v) => { hiddenState.v = v; documentEl.dispatchEvent(T('visibilitychange')); };
  world.tap = (types = ['touchend', 'pointerup']) => {
    world.gesture = true;
    try { for (const t of types) windowEl.dispatchEvent(T(t)); } finally { world.gesture = false; }
  };

  // ---- the sound
  const ac = Object.assign(new EventTarget(), { state: 'suspended', sampleRate: 48000 });
  ac.setState = (s) => { if (ac.state === s) return; ac.state = s; ac.dispatchEvent(T('statechange')); };
  ac.resume = () => {
    world.log.push({ call: 'resume', gesture: world.gesture, state: ac.state });
    if (ac.state === 'running') return Promise.resolve();
    if (world.resumeMode === 'hang') return new Promise(() => {});
    if (world.resumeMode.startsWith('needsTap') && !world.gesture) {
      return world.resumeMode === 'needsTap-reject' ? Promise.reject(Object.assign(new Error('not allowed'), { name: 'NotAllowedError' })) : new Promise(() => {});
    }
    return new Promise((r) => setTimeout0(() => { ac.setState('running'); r(); }));
  };
  const setTimeout0 = (fn) => Promise.resolve().then(fn);
  ac.createMediaStreamSource = (stream) => ({ stream, connect() {}, disconnect() {} });

  const track = (label) => {
    const t = Object.assign(new EventTarget(), { readyState: 'live', muted: false, label, kind: 'audio' });
    t.stop = () => { t.readyState = 'ended'; };                       // (stop() fires no 'ended', as in the spec)
    t.end = () => { t.readyState = 'ended'; t.dispatchEvent(T('ended')); };
    t.setMuted = (m) => { t.muted = m; t.dispatchEvent(T(m ? 'mute' : 'unmute')); };
    return t;
  };
  const navigatorFake = {
    userAgent: ua, platform, maxTouchPoints: touchPoints, standalone,
    mediaDevices: {
      getUserMedia(constraints) {
        world.log.push({ call: 'getUserMedia', constraints, gesture: world.gesture, acState: ac.state });
        if (world.micMode === 'hang') return new Promise(() => {});
        const bad = world.micMode !== 'allow' ? world.micMode : world.micNeedsGesture && !world.gesture ? 'NotAllowedError' : null;
        if (bad) return Promise.reject(Object.assign(new Error('x'), { name: bad }));
        const t = track('Fake Microphone');
        const s = { getAudioTracks: () => [t], getTracks: () => [t], track: t };
        world.streams.push(s);
        return Promise.resolve(s);
      },
      async enumerateDevices() { world.log.push({ call: 'enumerateDevices' }); return [{ kind: 'audioinput', deviceId: 'abc123456', label: 'Fake Microphone' }]; },
    },
  };
  world.navigator = navigatorFake;
  world.noMediaDevices = () => { navigatorFake.mediaDevices = undefined; };

  // ---- the app's own pieces the code leans on
  const state = { source: null, stream: null, node: null, label: '' };
  const els = new Map();
  const el = (id) => els.get(id) || els.set(id, { id, hidden: true, innerHTML: '', textContent: '', children: [], append(c) { this.children.push(c); }, showModal() { this.shown = true; }, close() { this.shown = false; } }).get(id);
  const env = {
    window: { isSecureContext: secure }, navigator: navigatorFake, document: documentEl,
    addEventListener: (...a) => windowEl.addEventListener(...a), removeEventListener: (...a) => windowEl.removeEventListener(...a),
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, setInterval: clock.setInterval,
    ac, state, $: el, Float32Array,
    fast: { fftSize: 1024, getFloatTimeDomainData(a) { for (let i = 0; i < a.length; i++) a[i] = world.signal === 'zeros' ? 0 : Math.sin(i / 7) * 0.3; } },
    attach(node, source, label) { world.log.push({ call: 'attach', source, label }); state.node = node; state.source = source; state.label = label; el('menu').hidden = true; },
    detach() { state.stream?.getTracks().forEach((t) => t.stop()); state.node = state.stream = null; },
    showNotice(text, file, keep) { world.notices.push({ text, keep }); world.noticeUp = true; },
    hideNotice() { world.noticeUp = false; },
    showError(e) { world.errors = [...(world.errors || []), String(e?.message || e)]; },
    flashStatus(t) { world.status.push(t); },
  };
  world.env = env; world.ac = ac; world.state = state; world.clock = clock; world.track = track; world.el = el;
  return world;
}

// Runs the cut-out code in that world; returns what it defines.
export function load(appSource, world) {
  const names = Object.keys(world.env);
  const body = `${cutOut(appSource)}\nreturn { onIOS, iosBrowser, micTrouble, chooseInput, useInput, revive, reviveAudio, waitForTap, resumeAudio };`;
  const make = new Function(...names, body);
  return make(...names.map((n) => world.env[n]));
}
