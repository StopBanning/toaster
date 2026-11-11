// Presets: a whole look in one click, the first row of the background picker (and in Ctrl+K). Each always sets
// visual, blocks, orb and codeHidden, plus blockLook when blocks are on. Theme, layout, game screens and scenery
// scene change only where named; everything else stays as you had it. Audio source, camera and recording stay alone.

export const PRESETS = [
  { id: 'live-coding', name: 'Live coding', picture: 'thumbs/preset-live-coding.webp',
    settings: { visual: 'scenery', blocks: true, blockLook: 'dominoes', orb: false, codeHidden: false, theme: 'bluescreen' } },
  { id: 'visualizer', name: 'Visualizer', picture: 'thumbs/preset-visualizer.webp',
    settings: { visual: 'scenery', blocks: true, blockLook: 'dominoes', orb: false, sceneryScene: 'auto', codeHidden: true } },
  { id: 'orb', name: 'Orb', picture: 'thumbs/preset-orb.webp',
    settings: { visual: 'off', blocks: false, orb: true, codeHidden: false, theme: 'bluescreen' } },
  { id: 'handheld', name: 'Handheld', picture: 'thumbs/preset-handheld.webp',
    settings: { visual: 'off', blocks: true, blockLook: 'game', orb: false, codeHidden: false, gameScreens: 'os' } },
  { id: 'japan', name: 'Japan edition', picture: 'thumbs/preset-japan.webp',
    settings: { visual: 'off', blocks: true, blockLook: 'game', orb: false, codeHidden: false, gameScreens: 'jp' } },
  { id: 'tiktok', name: 'For TikTok', picture: 'thumbs/preset-tiktok.webp',
    settings: { vertical: true, visual: 'off', blocks: true, blockLook: 'dominoes', orb: false, codeHidden: false, theme: 'whitescreen' } },
];

// Applies what differs from `current` through the app's own setters (one per setting), the layout first: if it
// can't change, nothing else does. Says whether anything changed.
export async function applyPreset(preset, current, setters) {
  const keys = Object.keys(preset.settings).sort((a, b) => (a === 'vertical' ? -1 : b === 'vertical' ? 1 : 0));
  let changed = false;
  for (const key of keys) {
    if (current[key] === preset.settings[key]) continue;
    if (typeof setters[key] !== 'function') throw new Error('Missing preset setter: ' + key);
    if ((await setters[key](preset.settings[key])) === false) throw new Error('Could not apply ' + preset.name);
    changed = true;
  }
  return changed;
}
