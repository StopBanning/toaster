// The code on screen through a pause (samir, Nov 23: "once I pause it, the script disappears"). Someone learning a song pauses it to read the code and play
// along on an instrument; the engine meant it kindly (no sound for 1.2 s mutes every part, and a few seconds on, 4 s when the player is not said to be playing,
// 20 s when it is, it starts over for a new song and the view is wiped), but the code he wanted was gone. So while the sound is gone the view keeps the
// lines it showed when the sound stopped, as they were (not muted, not drifting with the fading level), until sound comes back; then the live lines take over.
//
// What this is not: the engine's hearing. It reads no more and no less than before (the silence still resets it as it did); only what the view is told to
// show changes. And a quiet part of a song is not silence: the sound stays above the floor, `silent` never comes on, a breakdown mutes through the kick
// that is missing, and this does nothing.
//
// feed(t, lines, { silent, lastSound, locked, extra }): call it on each refresh of the code with the lines the engine just wrote; it returns { lines, paused, extra }, the
// lines to show. It remembers the last few seconds of lines, with whether the beat was locked then (a view that only said "waiting for sound" has nothing worth
// keeping) and `extra`, what the page needs besides the lines to write them out again (O's bass rhythm and the bar's phase, which the engine loses when it starts
// over), and when the silence begins it takes them from the moment the sound stopped.
// begin(lastSound, t): the same choice made at once, for the call that comes from the engine's own reset (it can come first on a tick that was held up).
// wordShown(t, known): whether to say "paused" on screen: not for every silence (a gap inside a song, the end of a file, the seconds between two songs are not
// pauses), only when the page knows the player is paused (known), or when the hold has gone on for WORD_AFTER_S seconds. It goes when the sound returns.
// holding, extra, since: whether lines are kept now, what was kept with them, and when the hold began.
// letGo(): the view was cleared on purpose (a new source, a recording starting), nothing is kept.
export const KEEP_S = 4; // (how far back the lines are remembered; the sound's end is within a tick or two of the silence being noticed, 1.2 s)
export const WORD_AFTER_S = 2; // (the hold's age at which "paused" is said when the page cannot tell: a gap in a song is over by then, a pause is not)

// Whether the page knows the music was paused or stopped, rather than quiet or ended: a file's element paused, the system's player (Spotify, Music) saying it is
// not playing, the radio or the demo stopped from the player bar. Anything else (a browser's tab, a microphone, silence in a song) it cannot tell.
export function pauseKnown({ source, el, winSong, winPlaying, stopped } = {}) {
  return (source === 'file' && !!el?.paused) || (source === 'system' && !!winSong && !winPlaying) || !!stopped;
}

export function createCodeHold() {
  const hist = []; // [t, lines, locked, extra], oldest first
  let held = null; // the entry kept, while the sound is gone
  let since = null; // when the hold began
  let none = false; // the silence began with nothing worth keeping: show what the engine writes, as before
  const pick = (lastSound) => {
    let at = null;
    for (const h of hist) if (h[0] <= lastSound + 0.05) at = h;
    return at && at[2] ? at : null;
  };
  const take = (lastSound, t) => { held = pick(lastSound); none = !held; since = held ? t : null; };
  return {
    feed(t, lines, { silent, lastSound, locked, extra = null }) {
      if (!silent) {
        held = null; none = false; since = null;
        if (hist.length && t < hist[hist.length - 1][0]) hist.length = 0; // (the clock stepped back: a render starting over)
        hist.push([t, lines, !!locked, extra]);
        while (hist.length && hist[0][0] < t - KEEP_S) hist.shift();
        return { lines, paused: false, extra };
      }
      if (!held && !none) take(lastSound, t);
      return held ? { lines: held[1], paused: true, extra: held[3] } : { lines, paused: false, extra };
    },
    begin(lastSound, t = 0) { if (!held && !none) take(lastSound, t); return !!held; },
    wordShown(t, known) { return !!held && (!!known || t - since >= WORD_AFTER_S); },
    get holding() { return !!held; },
    get extra() { return held ? held[3] : null; },
    get since() { return since; },
    letGo() { held = null; none = false; since = null; hist.length = 0; },
  };
}
