// What the microphone and sound-revival code in renderer/app.js has to do, one scenario at a time, against
// the stand-in world of ios-mic-harness.mjs. Plain checks (no node:assert), so the same list also runs
// inside a browser page (see the report: WebKit).
import { makeWorld, load } from './ios-mic-harness.mjs';

export const IPAD_CHROME = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
export const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const ok = (c, m) => { if (!c) throw new Error('failed: ' + m); };
const eq = (a, b, m) => { if (a !== b) throw new Error(`failed: ${m} (got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)})`); };
const has = (s, part, m) => { if (!String(s).includes(part)) throw new Error(`failed: ${m} (got ${JSON.stringify(s)}, wanted it to contain ${JSON.stringify(part)})`); };
const calls = (w, name) => w.log.filter((l) => l.call === name);
const rejects = async (p) => { try { await p; } catch (e) { return e; } throw new Error('failed: it should have been refused'); };

export function scenarios(appSource, opts = {}) {
  const ipad = (extra = {}) => { const w = makeWorld({ ua: IPAD_CHROME, platform: 'iPad', touchPoints: 5, ...opts, ...extra }); return [w, load(appSource, w)]; };
  const desktop = (extra = {}) => { const w = makeWorld({ ...opts, ...extra }); return [w, load(appSource, w)]; };
  // a microphone playing on an iPad, the way the tap leaves it
  const playing = async () => {
    const [w, app] = ipad();
    w.gesture = true; const p = app.chooseInput(); w.gesture = false; await p;
    return [w, app];
  };
  const S = [];
  const add = (name, fn) => S.push({ name, run: fn });

  // ---------------------------------------------------------------- telling an iPad from the rest
  add('iOS is told by the iPhone/iPad user agent, or a Mac that has a touch screen', async () => {
    eq(ipad()[1].onIOS(), true, 'iPad Chrome');
    eq(desktop({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 5 })[1].onIOS(), true, 'iPad asking for the desktop site');
    eq(desktop({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 0 })[1].onIOS(), false, 'a Mac');
    eq(desktop()[1].onIOS(), false, 'Windows');
    eq(desktop({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/130', platform: 'iPhone', touchPoints: 5 })[1].iosBrowser(), 'Firefox', 'iPhone Firefox');
    eq(ipad()[1].iosBrowser(), 'Chrome', 'iPad Chrome');
    eq(desktop({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 5 })[1].iosBrowser(), 'Safari', 'iPad Safari');
  });

  // ---------------------------------------------------------------- the iOS path: one request, in the tap
  add('iOS, allowed: one request for the default microphone, made inside the tap, no list, no wait before it', async () => {
    const [w, app] = ipad();
    w.gesture = true;
    const p = app.chooseInput();
    // (nothing has been awaited yet: if the request is already logged, it was made in the tap)
    eq(calls(w, 'getUserMedia').length, 1, 'requests made synchronously');
    eq(calls(w, 'getUserMedia')[0].gesture, true, 'the request is in the tap');
    eq(calls(w, 'resume')[0]?.gesture, true, 'resume is in the tap too');
    w.gesture = false;
    await p;
    const c = calls(w, 'getUserMedia')[0].constraints.audio;
    ok(!('deviceId' in c), 'no device named: the default one');
    eq(c.echoCancellation, false, 'raw audio asked for');
    eq(calls(w, 'getUserMedia').length, 1, 'one request in all');
    eq(calls(w, 'enumerateDevices').length, 0, 'no listing of devices');
    ok(!w.el('devices').shown, 'no picker');
    eq(w.state.source, 'input', 'listening');
    eq(w.state.label, 'Fake Microphone', 'named by the microphone the browser gave');
    eq(w.ac.state, 'running', 'sound running');
    eq(w.noticeUp, undefined, 'no note');
  });
  add('iOS, refused (Chrome): says how to allow it in Settings; nothing is left half-open', async () => {
    const [w, app] = ipad();
    w.micMode = 'NotAllowedError';
    const e = await rejects(app.chooseInput());
    has(e.message, 'Settings', 'points at Settings');
    has(e.message, 'Chrome', 'names the browser');
    has(e.message, 'Microphone', 'names the switch');
    eq(calls(w, 'getUserMedia').length, 1, 'asked once');
    eq(w.state.source, null, 'nothing attached');
  });
  add('iOS, refused (Safari on an iPad asking for the desktop site): names Safari and its aA menu', async () => {
    const [w, app] = desktop({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 5 });
    w.micMode = 'NotAllowedError';
    const e = await rejects(app.chooseInput());
    has(e.message, 'Safari', 'names the browser');
    has(e.message, 'aA', 'the per-site menu');
  });
  add('iOS, refused from the home screen: says to use Safari', async () => {
    const [w, app] = ipad({ standalone: true });
    w.micMode = 'NotAllowedError';
    has((await rejects(app.chooseInput())).message, 'Safari', 'home screen advice');
  });
  add('no microphone: says so, on iOS and elsewhere', async () => {
    for (const [w, app] of [ipad(), desktop()]) {
      w.micMode = 'NotFoundError';
      has((await rejects(app.chooseInput())).message, 'No microphone found', 'no device');
    }
  });
  add('microphone busy: says so', async () => {
    const [w, app] = ipad();
    w.micMode = 'NotReadableError';
    has((await rejects(app.chooseInput())).message, 'Another app', 'busy');
  });
  add('page not secure (or no mediaDevices at all): says so, on iOS and elsewhere', async () => {
    for (const mk of [() => ipad({ secure: false }), () => desktop({ secure: false })]) {
      const [w, app] = mk();
      w.micMode = 'NotAllowedError';
      has((await rejects(app.chooseInput())).message, 'secure', 'insecure');
    }
    const [w, app] = ipad();
    w.noMediaDevices();
    has((await rejects(app.chooseInput())).message, 'secure', 'no mediaDevices');
  });

  // ---------------------------------------------------------------- the desktop path stays as it was
  add('desktop: probe, list the inputs, let go of the probe, show the picker; picking one opens exactly that', async () => {
    const [w, app] = desktop();
    await app.chooseInput();
    const gum = calls(w, 'getUserMedia');
    eq(gum.length, 1, 'one probe');
    eq(gum[0].constraints.audio, true, 'probe asks for plain audio');
    eq(calls(w, 'enumerateDevices').length, 1, 'inputs listed');
    eq(w.streams[0].track.readyState, 'ended', 'probe let go');
    ok(w.el('devices').shown, 'picker shown');
    eq(w.state.source, null, 'nothing attached before a pick');
    const list = w.el('device-list');
    eq(list.children.length, 1, 'one button');
    list.children[0].onclick();
    await w.clock.advance(10);
    eq(calls(w, 'getUserMedia')[1].constraints.audio.deviceId.exact, 'abc123456', 'that device, exactly');
    eq(w.state.source, 'input', 'listening');
  });
  add('desktop, refused: the same words as before', async () => {
    const [w, app] = desktop();
    w.micMode = 'NotAllowedError';
    eq((await rejects(app.chooseInput())).message, 'Allow microphone access so the inputs can be listed.', 'message');
  });

  // ---------------------------------------------------------------- the sound comes back
  add('revive: an interruption while the page is showing brings the sound back by itself', async () => {
    const [w] = await playing();
    w.ac.setState('interrupted');
    await w.clock.advance(50);
    eq(w.ac.state, 'running', 'running again');
    eq(w.noticeUp, undefined, 'no note needed');
  });
  add("revive: when iOS won't resume without a tap, a note asks for one, and the tap (resume started inside it) does it", async () => {
    for (const mode of ['needsTap-pending', 'needsTap-reject']) {
      const [w] = await playing();
      w.resumeMode = mode;
      w.ac.setState('suspended');
      await w.clock.advance(3500);
      eq(w.noticeUp, true, `${mode}: the note is up`);
      has(w.notices.at(-1).text, 'tap', `${mode}: the note says tap`);
      eq(w.notices.at(-1).keep, true, `${mode}: and stays`);
      w.tap();
      const last = calls(w, 'resume').at(-1);
      eq(last.gesture, true, `${mode}: resume was called inside the tap`);
      await w.clock.advance(50);
      eq(w.ac.state, 'running', `${mode}: running`);
      eq(w.noticeUp, false, `${mode}: note gone`);
      eq(w.status.at(-1), 'back on', `${mode}: said so`);
      const n = calls(w, 'resume').length;
      w.tap(); await w.clock.advance(50);
      eq(calls(w, 'resume').length, n, `${mode}: later taps are left alone`);
    }
  });
  add('revive: a resume() that never settles does not block the next try', async () => {
    const [w] = await playing();
    w.resumeMode = 'hang';
    w.ac.setState('interrupted');
    await w.clock.advance(3500);
    eq(w.noticeUp, true, 'gave up waiting and asked for a tap');
    w.resumeMode = 'ok';
    w.setHidden(true); w.setHidden(false);
    await w.clock.advance(50);
    eq(w.ac.state, 'running', 'the next try went through');
    eq(w.noticeUp, false, 'and the note went');
  });
  add('revive: the screen locking leaves it alone; coming back revives', async () => {
    const [w] = await playing();
    w.setHidden(true);
    w.ac.setState('interrupted');
    await w.clock.advance(5000);
    eq(w.noticeUp, undefined, 'no note while hidden');
    const before = calls(w, 'resume').length;
    w.setHidden(false);
    await w.clock.advance(50);
    ok(calls(w, 'resume').length > before, 'resume on coming back');
    eq(w.ac.state, 'running', 'running');
  });
  add("revive: iOS resuming by itself clears the note", async () => {
    const [w] = await playing();
    w.resumeMode = 'needsTap-pending';
    w.ac.setState('suspended');
    await w.clock.advance(3500);
    eq(w.noticeUp, true, 'note up');
    w.ac.setState('running');
    await w.clock.advance(50);
    eq(w.noticeUp, false, 'note gone');
  });
  add('mic: a track that ended is opened again (the same default microphone)', async () => {
    const [w] = await playing();
    w.streams[0].track.end();
    await w.clock.advance(50);
    eq(calls(w, 'getUserMedia').length, 2, 'asked again');
    ok(!('deviceId' in calls(w, 'getUserMedia')[1].constraints.audio), 'still the default one');
    eq(w.state.stream, w.streams[1], 'the new stream is the one in use');
  });
  add('mic: ended while hidden waits for the page to come back', async () => {
    const [w] = await playing();
    w.setHidden(true);
    w.streams[0].track.end();
    await w.clock.advance(5000);
    eq(calls(w, 'getUserMedia').length, 1, 'nothing asked in the background');
    eq(w.noticeUp, undefined, 'no note in the background');
    w.setHidden(false);
    await w.clock.advance(50);
    eq(calls(w, 'getUserMedia').length, 2, 'asked on coming back');
    eq(w.noticeUp, undefined, 'no note');
  });
  add('mic: muted for good is opened again after 1.5 s; muted briefly is not', async () => {
    let [w] = await playing();
    w.streams[0].track.setMuted(true);
    await w.clock.advance(1000);
    w.streams[0].track.setMuted(false);
    await w.clock.advance(3000);
    eq(calls(w, 'getUserMedia').length, 1, 'a blip: left alone');
    [w] = await playing();
    w.streams[0].track.setMuted(true);
    await w.clock.advance(1400);
    eq(calls(w, 'getUserMedia').length, 1, 'not yet');
    await w.clock.advance(1500);
    eq(calls(w, 'getUserMedia').length, 2, 'opened again');
  });
  add('mic: still muted on coming back, but unmuting within a second: not opened again', async () => {
    const [w] = await playing();
    w.setHidden(true);
    w.streams[0].track.setMuted(true);
    await w.clock.advance(3000);
    w.setHidden(false);
    await w.clock.advance(400);
    w.streams[0].track.setMuted(false);
    await w.clock.advance(3000);
    eq(calls(w, 'getUserMedia').length, 1, 'no second request');
    eq(w.noticeUp, undefined, 'no note');
  });
  add('mic: exact zeros for 4 s opens it again once, and not again while it stays silent', async () => {
    const [w] = await playing();
    w.signal = 'zeros';
    await w.clock.advance(3500);
    eq(calls(w, 'getUserMedia').length, 1, 'not yet');
    await w.clock.advance(1500);
    eq(calls(w, 'getUserMedia').length, 2, 'opened again');
    await w.clock.advance(30000);
    eq(calls(w, 'getUserMedia').length, 2, 'and left alone after that, however long the silence');
    w.signal = 'tone'; await w.clock.advance(2000);
    w.signal = 'zeros'; await w.clock.advance(6000);
    eq(calls(w, 'getUserMedia').length, 3, 'a new silence after sound counts again');
  });
  add('mic: a reopen that is refused leaves a note, and a later success takes it away', async () => {
    const [w] = await playing();
    w.streams[0].track.end();
    w.micMode = 'NotAllowedError';
    await w.clock.advance(50);
    eq(w.noticeUp, true, 'note up');
    w.micMode = 'allow';
    w.setHidden(true); w.setHidden(false);
    await w.clock.advance(50);
    eq(w.noticeUp, false, 'note gone');
    eq(w.state.stream, w.streams.at(-1), 'a live stream in use');
    const n = calls(w, 'resume').length + calls(w, 'getUserMedia').length;
    w.tap(); await w.clock.advance(50);
    eq(calls(w, 'resume').length + calls(w, 'getUserMedia').length, n, 'a tap now does nothing');
  });
  add('mic: a tap that cannot start the sound leaves a note rather than silence', async () => {
    const [w, app] = ipad();
    w.resumeMode = 'hang';
    w.gesture = true; const p = app.chooseInput(); w.gesture = false;
    await w.clock.advance(3500);
    await p;
    eq(w.state.source, 'input', 'the microphone is attached');
    eq(w.noticeUp, true, 'and a note asks for a tap');
  });
  add('nothing playing: nothing is revived', async () => {
    const [w, app] = ipad();
    w.ac.setState('running'); w.ac.setState('suspended');
    w.setHidden(true); w.setHidden(false);
    await w.clock.advance(5000);
    eq(w.log.length, 0, 'no request of any kind');
    eq(await app.reviveAudio(), true, 'and reviving is a success');
  });
  return S;
}
