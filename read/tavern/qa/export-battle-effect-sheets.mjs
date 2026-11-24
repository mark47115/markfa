// Renders the battle-actions effect sheets from the tab itself: every skill (its 2nd phase and alternative
// branch too) and every unit's basic attack, effects only on a clear background, 30 fps, 4 columns of 400x180
// cells. Rewrites effects/*.png and manifest.json's fxSheets. Needs a static server for workspace/ on 8732:
//   node qa/export-battle-effect-sheets.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const card = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(card, 'media/unit-sprites/battle-actions');
const URL = 'http://127.0.0.1:8732/2026-11-19_cavern-heros-25169da3/media/unit-sprites/battle-actions/index.html';
const COLS = 4, FPS = 30, MAX = 80;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(URL + '#steel-1a/attack/0', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.click('#play');
const jobs = await page.evaluate(() => battleLibrary.flatMap((u) => [
  { id: u.id, key: 'attack', ph: 0, alt: 0, file: `effects/${u.id}-attack.png`, skill: 0 },
  ...u.skills.flatMap((s, i) => [
    { id: u.id, key: 's' + i, ph: 0, alt: 0, file: `effects/${u.id}-${i + 1}.png`, skill: i + 1 },
    ...(s.phase2Cues && u.forms.length > 1 ? [{ id: u.id, key: 's' + i, ph: 1, alt: 0, file: `effects/${u.id}-${i + 1}-p2.png`, skill: i + 1 }] : []),
    ...(s.alternative ? [{ id: u.id, key: 's' + i, ph: 0, alt: 1, file: `effects/${u.id}-${i + 1}-alt.png`, skill: i + 1 }] : []),
  ]),
]));
mkdirSync(path.join(dir, 'effects'), { recursive: true });
const clips = [];
for (const job of jobs) {
  const { url, times, release, period } = await page.evaluate(async ({ job, COLS, FPS, MAX }) => {
    location.hash = [job.id, job.key, job.ph].join('/');
    await new Promise((r) => setTimeout(r, 40));
    if (job.alt) { const b = document.getElementById('branch'); b.value = '1'; b.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 20)); }
    const st = window.battleState();
    const L = (e) => (st.unit === 'undertow-bell' && ['lane', 'wave'].includes(e[1]) ? 1400 : st.unit === 'undertow-bell' && e[1] === 'shield' ? 3000 : e[4]);
    const first = Math.min(0, ...st.cues.map((e) => e[0])), last = Math.max(...st.cues.map((e) => e[0] + L(e)));
    const n = Math.min(MAX, Math.ceil(((last - first) / 1000) * FPS) + 1), step = (last - first) / Math.max(1, n - 1);
    const times = Array.from({ length: n }, (_, i) => Math.round(st.release + first + i * step));
    const sheet = document.createElement('canvas'), cell = document.createElement('canvas');
    sheet.width = 400 * COLS; sheet.height = 180 * Math.ceil(n / COLS);
    cell.width = 400; cell.height = 180;
    const g = sheet.getContext('2d'), c = cell.getContext('2d');
    times.forEach((t, i) => {
      c.clearRect(0, 0, 400, 180);
      window.battleScene(((t % st.period) + st.period) % st.period, c, true);
      g.drawImage(cell, (i % COLS) * 400, Math.floor(i / COLS) * 180);
    });
    return { url: sheet.toDataURL('image/png'), times, release: st.release, period: st.period };
  }, { job, COLS, FPS, MAX });
  writeFileSync(path.join(dir, job.file), Buffer.from(url.split(',')[1], 'base64'));
  clips.push({ id: job.id, skill: job.skill, phase: job.ph + 1, alternative: !!job.alt, file: job.file, times, release, period });
}
await browser.close();
const manifestPath = path.join(dir, 'manifest.json'), manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.fxSheets = { cell: [400, 180], columns: COLS, timeUnit: 'ms', timestampsFrom: 'scene-start', renderer: 'pixelfx (fx-runtime.js)', note: 'skill 0 is the basic attack', clips };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(clips.length, 'sheets written');
