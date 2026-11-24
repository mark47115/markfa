import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formationSlots, obstacleNames, parseWaveTable, pathLength, routeNames, splitSlots } from '../battle-map-data.mjs';
import { mapProjector } from '../battle-map-drawing.mjs';
import { groundTypes, propTypes } from '../battle-map-decoration.mjs';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const { schemaVersion, status, arena, regions, transitions, rounds } = JSON.parse(await source('battle-maps.json'));
const decoration = JSON.parse(await source('battle-map-decoration.json'));
const waves = parseWaveTable(await source('docs/enemy-waves.md'));
const { bounds: [left, north, right, south], grid, memberOffset } = arena;
const allies = Object.values(arena.allies).flatMap(formationSlots);
const enemies = formationSlots(arena.enemies);
const partyFootprints = allies.flatMap(([x, z]) =>
  [-memberOffset.x, 0, memberOffset.x].flatMap(dx =>
    [-memberOffset.z, memberOffset.z].map(dz => [x + dx, z + dz])));
const regionsById = new Set(regions.map(region => region.id));

function clear(point, radius, obstacles) {
  const [x, z] = point;
  if (x - radius < left || x + radius > right || z - radius < north || z + radius > south) return false;
  return obstacles.every(({ bounds: [x1, z1, x2, z2] }) =>
    Math.hypot(Math.max(x1 - x, 0, x - x2), Math.max(z1 - z, 0, z - z2)) >= radius);
}

function clearRoute(points, obstacles) {
  const radius = arena.minimumRouteWidth / 2;
  return points.slice(1).every(([x, z], i) => {
    const [sx, sz] = points[i];
    const steps = Math.ceil(Math.hypot(x - sx, z - sz) / (grid / 8));
    // Add half a sample interval to check the space between sampling points.
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      if (!clear([sx + (x - sx) * t, sz + (z - sz) * t], radius + grid / 16, obstacles)) return false;
    }
    return true;
  });
}

function reachableFrom(start, radius, obstacles) {
  const columns = Math.round((right - left) / grid) + 1;
  const rows = Math.round((south - north) / grid) + 1;
  const cell = ([x, z]) => Math.round((x - left) / grid) + columns * Math.round((z - north) / grid);
  const queue = [cell(start)];
  const visited = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const col = id % columns;
    const row = Math.floor(id / columns);
    for (const [c, r] of [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]]) {
      const next = c + r * columns;
      if (c < 0 || c >= columns || r < 0 || r >= rows || visited.has(next)) continue;
      if (!clear([left + c * grid, north + r * grid], radius + grid / 2, obstacles)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return point => visited.has(cell(point));
}

assert.equal(schemaVersion, 2);
assert.equal(status, 'proposal');
assert.equal(rounds.length, 15);
assert.equal(waves.size, 75);
assert.equal(regionsById.size, 5);
assert.deepEqual([right - left, south - north], [20, 16]);
assert.deepEqual(arena.plan, { axis: 'negative-z', allySide: 'left', enemySide: 'right', aspectRatio: [16, 9] });
assert.equal(arena.camera.pitch, 55);
const frame = { width: 640, height: 408 };
const plan = mapProjector(frame, arena, 'plan');
const tilted = mapProjector(frame, arena, 'game');
const pitch = 55 * Math.PI / 180;
for (const [x, z] of [...allies, ...enemies, [left, north], [right, south]]) {
  const [planX, planY] = plan(x, z);
  const [tiltedX, tiltedY] = tilted(x, z);
  assert.equal(tiltedX, planX, 'Pitch preserves the plan’s horizontal position');
  assert.ok(Math.abs(tiltedY - frame.height / 2 - (planY - frame.height / 2) * Math.sin(pitch)) < 1e-9);
  const raised = tilted(x, z, 1);
  assert.equal(raised[0], tiltedX);
  assert.ok(raised[1] < tiltedY, 'Raised geometry projects upwards');
}
assert.ok(Math.max(...allies.map(point => tilted(...point)[0])) < frame.width / 2);
assert.ok(Math.min(...enemies.map(point => tilted(...point)[0])) > frame.width / 2);
assert.equal(transitions.length, rounds.length + 1);
assert.equal(new Set(transitions.map(edge => edge.id)).size, transitions.length);
const edgePatterns = new Set(['grass', 'ruts', 'roots', 'water', 'stone', 'veins', 'fissure']);
for (const edge of transitions) {
  assert.ok(edgePatterns.has(edge.pattern) && Math.abs(edge.track) + 1.2 < right && Number.isInteger(edge.seed), edge.id);
  assert.ok(['ground', 'shade', 'accent', 'trail'].every(key => /^#[\da-f]{6}$/i.test(edge[key])), edge.id);
}

let largestDetour = { round: '', route: '', distance: 0 };
let routeCount = 0;
let splitCount = 0;
let sharedEdges = 0;
let decorationCount = 0;
assert.equal(decoration.schemaVersion, 1);
assert.equal(decoration.mapSource, 'battle-maps.json');
assert.deepEqual(decoration.regions.map(region => region.id), regions.map(region => region.id));
assert.deepEqual(decoration.rounds.map(round => round.id), rounds.map(round => round.id));
for (const region of decoration.regions) assert.ok(region.materials.length > 0 && region.light.length > 0, region.id);
for (const [i, map] of rounds.entries()) {
  const round = String(i + 1).padStart(2, '0');
  assert.equal(map.id, 'r' + round);
  assert.ok(regionsById.has(map.region) && regions[Math.floor(i / 3)].id === map.region, map.id + ' region');
  assert.ok(map.reviewWave.startsWith('R' + round) && waves.has(map.reviewWave));
  assert.deepEqual(map.edges, { left: transitions[i].id, right: transitions[i + 1].id }, map.id + ' edge order');
  assert.notEqual(transitions[i].ground, transitions[i + 1].ground, map.id + ' left/right contrast');
  if (i > 0) {
    assert.equal(rounds[i - 1].edges.right, map.edges.left, map.id + ' incoming edge');
    sharedEdges++;
  }
  const art = decoration.rounds[i];
  assert.ok(art.description.length > 0 && art.ground.length >= 3 && art.props.length >= 4, map.id + ' art layers');
  const artIds = [...art.ground, ...art.props].map(mark => mark.id);
  assert.equal(new Set(artIds).size, artIds.length);
  for (const mark of art.ground) {
    assert.ok(mark.id.startsWith(map.id + '-g') && groundTypes.has(mark.type), mark.id);
    if (mark.type === 'glyph') {
      const [x, z] = mark.center;
      assert.ok(mark.radius > .5 && Math.abs(x) + mark.radius < right && Math.abs(z) + mark.radius < 5.3, mark.id);
    } else {
      assert.ok(mark.width > 0 && mark.points.length >= 2, mark.id);
      assert.ok(mark.points.every(([x, z]) => x >= left && x <= right && Math.abs(z) <= 5.2), mark.id + ' outside shared edge strip');
      assert.ok(mark.points.slice(1).every(([x, z], index) => x !== mark.points[index][0] || z !== mark.points[index][1]), mark.id);
    }
  }
  for (const prop of art.props) {
    assert.ok(prop.id.startsWith(map.id + '-p') && propTypes.has(prop.type), prop.id);
    assert.ok(Math.abs(prop.x) > right && Math.abs(prop.x) <= right + 1 && Math.abs(prop.z) < 6, prop.id + ' outside combat and shared edges');
    assert.ok(prop.scale >= .5 && prop.scale <= 1.5, prop.id);
  }
  decorationCount += artIds.length;
  const ids = new Set();
  for (const obstacle of map.obstacles) {
    const [x1, z1, x2, z2] = obstacle.bounds;
    assert.ok(obstacle.id.startsWith(map.id + '-o') && !ids.has(obstacle.id), obstacle.id);
    ids.add(obstacle.id);
    assert.ok(obstacleNames[obstacle.kind], obstacle.id);
    assert.ok(x1 < x2 && z1 < z2 && x1 > left && x2 < right && z1 >= -2 && z2 <= 2, obstacle.id);
  }
  assert.deepEqual(Object.keys(map.paths), Object.keys(routeNames));
  for (const [route, points] of Object.entries(map.paths)) {
    assert.ok(clearRoute(points, map.obstacles), map.id + ' ' + route + ' corridor');
    const direct = pathLength([points[0], points.at(-1)]);
    const detour = pathLength(points) - direct;
    assert.ok(detour <= arena.detourBudget, map.id + ' ' + route + ' detour');
    if (detour > largestDetour.distance) largestDetour = { round: map.id, route, distance: detour };
    routeCount++;
  }
  if (map.id === 'r05') {
    assert.ok(clearRoute(map.paths.center.map(([x, z]) => [-x, z]), map.obstacles), 'r05 left bypass');
  }
  for (const radius of arena.testRadii) {
    const navigates = reachableFrom([0, 5.7], radius, map.obstacles);
    for (const point of [...allies, ...partyFootprints, ...enemies]) {
      assert.ok(clear(point, radius, map.obstacles), map.id + ' clear spawn ' + point);
      assert.ok(navigates(point), map.id + ' reachable spawn ' + point);
    }
  }
  for (const suffix of 'ABCDE') {
    const wave = waves.get('R' + round + suffix);
    assert.ok(wave?.front.length === 3 && wave?.rear.length === 3, map.id + ' waves');
    if (i < 14) continue;
    const split = splitSlots(wave);
    const occupied = [...wave.front, ...wave.rear];
    assert.equal(new Set(split).size, 2, wave.id);
    assert.ok(split.every(index => !occupied[index] || occupied[index] === '삼키는 자'), wave.id + ' split slots');
    assert.ok(split.every(index => clear(enemies[index], arena.testRadii.at(-1), map.obstacles)), wave.id + ' split clearance');
    splitCount++;
  }
}

console.log(JSON.stringify({
  maps: rounds.length, waves: waves.size, corridors: routeCount, sharedEdges, decorationCount,
  spawnRadii: arena.testRadii, splitCases: splitCount,
  longestDetour: { ...largestDetour, seconds: largestDetour.distance / arena.movementSpeed },
}, null, 2));
