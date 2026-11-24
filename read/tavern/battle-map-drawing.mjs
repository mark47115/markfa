import { formationSlots, splitSlots } from './battle-map-data.mjs';
import { drawGroundDetails, drawTerrainStamp } from './battle-map-decoration.mjs';

export const mapColors = {
  ally: '#8fe0c3', enemy: '#edb5d2', split: '#ffd384', route: '#f2d9a0',
};

const radians = degrees => degrees * Math.PI / 180;
const planSize = { width: 640, height: 408 };
const planInset = { x: 25, y: 44 };

export function mapProjector(canvas, arena, cameraView) {
  const [minX, minZ, maxX, maxZ] = arena.bounds;
  const widthScale = (canvas.width - planInset.x * 2) / (maxZ - minZ);
  const depthScale = (canvas.height - planInset.y * 2) / (maxX - minX);
  const centerX = (minX + maxX) / 2;
  const plan = cameraView === 'plan';
  const tilt = radians(arena.camera.pitch);
  const groundDepth = plan ? 1 : Math.sin(tilt);
  const verticalDepth = plan ? 0 : Math.cos(tilt);
  // Keep the plan's horizontal axis fixed. Pitch affects screen Y only.
  return (x, z, height = 0) => [
    planInset.x + (maxZ - z) * widthScale,
    canvas.height / 2 + ((x - centerX) * groundDepth - height * verticalDepth) * depthScale,
  ];
}

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const stone = [[-1, -.28], [-.78, -.72], [.48, -.81], [.91, -.46], [1, .18], [.58, .67], [-.69, .63]];
const laneLines = { left: [.27, .14], center: [.46, .19], right: [.27, .14] };

export function drawBattleMap(canvas, { arena, region, round, edges, art, wave, formation, view, guides, showSplit }) {
  const ctx = canvas.getContext('2d');
  const project = mapProjector(canvas, arena, view);
  const number = Number(round.id.slice(1));
  const random = seeded(number * 997);
  const [x1, z1, x2, z2] = arena.bounds;
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, region.edge);
  background.addColorStop(1, '#1c1b21');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function shape(points, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  const patch = (left, north, right, south, fill, stroke) =>
    shape([[left, north], [right, north], [right, south], [left, south]].map(p => project(...p)), fill, stroke);
  const poly = (points, fill, stroke) => shape(points.map(p => project(...p)), fill, stroke);
  function path(points, stroke, width, dash = []) {
    ctx.beginPath();
    ctx.moveTo(...project(...points[0]));
    for (const point of points.slice(1)) ctx.lineTo(...project(...point));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const object = (outline, x, z, w, d, height, fill, stroke) =>
    shape(outline.map(([px, pz]) => project(x + px * w, z + pz * d, height)), fill, stroke);
  const brush = { project, shape, poly, path };
  function terrain() {
    if (view === 'game') {
      shape([
        project(x2, z2), project(x2, z1), project(x2, z1, -.55), project(x2, z2, -.55),
      ], region.edge, region.shade);
    }
    poly([[-10.2, -8.1], [10.3, -8.12], [10.35, 8], [9.45, 8.28], [-9.7, 8.28], [-10.26, 8.02]], region.edge, region.light);
    const floor = ctx.createLinearGradient(...project(0, z2), ...project(0, z1));
    floor.addColorStop(0, edges.left.ground);
    floor.addColorStop(.21, edges.left.ground);
    floor.addColorStop(.5, region.ground);
    floor.addColorStop(.79, edges.right.ground);
    floor.addColorStop(1, edges.right.ground);
    patch(x1, z1, x2, z2, floor);
    for (let z = z1; z < z2; z += .5) {
      if (Math.abs(z) > 5) continue;
      for (let x = x1; x < x2; x += .5) {
        const tone = random();
        if (tone > .51) continue;
        ctx.globalAlpha = .17;
        patch(x, z, x + .48, z + .48, tone < .3 ? region.shade : region.light);
      }
    }
    ctx.globalAlpha = 1;
    if (art) {
      ctx.save();
      shape([[x1, z1], [x2, z1], [x2, z2], [x1, z2]].map(point => project(...point)));
      ctx.clip();
      drawGroundDetails(brush, art, region.accent);
      ctx.restore();
    }
    transition(edges.left, z2);
    transition(edges.right, z1);
    patch(x1, z1, x2, z2, null, '#cfc29d9c');
  }

  function transition(edge, boundary) {
    const direction = Math.sign(boundary);
    const inward = distance => boundary - direction * distance;
    const edgeRandom = seeded(edge.seed);
    const block = (left, depth, right, farther, color, stroke) => {
      const a = inward(depth);
      const b = inward(farther);
      patch(left, Math.min(a, b), right, Math.max(a, b), color, stroke);
    };
    // Match the same cross-section on both sides of a shared boundary.
    block(x1, 0, x2, .85, edge.ground);
    for (let x = x1; x < x2; x += .5) {
      for (let band = 0; band < 6; band++) {
        const tone = edgeRandom();
        if (tone > .65) continue;
        const depth = band * .52;
        ctx.globalAlpha = band < 2 ? .35 : .25;
        block(x, depth, x + .5, depth + .38, tone < .35 ? edge.shade : edge.accent);
      }
    }
    ctx.globalAlpha = 1;
    if (edge.pattern === 'stone' || edge.pattern === 'ruts') {
      block(edge.track - 1.05, 0, edge.track + 1.05, 2.8, edge.trail + 'bc');
      if (edge.pattern === 'stone') {
        for (let tile = 0; tile < 4; tile++) {
          const start = tile * .70;
          block(edge.track - .93, start, edge.track + .93, start + .55, edge.accent + '4d', edge.shade + '67');
        }
      } else {
        for (const offset of [-.58, .58]) {
          path([[edge.track + offset, inward(0)], [edge.track + offset, inward(2.4)]], edge.shade + '98', 2);
        }
      }
    }
    if (edge.pattern === 'grass') {
      for (const x of [-7.7, -4.9, 3, 6.5, 8.4]) {
        const change = edgeRandom() * .35;
        block(x, .25 + change, x + .42, .58 + change, edge.accent + 'be');
        block(x + .28, 1.25 + change, x + .68, 1.56 + change, edge.shade);
      }
    }
    if (edge.pattern === 'water') {
      const x = edge.track + 4.1;
      poly([[x - 1, inward(0)], [x + 1, inward(0)], [x + 1.3, inward(1.15)], [x + .16, inward(3)], [x - 1.1, inward(2.2)]], edge.shade + 'ac');
      path([[x, inward(0)], [x + .2, inward(.8)], [x - .3, inward(2.35)]], edge.accent + '8f', 2);
    }
    if (['roots', 'veins', 'fissure'].includes(edge.pattern)) {
      for (const branch of [-6.6, 5.5]) {
        const x = branch + edgeRandom() * .6;
        const line = [[x, inward(0)], [x, inward(.82)], [x + .45, inward(1.44)], [x - .3, inward(2.1)], [x + .1, inward(3.3)]];
        path(line, edge.shade, edge.pattern === 'fissure' ? 8 : 5);
        path(line, edge.accent + 'd0', edge.pattern === 'fissure' ? 3 : 1.4);
      }
    }
    // The shared trail reaches the boundary in both maps at the same lane.
    block(edge.track - .43, 0, edge.track + .43, 1, edge.trail);
    path([[edge.track, inward(1)], [edge.track, inward(2.35)], [edge.track * .55, inward(3.8)]], edge.trail + 'b8', 4);
  }

  function drawGuides() {
    patch(x1 + .48, 2, x2 - .48, 7.37, '#1b413d91', '#b3e3ba');
    patch(x1 + .48, -7.37, x2 - .48, -2.25, '#5d304a91', '#edb5d2');
    for (const [label, z, color] of [['아군 출전', 4.72, mapColors.ally], ['적군 출전', -4.72, mapColors.enemy]]) {
      const [x, y] = project(-8.5, z);
      ctx.fillStyle = '#252126e8';
      ctx.fillRect(x - 46, y - 11, 92, 22);
      ctx.fillStyle = color;
      ctx.font = '15px "Cavern Text", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + .5);
    }
    for (const x of arena.laneBoundaries) path([[x, -7.4], [x, 7.4]], '#e1d5c279', 1, [4, 5]);
    for (const [key, points] of Object.entries(round.paths)) {
      const [width, dash] = laneLines[key];
      const scale = canvas.height / 21;
      path(points, '#261f29c4', scale * width);
      path(points, mapColors.route, 1.6, [scale * dash + 4, 5]);
      const [x, z] = points.at(-1);
      poly([[x, z - .1], [x - .23, z + .4], [x + .23, z + .4]], mapColors.route);
    }
  }

  function obstacle({ kind, bounds: [left, north, right, south] }) {
    const w = (right - left) / 2;
    const d = (south - north) / 2;
    const x = left + w;
    const z = north + d;
    patch(left, north, right, south, '#211d26cc', '#ecb47fa0');
    const masonry = kind === 'masonry' || kind === 'bank';
    const aim = kind === 'root' ? '#9b714e' : region.landmark;
    object(stone, x + .04, z + .04, w, d, .06, region.edge);
    object(stone, x, z - .04, w * .86, d * .82, masonry ? .24 : .35, region.shade, '#29232cc7');
    object(stone, x - w * .15, z - d * .11, w * .56, d * .51, masonry ? .38 : .48, aim, region.shade);
    path([[x - w * .45, z + d * .18], [x, z - d * .18], [x + w * .5, z - d * .35]], region.accent + 'bb', 1);
    const type = { root: 'stump', bank: 'rubble', masonry: 'pillar', crystal: 'crystal', shard: 'island' }[kind];
    drawTerrainStamp(brush, { type, x, z, scale: Math.min(.64, .8 * w, .8 * d) });
  }

  function marker([x, z], type, label) {
    const [px, py] = project(x, z);
    const color = mapColors[type];
    const multiplier = Math.min(1.35, Math.max(1, 480 / (canvas.clientWidth || canvas.width)));
    const size = (type === 'split' ? 11 : label === 'B' ? 13 : 9) * multiplier;
    const points = type === 'ally'
      ? [[px - size, py - size], [px + size, py - size], [px + size, py + size], [px - size, py + size]]
      : [[px, py - size - 3], [px + size + 3, py], [px, py + size + 3], [px - size - 3, py]];
    shape(points.map(([sx, sy]) => [sx + 1, sy + 2]), '#221b22cc');
    shape(points, '#211e27', color, 2);
    ctx.fillStyle = color;
    ctx.font = `${Math.round(12 * multiplier)}px "Cavern Text", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py + .5);
  }

  terrain();
  art?.props.forEach(prop => drawTerrainStamp(brush, prop));
  if (guides) drawGuides();
  round.obstacles.forEach(obstacle);
  if (!wave) return;
  const enemyNames = [...wave.front, ...wave.rear];
  const splits = showSplit ? splitSlots(wave) : [];
  const positions = [
    ...formationSlots(arena.allies[formation]).map((slot, i) => [slot, 'ally', String(i + 1)]),
    ...formationSlots(arena.enemies).flatMap((slot, i) => {
      if (splits.includes(i)) return [[slot, 'split', String(splits.indexOf(i) + 1)]];
      if (!enemyNames[i]) return [];
      return [[slot, 'enemy', enemyNames[i] === '삼키는 자' ? 'B' : String(i + 1)]];
    }),
  ];
  positions.sort(([a], [b]) => a[1] - b[1]);
  positions.forEach(([slot, type, label]) => marker(slot, type, label));
}

export function drawConnectedMaps(canvas, first, next) {
  const ctx = canvas.getContext('2d');
  const width = planSize.width - planInset.x * 2;
  const height = planSize.height - planInset.y * 2;
  const margin = (canvas.width - width * 2) / 2;
  const top = 38;
  const offscreen = document.createElement('canvas');
  offscreen.width = planSize.width;
  offscreen.height = planSize.height;
  ctx.fillStyle = '#241e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '24px "Cavern Text", monospace';
  for (const [i, map] of [first, next].entries()) {
    drawBattleMap(offscreen, { ...map, view: 'plan', guides: false });
    const x = margin + width * i;
    // Crop at the world bounds so the matched cross-sections touch.
    ctx.drawImage(offscreen, planInset.x, planInset.y, width, height, x, top, width, height);
    ctx.fillStyle = '#f7dec2';
    ctx.fillText(`${Number(map.round.id.slice(1))}라운드 · ${map.round.name}`, x + width / 2, 21);
  }
  ctx.strokeStyle = '#e6cda281';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin, top, width * 2, height);
  const seam = canvas.width / 2;
  ctx.strokeStyle = '#e7cfa1a8';
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.moveTo(seam, top);
  ctx.lineTo(seam, top + height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e6c6a2';
  ctx.font = '22px "Cavern Text", monospace';
  ctx.fillText(first.edges.right.name, seam, top + height + 22);
}
