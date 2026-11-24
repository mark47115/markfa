import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const directory = new URL('../media/battle-maps/v10/', import.meta.url);
const settings = JSON.parse(await readFile(new URL('palette.json', directory), 'utf8'));
const images = await Promise.all(settings.targets.map(async ({ id }) => {
  try {
    return 'data:image/png;base64,' + (await readFile(new URL(id + '.png', directory))).toString('base64');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}));

const browser = await launchBrowser();
let report;
try {
  const page = await browser.newPage();
  report = await page.evaluate(async ({ images, settings }) => {
    const { canvas: grid, measurement, ramps, stages, targets } = settings;
    const { width, height, scale, maxColors } = grid;
    const pngWidth = width * scale;
    const pngHeight = height * scale;
    const total = width * height;
    const allColors = new Set(Object.values(ramps).flatMap(ramp => ramp.colors));
    const colorsIn = keys => new Set(keys.flatMap(key => ramps[key].colors));
    const blight = colorsIn(measurement.blight.ramps);
    const ground = colorsIn(measurement.ground.includedRamps);
    for (const excluded of measurement.ground.excludedColors) ground.delete(excluded);
    const { core, rim, nonEmissiveMark } = measurement.glow;
    const [left, top, right, bottom] = measurement.ground.bounds;
    const [markLeft, markTop, markRight, markBottom] = nonEmissiveMark.reservedBounds;
    const groundArea = (right - left) * (bottom - top);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const colorInfo = new Map();

    function hsl(color) {
      if (colorInfo.has(color)) return colorInfo.get(color);
      const [r, g, b] = color.slice(1).match(/../g).map(byte => parseInt(byte, 16) / 255);
      const high = Math.max(r, g, b), low = Math.min(r, g, b);
      const lightness = (high + low) / 2;
      const delta = high - low;
      const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
      const sector = delta ? high === r ? (g - b) / delta : high === g ? 2 + (b - r) / delta : 4 + (r - g) / delta : 0;
      const hue = (60 * sector + 360) % 360;
      const result = { lightness, saturation, hue };
      colorInfo.set(color, result);
      return result;
    }

    const percentage = cells => cells * 100 / total;
    const within = (value, [min, max]) => value >= min - 1e-10 && value <= max + 1e-10;
    const rounds = [];
    const hex = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
    let previous;
    let matched = 0;
    for (const [index, target] of targets.entries()) {
      const number = index + 1;
      const { id } = target;
      const errors = [];
      if (!images[index]) {
        rounds.push({ id, errors: ['PNG 파일 없음'] });
        previous = undefined;
        continue;
      }
      const image = new Image();
      image.src = images[index];
      await image.decode();
      if (image.naturalWidth !== pngWidth || image.naturalHeight !== pngHeight) {
        rounds.push({ id, errors: [`PNG 크기 ${image.naturalWidth}×${image.naturalHeight}`] });
        previous = undefined;
        continue;
      }
      canvas.width = pngWidth;
      canvas.height = pngHeight;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, pngWidth, pngHeight).data;
      const dots = [];
      let brokenCells = 0;
      for (let y = 0; y < pngHeight; y += scale) {
        for (let x = 0; x < pngWidth; x += scale) {
          const start = (y * pngWidth + x) * 4;
          const [r, g, b] = pixels.subarray(start, start + 3);
          dots.push('#' + hex[r] + hex[g] + hex[b]);
          let uniform = true;
          for (let dy = 0; dy < scale && uniform; dy++) {
            const rowOffset = start + dy * pngWidth * 4;
            for (let dx = 0; dx < scale; dx++) {
              const i = rowOffset + dx * 4;
              if (pixels[i] !== r || pixels[i + 1] !== g || pixels[i + 2] !== b || pixels[i + 3] !== 255) {
                uniform = false;
                break;
              }
            }
          }
          if (!uniform) brokenCells++;
        }
      }
      if (brokenCells) errors.push(`7×7 단색 위반 ${brokenCells}칸`);
      const used = new Set(dots);
      const unknown = [...used].filter(color => !allColors.has(color));
      if (unknown.length) errors.push(`팔레트 외 ${unknown.length}색 (${unknown.slice(0, 6).join(', ')})`);
      if (used.size > maxColors) errors.push(`사용 색상 ${used.size}색`);
      const mark = id === nonEmissiveMark.round && new Set(
        (nonEmissiveMark.cells ?? []).map(([x, y]) => {
          if (!Number.isInteger(x) || !Number.isInteger(y) ||
              x < markLeft || x >= markRight || y < markTop || y >= markBottom) errors.push('r03 표식 좌표 범위 위반');
          return y * width + x;
        }),
      );
      if (mark && mark.size !== nonEmissiveMark.targetCells) errors.push('r03 표식 좌표 수 불일치');
      let lightnessSum = 0;
      let groundCells = 0, blightCells = 0, tealCells = 0, markerCells = 0, openCoreCells = 0;
      const banned = new Set();
      const bannedColors = new Set([...used].filter(color => {
        const { hue, saturation } = hsl(color);
        return measurement.forbiddenHues.some(({ range: [from, to], minSaturation }) =>
          saturation >= minSaturation && (from <= to ? hue >= from && hue <= to : hue >= from || hue <= to));
      }));
      for (const [cell, color] of dots.entries()) {
        const x = cell % width, y = Math.floor(cell / width);
        if (ground.has(color) && x >= left && x < right && y >= top && y < bottom) {
          lightnessSum += hsl(color).lightness;
          groundCells++;
        }
        if (blight.has(color)) blightCells++;
        if (color === rim || color === core) tealCells++;
        if (mark && mark.has(cell)) {
          if (color === nonEmissiveMark.allowedColor) markerCells++;
          else errors.push(`r03 비발광 표식 색 위반 (${x}, ${y})`);
        }
        if (color === core) {
          const adjacent = [cell - 1, cell + 1, cell - width, cell + width,
            cell - width - 1, cell - width + 1, cell + width - 1, cell + width + 1];
          if (x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
              adjacent.some(i => dots[i] !== rim && dots[i] !== core)) openCoreCells++;
        }
        if (bannedColors.has(color) && !measurement.forbiddenExceptions.some(entry =>
          entry.round === id && entry.color === color && entry.cells.some(([cx, cy]) => x === cx && y === cy))) banned.add(color);
      }
      if (openCoreCells) errors.push(`어두운 테에 둘러싸이지 않은 발광 심 ${openCoreCells}칸`);
      if (banned.size) errors.push(`금지 색 ${[...banned].join(', ')}`);
      const lightness = groundCells ? lightnessSum / groundCells : null;
      const groundCoverage = groundCells / groundArea;
      const blightPct = percentage(blightCells);
      const rawTealPct = percentage(tealCells);
      const glowPct = percentage(tealCells - markerCells);
      const stage = stages.find(({ rounds: [first, last] }) => number >= first && number <= last);
      const blightRange = stage.blightPct ?? stage.blightPctByRound[number - stage.rounds[0]];
      if (groundCoverage < measurement.ground.minimumCoverage) errors.push('교전면 바닥 표본 부족');
      if (lightness === null || !within(lightness, stage.lightness)) errors.push('교전면 L 범위 위반');
      if (!within(blightPct, blightRange)) errors.push('오염률 범위 위반');
      if (!within(glowPct, stage.glowPct)) errors.push('발광률 범위 위반');
      const edge = Array.from({ length: height }, (_, y) => dots[(y + 1) * width - 1]);
      if (previous) {
        if (lightness > previous.lightness + 1e-10) errors.push('교전면 L이 이전 라운드보다 높음');
        if (blightCells < previous.blightCells) errors.push('오염률이 이전 라운드보다 낮음');
        if (tealCells - markerCells < previous.glowCells) errors.push('발광률이 이전 라운드보다 낮음');
        const leftEdge = Array.from({ length: height }, (_, y) => dots[y * width]);
        const mismatch = leftEdge.filter((value, y) => value !== previous.edge[y]).length;
        if (mismatch) errors.push(`이전 맵과 경계 ${mismatch}칸 불일치`);
        else matched++;
      }
      previous = { edge, lightness, blightCells, glowCells: tealCells - markerCells };
      rounds.push({ id, colors: used.size, groundCoverage, lightness, blightPct, rawTealPct, glowPct, markerCells, errors });
    }
    return { width: pngWidth, height: pngHeight, grid, matched, rounds };
  }, { images, settings });
} finally {
  await browser.close();
}

if (process.argv.includes('--write-report')) {
  const evidence = new URL('qa/', directory);
  await mkdir(evidence, { recursive: true });
  await writeFile(new URL('measurements.json', evidence), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (report.matched !== settings.targets.length - 1 || report.rounds.some(round => round.errors.length)) process.exitCode = 1;
