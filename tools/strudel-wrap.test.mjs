// The exported Strudel code's long note strings (tape.js songStrudelShortest, the writer the export uses: tape-worker.js). strudel.cc
// reads every "..." literal as a pattern of its own, so a long string cut into "a b" + "c d" played one note named
// [object Object][object Object], and a cut before an @ was a parse error (measured on strudel.cc, Nov 11: the melody's longer lines
// were the first to be cut). Long strings now go inside backticks, broken between tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songStrudelCompact, songStrudelShortest } from '../renderer/tape.js';

// eight bars of a 16th-note lead that changes every bar, long enough to wrap; and lengths finer than a 16th (a melody's)
function song({ fine = false } = {}) {
  const bars = Array.from({ length: 8 }, (_, i) => ({
    parts: {}, chord: null, bass: null,
    events: Array.from({ length: fine ? 24 : 16 }, (_, s) => {
      const step = fine ? s * (64 / 24) : s * 4; // (in 64ths)
      return { part: 'lead', pitch: 60 + ((s * 7 + i * 5) % 12), onset: Math.round(step) / 64, duration: fine ? 2 / 64 : 4 / 64, velocity: 90 };
    }),
  }));
  return { bpm: 120, bars };
}

// (the export keeps the shorter of the exact layout, which writes each phrase whole, and the compact one, with its voices, which
// wraps: real songs come out compact; the wrapping is the compact writer's)
test('a long note string is wrapped inside backticks between its tokens, never as "..." + "..."', () => {
  for (const fine of [false, true]) {
    const code = songStrudelCompact(song({ fine }), 'test');
    assert.doesNotMatch(code, /"\s*\+\s*\n\s*"/, 'no joined double-quoted pieces');
    const strings = [...code.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
    // (16ths alone stay under the wrapping length; a melody's finer lengths, with their weights, go over it, as Starships' did)
    if (fine) assert.ok(strings.length > 0, 'a string was long enough to wrap');
    for (const s of strings) {
      assert.ok(s.includes('\n'), 'a wrapped string is on more than one line');
      for (const token of s.split(/\s+/).filter(Boolean)) assert.doesNotMatch(token, /^@/, 'no token starts with a weight (a cut inside a token)');
    }
  }
});

test('the wrapped string holds exactly the tokens the unwrapped one would, and the export never joins quoted pieces', () => {
  const code = songStrudelCompact(song({ fine: true }), 'test');
  assert.doesNotMatch(songStrudelShortest(song({ fine: true }), 'test'), /"\s*\+\s*\n\s*"/);
  for (const m of code.matchAll(/`([^`]*)`/g)) {
    const tokens = m[1].split(/\s+/).filter(Boolean);
    assert.ok(tokens.every((t) => /^(~|[a-g][#b]?-?\d+|\[[^\]]+\])(@[\d.]+)?$/i.test(t)), 'every token is a note, a rest or a chord, with its weight: ' + tokens.join(' '));
  }
});
