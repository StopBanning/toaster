# How Toaster works

The details behind the [README](../README.md): what the exports and recordings are, how the camera
is looked at, how the blocks are timed, the test songs, and how the code is put together.

## Exporting a song

X saves the song so far, from when the beat was found, two ways, side by side in `Music\Toaster`
on Windows, or `Music/Toaster` on a Mac (named after the song and the time):

- A MIDI file: drums on channel 10 (kick, clap, closed and open hat), the bass line, the chords
  and the lead line on tracks of their own, at the song's tempo. Drop it into a DAW.
- The whole song as Strudel code: cut into sections, each written once as a named `stack(...)`
  (A, B, C...) as most of its bars played it, with the chords and lead left out when they don't
  recur across the song, then played in order with `arrange([8, A], [4, B], ...)`; the MIDI file
  stays bar by bar as heard. Open strudel.cc, paste it in, ctrl+enter.

It's written from the same patterns the code on screen shows, bar by bar (steady patterns, not
every hit the detectors fire on), with the bar's chord and bass note, so it has the same strengths
and gaps (see the end of this page). If the tempo changed along the way, the longest stretch at
one tempo is the one saved.

## Recording

M (or the rec button) records the window as it looks, with the sound, to an MP4 (H.264 and AAC,
the format TikTok, Shorts and Reels take) in `Videos\Toaster` on Windows, or `Movies/Toaster` on
a Mac, named by the date and time. Only
the page is recorded: no window frame, nothing else on the screen. While it records the header
and footer hide and so does the mouse pointer over the window (hover the header to get them back
and reach stop), and the taskbar icon goes red.
When it stops, a note in the corner names the file, with a button to show it in its folder.

- For TikTok or Shorts, switch to the vertical layout (L) first: it records at 1080 x 1920. The
  wide layout records the window's own shape, up to 1920 across. Text stays sharp: the capture
  draws the page at that size, it doesn't stretch a smaller picture.
- The sound is what the app is listening to (for system audio, everything the PC plays), taken
  before the speakers. The blocks are drawn to land when you hear a hit, so the recording holds
  the sound back to match: measured on the demo beat, blocks land within a few ms of the hit in
  the file. System audio is drawn 50 ms earlier than the demo, which works out to blocks about
  12 ms ahead of the hit (on real songs the busy low end made it too hard to measure directly);
  a picture that slightly ahead looks in time. Your sync trim ([ ]) counts too.
- About 120 MB a minute (measured: 16 Mbit/s at 1920 x 1204; the moving ASCII background and
  tunnel are a lot of detail to encode). Recording costs the listening nothing measurable: still a
  tick every 15 ms, 60 fps drawing.

### Drop clips

J turns drop clips on, for the first two drops of each song (so a long night doesn't fill the
disk; J again starts the count over): from then on the window is recorded the whole time, in overlapping
stretches (a new one every 10 seconds, each let go at 16 seconds old, so never more than two at
once), and when a drop hits (or you press D) the stretch that started 6 to 16 seconds before it
carries on 10 seconds past it and is saved as `toaster drop <date> <time>.mp4` beside the other
recordings: the build-up and the drop, the same picture and sound as M, ready to post. Each stretch is a recording of its own
from its first frame, so every clip is an ordinary video, nothing cut or stitched together. It
works alongside M. While it's on, the rec button shows ✂; it costs a video encoder or two running
all the time, so it's off until you turn it on.

## The radio

The radio (in the source menu) plays an internet radio stream from the address you paste in: the
stream itself, MP3 or AAC from an Icecast or Shoutcast server, not the station's page or its .pls or
.m3u playlist (the stream's address is inside those). Toaster comes with no stations (a stream is
its station's to offer, and many don't let apps come with theirs), so you bring the address; the
last one that played is remembered. It plays through the app the way a file does, so the blocks are
timed the same way. The song titles a stream carries aren't read, so, as on an input, a new song
starts the code over when Toaster hears a new tempo or a pause. If the stream ends or drops, it
says so and the source menu comes back.

The stream is read cross-origin (CORS), the only way the analysis hears sound from another server.
The app's page is a file on your machine, which may read sound from any server; on the web page a
stream only plays if its server allows it, and an https page can't play an http stream.

## The camera

Everything the camera sees stays on this machine. While it's on, two things look at it:
`helpers/faces.ps1` on Windows (Windows' own face detector) and `helpers/mac/faces.swift` on a Mac
(the Vision framework) find your face a few times a second for the close-up pop-ups and the card,
and an eye finder in `renderer/visuals.js` finds your eyes inside that box. The Mac helper crops
its box to the same shape Windows returns, from just above the eyebrows to just under the mouth.
Google's MediaPipe (`@mediapipe/tasks-vision`, Apache 2.0, with its hand and face
landmark models in `renderer/models`) runs on a thread of its own for the finger frame, hand signs
and big eyes, and for exact eyes in the close-ups while they're up; with the cut-out (K), its
selfie segmenter finds where you are in the picture. It looks about 20 times a
second while a hand is up (or the face is wanted), and 8 times a second after 2 seconds without
one. The face model and the segmenter are only loaded the first time they're needed. The first time ever it takes about
a second to set up on the graphics card; after that it starts at once. If the models go missing,
`renderer/models` needs `hand_landmarker.task`, `face_landmarker.task` and
`selfie_segmenter.tflite` from https://storage.googleapis.com/mediapipe-models/
(`hand_landmarker/hand_landmarker/float16/1/`, `face_landmarker/face_landmarker/float16/1/` and
`image_segmenter/selfie_segmenter/float16/latest/`).

To look at the page in a browser (only the demo beat, files, inputs and some radio streams work there):
`node tools/serve.mjs`, then open http://localhost:5173.

## The blocks

They work like a sequencer queue: every block enters at the right edge, one bar ahead, from the
pattern as it stands then, and keeps its place until it leaves on the left. A pattern change only
affects blocks still to come. Blocks light up as they cross the playhead; a part that stops goes
dim (and stops lighting up) until it's heard again, and after 8 bars away stops sending blocks.

They're timed to land when you hear the hit: measured on this PC, within a few ms on test beats
(four-on-the-floor, boom-bap, trap) and on system audio. If your speakers or headphones add delay
(Bluetooth, a TV), use [ and ] to fine-tune.

## Saving power

With nothing to hear, the picture slows down to save power: 30 frames a second after 3 seconds of
quiet, 10 after 30 seconds if the window isn't in front. It's back to 60 the moment there's sound,
and never slows while recording, with the camera on, or during a drop.

## Checking what it picks up

With the dev copy running (`npm run dev`), `tools/checks.js` plays test songs silently into the
analysis and scores everything the app reports against what was played. Songs: house, pop,
boombap, trap, dnb, reggaeton, afrobeats, rock (human timing, drifting tempo), shuffle, acoustic
(no drums), loud (compressed, noisy), quiet, intro (no drums for 8 bars), change (128 to 85 bpm),
talk (speech and game sounds), ambient (pads, no beat), and pads and pumping (house with a held
pad, without and with sidechain pumping, for the `.duck()` detection).

- `node tools/cdp.mjs run tools/checks.js "checks.song('trap')"`: one song: tempo, key, each drum
  part's steps, bass and chord of each bar, the lead line, block timing, and what each part of the
  app actually fired on.
- `checks.suite(['house','pop'])`: several songs, one report each (~35 s a song).
- `checks.beat('boombap')`: block timing in detail; `checks.loopback()`: the capture delay
  for system audio, with an inaudible probe; `checks.listen(60)`: what it makes of whatever the
  machine is playing; `checks.lag()`: stalls and costs.
- `checks.probe('house')`, `checks.rings('pop')`, `checks.chords('rock')`, `checks.trace('house')`,
  `checks.lockTime('dnb')`: what the detectors see, for working on them.

## Strudel and Tidal

The code it writes is Strudel (https://codeberg.org/uzu/strudel), the browser port of TidalCycles
(https://codeberg.org/uzu/tidal); O hands it to strudel.cc to play. Both are copyleft: Strudel is
AGPL-3.0 and Tidal GPL-3.0, and Tidal counts ports that use its source as a reference as
derivative works. Writing code in their language and linking out to strudel.cc is fine; putting
Strudel's own packages (to play the code inside this app) or code copied from either project in
here would make this app AGPL/GPL too. Nothing from either is in here now.

## How it's put together

- `main.js` opens the window, answers the page's capture request with system audio and no picker
  (Windows loopback on a screen source; on a Mac a Core Audio tap, audio only), runs
  `helpers/nowplaying.ps1` or `helpers/mac/nowplaying.swift` for the song title, and reports machine info.
- `renderer/engine.js` listens: kick/clap/hat onsets (a low hit is told apart from a bass note by
  whether its pitch falls and it dies away; hats split closed/open by how fast they die away), the
  tempo (scored on how well each candidate's 16th grid and beats explain the hits, so syncopated,
  swung and half-time beats come out right, and it won't lock onto talking; when the drums don't
  give a clear beat, from how steadily every instrument's onsets repeat, in both halves of the
  last 10 seconds, which finds strummed, picked and played music with no drums and still tells
  it from talking), bar lines, 16-step patterns, bass note, chord and key per bar, a lead/vocal
  line, knob values.
- `renderer/codegen.js` writes that as Strudel code; `renderer/codeview.js` types it in and
  highlights tokens as they play.
- `renderer/visuals.js` (ASCII field, drawn on the graphics card with WebGL, one call a frame;
  tunnel, punchcards, webcam), `renderer/card.js` (the
  now-playing ID card), `renderer/glass.js` (the glass blob, a WebGL shader over a redrawing of
  the screen: the background each frame, the code only where a line changed), `renderer/orb.js` (the dot orb), `renderer/lens.js` (finger frame),
  `renderer/segcam.js` (big eyes), `renderer/gestures.js` (hand signs), `renderer/tape.js` (the
  song as heard, and its export as MIDI and Strudel), `renderer/rings.js`
  (spiral and pitch wheel), `renderer/warp.js` (the warp shader) and
  `renderer/fx.js` (Windows XP takeover and message boxes, blue screen, machine readout),
  `renderer/cuts.js` (the cuts background), `renderer/worlds.js` (the worlds: the planets' shader,
  the lens, the gold dust) and `renderer/worldlooks.js` (the looks they print in) are the
  visuals; `renderer/clips.js` keeps the drop clips, `renderer/smooth.js` steadies the hands; `renderer/tracking.js` and `renderer/track-worker.js` run MediaPipe's hand and face
  tracking; `renderer/demo.js` is the test song.

The bass line has its rhythm: the bar's note on the steps a bass note starts, written the Strudel
way (`note("<f2 c2 g2 a2>").struct("[~ x]*4")`), lighting up as each note plays, and the bass
blocks follow it. Notes that start right under a kick are found too, by the pitch changing
underneath it. The note is the lowest strong pitch heard (within 6 dB of the loudest between 35 and
220 Hz), not the loudest: a riddim's or dubstep's growl is louder than its sub, and the loudest
named its partials as the bass (g3 in a line of c#1).

The bass's sound is listened to as well. Its brightness (its 150-2000 Hz against its 30-150 Hz)
is followed 33 times a second, and once a bar the last 6 seconds of it are checked for movement
on the beat's 8ths, triplets or 16ths: a filter swept at that rate, dubstep's wobble or riddim's
pulse. It counts when that movement is 8 times its typical strength and 3 times the quarters'
(a four-on-the-floor song's brightness moves with its kick, on the quarters), when it swings by a
real amount, and when it's the filter: the mids moving while the low end holds (drums in the
bass's range, and a bass line's own rhythm, move the low end too). Then the bass line gets
Strudel's filter LFO, locked to the bar (`.lpsync(8).lpdepth(3).lpq(6).distort(.8)` for the
8ths), live and in the export. On a riddim and a dubstep remix it came on in their drops; on a
house song, a garage one and a 2-step one, never.

It's a live reconstruction, not yet an exact transcription. Known gaps (measured with the checks
above): a bass that plays the same note again under every kick (trap 808s) can't be told from the
kick, so it falls back to one note per bar, as do soft bass lines with no drums; toms, shakers, rims and crashes have
no lines of their own; the lead line catches roughly half of a melody's notes and can pick up
chord instruments; a minor key can be named as its relative major (C major for A minor) when
Toaster joins a song halfway through (heard from its start, the song's first chord settles it);
heavily compressed mixes lose some kicks; drum & bass sometimes locks at half speed when the PC is
busy (a video loading in
the browser, say). Songs without clear drums take longer: with a steady pulse (strummed guitar, a
soft beat) about 8 to 20 seconds (measured on indie songs played through the PC; "Hush" by The
Marías went from 28 seconds to 8), but one without a steady pulse (a rubato ballad) can stay on
"finding the beat", because to the app its pulse looks like talking.

Once it has the beat of a song the system says is still playing, it keeps it through breakdowns and
quiet parts (the parts go dim until they're heard again), and the beat stays put through
syncopated sections; a new title from the system, 4 seconds of silence after a pause, or a clear new
tempo starts it over.

## History

Toaster was called Now Coding; the first time Toaster starts, it brings that version's saved
settings over from its folder. The first prototypes are in `prototype/`.
