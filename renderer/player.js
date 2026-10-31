// The player bar: a slim strip along the bottom with the source and the song at its left, a transport with only the
// buttons the source can really do, a progress bar where the position is known, and a status line from the engine
// (tempo, key, and the bar and beat as Toaster counts them). What each source gets, the times and the status line are
// plain functions; the bar itself is built through a few DOM calls only (createElement, append, addEventListener,
// dataset, hidden, textContent, setAttribute, style), so tools/player-bar.test.mjs runs it on a stand-in page.
// app.js hands it what's playing every so often (update) and what a button does where only the app can say (act);
// it keeps no timers of its own. The system's own player is reached through window.nc (main.js, helpers/player.cjs).

// What the chip says for each source (SOURCE_KINDS in app.js says the same, bar the radio's "stream").
export const CHIPS = { system: 'system', file: 'file', input: 'mic', tab: 'tab', demo: 'demo', radio: 'radio' };
export const chipOf = (source) => CHIPS[source] || 'idle';

// The settings, as they were saved: the bar is on unless it was saved off, and out of recordings unless saved in (an
// older Toaster saved neither).
export const readPlayerBar = (saved) => saved !== false;
export const readPlayerRec = (saved) => saved === true;

// The Mac's players AppleScript can talk to, by the name the now-playing helper gives the app: 'music', 'spotify', or null.
export function macPlayerOf(app) {
  const name = String(app || '').trim().toLowerCase();
  return name === 'music' ? 'music' : name === 'spotify' ? 'spotify' : null;
}
export const PLAYER_NAMES = { music: 'Music', spotify: 'Spotify', keys: 'the media keys' };

// What the bar shows for a source, and never a control that does nothing: its buttons in order ('prev', 'play', 'next'),
// who the system's buttons talk to ('music' or 'spotify' on a Mac, 'keys' on Windows), what the progress bar is ('file':
// it seeks; 'player': it only shows how far Music or Spotify is) and whether a click on it seeks.
//   file          prev (restarts it), play and pause, seek; next only where there's a queue to go on to
//   radio, demo   play and stop (stopped, the source is let go and play brings it back: source is null, stopped says which)
//   mic, tab      none
//   system        a Mac with Music or Spotify as the player: prev, play, next and where it is; Windows with a song
//                 reported: the same through the media keys, with no position; any other player, or the web: none
export function controlsFor({ source, stopped = null, platform = 'web', app = '', session = false, bridge = false, denied = false, queue = false }) {
  const none = { buttons: [], player: null, progress: null, seek: false };
  if (!source) return stopped === 'radio' || stopped === 'demo' ? { ...none, buttons: ['play'] } : none;
  if (source === 'file') return { buttons: queue ? ['prev', 'play', 'next'] : ['prev', 'play'], player: null, progress: 'file', seek: true };
  if (source === 'radio' || source === 'demo') return { ...none, buttons: ['play'] };
  if (source !== 'system' || !bridge || denied) return none;
  const all = ['prev', 'play', 'next'];
  if (platform === 'darwin') {
    const player = macPlayerOf(app);
    return player ? { buttons: all, player, progress: 'player', seek: false } : none;
  }
  return platform === 'win32' && session ? { buttons: all, player: 'keys', progress: null, seek: false } : none;
}

// 3:05, or 1:02:03 for an hour and over; -:-- where it isn't known
export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '-:--';
  const s = Math.floor(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), two = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

// The song's names for the bar's left: its title and artist, without the "File" a file's song carries in an artist's
// place; idle is what's said, dim, when there is no song (an input's name, the radio's address, "stopped")
export function songLine(song, source, label, stopped = null) {
  if (song?.title) return { title: song.title, artist: source === 'file' && song.artist === 'File' ? '' : song.artist || '', idle: '' };
  return { title: '', artist: '', idle: source === 'system' ? 'listening' : source ? label || '' : stopped ? 'stopped' : '' };
}

// The bar and beat time falls in, from the engine's placeAt (a bar, a step of its 16 and how far off that step it is):
// 1-based like the grid's own "bar", and counted the way the beat is, so the beat changes when it comes round, not when
// it's within half a step of it. Null where the beat isn't known, or before the first bar.
export function placeOf(at) {
  if (!at || !Number.isFinite(at.bar) || !Number.isFinite(at.step)) return null;
  const pos = at.bar * 16 + at.step + (at.off || 0), bar = Math.floor(pos / 16);
  return bar < 0 ? null : { bar: bar + 1, beat: Math.floor((pos - bar * 16) / 4) + 1 };
}

// 124 bpm · F# minor · bar 013.2 · system: dashes until the tempo has locked (the key and the bar go with it)
export function statusText({ locked = false, bpm = 0, key = '', at = null, source = '' }) {
  const place = locked ? placeOf(at) : null;
  return [`${locked && bpm ? bpm : '---'} bpm`, locked && key ? key : '---', `bar ${place ? `${String(place.bar).padStart(3, '0')}.${place.beat}` : '---.-'}`, source].join(' · ');
}

// Where a click or a drag at x lands on the bar's track (rect: its box), in seconds of a duration
export function seekTime(x, rect, duration) {
  return Math.min(1, Math.max(0, (x - rect.left) / (rect.width || 1))) * duration;
}

const ICONS = {
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h2v11H3zM13.5 2.5v11L6 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 2.5h2v11h-2zM2.5 2.5v11L10 8z"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2v12l10-6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.5v11H3.5zM9 2.5h3.5v11H9z"/></svg>',
  stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h9v9h-9z"/></svg>',
};
const SYSTEM_ACTION = { prev: 'previous', play: 'playpause', next: 'next' };
const POLL_EVERY = 2; // seconds between asking Music or Spotify where it is (between, the bar counts on by itself)
const POLL_REFUSED = 60; // ... and between asking one that macOS wouldn't let Toaster ask, in case that's been changed since
const SEEK_KEY = 5; // seconds an arrow key moves the position

// root: the bar's element (#player). nc: the page's bridge to the main process (window.nc), where there is one; platform:
// its platform ('darwin', 'win32', or 'web'). act, what only the app can do: restart() and seek(seconds) for a file,
// stop() and start(kind) for the radio and the demo, next() where there's a queue, fail(err) and note(text).
export function createPlayerBar({ document: doc, root, nc = null, platform = 'web', act = {}, window: win = globalThis }) {
  const bridge = !!nc && typeof nc.playerCommand === 'function';
  const el = (tag, cls, ...kids) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (kids.length) e.append(...kids);
    return e;
  };
  const setText = (e, text) => { if (e.textContent !== text) e.textContent = text; };
  const setHidden = (e, hidden) => { if (e.hidden !== hidden) e.hidden = hidden; };
  const setAttr = (e, name, value) => { if (e.getAttribute(name) !== String(value)) e.setAttribute(name, String(value)); };
  const setData = (e, name, value) => { if (e.dataset[name] !== value) e.dataset[name] = value; };

  const chip = el('span', 'pl-chip'), title = el('b', 'pl-title'), artist = el('span', 'pl-artist'), idle = el('span', 'pl-idle');
  const song = el('span', 'pl-song', title, artist, idle);
  const buttons = {};
  for (const kind of ['prev', 'play', 'next']) {
    const b = el('button', `pl-btn pl-${kind}`);
    b.type = 'button';
    b.dataset.kind = kind;
    // (a click leaves no focus on the button: it would keep the bar up in Z's visualizer mode, as the next key would make it a keyboard's focus; Enter and Space keep theirs)
    b.addEventListener('click', (e) => { press(kind); if (e.detail) b.blur?.(); });
    buttons[kind] = b;
  }
  const transport = el('div', 'pl-transport', buttons.prev, buttons.play, buttons.next);
  const pos = el('span', 'pl-time pl-pos'), len = el('span', 'pl-time pl-len'), fill = el('i', 'pl-fill');
  const track = el('div', 'pl-track', fill);
  track.tabIndex = 0;
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-label', 'position');
  const progress = el('div', 'pl-progress', pos, track, len);
  const status = el('div', 'pl-status');
  root.append(el('div', 'pl-id', chip, song), transport, progress, status);

  let last = null; // the latest snapshot (update)
  let ctl = controlsFor({}); // and what it gets
  let polled = null, polledKey = '', askedAt = -Infinity, asking = false; // Music's or Spotify's last answer, the song it was for, when it was asked
  const refused = new Set(); // the players macOS wouldn't let Toaster ask
  let hold = null; // a play or pause just pressed on the system's player, shown till its own answer comes: { playing, until }
  let dragging = null; // a drag on the track: { to }, the second it would seek to
  const iconOf = new Map();

  // how far into the song, and how long it is (seconds), or null where there's no telling
  function where(t) {
    if (ctl.progress === 'file') {
      const e = last.el;
      return e && Number.isFinite(e.duration) && e.duration > 0 ? [Math.min(e.currentTime || 0, e.duration), e.duration] : null;
    }
    if (ctl.progress === 'player' && polled && polled.duration > 0) {
      return [Math.min(polled.duration, polled.position + (polled.playing ? Math.max(0, t - polled.at) : 0)), polled.duration];
    }
    return null;
  }
  // whether what's behind the play button is playing, which is what its icon says (a pause to press, or a stop)
  function playing(s) {
    if (s.source === 'file') return !!s.el && !s.el.paused;
    if (s.source === 'radio' || s.source === 'demo') return true;
    if (s.source !== 'system') return false;
    if (hold && s.t < hold.until) return hold.playing;
    return polled ? polled.playing : !!s.systemPlaying;
  }
  const playIcon = (s) => (!s.source ? 'play' : s.source === 'radio' || s.source === 'demo' ? 'stop' : playing(s) ? 'pause' : 'play');
  const labelOf = (kind, s) => (kind === 'play' ? playIcon(s) : kind === 'prev' && s.source === 'file' ? 'restart' : kind === 'prev' ? 'previous' : 'next');

  function paintProgress(there) {
    setHidden(progress, !there);
    if (!there) return;
    const [at, total] = there, shownAt = dragging ? dragging.to : at;
    setText(pos, fmtTime(shownAt));
    setText(len, fmtTime(total));
    const width = `${(Math.min(1, shownAt / total) * 100).toFixed(2)}%`;
    if (fill.style.width !== width) fill.style.width = width;
    setAttr(track, 'aria-valuemin', 0);
    setAttr(track, 'aria-valuemax', Math.round(total));
    setAttr(track, 'aria-valuenow', Math.round(shownAt));
    setAttr(track, 'aria-valuetext', `${fmtTime(shownAt)} of ${fmtTime(total)}`);
    track.classList.toggle('seek', ctl.seek);
  }

  function update(s) {
    last = s;
    const who = platform === 'darwin' ? macPlayerOf(s.app) : platform === 'win32' && s.session ? 'keys' : null;
    ctl = controlsFor({ source: s.source, stopped: s.stopped, platform, app: s.app, session: !!s.session, bridge, denied: !!who && refused.has(who), queue: typeof act.next === 'function' });
    // Music's or Spotify's own answer: asked every couple of seconds while the bar is up (it counts on by itself in between),
    // and at once for a new song. One macOS won't let Toaster ask is asked once a minute, in case that's been changed.
    const asked = who === 'music' || who === 'spotify' ? s.source === 'system' && bridge : false;
    const key = asked ? `${who}|${s.song?.title}|${s.song?.artist}` : '';
    if (key !== polledKey) { polledKey = key; polled = null; askedAt = -Infinity; }
    if (asked && s.active && !asking && s.t - askedAt >= (refused.has(who) ? POLL_REFUSED : POLL_EVERY)) ask(who, s.t);

    setData(root, 'source', chipOf(s.source || s.stopped));
    setText(chip, chipOf(s.source || s.stopped));
    chip.classList.toggle('off', !s.source);
    const line = songLine(s.song, s.source, s.label, s.stopped);
    setText(title, line.title);
    setText(artist, line.artist ? ` · ${line.artist}` : '');
    setText(idle, line.idle);
    song.title = line.title ? `${line.title}${line.artist ? ' · ' + line.artist : ''}` : '';

    setHidden(transport, !ctl.buttons.length);
    for (const kind of ['prev', 'play', 'next']) {
      const b = buttons[kind], shown = ctl.buttons.includes(kind);
      setHidden(b, !shown);
      if (!shown) continue;
      const icon = kind === 'play' ? playIcon(s) : kind, label = labelOf(kind, s);
      if (iconOf.get(kind) !== icon) { iconOf.set(kind, icon); b.innerHTML = ICONS[icon]; }
      setData(b, 'state', icon);
      setAttr(b, 'aria-label', label);
      if (b.title !== label) b.title = label;
    }
    paintProgress(where(s.t));

    setText(status, statusText({
      locked: !!s.source && !!s.tempo?.locked, bpm: s.tempo?.shown, key: s.key, at: s.at, source: s.source ? chipOf(s.source) : s.stopped ? 'stopped' : 'no source',
    }));
  }

  function ask(who, t) {
    asking = true;
    askedAt = t;
    Promise.resolve(nc.playerPosition?.(who)).then((r) => {
      if (macPlayerOf(last?.app) !== who) return; // (another player by the time it answered)
      if (r?.ok) { polled = { position: r.position, duration: r.duration, playing: r.playing, at: last.t }; refused.delete(who); }
      else { polled = null; if (r?.why === 'denied') refuse(who); }
    }).catch(() => { polled = null; }).finally(() => { asking = false; });
  }
  // macOS said no: the buttons go (they'd do nothing), with a note, once, on what to change
  function refuse(who) {
    if (refused.has(who)) return;
    refused.add(who);
    act.note?.(`macOS did not let Toaster talk to ${PLAYER_NAMES[who]}, so the player bar has no buttons for it. To allow it: System Settings, Privacy & Security, Automation, then Toaster (Electron, if this copy is running from source) and ${PLAYER_NAMES[who]}.`);
  }

  async function sendToSystem(kind) {
    const who = ctl.player, s = last;
    if (!who || !bridge) return;
    if (kind === 'play') hold = { playing: !playing(s), until: s.t + 2 };
    const r = await nc.playerCommand(who, SYSTEM_ACTION[kind]);
    askedAt = -Infinity; // (where it is now, asked at the next update)
    if (r?.ok) return;
    hold = null;
    if (r?.why === 'denied') refuse(who);
    else act.note?.(who === 'keys' ? 'Windows did not take the media key.' : `${PLAYER_NAMES[who]} did not answer.`);
  }

  function press(kind) {
    const s = last;
    if (!s || !ctl.buttons.includes(kind)) return;
    try {
      if (s.source === 'file') {
        if (kind === 'play') Promise.resolve(s.el.paused ? s.el.play() : s.el.pause()).catch((err) => act.fail?.(err));
        else if (kind === 'prev') act.restart?.();
        else act.next?.();
      } else if (s.source === 'radio' || s.source === 'demo') act.stop?.();
      else if (!s.source) act.start?.(s.stopped);
      else if (s.source === 'system') sendToSystem(kind).catch((err) => act.fail?.(err));
    } catch (err) { act.fail?.(err); }
  }

  // the progress bar's track: a click or a drag seeks (a file only, and the drag is shown as it goes, seeking when it's let go),
  // and so do the arrow keys with the track focused
  const length = () => where(last.t)?.[1] || 0;
  const target = (e) => seekTime(e.clientX, track.getBoundingClientRect(), length());
  track.addEventListener('pointerdown', (e) => {
    if (!last || !ctl.seek || !length()) return;
    track.setPointerCapture?.(e.pointerId);
    dragging = { to: target(e) };
    paintProgress(where(last.t));
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragging.to = target(e);
    paintProgress(where(last.t));
  });
  track.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    const to = target(e);
    dragging = null;
    act.seek?.(to);
    paintProgress(where(last.t));
    track.blur?.(); // (the arrow keys are for one that was tabbed to)
  });
  track.addEventListener('pointercancel', () => { dragging = null; track.blur?.(); if (last) paintProgress(where(last.t)); });
  track.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' ? SEEK_KEY : e.key === 'ArrowLeft' ? -SEEK_KEY : 0;
    if (!step || !last || !ctl.seek || !length()) return;
    e.preventDefault?.();
    act.seek?.(Math.min(length(), Math.max(0, where(last.t)[0] + step)));
  });

  // the room the bar takes at the bottom of the window just now, from the window's edge up to the bar's top (the footer's strip
  // included: the bar sits above it), for the code's roll to keep clear of; none while it's away (--player-h is 0 then)
  const reserved = () => {
    const h = Number.parseFloat(win.getComputedStyle?.(doc.body)?.getPropertyValue('--player-h'));
    return h > 0 ? Math.max(0, (win.innerHeight || 0) - root.getBoundingClientRect().top) : 0;
  };

  update({ t: 0, source: null, stopped: null, label: '', song: null });
  return { update, reserved, get controls() { return ctl; } };
}
