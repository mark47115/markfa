import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const maps = new URL('../media/battle-maps/', import.meta.url);
const previous = new URL('v5/', maps);
const blight = process.argv.includes('--blight');
const restyle = process.argv.includes('--style');
const redraw = process.argv.includes('--redraw');
const keepReference = restyle || redraw;
const output = redraw ? new URL('v9/', maps) : restyle ? new URL('v7/', maps) : blight ? new URL('v6/', maps) : previous;
const styleReference = 'r03.png';
const stripWidth = 56;
const design = JSON.parse(await readFile(new URL('../battle-maps.json', import.meta.url), 'utf8'));
const filenames = design.rounds.map(round => round.id + '.png');
const transitionStart = filenames.indexOf('r07.png');
const edgeName = index => filenames[index].slice(1, 3) + '-' + filenames[index + 1].slice(1, 3) + '.png';
const fromFile = async url => 'data:image/png;base64,' + (await readFile(url)).toString('base64');
const browser = await launchBrowser();

async function stitchEdits(page) {
  const names = keepReference ? filenames : filenames.slice(transitionStart);
  const original = keepReference ? styleReference : names[0];
  const originalIndex = names.indexOf(original);
  const reference = new URL(original, previous);
  const sources = await Promise.all(names.map(name => fromFile(name === original ? reference : new URL('sources/' + name, output))));
  const images = await page.evaluate(async ({ sources, originalIndex, keepReference, stripWidth, redraw }) => {
    const tiles = await Promise.all(sources.map(async src => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    }));
    const width = tiles[originalIndex].naturalWidth;
    const height = tiles[originalIndex].naturalHeight;
    const layers = tiles.map(tile => {
      if (tile.naturalWidth < width || tile.naturalWidth > width + 4 ||
          tile.naturalHeight < height || tile.naturalHeight > height + 4) {
        throw new Error('Expected a full-size edit aligned with the previous map');
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(tile, -Math.floor((tile.naturalWidth - width) / 2), -Math.floor((tile.naturalHeight - height) / 2));
      return { canvas, ctx };
    });

    for (let i = 0; i < layers.length - 1; i++) {
      const leftCanvas = layers[i].ctx;
      const rightCanvas = layers[i + 1].ctx;
      const leftX = width - stripWidth;
      const left = leftCanvas.getImageData(leftX, 0, stripWidth, height);
      const right = rightCanvas.getImageData(0, 0, stripWidth, height);
      const pinLeft = keepReference && i === originalIndex;
      const pinRight = keepReference && i + 1 === originalIndex;
      for (let y = 0; y < height; y++) {
        const row = 4 * y * stripWidth;
        const last = row + 4 * (stripWidth - 1);
        let extent = stripWidth - 1;
        if (redraw) {
          // Allow broad corrections for similar ground colors only. Keep high-contrast silhouettes sharp.
          const difference = Math.max(
            Math.abs(left.data[last] - right.data[row]),
            Math.abs(left.data[last + 1] - right.data[row + 1]),
            Math.abs(left.data[last + 2] - right.data[row + 2]),
          );
          const similarity = 1 - Math.max(0, Math.min(1, (difference - 6) / 46));
          extent = 3 + (stripWidth - 4) * similarity ** 2;
        }
        for (let channel = 0; channel < 3; channel++) {
          const a = left.data[last + channel];
          const b = right.data[row + channel];
          const edge = pinLeft ? a : pinRight ? b : Math.round((a + b) / 2);
          for (let x = 0; x <= extent; x++) {
            const distance = x / extent;
            const weight = 1 - distance * distance * (3 - 2 * distance);
            left.data[last - x * 4 + channel] += (edge - a) * weight;
            right.data[row + x * 4 + channel] += (edge - b) * weight;
          }
        }
      }
      leftCanvas.putImageData(left, leftX, 0);
      rightCanvas.putImageData(right, 0, 0);
    }
    return layers.map(({ canvas }, i) => keepReference && i === originalIndex ? null : canvas.toDataURL('image/png').split(',')[1]);
  }, { sources, originalIndex, keepReference, stripWidth, redraw });
  await Promise.all(images.map((base64, i) => {
    const destination = new URL(names[i], output);
    return base64 ? writeFile(destination, Buffer.from(base64, 'base64')) : copyFile(reference, destination);
  }));
}

try {
  const page = await browser.newPage();
  const checkOnly = process.argv.includes('--check');
  if ((blight || keepReference) && !checkOnly) {
    await stitchEdits(page);
  } else if (!checkOnly) {
    const bases = await Promise.all(filenames.map((name, i) => fromFile(new URL((i < 3 ? 'v2/' : i < 7 ? 'v3/' : 'v4/') + name, maps))));
    const sources = await Promise.all(filenames.slice(1).map((_, i) => fromFile(new URL('connectors/' + edgeName(i), output))));
    const images = await page.evaluate(async ({ bases, sources }) => {
      const bitmap = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
      const tiles = await Promise.all(bases.map(bitmap));
      const connectors = await Promise.all(sources.map(bitmap));
      const tileWidth = Math.min(...tiles.map(tile => tile.naturalWidth));
      const height = tiles[0].naturalHeight;
      const sideWidth = 320;
      const connectorWidth = sideWidth * 2 - 1;
      const feather = 125;
      if (tiles.some(tile => tile.naturalHeight !== height)) throw new Error('Battlefield heights must match');

      function canvas(width) {
        const surface = document.createElement('canvas');
        surface.width = width;
        surface.height = height;
        const ctx = surface.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        return { surface, ctx };
      }

      const strips = connectors.map(img => {
        const { ctx } = canvas(connectorWidth);
        const scale = Math.max(height / img.naturalHeight, connectorWidth / img.naturalWidth);
        const width = img.naturalWidth * scale;
        const tall = img.naturalHeight * scale;
        ctx.drawImage(img, (connectorWidth - width) / 2, (height - tall) / 2, width, tall);
        return ctx.getImageData(0, 0, connectorWidth, height).data;
      });

      function applyEdge(ctx, strip, isLeft) {
        const x0 = isLeft ? 0 : tileWidth - sideWidth;
        const sourceX = isLeft ? sideWidth - 1 : 0;
        const crop = ctx.getImageData(x0, 0, sideWidth, height);
        for (let x = 0; x < sideWidth; x++) {
          const fromSeam = isLeft ? x : sideWidth - 1 - x;
          const blend = Math.max(0, (fromSeam - (sideWidth - feather)) / (feather - 1));
          const keep = blend * blend * (3 - 2 * blend);
          for (let y = 0; y < height; y++) {
            const to = (y * sideWidth + x) * 4;
            const from = (y * connectorWidth + sourceX + x) * 4;
            for (let rgb = 0; rgb < 3; rgb++) {
              crop.data[to + rgb] = keep * crop.data[to + rgb] + (1 - keep) * strip[from + rgb];
            }
          }
        }
        ctx.putImageData(crop, x0, 0);
      }

      return tiles.map((tile, i) => {
        const { surface, ctx } = canvas(tileWidth);
        // Center-trim up to a few pixels from mixed generator sizes, at 1:1 scale.
        ctx.drawImage(tile, -Math.floor((tile.naturalWidth - tileWidth) / 2), 0);
        if (i > 0) applyEdge(ctx, strips[i - 1], true);
        if (i < tiles.length - 1) applyEdge(ctx, strips[i], false);
        return surface.toDataURL('image/png').split(',')[1];
      });
    }, { bases, sources });
    await mkdir(output, { recursive: true });
    await Promise.all(images.map((base64, i) => writeFile(new URL(filenames[i], output), Buffer.from(base64, 'base64'))));
  }

  if (keepReference) {
    assert.deepEqual(await readFile(new URL(styleReference, output)), await readFile(new URL(styleReference, previous)));
  }
  const files = await Promise.all(filenames.map((name, i) => fromFile(new URL(name, blight && !keepReference && i < transitionStart ? previous : output))));
  const sources = redraw ? await Promise.all(filenames.map(name => name === styleReference ? null : fromFile(new URL('sources/' + name, output)))) : [];
  const checks = await page.evaluate(async ({ files, sources, stripWidth }) => {
    const decode = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
    const tiles = await Promise.all(files.map(decode));
    const canvas = document.createElement('canvas');
    canvas.width = tiles[0].naturalWidth;
    canvas.height = tiles[0].naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let preceding;
    let matched = 0;
    let native = 0;
    for (const [i, tile] of tiles.entries()) {
      if (tile.naturalWidth !== canvas.width || tile.naturalHeight !== canvas.height) throw new Error('Battlefield sizes differ');
      ctx.drawImage(tile, 0, 0);
      if (preceding) {
        const left = ctx.getImageData(0, 0, 1, canvas.height).data;
        if (!left.every((value, i) => value === preceding[i])) throw new Error('Battlefield edge mismatch at round ' + (matched + 2));
        matched++;
      }
      preceding = ctx.getImageData(canvas.width - 1, 0, 1, canvas.height).data;
      if (sources[i]) {
        const original = await decode(sources[i]);
        const width = canvas.width - 2 * stripWidth;
        const height = canvas.height;
        const delivered = ctx.getImageData(stripWidth, 0, width, height).data;
        ctx.drawImage(original, -Math.floor((original.naturalWidth - canvas.width) / 2), -Math.floor((original.naturalHeight - height) / 2));
        const authored = ctx.getImageData(stripWidth, 0, width, height).data;
        if (!delivered.every((value, i) => value === authored[i])) throw new Error('Redraw was resampled at round ' + (i + 1));
        native++;
      }
    }
    return { matched, native, width: canvas.width, height: canvas.height };
  }, { files, sources, stripWidth });
  assert.equal(checks.matched, filenames.length - 1);
  if (redraw) assert.equal(checks.native, filenames.length - 1);
  console.log(JSON.stringify(checks));
} finally {
  await browser.close();
}
