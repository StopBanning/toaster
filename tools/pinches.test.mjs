import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinches } from '../renderer/pinches.js';

// a hand as the portal passes it: where thumb and index meet, the hand's size, pinched or not, and how far apart thumb and
// index are (as a share of the hand's size)
const hand = (pinched, open = pinched ? 0.2 : 0.8, p = [500, 500], who = -1) => ({ p, s: 100, pinched, open, who });
// frames at 60 a second from t0 to t1, the hands from f(t): the times a look was asked for
function run(pz, t0, t1, f) {
  const looks = [];
  for (let n = 0, t = t0; t <= t1 + 1e-9; n++, t = t0 + n / 60) if (pz.update(t, f(t))) looks.push(+t.toFixed(3));
  return looks;
}

test('a pinch held a moment brings one look, 0.2 s in, and holding it on brings no more', () => {
  const looks = run(createPinches(), 0, 2, () => [hand(true)]);
  assert.equal(looks.length, 1);
  assert.ok(looks[0] >= 0.2 && looks[0] < 0.22, String(looks));
});

test('relaxed fingers drifting across the line bring nothing (in Colin\'s recording the looks flipped every half second)', () => {
  // touching 0.1 s, apart 0.1 s (not open: 0.4 of the hand), over and over for 5 s; and at 0.15 s touches
  assert.deepEqual(run(createPinches(), 0, 5, (t) => [hand(Math.floor(t * 10) % 2 === 0, 0.4)]), []);
  assert.deepEqual(run(createPinches(), 0, 5, (t) => [hand(Math.floor(t / 0.15) % 2 === 0, 0.5)]), []);
});

test('a pinch that counts within a second of a look brings nothing, then or later', () => {
  // pinch to 0.4 (a look at 0.2), let go wide open, pinch again at 0.6 and hold on to 3 s
  const looks = run(createPinches(), 0, 3, (t) => [t < 0.4 ? hand(true) : t < 0.6 ? hand(false, 0.9) : hand(true)]);
  assert.equal(looks.length, 1, String(looks));
});

test('the next look needs the pinch let go (thumb and index well apart), and the gap gone by', () => {
  const near = run(createPinches(), 0, 4, (t) => [t < 1.5 ? hand(true) : t < 1.7 ? hand(false, 0.45) : hand(true)]);
  assert.equal(near.length, 1, 'not open enough: still the same pinch');
  const apart = run(createPinches(), 0, 4, (t) => [t < 1.5 ? hand(true) : t < 1.7 ? hand(false, 0.9) : hand(true)]);
  assert.equal(apart.length, 2, String(apart));
  assert.ok(apart[1] >= 1.9 && apart[1] < 1.92, String(apart));
});

test('a pinch the tracker loses for a moment is the same pinch; one gone 0.3 s is let go', () => {
  assert.equal(run(createPinches(), 0, 2, (t) => (t >= 0.5 && t < 0.6 ? [] : [hand(true)])).length, 1);
  assert.equal(run(createPinches(), 0, 3, (t) => (t >= 0.5 && t < 1.4 ? [] : [hand(true)])).length, 2);
});

test('two hands pinching together bring one look; the other hand let go and pinching again brings the next', () => {
  const L = [300, 500], R = [700, 500];
  const looks = run(createPinches(), 0, 3, (t) => {
    const right = t < 1.5 || t >= 1.8;
    return [hand(true, 0.2, L, 0), hand(right, right ? 0.2 : 0.9, R, 1)];
  });
  assert.equal(looks.length, 2, String(looks));
  assert.ok(looks[0] < 0.22 && looks[1] >= 2.0 && looks[1] < 2.02, String(looks));
});

test('reset forgets the pinches and the gap (the window shut)', () => {
  const pz = createPinches();
  assert.equal(run(pz, 0, 0.5, () => [hand(true)]).length, 1);
  pz.reset();
  assert.equal(run(pz, 0.6, 1, () => [hand(true)]).length, 1);
});
