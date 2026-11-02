// Seeded randomness, for anything a picture is made of.
//
// A visual that rolls dice with Math.random() at draw time looks different every time it is drawn: a frame drawn
// again (the perfect-copy export draws each frame of a take once, long after it was heard) or drawn at another frame
// rate (a 30 fps clip of what a 60 fps screen showed) comes out with other glitches, other sparkles, other typos.
// So the dice are seeded: the same seed gives the same numbers, on any machine, in any order of drawing.
//
//   mulberry32(seed)   a generator: call it for a number in [0, 1). A 32-bit state, one add and a few multiplies a
//                      number, and good enough for pictures (it is not for anything secret).
//   hash32(...parts)   several integers and strings folded into one 32-bit seed, so a seed can come from a song, a
//                      kind of dice (a salt) and a moment (a frame, a hit's time in ms) at once.
//
// clock.js puts the two together for the pages (clock.rng); a module with a stream of its own (the noodles) seeds one
// of these itself.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One round of mixing: every bit of what went in changes about half the bits that come out.
const mix = (h, x) => {
  h = Math.imul(h ^ x, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return h ^ (h >>> 16);
};

// Integers go in whole (a number past 32 bits as its two halves), other numbers to a millionth, strings by their
// characters. The order matters: hash32('a', 1) is not hash32(1, 'a').
export function hash32(...parts) {
  let h = 0x9e3779b9;
  for (const p of parts) {
    if (typeof p === 'string') {
      h = mix(h, p.length);
      for (let i = 0; i < p.length; i++) h = mix(h, p.charCodeAt(i));
    } else {
      const n = Number.isInteger(p) ? p : Math.round(p * 1e6);
      h = mix(h, n | 0);
      h = mix(h, Math.floor(n / 4294967296) | 0);
    }
  }
  return h >>> 0;
}

// Small things to do with a generator.
export const between = (rand, a, b) => a + rand() * (b - a);
export const whole = (rand, a, b) => a + Math.floor(rand() * (b - a + 1)); // a to b, both ends
export const oneOf = (rand, list) => list[Math.floor(rand() * list.length)];
