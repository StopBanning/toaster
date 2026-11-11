import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('kick semantic transactions in a real DOM at 15 ms ticks',()=>{
 const r=spawnSync(require('electron'),[new URL('./kick-entry-check.cjs',import.meta.url).pathname],{encoding:'utf8',timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.ok(JSON.parse(r.stdout.trim().split('\n').at(-1)).ok);
});
