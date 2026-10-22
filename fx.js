// Drop effects, error messages and the machine readout.
// - Takeover: on a drop (or the D key), the screen becomes a desktop (huge title text, yellow
//   folders) and windows pop open on every kick: webcam windows in each theme colour, an XP
//   message box, a little blue screen and Notepad. After the "Give it 2 me" malware music video.
//   Lasts 8 bars.
// - XP alerts: real errors (like "couldn't capture audio") use the same message box.
// - Blue screen: the Windows crash screen, for a moment.
// - Machine readout: OS, CPU, RAM and screen as a const object.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ICONS = ['kick.wav', 'clap.wav', 'vox_chop.wav', 'bassline.js', 'hardcore_software.zip', 'memory_leak.exe', 'airglow.mp3', 'strudel'];

// Classic XP messages, rewritten around the music (Memory Leak, Hard Refresh and Always Learning
// are tracks on Hardcore Software).
function messages(song) {
  const name = (song || 'toaster').replace(/\s+/g, ' ').slice(0, 32);
  return [
    { title: 'kick.exe', icon: 'error', text: 'kick.exe has encountered a problem and needs to close. We are sorry for the inconvenience.', buttons: ['Debug', 'Send Error Report', "Don't Send"] },
    { title: 'Low Disk Space', icon: 'warning', text: 'You are running out of bass on Local Disk (C:). Click here to see if you can free space on this drive.', buttons: ['OK'] },
    { title: 'bassline.dll - Application Error', icon: 'error', text: 'The instruction at "0x0012f4d0" referenced memory at "0x00000000". The memory could not be "read".', buttons: ['OK', 'Cancel'] },
    { title: `${name}`, icon: 'error', text: `${name} is not responding. If you close the program, you might lose the vibe.`, buttons: ['End Now', 'Cancel'] },
    { title: 'Memory Leak', icon: 'warning', text: 'Your system is low on virtual memory. Windows is increasing the size of your bass paging file.', buttons: ['OK'] },
    { title: 'Confirm Drop', icon: 'question', text: 'Are you sure you want to drop the bass?', buttons: ['Yes', 'No'] },
    { title: 'Hard Refresh', icon: 'info', text: 'A hard refresh is required. Save your work and keep dancing.', buttons: ['OK'] },
    { title: 'Always Learning', icon: 'info', text: 'Windows has finished installing new music. Your computer will dance in 10 seconds.', buttons: ['Restart Now', 'Restart Later'] },
  ];
}

// With the camera on, most pop-ups are webcam windows (some closing in on your face, some on an
// eye) and little computer screens showing one eye; the rest are a message box, a little blue
// screen and Notepad. Without it, those three take turns.
const MAX_WINDOWS = 8;
const PLAN_CAM = ['cam', 'screen', 'box', 'cam', 'bsod', 'cam', 'notepad', 'cam'];
const PLAN_NO_CAM = ['box', 'notepad', 'bsod'];
// One webcam window per theme colour, each with its own effect.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const CAMS = [
  { title: 'facecam.exe', fx: 'face', bg: '#010a03', fg: '#3dff76', w: 230, h: 172 },
  { title: 'webcam.exe', fx: 'plain', bg: '#051db5', fg: '#ffffff', w: 280, h: 175 },
  { title: 'eye.exe', fx: 'eye', bg: '#000000', fg: '#ffffff', w: 260, h: 130 },
  { title: 'Photo Booth', fx: 'tile', bg: '#16000d', fg: '#ff5cbf', w: 300, h: 188 },
  { title: 'cam_02.exe', fx: 'pixel', bg: '#000000', fg: '#ffffff', w: 240, h: 150 },
  { title: 'Webcam Viewer', fx: 'mirror', bg: '#ffffff', fg: '#000000', w: 260, h: 163 },
].map((c) => ({ ...c, bg: hex(c.bg), fg: hex(c.fg) }));
// The little computer screens glow green or white, one after the other.
const SCREENS = [{ bg: '#010a03', fg: '#3dff76' }, { bg: '#020b45', fg: '#e8eeff' }].map((c) => ({ bg: hex(c.bg), fg: hex(c.fg) }));

// An XP (Luna) window. kind: 'box' (message box: icon, text, buttons; list: lines under the text,
// each [key, what]), 'cam', or 'notepad'.
function xpWindow({ title, kind = 'box', icon, text, list = null, buttons = ['OK'], w = 240, h = 150 }) {
  const el = document.createElement('div');
  el.className = 'xp';
  const controls = kind === 'box' ? '<i class="x"></i>' : '<i class="min"></i><i class="max"></i><i class="x"></i>';
  let body;
  if (kind === 'cam') body = `<div class="xp-cam"><canvas width="${w}" height="${h}"></canvas></div>`;
  else if (kind === 'notepad') body = '<div class="xp-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div><pre class="xp-note"></pre>';
  else {
    const said = list ? `<div><p>${esc(text)}</p><ul class="xp-list">${list.map(([k, t]) => `<li><kbd>${esc(k)}</kbd><span>${esc(t)}</span></li>`).join('')}</ul></div>` : `<p>${esc(text)}</p>`;
    body = `<div class="xp-msg"><i class="xp-icon ${icon}"></i>${said}</div>`
      + `<div class="xp-btns">${buttons.map((b, i) => `<button tabindex="-1" class="${i === 0 ? 'def' : ''}">${esc(b)}</button>`).join('')}</div>`;
  }
  el.innerHTML = `<div class="xp-title"><span>${esc(title)}</span><span class="xp-ctl">${controls}</span></div><div class="xp-frame">${body}</div>`;
  el.kind = kind;
  el.title = title;
  return el;
}

// A little CRT computer screen (beige, with scanlines and a power light) showing one eye up close.
function crtScreen(look, which) {
  const el = document.createElement('div');
  el.className = 'crt';
  el.innerHTML = '<div class="crt-glass"><canvas width="200" height="150"></canvas></div><i class="crt-led"></i>';
  el.kind = 'cam';
  el.fx = 'eye';
  el.look = look;
  el.which = which;
  return el;
}

// A little blue screen, like the full-screen drop effect, in a thin monitor bezel. Its
// "% complete" counts up while it's open.
function miniBsod() {
  const el = document.createElement('div');
  el.className = 'mini-bsod';
  el.innerHTML = '<div class="face">:(</div>'
    + "<p>Your PC ran into a drop and needs to dance. We're just collecting some bass, and then we'll restart for you.</p>"
    + '<p><span class="pct">0</span>% complete</p>'
    + '<div class="foot"><i class="qr"></i><small>For more information about this issue, keep listening<br />Stop code: BASS_DROP_DETECTED</small></div>';
  el.kind = 'bsod';
  el.pct = 0;
  return el;
}

// A real message for the user, as an XP message box in the middle of the screen.
export function xpAlert(layer, { title = 'toaster.exe', icon = 'error', text, list = null, buttons = ['OK'] }) {
  layer.innerHTML = '';
  const el = xpWindow({ title, icon, text, list, buttons });
  for (const b of el.querySelectorAll('button, .xp-ctl i')) {
    b.tabIndex = 0;
    b.addEventListener('click', () => el.remove());
  }
  layer.append(el);
  el.querySelector('button')?.focus();
}

// Draws the webcam into a pop-up: tinted in that window's colours, then given its effect.
// frame is the camera picture as light levels (see createWebcam in visuals.js).
const tiny = document.createElement('canvas');
tiny.width = 40;
tiny.height = 25;
function drawCam(w, frame) {
  if (!w.tint || w.tint.width !== frame.w || w.tint.height !== frame.h) {
    w.tint = Object.assign(document.createElement('canvas'), { width: frame.w, height: frame.h });
    w.tintCtx = w.tint.getContext('2d');
    w.img = w.tintCtx.createImageData(frame.w, frame.h);
  }
  const d = w.img.data, [br, bg, bb] = w.look.bg, [fr, fg, fb] = w.look.fg, lum = frame.lum;
  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    const v = lum[p] / 255;
    d[i] = br + (fr - br) * v;
    d[i + 1] = bg + (fg - bg) * v;
    d[i + 2] = bb + (fb - bb) * v;
    d[i + 3] = 255;
  }
  w.tintCtx.putImageData(w.img, 0, 0);
  const cam = w.tint, c = w.cam, W = c.canvas.width, H = c.canvas.height;
  // crop the picture to the window's shape
  let sx = 0, sy = 0, sw = frame.w, sh = frame.h;
  if (sw / sh > W / H) { const nw = sh * (W / H); sx += (sw - nw) / 2; sw = nw; }
  else { const nh = sw / (W / H); sy += (sh - nh) / 2; sh = nh; }
  c.save();
  c.imageSmoothingEnabled = true;
  if (w.fx === 'pixel') {
    tiny.getContext('2d').drawImage(cam, sx, sy, sw, sh, 0, 0, tiny.width, tiny.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(tiny, 0, 0, W, H);
  } else if (w.fx === 'tile') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) c.drawImage(cam, sx, sy, sw, sh, (i * W) / 2, (j * H) / 2, W / 2, H / 2);
  } else {
    if (w.fx === 'mirror') { c.translate(W, 0); c.scale(-1, 1); }
    c.drawImage(cam, sx, sy, sw, sh, 0, 0, W, H);
  }
  c.restore();
}

// What a close-up shows (x, y, w, h: 0-1 of the picture), shaped like its window: the face with
// room around it, or one eye filling the screen. aspect: the window's width/height; pic: the
// picture's. Without a face found, the middle of the picture (where faces usually are).
function closeUpRect(fx, face, which, aspect, pic) {
  let cx, cy, h;
  if (fx === 'face') {
    cx = face ? face.x + face.w / 2 : 0.5;
    cy = face ? face.y + face.h * 0.48 : 0.45;
    h = face ? face.h * 1.7 : 0.75;
  } else {
    const eye = face?.eyes[which];
    cx = eye ? eye[0] : 0.5 + (which ? 0.07 : -0.07);
    cy = eye ? eye[1] : 0.4;
    h = ((face ? face.w * 0.32 : 0.16) * pic) / aspect;
  }
  h = Math.min(1, h);
  const w = Math.min(1, (h * aspect) / pic);
  return { x: Math.min(1 - w, Math.max(0, cx - w / 2)), y: Math.min(1 - h, Math.max(0, cy - h / 2)), w, h };
}

// A close-up: that part of the camera's full-resolution picture, then tinted in the window's
// colours the same way as the rest (dark parts take the background colour, bright the text).
function drawCloseUp(w, crop, face, pic) {
  const c = w.cam, W = c.canvas.width, H = c.canvas.height;
  if (!crop(closeUpRect(w.fx, face, w.which || 0, W / H, pic), c, W, H)) return;
  const img = c.getImageData(0, 0, W, H), d = img.data, [br, bg, bb] = w.look.bg, [fr, fg, fb] = w.look.fg;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(1, Math.max(0, ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 - 0.12) * 1.5));
    d[i] = br + (fr - br) * v;
    d[i + 1] = bg + (fg - bg) * v;
    d[i + 2] = bb + (fb - bb) * v;
  }
  c.putImageData(img, 0, 0);
}

// The whole screen flashes a colour on each bar's first beat (once a bar, well under the three a
// second that can set off seizures), like the video's hits; and it ends the way the video does,
// on an empty desktop with one alert.
const FLASHES = ['#ffffff', '#1f3dff', '#000000', '#9fd0ff'];

export function createTakeover({ back, front, sources }) {
  let active = false, until = 0, wins = [], spawned = 0, camCount = 0, screenCount = 0, boxCount = 0, song = '';
  let lastBar = null, flashes = 0, ending = 0, goodbye = null, closing = false;
  const big = back.querySelector('.big'), icons = back.querySelector('.icons'), winLayer = front.querySelector('.wins');
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;display:none';
  front.prepend(flash);

  function spawnWindow() {
    const plan = sources.cam() ? PLAN_CAM : PLAN_NO_CAM;
    const kind = plan[spawned % plan.length];
    let el;
    if (kind === 'cam') {
      const look = CAMS[camCount++ % CAMS.length];
      el = xpWindow({ title: look.title, kind: 'cam', w: look.w, h: look.h });
      el.fx = look.fx;
      el.look = look;
      el.which = camCount % 2;
    } else if (kind === 'screen') {
      el = crtScreen(SCREENS[screenCount % SCREENS.length], screenCount % 2);
      screenCount++;
    } else if (kind === 'notepad') {
      el = xpWindow({ title: 'pattern.txt - Notepad', kind: 'notepad' });
    } else if (kind === 'bsod') {
      el = miniBsod();
    } else {
      const all = messages(song);
      el = xpWindow(all[boxCount++ % all.length]);
    }
    winLayer.append(el);
    const w = el.offsetWidth || 320, h = el.offsetHeight || 150;
    el.style.left = 12 + Math.random() * Math.max(10, innerWidth - w - 24) + 'px';
    el.style.top = 44 + Math.random() * Math.max(10, innerHeight - h - 90) + 'px';
    if (el.kind === 'cam') el.cam = el.querySelector('canvas').getContext('2d', { willReadFrequently: el.fx === 'face' || el.fx === 'eye' });
    wins.push(el);
    spawned++;
  }

  return {
    get active() { return active; },
    start(t, title, barSeconds) {
      active = true;
      until = t + barSeconds * 8;
      spawned = camCount = screenCount = 0;
      lastBar = null;
      ending = 0;
      closing = false;
      // (a drop while the last one's alert is still up: that alert goes)
      goodbye?.remove();
      goodbye = null;
      flash.style.display = 'none';
      song = title || '';
      big.textContent = (title || 'bass drop').toUpperCase().slice(0, 28);
      icons.innerHTML = ICONS.map((n) => `<div class="icon"><i></i><span>${n}</span></div>`).join('');
      back.classList.add('on');
      front.classList.add('on');
      spawnWindow();
    },
    kick() { if (active && !closing && wins.length < MAX_WINDOWS) spawnWindow(); },
    stop() {
      active = false;
      back.classList.remove('on');
      front.classList.remove('on');
      wins.forEach((w) => w.remove());
      wins = [];
      goodbye?.remove();
      goodbye = null;
      ending = 0;
      flash.style.display = 'none';
    },
    // bar: the bar number (null without a beat), for the flashes; calm: fewer flashes (none)
    draw(t, gridText, camFrame, bar = null, calm = false) {
      if (!active) return;
      if (bar !== null && bar !== lastBar && t < until) {
        if (lastBar !== null && !calm) {
          flash.style.background = FLASHES[flashes++ % FLASHES.length];
          flash.style.display = 'block';
          setTimeout(() => { flash.style.display = 'none'; }, 90);
        }
        lastBar = bar;
      }
      // the webcam only changes ~30 times a second, so the cam windows update every other frame
      this.odd = !this.odd;
      const face = sources.face?.();
      for (const w of wins) {
        if (w.kind === 'cam' && w.cam && camFrame && this.odd) {
          if ((w.fx === 'face' || w.fx === 'eye') && sources.crop) drawCloseUp(w, sources.crop, face, camFrame.w / camFrame.h);
          else drawCam(w, camFrame);
        }
        if (w.kind === 'notepad') w.querySelector('pre').textContent = gridText;
        if (w.kind === 'bsod' && w.pct < 100) {
          w.pct = Math.min(100, w.pct + Math.random() * 1.2);
          w.querySelector('.pct').textContent = Math.floor(w.pct);
        }
      }
      if (t > until) {
        // windows close one at a time (no new ones), then one alert on the empty desktop, then
        // the desktop goes
        closing = true;
        const w = wins.pop();
        if (w) w.remove();
        else if (!ending) {
          ending = t;
          goodbye = xpWindow({ title: 'toaster.exe', icon: 'info', text: `${(song || 'this song').toUpperCase().slice(0, 40)} NEEDS YOUR LOVE`, buttons: ['Not Now', 'OK'] });
          winLayer.append(goodbye);
          goodbye.style.left = Math.round((innerWidth - (goodbye.offsetWidth || 240)) / 2) + 'px';
          goodbye.style.top = Math.round((innerHeight - (goodbye.offsetHeight || 150)) / 2) + 'px';
        } else if (t - ending > 1.6) this.stop();
      }
    },
  };
}

export function showBsod(el, after) {
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); after?.(); }, 700);
}

export function createSysinfo(el, describeAudio) {
  let info = null, timer = null;
  const fmtUp = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  async function refresh() {
    if (!window.nc?.sysInfo) { el.textContent = '// machine info needs the desktop app'; return; }
    info ||= await window.nc.sysInfo();
    const load = await window.nc.sysLoad();
    el.textContent = [
      'const machine = {',
      `  os: "${info.os}",`,
      `  cpu: "${info.cpu.slice(0, 28)} x${info.threads} · ${load.cpu}%",`,
      `  ram: "${load.ramUsedGB.toFixed(1)} / ${info.ramGB.toFixed(1)} GB",`,
      `  screen: "${info.screen}",`,
      `  audio: "${describeAudio()}",`,
      `  uptime: "${fmtUp(load.uptime)}",`,
      '}',
    ].join('\n');
  }
  return {
    show(on) {
      el.hidden = !on;
      clearInterval(timer);
      if (on) { refresh(); timer = setInterval(refresh, 1000); }
    },
  };
}
