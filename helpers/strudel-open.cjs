// Where a strudel.cc link opens (O). The rebuilt song's sounds are served by Toaster from http://localhost:47283 (helpers/sound-server.cjs),
// and Safari's engine (WebKit) refuses an https page asking plain http, even on the same computer, so a rebuilt song opened in Safari is silent
// (Big Brother, Nov 24, finding 1; Safari is the default browser of every Mac). So on a Mac the rebuilt song's link goes to Chrome, or Edge, when
// one is installed. The live code has no sounds to fetch and plays in any browser, so it, and everything on Windows and Linux, opens the default
// browser as before. (Brave is not in the list: its own page says it blocks public sites from reaching localhost by default, and nobody has run it.)
//   openStrudel(url, { rebuilt, openExternal, ... }) -> null (not a strudel.cc link: nothing opened)
//     | { browser: 'Chrome' | 'Edge', plays: true }   (the rebuilt song, on a Mac: opened in it)
//     | { browser: 'default', plays: false }          (the rebuilt song, on a Mac with neither, or `open` failed: the default browser, which can't play the sounds if it is Safari)
//     | { browser: 'default', plays: null }           (the live code, or Windows, Linux: the default browser, as always; nothing is claimed)
// Everything the function touches comes in as a parameter, so the tests open no browser.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_LINK = 60000;
const BROWSERS = [{ name: 'Chrome', app: 'Google Chrome' }, { name: 'Edge', app: 'Microsoft Edge' }];

// The only links that go through: Strudel's own page with the code in the # (which stays in the browser), short enough to travel.
const isStrudelLink = (url) => typeof url === 'string' && url.startsWith('https://strudel.cc/#') && url.length < MAX_LINK;

// The first of Chrome, Edge installed on this Mac (in /Applications or the user's own Applications), or null.
function macBrowser({ exists = fs.existsSync, home = os.homedir() } = {}) {
  for (const b of BROWSERS) {
    for (const dir of ['/Applications', path.join(home, 'Applications')]) if (exists(path.join(dir, `${b.app}.app`))) return b;
  }
  return null;
}

// execFile's callback form, as a promise of whether it worked. (`open -a <app> <url>`: no shell, the link is one argument that starts with https.)
const run = (execFile, file, args) => new Promise((resolve) => {
  try { execFile(file, args, { timeout: 15000 }, (err) => resolve(!err)); } catch { resolve(false); }
});

async function openStrudel(url, { rebuilt = false, platform = process.platform, execFile, openExternal, exists, home } = {}) {
  if (!isStrudelLink(url)) return null;
  if (platform === 'darwin' && rebuilt === true) {
    const b = macBrowser({ exists, home });
    if (b && await run(execFile || require('node:child_process').execFile, 'open', ['-a', b.app, url])) return { browser: b.name, plays: true };
    await openExternal(url);
    return { browser: 'default', plays: false };
  }
  await openExternal(url);
  return { browser: 'default', plays: null };
}

module.exports = { openStrudel, macBrowser, isStrudelLink, BROWSERS, MAX_LINK };
