// Toaster in a browser: what the app's own window gives the page (window.nc, see preload.js), done
// the browser's way where it can be: fullscreen the browser's own; a recording, an export or a clip
// saved as a download; Strudel opened in a new tab. Left out where a browser can't: the mini and
// 9:16 windows, the titles of what other apps are playing, the machine's own numbers, updates (the
// page is always the latest). Every call the app makes without asking first is here, if only to do
// nothing. Loaded first by the web build (tools/web.mjs), before boot.js.
(() => {
  const VERSION = "0.4.14"; // (the build writes the app's version here)
  // a file handed to the browser to save; its name back
  const download = (parts, type, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(parts, { type }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return name;
  };
  const when = () => {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
  };
  const video = (ext) => (ext === 'mp4' ? 'video/mp4' : 'video/webm');
  let rec = null;
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
    // a recording: the tab itself (see windowStream in app.js), its pieces kept as they come and
    // saved as one download at the end
    recSource: async () => 'tab',
    recStart: async (ext) => { rec = { ext, parts: [] }; return true; },
    recChunk: async (buf) => { if (!rec) return false; rec.parts.push(buf); return true; },
    recStop: async () => {
      if (!rec) return null;
      const r = rec;
      rec = null;
      return download(r.parts, video(r.ext), `Toaster ${when()}.${r.ext}`);
    },
    recShow: async () => {},
    saveSong: async (name, midi, code) => {
      download([midi], 'audio/midi', `${name}.mid`);
      if (code) download([code], 'text/plain', `${name} (strudel).txt`);
      return `${name}.mid`;
    },
    saveClip: async (buf, ext) => download([buf], video(ext), `Toaster clip ${when()}.${ext}`),
  };
  // the star links' count (the header's and the start menu's): GitHub's, asked once a visit and kept
  // ten minutes in the tab; left off when it can't be had
  const showStars = async () => {
    let n = null;
    try { const kept = JSON.parse(sessionStorage.getItem('toaster-stars') || 'null'); if (kept && Date.now() - kept.at < 600000) n = kept.n; } catch {}
    if (typeof n !== 'number') {
      try {
        const r = await fetch('https://api.github.com/repos/StopBanning/toaster');
        if (r.ok) n = (await r.json()).stargazers_count;
      } catch {}
      if (typeof n === 'number') try { sessionStorage.setItem('toaster-stars', JSON.stringify({ n, at: Date.now() })); } catch {}
    }
    if (typeof n === 'number') for (const el of document.querySelectorAll('.star-n')) el.textContent = n;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showStars);
  else showStars();
})();
