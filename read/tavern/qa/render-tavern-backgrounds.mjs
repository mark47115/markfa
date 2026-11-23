import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const art = new URL('../media/preparation/modular-tavern/', import.meta.url);
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  for (const format of ['', 'mobile/']) {
    const output = new URL('rendered/' + format, art);
    await mkdir(output, { recursive: true });

    for (let level = 1; level <= 5; level++) {
      const name = 'tavern-' + level + '.png';
      const original = await readFile(new URL(format + name, art));
      const texture = await page.evaluate(async source => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + source;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth / 2;
        canvas.height = image.naturalHeight / 2;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const bitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = bitmap.data;
        // Match the large sprite pixels and keep the room's orange lights in the background.
        for (let i = 0; i < pixels.length; i += 4) {
          const luma = .24 * pixels[i] + .62 * pixels[i + 1] + .14 * pixels[i + 2];
          const value = Math.round((.86 * luma + 11) / 8) * 8;
          for (let channel = 0; channel < 3; channel++) {
            const chroma = Math.round((pixels[i + channel] - luma) * .76 / 7) * 7;
            pixels[i + channel] = value + chroma;
          }
        }
        ctx.putImageData(bitmap, 0, 0);
        return canvas.toDataURL().split(',')[1];
      }, original.toString('base64'));

      await writeFile(new URL(name, output), Buffer.from(texture, 'base64'));
    }
  }
} finally {
  await browser.close();
}
