// Spotify's own player inside the library: the song's official track embed. Inside the app it plays Spotify's 30-second preview:
// the whole song and Spotify's music videos need DRM (Widevine), which stock Electron doesn't have (checked Nov 7 in a hidden window:
// "Unsupported keySystem", the embed badged "Preview"), so open in Spotify is where the whole song and its video play. Choosing
// ▶ preview (or V) is the listener asking for it, so it loads at once (Colin, Nov 6: "make it sick for the layman"): the song and its
// artist on top, Spotify's player under them, close (Esc) and open in Spotify.
// No tokens, media addresses, internal APIs or postMessage commands cross this boundary; closing it destroys the frame.
export function spotifyEmbedUrl(uri) {
  const m = /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri || '');
  if (!m) throw new Error('Choose a Spotify song first.');
  return `https://open.spotify.com/embed/track/${m[1]}`;
}

export function createSpotifyVideo({ document: doc, root, beforeLoad = () => {}, openSpotify }) {
  let panel = null, previous = null, generation = 0, library = null, wasInert = false;
  function close() {
    generation++;
    if (!panel) return;
    panel.remove(); // (the frame goes with it: a hidden player must not keep playing)
    panel = null;
    if (library) library.inert = wasInert;
    library = null;
    previous?.focus?.();
    previous = null;
  }
  function open(track) {
    const url = spotifyEmbedUrl(track.uri); // (checked before the player that is open now is touched)
    close();
    previous = doc.activeElement;
    library = root.querySelector('.lib-panel');
    if (library) { wasInert = !!library.inert; library.inert = true; }
    panel = doc.createElement('div');
    panel.className = 'lib-video';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Spotify player');
    const head = doc.createElement('div');
    head.className = 'lib-video-head';
    const words = doc.createElement('div');
    const title = doc.createElement('h2');
    title.textContent = track.name || 'Spotify';
    const by = doc.createElement('p');
    by.className = 'lib-video-by';
    by.textContent = track.by || '';
    words.append(title, by);
    const actions = doc.createElement('div');
    actions.className = 'lib-video-actions';
    const button = (text, fn) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', fn); actions.append(b); return b; };
    button('open in Spotify', () => { close(); openSpotify(track.uri); });
    const shut = button('close · esc', close);
    head.append(words, actions);
    const slot = doc.createElement('div');
    slot.className = 'lib-video-slot';
    const note = doc.createElement('p');
    note.className = 'lib-video-note';
    note.textContent = "Spotify's 30-second preview. The whole song, and its video when it has one, play in the Spotify app";
    panel.append(head, slot, note);
    root.append(panel);
    shut.focus();
    const gen = generation, current = panel;
    let ready; // (the preparation starts now, with the player)
    try { ready = Promise.resolve(beforeLoad()); } catch (err) { ready = Promise.reject(err); }
    return ready.then(() => {
      if (gen !== generation || current !== panel) return;
      const frame = doc.createElement('iframe');
      frame.title = `Spotify: ${track.name || 'song'}`;
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      frame.setAttribute('allow', 'encrypted-media; fullscreen; picture-in-picture');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.src = url;
      slot.replaceChildren(frame);
    }, () => {
      if (gen !== generation || current !== panel) return;
      note.textContent = "the player couldn't start here: open it in Spotify instead";
    });
  }
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    // (the frame is Spotify's and takes its own keys; Tab stays among this player's controls)
    if (e.key === 'Tab') {
      const controls = [...panel.querySelectorAll('button:not([hidden]), iframe')].filter((b) => !b.disabled);
      const i = controls.indexOf(doc.activeElement);
      if (i === -1 || (!e.shiftKey && i === controls.length - 1) || (e.shiftKey && i === 0)) {
        e.preventDefault(); (e.shiftKey ? controls.at(-1) : controls[0])?.focus();
      }
    }
  }
  return { open, close, key, get isOpen() { return !!panel; } };
}
