// The bug report's draft link (renderer/bug-report.js), checked before the app opens it in the
// browser: only Toaster's own new-issue page, with nothing but a title and a body, and no longer
// than the renderer makes it. The misread report's link (renderer/misread.js) is the same page with
// its issue form named and filled in: that one form's template, a title and the form's field ids
// (LINK_KEYS there), and nothing else.
const ISSUE_LIMIT = 7500;
const MISREAD_KEYS = ['template', 'title', 'song', 'time', 'source', 'version', 'read', 'browser'];

function isAllowedIssueUrl(value) {
  if (typeof value !== 'string' || value.length > ISSUE_LIMIT) return false;
  try {
    const u = new URL(value);
    const templates = u.searchParams.getAll('template');
    const misread = templates.length === 1 && templates[0] === 'misread.yml';
    return u.origin === 'https://github.com' && u.pathname === '/StopBanning/toaster/issues/new'
      && !u.username && !u.password && !u.hash
      && [...u.searchParams.keys()].every((k) => (misread ? MISREAD_KEYS.includes(k) : k === 'title' || k === 'body'));
  } catch {
    return false;
  }
}

module.exports = { isAllowedIssueUrl, MISREAD_KEYS };
