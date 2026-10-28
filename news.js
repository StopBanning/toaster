// What's new, newest first: each version's additions, a line each, with the key that finds it (an
// action's id, written as the key it's set to now; in: where that key does it, when its job depends on the
// background, as A's does) or a word where there's no key. After an update
// it's shown once, in a "toaster updated" box (what came in since the version last opened); the
// help keeps the last few versions' at its top.
export const NEWS = [
  { version: '0.4.24', items: [
    { act: 'export', text: "X keeps the whole recorded song in a compact program, including fills, short sections and chords that used to vanish" },
    { act: 'tap', text: "tap four beats and Toaster sets exactly that tempo" },
    { act: 'blocks', text: "the handheld speaks Spanish when your device does" },
  ] },
  {
    version: '0.4.23',
    items: [
      { act: 'strength', in: 'the game', text: "the handheld's Japan edition, the fourth of A's screens with the game on: a cream and red handheld after the Famicom with トースター on it, its screens (in black and white), its cartridge and its power-on all in Japanese" },
      { act: 'blocks', text: "the handheld game is there as soon as you pick it, standing by: PLAY ANY SONG before a song, READING while it finds a song's beat, and when the music stops CONTINUE? and a count, then GAME OVER, till a song powers it on again" },
      { act: 'cam', text: "the finger frame closes as you drop your hands, instead of hanging there stretched from where the tracker last saw one of them" },
      { act: 'mini', in: 'the game', text: "with the handheld on, W puts it on your desktop on its own: no window round it, just the device and its shadow over whatever's there, on top of everything; drag it anywhere, and Esc brings Toaster back" },
      { act: 'visual', text: "a tidier Toaster: V goes round the backgrounds worth showing, best first (the scenes, worlds, chrome, the spectrogram, cuts, fire, off), P starts with the dominoes, the footer says what A changes and shows just the keys you need (? has them all), and a first start opens on the dominoes over a scene. The orb and the glass are off the keys" },
    ],
  },
  {
    version: '0.4.22',
    items: [
      { act: 'source', text: "internet radio, a fifth source: paste a stream's address into the source menu and Toaster plays it and writes it out as code. It comes with no stations (docs/radio-stations.md lists a few that publish their addresses) and remembers the last one. By Jeffrey Li" },
      { key: 'bars', text: "the code's bars start on the song's 1 more often: a new section (the music stepping up or down and holding it for a bar) now counts as a bar's first beat" },
      { key: 'updates', text: "updates go through even when another program has Toaster's files open, and one that didn't go through says why instead of asking again" },
      { key: 'titles', text: 'song titles come back by themselves if the helper that reads them stops' },
    ],
  },
  {
    version: '0.4.21',
    items: [
      { act: 'blocks', text: "a handheld game, the blocks' third look: the song played on a two-screen metal handheld, its notes falling down four lanes (kick, clap, hats, bass), every hit judged, the combo climbing, FEVER on a drop; its buttons press with the drums and its cartridge has the song on it" },
      { act: 'strength', in: 'the game', text: "with the game on, A goes round its screens: Toaster's own, neon, an old LCD" },
      { act: 'blocks', text: "it powers on like an old handheld each time it comes on: its light, the screens flickering awake, the logo dropping in with a ding, a self-test of the song's parts, then the game" },
      { act: 'theme', text: "on the pink theme, the handheld comes in a pink edition: pink buttons and cartridge, its own stickers" },
      { act: 'mini', text: "with the game on, the mini player is a pocket handheld: a tall window with just the handheld in it" },
      { act: 'strudel', text: 'the code opens in Strudel in step with the song: it starts on the four bars that were playing when you pressed it' },
      { key: 'iPad', text: "on an iPad or a phone, audio input asks for the microphone straight from your tap, says where to allow it if iOS won't, and comes back by itself (or with one tap) when iOS cuts the sound off" },
      { key: 'touch', text: "on a touch screen, ☰ in the header opens every key as a button, each showing what it's set to, with a big pad for tapping the tempo" },
    ],
  },
  {
    version: '0.4.20',
    items: [
      { act: 'visual', text: 'fire, a new background: the old Doom fire in square pixels, lit by the song: the kick lifts it, the hats spit sparks, and it flares on every drop' },
      { act: 'crt', text: 'CRT: an old TV over everything; it comes on from a white line and goes off into a dot, slips into static on the drop, and each background is a channel' },
      { key: 'bass', text: 'the bass line by the beat: where the bass moves in a bar, the code writes each note as it plays (Show Me Love: <[d2 f2 a1@2] [bb1@3 a1]>, where it was one note a bar), and the blocks and the song export (X) follow it' },
      { key: 'kick', text: "four on the floor holds together: a kick under a held bass note, landing on a beat, joins the kick line, so house and disco songs keep all four kicks" },
      { key: 'tempo', text: 'the right tempo from the start: a syncopated intro no longer locks a third too fast (Gypsy Woman read at 160 for its 120; Sunset Lover, Starships, and Starboy all song)' },
    ],
  },
  {
    version: '0.4.19',
    items: [
      { key: 'kick', text: "the kick line comes in sooner and on more songs: a soft, low hit off the kick's steps is read as the bass, not as a kick that muddles the pattern" },
      { act: 'mini', text: "the mini player's status shows whole (● LIVE), not cut short" },
    ],
  },
  {
    version: '0.4.18',
    items: [
      { act: 'strength', in: 'scenery', text: "the sea redone round its lighthouse: the keeper's cottage, beams sweeping with the beat, the Milky Way over the water; it and the festival are night scenes now, under a richer sky" },
      { act: 'strength', in: 'scenery', text: "the festival's lake and crowd cleaned up: a calm column of the stage's light, the crowd in silhouette" },
      { act: 'strength', in: 'scenery', text: "the eye without the window that was reflected in it, and every stroke drawn in glyphs clean at any screen size: the dive's stars no longer turn to white blocks" },
      { act: 'camfx', text: 'the dots, the voxels, the cut-out, the windows and big eyes come on without the picture freezing the first time' },
      { key: 'startup', text: 'the warp, the spectrum, the rain and the scope get ready in the background the first time, in the field of glyphs' },
      { act: 'strength', in: 'scenery', text: 'scenes changed in quick succession each decode from the one before, not from a scene long gone' },
      { act: 'dropfx', text: 'the drop effect starts off: the scenes take the drop themselves, and B picks one' },
      { act: 'strength', in: 'scenery', text: 'the basement show leaves the scenery' },
    ],
  },
  {
    version: '0.4.17',
    items: [
      { act: 'strength', in: 'scenery', text: "the eye, a new scene: a real eye drawn in glyphs that looks out at you and blinks; on a drop the view glides into its pupil, a window onto space: Hubble's Whirlpool galaxy and Saturn, drawn in glyphs too" },
      { key: 'startup', text: 'the worlds, the chrome and the spectrogram wait in the same field of glyphs while they get ready, not a black window, and the spectrogram no longer holds the window up the first time' },
      { key: 'startup', text: 'the worlds get ready in about half the time the first time after an update' },
      { act: 'layout', text: 'leaving 9:16 always gives the window back its old shape' },
      { key: 'mac', text: 'a Mac download on every release: one app for Intel and Apple silicon (the first time, open it from System Settings, Privacy & Security, Open Anyway)' },
    ],
  },
  {
    version: '0.4.16',
    items: [
      { act: 'strength', in: 'scenery', text: 'the city, the campfire and the snow by day, redrawn: brick, glass and striped awnings in the rain, a meadow of wildflowers round the fire, a clear winter sky over white peaks' },
      { key: 'startup', text: 'the garden, the koi pond and Halloween get ready in a third to a half less time the first time after an update' },
      { act: 'rec', text: "recording is sturdier: a slow or failing disk stops it cleanly and keeps what was written, it can't spill into the next recording, and stopping always finishes" },
      { act: 'clips', text: 'drop clips clean up after a broken recorder and say so, and switch off instead of jamming' },
      { act: 'visual', text: 'the spectrogram and the dots camera mark a change of chord only when the chord really changes' },
    ],
  },
  {
    version: '0.4.15',
    items: [
      { act: 'strength', in: 'scenery', text: 'the sharks in pixels: clean shapes and fins under their shimmering letters, and the stingray and the jellyfish redrawn with them' },
      { act: 'strength', in: 'scenery', text: 'a change of scene decodes in from the toaster, a cell at a time' },
      { key: 'startup', text: 'while the scenery gets ready (the first start after an update, a first visit to the website) a field of glyphs shows instead of a black window' },
    ],
  },
  {
    version: '0.4.14',
    items: [
      { act: 'strength', in: 'scenery', text: 'space in the scenery: on the moon, the toaster floating on its own power cord from a lander, the Earth, Saturn and an astronaut in the sky, the Milky Way across it; on a drop the toast pops and meteors streak by; night whatever the theme' },
      { act: 'strength', in: 'scenery', text: "the koi pond's koi in pixels: clean patterns, see-through fins and tails, eyes, the gold ones glinting, and their shadows on the bottom by day" },
      { key: 'startup', text: "the desktop app starts in about half a second: it keeps the scenery's compiled scenes between launches, where it was compiling the first one again every time (5 s and more)" },
      { key: 'startup', text: 'the sharks get ready in half the time the first time after an update' },
      { key: 'update', text: "updating is sturdier: a download that stalls or breaks gives up cleanly and leaves your Toaster as it was, and only GitHub's own downloads are taken" },
    ],
  },
  {
    version: '0.4.13',
    items: [
      { act: 'strength', in: 'scenery', text: "every scene redrawn: water, rock, ground and buildings solid instead of loose characters, and pixel art where it looks better: the moon, a campfire, a leaping trout, the garden's koi, birds, a sailboat" },
      { act: 'strength', in: 'scenery', text: 'the basement show in the scenery: the toaster at the mic with its guitar in a brick basement, a drummer behind, the cans sweeping the haze, smoke every 8 bars, and on a drop a strobe, confetti and every hand up' },
      { act: 'drop', text: "the scenery's drop too: the toast pops, the koi dart in and ring the toaster, the sharks charge the bait ball, the festival's fireworks go up, the falls' trout leaps; with the drop effect off it stays off" },
      { key: 'startup', text: 'starts quicker: each background is made the first time you pick it, the worlds getting ready once the first one is showing' },
      { act: 'code', text: "hiding the code hides it everywhere: the error box and the glass too, and the worlds have the whole window; in a tall window the scenery's land rises clear of a reel's captions" },
      { act: 'export', text: 'exporting a long set is ten times quicker, and the listening carries on while it does' },
      { act: 'visual', text: 'the code rain rains your code again, not plus signs' },
      { act: 'machine', text: 'the machine info off is off: no more empty box in the corner of every recording' },
      { act: 'cam', text: "hand tracking says when the face or the cut-out can't start, and keeps the hands going" },
      { key: 'resize', text: 'resizing the window keeps the sharks and the koi where they were; the window buttons fit a narrow window' },
      { act: 'strength', in: 'scenery', text: "small fixes: a hand on every raised arm at the festival, the koi feeding tidily by the window's edge, the stingray and the pond's petals no longer jumping every 17 minutes" },
    ],
  },
  {
    version: '0.4.11',
    items: [
      { act: 'strength', in: 'scenery', text: 'the koi pond in the scenery: koi seen from above, lily pads, the toaster on a pad of its own; click the water to feed them, and on the drop they all gather round the toaster' },
      { act: 'strength', in: 'scenery', text: "the festival in the scenery: the toaster DJing on a stage by a lake, beams sweeping with the bars, fireworks on the drop, the crowd's arms going up" },
      { act: 'strength', in: 'scenery', text: 'the garden redrawn: the cherry tree in full blossom, a pagoda on the hill' },
      { act: 'strength', in: 'scenery', text: 'the sharks have company: jellyfish, a fish made of code, a stingray' },
      { key: 'startup', text: "no more freezes the first time after an update: the scenery makes its scenes one at a time, the one you're looking at first" },
    ],
  },
  {
    version: '0.4.10',
    items: [
      { act: 'code', text: 'hide the code: just the visuals, for Toaster as a visualizer; the scenery opens out into the room' },
      { act: 'strength', in: 'scenery', text: "the lighthouse stands straight, its two beams sweeping round, a flare on each bar's one" },
      { act: 'strength', in: 'scenery', text: "halloween's jack-o'-lanterns carved and lit from inside, its bats with glinting eyes" },
      { act: 'strength', in: 'scenery', text: 'the sharks: a bait ball circles the float, and on the drop they charge it' },
      { act: 'strength', in: 'scenery', text: 'the waterfall redone: streams that pump with the kicks and swell on the drop, an aurora over it at night, mirrored in the pool' },
      { key: 'tempo', text: 'the beat follows a DJ mix into the next song sooner, and a lock that came out a few percent off gets put right' },
    ],
  },
  {
    version: '0.4.9',
    items: [
      { act: 'strength', in: 'scenery', text: 'the sharks hunt where you can see them: when the drop hits they stay on screen, round the float' },
      { act: 'strength', in: 'scenery', text: 'the scenery switches scenes smoothly: no more pause the first time each one shows (on Windows)' },
    ],
  },
  {
    version: '0.4.8',
    items: [
      { act: 'strength', in: 'scenery', text: 'sharks in the scenery: a hammerhead, a blacktip and a zebra shark circling the toaster on its float, seen from above; little fish scatter from them, and they hunt on the drop' },
      { act: 'strength', in: 'scenery', text: "halloween in the scenery: the toaster on a broomstick across a great moon, bats, a graveyard, jack-o'-lanterns (auto picks it in October)" },
      { act: 'mini', text: 'the mini player and 9:16 work from a maximized or full-screen window too' },
    ],
  },
  {
    version: '0.4.7',
    items: [
      { act: 'strength', in: 'scenery', text: 'with the scenery on, its scenes: the lake, the sea, a campfire, the snow under the aurora, the city in the rain, a garden in blossom, a waterfall; auto picks a new one each song' },
    ],
  },
  {
    version: '0.4.6',
    items: [
      { act: 'visual', text: 'scenery, the calm one: a landscape in ASCII, night under the Milky Way or day on paper, a toaster fishing on the lake' },
      { act: 'strength', in: 'scenery', text: "with the scenery on, its colours or your theme's" },
      { key: '?', text: "what's new: this box after an update, and the latest additions at the top of the help" },
    ],
  },
  {
    version: '0.4.5',
    items: [
      { key: 'hands', text: 'portals: the first one you open shows your skull, x-ray, turning as your head turns' },
      { act: 'visual', text: "the spectrogram as a landscape in 3D; A switches the rainbow and your theme's colours" },
    ],
  },
  {
    version: '0.4.4',
    items: [
      { act: 'dropfx', text: 'drop effect "not responding": a frozen toaster.exe dragged round the screen' },
    ],
  },
  {
    version: '0.4.3',
    items: [
      { act: 'camfx', text: 'the camera as dots or voxels' },
      { act: 'glass', text: 'the glass blob in the mini player too' },
    ],
  },
];

// a.b.c against x.y.z: below 0 if a is the older
export function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

// What came in after version seen, up to version now, newest first. Not knowing what was seen (the
// versions before this list kept no note of it), just now's.
export function newsSince(seen, now) {
  return NEWS.filter((n) => cmpVersion(n.version, now) <= 0 && (seen ? cmpVersion(n.version, seen) > 0 : n.version === now));
}
