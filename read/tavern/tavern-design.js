import { mountCatalog, node } from './design-catalog.mjs';
import { highlightKeyTerms } from './design-emphasis.mjs';
import { mountReferences, prefixIds } from './design-references.mjs';
import './tavern-interactive.mjs';

const overview = document.querySelector('#overview');
const sheet = document.querySelector('#design-sheet');
const dockNav = document.querySelector('.overview-index');
const coverNav = dockNav.querySelector('[data-dock-page="overview"]');
const dock = [...dockNav.querySelectorAll('[data-group-open]')];
const templates = [...document.querySelectorAll('template[data-group], template[data-topic]')];
const sources = new Map(templates.map(template => [template.id, template]));
const topics = templates.filter(template => template.dataset.group && !template.hasAttribute('data-reader'));
const pages = new Map([...overview.querySelectorAll('[data-document-page]')]
  .map(page => [page.dataset.documentPage, { page, nav: coverNav }]));
const aliases = new Map([
  ['contents', 'overview'], ['first-expedition-tutorial', 'tutorial'], ['mobile-build', 'production'],
  ['prep-demo', 'tavern'], ['combat-ai', 'combat-rules'], ['unit-sprites', 'art'], ['game-fonts', 'visual-style'],
  ['data/effects', 'data'], ['data/skills', 'data-skills'], ['data/pieces', 'data-pieces'], ['data/units', 'data-units'],
]);
let profile;

function mountGifDownloads(root) {
  for (const figure of root.querySelectorAll('figure[data-motion-clip]')) {
    const caption = figure.querySelector('figcaption');
    const filename = figure.dataset.motionClip + '.gif';
    const download = node('a', 'GIF 저장', 'motion-download');
    download.href = 'media/design-gifs/' + filename + '?download=1';
    download.download = filename;
    caption.classList.add('motion-caption');
    caption.append(download);
  }
}

function populate(record, detail) {
  record.surface?.abort();
  record.surface = new AbortController();
  const { page, source, target, body } = record;
  body.replaceChildren(source.content.cloneNode(true));
  const catalog = body.querySelector('[data-catalog]');
  if (catalog) mountCatalog(catalog, null, () => page.scrollIntoView({ block: 'start' }));
  mountReferences(body, target.dataset.view ?? detail, record.surface.signal, { inline: true });
  window.prepareMakReadingTables(body);
  highlightKeyTerms(body);
  mountGifDownloads(body);
  record.round = detail;
}

function buildPage(target, nav, number) {
  const topic = sources.get(target.dataset.topic) ?? target;
  const page = node('section', null, 'document-page reading-page');
  page.id = target.id;
  page.dataset.documentPage = target.id;
  const header = node('header', null, 'reading-page-heading');
  const index = node('span', String(number).padStart(2, '0'), 'document-page-number');
  index.setAttribute('aria-label', number + '쪽');
  const title = node('h2', target.dataset.page ?? target.dataset.label);
  title.id = page.id + '-heading';
  title.tabIndex = -1;
  page.setAttribute('aria-labelledby', title.id);
  header.append(index, title);
  const scroller = node('div', null, 'sheet-scroll');
  scroller.dataset.layout = target.dataset.layout ?? 'feature';
  const body = node('div', null, 'sheet-content');
  scroller.append(body);
  page.append(header, scroller);
  sheet.append(page);
  const record = { page, nav, target, body, source: target.dataset.view ? topic : target };
  pages.set(target.id, record);
  return record;
}

function destination(hash) {
  const [key, detail] = (aliases.get(hash) ?? hash).split('/');
  const id = key === 'enemies' && /^r\d{2}$/.test(detail ?? '') ? 'atlas' : aliases.get(key) ?? key;
  return { id, detail };
}

function clearProfile() {
  if (!profile) return;
  profile.surface.abort();
  profile.panel.remove();
  profile = undefined;
}

function openProfile(record, detail) {
  const catalog = record.body.querySelector('[data-catalog]');
  const entries = window.TavernDesignCards[catalog?.dataset.catalog];
  const item = entries?.find(entry => entry.id === detail);
  if (!item) {
    clearProfile();
    return record.page;
  }
  const id = record.page.id + '/' + detail;
  if (profile?.panel.id === id) return profile.panel;
  clearProfile();
  const panel = node('section', null, 'catalog-profile');
  panel.id = id;
  const title = node('h3', item.name);
  title.tabIndex = -1;
  title.id = record.page.id + '-profile-title';
  panel.setAttribute('aria-labelledby', title.id);
  const description = node('div');
  description.dataset.catalog = catalog.dataset.catalog;
  panel.append(title, description);
  catalog.before(panel);
  const surface = new AbortController();
  mountCatalog(description, detail, () => {});
  prefixIds(description, record.page.id + '-profile');
  mountReferences(description, detail, surface.signal, { namespace: record.page.id + '-profile' });
  window.prepareMakReadingTables(description);
  highlightKeyTerms(description);
  profile = { panel, surface };
  return panel;
}

function showRoute(hash, { focus = false, position } = {}) {
  const { id, detail } = destination(hash);
  const record = pages.get(id);
  if (!record) return;
  if (id === 'atlas' && /^r\d{2}$/.test(detail ?? '') && detail !== record.round) populate(record, detail);
  let target = record.page;
  if (detail && record.body && id !== 'atlas') target = openProfile(record, detail);
  else clearProfile();
  if (Number.isFinite(position)) window.scrollTo({ top: position });
  else if (id === 'overview') window.scrollTo(0, 0);
  else target.scrollIntoView({ block: 'start' });
  if (focus) target.querySelector('h1,h2,h3')?.focus({ preventScroll: true });
  gestureUntil = 0;
  dockScrollY = window.scrollY;
  dockNav.removeAttribute('data-scroll-hidden');
}

// Keep only one element for each hash target when the template is instanced.
for (const template of templates) template.remove();
const opening = destination(location.hash.slice(1));
window.prepareMakReadingTables(overview);
highlightKeyTerms(overview);
for (const nav of dock) {
  const group = nav.dataset.groupOpen;
  const groupTopics = topics.filter(topic => topic.dataset.group === group);
  const groupPages = [
    ...templates.filter(template => template.dataset.group === group && template.hasAttribute('data-reader')),
    ...groupTopics.flatMap(topic => [topic, ...templates.filter(template => template.dataset.topic === topic.id)]),
  ];
  nav.querySelector('.rail-number').textContent = String(pages.size + 1).padStart(2, '0');
  for (const target of groupPages) {
    const record = buildPage(target, nav, pages.size + 1);
    populate(record, opening.id === target.id && target.id === 'atlas' ? opening.detail : undefined);
  }
}
mountGifDownloads(overview);

const reversePages = [...pages.values()].reverse();
let active = coverNav;
let frame;
let dockScrollY = window.scrollY;
let gestureUntil = 0;
function trackScrollGesture() { gestureUntil = performance.now() + 700; }
function updateNavigation() {
  frame = undefined;
  const line = Math.min(160, innerHeight / 4);
  const nav = reversePages.find(({ page }) => page.getBoundingClientRect().top <= line)?.nav ?? coverNav;
  if (nav === active) return;
  active.removeAttribute('aria-current');
  nav.setAttribute('aria-current', 'location');
  active = nav;
}

addEventListener('wheel', trackScrollGesture, { passive: true });
addEventListener('touchmove', trackScrollGesture, { passive: true });
addEventListener('keydown', event => {
  if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) trackScrollGesture();
});
addEventListener('scroll', () => {
  const y = window.scrollY;
  if (Math.abs(y - dockScrollY) >= 6) {
    if (y <= 100 || y < dockScrollY) dockNav.removeAttribute('data-scroll-hidden');
    else if (performance.now() < gestureUntil) dockNav.setAttribute('data-scroll-hidden', '');
    dockScrollY = y;
  }
  frame ??= requestAnimationFrame(updateNavigation);
}, { passive: true });
addEventListener('resize', () => { frame ??= requestAnimationFrame(updateNavigation); });
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]:not([download])');
  if (!link || !pages.has(destination(link.hash.slice(1)).id)) return;
  event.preventDefault();
  if (link.hash !== location.hash) {
    history.replaceState({ ...history.state, documentScroll: window.scrollY }, '');
    history.pushState(null, '', link.hash);
  }
  showRoute(link.hash.slice(1), { focus: true });
});
addEventListener('hashchange', () => {
  showRoute(location.hash.slice(1) || 'overview', { position: history.state?.documentScroll });
});
if (opening.id && pages.has(opening.id)) showRoute(location.hash.slice(1));
updateNavigation();
