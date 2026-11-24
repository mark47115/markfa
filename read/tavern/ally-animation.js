window.mountTavernUnitMotion = function (root, { signal, unitId, viewportOnly = false } = {}) {
  const base = new URL('media/unit-sprites/unit-motion-v10/', document.baseURI);
  const select = root.querySelector('#motion-unit');
  const speed = root.querySelector('#motion-speed');
  const play = root.querySelector('#motion-toggle');
  const next = root.querySelector('#motion-next');
  const flip = root.querySelector('#motion-flip');
  const scrub = root.querySelector('#motion-frame');
  const label = root.querySelector('#motion-frame-label');
  const profile = root.querySelector('#motion-profile');
  const status = root.querySelector('#motion-status');
  const sheetPanel = root.querySelector('.motion-sheet');
  const sheetPreview = root.querySelector('#motion-sheet');
  const download = root.querySelector('#motion-download');
  const attackSelect = root.querySelector('#motion-attack-kind');
  const attackGroup = attackSelect.closest('.motion-attack');
  const effects = root.querySelector('#motion-effects');
  const dense = root.querySelector('#motion-dense');
  const ground = root.querySelector('#motion-ground');
  const crowd = root.querySelector('.motion-crowd');
  const field = crowd.querySelector('canvas').getContext('2d');
  const fx = window.tavernMotionEffects;
  const buttons = [...root.querySelectorAll('[data-clip]')];
  const controls = [play, next, flip, speed, scrub, attackSelect, ...buttons];
  const stages = [...root.querySelectorAll('.motion-stages canvas')].map(canvas => canvas.getContext('2d'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let assets, units, actor, image, animationId, previousTime, request = 0;
  let neighbors = [], foes = [];
  let clipId = 'walk', frame = 0, elapsed = 0, playing = false, reflected = false;
  let visible = !viewportOnly || !('IntersectionObserver' in window);
  const skill = unit => unit.attacks.find(motion => motion.key === 'skill');
  const clip = () => {
    if (clipId === 'attack') return actor.attacks[Number(attackSelect.value)];
    if (clipId === 'skill') return skill(actor);
    return assets.clips[clipId];
  };
  const fortify = ['shield-deputy', 'sprout-archer', 'allies-125', 'assembly-robot', 'allies-019'];
  const phaseLabel = {drumHit:'북면 타격',drumRally:'첫 박자',gong:'징 타격',gongRally:'첫 박자',
    gun:'격발',bow:'시위 해제',crossbow:'격발',throw:'투창 놓기',throwing:'투척물 놓기'};
  const typeLabels = {
    sword:'검·단검', shield:'방패', fist:'주먹', beast:'짐승형', bow:'활', staff:'지팡이·지원 장비',
    spear:'창', javelin:'투창', launcher:'원거리 장비', tool:'근접 장비', machine:'기계 팔', signal:'신호 장비', bird:'조류',
    axe:'도끼', carry:'휴대 장비',
  };

  function drawSprite(ctx, sprite, clip, f, x, y, mirror = false) {
    const { width, height, anchor } = assets.frame;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(x, y - anchor[1]);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(sprite, f * width, clip.row * height, width, height, -anchor[0], 0, width, height);
    ctx.restore();
  }

  function paintCrowd(clip, frame, t) {
    const ctx = field;
    const { width, anchor } = assets.frame;
    if (!dense.checked || neighbors.length === 0 || foes.length === 0) return;
    ctx.fillStyle = '#524c4c';
    ctx.fillRect(0, 0, 320, 152);
    for (let row = 12; row < 148; row += 19) {
      ctx.fillStyle = '#4d4948';
      ctx.fillRect(0, row, 320, 2);
      for (let i = 0; i < 320; i += 13) ctx.fillRect(i + row % 7, row + 6, 4, 1);
    }
    if (effects.checked && clip.event) fx.telegraph(ctx, ground.value, fx.timing(clip, frame, t), 173, 103);
    const allySlots = [[67,54],[101,68],[55,86],[97,105],[58,128],[113,134]];
    const foeSlots = [[186,53],[235,62],[159,82],[210,98],[181,116],[241,131],[190,137]];
    const crowdActors = [
      ...allySlots.map(([x,y], i) => ({x,y,index:i,enemy:false})),
      ...foeSlots.map(([x,y], i) => ({x,y,index:i,enemy:true})),
    ].sort((a,b)=>a.y-b.y);
    const actorsWithFx = [];
    for (const unit of crowdActors) {
      const {x,y,index,enemy} = unit;
      ctx.fillStyle = enemy ? '#a483aa' : '#76ada5';
      if (enemy) {
        ctx.fillRect(x-6,y,13,1);
        ctx.fillRect(x-3,y-1,7,3);
      } else {
        ctx.fillRect(x-6,y,13,2);
        ctx.fillRect(x-3,y-1,7,4);
      }
      if (index === 3 && enemy === (actor.side === 'enemy')) {
        drawSprite(ctx, image, clip, frame, x,y,reflected);
        actorsWithFx.push({clip,frame,t,x,y,mirror:reflected});
      } else {
        const team = enemy ? foes : neighbors;
        const neighbor = team[index % team.length];
        const action = clipId === 'attack' ? neighbor.unit.attacks[0] : skill(neighbor.unit);
        const motion = clip.event ? (index % 2 === 0 ? action : assets.clips.walk) : clip;
        const f = Math.max(0, frame - (index % 3)) % motion.durations.length;
        drawSprite(ctx, neighbor.image, motion, f, x, y, enemy);
        if (motion.event) actorsWithFx.push({clip:motion,frame:f,t,x,y,mirror:enemy});
      }
    }
    if (effects.checked) for (const from of actorsWithFx) {
      fx.action(ctx, from.clip, from.frame, from.t, {x:from.x-anchor[0],y:from.y-anchor[1],cell:width,mirror:from.mirror},
        [162,from.y-19], true, allySlots.filter(([x,y])=>x!==from.x||y!==from.y));
    }
    for (const unit of crowdActors) {
      const y = unit.y - (unit.enemy ? 48 : 44);
      ctx.fillStyle = '#25212a';
      ctx.fillRect(unit.x-10,y,20,3);
      ctx.fillStyle = unit.enemy ? '#b794bf' : '#8ad2b7';
      ctx.fillRect(unit.x-9,y+1,11 + unit.index % 4,1);
    }
  }

  function draw() {
    if (!image) return;
    const motion = clip();
    const { width, anchor } = assets.frame;
    const y = 90;
    const x = 76;
    const target = [reflected ? 24 : 128, y - 20];
    const ally = [reflected ? 115 : 37, y+2];
    for (const ctx of stages) {
      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.fillStyle = '#50465a';
      ctx.fillRect(4, y, ctx.canvas.width-8, 1);
      const opponents = actor.side === 'enemy' ? neighbors : foes;
      if (motion.event === 'release' && motion.tip && opponents.length) {
        drawSprite(ctx, opponents[0].image, assets.clips.idle, 0, target[0], y, !reflected);
      }
      if (motion.effect === 'rally' && neighbors.length) {
        drawSprite(ctx,neighbors[0].image,assets.clips.idle,0,...ally,reflected);
      }
      drawSprite(ctx, image, motion, frame, x, y, reflected);
      if (effects.checked) fx.action(ctx, motion, frame, elapsed, {x:x-anchor[0],y:y-anchor[1],cell:width,mirror:reflected}, target,false,[ally]);
    }
    paintCrowd(motion, frame, elapsed);
    scrub.value = frame + 1;
    const phase = motion.echoFrame === frame ? '두 번째 박자'
      : motion.phases?.[frame] ?? (motion.eventFrame === frame ? phaseLabel[motion.key] ?? assets.effectLabels[motion.event] : '');
    label.value = String(frame + 1) + ' / ' + motion.durations.length + (phase ? ' · ' + phase : '');
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(animationId);
    previousTime = undefined;
    play.textContent = '재생';
  }

  function tick(now) {
    elapsed += Math.min(120, now - (previousTime ?? now)) * Number(speed.value);
    previousTime = now;
    while (elapsed >= clip().durations[frame]) {
      elapsed -= clip().durations[frame];
      if (frame + 1 < clip().durations.length) frame++;
      else if (clip().loop) frame = 0;
      else {
        stop();
        play.textContent = '다시 재생';
        break;
      }
    }
    draw();
    if (playing && visible) animationId = requestAnimationFrame(tick);
  }

  function start() {
    playing = true;
    previousTime = undefined;
    play.textContent = '일시정지';
    if (visible) animationId = requestAnimationFrame(tick);
  }

  function showClip(key, autoplay) {
    stop();
    clipId = key;
    frame = elapsed = 0;
    scrub.max = clip().durations.length;
    attackGroup.hidden = key !== 'attack';
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.clip === key));
    draw();
    if (autoplay) start();
  }

  async function selectUnit(id) {
    const index = ++request;
    stop();
    controls.forEach(control => { control.disabled = true; });
    const item = units.get(id);
    const url = new URL(item.sheet, base);
    const png = new Image();
    png.src = url.href;
    try {
      await png.decode();
      if (index !== request) return;
      if (png.width !== assets.frame.width * assets.frame.columns || png.height !== assets.frame.height * assets.frame.rows) {
        throw Error('Unexpected sprite sheet dimensions');
      }
      actor = item;
      image = png;
      reflected = item.side === 'enemy';
      flip.setAttribute('aria-pressed', String(reflected));
      profile.textContent = item.equipment;
      attackSelect.replaceChildren(...item.attacks.flatMap((attack, index) => {
        if (attack.key === 'skill') return [];
        const option = document.createElement('option');
        option.value = index;
        option.textContent = attack.label;
        return option;
      }));
      status.textContent = '';
      sheetPreview.src = url.href;
      sheetPreview.alt = item.name + '의 대기·이동·공격·스킬·피격 시트';
      download.href = url.href;
      sheetPanel.hidden = false;
      controls.forEach(control => { control.disabled = false; });
      showClip(clipId, !reduced.matches);
    } catch {
      if (index === request) status.textContent = item.name + ' 시트를 불러오지 못했습니다.';
    }
  }

  select.addEventListener('change', () => selectUnit(select.value));
  attackSelect.addEventListener('change', () => showClip('attack', !reduced.matches));
  effects.addEventListener('change', draw);
  dense.addEventListener('change', () => {
    crowd.hidden = !dense.checked;
    ground.disabled = !dense.checked;
    draw();
  });
  ground.addEventListener('change', draw);
  buttons.forEach(button => button.addEventListener('click', () => showClip(button.dataset.clip, !reduced.matches)));
  play.addEventListener('click', () => {
    if (playing) return stop();
    if (!clip().loop && frame === clip().durations.length - 1) frame = elapsed = 0;
    start();
  });
  next.addEventListener('click', () => {
    stop();
    elapsed = 0;
    frame = (frame + 1) % clip().durations.length;
    draw();
  });
  scrub.addEventListener('input', () => {
    stop();
    elapsed = 0;
    frame = Number(scrub.value) - 1;
    draw();
  });
  flip.addEventListener('click', () => {
    reflected = !reflected;
    flip.setAttribute('aria-pressed', String(reflected));
    draw();
  });
  reduced.addEventListener('change', event => { if (event.matches) stop(); }, { signal });
  document.addEventListener('visibilitychange', () => { previousTime = undefined; }, { signal });
  signal?.addEventListener('abort', () => { request += 1; stop(); }, { once: true });
  if (!visible) {
    const observer = new IntersectionObserver(([entry]) => {
      if (visible === entry.isIntersecting) return;
      visible = entry.isIntersecting;
      cancelAnimationFrame(animationId);
      previousTime = undefined;
      if (playing && visible) animationId = requestAnimationFrame(tick);
    });
    observer.observe(root);
    signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  async function init() {
    try {
      assets = window.tavernUnitMotionV10;
      if (!assets?.units.length) throw Error('Missing animation manifest');
      units = new Map(assets.units.map(unit => [unit.id, unit]));
      const featured = new Set([...fortify,'war-drummer','allies-193','allies-067','allies-126','allies-050','wolf-javelin','allies-127','lantern-priest','falcon-lookout','allies-039']);
      const groups = new Map();
      for (const unit of assets.units.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'))) {
        const name = unit.side === 'enemy' ? '적군' : featured.has(unit.id) ? '대표 유닛' : typeLabels[unit.type];
        if (!groups.has(name)) {
          const group = document.createElement('optgroup');
          group.label = name;
          groups.set(name, group);
        }
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.name;
        groups.get(name).append(option);
      }
      select.append(groups.get('대표 유닛'), ...[...groups].filter(([name]) => name !== '대표 유닛').map(([, group]) => group));
      const requested = unitId ?? new URL(location.href).searchParams.get('unit');
      select.value = units.has(requested) ? requested : 'war-drummer';
      clipId = 'attack';
      select.disabled = false;
      await selectUnit(select.value);
      const decode = async url => {
        const image = new Image();
        image.src = url.href;
        await image.decode();
        return image;
      };
      const loadTeam = ids => Promise.all(ids.map(async id => {
        const unit = units.get(id);
        return { unit, image: await decode(new URL(unit.sheet, base)) };
      }));
      [neighbors, foes] = await Promise.all([
        loadTeam(fortify),
        loadTeam(['the-devourer','rift-tick','void-282']),
      ]);
      if (!signal?.aborted) draw();
    } catch {
      status.textContent = '유닛 목록을 불러오지 못했습니다.';
    }
  }

  void init();
};

const standaloneMotion = document.querySelector('body > .motion-report');
if (standaloneMotion) window.mountTavernUnitMotion(standaloneMotion);
