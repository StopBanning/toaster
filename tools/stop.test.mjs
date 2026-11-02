// Stop stops (the review of Nov 1, D2 5): after a source is stopped the engine goes on listening, to nothing, till it hears the
// silence (its frames ran only while a source was attached, so the tempo stayed locked and not silent, and the rings, the
// scenery's walk and the chrome beat on to a song that stopped); both stops end the drop effects; a fresh start ends the storm
// as well as the takeovers (XP's and the y2k bug's).
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const body = (name) => { const i = app.indexOf(`function ${name}(`); return app.slice(i, app.indexOf('\n}\n', i)); };

test('after a stop the engine hears the silence; the stops end the drop effects; a fresh start ends the storm too', () => {
  assert.match(app, /if \(state\.node \|\| \(eng\.tempo\.locked && !eng\.silent\)\) eng\.frame\(t, ac\.currentTime\);/);
  for (const name of ['stopSource', 'stopPlayback']) assert.match(body(name), /detach\(\);\n  takeover\.stop\(\); y2k\.stop\(\); storm\.stop\(\);/, name);
  assert.match(body('freshStart'), /takeover\.stop\(\);\n  y2k\.stop\(\);\n  storm\.stop\(\);/);
});
