import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rolledSceneSource} from '../renderer/scenery-source.js';

test('rolled loops preserve their starts, comparisons, increments, and early exits', () => {
  const source='precision highp int;\nfor (int i = 0; i < 4; i++) {}\nfor (int j = -1; j <= 2; j++) {}\nfor (int k = 1; k < 3 && !hit; k++) {}';
  assert.equal(rolledSceneSource(source),'precision highp int;\nuniform int loopZero;\nfor (int i = 0; i < 4 + loopZero; i++) {}\nfor (int j = -1; j <= 2 + loopZero; j++) {}\nfor (int k = 1; k < 3 + loopZero && !hit; k++) {}');
});

test('dynamic and floating-point bounds are not rewritten', () => {
  const loops='for (int i = 0; i < count; i++) {}\nfor (float j = 0.; j < 4.; j++) {}';
  assert.equal(rolledSceneSource('precision highp int;\n'+loops),'precision highp int;\nuniform int loopZero;\n'+loops);
});

test('only the measured scenes compile with rolled bounds; other sources retain their exact text', () => {
  const text=readFileSync(new URL('../renderer/scenery.js',import.meta.url),'utf8');
  const captured=[];
  // Only evaluate the shader constants and the small source-selection function, never drawing code.
  const constants=text.slice(0,text.indexOf('export function createScenery'))
    .replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
  const selection=text.match(/const source = LIB \+ \(MAINS\[name\] \|\| MAINS\.lake\);\s*return \(scenes\[name\] = makeProgram\((.*?)\)\);/s);
  assert.ok(selection,'test must cover the production source-selection expression');
  const context={rolledSceneSource,captured};
  vm.runInNewContext(constants+`;for(const name of Object.keys(MAINS)){const source=LIB+MAINS[name];const made=${selection[1]};captured.push({name,source,made});}`,context);
  for(const {name,source,made} of captured){
    if(['sharks','garden','koi','halloween'].includes(name)){
      assert.ok((made.match(/\+ loopZero/g)||[]).length>=1);
      assert.equal((made.match(/uniform int loopZero;/g)||[]).length,1);
      assert.equal(made.replace('uniform int loopZero;\n','').replaceAll(' + loopZero',''),source);
    }else assert.equal(made,source,name+' must retain its exact shader text');
  }
});
