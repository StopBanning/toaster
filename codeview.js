// The code view. Types each line in like a person would (with the odd typo, fixed with
// backspace, since a live coder keeps mistakes in the show, and now and then a bracket left out: a red
// error, then the caret goes back to fix it), lands each change on the next bar line the way
// ctrl+enter on the downbeat does (the line flashes, the rest of the code with it), and lights up
// tokens as their notes play. A slider's number slides to a new value instead of being typed, and
// a line too long for the window goes on over more rows.

// Keys next to each key on a QWERTY keyboard, for believable typos.
const NEAR = {
  a: 'qwsz', b: 'vghn', c: 'xdfv', d: 'serfcx', e: 'wsdr', f: 'drtgvc', g: 'ftyhbv', h: 'gyujnb', i: 'ujko',
  j: 'huikmn', k: 'jiolm', l: 'kop', m: 'njk', n: 'bhjm', o: 'iklp', p: 'ol', q: 'wa', r: 'edft', s: 'awedxz',
  t: 'rfgy', u: 'yhji', v: 'cfgb', w: 'qase', x: 'zsdc', y: 'tghu', z: 'asx',
};
const TYPO_CHANCE = 0.03;
// A slip (a closing ) or " left out, an error, then fixed): a chance on an edit to a code line,
// but never within 45 seconds of the last one, or the show is all errors (lines change often).
// None while recording or saving drop clips (slipsOff, from the app): in a video, people who don't
// know the show see a red error box with nothing to say it's staged, and take it for a bug.
const SLIP_CHANCE = 0.03, SLIP_GAP = 45;
let lastSlip = -Infinity; // when the last slip was (seconds)
const SLIP_LINES = new Set(['bd', 'sd', 'hhc', 'hho', 'bassline', 'chords', 'vox']);
const SLIP_ERROR = { ')': 'SyntaxError: missing ) after argument list', '"': 'SyntaxError: Invalid or unexpected token' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Where a line too long for the window goes on to its next row: before a method call at the top
// level (a "." after a closing bracket, not one in a string or a number), the rest indented, the
// way you'd break up Strudel by hand. A call too long for a row of its own gets one anyway (cut
// off at the window's edge), so what comes after it still shows. Returns the places (character
// indices); none if it fits.
const WRAP = '\n  ';
function wraps(text, cols) {
  if (!cols || text.length <= cols) return [];
  const spots = [];
  let depth = 0, str = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (str) { if (c === '"') str = false; }
    else if (c === '"') str = true;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '.' && depth === 0 && text[i - 1] === ')') spots.push(i);
  }
  const out = [];
  let from = 0, room = cols;
  while (text.length - from > room) {
    let at = -1;
    for (const s of spots) if (s > from && s - from <= room) at = s;
    if (at < 0) at = spots.find((s) => s > from) ?? -1;
    if (at < 0) break;
    out.push(at);
    from = at;
    room = cols - (WRAP.length - 1);
  }
  return out;
}

// Sliders: slider(value, min, max) parts, their values, and where a value sits in its range.
const values = (parts) => parts.filter((p) => p.slider).map((p) => parseFloat(p.text.slice(7)));
const unslid = (text) => text.replace(/slider\(-?[\d.]+/g, 'slider(#');
const sliderAt = (p) => clamp((parseFloat(p.text.slice(7)) - p.slider[0]) / (p.slider[1] - p.slider[0]), 0, 1).toFixed(3);

export function createCodeView(ids) {
  let slipsOff = false;
  const lines = Object.fromEntries(ids.map((id) => [id, {
    id, el: document.getElementById('ln-' + id), shown: '', target: '', parts: null, targetParts: null,
    spans: [], want: '', wantSince: 0,
  }]));
  const typer = { queue: [], cur: null, next: 0 };
  // lines typed in and waiting for the next bar line to land on, and when the first started waiting
  const landing = new Set();
  let landingSince = 0, lastBar = null;
  const err = document.getElementById('err');

  // How many characters a row holds (it's monospace), measured again whenever the code's size
  // changes (the window, the layout, the font arriving); every line is drawn again when it does.
  let cols = 0;
  const ruler = document.createElement('canvas').getContext('2d');
  function measure() {
    const el = (lines.bd || Object.values(lines)[0]).el;
    ruler.font = getComputedStyle(el).font;
    const cw = ruler.measureText('0'.repeat(40)).width / 40;
    const n = cw > 0 ? Math.floor(el.clientWidth / cw) : 0;
    if (n !== cols) { cols = n; for (const L of Object.values(lines)) render(L); }
  }
  new ResizeObserver(measure).observe(document.getElementById('code'));
  document.fonts?.addEventListener?.('loadingdone', measure);

  // A slider moved: the number slides from where it is to the new value over most of a second,
  // eased, like dragging it; nothing is typed.
  const typing = (L) => typer.cur?.id === L.id || typer.queue.includes(L.id);
  function slide(L, parts, t) {
    const from = L.glide ? L.glide.now : values(L.parts || []), to = values(parts);
    L.target = L.want = parts.map((p) => p.text).join('');
    L.targetParts = parts;
    if (from.length !== to.length) { L.glide = null; L.shown = L.target; L.parts = parts; render(L); return; }
    L.glide = { from, to, now: from.slice(), t0: t };
  }
  function glide(L, t) {
    const g = L.glide, k = Math.min(1, (t - g.t0) / 0.9), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) ** 2;
    g.now = g.from.map((a, i) => a + (g.to[i] - a) * e);
    if (k >= 1) { L.glide = null; L.parts = L.targetParts; L.shown = L.target; render(L); return; }
    let i = 0;
    L.parts = L.targetParts.map((p) => {
      if (!p.slider) return p;
      const v = g.now[i], whole = Number.isInteger(g.to[i++]);
      return { ...p, text: `slider(${whole ? Math.round(v) : +v.toFixed(2)}, ${p.slider[0]}, ${p.slider[1]})` };
    });
    const shown = L.parts.map((p) => p.text).join('');
    if (shown !== L.shown) { L.shown = shown; render(L); }
  }

  // A part muted or unmuted: just the _ in front of its name typed (or deleted) before anything
  // else, so a hush sweeps straight down the code; the rest of the line's changes come after.
  const muted = (x) => x.startsWith('_');
  const toggles = (L) => !!L.shown && !L.shown.startsWith('//') && !L.target.startsWith('//') && muted(L.shown) !== muted(L.target);
  // A line with something heard in it (not a // comment: a part not heard yet, the beat still
  // being looked for). The song, its tempo and its key come before the parts, as a live coder
  // sets them up first.
  const heard = (L) => !!L.target && !L.target.trimStart().startsWith('//');
  const HEAD = new Set(['title', 'tempo', 'scale']);

  function setTarget(L, parts) {
    L.glide = null; // typed from wherever a slide had got to
    L.target = parts.map((p) => p.text).join('');
    L.targetParts = parts;
    if (L.shown !== L.target && typer.cur?.id !== L.id && !typer.queue.includes(L.id)) typer.queue.push(L.id);
  }

  // Backspace over what changed, then type the new text, now and then hitting a wrong key first.
  function plan(L) {
    const a = L.shown, b = L.target;
    if (toggles(L)) return { id: L.id, caret: muted(b) ? 0 : 1, ops: [muted(b) ? { ins: '_' } : 'del'], i: 0, delay: 34 };
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let s = 0;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    const ops = [];
    for (let i = 0; i < a.length - s - p; i++) ops.push('del');
    const add = b.slice(p, b.length - s);
    // now and then a slip: the last ) (or ") of what's typed left out until the error shows
    let slip = -1;
    const now = performance.now() / 1000;
    if (!slipsOff && SLIP_LINES.has(L.id) && !b.startsWith('//') && !b.startsWith('_') && add.length > 6 && now - lastSlip > SLIP_GAP && Math.random() < SLIP_CHANCE) {
      slip = add.lastIndexOf(')');
      if (slip < 0) slip = add.lastIndexOf('"');
      if (slip >= 0) lastSlip = now;
    }
    for (let j = 0; j < add.length; j++) {
      const ch = add[j];
      if (j === slip) continue;
      const near = NEAR[ch.toLowerCase()];
      if (near && Math.random() < TYPO_CHANCE) {
        const wrong = near[Math.floor(Math.random() * near.length)];
        ops.push({ ins: ch === ch.toLowerCase() ? wrong : wrong.toUpperCase() }, 'pause', 'del');
      }
      ops.push({ ins: ch });
    }
    if (slip >= 0) ops.push({ error: SLIP_ERROR[add[slip]] }, { wait: 900 + Math.random() * 600 }, { caretTo: p + slip }, { ins: add[slip] }, 'unerror');
    return { id: L.id, caret: a.length - s, ops, i: 0, delay: clamp(1100 / (ops.length + 1), 9, 34) };
  }

  function finish(L) {
    L.parts = L.targetParts;
    render(L);
    if (!landing.size) landingSince = performance.now() / 1000;
    landing.add(L);
  }
  const flash = (L, cls) => { L.el.classList.remove(cls); void L.el.offsetWidth; L.el.classList.add(cls); };
  // A slip's error, the way an editor shows one: just under its line (over it, near the bottom of
  // the window), pointing at where the typing stopped, and kept inside the code's column.
  function pointAt(L) {
    const line = L.el.getBoundingClientRect(), h = err.offsetHeight, w = err.offsetWidth;
    const x = (L.el.querySelector('.caret') || L.el).getBoundingClientRect().left;
    const below = line.bottom + 8 + h < innerHeight - 44;
    const left = clamp(x - 12, line.left, Math.max(line.left, line.right - w));
    err.classList.toggle('above', !below);
    err.style.left = `${Math.round(left)}px`;
    err.style.top = `${Math.round(clamp(below ? line.bottom + 8 : line.top - h - 8, 44, innerHeight - h - 44))}px`;
    err.style.setProperty('--arrow', `${Math.round(clamp(x - left - 6, 4, w - 16))}px`);
  }
  // On the bar line: the changes land (each flashes), and the rest of the playing code with them.
  function land() {
    for (const L of Object.values(lines)) if (!landing.has(L) && L.el.textContent && !L.el.classList.contains('cm')) flash(L, 'eval');
    for (const L of landing) flash(L, 'flash');
    landing.clear();
  }

  function render(L) {
    const text = L.shown;
    // a comment, or a part muted with a _ in front of its name
    const quiet = text.trimStart().startsWith('//') || text.startsWith('_');
    L.el.classList.toggle('cm', quiet);
    L.spans = [];
    // the text from a to b, with the row breaks that fall in it (comments aren't broken up)
    const cuts = text.trimStart().startsWith('//') ? [] : wraps(text, cols);
    const piece = (a, b) => {
      let html = '', at = a;
      for (const c of cuts) if (c >= a && c < b) { html += esc(text.slice(at, c)) + WRAP; at = c; }
      return html + esc(text.slice(at, b));
    };
    if (typer.cur?.id === L.id) {
      const c = typer.cur.caret;
      L.el.innerHTML = `<span class="txt">${piece(0, c)}</span><span class="caret"></span><span class="txt">${piece(c, text.length)}</span>`;
      return;
    }
    const parts = L.parts;
    if (parts && parts.map((p) => p.text).join('') === text && !quiet) {
      let at = 0;
      const html = parts.map((p, i) => {
        const h = piece(at, (at += p.text.length));
        if (p.steps || p.slots) return `<span class="tok" data-i="${i}">${h}</span>`;
        if (p.slider) return `<span class="sl" style="--k:${sliderAt(p)}">${h}</span>`;
        return h;
      }).join('');
      L.el.innerHTML = '<span class="txt">' + html + '</span>';
      L.spans = [...L.el.querySelectorAll('.tok')].map((el) => ({ el, part: parts[+el.dataset.i], on: false }));
    } else {
      L.el.innerHTML = text ? `<span class="txt">${piece(0, text.length)}</span>` : '';
    }
  }

  return {
    lines,
    get slipsOff() { return slipsOff; },
    set slipsOff(v) {
      slipsOff = v;
      // A slip already planned or showing when recording starts is dropped and finished normally.
      if (v && typer.cur?.ops.includes('unerror', typer.cur.i)) {
        const L = lines[typer.cur.id];
        if (err) err.hidden = true;
        L.el.classList.remove('slipped');
        if (!typer.queue.includes(L.id)) typer.queue.unshift(L.id);
        typer.cur = null;
        typer.next = 0;
        render(L);
      }
    },

    // Ask for a change only once it has held steady, so the code doesn't flicker (now: at once,
    // for a change you made, like a hush).
    update(wanted, t, now = false) {
      for (const id of ids) {
        const L = lines[id];
        const text = wanted[id].map((p) => p.text).join('');
        if (text === L.target) { L.targetParts = wanted[id]; L.want = text; continue; }
        // only a slider moved, on a line that's typed in: it slides there
        if (L.target && text.includes('slider(') && unslid(text) === unslid(L.target) && (L.shown === L.target || L.glide) && !typing(L)) { slide(L, wanted[id], t); continue; }
        if (text !== L.want) { L.want = text; L.wantSince = t; }
        const hold = now || id === 'title' || id === 'tempo' || !L.target ? 0 : 0.7;
        if (t - L.wantSince >= hold) setTarget(L, wanted[id]);
      }
    },

    step(t) {
      if (t < typer.next) return;
      if (!typer.cur) {
        // mutes and unmutes first, then lines with something heard in them (the song, tempo and
        // key first), then the rest in order. (A song's first seconds type the whole template,
        // comments, top to bottom; the beat, found after about 3 s, waited behind it, saying
        // "finding the beat" for 10 to 12 s more.)
        let i = typer.queue.findIndex((q) => toggles(lines[q]));
        if (i < 0) i = typer.queue.findIndex((q) => HEAD.has(q) && heard(lines[q]));
        if (i < 0) i = typer.queue.findIndex((q) => heard(lines[q]));
        const id = typer.queue.splice(Math.max(0, i), 1)[0];
        if (!id) return;
        const L = lines[id];
        if (L.shown === L.target) { finish(L); return; }
        typer.cur = plan(L);
      }
      const c = typer.cur, L = lines[c.id];
      const op = c.ops[c.i++];
      if (op === undefined) {
        typer.cur = null;
        // it changed while we typed: again, after the lines waiting (first, it could keep the
        // others waiting for good: a line that changes every bar on a song with a lot going on),
        // drawn without its caret meanwhile (one caret on screen, where the typing is)
        if (L.shown !== L.target) { typer.queue.push(L.id); render(L); }
        else finish(L);
        typer.next = t + 0.05;
        return;
      }
      if (op === 'del') {
        L.shown = L.shown.slice(0, c.caret - 1) + L.shown.slice(c.caret);
        c.caret--;
        typer.next = t + (c.delay * 0.6) / 1000;
      } else if (op === 'pause') {
        typer.next = t + 0.12 + Math.random() * 0.12;
      } else if (op === 'unerror') {
        // fixed: the squiggle goes and the line flashes green (once: typing it again later mustn't)
        L.el.classList.remove('slipped');
        flash(L, 'fixed');
        setTimeout(() => L.el.classList.remove('fixed'), 800);
        if (err) err.hidden = true;
        typer.next = t + 0.05;
      } else if (op.error !== undefined) {
        L.el.classList.add('slipped');
        if (err) { err.textContent = op.error; err.hidden = false; pointAt(L); }
        typer.next = t + 0.05;
      } else if (op.wait !== undefined) {
        typer.next = t + op.wait / 1000;
      } else if (op.caretTo !== undefined) {
        c.caret = op.caretTo;
        typer.next = t + 0.25;
      } else {
        L.shown = L.shown.slice(0, c.caret) + op.ins + L.shown.slice(c.caret);
        c.caret++;
        typer.next = t + (c.delay * (0.6 + Math.random() * 0.8)) / 1000;
      }
      render(L);
    },

    highlight(t, eng) {
      for (const L of Object.values(lines)) if (L.glide) glide(L, t);
      // changes land on the next bar line (right away while there's no beat, and after 2.5 s at most)
      const bar = eng.tempo.locked && !eng.silent ? eng.bar : null;
      if (landing.size && (bar === null || (lastBar !== null && bar !== lastBar) || t - landingSince > 2.5)) land();
      lastBar = bar;
      const toggle = (sp, on) => { if (on !== sp.on) { sp.on = on; sp.el.classList.toggle('on', on); } };
      const hitOn = (part, hit) => !!part.steps && t - hit.t < 0.13 && part.steps.includes(hit.step);
      for (const id of ['bd', 'sd', 'vox']) {
        const hit = eng.v[id].lastHit;
        for (const sp of lines[id].spans) toggle(sp, hitOn(sp.part, hit));
      }
      // A hat lights its open-hat token if that step is open in the pattern, else the closed one.
      const hh = eng.hhHit;
      const open = lines.hho.spans.some((sp) => sp.part.steps?.includes(hh.step));
      for (const sp of lines.hho.spans) toggle(sp, open && hitOn(sp.part, hh));
      for (const sp of lines.hhc.spans) toggle(sp, !open && hitOn(sp.part, hh));
      // Bass notes and chords light for their bar; the bass line's rhythm (its .struct) on each note.
      const slot = eng.tempo.locked && eng.bar !== null && !eng.silent ? ((eng.bar % 4) + 4) % 4 : -1;
      for (const id of ['bassline', 'chords']) {
        for (const sp of lines[id].spans) toggle(sp, sp.part.slots ? sp.part.slots.includes(slot) : hitOn(sp.part, eng.v.bass.lastHit));
      }
    },

    // A fresh start for a new song: wipe the screen and type everything again.
    clear() {
      typer.queue.length = 0;
      typer.cur = null;
      landing.clear();
      if (err) err.hidden = true;
      for (const L of Object.values(lines)) {
        L.el.classList.remove('slipped');
        L.shown = L.target = L.want = '';
        L.parts = L.targetParts = L.glide = null;
        render(L);
      }
    },
  };
}
