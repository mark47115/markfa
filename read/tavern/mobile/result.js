import { nativeEdition, openRun, savedRun } from './run.js';
import { awardExpeditionPack } from '../home/captain-packs.js';

async function show() {
  const saved = nativeEdition ? savedRun() : null;
  if (saved?.phase !== 'result') {
    location.replace(saved ? '../prep-landscape.html' : '../home/lobby.html');
    return;
  }
  const run = await openRun('rowan');
  const { last, round, ended } = run.state;
  const text = (id, value) => { document.getElementById(id).textContent = value; };
  text('result-round', `${round} / 15 라운드 · ${run.wave.title}`);
  text('result-title', ended ? (round === 15 && last.outcome === 'Win' ? '원정 성공' : '원정 실패') :
    { Win: '승리', Loss: '패배', Draw: '무승부' }[last.outcome]);
  text('result-allies', last.allies);
  text('result-enemies', last.enemies);
  text('result-erosion', last.erosion === last.previous ? `${last.erosion}%` : `${last.previous}% → ${last.erosion}%`);
  const next = document.getElementById('result-next');
  if (ended) {
    const reward = document.getElementById('result-pack');
    reward.hidden = false;
    try {
      await awardExpeditionPack(run.state.id, run.state.captain);
      reward.textContent = '원정 보상 · 대장 팩 1개';
    } catch {
      reward.textContent = '대장 팩을 저장하지 못했습니다.';
      next.textContent = '보상 저장 재시도';
      next.hidden = false;
      next.addEventListener('click', () => location.reload());
      return;
    }
  }
  next.hidden = false;
  next.textContent = ended ? '새 원정' : `다음 선술집 · 골드 ${round + 3}`;
  next.addEventListener('click', () => {
    if (ended) {
      if (run.clear()) location.replace('../home/lobby.html');
    } else if (run.next()) location.replace('../prep-landscape.html');
  }, { once: true });
}

show().catch(() => { document.getElementById('result-title').textContent = '전투 결과를 불러오지 못했습니다.'; });
