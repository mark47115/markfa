import { read, el, figure, table, renderSpec } from './gdd-content.mjs';
import { getCatalog, characterDetail, renderCatalog, renderWaves, renderIncomeTiers, renderMaps } from './gdd-catalogs.mjs';

const stack = document.querySelector('.document-stack');
const cover = document.getElementById('overview');
const searchPage = document.getElementById('documents');
const references = stack.querySelector('.reference-material');
const navigation = document.querySelector('.project-nav');
const navLinks = [...navigation.querySelectorAll('a')];
const topics = new Map([...document.querySelectorAll('template[id][data-group]')].map(template => [template.id, template]));
const sections = new Map([...document.querySelectorAll('template[data-group], template[data-topic]')].map(template => {
  const { topic, group, label, page, pageLabel } = template.dataset;
  const route = template.id || topic + '/' + page;
  return [route, {
    template, title: label ?? pageLabel, group: group ?? topics.get(topic).dataset.group,
    lead: template.content.querySelector('.reading-lead').textContent,
  }];
}));
const coreRoutes = [
  'core-loop/practice', 'setting', 'core-fun', 'core-loop/battle',
  'combat/evolution', 'income', 'income/tiers',
];
const records = new Map([['overview', {page: cover, nav: navLinks[0]}]]);
const aliases = new Map([
  ['tft-comparison', 'game-comparison'],
  ['systems', 'income'], ['development', 'build'],
  ['core-loop', 'core-loop/practice'], ['core-loop/main', 'core-loop/practice'],
  ['commanders', 'characters'], ['faction-rosters', 'characters/tower'],
  ['characters/commander', 'characters'], ['map-bm', 'environment'],
  ['props', 'direction'], ['items', 'income/rewards'], ['waves', 'combat'],
  ['tutorial', 'core-loop/practice'], ['ui/tutorial', 'core-loop/practice'],
  ['ideas', 'review'], ['notes', 'review'],
  ['playthrough', 'core-loop/practice'], ['view-comparison', 'environment/views'], ['gallery-title', 'characters'],
]);
for (const [route, {template}] of sections) {
  if (template.id && template.dataset.page) aliases.set(route + '/' + template.dataset.page, route);
}
let profile;
let routeRequest = 0;
let frame;
let activeNav = navLinks[0];

function resolveRoute(hash) {
  const route = aliases.get(hash) ?? hash;
  if (records.has(route)) return {record: records.get(route)};
  const slash = route.lastIndexOf('/');
  if (slash < 0) return {};
  const parent = route.slice(0, slash);
  const detail = route.slice(slash + 1);
  const record = records.get(aliases.get(parent) ?? parent);
  return {record, detail: record?.body ? detail : undefined};
}

function addPage(route, nav, number) {
  const {template, title} = sections.get(route);
  const page = el('section', null, 'document-page reading-page' + (number ? '' : ' reference-page'));
  page.id = route;
  const header = el('header', null, 'reading-page-heading');
  if (number) {
    const marker = el('span', String(number).padStart(2, '0'), 'document-page-number');
    marker.setAttribute('aria-hidden', 'true');
    header.append(marker);
  }
  const heading = el('h2', title);
  heading.id = route + '-heading';
  heading.tabIndex = -1;
  page.setAttribute('aria-labelledby', heading.id);
  header.append(heading);
  const scroller = el('div', null, 'sheet-scroll');
  const body = el('div', null, 'sheet-content section-inner');
  body.append(template.content.cloneNode(true));
  page.append(header, scroller);
  scroller.append(body);
  if (number) references.before(page);
  else references.append(page);
  const record = {page, nav, body};
  records.set(route, record);
  return mountSection(body, template.dataset.page);
}

function updateNavigation() {
  frame = undefined;
  const line = Math.min(160, innerHeight / 4);
  let active = navLinks[0];
  for (const record of records.values()) {
    if (record.page.getBoundingClientRect().top > line) break;
    if (record.nav) active = record.nav;
  }
  if (active === activeNav) return;
  activeNav.removeAttribute('aria-current');
  active.setAttribute('aria-current', 'location');
  activeNav = active;
}

function pushRoute(hash) {
  if (location.hash === '#' + hash) return;
  history.replaceState({...history.state, documentScroll: window.scrollY}, '');
  history.pushState(null, '', '#' + hash);
}

function moveTo(page, focus) {
  if (page === cover) window.scrollTo(0, 0);
  else page.scrollIntoView({block: 'start'});
  if (focus) page.querySelector('h1,h2,h3')?.focus({preventScroll: true});
  updateNavigation();
}

function clearProfile() {
  if (!profile) return;
  profile.trigger?.setAttribute('aria-expanded', 'false');
  profile.trigger?.removeAttribute('aria-controls');
  profile.panel.remove();
  profile = undefined;
}

function placeProfile(record, item, book, trigger) {
  const host = record.body?.querySelector('[data-character-gallery], [data-waves]');
  if (!host) return record.page;
  const id = record.page.id + '/' + item.id;
  if (profile?.panel.id === id) return profile.panel;
  clearProfile();
  const panel = el('section', null, 'catalog-profile');
  panel.id = id;
  const bar = el('div', null, 'profile-heading');
  const title = el('h3', item.name);
  title.id = id + '-heading';
  title.tabIndex = -1;
  panel.setAttribute('aria-labelledby', title.id);
  const close = el('button', '상세 닫기');
  close.type = 'button';
  close.addEventListener('click', () => {
    routeRequest++;
    clearProfile();
    history.replaceState(null, '', '#' + record.page.id);
    if (trigger?.isConnected) {
      trigger.scrollIntoView({block: 'center'});
      trigger.focus({preventScroll: true});
      updateNavigation();
    } else {
      moveTo(record.page, true);
    }
  });
  const details = el('div', null, 'profile-content');
  details.append(characterDetail(item, book));
  bar.append(title, close);
  panel.append(bar, details);
  host.before(panel);
  trigger?.setAttribute('aria-expanded', 'true');
  trigger?.setAttribute('aria-controls', panel.id);
  profile = {panel, trigger};
  return panel;
}

async function openCharacter(item, trigger) {
  const page = trigger.closest('.document-page');
  if (!page) return;
  const stamp = ++routeRequest;
  const book = await getCatalog();
  if (stamp !== routeRequest || !trigger.isConnected) return;
  const panel = placeProfile(records.get(page.id), item, book, trigger);
  pushRoute(panel.id);
  moveTo(panel, true);
}

async function showRoute(hash, {focus = false, position} = {}) {
  const stamp = ++routeRequest;
  const {record, detail} = resolveRoute(hash || 'overview');
  if (!record) return;
  let target = record.page;
  if (detail && record.body?.querySelector('[data-character-gallery], [data-waves]')) {
    const book = await getCatalog();
    if (stamp !== routeRequest) return;
    const item = book.units.get(detail);
    if (item) target = placeProfile(record, item, book);
  }
  if (target === record.page) clearProfile();
  if (Number.isFinite(position)) {
    window.scrollTo(0, position);
    updateNavigation();
  } else {
    moveTo(target, focus);
  }
}

async function mountSection(source, galleryType) {
  const hooks = [
    ['[data-character-gallery]', target => renderCatalog(target, galleryType, openCharacter)],
    ['[data-waves]', target => renderWaves(target, openCharacter)],
    ['[data-income-tiers]', renderIncomeTiers],
    ['[data-maps]', renderMaps],
    ['[data-evolution-costs]', async target => {
      const data = await read('tower-evolutions.json');
      target.replaceChildren(table(['희귀도', '소환 I', '정예 II', '최종 III'],
        Object.entries(data.costs).map(([rarity, costs]) => [rarity, ...costs])));
    }],
  ];
  for (const [selector, mount] of hooks) {
    const host = source.querySelector(selector);
    if (!host) continue;
    host.textContent = '불러오는 중…';
    try {
      await mount(host);
    } catch (error) {
      host.textContent = '자료를 불러오지 못했습니다.';
      console.error(error);
    }
  }
  for (const fold of source.querySelectorAll('details[data-spec]')) {
    if (fold.dataset.bound) continue;
    fold.dataset.bound = 'true';
    const target = fold.lastElementChild;
    fold.addEventListener('toggle', async () => {
      if (!fold.open || target.hasChildNodes()) return;
      target.textContent = '불러오는 중…';
      try {
        let spec = await read(fold.dataset.spec, 'text');
        if (fold.dataset.until) spec = spec.split(fold.dataset.until)[0];
        target.replaceChildren(renderSpec(spec));
      } catch (error) {
        target.textContent = '자료를 불러오지 못했습니다.';
        console.error(error);
      }
    });
  }
  const extras = [
    ['[data-tutorial-extra]', 'tutorial/current/', [
      ['placement.png','배치 실루엣'], ['confirm.png','배치 확정'], ['mining.png','광산 생산량'],
      ['dispatch.png','인컴 파견 실루엣'], ['opponent-combat.png','전투 중 상대 전장'], ['settlement.png','정산과 자유 배치'],
    ]],
    ['[data-gameplay-reference]', 'gameplay-review/', [
      ['legion-build.jpg','레기온 TD 2 · 00:36 배치'], ['legion-first-contact.jpg','레기온 TD 2 · 00:50 첫 접촉'],
      ['legion-leak.jpg','레기온 TD 2 · 01:30 돌파'], ['semion-countdown.jpg','세미온 TD 2 · 02:05 마감 예고'],
      ['semion-approach.jpg','세미온 TD 2 · 02:13 교전 접근'], ['semion-late-combat.jpg','세미온 TD 2 · 17:20 후반 교전'],
    ]],
    ['[data-ui-reference]', 'tutorial/current/', [
      ['tower.png','타워 편성'], ['placement.png','배치 실루엣'],
      ['settlement.png','배치 타이머'], ['combat.png','자동전투'],
    ]],
  ];
  for (const [selector, folder, files] of extras) {
    const node = source.querySelector(selector);
    if (node) node.replaceChildren(...files.map(([file, caption]) => figure('media/' + folder + file, caption, caption)));
  }
}

function buildDocumentIndex() {
  const index = document.querySelector('[data-document-index]');
  const groups = new Map();
  for (const [route, {group, title, lead, template}] of sections) {
    if (template.dataset.topic && topics.has(template.dataset.topic)) continue;
    if (!groups.has(group)) {
      const block = el('section', null, 'document-group');
      const list = el('ul', null, 'document-list');
      block.append(el('h3', group), list);
      groups.set(group, list);
      index.append(block);
    }
    const row = el('li');
    const control = el('a');
    control.href = '#' + route;
    control.append(el('strong', title), el('small', lead));
    row.append(control);
    groups.get(group).append(row);
  }
}

function bindDocumentSearch() {
  const query = document.getElementById('document-query');
  const clear = document.getElementById('document-query-clear');
  const status = document.getElementById('document-search-status');
  const results = document.querySelector('[data-search-results]');
  const index = document.querySelector('[data-document-index]');
  const entries = [...sections].map(([route, {group, title, lead, template}]) => ({
    route, group, title,
    search: [group, title, template.dataset.pageLabel, topics.get(template.dataset.topic)?.dataset.label,
      template.content.querySelector('.overview-key')?.textContent, lead, template.content.querySelector('summary')?.textContent]
      .join(' ').normalize('NFC').toLocaleLowerCase('ko'),
  }));
  function update() {
    const terms = query.value.normalize('NFC').toLocaleLowerCase('ko').match(/[\p{L}\p{N}]+/gu) ?? [];
    clear.disabled = !query.value;
    index.hidden = terms.length > 0;
    results.hidden = !index.hidden;
    status.hidden = results.hidden;
    if (results.hidden) {
      status.textContent = '';
      results.replaceChildren();
      return;
    }
    const matches = entries.filter(entry => terms.every(term => entry.search.includes(term)));
    status.textContent = matches.length ? '검색 결과 ' + matches.length + '개' : '검색 결과가 없습니다. 다른 용어로 검색하거나 지우기를 눌러 목차로 돌아가세요.';
    const list = el('ul', null, 'document-list');
    for (const entry of matches) {
      const item = el('li');
      const control = el('a');
      control.href = '#' + entry.route;
      control.append(el('strong', entry.title), el('small', entry.group));
      item.append(control);
      list.append(item);
    }
    results.replaceChildren(...(matches.length ? [list] : []));
  }
  function reset() {
    query.value = '';
    update();
    query.focus();
  }
  query.addEventListener('input', update);
  clear.addEventListener('click', reset);
  query.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing || !query.value) return;
    event.preventDefault();
    reset();
  });
  update();
}

for (const {template} of sections.values()) template.remove();
const systemsNav = navLinks.find(nav => nav.dataset.documentGroup === '시스템');
const overviewRoutes = [...sections.keys()].filter(route => sections.get(route).group === '개요');
const pending = overviewRoutes.map((route, index) => addPage(route, navLinks[0], index + 2));
pending.push(...coreRoutes.map((route, index) => addPage(route, systemsNav, index + overviewRoutes.length + 2)));
for (const nav of navLinks.slice(1)) {
  for (const [route, {group}] of sections) {
    if (group === nav.dataset.documentGroup && !coreRoutes.includes(route)) pending.push(addPage(route, nav));
  }
}
records.set('documents', {page: searchPage});
buildDocumentIndex();
bindDocumentSearch();

addEventListener('scroll', () => { frame ??= requestAnimationFrame(updateNavigation); }, {passive: true});
addEventListener('resize', () => { frame ??= requestAnimationFrame(updateNavigation); });
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]:not([download])');
  if (!link || !resolveRoute(link.hash.slice(1)).record) return;
  event.preventDefault();
  const hash = link.hash.slice(1);
  pushRoute(hash);
  void showRoute(hash, {focus: true});
});
addEventListener('hashchange', () => {
  void showRoute(location.hash.slice(1), {position: history.state?.documentScroll});
});
const opening = location.hash.slice(1);
Promise.allSettled(pending).then(() => {
  if (opening && opening === location.hash.slice(1) && !routeRequest) void showRoute(opening);
  else updateNavigation();
});
