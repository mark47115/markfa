(() => {
  const generalFactions = [
    '숲의 수호자', '무쇠 망치단', '송곳니의 자손들', '황혼 기사단',
    '강철 군단', '골드웍스 상단', '호드 군단',
  ];
  const captains = [
    { name: '용병대장', unit: '교대 방패병' },
    { name: '균열 학자', unit: '묘비 해독자' },
    { name: '정비공', unit: '현장 조립공' },
  ];
  const generalFactionCount = 5;
  const exclusiveTier = 3;
  const exclusiveStation = 3;

  // Each row shows example tiers at the original shop capacity for that level.
  const stations = ['back-left', 'back-right', 'front-center', 'front-right', 'front-left'];
  const lineups = [
    [1, 1, 1],
    [1, 1, 1, 2],
    [1, 1, 2, 3],
    [1, 4, 2, 3, 4],
    [5, 4, 2, 3, 4],
  ];
  const levelButtons = [...document.querySelectorAll('[data-level]')];
  const template = document.querySelector('#room-template');
  const status = document.querySelector('#level-status');
  const captainSelect = document.querySelector('#preview-captain');
  const factionList = document.querySelector('#run-factions');
  const exclusiveBadge = document.querySelector('#captain-faction');
  const runStatus = document.querySelector('#run-status');
  let level = 1;
  let run;

  const views = [...document.querySelectorAll('.room')].map(room => {
    room.append(template.content.cloneNode(true));
    const desktop = room.classList.contains('desktop');
    if (!desktop) room.querySelector('.team').append(room.querySelector('.shop-action'));
    const upgrade = room.querySelector('.upgrade');
    upgrade.addEventListener('click', () => {
      if (level < lineups.length) showLevel(level + 1);
    });
    return {
      label: room.querySelector('.tavern-level'),
      count: room.querySelector('.table-count'),
      range: room.querySelector('.tier-range'),
      next: room.querySelector('.next'),
      tables: room.querySelector('.stations'),
      order: desktop ? [0, 1, 4, 2, 3] : [0, 1, 2, 3, 4],
      upgrade,
    };
  });

  function makeTable(tier, stationIndex) {
    const exclusive = stationIndex === exclusiveStation && tier === exclusiveTier;
    const station = stations[stationIndex];
    const faction = exclusive ? run.exclusiveFaction : run.general[(stationIndex + level - 1) % run.general.length];
    const table = document.createElement('li');
    table.dataset.station = station;
    table.dataset.faction = faction;
    table.dataset.tier = String(tier);
    if (station === 'back-left') table.dataset.selected = '';
    const name = document.createElement('span');
    name.className = 'station-name';
    name.textContent = exclusive ? run.captain.unit : faction;
    const meta = document.createElement('span');
    meta.className = 'station-meta';
    meta.textContent = tier + '등급 · ' + (exclusive ? '대장 전용' : '일반 기물 예시');
    table.append(name, meta);
    return table;
  }

  function showLevel(value) {
    level = value;
    const lineup = lineups[level - 1];
    const nextLineup = lineups[level];
    const label = '선술집 Lv. ' + level;
    const count = '고용 테이블 ' + lineup.length + '개';
    const range = '등장 기물 ' + (level === 1 ? '1등급' : '1~' + level + '등급');
    const nextTier = '다음 Lv. ' + (level + 1) + ' · ' + (level + 1) + '등급 해금';
    const next = nextLineup && nextLineup.length > lineup.length
      ? nextTier + ' · 테이블 1개 추가'
      : nextTier;
    for (const button of levelButtons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level));
    }
    for (const view of views) {
      view.label.textContent = label;
      view.count.textContent = count;
      view.range.textContent = range;
      view.next.textContent = nextLineup ? next : '모든 기물 등급과 테이블 개방';
      view.upgrade.textContent = nextLineup ? '레벨 올리기' : '최대 레벨';
      view.upgrade.setAttribute('aria-disabled', String(!nextLineup));
      const tables = view.order.filter(index => index < lineup.length)
        .map(index => makeTable(lineup[index], index));
      view.tables.replaceChildren(...tables);
    }
    status.textContent = [label, count, range].join(', ');
  }

  for (const button of levelButtons) {
    button.addEventListener('click', () => showLevel(Number(button.dataset.level)));
  }

  function startRun() {
    const remaining = generalFactions.slice();
    const general = Array.from({ length: generalFactionCount }, () => {
      const index = Math.floor(Math.random() * remaining.length);
      return remaining.splice(index, 1)[0];
    });
    const captain = captains[captainSelect.selectedIndex];
    run = { general, captain, exclusiveFaction: captain.name + ' 전용' };
    factionList.replaceChildren(...general.map(faction => {
      const item = document.createElement('li');
      item.textContent = faction;
      return item;
    }));
    exclusiveBadge.textContent = run.exclusiveFaction;
    runStatus.textContent = '일반 계열 ' + general.join(', ') + '. 대장 전용 계열 ' + run.exclusiveFaction;
    showLevel(1);
  }

  for (const captain of captains) {
    captainSelect.add(new Option(captain.name));
  }
  document.querySelector('#new-run').addEventListener('click', startRun);
  startRun();
})();
