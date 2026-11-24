const get=id=>document.getElementById(id);
const factionNames=['숲의 수호자','무쇠 망치단','송곳니의 자손들','황혼 기사단','강철 군단','골드웍스 상단','호드 군단'];
const colors=['#b5db8b','#f0b98c','#e6d59a','#c7b8ff','#9edcde','#ffd578','#ffad9c'];
const factionsById = ['grove','forge','fang','dusk','steel','guild','horde'];
const pieces = [
  '묘목 돌봄이', '황혼 방패병', '폐철 수거반', '절연 케이블반', '길목 짐수레', '장부 견습',
  '철등불 호위대', '리벳 조립반', '이슬막 약초반', '고철 대장장이', '저녁 망토병'
].map(name => {
  const card = hireRoster.cards[name];
  const pair = hireRoster.pairs[card.pair];
  const [first, second] = pair.members;
  const members = first.id === second.id ? first.name+' 2명' : first.name+' · '+second.name;
  return {name, tier:card.tier, faction:factionsById.indexOf(card.faction), pair, members};
});
const stock=[[0,1,2,3],[8,9,10,7],[2,7,0,9]];
const query=new URLSearchParams(location.search);
let state, feedbackTimer;
const image=(src,alt='')=>{const el=document.createElement('img');el.src=src;el.alt=alt;return el};
function crest(faction){const el=image('art/faction-'+faction+'.svg',factionNames[faction]);el.className='crest';return el}
function troop(piece) {
  const group = document.createElement('div');
  group.className = 'troop';
  const art = image('../../unit-sprites/graded-roster/'+piece.pair.image, piece.members);
  art.className = 'pair';
  group.append(art);
  return group;
}
function say(message){get('feedback').textContent=message;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>get('feedback').textContent='',2300)}
function reset(){
  state={open:query.get('shop')==='open',gold:12,lv:2,roll:0,sold:[],deck:[4,5,null,6,7,null],captainUsed:false};
  get('detail').hidden=true;say('');render();
}
function render(){
  get('intel').hidden=state.open;get('shop').hidden=!state.open;get('reroll').hidden=!state.open;get('deploy').hidden=state.open;
  get('gold').setAttribute('aria-expanded',String(state.open));get('balance').textContent=state.gold;get('lv').textContent='Lv. '+state.lv;get('levelCost').textContent=state.lv===2?6:8;
  get('level').disabled=state.lv>=3||state.gold<6;get('captain').disabled=state.captainUsed;get('reroll').disabled=state.gold<1;
  get('deck').replaceChildren(...state.deck.map((id,i)=>{
    const slot=document.createElement(id===null?'div':'button');slot.className='slot';
    if(id===null){slot.classList.add('empty');slot.setAttribute('aria-label',(i+1)+'번 빈 칸');return slot}
    const piece=pieces[id],tag=document.createElement('div');tag.className='tag';tag.style.setProperty('--tint',colors[piece.faction]);
    const num=document.createElement('b');num.textContent=i+1;tag.append(num,crest(piece.faction),piece.name);slot.append(troop(piece),tag);
    slot.type='button';slot.title=piece.members;slot.setAttribute('aria-label',piece.name+' 소속 병사 · '+piece.members);
    slot.onclick=()=>detail(piece.name,'기본 편성 · '+piece.members);return slot;
  }));
  const stockStatus = get('stock-status');
  if (stockStatus) {
    const remaining = stock[state.roll % stock.length].length - state.sold.length;
    let status = '고용 대기 ' + remaining + '팀';
    if (!state.deck.includes(null)) status += ' · 대기장 만석';
    else if (state.gold < 3 && remaining > 0) status += ' · 골드 부족';
    if (stockStatus.textContent !== status) stockStatus.textContent = status;
  }
  get('offers').replaceChildren(...stock[state.roll%stock.length].map((id,i)=>{
    const piece=pieces[id],card=document.createElement('button');card.className='offer';card.style.setProperty('--tint',colors[piece.faction]);
    const family=document.createElement('span');family.className='family';family.append(crest(piece.faction),factionNames[piece.faction]);
    const name=document.createElement('strong');name.textContent=piece.name;const cost=document.createElement('span');cost.className='price';
    const coin=document.createElement('i');coin.className='coin';cost.append(piece.tier+'단계',coin,'3');
    if(state.sold.includes(i)){cost.textContent='고용 완료';card.classList.add('sold')}
    card.disabled=state.sold.includes(i)||state.gold<3||!state.deck.includes(null);card.setAttribute('aria-label',piece.name+' '+piece.tier+'단계 3골드 고용 · '+piece.members);
    card.title=piece.members;
    const members=document.createElement('small');members.className='member-names';members.textContent=piece.members;
    card.append(troop(piece),family,name,members,cost);card.onclick=()=>{if(hire(id)){state.sold.push(i);render()}};return card;
  }));
}
function hire(id){
  const slot=state.deck.indexOf(null);if(slot<0||state.gold<3)return false;
  state.gold-=3;state.deck[slot]=id;say((slot+1)+'번 칸에 '+pieces[id].name+' 고용');return true;
}
function toggleShop(open){
  get('detail').hidden=true;state.open=open;render();
  const target=open&&get('offers').querySelector('button:enabled');
  (target||get('gold')).focus({preventScroll:true});
}
function detail(title,description,items=[]){
  get('heading').textContent=title;get('description').textContent=description;get('detail').hidden=false;
  get('choices').replaceChildren(...items.map(([text,onClick,disabled])=>{const b=document.createElement('button');b.textContent=text;b.onclick=onClick;b.disabled=Boolean(disabled);return b}));get('dismiss').focus({preventScroll:true});
}
get('gold').onclick=()=>toggleShop(!state.open);
get('reset').onclick=reset;get('dismiss').onclick=()=>get('detail').hidden=true;
get('reroll').onclick=()=>{if(state.gold<1)return;state.gold--;state.roll++;state.sold=[];render();say('용병 후보 교체 · 1골드 사용')};
get('level').onclick=()=>detail('선술집 레벨업','6골드로 선술집을 3레벨로 올려 3등급 기물을 해금합니다.',[['레벨업',()=>{state.gold-=6;state.lv=3;render();get('detail').hidden=true;say('선술집 3레벨')}]]);
get('captain').onclick=()=>detail('로언 · 공개 징집','두 후보 중 한 팀을 3골드에 고용합니다.',[9,10].map(id=>[pieces[id].name,()=>{if(hire(id)){state.captainUsed=true;get('detail').hidden=true;render()}},state.gold<3||!state.deck.includes(null)]));
get('deploy').onclick=()=>detail('4라운드 출전','다음 적은 빈껍질 집전관입니다. 현재 편성은 '+state.deck.filter(id=>id!==null).length+'팀입니다.');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!get('detail').hidden)get('detail').hidden=true;else if(state.open)toggleShop(false)}});
function resize(){
  const frame=document.querySelector('.viewport'),narrow=frame.clientWidth<550;
  get('yard').classList.toggle('portrait',narrow);const scale=frame.clientWidth/(narrow?430:960);
  frame.style.height=((narrow?700:444)*scale)+'px';get('yard').style.transform='scale('+scale+')';
}
new ResizeObserver(resize).observe(document.querySelector('main'));resize();reset();
