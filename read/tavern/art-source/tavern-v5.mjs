import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const width = 480;
const height = 270;
const pixels = Buffer.alloc(width * height * 3);
let portraitClip = null;
const palette = {
  outline: 0x262036, wall: 0x40334e, wallDeep: 0x352b46, wallLight: 0x4b3c58,
  glass: 0x1c3055, sky: 0x324976,
  skyLight: 0x4b6ea2, stone: 0x5a4967, stoneMid: 0x62516f, stoneLight: 0x695673,
  stonePurple: 0x574765, stoneCool: 0x554764, seam: 0x483951, slabEdge: 0x72607a,
  shade: 0x49384e, darkest: 0x2b2337,
  woodDark: 0x4e3040, woodShadow: 0x68404a, wood: 0x8c5350,
  woodMid: 0xa7634d, woodLight: 0xc47c51, woodEdge: 0xe1955c,
  brass: 0xd19050, gold: 0xf2b85f, flame: 0xffd57b, cream: 0xffedba,
  rugDark: 0x613e57, rug: 0x854958, rugEdge: 0xc07e60,
  mossDark: 0x34483e, moss: 0x536743, leaf: 0x819451, leafLight: 0xb0bf6c,
  tealDark: 0x254950, teal: 0x39727a, tealLight: 0x64b6aa,
  ironDark: 0x555072, iron: 0x81799d, ironLight: 0xb0a6c1, silver: 0xd9cde0,
  peachShade: 0xd38064, peach: 0xf2ad7d, blush: 0xe88977,
  redDark: 0x8d444d, red: 0xbd514f, orange: 0xe38251, orangeLight: 0xf1a668,
  hud: 0x202940, hudDeep: 0x171e33, hudEdge: 0x336b70, hudActive: 0x68b8a6,
};

function pixel(x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  if (portraitClip && (x < portraitClip.left || x >= portraitClip.right || y < 243 || y >= 260)) return;
  const offset = (y * width + x) * 3;
  pixels[offset] = color >> 16;
  pixels[offset + 1] = color >> 8;
  pixels[offset + 2] = color;
}

function rect(x, y, w, h, color) {
  for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
    for (let col = Math.max(0, x); col < Math.min(width, x + w); col++) {
      pixel(col, row, color);
    }
  }
}

function shape(points, color) {
  const top = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
  const bottom = Math.min(height, Math.ceil(Math.max(...points.map(([, y]) => y))));
  for (let y = top; y < bottom; y++) {
    const intersections = [];
    const center = y + 0.5;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((center < y1) === (center < y2)) continue;
      intersections.push(x1 + (x2 - x1) * (center - y1) / (y2 - y1));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const start = Math.ceil(intersections[i] - 0.5);
      const end = Math.ceil(intersections[i + 1] - 0.5);
      rect(start, y, end - start, 1, color);
    }
  }
}

function line([x0, y0], [x1, y1], color, thickness = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const right = Math.round(x1);
  const bottom = Math.round(y1);
  const dx = Math.abs(right - x);
  const dy = -Math.abs(bottom - y);
  const stepX = x < right ? 1 : -1;
  const stepY = y < bottom ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    rect(x, y, thickness, thickness, color);
    if (x === right && y === bottom) break;
    const advance = error * 2;
    if (advance >= dy) {
      error += dy;
      x += stepX;
    }
    if (advance <= dx) {
      error += dx;
      y += stepY;
    }
  }
}

function oval(x, y, rx, ry, color, border = 0) {
  for (let py = -ry; py <= ry; py++) {
    const extent = Math.floor(rx * Math.sqrt(1 - (py / ry) ** 2));
    if (!border) {
      rect(x - extent, y + py, extent * 2 + 1, 1, color);
      continue;
    }
    const innerDepth = ry - border;
    const inner = Math.abs(py) >= innerDepth
      ? 0
      : Math.floor((rx - border) * Math.sqrt(1 - (py / innerDepth) ** 2));
    if (inner === 0) rect(x - extent, y + py, extent * 2 + 1, 1, color);
    else {
      rect(x - extent, y + py, extent - inner + 1, 1, color);
      rect(x + inner, y + py, extent - inner + 1, 1, color);
    }
  }
}

const p = (u, v, z = 0) => [22 + u + 0.51 * v, 132 - 0.23 * u + 0.66 * v - z];

function floorQuad(u, v, span, depth, z, color) {
  shape([p(u, v, z), p(u + span, v, z), p(u + span, v + depth, z), p(u, v + depth, z)], color);
}

function facade(u, v, span, top, bottom, color) {
  shape([p(u, v, top), p(u + span, v, top), p(u + span, v, bottom), p(u, v, bottom)], color);
}

function wallWindow(x, y, w, h) {
  const arch = [[x, y + h], [x, y + 9], [x + 5, y + 4], [x + 12, y], [x + w - 10, y],
    [x + w - 4, y + 4], [x + w, y + 9], [x + w, y + h]];
  shape(arch, palette.outline);
  shape(arch.map(([px, py]) => [x + 3 + (px - x) * (w - 6) / w, y + 3 + (py - y) * (h - 6) / h]), palette.sky);
  shape([[x + 3, y + h - 4], [x + 3, y + h - 14], [x + 12, y + h - 19], [x + 19, y + h - 12],
    [x + w - 4, y + h - 18], [x + w - 4, y + h - 4]], palette.glass);
  rect(x + w - 11, y + 9, 4, 4, palette.skyLight);
  line([x + w / 2, y + 1], [x + w / 2, y + h - 2], palette.outline, 2);
  line([x + 1, y + h / 2], [x + w - 2, y + h / 2 - 4], palette.outline, 2);
  line([x - 2, y + h], [x + w + 1, y + h - 2], palette.ironDark, 2);
}

function lantern(x, y) {
  rect(x - 1, y - 3, 3, 3, palette.outline);
  shape([[x - 5, y + 4], [x - 2, y], [x + 2, y], [x + 5, y + 4], [x + 5, y + 13],
    [x + 3, y + 15], [x - 3, y + 15], [x - 5, y + 13]], palette.outline);
  rect(x - 3, y + 5, 7, 7, palette.brass);
  rect(x - 2, y + 5, 4, 6, palette.flame);
  rect(x - 1, y + 6, 2, 4, palette.cream);
  rect(x + 3, y + 6, 1, 5, palette.gold);
}

function rug(u, v, wide, deep) {
  floorQuad(u, v, wide, deep, 0, palette.darkest);
  floorQuad(u + 2, v + 2, wide - 4, deep - 4, 0, palette.rugEdge);
  floorQuad(u + 5, v + 5, wide - 10, deep - 10, 0, palette.rugDark);
  floorQuad(u + 7, v + 7, wide - 14, deep - 14, 0, palette.rug);
  shape([p(u + wide / 2, v + 22), p(u + wide - 11, v + deep / 2),
    p(u + wide / 2, v + deep - 22), p(u + 11, v + deep / 2)], palette.rugEdge);
  shape([p(u + wide / 2, v + 25), p(u + wide - 14, v + deep / 2),
    p(u + wide / 2, v + deep - 25), p(u + 14, v + deep / 2)], palette.rugDark);
}

function barrel(x, y) {
  oval(x + 2, y + 1, 12, 4, palette.shade);
  shape([[x - 9, y - 20], [x + 8, y - 20], [x + 10, y - 8], [x + 7, y],
    [x - 7, y], [x - 10, y - 8]], palette.woodShadow);
  rect(x - 5, y - 18, 4, 17, palette.wood);
  rect(x - 3, y - 16, 1, 13, palette.woodMid);
  oval(x, y - 20, 9, 4, palette.woodLight);
  oval(x, y - 20, 6, 2, palette.woodDark);
  rect(x - 9, y - 14, 18, 2, palette.darkest);
  rect(x - 9, y - 5, 17, 2, palette.darkest);
  rect(x - 7, y - 14, 6, 1, palette.ironDark);
}

function planter(x, y) {
  oval(x + 2, y + 1, 13, 5, palette.shade);
  shape([[x - 10, y - 13], [x + 10, y - 13], [x + 7, y], [x - 7, y]], palette.woodShadow);
  rect(x - 10, y - 14, 20, 4, palette.brass);
  rect(x - 8, y - 14, 12, 2, palette.woodEdge);
  line([x, y - 14], [x - 1, y - 34], palette.mossDark, 3);
  for (const [from, end, color] of [
    [[0,-20],[-12,-26],palette.moss],
    [[-1,-26],[10,-34],palette.leaf],
    [[-1,-27],[-10,-37],palette.leaf],
    [[0,-21],[11,-27],palette.moss],
  ]) {
    line([x + from[0], y + from[1]], [x + end[0], y + end[1]], color, 4);
    rect(x + end[0], y + end[1], 4, 2, palette.leafLight);
  }
}

function banner(x, y, field, edge, symbol) {
  shape([[x - 10, y], [x + 10, y], [x + 10, y + 19], [x, y + 25], [x - 10, y + 19]], palette.outline);
  shape([[x - 9, y], [x + 9, y], [x + 9, y + 18], [x, y + 23], [x - 9, y + 18]], edge);
  shape([[x - 7, y], [x + 7, y], [x + 7, y + 16], [x, y + 20], [x - 7, y + 16]], field);
  if (symbol === 'leaf') {
    line([x, y + 6], [x, y + 16], edge);
    line([x - 4, y + 9], [x, y + 13], edge, 2);
    line([x + 4, y + 8], [x, y + 13], edge, 2);
  } else if (symbol === 'gear') {
    rect(x - 4, y + 7, 9, 7, edge);
    rect(x - 2, y + 5, 5, 11, edge);
    rect(x - 1, y + 9, 3, 3, field);
  } else {
    line([x - 4, y + 6], [x + 4, y + 14], edge, 2);
    line([x + 4, y + 6], [x - 4, y + 14], edge, 2);
  }
}

function chest(x, y) {
  rect(x - 11, y - 5, 22, 7, palette.woodShadow);
  shape([[x - 12, y - 5], [x - 9, y - 11], [x + 5, y - 13], [x + 11, y - 9], [x + 11, y - 5]], palette.woodMid);
  line([x - 11, y - 5], [x + 11, y - 6], palette.woodDark, 2);
  line([x - 7, y - 10], [x - 6, y + 1], palette.brass, 2);
  line([x + 6, y - 11], [x + 7, y], palette.brass, 2);
  rect(x - 1, y - 6, 3, 4, palette.gold);
}

function candle(x, y, h) {
  rect(x - 3, y - h, 6, h, palette.brass);
  rect(x - 3, y - h, 3, h - 1, palette.cream);
  rect(x - 2, y - h - 4, 4, 4, palette.flame);
  rect(x - 1, y - h - 5, 2, 4, palette.cream);
}

function floorAndWalls() {
  rect(0, 0, width, height, palette.wallDeep);
  const bricks = [palette.wall, palette.wallLight, palette.wall, palette.wallDeep, palette.wall];
  for (let row = 0; row < 9; row++) {
    for (let col = -4; col < 14; col++) {
      const u = col * 34 + (row % 2) * 17;
      facade(u, 0, 33, row * 13 + 12, row * 13, bricks[(col + 10 + row * 3) % bricks.length]);
    }
  }
  wallWindow(28, 18, 50, 58);
  wallWindow(244, -16, 48, 52);
  wallWindow(-12, 107, 30, 54);
  line([5, 0], [5, 144], palette.outline, 15);
  line([12, 0], [12, 125], palette.woodShadow, 10);
  shape([[0, 16], [42, 54], [47, 46], [3, 1]], palette.woodDark);
  line([6, 8], [43, 47], palette.woodMid, 2);
  line([90, -10], [90, 109], palette.woodDark, 11);
  line([92, -3], [92, 100], palette.woodMid, 2);
  line([300, -8], [300, 79], palette.woodDark, 10);

  floorQuad(-115, 0, 550, 270, 0, palette.seam);
  const stone = [palette.stone, palette.stoneMid, palette.stonePurple, palette.stoneLight, palette.stoneCool];
  for (let row = 0; row < 10; row++) {
    for (let col = -4; col < 14; col++) {
      const u = col * 42 + (row % 2) * 21;
      const v = row * 25;
      floorQuad(u + 1, v + 1, 41, 24, 0, stone[(col + 10 + row * 2) % stone.length]);
      if ((col + row) % 3 === 0) line(p(u + 5, v + 2), p(u + 20, v + 2), palette.slabEdge);
    }
  }
  rug(-23, 102, 34, 120);
  rug(336, 100, 44, 60);
}

function stairs() {
  const u = 319;
  const v = 23;
  const w = 44;
  const tread = 8;
  for (let i = 0; i < 12; i++) {
    const depth = v + i * tread;
    const z = 72 - 6 * i;
    floorQuad(u, depth, w, tread, z, i % 3 === 0 ? palette.woodLight : palette.woodMid);
    facade(u, depth + tread, w, z, z - 6, palette.woodShadow);
    line(p(u + 1, depth + tread - 1, z), p(u + w - 1, depth + tread - 1, z), palette.woodEdge);
    line(p(u + 6, depth + tread + 1, z - 3), p(u + w - 5, depth + tread + 1, z - 3), palette.woodDark);
  }
  for (const uSide of [u, u + w]) {
    const top = p(uSide, v, 83);
    const bottom = p(uSide, v + 12 * tread, 13);
    line(top, bottom, palette.woodDark, 5);
    line(top, bottom, palette.woodMid, 2);
    for (const i of [1, 5, 9, 12]) {
      const step = v + i * tread;
      const z = 72 - i * 6;
      line(p(uSide, step, z + 13), p(uSide, step, z), palette.woodDark, 4);
      line(p(uSide, step, z + 13), p(uSide, step, z - 1), palette.woodLight);
    }
  }
}

function counter() {
  const u = 65;
  facade(u, 37, 224, 22, 2, palette.outline);
  facade(u + 2, 38, 220, 20, 4, palette.woodShadow);
  for (let i = 0; i < 6; i++) {
    facade(u + 7 + 36 * i, 38, 27, 16, 8, palette.woodDark);
    facade(u + 9 + 36 * i, 38, 23, 15, 10, palette.wood);
  }
  floorQuad(u, 12, 225, 26, 23, palette.woodMid);
  line(p(u, 38, 24), p(u + 226, 38, 24), palette.woodEdge, 2);
  line(p(u + 12, 23, 24), p(u + 213, 23, 24), palette.wood);
  for (const item of [[128, 95], [139, 92]]) {
    const [x, y] = item;
    shape([[x - 4, y], [x - 4, y - 6], [x - 2, y - 8], [x - 2, y - 11],
      [x + 3, y - 11], [x + 3, y - 8], [x + 5, y - 5], [x + 5, y]], palette.peachShade);
    rect(x - 3, y - 6, 4, 5, palette.peach);
    rect(x - 3, y - 11, 7, 1, palette.cream);
  }
  chest(184, 82);
  shape([[208, 74], [224, 72], [229, 76], [213, 79]], palette.cream);
  line([218, 74], [222, 77], palette.brass);
  lantern(263, 56);
  barrel(48, 138);
  barrel(27, 148);
}

function face(x, y, style, facing = 0) {
  if (style === 'clock') {
    shape([[x - 11, y + 4], [x - 10, y - 6], [x - 7, y - 10], [x + 7, y - 10],
      [x + 11, y - 6], [x + 12, y + 3], [x + 8, y + 8], [x - 7, y + 8]], palette.outline);
    rect(x - 9, y - 6, 19, 11, palette.brass);
    rect(x - 8, y - 8, 15, 4, palette.gold);
    rect(x - 8, y + 4, 16, 2, palette.woodMid);
    rect(x - 6, y - 3, 13, 7, palette.darkest);
    rect(x - 4, y - 2, 2, 4, palette.flame);
    rect(x + 3, y - 2, 2, 4, palette.flame);
    rect(x - 8, y - 12, 3, 4, palette.brass);
    rect(x - 11, y - 15, 8, 4, palette.gold);
    rect(x - 9, y - 14, 3, 2, palette.woodShadow);
    rect(x + 1, y - 9, 5, 4, palette.cream);
    rect(x + 3, y - 8, 2, 2, palette.woodShadow);
    return;
  }
  const hood = style === 'moss';
  const captain = style === 'captain';
  const main = hood ? palette.moss : captain ? palette.flame : palette.iron;
  const tint = hood ? palette.leaf : captain ? palette.cream : palette.ironLight;
  const shadow = hood ? palette.mossDark : captain ? palette.brass : palette.ironDark;
  shape([[x - 11, y + 3], [x - 10, y - 6], [x - 7, y - 10], [x + 7, y - 10],
    [x + 10, y - 6], [x + 11, y + 4], [x + 7, y + 9], [x - 7, y + 9]], palette.outline);
  shape([[x - 10, y + 3], [x - 9, y - 6], [x - 6, y - 9], [x + 6, y - 9],
    [x + 9, y - 5], [x + 10, y + 3], [x + 6, y + 7], [x - 6, y + 7]], main);
  rect(x - 8, y - 6, 12, 3, tint);
  rect(x - 5, y - 8, 5, 2, tint);
  rect(x + 4, y - 4, 5, 4, shadow);
  if (hood) {
    for (const side of [-1,1]) {
      line([x + side * 8, y - 7], [x + side * 11, y - 13], palette.woodShadow, 2);
      line([x + side * 10, y - 10], [x + side * 14, y - 11], palette.woodLight, 2);
      line([x + side * 11, y - 10], [x + side * 11, y - 15], palette.woodLight, 2);
    }
    rect(x - 3, y - 6, 6, 1, palette.leafLight);
    rect(x - 8, y + 2, 3, 5, palette.leaf);
    rect(x + 6, y, 3, 5, palette.leaf);
  } else if (captain) {
    rect(x - 7, y - 10, 5, 3, palette.cream);
    rect(x - 2, y - 12, 6, 3, palette.cream);
    rect(x + 5, y - 10, 3, 3, palette.flame);
    rect(x - 4, y - 5, 3, 3, palette.cream);
  } else {
    rect(x - 5, y - 7, 3, 2, palette.silver);
    rect(x - 8, y - 1, 3, 4, palette.brass);
  }
  if (facing === 2) return;
  const offset = facing;
  shape([[x - 5 + offset, y + 1], [x + 5 + offset, y], [x + 6 + offset, y + 5],
    [x + 4 + offset, y + 8], [x - 4 + offset, y + 8], [x - 6 + offset, y + 5]], palette.peachShade);
  rect(x - 5 + offset, y + 1, 11, 5, palette.peach);
  rect(x - 4 + offset, y + 6, 8, 1, palette.peach);
  rect(x - 3 + offset, y + 2, 1, 2, palette.outline);
  rect(x + 3 + offset, y + 2, 1, 2, palette.outline);
  rect(x - 1 + offset, y + 5, 3, 2, palette.redDark);
  rect(x + 4 + offset, y + 5, 2, 1, palette.blush);
}

const outfits = {
  captain: [palette.redDark, palette.red, palette.orangeLight],
  shield: [palette.redDark, palette.orange, palette.orangeLight],
  moss: [palette.mossDark, palette.moss, palette.leaf],
  clock: [palette.tealDark, palette.teal, palette.tealLight],
};

function member(x, feet, kind, facing) {
  const [dark, color, light] = outfits[kind];
  oval(x + 1, feet, 11, 4, palette.shade);
  rect(x - 8, feet - 7, 16, 4, palette.woodMid);
  rect(x - 7, feet - 3, 3, 4, palette.woodDark);
  rect(x + 5, feet - 3, 2, 4, palette.woodDark);
  shape([[x - 9, feet - 17], [x - 5, feet - 20], [x + 6, feet - 20], [x + 10, feet - 16],
    [x + 9, feet - 6], [x - 9, feet - 6]], palette.outline);
  rect(x - 7, feet - 16, 15, 9, dark);
  rect(x - 6, feet - 16, 13, 4, color);
  rect(x - 6, feet - 16, 8, 1, light);
  rect(x + (facing === 1 ? 6 : -9), feet - 12, 5, 4, kind === 'clock' ? palette.gold : palette.peach);
  rect(x - 6, feet - 6, 4, 4, palette.darkest);
  rect(x + 4, feet - 6, 4, 4, palette.darkest);
  face(x, feet - 24, kind, facing);
}

function gallery() {
  floorQuad(-29, 6, 347, 33, 72, palette.woodShadow);
  for (let i = -22; i < 317; i += 18) {
    line(p(i, 6, 72), p(i, 39, 72), palette.woodDark);
  }
  facade(-28, 40, 345, 73, 63, palette.woodDark);
  facade(-28, 40, 345, 72, 67, palette.wood);
  line(p(-22, 40, 72), p(316, 40, 72), palette.woodMid, 2);
  for (let i = 8; i <= 298; i += 58) {
    const [x, y] = p(i, 43, 65).map(Math.round);
    shape([[x - 5, y], [x + 5, y - 2], [x + 4, y + 8], [x - 5, y + 9]], palette.woodDark);
    line([x - 4, y + 1], [x - 4, y + 7], palette.woodMid);
  }
  const [captainX, captainFeet] = p(145, 23, 72).map(Math.round);
  member(captainX, captainFeet + 2, 'captain', 0);
  for (let i = -26; i <= 318; i += 13) {
    line(p(i, 40, 90), p(i, 40, 69), palette.woodDark, 5);
    line(p(i, 40, 89), p(i, 40, 72), palette.woodLight);
  }
  facade(-28, 40, 346, 93, 87, palette.woodShadow);
  line(p(-28, 39, 93), p(319, 39, 93), palette.woodLight, 2);
  line(p(-28, 40, 88), p(318, 40, 88), palette.woodMid);
  for (const [u, span] of [[137, 5], [151, 4]]) {
    const [x, y] = p(u, 39, 94).map(Math.round);
    rect(x, y, span, 3, palette.peachShade);
    rect(x, y - 1, span - 1, 2, palette.peach);
  }
  for (const i of [86, 230]) {
    const [x, y] = p(i, 42, 91).map(Math.round);
    banner(x, y, palette.redDark, palette.brass, 'swords');
  }
  lantern(20, 80);
  lantern(102, 65);
  lantern(210, 46);
  lantern(278, 6);
}

function recruitTable(x, y, crew, selected = false) {
  oval(x + 1, y + 19, 48, 18, palette.shade);
  if (selected) {
    oval(x, y + 12, 51, 25, palette.woodDark, 3);
    oval(x, y + 12, 51, 24, palette.gold, 2);
  }
  if (crew !== 'clock') member(x, y + 1, crew, 0);
  else {
    member(x - 18, y + 4, crew, 0);
    member(x + 17, y + 3, crew, 0);
  }
  rect(x - 26, y + 7, 5, 16, palette.woodDark);
  rect(x + 22, y + 7, 5, 16, palette.woodDark);
  rect(x - 25, y + 8, 2, 13, palette.wood);
  rect(x + 23, y + 8, 2, 13, palette.wood);
  oval(x, y + 5, 34, 12, palette.woodShadow);
  oval(x, y + 3, 35, 11, palette.wood);
  oval(x, y, 35, 11, palette.woodMid);
  oval(x, y - 1, 33, 9, palette.woodLight);
  line([x - 24, y + 3], [x + 25, y + 3], palette.woodMid);
  line([x - 14, y - 6], [x + 18, y - 6], palette.woodMid);
  for (const [offset, h] of [[-4, 5], [3, 8]]) candle(x + offset, y, h);
  if (crew !== 'clock') {
    member(x - 29, y + 20, crew, 1);
    member(x + 30, y + 20, crew, crew === 'moss' ? -1 : 2);
  }
  if (crew === 'moss') banner(x, y + 9, palette.mossDark, palette.leafLight, 'leaf');
  else if (crew === 'clock') banner(x, y + 9, palette.ironDark, palette.gold, 'gear');
  else banner(x, y + 9, palette.redDark, palette.flame, 'swords');
}

function bitmap(rows, x, y, color) {
  rows.forEach((row, dy) => {
    [...row].forEach((mark, dx) => {
      if (mark === 'x') pixel(x + dx, y + dy, color);
    });
  });
}

function teamBar() {
  rect(0, 232, width, 4, palette.outline);
  shape([[0, 241], [6, 235], [474, 235], [480, 241], [480, 267], [477, 270], [3, 270], [0, 267]], palette.hudEdge);
  shape([[2, 241], [7, 237], [473, 237], [478, 241], [478, 266], [475, 268], [5, 268], [2, 266]], palette.hud);
  rect(8, 238, 463, 1, palette.hudActive);
  bitmap([
    'x...x.x','x...x.x','x...x.x','x...xxx','x...x.x','x...x.x','xxxxx.x','....x.x','....x.x',
  ], 75, 246, palette.cream);
  bitmap([
    'xxxx..x','x.....x','xxx...x','x.....x','xxxx..x','......x','.xxxxx.','.x...x.','.xxxxx.',
  ], 86, 246, palette.cream);
  const slots = [
    ['shield', 3], ['moss', 3], ['clock', 2], [null, 0], [null, 0], [null, 0], [null, 0],
  ];
  for (const [index, [style, count]] of slots.entries()) {
    const x = 122 + 35 * index;
    const edge = style ? palette.hudActive : palette.hudEdge;
    shape([[x, 243], [x + 2, 241], [x + 29, 241], [x + 31, 243], [x + 31, 265],
      [x + 29, 267], [x + 2, 267], [x, 265]], edge);
    rect(x + 2, 243, 27, 22, palette.hudDeep);
    if (!style) continue;
    portraitClip = { left: x + 2, right: x + 29 };
    face(x + 15, 251, style);
    portraitClip = null;
    for (let j = 0; j < count; j++) rect(x + 8 + j * 6, 261, 3, 2, palette.hudActive);
  }
}

floorAndWalls();
stairs();
counter();
gallery();
planter(28, 214);
recruitTable(330, 132, 'clock');
recruitTable(132, 146, 'moss');
recruitTable(238, 190, 'shield', true);
teamBar();

function pngChunk(type, data) {
  const tag = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([tag, data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([length, payload, checksum]);
}

function encodePng(scale) {
  const w = width * scale;
  const h = height * scale;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = w * 3 + 1;
  const raster = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const srcRow = Math.floor(y / scale) * width;
    for (let x = 0; x < w; x++) {
      const start = (srcRow + Math.floor(x / scale)) * 3;
      const target = y * stride + 1 + x * 3;
      pixels.copy(raster, target, start, start + 3);
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raster)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const native = new URL('../media/art-direction/tavern-shop-team-v5.png', import.meta.url);
const preview = new URL('../media/art-direction/tavern-shop-team-v5-3x.png', import.meta.url);
await writeFile(native, encodePng(1));
await writeFile(preview, encodePng(3));
