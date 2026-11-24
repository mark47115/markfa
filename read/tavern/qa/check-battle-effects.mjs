// Opens the battle-actions tab and plays every unit's basic attack and every skill (and its 2nd phase and
// alternative branch). For each it samples the loop with effects on and off and counts frames that differ,
// so a cue that draws nothing, or throws, is caught. Needs a static server for workspace/ on 8732:
//   node qa/check-battle-effects.mjs
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const URL = 'http://127.0.0.1:8732/2026-11-19_cavern-heros-25169da3/media/unit-sprites/battle-actions/index.html';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL + '#steel-1a/attack/0', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.click('#play');
const result = await page.evaluate(async () => {
  const out = [], fx = document.getElementById('fx'), canvas = document.getElementById('arena'), ctx = canvas.getContext('2d');
  const wait = () => new Promise((r) => setTimeout(r, 30));
  for (const u of battleLibrary) {
    const jobs = [['attack', 0, 0]];
    u.skills.forEach((s, i) => {
      jobs.push(['s' + i, 0, 0]);
      if (s.phase2Cues && u.forms.length > 1) jobs.push(['s' + i, 1, 0]);
      if (s.alternative) jobs.push(['s' + i, 0, 1]);
    });
    for (const [key, ph, alt] of jobs) {
      location.hash = [u.id, key, ph].join('/');
      await wait();
      if (alt) { const b = document.getElementById('branch'); b.value = '1'; b.dispatchEvent(new Event('change')); await wait(); }
      const st = window.battleState(), first = Math.min(0, ...st.cues.map((e) => e[0])), last = Math.max(...st.cues.map((e) => e[0] + e[4]));
      let lit = 0, err = null;
      const N = 14;
      for (let k = 0; k < N; k++) {
        const t = ((st.release + first + ((last - first) * k) / (N - 1)) % st.period + st.period) % st.period;
        try {
          fx.checked = false; window.battleScene(t); const a = ctx.getImageData(0, 0, 400, 180).data;
          fx.checked = true; window.battleScene(t); const b = ctx.getImageData(0, 0, 400, 180).data;
          let d = 0;
          for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) d++;
          if (d > 3) lit++;
        } catch (e) { err = String(e); break; }
      }
      out.push({ id: u.id, name: u.name, key, ph, alt, shapes: [...new Set(st.cues.map((e) => e[1]))].join('+'), lit, err });
    }
  }
  return out;
});
const bad = result.filter((r) => r.err || r.lit < 2);
console.log(`${result.length} plays (${new Set(result.map((r) => r.id)).size} units): ${result.length - bad.length} drew effects, ${bad.length} need a look`);
for (const r of bad) console.log(' ', r.id, r.name, r.key, 'phase', r.ph, r.alt ? 'alt' : '', r.shapes, 'lit', r.lit, r.err || '');
console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
await browser.close();
process.exitCode = bad.length || errors.length ? 1 : 0;
