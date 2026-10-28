# Contributing to Toaster

Thanks for wanting to help. Toaster is small and moves quickly, so small, focused pull requests are the ones that
land.

## Run it

You need Node.js 24.

```
npm install
npm start                  # the desktop app
node tools/web.mjs --serve # the browser version, at the address it prints
node --test tools/*.test.mjs
```

## Where things live

| File | What it does |
|---|---|
| `renderer/engine.js` | The listening: onsets, tempo, bar lines, bass, chords, key |
| `renderer/codegen.js`, `codeview.js` | The live Strudel code, and how it's typed onto the screen |
| `renderer/tape.js`, `tape-export.js` | The song as it's recorded, and the X export (Strudel and MIDI) |
| `renderer/visuals.js` | The blocks layer (punchcard, dominoes, the handheld's frame) and the ASCII backgrounds |
| `renderer/scenery.js`, `worlds.js`, `chrome.js`, `spectro.js`, `cuts.js`, `fire.js` | The backgrounds |
| `renderer/game.js`, `gameboot.js`, `gameskins.js`, `gamewords.js` | The handheld rhythm game |
| `renderer/lens.js`, `portal.js`, `gestures.js`, `tracking.js` | The camera and hand features |
| `renderer/app.js` | Keys, menus and layout, and the wiring between all of the above |
| `main.js`, `preload.js`, `update.js` | The desktop side: the window, system audio, updates |

[docs/how-it-works.md](docs/how-it-works.md) explains the listening in more depth.

## Good first contributions

- **A radio station.** [docs/radio-stations.md](docs/radio-stations.md) lists stations that publish their stream
  addresses for other players. Add one, with a link to where the station publishes it.
- **A song Toaster gets wrong.** Open an issue with the song, the time it happens, and what was off (the tempo, the
  bar lines, a part that's missing). These become the songs it's tested against.
- Issues labelled [good first issue](../../labels/good%20first%20issue) are picked out for a first PR.

## Pull requests

- **One change per PR.** Say in a sentence why, and include a screenshot or a short clip for anything you can see.
- **Match the code around it.** Plain JavaScript modules, no build step, comments that say why. Ask in an issue
  before adding a dependency.
- **Run the tests** before you open it.
- Contributors are thanked by name in the release notes and in the app's "what's new" box.

## Bugs

Use the bug form, and say:
- what you ran: the app or the browser, Windows or Mac, and the version;
- the audio source;
- the song, if it's about one.

A short screen recording helps most.

By contributing, you agree that your work is MIT licensed, like the rest of Toaster.

## Translate the handheld

Edit `renderer/gamewords.js`. Copy the Spanish (`ES`) example, translate every value, and register the table in
`LANGUAGES` under a lowercase BCP 47 tag such as `fr`. Keep the English keys, note names, numbers and the Toaster name.
Normal handhelds select `navigator.language`, trying the full tag and then its base language; an unavailable language
uses English. The Japan edition always uses Japanese.

To try your table in an existing development session, set `window.__gameLang = 'fr'` in DevTools and cycle to a normal
handheld with A. Delete that property to restore the browser language. No setting or shortcut is added. The Japanese
edition's original words and the older skins' original Japanese/English mix stay intact.

Run `node --test`. Every table entry must be drawable, and the low-resolution boot, standby, LCD and VFD painters must
fit the 200×340 mini player's smallest screens. Drum and pad labels should use four cells or fewer: Spanish uses
`BOM.` (bombo), `PAL.` (palma), `CH.` (charles) and `ABR.` (abierto). The pixel font supports accented Latin capitals, lowercase equivalents,
katakana and common punctuation. Latin accents occupy the top of the same 5×7 cell. For scripts outside this font,
discuss glyph support first; pixel text filters unsupported letters and falls back to “now playing” in the selected
language (or English if necessary). Proportional screen text uses the bundled screen fonts.

For screenshots and real browser measurements, install a standalone Chrome/Chromium and run:

```sh
# Set HANDHELD_CHROME to the executable if it is not in one of the checker's default locations.
node tools/handheld-language-check.mjs --lang=fr
```

This launches an isolated headless browser, serves the checkout locally, and writes `_checks/handheld-languages/`.
It does not launch Toaster or use an installed copy. Review the glyph sheet and boot, game and standby screenshots
for os, lcd and neon. Also inspect insert, reading, continue countdown and game-over states; test all six skins and
the 200×340 mini player. Static text that cannot fit must end with an ellipsis; song strips intentionally scroll.
Keep ordinary translations short enough to read in full. The checker compares fixed English/Japanese frames against
`cf28592` by default (`--base=<commit>` changes the reference). Include test output and before/after hashes with a PR.
