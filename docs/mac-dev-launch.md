# Isolated source launch on macOS

QA, release and reel checks should run this from their source worktree with a fresh profile and an unused port:

```sh
profile="${TOASTER_SCRATCH:-$HOME/work/scratch}/mac-tools/qa-$(date +%s)"
mkdir -p "$profile"
open -n "$PWD/node_modules/electron/dist/Electron.app" --args "$PWD" \
  --user-data-dir="$profile" --remote-debugging-port=9441 --hidden --mute-audio
```

The npm equivalent is `npm start -- --user-data-dir="$profile" --remote-debugging-port=9441 --hidden --mute-audio`. TOASTER_USER_DATA selects the profile when no explicit argument is supplied. Settings, session/cache data, the lock and hand logs belong to this folder. An explicit profile resolving to the ordinary developer profile is refused before taking the lock. With no override, source launches keep using “Toaster (dev)”. Overrides apply to source copies only.
