// Report a misread (renderer/misread.js, the flag in the player bar, the help's button, Ctrl+K, and .github/ISSUE_TEMPLATE/misread.yml):
// what the report holds and nothing else, what it says where a part isn't known yet, its text for "copy report", its link to a
// new issue from the misread form (every field in the link is a field of the form; the link stays under what the app opens, with
// the long code lines cut if they must be), the box's two ways out on a stand-in page, and that the page, the player bar, the
// help, Ctrl+K and main.js are wired as it needs. Nothing here reaches GitHub or a clipboard.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_FIELDS, LINK_KEYS, TEMPLATE, NONE, songName, tempoRead, pickLines, buildMisreadReport, reportText, misreadLink, copyReport, createMisreadReport } from '../renderer/misread.js';
import { ISSUE_BASE, ISSUE_LIMIT } from '../renderer/bug-report.js';
import { CHIPS, createPlayerBar } from '../renderer/player.js';

const { isAllowedIssueUrl, MISREAD_KEYS } = createRequire(import.meta.url)('../helpers/issue-url.cjs');

// (sources are read with LF line endings: a Windows checkout's CRLF would otherwise turn every \n these patterns look for into two characters)
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('renderer/app.js'), html = read('renderer/index.html'), css = read('renderer/style.css'), player = read('renderer/player.js');
const module_ = read('renderer/misread.js'), form = read('.github/ISSUE_TEMPLATE/misread.yml');

// the code's lines as the page has them (codegen.js's buildLines), by what a snapshot gets: every line of the view
const KICK = 'kick: s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").bank("RolandTR909").duck("2:3").duckdepth(.6)';
const CLAP = '_clap: s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR909").room(.2)';
const HHC = 'hhc: s("hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh").bank("RolandTR909").gain(.5)';
const HHO = '// hho: s("oh").bank("RolandTR909").gain(.4)';
const LINES = ['x = x.PeggyGou("Nanana")', 'setcpm(124/4)', 'const scale = "F#:minor"', KICK, CLAP, HHC, HHO, 'bassline: note("<f#1 c#2>").s("sawtooth").lpf(slider(600, 100, 4000))', 'chords: chord("<F#m C#m>").voicing().s("supersaw")', 'vox: s("vox").slice(16, "0")'];
const FULL = {
  version: '0.4.29', source: 'file', song: { title: 'Nanana', artist: 'Peggy Gou' }, seconds: 83.4,
  tempo: { locked: true, shown: 124, bpm: 123.8 }, key: 'F# minor', lines: LINES, os: 'macOS', browser: 'Chrome 130',
};
const EXPECTED = ['version', 'source', 'song', 'seconds', 'bpm', 'locked', 'key', 'kick', 'clap', 'hhc', 'hho', 'browser', 'os'];

// ---------------------------------------------------------------- what the report holds

test('the report has exactly the listed fields and no others, whatever the page hands it', () => {
  assert.deepEqual(REPORT_FIELDS, EXPECTED);
  const r = buildMisreadReport(FULL);
  assert.deepEqual(Object.keys(r), EXPECTED);
  assert.deepEqual(r, {
    version: '0.4.29', source: 'file', song: 'Peggy Gou - Nanana', seconds: 83, bpm: 124, locked: true, key: 'F# minor',
    kick: KICK, clap: CLAP, hhc: HHC, hho: HHO, browser: 'Chrome 130', os: 'macOS',
  });
  // a snapshot with more in it (a file's name, a stream's address, the camera, a path, the code's other lines) leaves all of it out
  const nosy = { ...FULL, label: 'SECRET take.wav', file: '/Users/alex/Music/SECRET.wav', url: 'https://secret.example/stream', device: 'Alex\'s MacBook Microphone', frame: new Uint8Array(4), user: 'alex' };
  assert.deepEqual(buildMisreadReport(nosy), r);
  const everything = JSON.stringify([r, reportText(r), misreadLink(r)]);
  for (const secret of ['SECRET', 'alex', 'Alex', 'Microphone', 'secret.example']) assert.ok(!everything.includes(secret), secret);
  // and for a snapshot with nothing in it, or nothing at all
  assert.deepEqual(Object.keys(buildMisreadReport({})), EXPECTED);
  assert.deepEqual(Object.keys(buildMisreadReport()), EXPECTED);
  assert.deepEqual(Object.keys(buildMisreadReport(null)), EXPECTED);
  assert.deepEqual(Object.keys(buildMisreadReport({ source: 'radio', tempo: { locked: false }, lines: [] })), EXPECTED);
});

test('the code\'s other lines, the song\'s title line and the other lines that name a drum are not the report\'s', () => {
  const r = buildMisreadReport({ lines: ['x = x.Peggy("Secret Song")', 'tempo: 1', 'bassline: note("kick: x")', 'chords: chord("hhc: x")', 'vox: s("hho:")', 'kicker: s("bd")', ' kick: s("bd")', 'My kick: s("bd")'] });
  for (const k of ['kick', 'clap', 'hhc', 'hho']) assert.equal(r[k], k === 'kick' ? 'kick: s("bd")' : null, k);
  assert.ok(!JSON.stringify(r).includes('Secret'));
});

test('a user name in a path, in a song\'s name or the system\'s, becomes ~', () => {
  const r = buildMisreadReport({ ...FULL, song: { title: 'C:\\Users\\alex\\Music\\take 3.wav', artist: '/Users/alex/Desktop' }, browser: '/Users/alex/Chrome' });
  assert.equal(r.song, '~/Desktop - ~\\Music\\take 3.wav');
  assert.equal(r.browser, '~/Chrome');
  assert.ok(!JSON.stringify(r).includes('alex'));
});

test('the source goes by the player bar\'s words; a source it does not know is none', () => {
  assert.deepEqual(CHIPS, { system: 'system', file: 'file', input: 'mic', tab: 'tab', demo: 'demo', radio: 'radio' });
  for (const [source, word] of Object.entries(CHIPS)) assert.equal(buildMisreadReport({ source }).source, word, source);
  for (const none of [null, undefined, '', 'nonsense', 'constructor', '__proto__', 'toString', 7]) assert.equal(buildMisreadReport({ source: none }).source, null, String(none));
});

test('the song is Artist - Title, or the title alone: a file\'s "File" is not an artist, and long or messy names are kept short and on one line', () => {
  assert.equal(songName({ title: 'Nanana', artist: 'Peggy Gou' }, 'system'), 'Peggy Gou - Nanana');
  assert.equal(songName({ title: 'my take', artist: 'File' }, 'file'), 'my take');
  assert.equal(songName({ title: 'x', artist: 'Someone' }, 'file'), 'Someone - x', 'a name you gave it stays');
  assert.equal(songName({ title: 'x', artist: 'File' }, 'radio'), 'File - x', 'only a file\'s song carries it');
  assert.equal(songName({ title: 'Only a title', artist: '' }, 'radio'), 'Only a title');
  assert.equal(songName({ title: 'demo_beat', artist: 'Toaster' }, 'demo'), 'Toaster - demo_beat');
  assert.equal(songName({ title: '  Two\n  lines\t here ', artist: ' A ' }, 'system'), 'A - Two lines here');
  for (const none of [null, undefined, {}, { title: '' }, { title: '  ', artist: 'A' }, { artist: 'A' }]) assert.equal(songName(none, 'system'), null, JSON.stringify(none));
  const long = songName({ title: 'x'.repeat(500), artist: 'a'.repeat(500) }, 'system');
  assert.ok(Array.from(long).length <= 60 + 3 + 120 + 2, 'cut');
  assert.equal(songName({ title: '💿'.repeat(300), artist: '' }, 'system'), '💿'.repeat(120) + '…', 'by characters: no emoji cut in two');
});

test('how far into the song is whole seconds, and not known for anything that is not a number of them', () => {
  for (const [seconds, want] of [[0, 0], [83.4, 83], [83.6, 84], [3725.2, 3725]]) assert.equal(buildMisreadReport({ seconds }).seconds, want, String(seconds));
  for (const none of [undefined, null, NaN, Infinity, -1, '83', {}]) assert.equal(buildMisreadReport({ seconds: none }).seconds, null, String(none));
});

test('the tempo is the bpm shown and whether it has locked; before the lock, the pulse the code guesses at, if there is one', () => {
  assert.deepEqual(tempoRead({ locked: true, shown: 124, bpm: 123.8 }), { bpm: 124, locked: true });
  assert.deepEqual(tempoRead({ locked: true, shown: 0, bpm: 123.8 }), { bpm: 124, locked: true }, 'no shown yet: the bpm, rounded');
  assert.deepEqual(tempoRead({ locked: false, shown: 0, bpm: 0, provisional: { bpm: 122.6, since: 3 } }), { bpm: 123, locked: false });
  assert.deepEqual(tempoRead({ locked: false, shown: 120, bpm: 120 }), { bpm: null, locked: false }, 'a reading that has not locked is not the tempo');
  for (const none of [null, undefined, {}, { locked: true }, { locked: true, shown: 0, bpm: 0 }, { locked: false, provisional: null }, { locked: false, provisional: { bpm: 'x' } }]) assert.equal(tempoRead(none).bpm, null, JSON.stringify(none));
  assert.equal(tempoRead({ locked: true }).locked, true);
  assert.equal(tempoRead(null).locked, false);
});

test('the kick, clap and hat lines are taken as written, with a _ or // in front of one that stopped or was never heard, and a line the view broke over two rows is put back', () => {
  assert.deepEqual(pickLines(LINES), { kick: KICK, clap: CLAP, hhc: HHC, hho: HHO });
  // (the view breaks a long line before a method call, a row break and two spaces: codeview.js's WRAP)
  const broken = 'kick: s("bd ~ ~ ~ bd ~ ~ ~")\n  .bank("RolandTR909")\n  .duck("2:3")';
  assert.equal(pickLines([broken]).kick, 'kick: s("bd ~ ~ ~ bd ~ ~ ~").bank("RolandTR909").duck("2:3")');
  assert.equal(pickLines(['_kick: s("bd")']).kick, '_kick: s("bd")');
  assert.equal(pickLines(['// kick: s("bd")']).kick, '// kick: s("bd")');
  assert.equal(pickLines(['//kick: s("bd")']).kick, '//kick: s("bd")');
  assert.equal(pickLines(['kick: a', 'kick: b']).kick, 'kick: a', 'the first of a name');
  for (const none of [undefined, null, [], [null, undefined, 4, {}]]) assert.deepEqual(pickLines(none), { kick: null, clap: null, hhc: null, hho: null });
});

// ---------------------------------------------------------------- what it says where a part is not there yet

test('with no source, song, tempo, key or code yet the report says so, and nothing fails', () => {
  const r = buildMisreadReport({ version: '0.4.29', os: 'iOS', browser: 'Safari 18' });
  assert.deepEqual(r, { version: '0.4.29', source: null, song: null, seconds: null, bpm: null, locked: false, key: null, kick: null, clap: null, hhc: null, hho: null, browser: 'Safari 18', os: 'iOS' });
  const text = reportText(r);
  assert.equal(text, [
    'Toaster misread a song', 'version: 0.4.29', 'source: none yet', 'song: not known', 'time into the song: not known', 'tempo: not read yet', 'key: not read yet',
    'kick: (no line yet)', 'clap: (no line yet)', 'hhc: (no line yet)', 'hho: (no line yet)', 'browser: Safari 18', 'os: iOS',
  ].join('\n'));
  const link = misreadLink(r);
  const q = new URL(link.url).searchParams;
  assert.equal(link.trimmed, false);
  assert.equal(q.get('title'), 'Misread: song not known');
  assert.equal(q.get('source'), NONE.source);
  assert.equal(q.get('song'), NONE.song);
  assert.equal(q.get('time'), NONE.time);
  assert.equal(q.get('read'), ['tempo: not read yet', 'key: not read yet', 'kick: (no line yet)', 'clap: (no line yet)', 'hhc: (no line yet)', 'hho: (no line yet)'].join('\n'));
  assert.ok(isAllowedIssueUrl(link.url));
  // a snapshot with nothing at all still gives a report with a version and a browser to say it is not known
  assert.equal(buildMisreadReport({}).version, 'unknown');
  assert.equal(buildMisreadReport({}).browser, 'unknown');
  assert.equal(buildMisreadReport({}).os, 'unknown');
});

test("the time is the song's own for a file or the demo, and for the rest how long Toaster has heard it, said so", () => {
  for (const source of ['file', 'demo']) assert.match(reportText(buildMisreadReport({ ...FULL, source, seconds: 83 })), /^time into the song: 1:23 \(83 s\)$/m, source);
  for (const source of ['system', 'input', 'tab', 'radio']) assert.match(reportText(buildMisreadReport({ ...FULL, source, seconds: 83 })), /^time into the song: 1:23 \(83 s since Toaster started hearing it\)$/m, source);
});

test('some parts known and some not: each says its own', () => {
  // a mic: a source and a tempo that has not locked, but no song's name
  const mic = buildMisreadReport({ ...FULL, source: 'input', song: null, seconds: 12, tempo: { locked: false, provisional: { bpm: 97.2 } }, key: '', lines: [KICK] });
  const text = reportText(mic);
  assert.match(text, /^source: mic$/m);
  assert.match(text, /^song: not known$/m);
  assert.match(text, /^time into the song: 0:12 \(12 s since Toaster started hearing it\)$/m);
  assert.match(text, /^tempo: 97 bpm, not locked yet$/m);
  assert.match(text, /^key: not read yet$/m);
  assert.match(text, new RegExp('^' + KICK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm'));
  assert.match(text, /^clap: \(no line yet\)$/m);
  assert.equal(new URL(misreadLink(mic).url).searchParams.get('title'), 'Misread: song not known');
});

// ---------------------------------------------------------------- the text for "copy report"

test('the text has every field of the report, the code lines whole, and nothing that is not the report\'s', () => {
  const r = buildMisreadReport(FULL);
  const text = reportText(r);
  assert.equal(text, [
    'Toaster misread a song', 'version: 0.4.29', 'source: file', 'song: Peggy Gou - Nanana', 'time into the song: 1:23 (83 s)', 'tempo: 124 bpm, locked', 'key: F# minor',
    KICK, CLAP, HHC, HHO, 'browser: Chrome 130', 'os: macOS',
  ].join('\n'));
  // every field's value is in it
  for (const k of REPORT_FIELDS) {
    const v = r[k];
    if (k === 'seconds') assert.ok(text.includes('1:23') && text.includes(`${v} s`), k);
    else if (k === 'bpm') assert.ok(text.includes(`${v} bpm`), k);
    else if (k === 'locked') assert.ok(text.includes('locked'), k);
    else assert.ok(text.includes(String(v)), `${k}: ${v}`);
  }
  // an hour in is 1:02:03, and a very long line is not cut here (the link may cut it; the text never)
  const long = 'kick: s("' + 'bd ~ '.repeat(2000) + '")';
  const t2 = reportText(buildMisreadReport({ ...FULL, seconds: 3723, lines: [long] }));
  assert.match(t2, /time into the song: 1:02:03 \(3723 s\)/);
  assert.ok(t2.includes(long));
});

// ---------------------------------------------------------------- the link to the misread form

// the field ids in the form, in its order
const ids = [...form.matchAll(/^\s+id:\s*(\S+)\s*$/gm)].map((m) => m[1]);

test('the form is the misread form: its name, its label, one required field to say what was wrong, and a field for each thing the link fills in', () => {
  assert.match(form, /^name: Misread \(Toaster got a song wrong\)$/m);
  assert.match(form, /^labels: \[misread\]$/m);
  assert.equal(TEMPLATE, 'misread.yml');
  assert.deepEqual(ids, ['what', 'song', 'time', 'source', 'version', 'read', 'browser']);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.deepEqual([...form.matchAll(/required: true/g)].length, 1);
  assert.match(form, /id: what\n[\s\S]*?validations:\n\s+required: true/, 'and it is the one that says what was wrong');
  assert.match(form, /id: read\n[\s\S]*?render: text/, 'the lines of code are shown as code');
  assert.doesNotMatch(form, /[^\x00-\x7f]/, 'plain characters only, as the other forms');
  for (const type of form.matchAll(/- type: (\w+)/g)) assert.ok(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'].includes(type[1]), type[1]);
});

test('the link is a new issue on Toaster\'s own page from the misread form, with only the form\'s field ids as parameters', () => {
  const link = misreadLink(buildMisreadReport(FULL));
  const u = new URL(link.url);
  assert.equal(link.trimmed, false);
  assert.equal(u.origin + u.pathname, 'https://github.com/StopBanning/toaster/issues/new');
  assert.ok(link.url.startsWith(ISSUE_BASE + '?'));
  assert.equal(u.searchParams.get('template'), 'misread.yml');
  assert.deepEqual([...u.searchParams.keys()], LINK_KEYS);
  // every parameter is the form's template, a title, or the id of a field in the form (and the one the person writes, `what`, is not in it)
  for (const k of u.searchParams.keys()) assert.ok(['template', 'title'].includes(k) || ids.includes(k), `${k} is not a field of misread.yml`);
  assert.ok(!u.searchParams.has('what'));
  assert.ok(!u.searchParams.has('body'), 'a form is filled by its fields, not a body');
  assert.ok(!u.searchParams.has('labels'), 'the form brings its own label');
  assert.deepEqual(ids.filter((id) => id !== 'what'), LINK_KEYS.filter((k) => k !== 'template' && k !== 'title'), 'a parameter for each field of the form, in its order');
  assert.ok(!u.hash && !u.username && !u.password);
  assert.ok(link.url.length <= ISSUE_LIMIT && link.url.length < 8000);
  assert.ok(isAllowedIssueUrl(link.url), 'the app opens it');
});

test('what the link fills in is the same words as the text, field by field', () => {
  const r = buildMisreadReport(FULL), q = new URL(misreadLink(r).url).searchParams;
  assert.equal(q.get('title'), 'Misread: Peggy Gou - Nanana');
  assert.equal(q.get('song'), 'Peggy Gou - Nanana');
  assert.equal(q.get('time'), '1:23 (83 s)');
  assert.equal(q.get('source'), 'file');
  assert.equal(q.get('version'), '0.4.29');
  assert.equal(q.get('browser'), 'Chrome 130 on macOS');
  assert.equal(q.get('read'), ['tempo: 124 bpm, locked', 'key: F# minor', KICK, CLAP, HHC, HHO].join('\n'));
  // the text is those, the lines in the same order
  const text = reportText(r).split('\n');
  for (const line of q.get('read').split('\n')) assert.ok(text.includes(line), line);
  for (const line of [`song: ${q.get('song')}`, `source: ${q.get('source')}`, `version: ${q.get('version')}`, `time into the song: ${q.get('time')}`]) assert.ok(text.includes(line), line);
  // a title with an emoji, an accent, quotes and an ampersand comes through the link whole
  const odd = buildMisreadReport({ ...FULL, song: { title: 'Jóga & "Bachelorette" 💿', artist: 'Björk' } });
  assert.equal(new URL(misreadLink(odd).url).searchParams.get('song'), 'Björk - Jóga & "Bachelorette" 💿');
});

test('a long code line is cut so the link stays under what the app opens (under 8000); the text keeps every line whole', () => {
  const huge = (label) => label + ': s("' + 'bd ~ ~ '.repeat(900) + '").bank("RolandTR909")';
  const lines = [huge('kick'), '_' + huge('clap'), huge('hhc'), '// ' + huge('hho')];
  const r = buildMisreadReport({ ...FULL, lines });
  const link = misreadLink(r);
  assert.equal(link.trimmed, true);
  assert.ok(link.url.length <= ISSUE_LIMIT, `${link.url.length}`);
  assert.ok(link.url.length < 8000);
  assert.ok(isAllowedIssueUrl(link.url));
  const read = new URL(link.url).searchParams.get('read').split('\n');
  assert.equal(read.length, 6, 'still the tempo, the key and four lines');
  assert.deepEqual(read.slice(0, 2), ['tempo: 124 bpm, locked', 'key: F# minor']);
  for (const [i, label] of ['kick: s("bd', '_clap: s("bd', 'hhc: s("bd', '// hho: s("bd'].entries()) assert.ok(read[i + 2].startsWith(label) && read[i + 2].endsWith('…'), `line ${i}: ${read[i + 2].slice(0, 30)}`);
  // the song and the rest are not cut, and the text has every line whole
  assert.equal(new URL(link.url).searchParams.get('song'), 'Peggy Gou - Nanana');
  const text = reportText(r);
  for (const line of lines) assert.ok(text.includes(line), line.slice(0, 20));
  // cut by halves: as the limit tightens the lines go to 160 characters (and a …), then 80, 40, 20 and then none, never longer for a
  // tighter limit, and under the limit whenever any of those fits
  const levels = [];
  for (let limit = ISSUE_LIMIT; limit >= 300; limit -= 3) {
    const l = misreadLink(r, limit);
    levels.push(Array.from(new URL(l.url).searchParams.get('read').split('\n')[2]).length);
    assert.ok(l.url.length <= limit || levels.at(-1) === 1, `${limit}: ${l.url.length}`);
  }
  assert.deepEqual([...new Set(levels)], [161, 81, 41, 21, 1]);
});

test('the link is under the limit, by characters and not by cutting an emoji in two, even for the longest names the report allows and a line of nothing but emoji', () => {
  const worst = buildMisreadReport({
    ...FULL, version: 'v'.repeat(200), song: { title: '💿'.repeat(400), artist: '🎵'.repeat(400) }, key: '🎹'.repeat(100),
    browser: '🌐'.repeat(200), os: '🖥'.repeat(100), lines: ['kick: ' + '🥁'.repeat(5000), 'clap: ' + '👏'.repeat(5000), 'hhc: ' + '🎩'.repeat(5000), 'hho: ' + '🔔'.repeat(5000)],
  });
  const link = misreadLink(worst);
  assert.ok(link.url.length <= ISSUE_LIMIT, `${link.url.length}`);
  assert.ok(isAllowedIssueUrl(link.url));
  for (const [k, v] of new URL(link.url).searchParams) assert.doesNotMatch(v, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/, `${k} has half an emoji`);
  // and a tight limit of its own is kept
  const tight = misreadLink(buildMisreadReport(FULL), 700);
  assert.ok(tight.url.length <= 700, `${tight.url.length}`);
  assert.equal(tight.trimmed, true);
});

test('the app opens the misread link and no other: not another form, host, path, parameter, a second template, a fragment or an oversized link', () => {
  assert.deepEqual(MISREAD_KEYS, LINK_KEYS, 'the app\'s list of the link\'s parameters and the page\'s are the same');
  const base = 'https://github.com/StopBanning/toaster/issues/new';
  for (const url of [
    `${base}?template=misread.yml&title=T&song=S&time=1&source=file&version=1&read=r&browser=b`,
    `${base}?template=misread.yml`,
  ]) assert.equal(isAllowedIssueUrl(url), true, url);
  for (const url of [
    `${base}?template=bug_report.yml&title=x`,
    `${base}?template=misread.yml&labels=bug`,
    `${base}?template=misread.yml&body=x`,
    `${base}?template=misread.yml&what=x`,
    `${base}?template=misread.yml&assignees=x`,
    `${base}?template=misread.yml&template=bug_report.yml`,
    `${base}?template=bug_report.yml&template=misread.yml`,
    `${base}?template=misread.yml&song=${'x'.repeat(ISSUE_LIMIT)}`,
    `${base}?template=misread.yml#x`,
    `${base}?template=misread.yml&song=x#y`,
    `https://x@github.com/StopBanning/toaster/issues/new?template=misread.yml`,
    `https://evil.test/StopBanning/toaster/issues/new?template=misread.yml`,
    `https://github.com.evil.test/StopBanning/toaster/issues/new?template=misread.yml`,
    `https://github.com/StopBanning/toaster/issues/new/../?template=misread.yml`,
    `https://github.com/StopBanning/toaster/issues/new/choose?template=misread.yml`,
    `https://github.com/StopBanning/other/issues/new?template=misread.yml`,
    `http://github.com/StopBanning/toaster/issues/new?template=misread.yml`,
    `${base}?template=misread.yml.evil`,
    `${base}?template=Misread.yml`,
  ]) assert.equal(isAllowedIssueUrl(url), false, url);
  // the bug report's own links are as they were: a title and a body
  assert.equal(isAllowedIssueUrl(`${base}?title=x&body=y`), true);
  assert.equal(isAllowedIssueUrl(`${base}?title=x&song=y`), false, 'the form\'s fields only with its template');
});

// ---------------------------------------------------------------- copy report

test('copy report: the clipboard is asked inside the click; where it is refused or there is none, the text is selected for the keys', async () => {
  const calls = [];
  const good = { writeText: async (t) => { calls.push(['write', t]); } };
  const how = copyReport({ clipboard: good, text: 'the report', select: () => calls.push(['select']) });
  assert.deepEqual(calls, [['write', 'the report']], 'asked at once, before anything waits');
  assert.equal(await how, 'copied');
  assert.deepEqual(calls, [['write', 'the report']], 'and nothing selected');
  calls.length = 0;
  const refused = { writeText: async () => { throw new DOMException('Write permission denied.', 'NotAllowedError'); } };
  assert.equal(await copyReport({ clipboard: refused, text: 'x', select: () => calls.push(['select']) }), 'selected');
  const sync = { writeText() { throw new Error('no'); } };
  assert.equal(await copyReport({ clipboard: sync, text: 'x', select: () => calls.push(['select']) }), 'selected');
  assert.equal(await copyReport({ clipboard: undefined, text: 'x', select: () => calls.push(['select']) }), 'selected', 'a page with no clipboard (not secure)');
  assert.equal(await copyReport({ clipboard: {}, text: 'x', select: () => calls.push(['select']) }), 'selected');
  assert.deepEqual(calls, [['select'], ['select'], ['select'], ['select']]);
});

// ---------------------------------------------------------------- the box, on a stand-in page

// the box's parts by selector, a dialog that opens and closes, the element focus was on before, and what the box was asked to do
function boxPage({ snapshot = () => FULL, clipboard, open, fail = () => {} } = {}) {
  const parts = {}, said = [];
  const make = () => ({ value: '', textContent: '', focused: 0, selected: 0, focus() { this.focused++; }, select() { this.selected++; } });
  const dialog = {
    id: '', className: '', attrs: {}, innerHTML: '', open: false, listeners: {}, shown: 0, closed: 0,
    setAttribute(k, v) { this.attrs[k] = v; },
    querySelector: (sel) => (parts[sel] ||= make()),
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    showModal() { this.open = true; this.shown++; }, close() { this.open = false; this.closed++; },
  };
  const before = make();
  const document = { createElement: (tag) => { said.push(tag); return dialog; }, body: { append: (x) => said.push(x === dialog ? 'appended' : '?') }, activeElement: before };
  const box = createMisreadReport({ document, snapshot, open, clipboard, fail });
  return { box, dialog, parts, before, said };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

test('the box is a dialog on the page after the bug report\'s look, with the report in a read-only box and three buttons, and it opens with the open button in focus', () => {
  const p = boxPage({ open: () => {}, clipboard: {} });
  assert.deepEqual(p.said, ['dialog', 'appended']);
  assert.equal(p.dialog.id, 'misread-report');
  assert.equal(p.dialog.className, 'xp');
  assert.equal(p.dialog.attrs['aria-labelledby'], 'misread-title');
  for (const id of ['misread-title', 'misread-preview', 'misread-note', 'misread-open', 'misread-copy', 'misread-cancel']) assert.ok(p.dialog.innerHTML.includes(`id="${id}"`), id);
  assert.match(p.dialog.innerHTML, /<textarea id="misread-preview"[^>]* readonly>/);
  assert.match(p.dialog.innerHTML, /Open on GitHub<\/button>.*Copy report<\/button>.*Close<\/button>/);
  assert.match(p.dialog.innerHTML, /role="status"/, 'what happens next is said where a screen reader hears it');
  assert.equal(p.dialog.open, false, 'not till it is asked');
  p.box.show();
  assert.equal(p.dialog.open, true);
  assert.equal(p.parts['#misread-preview'].value, reportText(buildMisreadReport(FULL)));
  assert.equal(p.parts['#misread-open'].focused, 1);
  assert.match(p.parts['#misread-note'].textContent, /Open on GitHub opens a draft issue: you read it over and submit it there\. Nothing is sent from here\./);
  // asked again while it is up: nothing happens
  p.box.show();
  assert.equal(p.dialog.shown, 1);
});

test('the report is taken when the box opens, so it is the song as it is then', () => {
  let tempo = { locked: true, shown: 124, bpm: 124 };
  const p = boxPage({ snapshot: () => ({ ...FULL, tempo }), open: () => {}, clipboard: {} });
  p.box.show();
  assert.match(p.parts['#misread-preview'].value, /tempo: 124 bpm, locked/);
  p.box.close();
  tempo = { locked: true, shown: 128, bpm: 128 };
  p.box.show();
  assert.match(p.parts['#misread-preview'].value, /tempo: 128 bpm, locked/);
});

test('open on GitHub hands the link to open() and closes the box, focus going back to where it was; nothing is opened before', async () => {
  const opened = [], failed = [];
  const p = boxPage({ open: (url) => { opened.push(url); return Promise.resolve(); }, clipboard: {}, fail: (e) => failed.push(e) });
  p.box.show();
  assert.deepEqual(opened, [], 'showing it opens nothing');
  p.parts['#misread-open'].onclick();
  await flush();
  assert.deepEqual(opened, [misreadLink(buildMisreadReport(FULL)).url]);
  assert.equal(p.dialog.open, false);
  assert.equal(p.before.focused, 1);
  assert.deepEqual(failed, []);
});

test('open on GitHub that fails (a throw, a refusal from the app) is shown through fail(); a throw leaves the box up', async () => {
  const failed = [];
  const threw = boxPage({ open: () => { throw new Error('no bridge'); }, clipboard: {}, fail: (e) => failed.push(e.message) });
  threw.box.show();
  threw.parts['#misread-open'].onclick();
  assert.deepEqual(failed, ['no bridge']);
  assert.equal(threw.dialog.open, true, 'still there to copy from');
  const refused = boxPage({ open: () => Promise.reject(new Error('Invalid bug report URL')), clipboard: {}, fail: (e) => failed.push(e.message) });
  refused.box.show();
  refused.parts['#misread-open'].onclick();
  await flush();
  assert.deepEqual(failed, ['no bridge', 'Invalid bug report URL']);
});

test('copy report writes the text the box shows, and says it is copied; refused, it selects the text and says to press the keys', async () => {
  const written = [];
  const good = boxPage({ clipboard: { writeText: async (t) => { written.push(t); } }, open: () => {} });
  good.box.show();
  good.parts['#misread-copy'].onclick();
  assert.equal(written.length, 1, 'written inside the click');
  await flush();
  assert.equal(written[0], good.parts['#misread-preview'].value);
  assert.equal(written[0], reportText(buildMisreadReport(FULL)));
  assert.equal(good.parts['#misread-note'].textContent, 'Copied. Paste it where you like.');
  assert.equal(good.parts['#misread-preview'].selected, 0);
  assert.equal(good.dialog.open, true, 'it stays up: open on GitHub is still there');
  for (const clipboard of [{ writeText: async () => { throw new Error('denied'); } }, undefined]) {
    const bad = boxPage({ clipboard, open: () => {} });
    bad.box.show();
    bad.parts['#misread-copy'].onclick();
    await flush();
    assert.equal(bad.parts['#misread-preview'].selected, 1, 'selected for the keys');
    assert.equal(bad.parts['#misread-preview'].focused, 1);
    assert.match(bad.parts['#misread-note'].textContent, /Copying was refused here\. The report is selected: press Ctrl\+C \(⌘C on a Mac\) to copy it\./);
  }
});

test('close shuts the box and gives the focus back; Escape does the same; and a link that had to be cut says so before it is opened', () => {
  const p = boxPage({ open: () => {}, clipboard: {} });
  p.box.show();
  p.parts['#misread-cancel'].onclick();
  assert.equal(p.dialog.open, false);
  assert.equal(p.before.focused, 1);
  p.box.show();
  p.dialog.listeners.cancel[0]();
  assert.equal(p.before.focused, 2, 'Escape: the dialog closes itself, and the focus goes back');
  const lines = ['kick: s("' + 'bd ~ '.repeat(3000) + '")', 'clap: s("cp")', 'hhc: s("hh")', 'hho: s("oh")'];
  const long = boxPage({ snapshot: () => ({ ...FULL, lines }), open: () => {}, clipboard: {} });
  long.box.show();
  assert.match(long.parts['#misread-note'].textContent, /code lines are cut short on GitHub to fit the link\. Copy report has them whole\./);
  assert.ok(long.parts['#misread-preview'].value.includes(lines[0]), 'the box has them whole');
});

// ---------------------------------------------------------------- the player bar's flag, on a stand-in page

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = {}; this.className = ''; this.hidden = false; this._text = ''; this.on = new Set(); this.innerHTML = ''; this.title = ''; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v; }
  append(...kids) { this.children.push(...kids); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  get classList() { const el = this; return { toggle: (c, f) => (f ? el.on.add(c) : el.on.delete(c)), contains: (c) => el.on.has(c) }; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, preventDefault() {}, ...ev }); }
  getBoundingClientRect() { return { left: 0, width: 0, top: 0 }; }
  blur() { this.blurs = (this.blurs || 0) + 1; }
  find(cls, out = []) { if (this.className.split(' ').includes(cls)) out.push(this); for (const k of this.children) k.find(cls, out); return out; }
}
const bar = (act) => {
  const root = new El('div');
  const b = createPlayerBar({ document: { createElement: (t) => new El(t), body: new El('body') }, root, act, window: {} });
  return { root, b, flag: root.find('pl-misread')[0] };
};
const snap = (o = {}) => ({ t: 0, active: true, source: null, stopped: null, label: '', song: null, app: '', session: false, systemPlaying: false, el: null, tempo: { locked: false, shown: 0 }, key: '', at: null, ...o });

test('the player bar\'s flag is a small button, labelled report a misread, at the bar\'s right end, there with any source or none, and one click opens the report', () => {
  const asked = [];
  const p = bar({ misread: () => asked.push('misread'), fail: (e) => asked.push(['fail', e.message]) });
  p.flag.blur = () => asked.push('blur');
  assert.ok(p.flag, 'there');
  assert.equal(p.flag.tag, 'button');
  assert.equal(p.flag.type, 'button');
  assert.ok(p.flag.className.split(' ').includes('pl-btn'), 'a bar button, as the transport\'s');
  assert.equal(p.flag.title, 'report a misread');
  assert.equal(p.flag.attrs['aria-label'], 'report a misread');
  assert.match(p.flag.innerHTML, /^<svg viewBox="0 0 16 16" aria-hidden="true"><path d="[^"]+"\/><\/svg>$/);
  assert.equal(p.root.children.at(-1), p.flag, 'last: the right end');
  // there, and shown, whatever the source (the report says what it does not know), and never changed by the bar's updates
  for (const source of [null, 'system', 'file', 'input', 'tab', 'demo', 'radio']) {
    p.b.update(snap({ source, stopped: source ? null : 'radio', song: source ? { title: 'x', artist: 'y' } : null, app: 'Music', session: true }));
    assert.equal(p.flag.hidden, false, String(source));
    assert.equal(p.flag.title, 'report a misread');
  }
  p.flag.fire('click', { detail: 1 });
  assert.deepEqual(asked, ['blur', 'misread'], 'a click leaves no focus on it (it would keep the bar up in Z\'s mode), and that is before the report opens: closing it gives the focus back to what had it');
  p.flag.fire('click', { detail: 0 }); // Enter or Space on it
  assert.deepEqual(asked, ['blur', 'misread', 'misread'], 'a key press keeps its focus');
});

test('a bar the app gives no way to report with has no flag, and one whose report throws says so through the app', () => {
  const none = bar({});
  assert.equal(none.flag.hidden, true, 'never a button that does nothing');
  none.flag.fire('click', { detail: 1 });
  const failed = [];
  const broken = bar({ misread: () => { throw new Error('no box'); }, fail: (e) => failed.push(e.message) });
  broken.flag.fire('click', { detail: 1 });
  assert.deepEqual(failed, ['no box']);
});

// ---------------------------------------------------------------- the page: the bar, the help and Ctrl+K

test('the player bar, the help and Ctrl+K each have the entry, and each opens the same box', () => {
  // the player bar
  assert.match(player, /const misread = el\('button', 'pl-btn pl-misread'\);/);
  assert.match(player, /misread\.title = 'report a misread';/);
  assert.match(app, /misread: \(\) => misreadReport\.show\(\),/);
  const barBlock = app.slice(app.indexOf('const playerBar = createPlayerBar({'), app.indexOf('// on screen just now'));
  assert.match(barBlock, /misread: \(\) => misreadReport\.show\(\),/, 'in the bar\'s own act');
  // the help, next to the bug report
  assert.match(html, /<p class="help-tools"><button type="button" id="search-commands">[\s\S]*?<\/button><button type="button" id="report-bug">report a bug<\/button><button type="button" id="report-misread">report a misread<\/button><\/p>/);
  assert.match(app, /\$\('report-misread'\)\.onclick = \(\) => \{ \$\('help'\)\.close\(\); misreadReport\.show\(\); \};/);
  // Ctrl+K, next to the bug report
  assert.match(app, /\{ id: 'report-bug', name: 'report a bug', aliases: \[[^\]]*\], run: \(\) => bugReport\.show\(\) \},\n  \{ id: 'report-misread', name: 'report a misread', aliases: \['misread', [^\]]*\], run: \(\) => misreadReport\.show\(\) \},\n\];/);
  const aliases = app.match(/id: 'report-misread', name: 'report a misread', aliases: \[([^\]]*)\]/)[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
  assert.ok(aliases.length >= 5);
  assert.ok(aliases.every((a) => a === a.toLowerCase()), 'the search is lower case');
  assert.ok(!aliases.includes('bug') && !aliases.includes('issue'), 'those are the bug report\'s');
  assert.equal(new Set(aliases).size, aliases.length);
});

test('the page takes the snapshot from what it knows now: the version, the source, the song, how far in, the tempo, the key, the code\'s lines, the system and the browser; and opens the draft the way the bug report does', () => {
  assert.match(app, /import \{ createMisreadReport \} from '\.\/misread\.js';/);
  const at = app.indexOf('const misreadReport = createMisreadReport({');
  assert.ok(at > 0);
  const block = app.slice(at, app.indexOf('\n});', at) + 4);
  const keys = [...block.slice(block.indexOf('snapshot: () => ({'), block.indexOf('  }),')).matchAll(/(?:\(\{|,)\s*(\w+):/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['version', 'source', 'song', 'seconds', 'tempo', 'key', 'lines', 'os', 'browser'], 'the snapshot has these and no more');
  assert.match(block, /version: bugVersion, source: state\.source, song: currentSong\(\), seconds: songSeconds\(\),/);
  assert.match(block, /tempo: state\.source \? eng\.tempo : null, key: state\.source && eng\.key \? `\$\{NOTES\[eng\.key\.root\]\} \$\{eng\.key\.mode\}` : '',/);
  assert.match(block, /lines: Object\.values\(lineTexts\(\)\), os: osName\(\), browser: browserName\(\),/);
  assert.match(block, /open: \(url\) => \(desktopApp\(\) \? window\.nc\.openBugIssue\(url\) : window\.open\(url, '_blank', 'noopener'\)\),/);
  assert.match(block, /clipboard: navigator\.clipboard,/);
  assert.match(block, /fail: showError,/);
  // how far in: a file's own position, else how long the engine has listened to this song; none with no source
  const seconds = app.slice(app.indexOf('function songSeconds() {'), app.indexOf('const misreadReport = createMisreadReport({'));
  assert.match(seconds, /if \(!state\.source\) return null;/);
  assert.match(seconds, /if \(state\.source === 'file' && state\.el && Number\.isFinite\(state\.el\.currentTime\)\) return state\.el\.currentTime;/);
  assert.match(seconds, /return nowSec\(\) - eng\.resetAt;/);
  // for a test or a tool driving the page
  assert.match(app, /palette, paletteEntries, updateHints, bugReport, misreadReport, retainBugError,/);
});

test('main opens only what helpers/issue-url.cjs allows, for the bug report\'s drafts and the misread\'s alike, and the page reaches it through the one bridge', () => {
  const main = read('main.js'), preload = read('preload.js');
  assert.match(main, /ipcMain\.handle\('open:bug-issue', \(_e, url\) => \{\s*if \(!require\('\.\/helpers\/issue-url\.cjs'\)\.isAllowedIssueUrl\(url\)\) throw new Error\('Invalid bug report URL'\);\s*return shell\.openExternal\(url\);\s*\}\);/);
  assert.ok(preload.includes("openBugIssue: (url) => ipcRenderer.invoke('open:bug-issue', url),"));
});

test('the app lets its own window write plain text to the clipboard (the copy button) and never read it', () => {
  const main = read('main.js');
  const allowed = main.match(/const allowed = new Set\(\[([^\]]*)\]\);/)[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(allowed, ['media', 'display-capture', 'fullscreen', 'clipboard-sanitized-write']);
  assert.ok(!allowed.some((p) => /clipboard-read|openExternal|notifications|geolocation/.test(p)));
  // and only for the app's own window, as the others
  assert.match(main, /setPermissionRequestHandler\(\(wc, permission, cb\) => cb\(ours\(wc\) && allowed\.has\(permission\)\)\);/);
  assert.match(main, /setPermissionCheckHandler\(\(wc, permission\) => ours\(wc\) && allowed\.has\(permission\)\);/);
});

test('the flag and the box are drawn in the page\'s own CSS: the flag in the bar\'s block and out of a recording, the box with the bug report\'s look', () => {
  assert.match(css, /#player \.pl-misread \{ flex: none; color: var\(--dim\); \}/);
  assert.match(css, /#player \.pl-misread:hover, #player \.pl-misread:focus-visible \{ color: var\(--fg\); \}/);
  assert.match(css, /body\.recording #player \.pl-misread \{ visibility: hidden; \}/);
  assert.match(css, /#bug-report, #misread-report \{ position: fixed;/);
  assert.match(css, /#bug-report \.xp-msg p, #misread-report \.xp-msg p \{/);
  assert.match(css, /#bug-report textarea, #misread-report textarea \{/);
  assert.match(css, /#bug-report #bug-note, #misread-report #misread-note \{/);
  // the flag is in the bar's block, so its colours are the theme's (player-bar.test.mjs checks the block)
  const bar = css.slice(css.indexOf('/* ---------- the player bar (player.js)'), css.indexOf('/* ---------- menu ---------- */'));
  assert.ok(bar.includes('#player .pl-misread { flex: none;'));
});

test('nothing in the module reaches the network, storage, the camera or the microphone: the report goes out only through open() and the clipboard, when you choose', () => {
  const code = module_.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|getUserMedia|AudioContext|MediaRecorder|\bnc\b|\bwindow\b/);
  assert.doesNotMatch(code, /setTimeout|setInterval|Date\.now|performance\.now|Math\.random|requestAnimationFrame|new Date/, 'the clock test: nothing of the page\'s time in a file that is not a picture');
});
