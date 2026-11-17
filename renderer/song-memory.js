// What Toaster learned of a song the last time it played, kept for the next time (Nov 16): its tempo and the lines of its drums (kick, clap, closed and open hat) by the 16th.
// The engine uses them only as provisional (engine.js: `prior`): a tempo reading that agrees locks at once, a line comes in on its second hit on the steps it had, and every bar is
// checked against what is heard, so a remix, a live version or a bad earlier reading costs a bar, not the song. Local only (the browser's own storage for this app: a title and
// artist, a tempo and a few 16-character lines per song), at most CAP songs (the least recently heard go first), and forget() clears it all.
export const CAP = 500, KEY = 'toaster-song-memory-v1';
const PARTS = ['bd', 'sd', 'hhc', 'hho'];

// "Artist|title", lower case; a remaster's tag is no different song, but a live version or a remix is (those words stay in the title)
export function keyOf(song) {
  if (!song?.title) return '';
  const clean = (x) => String(x || '').toLowerCase().replace(/[\s_]+/g, ' ').replace(/\s*[-(\[]\s*(\d{4}\s+)?(digital\s+)?remaster(ed)?(\s+\d{4})?[^)\]]*[)\]]?\s*$/i, '').trim();
  return `${clean(song.artist)}|${clean(song.title)}`;
}

const pack = (a) => a.map((x) => (x ? '1' : '0')).join('');
const unpack = (s) => Array.from(s, (c) => c === '1');

export function createSongMemory(storage = globalThis.localStorage, { cap = CAP, now = () => Date.now() } = {}) {
  let db = null;
  const load = () => {
    if (db) return db;
    try { db = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { db = {}; }
    if (!db || typeof db !== 'object' || Array.isArray(db)) db = {};
    return db;
  };
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(db)); } catch { /* full or blocked: it just isn't kept */ } };
  const top = (counts) => Object.entries(counts || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    // the engine's `prior` for a song, or null: the tempo, and for each line the pattern it showed most often (a song's last bars are not its usual ones)
    prior(key) {
      const r = key ? load()[key] : null;
      if (!r || !(r.bpm > 40 && r.bpm < 260)) return null;
      const parts = {};
      for (const id of PARTS) { const pat = top(r.c?.[id]); if (typeof pat === 'string' && pat.length === 16) parts[id] = unpack(pat); }
      return { bpm: r.bpm, parts, n: r.n || 1 };
    },
    // a look at what the song's lines are now (engine.songSnapshot), every ~10 s while it plays: each line's pattern is tallied (the four most seen are kept), the tempo averaged
    // ahead: the pre-analysis's (a library song nobody has played yet): such a song is only added where there is room, and never pushes a song
    // that was heard out (the sweep, Nov 16: with a library over CAP the read-ahead pushed out its own first songs and picked them again, for
    // ever, and pushed out what the person had played); a song that is then played is no longer one of those
    put(key, snap, { ahead = false } = {}) {
      if (!key || !snap) return false;
      const d = load(), old = d[key], c = old?.c || {};
      // (a read-ahead put refuses a song that was heard, and a new song when full; it goes on adding to a song it read ahead itself: each ~10 s look at it is a tally)
      if (ahead && (old ? !old.ahead : Object.keys(d).length >= cap)) return false;
      for (const id of PARTS) {
        if (!snap.parts[id]) continue;
        const counts = (c[id] ??= {}), pat = pack(snap.parts[id]);
        counts[pat] = (counts[pat] || 0) + 1;
        const keep = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
        c[id] = Object.fromEntries(keep);
      }
      const near = old && Math.abs(old.bpm - snap.bpm) / old.bpm < 0.01;
      const before = old && PARTS.map((id) => top(old.c?.[id])).join();
      d[key] = { bpm: near ? +(0.7 * old.bpm + 0.3 * snap.bpm).toFixed(2) : snap.bpm, c: near ? c : Object.fromEntries(PARTS.filter((id) => snap.parts[id]).map((id) => [id, { [pack(snap.parts[id])]: 1 }])), n: near ? Math.min(999, (old.n || 1) + 1) : 1, seen: now(), ...(ahead && { ahead: 1 }) };
      const keys = Object.keys(d);
      // (over the cap: the read-ahead songs nobody played go first, oldest first, then the oldest played; never the song just put)
      if (keys.length > cap) for (const k of keys.filter((x) => x !== key).sort((a, b) => (d[b].ahead ? 1 : 0) - (d[a].ahead ? 1 : 0) || d[a].seen - d[b].seen).slice(0, keys.length - cap)) delete d[k];
      save();
      return !near || before !== PARTS.map((id) => top(d[key].c?.[id])).join();
    },
    // songs the pre-analysis looked at and had nothing to keep of (a file too short, one it couldn't read): not looked at again
    tried(key) { try { return JSON.parse(storage?.getItem(KEY + '-tried') || '[]').includes(key); } catch { return false; } },
    markTried(key) { try { const l = JSON.parse(storage?.getItem(KEY + '-tried') || '[]'); if (!l.includes(key)) { l.push(key); storage?.setItem(KEY + '-tried', JSON.stringify(l.slice(-3000))); } } catch { /* nothing */ } },
    size: () => Object.keys(load()).length,
    // room for a song the read-ahead would add (it never takes one's place)
    room: () => Object.keys(load()).length < cap,
    forget() { db = {}; try { storage?.removeItem(KEY); storage?.removeItem(KEY + '-tried'); } catch { /* nothing */ } },
  };
}
