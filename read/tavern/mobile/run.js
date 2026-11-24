import { applyCardTransaction, enterCardVisit, expeditionPreparation, initializePiece, mergeCardProgress } from './prepare.js';
import { captainCollection } from '../home/captain-packs.js';
import { readSettings } from '../home/settings.js';
import { eligibleCompany, companyPlan, companyRule, companyTrade } from './company-rules.js';
import { factions } from '../prep-intel.js';
import { commandNames, commands } from './company-captains.js';

const editorPreview = location.origin === 'http://localhost:17869';
export const nativeEdition = (editorPreview || location.hostname === 'appassets.androidplatform.net')
  && location.pathname.startsWith('/mobile-game/');

const runKey = version => `tavern-heros.mobile.run.v${version}`;
const departureGuideKey = 'tavern-heros.mobile.departure-guide-seen.v1';
const sizes = [3, 4, 4, 5, 6];
const upgrades = [5, 7, 8, 9];
const shuffle = items => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function savedRun() {
  for (const version of [2,1]) try {
    const value = JSON.parse(localStorage.getItem(runKey(version)));
    if ((value?.version ?? 1) !== version) continue;
    if (value?.id && value.deck?.length === 6 && value.waves?.length === 15 &&
        value.round >= 1 && value.round <= 15 && sizes[value.level - 1] &&
        ['prep', 'battle', 'result'].includes(value.phase)) return value;
  } catch {
    // A corrupt local save is isolated from the next expedition.
  }
  return null;
}

export function guardHomeDuringExpedition() {
  if (!nativeEdition) return;
  function resume() {
    const state = savedRun();
    if (!state) return;
    const screen = document.querySelector('main.game-screen');
    if (screen) screen.inert = true;
    const next = state.phase === 'result' ? './result.html' : '../prep-landscape.html';
    location.replace(new URL(next, import.meta.url));
  }
  window.addEventListener('pageshow', event => { if (event.persisted) resume(); });
  resume();
}

export async function openRun(captain) {
  let state = savedRun();
  const company = !state || state.version === 2;
  const key = runKey(company ? 2 : 1);
  const response = await fetch(new URL(company ? 'companies.json' : 'catalog.json', import.meta.url));
  if (!response.ok) throw new Error('원정 목록을 불러오지 못했습니다.');
  const catalog = await response.json();
  const soldiers = new Map(catalog.units?.map(u=>[u.id,u]));
  if(company) for(const card of catalog.cards)card.companyLabel=card.companyName??factions[card.faction].name;
  const cards = new Map(catalog.cards.map(card => [card.id, card]));
  if(company)cards.unitNames=new Map(catalog.units.map(u=>[u.id,u.name]));
  const waves = new Map(catalog.waves.map(wave => [wave.id, wave]));
  function save() {
    localStorage.setItem(key, JSON.stringify(state));
  }
  const eligibleCards = () => catalog.cards.filter(card => company ? eligibleCompany(card,state) :
    card.tier <= state.level && state.factions.includes(card.faction));
  function offers(count, avoid = [], excluded = null) {
    const pool = shuffle(eligibleCards().filter(card => card.id !== excluded));
    const ordered = [...pool.filter(card => !avoid.includes(card.id)), ...pool.filter(card => avoid.includes(card.id))];
    return ordered.slice(0, count).map(card => card.id);
  }
  if (!state) {
    const collection = await captainCollection();
    if (!collection.owned.includes(captain)) captain = collection.selected;
    const expedition = Array.from({length: 15}, (_, i) =>
      shuffle(catalog.waves.filter(wave => wave.round === i + 1))[0].id);
    state = {
      id: globalThis.crypto.randomUUID(), captain, version:2, factions:[4,3,0,5,shuffle([1,2,6])[0]], mix:shuffle([0,1,2])[0],
      phase: 'prep', round: 1, level: 1, upgradeOpenedRound: 1, gold: 3, erosion: 0, scrap: 0,
      formation: 'column', deck: Array(6).fill(null), orders: [], waves: expedition, wins: 0,
    };
    state.offers = offers(sizes[0]);
    save();
  } else if (state.upgradeOpenedRound == null || !Array.isArray(state.orders) || state.deck.some(piece => piece && !piece.key)) {
    state.upgradeOpenedRound ??= state.level === 1 ? 1 : state.round;
    if (!Array.isArray(state.orders)) state.orders = [];
    for (const piece of state.deck) if (piece && !piece.key) piece.key = crypto.randomUUID();
    save();
  }
  function plan(orders) {
    if(company)return companyPlan(state,cards,waves.get(state.waves[state.round-1]),orders);
    return expeditionPreparation(state, cards, waves.get(state.waves[state.round - 1]).enemies ?? [], orders);
  }
  function savePlan() {
    state.orders = plan().applied;
    save();
  }
  function hirePlan(id, replace = -1) {
    if (state.phase !== 'prep' || !cards.has(id)) return null;
    const matches = state.deck.flatMap((item, slot) => item?.id === id && !item.golden ? [slot] : []);
    const empty = state.deck.indexOf(null);
    const freesSlot = empty < 0 && Boolean(state.deck[replace]) && matches.length < 2;
    const cost = 3 - Number(freesSlot);
    if (plan().gold < cost || (empty < 0 && matches.length < 2 && !freesSlot)) return null;
    return { id, matches, slot: freesSlot ? replace : empty, cost };
  }
  function hire({ id, matches, slot, cost }) {
    const hireOrder = (state.hireOrder ?? 0) + 1;
    state.hireOrder = hireOrder;
    let hired;
    if (matches.length >= 2) {
      const [lead, consumed] = matches;
      const a = state.deck[lead], b = state.deck[consumed];
      if (state.captainAction?.target === b.key) state.captainAction.target = a.key;
      a.golden = true;
      if(company){
        const left=a.army??cards.get(id).members, right=b.army??cards.get(id).members;
        a.army=[...(right.length>left.length?right:left)];
        for(const field of ['rank','attackPct','healthPct','fire','essence'])a[field]=Math.max(a[field]??0,b[field]??0) || undefined;
      } else mergeCardProgress(a, b);
      const earlier = Math.min(...[a, b].filter(piece => piece.hiredRound === state.round)
        .map(piece => piece.hireOrder || hireOrder), hireOrder);
      a.hiredRound = state.round;
      a.hireOrder = earlier;
      hired = a;
      state.orders = state.orders.map(order => ({ ...order,
        source: order.source === b.key ? a.key : order.source,
        target: order.target === b.key ? a.key : order.target,
        second: order.second === b.key ? a.key : order.second,
      }));
      if (!state.cardHistory?.[a.key] && state.cardHistory?.[b.key]) state.cardHistory[a.key] = state.cardHistory[b.key];
      state.deck[consumed] = null;
    } else {
      if (state.deck[slot]) {
        if(company)companyTrade(state,cards,'sell',cards.get(state.deck[slot].id));
        else applyCardTransaction(state, cards, state.deck[slot].key, 'sell');
      }
      hired = { id, key: crypto.randomUUID(), form: 'Human', hiredRound: state.round, hireOrder };
      if(company)hired.army=[...cards.get(id).members]; else initializePiece(hired);
      state.deck[slot] = hired;
    }
    state.gold -= cost;
    if(company)companyTrade(state,cards,'hire',cards.get(id),3);
    else applyCardTransaction(state, cards, hired.key, 'hire');
  }

  const currentWave = () => waves.get(state.waves[state.round - 1]);
  const powerUsed = () => state.shopPowerRound === state.round;
  const sealed = index => currentWave().powerId === 'Seal' &&
    index >= state.offers.length - Math.min(currentWave().powerRank === 3 ? 2 : 1, Math.max(0, state.offers.length - 3));
  const rerollPrice = () => currentWave().powerId === 'Frost' && !powerUsed() ? 2 : 1;

  function affectedTables(exclude = -1) {
    const { powerId, powerRank } = currentWave();
    if (powerUsed() || !['Vortex', 'Devour'].includes(powerId)) return [];
    const eligible = state.offers.flatMap((id, index) =>
      id && index !== exclude && !sealed(index) ? [index] : []).reverse();
    return eligible.slice(0, powerId === 'Devour' ? Math.min(powerRank, Math.max(0, eligible.length - 1)) : powerRank);
  }

  function applyHirePower(generalHire) {
    const { powerId } = currentWave();
    if (powerUsed() || !(powerId === 'Vortex' || (powerId === 'Devour' && generalHire))) return;
    const indices = affectedTables();
    const replacements = powerId === 'Vortex' ? offers(indices.length, state.offers) : [];
    for (const [i, index] of indices.entries()) state.offers[index] = replacements[i] ?? null;
    if (powerId === 'Devour') state.devouredTables = indices;
    state.shopPowerRound = state.round;
  }

  const activeCaptains = ['rowan', 'thorin', 'sera'];
  function captainReason() {
    if(company){
      const id=state.captain;
      if(id==='edda')return '';
      if(state.phase!=='prep')return '선술집에서 사용할 수 있습니다.';
      if(commandNames[id][1]==='액티브'&&state.command)return '이번 방문에 이미 사용했습니다.';
      if(id==='rowan'&&state.round>1&&state.gold<1)return '모병에 1골드가 필요합니다.';
      return commands(state,cards,currentWave(),sealed).length?'':'조건을 만족하는 대상이 없습니다.';
    }
    if (!activeCaptains.includes(state.captain)) return '';
    if (state.phase !== 'prep') return '선술집에서 사용할 수 있습니다.';
    const action = state.captainAction;
    if (state.captain === 'rowan') {
      if ((action?.nextRound ?? 1) > state.round) return `${action.nextRound}라운드부터 다시 사용할 수 있습니다.`;
      if (plan().gold < 3) return '고용에 3골드가 필요합니다.';
      return '';
    }
    if (action?.usedRound === state.round) return '이번 방문에 이미 사용했습니다.';
    if (state.captain === 'thorin') {
      if (!state.deck.some(Boolean)) return '점검할 아군 기물이 필요합니다.';
      if (plan().gold < 1) return '점검에 1골드가 필요합니다.';
    }
    if (state.captain === 'sera' && !state.offers.some((id, i) => id && !sealed(i) && eligibleCards().some(card => card.id !== id)))
      return '바꿀 수 있는 고용 제안이 없습니다.';
    return '';
  }

  function captainChoices() {
    if(company)return captainReason()?[]:commands(state,cards,currentWave(),sealed);
    if (!activeCaptains.includes(state.captain) || captainReason()) return [];
    if (state.captain === 'rowan') {
      const action = state.captainAction ??= {};
      if (action.offerRound !== state.round) {
        action.offerRound = state.round;
        action.offers = offers(2, state.offers);
        save();
      }
      return action.offers.map(id => ({
        value: id, label: `${cards.get(id).name} · 3골드`,
        disabled: !hirePlan(id),
      }));
    }
    if (state.captain === 'thorin') {
      return state.deck.flatMap((piece, i) => piece ? [{ value: piece.key, label: `${i + 1}번 · ${cards.get(piece.id).name}` }] : []);
    }
    return state.offers.flatMap((id, i) => id && !sealed(i) && eligibleCards().some(card => card.id !== id) ?
      [{ value: String(i), label: `${i + 1}번 탁자 · ${cards.get(id).name}` }] : []);
  }

  function useCaptainAbility(value) {
    if(company){
      const choice=captainChoices().find(c=>c.value===value);if(!choice)return '';
      const [key,mode]=value.split('/'),cmd={key,mode,value},id=state.captain;
      if(id==='rowan'&&state.round>1)state.gold--;
      if(id==='thorin'){
        const piece=state.deck.find(p=>p?.key===key);
        cmd.changed=!!piece.gearMode;piece.gearMode=mode;
      }
      if(id==='sera'){
        const open=state.offers.flatMap((_,i)=>!sealed(i)&&String(i)!==value?[i]:[]);
        const drawn=offers(open.length,state.offers);
        open.forEach((slot,i)=>{state.offers[slot]=drawn[i];});cmd.marked=open;
      }
      state.command=cmd;save();return choice.label;
    }
    if (!activeCaptains.includes(state.captain) || captainReason()) return '';
    const action = state.captainAction ??= {};
    let message;
    switch (state.captain) {
      case 'rowan': {
        if (action.offerRound !== state.round || !action.offers?.includes(value)) return '';
        const offer = hirePlan(value);
        if (!offer) return '';
        hire(offer);
        applyHirePower(false);
        action.nextRound = state.round + 3;
        message = `${cards.get(value).name} · 징집 완료`;
        break;
      }
      case 'thorin': {
        const piece = state.deck.find(item => item?.key === value);
        if (!piece) return '';
        state.gold -= 1;
        action.target = value;
        message = `${cards.get(piece.id).name} · 점검 완료`;
        break;
      }
      case 'sera': {
        const index = state.offers.findIndex((id, i) => id && !sealed(i) && String(i) === value);
        if (index < 0) return '';
        const replacement = offers(1, state.offers, state.offers[index])[0];
        if (!replacement) return '';
        state.offers[index] = replacement;
        message = `${index + 1}번 탁자 제안 교체`;
        break;
      }
    }
    action.usedRound = state.round;
    savePlan();
    return message;
  }

  const resultUrl = new URL('./result.html', import.meta.url);
  const result = {
    get state() { return state; },
    get captainInfo() {return company?commandNames[state.captain]:null;},
    get wave() { return currentWave(); },
    get showDepartureGuide() {
      return state.round === 1 && localStorage.getItem(departureGuideKey) !== '1';
    },
    get rerollPrice() { return rerollPrice(); },
    sealed,
    affectedTables,
    devoured(index) { return state.devouredTables?.includes(index) === true; },
    get previewWaves() {
      return state.waves.slice(state.round - 1, state.round + 2).map(id => waves.get(id));
    },
    get gold() { return plan().gold; },
    get upgradeCost() {
      const baseCost = upgrades[state.level - 1];
      if (baseCost == null) return null;
      const roundsWaited = state.round - state.upgradeOpenedRound;
      if(company&&state.command?.value==='discount'&&!state.command.paid&&baseCost>roundsWaited)return Math.max(1,baseCost-roundsWaited-2);
      return Math.max(0, baseCost - roundsWaited - Number(!company&&state.captain === 'bryn'));
    },
    group(piece) {
      if (!piece) return null;
      const card = cards.get(piece.id);
      if (!card) return null;
      if(company){
        const army=piece.army??card.members;
        const units=[...new Set(army)].map(id=>({...soldiers.get(id),count:army.filter(s=>s===id).length}));
        const makeCopy=gold=> {
          const [normal,extra]=card.rule.split(/(?:황금은 |황금 )/);
          return [normal.replace(/(\+?\d+)%\s*\/\s*(\+?\d+)%/g,(_,a,b)=>(gold?b:a)+'%').trim(),
            gold&&extra,companyRule(card)].filter(Boolean).join(' ');
        };
        return {...card,units,total:army.length,yardMembers:army,owner:piece.key,
          golden:!!piece.golden,effect:makeCopy(false),goldenEffect:makeCopy(true)};
      }
      const kind = piece.golden && card.tier === 5 && card.mechanic === 'Shapeshift' ? 'Hybrid' : piece.form;
      const form = card.forms.find(item => item.kind === kind) ?? card.forms[0];
      const permanent = (piece.reinforcements ?? []).slice(0, 4 - form.units.length);
      const reinforcements = permanent.map(unit => ({ ...unit, width: 64, height: 64, isNew: true }));
      const units=[...form.units, ...reinforcements].map(unit=>({...unit,...catalog.skins?.[unit.id],isNew:true}));
      return { ...card, golden: Boolean(piece.golden),units,owner:piece.key,
        yardMembers:units.map(unit=>unit.skinId) };
    },
    update() { savePlan(); },
    abilities(slot) { return plan().abilities(slot); },
    captainReason,
    captainChoices,
    useCaptainAbility,
    pieceStatus(slot) {
      const prepared = plan();
      const piece = prepared.bySlot(slot);
      if (!piece) return '';
      const stats = [prepared.status(slot)].filter(Boolean);
      if (state.captain === 'thorin' && state.captainAction?.usedRound === state.round &&
          state.captainAction.target === piece.key) stats.push('현장 점검 · 주력 공격력 +1, 체력 +2');
      if (!stats.length) return prepared.abilities(slot).length ? '' : '기물 효과는 조건을 충족하면 자동 발동합니다.';
      return stats.join(' · ');
    },
    applyAbility(slot, kind, target, second) {
      if (state.phase !== 'prep' || !state.deck[slot]) return false;
      const prepared = plan();
      if(company){
        const action=prepared.abilities(slot).find(a=>a.kind===kind);
        if(!action || action.choices && !action.choices.some(c=>c.value===target))return false;
        state.orders=[...state.orders.filter(o=>o.kind!==kind),{kind,source:state.deck[slot].key,target}];save();return true;
      }
      if (kind === 'form') {
        if (!prepared.describe(slot, kind)) return false;
        state.deck[slot].form = state.deck[slot].form === 'Animal' ? 'Human' : 'Animal';
        savePlan();
        return true;
      }
      const order = prepared.command(slot, kind, target, second);
      const matches = current => current.kind === kind && (kind === 'hunt' || current.source === order.source);
      const previous = state.orders.findIndex(matches);
      const orders = [...state.orders];
      orders.splice(previous < 0 ? orders.length : previous, previous < 0 ? 0 : 1, order);
      const changed = plan(orders);
      if (!changed.applied.includes(order)) return false;
      state.orders = changed.applied;
      save();
      return true;
    },
    cancelAbility(slot, kind) {
      if (state.phase !== 'prep') return;
      state.orders = state.orders.filter(order => order.kind !== kind || order.source !== state.deck[slot]?.key);
      savePlan();
    },
    roll() {
      const cost = rerollPrice();
      if (state.phase !== 'prep' || this.gold < cost) return false;
      state.gold -= cost;
      if(company)companyTrade(state,cards,'roll',null,cost);
      if (cost > 1) state.shopPowerRound = state.round;
      const next = offers(sizes[state.level - 1], state.offers);
      state.offers = next.map((id, i) => sealed(i) ? state.offers[i] : id);
      if(company&&state.command?.marked)state.command.marked=state.command.marked.filter(i=>sealed(i));
      state.devouredTables = [];
      save();
      return true;
    },
    upgrade() {
      const cost = this.upgradeCost;
      if (state.phase !== 'prep' || cost == null || this.gold < cost) return false;
      state.gold -= cost;
      if(company)companyTrade(state,cards,'upgrade',null,cost);
      if(company&&state.command?.value==='discount'&&cost>0)state.command.paid=true;
      state.level += 1;
      state.upgradeOpenedRound = state.round;
      const added = sizes[state.level - 1] - state.offers.length;
      state.offers.push(...offers(added, state.offers));
      save();
      return true;
    },
    buy(index, replace = -1) {
      if (sealed(index)) return false;
      const offer = hirePlan(state.offers[index], replace);
      if (!offer) return false;
      hire(offer);
      if(company&&state.command?.marked?.includes(index) && !state.command.markedHire)
        state.command.markedHire=state.deck.find(p=>p?.hireOrder===state.hireOrder)?.key ?? state.deck[offer.matches[0]]?.key;
      state.offers[index] = null;
      applyHirePower(true);
      savePlan();
      return true;
    },
    sell(slot) {
      if (state.phase !== 'prep' || !state.deck[slot]) return false;
      if(company)companyTrade(state,cards,'sell',cards.get(state.deck[slot].id));
      else applyCardTransaction(state, cards, state.deck[slot].key, 'sell');
      state.deck[slot] = null;
      state.gold += 1;
      savePlan();
      return true;
    },
    async launch() {
      if (!state.deck.some(Boolean) || state.phase === 'result') return;
      state.phase = 'battle';
      save();
      const prepared = plan();
      const volumes = readSettings();
      const payload = JSON.stringify({
        id: state.id, round: state.round, wave: this.wave.id, line: state.formation === 'line',
        captain: state.captain, scrap: state.scrap, scrapEarned: state.scrapEarned ?? 0, gold: state.gold,
        hasAudioSettings: true, musicVolume: volumes.music, effectsVolume: volumes.effects,
        inspectedSlot: state.captain === 'thorin' && state.captainAction?.usedRound === state.round ?
          state.deck.findIndex(piece => piece?.key === state.captainAction.target) + 1 : 0,
        ...(company?{version:2,teams:prepared.teams}:{preparation:prepared.deployment()}), deck: state.deck.map(piece =>
          piece ? { id: piece.id, form: piece.form, golden: !!piece.golden } : { id: '' }),
      });
      try {
        const url = new URL('../launch', import.meta.url);
        url.searchParams.set('deployment', payload);
        const reply = await fetch(url, { cache: 'no-store' });
        if (!reply.ok) throw new Error();
        if (editorPreview) this.finish(await reply.json());
      } catch {
        this.reject();
      }
    },
    reject() {
      if (state.phase !== 'battle') return;
      state.phase = 'prep';
      save();
      window.dispatchEvent(new Event('tavern-launch-rejected'));
    },
    finish(waveResult) {
      if (state.phase !== 'battle' || waveResult.id !== state.id || waveResult.round !== state.round) return;
      const previous = state.erosion;
      if (waveResult.outcome === 'Loss') state.erosion = Math.min(100, previous + 8 + 2 * (state.round - 1));
      if (waveResult.outcome === 'Win') state.wins += 1;
      if(company){
        const committed=plan();
        state.deck=committed.deck;
        state.spirit=committed.spirit;
        for(const [i,p] of state.deck.entries())if(p&&cards.get(p.id).company==='fang'){
          p.lastEssence=Math.min(3,waveResult.essence?.[i]??0);
          p.essence=Math.min(9,(p.essence??0)+p.lastEssence);
        }
      } else if (waveResult.history?.length === state.deck.length) {
        const committed = plan().settlement();
        state.deck = committed.deck;
        state.scrap = committed.scrap;
        state.gold = committed.gold;
        state.cardProgress = committed.progress;
        state.scrapEarned = committed.scrapEarned;
        const keyAt = index => state.deck[index]?.key;
        state.cardHistory = Object.fromEntries(state.deck.flatMap((piece, i) => {
          if (!piece) return [];
          const history = waveResult.history[i];
          return [[piece.key, { ...history, target: keyAt(history.target),
            rallyTargets: history.rallyTargets.map(keyAt).filter(Boolean),
            rallyBlocked: history.rallyBlocked.map(keyAt).filter(Boolean) }]];
        }));
      } else {
        state.deck = state.deck.map((piece, i) => piece && {
          ...piece, ...waveResult.deck[i], lastDeployedRound: state.round,
        });
        state.scrap = waveResult.scrap;
      }
      state.last = { outcome: waveResult.outcome, previous, erosion: state.erosion,
        allies: waveResult.allies, enemies: waveResult.enemies, tick: waveResult.tick };
      state.ended = state.erosion >= 100 || state.round >= 15;
      state.phase = 'result';
      save();
      if (state.round === 1) localStorage.setItem(departureGuideKey, '1');
      location.replace(resultUrl);
    },
    next() {
      if (state.phase !== 'result' || state.ended) return false;
      state.round += 1;
      state.gold = state.round + 2;
      state.orders = [];
      state.devouredTables = [];
      state.hireOrder = 0;
      if(company){state.ledger=null;state.command=null;}else enterCardVisit(state, cards);
      state.phase = 'prep';
      state.offers = offers(sizes[state.level - 1]);
      save();
      return true;
    },
    clear() {
      if (!state.ended) return false;
      localStorage.removeItem(key);
      return true;
    },
  };
  return result;
}
