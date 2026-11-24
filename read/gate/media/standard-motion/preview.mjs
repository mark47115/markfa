const sampleSheets = [
  new URL('../tower-motion/v4/sheets/st01-i.png', import.meta.url),
  new URL('../combat-motion/v2/sheets/mist-taken.png', import.meta.url),
];

let crowdImages;

export function compareLink(link, version, unit, motion, group) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries({version, unit, motion, group})) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (link.href !== url.href) link.href = url.href;
}

export function loadCrowd() {
  crowdImages ??= Promise.all(sampleSheets.map(src => {
    const image = new Image();
    image.src = src.href;
    return image.decode().then(() => image);
  })).catch(error => { crowdImages = undefined; throw error; });
  return crowdImages;
}

export function crowdSlots(width, x, y, facing, track) {
  const direction = facing === 'left' ? -1 : 1;
  const target = track.previewProjectile?.targetPx[0] ??
    track.ground?.area.anchorPx ?? 43 * direction;
  const clamp = value => Math.min(width - 11, Math.max(11, value));
  const points = [[x + target, 1, 1], [x + 57 * direction, -9, 1], [x + 25 * direction, 7, 1],
    [x - 34 * direction, 5, 0], [x - 48 * direction, -6, 0]];
  return points.map(([px, dy, rival]) => ({ x: clamp(px), y: y + dy,
    team: facing === 'left' ? 1 - rival : rival })).sort((a,b) => a.y - b.y);
}

export function previewSlots(width, x, y, facing, track, dense) {
  const allies = (track.guard?.previewAllyOffsets ?? []).map(([dx,dy]) => ({
    x: x + dx, y: y + dy, team: facing === 'left' ? 1 : 0, guardTarget:true,
  }));
  const nearby = dense ? crowdSlots(width, x, y, facing, track) : [];
  return [...allies, ...nearby.filter(slot => !allies.some(ally =>
    Math.abs(slot.x - ally.x) < 16 && Math.abs(slot.y - ally.y) < 13))].sort((a,b) => a.y - b.y);
}

export function drawCrowd(context, images, slots) {
  for (const {x, y, team} of slots) {
    const scale = 0.57;
    context.drawImage(images[team], 0, 0, 64, 64, Math.round(x - 32 * scale),
      Math.round(y - 57 * scale), 36, 36);
  }
}

export function drawCrowdMarkers(context, slots) {
  for (const {x, y, team, guardTarget} of slots) {
    const color = team ? '#f4a67a' : '#8ce6d3';
    context.fillStyle = '#191724';
    context.fillRect(x - 7, y - 27, 14, 3);
    context.fillStyle = color;
    context.fillRect(x - 6, y - 26, guardTarget ? 4 : 9, 1);
    if (team) {
      context.fillRect(x - 2, y + 2, 5, 1);
      context.fillRect(x - 1, y + 3, 3, 1);
      context.fillRect(x, y + 4, 1, 1);
    } else {
      context.fillRect(x - 4, y + 3, 9, 1);
    }
  }
}
