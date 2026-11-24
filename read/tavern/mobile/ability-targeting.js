// Selection is transient. Only the final unit tap reaches the reservation API.
export function mountAbilityTargeting({ stage, board, run, closeDetail, refresh }) {
  const panel = document.createElement('div');
  panel.className = 'ability-aim';
  panel.hidden = true;
  const hint = document.createElement('p');
  hint.setAttribute('role', 'status');
  const portraits = document.createElement('div');
  portraits.className = 'aim-portraits';
  panel.append(hint, portraits);
  stage.append(panel);
  let aim, press, swallowClick = false;

  const slots = () => [...board.querySelectorAll('[data-slot]')];
  const keyAt = button => run.state.deck[Number(button.dataset.slot) - 1]?.key;
  function clear() {
    aim = press = null;
    delete stage.dataset.aiming;
    panel.hidden = true;
    portraits.replaceChildren();
    for (const button of slots()) {
      delete button.dataset.aimTarget;
      delete button.dataset.aimFirst;
    }
  }
  function finish(target, second, slot = aim.slot) {
    const kind = aim.action.kind;
    clear();
    if (run.applyAbility(slot, kind, target, second)) refresh();
  }
  function draw() {
    const { slot, action, phase, first } = aim;
    const secondary = phase === 2;
    const options = secondary ? action.second : action.choices;
    const values = new Set(options?.map(o => o.value));
    const hunt = action.kind === 'hunt';
    const reserve = action.kind.startsWith('unit:');
    const form = action.kind === 'rewardForm';
    let firstButton;
    for (const button of slots()) {
      const i = Number(button.dataset.slot) - 1;
      const key = keyAt(button);
      const isFirst = secondary && !hunt && key === first;
      const canPick = !!key && (isFirst || (!hunt && !reserve && !form &&
        (options ? values.has(key) : run.state.version === 2
          ? run.abilities(i).some(a => a.kind === action.kind && !a.reason) : i === slot)));
      button.toggleAttribute('data-aim-target', canPick);
      button.toggleAttribute('data-aim-first', isFirst);
      if (canPick && !firstButton) firstButton = button;
    }
    portraits.replaceChildren();
    if (hunt || reserve || form) {
      for (const o of options ?? []) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.aimValue = o.value;
        button.dataset.aimTarget = '';
        button.toggleAttribute('data-aim-first', secondary && o.value === first);
        const foe = hunt && run.wave.enemies.find(e => String(e.slot) === o.value);
        const art = foe ? foe.portrait ?? `media/unit-sprites/roster-v2/png/${foe.id}.png`
          : reserve ? `media/unit-sprites/battle-actions/portraits/${o.value}.png` : null;
        if (art) {
          const icon = document.createElement('span');
          icon.className = 'aim-portrait';
          icon.style.backgroundImage = `url("${art}")`;
          button.append(icon);
        }
        button.append(o.label);
        portraits.append(button);
        firstButton ??= button;
      }
    }
    hint.textContent = `${action.label} · ` + (secondary ? '두 번째 대상 선택 · 첫 대상을 다시 누르면 하나만 지정' :
      hunt ? '표식할 적을 누르세요' : reserve ? '생산할 병종을 누르세요' :
      form ? '증원 형태를 누르세요' : '강조된 기물을 누르세요');
    panel.hidden = false;
    firstButton?.focus({ preventScroll: true });
  }
  function begin(slot, action) {
    if (action.reason || run.state.phase !== 'prep') return;
    closeDetail();
    clear();
    aim = { slot, action, source:run.state.deck[slot]?.key, phase:1 };
    stage.dataset.aiming = '';
    draw();
  }
  function choose(element) {
    const button = element?.closest?.('button[data-aim-target]');
    if (!button || !(board.contains(button) || portraits.contains(button))) { clear(); return; }
    const { slot, action, phase, first, source } = aim;
    if (!source || run.state.deck[slot]?.key !== source || run.state.phase !== 'prep') { clear(); return; }
    const value = button.hasAttribute('data-aim-value') ? button.dataset.aimValue : keyAt(button);
    if (!value) { clear(); return; }
    if (phase === 2) { finish(action.choices ? first : undefined, value === first ? undefined : value); return; }
    if (action.second?.some(o => o.value !== value)) {
      aim.phase = 2; aim.first = value; draw(); return;
    }
    const receiver = run.state.version === 2 && !action.choices ? Number(button.dataset.slot)-1 : slot;
    finish(action.choices ? value : undefined, undefined, receiver);
  }

  // Consume the entire gesture: tapping the purse, Sell or Depart to cancel must
  // not also activate that control (including Android's synthetic click).
  const capture = true;
  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary) return;
    swallowClick = false;
    if (!aim) return;
    e.stopImmediatePropagation();
    press = { id:e.pointerId, x:e.clientX, y:e.clientY, hit:e.target.closest?.('button[data-aim-target]') };
  }, capture);
  document.addEventListener('pointerup', e => {
    if (!aim || press?.id !== e.pointerId) return;
    e.stopImmediatePropagation();
    const at = document.elementFromPoint(e.clientX,e.clientY)?.closest('button[data-aim-target]');
    const tapped = Math.hypot(e.clientX-press.x,e.clientY-press.y) <= 10 && at === press.hit;
    press = null; swallowClick = true;
    if (tapped) choose(at); else clear();
  }, capture);
  document.addEventListener('pointercancel', e => { if (press?.id === e.pointerId) clear(); }, capture);
  document.addEventListener('click', e => {
    if (swallowClick && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); swallowClick=false; return; }
    if (!aim) return;
    e.preventDefault(); e.stopImmediatePropagation(); choose(e.target);
  }, capture);
  document.addEventListener('keydown', e => {
    if (aim && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); clear(); }
  }, capture);
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  return {begin};
}
