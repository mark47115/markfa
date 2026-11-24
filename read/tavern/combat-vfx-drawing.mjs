const palettes = {
  metal:['#45333d','#bb8251','#ffcb78','#fff3c8'],
  bone:['#493446','#a8697c','#e6ab9b','#fff0d4'],
  leaf:['#314135','#6b9d50','#b4df75','#f0ffd2'],
  teal:['#28454b','#498d82','#84ddba','#d9fff0'],
  coil:['#283e55','#4c8fb0','#8ee0ef','#e4ffff'],
  ember:['#592f3c','#b34f43','#ff9b54','#fff0ad'],
  void:['#302436','#664361','#92d9cd','#d7fff2'],
};
const red=['#552e39','#a94e47','#f77d63','#ffd0a0'];
const cueInk='#302a34';
const passiveThemes={slow:'bone',bonus:'metal',reduction:'metal',heal:'leaf',shield:'teal',counter:'bone',
  shatter:'teal',haste:'leaf',reach:'metal',charge:'metal',taunt:'void',revive:'void',growth:'void',
  split:'void',approach:'void',weaken:'void'};
const meleeTypes=new Set(['arc','thrust','bash','jab','claw','slam','bite']);
const nowColor=(colors,age)=> colors[age<58 ? 3 : age<152 ? 2 : 1];
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const cap=t=>Math.min(1,Math.max(0,t));
const around=([x,y],dx=0,dy=0)=>[x+dx,y+dy];

function dot(ctx,[x,y],color,w=1,h=1) {
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}

function stroke(ctx,a,b,color,{gap=1,size=1}={}) {
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))/gap));
  for (let i=0;i<=n;i++) dot(ctx,mix(a,b,i/n),color,size,1);
}

function rim(ctx,p,r,flat,color,{skip=0,start=0,end=2*Math.PI,size=1,height=1}={}) {
  const n=Math.max(8,Math.ceil((end-start)*r*.72));
  for(let i=0;i<=n;i++) {
    if(skip&&i%skip>skip-3)continue;
    const a=start+(end-start)*i/n;
    dot(ctx,around(p,Math.cos(a)*r,Math.sin(a)*r*flat),color,size,height);
  }
}

function slash(ctx,points,colors,dir=1) {
  for(let i=1;i<points.length;i++){
    const a=points[i-1], b=points[i];
    stroke(ctx,around(a,-dir,1),around(b,-dir,1),colors[0],{size:6});
    stroke(ctx,a,b,colors[1],{size:5});
    stroke(ctx,around(a,dir,-1),around(b,dir,-1),colors[2],{size:4});
    stroke(ctx,around(a,dir*2,-2),around(b,dir*2,-2),colors[3],{gap:i>1?2:3,size:2});
  }
}

function dust(ctx,p,age,colors,dir,dense=false,power=1) {
  if(age<0||age>=250)return;
  const vectors=[[8,-6],[12,-2],[6,5],[-6,-4],[-8,3],[3,-10],[-3,7],[10,-6]];
  const t=age/180;
  for(const [i,[vx,vy]] of vectors.entries()) {
    if(dense&&i>=3)break;
    const at=around(p,dir*vx*(.48+t)*power,vy*(.48+t)*power+5*t*t);
    const size=age<95&&i<4 ? 2 : 1;
    dot(ctx,around(at,-1,-1),colors[0],size+2,size+2);
    dot(ctx,at,nowColor(colors,age+i*9),size+Number(i===1),size);
  }
  if(age<76) {
    const r=Math.round(4*power+age/25);
    dot(ctx,around(p,-r-1,-2),colors[0],r*2+3,5);
    dot(ctx,around(p,-2,-r-1),colors[0],5,r*2+3);
    dot(ctx,around(p,-r,-1),colors[2],r*2+1,3);
    dot(ctx,around(p,-1,-r),colors[2],3,r*2+1);
    dot(ctx,around(p,-1,-1),colors[3],3,3);
  }
}

function wave(ctx,origin,end,age,colors,dense) {
  if(age<0||age>=215)return;
  const dir=end[0]>=origin[0] ? 1 : -1;
  for(let i=0;i<(dense ? 2 : 3);i++){
    const t=(age-i*23)/146;
    if(t<0||t>1.18)continue;
    const p=mix(origin,end,cap(t));
    const r=4+Math.round(t*13);
    const arc={start:dir===1 ? -1.2 : 1.9,end:dir===1 ? 1.2 : 4.4,skip:5};
    rim(ctx,p,r,1.32,colors[0],{...arc,size:4,height:3});
    rim(ctx,p,r,1.32,colors[i===0 ? 3 : 2],{
      ...arc,size:3,height:2,
    });
  }
}

function guard(ctx,where,colors,side=0,age=0) {
  const [x,y]=where;
  for(const dir of side ? [side] : [-1,1]) {
    const p=[x+dir*14,y-25], edge=[x+dir*20,y-16], foot=[x+dir*16,y-6];
    for (const [a,b] of [[p,edge],[edge,foot]]) {
      stroke(ctx,around(a,-dir,1),around(b,-dir,1),colors[0],{size:6});
      stroke(ctx,a,b,colors[1],{size:4});
      stroke(ctx,around(a,dir,-1),around(b,dir,-1),age<110?colors[3]:colors[2],{size:3});
    }
  }
}

function glyph(ctx,p,kind,age,colors,dir=1) {
  const c=nowColor(colors,age);
  switch(kind){
    case 'up':
    case 'down': {
      const dy=kind==='up' ? -1 : 1;
      const peak=around(p,0,5*dy);
      for(const side of [-1,1]){
        const wing=around(p,side*6);
        stroke(ctx,around(peak,-1,1),around(wing,-1,1),colors[0],{size:5});
        stroke(ctx,peak,wing,c,{size:3});
      }
      break;
    }
    case 'chevron':
      for(const side of [-1,1]){
        const wing=around(p,-6*dir,side*4);
        stroke(ctx,around(wing,-1,1),around(p,-1,1),colors[0],{size:5});
        stroke(ctx,wing,p,c,{size:3});
      }
      break;
    case 'plus':
      dot(ctx,around(p,-4,-2),colors[0],9,5);
      dot(ctx,around(p,-2,-4),colors[0],5,9);
      dot(ctx,around(p,-3,-1),c,7,3);
      dot(ctx,around(p,-1,-3),c,3,7);
      break;
    case 'pin':
      dot(ctx,around(p,-4,-3),colors[0],9,7);
      dot(ctx,around(p,-3,-2),c,7,5);
      dot(ctx,around(p,-1,0),colors[0],3,1);
      break;
    case 'leaf':
      stroke(ctx,around(p,-3,3),around(p,3,-3),colors[0],{size:4});
      stroke(ctx,around(p,-2,2),around(p,2,-2),colors[1],{size:3});
      dot(ctx,around(p,-1,-2),c,5,3);
      dot(ctx,around(p,1,-3),colors[3],2,2);
      break;
    default:
      dot(ctx,around(p,-1,-1),c,3,2);
      dot(ctx,around(p,0,1),colors[1],1,2);
  }
}

function canopy(ctx,ground,colors,age) {
  for(const sign of [-1,1]){
    const stem=around(ground,sign*16,-12);
    stroke(ctx,stem,around(stem,sign*3,-10),colors[1],{size:2});
    glyph(ctx,around(stem,sign*3,-10),'leaf',age,colors,sign);
    stroke(ctx,around(stem,sign*3,-10),around(stem,sign*-2,-15),colors[2],{gap:2,size:2});
  }
}

function bolt(ctx,a,b,colors,age=0) {
  const m=mix(a,b,.35), n=mix(a,b,.68);
  const jog=age<95 ? -5 : -2;
  const points=[a,around(m,1,jog),around(m,6,3),around(n,-2,4),b];
  for(let i=1;i<points.length;i++){
    stroke(ctx,around(points[i-1],-1,1),around(points[i],-1,1),colors[0],{size:5});
    stroke(ctx,points[i-1],points[i],colors[1],{size:4});
    stroke(ctx,around(points[i-1],1,-1),around(points[i],1,-1),nowColor(colors,age),{size:2});
  }
}

function danger(ctx,center,radius,progress){
  const color=progress>.74?red[2]:red[1];
  for(let dy=-radius;dy<=radius;dy+=2)for(let dx=-radius;dx<=radius;dx+=2){
    if(dx*dx+(dy/.62)**2>radius*radius)continue;
    if((dx-dy+radius)%14===0)dot(ctx,around(center,dx,dy),red[0],2,1);
  }
  rim(ctx,center,radius,.62,red[0],{skip:8,size:5,height:3});
  rim(ctx,center,radius,.62,color,{skip:8,size:3,height:2});
  rim(ctx,center,radius*(.45+progress*.55),.62,red[3],{
    start:-Math.PI*.9,end:-Math.PI*.9+2*Math.PI*cap(progress),skip:6,size:2,height:2,
  });
}

export function attackFlight(art){
  return ({arrow:180,bolt:145,javelin:200,stone:245,shot:95,mote:185,seed:200,electric:110,smoke:170,
    dart:140,beam:70,sonic:150})[art]??0;
}

function basicColors(spec,isEnemy){
  const colors=palettes[isEnemy?'void':spec.art==='shot'?'ember':spec.art==='electric'?'coil':
    spec.art==='seed'?'leaf':'metal'];
  return spec.tint?[colors[0],colors[1],spec.tint,colors[3]]:colors;
}

function basicDestination(art,target,dir){
  return art==='slam'?target:around(target,-dir*7,-15);
}

function projectilePoint(art,from,to,t){
  const lift=art==='stone'?16:art==='javelin'?4:art==='seed'?8:2;
  return around(mix(from,to,t),0,-4*lift*t*(1-t));
}

export function drawBasic(ctx,sample){
  const {spec,from,targets,dir,age,flight,path,dense,isEnemy}=sample;
  const colors=basicColors(spec,isEnemy);
  const target=targets[0];
  if(!target)return;
  const targetPoint=around(target,-dir*7,-15);
  const art=spec.art;
  const p=basicDestination(art,target,dir);
  if(meleeTypes.has(art)){
    if(age< -85||age>250)return;
    if(art==='arc'&&age<75) {
      const history=path?.length>=2 ? path : [around(from,-dir*5,-9),from,around(from,dir*9,5)];
      slash(ctx,history,colors,dir);
    }
    if(art==='thrust'&&age<100)slash(ctx,[around(from,-dir*15,1),around(from,dir*6)],colors,dir);
    if(art==='claw'&&age<95)for(let i=0;i<(dense?2:3);i++)
      slash(ctx,[around(from,-dir*(9-i*5),-9-i),around(from,dir*(4+i*4),6-i)],colors,dir);
    if(art==='jab'&&age<82)for(const y of [-3,3])
      slash(ctx,[around(from,-dir*9,y),around(from,dir,y)],colors,dir);
    if(art==='bash'&&age>=0&&age<105)guard(ctx,around(from,-dir*16,15),colors,dir,age);
    if(art==='bite'&&age>=0&&age<78){
      const jaw=spec.motif==='maw'?13:spec.motif==='echo'?10:7;
      for(const sign of [-1,1])slash(ctx,[around(p,-dir*jaw,sign*jaw),around(p,2*dir,sign*2)],colors,dir);
      if(spec.motif==='echo')stroke(ctx,around(p,-dir*6,-2),around(p,dir*4,2),colors[3],{gap:2});
    }
    if(art==='slam'&&age>=0&&age<160)rim(ctx,target,8+age/18,.48,nowColor(colors,age),{skip:6,size:3,height:2});
    dust(ctx,p,age,colors,dir,dense);
    return;
  }
  if(age<0)return;
  if(art==='sonic'){wave(ctx,from,targetPoint,age,colors,dense);dust(ctx,p,age-flight,colors,dir,dense);return;}
  if(age>=flight){dust(ctx,p,age-flight,colors,dir,dense);return;}
  const t=cap(age/flight), q=projectilePoint(art,from,p,t);
  if(art==='shot'&&age<48){
    dot(ctx,around(from,-2,-2),colors[0],9,6);
    dot(ctx,around(from,0,-1),colors[3],6,4);
    dot(ctx,around(from,dir*7,-2),colors[2],3,2);
  }
  if(art==='beam'||art==='electric'){bolt(ctx,from,q,colors,age);return;}
  if(art==='smoke'){
    for(let i=0;i<(dense?3:6);i++){
      const p=around(q,-dir*i*4,((i*11)%7-3)*t);
      dot(ctx,around(p,-1,-1),colors[0],6,4);
      dot(ctx,p,colors[1+i%2],4+i%2,2);
    }
    return;
  }
  const length=({arrow:17,bolt:10,javelin:24,shot:13,mote:7,dart:9,seed:6,stone:0})[art]??6;
  if(length){
    const tail=around(q,-dir*length,1);
    stroke(ctx,around(tail,-1,1),around(q,0,1),colors[0],{size:5});
    stroke(ctx,tail,q,colors[2],{gap:art==='shot'?4:1,size:3});
  }
  const stone=art==='stone';
  dot(ctx,around(q,-2,-2),colors[0],stone?8:7,6);
  dot(ctx,around(q,-1,-1),colors[2],stone?6:5,4);
  dot(ctx,q,colors[3],stone?3:4,2);
}

function arrival(ctx,ground,art,colors,age,dir) {
  if(age<0||age>370)return;
  const p=around(ground,14*dir,-18-age*.049);
  if(['canopy','potion'].includes(art)){
    if(art==='canopy')canopy(ctx,ground,colors,age);
    for(let i=0;i<3;i++){
      const a=age-i*45;
      if(a<0)continue;
      const y=-a*.07, dx=(i%2 ? -1 : 1)*(5+i*2);
      glyph(ctx,around(p,dx,y),art==='potion'?'plus':'leaf',a,colors,dir);
    }
  }
  if(art==='handoff')guard(ctx,ground,colors,dir,age);
  if(art==='load'||art==='circuit'){
    glyph(ctx,p,'pin',age,colors,dir);
    if(age<160)glyph(ctx,around(p,-dir*9,-5),'pin',age+45,colors,dir);
  }
  if(art==='hunt')for(let i=0;i<2;i++)glyph(ctx,around(ground,dir*(6+i*7),-5-i*3),'chevron',age,colors,dir);
  if(art==='drum')for(let i=0;i<2;i++)dot(ctx,around(p,i*4,-i*6),palettes.metal[i+2],3,4);
}

function state(ctx,ground,art,colors,age,dir){
  const p=around(ground,15*dir,-12);
  if(art==='canopy'){canopy(ctx,ground,colors,age);return;}
  if(art==='handoff'){guard(ctx,ground,colors,dir,age);return;}
  if(art==='hunt'){
    glyph(ctx,around(ground,-7*dir,-2),'chevron',150,colors,dir);
    return;
  }
  if(art==='check'){
    dot(ctx,p,colors[1],3,1);
    dot(ctx,around(p,0,-4),colors[2],4,1);
    return;
  }
  if(art==='drum')dot(ctx,p,palettes.metal[2],2,4);
  else glyph(ctx,p,'pin',155,colors,dir);
}

export function drawActive(ctx,sample,layer){
  const {spec,from,ground,targets,center,radius,dir,age,dense,cancelled,shieldLoss=[]}=sample;
  const {art,windup}=spec;
  const colors=palettes[spec.theme];
  const t=cap(1+age/windup);
  if(layer==='floor'){
    if(age<0&&spec.radius&&!cancelled)danger(ctx,center,radius,t);
    if(age>=0&&!cancelled&&age<245) {
      if(spec.radius){
        rim(ctx,center,radius,.62,colors[0],{skip:6,size:4,height:3});
        rim(ctx,center,radius,.62,nowColor(colors,age),{skip:6,size:2,height:2});
      }
      if(art==='drum')rim(ctx,ground,8+age*.16,.58,nowColor(colors,age),{skip:dense?4:7,size:3,height:2});
      if(art==='discharge') {
        const r=radius*(.32+.65*cap(age/150));
        rim(ctx,center,r,.62,nowColor(colors,age),{skip:5,size:4,height:2});
        for(const point of targets)stroke(ctx,center,around(point,0,-1),colors[1],{gap:3,size:2});
      }
      if(art==='oath')rim(ctx,center,radius*(.27+.71*cap(age/154)),.60,nowColor(colors,age),
        {skip:6,start:-1.8,end:3.8,size:4,height:2});
      if(art==='stomp') {
        for(let i=0;i<(dense?4:6);i++){
          const a=i*1.07, k=radius*(.32+.65*cap(age/130));
          const m=around(center,Math.cos(a)*k*.5,Math.sin(a)*k*.30);
          const n=around(center,Math.cos(a)*k,Math.sin(a)*k*.58);
          slash(ctx,[center,around(m,3,-2),n],colors,i%2===0?1:-1);
        }
      }
    }
    return;
  }
  if(cancelled)return;
  if(age<0){
    if(!spec.radius&&targets[0]&&art!=='markpierce'){
      const p=targets[0];
      for(const x of [-11,11])dot(ctx,around(p,x,-1),colors[1],3,1);
    }
    if(art==='markpierce'&&targets[0]){
      const p=around(targets[0],0,-34), d=9-t*5;
      stroke(ctx,around(p,-d,0),around(p,0,-5),colors[2],{gap:2});
      stroke(ctx,around(p,0,-5),around(p,d,0),colors[2],{gap:2});
    }
    if(['canopy','hunt','circuit','load','potion','discharge','buckshot','drum'].includes(art)){
      for(let i=0;i<(dense?3:5);i++)if(t>i/7)dot(ctx,around(from,((i*7)%9)-4,-2-i*3-t*4),colors[1+i%2],1+i%2,1);
    }
    return;
  }
  if(spec.recipients!=='enemy'){
    for(const p of targets){
      if(age<110&&art==='circuit')bolt(ctx,around(ground,0,-2),around(p,0,-3),colors,age);
      if(age<130&&['canopy','load','potion','handoff'].includes(art)){
        for(let i=0;i<(dense?2:4);i++){
          const t=cap((age-i*13)/106);
          const q=mix(from,around(p,0,-14),t);
          const arc=art==='potion' ? -23*Math.sin(t*Math.PI) : -3;
          if(i===0)glyph(ctx,around(q,0,arc),art==='potion'||art==='load'?'pin':'leaf',age,colors,dir);
          else if(t>0)dot(ctx,around(q,0,arc),colors[i%2+1],3,2);
        }
      }
      arrival(ctx,p,art,colors,age,dir);
      if(spec.hold&&age>=155&&age<spec.hold)state(ctx,p,art,colors,age,dir);
    }
    if(art==='drum'&&targets[0])wave(ctx,from,around(targets[0],0,-13),age,colors,dense);
    return;
  }
  if(art==='rake'&&age<175){
    for(let i=0;i<(dense?2:3);i++)slash(ctx,[
      around(from,dir*(i*4-9),-15+i*5),around(from,dir*(13+i*3),-6+i*5),around(from,dir*(22+i*3),8+i*5),
    ],colors,dir);
  }
  if(art==='buckshot'&&age<154){
    dot(ctx,around(from,-1,-3),colors[0],10,6);
    dot(ctx,around(from,0,-2),colors[3],7,4);
    for(let i=-(dense?1:2);i<=(dense?1:2);i++){
      const q=around(center,i*6,-7+i*4);
      stroke(ctx,mix(from,q,.34+age*.003),q,i%2===0?nowColor(colors,age):colors[1],{gap:5,size:4});
      dot(ctx,around(q,dir*(3+age*.06),1),colors[3],3,2);
    }
    dust(ctx,from,age,colors,dir,true);
  }
  if(art==='markpierce'&&targets[0]&&age<135){
    const p=around(targets[0],0,-15);
    stroke(ctx,from,p,colors[1],{gap:5});
    slash(ctx,[mix(from,p,.72),mix(from,p,.85),p],colors,dir);
    if(targets[1])slash(ctx,[p,around(targets[1],0,-15)],colors,dir);
  }
  for(const p of targets){
    const hit=around(p,-7*dir,-15);
    if(art==='discharge'&&age<120)bolt(ctx,from,hit,colors,age);
    if(art==='discharge'&&age<155&&shieldLoss.includes(p))shards(ctx,p,age,colors);
    if(art==='check'&&age<110)guard(ctx,around(ground,13*dir),colors,dir,age);
    if(art==='check'&&age>=120&&age<spec.hold)state(ctx,p,art,colors,age,dir);
    dust(ctx,art==='stomp'?p:hit,age,colors,dir,dense,1.45);
  }
  if(art==='discharge'&&age<120)dust(ctx,from,age,colors,dir,dense);
}

function shards(ctx,p,age,colors){
  for(const side of [-1,1]){
    const x=p[0]+side*(15+age*.050), y=p[1]-23+age*.07;
    slash(ctx,[[x,y],[x+side*7,y+8]],colors,side);
  }
}

function casterCue(ctx,[x,y],colors,bright){
  // 체력바 위에서 유닛을 향하는 쐐기. 발밑 표적 모서리와 실루엣을 구분한다.
  dot(ctx,[x-6,y-1],cueInk,13,4);
  dot(ctx,[x-4,y+3],cueInk,9,2);
  dot(ctx,[x-2,y+5],cueInk,5,2);
  dot(ctx,[x-4,y],colors[1],9,1);
  dot(ctx,[x-3,y+1],bright?colors[3]:colors[2],7,2);
  dot(ctx,[x-2,y+3],colors[2],5,1);
  dot(ctx,[x-1,y+4],colors[2],3,1);
  dot(ctx,[x,y+5],colors[1]);
}

function socketCue(ctx,p,colors,age){
  const c=age<55?colors[3]:colors[2];
  for(const side of [-1,1]){
    const start=around(p,side*(4+Math.max(0,age)*.02),-4);
    const end=around(start,side*2,2);
    stroke(ctx,around(start,0,1),around(end,0,1),cueInk,{size:2});
    stroke(ctx,start,end,c,{size:2});
  }
}

function destinationCue(ctx,[x,y],colors,friendly,confirmed){
  for(const side of [-1,1]){
    const a=[x+side*13,y+1], b=[x+side*12,y+5], c=[x+side*(friendly?7:5),y+7];
    stroke(ctx,around(a,0,1),around(b,0,1),cueInk,{size:2});
    stroke(ctx,around(b,0,1),around(c,0,1),cueInk,{size:2});
    stroke(ctx,a,b,colors[2],{size:2});
    stroke(ctx,b,c,confirmed?colors[3]:colors[1],{size:2});
  }
  if(confirmed&&friendly)dot(ctx,[x-1,y+7],colors[3],3,1);
}

function travelCue(ctx,point,progress,colors,dense){
  if(progress<0||progress>1.34)return;
  const t=cap(progress);
  for(const back of dense?[.36,.24,.12]:[.48,.36,.24,.12]){
    const p=progress-back;
    if(p<0||p>=1)continue;
    const q=point(p), near=back<.28;
    dot(ctx,around(q,-1,-1),cueInk,near?5:4,near?4:3);
    dot(ctx,q,colors[near?2:1],near?3:2,2);
  }
  if(progress>=1)return;
  const lead=point(t), tail=point(Math.max(0,t-.10));
  const dx=lead[0]-tail[0], dy=lead[1]-tail[1];
  const d=Math.hypot(dx,dy)||1;
  const back=around(lead,-dx/d*7,-dy/d*7);
  for(const side of [-1,1]){
    const wing=around(back,-dy/d*side*2,dx/d*side*2);
    stroke(ctx,around(wing,0,1),around(lead,0,1),cueInk,{size:2});
    stroke(ctx,wing,lead,colors[2],{size:2});
  }
  dot(ctx,around(lead,-1,-1),colors[3],4,3);
}

function activePaths(ctx,sample,colors){
  const {spec,from,ground,center,targets,age,dense}=sample;
  if(spec.center==='caster')return;
  if(spec.center==='fixed'){
    const dest=around(center,0,-3);
    const point=t=>mix(from,dest,t);
    if(age<0){
      if(age>=-185)for(const t of [.26,.45,.64,.83]){
        const p=point(t);
        dot(ctx,around(p,-1,1),cueInk,5,1);
        dot(ctx,p,t>.6?colors[2]:colors[1],3,1);
      }
    }else travelCue(ctx,point,age/120,colors,dense);
    return;
  }
  if(age<0)return;
  if(spec.art==='markpierce'&&targets[0]){
    const first=around(targets[0],0,-15);
    travelCue(ctx,t=>mix(from,first,t),age/87,colors,dense);
    if(targets[1])travelCue(ctx,t=>mix(first,around(targets[1],0,-15),t),(age-72)/62,colors,dense);
    return;
  }
  for(const p of targets){
    if(p===ground)continue;
    if(spec.art==='circuit'){
      travelCue(ctx,t=>mix(around(ground,0,-2),around(p,0,-3),t),age/110,colors,dense);
      continue;
    }
    const destination=around(p,0,-14);
    travelCue(ctx,t=>around(mix(from,destination,t),0,spec.art==='potion'?-23*Math.sin(t*Math.PI):0),
      age/(spec.art==='drum'?145:106),colors,dense);
  }
}

// 출발점과 도착점은 기존 전투 좌표를 사용하고, 표시의 수명만 이 렌더러가 관리한다.
export function drawClarity(ctx,sample,kind,layer){
  const {spec,from,cueFrom=from,ground,targets,center,radius,sourceCue,dir,age,flight=0,dense,isEnemy}=sample;
  if(sample.cancelled)return;
  const colors=kind==='active'?palettes[spec.theme]:kind==='basic'?basicColors(spec,isEnemy)
    :palettes[isEnemy?'void':passiveThemes[spec.art]];
  if(layer==='floor'){
    if(kind!=='active'||!spec.radius||age< -spec.windup||age>=140)return;
    const hazard=age<0;
    rim(ctx,center,radius+1,.62,cueInk,{skip:7,size:3});
    rim(ctx,center,radius,.62,hazard?red[age> -125?3:2]:colors[2],{skip:7,size:2});
    if(spec.center==='fixed') {
      const c=hazard?red[3]:colors[2];
      for(const [dx,dy] of [[0,-5],[0,5],[-7,0],[7,0]]){
        const p=around(center,dx,dy);
        dot(ctx,around(p,-1,0),cueInk,4,3);
        dot(ctx,p,c,2,1);
      }
    }
    return;
  }
  if(kind==='basic'){
    if(age< -55||age>flight+145)return;
  }else if(kind==='active'){
    if(age< -spec.windup||age>=235)return;
  }else if(age<0||age>=(['split','revive'].includes(spec.art)?435:215))return;
  if(sourceCue&&(kind!=='passive'||age<215))casterCue(ctx,sourceCue,colors,age<95);
  if(kind!=='passive'&&age>= -125&&age<130)socketCue(ctx,cueFrom,colors,age);
  if(kind==='basic'&&targets[0]&&flight){
    const end=basicDestination(spec.art,targets[0],dir);
    travelCue(ctx,t=>projectilePoint(spec.art,from,end,t),age/flight,colors,dense);
  }
  if(kind==='active')activePaths(ctx,{...sample,from:age<0?cueFrom:from},colors);
  if(kind==='passive'&&['heal','shield','counter','haste'].includes(spec.art)&&targets[0]!==ground&&targets[0]){
    const end=around(targets[0],0,-14);
    travelCue(ctx,t=>mix(from,end,t),age/105,colors,dense);
  }
  const confirmed=age>=flight;
  const friendly=kind==='active'?spec.recipients!=='enemy'
    :kind==='passive'&&['friend','self'].includes(spec.to);
  if(kind==='passive'&&spec.art==='split'){
    if(age>=235)for(const p of sample.offspring??[])destinationCue(ctx,p,colors,true,true);
    return;
  }
  const inFlight=kind==='basic'&&age>=0&&flight>0;
  const fixedRecipient=kind==='active'&&!spec.radius&&age>= -165&&spec.art!=='markpierce';
  if(!confirmed&&!inFlight&&!fixedRecipient)return;
  for(const p of targets){
    if(p===ground&&kind==='active')continue;
    if(kind==='passive'&&spec.art==='revive'&&age<355)continue;
    destinationCue(ctx,p,colors,friendly,confirmed);
  }
}

export function drawPassive(ctx,sample){
  const {spec,from,ground,targets,dir,age,isEnemy,dense}=sample;
  if(age<0||age>(spec.hold??850))return;
  const colors=palettes[isEnemy?'void':passiveThemes[spec.art]];
  const p=targets[0]??ground, head=around(p,-4,-20);
  switch(spec.art){
    case 'slow':
      for(const x of [-6,6])glyph(ctx,around(p,x,-5), 'down',age,colors);
      break;
    case 'bonus':
      if(age<180)for(const y of [-5,5])glyph(ctx,around(p,-8*dir+dir*age*.04,-17+y),'chevron',age,colors,dir);
      break;
    case 'reduction':
      if(age<175){guard(ctx,p,colors,dir,age);dust(ctx,around(p,16*dir,-17),age,colors,-dir,dense);}
      break;
    case 'heal':
      if(age<360)arrival(ctx,p,'potion',colors,age,dir);
      break;
    case 'shield':
      guard(ctx,p,colors,0,age);
      break;
    case 'counter':
      if(age<160){stroke(ctx,mix(from,head,age/210),head,colors[2],{gap:3,size:2});dust(ctx,head,age,colors,dir,dense);}
      break;
    case 'shatter':
      if(age<185)shards(ctx,p,age,colors);
      break;
    case 'haste':
      for(let i=0;i<3;i++){
        const a=around(p,-dir*(23-i*4),-2-i*3), b=around(p,-dir*(16-i*4),-2-i*3);
        stroke(ctx,around(a,-1,1),around(b,-1,1),colors[0],{size:4});
        stroke(ctx,a,b,colors[2-i%2],{size:3});
      }
      break;
    case 'reach':
      if(age<215)stroke(ctx,from,around(from,dir*42,0),colors[2],{gap:7,size:4});
      break;
    case 'charge':
      if(age<230){glyph(ctx,around(from,-8,3),'pin',age,colors);if(age>=40)glyph(ctx,around(from,-15,3),'pin',age,colors);}
      break;
    case 'taunt':
      for(const side of [-1,1]) {
        slash(ctx,[around(p,side*9,4),around(p,side*17,0),around(p,side*12,-6)],colors,side);
      }
      break;
    case 'revive':
      if(age<450){
        const h=around(p,0,-10-Math.sin(age/450*Math.PI)*20);
        rim(ctx,h,7+age*.03,.58,colors[0],{skip:5,size:5,height:3});
        rim(ctx,h,7+age*.03,.58,colors[age<315?2:1],{skip:5,size:3,height:2});
        if(age<355){
          dot(ctx,around(h,-1,-4),colors[1],3,1);
          dot(ctx,around(h,-3,-3),colors[0],7,5);
          dot(ctx,around(h,-2,-2),colors[2],5,3);
          dot(ctx,around(h,-1,-2),colors[3],2,2);
          dot(ctx,around(h,-1,1),colors[1],3,2);
        }
      }
      break;
    case 'growth':
      glyph(ctx,around(from,dir*3,-2),'pin',age,colors);
      break;
    case 'split':
      if(age<450)for(const end of sample.offspring??[]){
        const q=mix(around(p,0,-17),around(end,0,-11),cap(age/235));
        const side=end[0]<p[0]?-1:1;
        glyph(ctx,q,'pin',age,colors);dust(ctx,q,age%110,colors,side,dense);
      }
      break;
    case 'approach':
      if(age<240){rim(ctx,p,17,.5,colors[2],{skip:5,size:3,height:2});stroke(ctx,ground,p,colors[1],{gap:6,size:3});}
      break;
    case 'weaken':
      glyph(ctx,around(head,12*dir,3),'down',age,colors);
      dot(ctx,around(head,17*dir,6+Math.min(7,age*.015)),colors[1]);
      break;
  }
}
