import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Packaged, Toaster.exe's LegalCopyright was Electron's own and the Mac app had no NSHumanReadableCopyright. The
// packager's app-copyright option sets both; the line it is given is LICENSE's, so the two can't disagree.
test("the packager is given LICENSE's own copyright line",()=>{
  const license=readFileSync(new URL('../LICENSE',import.meta.url),'utf8');
  const lines=license.match(/^Copyright .+$/gm);
  assert.equal(lines.length,1,'LICENSE has exactly one copyright line');
  assert.match(lines[0].trim(),/^Copyright \(c\) \d{4} \S/);
  const script=readFileSync(new URL('./package.mjs',import.meta.url),'utf8');
  // (read from LICENSE with the same pattern, and passed to the packager's app-copyright option)
  assert.ok(script.includes("path.join(root, 'LICENSE')"));
  assert.ok(script.includes('/^Copyright .+$/m'));
  assert.ok(script.includes('`--app-copyright=${copyright}`'));
});
