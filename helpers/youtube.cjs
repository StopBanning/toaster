// The YouTube playlist reader (the library's youtube section): the playlist's id out of whatever a listener pastes, the
// videos in it, and, when it can't be read, the reason in words. Plain functions, so the tests can run them against a fake
// server; nothing here touches the page. Toaster takes no sound or picture from YouTube: a row is a video's title, channel,
// thumbnail and link as YouTube gives them (its policies forbid altering them), and the listener plays the video on YouTube
// itself, which Toaster hears as it hears any source.
//
// Two ways to read a playlist, the listener's choice, and the same rows from both: { videoId, title, author, published,
// thumbnail, url }. (url is the plain watch link; add &list=<the playlist's id> to have YouTube go on down the playlist.)
//   no key   the playlist's public Atom feed: feedUrl, fetchFeed, parseFeed. Nothing to set up, but YouTube's feed holds
//            only the playlist's newest 15 videos, however long it is (that is YouTube's own limit: there is no page two).
//   own key  the YouTube Data API v3 with the listener's own API key (a key can't ship in an open-source app): listWithKey,
//            every video, 50 to a call, one unit each of the key's 10,000 a day.

const FEED = 'https://www.youtube.com';
const API = 'https://www.googleapis.com';
const PAGE = 50; // (the most playlistItems.list gives in one call)
const PAGES = 20; // (so a thousand videos at most, and a server that never stops saying "more" can't keep this going)
const TIMEOUT = 15 * 1000;

// A playlist's id: letters, digits, _ and -. The ones in use run from about 13 characters (a Mix: RD and a video's id) to
// about 40 (an album's OLAK5uy_...), so 10 to 64 leaves room without letting a sentence through. A video's id is 11.
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// The hosts a link may be on: YouTube's own and its short links. (music.youtube.com is its own case, in playlistId.)
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
// A listener's own lists, which YouTube gives to nobody else however they ask: Watch later, Liked videos, Liked Music.
const PRIVATE_LISTS = new Set(['WL', 'LL', 'LM']);
const NOT_A_LINK = 'That isn\'t a YouTube playlist link.';

// The playlist's id from what the listener pasted: a playlist link (youtube.com/playlist?list=...), a watch link that
// carries one (&list=...), a youtu.be link that does, the same on m.youtube.com, with or without the https://, or the id
// alone. Anything else is refused in words (the page can show the message as it is).
function playlistId(link) {
  const text = typeof link === 'string' ? link.trim() : '';
  if (PLAYLIST_ID.test(text)) return text;
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`); } catch { throw new Error(NOT_A_LINK); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(NOT_A_LINK);
  const host = url.hostname.replace(/\.$/, ''); // (the URL parser has made it lower case)
  if (host === 'music.youtube.com') throw new Error('YouTube Music isn\'t supported. Paste a playlist link from youtube.com instead.');
  if (!HOSTS.has(host)) throw new Error(NOT_A_LINK);
  const list = url.searchParams.get('list');
  if (list === null) throw new Error('That isn\'t a YouTube playlist link: it has no list= in it, which a playlist\'s address has. Open the playlist on YouTube and copy its address.');
  if (PRIVATE_LISTS.has(list)) throw new Error('That list is private to you (Watch later, Liked videos or Liked Music), and YouTube doesn\'t let Toaster read it. Put the songs in a playlist, set it to Unlisted or Public, and paste its link.');
  if (!PLAYLIST_ID.test(list)) throw new Error(NOT_A_LINK);
  return list;
}

const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;
// A picture's address for the page: https, and nothing in it a page could be tricked by (no spaces, quotes, brackets or
// parentheses: YouTube's own never have them).
const SAFE_URL = /^https:\/\/[\w\-.~:/?#@!$&*+,;=%]+$/;
const picture = (url) => (typeof url === 'string' && SAFE_URL.test(url.trim()) ? url.trim() : '');
const words = (value) => (typeof value === 'string' ? value : '');

// ---------------------------------------------------------------- the words for what can go wrong

const notFound = (id) => 'YouTube can\'t find that playlist. It may be private or deleted, or the link may be wrong: only a public or unlisted playlist can be read.'
  + (id.startsWith('RD') ? ' A Mix (its id starts with RD) is made up for each viewer, so there is no playlist to read: use one of your own.' : '');

function slowDown(retryAfter) {
  const n = Number(retryAfter);
  return new Error(`YouTube asks Toaster to slow down: try again in ${n > 0 && n < 3600 ? Math.ceil(n) : 30} s.`);
}

// What a status says when nothing more specific does: slow down, YouTube's own trouble, or just no.
function statusFailure({ status, retryAfter }, said = '') {
  if (status === 429) return slowDown(retryAfter);
  if (status >= 500) return new Error(`YouTube had a problem on its side (HTTP ${status}). Try again in a minute.`);
  return new Error(`YouTube said no (HTTP ${status}${said ? ': ' + said : ''}).`);
}

// One GET: its status, its Retry-After and its body as text. A failure to get that far (no network, no answer in time) is
// said in our own words, never in the runtime's: those can carry the address that was asked, and the key with it.
async function fetchText(fetch, url, { timeout, accept }) {
  try {
    const res = await fetch(url, { headers: { Accept: accept }, signal: AbortSignal.timeout(timeout) });
    return { ok: res.ok, status: res.status, retryAfter: res.headers?.get?.('retry-after'), text: await res.text() };
  } catch (err) {
    throw new Error(err?.name === 'TimeoutError' || err?.name === 'AbortError'
      ? 'YouTube didn\'t answer in time. Try again in a minute.'
      : 'Toaster couldn\'t reach YouTube. Check the internet connection and try again.');
  }
}

// ---------------------------------------------------------------- the feed (no key)

// The entities XML defines, and numeric ones (&#39;, &#x27;), decoded in one pass, so "&amp;lt;" comes out as "&lt;", not "<".
// Any other name (&nbsp;, which XML doesn't define) stays as it is, and a number that isn't a character XML allows (a NUL,
// half of a surrogate pair, beyond U+10FFFF) becomes U+FFFD.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };
function decode(text) {
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|(amp|lt|gt|quot|apos));/g, (_all, dec, hex, name) => {
    if (name) return NAMED[name];
    const n = dec !== undefined ? parseInt(dec, 10) : parseInt(hex, 16);
    const allowed = n === 9 || n === 10 || n === 13 || (n >= 0x20 && n <= 0xd7ff) || (n >= 0xe000 && n <= 0xfffd) || (n >= 0x10000 && n <= 0x10ffff);
    return allowed ? String.fromCodePoint(n) : '\uFFFD';
  });
}

// The XML, read in one pass (nothing here goes back over what it has read, so a broken or hostile feed can't make it slow),
// as a tree of { name, attrs, text, kids }: as much of it as an Atom feed needs. Lenient on purpose: a closing tag finds its
// opening one within a few levels or is ignored, elements left open close at the end, and a tag, comment or CDATA section
// that never closes ends what can be read (a feed cut off half way still gives the entries before the cut). It never fetches
// or expands anything the XML names (no DTD entities), so a bad feed can only be wrong, not dangerous.
const SPANS = [['<!--', '-->'], ['<![CDATA[', ']]>'], ['<?', '?>'], ['<!', '>']]; // (each runs to its own end)

// A tag's attributes, name="value" or name='value' one after another, from what follows its name.
function attributes(rest) {
  const attrs = Object.create(null);
  const next = /\s*([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/y;
  for (let m; next.lastIndex < rest.length && (m = next.exec(rest));) {
    if (m[2] !== undefined || m[3] !== undefined) attrs[m[1]] = decode(m[2] ?? m[3]);
  }
  return attrs;
}

function parseXml(xml) {
  const root = { name: '', attrs: {}, text: '', kids: [] };
  const open = [root];
  let i = 0;
  while (i < xml.length) {
    const top = open[open.length - 1];
    const lt = xml.indexOf('<', i);
    if (lt !== i) top.text += decode(xml.slice(i, lt < 0 ? xml.length : lt));
    if (lt < 0) break;
    const span = SPANS.find(([from]) => xml.startsWith(from, lt));
    if (span) {
      const end = xml.indexOf(span[1], lt + span[0].length);
      if (end < 0) break;
      if (span[0] === '<![CDATA[') top.text += xml.slice(lt + span[0].length, end);
      i = end + span[1].length;
      continue;
    }
    // a tag runs to the first ">" that isn't inside quotes
    let end = lt + 1, quote = '';
    for (; end < xml.length; end++) {
      const c = xml[end];
      if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === '\'') quote = c; else if (c === '>') break;
    }
    if (end >= xml.length) break;
    i = end + 1;
    const tag = /^(\/?)([^\s/]+)([\s\S]*)$/.exec(xml.slice(lt + 1, end));
    if (!tag) continue; // (a "<" with no name after it)
    const [, closing, name, rest] = tag;
    if (closing) {
      for (let at = open.length - 1; at > 0 && at > open.length - 9; at--) {
        if (open[at].name === name) { open.length = at; break; }
      }
    } else {
      const node = { name, attrs: attributes(rest), text: '', kids: [] };
      top.kids.push(node);
      if (!rest.trimEnd().endsWith('/')) open.push(node);
    }
  }
  return root;
}

const kid = (node, name) => node?.kids.find((k) => k.name === name);
const textOf = (node, name) => kid(node, name)?.text.trim() ?? '';

// A feed entry as a row. The video's id is where the feed puts it (yt:videoId), or else in the entry's own id ("yt:video:"
// and the video's); an entry with neither, or one that isn't a video's id, is no row. The link is built here, from the id.
function entryRow(entry) {
  const group = kid(entry, 'media:group');
  const videoId = [textOf(entry, 'yt:videoId'), textOf(entry, 'id').replace(/^yt:video:/, '')].find((v) => VIDEO_ID.test(v));
  if (!videoId) return null;
  return {
    videoId,
    title: textOf(entry, 'title'),
    author: textOf(kid(entry, 'author'), 'name'),
    published: textOf(entry, 'published'), // (as given: when the video went up)
    thumbnail: picture(kid(group, 'media:thumbnail')?.attrs.url),
    url: watchUrl(videoId),
  };
}

// Newest first, by when each video went up; ones with no date that can be read keep the feed's order, after the dated ones.
function newestFirst(rows) {
  const stamp = (row) => { const t = Date.parse(row.published); return Number.isNaN(t) ? -Infinity : t; };
  return rows.map((row, i) => ({ row, t: stamp(row), i }))
    .sort((a, b) => (a.t === b.t ? a.i - b.i : b.t > a.t ? 1 : -1))
    .map((x) => x.row);
}

// The playlist's feed address (base: for the tests' fake server).
function feedUrl(id, base = FEED) {
  return new URL(`/feeds/videos.xml?playlist_id=${playlistId(id)}`, base).toString();
}

// The feed's entries as rows, newest first. An empty feed is an empty list; something that isn't a feed at all (an error
// page, say, or a consent page) is refused in words, so it isn't taken for a playlist with nothing in it.
function parseFeed(xml) {
  const feed = kid(parseXml(typeof xml === 'string' ? xml : ''), 'feed');
  if (!feed) throw new Error('What YouTube sent isn\'t a playlist feed.');
  return newestFirst(feed.kids.filter((k) => k.name === 'entry').map(entryRow).filter(Boolean));
}

// Reads the feed: the playlist's newest 15 videos, newest first. (Whether YouTube's Terms allow reading its feed is for Colin
// to settle before this ships: its robots.txt keeps crawlers off /feeds/videos.xml, and its Terms bar automated access
// except by its permission. This asks once per playlist the listener pastes, and never again on its own.)
async function fetchFeed({ id, fetch = globalThis.fetch, base = FEED, timeout = TIMEOUT } = {}) {
  id = playlistId(id);
  const res = await fetchText(fetch, feedUrl(id, base), { timeout, accept: 'application/atom+xml, application/xml;q=0.9, */*;q=0.8' });
  if (res.status === 404 || res.status === 400) throw new Error(notFound(id));
  if (!res.ok) throw statusFailure(res);
  return parseFeed(res.text);
}

// ---------------------------------------------------------------- with the listener's own key

const QUOTA = 'YouTube says the key\'s daily quota is used up; it resets at midnight Pacific. Try again after that.';
const BAD_KEY = 'YouTube doesn\'t accept that API key. Check that you copied all of it from the Google Cloud console, and that it hasn\'t expired.';
const API_OFF = 'The YouTube Data API v3 isn\'t turned on for that key\'s Google Cloud project. Turn it on there (APIs & Services, then Library), wait a minute, and try again.';
const RESTRICTED = 'That key is restricted, so Toaster can\'t use it. In the Google Cloud console, set its application restriction to None, and its API restriction to None or YouTube Data API v3.';

// Google's own message, fit to show: its markup out (the quota message carries a link), the key out (should a message ever
// echo the address it was asked at), on one line, and not long. (Only its first thousand characters are looked at, so
// nothing sent back can make this slow.)
function clean(text, key) {
  let t = String(text).slice(0, 1000).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  for (const form of new Set([key, encodeURIComponent(key), new URLSearchParams({ k: key }).toString().slice(2)])) t = t.split(form).join('...');
  return t.length > 160 ? `${t.slice(0, 157)}...` : t;
}

// What the API's refusal means, in words. Google names a failure in several places (errors[].reason, details[].reason, status),
// and an older and a newer way for the same one (keyInvalid, API_KEY_INVALID), so all of them are looked at.
function apiFailure(res, key, id) {
  let error = {};
  try { error = JSON.parse(res.text)?.error || {}; } catch { /* (not JSON: a proxy's page, say: the status has to do) */ }
  const named = (list) => (Array.isArray(list) ? list : []).map((e) => String(e?.reason || '').toLowerCase());
  const reasons = [...named(error.errors), ...named(error.details), String(error.status || '').toLowerCase()];
  const any = (...ones) => ones.some((one) => reasons.includes(one));
  const says = words(error.message);
  if (any('quotaexceeded', 'dailylimitexceeded')) return new Error(QUOTA);
  if (any('keyinvalid', 'api_key_invalid') || /api key (not valid|expired)/i.test(says)) return new Error(BAD_KEY);
  if (any('accessnotconfigured', 'service_disabled')) return new Error(API_OFF);
  if (reasons.some((r) => r.includes('blocked'))) return new Error(RESTRICTED);
  if (any('playlistnotfound', 'playlistitemsnotaccessible') || res.status === 404) return new Error(notFound(id));
  if (any('ratelimitexceeded', 'userratelimitexceeded', 'resource_exhausted')) return slowDown(res.retryAfter);
  return statusFailure(res, clean(says, key));
}

// A playlist item as a row, or nothing for one that isn't a video you can play. A private or deleted video keeps its place
// in the playlist, with a stand-in title and no thumbnails; either sign is enough to leave it out. (published is when the
// video was added to the playlist, which is what the API calls the item's publishedAt; the feed's is when the video went up.)
const GONE = new Set(['private video', 'deleted video']);
// The picture the feed gives (480 wide, "high"), or else the nearest this item has.
const SIZES = ['high', 'standard', 'medium', 'default', 'maxres'];
function itemRow(item) {
  const snippet = item?.snippet;
  const videoId = snippet?.resourceId?.videoId;
  if (!snippet || typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) return null;
  const title = words(snippet.title);
  const thumbnail = SIZES.map((size) => picture(snippet.thumbnails?.[size]?.url)).find(Boolean);
  if (!thumbnail || GONE.has(title.trim().toLowerCase())) return null;
  return { videoId, title, author: words(snippet.videoOwnerChannelTitle), published: words(snippet.publishedAt), thumbnail, url: watchUrl(videoId) };
}

// Every video of the playlist, in the playlist's own order, through the YouTube Data API with the listener's key:
// playlistItems.list, 50 to a call, following nextPageToken till there is none (at most PAGES calls, a thousand videos). id is
// the playlist's id (a pasted link works too). Whatever goes wrong is said in words, with none of it carrying the key; and a
// failure on any page is the whole call's, so a list that stops short is never taken for a whole one.
async function listWithKey({ id, key, fetch = globalThis.fetch, api = API, timeout = TIMEOUT } = {}) {
  id = playlistId(id);
  key = typeof key === 'string' ? key.trim() : '';
  if (!key) throw new Error('Paste your YouTube API key first.');
  const rows = [];
  let pageToken = '';
  for (let page = 0; page < PAGES; page++) {
    const url = new URL('/youtube/v3/playlistItems', api);
    url.search = new URLSearchParams({ part: 'snippet', maxResults: String(PAGE), playlistId: id, ...(pageToken ? { pageToken } : {}), key }).toString();
    const res = await fetchText(fetch, url.toString(), { timeout, accept: 'application/json' });
    if (!res.ok) throw apiFailure(res, key, id);
    let body;
    try { body = JSON.parse(res.text); } catch { throw new Error('YouTube sent back something Toaster can\'t read. Try again in a minute.'); }
    for (const item of Array.isArray(body?.items) ? body.items : []) {
      const row = itemRow(item);
      if (row) rows.push(row);
    }
    pageToken = words(body?.nextPageToken);
    if (!pageToken) break;
  }
  return rows;
}

module.exports = { playlistId, feedUrl, parseFeed, fetchFeed, listWithKey };
