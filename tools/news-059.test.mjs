// What's new for 0.5.9 (renderer/news.js): the rebuild's code that plays all of itself without clipping, the louder
// rebuilt sound file, and the mini player's bar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS } from '../renderer/news.js';

test("0.5.9's what's new names the rebuild's code, the rebuilt file and the mini player's bar", () => {
  const v = NEWS.find((n) => n.version === '0.5.9');
  assert.ok(v, '0.5.9 is there');
  const all = v.items.map((i) => i.text).join('\n');
  for (const [what, re] of [['every sound plays', /every voice and keys sound/], ['no clipping', /full scale/], ['the rebuilt file', /sound file/], ['the mini bar', /mini player has its bar/]]) assert.match(all, re, what);
  for (const i of v.items) assert.ok(i.act || i.key, `each line has a key or an action: ${i.text.slice(0, 40)}`);
});
