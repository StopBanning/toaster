// Toaster in a browser: what the app's own window gives the page (window.nc, see preload.js), done
// the browser's way where it can be: fullscreen the browser's own; a recording, an export or a clip
// saved as a download; Strudel opened in a new tab. Left out where a browser can't: the mini and
// 9:16 windows, the titles of what other apps are playing, the machine's own numbers, updates (the
// page is always the latest). Every call the app makes without asking first is here, if only to do
// nothing. Loaded first by the web build (tools/web.mjs), before boot.js.
(() => {
  const VERSION = "0.4.24"; // (the build writes the app's version here)
  // a file handed to the browser to save; its name back
  const download = (parts, type, name) => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob(parts, { type }));
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return name;
  };
  const when = () => {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
  };
  const video = (ext) => (ext === 'mp4' ? 'video/mp4' : 'video/webm');
  // A recording keeps at most two minutes or 128 MiB, whichever comes first (the desktop app has no
  // limit). The recorder hears the same failure callback as on desktop and saves the pieces it has.
  const REC_BYTES = 128 * 1024 * 1024, REC_MS = 120000;
  let rec = null, recId = 0, recFailed = null;
  const say = (text) => {
    const el = document.getElementById('notice');
    if (el) { el.textContent = text; el.hidden = false; }
  };
  function limit(r, why) {
    if (rec !== r || r.failed) return;
    r.failed = true;
    clearInterval(r.timer);
    if (recFailed) {
      if (recFailed.length >= 2) recFailed(r.token, why);
      else recFailed(why);
    } else window.nc.recStop(r.token);
    say(why);
  }
  window.nc = {
    platform: 'web',
    version: async () => VERSION,
    toggleFullscreen: async () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
    onFullScreen: (fn) => document.addEventListener('fullscreenchange', () => fn(!!document.fullscreenElement)),
    onWindowShown: (fn) => document.addEventListener('visibilitychange', () => fn(document.visibilityState === 'visible')),
    onNowPlaying: () => {},
    setVertical: async () => false,
    setMini: async () => false,
    setTitleBar: async () => {},
    openStrudel: async (url) => { window.open(url, '_blank', 'noopener'); },
    // A recording is a download when it stops, bounded, with a plain notice when the limit is
    // reached. (Nothing is said as it starts: the tab is being captured by then, and a notice would
    // be in the video.)
    recSource: async () => 'tab',
    recStart: async (ext) => {
      if (rec) await window.nc.recStop(rec.token);
      const r = { token: ++recId, ext, parts: [], bytes: 0, at: Date.now() };
      rec = r;
      r.timer = setInterval(() => { if (Date.now() - r.at >= REC_MS) limit(r, 'Browser recording reached its 2-minute limit. The recorded part has been saved.'); }, 250);
      return { token: r.token };
    },
    recChunk: async (token, buf) => {
      // The one-argument form also supports this branch's existing renderer.
      if (buf === undefined) { buf = token; token = rec?.token; }
      const r = rec;
      if (!r || r.token !== token || r.failed) return false;
      if (r.bytes + buf.byteLength > REC_BYTES || Date.now() - r.at >= REC_MS) {
        limit(r, 'Browser recording reached its limit (2 minutes or 128 MiB). The recorded part has been saved.');
        return false;
      }
      r.parts.push(buf); r.bytes += buf.byteLength;
      return true;
    },
    recStop: async (token) => {
      if (!rec || (token !== undefined && token !== rec.token)) return null;
      const r = rec;
      rec = null;
      clearInterval(r.timer);
      const name = `Toaster ${when()}.${r.ext}`;
      try { return download(r.parts, video(r.ext), name); }
      finally { r.parts.length = 0; }
    },
    onRecFailed: (fn) => { recFailed = fn; },
    recShow: async () => {},
    saveSong: async (name, midi, code) => {
      download([midi], 'audio/midi', `${name}.mid`);
      if (code) download([code], 'text/plain', `${name} (strudel).txt`);
      return `${name}.mid`;
    },
    saveClip: async (buf, ext) => download([buf], video(ext), `Toaster clip ${when()}.${ext}`),
  };
  // GitHub's star count for the star button (stars.js): asked once a visit and kept ten minutes in
  // the tab; null when it can't be had
  window.nc.stars = async () => {
    try { const kept = JSON.parse(sessionStorage.getItem('toaster-stars') || 'null'); if (kept && Date.now() - kept.at < 600000) return kept.n; } catch {}
    try {
      const r = await fetch('https://api.github.com/repos/StopBanning/toaster');
      const n = r.ok ? (await r.json()).stargazers_count : null;
      if (typeof n !== 'number') return null;
      try { sessionStorage.setItem('toaster-stars', JSON.stringify({ n, at: Date.now() })); } catch {}
      return n;
    } catch { return null; }
  };
})();
