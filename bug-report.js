// Report a bug (in the help, and in Ctrl+K): an XP error-report box, after the old "has encountered
// a problem" dialog. Send opens a draft GitHub issue in the browser with what you wrote and a few
// details about your setup. Nothing goes anywhere until you submit it there.
// Privacy: the box shows the exact text that will go, and every word of it can be edited or
// deleted. User names in paths become ~. The details are a fixed list (never a song, a file name, a
// stream's address or anything heard), and of the errors only the type is kept, since a message can
// hold a song's title or a path.

export const ISSUE_BASE = 'https://github.com/StopBanning/toaster/issues/new';
export const ISSUE_LIMIT = 7500; // characters in the whole link, well under what GitHub takes

export function scrubPaths(text) {
  return String(text).replace(/[A-Z]:\\Users\\[^\\/\s]+/gi, '~').replace(/\/Users\/[^/\s]+/g, '~');
}

const ERROR_NAMES = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'NotAllowedError', 'NotReadableError',
  'AbortError', 'NetworkError', 'NotFoundError', 'InvalidStateError', 'SecurityError']);
export function errorSummary(error) {
  return ERROR_NAMES.has(error?.name) ? error.name : 'Error';
}

const FIELDS = ['version', 'platform', 'os', 'browser', 'layout', 'background', 'codeLook', 'theme', 'audioSource'];
const clean = (x) => scrubPaths(x ?? 'unknown').replace(/[^\w .:()'-]/g, '').slice(0, 80);

export function buildBugBody(description, context = {}, errors = []) {
  const details = FIELDS.map((k) => k + ': ' + clean(context[k])).join('\n');
  const recent = errors.length
    ? '\n\nRecent errors (types only):\n' + errors.slice(-5).map((e) => '- ' + errorSummary(e)).join('\n')
    : '';
  return scrubPaths(description).trim() + '\n\nToaster details (edit or delete any of this):\n' + details + recent;
}

// The draft's link. When the text won't fit, the errors go first, then the end of the text; the box
// then shows what's left before anything is sent.
export function issueLink(body) {
  const make = (s) => ISSUE_BASE + '?' + new URLSearchParams({ title: 'Toaster bug report', body: s }).toString();
  let text = String(body);
  if (make(text).length > ISSUE_LIMIT) {
    const marker = text.indexOf('\n\nRecent errors');
    if (marker >= 0) text = text.slice(0, marker);
  }
  if (make(text).length > ISSUE_LIMIT) {
    // the longest start of it that fits, found by halving (in characters, so no emoji is cut in two)
    const chars = Array.from(text);
    let lo = 0, hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (make(chars.slice(0, mid).join('') + '\n[trimmed to fit]').length <= ISSUE_LIMIT) lo = mid;
      else hi = mid - 1;
    }
    text = chars.slice(0, lo).join('') + '\n[trimmed to fit]';
  }
  return { body: text, url: make(text) };
}

// The box. context() gives the details, errors() the errors caught so far, open(url) opens the draft
// (in the default browser from the app, a new tab on the website), fail(err) shows an error.
export function createBugReport({ document, context, errors, open, fail }) {
  const NOTE = 'Send opens a draft on GitHub. You submit it there.';
  const dialog = document.createElement('dialog');
  dialog.id = 'bug-report';
  dialog.className = 'xp';
  dialog.setAttribute('aria-labelledby', 'bug-title');
  dialog.innerHTML = [
    '<div class="xp-title"><span id="bug-title">Toaster</span></div><div class="xp-frame">',
    '<div class="xp-msg"><i class="xp-icon error" aria-hidden="true"></i><p>Toaster has encountered a problem. Tell us what happened?</p></div>',
    '<label class="bug-label">What happened?<textarea id="bug-description" rows="3" placeholder="What were you trying to do?"></textarea></label>',
    '<label class="bug-label">Exact issue text — you can edit or delete any of it<textarea id="bug-preview" rows="10"></textarea></label>',
    `<p id="bug-note" role="status">${NOTE}</p>`,
    '<div class="xp-btns"><button type="button" id="bug-send">Send</button><button type="button" id="bug-cancel">Don\'t Send</button></div>',
    '</div>',
  ].join('');
  document.body.append(dialog);
  const part = (sel) => dialog.querySelector(sel);
  const description = part('#bug-description'), preview = part('#bug-preview'), note = part('#bug-note');
  let previous;

  const close = () => { dialog.close(); previous?.focus(); };
  // what you type goes into the issue text, above the details
  description.oninput = () => { preview.value = buildBugBody(description.value, context(), errors()); };
  part('#bug-cancel').onclick = close;
  part('#bug-send').onclick = () => {
    const result = issueLink(preview.value);
    if (result.body !== preview.value) {
      // trimmed to fit the link: show what's left, and the next Send sends it
      preview.value = result.body;
      note.textContent = 'The text was trimmed to fit the link. Review it, then Send.';
      return;
    }
    try {
      Promise.resolve(open(result.url)).catch(fail);
      close();
    } catch (e) {
      fail(e);
    }
  };
  dialog.addEventListener('cancel', () => previous?.focus());
  return {
    show() {
      previous = document.activeElement;
      description.value = '';
      preview.value = buildBugBody('', context(), errors());
      note.textContent = NOTE;
      dialog.showModal();
      description.focus();
    },
    close,
  };
}
