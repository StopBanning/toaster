# Toaster

Toaster hears whatever is playing on your PC (Spotify, YouTube, anything) and writes it out as
live Strudel code in front of you: named lines typed into a blank window and lighting up as they
play, over ASCII visuals, a dot orb, punchcard blocks or your webcam. Toaster, as in Toaster
Strudel.

![Toaster playing its demo beat](docs/toaster.png)

![The worlds background: a planet a kick, seen from low orbit](docs/worlds.png)

It finds the beat, the kick, clap and hats, the bass line, the chords and the key, and keeps
rewriting the code as the song moves. It's a live reconstruction for show, not an exact
transcription. Press X and it hands you the whole song as Strudel code and as a MIDI file.

## Get it

Windows 10 or 11, or macOS 13 or later. A webcam is optional.

**Windows.** Download `Toaster-<version>-win-x64.zip` from the [Releases](../../releases) page,
unzip it anywhere and double-click `Toaster.exe`. The first time, Windows may say "Windows
protected your PC" (the app isn't signed): click **More info**, then **Run anyway**. It starts
listening straight away; there's no prompt.

**Mac.** There's no Mac download yet: run it from source (see Build it yourself below), or make
the app with `npm run package:mac`. It asks to record system audio. Allow it. That's how Toaster
hears what's playing; it doesn't record the screen, and the camera stays off until you press C. A
packaged copy may be stopped the first time: open **System Settings → Privacy & Security** and
click **Open Anyway**.

Play some music: within a few seconds it finds the beat and starts typing. Press **?** for the keys.

**Updates.** When a newer Toaster is out, it offers it a few seconds after it starts. On Windows,
say yes and it downloads it, checks it against the checksum GitHub lists for it, closes, and opens
again as the new version (your settings stay); on a Mac it opens the release's page. You can turn
the check off in the help (?).

## Keys

These are the keys as they come; every one can be changed in the help (**?**): click a key, press the one you want (a key that's taken swaps over). Esc, ? and F11 stay put.

| Key | Does |
| --- | --- |
| S | audio source: system audio, demo beat, file, input |
| V | background: spectrum, tunnel, spiral, pitch wheel, warp, cuts, worlds, chrome, rain, scope, off. Cuts gives each drum a scene of its own, cut to on its hits, each a view of the song in Toaster's look: the drum's word huge, its line of code magnified, its 16 steps as a punchcard, the spectrum falling in dots, the waveform, you or the cover in big dots, the tempo and key, the spectrum as text mirrored both ways like a kaleidoscope, a tunnel of rectangles flowing out (those two after rentalunit5's video-synth pieces). Spiral and pitch wheel are after the visuals Strudel draws: the spiral is time going round, a turn a bar, every kick, clap, hat and bass note a mark where it fell, the newest bar outside; the pitch wheel has the twelve notes round a circle, the chord drawn as a shape between its notes, the bass note as a line out from the middle and the melody's notes as dots that fade. Warp is a feedback shader in the style of Hydra patches (its own, not Hydra): stripes folded into a kaleidoscope, trailing and swirling toward you, the kick punching the zoom. Worlds is a film of planets, after Anthropic's Claude Opus 5.5 launch film: the kick on each bar's one cuts to another world on the same horizon (every other bar with fewer flashes), an extreme close-up of something (honey, agate, lace, a leaf, bread crust, plant cells, oil on water, a circuit board, the code itself) seen as a planet from low orbit, the foreground soft, gold dust in the air; when the kick drops out the film rests on a horizon at dawn till it's back. Chrome is a pool of liquid chrome seen from above with an oil-slick film on it: every kick drops a bead where it lands in the bar (so the rings spell out the kick pattern), claps strike lightning in the sky it mirrors, the bass swells it and each chord gives the film its own colours (real thin-film interference over the visible spectrum); every two bars a collage cuts into it: mosaic, dragged rows, a barcode, the liquid's contour lines, a dither, graph paper, and a panel with the song, artist, key and tempo |
| A | how strongly the ASCII background (spectrum, rain, scope) shows: soft (how it used to be), normal, bold. The code lines sit on their own bands, so they stay readable. With the worlds on, A picks their look instead: auto (film, and on each drop another look for 8 bars), night (as auto, but every world keeps a dark sky with its stars, so no cut lights the whole screen; with fewer flashes on, the worlds always have night skies), film, ASCII (the planet as text, each character in its own colour), code (the planet drawn in the song's own code the way ASCII art draws a picture: as many characters as the world is bright there, each in its colour, the world faint underneath), ink (the theme's two colours, dithered as the ID card's picture is), and the Locust Worlds page's print finishes: risograph, cyanotype, receipt, thermal camera, night vision, CRT, VHS, quadtree; and cells, the planet cut into cells of the worlds around it, turning over cell by cell into the next on each cut (after Days of Glitch's moving cells). A print look covers the planet, or the sky when the code sits over the planet. With chrome, A turns its collage off and on. Remembered |
| R | orb, over whichever background is picked (or none): after libraries.dev's Thinking Orbs, a cloud of 2,200 soft dots in 3D that holds a form for 8 bars and then flows, dot by dot, into the next, landing on the phrase's one: a sphere, a crystal (a cube of dots on its corner), orbit paths with their dots running round them and bright particles among them, a staff the bass notes appear on as they're played, a spiral galaxy, a network its signals run through on the hats, a field of waves riding the spectrum, a sphere in slices that turn one a beat and then solve themselves (Thinking Orbs' moves), a globe's lines, a ring, an icosahedron, rings swelling with their bands of the spectrum, a burst of rays, ripples on a disc, and an outline that changes shape on the bar. The kick breathes it out, the clap spins it, the hats send a band of light round it, the bass swells the dots. Timed off the beat like the blocks |
| P | punchcard blocks on top of whichever background is picked |
| [ / ] | blocks sync fine-tune: ] if they land after the beat, [ if before (10 ms a press, remembered) |
| C | webcam behind the code, tinted to the theme. Press again for big eyes: little windows over your face with your eyes and mouth blown up, swelling on the kick (after lo.fi.sci.fi's segcam effect). Again for ASCII: the camera drawn as text (dense characters where it's bright), in place of the ASCII background. Again for off |
| (hands) | with the camera on, make a frame with your fingers (each hand an L: index out, the other fingers curled, the thumb wherever) and a window opens between your fingertips showing what's inside through a filter (16 of them: dithered blue and pink, negative, heat camera, the theme's colours and more; the first, keyframes, changes colours on every kick). It's a card with a filter on each side: turn one hand over and its end twists round to show the back; turn the whole card over and the back becomes the front. Flick it edge-on and back, bunch one hand's fingertips together, or wink, for the next filter. Pinch one hand (thumb on index) for a triangle; pinch both together, or open your hands, to close it. Keep your hands a little inside the edges of the picture: the tracker loses a hand that's half out of it |
| (portal) | with the camera on, make a circle with your hands (the tips of your index fingers together and your thumbs' tips together, one pair above the other; a diamond or a heart works too) and hold it a moment: a round window opens in it with a look inside: x-ray (white edges, with echoes spreading out from the middle), lilac (pale and grainy), glass (you gone clear, the room bent through you as through liquid glass), a kaleidoscope turning with the beat, a time tunnel (each ring further out a moment further back, so moving sends ripples through time), and the finger frame's heat camera, comic, pencil, RGB split, neon edges, mosaic and more. Pull your hands apart and it grows between them; spread them wide and hold them there a moment (its outline thickens), or spread them on out past the picture's sides, and it fills the camera's picture, with you cut out in front of it as you are (the code stays on top). Pinch (thumb on index) for the next look, spreading out from that hand (pinch again while it spreads for the one after); every 8 bars brings the next one too, from the middle. Once it fills the picture you can swipe as well: hold one open hand up a moment, then sweep it sideways, fast, and the look slides in after it (to the left for the next, to the right for the one before). Drop your hands and the window closes; once it fills the picture it stays till you make the circle again, which can be looser than the one that opened it. Hold the circle on after a window closes and the next one opens (after cure.visual's TouchDesigner portals) |
| (signs) | with the camera on, hold up a hand sign: ✌️ (two fingers up) for the next theme, 👍 (held a second) to start or stop recording, ✊ (one raised fist; two up, a flex, don't) to hush, 🖐 (an open hand) to come back from it. Each fires once a hold (the header shows the sign while you hold it), and none while the finger frame or a portal is open |
| G | glass: a blob of liquid glass floats over the code and bends it like a lens (after the AIRGLOW visuals by null.mpeg), swelling on the kick |
| O | open this code in Strudel: your browser opens strudel.cc with the code in its editor (in the link, after the #), ready to play with ctrl+enter and change. The vox line becomes the same notes on a synth (Strudel has no "vox" sample), and a punchcard of the whole thing draws under the code |
| M | record a video: what's in the window with the sound, into `Videos\Toaster` on Windows or `Movies/Toaster` on a Mac (see Saving things below). M again to stop |
| J | drop clips: while on, the first two drops of each song are saved as videos of their own, the build-up and the drop, into that same folder (see Saving things below) |
| X | export the song so far, decompiled: a MIDI file and the whole song as Strudel code, into `Music\Toaster` on Windows or `Music/Toaster` on a Mac (see Saving things below) |
| Space | tap the beat: from the fourth tap the tempo is yours, the beats on your taps and the first tap starting a bar. For a song it can't find the beat of (soft songs, rubato) or finds wrong. It stays until the song changes (the hits still fine-tune it), and a pause of 2 seconds starts the count over |
| Q | hush: every part muted with a `_` in front of its name, the way Strudel's `hush()` stops everything, and the background dimmed (the sound itself keeps playing). Q again, an open hand or a new song brings it back |
| K | camera effect: none, cut-out (just you over the visuals: where MediaPipe's selfie segmenter finds a person, the rest of the picture goes see-through, and the camera moves up over the backgrounds), slit-scan (each row a moment later than the one above, so anything moving bends down the picture), datamosh (what a video codec does when it loses its key frames: the picture melts along with whatever moves, and comes back fresh on every bar line), windows (the room gone, you only through little windows that pop open wherever you move, each keeping its moment, so moving leaves a trail of them, a burst on each kick, one on your face; after lo.fi.sci.fi's segcam), glass (you gone clear: the room, in colour, bent through your shape as through liquid glass, light glinting off its edges, the bend sharper on the kick; the room behind you is learned as you move, so step aside for a moment and it comes out clean; after ttyproj's "Transparent Distortion", made in TouchDesigner). The first three work on the ASCII camera too, and with it the windows show you as text. Remembered |
| N | now-playing ID card: song, tempo, key, and your webcam as a 1-bit dithered picture (with the camera off, the song's cover from Windows if the player gives one, in finer dots and sharpened so its lettering survives, else the sound). N again makes it big (the cover or you in big dots, as big as fits), a third time puts it away. On by default in the vertical layout, each layout remembers its own setting. In the mini player it's the big one shrunk to fit beside the code |
| D | fire the drop effect now (it also fires when the kick returns after a 3+ second break). With the camera on, some pop-ups close in on your face or one eye (one on a little CRT screen) |
| B | drop effect: XP takeover, blue screen, off |
| I | machine readout (`const machine = {...}`) |
| L | vertical 9:16 layout for TikTok/Shorts (resizes the window) |
| W | mini player: the window shrinks to a small panel in the corner, on top of everything else, still listening (the code, and the card if it's on); W again brings it back |
| T | theme: bluescreen, blackscreen, terminal, pink, whitescreen |
| E | name the song yourself |
| H / F | hide header and footer / fullscreen |

The background and its strength, blocks, orb, card, glass, theme, camera effect and drop-effect
choices are remembered between launches, and so are the keys; the camera always starts off.

## What you'll see in the code

The code is typed the way a live coder performs it: a part that stops gets a `_` in front of its name
(Strudel's mute) and loses it when it comes back, a part never heard yet stays a comment, and a
change lands on the next bar line, the way ctrl+enter on the downbeat does (the line flashes, and
the rest of the code with it). Now and then a closing bracket gets left out: a red error shows,
then the caret goes back to fix it.

- The filters sit on sliders, `.lpf(slider(850, 100, 4000))` (Strudel draws a slider in the code
  for that); a thin track under each shows where the value is in its range, and when the music's
  filter moves, the number slides there instead of being retyped, like dragging the slider.
- A bass whose filter sweeps on the 8ths, triplets or 16ths (dubstep's wobble, riddim's pulse)
  gets Strudel's filter LFO, locked to the bar: `.lpsync(8).lpdepth(3)` for the 8ths, with some
  resonance and grit. The export writes it the same way.
- When the chords pump under the kick (sidechain, in most house and EDM), the kick gets
  `.duck("2:3").duckdepth(.6)` and the bass line and chords go on orbits 2 and 3, the way you'd
  set that up in Strudel. The depth follows how far they dip.
- The tempo line says `// breakdown` while the kick is out for a bar or more, and `// drop` for
  the first 4 bars after a drop.
- A line too long for the window (often, in the vertical layout) goes on over more rows, broken
  before a method call and indented, the way you'd break up Strudel by hand.

## Saving things

- **M** records the window with its sound into `Videos\Toaster` on Windows, or `Movies/Toaster`
  on a Mac, as an MP4 ready for TikTok, Shorts and Reels. Switch to the vertical layout (L) first
  for a 1080 x 1920 video; it keeps everything clear of the edges Reels and TikTok trim on tall phones.
- **J** turns on drop clips: the first two drops of each song are saved as their own videos (the
  build-up and the drop) into that same folder.
- **X** exports the song so far into `Music\Toaster` on Windows, or `Music/Toaster` on a Mac: a
  MIDI file (drums, bass, chords and lead on their own tracks) and the whole song as Strudel code,
  every 4 bars as heard, the different ones named and played in order with `arrange()`. Paste it
  into strudel.cc and press ctrl+enter.

More on all three in [docs/how-it-works.md](docs/how-it-works.md).

## Privacy

Everything Toaster hears and sees stays on your machine. The sound is worked out in the app, and the
camera (off until you press C) is looked at by the system's own face detector (Windows' face
detector, or the Mac's Vision framework) and by Google's MediaPipe, both running on your machine.
Nothing is uploaded. It reaches the internet for two things only: GitHub, when it starts, to see
whether there's a newer Toaster (turn that off in the help, under Updates), and strudel.cc when you
press O (your browser opens it with the code in the link).

## Good to know

- It does best with a steady beat. A song without clear drums can take 8 to 20 seconds to find
  one; tap Space on the beat to give it the tempo.
- The song's title (and its cover, for the ID card) come from the system's media controls
  (Windows' media controls, or the Mac's Now Playing), so any player that shows up there works:
  Spotify, browsers and the rest.
- For the finger frame, the portals and the hand signs, keep your hands a little inside the camera's picture.
- What it can and can't hear yet: the end of [docs/how-it-works.md](docs/how-it-works.md).

## Build it yourself

With Node.js (it's built with Node 24):

```
npm install
npm start          # run it
npm run dev        # run it with a debugging port (9333) for tools/cdp.mjs and tools/checks.js
npm run package    # build for the OS you're on: dist/Toaster-win32-x64, or dist/Toaster-darwin-universal
```

On a Mac, `npm start` compiles the Swift helpers (now playing, and faces) the first time, with
Xcode's command line tools. `npm run package:win` and `npm run package:mac` build the other OS's
app; the Mac app has to be built on a Mac.

How it works inside, and the test songs it's checked against: [docs/how-it-works.md](docs/how-it-works.md).

## Credits and license

Toaster is MIT licensed ([LICENSE](LICENSE)). It uses Google's MediaPipe (Apache 2.0) for the
camera; [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) lists everything it uses and the artists
whose looks it's after. The code it writes is [Strudel](https://strudel.cc). Toaster is an
independent project, not made by or affiliated with the Strudel project.
