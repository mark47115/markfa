import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const root = path.resolve(process.argv[2] ?? 'E:/My project/Assets/StreamingAssets/mobile-game');
const origin = 'https://appassets.androidplatform.net';
const base = origin + '/mobile-game/';
const saveKey = 'tavern-heros.mobile.run.v1';
const catalog = JSON.parse(await readFile(path.join(root, 'mobile/catalog.json')));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const seed = {
  id: 'expedition-navigation', captain: 'rowan', phase: 'prep', round: 1, level: 1, gold: 3,
  scrap: 0, erosion: 0, wins: 0, formation: 'column', deck: Array(6).fill(null), orders: [],
  offers: ['Hunt-1-0', 'Blessing-1-0', 'Guard-1-0'], factions: [0, 1, 2, 3, 4],
  waves: Array.from({ length: 15 }, (_, i) => catalog.waves.find(wave => wave.round === i + 1).id),
};

const browser = await launchBrowser();
try {
  for (const viewport of [{ width: 808, height: 360 }, { width: 852, height: 393 }, { width: 1280, height: 720 }]) {
    const touch = viewport.width < 1000;
    const page = await browser.newPage({ viewport, hasTouch: touch, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const errors = [];
    const launches = [];
    let reject = viewport.width === 808;
    page.on('pageerror', error => errors.push(error.message));
    await page.route(origin + '/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/mobile-game/launch') {
        launches.push(JSON.parse(url.searchParams.get('deployment')));
        return route.fulfill({ status: reject ? 503 : 202 });
      }
      const relative = decodeURIComponent(url.pathname).replace(/^\/(?:mobile-game\/)?/, '');
      const file = path.resolve(root, relative);
      assert.ok(file.startsWith(root + path.sep));
      const body = await readFile(file).catch(() => null);
      return route.fulfill(body ? { body, contentType: types[path.extname(file)] } : { status: 404 });
    });
    const openPrep = async () => {
      await page.waitForURL('**/prep-landscape.html*');
      await page.locator('.tavern-table').first().waitFor();
    };
    const press = button => touch ? button.tap() : button.click();
    const deploy = page.locator('[data-run-deploy]');
    const guide = page.locator('#prep-deploy-guide');
    const toDeck = page.getByRole('button', { name: '대기장으로 이동' });
    const volume = viewport.width === 808 ? { music: 35, effects: 70 } : { music: 0, effects: 0 };
    await page.goto(base + 'home/lobby.html');
    await page.locator('#start-run').waitFor();
    await page.evaluate(({ key, value, volume }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('tavern-heros:lobby-settings', JSON.stringify(volume));
    }, { key: saveKey, value: seed, volume });
    await page.goto(base + 'prep-landscape.html?captain=rowan');
    await openPrep();
    assert.equal(await deploy.isVisible(), false);
    assert.equal(await page.getByRole('button', { name: '적 예고' }).count(), 0);
    assert.equal(await page.locator('a[href*="lobby.html"]').count(), 0);
    await press(toDeck);
    assert.equal(await deploy.isDisabled(), true);
    assert.equal(await guide.isVisible(), false);
    await press(page.getByRole('button', { name: '선술집으로 이동' }));
    await press(page.getByRole('button', { name: /개울 정찰대, 고용/ }));
    await press(page.getByRole('button', { name: '고용 3골드', exact: true }));
    await press(toDeck);
    assert.equal(await deploy.isEnabled(), true);
    assert.equal(await guide.isVisible(), true);
    assert.equal(await deploy.getAttribute('aria-describedby'), 'prep-deploy-guide');
    const bounds = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { stage: rect('.prep-stage'), slots: rect('.prep-slots'), button: rect('[data-run-deploy]'),
        guide: rect('#prep-deploy-guide') };
    });
    assert.ok(bounds.button.height >= 44);
    assert.ok(Math.abs(bounds.stage.x + bounds.stage.width / 2 - bounds.button.x - bounds.button.width / 2) < 2);
    assert.ok(bounds.button.bottom < bounds.stage.bottom && bounds.slots.bottom <= bounds.button.top);
    assert.ok(bounds.guide.x >= bounds.stage.x && bounds.guide.right < bounds.button.left && bounds.guide.top >= bounds.slots.bottom);
    const launch = async button => {
      const requested = page.waitForResponse(response => response.url().startsWith(base + 'launch?'));
      if (touch) await button.tap();
      else await button.press('Enter');
      return (await requested).status();
    };
    if (reject) {
      assert.equal(await launch(deploy), 503);
      await page.getByRole('button', { name: '출정 재시도' }).waitFor();
      assert.equal(await guide.isVisible(), true);
      reject = false;
    }
    assert.equal(await launch(deploy), 202);
    assert.equal(launches.length, viewport.width === 808 ? 2 : 1);
    assert.equal(launches.at(-1).deck[0].id, 'Hunt-1-0');
    assert.equal(launches.at(-1).hasAudioSettings, true);
    assert.equal(launches.at(-1).musicVolume, volume.music);
    assert.equal(launches.at(-1).effectsVolume, volume.effects);
    await page.evaluate(({ id, round, deck, scrap }) => window.TavernRun.finish({
      id, round, outcome: 'Win', allies: 2, enemies: 0, tick: 15, deck, scrap,
    }), launches.at(-1));
    const next = page.getByRole('button', { name: '다음 선술집 · 골드 4' });
    await next.waitFor();
    assert.equal(await page.locator('.run-report-actions > *').count(), 1);
    await page.goBack();
    await next.waitFor();
    await page.goto(base + 'home/index.html');
    await next.waitFor();
    await press(next);
    await openPrep();
    await page.goto(base + 'home/lobby.html');
    await openPrep();
    await press(toDeck);
    assert.equal(await deploy.isEnabled(), true);
    assert.equal(await guide.isVisible(), false);
    await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key));
      value.round = 15;
      value.phase = 'result';
      value.ended = true;
      localStorage.setItem(key, JSON.stringify(value));
    }, saveKey);
    await page.goto(base + 'mobile/result.html');
    await press(page.getByRole('button', { name: '새 원정' }));
    await page.waitForURL('**/home/lobby.html');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), null);
    await page.locator('#start-run').waitFor();
    await press(page.locator('#start-run'));
    await openPrep();
    await press(page.locator('.tavern-table').first());
    await press(page.getByRole('button', { name: '고용 3골드', exact: true }));
    await press(toDeck);
    assert.equal(await guide.isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}×${viewport.height}: deployment, independent audio volumes, result and resume verified.`);
    await page.close();
  }
} finally {
  await browser.close();
}
