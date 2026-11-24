import { captains as originalCaptains } from './captain-data.js';
import { commandNames } from '../mobile/company-captains.js';
import {
  buyShopProduct, captainCollection, collectionChangeKey, initializeShopStock,
  openCaptainPack, selectCaptain, shopProducts,
} from './captain-packs.js';
import { mountSettings } from './settings.js';
import { guardHomeDuringExpedition,nativeEdition } from '../mobile/run.js';
import './lobby-icons.js';

guardHomeDuringExpedition();
const captains=nativeEdition?originalCaptains.map(c=>({...c,ability:commandNames[c.id][0],type:'원정 · '+commandNames[c.id][1],
  description:commandNames[c.id][2]})):originalCaptains;

const lobby = document.querySelector('.lobby');
const homeMenu = lobby.querySelector('.home-menu');
const menuToggle = homeMenu.querySelector('.menu-toggle');
const profilePortrait = lobby.querySelector('.player-portrait');
const profileCaptain = lobby.querySelector('[data-profile-captain]');
const dialog = lobby.querySelector('.lobby-dialog');
const panels = [...dialog.querySelectorAll('[data-popup-title]')];
const popupTitle = dialog.querySelector('#popup-title');
const popupBody = dialog.querySelector('.popup-body');
const closePopup = dialog.querySelector('.popup-close');
const runLink = lobby.querySelector('#start-run');
const drawOpen = dialog.querySelector('#draw-open');
const drawCount = dialog.querySelector('#draw-pack-count');
const drawBadge = lobby.querySelector('#draw-badge');
const drawResult = dialog.querySelector('#draw-result');
const drawPortrait = dialog.querySelector('#draw-portrait');
const drawNote = dialog.querySelector('#draw-note');
const drawView = dialog.querySelector('#draw-view-captain');
let opener;
let pressedBackdrop = false;
const waitingCaptain = lobby.querySelector('.waiting-captain');
const spriteRoot = '../media/sprite-expressions/v4/png/';
let collection = await initializeShopStock().catch(() => captainCollection());
let selected = captains.find(captain => captain.id === collection.selected);
let viewed = selected;
let drawing = false;
let shopping = false;
const shopBalance = dialog.querySelector('[data-shop-balance]');
const shopStatus = dialog.querySelector('[data-shop-status]');
const currencyNames = { coins: '코인', diamonds: '다이아' };
const productButtons = shopProducts.map(product => {
  const card = document.createElement('section');
  card.className = 'content-card shop-product';
  const name = document.createElement('h3');
  name.textContent = product.name;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'equip';
  button.dataset.product = product.id;
  button.textContent = product.cost + ' ' + currencyNames[product.currency] + ' · 구매';
  button.setAttribute('aria-label', product.name + ' 구매 · ' + product.cost + ' ' + currencyNames[product.currency]);
  button.addEventListener('click', async () => {
    if (shopping) return;
    shopping = true;
    showShop();
    try {
      const updated = await buyShopProduct(product.id);
      collection = updated ?? await captainCollection();
      shopStatus.textContent = updated ? product.name + ' 구매 완료' : '재화가 부족합니다.';
      showDraw();
    } catch {
      shopStatus.textContent = '구매를 저장하지 못했습니다.';
    } finally {
      shopping = false;
      showShop();
    }
  });
  card.append(name, button);
  dialog.querySelector('[data-shop-products]').append(card);
  return button;
});
const equip = document.querySelector('#equip-captain');
mountSettings(dialog.querySelector('#panel-settings'), lobby);

function setPortrait(element, captain) {
  element.style.setProperty('--portrait', 'url("' + spriteRoot + captain.id + '.png")');
}

const captainButtons = captains.map(captain => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.captain = captain.id;
  button.setAttribute('aria-label', captain.fullName);
  const portrait = document.createElement('span');
  portrait.className = 'roster-sprite';
  portrait.setAttribute('aria-hidden', 'true');
  setPortrait(portrait, captain);
  button.append(portrait, captain.name);
  button.addEventListener('click', () => showCaptain(captain));
  document.querySelector('.captain-list').append(button);
  return button;
});

function showCaptain(captain) {
  viewed = captain;
  for (const button of captainButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.captain === viewed.id));
    button.classList.toggle('equipped', button.dataset.captain === selected.id);
    button.toggleAttribute('data-locked', !collection.owned.includes(button.dataset.captain));
  }
  setPortrait(document.querySelector('#preview-portrait'), viewed);
  document.querySelector('#preview-name').textContent = viewed.fullName;
  document.querySelector('#preview-type').textContent = viewed.type;
  document.querySelector('#preview-ability').textContent = viewed.ability;
  document.querySelector('#preview-description').textContent = viewed.description;
  document.querySelector('#preview-faction').textContent = '전용 계열 · ' + viewed.faction;
  const owned = collection.owned.includes(viewed.id);
  document.querySelector('#preview-inventory').textContent =
    `${owned ? '보유' : '미보유'} · 조각 ${collection.shards[viewed.id]}개`;
  equip.textContent = !owned ? '미보유 대장' : viewed === selected ? '현재 출정 대장' : '출정 대장으로 선택';
  equip.setAttribute('aria-disabled', String(!owned || viewed === selected));
}

function showSelection() {
  setPortrait(profilePortrait, selected);
  profileCaptain.textContent = selected.fullName;
  profileCaptain.title = selected.fullName;
  setPortrait(waitingCaptain.querySelector('.captain-sprite'), selected);
  waitingCaptain.setAttribute('aria-label', '선택한 출정 대장 · ' + selected.fullName);
  const runUrl = new URL(runLink.href);
  runUrl.searchParams.set('captain', selected.id);
  runLink.href = runUrl.href;
  showCaptain(selected);
}

function showDraw() {
  drawCount.textContent = collection.packs;
  drawBadge.textContent = collection.packs > 99 ? '99+' : collection.packs;
  drawBadge.hidden = collection.packs === 0;
  drawOpen.disabled = drawing || collection.packs === 0;
  const reward = collection.last;
  drawPortrait.hidden = drawView.hidden = !reward;
  if (!reward) {
    drawResult.textContent = collection.packs ? '대장 팩을 열어 보세요.' : '보유한 대장 팩이 없습니다.';
    drawNote.textContent = '원정을 끝내면 대장 팩 1개를 받습니다.';
    return;
  }
  const captain = captains.find(item => item.id === reward.id);
  setPortrait(drawPortrait, captain);
  drawResult.textContent = reward.shards ? `${captain.name} 조각 × ${reward.shards}` : `${captain.name} 영입`;
  drawNote.textContent = reward.shards ? '중복 대장을 조각으로 받았습니다.' : '출정 대장으로 선택할 수 있습니다.';
}

function showShop() {
  for (const balance of lobby.querySelectorAll('[data-wallet]')) {
    balance.textContent = collection[balance.dataset.wallet].toLocaleString('ko-KR');
  }
  shopBalance.textContent = '코인 ' + collection.coins.toLocaleString('ko-KR')
    + ' · 다이아 ' + collection.diamonds.toLocaleString('ko-KR');
  for (const [index, product] of shopProducts.entries()) {
    productButtons[index].disabled = shopping || collection[product.currency] < product.cost;
  }
}

function showPanel(name) {
  const panel = dialog.querySelector('#panel-' + name);
  for (const page of panels) page.hidden = page !== panel;
  popupTitle.textContent = panel.dataset.popupTitle;
  popupBody.scrollTop = 0;
}

function showPopup(button) {
  const name = button.dataset.open;
  showPanel(name);
  if (name === 'captains') showCaptain(selected);
  if (name === 'shop') {
    shopStatus.textContent = '';
    showShop();
    void refreshCollection();
  }
  if (name === 'draw') {
    showDraw();
    void refreshCollection();
  }
  opener = homeMenu.contains(button) ? menuToggle : button;
  homeMenu.open = false;
  pressedBackdrop = false;
  dialog.showModal();
  popupBody.scrollTop = 0;
}

for (const button of lobby.querySelectorAll('button[data-open]')) {
  button.addEventListener('click', () => showPopup(button));
}
document.addEventListener('click', event => {
  if (homeMenu.open && !homeMenu.contains(event.target)) homeMenu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && homeMenu.open) {
    event.preventDefault();
    homeMenu.open = false;
    menuToggle.focus({ preventScroll: true });
  }
});
closePopup.addEventListener('click', () => dialog.close());
dialog.addEventListener('pointerdown', event => {
  pressedBackdrop = event.target === dialog;
});
dialog.addEventListener('click', event => {
  if (pressedBackdrop && event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  if (!dialog.open) opener?.focus({ preventScroll: true });
});
matchMedia('(orientation: portrait) and (pointer: coarse)').addEventListener('change', event => {
  if (event.matches && dialog.open && !document.documentElement.hasAttribute('data-phone-preview')) {
    dialog.close();
  }
});
equip.addEventListener('click', async () => {
  const captain = viewed;
  if (selected === captain || !collection.owned.includes(captain.id)) return;
  const status = document.querySelector('#captain-status');
  try {
    const changed = await selectCaptain(captain.id);
    if (!changed) return;
    collection = changed;
    selected = captain;
    showSelection();
    status.textContent = '선택한 출정 대장 · ' + selected.fullName;
  } catch {
    status.textContent = '출정 대장을 저장하지 못했습니다.';
  }
});
drawOpen.addEventListener('click', async () => {
  if (drawing || collection.packs === 0) return;
  drawing = true;
  drawOpen.disabled = true;
  try {
    collection = await openCaptainPack() ?? await captainCollection();
    showCaptain(viewed);
  } catch {
    drawResult.textContent = '뽑기 결과를 저장하지 못했습니다.';
    drawNote.textContent = '다시 시도해 주세요.';
    return;
  } finally {
    drawing = false;
    drawOpen.disabled = collection.packs === 0;
  }
  showDraw();
  if (drawOpen.disabled && !drawView.hidden && dialog.open && popupTitle.textContent === '뽑기') drawView.focus();
});
drawView.addEventListener('click', () => {
  if (!collection.last) return;
  showPanel('captains');
  showCaptain(captains.find(captain => captain.id === collection.last.id));
  equip.focus({ preventScroll: true });
});
async function refreshCollection() {
  collection = await captainCollection();
  selected = captains.find(captain => captain.id === collection.selected);
  showSelection();
  showDraw();
  showShop();
}
window.addEventListener('storage', event => {
  if (event.key === collectionChangeKey || event.key === null) void refreshCollection();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) void refreshCollection();
});
showSelection();
showDraw();
showShop();
lobby.querySelector('[data-open="draw"]').disabled = false;
