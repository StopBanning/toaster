// Drop clips (J): while they're on, the window is recorded the whole time in overlapping stretches,
// a new one every 10 seconds, each let go at 16 seconds old. When a drop hits, the stretch that
// started 6 to 16 seconds before it carries on 10 seconds past it and is saved as a video of its
// own: the build-up and the drop, ready to post. Every stretch is a recording from its first
// frame, so each clip is an ordinary MP4 (nothing cut or stitched), and no more than two are
// being recorded at once. Same picture and sound as M (the window as it looks, the music the app
// hears, held back to line up), into Videos\Toaster. Off, nothing runs; a clip being finished
// when they're turned off (or started again, for a new window shape) still finishes.
const EVERY = 10000, PRE = 6000, LONGEST = 16000, AFTER = 10000;

// deps: { ac, types (formats to try, best first), stream() (the window's picture, a MediaStream),
// node() (the audio node playing now), delay() (how far to hold the sound back, seconds),
// save(buffer, ext) (writes the clip, returns its path), said(text, file) (a note for the user) }
export function createClips(deps) {
  let on = false, source = null, timer = 0, type = '';
  const stretches = []; // { mr, chunks, at (ms), kept, source }

  // What's recorded from: the window's picture and the app's sound (held back like a recording's,
  // into a stream the recorders can take). Let go once nothing records from it any more.
  async function open() {
    const video = await deps.stream();
    const dest = deps.ac.createMediaStreamDestination(), delay = deps.ac.createDelay(1);
    delay.connect(dest);
    return { video, dest, delay, node: null };
  }
  function letGo(src) {
    if (!src || (on && src === source) || stretches.some((st) => st.source === src)) return;
    src.video.getTracks().forEach((t) => t.stop());
    try { src.node?.disconnect(src.delay); } catch { /* gone */ }
    src.delay.disconnect();
  }
  function retap() {
    if (!source) return;
    const node = deps.node();
    if (source.node === node) return;
    try { source.node?.disconnect(source.delay); } catch { /* gone */ }
    source.node = node;
    source.delay.delayTime.value = deps.delay();
    node?.connect(source.delay);
  }

  function startStretch() {
    const src = source;
    const mr = new MediaRecorder(new MediaStream([...src.video.getVideoTracks(), ...src.dest.stream.getAudioTracks()]), { mimeType: type, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 });
    const st = { mr, type, chunks: [], at: performance.now(), kept: false, source: src };
    mr.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
    mr.start(1000);
    stretches.push(st);
  }
  const forget = (st) => { const i = stretches.indexOf(st); if (i >= 0) stretches.splice(i, 1); };
  // a new stretch every 10 seconds; the ones no clip could want any more let go
  function roll() {
    const now = performance.now();
    for (const st of stretches.filter((s) => !s.kept && now - s.at >= LONGEST)) { st.mr.stop(); forget(st); }
    startStretch();
  }

  async function start() {
    type = deps.types.find((m) => MediaRecorder.isTypeSupported(m));
    if (!type) throw new Error('no video format to record in');
    source = await open();
    try {
      on = true;
      retap();
      startStretch();
      timer = setInterval(roll, EVERY);
    } catch (err) {
      // half started: let go of all of it
      on = false;
      clearInterval(timer);
      for (const st of stretches.filter((s) => !s.kept)) { try { st.mr.stop(); } catch { /* never started */ } forget(st); }
      letGo(source);
      source = null;
      throw err;
    }
  }
  // While the capture is still opening, another press waits for it rather than opening a second
  // (two would each take a capture and a timer, and stopping would let go of only one).
  let starting = null;
  function stop() {
    on = false;
    clearInterval(timer);
    for (const st of stretches.filter((s) => !s.kept)) { st.mr.stop(); forget(st); }
    const src = source;
    source = null;
    letGo(src); // (not while a clip from it is still being finished)
  }

  return {
    get on() { return on; },
    async toggle() {
      if (starting) { await starting.catch(() => {}); return on; }
      if (on) stop();
      else {
        starting = start();
        try { await starting; } finally { starting = null; }
      }
      return on;
    },
    retap,
    // A drop: the stretch that started 6 to 16 seconds ago (or the oldest, just after turning on)
    // runs on 10 seconds more and is saved.
    drop() {
      if (!on) return false;
      const now = performance.now(), free = stretches.filter((s) => !s.kept);
      const st = free.filter((s) => now - s.at >= PRE).sort((a, b) => b.at - a.at)[0] || free.sort((a, b) => a.at - b.at)[0];
      if (!st) return false;
      st.kept = true;
      setTimeout(() => {
        st.mr.onstop = async () => {
          forget(st);
          letGo(st.source);
          try {
            const buf = await new Blob(st.chunks, { type: st.type }).arrayBuffer();
            const file = await deps.save(buf, st.type.startsWith('video/mp4') ? 'mp4' : 'webm');
            deps.said(`saved a drop clip: ${file.split(/[\\/]/).pop()}`, file);
          } catch (err) {
            deps.said('could not save the drop clip: ' + (err?.message || err));
          }
        };
        st.mr.stop();
      }, AFTER);
      return true;
    },
  };
}
