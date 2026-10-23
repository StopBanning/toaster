// D3D's compiler expands the sharks' nested constant loops into a very large shader. A bound
// read from a uniform keeps them as loops instead. WebGL initializes every linked uniform to
// zero; this one is deliberately never set, so the bounds and the order of the work are unchanged.
// Only the sharks use this; the other scenes, including their copies of the library, go in unchanged.
export function rolledSceneSource(source) {
  return source
    .replace(/(for \(int (\w+) = [^;]+; \2 <=? )(\d+)/g, (_, head, variable, bound) => `${head}${bound} + loopZero`)
    .replace('precision highp int;', 'precision highp int;\nuniform int loopZero;');
}
