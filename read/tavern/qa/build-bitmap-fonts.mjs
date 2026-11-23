import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';

const art = new URL('../media/fonts/v1/', import.meta.url);
const sourceFile = new URL('source/Mulmaru.pfp', art);
const rawSource = await readFile(sourceFile);
const project = JSON.parse(rawSource);
const glyphs = new Map(project.glyphs.map(glyph => [glyph.unicode, glyph]));
const fragments = new Map();

const bodyColor = 0xf3deb8;
const impactColors = {
  shadow: 0x291d21,
  outline: 0x382325,
  rim: 0x75432f,
  dark: 0xbd7441,
  fill: 0xefad53,
  gold: 0xfbd384,
  light: 0xffefb8,
};
const symbols = new Map([
  [0x2212, ['######', '######', '......', '......', '......', '......', '......']],
  [0x2726, ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...', '.......', '.......']],
  [0x2022, ['.##.', '####', '####', '.##.', '....', '....', '....', '....']],
  [0xfffd, glyphs.get(0).data],
]);
const impactLabels = [
  '피해', '치명타', '추가 피해', '받는 피해', '회피', '빗나감', '방어', '막음', '저항', '면역',
  '보호막', '파괴', '회복', '흡수', '반격', '연속 적중', '중독', '출혈', '부활', '침식', '강화', '약화',
  '승리', '패배', '무승부', '임계', '도발', '저격', '강탈', '파막', '붕괴', '분열', '재생',
  '기절', '동결', '감속', '봉인', '공격력', '체력', '이동 속도', '골드', '충전', '예고',
];
const impactSymbols = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz +−-×÷%!?.,:;←↑→↓·…★✦•=/()[]';
const impactCharacters = new Set([...impactSymbols, ...impactLabels.join('')].map(c => c.codePointAt(0)));
impactCharacters.add(0xfffd);

function readRows(rows) {
  return rows.flatMap((row, i) =>
    [...row].flatMap((pixel, x) => pixel === '#' ? [32 * (rows.length - 1 - i) + x] : []));
}

function glyphPixels(id) {
  if (fragments.has(id)) return fragments.get(id);
  const glyph = glyphs.get(id);
  const rows = symbols.get(id) ?? glyph?.data;
  const pixels = new Set(rows ? readRows(rows) : []);
  for (const component of glyph?.components ?? []) {
    assert.ok(glyphs.has(component), 'Missing component U+' + component.toString(16));
    for (const pixel of glyphPixels(component)) pixels.add(pixel);
  }
  fragments.set(id, pixels);
  return pixels;
}

function sourceGlyph(id) {
  if (id === 32 || id === 0xa0) return { id, pixels: [], advance: project.attr.spaceWidth };
  const pixels = [...glyphPixels(id)].map(p => [p % 32, project.attr.ascent + project.attr.descent - Math.floor(p / 32)]);
  const width = pixels.reduce((max, [x]) => Math.max(max, x + 1), 0);
  assert.ok(width > 0, 'Missing visible glyph U+' + id.toString(16));
  const isDigit = 48 <= id && id <= 57;
  const advance = isDigit ? 8 : glyphs.get(id)?.advanceWidth ?? width + project.attr.letterSpacing;
  return { id, pixels, advance };
}

function rasterBody(glyph) {
  return { ...glyph, pixels: glyph.pixels.map(([x, y]) => [x, y, bodyColor]) };
}

function rasterImpact(glyph) {
  const face = new Set();
  const key = (x, y) => (y + 8) * 128 + x + 8;
  const yOf = p => Math.floor(p / 128) - 8;
  const xOf = p => p % 128 - 8;
  for (const [x, y] of glyph.pixels) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) face.add(key(x * 2 + dx, y * 2 + dy + 1));
    }
  }

  const paint = new Map();
  function applyEdge(offsetX, offsetY, distance, color) {
    for (const p of face) {
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          if (Math.abs(x) + Math.abs(y) > distance) continue;
          paint.set(key(xOf(p) + x + offsetX, yOf(p) + y + offsetY), color);
        }
      }
    }
  }
  applyEdge(1, 2, 3, impactColors.shadow);
  applyEdge(0, 0, 3, impactColors.outline);
  applyEdge(0, 0, 1, impactColors.rim);

  const top = new Map(), bottom = new Map();
  for (const p of face) {
    const x = xOf(p), y = yOf(p);
    top.set(x, Math.min(top.get(x) ?? y, y));
    bottom.set(x, Math.max(bottom.get(x) ?? y, y));
  }
  const first = Math.min(...top.values()), last = Math.max(...bottom.values());
  for (const p of face) {
    const x = xOf(p), y = yOf(p);
    const progress = (y - first) / Math.max(1, last - first);
    let color = progress < .39 ? impactColors.gold : progress > .80 ? impactColors.dark : impactColors.fill;
    if (y === top.get(x) && progress < .65) color = impactColors.light;
    paint.set(p, color);
  }

  return {
    id: glyph.id,
    advance: glyph.advance * 2 + 3,
    pixels: [...paint].map(([p, color]) => [xOf(p), yOf(p), color]),
  };
}

function bounds(pixels) {
  if (!pixels.length) return { xOffset: 0, yOffset: 0, width: 0, height: 0 };
  const xs = pixels.map(([x]) => x), ys = pixels.map(([, y]) => y);
  const xOffset = Math.min(...xs), yOffset = Math.min(...ys);
  return { xOffset, yOffset, width: Math.max(...xs) - xOffset + 1, height: Math.max(...ys) - yOffset + 1 };
}

async function buildFont(page, spec) {
  const directory = new URL(spec.folder + '/', art);
  await mkdir(directory, { recursive: true });
  const entries = [...spec.ids].sort((a, b) => a - b)
    .map(id => spec.raster(sourceGlyph(id)))
    .map(g => ({ ...g, ...bounds(g.pixels) }));
  const pitchX = 2 + Math.max(...entries.map(g => g.width));
  const pitchY = 2 + Math.max(...entries.map(g => g.height));
  const columns = Math.floor(spec.texture / pitchX);
  const perPage = Math.floor(spec.texture / pitchY) * columns;
  const pages = [], metrics = [];
  for (let start = 0; start < entries.length; start += perPage) {
    const color = Buffer.alloc(spec.texture ** 2 * 4);
    const file = spec.folder + '-' + pages.length + '.png';
    for (const [slot, g] of entries.slice(start, start + perPage).entries()) {
      const x = 1 + (slot % columns) * pitchX;
      const y = 1 + Math.floor(slot / columns) * pitchY;
      for (const [px, py, shade] of g.pixels) {
        const index = ((y + py - g.yOffset) * spec.texture + x + px - g.xOffset) * 4;
        color[index] = shade >> 16;
        color[index + 1] = shade >> 8;
        color[index + 2] = shade;
        color[index + 3] = 255;
      }
      const { id, width, height, xOffset, yOffset, advance } = g;
      metrics.push({ id, x, y, width, height, xOffset, yOffset, advance, page: pages.length });
    }

    const png = await page.evaluate(({ bytes, size }) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const pixels = Uint8ClampedArray.from(atob(bytes), byte => byte.charCodeAt(0));
      c.getContext('2d').putImageData(new ImageData(pixels, size, size), 0, 0);
      return c.toDataURL().split(',')[1];
    }, { bytes: color.toString('base64'), size: spec.texture });
    await writeFile(new URL(file, directory), Buffer.from(png, 'base64'));
    pages.push(file);
  }

  const fnt = [
    'info face="' + spec.name + '" size=' + spec.size + ' bold=' + Number(spec.folder === 'impact') +
      ' italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1 outline=0',
    'common lineHeight=' + spec.lineHeight + ' base=' + spec.base + ' scaleW=' + spec.texture +
      ' scaleH=' + spec.texture + ' pages=' + pages.length + ' packed=0 alphaChnl=0 redChnl=0 greenChnl=0 blueChnl=0',
    ...pages.map((file, id) => 'page id=' + id + ' file="' + file + '"'),
    'chars count=' + metrics.length,
    ...metrics.map(g => 'char id=' + g.id + ' x=' + g.x + ' y=' + g.y + ' width=' + g.width + ' height=' + g.height +
      ' xoffset=' + g.xOffset + ' yoffset=' + g.yOffset + ' xadvance=' + g.advance + ' page=' + g.page + ' chnl=15'),
    'kernings count=0',
  ];
  const file = spec.folder + '.fnt';
  await writeFile(new URL(file, directory), fnt.join('\n') + '\n');
  return {
    name: spec.name, descriptor: spec.folder + '/' + file, pages: pages.map(file => spec.folder + '/' + file),
    glyphCount: metrics.length, size: spec.size, lineHeight: spec.lineHeight,
    base: spec.base, textureSize: spec.texture, tabularDigits: metrics.find(g => g.id === 48).advance,
  };
}

const bodyCharacters = new Set([32, 0xa0, ...symbols.keys()]);
for (const [id, glyph] of glyphs) {
  if (Number.isInteger(id) && id >= 33 && (id < 0xe000 || id > 0xf8ff) && (glyph.data || glyph.components)) {
    if (glyphPixels(id).size) bodyCharacters.add(id);
  }
}
for (let id = 0xac00; id <= 0xd7a3; id++) assert.ok(bodyCharacters.has(id), 'Missing Hangul U+' + id.toString(16));

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const text = await buildFont(page, {
    folder: 'text', name: 'Cavern Text', size: 12, base: 11, lineHeight: 16, texture: 1024,
    ids: bodyCharacters, raster: rasterBody,
  });
  const impact = await buildFont(page, {
    folder: 'impact', name: 'Cavern Impact', size: 24, base: 23, lineHeight: 34, texture: 512,
    ids: impactCharacters, raster: rasterImpact,
  });
  const colorHex = value => '#' + value.toString(16).padStart(6, '0');
  const manifest = {
    format: 'AngelCode BMFont text / RGBA PNG',
    bitmapFilter: 'nearest',
    textNormalization: 'NFC',
    fallbackCodePoint: 65533,
    source: {
      file: 'source/Mulmaru.pfp',
      release: 'https://github.com/mushsooni/mulmaru/releases/tag/v1.0',
      sha256: createHash('sha256').update(rawSource).digest('hex'),
      license: 'OFL.txt',
    },
    text: { ...text, hangulSyllables: 11172, fill: colorHex(bodyColor) },
    impact: {
      ...impact, labels: impactLabels, symbols: impactSymbols,
      palette: Object.fromEntries(Object.entries(impactColors).map(([k, v]) => [k, colorHex(v)])),
    },
  };
  await writeFile(new URL('manifest.json', art), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ text, impact }, null, 2));
} finally {
  await browser.close();
}
