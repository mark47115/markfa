const catalog = window.TavernDesignCards;
const section = { captains: 'captains-and-units', pieces: 'pieces', units: 'art' };
const browse = new Map();
const captainStatus = item => item.planned ? '원정 연동 예정' : '원정 적용';

export function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function information(item, type) {
  if (type === 'captains') return item.type;
  if (type === 'pieces') return [item.faction, item.tier + '등급'].join(' · ');
  return [item.side === 'enemy' ? '공허군' : '아군', item.mode].filter(Boolean).join(' · ');
}

function image(item) {
  const art = node('img');
  art.src = item.art;
  art.alt = item.name + ' 모션';
  art.width = 176;
  art.height = 194;
  art.loading = 'lazy';
  art.decoding = 'async';
  return art;
}

function card(item, type) {
  const box = node('a', null, 'catalog-card');
  box.href = '#' + section[type] + '/' + item.id;
  box.setAttribute('aria-label', item.name);
  box.dataset.makImageLink = '';
  if (item.side === 'enemy') box.dataset.enemy = '';
  const text = node('span', null, 'catalog-card-copy');
  text.append(node('strong', item.name), node('small', information(item, type)));
  if (type === 'captains') {
    const ability = node('span', null, 'catalog-ability');
    ability.id = 'captain-' + item.id + '-ability';
    ability.append(node('span', item.ability), node('small', captainStatus(item)));
    const description = node('span', item.shortDescription, 'catalog-ability-summary');
    description.id = 'captain-' + item.id + '-summary';
    box.setAttribute('aria-describedby', ability.id + ' ' + description.id);
    text.append(ability, description);
  }
  box.append(image(item), text);
  return box;
}

function related(type, ids) {
  const grid = node('div', null, 'catalog-grid catalog-related');
  for (const id of ids) {
    const entry = catalog[type].find(item => item.id === id);
    if (entry) grid.append(card(entry, type));
  }
  return grid;
}

function block(root, title, text) {
  if (!text) return;
  const group = node('section', null, 'catalog-fact');
  group.append(node('h4', title), node('p', text));
  root.append(group);
}

function effectTable(abilities) {
  const table = node('table', null, 'compact-table catalog-effect-table');
  table.setAttribute('aria-label', '효과');
  const header = table.createTHead().insertRow();
  for (const title of ['구분', '조건과 효과']) {
    const cell = node('th', title);
    cell.scope = 'col';
    header.append(cell);
  }
  const body = table.createTBody();
  for (const [title, description] of abilities) {
    const row = body.insertRow();
    const label = node('th', title);
    label.scope = 'row';
    row.append(label, node('td', description));
  }
  return table;
}

function detail(root, type, item) {
  const back = node('a', '← 목록', 'catalog-back');
  back.href = '#' + section[type];
  const hero = node('div', null, 'catalog-detail');
  const picture = node('figure', null, 'catalog-portrait');
  const download = node('a', 'GIF 저장');
  download.href = item.art + '?download=1';
  download.download = item.art.split('/').at(-1);
  const caption = node('figcaption', type === 'captains' ? '문서용 초상 모션' : type === 'pieces' ? '대표 유닛 모션' : '유닛 모션');
  caption.append(download);
  picture.append(image(item), caption);
  const copy = node('div', null, 'catalog-copy');
  const meta = [information(item, type), type === 'captains' ? captainStatus(item) : item.planned && '설계',
    item.training && '훈련 전용', type === 'captains' && item.faction];
  if (type === 'pieces') meta.push(item.mechanic, item.price + '골드');
  copy.append(node('p', meta.filter(Boolean).join(' · '), 'catalog-meta'));
  const [intro, ...story] = item.concept.split(/(?<=\.)\s/);
  block(copy, '콘셉트', intro);
  if (type === 'units') {
    const stats = [item.equipment, item.attack != null && '공격력 ' + item.attack,
      item.health != null && '체력 ' + item.health, item.guard > 0 && '시작 보호막 ' + item.guard];
    block(copy, '전투 정보', stats.filter(Boolean).join(' · '));
  }
  if (type === 'captains') block(copy, item.ability, item.description);
  else if (item.abilities.length) copy.append(effectTable(item.abilities));
  else if (type === 'units' && item.mode) block(copy, '기본 공격', item.mode);
  if (item.condition) block(copy, item.side === 'enemy' ? '출전 편성' : '합류 조건', item.condition);
  hero.append(picture, copy);
  root.append(back, hero);
  if (story.length) {
    const details = node('details', null, 'reading-notes');
    details.append(node('summary', '이야기'), node('p', story.join(' ')));
    root.append(details);
  }
  if (type === 'pieces') {
    for (const [name, ids] of item.forms) root.append(node('h4', name + ' 편성'), related('units', ids));
    if (item.owner) root.append(node('h4', '소속 대장'), related('captains', [item.owner]));
  } else if (item.pieces.length) {
    root.append(node('h4', type === 'captains' ? '전용 기물' : '소속 기물'), related('pieces', item.pieces));
  }
  if (type === 'units') {
    const frames = node('details');
    frames.dataset.reference = 'ally-animation.html';
    frames.dataset.unitId = item.id;
    frames.append(node('summary', '동작별 재생·프레임 조작'));
    root.append(frames);
  }
}

export function mountCatalog(root, id, onPage) {
  const type = root.dataset.catalog;
  const items = catalog[type];
  if (id) {
    const item = items.find(item => item.id === id);
    if (item) { detail(root, type, item); return; }
  }
  const filters = node('div', null, 'catalog-controls');
  const search = node('input');
  search.type = 'search';
  search.placeholder = '이름·ID로 검색';
  search.setAttribute('aria-label', '이름·ID로 검색');
  const select = node('select');
  select.setAttribute('aria-label', type === 'units' ? '진영' : '계열');
  select.append(new Option('전체', ''));
  if (type === 'units') select.append(new Option('아군', 'ally'), new Option('공허군', 'enemy'));
  if (type === 'pieces') {
    for (const [label, planned] of [['일반 계열', false], ['대장 전용 계열 · 설계', true]]) {
      const group = node('optgroup');
      group.label = label;
      const factions = new Set(items.filter(item => Boolean(item.planned) === planned).map(item => item.faction));
      group.append(...Array.from(factions, faction => new Option(faction, faction)));
      select.append(group);
    }
  }
  select.hidden = type === 'captains';
  const count = node('span');
  count.setAttribute('role', 'status');
  filters.append(search, select, count);
  const grid = node('div', null, 'catalog-grid');
  const pager = node('div', null, 'motion-pages');
  const prev = node('button', '이전');
  const next = node('button', '다음');
  const counter = node('span');
  pager.append(prev, counter, next);
  const state = browse.get(type) ?? { page: 0, search: '', filter: '' };
  browse.set(type, state);
  search.value = state.search;
  select.value = state.filter;
  const size = 24;
  function render() {
    const term = state.search.trim().toLocaleLowerCase('ko');
    const filtered = items.filter(item =>
      (!state.filter || (item.side ?? item.faction) === state.filter)
      && [item.name, item.id, item.faction].some(value => value?.toLocaleLowerCase('ko').includes(term)));
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    state.page = Math.min(state.page, pages - 1);
    grid.replaceChildren(...filtered.slice(state.page * size, (state.page + 1) * size).map(item => card(item, type)));
    if (!filtered.length) grid.append(node('p', '검색 결과가 없습니다.'));
    count.textContent = filtered.length + (type === 'captains' ? '명' : type === 'pieces' ? '장' : '종');
    prev.disabled = !state.page;
    next.disabled = state.page === pages - 1;
    counter.textContent = (state.page + 1) + ' / ' + pages;
    pager.hidden = pages === 1;
  }
  function reset() {
    state.page = 0;
    state.search = search.value;
    state.filter = select.value;
    render();
  }
  search.addEventListener('input', reset);
  select.addEventListener('change', reset);
  for (const [button, move] of [[prev, -1], [next, 1]]) {
    button.addEventListener('click', () => { state.page += move; render(); onPage(); });
  }
  root.append(filters, grid, pager);
  render();
}
