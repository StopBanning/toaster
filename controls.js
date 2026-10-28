// The controls panel: every key, as a button, for a screen with no keyboard (an iPad, a phone). It
// exists only where there's no hover (a finger is the pointer): on a desktop or a laptop with a mouse
// nothing is added to the page at all. A header button opens it, over the bottom of the picture, or
// down the right side when the screen is wide and landscape; a tap on a button runs that action's own
// run() (the same one its key runs), and the panel stays open, so V can be tapped through the
// backgrounds. A close button, Esc or a tap outside closes it. The words are the help's; where the app
// knows the state (the background, the theme, blocks on or off) the button says it.
//
// app.js hands over: ACTIONS ({ id, run }), K (an action's key as written), now[id]() (its state, as
// text, or { text, on }), can[id]() (false: it can't work on this device, so it's left out), and the
// pointer media query. The page is touched through a few DOM calls only (createElement, append,
// addEventListener, dataset, hidden, textContent), so tools/controls.test.mjs runs it on a stand-in.

// [id, group, what it does, the words under it when the app has no state to show]
// (in the help's order and groups)
export const CONTROLS = [
  ['visual', 'look', 'background', 'step through them'],
  ['strength', 'look', 'next', 'the next scene, look or screen'],
  ['theme', 'look', 'theme', 'the colours'],
  ['crt', 'look', 'old TV (CRT)', 'scanlines and glass'],
  ['blocks', 'look', 'code look', 'dominoes, handheld, punchcard, none'],
  ['card', 'look', 'ID card', 'off, on, big'],
  ['cam', 'camera', 'camera', 'tinted, big eyes, ASCII, off'],
  ['camfx', 'camera', 'camera effect', 'the next one'],
  ['tap', 'perform', 'tap the beat', 'four taps on the beat set the tempo'],
  ['hush', 'perform', 'hush', 'every part muted'],
  ['drop', 'perform', 'the drop, now', 'the drop effect and the backgrounds’ moments'],
  ['dropfx', 'perform', 'drop effect', 'the next one'],
  ['rec', 'save & share', 'record video', 'the window, with sound'],
  ['clips', 'save & share', 'drop clips', 'the first two drops of each song'],
  ['export', 'save & share', 'export song', 'MIDI and Strudel code'],
  ['strudel', 'save & share', 'open in Strudel', 'the code, in your browser'],
  ['layout', 'window', 'vertical layout', 'for TikTok and Shorts'],
  ['mini', 'window', 'mini player', 'a small window over the rest; the handheld on its own'],
  ['code', 'window', 'hide the code', 'just the visuals'],
  ['hide', 'window', 'hide the bars', 'the header and footer'],
  ['full', 'window', 'fullscreen', ''],
  ['machine', 'window', 'machine readout', ''],
  ['source', 'setup', 'audio source', 'system, demo, file, input'],
  ['name', 'setup', 'name the song', 'if it got the title wrong'],
  ['later', 'setup', 'blocks later', 'if they land early'],
  ['earlier', 'setup', 'blocks earlier', 'if they land late'],
];
export const GROUPS = ['look', 'camera', 'perform', 'save & share', 'window', 'setup'];

// where the panel sits: down the right side when the screen is wide and landscape, along the bottom
// otherwise (and `pref`, 'side' or 'bottom', overrides). With the handheld game on screen (it stands at
// the right of a wide window) the side is the left, over the code, so A shows its screens changing.
export const dockFor = (width, height, pref, game = false) => (pref === 'side' || pref === 'bottom' ? pref : width >= 700 && width > height ? (game ? 'left' : 'side') : 'bottom');

export function createControls({ document: doc, window: win = globalThis, query, actions, K, now = {}, can = {}, fail = () => {}, dock = 'auto' }) {
  const byId = new Map(actions.map((a) => [a.id, a]));
  let launcher = null, fab = null, panel = null, tiles = [], heads = [], timer = 0, isOpen = false;

  function el(tag, cls, ...kids) {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    for (const k of kids) e.append(k);
    return e;
  }
  const text = (tag, cls, s) => { const e = el(tag, cls); e.textContent = s; return e; };

  function run(id) {
    const act = byId.get(id);
    if (!act) return;
    try { Promise.resolve(act.run()).catch(fail); } catch (err) { fail(err); }
    // (state that settles a moment later, like the camera coming on or a menu opening)
    setTimeout(refresh, 80);
    setTimeout(refresh, 600);
  }

  function mount() {
    if (panel) return;
    // (the word goes on a phone, where the header is full: the three bars say it)
    launcher = el('button', 'grp', text('span', '', '☰'), text('span', 'ctl-word', ' controls'));
    launcher.id = 'b-controls';
    launcher.setAttribute('aria-label', 'Controls');
    launcher.title = 'Every key as a button';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.addEventListener('click', () => (isOpen ? close() : open()));
    const help = doc.getElementById('b-help');
    if (help?.before) help.before(launcher); else doc.getElementById('bar')?.append(launcher);

    // (with the header hidden, H: a way back to the panel, and so to the bars)
    fab = text('button', '', '☰');
    fab.id = 'ctl-fab';
    fab.setAttribute('aria-label', 'Controls');
    fab.addEventListener('click', () => open());
    doc.body.append(fab);

    panel = el('aside', 'ctl-panel');
    panel.id = 'controls';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Controls');
    const close_ = text('button', 'ctl-close', '✕ close');
    close_.addEventListener('click', close);
    panel.append(el('div', 'ctl-head', text('b', '', 'controls'), text('span', 'ctl-sub', 'tap to run · it stays open'), close_));
    const body = el('div', 'ctl-body');
    for (const g of GROUPS) {
      const items = CONTROLS.filter((c) => c[1] === g && byId.has(c[0]));
      if (!items.length) continue;
      const h = text('h3', '', g), grid = el('div', 'ctl-grid');
      heads.push({ h, grid });
      body.append(h, grid);
      for (const [id, , name, hint] of items) {
        const b = el('button', id === 'tap' ? 'ctl ctl-pad' : 'ctl');
        b.dataset.act = id;
        const nm = text('span', 'ctl-name', name), key = text('kbd', 'ctl-key', ''), st = text('span', 'ctl-now', '');
        b.append(nm, key, st);
        if (id === 'tap') {
          // (a pad you can hit four times in time: it answers the touch, not the lift of the finger)
          let fired = false;
          b.addEventListener('pointerdown', () => { fired = true; setTimeout(() => { fired = false; }, 700); run(id); });
          b.addEventListener('click', () => { if (fired) fired = false; else run(id); });
        } else b.addEventListener('click', () => run(id));
        grid.append(b);
        tiles.push({ id, b, key, st, hint, name });
      }
    }
    panel.append(body);
    doc.body.append(panel);

    doc.addEventListener('pointerdown', outside, true);
    doc.addEventListener('keydown', escape, true);
    win.addEventListener?.('resize', layout);
    refresh();
  }

  function unmount() {
    if (!panel) return;
    close();
    doc.removeEventListener?.('pointerdown', outside, true);
    doc.removeEventListener?.('keydown', escape, true);
    win.removeEventListener?.('resize', layout);
    for (const e of [launcher, fab, panel]) e.remove?.();
    launcher = fab = panel = null;
    tiles = [];
    heads = [];
  }

  const outside = (e) => {
    if (!isOpen || e.target?.closest?.('#controls, #b-controls, #ctl-fab, #menu, #alerts')) return;
    close();
  };
  const escape = (e) => { if (isOpen && e.key === 'Escape') close(); };

  function layout() {
    if (!panel) return;
    panel.dataset.dock = dockFor(win.innerWidth, win.innerHeight, dock, !!doc.body.classList.contains?.('game-on'));
  }

  function open() {
    if (!panel) return;
    isOpen = true;
    layout();
    refresh();
    panel.hidden = false;
    doc.body.classList.add('controls-open');
    launcher.classList.add('on');
    clearInterval(timer);
    timer = setInterval(refresh, 400);
    timer.unref?.(); // (Node, in the tests: an open panel doesn't keep the process alive)
  }
  function close() {
    isOpen = false;
    clearInterval(timer);
    if (!panel) return;
    panel.hidden = true;
    doc.body.classList.remove('controls-open');
    launcher.classList.remove('on');
  }

  // the state and the key on every button (a key can be changed in the help; the camera or a recording
  // can change on its own), and the ones this device can't do left out
  function refresh() {
    if (!panel) return;
    for (const t of tiles) {
      const usable = can[t.id]?.() !== false;
      t.b.hidden = !usable;
      if (!usable) continue;
      let s = now[t.id]?.();
      if (typeof s === 'string' || s === undefined || s === null) s = { text: s ?? '', on: false };
      t.key.textContent = K(t.id);
      t.st.textContent = s.text || t.hint;
      t.st.className = s.text ? 'ctl-now' : 'ctl-now ctl-hint';
      t.b.classList.toggle('on', !!s.on);
      t.b.setAttribute('aria-label', `${t.name}${s.text ? ': ' + s.text : t.hint ? ', ' + t.hint : ''}`);
    }
    for (const { h, grid } of heads) h.hidden = ![...grid.children].some((b) => !b.hidden);
  }

  // on a screen with hover (a mouse), nothing; when the pointer changes (a trackpad plugged in or
  // taken away) the panel follows
  const sync = () => (query.matches ? mount() : unmount());
  query.addEventListener?.('change', sync);
  sync();

  return {
    open, close, refresh,
    get mounted() { return !!panel; },
    get isOpen() { return isOpen; },
    get buttons() { return tiles.map((t) => t.id); },
  };
}
