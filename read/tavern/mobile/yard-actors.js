// Runtime 2D actors for the WebView yard. Each use is one soldier, with its own
// transform and animation clock. A species shares the battle clip's pose geometry.
const ns = 'http://www.w3.org/2000/svg';
const svg = name => document.createElementNS(ns, name);
const WIDTH = 186, HEIGHT = 61;
const num = n => Math.round(n * 1000) / 1000;
function hash(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

function place(actors, models, depthBudget) {
  // Use the entire loop's bounds, not the current pose, so boots never drift.
  const bounds = actors.map(a => models.get(a.id)?.data?.bounds);
  if (bounds.some(b => !b)) return false;
  // A model keeps its original two-recruit scale even when a different (larger)
  // species joins. Only foot positions depend on the company size.
  const sizes = bounds.map(([l,t,r,b]) => {
    const w = 2*Math.max(-l,r), h = b-t;
    const scale = Math.min(2,(HEIGHT-2)/h,(WIDTH-4)/(2*w+3));
    return {scale,w:w*scale,h:h*scale,b:b*scale};
  });
  const width=Math.max(...sizes.map(s=>s.w)), height=Math.max(...sizes.map(s=>s.h));
  const n=actors.length;
  const comfortable=1+Math.floor((WIDTH-4-width)/(width*.92));
  const cols=n<=2?n:Math.min(Math.ceil(n/2),Math.max(3,comfortable,Math.ceil(n/5)));
  const rows=Math.ceil(n/cols);
  const stagger=rows>1 ? .48 : 0;
  const dx=Math.min(width*(n===2 ? .85 : .96),(WIDTH-4-width)/Math.max(1,cols-1+stagger));
  const dy=Math.min(height*.57,depthBudget/Math.max(1,rows-1));
  const layers=[];
  let i=0;
  for(let depth=0;depth<rows;depth++){
    // Keep the original hires at the front centre; new soldiers fill the sides and back.
    const count=Math.floor(n/rows)+Number(depth<n%rows);
    const columns=Array.from({length:count},(_,col)=>col)
      .sort((a,b)=>Math.abs(a-(count-1)/2)-Math.abs(b-(count-1)/2)||a-b);
    const rank=[];
    for(const col of columns){
      const s=sizes[i];
      const x=WIDTH/2+(col-(count-1)/2+(depth%2?1:-1)*stagger/2)*dx;
      const y=HEIGHT-1-s.b-depth*dy-(n===2 && i===1?height*.12:0);
      actors[i].node.setAttribute('transform',`translate(${num(x)} ${num(y)}) scale(${num(s.scale)})`);
      actors[i].node.dataset.member=i;
      rank.unshift(actors[i++].node);
    }
    layers.unshift(rank);
  }
  actors[0].node.parentNode.replaceChildren(...layers.flat());
  return true;
}

export function createYardActors(stage, inPrep) {
  const library = svg('svg'), definitions = svg('defs');
  library.classList.add('yard-model-library');
  library.setAttribute('width','0'); library.setAttribute('height','0');
  library.setAttribute('aria-hidden','true');library.setAttribute('focusable','false');
  library.append(definitions); stage.append(library);
  const models = new Map(), squads = new Map();
  let timer = 0, paint = 0, suspended = false;
  function stop() { clearTimeout(timer); cancelAnimationFrame(paint); timer = paint = 0; }
  function wake() {
    if (paint || suspended || document.hidden || !inPrep()) return;
    clearTimeout(timer);timer = 0;
    paint = requestAnimationFrame(render);
  }
  function getModel(id) {
    if (models.has(id)) return;
    const model = {data:null, poses:[]};
    models.set(id,model);
    fetch(new URL(`../media/unit-sprites/yard-models/${encodeURIComponent(id)}.json`,import.meta.url))
      .then(r => {if(!r.ok)throw Error(`${r.status}`);return r.json();})
      .then(data => {model.data=data;wake();})
      .catch(error => {console.error(`대기장 병종을 읽을 수 없습니다: ${id}`,error);});
  }
  function mount(id, model) {
    if (model.poses.length) return;
    const fragment = document.createDocumentFragment();
    model.data.poses.forEach((pose,i) => {
      const g = svg('g');g.id=`yard-idle-${id}-${i}`;
      for(const [color,outline] of pose) {
        const p=svg('path');p.setAttribute('fill',model.data.colors[color]);p.setAttribute('d',outline);g.append(p);
      }
      fragment.append(g);model.poses.push(g);
    });
    definitions.append(fragment);
  }
  function render(now) {
    paint = 0;
    if (suspended || document.hidden || !inPrep()) return;
    const active = new Set();
    const depthBudget=stage.dataset.view==='deck'?50:32;
    let next = Infinity;
    for (const [key,s] of squads) {
      if (!s.root.isConnected) {squads.delete(key);continue;}
      for (const a of s.actors) active.add(a.id);
      if (!s.placed || s.depthBudget!==depthBudget) {
        s.placed=place(s.actors,models,depthBudget);
        s.depthBudget=depthBudget;
      }
      if (!s.placed) continue;
      for (const a of s.actors) {
        const m=models.get(a.id);mount(a.id,m);
        const ms=m.data.ms, at=now+a.offset;
        const pose=Math.floor(at/ms)%m.poses.length;
        if (a.frame!==pose) {
          a.node.setAttribute('href','#'+m.poses[pose].id);a.frame=pose;
        }
        next=Math.min(next,ms-at%ms);
      }
    }
    // Keep decoded geometry available for a rehire; retire hidden SVG trees.
    for(const [id,m] of models) if(!active.has(id)&&m.poses.length) {
      for(const g of m.poses)g.remove();
      m.poses=[];
    }
    if(Number.isFinite(next))timer=setTimeout(wake,Math.max(16,Math.ceil(next)));
  }
  function squad(owner, ids, drag=false) {
    const key=(drag?'drag:':'piece:')+owner;
    let s=squads.get(key);
    if (!s) {
      const root=document.createElement('span'), scene=svg('svg');
      root.className='prep-sprites yard-squad';root.setAttribute('aria-hidden','true');
      scene.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);
      scene.setAttribute('preserveAspectRatio','xMidYMax meet');scene.setAttribute('focusable','false');
      root.append(scene);
      s={root,scene,actors:[],signature:null,placed:false};squads.set(key,s);
    }
    const signature=ids.join('/');
    if(s.signature!==signature){
      const old=new Map(s.actors.map(a=>[a.key,a])),occurrences=new Map();
      s.actors=ids.map(id=>{
        const n=occurrences.get(id)??0;occurrences.set(id,n+1);
        const actorKey=`${id}:${n}`;
        if(old.has(actorKey))return old.get(actorKey);
        getModel(id);
        const node=svg('use');node.dataset.model=id;
        return {key:actorKey,id,node,frame:-1,offset:hash(`${owner}/${actorKey}`)%8000};
      });
      s.scene.replaceChildren(...s.actors.map(a=>a.node));s.placed=false;s.signature=signature;
      s.root.toggleAttribute('data-ranked',ids.length>2);
    }
    wake();return s.root;
  }
  document.addEventListener('visibilitychange',()=>document.hidden?stop():wake());
  window.addEventListener('pagehide',()=>{suspended=true;stop();});
  window.addEventListener('pageshow',()=>{suspended=false;wake();});
  window.addEventListener('tavern-launch-rejected',wake);
  return {squad,wake};
}
