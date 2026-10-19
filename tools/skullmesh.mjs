// Makes renderer/models/skull.bin, the portals' skull, from Khronos's glTF sample "ScatteringSkull"
// (Vladimir Petkovic, CC0; github.com/KhronosGroup/glTF-Sample-Assets, its
// Models/ScatteringSkull/glTF-Binary/ScatteringSkull.glb). Its 189,000 triangles made lighter:
// every point within a cell (CELL metres a side, in the model's own metres) merged into one at their
// middle, the triangles that fall to a line or a point dropped (and any made twice), and which way
// the surface faces at each point worked out again from the triangles round it. Written as: how
// many points and triangle corners, and the points' bounds (8 floats); the points (3 uint16 each,
// across the bounds); the normals (3 int8 each); the triangles (uint16); each part starting on a
// multiple of 4 bytes. portal.js reads it.
//   node tools/skullmesh.mjs <ScatteringSkull.glb> [cell, metres: 0.005]
import { readFileSync, writeFileSync } from 'node:fs';

const [from, cellArg = '0.005'] = process.argv.slice(2);
if (!from) { console.error('usage: node tools/skullmesh.mjs <ScatteringSkull.glb> [cell]'); process.exit(1); }
const CELL = Number(cellArg);
const out = new URL('../renderer/models/skull.bin', import.meta.url);

// the .glb: its JSON, then its binary chunk; the first mesh's points and triangles, as data
const glb = readFileSync(from);
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
const bin = glb.subarray(20 + jsonLength + 8);
const read = (accessor) => {
  const a = gltf.accessors[accessor], view = gltf.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
  if (view.byteStride && view.byteStride !== comps * T.BYTES_PER_ELEMENT) throw new Error('interleaved points: not handled');
  const start = bin.byteOffset + (view.byteOffset || 0) + (a.byteOffset || 0);
  return new T(bin.buffer.slice(start, start + a.count * comps * T.BYTES_PER_ELEMENT));
};
const prim = gltf.meshes[0].primitives[0];
const P = read(prim.attributes.POSITION), I = read(prim.indices);
// (moved to where its node puts it)
const move = gltf.nodes.find((n) => n.mesh === 0)?.translation || [0, 0, 0];
const count = P.length / 3;
for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] += move[k];

// the points merged by cell, each at the middle of those in it
const cellOf = new Int32Array(count), cells = new Map(), sums = [];
for (let i = 0; i < count; i++) {
  const key = `${Math.floor(P[i * 3] / CELL)},${Math.floor(P[i * 3 + 1] / CELL)},${Math.floor(P[i * 3 + 2] / CELL)}`;
  let c = cells.get(key);
  if (c === undefined) { c = sums.length; cells.set(key, c); sums.push([0, 0, 0, 0]); }
  cellOf[i] = c;
  const s = sums[c];
  s[0] += P[i * 3]; s[1] += P[i * 3 + 1]; s[2] += P[i * 3 + 2]; s[3]++;
}
const n = sums.length;
if (n > 65535) throw new Error(`${n} points: too many for uint16 triangles; use a bigger cell`);
const V = new Float32Array(n * 3);
sums.forEach((s, c) => { V[c * 3] = s[0] / s[3]; V[c * 3 + 1] = s[1] / s[3]; V[c * 3 + 2] = s[2] / s[3]; });
const tris = [], made = new Set();
for (let f = 0; f < I.length; f += 3) {
  const a = cellOf[I[f]], b = cellOf[I[f + 1]], c = cellOf[I[f + 2]];
  if (a === b || b === c || a === c) continue;
  const key = [a, b, c].sort((x, y) => x - y).join(',');
  if (made.has(key)) continue;
  made.add(key);
  tris.push(a, b, c);
}

// each point's normal: the triangles round it, the bigger counting more
const N = new Float32Array(n * 3);
for (let f = 0; f < tris.length; f += 3) {
  const [a, b, c] = [tris[f], tris[f + 1], tris[f + 2]];
  const u = [0, 1, 2].map((k) => V[b * 3 + k] - V[a * 3 + k]), v = [0, 1, 2].map((k) => V[c * 3 + k] - V[a * 3 + k]);
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  for (const p of [a, b, c]) for (let k = 0; k < 3; k++) N[p * 3 + k] += cross[k];
}

const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], V[i * 3 + k]); max[k] = Math.max(max[k], V[i * 3 + k]); }
const pos = new Uint16Array(n * 3), nor = new Int8Array(n * 3 + ((4 - ((n * 3) % 4)) % 4));
for (let i = 0; i < n; i++) {
  const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
  for (let k = 0; k < 3; k++) {
    pos[i * 3 + k] = Math.round(((V[i * 3 + k] - min[k]) / (max[k] - min[k])) * 65535);
    nor[i * 3 + k] = Math.round((N[i * 3 + k] / l) * 127);
  }
}
const parts = [new Float32Array([n, tris.length, ...min, ...max]), pos, new Uint8Array((4 - (pos.byteLength % 4)) % 4), nor, new Uint16Array(tris)];
const file = Buffer.concat(parts.map((p) => Buffer.from(p.buffer)));
writeFileSync(out, file);
console.log(`${count} points to ${n}, ${I.length / 3} triangles to ${tris.length / 3}: ${(file.length / 1024).toFixed(0)} KB`);
