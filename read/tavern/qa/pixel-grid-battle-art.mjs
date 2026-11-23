import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const maps = new URL('../media/battle-maps/', import.meta.url);
const source = new URL('v7/', maps);
const output = new URL('v8/', maps);
const design = JSON.parse(await readFile(new URL('../battle-maps.json', import.meta.url), 'utf8'));
const filenames = design.rounds.map(({ id }) => id + '.png');
const grid = { columns: 240, rows: 135, scale: 7 };
const checkOnly = process.argv.includes('--check');
const readPngs = directory => Promise.all(filenames.map(async name => {
  const png = await readFile(new URL(name, directory));
  return 'data:image/png;base64,' + png.toString('base64');
}));

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const files = await readPngs(checkOnly ? output : source);
  const result = await page.evaluate(async ({ files, grid, checkOnly }) => {
    const { columns, rows, scale } = grid;
    const width = columns * scale;
    const height = rows * scale;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let previousEdge;
    let matched = 0;
    const images = [];

    function representative(data, stride, x0, y0, x1, y1) {
      const count = (x1 - x0) * (y1 - y0);
      let red = 0, green = 0, blue = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * stride + x) * 4;
          red += data[i];
          green += data[i + 1];
          blue += data[i + 2];
        }
      }
      red /= count;
      green /= count;
      blue /= count;
      // Keep a color actually present in the artwork instead of blending edge hues.
      let closest = Infinity;
      let pick = (y0 * stride + x0) * 4;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * stride + x) * 4;
          const distance = (data[i] - red) ** 2 + (data[i + 1] - green) ** 2 + (data[i + 2] - blue) ** 2;
          if (distance < closest) {
            closest = distance;
            pick = i;
          }
        }
      }
      return data.subarray(pick, pick + 4);
    }

    function rasterize(image, index) {
      const stride = image.width;
      const pitch = image.height / rows;
      const offset = (stride - pitch * columns) / 2;
      const dots = new ImageData(columns, rows);
      for (let row = 0; row < rows; row++) {
        const y0 = Math.round(pitch * row);
        const y1 = Math.round(pitch * (row + 1));
        for (let col = 0; col < columns; col++) {
          let x0 = Math.max(0, Math.round(offset + pitch * col));
          let x1 = Math.min(stride, Math.round(offset + pitch * (col + 1)));
          // The source edge columns are paired, so sample both seams identically.
          if (col === 0 && index > 0) [x0, x1] = [0, 1];
          if (col === columns - 1 && index < files.length - 1) [x0, x1] = [stride - 1, stride];
          dots.data.set(representative(image.data, stride, x0, y0, x1, y1), (row * columns + col) * 4);
        }
      }
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = columns;
      gridCanvas.height = rows;
      gridCanvas.getContext('2d').putImageData(dots, 0, 0);
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(gridCanvas, 0, 0, width, height);
    }

    for (const [index, source] of files.entries()) {
      const img = new Image();
      img.src = source;
      await img.decode();
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      if (!checkOnly) rasterize(ctx.getImageData(0, 0, canvas.width, canvas.height), index);
      if (canvas.width !== width || canvas.height !== height) throw new Error('Incorrect image size at round ' + (index + 1));
      const { data } = ctx.getImageData(0, 0, width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = (y * width + x) * 4;
          const dot = ((y - y % scale) * width + x - x % scale) * 4;
          if (data[pixel] !== data[dot] || data[pixel + 1] !== data[dot + 1] ||
              data[pixel + 2] !== data[dot + 2] || data[pixel + 3] !== 255) {
            throw new Error('Misaligned dot at round ' + (index + 1) + ', ' + x + ', ' + y);
          }
        }
      }
      if (previousEdge) {
        const left = ctx.getImageData(0, 0, 1, height).data;
        if (!left.every((value, i) => value === previousEdge[i])) throw new Error('Incorrect seam at round ' + (index + 1));
        matched++;
      }
      previousEdge = ctx.getImageData(width - 1, 0, 1, height).data;
      if (!checkOnly) images.push(canvas.toDataURL('image/png').split(',')[1]);
    }
    return { images, matched, width, height };
  }, { files, grid, checkOnly });

  assert.equal(result.matched, filenames.length - 1);
  if (!checkOnly) {
    await mkdir(output, { recursive: true });
    await Promise.all(result.images.map((png, i) => writeFile(new URL(filenames[i], output), Buffer.from(png, 'base64'))));
  }
  console.log(JSON.stringify({ maps: filenames.length, ...grid, width: result.width, height: result.height, matched: result.matched }));
} finally {
  await browser.close();
}
