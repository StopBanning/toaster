import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { scrubPaths, errorSummary, buildBugBody, issueLink, ISSUE_LIMIT } from '../renderer/bug-report.js';

const { isAllowedIssueUrl } = createRequire(import.meta.url)('../helpers/issue-url.cjs');

test('Windows and macOS user prefixes scrub to the home marker', () => {
  assert.equal(scrubPaths('C:\\Users\\Colin\\file /Users/alex/file'), '~\\file ~/file');
});

test('the details never collect a song, a file, a stream or an error message', () => {
  const context = { version: '0.4.24', platform: 'website', title: 'SECRET SONG', file: 'private.wav', url: 'https://secret/stream' };
  const errors = [{ name: 'TypeError', message: 'SECRET SONG private.wav https://secret/stream', stack: 'C:\\Users\\alex\\private.wav' }];
  const text = buildBugBody('The scene froze', context, errors);
  for (const secret of ['SECRET', 'private.wav', 'https://secret', 'alex']) assert.ok(!text.includes(secret), secret);
  assert.match(text, /TypeError/);
  assert.equal(errorSummary({ name: 'private.wav' }), 'Error');
});

test('the link stays under the cap, trims the errors first and carries the preview text exactly', () => {
  for (const text of ['hello', '💿'.repeat(10000), 'x'.repeat(9000) + '\n\nRecent errors\nsecret']) {
    const r = issueLink(text);
    assert.ok(r.url.length <= ISSUE_LIMIT);
    assert.equal(new URL(r.url).searchParams.get('body'), r.body);
    assert.ok(isAllowedIssueUrl(r.url));
  }
  const s = 'a'.repeat(7000);
  assert.equal(issueLink(s + '\n\nRecent errors\n' + 'x'.repeat(1000)).body, s);
});

test('the app opens no other host, path, credentials, fragment or an oversized link', () => {
  for (const url of [
    'https://evil.test/StopBanning/toaster/issues/new',
    'https://github.com.evil.test/StopBanning/toaster/issues/new',
    'https://github.com/StopBanning/toaster/issues/new/../',
    'https://x@github.com/StopBanning/toaster/issues/new',
    'https://github.com/StopBanning/toaster/issues/new#x',
    'https://github.com/StopBanning/toaster/issues/new?labels=bug',
    'https://github.com/StopBanning/toaster/issues/new?body=' + 'x'.repeat(ISSUE_LIMIT),
    'javascript:alert(1)',
  ]) assert.equal(isAllowedIssueUrl(url), false, url);
});
