import { test } from 'node:test';
import assert from 'node:assert/strict';
import { say, sayKey, setLang, JA_WORDS } from '../renderer/gamewords.js';
import { textW, cellsOf, pixelCovers } from '../renderer/gameskins.js';
import { DEVICES } from '../renderer/game.js';
import { bootTitle } from '../renderer/gameboot.js';
import { readFileSync } from 'node:fs';
// (visuals.js draws on a canvas as it loads: its round of screens is read from its source)
const GAME_SCREENS = JSON.parse(readFileSync(new URL('../renderer/visuals.js', import.meta.url), 'utf8').match(/export const GAME_SCREENS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
// The handheld's Japan edition (gamewords.js): its words English unless it's the one shown, and every one of them
// drawable, in the pixel font (the power-on's) and in the screens' face (renderer/fonts/mplus1code-jp.woff2, cut down
// to Latin, all of katakana and a few marks).
test('English unless the Japan edition is shown', () => {
  setLang('');
  assert.equal(say('KICK'), 'KICK');
  assert.equal(sayKey('A MINOR'), 'A MINOR');
  setLang('ja');
  assert.equal(say('KICK'), 'キック');
  assert.equal(sayKey('F# MAJOR'), 'F# メジャー');
  assert.equal(say('C#'), 'C#'); // (note names stay as they are)
  setLang('');
});

test('a dakuten or handakuten takes a cell of its own; English is untouched', () => {
  assert.equal(cellsOf('ベース'), 'ヘ゛ース');
  assert.equal(cellsOf('クラップ'), 'クラッフ゜');
  assert.equal(cellsOf('KICK OK'), 'KICK OK');
  assert.equal(textW('KICK'), 23);
  assert.equal(textW('クラップ'), 29);
});

test("the power-on's and the standing by's Japanese is all in the pixel font", () => {
  setLang('ja');
  const words = ['TOASTER', 'TOASTER OS', 'KICK', 'CLAP', 'HATS', 'BASS', 'PRESS START', 'now playing',
    'PLAY ANY SONG', 'CONTINUE?', 'GAME OVER', 'READING', 'FINDING THE BEAT', 'NO SIGNAL'].map(say);
  words.push(sayKey('A MINOR'), sayKey('C MAJOR'), 'OK', '--', '120 BPM');
  setLang('');
  for (const w of words) assert.ok(pixelCovers(w), `no pixel letter for something in "${w}"`);
});

test("the screens' Japanese is all in the face cut for it", () => {
  const cut = /^[\x20-\x7e゠-ヿ×·…♪・ー「」！？、。]*$/u;
  assert.ok(cut.test(JA_WORDS), [...JA_WORDS].filter((ch) => !cut.test(ch)).join(' '));
});

test('A goes round to the Japan edition, which has its own handheld and speaks Japanese', () => {
  assert.ok(GAME_SCREENS.includes('jp'));
  assert.equal(DEVICES.stanceJp.lang, 'ja');
  assert.equal(DEVICES.stanceJp.dir, 'stance-jp/');
});

test("a title the pixel font can't write (hiragana, kanji) still leaves something to show", () => {
  setLang('ja');
  assert.equal(bootTitle('夜に駆ける'), 'ナウ プレイング');
  assert.equal(bootTitle('フライディ・チャイナタウン'), 'フライディ・チャイナタウン');
  assert.equal(bootTitle('FIGHT!'), 'FIGHT!');
  for (const t of ['夜に駆ける', 'Bling-Bang-Bang-Born', '']) assert.ok(pixelCovers(bootTitle(t)), t);
  setLang('');
  assert.equal(bootTitle('Romantika'), 'ROMANTIKA');
  assert.equal(bootTitle('夜に駆ける'), 'NOW PLAYING');
});
