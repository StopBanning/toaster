// Independent maximum-cardinality bipartite matching. Each reference and prediction can be
// consumed once, including when pitch constraints make chronological greedy matching wrong.
export function match(reference, prediction, accepts) {
  const edges = reference.map((r) => prediction.flatMap((p, j) => accepts(r, p) ? [j] : []));
  const owner = new Map();
  function augment(i, seen) {
    for (const j of edges[i]) {
      if (seen.has(j)) continue; seen.add(j);
      if (!owner.has(j) || augment(owner.get(j), seen)) { owner.set(j, i); return true; }
    }
    return false;
  }
  reference.forEach((_, i) => augment(i, new Set()));
  return [...owner].map(([p, r]) => [r, p]);
}
export function prf(reference, prediction, pairs) {
  const tp = pairs.length, precision = prediction.length ? tp / prediction.length : null;
  const recall = reference.length ? tp / reference.length : null;
  return { reference: reference.length, predicted: prediction.length, matched: tp, precision, recall,
    f1: reference.length + prediction.length ? 2 * tp / (reference.length + prediction.length) : null };
}
export function onsets(ref, pred, tolerance = .05, extra = () => true) {
  const pairs = match(ref, pred, (r, p) => Math.abs(r.start - p.start) <= tolerance + 1e-9 && extra(r, p));
  const errors = pairs.map(([r, p]) => (pred[p].start - ref[r].start) * 1000).sort((a, b) => a - b);
  return { ...prf(ref, pred, pairs), latencyMs: errors.length ? {
    median: errors[Math.floor(errors.length / 2)], p95: errors[Math.floor((errors.length - 1) * .95)] } : null };
}
const pc = (m) => ((m % 12) + 12) % 12;
export function notes(ref, pred, tolerance = .05) {
  const exact = (r, p) => Number.isFinite(r.midi) && Number.isFinite(p.midi) && r.midi === p.midi;
  const pitchClass = (r, p) => Number.isFinite(r.midi) && Number.isFinite(p.midi) && pc(r.midi) === pc(p.midi);
  const offsets = ref.every((r) => Number.isFinite(r.end)) && pred.every((p) => Number.isFinite(p.end));
  const result = { onset: onsets(ref, pred, tolerance), exact: onsets(ref, pred, tolerance, exact),
    pitchClass: onsets(ref, pred, tolerance, pitchClass), offset: offsets ? onsets(ref, pred, tolerance,
      (r, p) => exact(r, p) && Math.abs(r.end - p.end) <= Math.max(.05, .2 * (r.end - r.start))) : null };
  const pairs = match(ref, pred, (r, p) => Math.abs(r.start - p.start) <= tolerance && exact(r, p));
  result.durationIoU = offsets && pairs.length ? pairs.reduce((sum, [i, j]) => {
    const a = ref[i], b = pred[j]; return sum + Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
      / Math.max(1e-9, Math.max(a.end, b.end) - Math.min(a.start, b.start));
  }, 0) / pairs.length : null;
  return result;
}
export function intervals(ref, pred, duration, label = 'label') {
  const boundaries = [...new Set([0, duration, ...ref.flatMap((r) => [r.start, r.end]),
    ...pred.flatMap((p) => [p.start, p.end])].map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
  let known = 0, correct = 0, predicted = 0, noChord = 0, correctNoChord = 0;
  for (let i = 1; i < boundaries.length; i++) {
    const start = boundaries[i - 1], end = boundaries[i], t = (start + end) / 2, d = end - start;
    const r = ref.findLast((v) => v.start <= t && t < v.end), p = pred.findLast((v) => v.start <= t && t < v.end);
    if (!r || r[label] === 'unknown') continue;
    known += d;
    if (p && p[label] !== 'unknown') { predicted += d; if (p[label] === r[label]) correct += d; }
    if (p?.[label] === null) { noChord += d; if (r[label] === null) correctNoChord += d; }
  }
  return { accuracy: known ? correct / known : null, referenceSeconds: known,
    predictionCoverage: known ? predicted / known : null,
    noChordPrecision: noChord ? correctNoChord / noChord : null, predictedNoChordSeconds: noChord };
}
export function tempo(ref, pred, duration, tolerance = .04) {
  const spans = [...new Set([0, duration, ...ref.map((r) => r.start), ...pred.map((p) => p.start)])]
    .filter((t) => t >= 0 && t <= duration).sort((a, b) => a - b);
  let known = 0, exact = 0, half = 0, double = 0, locked = 0;
  const at = (xs, t) => xs.findLast((x) => x.start <= t);
  for (let i = 1; i < spans.length; i++) {
    const a = spans[i - 1], d = spans[i] - a, r = at(ref, a), p = at(pred, a);
    if (!(r?.bpm > 0)) continue;
    known += d; if (!(p?.locked && p.bpm > 0)) continue;
    locked += d; const ratio = p.bpm / r.bpm;
    if (Math.abs(ratio - 1) <= tolerance) exact += d;
    else if (Math.abs(ratio / .5 - 1) <= tolerance) half += d;
    else if (Math.abs(ratio / 2 - 1) <= tolerance) double += d;
  }
  return { exact: known ? exact / known : null, half: known ? half / known : null,
    double: known ? double / known : null, locked: known ? locked / known : null,
    firstLock: pred.find((p) => p.locked)?.start ?? null, referenceSeconds: known };
}
export function macro(values) {
  const v = values.filter((x) => x !== null && Number.isFinite(x));
  return { value: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length };
}

export function confusion(refByPart, predByPart, tolerance = .05) {
  const ref = Object.entries(refByPart).flatMap(([part, xs]) => xs.map((x) => ({ ...x, part })));
  const pred = Object.entries(predByPart).flatMap(([part, xs]) => xs.map((x) => ({ ...x, part })));
  const correct = match(ref, pred, (r, p) => r.part === p.part && Math.abs(r.start - p.start) <= tolerance);
  const usedR = new Set(correct.map(([i]) => i)), usedP = new Set(correct.map(([, j]) => j));
  const remainingR = ref.filter((_, i) => !usedR.has(i)), remainingP = pred.filter((_, j) => !usedP.has(j));
  const cross = match(remainingR, remainingP, (r, p) => Math.abs(r.start - p.start) <= tolerance);
  const cells = {};
  for (const [i, j] of correct) { const key = ref[i].part + ' -> ' + pred[j].part; cells[key] = (cells[key] ?? 0) + 1; }
  for (const [i, j] of cross) { const key = remainingR[i].part + ' -> ' + remainingP[j].part; cells[key] = (cells[key] ?? 0) + 1; }
  return { cells, missed: remainingR.length - cross.length, extra: remainingP.length - cross.length,
    method: 'class-preserving matches first, then cross-class residual matching at 50ms' };
}
