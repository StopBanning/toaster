// Z's three settings for the code (renderer/codeview.js's nextCodeSetting; body.nocode and body.nobeat in the CSS):
// all of it, none of it, then all but the beat, and round again. The beat is the drum lines and their grid, nothing else.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCodeSetting } from '../renderer/codeview.js';

const read = (f) => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8');
const css = read('style.css'), html = read('index.html'), app = read('app.js');

test('Z goes round all of the code, none of it, then all but the beat', () => {
  let s = { codeHidden: false, beatHidden: false };
  const seen = [];
  for (let i = 0; i < 6; i++) { s = nextCodeSetting(s); seen.push(`${s.codeHidden} ${s.beatHidden}`); }
  assert.deepEqual(seen, ['true false', 'false true', 'false false', 'true false', 'false true', 'false false']);
  // an older Toaster's saved codeHidden: true (no beatHidden) is none of it, and Z goes on from there
  assert.deepEqual(nextCodeSetting({ codeHidden: true }), { codeHidden: false, beatHidden: true });
});

test('the beat hidden is the drum lines and their grid, and nothing else', () => {
  const rule = css.split('\n').find((l) => l.startsWith('body.nobeat'));
  assert.ok(rule, 'a body.nobeat rule');
  assert.match(rule, /\{ display: none; \}/);
  const hidden = [...rule.matchAll(/body\.nobeat #([\w-]+)/g)].map((m) => m[1]).sort();
  // the code's lines in the page, in order: the drums are the ones after the key's line, down to their grid
  const code = html.slice(html.indexOf('<main id="code">'), html.indexOf('</main>'));
  const ids = [...code.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hidden, ids.slice(ids.indexOf('ln-scale') + 1, ids.indexOf('grid') + 1).sort());
  assert.deepEqual(hidden, ['grid', 'ln-bd', 'ln-hhc', 'ln-hho', 'ln-sd']);
  for (const kept of ['ln-title', 'ln-tempo', 'ln-scale', 'ln-bassline', 'ln-chords', 'ln-vox', 'roll']) assert.ok(ids.includes(kept), kept);
});

test('the setting is saved, and loads as one of the three', () => {
  assert.match(app, /const SAVED = \[[^\]]*'beatHidden'/);
  assert.match(app, /state\.beatHidden = state\.beatHidden === true && !state\.codeHidden;/);
  assert.match(app, /setCodeHidden\(state\.codeHidden, state\.beatHidden\);/);
});
