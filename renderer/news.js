// What's new, newest first: each version's additions, a line each, with the key that finds it (an
// action's id, written as the key it's set to now) or a word where there's no key. After an update
// it's shown once, in a "toaster updated" box (what came in since the version last opened); the
// help keeps the last few versions' at its top.
export const NEWS = [
  {
    version: '0.4.11',
    items: [
      { act: 'strength', text: 'the koi pond in the scenery: koi seen from above, lily pads, the toaster on a pad of its own; click the water to feed them, and on the drop they all gather round the toaster' },
      { act: 'strength', text: "the festival in the scenery: the toaster DJing on a stage by a lake, beams sweeping with the bars, fireworks on the drop, the crowd's arms going up" },
      { act: 'strength', text: 'the garden redrawn: the cherry tree in full blossom, a pagoda on the hill' },
      { act: 'strength', text: 'the sharks have company: jellyfish, a fish made of code, a stingray' },
      { key: 'startup', text: "no more freezes the first time after an update: the scenery makes its scenes one at a time, the one you're looking at first" },
    ],
  },
  {
    version: '0.4.10',
    items: [
      { act: 'code', text: 'hide the code: just the visuals, for Toaster as a visualizer; the scenery opens out into the room' },
      { act: 'strength', text: "the lighthouse stands straight, its two beams sweeping round, a flare on each bar's one" },
      { act: 'strength', text: "halloween's jack-o'-lanterns carved and lit from inside, its bats with glinting eyes" },
      { act: 'strength', text: 'the sharks: a bait ball circles the float, and on the drop they charge it' },
      { act: 'strength', text: 'the waterfall redone: streams that pump with the kicks and swell on the drop, an aurora over it at night, mirrored in the pool' },
      { key: 'tempo', text: 'the beat follows a DJ mix into the next song sooner, and a lock that came out a few percent off gets put right' },
    ],
  },
  {
    version: '0.4.9',
    items: [
      { act: 'strength', text: 'the sharks hunt where you can see them: when the drop hits they stay on screen, round the float' },
      { act: 'strength', text: 'the scenery switches scenes smoothly: no more pause the first time each one shows (on Windows)' },
    ],
  },
  {
    version: '0.4.8',
    items: [
      { act: 'strength', text: 'sharks in the scenery: a hammerhead, a blacktip and a zebra shark circling the toaster on its float, seen from above; little fish scatter from them, and they hunt on the drop' },
      { act: 'strength', text: "halloween in the scenery: the toaster on a broomstick across a great moon, bats, a graveyard, jack-o'-lanterns (auto picks it in October)" },
      { act: 'mini', text: 'the mini player and 9:16 work from a maximized or full-screen window too' },
    ],
  },
  {
    version: '0.4.7',
    items: [
      { act: 'strength', text: 'with the scenery on, its scenes: the lake, the sea, a campfire, the snow under the aurora, the city in the rain, a garden in blossom, a waterfall; auto picks a new one each song' },
    ],
  },
  {
    version: '0.4.6',
    items: [
      { act: 'visual', text: 'scenery, the calm one: a landscape in ASCII, night under the Milky Way or day on paper, a toaster fishing on the lake' },
      { act: 'strength', text: "with the scenery on, its colours or your theme's" },
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
