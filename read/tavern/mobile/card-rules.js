const same = 'same';
const neighbor = 'neighbor';
const nearSame = 'near-same';
const any = 'any';
const self = 'self';
const hunt = 'hunt';
const noTarget = 'none';

const rank = (c, normal, golden = normal) => c.golden ? golden : normal;
const formBonus = (c, human, animal, all = false) => {
  if (c.form !== 'Animal') c.buff(c, { shield: human }, all ? 'originals' : 0);
  if (c.form !== 'Human') c.buff(c, { attack: animal });
};

const recorded = (c, mark) => c.previous?.[mark] > 0;
const hitLead = (c, mark) => c.lastTarget?.previous?.[mark];
const escorted = c => c.previous?.leadAlive80 && hitLead(c, 'leadAlive80');
const supplied = c => hitLead(c, 'leadAlive80') && hitLead(c, 'leadDealt');
const rageEarned = c => c.previous?.rageHits >= 4 && c.previous?.leadDealt;
const shouted = (c, mark) => c.lastRally.some(target => target.previous?.[mark]);

export const cardRules = {
  'Blessing-1-0': { select: same, first(c) { return c.bless(c.target ?? c, rank(c, 1, 2)); } },
  'Blessing-2-0': { select: same, produce(c) {
    if (c.target?.piece.blessing >= 3) c.produce(c.target, '가지 경비', { id: 'allies-005', shield: rank(c, 1, 2) });
  } },
  'Blessing-2-1': { select: same, hire(c) { return c.bless(c.target, 1); }, buff(c) {
    c.buff(c.hireTarget, { shield: rank(c, 2, 3) });
  } },
  'Blessing-3-0': { select: same, sell(c) { return c.bless(c.target, rank(c, 2, 3)); } },
  'Blessing-3-2': { select: nearSame, produce(c) {
    if (c.target?.piece.blessing >= 6) c.produce(c.target, '뿌리 전령', { id: 'allies-010', healthBonus: rank(c, 1, 2) });
  } },
  'Blessing-4-0': { settle(c) { c.bless(c, rank(c, 1, 2)); }, buff(c) {
    if (c.piece.blessing >= 6) c.buff(c, { health: 2 });
  } },
  'Blessing-5-0': { inherit: 'Blessing-4-0', settle(c) { c.bless(c, rank(c, 1, 2)); }, buff(c) {
    c.buff(c, { health: Math.floor(c.piece.blessing / rank(c, 6, 5)) });
  } },

  'Shapeshift-1-0': { select: neighbor, first(c) {
    return c.buff(c.target, c.form === 'Animal' ? { attack: rank(c, 1, 2) } : { shield: rank(c, 2, 4) });
  } },
  'Shapeshift-2-0': { select: nearSame, produce(c) {
    if (!c.target?.changed) return;
    const animal = c.rewardForm(c.target) === 'Animal';
    c.produce(c.target, animal ? '잿빛 오소리' : '솔잎 궁수', {
      id: animal ? 'allies-023' : 'allies-021', shield: rank(c, 1, 2), temporary: animal,
    });
  } },
  'Shapeshift-2-1': { select: same, buff(c) {
    if (c.hired && c.target?.changed) c.buff(c.target, { move: rank(c, 10, 15) });
  } },
  'Shapeshift-3-0': { select: nearSame, produce(c) {
    if (!c.changed || !c.target?.changed) return;
    const animal = c.rewardForm(c) === 'Animal';
    c.produce(c.target, animal ? '황갈색 족제비' : '부엉이 사수', { id: animal ? 'allies-029' : 'allies-027', shield: rank(c, 1, 2) });
  } },
  'Shapeshift-3-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); }, sold(c, sale) {
    c.buff(sale, sale.form === 'Animal' ? { attack: 1 } : { shield: 2 });
  } },
  'Shapeshift-4-0': { settle(c) { if (c.changed) c.grow(c); }, buff(c) { formBonus(c, rank(c, 2, 3), rank(c, 1, 2), true); } },
  'Shapeshift-5-0': { inherit: 'Shapeshift-4-0', settle(c) { if (c.changed || c.form === 'Hybrid') c.grow(c); },
    buff(c) { formBonus(c, 3, 2); } },

  'Reforge-1-0': { hire(c) { return c.earnScrap(rank(c, 1, 2)); } },
  'Reforge-2-0': { sell(c) { return c.earnScrap(rank(c, 2, 3)); } },
  'Reforge-2-1': { select: nearSame, first(c) {
    if (!c.target) return false;
    c.grow(c.target);
    return true;
  }, afterProduction(c) { if (c.firstEffect) c.buff(c.target, { shield: rank(c, 2, 3) }, 'newReforged'); } },
  'Reforge-3-0': { select: same, includeSelf: true, produce(c) {
    c.produce(c.target, '조립 방패병', {
      id: 'reforged-shieldbearer', health: 4, kind: 'Reforged', shield: rank(c, 1, 2), scrap: 2,
    });
  } },
  'Reforge-3-2': { enter(c) { if (recorded(c, 'reforgeHit')) c.grow(c); }, afterProduction(c) {
    c.buff(c, { shield: rank(c, 1, 2) }, 'reforged');
  } },
  'Reforge-4-0': { select: same, includeSelf: true, produce(c) {
    c.produce(c.target, '합금 창병', { id: 'alloy-spearman', attack: 2, kind: 'Reforged', firstHit: 1, shield: rank(c, 0, 2), scrap: 2 });
  } },
  'Reforge-5-0': { select: nearSame, enter(c) {
    if (c.previous) c.earnScrap(1);
    if (recorded(c, 'reforgeHit') || hitLead(c, 'reforgeHit')) c.grow(c);
  }, buff(c) { if (c.piece.growth >= 3) c.buff(c, { shield: rank(c, 2, 3) }); } },

  'Equipment-1-0': { select: any, includeSelf: true, gear: 'hire' },
  'Equipment-2-0': { select: any, qualify: target => target.piece.gear > 0, first(c) {
    return c.buff(c.target, { shield: rank(c, 1, 2) });
  }, sell(c) {
    if (!c.target) return false;
    c.target.piece.gearDiscount = 1;
    return true;
  } },
  'Equipment-2-1': { select: neighbor, produce(c) {
    if (c.target?.piece.gear >= 1) c.produce(c.target, '가죽 정비공', { id: 'allies-060', shield: rank(c, 1, 2) });
  } },
  'Equipment-3-0': { select: any, includeSelf: true, produce(c) {
    if (c.target?.piece.gear >= 2) c.produce(c.target, '모루 견습', { shield: rank(c, 1, 2) });
  } },
  'Equipment-4-0': { gear: self, hire(c) { return c.openGear(); }, buff(c) {
    if (c.piece.gear >= 2) c.buff(c, { attack: rank(c, 1, 2) }, 1);
  } },
  'Equipment-4-2': { select: neighbor, qualify: target => target.piece.gear >= 2, first(c) {
    return c.buff(c.target, { health: rank(c, 2, 3), shield: rank(c, 1, 2) });
  } },
  'Equipment-5-0': { gear: self, inherit: 'Equipment-4-0', hire(c) { return c.openGear(); },
    buff(c) { if (c.piece.gear === 3) c.buff(c, { shield: rank(c, 3, 5) }); } },

  'Hunt-1-0': { select: hunt, first(c) { return c.buff(c.target, { attack: rank(c, 1, 2) }); } },
  'Hunt-2-0': { select: same, includeSelf: true, produce(c) {
    if (recorded(c.target ?? {}, 'huntRewards')) c.produce(c.target, '수달 기습병', { id: 'allies-073', move: rank(c, 10, 20) });
  } },
  'Hunt-2-1': { select: hunt, buff(c) { if (c.hired) c.buff(c.target, { shield: rank(c, 1, 2) }); } },
  'Hunt-3-0': { enter(c) { c.trophies(c, c.previous?.huntRewards); }, buff(c) {
    c.buff(c, { attack: Math.floor(c.piece.trophies / 2), shield: c.hunter && c.hunter !== c ? rank(c, 1, 2) : 0 });
  } },
  'Hunt-3-2': { select: same, produce(c) {
    if (recorded(c.target ?? {}, 'huntBasic')) c.produce(c.target, '발자국 투창수', { id: 'allies-080', shield: rank(c, 1, 2) });
  } },
  'Hunt-4-0': { select: same, enter(c) { c.trophies(c, c.previous?.huntRewards); }, sell(c) {
    const moved = c.trophies(c.target, Math.min(c.piece.trophies, rank(c, 2, 3)));
    c.piece.trophies -= moved;
    return moved;
  } },
  'Hunt-5-0': { enter(c) { c.trophies(c, c.previous?.huntRewards); }, buff(c) {
    c.buff(c, { attack: c.piece.trophies });
  } },

  'Pursuit-1-0': { select: nearSame, first(c) { return c.buff(c.target, {
    attack: rank(c, 1, 2), shield: recorded(c.target ?? {}, 'pursuits') ? 1 : 0,
  }); } },
  'Pursuit-2-0': { select: nearSame, produce(c) {
    if (recorded(c.target ?? {}, 'pursuits')) c.produce(c.target, '회색 발톱', { id: 'allies-088', move: rank(c, 10, 20) });
  } },
  'Pursuit-2-1': { select: same, buff(c) { if (c.hired) c.buff(c.target, { shield: rank(c, 1, 2), move: 10 }); } },
  'Pursuit-3-0': { select: nearSame, includeSelf: true, produce(c) {
    const target = recorded(c.target ?? {}, 'pursuits') ? c.target : recorded(c, 'pursuits') ? c : null;
    c.produce(target, '비탈길 정찰병', { shield: rank(c, 1, 2) });
  } },
  'Pursuit-3-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); },
    sold(c, sale) { c.buff(sale, { move: 10 }); } },
  'Pursuit-4-0': { enter(c) { if (recorded(c, 'pursuits')) c.grow(c); }, buff(c) {
    c.buff(c, { attack: Math.floor(c.piece.growth / 2) });
    c.pursuitReady = recorded(c, 'pursuits') || c.piece.growth >= rank(c, 2, 1);
  } },
  'Pursuit-5-0': { inherit: 'Pursuit-4-0', enter(c) { if (recorded(c, 'pursuits')) c.grow(c); }, buff(c) {
    if (c.golden && c.previous?.pursuits >= 2) c.buff(c, { shield: 2 });
  } },

  'Guard-1-0': { select: neighbor, first(c) {
    if (c.target?.card.mechanic === 'Guard') c.grow(c.target);
    return c.grantShield(c.target, rank(c, 2, 4), 'guard');
  } },
  'Guard-2-0': { select: neighbor, produce(c) {
    if (c.lastTarget?.previous?.leadHit && c.lastTarget.previous.leadAliveEnd)
      c.produce(c.lastTarget, '철등불 종자');
  }, buff(c) { c.grantShield(c.target, rank(c, 2, 3), 'guard'); } },
  'Guard-2-1': { select: same, hire(c) { return c.grow(c.target); }, buff(c) {
    c.grantShield(c.hireTarget, rank(c, 2, 3), 'guard');
  } },
  'Guard-3-0': { select: neighbor, produce(c) {
    if (hitLead(c, 'leadBlocked')) c.produce(c.lastTarget, '저녁 순찰병', { shield: rank(c, 1, 2) });
  } },
  'Guard-4-0': { select: neighbor, enter(c) { if (recorded(c, 'guardBlocked')) c.grow(c); },
    buff(c) { c.grantShield(c.target, rank(c, 4, 5), 'guard'); } },
  'Guard-4-2': { select: nearSame, first(c) { return c.buff(c.target, { health: rank(c, 2, 3) }); },
    sell(c) { return c.grow(c.target, rank(c, 1, 2)); } },
  'Guard-5-0': { select: neighbor, second: true, inherit: 'Guard-4-0',
    enter(c) { if (recorded(c, 'guardBlocked')) c.grow(c); },
    buff(c) {
      c.grantShield(c.target, 5, 'guard');
      if (c.golden) c.grantShield(c.second, 3, 'guard');
    } },

  'Retribution-1-0': { select: same, first(c) {
    if (!c.target) return false;
    c.grow(c.target);
    return c.buff(c.target, { shield: rank(c, 1, 2) });
  } },
  'Retribution-2-0': { select: any, produce(c) {
    if (c.previous?.leadAliveEnd && hitLead(c, 'originalDown'))
      c.produce(c, '밤길 종자', { shield: rank(c, 1, 2) });
  } },
  'Retribution-2-1': { select: any, buff(c) {
    if (c.hired) c.buff(c.neighbors(1).find(item => item.card.mechanic === 'Retribution' && item.target === c),
      { shield: rank(c, 2, 3) });
  } },
  'Retribution-3-0': { select: nearSame, includeSelf: true, produce(c) {
    const target = recorded(c.target ?? {}, 'revenge') ? c.target : recorded(c, 'revenge') ? c : null;
    c.produce(target, '잔류대 궁수', { id: 'allies-122', shield: rank(c, 1, 2) });
  } },
  'Retribution-3-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); },
    sold(c, sale) { c.buff(sale, { health: 1 }); } },
  'Retribution-4-0': { select: any, enter(c) { if (recorded(c, 'revenge')) c.grow(c); },
    buff(c) { c.buff(c, { shield: rank(c, 2, 3) }); } },
  'Retribution-5-0': { select: any, inherit: 'Retribution-4-0',
    enter(c) { if (recorded(c, 'revenge')) c.grow(c); },
    buff(c) {
      c.revengeReady = recorded(c, 'revenge') || c.piece.growth >= 2;
      if (c.golden) c.buff(c.neighbors(1).find(item => item.card.mechanic === 'Retribution'), { attack: 1 });
    } },
  'Production-1-0': { select: same, hire(c) { return !!c.target; }, buff(c) {
    c.buff(c.hireTarget, { shield: rank(c, 1, 2) });
  } },
  'Production-2-0': { select: same, includeSelf: true, produce(c) {
    const ready = target => target?.previous && !target.hasWorkRobot;
    const target = ready(c.target) ? c.target : ready(c) ? c : null;
    c.produce(target, '작업 로봇', { id: 'work-robot', kind: 'Robot', shield: rank(c, 1, 2) });
  } },
  'Production-2-1': { select: nearSame, afterProduction(c) {
    if (c.target?.robotCount < 3 || !c.target) return;
    return c.first(() => c.buff(c.target, { shield: rank(c, 2, 3) }, 'workRobot'));
  } },
  'Production-3-0': { select: same, qualify: target => target.hasWorkRobot,
    sell(c) { return c.grow(c.target, rank(c, 1, 2)); } },
  'Production-3-2': { enter(c) { if (c.previous?.robotCount >= 3) c.grow(c); },
    afterProduction(c) { if (c.robotCount >= 3) c.buff(c, { shield: rank(c, 1, 2) }, 'workRobot'); } },
  'Production-4-0': { select: same, includeSelf: true, produce(c) {
    const ready = target => target?.previous?.robotCount === 3 && target.robotCount === 3;
    const target = ready(c.target) ? c.target : ready(c) ? c : null;
    c.produce(target, '작업 로봇', { id: 'work-robot', kind: 'Robot', shield: rank(c, 1, 2) });
  } },
  'Production-5-0': { inherit: 'Production-3-2', enter(c) { if (c.previous?.robotCount === 4) c.grow(c); },
    afterProduction(c) { if (c.robotCount === 4) c.buff(c, { attack: rank(c, 1, 2) }); } },

  'Overload-1-0': { select: same, hire(c) { return c.charge(c.target, rank(c, 1, 2)); }, buff(c) {
    if (c.hireTarget?.direct) c.buff(c.hireTarget, { move: rank(c, 10, 15) });
  } },
  'Overload-2-0': { select: nearSame, includeSelf: true, produce(c) {
    const target = c.target?.activated ? c.target : c.activated ? c : null;
    c.produce(target, '스파크 탐침', { kind: 'Robot', shield: rank(c, 1, 2) });
  } },
  'Overload-2-1': { select: nearSame, enter(c) {
    if (hitLead(c, 'direct') && c.previous?.firstEffect) c.charge(c.lastTarget, 1);
  }, first(c) {
    if (!c.target?.activated) return false;
    return c.buff(c.target, { shield: rank(c, 1, 2) });
  } },
  'Overload-3-0': { select: same, includeSelf: true, produce(c) {
    const ready = target => target?.direct && target.piece.charge > 0;
    const target = ready(c.target) ? c.target : ready(c) ? c : null;
    c.produce(target, '접지 로봇', { kind: 'Robot', charge: 1, shield: rank(c, 2, 3) });
  } },
  'Overload-3-2': { select: same, sell(c) { return c.charge(c.target, rank(c, 1, 2)); },
    sold(c, sale) { if (sale.direct) c.buff(sale, { shield: rank(c, 2, 3) }); } },
  'Overload-4-0': { enter(c) { if (c.previous?.activated && c.previous.leadDealt) c.grow(c); },
    buff(c) {
      if (!c.activated) return;
      c.buff(c, { shield: rank(c, 2, 3) }, 'originals');
      c.buff(c, { attack: rank(c, 1, 2) });
    } },
  'Overload-5-0': { select: same, inherit: 'Overload-4-0',
    enter(c) { if (c.previous?.activated && c.previous.leadDealt) c.grow(c); },
    buff(c) { if (c.activated) c.buff(c, { attack: 1, move: 15 }, 'originals'); } },

  'Supply-1-0': { first(c) { return c.supply({ shield: rank(c, 1, 2) }); } },
  'Supply-2-0': { produce(c) { c.produce(c.target, '짐꾼'); }, buff(c) { c.supply({ shield: rank(c, 1, 2) }); } },
  'Supply-2-1': { buff(c) { if (c.hired) c.supply({ move: rank(c, 10, 15) }); } },
  'Supply-3-0': { produce(c) {
    if (c.target?.suppliedBy.some(provider => provider !== c.key)) c.produce(c.target, '짐꾼');
  }, buff(c) { c.supply({ attack: rank(c, 1, 2) }); } },
  'Supply-3-2': { first(c) { return c.supply({ health: rank(c, 2, 3) }); } },
  'Supply-4-0': { enter(c) { if (supplied(c)) c.grow(c); }, buff(c) { c.supply({ shield: rank(c, 2, 3), health: 1 }); } },
  'Supply-5-0': { inherit: 'Supply-4-0', enter(c) { if (supplied(c)) c.grow(c); }, buff(c) {
    c.supply({ shield: rank(c, 3, 4), attack: rank(c, 1, 2) });
  } },

  'Escort-1-0': { select: neighbor, first(c) { return c.buff(c.target, { shield: rank(c, 2, 3) }); },
    saleSelect: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); } },
  'Escort-2-0': { select: neighbor, produce(c) {
    if (escorted(c)) c.produce(c.lastTarget, '짐수레 차부', { shield: rank(c, 1, 2) });
  } },
  'Escort-2-1': { select: nearSame, buff(c) {
    if (!c.hired) return;
    const shield = rank(c, 1, 2);
    c.buff(c.target, { shield });
    c.buff(c.target?.target, { shield });
  } },
  'Escort-3-0': { select: neighbor, produce(c) {
    if (escorted(c) && hitLead(c, 'leadLostHealth') && c.produce(c.lastTarget, '금고 서기'))
      c.buff(c.lastTarget, { shield: rank(c, 1, 2) });
  } },
  'Escort-4-0': { select: neighbor, enter(c) { if (escorted(c)) c.grow(c); },
    buff(c) { c.buff(c.target, { shield: rank(c, 2, 3) }); } },
  'Escort-4-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); },
    sold(c, sale) { c.buff(sale.target, { health: rank(c, 2, 3) }); } },
  'Escort-5-0': { select: neighbor, second: true, inherit: 'Escort-4-0',
    enter(c) { if (escorted(c)) c.grow(c); },
    buff(c) {
      c.buff(c.target, { shield: 3 });
      if (c.golden) c.buff(c.second, { shield: 3 });
    } },

  'Rage-1-0': { select: nearSame, first(c) {
    if (!c.target) return false;
    c.target.rage = Math.min(6, c.target.rage + 1);
    return c.buff(c.target, { shield: rank(c, 1, 2) });
  } },
  'Rage-2-0': { select: nearSame, includeSelf: true, produce(c) {
    const target = c.target?.previous?.rageHits >= 4 ? c.target : c.previous?.rageHits >= 4 ? c : null;
    c.produce(target, '밤뿔 보병', { shield: rank(c, 1, 2) });
  } },
  'Rage-2-1': { select: same, buff(c) {
    if (c.hired) c.buff(c.target, { health: rank(c, 2, 3), shield: c.target?.previous?.rageHits >= 4 ? 1 : 0 });
  } },
  'Rage-3-0': { select: nearSame, includeSelf: true, produce(c) {
    const target = c.target?.previous?.rageHits >= 6 ? c.target : c.previous?.rageHits >= 6 ? c : null;
    if (c.produce(target, '붉은갈기 종자')) c.buff(target, { shield: rank(c, 1, 2) });
  } },
  'Rage-3-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); },
    sold(c, sale) { c.buff(sale, { shield: 2 }); } },
  'Rage-4-0': { enter(c) { if (rageEarned(c)) c.grow(c); },
    afterProduction(c) { if (c.rage >= 4) c.buff(c, { attack: rank(c, 1, 2) }); } },
  'Rage-5-0': { select: nearSame, inherit: 'Rage-4-0',
    enter(c) { if (rageEarned(c)) c.grow(c); },
    settle(c) { if (c.golden && c.target) c.target.rage = Math.min(6, c.target.rage + 1); } },

  'Rally-1-0': { select: neighbor, first(c) { return c.rally(c.target, { attack: rank(c, 1, 2) }, 'originals'); } },
  'Rally-2-0': { select: neighbor, produce(c) {
    c.produce(c.lastRally.find(target => target.previous?.leadDealt), '나팔수');
  }, buff(c) { c.rally(c.target, { shield: rank(c, 2, 3) }); } },
  'Rally-2-1': { select: neighbor, finish(c) {
    if (c.hired && c.target?.rallyFromOther(c.key)) c.buff(c.target, { move: rank(c, 10, 15) });
  } },
  'Rally-3-0': { select: neighbor, second: true, produce(c) {
    c.produce(c.lastRally.find(target => c.previous?.rallyBlocked?.includes(target.key)), '바위 북병');
  }, buff(c) {
    for (const ally of c.neighbors(1, 2)) c.rally(ally, { shield: rank(c, 2, 3) });
  } },
  'Rally-3-2': { select: same, sell(c) { return c.grow(c.target, rank(c, 1, 2)); },
    sold(c, sale) {
      const recipient = sale.rallyTargets[0];
      if (recipient) c.rally(recipient, { shield: rank(c, 1, 2) });
    } },
  'Rally-4-0': { select: neighbor, second: true, enter(c) { if (shouted(c, 'leadDealt120')) c.grow(c); }, buff(c) {
    for (const ally of c.neighbors(1, 2)) c.rally(ally, { attack: 1, shield: rank(c, 2, 3) }, 'originals');
  } },
  'Rally-5-0': { select: neighbor, second: true, inherit: 'Rally-4-0',
    enter(c) { if (shouted(c, 'leadDealt120')) c.grow(c); },
    buff(c) {
      for (const [index, ally] of c.neighbors(c.golden ? 2 : 1, c.golden ? 4 : 2).entries())
        c.rally(ally, index < 2 ? { attack: 2, shield: 4 } : { shield: 2 }, 'originals');
    } },
};

export function primaryGrowth(context) {
  const { card, piece } = context;
  const growth = Math.floor(piece.growth / 2);
  if (card.tier === 5 && !['Blessing', 'Hunt', 'Reforge', 'Equipment'].includes(card.mechanic))
    return { attack: growth, health: growth * 2 };
  if (['Shapeshift-4-0', 'Reforge-3-2', 'Retribution-4-0', 'Production-3-2', 'Overload-4-0',
    'Supply-4-0', 'Escort-4-0', 'Rage-4-0', 'Rally-4-0', 'Guard-4-0'].includes(card.id))
    return { health: growth * 2 };
  return {};
}

export const targetModes = { same, neighbor, nearSame, any, self, hunt, noTarget };
