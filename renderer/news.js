// What's new, newest first: each version's additions, a line each, with the key that finds it (an
// action's id, written as the key it's set to now) or a word where there's no key. After an update
// it's shown once, in a "toaster updated" box (what came in since the version last opened); the
// help keeps the last few versions' at its top.
export const NEWS = [
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
