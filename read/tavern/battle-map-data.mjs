export const routeNames = { left: '왼쪽', center: '가운데', right: '오른쪽' };
export const obstacleNames = { root: '뿌리', bank: '굳은 물가', masonry: '부서진 석벽', crystal: '광물 밑동', shard: '암반 조각' };

export function parseWaveTable(markdown) {
  const slots = text => text.split(' · ').map(name => name === '—' ? null : name);
  const waves = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('| R')) continue;
    const [id, title, power, front, rear, response] = line.slice(1, -1).split('|').map(cell => cell.trim());
    if (!/^R\d{2}[A-E]$/.test(id)) continue;
    waves.set(id, { id, title, power, response, front: slots(front), rear: slots(rear) });
  }
  return waves;
}

export function formationSlots({ x, z }) {
  return z.flatMap(depth => x.map(column => [column, depth]));
}

// Preview the split from the original slots. Runtime resolution uses the death position.
export function splitSlots(wave) {
  const boss = wave.front.indexOf('삼키는 자');
  if (boss < 0) return [];
  return [wave.front, wave.rear].flatMap((row, depth) =>
    [0, 1, 2].filter(column => !row[column] || (depth === 0 && column === boss))
      .sort((a, b) => Math.abs(a - boss) - Math.abs(b - boss) || a - b)
      .map(column => depth * 3 + column),
  ).slice(0, 2);
}

export function pathLength(points) {
  return points.slice(1).reduce((length, [x, z], index) =>
    length + Math.hypot(x - points[index][0], z - points[index][1]), 0);
}
