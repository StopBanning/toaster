import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LANGUAGES, say, sayKey, setLang, language } from '../renderer/gamewords.js';
import { G, cellsOf, pixelCovers, pixelText, textW, fitText, fitPixel, ptextC, lcdTop, lcdBottom, vfdTop, vfdBottom } from '../renderer/gameskins.js';
import { paintBoot, paintIdle } from '../renderer/gameboot.js';

test('the 0.4.23 Japanese table and every original pixel glyph retain their exact contents', () => {
  const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(LANGUAGES.ja), '7fdf107f6c964bc5c2de2af65f461a8c6f67568364c98bb50626e42d69aa4b3c');
  const additions = new Set([...'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇØÆŒß¿¡«»…']);
  assert.equal(hash(Object.fromEntries(Object.entries(G).filter(([ch]) => !additions.has(ch)))),
    'dbb98a85b382f2024c471aa77c1301895e30b3af501af25c663df1a5ee5f4980');
});

test('browser language uses the registered exact tag, then base language, then English; Japan is pinned', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const win = globalThis.window;
  try {
    globalThis.window = {};
    for (const [locale, expected] of [['es-ES', 'es'], ['ES-mx', 'es'], ['ja-JP', 'ja'], ['fr-FR', 'en'], ['', 'en']]) {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: locale } });
      setLang(''); assert.equal(language(), expected);
    }
    LANGUAGES['es-mx'] = { KICK: 'PRUEBA' };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'es-MX' } });
    assert.equal(say('KICK'), 'PRUEBA'); delete LANGUAGES['es-mx'];
    window.__gameLang = 'es'; setLang('ja'); assert.equal(say('KICK'), 'キック');
    setLang(''); assert.equal(say('KICK'), 'BOM.');
    assert.equal(sayKey('F# MINOR'), 'F# MENOR');
    assert.equal(sayKey('KEY ?'), 'TONO ?');
    assert.equal(say('unregistered key'), 'unregistered key');
  } finally {
    delete LANGUAGES['es-mx']; setLang('');
    if (original) Object.defineProperty(globalThis, 'navigator', original); else delete globalThis.navigator;
    if (win === undefined) delete globalThis.window; else globalThis.window = win;
  }
});

test('Spanish covers every Japanese source key and every extra skin label', () => {
  for (const key of [...Object.keys(LANGUAGES.ja), 'FEVER', 'LISTENING', 'STREAK']) assert.ok(LANGUAGES.es[key], key);
  for (const key of ['KICK', 'CLAP', 'HATS', 'HAT', 'OPEN', 'BASS']) assert.ok(textW(LANGUAGES.es[key]) <= 23, key);
});

test('every word in every language is drawable, including lowercase and decomposed accents', () => {
  for (const [lang, table] of Object.entries(LANGUAGES)) {
    for (const [key, value] of Object.entries(table)) {
      assert.ok(pixelCovers(value), `${lang}: ${key} = ${value}`);
      assert.ok(pixelCovers(value.toUpperCase()), `${lang}: uppercase ${key}`);
    }
  }
  // English is the source vocabulary, including the strings used in older skins.
  for (const key of new Set(Object.values(LANGUAGES).flatMap(Object.keys))) assert.ok(pixelCovers(key), key);
  const additions = 'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇØÆŒß¿¡«»';
  for (const ch of additions) {
    assert.ok(pixelCovers(ch.toLowerCase()), ch);
    assert.equal(G[ch].split(' ').length, 7, ch);
    assert.ok(G[ch].split(' ').every((row) => /^[01]{5}$/.test(row)), ch);
  }
  assert.equal(cellsOf('CANCIO\u0301N'), 'CANCIÓN');
  assert.equal(textW('CANCIÓN'), textW('CANCION'));
  assert.notEqual(G['Å'], G['Â']);
});

test('unknown pixel letters use title-style fallback; clipping always announces a missing end', () => {
  setLang('es');
  assert.equal(pixelText('夜に駆ける🦋'), 'SUENA AHORA');
  assert.equal(pixelText('AB夜CD'), 'ABCD');
  assert.equal(pixelText('  A'), '  A'); // boot title indentation stays intact
  const centered = pixelCanvas(124, 93);
  ptextC(centered, '夜', 62, 10, '#fff');
  assert.deepEqual(centered.failures, [], 'fallback is centered using its own width');
  for (const [text, room, result] of [['UNO DOS TRES', 9, 'UNO DOS…'], ['ABCDEFGHIJ', 5, 'ABCD…'], ['UNO', 3, 'UNO'], ['UNO', 0, '']]) {
    assert.equal(fitText(text, room, (s) => s.length), result);
  }
  for (const text of ['CANCIÓN MUY LARGA', 'クラップクラップクラップ', 'SUPERLARGAPALABRA', '夜']) {
    const fitted = fitPixel(text, 59); assert.ok(textW(fitted) <= 59, fitted); assert.ok(pixelCovers(fitted), fitted);
  }
  setLang('');
});

const palette = { bg: [0, 0, 0], fg: [255, 255, 255], dim: [128, 128, 128], hi: [255, 0, 0], ok: [0, 255, 0],
  emblem: Object.fromEntries([...'abcdefghi'].map((ch) => [ch, [255, 255, 255]])) };
const info = { title: 'CANCIÓN DEL SOL', bpm: 120, key: 'A MINOR', parts: { kick: true, clap: true, hats: true, bass: true } };
function pixelCanvas(w, h) {
  const failures = [];
  return { canvas: { width: w, height: h }, failures,
    fillRect(x, y, width, height) { if (x < 0 || y < 0 || x + width > w || y + height > h) failures.push([x, y, width, height]); },
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
  };
}
test('actual boot, standby, LCD and VFD words fit the smallest 200x340 mini-player screens', () => {
  // Metal screen: floor(124.745...) x floor(93.559...). Also exercise the normal 150px low canvas.
  for (const lang of Object.keys(LANGUAGES)) for (const [w, h] of [[124, 93], [150, 112]]) {
    setLang(lang);
    for (const which of ['top', 'bottom']) {
      const c = pixelCanvas(w, h);
      paintBoot(c, w, h, which, 1.5, palette, info);
      assert.deepEqual(c.failures, [], `${lang} boot ${which} ${w}`);
      for (const mode of ['insert', 'reading', 'continue']) for (const t of [0, 5, 11, 13]) {
        const c = pixelCanvas(w, h); paintIdle(c, w, h, which, t, palette, info, mode);
        assert.deepEqual(c.failures, [], `${lang} ${mode} ${which} ${w} at ${t}`);
      }
    }
    const m = { t: 0, fever: 0, score: 1234, bpm: 120, combo: 12, comboPulse: 0, notes: [], bursts: [], hit: [0, 0, 0, 0],
      title: 'SOL', keyName: 'A MINOR', judge: { text: 'PERFECT', age: 0.1 },
      pads: ['KICK', 'CLAP', 'HAT', 'OPEN', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((label, i) => ({ label, drum: i < 4, lane: i % 4, lit: 0, inKey: true })) };
    for (const paint of [lcdTop, lcdBottom, vfdTop, vfdBottom]) {
      const c = pixelCanvas(w, h); paint(c, w, h, m);
      assert.deepEqual(c.failures, [], `${lang} ${paint.name} ${w}`);
    }
  }
  setLang('');
});
