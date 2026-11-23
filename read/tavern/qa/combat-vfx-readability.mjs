import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const workspace = new URL('../../', import.meta.url);
const card = new URL('../', import.meta.url).pathname.split('/').at(-2);
const server = await createServer({
  configFile: false,
  root: fileURLToPath(workspace),
  appType: 'mpa',
  server: { host: '127.0.0.1', port: 0, watch: null },
  optimizeDeps: { noDiscovery: true },
});

await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const url = new URL(`${card}/combat-vfx.html?unit=allies-050&mode=active&terrain=rift&dense=1&overlap=1`,
    server.resolvedUrls.local[0]);
  for (const viewport of [{ width: 1440, height: 850 }, { width: 852, height: 393 }, { width: 390, height: 850 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url.href);
    const canvas = page.locator('#vfx-canvas');
    await page.locator('#vfx-event:not([disabled])').waitFor();
    const capture = () => canvas.evaluate(element => element.toDataURL());
    const enabled = await capture();
    await page.locator('#vfx-fx').uncheck();
    assert.notEqual(await capture(), enabled);
    await page.locator('#vfx-fx').check();
    await page.locator('#vfx-cancel').click();
    assert.match(await canvas.getAttribute('aria-label'), /중단/);
    await page.locator('[data-mode=basic]').click();
    await page.locator('#vfx-event:not([disabled])').waitFor();
    assert.equal(await page.locator('#vfx-unit option').count(), 308);
    assert.deepEqual(errors, []);
    if (viewport.width===1440) {
      const coverage=await page.evaluate(async()=>{
        const {catalog}=await import('./combat-vfx-catalog.mjs');
        const {attackFlight,drawBasic,drawActive,drawPassive,drawClarity}=await import('./combat-vfx-drawing.mjs');
        const data=await Promise.all(['media/unit-sprites/roster-v2/manifest.json','media/unit-sprites/unit-motion-v10/battle-vfx-profiles.json'].map(path=>fetch(path).then(r=>r.json())));
        const units=catalog(data[0],window.tavernUnitMotionV10,data[1]);
        const layer=document.createElement('canvas');
        layer.width=480;layer.height=270;
        const ctx=layer.getContext('2d',{willReadFrequently:true});
        const counts={basic:0,active:0,passive:0};
        const minPixels={basic:Infinity,active:Infinity,passive:Infinity};
        const misses=[], forms={basic:new Set(),active:new Set(),passive:new Set()};
        function footprint(){
          const pixels=ctx.getImageData(35,35,410,200).data;
          let n=0;
          for(let i=3;i<pixels.length;i+=4)if(pixels[i])n++;
          return n;
        }
        for(const unit of units)for(const [category,items] of Object.entries({basic:unit.basic,active:unit.active?[unit.active]:[],passive:unit.passives})) {
          for(const spec of items){
            const flight=attackFlight(spec.art);
            const sample={spec,ground:[156,153],from:[174,135],dir:1,
              targets:[[196,153],[220,166]],center:[196,153],sourceCue:[156,103],
              radius:(spec.radius??0)*21,offspring:[[188,155],[179,139]],shieldLoss:[],
              dense:false,isEnemy:unit.isEnemy,flight};
            counts[category]++;
            forms[category].add(spec.art);
            let peak=0;
            for(const age of category==='basic'?[0,flight*.52,flight+29,flight+100]:[0,42,100,190]){
              ctx.clearRect(0,0,480,270);
              const frame={...sample,age};
              if(category==='basic')drawBasic(ctx,frame);
              if(category==='active') {drawActive(ctx,frame,'floor');drawActive(ctx,frame,'air');}
              if(category==='passive')drawPassive(ctx,frame);
              peak=Math.max(peak,footprint());
            }
            if(category==='active'){
              ctx.clearRect(0,0,480,270);
              const cancelled={...sample,age:-100,cancelled:true};
              for(const surface of ['floor','air']){
                drawActive(ctx,cancelled,surface);
                drawClarity(ctx,cancelled,category,surface);
              }
              if(footprint()!==0)misses.push([unit.id,spec.art,'cancel']);
            }
            if(peak<12)misses.push([unit.id,spec.art,peak]);
            minPixels[category]=Math.min(minPixels[category],peak);
          }
        }
        return {counts,minPixels,forms:Object.fromEntries(Object.entries(forms).map(([key,value])=>[key,value.size])),misses};
      });
      console.log(JSON.stringify(coverage));
      assert.deepEqual(coverage.misses,[]);
      assert.equal(coverage.counts.active,14);
    }
    console.log(JSON.stringify(viewport));
    await page.close();
  }

  const motion = await browser.newPage({ reducedMotion: 'reduce' });
  const motionUrl = new URL('ally-animation.html?unit=sprout-archer', url);
  await motion.goto(motionUrl.href);
  await motion.locator('[data-clip=attack]').click();
  const actionFrame = await motion.evaluate(() => {
    const id = document.querySelector('#motion-unit').value;
    const actor = window.tavernUnitMotionV10.units.find(unit => unit.id === id);
    return actor.attacks.find(clip => clip.key !== 'skill').eventFrame + 1;
  });
  await motion.locator('#motion-frame').evaluate((slider, frame) => {
    slider.value = frame;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }, actionFrame);
  const motionCanvas = motion.locator('.motion-native');
  const withMotionFx = await motionCanvas.evaluate(canvas => canvas.toDataURL());
  await motion.locator('#motion-effects').uncheck();
  assert.notEqual(await motionCanvas.evaluate(canvas => canvas.toDataURL()), withMotionFx);
  await motion.close();
} finally {
  await browser?.close();
  await server.close();
}
