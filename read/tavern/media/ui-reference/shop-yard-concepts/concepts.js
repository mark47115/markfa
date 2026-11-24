const assetRoot = '../shop-yard-concepts/';
const selectors = document.getElementById('styles');
const yard = document.getElementById('yard');
const shopToggle = document.getElementById('switch');
function applyDesign(theme) {
  const assets = assetRoot + theme.id + '/';
  for (const name of ['gold', 'reroll', 'captain', 'level']) {
    yard.querySelector('#' + name + ' img').src = assets + name + '.png';
  }
  for (const name of ['deploy','shop-wide','shop-tall']) {
    yard.style.setProperty('--' + name, 'url("' + new URL(assets + name + '.png', document.baseURI) + '")');
  }
  for (const name of ['face','edge','light']) yard.style.setProperty('--' + name, theme[name]);
  for (const button of selectors.children) button.setAttribute('aria-pressed', String(button.dataset.theme === theme.id));
  document.getElementById('material').textContent = theme.description;
  updateCaptureLinks(theme.id);
}
function updateCaptureLinks(id) {
  const suffix = yard.classList.contains('portrait') ? '-portrait' : '';
  for (const state of ['closed','open']) {
    document.getElementById(state+'-file').href = assetRoot+'screens/'+id+'-'+state+suffix+'.png';
  }
}
for (const theme of themes) {
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.theme = theme.id;
  const icon = document.createElement('img'); icon.alt = ''; icon.src = assetRoot + theme.id + '/gold.png';
  button.append(icon, document.createTextNode(theme.name));
  button.addEventListener('click', () => applyDesign(theme)); selectors.append(button);
}
new MutationObserver(() => {
  const active = selectors.querySelector('[aria-pressed="true"]');
  if (active) updateCaptureLinks(active.dataset.theme);
}).observe(yard, {attributes:true,attributeFilter:['class']});
function showShopState() {
  const open = document.getElementById('gold').getAttribute('aria-expanded') === 'true';
  shopToggle.textContent = open ? '상점 닫기' : '상점 열기';
  shopToggle.setAttribute('aria-expanded', String(open));
}
shopToggle.addEventListener('click', () => document.getElementById('gold').click());
new MutationObserver(showShopState).observe(document.getElementById('gold'), {attributes:true,attributeFilter:['aria-expanded']});
if (!new URLSearchParams(location.search).has('shop')) {
  state.open = true;
  render();
}
showShopState();
applyDesign(themes.find(t => t.id === new URLSearchParams(location.search).get('theme')) || themes[0]);
