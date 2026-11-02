// The perfect take's store (stream B). While M records, what the take's re-render needs is kept in a folder of its own,
// takes/<id> under the settings folder:
// - sound.f32: the sound as it reached the app, 32-bit floats with the channels interleaved;
// - log.jsonl: the engine's log, one entry a line;
// - meta.json: what the page was like (its size and pixel ratio, the frame rate, the clock times the take starts at) and,
//   once it ends, how much sound there is.
// A take is kept till its perfect copy is made, or dropped. When more than KEEP are waiting, the oldest go first. The page
// names a take only by the id main gave it: anything else is refused, so no path ever comes from the page.

const nodeFs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const KEEP = 3;
const ID = /^take-\d{8}-\d{6}-[0-9a-f]{6}$/;
const pad = (n, w = 2) => String(n).padStart(w, '0');

function createTakeStore({ root, fs = nodeFs, now = () => new Date(), random = () => crypto.randomBytes(3).toString('hex') }) {
  const open = new Map(); // id -> { sound, log, samples, channels }
  const dirOf = (id) => {
    if (typeof id !== 'string' || !ID.test(id)) throw new Error('that is not a take');
    return path.join(root, id);
  };
  const said = (what) => (err) => new Error(`${what} (${err?.code || err?.message || err})`);
  const writeMeta = (dir, meta) => fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  const readMeta = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const live = (id) => { const t = open.get(id); if (!t) throw new Error('that take has ended, or never began'); return t; };

  return {
    // A new take: its folder, what the page was like, and empty sound and log files. Says its id.
    begin(meta = {}) {
      const d = now();
      const id = `take-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${random()}`;
      const dir = dirOf(id), channels = meta.channels ?? 2;
      try {
        fs.mkdirSync(dir, { recursive: true });
        writeMeta(dir, { ...meta, channels, began: d.toISOString() });
        open.set(id, { sound: fs.openSync(path.join(dir, 'sound.f32'), 'w'), log: fs.openSync(path.join(dir, 'log.jsonl'), 'w'), samples: 0, channels });
      } catch (err) { throw said('the take could not be kept')(err); }
      return id;
    },
    // More sound: a Float32Array with the channels interleaved.
    sound(id, data) {
      const t = live(id);
      if (!(data instanceof Float32Array) || data.length % t.channels) throw new Error(`the take's sound must come as ${t.channels} channels of 32-bit floats`);
      let wrote;
      try { wrote = fs.writeSync(t.sound, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); }
      catch (err) { throw said('the take\'s sound could not be kept')(err); }
      if (wrote !== data.byteLength) throw new Error(`the take's sound could not be kept (${wrote} of ${data.byteLength} bytes written)`); // (a full disk)
      t.samples += data.length / t.channels;
    },
    // More of the engine's log: entries, one a line.
    log(id, entries) {
      const t = live(id);
      if (!Array.isArray(entries)) throw new Error('the take\'s log must come as a list');
      if (!entries.length) return;
      try { fs.writeSync(t.log, entries.map((e) => JSON.stringify(e)).join('\n') + '\n'); }
      catch (err) { throw said('the take\'s log could not be kept')(err); }
    },
    // The take is over: its files closed, and what it holds written down.
    end(id, more = {}) {
      const t = live(id), dir = dirOf(id);
      open.delete(id);
      try {
        fs.closeSync(t.sound); fs.closeSync(t.log);
        const meta = { ...readMeta(dir), ...more, samples: t.samples, ended: now().toISOString() };
        writeMeta(dir, meta);
        return meta;
      } catch (err) { throw said('the take could not be finished')(err); }
    },
    // A take for its re-render: what the page was like, the log, and the sound to read a stretch at a time, one
    // Float32Array per channel.
    read(id) {
      const dir = dirOf(id);
      if (open.has(id)) throw new Error('that take is still recording');
      let meta, lines;
      try { meta = readMeta(dir); lines = fs.readFileSync(path.join(dir, 'log.jsonl'), 'utf8').split('\n').filter(Boolean); }
      catch (err) { throw said('the take could not be read')(err); }
      const { channels, samples = 0 } = meta, file = path.join(dir, 'sound.f32');
      return {
        meta,
        log: lines.map((l) => JSON.parse(l)),
        sound: {
          sampleRate: meta.sampleRate, channels, samples,
          read(from, count) {
            const n = Math.max(0, Math.min(count, samples - from)), bytes = Buffer.alloc(n * channels * 4);
            if (n) {
              const fd = fs.openSync(file, 'r');
              try { fs.readSync(fd, bytes, 0, bytes.length, from * channels * 4); } finally { fs.closeSync(fd); }
            }
            const all = new Float32Array(bytes.buffer, bytes.byteOffset, n * channels), planes = Array.from({ length: channels }, () => new Float32Array(n));
            for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) planes[c][i] = all[i * channels + c];
            return planes;
          },
        },
      };
    },
    // The takes waiting, oldest first (the ones that ended; one still recording isn't listed).
    list() {
      let names = [];
      try { names = fs.readdirSync(root); } catch { return []; }
      return names.filter((n) => ID.test(n) && !open.has(n)).sort().flatMap((id) => {
        try { return [{ id, meta: readMeta(dirOf(id)) }]; } catch { return []; }
      });
    },
    remove(id) {
      const dir = dirOf(id);
      if (open.has(id)) throw new Error('that take is still recording');
      fs.rmSync(dir, { recursive: true, force: true });
    },
    // Only the newest `keep` waiting takes stay.
    prune(keep = KEEP) {
      const all = this.list(), gone = all.slice(0, Math.max(0, all.length - keep));
      for (const { id } of gone) this.remove(id);
      return gone.map((t) => t.id);
    },
  };
}

// What the page says a take was like, checked before anything is kept or a window is made from it: the known details only,
// each of a sane kind and size. Anything else is refused in words.
const RATES = [22050, 24000, 32000, 44100, 48000, 88200, 96000];
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
function checkMeta(m) {
  if (!m || typeof m !== 'object') throw new Error('a take needs its details');
  const { css, dpr, fps, sampleRate, channels, soundAt, t0, runup, seed } = m;
  if (!css || !Number.isInteger(css.width) || !Number.isInteger(css.height) || !num(css.width, 100, 8000) || !num(css.height, 100, 8000)) throw new Error("a take's page size must be whole pixels, 100 to 8000");
  if (!num(dpr, 0.25, 4)) throw new Error("a take's pixel ratio must be 0.25 to 4");
  if (![24, 25, 30, 50, 60].includes(fps)) throw new Error("a take's frame rate must be 24, 25, 30, 50 or 60");
  if (!RATES.includes(sampleRate) || channels !== 2) throw new Error("a take's sound must be 2 channels at a usual sample rate");
  if (!num(soundAt, -1e9, 1e9) || !num(t0, -1e9, 1e9) || !num(runup, 0, 60) || Math.abs(t0 - soundAt - runup) > 1e-6) throw new Error("a take's times don't add up");
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("a take's seed must be a 32-bit whole number");
  const storage = {};
  let size = 0;
  for (const [k, v] of Object.entries(m.storage && typeof m.storage === 'object' ? m.storage : {})) {
    if (typeof v !== 'string' || typeof k !== 'string') continue;
    size += k.length + v.length;
    if (size > 2e6) throw new Error("a take's storage is too big");
    storage[k] = v;
  }
  // what names and colours the copy, and the scene it starts on: plain values, the cover a small picture; anything else is left out
  const song = m.song && typeof m.song === 'object' && typeof m.song.title === 'string' && m.song.title.trim() ? { title: text(m.song.title, 200), artist: text(m.song.artist, 200) } : null;
  const art = typeof m.art === 'string' && m.art.length <= 400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.art) ? m.art : '';
  const autoScene = Number.isInteger(m.autoScene) && m.autoScene >= 0 && m.autoScene < 1e6 ? m.autoScene : null;
  const autoSceneAt = num(m.autoSceneAt, -1e9, 1e9) ? m.autoSceneAt : null;
  return { css: { width: css.width, height: css.height }, dpr, fps, sampleRate, channels, soundAt, t0, runup, seed, source: text(m.source, 32), label: text(m.label, 200), storage, vertical: m.vertical === true, mini: m.mini === true, song, art, autoScene, autoSceneAt };
}
// ...and what it says at the end: how long it was, what changed on the way (a time and the settings, plain values; or a tap
// of tap tempo, or D's drop, from the run-up on), whether the recording was kept (a take whose recording was lost is dropped, not drawn).
function checkEnd(e, meta) {
  // (ten minutes at most: the render holds the whole take's sound, one channel, while it draws)
  if (!e || typeof e !== 'object' || !num(e.duration, 0.1, 600)) throw new Error('a perfect copy is made of recordings up to ten minutes long');
  const changes = Array.isArray(e.changes) ? e.changes.slice(0, 10000) : [];
  const plain = (v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
  const end = meta.t0 + e.duration + 1;
  const kept = changes.flatMap((c) => {
    if (c?.tap === true && num(c.t, meta.soundAt, end)) return [{ t: c.t, tap: true }];
    if (c?.drop === true && num(c.t, meta.soundAt, end)) return [{ t: c.t, drop: true }];
    if (c && num(c.t, meta.t0 - 1, end) && c.set && typeof c.set === 'object' && Object.values(c.set).every(plain))
      return [{ t: c.t, set: Object.fromEntries(Object.entries(c.set).slice(0, 32).map(([k, v]) => [String(k).slice(0, 40), typeof v === 'string' ? v.slice(0, 64) : v])) }];
    return [];
  }).sort((a, b) => a.t - b.t);
  return { duration: e.duration, changes: kept, keep: e.keep === true };
}

module.exports = { createTakeStore, checkMeta, checkEnd, KEEP };
