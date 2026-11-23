// iPhone Safari's silent switch mutes Web Audio unless the page sets navigator.audioSession.type = 'playback'
// (Safari 17). The demo beat, a file and the radio set it when picked; opening the mic sets 'auto' again (a playback
// session can't record). Reported on r/InternetIsBeautiful, Nov 22: the demo was silent on a muted iPhone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'renderer/app.js'), 'utf8').replace(/\r\n/g, '\n');
const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}', i)); };

test('the helper sets the type only where the browser has audioSession, and never throws', () => {
  const line = src.split('\n').find((l) => l.startsWith('const audioSession = '));
  assert.ok(line, 'audioSession helper');
  const make = new Function('navigator', `${line}; return audioSession;`);
  const nav = { audioSession: { type: 'auto' } };
  make(nav)('playback');
  assert.equal(nav.audioSession.type, 'playback');
  make(nav)('auto');
  assert.equal(nav.audioSession.type, 'auto');
  assert.doesNotThrow(() => make({})('playback'));   // Chrome, Firefox, older Safari
  const angry = { audioSession: { get type() { return 'auto'; }, set type(v) { throw new Error('no'); } } };
  assert.doesNotThrow(() => make(angry)('playback'));
});

test('the demo, a file and the radio ask for playback before resuming; the mic asks for auto first', () => {
  for (const head of ['async function useDemo()', 'async function playElement(']) {
    const b = body(head);
    assert.ok(b.includes("audioSession('playback')"), head);
    assert.ok(b.indexOf("audioSession('playback')") < b.indexOf('ac.resume()'), `${head}: inside the tap, before resume`);
  }
  const mic = body('const openMic = async');
  assert.ok(mic.indexOf("audioSession('auto')") >= 0 && mic.indexOf("audioSession('auto')") < mic.indexOf('getUserMedia'), 'openMic');
});
