const pathStyles = {
  grass: ['#465637', '#71824c', '#a6a970'],
  dirt: ['#5a4738', '#a28861', '#ccb380'],
  ruts: ['#5a4738', '#967650', '#d0a776'],
  root: ['#2d252b', '#644837', '#996a55'],
  water: ['#292d3d', '#607987', '#99b2ae'],
  gravel: ['#353440', '#727169', '#a69d8b'],
  slab: ['#302e39', '#818176', '#aba694'],
  vein: ['#292338', '#604b71', '#ae91b2'],
  fault: ['#201c2e', '#695065', '#967489'],
};

const lamps = ['#6c493b', '#ad7244', '#e69551', '#ffcf73'];
const wood = ['#423039', '#654638', '#8f6249', '#bb9160'];
const sage = ['#2d443e', '#47614a', '#657b55', '#99a16e'];
const stone = ['#30313d', '#585a61', '#777a76', '#a5a593'];
const crystal = ['#342c43', '#564068', '#865d96', '#c194bd'];

// Each stamp has a ground shadow plus several hard-edged colour planes.
const stamps = {
  oak: [sage, [
    [0, [-3, -2, 4, 12]], [1, [-1, -4, 1, 11]],
    [0, [-13,-4,-8,-11,-2,-12,0,-16,8,-16,13,-10,15,-7,15,1,9,5,-8,5,-13,1]],
    [1, [-12,-5,-6,-11,0,-11,3,-15,8,-15,12,-10,14,-8,13,-1,6,2,-7,2,-12,-1]],
    [2, [-10,-6,-6,-10,1,-10,2,-13,7,-13,11,-10,10,-4,4,-3,3,0,-7,0]],
    [3, [-7,-6,-4,-9,0,-8,2,-11,6,-11,8,-8,6,-6,1,-6,0,-3,-5,-3]],
    [1, [-10, 0, -7, 2]], [3, [6,-3,9,-2]],
  ]],
  pine: [sage, [
    [0, [-2, 4, 2, 12]], [1, [-1, 3, 1, 11]],
    [0, [0,-17,-6,-9,-4,-9,-11,0,-7,0,-14,7,13,7,7,0,10,0,4,-9,6,-9]],
    [1, [0,-16,-4,-9,3,-9,-8,-2,-4,-2,-11,4,2,5,9,3,5,-1,7,-1,2,-8,4,-8]],
    [2, [0,-15,-4,-9,-1,-9,-6,-3,-3,-4,-8,2,0,1,4,-1,1,-4,3,-6]],
    [3, [0,-13,-2,-9,0,-8,1,-10]], [2, [2, 2, 6, 3]],
  ]],
  fence: [wood, [
    [0, [-15,-5,15,5]], [1, [-14,-5,14,-3]], [1, [-14,1,14,4]], [2, [-14,-5,14,-4]],
    [3, [-11,-4,-5,-3]], [2, [0,1,12,2]], [0, [-14,-8,-10,8]], [0,[10,-8,14,8]],
    [2, [-14,-8,-11,7]], [2,[10,-8,13,7]], [3, [-14,-8,-10,-7]], [3, [10,-8,14,-7]],
  ]],
  torch: [lamps, [
    [0, [-5, 3, 6, 8]], [1, [-5, 2, 6, 5]], [0, [-2, -3, 2, 5]], [1, [-1, -3, 1, 3]],
    [1, [-6,-7,6,-7,4,-2,-4,-2]], [2, [-4,-8,4,-5]], [2, [-4,-8,-6,-11,-2,-15,-1,-10,2,-16,5,-13,5,-9,2,-7]],
    [3, [-2,-8,-3,-11,0,-13,0,-10,2,-11,3,-9,1,-8]],
  ]],
  cart: [wood, [
    [0, [-15,-4,-8,-9,10,-9,14,-4,10,5,-10,6]], [1, [-14,-4,-8,-8,9,-8,13,-4,10,3,-10,4]],
    [2, [-11,-5,10,-2]], [2, [-11,-1,10,1]], [3, [-8,-6,8,-5]],
    [0, [-12,2,-5,2,-4,8,-8,11,-13,8]], [0,[5,2,12,2,13,8,9,11,5,8]],
    [2, [-10,4,-6,4,-6,8,-10,8]], [2,[7,4,11,4,11,8,7,8]], [0,[11,-5,16,-3]],
  ]],
  'broken-cart': [wood, [
    [0, [-14,-3,-9,-8,6,-6,11,-3,2,4,-10,4]], [2, [-12,-3,-8,-7,5,-5,7,-3,-2,1,-10,1]],
    [1, [-11,2,2,4]], [3, [-7,-6,3,-5]],
    [0, [4,0,9,-3,14,-2,16,2,15,8,9,10,5,6]], [2, [6,1,9,-1,13,0,14,3,13,6,9,8,7,5]],
    [0, [8,1,12,1,12,5,8,6]], [3, [9,2,11,4]],
  ]],
  'withered-tree': [wood, [
    [0, [-8,9,-4,5,-3,-4,-6,-8,-13,-9,-15,-14,-11,-11,-5,-11,-3,-14,0,-9,1,-7,7,-10,11,-15,12,-12,8,-7,3,-4,2,3,7,8,4,10]],
    [1, [-6,7,-2,3,0,-6,-4,-10,-2,-11,2,-7,7,-10,9,-11,7,-7,1,-3,1,5,4,8]],
    [2, [-4,7,-1,2,1,4,3,7]], [2, [-2,-10,0,-8,0,-5,-1,-6]],
    [3, [7,-10,10,-12,9,-10,6,-8]],
  ]],
  stump: [wood, [
    [0, [-13,7,-8,2,-7,-6,-2,-10,6,-10,9,-7,10,1,14,6,9,8,6,5,1,9,-3,7,-9,9]],
    [1, [-9,7,-5,2,-5,-6,7,-6,7,1,11,6,8,6,5,4,1,7,-3,6]],
    [2, [-7,-7,-3,-10,5,-10,8,-8,8,-5,4,-3,-3,-3,-7,-5]],
    [3, [-5,-7,-2,-9,4,-9,6,-7,3,-5,-3,-5]], [1, [-2,-7,4,-6]],
  ]],
  rubble: [stone, [
    [0, [-14,3,-9,-4,-5,-4,-1,2,-1,6,-10,7]], [1, [-13,2,-9,-4,-5,-4,-2,0,-5,5,-11,5]],
    [2, [-10,-3,-6,-3,-4,0,-7,2,-11,1]], [0, [-1,4,3,-6,10,-6,15,1,12,7,3,7]],
    [1, [0,3,4,-6,10,-6,14,0,10,4,3,5]], [2, [4,-5,9,-5,12,-1,8,1,3,0]], [3, [5,-4,8,-3]],
  ]],
  pillar: [stone, [
    [0, [-12,4,12,9]], [1, [-10,2,10,7]], [2, [-10,2,10,4]], [0, [-8,-8,8,3]],
    [1, [-7,-10,-2,-10,-1,-13,6,-13,8,-8,6,2,-7,2]], [2, [-7,-10,-2,-10,-1,-13,6,-13,7,-9,2,-6,-6,-6]],
    [3, [-1,-12,5,-10]], [0, [-5,-3,6,-2]], [2, [-5,-1,0,1]],
  ]],
  crystal: [crystal, [
    [0, [-15,5,-9,-1,-6,1,-1,-5,6,-4,14,2,14,7,5,9,-10,8]], [1, [-10,5,-11,-3,-8,-8,-3,-4,-3,4]],
    [2, [-10,4,-9,-2,-8,-7,-6,-3,-6,3]], [1, [-4,6,-5,-5,0,-16,5,-13,8,-4,6,7]],
    [2, [-4,5,-4,-5,0,-15,3,-11,1,6]], [3, [0,-14,3,-11,1,1,-1,-4]], [0, [4,6,7,-5,12,-9,15,-5,14,4]],
    [2, [6,5,8,-4,12,-8,13,-5,11,4]], [3, [10,-5,12,-7,12,-4,10,0]],
  ]],
  altar: [stone, [
    [0, [-15,1,15,9]], [1, [-14,0,14,7]], [2, [-13,0,13,2]], [0, [-11,-6,11,3]],
    [1, [-10,-7,10,0]], [2, [-11,-7,11,-4]], [3, [-8,-6,8,-5]], [0, [-4,-12,4,-5]],
    [2, [-3,-11,3,-6]], [3, [-1,-10,1,-7]], [1, [-10,4,10,5]],
  ]],
  island: [crystal, [
    [0, [-15,-2,-10,-7,9,-7,15,-2,12,4,5,8,2,14,-5,10,-10,6]],
    [1, [-14,-1,-8,-5,8,-5,14,-1,9,5,4,7,1,11,-3,8,-8,5]],
    [2, [-14,-2,-10,-7,8,-7,14,-2,11,2,3,3,-9,2]], [1, [-8,-4,8,-4,10,-2,-3,0]],
    [3, [-7,-4,-1,-3]], [0, [-5,3,-1,9,0,5,3,3]],
  ]],
  rail: [stone, [
    [0, [-15,4,15,8]], [1, [-14,3,14,6]], [0, [-15,-6,15,-1]], [2, [-14,-6,14,-4]],
    [0, [-13,-9,-9,5]], [0, [9,-9,13,5]], [2, [-13,-9,-10,4]], [2, [9,-9,12,4]],
    [3, [-13,-9,-9,-7]], [3, [9,-9,13,-7]], [1, [-2,-4,2,4]],
  ]],
  rift: [crystal, [
    [0, [-15,3,-11,-3,-7,-10,-2,-14,5,-14,11,-9,15,-3,15,3,9,6,-11,6]],
    [1, [-13,2,-10,-3,-6,-10,-2,-13,5,-12,10,-8,13,-2,13,3,8,5,-10,5]],
    [2, [-11,1,-8,-4,-4,-9,0,-12,1,-10,-3,-7,-5,-2,-8,4]],
    [2, [11,1,9,-4,5,-9,1,-11,3,-7,4,-3,8,4]],
    [3, [0,-11,2,-7,0,-4,2,-1,1,3,-2,-1,-1,-4,-2,-7]], [2, [-5,4,4,5]],
  ]],
};

export const groundTypes = new Set([...Object.keys(pathStyles), 'glyph']);
export const propTypes = new Set(Object.keys(stamps));

function mix32(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function perpendicular(a, b) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[1] - a[1]) / length, (a[0] - b[0]) / length];
}

function move(point, vector, distance) {
  return [point[0] + vector[0] * distance, point[1] + vector[1] * distance];
}

function strip(points, width) {
  const normals = points.map((point, i) => perpendicular(points[Math.max(0, i - 1)], points[Math.min(i + 1, points.length - 1)]));
  return [
    ...points.map((point, i) => move(point, normals[i], width / 2)),
    ...points.map((point, i) => move(point, normals[i], -width / 2)).reverse(),
  ];
}

function samples(points, spacing) {
  return points.slice(1).flatMap((b, i) => {
    const a = points[i];
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const cross = perpendicular(a, b);
    const forward = [-cross[1], cross[0]];
    return Array.from({ length: Math.max(1, Math.floor(distance / spacing)) }, (_, j) => [
      move(a, forward, Math.min(distance * .85, j * spacing + spacing / 2)), cross, forward,
    ]);
  });
}

export function drawGroundDetails(brush, art, accent) {
  const random = mix32(Number(art.id.slice(1)) * 16807);
  for (const mark of art.ground) {
    const { type, points, width } = mark;
    if (type === 'glyph') {
      const [x, z] = mark.center;
      for (const radius of [mark.radius, mark.radius - .42, mark.radius * .64]) {
        const ring = Array.from({ length: 24 }, (_, i) => {
          const angle = i * Math.PI / 12;
          return [x + Math.sin(angle) * radius, z + Math.cos(angle) * radius];
        });
        brush.poly(ring, null, accent + '9d');
      }
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const p = [x + dx * mark.radius, z + dz * mark.radius];
        brush.poly([move(p, [1, 0], .23), move(p, [0, 1], .23), move(p, [-1, 0], .23), move(p, [0, -1], .23)], accent + 'aa');
      }
      continue;
    }
    const [dark, fill, light] = pathStyles[type];
    if (type !== 'grass') {
      brush.poly(strip(points, width), dark + '8c');
      brush.poly(strip(points, width * .83), fill + (type === 'slab' ? 'a8' : '94'));
    }
    if (['root', 'vein', 'fault'].includes(type)) {
      brush.path(points, dark, type === 'root' ? 3 : 2);
      brush.path(points, (type === 'vein' ? accent : light) + '94', 1);
    }
    if (type === 'ruts') {
      for (const offset of [-.31, .31]) {
        brush.path(points.map((point, i) => move(point, perpendicular(points[Math.max(0, i - 1)], points[Math.min(i + 1, points.length - 1)]), width * offset)), dark + 'c0', 2);
      }
    }
    for (const [point, cross, forward] of samples(points, type === 'slab' ? .67 : .34)) {
      if (type === 'grass') {
        for (let blade = 0; blade < 3; blade++) {
          const p = move(point, cross, (random() - .5) * width);
          const size = .19 + random() * .28;
          const tip = move(p, forward, size);
          brush.poly([p, move(p, cross, size), move(tip, cross, size * .75), tip], fill + '7d');
          brush.path([p, move(tip, cross, size * .23)], light + '7c', 1);
        }
        continue;
      }
      if (type === 'slab') {
        const left = move(point, cross, width * -.4);
        const right = move(point, cross, width * .4);
        brush.poly([left, right, move(right, forward, .47), move(left, forward, .47)], fill + '6c', dark + '96');
        const chipped = move(point, cross, (random() - .5) * width * .68);
        brush.path([chipped, move(chipped, forward, .36)], light + '5a', 1);
        continue;
      }
      const p = move(point, cross, (random() - .5) * width * .86);
      const size = .11 + random() * .17;
      const tip = move(p, forward, type === 'water' ? .35 : size * 1.5);
      brush.poly([p, move(p, cross, size), move(tip, cross, size * .65), tip], random() > .52 ? light + '7a' : dark + '85');
    }
  }
}

export function drawTerrainStamp(brush, { type, x, z, scale }) {
  const [palette, parts] = stamps[type];
  const [px, py] = brush.project(x, z);
  const pixel = 1.26 * scale;
  const align = (dx, dy) => [Math.round(px + dx * pixel), Math.round(py + dy * pixel)];
  brush.shape([align(-15, 3), align(-9, 0), align(10, 0), align(16, 4), align(11, 9), align(-9, 9)], '#211a2ca0');
  if (type === 'torch' || type === 'rift') {
    const halo = (type === 'torch' ? '#a86638' : '#a2638f') + '50';
    brush.shape([align(-13, -7), align(-8, -13), align(8, -13), align(13, -7), align(13, 2), align(7, 7), align(-7, 7), align(-13, 2)], halo);
  }
  for (const [tone, coordinates] of parts) {
    const points = coordinates.length === 4
      ? [align(coordinates[0], coordinates[1]), align(coordinates[2], coordinates[1]), align(coordinates[2], coordinates[3]), align(coordinates[0], coordinates[3])]
      : Array.from({ length: coordinates.length / 2 }, (_, i) => align(coordinates[i * 2], coordinates[i * 2 + 1]));
    brush.shape(points, palette[tone]);
  }
}
