import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import http from 'node:http';

const { playlistId, feedUrl, parseFeed, fetchFeed, listWithKey } = createRequire(import.meta.url)('../helpers/youtube.cjs');

const PL = 'PLtVx9d2Fq1kB7mN3pR5sT8uW0yZ4aC6eG'; // a playlist's id (34 characters, as most are)
const KEY = 'AIzaSyD-test_key0123456789abcdefghijklmn'; // an API key (made up)
const vid = (c) => c.repeat(11); // a well-formed video id
const watch = (id) => `https://www.youtube.com/watch?v=${id}`;
const NOT_A_LINK = { message: 'That isn\'t a YouTube playlist link.' };

// Nothing here may reach the real YouTube or Google: a request to anywhere but a fake server on this machine is refused and
// noted, and the last test fails if any was. (The code under test says a refused request in words, so without the note a
// stray real call could hide in an expected message.)
const realFetch = globalThis.fetch;
const outside = [];
globalThis.fetch = (url, ...rest) => {
  if (new URL(String(url)).hostname === '127.0.0.1') return realFetch(url, ...rest);
  outside.push(String(url).replace(/key=[^&]*/, 'key=...'));
  return Promise.reject(new TypeError('no real network in the tests'));
};

// ---------------------------------------------------------------- what a listener pastes

test('every kind of playlist link gives the playlist\'s id, and so does the id alone', () => {
  for (const id of [PL, 'UUabcdefghijklmnopqrstuv', 'OLAK5uy_kAbCdEfGhIjKlMnOpQrStUvWxY', 'PL-_-_-_-_-_', `RD${vid('a')}`, 'a'.repeat(10), 'A1_-'.repeat(16)]) {
    for (const link of [
      `https://www.youtube.com/playlist?list=${id}`,
      `https://youtube.com/playlist?list=${id}`,
      `http://www.youtube.com/playlist?list=${id}`,
      `https://m.youtube.com/playlist?list=${id}`,
      `https://www.youtube.com/playlist?list=${id}&si=abc123&feature=shared`,
      `https://www.youtube.com/watch?v=${vid('a')}&list=${id}`,
      `https://www.youtube.com/watch?v=${vid('a')}&list=${id}&index=3&t=42s`,
      `https://www.youtube.com/watch?list=${id}&v=${vid('a')}`,
      `https://m.youtube.com/watch?v=${vid('a')}&list=${id}`,
      `https://youtu.be/${vid('a')}?list=${id}`,
      `https://youtu.be/${vid('a')}?si=abc&list=${id}`,
      `https://www.youtube.com/embed/videoseries?list=${id}`,
      `www.youtube.com/playlist?list=${id}`,
      `youtube.com/playlist?list=${id}`,
      `youtu.be/${vid('a')}?list=${id}`,
      `HTTPS://WWW.YOUTUBE.COM/playlist?list=${id}`,
      `https://www.youtube.com./playlist?list=${id}`,
      `  https://www.youtube.com/playlist?list=${id}\n`,
      `https://www.youtube.com/playlist?list=${id}#top`,
      id,
      ` ${id}\r\n`,
    ]) assert.equal(playlistId(link), id, link);
  }
});

test('what isn\'t a playlist link is refused in words: other sites, lookalike hosts, other schemes, garbage', () => {
  for (const bad of [
    `https://example.com/playlist?list=${PL}`,
    `https://vimeo.com/${PL}`,
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    `https://notyoutube.com/playlist?list=${PL}`,
    `https://youtube.com.evil.example/playlist?list=${PL}`,
    `https://www.youtube.com.evil.example/watch?v=${vid('a')}&list=${PL}`,
    `https://evil.example/?next=youtube.com/playlist?list=${PL}`,
    `https://evil.example/youtube.com/playlist?list=${PL}`,
    `https://youtube.com@evil.example/playlist?list=${PL}`,
    `ftp://youtube.com/playlist?list=${PL}`,
    'file:///etc/passwd',
    'javascript:alert(1)',
    'view-source:https://www.youtube.com/playlist?list=' + PL,
    'hello world', 'youtube', 'PL', 'not a link at all', '   ', '',
    'https://www.youtube.com/playlist?list=',
    'https://www.youtube.com/playlist?list=PLshort',
    `https://www.youtube.com/playlist?list=${PL}%20x`,
    `https://www.youtube.com/playlist?list=${PL}%2F..%2F..`,
    `https://www.youtube.com/playlist?list=${'a'.repeat(65)}`,
    'a'.repeat(9), 'a'.repeat(65), 'PLabcdefghi!jk', 'PL abcdefghijkl', `${PL}&x=1`,
    undefined, null, 42, {}, [],
  ]) assert.throws(() => playlistId(bad), NOT_A_LINK, String(bad));
});

test('a link with no list says so, a Music link says Music isn\'t supported, and a listener\'s own lists say they\'re private', () => {
  for (const link of [watch(vid('a')), `https://youtu.be/${vid('a')}`, 'https://www.youtube.com/@toaster', 'https://www.youtube.com/playlist', 'https://www.youtube.com/results?search_query=x']) {
    assert.throws(() => playlistId(link), /isn't a YouTube playlist link: it has no list= in it/, link);
  }
  for (const link of [`https://music.youtube.com/playlist?list=${PL}`, `music.youtube.com/watch?v=${vid('a')}&list=${PL}`, 'https://music.youtube.com/', `https://music.youtube.com./playlist?list=${PL}`]) {
    assert.throws(() => playlistId(link), /YouTube Music isn't supported/, link);
  }
  for (const list of ['WL', 'LL', 'LM']) {
    assert.throws(() => playlistId(`https://www.youtube.com/playlist?list=${list}`), /private to you/, list);
    assert.throws(() => playlistId(`https://www.youtube.com/watch?v=${vid('a')}&list=${list}`), /private to you/, list);
  }
});

test('the feed\'s address is YouTube\'s, with the playlist\'s id in it and nothing else', () => {
  assert.equal(feedUrl(PL), `https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`);
  assert.equal(feedUrl(PL, 'http://127.0.0.1:8080'), `http://127.0.0.1:8080/feeds/videos.xml?playlist_id=${PL}`);
  assert.equal(feedUrl(`https://youtu.be/${vid('a')}?list=${PL}`), `https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`);
  for (const bad of [`${PL}&x=1`, `${PL}/../x`, '../../x', '', undefined]) assert.throws(() => feedUrl(bad), NOT_A_LINK, String(bad));
});

// ---------------------------------------------------------------- the feed

// An entry as YouTube's feed writes it, with the fields a row doesn't use as well, to be ignored.
const entry = ({ id, title = 'A song', author = 'An artist', published = '2024-01-01T00:00:00+00:00', thumb = `https://i2.ytimg.com/vi/${id}/hqdefault.jpg`, idTag = true }) => `
 <entry>
  <id>yt:video:${id}</id>
  ${idTag ? `<yt:videoId>${id}</yt:videoId>` : ''}
  <yt:channelId>UCartist000000000000000</yt:channelId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/>
  <author>
   <name>${author}</name>
   <uri>https://www.youtube.com/channel/UCartist000000000000000</uri>
  </author>
  <published>${published}</published>
  <updated>2025-02-02T00:00:00+00:00</updated>
  <media:group>
   <media:title>${title}</media:title>
   <media:content url="https://www.youtube.com/v/${id}?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
   <media:thumbnail url="${thumb}" width="480" height="360"/>
   <media:description>Not a row's business &amp; ignored</media:description>
   <media:community>
    <media:starRating count="9" average="5.00" min="1" max="5"/>
    <media:statistics views="123"/>
   </media:community>
  </media:group>
 </entry>`;
// A feed: the playlist's own title, owner and date first (none of them a row's), then the entries.
const feed = (...entries) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?playlist_id=${PL}"/>
 <id>yt:playlist:${PL}</id>
 <yt:playlistId>${PL}</yt:playlistId>
 <yt:channelId>UCowner0000000000000000</yt:channelId>
 <title>The Playlist's Own Title</title>
 <link rel="alternate" href="https://www.youtube.com/playlist?list=${PL}"/>
 <author>
  <name>The Playlist Owner</name>
  <uri>https://www.youtube.com/channel/UCowner0000000000000000</uri>
 </author>
 <published>2019-01-01T00:00:00+00:00</published>${entries.join('')}
</feed>
`;
const row = (id, title, extra = {}) => ({ videoId: id, title, author: 'An artist', published: '2024-01-01T00:00:00+00:00', thumbnail: `https://i2.ytimg.com/vi/${id}/hqdefault.jpg`, url: watch(id), ...extra });

test('the feed\'s entries come out newest first as rows: id, title, channel, date, thumbnail and a watch link', () => {
  const rows = parseFeed(feed(
    entry({ id: vid('a'), title: 'Oldest', published: '2020-01-01T10:00:00+00:00' }),
    entry({ id: vid('b'), title: 'Newest', author: 'Crystal Castles', published: '2024-06-30T23:59:59+00:00', thumb: `https://i4.ytimg.com/vi/${vid('b')}/hqdefault.jpg` }),
    entry({ id: vid('c'), title: 'Middle', published: '2022-03-04T05:06:07+00:00' }),
    entry({ id: vid('d'), title: 'Same moment, listed after', published: '2022-03-04T05:06:07+00:00' }), // (a tie keeps the feed's order)
    entry({ id: vid('e'), title: 'No date', published: '' }), // (no date: after the dated ones)
    entry({ id: vid('f'), title: 'A date nobody can read', published: 'last Tuesday' }),
  ));
  assert.deepEqual(rows, [
    row(vid('b'), 'Newest', { author: 'Crystal Castles', published: '2024-06-30T23:59:59+00:00', thumbnail: `https://i4.ytimg.com/vi/${vid('b')}/hqdefault.jpg` }),
    row(vid('c'), 'Middle', { published: '2022-03-04T05:06:07+00:00' }),
    row(vid('d'), 'Same moment, listed after', { published: '2022-03-04T05:06:07+00:00' }),
    row(vid('a'), 'Oldest', { published: '2020-01-01T10:00:00+00:00' }),
    row(vid('e'), 'No date', { published: '' }),
    row(vid('f'), 'A date nobody can read', { published: 'last Tuesday' }),
  ]);
  // (the playlist's own title, owner and date are not rows, and don't leak into any)
  assert.ok(!JSON.stringify(rows).includes('Playlist'));
});

test('entities are decoded once, in titles, channel names and addresses', () => {
  const [r] = parseFeed(feed(entry({
    id: vid('a'),
    title: 'Tom &amp; Jerry&#39;s &quot;Theme&quot; &lt;Live&gt; &#x27;99 &#233;t&#xE9; &amp;lt; &amp;#39; &nbsp; &#0; &#xD800; &#x110000; &#x1F3B5;',
    author: 'Sly &amp; the Family Stone &#38; Co',
    thumb: `https://i.ytimg.com/vi/${vid('a')}/hqdefault.jpg?sqp=-oay&amp;rs=AOn4_C`,
  })));
  // (&amp;lt; is the text "&lt;", not "<"; &nbsp; isn't one of XML's, so it stays; a NUL, half a surrogate pair and a number
  // past U+10FFFF become U+FFFD; the last is a musical note outside the first 65536)
  assert.equal(r.title, `Tom & Jerry's "Theme" <Live> '99 été &lt; &#39; &nbsp; \uFFFD \uFFFD \uFFFD ${String.fromCodePoint(0x1f3b5)}`);
  assert.equal(r.author, 'Sly & the Family Stone & Co');
  assert.equal(r.thumbnail, `https://i.ytimg.com/vi/${vid('a')}/hqdefault.jpg?sqp=-oay&rs=AOn4_C`);
});

test('CDATA, comments, single-quoted attributes, a ">" inside one and a stray "<>" don\'t confuse it', () => {
  const rows = parseFeed(feed(
    // (a comment holding a whole entry, and a "->" that would end a "<!" which isn't a comment)
    `<!-- see -> <entry><yt:videoId>${vid('z')}</yt:videoId><title>in a comment</title></entry> -->`,
    `<entry><yt:videoId>${vid('y')}</yt:videoId><title>Wait <> what</title><published>2022-01-01T00:00:00Z</published></entry>`,
    `<entry><yt:videoId>${vid('a')}</yt:videoId><title><![CDATA[Fish & Chips <live> &amp; </entry>]]></title>
      <author><name><![CDATA[A & B]]></name></author><published>2024-01-01T00:00:00Z</published>
      <media:group><media:thumbnail note="a > b" url = 'https://i.ytimg.com/vi/${vid('a')}/hq.jpg' /></media:group></entry>`,
    `<entry><yt:videoId>${vid('b')}</yt:videoId><title attr="x">Closed with a space</title ><published>2023-01-01T00:00:00Z</published></entry >`,
  ));
  assert.deepEqual(rows, [
    { videoId: vid('a'), title: 'Fish & Chips <live> &amp; </entry>', author: 'A & B', published: '2024-01-01T00:00:00Z', thumbnail: `https://i.ytimg.com/vi/${vid('a')}/hq.jpg`, url: watch(vid('a')) },
    { videoId: vid('b'), title: 'Closed with a space', author: '', published: '2023-01-01T00:00:00Z', thumbnail: '', url: watch(vid('b')) },
    { videoId: vid('y'), title: 'Wait  what', author: '', published: '2022-01-01T00:00:00Z', thumbnail: '', url: watch(vid('y')) },
  ]);
});

test('an entry whose id is missing or isn\'t a video\'s id is no row; the entry\'s own id will do', () => {
  const rows = parseFeed(feed(
    entry({ id: vid('a'), title: 'Fine' }),
    entry({ id: vid('b'), title: 'Only in the entry\'s own id', idTag: false }),
    '<entry><title>No id at all</title></entry>',
    '<entry><yt:videoId>../../etc/passwd</yt:videoId><id>yt:video:short</id><title>Not a video id</title></entry>',
    `<entry><yt:videoId>${vid('c')}"onerror="x</yt:videoId><title>A quote in the id</title></entry>`,
  ));
  assert.deepEqual(rows.map((r) => r.title), ['Fine', 'Only in the entry\'s own id']);
});

test('a thumbnail that isn\'t a plain https address is left empty, and the row stays', () => {
  for (const thumb of ['http://i.ytimg.com/vi/a/hq.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://i.ytimg.com/a b.jpg', 'https://i.ytimg.com/a&quot;onerror=&quot;x', 'https://i.ytimg.com/a(1).jpg', 'https://i.ytimg.com/a[1].jpg', 'https://i.ytimg.com/a&lt;b.jpg', '']) {
    assert.deepEqual(parseFeed(feed(entry({ id: vid('a'), thumb }))), [row(vid('a'), 'A song', { thumbnail: '' })], thumb);
  }
  // (and an entry with only an id and a title is a row with the rest empty)
  assert.deepEqual(parseFeed(feed(`<entry><yt:videoId>${vid('a')}</yt:videoId><title>Bare</title></entry>`)), [{ videoId: vid('a'), title: 'Bare', author: '', published: '', thumbnail: '', url: watch(vid('a')) }]);
});

test('a feed with no entries is an empty list; a page that isn\'t a feed is refused, not taken for an empty playlist', () => {
  assert.deepEqual(parseFeed(feed()), []);
  assert.deepEqual(parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"/>'), []);
  assert.deepEqual(parseFeed('<?xml version="1.0"?><feed></feed>'), []);
  for (const bad of ['', '<html><body>Before you continue to YouTube</body></html>', '<rss version="2.0"><channel/></rss>', 'not xml at all', undefined, null, 42]) {
    assert.throws(() => parseFeed(bad), /isn't a playlist feed/, String(bad));
  }
});

test('the same feed with Windows line endings reads the same', () => {
  const xml = feed(entry({ id: vid('a'), title: 'One', published: '2021-01-01T00:00:00Z' }), entry({ id: vid('b'), title: 'Two', published: '2022-01-01T00:00:00Z' }));
  assert.ok(xml.includes('\n'));
  assert.deepEqual(parseFeed(xml.replace(/\n/g, '\r\n')), parseFeed(xml));
  assert.deepEqual(parseFeed(xml).map((r) => r.title), ['Two', 'One']);
});

test('a feed that is cut off, or has an element left open, still gives its entries', () => {
  const a = entry({ id: vid('a'), title: 'One', published: '2021-01-01T00:00:00Z' });
  const b = entry({ id: vid('b'), title: 'Two', published: '2022-01-01T00:00:00Z' });
  const c = entry({ id: vid('c'), title: 'Three', published: '2023-01-01T00:00:00Z' });
  const titles = (xml) => parseFeed(xml).map((r) => r.title);
  assert.deepEqual(titles(feed(a, b, c).replace('</feed>', '')), ['Three', 'Two', 'One']); // (no closing </feed>)
  // (cut off inside the last entry's tag: the entries before it come out whole)
  const cut = feed(a, b, c).slice(0, feed(a, b, c).indexOf(`<media:thumbnail url="https://i2.ytimg.com/vi/${vid('c')}`) + 30);
  assert.deepEqual(parseFeed(cut).filter((r) => r.videoId !== vid('c')), [row(vid('b'), 'Two', { published: '2022-01-01T00:00:00Z' }), row(vid('a'), 'One', { published: '2021-01-01T00:00:00Z' })]);
  // (an element nobody closed is closed by its parent's closing tag, so the entries after it are still entries; a closing tag
  // nothing opened is ignored)
  const open = `<entry><yt:videoId>${vid('d')}</yt:videoId><title>Left open</title><published>2024-01-01T00:00:00Z</published><media:group><media:statistics views="1"></media:group></nothing></entry>`;
  assert.deepEqual(titles(feed(a, open, b)), ['Left open', 'Two', 'One']);
});

test('a broken or hostile feed can\'t make the parser slow: all of these together take well under a second', () => {
  const N = 200000;
  const nasty = {
    'tags that never close': `<feed>${'<a b="'.repeat(N / 4)}`,
    'a "<" over and over': `<feed>${'<'.repeat(N)}`,
    'a name that never ends': `<feed><a ${'x'.repeat(N)}/></feed>`,
    'a name, a great many spaces, a name': `<feed><a x${' '.repeat(N)}y/></feed>`,
    'closing tags nothing opened': `<feed>${'<a>'.repeat(N / 3)}${'</b>'.repeat(N / 4)}</feed>`,
    'comments and CDATA that never close': `<feed>${'<!--'.repeat(N / 4)}${'<![CDATA['.repeat(N / 9)}`,
    'quotes that pair up wrongly': `<feed>${'<a b=">'.repeat(N / 7)}"></feed>`,
    'a very long title': `<feed><entry><yt:videoId>${vid('a')}</yt:videoId><title>${'&amp;x'.repeat(N)}</title></entry></feed>`,
  };
  const started = Date.now();
  for (const [what, xml] of Object.entries(nasty)) {
    const rows = parseFeed(xml);
    assert.equal(rows.length, what === 'a very long title' ? 1 : 0, what);
  }
  assert.ok(Date.now() - started < 2000, `took ${Date.now() - started} ms`);
});

// ---------------------------------------------------------------- a fake YouTube

// Answers each request through the handler, and records it (its method, path, query and Accept header).
async function fakeServer(handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    seen.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), accept: req.headers.accept });
    handler(req, res, url, seen.length);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }) };
}
const send = (res, status, body, type = 'application/json', headers = {}) => res.writeHead(status, { 'Content-Type': type, ...headers }).end(typeof body === 'string' ? body : JSON.stringify(body));
const asked = (f) => f.seen.map(({ method, path, query }) => ({ method, path, query }));

test('fetchFeed asks the feed for the playlist and gives its rows, newest first', async () => {
  const xml = feed(entry({ id: vid('a'), title: 'Old', published: '2020-01-01T00:00:00Z' }), entry({ id: vid('b'), title: 'Björk – Jóga (live)', published: '2024-01-01T00:00:00Z' }));
  const f = await fakeServer((_req, res, url) => (url.searchParams.get('playlist_id') === PL ? send(res, 200, xml, 'application/atom+xml; charset=UTF-8') : send(res, 404, '<html>Not Found</html>', 'text/html')));
  try {
    const rows = await fetchFeed({ id: PL, base: f.base });
    assert.deepEqual(rows.map((r) => r.title), ['Björk – Jóga (live)', 'Old']);
    assert.deepEqual(asked(f), [{ method: 'GET', path: '/feeds/videos.xml', query: { playlist_id: PL } }]);
    assert.match(f.seen[0].accept, /atom\+xml/);
    // (a pasted link will do for the id)
    assert.equal((await fetchFeed({ id: `https://youtu.be/${vid('a')}?list=${PL}`, base: f.base })).length, 2);
  } finally { await f.close(); }
});

test('the feed\'s refusals are said in words: no such playlist (and a Mix), slow down, YouTube\'s trouble, a page that isn\'t a feed', async () => {
  let answer = (res) => send(res, 404, '<html>Not Found</html>', 'text/html');
  const f = await fakeServer((_req, res) => answer(res));
  try {
    const notFound = await fetchFeed({ id: PL, base: f.base }).catch((e) => e);
    assert.match(notFound.message, /can't find that playlist\. It may be private or deleted/);
    assert.doesNotMatch(notFound.message, /Mix/);
    await assert.rejects(fetchFeed({ id: `RD${vid('a')}`, base: f.base }), /can't find that playlist.*A Mix \(its id starts with RD\)/);
    answer = (res) => send(res, 400, 'Invalid value', 'text/plain');
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /can't find that playlist/);
    answer = (res) => send(res, 429, 'Too many requests', 'text/plain', { 'Retry-After': '7' });
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /slow down: try again in 7 s/);
    answer = (res) => send(res, 429, 'Too many requests', 'text/plain');
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /slow down: try again in 30 s/);
    answer = (res) => send(res, 503, '<html>Bad gateway</html>', 'text/html');
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /problem on its side \(HTTP 503\)/);
    answer = (res) => send(res, 403, 'No.', 'text/plain');
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /YouTube said no \(HTTP 403\)\./);
    answer = (res) => send(res, 200, '<html><body>Before you continue to YouTube</body></html>', 'text/html');
    await assert.rejects(fetchFeed({ id: PL, base: f.base }), /isn't a playlist feed/);
    // (a bad id is refused before anything is sent)
    const before = f.seen.length;
    await assert.rejects(fetchFeed({ id: 'nope', base: f.base }), NOT_A_LINK);
    await assert.rejects(fetchFeed({ id: `https://music.youtube.com/playlist?list=${PL}`, base: f.base }), /YouTube Music isn't supported/);
    await assert.rejects(fetchFeed({ base: f.base }), NOT_A_LINK);
    assert.equal(f.seen.length, before);
  } finally { await f.close(); }
});

test('no network, and no answer in time, are said in words too, for the feed and for the API', async () => {
  const dead = await fakeServer(() => {});
  const { base } = dead;
  await dead.close(); // (nothing listens at base any more)
  await assert.rejects(fetchFeed({ id: PL, base }), /couldn't reach YouTube\. Check the internet connection/);
  await assert.rejects(listWithKey({ id: PL, key: KEY, api: base }), /couldn't reach YouTube\. Check the internet connection/);
  const silent = await fakeServer(() => {}); // (takes the request and never answers)
  try {
    await assert.rejects(fetchFeed({ id: PL, base: silent.base, timeout: 50 }), /didn't answer in time/);
    await assert.rejects(listWithKey({ id: PL, key: KEY, api: silent.base, timeout: 50 }), /didn't answer in time/);
  } finally { await silent.close(); }
});

// ---------------------------------------------------------------- the API, with the listener's own key

const thumbs = (id) => ({
  default: { url: `https://i.ytimg.com/vi/${id}/default.jpg`, width: 120, height: 90 },
  medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, width: 320, height: 180 },
  high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 480, height: 360 },
  standard: { url: `https://i.ytimg.com/vi/${id}/sddefault.jpg`, width: 640, height: 480 },
  maxres: { url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, width: 1280, height: 720 },
});
// A playlist item as the API gives it, and (gone) a private or deleted video's: a stand-in title and no thumbnails.
const item = (id, title, snippet = {}) => ({
  kind: 'youtube#playlistItem',
  snippet: { publishedAt: '2024-05-01T12:00:00Z', channelTitle: 'The Playlist Owner', title, description: 'd', thumbnails: thumbs(id), videoOwnerChannelTitle: 'An artist', resourceId: { kind: 'youtube#video', videoId: id }, ...snippet },
});
const gone = (id, title) => item(id, title, { description: 'This video is private.', thumbnails: {}, videoOwnerChannelTitle: undefined });
const apiRow = (id, title, extra = {}) => ({ videoId: id, title, author: 'An artist', published: '2024-05-01T12:00:00Z', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, url: watch(id), ...extra });
const googleError = (code, reason, message, extra = {}) => ({ error: { code, message, errors: [{ message, domain: 'x', reason }], ...extra } });

test('two pages are followed, in the playlist\'s order, and private and deleted videos are left out', async () => {
  const pages = {
    '': { nextPageToken: 'PAGE2', pageInfo: { totalResults: 8, resultsPerPage: 50 }, items: [item(vid('a'), 'First'), gone(vid('b'), 'Private video'), item(vid('c'), 'Third')] },
    PAGE2: { items: [
      gone(vid('d'), 'Deleted video'),
      item(vid('e'), 'Only small pictures', { thumbnails: { default: thumbs(vid('e')).default, medium: thumbs(vid('e')).medium } }),
      item(vid('f'), 'A title, but no pictures', { thumbnails: {} }),
      item(vid('g'), 'Private video'), // (the stand-in title is enough, whatever else it has)
      item(vid('h'), 'Last', { videoOwnerChannelTitle: undefined }),
    ] },
  };
  const f = await fakeServer((_req, res, url) => send(res, 200, pages[url.searchParams.get('pageToken') || '']));
  try {
    const rows = await listWithKey({ id: PL, key: KEY, api: f.base });
    assert.deepEqual(rows, [
      apiRow(vid('a'), 'First'),
      apiRow(vid('c'), 'Third'),
      apiRow(vid('e'), 'Only small pictures', { thumbnail: `https://i.ytimg.com/vi/${vid('e')}/mqdefault.jpg` }), // (the nearest to the feed's it has)
      apiRow(vid('h'), 'Last', { author: '' }),
    ]);
    const call = { method: 'GET', path: '/youtube/v3/playlistItems' };
    assert.deepEqual(asked(f), [
      { ...call, query: { part: 'snippet', maxResults: '50', playlistId: PL, key: KEY } },
      { ...call, query: { part: 'snippet', maxResults: '50', playlistId: PL, pageToken: 'PAGE2', key: KEY } },
    ]);
    assert.match(f.seen[0].accept, /json/);
  } finally { await f.close(); }
});

test('an item is a row only with a video id, a safe thumbnail and a title that isn\'t a stand-in', async () => {
  const items = [
    item(vid('a'), 'Fine'),
    { kind: 'youtube#playlistItem' }, // (nothing in it)
    item('short', 'A bad video id'),
    item(vid('b'), 'Thumbnails that aren\'t https', { thumbnails: { high: { url: 'http://i.ytimg.com/x.jpg' }, medium: { url: 'javascript:alert(1)' } } }),
    item(vid('c'), '  PRIVATE video  '),
    item(vid('d'), 'Titles stay as given  ', { videoOwnerChannelTitle: 'Beyoncé - Topic' }),
    item(vid('e'), 'No resource id', { resourceId: undefined }),
    null,
    'nonsense',
  ];
  const f = await fakeServer((_req, res) => send(res, 200, { items }));
  try {
    assert.deepEqual((await listWithKey({ id: PL, key: KEY, api: f.base })).map((r) => [r.videoId, r.title, r.author]), [[vid('a'), 'Fine', 'An artist'], [vid('d'), 'Titles stay as given  ', 'Beyoncé - Topic']]);
  } finally { await f.close(); }
});

test('an empty playlist, or one of only private videos, or an answer with no items, is an empty list', async () => {
  let body = { items: [] };
  const f = await fakeServer((_req, res) => send(res, 200, body));
  try {
    assert.deepEqual(await listWithKey({ id: PL, key: KEY, api: f.base }), []);
    body = {};
    assert.deepEqual(await listWithKey({ id: PL, key: KEY, api: f.base }), []);
    body = { items: [gone(vid('a'), 'Private video'), gone(vid('b'), 'Deleted video')] };
    assert.deepEqual(await listWithKey({ id: PL, key: KEY, api: f.base }), []);
  } finally { await f.close(); }
});

test('a server that never stops saying "more" is cut off at 20 pages', async () => {
  const f = await fakeServer((_req, res, _url, n) => send(res, 200, { nextPageToken: `P${n}`, items: [item(String(n).padStart(11, 'x'), `Song ${n}`)] }));
  try {
    const rows = await listWithKey({ id: PL, key: KEY, api: f.base });
    assert.equal(f.seen.length, 20);
    assert.deepEqual(rows.map((r) => r.title), Array.from({ length: 20 }, (_, i) => `Song ${i + 1}`));
    assert.equal(f.seen[19].query.pageToken, 'P19');
  } finally { await f.close(); }
});

test('a bad id or no key is refused before anything is sent; a pasted link does for the id', async () => {
  const f = await fakeServer((_req, res) => send(res, 200, { items: [item(vid('a'), 'Only')] }));
  try {
    await assert.rejects(listWithKey({ id: 'nope', key: KEY, api: f.base }), NOT_A_LINK);
    await assert.rejects(listWithKey({ id: `${PL}&key=x`, key: KEY, api: f.base }), NOT_A_LINK);
    await assert.rejects(listWithKey({ key: KEY, api: f.base }), NOT_A_LINK);
    await assert.rejects(listWithKey({ id: `https://music.youtube.com/playlist?list=${PL}`, key: KEY, api: f.base }), /YouTube Music isn't supported/);
    for (const key of ['', '   ', undefined, null, 42]) await assert.rejects(listWithKey({ id: PL, key, api: f.base }), /Paste your YouTube API key first\./);
    await assert.rejects(listWithKey(), NOT_A_LINK);
    assert.equal(f.seen.length, 0);
    assert.equal((await listWithKey({ id: `https://www.youtube.com/watch?v=${vid('a')}&list=${PL}`, key: ` ${KEY}\n`, api: f.base })).length, 1);
    assert.deepEqual(f.seen[0].query, { part: 'snippet', maxResults: '50', playlistId: PL, key: KEY }); // (the key as the listener pasted it, trimmed)
  } finally { await f.close(); }
});

test('each refusal from the API is said in words, and in none of them is the key', async () => {
  const cases = [
    [404, googleError(404, 'playlistNotFound', 'The playlist identified with the request\'s <code>playlistId</code> parameter cannot be found.'), /can't find that playlist\. It may be private or deleted/],
    [403, googleError(403, 'playlistItemsNotAccessible', 'The playlist items are not accessible.'), /can't find that playlist/],
    [404, '<html>404</html>', /can't find that playlist/],
    [403, googleError(403, 'quotaExceeded', 'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.'), /the key's daily quota is used up; it resets at midnight Pacific/],
    [403, googleError(403, 'dailyLimitExceeded', 'Daily Limit Exceeded'), /daily quota is used up/],
    [400, googleError(400, 'keyInvalid', 'Bad Request'), /doesn't accept that API key/],
    [400, googleError(400, 'badRequest', 'API key not valid. Please pass a valid API key.', { status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com' }] }), /doesn't accept that API key/],
    [400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } }, /doesn't accept that API key/],
    [400, { error: { code: 400, message: 'API key expired. Please renew the API key.' } }, /doesn't accept that API key.*hasn't expired/],
    [403, googleError(403, 'accessNotConfigured', 'YouTube Data API v3 has not been used in project 123 before or it is disabled.'), /Data API v3 isn't turned on for that key's Google Cloud project/],
    [403, googleError(403, 'forbidden', 'YouTube Data API v3 has not been used in project 123.', { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] }), /isn't turned on/],
    [403, googleError(403, 'forbidden', 'Requests from referer <empty> are blocked.', { status: 'PERMISSION_DENIED', details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] }), /That key is restricted/],
    [403, googleError(403, 'ipRefererBlocked', 'There is a per-IP or per-Referer restriction configured on your API key.'), /That key is restricted/],
    [403, googleError(403, 'rateLimitExceeded', 'Rate Limit Exceeded'), /slow down: try again in 30 s/],
    [429, { error: { code: 429, message: 'Too many.', status: 'RESOURCE_EXHAUSTED' } }, /slow down: try again in 30 s/],
    [429, '<html>429</html>', /slow down/, { 'Retry-After': '12' }, /try again in 12 s/],
    [503, '<html>Bad gateway</html>', /problem on its side \(HTTP 503\)/],
    [418, { error: { message: 'I am a <b>teapot</b>,\n   short and stout' } }, /YouTube said no \(HTTP 418: I am a teapot, short and stout\)\./],
    [400, 'not json', /YouTube said no \(HTTP 400\)\./],
    [401, {}, /YouTube said no \(HTTP 401\)\./],
  ];
  let n = 0;
  const f = await fakeServer((_req, res) => {
    const [status, body, , headers] = cases[n++];
    send(res, status, body, typeof body === 'string' ? 'text/html' : 'application/json', headers);
  });
  try {
    for (const [status, , want, , wantToo] of cases) {
      const err = await listWithKey({ id: PL, key: KEY, api: f.base }).then(() => assert.fail(`${status} gave a list`), (e) => e);
      assert.match(err.message, want, `${status}: ${err.message}`);
      if (wantToo) assert.match(err.message, wantToo);
      assert.ok(!err.message.includes(KEY));
    }
    assert.equal(n, cases.length);
  } finally { await f.close(); }
});

test('a failure on the second page fails the whole call: a list that stops short isn\'t taken for a whole one', async () => {
  const f = await fakeServer((_req, res, url) => (url.searchParams.get('pageToken')
    ? send(res, 403, googleError(403, 'quotaExceeded', 'quota'))
    : send(res, 200, { nextPageToken: 'PAGE2', items: [item(vid('a'), 'First')] })));
  try {
    await assert.rejects(listWithKey({ id: PL, key: KEY, api: f.base }), /daily quota is used up/);
    assert.equal(f.seen.length, 2);
  } finally { await f.close(); }
});

test('a huge message from the API is cut down, not shown whole and not chewed through', async () => {
  const f = await fakeServer((_req, res) => send(res, 418, { error: { message: `${'<'.repeat(300000)} the end` } }));
  try {
    const started = Date.now();
    const err = await listWithKey({ id: PL, key: KEY, api: f.base }).catch((e) => e);
    assert.match(err.message, /^YouTube said no \(HTTP 418: <+\.\.\.\)\.$/);
    assert.ok(err.message.length < 200);
    assert.ok(Date.now() - started < 2000, `took ${Date.now() - started} ms`);
  } finally { await f.close(); }
});

test('the key is in no error, whatever went wrong and whatever the other side echoed back', async () => {
  const forms = (key) => [key, encodeURIComponent(key), new URLSearchParams({ k: key }).toString().slice(2)];
  const noKey = (err, key) => {
    for (const form of forms(key)) assert.ok(!err.message.includes(form) && !String(err.stack).includes(form), `"${form}" in ${err.message}`);
    assert.equal(err.cause, undefined);
  };
  // a key that is percent-encoded in an address (not that Google's are), as well as an ordinary one
  for (const key of [KEY, 'AIza/odd+key=1&x y']) {
    // an API that echoes the address it was asked at, and the key on its own, in the message of each refusal it makes
    const f = await fakeServer((req, res, url) => send(res, 418, { error: { message: `Failed at ${req.url} (key ${url.searchParams.get('key')})` } }));
    try {
      const err = await listWithKey({ id: PL, key, api: f.base }).catch((e) => e);
      assert.match(err.message, /YouTube said no \(HTTP 418: Failed at \/youtube\/v3\/playlistItems\?part=snippet.*key \.\.\.\)/);
      noKey(err, key);
    } finally { await f.close(); }
    // a runtime whose own errors carry the address, and the cause carrying it again
    const leaky = async (url) => { throw Object.assign(new TypeError(`fetch failed: ${url}`), { cause: new Error(`while fetching ${url}`) }); };
    for (const err of [await listWithKey({ id: PL, key, fetch: leaky }).catch((e) => e), await fetchFeed({ id: PL, fetch: leaky }).catch((e) => e)]) {
      assert.match(err.message, /couldn't reach YouTube/);
      assert.doesNotMatch(err.message, /https?:|youtube\.com|googleapis/); // (no address at all, which is where a key would be)
      noKey(err, key);
    }
  }
});

test('nothing above reached past the fake servers', () => {
  assert.deepEqual(outside, []);
});
