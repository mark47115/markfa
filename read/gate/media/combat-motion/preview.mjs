import { phaseAt } from '../melee-motion/preview.mjs';
import { compareLink, previewSlots, drawCrowd, drawCrowdMarkers, loadCrowd } from '../standard-motion/preview.mjs';

const find = key => document.getElementById('motion-' + key);
const canvas = find('stage');
const brush = canvas.getContext('2d');
const group = find('group');
const filter = find('filter');
const unit = find('unit');
const clip = find('clip');
const speed = find('speed');
const play = find('play');
const replay = find('replay');
const effects = find('effects');
const crowd = find('crowd');
const scrub = find('time');
const state = find('state');
const motionLabels = { demo:'연속 시연', idle:'대기', move:'이동', attack:'기본 공격', attackAlt:'변형 공격', skill:'스킬', hit:'피격', death:'사망' };
const groupLabels = { enemies:'외신 적', income:'인컴', commanders:'지휘관' };
const stages = { I:'미진화체', II:'1차 진화체', III:'2차 진화체' };
const search = new URLSearchParams(location.search);
const revision = '9';
const version = ['1','2','3','4','6','7','8'].includes(search.get('version')) ? search.get('version') : revision;
const legacy = version === '1';
const source = new URL(legacy ? './' : './v'+version+'/', import.meta.url);
const lru = new Map();
const sum = list => list.reduce((t,n) => t+n,0);
const length = row => Math.max(sum(row.durationMs), row.overlay ? sum(row.overlay.durationMs) : 0,
  row.ground?.displayUntilMs ?? 0);
const choose = (select, entries) => select.replaceChildren(...entries.map(([value,label]) => new Option(label,value)));

function artwork(file) {
  if (!lru.has(file)) {
    const image = new Image();
    image.src = new URL(file, source);
    lru.set(file, image.decode().then(() => image).catch(error => { lru.delete(file); throw error; }));
    if (lru.size > 20) lru.delete(lru.keys().next().value);
  }
  return lru.get(file);
}

function frameAt(track,time) {
  let remaining = time;
  for (const [index,duration] of track.durationMs.entries()) {
    if (remaining < duration) return index;
    remaining -= duration;
  }
  return track.frames.length-1;
}

function draw(image,rect,x,y) {
  const [left,top,width,height] = rect;
  brush.drawImage(image,left,top,width,height,Math.round(x),Math.round(y),width,height);
}

function ground() {
  brush.fillStyle = '#272a3b';
  brush.fillRect(0,0,canvas.width,canvas.height);
  brush.fillStyle = '#30364a';
  brush.fillRect(0,79,canvas.width,canvas.height-79);
  brush.fillStyle = '#4e536b';
  brush.fillRect(0,79,canvas.width,1);
  brush.fillStyle = '#40465d';
  for (let column=0;column<canvas.width;column+=16) brush.fillRect(column,81,1,canvas.height-81);
}

function timeline(record) {
  const order = ['idle','move','attack','attackAlt','hit','skill','death'].filter(key => record.clips[key]);
  return order.map(key => ({ key, duration: key==='idle' ? 565 : key==='move' ? length(record.clips.move)*2 :
    length(record.clips[key])+ (key==='death' ? 350 : 140) }));
}

async function initialize() {
  const response = await fetch(new URL('manifest.json',source));
  if (!response.ok) throw new Error('Motion manifest unavailable');
  const data = await response.json();
  let current, body, overlay, groundImage, crowdImages, sequence, request = 0, time = 0, tick = 0, animation = 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controls = [group, filter, unit, clip, speed, play, replay, effects, scrub];
  const stageY = 84;

  function maximum() {
    return clip.value==='demo' ? sum(sequence.map(s=>s.duration)) : length(current.clips[clip.value]);
  }
  function loops() {
    return clip.value==='demo' || current.clips[clip.value].loop;
  }

  function display() {
    ground();
    brush.imageSmoothingEnabled = false;
    let clock = time;
    let key = clip.value;
    let x = 85;
    if (key==='demo') {
      clock = time%maximum();
      for (const segment of sequence) {
        if (clock<segment.duration) { key = segment.key; break; }
        clock -= segment.duration;
      }
      const sign = current.facing==='left' ? -1 : 1;
      if (key==='idle' && !current.fixed) x -= sign*23;
      if (key==='move') x -= sign*(23-clock/sequence.find(item=>item.key==='move').duration*23);
    }
    const track = current.clips[key];
    const local = track.loop ? clock%sum(track.durationMs) : clock;
    const index = frameAt(track,local);
    const hidden = key==='death' && clock>=sum(track.durationMs);
    const marked = effects.checked && groundImage && track.ground &&
      clock >= track.ground.displayFromMs && clock < track.ground.displayUntilMs;
    if (marked) {
      const zone = track.ground;
      draw(groundImage,zone.frames[frameAt(zone,clock)],x-zone.pivot[0],stageY-zone.pivot[1]);
    }
    const slots = crowdImages ? previewSlots(canvas.width,x,stageY,current.facing,track,crowd.checked) : [];
    canvas.dataset.guard = track.guard?.style ?? '';
    canvas.dataset.recipients = String(slots.filter(slot => slot.guardTarget).length);
    drawCrowd(brush,crowdImages,slots);
    const pivot = current.bodyPivot ?? data.pivot;
    if (!hidden) draw(body,track.frames[index],x-pivot[0],stageY-pivot[1]);
    const trail = track.poseTrail;
    const showTrail = effects.checked && trail && clock<sum(trail.durationMs);
    if (showTrail) draw(overlay,trail.frames[frameAt(trail,clock)],x-trail.pivot[0],stageY-trail.pivot[1]);
    const drawn = effects.checked && track.overlay && clock<sum(track.overlay.durationMs);
    if (drawn) {
      const fx = track.overlay;
      draw(overlay,fx.frames[frameAt(fx,clock)],x-fx.pivot[0],stageY-fx.pivot[1]);
    }
    drawCrowdMarkers(brush,slots);
    canvas.dataset.unit = current.id;
    canvas.dataset.clip = key;
    canvas.dataset.frame = hidden ? '' : String(index);
    canvas.dataset.effect = drawn && clock>=track.cue.timeMs ? track.overlay.id : '';
    canvas.dataset.trail = showTrail ? trail.id : '';
    canvas.dataset.facing = current.facing;
    canvas.dataset.ground = marked ? track.ground.area.shape : '';
    canvas.dataset.impact = effects.checked && track.previewProjectile ?
      (clock >= track.previewProjectile.impactMs ? 'contact' :
        clock >= track.previewProjectile.releaseMs ? 'travel' : '') : '';
    const action = track.motionLabel || (key === 'attack' ? current.attackLabel : key === 'skill' && current.skillMotionLabel);
    const phase = phaseAt(track, clock);
    canvas.dataset.phase = phase;
    const label = [action || motionLabels[key], phase, hidden ? '종료' : (index+1)+' / '+track.frames.length]
      .filter(Boolean).join(' · ');
    if (state.textContent!==label) state.textContent = label;
    scrub.value = Math.floor(time);
  }

  function animate(now) {
    const target = maximum();
    time += (now-tick)*Number(speed.value);
    tick = now;
    if (time>=target) {
      if (loops()) time %= target;
      else { time=target; playing = false; play.textContent='재생'; }
    }
    display();
    if (playing) animation = requestAnimationFrame(animate);
  }

  function update({ reset = false, run = playing } = {}) {
    cancelAnimationFrame(animation);
    if (reset || (run && time>=maximum())) time=0;
    playing=run;
    if (data.commanderRevision) {
      const sourceVersion = data.commanderRevision.sourceVersion.slice(1);
      if (version === revision) {
        compareLink(find('version'),sourceVersion,current.id,clip.value,current.kind);
        find('version').textContent='V'+sourceVersion+' 비교';
      } else {
        compareLink(find('version'),revision,current.id,clip.value,current.kind);
        find('version').textContent='V'+revision+' 모션 보기';
      }
    } else if (data.skillVisibility && version === revision) {
      compareLink(find('version'),data.skillVisibility.sourceVersion.slice(1),current.id,clip.value,current.kind);
    } else if (version !== revision) {
      compareLink(find('version'),revision,current.id,clip.value,current.kind);
      find('version').textContent='V'+revision+' 모션 보기';
    }
    play.textContent = playing?'일시정지':'재생';
    scrub.max = maximum();
    display();
    if (playing) {
      tick=performance.now();
      animation=requestAnimationFrame(animate);
    }
  }

  function fillFilters() {
    if (group.value==='enemies') choose(filter,[['all','모든 진화'],...Object.entries(stages)]);
    else {
      const factions = [...new Set(data.units.filter(x=>x.kind===group.value).map(x=>x.faction))];
      choose(filter,[['all','모든 진영'],...factions.map(label=>[label,label])]);
    }
  }

  function fillUnits(initial) {
    const roster = data.units.filter(x=>x.kind===group.value &&
      (filter.value==='all' || (group.value==='enemies'?x.stage:x.faction)===filter.value));
    choose(unit,roster.map(x=>[x.id,x.name+(x.stageLabel?' · '+x.stageLabel:'')]));
    if (initial && roster.some(x=>x.id===initial)) unit.value=initial;
  }

  function updateSheet(key,image,id) {
    const node = find(key+'-image');
    node.src=image.src;
    const labels = { body:'본체', fx:'이펙트', ground:'붉은 범위 표시' };
    node.alt=id+' · '+labels[key]+' 스프라이트 시트';
    node.width=image.naturalWidth;
    node.height=image.naturalHeight;
    const link=find(key+'-download');
    link.href=image.src;
    link.download = key==='body'?id+'.png':id+'-'+key+'.png';
  }

  async function selectUnit() {
    const selected = data.units.find(x=>x.id===unit.value);
    const token=++request;
    cancelAnimationFrame(animation);
    state.textContent=selected.name+' 불러오는 중';
    let images;
    try {
      images=await Promise.all([artwork(selected.sheet),artwork(selected.fxSheet),
        selected.groundSheet ? artwork(selected.groundSheet) : null]);
      if (selected.clips.skill?.guard?.previewAllyOffsets.length) crowdImages ??= await loadCrowd();
    }
    catch {
      if (request===token) {
        if (current) { unit.value=current.id; display(); }
        state.textContent=selected.name+'의 스프라이트를 열지 못했습니다.';
      }
      return;
    }
    if (request!==token) return;
    current=selected;
    [body,overlay,groundImage]=images;
    sequence=timeline(current);
    const preferred=clip.value || search.get('motion');
    choose(clip,[['demo',motionLabels.demo],...Object.keys(current.clips).map(key=>[key,motionLabels[key]])]);
    if (preferred==='demo' || current.clips[preferred]) clip.value=preferred;
    else if (current.fixed && current.clips.attack) clip.value='demo';
    else if (current.fixed && current.clips.skill) clip.value='skill';
    updateSheet('body',body,current.name);
    updateSheet('fx',overlay,current.name);
    find('ground-panel').hidden = !groundImage;
    if (groundImage) updateSheet('ground',groundImage,current.name);
    find('note').textContent=[current.attackLabel && '기본 공격 · '+current.attackLabel,
      current.alternateAttackLabel && '변형 공격 · '+current.alternateAttackLabel,current.ability,current.choreography]
      .filter(Boolean).join(' / ');
    update({ reset:true });
  }

  choose(group,Object.entries(groupLabels).map(([key,label])=>[key,label+' · '+data.groups[key]]));
  if (search.get('group') && groupLabels[search.get('group')]) group.value=search.get('group');
  else if (data.commanderRevision) group.value='commanders';
  if (data.commanderRevision?.authoredBody && group.value==='commanders') {
    const setting = search.get('effects');
    effects.checked = setting ? setting==='1' : Boolean(data.commanderRevision.trackedTrails);
  }
  fillFilters();
  fillUnits(search.get('unit') || (!legacy && group.value==='enemies' ? 'brocky-controlled-iii' : null));
  await selectUnit();
  for (const control of controls) control.disabled=false;
  group.addEventListener('change',()=>{ fillFilters(); fillUnits(); selectUnit(); });
  filter.addEventListener('change',()=>{ fillUnits(); selectUnit(); });
  unit.addEventListener('change',selectUnit);
  clip.addEventListener('change',()=>update({reset:true,run:true}));
  play.addEventListener('click',()=>update({run:!playing}));
  replay.addEventListener('click',()=>update({reset:true,run:true}));
  effects.addEventListener('change',display);
  if (data.standardRevision) {
    crowd.disabled = false;
    crowd.addEventListener('change',async ()=>{
      try {
        if (crowd.checked) crowdImages ??= await loadCrowd();
      } catch { crowd.checked = false; }
      display();
    });
  } else {
    crowd.closest('label').style.display = 'none';
  }
  scrub.addEventListener('input',()=>{ time=Number(scrub.value); update({run:false}); });
  const number = n=>n.toLocaleString('ko-KR');
  find('summary').textContent=number(data.bodyFrames)+'개 본체 프레임 · '+number(data.overlayFrames)+'개 이펙트 셀' +
    (data.commanderRevision?.trackedTrails ? ' · 지휘관 15명 원본 도트·무기 궤적 개정' :
      data.commanderRevision?.authoredBody ? ' · 지휘관 15명 공격·고유 기술 자세 개정' :
      data.commanderRevision ? ' · 지휘관 15명 기본 공격 2형' :
      data.standardRevision ? ' · 범위 표시 '+data.standardRevision.groundTracks+'종' :
      data.meleeRevision ? ' · 기본 공격 개정 '+data.meleeRevision.attack+'개 형태' : '')+
    '. 현재 유닛의 시트를 눌러 확대할 수 있습니다.';
}

if (version !== revision) {
  find('package').href = new URL(legacy ? 'combat-motions.zip' : 'combat-motions-v'+version+'.zip', source);
  find('manifest').href = new URL('manifest.json', source);
  find('readme').href = new URL('README.md', source);
  find('sources').href = new URL(legacy ? 'source/prompts.md' : ['6','7','8'].includes(version) ?
    'README.md' : version === '4' ?
    '../../guard-motion/source/README.md' : version === '3' ?
    '../../standard-motion/source/README.md' : '../../melee-motion/source/README.md', source);
  const revised = new URL(location.href);
  revised.searchParams.delete('version');
  find('version').href = revised.href;
  find('version').textContent = '개선본 보기';
}
initialize().catch(()=>{ state.textContent='모션을 열지 못했습니다. 스프라이트 ZIP에서 원본을 열 수 있습니다.'; });

