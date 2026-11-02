// The lanes background (V, renderer/lanes.js) and its place among the page's layers (the review of Nov 1, D2 3, 4 and 6):
// - Q dims the backgrounds and C's camera shows through them by rules in style.css that name each background's canvas, and lanes,
//   opaque and drawn over the camera's layers, was named in neither, so Q did not dim it and C showed nothing of you;
// - the glass blob and the not-responding drop effect's window show the page's layers (LAYERS in app.js), and lanes was not one;
// - lanes had nothing for a lost graphics context (every other background has), so after a GPU reset it stayed black until a restart,
//   and no clear(), so the buffer of its canvas, the size of the window, was never freed once another background was picked.
// The context tests run lanes against a stand-in graphics context that draws nothing and can be lost and restored as a real one is.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// (read with LF line endings: a Windows checkout's CRLF would turn the \n these patterns look for into two characters)
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const html = read('renderer/index.html'), app = read('renderer/app.js'), css = read('renderer/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
// the page's canvases, bottom first, and the backgrounds among them: what lies between the camera's layers and the wait field
const canvases = [...html.matchAll(/<canvas id="(\w+)"/g)].map((m) => m[1]);
const backgrounds = canvases.slice(canvases.indexOf('dotcam') + 1, canvases.indexOf('wait'));

// the rule whose selector list has `selector`: { selectors, body }
function ruleOf(selector) {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim());
    if (selectors.includes(selector)) return { selectors, body: m[2].trim() };
  }
  return null;
}

test('the hush (Q) dims lanes with the other backgrounds, and with the camera on (C) it lets you show through, as they do', () => {
  assert.ok(backgrounds.includes('lanes') && backgrounds.includes('scenery'), backgrounds.join());
  const hush = ruleOf('body.hushed #scenery'), camera = ruleOf('body.cam-on:not(.cam-cut) #scenery');
  assert.ok(hush && camera, 'the two rules are there');
  assert.equal(hush.body, 'opacity: .3;');
  assert.equal(camera.body, 'opacity: .6;');
  for (const id of backgrounds) assert.ok(hush.selectors.includes(`body.hushed #${id}`), `the hush dims #${id}`);
  assert.ok(camera.selectors.includes('body.cam-on:not(.cam-cut) #lanes'), 'the camera shows through #lanes');
});

test('the glass and the not-responding window show lanes with the other backgrounds: it is in LAYERS, in the page\'s order, and so in STORM_LAYERS', () => {
  const layers = [...app.match(/const LAYERS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  for (const id of backgrounds) assert.ok(layers.includes(id), `#${id} is a layer`);
  assert.equal(layers[layers.indexOf('scenery') + 1], 'lanes', 'after the scenery, as the page has it');
  assert.deepEqual(layers, [...layers].sort((a, b) => canvases.indexOf(a) - canvases.indexOf(b)), 'bottom first, as the page stacks them');
  assert.match(app, /const STORM_LAYERS = \[\.\.\.LAYERS, \$\('glass'\)\];/);
});

// ---------------------------------------------------------------- the graphics context, and the canvas

// what lanes reads of the page as it draws
globalThis.innerWidth = 640; globalThis.innerHeight = 480; globalThis.devicePixelRatio = 1;
const { createLanes } = await import('../renderer/lanes.js');

// A context that can be lost and restored as a real one is: while it is lost its calls do nothing and make nothing (a shader or program
// asked for comes back null, and what is asked about it comes back null too), and what was made before it was lost is gone for good, so
// a draw with an old program puts nothing on the screen. `seen.drawn` counts the draws that would have.
function rig() {
  const seen = { drawn: 0, lost: false, generation: 0, prevented: 0, handlers: {} };
  let used = null;
  const methods = {
    isContextLost: () => seen.lost,
    createShader: () => (seen.lost ? null : { generation: seen.generation }),
    createProgram: () => (seen.lost ? null : { generation: seen.generation }),
    getShaderParameter: (shader) => (shader ? true : null),
    getProgramParameter: (program) => (program ? true : null),
    getShaderInfoLog: () => 'the context is lost',
    getProgramInfoLog: () => 'the context is lost',
    useProgram: (program) => { used = program; },
    drawArrays: () => { if (!seen.lost && used && used.generation === seen.generation) seen.drawn++; },
  };
  const gl = new Proxy({}, { get: (_, name) => (typeof name !== 'string' ? undefined : /^[A-Z][A-Z0-9_]*$/.test(name) ? name : methods[name] || (() => undefined)) });
  const canvas = { width: 300, height: 150, addEventListener: (type, fn) => (seen.handlers[type] ||= []).push(fn), getContext: () => gl };
  const fire = (type) => { for (const fn of seen.handlers[type] || []) fn({ preventDefault: () => seen.prevented++ }); };
  return {
    canvas, seen, lanes: createLanes(canvas),
    lose() { seen.lost = true; seen.generation++; fire('webglcontextlost'); },
    restore() { seen.lost = false; fire('webglcontextrestored'); },
  };
}
// an engine with a beat and every part playing, and a theme
const eng = { stepAt: (t) => t * 2, silent: false, present: () => true, lastDrop: undefined, v: { bd: { shown: [], lastHit: { t: 0 } }, sd: {}, hhc: {}, hho: {}, bass: {} } };
const col = { bg: [0, 0, 0], fg: [255, 255, 255], accent: [255, 0, 0] };

test('a lost context is waited out and the lanes are built again when it comes back: they do not stay black, nor give up', () => {
  const { lanes, seen, lose, restore } = rig();
  lanes.draw(1, eng, col, 0);
  assert.equal(seen.drawn, 1, 'drawn at first');
  lose();
  assert.equal(seen.prevented, 1, 'the loss is let be (preventDefault), so the context can come back');
  lanes.draw(2, eng, col, 0);
  assert.equal(lanes.broken, false, 'a frame while it is lost is no reason to give up on it');
  assert.equal(seen.drawn, 1, 'and draws nothing');
  restore();
  lanes.draw(3, eng, col, 0);
  assert.equal(seen.drawn, 2, 'back, it draws again');
  assert.equal(lanes.broken, false);
});

test('another background picked frees the lanes\' window-sized buffer, and lanes picked again sizes it to the window again', () => {
  const { lanes, canvas } = rig();
  lanes.draw(1, eng, col, 0);
  assert.deepEqual([canvas.width, canvas.height], [640, 480], 'the window\'s size');
  lanes.clear();
  assert.deepEqual([canvas.width, canvas.height], [1, 1], 'freed');
  lanes.draw(2, eng, col, 0);
  assert.deepEqual([canvas.width, canvas.height], [640, 480], 'the window\'s size again');
});

test('setVisual lets lanes go when another background is picked, as it does the others', () => {
  const setVisual = app.slice(app.indexOf('function setVisual('), app.indexOf('\n}\n', app.indexOf('function setVisual(')));
  assert.match(setVisual, /\['scenery', scenery\], \['lanes', lanes\], \['fire', fire\]\]\) if \(mode !== name\) v\.clear\(\);/);
});
