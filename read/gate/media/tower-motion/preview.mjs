import { phaseAt } from '../melee-motion/preview.mjs';
import { compareLink, previewSlots, drawCrowd, drawCrowdMarkers, loadCrowd } from '../standard-motion/preview.mjs';

const query = new URLSearchParams(location.search);
const revision = '8';
const version = ['1','2','3','4','5','6'].includes(query.get('version')) ? query.get('version') : revision;
const legacy = version === '1';
const base = new URL(legacy ? './' : './v'+version+'/', import.meta.url);
const element = id => document.getElementById('tower-' + id);
const faction = element('faction');
const family = element('family');
const stage = element('stage');
const motion = element('clip');
const speed = element('speed');
const play = element('play');
const replay = element('replay');
const effects = element('effects');
const crowd = element('crowd');
const scrub = element('time');
const canvas = element('stage-view');
const context = canvas.getContext('2d');
const caption = element('frame');
const sheet = element('sheet');
const download = element('sheet-download');
const labels = { demo: '연속 시연', idle: '대기', move: '이동', attack: '공격', skill: '스킬', death: '사망' };
const stages = { I: '미진화체', II: '1차 진화체', III: '2차 진화체' };
const sum = values => values.reduce((total, value) => total + value, 0);
const cache = new Map();
const clipTime = clip => Math.max(sum(clip.durationMs), sum(clip.overlay?.durationMs ?? []),
  clip.ground?.displayUntilMs ?? 0);

function options(node, records) {
  node.replaceChildren(...records.map(([id, label]) => new Option(label, id)));
}

function loadImage(path) {
  if (!cache.has(path)) {
    const image = new Image();
    image.src = new URL(path, base).href;
    cache.set(path, image.decode().then(() => image).catch(error => {
      cache.delete(path);
      throw error;
    }));
  }
  return cache.get(path);
}

function frameAt(clip, time) {
  let remaining = clip.loop ? time % sum(clip.durationMs) : time;
  for (const [index, duration] of clip.durationMs.entries()) {
    if (remaining < duration) return index;
    remaining -= duration;
  }
  return clip.frames.length - 1;
}

function background() {
  context.fillStyle = '#272a3b';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#30354a';
  context.fillRect(0, 72, canvas.width, 26);
  context.fillStyle = '#4e5164';
  context.fillRect(0, 72, canvas.width, 1);
  context.fillStyle = '#393e52';
  for (let x = 0; x < canvas.width; x += 16) context.fillRect(x, 74, 1, 24);
}

function drawImage(image, rect, x, y) {
  const [sx, sy, w, h] = rect;
  context.drawImage(image, sx, sy, w, h, Math.round(x), Math.round(y), w, h);
}

function timeline(unit) {
  const clips = unit.clips;
  return [
    { id: 'idle', duration: 640, from: 54, to: 54 },
    { id: 'move', duration: sum(clips.move.durationMs) * 2, from: 54, to: 79 },
    { id: 'attack', duration: clipTime(clips.attack) + 220, from: 79, to: 79 },
    { id: 'skill', duration: clipTime(clips.skill) + 270, from: 79, to: 79 },
    { id: 'death', duration: clipTime(clips.death) + 410, from: 79, to: 79 },
  ];
}

async function run() {
  const response = await fetch(new URL('manifest.json', base));
  if (!response.ok) throw new Error('Manifest unavailable');
  const data = await response.json();
  const legacyFx = data.effectSheet ? await loadImage(data.effectSheet) : null;
  let unit;
  let art;
  let fxImage;
  let groundImage;
  let crowdImages;
  let sequence;
  let time = 0;
  let previous = 0;
  let raf = 0;
  let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loading = 0;

  function drawFrame() {
    background();
    context.imageSmoothingEnabled = false;
    canvas.dataset.effect = '';
    let id = motion.value;
    let local = time;
    let x = 80;
    if (id === 'demo') {
      local %= sequence.reduce((total, segment) => total + segment.duration, 0);
      for (const segment of sequence) {
        if (local < segment.duration) {
          id = segment.id;
          x = segment.from + (segment.to - segment.from) * local / segment.duration;
          break;
        }
        local -= segment.duration;
      }
    }
    const clip = unit.clips[id];
    const [ox, oy] = [x - data.pivot[0], 78 - data.pivot[1]];
    const frame = frameAt(clip, local);
    const hidden = id === 'death' && local >= sum(clip.durationMs);
    const action = id === 'attack' ? unit.attackLabel : id === 'skill' && unit.skillMotionLabel;
    const phase = phaseAt(clip, local);
    const label = [action || labels[id], phase, hidden ? '종료' : (frame + 1) + ' / ' + clip.frames.length]
      .filter(Boolean).join(' · ');
    canvas.dataset.unit = unit.id;
    canvas.dataset.clip = id;
    canvas.dataset.frame = hidden ? '' : String(frame);
    canvas.dataset.phase = phase;
    const marked = effects.checked && groundImage && clip.ground &&
      local >= clip.ground.displayFromMs && local < clip.ground.displayUntilMs;
    canvas.dataset.ground = marked ? clip.ground.area.shape : '';
    canvas.dataset.impact = effects.checked && clip.previewProjectile ?
      (local >= clip.previewProjectile.impactMs ? 'contact' :
        local >= clip.previewProjectile.releaseMs ? 'travel' : '') : '';
    scrub.value = Math.floor(time % (Number(scrub.max) + 1));
    if (caption.textContent !== label) caption.textContent = label;
    if (marked) {
      const track = clip.ground;
      drawImage(groundImage, track.frames[frameAt(track, local)], x - track.pivot[0], 78 - track.pivot[1]);
    }
    const slots = crowdImages ? previewSlots(canvas.width, x, 78, 'right', clip, crowd.checked) : [];
    canvas.dataset.guard = clip.guard?.style ?? '';
    canvas.dataset.recipients = String(slots.filter(slot => slot.guardTarget).length);
    drawCrowd(context, crowdImages, slots);
    if (!hidden) drawImage(art, clip.frames[frame], ox, oy);
    drawForeground(clip, local, x, ox, oy);
    drawCrowdMarkers(context, slots);
  }

  function drawForeground(clip, local, x, ox, oy) {
    if (!effects.checked || !clip.cue) return;
    if (clip.overlay) {
      const overlay = clip.overlay;
      if (local >= sum(overlay.durationMs)) return;
      drawImage(fxImage, overlay.frames[frameAt(overlay, local)], x - overlay.pivot[0], 78 - overlay.pivot[1]);
      if (local >= clip.cue.timeMs) canvas.dataset.effect = overlay.id;
      return;
    }
    const effect = data.effects[clip.effect];
    const since = local - sum(clip.durationMs.slice(0, clip.cue.frame));
    if (since < 0 || since >= sum(effect.durationMs)) return;
    const [ex, ey] = clip.cue.anchor;
    drawImage(fxImage, effect.frames[frameAt(effect, since)], ox + ex - 32, oy + ey - 32);
    canvas.dataset.effect = clip.effect;
  }

  function endOfClip() {
    const clip = unit.clips[motion.value];
    if (!clip || clip.loop) return Infinity;
    if (clip.overlay || clip.ground) return clipTime(clip);
    const effectTail = clip.cue ? sum(clip.durationMs.slice(0, clip.cue.frame)) +
      sum(data.effects[clip.effect].durationMs) : 0;
    return Math.max(sum(clip.durationMs), effectTail);
  }

  function step(now) {
    raf = 0;
    if (!running) return;
    const until = endOfClip();
    time = Math.min(until, time + (now - previous) * Number(speed.value));
    previous = now;
    drawFrame();
    if (time < until) raf = requestAnimationFrame(step);
    else {
      running = false;
      play.textContent = '재생';
    }
  }

  function update({ restart = false, autoplay = running } = {}) {
    cancelAnimationFrame(raf);
    if (restart || (autoplay && time >= endOfClip())) time = 0;
    running = autoplay;
    if (data.skillVisibility) compareLink(element('version-link'), data.skillVisibility.sourceVersion.slice(1), unit.id, motion.value);
    play.textContent = running ? '일시정지' : '재생';
    scrub.max = motion.value === 'demo' ? sequence.reduce((total, segment) => total + segment.duration, 0) - 1 :
      unit.clips[motion.value].loop ? clipTime(unit.clips[motion.value]) - 1 : endOfClip();
    drawFrame();
    if (running) {
      previous = performance.now();
      raf = requestAnimationFrame(step);
    }
  }

  function fillFamilies() {
    const names = data.units.filter(item => item.faction === faction.value && item.stage === 'III');
    options(family, names.map(item => [item.family, item.name]));
  }

  function fillStages() {
    options(stage, data.units.filter(item => item.family === family.value)
      .map(item => [item.stage, stages[item.stage] + ' · ' + item.name]));
    stage.value = 'III';
  }

  async function selectUnit() {
    const token = ++loading;
    const selected = data.units.find(item => item.family === family.value && item.stage === stage.value);
    caption.textContent = selected.name + ' 불러오는 중';
    let image;
    let overlay;
    let range;
    try {
      [image, overlay, range] = await Promise.all([loadImage(selected.sheet),
        selected.fxSheet ? loadImage(selected.fxSheet) : legacyFx,
        selected.groundSheet ? loadImage(selected.groundSheet) : null]);
      if (selected.clips.skill?.guard?.previewAllyOffsets.length) crowdImages ??= await loadCrowd();
    }
    catch {
      if (token === loading) caption.textContent = selected.name + ' 스프라이트를 열지 못했습니다.';
      return;
    }
    if (token !== loading) return;
    unit = selected;
    art = image;
    fxImage = overlay;
    groundImage = range;
    sequence = timeline(unit);
    sheet.src = image.src;
    sheet.width = image.naturalWidth;
    sheet.height = image.naturalHeight;
    sheet.alt = unit.name + ' · 대기, 이동, 공격, 스킬, 사망 도트 시트';
    download.href = image.src;
    download.download = unit.id + '.png';
    const fxPreview = element('fx-sheet');
    fxPreview.classList.toggle('legacy-fx', !selected.fxSheet);
    fxPreview.src = overlay.src;
    fxPreview.width = overlay.naturalWidth;
    fxPreview.height = overlay.naturalHeight;
    element('fx-download').href = overlay.src;
    element('fx-download').download = selected.fxSheet ? unit.id + '-fx.png' : 'effects.png';
    element('fx-download').textContent = selected.fxSheet ? '선택 유닛 이펙트 PNG' : '공용 이펙트 PNG';
    element('ground-panel').hidden = !range;
    if (range) {
      const preview = element('ground-sheet');
      preview.src = range.src;
      preview.width = range.naturalWidth;
      preview.height = range.naturalHeight;
      const link = element('ground-download');
      link.href = range.src;
      link.download = unit.id + '-ground.png';
    }
    element('ability').textContent = unit.name + ' · 스킬 ' + unit.ability;
    element('choreography').textContent = [unit.attackLabel && '기본 공격 · '+unit.attackLabel, unit.choreography]
      .filter(Boolean).join(' / ');
    document.getElementById('clip-list').replaceChildren(...Object.entries(unit.clips).map(([key, clip]) => {
      const item = document.createElement('li');
      item.textContent = labels[key] + ' ' + clip.frames.length + '장';
      return item;
    }));
    update({ restart: true });
  }

  options(faction, [...new Set(data.units.map(item => item.faction))].map(name => [name, name]));
  options(motion, Object.entries(labels));
  const initial = data.units.find(item => item.id === query.get('unit')) ??
    data.units.find(item => item.id === (legacy || version === '2' ? 'st05-iii' :
      version === '3' ? 'ht04-iii' : ['6',revision].includes(version) ? 'st01-iii' : 'ht03-iii'));
  faction.value = initial.faction;
  fillFamilies();
  family.value = initial.family;
  fillStages();
  stage.value = initial.stage;
  if (Object.hasOwn(labels,query.get('motion'))) motion.value = query.get('motion');
  else if (data.guardRevision && !query.has('unit')) motion.value = 'skill';
  await selectUnit();
  for (const control of [faction, family, stage, motion, speed, play, replay, effects, scrub]) control.disabled = false;
  faction.addEventListener('change', () => { fillFamilies(); fillStages(); selectUnit(); });
  family.addEventListener('change', () => { fillStages(); selectUnit(); });
  stage.addEventListener('change', selectUnit);
  motion.addEventListener('change', () => update({ restart: true, autoplay: true }));
  play.addEventListener('click', () => update({ autoplay: !running }));
  replay.addEventListener('click', () => update({ restart: true, autoplay: true }));
  effects.addEventListener('change', drawFrame);
  if (data.standardRevision) {
    crowd.disabled = false;
    crowd.addEventListener('change', async () => {
      try {
        if (crowd.checked) crowdImages ??= await loadCrowd();
      } catch { crowd.checked = false; }
      drawFrame();
    });
  } else {
    crowd.closest('label').style.display = 'none';
  }
  scrub.addEventListener('input', () => { time = Number(scrub.value); update({ autoplay: false }); });
  document.getElementById('body-summary').textContent = data.units.length + '개 형태 · 본체 ' +
    data.bodyFrames.toLocaleString('ko-KR') + '프레임' +
    (data.overlayFrames ? ' · 이펙트 ' + data.overlayFrames.toLocaleString('ko-KR') + '셀' : '') +
    (data.standardRevision ? ' · 범위 표시 '+data.standardRevision.groundTracks+'종.' :
      data.rangedRevision ? ' · 활 '+data.rangedRevision.bowAttack+'개 형태 · 지팡이 '+data.rangedRevision.staffAttack+'개 형태 개정.' :
      data.meleeRevision ? ' · 기본 공격 개정 '+data.meleeRevision.attack+'개 형태.' :
      '. 본체 시트는 대기 / 이동 / 공격 / 스킬 / 사망 순서입니다.');
}

if (version !== revision) {
  element('revision').textContent = '이전 모션을 재생 중입니다.';
  element('version-link').textContent = '개선본 보기';
  const revised = new URL(location.href);
  revised.searchParams.delete('version');
  element('version-link').href = revised.href;
  element('package').href = new URL(legacy ? 'ally-tower-motions.zip' : 'ally-tower-motions-v'+version+'.zip', base).href;
  element('manifest').href = new URL('manifest.json', base).href;
  element('readme').href = new URL('README.md', base).href;
  const source = legacy ? 'source/prompts.md' : version === '2' ? '../source/key-poses/prompts.md' :
    version === '6' ? '../../guard-motion/source/README.md' : version === '5' ? '../../standard-motion/source/README.md' :
      version === '4' ? '../../ranged-motion/source/README.md' : '../../melee-motion/source/README.md';
  element('sources').href = new URL(source, base).href;
}
run().catch(() => { caption.textContent = '재생 파일을 열지 못했습니다. 전체 ZIP을 내려받을 수 있습니다.'; });
