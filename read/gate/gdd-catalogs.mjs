import { mapSkins } from './map-skins.mjs';
import { read, el, image, figure, button, selectField, fold, plain, chips, table, entries, renderMotion } from './gdd-content.mjs';

const factionLabels = new Map([['shadow', '그림자'], ['hunter', '헌터'], ['beast', '마수'], ['enemy', '외신']]);
const factionId = name => [...factionLabels].find(([, label]) => label === name)?.[0] || 'enemy';
const types = [
  ['commander', '지휘관'], ['tower', '타워'], ['income', '인컴'], ['enemy', '외신'], ['worker', '광부'],
];
const labels = new Map(types);
const stages = ['I', 'II', 'III'];
const spritePath = sprite => sprite && 'media/unit-sprites/' + sprite.file;
const spriteVisual = sprite => figure(spritePath(sprite), sprite.name + ' 도트');
const formatted = value => value == null ? '' : Number(value.toFixed(2)).toString();
const roleLabels = {boss: '보스', stationary: '고정 목표물', normal: '일반 외신'};
const enemyStages = {I: '기본형', II: '2단계', III: '3단계'};
const motionLabels = {idle:'대기',move:'이동',attack:'공격',skill:'스킬',death:'사망'};
const commanderEffects = {
  SC01: '첫 일반 외신 처치 2회에 그림자 보병 소환',
  SC02: '처음 쓰러진 타워 부활',
  SC03: '첫 공격에 인접 타워 둘의 공격 속도 증가',
  SC04: '근접 공격을 버틴 타워의 반격 강화',
  SC05: '위기에 처한 타워 한 기 회복',
  HC01: '지휘관이 받는 첫 타격 피해 감소',
  HC02: '밀집한 적에게 불길로 범위 피해',
  HC03: '중앙을 넘은 적에게 표식과 추가 피해',
  HC04: '지휘관에게 접근한 적을 베고 속박',
  HC05: '부상당한 타워 두 기 회복 및 독 제거',
  BC01: '보호막을 약화하는 범위 숨결',
  BC02: '서리 구역으로 중앙을 넘는 적 둔화',
  BC03: '첫 근접 파견 유닛의 이동 속도 증가',
  BC04: '타격을 버틴 첫 세 적에게 독 부여',
  BC05: '낙뢰로 시전을 끊고 보스는 둔화',
};

let catalog;
export function getCatalog() {
  if (catalog) return catalog;
  catalog = Promise.all([
    read('tower-evolutions.json'), read('income-roster.json'), read('wave-enemies.json'),
    read('media/unit-sprites/manifest.json'), read('media/card-illustrations/manifest.json'),
    read('sections/gdd-unity-stats.json'), read('sections/05-commanders.md', 'text'), read('sections/04-faction-rosters.md', 'text'),
  ]).then(([towers, income, waves, sprites, art, stats, commanderNotes, towerNotes]) => {
    const notes = new Map([...entries(commanderNotes), ...entries(towerNotes)]);
    const units = new Map();
    for (const card of art.cards) {
      const tower = towers.cards.find(item => item.id === card.id);
      const dispatch = income.units.find(item => item.id === card.id);
      const forms = sprites.allies.sprites.filter(item => item.family === card.id);
      const sprite = sprites.support.sprites.find(item => item.family === card.id) || forms.at(-1);
      const item = {
        ...card, art: 'media/card-illustrations/' + card.art, tower, dispatch, sprite, forms, notes: notes.get(card.id),
        stats: stats[card.category + 's']?.[card.id] || stats[card.category]?.[card.id],
        icon: spritePath(sprite) || 'media/income-concepts/' + card.id.toLowerCase() + '.png',
      };
      units.set(item.id, item);
    }
    for (const sprite of sprites.enemies.sprites) {
      const deployments = waves.waves.flatMap(wave => wave.lineup.filter(slot => slot.unit === sprite.id)
        .map(slot => ({number: wave.number, threat: wave.threat, count: slot.count, tip: wave.tip})));
      units.set(sprite.id, {
        id: sprite.id, name: sprite.name, category: 'enemy', faction: 'enemy', icon: spritePath(sprite), sprite, deployments,
        stats: stats.enemies[sprite.id],
      });
    }
    for (const family of new Set(sprites.workers.sprites.map(sprite => sprite.family))) {
      const forms = sprites.workers.sprites.filter(sprite => sprite.family === family);
      const [sprite] = forms;
      units.set(family, {
        id: family, name: sprite.name, category: 'worker', faction: factionId(sprite.group), icon: spritePath(sprite), sprite, forms,
      });
    }
    return {units, towers, income, waves};
  }).catch(error => {
    catalog = null;
    throw error;
  });
  return catalog;
}

function cardControl(item, openUnit, extra = '') {
  const control = button('', () => openUnit(item, control), 'character-card');
  control.dataset.makImageLink = '';
  control.dataset.unit = item.id;
  control.setAttribute('aria-expanded', 'false');
  const cover = image(item.art || item.icon, '');
  cover.alt = item.name + (item.art ? ' 카드 일러스트' : ' 도트');
  if (!item.art) cover.classList.add('sprite');
  const subtitle = item.category === 'enemy'
    ? [enemyStages[item.sprite.stage], extra || (item.deployments[0] ? 'W' + item.deployments[0].number : '미편성')].join(' · ')
    : extra || [factionLabels.get(item.faction), item.tower?.rarity ?? labels.get(item.category)].join(' · ');
  const info = el('span');
  info.append(el('strong', item.name), el('small', subtitle));
  if (item.category === 'commander' && item.stats) {
    const { attackType, stats } = item.stats;
    const summary = el('span');
    summary.dataset.commanderSummary = '';
    summary.append(
      el('small', attackType + ' · 사거리 ' + formatted(stats.range) + '칸'),
      el('small', commanderEffects[item.id] || item.stats.ability),
    );
    info.append(summary);
  }
  control.append(cover, info);
  return control;
}

export async function renderCatalog(container, initial, openUnit) {
  const {units} = await getCatalog();
  const pageSize = 24;
  const choices = [...units.values()];
  const controls = el('div', null, 'catalog-controls');
  const searchLabel = el('label', '이름·ID');
  const search = el('input');
  search.type = 'search';
  search.placeholder = '캐릭터 검색';
  search.addEventListener('input', reset);
  searchLabel.append(search);
  const category = selectField('종류', [['', '전체'], ...types], reset);
  const fixedCategory = labels.has(initial) ? initial : '';
  const faction = selectField('진영', [['', '전체'], ...factionLabels], reset);
  const count = el('output');
  count.setAttribute('aria-live', 'polite');
  controls.append(searchLabel);
  if (!fixedCategory) controls.append(category.label);
  if (fixedCategory !== 'enemy') controls.append(faction.label);
  controls.append(count);
  const grid = el('div', null, 'character-grid');
  const pagination = el('div', null, 'catalog-pages');
  const position = el('span');
  let page = 0;
  const previous = button('이전', () => move(-1));
  const next = button('다음', () => move(1));
  pagination.append(previous, position, next);
  container.replaceChildren(controls, grid, pagination);
  draw();
  function reset() {
    page = 0;
    draw();
  }
  function move(direction) {
    page += direction;
    draw();
    grid.scrollIntoView({block: 'nearest'});
  }
  function draw() {
    const value = search.value.trim().toLocaleLowerCase('ko');
    const type = fixedCategory || category.input.value;
    const matching = choices.filter(item => (!type || item.category === type)
      && (!faction.input.value || item.faction === faction.input.value)
      && (item.name + ' ' + item.id).toLocaleLowerCase('ko').includes(value));
    const pages = Math.max(1, Math.ceil(matching.length / pageSize));
    count.textContent = matching.length + (type === 'enemy' ? '형태' : '종');
    const shown = matching.slice(page * pageSize, (page + 1) * pageSize);
    grid.replaceChildren(...shown.map(item => cardControl(item, openUnit)));
    if (!matching.length) grid.append(el('p', '일치하는 캐릭터가 없습니다.'));
    pagination.hidden = pages < 2;
    previous.disabled = page === 0;
    next.disabled = page + 1 === pages;
    position.textContent = (page + 1) + ' / ' + pages;
  }
}

function statChips(stats) {
  return stats && chips([
    '체력 ' + stats.hp, '피해 ' + stats.damage, '사거리 ' + formatted(stats.range) + '칸',
    '공격 ' + formatted(stats.period) + '초', stats.speed ? '이동 ' + formatted(stats.speed) : null,
    stats.size ? '충돌 크기 ' + formatted(stats.size) : null,
  ]);
}

function labelled(parent, name, value) {
  if (value == null || value === '') return;
  const line = el('p');
  line.append(el('strong', name + ' '), document.createTextNode(value));
  parent.append(line);
}

function palette(sprite) {
  const swatches = el('div', null, 'palette');
  for (const color of sprite.palette || []) {
    const chip = el('span');
    chip.style.background = color;
    chip.title = color;
    chip.setAttribute('aria-label', color);
    swatches.append(chip);
  }
  return swatches;
}

function addForm(grid, sprite, name, numbers, ability, effect, stats) {
  const form = el('article');
  if (sprite) {
    form.append(image(spritePath(sprite), name + ' 도트'), palette(sprite));
  }
  form.append(el('h4', name));
  if (numbers) form.append(el('small', numbers));
  labelled(form, ability, effect);
  if (sprite) labelled(form, '실루엣', sprite.silhouette);
  const values = statChips(stats);
  if (values) form.append(values);
  grid.append(form);
}

function artNotes(unit) {
  const original = unit.notes?.['원작 근거'];
  const data = el('div');
  labelled(data, '근거', original?.value || unit.basis);
  const refs = original?.refs?.length ? original.refs.join(' · ') : unit.sourceLabel;
  labelled(data, '출처', refs);
  if (unit.art) labelled(data, '카드 제작', '88×100 도트 · 레벨 ' + unit.level + ' · ' + unit.colors + '색 · ' + unit.artEdition + '판');
  return data;
}

function motionFold(item) {
  const ids = item.category === 'tower' ? item.forms.map(form => form.id) : [item.sprite?.id || item.id.toLowerCase()];
  return fold('모션 재생 · 이펙트 시트', panel => renderMotion(panel, item.category === 'tower' ? 'tower' : 'combat', ids));
}

export function characterDetail(unit, book) {
  const target = document.createDocumentFragment();
  const hero = el('div', null, 'character-hero');
  const art = figure(unit.art || unit.icon, unit.name + (unit.art ? ' 카드 일러스트' : ' 도트'));
  art.className = 'art';
  const data = el('div');
  data.append(chips([labels.get(unit.category), unit.category === 'enemy' ? null : factionLabels.get(unit.faction), unit.id]));
  hero.append(art, data);
  target.append(hero);
  if (unit.sprite && unit.art) {
    const atlas = el('div', null, 'media-grid');
    const sprite = spriteVisual(unit.sprite);
    atlas.append(sprite);
    if (unit.category === 'commander') atlas.append(figure(unit.art, unit.name + ' 카드 일러스트'));
    target.append(fold('도트 · 팔레트', panel => {
      panel.replaceChildren(atlas, palette(unit.sprite));
      labelled(panel, '실루엣', unit.sprite.silhouette);
    }));
  }

  if (unit.category === 'commander') {
    const stats = unit.stats;
    labelled(data, '직책', stats.role);
    labelled(data, '기본 공격', stats.attackName + ' · ' + stats.attackType);
    data.append(statChips(stats.stats));
    const effect = el('div');
    effect.append(el('h3', stats.ability), el('p', stats.description));
    labelled(effect, '편성 예시', unit.notes?.['편성 예시']?.value);
    target.insertBefore(effect, hero.nextSibling);
    target.append(motionFold(unit), artNotes(unit));
  } else if (unit.tower) {
    const card = unit.tower;
    data.append(chips([card.rarity, '점유 ' + card.width + '×' + card.height, '레벨 ' + unit.level]));
    const forms = el('div', null, 'character-visuals');
    card.stages.forEach((stage, index) => addForm(forms, unit.forms.find(form => form.stage === stages[index]), stage.name,
      stages[index] + ' · W' + book.towers.unlockWaves[index] + ' · 금괴 ' + book.towers.costs[card.rarity][index],
      stage.ability, stage.effect, unit.stats?.[index]));
    target.append(forms, motionFold(unit), artNotes(unit));
    const rules = unit.notes?.['게임 적용']?.value;
    if (rules) target.append(fold('능력 세부 판정', panel => panel.replaceChildren(el('p', rules))));
  } else if (unit.dispatch) {
    const card = unit.dispatch;
    const tier = book.income.tiers.find(row => row.cost === card.cost)[card.type];
    data.append(chips([card.type === 'economy' ? '이자형' : '전투형', '마력석 ' + card.cost, '이자 +' + tier.interest, '레벨 ' + unit.level]));
    labelled(data, '역할', card.role);
    data.append(chips(['체력 배율 ×' + tier.hp, '공격 배율 ×' + tier.attack]), statChips(unit.stats));
    const effect = el('div');
    labelled(effect, '혼성 설정', card.hybrid);
    labelled(effect, '능력', card.ability);
    labelled(effect, '대응', card.counter);
    labelled(effect, '실루엣', card.silhouette);
    const visuals = el('div', null, 'character-visuals');
    visuals.append(figure(unit.icon, unit.name + ' 인컴 도트'));
    target.append(effect, visuals, motionFold(unit), fold('모션 제작 메모', async panel => {
      const source = (await read('income-motion.json')).units[unit.id];
      panel.replaceChildren();
      for (const [key, value] of Object.entries(source.poses)) labelled(panel, motionLabels[key] || key, value);
      labelled(panel, '프레임', '전용 스킬 ' + source.skill.frames + ' · ' + source.attackCue);
      labelled(panel, '이펙트', source.fx.join(' · '));
    }), artNotes(unit));
  } else if (unit.category === 'enemy') {
    const stats = unit.stats;
    labelled(data, '분류', [roleLabels[stats?.role], enemyStages[unit.sprite.stage]].filter(Boolean).join(' · '));
    labelled(data, '실루엣', unit.sprite.silhouette);
    if (stats?.windup) labelled(data, '기술 예고', formatted(stats.windup) + '초');
    const values = statChips(stats?.stats);
    if (values) data.append(values);
    data.append(palette(unit.sprite));
    if (unit.deployments.length) data.append(chips(unit.deployments.map(row => 'W' + row.number + ' ×' + row.count)));
    else labelled(data, '등장', '웨이브 편성 미지정');
    target.append(motionFold(unit), fold('전투 특징과 출현 편성', async panel => {
      const media = await read('media/combat-motion/v9/manifest.json');
      const motion = media.units.find(row => row.id === unit.id);
      panel.replaceChildren();
      labelled(panel, '공격', motion?.attackLabel);
      labelled(panel, '기술', motion?.ability);
      labelled(panel, '모션', motion?.choreography);
      for (const row of unit.deployments) labelled(panel, 'W' + row.number + ' ' + row.threat, row.tip);
    }));
  } else {
    const economy = {shadow:'3 → 2 → 4', hunter:'3 → 3 → 3', beast:'3 → 4 → 2'};
    labelled(data, '광부 비용', '6 → 8 → 10 → 12, 최대 4명');
    labelled(data, '마력석 주기', economy[unit.faction] + ' 반복');
    const forms = el('div', null, 'character-visuals');
    for (const form of unit.forms) addForm(forms, form, form.name, form.stage, null, null, null);
    target.append(forms);
  }
  return target;
}

export async function renderWaves(container, openUnit) {
  const book = await getCatalog();
  const region = el('div');
  const choice = selectField('웨이브', book.waves.waves.map(wave => [wave.number, 'W' + wave.number + ' · ' + wave.threat]), draw);
  container.replaceChildren(choice.label, region);
  function draw() {
    const wave = book.waves.waves.find(item => item.number === Number(choice.input.value));
    const group = el('div', null, 'character-grid');
    for (const entry of wave.lineup) {
      const unit = book.units.get(entry.unit);
      if (unit) group.append(cardControl(unit, openUnit, entry.count + '기 출현'));
    }
    region.replaceChildren(group, el('p', wave.tip));
  }
  draw();
}

export async function renderIncomeTiers(container) {
  const data = await read('income-roster.json');
  container.classList.add('income-tables');
  container.replaceChildren(...data.types.map(type => table(
    ['마력석', '이자', '체력', '공격'],
    data.tiers.map(tier => {
      const {interest, hp, attack} = tier[type.id];
      return [tier.cost, '+' + interest, '×' + hp, '×' + attack];
    }),
    type.name,
  )));
}

export async function renderMaps(container) {
  const lore = await read('media/map-skins/README.md', 'text');
  const descriptions = lore.split(/\r?\n/).filter(line => line.startsWith('| ') && line.includes('.png)')).map(line => {
    const cells = line.split('|').slice(1, -1);
    return [cells[0].trim(), plain(cells[2].replace(/\s*\[[^\]]+\]\(https?:[^)]+\)/g, ''))];
  });
  const info = new Map(descriptions);
  const preview = el('div', null, 'media-grid portrait');
  const description = el('p');
  const movies = el('div', null, 'catalog-controls');
  const choice = selectField('전장 스킨', Object.entries(mapSkins).map(([id, map]) => [id, map.title]), draw);
  movies.append(choice.label);
  container.replaceChildren(movies, preview, description);
  function draw() {
    const map = mapSkins[choice.input.value];
    preview.replaceChildren(...[['own','내 전장'], ['opponent','상대 전장'], ['mine','광산']].map(([key, label]) =>
      figure(map.art[key], map.title + ' ' + label, label)));
    description.textContent = info.get(map.title) || map.note;
  }
  draw();
}
