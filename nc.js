// Toaster in a browser: what the app's own window gives the page (window.nc, see preload.js), done
// the browser's way where it can be: fullscreen the browser's own; a recording, an export or a clip
// saved as a download; Strudel opened in a new tab. Left out where a browser can't: the mini and
// 9:16 windows, the titles of what other apps are playing, the machine's own numbers, updates (the
// page is always the latest). Every call the app makes without asking first is here, if only to do
// nothing. Loaded first by the web build (tools/web.mjs), before boot.js.
(() => {
  const VERSION = "0.4.16"; // (the build writes the app's version here)
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
    roll(typeof n === 'number' ? n : null);
  };
  // the count rolls up from nothing on odometer wheels, each turning only as the one below it rolls
  // over, while the star fills with gold from the bottom; on the count the star bursts in a spray of
  // glyphs. Without motion: the count and the gold star as they end. (No count: the star fills alone.)
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wheel = (v, k) => {
    const p = 10 ** k;
    return k === 0 ? v % 10 : (Math.floor(v / p) + Math.min(1, Math.max(0, (v % p) - (p - 1)))) % 10;
  };
  const roll = (n) => {
    const stars = [...document.querySelectorAll('.star-i')], counts = [...document.querySelectorAll('.star-n')];
    const fill = (f) => { for (const s of stars) s.style.setProperty('--fill', f); };
    if (still || n === null) {
      fill(1);
      if (n !== null) for (const el of counts) el.textContent = n;
      return;
    }
    const digits = String(n).length, cols = [];
    for (const el of counts) {
      el.textContent = '';
      const said = document.createElement('span');
      said.className = 'odo-n'; said.textContent = n;
      el.append(said);
      for (let k = digits - 1; k >= 0; k--) {
        const col = document.createElement('span'), strip = document.createElement('span');
        col.className = 'odo-d'; col.setAttribute('aria-hidden', 'true');
        if (k) col.style.opacity = 0;
        strip.className = 'odo-s'; strip.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0';
        col.append(strip); el.append(col);
        // (a wheel is a line of the link's own text high, so its digits sit on the text's baseline)
        const pitch = strip.getBoundingClientRect().height / 11;
        if (pitch) col.style.height = pitch + 'px';
        cols.push({ k, col, strip, pitch });
      }
    }
    const T = 1500, t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / T), e = 1 - (1 - u) ** 3, v = n * e;
      for (const { k, col, strip, pitch } of cols) {
        strip.style.transform = pitch ? `translateY(${(-wheel(v, k) * pitch).toFixed(2)}px)` : `translateY(${(-wheel(v, k) * 1.32).toFixed(3)}em)`;
        if (k) col.style.opacity = Math.min(1, Math.max(0, v - (10 ** k - 1)));      // (no leading zeros)
      }
      fill(u);                                                                      // (filling steadily, full on the count)
      if (u < 1) requestAnimationFrame(step);
      else burst(stars);
    };
    requestAnimationFrame(step);
  };
  const SPARKS = ['✦', '*', '·', '+', '★', '•'];
  const burst = (stars) => {
    for (const star of stars) {
      const r = star.getBoundingClientRect();
      if (!r.width) continue;                       // (one not showing: the start menu closed)
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      for (let i = 0; i < 12; i++) {
        const s = document.createElement('span');
        s.className = 'star-spark'; s.textContent = SPARKS[i % SPARKS.length];
        s.style.left = x + 'px'; s.style.top = y + 'px';
        document.body.append(s);
        const a = (i / 12 + Math.random() * 0.05) * 2 * Math.PI, d = 14 + Math.random() * 16;
        s.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)) scale(.4)`, opacity: 0 },
        ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2, .7, .3, 1)' }).onfinish = () => s.remove();
      }
      star.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showStars);
  else showStars();
})();
