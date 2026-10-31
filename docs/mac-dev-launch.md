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
