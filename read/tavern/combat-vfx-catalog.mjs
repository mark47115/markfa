// 액티브의 시전 시간과 범위는 docs/unit-active-skills.md를 따른다.
export const actives = {
  'allies-012': {name:'푸른 그늘', art:'canopy', windup:450, recipients:'ally', count:2, hold:4000, theme:'leaf',
    cue:'시전자 손에서 잎이 올라가고, 확정된 아군의 어깨 양쪽에 잎으로 된 보호막이 남는다.'},
  'allies-060': {name:'예비 장전', art:'load', windup:350, recipients:'ally', count:1, hold:4000, theme:'metal',
    cue:'대상의 장비에 황동 장전핀이 걸린다. 다음 기본 공격이 명중하면 핀이 터지며 사라진다.'},
  'allies-095': {name:'추격 신호', art:'hunt', windup:250, recipients:'party', count:2, hold:3000, theme:'leaf',
    cue:'시전자와 선택된 같은 기물 유닛의 발 앞에 방향을 가진 짧은 잎 두 장이 연달아 뜬다.'},
  'allies-107': {name:'방패 교대', art:'handoff', windup:400, recipients:'ally', count:1, hold:4000, theme:'bone',
    cue:'호위 대상 앞으로 두 겹의 방패 모서리가 닫힌다. 남은 보호막은 몸 바깥에 짧은 선으로 표시한다.'},
  'allies-139': {name:'동력 분배', art:'circuit', windup:400, recipients:'robot', count:2, hold:4000, theme:'coil',
    cue:'절연된 전류가 바닥을 두 번 꺾어 작업 로봇에 닿고, 로봇 옆에 전하 마디가 붙는다.'},
  'allies-165': {name:'응급 약병', art:'potion', windup:350, recipients:'ally', count:1, theme:'leaf',
    cue:'확정된 대상 앞에서 약병이 열리고, 낮은 병 조각과 세 개의 회복 도트가 올라간다.'},
  'allies-209': {name:'후속 북소리', art:'drum', windup:450, recipients:'ally', count:3, hold:4000, theme:'teal',
    cue:'북면에서 짧은 음파가 번지고, 이번 강화 대상에게만 호박색 박자 표시가 뜬다.'},
  'allies-034': {name:'갈퀴 휩쓸기', art:'rake', windup:350, recipients:'enemy', count:3, center:'caster', radius:1.6, theme:'bone',
    cue:'시전자 중심의 원형 예고 뒤, 발톱 방향으로 세 줄이 갈라지고 맞은 적에게만 파편이 튄다.'},
  'allies-050': {name:'불씨 산탄', art:'buckshot', windup:500, recipients:'enemy', count:3, center:'fixed', radius:1.4, theme:'ember',
    cue:'고정된 적 바닥을 붉게 예고한다. 총구에서 좁게 갈라진 불씨가 예고 반경에서 흩어진다.'},
  'wolf-javelin': {name:'표식 꿰기', art:'markpierce', windup:400, recipients:'enemy', count:2, theme:'bone',
    cue:'기존 사냥 표식의 틈이 닫히며 첫 대상이 확정된다. 관통 뒤 1.2 범위에서 확정된 두 번째 적에게 작은 쐐기가 이어진다.'},
  'allies-127': {name:'서약의 반격', art:'oath', windup:400, recipients:'enemy', count:3, center:'caster', radius:1.7, theme:'bone',
    cue:'도끼를 끌어 올린 다음 끊어진 뼈색 원호가 발밑을 훑고, 적중점에 옅은 자주색 파편이 남는다.'},
  'allies-153': {name:'축전 방전', art:'discharge', windup:350, recipients:'enemy', count:3, center:'caster', radius:1.7, theme:'coil',
    cue:'코일에서 각진 전류가 나간다. 제거된 보호막은 두 조각으로 갈라지고, 이어지는 피해는 작은 접촉 섬광으로 표시한다.'},
  'allies-179': {name:'방패 견제', art:'check', windup:350, recipients:'enemy', count:1, hold:3000, theme:'metal',
    cue:'호송 대상 앞에서 방패 모서리가 적과 맞닿는다. 느려진 적의 공격은 머리 옆에 간격이 긴 두 눈금으로 표시한다.'},
  'allies-195': {name:'분노 짓밟기', art:'stomp', windup:450, recipients:'enemy', count:3, center:'caster', radius:1.8, theme:'ember',
    cue:'들었던 발이 내려가면 바닥에 계단형 균열이 갈라진다. 돌조각은 낮게 튀고 발밑부터 가라앉는다.'},
};

// 기물 보너스와 구분되는 유닛 고유 효과다. 동일한 판정은 도형을 공유한다.
const passiveSets = [
  ['slow','첫 적중 둔화','기본 공격 적중','enemy',[
    'seedling-keeper','brook-hunter','belltower-sentry','war-drummer','allies-004','allies-024','allies-026','allies-032',
    'allies-068','allies-074','allies-093','allies-097','allies-101','allies-103','allies-137','allies-161','allies-175','allies-201',
    'retinues-215','retinues-219','retinues-233','retinues-247','retinues-253','retinues-265']],
  ['slow','피격 반응 둔화','최초 유효 피격','attacker',[
    'allies-105','allies-177','retinues-237','retinues-243','retinues-259']],
  ['bonus','첫 공격 추가 피해','기본 공격 적중','enemy',[
    'tongs-hammer','wolf-javelin','allies-015','allies-018','allies-022','allies-028','allies-034','allies-038','allies-040',
    'allies-050','allies-052','allies-056','allies-058','allies-064','allies-072','allies-081','allies-085','allies-087',
    'allies-091','allies-095','allies-115','allies-117','allies-119','allies-125','allies-127','allies-131','allies-143',
    'allies-145','allies-151','allies-155','allies-169','allies-171','allies-209','allies-211','retinues-217','retinues-231',
    'retinues-251','retinues-263','retinues-271']],
  ['reduction','피해 경감','조건을 만족한 피격','self',[
    'shield-deputy','stone-shoulder-orc','allies-006','allies-014','allies-016','allies-020','allies-030','allies-036','allies-040',
    'allies-044','allies-046','allies-048','allies-060','allies-062','allies-066','allies-107','allies-109','allies-123','allies-128',
    'allies-133','allies-135','allies-147','allies-153','allies-156','allies-159','allies-163','allies-165','allies-173','allies-179',
    'allies-181','allies-183','allies-187','allies-193','allies-197','allies-203','allies-205','allies-207','allies-212',
    'retinues-213','retinues-225','retinues-235','retinues-239','retinues-257','retinues-261','retinues-269']],
  ['heal','자신 회복','조건 충족 후 회복 확정','self',[
    'ledger-carrier','allies-012','allies-083','allies-149','allies-189','allies-195','retinues-223','retinues-229','retinues-255']],
  ['heal','아군 회복','조건 충족 후 회복 확정','friend',['lantern-priest','allies-008','allies-141','retinues-241']],
  ['shield','보호막 생성','체력 조건 충족','self',['allies-054','allies-079','allies-121','allies-139','allies-167','allies-191']],
  ['counter','피격 반격','첫 체력 피격 후 반격 확정','attacker',['citadel-captain','retinues-227','retinues-245']],
  ['counter','아군 퇴장 추모 타격','첫 아군 퇴장','enemy',['allies-010']],
  ['shatter','보호막 손실','보호막이 남은 적에게 첫 적중','enemy',['assembly-robot']],
  ['haste','동료 이동 가속','출전 직후','friend',['seed-horn']],
  ['haste','표식 적중 이동 가속','표식 적에게 첫 적중','self',['falcon-lookout']],
  ['reach','첫 공격 사거리','첫 기본 공격 조준','self',['retinues-221']],
  ['charge','첫 공격 빠른 준비','첫 기본 공격 준비','self',['retinues-249']],
];

const foePassives = {
  'ruin-shell':[['taunt','도발','기본 공격 목표 재지정','self']],
  'broken-crown':[['taunt','도발','기본 공격 목표 재지정','self']],
  'void-282':[['taunt','도발','기본 공격 목표 재지정','self']],
  'void-286':[['taunt','도발','기본 공격 목표 재지정','self']],
  'void-284':[['taunt','도발','기본 공격 목표 재지정','self'],['shield','시작 보호막','전투 시작','self']],
  'blue-gatekeeper':[['taunt','도발','기본 공격 목표 재지정','self'],['shield','시작 보호막','전투 시작','self']],
  'void-281':[['shield','시작 보호막','전투 시작','self']],
  'void-287':[['shield','시작 보호막','전투 시작','self']],
  'shell-carrier':[['shield','동료 보호막','전투 시작','friend']],
  'void-304':[['shield','동료 보호막','전투 4초','friend']],
  'veil-wraith':[['revive','첫 부활','첫 사망 후 부활','self']],
  'abyssal-choir':[['revive','첫 부활','첫 사망 후 부활','self']],
  'void-280':[['growth','칼날 성장','기본 공격 처리 후 생존','self']],
  'void-285':[['growth','칼날 성장','기본 공격 처리 후 생존','self']],
  'the-devourer':[['taunt','도발','기본 공격 목표 재지정','self'],['split','분열','본체 최종 퇴장','self']],
  'void-291':[['reduction','껍질 방어','첫 피해','self']],
  'hook-young':[['approach','갈고리 접근','전투 1초','enemy']],
  'void-295':[['approach','후열 접근','전투 2초에 예고 후 접근','enemy']],
  'void-293':[['slow','푸른 숨 둔화','첫 적중','enemy']],
  'void-294':[['bonus','촉수 추가 피해','첫 원거리 적중','enemy']],
  'warped-turret':[['bonus','포구 추가 피해','첫 원거리 적중','enemy']],
  'echo-worm':[['counter','메아리 타격','첫 적중 후 인접 피해 확정','enemy']],
  'void-298':[['heal','동료 회복','전투 4초','friend']],
  'void-302':[['heal','처치 회복','첫 직접 처치','self']],
  'mirror-watcher':[['weaken','공격력 감소','첫 원거리 명중','enemy']],
  'split-prophet':[['counter','갈라진 예언','전투 5초에 같은 열 피해','enemy']],
};

export const passiveCue = {
  slow:'대상의 발목 앞에 작은 꺾쇠 두 개가 바닥을 향해 잠긴다.',
  bonus:'기존 적중 도트 뒤에 작은 쐐기 두 개가 한 번 더 튄다.',
  reduction:'충돌 쪽에 짧은 방어면을 세우고 흩어진 조각을 아래로 떨어뜨린다.',
  heal:'대상 옆에서 짧은 줄기에 잎처럼 도트가 교대로 오른다.',
  shield:'대상의 양옆에 몸과 떨어진 모서리가 생긴다. 파괴 시 두 갈래로 끊긴다.',
  counter:'발동 위치에서 확정된 적에게 한 줄이 가고 작은 타격이 남는다.',
  shatter:'대상의 기존 보호막 가장자리가 두 조각으로 갈라진다.',
  haste:'발바닥 뒤쪽에 진행 방향과 나란한 세 눈금이 붙는다.',
  reach:'조준선 앞쪽에 연장된 짧은 점선이 한 번 나타난다.',
  charge:'장비 옆 두 개의 장전 눈금이 빠르게 차고 사라진다.',
  taunt:'발 아래 갈고리 모양이 짧게 펼쳐지고 목표 방향을 향한다.',
  revive:'사망 지점에 핵이 떠올랐다가 조각이 모이면서 몸으로 돌아온다.',
  growth:'공격 기관 근처에 발광 마디가 하나 붙는다.',
  split:'본체 위치에서 핵 두 개가 실제 분열체 배치 지점으로 갈라진다.',
  approach:'도착 지점을 찍고 바닥에 짧은 접근 자국을 남긴다.',
  weaken:'표적의 장비 옆에 부러진 쐐기 하나가 떨어진다.',
};
const passiveById = new Map();
function addPassive(id, values) {
  const [art,name,when,to] = values;
  if (!passiveById.has(id)) passiveById.set(id,[]);
  passiveById.get(id).push({art,name,when,to,cue:passiveCue[art]});
}
for (const [art,name,when,to,ids] of passiveSets) for (const id of ids) addPassive(id,[art,name,when,to]);
for (const [id,passives] of Object.entries(foePassives)) for (const effect of passives) addPassive(id,effect);

const weaponFx = {
  blade:['검·도끼 궤적','arc'], pierce:['창·찌르기','thrust'], shield:['방패 충돌','bash'],
  punch:['주먹·기계 팔','jab'], claw:['발톱·날개','claw'], hammer:['둔기 충돌','slam'],
  bite:['턱 타격','bite'], stomp:['발굽 충돌','slam'], arrow:['화살','arrow'],
  bolt:['석궁 화살','bolt'], javelin:['투창','javelin'], stone:['투척물','stone'],
  shot:['총포','shot'], sound:['악기의 전방 음파','sonic'], rally:['악기의 짧은 음파','sonic'],
  arcane:['지팡이 탄','mote'], cast:['지팡이·등불','mote'], seed:['씨앗 탄','seed'],
  electric:['전하','electric'], smoke:['연막 분사','smoke'], scout:['관측 장비','dart'],
  mark:['표식 투사','dart'],
};
const voidWeapons = {
  tick:'jab',pounce:'jab',slab:'bash',pincer:'claw',fang:'bite',veil:'arc',
  spine:'thrust',fault:'slam',echo:'bite',sickle:'arc',maw:'bite',spore:'seed',shell:'bash',hook:'claw',
  breath:'smoke',glass:'dart',sand:'jab',seam:'mote',mirror:'beam',gate:'bash',cannon:'shot',cloud:'smoke',rift:'arc',
};
const ranged = new Set(['arrow','bolt','javelin','stone','shot','mote','seed','electric','smoke','dart','beam','sonic']);

export function catalog(roster, motion, profiles) {
  const motions = new Map(motion.units.map(unit=>[unit.id,unit]));
  const effects = new Map(profiles.units.map(unit=>[unit.id,unit]));
  const choices = roster.units.map(unit=>{
    const source=motions.get(unit.id);
    const isEnemy=unit.kind==='void';
    const tint=effects.get(unit.id)?.tint;
    const trait=unit.role ?? unit.hint ?? '';
    const clips=source?.attacks.filter(clip=>clip.key!=='skill') ?? [];
    let basic=clips.map(clip=>{
      const [name,art]=weaponFx[clip.effect] ?? (/원거리/.test(trait) ? ['짧은 투사체','dart'] : ['근접 접촉','jab']);
      return {name,art,clip,tint,flight:ranged.has(art)};
    });
    if (isEnemy) {
      const clip=clips[0];
      const art=clip.effect==='rift'&&clip.event==='release'?'mote':voidWeapons[clip.effect];
      if (!art) throw new Error('No basic effect for '+unit.id);
      basic=[{name:clip.label,art,clip,tint,motif:clip.effect,flight:clip.event==='release'}];
    }
    return {...unit,source,isEnemy,trait,basic,passives:passiveById.get(unit.id) ?? [],active:actives[unit.id]};
  });
  const known=new Set(choices.map(unit=>unit.id));
  for (const id of [...Object.keys(actives),...passiveById.keys()]) {
    if (!known.has(id)) throw new Error('Effect uses unknown unit '+id);
  }
  return choices;
}
