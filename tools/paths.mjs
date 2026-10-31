import path from 'node:path';
import os from 'node:os';

export function scratch(...parts) {

  const root = process.env.TOASTER_SCRATCH || (process.platform === 'win32' ? 'D:' + '/work/scratch' : path.join(os.homedir(), 'work/scratch'));
  return path.resolve(root, ...parts);
}
// Relative baseline inputs belong to scratch; absolute inputs remain valid.
// Legacy Windows scratch paths are relocated when read on another machine.
export function inputPath(value) {
  const portable = value.replaceAll('\\', '/');
  const legacy = /^D:\/work\/scratch\/(.*)$/i.exec(portable);
  if (legacy) return scratch(legacy[1]);
  if (path.isAbsolute(value) || path.win32.isAbsolute(value)) return value;
  return scratch(portable);
}
export function readBaseline(file) {
  return JSON.parse(file, (key, value) => ['source', 'truthPath', 'audio'].includes(key) && typeof value === 'string' ? inputPath(value) : value);
}
