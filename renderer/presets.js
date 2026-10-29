// Presets: a whole setup in one click, the first row of the background picker (and in Ctrl+K). Each names only what
// it sets, so everything else stays as you had it; the audio source, the camera and recording are never part of one.

export const PRESETS = [
  { id: 'live-coding', name: 'Live coding', picture: 'thumbs/preset-live-coding.webp',
    settings: { visual: 'scenery', blocks: true, blockLook: 'dominoes', codeHidden: false, theme: 'bluescreen' } },
  { id: 'visualizer', name: 'Visualizer', picture: 'thumbs/preset-visualizer.webp',
    settings: { visual: 'scenery', sceneryScene: 'auto', codeHidden: true } },
  { id: 'handheld', name: 'Handheld', picture: 'thumbs/preset-handheld.webp',
    settings: { blocks: true, blockLook: 'game', codeHidden: false, gameScreens: 'os' } },
  { id: 'japan', name: 'Japan edition', picture: 'thumbs/preset-japan.webp',
    settings: { blocks: true, blockLook: 'game', codeHidden: false, gameScreens: 'jp' } },
  { id: 'tiktok', name: 'For TikTok', picture: 'thumbs/preset-tiktok.webp',
    settings: { vertical: true, blocks: true, blockLook: 'dominoes', codeHidden: false, theme: 'whitescreen' } },
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
