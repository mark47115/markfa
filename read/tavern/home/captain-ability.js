import { captains } from './captain-data.js';

const holdTime = 450;
const moveTolerance = 10;
const details = {
  rowan: '해금된 고용 후보 두 장 중 한 장을 3골드에 고용합니다. 고용을 확정한 라운드에서 3라운드 뒤 다시 사용할 수 있습니다.',
  mire: '이 아이콘을 누르면 이번 라운드부터 최대 세 라운드의 적 편성과 권능을 확인합니다.',
  thorin: '선술집마다 한 번, 1골드로 아군 기물 하나를 점검합니다. 이번 출정에서 그 기물의 주력 공격력 +1, 최대 체력 +2.',
  sera: '선술집마다 한 번, 고용하지 않은 탁자 한 곳의 제안을 0골드로 교체합니다.',
  bryn: '선술집 강화의 최종 비용이 1골드 줄어듭니다. 최저 비용은 0골드입니다.',
  edda: '가장 앞선 아군 원본 주력이 첫 기본 공격으로 체력 피해를 받을 때, 남은 피해의 절반을 올림해 최대 3까지 막습니다.',
  lark: '전투당 한 번, 아군이 첫 기본 공격을 맞히면 같은 열에서 아직 적중하지 않은 다른 원본 아군에게 다음 기본 공격 피해 +2를 줍니다.',
  narin: '전투당 한 번, 처음 체력 40% 이하까지 떨어지고 살아남은 원본 아군 한 명의 체력을 3 회복합니다.',
  orr: '전투 6초에 공격력이 가장 높은 서로 다른 기물의 생존 원본 주력 최대 두 명에게 공격속도 +20%를 4초간 줍니다.',
  lume: '전투 3초에 아직 기본 공격을 시도하지 못한 원본 아군 한 명이 경로를 다시 잡습니다. 이동 속도 +35%가 최대 3초간 유지됩니다.',
};

export function mountCaptainAbility(stage, id, getReason, activate, info) {
  const original = captains.find(item => item.id === id) ?? captains[0];
  const captain = info ? {...original,ability:info[0],type:'원정 · '+info[1]} : original;
  const active = captain.type.endsWith('액티브');
  const opensDialog = active || captain.id === 'mire' || (info && ['lark','orr'].includes(captain.id));
  const button = stage.querySelector('.prep-captain-ability');
  const tooltip = stage.querySelector('#prep-captain-tooltip');
  const status = tooltip.querySelector('[data-captain-status]');
  stage.dataset.captain = captain.id;
  button.hidden = false;
  button.querySelector('img').src = new URL(`../media/preparation/captain-abilities/${captain.id}.png`, import.meta.url);
  button.querySelector('[data-captain-kind]').textContent = active ? '액티브' : '패시브';
  button.setAttribute('aria-label', `${captain.ability} · ${captain.type}`);
  if (opensDialog) button.setAttribute('aria-haspopup', 'dialog');
  tooltip.querySelector('[data-captain-ability-name]').textContent = captain.ability;
  tooltip.querySelector('[data-captain-type]').textContent = `${captain.name} · ${captain.type}`;
  tooltip.querySelector('[data-captain-description]').textContent = info?.[2]??details[captain.id];

  let press;
  function refresh() {
    const reason = getReason(captain);
    button.toggleAttribute('data-unavailable', active && Boolean(reason));
    status.hidden = !reason;
    status.textContent = reason;
  }
  function cancel() {
    if (press) clearTimeout(press.timer);
    press = null;
    tooltip.hidden = true;
    button.removeAttribute('data-holding');
  }
  function begin(kind, key, x, y) {
    const current = { kind, key, x, y, start: performance.now() };
    current.timer = setTimeout(() => {
      if (press !== current || button.closest('[hidden]')) return;
      current.held = true;
      refresh();
      button.setAttribute('data-holding', '');
      tooltip.hidden = false;
    }, holdTime);
    press = current;
  }
  function finish() {
    const tap = press && !press.held && performance.now() - press.start < holdTime;
    cancel();
    if (tap && opensDialog) activate(captain);
  }
  button.addEventListener('pointerdown', event => {
    if (press || !event.isPrimary || event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    begin('pointer', event.pointerId, event.clientX, event.clientY);
  });
  button.addEventListener('pointermove', event => {
    if (press?.kind === 'pointer' && press.key === event.pointerId &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > moveTolerance) cancel();
  });
  button.addEventListener('pointerup', event => {
    if (press?.kind !== 'pointer' || press.key !== event.pointerId) return;
    const bounds = button.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
    else finish();
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, event => {
      if (press?.kind === 'pointer' && press.key === event.pointerId) cancel();
    });
  }
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat && !press) begin('key', event.key);
  });
  button.addEventListener('keyup', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (press?.kind === 'key' && press.key === event.key) finish();
  });
  // Assistive activation has no preceding pointer or keyboard gesture.
  button.addEventListener('click', event => {
    if (opensDialog && event.detail === 0 && !event.pointerType && !press) activate(captain);
  });
  button.addEventListener('blur', cancel);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  refresh();
  return { cancel, refresh };
}
