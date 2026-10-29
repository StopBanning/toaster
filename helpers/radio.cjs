// The radio's song (main.js, radio:titles and radio:cover): its title, read from the stream itself,
// and its cover, picked from the iTunes Store's search. Plain functions, so the tests can run them.

// Icecast and Shoutcast put the titles between the sound's bytes when asked to (Icy-MetaData: 1):
// after every metaint bytes of sound (the icy-metaint header), a length byte (x 16) and that many
// bytes of "StreamTitle='Artist - Title';", zero-padded. Takes the stream's chunks as they come and
// calls onSong with each new title: { title, artist } (split at the first " - "; without one, it's
// all title), or null for an empty one (a station between songs, talking).
function icyTitles(metaint, onSong) {
  let audioLeft = metaint, metaLeft = 0, meta = [], last;
  return (chunk) => {
    let i = 0;
    while (i < chunk.length) {
      if (audioLeft) {
        const n = Math.min(audioLeft, chunk.length - i);
        audioLeft -= n; i += n;
      } else if (!metaLeft) {
        metaLeft = chunk[i++] * 16;
        meta = [];
        if (!metaLeft) audioLeft = metaint;
      } else {
        const n = Math.min(metaLeft, chunk.length - i);
        meta.push(chunk.subarray(i, i + n));
        metaLeft -= n; i += n;
        if (metaLeft) continue;
        audioLeft = metaint;
        // (a block without a title, or the same one again, as some servers send every time, changes nothing)
        const t = streamTitle(Buffer.concat(meta));
        if (t === undefined || t === last) continue;
        last = t;
        const at = t.indexOf(' - ');
        onSong(!t ? null : at < 0 ? { title: t, artist: '' } : { title: t.slice(at + 3).trim(), artist: t.slice(0, at).trim() });
      }
    }
  };
}

// The title in a block of metadata ('' if it's empty, undefined if there's none). UTF-8, or else
// Latin-1, which older servers send.
function streamTitle(bytes) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { text = Buffer.from(bytes).toString('latin1'); }
  return text.match(/StreamTitle='([\s\S]*?)';/)?.[1].trim();
}

// The cover's address from the iTunes Store's search results: the first whose artist and title both
// match ours (one inside the other, in any case), its picture at 600 pixels. None matching: null, as a
// wrong cover is worse than none.
function pickCover(results, artist, title) {
  const alike = (a, b) => {
    a = String(a || '').toLowerCase(); b = String(b || '').toLowerCase();
    return !!a && !!b && (a.includes(b) || b.includes(a));
  };
  const art = (Array.isArray(results) ? results : []).find((r) => alike(r?.artistName, artist) && alike(r?.trackName, title))?.artworkUrl100;
  return typeof art === 'string' && art.startsWith('https://') ? art.replace('100x100bb', '600x600bb') : null;
}

module.exports = { icyTitles, pickCover };
