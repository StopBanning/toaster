// The camera, mirrored or not (renderer/camview.js, and the help's "Mirror the camera"): where the picture's
// points land, what a close-up copies from the video, how the person mask is read, and the setting itself
// (the default, an older profile, saved, loaded, in the help and in Ctrl+K). Mirrored must be exactly as it was.
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMirror, pictureMap, toPicture, place, cropFrom, maskU, frameU } from '../renderer/camview.js';

const read = (f) => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8');
const app = read('app.js'), html = read('index.html'), news = read('news.js'), visuals = read('visuals.js'), dots = read('dotcam.js'), voxels = read('voxcam.js'), portal = read('portal.js');

// the formulas as they were in 0.4.26 (renderer/visuals.js), written out as they were, with the picture always mirrored
const was = {
  map: (sw, sh, vw, vh) => { const scale = Math.max(sw / vw, sh / vh); return { sw, sh, scale, ox: (sw - vw * scale) / 2, oy: (sh - vh * scale) / 2 }; },
  place: ({ sw, sh, scale, ox, oy }, r, vw, vh, nx, ny) => { const xs = sw - (ox + nx * vw * scale), ys = oy + ny * vh * scale; return [r.x + (xs * r.w) / sw, r.y + (ys * r.h) / sh]; },
  toPicture: ({ sw, sh, scale, ox, oy }, vw, vh, nx, ny) => [(sw - (ox + nx * vw * scale)) / sw, (oy + ny * vh * scale) / sh],
  crop: ({ sw, sh, ox, oy, scale }, r) => { const x0 = r.x * sw, x1 = (r.x + r.w) * sw, y0 = r.y * sh, y1 = (r.y + r.h) * sh; return [(sw - x1 - ox) / scale, (y0 - oy) / scale, (x1 - x0) / scale, (y1 - y0) / scale]; },
  mask: ({ sw, scale, ox }, vw, x) => (sw - x - 0.5 - ox) / scale / vw,
};
// the pictures it's cut to (a wide window, a flat one, a tall one) over wide, 4:3 and upright cameras
const SHAPES = [[256, 144, 1280, 720], [256, 108, 1280, 720], [256, 400, 640, 480], [256, 144, 480, 640], [256, 256, 1920, 1080]];
const POINTS = [[0, 0], [1, 1], [0.5, 0.5], [0.2, 0.7], [0.93, 0.11], [0.31, 0.99]];
const RECTS = [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, { x: 0, y: 0, w: 1, h: 1 }, { x: 0.62, y: 0.05, w: 0.25, h: 0.5 }];
const ON_SCREEN = { x: 40, y: 12, w: 640, h: 360 };

test('mirrored (the default) is exactly as it was: the map, the places, the close-ups and the mask lookup', () => {
  for (const [sw, sh, vw, vh] of SHAPES) {
    const m = pictureMap(sw, sh, vw, vh, true), old = was.map(sw, sh, vw, vh);
    assert.deepEqual(m, { ...old, mirror: true });
    assert.deepEqual(pictureMap(sw, sh, vw, vh), m, 'no flag given: mirrored');
    for (const [nx, ny] of POINTS) {
      assert.deepEqual(place(m, ON_SCREEN, vw, vh, nx, ny), was.place(old, ON_SCREEN, vw, vh, nx, ny));
      assert.deepEqual(toPicture(m, vw, vh, nx, ny), was.toPicture(old, vw, vh, nx, ny));
    }
    for (const r of RECTS) {
      const c = cropFrom(m, r);
      assert.deepEqual([c.x, c.y, c.w, c.h], was.crop(old, r));
      assert.equal(c.flip, true, 'the close-up is drawn flipped, as before');
    }
    for (let x = 0; x < sw; x += 7) assert.equal(maskU(m, vw, x), was.mask(old, vw, x));
  }
});

test('not mirrored: the picture is the camera\'s own, so writing in front of it reads left to right', () => {
  const [vw, vh] = [1280, 720], m = pictureMap(256, 144, vw, vh, false), mm = pictureMap(256, 144, vw, vh, true);
  // an "A" a fifth of the way across the camera's frame, a "B" two fifths: in front of the lens they read A B
  const a = place(m, ON_SCREEN, vw, vh, 0.2, 0.5), b = place(m, ON_SCREEN, vw, vh, 0.4, 0.5);
  assert.ok(a[0] < b[0], 'A is left of B, as the camera sees them');
  assert.equal(a[1], b[1]);
  // mirrored, as a mirror shows it, they swap
  assert.ok(place(mm, ON_SCREEN, vw, vh, 0.2, 0.5)[0] > place(mm, ON_SCREEN, vw, vh, 0.4, 0.5)[0]);
  // where the frame fills the picture, a point is where it is in the frame (mirrored: across from it)
  for (const [nx, ny] of POINTS) {
    const [px, py] = toPicture(m, vw, vh, nx, ny), [qx, qy] = toPicture(mm, vw, vh, nx, ny);
    assert.ok(Math.abs(px - nx) < 1e-12 && Math.abs(py - ny) < 1e-12);
    assert.ok(Math.abs(qx - (1 - nx)) < 1e-12 && Math.abs(qy - ny) < 1e-12);
  }
});

test('not mirrored: the places, the close-ups and the mask lookup agree with each other, cropped or not', () => {
  for (const mirror of [true, false]) {
    for (const [sw, sh, vw, vh] of SHAPES) {
      const m = pictureMap(sw, sh, vw, vh, mirror);
      for (const [nx, ny] of POINTS) {
        // the point on screen and as 0-1 of the picture are the same place
        const [px, py] = toPicture(m, vw, vh, nx, ny), [x, y] = place(m, ON_SCREEN, vw, vh, nx, ny);
        assert.ok(Math.abs(x - (ON_SCREEN.x + px * ON_SCREEN.w)) < 1e-9 && Math.abs(y - (ON_SCREEN.y + py * ON_SCREEN.h)) < 1e-9);
        // a thin slice of the picture round it comes from the camera's frame round the same point (the flip is the close-up's)
        if (px > 0.02 && px < 0.98 && py > 0.02 && py < 0.98) {
          const c = cropFrom(m, { x: px - 0.01, y: py - 0.01, w: 0.02, h: 0.02 });
          assert.ok(Math.abs(c.x + c.w / 2 - nx * vw) < 1e-6 && Math.abs(c.y + c.h / 2 - ny * vh) < 1e-6, `${mirror} ${sw}x${sh} ${nx},${ny}`);
          assert.equal(c.flip, mirror);
        }
        // the person mask (the camera's own frame) is read at the same column of the picture that the point is drawn at
        const column = px * sw - 0.5;
        assert.ok(Math.abs(maskU(m, vw, column) - nx) < 1e-9, `${mirror} mask ${nx}`);
      }
    }
  }
});

test('the voxels and dots look a column of the camera up by the picture\'s flag', () => {
  assert.equal(frameU(true, 0.3), 1 - 0.3);
  assert.equal(frameU(false, 0.3), 0.3);
  for (const u of [0, 0.125, 0.5, 0.875, 1]) assert.equal(frameU(true, u), 1 - u);
  // the shader's own flip is a uniform, and the voxels' sample canvas is drawn flipped only when asked
  assert.match(dots, /uniform float cell, pulse, hue, hasMask, mirror;/);
  assert.match(dots, /vec2 cu = vec2\(mirror > 0\.5 \? 1\.0 - v\.x : v\.x, 1\.0 - v\.y\);/);
  assert.match(dots, /gl\.uniform1f\(U\(P\.dots, 'mirror'\), mirror \? 1 : 0\);/);
  assert.match(voxels, /pcx\.setTransform\(mirror \? -1 : 1, 0, 0, 1, mirror \? COLS : 0, 0\);/);
  assert.match(voxels, /const u = frameU\(mirror, \(pc \+ 0\.5 - ox\) \/ dw\)/);
  // (no flip of its own left over in either)
  assert.doesNotMatch(dots, /vec2\(1\.0 - v\.x/);
  assert.doesNotMatch(voxels, /setTransform\(-1, 0, 0, 1, COLS, 0\)/);
});

test('the portal\'s skull and the camera layer follow the flag, and nothing else flips the camera', () => {
  assert.match(portal, /uniform float mir;/);
  assert.match(portal, /vP = vec2\(at\.x \+ \(mir > 0\.5 \? -q\.x : q\.x\) \* px, at\.y - q\.y \* px\);/);
  assert.match(portal, /gl\.uniform1f\(L\.mir, mirrored \? 1 : 0\);/);
  // the camera layer's picture is drawn flipped only when it's mirrored, and its places come from camview.js
  assert.match(visuals, /if \(map\.mirror\) \{\s*sctx\.translate\(sw, 0\);\s*sctx\.scale\(-1, 1\);\s*\}/);
  assert.match(visuals, /import \{ pictureMap, toPicture, place, cropFrom, maskU \} from '\.\/camview\.js';/);
  assert.match(visuals, /get mirrored\(\) \{ return mirror; \}/);
  assert.match(visuals, /setMirror\(on\) \{ mirror = on !== false; hist\.length = 0; moshOut = see = null; \}/);
  assert.doesNotMatch(visuals, /sw - x - 0\.5 - ox/);
  // the three that draw from the camera get the flag from app.js
  assert.match(app, /dotCam\.draw\(t, \{[^}]*mirror: cam\.mirrored/);
  assert.match(app, /voxCam\.draw\(t, \{[^}]*mirror: cam\.mirrored/);
  assert.match(app, /const where = \{[^}]*mirror: cam\.mirrored/);
});

test('the setting: mirrored unless saved as not, and an older profile (none saved) loads mirrored', () => {
  assert.equal(readMirror(undefined), true, 'an older profile has none');
  assert.equal(readMirror(true), true);
  assert.equal(readMirror(false), false);
  for (const junk of [null, 0, 1, '', 'false', 'no', {}, []]) assert.equal(readMirror(junk), true, `${JSON.stringify(junk)} is not a no`);
  // the default, saved with the other settings, read back through readMirror, applied at the start
  assert.match(app, /^  mirror: true,/m);
  assert.match(app, /const SAVED = \[[^\]]*'updates', 'mirror',/);
  assert.match(app, /state\.mirror = readMirror\(state\.mirror\);/);
  assert.match(app, /import \{ readMirror \} from '\.\/camview\.js';/);
  assert.match(app, /setUpdates\(state\.updates\);\r?\nsetMirror\(state\.mirror\);/);
  assert.match(app, /function setMirror\(on\) \{\s*state\.mirror = on;\s*cam\.setMirror\(on\);\s*\$\('mirror'\)\.checked = on;\s*saveSettings\(\);\s*\}/);
});

test('the help has the checkbox next to Calm and Updates, and Ctrl+K sets both ways', () => {
  const calm = html.indexOf('id="calm"'), updates = html.indexOf('id="updates"'), mirror = html.indexOf('id="mirror"');
  assert.ok(calm > 0 && updates > calm && mirror > updates, 'in the help\'s settings, after Calm and Updates');
  assert.ok(mirror - updates < 600, 'right beside them');
  assert.match(html, /<label class="calm"><input type="checkbox" id="mirror" \/><span><b>Mirror the camera<\/b>: on, as a mirror shows you; off, as the camera sees it, for pointing it at your gear\.<\/span><\/label>/);
  assert.match(app, /\$\('mirror'\)\.addEventListener\('change', \(e\) => setMirror\(e\.target\.checked\)\);/);
  // Ctrl+K: "camera: mirrored" and "camera: not mirrored", each running the setter
  assert.match(app, /\['mirrored', true, \[[^\]]*\]\], \['not mirrored', false, \[[^\]]*\]\]/);
  assert.match(app, /id: 'camera:' \+ name, name: 'camera: ' \+ name, aliases,\s*run: \(\) => \{ setMirror\(on\); flashStatus\('camera: ' \+ name\); \}/);
});

test('the next version\'s news says so, in a line', () => {
  const head = news.slice(news.indexOf('export const NEWS = ['), news.indexOf("version: '0.4.26'"));
  assert.match(head, /version: '0\.4\.27'/);
  assert.match(head, /act: 'cam', text: "[^"]*Mirror the camera[^"]*"/);
  assert.equal([...head.matchAll(/Mirror the camera/g)].length, 1, 'one line'); // (other features can share the version)
});
