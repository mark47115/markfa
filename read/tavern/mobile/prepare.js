import { cardRules, primaryGrowth, targetModes } from './card-rules.js';

const meterFields = { blessing: 18, gear: 3, charge: 4, trophies: 10, growth: 6 };
const mechanicNames = {
  Shapeshift: '숙련', Reforge: '담금질', Pursuit: '추적 기록', Guard: '공훈',
  Retribution: '서약', Production: '개량', Overload: '안정화', Supply: '납품 신용',
  Escort: '운송 기록', Rage: '전공', Rally: '메아리',
};
const actions = ['target', 'saleTarget', 'form', 'rewardForm', 'gear', 'reforge', 'overload', 'hunt', 'inherit'];
const unitSupports = {
  'work-robot': { ranged: false },
  'reforged-shieldbearer': { ranged: false },
  'alloy-spearman': { ranged: false },
};

export const cardProgress = state => state.cardProgress ??= { first: {}, inherited: {}, purchased: {}, sold: {}, sales: [] };

export function initializePiece(piece) {
  for (const [field, limit] of Object.entries(meterFields))
    piece[field] = Math.min(limit, Math.max(0, piece[field] ?? 0));
  piece.form ||= 'Human';
  piece.previousForm ||= 'Human';
  if (!Array.isArray(piece.reinforcements)) {
    piece.reinforcements = Array.from({ length: Math.min(2, piece.robots ?? 0) }, () => ({
      id: 'work-robot', name: '작업 로봇', attack: 1, health: 3, kind: 'Robot', ranged: false,
    }));
  }
  piece.productionHistory ??= [];
  return piece;
}

export function mergeCardProgress(first, second) {
  initializePiece(first);
  initializePiece(second);
  first.blessing = Math.min(18, first.blessing + second.blessing);
  for (const field of ['gear', 'charge', 'trophies', 'growth', 'gearDiscount', 'lastDeployedRound'])
    first[field] = Math.max(first[field] ?? 0, second[field] ?? 0);
  if (second.reinforcements.length > first.reinforcements.length) first.reinforcements = second.reinforcements;
  first.productionHistory = [...new Set([...first.productionHistory, ...second.productionHistory])];
}

function distance(a, b, columns) {
  return Math.abs(a.slot % columns - b.slot % columns) +
    Math.abs(Math.floor(a.slot / columns) - Math.floor(b.slot / columns));
}

function visit(state, cards) {
  const progress = cardProgress(state);
  const columns = state.formation === 'line' ? 3 : 2;
  const party = state.deck.flatMap((piece, slot) => {
    const card = piece && cards.get(piece.id);
    if (!card) return [];
    initializePiece(piece);
    const previous = state.cardHistory?.[piece.key] ??
      (piece.lastDeployedRound > 0 && piece.lastDeployedRound === state.round - 1 ? {} : undefined);
    const form = piece.golden && card.id === 'Shapeshift-5-0' ? 'Hybrid' : piece.form;
    const originals = (card.forms.find(candidate => candidate.kind === form) ?? card.forms[0]).units;
    const members = originals.map(unit => ({ id: unit.id, name: unit.name, attack: unit.attack,
      health: unit.health, ranged: !!unit.ranged, guard: !!unit.guard, kind: 'Original', bonus: {} }));
    members.push(...piece.reinforcements.slice(0, 4 - originals.length).map(unit => ({ ...unit, bonus: {} })));
    return [{
      card, piece, slot, key: piece.key, form, originals: originals.length, golden: !!piece.golden,
      changed: form !== piece.previousForm, previous, members,
      hired: piece.hiredRound === state.round, suppliedBy: [], rallyTargets: [],
      rage: Math.min(6, state.cardHistory?.[piece.key]?.rageHits ?? 0), blessingAdded: piece.blessingAdded ?? 0,
      get robotCount() { return this.members.filter(unit => unit.kind === 'Robot' ||
        (unit.kind === 'Original' && this.card.mechanic === 'Production')).length; },
      get hasWorkRobot() { return this.members.some(unit => unit.id === 'work-robot'); },
    }];
  });
  const byKey = new Map(party.map(item => [item.key, item]));
  const bySlot = slot => party.find(item => item.slot === slot);
  const orders = state.orders ?? [];
  const findOrder = (source, kind) => orders.find(order => order.source === source.key && order.kind === kind);
  const huntOrder = orders.find(order => order.kind === 'hunt' && byKey.get(order.source)?.card.mechanic === 'Hunt');
  const hunter = huntOrder ? byKey.get(huntOrder.source) : null;

  function eligible(source, kind = 'target') {
    const rule = cardRules[source.card.id];
    const mode = kind === 'saleTarget' ? rule.saleSelect : rule.select;
    if (!mode || mode === targetModes.noTarget) return [];
    if (mode === targetModes.hunt) return hunter && hunter !== source ? [hunter] : [];
    return party.filter(target => {
      if (target === source && !rule.includeSelf) return false;
      if ((mode === targetModes.same || mode === targetModes.nearSame) &&
          target.card.mechanic !== source.card.mechanic) return false;
      if ((mode === targetModes.neighbor || mode === targetModes.nearSame) &&
          distance(source, target, columns) > (source.card.id === 'Rally-5-0' && source.golden ? 2 : 1)) return false;
      return !rule.qualify || rule.qualify(target);
    });
  }

  function selected(source, kind = 'target', fallback = true) {
    const choices = eligible(source, kind);
    const stored = findOrder(source, kind)?.target ?? source.piece[kind + 'Key'];
    if (stored) {
      const match = choices.find(option => option.key === stored);
      if (match || source.card.mechanic !== 'Escort') return match ?? null;
    }
    return fallback ? choices.find(option => option !== source) ?? choices[0] ?? null : null;
  }

  function earnScrap(amount) {
    const gained = Math.max(0, Math.min(amount, 6 - state.scrap, 3 - (state.scrapEarned ?? 0)));
    state.scrap += gained;
    state.scrapEarned = (state.scrapEarned ?? 0) + gained;
    return gained;
  }

  function buff(source, target, values, scope = 0) {
    if (!target) return false;
    const members = typeof scope === 'number' ? target.members.slice(scope, scope + 1) : target.members.filter(unit => {
      if (scope === 'originals') return unit.kind === 'Original';
      if (scope === 'reforged') return unit.kind === 'Reforged';
      if (scope === 'newReforged') return unit.kind === 'Reforged' && unit.fresh;
      return unit.id === 'work-robot';
    });
    if (scope === 'workRobot') members.splice(1);
    let applied = false;
    for (const member of members) {
      for (const [stat, amount] of Object.entries(values)) {
        if (amount <= 0) continue;
        const key = source.card.id + ':' + stat;
        const previous = member.bonus[key];
        if (!previous || amount > previous.amount || (amount === previous.amount && source.slot < previous.slot))
          member.bonus[key] = { stat, amount, slot: source.slot };
        applied = true;
      }
    }
    return applied;
  }

  function shield(source, target, amount, family, scope = 0) {
    if (!target || amount <= 0) return false;
    const affected = scope === 'originals' ? target.members.slice(0, target.originals) : target.members.slice(0, 1);
    for (const member of affected) {
      const key = family === 'guard' ? `guard:${source.card.id}` : family;
      const previous = member.bonus[key];
      if (!previous || amount > previous.amount || (amount === previous.amount && source.slot < previous.slot))
        member.bonus[key] = { stat: 'shield', amount, slot: source.slot, family };
    }
    return affected.length > 0;
  }

  function produce(source, target, name, options = {}) {
    if (!target || source.produced || target.received || target.members.length >= 4) return false;
    const origin = options.origin ?? source.card.id;
    const history = name === '작업 로봇' || origin.startsWith('Shapeshift-') ? origin + '/' + name : origin;
    if (target.piece.productionHistory.includes(history)) return false;
    if ((options.scrap ?? 0) > state.scrap || (options.charge ?? 0) > target.piece.charge) return false;
    const fallback = source.card.forms.find(form => form.kind === (source.form === 'Hybrid' ? 'Human' : source.form)) ??
      source.card.forms[0];
    const id = options.id ?? fallback.units[1].id;
    const formUnit = unitSupports[id] ?? source.unitsById.get(id) ?? fallback.units[1];
    const unit = { id, name, attack: options.attack ?? 1, health: options.health ?? 3,
      ranged: !!formUnit.ranged, kind: options.kind ?? 'Reinforcement', firstHit: options.firstHit ?? 0 };
    state.scrap -= options.scrap ?? 0;
    target.piece.charge -= options.charge ?? 0;
    const index = target.members.length;
    target.members.push({ ...unit, fresh: true, bonus: {} });
    buff(source, target, { shield: options.shield ?? 0, health: options.healthBonus ?? 0, move: options.move ?? 0 }, index);
    if (!options.temporary) {
      target.piece.reinforcements.push(unit);
      target.piece.productionHistory.push(history);
    }
    source.produced = target.received = true;
    return true;
  }

  const unitsById = new Map([...cards.values()].flatMap(card => card.forms.flatMap(form =>
    form.units.map(unit => [unit.id, unit]))));
  for (const context of party) {
    const c = context;
    const rule = cardRules[c.card.id];
    const previous = c.previous;
    c.unitsById = unitsById;
    c.hunter = hunter;
    c.target = c.card.mechanic === 'Supply' ? party.filter(other => other.hired && other !== c)
      .sort((a, b) => (a.piece.hireOrder || a.slot + 1) - (b.piece.hireOrder || b.slot + 1) || a.slot - b.slot)[0] ?? null
      : selected(c);
    c.hireTarget = byKey.get(c.piece.hireTargetKey);
    c.second = rule.second && c.golden ? eligible(c).find(other =>
      other !== c.target && other.key === (findOrder(c, 'target')?.second || c.piece.secondTargetKey)) : null;
    c.lastTarget = byKey.get(previous?.target);
    c.lastRally = (previous?.rallyTargets ?? []).map(key => byKey.get(key)).filter(Boolean).sort((a, b) => a.slot - b.slot);
    c.rewardForm = target => target.form === 'Hybrid' ? target.piece.rewardForm ?? 'Human' : target.form;
    c.neighbors = (range, count) => party.filter(other => other !== c && distance(c, other, columns) <= range)
      .sort((a, b) => Number(b === c.target) - Number(a === c.target) ||
        Number(b === c.second) - Number(a === c.second) || distance(c, a, columns) - distance(c, b, columns) || a.slot - b.slot)
      .slice(0, count);
    c.earnScrap = earnScrap;
    c.openGear = () => {
      if (c.piece.gear > 0) return false;
      c.piece.gear = 1;
      c.piece.gearReceivedRound = state.round;
      return true;
    };
    c.bless = (target, amount) => {
      if (!target) return 0;
      const added = Math.max(0, Math.min(amount, 18 - target.piece.blessing, 3 - target.blessingAdded));
      target.piece.blessing += added;
      target.blessingAdded += added;
      target.piece.blessingAdded = target.blessingAdded;
      return added;
    };
    c.grow = (target, amount = 1) => {
      if (!target) return 0;
      if (target !== c) amount = Math.min(amount, 2 - (target.piece.supportGrowth ?? 0));
      const gained = Math.max(0, Math.min(amount, 6 - target.piece.growth));
      target.piece.growth += gained;
      if (target !== c) target.piece.supportGrowth = (target.piece.supportGrowth ?? 0) + gained;
      return gained;
    };
    c.trophies = (target, amount = 0) => {
      if (!target) return 0;
      const added = Math.min(10 - target.piece.trophies, amount);
      target.piece.trophies += added;
      return added;
    };
    c.charge = (target, amount) => {
      if (!target) return 0;
      const added = Math.min(4 - target.piece.charge, amount);
      target.piece.charge += added;
      return added;
    };
    c.buff = (target, values, scope) => buff(c, target, values, scope);
    c.grantShield = (target, amount, family, scope) => shield(c, target, amount, family, scope);
    c.produce = (target, name, options) => produce(c, target, name, options);
    c.supply = values => {
      if (!c.buff(c.target, values)) return false;
      c.target.suppliedBy.push(c.key);
      return true;
    };
    c.rallyFromOther = key => c.members.some(unit => Object.values(unit.bonus).some(bonus =>
      bonus.family === 'rally' && bySlot(bonus.slot)?.key !== key));
    c.rally = (target, values, scope = 0) => {
      if (!target) return false;
      if (!c.rallyTargets.includes(target)) c.rallyTargets.push(target);
      if (values.shield) shield(c, target, values.shield, 'rally', scope);
      const affected = scope === 'originals' ? target.members.slice(0, target.originals) : target.members.slice(0, 1);
      for (const member of affected) {
        if (!values.attack) continue;
        const previous = member.bonus.rallyAttack;
        if (!previous || values.attack > previous.amount || (values.attack === previous.amount && c.slot < previous.slot))
          member.bonus.rallyAttack = { stat: 'attack', amount: values.attack, slot: c.slot, family: 'rally' };
      }
      return true;
    };
    c.first = effect => {
      if (progress.first[c.card.id] || !effect()) return false;
      progress.first[c.card.id] = true;
      c.firstEffect = true;
      return true;
    };
  }
  return { party, byKey, bySlot, progress, eligible, selected, findOrder, hunter };
}

export function enterCardVisit(state, cards) {
  const progress = cardProgress(state);
  progress.purchased = {};
  progress.sold = {};
  progress.sales = [];
  state.scrapEarned = 0;
  for (const piece of state.deck.filter(Boolean)) {
    piece.blessingAdded = 0;
    piece.supportGrowth = 0;
  }
  const { party } = visit(state, cards);
  for (const c of party) {
    if (c.card.mechanic === 'Overload' && !c.card.support && c.previous) c.charge(c, 1);
    cardRules[c.card.id].enter?.(c);
  }
}

export function applyCardTransaction(state, cards, key, action) {
  const { byKey, selected, eligible, progress } = visit(state, cards);
  const source = byKey.get(key);
  const rule = source && cardRules[source.card.id];
  if (!rule?.[action]) return;
  if (action === 'sell' && !(source.piece.lastDeployedRound > 0 && source.piece.lastDeployedRound < state.round)) return;
  const ledger = action === 'hire' ? progress.purchased : progress.sold;
  if (ledger[source.card.id]) return;
  ledger[source.card.id] = true;
  if (action === 'hire' && rule.select) {
    if (source.target && eligible(source).length === 1) {
      rule.hire(source);
      source.piece.hireTargetKey = source.target.key;
      return;
    }
    source.piece.pendingHire = state.round;
    return;
  }
  if (action === 'sell' && rule.saleSelect) source.target = selected(source, 'saleTarget');
  if (rule[action](source) && action === 'sell' && rule.sold && source.target)
    progress.sales.push({ id: source.card.id, golden: source.golden, target: source.target.key, slot: source.slot });
}

export function expeditionPreparation(saved, cards, enemies, orders = saved.orders) {
  const state = structuredClone(saved);
  state.orders = orders ?? [];
  const { party, byKey, bySlot, progress, eligible, selected, findOrder } = visit(state, cards);
  const applied = [];
  const options = entries => entries.map(item => ({ value: item.key, label: `${item.slot + 1}번 ${item.card.name}` }));
  const marks = enemies.filter(enemy => enemy.type !== '소환').map(enemy => ({
    value: String(enemy.slot), label: `${enemy.slot < 3 ? '전열' : '후열'} · ${enemy.name}`,
  }));

  function available(source, kind) {
    if (!source) return null;
    const { card, piece, golden } = source;
    const rule = cardRules[card.id];
    switch (kind) {
      case 'target':
        if (!rule.select || rule.select === targetModes.hunt || rule.select === targetModes.self) return null;
        return { label: '효과 대상 지정', choices: options(eligible(source)),
          second: rule.second && golden ? options(eligible(source)) : null };
      case 'saleTarget':
        if (!rule.saleSelect) return null;
        return { label: '판매 효과 대상', choices: options(eligible(source, kind)) };
      case 'form':
        if (source.form !== 'Hybrid' && card.forms.some(form => form.kind === 'Animal'))
          return { label: source.form === 'Animal' ? '인간형으로 변신' : '동물형으로 변신' };
        return null;
      case 'rewardForm':
        if (source.form !== 'Hybrid') return null;
        return { label: '반인반수 증원 형태', choices: [{ value: 'Human', label: '인간형 증원' }, { value: 'Animal', label: '동물형 증원' }] };
      case 'hunt':
        if (card.mechanic !== 'Hunt') return null;
        return { label: '사냥 표식', choices: marks, second: golden && card.tier === 5 ? marks : null };
      case 'inherit': {
        if (!rule.inherit) return null;
        const field = card.mechanic === 'Blessing' ? 'blessing' : card.mechanic === 'Equipment' ? 'gear' : 'growth';
        const choices = party.filter(donor => (card.mechanic === 'Blessing' ?
          donor !== source && donor.card.mechanic === 'Blessing' : donor.card.id === rule.inherit) &&
          donor.piece[field] > (field === 'gear' ? piece[field] : 0) && (field === 'gear' || piece[field] < meterFields[field]));
        return { label: { gear: '장비 계승', blessing: '축복 계승', growth: '성장 기록 계승' }[field],
          choices: options(choices), field, reason: progress.inherited[card.mechanic] ? '이번 원정에 계승을 이미 사용했습니다.' : '' };
      }
      case 'gear': {
        if (!rule.gear) return null;
        const base = rule.gear === 'hire' && !golden ? 2 : 1;
        const candidates = rule.gear === 'hire' ? eligible(source) : [source];
        const choices = candidates.filter(target => target.piece.gearReceivedRound !== state.round && target.piece.gear < 3 &&
          (rule.gear !== 'self' || !source.hired)).map(target => ({
          value: target.key, label: `${target.slot + 1}번 ${target.card.name} · ${Math.max(1, base - (target.piece.gearDiscount ?? 0))}골드`,
          price: Math.max(1, base - (target.piece.gearDiscount ?? 0)),
        }));
        return { label: '장비 강화', choices, cost: `${base}골드`, reason: rule.gear === 'hire' &&
          (!source.hired || source.piece.gearWorkRound === state.round) ? '이 방문의 유료 고용으로 열린 작업이 필요합니다.' :
          choices.length && choices.every(choice => choice.price > state.gold) ? '골드가 부족합니다.' : '' };
      }
      case 'reforge':
        if (!['Reforge-3-0', 'Reforge-4-0'].includes(card.id)) return null;
        return { label: '영구 재련 대상', cost: '고철 2', choices: options(eligible(source).filter(target =>
          target.members.length < 4 && !target.piece.productionHistory.includes(card.id))), reason: state.scrap < 2 ? '고철이 부족합니다.' : '' };
      case 'overload':
        if (card.mechanic !== 'Overload' || card.support) return null;
        return { label: '과부하 활성화', cost: golden && card.tier === 5 ? '충전 2 · 공유 시 +1' : '충전 2',
          second: golden && card.tier === 5 && piece.charge >= 3 ?
            options(eligible(source).filter(other => !other.card.support)) : null,
          reason: piece.charge < 2 ? '충전이 부족합니다.' : '' };
      default:
        return null;
    }
  }

  for (const source of party) {
    const rule = cardRules[source.card.id];
    if (source.piece.pendingHire !== state.round || !source.target) continue;
    rule.hire(source);
    source.hireTarget = source.target;
    source.piece.hireTargetKey = source.target.key;
    source.piece.pendingHire = 0;
  }

  // Target orders are separate from paid actions so moving a card never consumes a reservation.
  const supportedOrders = new Set(actions);
  for (const order of state.orders) {
    const source = byKey.get(order.source);
    if (!source || !supportedOrders.has(order.kind) || applied.some(item =>
      item.kind === order.kind && (item.source === order.source || order.kind === 'hunt'))) continue;
    const action = available(source, order.kind);
    if (!action || action.reason ||
        (action.choices && !action.choices.some(choice => choice.value === order.target))) continue;
    if (order.second && (order.second === order.target || !action.second?.some(choice => choice.value === order.second))) continue;
    if (order.kind === 'gear') {
      const price = action.choices.find(choice => choice.value === order.target).price;
      if (state.gold < price) continue;
      const target = byKey.get(order.target);
      state.gold -= price;
      target.piece.gear++;
      target.piece.gearReceivedRound = state.round;
      source.piece.gearWorkRound = state.round;
      target.piece.gearDiscount = 0;
    }
    if (order.kind === 'inherit') {
      const donor = byKey.get(order.target);
      const field = action.field;
      if (field === 'gear') {
        source.piece.gear = donor.piece.gear;
        donor.piece.gear = 0;
      } else {
        const transfer = Math.min(donor.piece[field], meterFields[field] - source.piece[field]);
        source.piece[field] += transfer;
        donor.piece[field] -= transfer;
      }
      progress.inherited[source.card.mechanic] = true;
    }
    if (order.kind === 'rewardForm') source.piece.rewardForm = order.target;
    applied.push(order);
  }

  const goldAfterOrders = state.gold;
  const availableActions = new Map(party.map(source => [source.slot,
    Object.fromEntries(actions.map(kind => [kind, available(source, kind)]))]));
  const validMark = applied.find(order => order.kind === 'hunt');
  const directSources = new Map(applied.filter(order => order.kind === 'overload').map(order => [order.source, order]));
  for (const source of party) {
    const order = directSources.get(source.key);
    if (!order) continue;
    source.piece.charge -= 2;
    source.activated = source.direct = true;
  }
  for (const source of party) {
    const shared = byKey.get(directSources.get(source.key)?.second);
    if (!shared || shared.activated || source.piece.charge < 1) continue;
    source.piece.charge--;
    shared.activated = true;
  }

  for (const source of party) {
    const rule = cardRules[source.card.id];
    const target = applied.find(order => order.source === source.key && ['target', 'reforge'].includes(order.kind));
    if (target) source.target = byKey.get(target.target);
    else if (rule.select && rule.select !== targetModes.hunt) source.target = selected(source);
    if (rule.select === targetModes.hunt) source.target = validMark ? byKey.get(validMark.source) : null;
    source.hunter = validMark ? byKey.get(validMark.source) : null;
    if (source.hunter === source) source.marks = [validMark.target, validMark.second].filter(Boolean).map(Number);
    if (target) {
      source.piece.targetKey = target.target;
      source.piece.secondTargetKey = target.second || '';
      source.second = byKey.get(target.second);
    }
    if (!source.hired) source.hireTarget = null;
  }

  const rankedFirst = [...party].sort((a, b) => Number(b.golden) - Number(a.golden) || a.slot - b.slot);
  for (const source of party) cardRules[source.card.id].settle?.(source);
  for (const source of rankedFirst) {
    const rule = cardRules[source.card.id];
    if (rule.first) source.first(() => rule.first(source));
  }
  for (const source of party) cardRules[source.card.id].buff?.(source);
  for (const sale of progress.sales) {
    const target = byKey.get(sale.target);
    if (!target) continue;
    const proxy = { golden: sale.golden, card: cards.get(sale.id), slot: sale.slot,
      buff: (target, values) => saleBuff(sale, target, values), rally: target.rally };
    cardRules[sale.id].sold(proxy, target);
  }
  for (const source of party) cardRules[source.card.id].produce?.(source);
  for (const source of rankedFirst) cardRules[source.card.id].afterProduction?.(source);
  for (const source of party) {
    cardRules[source.card.id].finish?.(source);
    if (source.piece.blessing > 0) source.buff(source, {
      attack: Math.floor(source.piece.blessing / 6), move: Math.min(30, 2 * source.piece.blessing),
    }, 'originals');
    if (source.piece.gear > 0) source.buff(source, { attack: source.piece.gear, health: source.piece.gear * 2 });
    if (source.card.mechanic === 'Production' && source.robotCount >= 3) {
      source.buff(source, { shield: 2 });
      if (source.robotCount === 4) source.buff(source, { attack: 1 }, source.members.length - 1);
    }
    source.buff(source, primaryGrowth(source));
  }

  function saleBuff(sale, target, values) {
    if (!target) return;
    for (const [stat, amount] of Object.entries(values)) {
      const key = sale.id + ':' + stat;
      const prior = target.members[0].bonus[key];
      if (!prior || amount > prior.amount) target.members[0].bonus[key] = { stat, amount, slot: sale.slot };
    }
  }

  function describe(slot, kind) {
    const current = applied.find(order => order.source === bySlot(slot)?.key && order.kind === kind);
    return current ? expeditionPreparation(saved, cards, enemies, (orders ?? []).filter(order => order !== current))
      .action(slot, kind) : availableActions.get(slot)?.[kind];
  }

  function combatSlot(source) {
    const c = source;
    return { target: c.target?.slot ?? -1, marks: c.marks ?? [], rage: c.rage, blessing: c.piece.blessing, gear: c.piece.gear,
      pursuitReady: !!c.pursuitReady, revengeReady: !!c.revengeReady, activated: !!c.activated, direct: !!c.direct,
      robotCount: c.robotCount, firstEffect: !!c.firstEffect,
      fighters: c.members.map(unit => {
        const effects = Object.values(unit.bonus);
        const total = stat => effects.filter(item => item.stat === stat && !(stat === 'shield' && item.family))
          .reduce((sum, item) => sum + item.amount, 0);
        let guardBudget = 6;
        const guardGrants = effects.filter(item => item.family === 'guard')
          .sort((a, b) => a.slot - b.slot)
          .flatMap(item => {
            const shield = Math.min(guardBudget, item.amount);
            guardBudget -= shield;
            return shield ? [{ source: item.slot + 1, shield }] : [];
          });
        return { id: unit.id, kind: unit.kind, attack: unit.attack, health: unit.health, ranged: unit.ranged,
          bonusAttack: total('attack'), bonusHealth: total('health'), shield: total('shield'), move: total('move'),
          firstHit: unit.firstHit ?? 0, guardGrants,
          rallySource: (unit.bonus.rally?.slot ?? -1) + 1, rallyShield: unit.bonus.rally?.amount ?? 0,
          rallyAttackSource: (unit.bonus.rallyAttack?.slot ?? -1) + 1,
        };
      }),
    };
  }

  return {
    gold: goldAfterOrders, scrap: state.scrap, applied, bySlot, describe,
    action(slot, kind) { return availableActions.get(slot)?.[kind]; },
    abilities(slot) {
      const source = bySlot(slot);
      if (!source) return [];
      return actions.flatMap(kind => {
        const current = applied.find(order => order.kind === kind && order.source === source.key);
        const action = describe(slot, kind);
        if (!action) return [];
        const defaultTarget = ['target', 'reforge'].includes(kind) ? source.target?.key : undefined;
        return [{ ...action, kind, active: !!current, selected: current?.target ?? findOrder(source, kind)?.target ?? defaultTarget,
          selectedSecond: current?.second, reason: action.reason ||
            (action.choices?.length === 0 ? '현재 지정할 대상이 없습니다.' : '') }];
      });
    },
    command(slot, kind, target, second) {
      return { kind, source: bySlot(slot).key, target: String(target ?? ''),
        second: second === target ? '' : String(second ?? '') };
    },
    deployment() {
      return saved.deck.map((piece, slot) => piece ? combatSlot(bySlot(slot)) : { fighters: [] });
    },
    settlement() {
      return {
        gold: state.gold, scrap: state.scrap, progress, scrapEarned: state.scrapEarned ?? 0,
        deck: saved.deck.map((piece, slot) => {
          if (!piece) return null;
          const source = bySlot(slot);
          return { ...source.piece, previousForm: source.form, lastDeployedRound: state.round };
        }),
      };
    },
    status(slot) {
      const source = bySlot(slot);
      if (!source) return '';
      const stats = [];
      const c = source.piece;
      if (c.gear) stats.push(`장비 ${c.gear}`);
      if (c.gearDiscount) stats.push('장비 작업 할인 1골드');
      if (c.blessing) stats.push(`축복 ${c.blessing}`);
      if (c.charge) stats.push(`충전 ${c.charge}`);
      if (c.trophies) stats.push(`전리품 ${c.trophies}`);
      if (c.growth) stats.push(`${mechanicNames[source.card.mechanic] ?? '성장'} ${c.growth}`);
      if (source.card.mechanic === 'Reforge') stats.push(`공용 고철 ${state.scrap}`);
      if (source.target) stats.push(`대상 ${source.target.slot + 1}번 ${source.target.card.name}`);
      if (source.activated) stats.push(source.direct ? '과부하 활성화' : '공유 과부하');
      if (source.marks?.length) stats.push(`사냥 표식 ${source.marks.map(slot => slot + 1).join('·')}번`);
      const recruits = source.members.slice(source.originals);
      if (recruits.length) stats.push(recruits.map(unit => unit.fresh ?
        `${unit.name} (출정 시 합류)` : unit.name).join(', '));
      return stats.join(' · ');
    },
  };
}
