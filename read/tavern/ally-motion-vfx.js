(() => {
  const flash = '#ffe6a8';
  const warm = '#e5a758';
  const magic = '#98dfda';
  const glow = '#d7fff0';
  const ink = '#302436';

  function pixel(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function segment(ctx, a, b, color, spacing = 1, width = 1) {
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing));
    for (let n = 0; n <= steps; n++) {
      pixel(ctx, a[0] + (b[0] - a[0]) * n / steps, a[1] + (b[1] - a[1]) * n / steps, width, 1, color);
    }
  }

  function litSegment(ctx, a, b, color, spacing = 1) {
    segment(ctx, [a[0] - 1, a[1] + 1], [b[0] - 1, b[1] + 1], ink, spacing, 4);
    segment(ctx, a, b, color, spacing, 3);
  }

  function sparks(ctx, x, y, age, dim, tint, direction) {
    if (age < 0 || age >= 190) return;
    const paths = [[-3,-4],[4,-6],[7,-2],[6,3],[3,5],[-3,3]];
    for (const [dx, dy] of paths.slice(0, dim ? 3 : 6)) {
      const distance = .85 + age / 100;
      const xPos = x + dx * distance * direction;
      const yPos = y + dy * distance + age * age / 8400;
      const size = age < 74 ? 2 : 1;
      pixel(ctx, xPos - 1, yPos - 1, size + 2, size + 2, ink);
      pixel(ctx, xPos, yPos, size, size, age < 75 ? tint : warm);
    }
    if (age < 65) {
      pixel(ctx, x - 5, y - 2, 11, 5, ink);
      pixel(ctx, x - 2, y - 5, 5, 11, ink);
      pixel(ctx, x - 4, y - 1, 9, 3, tint);
      pixel(ctx, x - 1, y - 4, 3, 9, tint);
      pixel(ctx, x - 1, y - 1, 3, 3, glow);
    }
  }

  function timing(clip, frame, elapsed) {
    return clip.durations.slice(0, frame).reduce((sum, time) => sum + time, elapsed);
  }

  function soundWave(ctx, origin, target, age, direction, dense) {
    if (age < 0 || age >= 230) return;
    const [x,y] = origin;
    const distance = Math.min(62,Math.max(15,(target[0]-x)*direction));
    for (let wave=0; wave<(dense ? 2 : 3); wave++) {
      const t=(age-wave*27)/150;
      if (t<0 || t>1.2) continue;
      const leading=x+direction*(3+Math.min(1,t)*distance);
      const half=4+Math.floor(9*t);
      for (let row=-half; row<=half; row++) {
        if ((row+half+wave)%3===2) continue;
        const edge=leading-direction*Math.floor(row*row/(half*1.9));
        pixel(ctx,edge-1,y+row+1,4,1,ink);
        pixel(ctx,edge,y+row,3,2,wave===0 && age<75 ? flash : warm);
      }
    }
  }

  function allyPulse(ctx, origin, ground, allies, age, dense) {
    if (age<0 || age>=185) return;
    const radius=6+age*.20;
    for (let segment=0; segment<16; segment++) {
      if (dense&&segment%2) continue;
      const angle=segment*Math.PI/8;
      const x=ground[0]+Math.cos(angle)*radius, y=ground[1]+Math.sin(angle)*radius*.38;
      pixel(ctx,x-1,y-1,5,3,ink);
      pixel(ctx,x,y,3,2,age<85 ? glow : magic);
    }
    for (const [x,y] of allies) {
      if (Math.hypot(x-ground[0],(y-ground[1])*1.2)>radius+10) continue;
      const rise=age/11;
      pixel(ctx,x+10,y-24-rise,3,3,magic);
      pixel(ctx,x-9,y-16-rise,2,3,dense ? magic : glow);
    }
    if (age<45) pixel(ctx,origin[0]-1,origin[1]-1,3,2,flash);
  }

  function action(ctx, clip, frame, elapsed, actor, target, dense = false, allies = []) {
    if (!clip.tip) return;
    const now = timing(clip, frame, elapsed);
    const start = timing(clip, clip.eventFrame, 0);
    const age = now - start;
    if (age < -80) return;
    const map = ([x, y]) => [actor.x + (actor.mirror ? actor.cell - 1 - x : x), actor.y + y];
    const strike = map(clip.tip[clip.eventFrame]);
    const current = map(clip.tip[frame]);
    const direction = actor.mirror ? -1 : 1;
    const motif = clip.effect;
    const style = ({
      tick:'punch',pounce:'punch',slab:'shield',pincer:'claw',fang:'bite',veil:'blade',spine:'pierce',
      fault:'hammer',sickle:'blade',maw:'bite',spore:'seed',shell:'shield',hook:'claw',breath:'smoke',
      glass:'arcane',sand:'punch',seam:'arcane',mirror:'electric',gate:'shield',cannon:'shot',cloud:'smoke',
      rift:clip.event==='release'?'arcane':'blade',
    })[motif] ?? motif;
    if (style === 'sound') {
      soundWave(ctx,strike,target,age,direction,dense);
      return;
    }
    if (style === 'rally') {
      const ground=[actor.x+actor.cell/2,actor.y+74];
      allyPulse(ctx,strike,ground,allies,age,dense);
      if (clip.echoFrame !== undefined) {
        allyPulse(ctx,map(clip.tip[clip.echoFrame]),ground,allies,now-timing(clip,clip.echoFrame,0),dense);
      }
      return;
    }
    if (clip.event === 'release') {
      if (age < 0) return;
      const profile = {
        shot: [80,0,12,flash], bolt: [120,0,9,warm], arrow: [145,1.8,12,warm],
        javelin: [150,4,17,flash], stone: [175,14,0,'#d2bb9a'], electric: [110,0,10,magic],
        arcane: [145,4,7,glow], seed: [145,7,6,'#a8c388'], smoke: [185,2,0,'#a997a9'],
      }[style] ?? [145,2,5,warm];
      const [flight,lift,length,tint]=profile;
      if (style==='shot' && age<34) {
        sparks(ctx,strike[0],strike[1],age,dense,flash,direction);
      }
      if (age < flight) {
        const n = age / flight;
        const x = strike[0] + (target[0] - strike[0]) * n;
        const y = strike[1] + (target[1] - strike[1]) * n - 4 * lift * n * (1 - n);
        if (style==='smoke') {
          for (const [i,d] of [-3,3,0,-5,6].entries()) {
            if (dense&&i>2) break;
            const puffX=x-i*direction*3, puffY=y+d*n;
            pixel(ctx,puffX-1,puffY-1,6,4,ink);
            pixel(ctx,puffX,puffY,3+Math.floor(n*2),2,tint);
          }
        } else {
          if (length>2) litSegment(ctx,[x-direction*length,y+1],[x,y],tint,2);
          pixel(ctx,x-2,y-2,7,6,ink);
          pixel(ctx,x-1,y-1,5,4,tint);
          pixel(ctx,x,y,style==='stone' ? 3 : 4,2,flash);
        }
      } else {
        if (style!=='smoke') sparks(ctx,target[0],target[1],age-flight,dense,tint,direction);
      }
      return;
    }
    if (clip.event === 'cast') {
      if (age >= 0 && age <= 205) {
        const tint={aid:'#b4ded0',ember:warm,mark:flash,scout:flash,seed:'#a8c388',repair:warm,
          ward:'#a6dce2',mend:'#a9e1ba',split:'#c8a6e8',revive:'#b6a9e6',omen:'#dfa5b4'}[style]??glow;
        if (age < 85) sparks(ctx,strike[0],strike[1],age,dense,tint,direction);
        for (const [i, sx] of [-4, 2, 5, -6].entries()) {
          if (age < i * 14 || (dense && i > 1)) continue;
          const x=strike[0] + sx * 1.5, y=strike[1] - (age - i * 14) / 13 - i;
          pixel(ctx,x-1,y-1,4,5,ink);
          pixel(ctx,x,y,2,3,tint);
        }
      }
      return;
    }
    if (frame >= clip.eventFrame - 1 && age < 80) {
      if (style === 'blade' || style === 'pierce' || style === 'hammer') {
        for (let n = Math.max(clip.eventFrame - 2, frame - 2); n < frame; n++) {
          litSegment(ctx, map(clip.tip[n]), map(clip.tip[n + 1]), n === frame - 1 ? flash : warm, dense ? 4 : 2);
        }
      }
      if (style === 'punch') {
        for (const dy of [-3, 2]) litSegment(ctx, [current[0] - 10 * direction, current[1] + dy], [current[0] - direction, current[1] + dy], warm, 2);
      }
      if (style === 'claw') {
        for (let i = 0; i < (dense ? 2 : 3); i++) {
          litSegment(ctx, [strike[0] - (8 - i * 3) * direction, strike[1] - 9], [strike[0] + i * 3 * direction, strike[1] + 4], warm, 2);
        }
      }
      if (style === 'bite' || motif === 'echo') {
        const jaw = motif === 'maw' ? 11 : 7;
        for (const dy of [-jaw, jaw]) litSegment(ctx, [strike[0] - jaw * direction, strike[1] + dy], strike, '#e6bcb3', 2);
      }
    }
    sparks(ctx, strike[0], strike[1], age, dense, flash, direction);
  }

  function telegraph(ctx, shape, age, x, y) {
    if (shape === 'off' || age < 70 || age >= 480) return;
    const width = shape === 'circle' ? 22 : 30, height = shape === 'circle' ? 12 : 10;
    const color = age >= 350 ? '#ffb584' : '#f77d63';
    for (let dy = -height; dy <= height; dy++) for (let dx = -width; dx <= width; dx++) {
      const ellipse = (dx / width) ** 2 + (dy / height) ** 2;
      const edge = shape === 'circle' ? ellipse >= .78 && ellipse <= 1 : Math.abs(dx) === width || Math.abs(dy) === height;
      const sparse = (dx + dy * 3) % 17 === 0 && (shape !== 'circle' || ellipse <= .78);
      if (edge) {
        pixel(ctx, x + dx - 1, y + dy - 1, 3, 3, ink);
        pixel(ctx, x + dx, y + dy, 2, 2, color);
      } else if (sparse) pixel(ctx, x + dx, y + dy, 1, 1, '#743d3b');
    }
  }

  window.tavernMotionEffects = { action, telegraph, timing };
})();
