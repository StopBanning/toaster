// The player bar's way to the system's own player (renderer/player.js decides which buttons show; main.js's
// player:command and player:position handlers call this). On a Mac the players are Music and Spotify, asked in
// AppleScript through osascript, and only when one is already running (a bare "tell application" would open it). On
// Windows it's the media keys, pressed with SendInput by a PowerShell helper (mediakeys.ps1) that starts for the press. Everything that
// leaves goes through one runner, run(file, args) -> the program's output, so the tests can read what would be sent
// and send nothing; a copy run from source with --player-dry-run (main.js) does the same. Plain functions, so they can.
// One more thing goes the same way: the library's spotify section plays a link the listener pasted (playLink, below).

const { execFile } = require('node:child_process');
const path = require('node:path');

const ACTIONS = ['playpause', 'next', 'previous'];
const MAC_PLAYERS = { music: 'Music', spotify: 'Spotify' };
const OSASCRIPT = '/usr/bin/osascript';
const isMacPlayer = (who) => typeof who === 'string' && Object.hasOwn(MAC_PLAYERS, who); // (who comes from the page: only our two names count)

// What each action says to each player. Music's own previous button goes back to the start of the song first, and
// to the one before it only if it's just begun: that's its "back track" (Spotify's "previous track" does the same).
const MAC_VERBS = {
  music: { playpause: 'playpause', next: 'next track', previous: 'back track' },
  spotify: { playpause: 'playpause', next: 'next track', previous: 'previous track' },
};

// "application ... is running" comes first because it doesn't open the player, and the tell would.
function macCommand(who, action) {
  const app = MAC_PLAYERS[who];
  return `if application "${app}" is running then tell application "${app}" to ${MAC_VERBS[who][action]}`;
}

// Where it is in the song, as one line, "61000|215000|playing": position, length (whole milliseconds, so the Mac's
// decimal mark can't change how they read; Music counts a track's length in seconds, Spotify in milliseconds) and state.
const MAC_LENGTH = { music: '((duration of current track) * 1000) div 1', spotify: '(duration of current track) div 1' };
function macPosition(who) {
  const app = MAC_PLAYERS[who];
  return `if application "${app}" is running then tell application "${app}" to return (((player position * 1000) div 1) as text) & "|" & ((${MAC_LENGTH[who]}) as text) & "|" & (player state as text)`;
}

// position and length in seconds, and whether it's playing; null for anything else (nothing running, or no song).
// (The state is its name, "playing", or its code, kPSP, if AppleScript hands the constant over unnamed.)
function parsePosition(output) {
  const m = /^(\d+)\|(\d+)\|(.+)$/.exec(String(output).trim());
  return m ? { position: Number(m[1]) / 1000, duration: Number(m[2]) / 1000, playing: /^playing$|kPSP/i.test(m[3]) } : null;
}

// What's playing, asked of Spotify and then Music, for the Macs where the system's own list (MediaRemote, which
// helpers/mac/nowplaying reads) answers nothing: macOS 15.4 closed it to apps that aren't Apple's. One line, the fields
// split by a character no title has: the app, the title, the artist, the state and (Spotify only) the cover's address.
const NP_SEP = '\u001f';
function macNowPlaying() {
  const field = (app, extra) => `tell application "${app}" to return "${app}" & sep & (name of current track) & sep & (artist of current track) & sep & (player state as text) & sep & ${extra}`;
  return `set sep to (ASCII character 31)\n` +
    `if application "Spotify" is running then\n try\n ${field('Spotify', '(artwork url of current track)')}\n end try\nend if\n` +
    `if application "Music" is running then\n try\n ${field('Music', '""')}\n end try\nend if\nreturn ""`;
}
// { app, title, artist, playing, cover } or null (neither running, or nothing in it); a paused player counts, so the card keeps the song.
function parseNowPlaying(output) {
  const f = String(output).replace(/\r?\n$/, '').split(NP_SEP);
  if (f.length < 5 || !f[1]) return null;
  return { app: f[0], title: f[1], artist: f[2] || null, playing: /^playing$|kPSP/i.test(f[3]), cover: /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(f[4]) ? f[4] : null };
}

// A pasted Spotify link, played in the Spotify app (the spotify section's first tier, which needs no sign-in). This is the one
// place Toaster starts the app itself: the listener asked for this song, so unlike the buttons above, which only answer a player that
// is already running, a bare "tell application" here is wanted (AppleScript launches Spotify if it isn't running, in the background,
// and plays the track, album or playlist the address names). The address is checked here too, so nothing but spotify:<kind>:<22
// characters> is ever in the script, whoever calls this.
const LINK_URI = /^spotify:(track|album|playlist|artist):[A-Za-z0-9]{22}$/;
function macPlayLink(uri) {
  if (typeof uri !== 'string' || !LINK_URI.test(uri)) throw new Error('not a Spotify address');
  return `tell application "Spotify" to play track "${uri}"`;
}

// Windows: the media keys, pressed with SendInput by helpers/mediakeys.ps1, which PowerShell runs with -File as main.js
// runs the other helpers (from app.asar.unpacked in the installed app, where packaging leaves the helpers as files).
const MEDIA_KEYS = path.join(__dirname, 'mediakeys.ps1').replace('app.asar', 'app.asar.unpacked');
const windowsArgs = (action) => ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', MEDIA_KEYS, action];

// macOS says -1743 when you've told it no (or not yet, with no one to ask)
const refused = (err) => /-1743|not authori[sz]ed/i.test(`${err?.stderr || ''} ${err?.message || ''}`);

// The one place a command leaves from: what the program printed, or a rejection that carries what it said. It isn't kept
// waiting for ever (a player stuck on a dialog would hold the call for AppleScript's two minutes), but long enough to answer
// macOS's question the first time, which asks whether Toaster may control the player: killed meanwhile, it could ask again.
function realRun(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 15000, windowsHide: true, maxBuffer: 1 << 16 }, (err, stdout, stderr) => {
      if (err) { err.stderr = String(stderr || ''); reject(err); } else resolve(String(stdout));
    });
  });
}

// A runner that sends nothing: it keeps what it was asked to send, and answers a position question with a made-up
// reading, so the bar's progress has something to show.
function dryRunner() {
  const sent = [];
  const run = async (file, args) => {
    sent.push([file, ...args]);
    return args.some((a) => a.includes('player position')) ? '61000|215000|playing' : '';
  };
  // (an address for the system's link opener is kept the same way, as ['open', address])
  const open = async (uri) => { sent.push(['open', uri]); };
  return { run, sent, open };
}

// who: 'music' or 'spotify' on a Mac, 'keys' (the media keys, whichever player Windows has) on Windows. Both calls answer
// with an object, never an error: { ok: true } or { ok: false, why }, why being 'denied' (macOS wasn't allowed to let
// Toaster ask: System Settings, Privacy & Security, Automation), 'off' (not running, or no song), 'unsupported' or 'failed'.
// (open: how an address goes to the system's own link opener, off a Mac: Electron's shell.openExternal in the app)
function createPlayerControl({ platform = process.platform, run = realRun, open = null } = {}) {
  const asking = new Map(); // a position question still out, per player: the next one joins it instead of piling up

  async function command(who, action) {
    let sent = null;
    if (ACTIONS.includes(action)) {
      if (platform === 'darwin' && isMacPlayer(who)) sent = [OSASCRIPT, ['-e', macCommand(who, action)]];
      else if (platform === 'win32' && who === 'keys') sent = ['powershell.exe', windowsArgs(action)];
    }
    if (!sent) return { ok: false, why: 'unsupported' };
    try {
      await run(...sent);
      return { ok: true };
    } catch (err) {
      return { ok: false, why: refused(err) ? 'denied' : 'failed' };
    }
  }

  async function ask(who) {
    try {
      const reading = parsePosition(await run(OSASCRIPT, ['-e', macPosition(who)]));
      return reading ? { ok: true, ...reading } : { ok: false, why: 'off' };
    } catch (err) {
      return { ok: false, why: refused(err) ? 'denied' : 'failed' };
    }
  }
  function position(who) {
    if (platform !== 'darwin' || !isMacPlayer(who)) return Promise.resolve({ ok: false, why: 'unsupported' });
    if (!asking.has(who)) asking.set(who, ask(who).finally(() => asking.delete(who)));
    return asking.get(who);
  }

  // The Spotify app told to play a pasted address (spotify:track:, spotify:album: or spotify:playlist: and the id): by AppleScript on a
  // Mac, by the system's link opener (which brings the app up on it) anywhere else. Answers { ok: true } or { ok: false, why }, why being
  // 'denied', 'failed' or 'unsupported' (not an address of ours, or no opener).
  async function playLink(uri) {
    if (typeof uri !== 'string' || !LINK_URI.test(uri)) return { ok: false, why: 'unsupported' };
    try {
      if (platform === 'darwin') await run(OSASCRIPT, ['-e', macPlayLink(uri)]);
      else if (open) await open(uri);
      else return { ok: false, why: 'unsupported' };
      return { ok: true };
    } catch (err) {
      return { ok: false, why: refused(err) ? 'denied' : 'failed' };
    }
  }

  // What's playing, asked of the two players directly (see macNowPlaying): null off a Mac, when neither is running, or
  // when macOS won't let Toaster ask.
  async function nowPlaying() {
    if (platform !== 'darwin') return null;
    try { return parseNowPlaying(await run(OSASCRIPT, ['-e', macNowPlaying()])); } catch { return null; }
  }

  return { command, position, playLink, nowPlaying };
}

module.exports = { ACTIONS, MAC_PLAYERS, MEDIA_KEYS, LINK_URI, macCommand, macPosition, macPlayLink, parsePosition, macNowPlaying, parseNowPlaying, windowsArgs, realRun, dryRunner, createPlayerControl };
