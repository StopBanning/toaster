# Isolated source launch on macOS

QA, release and reel checks should run this from their source worktree with a fresh profile and an unused port:

```sh
profile="${TOASTER_SCRATCH:-$HOME/work/scratch}/mac-tools/qa-$(date +%s)"
mkdir -p "$profile"
open -n "$PWD/node_modules/electron/dist/Electron.app" --args "$PWD" \
  --user-data-dir="$profile" --remote-debugging-port=9441 --hidden --mute-audio
```

The npm equivalent is `npm start -- --user-data-dir="$profile" --remote-debugging-port=9441 --hidden --mute-audio`. TOASTER_USER_DATA selects the profile when no explicit argument is supplied. Settings, session/cache data, the lock and hand logs belong to this folder. An explicit profile resolving to the ordinary developer profile is refused before taking the lock. With no override, source launches keep using “Toaster (dev)”. Overrides apply to source copies only.

Add `--player-dry-run` to any copy that shows the player bar and isn't there to try the bar against a real player: it keeps the copy from sending a thing to Music, Spotify or the media keys (a position question gets a made-up reading, and the commands it would have sent are kept: `window.nc.playerSent()` lists them). `tools/player-bar-check.mjs` needs it and refuses to run without it. Like `--hidden`, it does nothing in the installed app.

Add `--library-folder=<folder>` to a copy the library (G) is checked on: it takes that folder as the one chosen, so there is no folder dialog to answer in a window nobody sees (the system's own dialog can't be clicked in a hidden copy), and it is kept in the copy's own settings folder as a chosen one is. A copy run from source with a settings folder of its own never starts with your Music folder: with none chosen, its library has none. `tools/library-check.mjs` refuses a copy whose library folder isn't under `~/work/scratch` (build one with `node tools/library-fixture.mjs`). Like `--hidden`, it does nothing in the installed app.
