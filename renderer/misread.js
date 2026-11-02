// Report a misread (the player bar's flag, the help, and Ctrl+K): a song Toaster read wrong (a tempo twice what it is, a kick
// line that doesn't match the music) turned into a data point with one click. The box shows exactly what the report holds:
// the version, the source, the song's name if there is one, how far into it, the tempo and key Toaster read, its kick, clap
// and hat lines as the code shows them, and the browser and system. No audio, nothing else. Nothing goes anywhere until you
// pick a way out: "open on GitHub", a new issue from the misread form (.github/ISSUE_TEMPLATE/misread.yml) filled in, which
// you read over and submit there, or "copy report", the same as plain text for a reply on Reddit or Hacker News.
// The report, its text and its link are plain functions of a snapshot the page takes (app.js), so tools/misread.test.mjs runs
// them without a page.

import { ISSUE_BASE, ISSUE_LIMIT, scrubPaths } from './bug-report.js';
import { CHIPS, fmtTime } from './player.js';

export const TEMPLATE = 'misread.yml';
// The report's fields, in order. Nothing is collected that is not on this list.
export const REPORT_FIELDS = ['version', 'source', 'song', 'seconds', 'bpm', 'locked', 'key', 'kick', 'clap', 'hhc', 'hho', 'browser', 'os'];
// The link's query parameters: the form's template, a title, and the ids of its fields that the report fills in (all of them
// but `what`, which is for you to write on GitHub). helpers/issue-url.cjs lets the app open a link with these and no others.
export const LINK_KEYS = ['template', 'title', 'song', 'time', 'source', 'version', 'read', 'browser'];

// What is said where a part of the report isn't there yet, so a report made before the song starts says so rather than fails.
export const NONE = { source: 'none yet', song: 'not known', time: 'not known', tempo: 'not read yet', key: 'not read yet', line: 'no line yet' };

const one = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();
// (by characters, so no emoji is cut in two)
const cap = (s, max) => { const chars = Array.from(s); return chars.length > max ? chars.slice(0, max).join('') + '…' : s; };
const plain = (x, max) => cap(scrubPaths(one(x)), max);

// "Artist - Title", or the title alone. A file's song carries "File" in an artist's place (as in the player bar): not a name.
export function songName(song, source) {
  const title = plain(song?.title, 120);
  if (!title) return null;
  const artist = plain(song?.artist, 60);
  return (source === 'file' && artist === 'File') || !artist ? title : `${artist} - ${title}`;
}

// The tempo as the code and the footer say it: the bpm shown, and whether it has locked. Before the lock, the pulse the code
// guesses at ("// pulse ~123 bpm; finding bar one...") if there is one.
export function tempoRead(T) {
  const bpm = Math.round(T?.locked ? T.shown || T.bpm : T?.provisional?.bpm);
  return { bpm: bpm > 0 ? bpm : null, locked: !!T?.locked };
}

// The kick, clap and hat lines out of the code's lines, each as written, with a _ or // in front if the part has stopped or
// was never heard (a line the view has broken over two rows is put back together). A line that isn't there is null.
const LINE = /^(?:_|\/\/ ?)?(kick|clap|hhc|hho):/;
export function pickLines(lines) {
  const out = { kick: null, clap: null, hhc: null, hho: null };
  for (const raw of lines || []) {
    const line = String(raw ?? '').replace(/\r?\n\s*/g, '').trim();
    const label = LINE.exec(line)?.[1];
    if (label && out[label] === null) out[label] = line;
  }
  return out;
}

// What the page knows, as the page gives it: { version, source ('system', 'file', 'input', 'tab', 'demo', 'radio' or none), song
// ({ title, artist } or none), seconds into the song, tempo (the engine's), key ('F# minor'), lines (the code's, each a string),
// os, browser } in, the report out: exactly REPORT_FIELDS, with what isn't known as null.
export function buildMisreadReport(snap) {
  const s = snap || {};
  const { bpm, locked } = tempoRead(s.tempo);
  return {
    version: plain(s.version, 40) || 'unknown',
    source: Object.hasOwn(CHIPS, s.source) ? CHIPS[s.source] : null,
    song: songName(s.song, s.source),
    seconds: Number.isFinite(s.seconds) && s.seconds >= 0 ? Math.round(s.seconds) : null,
    bpm,
    locked,
    key: plain(s.key, 30) || null,
    ...pickLines(s.lines),
    browser: plain(s.browser, 60) || 'unknown',
    os: plain(s.os, 30) || 'unknown',
  };
}

// The report in words, a line each: what the box shows, what "copy report" copies, and what the link fills in.
function describe(r) {
  return {
    version: r.version,
    source: r.source ?? NONE.source,
    song: r.song ?? NONE.song,
    // (a file's own position, and the demo's, which starts at its top; for the rest how long Toaster has heard this song, and
    // it says so: the song may have been playing before)
    time: Number.isFinite(r.seconds) ? `${fmtTime(r.seconds)} (${r.seconds} s${r.source === 'file' || r.source === 'demo' ? '' : ' since Toaster started hearing it'})` : NONE.time,
    tempo: r.bpm ? `${r.bpm} bpm, ${r.locked ? 'locked' : 'not locked yet'}` : r.locked ? 'locked' : NONE.tempo,
    key: r.key ?? NONE.key,
    // (a line that is there is its own label: kick: s("bd ..."), _kick: ..., // kick: ...)
    kick: r.kick ?? `kick: (${NONE.line})`,
    clap: r.clap ?? `clap: (${NONE.line})`,
    hhc: r.hhc ?? `hhc: (${NONE.line})`,
    hho: r.hho ?? `hho: (${NONE.line})`,
    browser: r.browser,
    os: r.os,
  };
}

export function reportText(r) {
  const d = describe(r);
  return [
    'Toaster misread a song',
    `version: ${d.version}`, `source: ${d.source}`, `song: ${d.song}`, `time into the song: ${d.time}`,
    `tempo: ${d.tempo}`, `key: ${d.key}`, d.kick, d.clap, d.hhc, d.hho,
    `browser: ${d.browser}`, `os: ${d.os}`,
  ].join('\n');
}

// The link to a new issue from the misread form, each field of it filled in from the same words as the text. Where it
// would be longer than the app opens (ISSUE_LIMIT), the code lines are cut shorter, by halves, till it fits; trimmed says so.
export function misreadLink(r, limit = ISSUE_LIMIT) {
  const d = describe(r);
  const title = `Misread: ${r.song ?? 'song ' + NONE.song}`;
  const make = (max) => {
    const read = [`tempo: ${d.tempo}`, `key: ${d.key}`, ...[d.kick, d.clap, d.hhc, d.hho].map((line) => cap(line, max))].join('\n');
    const params = new URLSearchParams({ template: TEMPLATE, title, song: d.song, time: d.time, source: d.source, version: d.version, read, browser: `${d.browser} on ${d.os}` });
    return ISSUE_BASE + '?' + params.toString();
  };
  let url = make(Infinity);
  if (url.length <= limit) return { url, trimmed: false };
  for (const max of [160, 80, 40, 20, 0]) {
    url = make(max);
    if (url.length <= limit) break;
  }
  return { url, trimmed: true };
}

// "Copy report": the clipboard is asked in the click itself (the call is made before the first wait). Where it is refused, a
// page that isn't focused or a browser with no clipboard, the text is selected so the keys can take it. Says which happened.
export async function copyReport({ clipboard, text, select }) {
  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    select();
    return 'selected';
  }
}

// The box, after the bug report's: an XP message with the report's text in it, read only, and the two ways out. snapshot()
// gives the page's snapshot each time it opens, open(url) opens the draft (in the default browser from the app, a new tab
// on the website), clipboard is the page's (navigator.clipboard), fail(err) shows an error.
export function createMisreadReport({ document, snapshot, open, clipboard, fail }) {
  const NOTE = 'Open on GitHub opens a draft issue: you read it over and submit it there. Nothing is sent from here.';
  const TRIMMED = 'The code lines are cut short on GitHub to fit the link. Copy report has them whole.';
  const dialog = document.createElement('dialog');
  dialog.id = 'misread-report';
  dialog.className = 'xp';
  dialog.setAttribute('aria-labelledby', 'misread-title');
  dialog.innerHTML = [
    '<div class="xp-title"><span id="misread-title">Toaster</span></div><div class="xp-frame">',
    '<div class="xp-msg"><i class="xp-icon info" aria-hidden="true"></i><p>Did Toaster read this song wrong? This is everything the report holds: no audio, nothing else.</p></div>',
    '<label class="bug-label">The report<textarea id="misread-preview" rows="14" wrap="off" readonly></textarea></label>',
    `<p id="misread-note" role="status">${NOTE}</p>`,
    '<div class="xp-btns"><button type="button" id="misread-open" class="def">Open on GitHub</button><button type="button" id="misread-copy">Copy report</button><button type="button" id="misread-cancel">Close</button></div>',
    '</div>',
  ].join('');
  document.body.append(dialog);
  const part = (sel) => dialog.querySelector(sel);
  const preview = part('#misread-preview'), note = part('#misread-note');
  let previous, text = '', link = null;

  const close = () => { dialog.close(); previous?.focus(); };
  part('#misread-cancel').onclick = close;
  part('#misread-open').onclick = () => {
    try {
      Promise.resolve(open(link.url)).catch(fail);
      close();
    } catch (e) {
      fail(e);
    }
  };
  part('#misread-copy').onclick = () => {
    copyReport({ clipboard, text, select: () => { preview.focus(); preview.select(); } }).then((how) => {
      note.textContent = how === 'copied' ? 'Copied. Paste it where you like.' : 'Copying was refused here. The report is selected: press Ctrl+C (⌘C on a Mac) to copy it.';
    });
  };
  dialog.addEventListener('cancel', () => previous?.focus());
  return {
    show() {
      if (dialog.open) return;
      previous = document.activeElement;
      const report = buildMisreadReport(snapshot());
      text = reportText(report);
      link = misreadLink(report);
      preview.value = text;
      preview.setSelectionRange?.(0, 0); // (setting the text leaves the caret at its end, which a narrow box would scroll to)
      note.textContent = link.trimmed ? TRIMMED : NOTE;
      dialog.showModal();
      preview.scrollTop = preview.scrollLeft = 0;
      part('#misread-open').focus();
    },
    close,
  };
}
