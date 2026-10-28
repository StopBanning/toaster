// Translate the handheld: copy ES below, translate every value, and register your table in LANGUAGES under its
// BCP 47 language code (lowercase, e.g. 'fr'). Keys are the English source strings; keep note names and numbers.
// Normal devices use navigator.language (exact tag, then base language), falling back to English. The Japan device
// always uses Japanese. To try a table, set window.__gameLang = 'es' in DevTools and cycle to a normal handheld.
// Keep labels short: the smallest pixel pads have four cells. Accented Latin letters use the same 5x7 cell; unsupported
// pixel letters are filtered like boot titles, with 'now playing' as the last fallback. Screen fonts can use more.
// Run node --test, then node tools/handheld-language-check.mjs for real canvas fit checks, glyphs and screenshots.
// Inspect boot, game, insert/reading/continue/game-over standby, every skin, and the 200x340 mini player. Long
// static text ends with an ellipsis; song strips scroll. See CONTRIBUTING.md for the full preview command.
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
const ES = {
  KICK: 'BOM.', CLAP: 'PAL.', HATS: 'CH.', HAT: 'CH.', OPEN: 'ABR.', BASS: 'BAJO',
  SCORE: 'PUNTOS', COMBO: 'COMBO', BPM: 'BPM', 'FEVER ×2': 'FUROR ×2', 'FEVER x2': 'FUROR ×2', 'FEVER×2': 'FUROR×2', FEVER: 'FUROR',
  PERFECT: 'PERFECTO', GREAT: 'GENIAL', GOOD: 'BIEN', MISS: 'FALLO', MINOR: 'MENOR', MAJOR: 'MAYOR',
  'KEY ?': 'TONO ?', 'listening…': 'escuchando…', LISTENING: 'ESCUCHANDO', 'TOASTER CART': 'CART. TOASTER',
  TOASTER: 'TOASTER', 'TOASTER OS': 'TOASTER OS', 'PRESS START': 'PULSA INICIO', 'now playing': 'suena ahora',
  'PLAY ANY SONG': 'PON UNA CANCIÓN', 'CONTINUE?': '¿SEGUIR?', 'GAME OVER': 'SE ACABÓ', READING: 'LEYENDO',
  'FINDING THE BEAT': 'BUSCANDO EL RITMO', 'NO SIGNAL': 'SIN SEÑAL', STREAK: 'RACHA',
};
export const LANGUAGES = { en: {}, ja: JA, es: ES };
let deviceLang = '';
const matchLang = (tag) => {
  const code = String(tag || '').toLowerCase().replace(/_/g, '-');
  return Object.hasOwn(LANGUAGES, code) ? code : Object.hasOwn(LANGUAGES, code.split('-')[0]) ? code.split('-')[0] : 'en';
};
export function setLang(l) { deviceLang = l || ''; } // game.js: the shown device, each frame
export const language = () => deviceLang === 'ja' ? 'ja' : matchLang(deviceLang ||
  (typeof window !== 'undefined' && window.__gameLang) || (typeof navigator !== 'undefined' && navigator.language));
export const ja = () => language() === 'ja';
export const say = (w) => LANGUAGES[language()][w] || w;
// Skins which historically had English Japanese labels keep their original appearance.
export const skinSay = (w) => ja() ? w : say(w);
export const skinKey = (k) => ja() ? k : sayKey(k);
// a key's name as the game shows it ("A MINOR"): its note as it is, its mode in the edition's words
export const sayKey = (k) => {
  const text = String(k ?? '');
  return text === 'KEY ?' && !ja() ? say(text) : text.replace(/MINOR|MAJOR/g, say);
};
// the screens' face: JetBrains Mono, or for the Japan edition M PLUS 1 Code (its letters and katakana both)
export const screenFont = (latin) => (ja() ? '"M PLUS 1 Code", ' + latin : latin);
export const JA_WORDS = Object.values(JA).join('');
