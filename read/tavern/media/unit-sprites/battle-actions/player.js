import { drawCues, cueLength } from './fx-runtime.js';
const attackForms = await fetch('attack-forms.json').then(r => r.json()).catch(() => ({}));
const byId = id => document.getElementById(id);
const canvas = byId('arena'), ctx = canvas.getContext('2d');
const groups = byId('group'), select = byId('unit'), phase = byId('phase'), branch = byId('branch');
const images = new Map();
function texture(src) {
  if(!images.has(src)){const img=new Image();img.src=src;images.set(src,img);}
  return images.get(src);
}
const battlefield=texture('../../battle-maps/v12/grid/r01.png');
const rift=texture('../../battle-maps/v12/grid/r15.png');
const labels={idle:'대기',walk:'이동',attack:'기본 행동',hit:'피격',transform:'변신',death:'격파'};
let unit, form, action, skillIndex, spec, cues, elapsed=0, release=400, period=1800, paused=false, last=null;
function options(el,items){el.replaceChildren(...items.map(([v,n])=>new Option(n,v)));}
options(groups,[...new Set(battleLibrary.map(u=>u.group))].map(g=>[g,g]));
function roster(){options(select,battleLibrary.filter(u=>u.group===groups.value).map(u=>[u.id,u.name]));}
function reset(){elapsed=0;last=null;}
function pick(id, index=0, ph=0){
  unit=battleLibrary.find(u=>u.id===id)||battleLibrary[0];
  groups.value=unit.group;roster();select.value=unit.id;
  phase.value=String(Math.min(ph,unit.forms.length-1));form=unit.forms[Number(phase.value)]||unit.forms[0];
  byId('phase-label').hidden=unit.forms.length<2;byId('sheet').href=form.sheet;
  texture(form.sheet);const choices=[['idle','대기'],['walk','이동'],['attack',unit.role==='지원'?'기본 치유':'기본 공격'],
    ...unit.skills.map((s,i)=>['s'+i,s.name]),['hit','피격'],...Object.keys(form.states).filter(n=>!['idle','walk','attack','skill','hit'].includes(n)).map(n=>[n,labels[n]||n])];
  byId('actions').replaceChildren(...choices.map(([key,name])=>{const button=document.createElement('button');button.textContent=name;button.dataset.key=key;button.onclick=()=>choose(key);return button;}));
  choose('s'+(unit.skills[index]?index:0));
}
function choose(key){
  skillIndex=/^s\d+$/.test(key)?Number(key.slice(1)):-1;
  spec=unit.skills[skillIndex];action=spec?spec.motion:key;
  options(branch,spec?.alternative?[['0','기본 조건'],['1',spec.alternative.label]]:[['0','기본 조건']]);byId('branch-label').hidden=!spec?.alternative;
  byId('title').textContent=unit.name+' · '+(spec?.name||labels[action]);
  byId('rule').textContent=spec?spec.trigger+' · '+spec.effect:'';
  byId('variant').textContent=phase.value==='1'&&spec?.awakened?spec.awakened:'';
  byId('legend').textContent='점선은 위험 범위, 발밑의 밝은 테는 시전자, 청색과 황토색 테는 양 진영을 표시한다.';
  for(const b of byId('actions').children)b.setAttribute('aria-pressed',String(b.dataset.key===key));
  const a=byId('fxsheet');a.hidden=!spec;
  refresh();history.replaceState(null,'','#'+[unit.id,key,phase.value].join('/'));
}
function refresh(){
  cues=spec?(branch.value==='1'?spec.alternative.cues:phase.value==='1'&&spec.phase2Cues?spec.phase2Cues:spec.cues):[];
  if(!spec&&action==='attack'){
    // basic attack: attack-forms.json (qa/build-attack-forms.mjs) gives each unit its cast and its hit
    const f=attackForms[unit.id]||{cast:unit.role==='지원'?'mend':unit.role==='사격'?'shot':'thrust',melee:unit.role!=='사격'&&unit.role!=='지원',hit:unit.role==='지원'?'heal':'hit'};
    const dest=f.cast==='mend'?'a':'x', blowAt=f.melee?90:200;
    cues=[[0,f.cast,'hand',dest,f.cast==='sweep'||f.cast==='slam'?260:200]];if(f.hit)cues.push([blowAt,f.hit,dest,dest,f.hit==='heal'?420:260]);
  }
  if(spec)byId('fxsheet').href='effects/'+unit.id+'-'+(skillIndex+1)+(phase.value==='1'?'-p2':'')+(branch.value==='1'?'-alt':'')+'.png';
  release=Math.max(form.states[action][2]*2,...cues.map(e=>-e[0]));period=Math.max(1320,release+Math.max(380,...cues.map(e=>e[0]+cueLength(e,spec?.profile)))+460);
  if(['idle','walk'].includes(action))period=form.states[action][1]*form.states[action][2];
  if(action==='transform'||action==='death'){
    const [,frames,dt]=form.states[action];period=frames*dt+650;
  }
  reset();
}
const alphaSide=battleLibrary.find(u=>u.id==='edda-3'), voidSide=battleLibrary.find(u=>u.id==='rift-tick');
function poseIndex(t){
  const [row,frames,dt]=form.states[action];
  if(action==='idle'||action==='walk')return [action,Math.floor(t/dt)%frames];
  if(action==='transform'||action==='death')return [action,Math.min(frames-1,Math.floor(t/dt))];
  const activeTime=t-release+dt*2;
  if(activeTime<0)return [action,1];
  if(activeTime>=frames*dt)return ['idle',Math.floor((activeTime-frames*dt)/200)%form.states.idle[1]];
  return [action,Math.floor(activeTime/dt)];
}
function geometry(f,state,frame){
  const [row]=f.states[state];let offset=0;
  for(const [r,count] of Object.values(f.states).sort((a,b)=>a[0]-b[0])){if(r===row)break;offset+=count;}
  return {row,box:f.boxes[offset+frame],anchor:f.anchors[offset+frame]};
}
function body(context,f,state,frame,pos,scale,flip=false){
  const img=texture(f.sheet),[x,y]=pos,cs=f.cell,[row]=f.states[state];
  if(!img.naturalWidth)return;
  context.save();context.translate(Math.round(x),Math.round(y));context.scale(flip?-scale:scale,scale);
  context.drawImage(img,frame*cs,row*cs,cs,cs,-cs/2,-f.foot,cs,cs);context.restore();
}
function scene(t,context=ctx,onlyFx=false){
  const boss=form.cell>160, scale=boss?.74:1, dir=unit.enemy?-1:1;
  const current=t%period,age=current-release;
  let [state,frame]=poseIndex(current);const actor=unit.enemy?282:108, y=128;
  const melee=!spec&&action==='attack'?(attackForms[unit.id]?.melee??(unit.role==='돌격'||unit.role==='수비')):['push','thrust','sweep','dash','bind','retaliate','double','vuln'].includes(spec?.profile);
  const near=melee?52:110;
  const positions={me:[actor,y],a:[actor-dir*55,108],b:[actor-dir*30,154],c:[actor+dir*12,74],
    x:[actor+dir*near,128],y:[actor+dir*(near+40),132],z:[actor+dir*(near+16),88]};
  if(action==='walk')positions.me[0]+=dir*(current/period-.5)*22;
  if(melee&&age>-120&&age<280) positions.me[0]+=dir*13*Math.max(0,1-Math.abs(age-45)/220);
  const points={feet:{},heights:{}}, used=new Set(cues.flatMap(e=>[e[2],e[3]]));used.delete('hand');used.add('me');
  function pointFor(name){
    const main=name==='me',ally='abc'.includes(name),other=ally===unit.enemy?voidSide:alphaSide;
    const targetForm=main?form:other.forms[0],sc=main?scale:.74;
    const s=main?state:'idle',fr=main?frame:Math.floor(current/200)%targetForm.states.idle[1];
    const geom=geometry(targetForm,s,fr);const p=positions[name],h=geom.box[3]*sc;
    points.feet[name]=p;points.heights[name]=h;points[name]=[p[0],p[1]-h*.50];
    return {name,f:targetForm,s,fr,p,sc,main};
  }
  const actors=[...used].map(pointFor).sort((a,b)=>a.p[1]-b.p[1]);
  // Projectiles retain the release-frame socket for the entire flight.
  const socket=geometry(form,action,Math.min(2,form.states[action][1]-1)).anchor;
  points.hand=[actor+(socket[0]-form.cell/2)*scale+(melee?dir*11:0),y+(socket[1]-form.foot)*scale];points.heights.hand=12;
  if(!onlyFx){
    context.imageSmoothingEnabled=false;context.fillStyle='#574f39';context.fillRect(0,0,400,180);
    const terrain=unit.forms.length===2?rift:battlefield;
    if(terrain.naturalWidth)context.drawImage(terrain,0,0,400,180);
    context.fillStyle='rgba(39,27,39,.40)';context.fillRect(0,0,400,180);
    for(const o of actors){
      context.strokeStyle=o.main?'#fff2ce':'abc'.includes(o.name)?'#a7dfcd':'#ebaa76';
      context.beginPath();context.ellipse(o.p[0],o.p[1],o.main?13:9,3,0,0,Math.PI*2);context.stroke();
      body(context,o.f,o.s,o.fr,o.p,o.sc);
    }
  }
  if(onlyFx||byId('fx').checked)drawCues(context,cues,age,points,unit,{profile:spec?.profile,scale,onlyFx});
}
function loop(now){if(last!==null&&!paused)elapsed+=Math.min(now-last,100)*(byId('slow').checked?.4:1);last=now;scene(elapsed);requestAnimationFrame(loop);}
groups.onchange=()=>{roster();pick(select.value)};select.onchange=()=>pick(select.value);phase.onchange=()=>pick(unit.id,Math.max(0,skillIndex),Number(phase.value));branch.onchange=refresh;
byId('play').onclick=()=>{paused=!paused;byId('play').textContent=paused?'재생':'일시정지';};
function fromHash(){const [uid,key='s0',phaseId='0']=location.hash.slice(1).split('/');pick(uid||'narin-5',Number(key.slice(1))||0,Number(phaseId)||0);if(!/^s\d+$/.test(key)&&form.states[key])choose(key);}
fromHash();window.addEventListener('hashchange',fromHash);requestAnimationFrame(loop);
// for sheet export and checks: render any moment of the current selection
Object.assign(window,{battleScene:scene,battlePick:pick,battleChoose:choose,battleState:()=>({unit:unit.id,enemy:unit.enemy,action,skillIndex,release,period,cues})});
