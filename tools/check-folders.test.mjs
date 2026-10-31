import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

// The shader, render and visual checks each prepare files under _checks (the page, its settings, and the before and
// after copies of the renderer it compares). They used to share _checks/before and _checks/after, so preparing one
// check overwrote another's. Each now has a folder of its own, and the page script that reads it names that folder.
const read=f=>readFileSync(new URL('./'+f,import.meta.url),'utf8');
const CHECKS=[
  {folder:'render-check',prepare:'prepare-render-check.mjs',reads:['shader-render.js']},
  {folder:'shader-check',prepare:'prepare-shader-check.mjs',reads:['shader-compile.js']},
  {folder:'visual-check',prepare:'prepare-visual-check.mjs',reads:['visual-check.js']},
];

test('each prepare script writes into a _checks folder of its own',()=>{
  const folders=CHECKS.map(c=>read(c.prepare).match(/path\.join\(root, '_checks', '([^']+)'\)/)?.[1]);
  assert.deepEqual(folders,CHECKS.map(c=>c.folder));
  assert.equal(new Set(folders).size,CHECKS.length);
});

test('no prepare script writes straight into _checks, where the others would share it',()=>{
  for(const c of CHECKS)assert.doesNotMatch(read(c.prepare),/path\.join\(root, '_checks'\)/,c.prepare);
});

test("each page script reads only its own check's folder",()=>{
  for(const c of CHECKS)for(const f of c.reads){
    const folders=[...read(f).matchAll(/_checks\/([^/'`]+)/g)].map(m=>m[1]);
    assert.ok(folders.length>0,f+' names no _checks folder');
    assert.ok(folders.every(x=>x===c.folder),f+' reads from '+[...new Set(folders)].join(', ')+', not only '+c.folder);
  }
});

test('the pages each prepare script writes find their script in tools/ from the folder they are in',()=>{
  for(const c of CHECKS){
    const srcs=[...read(c.prepare).matchAll(/src="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(srcs.length>0,c.prepare+' writes no page');
    // (the page is _checks/<folder>/x.html, so ../../tools/y.js is this folder's ./y.js one level up)
    for(const s of srcs){
      assert.match(s,/^\.\.\/\.\.\/tools\/[\w-]+\.js$/,s);
      assert.ok(existsSync(new URL(s.replace('../../tools/','./'),import.meta.url)),s+' does not exist');
    }
  }
});

test('the isolated runner opens the shader check page it is given no other page for',()=>{
  assert.match(read('isolated.cjs'),/path\.join\(root, '_checks', 'shader-check', 'shader\.html'\)/);
});
