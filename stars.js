// The star button at the header's start (and, in a browser, the start menu's star link): GitHub's
// logo, the project's star count, a star. The count comes from window.nc.stars() (the app asks GitHub
// from its main process; a page asks it itself) and rolls up from nothing on odometer wheels, each
// turning only as the one below it rolls over, while the star fills with gold from the bottom; on the
// count the star bursts in a spray of glyphs. Without motion: the count and the gold star as they end.
// The button fades in with its count, or without one after a few seconds (offline). In the app a click
// opens the project's page in the browser (the window itself never navigates).
const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const buttons = () => [...document.querySelectorAll('#b-star, .star-link')];

for (const a of buttons()) {
  a.addEventListener('click', (e) => {
    if (!window.nc?.openRepo) return;          // (a page: the link opens a tab)
    e.preventDefault();
    window.nc.openRepo();
  });
}

const show = () => { for (const a of buttons()) a.classList.add('ready'); };
const shown = setTimeout(show, 4000);

const wheel = (v, k) => {
  const p = 10 ** k;
  return k === 0 ? v % 10 : (Math.floor(v / p) + Math.min(1, Math.max(0, (v % p) - (p - 1)))) % 10;
};

function roll(n) {
  clearTimeout(shown);
  show();
  const stars = [...document.querySelectorAll('.star-i')], counts = [...document.querySelectorAll('.star-n')];
  const fill = (f) => { for (const s of stars) s.style.setProperty('--fill', f); };
  if (still || n === null) {
    fill(1);
    if (n !== null) for (const el of counts) el.textContent = n;
    return;
  }
  const digits = String(n).length, cols = [];
  for (const el of counts) {
    el.textContent = '';
    const said = document.createElement('span');
    said.className = 'odo-n'; said.textContent = n;
    el.append(said);
    for (let k = digits - 1; k >= 0; k--) {
      const col = document.createElement('span'), strip = document.createElement('span');
      col.className = 'odo-d'; col.setAttribute('aria-hidden', 'true');
      if (k) col.style.opacity = 0;
      strip.className = 'odo-s'; strip.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0';
      col.append(strip); el.append(col);
      // (a wheel is a line of the button's own text high, so its digits sit on the text's baseline)
      const pitch = strip.getBoundingClientRect().height / 11;
      if (pitch) col.style.height = pitch + 'px';
      cols.push({ k, col, strip, pitch });
    }
  }
  const T = 1500, t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / T), e = 1 - (1 - u) ** 3, v = n * e;
    for (const { k, col, strip, pitch } of cols) {
      strip.style.transform = pitch ? `translateY(${(-wheel(v, k) * pitch).toFixed(2)}px)` : `translateY(${(-wheel(v, k) * 1.32).toFixed(3)}em)`;
      if (k) col.style.opacity = Math.min(1, Math.max(0, v - (10 ** k - 1)));      // (no leading zeros)
    }
    fill(u);                                                                      // (filling steadily, full on the count)
    if (u < 1) requestAnimationFrame(step);
    else burst(stars);
  };
  requestAnimationFrame(step);
}

const SPARKS = ['✦', '*', '·', '+', '★', '•'];
function burst(stars) {
  for (const star of stars) {
    const r = star.getBoundingClientRect();
    if (!r.width) continue;                       // (one not showing: the start menu closed)
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'star-spark'; s.textContent = SPARKS[i % SPARKS.length];
      s.style.left = x + 'px'; s.style.top = y + 'px';
      document.body.append(s);
      const a = (i / 12 + Math.random() * 0.05) * 2 * Math.PI, d = 14 + Math.random() * 16;
      s.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)) scale(.4)`, opacity: 0 },
      ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2, .7, .3, 1)' }).onfinish = () => s.remove();
    }
    star.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
  }
}

(async () => {
  let n = null;
  try { n = await window.nc?.stars?.(); } catch { /* offline */ }
  roll(typeof n === 'number' ? n : null);
})();
