// Ctrl+K (Cmd+K on a Mac): every action by name, and each scene, background, code look, handheld
// screen and theme. Type a few letters, pick with the arrows, Enter runs it. The keys are looked up
// each time it paints, so a key you've changed shows as changed.

// Best matches first: a name that starts with what you typed, then one with a word that does, then
// one that has it anywhere. Ties keep the list's own order.
export function matchCommands(entries, query, limit = 8) {
  const q = query.trim().toLowerCase();
  const rankOf = (term) => {
    if (term.startsWith(q)) return 0;
    if (term.split(/\s+/).some((w) => w.startsWith(q))) return 1;
    return term.includes(q) ? 2 : Infinity;
  };
  return entries
    .map((entry, index) => {
      const terms = [entry.name, ...(entry.aliases || [])].map((s) => s.toLowerCase());
      return { entry, index, rank: q ? Math.min(...terms.map(rankOf)) : 0 };
    })
    .filter((x) => Number.isFinite(x.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.entry);
}

// What each action is called here (one without a name goes by its id).
export const ACTION_NAMES = {
  source: 'audio source', visual: 'next background', strength: 'next scene or screen', blocks: 'next code look',
  later: 'blocks timing later', earlier: 'blocks timing earlier', cam: 'camera', card: 'song ID card',
  strudel: 'open in Strudel', rec: 'record', clips: 'save clips', export: 'export the song', camfx: 'camera effects',
  tap: 'tap the beat', hush: 'hush every part', drop: 'trigger the drop', dropfx: 'next drop effect', machine: 'machine readout',
  layout: 'vertical layout', mini: 'mini player', theme: 'next theme', crt: 'CRT television', name: 'name the song',
  hide: 'hide header and footer', code: 'hide the code', full: 'fullscreen',
};

export function actionCommands(actions, keyOf) {
  return actions.map((a) => ({
    id: 'action:' + a.id,
    name: ACTION_NAMES[a.id] || a.id,
    key: keyOf(a.id),
    aliases: a.id === 'rec' ? ['rec', 'recording'] : [],
    run: a.run,
  }));
}

// The palette, a <dialog>. entries() gives the list each time it paints, blocked() says when it
// mustn't open (another dialog or the menu is up), fail(err) shows an error an entry threw.
export function createPalette({ document, window, entries, blocked, fail }) {
  const box = document.createElement('dialog');
  box.id = 'command-palette';
  box.setAttribute('aria-label', 'Search commands');
  box.innerHTML = [
    '<input type="search" aria-label="Search commands" placeholder="Search actions, scenes, looks…" autocomplete="off"',
    ' role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="command-results">',
    '<div id="command-results" role="listbox" aria-label="Commands"></div>',
    '<p class="palette-empty" hidden>No matching commands</p>',
  ].join('');
  document.body.append(box);
  const input = box.querySelector('input');
  const list = box.querySelector('[role=listbox]');
  let rows = [], selected = 0, previous;

  const close = () => { box.close(); previous?.focus(); };
  const choose = async (i) => {
    const row = rows[i];
    if (!row) return;
    close();
    try { await row.run(); } catch (e) { fail(e); }
  };
  const paint = () => {
    rows = matchCommands(entries(), input.value);
    selected = Math.max(0, Math.min(selected, rows.length - 1));
    list.replaceChildren();
    rows.forEach((row, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'command-row-' + i;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === selected));
      b.tabIndex = -1;
      const name = document.createElement('span');
      const key = document.createElement('kbd');
      name.textContent = row.name;
      key.textContent = row.key || '';
      b.append(name, key);
      b.onclick = () => choose(i);
      list.append(b);
    });
    input.setAttribute('aria-activedescendant', rows.length ? 'command-row-' + selected : '');
    box.querySelector('.palette-empty').hidden = !!rows.length;
  };
  const open = () => {
    if (blocked()) return;
    previous = document.activeElement;
    input.value = '';
    selected = 0;
    paint();
    box.showModal();
    input.focus();
  };

  input.oninput = () => { selected = 0; paint(); };
  // Its keys stay in the palette: none of them reach the app's own.
  box.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (rows.length) selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(selected);
    }
  });
  // Ctrl+K opens it and closes it again, ahead of every other key handler.
  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return;
    if (!box.open && blocked()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) (box.open ? close : open)();
  }, true);
  // A click outside it, on the backdrop, closes it.
  box.addEventListener('click', (e) => {
    if (e.target !== box) return;
    const r = box.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  return { open, close, get openNow() { return box.open; } };
}
