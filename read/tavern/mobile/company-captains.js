export const commandNames = {
  rowan:['공개 징집','액티브','첫 방문은 무료, 이후 1골드로 고른 팀에 창팔 보행기 또는 새눈 활잡이 둘을 보냅니다.'],
  mire:['전선 예측','패시브','적이 가장 많은 열의 아군 공격·치유 +15%. 최다 열이 여럿이면 고를 수 있습니다.'],
  thorin:['현장 개조','액티브','한 팀에 공성추(공격·치유 +20%) 또는 겹장갑(최대 체력 +25%)을 장착합니다.'],
  sera:['갈림길 장터','액티브','매물 하나를 남기고 나머지 열린 탁자를 다시 뽑습니다.'],
  bryn:['개척 예산','액티브','이번 유료 레벨업을 2골드 할인하거나 한 팀에 덧판 경비기 둘을 보냅니다.'],
  edda:['성문 수비선','패시브','전열 한 팀은 보호막 35%, 둘 이상이면 각 팀에 보호막 20%를 줍니다.'],
  lark:['협공 표적','패시브','같은 열의 전·후열 두 팀에 공격·치유 +15%. 첫 방문의 단독 팀은 +10%.'],
  narin:['야전 진료','액티브','고른 팀의 생존 병사가 4초마다 최대 체력의 8%를 회복합니다.'],
  orr:['출정 종소리','패시브','속종은 처음 5초, 대종은 6~12초에 아군 공격·치유를 25% 올립니다.'],
  lume:['측면 인도','액티브','외곽 팀의 이동 속도 +30%. 공격병은 같은 쪽 적 후열을 우선합니다.'],
};
export function observed(wave){
  const lanes=[0,0,0];for(const e of wave.enemies)lanes[e.slot%3]+=e.count;
  return lanes.flatMap((n,i)=>n===Math.max(...lanes)?[i]:[]);
}
export function commands(state,cards,wave,sealed){
  const cols=state.formation==='line'?3:2;
  const team=(modes,ok=()=>true)=>state.deck.flatMap((p,i)=>p?modes.flatMap(([v,label])=>
    ok(p,i,v)?[{value:p.key+'/'+v,label:`${i+1}번 ${cards.get(p.id).name} · ${label}`}]:[]):[]);
  switch(state.captain){
    case 'rowan':return team([['steel-1a','창팔 보행기 2명'],['grove-1a','새눈 활잡이 2명']],p=>p.army.length<30);
    case 'mire':return observed(wave).map(i=>({value:String(i),label:['왼쪽','가운데','오른쪽'][i]+' 열 관측'}));
    case 'thorin':return team([['ram','공성추'],['armor','겹장갑']],(p,i,v)=>p.gearMode!==v);
    case 'sera':return state.offers.flatMap((id,i)=>id&&!sealed(i)&&state.offers.some((_,j)=>j!==i&&!sealed(j))?
      [{value:String(i),label:`${i+1}번 ${cards.get(id).name} 보존`}]:[]);
    case 'bryn':return [...(state.level<5?[{value:'discount',label:'증축 · 다음 레벨업 할인'}]:[]),
      ...team([['camp','숙영 · 덧판 경비기 2명']],p=>p.army.length<30)];
    case 'narin':return team([['clinic','야전 진료']]);
    case 'lume':return team([['wing','측면 인도']],(p,i)=>i%cols===0||i%cols===cols-1);
    case 'orr':return ['속종','대종'].map((label,i)=>({value:String(i),label}));
    case 'lark':return Array.from({length:cols},(_,i)=>i).filter(i=>state.deck[i]&&state.deck[i+cols])
      .map(i=>({value:String(i),label:`${i+1}열 협공`}));
    default:return [];
  }
}
export function captainPlan(state,party,wave,fill,produce,chosen,cols){
  const id=state.captain, cmd=state.command??{}, target=party.find(t=>t.p.key===cmd.key);
  const exclusive=party.filter(t=>t.card.captain===id);
  const has=tier=>exclusive.some(t=>t.card.tier===tier);
  const permanent=(t,field,n)=>{if(t)t.p[field]=(t.p[field]??0)+n;};
  let active=false;
  if(id==='rowan'&&target){
    const fresh=!target.p.army.includes(cmd.mode);
    active=!!fill(target,cmd.mode,2);
    if(active&&fresh&&has(1))target.shield+=15;
    if(active&&has(3))fill(target,cmd.mode==='steel-1a'?'grove-1a':'steel-1a',2);
    if(active)for(const t of exclusive.filter(t=>t.card.tier===5)){
      if(t===target)permanent(t,'attackPct',10);else{t.atk+=15;target.atk+=15;break;}
    }
  }
  if(id==='mire'){
    const lanes=observed(wave), lane=lanes.includes(+cmd.value)?+cmd.value:lanes[0];
    const hit=party.filter(t=>(cols===2?t.i%2*2:t.i%3)===lane);
    active=hit.length>0;for(const t of hit)t.atk+=15;
    const t=hit[0];if(t&&has(1))t.shield+=15;if(t&&has(3))fill(t,'dusk-1a',2);
    for(const x of exclusive.filter(t=>t.card.tier===5))if(hit.includes(x))permanent(x,'attackPct',10);else if(t)t.hp+=25;
  }
  if(id==='thorin'){
    for(const t of party)if(t.p.gearMode==='ram')t.atk+=20;else if(t.p.gearMode==='armor')t.hp+=25;
    active=!!target;
    if(target){if(has(1))target.shield+=15;if(has(3))fill(target,'steel-1a',1);
      if(has(5)){if(cmd.changed)permanent(target,'healthPct',10);else target.atk+=15;}}
  }
  if(id==='sera'){
    active=!!cmd.markedHire;
    const t=party.find(t=>t.p.key===cmd.markedHire);
    if(t&&has(1))t.atk+=20;if(t&&has(3))fill(t,'guild-1b',2);
    for(const x of exclusive.filter(t=>t.card.tier===5&&active)){permanent(x,'healthPct',10);if(t)t.atk+=15;}
  }
  if(id==='bryn'){
    active=cmd.paid||!!target;
    if(target)fill(target,'steel-1b',2);
    if(has(1)&&target)target.shield+=15;
    if(has(1)&&cmd.paid)for(const t of exclusive.filter(t=>t.card.tier===1))t.atk+=20;
    if(active&&has(3))fill(target??party[0],'steel-1a',2);
    if(active&&has(5)){if(target)permanent(target,'healthPct',10);else for(const t of exclusive.filter(t=>t.card.tier===5))permanent(t,'attackPct',15);}
  }
  if(id==='edda'){
    const front=party.filter(t=>t.i<cols);active=front.length>0;
    for(const t of front)t.shield+=front.length===1?35:20;
    if(active&&has(1))front[0].hp+=15;
    if(has(3))fill([...front].sort((a,b)=>a.p.army.length-b.p.army.length)[0],'dusk-1b',2);
    const wall=front.find(t=>t.card.captain===id&&t.card.tier===5);
    if(wall&&front.length===1)permanent(wall,'healthPct',10);else if(wall)for(const t of front)t.atk+=15;
  }
  if(id==='lark'){
    const fronts=party.filter(t=>t.i<cols&&party.some(o=>o.i===t.i+cols));
    const front=fronts.find(t=>t.i===+cmd.value)??fronts[0], rear=front&&party.find(t=>t.i===front.i+cols);
    if(front&&rear){active=true;front.atk+=15;rear.atk+=15;rear.partner=front.i+1;
      if(has(1))front.shield+=15;if(has(3))fill(rear,'grove-1a',2);
      for(const t of [front,rear])if(t.card.captain===id&&t.card.tier===5)permanent(t===front?rear:front,'attackPct',10);
    }else if(state.round===1&&party.length===1){party[0].atk+=10;if(has(1))party[0].shield+=15;}
  }
  if(id==='narin'&&target){
    active=true;target.clinic=has(5)?12:8;
    if(has(1))target.hp+=15;if(has(3))fill(target,'grove-1b',2);if(has(5))permanent(target,'healthPct',10);
  }
  if(id==='orr'){
    active=party.length>0;
    const late=cmd.value==='1';
    for(const t of party){t.bellStart=late?(has(5)?4:6):0;t.bellEnd=late?12:(has(5)?7:5);
      t.bellPct=t.card.captain===id&&t.card.tier===5?40:25;
      if(t.card.captain===id&&t.card.tier===1){if(late)t.shield+=20;else t.atk+=15;}}
    if(has(3))fill(party[0],late?'dusk-1b':'dusk-1a',2);
  }
  if(id==='lume'&&target&&(target.i%cols===0||target.i%cols===cols-1)){
    active=true;target.speed=30;target.flank=true;if(has(1))target.shield+=20;
    const others=party.filter(t=>t!==target&&t.i%cols===target.i%cols);
    if(has(3)){if(others.length){fill(target,'guild-1a',1);fill(others[0],'guild-1a',1);}else fill(target,'guild-1b',2);}
    if(has(5)){permanent(target,'attackPct',10);for(const t of others)t.speed=20;}
  }
  if(active&&exclusive.length)produce('captain',exclusive,chosen('receive:captain',exclusive).card.reserves[0]);
}
