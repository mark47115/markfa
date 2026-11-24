// Records one GIF per battle-actions unit from the tab itself: its basic attack, then each skill (and a boss's
// 2nd-phase skills), on the battlefield with a caption, 20 fps, cropped to the action and doubled (nearest).
// Writes media/pixelfx/battle-gifs/<id>.gif. Needs ffmpeg and a static server for workspace/ on 8732:
//   node qa/export-battle-effect-gifs.mjs [unit ids...]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const card = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(card, 'media/pixelfx/battle-gifs');
const URL = 'http://127.0.0.1:8732/2026-11-19_cavern-heros-25169da3/media/unit-sprites/battle-actions/index.html';
const FPS = 20, CW = 300, CH = 130, BAR = 14;
mkdirSync(outDir, { recursive: true });

function gif(file, frames) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-vf', `scale=iw*2:ih*2:flags=neighbor,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`, file]);
    ff.on('error', reject);
    ff.on('close', (code) => (code ? reject(new Error('ffmpeg ' + code)) : resolve()));
    for (const f of frames) ff.stdin.write(Buffer.from(f.split(',')[1], 'base64'));
    ff.stdin.end();
  });
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(URL + '#steel-1a/attack/0', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.click('#play');
const only = process.argv.slice(2);
const units = await page.evaluate(() => battleLibrary.map((u) => ({ id: u.id, skills: u.skills.length, p2: u.forms.length > 1 ? u.skills.map((s, i) => (s.phase2Cues ? i : -1)).filter((i) => i >= 0) : [] })));
let done = 0;
for (const u of units) {
  if (only.length && !only.includes(u.id)) continue;
  const segments = [['attack', 0], ...Array.from({ length: u.skills }, (_, i) => ['s' + i, 0]), ...u.p2.map((i) => ['s' + i, 1])];
  const frames = [];
  for (const [key, ph] of segments) {
    const list = await page.evaluate(async ({ id, key, ph, FPS, CW, CH, BAR }) => {
      location.hash = [id, key, ph].join('/');
      await new Promise((r) => setTimeout(r, 60));
      const st = window.battleState(), canvas = document.getElementById('arena');
      const unit = battleLibrary.find((x) => x.id === id), skill = key === 'attack' ? null : unit.skills[Number(key.slice(1))];
      const special = (e) => (id === 'undertow-bell' ? ({ lane: 1400, wave: 1400, shield: 3000 })[e[1]] : 0);
      const first = Math.min(0, ...st.cues.map((e) => e[0])), last = Math.max(...st.cues.map((e) => e[0] + (special(e) || e[4])));
      const from = st.release + first - 250, to = st.release + last + 250, n = Math.ceil(((to - from) / 1000) * FPS);
      const cx = st.enemy ? 95 : 15, cy = 40;
      const out = document.createElement('canvas');
      out.width = CW; out.height = CH + BAR;
      const g = out.getContext('2d');
      g.imageSmoothingEnabled = false;
      const label = `${unit.name} · ${skill ? skill.name + (ph ? ' (2페이즈)' : '') : unit.role === '지원' ? '기본 치유' : '기본 공격'}`;
      const urls = [];
      for (let i = 0; i <= n; i++) {
        const t = from + (i * 1000) / FPS;
        window.battleScene(((t % st.period) + st.period) % st.period);
        g.fillStyle = '#231b26'; g.fillRect(0, 0, CW, BAR);
        g.fillStyle = '#f3e6c8'; g.font = '600 10px Body, sans-serif'; g.textBaseline = 'middle';
        g.fillText(label, 5, BAR / 2 + 1);
        g.drawImage(canvas, cx, cy, CW, CH, 0, BAR, CW, CH);
        urls.push(out.toDataURL('image/png'));
      }
      return urls;
    }, { id: u.id, key, ph, FPS, CW, CH, BAR });
    frames.push(...list);
  }
  await gif(path.join(outDir, `${u.id}.gif`), frames);
  done++;
  if (done % 10 === 0) console.log(done, 'gifs');
}
await browser.close();
console.log(done, 'gifs written to', path.relative(card, outDir));
