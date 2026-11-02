// The Windows build's workflow (.github/workflows/windows.yml), read as text (there is no YAML reader here, and the workflow can't be run
// off GitHub): what makes it safe to build what the dependencies bring. Nothing that runs a dependency's code (npm ci, the test-only Strudel
// install, the tests, the packaging) has a token that can write or can be found on disk; only the job that puts the zip on the release has
// the write permission, and the release upload and the check of GitHub's digest are the same commands as before (the review of Nov 1, A8).
// Where actionlint is installed it is run on the file too.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const file = new URL('../.github/workflows/windows.yml', import.meta.url);
const yml = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const at = (s) => { const i = yml.indexOf(s); assert.ok(i >= 0, `the workflow has ${JSON.stringify(s)}`); return i; };
const jobs = yml.slice(at('\njobs:\n')); // (the trigger is a "release:" too, above it)
const build = jobs.slice(jobs.indexOf('\n  windows:\n'), jobs.indexOf('\n  release:\n')), release = jobs.slice(jobs.indexOf('\n  release:\n'));
assert.ok(build.length > 100 && release.length > 100 && jobs.indexOf('\n  windows:\n') >= 0, 'both jobs are found');
const count = (text, re) => (text.match(re) || []).length;

test('the workflow can only read the repository, and the build keeps no token in its checkout (A8)', () => {
  assert.ok(at('\npermissions:\n  contents: read\n') < at('\njobs:\n'), 'read for the whole workflow');
  assert.equal(count(yml, /contents: write/g), 1, 'write once in all');
  assert.doesNotMatch(build, /permissions:/, 'the build job asks for nothing of its own');
  assert.match(build, /- uses: actions\/checkout@v4\n {8}with:\n {10}persist-credentials: false\n/, 'the checkout leaves no token in .git/config');
});

test('the test-only Strudel install runs no install scripts, and is the same four packages (A8)', () => {
  const line = build.split('\n').find((l) => l.includes('npm install --prefix $scratch'));
  assert.ok(line, 'the install is there');
  assert.match(line, / --ignore-scripts /);
  assert.deepEqual(line.match(/@strudel\/[a-z]+@[\d.]+/g), ['@strudel/core@1.2.6', '@strudel/mini@1.2.6', '@strudel/tonal@1.2.6', '@strudel/transpiler@1.2.6']);
});

test('only the release job writes: it is the one that uploads, after the build, on a release, and the build has no way to (A8)', () => {
  assert.match(release, /\n {4}needs: windows\n {4}if: github\.event_name == 'release'\n/, 'after the build, for a release only');
  assert.match(release, /\n {4}permissions:\n {6}contents: write\n/);
  assert.equal(count(yml, /gh release upload/g), 1);
  assert.doesNotMatch(build, /\bgh (release|api)\b|GH_TOKEN|github\.token|secrets\./, 'nothing in the build can reach GitHub as the repository');
  assert.match(release, /gh release upload \$env:RELEASE_TAG \$env:ZIP --clobber\n {10}if \(\$LASTEXITCODE -ne 0\) \{ exit \$LASTEXITCODE \}\n {10}\$release = gh api "repos\/\$env:GITHUB_REPOSITORY\/releases\/tags\/\$env:RELEASE_TAG" \| ConvertFrom-Json\n/, 'the upload and the asking for the release are as they were');
  assert.match(release, /\$assets\[0\]\.digest -cne "sha256:\$env:SHA"\) \{ throw 'Release asset digest missing or different' \}/, 'and the check of GitHub\'s digest');
  assert.match(release, /GH_TOKEN: \$\{\{ github\.token \}\}\n {10}GH_REPO: \$\{\{ github\.repository \}\}\n/, 'a job with no checkout names the repository for gh');
});

test('what the release job uploads is named by the release, not by the build: only the zip of that version, and it has to be in the artifact (A8)', () => {
  assert.match(release, /- uses: actions\/download-artifact@v4\n {8}with:\n {10}name: toaster-windows\n/);
  assert.match(release, /\$zip = "Toaster-\$\(\$env:RELEASE_TAG\.Substring\(1\)\)-win-x64\.zip"\n/, 'from the tag (the build refuses any tag but v and the version)');
  assert.match(release, /if \(-not \(Test-Path -LiteralPath \$zip\)\) \{ throw /);
  assert.match(release, /"ZIP=\$zip" >> \$env:GITHUB_ENV/);
  assert.match(build, /\n {4}outputs:\n {6}sha: \$\{\{ steps\.zip\.outputs\.sha \}\}\n/, 'only the zip\'s hash comes from the build');
  assert.doesNotMatch(build, /outputs\.zip|zip: \$\{\{/, 'not its name');
  assert.match(build, /- name: Check and zip it\n {8}id: zip\n/);
  assert.match(build, /"sha=\$sha" >> \$env:GITHUB_OUTPUT\n/);
  assert.match(release, /SHA: \$\{\{ needs\.windows\.outputs\.sha \}\}\n/);
});

test('the build is what it was: the tests, the package, the checked zip, the start and screenshot, and the artifact the release job takes the zip from (A8)', () => {
  assert.match(build, /- name: Tests on Windows\n {8}run: node --test tools\/\*\.test\.mjs\n/);
  assert.match(build, /- run: npm run package:win\n/);
  assert.match(build, /python tools\/release-zip\.py dist\/Toaster-win32-x64 \$zip\n/);
  assert.match(build, /Release tag and package version differ/);
  assert.match(build, /Checksum file differs/);
  assert.match(build, /- name: Start it, and a screenshot 25 s in\n/);
  assert.match(build, /- uses: actions\/upload-artifact@v4\n {8}if: always\(\)\n {8}with:\n {10}name: toaster-windows\n {10}path: \|\n {12}\$\{\{ env\.ZIP \}\}\n {12}\$\{\{ env\.ZIP \}\}\.sha256\n {12}shot\.png\n/);
  assert.match(yml, /on:\n {2}release:\n {4}types: \[published\]\n {2}push:\n {4}branches: \[windows-build\]\n/, 'the same triggers');
});

const lint = spawnSync('actionlint', ['-version'], { encoding: 'utf8' });
test('actionlint finds nothing wrong with it', { skip: lint.status !== 0 && 'no actionlint here' }, () => {
  const run = spawnSync('actionlint', [fileURLToPath(file)], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
