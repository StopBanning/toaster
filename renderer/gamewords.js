// The handheld's words in Japanese, for the Japan edition (its device's lang, or window.__gameLang = 'ja'): the lanes, the pads,
// the judgements, the bar's labels and the key's mode in katakana, as a game made for Japan has them. Numbers, note
// names and a song's own title stay as they are; the letters go in M PLUS 1 Code (renderer/fonts, OFL), a mono face
// with the katakana, so the screens keep one face.
const JA = {
  KICK: 'キック', CLAP: 'クラップ', HATS: 'ハット', HAT: 'ハット', OPEN: 'オープン', BASS: 'ベース',
  SCORE: 'スコア', COMBO: 'コンボ', BPM: 'BPM', 'FEVER ×2': 'フィーバー ×2', 'FEVER x2': 'フィーバー ×2', 'FEVER×2': 'フィーバー×2',
  PERFECT: 'パーフェクト', GREAT: 'グレート', GOOD: 'グッド', MISS: 'ミス', MINOR: 'マイナー', MAJOR: 'メジャー',
  'KEY ?': 'キー ?', 'listening…': 'リスニング…', 'TOASTER CART': 'トースターカート',
  // (the power-on's, gameboot.js: in the pixel font's katakana)
  TOASTER: 'トースター', 'TOASTER OS': 'トースター OS', 'PRESS START': 'プッシュ スタート', 'now playing': 'ナウ プレイング',
  // (its standing by, all in katakana as an old Famicom's text: "play a song, ok?", "loading", "searching for the beat")
  'PLAY ANY SONG': 'キョクヲ カケテネ', 'CONTINUE?': 'コンティニュー?', 'GAME OVER': 'ゲームオーバー', READING: 'ヨミコミチュウ',
  'FINDING THE BEAT': 'ビート サーチチュウ', 'NO SIGNAL': 'ノー シグナル',
};
let lang = '';
export function setLang(l) { lang = l || ''; } // (game.js, each frame: the shown device's)
export const ja = () => lang === 'ja' || (typeof window !== 'undefined' && window.__gameLang === 'ja');
export const say = (w) => (ja() && JA[w]) || w;
// a key's name as the game shows it ("A MINOR"): its note as it is, its mode in the edition's words
export const sayKey = (k) => (ja() ? String(k).replace(/MINOR|MAJOR/g, (w) => JA[w]) : k);
// the screens' face: JetBrains Mono, or for the Japan edition M PLUS 1 Code (its letters and katakana both)
export const screenFont = (latin) => (ja() ? '"M PLUS 1 Code", ' + latin : latin);
export const JA_WORDS = Object.values(JA).join('');
