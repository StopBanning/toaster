// What's new for 0.5.11 (renderer/news.js): O plays the rebuilt song, one folder per song, the pause hold, the kick on a drop, the glass blob on the hands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS } from '../renderer/news.js';

test("0.5.11's what's new is first and names O's rebuilt song, the one folder, the pause hold, the kick and the glass blob", () => {
  const v = NEWS.find((n) => n.version === '0.5.11');
  assert.ok(v, '0.5.11 is there');
  assert.equal(NEWS[0], v, '0.5.11 is first');
  const all = v.items.map((i) => i.text).join('\n');
  for (const [what, re] of [['the app only', /^in the app, O plays/m], ['Chrome or Edge', /Chrome or Edge/], ['Shift+O', /Shift\+O opens the live code/], ['one folder', /one folder per song/], ['the pause', /while the song is paused/], ['the kick', /kick line comes back sooner/], ['the glass blob', /glass blob follows your hands/]]) assert.match(all, re, what);
  assert.doesNotMatch(all, /strongest/, 'no "strongest" claim');
  for (const i of v.items) assert.ok(i.act || i.key, `each line has a key or an action: ${i.text.slice(0, 40)}`);
});
