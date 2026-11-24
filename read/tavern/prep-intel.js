// The catalog's faction index also selects the crest and name in both preparation views.
export const factions = [
  { name: '숲의 수호자', mechanics: ['Blessing', 'Shapeshift'], color: '#b5db8b', crest: 'M2 10V7L6 3L12 1L11 7L7 11H4L2 13L1 12L8 5Z' },
  { name: '무쇠 망치단', mechanics: ['Reforge', 'Equipment'], color: '#f0b98c', crest: 'M6 2H11L14 5L11 8L8 5L3 12L1 10L7 4L5 4Z' },
  { name: '송곳니의 자손들', mechanics: ['Hunt', 'Pursuit'], color: '#e6d59a', crest: 'M1 2H6L5 8L2 12L3 6ZM8 2H13L12 8L8 13L10 6Z' },
  { name: '황혼 기사단', mechanics: ['Guard', 'Retribution'], color: '#c7b8ff', crest: 'M2 2L7 1L12 2V7L10 10L7 13L4 10L2 7ZM5 4V7L7 10V4Z' },
  { name: '강철 군단', mechanics: ['Production', 'Overload'], color: '#9edcde', crest: 'M5 1H9V3H11V4H13V9H11V11H9V13H5V11H3V9H1V5H3V3H5ZM5 5V9H9V5Z' },
  { name: '골드웍스 상단', mechanics: ['Supply', 'Escort'], color: '#ffd578', crest: 'M2 2H10L12 4V8H4L2 4H0V3H2ZM4 9H13V10H4ZM4 11H6V13H4ZM10 11H12V13H10Z' },
  { name: '호드 군단', mechanics: ['Rage', 'Rally'], color: '#ffad9c', crest: 'M1 1L4 5L6 6H8L10 5L13 1V6L10 9V11L7 13L4 11V9L1 6Z' },
];

export const factionIndex = mechanic => factions.findIndex(faction => faction.mechanics.includes(mechanic));
export const factionOf = group => group.companyName ? {name:group.companyName,color:'#ffd578',crest:'M1 3L4 5L7 1L10 5L13 3L12 10H2ZM3 12H11V13H3Z'} :
  factions[group.faction ?? factionIndex(group.id.split('-')[0])];

export function pieceInsignia(group, slotNumber) {
  const faction = factionOf(group);
  const badge = document.createElement('span');
  badge.className = 'piece-insignia';
  badge.setAttribute('aria-hidden', 'true');
  badge.style.setProperty('--crest-color', faction.color);
  badge.innerHTML = `<svg viewBox="0 0 14 14" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${faction.crest}"/></svg>`;
  if (slotNumber !== undefined) {
    const number = document.createElement('b');
    number.textContent = slotNumber;
    badge.prepend(number);
  }
  const caption = document.createElement('span');
  caption.textContent = slotNumber === undefined ? faction.name : group.name;
  badge.append(caption);
  return badge;
}

// The standalone layout demonstrates the authored first encounter. Live runs supply their saved wave.
export const exampleWave = {
  round: 1, title: '첫 균열', power: '권능 없음',
  enemies: [{ id: 'void-274', name: '틈새 추적자', slot: 1, type: '일반', role: '근접', attack: 2, health: 2,
    description: '접힌 뒷다리를 펴며 짧게 돌진한다.' }],
};

export function mountEnemyPreview(stage, wave, onOpen) {
  const button = stage.querySelector('.prep-enemy-button');
  const dialog = stage.querySelector('.prep-enemy-dialog');
  const portrait = enemy => {
    const image = document.createElement('img');
    image.src = enemy.portrait ?? `media/unit-sprites/roster-v2/png/${enemy.id}.png`;
    image.alt = '';
    image.draggable = false;
    return image;
  };
  const featured = wave.enemies.find(enemy => enemy.type === '보스') ??
    wave.enemies.find(enemy => enemy.type === '정예') ?? wave.enemies[0];
  if (featured) button.prepend(portrait(featured));
  const enemyLabel = stage.hasAttribute('data-mobile-run') && featured ? featured.name : wave.title;
  button.querySelector('strong').textContent = enemyLabel;
  button.setAttribute('aria-label', `다음 적 · ${enemyLabel} · ${wave.round}라운드 · ${wave.title} · ${wave.power} · 상세 보기`);
  dialog.querySelector('h2').textContent = `${wave.round}라운드 · ${wave.title}`;
  const effect = wave.powerDescription?.replace(/\d+\/\d+\/\d+/g,
    ranks => ranks.split('/')[wave.powerRank - 1]);
  dialog.querySelector('.prep-enemy-power').textContent = [wave.power, effect].filter(Boolean).join(' · ');
  const list = dialog.querySelector('ul');
  for (const enemy of wave.enemies) {
    const row = document.createElement('li');
    const body = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = enemy.name + (enemy.count ? ` ×${enemy.count}` : '');
    const position = ['왼쪽', '가운데', '오른쪽'][enemy.slot % 3];
    const placement = document.createElement('small');
    placement.textContent = `${enemy.slot < 3 ? '전열' : '후열'} ${position} · ${enemy.type} · ${enemy.role}`;
    const stats = document.createElement('span');
    stats.textContent = `공격 ${enemy.attack} · 체력 ${enemy.health}`;
    const description = document.createElement('p');
    description.textContent = enemy.description;
    body.append(name, placement, stats, description);
    row.append(portrait(enemy), body);
    list.append(row);
  }
  button.addEventListener('click', () => {
    onOpen();
    dialog.showModal();
  });
}
