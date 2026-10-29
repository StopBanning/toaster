// The first visit's hints: one at a time, for the three keys worth knowing first (V, P and Z), a
// while after the code starts. A hint goes when its key is pressed or it's clicked, or after 7
// seconds; one that couldn't show within two minutes of its time is dropped. Touch screens and
// people who have used Toaster before get none.
// This is only the rule, on a clock in seconds: no timers, storage or page. app.js runs it, shows
// the hint and remembers when they're all done.

export const HINTS = [
  { id: 'visual', at: 10, body: 'changes the background: scenes, worlds, chrome…' },
  { id: 'blocks', at: 30, body: 'switches the code look: dominoes, the handheld game' },
  { id: 'code', at: 50, body: 'hides the code, for a visualizer on its own' },
];
const KEYS = { visual: 'V', blocks: 'P', code: 'Z' }; // unless they've been changed
const SHOWN_FOR = 7; // seconds a hint stays up
const LATE = 120; // seconds after its time that a hint can still show

export const initialHints = () => ({ started: null, done: [], active: null, shownAt: null });

export function advanceHints(previous, { now, hasCode = false, action, dismiss = false, blocked = false, touch = false, enabled = true, keys = {} }) {
  const s = { ...previous, done: [...previous.done] };
  const finish = (id) => {
    if (id && !s.done.includes(id)) s.done.push(id);
    if (s.active === id) { s.active = null; s.shownAt = null; }
  };
  if (touch || !enabled) {
    HINTS.forEach((h) => finish(h.id));
    return { state: s, hint: null, complete: true };
  }
  if (action) finish(HINTS.find((h) => h.id === action)?.id);
  if (dismiss && s.active) finish(s.active);
  if (s.started === null && hasCode) s.started = now;
  if (s.active && now - s.shownAt >= SHOWN_FOR) finish(s.active);
  if (s.started !== null) {
    for (const h of HINTS) if (!s.done.includes(h.id) && now - s.started > h.at + LATE) finish(h.id);
    const next = HINTS.find((h) => !s.done.includes(h.id));
    if (!s.active && next && now - s.started >= next.at && !blocked) { s.active = next.id; s.shownAt = now; }
  }
  const hint = HINTS.find((h) => h.id === s.active);
  const key = hint ? keys[hint.id] || KEYS[hint.id] : null;
  return {
    state: s,
    hint: hint && !blocked ? { ...hint, key, text: key + ' ' + hint.body } : null,
    complete: s.done.length === HINTS.length,
  };
}
