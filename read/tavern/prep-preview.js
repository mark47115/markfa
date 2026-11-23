import { cardEffectCopy, cardGlossary, effectParts } from './card-effect-copy.js';

(() => {
  const preview = document.querySelector('.prep-demo');
  const run = window.TavernRun;
  const upgradeCosts = [5, 7, 8, 9];
  const recruitCost = 3;
  const rerollCost = 1;
  const startingGold = 3;
  const demoRoundSeconds = 30;
  const formationNames = { column: '2열 종대', line: '2열 횡대' };
  const formationCells = '<i></i>'.repeat(6);
  const deckHelp = '기물을 눌러 효과를 확인하거나, 눌러 끌어서 배치를 바꿉니다.';
  const goldIcon = '<i class="prep-gold-icon" aria-hidden="true"></i>';
  const goldAmount = amount => `<span class="prep-gold-amount" aria-hidden="true">${goldIcon}${amount}</span>`;
  preview.insertAdjacentHTML('afterbegin', `
    <div class="prep-stage" id="prep-stage" data-view="tavern">
    <div class="prep-controls">
      <dl class="prep-hud" aria-label="라운드 준비 현황">
        <div class="prep-gold">
          <dt><span class="prep-gold-balance">소지 / 최대 </span>골드</dt>
          <dd>${goldIcon}<strong data-hud-gold></strong> <span data-hud-max>/ ${startingGold}</span></dd>
        </div>
        <div class="prep-level-badge">
          <dt>선술집<span class="prep-full-label"> 레벨</span></dt>
          <dd>
            <span data-hud-level></span>
            <select id="prep-level" aria-label="선술집 레벨 시안">
              <option value="1">Lv. 1</option><option value="2">Lv. 2</option><option value="3">Lv. 3</option><option value="4">Lv. 4</option><option value="5">Lv. 5</option>
            </select>
          </dd>
        </div>
        <div class="prep-upgrade-control">
          <dt data-hud-upgrade-label>레벨업<span class="prep-compact-hide"> 비용</span></dt>
          <dd data-hud-cost></dd>
          <button class="run-button prep-upgrade-button" type="button" data-run-upgrade hidden>
            <span>레벨업</span><strong data-run-upgrade-cost></strong>
          </button>
        </div>
        <div class="prep-hud-clock">
          <dt><span class="prep-clock-round">라운드 </span>시작까지</dt>
          <dd>
            <span data-hud-time role="timer" aria-label="라운드 시작까지 남은 시간" aria-live="off"></span>
            <button class="prep-clock" type="button" aria-label="30초 카운트다운 시연 재생">시연</button>
          </dd>
        </div>
      </dl>
      <div class="prep-tools">
        <div class="prep-views" role="group" aria-label="준비 화면 전환">
          <button type="button" data-prep-view="tavern" aria-pressed="true" aria-controls="prep-slots"><span>선술집</span></button>
          <button type="button" data-prep-view="deck" aria-pressed="false" aria-controls="prep-slots"><span>내 덱 <small data-prep-count></small></span></button>
        </div>
        <div class="prep-settings">
          <button type="button" class="prep-formation" data-prep-setting="deck" aria-controls="prep-slots" hidden>
            <span class="prep-formation-face" aria-hidden="true">
              <span class="prep-formation-icon" data-formation-icon="column">${formationCells}</span>
              <span class="prep-formation-icon" data-formation-icon="line" hidden>${formationCells}</span>
              <span data-prep-formation-label>2열 종대</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="prep-slots" id="prep-slots" data-prep-slots aria-label="고용 테이블"></div>
    <div class="prep-tavern-controls">
      <button class="prep-captain-ability" type="button" aria-describedby="prep-captain-tooltip" hidden>
        <img width="24" height="24" alt="" draggable="false">
        <span data-captain-kind></span>
      </button>
      <div class="prep-captain-tooltip" id="prep-captain-tooltip" role="tooltip" hidden>
        <span data-captain-type></span>
        <strong data-captain-ability-name></strong>
        <p data-captain-description></p>
        <p data-captain-status hidden></p>
      </div>
      <button class="prep-reroll" type="button" aria-label="리롤 ${rerollCost}골드" aria-controls="prep-slots">
        <i class="prep-reroll-icon" aria-hidden="true"></i>
        ${goldAmount(rerollCost)}
      </button>
    </div>
    <div class="prep-departure" hidden>
      <p class="prep-deploy-guide" id="prep-deploy-guide" hidden>
        <strong>배치를 마쳤다면 출정을 누르세요.</strong>
        <span>전투는 자동으로 진행돼요.</span>
      </p>
      <button class="run-button" type="button" data-run-deploy>출정</button>
    </div>
    <dialog class="prep-run-preview prep-captain-dialog" aria-labelledby="prep-captain-action-title">
      <h2 id="prep-captain-action-title"></h2>
      <div data-captain-choices></div>
      <form method="dialog"><button class="run-button">닫기</button></form>
    </dialog>
    <p class="prep-status" data-prep-status aria-live="polite"></p>
    <div class="prep-detail-cluster" hidden>
    <aside class="prep-detail" id="prep-piece-detail" aria-labelledby="prep-detail-name" tabindex="-1">
      <header>
        <div>
          <div class="prep-detail-meta" data-detail-meta></div>
          <h2 id="prep-detail-name"></h2>
        </div>
        <div class="prep-detail-actions">
          <button class="prep-detail-golden" type="button" aria-pressed="false" aria-controls="prep-detail-effect" hidden><span>황금 효과</span></button>
          <button class="prep-detail-close" type="button" aria-label="기물 설명 닫기"><span aria-hidden="true">×</span></button>
        </div>
      </header>
      <dl aria-label="기물 효과와 소속 유닛">
        <dt data-effect-label>기물 효과</dt><dd id="prep-detail-effect" data-detail-effect aria-live="polite"></dd>
        <dt>소속 유닛</dt>
        <dd class="prep-detail-roster">
          <span data-detail-members></span>
          <select data-run-replace aria-label="대신 판매할 기물" hidden></select>
          <button class="run-button" type="button" data-run-ability hidden>능력 사용</button>
          <button class="run-button" type="button" data-run-sell hidden>판매 1</button>
          <button class="prep-detail-recruit" type="button" hidden><span></span></button>
        </dd>
      </dl>
      <p class="prep-ability-summary" data-run-piece-status hidden></p>
    </aside>
    <aside class="prep-term-panel" id="prep-term-panel" aria-labelledby="prep-term-title" hidden>
      <header>
        <h3 id="prep-term-title"></h3>
        <button class="prep-term-close" type="button" aria-label="용어 설명 닫기">×</button>
      </header>
      <p data-term-definition aria-live="polite"></p>
    </aside>
    </div>
    <dialog class="prep-run-preview prep-ability-dialog" aria-labelledby="prep-ability-title">
      <h2 id="prep-ability-title"></h2>
      <div data-run-ability-list></div>
      <form method="dialog"><button class="run-button">닫기</button></form>
    </dialog>
    </div>
  `);
  const stage = preview.querySelector('.prep-stage');
  const controls = stage.querySelector('.prep-controls');
  const slots = preview.querySelector('[data-prep-slots]');
  const status = preview.querySelector('[data-prep-status]');
  const level = preview.querySelector('#prep-level');
  const formation = preview.querySelector('.prep-formation');
  const formationIcons = formation.querySelectorAll('[data-formation-icon]');
  const formationLabel = preview.querySelector('[data-prep-formation-label]');
  const views = Array.from(preview.querySelectorAll('[data-prep-view]'));
  const viewSwitch = preview.querySelector('.prep-mobile-switch');
  const destinationIcons = viewSwitch?.querySelectorAll('[data-prep-destination-icon]');
  if (viewSwitch) stage.append(viewSwitch);
  const settings = Array.from(preview.querySelectorAll('[data-prep-setting]'));
  const count = preview.querySelector('[data-prep-count]');
  const artLink = preview.parentElement.querySelector('[data-prep-art]');
  const reroll = stage.querySelector('.prep-reroll');
  const tavernControls = stage.querySelector('.prep-tavern-controls');
  const captainDialog = stage.querySelector('.prep-captain-dialog');
  const hudLevel = preview.querySelector('[data-hud-level]');
  const hudGold = preview.querySelector('[data-hud-gold]');
  const hudCost = preview.querySelector('[data-hud-cost]');
  const hudTime = preview.querySelector('[data-hud-time]');
  const clock = preview.querySelector('.prep-clock');
  const detail = stage.querySelector('#prep-piece-detail');
  const detailCluster = detail.parentElement;
  const termPanel = stage.querySelector('#prep-term-panel');
  const termTitle = termPanel.querySelector('#prep-term-title');
  const termDefinition = termPanel.querySelector('[data-term-definition]');
  let termTrigger;
  const goldenToggle = detail.querySelector('.prep-detail-golden');
  const recruitButton = detail.querySelector('.prep-detail-recruit');
  const recruitLabel = recruitButton.querySelector('span');
  const effectLabel = detail.querySelector('[data-effect-label]');
  const detailName = detail.querySelector('#prep-detail-name');
  const detailMeta = detail.querySelector('[data-detail-meta]');
  const detailEffect = detail.querySelector('[data-detail-effect]');
  const detailMembers = detail.querySelector('[data-detail-members]');
  const sellButton = detail.querySelector('[data-run-sell]');
  const abilityButton = detail.querySelector('[data-run-ability]');
  const abilitySummary = detail.querySelector('[data-run-piece-status]');
  const abilityDialog = stage.querySelector('.prep-ability-dialog');
  const replacement = detail.querySelector('[data-run-replace]');
  const departure = stage.querySelector('.prep-departure');
  const departureGuide = stage.querySelector('#prep-deploy-guide');
  const deploy = stage.querySelector('[data-run-deploy]');
  const upgradeButton = stage.querySelector('[data-run-upgrade]');
  const upgradeArt = 'media/preparation/level-up';
  const tavernArt = 'media/preparation/modular-tavern';
  const expandedArt = 'media/preparation/responsive-v1';
  const paletteArt = 'media/unit-sprites/roster-v2';
  const yardExterior = document.createElement('div');
  yardExterior.className = 'yard-exterior';
  yardExterior.setAttribute('aria-hidden', 'true');
  const yardPatch = document.createElement('span');
  yardPatch.className = 'yard-landscape-patch';
  const yardBuilding = document.createElement('span');
  yardBuilding.className = 'yard-building';
  yardExterior.append(yardPatch, yardBuilding);
  stage.prepend(yardExterior);

  // Standing textures use 64×64 cells. These dimensions describe their visible pixels.
  const member = (id, name, width, height, isNew = false) => ({ id, name, width, height, isNew });

  const groups = [
    {
      id: 'Blessing-1-0', name: '묘목 돌봄이', tier: 1,
      units: [member('seedling-keeper', '묘목 지기', 27, 38), member('sprout-archer', '새싹 사수', 30, 31), member('seed-horn', '씨앗 나팔수', 30, 33, true)],
    },
    {
      id: 'Guard-1-0', name: '황혼 방패병', tier: 1,
      units: [member('shield-deputy', '방패 부사수', 30, 33), member('gate-apprentice', '성문 견습', 26, 36)],
    },
    {
      id: 'Hunt-1-0', name: '개울 정찰대', tier: 1,
      units: [member('brook-hunter', '개울 사냥꾼', 31, 34), member('fox-apprentice', '여우 견습', 28, 34)],
    },
    {
      id: 'Production-1-0', name: '리벳 조립반', tier: 1,
      units: [member('assembly-robot', '조립형 로봇', 36, 35), member('rivet-bot', '못박이', 34, 32)],
    },
    {
      id: 'Hunt-3-0', name: '고갯길 사냥조', tier: 3,
      units: [member('wolf-javelin', '늑대 투창수', 29, 34, true), member('lynx-scout', '살쾡이 정찰병', 25, 34, true), member('falcon-lookout', '솔개 파수꾼', 37, 33, true)],
    },
    {
      id: 'Guard-5-0', name: '저녁성의 수호기사', tier: 5,
      units: [member('citadel-captain', '성루 방패대장', 29, 34, true), member('citadel-archer', '성무 궁수', 26, 33, true), member('lantern-priest', '등불 사제', 34, 33, true), member('belltower-sentry', '종탑 파수병', 36, 33, true)],
    },
  ];
  // Anchors are in native background pixels, in the same order as the offers.
  const tavernLayouts = {
    wide: {
      width: 768, height: 512,
      levels: [
        { rear: 272, points: [[210, 389], [558, 389], [384, 303]] },
        { rear: 326, points: [[165, 449], [605, 461], [289, 342], [474, 342]] },
        { rear: 325, points: [[177, 460], [593, 460], [302, 351], [465, 351]] },
        { rear: 302, points: [[223, 466], [141, 325], [385, 330], [627, 325], [545, 466]] },
        { rear: 300, points: [[156, 463], [238, 318], [383, 310], [508, 318], [384, 464], [602, 459]] },
      ],
    },
    narrow: {
      width: 384, height: 420,
      levels: [
        { rear: 191, points: [[108, 331], [276, 331], [189, 212]] },
        { rear: 226, points: [[87, 368], [286, 372], [128, 232], [259, 239]] },
        { rear: 216, points: [[91, 362], [287, 358], [144, 230], [258, 234]] },
        { rear: 218, points: [[98, 373], [90, 238], [195, 246], [289, 241], [285, 373]] },
        { rear: 205, points: [[77, 365], [81, 229], [192, 217], [304, 229], [191, 358], [301, 365]] },
      ],
    },
    landscape: {
      width: 768, height: 512,
      levels: [
        { rear: 272, points: [[210, 389], [558, 389], [384, 303]] },
        { rear: 287, points: [[165, 449], [605, 461], [296, 315], [469, 319]] },
        { rear: 274, points: [[177, 460], [593, 460], [299, 322], [469, 324]] },
        { rear: 264, points: [[223, 466], [137, 301], [385, 301], [631, 301], [545, 466]] },
        { rear: 253, points: [[156, 463], [218, 298], [383, 281], [548, 298], [384, 464], [602, 459]] },
      ],
    },
  };
  // Facade contours use the 768×512 yard art coordinates.
  const yardAnchor = { x: 384, y: 162 };
  const yardFootprint = [
    [376,-8],[393,-8],[415,8],[439,15],[439,4],[449,-4],[485,-4],[495,6],[494,32],[499,36],
    [509,42],[519,55],[546,72],[552,88],[552,107],[538,118],[537,160],[531,166],[517,167],
    [241,167],[231,162],[230,119],[214,111],[210,100],[211,86],[220,65],[235,43],[256,39],
    [269,30],[283,20],[298,12],[321,16],[342,11],[364,3],
  ];
  const yardBuildings = {
    2: {
      x: 369, y: 193, scale: .9,
      outline: [
        [361,21],[374,21],[387,31],[424,44],[424,24],[431,20],[459,20],[465,26],[464,44],[461,49],
        [461,65],[475,71],[488,80],[587,108],[591,113],[590,122],[575,126],[574,170],[579,174],
        [579,192],[552,193],[551,173],[555,170],[555,141],[542,130],[531,129],[531,136],[536,139],
        [539,148],[537,158],[530,162],[519,162],[514,157],[514,144],[521,138],[522,126],[508,122],
        [502,135],[502,171],[504,174],[503,192],[230,192],[228,175],[233,171],[232,136],[225,132],
        [223,125],[211,125],[210,114],[222,93],[231,84],[235,72],[243,68],[258,68],[269,63],[273,50],
        [284,45],[290,39],[312,43],[329,39],[348,31],
      ],
    },
    3: {
      x: 382, y: 197, scale: .84,
      outline: [
        [376,12],[387,12],[394,19],[432,39],[464,39],[463,22],[470,17],[499,17],[506,23],[505,37],
        [502,41],[503,50],[520,58],[557,81],[602,106],[606,112],[604,124],[590,127],[584,136],[584,170],
        [590,173],[592,195],[558,197],[555,184],[549,184],[539,180],[503,180],[486,187],[476,187],
        [476,196],[411,196],[411,190],[353,190],[352,197],[291,197],[288,187],[273,185],[260,181],
        [232,183],[222,188],[205,189],[204,197],[175,197],[174,174],[180,169],[180,138],[174,131],
        [173,123],[161,123],[159,112],[188,94],[224,71],[249,55],[252,44],[264,41],[301,42],[331,40],[345,31],
      ],
    },
    4: {
      x: 384, y: 214, scale: .8,
      outline: [
        [150,132],[168,111],[190,88],[195,77],[199,69],[209,66],[220,69],[243,57],[244,49],[254,45],
        [263,48],[272,44],[270,36],[275,29],[289,29],[294,37],[294,46],[308,46],[317,41],[465,43],
        [475,42],[475,35],[481,28],[492,28],[497,35],[498,42],[516,44],[514,38],[515,23],[523,17],
        [558,17],[566,24],[567,38],[559,44],[559,68],[570,74],[579,90],[596,112],[619,133],[621,142],
        [616,149],[606,150],[603,159],[596,162],[596,185],[604,188],[605,209],[460,211],[459,214],
        [426,214],[423,209],[346,209],[344,214],[312,214],[310,209],[166,210],[165,190],[170,186],
        [170,162],[163,158],[160,149],[149,146],
      ],
    },
    5: {
      x: 384, y: 215, scale: .75,
      outline: [
        [128,147],[129,136],[136,130],[146,131],[177,117],[211,87],[209,80],[214,73],[216,40],[212,34],
        [217,28],[223,28],[227,36],[240,36],[254,42],[276,43],[266,51],[257,54],[274,64],[251,63],
        [240,58],[225,59],[224,72],[231,78],[233,86],[242,91],[277,75],[283,69],[314,65],[314,54],
        [303,49],[302,40],[308,32],[319,34],[325,37],[347,27],[375,15],[374,8],[377,2],[389,2],[394,8],
        [391,16],[415,25],[442,37],[449,32],[459,34],[466,40],[463,49],[453,55],[453,65],[481,69],[491,74],
        [523,91],[531,84],[529,78],[534,74],[535,40],[531,35],[535,29],[542,28],[547,36],[558,36],
        [570,42],[594,42],[584,51],[573,54],[591,64],[572,63],[560,59],[545,60],[544,71],[549,77],[549,86],
        [583,113],[618,131],[628,130],[637,136],[641,147],[637,156],[628,157],[626,166],[624,188],
        [634,189],[634,209],[453,211],[453,215],[420,215],[418,209],[348,209],[347,215],[312,215],
        [311,210],[135,210],[134,191],[142,188],[142,163],[137,156],[129,155],
      ],
    },
  };
  const formationOrder = { column: [5, 6, 3, 4, 1, 2], line: [4, 5, 6, 1, 2, 3] };
  const sideSeatOffset = 31;
  const rearSeatFloor = -22;
  // The table textures share a cell size, but their opaque widths differ.
  const tableSilhouetteWidths = [51, 54, 51, 71, 75];
  const propSize = {
    table: { width: 96, height: 56, footPadding: 2 },
    chair: { width: 48, height: 58, footPadding: 2 },
    // Scene dimensions stay fixed while the source cells provide more painted pixels.
    unit: { width: 64, height: 64, footPadding: 4 },
  };
  const seats = {
    back: { x: 0, floor: rearSeatFloor, facing: '', rear: true },
    backLeft: { x: -19, floor: rearSeatFloor, facing: '-diagonal', rear: true },
    backRight: { x: 19, floor: rearSeatFloor, facing: '-diagonal', rear: true },
    left: { side: -1, floor: 1, facing: '-side' },
    right: { side: 1, floor: 1, facing: '-side' },
  };
  const seatLayouts = {
    2: [seats.backLeft, seats.right],
    3: [seats.back, seats.left, seats.right],
    4: [seats.backLeft, seats.backRight, seats.left, seats.right],
  };
  const deck = [groups[1], groups[3], groups[0], groups[2], null, null];
  const offers = groups.map(group => ({ group, hired: false }));
  let gold = startingGold;
  let view = 'tavern';
  let currentFormation = run?.state.formation ?? 'column';
  let pickedSlot = null;
  let deckPointer = null;
  let detailTrigger = null;
  let detailGroup = null;
  let detailOffer = null;
  let roundDeadline = 0;
  let roundTick;
  const captainControl = window.TavernCaptainControl?.(stage,
    run?.state.captain ?? new URLSearchParams(location.search).get('captain'),
    captain => run ? run.captainReason() : captain.type.endsWith('액티브') ? '원정을 시작하면 사용할 수 있습니다.' : '',
    openCaptainAction);

  function openCaptainAction(captain) {
    if (view !== 'tavern' || !run || captainDialog.open) return;
    const reason = run.captainReason();
    if (reason) {
      status.textContent = reason;
      return;
    }
    closeDetail();
    captainDialog.querySelector('h2').textContent = captain.ability;
    const choices = captainDialog.querySelector('[data-captain-choices]');
    choices.replaceChildren();
    if (captain.id === 'mire') {
      const forecasts = document.createElement('ul');
      forecasts.className = 'prep-captain-forecasts';
      forecasts.setAttribute('data-run-enemies', '');
      for (const forecast of run.previewWaves) {
        const group = document.createElement('li');
        const label = document.createElement('strong');
        label.textContent = `${forecast.round}라운드 · ${forecast.title}`;
        const details = document.createElement('ul');
        const power = document.createElement('li');
        power.textContent = [forecast.power, forecast.powerDescription].filter(Boolean).join(' · ');
        if (power.textContent) details.append(power);
        for (const enemy of forecast.enemies) {
          const line = document.createElement('li');
          line.textContent = [enemy.slot < 3 ? '전열' : '후열', enemy.name, enemy.role,
            enemy.description].filter(Boolean).join(' · ');
          details.append(line);
        }
        group.append(label, details);
        forecasts.append(group);
      }
      choices.append(forecasts);
      captainDialog.showModal();
      return;
    }
    for (const choice of run.captainChoices()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'run-button';
      button.textContent = choice.label;
      button.disabled = Boolean(choice.disabled);
      button.addEventListener('click', () => {
        const message = run.useCaptainAbility(choice.value);
        if (!message) return;
        captainDialog.close();
        readRun();
        drawHud();
        drawTavern();
        status.textContent = message;
      });
      choices.append(button);
    }
    captainDialog.showModal();
  }

  function readRun() {
    if (!run) return;
    const { state } = run;
    level.value = String(state.level);
    gold = run.gold;
    deck.splice(0, deck.length, ...state.deck.map(piece => run.group(piece)));
    offers.splice(0, offers.length, ...state.offers.map((id, index) =>
      ({ group: run.group({ id }), hired: !id || run.sealed(index),
        blocked: run.sealed(index) ? '권능으로 봉인' : run.devoured(index) ? '탐식으로 비워짐' : '' })));
  }

  function drawDeparture() {
    if (!run) return;
    departure.hidden = view !== 'deck';
    deploy.disabled = run.state.phase !== 'prep' || !deck.some(Boolean);
    const guided = !departure.hidden && !deploy.disabled && run.showDepartureGuide;
    departureGuide.hidden = !guided;
    stage.toggleAttribute('data-deploy-guide', guided);
    if (guided) deploy.setAttribute('aria-describedby', departureGuide.id);
    else deploy.removeAttribute('aria-describedby');
  }

  function drawHud() {
    const selectedLevel = Number(level.value);
    const cost = run ? run.upgradeCost : upgradeCosts[selectedLevel - 1];
    hudLevel.textContent = `Lv. ${selectedLevel}`;
    hudGold.textContent = gold;
    const rerollPrice = run ? run.rerollPrice : rerollCost;
    reroll.disabled = gold < rerollPrice;
    reroll.setAttribute('aria-label', `리롤 ${rerollPrice}골드`);
    reroll.querySelector('.prep-gold-amount').replaceWith(
      document.createRange().createContextualFragment(goldAmount(rerollPrice)));
    captainControl?.refresh();
    count.textContent = `${deck.filter(Boolean).length}/${deck.length}`;
    hudCost.textContent = cost == null ? '최고 레벨' : `${cost} G`;
    hudCost.dataset.maxLevel = String(cost == null);
    if (run) {
      preview.querySelector('[data-hud-max]').textContent = `/ ${run.state.round + 2}`;
      drawDeparture();
      upgradeButton.disabled = cost == null || gold < cost;
      upgradeButton.querySelector('[data-run-upgrade-cost]').innerHTML = cost == null ? '최고 레벨' : goldAmount(cost);
      upgradeButton.setAttribute('aria-label', cost == null ? '선술집 최고 레벨' : `선술집 레벨업 · ${cost}골드`);
    }
  }

  function drawClock(seconds) {
    hudTime.textContent = `00:${String(seconds).padStart(2, '0')}`;
    hudTime.dataset.urgent = String(seconds > 0 && seconds <= 10);
  }

  function tickClock() {
    const remaining = Math.max(0, roundDeadline - performance.now());
    const seconds = Math.ceil(remaining / 1000);
    drawClock(seconds);
    if (seconds > 0) roundTick = window.setTimeout(tickClock, remaining - (seconds - 1) * 1000);
  }

  function closeDetail(restoreFocus = false) {
    if (!detailTrigger) return;
    detailTrigger.setAttribute('aria-expanded', 'false');
    detailTrigger.setAttribute('aria-pressed', 'false');
    if (view === 'deck') pickedSlot = null;
    detailTrigger.style.removeProperty('translate');
    detailTrigger.removeAttribute('data-pinned-detail-piece');
    preview.removeAttribute('data-detail-docked');
    preview.style.removeProperty('--detail-dock-height');
    if (restoreFocus || detailCluster.contains(document.activeElement)) detailTrigger.focus({ preventScroll: true });
    closeTerm();
    detailTrigger = null;
    detailGroup = null;
    detailOffer = null;
    detailCluster.hidden = true;
  }

  function clearZones(zone, blocked, gap) {
    if (zone.right <= blocked.left - gap || zone.left >= blocked.right + gap ||
        zone.bottom <= blocked.top - gap || zone.top >= blocked.bottom + gap) return [zone];
    return [
      { ...zone, right: Math.min(zone.right, blocked.left - gap) },
      { ...zone, left: Math.max(zone.left, blocked.right + gap) },
      { ...zone, bottom: Math.min(zone.bottom, blocked.top - gap) },
      { ...zone, top: Math.max(zone.top, blocked.bottom + gap) },
    ].filter(area => area.right > area.left && area.bottom > area.top);
  }

  function placePieceDetail(selected, bounds, footer, localRect, gap) {
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const roomWidth = bounds.right - bounds.left;
    detailCluster.style.maxWidth = `${roomWidth}px`;
    detailCluster.style.removeProperty('max-height');
    detailCluster.toggleAttribute('data-term-stacked', Boolean(termTrigger) && roomWidth < 500);
    const preferred = localRect(detailCluster).width;
    const minimum = Math.min(preferred, termTrigger && roomWidth >= 500 ? 480 : 214);
    const sizes = new Map();
    const avoid = (area, obstacles, minWidth = minimum) => obstacles.reduce((zones, obstacle) =>
      zones.flatMap(zone => clearZones(zone, obstacle, gap))
        .filter(zone => zone.right - zone.left >= minWidth), [area]);
    function fit(candidates) {
      let best;
      for (const zone of candidates) {
        const room = Math.min(preferred, Math.floor(zone.right - zone.left));
        if (room < minimum) continue;
        if (!sizes.has(room)) {
          detailCluster.style.maxWidth = `${room}px`;
          sizes.set(room, localRect(detailCluster));
        }
        const size = sizes.get(room);
        if (size.height > zone.bottom - zone.top) continue;
        const x = clamp((selected.left + selected.right - size.width) / 2, zone.left, zone.right - size.width);
        const y = clamp((selected.top + selected.bottom - size.height) / 2, zone.top, zone.bottom - size.height);
        const dx = Math.max(x - selected.right, selected.left - (x + size.width), 0);
        const dy = Math.max(y - selected.bottom, selected.top - (y + size.height), 0);
        const score = (preferred - size.width) + .6 * Math.hypot(dx, dy);
        if (!best || score < best.score) best = { x, y, width: room, score };
      }
      return best;
    }
    const obstacles = [selected, ...footer];
    let best = fit(avoid(bounds, obstacles));
    if (!best) {
      const hudItems = [...controls.querySelectorAll('.prep-hud > div, .prep-tools button, .prep-tools a')]
        .filter(item => item.getClientRects().length).map(localRect);
      best = fit(avoid({ ...bounds, top: gap }, [...obstacles, ...hudItems]));
    }
    let pin;
    if (!best && stage.clientWidth >= 550) {
      // A short landscape scene can reserve an entire side for the selected table.
      const width = selected.right - selected.left;
      const height = selected.bottom - selected.top;
      const sides = (selected.left + selected.right < bounds.left + bounds.right)
        ? ['left', 'right'] : ['right', 'left'];
      for (const side of sides) {
        const edge = side === 'left' ? bounds.left + width + gap : bounds.right - width - gap;
        const pieceLane = side === 'left' ? { ...bounds, right: edge } : { ...bounds, left: edge };
        const paperLane = side === 'left' ? { ...bounds, left: edge + gap } : { ...bounds, right: edge - gap };
        const pieceZones = avoid(pieceLane, footer, width);
        const pieceZone = pieceZones.find(zone => zone.right - zone.left >= width && zone.bottom - zone.top >= height);
        if (!pieceZone) continue;
        const cardZones = avoid(paperLane, footer);
        best = fit(cardZones);
        if (!best) continue;
        pin = {
          x: clamp(selected.left, pieceZone.left, pieceZone.right - width) - selected.left,
          y: clamp(selected.top, pieceZone.top, pieceZone.bottom - height) - selected.top,
        };
        break;
      }
    }
    if (best) {
      preview.removeAttribute('data-detail-docked');
      preview.style.removeProperty('--detail-dock-height');
      detailCluster.style.maxWidth = `${best.width}px`;
      detailCluster.style.left = `${best.x}px`;
      detailCluster.style.top = `${best.y}px`;
      if (pin) {
        detailTrigger.style.translate = `${pin.x}px ${pin.y}px`;
        detailTrigger.setAttribute('data-pinned-detail-piece', '');
      }
      return;
    }

    if (termTrigger && preview.closest('.prep-landscape')) {
      preview.removeAttribute('data-detail-docked');
      preview.style.removeProperty('--detail-dock-height');
      detailCluster.style.maxWidth = `${roomWidth}px`;
      detailCluster.style.maxHeight = `${Math.max(1, bounds.bottom - bounds.top)}px`;
      detailCluster.style.left = `${(bounds.left + bounds.right - localRect(detailCluster).width) / 2}px`;
      detailCluster.style.top = `${bounds.top}px`;
      return;
    }

    // Narrow document previews put the full card immediately below the scene.
    detailCluster.style.maxWidth = `${roomWidth}px`;
    const size = localRect(detailCluster);
    const dockGap = 6;
    preview.setAttribute('data-detail-docked', '');
    preview.style.setProperty('--detail-dock-height', `${Math.ceil(size.height) + 2 * dockGap}px`);
    detailCluster.style.left = `${(bounds.left + bounds.right - size.width) / 2}px`;
    detailCluster.style.top = `${stage.clientHeight + dockGap}px`;
  }

  function positionDetail() {
    if (!detailTrigger) return;

    const display = stage.getBoundingClientRect();
    if (!display.width || !display.height) return;
    const scaleX = stage.clientWidth / display.width;
    const scaleY = stage.clientHeight / display.height;
    const localRect = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: (rect.left - display.left) * scaleX, right: (rect.right - display.left) * scaleX,
        top: (rect.top - display.top) * scaleY, bottom: (rect.bottom - display.top) * scaleY,
        width: rect.width * scaleX, height: rect.height * scaleY,
      };
    };
    detailTrigger.style.removeProperty('translate');
    detailTrigger.removeAttribute('data-pinned-detail-piece');
    const rect = localRect(detailTrigger);
    const board = { left: 0, top: 0, right: stage.clientWidth, bottom: stage.clientHeight };
    const hud = localRect(controls);
    const gap = 6;
    const left = Math.max(board.left + gap, hud.left);
    const right = Math.min(board.right - gap, hud.right);
    const top = Math.max(board.top + gap, hud.bottom + 2);
    const bottom = board.bottom - gap;
    const footer = [tavernControls, viewSwitch, departure, departureGuide]
      .filter(item => item?.getClientRects().length).map(localRect);
    const fixedBottom = Math.min(bottom, ...footer.map(item => item.bottom));
    const selected = [...detailTrigger.querySelectorAll('.prep-furniture-layer, .tavern-name, .prep-sprites, .prep-piece-name')]
      .map(localRect)
      .reduce((bounds, part) => ({
        left: Math.min(bounds.left, part.left), right: Math.max(bounds.right, part.right),
        top: Math.min(bounds.top, part.top), bottom: Math.max(bounds.bottom, part.bottom),
      }), rect);
    placePieceDetail(selected, { left, right, top, bottom: fixedBottom }, footer, localRect, gap);
  }

  function closeTerm(restoreFocus = false) {
    if (!termTrigger) return;
    termTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) termTrigger.focus({ preventScroll: true });
    termTrigger = null;
    termPanel.hidden = true;
    detailCluster.removeAttribute('data-term-open');
    detailCluster.scrollTop = 0;
  }

  function termButton(label, title, description) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'prep-term-link';
    button.textContent = label;
    button.setAttribute('aria-controls', termPanel.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const togglingOff = termTrigger === button;
      closeTerm();
      if (!togglingOff) {
        termTrigger = button;
        termTitle.textContent = title;
        termPanel.hidden = false;
        termDefinition.textContent = description;
        detailCluster.setAttribute('data-term-open', '');
        button.setAttribute('aria-expanded', 'true');
      }
      positionDetail();
      revealDockedDetail();
      if (termTrigger && detailCluster.hasAttribute('data-term-stacked')) {
        if (detailCluster.scrollHeight > detailCluster.clientHeight) detailCluster.scrollTop = termPanel.offsetTop;
      }
    });
    return button;
  }

  function showDetailEffect(golden) {
    closeTerm();
    goldenToggle.setAttribute('aria-pressed', String(golden));
    detail.dataset.effectMode = golden ? 'golden' : 'base';
    effectLabel.textContent = view === 'tavern' ? (golden ? '황금 기물 효과' : '기본 기물 효과') : '기물 효과';
    const copy = cardEffectCopy(detailGroup.id, golden) || (golden ? detailGroup.goldenEffect : detailGroup.effect) || '';
    detailEffect.replaceChildren(...effectParts(copy).map(({ term, text }) => term && cardGlossary[term]
      ? termButton(text, term, cardGlossary[term]) : document.createTextNode(text)));
  }

  function revealDockedDetail() {
    if (preview.hasAttribute('data-detail-docked')) preview.scrollIntoView({ block: 'nearest' });
  }

  function openDetail(group, trigger, keyboard, offer = null) {
    closeDetail();
    detailTrigger = trigger;
    detailGroup = group;
    detailOffer = offer;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-pressed', 'true');
    detailName.textContent = group.name;
    detailMeta.textContent = `${group.tier}등급`;
    detailMembers.replaceChildren();
    for (const [index, unit] of group.units.entries()) {
      if (index) detailMembers.append(' / ');
      detailMembers.append(unit.name);
      if (unit.skillName && unit.skillDescription)
        detailMembers.append(' · ', termButton(unit.skillName, unit.skillName, unit.skillDescription));
      else if (unit.skillName) detailMembers.append(' · ' + unit.skillName);
    }
    goldenToggle.hidden = view !== 'tavern' && !group.golden;
    recruitButton.hidden = view !== 'tavern';
    sellButton.hidden = !run || view !== 'deck';
    const deckSlot = Number(trigger.dataset.slot) - 1;
    const abilities = run && view === 'deck' ? run.abilities(deckSlot) : [];
    abilityButton.hidden = abilities.length === 0;
    abilitySummary.hidden = !run || view !== 'deck';
    abilitySummary.textContent = abilitySummary.hidden ? '' : run.pieceStatus(deckSlot);
    replacement.hidden = true;
    if (view === 'tavern') {
      const affected = run?.affectedTables(offers.indexOf(offer)) ?? [];
      abilitySummary.hidden = affected.length === 0;
      abilitySummary.textContent = affected.length ?
        `${run.wave.power} · 고용 시 ${affected.map(index => index + 1).join(', ')}번 탁자 ${run.wave.powerId === 'Vortex' ? '교체' : '제거'}` : '';
      const full = !deck.includes(null);
      const combines = run && deck.filter(piece => piece?.id === group.id && !piece.golden).length >= 2;
      const replace = run && full && !combines;
      if (replace) {
        replacement.replaceChildren(...deck.map((piece, slot) => new Option(`${slot + 1}번 ${piece.name}`, slot)));
        replacement.hidden = false;
      }
      const cost = replace ? recruitCost - 1 : recruitCost;
      const unavailable = gold < cost ? '골드 부족' : full && !run ? '덱 가득 참' : '';
      const action = replace ? '교체' : combines ? '황금 고용' : '고용';
      recruitButton.disabled = Boolean(unavailable);
      recruitButton.setAttribute('aria-label', unavailable || `${action} ${cost}골드`);
      recruitLabel.innerHTML = unavailable || `${action} ${goldAmount(cost)}`;
    }
    showDetailEffect(Boolean(group.golden));
    detailCluster.hidden = false;
    positionDetail();
    revealDockedDetail();
    if (keyboard) detail.focus({ preventScroll: true });
  }

  function setDetailControl(button) {
    button.setAttribute('aria-controls', detail.id);
    button.setAttribute('aria-expanded', 'false');
  }

  function anchorsFor(layout, tier) {
    const { rear, points } = layout.levels[tier];
    const front = Math.max(...points.map(([, floorY]) => floorY));
    return points.map(([x, floorY]) => ({
      x, floorY, scale: .75 + .25 * (floorY - rear) / (front - rear),
    }));
  }

  function placeLayer(className, source, x, floor, size, depth, mirror, side) {
    const layer = document.createElement('span');
    layer.className = `prep-furniture-layer ${className}`;
    layer.style.backgroundImage = `url("${source}")`;
    layer.style.setProperty('--prop-x', x);
    if (side) layer.style.setProperty('--prop-side', side);
    layer.style.setProperty('--prop-floor', floor);
    layer.style.setProperty('--prop-padding', size.footPadding);
    layer.style.setProperty('--prop-width', size.width);
    layer.style.setProperty('--prop-height', size.height);
    layer.style.setProperty('--prop-depth', depth);
    if (mirror) layer.style.setProperty('--prep-facing', '-1');
    return layer;
  }

  function drawSeatedParty(group, closeSeats, hired) {
    const scene = document.createElement('span');
    scene.className = 'prep-table-art';
    const furniture = `${tavernArt}/furniture`;
    const shadow = document.createElement('span');
    shadow.className = 'tavern-floor';
    const artWidth = tableSilhouetteWidths[Number(level.value) - 1];
    const tableSize = { ...propSize.table, width: propSize.table.width * tableSilhouetteWidths[0] / artWidth };
    scene.append(shadow, placeLayer('prep-table', `${furniture}/table-${level.value}.png`, 0, 0, tableSize, 3));
    for (const [index, seat] of (closeSeats ? [seats.backLeft, seats.backRight] : seatLayouts[group?.units.length ?? 2]).entries()) {
      const unit = group?.units[index];
      const { floor, facing, rear } = seat;
      const x = seat.side ? seat.side * sideSeatOffset : seat.x;
      const inward = -Math.sign(x);
      const chair = placeLayer('prep-chair', `${furniture}/chair-${level.value}${facing}.png`, x, floor, propSize.chair, 1, inward < 0, seat.side);
      scene.append(chair);
      if (hired || !unit) continue;
      const animated = unit.seated !== false;
      const source = `${paletteArt}/${animated ? 'seated' : 'png'}/${unit.id}.png`;
      const seatCenter = rear ? x : x + inward * 5;
      // The table sprite occludes rear seats. Side seats remain in the foreground.
      const actor = placeLayer('prep-seated-unit', source, seatCenter, floor - 17, propSize.unit, rear ? 2 : 4, inward > 0, seat.side);
      actor.dataset.unit = unit.id;
      if (!animated) actor.dataset.staticSprite = '';
      actor.style.animationDuration = `${3.6 + index * .41}s`;
      actor.style.animationDelay = `${-.55 * index - (rear ? .22 : .09)}s`;
      scene.append(actor);
    }
    return scene;
  }

  function pieceButton(className, label) {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', 'false');

    return button;
  }

  function makeDeckPiece(group, label) {
    const button = pieceButton('prep-piece', label);
    const sprites = document.createElement('span');
    sprites.setAttribute('aria-hidden', 'true');
    sprites.className = 'prep-sprites';
    for (const unit of group?.units ?? []) {
      const sprite = document.createElement('span');
      const directory = `${paletteArt}/${unit.isNew ? 'png' : 'yard'}`;
      sprite.style.backgroundImage = `url("${directory}/${unit.id}.png")`;
      sprite.style.setProperty('--unit-width', unit.width);
      sprite.style.setProperty('--unit-height', unit.height);
      sprite.style.setProperty('--unit-left', Math.floor((64 - unit.width) / 2));
      sprite.dataset.unit = unit.id;
      sprites.append(sprite);
    }
    const name = document.createElement('span');
    name.className = 'prep-piece-name';
    name.textContent = group?.name ?? '빈칸';
    button.append(sprites, name);
    return button;
  }

  function describeGroup(group) {
    return `${group.name} · ${group.units.length}명 (${group.units.map(unit => unit.name).join(' · ')})`;
  }

  function yardClip(points) {
    return `polygon(${points.map(([x, y]) => `${x / 768 * 100}% ${y / 512 * 100}%`).join(', ')})`;
  }

  function yardPatchMask() {
    const points = yardFootprint.map(point => point.join(',')).join(' ');
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 512"><filter id="soft"><feGaussianBlur stdDeviation="1.8"/></filter><polygon points="${points}" fill="white" filter="url(#soft)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
  }

  function drawYardExterior() {
    const building = view === 'deck' ? yardBuildings[level.value] : null;
    yardExterior.hidden = !building;
    if (!building) return;

    const { x, y, scale, outline } = building;
    yardBuilding.style.clipPath = yardClip(outline);
    yardBuilding.style.backgroundImage = `url("${upgradeArt}/yard-${level.value}.png")`;
    yardBuilding.style.transform = `translate(${(yardAnchor.x - x * scale) / 768 * 100}%, ${(yardAnchor.y - y * scale) / 512 * 100}%) scale(${scale})`;
  }

  function drawBackdrop() {
    const inTavern = view === 'tavern';
    const artDirectory = inTavern ? `${tavernArt}/rendered` : upgradeArt;
    const file = inTavern ? `tavern-${level.value}.png` : 'yard-1.png';
    const source = `${artDirectory}/${file}`;
    stage.style.setProperty('--prep-backdrop', `url("${source}")`);
    stage.style.setProperty('--prep-narrow-backdrop', `url("${artDirectory}/mobile/${file}")`);
    stage.style.setProperty('--prep-expanded-backdrop', `url("${expandedArt}/${file}")`);
    stage.dataset.level = level.value;
    drawYardExterior();
    if (artLink) {
      artLink.href = source;
      artLink.textContent = inTavern ? `Lv. ${level.value} 선술집 PNG` : '대기장 공통 배경 PNG';
    }
  }

  function drawTavern() {
    const tier = Number(level.value) - 1;
    const anchorSets = Object.entries(tavernLayouts).map(([format, layout]) => ({
      format, layout, anchors: anchorsFor(layout, tier),
    }));
    const tableCount = anchorSets[0].anchors.length;
    const buttons = offers.slice(0, tableCount).map((offer, i) => {
      const { group, hired, blocked } = offer;
      const button = pieceButton('tavern-table', blocked || (hired ? '고용이 끝난 빈 테이블' : `${group.name}, 고용 ${recruitCost}골드`));
      if (hired) {
        button.disabled = true;
        button.dataset.hired = '';
      } else setDetailControl(button);
      const closeSeats = (group?.units.length ?? 2) === 2 &&
        ((tier === 3 && i === 2) || (tier === 4 && (i === 2 || i === 3)));
      button.dataset.seatLayout = closeSeats ? 'rear' : 'mixed';
      button.style.setProperty('--set-width', closeSeats ? 81 : 2 * (sideSeatOffset + 17));
      for (const { format, layout, anchors } of anchorSets) {
        const { x, floorY, scale } = anchors[i];
        button.style.setProperty(`--${format}-x`, `${100 * x / layout.width}%`);
        button.style.setProperty(`--${format}-floor`, `${100 * floorY / layout.height}%`);
        button.style.setProperty(`--${format}-depth`, floorY);
        button.style.setProperty(`--${format}-scale`, scale);
      }
      const art = drawSeatedParty(blocked ? null : group, closeSeats, hired);
      art.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'tavern-name';
      label.textContent = blocked || (hired ? '고용 완료' : group.name);
      if (!hired) label.insertAdjacentHTML('beforeend', goldAmount(recruitCost));
      button.append(art, label);
      button.addEventListener('click', event => {
        if (detailTrigger === button) {
          closeDetail();
        } else {
          status.textContent = `${describeGroup(group)} · 구매 ${recruitCost}골드`;
          openDetail(group, button, event.detail === 0, offer);
        }
      });
      return button;
    });
    slots.setAttribute('aria-label', '고용 테이블');
    slots.replaceChildren(...buttons);
    status.textContent = `테이블 ${tableCount}개 · 등장 등급 ${level.value === '1' ? '1' : `1–${level.value}`} · 기물 구매 ${recruitCost}골드`;
  }

  function rerollTavern() {
    if (view !== 'tavern' || gold < rerollCost) return;
    if (run) {
      if (!run.roll()) return;
      closeDetail();
      readRun();
      drawHud();
      drawTavern();
      return;
    }
    const tier = Number(level.value);
    const tableCount = tavernLayouts.wide.levels[tier - 1].points.length;
    const currentOffers = offers.slice(0, tableCount);
    const pool = groups.filter(group => group.tier <= tier);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawn = pool.slice(0, tableCount);
    const visibleGroups = new Set(currentOffers.filter(offer => !offer.hired).map(offer => offer.group));
    const newGroup = pool.find(group => !visibleGroups.has(group));
    if (newGroup) {
      if (!drawn.includes(newGroup)) drawn[tableCount - 1] = newGroup;
    } else {
      // 같은 후보가 모두 나와 있을 때는 한 테이블의 중복을 허용해 구성을 바꾼다.
      drawn[tableCount - 1] = drawn[Math.floor(Math.random() * (tableCount - 1))];
    }
    closeDetail();
    offers.splice(0, tableCount, ...drawn.map(group => ({ group, hired: false })));
    gold -= rerollCost;
    drawHud();
    drawTavern();
    status.textContent = `고용 제안을 새로 뽑았습니다. 남은 골드 ${gold}`;
  }

  function hireSelectedPiece() {
    if (view !== 'tavern' || !detailOffer || detailOffer.hired) return;
    if (run) {
      if (!run.buy(offers.indexOf(detailOffer), replacement.hidden ? -1 : Number(replacement.value))) return;
      closeDetail();
      readRun();
      drawHud();
      drawTavern();
      return;
    }
    if (gold < recruitCost) return;
    const nextSlot = deck.indexOf(null);
    if (nextSlot < 0) return;
    const hired = detailOffer.group;
    deck[nextSlot] = hired;
    gold -= recruitCost;
    detailOffer.hired = true;
    closeDetail();
    drawHud();
    drawTavern();
    const deckControl = viewSwitch?.getClientRects().length
      ? viewSwitch
      : views.find(button => button.dataset.prepView === 'deck');
    deckControl.focus({ preventScroll: true });
    status.textContent = `${hired.name} 고용 완료 · ${nextSlot + 1}번 덱 슬롯 · 남은 골드 ${gold}`;
  }

  function moveDeckPiece(from, to) {
    closeDetail();
    [deck[from], deck[to]] = [deck[to], deck[from]];
    if (run) {
      const items = run.state.deck;
      [items[from], items[to]] = [items[to], items[from]];
      run.update();
    }
    drawDeck(to, `${deck[to].name} · ${to + 1}번 칸으로 ${deck[from] ? '맞교환' : '이동'}`);
  }

  function activateDeckSlot(slot, button) {
    if (pickedSlot !== null && pickedSlot !== slot) {
      moveDeckPiece(pickedSlot, slot);
    } else if (detailTrigger === button) {
      closeDetail(true);
    } else if (deck[slot]) {
      openDetail(deck[slot], button, true);
      pickedSlot = slot;
      status.textContent = `${deck[slot].name} 선택됨 · 이동할 칸을 선택합니다.`;
    }
  }

  function deckButtonAt(x, y) {
    const target = document.elementFromPoint(x, y)?.closest('.prep-piece[data-slot]');
    return target?.parentElement === slots ? target : null;
  }

  function beginDeckPress(event) {
    if (view !== 'deck' || deckPointer || !event.isPrimary || event.button !== 0) return;
    const button = event.target.closest('.prep-piece[data-slot]');
    if (!button || button.parentElement !== slots) return;
    const from = Number(button.dataset.slot) - 1;
    const wasOpen = detailTrigger === button;
    closeDetail();
    if (!deck[from]) return;
    deckPointer = { id: event.pointerId, button, from, wasOpen, x: event.clientX, y: event.clientY };
    button.setPointerCapture(event.pointerId);
  }

  function updateDeckPress(event) {
    const press = deckPointer;
    if (!press || press.id !== event.pointerId) return;
    if (!press.ghost) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6) return;
      const ghost = document.createElement('div');
      ghost.className = 'prep-piece prep-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.append(...Array.from(press.button.children, child => child.cloneNode(true)));
      stage.append(ghost);
      press.ghost = ghost;
      press.button.setAttribute('data-drag-source', '');
      status.textContent = '놓을 칸을 선택하세요.';
    }
    const board = stage.getBoundingClientRect();
    press.ghost.style.left = `${(event.clientX - board.left) * stage.clientWidth / board.width}px`;
    press.ghost.style.top = `${(event.clientY - board.top) * stage.clientHeight / board.height}px`;
    const target = deckButtonAt(event.clientX, event.clientY);
    if (press.target !== target) {
      press.target?.removeAttribute('data-drop-target');
      press.target = target === press.button ? null : target;
      press.target?.setAttribute('data-drop-target', '');
    }
  }

  function clearDeckPress() {
    const press = deckPointer;
    if (!press) return;
    deckPointer = null;
    press.button.removeAttribute('data-drag-source');
    press.target?.removeAttribute('data-drop-target');
    press.ghost?.remove();
    if (press.ghost) status.textContent = deckHelp;
    if (press.button.hasPointerCapture(press.id)) press.button.releasePointerCapture(press.id);
  }

  function endDeckPress(event) {
    const press = deckPointer;
    if (!press || press.id !== event.pointerId) return;
    const target = deckButtonAt(event.clientX, event.clientY);
    clearDeckPress();
    if (press.ghost) {
      if (target && target !== press.button) moveDeckPiece(press.from, Number(target.dataset.slot) - 1);
    } else if (target === press.button && !press.wasOpen) {
      openDetail(deck[press.from], press.button, false);
    }
  }

  function drawDeck(focusSlot = null, message = '') {
    const buttons = formationOrder[currentFormation].map(number => {
      const slot = number - 1;
      const group = deck[slot];
      const button = makeDeckPiece(group, `${number}칸, ${group?.name ?? '빈칸'}`);
      button.dataset.slot = number;
      if (group) setDetailControl(button);
      else button.classList.add('empty');
      button.addEventListener('click', event => {
        if (event.detail === 0) activateDeckSlot(slot, button);
      });
      return button;
    });
    stage.dataset.formation = currentFormation;
    slots.setAttribute('aria-label', '대기장 기물 슬롯');
    slots.replaceChildren(...buttons);
    const focused = focusSlot === null ? null : slots.querySelector(`[data-slot="${focusSlot + 1}"]`);
    focused?.focus({ preventScroll: true });
    status.textContent = message || deckHelp;
  }

  function changeView(next) {
    clearDeckPress();
    closeDetail();
    view = next;
    stage.dataset.view = view;
    drawDeparture();
    captainControl?.cancel();
    tavernControls.hidden = view !== 'tavern';
    pickedSlot = null;
    for (const button of views) button.setAttribute('aria-pressed', String(button.dataset.prepView === view));
    if (viewSwitch) {
      const nextView = view === 'tavern' ? 'deck' : 'tavern';
      viewSwitch.dataset.destination = nextView;
      viewSwitch.setAttribute('aria-label', nextView === 'deck' ? '대기장으로 이동' : '선술집으로 이동');
      for (const icon of destinationIcons) icon.hidden = icon.dataset.prepDestinationIcon !== nextView;
    }
    for (const setting of settings) setting.hidden = setting.dataset.prepSetting !== view;
    drawBackdrop();
    if (view === 'tavern') drawTavern();
    else drawDeck();
  }

  for (const button of views) button.addEventListener('click', () => changeView(button.dataset.prepView));
  viewSwitch?.addEventListener('click', () => changeView(viewSwitch.dataset.destination));
  reroll.addEventListener('click', rerollTavern);
  level.addEventListener('change', () => {
    closeDetail();
    drawHud();
    drawBackdrop();
    if (view === 'tavern') drawTavern();
  });
  function drawFormationToggle() {
    const current = formationNames[currentFormation];
    const next = formationNames[currentFormation === 'column' ? 'line' : 'column'];
    formationLabel.textContent = current;
    formation.setAttribute('aria-label', `배치: 현재 ${current}, ${next}로 변경`);
    for (const icon of formationIcons) icon.hidden = icon.dataset.formationIcon !== currentFormation;
  }

  formation.addEventListener('click', () => {
    clearDeckPress();
    closeDetail();
    currentFormation = currentFormation === 'column' ? 'line' : 'column';
    if (run) {
      run.state.formation = currentFormation;
      run.update();
    }
    drawFormationToggle();
    drawDeck(null, `${formationNames[currentFormation]}로 변경했습니다.`);
  });
  slots.addEventListener('pointerdown', beginDeckPress);
  slots.addEventListener('pointermove', updateDeckPress);
  slots.addEventListener('pointerup', endDeckPress);
  for (const type of ['pointercancel', 'lostpointercapture']) {
    slots.addEventListener(type, event => {
      if (deckPointer?.id === event.pointerId) clearDeckPress();
    });
  }
  slots.addEventListener('contextmenu', event => {
    if (deckPointer) event.preventDefault();
  });
  window.addEventListener('blur', clearDeckPress);
  goldenToggle.addEventListener('click', () => {
    if (!detailGroup) return;
    showDetailEffect(goldenToggle.getAttribute('aria-pressed') !== 'true');
    positionDetail();
    revealDockedDetail();
  });
  recruitButton.addEventListener('click', hireSelectedPiece);
  if (run) {
    stage.setAttribute('data-mobile-run', '');
    level.hidden = true;
    upgradeButton.hidden = false;
    upgradeButton.addEventListener('click', () => {
      if (!run.upgrade()) return;
      closeDetail();
      readRun();
      drawHud();
      drawBackdrop();
      if (view === 'tavern') drawTavern();
    });
    function startBattle() {
      if (deploy.disabled) return;
      closeDetail();
      void run.launch();
      drawDeparture();
    }
    let deployPress;
    deploy.addEventListener('pointerdown', event => {
      if (event.isPrimary && event.pointerType === 'touch') {
        deployPress = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
    });
    deploy.addEventListener('pointercancel', () => { deployPress = null; });
    deploy.addEventListener('pointerup', event => {
      const press = deployPress;
      deployPress = null;
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8) {
        startBattle();
      }
    });
    deploy.addEventListener('click', startBattle);
    window.addEventListener('tavern-launch-rejected', () => {
      drawHud();
      deploy.textContent = '출정 재시도';
    });
    sellButton.addEventListener('click', () => {
      if (!run.sell(Number(detailTrigger?.dataset.slot) - 1)) return;
      closeDetail();
      readRun();
      drawHud();
      drawDeck();
    });
    const actionList = abilityDialog.querySelector('[data-run-ability-list]');
    let abilitySlot = -1;
    function refreshAbilityDialog() {
      abilityDialog.querySelector('h2').textContent = `${deck[abilitySlot].name} · 능력 사용`;
      actionList.replaceChildren();
      for (const action of run.abilities(abilitySlot)) {
        const form = document.createElement('form');
        const title = document.createElement('strong');
        title.textContent = action.cost ? `${action.label} · ${action.cost}` : action.label;
        form.append(title);
        const pick = (label, choices, current, optional = false) => {
          const menu = document.createElement('select');
          menu.setAttribute('aria-label', label);
          if (optional) menu.append(new Option('두 번째 대상 없음', ''));
          for (const option of choices) menu.append(new Option(option.label, option.value));
          if (current != null && choices.some(option => option.value === current)) menu.value = current;
          form.append(menu);
          return menu;
        };
        const targetLabel = action.kind === 'target' || action.kind === 'hunt' ? action.label : `${action.label} 대상`;
        const target = action.choices && pick(targetLabel, action.choices, action.selected);
        const second = action.second && pick('두 번째 대상', action.second, action.selectedSecond, true);
        const confirm = document.createElement('button');
        confirm.className = 'run-button';
        confirm.textContent = action.active ? '변경' : '적용';
        confirm.setAttribute('aria-label', `${action.label} ${confirm.textContent}`);
        confirm.disabled = Boolean(action.reason);
        form.append(confirm);
        if (action.active) {
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.className = 'run-button';
          cancel.textContent = '취소';
          cancel.setAttribute('aria-label', `${action.label} 취소`);
          cancel.addEventListener('click', () => {
            run.cancelAbility(abilitySlot, action.kind);
            refreshSelectedAbility();
          });
          form.append(cancel);
        }
        const message = document.createElement('small');
        message.role = 'status';
        message.textContent = action.reason || (action.active ? '출정 시 적용' : '');
        form.append(message);
        form.addEventListener('submit', event => {
          event.preventDefault();
          if (!run.applyAbility(abilitySlot, action.kind, target?.value, second?.value)) return;
          refreshSelectedAbility();
        });
        actionList.append(form);
      }
    }
    function refreshSelectedAbility() {
      closeDetail();
      readRun();
      drawHud();
      drawDeck(abilitySlot);
      refreshAbilityDialog();
    }
    abilityButton.addEventListener('click', () => {
      abilitySlot = Number(detailTrigger?.dataset.slot) - 1;
      if (!deck[abilitySlot]) return;
      refreshAbilityDialog();
      abilityDialog.showModal();
    });
    clock.hidden = true;
    hudTime.closest('.prep-hud-clock').querySelector('dt').textContent = '라운드 · 침식도';
    hudTime.removeAttribute('role');
    hudTime.removeAttribute('aria-label');
    hudTime.textContent = `${run.state.round}/15 · ${run.state.erosion}%`;
    readRun();
  }
  detail.querySelector('.prep-detail-close').addEventListener('click', () => closeDetail(true));
  termPanel.querySelector('.prep-term-close').addEventListener('click', () => {
    closeTerm(true);
    positionDetail();
  });
  document.addEventListener('pointerdown', event => {
    if (detailTrigger && !detailCluster.contains(event.target) && !abilityDialog.contains(event.target) &&
        !event.target.closest('.tavern-table, .prep-piece')) closeDetail();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && deckPointer) {
      event.preventDefault();
      clearDeckPress();
    }
    if (event.key === 'Escape' && termTrigger && !stage.querySelector('dialog[open]')) {
      event.preventDefault();
      closeTerm(true);
      positionDetail();
    } else if (event.key === 'Escape' && detailTrigger && !stage.querySelector('dialog[open]')) {
      event.preventDefault();
      closeDetail(true);
    }
  });
  const detailLayout = new ResizeObserver(positionDetail);
  for (const element of [stage, controls, detailCluster, tavernControls, departure, viewSwitch]) {
    if (element) detailLayout.observe(element);
  }
  clock.addEventListener('click', () => {
    window.clearTimeout(roundTick);
    roundDeadline = performance.now() + demoRoundSeconds * 1000;
    tickClock();
  });
  yardPatch.style.maskImage = yardPatchMask();
  drawHud();
  drawFormationToggle();
  if (!run) drawClock(demoRoundSeconds);
  changeView(view);
})();
