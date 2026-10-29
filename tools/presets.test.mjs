import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESETS, applyPreset } from '../renderer/presets.js';

test("the presets' names, and settings the app knows", () => {
  assert.deepEqual(PRESETS.map((p) => p.name), ['Live coding', 'Visualizer', 'Handheld', 'Japan edition', 'For TikTok']);
  const app = readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  const values = {
    visual: ['scenery'], blockLook: ['dominoes', 'game', 'blocks'], sceneryScene: ['auto'], gameScreens: ['os', 'neon', 'lcd', 'jp'],
    theme: ['bluescreen', 'blackscreen', 'terminal', 'pink', 'whitescreen'],
  };
  for (const p of PRESETS) for (const [k, v] of Object.entries(p.settings)) {
    if (values[k]) assert.ok(values[k].includes(v), k + ': ' + v);
    else assert.equal(typeof v, 'boolean');
    assert.ok(app.includes(k + ':') || app.includes(k + ','), k);
  }
});

test('every setting goes through its setter, a preset applied again does nothing, and the rest stays', async () => {
  for (const p of PRESETS) {
    const current = { source: 'file', camera: true, recording: true }, calls = [];
    const setters = Object.fromEntries(Object.keys(p.settings).map((k) => [k, (v) => { calls.push([k, v]); current[k] = v; }]));
    assert.equal(await applyPreset(p, current, setters), true);
    assert.equal(calls.length, Object.keys(p.settings).length);
    assert.equal(await applyPreset(p, current, setters), false);
    assert.equal(calls.length, Object.keys(p.settings).length);
    assert.equal(current.source, 'file');
    assert.equal(current.camera, true);
    assert.equal(current.recording, true);
  }
});

test('a layout that refuses to change stops the preset before anything else changes', async () => {
  const calls = [];
  const refusing = new Proxy({}, { get: (_t, k) => async () => { calls.push(k); return false; } });
  await assert.rejects(applyPreset(PRESETS.at(-1), {}, refusing));
  assert.deepEqual(calls, ['vertical']);
});
