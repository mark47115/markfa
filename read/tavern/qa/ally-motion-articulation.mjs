export const articulatedActions = {
  wing: ['날개로 몸을 밀어 돌진','claw','contact'],
  bow: ['활을 들어 시위를 당기고 발사','arrow','release'],
  crossbow: ['석궁 장전·조준·방아쇠','bolt','release'],
  gun: ['총 받치기·조준·격발·반동','shot','release'],
  throw: ['투창을 뒤로 젖혀 던지기','javelin','release'],
  throwing: ['투척물을 치켜들어 던지기','stone','release'],
  spear: ['창을 당겨 수평으로 찌르기','pierce','contact'],
  drumHit: ['북을 내리쳐 전방 음파','sound','release'],
  drumRally: ['두 박자 북을 쳐 아군 강화','rally','cast'],
  gong: ['징 중심을 쳐 전방 음파','sound','release'],
  gongRally: ['징을 두 번 울려 아군 강화','rally','cast'],
  horn: ['나팔을 입에 대고 불기','rally','cast'],
  bell: ['종을 쳐 울리기','rally','cast'],
  instrument: ['악기를 연주해 아군 지원','rally','cast'],
  sling: ['투석 장비를 당겨 발사','stone','release'],
  seedShot: ['새순을 장전해 발사','seed','release'],
  smoke: ['분사구를 조준해 연막 방출','smoke','release'],
  coil: ['코일의 전하를 모아 방출','electric','release'],
  scope: ['관측경을 대고 전방 조사','scout','cast'],
  brush: ['붓으로 전방에 표식 그리기','mark','cast'],
  supply: ['손을 뻗어 아군에 보급','aid','cast'],
  repair: ['공구를 내밀어 장비 손질','repair','cast'],
  orders: ['장비를 받치고 다른 손으로 신호','rally','cast'],
  seed: ['묘목을 앞으로 내려놓기','seed','cast'],
  furnace: ['화로를 열어 불꽃 끌어내기','ember','cast'],
  guard: ['앞발을 딛고 짧게 손 내지르기','punch','contact'],
  rake: ['앞발을 디디고 두 손의 발톱으로 긁기','claw','contact'],
  bluff: ['앞발을 굴러 위협','stomp','contact'],
  ride: ['고삐를 당기고 기승 돌진','stomp','contact'],
  ground: ['접지 발판을 펼쳐 고정','electric','cast'],
  machine: ['받침을 고정하고 앞 장비 밀기','shield','contact'],
  mace: ['철퇴 머리로 내려치기','hammer','contact'],
  club: ['몽둥이를 들어 횡으로 휘두르기','hammer','contact'],
  torch: ['횃불을 들어 앞을 밝히기','ember','cast'],
};

// 이 함수는 캔버스가 있는 빌드 브라우저로 전달된다.
export function createArticulation(art) {
  const { actor, canonical, colors, body, frame, tile, line, contains, baseArt, attackPoses } = art;
  const { family, gearPoint, anchor } = actor;
  const center = frame.anchor[0];
  const height = body.bottom - body.top;
  const waist = Math.round(body.top + height * .76);
  const chest = Math.round(body.top + height * .61);
  const cheek = Math.round(body.top + height * .52);
  const dark = colors[0];
  const bright = colors.at(-2) ?? colors.at(-1);
  const metal = colors[Math.round((colors.length - 1) * .64)];
  const fabric = colors[Math.round((colors.length - 1) * .41)];
  const round = Math.round;
  const lerp = (a, b, t) => a + (b-a)*t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const percussion = ['drum','gong','bell','instrument'].includes(family);
  const special = new Set(['guard','supply','orders','seed','repair','furnace','bluff','ride','ground','punch','rake']);
  const rightWing = Math.max(center+7, body.right-3);
  const shieldLeft = family==='shield' && (gearPoint?.[0] ?? anchor?.grip[0] ?? 53)<center;
  const guessedX = clamp(rightWing-4,48,56);
  const grip = gearPoint ? gearPoint.slice(0,2) : anchor?.grip ?? [guessedX,chest+4];
  const tip = gearPoint ? gearPoint.slice(2,4) : anchor?.tip ??
    (shieldLeft ? [body.left+1,chest+1] : [body.right-1,family === 'spear' ? body.top+3 : chest+2]);
  const bounds = gearPoint?.[4];
  const tall = ['spear','staff','javelin','flag'].includes(family);
  const builtIn = ['fist','claw','ram','machine'].includes(family);
  const separate = !percussion && !['beast','bird','bluff','seedling','gear'].includes(family);
  const redraw = family === 'bow';
  const shield = family === 'shield';
  const fixedProp = ['drum','gong','instrument','bell'].includes(family);

  const pointKey = (x,y) => y * frame.width + x;
  const source = new Map(canonical.map(p => [pointKey(p.x,p.y),p.color]));
  const weaponInk = new Map();
  const bodyInk = [];
  for (const p of canonical) {
    const inBounds = bounds && p.x >= bounds[0] && p.x < bounds[2] && p.y >= bounds[1] && p.y < bounds[3];
    const mask = gearPoint?.[5] ? contains(gearPoint[5],p.x+.5,p.y+.5)
      : anchor && !redraw && !['gun','crossbow','staff','lantern','sling'].includes(family)
        ? contains(anchor.outline,p.x+.5,p.y+.5)
        : bounds ? inBounds
        : shieldLeft ? p.x < grip[0]+3 && p.y >= cheek+1
          : p.x >= grip[0]-1 && p.y >= (tall ? body.top+2 : chest-4) && (tall || p.y <= waist+2 || p.x >= grip[0]+2);
    if (separate && mask) weaponInk.set(pointKey(p.x,p.y),p.color);
    else bodyInk.push(p);
  }
  if (actor.id === 'wolf-javelin') {
    // 대각선 투창 뒤에 가렸던 털과 옷을 같은 행의 원본 색으로 이어 준다.
    for (let y=48;y<=69;y++) {
      const row=bodyInk.filter(p=>p.y===y);
      if (row.length<2) continue;
      const xs=row.map(p=>p.x);
      const left=Math.min(...xs), right=Math.max(...xs);
      for (let x=left+1;x<right;x++) {
        if (!weaponInk.has(pointKey(x,y))) continue;
        const tint=row.reduce((a,b)=>Math.abs(b.x-x)<Math.abs(a.x-x)?b:a).color;
        bodyInk.push({x,y,color:tint});
      }
    }
  }
  const weaponPoints = [...weaponInk.keys()].map(i=>[i%frame.width,Math.floor(i/frame.width)]);
  const shieldRim = shield ? weaponPoints.filter(p=>Math.abs(p[1]-grip[1])<=3) : [];
  const bowPalette = [...new Set(weaponInk.values())].sort((a,b)=>colors.indexOf(a)-colors.indexOf(b));
  const bowWood = bowPalette[Math.floor(bowPalette.length*.55)] ?? fabric;
  const bowHalf = clamp(round(((bounds?.[3] ?? 72)-(bounds?.[1] ?? 49))*.4),7,13);

  const phase = [0,.18,.45,.78,1,.9,.64,.35,.14,0];
  const release = [0,0,0,0,.1,1,.85,.52,.21,0];
  const step = [0,0,1,2,4,5,5,3,1,0];
  const steady = ['bow','crossbow','gun','horn','scope','seedShot','smoke','coil','cast','lantern','bell','instrument'];
  const heavy = ['bash','hammer','mace','club','axeDown','axeSweep','flail','ram','machine','ride','ground'];
  const leftShoulder = [-6,-1];
  const on = (mark, pt, color) => mark(round(pt[0]),round(pt[1]),color);

  function stroke(mark,a,b,color,width=1) {
    line(mark,round(a[0]),round(a[1]),round(b[0]),round(b[1]),color,width);
  }

  function arm(mark, shoulder, elbow, hand, cloth, front) {
    stroke(mark,[shoulder[0],shoulder[1]-1],[elbow[0],elbow[1]-1],dark,front ? 4 : 3);
    stroke(mark,shoulder,elbow,cloth,front ? 2 : 1);
    stroke(mark,elbow,hand,dark,3);
    stroke(mark,[elbow[0],elbow[1]+1],[hand[0],hand[1]+1],front ? metal : cloth,1);
    on(mark,hand,front ? bright : metal);
    on(mark,[hand[0]-1,hand[1]+1],front ? metal : fabric);
  }

  function gearTransform(hand, angle) {
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const from = ([x,y]) => [hand[0]+(x-grip[0])*cos-(y-grip[1])*sin,hand[1]+(x-grip[0])*sin+(y-grip[1])*cos];
    const points = weaponPoints.map(from);
    const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
    return {from, sin, cos, left:Math.floor(Math.min(...xs)), top:Math.floor(Math.min(...ys)),
      right:Math.ceil(Math.max(...xs)), bottom:Math.ceil(Math.max(...ys))};
  }

  function pixelsOfGear(mark, hand, angle) {
    const {from,sin,cos,left,top,right,bottom} = gearTransform(hand,angle);
    for (let y = Math.max(1,top-1); y <= Math.min(frame.height-2,bottom+1); y++) {
      for (let x = Math.max(1,left-1); x <= Math.min(frame.width-2,right+1); x++) {
        const dx=x-hand[0],dy=y-hand[1];
        const ox=round(grip[0]+dx*cos+dy*sin),oy=round(grip[1]-dx*sin+dy*cos);
        if (ox<0 || ox>=frame.width || oy<0 || oy>=frame.height) continue;
        const c=weaponInk.get(pointKey(ox,oy));
        if (c) mark(x,y,c);
      }
    }
    return from;
  }

  function bodyPose(mark,{hip,low,feet,bodyBits,frontArm}) {
    const percussionStick = actor.id === 'war-drummer' || actor.id === 'allies-192';
    for (const p of bodyBits) {
      if (percussionStick && p.x >= tip[0]+3 && p.y < tip[1]-5) continue;
      const near = p.x >= center;
      const leg = clamp((p.y-waist)/Math.max(1,body.bottom-waist),0,1);
      const foot = feet[near ? 0 : 1];
      const knee = Math.sin(Math.PI*leg);
      const x = round(p.x+lerp(hip,foot[0],leg)+knee*foot[2]);
      const y = round(p.y+(1-leg)*low+leg*foot[1]-(near ? .7 : .35)*knee);
      if (x < 1 || x > frame.width-2 || y < 1 || y > frame.height-2) continue;
      const elbowHole = frontArm && !fixedProp && !builtIn && p.x > center+3 && p.x < grip[0]+1 &&
        p.y >= chest+2 && p.y < waist-1;
      if (elbowHole) continue;
      mark(x,y,p.color);
      if (knee > .35 && foot[2] !== 0 && source.has(pointKey(p.x,p.y+1))) mark(x,y+1,p.color);
    }
  }

  function bowPose(mark, hold, pull, index) {
    const half = bowHalf;
    const bent = index < 5 ? round(phase[index]*2) : 0;
    const bow = [[hold[0]-5-bent,hold[1]-half],[hold[0]-1,hold[1]-half+1],
      [hold[0]+3,hold[1]-4],[hold[0]+3,hold[1]+4],[hold[0]-1,hold[1]+half-1],[hold[0]-5-bent,hold[1]+half]];
    for (let i=1;i<bow.length;i++) {
      stroke(mark,bow[i-1],bow[i],dark,3);
      stroke(mark,[bow[i-1][0],bow[i-1][1]+1],[bow[i][0],bow[i][1]+1],bowWood);
    }
    const string = index < 5 ? pull : [hold[0]-5,hold[1]];
    stroke(mark,bow[0],string,bright);
    stroke(mark,string,bow.at(-1),metal);
    const arrow = [hold[0]+8,hold[1]];
    if (index >= 2 && index <= 4) {
      stroke(mark,string,arrow,bright);
      stroke(mark,[arrow[0]-2,arrow[1]-1],arrow,metal);
    }
    return arrow;
  }

  function beater(mark, hand, contact) {
    stroke(mark,hand,contact,dark,2);
    stroke(mark,[hand[0],hand[1]+1],[contact[0],contact[1]+1],metal);
    const [x,y] = contact;
    stroke(mark,[x-1,y-2],[x+1,y-2],dark,5);
    stroke(mark,[x-1,y-1],[x+1,y-1],metal,3);
    stroke(mark,[x-1,y-1],[x,y-1],bright);
  }

  const direction = {
    cutUp:[26,31,45,58,26,-43,-65,-44,-17,26], cutDown:[26,-22,-56,-85,-67,43,54,43,18,26],
    stab:[12,14,9,5,0,0,0,6,12,12], spear:[-76,-43,-18,-6,-3,0,2,-6,-27,-76],
    throw:[-70,-54,-48,-43,-25,-4,12,21,31,-70],
    axeDown:[-52,-51,-98,-138,-114,52,67,28,-21,-52],
    axeSweep:[-52,-45,-60,-80,-47,10,19,12,-18,-52],
    hammer:[-45,-50,-87,-112,-83,52,70,43,9,-45], mace:[-55,-50,-82,-107,-75,64,70,39,1,-55],
    club:[-34,-45,-57,-79,-54,18,36,34,11,-34],
  };
  const equivalent = {
    spear:'stab', drumHit:'drum', drumRally:'drum', gong:'drum', gongRally:'drum', bell:'drum',
    horn:'lantern', instrument:'drum', seedShot:'crossbow', smoke:'crossbow', coil:'gun', scope:'bow',
    sling:'throwing', brush:'hook', supply:'wand', repair:'punch', orders:'flag', seed:'lantern',
    furnace:'lantern', guard:'punch', rake:'hook', bluff:'ram', ride:'ram', ground:'ram',
    machine:'ram', mace:'hammer', club:'axeSweep', torch:'lantern',
  };

  return function attack(key,index) {
    const [dx,dy,angle] = attackPoses[equivalent[key] ?? key]?.[index] ?? attackPoses.ready[index];
    if (index === 0 || index === 9) return {pixels:baseArt,hand:grip,tip};
    const planted = steady.includes(key) || percussion;
    const strike = release[index], ready = phase[index];
    const lunge = heavy.includes(key) ? 1.25 : 1;
    const hip = round(planted ? -ready+strike : -2*ready+4*strike*lunge);
    const low = round(planted ? ready : 2*ready+2*strike);
    const feet = planted
      ? [[index<4 ? index%3 : 2, index===2 ? -2 : 0, round(2*ready)],[-1,0,-round(ready)]]
      : [[round(step[index]*lunge),index===2 || index===3 ? -2 : 0,round(2*ready)],
        [-round(2*ready),index===6 || index===7 ? -1 : 0,-round(2*strike)]];
    const shoulder = [center+hip+2,chest+low-1];
    const rear = [shoulder[0]+leftShoulder[0],shoulder[1]+leftShoulder[1]];
    let hand = [grip[0]+hip+round(dx*.72),grip[1]+low+dy];
    let other = [rear[0]-round(2*ready),rear[1]+4+round(3*strike)];
    const usefulTool = separate && !special.has(key);
    const supportBoth = ['bow','crossbow','gun','spear','axeDown','axeSweep','hammer','mace','club','supply','furnace','seed','smoke','coil','seedShot','scope'].includes(key);
    let strikeTip = [hand[0]+5,hand[1]];

    if (family === 'beast' || family === 'bird') {
      const artPixels = tile(mark => {
        for (const p of canonical) {
          const front = p.x >= center;
          const limb = clamp((p.y-waist)/Math.max(1,body.bottom-waist),0,1);
          const snout = clamp((p.x-center)/Math.max(1,body.right-center),0,1);
          const opening = key==='bite' && index>=2 && index<=4 && p.y>=cheek+2 && p.y<waist && front;
          const fore = key==='paw' || key==='rise';
          const wing = family==='bird' ? clamp((center-p.x)/Math.max(1,center-body.left),0,1) : 0;
          const x = round(p.x+hip+(front ? limb*feet[0][0]+strike*snout*3 : limb*feet[1][0]));
          const y = round(p.y+low*(1-limb)+(opening ? 2*snout : 0)
            -(fore&&front ? ready*limb*5 : 0)+wing*(dy+round(dx*.4)));
          if (x>=1&&x<=frame.width-2&&y>=1&&y<=frame.height-2) mark(x,y,p.color);
        }
      });
      const frontX = body.right+hip+round(3*strike);
      return {pixels:artPixels,tip:[frontX,key==='bite' || family==='bird' ? cheek+low+3 : body.bottom-2],hand:[center,waist]};
    }

    if (key==='bow') {
      hand = [center+7+round(ready*7),Math.min(frame.groundY-bowHalf-1,cheek+7-round(ready*6)+round(strike*2))];
      other = [center+7-round(ready*10)-round(strike*5),hand[1]+1];
    } else if (['crossbow','gun','seedShot','smoke','coil'].includes(key)) {
      const kick = key==='gun' ? [0,0,0,0,0,-2,-5,-2,-1,0][index] : index===6 ? -2 : 0;
      hand = [grip[0]+hip+round(ready*3)+kick,grip[1]-round(ready*6)+(index===6 ? -2 : 0)];
      const load = key==='crossbow' ? [0,-2,4,1,7,7,6,6,4,0][index] : 5;
      other = [hand[0]+load,hand[1]+1];
    } else if (key==='horn' || key==='scope') {
      hand = [center+5+round(ready*3),round(lerp(grip[1],cheek+1,ready))];
      other = [hand[0]+5,hand[1]+1];
    } else if (supportBoth) {
      other = [round(lerp(rear[0],hand[0]-4,ready+.1)),hand[1]+3];
    }

    const rotation = direction[key]
      ? (direction[key][index]*Math.PI/180)-Math.atan2(tip[1]-grip[1],tip[0]-grip[0])
      : angle*Math.PI/180;
    const leadArm = key==='punch' || key==='guard' || builtIn || !fixedProp;
    const visibleGear = usefulTool && (!['throw','throwing'].includes(key) || index<5);
    if (visibleGear && !redraw && weaponInk.size) {
      const {left,top,right,bottom} = gearTransform(hand,rotation);
      const fitX = Math.max(2-left,0)-Math.max(right-(frame.width-3),0);
      const fitY = Math.max(2-top,0)-Math.max(bottom-(frame.height-3),0);
      hand = [hand[0]+fitX,hand[1]+fitY];
      if (supportBoth) other = [other[0]+fitX,other[1]+fitY];
    }
    const note = key==='drumRally'||key==='gongRally';
    const shove = key==='bash'&&shield;
    const pixels = tile(mark => {
      const bodyBits = usefulTool || family==='fist' ? bodyInk : canonical;
      const stowed = fixedProp && bounds?.[0] < center-3;
      const tap = note ? [0,.42,.84,.66,.38,0,.65,0,.42,0][index] : [0,.26,.66,1,.64,0,.28,.46,.23,0][index];
      const drumming = ['drumHit','drumRally','gong','gongRally','bell'].includes(key);
      const prop = fixedProp ? [tip[0]+hip,tip[1]+low] : null;
      const strokePoint = prop ? [prop[0]+round(tap*(stowed ? 8 : 9)),prop[1]-round(tap*(stowed ? 18 : 24))] : null;
      if (drumming) {
        hand = [strokePoint[0]+round(7-4*tap),strokePoint[1]+round(15*tap-6)];
        other = [prop[0]+(stowed ? 3 : -7),prop[1]+1-(note&&index===6 ? 3 : 0)];
      }
      if (key==='instrument') {
        hand = [prop[0]+round(4*Math.sin(index*.9)),prop[1]+(index%3===1 ? -3 : 0)];
        other = [prop[0]-6+index%3,prop[1]-1];
      }
      if (key==='punch' || key==='guard') {
        hand = [shoulder[0]+round(5-6*ready+11*strike),shoulder[1]+4-round(3*strike)];
        other = [rear[0]+1+round(3*ready),rear[1]+3+round(2*strike)];
      }
      if (key==='rake') {
        hand = [shoulder[0]+round(3-ready*3+strike*12),shoulder[1]-round(ready*6)+round(strike*8)];
        other = [rear[0]+round(2+2*ready+8*strike),rear[1]+2+round(4*strike)];
      }
      if (shove && shieldLeft) hand = [grip[0]+hip+round(ready+strike*11),grip[1]+low];
      const farElbow = [round(lerp(rear[0],other[0],.49))-1,round(lerp(rear[1],other[1],.55))+3];
      const elbow = [round(lerp(shoulder[0],hand[0],.47))-1,round(lerp(shoulder[1],hand[1],.55))+(strike>.8 ? 1 : 3)];
      bodyPose(mark,{hip,low,feet,bodyBits,frontArm:leadArm});
      if (key==='bluff' || key==='ride' || key==='ground') {
        strikeTip=[body.right+hip-1,key==='ride'?chest+low:body.bottom-1];
        if (key==='ground') {
          const y=body.bottom-2;
          stroke(mark,[center-5,y],[center-5-round(strike*7),y+1],metal,2);
          stroke(mark,[center+5,y],[center+5+round(strike*8),y+1],metal,2);
        }
        return;
      }
      if (key==='ram' || key==='machine') {
        const extension = round(strike*6-ready);
        const shaft = [grip[0]+hip+extension,grip[1]+low];
        stroke(mark,[grip[0]+hip-4,shaft[1]],shaft,dark,5);
        stroke(mark,[grip[0]+hip-3,shaft[1]+1],shaft,metal,2);
        strikeTip=pixelsOfGear(mark,shaft,0)(tip);
        return;
      }
      arm(mark,rear,farElbow,other,fabric,false);
      if (redraw) {
        arm(mark,shoulder,elbow,hand,fabric,true);
        strikeTip=bowPose(mark,hand,other,index);
        return;
      }
      if (visibleGear) {
        const projected = pixelsOfGear(mark,hand,rotation);
        strikeTip = projected(tip);
        if (shove && shieldRim.length) {
          strikeTip=shieldRim.map(projected).reduce((a,b)=>a[0]>b[0]?a:b);
        }
      }
      if (key==='crossbow') {
        const rail = [strikeTip[0],hand[1]-1];
        stroke(mark,[hand[0]+1,hand[1]-1],rail,metal);
        const upper = [rail[0]-6,rail[1]-6], lower = [rail[0]-8,rail[1]+5];
        const latch = [rail[0]-(index<5 ? 8 : 4),rail[1]];
        stroke(mark,upper,[rail[0]-1,rail[1]],dark,3);
        stroke(mark,[rail[0]-1,rail[1]],lower,dark,3);
        stroke(mark,upper,[rail[0]-1,rail[1]],metal);
        stroke(mark,[rail[0]-1,rail[1]],lower,metal);
        stroke(mark,upper,latch,bright);
        stroke(mark,latch,lower,bright);
        if (index>=2 && index<=4) stroke(mark,latch,[rail[0]+3,rail[1]],bright);
        strikeTip=[rail[0]+2,rail[1]-1];
      }
      if (key==='sling') {
        const lineEnd = [hand[0]+4,hand[1]-4];
        const pocket = index<5 ? [hand[0]-round(7*ready),hand[1]+1] : lineEnd;
        stroke(mark,lineEnd,pocket,metal);
        if (index<5) on(mark,pocket,bright);
        strikeTip=[lineEnd[0]+3,lineEnd[1]+3];
      }
      arm(mark,shoulder,elbow,hand,fabric,true);
      if (visibleGear&&!['crossbow','sling'].includes(key)) on(mark,hand,bright);
      if (drumming) {
        beater(mark,hand,strokePoint);
        strikeTip=strokePoint;
      } else if (key==='instrument') {
        strikeTip=[prop[0],prop[1]];
      } else if (key==='punch' || key==='guard') {
        stroke(mark,[hand[0],hand[1]-1],[hand[0]+2,hand[1]-1],dark,4);
        stroke(mark,hand,[hand[0]+2,hand[1]],bright,2);
        strikeTip=[hand[0]+2,hand[1]];
      } else if (key==='rake') {
        for (const h of [hand,other]) {
          stroke(mark,h,[h[0]+3,h[1]-1],dark,3);
          stroke(mark,[h[0]+1,h[1]],[h[0]+3,h[1]-1],bright);
        }
        strikeTip=[hand[0]+3,hand[1]];
      } else if (key==='wrench' && actor.profile==='machine') {
        const spread=round((1-strike)*ready*3);
        stroke(mark,strikeTip,[strikeTip[0]+3,strikeTip[1]-2-spread],metal,2);
        stroke(mark,strikeTip,[strikeTip[0]+3,strikeTip[1]+2+spread],metal,2);
        strikeTip=[strikeTip[0]+3,strikeTip[1]];
      } else if (key==='throw' || key==='throwing') {
        if (index>=5) strikeTip=[hand[0]+3,hand[1]];
      } else if (special.has(key)) {
        if (['supply','seed','furnace','repair'].includes(key)) {
          stroke(mark,[hand[0]+1,hand[1]-2],[hand[0]+3,hand[1]-2],dark,4);
          stroke(mark,[hand[0]+1,hand[1]-1],[hand[0]+3,hand[1]-1],metal,2);
        }
        strikeTip=[hand[0]+2,hand[1]-1];
      }
    });
    return {pixels,hand:hand.map(round),tip:strikeTip.map(value=>clamp(round(value),1,frame.width-2))};
  };
}
