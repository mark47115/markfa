import {captainPlan} from './company-captains.js';
const production = [0,1,2,3,5,7];
const descriptions = {
  steel:'같은 수레 2대마다 해당 설비의 한 팀에 병력을 보냅니다. 방문당 한 팀의 수레를 교체할 수 있습니다.',
  dusk:'봉화와 이웃 황혼 팀에 화력 2부터 보호막 15%. 화력 3부터 한 팀에 병력을 보냅니다.',
  grove:'고용하면 공유 정기 +2. 출정 때 숲 기물 수만큼(최대 2) 더합니다. 정기 3부터 증원, 6부터 숲 한 팀에 영구 체력 +10%.',
  guild:'이번 방문에 지출한 골드가 3이면 한 팀에 보호막 20%, 6이면 공격·치유 +20%와 상단 증원도 받습니다.',
  forge:'방문당 한 번 단조합니다. 판정 3부터 보호막 15%, 5부터 공격·치유 +15%와 무쇠 증원이 열립니다.',
  horde:'이번 방문에 고용했다면 덱 최고 판정 팀에 호드 병사를 소환합니다. 5단계 호드는 판정을 높일 수 있습니다.',
  fang:'처치에 기여한 팀은 전투당 정수 최대 3. 정수 2부터 공격·치유 +15%와 계열 증원, 3부터 보호막 15%.',
};
export const companyRule = card => descriptions[card.company] ?? '선택한 대장의 전용 병사 두 명을 고용합니다.';
export function eligibleCompany(card,state) {
  return card.tier <= state.level && (card.captain ? card.captain === state.captain :
    state.factions.includes(card.faction) && (card.mix < 0 || card.mix === state.mix));
}
export function companyTrade(state,cards,type,card,price=0) {
  const ledger=state.ledger ??= {spend:0,hires:0,paid:[],income:0};
  ledger.spend += price;
  const earn=(name,n) => {
    if (ledger.paid.includes(name) || ledger.income>=2) return;
    const amount=Math.min(n,2-ledger.income);
    ledger.paid.push(name); ledger.income+=amount; state.gold+=amount;
  };
  const party=state.deck.filter(Boolean).map(p=>({...cards.get(p.id),golden:p.golden}));
  if(type==='hire'){
    ledger.hires++;
    if(card.company==='grove') state.spirit=Math.min(9,(state.spirit??0)+2);
    if(card.name==='장부 견습') earn(card.name,1);
    if(card.name==='고철 대장장이') ledger.extraForge=true;
    const guide=party.find(c=>c.name==='장터 안내조' && c.company!==card.company);
    if(guide) earn(guide.name,guide.golden?2:1);
  }
  if(type==='roll' && price && party.some(c=>c.name==='저장고 견습')) earn('저장고 견습',1);
  if(type==='upgrade' && price){ledger.upgraded=true;if(party.some(c=>c.name==='군마 감정사'))earn('군마 감정사',1);}
  if(type==='sell')ledger.sold=true;
  if(type==='sell' && card?.name!=='중개인' && party.some(c=>c.name==='중개인'))earn('중개인',1);
  if(type==='hire' && card.company!=='guild' && party.some(c=>c.name==='창고 감정사'))earn('창고 감정사',1);
  if(type==='sell' && card?.name!=='수레 중개인'){
    const broker=party.find(c=>c.name==='수레 중개인');
    if(broker) earn(broker.name,broker.golden?2:1);
  }
}
export function companyPlan(state,cards,wave,orders=state.orders) {
  const cols=state.formation==='line'?3:2;
  const deck=state.deck.map(p=>p && ({...p, army:[...(p.army??cards.get(p.id).members)]}));
  const party=deck.flatMap((p,i)=>p?[{p,i,card:cards.get(p.id),atk:0,hp:0,shield:0}]:[]);
  const group=id=>party.filter(t=>t.card.company===id);
  const nearby=(a,b)=>Math.abs(a.i%cols-b.i%cols)+Math.abs(Math.floor(a.i/cols)-Math.floor(b.i/cols))===1;
  const order=(kind)=>orders.find(o=>o.kind===kind);
  const chosen=(kind,teams)=>teams.find(t=>t.p.key===order(kind)?.source)??teams[0];
  const fill=(t,id,n)=>{if(!t)return 0; n=Math.min(n,30-t.p.army.length); for(let i=0;i<n;i++)t.p.army.push(id); return n};
  const produce=(kind,teams,id)=>{
    const t=chosen('receive:'+kind,teams.filter(t=>t.p.army.length<30));
    return t && fill(t,id,production[t.card.tier]) ? t : null;
  };
  const lvl=t=>t.p.rank??t.card.tier;
  captainPlan(state,party,wave,fill,produce,chosen,cols);
  const steel=group('steel');
  const swap=steel.find(t=>order('wagon')?.source===t.p.key);
  if(swap){swap.p.wagon=swap.p.wagon==='wall'?'camp':'wall'; if(swap.p.wagon==='wall')swap.shield+=25;else swap.atk+=20;}
  const carts=kind=>steel.filter(t=>(t.p.wagon??'camp')===kind);
  const made={};
  const owns=name=>party.some(t=>t.card.name===name);
  const pools={camp:['steel-1a','steel-2a','steel-3b'],wall:['steel-1b','steel-3a'],
    dusk:['dusk-1a','dusk-1b'],grove:['grove-1a','grove-1b'],guild:['guild-1a','guild-1b'],
    forge:['forge-1a','forge-1b'],horde:['horde-1a','horde-1b'],fang:['fang-1a','fang-1b']};
  const pick=kind=>{
    const choices=pools[kind].filter(id=>Number(id.split('-')[1][0])<=Math.ceil(state.level/2));
    return choices.includes(order('unit:'+kind)?.target)?order('unit:'+kind).target:choices[0];
  };
  for(const cart of ['camp','wall']) if(carts(cart).length>=2)made[cart]=produce('steel',carts(cart),pick(cart));
  const dusk=group('dusk'), fire=chosen('fire',dusk);
  const lit=fire?dusk.filter(t=>t===fire||nearby(t,fire)):[];
  if(fire){
    fire.p.fire=Math.min(6,(fire.p.fire??0)+2+Math.min(2,lit.length-1));
    for(const t of lit)t.shield+=15;
    if(fire.p.fire>=3)made.dusk=produce('dusk',lit,pick('dusk'));
  }
  const spirit=Math.min(9,(state.spirit??0)+Math.min(2,group('grove').length));
  const grove=group('grove');
  if(spirit>=6)pools.grove.push('grove-2a','grove-3a');
  if(owns('솔방울 변신단'))pools.grove.push('grove-2b');
  const forestTeam=grove.length&&spirit>=3?produce('grove',party,pick('grove')):null;
  if(grove.length&&spirit>=6){const t=chosen('receive:grove',grove); t.p.healthPct=(t.p.healthPct??0)+10;}
  const spend=state.ledger?.spend??0;
  const guild=group('guild');
  if(guild.length && spend>=3){
    const t=chosen('receive:guild',party); t.shield+=20;
    made.reward=t;if(spend>=6){t.atk+=20;made.guild=produce('guild',guild,pick('guild'));}
  }
  for(const [kind,teams] of [['forge',group('forge')],['extraForge',state.ledger?.extraForge?group('forge'):[]],['horde',group('horde').filter(t=>t.card.tier===5)]]) {
    const t=teams.find(t=>t.p.key===order('rank:'+kind)?.source);
    if(t)t.p.rank=Math.min(9,lvl(t)+1);
  }
  const forge=group('forge');
  for(const t of forge){if(lvl(t)>=3)t.shield+=15;if(lvl(t)>=5)t.atk+=15;}
  produce('forge',forge.filter(t=>lvl(t)>=5),pick('forge'));
  const top=party.filter(t=>lvl(t)===Math.max(...party.map(lvl)));
  const promoted=party.find(t=>order('rank:horde')?.source===t.p.key);
  const summon=group('horde').length&&(state.ledger?.hires||(owns('도전자 모집꾼')&&state.ledger?.sold)||
    (owns('붉은뿔 징수대')&&state.ledger?.upgraded)||promoted?.card.name==='붉은모래 챔피언');
  if(owns('깨진뿔 전열대'))pools.horde.push('horde-2b');
  if(owns('도전자 모집꾼')||owns('붉은모래 챔피언'))pools.horde.push('horde-2a');
  if(owns('붉은갈기 북지기')||owns('상처 교관'))pools.horde.push('horde-3a');
  if(owns('붉은모래 챔피언'))pools.horde.push('horde-3b');
  if(summon)made.horde=produce('horde',top,pick('horde'));
  const fang=group('fang');
  for(const t of fang){if(t.p.essence>=2)t.atk+=15;if(t.p.essence>=3)t.shield+=15;}
  if(fang.some(t=>t.p.essence>=2))produce('fang',fang,pick('fang'));
  const buffed=new Map();
  for(const t of party){
    const n=t.p.golden?20:10;
    const upgrade=(base,gold)=>t.p.golden?gold:base;
    const grant=(who,stat,value)=>{
      if(!who)return;const permanent=['healthPct','attackPct'].includes(stat),key=[t.card.id,who.i,stat].join('/');
      const old=buffed.get(key)??0;if(old>=value)return;buffed.set(key,value);
      const target=permanent?who.p:who;target[stat]=(target[stat]??0)+value-old;
    };
    const neighbor=who=>who&&party.find(a=>nearby(who,a));
    const other=(list,who=t)=>list.find(a=>a!==who);
    const grow=(who,id,bonus,amount)=>{if(who&&fill(who,id,1)&&t.p.golden&&bonus)grant(who,bonus,amount);};
    const fireLevel=lit.includes(t)?fire.p.fire:0;
    const forged=forge.find(a=>['rank:forge','rank:extraForge'].some(k=>order(k)?.source===a.p.key));
    const recent=party.find(a=>a.p.hiredRound===state.round);
    switch(t.card.name){
      case '리벳 조립반': if(carts(t.p.wagon??'camp').length>=2)t.shield+=n; break;
      case '코일 경비기': if(t===swap)t.atk+=n; break;
      case '황혼 방패병': if(lit.includes(t))t.shield+=n; break;
      case '맹약의 검사': if(lit.includes(t))t.atk+=n; break;
      case '달숲 순찰대': if(spirit>=3)t.atk+=n; break;
      case '묘목 돌봄이': if(forestTeam)forestTeam.shield+=n; break;
      case '무쇠 견습공': if(lvl(t)>=2)t.atk+=n; break;
      case '개울 정찰대': if(t.p.essence>=1)t.atk+=n; break;
      case '돌담 달리미': if(t.p.essence>=1)t.shield+=n; break;
      case '장부 견습': if(spend>=3&&t.p.golden)t.shield+=15; break;
      case '저장고 견습': if(spend>=3&&t.p.golden)t.atk+=15; break;
      case '나사 선반대':case '예비역 조달관':grant(made.camp,'atk',upgrade(15,25));break;
      case '절연 케이블반':grant(made.wall,'shield',upgrade(15,25));break;
      case '스파크 유도기':if(swap?.p.wagon==='camp')grant(swap,'atk',upgrade(15,25));break;
      case '접지 정비기':if(swap?.p.wagon==='wall')grant(swap,'healthPct',upgrade(5,10));break;
      case '부품 배분기':{const c=carts(t.p.wagon??'camp');if(c.length>=2)grant(other(c),'healthPct',upgrade(5,10));break;}
      case '정비 레일대':grant(neighbor(swap),'shield',upgrade(15,25));break;
      case '전하 중계기':if(swap===t)grant(neighbor(t),'atk',upgrade(15,25));break;
      case '예열 증폭기':if(carts('camp').length&&carts('wall').length)grant(t,'attackPct',upgrade(5,10));break;
      case '공성 지휘기':if(carts('camp').length>=3&&made.camp)grow(other(carts('camp'),made.camp),pick('camp'),'atk',20);break;
      case '분대 통제기':if(swap)for(const a of party.filter(a=>nearby(a,swap)).slice(0,t.p.golden?2:1))
        grant(a,swap.p.wagon==='wall'?'shield':'atk',swap.p.wagon==='wall'?25:20);break;
      case '교정기':grant(swap,'attackPct',upgrade(10,15));break;
      case '조립기':if(carts('wall').length>=2)for(const a of carts('wall'))grant(a,'hp',upgrade(20,30));break;
      case '파견 공병':if(swap)grant(party.find(a=>a.card.company!=='steel'&&nearby(a,swap)),'shield',upgrade(20,30));break;
      case '철등불 호위대':if(fireLevel>=3)grant(fire,'hp',upgrade(15,25));break;
      case '저녁 망토병':if(fireLevel>=3)grant(other(lit),'shield',upgrade(15,25));break;
      case '상복 창병대':if(fire===t)grant(t,'attackPct',upgrade(5,10));break;
      case '맹세의 선발대':case '종자 인솔관':if(fireLevel>=3)grow(lit.find(a=>a.p.army.length<30),'dusk-1a','shield',t.card.tier===4?20:15);break;
      case '저녁 순찰대':if(fireLevel>=3)grant(fire,'healthPct',upgrade(5,10));break;
      case '황혼 잔류대':if(fireLevel>=4)grant(other(lit),'attackPct',upgrade(5,10));break;
      case '검은기 수습대':case '황혼의 대원수':if(fireLevel>=4)for(const a of lit)grant(a,'atk',t.card.tier===5?upgrade(30,40):upgrade(10,15));break;
      case '마지막 성문장':if(fireLevel>=4)grant(fire,'healthPct',upgrade(15,20));break;
      case '성문 기수장':if(fireLevel>=2)grant(t,'attackPct',upgrade(10,15));break;
      case '횃불 교대대':if(fireLevel>=3)grant(other(lit,fire),'atk',upgrade(25,35));break;
      case '연락 기수':if(fireLevel>=3)grant(t,'atk',upgrade(20,30));break;
      case '뿌리 등지기':if(fireLevel>=3)grant(t,'healthPct',upgrade(10,15));break;
      case '가지 접목반':if(forestTeam===t)grant(t,'healthPct',upgrade(5,10));break;
      case '이슬막 약초반':if(spirit>=3)grant(chosen('receive:grove',grove),'hp',upgrade(15,25));break;
      case '솔방울 변신단':if(pick('grove')==='grove-2b')grant(forestTeam,'atk',n);break;
      case '달빛 피리꾼':if(spirit>=3)grant(grove.find(a=>a.p.hiredRound===state.round),'atk',upgrade(15,25));break;
      case '숲의 인도자':if(spirit>=6)grant(forestTeam,'attackPct',upgrade(5,10));break;
      case '뿌리 연락조':if(spirit>=6)grant(neighbor(forestTeam),'shield',upgrade(20,30));break;
      case '길잡이 드루이드':if(spirit>=6)grant(chosen('receive:grove',grove),'shield',upgrade(15,25));break;
      case '발자국 수호대':if(spirit>=6&&t.p.army.length>=4)grant(t,'healthPct',upgrade(5,10));break;
      case '들숲의 어미':if(spirit>=6&&forestTeam)grow(other(party,forestTeam),pick('grove'),'healthPct',10);break;
      case '수확왕':if(spirit>=6)grant(chosen('receive:grove',grove),'attackPct',upgrade(10,15));break;
      case '과수원지기':if(spirit>=3)grant(t,'shield',upgrade(25,35));break;
      case '숲길지기':grant(forestTeam,'attackPct',upgrade(10,15));break;
      case '그늘 묘목지기':grant(forestTeam,'shield',upgrade(20,30));break;
      case '짐표 배달원':if(spend>=3)grant(recent,'atk',upgrade(15,25));break;
      case '길목 짐수레':if(spend>=3)grow(t,'guild-1a','hp',15);break;
      case '황동 호각수':grant(neighbor(made.reward),'shield',upgrade(15,25));break;
      case '야전 약상인':if(spend>=6)grant(made.reward,'healthPct',upgrade(5,10));break;
      case '환전 금고지기':if(spend>=6)grant(t,'attackPct',upgrade(5,10));break;
      case '전속상회 대표':if(spend>=6)grant(made.reward,'attackPct',upgrade(10,15));break;
      case '만국시장 경매사':if(spend>=6)for(const a of party.filter((v,i)=>party.findIndex(k=>v.card.company===k.card.company)===i).slice(0,3))grant(a,'atk',upgrade(15,25));break;
      case '중개인':if(spend>=3)grant(t,'healthPct',upgrade(10,15));break;
      case '교역상':if(spend>=6)grow(party.find(a=>a.p.army.length<30),'guild-1a','shield',20);break;
      case '창고 감정사':if(spend>=3)grant(recent,'shield',upgrade(25,35));break;
      case '군마 감정사':if(spend>=6)grant(t,'shield',upgrade(20,30));break;
      case '고철 대장장이':if(t.p.golden)grant(forged,'shield',15);break;
      case '폐철 수거반':if(lvl(t)>=3)grant(forged,'shield',upgrade(15,25));break;
      case '화덕 앞치마단':if(lvl(t)>=3)grant(t,'hp',upgrade(15,25));break;
      case '숫돌 수리공':if(lvl(t)>=3&&forged===t)grant(t,'attackPct',upgrade(5,10));break;
      case '혁대 정비반':if(lvl(t)>=3)grant(other(forge),'hp',upgrade(15,25));break;
      case '철편 조립소':if(lvl(t)>=4)grow(t,'forge-1a','shield',15);break;
      case '잉걸 엄호대':if(lvl(t)>=4)grant(forge.find(a=>nearby(t,a)),'atk',upgrade(15,25));break;
      case '모루 기술자':if(lvl(t)>=4)grant(forge.find(a=>lvl(a)<lvl(t)),'healthPct',upgrade(5,10));break;
      case '모루의 결투장인':if(lvl(t)>=6)grant(t,'attackPct',upgrade(10,15));break;
      case '병기창 총감':if(lvl(t)>=5)for(const a of forge.filter(a=>lvl(a)>=5))grant(a,'atk',upgrade(25,35));break;
      case '명장':if(lvl(t)>=5)grant(t,'healthPct',upgrade(10,15));break;
      case '양산공':if(lvl(t)>=5)grow(forge.find(a=>a.p.army.length<30),'forge-1a','healthPct',10);break;
      case '금형 보관인':if(lvl(t)>=5)grant(forged,'atk',upgrade(25,35));break;
      case '돌어깨 전사':if(pick('horde')==='horde-1a')grant(made.horde,'shield',n);break;
      case '전투 북잡이':if(pick('horde')==='horde-1b')grant(made.horde,'atk',n);break;
      case '깨진뿔 전열대':if(pick('horde')==='horde-2b')grant(made.horde,'atk',n);break;
      case '전열 붕대꾼':grant(made.horde,'hp',upgrade(15,25));break;
      case '전열 나팔수':grant(neighbor(made.horde),'shield',n);break;
      case '진형 선도병':if(top.length>1)grant(made.horde,'healthPct',upgrade(5,10));break;
      case '붉은갈기 북지기':if(pick('horde')==='horde-3a')grant(made.horde,'shield',upgrade(15,25));break;
      case '붉은뿔 징수대':if(state.ledger?.upgraded&&!state.ledger?.hires)grant(made.horde,'atk',n);break;
      case '바위 북대':if(summon&&!made.horde)grant(top[0],'shield',upgrade(20,30));break;
      case '메아리 파수꾼':if(made.horde&&made.horde.card.company!=='horde')grant(t,'attackPct',upgrade(5,10));break;
      case '붉은모래 챔피언':if(t.p.golden)grant(made.horde,'attackPct',10);break;
      case '뿔고리 대사범':if(made.horde)grant(made.horde,'shield',upgrade(25,35));else if(summon)grant(top[0],'attackPct',upgrade(10,15));break;
      case '도전자 모집꾼':if(t.p.golden&&state.ledger?.sold)grant(made.horde,'shield',20);break;
      case '상처 교관':grant(made.horde,'hp',upgrade(20,30));break;
      case '갈대 매복조':if(t.p.essence>=2)grant(t,'attackPct',upgrade(5,10));break;
      case '덫줄 정찰조':if(t.p.essence>=2)grant(fang.find(a=>t!==a&&a.p.essence>=1),'atk',upgrade(15,25));break;
      case '자갈길 척후대':if(t.p.essence>=1)grant(other(fang),'hp',n);break;
      case '핏자국 관측병':if(t.p.essence>=2&&t.p.lastEssence)grant(t,'healthPct',upgrade(5,10));break;
      case '고갯길 사냥조':if(t.p.essence>=3)grow(t,'fang-1b','atk',15);break;
      case '뼈장식 신호수':if(t.p.essence>=2)grant(fang.find(a=>nearby(t,a)),'shield',upgrade(15,25));break;
      case '비탈길 덮치기대':if(t.p.essence>=3)for(const a of fang.filter(a=>a.p.essence>=1).slice(0,2))grant(a,'atk',upgrade(10,15));break;
      case '갈고리 길잡이':if(t.p.essence>=3)grant(fang.find(a=>a!==t&&a.p.essence>=1),'healthPct',upgrade(5,10));break;
      case '고개돌이 대장':if(t.p.essence>=3)grant(t,'attackPct',upgrade(10,15));break;
      case '갈기 무리왕':if(t.p.essence>=2)for(const a of fang.filter(a=>a.p.essence>=2))grant(a,'atk',upgrade(30,40));break;
      case '여울 선봉대':if(t.p.essence>=2)grant(t,'shield',upgrade(25,35));break;
      case '무리어미':if(t.p.essence>=3)grow(t,'fang-1a','healthPct',10);break;
    }
  }
  for(let n=0;n<wave.grant;n++){
    const t=party.reduce((best,t)=>!best||t.p.army.length<best.p.army.length?t:best,null);
    if(!t||t.p.army.length===30)break;
    t.p.reserveIndex??=t.i%2;
    fill(t,t.card.reserves[t.p.reserveIndex],1); t.p.reserveIndex^=1;
  }
  function abilities(slot){
    const t=party.find(t=>t.i===slot); if(!t)return [];
    const choices=[];
    const add=(kind,label)=>choices.push({kind,label,active:order(kind)?.source===t.p.key});
    if(t.card.company==='steel')add('wagon','이 팀의 수레 교체');
    if(t.card.company==='dusk')add('fire','이 팀의 봉화 점화');
    if(t.card.company==='forge'){add('rank:forge','이 팀 단조');if(state.ledger?.extraForge)add('rank:extraForge','추가 단조');}
    if(t.card.company==='horde'&&t.card.tier===5)add('rank:horde','판정 등급 올리기');
    if(t.card.captain)add('receive:captain','대장 전용 증원 우선 수신');
    for(const kind of t.card.company==='steel'?['camp','wall']:[t.card.company]){
      if(!pools[kind])continue;
      const ids=pools[kind].filter(id=>Number(id.split('-')[1][0])<=Math.ceil(state.level/2));
      if(ids.length>1)choices.push({kind:'unit:'+kind,label:'생산 병종 · '+({camp:'병영',wall:'방벽'}[kind]??t.card.companyLabel),
        choices:ids.map(id=>({value:id,label:cards.unitNames?.get(id)??id})),selected:pick(kind),active:!!order('unit:'+kind)});
    }
    for(const id of ['steel','dusk','grove','guild','forge','horde','fang']){
      if(group(id).length && (id===t.card.company || ['horde','grove','guild'].includes(id)))
        add('receive:'+id,`${group(id)[0].card.companyLabel} 증원 우선 수신`);
    }
    return choices;
  }
  return {deck,spirit,gold:state.gold,applied:orders,abilities,
    bySlot:i=>deck[i],status:i=>{
      const t=party.find(t=>t.i===i);
      return t?`출정 ${t.p.army.length}/30명 · 판정 ${lvl(t)} · 공격·치유 +${t.atk}% · 보호막 ${t.shield}%`:'';
    }, teams:party.map(t=>({slot:t.i,id:t.p.id,members:t.p.army,
      attackPct:t.atk+(t.p.attackPct??0),healthPct:t.hp+(t.p.healthPct??0),shieldPct:t.shield,
      clinic:t.clinic,speed:t.speed,flank:t.flank,partner:t.partner,bellStart:t.bellStart,bellEnd:t.bellEnd,bellPct:t.bellPct})) };
}
