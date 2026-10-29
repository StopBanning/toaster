// The bug report's draft link (renderer/bug-report.js), checked before the app opens it in the
// browser: only Toaster's own new-issue page, with nothing but a title and a body, and no longer
// than the renderer makes it.
const ISSUE_LIMIT = 7500;

function isAllowedIssueUrl(value) {
  if (typeof value !== 'string' || value.length > ISSUE_LIMIT) return false;
  try {
    const u = new URL(value);
    return u.origin === 'https://github.com' && u.pathname === '/StopBanning/toaster/issues/new'
      && !u.username && !u.password && !u.hash
      && [...u.searchParams.keys()].every((k) => k === 'title' || k === 'body');
  } catch {
    return false;
  }
}

module.exports = { isAllowedIssueUrl };
