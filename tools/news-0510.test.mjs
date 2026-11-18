// What's new for 0.5.10 (renderer/news.js): the rebuilt song's cleaner code and the sharper aurora views.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS } from '../renderer/news.js';

test("0.5.10's what's new is first and names the clean code and the sharper auroras", () => {
  const v = NEWS.find((n) => n.version === '0.5.10');
  assert.ok(v, '0.5.10 is there');
  assert.equal(NEWS[0], v, '0.5.10 is first');
  const all = v.items.map((i) => i.text).join('\n');
  for (const [what, re] of [['the bank', /\.bank\(/], ['one voice line', /every sung phrase on one line/], ['the tempo', /setcpm\(171\/8\)/], ['the auroras', /aurora views are sharper/]]) assert.match(all, re, what);
  for (const i of v.items) assert.ok(i.act || i.key, `each line has a key or an action: ${i.text.slice(0, 40)}`);
});
