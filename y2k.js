// The drop effect "y2k bug" (B): the millennium bug on the XP takeover's desktop. The drop is midnight. The desktop
// comes up with the taskbar clock opened (Date/Time Properties, as double-clicking it does), the date and the time
// big: Fri 12/31/1999, 11:59:59 PM. On the first kick it rolls over to Mon 1/1/1900, 12:00:00 AM (the two-digit
// year's bug), its calendar to January 1900; each kick after that is a second. The program crashes on the kicks for five
// bars: cmd.exe consoles printing stack traces into the song's own lines, the debugger asking to attach, a memory dump
// of the live pattern, XP's application errors, cascading 24 px down and right, with Notepad's pattern.txt among them. For two bars
// the PC hangs: one error is dragged round under the hourglass, leaving a copy of itself every 16th. The last
// bar is Toaster's own blue screen (the "blue screen" drop effect's). On its last beat the screen's glass cracks where it's
// hit and, a 16th later, falls away in shards (slava3ngl's shattering PCs, inspo #28) onto the desktop, 11:59:59 again,
// which stays a beat after the bar, and the desktop goes. It wears the XP takeover's own windows, taskbar and icons (Colin: "the xp window aesthetic is
// better for design"), with an hourglass drawn here pixel by pixel. It shares the XP takeover's layers
// (#desk-back, #desk-front): one or the other is up, never both. Everything on it is where the clock says (the
// drag, the flashes, the blue screen's count), and a copy is made on its kick's own step, so a render draws it
// the same at 30 frames a second as at 60. With fewer flashes on, the bars don't flash.
import { clock } from './clock.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BARS = 8, HANG = 5, BSOD = 7; // bars from the drop: errors until the hang (bars 5 and 6), the blue screen on the last
const MAX_WINDOWS = 12, MAX_COPIES = 40, STEP = 24; // (the cascade: each window 24 px down and right of the last)
// where each stack of four starts (shares of the screen), kept off the big clock: on a tall screen under it, on a
// wide one to its right and below
const STACKS_TALL = [[0.05, 0.36], [0.22, 0.5], [0.03, 0.64], [0.26, 0.4]];
const STACKS_WIDE = [[0.52, 0.08], [0.6, 0.38], [0.08, 0.5], [0.34, 0.56]];
const FLASHES = ['#ffffff', '#cfe3ff', '#c8c8c8', '#9fd0ff']; // (white, ice, grey, sky: the punctuation of the error-screen videos)
const ICONS = [['My Computer', 'program'], ['Recycle Bin', 'folder'], ['kick.wav', 'sound'], ['bassline.js', 'script'], ['y2k_fix.exe', 'program'], ['party99.mp3', 'sound'], ['strudel', 'folder']];

// the song as a file name, as a programmer's: 'Kernkraft 400' -> kernkraft_400.js
const fileOf = (song) => ((song || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'song') + '.js';
// The crash is the program's: consoles printing stack traces into the song's own lines, the debugger asking to attach, a memory
// dump scrolling the live pattern, and XP's own application errors (Colin: "more programmer coded"). A console prints a line a
// 16th, so a stack trace runs out with the music.
function errors(song) {
  const f = fileOf(song), at = (fn, l, c) => `    at ${fn} (${f}:${l}:${c})`;
  return [
    { kind: 'cmd', lines: [`C:\\toaster> node ${f}`, '', 'RangeError: year 1900 is out of range', at('kick', 4, 12), '    at Pattern.query (pattern.mjs:118:20)', '    at Cyclist.tick (cyclist.mjs:96:7)', '    at Timeout._onTimeout (node:timers:581:17)'] },
    { kind: 'box', title: 'Visual Studio Just-In-Time Debugger', icon: 'error', text: `An unhandled exception ('Y2KException') occurred in toaster.exe [1900]. Do you want to debug ${f}?`, buttons: ['Yes', 'No'] },
    { kind: 'cmd', lines: [`TypeError: Cannot read 'drop' of undefined`, at('bassline', 9, 3), at('arrange', 14, 22), '    at Scheduler.onTick (scheduler.mjs:61:9)', '', 'Node.js v1900.0.0'] },
    { kind: 'hex' },
    { kind: 'box', title: 'toaster.exe - Application Error', icon: 'error', text: 'The exception unknown software exception (0xc0001900) occurred in the application at location 0x19000101.', buttons: ['OK', 'Cancel'] },
    { kind: 'cmd', lines: ['<--- Last few GCs --->', '[1900] 1999 ms: Mark-sweep 2038 -> 2038 MB', '', 'FATAL ERROR: Reached heap limit', '  JavaScript heap out of memory', ' 1: 0x1900 node::OOMErrorHandler', ' 2: 0x1901 v8::Utils::ReportOOMFailure'] },
    { kind: 'cmd', lines: ['C:\\toaster> npm install y2k-fix', 'npm ERR! code E1900', `npm ERR! y2k-fix@1.0.0 postinstall: \`node fix.js\``, 'npm ERR! Exit status 1900', 'npm ERR! clap.dll expired on 12/31/1999', 'npm ERR! A complete log of this run is in:', 'npm ERR!   C:\\toaster\\_logs\\1900-01-01.log'] },
    { kind: 'box', title: 'hihat.vxd', icon: 'warning', text: `Assertion failed: year > 1999, file ${f}, line 7`, buttons: ['Abort', 'Retry', 'Ignore'] },
  ];
}
// the one dragged round while the PC hangs: XP's access violation
const HUNG = { title: 'toaster.exe - Application Error', icon: 'error', text: 'The instruction at "0x19000101" referenced memory at "0x00000000". The memory could not be "read".', buttons: ['OK', 'Cancel'] };
// the drag: a sweeping S across and down the screen, as a hand whips a frozen window round (u: 0-1 over the two bars; shares of
// the room the window has). A copy is left every 16th, so the copies make one dense ribbon along it.
const drag = (u) => [0.5 + 0.44 * Math.sin(u * Math.PI * 2), 0.04 + 0.78 * u + 0.1 * Math.sin(u * Math.PI * 4)];

// ---- the hourglass, pixel by pixel: rows of letters, one a pixel ('.' clear), as an SVG (sharp at any size)
function pix(rows, ink) {
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      let n = 1;
      while (row[x + n] === row[x]) n++;
      if (row[x] !== '.') rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${ink[row[x]]}"/>`;
      x += n;
    }
  });
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${rows[0].length}" height="${rows.length}" shape-rendering="crispEdges">${rects}</svg>`)}")`;
}
const INK = { k: '#000', w: '#fff', s: '#c0c0c0', d: '#808080', r: '#ff0000', m: '#800000', y: '#ffff00', b: '#0000ff', n: '#000080', t: '#008080', o: '#808000', l: '#dfdfdf' };
const PICS = {
  // the hourglass, the PC busy
  hourglass: pix([
    'kkkkkkkkkkkkkk', 'kwwwwwwwwwwwwk', 'kkkkkkkkkkkkkk', '.kwwwwwwwwwwk.', '.kwkkkkkkkkwk.', '.kwwkkkkkkwwk.', '..kwwkkkkwwk..', '...kwwkkwwk...',
    '....kwwwwk....', '.....kwwk.....', '.....kwwk.....', '....kwwwwk....', '...kwwwkwwk...', '..kwwwwkwwwk..', '.kwwwwkkkwwwk.', '.kwwwkkkkkwwk.',
    '.kwwkkkkkkkwk.', 'kkkkkkkkkkkkkk', 'kwwwwwwwwwwwwk', 'kkkkkkkkkkkkkk']
  , INK),
};
let pictured = false;
function picture(root) {
  if (pictured) return;
  pictured = true;
  for (const [k, v] of Object.entries(PICS)) root.style.setProperty(`--y2k-${k}`, v);
}

// An XP window, as the takeover's (fx.js): a message box (icon, text, buttons) or Notepad
function y2kWindow({ title, kind = 'box', icon = 'error', text = '', buttons = ['OK'], lines = [] }) {
  const el = document.createElement('div');
  el.className = kind === 'cmd' || kind === 'hex' ? `xp ${kind}` : 'xp';
  if (kind === 'cmd') title = 'C:\\WINDOWS\\system32\\cmd.exe';
  if (kind === 'hex') title = 'Memory 1 - toaster.exe [1900]';
  const ctl = kind === 'box' ? '<i class="x"></i>' : '<i class="min"></i><i class="max"></i><i class="x"></i>';
  const body = kind === 'notepad'
    ? '<div class="xp-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div><pre class="xp-note"></pre>'
    : kind === 'cmd' ? '<pre class="xp-cmd"></pre>'
    : kind === 'hex' ? '<div class="xp-menu"><span>Address:</span><span>0x19000101</span></div><pre class="xp-hex"></pre>'
    : `<div class="xp-msg"><i class="xp-icon ${icon}"></i><p>${esc(text)}</p></div>`
      + `<div class="xp-btns">${buttons.map((b, i) => `<button tabindex="-1"${i === 0 ? ' class="def"' : ''}>${esc(b)}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="xp-title"><span>${esc(title)}</span><span class="xp-ctl">${ctl}</span></div><div class="xp-frame">${body}</div>`;
  el.kind = kind;
  el.title = title;
  el.icon = icon;
  el.lines = lines;
  return el;
}
// a console's text at t: a line every 16th since it opened, and the cursor (lines that are errors are bright)
function cmdText(lines, shown) {
  const out = lines.slice(0, shown).map((l) => (/Error|ERR!|FATAL|fault/.test(l) ? `<b>${esc(l)}</b>` : esc(l)));
  return out.join('\n') + (shown >= lines.length ? '\n\nC:\\toaster> _' : '_');
}
// a memory dump of the live pattern's text, scrolled a row every 16th: address, 8 bytes in hex, the bytes as text
function hexText(text, row) {
  const bytes = Array.from(text || 'bd*4', (ch) => ch.charCodeAt(0) & 255), rows = [];
  for (let r = 0; r < 9; r++) {
    const at = ((row + r) * 8) % Math.max(8, bytes.length), part = [];
    for (let k = 0; k < 8; k++) part.push(bytes[(at + k) % bytes.length]);
    const addr = (0x19000100 + (row + r) * 8).toString(16).toUpperCase().padStart(8, '0');
    rows.push(`${addr}  ${part.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}  ${part.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')}`);
  }
  return esc(rows.join('\n'));
}

// The taskbar clock opened: Date/Time Properties, its time big, its month's calendar with the day picked
function dateTimeWindow() {
  const el = document.createElement('div');
  el.className = 'xp datetime';
  el.innerHTML = '<div class="xp-title"><span>Date and Time Properties</span><span class="xp-ctl"><i class="help"></i><i class="x"></i></span></div>'
    + '<div class="xp-frame"><div class="dt-tabs"><span class="on">Date &amp; Time</span><span>Time Zone</span><span>Internet Time</span></div>'
    + '<div class="dt-sheet"><div class="dt-time"><div class="dt-date"></div><div class="dt-clock"></div></div><div class="dt-row"><div class="dt-month"></div><div class="dt-cal"></div></div>'
    + '<p class="dt-zone">Current time zone: Eastern Standard Time</p></div>'
    + '<div class="xp-btns"><button tabindex="-1" class="def">OK</button><button tabindex="-1">Cancel</button><button tabindex="-1">Apply</button></div></div>';
  el.kind = 'box';
  el.title = 'Date/Time Properties';
  el.icon = 'info';
  return el;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// the weekday of a date (0 Sunday; m 0-11), Sakamoto's way, and a month's length: from the date alone, never the time now
const weekday = (y, m, d) => { const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]; if (m < 2) y -= 1; return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m] + d) % 7; };
const leap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
function calendar(y, m, d) {
  const first = weekday(y, m, 1), days = [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((n) => `<b>${n}</b>`).join('') + '<i></i>'.repeat(first);
  for (let n = 1; n <= days; n++) html += `<i${n === d ? ' class="on"' : ''}>${n}</i>`;
  return html;
}
const EVE = ['11:59:59 PM', [1999, 11, 31], '11:59 PM'], MIDNIGHT = ['12:00:00 AM', [1900, 0, 1], '12:00 AM'];

// ---- the shatter: cracks from where the glass is hit (rays, and rings round it at each ray's own radii, so neighbours share their
// corners), cut into shards that fly out from the hit and fall. Seeded by the drop's time, so a render breaks it the same as live.
const RAYS = 11, RINGS = 4, GRAVITY = 2.6; // (gravity in screen heights a second squared)
function seeded(seed) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
export function shardsOf(w, h, seed) {
  const r = seeded(seed), hx = w * (0.38 + 0.24 * r()), hy = h * (0.36 + 0.22 * r()), far = Math.hypot(w, h) * 1.1;
  const rays = Array.from({ length: RAYS }, (_, i) => (i + 0.2 + 0.6 * r()) / RAYS * Math.PI * 2);
  const radii = rays.map(() => [0, ...Array.from({ length: RINGS - 1 }, (_, k) => far * ((k + 1) / RINGS) ** 1.7 * (0.75 + 0.5 * r())), far]);
  const at = (i, k) => { const a = rays[i % RAYS], d = radii[i % RAYS][k]; return [hx + Math.cos(a) * d, hy + Math.sin(a) * d]; };
  const out = [];
  for (let i = 0; i < RAYS; i++) {
    for (let k = 0; k < RINGS; k++) {
      const pts = k ? [at(i, k), at(i, k + 1), at(i + 1, k + 1), at(i + 1, k)] : [at(i, 0), at(i, 1), at(i + 1, 1)];
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const dx = cx - hx, dy = cy - hy, dist = Math.hypot(dx, dy) || 1, push = 0.55 * h / (1 + dist / (0.25 * h)); // (the ones by the hit fly hardest)
      out.push({ pts, cx, cy, vx: (dx / dist) * push, vy: (dy / dist) * push - 0.15 * h * r(), spin: (r() - 0.5) * 540, tilt: (r() - 0.5) * 160 });
    }
  }
  const lines = rays.map((_, i) => [[hx, hy], ...radii[i].slice(1, RINGS).map((_, k) => at(i, k + 1))]);
  for (let k = 1; k < RINGS; k++) for (let i = 0; i < RAYS; i++) lines.push([at(i, k), at(i + 1, k)]);
  return { hit: [hx, hy], shards: out, lines };
}

export function createY2k({ back, front, bsod }) {
  let active = false, began = 0, barLen = 2, until = 0, song = '';
  let nextCopy = 0, rolled = false, secs = 0, wins = [], copies = [], hung = null, spawned = 0, note = null, home = false, dt = null;
  const big = back.querySelector('.big'), icons = back.querySelector('.icons'), winLayer = front.querySelector('.wins');
  const tasks = front.querySelector('.tasks'), trayClock = front.querySelector('.clock');
  const add = (cls, html = '', under = false) => { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; el.hidden = true; if (under) front.prepend(el); else front.append(el); return el; };
  const flash = add('y2k-flash', '', true); // (under the windows, as the XP takeover's)
  const glass = add('y2k-hourglass');
  const pct = bsod?.querySelector('.pct'); // (the app's own blue screen, shown for the last bar)
  const shatter = document.createElement('div'); // (the blue screen in pieces, over it and the desktop)
  shatter.className = 'y2k-shatter'; shatter.hidden = true; shatter.setAttribute('aria-hidden', 'true');
  (bsod || front).after(shatter);
  let cut = null, pieces = [];
  let blue = false;
  const showBlue = (on, t) => {
    if (!bsod || on === blue) return;
    blue = on;
    if (on) bsod.dataset.born = t; // (its fade starts on the bar line, not the frame that shows it: dom-time.js)
    bsod.classList.toggle('show', on);
  };
  const barAt = (t) => Math.floor((t - began) / barLen);
  // the crack: where it's hit and the lines, over the blue screen
  function crack() {
    cut = shardsOf(innerWidth, innerHeight, Math.floor(began * 1000) | 0);
    const d = cut.lines.map((l) => 'M' + l.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')).join('');
    shatter.innerHTML = `<svg viewBox="0 0 ${innerWidth} ${innerHeight}"><path d="${d}"/></svg>`;
    shatter.hidden = false;
  }
  // the fall: the blue screen goes, and a copy of it for each shard, cut to its piece, takes its place
  function breakGlass() {
    if (!cut) crack();
    shatter.innerHTML = '';
    pieces = cut.shards.map((p) => {
      const el = bsod ? bsod.cloneNode(true) : document.createElement('div');
      el.removeAttribute('id'); el.removeAttribute('data-born'); el.className = 'bsod-shard';
      el.style.clipPath = `polygon(${p.pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
      const glassEl = document.createElement('div'); // (unclipped round it, so its glow lights the piece's edges: glass)
      glassEl.className = 'glass';
      glassEl.style.transformOrigin = `${p.cx.toFixed(1)}px ${p.cy.toFixed(1)}px`;
      glassEl.append(el);
      shatter.append(glassEl);
      return glassEl;
    });
  }
  function fall(u) {
    const h = innerHeight;
    cut.shards.forEach((p, i) => {
      const x = p.vx * u, y = p.vy * u + 0.5 * GRAVITY * h * u * u;
      pieces[i].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateZ(${(p.spin * u).toFixed(1)}deg) rotate3d(1, .4, 0, ${(p.tilt * u).toFixed(1)}deg)`;
      pieces[i].style.opacity = Math.max(0, 1 - Math.max(0, u - 0.45) / 0.35).toFixed(3);
    });
  }
  function clearShatter() { shatter.hidden = true; shatter.innerHTML = ''; cut = null; pieces = []; }
  const pad = (n) => String(n).padStart(2, '0');

  function setClock([time, [y, m, d], tray]) {
    dt.querySelector('.dt-date').textContent = `${DAYS[weekday(y, m, d)]} ${m + 1}/${d}/${y}`;
    dt.querySelector('.dt-clock').textContent = time;
    dt.querySelector('.dt-month').textContent = `${MONTHS[m]} ${y}`;
    dt.querySelector('.dt-cal').innerHTML = calendar(y, m, d);
    trayClock.textContent = tray;
  }
  // the Date/Time window as wide as the screen allows (560 px at most), its date and time as big as fits in it (the year is
  // the joke, so it's as big as the time) The blue screen's
  // text the same way.
  function fit() {
    const c = (fit.c ||= document.createElement('canvas').getContext('2d'));
    c.font = 'bold 16px Tahoma, sans-serif';
    const w = Math.max(...['Fri 12/31/1999', 'Mon 1/1/1900', '11:59:59 PM', '12:00:00 AM'].map((s) => c.measureText(s).width)) || 110, winW = Math.min(innerWidth - 16, 560);
    dt.style.width = winW + 'px';
    dt.querySelector('.dt-time').style.fontSize = Math.max(24, Math.min(80, Math.floor((16 * (winW - 48)) / w), Math.floor(innerHeight / 14))) + 'px';
  }
  const closeWindow = (w) => { w.task?.remove(); w.remove(); };
  function taskButton(el) {
    for (const b of tasks.children) b.classList.remove('on');
    const b = document.createElement('div');
    b.className = `task on ${el.kind} ${el.icon || ''}`;
    b.innerHTML = `<i></i><span>${esc(el.title)}</span>`;
    tasks.append(b);
    el.task = b;
  }
  function place(el, x, y) {
    const w = el.offsetWidth || 300, h = el.offsetHeight || 140;
    el.style.left = Math.round(Math.max(2, Math.min(innerWidth - w - 2, x))) + 'px';
    el.style.top = Math.round(Math.max(2, Math.min(innerHeight - h - 32, y))) + 'px';
  }
  // the next error, in stacks of four, each 24 px down and right of the last; Notepad third, once
  function spawn() {
    const all = errors(song);
    const el = spawned === 2 && !note ? (note = y2kWindow({ title: 'pattern.txt - Notepad', kind: 'notepad' })) : y2kWindow(all[(spawned - (note ? 1 : 0)) % all.length]);
    el.dataset.born = clock.now(); // (XP's pop starts on its kick's step, not the frame that shows it: dom-time.js)
    winLayer.append(el);
    const stacks = innerHeight > innerWidth ? STACKS_TALL : STACKS_WIDE;
    const [ax, ay] = stacks[Math.floor(spawned / 4) % stacks.length], k = spawned % 4;
    place(el, ax * innerWidth + k * STEP, ay * innerHeight + k * STEP);
    taskButton(el);
    wins.push(el);
    spawned++;
    // too many: the oldest goes (Notepad stays)
    while (wins.length > MAX_WINDOWS) {
      const i = wins.findIndex((w) => w !== note);
      closeWindow(wins.splice(i, 1)[0]);
    }
  }
  // the hang: where the dragged window is at t
  function hangAt(t) {
    const u = Math.min(1, Math.max(0, (t - (began + HANG * barLen)) / (2 * barLen)));
    const w = hung.offsetWidth || 340, h = hung.offsetHeight || 140, [fx, fy] = drag(u);
    return [fx * (innerWidth - w), fy * (innerHeight - h - 32)];
  }
  function startHang(t) {
    hung = y2kWindow(HUNG);
    hung.dataset.born = t; // (and its copies share it: they're made after its pop, so they don't pop)
    winLayer.append(hung);
    taskButton(hung);
    glass.hidden = false;
  }
  function moveHung(t) {
    const [x, y] = hangAt(t);
    place(hung, x, y);
    const r = hung.getBoundingClientRect();
    glass.style.left = Math.round(r.left + Math.min(150, r.width * 0.45)) + 'px';
    glass.style.top = Math.round(r.top + 6) + 'px';
  }
  // a copy where the dragged window is on this kick, under it
  function stamp(t) {
    if (!hung) startHang(t);
    moveHung(t);
    const c = hung.cloneNode(true);
    c.classList.add('copy');
    winLayer.insertBefore(c, hung);
    copies.push(c);
    if (copies.length > MAX_COPIES) copies.shift().remove();
  }
  // every window (the clock's too, unless it's kept)
  function clearAll(keepClock = false) {
    wins.forEach(closeWindow);
    copies.forEach((c) => c.remove());
    if (hung) closeWindow(hung);
    wins = []; copies = []; hung = null; note = null;
    glass.hidden = true;
    if (!keepClock && dt) { closeWindow(dt); dt = null; }
  }

  return {
    get active() { return active; },
    // the hourglass's picture, made once
    prepare() {
      picture(document.documentElement);
    },
    start(t, title, barSeconds) {
      this.prepare();
      if (active) clearAll();
      active = true;
      began = t;
      barLen = barSeconds;
      until = t + barSeconds * BARS;
      song = title || '';
      rolled = false; secs = 0; spawned = 0; home = false;
      back.classList.add('on', 'y2k');
      front.classList.add('on', 'y2k');
      big.textContent = (title || 'year 2000').toUpperCase().slice(0, 28); // (the song's name big on the desktop, as the XP takeover's)
      icons.innerHTML = ICONS.map(([n, k]) => `<div class="icon ${k}"><i></i><span>${esc(n)}</span></div>`).join('');
      tasks.innerHTML = '';
      dt = dateTimeWindow();
      dt.dataset.born = t;
      winLayer.append(dt);
      taskButton(dt);
      setClock(EVE);
      fit();
      place(dt, (innerWidth - dt.offsetWidth) / 2, innerHeight * (innerHeight > innerWidth ? 0.05 : 0.08));
      showBlue(false);
      clearShatter();
      flash.hidden = true;
    },
    kick() {
      if (!active) return;
      const t = clock.now(), bar = barAt(t);
      if (t - began < barLen / 8 || t >= until || bar >= BSOD) return; // (the drop's own kick, up to half a beat on: midnight is the next one)
      if (!rolled) {
        rolled = true;
        setClock(MIDNIGHT);
        return;
      }
      secs = Math.min(59, secs + 1);
      dt.querySelector('.dt-clock').textContent = `12:00:${pad(secs)} AM`;
      if (bar < HANG) spawn();
    },
    stop() {
      if (!active && !back.classList.contains('y2k')) return;
      active = false;
      clearAll();
      clearShatter();
      tasks.innerHTML = '';
      showBlue(false);
      flash.hidden = true;
      big.innerHTML = '';
      icons.innerHTML = '';
      back.classList.remove('on', 'y2k');
      front.classList.remove('on', 'y2k');
    },
    // gridText: the drum grid, for Notepad; calm: fewer flashes (none)
    draw(t, gridText, calm = false) {
      if (!active) return;
      const bar = barAt(t);
      // no kick a beat in (a drop on silence, D in a quiet part): midnight anyway
      if (!rolled && t - began >= barLen / 4 + 0.05) { rolled = true; setClock(MIDNIGHT); }
      if (bar >= HANG && bar < BSOD) {
        // the hang: the window where the clock says, and a copy at every 16th since the last frame, each where the window was then
        const hangAt0 = began + HANG * barLen, step = barLen / 16;
        if (!hung) { startHang(hangAt0); nextCopy = hangAt0; }
        while (nextCopy <= t) { stamp(nextCopy); nextCopy += step; }
        moveHung(t);
      }
      if (note) note.querySelector('pre').textContent = gridText;
      // the consoles print a line a 16th and the memory dump scrolls a row a 16th, from when each opened (the clock's time, so 30 fps draws what 60 does)
      for (const w of wins) {
        if (w.kind !== 'cmd' && w.kind !== 'hex') continue;
        const n = Math.max(0, Math.floor((t - Number(w.dataset.born)) / (barLen / 16) + 1e-6));
        if (w.kind === 'cmd') {
          const shown = Math.min(w.lines.length, 1 + n);
          if (w.shown !== shown) { w.shown = shown; w.querySelector('pre').innerHTML = cmdText(w.lines, shown); }
        } else if (w.row !== n || w.text !== gridText) { w.row = n; w.text = gridText; w.querySelector('pre').innerHTML = hexText(gridText, n); }
      }
      // a flash on each bar's first 90 ms, the errors' bars and the hang's
      const lit = !calm && bar >= 1 && bar < BSOD && t - (began + bar * barLen) < 0.09;
      flash.hidden = !lit;
      if (lit) flash.style.background = FLASHES[(bar - 1) % FLASHES.length];
      // the last bar: Toaster's own blue screen, its percentage counting up an 8th at a time; on its last beat the glass cracks,
      // and a 16th later it falls away in shards
      const crackAt = began + (BSOD + 0.75) * barLen, fallAt = crackAt + barLen / 16;
      const onBlue = bar === BSOD && t < fallAt;
      showBlue(onBlue, began + BSOD * barLen);
      if (onBlue && pct) pct.textContent = Math.min(100, Math.floor((t - (began + BSOD * barLen)) / (barLen / 8)) * 15);
      if (t >= crackAt && t < fallAt && !cut) crack();
      if (t >= fallAt && !pieces.length) breakGlass();
      if (pieces.length) fall(t - fallAt);
      // under it, 11:59:59 again on an empty desktop, a beat past the bar
      if (t >= fallAt && !home) { home = true; clearAll(true); setClock(EVE); }
      if (t >= until + barLen / 4) this.stop();
    },
  };
}
