import './media/unit-sprites/unit-motion-v10/preview-data.js';
import {catalog} from './combat-vfx-catalog.mjs';
import {attackFlight,drawBasic,drawActive,drawPassive,drawClarity} from './combat-vfx-drawing.mjs';

export async function mountCombatVfx(root,{signal}={}){
const get=id=>root.querySelector('#vfx-'+id);
const canvas=get('canvas'), ctx=canvas.getContext('2d');
const [select,variant,range,play,download]=['unit','variant','time','play','shot'].map(get);
const [effects,crowd,terrain]=['fx','dense','terrain'].map(get);
const [clarity,overlap]=['clarity','overlap'].map(get);
const modes=[...get('mode').querySelectorAll('[data-mode]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=window.tavernUnitMotionV10;
const urls={idle:'media/unit-sprites/roster-v2/png/',motion:'media/unit-sprites/unit-motion-v10/'};
const memory=new Map();
const grounds=new Map();
const params=new URLSearchParams(location.search);
const width=canvas.width, height=canvas.height;
const teamKey='청록 바닥 표식은 아군, 보라는 공허 유닛입니다.';
const help={
  basic:'무기 접촉점 또는 발사구에서 시작해 실제 적중 위치에서 끝납니다.',
  ally:'조건을 충족한 아군', party:'같은 기물의 조건을 충족한 유닛', robot:'같은 기물의 영구 작업 로봇',
  enemy:'조건을 충족한 적', self:'시전자', attacker:'피격을 준 적', friend:'같은 진영의 다른 유닛',
};
const foam={border:['#60684d','#656d51','#596049','#505840','#737354','#69694e'],
  rift:['#423b49','#49404e','#3f3847','#3a3442','#504857','#494252']};
let units,mode='active',actor,spec,scene,art,windup,time=0,finish=0,playing=false,cancelled=false;
let tickId=0,previous=0,serial=0;

function pic(path) {
  if(!memory.has(path)){
    memory.set(path,(async()=>{
      const i=new Image();
      i.crossOrigin='anonymous';
      i.src=new URL(path,document.baseURI).href;
      await i.decode();
      return i;
    })());
  }
  return memory.get(path);
}
function tile(ctx,x,y,w,h,color){
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}
function terrainImage(key){
  if(grounds.has(key))return grounds.get(key);
  const c=document.createElement('canvas');
  c.width=width;c.height=height;
  const g=c.getContext('2d'), colors=foam[key];
  tile(g,0,0,width,height,colors[0]);
  for(let y=0;y<height;y+=3)for(let x=0;x<width;x+=5){
    const noise=Math.sin(x*.074+y*.07)+Math.cos(x*.13-y*.11)+Math.sin(x*.32+y*.24)*.24;
    const edge=Math.abs(y-(155-(x-240)*.18+Math.sin(x*.05)*4));
    if(edge<33+noise*5)tile(g,x,y,5,3,edge<27+noise*4?colors[4]:colors[5]);
    else if(noise>1.12||noise<-.92)tile(g,x,y,5,3,noise>0?colors[1]:colors[2]);
    const seed=((x*157+y*313)^(x*y*23))>>>0;
    if(seed%19===0){
      tile(g,x+seed%5,y,3,1,edge>31?colors[3]:colors[5]);
      tile(g,x+seed%3,y+1,2,1,colors[2]);
    }
    if(seed%109===0&&edge>38){
      const sprout=key==='border' ? 3 : 2;
      tile(g,x,y+2,sprout+2,1,colors[3]);
      tile(g,x+1,y,1,2,colors[3]);
      tile(g,x+3,y-1,1,3,colors[5]);
    }
  }
  grounds.set(key,c);
  return c;
}
function option(label,value){
  const e=document.createElement('option');
  e.textContent=label;e.value=value;
  return e;
}
function available(unit,next){
  return next==='basic' ? unit.basic : next==='passive' ? unit.passives : unit.active ? [unit.active] : [];
}
function roster(next,id){
  mode=next;
  const previousUnit=id??select.value;
  const sets=[['아군',units.filter(u=>!u.isEnemy)],['공허',units.filter(u=>u.isEnemy)]];
  select.replaceChildren(...sets.flatMap(([label,list])=>{
    const eligible=list.filter(u=>available(u,mode).length).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    if(!eligible.length)return [];
    const group=document.createElement('optgroup');
    group.label=label;group.append(...eligible.map(u=>option(u.name,u.id)));
    return [group];
  }));
  if([...select.options].some(o=>o.value===previousUnit))select.value=previousUnit;
  for(const button of modes)button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  pick();
}
function pick(){
  actor=units.find(u=>u.id===select.value);
  const list=available(actor,mode);
  variant.replaceChildren(...list.map((item,i)=>option(mode==='basic' ? item.clip?.label??item.name : item.name,i)));
  get('variants').hidden=list.length<2;
  update();
}
function poseFor(unit,effect){
  if(mode==='basic')return effect.clip;
  if(mode==='active'){
    const key={rake:'paw',oath:'axeSweep',drum:'gongRally'}[effect.art];
    return unit.basic.find(target=>target.clip?.key===key)?.clip ??
      unit.source?.attacks.find(clip=>clip.key==='skill');
  }
  const onHit=effect.to==='enemy'&&/적중|명중/.test(effect.when);
  if(onHit||['reach','charge'].includes(effect.art))return unit.basic[0]?.clip;
  return ['heal','taunt','counter','approach','growth','reduction','shield','revive','split'].includes(effect.art) ?
    unit.source?.attacks.find(clip=>clip.key==='skill') : null;
}
function hitPass(spec){
  return spec.to==='enemy'&&/적중|명중/.test(spec.when)&&['slow','bonus','shatter','weaken'].includes(spec.art);
}
function makeScene(unit,effect,packed,paired){
  const dir=unit.isEnemy ? -1 : 1, x=dir===1?157:323;
  const ground=[x,155];
  const near=mode==='basic'? !effect.flight : mode==='active'? effect.center==='caster'||effect.art==='check'
    : !unit.basic[0].flight;
  const enemyX=x+dir*(near ? 35 : 150);
  const focus=[enemyX,155];
  const friends=[
    {id:unit.isEnemy?'blue-gatekeeper':'shield-deputy',player:!unit.isEnemy,p:[x+dir*57,130],health:7},
    {id:unit.isEnemy?'void-274':'sprout-archer',player:!unit.isEnemy,p:[x-dir*34,183],health:5},
    {id:unit.isEnemy?'shell-carrier':'rivet-bot',player:!unit.isEnemy,p:[x+dir*52,190],health:9},
  ];
  if(effect.recipients==='robot')for(const f of friends)f.id='work-robot';
  const foes=[
    {id:unit.isEnemy?'shield-deputy':'void-274',player:unit.isEnemy,p:focus,health:7},
    {id:unit.isEnemy?'sprout-archer':'rift-tick',player:unit.isEnemy,p:[enemyX+dir*32,129],health:6},
    {id:unit.isEnemy?'rivet-bot':'blue-gatekeeper',player:unit.isEnemy,p:[enemyX+dir*44,188],health:9},
  ];
  if(effect.center==='caster'){
    const reach=effect.radius*21;
    [[.96,0],[-.58,-.43],[.14,.57]].forEach(([dx,dy],i)=>{
      foes[i].p=[ground[0]+dir*reach*dx,ground[1]+reach*dy];
    });
  }
  if(effect.center==='fixed'){
    foes[1].p=[focus[0]+dir*23,focus[1]-12];
    foes[2].p=[focus[0]-dir*17,focus[1]+13];
  }
  if(effect.art==='markpierce')foes[1].p=[focus[0]+dir*18,focus[1]-8];
  const subject={id:unit.id,player:!unit.isEnemy,p:ground,health:8,main:true};
  let targets, visible;
  if(mode==='active'){
    targets=effect.recipients==='enemy'?foes.slice(0,effect.count)
      : effect.recipients==='party'?[subject,friends[0]]:friends.slice(0,effect.count);
    visible=[friends[0],foes[0],...targets];
  }else if(mode==='passive'){
    targets=effect.to==='self'?[subject]:effect.to==='friend'?[friends[0]]:[foes[0]];
    visible=[friends[0],foes[0]];
  }else{
    targets=[foes[0]];
    visible=[foes[0]];
  }
  if(packed){
    visible.push(...friends,...foes,
      {id:'assembly-robot',player:true,p:[100,118],health:8},
      {id:'allies-125',player:true,p:[119,217],health:7},
      {id:'allies-050',player:true,p:[181,231],health:9},
      {id:'void-282',player:false,p:[362,112],health:9},
      {id:'echo-worm',player:false,p:[338,222],health:6},
      {id:'mirror-watcher',player:false,p:[416,206],health:7});
  }
  const offspring=mode==='passive'&&effect.art==='split'
    ? [-1,1].map(sign=>({id:'devourer-split',player:false,p:[x+sign*39,155+sign*23],health:9,offspring:true}))
    : [];
  let opposing=null;
  if(paired){
    const caster=visible.find(u=>u.id===(unit.isEnemy?'assembly-robot':'void-282'));
    caster.id=unit.isEnemy?'allies-050':'warped-turret';
    opposing={caster,target:visible.find(u=>u.id===(unit.isEnemy?'echo-worm':'allies-125'))};
  }
  if(packed) {
    const background = [
      ['shield-deputy','assembly-robot','allies-125','allies-050','sprout-archer'],
      ['void-282','echo-worm','void-274','rift-tick','mirror-watcher'],
    ];
    for(let side=0;side<2;side++)for(let i=0;i<50;i++){
      const row=Math.floor(i/10), col=i%10, sign=side===0?-1:1;
      const x=240+sign*(13+col*15)+(row%2)*7;
      const y=72+row*31+((col*13)%17)-7;
      visible.push({id:background[side][(i+row)%5],player:side===0,p:[x,y],background:true});
    }
  }
  return {ground,dir,targets,foe:foes[0],
    center:effect.center==='caster'?ground:focus,offspring,opposing,
    actors:[...new Set([subject,...visible,...offspring])].sort((a,b)=>a.p[1]-b.p[1])};
}
function poseAt(clip,age){
  if(!clip)return 0;
  let t=age+clip.durations.slice(0,clip.eventFrame).reduce((a,b)=>a+b,0);
  for(const [i,len] of clip.durations.entries()){
    if(t<len)return i;
    t-=len;
  }
  return clip.durations.length-1;
}
function stagePoint(point,ground){
  return [ground[0]+scene.dir*(point[0]-motion.frame.anchor[0]),ground[1]+point[1]-motion.frame.anchor[1]];
}
function targetTime() {
  const basic=mode==='basic'?spec:actor.basic[0];
  const launch=mode==='basic'?windup:windup-attackFlight(basic.art);
  return {basic,launch};
}
function healthY([,y],id){
  return y-(id==='the-devourer'?53:45);
}
function applyOtherStrike(ctx,opposing,age,dense,showClarity){
  const {caster,target}=opposing;
  const [x,y]=caster.p, dir=caster.player?1:-1;
  const from=[x+dir*13,y-20];
  const spec={art:'shot'};
  const sample={spec,from,ground:caster.p,dir,targets:[target.p],age,dense,isEnemy:!caster.player,
    sourceCue:[x,healthY(caster.p,caster.id)-9],flight:attackFlight(spec.art)};
  drawBasic(ctx,sample);
  if(showClarity)drawClarity(ctx,sample,'basic','air');
}
function phaseName(){
  if(cancelled)return '중단';
  if(time<windup)return mode==='passive'?'발동 대기':'준비';
  const age=time-windup;
  if(mode==='basic'){
    if(age<attackFlight(spec.art))return '비행';
    return age<attackFlight(spec.art)+250?'적중':'복귀';
  }
  if(age<185)return '발동';
  if(age<(spec.hold??(mode==='passive'?850:650)))return '잔류';
  return '종료';
}
function paint(){
  if(!scene)return;
  const age=time-windup, dense=crowd.checked;
  const showClarity=effects.checked&&clarity.checked;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(terrainImage(terrain.value),0,0);
  const {basic,launch}=targetTime();
  const poseAge=mode==='passive'&&hitPass(spec)?time-launch:age;
  const frame=cancelled ? 0 : poseAt(art,poseAge);
  const {ground,dir}=scene;
  const from=art?.tip ? stagePoint(art.tip[art.eventFrame],ground)
    : [ground[0]+dir*(actor.isEnemy?12:10),ground[1]-19];
  let cueFrom=art?.tip&&age<0?stagePoint(art.tip[frame],ground):from;
  if(mode==='active'&&spec.art==='circuit')cueFrom=[ground[0],ground[1]-2];
  if(mode==='active'&&spec.art==='stomp')cueFrom=[ground[0]+dir*5,ground[1]-1];
  const targets=scene.targets.map(u=>u.p);
  const sample={spec,ground,from,dir,targets,age,dense,cancelled,isEnemy:actor.isEnemy,
    cueFrom,
    sourceCue:[ground[0],healthY(ground,actor.id)-9],offspring:scene.offspring.map(u=>u.p),
    radius:Math.round((spec.radius??0)*21),center:scene.center,shieldLoss:spec.art==='discharge' ? targets.slice(0,1) : []};
  const visible=scene.actors.filter(u=>{
    if(u.offspring)return age>=235;
    if(mode==='passive'&&u.main&&age>=0){
      if(spec.art==='split')return false;
      if(spec.art==='revive'&&age<355)return false;
    }
    return true;
  });
  if(effects.checked&&mode==='active')drawActive(ctx,sample,'floor');
  if(showClarity&&mode==='active')drawClarity(ctx,sample,'active','floor');
  for(const u of visible){
    const [x,y]=u.p;
    if(u.background){
      const step=Math.round(Math.sin((x+y+time/3)/11));
      ctx.save();
      ctx.globalAlpha=.59;
      ctx.translate(x+step,y);
      ctx.scale(u.player?-.48:.48,.48);
      ctx.drawImage(u.image,-32,-60);
      ctx.restore();
      continue;
    }
    tile(ctx,x-11,y-1,22,4,terrain.value==='border'?'#48543f':'#312c3a');
    tile(ctx,x-6,y+1,12,2,u.player?'#76a69a':'#a484a4');
    tile(ctx,x-3,y,6,4,u.player?'#76a69a':'#a484a4');
    ctx.save();
    ctx.translate(x,y);
    if(u.main&&art&&u.animated){
      const {width:size,height:h,anchor}=motion.frame;
      if(!u.player)ctx.scale(-1,1);
      ctx.drawImage(u.animated,frame*size,art.row*h,size,h,-anchor[0],-anchor[1],size,h);
    }else{
      if(u.player)ctx.scale(-1,1);
      ctx.drawImage(u.image,-32,-60);
    }
    ctx.restore();
  }
  if(effects.checked&&scene.opposing)applyOtherStrike(ctx,scene.opposing,age+22,dense,showClarity);
  if(effects.checked&&!cancelled){
    if(mode==='active')drawActive(ctx,sample,'air');
    if(mode==='passive')drawPassive(ctx,sample);
    if(mode==='basic'||mode==='passive'&&hitPass(spec)){
      const weapon=art?.tip ? stagePoint(art.tip[art.eventFrame],ground) : from;
      const trail=art?.tip?.slice(Math.max(0,frame-2),frame+1).map(p=>stagePoint(p,ground));
      const shot={...sample,spec:basic,from:weapon,cueFrom:time<launch?sample.cueFrom:weapon,
        targets:[scene.foe.p],age:time-launch,flight:attackFlight(basic.art),path:trail};
      drawBasic(ctx,shot);
      if(showClarity&&(mode==='basic'||age<0))drawClarity(ctx,shot,'basic','air');
    }
    if(showClarity&&mode!=='basic')drawClarity(ctx,sample,mode,'air');
  }
  for(const u of visible){
    if(u.background)continue;
    const [x]=u.p, top=healthY(u.p,u.id);
    tile(ctx,x-12,top,24,4,'#302a34');
    tile(ctx,x-11,top+1,u.health*2,2,u.player?'#aac5a0':'#ba929f');
    if(u.main)tile(ctx,x-13,top,1,4,'#e1c597');
  }
  range.value=Math.round(time);
  const phase=phaseName();
  get('clock').value=Math.round(time)+'ms · '+phase;
  canvas.setAttribute('aria-label',actor.name+' '+spec.name+' · '+phase);
}
function updateCaption(){
  clarity.disabled=!effects.checked;
  get('caption').textContent=effects.checked&&clarity.checked
    ? '머리 위 쐐기는 시전자, 발밑 모서리는 도착 지점입니다. '+teamKey
    : teamKey;
}
function stop(){
  playing=false;
  cancelAnimationFrame(tickId);
  previous=0;
  play.textContent='재생';
}
function advance(now){
  if(previous)time=Math.min(finish,time+Math.min(64,now-previous));
  previous=now;
  paint();
  if(time>=finish)stop();
  else tickId=requestAnimationFrame(advance);
}
function controls(enabled){
  for(const item of [play,range,get('event'),download,get('cancel')])item.disabled=!enabled;
}
async function update({keepTime=false}={}){
  const id=++serial;
  stop();controls(false);
  scene=null;
  spec=available(actor,mode)[Number(variant.value)||0];
  art=poseFor(actor,spec);
  windup=mode==='active'?spec.windup:mode==='passive'&&hitPass(spec)?350+attackFlight(actor.basic[0].art):350;
  finish=windup+(mode==='active'?Math.max(650,(spec.hold??0)+180)
    :mode==='basic'?attackFlight(spec.art)+580:980);
  if(!keepTime){
    cancelled=false;
    time=windup+(mode==='basic'?Math.min(90,attackFlight(spec.art)/2+32):68);
  }
  range.max=finish;
  get('title').textContent=spec.name;
  get('cue').textContent=spec.cue??help.basic;
  get('trigger').textContent=mode==='active'?spec.windup+'ms 시전 완료':mode==='basic'?(spec.flight?'무기 발사와 명중':'접촉이 확정될 때'):spec.when;
  get('target').textContent=mode==='basic'?help.enemy:help[spec.recipients??spec.to]+(mode==='active'&&spec.count>1?' 최대 '+spec.count+'기':'');
  get('trait').textContent=mode==='passive'?actor.trait:'';
  get('trait').hidden=!get('trait').textContent;
  get('cancel').hidden=mode!=='active';
  overlap.disabled=!crowd.checked;
  const draft=makeScene(actor,spec,crowd.checked,crowd.checked&&overlap.checked);
  try{
    await Promise.all(draft.actors.map(async u=>{
      u.image=await pic(urls.idle+u.id+'.png');
      if(u.main&&art&&actor.source)u.animated=await pic(urls.motion+actor.source.sheet);
    }));
    if(id!==serial||signal?.aborted)return;
    scene=draft;
    get('status').hidden=true;
    controls(true);paint();
  }catch{
    if(id===serial){
      get('status').hidden=false;
      get('status').textContent='선택한 스프라이트를 불러오지 못했습니다.';
    }
  }
}

select.addEventListener('change',pick);
variant.addEventListener('change',()=>update());
for(const b of modes)b.addEventListener('click',()=>roster(b.dataset.mode));
for(const control of [effects,clarity])control.addEventListener('change',()=>{updateCaption();paint();});
terrain.addEventListener('change',paint);
for(const control of [crowd,overlap])control.addEventListener('change',()=>update({keepTime:true}));
range.addEventListener('input',()=>{stop();cancelled=false;time=Number(range.value);paint();});
get('event').addEventListener('click',()=>{stop();cancelled=false;time=windup+30;paint();});
get('cancel').addEventListener('click',()=>{stop();cancelled=true;time=Math.floor(windup*.65);paint();});
play.addEventListener('click',()=>{
  if(playing){stop();return;}
  time=0;cancelled=false;previous=0;playing=true;play.textContent='일시정지';
  tickId=requestAnimationFrame(advance);
});
download.addEventListener('click',()=>{
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download='tavern-'+mode+'-'+actor.id+'-'+Math.round(time)+'.png';
  a.click();
});
reduced.addEventListener('change',e=>{if(e.matches)stop();},{signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal});
signal?.addEventListener('abort',stop,{once:true});
try{
  const [rosterResponse,profileResponse]=await Promise.all([
    fetch(urls.idle+'../manifest.json'),fetch(urls.motion+'battle-vfx-profiles.json'),
  ]);
  if(signal?.aborted)return;
  if(!rosterResponse.ok||!profileResponse.ok)throw new Error('The roster or effect profiles are unavailable.');
  units=catalog(await rosterResponse.json(),motion,await profileResponse.json());
  if(units.length!==308||units.some(unit=>!unit.basic.length))throw new Error('Invalid equipment catalog');
  if(params.get('terrain')==='rift')terrain.value='rift';
  if(params.get('dense')==='1')crowd.checked=true;
  if(params.get('overlap')==='1')overlap.checked=true;
  if(params.get('cues')==='0')clarity.checked=false;
  updateCaption();
  const next=['basic','passive','active'].includes(params.get('mode'))?params.get('mode'):'active';
  get('lab').hidden=false;
  roster(next,params.get('unit')??'allies-050');
}catch{
  get('status').textContent='전투 이펙트 목록을 불러오지 못했습니다.';
}
}

const standaloneLab=document.querySelector('body > .vfx-report');
if(standaloneLab)void mountCombatVfx(standaloneLab);
