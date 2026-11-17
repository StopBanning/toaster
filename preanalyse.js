// Songs in the library listened to ahead of time (Nov 16), so the first play of one starts as a repeat does (song-memory.js): the engine, a second copy of it with a clock of its own,
// is run through the first 100 s of the file faster than real time on an OfflineAudioContext (the way tools/detbench does), and what it learned goes into the song memory.
// Never while anything is going on: only when `idle()` says so (nothing playing, no recording, no take, no scan, nothing else heavy), a pause the moment it stops saying so, a track
// given up after a minute of waiting (to come back to later); one track at a time, a few seconds between; the work is cut into small steps that give way to the page in between.
const SECONDS = 100, SR = 48000, STEP = 0.015;

// One file's bytes through the engine. gate(): a promise that resolves when it is fine to go on (the scheduler's: idle, or not); returns { snapshots, lockAt } or null (nothing heard, or given up)
export async function analyseBytes(bytes, { seconds = SECONDS, gate = async () => true } = {}) {
  const engine = await import('./engine.js?analysis');
  let now = 0;
  engine.useOwnTime(() => now);
  const probe = new OfflineAudioContext(1, 1, SR);
  const buffer = await probe.decodeAudioData(bytes.slice(0));
  const duration = Math.min(seconds, buffer.duration - 0.5);
  if (duration < 20) return null;
  const ac = new OfflineAudioContext(1, Math.ceil(duration * SR), SR);
  const fast = ac.createAnalyser(), mid = ac.createAnalyser(), slow = ac.createAnalyser();
  [fast, mid, slow].forEach((a, i) => { a.fftSize = [1024, 4096, 16384][i]; a.smoothingTimeConstant = 0; });
  const bus = ac.createGain(), sink = ac.createGain();
  bus.connect(fast); bus.connect(mid); bus.connect(slow);
  sink.gain.value = 0;
  for (const a of [fast, mid, slow]) a.connect(sink);
  sink.connect(ac.destination);
  const src = ac.createBufferSource(); src.buffer = buffer; src.connect(bus); src.start(0, 0, duration);
  const e = engine.createEngine({ fast, mid, slow, sampleRate: SR, ledger: null });
  e.reset({ top: true });
  e.resetAt = e.lastSound = 0;
  e.song = () => ({ known: true, playing: false });
  const snapshots = [];
  let render = null, snapAt = 0, lockAt = null, k = 0;
  for (let t = STEP; t < duration - 0.005; t += STEP) {
    const paused = ac.suspend(t);
    if (!render) render = ac.startRendering(); else await ac.resume();
    await paused;
    now = ac.currentTime;
    e.frame(now, now);
    if (lockAt === null && e.tempo.locked) lockAt = now;
    if (now - snapAt >= 10) { snapAt = now; const snap = e.songSnapshot(now); if (snap) snapshots.push(snap); }
    // (every ~1.5 s of song: let the page have its turn, and wait while it is not idle)
    if (++k % 100 === 0) { if ((await gate()) === false) { try { await ac.resume(); } catch { /* stopped */ } return { aborted: true }; } await new Promise((r) => setTimeout(r, 0)); }
  }
  try { await ac.resume(); await render; } catch { /* done */ }
  return { snapshots, lockAt };
}

// The scheduler. library(): the tracks [{ path, title, artist? }]; read(track): its File; keyOf(track): the song memory's key for it; memory: song-memory's; idle(): true while nothing is going on.
export function createPreanalysis({ library, read, keyOf, memory, idle, analyse = analyseBytes, onTrack = () => {}, between = 5000, patience = 60000 }) {
  const state = { running: false, done: 0, gaveUp: 0, current: null, stopped: false, log: [] };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function gate() {
    if (state.stopped) return false;
    const began = Date.now();
    while (!idle()) { if (state.stopped || Date.now() - began > patience) return false; await sleep(500); }
    return true;
  }
  async function loop() {
    state.running = true;
    try {
      for (;;) {
        if (state.stopped) return;
        while (!idle()) { if (state.stopped) return; await sleep(2000); }
        if (memory.room && !memory.room()) { state.full = true; await sleep(30000); continue; } // (the memory is full: reading more ahead would only push out what it holds, the songs heard first)
        state.full = false;
        const track = library().find((t) => { const key = keyOf(t); return key && !memory.prior(key) && !memory.tried(key); });
        if (!track) { await sleep(30000); continue; } // (all done for now: look again later, a scan may have found more)
        const key = keyOf(track);
        state.current = key;
        let result = null;
        try { const file = await read(track); result = await analyse(await file.arrayBuffer(), { gate }); } catch (err) { state.log.push(String(err?.message || err).slice(0, 120)); }
        state.current = null;
        if (result?.aborted) { await sleep(between * 6); continue; } // (it was not the song's fault: later)
        if (result?.snapshots?.length) { for (const sn of result.snapshots) memory.put(key, sn, { ahead: true }); state.done++; onTrack(key, result); }
        else { memory.markTried(key); state.gaveUp++; }   // (nothing to keep, or too long a wait: not again this time round)
        await sleep(between);
      }
    } finally { state.running = false; }
  }
  return { state, start() { if (!state.running) { state.stopped = false; loop(); } }, stop() { state.stopped = true; } };
}
