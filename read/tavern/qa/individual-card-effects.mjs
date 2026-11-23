import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { cardRules } from '../mobile/card-rules.js';
import { applyCardTransaction, enterCardVisit, expeditionPreparation, mergeCardProgress } from '../mobile/prepare.js';

const catalog = JSON.parse(await readFile(process.argv[2] ??
  'E:/My project/Assets/Data/Battle/mobile-catalog.json', 'utf8'));
const cards = new Map(catalog.cards.map(card => [card.id, card]));
const wave = catalog.waves.find(item => item.round === 11 && item.enemies.length >= 2);
const piece = (id, key, values = {}) => ({ id, key, lastDeployedRound: 10, ...values });
const seed = (...deck) => ({
  deck: [...deck, ...Array(6 - deck.length).fill(null)], round: 11, formation: 'line',
  gold: 10, scrap: 5, orders: [], cardHistory: {},
});
const prepare = state => expeditionPreparation(state, cards, wave.enemies);
const order = (kind, source, target, second = '') => ({ kind, source, target, second });
const lead = (plan, slot) => plan.deployment()[slot].fighters[0];
const recruit = (plan, slot) => plan.settlement().deck[slot].reinforcements[0];
const finishTurn = (state, result) => Object.assign(state, result.settlement(), {
  round: state.round + 1, cardProgress: result.settlement().progress, orders: [],
});
const fixtures = [];

assert.deepEqual(Object.keys(cardRules).sort(), [...cards.keys()].sort());
for (const card of cards.values()) for (const golden of [false, true]) {
  const others = [...cards.values()].filter(other => other.id !== card.id && other.mechanic === card.mechanic);
  const related = others.find(other => other.tier === 4 && other.support === 0) ?? others[0];
  const state = seed(
    piece(card.id, 'source', { golden, hiredRound: 11, hireOrder: 2, form: 'Animal', gear: 2, blessing: 5, growth: 2, charge: 3 }),
    piece(related.id, 'target', { hiredRound: 11, hireOrder: 1, form: 'Animal', gear: 2, blessing: 6, growth: 2, charge: 3 }),
    piece('Equipment-4-0', 'spare', { gear: 3 }), piece('Guard-2-0', 'rear'),
  );
  const success = { pursuits: 2, huntRewards: 2, huntBasic: 1, reforgeHit: 1, leadAliveEnd: true, leadAlive80: true,
    leadDealt: true, leadDealt120: true, leadHit: true, leadLostHealth: true, leadBlocked: true, originalDown: 1,
    revenge: 1, guardBlocked: 1, rageHits: 6, activated: true, direct: true, firstEffect: true, robotCount: 3,
    rallyTargets: ['target'], rallyBlocked: ['target'] };
  state.cardHistory = { source: { ...success, target: 'target' }, target: { ...success, target: 'source' } };
  enterCardVisit(state, cards);
  applyCardTransaction(state, cards, 'source', 'hire');
  const rule = cardRules[card.id];
  const initial = prepare(state);
  const choose = (slot, kind, target, second) => {
    const action = prepare(state).describe(slot, kind);
    if (action && !action.reason && (!action.choices || action.choices.length)) {
      const pick = action.choices?.find(choice => choice.value === target)?.value ?? action.choices?.[0]?.value ?? '';
      const extra = action.second?.find(choice => choice.value !== pick && (second == null || choice.value === second));
      state.orders.push(order(kind, state.deck[slot].key, pick, extra?.value));
    }
  };
  choose(0, 'target', 'target');
  if (card.mechanic === 'Hunt') choose(card.id === 'Hunt-1-0' || card.support ? 1 : 0, 'hunt');
  if (card.mechanic === 'Overload') { choose(0, 'overload'); choose(1, 'overload'); }
  if (rule.gear) choose(0, 'gear', 'target');
  if (rule.inherit) choose(0, 'inherit', 'target');
  if (rule.saleSelect) choose(0, 'saleTarget', 'target');
  const frozen = structuredClone(state);
  const ready = prepare(state);
  assert.deepEqual(state, frozen, card.id);
  assert.equal(ready.deployment().length, 6);
  for (const slot of ready.deployment()) assert.ok(slot.fighters.length <= 4, card.id);
  assert.deepEqual(ready.settlement(), prepare(state).settlement(), card.id);
  assert.ok(initial.status(0) || !rule.select);
  const deployment = ready.deployment();
  const record = {
    id: card.id + (golden ? '-golden' : '-normal'), wave: wave.id, round: wave.round, line: true,
    preparation: deployment, deck: state.deck.map(member =>
      member ? { id: member.id, form: member.form, golden: !!member.golden } : { id: '' }),
  };
  for (let slot = 0; slot < state.deck.length; slot++) {
    const member = record.deck[slot];
    if (member.id && !cards.get(member.id).forms.some(form => form.kind === member.form)) member.form = 'Human';
  }
  fixtures.push(record);
  if (rule.sell) {
    const sold = structuredClone(state);
    applyCardTransaction(sold, cards, 'source', 'sell');
    const once = structuredClone(sold);
    applyCardTransaction(sold, cards, 'source', 'sell');
    assert.deepEqual(sold, once, card.id);
  }
}

const reforge = seed(piece('Reforge-3-0', 'smith', { golden: true }), piece('Reforge-2-0', 'recipient'));
const firstReforge = prepare(reforge);
assert.ok(firstReforge.deployment()[1].fighters.some(unit => unit.id === 'reforged-shieldbearer' && unit.shield === 2));
assert.equal(firstReforge.scrap, 3);
assert.equal(recruit(firstReforge, 1).name, '조립 방패병');
finishTurn(reforge, firstReforge);
reforge.deck[0] = null;
const kept = prepare(reforge);
assert.ok(kept.deployment()[1].fighters.some(unit => unit.id === 'reforged-shieldbearer' && unit.shield === 0));
assert.equal(kept.scrap, 3);

const discounts = seed(piece('Equipment-2-0', 'seller'), piece('Equipment-4-0', 'worker', { gear: 1 }),
  piece('Equipment-1-0', 'hire', { hiredRound: 11 }));
discounts.orders = [order('target', 'seller', 'worker')];
applyCardTransaction(discounts, cards, 'seller', 'sell');
discounts.deck[0] = null;
discounts.orders = [order('gear', 'hire', 'worker')];
const priced = prepare(discounts);
assert.equal(priced.gold, 9);
assert.equal(priced.settlement().deck[1].gearDiscount, 0);
assert.equal(priced.settlement().deck[1].gear, 2);
assert.equal(priced.deployment()[1].fighters[1].bonusAttack, 1);
assert.equal(priced.abilities(2).find(action => action.kind === 'gear').choices.find(choice => choice.value === 'worker').price, 1);

const blessing = seed(piece('Blessing-1-0', 'normal'), piece('Blessing-1-0', 'golden', { golden: true }),
  piece('Blessing-4-0', 'grove', { blessing: 4 }));
blessing.orders = [order('target', 'normal', 'grove'), order('target', 'golden', 'grove')];
const blessed = prepare(blessing);
assert.equal(blessed.settlement().deck[2].blessing, 7);
assert.equal(lead(blessed, 2).bonusAttack, 1);
assert.equal(lead(blessed, 2).bonusHealth, 2);
assert.equal(blessed.deployment()[0].firstEffect, false);
assert.equal(blessed.deployment()[1].firstEffect, true);

const shape = seed(piece('Shapeshift-2-0', 'maker'), piece('Shapeshift-1-0', 'beast', { form: 'Animal' }));
const shaped = prepare(shape);
assert.equal(shaped.deployment()[1].fighters.length, 3);
assert.equal(shaped.settlement().deck[1].reinforcements.length, 0);
shape.deck[1].form = 'Human';
shape.deck[1].previousForm = 'Animal';
assert.equal(recruit(prepare(shape), 1).name, '솔잎 궁수');

const production = seed(piece('Production-4-0', 'maker'), piece('Production-5-0', 'factory', {
  robots: 1, golden: true,
}));
production.cardHistory.factory = { robotCount: 3 };
const manufactured = prepare(production);
assert.equal(manufactured.deployment()[1].robotCount, 4);
assert.equal(manufactured.deployment()[1].fighters[3].bonusAttack, 1);
assert.equal(lead(manufactured, 1).bonusAttack, 2);
assert.equal(lead(manufactured, 1).shield, 2);

const overload = seed(piece('Overload-5-0', 'donor', { charge: 3, golden: true }),
  piece('Overload-4-0', 'receiver', { charge: 1 }));
overload.orders = [order('overload', 'donor', '', 'receiver')];
const charged = prepare(overload);
assert.equal(charged.settlement().deck[0].charge, 0);
assert.equal(charged.deployment()[1].activated, true);
assert.equal(charged.deployment()[1].direct, false);
assert.equal(charged.settlement().deck[1].charge, 1);

const marks = seed(piece('Hunt-5-0', 'hunter', { golden: true }), piece('Hunt-1-0', 'scout'));
marks.orders = [order('hunt', 'hunter', String(wave.enemies[0].slot), String(wave.enemies[1].slot))];
assert.equal(prepare(marks).deployment()[0].marks.length, 2);
assert.equal(lead(prepare(marks), 0).bonusAttack, 1);

const shield = seed(piece('Guard-4-0', 'first'), piece('Guard-4-0', 'second', { golden: true }),
  piece('Equipment-4-0', 'tanking'));
shield.formation = 'column'; // Move the target between the two providers.
shield.deck[2] = shield.deck[1];
shield.deck[1] = null;
shield.deck[3] = shield.deck[0];
shield.deck[0] = null;
shield.deck[4] = shield.deck[2];
shield.deck[2] = piece('Equipment-4-0', 'target');
shield.orders = [order('target', 'second', 'target'), order('target', 'first', 'target')];
assert.deepEqual(lead(prepare(shield), 2).guardGrants, [{ source: 5, shield: 5 }]);
shield.deck[3].id = 'Guard-2-0';
assert.deepEqual(lead(prepare(shield), 2).guardGrants, [{ source: 4, shield: 2 }, { source: 5, shield: 4 }]);

const lower = piece('Blessing-4-0', 'lower', { blessing: 10, growth: 2,
  reinforcements: [{ id: 'allies-005' }], productionHistory: ['a'] });
const higher = piece('Blessing-4-0', 'higher', { blessing: 11, growth: 5,
  reinforcements: [{ id: 'allies-005' }, { id: 'allies-010' }], productionHistory: ['b'] });
mergeCardProgress(lower, higher);
assert.equal(lower.blessing, 18);
assert.equal(lower.growth, 5);
assert.equal(lower.reinforcements.length, 2);
assert.deepEqual(lower.productionHistory, ['a', 'b']);

if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify({ runs: fixtures }));
console.log(`${fixtures.length} normal/golden preparation fixtures; persistent units, purchase/sale timing, discounts, first effect, forms, robot thresholds, charge sharing, marks, shield ownership and matching merge checked.`);
