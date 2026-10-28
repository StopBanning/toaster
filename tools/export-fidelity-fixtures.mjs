import fs from 'node:fs';
import assert from 'node:assert/strict';
const data = (s) => 'data:text/javascript,' + encodeURIComponent(s);
const source = (name) => fs.readFileSync(new URL('../renderer/' + name, import.meta.url), 'utf8');
const engine = data(source('engine.js'));
const codegen = data(source('codegen.js').replace("'./engine.js'", JSON.stringify(engine)));
export const tape = await import(data(source('tape.js').replace("'./engine.js'", JSON.stringify(engine)).replace("'./codegen.js'", JSON.stringify(codegen))));
export const grid = (...on) => Array.from({ length: 16 }, (_, s) => on.includes(s));
export const bar = (extra = {}) => ({ parts: { bd: grid(0, 4, 8, 12) }, chord: null, bass: null, ...extra });
export const chord = { root: 0, third: 4, name: 'C' };
export const musicalBar = () => bar({ chord, bass: 36, parts: { bd: grid(0, 4, 8, 12), bass: grid(0, 8), vox: { on: grid(2), tok: Array(16).fill('0') } } });
export function midiNotes(bytes, wantedTrack) {
  const b = Buffer.from(bytes), ppq = b.readUInt16BE(12);
  let p = 14, index = 0;
  while (p < b.length) {
    assert.equal(b.toString('ascii', p, p + 4), 'MTrk');
    const end = p + 8 + b.readUInt32BE(p + 4); p += 8;
    if (index++ !== wantedTrack) { p = end; continue; }
    const variable = () => { let n = 0, v; do { v = b[p++]; n = (n << 7) | (v & 127); } while (v & 128); return n; };
    let tick = 0;
    const active = new Map(), result = [];
    while (p < end) {
      tick += variable(); const status = b[p++];
      if (status === 255) { p++; const length = variable(); p += length; continue; }
      assert.ok((status & 240) === 128 || (status & 240) === 144);
      const note = b[p++], velocity = b[p++], key = (status & 15) + ':' + note;
      if ((status & 240) === 144 && velocity) active.set(key, [...(active.get(key) || []), { tick, velocity }]);
      else { const starts = active.get(key); const begin = starts?.shift(); assert.notEqual(begin, undefined); result.push({ note, begin: begin.tick / (4 * ppq), end: tick / (4 * ppq), velocity: begin.velocity }); if (!starts.length) active.delete(key); }
    }
    assert.equal(active.size, 0, 'all MIDI notes end');
    return result.sort((a, z) => a.begin - z.begin || a.note - z.note);
  }
  throw Error('missing MIDI track');
}
