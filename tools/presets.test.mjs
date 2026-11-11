import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESETS, applyPreset } from '../renderer/presets.js';

test("the presets' names, and settings the app knows", () => {
  assert.deepEqual(PRESETS.map((p) => p.name), ['Live coding', 'Visualizer', 'Orb', 'Handheld', 'Japan edition', 'For TikTok']);
  const app = readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
  const values = {
    visual: ['scenery', 'off'], blockLook: ['dominoes', 'game', 'blocks'], sceneryScene: ['auto'], gameScreens: ['os', 'neon', 'lcd', 'jp'],
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

// App defaults, with the visual/theme indices resolved as currentSetup() does.
const defaults = { visual: 'scenery', blocks: true, blockLook: 'dominoes', orb: false, codeHidden: false,
  theme: 'bluescreen', vertical: false, gameScreens: 'os', sceneryScene: 'auto' };
const settersFor = (current) => Object.fromEntries(Object.keys(defaults).map((key) => [key, (value) => { current[key] = value; }]));
// A disabled block layer has no visible look; its stored choice is deliberately left alone.
const coreLook = ({ visual, blocks, blockLook, orb, codeHidden }) => ({ visual, blocks, orb, codeHidden,
  ...(blocks ? { blockLook } : {}) });

test('each preset declares its complete core look', () => {
  assert.deepEqual(PRESETS.map((p) => coreLook(p.settings)), [
    { visual: 'scenery', blocks: true, orb: false, codeHidden: false, blockLook: 'dominoes' },
    { visual: 'scenery', blocks: true, orb: false, codeHidden: true, blockLook: 'dominoes' },
    { visual: 'off', blocks: false, orb: true, codeHidden: false },
    { visual: 'off', blocks: true, orb: false, codeHidden: false, blockLook: 'game' },
    { visual: 'off', blocks: true, orb: false, codeHidden: false, blockLook: 'game' },
    { visual: 'off', blocks: true, orb: false, codeHidden: false, blockLook: 'dominoes' },
  ]);
});

test('every ordered preset pair ends with the second preset\'s core look from defaults', async (t) => {
  for (const a of PRESETS) for (const b of PRESETS) {
    await t.test(`${a.name} → ${b.name}`, async () => {
      const direct = { ...defaults }, sequential = { ...defaults };
      await applyPreset(b, direct, settersFor(direct));
      await applyPreset(a, sequential, settersFor(sequential));
      await applyPreset(b, sequential, settersFor(sequential));
      assert.deepEqual(coreLook(sequential), coreLook(direct));
    });
  }
});

test('Orb → Live coding turns the orb off', async () => {
  const current = { ...defaults }, setters = settersFor(current);
  await applyPreset(PRESETS.find((p) => p.name === 'Orb'), current, setters);
  assert.equal(current.orb, true);
  await applyPreset(PRESETS.find((p) => p.name === 'Live coding'), current, setters);
  assert.equal(current.orb, false);
});

test('theme, layout, game screens and scenery scene change only where named', async () => {
  const personal = { theme: 'terminal', vertical: true, gameScreens: 'lcd', sceneryScene: 'lake' };
  for (const preset of PRESETS) {
    const current = { ...defaults, ...personal };
    await applyPreset(preset, current, settersFor(current));
    for (const key of Object.keys(personal)) {
      assert.equal(current[key], preset.settings[key] ?? personal[key], `${preset.name}: ${key}`);
    }
  }
});
