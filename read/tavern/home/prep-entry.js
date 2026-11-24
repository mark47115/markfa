import { drawTavernIcon } from './lobby-icons.js';
import { mountCaptainAbility } from './captain-ability.js';
import { nativeEdition, openRun } from '../mobile/run.js';

for (const canvas of document.querySelectorAll('.prep-mobile-switch canvas')) {
  drawTavernIcon(canvas, canvas.dataset.icon);
}

async function mount() {
  window.TavernCaptainControl = mountCaptainAbility;
  if (nativeEdition) {
    const captain = new URLSearchParams(location.search).get('captain') ?? 'rowan';
    const run = await openRun(captain);
    window.TavernRun = run;
    if (run.state.phase === 'result') {
      location.replace(new URL('../mobile/result.html', import.meta.url));
      return;
    }
  }
  await import('../prep-preview.js');
  if (window.TavernRun?.state.phase === 'battle') await window.TavernRun.launch();
}

mount().catch(() => {
  const stage = document.querySelector('.prep-demo');
  const message = document.createElement('p');
  message.textContent = '원정을 열지 못했습니다.';
  message.setAttribute('role', 'alert');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'run-button';
  retry.textContent = '다시 시도';
  retry.addEventListener('click', () => location.reload());
  stage.replaceChildren(message, retry);
});

