
const requests = new Map();

export function read(path, format = 'json') {
  const url = new URL(path, import.meta.url);
  if (!requests.has(url.href)) {
    const request = fetch(url).then(response => {
      if (!response.ok) throw new Error(path);
      return format === 'text' ? response.text() : response.json();
    });
    requests.set(url.href, request);
    request.catch(() => requests.delete(url.href));
  }
  return requests.get(url.href);
}

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function image(src, alt) {
  const result = el('img');
  result.src = src;
  result.alt = alt;
  result.loading = 'lazy';
  result.decoding = 'async';
  return result;
}

export function figure(src, alt, caption) {
  const result = el('figure');
  result.append(image(src, alt || caption));
  if (caption) result.append(el('figcaption', caption));
  return result;
}

export function button(title, onClick, className) {
  const result = el('button', title, className);
  result.type = 'button';
  result.addEventListener('click', onClick);
  return result;
}

export function selectField(name, options, changed) {
  const label = el('label', name);
  const input = el('select');
  input.replaceChildren(...options.map(([value, title]) => new Option(title, value)));
  input.addEventListener('change', changed);
  label.append(input);
  return {label, input};
}

export function fold(title, render) {
  const node = el('details');
  const panel = el('div');
  node.append(el('summary', title), panel);
  node.addEventListener('toggle', async () => {
    if (!node.open || panel.hasChildNodes()) return;
    panel.append(el('p', '불러오는 중…'));
    try {
      await render(panel);
    } catch {
      panel.replaceChildren(el('p', '자료를 불러오지 못했습니다.'));
    }
  });
  return node;
}

export const plain = value => String(value || '')
  .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/(\*\*|__|\x60)/g, '')
  .replace(/^#+\s+/, '').trim();

export function chips(values) {
  const result = el('ul', null, 'stat-row');
  result.append(...values.filter(Boolean).map(value => el('li', value)));
  return result;
}

export function table(headers, rows, caption) {
  const wrap = el('div', null, 'table-wrap');
  const grid = el('table');
  if (caption) grid.createCaption().textContent = caption;
  const header = grid.createTHead().insertRow();
  headers.forEach(value => {
    const cell = el('th', value);
    cell.scope = 'col';
    header.append(cell);
  });
  const tbody = grid.createTBody();
  for (const row of rows) {
    const tr = tbody.insertRow();
    row.forEach(value => tr.insertCell().textContent = value);
  }
  wrap.append(grid);
  window.prepareMakReadingTables(grid);
  return wrap;
}

const columns = line => line.trim().replace(/^\||\|$/g, '').split('|').map(plain);
const divider = line => /^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(line.trim());

export function renderSpec(source) {
  const fragment = document.createDocumentFragment();
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  for (let i = 0; i < lines.length;) {
    const line = lines[i++].trim();
    if (!line || line.startsWith('# ') || /^\[.+\]\(.+\)$/.test(line)) continue;
    const heading = line.match(/^#{2,}\s+(.*)$/);
    if (heading) {
      fragment.append(el('h4', plain(heading[1])));
      continue;
    }
    if (line.startsWith('|') && lines[i] && divider(lines[i])) {
      const rows = [];
      i++;
      while (lines[i]?.trim().startsWith('|')) rows.push(columns(lines[i++]));
      fragment.append(table(columns(line), rows));
      continue;
    }
    const unordered = /^[-*]\s+(.*)$/;
    const ordered = /^\d+\.\s+(.*)$/;
    const itemPattern = ordered.test(line) ? ordered : unordered;
    const listItem = line.match(itemPattern);
    if (listItem) {
      const list = el(itemPattern === ordered ? 'ol' : 'ul', null, 'short-list');
      if (list.tagName === 'OL') list.start = Number.parseInt(line, 10);
      let item = listItem;
      do {
        list.append(el('li', plain(item[1])));
        item = lines[i]?.trim().match(itemPattern);
        if (item) i++;
      } while (item);
      fragment.append(list);
      continue;
    }
    const drawing = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (drawing) {
      fragment.append(el('p', drawing[1]));
      continue;
    }
    fragment.append(el('p', plain(line)));
  }
  return fragment;
}

export function entries(source) {
  const result = new Map();
  let target;
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('#')) {
      const match = line.match(/^#{3,4}\s+([SHB][CT]\d{2})\s/);
      target = match ? {} : null;
      if (target) result.set(match[1], target);
      continue;
    }
    if (!target) continue;
    const row = line.match(/^\*\*([^*]+)\*\*([\s\S]*)$/);
    if (!row) continue;
    const refs = [...row[2].matchAll(/\[([^\]]+)\]\(https?:[^)]+\)/g)].map(item => item[1]);
    const value = plain(row[2].replace(/\s*(?:[·ㆍ]\s*)?\[[^\]]+\]\([^)]+\)/g, ''));
    target[row[1].replace(/\.$/, '')] = {value, refs};
  }
  return result;
}

const MOTION = {
  tower: 'media/tower-motion/v8/',
  combat: 'media/combat-motion/v9/',
};
const labels = {idle:'대기', move:'이동', attack:'공격', attackAlt:'교대 공격', hit:'피격', skill:'스킬', death:'사망'};

const loadImage = src => new Promise((resolve, reject) => {
  const picture = new Image();
  picture.onload = () => resolve(picture);
  picture.onerror = reject;
  picture.src = src;
});

export async function renderMotion(container, kind, ids) {
  const root = MOTION[kind];
  const source = await read(root + 'manifest.json');
  const available = ids.map(id => source.units.find(unit => unit.id === id)).filter(Boolean);
  if (!available.length) {
    container.replaceChildren(el('p', '현재 등록된 별도 모션이 없습니다.'));
    return;
  }

  const player = el('div', null, 'motion-player');
  const controls = el('div', null, 'catalog-controls');
  const screen = el('div', null, 'motion-screen');
  const canvas = el('canvas');
  canvas.width = 190;
  canvas.height = 132;
  canvas.setAttribute('aria-label', '도트 모션 프레임 미리보기');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  screen.append(canvas);
  const meta = el('p', null, 'motion-meta');
  const originals = el('details');
  originals.append(el('summary', '본체 · 이펙트 시트'));
  let unit = available[0], current, body, effects, ticket = 0, playing = false, frame = 0, frameTime = 0, start = 0, request = 0;

  const frames = selectField('동작', [], () => setClip());
  const picker = selectField('형태', available.map(item => [item.id, item.name]), () => {
    unit = available.find(item => item.id === picker.input.value);
    setUnit().catch(() => { meta.textContent = '모션 이미지를 불러오지 못했습니다.'; });
  });
  if (available.length > 1) controls.append(picker.label);
  const effectSwitch = el('label', '이펙트');
  const overlay = el('input');
  overlay.type = 'checkbox';
  overlay.checked = true;
  overlay.addEventListener('change', () => draw(frame, frameTime));
  effectSwitch.append(overlay);
  const play = button('재생', () => {
    if (!current || !body) return;
    if (playing) return stop();
    playing = true;
    play.textContent = '정지';
    start = performance.now();
    request = requestAnimationFrame(tick);
  });
  const step = button('다음 프레임', () => {
    if (!current || !body) return;
    stop();
    const next = (frame + 1) % current.frames.length;
    draw(next, current.durationMs.slice(0, next).reduce((sum, number) => sum + number, 0));
  });
  controls.append(frames.label, effectSwitch, play, step);
  player.append(controls, screen, meta, originals);
  container.replaceChildren(player);

  function stop() {
    playing = false;
    cancelAnimationFrame(request);
    play.textContent = '재생';
  }
  function locate(durations, elapsed) {
    for (let index = 0; index < durations.length - 1; index++) {
      if (elapsed < durations[index]) return index;
      elapsed -= durations[index];
    }
    return durations.length - 1;
  }
  function blit(texture, rect, pivot) {
    if (!texture || !rect) return;
    const [sx, sy, width, height] = rect;
    ctx.drawImage(texture, sx, sy, width, height, 93 - pivot[0], 102 - pivot[1], width, height);
  }
  function draw(index, time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!current || !body) return;
    frame = index;
    frameTime = time;
    const layer = current.overlay;
    blit(body, current.frames[index], unit.bodyPivot || source.pivot || [32, 57]);
    if (overlay.checked && layer && time < layer.durationMs.reduce((sum, value) => sum + value, 0))
      blit(effects, layer.frames[locate(layer.durationMs, time)], layer.pivot || [45, 79]);
    const duration = current.durationMs.reduce((sum, value) => sum + value, 0);
    const cue = current.cue?.timeMs;
    meta.textContent = (index + 1) + ' / ' + current.frames.length + ' 프레임 · ' + duration + 'ms' +
      (cue == null ? '' : ' · 접촉/발동 ' + cue + 'ms');
  }
  function tick(now) {
    const panel = container.closest('details');
    if (!playing || !container.isConnected || panel && !panel.open) {
      stop();
      return;
    }
    const total = current.durationMs.reduce((sum, value) => sum + value, 0);
    const elapsed = now - start;
    if (!current.loop && elapsed >= total) {
      draw(current.frames.length - 1, total);
      stop();
      return;
    }
    const time = elapsed % total;
    draw(locate(current.durationMs, time), time);
    request = requestAnimationFrame(tick);
  }
  function setClip() {
    stop();
    current = unit.clips[frames.input.value];
    draw(0, 0);
  }
  async function setUnit() {
    const id = ++ticket;
    stop();
    body = effects = null;
    const clipKeys = Object.keys(unit.clips).filter(key => unit.clips[key]?.frames?.length);
    frames.input.replaceChildren(...clipKeys.map(key => new Option(labels[key] || key, key)));
    const sheet = root + unit.sheet;
    originals.replaceChildren(el('summary', '본체 · 이펙트 시트'), figure(sheet, unit.name + ' 본체 시트'));
    if (unit.fxSheet) originals.append(figure(root + unit.fxSheet, unit.name + ' 이펙트 시트'));
    const [base, fx] = await Promise.all([loadImage(sheet), unit.fxSheet ? loadImage(root + unit.fxSheet).catch(() => null) : null]);
    if (id !== ticket) return;
    body = base;
    effects = fx;
    setClip();
  }
  await setUnit();
}
