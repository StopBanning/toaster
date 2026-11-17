// What's new for 0.5.8 (renderer/news.js) says what the release does: the sweep, Nov 16 (finding 8), found the live bass by the 16th and the paused-song fix missing from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS } from '../renderer/news.js';

test("0.5.8's what's new names X's rebuild, the tune, the memory, the live bass by the 16th and the paused song", () => {
  const v = NEWS.find((n) => n.version === '0.5.8');
  assert.ok(v, '0.5.8 is there');
  const all = v.items.map((i) => i.text).join('\n');
  for (const [what, re] of [['the rebuild', /Demucs/], ['the tune from the voice', /singer's voice/], ['the memory', /remembers a song/], ['the bass by the 16th', /bass line.*by the 16th/], ['the paused song', /paused in Spotify or Music is no longer named/]]) assert.match(all, re, what);
  for (const i of v.items) assert.ok(i.act || i.key, `each line has a key or an action: ${i.text.slice(0, 40)}`);
});
