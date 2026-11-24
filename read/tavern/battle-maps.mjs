import { parseWaveTable, pathLength, splitSlots } from './battle-map-data.mjs';
import { drawBattleMap, drawConnectedMaps } from './battle-map-drawing.mjs';

export async function mountBattleMaps(root, { signal, initialRound } = {}) {
const element = id => root.querySelector('#' + id);
const canvas = element('battle-map');
const illustrations = element('map-illustrations');
const candidate = element('enemy-wave');
const formation = element('ally-formation');
const view = element('camera-view');
const guides = element('map-guides');
const split = element('map-split');
const content = element('map-content');
const loading = element('map-loading');

async function load(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(path + ' ' + response.status);
  return response;
}

function fillRoster(wave) {
  const rows = [['전열', wave.front], ['후열', wave.rear]];
  element('map-roster').replaceChildren(...rows.map(([name, units]) => {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = name;
    row.append(heading);
    for (const unit of units) {
      const cell = document.createElement('td');
      cell.textContent = unit ?? '빈칸';
      row.append(cell);
    }
    return row;
  }));
}

try {
  const [design, art, source] = await Promise.all([
    load('battle-maps.json').then(response => response.json()),
    load('battle-map-decoration.json').then(response => response.json()),
    load('docs/enemy-waves.md').then(response => response.text()),
  ]);
  if (signal?.aborted) return;
  const waveTable = parseWaveTable(source);
  if (waveTable.size !== 75 || design.rounds.length !== 15 || design.transitions.length !== 16) throw new Error('Invalid map catalog');
  const regionById = new Map(design.regions.map(region => [region.id, region]));
  const roundById = new Map(design.rounds.map(round => [round.id, round]));
  const edgeById = new Map(design.transitions.map(edge => [edge.id, edge]));
  const artByRound = new Map(art.rounds.map(record => [record.id, record]));
  const artByRegion = new Map(art.regions.map(record => [record.id, record]));
  const roundButtons = new Map();
  let round;
  let illustratedRounds = '';

  function mapScene(record) {
    return {
      arena: design.arena, region: regionById.get(record.region), round: record,
      edges: { left: edgeById.get(record.edges.left), right: edgeById.get(record.edges.right) },
      art: artByRound.get(record.id),
    };
  }

  function paint() {
    const wave = waveTable.get(candidate.value);
    const illustrated = view.value === 'art' || view.value === 'art-connection';
    const connected = view.value === 'connected' || view.value === 'art-connection';
    const interactive = !illustrated && !connected;
    const showSplit = interactive && round.id === 'r15' && split.checked;
    const scene = mapScene(round);
    const caption = element('map-caption');
    const download = element('map-download');
    const nextDownload = element('next-map-download');
    let entryEdge = scene.edges.left;
    let exitEdge = scene.edges.right;
    const index = Math.min(Number(round.id.slice(1)) - 1, design.rounds.length - 2);
    const first = connected ? mapScene(design.rounds[index]) : scene;
    const next = connected ? mapScene(design.rounds[index + 1]) : null;
    if (connected) {
      entryEdge = first.edges.left;
      exitEdge = next.edges.right;
    }
    canvas.hidden = illustrated;
    illustrations.hidden = !illustrated;
    illustrations.classList.toggle('is-connected', illustrated && connected);
    illustrations.tabIndex = illustrated && connected ? 0 : -1;
    element('map-art-zoom').hidden = !illustrated;
    nextDownload.hidden = !illustrated || !connected;
    if (illustrated) {
      const maps = connected ? [first, next] : [first];
      const path = ({ round }) => `media/battle-maps/v12/${round.id}.png`;
      const key = maps.map(map => map.round.id).join('-');
      if (illustratedRounds !== key) {
        illustrations.replaceChildren(...maps.map((map, position) => {
          const image = document.createElement('img');
          if (position === 0) image.id = 'battle-map-art-primary';
          image.alt = `${Number(map.round.id.slice(1))}라운드 ${map.round.name} 전장. ${map.art.description}`;
          image.src = path(map);
          image.decoding = 'async';
          return image;
        }));
        illustrations.scrollLeft = (illustrations.scrollWidth - illustrations.clientWidth) / 2;
        illustratedRounds = key;
      }
      if (connected) {
        caption.textContent = `${index + 1}라운드 오른쪽에서 ${index + 2}라운드 왼쪽으로 ‘${first.edges.right.name}’ 지형이 이어진다.`;
        nextDownload.href = path(next);
        nextDownload.download = `${next.round.id}.png`;
      } else {
        const number = Number(round.id.slice(1));
        const terrain = number >= 13 ? '갈라진 암반과 외신의 균열'
          : number >= 10 ? '자두빛 석재와 청록 샘'
            : number >= 7 ? '회갈색 바닥과 마른 뿌리'
              : number >= 4 ? '황갈색 흙과 시드는 숲'
                : '황토길과 솔숲';
        caption.textContent = `${round.name} · ${terrain} · 가로 55° 전장 배경`;
      }
      download.href = path(first);
      download.download = `${first.round.id}.png`;
      download.textContent = connected ? '이전 맵 PNG' : '원본 PNG';
    } else {
      if (illustratedRounds) {
        illustrations.replaceChildren();
        illustratedRounds = '';
      }
      const width = connected ? 1280 : 640;
      const height = connected ? 394 : 408;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (connected) {
        drawConnectedMaps(canvas, first, next);
        canvas.setAttribute('aria-label', `${index + 1} → ${index + 2}라운드 연결 · ${first.edges.right.name}`);
        caption.textContent = `${index + 1}라운드 오른쪽과 ${index + 2}라운드 왼쪽이 ‘${first.edges.right.name}’에서 맞닿는다.`;
        download.download = `${first.round.id}-${next.round.id}-connection.png`;
      } else {
        drawBattleMap(canvas, { ...scene, wave, formation: formation.value, view: view.value, guides: guides.checked, showSplit });
        canvas.setAttribute('aria-label', `${round.name} · ${wave.id} ${wave.title} · ${view.selectedOptions[0].textContent}`);
        const direction = '왼쪽은 아군 출전 구역, 오른쪽은 적 출전 구역이다.';
        caption.textContent = guides.checked ? direction + ' 점선은 이동 경로 예시다.' : direction + ' 출전 슬롯과 장애물 위치를 표시한다.';
        download.download = `${wave.id}-${view.value}${showSplit ? '-split' : ''}.png`;
      }
      download.href = canvas.toDataURL('image/png');
      download.textContent = '도면 PNG';
    }
    for (const [key, side, edge] of [['left', '왼쪽', entryEdge], ['right', '오른쪽', exitEdge]]) {
      const badge = element('map-edge-' + key);
      badge.textContent = `${side} · ${edge.name}`;
      badge.style.setProperty('--edge-tone', edge.accent);
    }
    formation.disabled = !interactive;
    guides.disabled = !interactive;
    split.disabled = !interactive;
    element('map-guides-option').hidden = illustrated;
    element('map-split-option').hidden = !interactive || round.id !== 'r15';
    element('map-key').hidden = illustrated;
    element('map-split-key').hidden = !showSplit;
    const summary = element('map-split-summary');
    summary.hidden = !showSplit;
    if (showSplit) {
      const lanes = ['위 (좌)', '가운데', '아래 (우)'];
      const spaces = splitSlots(wave).map(index => `${index < 3 ? '전열' : '후열'} ${lanes[index % 3]}`);
      summary.textContent = `시작 슬롯 기준 분열 예시 · ${spaces.join(' · ')}`;
    }
  }

  function changeWave() {
    const wave = waveTable.get(candidate.value);
    element('map-wave-name').textContent = `${wave.id} · ${wave.title}`;
    element('map-wave-power').textContent = wave.power === '권능 없음' ? wave.power : `권능 · ${wave.power}`;
    fillRoster(wave);
    paint();
  }

  function changeRound(id) {
    round = roundById.get(id);
    const number = Number(id.slice(1));
    const region = regionById.get(round.region);
    for (const [key, button] of roundButtons) {
      if (key === id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    const candidates = Array.from('ABCDE', letter => waveTable.get('R' + id.slice(1) + letter));
    candidate.replaceChildren(...candidates.map(wave => new Option(wave.id + ' · ' + wave.title, wave.id)));
    candidate.value = round.reviewWave;
    split.checked = false;
    element('map-location').textContent = `${number}라운드 · ${region.name}`;
    element('round-name').textContent = round.name;
    element('map-landmark').textContent = artByRound.get(id).description;
    const artNotes = artByRegion.get(round.region);
    element('map-materials').textContent = artNotes.materials;
    element('map-light').textContent = artNotes.light;
    element('map-design').textContent = round.design;
    element('map-test').textContent = round.test;
    element('map-obstacles').textContent = round.obstacles.length + '곳';
    const detour = Math.max(...Object.values(round.paths).map(points => pathLength(points) - pathLength([points[0], points.at(-1)])));
    element('map-detour').textContent = '+' + detour.toFixed(2);
    changeWave();
  }

  const nav = element('round-nav');
  for (const region of design.regions) {
    const group = document.createElement('div');
    group.className = 'round-group';
    group.style.setProperty('--region-color', region.landmark);
    const label = document.createElement('p');
    label.textContent = region.name;
    const buttons = document.createElement('div');
    buttons.className = 'round-buttons';
    for (const map of design.rounds.filter(record => record.region === region.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = map.id.slice(1);
      button.setAttribute('aria-label', `${Number(map.id.slice(1))}라운드 ${map.name}`);
      button.addEventListener('click', () => changeRound(map.id));
      roundButtons.set(map.id, button);
      buttons.append(button);
    }
    group.append(label, buttons);
    nav.append(group);
  }
  candidate.addEventListener('change', changeWave);
  for (const control of [formation, view, guides, split]) control.addEventListener('change', paint);
  if (new URLSearchParams(location.search).get('view') === 'art-connection') view.value = 'art-connection';
  const entry = initialRound ?? location.hash.slice(1);
  changeRound(roundById.has(entry) ? entry : 'r01');
  loading.hidden = true;
  content.hidden = false;
  const observer = new ResizeObserver(paint);
  observer.observe(canvas);
  signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
  await document.fonts.load('12px "Cavern Text"', 'B123456');
  if (!signal?.aborted) paint();
} catch (error) {
  console.error(error);
  content.hidden = true;
  loading.hidden = false;
  loading.textContent = '전장 설계 데이터를 불러오지 못했습니다.';
}
}

const standaloneAtlas = document.querySelector('body > .map-atlas');
if (standaloneAtlas) void mountBattleMaps(standaloneAtlas);
