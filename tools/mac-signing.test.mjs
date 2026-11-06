import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./release/mac-signing.sh', import.meta.url).pathname;
// (mac.yml sources the script on the Mac runner only; Windows has no /bin/bash or security, so these run on a Mac)
const mac = { skip: process.platform !== 'darwin' };
for (const fail of ['', 'import', 'set-key-partition-list', 'missing']) test(`signing stages and cleanup: ${fail || 'success'}`, mac, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toaster-sign-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'security'), `#!/bin/bash
printf '%s\\n' "$1" >> "$RUNNER_TEMP/calls"
if [ "$1" = list-keychains ] && [ "$#" = 3 ]; then echo '    "/mock/login.keychain-db"'; fi
if [ "$1" = "$FAIL" ]; then echo 'simulated failure' >&2; exit 1; fi
if [ "$1" = find-identity ] && [ "$FAIL" != missing ]; then echo '  1) ABCDEF "Toaster Self-Signed"'; fi
`, { mode: 0o755 });
    const r = spawnSync('/bin/bash', ['-e', '-c', 'source "$1"; echo "identity=$ID keychain=${KC[*]}"', 'test', script], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, RUNNER_TEMP: dir, MAC_SIGN_P12: 'c2VjcmV0', MAC_SIGN_PASSWORD: 'secret-password', FAIL: fail } });
    assert.equal(r.status, fail ? 1 : 0, r.stderr);
    assert.doesNotMatch(r.stdout + r.stderr, /c2VjcmV0|secret-password/);
    assert.equal(fs.existsSync(path.join(dir, 'sign.p12')), false);
    const calls = fs.readFileSync(path.join(dir, 'calls'), 'utf8').trim().split('\n');
    assert.deepEqual(calls.slice(-2), ['list-keychains', 'delete-keychain']);
    assert.ok(calls.indexOf('find-identity') < calls.indexOf('set-key-partition-list') || fail);
    if (!fail) assert.match(r.stdout, /identity=ABCDEF keychain=--keychain/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('absent signing secret uses ad hoc without touching keychains', mac, () => {
  const r = spawnSync('/bin/bash', ['-e', '-c', 'source "$1"; echo "$ID ${#KC[@]}"', 'test', script], { encoding: 'utf8', env: { ...process.env, MAC_SIGN_P12: '' } });
  assert.equal(r.status, 0); assert.equal(r.stdout.trim(), '- 0');
});
