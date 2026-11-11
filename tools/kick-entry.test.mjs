import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
test('kick semantic transactions in a real DOM at 15 ms ticks',()=>{
 // (fileURLToPath: a URL's pathname on Windows is /D:/..., which is no path; 0.5.6's Windows CI run timed out on it)
 const r=spawnSync(require('electron'),[fileURLToPath(new URL('./kick-entry-check.cjs',import.meta.url))],{encoding:'utf8',timeout:90000});
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.ok(JSON.parse(r.stdout.trim().split('\n').at(-1)).ok);
});
