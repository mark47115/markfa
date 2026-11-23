import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const root = path.resolve(process.argv[2] ?? 'E:/My project/Assets/StreamingAssets/mobile-game');
const captureTo = process.argv[3];
const catalog = JSON.parse(await readFile(path.join(root, 'mobile/catalog.json')));
const types = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html; charset=utf-8',
  '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const browser = await launchBrowser();
const address = 'https://appassets.androidplatform.net';
const playerIds = ['rowan', 'mire', 'thorin', 'sera', 'bryn', 'edda', 'lark', 'narin', 'orr', 'lume'];
const seed = {
  id: 'captain-input-qa', phase: 'prep', round: 1, level: 1, gold: 3, erosion: 0, scrap: 0, wins: 0,
  formation: 'column', deck: Array(6).fill(null), orders: [], factions: [0, 1, 2, 3, 4],
  offers: catalog.cards.filter(card => card.tier === 1 && card.faction < 5).slice(0, 3).map(card => card.id),
  waves: Array.from({ length: 15 }, (_, i) => catalog.waves.find(wave => wave.round === i + 1).id),
};

async function open(id, settings = {}) {
  const page = await browser.newPage({ viewport: settings.viewport ?? { width: 808, height: 360 }, hasTouch: Boolean(settings.touch) });
  const request = {};
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => {
    const key = 'tavern-heros.mobile.run.v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  },
    { ...seed, captain: id, ...settings.save });
  await page.route(`${address}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/mobile-game/launch') {
      request.deployment = JSON.parse(url.searchParams.get('deployment'));
      await route.fulfill({ status: 204 });
      return;
    }
    const file = path.resolve(root, '.' + url.pathname.replace(/^\/mobile-game/, ''));
    assert.ok(file.startsWith(root + path.sep));
    const data = await readFile(file).catch(() => null);
    await route.fulfill(data ? { body: data, contentType: types[path.extname(file)] ?? 'application/octet-stream' } : { status: 404 });
  });
  await page.goto(`${address}/mobile-game/prep-landscape.html?captain=${id}`);
  const button = page.locator('.prep-captain-ability');
  const tip = page.getByRole('tooltip');
  const action = page.locator('.prep-captain-dialog');
  await button.waitFor();
  await page.waitForFunction(() => document.querySelector('.prep-captain-ability img').naturalWidth === 24);
  const box = await button.boundingBox();
  const roll = await page.locator('.prep-reroll').boundingBox();
  assert.ok(box.height >= 44 && box.y + box.height <= roll.y && Math.abs(box.x - roll.x) < 1,
    JSON.stringify({ id, box, roll }));
  return { page, button, tip, action, request, errors };
}

async function mouseHold({ page, button, tip, action }, screenshot) {
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await tip.waitFor({ state: 'visible' });
  assert.ok(!(await action.isVisible()));
  const bounds = await tip.boundingBox();
  const screen = page.viewportSize();
  assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= screen.width && bounds.y + bounds.height <= screen.height);
  const roll = await page.locator('.prep-reroll').boundingBox();
  assert.ok(bounds.x >= roll.x + roll.width);
  if (screenshot) await page.screenshot({ path: screenshot });
  await page.mouse.up();
  await tip.waitFor({ state: 'hidden' });
  assert.ok(!(await action.isVisible()));
}

const state = page => page.evaluate(() => structuredClone(window.TavernRun.state));

try {
  if (captureTo) await mkdir(captureTo, { recursive: true });
  for (const id of playerIds) {
    const view = await open(id);
    await mouseHold(view, captureTo && id === 'edda' ? path.join(captureTo, 'captain-passive-808.png') : null);
    assert.equal(await view.page.locator('#prep-stage').getAttribute('data-captain'), id);
    assert.deepEqual(view.errors, []);
    await view.page.close();
  }

  const rowan = await open('rowan', { viewport: { width: 1280, height: 720 } });
  await rowan.button.click();
  assert.ok(await rowan.action.isVisible());
  const choices = rowan.action.locator('[data-captain-choices] button');
  assert.equal(await choices.count(), 2);
  const draft = await choices.allTextContents();
  assert.equal(new Set(draft).size, 2);
  await rowan.action.getByRole('button', { name: '닫기' }).click();
  assert.equal((await state(rowan.page)).gold, 3);
  await rowan.button.focus();
  await rowan.page.keyboard.down('Space');
  await rowan.tip.waitFor({ state: 'visible' });
  await rowan.page.keyboard.up('Space');
  await rowan.tip.waitFor({ state: 'hidden' });
  assert.ok(!(await rowan.action.isVisible()));
  await rowan.button.press('Enter');
  assert.deepEqual(await choices.allTextContents(), draft);
  const offersBeforeRecruit = (await state(rowan.page)).offers;
  await choices.first().click();
  assert.equal((await state(rowan.page)).gold, 0);
  assert.deepEqual((await state(rowan.page)).offers, offersBeforeRecruit);
  assert.equal((await state(rowan.page)).deck.filter(Boolean).length, 1);
  assert.equal((await state(rowan.page)).captainAction.nextRound, 4);
  await rowan.button.click();
  assert.ok(!(await rowan.action.isVisible()));
  await mouseHold(rowan);
  await rowan.page.close();

  const sera = await open('sera', { touch: true, viewport: { width: 852, height: 393 } });
  const cdp = await sera.page.context().newCDPSession(sera.page);
  const bounds = await sera.button.boundingBox();
  const x = Math.round(bounds.x + bounds.width / 2), y = Math.round(bounds.y + bounds.height / 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sera.tip.waitFor({ state: 'visible' });
  if (captureTo) await sera.page.screenshot({ path: path.join(captureTo, 'captain-active-hold-852.png') });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sera.tip.waitFor({ state: 'hidden' });
  assert.ok(!(await sera.action.isVisible()));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sera.tip.waitFor({ state: 'visible' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await sera.tip.waitFor({ state: 'hidden' });
  assert.ok(!(await sera.action.isVisible()));
  for (const type of ['touchCancel', 'touchEnd']) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 25, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [] });
    assert.ok(!(await sera.tip.isVisible()) && !(await sera.action.isVisible()));
  }
  const before = (await state(sera.page)).offers;
  await sera.button.tap();
  await sera.action.waitFor({ state: 'visible' });
  await sera.action.locator('[data-captain-choices] button').nth(1).tap();
  const after = await state(sera.page);
  assert.equal(after.gold, 3);
  assert.deepEqual(after.offers.map((offer, index) => offer === before[index]), [true, false, true]);
  await sera.button.tap();
  assert.ok(!(await sera.action.isVisible()));
  await sera.page.getByRole('button', { name: '리롤 1골드' }).tap();
  assert.equal((await state(sera.page)).gold, 2);
  assert.deepEqual(sera.errors, []);
  await sera.page.close();

  const card = { id: seed.offers[0], key: 'chosen-piece', form: 'Human', hiredRound: 1 };
  const thorin = await open('thorin', { save: { deck: [null, card, null, null, null, null] } });
  await thorin.button.click();
  await thorin.action.locator('[data-captain-choices] button').first().click();
  assert.equal((await state(thorin.page)).gold, 2);
  await thorin.page.getByRole('button', { name: '대기장으로 이동' }).click();
  await Promise.all([
    thorin.page.waitForResponse(response => response.url().includes('deployment=')),
    thorin.page.getByRole('button', { name: '출정', exact: true }).click(),
  ]);
  assert.equal(thorin.request.deployment.inspectedSlot, 2);
  assert.equal(thorin.request.deployment.gold, 2);
  await thorin.page.close();

  const mire = await open('mire');
  await mire.button.click();
  const forecast = mire.page.getByRole('dialog', { name: '심층 관측' });
  assert.ok(await forecast.isVisible());
  assert.equal(await forecast.locator('[data-run-enemies] > li').count(), 3);
  assert.ok(await forecast.locator('[data-run-enemies]').innerText());
  await mire.page.close();
  console.log('10 icons and descriptions; hold/release, mouse, keyboard, touch/cancel, 3 active commands and Mire forecast verified.');

  const openPower = (power, extra = {}, captain = 'sera') => {
    const wave = catalog.waves.find(wave => wave.powerId === power && wave.round >= 2);
    const waves = seed.waves.map((id, i) => i + 1 === wave.round ? wave.id : id);
    const offers = catalog.cards.filter(card => card.faction < 5 && card.tier <= 4).slice(0, 5).map(card => card.id);
    return open(captain, { save: { round: wave.round, waves, offers, level: 4,
      upgradeOpenedRound: wave.round, gold: 12, ...extra } });
  };
  const runCall = (page, method, ...args) =>
    page.evaluate(({ method, args }) => window.TavernRun[method](...args), { method, args });

  const frost = await openPower('Frost', { gold: 4 });
  const firstRoll = frost.page.getByRole('button', { name: '리롤 2골드' });
  await firstRoll.click();
  assert.equal((await state(frost.page)).gold, 2);
  await frost.page.getByRole('button', { name: '리롤 1골드' }).click();
  assert.equal((await state(frost.page)).gold, 1);
  await frost.page.close();

  const seal = await openPower('Seal', {}, 'mire');
  const blocked = seal.page.getByRole('button', { name: '권능으로 봉인', exact: true });
  assert.ok(await blocked.count() > 0);
  assert.equal(await runCall(seal.page, 'buy', 4), false);
  const upgrade = seal.page.getByRole('button', { name: /선술집 레벨업/ });
  await upgrade.click();
  assert.equal((await state(seal.page)).level, 5);
  assert.equal((await state(seal.page)).gold, 3);
  assert.ok(await blocked.count() > 0);
  await seal.button.click();
  assert.match(await seal.page.locator('[data-run-enemies]').textContent(), /봉인/);
  assert.deepEqual(seal.errors, []);
  await seal.page.close();

  for (const power of ['Vortex', 'Devour']) {
    const view = await openPower(power);
    const before = await state(view.page);
    const slots = await runCall(view.page, 'affectedTables', 0);
    assert.ok(slots.length > 0);
    assert.equal(await runCall(view.page, 'buy', 0), true);
    const after = await state(view.page);
    assert.equal(after.gold, before.gold - 3);
    assert.ok(after.offers.some(Boolean));
    for (const slot of slots) {
      assert.notEqual(after.offers[slot], before.offers[slot]);
      assert.equal(after.offers[slot] === null, power === 'Devour');
    }
    assert.deepEqual(await runCall(view.page, 'affectedTables', 1), []);
    assert.ok(await runCall(view.page, 'roll'));
    assert.ok((await state(view.page)).offers.every(Boolean));
    assert.deepEqual(view.errors, []);
    await view.page.close();
  }

  const cardEffects = await openPower('None', {
    offers: ['Reforge-1-0', 'Equipment-4-0', 'Reforge-2-0'],
    deck: [{ id: 'Reforge-2-0', key: 'scrap-sale', lastDeployedRound: 1 }, ...Array(5).fill(null)],
  });
  assert.ok(await runCall(cardEffects.page, 'buy', 0));
  assert.equal((await state(cardEffects.page)).scrap, 1);
  assert.ok(await runCall(cardEffects.page, 'sell', 0));
  assert.equal((await state(cardEffects.page)).scrap, 3);
  assert.ok(await runCall(cardEffects.page, 'buy', 1));
  assert.equal((await state(cardEffects.page)).deck[0].gear, 1);
  await cardEffects.page.close();
  console.log('4 shop powers, paid level-up, enemy forecast, hire/sale scrap and opening equipment verified.');

  const earned = await openPower('None', {
    scrap: 2,
    deck: [{ id: 'Reforge-3-0', key: 'smith', golden: true }, { id: 'Reforge-2-0', key: 'recipient' },
      ...Array(4).fill(null)],
  });
  const controls = await earned.page.locator('button[data-prep-view="deck"]').isVisible();
  if (controls) await earned.page.locator('button[data-prep-view="deck"]').click();
  else await earned.page.locator('.prep-mobile-switch').click();
  const first = earned.page.locator('.prep-piece[data-slot="1"]');
  await first.click();
  await earned.page.getByRole('button', { name: '능력 사용' }).click();
  await earned.page.getByRole('button', { name: '영구 재련 대상 적용' }).click();
  await earned.page.keyboard.press('Escape');
  await Promise.all([
    earned.page.waitForResponse(response => response.url().includes('deployment=')),
    earned.page.getByRole('button', { name: '출정', exact: true }).click(),
  ]);
  assert.equal((await state(earned.page)).deck[1].reinforcements, undefined);
  const native = earned.request.deployment;
  assert.ok(native.preparation[1].fighters.some(unit => unit.id === 'reforged-shieldbearer' && unit.shield === 2));
  await earned.page.evaluate(({ id, round }) => window.TavernRun.finish({
    id, round, outcome: 'Win', allies: 2, enemies: 0, tick: 120,
    history: [
      { target: 1, rallyTargets: [], rallyBlocked: [] },
      ...Array.from({ length: 5 }, () => ({ target: -1, rallyTargets: [], rallyBlocked: [] })),
    ],
  }), native);
  await earned.page.getByRole('button', { name: /다음 선술집/ }).click();
  await earned.page.locator('.prep-captain-ability').waitFor();
  const afterReforge = await state(earned.page);
  assert.equal(afterReforge.deck[1].reinforcements[0].id, 'reforged-shieldbearer');
  assert.equal(afterReforge.scrap, 0);
  assert.equal(afterReforge.round, native.round + 1);
  assert.deepEqual(earned.errors, []);
  await earned.page.close();
  console.log('Permanent reforge through deck target selection, launch, battle receipt and next tavern verified.');

  for (const viewport of [{ width: 852, height: 393 }, { width: 808, height: 360 }]) {
    const reader = await open('rowan', { viewport, touch: true, save: {
      offers: ['Hunt-3-0', 'Blessing-1-0', 'Guard-1-0'],
    } });
    await reader.page.locator('.tavern-table').first().tap();
    const card = reader.page.locator('#prep-piece-detail');
    const help = reader.page.locator('#prep-term-panel');
    const trophy = card.getByRole('button', { name: '전리품', exact: true });
    await trophy.tap();
    await help.getByRole('heading', { name: '전리품', exact: true }).waitFor();
    const [cardBox, helpBox] = await Promise.all([card.boundingBox(), help.boundingBox()]);
    assert.ok(helpBox.x >= cardBox.x + cardBox.width - 1);
    assert.ok(helpBox.x + helpBox.width <= viewport.width && helpBox.y + helpBox.height <= viewport.height);
    if (captureTo && viewport.width === 808) await reader.page.screenshot({ path: path.join(captureTo, 'card-glossary-808.png') });
    await card.getByRole('button', { name: '표식 꿰기', exact: true }).tap();
    await help.getByRole('heading', { name: '표식 꿰기', exact: true }).waitFor();
    assert.match(await help.locator('[data-term-definition]').textContent(), /피해 4/);
    assert.equal(await trophy.getAttribute('aria-expanded'), 'false');
    await card.getByRole('button', { name: '황금 효과' }).tap();
    assert.ok(await help.isHidden());
    assert.match(await card.locator('[data-detail-effect]').textContent(), /보호막 2/);
    await trophy.tap();
    await help.getByRole('button', { name: '용어 설명 닫기' }).tap();
    assert.ok(await help.isHidden());
    assert.ok(await card.isVisible());
    assert.deepEqual(reader.errors, []);
    await reader.page.close();
  }
  console.log('Glossary and unit skill help: mobile touch, bounds, effect switch and close verified.');
} finally {
  await browser.close();
}
