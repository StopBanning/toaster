// The library (G): a full-screen panel over the visuals, in the theme's own colours. Your music (the albums in the folder you chose, the
// open one's tracks listed and the rest folded below), the radio (the stations you've played, the latest first) and scenes (the
// presets and the setups you've saved). The cover of the open album is drawn in characters behind it, golden's way: its light picks
// each cell's glyph from a ramp. The glyphs are an image used as a mask over the foreground colour, so everything follows the theme,
// the dynamic one too, with nothing drawn again as its colours ease. The look is the kept still: renderer/style.css, "the library".
// What it shows is library.js's (the albums, the rows, the cursor); where the tracks come from is library-source.js's; what plays,
// the stations and the scenes are app.js's, through `host`.
import {
  SECTIONS, agoText, albumLine, findMarks, findRows, findWords, fmtDuration, fold, glyphRows, groupAlbums, keepCursor, makeTrack, moveCursor, musicRows, nextRepeat,
  nextSection, scenePicture, stationParts, unfold,
} from './library.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const two = (n) => String(n).padStart(2, '0');
const WIDE = '(min-width: 900px) and (min-aspect-ratio: 5/4)'; // a wide window: the panel at the left, the cover big at the right (style.css has the same)
const COVER_COLS = 30, COVER_ROWS = 18, COVER_PX = 128; // a small cover: the grid of characters it is drawn in, and the picture they're drawn on

// host: key() the library's key as written; playing() what's playing: { id (changes with the song), track (the path of the library
// track), radio (the station's address), title, artist, ms, stoppable }; live(); blocked() (a menu or a dialog is up); play(album,
// index: null for the album, from its first track or any with shuffle on); repeat() and setRepeat(mode) (REPEATS), shuffle() and
// setShuffle(on), which return what to say; stop(); stations(); playStation(url); addStation(text); scenes() { presets, user }; sceneOn(scene); applyScene(scene);
// saveScene() (the new scene); renameScene(id, name); deleteScene(id); say(text); fail(err); titleBar() (the window has a strip of its own
// along the top: the app's, not a browser's)
export function createLibraryPanel({ document: doc, window: win = globalThis, root, source, host }) {
  const S = {
    open: false, section: 'music', albums: [], covers: {}, byPath: new Map(), openId: null, cursor: { music: 0, radio: 0, scenes: 0 }, tracks: 0,
    sig: '', folder: '', haveData: false, scanning: false, progress: null, scannedAt: 0, error: '', typing: false, renaming: null, armed: null, nowSig: '', listSig: '', modesSig: '',
    artKey: '', artToken: 0, followPlaying: true, // (the open album follows the song that's playing, till you open another yourself)
    onShelf: false, shelfAt: 0, shelfSig: '', // the shelf of albums played lately: the keys on it (↑ from the list's first row), and which tile
    find: null, found: { q: null, sig: '', rows: [], total: 0 }, // find in your music: { q, from } while its line is open (from: the cursor before it)
  };
  const mac = /Mac|iP(hone|ad|od)/.test(win.navigator?.platform || '');
  const FIND_KEY = mac ? '⌘F' : 'ctrl+F', FIND_MAX = 300;
  root.innerHTML = `
    <div class="lib-drag" aria-hidden="true"></div>
    <div class="lib-art" aria-hidden="true"></div>
    <div class="lib-panel">
      <div class="lib-top"><span class="lib-brand"><span class="lib-line">toaster</span><span class="lib-live"></span></span><span class="lib-clock lib-line"></span></div>
      <div class="lib-tabs"><span role="tablist" aria-label="library sections">${SECTIONS.map(([id, name]) => `<button type="button" role="tab" data-section="${id}">${name}</button>`).join('')}</span><button type="button" class="lib-findbtn" title="find in your music (${FIND_KEY})">find</button></div>
      <div class="lib-head"></div>
      <div class="lib-now"></div>
      <div class="lib-meta"></div>
      <div class="lib-find" hidden><span class="lib-line">find</span><input type="search" class="lib-q" placeholder="a title, an artist, an album" aria-label="find in your music" autocomplete="off" spellcheck="false"><span class="lib-line lib-count"></span></div>
      <div class="lib-shelf" hidden><span class="lib-line">played lately</span><div class="lib-tiles" role="listbox" aria-label="albums played lately"></div></div>
      <div class="lib-list" role="listbox" tabindex="-1"></div>
      <div class="lib-keys"><span class="lib-line"></span></div>
    </div>`;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Library');
  root.classList.toggle('titlebar', !!host.titleBar?.());
  const q = (sel) => root.querySelector(sel);
  const parts = { art: q('.lib-art'), live: q('.lib-live'), clock: q('.lib-clock'), tabs: q('.lib-tabs'), head: q('.lib-head'), now: q('.lib-now'), meta: q('.lib-meta'), list: q('.lib-list'), keys: q('.lib-keys span'),
    find: q('.lib-find'), q: q('.lib-q'), count: q('.lib-count'), shelf: q('.lib-shelf'), tiles: q('.lib-tiles') };

  // ---------------------------------------------------------------- what is listed

  const openAlbum = () => S.albums.find((a) => a.id === S.openId) || null;
  // where the queue was when nothing of the library plays (after a restart): { album, index, at }, if that track is still in the folder
  function resumed() {
    const r = host.resume?.(), a = r && !host.playing().track && S.byPath.get(r.path);
    return a ? { album: a, index: a.tracks.findIndex((t) => t.path === r.path), at: r.at } : null;
  }
  const sceneRows = () => { const s = host.scenes(); return [{ kind: 'save' }, ...s.presets.map((scene) => ({ kind: 'scene', scene, user: false })), ...s.user.map((scene) => ({ kind: 'scene', scene, user: true }))]; };
  // find's rows for what is typed (kept till what is typed or the albums change)
  function found() {
    const q = S.find?.q || '';
    if (S.found.q !== q || S.found.sig !== S.sig) S.found = { q, sig: S.sig, ...findRows(S.albums, q, FIND_MAX) };
    return S.found;
  }
  const finding = () => S.section === 'music' && !!S.find && !!S.find.q.trim(); // (an empty line lists your music as it is)
  function rows() {
    if (finding()) return found().rows;
    if (S.section === 'music') return S.albums.length ? musicRows(S.albums, S.openId) : [{ kind: 'choose' }];
    if (S.section === 'radio') return [...host.stations().map((station) => ({ kind: 'station', station })), { kind: 'add' }];
    return sceneRows();
  }
  const cursor = () => (S.cursor[S.section] = moveCursor(rows().length, S.cursor[S.section], 0));

  // ---------------------------------------------------------------- the cover in characters

  const images = new Map(), masks = new Map(), bigKeys = [];
  const imageOf = (id) => {
    if (!images.has(id)) {
      const im = new Image();
      im.src = `data:image/jpeg;base64,${S.covers[id]}`;
      images.set(id, im.decode().then(() => im));
      while (images.size > 40) images.delete(images.keys().next().value); // (kept forty at a time: a library has hundreds)
    }
    return images.get(id);
  };
  // A cover as an image of white glyphs on nothing, cols x rows of them on w x h pixels (the cover's middle, cut to that shape, one
  // light to a cell): a URL for CSS to use as a mask. Kept by what it's for, so an album shown again is no work.
  function glyphMask(id, cols, rows, w, h) {
    const key = [id, cols, rows, w, h].join('|');
    if (!masks.has(key)) {
      masks.set(key, (async () => {
        const im = await imageOf(id);
        const small = doc.createElement('canvas');
        small.width = cols;
        small.height = rows;
        const g = small.getContext('2d', { willReadFrequently: true });
        const aspect = (cols * 0.6) / rows, wider = im.naturalWidth / im.naturalHeight > aspect;
        const sw = wider ? im.naturalHeight * aspect : im.naturalWidth, sh = wider ? im.naturalHeight : im.naturalWidth / aspect;
        g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
        const lines = glyphRows(g.getImageData(0, 0, cols, rows).data, cols, rows);
        const out = doc.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d'), cell = h / rows;
        await doc.fonts?.load(`700 ${cell}px "JetBrains Mono"`);
        ctx.font = `700 ${cell}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#fff'; // (only its alpha is used)
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (lines[r][c] !== ' ') ctx.fillText(lines[r][c], c * (w / cols), r * cell);
        return URL.createObjectURL(await new Promise((resolve) => out.toBlob(resolve)));
      })().catch((err) => { masks.delete(key); throw err; }));
      if (w > COVER_PX * 2) { // (the big ones are kept ten at a time)
        bigKeys.push(key);
        while (bigKeys.length > 10) { const old = bigKeys.shift(), url = masks.get(old); masks.delete(old); url?.then((u) => URL.revokeObjectURL(u), () => {}); }
      }
    }
    return masks.get(key);
  }

  // a small cover (an <i class="lib-cover" data-cover="id"> with a <b> inside) takes its picture when it comes into view
  const seen = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { seen.unobserve(e.target); coverOn(e.target); }
  }, { root: parts.list, rootMargin: '240px' }) : null;
  function coverOn(el) {
    const id = el.dataset.cover;
    if (!id || !S.covers[id]) return;
    glyphMask(id, COVER_COLS, COVER_ROWS, COVER_PX, COVER_PX).then((url) => { if (el.dataset.cover === id && el.firstElementChild) el.firstElementChild.style.setProperty('--mask', `url("${url}")`); }, () => {});
  }
  const coversIn = (el) => { for (const c of el.querySelectorAll('.lib-cover[data-cover]')) { if (!c.dataset.cover) continue; if (seen && el === parts.list) seen.observe(c); else coverOn(c); } };
  const cover = (id, cls = '') => `<i class="lib-cover ${cls}" data-cover="${id || ''}"><b></b></i>`;

  // The open album's cover, big, behind everything: where CSS puts the element (the whole window, or the right of a wide one) says how
  // big; the glyphs' size follows (a hundred rows or so, whatever the window); a new cover fades in over the old one
  async function paintArt() {
    if (!S.open) return;
    const id = openAlbum()?.cover || null, token = ++S.artToken;
    if (!id || !S.covers[id]) {
      S.artKey = '';
      for (const old of [...parts.art.children]) { old.classList.remove('in'); setTimeout(() => old.remove(), 700); }
      return;
    }
    const el = doc.createElement('i');
    el.className = 'lib-glyphs';
    parts.art.append(el);
    const wide = win.matchMedia(WIDE).matches, r = el.getBoundingClientRect(), dpr = Math.min(2, win.devicePixelRatio || 1);
    const cell = Math.max(5, Math.min(wide ? 12 : 9, r.height / (wide ? 103 : 137))), rowsN = Math.max(1, Math.floor(r.height / cell)), colsN = Math.max(1, Math.floor(r.width / (0.6 * cell)));
    const key = [id, Math.round(r.width), Math.round(r.height), wide].join('|');
    if (key === S.artKey && parts.art.querySelector('.lib-glyphs.in')) { el.remove(); return; }
    let url;
    try { url = await glyphMask(id, colsN, rowsN, Math.max(1, Math.round(r.width * dpr)), Math.max(1, Math.round(r.height * dpr))); } catch { el.remove(); return; }
    if (token !== S.artToken || !S.open) { el.remove(); return; }
    S.artKey = key;
    el.style.setProperty('--mask', `url("${url}")`);
    win.requestAnimationFrame(() => el.classList.add('in'));
    for (const old of [...parts.art.children]) if (old !== el) { old.classList.remove('in'); setTimeout(() => old.remove(), 700); }
  }

  // ---------------------------------------------------------------- painting

  const paintTabs = () => { for (const b of parts.tabs.querySelectorAll('[data-section]')) { const on = b.dataset.section === S.section; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); } };

  function paintHead() {
    let html;
    if (S.section === 'music') {
      const a = openAlbum();
      if (a) html = `${cover(a.cover)}<div><div class="lib-name lib-line">${esc(a.album)}</div><div class="lib-sub lib-line">${esc(albumLine(a))}</div></div>`;
      else html = `<div><div class="lib-name lib-line">your music</div><div class="lib-sub lib-line">${S.albums.length ? `${S.albums.length} albums · ${S.tracks} tracks` : S.scanning ? 'looking for music…' : 'no music yet'}</div></div>`;
    } else if (S.section === 'radio') {
      const n = host.stations().length;
      html = `<div><div class="lib-name lib-line">radio</div><div class="lib-sub lib-line">${n ? `${n} ${n === 1 ? 'station' : 'stations'}` : 'no stations yet'}</div></div>`;
    } else {
      const s = host.scenes(), n = s.presets.length + s.user.length;
      html = `<div><div class="lib-name lib-line">scenes</div><div class="lib-sub lib-line">${n} scenes · ${s.user.length} of yours</div></div>`;
    }
    parts.head.innerHTML = html;
    coversIn(parts.head);
  }

  // what's playing: the strip, with a bar of the foreground colour at its left, and a stop square (where the source can stop)
  function paintNow() {
    const p = host.playing();
    parts.now.hidden = !p.title;
    parts.now.innerHTML = p.title ? `<div class="t"><div class="title">${esc(p.title)}</div><div class="by">${esc(p.artist || '')}${p.ms ? `  ${fmtDuration(p.ms)}` : ''}</div></div>${p.stoppable ? '<button type="button" class="stop" aria-label="stop" title="stop"><i></i></button>' : ''}` : '';
  }

  const count = (n) => Number(n).toLocaleString('en-US');
// a folder as the panel has room for it: its last folders if it is long (…/golden-library-test/library)
const shortLabel = (label, max = 30) => {
  if (label.length <= max) return label;
  const parts = label.split('/');
  let out = parts.pop();
  while (parts.length && `…/${parts[parts.length - 1]}/${out}`.length <= max) out = `${parts.pop()}/${out}`;
  return `…/${out}`;
};
  // the queue's two modes, on the meta line as two buttons: what repeats (Shift+R) and the order (Shift+S)
  const REPEAT_TEXT = { album: 'plays the album through, then repeats', all: 'plays on through your music', one: 'plays this track again and again' };
  const modes = () => `${host.repeat()}|${host.shuffle()}`;
  function paintMeta() {
    let left, right;
    S.modesSig = modes();
    if (S.section === 'music') {
      left = `<button type="button" class="lib-line lib-mode" data-do="repeat" title="what repeats (shift+R)">${REPEAT_TEXT[host.repeat()]}</button><button type="button" class="lib-line lib-mode" data-do="shuffle" title="the order (shift+S)">${host.shuffle() ? 'shuffled' : 'in order'}</button>`;
      const p = S.progress;
      right = S.scanning ? (p?.reading ? `reading ${count(p.read)} of ${count(p.reading)}` : p?.seen ? `listing ${count(p.seen)} files` : 'scanning…') : S.error ? esc(S.error) : esc(shortLabel(S.folder || source.folder || ''));
    } else if (S.section === 'radio') { left = 'the stations you have played, the latest first'; right = ''; }
    else { left = 'a scene is the whole setup: background, theme, code look and layout'; right = ''; }
    parts.meta.innerHTML = `${S.section === 'music' ? `<span class="lib-modes">${left}</span>` : `<span class="lib-line">${left}</span>`}${right ? `<button type="button" class="lib-line lib-folder" ${S.section === 'music' && !S.scanning ? '' : 'disabled'} title="${S.section === 'music' ? esc(`${S.folder || source.folder || ''}: choose another folder`) : ''}">${right}</button>` : ''}`;
  }

  function trackRow(row, i, now, back) {
    const t = row.track, on = !!now.track && now.track === t.path, here = !on && back && back.album === row.album && back.index === row.index;
    return `<div class="lib-row track${on ? ' on' : ''}${here ? ' resume' : ''}" data-i="${i}" role="option" aria-selected="${on}"><span class="n">${on ? '▶' : here ? '❚❚' : two(row.index + 1)}</span><span class="t">${esc(t.title)}</span><span class="d">${here ? `${fmtDuration(back.at * 1000) || '0:00'} / ` : ''}${fmtDuration(t.ms)}</span></div>`;
  }
  const albumRow = (row, i) => `<div class="lib-row album" data-i="${i}" role="option">${cover(row.album.cover, 'small')}<span class="t"><b>${esc(row.album.album)}</b>${row.album.artist ? ` <em>· ${esc(row.album.artist)}</em>` : ''}</span><span class="d">${row.album.tracks.length}</span></div>`;

  function stationRow(row, i, now) {
    const s = row.station, parts2 = stationParts(s.url), on = !!now.radio && now.radio === s.url;
    return `<div class="lib-row station${on ? ' on' : ''}" data-i="${i}" role="option" aria-selected="${on}"><span class="n">${on ? '▶' : two(i + 1)}</span><span class="t"><b>${esc(parts2.host)}</b> <em>${esc(parts2.path)}</em></span><span class="d">${esc(agoText(s.at))}</span></div>`;
  }

  function sceneCard(row, i) {
    if (row.kind === 'save') return `<div class="lib-card save" data-i="${i}" role="option"><div class="pic"><span>+</span></div><div class="nm"><span>save this setup as a scene</span></div></div>`;
    const sc = row.scene, on = host.sceneOn(sc), pic = sc.picture || scenePicture(sc.settings), renaming = S.renaming === sc.id, armed = S.armed === sc.id;
    const name = renaming ? `<input class="lib-rename" value="${esc(sc.name)}" maxlength="40" aria-label="the scene's name" spellcheck="false">` : `<span>${esc(sc.name)}</span>`;
    const acts = row.user && !renaming ? `<span class="acts"><button type="button" data-do="rename">rename</button><button type="button" data-do="delete">${armed ? 'sure?' : 'delete'}</button></span>` : '';
    return `<div class="lib-card${on ? ' on' : ''}" data-i="${i}" role="option" aria-selected="${on}"><div class="pic">${pic ? `<img src="${pic}" alt="" draggable="false">` : '<span>♪</span>'}</div><div class="nm">${name}${acts}</div></div>`;
  }

  // find's rows: an album as the list has it, a track with its artist and album; the words typed marked wherever they are
  function marked(text, words) {
    let out = '', at = 0;
    for (const [a, b] of findMarks(text, words)) { out += `${esc(text.slice(at, a))}<mark>${esc(text.slice(a, b))}</mark>`; at = b; }
    return out + esc(text.slice(at));
  }
  function foundRow(row, i, now, words) {
    if (row.kind === 'album') {
      const a = row.album;
      return `<div class="lib-row album found" data-i="${i}" role="option">${cover(a.cover, 'small')}<span class="t"><b>${marked(a.album, words)}</b>${a.artist ? ` <em>· ${marked(a.artist, words)}</em>` : ''}</span><span class="d">${a.tracks.length}</span></div>`;
    }
    const t = row.track, on = !!now.track && now.track === t.path, by = [t.artist, row.album.album].filter(Boolean);
    return `<div class="lib-row track found${on ? ' on' : ''}" data-i="${i}" role="option" aria-selected="${on}"><span class="n">${on ? '▶' : '♪'}</span><span class="t">${marked(t.title, words)}${by.length ? ` <em>${by.map((x) => marked(x, words)).join(' · ')}</em>` : ''}</span><span class="d">${fmtDuration(t.ms)}</span></div>`;
  }
  const foundCount = () => {
    if (!finding()) return '';
    const { rows: r, total } = found(), n = (x) => Number(x).toLocaleString('en-US');
    return !total ? 'nothing found' : total > r.length ? `${n(r.length)} of ${n(total)}: type more` : `${n(total)} found`;
  };

  // The shelf: the last six albums played that are still in the folder, a small cover each over its name, above your music (not while
  // finding); ↑ from the list's first row steps onto it, ← → go along it, Enter or a click plays one, ↓ goes back to the list
  const shelfAlbums = () => (host.recent?.() || []).map((id) => S.albums.find((a) => a.id === id)).filter(Boolean);
  const shelfShown = () => S.section === 'music' && !finding() && shelfAlbums().length > 0;
  function paintShelf() {
    const show = shelfShown(), albums = show ? shelfAlbums() : [], now = host.playing(), playingAlbum = now.track && S.byPath.get(now.track);
    S.shelfSig = JSON.stringify(host.recent?.() || []);
    if (!show) S.onShelf = false;
    S.shelfAt = Math.max(0, Math.min(albums.length - 1, S.shelfAt));
    parts.shelf.hidden = !show;
    parts.tiles.innerHTML = albums.map((a, i) => `<button type="button" class="lib-tile${S.onShelf && i === S.shelfAt ? ' cursor' : ''}${playingAlbum === a ? ' on' : ''}" data-shelf="${i}" role="option" title="${esc(a.album)}${a.artist ? ` · ${esc(a.artist)}` : ''}">${cover(a.cover, 'tile')}<span class="nm">${esc(a.album)}</span><span class="by">${esc(a.artist || '')}</span></button>`).join('');
    coversIn(parts.tiles);
    parts.list.classList.toggle('off', S.onShelf); // (the list's cursor rests while the shelf has the keys)
  }
  function playShelf(i) {
    const a = shelfAlbums()[i];
    if (!a) return;
    S.openId = a.id;
    S.followPlaying = true;
    S.onShelf = false;
    host.play(a, null);
    S.cursor.music = 0;
    paintHead(); paintList(); paintArt();
    markCursor();
  }

  function emptyRow() {
    const nothing = !source.supported && source.kind === 'web';
    const text = S.scanning ? 'looking for music…' : nothing ? 'this browser can not open a folder: try Chrome or Edge, or drop audio files on the window' : S.error ? esc(S.error) : S.haveData ? `no music found in ${esc(S.folder)}: choose another folder` : 'choose the folder your music is in';
    return `<div class="lib-row choose" data-i="0" role="option"><span class="n">+</span><span class="t">${text}</span><span class="d"></span></div>`;
  }

  function paintList() {
    const keepScroll = parts.list.scrollTop, now = host.playing(), r = rows(), cur = cursor();
    if (S.section === 'scenes') parts.list.innerHTML = `<div class="lib-scenes">${r.map((row, i) => sceneCard(row, i)).join('')}</div>`;
    else if (S.section === 'radio') parts.list.innerHTML = `${r.length === 1 ? '<div class="lib-note lib-line">no stations yet: paste a stream\'s address below (docs/radio-stations.md lists a few that publish theirs)</div>' : ''}${r.map((row, i) => (row.kind === 'add' ? `<div class="lib-row add" data-i="${i}" role="option"><span class="n">+</span><span class="t"><input type="url" class="lib-address" placeholder="paste a stream's address, then enter" aria-label="a radio stream's address" autocomplete="off" spellcheck="false"></span><span class="d"></span></div>` : stationRow(row, i, now))).join('')}`;
    else if (finding()) {
      const words = findWords(S.find.q);
      parts.list.innerHTML = r.length ? r.map((row, i) => foundRow(row, i, now, words)).join('') : `<div class="lib-note lib-line">nothing in your music has ${words.length > 1 ? 'all of those words' : 'that'}: a title, an artist or an album, any part of one</div>`;
    } else { const back = resumed(); parts.list.innerHTML = r.map((row, i) => (row.kind === 'track' ? trackRow(row, i, now, back) : row.kind === 'album' ? albumRow(row, i) : emptyRow())).join(''); }
    parts.count.textContent = foundCount();
    paintShelf();
    parts.list.scrollTop = keepScroll;
    markCursor(cur, false);
    coversIn(parts.list);
    S.listSig = listSig();
  }

  // the row the cursor is on is outlined (the one playing is the inverted one); in view
  function markCursor(i = cursor(), scroll = true) {
    for (const el of parts.list.querySelectorAll('.cursor')) el.classList.remove('cursor');
    const el = parts.list.querySelector(`[data-i="${i}"]`);
    el?.classList.add('cursor');
    if (el && scroll) el.scrollIntoView({ block: 'nearest' });
  }

  function paintKeys() {
    const k = host.key();
    const more = S.section === 'music' ? '←→ fold' : S.section === 'scenes' ? '←→ move' : '';
    const items = S.find ? ['esc ends find', '↑↓ pick', 'enter plays', 'a click on an album opens it', `${k} library`]
      : [`${k} library`, 'esc closes', '↑↓ pick', 'enter plays', ...(S.section === 'music' ? [`${FIND_KEY} find`] : []), ...(more ? [more] : []), 'tab sections', 'shift+R repeat', 'shift+S shuffle'];
    parts.keys.innerHTML = items.map((t, i) => `<span>${i ? ' · ' : ''}${esc(t)}</span>`).join('');
  }

  const paintAll = () => { paintTabs(); paintHead(); paintNow(); paintMeta(); paintList(); paintKeys(); paintArt(); };

  // ---------------------------------------------------------------- the clock, and what is playing (a few times a second)

  const clockText = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  let clockTimer = 0;
  const tickClock = () => { parts.clock.textContent = clockText(); parts.live.textContent = host.live() ? '● LIVE' : '○ IDLE'; };

  // what makes the list look different from how it was painted: what is playing, the stations, the scenes and which is on
  function listSig() {
    const p = host.playing();
    if (S.section === 'radio') return JSON.stringify([p.radio, host.stations()]);
    if (S.section === 'scenes') return JSON.stringify([host.scenes().user, host.scenes().presets.length, [...host.scenes().presets, ...host.scenes().user].map((s) => host.sceneOn(s))]);
    return p.track || '';
  }
  function update() {
    if (!S.open) return;
    tickClock();
    const p = host.playing(), nowSig = `${p.id}|${p.ms}|${p.stoppable}`;
    if (nowSig !== S.nowSig) { S.nowSig = nowSig; paintNow(); }
    if (modes() !== S.modesSig) paintMeta(); // (changed from Ctrl+K)
    if (JSON.stringify(host.recent?.() || []) !== S.shelfSig) paintShelf(); // (an album played: first on the shelf)
    if (!S.typing && listSig() !== S.listSig) {
      if (S.section === 'music' && p.track) { const a = S.byPath.get(p.track); if (a && S.followPlaying) { S.openId = a.id; paintHead(); paintArt(); } }
      paintList();
    }
  }

  // ---------------------------------------------------------------- the tracks

  // a cheap fingerprint of what a scan gave, so one that found nothing new repaints nothing
  function signatureOf(tracks, covers) {
    let h = 2166136261;
    const add = (s) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); };
    for (const t of tracks) add(`${t.path}|${t.title}|${t.artist}|${t.album}|${t.track}|${t.ms}|${t.cover}\n`);
    add(Object.keys(covers).join(','));
    return `${tracks.length}:${h >>> 0}`;
  }
  function setData({ folder, tracks, covers }) {
    S.folder = folder ?? source.folder;
    S.haveData = true;
    const sig = signatureOf(tracks, covers);
    if (sig === S.sig) { paintMeta(); return; }
    const old = S.section === 'music' && !finding() ? rows()[cursor()] : null;
    S.sig = sig;
    S.covers = covers;
    S.tracks = tracks.length;
    S.albums = groupAlbums(tracks.map(makeTrack));
    S.byPath = new Map(S.albums.flatMap((a) => a.tracks.map((t) => [t.path, a])));
    const p = host.playing(), playing = p.track && S.byPath.get(p.track), back = !S.haveAlbums && resumed();
    if (back) S.openId = back.album.id; // (the first list after a restart: the album you were playing, the cursor on its track)
    else if (!S.albums.some((a) => a.id === S.openId)) S.openId = (playing || S.albums[0])?.id || null;
    S.cursor.music = finding() ? 0 : back ? back.index : keepCursor(old, musicRows(S.albums, S.openId), S.cursor.music);
    S.haveAlbums = true;
    paintAll();
  }

  async function scan() {
    if (S.scanning) return;
    S.scanning = true;
    S.error = '';
    S.progress = null;
    paintMeta();
    try {
      setData(await source.scan((p) => { S.progress = p; if (S.open && S.section === 'music') paintMeta(); }));
      S.scannedAt = Date.now();
    } catch (err) {
      if (!/stopped/.test(String(err?.message))) S.error = `could not read the folder: ${String(err?.message || err).replace(/^Error invoking remote method '[^']*': (Error: )?/, '').replace(/^refused: /, '')}`;
    } finally { S.scanning = false; if (S.open) { paintMeta(); if (!S.albums.length) { paintHead(); paintList(); } } }
  }

  // the cached list at once, then a scan (unless there was one a minute ago)
  async function load() {
    try {
      const have = source.kind === 'desktop' ? await source.start() : true;
      if (!S.haveData) { const cached = await source.cached(); if (cached) setData(cached); }
      if (have && source.kind === 'desktop' && Date.now() - S.scannedAt > 60000) await scan();
      else if (source.kind === 'web' && source.folder && !S.haveData) await scan();
      if (S.open && !S.albums.length) { paintHead(); paintList(); paintMeta(); }
    } catch (err) { S.error = String(err?.message || err); paintMeta(); }
  }

  async function choose() {
    if (source.kind === 'web' && !source.supported) { host.say('this browser can not open a folder: try Chrome or Edge'); return; }
    try {
      const label = await source.choose();
      if (label === null) return;
      closeFind(false);
      S.folder = label;
      S.sig = '';
      S.haveData = false;
      S.albums = [];
      S.openId = null;
      S.cursor.music = 0;
      paintAll();
      await scan();
    } catch (err) { host.fail(err); }
  }

  // ---------------------------------------------------------------- the keys

  function setSection(id) {
    if (id === S.section) return;
    finishInput(false);
    closeFind(false);
    S.onShelf = false;
    S.section = id;
    paintTabs(); paintHead(); paintMeta(); paintList(); paintKeys();
    S.listSig = listSig();
    markCursor();
  }
  const columns = () => { const grid = parts.list.querySelector('.lib-scenes'); return grid ? Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length) : 1; };

  function move(delta) {
    if (S.onShelf) { if (delta > 0) { S.onShelf = false; paintShelf(); markCursor(); } return; }
    if (delta === -1 && S.section === 'music' && cursor() === 0 && shelfShown()) { S.onShelf = true; paintShelf(); return; } // (one up from the top: the shelf; Home and Page Up stay in the list)
    S.cursor[S.section] = moveCursor(rows().length, S.cursor[S.section], delta);
    markCursor();
  }
  function side(dir) {
    if (S.onShelf) { S.shelfAt = Math.max(0, Math.min(shelfAlbums().length - 1, S.shelfAt + dir)); paintShelf(); return; }
    if (S.section === 'scenes') { move(dir); return; }
    if (S.section !== 'music') return;
    const r = rows(), change = dir > 0 ? unfold(S.albums, r, cursor()) : fold(S.albums, r, cursor());
    if (!change) return;
    S.openId = change.openId;
    S.cursor.music = change.cursor;
    S.followPlaying = false;
    paintHead(); paintList(); paintArt();
    markCursor();
  }

  function activate() {
    if (S.onShelf) { playShelf(S.shelfAt); return; }
    const row = rows()[cursor()];
    if (!row) return;
    try {
      if (row.kind === 'track') { const back = resumed(); host.play(row.album, row.index, back && back.album === row.album && back.index === row.index ? back.at : 0); }
      else if (row.kind === 'album') {
        S.openId = row.album.id;
        S.cursor.music = 0;
        S.followPlaying = true;
        host.play(row.album, null);
        paintHead(); paintList(); paintArt();
      } else if (row.kind === 'choose') choose();
      else if (row.kind === 'station') host.playStation(row.station.url);
      else if (row.kind === 'add') parts.list.querySelector('.lib-address')?.focus();
      else if (row.kind === 'save') {
        const scene = host.saveScene();
        S.renaming = scene.id;
        paintHead();
        S.cursor.scenes = rows().findIndex((r) => r.scene === scene || r.scene?.id === scene.id);
        paintList();
        markCursor();
        beginInput();
      } else if (row.kind === 'scene') host.applyScene(row.scene);
    } catch (err) { host.fail(err); }
  }

  // Find (Ctrl+F, ⌘F on a Mac, or the find button): a line over the list, and what is typed there narrows your music to the albums and the
  // tracks that have every word, as you type. Esc ends it: the list as it was, the cursor where it was.
  function openFind() {
    if (S.section !== 'music') setSection('music');
    if (!S.find) { S.find = { q: '', from: S.cursor.music }; parts.find.hidden = false; paintKeys(); }
    parts.q.focus();
    parts.q.select();
  }
  function closeFind(repaint = true) {
    if (!S.find) return;
    S.cursor.music = S.find.from;
    S.find = null;
    parts.find.hidden = true;
    parts.q.value = '';
    parts.q.blur();
    if (repaint) { paintList(); paintKeys(); markCursor(); }
  }
  function findInput() {
    if (!S.find) return;
    if (!finding()) S.find.from = S.cursor.music;
    S.find.q = parts.q.value;
    S.cursor.music = finding() ? 0 : S.find.from;
    if (finding()) parts.list.scrollTop = 0;
    paintList();
    markCursor();
  }
  // a click on an album that find listed: find ends, and that album is open in the list, the cursor on its first track
  function openFromFind(album) {
    closeFind(false);
    S.openId = album.id;
    S.cursor.music = 0;
    S.followPlaying = false;
    paintHead(); paintList(); paintKeys(); paintArt();
    markCursor();
  }
  // the find line's keys: up and down (and the page keys) go through what was found, Enter plays it, Esc ends find, Tab the next
  // section; anything else is typed into the line, not the page's keys
  function findKey(e) {
    const k = e.key, take = (fn) => { e.preventDefault(); e.stopImmediatePropagation(); fn(); };
    if (k === 'Escape') take(() => closeFind());
    else if (k === 'ArrowDown' || k === 'ArrowUp') take(() => move(k === 'ArrowDown' ? 1 : -1));
    else if (k === 'PageDown' || k === 'PageUp') take(() => move(k === 'PageDown' ? 8 : -8));
    else if (k === 'Enter') take(() => { if (!e.repeat) activate(); });
    else if (k === 'Tab') take(() => setSection(nextSection(S.section, e.shiftKey ? -1 : 1)));
    else e.stopPropagation();
  }

  // an input in the list (the radio's address, a scene's name) takes the keys itself
  function beginInput() {
    const input = parts.list.querySelector('.lib-rename, .lib-address');
    if (!input) return;
    S.typing = true;
    input.focus();
    input.select?.();
  }
  function finishInput(commit) {
    const input = parts.list.querySelector('.lib-rename, .lib-address');
    const wasTyping = S.typing;
    S.typing = false;
    if (!wasTyping) return;
    const renaming = S.renaming, value = input?.value ?? '';
    S.renaming = null;
    input?.blur?.();
    if (input?.classList.contains('lib-rename')) {
      if (commit && renaming) host.renameScene(renaming, value);
      paintHead(); paintList();
    } else if (commit && value.trim()) {
      Promise.resolve(host.addStation(value)).then(() => { input.value = ''; update(); }, host.fail);
    }
    markCursor();
  }

  const cycleRepeat = () => { host.say(host.setRepeat(nextRepeat(host.repeat()))); paintMeta(); };
  const toggleShuffle = () => { host.say(host.setShuffle(!host.shuffle())); paintMeta(); };

  function deleteKey() {
    const row = rows()[cursor()];
    if (row?.kind === 'scene' && row.user) askDelete(row.scene.id);
  }
  function askDelete(id) {
    if (S.armed !== id) { S.armed = id; setTimeout(() => { if (S.armed === id) { S.armed = null; if (S.open && !S.typing) paintList(); } }, 3000); paintList(); return; }
    S.armed = null;
    host.deleteScene(id);
    paintHead(); paintList();
  }
  function renameKey() {
    const row = rows()[cursor()];
    if (row?.kind !== 'scene' || !row.user) return;
    S.renaming = row.scene.id;
    paintList();
    markCursor();
    beginInput();
  }

  function onKey(e) {
    if (!S.open || host.blocked()) return;
    // Ctrl+F or ⌘F: find in your music (over the library, not a browser's own find bar)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); e.stopImmediatePropagation(); openFind(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target?.closest?.('.lib-find')) { findKey(e); return; }
    if (S.typing || (e.target?.closest && e.target.closest('.lib-list input'))) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); finishInput(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finishInput(false); }
      else e.stopPropagation(); // (typed into the field: not the page's keys)
      return;
    }
    const k = e.key, take = (fn) => { e.preventDefault(); e.stopImmediatePropagation(); fn(); };
    const scenes = S.section === 'scenes';
    if (k === 'Escape') take(S.find ? () => closeFind() : close); // (with find's line open, Esc ends find first)
    else if (k === 'ArrowDown' || k === 'ArrowUp') take(() => move((k === 'ArrowDown' ? 1 : -1) * (scenes ? columns() : 1)));
    else if (k === 'ArrowRight' || k === 'ArrowLeft') take(() => side(k === 'ArrowRight' ? 1 : -1));
    else if (k === 'Home' || k === 'End') take(() => { if (S.onShelf) { S.onShelf = false; paintShelf(); } move(k === 'Home' ? -1e9 : 1e9); });
    else if (k === 'PageDown' || k === 'PageUp') take(() => move((k === 'PageDown' ? 1 : -1) * 8 * (scenes ? columns() : 1)));
    else if (k === 'Enter') take(() => { if (!e.repeat) activate(); });
    else if (k === 'Tab') take(() => setSection(nextSection(S.section, e.shiftKey ? -1 : 1)));
    else if (e.shiftKey && k.toLowerCase() === 'r') take(cycleRepeat); // (Shift+R and Shift+S: the queue's modes; R and S stay the page's)
    else if (e.shiftKey && k.toLowerCase() === 's') take(toggleShuffle);
    else if (scenes && (k === 'Delete' || k === 'Backspace')) take(deleteKey);
    else if (scenes && k === 'F2') take(renameKey);
    // anything else is the page's own: T, Y, V and the rest still work over the library
  }
  win.addEventListener('keydown', onKey, true);

  parts.tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('lib-findbtn')) openFind();
    else { setSection(b.dataset.section); b.blur(); }
  });
  parts.q.addEventListener('input', findInput);
  parts.tiles.addEventListener('click', (e) => { const t = e.target.closest('[data-shelf]'); if (t) { t.blur(); playShelf(Number(t.dataset.shelf)); } });
  parts.meta.addEventListener('click', (e) => {
    const m = e.target.closest('.lib-mode');
    if (m) { if (m.dataset.do === 'repeat') cycleRepeat(); else toggleShuffle(); m.blur(); return; }
    if (e.target.closest('.lib-folder') && S.section === 'music' && !S.scanning) choose();
  });
  parts.now.addEventListener('click', (e) => { if (e.target.closest('.stop')) host.stop(); });
  parts.list.addEventListener('click', (e) => {
    if (e.target.closest('input')) return;
    const el = e.target.closest('[data-i]');
    if (!el) return;
    S.cursor[S.section] = Number(el.dataset.i);
    markCursor(S.cursor[S.section], false);
    const act = e.target.closest('[data-do]')?.dataset.do, row = rows()[S.cursor[S.section]];
    if (act === 'rename') { renameKey(); return; }
    if (act === 'delete') { if (row?.kind === 'scene') askDelete(row.scene.id); return; }
    if (row?.kind === 'album') { if (finding()) openFromFind(row.album); else side(1); } // (a click on a folded album opens it; Enter plays it)
    else activate();
  });
  // a pointer-picked row has no focus for the keys to follow
  parts.list.addEventListener('focusin', (e) => { if (e.target.matches?.('.lib-address, .lib-rename')) S.typing = true; });
  parts.list.addEventListener('focusout', (e) => { if (S.typing && e.target.matches?.('.lib-address, .lib-rename') && !e.relatedTarget) finishInput(e.target.matches('.lib-address') ? false : true); });

  let resizeTimer = 0;
  win.addEventListener('resize', () => { if (!S.open) return; clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { S.artKey = ''; paintArt(); }, 150); });

  // ---------------------------------------------------------------- open and close

  function open(section) {
    if (S.open) { if (section) setSection(section); return; }
    S.open = true;
    S.followPlaying = true;
    if (section) S.section = section;
    root.hidden = false;
    doc.body.classList.add('library-open');
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
    const p = host.playing(), playing = p.track && S.byPath.get(p.track), back = !playing && resumed();
    if (playing || back) S.openId = (playing || back.album).id;
    if (S.section === 'music' && (playing || back)) S.cursor.music = Math.max(0, rows().findIndex((r) => r.kind === 'track' && r.track.path === (playing ? p.track : back.album.tracks[back.index].path)));
    S.nowSig = '';
    paintAll();
    load();
  }
  function close() {
    if (!S.open) return;
    finishInput(false);
    closeFind(false);
    S.open = false;
    clearInterval(clockTimer);
    root.hidden = true;
    doc.body.classList.remove('library-open');
  }

  // find from outside (Ctrl+K): the library opens on your music, its find line ready
  const find = () => { if (!S.open) open('music'); openFind(); };

  return { open, close, toggle: (section) => (S.open ? close() : open(section)), update, scan, choose, find, load, paintAll, get isOpen() { return S.open; }, get section() { return S.section; }, rows, state: S };
}
