import { SPOTIFY_ICON, logoTone } from './spotify-brand.js';
// The player bar: a slim strip along the bottom with the source and the song at its left, a transport with only the
// buttons the source can really do, a progress bar where the position is known, a status line from the engine (tempo, key,
// and the bar and beat as Toaster counts them), and at the right end a flag to report a misread (renderer/misread.js). What
// each source gets, the times and the status line are plain functions; the bar itself is built through a few DOM calls only
// (createElement, append, addEventListener, dataset, hidden, textContent, setAttribute, style), so tools/player-bar.test.mjs
// runs it on a stand-in page. app.js hands it what's playing every so often (update) and what a button does where only the
// app can say (act); it keeps no timers of its own. The system's own player is reached through window.nc (main.js,
// helpers/player.cjs).

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
  flag: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h1.5v13H3zM4.5 2.5h8l-2 3 2 3h-8z"/></svg>',
  shuffle: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4h2.6l6.4 8h1.5v-2l3 2.75-3 2.75v-2h-2.2l-6.4-8H1.5zM1.5 12h2.6l1.6-2-.9-1.2-1.4 1.7H1.5zM10.5 4h1.5V2l3 2.75-3 2.75v-2h-.8l-1.5 1.9-.9-1.2z"/></svg>',
  smart: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4h2.6l6.4 8h1.5v-2l3 2.75-3 2.75v-2h-2.2l-6.4-8H1.5zM1.5 12h2.6l1.6-2-.9-1.2-1.4 1.7H1.5zM12 1l.7 1.8 1.8.7-1.8.7L12 6l-.7-1.8-1.8-.7 1.8-.7z"/></svg>',
  repeat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3.5h7.5V1.5l3 2.75-3 2.75V5H4.5A1.5 1.5 0 0 0 3 6.5V8H1.5V6.5A3 3 0 0 1 4 3.5zM12 12.5H4.5v2l-3-2.75 3-2.75v2h7a1.5 1.5 0 0 0 1.5-1.5V8h1.5v1.5a3 3 0 0 1-2.5 3z"/></svg>',
};
// Shuffle and repeat beside the transport (modesFor): Spotify's own, through the Web API, while the bar shows Spotify's song from
// it; or the library's queue (act.shuffle, act.repeat), while an album of it plays. repeat: 'off', 'all' (the album or the
// playlist) or 'one' (the song). Spotify's smart shuffle (smart: true) shows as shuffle with a spark; only Spotify turns it on.
const REPEAT_NEXT = { off: 'all', all: 'one', one: 'off' };
const SPOTIFY_REPEAT = { off: 'off', context: 'all', track: 'one' }, TO_SPOTIFY = { off: 'off', all: 'context', one: 'track' };
const QUEUE_REPEAT = { album: 'off', all: 'all', one: 'one' }, TO_QUEUE = { off: 'album', all: 'all', one: 'one' };
export function modesFor({ player = null, spotify = null, source = '', queue = null }) {
  if (player === 'spotify-api' && spotify) {
    const a = spotify.allowed || {};
    return { shuffle: a.shuffle ? (spotify.smart ? 'smart' : spotify.shuffle ? 'on' : 'off') : null, repeat: a.repeat ? SPOTIFY_REPEAT[spotify.repeat] || 'off' : null };
  }
  if (source === 'file' && queue) return { shuffle: queue.shuffle ? 'on' : 'off', repeat: QUEUE_REPEAT[queue.repeat] || 'off' };
  return { shuffle: null, repeat: null };
}
const MODE_LABEL = { shuffle: { off: 'shuffle', on: 'shuffle: on', smart: 'smart shuffle: on (turn it off)' }, repeat: { off: 'repeat', all: 'repeat: all', one: 'repeat: this song' } };
// Identify the local system player before consulting the account's Connect state.
export const isSpotifySong = (s) => s.source === 'system' && /^(spotify(?:\.exe)?|com\.spotify\.client)$/i.test(s.app || '') && !!s.song?.title;
const sameSong = (a, b) => a?.name === b?.title && (!b?.artist || a.by === b.artist);
const SYSTEM_ACTION = { prev: 'previous', play: 'playpause', next: 'next' };
const POLL_EVERY = 2; // seconds between asking Music or Spotify where it is (between, the bar counts on by itself)
const POLL_REFUSED = 60; // ... and between asking one that macOS wouldn't let Toaster ask, in case that's been changed since
const SEEK_KEY = 5; // seconds an arrow key moves the position

// root: the bar's element (#player). nc: the page's bridge to the main process (window.nc), where there is one; platform:
// its platform ('darwin', 'win32', or 'web'). act, what only the app can do: restart() and seek(seconds) for a file,
// stop() and start(kind) for the radio and the demo, next() and previous() where there's a queue (the library's: the app gives
// them while one is playing, and without them previous restarts the file), misread() for the report-a-misread flag, fail(err)
// and note(text). A snapshot's `near`, the queue's line of what's near ([{ text, now }]), is shown beside the song where there's
// room.
export function createPlayerBar({ document: doc, root, nc = null, platform = 'web', act = {}, window: win = globalThis }) {
  const bridge = !!nc && typeof nc.playerCommand === 'function';
  const el = (tag, cls, ...kids) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (kids.length) e.append(...kids);
    return e;
  };
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target?.tagName === 'BUTTON') e.stopPropagation(); });
  const setText = (e, text) => { if (e.textContent !== text) e.textContent = text; };
  const setHidden = (e, hidden) => { if (e.hidden !== hidden) e.hidden = hidden; };
  const setAttr = (e, name, value) => { if (e.getAttribute(name) !== String(value)) e.setAttribute(name, String(value)); };
  const setData = (e, name, value) => { if (e.dataset[name] !== value) e.dataset[name] = value; };

  const chip = el('span', 'pl-chip'), title = el('b', 'pl-title'), artist = el('span', 'pl-artist'), idle = el('span', 'pl-idle');
  const song = el('span', 'pl-song', title, artist, idle);
  const spotifyCover = el('img', 'pl-spotify-cover');
  spotifyCover.alt = ''; spotifyCover.draggable = false; spotifyCover.hidden = true;
  const spotifyLink = el('button', 'pl-spotify-link');
  spotifyLink.type = 'button'; spotifyLink.hidden = true;
  spotifyLink.title = 'Open this song in Spotify'; spotifyLink.setAttribute('aria-label', 'Open this song in Spotify');
  spotifyLink.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SPOTIFY_ICON}"/></svg><span>Spotify ↗</span>`;
  spotifyLink.addEventListener('click', () => { Promise.resolve().then(() => spotifyUri ? nc?.spotifyOpen?.(spotifyUri) : nc?.spotifySearch?.(`${last?.song?.title || ''} ${last?.song?.artist || ''}`.trim())).catch((e) => act.fail?.(e)); });
  // golden's line of what's near ("01 Plague" , ▶ "02 Kerosene" , "03 Wrath of God"): up to four items, each a separator, a mark and
  // its label, made once and filled in as the queue moves
  const nearItems = Array.from({ length: 4 }, () => ({ sep: el('span', 'pl-sep'), mark: el('span', 'pl-mark'), label: el('span', 'pl-label') }));
  const near = el('span', 'pl-near', ...nearItems.flatMap((i) => [i.sep, i.mark, i.label]));
  const buttons = {};
  for (const kind of ['prev', 'play', 'next']) {
    const b = el('button', `pl-btn pl-${kind}`);
    b.type = 'button';
    b.dataset.kind = kind;
    // (a click leaves no focus on the button: it would keep the bar up in Z's visualizer mode, as the next key would make it a keyboard's focus; Enter and Space keep theirs)
    b.addEventListener('click', (e) => { press(kind); if (e.detail) b.blur?.(); });
    buttons[kind] = b;
  }
  const modeButtons = {};
  for (const kind of ['shuffle', 'repeat']) {
    const b = el('button', `pl-btn pl-mode pl-${kind}`);
    b.type = 'button';
    b.dataset.kind = kind;
    b.hidden = true;
    b.addEventListener('click', (e) => { toggleMode(kind); if (e.detail) b.blur?.(); });
    modeButtons[kind] = b;
  }
  // (as Spotify has them: shuffle before the transport, repeat after it)
  const transport = el('div', 'pl-transport', modeButtons.shuffle, buttons.prev, buttons.play, buttons.next, modeButtons.repeat);
  const pos = el('span', 'pl-time pl-pos'), len = el('span', 'pl-time pl-len'), fill = el('i', 'pl-fill');
  const track = el('div', 'pl-track', fill);
  track.tabIndex = 0;
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-label', 'position');
  const progress = el('div', 'pl-progress', pos, track, len);
  const status = el('div', 'pl-status');
  // the flag at the right end: "report a misread" (act.misread: the app opens the report, renderer/misread.js). It is there with
  // any source, or none, since the report says what it doesn't know; and not at all where the app gives no way to one
  const misread = el('button', 'pl-btn pl-misread');
  misread.type = 'button';
  misread.innerHTML = ICONS.flag;
  misread.title = 'report a misread';
  misread.setAttribute('aria-label', 'report a misread');
  misread.hidden = typeof act.misread !== 'function';
  misread.addEventListener('click', (e) => {
    // (as the transport's buttons: a click leaves no focus on it. First, here: the report would hand the focus back to it when it closes)
    if (e.detail) misread.blur?.();
    try { act.misread(); } catch (err) { act.fail?.(err); }
  });
  root.append(el('div', 'pl-id', spotifyCover, spotifyLink, chip, song, near), transport, progress, status, misread);

  let spotify = null, spotifyKey = '', spotifyEpoch = 0, spotifyAsked = -Infinity, spotifyAsking = false, spotifyUri = '', spotifyPhoto = '', coverAsked = '', coverData = '';
  let last = null; // the latest snapshot (update)
  let ctl = controlsFor({}); // and what it gets
  let polled = null, polledKey = '', askedAt = -Infinity, asking = false; // Music's or Spotify's last answer, the song it was for, when it was asked
  const refused = new Set(); // the players macOS wouldn't let Toaster ask
  let hold = null; // a play or pause just pressed on the system's player, shown till its own answer comes: { playing, until }
  let dragging = null; // a drag on the track: { to }, the second it would seek to
  const iconOf = new Map();

  // how far into the song, and how long it is (seconds), or null where there's no telling
  function where(t) {
    if (ctl.progress === 'spotify') {
      if (!spotify || spotify.position === null || !(spotify.duration > 0)) return null;
      return [Math.min(spotify.duration, spotify.position + (spotify.playing ? Math.max(0, t - spotify.at) : 0)), spotify.duration];
    }
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
    if (ctl.player === 'spotify-api') return spotify.playing;
    return polled ? polled.playing : !!s.systemPlaying;
  }
  const playIcon = (s) => (!s.source ? 'play' : s.source === 'radio' || s.source === 'demo' ? 'stop' : playing(s) ? 'pause' : 'play');
  const labelOf = (kind, s) => (kind === 'play' ? playIcon(s) : kind === 'prev' && s.source === 'file' && typeof act.previous !== 'function' ? 'restart' : kind === 'prev' ? 'previous' : 'next');

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
    const mini = isSpotifySong(s), keyNow = mini ? `${s.app}|${s.song.title}|${s.song.artist}` : '';
    if (keyNow !== spotifyKey) { spotifyKey = keyNow; spotifyEpoch++; spotify = null; spotifyAsked = -Infinity; coverAsked = ''; coverData = ''; }
    if (mini && s.active && typeof nc?.spotifyPlayback === 'function' && !spotifyAsking && s.t - spotifyAsked >= 3) askSpotify(s.t);
    const freshSpotify = mini && spotify && s.t - spotify.at < 7 && sameSong(spotify.track, s.song);
    const who = platform === 'darwin' ? macPlayerOf(s.app) : platform === 'win32' && s.session ? 'keys' : null;
    ctl = controlsFor({ source: s.source, stopped: s.stopped, platform, app: s.app, session: !!s.session, bridge, denied: !!who && refused.has(who), queue: typeof act.next === 'function' });
    // Music's or Spotify's own answer: asked every couple of seconds while the bar is up (it counts on by itself in between),
    // and at once for a new song. One macOS won't let Toaster ask is asked once a minute, in case that's been changed.
    if (freshSpotify) ctl = { buttons: [ ...(spotify.allowed.previous ? ['prev'] : []), ...((spotify.playing ? spotify.allowed.pause : spotify.allowed.resume) ? ['play'] : []), ...(spotify.allowed.next ? ['next'] : []) ], player: 'spotify-api', progress: 'spotify', seek: false };
    const asked = !freshSpotify && (who === 'music' || who === 'spotify') ? s.source === 'system' && bridge : false;
    const key = asked ? `${who}|${s.song?.title}|${s.song?.artist}` : '';
    if (key !== polledKey) { polledKey = key; polled = null; askedAt = -Infinity; }
    if (asked && s.active && !asking && s.t - askedAt >= (refused.has(who) ? POLL_REFUSED : POLL_EVERY)) ask(who, s.t);

    paintSpotify(s, mini, freshSpotify);
    setData(root, 'source', chipOf(s.source || s.stopped));
    setText(chip, chipOf(s.source || s.stopped));
    chip.classList.toggle('off', !s.source);
    const line = songLine(s.song, s.source, s.label, s.stopped);
    setText(title, line.title);
    setText(artist, line.artist ? ` · ${line.artist}` : '');
    setText(idle, line.idle);
    song.title = line.title ? `${line.title}${line.artist ? ' · ' + line.artist : ''}` : '';
    const items = s.near && s.source === 'file' ? s.near.slice(0, nearItems.length) : [];
    setHidden(near, !items.length);
    nearItems.forEach((item, i) => {
      const it = items[i];
      setText(item.sep, it && i ? ' , ' : '');
      setText(item.mark, it?.now ? '▶ ' : '');
      setText(item.label, it ? it.text : '');
      item.label.classList.toggle('now', !!it?.now);
    });

    setHidden(transport, !ctl.buttons.length);
    for (const kind of ['prev', 'play', 'next']) {
      const b = buttons[kind], shown = ctl.buttons.includes(kind);
      setHidden(b, !shown);
      if (!shown) continue;
      const icon = kind === 'play' ? playIcon(s) : kind, label = labelOf(kind, s);
      if (iconOf.get(kind) !== icon) { iconOf.set(kind, icon); b.innerHTML = ICONS[icon]; }
      setData(b, 'state', icon);
      setAttr(b, 'aria-label', label);
      b.disabled = !!(ctl.player === 'spotify-api' && spotifySending);
      if (b.title !== label) b.title = label;
    }
    paintModes(s);
    paintProgress(where(s.t));

    setText(status, statusText({
      locked: !!s.source && !!s.tempo?.locked, bpm: s.tempo?.shown, key: s.key, at: s.at, source: s.source ? chipOf(s.source) : s.stopped ? 'stopped' : 'no source',
    }));
  }

  let modeHold = null; // a shuffle or repeat just pressed on Spotify, shown till its own answer comes: { shuffle?, repeat?, until }
  const queueModes = () => (typeof act.shuffle === 'function' && typeof act.repeat === 'function' ? { shuffle: act.shuffle(), repeat: act.repeat() } : null);
  function currentModes(s) {
    const m = modesFor({ player: ctl.player, spotify, source: s.source, queue: queueModes() });
    if (modeHold && s.t < modeHold.until && ctl.player === 'spotify-api') {
      if (modeHold.shuffle && m.shuffle) m.shuffle = modeHold.shuffle;
      if (modeHold.repeat && m.repeat) m.repeat = modeHold.repeat;
    }
    return m;
  }
  function paintModes(s) {
    const m = currentModes(s);
    for (const kind of ['shuffle', 'repeat']) {
      const b = modeButtons[kind], value = m[kind];
      setHidden(b, !value);
      if (!value) continue;
      const icon = kind === 'shuffle' ? (value === 'smart' ? 'smart' : 'shuffle') : 'repeat'; // (repeat one: the same loop, with a 1 by it, style.css)
      if (iconOf.get(kind) !== icon) { iconOf.set(kind, icon); b.innerHTML = ICONS[icon]; }
      setData(b, 'state', value);
      b.classList.toggle('on', value !== 'off');
      setAttr(b, 'aria-pressed', value !== 'off');
      const label = MODE_LABEL[kind][value];
      setAttr(b, 'aria-label', label);
      if (b.title !== label) b.title = label;
      b.disabled = !!(ctl.player === 'spotify-api' && spotifySending);
    }
  }
  function toggleMode(kind) {
    const s = last;
    if (!s) return;
    const m = currentModes(s), value = m[kind];
    if (!value) return;
    // shuffle: off -> on; on or smart -> off. repeat: off -> all -> one -> off
    const next = kind === 'shuffle' ? (value === 'off' ? 'on' : 'off') : REPEAT_NEXT[value];
    try {
      if (ctl.player === 'spotify-api') {
        if (spotifySending) return;
        const sentTo = spotify, state = kind === 'shuffle' ? next === 'on' : TO_SPOTIFY[next];
        modeHold = { ...(modeHold && s.t < modeHold.until ? modeHold : {}), [kind]: next, until: s.t + 3 };
        spotifySending = true;
        Promise.resolve().then(() => nc.spotifyControl({ action: kind, state, device: spotify.device, uri: spotify.track.uri }))
          // (done: the bar's copy of Spotify's state says so till the next answer; shuffle off takes smart shuffle with it)
          .then(() => { if (spotify === sentTo) { spotify[kind] = state; if (kind === 'shuffle' && !state) spotify.smart = false; } })
          .catch((err) => { modeHold = null; act.note?.(String(err?.message || 'Spotify did not answer.').replace(/^Error invoking remote method '[^']*': (Error: )?/, '')); })
          .finally(() => { spotifySending = false; spotifyAsked = -Infinity; paintModes(last); });
      } else if (kind === 'shuffle') act.setShuffle?.(next === 'on');
      else act.setRepeat?.(TO_QUEUE[next]);
      paintModes(s);
    } catch (err) { act.fail?.(err); }
  }

  let spotifySending = false;
  function askSpotify(t) {
    const epoch = spotifyEpoch;
    spotifyAsking = true; spotifyAsked = t;
    Promise.resolve().then(() => nc.spotifyPlayback()).then((r) => {
      if (epoch !== spotifyEpoch) return;
      spotify = r && sameSong(r.track, last.song) ? { ...r, at: last.t } : null;
      if (!spotify) { coverAsked = ''; coverData = ''; }
    }).catch(() => { if (epoch === spotifyEpoch) { spotify = null; coverAsked = ''; coverData = ''; spotifyAsked = t + 27; } }).finally(() => { spotifyAsking = false; });
  }
  function paintSpotify(s, mini, fresh) {
    setData(root, 'spotify', mini ? 'true' : 'false');
    spotifyUri = fresh ? spotify.track.uri : '';
    setHidden(spotifyLink, !mini);
    const linkLabel = spotifyUri ? 'Open this song in Spotify' : 'Search Spotify for this song';
    setAttr(spotifyLink, 'aria-label', linkLabel);
    if (spotifyLink.title !== linkLabel) spotifyLink.title = linkLabel;
    setHidden(chip, mini);
    // Covers cross through the checked main-process fetcher, never directly from a remote image URL.
    const url = fresh ? spotify.track.cover : '';
    if (url && url !== coverAsked && typeof nc?.spotifyCover === 'function') {
      const epoch = spotifyEpoch; coverAsked = url; coverData = '';
      Promise.resolve().then(() => nc.spotifyCover(url)).then((data) => {
        if (epoch === spotifyEpoch && url === coverAsked && typeof data === 'string' && data.startsWith('data:image/')) coverData = data;
      }, () => {});
    }
    const data = mini ? (fresh && coverData || (typeof s.art === 'string' && s.art.startsWith('data:image/') ? s.art : '')) : '';
    setHidden(spotifyCover, !data);
    if (data !== spotifyPhoto) { spotifyPhoto = data; spotifyCover.src = data; }
    if (mini) {
      // Keep Spotify's mark black or white, while the surrounding controls follow the theme.
      const bg = win.getComputedStyle?.(doc.body)?.getPropertyValue('--bg') || '';
      spotifyLink.style.color = logoTone(bg) === 'light' ? '#000' : '#fff';
    }
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
    if (!who || !bridge || (who === 'spotify-api' && spotifySending)) return;
    if (kind === 'play') hold = { playing: !playing(s), until: s.t + 2 };
    if (who === 'spotify-api') {
      spotifySending = true;
      try {
        await nc.spotifyControl({ action: kind === 'play' ? (spotify.playing ? 'pause' : 'resume') : SYSTEM_ACTION[kind], device: spotify.device, uri: spotify.track.uri });
      } catch (err) { hold = null; act.note?.(String(err?.message || 'Spotify did not answer.').replace(/^Error invoking remote method '[^']*': (Error: )?/, '')); }
      finally { spotifySending = false; spotifyAsked = -Infinity; }
      return;
    }
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
        else if (kind === 'prev') (act.previous || act.restart)?.();
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
