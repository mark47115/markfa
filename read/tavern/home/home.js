(() => {
  const growthPanel = document.querySelector('.home-panels');

  function renderGrowthPreview() {
    const showGrowth = location.hash === '#growth';
    document.documentElement.toggleAttribute('data-home-growth', showGrowth);
    growthPanel.hidden = !showGrowth;
  }

  window.addEventListener('hashchange', renderGrowthPreview);
  renderGrowthPreview();

  const captains = [
    { name: '선봉 대장', ability: '방패 진형', owned: true, level: 1, shards: 2 },
    { name: '이끼 대장', ability: '숲의 숨결', owned: false, level: 0, shards: 4 },
    { name: '태엽 대장', ability: '태엽 감기', owned: false, level: 0, shards: 0 },
  ];
  const shardsNeeded = 4;
  const duplicateShards = 2;
  const packDrops = [0, 2];
  let selected = 0;
  let focused = 0;

  const element = id => document.getElementById(id);
  const captainsDialog = element('captains');
  const packDialog = element('pack-result');
  const progressButton = element('progress-captain');
  const selectButton = element('select-captain');
  const feedback = element('captain-feedback');
  const packButton = element('open-pack');

  const rosterButtons = captains.map((captain, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => {
      focused = index;
      feedback.textContent = '';
      render();
    });
    element('roster').append(button);
    return button;
  });

  function render() {
    const active = captains[selected];
    const viewed = captains[focused];
    element('captain-summary').textContent = active.name + ' · Lv. ' + active.level;
    element('captain-progress').textContent = '대장 조각 ' + active.shards + ' / ' + shardsNeeded;
    element('pack-count').textContent = packDrops.length;
    packButton.disabled = packDrops.length === 0;

    captains.forEach((captain, index) => {
      rosterButtons[index].textContent = captain.name + (captain.owned ? ' · Lv. ' + captain.level : ' · 미보유');
      rosterButtons[index].setAttribute('aria-pressed', String(focused === index));
    });
    element('detail-name').textContent = viewed.name + (viewed.owned ? ' · Lv. ' + viewed.level : '');
    element('detail-ability').textContent = '핵심 능력 · ' + viewed.ability;
    element('fragment-label').textContent = '대장 조각 ' + viewed.shards + ' / ' + shardsNeeded;
    element('fragment-progress').max = shardsNeeded;
    element('fragment-progress').value = viewed.shards;
    progressButton.textContent = viewed.owned ? '레벨 올리기' : '대장 제작';
    progressButton.disabled = viewed.shards < shardsNeeded;
    selectButton.disabled = !viewed.owned || focused === selected;
    selectButton.textContent = focused === selected ? '출정 대장' : '출정 대장으로 선택';
  }

  function showCaptains(index) {
    focused = index;
    feedback.textContent = '';
    render();
    captainsDialog.showModal();
  }

  element('manage-captains').addEventListener('click', () => showCaptains(selected));
  progressButton.addEventListener('click', () => {
    const captain = captains[focused];
    if (captain.shards < shardsNeeded) return;
    const owned = captain.owned;
    captain.shards -= shardsNeeded;
    captain.owned = true;
    captain.level += 1;
    render();
    if (progressButton.disabled) rosterButtons[focused].focus();
    feedback.textContent = owned
      ? captain.name + '의 레벨이 ' + captain.level + '로 올랐습니다.'
      : captain.name + '을 제작했습니다.';
  });

  selectButton.addEventListener('click', () => {
    if (!captains[focused].owned) return;
    selected = focused;
    render();
    captainsDialog.close();
  });

  let lastReward = 0;
  packButton.addEventListener('click', () => {
    if (packDrops.length === 0) return;
    lastReward = packDrops.shift();
    const captain = captains[lastReward];
    if (captain.owned) {
      captain.shards += duplicateShards;
      element('pack-reward').textContent = captain.name + ' 조각 × ' + duplicateShards;
      element('pack-description').textContent = '이미 보유한 대장이 나와 조각으로 바뀌었습니다.';
    } else {
      captain.owned = true;
      captain.level = 1;
      element('pack-reward').textContent = captain.name + ' 영입';
      element('pack-description').textContent = '출정 대장으로 선택할 수 있습니다.';
    }
    render();
    packDialog.showModal();
  });

  element('view-reward-captain').addEventListener('click', () => {
    packDialog.close();
    showCaptains(lastReward);
  });
  render();
})();
